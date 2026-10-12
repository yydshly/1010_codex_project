import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const upstream = fileURLToPath(new URL('../../vendor/upstream/', import.meta.url));
let ownedGame;
try { await access(path.join(upstream, 'server.js')); await access(path.join(upstream, 'node_modules/ws/wrapper.mjs')); }
catch { throw new Error('请先按项目 README 获取固定版本上游并执行 npm ci'); }
async function ready() { try { return (await (await fetch('http://127.0.0.1:3182/health', { signal: AbortSignal.timeout(600) })).json()).ok; } catch { return false; } }
if (!await ready()) {
  ownedGame = spawn(process.execPath, ['server.js'], { cwd: upstream, env: { ...process.env, PORT: '3182' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  ownedGame.stdout.on('data', bytes => process.stdout.write(bytes)); ownedGame.stderr.on('data', bytes => process.stderr.write(bytes));
  for (let i = 0; i < 40 && !await ready(); i++) await new Promise(resolve => setTimeout(resolve, 200));
  if (!await ready()) { ownedGame.kill(); throw new Error('原游戏 3182 服务启动失败'); }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => ownedGame?.kill());
await import('./battle-server.mjs');
