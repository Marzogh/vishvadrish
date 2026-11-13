import { test, expect } from '@playwright/test';

import { fixtures } from './fixtures.mjs';
const host = 'https://www.data.jma.go.jp/mscweb/data/himawari/';
test('browse, scrub, step, play and pause actual catalogue entries', async ({ page }) => {
  await fixtures(page); await page.goto('/');
  await expect(page.locator('#image')).toBeVisible();
  const imageBox = await page.locator('#image').boundingBox();
  const viewportBox = await page.locator('#viewport').boundingBox();
  expect(imageBox.height).toBe(viewportBox.height);
  expect(imageBox.width).toBe(viewportBox.width);
  await expect(page.locator('#observation')).toHaveText('2026-01-01 00:30 UTC');
  await expect(page.locator('#frame-marks span')).toHaveCount(3);
  await expect(page.locator('#gaps')).toHaveText('1 gap · skipped in playback');
  await expect(page.locator('#age')).toContainText('Older observation');
  await page.getByRole('button', { name: 'Previous observation' }).click();
  await expect(page.locator('#observation')).toHaveText('2026-01-01 00:10 UTC');
  await page.locator('#timeline').focus(); await page.keyboard.press('Home');
  await expect(page.locator('#observation')).toHaveText('2026-01-01 00:00 UTC');
  await page.getByRole('button', { name: 'Next observation' }).click();
  await expect(page.locator('#observation')).toHaveText('2026-01-01 00:10 UTC');
  await page.getByRole('button', { name: 'Play observations' }).click();
  await expect(page.locator('#observation')).toHaveText('2026-01-01 00:30 UTC');
  await page.getByRole('button', { name: 'Pause observations' }).click();
  await expect(page.getByRole('button', { name: 'Play observations' })).toBeVisible();
});
test('keyboard zoom, pan and fit; source attribution remains visible', async ({ page }) => {
  await fixtures(page); await page.goto('/'); await expect(page.locator('#image')).toBeVisible();
  await page.locator('#viewport').focus(); await page.keyboard.press('+'); await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#image')).toHaveCSS('transform', 'matrix(1.5, 0, 0, 1.5, 30, 0)');
  await page.keyboard.press('0'); await expect(page.locator('#image')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(page.locator('.credit a')).toHaveAttribute('href', host + 'sat_img.php?area=fd_');
  await page.locator('.source summary').click();
  await expect(page.getByText('Time comes from JMA’s catalogue', { exact: false })).toBeVisible();
});
test('catalogue failure gives a recoverable error without invented observations', async ({ page }) => {
  await fixtures(page, { catalogueStatus: 503 }); await page.goto('/');
  await expect(page.locator('#error')).toContainText('HTTP 503');
  await expect(page.locator('#image')).toBeHidden(); await expect(page.locator('#play')).toBeDisabled();
  await page.unrouteAll(); await fixtures(page); await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('#image')).toBeVisible();
});
for (const scenario of [{ imageStatus: 404 }, { corrupt: true }]) {
  test(`image failure clears timestamp and stops playback: ${JSON.stringify(scenario)}`, async ({ page }) => {
    await fixtures(page, scenario); await page.goto('/');
    await expect(page.locator('#error')).toBeVisible();
    await expect(page.locator('#image')).toBeHidden();
    await expect(page.locator('#observation')).toHaveText('Not loaded');
    await expect(page.locator('#retry')).toBeVisible();
  });
}
test('cancel an image transfer, then retry', async ({ page }) => {
  await fixtures(page, { delay: true }); await page.goto('/');
  await expect(page.locator('#status')).toContainText('Loading observation 3');
  await page.getByRole('button', { name: 'Cancel loading' }).click();
  await expect(page.locator('#status')).toHaveText('Loading cancelled.');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('#image')).toBeVisible();
});
test('mobile, forced colours, reduced motion and contrast', async ({ page }, testInfo) => {
  await fixtures(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await expect(page.locator('#image')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
  const ratios = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const rgb = name => style.getPropertyValue(name).trim().match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16) / 255);
    const luminance = name => rgb(name).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    return ['--text', '--muted', '--accent', '--error', '--line'].map(name => ({ name, ratio: (luminance(name) + .05) / (luminance('--bg') + .05) }));
  });
  for (const { name, ratio } of ratios) expect(ratio, name).toBeGreaterThanOrEqual(name === '--line' ? 3 : 4.5);
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce', contrast: 'more' });
  await expect(page.locator('#play')).toBeVisible();
  await page.locator('#play').focus(); await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Pause observations' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('forced-colours.png'), fullPage: true });
  await page.emulateMedia({ forcedColors: 'none', contrast: 'no-preference' });
  const cdp = await page.context().newCDPSession(page);
  for (const type of ['protanopia', 'deuteranopia', 'tritanopia']) {
    await cdp.send('Emulation.setEmulatedVisionDeficiency', { type });
    await page.screenshot({ path: testInfo.outputPath(`${type}.png`), fullPage: true });
  }
  await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' });
});
test('live JMA discovery, cross-origin pixels and navigation', async ({ page }, testInfo) => {
  test.skip(process.env.JMA_LIVE !== '1', 'Set JMA_LIVE=1 for the explicitly selected upstream test');
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.locator('#image')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('#observation')).toHaveAttribute('datetime', /Z$/);
  const first = await page.locator('#observation').getAttribute('datetime');
  await page.getByRole('button', { name: 'Previous observation' }).click();
  await expect(page.locator('#observation')).not.toHaveAttribute('datetime', first);
  await expect(page.locator('#image')).toBeVisible();
  const pixels = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d'); ctx.drawImage(document.getElementById('image'), 0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data];
  });
  expect(pixels[3]).toBe(255); expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('live-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('live-mobile.png'), fullPage: true });
  await page.getByRole('button',{name:'Latest 6 observations',exact:true}).click();await expect(page.locator('#image')).toBeVisible();await saveAction(page,'video');
  await expect(page.locator('#export-video')).toHaveJSProperty('duration',3);
  const saving=page.waitForEvent('download');await page.locator('#export-file').click();await (await saving).saveAs(testInfo.outputPath('live-six-frames.webm'));
});

