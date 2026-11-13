import { snapshot, utc } from './metadata.mjs';

/** Freeze a bounded selection shared by future preview/download/export consumers.
 * This records intent only. Catalogue metadata does not qualify pixels for export.
 */
export function createSequence({ product, frames, start, end, step = 1, maxFrames, grid, gapPolicy }) {
  start = utc(start); end = utc(end);
  if (start > end) throw new RangeError('Sequence start must precede end');
  if (!Number.isSafeInteger(step) || step < 1 || !Number.isSafeInteger(maxFrames) || maxFrames < 1) throw new RangeError('Specify positive step and frame limit');
  if (!['skip', 'hold'].includes(gapPolicy)) throw new Error('Choose skip or hold for missing observations');
  if (grid?.kind !== 'source-raster' || !Number.isSafeInteger(grid.width) || grid.width < 1 || !Number.isSafeInteger(grid.height) || grid.height < 1 || grid.fit !== 'contain') {
    throw new Error('Specify a fixed source-raster output size and contain fit');
  }
  if (!Number.isFinite(product?.expectedIntervalMs) || product.expectedIntervalMs <= 0) throw new Error('Product cadence is required');
  const ids = new Set(); const times = new Set();
  const ordered = frames.map(frame => {
    if (frame.productId !== product.id || typeof frame.id !== 'string' || !frame.id || ids.has(frame.id)) throw new Error('Mixed products or duplicate/invalid frame IDs');
    const observedAt = utc(frame.observedAt);
    if (times.has(observedAt)) throw new Error('Duplicate observation time');
    ids.add(frame.id); times.add(observedAt);
    return { ...frame, observedAt };
  }).sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const available = ordered.filter(frame => frame.observedAt >= start && frame.observedAt <= end);
  if (!available.length) throw new Error('No observations in the selected time range');
  const selected = available.filter((_, index) => index % step === 0);
  if (selected.length > maxFrames) throw new RangeError('Selection exceeds the configured frame limit');
  const gaps = [];
  for (let index = 1; index < available.length; index++) {
    const elapsedMs = Date.parse(available[index].observedAt) - Date.parse(available[index - 1].observedAt);
    if (elapsedMs > product.expectedIntervalMs) gaps.push({ after: available[index - 1].observedAt, before: available[index].observedAt, elapsedMs });
  }
  return snapshot({ schemaVersion: 1, product, requested: { start, end, step },
    grid: { kind: grid.kind, width: grid.width, height: grid.height, fit: grid.fit, georeferencing: 'unverified' },
    gapPolicy, gaps, frames: selected, readiness: 'selection-only',
  });
}
