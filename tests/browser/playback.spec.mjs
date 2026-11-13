import { test, expect } from '@playwright/test';
import { fixtures } from './fixtures.mjs';
test('Play buffers all frames before advancing and makes no image requests during playback',async({page})=>{
 await fixtures(page,{delay:true});let images=0;page.on('request',r=>{if(r.url().endsWith('.jpg'))images++;});
 await page.goto('/');await expect(page.locator('#image')).toBeVisible();const initial=await page.locator('#observation').textContent();
 await page.getByRole('button',{name:'Play observations',exact:true}).click();await expect(page.locator('#status')).toContainText('Buffering');await expect(page.locator('#observation')).toHaveText(initial);await expect(page.locator('#image')).toBeVisible();
 await expect(page.getByRole('button',{name:'Pause observations',exact:true})).toBeVisible({timeout:15000});const buffered=images;
 await expect(page.locator('#playback-image')).toBeVisible();await expect(page.locator('#observation')).not.toHaveText(initial);expect(images).toBe(buffered);
 await page.getByRole('button',{name:'Pause observations',exact:true}).click();await page.getByRole('button',{name:'Play observations',exact:true}).click();await expect(page.getByRole('button',{name:'Pause observations',exact:true})).toBeVisible();expect(images).toBe(buffered);
});
test('buffer cancellation leaves the current image visible and releases controls',async({page})=>{
 await fixtures(page,{delay:true});await page.goto('/');await expect(page.locator('#image')).toBeVisible();
 await page.getByRole('button',{name:'Play observations',exact:true}).click();await expect(page.locator('#status')).toContainText('Buffering');await page.getByRole('button',{name:'Cancel loading'}).click();await expect(page.locator('#status')).toHaveText('Buffering cancelled.');await expect(page.locator('#image')).toBeVisible();await expect(page.getByRole('button',{name:'Play observations',exact:true})).toBeVisible();
});
