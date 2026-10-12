import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { research } from '../src/research-content.js';
import { renderSummary } from './research-page.mjs';
const project=fileURLToPath(new URL('../../',import.meta.url));
const dist=path.join(project,'web/dist');
const html=fs.readFileSync(path.join(dist,'research.html'),'utf8');
let links=0;
for(const match of html.matchAll(/(?:href|src|data-doc|data-image)="([^"#]+)"/g)) {
 const href=match[1];if(/^(https?:|\.\.\/)/.test(href))continue;
 const file=path.resolve(dist,href.split('#')[0]);
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))throw new Error('静态页面缺失文件：'+href);
 links++;
}
for(const c of research.cases)if(!fs.existsSync(path.join(dist,c.json)))throw new Error('原始证据缺失：'+c.json);
if(/href="http:\/\/(127\.0\.0\.1|localhost)/.test(html))throw new Error('公开页包含本机跳转。');
if(research.summary.length!==6||research.summary.some(s=>s.body.length<3))throw new Error('摘要不完整。');
if(fs.readFileSync(path.join(project,'notes/research-summary.md'),'utf8').replace(/\r\n/g,'\n')!==renderSummary())throw new Error('笔记汇总与网页不一致。');
console.log(`静态发布检查通过：${links} 个文件引用、6 类摘要、3 组原始证据，无本机跳转。`);
