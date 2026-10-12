#!/usr/bin/env node
/**
 * Headless screenshots for model review and UI QA (uses the locally installed Edge/Chrome;
 * nothing is downloaded). Requires the dev server: `npm run dev` (port 5199).
 *
 * Model contact sheet (harness):
 *   node scripts/snap.mjs germany/kar98k [--config '{"x":"y"}'] [--views q-front,left,top]
 *        [--ground studio|plinth|none] [--ref] [--w 1800 --h 1200] [--cols 3] [--detail low]
 *        [--yaw 30 --pitch 10 --dist 2.5 --target 0,1.5,0 | --fit 0.5] [--out path.png]
 *
 * App screenshot:
 *   node scripts/snap.mjs --app [--w 1600 --h 1000] [--wait 4000]
 *        [--eval "js run in page before capture (awaited)"] [--out path.png]
 *
 * Prints the PNG path and a JSON stats line. PNGs default to .snaps/.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const next = args[i + 1];
    if (next === undefined || next.startsWith('--')) flags[k] = true;
    else { flags[k] = next; i++; }
  } else positional.push(a);
}

const BASE = flags.base ?? 'http://localhost:5199';
const candidates = [
  process.env.BROWSER_PATH,
  path.join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  path.join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean);
const executablePath = candidates.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error('No Edge/Chrome executable found. Set BROWSER_PATH.');
  process.exit(2);
}

const snapsDir = path.resolve('.snaps');
fs.mkdirSync(snapsDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

async function run() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-profile-'));
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    userDataDir,
    args: [
      '--use-angle=d3d11',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--disable-extensions',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
    ],
    defaultViewport: { width: Number(flags.w ?? 1600), height: Number(flags.h ?? 1000), deviceScaleFactor: 1 },
    protocolTimeout: 300000,
  });
  const logs = [];
  try {
    const page = await browser.newPage();
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') logs.push(`[${m.type()}] ${m.text()}`); });
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

    if (flags.app) {
      await page.goto(`${BASE}/archive.html`, { waitUntil: 'load', timeout: 120000 });
      await page.waitForFunction('window.__appReady === true', { timeout: Number(flags.timeout ?? 180000) }).catch(() => logs.push('[snap] __appReady not set before timeout'));
      if (flags.eval) {
        const res = await page.evaluate(async (code) => {
          // eslint-disable-next-line no-new-func
          const fn = new Function(`return (async () => { ${code} })()`);
          return await fn();
        }, String(flags.eval));
        if (res !== undefined) console.log('eval result:', JSON.stringify(res));
      }
      await new Promise((r) => setTimeout(r, Number(flags.wait ?? 1500)));
      const out = path.resolve(flags.out ?? path.join(snapsDir, `app-${stamp}.png`));
      await page.screenshot({ path: out });
      console.log(out);
    } else {
      const assetPath = positional[0];
      if (!assetPath) throw new Error('usage: snap.mjs <faction>/<asset> [flags]  |  snap.mjs --app');
      const q = new URLSearchParams({ asset: assetPath });
      for (const k of ['config', 'views', 'ground', 'w', 'h', 'cols', 'detail', 'yaw', 'pitch', 'dist', 'target', 'fit', 'ao']) {
        if (flags[k] !== undefined && flags[k] !== true) q.set(k, String(flags[k]));
      }
      if (flags.ref) q.set('ref', '1');
      await page.goto(`${BASE}/harness.html?${q}`, { waitUntil: 'load', timeout: 120000 });
      await page.waitForFunction('window.__ready === true', { timeout: Number(flags.timeout ?? 240000) });
      const res = await page.evaluate(() => ({ png: window.__png, stats: window.__stats, error: window.__error }));
      if (res.error) {
        console.error('HARNESS ERROR:\n' + res.error);
        process.exitCode = 1;
      }
      if (res.png) {
        const out = path.resolve(flags.out ?? path.join(snapsDir, `${assetPath.replace(/[\\/]/g, '_')}-${stamp}.png`));
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, Buffer.from(res.png.split(',')[1], 'base64'));
        console.log(out);
      }
      if (res.stats) console.log('stats:', JSON.stringify(res.stats));
    }
  } finally {
    if (logs.length) console.log('browser log:\n' + logs.slice(0, 40).join('\n'));
    await browser.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

run().catch((e) => {
  console.error(e?.stack ?? String(e));
  process.exit(1);
});
