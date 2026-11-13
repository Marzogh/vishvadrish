import { acquireSelection } from './frames.mjs';
import { exportMedia } from './media.mjs';
export function attachExports({ store, selection, currentIndex, stop }) {
  const $ = id => document.getElementById(id); let job; const urls = [];
  function clearResults() { urls.splice(0).forEach(url => URL.revokeObjectURL(url)); $('export-result').hidden = true; $('export-video').removeAttribute('src'); }
  $('export-cancel').onclick = () => job?.abort();
  for (const button of document.querySelectorAll('[data-export]')) button.onclick = async () => {
    if (job) return; const sequence = selection(); if (!sequence) return;
    stop(); job = new AbortController(); clearResults(); $('export-error').hidden = true;
    const disabled = [...document.querySelectorAll('main button, main input, main select')].map(element => [element, element.disabled]);
    disabled.forEach(([element]) => { element.disabled = true; }); $('export-cancel').disabled = false; $('export-cancel').hidden = false;
    const progress = text => { $('export-status').textContent = text; };
    try {
      const kind = button.dataset.export;
      const settings = { size: Number($('export-size').value), fps: Number(document.querySelector('[data-speed][aria-pressed=true]').textContent), bitrate: Number($('export-quality').value), timestamps: $('export-timestamps').checked, gapPolicy: $('export-gap').value };
      const chosen = kind === 'frame' ? { ...sequence, frames: [sequence.frames[currentIndex()]] } : sequence;
      progress('Checking observations…'); const entries = await acquireSelection(chosen, store, job.signal, progress);
      const result = await exportMedia(kind, chosen, entries, settings, job.signal, progress); job.signal.throwIfAborted();
      for (const [id, blob, filename] of [['export-file', result.blob, result.filename], ['export-manifest', result.metadata, 'manifest.json']]) {
        const url = URL.createObjectURL(blob); urls.push(url); $(id).href = url; $(id).download = filename;
      }
      $('export-file').textContent = `Download ${kind === 'frame' ? 'PNG' : kind === 'zip' ? 'ZIP' : 'WebM'}`;
      $('export-video').hidden = kind !== 'video'; if (kind === 'video') $('export-video').src = $('export-file').href;
      $('export-result').hidden = false; progress('Ready to download.');
    } catch (error) {
      progress(error.name === 'AbortError' ? 'Export cancelled.' : 'Export failed.');
      if (error.name !== 'AbortError') { $('export-error').textContent = error.message; $('export-error').hidden = false; }
    } finally { disabled.forEach(([element, previous]) => { element.disabled = previous; }); $('export-cancel').hidden = true; job = undefined; }
  };
}