test('compact inline choices change frame count and speed; icon buttons remain usable', async ({ page }) => {
  await fixtures(page, { extended: true }); await page.goto('/');
  await expect(page.locator('#image')).toBeVisible();
  await page.getByRole('button', { name: 'Latest 6 observations', exact: true }).click();
  await expect(page.locator('#position')).toHaveText('6 / 6');
  await expect(page.getByRole('button', { name: 'Latest 6 observations', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Latest 24 observations', exact: true }).click();
  await expect(page.locator('#position')).toHaveText('24 / 24');
  await page.getByRole('button', { name: '4 frames per second', exact: true }).click();
  await expect(page.getByRole('button', { name: '4 frames per second', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.locator('#image')).toHaveCSS('transform', 'matrix(1.5, 0, 0, 1.5, 0, 0)');
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await expect(page.locator('#image')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(page.locator('.sourcebar select')).toHaveCount(0);
  for (const name of ['Play observations', 'Previous observation', 'Next observation', 'Refresh observations']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(24); expect(box.height).toBe(32);
  }
});

async function saveAction(page, kind) {
  await page.locator('.save summary').click();
  await page.locator(`[data-export="${kind}"]`).click();
  await expect(page.locator('#export-file')).toBeVisible({ timeout: 25000 });
}
test('PNG and ZIP downloads preserve credit, scan times and frame provenance', async ({ page }, info) => {
  const { unzipSync } = await import('fflate'); const { readFile } = await import('node:fs/promises');
  await fixtures(page); await page.goto('/'); await expect(page.locator('#image')).toBeVisible();
  await saveAction(page, 'frame');
  let waiting = page.waitForEvent('download'); await page.locator('#export-file').click(); let download = await waiting;
  await download.saveAs(info.outputPath('frame.png')); const png = await readFile(info.outputPath('frame.png')); expect(png.subarray(1,4).toString()).toBe('PNG');
  await page.locator('[data-export="zip"]').click(); await expect(page.locator('#export-file')).toHaveText('Download ZIP');
  waiting = page.waitForEvent('download'); await page.locator('#export-file').click(); download = await waiting;
  await download.saveAs(info.outputPath('frames.zip')); const files=unzipSync(await readFile(info.outputPath('frames.zip')));
  expect(Object.keys(files).filter(name=>name.endsWith('.png'))).toHaveLength(3);
  const manifest=JSON.parse(new TextDecoder().decode(files['manifest.json']));
  expect(manifest.frames[0].scanStartAt).toBe('2025-12-31T23:50:00.000Z');
  expect(manifest.frames[0].scanEndAt).toBe('2026-01-01T00:00:00.000Z');
  expect(manifest.frames.every(frame=>/^[a-f0-9]{64}$/.test(frame.sha256))).toBe(true);
  expect(manifest.product.rights.attribution).toContain('JMA');
});
test('saved WebM has exact timing, dimensions and ordered native-player markers', async ({ page }, info) => {
  await fixtures(page); await page.goto('/'); await expect(page.locator('#image')).toBeVisible(); await saveAction(page,'video');
  const waiting=page.waitForEvent('download');await page.locator('#export-file').click();const download=await waiting;
  const path=info.outputPath('saved.webm');await download.saveAs(path);
  await page.evaluate(()=>{const input=document.createElement('input');input.type='file';input.id='saved-input';document.body.append(input);});
  await page.locator('#saved-input').setInputFiles(path);
  const result=await page.evaluate(async()=>{
    const video=document.createElement('video');video.src=URL.createObjectURL(document.querySelector('#saved-input').files[0]);
    await new Promise(resolve=>video.onloadedmetadata=resolve);const canvas=document.createElement('canvas');canvas.width=550;canvas.height=606;const ctx=canvas.getContext('2d');const markers=[];
    for(let i=0;i<3;i++){video.currentTime=(i+.5)/2;await new Promise(resolve=>video.onseeked=resolve);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));ctx.drawImage(video,0,0);let marker=0;for(let b=0;b<4;b++)if(ctx.getImageData(50+b*100,275,1,1).data[0]>128)marker|=1<<b;markers.push(marker);}
    return {duration:video.duration,width:video.videoWidth,height:video.videoHeight,markers};
  });
  expect(result).toEqual({duration:1.5,width:550,height:606,markers:[0,1,2]});
  await page.screenshot({path:info.outputPath('export-controls.png'),fullPage:true});
});
test('export cancellation and acquisition failure leave no downloadable partial output',async({page})=>{
  await fixtures(page,{delay:true});await page.goto('/');await expect(page.locator('#image')).toBeVisible();
  await page.locator('.save summary').click();await page.locator('[data-export="zip"]').click();await expect(page.locator('#export-cancel')).toBeVisible();await page.locator('#export-cancel').click();
  await expect(page.locator('#export-status')).toHaveText('Export cancelled.');await expect(page.locator('#export-result')).toBeHidden();
  await page.route('**/fd__b13_2350.jpg',route=>route.fulfill({status:404}));await page.locator('[data-export="zip"]').click();
  await expect(page.locator('#export-error')).toContainText('HTTP 404');await expect(page.locator('#export-result')).toBeHidden();
});
