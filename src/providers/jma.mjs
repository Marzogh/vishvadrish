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

export const tcrAcknowledgement = `True Color Reproduction combines AHI bands 1, 2, 3, 4 and 13. Visible/near-infrared signals are transformed through CIE XYZ to sRGB, with a green-band adjustment using bands 2, 3 and 4 and Rayleigh atmospheric correction. It is a processed colour composite, not a three-channel camera photograph.
Developed through collaboration between JMA MSC and the NOAA/NESDIS/STAR GOES-R Algorithm Working Group imagery team, using atmospheric-correction software from CSU/CIRA.
References: Murata, H., K. Saitoh, Y. Sumida (2018), True color imagery rendering for Himawari-8 with a color reproduction approach based on the CIE XYZ color system. doi:10.2151/jmsj.2018-049.
Miller, S., T. Schmit, C. Seaman, D. Lindsey, M. Gunshor, R. Kohrs, Y. Sumida, D. Hillger (2016), A Sight for Sore Eyes - The Return of True Color to Geostationary Satellites. doi:10.1175/BAMS-D-15-00154.1.
Source and terms: https://www.data.jma.go.jp/mscweb/data/himawari/`;

const australia = { kind: 'provider-region', regionId: 'jma-australia', bounds: [110, -45, 155, -10], axisOrder: 'longitude-latitude', sourceWidth: 901, sourceHeight: 701, georeferencing: 'provider-raster; exact CRS and pixel conventions unverified' };
export const products = snapshot([himawariB13, ...[
  ['b13', 'B13 · Infrared', 'Cloud patterns day and night. Brightness is not calibrated temperature.'],
  ['b08', 'B08 · Water vapour', 'Upper-atmosphere water-vapour patterns, not surface humidity.'],
  ['trm', 'True Color Reproduction', 'Daylight colour composite. Blank or dark images may occur at night.'],
].map(([band, name, description]) => ({ ...himawariB13, id: `jma.himawari9.australia.${band}`, band, name, description, coverage: australia,
  sourceUrl: 'https://www.data.jma.go.jp/mscweb/data/himawari/sat_img.php?area=aus',
  rights: { ...himawariB13.rights, attribution: 'Source: MSC/JMA Australia viewer (https://www.data.jma.go.jp/mscweb/data/himawari/sat_img.php?area=aus)', ...(band === 'trm' ? { minimumCredit: 'JMA | NOAA/NESDIS | CSU/CIRA', acknowledgement: tcrAcknowledgement } : {}) },
}))]);
export function getProduct(id) { const product = products.find(item => item.id === id); if (!product) throw Error('Unsupported JMA product'); return product; }

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Catalogue label is scan end; rolling filename slot is scan start. */
export function framesFromJmaOptions(options, { discoveredAt, product = himawariB13 }) {
  product = getProduct(product.id);
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
      id: `${product.id}/${observedAt}`, productId: product.id,
      observedAt, discoveredAt,
      scanStartAt: new Date(Date.parse(observedAt) - 600000).toISOString(), scanEndAt: observedAt,
      timeAuthority: 'provider-catalogue-label', validation: 'catalogue-only',
      requiresDaylight: product.band === 'trm',
      source: { catalogueUrl: product.sourceUrl, label: label.trim(), slot,
        url: new URL(product.coverage.regionId === 'jma-australia' ? `img/aus/aus_${product.band}_${slot}.jpg` : `img/fd_/fd__b13_${slot}.jpg`, product.sourceUrl).href,
        locatorKind: 'rolling', requiresIdentityCheckOnRetrieval: true },
    };
  });
  return snapshot(frames.sort((a, b) => a.observedAt.localeCompare(b.observedAt)));
}

/** Browser HTML boundary; the reusable core accepts options from any HTML parser. */
export async function discoverJma({ product = himawariB13, signal, fetcher = globalThis.fetch, now = () => new Date().toISOString() } = {}) {
  if (typeof globalThis.DOMParser !== 'function') throw new Error('Browser DOMParser required; use framesFromJmaOptions with a local HTML parser');
  product = getProduct(product.id);
  const response = await fetcher(product.sourceUrl, { signal, credentials: 'omit', cache: 'no-store', mode: 'cors' });
  if (!response.ok) throw new Error(`JMA catalogue request failed: HTTP ${response.status}`);
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  const options = [...doc.querySelectorAll('select[name="slt_time"] option')].map(option => ({ slot: option.value, label: option.textContent }));
  return framesFromJmaOptions(options, { discoveredAt: now(), product });
}
