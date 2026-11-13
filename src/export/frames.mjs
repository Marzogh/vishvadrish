import { SessionImageCache } from './session-cache.mjs';
import { discoverJma, getProduct } from '../providers/jma.mjs';
export class FrameStore {
  entries = new Map();
  local = new Map();
  sessionCache = new SessionImageCache();
  clear() { this.entries.clear(); this.local.clear(); }
  async get(frame, signal) {
    signal?.throwIfAborted();
    if (this.local.has(frame.id)) return this.local.get(frame.id);
    if (this.entries.has(frame.id)) return this.entries.get(frame.id);
    const saved = await this.sessionCache.get(frame);
    signal?.throwIfAborted();
    if (saved) { this.remember(saved); return saved; }
    if (Date.now() - Date.parse(frame.discoveredAt) > 300000) throw Error('Observation list expired. Refresh before fetching images.');
    const response = await fetch(frame.source.url, { signal, mode: 'cors', credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw Error(`JMA image request failed: HTTP ${response.status}.`);
    if (Number(response.headers.get('content-length')) > 5000000) throw Error('Image exceeds 5 MB limit.');
    const blob = await response.blob();
    if (blob.type !== 'image/jpeg' || !blob.size || blob.size > 5000000) throw Error('Unexpected image response.');
    const bitmap = await createImageBitmap(blob);
    const width = bitmap.width, height = bitmap.height;
    const product = getProduct(frame.productId);
    if (product.coverage.sourceWidth && (width !== product.coverage.sourceWidth || height !== product.coverage.sourceHeight)) { bitmap.close(); throw Error('Regional image dimensions changed. Refresh and retry.'); }
    bitmap.close();
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(v => v.toString(16).padStart(2, '0')).join('');
    const entry = Object.freeze({ blob, frame, width, height, sha256: hash, acquiredAt: new Date().toISOString() });
    signal?.throwIfAborted();
    await this.sessionCache.put(entry);
    signal?.throwIfAborted();
    this.remember(entry);
    return entry;
  }
  remember(entry) {
    this.entries.delete(entry.frame.id); this.entries.set(entry.frame.id, entry);
    while (this.entries.size > 24 || [...this.entries.values()].reduce((sum, item) => sum + item.blob.size, 0) > 50000000) this.entries.delete(this.entries.keys().next().value);
  }
}
export async function acquireSelection(sequence, store, signal, progress) {
  async function validate() {
    const current = await discoverJma({ signal, product: sequence.product });
    for (const frame of sequence.frames) if (!current.some(item => item.id === frame.id && item.source.slot === frame.source.slot)) throw Error('JMA observation list changed. Refresh and select again.');
  }
  if (!sequence.local) await validate(); const acquired = [];
  for (const [i, frame] of sequence.frames.entries()) {
    progress(`Fetching frame ${i + 1}/${sequence.frames.length}…`);
    acquired.push(await store.get(frame, signal));
    if (acquired.reduce((sum, entry) => sum + entry.blob.size, 0) > 50000000) throw Error('Selection exceeds 50 MB. Choose fewer hours.');
  }
  if (!sequence.local) await validate();
  if (acquired.some(entry => entry.width !== acquired[0].width || entry.height !== acquired[0].height)) throw Error('Image dimensions differ within the sequence.');
  return Object.freeze(acquired);
}
