import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {works,capabilities,sources} from '../public/research-data.js';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
let files=0;
for(const slug of ['007-google-vids','013-model-video-studio']){
 const dir=path.join(root,'projects',slug,'web/dist-public'),manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8')),catalog=JSON.parse(await fs.readFile(path.join(dir,'catalog.json'),'utf8')),content=JSON.parse(await fs.readFile(path.join(dir,'content.json'),'utf8'));
 assert.equal(content.summarySections.length,9);assert.equal(content.summarySections.reduce((n,s)=>n+s.body.length,0),27);
 for(const item of manifest.items){const b=await fs.readFile(path.join(dir,item.url));assert.equal(hash(b),item.sha256,item.url);assert.equal(b.length,item.bytes,item.url);assert.ok(!/(^|\/)(\.local|\.env|node_modules|server\.mjs)(\/|$)/.test(item.url));files++;}
 for(const item of Object.values(catalog.assets)){assert.equal(item.available,true);assert.ok(item.url.startsWith('./media/'));assert.ok((await fs.stat(path.join(dir,item.url))).isFile());}
 for(const w of works)assert.equal(catalog.assets[w.asset].type,'video');
 for(const c of capabilities){assert.ok(catalog.assets[c.evidence]);for(const id of c.related)assert.ok(capabilities.some(c=>c.id===id));}
 for(const g of sources)for(const id of g.ids)assert.ok(catalog.assets[id]);
 for(const name of ['index.html','research.html','research.js','research.css']){const s=await fs.readFile(path.join(dir,name),'utf8');assert.ok(!/https?:\/\/(localhost|127\.0\.0\.1)/.test(s),name+' 含本机入口');}
 const html=await fs.readFile(path.join(dir,'research.html'),'utf8');for(const m of html.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g))assert.ok((await fs.stat(path.join(dir,m[1]))).isFile(),m[1]);
 if(slug==='007-google-vids'){const html=await fs.readFile(path.join(dir,'actual.html'),'utf8');assert.ok(!html.includes('http://127.0.0.1'));assert.ok(html.includes('../013-model-video-studio/research.html'));}
}
console.log('发布检查通过：'+files+'项文件的哈希、9维27段摘要、六视频、资料及能力关联、相对子路径、无本机服务入口。');
