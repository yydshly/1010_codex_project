import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const web=path.resolve(import.meta.dirname,'..'), dist=path.join(web,'dist-public');
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function filesBelow(dir){const files=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())files.push(...await filesBelow(p));else files.push(p);}return files;}
// Only generated executable assets and navigation are rewritten. Original source resources remain byte-identical.
const links=[['./index.html#experiment','./replay.html#shops'],['./index.html#resources','./research.html#resources'],['./route.html#algorithm','./replay.html#algorithm'],['./route.html#route-experiment','./replay.html#routes'],['./route.html','./replay.html#routes'],['./fishing.html','./replay.html#fish'],['./index.html','./research.html']];
for(const p of await filesBelow(dist)){
 const rel=path.relative(dist,p).split(path.sep).join('/');
 if(rel.startsWith('research/'))continue;
 if(!/\.(html|js)$/.test(rel))continue;
 let s=await fs.readFile(p,'utf8');for(const [old,next]of links)s=s.replaceAll(old,next);await fs.writeFile(p,s);
}
await fs.copyFile(path.join(dist,'research.html'),path.join(dist,'index.html'));
const summary=JSON.parse(await fs.readFile(path.join(web,'../notes/research-summary.json'),'utf8'));
const files=[];for(const p of (await filesBelow(dist)).sort()){const rel=path.relative(dist,p).split(path.sep).join('/');if(rel==='publication-manifest.json')continue;const b=await fs.readFile(p);files.push({path:rel,bytes:b.length,sha256:hash(b)});}
await fs.writeFile(path.join(dist,'publication-manifest.json'),JSON.stringify({schema:'cadence-publication/1',upstreamRevision:summary.revision,mode:'static-research-and-real-recorded-replay',sections:summary.sections.length,paragraphs:summary.sections.reduce((n,s)=>n+s.body.length,0),files},null,2)+'\n');
console.log(`公开产物：${files.length}项文件 / ${files.reduce((n,f)=>n+f.bytes,0)}字节，原图、原文和真实记录保留。`);
