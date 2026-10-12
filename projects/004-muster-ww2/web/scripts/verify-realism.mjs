/** 通过实际 UI 驱动动作；读取关节矩阵与真实 Web Audio 采样做证据。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:5198/';
const executablePath = [process.env.BROWSER_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(fs.existsSync);
const report = { date: new Date().toISOString(), base, checks: [], errors: [], warnings: [], failures: [], screenshots: [], passed: false };
const browser = await puppeteer.launch({ executablePath, headless: true, defaultViewport: { width: 1800, height: 1100, deviceScaleFactor: 1 },
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--no-first-run', '--hide-scrollbars'], protocolTimeout: 300000 });
const page = await browser.newPage(); report.browser = await browser.version();
// 只在独立验收页面截获音频上下文，录下应用实际输出，产品不增加调试开关。
await page.evaluateOnNewDocument(() => {
  const createGain = AudioContext.prototype.createGain;
  AudioContext.prototype.createGain = function () {
    const node = createGain.call(this); window.__audioEvidence ??= { context: this, master: node }; return node;
  };
});
page.on('pageerror', e => report.errors.push(e.message));
page.on('console', m => { const list = m.type() === 'error' ? report.errors : m.type() === 'warn' ? report.warnings : null; if (list && !list.includes(m.text())) list.push(m.text()); });
page.on('requestfailed', r => report.failures.push(r.url() + ' ' + r.failure()?.errorText));
page.on('response', r => { if (r.status() >= 400) report.failures.push(r.status() + ' ' + r.url()); });
const pause = ms => new Promise(r => setTimeout(r, ms));
const state = () => page.evaluate(() => window.__camp.getState());
const plane = s => s.motion.actors.find(a => a.kind === 'aircraft');
async function seek(time) { await page.$eval('#motion-seek', (e, t) => { e.value = String(t); e.dispatchEvent(new Event('input', { bubbles: true })); }, time); await pause(250); return state(); }
async function shot(name) { fs.writeFileSync(path.resolve('../assets/' + name), await page.screenshot()); report.screenshots.push(name); }
async function check(name, fn) { console.log('检查：' + name); const detail = await fn(); assert.deepEqual(report.errors, []); assert.deepEqual(report.failures, []); report.checks.push({ name, passed: true, detail }); console.log('通过：' + name); }
async function zoom() { const r = await page.$eval('.scene-canvas', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width * 0.68, y: r.y + r.height * 0.6 }; }); await page.mouse.move(r.x, r.y); await page.mouse.wheel({ deltaY: -450 }); await pause(800); }
let original;
try {
  await check('启动真实部件动画：车轮角度与逐节履带矩阵实际改变', async () => {
    await page.goto(new URL('camp.html', base).href, { waitUntil: 'load', timeout: 120000 }); await page.bringToFront();
    await page.waitForFunction(() => window.__campReady, { polling: 200, timeout: 300000 }); original = await state();
    assert.equal(original.counts.models, 26); await page.click('#motion-play');
    await page.waitForFunction(() => window.__camp.getState().motion.playing && !window.__camp.getState().motion.preparing, { polling: 200, timeout: 120000 });
    const a = await state(); await pause(850); const b = await state();
    for (const kind of ['jeep', 'armor']) {
      const x = a.motion.actors.find(i => i.kind === kind), y = b.motion.actors.find(i => i.kind === kind);
      assert.ok(y.joints.wheels.length >= 4); assert.notDeepEqual(x.joints.wheels[0].quaternion, y.joints.wheels[0].quaternion);
      assert.ok(y.joints.wheels[0].angle > x.joints.wheels[0].angle);
      if (kind === 'armor') {
        assert.ok(y.joints.tracks.length >= 4); assert.notDeepEqual(x.joints.tracks[0].matrix0, y.joints.tracks[0].matrix0);
        for (const t of y.joints.tracks) {
          const m = t.matrix0, determinant = m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
          assert.ok(Math.abs(determinant - 1) < 0.00001, '履带局部变换必须保持右手坐标，避免表面朝内');
        }
      }
    }
    return { actors: b.motion.actors.filter(a => a.joints).map(a => ({ assetId: a.assetId, wheels: a.joints.wheels.length, tracks: a.joints.tracks.map(t => t.count) })), audio: b.motion.audio, render: b.render };
  });
  await check('起落架支柱折叠、舱门合拢、进场前展开；停机飞机保持展开', async () => {
    await page.click('#motion-follow'); const down = await seek(25);
    assert.equal(plane(down).gearRetraction, 0); assert.equal(plane(down).joints.gear.filter(g => g.kind.includes('gear') && g.visible).length, 3);
    const retracting = await seek(29.5); assert.ok(plane(retracting).gearRetraction > 0 && plane(retracting).gearRetraction < 1);
    assert.ok(plane(retracting).joints.gear.filter(g => g.kind === 'gear').every(g => Math.abs(g.angle) > 0.5));
    await zoom(); await shot('fieldcamp-realism-gear-folding.png');
    const up = await seek(38); assert.equal(plane(up).gearRetraction, 1); assert.ok(plane(up).joints.gear.filter(g => g.kind.includes('gear')).every(g => !g.visible));
    await zoom(); await shot('fieldcamp-realism-gear-up.png');
    const deploying = await seek(53); assert.equal(plane(deploying).gearRetraction, 0.5);
    const approach = await seek(57); assert.equal(plane(approach).gearRetraction, 0); assert.ok(plane(approach).joints.gear.filter(g => g.kind.includes('gear')).every(g => g.visible));
    assert.equal(approach.motion.actors.filter(a => a.kind === 'aircraft')[1].gearRetraction, 0);
    await zoom(); await shot('fieldcamp-realism-gear-down.png');
    return { folding: plane(retracting).joints.gear, stowed: plane(up).joints.gear, deployed: plane(approach).joints.gear };
  });
  await check('脚掌支撑与抬脚、膝盖弯曲；脚步事件随巡逻播放', async () => {
    await page.click('[data-zone="squad"]'); await pause(700);
    const a = await seek(20.1), b = await seek(20.2), c = await seek(20.8);
    const footA = a.motion.actors.find(a => a.kind === 'patrol').feet[0], footB = b.motion.actors.find(a => a.kind === 'patrol').feet[0];
    const speed = (b.motion.actors.find(a => a.kind === 'patrol').distance - a.motion.actors.find(a => a.kind === 'patrol').distance) / 0.1;
    assert.ok(footA.stance && footB.stance); assert.ok(Math.abs(footB.z - footA.z + speed * 0.1) < 0.001);
    assert.equal(footA.lift, 0); assert.ok(c.motion.actors.find(a => a.kind === 'patrol').feet[0].lift > 0.09);
    await zoom(); await shot('fieldcamp-realism-patrol.png');
    await page.click('#motion-play'); await pause(700); const before = await state(); await pause(1100); const after = await state();
    assert.ok(after.motion.audio.footsteps > before.motion.audio.footsteps); assert.equal(after.motion.audio.engines, 7); assert.ok(after.motion.audio.rms > 0.00001);
    return { support: [footA, footB], swing: c.motion.actors.find(a => a.kind === 'patrol').feet[0], footsteps: [before.motion.audio.footsteps, after.motion.audio.footsteps], audio: after.motion.audio };
  });
  await check('暂停同时静音并冻结音频时钟；继续、静音开关与音量有效', async () => {
    await page.click('#motion-play'); await pause(200); const a = await state(); await pause(700); const b = await state();
    assert.equal(a.motion.time, b.motion.time); assert.deepEqual(a.motion.actors, b.motion.actors);
    assert.equal(b.motion.audio.context, 'suspended'); assert.equal(a.motion.audio.currentTime, b.motion.audio.currentTime); assert.equal(b.motion.audio.gain, 0); assert.ok(b.motion.audio.rms < 0.00001); assert.equal(b.motion.audio.activeSteps, 0);
    await page.click('#motion-play'); await pause(700); const resumed = await state(); assert.equal(resumed.motion.audio.context, 'running'); assert.ok(resumed.motion.audio.rms > 0.00001);
    await page.click('#motion-sound'); await pause(200); const muted = await state(); assert.equal(muted.motion.audio.enabled, false); assert.equal(muted.motion.audio.gain, 0); assert.equal(muted.motion.playing, true);
    await page.click('#motion-sound'); await page.$eval('#motion-volume', e => { e.value = '60'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await pause(500);
    const audible = await state(); assert.equal(audible.motion.audio.volume, 0.6); assert.ok(Math.abs(audible.motion.audio.gain - 0.6) < 0.000001); assert.ok(audible.motion.audio.rms > 0.00001);
    return { paused: b.motion.audio, resumed: resumed.motion.audio, muted: muted.motion.audio, volume: audible.motion.audio };
  });
  await check('录下实际输出的发动机与脚步声；时间轴暂停后无旧脚步突发', async () => {
    const recording = await page.evaluate(async () => {
      const { context, master } = window.__audioEvidence;
      const code = `class Recorder extends AudioWorkletProcessor { process(inputs) { if (inputs[0]?.[0]) this.port.postMessage(Array.from(inputs[0][0])); return true; } } registerProcessor('camp-evidence', Recorder);`;
      const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' })); await context.audioWorklet.addModule(url); URL.revokeObjectURL(url);
      const recorder = new AudioWorkletNode(context, 'camp-evidence'), chunks = []; recorder.port.onmessage = e => chunks.push(e.data);
      master.connect(recorder); recorder.connect(context.destination);
      await new Promise(r => setTimeout(r, 2800)); master.disconnect(recorder); recorder.disconnect();
      return { rate: context.sampleRate, samples: chunks.flat() };
    });
    assert.ok(recording.samples.length > recording.rate * 2);
    const pcm = Buffer.alloc(44 + recording.samples.length * 2); pcm.write('RIFF', 0); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(recording.rate, 24); pcm.writeUInt32LE(recording.rate * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(recording.samples.length * 2, 40);
    recording.samples.forEach((v, i) => pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
    fs.writeFileSync(path.resolve('../assets/fieldcamp-realism-audio.wav'), pcm);
    await seek(50); const n = (await state()).motion.audio.footsteps; await page.click('#motion-play'); await pause(250); assert.ok((await state()).motion.audio.footsteps - n <= 24);
    await page.click('#motion-play'); await page.click('[data-zone="armor"]'); await pause(600); await seek(20.3); await zoom(); await shot('fieldcamp-realism-convoy.png');
    return { recording: 'assets/fieldcamp-realism-audio.wav', seconds: recording.samples.length / recording.rate, rate: recording.rate, peak: recording.samples.reduce((peak, v) => Math.max(peak, Math.abs(v)), 0) };
  });
  await check('切换后台标签页自动暂停画面与声音，返回后手动继续', async () => {
    await page.click('#motion-play'); await pause(300);
    const background = await browser.newPage(); await background.goto('about:blank'); await background.bringToFront();
    await page.waitForFunction(() => document.hidden, { polling: 200, timeout: 10000 }); await pause(150);
    const a = await state(); await pause(350); const b = await state();
    assert.equal(b.motion.playing, false); assert.equal(a.motion.time, b.motion.time); assert.equal(b.motion.audio.context, 'suspended'); assert.equal(a.motion.audio.currentTime, b.motion.audio.currentTime);
    await page.bringToFront(); await background.close(); await pause(200); assert.equal((await state()).motion.playing, false);
    await page.click('#motion-play'); await pause(350); assert.equal((await state()).motion.audio.context, 'running'); await page.click('#motion-play');
    return { pausedAt: b.motion.time, audio: b.motion.audio, resumed: true };
  });
  await check('退出恢复保存布局与模型；窄屏声音控制和重新进入', async () => {
    await page.click('#motion-exit'); await pause(400); const restored = await state(); assert.deepEqual(restored.groups, original.groups); assert.deepEqual(restored.poses, original.poses); assert.equal(restored.motion.audio.engines, 0); assert.equal(restored.motion.audio.context, 'suspended');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 }); await pause(500); await page.click('#motion-play');
    await page.waitForFunction(() => window.__camp.getState().motion.playing && !window.__camp.getState().motion.preparing, { polling: 200, timeout: 120000 }); await seek(32); await shot('fieldcamp-realism-mobile.png');
    const bounds = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, items: [...document.querySelectorAll('.sound-controls > *')].map(e => ({ left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right })) }));
    assert.equal(bounds.width, bounds.scrollWidth); assert.ok(bounds.items.every(i => i.left >= 0 && i.right <= bounds.width));
    assert.ok(plane(await state()).joints.gear.every(g => g.kind.includes('door') || !g.visible)); return bounds;
  });
  report.passed = true;
} catch (error) { report.error = error.stack ?? String(error); console.error(report.error); await shot('fieldcamp-realism-failure.png').catch(() => {}); process.exitCode = 1; }
finally { report.finished = new Date().toISOString(); fs.writeFileSync(path.resolve(process.argv.includes('--report') ? process.argv[process.argv.indexOf('--report') + 1] : '../notes/fieldcamp-realism-results.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
console.log(`真实感验收：${report.passed ? '通过' : '失败'}，${report.checks.length} 项完成。`);

