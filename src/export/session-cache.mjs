const LIMIT = 50000000, MAX_AGE = 24 * 3600000;
/** Blob storage survives reloads; sessionStorage confines reuse to this tab session. */
export class SessionImageCache {
  disabled = false;
  async database() {
    if (!this.opening) this.opening = new Promise((resolve, reject) => {
      const key = 'vishvadrish.image-session.v1';
      this.session = sessionStorage.getItem(key) || crypto.randomUUID();
      sessionStorage.setItem(key, this.session);
      const request = indexedDB.open('vishvadrish-images-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('frames', { keyPath: 'key' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(Error('Image database is blocked'));
    });
    return this.opening;
  }
  warn() {
    this.disabled = true;
    window.dispatchEvent(new CustomEvent('image-cache-warning', { detail: 'Session image storage is unavailable. Images remain in memory; reloading may download them again.' }));
  }
  async get(frame) {
    if (this.disabled) return;
    try {
      const db = await this.database();
      const record = await new Promise((resolve, reject) => {
        const request = db.transaction('frames').objectStore('frames').get(this.session + '/' + frame.id);
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      if (record && record.expiresAt > Date.now()) return Object.freeze(record.entry);
    } catch { this.warn(); }
  }
  async put(entry) {
    if (this.disabled) return;
    try {
      const db = await this.database();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('frames', 'readwrite'), store = tx.objectStore('frames');
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
        const request = store.getAll();
        request.onsuccess = () => {
          const now = Date.now(), key = this.session + '/' + entry.frame.id;
          let bytes = entry.blob.size;
          const records = request.result.filter(record => {
            if (record.expiresAt <= now || record.key === key) { store.delete(record.key); return false; }
            bytes += record.entry.blob.size; return true;
          }).sort((a, b) => a.savedAt - b.savedAt);
          while (bytes > LIMIT && records.length) { const oldest = records.shift(); bytes -= oldest.entry.blob.size; store.delete(oldest.key); }
          store.put({ key, entry, savedAt: now, expiresAt: now + MAX_AGE });
        };
      });
    } catch { this.warn(); }
  }
}
