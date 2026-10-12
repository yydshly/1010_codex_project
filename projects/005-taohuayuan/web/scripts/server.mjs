import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.m4a': 'audio/mp4', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mshz': 'application/octet-stream' };
const within = (root, file) => { const rel = path.relative(root, file); return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel)); };
const fail = (res, code, message, headers = {}) => { res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', ...headers }); res.end(message); };

function byteRange(header, length) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!m || (!m[1] && !m[2]) || length === 0) throw new Error('range');
  const suffix = !m[1];
  const start = suffix ? Math.max(0, length - Number(m[2])) : Number(m[1]);
  const end = suffix || !m[2] ? length - 1 : Math.min(length - 1, Number(m[2]));
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= length || (suffix && Number(m[2]) === 0)) throw new Error('range');
  return { start, end };
}

export function createDemoServer({ shellRoot, experienceRoot, notesRoot }) {
  return createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) return fail(res, 405, '只支持 GET / HEAD。', { Allow: 'GET, HEAD' });
    try {
      let pathname;
      try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
      catch { return fail(res, 400, '路径无效。'); }
      if (pathname.includes('\0') || pathname.includes('\\')) return fail(res, 400, '路径无效。');
      let root = shellRoot;
      if (pathname.startsWith('/experience/')) { root = experienceRoot; pathname = pathname.slice('/experience'.length); }
      else if (pathname.startsWith('/notes/') && notesRoot) { root = notesRoot; pathname = pathname.slice('/notes'.length); }
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.resolve(root, `.${pathname}`);
      if (!within(path.resolve(root), file)) return fail(res, 403, '路径超出可访问目录。');
      const [resolvedRoot, resolvedFile] = await Promise.all([realpath(root), realpath(file)]);
      if (!within(resolvedRoot, resolvedFile)) return fail(res, 403, '路径超出可访问目录。');
      const info = await stat(resolvedFile);
      if (!info.isFile()) return fail(res, 404, '文件不存在。');
      let range;
      try { range = byteRange(req.headers.range, info.size); }
      catch { return fail(res, 416, '请求的字节范围无效。', { 'Content-Range': `bytes */${info.size}` }); }
      const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
      headers['Content-Length'] = range ? range.end - range.start + 1 : info.size;
      if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${info.size}`;
      res.writeHead(range ? 206 : 200, headers);
      if (req.method === 'HEAD') return res.end();
      const stream = createReadStream(resolvedFile, range || undefined);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes(error.code)) fail(res, 404, '文件不存在。');
      else { console.error(error.message); fail(res, 500, '读取失败，请查看本机终端。'); }
    }
  });
}
