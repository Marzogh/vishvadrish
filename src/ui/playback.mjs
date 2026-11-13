import { acquireSelection } from '../export/frames.mjs';
/** Freeze selected bytes before playback and keep bounded, decoded display frames. */
export async function preparePlayback(sequence, store, signal, progress) {
  const entries = await acquireSelection(sequence, store, signal, text => progress(text.replace('Fetching', 'Buffering')));
  const frames = []; let decodedBytes = 0;
  try {
    for (const [i, entry] of entries.entries()) {
      signal.throwIfAborted(); progress(`Preparing frame ${i + 1}/${entries.length}…`);
      const width = Math.min(700, entry.width), height = Math.round(entry.height * width / entry.width);
      decodedBytes += width * height * 4;
      if (decodedBytes > 256 * 1024 * 1024) throw Error('Playback exceeds the 256 MB display buffer. Choose fewer hours.');
      const bitmap = await createImageBitmap(entry.blob, { resizeWidth: width, resizeHeight: height });
      frames.push({ entry, bitmap });
    }
    signal.throwIfAborted(); return { frames, close() { frames.forEach(frame => frame.bitmap.close()); } };
  } catch (error) { frames.forEach(frame => frame.bitmap.close()); throw error; }
}
