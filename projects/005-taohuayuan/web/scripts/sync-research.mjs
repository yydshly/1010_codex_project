import { readFileSync, writeFileSync } from 'node:fs';
import { data, renderSummary } from './render-research.mjs';
writeFileSync(new URL('../../notes/research-summary.md', import.meta.url), renderSummary(), 'utf8');
const registryUrl = new URL('../../../../projects.json', import.meta.url);
const registry = JSON.parse(readFileSync(registryUrl,'utf8'));
let item = registry.projects.find(p=>p.id===5);
if (!item) { item={id:5,slug:'taohuayuan',name:'桃源 · 豁然开朗',source:data.source.url,status:'researching',tags:['Three.js','文学叙事','程序化场景','镜头导览'],cover:{path:'projects/005-taohuayuan/assets/research-overview.png',alt:'005 桃源中文研究总览：原版桃林与山洞揭示、统一时间线原理、001 语音导览扩展、复用价值与后续方向'},demo:null};registry.projects.push(item);registry.projects.sort((a,b)=>a.id-b.id); }
item.summary=data.summary;
item.summarySections=data.sections.map(({title,labels,body})=>({title,labels,body}));
writeFileSync(registryUrl,JSON.stringify(registry,null,2)+'\n','utf8');
console.log('已同步 005 的九维完整摘要与项目登记，运行根 catalog:sync 更新生成索引。');
