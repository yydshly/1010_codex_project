import './style.css';
import './hub-style.css';
import './guide-style.css';
import './applications-style.css';
import { algorithms, scenarios, families, statuses, understanding, sources, upstream } from './capabilities-data.js';

const $ = id => document.getElementById(id);
// 内容来自固定研究文件，所有文本仍统一转义后再放入 HTML。
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const algorithmName = id => algorithms.find(item => item.id === id).name;
const links = refs => refs.map(key => `<a href="${upstream}${sources[key][1]}">${esc(sources[key][0])} ↗</a>`).join(' · ');
const tag = scene => `<span class="status-badge ${scene.status}">${statuses[scene.status]}</span>`;
const fields = [['input', '给它什么输入'], ['output', '它输出什么'], ['feedback', '用什么反馈学习'], ['value', '可能的业务价值'], ['baseline', '先比较的简单方法'], ['risk', '何时可能失败'], ['prototype', '最小验证方案'], ['evidence', '目前有什么证据']];
function detail(scene) {
  return `<p class="case-algorithms">关联机制：${scene.algorithms.map(id => `<a href="#algo-${id}">${esc(algorithmName(id))}</a>`).join(' · ')}</p><dl class="case-fields">${fields.map(([key, label]) => `<div><dt>${label}</dt><dd>${esc(scene[key])}</dd></div>`).join('')}</dl>${scene.link ? `<a class="inline-action" href="${scene.link}">${esc(scene.linkText)} ↗</a>` : ''}`;
}
$('understanding-list').innerHTML = understanding.map(([title, content]) => `<article class="understanding-item"><h3>${esc(title)}</h3><p>${esc(content)}</p></article>`).join('');
$('algorithm-list').innerHTML = algorithms.map((a, i) => `<article id="algo-${a.id}" class="algorithm-card"><div class="algorithm-heading"><span class="algorithm-number">${String(i + 1).padStart(2, '0')}</span><div><span class="mechanism-role">${esc(a.role)}</span><h3>${esc(a.name)}</h3><small>${esc(a.modules)}</small></div></div><p>${esc(a.essence)}</p><p class="algorithm-example"><b>具体例子：</b>${esc(a.example)}</p><details><summary>适用条件、边界与可选公式</summary><p><b>适合研究：</b>${esc(a.fit)}</p><p><b>边界：</b>${esc(a.limit)}</p><p class="mechanism-math">${esc(a.math)}</p></details><p class="source-line">${links(a.refs)}</p></article>`).join('');
$('upstream-sources').innerHTML = Object.entries(sources).map(([key, [label, path]]) => `<a href="${upstream}${path}">${esc(label)} · ${esc(path)} ↗</a>`).join('');

const stepNames = ['观察 / 编码', '计算 / 判断', '执行 / 发生', '真实反馈', '学习 / 再用'];
let sceneIndex = 0;
let stepIndex = 0;
function showStep(index) {
  stepIndex = index;
  const scene = scenarios[sceneIndex];
  $('loop-number').textContent = `第 ${index + 1} 步 · ${families[scene.family]}`;
  $('loop-title').textContent = stepNames[index];
  $('loop-text').textContent = scene.steps[index];
  $('loop-position').textContent = `${index + 1} / 5`;
  $('loop-back').disabled = index === 0;
  $('loop-next').disabled = index === 4;
  for (const button of $('loop-steps').querySelectorAll('button')) button.setAttribute('aria-pressed', String(Number(button.dataset.step) === index));
}
function chooseScene(id) {
  const index = scenarios.findIndex(scene => scene.id === id);
  if (index < 0) return;
  sceneIndex = index;
  const scene = scenarios[index];
  $('case-title').textContent = scene.name;
  $('case-question').textContent = scene.question;
  $('case-status').className = `status-badge ${scene.status}`;
  $('case-status').textContent = statuses[scene.status];
  $('case-detail').innerHTML = detail(scene);
  for (const button of $('scenario-picker').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.scene === id));
  showStep(0);
}
$('loop-steps').innerHTML = stepNames.map((name, i) => `<button type="button" data-step="${i}" aria-pressed="false"><span>${i + 1}</span>${name}</button>`).join('');
for (const button of $('loop-steps').querySelectorAll('button')) button.addEventListener('click', () => showStep(Number(button.dataset.step)));
$('loop-back').addEventListener('click', () => showStep(Math.max(0, stepIndex - 1)));
$('loop-next').addEventListener('click', () => showStep(Math.min(4, stepIndex + 1)));

function filterScenes() {
  const query = $('scenario-search').value.trim().toLocaleLowerCase();
  const family = $('scenario-family').value;
  const visible = scenarios.filter(scene => (family === 'all' || scene.family === family) && `${Object.values(scene).flat().join(' ')} ${scene.algorithms.map(algorithmName).join(' ')}`.toLocaleLowerCase().includes(query));
  $('scenario-count').textContent = `显示 ${visible.length} / ${scenarios.length} 个场景 · 三类本地场景已验证，其余为上游机制或业务候选`;
  $('scenario-picker').innerHTML = visible.map(scene => `<button type="button" data-scene="${scene.id}" aria-pressed="${scenarios[sceneIndex].id === scene.id}"><span>${families[scene.family]}</span>${esc(scene.name)}</button>`).join('');
  $('scenario-list').innerHTML = visible.length ? visible.map(scene => `<details class="scenario-design" id="scene-${scene.id}"><summary><span>${esc(scene.name)}</span>${tag(scene)}</summary><p>${esc(scene.question)}</p>${detail(scene)}<button class="show-loop" type="button" data-scene="${scene.id}">用五步闭环理解这个场景 ↑</button></details>`).join('') : '<p class="empty-note">没有匹配场景。清空搜索或切回全部任务。</p>';
  // 保证筛选后的选中说明属于可见集合；无匹配时明确隐藏说明。
  $('explorer').hidden = !visible.length;
  if (visible.length && !visible.some(scene => scene.id === scenarios[sceneIndex].id)) chooseScene(visible[0].id);
  for (const button of $('scenario-picker').querySelectorAll('button')) button.addEventListener('click', () => chooseScene(button.dataset.scene));
  for (const button of $('scenario-list').querySelectorAll('.show-loop')) button.addEventListener('click', () => {
    chooseScene(button.dataset.scene);
    $('explorer').scrollIntoView({ block: 'start' });
    $('loop-steps').querySelector('button').focus({ preventScroll: true });
  });
}
$('scenario-search').addEventListener('input', filterScenes);
$('scenario-family').addEventListener('change', filterScenes);
function restoreSceneAnchor() {
  const id = location.hash.startsWith('#scene-') ? location.hash.slice(7) : '';
  if (!scenarios.some(scene => scene.id === id)) return;
  $('scenario-family').value = 'all';
  $('scenario-search').value = '';
  filterScenes(); chooseScene(id);
  const target = $(`scene-${id}`);
  target.open = true;
  target.scrollIntoView({ block: 'start' });
}
filterScenes(); chooseScene('fish'); restoreSceneAnchor();
window.addEventListener('hashchange', restoreSceneAnchor);
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) for (const a of document.querySelectorAll('.guide-toc a')) a.setAttribute('aria-current', String(a.hash === '#' + entry.target.id));
}, { rootMargin: '-10% 0px -65% 0px' });
for (const section of document.querySelectorAll('.guide-section')) observer.observe(section);
