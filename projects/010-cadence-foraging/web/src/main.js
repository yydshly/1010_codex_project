import './style.css';
import './route-style.css';
import './hub.js';
import { createStreet, SHOPS } from './street.js';
import research from '../../notes/research.md?raw';

const $ = id => document.getElementById(id);
const KEYS = ['cadence', 'rule', 'q'];
let state = null, busy = false, playing = false, timer = null, street = null;
const colors = { cadence: '#247d75', rule: '#ca8431', q: '#8c69b4' };
const text = (id, value) => { $(id).textContent = value; };
const percent = value => `${Math.round(value * 100)}%`;
const fixed = value => Number(value).toFixed(2);

try { street = createStreet($('street'), $('shop-labels')); }
catch (error) { $('street').innerHTML = '<p class="empty-note" style="padding:80px 30px">这个浏览器无法建立 3D 街景。下方真实实验指标仍可使用。</p>'; console.error(error); }

$('move-buttons').innerHTML = SHOPS.map((name, i) => `<button data-target="${i}" aria-pressed="false" disabled>${String.fromCharCode(65 + i)} · ${name}</button>`).join('');
$('agent-cards').innerHTML = KEYS.map(key => `<article class="agent-card" id="card-${key}"><div class="agent-title" style="color:${colors[key]}"><span>${key === 'cadence' ? 'Cadence' : key === 'rule' ? '规则巡查' : 'Q-learning'}</span><span class="tag" id="mode-${key}">等待开始</span></div><div class="agent-rate" style="color:${colors[key]}"><span id="rate-${key}">—</span><small>近期命中率</small></div><div class="agent-stats" id="stats-${key}">找到 0 次 · 累计奖励 0<br>等待真实反馈</div><div class="choice-bars">${SHOPS.map((_, i) => `<div class="choice-bar"><i id="bar-${key}-${i}" style="background:${colors[key]};height:25%"></i></div>`).join('')}</div><div class="bar-labels"><span>团子</span><span>茶屋</span><span>饭团</span><span>面包</span></div><div class="bar-caption">下一步选择概率</div></article>`).join('');

