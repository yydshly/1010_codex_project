import './style.css';
import research from '../../../notes/research-hub.json';
import directions from '../../../notes/product-directions.json';
import measurements from '../../../notes/lab-measurements.json';
import registry from '../../../../../projects.json';
import kitUrl from '../../packages/research-rain-kit-0.1.0.tgz?url&no-inline';
import summaryUrl from '../../../notes/research-summary.md?url&no-inline';
import guideUrl from '../../../assets/scene-map-preview.webp?url&no-inline';

// Vite copies referenced material into this project's production assets. Text is
// fetched on demand; the research reader does not depend on another dev server.
const imageImports = import.meta.glob([
  '../../../../001-sakura-crossing/assets/{hub-sunny,hub-rainy,business-cover,tour-shop,lab-street,builder-desktop,directions-overview,cover,ink-off}.jpg',
  '../../../../001-sakura-crossing/assets/{ai-town-decisions,overview-banner}.png',
  '../../../assets/scene-map-preview.webp',
  '../../../references/012-threejs-conference/assets/{upstream-controls,desktop,modules-minimal,modules-gpu-check,reflection-off,reflection-on,modules-droplets-off,modules-droplets-on,upstream-bloom-off}.jpg',
], { eager: true, query: '?url', import: 'default' });
const fileImports = import.meta.glob([
  '../../../../001-sakura-crossing/notes/*.{md,json}',
  '../../../references/012-threejs-conference/notes/*.{md,json}',
  '../../../web/THIRD_PARTY.md',
  '../../../references/012-threejs-conference/web/THIRD_PARTY.md',
  '../../../references/012-threejs-conference/web/modules/rain-kit/*.md',
  '../../../../*/README.md',
], { eager: true, query: '?url&no-inline', import: 'default' });
// Vite normalizes paths inside the current project (../../../notes/...), while
// sibling project paths retain ../../../../012-... . Canonicalize both forms.
function projectPath(path) {
  if (path.startsWith('../../../../')) return path.slice('../../../../'.length);
  if (path.startsWith('../../../references/')) return path.slice('../../../references/'.length);
  if (path.startsWith('../../../')) return `001-sakura-crossing/${path.slice('../../../'.length)}`;
  if (path.startsWith('../../')) return `001-sakura-crossing/web/${path.slice('../../'.length)}`;
  throw new Error(`无法识别资料路径：${path}`);
}
const files = new Map(Object.entries(fileImports).map(([path, url]) => [projectPath(path), url]));
const imageFiles = new Map(Object.entries(imageImports).map(([path, url]) => [projectPath(path), url]));
const images = new Map([...imageFiles].map(([path, url]) => [`${path.startsWith('001-') ? '001' : '012'}/${path.split('/').pop()}`, url]));
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const entry = id => research.entries.find(item => item.id === id);
const groupLabels = { all: '全部入口', sakura: '樱花小街', rain: '雨夜场景', modules: '可复用模块', reading: '研究说明' };
const reader = $('#reader');
const docs = new Map(research.documents.map(doc => [doc.id, doc]));
let readerRequest = 0;
let entryGroup = 'all';
let comparisonId = research.comparisons[0].id;
let liveFrame = null;

$('#entry-count').textContent = research.entries.length;
$('#doc-count').textContent = research.documents.length;
$('#updated-at').textContent = `更新于 ${research.updatedAt}`;
$('#conclusion').textContent = research.conclusion;
$('#hero-image').src = guideUrl;
const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const onlineEntry = item => Boolean(item.publicHref) || (item.href.startsWith('./') && item.id !== 'sakura-game');
const entryHref = item => localHost ? item.href : onlineEntry(item) ? item.publicHref || item.href : '#local-services';
const entryService = item => !localHost && onlineEntry(item) ? '在线静态页面 / 三维效果依设备能力' : item.service;
$('#executive-summary').innerHTML = research.executiveSummary.map((item, index) => `<article class="summary-card" id="summary-${item.id}"><span class="summary-number">${String(index + 1).padStart(2, '0')}</span><h3>${escape(item.title)}</h3>${item.paragraphs.map(text => `<p>${escape(text)}</p>`).join('')}</article>`).join('');
$('#publication-note').textContent = localHost ? '当前为本地预览。公开内容包括联合全图、完整摘要、资料、001静态场景与012原创雨夜/最小例子/GPU现场；原库完整城市和模型游戏仍在本机。' : '在线提供联合全图、完整摘要与资料、001静态场景，以及012原创雨夜、最小例子和GPU检查页。原库完整城市/独立素材与AI模型服务仍在本机。图内制作时的发布状态原样保留，当前范围以本网页为准。';
$('#kit-download').href = kitUrl;
$('#summary-download').href = summaryUrl;

