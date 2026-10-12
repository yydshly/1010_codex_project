import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const project=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const baseIndex=process.argv.indexOf('--base');
if(baseIndex<0) throw new Error('请传入 --base 正式 HTTPS 项目目录。');
const base=new URL(process.argv[baseIndex+1]);
assert.equal(base.protocol,'https:');
const dist=path.join(project,'web/dist');
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'publication-manifest.json'),'utf8'));
const files=[...manifest.files,{path:'publication-manifest.json',bytes:fs.statSync(path.join(dist,'publication-manifest.json')).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dist,'publication-manifest.json'))).digest('hex')}];
const results=[];
let next=0;
async function requestFile(url,file){
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});
      const body=Buffer.from(await response.arrayBuffer());
      if([429,502,503,504].includes(response.status) && attempt<3) throw new Error(`临时HTTP ${response.status}`);
      return {response,body};
    }catch(error){
      if(attempt===3) throw new Error(`${file.path}: 3次请求仍失败：${error.message}`,{cause:error});
      console.warn(`${file.path}: 第${attempt}次网络请求失败，稍后重试。`);
      await new Promise(resolve=>setTimeout(resolve,attempt*1000));
    }
  }
}
async function worker(){
  while(next<files.length){
    const file=files[next++];
    const url=new URL(file.path,base);
    url.searchParams.set('verify',file.sha256.slice(0,12));
    const {response,body}=await requestFile(url,file);
    assert.equal(response.status,200,`${file.path}: HTTP ${response.status}`);
    const hash=crypto.createHash('sha256').update(body).digest('hex');
    assert.equal(body.length,file.bytes,`${file.path}: 大小不同`);
    assert.equal(hash,file.sha256,`${file.path}: SHA256不同`);
    results.push({path:file.path,status:response.status,bytes:body.length,sha256:hash});
  }
}
await Promise.all(Array.from({length:4},worker));
const report={checkedAt:new Date().toISOString(),base:base.href,status:'passed',fileCount:results.length,files:results.sort((a,b)=>a.path.localeCompare(b.path))};
fs.writeFileSync(path.join(project,'notes/publication-http.json'),JSON.stringify(report,null,2)+'\n');
console.log(`正式 HTTPS 验证通过：${report.fileCount}项文件，HTTP、大小与SHA-256全部一致。`);
