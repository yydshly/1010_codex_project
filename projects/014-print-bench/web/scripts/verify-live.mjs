import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { parseArgs } from 'node:util';
const {values} = parseArgs({options:{url:{type:'string'},commit:{type:'string'},run:{type:'string'}}});
if (!values.url || !values.url.startsWith('https://')) throw new Error('请提供真实 HTTPS 发布目录 --url');
const base = values.url.replace(/\/?$/, '/');
const web = fileURLToPath(new URL('../',import.meta.url));
const manifest = JSON.parse(fs.readFileSync(web+'dist/publication-manifest.json','utf8'));
const results=[];
let next=0;
async function worker() {
  while(next < manifest.files.length) {
    const expected = manifest.files[next++];
    try {
      const response = await fetch(new URL(expected.path,base),{signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}});
      const bytes = Buffer.from(await response.arrayBuffer());
      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      results.push({...expected,status:response.status,contentType:response.headers.get('content-type'),actualBytes:bytes.length,actualSha256:sha256,passed:response.ok && sha256 === expected.sha256 && bytes.length === expected.bytes});
    } catch(error) { results.push({...expected,passed:false,error:error.message}); }
  }
}
await Promise.all(Array.from({length:4},worker));
results.sort((a,b)=>a.path.localeCompare(b.path));
const report={date:'2026-10-12',checkedAt:new Date().toISOString(),url:base,commit:values.commit,actionsRun:values.run,expectedResources:manifest.files.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,manifest,results};
fs.writeFileSync(web+'../notes/publication-resource-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(`线上逐文件核验：${report.passed}/${manifest.files.length} 通过；${report.failed} 失败。`);
if(report.failed){ console.error(JSON.stringify(results.filter(r=>!r.passed),null,2));process.exitCode=1; }