function runCommand(item) {
  const project = item.project === '012' ? '012-threejs-conference' : '001-sakura-crossing';
  return `cd projects/${project}/web\n${item.command}`;
}

function renderEntries() {
  const query = $('#entry-search').value.trim().toLocaleLowerCase();
  const filtered = research.entries.filter(item => (entryGroup === 'all' || item.group === entryGroup)
    && `${item.title} ${item.subtitle} ${item.description} ${item.observe} ${item.renderer}`.toLocaleLowerCase().includes(query));
  $('#directory-result').textContent = `显示 ${filtered.length} / ${research.entries.length} 个入口 · ${groupLabels[entryGroup]}${query ? ` · 搜索“${query}”` : ''}`;
  $('#entry-empty').hidden = filtered.length > 0;
  $('#entry-grid').innerHTML = filtered.map(item => `<article class="entry-card" data-entry="${item.id}">
    <a class="entry-picture" href="${escape(entryHref(item))}"><img src="${escape(images.get(item.image))}" alt="${escape(item.title)} · ${escape(item.imageNote || '实际运行画面')}" loading="lazy" /><span class="entry-engine">${escape(item.renderer)}${item.imageNote ? ` · ${escape(item.imageNote)}` : ''}</span></a>
    <div class="entry-content"><p class="entry-kicker">${escape(groupLabels[item.group])} / ${escape(item.status)}</p><h3>${escape(item.title)}</h3><p class="entry-subtitle">${escape(item.subtitle)}</p><p class="entry-description">${escape(item.description)}</p>
    <div class="entry-actions"><a class="button" href="${escape(entryHref(item))}">${localHost || onlineEntry(item) ? '打开体验 ↗' : '查看本机运行说明 ↓'}</a>${item.live && (localHost || onlineEntry(item)) ? `<button class="text-link" data-live="${item.id}">在本页体验 ↓</button>` : ''}</div>
    <details><summary>观察方法与启动方式</summary><p>${escape(item.observe)}</p><p>${escape(entryService(item))} · ${onlineEntry(item) ? '可静态发布' : '需本机服务'}</p><pre>${escape(runCommand(item))}</pre></details></div></article>`).join('');
}
$('#entry-filters').innerHTML = Object.entries(groupLabels).map(([key, name]) => `<button data-filter="${key}" aria-pressed="${key === entryGroup}">${name}</button>`).join('');
$('#entry-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]'); if (!button) return;
  entryGroup = button.dataset.filter;
  $('#entry-filters').querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  renderEntries();
});
$('#entry-search').addEventListener('input', renderEntries);
renderEntries();
document.addEventListener('click', event => {
  const anchor = event.target.closest('a[href="#local-services"]');
  if (!anchor) return;
  const item = entry(anchor.closest('[data-entry]')?.dataset.entry || anchor.dataset.localEntry);
  $('#local-services').open = true;
  if (item) $('#service-command').textContent = runCommand(item);
});

function selectComparison(id) {
  comparisonId = id;
  const item = research.comparisons.find(item => item.id === id);
  $('#compare-tabs').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.compare === id)));
  for (const side of ['before', 'after']) {
    $(`#compare-${side}`).src = images.get(item[side]);
    $(`#compare-${side}`).alt = `${item[`${side}Label`]} · ${item.kind}`;
    $(`#${side}-label`).textContent = item[`${side}Label`];
  }
  $('#compare-number').textContent = `${String(research.comparisons.indexOf(item) + 1).padStart(2, '0')} / ${item.label}`;
  $('#compare-title').textContent = item.title;
  $('#compare-text').textContent = item.text;
  $('#compare-kind').textContent = item.kind;
  $('#compare-entry').href = entryHref(entry(item.entry));
  $('#compare-entry').dataset.localEntry = item.entry;
  setSplit(50);
}
function setSplit(value) {
  $('#compare-range').value = value;
  $('#compare-stage').style.setProperty('--split', `${value}%`);
  $('#compare-output').textContent = `分隔位置 ${value}%`;
}
$('#compare-tabs').innerHTML = research.comparisons.map(item => `<button data-compare="${item.id}" aria-pressed="false">${escape(item.label)}</button>`).join('');
$('#compare-tabs').addEventListener('click', event => { const button = event.target.closest('[data-compare]'); if (button) selectComparison(button.dataset.compare); });
$('#compare-range').addEventListener('input', event => setSplit(event.target.value));
$('#compare-principle').addEventListener('click', () => {
  selectPrinciple(research.comparisons.find(item => item.id === comparisonId).principle);
  $('#principles').scrollIntoView({ behavior: 'smooth' });
});
selectComparison(comparisonId);

