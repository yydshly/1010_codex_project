import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../../', import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(project, 'notes/research-summary.json'), 'utf8'));
const paragraphs = data.sections.reduce((sum, s) => sum + s.body.length, 0);
const markdown = '# ' + data.title + '\n\n' + data.summary + '\n\n更新日期：' + data.date + '。固定版本：`' + data.revision + '`，' + data.version + '，上游 ' + data.license + '。真实 Jev 与摘要 API 未调用。\n\n![既有理解全景图](../' + data.poster + ')\n\n' + data.sections.map(s => '## ' + s.title + '\n\n' + s.body.join('\n\n')).join('\n\n') + '\n\n## 固定源码模块\n\n' + data.modules.map(m => '- [' + m.file + ' · ' + m.name + '](' + data.upstream + '/blob/' + data.revision + '/jevclip/' + m.file + ')：' + m.detail).join('\n') + '\n';
fs.writeFileSync(path.join(project, 'notes/research-summary.md'), markdown);
if (process.argv.includes('--catalog')) {
  const registry = fileURLToPath(new URL('../../../../projects.json', import.meta.url));
  const catalog = JSON.parse(fs.readFileSync(registry, 'utf8'));
  let entry = catalog.projects.find(p => p.id === 9);
  if (!entry) {
    entry = {id:9,slug:'jevclip',name:'Jevclip · 视频研究助手',source:data.upstream,status:'researching',tags:['视频粗剪','字幕处理','证据引用','Jev','FFmpeg'],demo:null};
    catalog.projects.push(entry);
  }
  if (entry.slug !== 'jevclip') throw new Error('项目编号 009 已被其他 slug 使用');
  entry.summary = data.summary;
  entry.summarySections = data.sections.map(({title,body}) => ({title,body}));
  entry.cover = {path:'projects/009-jevclip/' + data.poster,alt:'Jevclip 中文全景图：字幕粗剪效果、底层分工、模型调用、演示对照、个人价值、验证与扩展路线'};
  catalog.projects.sort((a,b) => a.id - b.id);
  fs.writeFileSync(registry, JSON.stringify(catalog,null,2) + '\n');
}
console.log('研究摘要同步：' + data.sections.length + ' 个主题，' + paragraphs + ' 段，' + data.modules.length + ' 组模块。');
