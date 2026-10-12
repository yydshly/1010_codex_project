/** 只通过真实按钮、键盘与鼠标打完整一局；只读状态用于验收。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/battle/game.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { COVERS, segmentBox } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const base = process.env.BASE_URL ?? 'http://127.0.0.1:5198/';
const report = { date: new Date().toISOString(), base, checks: [], errors: [], warnings: [], failures: [], screenshots: [], passed: false };
const browser = await puppeteer.launch({ executablePath: process.env.BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true,
  defaultViewport: { width: 1800, height: 1100, deviceScaleFactor: 1 }, protocolTimeout: 300000,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--no-first-run', '--hide-scrollbars'] });
const page = await browser.newPage(); report.browser = await browser.version();
page.on('pageerror', e => report.errors.push(e.message));
page.on('console', m => { const out = m.type() === 'error' ? report.errors : m.type() === 'warn' ? report.warnings : null; if (out && !out.includes(m.text())) out.push(m.text()); });
page.on('requestfailed', r => report.failures.push(r.url() + ' ' + r.failure()?.errorText));
page.on('response', r => { if (r.status() >= 400) report.failures.push(r.status() + ' ' + r.url()); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const state = () => page.evaluate(() => window.__battle.getState());
async function shot(name) { fs.writeFileSync(path.resolve('../assets/' + name), await page.screenshot()); report.screenshots.push(name); }
async function check(name, fn) { console.log('检查：' + name); const detail = await fn(); assert.deepEqual(report.errors, []); assert.deepEqual(report.failures, []); report.checks.push({ name, passed: true, detail }); console.log('通过：' + name); }
try {
  await check('生产入口实际构建4辆机械装甲车与停机飞机；首次进入可开始演习', async () => {
    await page.goto(new URL('battle.html', base).href, { waitUntil: 'load', timeout: 120000 }); await page.bringToFront();
    await page.waitForFunction(() => window.__battleReady && window.__battle.getState().render.triangles > 100000, { polling: 200, timeout: 300000 }); const s = await state();
    assert.equal(s.status, 'ready'); assert.equal(s.units.length, 4); assert.equal(s.models.length, 4); assert.ok(s.render.triangles > 100000);
    assert.ok(s.models.every(m => m.joints.turrets.length === 1 && m.joints.wheels.length >= 14 && m.joints.tracks.length >= 4));
    await shot('battle-ready.png'); await page.click('#start'); await wait(500); assert.equal((await state()).status, 'running');
    return { render: s.render, tanks: s.models.map(m => ({ wheels: m.joints.wheels.length, tracks: m.joints.tracks.map(t => t.count), turrets: m.joints.turrets.length })) };
  });
  await check('键盘驾驶与转向改变真实模型、轮角和履带；电脑主动运动', async () => {
    const a = await state(); await page.keyboard.down('w'); await wait(1100); await page.keyboard.up('w'); await page.keyboard.down('a'); await wait(300); await page.keyboard.up('a'); const b = await state();
    assert.ok(b.units[0].x > a.units[0].x + 2); assert.ok(b.units[0].heading > a.units[0].heading + 0.2);
    assert.notDeepEqual(a.models[0].joints.wheels[0].quaternion, b.models[0].joints.wheels[0].quaternion); assert.notDeepEqual(a.models[0].joints.tracks[0].matrix0, b.models[0].joints.tracks[0].matrix0);
    assert.notDeepEqual(a.units[1].x, b.units[1].x); assert.deepEqual(b.models[0].position, [b.units[0].x, 0, b.units[0].z]);
    await shot('battle-driving.png'); return { player: b.units[0], enemy: b.units[1], audio: b.audio };
  });
  await check('暂停同时冻结弹丸、车轮、AI、装填与音频时钟；继续和静音有效', async () => {
    await page.keyboard.press('p'); await wait(200); const a = await state(); await wait(700); const b = await state();
    assert.equal(b.status, 'paused'); assert.equal(a.time, b.time); assert.deepEqual(a.units, b.units); assert.deepEqual(a.shells, b.shells); assert.deepEqual(a.models, b.models);
    assert.equal(b.audio.context, 'suspended'); assert.equal(a.audio.currentTime, b.audio.currentTime); assert.equal(b.audio.gain, 0); assert.ok(b.audio.rms < 0.00001);
    await shot('battle-paused.png'); await page.click('#start'); await wait(500); const playing = await state(); assert.equal(playing.status, 'running'); assert.ok(playing.audio.rms > 0.00001);
    await page.click('#sound'); await wait(150); assert.equal((await state()).audio.gain, 0); assert.equal((await state()).status, 'running');
    await page.click('#sound'); await page.$eval('#volume', e => { e.value = '55'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await wait(200); assert.ok(Math.abs((await state()).audio.gain - 0.55) < 0.000001);
    return { paused: b.audio, resumed: playing.audio };
  });
  await check('真实鼠标瞄准与连续开火：命中扣血、装填、击败全部红队并显示胜利', async () => {
    await page.click('#restart'); assert.equal((await state()).status, 'ready'); await page.click('#start'); await page.keyboard.press('c');
    await wait(6500); await page.keyboard.down('Space');
    const begin = Date.now(); let captured = false, progress = 0;
    while (Date.now() - begin < 65000) {
      const s = await state(); if (s.status !== 'running') break;
      if (Date.now() - begin > progress + 5000) { progress = Date.now() - begin; console.log(`交战：${s.time.toFixed(1)} 秒，玩家 ${s.units[0].hp}，红队 ${s.units.slice(1).map(u => u.hp).join('/')}，弹丸 ${s.shells.length}`); }
      const p = s.units[0], candidates = s.units.filter(u => u.id && u.hp > 0 && !COVERS.some(c => segmentBox(p, u, c) !== null));
      const target = candidates.sort((a, b) => a.id - b.id)[0];
      if (target) {
        const flight = Math.hypot(target.x - p.x, target.z - p.z) / 65;
        const aim = { x: target.x + Math.sin(target.heading) * target.speed * flight, z: target.z + Math.cos(target.heading) * target.speed * flight };
        const at = await page.evaluate(({ x, z }) => window.__battle.project(x, z), aim); await page.mouse.move(at.x, at.y);
      }
      if (!captured && s.history.some(e => e.kind === 'hit' && e.target > 0) && s.history.some(e => e.kind === 'shot' && e.unit > 0)) { await shot('battle-combat.png'); captured = true; }
      await wait(130);
    }
    await page.keyboard.up('Space'); const s = await state();
    assert.equal(s.status, 'won', JSON.stringify({ units: s.units, history: s.history.slice(-20) })); assert.equal(s.kills, 3); assert.ok(s.history.filter(e => e.kind === 'hit' && e.target > 0).length >= 6);
    assert.ok(s.history.some(e => e.kind === 'shot' && e.unit > 0)); assert.ok(s.history.some(e => e.kind === 'hit' && e.target === 0)); assert.ok(s.audio.effects >= 10);
    assert.ok(s.models[0].joints.turrets[0].angle !== 0); assert.equal(await page.$eval('#dialog-title', e => e.textContent), '演习胜利'); await shot('battle-victory.png');
    return { time: s.time, kills: s.kills, playerHP: s.units[0].hp, history: s.history, audio: s.audio };
  });
  await check('重开恢复完整初始战况；标准模式真实电脑射击导致失败', async () => {
    await page.click('#dialog-restart'); const clean = await state(); assert.equal(clean.time, 0); assert.equal(clean.kills, 0); assert.equal(clean.units[0].hp, 220); assert.equal(clean.effects.bursts, 0); assert.equal(clean.history.length, 0);
    await page.select('#difficulty', 'standard'); await page.click('#start');
    await page.waitForFunction(() => window.__battle.getState().status === 'lost', { polling: 300, timeout: 90000 }); const s = await state(); assert.equal(s.units[0].hp, 0); assert.equal(await page.$eval('#dialog-title', e => e.textContent), '演习结束');
    await wait(150); assert.equal((await state()).audio.gain, 0); await shot('battle-defeat.png'); return { time: s.time, hits: s.history.filter(e => e.kind === 'hit' && e.target === 0).length };
  });
  await check('切换后台自动暂停；390px触控驾驶、瞄准与开火控件实际可用', async () => {
    await page.click('#dialog-restart'); await page.select('#difficulty', 'casual'); await page.click('#start'); await wait(200);
    const other = await browser.newPage(); await other.goto('about:blank'); await other.bringToFront(); await wait(250); const hidden = await state(); assert.equal(hidden.status, 'paused'); assert.equal(hidden.audio.gain, 0); await other.close(); await page.bringToFront();
    await page.click('#dialog-restart'); await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 }); await wait(300); await shot('battle-mobile-ready.png');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390); await page.click('#start');
    const button = await page.$eval('[data-key="KeyW"]', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const a = await state(); await page.mouse.move(button.x, button.y); await page.mouse.down(); await wait(600); await page.mouse.up(); const b = await state(); assert.ok(b.units[0].distance > a.units[0].distance + 0.5);
    const shots = b.history.filter(e => e.kind === 'shot' && !e.unit).length; const fire = await page.$eval('#touch-fire', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.move(fire.x, fire.y); await page.mouse.down(); await wait(500); await page.mouse.up(); assert.ok((await state()).history.filter(e => e.kind === 'shot' && !e.unit).length > shots);
    await shot('battle-mobile.png'); await page.click('#pause'); await wait(150); assert.equal((await state()).status, 'paused'); return { hidden: hidden.status, mobile: [390, 844], playerDistance: b.units[0].distance };
  });
  report.passed = true;
} catch (e) { report.failure = String(e.stack ?? e); console.error(report.failure); fs.mkdirSync('.snaps', { recursive: true }); fs.writeFileSync('.snaps/battle-failure.png', await page.screenshot()); process.exitCode = 1; }
finally { report.finished = new Date().toISOString(); fs.writeFileSync(path.resolve('../notes/battle-browser-results.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
