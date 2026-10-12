import { readFileSync } from 'node:fs';

export const data = JSON.parse(readFileSync(new URL('../../notes/research-summary.json', import.meta.url), 'utf8'));
export const overview = JSON.parse(readFileSync(new URL('../../notes/overview-content.json', import.meta.url), 'utf8'));
const E = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const documents = [
  ['完整中文研究笔记','能力、效果、原理、场景、扩展与价值','notes/research.md','研究'],
  ['九维完整摘要','与网页和根登记表共用的完整描述','notes/research-summary.md','研究'],
  ['本地实验记录','005 的实际操作、播放状态与验证限制','notes/experiment.md','实测'],
  ['版本与本地改动','固定 commit、缓存策略与资源范围','notes/provenance.json','来源'],
  ['代码、模型与音频来源','整体许可与不同素材的来源边界','THIRD_PARTY.md','来源'],
  ['总览图内容源','八主题、实拍素材与未来方向','notes/overview-content.json','图文'],
  ['总览图生成清单','图片摘要、原始来源与尺寸','assets/research-overview-manifest.json','图文'],
  ['总览图验证','字体宽度、图片解码与排版检查','notes/overview-verification.json','实测'],
  ['001 一分钟导览记录','MiniMax 生成、同步机制与交互实测','references/001-sakura-crossing/notes/tour.md','扩展'],
  ['MiniMax 脱敏生成记录','模型、音色、六段讲解与句级时间戳','references/001-sakura-crossing/notes/tour-voice-generation.json','扩展'],
  ['001 自然播放完成证据','60 秒完成、媒体暂停与控制台记录','references/001-sakura-crossing/notes/tour-voice-browser.json','实测'],
  ['截图与排版来源','005 实拍和 001 固定参考说明','assets/README.md','来源'],
  ['Web 与本地运行说明','个人本地复现和静态研究发布的构建入口','web/README.md','运行'],
  ['项目总说明','研究版本、本地操作与资料入口','README.md','运行'],
  ['发布验证记录','当前网页部署状态与线上检查范围','notes/publication-verification.json','发布']
].map(([title,description,path,category]) => ({title,description,path,category,url:'./materials/'+path}));

