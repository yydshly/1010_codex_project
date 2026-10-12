import { cp, mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.resolve(web, '../preserved/v1-2026-10-11');
try { await stat(path.join(dest, 'manifest.json')); throw new Error('快照已存在，拒绝覆盖'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
await mkdir(dest, { recursive: true });
for (const name of ['public', 'lib', 'tests', 'scripts', 'server.mjs', 'package.json', 'package-lock.json', 'README.md']) {
  await cp(path.join(web, name), path.join(dest, 'web', name), { recursive: true });
}
await cp(path.resolve(web, '../assets/demo'), path.join(dest, 'demo'), { recursive: true });
for (const id of await readdir(path.join(web, '.local/projects'))) {
  const from = path.join(web, '.local/projects', id), to = path.join(dest, 'projects', id);
  await mkdir(to, { recursive: true });
  for (const file of await readdir(from, { withFileTypes: true })) {
    // Keep every source asset, project record and exported film. Intermediate render caches are reproducible.
    if (file.isFile()) await cp(path.join(from, file.name), path.join(to, file.name));
  }
}
const files = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) await walk(file);
    else { const data = await readFile(file); files.push({ file: path.relative(dest, file).replaceAll('\\', '/'), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') }); }
  }
}
await walk(dest);
await writeFile(path.join(dest, 'manifest.json'), JSON.stringify({ at: new Date().toISOString(), purpose: '升级控制面之前的完整源码、成片和实际项目素材快照；不包含密钥、依赖及渲染缓存', files }, null, 2));
await cp(path.join(web, 'public'), path.join(web, 'public/classic'), { recursive: true });
const html = await readFile(path.join(web, 'public/classic/index.html'), 'utf8');
await writeFile(path.join(web, 'public/classic/index.html'), html.replace('href="/style.css"', 'href="/classic/style.css"').replace('src="/app.js"', 'src="/classic/app.js"'));
console.log(JSON.stringify({ snapshot: dest, files: files.length, bytes: files.reduce((n, f) => n + f.bytes, 0) }));
