import test from 'node:test';
import assert from 'node:assert/strict';
import { utc, observationStatus } from '../src/core/metadata.mjs';
import { framesFromJmaOptions, himawariB13, products } from '../src/providers/jma.mjs';
import { createSequence } from '../src/core/sequence.mjs';

// Synthetic catalogue records. No live provider or production files are used.
const options = [
  { slot: '0010', label: '00:20 UTC 1 January 2026' },
  { slot: '2350', label: '00:00 UTC 1 January 2026' },
  { slot: '2340', label: '23:50 UTC 31 December 2025' },
];
const discover = entries => framesFromJmaOptions(entries, { discoveredAt: '2026-01-01T00:30:00Z' });
const sequence = overrides => createSequence({ product: himawariB13, frames: discover(options),
  start: '2025-12-31T23:50:00Z', end: '2026-01-01T00:20:00Z', maxFrames: 12,
  grid: { kind: 'source-raster', width: 550, height: 550, fit: 'contain' }, gapPolicy: 'skip', ...overrides });

test('UTC rejects ambiguous, impossible and normalised dates', () => {
  assert.equal(utc('2024-02-29T00:00:00Z'), '2024-02-29T00:00:00.000Z');
  for (const value of ['2026-02-29T00:00:00Z', '2026-01-01T24:00:00Z', '2026-01-01', '2026-01-01T00:00:00+00:00']) assert.throws(() => utc(value));
});
test('JMA sorts real labels across year rollover without deriving time from slot', () => {
  const frames = discover(options);
  assert.equal(frames[0].observedAt, '2025-12-31T23:50:00.000Z');
  assert.equal(frames[1].observedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(frames[1].source.slot, '2350');
  assert.match(frames[1].source.url, /fd__b13_2350\.jpg$/);
  assert.equal(frames[1].validation, 'catalogue-only');
  assert.equal(frames[1].source.requiresIdentityCheckOnRetrieval, true);
});
test('JMA fails explicitly on empty, changed, duplicate and corrupt options', () => {
  for (const entries of [[], [options[0], options[0]], [{ slot: '../x', label: options[0].label }], [{ slot: '0010', label: 'latest' }], [{ slot: '0010', label: '00:20 UTC 31 February 2026' }]]) assert.throws(() => discover(entries));
});
test('rights and capabilities keep permission separate from implementation', () => {
  assert.equal(himawariB13.rights.download, 'permitted-with-conditions');
  assert.equal(himawariB13.rights.editNoticeRequired, true);
  assert.equal(himawariB13.capabilities.videoExport, 'webm-capability-detected');
  assert.equal(himawariB13.coverage.georeferencing, 'unverified');
});
test('sequence preserves source gaps even when sampling fewer frames', () => {
  const result = sequence({ step: 2, gapPolicy: 'hold' });
  assert.equal(result.frames.length, 2);
  assert.equal(result.gaps.length, 1);
  assert.equal(result.gaps[0].elapsedMs, 1200000);
  assert.equal(result.gapPolicy, 'hold');
  assert.equal(result.readiness, 'selection-only');
});
test('sequence rejects empty ranges, oversized requests, mixed products and duplicates', () => {
  assert.throws(() => sequence({ maxFrames: 2 }), /limit/);
  assert.throws(() => sequence({ start: '2027-01-01T00:00:00Z', end: '2027-01-02T00:00:00Z' }), /No observations/);
  const frames = discover(options);
  assert.throws(() => sequence({ frames: [...frames, frames[0]] }), /duplicate/);
  assert.throws(() => sequence({ frames: [{ ...frames[0], productId: 'other' }] }), /Mixed/);
  assert.throws(() => sequence({ gapPolicy: 'invent' }), /Choose/);
  assert.throws(() => sequence({ grid: { kind: 'geographic', width: 550, height: 550 } }), /fixed/);
});
test('selection copies and freezes nested metadata and output geometry', () => {
  const frames = JSON.parse(JSON.stringify(discover(options)));
  const result = sequence({ frames });
  frames[0].source.slot = 'changed';
  assert.notEqual(result.frames[0].source.slot, 'changed');
  assert.throws(() => { result.grid.width = 10; }, TypeError);
  assert.throws(() => { result.frames[0].source.slot = 'changed'; }, TypeError);
});
test('observation status distinguishes stale and future metadata', () => {
  const settings = { now: '2026-01-01T01:00:00Z', staleAfterMs: 1200000 };
  assert.equal(observationStatus('2026-01-01T00:00:00Z', settings).state, 'stale');
  assert.equal(observationStatus('2026-01-01T00:50:00Z', settings).state, 'recent');
  assert.equal(observationStatus('2026-01-01T02:00:00Z', settings).state, 'future');
});

test('scan start crosses midnight while catalogue time identifies scan end', () => {
 const frame=discover(options)[1]; assert.equal(frame.scanStartAt,'2025-12-31T23:50:00.000Z');assert.equal(frame.scanEndAt,'2026-01-01T00:00:00.000Z');
});

test('Australia products retain distinct source IDs and fixed provider geography', () => {
 const regional=products.filter(p=>p.coverage.regionId==='jma-australia');assert.equal(regional.length,3);
 for(const product of regional){const frames=framesFromJmaOptions(options,{discoveredAt:'2026-01-01T01:00:00Z',product});assert.equal(frames[0].productId,product.id);assert.match(frames[0].source.url,new RegExp('aus_'+product.band+'_2340'));assert.deepEqual(product.coverage.bounds,[110,-45,155,-10]);}
 assert.equal(regional.find(p=>p.band==='trm').rights.minimumCredit,'JMA | NOAA/NESDIS | CSU/CIRA');
});
