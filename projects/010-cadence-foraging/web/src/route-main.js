import './style.css';
import './hub-style.css';
import './route-style.css';
import { createStreet, SHOPS } from './street.js';
import benchmarks from './route-results.json';
import notes from '../../notes/route-research.md?raw';
import algorithmNotes from '../../notes/algorithm-implementation.md?raw';
import { createAlgorithmPlayer } from './algorithm-player.js';

const $ = id => document.getElementById(id);
const KEYS = ['cadence', 'rule', 'q'];
const COLORS = { cadence: '#247d75', rule: '#ca8431', q: '#8c69b4' };
const CUES = ['樱花纹', '灯笼纹'];
const ROUTE_SHOP = [0, 2, 1, 3];
const NAMES = { cadence: 'Cadence', rule: '规则记路', q: 'Q-learning' };
const pct = value => value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;
const precise = value => `${(value * 100).toFixed(2)}%`;
let state = null, busy = false, playing = false, timer = null, street = null;
const algorithmPlayer = createAlgorithmPlayer($('algorithm'), {
  advance: () => advance(1, true), onPlay: () => pause(), onPause: () => controls(),
  canAdvance: () => Boolean(state && !busy && !state.finished),
});
try { street = createStreet($('street'), $('shop-labels'), { route: true }); }
catch (error) { $('street').innerHTML = '<p class="empty-note" style="padding:80px 30px">无法建立 3D 街景，真实实验指标仍可使用。</p>'; console.error(error); }

$('agent-cards').innerHTML = KEYS.map(key => `<article class="agent-card route-card"><div class="agent-title" style="color:${COLORS[key]}"><span>${NAMES[key]}</span><span id="mode-${key}" class="tag">等待</span></div><div class="agent-rate" style="color:${COLORS[key]}"><span id="rate-${key}">—</span><small>最近 30 趟</small></div><div class="agent-stats" id="stats-${key}">等待真实行动</div><div class="cue-rates"><span>✿ 樱花 <b id="cue0-${key}">—</b></span><span>◈ 灯笼 <b id="cue1-${key}">—</b></span></div><div class="choice-bars"><div class="choice-bar"><i id="prob-${key}-0" style="background:${COLORS[key]};height:50%"></i></div><div class="choice-bar"><i id="prob-${key}-1" style="background:${COLORS[key]};height:50%"></i></div></div><div class="bar-labels"><span id="choice0-${key}">西街</span><span id="choice1-${key}">东街</span></div><div class="bar-caption" id="caption-${key}">下一次选择概率</div></article>`).join('');

