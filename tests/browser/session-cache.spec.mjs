import {test,expect} from '@playwright/test';
import {fixtures} from './fixtures.mjs';
const imageVisible=page=>expect(page.locator('#image')).toBeVisible();
test('refresh reuses buffered observations and downloads only a new observation',async({page})=>{
 await fixtures(page);let images=0;page.on('request',r=>{if(r.url().endsWith('.jpg'))images++;});
 await page.goto('/');await imageVisible(page);await page.getByRole('button',{name:'Play observations',exact:true}).click();await expect(page.getByRole('button',{name:'Pause observations',exact:true})).toBeVisible();expect(images).toBe(3);
 await page.reload();await imageVisible(page);expect(images).toBe(3);
 await page.getByRole('button',{name:'Play observations',exact:true}).click();await expect(page.getByRole('button',{name:'Pause observations',exact:true})).toBeVisible();expect(images).toBe(3);
 await page.route('**/sat_img.php?area=fd_',route=>route.fulfill({contentType:'text/html',body:'<select name="slt_time"><option value="0030">00:40 UTC 1 January 2026</option><option value="0020">00:30 UTC 1 January 2026</option><option value="0000">00:10 UTC 1 January 2026</option><option value="2350">00:00 UTC 1 January 2026</option></select>'}));
 await page.getByRole('button',{name:'Refresh observations'}).click();await expect(page.locator('#observation')).toHaveText('2026-01-01 00:40 UTC');expect(images).toBe(4);
});
test('same rolling filename on another date and another product do not reuse old pixels',async({page})=>{
 await fixtures(page);let images=0;page.on('request',r=>{if(r.url().endsWith('.jpg'))images++;});await page.goto('/');await imageVisible(page);
 await page.route('**/sat_img.php?area=fd_',route=>route.fulfill({contentType:'text/html',body:'<select name="slt_time"><option value="0020">00:30 UTC 2 January 2026</option></select>'}));
 await page.getByRole('button',{name:'Refresh observations'}).click();await expect(page.locator('#observation')).toHaveText('2026-01-02 00:30 UTC');expect(images).toBe(2);
 await page.locator('#product').selectOption('jma.himawari9.full-disc.b08');await imageVisible(page);expect(images).toBe(3);
});
test('unavailable session storage falls back visibly without breaking image loading',async({page})=>{
 await page.addInitScript(()=>{IDBFactory.prototype.open=()=>{throw Error('Storage unavailable');};});await fixtures(page);await page.goto('/');await imageVisible(page);await expect(page.locator('#cache-status')).toContainText('storage is unavailable');
});
test('a separate tab starts a separate image-cache session',async({page,context})=>{
 await fixtures(page);await page.goto('/');await imageVisible(page);const other=await context.newPage();await fixtures(other);let images=0;other.on('request',r=>{if(r.url().endsWith('.jpg'))images++;});await other.goto('/');await imageVisible(other);expect(images).toBe(1);await other.close();
});
