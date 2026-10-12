// Deterministic research figure: text, source screenshots and directed information flow.
// Run with Node.js; pass --sharp-dir <node_modules> when sharp is not installed locally.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const assets = path.join(root, 'assets');
const require = createRequire(import.meta.url);
const moduleIndex = process.argv.indexOf('--sharp-dir');
const sharp = moduleIndex >= 0 ? require(path.join(process.argv[moduleIndex + 1], 'sharp')) : require('sharp');
const W = 3600, H = 5000;
const c = { paper:'#f5f7f3', ink:'#173633', muted:'#587068', line:'#d0dcd3', teal:'#087e74', orange:'#ba6639', purple:'#7057a4', dark:'#163332', pale:'#e8f0e9', white:'#ffffff', amber:'#f4eadc', lavender:'#eeeaf5' };
const fragments = [];
const layout = [];
const esc = s => String(s).replace(/[&<>"']/g, k => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[k]));
function rect(x,y,w,h,fill=c.white,stroke=c.line,r=18) { fragments.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`); }
function text(x,y,s,size=32,fill=c.ink,weight=400,maxWidth=W-x-60) {
  fragments.push(`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(s)}</text>`);
  layout.push({x,y,text:s,size,weight,maxWidth});
}
function units(s) { return [...s].reduce((n,ch) => n + (/[^\u0000-\u00ff]/.test(ch) ? 1 : /[MW@]/.test(ch) ? .86 : .57),0); }
function lines(s,width,size) {
  const result=[];
  for (const paragraph of s.split('\n')) {
    let line='';
    for(const ch of paragraph) { if (units(line+ch)*size > width && line) {result.push(line);line='';} line+=ch; }
    result.push(line);
  }
  return result;
}
function para(x,y,width,s,size=32,lineHeight=48,fill=c.muted,weight=400) {
  const ls=lines(s,width,size); ls.forEach((l,i)=>text(x,y+i*lineHeight,l,size,fill,weight,width)); return y+ls.length*lineHeight;
}
function heading(y,number,title,sub='') {
  text(80,y,number,34,c.teal,600,140);
  text(215,y,title,46,c.ink,600,2500);
  if(sub) text(3520-units(sub)*29,y,sub,29,c.muted,400,units(sub)*29+10);
}
function pill(x,y,label,fill,ink) { const width=units(label)*27+42;rect(x,y,width,48,fill,'none',10);text(x+21,y+34,label,27,ink,500,width-42);return width; }
function arrow(points,color=c.teal,dashed=false) {
  fragments.push(`<path d="${points}" fill="none" stroke="${color}" stroke-width="5" ${dashed?'stroke-dasharray="12 9"':''} stroke-linejoin="round" stroke-linecap="round" marker-end="url(#arrow-${color===c.orange?'orange':color===c.purple?'purple':'teal'})"/>`);
}
function node(x,y,w,h,title,body,fill=c.white,titleColor=c.ink) {
  rect(x,y,w,h,fill);text(x+27,y+49,title,34,titleColor,600,w-54);para(x+27,y+96,w-54,body,29,41,c.muted);
}
function screenshot(x,y,w,h,name,roi) {
  const bytes=fs.readFileSync(path.join(assets,name));
  // Browser screenshot APIs can return JPEG bytes even when the saved filename ends in .png.
  const mime=bytes[0]===0xff && bytes[1]===0xd8 ? 'image/jpeg' : 'image/png';
  const box=roi || [0,0,1265,712];
  const scale=Math.min(w/box[2],h/box[3]);
  const left=x+(w-box[2]*scale)/2-box[0]*scale;
  const top=y+(h-box[3]*scale)/2-box[1]*scale;
  const id=`image-clip-${name.replace(/[^a-z0-9]/g,'-')}`;
  fragments.push(`<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><image x="${left}" y="${top}" width="${1265*scale}" height="${712*scale}" clip-path="url(#${id})" xlink:href="data:${mime};base64,${bytes.toString('base64')}"/>`);
}
function card(x,y,w,h,title,body,tag='',tone=c.teal) {
  rect(x,y,w,h);text(x+30,y+57,title,38,c.ink,600,w-60);
  if(tag) pill(x+30,y+83,tag,tone===c.orange?c.amber:tone===c.purple?c.lavender:c.pale,tone);
  para(x+30,y+(tag?184:115),w-60,body,32,49);
}

// Heading: the distinction between perception, geometry and execution is explicit.
text(80,82,'011 / 三维交互理解研究',29,c.teal,600,2000);
text(80,177,'Segment–Snap 研究总览',84,c.ink,600,3300);
text(80,245,'从实物三维扫描，获得可动部件、运动轴与操作把手',43,c.ink,500,3300);
text(80,303,'核心理解：学习发现部件，关系消除歧义，几何输出运动描述；执行与反馈由下一层补充。',33,c.muted,400,3440);
let legendX=80;
legendX+=pill(legendX,329,'作者效果与指标',c.pale,c.teal)+22;
legendX+=pill(legendX,329,'我们的本地示意 · 已验证',c.amber,c.orange)+22;
pill(legendX,329,'应用与扩展 · 研究推断',c.lavender,c.purple);
text(2920,363,'汇总日期 2026-10-12',28,c.muted,400,600);

heading(433,'01','源库效果与我们的探索效果','真实截图作为模块 · 保留来源');
const effectY=473, effectH=555;
for(const x of [80,1240,2400]) rect(x,effectY,1120,effectH);
text(110,528,'作者公开预测：室内可动部件与运动轴',34,c.teal,600,1060);
screenshot(110,554,1060,340,'showcase-desktop.png',[603,250,599,285]);
para(110,923,1060,'场景 01：展示 15 个预测，10 个同时匹配部件与运动；有 31 个标注部件，仍有遗漏。作者选择的有利案例。',29,42);
text(1270,528,'本地柜门：把手引导铰链侧',34,c.orange,600,1060);
rect(1270,554,1060,340,c.dark,'none',8);
screenshot(1270,554,1060,340,'lab-door.png',[47,0,720,620]);
para(1270,923,1060,'把手在左 → 候选铰链在右；可切换四层输出、关闭引导、选择无把手、播放与复位。90° 为展示设定。',29,42);
text(2430,528,'本地抽屉：沿表面法线平移',34,c.orange,600,1060);
rect(2430,554,1060,340,c.dark,'none',8);
screenshot(2430,554,1060,340,'lab-drawer.png',[47,99,720,522]);
para(2430,923,1060,'切换抽屉后，平移轴与滑杆同步更新；已验证到 60 cm。点云由本页生成，属于原理示意，无模型推理。',29,42);

// Numeric evidence: AP percentages, never robot success rates.
heading(1095,'02','作者报告的效果证据','固定版本验证集 · 非本机实测');
const statX=[80,960,1840,2720];
const stats=[
 ['运动综合 AP','13.74 → 40.98','+27.25 个百分点','固定掩码、类别、分数与轴；仅改变旋转铰链原点规则。'],
 ['把手 AP：增加候选','24.63 → 29.65','+5.01 个百分点','保留密集检测，追加联合模型的把手候选。'],
 ['把手 AP：类别修正','29.65 → 30.99','+1.34 个百分点','仅部件修正为 +0.98；完整规则还含密集类别回退。'],
 ['数据与指标口径','195 / 42','训练 / 验证场景','验证参与模型与参数选择；\nAP 不是操作成功率，各项增益不能相加。\n增益按未四舍五入的分数计算。']
];
stats.forEach((s,i)=>{rect(statX[i],1130,840,280,c.pale);text(statX[i]+28,1179,s[0],30,c.muted,500,784);text(statX[i]+28,1241,s[1],47,c.teal,600,784);text(statX[i]+28,1284,s[2],29,c.teal,500,784);para(statX[i]+28,1326,784,s[3],26,37);});

heading(1450,'03','能力与输入输出','扫描感知 → 操作语义');
card(80,1484,840,277,'输入：已有的实物扫描','XYZ · RGB · 表面法线\n米制，坐标与点序需对齐。\n图片或任意 3D 文件需满足输入条件。');
card(960,1484,840,277,'部件：哪里可以动','实例掩码、运动类别、置信度。\n例如柜门与抽屉；类别描述旋转或平移，而非一般物体名称。');
card(1840,1484,840,277,'运动：怎样运动','运动轴方向与轴上代表点。\n旋转绕铰链，平移沿方向；范围、完整轨迹与力度需另做。');
card(2720,1484,840,277,'把手：从哪里操作','把手实例掩码、类别、分数。\n类别表示它控制的部件怎样动；提供操作区域线索。');

// The directed graph follows upstream METHOD.md; no final-handle feedback edge.
heading(1838,'04','底层原理：三个学习预测器 + 固定几何与语义规则','共享架构家族 · 独立权重');
rect(80,1875,3440,965,c.white);
rect(705,1956,780,662,c.pale,'none');
text(732,1930,'三个模型分别训练，推理后组合',29,c.teal,500,780);
node(115,2190,435,255,'对齐场景点云','坐标 · 颜色 · 法线\n提供两个对齐视图\n输入已是三维扫描',c.pale);
node(730,1990,730,170,'P · 独立部件预测器','Volt-B + 200-query SPFormer\n超点上预测最终部件与运动类别');
node(730,2200,730,170,'D · 密集把手预测器','逐点分类，再聚成把手实例\n小区域保留细粒度位置');
node(730,2410,730,170,'J · 联合部件与把手预测器','自身部件 query + 细体素特征\n提出更多 child 把手候选');
node(1710,1980,900,300,'G · 免训练几何解码','拟合可靠表面，构造候选铰链\n旋转轴默认世界 Z；平移轴取表面法线\n附近把手 → 选择更远的候选铰链\n无附近把手 → 回退到支撑中心',c.pale,c.teal);
node(1710,2450,900,175,'U · 保留密集检测，追加新候选','联合 child 候选加入把手集合\n联合模型不读取 P 的已保存掩码',c.pale,c.teal);
node(2790,2030,640,170,'输出：部件 + 运动','掩码 / 类别 / 分数\n轴方向 / 轴上代表点',c.pale,c.teal);
node(2790,2380,640,208,'C · 新增把手类别修正','独立部件语义提供上下文\n密集把手类别作为回退\n仅改新增类别，掩码与分数不变',c.pale,c.teal);
node(2790,2680,640,130,'输出：最终把手实例','密集把手 + 修正后的新增候选',c.pale,c.teal);
arrow('M550 2317 H640 V2075 H720');
arrow('M640 2317 V2285 H720');
arrow('M640 2317 V2495 H720');
arrow('M1460 2075 H1700');
arrow('M1460 2285 H1590 V2190 H1700',c.orange);
text(1479,2346,'把手位置',27,c.orange,500,220);
arrow('M1460 2285 H1640 V2500 H1700',c.orange);
arrow('M1460 2495 H1560 V2580 H1700',c.teal);
arrow('M2610 2130 H2780');
arrow('M3110 2200 V2370');
text(3136,2292,'部件类别',26,c.teal,500,270);
arrow('M2610 2535 H2720 V2480 H2780');
arrow('M3110 2588 V2670');
arrow('M1460 2285 H1510 V2820 H3490 V2510 H3440',c.orange,true);
text(1730,2791,'密集类别回退证据',26,c.orange,500,640);
text(115,2780,'两种信息方向各执行一次：把手帮助运动几何，部件帮助把手语义。',28,c.muted,400,1340);

heading(2905,'05','几何规则与方法本质','小线索消歧 · 规则条件可检查');
rect(80,2940,3440,210,c.pale);
text(112,2997,'拟合流程',31,c.teal,600,230);
para(345,2997,3120,'最大连通支撑 → PCA 找薄方向 → 投影凸包最小面积矩形 → 包围盒四条候选铰链线',32,47,c.ink);
text(112,3064,'把手关联',31,c.orange,600,230);
para(345,3064,3120,'把手中心到部件支撑距离 < 0.5 m 的最近把手 → 选离把手最远的候选线 → 部件中心投影到轴上作为原点',31,46,c.ink);
text(112,3120,'本质：把几何组织成带操作线索的部件；关系减少歧义，明确规则提高可检查性。最终把手不反馈到运动解码。',30,c.muted,400,3370);

heading(3220,'06','价值、使用场景与对你的价值','以下是研究判断 · 迁移效果待验证');
card(80,3255,1120,538,'方法与工程价值','小区域能排除大结构的歧义。\n学习负责发现，规则负责组合与约束。\n能区分检测、关联、几何假设的错误。\n固定输入的对照，帮助判断增益来自哪一环。\n漏检仍需改善感知，几何规则补不回漏检。','值得借鉴的设计方式',c.teal);
card(1240,3255,1120,538,'可能的应用场景','扫描资产：自动提出交互标注，再人工校正。\n数字孪生：补充关节与操作区域候选。\n机器人感知：提供部件与把手线索。\n教育与研究：展示感知、几何和语义的连接。\n产品收益取决于资产需求、质量和校正成本。','应用方向 · 非已验证产品',c.purple);
card(2400,3255,1120,538,'对你的直接价值','001 樱花小街：为门、按钮定义统一动作。\n002 游戏 / Agent：对象、条件、执行、反馈。\n004 资产系统：共享部件与交互描述。\n玩家和 NPC 可共用操作接口。\n程序化资产已知几何，优先直接定义描述。','迁移建议 · 尚未接入',c.purple);

heading(3870,'07','可扩展路线：先复用描述与接口，再扩大感知范围','路线是规划 · 不代表已完成');
const road=[
 ['A / 当前最贴近需求','对象与动作描述','部件 ID、运动类型、轴、原点、操作区域；补范围、状态和动作条件。'],
 ['B / 验证完整任务','引擎与 Agent 接口','选择对象 → 检查距离与条件 → 执行动作 → 返回成功或受阻，继续任务。'],
 ['C / 有扫描资产需求时','校正工作台与导出','人工修正掩码、轴、把手；导出到 Three.js 等引擎，验证坐标和交互效果。'],
 ['D / 研究复杂机构时','更广泛的运动理解','非竖直轴、多帧观测、范围估计；机器人另需抓取、碰撞、力控与反馈。']
];
road.forEach((r,i)=>{const x=80+i*880;rect(x,3905,840,320,c.lavender);text(x+28,3958,r[0],28,c.purple,600,784);text(x+28,4021,r[1],36,c.ink,600,784);para(x+28,4082,784,r[2],31,46);});
text(80,4282,'可探索任务：小街 NPC 打开柜门取物；检查对象选择、动作条件、受阻处理与反馈利用。这是方案，尚未实作。',32,c.muted,400,3440);

heading(4360,'08','能力边界与我们的验证范围','推断运动线索 → 后续系统执行');
card(80,4395,1700,294,'源库能力边界','主要面向近似平面、竖直铰链的室内机构。斜轴、缺失把手、破碎扫描与漏检可能失败。\n未提供完整轨迹、运动范围、抓取姿态、力度或已验证机器人操作。');
card(1820,4395,1700,294,'本项目已完成与尚未完成','已完成中文研究、作者效果对照、柜门/抽屉示意、交互验证与静态构建。\n未运行上游 GPU 模型，未产生新的模型预测，未接入其他项目。本阶段聚焦原理与价值。');

// Source strip preserves exact source paths; the PNG remains a standalone figure.
text(80,4721,'AP50 检查掩码 IoU > 0.5；运动综合另检查轴误差 < 15° 与旋转原点 < 0.25 m，平移原点不参与。部件 AP50 = 47.93。',25,c.muted,400,3440);
text(80,4760,'来源与版本',31,c.teal,600,800);
text(80,4810,'上游：github.com/HyoKong/Segment-Snap  ·  源码 67ccf8765a9c409ad400ae4d6ed151f9449c8ed9',29,c.muted,400,3440);
text(80,4854,'方法：docs/METHOD.md  ·  证据：docs/RESULTS_VAL.md  ·  本地：notes/essence-and-value.md、notes/verification.md',28,c.muted,400,3440);
text(80,4898,'作者效果截图保留作者与原媒体权利；主仓库 MIT 不自动覆盖效果页媒体。本地图例、布局和分析为本项目研究内容。',28,c.muted,400,3440);
text(80,4942,'图中效果画面均来自已有实际网页截图，未重新生成预测画面。算法细节核查于 2026-10-11，汇总图编制于 2026-10-12。',28,c.muted,400,3440);

const defs=`<defs>${[['teal',c.teal],['orange',c.orange],['purple',c.purple]].map(([key,col])=>`<marker id="arrow-${key}" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L9 5 L0 10" fill="${col}"/></marker>`).join('')}</defs>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><title>Segment–Snap 能力 原理 效果 价值与扩展研究总览</title><desc>作者公开预测与三个独立训练预测器的单向连接，本地柜门和抽屉几何示意，作者 AP 对照、输入输出、应用价值、个人项目迁移路线及验证边界。</desc>${defs}<rect width="${W}" height="${H}" fill="${c.paper}"/><g font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif">${fragments.join('\n')}</g></svg>`;
fs.writeFileSync(path.join(assets,'research-overview.svg'),svg);
const info=await sharp(Buffer.from(svg)).png().toFile(path.join(assets,'research-overview.png'));
await sharp(path.join(assets,'research-overview.png')).resize({width:1440}).png().toFile(path.join(assets,'research-overview-preview.png'));
fs.writeFileSync(path.join(assets,'research-overview-layout.json'),JSON.stringify({width:W,height:H,date:'2026-10-12',sourceScreenshots:['showcase-desktop.png','lab-door.png','lab-drawer.png'],text:layout},null,2)+'\n');
console.log(JSON.stringify({width:info.width,height:info.height,bytes:info.size,textLines:layout.length,png:'assets/research-overview.png',svg:'assets/research-overview.svg'}));
