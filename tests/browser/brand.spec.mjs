import { test, expect } from '@playwright/test';
import { fixtures } from './fixtures.mjs';

for (const mode of ['light','dark']) test(`brand artwork loads under a subdirectory in ${mode} mode`,async({page},info)=>{
  await page.addInitScript(value=>localStorage.setItem('vishvadrish-theme',value),mode);
  await fixtures(page);await page.goto('/dist/?region=australia&product=b13');
  await expect(page.locator('#image')).toBeVisible();
  const mark=page.locator('.brand-icon');
  await expect(mark).toBeVisible();await expect(mark).toHaveAttribute('alt','');
  expect(await mark.evaluate(img=>img.complete&&img.naturalWidth===1254&&img.naturalHeight===1254)).toBe(true);
  await expect(page.locator('#identity-motto-note')).toContainText("Earth's pulse from afar.");
  for(const icon of await page.locator('link[rel=icon],link[rel=apple-touch-icon]').evaluateAll(links=>links.map(link=>link.href))) {
    const response=await page.request.get(icon);expect(response.ok(),icon).toBe(true);
    expect((await response.body()).byteLength).toBeGreaterThan(500);
  }
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content','https://chipsncode.com/vishvadrish/assets/brand/vishvadrish-social-opengraph-1200x630.png');
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content','1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content','630');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content','summary_large_image');
  const preview=await page.evaluate(async()=>{
    const image=new Image();image.src='./assets/brand/vishvadrish-social-opengraph-1200x630.png';await image.decode();return [image.naturalWidth,image.naturalHeight];
  });
  expect(preview).toEqual([1200,630]);
  for(const width of [320,390,1280]) {
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${mode} ${width} overflow`).toBe(true);
    await expect(mark).toBeInViewport();await expect(page.locator('#theme')).toBeVisible();
    await page.screenshot({path:info.outputPath(`${mode}-${width}.png`),fullPage:true});
  }
});
test('compact embed retains the brand mark and readable header at 320 px',async({page})=>{
  await page.setViewportSize({width:320,height:720});await fixtures(page);await page.goto('/dist/?region=australia&product=b13&embed=1');
  await expect(page.locator('#image')).toBeVisible();await expect(page.locator('.brand-icon')).toBeVisible();
  await expect(page.locator('#standalone')).toBeVisible();await expect(page.locator('#theme')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
