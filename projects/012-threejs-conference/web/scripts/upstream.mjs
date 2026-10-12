import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { patchUpstreamMain } from './patch-upstream.mjs';
const commit = '8cc20593b2270e2ce832e7b7b44356705daddec4';
const web = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vendor = resolve(web, '../vendor');
const root = resolve(vendor, `threejs-conference-${commit}`);
async function writeChanged(path, content) {
  if (existsSync(path) && await readFile(path, 'utf8') === content) return;
  await writeFile(path, content);
}
async function copyChanged(from, to) { await writeChanged(to, await readFile(from, 'utf8')); }
function run(command, args, cwd = root) {
  return new Promise((done, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', windowsHide: true });
    child.on('error', reject); child.on('exit', code => code === 0 ? done() : reject(new Error(`进程退出：${code}`)));
    const stop = () => child.kill(); process.once('SIGINT', stop); process.once('SIGTERM', stop);
    child.on('exit', () => { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); });
  });
}
await mkdir(vendor, { recursive: true });
if (!existsSync(resolve(root, 'src/main.js'))) {
  console.log('下载固定上游版本；素材只保存在被忽略的 vendor/，不随研究代码发布。');
  const archive = resolve(vendor, 'upstream-8cc2059.zip');
  if (!existsSync(archive)) {
    const response = await fetch(`https://codeload.github.com/ektogamat/threejs-conference/zip/${commit}`);
    if (!response.ok) throw new Error(`上游下载失败：${response.status}`);
    await writeFile(archive, Buffer.from(await response.arrayBuffer()));
  }
  if (process.platform === 'win32') {
    const quote = s => "'" + s.replaceAll("'", "''") + "'";
    await run('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath ${quote(archive)} -DestinationPath ${quote(vendor)} -Force`], vendor);
  } else await run('unzip', ['-o', archive, '-d', vendor], vendor);
}
// 本机运行适配：保留原模型/渲染，兼容视频上传与无 Pointer Lock 的拖动操作。
const packagePath = resolve(root, 'package.json');
const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
pkg.dependencies = { gsap: '3.15.0', three: '0.185.1', 'three-mesh-bvh': '0.9.13' };
pkg.devDependencies = { vite: '8.3.4' };
await writeChanged(packagePath, JSON.stringify(pkg, null, 2) + '\n');
await writeChanged(resolve(root, 'vite.local.config.mjs'), `import { defineConfig } from 'vite';
export default defineConfig({ server: { host: '127.0.0.1', port: 5195, strictPort: true, open: false }, preview: { host: '127.0.0.1', port: 5196, strictPort: true, open: false } });
`);
await copyChanged(resolve(web, 'adapters/upstream-video.js'), resolve(root, 'src/world/billboards/materials/createVideoTexture.js'));
await copyChanged(resolve(web, 'modules/rain-kit/walk.js'), resolve(root, 'src/controls/createWalkControls.js'));
await mkdir(resolve(root, 'src/controls/internal'), { recursive: true });
await copyChanged(resolve(web, 'modules/rain-kit/internal/parameters.js'), resolve(root, 'src/controls/internal/parameters.js'));
await copyChanged(resolve(web, 'adapters/upstream-shell.js'), resolve(root, 'src/local-shell.js'));
await copyChanged(resolve(web, 'adapters/upstream-shell.css'), resolve(root, 'src/local-shell.css'));
await copyChanged(resolve(web, 'adapters/upstream-effects.js'), resolve(root, 'src/local-effects.js'));
const mainPath = resolve(root, 'src/main.js');
await writeChanged(mainPath, patchUpstreamMain(await readFile(mainPath, 'utf8')));
const indexPath = resolve(root, 'index.html');
const index = await readFile(indexPath, 'utf8');
if (!index.includes('/src/local-shell.js')) await writeFile(indexPath, index.replace('</body>', '<script type="module" src="/src/local-shell.js"></script>\n</body>'));
const promptPath = resolve(root, 'src/ui/walk/createWalkPrompt.js');
let prompt = await readFile(promptPath, 'utf8');
prompt = prompt.replace(': enabled && !isPointerLocked() && !panelOpen;', ': enabled && !hasTouchLooked && !isPointerLocked() && !panelOpen;');
prompt = prompt.replace('    domElement.requestPointerLock();', `    const fallback = () => { hasTouchLooked = true; sync(); domElement.tabIndex = 0; domElement.focus(); };
    try { domElement.requestPointerLock()?.catch(fallback); } catch { fallback(); }`);
prompt = prompt.replace('    if (!isCoarsePointerDevice()) {\n      return;\n    }\n\n    hasTouchLooked', '    hasTouchLooked');
prompt = prompt.replace('titleEl.textContent = "Click to look around";', 'titleEl.textContent = "WASD 移动 · 拖动看四周";');
await writeChanged(promptPath, prompt);
if (!existsSync(resolve(root, 'node_modules/gsap/package.json')) || !existsSync(resolve(root, 'node_modules/vite/package.json'))) {
  console.log('安装原库本机体验依赖…');
  const npmCLI = process.env.npm_execpath;
  if (!npmCLI) throw new Error('请用 npm run dev:upstream 启动，提供 npm 路径。');
  await run(process.execPath, [npmCLI, 'install', '--prefer-offline', '--fetch-timeout=60000', '--fetch-retries=1', '--no-audit']);
}
await writeFile(resolve(vendor, 'SOURCE.json'), JSON.stringify({ url: 'https://github.com/ektogamat/threejs-conference', commit, localOnly: true, adaptations: ['Vite 8.3.4', 'localhost HTTP, 5195', 'deployment CLI and SSL plugin omitted', '12 FPS canvas video upload', 'drag look / keyboard without Pointer Lock, blur release and curb selection', 'Pointer Lock rejection handled with drag fallback and Chinese hint', 'Chinese effects panel and return-to-research navigation', 'native rain / planar reflection / car droplets / Bloom controls', 'car droplets independent from rain, retaining proximity fade', 'Bloom and device-budgeted lensflare share one switch', 'effective droplet intensity also gates paint and glass normal perturbation'], assetsLicense: 'public/ assets are not covered by MIT; no redistribution license asserted' }, null, 2));
if (process.argv.includes('--prepare')) console.log('原库本机体验准备完成。');
else if (process.argv.includes('--build')) await run(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.local.config.mjs']);
else { console.log('原库完整体验：http://127.0.0.1:5195/'); await run(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), '--config', 'vite.local.config.mjs']); }
