import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
const{values}=parseArgs({options:{root:{type:'string'}}});
const project=fileURLToPath(new URL('../../',import.meta.url)),root=values.root?path.resolve(values.root):path.resolve(project,'../..');
const data=JSON.parse(await fs.readFile(path.join(project,'notes/research-summary.json'),'utf8'));
const catalogFile=path.join(root,'projects.json'),catalog=JSON.parse(await fs.readFile(catalogFile,'utf8'));
let entry=catalog.projects.find(x=>x.id===8);
if(!entry){entry={id:8,slug:'pdoom-video',name:'PDoomVideo · 可编程动画与 MV 工具研究',source:data.upstream,status:'researching',demo:null};catalog.projects.push(entry);}
if(entry.slug!=='pdoom-video')throw Error('008 编号已被占用');
Object.assign(entry,{summary:data.summary,summarySections:data.sections.map(({title,body})=>({title,body})),tags:['程序化角色','音乐 MV','结构化分镜','时间与节拍','本地工具'],cover:{path:'projects/008-pdoom-video/assets/pdoom-mv-overview.png',alt:'PDoomVideo 与纸间 MV 中文总览：源库效果、模块与时间节拍原理、本地成片、价值和扩展路线'}});
catalog.projects.sort((a,b)=>a.id-b.id);await fs.writeFile(catalogFile,JSON.stringify(catalog,null,2)+'\n');
const assembler=path.join(root,'scripts/assemble-site.mjs');
let a=await fs.readFile(assembler,'utf8');
if(!a.includes("'008-pdoom-video'")){
 a=a.replace(/const published = \[(.*?)\];/,(_,body)=>{const ids=[...body.matchAll(/'([^']+)'/g)].map(x=>x[1]);ids.push('008-pdoom-video');return 'const published = ['+ids.sort().map(id=>"'"+id+"'").join(', ')+'];'});
}
a=a.replace(/const outputFor = id => \[(.*?)\]\.includes\(id\)/,(_,body)=>{const ids=[...body.matchAll(/'([^']+)'/g)].map(x=>x[1]);if(!ids.includes('008-pdoom-video'))ids.push('008-pdoom-video');return 'const outputFor = id => ['+ids.sort().map(id=>"'"+id+"'").join(',')+'].includes(id)';});
if(!a.includes('008 · 让角色成为音乐的主角')){
 const i=a.indexOf('014 · 从 Issue');const insert=i>=0?a.lastIndexOf('<article>',i):a.indexOf('<p>页面保留实际证据');
 if(insert<0)throw Error('站点首页插入位置不匹配');
 const card='<article><h2><a href="./008-pdoom-video/research.html">008 · 让角色成为音乐的主角</a></h2><a href="./008-pdoom-video/research.html"><img src="./008-pdoom-video/assets/pdoom-mv-overview.png" alt="PDoomVideo 与纸间 MV 能力、模块、原理、真实探索、价值和扩展总览" width="280" loading="lazy" style="max-width:100%;height:220px;object-fit:cover;object-position:top"></a><p>以既有总览图引导，完整九主题37段摘要、九组模块、时间与节拍原理、原作和本地工具对照、15秒/720p与30秒/1080p真实成片、三画风、21份资料，以及使用价值与扩展路线。音乐分析、真实模型实测、图片角色绑定与口型待扩展；创作服务保留在本机。</p></article>';
 a=a.slice(0,insert)+card+a.slice(insert);
}
await fs.writeFile(assembler,a);
const workflow=path.join(root,'.github/workflows/pages.yml');
let w=await fs.readFile(workflow,'utf8');
if(!w.includes("      - 'projects/008-pdoom-video/**'")){
 const marker="      - 'projects/013-model-video-studio/**'";
 if(!w.includes(marker))throw Error('工作流路径插入位置不匹配');
 w=w.replace(marker,"      - 'projects/008-pdoom-video/**'\n"+marker);
}
if(!w.includes('working-directory: projects/008-pdoom-video/web')){
 const marker='      - name: Verify studio and build Vids research publication';
 if(!w.includes(marker))throw Error('工作流构建插入位置不匹配');
 w=w.replace(marker,'      - name: Verify local MV tool and build PDoomVideo research\n        run: npm ci && npm test && npm run build && npm run build:research && npm run publication:check\n        working-directory: projects/008-pdoom-video/web\n'+marker);
}
await fs.writeFile(workflow,w);
const guide=path.join(root,'docs/web-deployment.md');let g=await fs.readFile(guide,'utf8');
if(!g.includes('## 2026-10-12 · 008 PDoomVideo')){
 const first=g.indexOf('\n');
 const intro='\n\n## 2026-10-12 · 008 PDoomVideo 与纸间 MV 研究发布接入\n\n沿用已生成的 1024×1536 中文总览图作为首页引导，统一九主题37段完整摘要、九组模块、六步执行链、源库原图、本地工具截图、三画风和两支可播放真实成片。21份研究、实现、实验、工程示例和 MIT 资料可页内阅读及下载；源库能力、本地验证与产品目标分别标注。\n\n静态产物位于 projects/008-pdoom-video/web/dist-public/，固定路径 008-pdoom-video/research.html，index.html 为同页别名。执行子项目 npm ci、npm test、npm run build、npm run build:research 和 npm run publication:check，再执行根 npm run catalog:sync、npm run check、npm run site:assemble。预生成引导图原样发布，CI不调用图片生成或真实模型。逐文件白名单与 SHA-256 清单保护原图、原文和样片；影片规格与完整解码重新核验。\n\n公开静态研究与原创样片；参数化创作、音乐上传、模型请求、Chrome逐帧和ffmpeg编码仍通过本地服务运行。上游歌曲不随网站发布，动作改编保留 MIT。只有实际线上 HTTP、资源哈希与浏览器验收完成后才登记公开入口，结果保存在008的发布记录。\n';
 g=g.slice(0,first)+intro+g.slice(first);
}
await fs.writeFile(guide,g);
console.log('008 已接入登记表、Pages 工作流、站点组装与发布说明，保留已有项目。');
