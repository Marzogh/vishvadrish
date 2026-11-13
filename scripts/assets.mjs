import { mkdir, copyFile, cp } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await mkdir(new URL('vendor/', root), { recursive: true });
for (const [from, to] of [
  ['mediabunny/dist/bundles/mediabunny.mjs', 'mediabunny.mjs'], ['mediabunny/LICENSE', 'mediabunny-LICENSE'],
  ['fflate/esm/browser.js', 'fflate.mjs'], ['fflate/LICENSE', 'fflate-LICENSE'],
]) { await copyFile(new URL('node_modules/' + from, root), new URL('vendor/' + to, root)); console.log('Prepared vendor/' + to); }
if (process.argv.includes('--build')) {
  await mkdir(new URL('dist/', root), { recursive: true });
  for (const name of ['index.html', 'src', 'vendor']) await cp(new URL(name, root), new URL('dist/' + name, root), { recursive: true });
  console.log('Static application built in dist/; no tests or private files included.');
}