async function api(path, body) {
  const response = await fetch(`/api${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `请求失败 (${response.status})`);
  return result;
}

function controls() {
  const ready = state !== null;
  $('play').disabled = !ready || busy || state.finished;
  $('step').disabled = !ready || busy || playing || state.finished;
  $('reset').disabled = busy;
  $('export').disabled = !ready || busy || state.tick === 0;
  $('seed').disabled = busy || playing;
  for (const button of $('move-buttons').querySelectorAll('button')) {
    button.disabled = !ready || busy || state.tick >= 1000 || Number(button.dataset.target) === state.target;
    button.setAttribute('aria-pressed', String(ready && Number(button.dataset.target) === state.target));
  }
  text('play', state?.finished ? '✓ 本轮已完成' : playing ? 'Ⅱ 暂停观察' : '▶ 开始观察');
}

function pause() { playing = false; clearTimeout(timer); if (state) text('status', state.finished ? '已完成' : '已暂停'); controls(); }
function showError(error) {
  pause(); $('error').hidden = false; $('error').textContent = error.message;
  text('status', '需要检查');
}
async function mutate(operation) {
  if (busy) return;
  busy = true; controls(); $('error').hidden = true;
  try { await operation(); }
  catch (error) { showError(error); }
  finally { busy = false; controls(); }
}

function chart() {
  const w = 650, h = 190, left = 32, right = 12, top = 18, bottom = 26;
  const innerW = w - left - right, innerH = h - top - bottom;
  const horizon = Math.max(600, state?.tick || 0);
  const xx = tick => left + tick / horizon * innerW;
  const yy = value => top + (1 - value) * innerH;
  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
  for (const value of [0, .5, 1]) {
    svg += `<line x1="${left}" y1="${yy(value)}" x2="${w - right}" y2="${yy(value)}" stroke="#e0e5d6"/><text x="${left - 7}" y="${yy(value) + 3}" text-anchor="end" font-size="9" fill="#9aa58f">${value * 100}%</text>`;
  }
  for (let tick = 0; tick <= horizon; tick += 100) svg += `<text x="${xx(tick)}" y="${h - 7}" text-anchor="middle" font-size="9" fill="#9aa58f">${tick}</text>`;
  const moves = state ? state.changes.slice(1) : [];
  for (const change of moves) svg += `<line x1="${xx(change.tick)}" y1="${top - 3}" x2="${xx(change.tick)}" y2="${h - bottom}" stroke="#c5a88c" stroke-dasharray="3 4"/><text x="${xx(change.tick) + 4}" y="${top - 5}" font-size="8" fill="#ad9276">迁移</text>`;
  if (state) for (const key of KEYS) {
    let sum = 0; const queue = [], points = [];
    for (const row of state.history) {
      queue.push(row.hits[key]); sum += row.hits[key];
      if (queue.length > 30) sum -= queue.shift();
      points.push(`${xx(row.tick).toFixed(2)},${yy(sum / queue.length).toFixed(2)}`);
    }
    if (points.length) svg += `<polyline points="${points.join(' ')}" fill="none" stroke="${colors[key]}" stroke-width="1.9" stroke-linejoin="round" opacity=".85"/>`;
  }
  if (!state?.tick) svg += `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-size="11" fill="#a7ad9a">开始观察后，曲线来自每一次实际行动</text>`;
  $('chart').innerHTML = svg + '</svg>';
}

function activity(details) {
  const canvas = $('activity'), ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const values = details.activity || [], cols = 10;
  const rows = Math.ceil(values.length / cols);
  const dx = canvas.width / (cols + 1), dy = 124 / Math.max(1, rows);
  values.forEach((value, index) => {
    const x = (index % cols + 1) * dx, y = 20 + Math.floor(index / cols) * dy;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
    const motor = details.motor_indices.includes(index);
    ctx.fillStyle = value < 0 ? `rgba(156,120,163,${.18 + Math.min(1, Math.abs(value)) * .8})` : `rgba(36,125,117,${.1 + Math.min(1, value) * .88})`;
    ctx.fill(); ctx.strokeStyle = motor ? '#d3a14e' : '#dbe1cf'; ctx.lineWidth = motor ? 2 : 1; ctx.stroke();
  });
  ctx.fillStyle = '#9ca58e'; ctx.font = '12px "Microsoft YaHei",sans-serif';
  ctx.fillText('浅 → 深：正活动增强    紫：负活动    金边：动作单元', 18, 162);
  text('activity-count', `${values.length} 个单元`);
  text('brain-readout', `${details.sweeps} 次自由求解迭代 · 残差 ${Number(details.residual).toExponential(1)} · ${details.updates} 次奖励更新 · ${details.memory_writes} 次记忆写入`);
}

function render({ animate = true } = {}) {
  if (!state) { chart(); controls(); return; }
  text('trial', String(state.tick).padStart(3, '0'));
  const phase = Math.min(2, Math.floor(Math.max(0, state.tick - 1) / state.phase_length));
  text('phase-name', state.tick === 0 ? '初次探索' : state.automatic ? ['积累经验', '适应新位置', '回到旧位置'][phase] : '手动迁移 · 持续学习');
  text('status', state.finished ? '已完成' : playing ? '观察中' : '已暂停');
  const limit = state.automatic ? state.phase_length * 3 : 1000;
  $('trial').nextElementSibling.firstChild.textContent = `/ ${limit} 轮 `;
  $('progress-fill').style.width = `${state.tick / limit * 100}%`;
  for (let i = 0; i < 3; i++) $('phase-' + i).classList.toggle('active', state.automatic && phase === i);
  text('schedule-note', state.automatic ? '第 201 轮自动迁移，第 401 轮返回。也可以手动移动，随后按你的安排继续。' : '你已手动迁移，自动切换已关闭。同一个脑、规则位置与 Q 值继续保留；重置可重开自动实验。');
  text('engine-badge', '● 真实 Python 引擎已连接');
  $('engine-badge').style.color = '#467657';
  const speed = Number($('speed').value);
  text('animation-note', speed === 1 ? '每次出发对应一次真实决策' : `加速动画仅显示每 ${speed} 轮的最后一轮`);
  for (const key of KEYS) {
    const agent = state.agents[key], details = agent.details;
    text('rate-' + key, state.tick ? percent(agent.rate) : '—');
    text('mode-' + key, key === 'cadence' ? details.mode === 'aroused' ? '探索 / 学习' : '沿用记忆' : details.mode);
    $('stats-' + key).innerHTML = `找到 ${agent.hits} 次 · 累计奖励 ${fixed(agent.reward)}<br>反馈与下次决策 ${agent.average_feedback_ms.toFixed(2)} ms / 轮${details.values ? `<br>Q 值 ${details.values.map(value => value.toFixed(2)).join(' / ')}` : ''}`;
    for (let i = 0; i < 4; i++) {
      $('bar-' + key + '-' + i).style.height = percent(details.probabilities[i]);
      $('bar-' + key + '-' + i).parentElement.title = `${SHOPS[i]}：${percent(details.probabilities[i])}${details.values ? ` · Q = ${details.values[i].toFixed(3)}` : ''}`;
    }
  }
  activity(state.agents.cadence.details); chart();
  if (state.tick > 0) {
    $('event-log').innerHTML = state.history.slice(-5).reverse().map(row => `<div class="log-row"><span>#${String(row.tick).padStart(3, '0')}</span>${KEYS.map(key => {
      const action = row.tick === state.tick ? state.agents[key].last.action : row.actions?.[key];
      const destination = action === undefined ? '' : ` · ${SHOPS[action]}`;
      return `<span><b style="color:${colors[key]}">${state.agents[key].name}</b>${destination} <span class="${row.hits[key] ? 'hit' : ''}">${row.hits[key] ? '✓ 找到' : '○ 落空'}</span></span>`;
    }).join('')}</div>`).join('');
  } else $('event-log').innerHTML = '<p class="empty-note">开始后，这里会记录三位居民各自去了哪家店。</p>';
  if (animate) street?.update(state, 620); else { street?.reset(); street?.update({ ...state, tick: 0 }); }
  controls();
}

async function reset() {
  if (busy) return;
  pause();
  await mutate(async () => {
    const seed = Number($('seed').value);
    if (!Number.isInteger(seed) || seed < 0 || seed > 99999) throw new Error('随机种子应为 0 到 99999 的整数。');
    state = await api('/sessions', { seed });
    render({ animate: false });
  });
}
async function advance(count = 1) {
  await mutate(async () => {
    state = await api(`/sessions/${state.session}/step`, { count, request_id: crypto.randomUUID() });
    if (state.finished) playing = false;
    render();
  });
}
async function loop() {
  if (!playing) return;
  await advance(Number($('speed').value));
  if (playing) timer = setTimeout(loop, 680);
}
$('play').addEventListener('click', () => {
  if (playing) pause();
  else { playing = true; controls(); text('status', '观察中'); loop(); }
});
$('step').addEventListener('click', () => advance(1));
$('reset').addEventListener('click', reset);
$('move-buttons').addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button || busy) return;
  pause();
  await mutate(async () => {
    state = await api(`/sessions/${state.session}/move`, { target: Number(button.dataset.target), request_id: crypto.randomUUID() });
    render({ animate: false });
  });
});
function download(data, name, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('export').addEventListener('click', () => download(JSON.stringify({ schema: 'sakura-foraging/1', measured_at: new Date().toISOString(), ...state }, null, 2), `foraging-seed-${state.seed}-${state.tick}.json`));
$('notes-download').addEventListener('click', event => { event.preventDefault(); download(research, 'Cadence-中文研究笔记.md', 'text/markdown;charset=utf-8'); });
window.addEventListener('pagehide', () => { pause(); street?.dispose(); });
render(); reset();
