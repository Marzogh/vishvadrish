import { test, expect } from '@playwright/test';
import { fixtures } from './fixtures.mjs';
import { unzipSync } from 'fflate';
import { readFile } from 'node:fs/promises';
async function open(page, options={}){await fixtures(page,options);await page.goto('/');await page.locator('#product').selectOption('jma.himawari9.full-disc.b13');await expect(page.locator('#image')).toBeVisible();await page.locator('#region').selectOption('australia');await expect(page.locator('#image')).toBeVisible();}
async function exported(page,kind){await page.locator('#fps').selectOption('2');await page.locator('[data-export="'+kind+'"]').click();await expect(page.locator('#export-status')).toHaveText('Ready to download.');}
async function saved(page,info,name){const waiting=page.waitForEvent('download');await page.locator('#export-file').click();const file=info.outputPath(name);await(await waiting).saveAs(file);return readFile(file);}
test('Australia selection isolates products and preserves regional PNG, ZIP and video geometry',async({page},info)=>{
 await open(page);await expect(page.locator('#image')).toHaveJSProperty('naturalWidth',901);
 await page.locator('#product').selectOption('jma.himawari9.australia.b08');await expect(page.locator('#image')).toHaveAttribute('alt',/Water vapour/);await expect(page.locator('#image')).toBeVisible();
 await page.locator('.save summary').click();await exported(page,'frame');const png=await saved(page,info,'regional.png');expect(png.readUInt32BE(16)).toBe(550);expect(png.readUInt32BE(20)).toBe(484);
 await exported(page,'zip');const files=unzipSync(await saved(page,info,'regional.zip'));const record=JSON.parse(new TextDecoder().decode(files['manifest.json']));
 expect(record.product.band).toBe('b08');expect(record.product.coverage.bounds).toEqual([110,-45,155,-10]);expect(record.grid.width).toBe(901);expect(record.grid.height).toBe(701);expect(record.frames.every(f=>f.productId==='jma.himawari9.australia.b08')).toBe(true);
 await exported(page,'video');await expect(page.locator('#export-video')).toHaveJSProperty('videoWidth',550);await expect(page.locator('#export-video')).toHaveJSProperty('videoHeight',484);await expect(page.locator('#export-video')).toHaveJSProperty('duration',1.5);await saved(page,info,'regional.webm');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('australia-mobile.png'),fullPage:true});
 await page.locator('.save summary').click();await page.locator('#region').selectOption('full-disc');await expect(page.locator('#image')).toBeVisible();await expect(page.locator('#export-result')).toBeHidden();await expect(page.locator('#image')).toHaveJSProperty('naturalWidth',550);
});
for (const region of ['australia', 'full-disc']) test(`${region} TCR retains dark frames in viewing, playback, PNG, ZIP and video`,async({page},info)=>{
 await fixtures(page,{blankColour:true});await page.goto('/');
 await page.locator('#region').selectOption(region);await page.locator('#product').selectOption(`jma.himawari9.${region}.trm`);
 await expect(page.locator('#image')).toBeVisible();await expect(page.locator('#error')).toBeHidden();
 await expect(page.locator('#position')).toHaveText('3 / 3');await expect(page.locator('#observation')).toHaveText('2026-01-01 00:30 UTC');
 expect(await page.locator('#image').evaluate(image=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.drawImage(image,0,0,1,1);return x.getImageData(0,0,1,1).data[0];})).toBeLessThan(5);
 await page.locator('#fps').selectOption('2');await page.getByRole('button',{name:'Play observations',exact:true}).click();
 await expect(page.locator('#playback-image')).toBeVisible();
 await expect.poll(()=>page.locator('#playback-image').evaluate(c=>c.getContext('2d').getImageData(c.width/2,c.height/4,1,1).data[0])).toBeLessThan(5);
 await page.getByRole('button',{name:'Pause observations',exact:true}).click();await expect(page.locator('#position')).toHaveText('3 / 3');
 await page.locator('.source summary').click();await expect(page.locator('#tcr-acknowledgement')).toContainText('10.2151/jmsj.2018-049');await page.locator('.source summary').click();
 async function darkPng(bytes){return page.evaluate(async bytes=>{const image=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.drawImage(image,image.width/2,image.width/4,1,1,0,0,1,1);const red=x.getImageData(0,0,1,1).data[0];image.close();return red;},Array.from(bytes));}
 await page.locator('.save summary').click();await exported(page,'frame');expect(await darkPng(await saved(page,info,'dark.png'))).toBeLessThan(5);
 await exported(page,'zip');const files=unzipSync(await saved(page,info,'tcr.zip'));const names=Object.keys(files).filter(n=>n.endsWith('.png')).sort();expect(names).toHaveLength(3);expect(await darkPng(files[names.at(-1)])).toBeLessThan(5);
 expect(new TextDecoder().decode(files['ATTRIBUTION.txt'])).toContain('NOAA/NESDIS');const record=JSON.parse(new TextDecoder().decode(files['manifest.json']));expect(record.frames).toHaveLength(3);expect(record.product.rights.minimumCredit).toBe('JMA | NOAA/NESDIS | CSU/CIRA');
 await exported(page,'video');await expect(page.locator('#export-video')).toHaveJSProperty('duration',1.5);
 const red=await page.locator('#export-video').evaluate(async video=>{await new Promise(resolve=>{video.onseeked=resolve;video.currentTime=1.25;});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.drawImage(video,video.videoWidth/2,video.videoWidth/4,1,1,0,0,1,1);return x.getImageData(0,0,1,1).data[0];});expect(red).toBeLessThan(5);await saved(page,info,'dark-final-frame.webm');
});
test('changed regional dimensions are rejected without a stale image',async({page})=>{
 await fixtures(page,{badRegionalDimensions:true});await page.goto('/');await page.locator('#product').selectOption('jma.himawari9.full-disc.b13');await expect(page.locator('#image')).toBeVisible();await page.locator('#region').selectOption('australia');await expect(page.locator('#error')).toContainText('dimensions changed');await expect(page.locator('#image')).toBeHidden();
});
test('live Australia infrared and water vapour selection and video export',async({page},info)=>{
 test.skip(process.env.JMA_LIVE!=='1','Set JMA_LIVE=1');test.setTimeout(60000);await page.goto('/');await page.locator('#product').selectOption('jma.himawari9.full-disc.b13');await expect(page.locator('#image')).toBeVisible();await page.locator('#region').selectOption('australia');await expect(page.locator('#image')).toHaveJSProperty('naturalWidth',901);
 await page.locator('#product').selectOption('jma.himawari9.australia.b08');await expect(page.locator('#image')).toBeVisible();await page.locator('#hours').fill('1');await page.locator('#hours').press('Tab');await expect(page.locator('#image')).toBeVisible();await page.locator('.save summary').click();await exported(page,'video');await expect(page.locator('#export-video')).toHaveJSProperty('duration',3);await saved(page,info,'live-australia.webm');await page.screenshot({path:info.outputPath('live-australia.png'),fullPage:true});
});
