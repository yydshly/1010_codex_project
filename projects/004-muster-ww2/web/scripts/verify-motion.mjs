/** 真实 UI 控制与渲染验收；只读场景坐标作为证据，不能通过 QA 修改动作。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:5198/';
const executablePath = [process.env.BROWSER_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(fs.existsSync);
assert.ok(executablePath);
const report = { date: new Date().toISOString(), base, checks: [], errors: [], warnings: [], failures: [], screenshots: [], passed: false };
const browser = await puppeteer.launch({ executablePath, headless: true, defaultViewport: { width: 1800, height: 1100, deviceScaleFactor: 1 },
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--no-first-run', '--hide-scrollbars'], protocolTimeout: 300000 });
const page = await browser.newPage(); report.browser = await browser.version();
page.on('pageerror', e => report.errors.push(e.message));
page.on('console', m => { const list = m.type() === 'error' ? report.errors : m.type() === 'warn' ? report.warnings : null; if (list && !list.includes(m.text())) list.push(m.text()); });
page.on('requestfailed', r => report.failures.push(r.url() + ' ' + r.failure()?.errorText));
page.on('response', r => { if (r.status() >= 400) report.failures.push(r.status() + ' ' + r.url()); });
const pause = ms => new Promise(r => setTimeout(r, ms));
const state = () => page.evaluate(() => window.__camp.getState());
const aircraft = s => s.motion.actors.find(a => a.kind === 'aircraft');
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const comparable = groups => groups.map(({ id, ...g }) => g);
async function check(name, task) { console.log('检查：' + name); const detail = await task(); assert.deepEqual(report.errors, [], '浏览器出现渲染错误'); assert.deepEqual(report.failures, [], '资源请求失败'); report.checks.push({ name, passed: true, detail }); console.log('通过：' + name); }
async function shot(name) { const pixels = await page.screenshot(); fs.writeFileSync(path.resolve('../assets/' + name), pixels); report.screenshots.push(name); }
async function seek(time) {
  await page.$eval('#motion-seek', (input, t) => { input.value = String(t); input.dispatchEvent(new Event('input', { bubbles: true })); }, time);
  await pause(350); const s = await state(); assert.equal(s.motion.time, time); assert.equal(s.motion.playing, false); return s;
}
let original;
try {
  await check('静态布置与 26 个真实实例', async () => {
    await page.goto(new URL('camp.html', base).href, { waitUntil: 'load', timeout: 120000 }); await page.bringToFront();
    await page.waitForFunction(() => window.__campReady, { polling: 200, timeout: 300000 }); await pause(600);
    original = await state(); assert.equal(original.counts.models, 26); assert.equal(original.motion.active, false);
    return { instances: original.poses.length, groups: original.groups.length };
  });
  await check('启动：5 辆车、12 名巡逻士兵、2 架飞机使用现有模型', async () => {
    await page.click('#motion-play');
    await page.waitForFunction(() => window.__camp.getState().motion.playing && !window.__camp.getState().motion.preparing, { polling: 200, timeout: 90000 });
    const a = await state(); await pause(1250); const b = await state();
    assert.ok(b.motion.time > a.motion.time); assert.equal(b.motion.actors.length, 19);
    assert.equal(b.motion.actors.filter(i => ['jeep', 'armor'].includes(i.kind)).length, 5);
    assert.equal(b.motion.actors.filter(i => i.kind === 'patrol').length, 12);
    for (const kind of ['jeep', 'armor', 'patrol']) {
      const before = a.motion.actors.find(i => i.kind === kind), after = b.motion.actors.find(i => i.kind === kind);
      assert.ok(distance(before.position, after.position) > 0.1, kind + ' 应实际移动'); assert.notDeepEqual(before.quaternion, after.quaternion);
    }
    assert.notEqual(a.motion.actors.find(i => i.kind === 'patrol').gaitOrPropeller, b.motion.actors.find(i => i.kind === 'patrol').gaitOrPropeller);
    assert.equal(await page.$eval('#quantity', e => e.disabled), true); assert.deepEqual(b.groups, original.groups);
    return { time: [a.motion.time, b.motion.time], actors: b.motion.actors, render: b.render };
  });
  await check('暂停冻结全部位置、朝向、步态与桨叶；继续保持时间', async () => {
    await page.click('#motion-play'); await pause(250); const a = await state(); await pause(1000); const b = await state();
    assert.equal(a.motion.time, b.motion.time); assert.deepEqual(a.motion.actors, b.motion.actors);
    const box = await page.$eval('.scene-canvas', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y }; });
    await page.mouse.click(box.x + 8, box.y + 230); await page.keyboard.press('Space');
    await pause(800); const c = await state(); assert.equal(c.motion.playing, true); assert.ok(c.motion.time > b.motion.time && c.motion.time < b.motion.time + 3);
    await page.keyboard.press('Space'); assert.equal((await state()).motion.playing, false);
    return { pausedAt: b.motion.time, resumedAt: c.motion.time };
  });
  await check('真实起降阶段、飞机跟随视角与实际截图', async () => {
    const taxi = await seek(12); assert.equal(aircraft(taxi).position[1], 0); assert.equal(taxi.motion.phase, '滑行至跑道');
    const takeoff = await seek(25); assert.ok(aircraft(takeoff).position[1] > 1); assert.equal(takeoff.motion.phase, '加速 · 离地');
    await shot('fieldcamp-motion-takeoff.png');
    await page.click('#motion-follow'); const flight = await seek(32);
    assert.ok(aircraft(flight).position[1] > 10); assert.ok(flight.camera.target[1] > 11);
    assert.ok(distance(flight.camera.target, aircraft(flight).position) < 2); await shot('fieldcamp-motion-flight.png');
    const approach = await seek(57); assert.ok(aircraft(approach).position[1] > 0 && aircraft(approach).position[1] < 10); await shot('fieldcamp-motion-approach.png');
    const landing = await seek(65); assert.equal(aircraft(landing).position[1], 0); assert.equal(landing.motion.phase, '着陆滑跑'); await shot('fieldcamp-motion-landing.png');
    const returned = await seek(88); assert.ok(distance(aircraft(returned).position, [-25.5, 0, -8]) < 0.01);
    await page.click('[data-zone="squad"]'); assert.equal(await page.$eval('#motion-follow', e => e.checked), false);
    await pause(850); await seek(20.3); await shot('fieldcamp-motion-patrol.png');
    await page.click('[data-zone="armor"]'); await pause(850); await shot('fieldcamp-motion-convoy.png');
    return { takeoff: aircraft(takeoff), flight: aircraft(flight), approach: aircraft(approach), landing: aircraft(landing), returned: aircraft(returned) };
  });
  await check('倍速、90 秒循环接缝与重播', async () => {
    await page.select('#motion-speed', '2'); await seek(89.8); await page.click('#motion-play');
    await pause(900); const loop = await state(); assert.equal(loop.motion.speed, 2); assert.ok(loop.motion.time < 8);
    await page.click('#motion-restart'); await pause(200); const restarted = await state(); assert.ok(restarted.motion.time < 3);
    const end = await seek(90), start = await seek(0);
    for (let i = 0; i < end.motion.actors.length; i++) assert.ok(distance(end.motion.actors[i].position, start.motion.actors[i].position) < 0.01);
    await page.click('#motion-play'); await pause(600); const active = await state(); assert.ok(active.motion.time > 0);
    await page.click('#motion-play'); return { loopTime: loop.motion.time, restartedAt: restarted.motion.time, render: active.render };
  });
  await check('返回布置恢复原位，动态不污染保存，刷新保持静态编辑', async () => {
    await page.click('#motion-exit'); await pause(800); const restored = await state();
    assert.equal(restored.motion.active, false); assert.deepEqual(restored.groups, original.groups); assert.deepEqual(restored.poses, original.poses);
    assert.equal(await page.$eval('#quantity', e => e.disabled), false);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('muster.fieldcamp.v1')));
    assert.deepEqual(saved.groups, original.groups);
    await page.reload({ waitUntil: 'load', timeout: 120000 }); await page.bringToFront();
    await page.waitForFunction(() => window.__campReady, { polling: 200, timeout: 300000 });
    assert.equal((await state()).motion.active, false); assert.deepEqual(comparable((await state()).groups), comparable(original.groups));
    return { groupsUnchanged: true, posesRestored: true };
  });
  await check('窄屏暂停、继续与控件可用', async () => {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 }); await pause(800);
    await page.click('#motion-play'); await page.waitForFunction(() => window.__camp.getState().motion.playing, { polling: 200, timeout: 90000 });
    await page.click('#motion-play'); await seek(30); await shot('fieldcamp-motion-mobile.png');
    const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, controls: [...document.querySelectorAll('.motion-actions>*')].map(e => ({ left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right })) }));
    assert.equal(size.width, size.scrollWidth); assert.ok(size.controls.every(e => e.left >= 0 && e.right <= size.width));
    await page.click('#motion-play'); await pause(500); assert.equal((await state()).motion.playing, true);
    await page.click('#motion-play'); return { ...size, note: '桌面 Edge 窄屏模拟，未测试真实手机性能' };
  });
  assert.deepEqual(report.errors, []); assert.deepEqual(report.failures, []); report.passed = true;
} catch (error) { report.error = error.stack ?? String(error); console.error(report.error); await shot('fieldcamp-motion-failure.png').catch(() => {}); process.exitCode = 1; }
finally { report.finished = new Date().toISOString(); fs.writeFileSync(path.resolve('../notes/fieldcamp-motion-results.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
console.log(`动作验收：${report.passed ? '通过' : '失败'}，${report.checks.length} 项完成。`);

