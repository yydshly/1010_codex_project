import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.resolve(root, '_site');
const published = ['001-sakura-crossing', '002-18-floors-of-mayhem'];
if (destination !== path.join(root, '_site') || !destination.startsWith(root)) throw new Error('站点输出路径不合法。');
for (const id of published) if (!fs.existsSync(path.join(root, 'projects', id, 'web/dist/research.html'))) throw new Error(`请先构建 ${id} 网页。`);
fs.rmSync(destination, { force: true, recursive: true });
fs.mkdirSync(destination, { recursive: true });
for (const id of published) fs.cpSync(path.join(root, 'projects', id, 'web/dist'), path.join(destination, id), { recursive: true });
fs.writeFileSync(path.join(destination, '.nojekyll'), '');
fs.writeFileSync(path.join(destination, 'index.html'), `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>项目研究集</title><style>body{font-family:system-ui,sans-serif;background:#f7f5ed;color:#29483d;max-width:850px;margin:70px auto;padding:25px;line-height:1.9}a{color:inherit}article{padding:25px 0;border-top:1px solid #d5ddcf}small{color:#64746b}</style></head><body><small>RESEARCH COLLECTION · 已验证的静态研究网页</small><h1>把研究，变成下一次创作的起点。</h1><article><h2><a href="./001-sakura-crossing/research.html">001 · Sakura Crossing 场景研究</a></h2><p>动画风格、场景模块、天气漫游、内容交互与产品复用。</p></article><article><h2><a href="./002-18-floors-of-mayhem/research.html">002 · 从像素游戏到 AI 世界</a></h2><p>玩法、模块、决策原理、真实模型对照、机甲与小镇扩展、价值与路线。</p></article><p>页面保留实际证据和验证边界；本机模型后端不随静态网页公开。</p></body></html>`);
console.log('站点产物：_site/001-sakura-crossing/ 与 _site/002-18-floors-of-mayhem/。');
