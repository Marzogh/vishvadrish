import {test,expect} from '@playwright/test';
import {fixtures} from './fixtures.mjs';
test('colour and 4 fps defaults, all speed choices, and floating fullscreen playback',async({page})=>{
 await fixtures(page);await page.goto('/');await expect(page.locator('#image')).toBeVisible();await expect(page.locator('#product')).toHaveValue('jma.himawari9.full-disc.trm');await expect(page.locator('#fps')).toHaveValue('4');expect(await page.locator('#fps option').allTextContents()).toEqual(['1','2','4','6','8','10']);
 await page.getByRole('button',{name:'Enter fullscreen'}).click();await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.timeline')).toHaveCSS('position','fixed');
 await page.locator('#fps').selectOption('10');await page.getByRole('button',{name:'Play observations',exact:true}).click();await expect(page.getByRole('button',{name:'Pause observations',exact:true})).toBeVisible();await expect(page.locator('#playback-image')).toBeVisible();await page.getByRole('button',{name:'Pause observations',exact:true}).click();
 await page.getByRole('button',{name:'Exit fullscreen'}).click();await expect(page.locator('#fullscreen')).toHaveAttribute('aria-pressed','false');
 await page.locator('.save summary').click();await page.locator('[data-export="video"]').click();await expect(page.locator('#export-status')).toHaveText('Ready to download.');await expect(page.locator('#export-video')).toHaveJSProperty('duration',.3);
});

test('fullscreen controls fade after idle and return with pointer or keyboard activity',async({page})=>{
 await fixtures(page);await page.goto('/');await expect(page.locator('#image')).toBeVisible();await page.getByRole('button',{name:'Enter fullscreen'}).click();
 await expect(page.locator('.timeline')).toHaveCSS('opacity','0',{timeout:4000});
 await page.mouse.move(200,200);await expect(page.locator('.timeline')).toHaveCSS('opacity','1');await expect(page.locator('.timeline')).toHaveCSS('background-color','rgba(21, 24, 25, 0.84)');
 await expect(page.locator('.timeline')).toHaveCSS('opacity','0',{timeout:4000});await page.keyboard.press('Tab');await expect(page.locator('.timeline')).toHaveCSS('opacity','1');
 await page.getByRole('button',{name:'Exit fullscreen'}).click();await expect(page.locator('.timeline')).toHaveCSS('opacity','1');
});
