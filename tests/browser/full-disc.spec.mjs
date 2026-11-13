import { test, expect } from '@playwright/test';
import { fixtures } from './fixtures.mjs';
for(const band of ['b08','trm']) test(`full-disc ${band} uses separate pixels and exports`,async({page},info)=>{
 await page.emulateMedia({colorScheme:"dark"}); await fixtures(page);const requests=[];page.on('request',request=>requests.push(request.url()));
 await page.goto('/');await expect(page.locator('#product option')).toHaveCount(3);
 await page.locator('#product').selectOption('jma.himawari9.full-disc.'+band);await expect(page.locator('#image')).toBeVisible();expect(requests.some(url=>url.includes('fd__'+band+'_'))).toBe(true);
 await expect(page.locator('#region')).toHaveCSS('color','rgb(236, 239, 234)');await expect(page.locator('#region')).toHaveCSS('background-color','rgb(21, 24, 25)');await expect(page.locator('#product')).toHaveCSS('color','rgb(236, 239, 234)');
 await page.locator('#fps').selectOption('2');await page.locator('.save summary').click();await page.locator('[data-export="video"]').click();await expect(page.locator('#export-status')).toHaveText('Ready to download.');await expect(page.locator('#export-video')).toHaveJSProperty('duration',1.5);
 const waiting=page.waitForEvent('download');await page.locator('#export-file').click();await(await waiting).saveAs(info.outputPath(band+'.webm'));await page.screenshot({path:info.outputPath('full-disc-controls.png'),fullPage:true});
});
test('live full-disc water vapour and colour image access',async({page},info)=>{
 test.skip(process.env.JMA_LIVE!=='1','Set JMA_LIVE=1');test.setTimeout(60000);await page.goto('/');await expect(page.locator('#image')).toBeVisible();
 for(const band of ['b08','trm']){
 await page.locator('#product').selectOption('jma.himawari9.full-disc.'+band);await expect(page.locator('#image')).toBeVisible();await expect(page.locator('#image')).toHaveAttribute('alt',band==='b08'?/Water vapour/:/True Color/);
 await page.getByRole('button',{name:'Previous observation',exact:true}).click();await expect(page.locator('#image')).toBeVisible();
 await page.screenshot({path:info.outputPath('live-'+band+'.png'),fullPage:true});
 }
});

test('hours defaults to catalogue maximum, supports typing, and rejects excess history',async({page})=>{
 await fixtures(page,{extended:true});await page.goto('/');await expect(page.locator('#image')).toBeVisible();await expect(page.locator('#hours')).toHaveValue('All available');await expect(page.locator('#position')).toHaveText('24 / 24');
 await page.locator('#hours').fill('2');await page.locator('#hours').press('Tab');await expect(page.locator('#position')).toHaveText('12 / 12');
 await page.locator('#hours').fill('120');await page.locator('#hours').press('Tab');expect(await page.locator('#hours').evaluate(input=>input.validity.valid)).toBe(false);await expect(page.locator('#position')).toHaveText('12 / 12');
});

test('hours preset menu exposes numeric choices even with All available selected',async({page})=>{
 await fixtures(page,{extended:true});await page.goto('/');await expect(page.locator('#image')).toBeVisible();await page.getByRole('button',{name:'Choose hours preset'}).click();
 await expect(page.getByRole('option',{name:'3 h',exact:true})).toBeVisible();await page.getByRole('option',{name:'3 h',exact:true}).click();await expect(page.locator('#hours')).toHaveValue('3');await expect(page.locator('#position')).toHaveText('18 / 18');
 await page.locator('#hours').press('ArrowDown');await page.locator('#hours').press('Enter');await expect(page.locator('#hours')).toHaveValue('All available');await expect(page.locator('#position')).toHaveText('24 / 24');
});
