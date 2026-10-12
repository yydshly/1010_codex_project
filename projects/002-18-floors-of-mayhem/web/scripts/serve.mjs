import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { build, dist } from './build.mjs';

const { values } = parseArgs({ options: { dist: { type: 'boolean', default: false }, port: { type: 'string', default: '5182' }, base: { type: 'string', default: '/' } } });
if (!values.dist) await build();
const base = '/' + values.base.replace(/^\/+|\/+$/g, '') + (values.base.replace(/^\/+|\/+$/g, '') ? '/' : '');
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('无效端口');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const gameOrigin = 'http://127.0.0.1:3182';
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/' && base !== '/') { response.writeHead(302, { Location: base }); response.end(); return; }
    if (!url.pathname.startsWith(base)) { response.writeHead(404); response.end('Not found'); return; }
    const relative = decodeURIComponent(url.pathname.slice(base.length)) || 'index.html';
    if (relative === 'runtime.json') {
      let gameUrl = null, battleUrl = null;
      try { const health = await fetch(gameOrigin + '/health', { signal: AbortSignal.timeout(800) }); const state = health.ok ? await health.json() : null; if (state?.ok) gameUrl = gameOrigin + '/'; } catch {}
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      try { const check = await fetch('http://127.0.0.1:3183/health', { signal: AbortSignal.timeout(600) }); if (check.ok && (await check.json()).ok) battleUrl = 'http://127.0.0.1:3183/'; } catch {}
      response.end(JSON.stringify({ gameUrl, battleUrl })); return;
    }
    const file = path.resolve(dist, relative);
    if (!file.startsWith(dist + path.sep)) { response.writeHead(403); response.end('Forbidden'); return; }
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end('Unable to load'); }
});
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log('Local: http://127.0.0.1:' + port + base));
process.on('SIGINT', () => server.close());
process.on('SIGTERM', () => server.close());
