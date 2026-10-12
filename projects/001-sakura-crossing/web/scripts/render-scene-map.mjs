// Source-controlled research atlas: accurate Chinese text + unchanged screenshots.
// --png --sharp-module <path> exports a high-resolution PNG and web preview.
import { readFile, writeFile, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = new URL('../../', import.meta.url);
const data = JSON.parse(await readFile(new URL('notes/scene-map-content.json', root), 'utf8'));
const asset = file => new URL('assets/' + file, root);
const W = 1920, M = 56, GAP = 24, INNER = W - 2 * M;
const C = { paper:'#f5f3eb', ink:'#263d38', muted:'#62736c', line:'#d7ded4', card:'#fffdf7', verified:'#426c58', source:'#486381', planned:'#97624e' };
const PALE = { verified:'#eaf1e6', source:'#e9eef5', planned:'#f5e9df' };
const E = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash = value => createHash('sha256').update(value).digest('hex');
const expect = (condition, message) => { if (!condition) throw new Error(message); };
expect(data.version === 1 && data.sources.length === 2 && data.originals.length === 2 && data.modules.length === 4 && data.gallery.length === 8, '研究全图结构已改变，请同步排版。');
for (const source of data.sources) expect(/^[a-f0-9]{40}$/.test(source.commit), '来源必须有固定 commit。');
for (const file of [...data.evidenceNotes, data.illustration.prompt, data.entry, data.hub]) await access(new URL(file, root));
const imageInputs = new Map();
async function imageUri(file) {
  if (!imageInputs.has(file)) {
    const bytes = await readFile(new URL(file, root));
    const mime = file.endsWith('.png') ? 'png' : file.endsWith('.webp') ? 'webp' : 'jpeg';
    imageInputs.set(file, { uri:`data:image/${mime};base64,${bytes.toString('base64')}`, sha256:hash(bytes) });
  }
  return imageInputs.get(file).uri;
}
const parts = [], sections = [];
let y = 0, serial = 0;
const rect = (x,y,w,h,fill=C.card,r=14,stroke=C.line) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ''}/>`;
const units = text => [...text].reduce((n,c)=>n+(c.charCodeAt(0)>255?1:/[ilI.,:;!| ]/.test(c)?.32:/[MW@]/.test(c)?.86:.59),0);
function wrap(text, width, size) {
  const tokens = [], lines = [];
  for (const token of String(text).match(/[A-Za-z0-9_./:+×→-]+|\s+|[^\x00-\x7F]|./g) || []) {
    if (/^[，。、；：？！）】”’!?.,;%]+$/.test(token) && tokens.length) tokens[tokens.length-1] += token;
    else if (units(token)*size > width*.95) tokens.push(...token);
    else tokens.push(token);
  }
  let line = '';
  for (const token of tokens) {
    if (line && units(line+token)*size > width*.95) { lines.push(line.trimEnd()); line=token.trimStart(); }
    else line += token;
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}
function text(value,x,y,width,size=23,color=C.ink,weight=400,leading=size*1.5) {
  const lines = wrap(value,width,size);
  return { svg:`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" data-max-width="${width}">${lines.map((line,i)=>`<tspan x="${x}" dy="${i?leading:0}">${E(line)}</tspan>`).join('')}</text>`, height:lines.length*leading };
}
const txt = (...args) => text(...args).svg;
const frame = (x,y,w,h,body,fill=C.card) => `<g data-frame="true" data-x="${x}" data-y="${y}" data-width="${w}" data-height="${h}">${rect(x,y,w,h,fill)}${body}</g>`;
function label(value,x,y,kind='verified',size=18) {
  const w = units(value)*size+28;
  return rect(x,y-21,w,31,PALE[kind],15,null)+txt(value,x+14,y,w-20,size,C[kind],500);
}
async function photo(file,x,y,w,h) {
  const id = 'photo-' + serial++;
  return `<defs><clipPath id="${id}">${rect(x,y,w,h,'#fff',10,null)}</clipPath></defs><image href="${await imageUri(file)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${id})"/>`;
}
function section(id,title,note) {
  sections.push({id,title,y:Math.round(y)});
  parts.push(`<g id="section-${id}"><line x1="${M}" y1="${y}" x2="${W-M}" y2="${y}" stroke="${C.line}" stroke-width="2"/>`);
  y+=52;
  parts.push(txt(id,M,y,58,26,C.verified,600),txt(title,M+65,y,INNER-65,35,C.ink,600));
  y+=38;
  const b=text(note,M+65,y,INNER-65,22,C.muted);parts.push(b.svg);y+=b.height+12;
  parts.push('</g>');
}
function note(value,fill=C.source,bg=PALE.source,size=22) {
  const b=text(value,M+24,y+36,INNER-48,size,fill);
  parts.push(rect(M,y,INNER,b.height+38,bg,12,null),b.svg);y+=b.height+62;
}
function simpleCard(item,x,top,w,kind='verified',size=23) {
  let offset=39, body='';
  const heading=text(item.title,x+22,top+offset,w-44,27,C.ink,600);body+=heading.svg;offset+=heading.height+4;
  if(item.status) {body+=label(item.status,x+22,top+offset,kind,17);offset+=43;}
  const fields=item.fields || [{value:item.text}];
  for(const field of fields) {
    const b=text(field.value,x+22,top+offset,w-44,field.size||size,field.color||C.ink,field.weight||400);
    body+=b.svg;offset+=b.height+14;
  }
  return {body,height:offset+5};
}
function grid(items,cols,mapper,kind='verified') {
  const w=(INNER-GAP*(cols-1))/cols;
  for(let row=0;row<Math.ceil(items.length/cols);row++) {
    const mapped=items.slice(row*cols,(row+1)*cols).map((item,i)=>({x:M+i*(w+GAP), item, ...simpleCard(mapper(item),M+i*(w+GAP),y,w,item.kind||kind)}));
    const h=Math.max(...mapped.map(item=>item.height));
    mapped.forEach(item=>parts.push(frame(item.x,y,w,h,item.body)));y+=h+GAP;
  }
  y+=14;
}

