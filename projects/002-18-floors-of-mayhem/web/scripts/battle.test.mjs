import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDecision, stepComplete } from '../src/decision-guard.js';
import { shouldPause } from '../scripts/lab-rooms.mjs';
import { CodexBridge, loadMiniMax } from '../scripts/model-bridge.mjs';

test('拒绝编造落点和已过期落点，接受仍可达的模型目标', () => {
  const view = { reachable: [{ id: 2 }, { id: 3 }] };
  assert.equal(validateDecision({ go: 99 }, view, [{ id: 99 }]).accepted, false);
  assert.equal(validateDecision({ go: 2 }, view, [{ id: 3 }]).accepted, false);
  assert.equal(validateDecision({ go: 3 }, view, [{ id: 3 }]).accepted, true);
  assert.equal(validateDecision({ go: null }, view, []).accepted, true);
});
test('观察模式只暂停对应房间，实时模式与停止后继续运行', () => {
  const run = { roomCode: 'ABCDEF', stopped: false, observationMode: 'step', busy: new Set(['minimax']) };
  assert.equal(shouldPause(run, 'ABCDEF'), true);
  assert.equal(shouldPause(run, 'FEDCBA'), false);
  run.observationMode = 'live'; assert.equal(shouldPause(run, 'ABCDEF'), false);
  run.observationMode = 'step'; run.stopped = true; assert.equal(shouldPause(run, 'ABCDEF'), false);
});
test('提前淘汰的模型不会让逐步观察一直等待不存在的后续决策', () => {
  const agents = [
    { config: { provider: 'minimax', limit: 4 }, stats: { attempts: 4 }, me: { alive: true }, busy: false, nextThinkAt: 8 },
    { config: { provider: 'codex', limit: 4 }, stats: { attempts: 2 }, me: { alive: false }, busy: false, nextThinkAt: 4 },
    { config: { provider: 'cpu' }, stats: { attempts: 0 }, me: { alive: true } },
  ];
  assert.equal(stepComplete(agents, 8.5), false);
  assert.equal(stepComplete(agents, 9.1), true);
  agents[1].busy = true; assert.equal(stepComplete(agents, 9.1), false);
});
test('Codex 只有 completed 才算真实成功，工具请求被拒绝', async () => {
  const bridge = new CodexBridge('.'); bridge.model = 'test-model'; const sent = []; bridge.send = message => sent.push(message);
  bridge.receive({ id: 9, method: 'item/tool/call', params: {} }); assert.equal(sent[0].error.code, -32601);
  const result = new Promise((resolve, reject) => bridge.turns.set('test-thread', { resolve, reject }));
  bridge.receive({ method: 'item/completed', params: { threadId: 'test-thread', item: { type: 'agentMessage', text: '{"go":3}' } } });
  bridge.receive({ method: 'thread/tokenUsage/updated', params: { threadId: 'test-thread', tokenUsage: { last: { inputTokens: 10, outputTokens: 5 } } } });
  bridge.receive({ method: 'turn/completed', params: { threadId: 'test-thread', turn: { status: 'completed' } } });
  assert.deepEqual((await result).usage, { in: 10, out: 5 });
  const failed = new Promise((resolve, reject) => bridge.turns.set('failed-thread', { resolve, reject }));
  bridge.receive({ method: 'turn/completed', params: { threadId: 'failed-thread', turn: { status: 'failed' } } });
  await assert.rejects(failed, /未完成/);
});
test('MiniMax 官方地址校验在发请求前执行，不输出密钥', async () => {
  const { mkdtemp, writeFile, unlink, rmdir } = await import('node:fs/promises'); const os = await import('node:os'); const path = await import('node:path');
  const temp = await mkdtemp(path.join(os.tmpdir(), 'mayhem-config-')); const file = path.join(temp, '.env');
  try { await writeFile(file, 'MINIMAX_API_KEY=test-only-not-a-secret\nMINIMAX_API_BASE=https://example.com\n'); await assert.rejects(loadMiniMax(file), /官方 HTTPS/); }
  finally { await unlink(file); await rmdir(temp); }
});

test('完整 Room 协议：全房暂停不推进物理时间，恢复后继续处理真实输入', async () => {
  const http = await import('node:http'); const { WebSocket } = await import('../../vendor/upstream/node_modules/ws/wrapper.mjs'); const { labRooms } = await import('../scripts/lab-rooms.mjs');
  const run = { observationMode: 'step', busy: new Set(), stopped: false };
  const server = http.createServer((req, res) => res.end()); const rooms = labRooms(server, () => run);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const port = server.address().port, code = rooms.create();
  const sockets = []; let latest, paused = false;
  async function join(intent, name) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?room=${code}&intent=${intent}`, { headers: { Host: '127.0.0.1:3183' } }); sockets.push(ws);
    await new Promise((resolve, reject) => {
      ws.on('error', reject); ws.on('message', raw => { const m = JSON.parse(String(raw));
        if (m.type === 'hello') ws.send(JSON.stringify({ type: intent, name, rules: { mode: 'timed', duration: 60 } }));
        if (m.type === 'lobby') resolve(); if (m.type === 'state') latest = m.game; if (m.type === 'lab-pause') paused = m.paused;
      });
    }); return ws;
  }
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  try {
    const host = await join('create', '测试甲'); await join('join', '测试乙'); host.send(JSON.stringify({ type: 'start' }));
    for (let i = 0; i < 100 && !latest; i++) await wait(40);
    assert.ok(latest?.t > 0); run.busy.add('test'); for (let i = 0; i < 20 && !paused; i++) await wait(10);
    assert.equal(paused, true); const frozenAt = latest.t; await wait(250); assert.equal(latest.t, frozenAt);
    host.send(JSON.stringify({ type: 'input', right: true })); run.busy.clear(); await wait(120);
    assert.ok(latest.t > frozenAt); assert.ok(latest.t - frozenAt < .2, '暂停时间不能补算进游戏物理');
  } finally { sockets.forEach(ws => ws.terminate()); rooms.close(); await new Promise(resolve => server.close(resolve)); }
});
