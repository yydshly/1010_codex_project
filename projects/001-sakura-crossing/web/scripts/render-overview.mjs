// Deterministic Chinese research poster. SVG generation uses only Node built-ins.
// Optional PNG export: --png --sharp-module <absolute path to a sharp package>.
import { readFile, writeFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const data = JSON.parse(await readFile(new URL('../../notes/overview-content.json', import.meta.url), 'utf8'));
const assetUrl = (file) => new URL('../../assets/' + file, import.meta.url);
const W = 1920, M = 56, GAP = 24, INNER = W - M * 2;
const colors = { ink: '#2c4036', muted: '#64756a', line: '#dbded0', paper: '#f7f4eb', card: '#fffdf7', source: '#686584', verified: '#476d56', planned: '#956859' };
const pale = { source: '#eeedf4', verified: '#edf2e7', planned: '#f5ebe4' };
const E = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const elements = []; let unique = 0, cursor = 0;
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
requireValue(data.version === 1 && data.capabilities.length === 3 && data.pipeline.length === 6 && data.directions.length === 8 && data.values.length === 4 && data.boundaries.length === 3, '总览内容结构发生变化，请调整排版');
for (const note of data.evidenceNotes) await access(new URL('../../notes/' + note, import.meta.url));
requireValue(/^[a-f0-9]{40}$/.test(data.source.commit), '上游版本必须固定');
const uris = new Map();
async function imageUri(file) {
  if (!uris.has(file)) { const bytes = await readFile(assetUrl(file)); uris.set(file, `data:image/${file.endsWith('.png') ? 'png' : 'jpeg'};base64,${bytes.toString('base64')}`); }
  return uris.get(file);
}
const rect = (x, y, w, h, fill = colors.card, stroke = colors.line, radius = 18) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="1.4"` : ''}/>`;
function wrap(value, width, size) {
  const units = (s) => [...s].reduce((n, char) => n + (char.charCodeAt(0) > 255 ? 1 : char === ' ' ? .3 : /[ilI.,:;!|]/.test(char) ? .3 : /[MW@]/.test(char) ? .88 : .58), 0);
  const rawTokens = String(value).match(/[A-Za-z0-9_./:+×−→-]+|\s+|[^\x00-\x7F]|./g) || [];
  const tokens = [];
  for (const token of rawTokens) {
    if (/^[，。、；：？！）】”’!?.,;%]+$/.test(token) && tokens.length) tokens[tokens.length - 1] += token;
    else tokens.push(token);
  }
  const lines = []; let line = '';
  for (const token of tokens) {
    if (line && units(line + token) * size > width * .97) { lines.push(line.trimEnd()); line = token.trimStart(); }
    else line += token;
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}
function block(value, x, y, width, size = 24, fill = colors.ink, weight = 400, lineHeight = size * 1.45) {
  const lines = wrap(value, width, size);
  const svg = `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" data-max-width="${width}">${lines.map((line, i) => `<tspan x="${x}" dy="${i ? lineHeight : 0}">${E(line)}</tspan>`).join('')}</text>`;
  return { svg, height: lines.length * lineHeight, lines: lines.length };
}
const txt = (value, x, y, width, size = 24, fill = colors.ink, weight = 400) => block(value, x, y, width, size, fill, weight).svg;
function tag(text, x, y, kind, size = 19) {
  const width = Math.min(480, [...text].reduce((n, char) => n + (char.charCodeAt(0) > 255 ? 1 : .58), 0) * size + 36);
  return rect(x, y - 22, width, 31, pale[kind], null, 15) + txt(text, x + 14, y, width - 22, size, colors[kind], 500);
}
function section(index, title, note) {
  elements.push(`<line x1="${M}" y1="${cursor}" x2="${W - M}" y2="${cursor}" stroke="${colors.line}" stroke-width="2"/>`);
  cursor += 50;
  elements.push(`<circle cx="${M + 20}" cy="${cursor - 10}" r="20" fill="#476d56"/>` + txt(index, M + 8, cursor - 3, 34, 20, '#fffdf7', 600) + txt(title, M + 54, cursor, INNER - 60, 34, colors.ink, 600));
  if (note) { cursor += 37; const b = block(note, M + 54, cursor, INNER - 80, 22, colors.muted); elements.push(b.svg); cursor += b.height - 22; }
  cursor += 37;
}
function framed(x, y, w, h, body) { return `<g data-frame="true" data-x="${x}" data-y="${y}" data-width="${w}" data-height="${h}">${rect(x, y, w, h)}${body}</g>`; }
function capability(item, x, y, w) {
  let dy = 38, body = txt(item.title, x + 26, y + dy, w - 52, 29, colors.ink, 600);
  dy += 37; body += tag(item.tag, x + 26, y + dy, item.kind); dy += 42;
  for (const point of item.points) {
    const b = block(point, x + 46, y + dy, w - 74, 24);
    body += `<circle cx="${x + 29}" cy="${y + dy - 8}" r="3.5" fill="${colors[item.kind]}"/>` + b.svg;
    dy += b.height + 15;
  }
  const n = block(item.note, x + 26, y + dy + 5, w - 52, 21, colors.muted); body += n.svg;
  return { body, height: dy + n.height + 21 };
}
const banner = await imageUri(data.illustration.file);
elements.push(`<defs><linearGradient id="title-wash"><stop offset="0" stop-color="${colors.paper}"/><stop offset=".42" stop-color="${colors.paper}" stop-opacity=".97"/><stop offset=".7" stop-color="${colors.paper}" stop-opacity="0"/></linearGradient><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10" fill="none" stroke="#92a284" stroke-width="1.5"/></marker></defs>`);
elements.push(`<image href="${banner}" x="0" y="0" width="${W}" height="340" preserveAspectRatio="xMidYMid slice"/>`);
elements.push(`<rect width="${W}" height="340" fill="url(#title-wash)"/>`);
elements.push(txt('001 / 研究收束 · ' + data.updatedAt, M, 58, 700, 22, colors.muted, 500));
elements.push(txt(data.title, M, 151, 1160, 66, colors.ink, 600));
elements.push(txt(data.subtitle, M, 211, 1200, 35, colors.ink, 500));
elements.push(txt(data.position, M, 263, 1200, 24, colors.muted));
elements.push(rect(W - 440, 292, 390, 38, colors.paper, null, 19), txt(data.illustration.kind, W - 426, 318, 367, 18, colors.muted));
cursor = 383;
elements.push(txt(data.thesis, M, cursor, INNER, 32, colors.ink, 500)); cursor += 60;
elements.push(tag('上游源码 / 发布图', M, cursor, 'source'), tag('本地实现 / 已验证', M + 380, cursor, 'verified'), tag('产品设想 / 待扩展', M + 770, cursor, 'planned'));
elements.push(txt('用标签判断成熟度，避免把效果参考当成完整产品。', M + 1170, cursor, 630, 21, colors.muted)); cursor += 40;

section('01', '这个库的能力是什么？', '完整创意作品提供方法与场景基础；我们的实验将它们拆成可复用、可操作的样例。');
const cw = (INNER - GAP * 2) / 3;
const caps = data.capabilities.map((item, i) => capability(item, M + i * (cw + GAP), cursor, cw));
const capHeight = Math.max(...caps.map((item) => item.height));
caps.forEach((item, i) => elements.push(framed(M + i * (cw + GAP), cursor, cw, capHeight, item.body)));
cursor += capHeight + 40;

section('02', '原理是什么？真实 3D → 动画背景', '三渲二由多层共同形成。造型与构图也要设计；仅套上一个材质不能保证相同效果。');
const pw = (INNER - GAP * 5) / 6;
const steps = data.pipeline.map((item, i) => {
  const x = M + i * (pw + GAP), y = cursor;
  const b = block(item.text, x + 18, y + 103, pw - 36, 22);
  const body = txt(String(i + 1).padStart(2, '0'), x + 18, y + 31, 80, 20, colors.verified, 600) + txt(item.title, x + 18, y + 65, pw - 36, 27, colors.ink, 600) + b.svg;
  return { x, body, height: 103 + b.height + 12 };
});
const stepHeight = Math.max(...steps.map((item) => item.height));
steps.forEach((item, i) => { elements.push(framed(item.x, cursor, pw, stepHeight, item.body)); if (i < 5) elements.push(`<path d="M${item.x + pw + 3} ${cursor + 83}h${GAP - 7}" stroke="#92a284" fill="none" stroke-width="2" marker-end="url(#arrow)"/>`); });
cursor += stepHeight + 22;
const aw = (INNER - GAP) / 2;
const principles = data.principles.map((item, i) => { const x = M + i * (aw + GAP); const b = block(item.text, x + 25, cursor + 76, aw - 50, 24); return { x, height: 76 + b.height + 12, body: txt(item.title, x + 25, cursor + 36, aw - 50, 27, colors.ink, 600) + b.svg }; });
const principleHeight = Math.max(...principles.map((item) => item.height));
principles.forEach((item) => elements.push(framed(item.x, cursor, aw, principleHeight, item.body))); cursor += principleHeight + 40;

section('03', '画面证据：源库效果 → 我们的扩展', '左侧为作者发布图；右侧为本地真实 WebGL 截图的场景局部。顶部插画仅作概念配景。');
const sourceW = 760, rightX = M + sourceW + GAP, localW = (INNER - sourceW - GAP * 2) / 2;
const evidenceH = 596, localH = (evidenceH - 20) / 2;
let sourceBody = tag('上游发布图', M + 22, cursor + 33, 'source');
sourceBody += `<image href="${await imageUri('upstream-crossing.jpg')}" x="${M + 18}" y="${cursor + 57}" width="${sourceW - 36}" height="407" preserveAspectRatio="xMidYMid meet"/>`;
sourceBody += txt(data.evidence.sourceCaption, M + 22, cursor + 496, sourceW - 44, 25, colors.ink, 600);
sourceBody += txt(data.evidence.sourceNote, M + 22, cursor + 531, sourceW - 44, 20, colors.muted);
elements.push(framed(M, cursor, sourceW, evidenceH, sourceBody));
for (const [i, item] of data.evidence.locals.entries()) {
  const x = rightX + i % 2 * (localW + GAP), y = cursor + Math.floor(i / 2) * (localH + 20), id = 'scene-clip-' + unique++;
  const [cx, cy, cropW, cropH] = item.crop;
  const body = txt(item.title, x + 18, y + 32, localW - 36, 24, colors.ink, 600)
    + `<svg x="${x + 16}" y="${y + 48}" width="${localW - 32}" height="174" viewBox="${cx} ${cy} ${cropW} ${cropH}" preserveAspectRatio="xMidYMid meet"><defs><clipPath id="${id}"><rect x="${cx}" y="${cy}" width="${cropW}" height="${cropH}"/></clipPath></defs><image href="${await imageUri(item.file)}" x="0" y="0" clip-path="url(#${id})"/></svg>`
    + txt('已验证 · ' + item.text, x + 18, y + 252, localW - 36, 21, colors.verified);
  elements.push(framed(x, y, localW, localH, body));
}
cursor += evidenceH + 40;

section('04', '使用场景与可扩展方向', '七条产品方向＋一种视觉素材复用方式。扩展项说明继续做产品需要补什么。');
const dw = (INNER - GAP * 3) / 4;
for (let row = 0; row < 2; row++) {
  const items = data.directions.slice(row * 4, row * 4 + 4).map((item, i) => {
    const x = M + i * (dw + GAP); let dy = 39;
    let body = txt(item.title, x + 22, cursor + dy, dw - 44, 26, colors.ink, 600); dy += 39;
    body += tag(item.status, x + 22, cursor + dy, item.kind, 18); dy += 43;
    const use = block('用途：' + item.use, x + 22, cursor + dy, dw - 44, 23); body += use.svg; dy += use.height + 17;
    const next = block('扩展：' + item.next, x + 22, cursor + dy, dw - 44, 22, colors.muted); body += next.svg; dy += next.height + 16;
    return { x, height: dy, body };
  });
  const rowHeight = Math.max(...items.map((item) => item.height));
  items.forEach((item) => elements.push(framed(item.x, cursor, dw, rowHeight, item.body))); cursor += rowHeight + 22;
}
const aiBlock = block(data.ai, M + 24, cursor + 36, INNER - 48, 23, colors.planned);
elements.push(rect(M, cursor, INNER, aiBlock.height + 41, pale.planned, null, 12), aiBlock.svg); cursor += aiBlock.height + 79;

section('05', '对你的价值：把研究成果变成下一次创作的起点', '最贴近研究集的用途是内容小镇；可直接沿用的创作底座是最小搭建器。');
const values = data.values.map((item, i) => { const x = M + i * (dw + GAP); const b = block(item.text, x + 22, cursor + 84, dw - 44, 24); return { x, height: 84 + b.height + 14, body: txt('0' + (i + 1), x + 22, cursor + 30, dw - 44, 18, colors.verified, 600) + txt(item.title, x + 22, cursor + 56, dw - 44, 28, colors.ink, 600) + b.svg }; });
const valueHeight = Math.max(...values.map((item) => item.height));
values.forEach((item) => elements.push(framed(item.x, cursor, dw, valueHeight, item.body))); cursor += valueHeight + 25;
const inventory = block(data.inventory, M, cursor + 24, INNER, 24, colors.muted); elements.push(inventory.svg); cursor += inventory.height + 33;
const nextStep = block(data.nextStep, M + 25, cursor + 42, INNER - 50, 28, '#fffdf7', 500);
elements.push(rect(M, cursor, INNER, nextStep.height + 53, colors.verified, null, 14), nextStep.svg); cursor += nextStep.height + 92;

section('06', '复用前记住的边界', '原理、效果、操作验证与商业价值分别看，避免从画面推出尚未证实的结论。');
const limits = data.boundaries.map((item, i) => { const x = M + i * (cw + GAP); const b = block(item.text, x + 25, cursor + 80, cw - 50, 23, colors.muted); return { x, height: 80 + b.height + 15, body: txt(item.title, x + 25, cursor + 39, cw - 50, 27, colors.ink, 600) + b.svg }; });
const limitHeight = Math.max(...limits.map((item) => item.height));
limits.forEach((item) => elements.push(framed(item.x, cursor, cw, limitHeight, item.body))); cursor += limitHeight + 37;
const disclaimer = block(data.disclaimer, M, cursor + 24, INNER, 22, colors.muted); elements.push(disclaimer.svg); cursor += disclaimer.height + 29;
elements.push(`<line x1="${M}" y1="${cursor}" x2="${W - M}" y2="${cursor}" stroke="${colors.line}"/>`); cursor += 36;
elements.push(`<a href="${E(data.source.url + '/tree/' + data.source.commit)}">${txt('上游：Kenton-GMI/sakura-crossing · 固定版本 ' + data.source.commit, M, cursor, INNER, 21, colors.source)}</a>`); cursor += 33;
elements.push(txt('依据：research / business / lab / builder 笔记与产品方向数据。' + data.source.license, M, cursor, INNER, 21, colors.muted)); cursor += 37;
elements.push(txt('研究集 001 · ' + data.updatedAt + ' · 本地演示未部署 · 矢量文字与原图保留，可继续维护与复用', M, cursor, INNER, 21, colors.muted));
const H = Math.ceil(cursor + 43);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="poster-title poster-desc"><title id="poster-title">${E(data.title + ' · ' + data.subtitle)}</title><desc id="poster-desc">${E(data.thesis + ' 总览涵盖原始能力、本地扩展、渲染与场景组织、七条产品方向、视觉素材复用、个人价值、限制、来源和授权。上游发布图、本地实拍和 AI 概念配景分别标记。')}</desc><style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC","PingFang SC",sans-serif}a{text-decoration:none}</style><rect width="${W}" height="${H}" fill="${colors.paper}"/>${elements.join('\n')}</svg>`;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
if (process.argv.includes('--check')) {
  requireValue((await readFile(assetUrl('research-overview.svg'), 'utf8')) === svg, '总览 SVG 未同步，请重新生成');
  const manifest = JSON.parse(await readFile(assetUrl('overview-export.json'), 'utf8'));
  const png = await readFile(assetUrl('research-overview.png'));
  requireValue(manifest.svgSha256 === hash(svg) && manifest.pngSha256 === hash(png), 'PNG 与 SVG 未同步，请重新导出');
  requireValue(png.readUInt32BE(16) === W * 2 && png.readUInt32BE(20) === H * 2, 'PNG 导出尺寸错误');
  console.log(`总览检查通过：内容、引用、SVG 与 ${W * 2} × ${H * 2} PNG 一致。`);
  process.exit(0);
}
await writeFile(assetUrl('research-overview.svg'), svg, 'utf8');
console.log(`总览 SVG 已生成：${W} × ${H}，完整嵌入图片。`);
if (process.argv.includes('--png')) {
  const index = process.argv.indexOf('--sharp-module');
  const packagePath = index >= 0 ? process.argv[index + 1] : null;
  const require = createRequire(import.meta.url);
  const sharp = packagePath ? require(resolve(packagePath)) : require('sharp');
  await sharp(Buffer.from(svg), { density: 144, limitInputPixels: 100e6 }).png({ compressionLevel: 9 }).toFile(fileURLToPath(assetUrl('research-overview.png')));
  const png = await readFile(assetUrl('research-overview.png'));
  await writeFile(assetUrl('overview-export.json'), JSON.stringify({ version: 1, width: W * 2, height: H * 2, svgSha256: hash(svg), pngSha256: hash(png), updatedAt: data.updatedAt }, null, 2) + '\n');
  console.log(`高清 PNG 已导出：${W * 2} × ${H * 2}。`);
}
