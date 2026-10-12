import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { build, dist } from './build.mjs';

const { values } = parseArgs({ options: { dist: { type: 'boolean', default: false }, port: { type: 'string', default: '5186' }, base: { type: 'string', default: '/' } } });
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口必须是 1–65535 的整数');
const prefix = values.base.replace(/^\/+|\/+$/g, '');
const base = prefix ? `/${prefix}/` : '/';
if (!values.dist) await build();
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const server = http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (base !== '/' && (pathname === '/' || pathname === base.slice(0, -1))) { response.writeHead(302, { Location: base }); response.end(); return; }
    if (!pathname.startsWith(base)) { response.writeHead(404); response.end('Not found'); return; }
    const relative = decodeURIComponent(pathname.slice(base.length)) || 'index.html';
    const file = path.resolve(dist, relative);
    if (!file.startsWith(`${dist}${path.sep}`)) { response.writeHead(403); response.end('Forbidden'); return; }
    const body = await readFile(file);
    const headers = { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' };
    const range = request.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) { response.writeHead(416, { ...headers, 'Content-Range': `bytes */${body.length}` }); response.end(); return; }
      const start = match[1] ? Number(match[1]) : Math.max(0, body.length - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(Number(match[2]), body.length - 1) : body.length - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= body.length) { response.writeHead(416, { ...headers, 'Content-Range': `bytes */${body.length}` }); response.end(); return; }
      const part = body.subarray(start, end + 1);
      response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Content-Length': part.length });
      response.end(request.method === 'HEAD' ? undefined : part);
    } else {
      response.writeHead(200, { ...headers, 'Content-Length': body.length });
      response.end(request.method === 'HEAD' ? undefined : body);
    }
  } catch (error) { response.writeHead(error.code === 'ENOENT' ? 404 : error instanceof URIError ? 400 : 500); response.end('Unable to load file'); }
});
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}${base}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
