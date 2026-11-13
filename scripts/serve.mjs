import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!path.startsWith(root + sep) && path !== root) { res.writeHead(403); return res.end(); }
    const relative = path.slice(root.length);
    if (relative.split(sep).some(part => part.startsWith('.'))) { res.writeHead(403); return res.end(); }
    const file = (await stat(path)).isDirectory() ? resolve(path, 'index.html') : path;
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => { console.error('Preview server failed:', error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Viśvadṛś local preview: http://127.0.0.1:${port}\nServing application files only. Press Ctrl+C to stop.`));
