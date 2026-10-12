import { data, images, priorityNames, sceneNames, escapeHtml as e } from './catalog.js';
import noteUrl from '../../../notes/product-directions.md?url&no-inline';
import dataUrl from '../../../notes/product-directions.json?url&no-inline';
import licenseUrl from '../../licenses/sakura-crossing-MIT.txt?url&no-inline';
import './style.css';

const text = (id, value) => { document.getElementById(id).textContent = value; };
text('hero-summary', data.summary);
text('position', `${data.understanding.position}。${data.understanding.explanation}`);
text('boundary', data.understanding.boundary);
text('reuse-principle', data.reuse.principle);
text('ai-description', data.reuse.ai);
text('data-contract', data.reuse.dataContract);
text('content-version', `内容协议 v${data.schemaVersion} · 更新 ${data.updatedAt}`);
text('source-scope', data.source.scope);
text('source-license', data.source.license);
text('recommendation-basis', data.recommendation.basis);
text('directions-title', `${data.directions.length} 个产品方向，逐项看清扩展`);
document.querySelector('meta[name="description"]').setAttribute('content', `理解三渲二场景的已有能力，比较 ${data.directions.length} 种产品方向，查看扩展步骤与可复用研究数据。`);
document.querySelector('#download-note').href = noteUrl;
document.querySelector('#download-data').href = dataUrl;
document.querySelector('#license-link').href = licenseUrl;
for (const scene of ['street', 'forest', 'square']) document.getElementById('hero-' + scene).src = images[scene];
document.querySelector('#mechanism').innerHTML = data.understanding.mechanism.map((item, i) => `<article><span>0${i + 1}</span><h3>${e(item.title)}</h3><p>${e(item.text)}</p></article>`).join('');
document.querySelector('#value').innerHTML = data.understanding.value.map((item) => `<article><h3>${e(item.title)}</h3><p>${e(item.text)}</p></article>`).join('');
document.querySelector('#capability-grid').innerHTML = data.capabilities.map((item) => `<article><span class="available-label">✓ 本地已实现</span><h3>${e(item.title)}</h3><p>${e(item.detail)}</p></article>`).join('');
document.querySelector('#recommendations').innerHTML = data.recommendation.items.map((item, i) => `<article><span>0${i + 1}</span><h3>${e(item.title)}</h3><p>${e(item.text)}</p></article>`).join('');
document.querySelector('#reuse-layers').innerHTML = data.reuse.layers.map((item, i) => `<article><div><span>0${i + 1}</span><h3>${e(item.title)}</h3></div><p><b>当前基础</b>${e(item.now)}</p><p><b>扩展方式</b>${e(item.next)}</p></article>`).join('');
document.querySelector('#extension-steps').innerHTML = data.reuse.steps.map((step) => `<li>${e(step)}</li>`).join('');
document.querySelector('#references').innerHTML = data.references.map((item) => `<li><a href="${e(item.url)}" target="_blank" rel="noopener noreferrer">${e(item.title)} ↗</a><span>${e(item.scope)}</span></li>`).join('');

let filter = 'all';
let selected = data.directions[0].id;
const list = document.querySelector('#direction-list');
const detail = document.querySelector('#direction-detail');
const filters = Array.from(document.querySelectorAll('button[data-filter]'));
for (const button of filters) {
  const count = data.directions.filter((item) => button.dataset.filter === 'all' || item.priority === button.dataset.filter).length;
  button.querySelector('span').textContent = count;
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    const visible = data.directions.filter((item) => filter === 'all' || item.priority === filter);
    if (!visible.some((item) => item.id === selected)) select(visible[0].id, true);
    else render();
    text('selection-status', `筛选${button.childNodes[0].textContent.trim()}，共 ${visible.length} 个方向；当前查看${data.directions.find((item) => item.id === selected).title}。`);
  });
}

function render() {
  const item = data.directions.find((direction) => direction.id === selected);
  for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  list.innerHTML = data.directions.filter((direction) => filter === 'all' || direction.priority === filter).map((direction) => `<button type="button" data-direction="${direction.id}" aria-pressed="${direction.id === selected}" aria-controls="direction-detail"><span>${e(direction.category)}</span><strong>${e(direction.title)}</strong><small>${priorityNames[direction.priority]} <b aria-hidden="true">↗</b></small></button>`).join('');
  detail.innerHTML = `<div class="detail-top"><div><div class="detail-badges"><span>${priorityNames[item.priority]}</span><span>工程范围 ${e(item.effort)}</span></div><h3 id="direction-title">${e(item.title)}</h3><p class="detail-audience">面向 ${e(item.audience)}</p><p class="detail-problem">${e(item.problem)}</p></div><figure><img src="${images[item.scene]}" alt="${sceneNames[item.scene]}技术实验实拍，作为${e(item.title)}的视觉参考" loading="lazy" /><figcaption>视觉参考 · ${sceneNames[item.scene]}<br />${item.demo ? '最小搭建器已提供独立入口' : '当前实验场景，产品方案待建设'}</figcaption></figure></div>
    <p class="stage-note">${e(item.stage)}</p><p class="detail-scenario">${e(item.scenario)}</p>
    <div class="flow" aria-label="拟议用户流程">${item.loop.map((step, index) => `<span><b>0${index + 1}</b>${e(step)}</span>`).join('')}</div>
    <div class="detail-columns"><section><h4>可以沿用的基础</h4><div class="capability-tags">${item.reuse.map((id) => `<a href="#capabilities">${e(data.capabilities.find((capability) => capability.id === id).title)}</a>`).join('')}</div><h4>需要增加的能力</h4><ul class="addition-list">${item.additions.map((addition) => `<li><strong>${e(addition.title)}</strong><p>${e(addition.detail)}</p></li>`).join('')}</ul></section><section class="mvp-card"><span class="eyebrow">SMALLEST COMPLETE FLOW</span><h4>先做一个最小方案</h4><p>${e(item.mvp)}</p><h4>怎样判断完成</h4><ul>${item.validation.map((value) => `<li>${e(value)}</li>`).join('')}</ul></section></div>
    <div class="detail-bottom"><p>${e(item.constraint)}</p>${item.demo ? `<a class="button primary" href="./${e(item.demo)}">打开小镇搭建器 ↗</a>` : `<a class="button" href="./lab.html#${item.scene}">查看${sceneNames[item.scene]}实验 ↗</a>`}</div>`;
}
function select(id, writeHistory) {
  if (!data.directions.some((item) => item.id === id)) return;
  selected = id;
  if (writeHistory && location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  render();
}
list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-direction]');
  if (!button) return;
  // Keep the active button focused when replacing the list for its pressed state.
  select(button.dataset.direction, true);
  if (window.matchMedia('(max-width: 740px)').matches) {
    const heading = detail.querySelector('#direction-title');
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    detail.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  } else list.querySelector(`[data-direction="${selected}"]`).focus({ preventScroll: true });
  text('selection-status', `正在查看${data.directions.find((item) => item.id === selected).title}。${data.directions.find((item) => item.id === selected).stage}。`);
});
function readRoute(scrollToDirection = false) {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const item = data.directions.find((direction) => direction.id === id);
  if (item) {
    if (filter !== 'all' && item.priority !== filter) filter = 'all';
    select(item.id, false);
    if (scrollToDirection) (window.matchMedia('(max-width: 740px)').matches ? detail : document.querySelector('#directions')).scrollIntoView({ behavior: 'instant', block: 'start' });
  }
}
render();
readRoute(true);
window.addEventListener('popstate', () => readRoute());
window.addEventListener('hashchange', () => readRoute());
