#!/usr/bin/env node
/**
 * Camera responsiveness check: drives REAL mouse gestures (left-drag orbit, right-drag pan,
 * wheel zoom) on the app's scene canvas in headless Chrome and reports the frame interval and
 * the number of scene renders per gesture. Requires the dev server (npm run dev, port 5199).
 *
 *   node scripts/camera-perf.mjs [--demo] [--dpr 1.5]
 *
 * Healthy result on the reference machine (RTX 4080): avg frame ~8-17 ms for every gesture and
 * roughly one render per frame while the camera moves. A regression seen once: duplicate
 * requestAnimationFrame callbacks in src/app/scene.ts frame() multiplied renders during damped
 * orbit/pan (avg frame > 100 ms) while zoom stayed smooth.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const DEMO = args.includes('--demo');
const dprArg = args.indexOf('--dpr');
const DPR = dprArg >= 0 ? Number(args[dprArg + 1]) : 1.5;
const executablePath = [
  process.env.BROWSER_PATH,
  path.join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean).find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('No Chrome executable found. Set BROWSER_PATH.');
  process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath, headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--no-first-run'],
  defaultViewport: { width: 1712, height: 1274, deviceScaleFactor: DPR }, protocolTimeout: 300000,
});
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:5199/', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction('window.__appReady === true', { timeout: 180000 });
  await page.evaluate(async (demo) => {
    if (demo) await window.__app.loadDemo(); else await window.__app.clear();
    await window.__app.whenIdle();
  }, DEMO);
  await sleep(1500);
  // start inside the canvas but away from the centre (empty-state hints may cover the centre)
  const box = await page.evaluate(() => {
    const r = window.__musterApp.scene.canvas.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const cx = box.x + box.w * 0.3, cy = box.y + box.h * 0.72;

  const start = () => page.evaluate(() => {
    const st = window.__musterApp.scene.studio;
    window.__perf = { t: [], on: true, renders: 0 };
    if (!st.__perfPatched) {
      st.__perfPatched = true;
      const render = st.render.bind(st);
      st.render = () => { window.__perf.renders++; return render(); };
    }
    const f = (t) => { if (!window.__perf.on) return; window.__perf.t.push(t); requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  const stop = (label) => page.evaluate((label) => {
    const p = window.__perf; p.on = false;
    const d = p.t.slice(1).map((x, i) => x - p.t[i]);
    const avg = d.reduce((s, x) => s + x, 0) / Math.max(1, d.length);
    return { gesture: label, frames: d.length, avgFrameMs: +avg.toFixed(1), maxFrameMs: +Math.max(0, ...d).toFixed(1),
      framesOver25ms: d.filter((x) => x > 25).length, renders: p.renders };
  }, label);

  const out = [];
  await start(); await page.mouse.move(cx, cy); await page.mouse.down({ button: 'left' });
  for (let i = 0; i < 120; i++) { await page.mouse.move(cx + i * 3, cy + Math.sin(i / 10) * 20); await sleep(10); }
  await page.mouse.up({ button: 'left' }); await sleep(800); out.push(await stop('orbit (left drag)'));
  await sleep(1000);
  await start(); await page.mouse.move(cx, cy); await page.mouse.down({ button: 'right' });
  for (let i = 0; i < 120; i++) { await page.mouse.move(cx - i * 3, cy + i); await sleep(10); }
  await page.mouse.up({ button: 'right' }); await sleep(800); out.push(await stop('pan (right drag)'));
  await sleep(1000);
  await start(); await page.mouse.move(cx, cy);
  for (let i = 0; i < 20; i++) { await page.mouse.wheel({ deltaY: i < 10 ? -100 : 100 }); await sleep(60); }
  await sleep(800); out.push(await stop('zoom (wheel)'));
  console.log(`scene: ${DEMO ? 'demo display' : 'empty display'}, devicePixelRatio ${DPR}`);
  console.table(out);
} finally {
  await browser.close();
}
