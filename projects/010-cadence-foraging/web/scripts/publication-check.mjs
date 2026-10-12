import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const web=path.resolve(import.meta.dirname,'..'),dist=path.join(web,'dist-public'),project=path.resolve(web,'..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await fs.readFile(path.join(dist,'publication-manifest.json'),'utf8'));
assert.equal(manifest.sections,9);assert.equal(manifest.paragraphs,36);
const paths=new Set(manifest.files.map(f=>f.path));
for(const f of manifest.files){assert.ok(!/(^|\/)(node_modules|vendor|\.venv|\.git|\.env)(\/|$)/.test(f.path));const p=path.resolve(dist,f.path);assert.ok(p.startsWith(dist+path.sep));const b=await fs.readFile(p);assert.equal(b.length,f.bytes,f.path);assert.equal(hash(b),f.sha256,f.path);
 if(f.path.startsWith('research/')){assert.equal(hash(await fs.readFile(path.join(project,f.path.slice(9)))),f.sha256,`原资料改变：${f.path}`);continue;}
 if(/\.(html|js)$/.test(f.path)){const s=b.toString('utf8');assert.ok(!s.includes('fetch(`/api')&&!s.includes('fetch("/api'),'公开代码依赖本地API');for(const m of s.matchAll(/(?:src|href)="([^"]+)"/g)){const target=m[1];if(/^(https?:|#|\.\.\/|\$\{)/.test(target))continue;const clean=target.split(/[?#]/)[0].replace(/^\.\//,'');if(!clean||clean.includes('${'))continue; if(f.path.endsWith('.html'))assert.ok(paths.has(clean),`${f.path}缺少${clean}`);}}
}
for(const p of ['research.html','index.html','replay.html','guide.html','applications.html','fish-ep.html'])assert.ok(paths.has(p));
for(const p of ['route.html','fishing.html'])assert.ok(!paths.has(p),'实时API页不应混入静态入口');
const data=JSON.parse(await fs.readFile(path.join(project,'notes/research-summary.json'),'utf8'));
assert.equal(hash(await fs.readFile(path.join(dist,'research',data.poster))),data.posterSha256);
console.log(`发布检查通过：9主题/36段、6个入口、${manifest.files.length}项资源哈希、原图原文与计算记录一致。`);
