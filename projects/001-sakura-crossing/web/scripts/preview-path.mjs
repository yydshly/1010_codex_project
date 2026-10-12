// Exercise the planned repository subpath without publishing anything.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const prefix = '/1010_codex_project/001-sakura-crossing/';
await stat(path.join(root, 'index.html')).catch(() => {
  throw new Error('缺少 dist/index.html，请先运行 npm run build。');
});
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    if (pathname === '/' || pathname === prefix.slice(0, -1)) {
      res.writeHead(302, { Location: prefix }); res.end(); return;
    }
    if (!pathname.startsWith(prefix)) { res.writeHead(404); res.end(); return; }
    const file = path.resolve(root, decodeURIComponent(pathname.slice(prefix.length)) || 'index.html');
    if (!file.startsWith(root)) { res.writeHead(404); res.end(); return; }
    if (!(await stat(file)).isFile()) { res.writeHead(404); res.end(); return; }
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': bytes.length });
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
server.listen(5182, '127.0.0.1', () => {
  console.log('子目录验证： http://127.0.0.1:5182' + prefix);
});
