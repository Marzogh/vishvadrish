import { extensionRequest } from './extension.mjs';
import { utc } from '../core/metadata.mjs';
import { createSequence } from '../core/sequence.mjs';
export const LIMIT = 50000000;
export const nictProduct = Object.freeze({ id: 'nict.d531106.1d', name: 'NICT colour', band: 'D531106', expectedIntervalMs: 600000,
  sourceUrl: 'https://himawari8.nict.go.jp/', coverage: { sourceWidth: 550, sourceHeight: 550 },
  rights: { minimumCredit: 'NICT / JMA / CEReS', acknowledgement: 'Imagery: NICT / JMA / CEReS. Non-commercial use only.' } });
export const timeMeaning = 'Provider URL time slot; scan start/end not independently verified.';
export function slot(value) {
  const canonical = utc(value);
  if (Date.parse(canonical) % 600000) throw Error('Use UTC times on ten-minute boundaries.');
  return canonical;
}
export function sourceUrl(time) {
  const t = slot(time); return `https://himawari8.nict.go.jp/img/D531106/1d/550/${t.slice(0,10).replaceAll('-', '/')}/${t.slice(11,19).replaceAll(':', '')}_0_0.png`;
}
export const filename = time => slot(time).replaceAll('-', '').replaceAll(':', '').replace('.000Z', 'Z') + '.png';
export function checkPng(bytes) {
  if (!bytes.length || bytes.length > 5000000 || ![137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n)) throw Error('Expected a PNG under 5 MB.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 24 || view.getUint32(16) !== 550 || view.getUint32(20) !== 550) throw Error('Expected 550 × 550 images.');
}
export function historicalSequence(entries, requested, missing = []) {
  if (!entries.length) throw Error('No historical images available for this range.');
  const frames = entries.map(e=>e.frame);
  return { ...createSequence({ product: nictProduct, frames, start: requested.start, end: requested.end, maxFrames:144, grid:{kind:'source-raster',width:550,height:550,fit:'contain'}, gapPolicy:'skip' }), local:true, timeMeaning, missing };
}
export async function loadHistory(start, end, signal, progress) {
  start=slot(start); end=slot(end);
  const count=(Date.parse(end)-Date.parse(start))/600000+1;
  if(!Number.isInteger(count)||count<1||count>144)throw Error('Choose 1 to 144 ten-minute slots, inclusive.');
  const entries=[],missing=[]; let total=0;
  for(let i=0;i<count;i++) {
    signal.throwIfAborted();const time=new Date(Date.parse(start)+i*600000).toISOString();
    progress(`Buffering ${i+1}/${count} · ${missing.length} missing`);
    const result=await extensionRequest('frame',time,signal);
    if(result.missing){missing.push(time);continue;}
    if(typeof result.data!=='string'||result.data.length>6700000)throw Error('Unexpected extension response.');
    const bytes=Uint8Array.from(atob(result.data),c=>c.charCodeAt(0));checkPng(bytes);total+=bytes.length;
    if(total>LIMIT)throw Error('History exceeds 50 MB. Choose a shorter range.');
    const blob=new Blob([bytes],{type:'image/png'});
    const bitmap=await createImageBitmap(blob);const width=bitmap.width,height=bitmap.height;bitmap.close();
    if(width!==550||height!==550)throw Error('Unexpected historical image dimensions.');
    const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    const frame={id:nictProduct.id+':'+time,productId:nictProduct.id,observedAt:time,source:{url:sourceUrl(time),slot:time}};
    entries.push(Object.freeze({frame,blob,width,height,sha256,acquiredAt:new Date().toISOString()}));
  }
  signal.throwIfAborted();return {entries,sequence:historicalSequence(entries,{start,end},missing)};
}
