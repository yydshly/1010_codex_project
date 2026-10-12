import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const webRoot = fileURLToPath(new URL('../', import.meta.url));
export const upstreamRoot = path.join(webRoot, '.cache', 'upstream');
export const upstreamDist = path.join(upstreamRoot, 'dist');
const manifestPath = path.join(webRoot, '.cache', 'prepared.json');

export async function run(command, args, cwd) {
  await new Promise((resolve, reject) => {
    // npm's CLI is a JS file: spawn it through Node to preserve argument boundaries on Windows.
    const isNpm = command === 'npm';
    const executable = isNpm ? process.execPath : command;
    const cli = process.env.npm_execpath;
    const argv = isNpm
      ? [cli || path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), ...args]
      : args;
    const child = spawn(executable, argv, { cwd, stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} 退出码 ${code}`)));
  });
}

export async function prepare() {
  const spec = JSON.parse(await readFile(path.join(webRoot, 'upstream.json'), 'utf8'));
  if (!/^[a-f0-9]{40}$/.test(spec.revision)) throw new Error('上游版本必须是完整 commit SHA。');
  const fingerprint = `${spec.revision}:${spec.sourceMapVersion}:${spec.patchVersion}`;
  if (existsSync(manifestPath) && existsSync(path.join(upstreamDist, 'index.html'))) {
    const prepared = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (prepared.fingerprint === fingerprint) {
      console.log(`使用本机已构建的上游 ${spec.revision.slice(0, 7)}。`);
      return prepared;
    }
  }
  await mkdir(path.dirname(upstreamRoot), { recursive: true });
  if (!existsSync(path.join(upstreamRoot, '.git'))) {
    if (existsSync(upstreamRoot)) throw new Error(`缓存目录存在但不是 Git 仓库：${upstreamRoot}`);
    console.log('取得固定版本的上游源码与运行资源（不下载录屏及素材原件）…');
    await run('git', ['clone', '--filter=blob:none', '--depth', '1', '--sparse', spec.repository, upstreamRoot], webRoot);
  }
  await run('git', ['fetch', '--depth', '1', 'origin', spec.revision], upstreamRoot);
  await run('git', ['sparse-checkout', 'set', 'src', 'tools'], upstreamRoot);
  await run('git', ['checkout', '--detach', spec.revision], upstreamRoot);
  const pkgPath = path.join(upstreamRoot, 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  // Only the cached build dependency is patched; scene sources, models and narration remain upstream originals.
  pkg.overrides = { ...pkg.overrides, 'source-map-js': spec.sourceMapVersion };
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log('安装缓存内依赖，并修补 source-map-js 构建链版本…');
  await run('npm', ['install', '--ignore-scripts', '--no-fund'], upstreamRoot);
  await run('npm', ['run', 'build'], upstreamRoot);
  const prepared = { fingerprint, repository: spec.repository, revision: spec.revision, sourceMapVersion: spec.sourceMapVersion, builtAt: new Date().toISOString() };
  await writeFile(manifestPath, `${JSON.stringify(prepared, null, 2)}\n`);
  return prepared;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepare().catch((error) => { console.error(`准备失败：${error.message}`); process.exitCode = 1; });
}
