import { preparePlayback } from './playback.mjs';
import { FrameStore } from '../export/frames.mjs';
import { attachExports } from '../export/actions.mjs';
import { discoverJma, himawariB13, products, getProduct, tcrAcknowledgement } from '../providers/jma.mjs';
import { observationStatus } from '../core/metadata.mjs';
import { createSequence } from '../core/sequence.mjs';

const $ = id => document.getElementById(id);
const controls = ['previous', 'play', 'next', 'timeline', 'zoom-in', 'zoom-out', 'fit'];
const cache = new Map();
const store = new FrameStore();
let product = getProduct('jma.himawari9.full-disc.trm');
let catalogue = [], sequence, index = 0, playing = false, timer, request, revision = 0;
let frameDelay = 250;
let playback, preparing, preparationRevision = 0;
let zoom = 1, panX = 0, panY = 0, drag;
const format = value => new Date(value).toISOString().replace('T', ' ').replace(':00.000Z', ' UTC');
const setStatus = text => { $('status').textContent = text; $('status').classList.toggle('sr-only', text === 'Image loaded.' || text.startsWith('Playing')); };
const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 12 8-12 8z"/></svg>';
const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';

function stop() {
  playing = false; clearTimeout(timer);
  preparing?.abort(); preparing = undefined; preparationRevision++; $('cancel').hidden = true;
  $('play').innerHTML = playIcon;
  $('play').setAttribute('aria-label', 'Play observations');
}
function transform() { for (const id of ['image','playback-image']) $(id).style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`; }
function fit() { zoom = 1; panX = panY = 0; transform(); }
function clearImage() {
  $('playback-image').hidden = true;
  document.querySelectorAll('[data-export]').forEach(button => { button.disabled = true; });
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
      const entry = await store.get(frame, signal);
      const blob = entry.blob;
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
    document.querySelectorAll('[data-export]').forEach(button => { button.disabled = false; });
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
  stop(); playback?.close(); playback = undefined;
  if (!catalogue.length) return;
  exportActions();
  const endIndex = Number($('end-at').value), end = catalogue[endIndex].observedAt;
  const availableStart = catalogue[0].scanStartAt;
  const maxHours = (Date.parse(end) - Date.parse(availableStart)) / 3600000;
  $('hour-presets').replaceChildren(...['All available', ...[1, 3, 6, 12, 18, 24].filter(hours => hours <= maxHours).map(String)].map((value, i) => {
    const option = document.createElement('button'); option.type = 'button'; option.role = 'option'; option.id = 'hour-option-' + i; option.tabIndex = -1;
    option.dataset.value = value; option.textContent = value === 'All available' ? value : value + ' h'; option.setAttribute('aria-selected', String(value === $('hours').value));
    option.onclick = () => chooseHours(value); return option;
  }));
  const input = $('hours'), all = input.value.trim() === 'All available', hours = Number(input.value);
  input.setCustomValidity(!all && (!Number.isFinite(hours) || hours < 1 || hours > maxHours) ? `Choose 1 to ${Math.floor(maxHours * 100) / 100} hours, or All available.` : '');
  if (!input.checkValidity()) { input.reportValidity(); return; }
  const start = all ? availableStart : new Date(Date.parse(end) - hours * 3600000).toISOString();
  const selected = catalogue.slice(0, endIndex + 1).filter(frame => frame.observedAt > start);
  $('duration-limit').textContent = `${selected.length} frames · ${maxHours.toFixed(1)} h available`;

  sequence = createSequence({ product, frames: selected, start,
    end: selected.at(-1).observedAt, maxFrames: 144, grid: { kind: 'source-raster', width: product.coverage.sourceWidth || 550, height: product.coverage.sourceHeight || 550, fit: 'contain' }, gapPolicy: 'skip' });
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
  stop(); playback?.close(); playback = undefined; sequence = undefined; catalogue = [];
  exportActions();
  $('end-at').disabled = true; $('end-at').replaceChildren();
  store.clear();
  for (const url of cache.values()) URL.revokeObjectURL(url); cache.clear();
  const { signal, token } = begin(); clearImage(); fit();
  controls.forEach(id => { $(id).disabled = true; }); $('hours').disabled = true; $('hours-toggle').disabled = true; hoursMenu(false);
  $('position').textContent = 'No observations'; $('gaps').textContent = '';
  $('start-time').textContent = $('end-time').textContent = ''; $('frame-marks').replaceChildren();
  $('placeholder').textContent = 'Loading observations…'; setStatus('Discovering JMA observations…');
  try {
    const discovered = await discoverJma({ signal, product });
    if (token !== revision) return;
    catalogue = discovered;
    $('end-at').replaceChildren(...catalogue.map((frame, i) => { const option = document.createElement('option'); option.value = i; option.textContent = format(frame.observedAt); return option; }).reverse());
    $('end-at').value = catalogue.length - 1; $('end-at').disabled = false;
    $('hours').disabled = false; $('hours-toggle').disabled = false; $('hours').value = 'All available';
    await selectWindow();
  } catch (error) {
    if (token === revision && error.name !== 'AbortError') fail(`Could not load observations from JMA. ${error.message} Refresh or retry.`);
  } finally { if (token === revision) $('cancel').hidden = true; }
}
function tick() {
  if (!playing || !playback) return;
  index = (index + 1) % playback.frames.length;
  const { entry, bitmap } = playback.frames[index], frame = entry.frame;
  const canvas = $('playback-image');
  if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) { canvas.width = bitmap.width; canvas.height = bitmap.height; }
  canvas.getContext('2d').drawImage(bitmap, 0, 0); canvas.hidden = false; $('image').hidden = true; $('placeholder').hidden = true;
  $('observation').textContent = format(frame.observedAt); $('observation').dateTime = frame.observedAt;
  $('timeline').value = index; $('timeline').setAttribute('aria-valuetext', format(frame.observedAt));
  $('position').textContent = `${index + 1} / ${sequence.frames.length}`;
  const age = observationStatus(frame.observedAt, { now: new Date().toISOString(), staleAfterMs: 1800000 });
  $('age').textContent = age.state === 'future' ? 'Catalogue time is in the future' : `${age.state === 'stale' ? 'Older observation · ' : ''}${Math.max(0, Math.floor(age.ageMs / 60000))} min ago`;
  $('dimensions').textContent = `${entry.width} × ${entry.height} px`;
  timer = setTimeout(tick, frameDelay);
}
$('play').onclick = async () => {
  if (playing || preparing) { stop(); setStatus('Playback paused.'); return; }
  request?.abort(); revision++; $('error').hidden = true;
  const current = sequence;
  const controller = new AbortController(); preparing = controller; const token = ++preparationRevision;
  $('cancel').hidden = false;
  try {
    if (!playback) {
      const ready = await preparePlayback(current, store, controller.signal, setStatus);
      if (token !== preparationRevision) { ready.close(); return; }
      playback = ready;
    }
    playing = true; $('play').innerHTML = pauseIcon; $('play').setAttribute('aria-label', 'Pause observations');
    setStatus('Playing buffered observations. Gaps are skipped.');
    timer = setTimeout(tick, frameDelay);
  } catch (error) {
    if (token === preparationRevision) { setStatus(error.name === 'AbortError' ? 'Buffering cancelled.' : 'Playback could not start.'); if (error.name !== 'AbortError') { $('error').textContent = error.message; $('error').hidden = false; } }
  } finally { if (token === preparationRevision) { preparing = undefined; $('cancel').hidden = true; } }
};
$('previous').onclick = () => { stop(); show(index - 1); };
$('next').onclick = () => { stop(); show(index + 1); };
$('timeline').oninput = () => { stop(); show(Number($('timeline').value)); };
let hourIndex = -1;
function hoursMenu(open) {
  $('hour-presets').hidden = !open;
  $('hours').setAttribute('aria-expanded', String(open)); $('hours-toggle').setAttribute('aria-expanded', String(open));
  if (!open) { $('hours').removeAttribute('aria-activedescendant'); hourIndex = -1; }
}
function chooseHours(value) { $('hours').value = value; hoursMenu(false); $('hours').focus(); selectWindow(); }
$('hours-toggle').onclick = () => hoursMenu($('hour-presets').hidden);
$('hours').onkeydown = event => {
  const options = [...$('hour-presets').children];
  if (event.key === 'Escape') { hoursMenu(false); return; }
  if (['ArrowDown', 'ArrowUp'].includes(event.key) && options.length) {
    event.preventDefault(); hoursMenu(true); hourIndex = (hourIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    $('hours').setAttribute('aria-activedescendant', options[hourIndex].id); options.forEach((option, i) => option.classList.toggle('highlighted', i === hourIndex));
  } else if (event.key === 'Enter') { event.preventDefault(); if (!$('hour-presets').hidden && hourIndex >= 0) chooseHours(options[hourIndex].dataset.value); else { hoursMenu(false); selectWindow(); } }
};
document.addEventListener('pointerdown', event => { if (!event.target.closest('.hours-combo')) hoursMenu(false); });
$('hours').onchange = selectWindow;
$('fps').onchange = () => { frameDelay = 1000 / Number($('fps').value); };
$('refresh').onclick = refresh;
$('retry').onclick = () => sequence ? show(index) : refresh();
$('cancel').onclick = () => { if (preparing) { stop(); setStatus('Buffering cancelled.'); return; } request?.abort(); revision++; stop(); clearImage(); $('cancel').hidden = true; $('placeholder').textContent = 'Loading cancelled'; setStatus('Loading cancelled.'); $('retry').hidden = false; };
$('fit').onclick = fit;
function changeZoom(delta) { zoom = Math.max(1, Math.min(4, zoom + delta)); if (zoom === 1) panX = panY = 0; transform(); }
$('zoom-in').onclick = () => changeZoom(.5); $('zoom-out').onclick = () => changeZoom(-.5);
$('viewport').onkeydown = event => {
  if ($('image').hidden && $('playback-image').hidden) return;
  const steps = { ArrowLeft: [30, 0], ArrowRight: [-30, 0], ArrowUp: [0, 30], ArrowDown: [0, -30] };
  if (['+', '=', '-','0', ...Object.keys(steps)].includes(event.key)) {
    event.preventDefault();
    if (event.key === '0') fit(); else if (steps[event.key]) { panX += steps[event.key][0]; panY += steps[event.key][1]; transform(); } else changeZoom(event.key === '-' ? -.5 : .5);
  }
};
$('viewport').onpointerdown = event => { if (event.target.closest('button') || ($('image').hidden && $('playback-image').hidden)) return; drag = { x: event.clientX - panX, y: event.clientY - panY }; $('viewport').setPointerCapture(event.pointerId); };
$('viewport').onpointermove = event => { if (!drag) return; panX = event.clientX - drag.x; panY = event.clientY - drag.y; transform(); };
$('viewport').onpointerup = $('viewport').onpointercancel = () => { drag = undefined; };
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
const exportActions = attachExports({ store, selection: () => sequence, currentIndex: () => index, stop: () => { stop(); request?.abort(); revision++; $('cancel').hidden = true; } });
function updateProduct() {
  product = getProduct($('product').value);
  $('image').alt = `Himawari-9 ${$('region').selectedOptions[0].textContent} ${product.name}`;
  document.querySelector('.credit a').href = product.sourceUrl;
  $('product-description').textContent = product.description || 'B13 shows cloud patterns day and night. Brightness is not calibrated temperature.';
  $('region-description').textContent = product.coverage.regionId ? 'Australia: 110–155°E, 10–45°S. Provider raster; exact CRS unverified. Mainland and Tasmania, not all external territories.' : '';
  $('tcr-acknowledgement').hidden = product.band !== 'trm'; $('tcr-acknowledgement').textContent = product.band === 'trm' ? tcrAcknowledgement : '';
  refresh();
}
$('region').onchange = () => {
  const choices = products.filter(item => $('region').value === 'australia' ? item.coverage.regionId : !item.coverage.regionId);
  $('product').replaceChildren(...choices.map(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = item.band === 'b13' ? 'B13 · Infrared' : item.name; return option; }));
  $('product').value = choices.find(item => item.band.toLowerCase() === product.band.toLowerCase())?.id || choices[0].id;
  updateProduct();
};
$('product').onchange = updateProduct;
$('end-at').onchange = selectWindow;
$('region').onchange();

$('fullscreen').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('viewer').requestFullscreen(); }
  catch { setStatus('Fullscreen is unavailable in this browser.'); }
};
document.addEventListener('fullscreenchange', () => {
  const active = Boolean(document.fullscreenElement);
  $('fullscreen').setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  $('fullscreen').setAttribute('aria-pressed', String(active));
});

let fullscreenIdleTimer;
function revealFullscreenControls() {
  clearTimeout(fullscreenIdleTimer);
  $('viewer').classList.remove('controls-idle');
  if (document.fullscreenElement === $('viewer')) fullscreenIdleTimer = setTimeout(() => $('viewer').classList.add('controls-idle'), 2000);
}
$('viewer').addEventListener('pointermove', revealFullscreenControls);
$('viewer').addEventListener('pointerdown', revealFullscreenControls);
$('viewer').addEventListener('keydown', revealFullscreenControls);
$('viewer').addEventListener('focusin', revealFullscreenControls);
document.addEventListener('fullscreenchange', revealFullscreenControls);

window.addEventListener('image-cache-warning', event => {
  $('cache-status').textContent = event.detail; $('cache-status').hidden = false;
});
