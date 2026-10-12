/** 将研究内容与原始实拍排成一张原生信息图，并导出 SVG / PNG。 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import puppeteer from 'puppeteer-core';

const project = fileURLToPath(new URL('../../', import.meta.url));
const assets = path.join(project, 'assets');
const width = 3840;
const png = path.join(assets, 'research-hub-overview.png');
const svg = path.join(assets, 'research-hub-overview-source.svg');
const executablePath = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
if (!executablePath) throw new Error('需要本地 Edge 才能导出研究图。');
const safe = text => text.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const photo = (file, title, state) => {
 const image = fs.readFileSync(path.join(assets,file)).toString('base64');
 return '<figure><img src="data:image/png;base64,'+image+'" alt="'+safe(title)+'"><figcaption><b>'+safe(title)+'</b><span>'+safe(state)+'</span></figcaption></figure>';
};
const head = (number,title,state,kind='upstream') => '<div class="card-head"><span class="number">'+number+'</span><h2>'+title+'</h2>'+(state?'<span class="badge '+kind+'">'+state+'</span>':'')+'</div>';
const list = items => '<ul>'+items.map(item=>'<li>'+item+'</li>').join('')+'</ul>';
const categories = [['步兵',12],['武器',14],['装备',16],['车辆',7],['装甲',15],['火炮',5],['飞机',5]];
const countries = [['德国',20],['苏联',18],['美国',16],['英国',16],['日本',3],['意大利',1]];
const css = `
*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:"Microsoft YaHei","Noto Sans SC",sans-serif;color:#263728}
#poster{width:3840px;padding:74px;background:#f4f2e9;font-family:"Microsoft YaHei","Noto Sans SC",sans-serif;color:#263728}
p{margin:0;line-height:1.62}h1,h2,h3{margin:0}ul{padding:0 0 0 35px;margin:0}li{margin:12px 0;line-height:1.65}
.header{display:grid;grid-template-columns:1fr 570px;gap:70px;margin-bottom:40px}
.kicker{font-size:30px;color:#77816b;letter-spacing:4px;font-weight:600}
h1{font-size:92px;letter-spacing:-2px;line-height:1.28;margin:10px 0 20px}
h1 em{font-style:normal;color:#77853c;font-size:104px;letter-spacing:8px}
.subtitle{font-size:36px;color:#63705d}
.definition{margin-top:23px;font-size:32px;font-weight:600}.definition small{display:block;font-size:29px;font-weight:400;color:#697363;margin-top:9px}
.header-side{display:flex;flex-direction:column;justify-content:space-between;padding:6px 0}
.research-tag{font-size:28px;color:#667256}.research-tag strong{font-size:56px;display:block;line-height:1.25;margin-bottom:12px;color:#334635}
.legend{display:grid;gap:12px}.legend span{font-size:27px;display:flex;align-items:center;gap:16px}.dot{width:16px;height:16px;border-radius:50%;display:inline-block}
.dot.upstream{background:#718139}.dot.local{background:#3d888b}.dot.future{background:#89938a}
.columns{display:grid;grid-template-columns:1.04fr 1.36fr 1fr;gap:30px;align-items:stretch}
.column{display:flex;flex-direction:column;gap:30px}
.card{padding:33px 35px;border:2px solid #dce0d1;border-radius:16px;background:#fcfcf6;overflow:hidden}
.card.local-card{border-top:8px solid #5c9090;padding-top:27px}.card.future-card{border-top:8px solid #929c8c;padding-top:27px}
.card-head{display:flex;align-items:center;gap:13px;flex-wrap:wrap;margin-bottom:23px}
.number{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border:2px solid #aeb898;border-radius:50%;font-size:23px;flex-shrink:0;color:#738047}
h2{font-size:40px;line-height:1.35;letter-spacing:-.5px}.badge{font-size:23px;padding:6px 13px;border-radius:7px;white-space:nowrap;background:#edf0dd;color:#566323}
.badge.local{background:#e2f0ec;color:#2e7374}.badge.future{background:#e8ece8;color:#667062}
.body{font-size:30px}.muted{font-size:25px;color:#6e7866;line-height:1.6}
.data-title{display:flex;gap:20px;align-items:baseline;margin-bottom:13px}.big-number{font-size:82px;color:#71813b;font-weight:700;line-height:1}.data-title span{font-size:32px}
.stats{display:flex;gap:10px;flex-wrap:wrap;margin:17px 0}.stat{font-size:26px;background:#edf0e4;border-radius:8px;padding:11px 15px}.stat strong{color:#667630;font-size:29px;margin-left:12px}
.country{font-size:25px;color:#62715a;line-height:1.75;margin:13px 0 20px}
figure{margin:20px 0 16px;overflow:hidden;border:2px solid #d9ddcf;border-radius:10px;background:#eeede4}
figure img{display:block;width:100%;height:auto}
figcaption{padding:12px 17px;display:flex;justify-content:space-between;gap:15px;align-items:center;background:#edf0e6;color:#5c6953;font-size:23px}
figcaption b{font-weight:600}figcaption span{font-size:21px;white-space:nowrap}
.photos{display:grid;grid-template-columns:1fr 1fr;gap:17px}.photos figure{margin-top:12px}
.photos figcaption{display:block;line-height:1.5;padding:10px 13px}.photos figcaption span{display:block}
.lead{padding:16px 20px;background:#e9f0df;border-radius:8px;font-size:28px;line-height:1.55;margin:17px 0}
.local-card .lead{background:#e7f1ec;color:#386366}
.pipeline{display:grid;grid-template-columns:1fr 1fr;gap:17px;margin-bottom:24px}
.pipeline div{padding:15px 18px;background:#edf0e4;border:1px solid #dce2ce;border-radius:9px;font-size:27px;line-height:1.55}
.pipeline small{display:block;color:#82915e;font-size:21px;margin-bottom:2px}
.pipeline div:after{content:" →";color:#859262}.pipeline div:last-child:after{content:""}
.principle-items p{font-size:28px;margin:13px 0;line-height:1.65}
.principle-items strong{color:#536d48}
.sub-columns{display:grid;grid-template-columns:1fr 1fr;gap:25px}
.sub-columns h3{font-size:32px;padding-bottom:12px;border-bottom:2px solid #d8e2d5;margin-bottom:15px;color:#366b6b}
.sub-columns .body{font-size:28px}.sub-columns li{margin:9px 0;line-height:1.58}
.phase{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 20px}.phase span{background:#e5eeea;padding:9px 12px;border-radius:6px;color:#456e65;font-size:25px}
.cooperate{background:#edf0df;border-left:6px solid #95a66c;padding:16px 20px;margin-top:18px;font-size:28px;line-height:1.65}
.web-links{display:flex;gap:9px;flex-wrap:wrap;margin:16px 0}.web-links span{font-size:22px;padding:8px 12px;border:1px solid #bdcec1;border-radius:6px;color:#5c7864}
.usage-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px;margin:8px 0 20px}
.usage{padding:20px 18px;min-height:150px;border:1px solid #dce2ce;border-radius:10px;background:#f0f3e7}
.usage small{display:block;font-size:22px;color:#84905d;margin-bottom:13px}.usage strong{font-size:29px;line-height:1.5;display:block}.usage p{font-size:24px;color:#6d775f;margin-top:9px}
.value-item{border-bottom:1px solid #dfe4d6;padding:18px 0 24px}.value-item:first-of-type{padding-top:0}.value-item:last-of-type{border:0}
.value-item h3{font-size:32px;color:#536d44;margin-bottom:9px}.value-item p{font-size:29px}
.personal{padding:20px 23px;background:#eaf0e2;border-radius:9px;font-size:28px;line-height:1.7;margin-top:16px}
.roadmap{border-left:3px solid #bac5b4;margin:18px 0 22px 13px;padding-left:25px}
.roadmap article{position:relative;padding-bottom:28px}.roadmap article:last-child{padding-bottom:0}
.roadmap article:before{content:"";position:absolute;left:-35px;top:9px;width:17px;height:17px;background:#97a890;border:3px solid #fcfcf6;border-radius:50%}
.roadmap h3{font-size:32px;margin:12px 0 9px;color:#52654b}.roadmap p{font-size:29px;line-height:1.7}
.roadmap small{display:block;font-size:23px;color:#858f7d;letter-spacing:1px}
.tier{display:inline-block;font-size:22px;color:#677363;background:#e7ece4;padding:5px 11px;border-radius:6px}
.checks{display:flex;gap:20px;margin:12px 0 24px}.check{flex:1;background:#e9f0e1;border-radius:10px;padding:20px 23px}.check strong{font-size:64px;line-height:1;color:#71873f}.check span{display:block;font-size:25px;color:#5d7052;margin-top:9px}
.proof-list{font-size:27px;line-height:1.65}.proof-list p{margin:12px 0}.proof-list b{color:#566f44}
.footer{border-top:2px solid #c9d2bf;margin-top:38px;padding-top:27px;display:grid;grid-template-columns:1.25fr 1fr;gap:30px;color:#69745f;font-size:25px;line-height:1.75}
.footer strong{color:#445741}.source-address{font-family:Arial,sans-serif;letter-spacing:.5px;color:#52674e;font-size:28px}
.fill{flex:1}
`;
const html = '<div id="poster" xmlns="http://www.w3.org/1999/xhtml">'+
'<header class="header"><div><div class="kicker">004 / MUSTER RESEARCH MAP</div><h1><em>MUSTER</em><br>从程序化模型，到可玩的协同任务</h1><p class="subtitle">能力 · 资源 · 底层原理 · 实际探索 · 场景 · 价值 · 扩展</p><div class="definition">核心定位：代码生成的二战 3D 资产库 + 配置展柜 + 场景编辑系统<small>模型由开发者编写的函数生成；新增资产仍需建模。未接入 AI 文生 3D 或扫描重建。</small></div></div><aside class="header-side"><div class="research-tag"><strong>理解全景 / 实拍参考</strong>从上游研究，到本地可运行<br>2026-10-12 阶段汇总</div><div class="legend"><span><i class="dot upstream"></i>上游已有 · 素材系统</span><span><i class="dot local"></i>本地已实现 · 场景与玩法</span><span><i class="dot future"></i>后续建议 · 待开发与验证</span></div></aside></header>'+
'<main class="columns">'+
'<div class="column">'+
'<section class="card">'+head('01','资源｜74 个公开资产','上游已有')+'<div class="data-title"><strong class="big-number">74</strong><span>资产定义 / 7 类 / 6 国</span></div><div class="stats">'+categories.map(([k,v])=>'<span class="stat">'+k+'<strong>'+v+'</strong></span>').join('')+'</div><p class="country">'+countries.map(([k,v])=>k+' '+v).join(' / ')+'</p>'+photo('cover.png','原版展柜 · 默认展示','本地复现实拍')+'<p class="body">包含 TypeScript 建模代码、程序化材质、可选配置、资料卡与来源记录。</p><div class="lead">默认 280 个实例，展示上限 300。<br><span class="muted">这是界面设置，不是跨设备性能承诺。</span></div></section>'+
'<section class="card">'+head('02','能力｜可配置、可编辑、可审查','上游已有')+photo('panzer-fitted.png','四号坦克 · 六视图与参照人','本地审查实拍')+'<div class="body">'+list(['国家 / 类别 / 关键词检索，查看资料与来源','装备、材质与姿态选项，兼容约束避免错误组合','数量、编队、间距，整组与单体偏移','拖动、旋转、复制；撤销 / 重做','本机保存布局与相机；六视图 + 1.80 米参照人'])+'</div><p class="muted">配置改变真实几何；六视图辅助检查外形、比例与贴地。</p></section>'+
'<section class="card fill">'+head('03','原理｜从协议到可见场景','实现分析')+'<div class="pipeline">'+['AssetDef 资产协议','配置与兼容约束','几何 / 人体','合并与缓存','Three.js 渲染','场景编辑 / 本机保存'].map((t,i)=>'<div><small>0'+(i+1)+'</small>'+t+'</div>').join('')+'</div><div class="principle-items"><p><strong>机械几何：</strong>圆角盒、旋转体、挤出、放样与重复部件。</p><p><strong>人体几何：</strong>SDF + Surface Nets 生成网格，IK 调整姿态。</p><p><strong>程序化材质：</strong>噪声、三平面 PBR、边缘磨损。</p><p><strong>画面：</strong>光照 / 阴影 / N8AO 环境遮蔽 / SMAA 抗锯齿。</p><p><strong>工程取舍：</strong>按材质合并并缓存；可动部件由本地动作层重新组织。</p></div><div class="lead">最终场景并非全部 GPU 实例化。<br>资产、画面和游戏规则分层构建。</div><p class="muted">本地动作层验证：部件收放由统一演示时间驱动。</p><div class="photos">'+photo('fieldcamp-realism-gear-down.png','起落架展开 / 进场','本地动作实拍')+photo('fieldcamp-realism-gear-up.png','起落架收起 / 巡航','本地动作实拍')+'</div></section>'+
'</div>'+
'<div class="column">'+
'<section class="card local-card">'+head('04','探索①｜营地 → 动作与声音','本地已实现','local')+'<p class="body">让已有素材从“陈列”进入一个可布置、可运转的微缩场景。</p><div class="photos">'+photo('fieldcamp-overview.png','野战机场与集结营地','原始运行实拍')+photo('fieldcamp-realism-convoy.png','装甲、步兵与车队','动作阶段实拍')+'</div><div class="lead">8 类原素材 / 26 个实例：2 飞机 · 5 车辆 · 2 火炮 · 17 人员</div><div class="body">'+list(['新增机场、道路、机库、帐篷、树木、沙袋与补给道具','真实模型配置、编队编辑、本机保存、布局 JSON 导入 / 导出','90 秒循环：车辆行驶、士兵巡逻；飞机滑行 → 起飞 → 巡航 → 降落','车轮与逐节履带转动；两段腿 IK 步态；螺旋桨、起落架与舱门','Web Audio 合成发动机与脚步声，带距离衰减、静音与音量控制','暂停同时冻结动作与声音；支持重播、倍速、时间轴和飞机跟随'])+'</div><p class="muted">概念场地与起降距离经过压缩，动作按路径与时间驱动。</p></section>'+
'<section class="card local-card">'+head('05','探索②｜陆空协同 → 机场保卫战','本地可玩','local')+'<div class="photos">'+photo('battle-combined-combat.png','自由演习 · 陆空交火','原始运行实拍')+photo('airport-wave-two.png','机场任务 · 第二波防守','原始运行实拍')+'</div><div class="sub-columns"><div><h3>自由演习 / 3 分钟</h3><div class="body">'+list(['谢尔曼 / M18 / 吉普三车切换，各自保存耐久与位置','步兵移动与交火，飞机空袭、炮弹装填与范围伤害','A* 寻路、连续碰撞、掩体与视线','占领通信区或击退对手；失效后自动接管幸存车辆','暂停冻结车辆、步兵、飞机、炸弹、冷却与声音'])+'</div></div><div><h3>机场保卫战 / 6 分钟</h3><div class="body">'+list(['两班步兵：移动 / 驻守 / 跟随，阵地减伤','吉普侦察，共享真实视线；装卸并运送 2 箱补给','有限弹药、友军补给恢复、2 次有限 P-51 空袭','两波防守后送达机场物资，由步兵警戒 8 秒','轻松模式已实际打通；规则电脑与任务状态机'])+'</div></div></div><div class="phase"><span>01 侦察</span><span>→ 02 部署与补给</span><span>→ 03 两波防守</span><span>→ 04 恢复机场</span></div><div class="cooperate"><b>协作闭环：</b>吉普发现目标 → 友军共享视野 → 小队控制通道 → 装甲与空袭支援 → 补给维持战斗 → 恢复机场。</div><p class="muted" style="margin-top:19px">5 个真实应用 / 8 个网页入口，已接入研究首页；保留完整笔记、实拍、声音与原始报告。</p><div class="web-links">'+['原版展柜','六视图','动态营地','自由演习','机场任务'].map(t=>'<span>'+t+'</span>').join('')+'</div></section>'+
'<section class="card fill">'+head('09','验证与边界｜让画面和结论对应','实际证据')+'<div class="checks"><div class="check"><strong>14</strong><span>机场任务规则测试</span></div><div class="check"><strong>18</strong><span>协同演习规则测试</span></div></div><div class="proof-list"><p><b>已验证：</b>本地构建、实际浏览器流程、同步暂停与声音；机场轻松模式完整通关。</p><p><b>能力边界：</b>模型为近似米制比例；微缩概念场景，尚无真实飞行物理、完整骨骼蒙皮或大模型指挥。</p><p><b>待验证：</b>全资产 / 全配置、真实手机与低端设备、标准模式完整通关、在线部署。</p></div></section>'+
'</div>'+
'<div class="column">'+
'<section class="card">'+head('06','场景｜这些能力可用在哪里','应用判断')+'<div class="usage-grid">'+[
['01','数字博物馆 / 教学','模型、资料、比例与讲解'],
['02','收藏陈列 / 规划','组合、编队和场景布局'],
['03','装备展示 / 配置器','选项、兼容规则与对照'],
['04','通用主题场景工具','可维护的资产与模板'],
['05','游戏 / 协同任务原型','把单位关系变成玩法'],
['06','资产质量审查','六视图、比例与配置检查']
].map(([n,t,d])=>'<div class="usage"><small>USE '+n+'</small><strong>'+t+'</strong><p>'+d+'</p></div>').join('')+'</div><p class="muted">已有原型提供技术依据；教学效果、商业转化和用户收益仍需验证。</p></section>'+
'<section class="card">'+head('07','价值｜下一次创作的起点','对我们的价值')+'<div class="value-item"><h3>内容资产</h3><p>已有军事素材与场景模板，可组合新关卡、微缩空间和专题展示。</p></div><div class="value-item"><h3>工程资产</h3><p>统一资产接口、配置兼容规则、稳定编队槽位与个体偏移，以及编辑 / 撤销 / 存档流程。</p></div><div class="value-item"><h3>研究资产</h3><p>固定版本、来源记录、六视图与实际运行证据，让“是否能复用”有据可查。</p></div><div class="personal"><b>对樱花街 / 小镇搭建器：</b><br>借鉴资产接入与成组编辑，保留原有三渲二风格，重新控制几何和材质预算。<br><span class="muted">跨项目接入仍是建议，尚未实际完成。</span></div><p class="muted" style="margin-top:20px">已有探索资产：动作与补给真实进入场景和任务。</p><div class="photos">'+photo('fieldcamp-realism-patrol.png','士兵巡逻 / 步态','原始运行实拍')+photo('airport-supply-loaded.png','吉普装载两箱补给','原始运行实拍')+'</div></section>'+
'<section class="card future-card fill">'+head('08','扩展｜从玩法到通用系统','后续建议','future')+'<p class="body">先完善可玩的任务闭环，再把稳定方法提取为工具；以下方向均未记作已实现。</p><div class="roadmap"><article><span class="tier">近期玩法 / 待开发</span><h3>任务更丰富，协作更必要</h3><p>伤员救援、稀缺补给与路线、支线目标、敌方波次配置、更多可组合任务。</p></article><article><span class="tier">通用工具 / 待提取</span><h3>把一次原型变成工作台</h3><p>任务 / 关卡编辑器；独立资产协议、配置器、编队编辑与质量审查工具；接入小镇项目。</p></article><article><span class="tier">深入工程 / 待验证</span><h3>规模、交换与多人能力</h3><p>LOD、真正 GPU 实例化、生成缓存与设备预算；GLB 导出、骨骼蒙皮、车辆 / 飞行物理、多人同步。</p></article></div><div class="lead">本地可运行 / 尚未部署<br><span class="muted">性能优化、跨项目复用和在线发布，均需逐项验证。</span></div><p class="muted">推荐验证顺序：一个完整任务 → 一套通用接口 → 一次独立接入 → 目标设备实测。</p><div class="personal"><b>建议怎样落地复用</b><br>1. 定义资产 ID、选项与构建函数。<br>2. 将外观配置与单位运行状态分开。<br>3. 保留编队槽位、存档与来源记录。<br>4. 用新主题场景和质量审查验证接口。<br><span class="muted">这是提取路线，尚未形成独立通用包。</span></div></section>'+
'</div></main>'+
'<footer class="footer"><div><strong>上游来源与固定研究版本</strong><br><span class="source-address">github.com/Kenton-GMI/muster-ww2</span><br>7d2fa86ebc3b999eaf085831cdcd5dccefea63d4 · MIT · Kenton Wang</div><div><strong>本图口径 / 2026-10-12</strong><br>本地程序排版信息图，嵌入 10 张原始运行截图；不是新的应用截图。<br>上游能力、本地扩展与后续建议分开标注；详细原图、笔记与报告另存。</div></footer>'+
'</div>';
let browser;
try {
 browser = await puppeteer.launch({executablePath,headless:true,defaultViewport:{width,height:1800,deviceScaleFactor:1},args:['--no-first-run','--hide-scrollbars']});
 const page=await browser.newPage();
 await page.setContent('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+html+'</body></html>',{waitUntil:'load'});
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
 const height=await page.$eval('#poster',el=>Math.ceil(el.getBoundingClientRect().height));
 const serialized=await page.$eval('#poster',el=>new XMLSerializer().serializeToString(el));
 const xml='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><title>Muster 中文研究总览</title><desc>九个理解模块与十张原始运行截图，程序排版；上游能力、本地探索和后续建议分开说明。</desc><foreignObject width="'+width+'" height="'+height+'"><div xmlns="http://www.w3.org/1999/xhtml"><style>'+safe(css)+'</style>'+serialized+'</div></foreignObject></svg>';
 fs.writeFileSync(svg,xml);
 await page.screenshot({path:png,clip:{x:0,y:0,width,height},captureBeyondViewport:true});
 const rects=await page.$$eval('.card',cards=>cards.map(c=>({number:c.querySelector('.number').textContent,title:c.querySelector('h2').textContent,width:c.clientWidth,scrollWidth:c.scrollWidth})));
 if(rects.length!==9 || rects.some(r=>r.scrollWidth>r.width+2))throw new Error('模块缺失或出现横向溢出。');
 const imageCount=await page.$$eval('img',els=>els.filter(el=>el.complete&&el.naturalWidth>0).length);
 if(imageCount!==10)throw new Error('原始截图没有全部加载。');
 console.log(JSON.stringify({png,svg,width,height,modules:rects.length,originalScreenshots:imageCount,pngBytes:fs.statSync(png).size},null,2));
} finally {await browser?.close();}

