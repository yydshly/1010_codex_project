import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:5198/';
const report = { date: new Date().toISOString(), base, checks: [], errors: [], failures: [], screenshots: [], passed: false };
const browser = await puppeteer.launch({ executablePath: process.env.BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true,
  defaultViewport: { width: 1800, height: 1100, deviceScaleFactor: 1 }, protocolTimeout: 300000,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--no-first-run', '--hide-scrollbars'] });
const page = await browser.newPage();
page.on('pageerror', e => report.errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
page.on('requestfailed', r => report.failures.push(r.url())); page.on('response', r => { if (r.status() >= 400) report.failures.push(r.status() + ' ' + r.url()); });
const wait = ms => new Promise(r => setTimeout(r, ms)), state = () => page.evaluate(() => window.__battle.getState());
async function shot(name) { fs.writeFileSync(path.resolve('../assets/' + name), await page.screenshot()); report.screenshots.push(name); }
try {
  await page.goto(new URL('battle.html', base).href, { waitUntil: 'load', timeout: 120000 }); await page.bringToFront(); await page.waitForFunction(() => window.__battleReady, { polling: 200, timeout: 300000 });
  await page.click('#start');
  const at = await page.evaluate(() => window.__battle.project(-7, -3)); await page.mouse.move(at.x, at.y);
  await page.waitForFunction(() => { const s = window.__battle.getState(); return Math.abs(s.units[0].aim - Math.atan2(5, -13)) < 0.05; }, { polling: 100, timeout: 10000 });
  await page.keyboard.down('Space'); await wait(300); await page.keyboard.up('Space'); await wait(700); const blocked = await state();
  assert.ok(blocked.history.some(e => e.kind === 'blocked' && e.unit === 0)); assert.ok(blocked.units.slice(1).every(u => u.hp === 80)); await shot('battle-cover.png');
  report.checks.push({ name: '鼠标瞄准补给箱后实际开火，炮弹被掩体阻挡且未伤害对手', passed: true, detail: blocked.history }); console.log('通过：真实掩体挡弹');
  await page.click('#restart'); await page.click('#start'); await page.keyboard.down('w');
  await page.waitForFunction(() => window.__battle.getState().units[0].x >= 2, { polling: 100, timeout: 12000 }); await page.keyboard.up('w');
  await wait(900); const arrived = await state(); assert.ok(Math.hypot(arrived.units[0].x - 5, arrived.units[0].z - 6) < 5);
  await page.waitForFunction(() => window.__battle.getState().captured > 5, { polling: 200, timeout: 20000 }); await shot('battle-capture.png');
  await page.waitForFunction(() => window.__battle.getState().status !== 'running', { polling: 200, timeout: 60000 }); const won = await state();
  assert.equal(won.status, 'won'); assert.equal(won.captured, 20); assert.equal(won.kills, 0); assert.ok(won.units[0].hp > 0); assert.ok(won.history.some(e => e.kind === 'hit' && e.target === 0));
  assert.equal(await page.$eval('#dialog-title', e => e.textContent), '演习胜利'); await shot('battle-objective-victory.png');
  report.checks.push({ name: '实际驾驶进入通信区，在电脑射击下完成20秒占领，以0击杀获胜', passed: true, detail: { time: won.time, captured: won.captured, kills: won.kills, player: won.units[0], units: won.units, history: won.history } }); console.log('通过：占领路线完整获胜');
  assert.deepEqual(report.errors, []); assert.deepEqual(report.failures, []); report.passed = true;
} catch (e) { report.failure = String(e.stack ?? e); console.error(report.failure); fs.mkdirSync('.snaps', { recursive: true }); fs.writeFileSync('.snaps/battle-objective-failure.png', await page.screenshot()); process.exitCode = 1; }
finally { report.finished = new Date().toISOString(); fs.writeFileSync(path.resolve('../notes/battle-objective-results.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
