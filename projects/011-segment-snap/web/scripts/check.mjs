import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const evidence = JSON.parse(readFileSync(path.join(root,'data/evidence.json'),'utf8'));
assert.equal(evidence.protocol.localInferenceVerified, false, '展示不能标记为本机模型实测');
assert.match(evidence.upstream.commit, /^[a-f0-9]{40}$/);
assert.equal(evidence.protocol.validationScenes, 42);
assert.equal(evidence.protocol.translationOriginEvaluated, false);
const html = readFileSync(path.join(root,'index.html'),'utf8');
for (const marker of ['本地原理示意 · 无模型推理','作者验证集结果 · 非本机实测','模型 GPU 推理尚未在本机验证']) assert.ok(html.includes(marker), `缺少证据标注：${marker}`);
for (const reference of [...html.matchAll(/(?:href|src)="\.\/([^"#]+)"/g)].map(match => match[1])) {
  const file = reference.startsWith('assets/') ? path.resolve(root,'..',reference) : path.join(root,reference);
  assert.ok(existsSync(file), `本地引用不存在：${reference}`);
}
console.log('检查通过：来源、验证边界、固定版本与本地资源引用一致。');
const content = JSON.parse(readFileSync(path.resolve(root,'../notes/research-summary.json'),'utf8'));
const research = readFileSync(path.join(root,'research.html'),'utf8');
assert.equal(content.sections.length,9);
assert.equal(content.modules.length,11);
assert.equal(content.sections.reduce((n,s)=>n+s.body.length,0),36);
const escape = text => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
for (const section of content.sections) {
  assert.equal(section.body.length,section.labels.length);
  for (const paragraph of section.body) assert.ok(research.includes(escape(paragraph)),`摘要正文缺失：${section.id}`);
}
for (const file of JSON.parse(readFileSync(path.join(root,'data/library.json'),'utf8'))) assert.ok(existsSync(path.resolve(root,'..',file.source)),`原资料缺失：${file.source}`);
assert.ok(research.includes('./assets/research-overview.png'));
assert.ok(!research.includes('localhost')&&!research.includes('127.0.0.1'));
console.log('完整研究检查通过：9主题36段、11模块、13份资料；公开页无本机服务地址。');
