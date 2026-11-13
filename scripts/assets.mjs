import { mkdir, copyFile, cp } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await mkdir(new URL('vendor/', root), { recursive: true });
for (const [from, to] of [
  ['mediabunny/dist/bundles/mediabunny.mjs', 'mediabunny.mjs'], ['mediabunny/LICENSE', 'mediabunny-LICENSE'],
  ['fflate/esm/browser.js', 'fflate.mjs'], ['fflate/LICENSE', 'fflate-LICENSE'],
]) { await copyFile(new URL('node_modules/' + from, root), new URL('vendor/' + to, root)); console.log('Prepared vendor/' + to); }
if (process.argv.includes('--build')) {
  await mkdir(new URL('dist/', root), { recursive: true });
  for (const name of ['index.html', 'src', 'vendor', 'assets']) await cp(new URL(name, root), new URL('dist/' + name, root), { recursive: true });
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, [new URL('package-extension.mjs',import.meta.url).pathname, new URL('dist/extensions/',root).pathname], {stdio:'inherit'});
  if(result.status!==0)throw Error('Extension packaging failed.');
  // Never offer the unsigned Firefox package as an installable release.
  const { rm } = await import('node:fs/promises');
  await rm(new URL('dist/extensions/history-firefox-unsigned.zip',root),{force:true});
  await rm(new URL('dist/extensions/firefox/',root),{recursive:true,force:true});
  console.log('Static application built in dist/; no tests or private files included.');
}
