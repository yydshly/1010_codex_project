/** 只通过真实按钮、键盘与鼠标打完整一局；只读状态用于验收。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { battleModule } from './battle-module.mjs';
const { COVERS, segmentBox } = battleModule;
const mobileOnly = process.argv.includes('--mobile-only');
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
async function check(name, fn) { if (mobileOnly && !name.includes('生产入口') && !name.includes('390px')) return; console.log('检查：' + name); const detail = await fn(); assert.deepEqual(report.errors, []); assert.deepEqual(report.failures, []); report.checks.push({ name, passed: true, detail }); console.log('通过：' + name); }
try {
  await check('生产入口构建6辆机械车辆、10名持枪步兵与2架空袭飞机', async () => {
    await page.goto(new URL('battle.html', base).href, { waitUntil: 'load', timeout: 120000 }); await page.bringToFront();
    await page.waitForFunction(() => window.__battleReady && window.__battle.getState().render.triangles > 100000, { polling: 200, timeout: 300000 });
    const s = await state(); assert.equal(s.status, 'ready'); assert.equal(s.models.length, 6); assert.equal(s.soldierModels.length, 10); assert.equal(s.aircraftModels.length, 2);
    assert.ok(s.models.slice(0, 5).every(m => m.joints.turrets.length === 1 && m.joints.wheels.length >= 14)); assert.equal(s.models[5].joints.wheels.length, 4);
    await shot('battle-combined-ready.png'); await page.click('#start'); await wait(700); assert.equal((await state()).status, 'running'); return { render: s.render, vehicles: s.units, soldiers: s.infantry };
  });
  await check('步兵真的交火、移动、推进步态；弹道命中扣血，有枪声和脚步', async () => {
    await wait(1600); const s = await state(); assert.ok(s.history.some(e => e.kind === 'rifle' && e.unit >= 100)); assert.ok(s.history.some(e => e.kind === 'hit' && e.target >= 100));
    assert.ok(s.infantry.some(u => u.distance > 0.2)); assert.ok(s.soldierModels.some(v => v.phase > Math.PI && v.stride > 0)); assert.ok(s.audio.effects > 0); assert.ok(s.audio.footsteps > 0);
    await shot('battle-infantry-combat.png'); return { infantry: s.infantry, audio: s.audio, hits: s.history.filter(e => e.kind === 'hit' && e.target >= 100) };
  });
  await check('1/2/3接管独立车辆，M18与吉普可实际驾驶，切回保留血量/坐标/装填', async () => {
    await page.keyboard.press('2'); let s = await state(); assert.equal(s.selectedId, 4); assert.equal(await page.$eval('#vehicle-name', e => e.textContent), 'M18 · 地狱猫');
    const a = s.units[4]; await page.keyboard.down('w'); await page.waitForFunction(d => window.__battle.getState().units[4].distance > d + 1, { polling: 100, timeout: 12000 }, a.distance); await page.keyboard.up('w'); s = await state(); assert.ok(s.units[4].distance > a.distance + 0.7);
    await page.keyboard.press('3'); await wait(200); s = await state(); assert.equal(s.selectedId, 5); const j = s.units[5];
    await page.keyboard.down('w'); await page.waitForFunction(d => window.__battle.getState().units[5].distance > d + 1, { polling: 100, timeout: 12000 }, j.distance); await page.keyboard.up('w'); const moved = await state(); assert.ok(moved.units[5].distance > j.distance + 0.8);
    assert.notDeepEqual(s.models[5].joints.wheels[0].quaternion, moved.models[5].joints.wheels[0].quaternion);
    const count = moved.history.filter(e => e.kind === 'shot' && e.unit === 5).length; await page.keyboard.down('Space'); await wait(300); await page.keyboard.up('Space'); assert.equal((await state()).history.filter(e => e.kind === 'shot' && e.unit === 5).length, count);
    await shot('battle-jeep-driving.png'); await page.keyboard.press('1'); assert.equal((await state()).selectedId, 0); return { hellcat: a, jeep: moved.units[5] };
  });
  await check('F呼叫P-51：目标预警、真实飞行/螺旋桨/收起起落架、3枚落弹与空袭伤害', async () => {
    await page.click('#restart'); await page.click('#start'); await page.keyboard.press('c'); await wait(1800);
    const s = await state(), target = s.units[3], point = await page.evaluate(u => window.__battle.project(u.x, u.z), target); await page.mouse.move(point.x, point.y); await wait(200); await page.keyboard.press('f');
    let called = await state(); assert.equal(called.airstrikes.length, 1); assert.ok(called.airCooldown > 23); assert.ok(await page.$eval('#airstrike', e => e.disabled));
    await page.keyboard.press('f'); assert.equal((await state()).airstrikes.length, 1);
    await page.waitForFunction(() => window.__battle.getState().bombs.length >= 2, { polling: 80, timeout: 18000 });
    await page.waitForFunction(() => window.__battle.getState().airstrikes.some(r => r.team === 'blue' && r.age >= 4.6), { polling: 80, timeout: 16000 });
    const flying = await state(); assert.ok(flying.aircraftModels[0].active); assert.ok(flying.aircraftModels[0].phase > 0); assert.ok(flying.aircraftModels[0].joints.gear.filter(g => g.kind.includes('gear')).every(g => !g.visible));
    assert.ok(flying.bombs.some(b => b.y > 2)); await shot('battle-airstrike-flight.png');
    await page.keyboard.press('p'); await wait(200); const a = await state(); await wait(650); const b = await state();
    assert.equal(b.status, 'paused'); for (const key of ['time', 'units', 'infantry', 'airstrikes', 'bombs', 'airCooldown', 'models', 'soldierModels', 'aircraftModels']) assert.deepEqual(b[key], a[key], key);
    assert.equal(b.audio.context, 'suspended'); assert.equal(b.audio.currentTime, a.audio.currentTime); assert.equal(b.audio.gain, 0); assert.ok(b.audio.rms < 0.00001);
    await shot('battle-combined-paused.png'); await page.click('#start');
    await page.waitForFunction(() => window.__battle.getState().history.filter(e => e.kind === 'bomb').length === 3, { polling: 80, timeout: 16000 }); const impact = await state();
    assert.ok(impact.history.some(e => e.kind === 'hit' && e.unit === -1 && e.target > 0)); await shot('battle-airstrike-impact.png');
    return { target, flying: { bombs: flying.bombs, planes: flying.aircraftModels }, pausedAudio: b.audio, impact: impact.history.filter(e => e.unit === -1), cooldown: impact.airCooldown };
  });
  await check('红队自动空袭有提前预警并实际落弹；声音随暂停冻结/恢复', async () => {
    await page.click('#restart'); await page.select('#difficulty', 'casual'); await page.click('#start');
    await page.waitForFunction(() => window.__battle.getState().airstrikes.some(r => r.team === 'red' && r.age < 4), { polling: 150, timeout: 90000 });
    assert.equal(await page.$eval('#raid-alert', e => e.hidden), false); const warned = await state(); await shot('battle-enemy-air-raid.png');
    await page.waitForFunction(() => window.__battle.getState().history.filter(e => e.kind === 'bomb').length >= 3, { polling: 100, timeout: 20000 });
    let s = await state(); assert.ok(s.history.some(e => e.kind === 'hit' && e.unit === -1 && [0, 4, 5].includes(e.target)));
    await page.keyboard.press('p'); await wait(150); assert.equal((await state()).audio.gain, 0); await page.click('#start'); await wait(300); assert.ok((await state()).audio.rms > 0.00001);
    return { warning: warned.airstrikes, enemyAirHits: s.history.filter(e => e.kind === 'hit' && e.unit === -1 && e.target < 6) };
  });
  await check('实际鼠标主炮射击配合空袭，完成红队装甲+步兵全歼胜利', async () => {
    await page.click('#restart'); await page.select('#difficulty', 'casual'); await page.click('#start'); await page.keyboard.press('c'); await wait(2000); await page.keyboard.down('Space');
    const begin = Date.now(); let captured = false, selected = 0;
    while (Date.now() - begin < 110000) {
      const s = await state(); if (s.status !== 'running') break; if (s.selectedId !== selected) { selected = s.selectedId; await page.keyboard.up('Space'); await page.keyboard.down('Space'); }
      const p = s.units.find(u => u.id === s.selectedId), candidates = [...s.units.filter(u => u.team === 'red'), ...s.infantry.filter(u => u.team === 'red')].filter(u => u.hp > 0 && !COVERS.some(c => segmentBox(p, u, c) !== null));
      const target = candidates.sort((a,b) => a.id - b.id)[0];
      if (target) {
        const flight = Math.hypot(target.x - p.x, target.z - p.z) / 65;
        const aim = { x: target.x + Math.sin(target.heading) * target.speed * flight, z: target.z + Math.cos(target.heading) * target.speed * flight };
        const at = await page.evaluate(({ x, z }) => window.__battle.project(x, z), aim); await page.mouse.move(at.x, at.y);
        if (s.airCooldown <= 0) await page.keyboard.press('f');
      }
      if (!captured && s.kills > 0) { await shot('battle-combined-combat.png'); captured = true; }
      await wait(150);
    }
    await page.keyboard.up('Space'); const s = await state(); assert.equal(s.status, 'won', JSON.stringify(s.units)); assert.equal(s.kills, 3); assert.equal(s.infantryKills, 6); assert.ok(s.history.some(e => e.kind === 'shot' && e.unit === 0)); assert.ok(s.history.some(e => e.kind === 'hit' && e.unit === 0));
    assert.equal(await page.$eval('#dialog-title', e => e.textContent), '演习胜利'); await shot('battle-combined-victory.png'); return { time: s.time, kills: s.kills, infantryKills: s.infantryKills, vehicles: s.units, audio: s.audio };
  });
  await check('重开恢复三车十步兵/清空空袭；390px触控切车、驾驶和空袭可用', async () => {
    if (['won', 'lost'].includes((await state()).status)) await page.click('#dialog-restart'); else await page.click('#restart'); const clean = await state(); assert.equal(clean.time, 0); assert.equal(clean.kills, 0); assert.equal(clean.infantryKills, 0); assert.equal(clean.bombs.length, 0); assert.equal(clean.airCooldown, 0); assert.equal(clean.units[0].hp, 220);
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 }); await wait(300); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390); await shot('battle-combined-mobile-ready.png');
    await page.click('#start'); await page.click('[data-vehicle="5"]'); assert.equal((await state()).selectedId, 5);
    const focused = await state(), projected = await page.evaluate(u => window.__battle.project(u.x, u.z), focused.units[5]); assert.ok(projected.x > 150 && projected.x < 240);
    const layout = await page.evaluate(() => { const rect = k => { const r = document.querySelector(`[data-key="${k}"]`).getBoundingClientRect(); return { x: r.x, y: r.y }; }; return { w: rect('KeyW'), a: rect('KeyA'), s: rect('KeyS'), d: rect('KeyD'), panelWidth: document.querySelector('.status-panel').getBoundingClientRect().width }; });
    assert.ok(layout.panelWidth > 350 && layout.w.y < layout.a.y && layout.a.x < layout.s.x && layout.s.x < layout.d.x);
    const button = await page.$eval('[data-key="KeyW"]', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const a = await state(); await page.mouse.move(button.x, button.y); await page.mouse.down(); await page.waitForFunction(d => window.__battle.getState().units[5].distance > d + 0.8, { polling: 100, timeout: 12000 }, a.units[5].distance); await page.mouse.up(); const b = await state(); assert.ok(b.units[5].distance > a.units[5].distance + 0.5);
    const aim = await page.evaluate(u => window.__battle.project(u.x + 3, u.z + 3), b.units[5]); await page.mouse.click(aim.x, aim.y); await wait(100);
    await page.click('#airstrike'); assert.equal((await state()).airstrikes.length, 1); await shot('battle-combined-mobile.png');
    const other = await browser.newPage(); await other.goto('about:blank'); await other.bringToFront(); await wait(250); assert.equal((await state()).status, 'paused'); assert.equal((await state()).audio.gain, 0); await other.close(); await page.bringToFront();
    return { reset: { vehicles: clean.units.length, infantry: clean.infantry.length }, mobile: [390, 844], distance: b.units[5].distance };
  });
  report.passed = true; report.scope = mobileOnly ? '入口与窄屏回归' : '完整协同战局';
} catch (e) { report.failedState = await state().catch(() => null); report.failure = String(e.stack ?? e); console.error(report.failure); fs.mkdirSync('.snaps', { recursive: true }); fs.writeFileSync('.snaps/combined-failure.png', await page.screenshot()); process.exitCode = 1; }
finally { report.finished = new Date().toISOString(); fs.writeFileSync(path.resolve(mobileOnly ? '../notes/combined-arms-mobile-results.json' : '../notes/combined-arms-browser-results.json'), JSON.stringify(report, null, 2)); await browser.close(); }
