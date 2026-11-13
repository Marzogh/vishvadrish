import { snapshot, utc } from '../core/metadata.mjs';

export const JMA_CATALOGUE = 'https://www.data.jma.go.jp/mscweb/data/himawari/sat_img.php?area=fd_';

export const himawariB13 = snapshot({
  id: 'jma.himawari9.full-disc.b13',
  satellite: 'Himawari-9', operator: 'JMA', band: 'B13',
  name: 'Full-disc infrared', representation: 'provider-rendered-jpeg',
  coverage: { kind: 'satellite-disc', georeferencing: 'unverified' },
  expectedIntervalMs: 600000,
  sourceUrl: JMA_CATALOGUE,
  rights: {
    termsUrl: 'https://www.data.jma.go.jp/mscweb/en/general/note.html',
    checkedOn: '2026-11-13',
    display: 'permitted-with-conditions', download: 'permitted-with-conditions',
    derivatives: 'permitted-with-conditions', redistribution: 'permitted-with-conditions',
    attribution: `Source: Meteorological Satellite Center of JMA website (${JMA_CATALOGUE})`,
    editNoticeRequired: true,
    conditions: ['Preserve source credit', 'Disclose edits', 'Do not imply JMA created the derivative', 'Respect applicable third-party rights and excluded content'],
  },
  capabilities: {
    discovery: 'implemented', browserImageAccess: 'previously-demonstrated',
    imageIdentityValidation: 'not-implemented', regionalRendering: 'not-implemented',
    frameDownload: 'implemented', sequenceExport: 'implemented', videoExport: 'webm-capability-detected',
  },
});

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Catalogue label is scan end; rolling filename slot is scan start. */
export function framesFromJmaOptions(options, { discoveredAt }) {
  discoveredAt = utc(discoveredAt);
  if (!Array.isArray(options) || !options.length) throw new Error('JMA returned no dated observations');
  const slots = new Set();
  const times = new Set();
  const frames = options.map(({ slot, label }) => {
    const match = typeof label === 'string' && label.trim().match(/^(\d{2}):(\d{2}) UTC (\d{1,2}) ([A-Za-z]+) (\d{4})$/);
    if (!match || typeof slot !== 'string' || !/^\d{4}$/.test(slot)) throw new Error('Unrecognised JMA observation option');
    const month = months.indexOf(match[4]) + 1;
    if (!month) throw new Error('Unrecognised JMA month');
    const observedAt = utc(`${match[5]}-${String(month).padStart(2, '0')}-${match[3].padStart(2, '0')}T${match[1]}:${match[2]}:00Z`);
    if (slots.has(slot) || times.has(observedAt)) throw new Error('Duplicate JMA observation or rolling slot');
    slots.add(slot); times.add(observedAt);
    return {
      id: `${himawariB13.id}/${observedAt}`, productId: himawariB13.id,
      observedAt, discoveredAt,
      scanStartAt: new Date(Date.parse(observedAt) - 600000).toISOString(), scanEndAt: observedAt,
      timeAuthority: 'provider-catalogue-label', validation: 'catalogue-only',
      source: { catalogueUrl: JMA_CATALOGUE, label: label.trim(), slot,
        url: new URL(`img/fd_/fd__b13_${slot}.jpg`, JMA_CATALOGUE).href,
        locatorKind: 'rolling', requiresIdentityCheckOnRetrieval: true },
    };
  });
  return snapshot(frames.sort((a, b) => a.observedAt.localeCompare(b.observedAt)));
}

/** Browser HTML boundary; the reusable core accepts options from any HTML parser. */
export async function discoverJma({ signal, fetcher = globalThis.fetch, now = () => new Date().toISOString() } = {}) {
  if (typeof globalThis.DOMParser !== 'function') throw new Error('Browser DOMParser required; use framesFromJmaOptions with a local HTML parser');
  const response = await fetcher(JMA_CATALOGUE, { signal, credentials: 'omit', cache: 'no-store', mode: 'cors' });
  if (!response.ok) throw new Error(`JMA catalogue request failed: HTTP ${response.status}`);
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  const options = [...doc.querySelectorAll('select[name="slt_time"] option')].map(option => ({ slot: option.value, label: option.textContent }));
  return framesFromJmaOptions(options, { discoveredAt: now() });
}
