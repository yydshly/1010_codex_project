import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { data, documents, renderSummary } from './render-research.mjs';
const root=path.resolve('dist-public');
const registry=JSON.parse(fs.readFileSync('../../../projects.json','utf8')).projects.find(p=>p.id===5);
assert.deepEqual(registry.summarySections,data.sections.map(({title,labels,body})=>({title,labels,body})));
assert.equal(registry.summary,data.summary);
assert.equal(fs.readFileSync('../notes/research-summary.md','utf8'),renderSummary());
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
for (const file of ['index.html','research.html']) {
  const html=fs.readFileSync(path.join(root,file),'utf8');
  assert.ok(!/https?:\/\/(localhost|127\.0\.0\.1)/i.test(html));
  for (const item of data.sections) { assert.ok(html.includes(`id="${item.id}"`));for(const text of item.body) assert.ok(html.includes(text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')),'摘要遗漏'); }
  for (const m of html.matchAll(/(?:src|href|data-src)="(\.\/[^"?#]+)(?:[?#][^"]*)?"/g)) assert.ok(fs.existsSync(path.join(root,m[1])),'引用缺失：'+m[1]);
  assert.ok(html.includes('./media/research-overview.png')&&html.includes('./media/research-overview.svg'));
  assert.ok(html.includes('../001-sakura-crossing/index.html'));
}
for (const item of manifest.items) {
  const packed=fs.readFileSync(path.join(root,item.url)), source=fs.readFileSync(path.resolve('..',item.source));
  assert.deepEqual(packed,source,item.source);
  assert.equal(crypto.createHash('sha256').update(packed).digest('hex'),item.sha256,item.source);
  assert.ok(!/(?:^|\/)(?:\.cache|experience|upstream|node_modules)(?:\/|$)|\.(?:mshz|m4a|glb|gltf|wav|env)$/i.test(item.url),'发布范围越界：'+item.url);
}
assert.equal(documents.length,15);assert.equal(data.sections.length,9);
const png=fs.readFileSync(path.join(root,'media/research-overview.png'));
assert.equal(png.readUInt32BE(16),4000);assert.equal(png.readUInt32BE(20),16308);
assert.ok(!fs.existsSync(path.join(root,'experience'))&&!fs.existsSync(path.join(root,'app.js')));
console.log(`发布检查通过：9 维摘要、15 份资料、${manifest.items.length} 项资源，内容与 SHA-256 一致，未包含上游三维产物。`);
