import { discoverJma, himawariB13 } from '../providers/jma.mjs';
import { observationStatus } from '../core/metadata.mjs';
import { createSequence } from '../core/sequence.mjs';

const $ = id => document.getElementById(id);
const controls = ['previous', 'play', 'next', 'timeline', 'zoom-in', 'zoom-out', 'fit'];
const cache = new Map();
let catalogue = [], sequence, index = 0, playing = false, timer, request, revision = 0;
let frameCount = 12, frameDelay = 500;
let zoom = 1, panX = 0, panY = 0, drag;
const format = value => new Date(value).toISOString().replace('T', ' ').replace(':00.000Z', ' UTC');
const setStatus = text => { $('status').textContent = text; $('status').classList.toggle('sr-only', text === 'Image loaded.' || text.startsWith('Playing')); };
const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 12 8-12 8z"/></svg>';
const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
const windowButtons = [...document.querySelectorAll('[data-window]')];
function stop() {
  playing = false; clearTimeout(timer);
  $('play').innerHTML = playIcon;
  $('play').setAttribute('aria-label', 'Play observations');
}
function transform() { $('image').style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`; }
function fit() { zoom = 1; panX = panY = 0; transform(); }
function clearImage() {
  $('image').hidden = true; $('image').removeAttribute('src'); $('placeholder').hidden = false;
  $('observation').textContent = 'Not loaded'; $('observation').removeAttribute('datetime');
  $('age').textContent = ''; $('dimensions').textContent = '';
  for (const id of ['zoom-in', 'zoom-out', 'fit']) $(id).disabled = true;
}
function fail(error) {
  stop(); clearImage(); $('placeholder').textContent = 'Image unavailable';
  $('error').textContent = error; $('error').hidden = false; $('retry').hidden = false;
  setStatus('Loading stopped.');
}
function begin() {
  request?.abort(); request = new AbortController(); revision++;
  $('error').hidden = $('retry').hidden = true; $('cancel').hidden = false;
  return { signal: request.signal, token: revision };
}
function remember(id, url) {
  cache.set(id, url);
  while (cache.size > 12) { const key = cache.keys().next().value; URL.revokeObjectURL(cache.get(key)); cache.delete(key); }
}
async function show(next) {
  if (!sequence) return false;
  const { signal, token } = begin();
  index = Math.max(0, Math.min(next, sequence.frames.length - 1));
  const frame = sequence.frames[index];
  $('timeline').value = index; $('timeline').setAttribute('aria-valuetext', format(frame.observedAt));
  $('position').textContent = `${index + 1} / ${sequence.frames.length}`;
  clearImage(); $('placeholder').textContent = 'Loading image…';
  setStatus(`Loading observation ${index + 1} of ${sequence.frames.length}…`);
  try {
    // Do not reuse a stale catalogue to request a mutable rolling URL.
    if (Date.now() - Date.parse(frame.discoveredAt) > 300000) throw new Error('Observation list has expired. Refresh before loading more images.');
    let url = cache.get(frame.id);
    if (!url) {
      const response = await fetch(frame.source.url, { signal, credentials: 'omit', cache: 'no-store', mode: 'cors' });
      if (!response.ok) throw new Error(`JMA image request failed: HTTP ${response.status}.`);
      const blob = await response.blob();
      if (blob.type !== 'image/jpeg' || blob.size === 0 || blob.size > 5000000) throw new Error('JMA returned an unexpected image response.');
      if (token !== revision) return false;
      url = URL.createObjectURL(blob); remember(frame.id, url);
    } else { cache.delete(frame.id); cache.set(frame.id, url); }
    const decoded = new Image(); decoded.src = url; await decoded.decode();
    if (token !== revision) return false;
    if (!decoded.naturalWidth || !decoded.naturalHeight) throw new Error('The image could not be decoded.');
    $('image').src = url; $('image').hidden = false; $('placeholder').hidden = true;
    $('observation').textContent = format(frame.observedAt); $('observation').dateTime = frame.observedAt;
    const age = observationStatus(frame.observedAt, { now: new Date().toISOString(), staleAfterMs: 1800000 });
    const minutes = Math.max(0, Math.floor(age.ageMs / 60000));
    $('age').textContent = age.state === 'future' ? 'Catalogue time is in the future' : `${age.state === 'stale' ? 'Older observation · ' : ''}${minutes} min ago`;
    $('dimensions').textContent = `${decoded.naturalWidth} × ${decoded.naturalHeight} px`;
    for (const id of ['zoom-in', 'zoom-out', 'fit']) $(id).disabled = false;
    setStatus(playing ? 'Playing observations. Gaps are skipped.' : 'Image loaded.');
    return true;
  } catch (error) {
    if (token === revision && error.name !== 'AbortError') {
      const cached = cache.get(frame.id); if (cached) { URL.revokeObjectURL(cached); cache.delete(frame.id); }
      fail(error.message === 'Failed to fetch' ? 'Could not reach JMA. Check your connection and retry.' : error.message);
    }
    return false;
  } finally { if (token === revision) $('cancel').hidden = true; }
}
async function selectWindow() {
  stop();
  if (!catalogue.length) return;
  const selected = catalogue.slice(-frameCount);
  sequence = createSequence({ product: himawariB13, frames: selected, start: selected[0].observedAt,
    end: selected.at(-1).observedAt, maxFrames: 24, grid: { kind: 'source-raster', width: 550, height: 550, fit: 'contain' }, gapPolicy: 'skip' });
  $('timeline').max = sequence.frames.length - 1;
  $('frame-marks').replaceChildren(...sequence.frames.map(() => document.createElement('span')));
  $('frame-ticks').replaceChildren(...sequence.frames.map((frame, i) => { const option = document.createElement('option'); option.value = i; option.label = format(frame.observedAt); return option; }));
  $('start-time').textContent = format(sequence.frames[0].observedAt);
  $('end-time').textContent = format(sequence.frames.at(-1).observedAt);
  $('gaps').textContent = sequence.gaps.length ? `${sequence.gaps.length} gap${sequence.gaps.length === 1 ? '' : 's'} · skipped in playback` : '';
  controls.forEach(id => { $(id).disabled = false; });
  await show(sequence.frames.length - 1);
}
async function refresh() {
  stop(); sequence = undefined; catalogue = [];
  for (const url of cache.values()) URL.revokeObjectURL(url); cache.clear();
  const { signal, token } = begin(); clearImage(); fit();
  controls.forEach(id => { $(id).disabled = true; }); windowButtons.forEach(button => { button.disabled = true; });
  $('position').textContent = 'No observations'; $('gaps').textContent = '';
  $('start-time').textContent = $('end-time').textContent = ''; $('frame-marks').replaceChildren();
  $('placeholder').textContent = 'Loading observations…'; setStatus('Discovering JMA observations…');
  try {
    const discovered = await discoverJma({ signal });
    if (token !== revision) return;
    catalogue = discovered;
    windowButtons.forEach(button => { button.disabled = false; });
    await selectWindow();
  } catch (error) {
    if (token === revision && error.name !== 'AbortError') fail(`Could not load observations from JMA. ${error.message} Refresh or retry.`);
  } finally { if (token === revision) $('cancel').hidden = true; }
}
async function tick() {
  if (!playing) return;
  if (await show((index + 1) % sequence.frames.length) && playing) timer = setTimeout(tick, frameDelay);
}
$('play').onclick = () => {
  if (playing) return stop();
  playing = true; $('play').innerHTML = pauseIcon; $('play').setAttribute('aria-label', 'Pause observations');
  timer = setTimeout(tick, frameDelay);
};
$('previous').onclick = () => { stop(); show(index - 1); };
$('next').onclick = () => { stop(); show(index + 1); };
$('timeline').oninput = () => { stop(); show(Number($('timeline').value)); };
windowButtons.forEach(button => { button.onclick = () => { frameCount = Number(button.dataset.window); windowButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button))); selectWindow(); }; });
const speedButtons = [...document.querySelectorAll('[data-speed]')];
speedButtons.forEach(button => { button.onclick = () => { frameDelay = Number(button.dataset.speed); speedButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button))); }; });
$('refresh').onclick = refresh;
$('retry').onclick = () => sequence ? show(index) : refresh();
$('cancel').onclick = () => { request?.abort(); revision++; stop(); clearImage(); $('cancel').hidden = true; $('placeholder').textContent = 'Loading cancelled'; setStatus('Loading cancelled.'); $('retry').hidden = false; };
$('fit').onclick = fit;
function changeZoom(delta) { zoom = Math.max(1, Math.min(4, zoom + delta)); if (zoom === 1) panX = panY = 0; transform(); }
$('zoom-in').onclick = () => changeZoom(.5); $('zoom-out').onclick = () => changeZoom(-.5);
$('viewport').onkeydown = event => {
  if ($('image').hidden) return;
  const steps = { ArrowLeft: [30, 0], ArrowRight: [-30, 0], ArrowUp: [0, 30], ArrowDown: [0, -30] };
  if (['+', '=', '-','0', ...Object.keys(steps)].includes(event.key)) {
    event.preventDefault();
    if (event.key === '0') fit(); else if (steps[event.key]) { panX += steps[event.key][0]; panY += steps[event.key][1]; transform(); } else changeZoom(event.key === '-' ? -.5 : .5);
  }
};
$('viewport').onpointerdown = event => { if (event.target.closest('button') || $('image').hidden) return; drag = { x: event.clientX - panX, y: event.clientY - panY }; $('viewport').setPointerCapture(event.pointerId); };
$('viewport').onpointermove = event => { if (!drag) return; panX = event.clientX - drag.x; panY = event.clientY - drag.y; transform(); };
$('viewport').onpointerup = $('viewport').onpointercancel = () => { drag = undefined; };
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
refresh();
