import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../../', import.meta.url));
const data = JSON.parse(fs.readFileSync(project + 'notes/understanding-summary.json', 'utf8'));
const prose = data.sections.map(s => `## ${s.title}\n\n${s.body.join('\n\n')}`).join('\n\n');
fs.writeFileSync(project + 'notes/understanding-summary.md', `# ${data.title}\n\n${data.summary}\n\n更新日期：${data.date}。这是研究汇总，用户已取消继续真实 Telegram 下载实测。\n\n![既有理解总图](../${data.poster})\n\n${prose}\n\n## 固定源码模块位置\n\n${data.modules.map(m => `- [${m.title} · ${m.lines}](${data.upstream}/blob/${data.revision}/${data.sourceFile}${m.anchor})：${m.detail}`).join('\n')}\n\n上游 ${data.revision} · ${data.version} · ${data.license}。\n`);
if (process.argv.includes('--catalog')) {
  const registry = fileURLToPath(new URL('../../../../projects.json', import.meta.url));
  const catalog = JSON.parse(fs.readFileSync(registry, 'utf8'));
  const entry = catalog.projects.find(p => p.id === 6);
  if (!entry) throw new Error('缺少固定项目 006');
  entry.summary = data.summary;
  entry.summarySections = data.sections.map(({title,body}) => ({title,body}));
  entry.cover = {path:'projects/006-telegram-media-downloader/' + data.poster,alt:'Telegram 媒体下载器理解总图：能力、效果、九组模块、双路径原理、价值、限制与五阶段扩展'};
  fs.writeFileSync(registry, JSON.stringify(catalog, null, 2) + '\n');
}
console.log(`研究摘要同步：${data.sections.length} 个主题、${data.sections.reduce((n,s)=>n+s.body.length,0)} 段正文、${data.modules.length} 个逻辑模块。`);
