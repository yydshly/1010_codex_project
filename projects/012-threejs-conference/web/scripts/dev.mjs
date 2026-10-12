import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const children = [];
let stopping = false;
function stop() { stopping = true; for (const child of children) if (child.exitCode === null) child.kill(); }
function launch(args, cwd = root) {
  const child = spawn(process.execPath, args, { cwd, stdio: 'inherit', windowsHide: true, env: process.env }); children.push(child);
  child.on('error', error => { console.error(error.message); stop(); process.exitCode = 1; });
  child.on('exit', code => { if (code && !stopping) { stop(); process.exitCode = code; } });
  return child;
}
process.once('SIGINT', stop); process.once('SIGTERM', stop);
console.log('实验台 5192；原库固定版本体验 5195。首次启动会下载原库到 vendor/。');
launch([resolve(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5192', '--strictPort']);
const preparation = launch([resolve(root, 'scripts/upstream.mjs'), '--prepare']);
preparation.on('exit', code => {
  if (code !== 0 || stopping) return;
  const upstream = resolve(root, '../vendor/threejs-conference-8cc20593b2270e2ce832e7b7b44356705daddec4');
  launch([resolve(upstream, 'node_modules/vite/bin/vite.js'), '--config', 'vite.local.config.mjs'], upstream);
});
