import './style.css';
import summaries from './summary.json';
import { experiences, questions, principles, comparisons, roadmap, source } from './data';
import { asset, docLink, reportLink, getManifest, escape as e, markdown, type Manifest, type Material } from './materials';
const root = document.querySelector<HTMLDivElement>('#app')!;
const page = location.pathname.endsWith('/research.html') ? 'research' : location.pathname.endsWith('/evidence.html') ? 'evidence' : 'home';
const nav = (href: string, title: string, active: boolean) => '<a href="' + href + '"' + (active ? ' aria-current="page"' : '') + '>' + title + '</a>';
const shell = (content: string) => `<header class="site-header"><a class="brand" href="./"><b>M</b><span>MUSTER<small>004 / 场景与玩法研究</small></span></a><nav aria-label="主要导航">${nav('./','总览与体验',page==='home')}${nav('./research.html','研究与原理',page==='research')}${nav('./evidence.html','效果与证据',page==='evidence')}<a href="./airport.html">直接玩机场任务 ↗</a></nav></header><main id="main">${content}</main><footer class="site-footer"><div><strong>MUSTER / 004</strong><p>真实程序化资产 · 本地衍生演示 · 中文研究集</p></div><div><a href="${source.url}" target="_blank" rel="noopener">上游仓库 ↗</a><a href="${docLink('web/THIRD_PARTY.md')}">来源与授权</a><a href="${docLink('web/README.md')}">本地运行</a><a href="./research/manifest.json" download>完整资料清单</a><p>固定版本 ${source.commit.slice(0,7)} · MIT · 浏览器内运行 · <a href="${docLink('notes/research-hub-publication.md')}">发布与完整摘要</a></p></div></footer>`;
const sectionHead = (n: string, title: string, text = '') => `<div class="section-head"><span class="eyebrow">${n}</span><h2>${title}</h2>${text ? '<p>'+text+'</p>' : ''}</div>`;
const counters = () => '<div class="material-counts" aria-label="完整资料数量"></div>';
const overviewSection = () => `<section id="overview" class="section overview-section">
  ${sectionHead('OVERVIEW / 一图理解','从资源到任务，用一张图串起理解','汇总上游能力、本地探索和下一步方向；点击总图可放大阅读。')}
  <div class="overview-layout">
    <a class="overview-image" href="${asset('research-hub-overview.png')}" target="_blank" rel="noopener" aria-label="打开 Muster 中文总览原图">
      <img loading="lazy" src="${asset('research-hub-overview.png')}" alt="Muster 中文总览：资源、能力、原理、营地和协同任务、场景、价值、扩展与验证边界">
    </a>
    <div class="overview-copy">
      <span class="eyebrow">9 个模块 / 10 张原始运行截图</span><h3>看懂这次探索，也找到下一步。</h3>
      <p>从 74 条程序化素材，到营地动作与声音，再到可以本地游玩的机场协同任务，把能力、实现方法、使用场景和复用价值放在一起看。</p>
      <ul><li><strong>上游已有：</strong>程序化资产、配置、展柜、编队和审查。</li><li><strong>本地已实现：</strong>场景、动作声音、陆空协同与四阶段任务。</li><li><strong>后续建议：</strong>更多玩法、通用工具、性能与多人。</li></ul>
      <div class="hero-actions"><a class="button primary" href="${asset('research-hub-overview.png')}" target="_blank" rel="noopener">放大阅读总图 ↗</a><a class="button" href="${asset('research-hub-overview.png')}" download>下载原图 ↓</a></div>
      <p class="muted">本图采用本地程序排版，直接嵌入原始截图；原始画面与报告保留在效果档案。</p><a class="text-link" href="${docLink('notes/research-hub-infographic.md')}">查看制作记录、排版方法与原图来源 →</a>
    </div>
  </div>
</section>`;
const summarySection = () => `<section id="summary" class="section wide">${sectionHead('SUMMARY / 完整摘要','从能力、模块到价值，把理解完整展开','九个维度对应上游实现、本地探索和下一步方向；每个模块都能回到资料与实际证据。')}<div class="summary-grid">${summaries.map((s,i)=>`<article><span class="number">0${i+1}</span><h3>${e(s.title)}</h3>${s.body.map((b,j)=>`<p><strong>${e(s.labels[j])}。</strong>${e(b)}</p>`).join('')}<a href="${docLink(s.doc)}">资料与实现依据 →</a></article>`).join('')}</div><div class="note"><strong>最新发布与可复现记录</strong><p>总览图保持制作阶段原图。当前发布版本、公开地址与线上验收以发布记录为准；旧笔记继续保留原日期及验证范围。</p><a href="${docLink('notes/research-hub-publication.md')}">完整摘要与发布说明 →</a> · <a href="${reportLink('notes/publication-verification.json')}">最新 HTTPS 实测记录 →</a></div></section>`;
const paths = `<div class="start-path"><a href="#summary"><span>01 / 认识</span><strong>先读能力与模块全貌</strong><small>真实代码资产与能力边界</small></a><a href="#experience" data-experience="camp"><span>02 / 观察</span><strong>看营地动起来</strong><small>轮履、步态、起降与声音</small></a><a href="#experience" data-experience="airport"><span>03 / 游玩</span><strong>完成机场协同任务</strong><small>侦察、部署、防守与恢复</small></a><a href="./research.html"><span>04 / 深入</span><strong>把原理带回自己的项目</strong><small>完整研究、来源与实测</small></a></div>`;
const liveSection = () => `<section id="experience" class="section wide">${sectionHead('02 / LIVE LAB','让能力在这里运行','选择一个入口，在首页操作真实应用。每次加载一个场景；切换体验会重新开始，打开独立页面可使用完整窗口。')}<div class="experience-tabs" role="tablist" aria-label="切换真实体验">${experiences.map((x,i)=>`<button id="tab-${x.id}" role="tab" aria-selected="${i===0}" aria-controls="live-panel" data-live="${x.id}">${x.title}<small>${x.tag}</small></button>`).join('')}</div><div id="live-panel" role="tabpanel" aria-labelledby="tab-camp"><div class="live-toolbar"><div><strong id="live-title"></strong><span id="live-status" role="status">按下方按钮加载真实场景</span></div><div class="live-tools"><button id="live-toggle" disabled>暂停 / 继续</button><button id="live-close" disabled>关闭体验</button><button id="live-fullscreen">全屏体验</button><a id="live-open" class="button" target="_blank" rel="noopener">独立打开 ↗</a></div></div><div id="live-stage"><div id="live-placeholder"><img id="live-image" alt="本地实际运行截图"><div><span class="eyebrow">ACTUAL APP / 真实应用</span><h3 id="live-placeholder-title"></h3><p id="live-description"></p><button id="live-load" class="button primary">在首页加载体验 →</button><small>首次进入需要生成模型；声音在你启动演示或任务后启用。</small></div></div></div><div id="harness-options" hidden><label>审查素材<select id="harness-asset"><option value="germany/panzer-iv-h">四号坦克</option><option value="usa/m4a3-sherman">M4A3 谢尔曼</option><option value="usa/willys-mb">Willys 吉普</option><option value="usa/p51d">P-51D</option></select></label><label><input id="harness-skirts" type="checkbox" checked>四号侧裙保留</label><button id="harness-apply">重新生成六视图</button></div><div class="live-guide"><ol id="live-steps"></ol><a id="live-doc">查看完整操作与实现 →</a></div></div></section>`;
const questionSection = () => `<section id="understanding" class="section">${sectionHead('01 / OUR UNDERSTANDING','它是什么，我们又做了什么？')}<div class="understanding"><div class="truth"><span class="eyebrow">先回答一个关键问题</span><h3>这是真实的模型资源。</h3><p>74 条资产由 TypeScript 构建几何，配置会真正改变模型。素材有资料与来源，能被检索、组合和编辑。</p><p>它们是开发者编写的程序化模型，未接入文字生成 3D、大模型指挥或扫描重建。米制比例也不代表工程测绘精度。</p><a href="${docLink('web/docs/PROVENANCE.md')}">核对 74 条素材来源 →</a></div><div class="ownership"><article><span>上游 / 素材系统</span><strong>资产、材质、配置与展柜</strong><p>检索 / 编队 / 编辑 / 本机保存 / 六视图</p></article><article><span>本地扩展 / 场景与玩法</span><strong>营地 → 动作 → 协同任务</strong><p>环境 / 可动部件 / 声音 / 规则战斗 / 四阶段任务</p></article><article><span>后续 / 待开发与验证</span><strong>更多任务、导出、性能与多人</strong><p>完整蒙皮、真实物理、真实手机性能仍待验证</p></article></div></div><div class="question-grid">${questions.map(x=>`<details><summary>${x.q}</summary><p>${x.a}</p><a href="${docLink(x.doc)}">读完整分析 →</a></details>`).join('')}</div></section>`;
const comparisonSection = () => `<section class="section" id="comparisons">${sectionHead('03 / OBSERVE','把关键效果放在一起看','以下是本地实际运行截图。动态过程可在上方真实体验中操作，完整原图与报告保留在效果档案。')}<div class="comparison-grid">${comparisons.map(x=>`<article><div class="comparison-pair">${[x.before,x.after].map((img,i)=>`<a href="${asset(img)}" target="_blank" rel="noopener"><img loading="lazy" src="${asset(img)}" alt="${x.labels[i]}"><span>${x.labels[i]}</span></a>`).join('')}</div><h3>${x.title}</h3><p>${x.text}</p><a href="${docLink(x.doc)}">实现与证据 →</a></article>`).join('')}</div><div class="audio-card"><div><span class="eyebrow">REAL RECORDING / 实际混音采样</span><h3>听见营地的发动机与脚步</h3><p>Web Audio 合成音效的实际录制，约 2.63 秒 / 48 kHz 单声道。进入营地可体验距离衰减、静音与同步暂停。</p></div><audio controls preload="metadata" src="${asset('fieldcamp-realism-audio.wav')}">浏览器不支持音频。</audio><a href="${reportLink('notes/fieldcamp-realism-results.json')}">声音实测报告 →</a></div><a class="text-link" href="./evidence.html">浏览全部截图、录音、布局与验收报告 →</a></section>`;
const principleSection = () => `<section id="principles" class="section">${sectionHead('04 / HOW IT WORKS','从资产到任务的六个层次')}<div class="pipeline" aria-label="数据流：资产定义、配置约束、几何与材质、场景编辑、动作声音、战斗任务">${['资产定义','配置约束','几何 / 材质','场景 / 布局','动作 / 声音','战斗 / 任务'].map((s,i)=>'<span><small>0'+(i+1)+'</small>'+s+'</span>').join('')}</div><div class="principle-grid">${principles.map((x,i)=>`<article><span class="number">0${i+1}</span><h3>${x.title}</h3><p>${x.text}</p><div><a href="${docLink(x.doc)}">原理与源码说明 →</a><a href="./?experience=${x.demo}#experience" data-experience="${x.demo}">体验对应能力 ↗</a></div></article>`).join('')}</div><div class="note"><strong>性能取舍</strong><p>按材质合并与缓存减少重复工作，也会合并机械层级；动态部件需要额外拆分。构造时的 InstancedMesh 部分会被展开，不能把 300 的展示上限当成全场 GPU 实例化或设备性能承诺。</p></div></section>`;
const valueSection = () => `<section id="value" class="section">${sectionHead('05 / USE & REUSE','把这次研究带向哪里')}<div class="value-layout"><article class="value-main"><span class="eyebrow">对我们已有项目的价值</span><h3>让“继续加内容”有一套稳定方法。</h3><p>对樱花街，最值得复用的是统一资产接口、配置兼容规则、编队槽位与个体偏移，以及多角度审查。小镇继续保留自己的三渲二风格，重新控制几何与材质预算。</p><p>当前已验证的是 Muster 的本地演示与任务；跨项目提取仍是建议，没有把它记作已接入。</p><a href="${docLink('notes/research.md')}">阅读复用价值与产品场景 →</a><dl><dt>教学与数字博物馆</dt><dd>3D 观察、资料、比例；补充讲解与史料核对。</dd><dt>场景工具与配置器</dt><dd>可维护的组件选项、组合模板与文件交换。</dd><dt>游戏原型</dt><dd>已可游玩的单位协作，为更多任务提供验证基础。</dd></dl></article><div class="roadmap">${roadmap.map(x=>`<article><span class="state">${x.state}</span><h3>${x.title}</h3><p>${x.text}</p><a href="${docLink(x.doc)}">依据与边界 →</a></article>`).join('')}</div></div></section>`;
const materialSection = () => `<section class="section materials-home" id="materials">${sectionHead('06 / COMPLETE RECORD','所有入口与研究材料都在这里','从早期模型研究到现在的机场任务，保留完整原文、历史效果和原始报告。数量由目录自动同步，历史记录会标明对应阶段。')}${counters()}<div class="material-routes"><a href="./research.html"><strong>完整中文研究与上游文档</strong><p>能力、原理、操作、修复、来源、规范与许可证</p><span>进入资料阅读页 →</span></a><a href="./evidence.html"><strong>全部效果与验证证据</strong><p>原图、声音、导出布局、规则与浏览器报告</p><span>进入效果档案页 →</span></a><a href="${docLink('web/README.md')}"><strong>自己在本地运行</strong><p>安装、启动、操作、构建与复现命令</p><span>查看运行说明 →</span></a></div><div class="all-experiences">${experiences.map(x=>`<a href="${x.href}">${x.title} ↗</a>`).join('')}</div><p class="muted">覆盖清单：项目与 Web 说明、全部 notes、全部 assets、上游 docs / briefs、人体说明、来源记录与完整许可证。未包含依赖目录与临时产物。</p></section>`;
function home() {
  root.innerHTML = shell(`<section class="hero"><div class="hero-copy"><span class="eyebrow">MUSTER / 从上游研究到本地可玩</span><h1>从模型展柜，<br>到协同任务。</h1><p>把 74 条程序化素材放进真实场景：先看营地运转，再指挥步兵、侦察补给与装甲一起守住机场。能力、实现和证据都能在这里回查。</p><div class="hero-actions"><a class="button primary" href="#experience" data-experience="camp">先看营地动起来 →</a><a class="button" href="./airport.html">直接玩机场保卫战 ↗</a></div><div class="hero-stats"><div><strong>74</strong><span>公开程序化资产</span></div><div><strong>26</strong><span>营地真实模型实例</span></div><div><strong>4</strong><span>机场协同任务阶段</span></div></div></div><figure class="hero-guide"><a href="${asset('research-hub-overview.png')}" target="_blank" rel="noopener"><img width="3840" height="4886" fetchpriority="high" src="${asset('research-hub-overview.png')}" alt="Muster 中文理解总图：能力、资源、模块、原理、价值与扩展，包含原版和探索实际效果"></a><figcaption><span>我们的理解总图 · 3840×4886</span><a href="${asset('research-hub-overview.png')}" target="_blank" rel="noopener">点击放大 ↗</a></figcaption></figure></section><section class="first-visit" aria-label="第一次访问的路线"><span class="eyebrow">第一次来，从这里开始</span>${paths}</section>${summarySection()}${questionSection()}${liveSection()}${comparisonSection()}${principleSection()}${valueSection()}${materialSection()}`);
  document.querySelector('.first-visit')!.insertAdjacentHTML('afterend', overviewSection());
  document.querySelector('.hero-actions')!.insertAdjacentHTML('beforeend', '<a class="button" href="#overview">一图理解全貌 ↓</a>');
  setupLive();
}
function research() {
  root.innerHTML = shell(`<section class="page-intro"><span class="eyebrow">RESEARCH / 完整研究与来源</span><h1>理解每个决定，<br>回到它的依据。</h1><p>概览串起六个问题；下方阅读器提供完整原文，按阶段检索。早期记录保持原样，当前功能以机场任务、协同演习和营地增强记录为准。</p><div class="hero-actions"><a class="button primary" href="#reader">阅读完整资料 ↓</a><a class="button" href="./#experience">返回真实体验 →</a></div>${counters()}</section>${summarySection()}${questionSection()}${principleSection()}${valueSection()}<section id="reader" class="section wide">${sectionHead('DOCUMENTS / 全文阅读','研究笔记、规范与授权')}<div class="reader-layout"><aside class="document-sidebar"><label for="doc-search">查找资料</label><input id="doc-search" type="search" placeholder="名称、路径或阶段"><div id="doc-list"></div></aside><article id="document"><div class="empty-state">正在加载资料清单…</div></article></div></section>`);
}
function evidence() {
  root.innerHTML = shell(`<section class="page-intro"><span class="eyebrow">EVIDENCE / 全部实际效果</span><h1>看到效果，<br>也看见验证过程。</h1><p>这里收录原始运行截图、单独标注的研究总图、实际声音采样、布局文件和所有 JSON 报告。历史阶段与当前功能分开标记；记录中的通过表示当时的验收，不代表逐项覆盖所有模型或设备。</p>${counters()}<div class="hero-actions"><a href="#gallery" class="button primary">浏览全部截图 ↓</a><a href="#reports" class="button">查验原始报告 ↓</a><a href="./#experience" class="button">运行真实场景 →</a></div></section>${comparisonSection()}<section id="gallery" class="section">${sectionHead('GALLERY / 图片与截图','全部效果，一张也保留')}<div class="filter-bar"><label>搜索图片<input type="search" id="image-search" placeholder="文件名、说明或阶段"></label><label>阶段<select id="image-stage"><option value="">全部阶段</option></select></label><span id="gallery-count" role="status"></span></div><div class="gallery" id="image-gallery"></div></section><section id="reports" class="section wide">${sectionHead('REPORTS / 原始 JSON','完整报告与可下载资料','报告显示采集时间、原始结论和完整内容；初版战斗报告保留为历史记录。布局文件与几何统计也收录在这里。')}<div class="filter-bar"><label>搜索报告<input type="search" id="report-search" placeholder="文件名或阶段"></label><label>阶段<select id="report-stage"><option value="">全部阶段</option></select></label></div><div class="report-layout"><div id="report-list"></div><article id="report-detail"><p>选择一份报告查看完整原始 JSON。</p></article></div></section><section class="section"><div class="note"><strong>已经验证的范围与仍需补足的范围</strong><p>机场任务有 14 项规则、7 项真实浏览器流程以及 2 项窄屏复验，实际打通轻松模式。协同演习保留 18 项规则和 7 项浏览器流程。真实手机、全模型 / 全配置、标准模式完整通关仍待验证。线上实测范围见发布记录。</p><a href="${docLink('notes/airport-defense.md')}">阅读详细验收与限制 →</a> · <a href="${docLink('assets/README.md')}">全部图片的说明与来源 →</a></div></section>`);
}
let manifest: Manifest;
let docGeneration = 0, reportGeneration = 0;
function showCounts() {
  document.querySelectorAll('.material-counts').forEach(el => el.innerHTML = [
    ['document','完整文档'], ['image','图片与截图'], ['audio','声音采样'], ['report','JSON 资料'],
  ].map(([type,label])=>'<span><strong>'+manifest.counts[type as Material['type']]+'</strong>'+label+'</span>').join(''));
}
function renderDocumentList(search = '') {
  const docs = manifest.items.filter(i => i.type === 'document' && (i.title+i.path+i.stage).toLowerCase().includes(search.toLowerCase()));
  const groups = [...new Set(docs.map(i=>i.path.startsWith('notes/')?'中文研究':i.path.startsWith('web/docs/')||i.path.includes('shared/human')?'上游规范与来源':i.path.includes('/licenses/')||i.path.endsWith('/LICENSE')?'完整许可证':'项目与运行说明'))];
  document.querySelector('#doc-list')!.innerHTML = groups.map(group => '<section><h3>'+group+'</h3>' + docs.filter(i=>(i.path.startsWith('notes/')?'中文研究':i.path.startsWith('web/docs/')||i.path.includes('shared/human')?'上游规范与来源':i.path.includes('/licenses/')||i.path.endsWith('/LICENSE')?'完整许可证':'项目与运行说明')===group).map(i=>'<a href="'+docLink(i.path)+'#reader" data-doc="'+e(i.path)+'"><strong>'+e(i.title)+'</strong><small>'+e(i.stage)+' / '+e(i.path)+'</small></a>').join('')+'</section>').join('') || '<p>没有匹配资料。</p>';
}
async function showDocument(path: string, push = false) {
  const generation = ++docGeneration, item = manifest.items.find(i=>i.path===path && i.type==='document');
  const target = document.querySelector('#document')!;
  if (!item) { target.innerHTML = '<h3>未找到这份资料</h3><p>请从左侧完整目录选择。</p>'; return; }
  target.innerHTML = '<p role="status">正在读取完整原文…</p>';
  const res = await fetch('./'+item.url); if (!res.ok) throw new Error('无法读取 '+item.path);
  const text = await res.text(); if (generation !== docGeneration) return;
  target.innerHTML = `<div class="document-meta"><span class="state">${e(item.stage)}</span><code>${e(item.path)}</code><a href="./${item.url}" download>下载原文 ↓</a></div><div class="prose">${markdown(text,item.path,manifest)}</div><details class="raw-source"><summary>查看完整原文（Markdown / 许可证）</summary><pre>${e(text)}</pre></details>`;
  document.querySelectorAll('[data-doc]').forEach(a=>{ if(a.getAttribute('data-doc')===path) a.setAttribute('aria-current','page');else a.removeAttribute('aria-current'); });
  if(push) history.pushState(null,'',docLink(path)+'#reader');
  document.title = item.title + ' · Muster 研究';
}
function bindReader() {
  renderDocumentList();
  document.querySelector<HTMLInputElement>('#doc-search')!.oninput = ev => renderDocumentList((ev.target as HTMLInputElement).value);
  const show = () => void showDocument(new URLSearchParams(location.search).get('doc') ?? 'notes/research.md').catch(showError);
  document.querySelector('#doc-list')!.addEventListener('click',ev=>{
    const link=(ev.target as HTMLElement).closest<HTMLAnchorElement>('[data-doc]');
    if(!link || (ev as MouseEvent).ctrlKey || (ev as MouseEvent).metaKey) return;
    ev.preventDefault(); void showDocument(link.dataset.doc!,true).catch(showError);
    if(innerWidth<850) document.querySelector('#document')!.scrollIntoView({behavior:'smooth',block:'start'});
  });
  window.addEventListener('popstate',show);
  void showDocument(new URLSearchParams(location.search).get('doc') ?? 'notes/research.md').then(() => {
    if(new URLSearchParams(location.search).has('doc')) {
      const id = decodeURIComponent(location.hash.slice(1));
      (document.getElementById(id) ?? document.querySelector('#reader'))?.scrollIntoView({block:'start',behavior:'instant'});
    }
  }).catch(showError);
}
function bindEvidence() {
  for (const id of ['image','report']) {
    const list = manifest.items.filter(i=>i.type===id); const select = document.querySelector<HTMLSelectElement>('#'+id+'-stage')!;
    [...new Set(list.map(i=>i.stage))].forEach(stage=>select.add(new Option(stage,stage)));
  }
  const filtered = (type: 'image'|'report') => {
    const search = document.querySelector<HTMLInputElement>('#'+type+'-search')!.value.toLowerCase();
    const stage = document.querySelector<HTMLSelectElement>('#'+type+'-stage')!.value;
    return manifest.items.filter(i=>i.type===type && (!stage||i.stage===stage) && (i.title+i.path+i.stage).toLowerCase().includes(search));
  };
  const gallery = () => {
    const images = filtered('image');
    document.querySelector('#gallery-count')!.textContent = '显示 '+images.length+' / '+manifest.counts.image+' 张';
    document.querySelector('#image-gallery')!.innerHTML = images.map(i=>`<figure><a href="./${i.url}" target="_blank" rel="noopener"><img loading="lazy" src="./${i.url}" alt="${e(i.title)}"></a><figcaption><span class="state">${e(i.stage)}</span><strong>${e(i.title)}</strong><code>${e(i.name)}</code><a href="./${i.url}" download>下载原图 ↓</a></figcaption></figure>`).join('') || '<p>没有匹配截图。</p>';
  };
  const reports = () => {
    const reports = filtered('report');
    document.querySelector('#report-list')!.innerHTML = reports.map(i=>`<a href="${reportLink(i.path)}" data-report="${e(i.path)}"><strong>${e(i.name)}</strong><small>${e(i.stage)} · ${i.passed===true?'当时验收通过':i.passed===false?'记录含失败':'原始资料'}${i.checks!==null?' · '+i.checks+' 项':''}</small></a>`).join('') || '<p>没有匹配报告。</p>';
  };
  for (const id of ['image','report']) for (const control of ['search','stage'])
    document.querySelector('#'+id+'-'+control)!.addEventListener('input',id==='image'?gallery:reports);
  document.querySelector('#report-list')!.addEventListener('click',ev=>{
    const a=(ev.target as HTMLElement).closest<HTMLElement>('[data-report]'); if(!a||(ev as MouseEvent).ctrlKey||(ev as MouseEvent).metaKey)return;
    ev.preventDefault();void showReport(a.dataset.report!,true).catch(showError);
    if(innerWidth<850)document.querySelector('#report-detail')!.scrollIntoView({behavior:'smooth'});
  });
  gallery();reports();
  const load=()=>void showReport(new URLSearchParams(location.search).get('file')??'notes/airport-browser-results.json').catch(showError);
  window.addEventListener('popstate',load);load();
}
async function showReport(path: string,push=false) {
  const generation=++reportGeneration, item=manifest.items.find(i=>i.path===path&&i.type==='report'),target=document.querySelector('#report-detail')!;
  if(!item){target.innerHTML='<p>未找到这份 JSON，请从清单选择。</p>';return;}
  const res=await fetch('./'+item.url);if(!res.ok)throw new Error('报告加载失败');const text=await res.text();if(generation!==reportGeneration)return;
  target.innerHTML=`<span class="state">${e(item.stage)}</span><h3>${e(item.name)}</h3><p>${item.date?'采集时间：'+e(String(item.date)):'未提供采集时间'} · ${item.passed===true?'记录结论：通过':item.passed===false?'记录结论：未通过':'原始数据 / 无通过标志'}</p><p class="muted">这是对应阶段的原始记录。完整范围与限制以同阶段笔记为准。</p><a class="button" href="./${item.url}" download>下载完整 JSON ↓</a><details class="digest"><summary>文件校验与来源</summary><code>SHA-256: ${item.sha256}</code><p>${e(item.path)} · ${item.bytes} bytes</p></details><pre>${e(text)}</pre>`;
  if(push)history.pushState(null,'',reportLink(path));
}
function showError(error: unknown) {
  const banner=document.createElement('div');banner.className='error-banner';banner.setAttribute('role','alert');banner.textContent=error instanceof Error?error.message:String(error);root.prepend(banner);
}
function setupLive() {
  type Experience = typeof experiences[number];
  let current: Experience=experiences[0],frame:HTMLIFrameElement|null=null,playing=false,active=false,ready=false,requestedResume:boolean|null=null;
  const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
  const send=(action:string)=>frame?.contentWindow?.postMessage({type:'muster-hub',action},location.origin);
  const close=()=>{
    send('pause'); frame?.remove();frame=null;ready=false;playing=false;active=false;
    $('live-placeholder').hidden=false;$<HTMLButtonElement>('live-close').disabled=true;$<HTMLButtonElement>('live-toggle').disabled=true;
    $('live-status').textContent='按下方按钮加载真实场景';
  };
  function href() {
    if(current.id!=='harness')return current.href;
    const q=new URLSearchParams({asset:$<HTMLSelectElement>('harness-asset').value,ref:'1',w:'1280',h:'840'});
    if(q.get('asset')==='germany/panzer-iv-h')q.set('config',JSON.stringify({schuerzen:$<HTMLInputElement>('harness-skirts').checked?'fitted':'removed'}));
    return './harness.html?'+q;
  }
  function select(id:string,load=false) {
    const next=experiences.find(x=>x.id===id);if(!next)return;
    if(current.id!==next.id){close();current=next;}
    document.querySelectorAll<HTMLButtonElement>('[data-live]').forEach(tab=>{
      const selected = tab.dataset.live===current.id; tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
    });
    $('live-panel').setAttribute('aria-labelledby','tab-'+current.id);
    $('live-title').textContent=current.title+' / '+current.subtitle;$<HTMLImageElement>('live-image').src=asset(current.image);
    $('live-placeholder-title').textContent=current.title;$('live-description').textContent=current.text;
    $('live-steps').innerHTML=current.steps.map(step=>'<li>'+e(step)+'</li>').join('');
    $<HTMLAnchorElement>('live-open').href=href();$<HTMLAnchorElement>('live-doc').href=docLink(current.doc);
    $('harness-options').hidden=current.id!=='harness';
    if(load&&!frame)launch();
  }
  function launch(){
    close();frame=document.createElement('iframe');frame.id='live-frame';frame.title=current.title+'真实交互体验';frame.src=href();
    frame.allow='autoplay; fullscreen';
    $('live-placeholder').hidden=true;$('live-stage').append(frame);$<HTMLButtonElement>('live-close').disabled=false;
    $('live-status').textContent='正在生成真实模型，首次加载可能需要等待…';
    frame.addEventListener('load',()=>send('status'));
  }
  document.querySelectorAll('[data-live]').forEach(button=>button.addEventListener('click',()=>select((button as HTMLElement).dataset.live!,true)));
  document.querySelectorAll('[data-experience]').forEach(link=>link.addEventListener('click',ev=>{
    ev.preventDefault();select((link as HTMLElement).dataset.experience!,true);$('experience').scrollIntoView({behavior:'smooth',block:'start'});
  }));
  $('live-load').onclick=launch;$('live-close').onclick=close;
  $('harness-apply').onclick=()=>{$<HTMLAnchorElement>('live-open').href=href();launch();};
  $('harness-asset').onchange=()=>{
    $<HTMLInputElement>('harness-skirts').disabled=$<HTMLSelectElement>('harness-asset').value!=='germany/panzer-iv-h';
    $<HTMLAnchorElement>('live-open').href=href();
  };
  document.querySelectorAll<HTMLButtonElement>('[data-live]').forEach((button,index)=>button.addEventListener('keydown',event=>{
    const tabs=[...document.querySelectorAll<HTMLButtonElement>('[data-live]')];
    const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;
    if(next<0)return;event.preventDefault();tabs.forEach((tab,i)=>tab.tabIndex=i===next?0:-1);tabs[next].focus();
  }));
  $('live-fullscreen').onclick=()=>{void $('live-panel').requestFullscreen().catch(()=>{if(frame)frame.contentWindow?.focus();});};
  $('live-toggle').onpointerdown=()=>{requestedResume=!playing;};
  $('live-toggle').onclick=()=>{send((requestedResume??!playing)?'resume':'pause');requestedResume=null;frame?.contentWindow?.focus();};
  window.addEventListener('message',ev=>{
    if(ev.origin!==location.origin||ev.source!==frame?.contentWindow||ev.data?.type!=='muster-hub-status')return;
    ready=!!ev.data.ready;playing=!!ev.data.playing;active=!!ev.data.active;
    $('live-status').textContent=!ready?'正在生成真实模型…':playing?'正在运行 · 声音随演示同步':active?'已暂停 · 时间与声音均已停止':'模型已就绪 · 在场景中启动演示或任务';
    $<HTMLButtonElement>('live-toggle').disabled=!ready||!active;$('live-toggle').textContent=playing?'暂停体验':'继续体验';
  });
  setInterval(()=>{
    if(!frame)return;
    if(['camp','airport','battle'].includes(current.id))send('status');
    else {
      const win=frame.contentWindow as (Window&{__appReady?:boolean;__ready?:boolean;__error?:string})|null;
      if(win?.__error)$('live-status').textContent='模型未能加载：'+win.__error;
      else if(win?.__appReady||win?.__ready)$('live-status').textContent='真实模型已就绪 · 可直接观察与操作';
    }
  },700);
  new IntersectionObserver(entries=>{if(entries[0].intersectionRatio===0)send('pause');},{threshold:0}).observe($('live-panel'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)send('pause');});
  window.addEventListener('pagehide',()=>send('pause'));
  select(new URLSearchParams(location.search).get('experience')??'camp');
}
if(page==='home')home();else if(page==='research')research();else evidence();
new ResizeObserver(entries => document.documentElement.style.setProperty('--header-height', entries[0].target.getBoundingClientRect().height + 'px')).observe(document.querySelector('.site-header')!);
void getManifest().then(value=>{
  manifest=value;showCounts();if(page==='research')bindReader();if(page==='evidence')bindEvidence();
  if(page!=='research' && location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({block:'start',behavior:'instant'});
}).catch(showError);