parts.push(`<defs><linearGradient id="wash"><stop stop-color="${C.paper}" stop-opacity=".98"/><stop offset=".48" stop-color="${C.paper}" stop-opacity=".94"/><stop offset=".78" stop-color="${C.paper}" stop-opacity=".14"/></linearGradient><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 9 5 1 9" fill="none" stroke="#8ba29b" stroke-width="1.8"/></marker></defs>`);
parts.push(`<image href="${await imageUri(data.illustration.file)}" width="${W}" height="350" preserveAspectRatio="xMidYMid slice"/><rect width="${W}" height="350" fill="url(#wash)"/>`);
parts.push(txt('001 × 012 / 从效果，到方法，再到复用 · '+data.updatedAt,M,52,1160,23,C.muted,500));
parts.push(txt(data.title,M,143,1290,65,C.ink,600),txt(data.subtitle,M,206,1200,38,C.ink,500));
parts.push(txt('源库效果 × 技术底层 × 真实扩展 × 应用价值 × 下一步',M,262,1300,24,C.muted));
parts.push(rect(W-470,307,416,30,C.paper,15,null),txt(data.illustration.label,W-456,329,392,17,C.muted));
y=398;const thesis=text(data.thesis,M,y,INNER,29,C.ink,500);parts.push(thesis.svg);y+=thesis.height+17;
parts.push(label('源库 / 作者发布图',M,y,'source'),label('本地实现 / 有实测',M+340,y,'verified'),label('扩展方案 / 待建设',M+690,y,'planned'),txt('看标签判断成熟度；截图能说明画面，不能替代物理或业务验证。',M+1090,y,710,19,C.muted));y+=49;

