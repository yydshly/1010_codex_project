import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {researchCatalog,resolveResearchFile} from '../lib/research.mjs';
import './sync-research.mjs';
const web=fileURLToPath(new URL('../',import.meta.url)),project=path.resolve(web,'..'),root=path.resolve(project,'../..');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const catalog=await researchCatalog();
const extra=[
 ['publication-scope','公开范围与素材说明','notes/publication-scope.json'],
 ['research-summary','映序完整研究摘要','notes/research-summary.json'],
 ['research-guide','本机研究指南与验证','notes/research-guide.md'],
 ['overview-verification','总图核验与浏览器验证边界','assets/research/overview-verification.json'],
 ['overview-prompt','引导图生成提示词','assets/research/overview-prompt.txt'],
 ['google-summary','Google Vids 完整研究摘要','../007-google-vids/notes/research-summary.json'],
 ['google-notes','Google Vids 研究笔记','../007-google-vids/notes/README.md'],
 ['google-verification','Google Vids 观看与操作验证','../007-google-vids/notes/verification.md'],
 ['google-prompt','Google Vids 实际生成提示词','../007-google-vids/notes/production-prompt.txt'],
 ['google-outline','Google Vids 实际 AI 大纲','../007-google-vids/notes/ai-outline.txt'],
 ['google-narration','Google Vids 成片英文脚本','../007-google-vids/notes/final-ai-narration.txt'],
 ['google-edits','Google Vids 六处标题修改','../007-google-vids/notes/applied-title-edits.json'],
 ['google-observation','Google Vids 单次生成观察','../007-google-vids/notes/generation-observation.json']
];
for(const [id,title,file] of extra){const full=path.resolve(project,file),s=await fs.stat(full);catalog.assets[id]={title,type:file.endsWith('.json')?'json':'document',available:true,bytes:s.size};}
catalog.additional=extra.filter(([id])=>!['publication-scope','research-summary'].includes(id)).map(([id])=>id);
const extraPath=new Map(extra.map(([id,,file])=>[id,path.resolve(project,file)]));
for(const [slug,variant] of [['007-google-vids','google'],['013-model-video-studio','studio']]){
 const projectDir=path.join(root,'projects',slug),projectWeb=path.join(projectDir,'web'),dist=path.resolve(projectWeb,'dist-public');
 if(dist!==path.join(projectWeb,'dist-public')||!dist.startsWith(projectWeb+path.sep))throw new Error('发布目录越界');
 await fs.rm(dist,{recursive:true,force:true});await fs.mkdir(dist,{recursive:true});
 const manifest={version:1,project:slug,scope:'只读研究、已授权研究作品与必要证据；无模型调用、密钥、存档或本机后端',items:[]};
 const write=async(url,bytes,source='generated')=>{const target=path.resolve(dist,url);if(!target.startsWith(dist+path.sep))throw new Error('资源路径越界');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);manifest.items.push({source,url,bytes:Buffer.byteLength(bytes),sha256:digest(bytes)});};
 const copy=async(src,url)=>write(url,await fs.readFile(src),path.relative(root,src).replaceAll('\\','/'));
 const deployed=structuredClone(catalog);deployed.variant=variant;
 // File-stat completion order differs across platforms; keep the publication reproducible.
 deployed.assets=Object.fromEntries(Object.entries(deployed.assets).sort(([a],[b])=>a.localeCompare(b,'en')));
 for(const [id,item] of Object.entries(deployed.assets)){
  if(!item.available)throw new Error('资料缺失：'+id);
  const source=extraPath.get(id)||await resolveResearchFile(id);if(!source)throw new Error('白名单中缺少路径：'+id);
  const dest='media/'+id+path.extname(source);await copy(source,dest);item.url='./'+dest;
 }
 for(const name of ['research.html','research.css','research.js','content.json'])await copy(path.join(web,'publication',name),name);
 await copy(path.join(web,'publication/research.html'),'index.html');await copy(path.join(web,'public/research-data.js'),'research-data.js');
 await write('catalog.json',JSON.stringify(deployed,null,2)+'\n');
 if(variant==='google'){
  const base=path.join(root,'projects/007-google-vids');
  for(const name of ['index.html','styles.css','app.js','data.js','actual.html','actual.css','actual.js']){
   let text=await fs.readFile(path.join(base,'web',name),'utf8');
   if(name.endsWith('.html')){text=text.replaceAll('http://127.0.0.1:4323/#research/overview','../013-model-video-studio/research.html').replaceAll('./index.html','./official.html').replaceAll('本机预览 · 未部署','公开研究作品').replaceAll('仅本机运行，尚未部署','已作为静态研究公开').replaceAll('本机研究','研究记录');text=text.replace('<main>','<main><p class="production-banner"><a href="./research.html">← 返回完整研究：能力、模块、原理、价值与扩展</a></p>');}
   await write(name==='index.html'?'official.html':name,text,path.relative(root,path.join(base,'web',name)).replaceAll('\\','/'));
  }
  for(const name of await fs.readdir(path.join(base,'assets'))){if(/\.(jpe?g|png|webp)$/i.test(name))await copy(path.join(base,'assets',name),'assets/'+name);}
  for(const name of await fs.readdir(path.join(base,'assets/actual-production'))){if(/\.(jpe?g|png|mp4|vtt)$/i.test(name))await copy(path.join(base,'assets/actual-production',name),'assets/actual-production/'+name);}
 }
 await fs.writeFile(path.join(dist,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(slug+'：'+manifest.items.length+'项文件，'+Object.keys(deployed.assets).length+'份资料，研究入口 research.html。');
}