async function api(path, body) {
  const response = await fetch(`/api${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `接口失败 ${response.status}`);
  return result;
}
function text(id, value) { $(id).textContent = value; }
function controls() {
  const ready = state !== null;
  $('play').disabled = !ready || busy || state.finished;
  $('step').disabled = !ready || busy || playing || algorithmPlayer.playing || state.finished;
  $('reset').disabled = busy;
  for (const id of ['cue-mode', 'reward-mode', 'seed']) $(id).disabled = busy || playing || algorithmPlayer.playing;
  $('export').disabled = !ready || busy || state.tick === 0;
  $('move').disabled = !ready || busy || state.episodes >= 600 || state.mapping[0] === 1 && state.queued_target === null || state.queued_target === 1;
  $('return').disabled = !ready || busy || state.episodes >= 600 || state.mapping[0] === 0 && state.queued_target === null || state.queued_target === 0;
  text('play', state?.finished ? '✓ 实验已完成' : playing ? 'Ⅱ 暂停观察' : '▶ 开始观察');
  algorithmPlayer.setBusy(busy);
}
function pause() { playing = false; clearTimeout(timer); if (state) text('status', state.finished ? '已完成' : '已暂停'); controls(); }
async function mutate(fn) {
  if (busy) return;
  busy = true; controls(); $('error').hidden = true;
  try { await fn(); }
  catch (error) { pause(); $('error').hidden = false; text('error', error.message); text('status', '需要检查'); }
  finally { busy = false; controls(); }
}
async function reset() {
  if (busy) return;
  algorithmPlayer.pause();
  pause();
  await mutate(async () => {
    const seed = Number($('seed').value);
    if (!Number.isInteger(seed) || seed < 0 || seed > 99999) throw new Error('随机种子应为 0 到 99999 的整数。');
    state = await api('/sessions', { scenario: 'route', seed, cue_mode: $('cue-mode').value, reward_mode: $('reward-mode').value });
    street?.reset(); render({ resetTrace: true, follow: false });
  });
}
async function advance(count = 1, algorithmStep = false) {
  await mutate(async () => {
    state = await api(`/sessions/${state.session}/step`, { count, request_id: crypto.randomUUID() });
    if (state.finished) playing = false;
    render({ follow: !algorithmStep });
  });
}
async function loop() { if (!playing) return; await advance(Number($('speed').value)); if (playing) timer = setTimeout(loop, 560); }
$('play').addEventListener('click', () => { algorithmPlayer.pause(); if (playing) pause(); else { playing = true; controls(); text('status', '观察中'); loop(); } });
$('step').addEventListener('click', () => advance(1));
$('reset').addEventListener('click', reset);
for (const id of ['cue-mode', 'reward-mode']) $(id).addEventListener('change', reset);
for (const [id, target] of [['move', 1], ['return', 0]]) $(id).addEventListener('click', () => {
  if (busy) return;
  algorithmPlayer.pause();
  pause(); mutate(async () => { state = await api(`/sessions/${state.session}/move`, { target, request_id: crypto.randomUUID() }); render(); });
});

function chart() {
  const w = 650, h = 190, left = 34, top = 18, bottom = 26, right = 12;
  const horizon = Math.max(state?.automatic ? state.phase_length * 3 : 600, state?.episodes || 0);
  const xx = tick => left + tick / horizon * (w - left - right);
  const yy = value => top + (1 - value) * (h - top - bottom);
  let svg = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">`;
  for (const y of [0, .5, 1]) svg += `<line x1="${left}" y1="${yy(y)}" x2="${w-right}" y2="${yy(y)}" stroke="#dfe4d5"/><text x="${left-5}" y="${yy(y)+3}" text-anchor="end" font-size="9" fill="#9aa58f">${y*100}%</text>`;
  for (let t = 0; t <= horizon; t += 60) svg += `<text x="${xx(t)}" y="${h-7}" text-anchor="middle" font-size="9" fill="#9aa58f">${t}</text>`;
  if (state) {
    for (const c of state.changes.slice(1)) svg += `<line x1="${xx(c.episode)}" y1="${top}" x2="${xx(c.episode)}" y2="${h-bottom}" stroke="#bfaa8c" stroke-dasharray="3 4"/><text x="${xx(c.episode)+4}" y="12" font-size="8" fill="#ad9276">樱花迁移</text>`;
    for (const key of KEYS) {
      const queue = []; let sum = 0; const points = [];
      for (const row of state.history) {
        queue.push(row.hits[key]); sum += row.hits[key]; if (queue.length > 30) sum -= queue.shift();
        points.push(`${xx(row.tick).toFixed(2)},${yy(sum/queue.length).toFixed(2)}`);
      }
      if (points.length) svg += `<polyline points="${points.join(' ')}" fill="none" stroke="${COLORS[key]}" stroke-width="1.9" stroke-linejoin="round"/>`;
    }
  }
  if (!state?.episodes) svg += `<text x="325" y="94" text-anchor="middle" font-size="11" fill="#a0aa93">每次真实抵达后，曲线才增加一趟</text>`;
  $('chart').innerHTML = svg + '</svg>';
}
function render(options = {}) {
  if (!state) { chart(); controls(); return; }
  const phase = Math.min(2, Math.floor(Math.max(0, state.episodes - (state.stage === 0 ? 1 : 0)) / state.phase_length));
  const limit = state.automatic ? state.phase_length * 3 : 600;
  text('trial', String(state.episodes).padStart(3, '0')); text('limit', `/ ${limit} 趟`);
  text('phase-name', state.automatic ? ['初次学习', '仅樱花路线迁移', '樱花路线返回'][phase] : '手动迁移 · 原状态继续');
  text('status', state.finished ? '已完成' : playing ? '观察中' : '已暂停');
  $('progress-fill').style.width = `${state.episodes/limit*100}%`;
  for (let i = 0; i < 3; i++) $('phase-'+i).classList.toggle('active', state.automatic && phase === i);
  for (let i = 0; i < 4; i++) $('journey-'+i).classList.toggle('active', state.tick > 0 && state.view.stage === i);
  text('world-count', `${state.tick} 个环境时刻 · ${state.episodes} 趟完成`);
  text('scene-cue', `${state.view.cue ? '◈' : '✿'} 本趟画面路牌 · ${CUES[state.view.cue]}`);
  text('engine-badge', '● 真实 Python 引擎已连接');
  text('intro-condition', `${state.cue_mode === 'brief' ? '线索只在街口' : '线索一路可见'}，${state.reward_mode === 'sparse' ? '终点奖励要等抵达' : '街区先反馈，终点再结算'}。`);
  const speed = Number($('speed').value);
  text('animation-note', speed === 1 ? '每步对应一次真实状态变化' : `加速只动画每 ${speed} 时刻的最后状态`);
  text('cue-name', CUES[state.cue]); text('cue-symbol', state.cue ? '◈' : '✿');
  text('cue-note', state.stage === 0 ? '下一次选街区前看见' : state.cue_mode === 'brief' ? '街口看过，当前观察中已隐藏' : '当前仍可看见');
  text('stage-note', `${['下一步选街区', '下一步选巷口', '下一步继续行走', '下一步抵达并结算'][state.stage]}。每类线索近期比例取各自最近 20 趟。`);
  text('step-readout', state.tick ? `刚执行：${state.view.label}。${state.reward_mode === 'sparse' ? '选街区后的实际阶段奖励为 0；选巷口的终点奖励仍未到，等待不作零反馈。' : '选对街区 +0.2、选错 −0.2；终点奖励仍要抵达后给出。'}` : '同一个真实脑继续运行；每趟终点标记 done，重置临时轨迹，保留学到的参数和联想记录。');
  text('schedule-note', state.queued_target !== null ? '迁移已排队：这一趟按旧位置结算，下一趟生效。控制器没有收到迁移通知。' : state.automatic ? '第 121 趟迁移，第 241 趟返回。灯笼纹始终在东街南巷，用来回查旧技能。' : '自动切换已关闭。只改变樱花纹的奖励位置，灯笼纹对应的路线保持。新建实验才清空学到的状态。');
  for (const key of KEYS) {
    const a = state.agents[key], d = a.details;
    text('rate-'+key, state.episodes ? pct(a.rate) : '—');
    text('mode-'+key, key === 'cadence' ? d.mode === 'aroused' ? '探索 / 学习' : '沿用记忆' : d.mode);
    $('stats-'+key).innerHTML = `找到 ${a.hits}/${state.episodes} 趟 · 奖励 ${a.reward.toFixed(2)}<br>控制器 ${state.episodes ? a.average_trip_ms.toFixed(2) : '—'} ms / 完成趟${state.stage ? '（含进行中调用）' : ''}`;
    for (let i = 0; i < 2; i++) { text('cue'+i+'-'+key, pct(a.cue_rates[i])); $('prob-'+key+'-'+i).style.height = pct(d.probabilities[i]); }
    text('choice0-'+key, state.stage === 0 ? '西街' : '北巷'); text('choice1-'+key, state.stage === 0 ? '东街' : '南巷');
    text('caption-'+key, state.stage < 2 ? '下一次选择概率' : '刚选巷口的概率 · 等终点奖励');
  }
  const features = ['樱花', '灯笼', '广场', '巷口', '西街', '东街', '途中', '抵达'];
  $('observation').innerHTML = state.observations.cadence[0].map((v, i) => `<span class="${v ? 'on' : ''}"><b>${v}</b>${features[i]}</span>`).join('');
  const brain = state.agents.cadence.details;
  text('brain-readout', `${brain.activity.length} 个真实单元 · ${brain.updates} 次奖励更新 · ${brain.memory_writes} 次记忆写入 · ${brain.waits} 次 wait · 当前自由残差 ${Number(brain.residual).toExponential(1)}`);
  $('event-log').innerHTML = state.history.length ? state.history.slice(-5).reverse().map(row => `<div class="route-log-row"><span>#${row.tick}<br>${CUES[row.cue]}</span>${KEYS.map(k => `<span><b style="color:${COLORS[k]}">${NAMES[k]}</b><br>${row.routes[k] < 2 ? '西街' : '东街'} → ${row.routes[k]%2 ? '南巷' : '北巷'}<br>${SHOPS[ROUTE_SHOP[row.routes[k]]]} · ${row.hits[k] ? '✓ 找到' : '○ 落空'}</span>`).join('')}</div>`).join('') : '<p class="empty-note">完成一趟后，记录两次选择与真实终点结果。</p>';
  chart(); street?.updateRoute(state); controls();
  algorithmPlayer.setTrace(state.algorithm, { reset: options.resetTrace, follow: options.follow ?? true });
}

function download(content, name, mime) { const url = URL.createObjectURL(new Blob([content], { type: mime })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
$('export').addEventListener('click', () => download(JSON.stringify({ schema: 'sakura-route-session/1', measured_at: new Date().toISOString(), ...state }, null, 2), `route-${state.cue_mode}-${state.reward_mode}-seed-${state.seed}-${state.episodes}.json`, 'application/json'));
$('notes-download').addEventListener('click', event => { event.preventDefault(); download(notes, '樱花小街-街区线索与多步奖励.md', 'text/markdown;charset=utf-8'); });
$('algorithm-notes').addEventListener('click', event => { event.preventDefault(); download(algorithmNotes, 'Cadence-底层原理与实现.md', 'text/markdown;charset=utf-8'); });

const baseModes = benchmarks.modes.filter(m => m.trace_amplitude > 0);
const allModes = [...baseModes, ...benchmarks.modes.filter(m => m.trace_amplitude === 0)];
$('benchmark').innerHTML = `<div class="benchmark-scroll"><table class="benchmark-table"><thead><tr><th>条件 / 4 个种子</th><th class="c">Cadence</th><th class="r">规则记路</th><th class="q">Q-learning</th><th>Cadence 灯笼保留</th></tr></thead><tbody>${allModes.map(m => `<tr class="${m.trace_amplitude === 0 ? 'ablation' : ''}"><td>${m.cue_mode === 'brief' ? '街口线索' : '持续线索'} · ${m.reward_mode === 'sparse' ? '终点奖励' : '途中反馈'}${m.trace_amplitude === 0 ? '<small>关闭 Cadence 工作轨迹的对照</small>' : ''}</td><td class="c">${precise(m.controllers.cadence.hit_rate)}<small>${m.controllers.cadence.average_trip_ms.toFixed(2)} ms / 趟</small></td><td class="r">${precise(m.controllers.rule.hit_rate)}</td><td class="q">${precise(m.controllers.q.hit_rate)}</td><td>${precise(m.controllers.cadence.phases[2].cue1_last20)}<small>返回阶段：灯笼最近 20 次</small></td></tr>`).join('')}</tbody></table></div><p class="benchmark-caption">总命中率包含初学与迁移成本；每种条件 1440 趟。末列是未迁移线索在返回阶段的末 20 次均值，不是新任务得分。灰色行只改 Cadence 轨迹幅度，规则与 Q 配置保持。等待次数相同，耗时仅统计控制器调用，不含 HTTP、初始化或绘图。</p>`;
const sparse = baseModes.find(m => m.cue_mode === 'brief' && m.reward_mode === 'sparse');
const dense = baseModes.find(m => m.cue_mode === 'brief' && m.reward_mode === 'waypoints');
const ablation = benchmarks.modes.find(m => m.cue_mode === 'brief' && m.reward_mode === 'sparse' && m.trace_amplitude === 0);
$('finding').innerHTML = `<b>这次没有测出 Cadence 的总体优势。</b><p>街口线索 + 终点奖励时，Cadence 总命中率 ${precise(sparse.controllers.cadence.hit_rate)}；增加街区反馈后为 ${precise(dense.controllers.cadence.hit_rate)}。这是反馈结构改善，仍低于有记忆的规则和 Q 基线。关闭工作轨迹的稀疏奖励对照为 ${precise(ablation.controllers.cadence.hit_rate)}，本配置没有证明轨迹带来收益。</p><div class="finding-grid"><div><b>能枚举的路线</b><p>优先规则记路。此处每种线索只有四条路线，规则速度与总成功率都占优。</p></div><div><b>小而明确的状态表</b><p>优先 Q-learning。12 个值已能学习延迟结果，临时记忆只需要保留一个路牌。</p></div><div><b>Cadence 当前的价值</b><p>用于研究内部状态、局部学习和记忆取舍。更多连续线索或新组合可能更值得检验，但尚未证明生产收益。</p></div></div>`;
window.addEventListener('pagehide', () => { algorithmPlayer.pause(); pause(); street?.dispose(); });
chart(); controls(); reset();
