import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { assets, documents, project, dist, filesBelow } from './build.mjs';
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const manifest = JSON.parse(await readFile(path.join(dist,'publication-manifest.json'),'utf8'));
const data = JSON.parse(await readFile(path.join(project,'notes/research-summary.json'),'utf8'));
const html = await readFile(path.join(dist,'research.html'),'utf8');
const esc = value => value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
assert.equal(manifest.sections,9);
assert.equal(manifest.paragraphs,32);
assert.equal(manifest.upstreamRevision,data.revision);
for (const section of data.sections) for (const paragraph of section.body) assert.ok(html.includes(esc(paragraph)),'摘要正文遗漏：' + paragraph.slice(0,25));
for (const file of manifest.files) {
  const absolute = path.resolve(dist,file.path);
  assert.ok(absolute.startsWith(dist + path.sep),'清单路径越界');
  const bytes = await readFile(absolute);
  assert.equal(bytes.length,file.bytes,file.path);
  assert.equal(hash(bytes),file.sha256,file.path);
  assert.ok(!/(^|\/)(node_modules|vendor|\.git|\.env)(\/|$)/.test(file.path),'不应发布本机配置');
}
const actual = (await filesBelow(dist)).map(f=>path.relative(dist,f).split(path.sep).join('/')).filter(f=>f !== 'publication-manifest.json');
assert.deepEqual(actual.sort(),manifest.files.map(f=>f.path).sort(),'产物与清单不一致');
for (const relative of [...documents,...assets.map(a=>'assets/' + a)]) {
  assert.equal(hash(await readFile(path.join(project,relative))),hash(await readFile(path.join(dist,'research',relative))),'原资料字节改变：' + relative);
}
for (const page of ['index.html','research.html']) {
  const source = await readFile(path.join(dist,page),'utf8');
  for (const match of source.matchAll(/(?:src|href|data-resource)="([^"]+)"/g)) {
    const target = match[1];
    if (/^(https?:|#)/.test(target)) continue;
    const raw = target.split(/[?#]/)[0];
    const clean = !raw || raw === './' ? 'index.html' : raw;
    const absolute = path.resolve(dist,clean);
    assert.ok(absolute.startsWith(dist + path.sep),'页面路径越界：' + clean);
    await readFile(absolute);
  }
}
const png = await readFile(path.join(project,data.poster));
assert.equal(png.subarray(1,4).toString(),'PNG');
assert.equal(png.readUInt32BE(16),2400);
assert.equal(png.readUInt32BE(20),7397);
console.log('发布检查通过：9 主题 / 32 段正文 / 9 组模块，' + manifest.files.length + ' 项资源及其 SHA-256；既有引导图与原始资料字节一致，页面链接完整。');
