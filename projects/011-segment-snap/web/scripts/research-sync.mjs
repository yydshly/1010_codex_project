import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../../', import.meta.url));
const root = path.resolve(project, '../..');
const web = path.join(project, 'web');
const content = JSON.parse(fs.readFileSync(path.join(project, 'notes/research-summary.json'), 'utf8'));
const evidence = JSON.parse(fs.readFileSync(path.join(web, 'data/evidence.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const sourceBase = `${evidence.upstream.url}/blob/${evidence.upstream.commit}/`;
const totalParagraphs = content.sections.reduce((n, section) => n + section.body.length, 0);
const library = [
  ['README.md','项目说明','项目定位、能力、效果和运行范围'],
  ['THIRD_PARTY.md','来源与授权','固定版本、作者媒体及本地内容归属'],
  ['notes/research-summary.md','完整理解摘要','九主题正文，与网页和根索引同步'],
  ['notes/research-summary.json','统一内容数据','全部段落、模块与扩展路线'],
  ['notes/essence-and-value.md','原理本质与复用价值','关系消歧、职责分工和个人项目判断'],
  ['notes/capabilities.md','能力与算法细节','输入合同、模型、阈值和评估范围'],
  ['notes/verification.md','本地验证记录','原观察台的实际交互、截图及图像检查'],
  ['assets/README.md','图片与素材说明','实际截图、总图和媒体类型说明'],
  ['web/data/evidence.json','来源与指标记录','公开 AP、样例选择与运行口径'],
  ['assets/research-overview-layout.json','引导图文字布局','图像尺寸、截图来源与正文位置'],
  ['tools/README.md','研究图生成方法','确定性 SVG 排版与 Sharp 导出'],
  ['tools/build-overview.mjs','研究图生成脚本','仅供阅读；网页不执行此脚本'],
  ['assets/UPSTREAM-LICENSE.txt','上游 MIT 许可证','完整原文及第三方归属']
].map(([source,title,description]) => ({source,title,description,url:`research/${source}`}));
fs.writeFileSync(path.join(web, 'data/library.json'), JSON.stringify(library, null, 2) + '\n');
const summary = ['# Segment–Snap · 完整理解摘要', '', `整理日期：${content.date}。固定版本：\`${evidence.upstream.commit}\`。`, '', content.lead, '', '本文件由 notes/research-summary.json 生成；作者结果、本地示意与扩展规划分别标注。', ''];
for (const section of content.sections) {
  summary.push(`## ${section.title}`, '');
  section.body.forEach((paragraph, i) => summary.push(`**${section.labels[i]}**`, '', paragraph, ''));
}
summary.push('## 十一组模块职责', '', '| 模块 | 分工 | 职责 | 源码或资料 |', '| --- | --- | --- | --- |');
for (const module of content.modules) summary.push(`| ${module.title} | ${module.owner} | ${module.detail} | ${module.source} |`);
summary.push('', '## 五阶段扩展路线', '');
for (const stage of content.roadmap) summary.push(`### ${stage.stage} · ${stage.title}`, '', stage.detail, '', `验证：${stage.verify}`, '');
fs.writeFileSync(path.join(project, 'notes/research-summary.md'), summary.join('\n'));

const topics = content.sections.map((section, i) => `<details class="topic searchable" data-topic="${section.id}" open><summary><span class="section-index">${String(i+1).padStart(2,'0')}</span><h3>${escape(section.title)}</h3><span class="fold" aria-hidden="true">＋</span></summary><div class="topic-body">${section.body.map((paragraph,j)=>`<article><h4>${escape(section.labels[j])}</h4><p>${escape(paragraph)}</p></article>`).join('')}</div></details>`).join('\n');
const modules = content.modules.map((module,i)=>`<tr class="searchable"><td><span class="row-number">${String(i+1).padStart(2,'0')}</span><strong>${escape(module.title)}</strong></td><td>${escape(module.owner)}</td><td>${escape(module.detail)}</td><td>${module.owner==='我们的实现'?`<code>${escape(module.source)}</code>`:`<a href="${sourceBase}${module.source}" target="_blank" rel="noreferrer">${escape(module.source)} ↗</a>`}</td></tr>`).join('\n');
const documents = library.map((file,i)=>`<article class="document searchable"><span class="row-number">${String(i+1).padStart(2,'0')}</span><h3>${escape(file.title)}</h3><p>${escape(file.description)}</p><div><button class="text-button" data-read="${i}">页内阅读</button><a href="./${file.url}" download>下载原文件 ↓</a></div></article>`).join('\n');
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escape(content.catalogSummary)}"><title>Segment–Snap · 完整理解与交互研究</title><link rel="stylesheet" href="./research.css"><script type="module" src="./research.js"></script></head>
<body><a class="skip" href="#main">跳到研究正文</a><header class="topbar"><a class="identity" href="./research.html"><span class="brand-icon">S↗</span><span>Segment–Snap<small>011 / 三维交互理解研究</small></span></a><nav aria-label="主要导航"><a href="#guide">总图</a><a href="#understanding">完整理解</a><a href="#modules">模块</a><a href="#effects">效果</a><a href="#roadmap">扩展</a><a href="#resources">资料</a></nav><a class="outline-link" href="./index.html#lab">操作原理示意 ↗</a></header>
<main id="main"><section class="hero wrap" id="guide"><div class="hero-copy"><p class="eyebrow">RESEARCH / FROM SCAN TO INTERACTION</p><h1>${escape(content.title)}</h1><p class="lead">${escape(content.lead)}</p><p class="core">学习发现部件与把手，关系消除歧义，几何输出运动描述；动作执行与反馈由下一层补充。</p><div class="hero-actions"><a class="button primary" href="#understanding">阅读完整理解 ↓</a><button class="button" data-open-guide>放大既有总图 ↗</button></div><div class="scope-legend"><span class="source">作者结果与方法</span><span class="local">我们的实际示意</span><span class="planned">迁移与扩展规划</span></div><p class="hero-meta">整理于 ${content.date} · 固定上游版本 · 当前聚焦原理与复用价值</p></div><figure class="guide-card"><button data-open-guide aria-label="放大 Segment–Snap 原理解总图"><img src="./assets/research-overview.png" width="3600" height="5000" alt="既有完整研究总图：作者预测、本地柜门抽屉、能力、学习与几何流程、价值、扩展和验证边界" fetchpriority="high"></button><figcaption><span>已有总图，原样作为网页引导</span><a href="./assets/research-overview.png" download>高清 PNG ↓</a><a href="./assets/research-overview.svg" download>SVG ↓</a></figcaption></figure></section>
<div class="wrap reading-route"><strong>按这个顺序理解</strong><a href="#understanding">能力与本质</a><span>→</span><a href="#flow">模块与信息流</a><span>→</span><a href="#effects">证据与示意</a><span>→</span><a href="#personal-value">你的项目与下一步</a></div>
<section class="wrap section" id="understanding"><div class="section-title"><div><p class="eyebrow">01 / COMPLETE UNDERSTANDING</p><h2>九个主题，把理解展开。</h2><p>${content.sections.length} 个主题 · ${totalParagraphs} 段完整正文。展开、检索、回查原文；摘要不截断。</p></div><div class="reading-tools"><label for="research-search">检索正文、模块与资料</label><input id="research-search" type="search" placeholder="例如：把手、训练、Agent、价值"><div><button id="expand-all" class="text-button">展开全部</button><button id="collapse-all" class="text-button">收起全部</button><button id="clear-search" class="text-button">清空检索</button></div><p id="search-status" role="status" aria-live="polite">全部内容可见</p></div></div><div class="topics">${topics}</div></section>
<section class="section tinted" id="modules"><div class="wrap"><div class="section-title"><div><p class="eyebrow">02 / RESPONSIBILITIES</p><h2>11 组模块，明确每一层的职责。</h2><p>源库模型和规则有固定源码依据；观察台与资料发布为我们的实现。</p></div></div><div class="table-scroll" tabindex="0" role="region" aria-label="模块职责表，可横向滚动"><table><thead><tr><th>模块</th><th>分工</th><th>作用与限制</th><th>固定来源 / 本地入口</th></tr></thead><tbody>${modules}</tbody></table></div></div></section>
<section class="wrap section" id="flow"><div class="section-title"><div><p class="eyebrow">03 / INFORMATION FLOW</p><h2>同一场景，三种预测，再组合。</h2><p>免训练的是几何解码；三个感知预测器都需要学习。下面按实际依赖解释，完整箭头见引导图。</p></div><a class="text-link" href="${evidence.upstream.method}" target="_blank" rel="noreferrer">核对上游 METHOD ↗</a></div><div class="flow-grid"><article><span>输入合同</span><h3>已有的三维扫描</h3><p>米制 XYZ、RGB、法线。部件和把手视图点序、坐标对齐。</p></article><article><span>分别训练</span><h3>P / D / J 三个预测器</h3><p>P 给最终部件；D 给密集把手；J 用自身部件查询提出 child。</p></article><article><span>固定规则</span><h3>几何与语义各一次</h3><p>D 引导 P 的铰链；J 追加把手，P 语义与 D 回退修正新增类别。</p></article><article><span>输出描述</span><h3>部件、运动、操作区域</h3><p>轴和原点、掩码、类别与分数。最终把手不回流到几何解码。</p></article></div><div class="explanation-pair"><article><h3>为什么把手能决定铰链侧？</h3><p>近似对称的门板有多条候选线；常见柜门的把手与铰链在相对两侧。算法从可靠支撑拟合候选，找附近把手，再选择离它最远的一条。无附近把手时中心回退；这条先验不覆盖所有机构。</p></article><article><h3>为什么部件能帮助把手类别？</h3><p>小把手单独看可能难以判断它控制旋转还是平移。独立部件提供大范围上下文，密集检测提供回退证据。规则只修正追加候选的类别，不改变密集检测和新增掩码、分数。</p></article></div></section>
<section class="section dark" id="effects"><div class="wrap"><div class="section-title"><div><p class="eyebrow">04 / EVIDENCE AND EXPLORATION</p><h2>先看效果，再判断证据支持什么。</h2><p>作者预测和我们的原理示意分别保留，实际 GPU 推理未在本机完成。</p></div><a class="text-link" href="./index.html">进入原观察台 ↗</a></div><div class="effect-grid"><figure><img src="./assets/showcase-desktop.png" alt="实际网页截图：作者场景01预测及能力说明" loading="lazy"><figcaption><span class="source">作者公开预测</span><h3>室内可动部件与运动轴</h3><p>场景01显示15个预测，10个同时匹配，实际有31个标注。是作者有利样例，仍有遗漏。</p></figcaption></figure><figure><img src="./assets/lab-door.png" alt="我们实际验证的柜门示意：左把手、右铰链与90度展示" loading="lazy"><figcaption><span class="local">本地示意 · 已操作验证</span><h3>改变把手，理解铰链选择</h3><p>四层观察、把手侧、引导开关、无把手、播放和复位；90°是展示设定。</p></figcaption></figure><figure><img src="./assets/lab-drawer.png" alt="我们实际验证的抽屉平移示意：沿表面法线与60厘米展示" loading="lazy"><figcaption><span class="local">本地示意 · 已操作验证</span><h3>抽屉沿表面法线平移</h3><p>切换对象与滑杆同步轴和说明，已操作到60cm；自有几何点云，无模型推理。</p></figcaption></figure></div><div class="metric-grid"><article><span>只改旋转原点规则</span><strong>13.74 → 40.98</strong><p>运动综合 AP，作者报告 +27.25 个百分点；分割、类别、分数和轴固定。</p></article><article><span>追加联合候选</span><strong>24.63 → 29.65</strong><p>把手 AP50，+5.01 个百分点；保留密集预测，补充 child。</p></article><article><span>完整新增类别修正</span><strong>29.65 → 30.99</strong><p>把手 AP50，+1.34 个百分点；部件修正对照为 +0.98。</p></article></div><p class="evidence-note">195 个训练 / 42 个验证场景；验证参与选择。AP50 掩码 IoU &gt; 0.5，运动另检查轴 &lt; 15°、旋转原点 &lt; 0.25m，平移原点不评。差值来自未四舍五入分数，不同增益不相加，AP不是机器人成功率。<a href="${evidence.upstream.results}" target="_blank" rel="noreferrer">固定版本指标依据 ↗</a></p><div class="effect-links"><a class="button" href="./index.html#lab">操作门与抽屉示意 ↗</a><a class="button" href="./index.html#results">铰链误差图与更多作者效果 ↗</a><a class="button" href="${evidence.authorPage.url}" target="_blank" rel="noreferrer">作者完整效果与视频 ↗</a></div></div></section>
<section class="wrap section" id="personal-value"><div class="section-title"><div><p class="eyebrow">05 / VALUE FOR YOUR PROJECTS</p><h2>最贴近你的价值，是共同的操作接口。</h2><p>程序化资产已知几何与关节，先直接定义；未知实物扫描出现后，再评估模型。以下尚未跨项目接入。</p></div><span class="planned">迁移建议 · 待验证</span></div><div class="value-grid"><article><span>001 / 樱花小街</span><h3>门、抽屉、按钮拥有明确动作</h3><p>组件创建时记录部件、轴、原点、操作区和范围。玩家与NPC可以通过共同入口操作，同步真实场景状态。</p></article><article><span>002 / 游戏与 Agent</span><h3>模型选择动作，规则执行并反馈</h3><p>让Agent选对象与动作，检查距离、状态和受阻条件，由引擎执行。读回结果后再决定下一步。</p></article><article><span>004 / 资产系统</span><h3>资产除了外形，还描述怎样使用</h3><p>把交互元数据与部件配置一起保存，供导入、校验、编辑和动作执行。先验证坐标与数据合同。</p></article></div><div class="contract"><div><span class="planned">接口示例 · 尚未接入</span><h3>一个对象同时服务玩家与 NPC</h3><p>源库能提供部件、类型、轴、原点和操作区域候选；范围、状态、动作条件与结果由我们补充。下方数值仅说明接口，不是模型输出。</p><p><strong>可探索任务：</strong>NPC打开柜门取物，记录对象选择、条件检查、受阻恢复与实际反馈利用。按任务成功率和校正成本衡量价值。</p></div><pre><code>{
  "partId": "cabinet-door-01",
  "motion": { "type": "rotation", "axis": [0, 1, 0] },
  "origin": [0, 0, 0],
  "operationRegion": "handle-01",
  "rangeDegrees": [0, 90],
  "state": "closed",
  "conditions": ["inReach", "pathClear"],
  "actions": ["open", "close"],
  "result": { "status": "success | blocked" }
}</code></pre></div><p class="small-note">示例采用常见引擎Y-up；源库旋转默认世界Z。真实接入需要同时变换点、轴和原点，并统一米制单位；不能直接复制数值。</p></section>
<section class="section tinted" id="roadmap"><div class="wrap"><div class="section-title"><div><p class="eyebrow">06 / EXTENSIONS</p><h2>五阶段扩展，每一步有自己的验证任务。</h2><p>以下是路线规划；现阶段已经完成的是研究、引导图和原理示意。</p></div><span class="planned">规划 · 尚未实作</span></div><div class="roadmap">${content.roadmap.map(stage=>`<article class="searchable"><span class="stage">${stage.stage}</span><div><h3>${escape(stage.title)}</h3><p>${escape(stage.detail)}</p><p class="validation"><strong>验证：</strong>${escape(stage.verify)}</p></div></article>`).join('')}</div></div></section>
<section class="wrap section" id="resources"><div class="section-title"><div><p class="eyebrow">07 / SOURCES AND RECORDS</p><h2>理解可回查，原图和资料可下载。</h2><p>13份原始资料原样打包；文件里的历史阶段保留，当前线上结果另记。页内阅读采用纯文本，不执行源码。</p></div><a class="text-link" href="./assets/research-overview.svg" download>下载可缩放引导图 ↓</a></div><div class="source-strip"><p>上游固定版本 <code>${evidence.upstream.commit}</code></p><p>作者媒体页 <code>${evidence.authorPage.commit}</code></p><a href="${evidence.upstream.url}" target="_blank" rel="noreferrer">源库 ↗</a><a href="${evidence.upstream.paper}" target="_blank" rel="noreferrer">论文 v2 ↗</a><a href="${evidence.upstream.method}" target="_blank" rel="noreferrer">原理依据 ↗</a><a href="${evidence.upstream.results}" target="_blank" rel="noreferrer">指标依据 ↗</a></div><div class="documents">${documents}</div><aside class="boundary"><h3>发布范围与能力边界</h3><p>公开研究和自有静态示意，没有GPU模型推理或机器人后台。主仓库MIT不自动覆盖作者效果媒体与数据；截图保留归属。完整运动范围、抓取、碰撞与力控尚未实现，跨项目接口尚未接入。</p><p>引导图保持制作时内容；旧笔记的“未部署”是历史记录。当前发布版本与逐文件检查见 <a href="./research/publication.json">发布记录</a>。原始作者图片及视频仍外部加载，网络失败可转作者页；本地文字、图和示意不依赖模型服务。</p></aside></section>
</main><footer class="wrap"><span>011 / Segment–Snap · 研究集</span><a href="../">返回项目入口 ↗</a><span>作者结果 · 本地示意 · 扩展规划分别标注</span></footer>
<dialog id="guide-dialog" aria-labelledby="guide-title"><div class="dialog-head"><div><span class="eyebrow">ORIGINAL RESEARCH GUIDE</span><h2 id="guide-title">完整理解总图</h2></div><div class="zoom-tools"><button id="zoom-out" aria-label="缩小总图">−</button><output id="zoom-value">适应</output><button id="zoom-in" aria-label="放大总图">＋</button><button id="zoom-fit">适应窗口</button><button data-close="guide-dialog" aria-label="关闭总图">关闭 ×</button></div></div><div id="guide-viewport"><img id="guide-full" src="./assets/research-overview.png" width="3600" height="5000" alt="完整原理解总图"></div><div class="dialog-foot"><a href="./assets/research-overview.png" download>下载原PNG</a><a href="./assets/research-overview.svg" download>下载SVG</a><span>原图保持不变 · 可缩放和滚动</span></div></dialog>
<dialog id="document-dialog" aria-labelledby="document-title"><div class="dialog-head"><h2 id="document-title">原始研究资料</h2><button data-close="document-dialog" aria-label="关闭资料">关闭 ×</button></div><p id="document-status" role="status"></p><pre id="document-content" tabindex="0"></pre><div class="dialog-foot"><a id="document-download" download>下载原文件</a><span>完整纯文本 · 保留原始内容</span></div></dialog>
</body></html>\n`;
fs.writeFileSync(path.join(web, 'research.html'), html);
const catalogFile = path.join(root,'projects.json');
if (fs.existsSync(catalogFile)) {
  const catalog = JSON.parse(fs.readFileSync(catalogFile,'utf8'));
  const entry = catalog.projects.find(project => project.id === 11 && project.slug === 'segment-snap');
  if (!entry) throw new Error('缺少固定编号 011 的登记项。');
  entry.summary = content.catalogSummary;
  entry.summarySections = content.sections.map(({title,body,labels}) => ({title,body,labels}));
  fs.writeFileSync(catalogFile, JSON.stringify(catalog,null,2)+'\n');
}
console.log(`研究同步完成：${content.sections.length}主题、${totalParagraphs}段、${content.modules.length}模块、${library.length}份资料。`);
