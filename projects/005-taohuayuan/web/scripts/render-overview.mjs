// 中文研究总览：真实截图 + 可编辑矢量文字。生成 SVG 只使用 Node 内置模块。
// PNG 导出：node scripts/render-overview.mjs --png --sharp-module <sharp 包绝对路径>
import { readFile, writeFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const projectUrl = new URL('../../', import.meta.url);
const assetUrl = (file) => new URL('assets/' + file, projectUrl);
const dataUrl = new URL('notes/overview-content.json', projectUrl);
const dataBytes = await readFile(dataUrl);
const data = JSON.parse(dataBytes);
const W = 2000, M = 64, GAP = 24, INNER = W - M * 2;
const C = { paper: '#f6f3e9', card: '#fffdf7', ink: '#293e35', muted: '#637369', line: '#d9dfd1', source: '#886276', verified: '#406b53', planned: '#98663e', dark: '#304c3f' };
const PALE = { source: '#f1e8ed', verified: '#e7efe5', planned: '#f5ecdf' };
const svg = [], pictures = new Map(), boxes = [], sections = [];
let serial = 0, cursor = 0;
const assert = (ok, message) => { if (!ok) throw new Error(message); };
assert(data.version === 1 && data.original.shots.length === 3 && data.extension.shots.length === 3 && data.principles.clock.length === 5, '内容结构改变，请调整总览排版');
assert(/^[a-f0-9]{40}$/.test(data.source.commit), '必须保留固定上游版本');
for (const file of data.evidenceNotes) await access(new URL('notes/' + file, projectUrl));
for (const file of ['tour.md', 'tour-voice-generation.json', 'tour-voice-browser.json']) await access(new URL('../001-sakura-crossing/notes/' + file, projectUrl));
const E = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const units = (s) => [...s].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 1 : c === ' ' ? .34 : /[ilI.,:;!|']/u.test(c) ? .35 : /[MW@%]/u.test(c) ? .98 : .66), 0);
function wrap(value, width, size) {
  const lines = [];
  for (const paragraph of String(value).split('\n')) {
    const tokens = [];
    for (const token of paragraph.match(/[A-Za-z0-9_./:+×−→-]+|\s+|[^\x00-\x7F]|./g) || []) {
      if (/^[，。、；：？！）】”’!?.,;%]+$/u.test(token) && tokens.length) tokens[tokens.length - 1] += token;
      else tokens.push(token);
    }
    let line = '';
    for (const token of tokens) {
      if (line && units(line + token) * size > width * .96) { lines.push(line.trimEnd()); line = token.trimStart(); }
      else line += token;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
function text(value, x, y, width, size = 27, color = C.ink, weight = 400, leading = 1.5) {
  const lines = wrap(value, width, size), lh = size * leading;
  return { html: `<text x="${x}" y="${y + size}" font-size="${size}" fill="${color}" font-weight="${weight}" data-x="${x}" data-y="${y}" data-width="${width}" data-height="${lines.length * lh}">${lines.map((line, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${E(line)}</tspan>`).join('')}</text>`, height: lines.length * lh };
}
const T = (...args) => text(...args).html;
const rect = (x, y, w, h, fill = C.card, radius = 18, stroke = C.line) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="1.5"` : ''}/>`;
function frame(x, y, w, h, body, fill = C.card) {
  for (const match of body.matchAll(/data-x="([\d.]+)" data-y="([\d.]+)" data-width="([\d.]+)" data-height="([\d.]+)"/g)) {
    const [tx, ty, tw, th] = match.slice(1).map(Number);
    assert(tx >= x - .1 && ty >= y - .1 && tx + tw <= x + w + .1 && ty + th <= y + h + .1, `文字超出卡片：${[tx, ty, tw, th]} / ${[x, y, w, h]}`);
  }
  boxes.push({ x, y, width: w, height: h });
  return `<g data-frame="true">${rect(x, y, w, h, fill)}${body}</g>`;
}
function chip(value, x, y, kind = 'source', size = 21) {
  const w = units(value) * size + 32;
  return rect(x, y, w, size + 16, PALE[kind], 16, null) + T(value, x + 16, y + 6, w - 20, size, C[kind], 600, 1.2);
}
function arrow(x1, y1, x2, y2, color = '#91a38f') {
  return `<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2.3" marker-end="url(#arrow)"/>`;
}
function jpegSize(bytes) {
  assert(bytes[0] === 0xff && bytes[1] === 0xd8, '总览截图必须为 JPEG');
  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    while (bytes[i] === 0xff) i++;
    const marker = bytes[i++];
    if ([0xd8, 0xd9, 0x01].includes(marker) || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes.readUInt16BE(i);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { width: bytes.readUInt16BE(i + 5), height: bytes.readUInt16BE(i + 3) };
    if (marker === 0xda) break;
    i += length;
  }
  throw new Error('无法读取 JPEG 尺寸');
}
async function loadPhoto(file) {
  if (!pictures.has(file)) {
    const bytes = await readFile(assetUrl(file));
    let reference = {};
    if (file.startsWith('references/001-')) {
      const originalFile = file.replace('references/001-', '');
      const originalBytes = await readFile(new URL('../001-sakura-crossing/assets/' + originalFile, projectUrl));
      assert(sha(originalBytes) === sha(bytes), '001 参考截图与原文件不一致：' + file);
      reference = { sourceFile: 'projects/001-sakura-crossing/assets/' + originalFile, byteIdentical: true };
    }
    pictures.set(file, { file, sha256: sha(bytes), ...jpegSize(bytes), capturedAt: '2026-10-11', ...reference, uri: `data:image/jpeg;base64,${bytes.toString('base64')}` });
  }
  return pictures.get(file);
}
async function photo(item, x, y, w, h, radius = 12) {
  const p = await loadPhoto(item.file), [cx, cy, cw, ch] = item.crop;
  assert(cx >= 0 && cy >= 0 && cx + cw <= p.width && cy + ch <= p.height, '裁切区域越界：' + item.file);
  const scale = Math.max(w / cw, h / ch), id = 'clip-' + serial++;
  return `<defs><clipPath id="${id}">${rect(x, y, w, h, '#fff', radius, null)}</clipPath></defs><g clip-path="url(#${id})"><image href="${p.uri}" x="${x - cx * scale - (cw * scale - w) / 2}" y="${y - cy * scale - (ch * scale - h) / 2}" width="${p.width * scale}" height="${p.height * scale}"/></g>`;
}
function section(number, title, note, kind = 'source') {
  cursor += 32;
  const start = cursor;
  svg.push(`<line x1="${M}" y1="${cursor}" x2="${W - M}" y2="${cursor}" stroke="${C.line}" stroke-width="2"/>`);
  cursor += 28;
  svg.push(rect(M, cursor + 1, 58, 48, C[kind], 13, null), T(number, M + 13, cursor + 8, 40, 25, '#fffdf7', 600, 1.2), T(title, M + 80, cursor, INNER - 88, 40, C.ink, 600, 1.3));
  cursor += 64;
  if (note) { const p = text(note, M + 80, cursor, INNER - 88, 26, C.muted); svg.push(p.html); cursor += p.height + 20; }
  else cursor += 12;
  sections.push({ number, title, start });
}
function cards(items, columns, make, fill = C.card) {
  const w = (INNER - GAP * (columns - 1)) / columns;
  for (let i = 0; i < items.length; i += columns) {
    const row = items.slice(i, i + columns).map((item, j) => ({ x: M + j * (w + GAP), result: make(item, M + j * (w + GAP), cursor, w) }));
    const h = Math.max(...row.map((p) => p.result.height));
    for (const p of row) svg.push(frame(p.x, cursor, w, h, p.result.html, fill));
    cursor += h + GAP;
  }
}
function simpleCard(item, x, y, w, kind = 'source', size = 27) {
  let dy = 27, html = '';
  const title = text(item.title, x + 28, y + dy, w - 56, 32, C.ink, 600, 1.3);
  html += title.html; dy += title.height + 17;
  const p = text(item.text, x + 28, y + dy, w - 56, size);
  html += p.html; dy += p.height + 28;
  return { html: `<rect x="${x + 28}" y="${y + 16}" width="40" height="4" rx="2" fill="${C[kind]}"/>` + html, height: dy };
}
async function shotCards(items, kind = 'source', isRoute = false) {
  const w = (INNER - 2 * GAP) / 3, imageH = isRoute ? 300 : 246;
  const prepared = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i], x = M + i * (w + GAP), y = cursor;
    let dy = 27, html = T(item.title, x + 26, y + dy, w - 52, 33, C.ink, 600, 1.3); dy += 52;
    if (isRoute) { html += chip(item.time, x + 26, y + dy, kind, 23); dy += 58; }
    html += await photo(item, x + 20, y + dy, w - 40, imageH); dy += imageH + 15;
    html += T(item.stamp, x + 26, y + dy, w - 52, 20, C[kind], 500); dy += 42;
    const p = text(item.text, x + 26, y + dy, w - 52, 27);
    html += p.html; dy += p.height + 28;
    prepared.push({ x, html, height: dy });
  }
  const h = Math.max(...prepared.map((p) => p.height));
  for (const p of prepared) svg.push(frame(p.x, cursor, w, h, p.html));
  cursor += h + GAP;
}

svg.push(`<defs><linearGradient id="title-wash"><stop offset="0" stop-color="${C.paper}"/><stop offset=".49" stop-color="${C.paper}" stop-opacity=".98"/><stop offset=".73" stop-color="${C.paper}" stop-opacity=".66"/><stop offset="1" stop-color="${C.paper}" stop-opacity=".08"/></linearGradient><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 1 1 L 8 5 L 1 9" fill="none" stroke="#91a38f" stroke-width="1.5"/></marker></defs>`);
svg.push(await photo(data.original.after, 0, 0, W, 496, 0));
svg.push(`<rect width="${W}" height="496" fill="url(#title-wash)"/>`);
svg.push(T('005 / 源库研究总览  ·  ' + data.updatedAt, M, 34, 1400, 23, C.muted, 500));
svg.push(T(data.title, M, 95, 1520, 64, C.ink, 600, 1.2));
svg.push(T(data.subtitle, M, 181, 1490, 27, C.muted, 500));
svg.push(T(data.thesis, M, 237, 1130, 32, C.ink, 500, 1.48));
svg.push(T(data.position, M, 354, 1130, 24, C.muted, 400, 1.5));
svg.push(chip('源库已有', M, 447, 'source'), chip('本地已实现', M + 180, 447, 'verified'), chip('未来扩展', M + 402, 447, 'planned'));
svg.push(rect(W - 492, 440, 425, 39, C.paper, 16, null), T('背景：上游场景 · 本机复现截图', W - 476, 446, 392, 21, C.ink));
cursor = 524;
cards(data.pillars, 3, (item, x, y, w) => simpleCard(item, x, y, w));

section('01', '原版效果：把文意变成空间与镜头的转折', data.original.summary);
await shotCards(data.original.shots);
{
  const y = cursor, beforeX = M + 22, afterX = M + 462, textX = M + 928;
  let body = await photo(data.original.before, beforeX, y + 24, 396, 166);
  body += await photo(data.original.after, afterX, y + 24, 396, 166);
  body += arrow(M + 423, y + 106, M + 450, y + 106);
  body += T(data.original.before.stamp, beforeX, y + 207, 398, 21, C.source);
  body += T(data.original.after.stamp, afterX, y + 207, 398, 21, C.source);
  body += T('揭示的关键，是前后关系', textX, y + 25, INNER - 952, 31, C.ink, 600);
  const p = text(data.original.reveal, textX, y + 83, INNER - 952, 26);
  body += p.html;
  const h = Math.max(260, 83 + p.height + 22);
  svg.push(frame(M, y, INNER, h, body)); cursor += h + GAP;
}
cards(data.original.capabilities, 3, (item, x, y, w) => simpleCard(item, x, y, w));

section('02', '底层原理：故事时钟驱动观看，场景系统负责呈现', data.principles.summary);
{
  const gap = 36, w = (INNER - gap * 4) / 5, y = cursor;
  const cards = data.principles.clock.map((item, i) => {
    const x = M + i * (w + gap);
    let html = chip(String(i + 1).padStart(2, '0'), x + 22, y + 21, 'source', 20);
    html += T(item.title, x + 22, y + 77, w - 44, 28, C.ink, 600);
    const p = text(item.text, x + 22, y + 137, w - 44, 25, C.muted, 400, 1.5);
    html += p.html;
    return { x, html, height: 137 + p.height + 25 };
  });
  const h = Math.max(...cards.map((p) => p.height));
  for (let i = 0; i < cards.length; i++) { const p = cards[i]; svg.push(frame(p.x, y, w, h, p.html, '#f5f0f1')); if (i < cards.length - 1) svg.push(arrow(p.x + w + 5, y + h / 2, p.x + w + gap - 6, y + h / 2)); }
  cursor += h + 17;
  const p = text(data.principles.controls, M + 24, cursor + 18, INNER - 48, 25, C.source, 500);
  svg.push(frame(M, cursor, INNER, p.height + 36, p.html, PALE.source)); cursor += p.height + 62;
}
cards(data.principles.layers, 3, (item, x, y, w) => {
  let dy = 27, html = T(item.title, x + 28, y + dy, w - 56, 31, C.ink, 600); dy += 61;
  for (const point of item.points) {
    const p = text(point, x + 47, y + dy, w - 75, 26);
    html += `<circle cx="${x + 30}" cy="${y + dy + 16}" r="3.5" fill="${C.source}"/>` + p.html; dy += p.height + 19;
  }
  const p = text(item.anchor, x + 28, y + dy, w - 56, 20, C.muted);
  html += p.html; dy += p.height + 23;
  return { html, height: dy };
});
{
  const p = text(data.principles.note, M + 30, cursor + 19, INNER - 60, 25, C.muted);
  svg.push(frame(M, cursor, INNER, p.height + 38, p.html, '#eeeee3')); cursor += p.height + 48;
}

section('03', data.extension.title, data.extension.summary, 'verified');
await shotCards(data.extension.shots, 'verified', true);
{
  const y = cursor, imageW = 602, bodyX = M + imageW + 54, bodyW = INNER - imageW - 84;
  let html = await photo(data.extension.proof, M + 22, y + 22, imageW, 480);
  html += T('实测完成：01:00 / 01:00', M + 28, y + 521, imageW - 12, 24, C.verified, 600);
  let dy = 25;
  html += chip('语音、字幕、镜头同步', bodyX, y + dy, 'verified', 23); dy += 62;
  let p = text(data.extension.voice, bodyX, y + dy, bodyW, 28); html += p.html; dy += p.height + 18;
  p = text(data.extension.model, bodyX, y + dy, bodyW, 22, C.muted); html += p.html; dy += p.height + 24;
  html += rect(bodyX, y + dy, bodyW, 130, PALE.verified, 14, null);
  html += T('一个音频主时钟', bodyX + 20, y + dy + 15, bodyW - 40, 25, C.verified, 600);
  p = text(data.extension.clock, bodyX + 20, y + dy + 61, bodyW - 40, 26, C.ink, 500); html += p.html; dy += 159;
  p = text(data.extension.proof.text, bodyX, y + dy, bodyW, 26); html += p.html; dy += p.height + 27;
  const h = Math.max(579, dy);
  svg.push(frame(M, y, INNER, h, html)); cursor += h + GAP;
}
cards(data.extension.interactions, 3, (item, x, y, w) => simpleCard(item, x, y, w, 'verified', 26));
{
  const p = text(data.extension.distinction, M + 30, cursor + 19, INNER - 60, 25, C.muted);
  svg.push(frame(M, cursor, INNER, p.height + 38, p.html, '#edf1e5')); cursor += p.height + 48;
}

section('04', '哪些可以复用，怎样变成自己的能力', '制作方法、视觉节奏、导演协议与现成素材，各有不同的复用方式和条件。');
{
  const cols = [230, 534, 554, 554], xs = [M];
  for (let i = 1; i < cols.length; i++) xs.push(xs[i - 1] + cols[i - 1]);
  svg.push(rect(M, cursor, INNER, 69, C.dark, 15, null));
  ['可复用层', '核心内容', '在你的项目中怎样用', '实现与来源边界'].forEach((s, i) => svg.push(T(s, xs[i] + 22, cursor + 18, cols[i] - 44, 26, '#fffdf7', 600)));
  cursor += 69;
  for (let i = 0; i < data.reuse.length; i++) {
    const item = data.reuse[i], values = [item.title, item.asset, item.action, item.boundary];
    const cells = values.map((v, j) => text(v, xs[j] + 22, cursor + 22, cols[j] - 44, j ? 26 : 28, j === 3 ? C.muted : C.ink, j ? 400 : 600));
    const h = Math.max(...cells.map((p) => p.height)) + 44;
    svg.push(frame(M, cursor, INNER, h, cells.map((p) => p.html).join(''), i % 2 ? '#f0f1e8' : C.card));
    for (let j = 1; j < cols.length; j++) svg.push(`<line x1="${xs[j]}" y1="${cursor + 16}" x2="${xs[j]}" y2="${cursor + h - 16}" stroke="${C.line}"/>`);
    cursor += h;
  }
  cursor += 16;
}

section('05', '使用场景：为明确的故事和路线安排观看', '适合内容明确、路线可编排、空间规模可控的体验；每种场景仍有自己的内容与产品工作。');
cards(data.scenarios, 2, (item, x, y, w) => {
  const base = simpleCard({ title: item.title, text: item.fit }, x, y, w);
  const p = text(item.need, x + 28, y + base.height - 8, w - 56, 25, C.planned);
  return { html: base.html + p.html, height: base.height + p.height + 17 };
});

section('06', '扩展路线：从一个演示走向可配置的创作工具', '001 已完成方法迁移；通用播放器、搭建器路线编辑和 AI 编排仍是下一阶段工作。', 'planned');
cards(data.roadmap, 3, (item, x, y, w) => {
  let dy = 25, html = chip(item.stage, x + 28, y + dy, item.kind, 22); dy += 61;
  html += T(item.title, x + 28, y + dy, w - 56, 32, C.ink, 600); dy += 63;
  for (const point of item.points) {
    const p = text(point, x + 47, y + dy, w - 75, 26);
    html += `<circle cx="${x + 30}" cy="${y + dy + 16}" r="3.5" fill="${C[item.kind]}"/>` + p.html; dy += p.height + 15;
  }
  return { html, height: dy + 15 };
});

section('07', '对你的价值：让研究、空间与讲解连接起来', '价值判断建立在当前研究街与搭建器基础上；体验和商业收益需要后续用户验证。', 'verified');
cards(data.values, 2, (item, x, y, w) => simpleCard(item, x, y, w, 'verified'));
{
  const y = cursor;
  const p = text(data.nextStep, M + 36, y + 30, INNER - 72, 31, '#fffdf7', 500, 1.5);
  svg.push(frame(M, y, INNER, p.height + 60, p.html, C.dark)); cursor += p.height + 70;
}

section('08', '证据、来源与实践边界', '真实截图说明已经看到的效果；源码研究说明实现机制；未来方向按计划标注。');
cards(data.boundaries, 3, (item, x, y, w) => simpleCard(item, x, y, w, 'source', 25));
{
  cursor += 12;
  svg.push(`<line x1="${M}" y1="${cursor}" x2="${W - M}" y2="${cursor}" stroke="${C.line}" stroke-width="2"/>`);
  cursor += 24;
  svg.push(T('研究版本 ' + data.source.commit + '  ·  实拍 2026-10-11  ·  汇总 ' + data.updatedAt, M, cursor, INNER, 21, C.muted)); cursor += 42;
  svg.push(`<a href="${E(data.source.url)}">${T('源库：' + data.source.url, M, cursor, INNER, 22, C.source, 500)}</a>`); cursor += 42;
  svg.push(T('依据：005 中文研究 / 实验 / 来源说明；001 导览笔记 / MiniMax 生成记录 / 浏览器完成记录。', M, cursor, INNER, 22, C.muted)); cursor += 41;
  svg.push(T('001 场景来源：Kenton-GMI/sakura-crossing（MIT 代码）。本地导览未引入桃源源码、模型或朗读。', M, cursor, INNER, 22, C.muted)); cursor += 41;
  svg.push(T('图内原版与扩展画面均为本机真实截图；裁切只为排版。方法迁移不改变上游贡献和素材许可。', M, cursor, INNER, 22, C.muted)); cursor += 76;
}

const H = Math.ceil(cursor);
const body = svg.join('\n');
let textCount = 0;
for (const match of body.matchAll(/data-x="([\d.]+)" data-y="([\d.]+)" data-width="([\d.]+)" data-height="([\d.]+)"/g)) {
  const [x, y, w, h] = match.slice(1).map(Number);
  assert(x >= 0 && y >= 0 && x + w <= W + .1 && y + h <= H + .1, '文字超出画布');
  textCount++;
}
const document = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="poster-title poster-desc"><title id="poster-title">${E(data.title)}</title><desc id="poster-desc">桃源源库的效果、原理、复用、使用场景、001 实际扩展与研究价值。源库、本地实现与未来计划分别标注，使用真实截图。</desc><style>text { font-family: 'Microsoft YaHei','Noto Sans CJK SC','PingFang SC',sans-serif; } a { cursor: pointer; }</style><rect width="${W}" height="${H}" fill="${C.paper}"/>${body}</svg>`;
const svgUrl = assetUrl('research-overview.svg');
await writeFile(svgUrl, document, 'utf8');
const manifest = {
  updatedAt: data.updatedAt, width: W, height: H, contentSha256: sha(dataBytes), svgSha256: sha(document),
  source: data.source, extensionSource: data.extension.source, screenshots: [...pictures.values()].map(({ uri, ...info }) => info),
  evidence: ['005/notes/research.md', '005/notes/experiment.md', '005/THIRD_PARTY.md', '001/notes/tour.md', '001/notes/tour-voice-generation.json', '001/notes/tour-voice-browser.json'],
  layout: { textBlocks: textCount, frames: boxes.length, frameBoundsChecked: true, documentBoundsChecked: true, sections },
  font: 'Microsoft YaHei', screenshotTreatment: '真实截图裁切、等比缩放；没有生成替代画面。',
  outputs: { svg: { file: 'research-overview.svg', width: W, height: H } }
};
if (process.argv.includes('--png')) {
  const arg = process.argv.indexOf('--sharp-module');
  assert(arg >= 0 && process.argv[arg + 1], 'PNG 导出需要 --sharp-module <sharp 包绝对路径>');
  const require = createRequire(import.meta.url), sharp = require(resolve(process.argv[arg + 1]));
  const pngUrl = assetUrl('research-overview.png');
  await sharp(Buffer.from(document), { density: 144, limitInputPixels: 180000000 }).png({ compressionLevel: 9 }).toFile(fileURLToPath(pngUrl));
  const pngBytes = await readFile(pngUrl), meta = await sharp(pngBytes).metadata();
  assert(meta.width === W * 2 && meta.height === H * 2, 'PNG 尺寸与矢量稿不一致');
  manifest.outputs.png = { file: 'research-overview.png', width: meta.width, height: meta.height, bytes: pngBytes.length, sha256: sha(pngBytes) };
}
await writeFile(assetUrl('research-overview-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`研究总览已生成：${W} × ${H} SVG，${pictures.size} 张真实截图，${textCount} 处文字，${sections.length} 个主题。`);
if (manifest.outputs.png) console.log(`高清 PNG：${manifest.outputs.png.width} × ${manifest.outputs.png.height}，${(manifest.outputs.png.bytes / 1024 / 1024).toFixed(2)} MiB。`);
