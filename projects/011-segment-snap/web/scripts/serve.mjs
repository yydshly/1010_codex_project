import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const dist = process.argv.includes('--dist');
const root = dist ? path.join(sourceRoot, 'dist') : sourceRoot;
const assets = dist ? path.join(root, 'assets') : path.resolve(sourceRoot, '../assets');
const port = Number(process.env.PORT || (dist ? 5192 : 5191));
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.txt':'text/plain; charset=utf-8' };
if (!existsSync(root)) throw new Error('构建目录不存在，请先运行 npm run build。');
const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400); response.end('Bad request'); return; }
  const prefix = '/1010_codex_project/011-segment-snap';
  if (pathname === prefix || pathname === `${prefix}/`) pathname = '/';
  else if (pathname.startsWith(`${prefix}/`)) pathname = pathname.slice(prefix.length);
  const assetRequest = pathname.startsWith('/assets/');
  const base = assetRequest ? assets : root;
  const relative = assetRequest ? pathname.slice(8) : pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.resolve(base, relative);
  const check = path.relative(base, file);
  if (check.startsWith('..') || path.isAbsolute(check) || !existsSync(file) || !statSync(file).isFile()) { response.writeHead(404); response.end('Not found'); return; }
  if (!assetRequest && !dist && (relative.startsWith('scripts/') || relative.endsWith('.md') || relative === 'package.json' || relative === 'package-lock.json')) { response.writeHead(404); response.end('Not found'); return; }
  response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
  if (request.method === 'HEAD') response.end();
  else createReadStream(file).pipe(response);
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用，请设置 PORT 为其他端口后重试。` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Segment–Snap ${dist ? '构建预览' : '能力观察台'}: http://127.0.0.1:${port}/`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(() => process.exit(0)); });
