import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.resolve(root, '_site');
const source = path.join(root, 'projects/001-sakura-crossing/web/dist');
if (destination !== path.join(root, '_site') || !destination.startsWith(root)) throw new Error('站点输出路径不合法。');
if (!fs.existsSync(path.join(source, 'research.html'))) throw new Error('请先构建 001 网页。');
fs.rmSync(destination, { force: true, recursive: true });
fs.mkdirSync(destination, { recursive: true });
fs.cpSync(source, path.join(destination, '001-sakura-crossing'), { recursive: true });
fs.writeFileSync(path.join(destination, '.nojekyll'), '');
fs.writeFileSync(path.join(destination, 'index.html'), `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./001-sakura-crossing/research.html"><title>项目研究集 · 樱花小街</title><body><h1>项目研究集</h1><p><a href="./001-sakura-crossing/research.html">进入 Sakura Crossing 完整研究与体验网页</a></p><p>能力、模块、原理、使用场景、个人价值与扩展路线。</p></body></html>`);
console.log('站点产物：_site/001-sakura-crossing/（仅 001 静态网页）。');