const sourceFile = file => `${data.source.url}/blob/${data.source.commit}/src/${file}`;
const modules = [
  ['世界布局','地形、相机与碰撞共用空间规则','world/layout.js'],
  ['桃林模板','固定种子与近远细节','world/peach.js'],
  ['水面表现','镜像相机与反射纹理','world/water.js'],
  ['章节内容','原文、白话、镜头与环境','story/chapters.js'],
  ['导演控制','故事时间、进度与状态恢复','story/director.js'],
  ['渲染与预算','区域显隐、画质与主循环','main.js']
];
function sectionExtra(id) {
  if (id === 'modules') return `<div class="module-map">${modules.map(([title,desc,file])=>`<a href="${sourceFile(file)}" target="_blank" rel="noopener"><strong>${E(title)}</strong><span>${E(desc)}</span><code>${E(file)} ↗</code></a>`).join('')}</div>`;
  if (id === 'principles') return `<div class="pipeline" aria-label="统一故事时间线">${overview.principles.clock.map((item,i)=>`<div><small>0${i+1}</small><strong>${E(item.title)}</strong><span>${E(item.text).replaceAll('\n','<br>')}</span></div>`).join('')}</div><p class="callout">暂停保留故事时间；回看重建状态；自由探索交回镜头。001 进一步使用音频 <code>currentTime</code> 作为主时钟。</p>`;
  if (id === 'effects') return `<div class="shot-gallery">${overview.original.shots.map((item,i)=>`<figure><a href="./media/${item.file}" target="_blank" rel="noopener"><img src="./media/effect-${i}.webp" width="814" height="${item.crop[3]}" alt="${E(item.title)}：上游场景本地实拍" loading="lazy"></a><figcaption><strong>${E(item.title)}</strong><span>${E(item.stamp)}</span></figcaption></figure>`).join('')}</div><div class="reveal-pair"><figure><img src="./media/effect-before.webp" alt="第十幕 01:01：还在洞口暗处" width="814" height="340" loading="lazy"><figcaption>转折之前 · 第 10 幕 · 01:01</figcaption></figure><span aria-hidden="true">→</span><figure><img src="./media/effect-2.webp" alt="第十一幕 01:23：田野与村落已经展开" width="814" height="340" loading="lazy"><figcaption>转折之后 · 第 11 幕 · 01:23</figcaption></figure><p>两帧来自同一次导览的不同真实时刻。静态对照呈现空间变化；原版动态揭示可在本地复现。</p></div><div class="extension-panel"><div><span class="pill green">001 已实现</span><h3>街口 → 商店 → 阅读亭</h3><p>一分钟中文讲解，语音、字幕、镜头和店门一起推进。暂停与自由探索会暂停讲解，结束后交回镜头。</p><a class="button green-button" href="../001-sakura-crossing/index.html">体验 001 在线研究街 ↗</a><button class="text-button" data-document="references/001-sakura-crossing/notes/tour.md">阅读同步与实测记录 →</button></div><figure><a href="./media/references/001-tour-voice-complete.jpg" target="_blank" rel="noopener"><img src="./media/extension-complete.webp" alt="001 语音导览生产预览：自然播放到 01:00 完成并交回探索" width="677" height="558" loading="lazy"></a><figcaption>生产预览完成实拍 · 2026-10-11</figcaption></figure></div>`;
  if (id === 'roadmap') return `<div class="roadmap">${overview.roadmap.map(item=>`<div><span class="pill ${item.kind==='verified'?'green':'sand'}">${E(item.stage)}</span><h3>${E(item.title)}</h3><ul>${item.points.map(s=>`<li>${E(s)}</li>`).join('')}</ul></div>`).join('')}</div>`;
  if (id === 'value') return `<p class="next-step">${E(overview.nextStep)}</p>`;
  return '';
}
export function renderSummary() {
  const summary = `# 005 · 桃源完整研究摘要\n\n更新：${data.updatedAt}。上游固定版本：[${data.source.commit}](${data.source.url}/tree/${data.source.commit})。\n\n${data.summary}\n\n${data.thesis}\n\n` + data.sections.map(section=>`## ${section.title}\n\n`+section.body.map((p,i)=>`**${section.labels[i]}：** ${p}\n`).join('\n')+'\n').join('');
  return summary.trimEnd() + '\n';
}
export function renderResearch() {
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${E(data.summary)}"><meta name="theme-color" content="#f6f3e9"><title>005 桃源 · 三维叙事与镜头导览研究</title><link rel="stylesheet" href="./research.css"></head>
<body>
<a class="skip-link" href="#main">跳到研究内容</a>
<header class="site-header"><a class="brand" href="../"><span class="brand-mark">源</span><span>桃源研究<small>005 / TAOHUAYUAN</small></span></a><nav aria-label="主要导航"><a href="#overview">理解总图</a><a href="#directory">九维摘要</a><a href="#effects">真实效果</a><a href="#library">笔记与证据</a><a class="nav-experience" href="../001-sakura-crossing/index.html">001 导览 ↗</a></nav></header>
<main id="main">
<section class="hero"><div class="hero-copy"><p class="eyebrow">文学 × 实时三维 × 可探索叙事</p><h1>桃源：把文字，<br>变成一段可以<br><em>走进去的旅程。</em></h1><p class="hero-thesis">${E(data.thesis)}</p><div class="hero-actions"><a class="button" href="#directory">展开完整理解 ↓</a><a class="text-button" href="${data.source.url}" target="_blank" rel="noopener">JimLiu / taohuayuan ↗</a></div><p class="version">研究版本 <a href="${data.source.url}/tree/${data.source.commit}" target="_blank" rel="noopener">${data.source.commit.slice(0,7)} ↗</a> · 源库实测 2026-10-11 · 网页整理 ${data.updatedAt}</p></div><button class="guide-hero" data-open-overview aria-label="放大桃源中文研究总览图"><img src="./media/research-guide.webp" width="960" height="3914" alt="桃源研究总览图：原版效果、时间线原理、001 扩展、价值与路线"><span>我们的一张理解总图 <b>放大阅读全文 ↗</b></span></button></section>
<div class="facts" aria-label="源库能力数据"><div><strong>28</strong><span>循文导览幕</span></div><div><strong>10</strong><span>可切换景致</span></div><div><strong>≈248 秒</strong><span>原版预录朗读</span></div><div><strong>60 秒</strong><span>001 中文语音扩展</span></div></div>
<section id="overview" class="overview-section"><div class="section-heading"><p class="eyebrow">先有整体，再展开细节</p><h2>以这张图，进入我们的理解。</h2><p>桃林、山洞、田野与 001 三站路线均来自真实实拍。图的八个主题连接效果、原理、复用、场景、扩展和价值；下面的网页再补充完整模块和九维摘要。</p></div><div class="overview-layout"><button class="overview-preview" data-open-overview aria-label="查看完整高清引导图"><img src="./media/research-guide.webp" alt="既有中文总览图完整预览" width="960" height="3914" loading="lazy"></button><div class="overview-notes"><div class="legend"><span class="pill">源库已有</span><span class="pill green">本地已实现</span><span class="pill sand">未来扩展</span></div><h3>三种最值得带走的能力</h3>${overview.pillars.map(item=>`<div class="pillar"><strong>${E(item.title)}</strong><p>${E(item.text)}</p></div>`).join('')}<div class="download-links"><button class="button" data-open-overview>打开高清图</button><a href="./media/research-overview.png" download>下载 PNG · 4000 × 16308 ↓</a><a href="./media/research-overview.svg" download>下载可编辑 SVG ↓</a></div><p class="historical-note">引导图保留制作阶段文字。“尚未部署”指桃源原版三维复现；本页是另行构建的静态研究手册。最新网页发布状态可在发布记录回查。</p></div></div></section>
<section id="directory" class="directory"><p class="eyebrow">完整摘要 / 九个维度</p><h2>从“看起来如何”，到“下一次怎样用”。</h2><p>${E(data.summary)}</p><ol>${data.sections.map((item,i)=>`<li><a href="#${item.id}"><small>0${i+1}</small><span>${E(item.title.split('：')[0])}</span><b>↗</b></a></li>`).join('')}</ol></section>
${data.sections.map((section,i)=>`<section id="${section.id}" class="research-section"><div class="section-heading"><p class="eyebrow">0${i+1} / ${E(section.title.split('：')[0])}</p><h2>${E(section.title.split('：').slice(1).join('：'))}</h2></div>${sectionExtra(section.id)}<div class="summary-body">${section.body.map((paragraph,j)=>`<article><h3>${E(section.labels[j])}</h3><p>${E(paragraph)}</p></article>`).join('')}</div><div class="section-sources"><span>依据</span>${section.docs.map(path=>`<button class="text-button" data-document="${E(path)}">${E(documents.find(d=>d.path===path)?.title||path)} ↗</button>`).join('')}</div></section>`).join('')}
<section id="library" class="library"><div class="section-heading"><p class="eyebrow">让判断回到证据</p><h2>完整笔记，原始记录，来源说明。</h2><p>每项资料可在页面内阅读，也可下载原文件。001 的生成与浏览器证据为固定快照，便于回查当时的验证范围。</p></div><label class="search-label" for="doc-search">查找资料<input type="search" id="doc-search" placeholder="研究、模块、来源、MiniMax、实测…"></label><p id="doc-count" aria-live="polite"></p><div id="document-list">${documents.map(doc=>`<article class="document" data-search="${E(doc.category+' '+doc.title+' '+doc.description)}"><span class="pill">${E(doc.category)}</span><h3>${E(doc.title)}</h3><p>${E(doc.description)}</p><div><button class="text-button" data-document="${E(doc.path)}">在页面内阅读 →</button><a href="${doc.url}" download>原文件 ↓</a></div></article>`).join('')}</div></section>
<section class="local-study"><p class="eyebrow">继续体验 / 本地学习</p><h2>在本机走过桃林、山洞与“豁然开朗”。</h2><p>原版的场景、人物与朗读保存在本机缓存；这份公开手册提供真实效果和运行说明。准备完成后，三段导览、全篇播放与自由看景可在本机体验。</p><details><summary>查看本地运行方法</summary><p>需要 Git、Node.js 22+ 与支持 WebGL 2 的浏览器；首次准备需访问 GitHub 和 npm。将研究集克隆到本机后，从仓库根目录执行：</p><pre id="local-command">cd projects/005-taohuayuan/web\nnpm.cmd run dev</pre><button class="text-button" id="copy-command">复制命令</button><span id="copy-status" role="status"></span><p>按终端输出地址打开研究台；点击“豁然开朗”后，先从洞口暗处开始，再走向田野。授权范围和完整操作见运行说明。</p><button class="text-button" data-document="web/README.md">阅读运行与构建说明 ↗</button></details><a class="button green-button" href="../001-sakura-crossing/index.html">在网页体验 001 一分钟中文导览 ↗</a></section>
</main>
<footer><div><strong>005 · 桃源研究</strong><p>观察效果 · 理解机制 · 形成自己的能力</p></div><div><a href="https://github.com/yydshly/1010_codex_project/tree/main/projects/005-taohuayuan" target="_blank" rel="noopener">研究集源码 ↗</a><a href="${data.source.url}" target="_blank" rel="noopener">源库 ↗</a><a href="#main">回到顶部 ↑</a></div><small>固定研究版本与历史实测范围已记录；真实手机、学习效果与商业效果待验证。</small></footer>
<dialog id="overview-dialog" aria-labelledby="overview-title"><div class="dialog-top"><div><small>005 / 理解总图</small><h2 id="overview-title">桃源 · 从古文走进三维叙事</h2></div><button data-close="overview-dialog" aria-label="关闭总览图">×</button></div><div class="viewer-tools"><button data-zoom="out" aria-label="缩小总览图">−</button><button data-zoom="fit">适应宽度</button><button data-zoom="in" aria-label="放大总览图">＋</button><span id="zoom-status" aria-live="polite">100%</span><a href="./media/research-overview.png" download>高清 PNG ↓</a><a href="./media/research-overview.svg" download>SVG ↓</a></div><div class="viewer-scroll"><img id="full-overview" data-src="./media/research-overview.png" alt="完整中文研究总览图，可滚动与放大阅读" width="4000" height="16308"></div></dialog>
<dialog id="reader-dialog" aria-labelledby="reader-title"><div class="dialog-top"><div><small id="reader-category"></small><h2 id="reader-title"></h2></div><button data-close="reader-dialog" aria-label="关闭资料阅读器">×</button></div><div class="reader-toolbar"><a id="reader-download" download>下载原始文件 ↓</a><span id="reader-path"></span></div><div id="reader-content" aria-live="polite"></div></dialog>
<noscript><p class="noscript">完整摘要、效果图片与资料下载无需 JavaScript。启用后可放大引导图、搜索资料并在页面内阅读；也可直接打开上方 PNG、SVG 与原文件。</p></noscript>
<script type="module" src="./research.js"></script></body></html>`;
}