section('01','两条源库研究线：看到什么，具备什么','雨夜库提供环境与材质的方法，樱花库提供程序化内容与动画视觉；二者都需要宿主与具体业务。');
const half=(INNER-GAP)/2, originals=[];
for(const [i,item] of data.originals.entries()) {
  const x=M+i*(half+GAP);let offset=40;
  const h=text(item.title,x+24,y+offset,half-48,30,C.ink,600);let body=h.svg;offset+=h.height+5;
  const l=text(item.label,x+24,y+offset,half-48,19,C.source);body+=l.svg;offset+=l.height+10;
  body+=await photo(item.file,x+18,y+offset,half-36,450);offset+=478;
  for(const point of item.points){const b=text('• '+point,x+24,y+offset,half-48,23);body+=b.svg;offset+=b.height+13;}
  const n=text(item.note,x+24,y+offset,half-48,20,C.muted);body+=n.svg;offset+=n.height+15;
  originals.push({x,body,height:offset});
}
const oh=Math.max(...originals.map(item=>item.height));originals.forEach(item=>parts.push(frame(item.x,y,half,oh,item.body)));y+=oh+40;

section('02','能力的分层：什么能搬走，什么必须自己提供','一幅场景可以作背景，也可以成为内容、展示或游戏的空间；产品任务决定需要接到哪一层。');
grid(data.architecture,5,item=>item);
note('可带走的是明确的算法、接口、资源管理和组织方法。城市模型与音乐不随 Rain Kit 提供；三渲二与导览目前是可沿用源码，尚未独立成通用包。');

section('03','雨夜技术底层：六条从输入到画面的路径','Three.js 组织资源，TSL 用 JavaScript 节点描述着色器，WebGPU 执行渲染/计算；中文 DOM 面板控制实际对象。');
grid(data.rainPrinciples,3,item=>({title:item.title,fields:[{value:item.mechanism},{value:'观察：'+item.observe,color:C.verified,size:21},{value:'边界：'+item.limit,color:C.muted,size:21}]}));
// Two intentionally simplified, labeled explanatory diagrams, not GPU results.
let diagramBody=txt('遮雨示意：只记最高表面',M+26,y+39,half-52,27,C.ink,600);
diagramBody+=`<path d="M${M+180} ${y+85}v140M${M+290} ${y+85}v140M${M+400} ${y+85}v260" stroke="#7695ad" stroke-width="3" stroke-dasharray="10 9" marker-end="url(#arrow)"/>`;
diagramBody+=rect(M+110,y+205,250,12,'#718778',2,null)+`<path d="M${M+85} ${y+336}h510" stroke="#718778" stroke-width="4"/>`;
diagramBody+=txt('屋檐：最高 Y',M+440,y+215,half-480,23,C.source,500)+txt('地面',M+610,y+342,180,23,C.muted)+txt('XZ → UV → Y；屋檐下雨滴不能仅由最高面推出多层物理。',M+26,y+382,half-52,21,C.muted);
let mirrorBody=txt('反射示意：再渲染一次场景',M+half+GAP+26,y+39,half-52,27,C.ink,600);
const dx=M+half+GAP;
mirrorBody+=`<path d="M${dx+65} ${y+223}h700M${dx+220} ${y+100}L${dx+490} ${y+223}L${dx+220} ${y+345}" stroke="#8ba29b" stroke-width="3" fill="none"/>`;
mirrorBody+=rect(dx+145,y+78,88,50,'#486381',9,null)+rect(dx+145,y+320,88,50,'#b2c3d0',9,null)+rect(dx+570,y+138,100,80,'#bb8294',5,null)+rect(dx+570,y+228,100,80,'#dbc0c9',5,null);
mirrorBody+=txt('主相机',dx+260,y+110,250,22,C.source)+txt('镜像相机',dx+260,y+354,250,22,C.source)+txt('地面平面',dx+686,y+251,190,22,C.muted)+txt('镜像 + 斜裁剪 + 纹理混合；它不是屏幕倒置，也不是水体物理。',dx+26,y+382,half-52,21,C.muted);
parts.push(frame(M,y,half,432,diagramBody),frame(dx,y,half,432,mirrorBody));y+=456;
note(data.rainParameters,C.muted,PALE.source,21);

