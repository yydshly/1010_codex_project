// 独立消费者验收：安装真实 tgz，用包导出构建另一套页面，避免验证依赖旧街区。
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
const web = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const archive = resolve(web, 'public/downloads/research-rain-kit-0.1.0.tgz');
const bytes = await readFile(archive);
const scratch = resolve(web, '.kit-smoke'); await mkdir(scratch, { recursive: true });
const consumer = await mkdtemp(resolve(scratch, 'consumer-'));
function run(args) {
  return new Promise((done, reject) => {
    const child = spawn(process.execPath, args, { cwd: consumer, stdio: 'inherit', windowsHide: true });
    child.on('error', reject); child.on('exit', code => code === 0 ? done() : reject(new Error(`消费者检查退出 ${code}`)));
  });
}
if (!process.env.npm_execpath) throw new Error('请用 npm run test:kit-consumer');
await writeFile(resolve(consumer, 'package.json'), JSON.stringify({ name: 'rain-kit-independent-consumer', private: true, type: 'module',
  dependencies: { '@research/rain-kit': `file:${archive.replaceAll('\\', '/')}`, three: '0.185.1', 'three-mesh-bvh': '0.9.13' } }, null, 2));
await run([process.env.npm_execpath, 'install', '--prefer-offline', '--ignore-scripts', '--no-audit', '--no-fund', '--fetch-timeout=60000', '--fetch-retries=1']);
await writeFile(resolve(consumer, 'check.mjs'), `import assert from 'node:assert/strict';
import * as kit from '@research/rain-kit';
import { createMinimalExample } from '@research/rain-kit/examples/minimal';
for (const key of ['createWeather','createWetGround','createDropletMaterial','createWalkControls','buildModelBvh']) assert.equal(typeof kit[key], 'function');
assert.equal(typeof createMinimalExample, 'function');
const drops = kit.createDropletMaterial({ color: '#a6caba', amount: .4 });
assert.equal(drops.material.color.getHexString(), 'a6caba');
assert.equal(drops.getState().amount, .4); drops.dispose();
console.log('独立安装包导出和材质参数检查通过。');
`);
await run([resolve(consumer, 'check.mjs')]);
await writeFile(resolve(consumer, 'index.html'), '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>独立包消费者</title></head><body><div style="width:800px;height:500px"><canvas id="scene" style="width:100%;height:100%"></canvas></div><script type="module" src="./main.js"></script></body></html>');
await writeFile(resolve(consumer, 'main.js'), `import { createMinimalExample } from '@research/rain-kit/examples/minimal';
const app = await createMinimalExample({ canvas: document.querySelector('#scene') });
app.resize(800,500); window.addEventListener('pagehide', () => app.dispose(), {once:true});
`);
await build({ root: consumer, configFile: false, base: './', build: { outDir: 'dist' } });
const report = { date: new Date().toISOString(), package: '@research/rain-kit@0.1.0',
  archiveSha256: createHash('sha256').update(bytes).digest('hex'), archiveBytes: bytes.length,
  consumer: relative(web, consumer).replaceAll('\\', '/'), installation: 'passed', exports: 'passed', independentBuild: 'passed',
  browserForConsumerBuild: 'not run; browser validation uses web/minimal.html', passed: true };
await writeFile(resolve(web, '../notes/module-consumer-check.json'), JSON.stringify(report, null, 2) + '\n');
console.log('tgz 独立安装、导出和生产构建通过；结果已保存。');
