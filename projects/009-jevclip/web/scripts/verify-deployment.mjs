import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
const {values} = parseArgs({options:{url:{type:'string',default:'https://yydshly.github.io/1010_codex_project/009-jevclip/'},commit:{type:'string'}}});
if (!/^[0-9a-f]{40}$/.test(values.commit || '')) throw new Error('需要实际部署的完整 commit SHA');
const project = fileURLToPath(new URL('../../',import.meta.url));
const repo = path.resolve(project,'../..');
const base = new URL(values.url);
if (base.protocol !== 'https:' || base.hostname !== 'yydshly.github.io' || base.pathname !== '/1010_codex_project/009-jevclip/') throw new Error('只验证固定009公开路径');
const digest = data => createHash('sha256').update(data).digest('hex');
async function responseFor(relative, options={}) {
  const response = await fetch(new URL(relative,base),{...options,signal:AbortSignal.timeout(45000)});
  assert.equal(response.status,200,'资源不可读：' + relative);
  return response;
}
const manifest = await (await responseFor('publication-manifest.json')).json();
assert.equal(manifest.project,'009-jevclip');
assert.equal(manifest.sections,9);
assert.equal(manifest.paragraphs,32);
assert.equal(manifest.upstreamRevision,'3d4b13f6ecbb7f56cf212c5040b4b4e19d83967a');
const results = new Array(manifest.files.length);
let next = 0;
async function verifyFile() {
  while (next < manifest.files.length) {
    const index = next++, file = manifest.files[index];
    const bytes = Buffer.from(await (await responseFor(file.path)).arrayBuffer());
    assert.equal(bytes.length,file.bytes,file.path + ' 大小不一致');
    assert.equal(digest(bytes),file.sha256,file.path + ' SHA-256 不一致');
    let source = null;
    if (file.path.startsWith('research/')) source = 'projects/009-jevclip/' + file.path.slice(9);
    else if (file.path === 'demo.mp4') source = 'projects/009-jevclip/assets/demo.mp4';
    else if (file.path !== 'research.html') source = 'projects/009-jevclip/web/src/' + file.path;
    if (source) {
      const committed = execFileSync('git',['show',values.commit + ':' + source],{cwd:repo,maxBuffer:50*1024*1024});
      assert.equal(digest(committed),file.sha256,file.path + ' 与实际部署 commit 中源文件不一致');
    }
    results[index] = {...file,status:200,manifestVerified:true,committedSource:source,sourceVerified:source ? true : null};
  }
}
await Promise.all(Array.from({length:4},verifyFile));
const rootResponse = await fetch(new URL('../',base),{signal:AbortSignal.timeout(45000)});
assert.equal(rootResponse.status,200);
const rootHTML = await rootResponse.text();
assert.ok(rootHTML.includes('./009-jevclip/research.html'),'站点首页缺少009入口');
const existing = ['001-sakura-crossing/research.html','002-18-floors-of-mayhem/research.html','004-muster-ww2/','005-taohuayuan/research.html','006-telegram-media-downloader/research.html','007-google-vids/research.html','008-pdoom-video/research.html','013-model-video-studio/research.html','014-print-bench/research.html'];
const previousPages = [];
for (const relative of existing) {
  const response = await fetch(new URL('../' + relative,base),{method:'HEAD',signal:AbortSignal.timeout(45000)});
  assert.equal(response.status,200,'既有入口不可读：' + relative);
  previousPages.push({path:relative,status:response.status});
}
const rangeResponse = await fetch(new URL('demo.mp4',base),{headers:{Range:'bytes=100-199'},signal:AbortSignal.timeout(45000)});
const rangeBytes = (await rangeResponse.arrayBuffer()).byteLength;
assert.equal(rangeResponse.status,206,'视频范围请求');
assert.equal(rangeBytes,100);
const guide = results.find(r=>r.path === 'research/assets/jevclip-overview-2026-10-12.png');
const check = {checkedAt:new Date().toISOString(),deployedCommit:values.commit,url:new URL('research.html',base).href,upstreamRevision:manifest.upstreamRevision,files:results,resourceCount:results.length,guideSha256:guide.sha256,siteIndex:{status:200,entryPresent:true},previousPages,videoRange:{status:206,bytes:100,contentRange:rangeResponse.headers.get('content-range')}};
const output = path.join(project,'notes/publication-resource-verification.json');
let history;
try { history = JSON.parse(await readFile(output,'utf8')); }
catch(error) { if(error.code !== 'ENOENT') throw error; history={project:'009-jevclip',checks:[]}; }
history.checks.push(check);
await writeFile(output,JSON.stringify(history,null,2)+'\n');
console.log('正式资源验收通过：' + results.length + ' 项 HTTP / 大小 / SHA-256 与清单及部署源文件一致；原图一致、站点入口存在、9 个既有入口 HTTP 200、视频 Range 206。');
