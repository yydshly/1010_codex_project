import { mkdir, copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'modules/rain-kit');
const downloads = resolve(root, 'public/downloads'); const docs = resolve(root, 'public/docs');
await mkdir(downloads, { recursive: true }); await mkdir(docs, { recursive: true });
for (const name of ['README', 'API', 'PROVENANCE']) await copyFile(resolve(source, `${name}.md`), resolve(docs, `rain-kit-${name}.md`));
if (!process.env.npm_execpath) throw new Error('请使用 npm run pack:kit');
const result = await new Promise((done, reject) => {
  const child = spawn(process.execPath, [process.env.npm_execpath, 'pack', '--json', '--ignore-scripts', '--pack-destination', downloads], { cwd: source, windowsHide: true });
  let out = ''; let err = ''; child.stdout.on('data', chunk => { out += chunk; }); child.stderr.on('data', chunk => { err += chunk; });
  child.on('error', reject); child.on('exit', code => code === 0 ? done(JSON.parse(out)[0]) : reject(new Error(err)));
});
console.log(`已生成 ${result.filename}：${result.entryCount} 个文件，${result.size} bytes。`);
console.log('中文说明已同步到 public/docs；包不含城市素材和 node_modules。');
