import { test, expect } from '@playwright/test';
import { fixtures } from './fixtures.mjs';
async function start(page, options={}) {
 await fixtures(page,options);await page.goto('/');await expect(page.locator('#image')).toBeVisible();await page.locator('.save summary').click();
}
for(const scenario of ['baseline','large-high-max','hold-no-timestamps']) test(`compatibility ${scenario}`,async({page},info)=>{
 await start(page,{extended:scenario==='large-high-max'});
 await page.locator('#fps').selectOption('2');
 if(scenario==='large-high-max'){
  await page.locator('#hours').fill('All available');await page.locator('#hours').press('Tab');await expect(page.locator('#image')).toBeVisible();
  await page.locator('#fps').selectOption('4');await page.locator('#export-size').selectOption('1100');await page.locator('#export-quality').selectOption('3000000');
 }
 if(scenario==='hold-no-timestamps'){await page.locator('#export-gap').selectOption('hold');await page.locator('#export-timestamps').uncheck();}
 await page.locator('[data-export="video"]').click();
 await expect(page.locator('#export-status')).toHaveText(/Ready to download.|Export failed./,{timeout:50000});
 if(await page.locator('#export-error').isVisible()){
  await expect(page.locator('#export-error')).toContainText('No supported WebM encoder');
  await page.locator('[data-export="zip"]').click();await expect(page.locator('#export-file')).toHaveText('Download ZIP');
  await info.attach('encoder-unavailable',{body:'Graceful unsupported encoder; ZIP fallback prepared',contentType:'text/plain'});
 }else{
  const v=page.locator('#export-video');await expect(v).toHaveJSProperty('duration',scenario==='large-high-max'?6:scenario==='hold-no-timestamps'?2:1.5);
  await expect(v).toHaveJSProperty('videoWidth',scenario==='large-high-max'?1100:550);
  const wait=page.waitForEvent('download');await page.locator('#export-file').click();await(await wait).saveAs(info.outputPath('export.webm'));
  const verify=await page.evaluate(async()=>{const v=document.querySelector('#export-video');v.currentTime=.1;await new Promise(r=>v.onseeked=r);const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const x=c.getContext('2d');x.drawImage(v,0,0);return [...x.getImageData(0,c.width+25,c.width,30).data].some((n,i)=>i%4!==3&&n>200);});
  expect(verify,'mandatory credit pixels remain in footer').toBe(true);
 }
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('result.png'),fullPage:true});
});
test('compatibility unsupported encoder and cancellation',async({page})=>{
 await page.addInitScript(()=>{window.VideoEncoder=undefined;});await start(page,{delay:true});
 await page.locator('[data-export="zip"]').click();await page.locator('#export-cancel').click();await expect(page.locator('#export-status')).toHaveText('Export cancelled.');
 await page.locator('[data-export="video"]').click();await expect(page.locator('#export-error')).toContainText('No supported WebM encoder',{timeout:20000});await expect(page.locator('#export-result')).toBeHidden();
});