const liveSelect = $('#live-select');
liveSelect.innerHTML = research.entries.filter(item => item.live && (localHost || onlineEntry(item))).map(item => `<option value="${item.id}">${escape(item.title)} / ${escape(item.renderer)}</option>`).join('');
function refreshLive() {
  const item = entry(liveSelect.value);
  $('#live-preview').src = images.get(item.image);
  $('#live-preview-title').textContent = item.title;
  $('#live-observe').textContent = item.observe;
  $('#live-open').href = entryHref(item);
  $('#service-command').textContent = runCommand(item);
}
function stopLive() {
  if (liveFrame) { liveFrame.remove(); liveFrame = null; }
  $('#live-placeholder').hidden = false;
  $('#live-close').hidden = true;
  $('#live-start').hidden = false;
  $('#live-frame').classList.remove('is-weather');
  $('#live-status').textContent = '实时场景已结束，可以继续阅读或载入另一项体验。';
}
function startLive() {
  if (liveFrame) stopLive();
  const item = entry(liveSelect.value);
  const iframe = document.createElement('iframe');
  iframe.title = `${item.title} · 实时体验`;
  iframe.allow = 'fullscreen; gamepad';
  iframe.allowFullscreen = true;
  iframe.src = item.id === 'sakura-weather' ? './weather.html?embed=1' : entryHref(item);
  $('#live-placeholder').hidden = true;
  $('#live-start').hidden = true;
  $('#live-close').hidden = false;
  $('#live-frame').classList.toggle('is-weather', item.id === 'sakura-weather');
  $('#iframe-slot').append(iframe); liveFrame = iframe;
  $('#live-status').textContent = `正在打开 ${item.title} · ${entryService(item)}。渲染状态见场景内提示；若无法呈现，展开下方启动说明。`;
  iframe.addEventListener('load', () => {
    if (liveFrame === iframe) $('#live-status').textContent = `${item.title} 的页面已打开。可在场景内操作；结束体验会卸载此页面。若独立服务未运行，请查看下方启动说明。`;
  }, { once: true });
}
liveSelect.addEventListener('change', () => { if (liveFrame) stopLive(); refreshLive(); });
$('#live-start').addEventListener('click', startLive);
$('#live-start-image').addEventListener('click', startLive);
$('#live-close').addEventListener('click', stopLive);
refreshLive();

function selectPrinciple(id) {
  const item = research.principles.find(item => item.id === id);
  $('#principle-tabs').querySelectorAll('button').forEach(button => {
    const selected = button.dataset.principle === id;
    button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
  });
  $('#principle-panel').setAttribute('aria-labelledby', `principle-${id}`);
  $('#principle-panel').innerHTML = `<p class="eyebrow">${escape(item.tag)}</p><h3>${escape(item.name)}</h3><p class="principle-summary">${escape(item.summary)}</p><ol>${item.steps.map(text => `<li>${escape(text)}</li>`).join('')}</ol>
    <div class="explanation-row"><b>怎样观察</b><p>${escape(item.observe)}</p></div><div class="explanation-row"><b>可复用价值</b><p>${escape(item.value)}</p></div><div class="explanation-row"><b>边界与成本</b><p>${escape(item.limit)}</p></div>
    <div class="principle-actions"><a class="button" data-local-entry="${item.entry}" href="${escape(entryHref(entry(item.entry)))}">打开对应演示 ↗</a><button class="text-link" data-doc="${item.doc}">阅读全文研究笔记 ↗</button></div>`;
}
$('#principle-tabs').innerHTML = research.principles.map((item, index) => `<button role="tab" id="principle-${item.id}" data-principle="${item.id}" aria-controls="principle-panel" aria-selected="false" tabindex="-1"><span>${String(index + 1).padStart(2, '0')}</span>${escape(item.name)}</button>`).join('');
$('#principle-tabs').addEventListener('click', event => { const button = event.target.closest('[data-principle]'); if (button) selectPrinciple(button.dataset.principle); });
$('#principle-tabs').addEventListener('keydown', event => {
  const buttons = [...$('#principle-tabs').querySelectorAll('button')];
  const index = buttons.indexOf(event.target); if (index < 0) return;
  let next;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = buttons.length - 1;
  if (next !== undefined) { event.preventDefault(); selectPrinciple(buttons[next].dataset.principle); buttons[next].focus(); }
});
selectPrinciple(research.principles[0].id);

