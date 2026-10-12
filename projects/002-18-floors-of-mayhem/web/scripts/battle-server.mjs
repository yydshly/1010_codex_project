import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { labRooms } from './lab-rooms.mjs';
import { CodexBridge, loadMiniMax, miniMaxDecision } from './model-bridge.mjs';
import { SYSTEM_PROMPT, ACTION_SCHEMA } from '../../vendor/upstream/public/ai/observe.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'http://127.0.0.1:3183', game = 'http://127.0.0.1:3182';
const codex = new CodexBridge(path.join(root, '.cache/model-workspace'));
const providers = { minimax: { available: false }, codex: { available: false } };
let minimax, currentRun;
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
async function body(req) {
  let text = ''; for await (const bytes of req) { text += bytes; if (text.length > 8000000) throw new Error('请求过大'); } return JSON.parse(text);
}
function stopRun() { if (currentRun) { currentRun.stopped = true; for (const a of currentRun.aborters) a.abort(); } }
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const gameCSS = `<style>html,body{margin:0!important;padding:0!important;background:#081312!important;overflow:hidden}header,.intro,.workspace>aside,.ai-log-col,.arena-top,.arena-bottom,.guide,.loot-guide,footer,#first-play-guide,#touch-controls,#coop-controls,#endless-hud,#scene-caption,#theme-preview,#podium,#countdown{display:none!important}main{width:100%!important;max-width:none!important;padding:0!important;margin:0!important}.workspace,body.immersive .workspace{display:block!important;width:100%!important;height:auto!important;padding:0!important}.arena-wrap,body.immersive .arena-wrap{width:100%!important;max-width:none!important;padding:0!important;margin:0!important;border:0!important;box-shadow:none!important}.canvas-box,body.immersive .canvas-box{width:100%!important;aspect-ratio:900/680!important;height:auto!important;max-height:none!important}canvas#arena{width:100%!important;height:100%!important;display:block}#toast{bottom:12px!important}</style>`;
const gameBridge = `\nif(params.has('lab')){sound=false;soundtrack.enable(false);window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;const m=event.data;if(m.type==='lab-join'){pending={code:m.code,intent:'join',payload:{type:'join',code:m.code,name:'画面观察员',spectate:true,look}};connect();}if(m.type==='lab-follow')spectateId=m.id;if(m.type==='lab-frame'){const first=!game||mode!=='online';game=m.game;mode='online';myId='replay-observer';spectateId=m.id;countUntil=0;finishedShown=true;if(first)show('game');}});parent.postMessage({type:'lab-ready'},location.origin);}\n`;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, origin);
  if (req.headers.host !== '127.0.0.1:3183') return json(res, 403, { error: '只允许本机地址' });
  if (req.method === 'POST' && req.headers.origin !== origin) return json(res, 403, { error: '只允许本机观察室操作' });
  try {
    if (url.pathname === '/health') return json(res, 200, { ok: true, rooms: rooms.count() });
    if (url.pathname === '/room' && req.method === 'POST') return json(res, 200, { code: rooms.create() });
    if (url.pathname === '/lab/latest' && req.method === 'GET') { try { let saved; try { saved = await readFile(path.join(root, '.cache/latest-battle.json'), 'utf8'); } catch { saved = await readFile(path.join(root, '../assets/ai-battle-step.json'), 'utf8'); } res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(saved); } catch { return json(res, 404, { error: '尚无实测战报' }); } }
    if (url.pathname === '/lab/realtime' && req.method === 'GET') { const saved = await readFile(path.join(root, '../assets/ai-battle-realtime.json'), 'utf8'); res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(saved); }
    if (url.pathname === '/lab/status') return json(res, 200, { providers, gameUrl: origin, limit: 12, duration: 60 });
    if (url.pathname === '/lab/start' && req.method === 'POST') {
      const options = await body(req);
      stopRun(); currentRun = { observationMode: options.observationMode === 'live' ? 'live' : 'step', limit: options.observationMode === 'live' ? 12 : 4, id: randomUUID(), started: Date.now(), stopped: false, calls: { minimax: 0, codex: 0 }, busy: new Set(), aborters: new Set() };
      return json(res, 200, { runId: currentRun.id, limit: currentRun.limit, observationMode: currentRun.observationMode });
    }
    if (url.pathname === '/lab/stop' && req.method === 'POST') {
      const data = await body(req); if (data.runId === currentRun?.id) stopRun(); return json(res, 200, { stopped: true });
    }
    if (url.pathname === '/lab/decide' && req.method === 'POST') {
      const { runId, provider, view, plan, persona } = await body(req); const run = currentRun;
      if (!run || run.id !== runId || run.stopped || Date.now() - run.started > (run.observationMode === 'step' ? 180000 : 90000)) return json(res, 409, { error: '本局已结束' });
      if (!['minimax', 'codex'].includes(provider) || !providers[provider].available) return json(res, 503, { error: '模型接口尚未就绪' });
      if (run.busy.has(provider) || run.calls[provider] >= run.limit) return json(res, 429, { error: '本局请求上限或已有决策请求' });
      if (!view?.me || !Array.isArray(view.reachable) || view.reachable.length > 8 || JSON.stringify(view).length > 12000) return json(res, 400, { error: '局面无效' });
      run.calls[provider]++; run.busy.add(provider);
      const abort = new AbortController(); run.aborters.add(abort);
      const timer = setTimeout(() => abort.abort(), 35000);
      res.on('close', () => { if (!res.writableEnded) abort.abort(); });
      try {
        const system = SYSTEM_PROMPT + '\n阶段策略偏好：' + String(persona || '安全生存，兼顾道具').slice(0, 160) + '\nwhy 只给简短行动理由，不要输出内部推理过程。';
        const prompt = (plan ? '你此前的计划：' + String(plan).slice(0, 160) + '\n' : '') + JSON.stringify(view) + '\n' + ACTION_SCHEMA;
        const result = provider === 'minimax' ? await miniMaxDecision(minimax, system, prompt, abort.signal) : await codex.decide(system, prompt, abort.signal);
        providers[provider].verified = true; providers[provider].lastMs = result.ms;
        return json(res, 200, { ...result, requestNumber: run.calls[provider] });
      } catch (error) {
        return json(res, abort.signal.aborted ? 408 : 502, { error: abort.signal.aborted ? '决策取消或超过 35 秒' : error.message });
      } finally { clearTimeout(timer); await new Promise(resolve => setTimeout(resolve, 100)); run.busy.delete(provider); run.aborters.delete(abort); }
    }
    if (url.pathname === '/lab/report' && req.method === 'POST') {
      const report = await body(req);
      if (report.runId !== currentRun?.id || !Array.isArray(report.records) || report.records.length > 1000) return json(res, 400, { error: '战报无效' });
      await mkdir(path.join(root, '.cache'), { recursive: true });
      await writeFile(path.join(root, '.cache/latest-battle.json'), JSON.stringify(report, null, 2));
      return json(res, 200, { saved: true });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' });
    const ownFiles = { '/': 'battle.html', '/battle.html': 'battle.html', '/battle.css': 'battle.css', '/battle.js': 'battle.js', '/battle-agents.js': 'battle-agents.js', '/decision-guard.js': 'decision-guard.js' };
    if (ownFiles[url.pathname]) {
      const bytes = await readFile(path.join(root, 'src', ownFiles[url.pathname]));
      res.writeHead(200, { 'Content-Type': types[path.extname(ownFiles[url.pathname])], 'Cache-Control': 'no-store' }); return res.end(bytes);
    }
    // The original server's explicit public allowlist remains the asset boundary.
    const remotePath = url.pathname === '/game.html' ? '/' : url.pathname;
    const upstream = await fetch(game + remotePath, { signal: AbortSignal.timeout(10000) });
    if (url.pathname === '/app.js' && upstream.ok) {
      let app = (await upstream.text()).replaceAll('ws.readyState', 'ws?.readyState');
      app = app.replace("if(m.type==='lobby'){room=m;", "if(m.type==='lobby'){if(params.has('lab'))parent.postMessage({type:'lab-joined'},location.origin);room=m;");
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(app + gameBridge);
    }
    if (url.pathname === '/game.html' && upstream.ok) {
      let html = await upstream.text();
      html = html.replace('</head>', gameCSS + `<script>window.MAN18_RUNTIME_URL='${origin}';</script></head>`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(html);
    }
    res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream' }); res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch { if (!res.headersSent) json(res, 500, { error: '本机服务请求失败，请检查游戏是否在 3182 端口运行' }); }
});
const rooms = labRooms(server, () => currentRun);
server.listen(3183, '127.0.0.1', () => console.log('AI 对战观察室：http://127.0.0.1:3183/'));
const initialized = await Promise.allSettled([
  (async () => { minimax = await loadMiniMax(process.env.MAYHEM_MINIMAX_ENV || 'F:/codex_project/.env.minimax'); providers.minimax = { available: true, model: minimax.model, verified: false }; })(),
  (async () => { providers.codex = { ...await codex.start(), verified: false }; })(),
]);
initialized.forEach((r, i) => { if (r.status === 'rejected') providers[i ? 'codex' : 'minimax'].error = r.reason.message; });
console.log(JSON.stringify({ providers }));
const close = () => { stopRun(); rooms.close(); codex.close(); server.close(); };
process.on('SIGINT', close); process.on('SIGTERM', close);
