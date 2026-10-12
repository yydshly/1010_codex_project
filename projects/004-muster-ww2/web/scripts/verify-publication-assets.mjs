/** 从真实 HTTPS 站点核对完整资源包；报告只保存实际 HTTP 和 SHA-256 结果。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const base = process.env.BASE_URL;
assert.ok(base?.startsWith('https://') && base.endsWith('/004-muster-ww2/'), '请配置完整 HTTPS 项目目录 BASE_URL');
const report = {date:new Date().toISOString(), base, scope:'公开八个页面、站点入口、完整资料包逐文件字节与哈希、原始引导图', checks:[], assets:[], passed:false};
const get = async relative => {
  const response = await fetch(new URL(relative, base), {signal:AbortSignal.timeout(120000)});
  assert.equal(response.status, 200, relative);
  return {response, bytes:Buffer.from(await response.arrayBuffer())};
};
try {
  const {bytes} = await get('research/manifest.json');
  const manifest = JSON.parse(bytes.toString());
  assert.equal(manifest.project, '004-muster-ww2');
  assert.equal(manifest.commit, '7d2fa86ebc3b999eaf085831cdcd5dccefea63d4');
  assert.equal(manifest.license, 'MIT');
  report.materialCounts = manifest.counts;
  report.checks.push({name:'公开资料清单与上游固定来源一致', passed:true, files:manifest.items.length});
  for (const name of ['index','research','evidence','camp','archive','battle','airport','harness']) {
    const {response, bytes} = await get(name + '.html');
    assert.ok(response.headers.get('content-type')?.includes('text/html'));
    assert.ok(!/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(bytes.toString()));
  }
  assert.ok((await get('../')).bytes.toString().includes('./004-muster-ww2/'));
  report.checks.push({name:'八个真实 HTML 和研究站首页入口可达，无本地地址依赖', passed:true, pages:8});
  let cursor = 0;
  await Promise.all(Array.from({length:4}, async () => {
    while (cursor < manifest.items.length) {
      const item = manifest.items[cursor++];
      const {bytes} = await get(item.url);
      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      assert.equal(bytes.length, item.bytes, item.path);
      assert.equal(sha256, item.sha256, item.path);
      report.assets.push({path:item.path, bytes:bytes.length, sha256, status:200});
    }
  }));
  assert.equal(report.assets.length, manifest.items.length);
  report.assets.sort((a,b) => a.path.localeCompare(b.path));
  report.checks.push({name:'公开资料包每个文件的实际字节和 SHA-256 与发布清单一致', passed:true, files:report.assets.length});
  for (const [file,sha256] of [
    ['assets/research-hub-overview.png','c83b72a0b575c66886586d6ba3cbe8025da478f6f88e20f71593ce3bde8b5e8b'],
    ['assets/research-hub-overview-source.svg','e51dcf07c3989a7dd42be8d10f34389cd5e20453b937216774559c4682563aed']
  ]) assert.equal(report.assets.find(item=>item.path===file)?.sha256, sha256, '引导图必须保持原始文件');
  report.checks.push({name:'公开首页引导 PNG 与可编辑 SVG 保持原图完整 SHA-256', passed:true});
  report.passed = true;
  console.log(`HTTPS 资料验收通过：8 个页面、${report.assets.length} 项完整文件、原始 PNG/SVG 哈希一致。`);
} catch (error) {
  report.failure = String(error.stack ?? error);
  console.error(report.failure);
  process.exitCode = 1;
} finally {
  report.finished = new Date().toISOString();
  fs.writeFileSync('../notes/publication-asset-results.json', JSON.stringify(report,null,2) + '\n');
}
