import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=fileURLToPath(new URL('../../',import.meta.url));
const root=path.resolve(project,'../..');
const d=JSON.parse(await fs.readFile(path.join(project,'notes/research-summary.json'),'utf8'));
const md='# '+d.title+'\n\n研究日期：'+d.date+'。源库能力、本地验证与规划分别说明。\n\n**'+d.thesis+'**\n\n'+d.sections.map(s=>'## '+s.title+'\n\n'+s.body.join('\n\n')).join('\n\n')+'\n\n## 原始资料\n\n[能力研究](research.md) · [本地实现与实测](local-tool.md) · [总览图与提示词](overview-poster.md) · [上游来源](../UPSTREAM.md) · [本地运行](../web/README.md)\n';
await fs.writeFile(path.join(project,'notes/research-summary.md'),md);
if(process.argv.includes('--catalog')){
 const p=path.join(root,'projects.json');const c=JSON.parse(await fs.readFile(p,'utf8'));
 const entry=c.projects.find(x=>x.id===8);if(!entry||entry.slug!=='pdoom-video')throw Error('008 登记条目不匹配');
 entry.summary=d.summary;entry.summarySections=d.sections.map(({title,body})=>({title,body}));
 entry.cover={path:'projects/008-pdoom-video/assets/pdoom-mv-overview.png',alt:'PDoomVideo 与纸间 MV 中文总览：源库效果、模块与时间节拍原理、本地成片、价值和扩展路线'};
 entry.tags=['程序化角色','音乐 MV','结构化分镜','时间与节拍','本地工具'];
 await fs.writeFile(p,JSON.stringify(c,null,2)+'\n');
}
console.log('008 完整中文摘要已同步；九主题内容共用结构化来源。');
