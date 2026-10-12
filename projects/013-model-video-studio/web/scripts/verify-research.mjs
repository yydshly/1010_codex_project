import {writeFile,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {hash} from '../lib/providers.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),base='http://127.0.0.1:4323';
const catalog=await(await fetch(base+'/api/research')).json(),checks=[];
for(const [id,asset]of Object.entries(catalog.assets)){
 assert.equal(asset.available,true,id+' unavailable');const head=await fetch(base+asset.url,{method:'HEAD'});assert.equal(head.status,200,id);assert.equal(Number(head.headers.get('content-length')),asset.bytes);
 if(['video','audio'].includes(asset.type)){const range=await fetch(base+asset.url,{headers:{Range:'bytes=0-1023'}});assert.equal(range.status,206,id);assert.equal((await range.arrayBuffer()).byteLength,1024);checks.push({id,type:asset.type,head:200,range:206});}
 else{const response=await fetch(base+asset.url);assert.equal(response.status,200);if(asset.type==='json')JSON.parse(await response.text());checks.push({id,type:asset.type,head:200,get:200});}
}
for(const id of ['constructor','unknown','.env'])assert.equal((await fetch(base+'/research-media/'+id)).status,404);
assert.equal((await fetch(base+'/research-media/studio-music',{method:'POST'})).status,405);
const previous=JSON.parse(await readFile(path.join(root,'assets/music/verification.json'),'utf8'));
assert.equal(hash(await readFile(path.join(root,'assets/music/final.mp4'))),previous.sha256);
await mkdir(path.join(root,'assets/research'),{recursive:true});
const result={at:new Date().toISOString(),checks,resourceCount:checks.length,mediaCount:checks.filter(c=>c.range).length,readOnly:true,unknownResourceDenied:true,existingMusicFilmUnchanged:true};
await writeFile(path.join(root,'assets/research/verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({resourceCount:result.resourceCount,mediaCount:result.mediaCount,readOnly:true,existingMusicFilmUnchanged:true}));
