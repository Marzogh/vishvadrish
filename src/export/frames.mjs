import { discoverJma } from '../providers/jma.mjs';
export class FrameStore {
  entries = new Map();
  clear() { this.entries.clear(); }
  async get(frame, signal) {
    signal?.throwIfAborted();
    if (this.entries.has(frame.id)) return this.entries.get(frame.id);
    if (Date.now() - Date.parse(frame.discoveredAt) > 300000) throw Error('Observation list expired. Refresh before fetching images.');
    const response = await fetch(frame.source.url, { signal, mode: 'cors', credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw Error(`JMA image request failed: HTTP ${response.status}.`);
    if (Number(response.headers.get('content-length')) > 5000000) throw Error('Image exceeds 5 MB limit.');
    const blob = await response.blob();
    if (blob.type !== 'image/jpeg' || !blob.size || blob.size > 5000000) throw Error('Unexpected image response.');
    const bitmap = await createImageBitmap(blob);
    const width = bitmap.width, height = bitmap.height; bitmap.close();
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(v => v.toString(16).padStart(2, '0')).join('');
    const entry = Object.freeze({ blob, frame, width, height, sha256: hash, acquiredAt: new Date().toISOString() });
    signal?.throwIfAborted();
    this.entries.set(frame.id, entry);
    while (this.entries.size > 24 || [...this.entries.values()].reduce((sum, item) => sum + item.blob.size, 0) > 50000000) this.entries.delete(this.entries.keys().next().value);
    return entry;
  }
}
export async function acquireSelection(sequence, store, signal, progress) {
  async function validate() {
    const current = await discoverJma({ signal });
    for (const frame of sequence.frames) if (!current.some(item => item.id === frame.id && item.source.slot === frame.source.slot)) throw Error('JMA observation list changed. Refresh and select again.');
  }
  await validate(); const acquired = [];
  for (const [i, frame] of sequence.frames.entries()) {
    progress(`Fetching frame ${i + 1}/${sequence.frames.length}…`);
    acquired.push(await store.get(frame, signal));
  }
  await validate();
  return Object.freeze(acquired);
}
