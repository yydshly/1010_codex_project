// Adapted from project 003 local provider bridge; official CLI owns authentication.
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// The official Codex process manages authentication; never read or export its OAuth tokens.
export class CodexBridge {
  constructor(cwd) { this.cwd = cwd; this.pending = new Map(); this.turns = new Map(); this.id = 0; }
  async start() {
    await mkdir(this.cwd, { recursive: true });
    const cli = process.env.TOWN_CODEX_CLI || path.join(process.env.APPDATA, 'npm/node_modules/@openai/codex/bin/codex.js');
    const disabled = ['shell_tool','unified_exec','apps','plugins','remote_plugin','browser_use','browser_use_external','computer_use','image_generation','view_image','multi_agent','skill_search','workspace_dependencies','code_mode_host'];
    const args = [cli, ...disabled.flatMap(flag => ['--disable', flag]), '-c', 'web_search="disabled"', 'app-server', '--listen', 'stdio://'];
    this.child = spawn(process.execPath, args, {
      cwd: this.cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let buffer = '';
    this.child.stdout.on('data', bytes => {
      buffer += bytes.toString(); let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        try { this.receive(JSON.parse(line)); } catch { /* non-protocol line */ }
      }
    });
    this.child.stderr.on('data', () => {});
    this.child.on('error', () => this.fail('Codex 本地进程无法启动'));
    this.child.on('exit', () => this.fail('Codex 本地进程已退出'));
    await this.rpc('initialize', { clientInfo: { name: 'sakura_town', title: 'Sakura Town', version: '1.0.0' }, capabilities: { experimentalApi: true } });
    this.send({ method: 'initialized' });
    const account = await this.rpc('account/read', { refreshToken: false });
    this.authenticated = !!account.account; this.authMode = account.account?.type || 'unavailable';
    if (!this.authenticated) throw new Error('Codex CLI 尚未登录，不能复用平台模型');
    const catalog = await this.rpc('model/list', { limit: 50 });
    this.model = (catalog.data.find(m => m.isDefault) || catalog.data[0])?.model;
    if (!this.model) throw new Error('Codex 没有返回可用模型');
    return { available: true, model: this.model, authMode: this.authMode };
  }
  send(message) { this.child.stdin.write(JSON.stringify(message) + '\n'); }
  rpc(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Codex ${method} 超时`)); }, 30000);
      this.pending.set(id, { resolve, reject, timer }); this.send({ id, method, params });
    });
  }
  receive(message) {
    if (message.id != null && !message.method) {
      const pending = this.pending.get(message.id); if (!pending) return;
      clearTimeout(pending.timer); this.pending.delete(message.id);
      if (message.error) pending.reject(new Error('Codex 协议错误：' + (message.error.message || '未知错误')));
      else pending.resolve(message.result); return;
    }
    if (message.id != null && message.method) {
      this.send({ id: message.id, error: { code: -32601, message: 'Game decisions cannot request tools or approvals' } }); return;
    }
    const p = message.params || {}, turn = this.turns.get(p.threadId); if (!turn) return;
    if (message.method === 'item/completed' && p.item?.type === 'agentMessage') turn.text = p.item.text;
    if (message.method === 'thread/tokenUsage/updated') turn.usage = p.tokenUsage?.last || p.tokenUsage?.total;
    if (message.method === 'turn/completed') {
      this.turns.delete(p.threadId);
      if (p.turn.status === 'completed') {
        const text = turn.text || p.turn.items?.filter(i => i.type === 'agentMessage').map(i => i.text).join('');
        turn.resolve({ text, usage: { in: turn.usage?.inputTokens || 0, out: turn.usage?.outputTokens || 0 }, model: this.model });
      } else turn.reject(new Error('Codex 决策未完成：' + (p.turn.error?.message || p.turn.status)));
    }
  }
  fail(message) {
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error(message)); }
    this.pending.clear(); for (const t of this.turns.values()) t.reject(new Error(message)); this.turns.clear();
  }
  async decide(system, prompt, signal, schema) {
    const start = performance.now();
    const session = await this.rpc('thread/start', {
      ephemeral: true, cwd: this.cwd, model: this.model, approvalPolicy: 'never', sandbox: 'read-only',
      baseInstructions: `${system}\n你是游戏决策接口。只根据输入状态输出 JSON。禁止调用任何工具、读取文件或执行命令。why 是简短行动理由，不要输出内部推理过程。`,
    });
    const threadId = session.thread.id; let rejectTurn;
    const done = new Promise((resolve, reject) => { rejectTurn = reject; this.turns.set(threadId, { resolve, reject, text: '' }); });
    done.catch(() => {}); let turnId;
    const abort = () => {
      this.turns.delete(threadId);
      if (turnId) this.rpc('turn/interrupt', { threadId, turnId }).catch(() => {});
      rejectTurn(new DOMException('请求已取消', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      if (signal?.aborted) { abort(); throw signal.reason; }
      const response = await this.rpc('turn/start', { threadId, input: [{ type: 'text', text: prompt }], effort: 'low', outputSchema: schema });
      turnId = response.turn.id; if (signal?.aborted) abort();
      const result = await done; return { ...result, ms: Math.round(performance.now() - start), provider: 'codex' };
    } catch (error) { this.turns.delete(threadId); throw error; }
    finally { signal?.removeEventListener('abort', abort); this.rpc('thread/archive', { threadId }).catch(() => {}); }
  }
  close() { this.child?.kill(); }
}
export async function loadMiniMax(file) {
  const raw = await readFile(file, 'utf8'); const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  if (!env.MINIMAX_API_KEY) throw new Error('MiniMax 配置文件缺少 MINIMAX_API_KEY');
  const base = new URL(env.MINIMAX_API_BASE || 'https://api.minimax.cn/');
  if (base.protocol !== 'https:' || !['api.minimax.cn', 'api.minimax.io'].includes(base.hostname)) throw new Error('MiniMax 地址不是官方 HTTPS 接口');
  return { apiKey: env.MINIMAX_API_KEY, endpoint: base.origin + '/v1/chat/completions', model: env.MINIMAX_MODEL || 'MiniMax-M2.7-highspeed' };
}
export async function miniMaxDecision(config, system, prompt, signal) {
  const start = performance.now();
  const response = await fetch(config.endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.apiKey },
    body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      max_tokens: 2048, temperature: 0.2, reasoning_split: true }), signal,
  });
  let data; try { data = await response.json(); } catch { throw new Error('MiniMax 返回了非 JSON 响应'); }
  if (!response.ok || data.error || data.base_resp?.status_code) {
    throw new Error('MiniMax 请求失败：HTTP ' + response.status + ' / ' + (data.error?.code || data.base_resp?.status_code || 'unknown'));
  }
  const text = data.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (!text) throw new Error('MiniMax 没有返回行动 JSON（可能达到输出上限）');
  return { text, model: data.model || config.model, provider: 'minimax', ms: Math.round(performance.now() - start),
    usage: { in: data.usage?.prompt_tokens || 0, out: data.usage?.completion_tokens || 0 } };
}


