import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { data, documents, renderResearch, renderSummary } from './render-research.mjs';
const web = fileURLToPath(new URL('../',import.meta.url));
const project = path.resolve(web,'..');
export const dist = path.resolve(web,'dist-public');
if (dist !== path.join(web,'dist-public') || !dist.startsWith(web)) throw new Error('发布目录超出本项目 web。');
fs.writeFileSync(path.join(project,'notes/research-summary.md'),renderSummary(),'utf8');
const missing = documents.filter(doc=>!fs.existsSync(path.join(project,doc.path)));
if (missing.length) throw new Error('发布资料缺失：'+missing.map(d=>d.path).join('、'));
fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});
const manifest = {version:1,projectId:5,updatedAt:data.updatedAt,scope:'静态研究页、图片、笔记与固定证据；不含桃源上游构建、人物、原朗读、缓存或密钥。',items:[]};
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function copy(source,url) {
  const bytes=fs.readFileSync(path.join(project,source));
  const target=path.join(dist,url);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  manifest.items.push({source,url,bytes:bytes.length,sha256:digest(bytes)});
}
for (const doc of documents) copy(doc.path,'materials/'+doc.path);
for (const file of fs.readdirSync(path.join(project,'assets'),{recursive:true})) {
  const normalized=file.replaceAll('\\','/');
  if (/\.(png|svg|jpe?g|webp)$/i.test(normalized)) copy('assets/'+normalized,'media/'+normalized);
}
copy('web/research/research.css','research.css');copy('web/research/research.js','research.js');
const html=renderResearch();
for (const file of ['research.html','index.html']) fs.writeFileSync(path.join(dist,file),html,'utf8');
fs.writeFileSync(path.join(dist,'documents.json'),JSON.stringify(documents,null,2)+'\n','utf8');
fs.writeFileSync(path.join(dist,'manifest.json'),JSON.stringify(manifest,null,2)+'\n','utf8');
console.log(`已生成静态研究页：2 个入口、9 维摘要、${documents.length} 份阅读资料、${manifest.items.length} 项原始资源。`);
