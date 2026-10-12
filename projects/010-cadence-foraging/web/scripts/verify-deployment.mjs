import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../../../..'),project=path.join(root,'projects/010-cadence-foraging'),dist=path.join(project,'web/dist-public');
const base='https://yydshly.github.io/1010_codex_project/010-cadence-foraging/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const local=JSON.parse(await fs.readFile(path.join(dist,'publication-manifest.json'),'utf8'));
const mr=await fetch(base+'publication-manifest.json',{signal:AbortSignal.timeout(30000)});assert.equal(mr.status,200);
const remote=await mr.json();assert.deepEqual(remote,local,'正式发布清单与当前构建不同');
let next=0;const results=[];
await Promise.all(Array.from({length:6},async()=>{while(next<local.files.length){const f=local.files[next++];const r=await fetch(base+f.path,{signal:AbortSignal.timeout(60000)});const b=Buffer.from(await r.arrayBuffer());const got=sha(b);results.push({path:f.path,status:r.status,bytes:b.length,sha256:got,match:r.status===200&&b.length===f.bytes&&got===f.sha256});}}));
const preserved=[];for(const slug of ['001-sakura-crossing','002-18-floors-of-mayhem','004-muster-ww2','005-taohuayuan','006-telegram-media-downloader','007-google-vids','008-pdoom-video','009-jevclip','013-model-video-studio','014-print-bench']){const r=await fetch('https://yydshly.github.io/1010_codex_project/'+slug+'/research.html',{signal:AbortSignal.timeout(30000)});preserved.push({slug,status:r.status});}
const home=await fetch('https://yydshly.github.io/1010_codex_project/',{signal:AbortSignal.timeout(30000)});const html=await home.text();const rootEntry={status:home.status,cadenceEntry:html.includes('./010-cadence-foraging/research.html')};
const receipt={schema:'cadence-publication-resource-verification/1',verifiedAt:new Date().toISOString(),baseURL:base,sections:local.sections,paragraphs:local.paragraphs,files:results.sort((a,b)=>a.path.localeCompare(b.path)),preservedProjects:preserved,rootEntry,allMatch:results.every(r=>r.match)&&preserved.every(p=>p.status===200)&&rootEntry.status===200&&rootEntry.cadenceEntry};
await fs.writeFile(path.join(project,'notes/publication-resource-verification.json'),JSON.stringify(receipt,null,2)+'\n');assert.ok(receipt.allMatch,'线上资源检查失败');
console.log(`HTTPS检查通过：${results.length}项资源大小与SHA-256一致，原图/原文/真实记录保留；既有10个入口HTTP200，根首页已接入010。`);