$('#ownership-body').innerHTML = research.ownership.map(item => `<tr><td>${escape(item.layer)}</td><td>${escape(item.owns)}</td><td>${escape(item.reuse)}</td><td>${escape(item.boundary)}</td></tr>`).join('');
$('#module-details').innerHTML = research.modules.map(item => `<details><summary><span>${escape(item.name)}</span><code>${escape(item.api)}</code></summary><div class="explanation-row"><b>关键配置</b><p>${escape(item.options)}</p></div><div class="explanation-row"><b>更新与释放</b><p>${escape(item.methods)}</p></div><div class="explanation-row"><b>宿主提供</b><p>${escape(item.host)}</p></div><div class="explanation-row"><b>成本</b><p>${escape(item.cost)}</p></div></details>`).join('');
$('#reuse-steps').innerHTML = research.reuseSteps.map(item => `<li>${escape(item)}</li>`).join('');
const minimalCode = `import { createMinimalExample }
  from '@research/rain-kit/examples/minimal';

// 画布容器需有确定宽高；canvas 样式：width:100%; height:100%; display:block
const canvas = document.querySelector('#scene');
const app = await createMinimalExample({ canvas });
const resize = () => {
  const { width, height } = canvas.parentElement.getBoundingClientRect();
  app.resize(width, height);
};
const observer = new ResizeObserver(resize);
observer.observe(canvas.parentElement);
resize();
app.setEffect('walk', true);

window.addEventListener('pagehide', () => {
  observer.disconnect();
  app.dispose();
}, { once: true });`;
$('#minimal-code').textContent = minimalCode;
$('#copy-code').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(minimalCode); $('#copy-status').textContent = '代码已复制。'; }
  catch { $('#copy-status').textContent = '浏览器未允许复制，请直接选中上方代码。'; }
});

$('#product-directions').innerHTML = directions.directions.map((item, index) => {
  const supplement = item.id === 'exploration-game' ? '后续已有 AI 守灯游戏、规则与漫游实践' : item.id === 'research-town' ? '当前新增两项目汇总、搜索与笔记阅读' : item.stage;
  return `<article class="direction-row"><span>${String(index + 1).padStart(2, '0')}</span><div><h3>${escape(item.title)}</h3><small>${escape(supplement)}</small></div><p>${escape(item.scenario)}</p><div class="direction-needs"><b>继续补：</b>${escape(item.additions.map(addition => addition.title).join(' / '))}<br /><a class="text-link" href="./directions.html#${item.id}">完整方案 ↗</a></div></article>`;
}).join('');
$('#questions').innerHTML = research.questions.map((item, index) => `<details${index === 0 ? ' open' : ''}><summary>${escape(item.q)}</summary><p>${escape(item.a)}</p></details>`).join('');
$('#roadmap').innerHTML = research.roadmap.map(item => `<article><small>${escape(item.state)}</small><h3>${escape(item.title)}</h3><ul>${item.items.map(text => `<li>${escape(text)}</li>`).join('')}</ul></article>`).join('');
$('#evidence-list').innerHTML = research.evidence.map(item => `<article class="evidence-item"><span class="evidence-type">${escape(item.type)}</span><div><h3>${escape(item.result)}</h3><p>${escape(item.proof)}</p></div><div class="evidence-limit"><p>${escape(item.limit)}</p><button class="text-link" data-doc="${item.doc}">查看记录与说明 ↗</button></div></article>`).join('');
$('#measurement-body').innerHTML = measurements.records.map(record => `<tr><td>${escape(record.settings.name)}</td><td>${record.summary.fps.toFixed(1)}</td><td>${record.summary.medianMs.toFixed(1)} ms</td><td>${record.summary.p95Ms.toFixed(1)} ms</td><td>${record.summary.cpuSubmitMs.toFixed(2)} ms</td><td>${record.submissions.calls}</td><td>${record.submissions.triangles.toLocaleString('zh-CN')}</td></tr>`).join('');