section('04','三渲二管线：真实 3D，呈现动画背景的观感','樱花风格可以随内容复用，但造型、配色、镜头、灯光和多层渲染都要一起约束。');
grid(data.toonPipeline,5,item=>item);
note('天气樱花街采用 TSL 适配色阶、深度描线与调色；旧 WebGL 页面继续用原管线。新后端保持同一美术语言，不能据此宣称逐像素一致。',C.verified,PALE.verified);

section('05','已经提取的四个模块：公开接口与宿主责任','@research/rain-kit 0.1.0 · 同一份本地 tgz；模块没有固定城市、中文面板、内容系统或模型服务。');
grid(data.modules,2,item=>({title:item.name+' / '+item.api,status:item.status,fields:[{value:'输入：'+item.host,size:22},{value:'接口：'+item.methods,size:21,color:C.source},{value:'复用：'+item.reuse,size:23}]}));
note('固定 Three.js 0.185.1 / three-mesh-bvh 0.9.13；天气与节点材质使用 WebGPURenderer / TSL，renderer 先 await init()。包 private / UNLICENSED，未发公共 npm；保留 MIT 原文与逐项来源。');

section('06',data.integration.title,'天气/湿地/漫游已经从 012 接入 001；水珠仍在独立最小例子中体验。下面是同视角的真实晴雨对照。');
for(const [i,file] of data.integration.files.entries()) {
  const x=M+i*(half+GAP), body=await photo(file,x+14,y+14,half-28,418)+txt(data.integration.captions[i],x+22,y+472,half-44,24,C.verified,500);
  parts.push(frame(x,y,half,515,body));
}
y+=539;
grid(data.integration.points,2,(value)=>({title:'',fields:[{value}]}));
note(data.integration.lifecycle,C.verified,PALE.verified);
note(data.integration.ownership,C.muted,PALE.source,21);

section('07','我们的扩展探索：从研究演示，到可用的用户流程','八张原始实拍，不是生成效果图。晴雨樱花街、原城市中文控制在前文；这里补齐模块、内容、创作与玩法。');
const gw=(INNER-GAP*3)/4;
for(let row=0;row<2;row++) {
  const cards=[];
  for(const [i,item] of data.gallery.slice(row*4,row*4+4).entries()) {
    const x=M+i*(gw+GAP);let body=txt(item.title,x+18,y+34,gw-36,27,C.ink,600);
    body+=await photo(item.file,x+12,y+55,gw-24,245);
    const l=text(item.label,x+18,y+327,gw-36,18,C.verified);body+=l.svg;
    const b=text(item.text,x+18,y+327+l.height+9,gw-36,22);body+=b.svg;
    cards.push({x,body,height:327+l.height+9+b.height+18});
  }
  const h=Math.max(...cards.map(item=>item.height));cards.forEach(item=>parts.push(frame(item.x,y,gw,h,item.body)));y+=h+GAP;
}
y+=16;
note('AI 扩展的分工：场景/输入 → 局面观察 → 模型有限策略 → Schema/时效校验 → 本地规则与连续执行 → 状态反馈。模型不是每帧绘制/碰撞，也不是自动构建整个世界；开发时 Codex 写代码与运行时模型策略是两种用途。',C.verified,PALE.verified);

section('08','用途与可扩展方向：让场景服务一个具体任务','可视背景只是其中一种用途。把“用户要完成什么”写清楚，再选择能力与需要补的业务。');
grid(data.applications,4,item=>({title:item.title,status:item.status,fields:[{value:'用途：'+item.use,size:22},{value:'待补：'+item.next,size:21,color:C.muted}]}));

section('09','对你的价值：形成下一次创作的起点','最直接的价值是可运行的代码、可沿用的风格、可组合的用户流程，以及能回查的判断依据。');
grid(data.personalValues,4,item=>({title:item.title,fields:[{value:item.text},{value:item.action,color:C.verified,size:20}]}));
note(data.valueBoundary,C.planned,PALE.planned);

