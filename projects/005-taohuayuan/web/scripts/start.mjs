import { existsSync } from 'node:fs';
import path from 'node:path';
import { prepare, webRoot, upstreamDist } from './prepare.mjs';
import { createDemoServer } from './server.mjs';

try {
  const preview = process.argv.includes('--preview');
  const portArg = process.argv.find((arg) => arg.startsWith('--port='));
  const port = Number(portArg?.slice(7) || 5195);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口必须为 1–65535 的整数。');
  if (!preview) await prepare();
  const shellRoot = path.join(webRoot, preview ? 'dist' : 'public');
  const experienceRoot = preview ? path.join(shellRoot, 'experience') : upstreamDist;
  if (!existsSync(path.join(experienceRoot, 'index.html'))) throw new Error('缺少演示产物，请先运行 npm run build。');
  const server = createDemoServer({ shellRoot, experienceRoot, notesRoot: preview ? path.join(shellRoot, 'notes') : path.join(webRoot, '..', 'notes') });
  server.on('error', (error) => { console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已占用；可使用 --port=5196。` : error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`桃源本地研究台：http://127.0.0.1:${port}/\n原版全屏场景：http://127.0.0.1:${port}/experience/\n按 Ctrl+C 停止。`));
} catch (error) { console.error(`启动失败：${error.message}`); process.exitCode = 1; }
