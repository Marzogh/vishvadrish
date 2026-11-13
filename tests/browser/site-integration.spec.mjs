import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtures } from './fixtures.mjs';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
let appServer, articleServer, appURL, articleURL;
async function listen(server) {
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  return `http://127.0.0.1:${server.address().port}`;
}
test.beforeAll(async () => {
  await stat(resolve(dist, 'index.html'));
  appServer = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (!pathname.startsWith('/vishvadrish/')) { res.writeHead(404); return res.end(); }
      let path = resolve(dist, decodeURIComponent(pathname.slice('/vishvadrish/'.length)) || 'index.html');
      if (!path.startsWith(dist.endsWith(sep) ? dist : dist + sep)) throw Error('Outside build');
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      const types = { '.html':'text/html; charset=utf-8', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.woff2':'font/woff2' };
      res.writeHead(200, { 'Content-Type':types[extname(path)] || 'application/octet-stream' });
      res.end(await readFile(path));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  appURL = await listen(appServer);
  articleServer = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8' });
    res.end(`<!doctype html><html lang="en"><title>Article integration fixture</title><body><h1>Satellite imagery</h1><iframe src="${appURL}/vishvadrish/?region=australia&product=b13&embed=1" title="Viśvadṛś satellite imagery" width="1100" height="720" style="width:100%;border:0" allow="fullscreen" allowfullscreen></iframe></body></html>`);
  });
  articleURL = await listen(articleServer);
  console.log(`Static build mounted at ${appURL}/vishvadrish/; separate article origin ${articleURL}`);
});
test.afterAll(async () => {
  for (const server of [articleServer, appServer]) if (server) await new Promise(done => { server.close(done); server.closeAllConnections(); });
});
async function open(page, query='') {
  await fixtures(page);
  await page.goto(`${appURL}/vishvadrish/${query}`);
  await expect(page.locator('#image')).toBeVisible();
}
async function theme(page, mode) {
  for (let i=0;i<3;i++) {
    if (await page.locator('html').getAttribute('data-theme') === mode) return;
    await page.locator('#theme').click();
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
}
test('built subdirectory loads Plex, metadata, footer translations and product links', async ({page}) => {
  const errors=[]; const failed=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('response', r=>{ if(r.url().startsWith(appURL)&&r.status()>=400) failed.push(r.url()); });
  await open(page,'?region=australia&product=b08#viewer');
  await expect(page.locator('#region')).toHaveValue('australia');
  await expect(page.locator('#product')).toHaveValue('jma.himawari9.australia.b08');
  await expect(page.locator('#image')).toHaveAttribute('alt', /Australia.*Water vapour/);
  await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /Himawari-9/);
  await expect(page.locator('.chipsncode-link')).toHaveAttribute('href','https://chipsncode.com/');
  await expect(page.getByText('Name & motto',{exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'See the meaning of Viśvadṛś',exact:true}).click();
  await expect(page.locator('#identity-name-note')).toBeInViewport();
  await expect(page.locator('#identity-name-note')).toContainText('all-seeing');
  await page.locator('#product').selectOption('jma.himawari9.australia.b13');
  await expect(page).toHaveURL(/region=australia&product=b13#identity-name-note$/);
  await page.locator('#region').selectOption('full-disc');
  await expect(page.locator('#product')).toHaveValue('jma.himawari9.full-disc.b13');
  await page.reload();
  await expect(page.locator('#image')).toBeVisible();
  await expect(page.locator('#product')).toHaveValue('jma.himawari9.full-disc.b13');
  const fonts=await page.evaluate(async()=>{
    await document.fonts.ready;
    return await Promise.all(['400 14px "Plex Sans"','500 28px "Plex Sans"','600 14px "Plex Sans"','400 14px "Plex Mono"','400 14px "Plex Devanagari"','600 25px "Plex Devanagari"'].map(async spec=>({spec,count:(await document.fonts.load(spec)).length})));
  });
  for(const font of fonts) expect(font.count,font.spec).toBeGreaterThan(0);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
test('invalid linked choices are explained and fall back to available products',async({page})=>{
  await open(page,'?region=unknown&product=unknown');
  await expect(page.locator('#link-status')).toHaveText('Unknown region in link. Showing Full disc. Unknown product in link. Showing True Color Reproduction.');
  await expect(page.locator('#product')).toHaveValue('jma.himawari9.full-disc.trm');
});
test('icon theme cycle persists separately and System follows device changes',async({page})=>{
  await page.emulateMedia({colorScheme:'light'});
  await page.addInitScript(()=>localStorage.setItem('theme','dark'));
  await open(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme','system');
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(243, 245, 244)');
  await expect(page.locator('#theme [data-theme-icon=system]')).toBeVisible();
  await page.locator('#theme').focus();await page.keyboard.press('Space');
  await expect(page.locator('#theme')).toHaveAttribute('aria-label','Colour theme: Light. Switch to Dark.');
  await expect(page.locator('#theme [data-theme-icon=light]')).toBeVisible();
  await page.locator('#theme').click();
  await expect(page.locator('#theme [data-theme-icon=dark]')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(21, 24, 25)');
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  expect(await page.evaluate(()=>localStorage.getItem('theme'))).toBe('dark');
  await theme(page,'system');
  await page.emulateMedia({colorScheme:'dark'});
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(21, 24, 25)');
  await page.emulateMedia({colorScheme:'light'});
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(243, 245, 244)');
  expect(await page.evaluate(()=>localStorage.getItem('vishvadrish-theme'))).toBeNull();
});
test('blocked storage still permits theme changes',async({page})=>{
  await page.addInitScript(()=>{ Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}); });
  await open(page);await theme(page,'dark');
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(21, 24, 25)');
  await theme(page,'light');await expect(page.locator('body')).toHaveCSS('background-color','rgb(243, 245, 244)');
});
test('light and dark contrast, narrow layouts, forced colours and vision simulations',async({page},info)=>{
  await open(page);
  for (const mode of ['light','dark']) {
    await theme(page,mode);
    const ratios=await page.evaluate(()=>{
      const style=getComputedStyle(document.documentElement);
      const rgb=name=>style.getPropertyValue(name).trim().match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)/255);
      const lum=name=>rgb(name).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
      return ['--text','--muted','--accent','--error','--line'].map(name=>({name,ratio:contrast(name,'--bg')})).concat([{name:'stage text',ratio:contrast('--stage-text','--stage')}]);
    });
    for(const {name,ratio} of ratios) expect(ratio,`${mode} ${name}`).toBeGreaterThanOrEqual(name==='--line'?3:4.5);
    for(const width of [320,390,768,1280]) {
      await page.setViewportSize({width,height:844});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${mode} ${width}`).toBe(true);
      await expect(page.locator('#theme')).toBeVisible();
      await page.screenshot({path:info.outputPath(`${mode}-${width}.png`),fullPage:true});
    }
    const cdp=await page.context().newCDPSession(page);
    for(const type of ['protanopia','deuteranopia','tritanopia']) {
      await cdp.send('Emulation.setEmulatedVisionDeficiency',{type});
      await page.screenshot({path:info.outputPath(`${mode}-${type}.png`),fullPage:true});
    }
    await cdp.send('Emulation.setEmulatedVisionDeficiency',{type:'none'});await cdp.detach();
  }
  await page.emulateMedia({forcedColors:'active',contrast:'more',reducedMotion:'reduce'});
  await expect(page.locator('#theme')).toBeVisible();await page.locator('#theme').focus();
  await page.keyboard.press('Enter');
  await page.screenshot({path:info.outputPath('forced-colours.png'),fullPage:true});
});
test('separate-origin article embed retains controls, fullscreen, downloads and standalone link',async({page})=>{
  await fixtures(page);await page.goto(articleURL);
  const frame=page.frameLocator('iframe');
  await expect(frame.locator('#image')).toBeVisible();
  await expect(frame.locator('.name')).toHaveText('Viśvadṛś');
  await expect(frame.locator('.site-footer')).toBeHidden();
  await expect(frame.locator('.chipsncode-link')).toBeHidden();
  const standalone=frame.locator('#standalone');
  await expect(standalone).toHaveAttribute('href',`${appURL}/vishvadrish/?region=australia&product=b13`);
  const popupEvent=page.waitForEvent('popup');await standalone.click();const popup=await popupEvent;
  await popup.waitForLoadState();expect(new URL(popup.url()).searchParams.has('embed')).toBe(false);await popup.close();
  await frame.locator('#theme').click();
  await expect(frame.locator('html')).toHaveAttribute('data-theme','light');
  await frame.getByRole('button',{name:'Enter fullscreen',exact:true}).click();
  await expect(frame.locator('#fullscreen')).toHaveAttribute('aria-pressed','true');
  await frame.getByRole('button',{name:'Exit fullscreen',exact:true}).click();
  await expect(frame.locator('#fullscreen')).toHaveAttribute('aria-pressed','false');
  await frame.getByRole('button',{name:'Play observations',exact:true}).click();
  await expect(frame.locator('#playback-image')).toBeVisible();
  await frame.getByRole('button',{name:'Pause observations',exact:true}).click();
  await frame.locator('.save summary').click();await frame.locator('[data-export=frame]').click();
  await expect(frame.locator('#export-file')).toBeVisible();
  const downloadEvent=page.waitForEvent('download');await frame.locator('#export-file').click();const download=await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  await frame.locator('#region').selectOption('full-disc');
  await expect(standalone).toHaveAttribute('href',`${appURL}/vishvadrish/?region=full-disc&product=b13`);
});
