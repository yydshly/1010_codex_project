
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const project=fileURLToPath(new URL('../../',import.meta.url));
const data=JSON.parse(fs.readFileSync(project+'notes/research-summary.json','utf8'));
const text='# '+data.title+'\n\n'+data.summary+'\n\n更新日期：'+data.date+'。静态研究与证据汇总，AI 修改模型流程尚未接入。\n\n![原样保留的理解总图](../'+data.poster+')\n\n'+data.sections.map(s=>'## '+s.title+'\n\n'+s.body.join('\n\n')).join('\n\n')+'\n\n## 固定源码模块\n\n'+data.modules.map(m=>'- ['+m.title+']('+data.upstream+'/'+(m.type||'blob')+'/'+data.revision+'/'+m.path+')：'+m.role).join('\n')+'\n';
fs.writeFileSync(project+'notes/research-summary.md',text);
if(process.argv.includes('--catalog')){
 const registry=fileURLToPath(new URL('../../../../projects.json',import.meta.url));
 const catalog=JSON.parse(fs.readFileSync(registry,'utf8')),item=catalog.projects.find(x=>x.id===14);
 if(!item||item.slug!=='print-bench')throw new Error('缺少固定项目 014');
 item.summary=data.summary;item.summarySections=data.sections.map(({title,body})=>({title,body}));
 item.cover={path:'projects/014-print-bench/'+data.poster,alt:'print-bench 完整研究引导图：模型效果、六步执行链、真实修复、价值、适用场景、现有项目和扩展'};
 fs.writeFileSync(registry,JSON.stringify(catalog,null,2)+'\n');
}
console.log('完整摘要同步：'+data.sections.length+' 主题、'+data.sections.reduce((n,s)=>n+s.body.length,0)+' 段。');
