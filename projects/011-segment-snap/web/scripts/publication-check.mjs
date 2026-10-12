import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const web=fileURLToPath(new URL('../',import.meta.url));
const project=path.resolve(web,'..');
const dist=path.join(web,'dist');
const hash = file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'publication-manifest.json'),'utf8'));
const listed=new Set(manifest.files.map(file=>file.path));
assert.equal(listed.size,manifest.files.length);
for (const file of manifest.files) {
  assert.equal(fs.statSync(path.join(dist,file.path)).size,file.bytes,file.path);
  assert.equal(hash(path.join(dist,file.path)),file.sha256,file.path);
  assert.ok(!/(^|\/)(node_modules|vendor|\.env|\.git|runtime)(\/|$)/.test(file.path),file.path);
}
assert.equal(hash(path.join(dist,'assets/research-overview.png')),'51851e5dd02140a973f5095956c03b0c99e5926ee9088741b56328d2e3a11106','既有引导PNG不得改写');
assert.equal(hash(path.join(dist,'assets/research-overview.svg')),'c63ca99da1611df5b885292376ad36815126f2396f638c44710c9b8a6873f912','既有引导SVG不得改写');
for (const file of JSON.parse(fs.readFileSync(path.join(web,'data/library.json'),'utf8'))) assert.equal(hash(path.join(project,file.source)),hash(path.join(dist,file.url)),file.source);
for (const name of ['index.html','research.html']) {
  const html=fs.readFileSync(path.join(dist,name),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(ids.length,new Set(ids).size,`${name}存在重复ID`);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference=match[1];
    if (reference.startsWith('#')) { if(reference.length>1) assert.ok(ids.includes(reference.slice(1)),`${name}锚点：${reference}`); continue; }
    if (!reference.startsWith('./')) continue;
    const [relative,anchor]=reference.slice(2).split('#');
    assert.ok(listed.has(relative),`${name}未打包引用：${relative}`);
    if(anchor && relative.endsWith('.html')) assert.ok(fs.readFileSync(path.join(dist,relative),'utf8').includes(`id="${anchor}"`),`${reference}目标锚点不存在`);
  }
}
const discovered=[];
function walk(dir,prefix='') { for(const file of fs.readdirSync(dir,{withFileTypes:true})) { const relative=prefix+file.name; if(file.isDirectory())walk(path.join(dir,file.name),relative+'/');else discovered.push(relative); } }
walk(dist);
assert.deepEqual(discovered.sort(),[...listed,'publication-manifest.json'].sort(),'产物存在清单外文件');
console.log(`发布检查通过：${listed.size+1}项文件，原图哈希、完整资料、双页资源和锚点一致。`);