function renderDocuments() {
  const query = $('#doc-search').value.trim().toLocaleLowerCase();
  const filtered = research.documents.filter(doc => `${doc.title} ${doc.category} ${doc.project}`.toLocaleLowerCase().includes(query));
  $('#library-result').textContent = `显示 ${filtered.length} / ${research.documents.length} 份资料`;
  $('#doc-empty').hidden = filtered.length > 0;
  $('#document-list').innerHTML = filtered.map(doc => `<div class="document-row"><div><small>${doc.project} / ${escape(doc.category)}</small><button data-doc="${doc.id}">${escape(doc.title)}</button></div><a href="${escape(files.get(doc.path))}" download="${escape(doc.path.split('/').pop())}">下载 ↓</a></div>`).join('');
}
$('#doc-search').addEventListener('input', renderDocuments); renderDocuments();
$('#repository-count').textContent = `${registry.projects.length} 个子项目`;
$('#repository-list').innerHTML = registry.projects.map(project => {
  const id = String(project.id).padStart(3, '0');
  const path = `${id}-${project.slug}/README.md`;
  const docId = `repository-${id}`;
  docs.set(docId, { id: docId, title: project.name, project: id, path, category: '子项目完整 README' });
  return `<article class="repository-item"><h3><span>${id}</span>${escape(project.name)}</h3><p>${escape(project.summary)}</p><button class="text-link" data-doc="${docId}">在本页阅读 / 查看启动方式 ↗</button>${project.source ? `<a class="text-link" href="${escape(project.source)}" target="_blank" rel="noopener noreferrer">来源 ↗</a>` : ''}</article>`;
}).join('');
$('#source-list').innerHTML = research.sources.map(source => `<article class="source-item"><h3>${escape(source.name)}</h3><a href="${escape(source.url)}/tree/${source.commit}" target="_blank" rel="noopener noreferrer">研究时的上游源码 ↗</a><code>${source.commit}</code><p>${escape(source.role)}</p><p>${escape(source.license)}</p></article>`).join('');

