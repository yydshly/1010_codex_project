/** 发布前核对八个真实页面、完整资料包、引导图与摘要，适用于 Windows / Linux CI。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve('dist');
const html = ['index', 'research', 'evidence', 'camp', 'archive', 'battle', 'airport', 'harness'];
for (const page of html) {
  const content = fs.readFileSync(path.join(root, page + '.html'), 'utf8');
  assert.ok(!/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(content), page + ' 包含本地运行地址');
  for (const match of content.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:[?#][^"]*)?"/g)) {
    assert.ok(fs.existsSync(path.resolve(root, match[1])), page + ' 缺少资源 ' + match[1]);
  }
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'research/manifest.json'), 'utf8'));
for (const item of manifest.items) {
  const source = fs.readFileSync(path.resolve('..', item.path));
  const packed = fs.readFileSync(path.join(root, item.url));
  assert.deepEqual(packed, source, item.path);
  assert.equal(crypto.createHash('sha256').update(packed).digest('hex'), item.sha256, item.path);
}
for (const resource of ['assets/research-hub-overview.png', 'assets/research-hub-overview-source.svg', 'notes/research-hub-publication.md', 'notes/publication-verification.json']) {
  assert.ok(manifest.items.some(item => item.path === resource), '缺少发布材料：' + resource);
}
const summaries = JSON.parse(fs.readFileSync('src/hub/summary.json', 'utf8'));
const fullSummary = fs.readFileSync('../notes/research-hub-publication.md', 'utf8');
assert.equal(summaries.length, 9);
for (const summary of summaries) {
  assert.equal(summary.labels.length, summary.body.length);
  assert.ok(fullSummary.includes(summary.title) && summary.body.every(text => fullSummary.includes(text)), '完整研究笔记遗漏摘要：' + summary.title);
  assert.ok(manifest.items.some(item => item.path === summary.doc), '缺少摘要依据：' + summary.doc);
}
console.log(`发布检查通过：${html.length} 个页面、${summaries.length} 个摘要模块、${manifest.items.length} 项原始资料，资源与 SHA-256 一致。`);
