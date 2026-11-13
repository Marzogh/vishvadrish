import { discoverJma, getProduct } from '../providers/jma.mjs';
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
    const width = bitmap.width, height = bitmap.height;
    const product = getProduct(frame.productId);
    if (product.coverage.sourceWidth && (width !== product.coverage.sourceWidth || height !== product.coverage.sourceHeight)) { bitmap.close(); throw Error('Regional image dimensions changed. Refresh and retry.'); }
    if (frame.requiresDaylight) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
      const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0, 32, 32);
      const pixels = ctx.getImageData(0, 0, 32, 32).data; let bright = 0;
      for (let i = 0; i < pixels.length; i += 4) if (Math.max(pixels[i], pixels[i+1], pixels[i+2]) > 20) bright++;
      if (bright < 6) { bitmap.close(); throw Error('Colour image is blank or too dark. Choose an earlier end time or Infrared.'); }
    }
    bitmap.close();
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
    const current = await discoverJma({ signal, product: sequence.product });
    for (const frame of sequence.frames) if (!current.some(item => item.id === frame.id && item.source.slot === frame.source.slot)) throw Error('JMA observation list changed. Refresh and select again.');
  }
  await validate(); const acquired = [];
  for (const [i, frame] of sequence.frames.entries()) {
    progress(`Fetching frame ${i + 1}/${sequence.frames.length}…`);
    acquired.push(await store.get(frame, signal));
  }
  await validate();
  if (acquired.some(entry => entry.width !== acquired[0].width || entry.height !== acquired[0].height)) throw Error('Image dimensions differ within the sequence.');
  return Object.freeze(acquired);
}
