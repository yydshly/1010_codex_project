/** 浏览器验收：真实 UI 编辑、编队、撤销重做、拖动、复制删除与刷新恢复。
 * 先运行 npm run build / npm run preview，再执行 npm run verify。
 * 使用独立的临时浏览器配置，不会读取或修改日常浏览器中的布局。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import puppeteer from 'puppeteer-core';

const { values } = parseArgs({ options: {
  base: { type: 'string', default: 'http://127.0.0.1:5198' },
  screenshots: { type: 'string', default: '.snaps/verification' },
  report: { type: 'string', default: '.snaps/verification.json' },
} });
const executablePath = [
  process.env.BROWSER_PATH,
  path.join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean).find((p) => fs.existsSync(p));
assert.ok(executablePath, '找不到 Edge/Chrome，请设置 BROWSER_PATH');
const shots = path.resolve(values.screenshots);
const reportPath = path.resolve(values.report);
fs.mkdirSync(shots, { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
const report = { date: new Date().toISOString(), base: values.base, node: process.version,
  checks: [], consoleErrors: [], warnings: [], networkFailures: [], screenshots: [], passed: false };
let browser;
let page;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function check(name, task) {
  console.log(`检查：${name}`);
  const detail = await task();
  report.checks.push({ name, passed: true, detail });
  console.log(`通过：${name}`);
}
async function sceneReady() {
  await page.waitForFunction(() => window.__app.getGroups().every((g) =>
    !g.preparing && g.rendered === g.instances.length), { polling: 200, timeout: 180000 });
  await page.evaluate(() => window.__app.nextFrame());
  await pause(600);
}
async function screenshot(name) {
  await page.screenshot({ path: path.join(shots, name) });
  report.screenshots.push(name);
}
async function shortcut(key, shift = false) {
  await page.keyboard.down('Control');
  if (shift) await page.keyboard.down('Shift');
  await page.keyboard.press(key);
  if (shift) await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
}
try {
  browser = await puppeteer.launch({ executablePath, headless: true,
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl',
      '--no-first-run', '--no-default-browser-check', '--hide-scrollbars'],
    defaultViewport: { width: 1800, height: 1100, deviceScaleFactor: 1 }, protocolTimeout: 300000 });
  report.browser = await browser.version();
  page = await browser.newPage();
  page.on('pageerror', (e) => report.consoleErrors.push(e.message));
  page.on('console', (m) => {
    const list = m.type() === 'error' ? report.consoleErrors : m.type() === 'warn' ? report.warnings : null;
    if (list && !list.includes(m.text())) list.push(m.text());
  });
  page.on('requestfailed', (r) => report.networkFailures.push({ url: r.url(), error: r.failure()?.errorText }));
  page.on('response', (r) => { if (r.status() >= 400) report.networkFailures.push({ url: r.url(), status: r.status() }); });
  await check('生产页面、完整目录与默认展台', async () => {
    const response = await page.goto(`${values.base.replace(/\/$/, '')}/archive.html`, { waitUntil: 'load', timeout: 120000 });
    assert.equal(response.status(), 200);
    await page.bringToFront();
    await page.waitForFunction(() => window.__appReady === true, { polling: 200, timeout: 300000 });
    await sceneReady();
    const data = await page.evaluate(() => ({
      assets: window.__app.listAssets().filter((d) => d.listed), issues: window.__app.loadIssues(),
      counts: window.__app.getCounts(), timings: window.__app.getTimings(),
    }));
    assert.equal(data.assets.length, 74);
    assert.equal(data.issues.length, 0);
    assert.ok(data.assets.every((d) => d.placeable));
    assert.equal(data.counts.total, 280);
    report.catalog = data.assets;
    report.initialCounts = data.counts;
    report.timings = data.timings;
    await page.evaluate(() => window.__app.setCamera({ target: [0, 0, 0], yaw: 4, pitch: 24, distance: 112 }));
    await sceneReady();
    await screenshot('cover.png');
    return { listed: data.assets.length, models: data.counts.total, loadIssues: data.issues.length };
  });
  const initial = await page.evaluate(() => window.__app.getGroups());
  const tankId = initial.find((g) => g.assetId === 'de-panzer-iv-h').id;
  await check('国家筛选与文本搜索不改变展台', async () => {
    await page.click('.dd-trigger');
    const germany = await page.$('button[role="menuitemradio"][data-id="germany"]');
    if (germany) await germany.click();
    else {
      const buttons = await page.$$('button[role="menuitemradio"]');
      let clicked = false;
      for (const button of buttons) {
        if ((await button.evaluate((el) => el.textContent)).includes('Germany')) { await button.click(); clicked = true; break; }
      }
      assert.ok(clicked, '国家菜单中应包含 Germany');
    }
    await page.waitForFunction(() => window.__app.getFilter().faction === 'germany');
    const search = 'input[aria-label="Search Models"]';
    await page.click(search);
    await page.type(search, 'Panzer IV');
    await page.waitForFunction(() => window.__app.getLibrary().length === 1 && window.__app.getLibrary()[0] === 'de-panzer-iv-h');
    assert.equal(await page.evaluate(() => window.__app.getCounts().total), 280);
    return { faction: 'germany', search: 'Panzer IV', result: 'de-panzer-iv-h', displayModels: 280 };
  });
  await check('鼠标选中模型与侧裙配置更新', async () => {
    await page.evaluate((id) => window.__app.focus(id), tankId);
    await pause(1000);
    const point = await page.evaluate((id) => window.__app.screenPoint(id), tankId);
    assert.ok(point, '模型应有可点击位置');
    await page.mouse.click(point.x, point.y);
    await page.waitForFunction((id) => window.__app.getSelection()?.groupId === id, {}, tankId);
    await page.click('[aria-label="Schuerzen"] button[role="radio"]:nth-child(2)');
    await page.waitForFunction((id) => window.__app.getGroups().find((g) => g.id === id)?.config.schuerzen === 'removed', {}, tankId);
    await sceneReady();
    return { schuerzen: 'removed', selected: true };
  });
  await check('数量、网格编队与键盘撤销重做', async () => {
    await page.click('input[aria-label="Quantity"]');
    await shortcut('a');
    await page.keyboard.type('3');
    await page.keyboard.press('Tab');
    await page.waitForFunction((id) => window.__app.getGroups().find((g) => g.id === id)?.quantity === 3, {}, tankId);
    await page.click('[aria-label="Formation"] button[role="radio"]:nth-child(3)');
    await page.waitForFunction((id) => window.__app.getGroups().find((g) => g.id === id)?.formation === 'grid', {}, tankId);
    await shortcut('z');
    await page.waitForFunction((id) => window.__app.getGroups().find((g) => g.id === id)?.formation === 'line', {}, tankId);
    await shortcut('z', true);
    await page.waitForFunction((id) => window.__app.getGroups().find((g) => g.id === id)?.formation === 'grid', {}, tankId);
    await sceneReady();
    return { quantity: 3, formation: 'grid', undo: 'line', redo: 'grid' };
  });
  await check('鼠标拖动、旋转、复制与删除', async () => {
    await page.evaluate((id) => window.__app.select(id), tankId);
    await page.evaluate((id) => window.__app.focus(id), tankId);
    await pause(1000);
    const before = await page.evaluate((id) => window.__app.getGroups().find((g) => g.id === id), tankId);
    const point = await page.evaluate((id) => window.__app.screenPoint(id), tankId);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 45, point.y + 20, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction((id, anchor) => {
      const g = window.__app.getGroups().find((g) => g.id === id);
      return g && (g.anchor.x !== anchor.x || g.anchor.z !== anchor.z);
    }, {}, tankId, before.anchor);
    await page.keyboard.press('q');
    await page.waitForFunction((id, heading) => window.__app.getGroups().find((g) => g.id === id)?.heading !== heading, {}, tankId, before.heading);
    const n = await page.evaluate(() => window.__app.getGroups().length);
    await shortcut('d');
    await page.waitForFunction((n) => window.__app.getGroups().length === n + 1, {}, n);
    await page.keyboard.press('Delete');
    await page.waitForFunction((n) => window.__app.getGroups().length === n, {}, n);
    await sceneReady();
    return { dragged: true, rotated: true, duplicated: true, deleted: true };
  });
  let savedGroups;
  await check('添加新编队并自动保存', async () => {
    // 独立测试浏览器中清空大展台，准备可清楚展示与刷新验证的小布局。
    const id = await page.evaluate(() => {
      window.__app.clear();
      const id = window.__app.addGroup('de-panzer-iv-h', { schuerzen: 'removed' }, [2, 3], 3, 15);
      window.__app.setFormation(id, 'grid');
      window.__app.select(id);
      window.__app.focus(id);
      return id;
    });
    assert.ok(id);
    await sceneReady();
    await page.waitForFunction(() => {
      const saved = JSON.parse(localStorage.getItem('muster.display.v3-grand-review') ?? 'null');
      return saved?.groups.length === 1 && saved.groups[0].instances.length === 3 && saved.groups[0].formation === 'grid';
    });
    savedGroups = await page.evaluate(() => JSON.parse(localStorage.getItem('muster.display.v3-grand-review')).groups);
    await screenshot('configured-grid.png');
    return { groups: savedGroups.length, quantity: 3, formation: 'grid', schuerzen: 'removed' };
  });
  await check('刷新后恢复真实保存的布局', async () => {
    await page.reload({ waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.__appReady === true, { timeout: 180000 });
    await sceneReady();
    const restored = await page.evaluate(() => window.__app.getGroups());
    assert.equal(restored.length, 1);
    for (const key of ['assetId', 'config', 'formation', 'spacing', 'columns', 'heading', 'anchor', 'instances']) {
      assert.deepEqual(restored[0][key], savedGroups[0][key], `刷新应恢复 ${key}`);
    }
    assert.equal(await page.evaluate(() => window.__app.getRenderedInstanceCount()), 3);
    await page.evaluate((id) => { window.__app.select(id); window.__app.setFilter({ search: 'Panzer IV' }); }, restored[0].id);
    await sceneReady();
    await screenshot('restored-layout.png');
    return { restoredGroups: 1, restoredModels: 3, configurationAndPositionsMatch: true };
  });
  assert.deepEqual(report.consoleErrors, [], '浏览器不能有运行错误');
  assert.deepEqual(report.networkFailures, [], '生产页面不能有资源加载失败');
  report.passed = true;
  console.log(`验收通过：${report.checks.length} 项，报告 ${reportPath}`);
} catch (error) {
  report.failure = error.stack ?? String(error);
  console.error(report.failure);
  process.exitCode = 1;
  if (page) await screenshot('verification-failure.png').catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
}
