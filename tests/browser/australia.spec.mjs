import { test, expect } from '@playwright/test';
import { fixtures } from './fixtures.mjs';
import { unzipSync } from 'fflate';
import { readFile } from 'node:fs/promises';
async function open(page, options={}){await fixtures(page,options);await page.goto('/');await expect(page.locator('#image')).toBeVisible();await page.locator('#region').selectOption('australia');await expect(page.locator('#image')).toBeVisible();}
async function exported(page,kind){await page.locator('[data-export="'+kind+'"]').click();await expect(page.locator('#export-status')).toHaveText('Ready to download.');}
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
test('colour dark-frame warning recovers with earlier actual end time and carries TCR attribution',async({page},info)=>{
 await open(page,{blankColour:true});await page.locator('#product').selectOption('jma.himawari9.australia.trm');await expect(page.locator('#error')).toContainText('blank or too dark');await expect(page.locator('[data-export="frame"]')).toBeDisabled();
 await page.locator('#end-at').selectOption('0');await expect(page.locator('#image')).toBeVisible();await page.locator('.source summary').click();await expect(page.locator('#tcr-acknowledgement')).toContainText('10.2151/jmsj.2018-049');await page.locator('.source summary').click();
 await page.locator('.save summary').click();await exported(page,'zip');const files=unzipSync(await saved(page,info,'tcr.zip'));expect(new TextDecoder().decode(files['ATTRIBUTION.txt'])).toContain('NOAA/NESDIS');const record=JSON.parse(new TextDecoder().decode(files['manifest.json']));expect(record.product.rights.minimumCredit).toBe('JMA | NOAA/NESDIS | CSU/CIRA');
});
test('changed regional dimensions are rejected without a stale image',async({page})=>{
 await fixtures(page,{badRegionalDimensions:true});await page.goto('/');await expect(page.locator('#image')).toBeVisible();await page.locator('#region').selectOption('australia');await expect(page.locator('#error')).toContainText('dimensions changed');await expect(page.locator('#image')).toBeHidden();
});
test('live Australia infrared and water vapour selection and video export',async({page},info)=>{
 test.skip(process.env.JMA_LIVE!=='1','Set JMA_LIVE=1');test.setTimeout(60000);await page.goto('/');await expect(page.locator('#image')).toBeVisible();await page.locator('#region').selectOption('australia');await expect(page.locator('#image')).toHaveJSProperty('naturalWidth',901);
 await page.locator('#product').selectOption('jma.himawari9.australia.b08');await expect(page.locator('#image')).toBeVisible();await page.getByRole('button',{name:'Latest 6 observations',exact:true}).click();await expect(page.locator('#image')).toBeVisible();await page.locator('.save summary').click();await exported(page,'video');await expect(page.locator('#export-video')).toHaveJSProperty('duration',3);await saved(page,info,'live-australia.webm');await page.screenshot({path:info.outputPath('live-australia.png'),fullPage:true});
});