section('10','下一步与边界：保留能用的成果，按增量推进','已实现、优先完善与后续设想分别列出；授权、性能、模型能力和公开发布各有独立边界。');
grid(data.roadmap,3,item=>item);
grid(data.boundaries,4,item=>item,'planned');
grid(data.evidence,3,item=>item);
note(data.publication,C.muted,PALE.source,21);
for(const source of data.sources) {
  parts.push(`<a href="${E(source.url+'/tree/'+source.commit)}">${txt(source.name+' · '+source.commit,M,y+27,INNER,24,C.source,500)}</a>`);y+=44;
  const l=text(source.license,M,y+22,INNER,22,C.muted);parts.push(l.svg);y+=l.height+16;
}
parts.push(txt('详细说明 / 真实证据：research.html · 本图阅读下载：scene-map.html · 模块 API 与来源资料均在统一入口',M,y+30,INNER,24,C.verified,500));y+=64;
parts.push(txt('中文全图与实拍保留可编辑源文件；概念题图、作者发布图、本机实拍与后续方案已标记。更新 '+data.updatedAt,M,y+24,INNER,21,C.muted));y+=64;
const H=Math.ceil(y);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="atlas-title atlas-desc"><title id="atlas-title">${E(data.title+' · '+data.subtitle)}</title><desc id="atlas-desc">${E(data.thesis+' 十个部分涵盖源库效果、能力分层、六项雨夜技术、三渲二、四模块、跨项目晴雨实拍、八项扩展、应用方向、个人价值、路线/证据/授权。')}</desc><style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC","PingFang SC",sans-serif}a{text-decoration:none}</style>${rect(0,0,W,H,C.paper,0,null)}${parts.join('\n')}</svg>`;
const inputs=Object.fromEntries([...imageInputs].map(([file,value])=>[file,value.sha256]));
if(process.argv.includes('--check')) {
  expect(await readFile(asset('scene-research-map.svg'),'utf8')===svg,'研究全图 SVG 未同步，请重新生成。');
  const manifest=JSON.parse(await readFile(asset('scene-map-export.json'),'utf8'));
  const png=await readFile(asset('scene-research-map.png'));
  const preview=await readFile(asset('scene-map-preview.webp'));
  expect(manifest.svgSha256===hash(svg)&&manifest.pngSha256===hash(png)&&manifest.previewSha256===hash(preview),'PNG / SVG / 预览图未同步，请重新导出。');
  expect(png.readUInt32BE(16)===W*2&&png.readUInt32BE(20)===H*2,'研究全图 PNG 尺寸错误。');
  expect(JSON.stringify(inputs)===JSON.stringify(manifest.inputs),'实拍/概念题图来源已变化，请重新导出。');
  console.log(`研究全图检查通过：10 个部分、${data.gallery.length+data.originals.length+data.integration.files.length} 张实拍/发布图、${W*2} × ${H*2} PNG。`);
  process.exit(0);
}
await writeFile(asset('scene-research-map.svg'),svg,'utf8');
console.log(`研究全图 SVG：${W} × ${H}，内嵌原始图片。`);
if(process.argv.includes('--png')) {
  const index=process.argv.indexOf('--sharp-module'), packagePath=index>=0?process.argv[index+1]:null;
  const require=createRequire(import.meta.url), sharp=packagePath?require(resolve(packagePath)):require('sharp');
  const buffer=Buffer.from(svg);
  await sharp(buffer,{density:144,limitInputPixels:100e6}).png({compressionLevel:9}).toFile(fileURLToPath(asset('scene-research-map.png')));
  await sharp(buffer,{density:72,limitInputPixels:100e6}).extract({left:0,top:0,width:W,height:1340}).resize({width:960}).webp({quality:85}).toFile(fileURLToPath(asset('scene-map-preview.webp')));
  const png=await readFile(asset('scene-research-map.png')), preview=await readFile(asset('scene-map-preview.webp'));
  const manifest={version:1,updatedAt:data.updatedAt,width:W*2,height:H*2,svgWidth:W,svgHeight:H,sections,svgSha256:hash(svg),pngSha256:hash(png),previewSha256:hash(preview),inputs};
  await writeFile(asset('scene-map-export.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(`高清 PNG / 预览已导出：${manifest.width} × ${manifest.height}。`);
}
