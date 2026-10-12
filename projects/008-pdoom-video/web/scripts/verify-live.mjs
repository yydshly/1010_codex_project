import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {dist,project} from './build-research.mjs';
const{values}=parseArgs({options:{url:{type:'string'},commit:{type:'string'},run:{type:'string'}}});
if(!values.url||!values.url.startsWith('https://'))throw Error('需提供实际 HTTPS 目录 --url');
const base=values.url.replace(/\/?$/,'/');
const manifest=JSON.parse(await fs.readFile(path.join(dist,'publication-manifest.json'),'utf8'));
const entries=[...manifest.files,{path:'publication-manifest.json',bytes:(await fs.stat(path.join(dist,'publication-manifest.json'))).size,sha256:createHash('sha256').update(await fs.readFile(path.join(dist,'publication-manifest.json'))).digest('hex')}];
let next=0;const results=[];
async function worker(){
 while(next<entries.length){const e=entries[next++];try{
 const r=await fetch(new URL(e.path,base),{signal:AbortSignal.timeout(45000),headers:{'Cache-Control':'no-cache'}});
 const b=Buffer.from(await r.arrayBuffer()),hash=createHash('sha256').update(b).digest('hex');
 results.push({...e,status:r.status,contentType:r.headers.get('content-type'),actualBytes:b.length,actualSha256:hash,passed:r.ok&&b.length===e.bytes&&hash===e.sha256});
 }catch(error){results.push({...e,passed:false,error:error.message})}}
}
await Promise.all(Array.from({length:4},worker));results.sort((a,b)=>a.path.localeCompare(b.path));
const report={date:'2026-10-12',checkedAt:new Date().toISOString(),url:base,commit:values.commit,actionsRun:values.run,files:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results};
await fs.writeFile(path.join(project,'notes/publication-resource-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log('线上 HTTP、大小与 SHA-256：'+report.passed+'/'+report.files+' 通过。');
if(report.failed){console.error(JSON.stringify(results.filter(x=>!x.passed),null,2));process.exitCode=1}