function resolveReference(reference, documentPath) {
  if (/^https?:\/\//i.test(reference)) return reference;
  if (reference.startsWith('#')) return null; // keep the original heading text without a broken page anchor
  const parts = documentPath.split('/'); parts.pop();
  for (const part of reference.split('/')) {
    if (part === '..') parts.pop(); else if (part && part !== '.') parts.push(part);
  }
  const path = parts.join('/');
  return files.get(path) || imageFiles.get(path) || null;
}
// A small, escaped Markdown reader for local research. No raw HTML or remote
// scripts are rendered. Unbundled relative references remain readable text.
function inlineMarkdown(text, path) {
  const tokens = [];
  const token = html => { const id = tokens.push(html) - 1; return `\u0000${id}\u0000`; };
  let value = String(text).replace(/`([^`]+)`/g, (_, code) => token(`<code>${escape(code)}</code>`));
  value = value.replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (_, alt, href) => {
    const url = resolveReference(href, path);
    // Only display images bundled in this app; external source images stay links.
    return token(url && !/^https?:/.test(url) ? `<img src="${escape(url)}" alt="${escape(alt)}" loading="lazy" />` : `<span>${escape(alt)}${url ? ` · <a href="${escape(url)}" target="_blank" rel="noopener noreferrer">来源图片 ↗</a>` : ''}</span>`);
  });
  value = value.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, href) => {
    const url = resolveReference(href, path);
    return token(url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>` : `<span>${escape(label)} <code>${escape(href)}</code></span>`);
  });
  value = escape(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return value.replace(/\u0000(\d+)\u0000/g, (_, id) => tokens[Number(id)]);
}
function markdown(text, path) {
  const lines = text.replace(/\r/g, '').split('\n');
  const html = []; let index = 0;
  const row = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    if (/^\s*```/.test(line)) {
      const code = []; index++;
      while (index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index++]);
      index++; html.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`); continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { html.push(`<h${heading[1].length}>${inlineMarkdown(heading[2], path)}</h${heading[1].length}>`); index++; continue; }
    if (/^\s*\|/.test(line) && /^\s*\|?[\s:|-]+\|/.test(lines[index + 1] || '')) {
      const headers = row(line); index += 2; const rows = [];
      while (index < lines.length && /^\s*\|/.test(lines[index])) rows.push(row(lines[index++]));
      html.push(`<div class="table-wrap"><table><thead><tr>${headers.map(cell => `<th>${inlineMarkdown(cell, path)}</th>`).join('')}</tr></thead><tbody>${rows.map(cells => `<tr>${cells.map(cell => `<td>${inlineMarkdown(cell, path)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
    }
    if (/^\s*(?:[-*]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line); const items = [];
      while (index < lines.length && /^\s*(?:[-*]|\d+[.)])\s+/.test(lines[index])) items.push(lines[index++].replace(/^\s*(?:[-*]|\d+[.)])\s+/, ''));
      html.push(`<${ordered ? 'ol' : 'ul'}>${items.map(item => `<li>${inlineMarkdown(item, path)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`); continue;
    }
    if (/^>\s?/.test(line)) { html.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ''), path)}</blockquote>`); index++; continue; }
    if (/^\s*[-*_]{3,}\s*$/.test(line)) { html.push('<hr />'); index++; continue; }
    const paragraph = [line]; index++;
    while (index < lines.length && lines[index].trim() && !/^\s*(?:#|```|\||>|[-*]\s|\d+[.)]\s)/.test(lines[index])) paragraph.push(lines[index++]);
    html.push(`<p>${inlineMarkdown(paragraph.join('\n'), path)}</p>`);
  }
  return html.join('');
}
async function openDocument(id) {
  const doc = docs.get(id); if (!doc) return;
  const request = ++readerRequest;
  $('#reader-title').textContent = doc.title;
  $('#reader-category').textContent = `${doc.project} / ${doc.category} / 原始资料全文`;
  $('#reader-path').textContent = doc.path;
  $('#reader-download').href = files.get(doc.path) || '';
  $('#reader-download').download = doc.path.split('/').pop();
  $('#reader-content').textContent = '正在读取本地资料…';
  if (!reader.open) reader.showModal();
  reader.scrollTop = 0;
  try {
    const url = files.get(doc.path); if (!url) throw new Error('这份资料没有打包到当前网页。');
    const response = await fetch(url); if (!response.ok) throw new Error('本地资料暂时无法读取。');
    const text = await response.text(); if (request !== readerRequest || !reader.open) return;
    if (doc.path.endsWith('.json')) $('#reader-content').innerHTML = `<pre><code>${escape(JSON.stringify(JSON.parse(text), null, 2))}</code></pre>`;
    else $('#reader-content').innerHTML = markdown(text, doc.path);
  } catch (error) { if (request === readerRequest) $('#reader-content').textContent = error.message; }
}
$('#reader-close').addEventListener('click', () => { readerRequest++; reader.close(); });
reader.addEventListener('close', () => readerRequest++);
document.addEventListener('click', event => {
  const docButton = event.target.closest('[data-doc]'); if (docButton) openDocument(docButton.dataset.doc);
  const liveButton = event.target.closest('[data-live]');
  if (liveButton) { liveSelect.value = liveButton.dataset.live; refreshLive(); startLive(); $('#experience').scrollIntoView({ behavior: 'smooth' }); }
});
const chapterObserver = new IntersectionObserver(records => {
  for (const record of records) if (record.isIntersecting) {
    document.querySelectorAll('.chapter-nav a').forEach(link => link.setAttribute('aria-current', String(link.hash === `#${record.target.id}`)));
  }
}, { rootMargin: '-15% 0px -65% 0px' });
document.querySelectorAll('.chapter').forEach(section => chapterObserver.observe(section));
function dispose() { chapterObserver.disconnect(); if (liveFrame) { liveFrame.remove(); liveFrame = null; } }
window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); });
if (import.meta.hot) import.meta.hot.dispose(dispose);
