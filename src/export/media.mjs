import { zipSync, strToU8 } from '../../vendor/fflate.mjs';
export const nameFor = frame => 'himawari9-b13-' + frame.observedAt.replace(/[:.]/g, '-');
export function schedule(entries, fps, gapPolicy) {
  const result = [];
  for (let i = 0; i < entries.length; i++) {
    const repeats = gapPolicy === 'hold' && entries[i + 1] ? Math.max(1, Math.round((Date.parse(entries[i + 1].frame.observedAt) - Date.parse(entries[i].frame.observedAt)) / 600000)) : 1;
    if (result.length + repeats > 144) throw Error('Held sequence exceeds 144 output frames. Choose skip.');
    for (let n = 0; n < repeats; n++) result.push({ entry: entries[i], timestamp: result.length / fps, duration: 1 / fps });
  }
  return result;
}
export function manifest(sequence, entries, settings) {
  return { schemaVersion: 1, product: sequence.product, requested: sequence.requested, gaps: sequence.gaps,
    settings, timeMeaning: 'Observation label is scan end; filename slot is scan start. Pixels are not independently timestamp-verified.',
    frames: entries.map(({ frame, sha256, acquiredAt, width, height }) => ({ ...frame, sha256, acquiredAt, width, height })) };
}
export async function render(entry, canvas, timestamps) {
  const bitmap = await createImageBitmap(entry.blob);
  try {
    const ctx = canvas.getContext('2d'), size = canvas.width;
    ctx.fillStyle = '#080c0e'; ctx.fillRect(0, 0, size, canvas.height);
    const scale = Math.min(size / bitmap.width, size / bitmap.height);
    ctx.drawImage(bitmap, (size - bitmap.width * scale) / 2, (size - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale);
    ctx.fillStyle = '#ffffff'; ctx.font = `${Math.max(11, Math.round(size / 50))}px monospace`;
    if (timestamps) ctx.fillText('Scan end: ' + entry.frame.observedAt.replace('.000Z', 'Z'), 8, size + 17);
    ctx.fillText('Himawari-9 B13 | Source: MSC/JMA | scaled', 8, size + 34);
    ctx.fillText('www.data.jma.go.jp/mscweb/data/himawari/', 8, size + 49);
  } finally { bitmap.close(); }
}
export const pngBlob = canvas => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('PNG export failed')), 'image/png'));
export async function exportMedia(kind, sequence, entries, settings, signal, progress) {
  const canvas = document.createElement('canvas'); canvas.width = settings.size; canvas.height = settings.size + 56;
  const record = manifest(sequence, entries, settings);
  const metadata = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  if (kind === 'frame') { await render(entries[0], canvas, settings.timestamps); signal.throwIfAborted(); return { blob: await pngBlob(canvas), filename: nameFor(entries[0].frame) + '.png', metadata }; }
  if (kind === 'zip') {
    const files = { 'manifest.json': strToU8(JSON.stringify(record, null, 2)) }; let bytes = 0;
    for (const [i, entry] of entries.entries()) {
      signal.throwIfAborted(); progress(`Rendering frame ${i + 1}/${entries.length}…`); await render(entry, canvas, settings.timestamps);
      const data = new Uint8Array(await (await pngBlob(canvas)).arrayBuffer()); bytes += data.length;
      if (bytes > 50000000) throw Error('Image package exceeds 50 MB. Choose fewer frames or a smaller size.');
      files[`${String(i + 1).padStart(3, '0')}-${nameFor(entry.frame)}.png`] = data;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    signal.throwIfAborted(); progress('Packaging images…');
    return { blob: new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }), filename: 'himawari-sequence.zip', metadata };
  }
  const { Output, BufferTarget, WebMOutputFormat, CanvasSource, canEncodeVideo, Quality } = await import('../../vendor/mediabunny.mjs');
  const quality = new Quality({ bitrate: settings.bitrate });
  let codec;
  for (const candidate of ['vp9', 'vp8']) if (await canEncodeVideo(candidate, { width: canvas.width, height: canvas.height, frameRate: settings.fps, quality })) { codec = candidate; break; }
  if (!codec) throw Error('No supported WebM encoder. Download the image sequence instead.');
  record.settings = { ...settings, codec }; const target = new BufferTarget();
  const output = new Output({ format: new WebMOutputFormat(), target });
  const source = new CanvasSource(canvas, { codec, quality }); output.addVideoTrack(source, { frameRate: settings.fps });
  try {
    await output.start(); const frames = schedule(entries, settings.fps, settings.gapPolicy);
    for (const [i, frame] of frames.entries()) {
      signal.throwIfAborted(); progress(`Encoding frame ${i + 1}/${frames.length}…`);
      await render(frame.entry, canvas, settings.timestamps); await source.add(frame.timestamp, frame.duration);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    signal.throwIfAborted(); source.close(); progress('Finishing WebM…'); await output.finalize(); signal.throwIfAborted();
    if (target.buffer.byteLength > 50000000) throw Error('Video exceeds 50 MB output limit.');
    return { blob: new Blob([target.buffer], { type: 'video/webm' }), filename: 'himawari.webm', metadata: new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }) };
  } catch (error) { await output.cancel().catch(() => {}); throw error; }
}
