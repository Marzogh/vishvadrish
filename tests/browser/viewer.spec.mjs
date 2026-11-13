import { test, expect } from '@playwright/test';

const host = 'https://www.data.jma.go.jp/mscweb/data/himawari/';
async function fixtures(page, { catalogueStatus = 200, imageStatus = 200, corrupt = false, delay = false, extended = false } = {}) {
  // Generate our own JPEG pixels, avoiding provider imagery in test fixtures.
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 550;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#101010'; ctx.fillRect(0, 0, 550, 550);
    ctx.fillStyle = '#cccccc'; ctx.beginPath(); ctx.arc(275, 275, 220, 0, Math.PI * 2); ctx.fill();
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  const standard = [
    ['0020', '00:30 UTC 1 January 2026'], ['0000', '00:10 UTC 1 January 2026'], ['2350', '00:00 UTC 1 January 2026'],
  ];
  const entries = extended ? Array.from({ length: 24 }, (_, i) => { const d = new Date(Date.UTC(2026, 0, 1, 0, i * 10)); return [String(i).padStart(4, '0'), `${d.toISOString().slice(11, 16)} UTC 1 January 2026`]; }) : standard;
  const html = '<select name="slt_time">' + entries.map(([slot, label]) => `<option value="${slot}">${label}</option>`).join('') + '</select>';
  await page.route(host + '**', async route => {
    const catalogue = route.request().url().includes('sat_img.php');
    if (delay && !catalogue) await new Promise(resolve => setTimeout(resolve, 1200));
    await route.fulfill({ status: catalogue ? catalogueStatus : imageStatus,
      headers: { 'access-control-allow-origin': '*' },
      contentType: catalogue ? 'text/html' : 'image/jpeg', body: catalogue ? html : corrupt ? Buffer.from('broken jpeg') : Buffer.from(data, 'base64') });
  });
}
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
  await page.locator('summary').click();
  await expect(page.getByText('Time comes from JMA’s catalogue.', { exact: false })).toBeVisible();
});
test('catalogue failure gives a recoverable error without invented observations', async ({ page }) => {
  await fixtures(page, { catalogueStatus: 503 }); await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('HTTP 503');
  await expect(page.locator('#image')).toBeHidden(); await expect(page.locator('#play')).toBeDisabled();
  await page.unrouteAll(); await fixtures(page); await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('#image')).toBeVisible();
});
for (const scenario of [{ imageStatus: 404 }, { corrupt: true }]) {
  test(`image failure clears timestamp and stops playback: ${JSON.stringify(scenario)}`, async ({ page }) => {
    await fixtures(page, scenario); await page.goto('/');
    await expect(page.getByRole('alert')).toBeVisible();
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
  await expect(page.locator('select')).toHaveCount(0);
  for (const name of ['Play observations', 'Previous observation', 'Next observation', 'Refresh observations']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(24); expect(box.height).toBe(32);
  }
});
