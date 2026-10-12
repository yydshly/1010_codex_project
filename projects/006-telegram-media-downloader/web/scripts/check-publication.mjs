import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const web = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(web, 'dist');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const data = JSON.parse(fs.readFileSync(path.join(dist,'docs/understanding-summary.json'),'utf8'));
if (data.sections.length !== 9 || data.sections.reduce((n,s)=>n+s.body.length,0) !== 27 || data.modules.length !== 9) throw new Error('完整摘要数量不匹配');
const png = fs.readFileSync(path.join(dist, data.poster));
if (png.readUInt32BE(16) !== 3840 || png.readUInt32BE(20) !== 2880) throw new Error('引导图尺寸异常');
const sourceHash = hash(fs.readFileSync(path.join(dist,'experiments/telegram-media-downloader.user.js')));
if (sourceHash !== '80167ae47412eba6030c470a387e4e3e546e3b7a663e99b8dac92cb7d1d30ecf') throw new Error('固定源码被修改');
for (const html of ['index.html','research.html']) {
  const text = fs.readFileSync(path.join(dist,html),'utf8');
  for (const match of text.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(?:https?:|#|data:)/.test(value)) continue;
    const target = path.resolve(dist, value.split(/[?#]/)[0]);
    if (!target.startsWith(dist + path.sep) || !fs.existsSync(target)) throw new Error(`资源缺失 ${html}: ${value}`);
  }
  if (!text.includes('已停止继续测试') || !text.includes('id="complete-summary"') || !text.includes('id="module-map"')) throw new Error('汇总内容缺失');
}
for (const file of walk(dist)) {
  if (/(?:node_modules|vendor|\.env|\.log$|credentials|session)/i.test(path.relative(dist,file))) throw new Error('发布内容超出静态资料范围');
}
const files = walk(dist).filter(f => !f.endsWith('publication-manifest.json')).map(f => {
  const bytes = fs.readFileSync(f);
  return {path:path.relative(dist,f).replaceAll(path.sep,'/'),bytes:bytes.length,sha256:hash(bytes)};
});
fs.writeFileSync(path.join(dist,'publication-manifest.json'), JSON.stringify({schema:1,project:'006-telegram-media-downloader',summaryTopics:9,summaryParagraphs:27,modules:9,poster:{path:data.poster,width:3840,height:2880,sha256:hash(png)},upstream:{revision:data.revision,version:data.version,license:data.license,sha256:sourceHash},files},null,2)+'\n');
console.log(`发布检查通过：${files.length} 项资源、九主题27段、九组模块、引导图与固定源码哈希正确。`);
