// 中文研究图：可编辑 SVG + 原图嵌入。只排版和引用原图，不修改来源图片。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const data = JSON.parse(await readFile(new URL('../notes/overview-content.json', import.meta.url), 'utf8'));
const root = new URL('../', import.meta.url), asset = f => new URL('assets/' + f, root);
const require = createRequire(import.meta.url);
const runtime = process.env.CODEX_NODE_MODULES;
const sharp = require(runtime ? resolve(runtime, 'sharp') : 'sharp');
const { createCanvas, GlobalFonts } = require(runtime ? resolve(runtime, '@napi-rs/canvas') : '@napi-rs/canvas');
// 与 SVG 保持同样的系统字体，按实际字宽排版，而不是按字数估算。
if (process.platform === 'win32') GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc', 'Microsoft YaHei');
const ctx = createCanvas(1, 1).getContext('2d');
const font = 'Microsoft YaHei';
const W = 2400, M = 72, GAP = 24, INNER = W - M * 2;
const C = { ink: '#203a43', muted: '#5c7379', paper: '#f5f6f1', card: '#fffefa', line: '#d9e1dc', source: '#6d648e', local: '#246e69', planned: '#a56e37', dark: '#193c46' };
const pale = { source: '#eeebf5', local: '#e4f1ec', planned: '#f7ecdc' };
const E = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const out = [], textRuns = [], frames = [], images = new Map();
let y = 0, serial = 0;
function measure(s, size, weight = 400) { ctx.font = `${weight} ${size}px "${font}"`; return ctx.measureText(s).width; }
function wrap(value, width, size, weight = 400) {
  const tokens = String(value).match(/[A-Za-z0-9_./:#@+−→-]+|\s+|[^\x00-\x7F]|./g) || [];
  const units = [];
  for (const token of tokens) {
    if (/^[，。、；：？！）】”’!?.,;%]+$/.test(token) && units.length) units[units.length - 1] += token;
    else if (measure(token, size, weight) > width) units.push(...token);
    else units.push(token);
  }
  const lines = []; let line = '';
  for (const token of units) {
    if (line && measure(line + token, size, weight) > width * .98) { lines.push(line.trimEnd()); line = token.trimStart(); }
    else line += token;
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}
function text(value, x, baseline, width, size = 28, color = C.ink, weight = 400, lh = size * 1.46) {
  const lines = wrap(value, width, size, weight);
  const maxWidth = Math.max(...lines.map(line => measure(line, size, weight)));
  if (maxWidth > width + .5) throw new Error(`文字超宽：${value}`);
  textRuns.push({ x, y: baseline, width: maxWidth, bottom: baseline + (lines.length - 1) * lh + size * .25, text: value });
  return { svg: `<text x="${x}" y="${baseline}" font-size="${size}" font-weight="${weight}" fill="${color}">${lines.map((s, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${E(s)}</tspan>`).join('')}</text>`, h: lines.length * lh, lines: lines.length };
}
const T = (...args) => text(...args).svg;
const rect = (x, y, w, h, fill = C.card, stroke = C.line, r = 22) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1.5"` : ''}/>`;
function frame(x, y, w, h, body, fill = C.card, stroke = C.line) {
  frames.push({x,y,w,h}); return rect(x,y,w,h,fill,stroke) + body;
}
function badge(label, x, top, kind = 'local', size = 22) {
  const w = measure(label, size, 600) + 48, h = size + 18;
  return rect(x, top, w, h, pale[kind], null, h / 2) + T(label, x + 16, top + size + 4, w - 30, size, C[kind], 600);
}
function section(n, title, note) {
  y += 42;
  out.push(`<line x1="${M}" y1="${y}" x2="${W-M}" y2="${y}" stroke="${C.line}" stroke-width="2"/>`);
  y += 57;
  out.push(T(n, M, y, 86, 35, C.local, 700), T(title, M + 96, y, INNER - 96, 42, C.ink, 700));
  y += 44;
  if (note) { const t = text(note, M + 96, y, INNER - 96, 27, C.muted); out.push(t.svg); y += t.h - 27; }
  y += 32;
}
async function embedded(file) {
  if (!images.has(file)) {
    const bytes = await readFile(asset(file)); const meta = await sharp(bytes).metadata();
    images.set(file, { uri: `data:image/${meta.format === 'jpeg' ? 'jpeg' : 'png'};base64,${bytes.toString('base64')}`, width: meta.width, height: meta.height, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  return images.get(file);
}
async function photo(file, x, y, w, h, crop = null, mode = 'meet') {
  const im = await embedded(file), [cx,cy,cw,ch] = crop || [0,0,im.width,im.height];
  const clip = 'clip' + serial++;
  return `<defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/></clipPath></defs><g clip-path="url(#${clip})"><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${cx} ${cy} ${cw} ${ch}" preserveAspectRatio="xMidYMid ${mode}"><image href="${im.uri}" width="${im.width}" height="${im.height}"/></svg></g>`;
}
function proseCard(item, x, top, width, options = {}) {
  let dy = 45;
  const title = text(item.title, x + 26, top + dy, width - 52, options.titleSize || 31, options.titleColor || C.ink, 700);
  let body = title.svg;
  const titleH = title.h;
  dy += titleH + 15;
  const b = text(item.text, x + 26, top + dy, width - 52, options.size || 27, options.color || C.muted);
  body += b.svg; dy += b.h + 13;
  return {body, h:dy};
}
function rowCards(items, cols, options = {}) {
  const width = (INNER - GAP * (cols-1)) / cols;
  const cards = items.map((item, i) => ({ x:M + i*(width+GAP), ...proseCard(item,M + i*(width+GAP),y,width,options) }));
  const h = Math.max(...cards.map(c=>c.h));
  for(const c of cards) out.push(frame(c.x,y,width,h,c.body,options.fill || C.card));
  y += h;
}

out.push(`<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1 8 5 1 9" stroke="${C.local}" fill="none" stroke-width="1.5"/></marker><pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke="#47717a" stroke-opacity=".22" stroke-width="1"/></pattern></defs>`);
// Header: a readable thesis first, then a restrained geometric source motif.
out.push(rect(0,0,W,378,C.dark,null,0), `<rect x="1730" width="670" height="378" fill="url(#grid)"/>`);
out.push(T('014 / print-bench 研究图 · ' + data.date, M, 58, 1300, 25, '#afcbc9', 500));
out.push(T(data.title, M, 152, 2010, 75, '#fffefa', 700));
out.push(T(data.subtitle, M, 211, 2200, 36, '#d5e5df', 500));
out.push(T(data.thesis, M, 283, INNER, 34, '#fffefa', 600));
out.push(T('本质：AI 改写定义模型的代码，工具执行代码生成资产；Issue 把需求送进这条流程。', M, 337, INNER, 28, '#b9d2d0'));
y = 408;
out.push(badge('上游源码 / 发布图', M,y,'source'), badge('本机复现 / 项目实拍',M+410,y,'local'),badge('适用方案 / 待接入',M+880,y,'planned'));
out.push(T('用颜色区分证据与设想',M+1340,y+29,880,26,C.muted));
y += 87;

section('01','先看结果：源库能把需求变成什么？','print-bench 是参数化 CAD 与自动化维护工程；源库图、局部复现和我们的现有项目截图分别标注。');
const ew = 690, capX = M + (ew + GAP)*2, capW = INNER - (ew+GAP)*2;
let eh = 652;
for (const [i,item] of data.effects.entries()) {
  const x = M + i*(ew+GAP);
  let body = badge('上游发布图',x+24,y+20,'source') + T(item.title,x+24,y+99,ew-48,31,C.ink,700);
  body += await photo(item.file,x+20,y+127,ew-40,348);
  body += T(item.caption,x+24,y+521,ew-48,27,C.source,600);
  body += T(item.note,x+24,y+565,ew-48,25,C.muted);
  out.push(frame(x,y,ew,eh,body));
}
let capBody = T(data.capability.title,capX+28,y+47,capW-56,34,C.ink,700), dy = 103;
for(const point of data.capability.points){const b=text(point,capX+50,y+dy,capW-80,28); capBody += `<circle cx="${capX+30}" cy="${y+dy-10}" r="4" fill="${C.local}"/>`+b.svg;dy+=b.h+24;}
const capNote = text(data.capability.note,capX+28,y+dy+4,capW-56,25,C.muted);capBody+=capNote.svg;
eh = Math.max(eh,dy+capNote.h+30);
out.push(frame(capX,y,capW,eh,capBody,pale.local));y+=eh;

section('02','底层流程：每一环分别由谁负责？','已查版本：每小时定时 / 手动触发；经过 autonomy-ok 筛选，单次选择一项未领取任务。不是每个新 Issue 都立即开跑。');
const pw = (INNER-GAP*5)/6;
const pipeline = data.pipeline.map((item,i)=>{
  const x = M+i*(pw+GAP);let body=T(String(i+1).padStart(2,'0'),x+22,y+39,pw-44,24,C.local,700);
  body+=T(item.title,x+22,y+88,pw-44,31,C.ink,700);
  const owner=text(item.owner,x+22,y+132,pw-44,23,C.source,600);body+=owner.svg;
  let dy=132+owner.h+18;
  const b=text(item.text,x+22,y+dy,pw-44,27,C.ink);body+=b.svg;dy+=b.h+20;
  const d=text(item.detail,x+22,y+dy,pw-44,22,C.muted);body+=d.svg;dy+=d.h+15;
  return{x,body,h:dy};
});
const ph=Math.max(...pipeline.map(c=>c.h));
pipeline.forEach((c,i)=>{out.push(frame(c.x,y,pw,ph,c.body));if(i<5)out.push(`<path d="M${c.x+pw+2} ${y+200}h${GAP-6}" stroke="${C.local}" stroke-width="2" marker-end="url(#arrow)" fill="none"/>`);});y+=ph+22;
const fb = text('失败反馈：可修复 → 返回代理重试；超限、范围冲突或需求不清 → 停止并请求人判断。仓库规范和验收条件贯穿整条链。',M+28,y+41,INNER-56,27,C.local,600);
out.push(rect(M,y,INNER,fb.h+44,pale.local,null,16),fb.svg);y+=fb.h+67;
rowCards(data.implementation,3,{size:26,titleSize:30});

section('03','证据链：一次改动如何证明“模型真的变了”？','真实任务：Issue #398 → PR #424。下面用同一最小测试件复现修改前后，孔洞沿 Y 轴贯穿，Z 为上下方向。');
const beforeX = M, afterX = M+620+GAP, caseX = M+2*(620+GAP), caseW = INNER-2*(620+GAP), caseH=673;
for(const [i,type] of ['before','after'].entries()){
  const x=i?afterX:beforeX, isAfter=!!i;
  let body=badge(isAfter?'本机复现 · 修改后':'本机复现 · 修改前',x+22,y+20,'local');
  body+=T(isAfter?'孔顶朝 +Z':'孔顶误朝 −Z',x+22,y+109,576,33,C.ink,700);
  body+=await photo('local/teardrop-'+type+'.png',x+16,y+135,588,390);
  body+=T(isAfter?data.case.after:data.case.before,x+22,y+568,576,31,isAfter?C.local:'#a66555',600);
  body+=T(isAfter?data.case.afterMeasure:data.case.beforeMeasure,x+22,y+623,576,26,C.muted);
  out.push(frame(x,y,620,caseH,body));
}
let cb=T(data.case.title,caseX+28,y+48,caseW-56,33,C.ink,700),cd=101;
cb+=badge(data.case.pr,caseX+28,y+70,'source',21);cd=155;
for(const point of data.case.evidence){const b=text(point,caseX+28,y+cd,caseW-56,27);cb+=b.svg;cd+=b.h+19;}
out.push(frame(caseX,y,caseW,Math.max(caseH,cd+12),cb));y+=Math.max(caseH,cd+12)+20;
const boundary=text(data.case.boundary,M+26,y+37,INNER-52,25,C.muted);
out.push(rect(M,y,INNER,boundary.h+39,'#eaf0ec',null,16),boundary.svg);y+=boundary.h+39;

section('04','价值：比直接对话，具体少做哪些工作？','能力可以相同；增量价值来自任务排队、执行约定、证据和协作。不是把 AI 加进去就自动更省事。');
rowCards(data.values,4,{size:27,titleSize:31});y+=24;
rowCards(data.comparison,3,{size:27,titleSize:31});y+=26;
for(const [kind,key] of [['local','good'],['source','dialogue'],['planned','script']]){
  const b=text(data.decision[key],M+24,y+37,INNER-48,27,C[kind],600);
  out.push(rect(M,y,INNER,b.h+38,pale[kind],null,15),b.svg);y+=b.h+50;
}
y-=12;

section('05','对你的项目：把重复维护交给后台','以下是现有项目的真实截图；建议的 Issue→PR 自动化均待接入。优先从验收明确的小修复开始。');
const dw=(INNER-GAP*3)/4;
const extensionCards=[];
for(const [i,item] of data.extensions.entries()){
  const x=M+i*(dw+GAP);let body=T(item.title,x+22,y+44,dw-44,30,C.ink,700);
  body+=badge('已有项目实拍',x+22,y+62,'local',20);
  body+=await photo(item.file,x+16,y+113,dw-32,242,item.crop,'slice');
  body+=T(item.priority,x+22,y+395,dw-44,25,C.planned,600);
  let dy=441;
  for(const [prefix,key] of [['需求：','issue'],['流程：','flow'],['','save']]){
    const b=text(prefix+item[key],x+22,y+dy,dw-44,26,key==='save'?C.local:C.ink,key==='save'?500:400);body+=b.svg;dy+=b.h+18;
  }
  extensionCards.push({x,body,h:dy+7});
}
const dh=Math.max(...extensionCards.map(c=>c.h));for(const c of extensionCards)out.push(frame(c.x,y,dw,dh,c.body));y+=dh+20;
const oe=text(data.otherExtensions,M,y+31,INNER,26,C.muted);out.push(oe.svg);y+=oe.h+31;

section('06','可扩展方向：换代理、换工具，保留验收链','扩展的是执行工具与交付场景；基础依然是可编辑源码、可重复运行的环境和可判定的结果。');
let codexBody=badge('可行接入方案 · 尚未实现',M+26,y+22,'planned',22);
codexBody+=T(data.codex.title,M+26,y+110,INNER-52,35,C.ink,700);
const cc=text(data.codex.chain,M+26,y+166,INNER-52,30,C.local,600);codexBody+=cc.svg;
const ct=text(data.codex.text,M+26,y+166+cc.h+20,INNER-52,27,C.muted);codexBody+=ct.svg;
const ch=166+cc.h+20+ct.h+20;out.push(frame(M,y,INNER,ch,codexBody,'#eef4f2'));y+=ch+24;
rowCards(data.roadmap,3,{size:27,titleSize:31});

section('07','理解边界：哪些是证据，哪些仍需验证？','本图汇总已有研究与几何复现；没有替你开通远端自动化，也没有部署新演示。');
rowCards(data.boundaries,3,{size:26,titleSize:30});y+=28;
const takeaway=text(data.takeaway,M+28,y+52,INNER-56,34,'#fffefa',600);
out.push(rect(M,y,INNER,takeaway.h+55,C.dark,null,22),takeaway.svg);y+=takeaway.h+95;
out.push(T(data.source.notice,M,y,INNER,25,C.muted));y+=51;
out.push(`<line x1="${M}" y1="${y}" x2="${W-M}" y2="${y}" stroke="${C.line}" stroke-width="2"/>`);y+=43;
let lx=M;
for(const link of data.links){const lw=measure(link.label,25,600)+38;out.push(`<a href="${E(link.url)}">${T(link.label+' ↗',lx,y,lw+8,25,C.source,600)}</a>`);lx+=lw+35;}
y+=45;
out.push(T('来源：github.com/shaiss/print-bench · 固定 commit '+data.source.commit,M,y,INNER,24,C.muted));y+=39;
out.push(T('上游模型图与代码：print-bench 贡献者 · CC BY-SA 4.0；第三方库保留各自许可证。',M,y,INNER,24,C.muted));y+=38;
out.push(T('本图修改：中文说明、对照标注、测量图与截图编排；整体编排 CC BY-SA 4.0。其他项目截图来源见 assets/README.md。',M,y,INNER,23,C.muted));y+=39;
out.push(T('研究集 014 · 源图完整嵌入 · 可编辑 SVG / 高清 PNG · 2026-10-12',M,y,INNER,23,C.muted));
const H=Math.ceil(y+55);
for(const t of textRuns) if(t.x<0 || t.x+t.width>W+1 || t.bottom>H)throw new Error('画布外文字：'+t.text);
for(const t of textRuns) for(const f of frames) if(t.x>=f.x && t.x<f.x+f.w && t.y>=f.y && t.y<f.y+f.h && t.bottom>f.y+f.h-8)throw new Error('卡片内文字溢出：'+t.text);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc"><title id="title">${E(data.title)}</title><desc id="desc">${E(data.thesis+'。涵盖源库能力、真实模型效果、六步实现、Issue 398 / PR 424 实例、本机几何测量、直接对话与自动化的价值比较、现有项目用途、Codex 与工具扩展、验证边界及来源。')}</desc><style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif}a{text-decoration:none}</style><rect width="${W}" height="${H}" fill="${C.paper}"/>${out.join('\n')}</svg>`;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(asset(''),{recursive:true});
const manifest={version:1,date:data.date,width:W,height:H,pngScale:1.5,sourceCommit:data.source.commit,svgSha256:hash(svg),embeddedImages:[...images.entries()].map(([file,{width,height,sha256}])=>({file,width,height,sha256})),textCount:textRuns.length,frameCount:frames.length};
if(process.argv.includes('--check')){
  if(await readFile(asset('research-overview.svg'),'utf8')!==svg)throw new Error('SVG 与内容未同步');
  const saved=JSON.parse(await readFile(asset('overview-export.json'),'utf8'));
  const png=await readFile(asset('research-overview.png'));
  if(saved.svgSha256!==hash(svg)||saved.pngSha256!==hash(png))throw new Error('PNG 与 SVG 未同步');
  if(png.readUInt32BE(16)!==Math.round(W*1.5)||png.readUInt32BE(20)!==Math.round(H*1.5))throw new Error('PNG 尺寸错误');
  console.log(`图稿检查通过：${textRuns.length} 个文字块、${images.size} 张原图、SVG 与 PNG 一致。`);
  process.exit(0);
}
await writeFile(asset('research-overview.svg'),svg);
await sharp(Buffer.from(svg),{density:108,limitInputPixels:100e6}).png({compressionLevel:9}).toFile(fileURLToPath(asset('research-overview.png')));
await sharp(Buffer.from(svg),{limitInputPixels:100e6}).resize({width:1200}).png().toFile(fileURLToPath(asset('overview-preview.png')));
manifest.pngSha256=hash(await readFile(asset('research-overview.png')));
await writeFile(asset('overview-export.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(new URL('notes/overview-layout.json',root),JSON.stringify({width:W,height:H,frames,textRuns},null,2)+'\n');
console.log(`已生成 SVG ${W} × ${H} / PNG ${W*1.5} × ${Math.round(H*1.5)}，嵌入 ${images.size} 张真实图片。`);
