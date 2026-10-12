/** 将 dist 实际挂载在计划子目录，验证页面、动态资产、CSS、字体与 WebGL 渲染。
 * 不部署；服务器只在本机随机端口运行，验证后关闭。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';
import puppeteer from 'puppeteer-core';

const { values } = parseArgs({ options: {
  report: { type: 'string', default: '.snaps/subpath.json' },
} });
const dist = path.resolve('dist');
const prefix = '/1010_codex_project/004-muster-ww2/';
assert.ok(fs.existsSync(path.join(dist, 'index.html')), '先运行 npm run build');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const report = { date: new Date().toISOString(), prefix, passed: false, failures: [] };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  if (!pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
  const file = path.resolve(dist, pathname.slice(prefix.length) || 'index.html');
  if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end(); return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
let browser;
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const executablePath = [process.env.BROWSER_PATH,
    path.join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ].filter(Boolean).find((p) => fs.existsSync(p));
  assert.ok(executablePath, '找不到 Edge/Chrome，请设置 BROWSER_PATH');
  browser = await puppeteer.launch({ executablePath, headless: true,
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--no-first-run'],
    defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 180000 });
  const page = await browser.newPage();
  page.on('pageerror', (e) => report.failures.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.failures.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) report.failures.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => report.failures.push(`${r.failure()?.errorText} ${r.url()}`));
  // 设置独立的测试布局，直接验证刷新还原入口与真实模型渲染。
  await page.evaluateOnNewDocument(() => localStorage.setItem('muster.display.v3-grand-review', JSON.stringify({
    v: 1, groups: [{ id: 'g1', assetId: 'de-panzer-iv-h', config: { schuerzen: 'fitted' },
      quantity: 1, formation: 'single', spacing: 9, columns: 'auto', heading: 0, anchor: { x: 0, z: 0 },
      instances: [{ slot: 0, offset: { dx: 0, dz: 0 }, headingOffset: 0 }] }],
  })));
  const url = `http://127.0.0.1:${server.address().port}${prefix}archive.html`;
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.bringToFront();
  await page.waitForFunction(() => window.__appReady === true, { polling: 200, timeout: 180000 });
  const result = await page.evaluate(() => ({
    assets: window.__app.getLibrary().length, rendered: window.__app.getRenderedInstanceCount(),
    issues: window.__app.loadIssues(), stylesheets: [...document.styleSheets].map((s) => s.href),
  }));
  assert.equal(result.assets, 74);
  assert.equal(result.rendered, 1);
  assert.deepEqual(result.issues, []);
  assert.ok(result.stylesheets.some((s) => s?.includes('/1010_codex_project/004-muster-ww2/assets/')));
  assert.deepEqual(report.failures, []);
  report.result = result;
  await page.goto(`http://127.0.0.1:${server.address().port}${prefix}camp.html`, { waitUntil: 'load', timeout: 120000 });
  await page.bringToFront();
  await page.waitForFunction(() => window.__campReady === true, { polling: 200, timeout: 300000 });
  const camp = await page.evaluate(() => ({ state: window.__camp.getState(), stylesheets: [...document.styleSheets].map(s => s.href) }));
  assert.equal(camp.state.catalog, 74);
  assert.equal(camp.state.counts.models, 26);
  assert.equal(camp.state.preparing, 0);
  assert.ok(camp.stylesheets.some(s => s?.includes('/1010_codex_project/004-muster-ww2/assets/')));
  assert.deepEqual(report.failures, []);
  report.camp = { catalog: camp.state.catalog, counts: camp.state.counts, stylesheets: camp.stylesheets };
  await page.click('#motion-play');
  await page.waitForFunction(() => { const m = window.__camp.getState().motion; return m.playing && !m.preparing; }, { polling: 200, timeout: 90000 });
  report.motion = await page.evaluate(() => window.__camp.getState().motion);
  assert.equal(report.motion.actors.length, 19);
  await page.click('#motion-play');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.$eval('#motion-seek', input => { input.value = '32'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('#motion-follow');
  await page.hover('#motion-play');
  await new Promise(resolve => setTimeout(resolve, 450));
  report.mobile = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    motion: window.__camp.getState().motion, primaryDisabled: document.querySelector('#motion-play').disabled,
    primaryBackground: getComputedStyle(document.querySelector('#motion-play')).backgroundColor,
    storyVisible: getComputedStyle(document.querySelector('.story')).display !== 'none' }));
  assert.equal(report.mobile.scrollWidth, report.mobile.width); assert.equal(report.mobile.primaryDisabled, false); assert.equal(report.mobile.storyVisible, false);
  fs.writeFileSync(path.resolve('../assets/fieldcamp-motion-mobile.png'), await page.screenshot());
  assert.deepEqual(report.failures, []);
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`http://127.0.0.1:${server.address().port}${prefix}battle.html`, { waitUntil: 'load', timeout: 120000 });
  await page.bringToFront();
  await page.waitForFunction(() => window.__battleReady && window.__battle.getState().render.triangles > 100000, { polling: 200, timeout: 180000 });
  await page.click('#start'); await new Promise(resolve => setTimeout(resolve, 300)); await page.click('#pause');
  report.battle = await page.evaluate(() => ({ state: window.__battle.getState(), stylesheets: [...document.styleSheets].map(s => s.href) }));
  assert.equal(report.battle.state.status, 'paused'); assert.equal(report.battle.state.models.length, 6);
  assert.equal(report.battle.state.soldierModels.length, 10); assert.equal(report.battle.state.aircraftModels.length, 2);
  assert.ok(report.battle.stylesheets.some(s => s?.includes(prefix + 'assets/')));
  assert.deepEqual(report.failures, []);
  report.passed = true;
  await page.goto(`http://127.0.0.1:${server.address().port}${prefix}airport.html`, { waitUntil: 'load', timeout: 120000 });
  await page.bringToFront();
  await page.waitForFunction(() => window.__battleReady && window.__battle.getState().mode === 'airport', { polling: 200, timeout: 180000 });
  await page.click('#start'); await page.click('[data-post="bravo"]'); await page.click('#pause');
  report.airport = await page.evaluate(() => ({ state: window.__battle.getState(), stylesheets: [...document.styleSheets].map(s => s.href) }));
  assert.equal(report.airport.state.status, 'paused'); assert.equal(report.airport.state.mission.phase, 0);
  assert.equal(report.airport.state.mission.squads[1].order, 'move'); assert.equal(report.airport.state.audio.gain, 0);
  assert.ok(report.airport.stylesheets.some(s => s?.includes(prefix + 'assets/'))); assert.deepEqual(report.failures, []);
  console.log('子目录验收通过：原版74条目录、营地26个模型/19个动作实例、协同对战6辆车/10名步兵/2架空袭飞机；动态资源与窄屏控件正常。');
} catch (error) {
  report.passed = false;
  report.error = error.stack ?? String(error);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  const out = path.resolve(values.report);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

