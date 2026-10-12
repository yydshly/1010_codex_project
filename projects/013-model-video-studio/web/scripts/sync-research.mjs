import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const web=fileURLToPath(new URL('../',import.meta.url)),project=path.resolve(web,'..'),root=path.resolve(project,'../..');
const content=JSON.parse(fs.readFileSync(path.join(web,'publication/content.json'),'utf8'));
const catalogPath=path.join(root,'projects.json'),catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
for(const id of [7,13]){
 const entry=catalog.projects.find(p=>p.id===id);if(!entry)throw new Error('项目未登记：'+id);
 entry.summary=id===7?'Google Vids 与映序的完整中文研究：既有总图引导，保留118秒AI初稿与69秒人工编辑成片，结合原创工作台的中文配音、画布时间轴和音乐混音，完整说明能力、模块、流程原理、人机分工、使用价值、介绍模板、剧情与口型扩展及验证边界。':content.summary;
 entry.summarySections=id===7?content.summarySections.filter((_,i)=>[0,1,3,4,5,6,7,8].includes(i)):content.summarySections;
 entry.cover={path:id===7?'projects/007-google-vids/assets/research-overview.png':'projects/013-model-video-studio/assets/research/research-overview.png',alt:'从 Google Vids 到映序：实际效果、模块原理、模型分工、价值、介绍模板与扩展边界；缩图为 AI 视觉参考'};
 const projectPath=path.join(root,'projects',id===7?'007-google-vids':'013-model-video-studio');
 fs.writeFileSync(path.join(projectPath,'notes/research-summary.json'),JSON.stringify({updatedAt:content.updatedAt,summary:entry.summary,sections:entry.summarySections},null,2)+'\n');
}
fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
console.log('研究摘要已同步：007 八维、013 九维；根索引正文来自相同内容源。');
