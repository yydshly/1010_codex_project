import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const web = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const project = path.resolve(web,'..');
const destination = path.resolve(web,'dist');
if (destination !== path.join(web,'dist') || !destination.startsWith(web+path.sep)) throw new Error('构建目录必须为本项目 web/dist。');
const library = JSON.parse(fs.readFileSync(path.join(web,'data/library.json'),'utf8'));
const content = JSON.parse(fs.readFileSync(path.join(project,'notes/research-summary.json'),'utf8'));
const files=[];
function copy(source, relative) {
  const target=path.resolve(destination,relative);
  if (!target.startsWith(destination+path.sep)) throw new Error(`产物路径越界：${relative}`);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(source,target);
  files.push(relative);
}
fs.rmSync(destination,{force:true,recursive:true});
fs.mkdirSync(destination,{recursive:true});
for (const file of ['index.html','research.html','styles.css','research.css','app.js','lab.js','research.js','data/evidence.json','data/library.json']) copy(path.join(web,file),file);
for (const file of ['upstream-teaser.svg','UPSTREAM-LICENSE.txt','research-overview.png','research-overview.svg','research-overview-preview.png','showcase-desktop.png','lab-door.png','lab-drawer.png']) copy(path.join(project,'assets',file),`assets/${file}`);
for (const file of library) copy(path.join(project,file.source),file.url);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const verificationFile=path.join(project,'notes/publication-verification.json');
const publication={
  contentDate:content.date,
  scope:'静态研究与原创原理示意；没有 GPU 推理、模型后台或机器人执行。',
  verification:fs.existsSync(verificationFile)?JSON.parse(fs.readFileSync(verificationFile,'utf8')):{status:'awaiting-online-verification',note:'产物已生成；正式部署和线上验收待记录。'},
  counts:{topics:content.sections.length,paragraphs:content.sections.reduce((n,s)=>n+s.body.length,0),modules:content.modules.length,documents:library.length},
  upstream:JSON.parse(fs.readFileSync(path.join(web,'data/evidence.json'),'utf8')).upstream,
  guide:{pngSHA256:hash(path.join(project,'assets/research-overview.png')),svgSHA256:hash(path.join(project,'assets/research-overview.svg'))}
};
fs.writeFileSync(path.join(destination,'research/publication.json'),JSON.stringify(publication,null,2)+'\n');
files.push('research/publication.json');
const manifest={version:1,files:files.sort().map(file=>({path:file,bytes:fs.statSync(path.join(destination,file)).size,sha256:hash(path.join(destination,file))}))};
fs.writeFileSync(path.join(destination,'publication-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`构建完成：${files.length+1}个静态文件（含逐文件清单），两个页面，原图与原资料字节保留。`);
