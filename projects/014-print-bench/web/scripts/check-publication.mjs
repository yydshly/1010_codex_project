
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {web,project,dist,documents,images} from './build.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const summary=JSON.parse(fs.readFileSync(path.join(project,'notes/research-summary.json'),'utf8'));
const diagram=JSON.parse(fs.readFileSync(path.join(project,'assets/overview-export.json'),'utf8'));
if(summary.sections.length!==9||summary.sections.reduce((n,s)=>n+s.body.length,0)!==31||summary.modules.length!==9)throw new Error('完整摘要缺失');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const expected=new Set(['index.html','research.html','app.js','style.css',...documents.map(x=>x[1]),...images]);
for(const file of expected)if(!fs.existsSync(path.join(dist,file)))throw new Error('资源缺失：'+file);
for(const file of walk(dist)){
 const name=path.relative(dist,file).replaceAll(path.sep,'/');
 if(name==='publication-manifest.json')continue;
 if(!expected.has(name)||/(?:^|\/)(?:\.env|\.local|node_modules|credentials|sessions)(?:\/|$)/i.test(name))throw new Error('超出发布范围：'+name);
 if(!['index.html','research.html','app.js','style.css'].includes(name)){
   if(hash(fs.readFileSync(file))!==hash(fs.readFileSync(path.join(project,name))))throw new Error('源资料字节不同：'+name);
 }
}
for(const html of ['index.html','research.html']){
 const text=fs.readFileSync(path.join(dist,html),'utf8');
 for(const match of text.matchAll(/(?:href|src|data-read)="([^"]+)"/g)){
  const value=match[1];if(/^(https?:|#|data:)/.test(value)||value==='../')continue;
  const target=path.resolve(dist,value.split(/[?#]/)[0]);
  if(!target.startsWith(dist+path.sep)||!fs.existsSync(target))throw new Error('链接资源缺失：'+value);
 }
 for(const section of summary.sections)for(const paragraph of section.body){
  const escaped=paragraph.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  if(!text.includes(escaped))throw new Error('正文遗漏：'+section.title);
 }
 if((text.match(/class="summary-section"/g)||[]).length!==9||(text.match(/class="step"/g)||[]).length!==6)throw new Error('页面结构缺失');
}
const png=fs.readFileSync(path.join(dist,summary.poster)),svg=fs.readFileSync(path.join(dist,summary.posterSvg));
if(png.readUInt32BE(16)!==3600||png.readUInt32BE(20)!==10169||hash(png)!==diagram.pngSha256||hash(svg)!==diagram.svgSha256)throw new Error('既有引导图被更改');
const files=[...expected].sort().map(name=>{const bytes=fs.readFileSync(path.join(dist,name));return{path:name,bytes:bytes.length,sha256:hash(bytes)};});
fs.writeFileSync(path.join(dist,'publication-manifest.json'),JSON.stringify({schema:1,project:'014-print-bench',date:'2026-10-12',summaryTopics:9,summaryParagraphs:31,modules:9,documents:documents.length,upstream:{url:summary.upstream,revision:summary.revision,license:summary.license},poster:{path:summary.poster,width:3600,height:10169,sha256:hash(png)},files},null,2)+'\n');
console.log('发布检查通过：'+files.length+' 项资源，九主题31段、九组模块、23项原始资料；引导图及资料字节与来源一致。');
