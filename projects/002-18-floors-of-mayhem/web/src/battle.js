import { observe } from '/ai/observe.js';
import { bestTarget, candidates, scorePlatform } from '/ai/controller.js';
import { stepComplete } from './decision-guard.js';
import { LabAgent } from './battle-agents.js';
const $ = s => document.querySelector(s), frame = $('#game');
const keyNames = { left: '← 左', right: '→ 右', jump: 'Space 跳', drop: '↓ 下落', eat: 'Q 使用', pass: 'F 投掷', punch: 'J 拳', bomb: 'K 炸弹', reward: 'R 奖励' };
let status, agents = [], host, report, playing = false, frameReady = false, joined = false, endTimer, replayTimer, replayIndex = 0, replayPlaying = false;
let lastFrameAt = -1, focusedProvider = 'minimax', selectedRecord;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function post(url, data = {}) { const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || '请求失败'); return result; }
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (event.data.type === 'lab-ready') frameReady = true;
  if (event.data.type === 'lab-joined') joined = true;
});
async function waitFor(check, label) { for (let i = 0; i < 100; i++) { if (check()) return; await sleep(100); } throw new Error(label + '超时'); }
function sendFrame(message) { frame.contentWindow.postMessage(message, location.origin); }
function renderPlatforms(view, chosen) {
  const nodes = (view?.reachable || []).map(p => { const span = document.createElement('span'); span.className = String(p.id) === String(chosen) ? 'chosen' : ''; span.textContent = `#${p.id} ↓${p.down} ${p.item || p.type}${p.spikes ? ' · 尖刺' : ''}`; return span; }); $('#platforms').replaceChildren(...nodes);
}
function renderDecision(record) {
  if (!record) return;
  const view = record.view, decision = record.decision;
  $('#observation').textContent = `时刻 ${view.t}s · 血量 ${view.me.hp}/${view.me.maxHp} · 手持 ${view.me.carry || '空'} · ${view.reachable.length} 个可达落点`;
  renderPlatforms(view, decision?.go);
  $('#decision').textContent = decision ? `选择 #${decision.go ?? '本地节奏'}${decision.item ? '，' + (decision.item === 'use' ? '使用道具' : '投掷道具') : ''} · 计划：${decision.plan || '—'}` : '正在向真实模型请求决策…';
  $('#why').textContent = decision ? `理由：${decision.why} · ${record.ms} ms · ${record.validation.reason}` : '等待期间，本地控制器继续行动。';
  $('#alternative').textContent = `同一时刻，普通 CPU 评分会选 #${record.cpuAlternative ?? '无落点'}（对该模型角色的局面评分）`;
  $('#raw').textContent = JSON.stringify({ observation: view, decision: decision || '等待回复', model: record.model, usage: record.usage }, null, 2);
}
function renderCPU(game) {
  const id = agents.find(a => a.config.provider === 'cpu')?.id || report.roster.find(a => a.provider === 'cpu')?.id;
  const me = game.players.find(p => p.id === id); if (!me) return;
  const view = observe(game, me), target = bestTarget(game, me);
  $('#observation').textContent = `时刻 ${view.t}s · 血量 ${me.hp}/${me.maxHp} · 手持 ${me.carry || '空'} · ${view.reachable.length} 个可达落点`;
  renderPlatforms(view, target?.id);
  $('#decision').textContent = `CPU 规则选择 #${target?.id ?? '无'}，不调用模型`;
  $('#why').textContent = '按距离、平台宽度、机关风险和道具奖励计算固定分数，选分数最高者。';
  $('#alternative').textContent = '普通 CPU 还有固定条件触发的战斗和道具动作。';
  $('#raw').textContent = JSON.stringify({ observation: view, scores: candidates(game, me).map(p => ({ platform: p.id, score: Math.round(scorePlatform(game, me, p)) })) }, null, 2);
}
function renderKeys(keys, source) {
  $('#source').textContent = source;
  const nodes = (keys.length ? keys : ['hold']).map(key => { const span = document.createElement('span'); span.textContent = keyNames[key] || (key === 'hold' ? '保持 / 松开按键' : key); return span; }); $('#keys').replaceChildren(...nodes);
}
function selectRecord(record) {
  if (!playing && report.frames.length) { replayPlaying = false; $('#playback').textContent = '继续回放'; const index = report.frames.findIndex(f => f.t >= record.t + .4); focusedProvider = record.provider; renderReplay(index < 0 ? report.frames.length - 1 : index); }
  selectedRecord = record; $('#focus').value = record.provider; focusedProvider = record.provider; renderDecision(record);
  const input = report.records.find(r => r.kind === 'control' && r.provider === record.provider && r.requestId === record.requestId && r.t >= record.t);
  if (input) renderKeys(input.keys, input.source + ' · 决策 #' + record.requestId);
  const landing = report.records.find(r => r.kind === 'land' && r.provider === record.provider && r.requestId === record.requestId && r.t >= record.t);
  $('#landing').textContent = landing ? `实际 ${landing.t.toFixed(1)}s 落到 #${landing.platform}，${landing.platform === record.decision?.go ? '命中模型目标' : '本地控制器修正落点'} · ${landing.metres}m` : '本决策后没有记录到落地，或后续决策已覆盖目标。';
  sendFrame({ type: 'lab-follow', id: agents.find(a => a.config.provider === focusedProvider)?.id || report.roster.find(a => a.provider === focusedProvider)?.id });
}
function describe(r) {
  if (r.kind === 'request') return `请求 #${r.requestId}：${r.view.reachable.length} 个落点，背包 ${r.view.me.carry || '空'}`;
  if (r.kind === 'think') return `决策 #${r.requestId} → #${r.decision.go ?? '本地'} · ${r.decision.why} · ${r.ms}ms · ${r.validation.reason}`;
  if (r.kind === 'control') return `${r.source} → ${r.keys.map(k => keyNames[k] || k).join(' / ') || '保持'}${r.target != null ? ' · 目标 #' + r.target : ''}`;
  if (r.kind === 'land') return `落地 #${r.platform} · ${r.metres}m · HP ${r.hp}`;
  if (r.kind === 'item') return `${r.action === 'use' ? '使用' : '投掷'} ${r.carry}，目标 ${r.target || '自己'}`;
  return r.text || r.title || r.kind;
}
function appendEvent(r) {
  const row = document.createElement('div'); row.className = 'event ' + r.kind;
  const time = document.createElement('time'); time.textContent = r.t.toFixed(1) + 's';
  const name = document.createElement('span'); name.textContent = r.name;
  const text = document.createElement('span'); text.textContent = describe(r); row.append(time, name, text);
  if (r.kind === 'think') { row.tabIndex = 0; row.setAttribute('role', 'button'); row.addEventListener('click', () => selectRecord(r)); row.addEventListener('keydown', e => { if (e.key === 'Enter') selectRecord(r); }); }
  $('#feed').prepend(row); while ($('#feed').children.length > 160) $('#feed').lastElementChild.remove();
}
function onRecord(agent, data) {
  if (!report || !playing) return;
  const record = { ...data, wallSeconds: Number(((Date.now() - Date.parse(report.date)) / 1000).toFixed(2)), provider: agent.config.provider, name: agent.config.name };
  report.records.push(record); if (report.records.length > 1000) report.records.shift(); appendEvent(record);
  if (record.provider === focusedProvider && ['request', 'think'].includes(record.kind) && !selectedRecord) renderDecision(record);
  if (record.provider === focusedProvider && record.kind === 'land' && !selectedRecord) $('#landing').textContent = `实际落到 #${record.platform} · ${record.metres}m · HP ${record.hp}${record.modelTarget != null ? ' · 模型目标 #' + record.modelTarget : ''}`;
}
function focusOptions(roster) {
  $('#focus').replaceChildren(...roster.map(a => { const option = document.createElement('option'); option.value = a.provider; option.textContent = a.name; return option; })); $('#focus').value = focusedProvider;
}
function renderScores(rows) {
  $('#scores').replaceChildren(...rows.map(row => {
    const div = document.createElement('div'); div.className = 'score-row';
    for (const text of [row.name, `${row.metres ?? 0}m · HP ${row.hp ?? '—'} · ${row.alive ? '存活' : row.reason || '淘汰'}`, `${row.stats.calls} 次回复 / ${row.stats.attempts || 0} 次请求 · ${row.stats.errors} 次错误`, row.provider === 'cpu' ? '本地规则 · 0 模型请求' : `平均 ${row.stats.avgMs}ms · ${row.stats.applied || 0} 次有效目标 · ${row.stats.stale || 0} 次过期`, `${row.stats.landings || 0} 次落地 · 模型 tokens ${row.stats.tokensIn} 入 / ${row.stats.tokensOut} 出`]) {
      const span = document.createElement('span'); span.textContent = text; div.append(span);
    } return div;
  }));
}
function rowsFromAgents() { return agents.map(a => ({ provider: a.config.provider, name: a.config.name, id: a.id, stats: { ...a.stats }, metres: a.me?.meters, hp: a.me?.hp, alive: !!a.me?.alive, reason: a.me?.reason })); }
function snapshot(game) {
  $('#clock').textContent = game.t.toFixed(1) + ' s';
  if (game.t - lastFrameAt >= .5) { lastFrameAt = game.t; report.frames.push({ t: game.t, game }); renderScores(rowsFromAgents()); }
  if (focusedProvider === 'cpu' && !selectedRecord) renderCPU(game);
  const selected = agents.find(a => a.config.provider === focusedProvider);
  if (selected && !selectedRecord) renderKeys(Object.keys(selected.lastInput || {}).filter(k => selected.lastInput[k]), selected.source || '准备阶段');
  if (game.phase === 'finished') stop('对局已结束');
  else if (report.observationMode === 'step' && stepComplete(agents, game.t)) stop('逐步观察已完成 4 轮决策与执行');
}
async function start() {
  clearInterval(replayTimer); replayPlaying = false; selectedRecord = null;
  $('#start').disabled = true; $('#stop').disabled = false; $('#replay').disabled = true; $('#realtime-report').disabled = true; $('#mode-label').textContent = '真实模型 · 实时对局';
  $('#match-status').textContent = '正在建立游戏房间…'; $('#feed').replaceChildren();
  try {
    const observationMode = $('#observation-mode').value;
    const { runId, limit } = await post('/lab/start', { observationMode });
    const response = await fetch(status.gameUrl + '/room', { method: 'POST' }), { code } = await response.json();
    if (!code) throw new Error('原游戏没有返回房间码');
    report = { version: 1, runId, date: new Date().toISOString(), room: code, observationMode, mode: 'timed', duration: 60, models: status.providers, records: [], frames: [], roster: [], outcome: '运行中' };
    lastFrameAt = -1; joined = false; playing = true;
    // Reload the observer to discard replay state and earlier sockets.
    frameReady = false; frame.src = '/game.html?lab=1&run=' + runId;
    host = new WebSocket(status.gameUrl.replace('http', 'ws') + '/ws?room=' + code + '&intent=create');
    let hosted = false, lobby;
    host.onmessage = event => {
      const m = JSON.parse(event.data);
      if (m.type === 'hello') host.send(JSON.stringify({ type: 'create', name: '实验房主', spectate: true, look: { skin: 0 }, rules: { mode: 'timed', duration: 60 } }));
      if (m.type === 'lab-pause') $('#match-status').textContent = m.paused ? '逐步观察：等待模型，所有选手与世界已暂停' : '逐步观察：执行真实按键，世界恢复运行';
      if (m.type === 'error') $('#match-status').textContent = m.message;
      if (m.type === 'lobby') { hosted = true; lobby = m; }
      if (m.type === 'state' && playing) snapshot(m.game);
    };
    await waitFor(() => hosted, '创建房间');
    const choice = $('#provider').value;
    const providers = choice === 'both' ? ['minimax', 'codex', 'cpu'] : [choice, 'cpu']; focusedProvider = providers[0];
    agents = providers.map((provider, i) => new LabAgent({ provider, runId, limit, observationMode, model: status.providers[provider]?.model, persona: $('#persona').value,
      name: provider === 'minimax' ? 'MiniMax 模型' : provider === 'codex' ? 'OpenAI 模型' : '普通电脑', look: { skin: [2, 4, 0][i] } }, { onDecision: onRecord }));
    agents.forEach(a => a.join(status.gameUrl.replace('http', 'ws'), code));
    focusOptions(agents.map(a => ({ provider: a.config.provider, name: a.config.name })));
    await waitFor(() => agents.every(a => a.state === 'ready') && lobby?.players.filter(p => !p.spectator).length === agents.length, '选手就位');
    await waitFor(() => frameReady, '游戏画面加载'); sendFrame({ type: 'lab-join', code }); await waitFor(() => joined, '观战连接');
    report.roster = rowsFromAgents(); sendFrame({ type: 'lab-follow', id: agents[0].id });
    host.send(JSON.stringify({ type: 'start' })); $('#match-status').textContent = '房间 ' + code + ' · 60 秒同场竞速';
    $('#seek').disabled = true; $('#playback').disabled = true;
    if (observationMode === 'step') $('#mode-label').textContent = '逐步观察 · 等待时全房暂停';
    endTimer = setTimeout(() => stop(observationMode === 'step' ? '到达逐步观察 180 秒上限' : '到达本次实验 60 秒上限'), observationMode === 'step' ? 180000 : 63000);
  } catch (error) { $('#match-status').textContent = error.message; await stop('启动失败：' + error.message); }
}
async function stop(outcome = '手动停止') {
  if (!playing) return; playing = false; clearTimeout(endTimer);
  report.roster = rowsFromAgents(); report.outcome = outcome; report.finishedAt = new Date().toISOString();
  agents.forEach(a => a.leave()); host?.close();
  try { report.models = (await (await fetch('/lab/status')).json()).providers; } catch {}
  $('#start').disabled = false; $('#stop').disabled = true; $('#realtime-report').disabled = false; $('#export').disabled = false; $('#replay').disabled = !report.frames.length;
  $('#match-status').textContent = outcome + ' · 已停止模型请求'; renderScores(report.roster);
  await post('/lab/stop', { runId: report.runId }).catch(() => {});
  await post('/lab/report', report).catch(() => { $('#match-status').textContent += '（战报保存失败，可导出）'; });
  const decision = report.records.find(r => r.kind === 'think' && r.validation.accepted);
  if (decision) selectRecord(decision);
}
function renderReplay(index) {
  const snapshot = report.frames[index]; if (!snapshot) return;
  replayIndex = index; $('#seek').value = index; $('#clock').textContent = snapshot.t.toFixed(1) + ' s';
  const id = report.roster.find(r => r.provider === focusedProvider)?.id;
  sendFrame({ type: 'lab-frame', game: snapshot.game, id });
  if (focusedProvider === 'cpu') renderCPU(snapshot.game);
  const records = report.records.filter(r => r.provider === focusedProvider && r.t <= snapshot.t);
  const decision = records.findLast(r => r.kind === 'think') || records.findLast(r => r.kind === 'request'); if (decision) renderDecision(decision);
  const input = records.findLast(r => r.kind === 'control'); if (input) renderKeys(input.keys, input.source + ' · 实测回放');
  const landed = records.findLast(r => r.kind === 'land'); if (landed) $('#landing').textContent = `实际 ${landed.t.toFixed(1)}s 落到 #${landed.platform} · ${landed.metres}m`;
  $('#match-status').textContent = '实测回放 · ' + report.date.slice(0, 19).replace('T', ' ') + ' UTC';
}
function startReplay() {
  if (playing || !report?.frames.length) return;
  selectedRecord = null; $('#mode-label').textContent = (report.observationMode === 'step' ? '逐步观察回放' : '实时对照回放') + ' · 不调用模型';
  $('#seek').disabled = false; $('#seek').max = report.frames.length - 1; $('#playback').disabled = false; $('#playback').textContent = '暂停回放';
  renderScores(report.roster); focusOptions(report.roster); $('#feed').replaceChildren(); report.records.forEach(appendEvent);
  replayIndex = 0; replayPlaying = true; clearInterval(replayTimer); renderReplay(0);
  replayTimer = setInterval(() => { if (!replayPlaying) return; if (replayIndex >= report.frames.length - 1) { replayPlaying = false; $('#playback').textContent = '继续回放'; return; } renderReplay(replayIndex + 1); }, 500);
}
$('#realtime-report').addEventListener('click', async () => { if (playing) return; report = await (await fetch('/lab/realtime')).json(); focusedProvider = report.roster.find(r => r.provider !== 'cpu')?.provider; startReplay(); });
$('#start').addEventListener('click', start); $('#stop').addEventListener('click', () => stop()); $('#replay').addEventListener('click', startReplay);
$('#seek').addEventListener('input', () => { replayPlaying = false; $('#playback').textContent = '继续回放'; renderReplay(Number($('#seek').value)); });
$('#playback').addEventListener('click', () => { replayPlaying = !replayPlaying; $('#playback').textContent = replayPlaying ? '暂停回放' : '继续回放'; if (replayIndex === report.frames.length - 1 && replayPlaying) renderReplay(0); });
$('#focus').addEventListener('change', () => { focusedProvider = $('#focus').value; selectedRecord = null;
  if (playing) { sendFrame({ type: 'lab-follow', id: agents.find(a => a.config.provider === focusedProvider)?.id }); const r = report.records.findLast(r => r.provider === focusedProvider && r.kind === 'think'); if (r) renderDecision(r); }
  else if (report?.frames.length) renderReplay(replayIndex);
});
$('#export').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'mayhem-real-battle.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
window.addEventListener('pagehide', () => { agents.forEach(a => a.leave()); host?.close(); if (playing && report) fetch('/lab/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: report.runId }), keepalive: true }); });
async function initialize() {
  try {
    for (let i = 0; i < 30; i++) { status = await (await fetch('/lab/status')).json(); if (status.providers.minimax.available || status.providers.codex.available) break; await sleep(1000); }
    $('#connection').textContent = Object.entries(status.providers).map(([key, p]) => `${key === 'codex' ? 'OpenAI / Codex' : 'MiniMax'} ${p.available ? '✓ ' + p.model : '✕ ' + (p.error || '初始化中')}`).join(' · ');
    for (const option of $('#provider').options) option.disabled = option.value === 'both' ? !status.providers.minimax.available || !status.providers.codex.available : !status.providers[option.value]?.available;
    $('#start').disabled = !Object.values(status.providers).some(p => p.available);
    const saved = await fetch('/lab/latest'); if (saved.ok) { report = await saved.json(); focusedProvider = report.roster.find(r => r.provider !== 'cpu')?.provider || 'minimax'; $('#replay').disabled = !report.frames.length; $('#export').disabled = false; startReplay(); }
  } catch (e) { $('#connection').textContent = '接口检查失败：' + e.message; }
}
initialize();
