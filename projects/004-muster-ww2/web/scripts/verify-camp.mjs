/** 营地完整流程验收：所有修改通过真实控件或鼠标，__camp 仅用于读取证据。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import puppeteer from 'puppeteer-core';

const { values } = parseArgs({ options: {
  base: { type: 'string', default: 'http://127.0.0.1:5198/' },
  screenshots: { type: 'string', default: '../assets' },
  report: { type: 'string', default: '../notes/fieldcamp-results.json' },
} });
const executablePath = [process.env.BROWSER_PATH,
  path.join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean).find(p => fs.existsSync(p));
assert.ok(executablePath, '找不到 Edge / Chrome');
const shots = path.resolve(values.screenshots), reportPath = path.resolve(values.report);
const downloads = path.resolve('.snaps/fieldcamp-download');
fs.mkdirSync(shots, { recursive: true }); fs.mkdirSync(downloads, { recursive: true });
const report = { date: new Date().toISOString(), base: values.base, node: process.version,
  checks: [], errors: [], warnings: [], failures: [], screenshots: [], passed: false };
const browser = await puppeteer.launch({ executablePath, headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--no-first-run', '--hide-scrollbars'],
  defaultViewport: { width: 1800, height: 1100, deviceScaleFactor: 1 }, protocolTimeout: 300000 });
const page = await browser.newPage(); report.browser = await browser.version();
page.on('pageerror', e => report.errors.push(e.message));
page.on('console', m => { const list = m.type() === 'error' ? report.errors : m.type() === 'warn' ? report.warnings : null; if (list && !list.includes(m.text())) list.push(m.text()); });
page.on('requestfailed', r => report.failures.push(`${r.url()} ${r.failure()?.errorText}`));
page.on('response', r => { if (r.status() >= 400) report.failures.push(`${r.status()} ${r.url()}`); });
const pause = ms => new Promise(r => setTimeout(r, ms));
const state = () => page.evaluate(() => window.__camp.getState());
const group = async assetId => (await state()).groups.find(g => g.assetId === assetId);
const comparable = groups => groups.map(({ id, ...g }) => g);
async function waitScene() {
  await page.waitForFunction(() => { const s = window.__camp?.getState(); return s?.ready && !s.editing && !s.preparing && s.counts.models === s.groups.reduce((n, g) => n + g.instances.length, 0); }, { polling: 200, timeout: 180000 });
  await pause(1000);
}
async function shot(name) { await page.screenshot({ path: path.join(shots, name) }); report.screenshots.push(name); }
async function check(name, task) { console.log(`检查：${name}`); const detail = await task(); report.checks.push({ name, passed: true, detail }); console.log(`通过：${name}`); }
async function select(assetId) { const g = await group(assetId); assert.ok(g); await page.select('#group-list', g.id); return g; }
const sentinel = JSON.stringify({ v: 1, groups: [], marker: 'archive-layout-untouched' });
try {
  // 只为独立测试浏览器设置一次旧展柜存储，验证新场景没有覆盖它。
  const cdp = await page.createCDPSession();
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await check('真实场景：8 类素材、26 个实例、74 条目录', async () => {
    const response = await page.goto(new URL('camp.html', values.base).href, { waitUntil: 'load', timeout: 120000 }); assert.equal(response.status(), 200);
    await page.bringToFront();
    await page.evaluate(s => localStorage.setItem('muster.display.v3-grand-review', s), sentinel);
    await page.waitForFunction(() => window.__campReady === true, { polling: 200, timeout: 300000 }); await waitScene();
    const s = await state(); assert.equal(s.catalog, 74); assert.equal(s.groups.length, 8); assert.equal(s.counts.models, 26);
    assert.deepEqual(s.counts.total, { personnel: 17, vehicles: 5, artillery: 2, aircraft: 2, looseEquipment: 0 });
    assert.equal(s.models.length, 8); assert.deepEqual(s.issues, []); assert.ok(s.models.every(m => m.triangles > 100000));
    await shot('fieldcamp-overview.png'); return { counts: s.counts, modelStats: s.models };
  });
  await check('分区镜头：停机坪与 P-51D', async () => {
    await page.click('[data-zone="flight"]'); await pause(1100);
    const s = await state(); assert.equal(s.zone, 'flight'); assert.deepEqual(s.camera.target, [-18, 1.1, -8]);
    assert.equal(s.selection.groupId, (await group('us-p51d')).id);
    await shot('fieldcamp-flight.png'); return { camera: s.camera };
  });
  await check('谢尔曼挡板：控件改变配置并构建新几何', async () => {
    await page.click('[data-zone="armor"]'); await pause(1100);
    const before = (await state()).models.find(m => m.key.startsWith('us-m4a3-sherman|'));
    await page.click('[data-option="sandShields"]'); await waitScene();
    assert.equal((await group('us-m4a3-sherman')).config.sandShields, true);
    const after = (await state()).models.find(m => m.key.includes('sandShields=true'));
    assert.ok(after); assert.notEqual(before.triangles, after.triangles);
    await shot('fieldcamp-armor.png'); return { beforeTriangles: before.triangles, afterTriangles: after.triangles };
  });
  await check('炮班：炮架收拢配置实际生成', async () => {
    await page.click('[data-zone="battery"]'); await pause(1100);
    await page.select('[data-option="trails"]', 'closed'); await waitScene();
    assert.equal((await group('us-m2a1-howitzer')).config.trails, 'closed');
    const model = (await state()).models.find(m => m.key === 'us-m2a1-howitzer|trails=closed'); assert.ok(model);
    await shot('fieldcamp-battery.png'); return { config: (await group('us-m2a1-howitzer')).config, model };
  });
  await check('步兵：编队、数量、间距、撤销与重做', async () => {
    await page.click('[data-zone="squad"]'); await pause(1100);
    await page.select('#formation', 'line'); assert.equal((await group('us-rifleman')).formation, 'line');
    await page.click('#quantity'); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
    await page.keyboard.type('8'); await page.keyboard.press('Tab'); await waitScene();
    assert.equal((await group('us-rifleman')).quantity, 8); assert.equal((await state()).counts.models, 22);
    await page.click('#undo'); await waitScene(); assert.equal((await group('us-rifleman')).quantity, 12);
    await page.click('#redo'); await waitScene(); assert.equal((await group('us-rifleman')).quantity, 8);
    const before = (await group('us-rifleman')).spacing;
    await page.focus('#spacing'); await page.keyboard.press('ArrowRight'); await pause(300);
    assert.ok((await group('us-rifleman')).spacing > before);
    await page.click('#undo'); assert.equal((await group('us-rifleman')).spacing, before);
    await shot('fieldcamp-squad.png'); return { group: await group('us-rifleman') };
  });
  await check('鼠标拖动单个模型与 Q 旋转', async () => {
    const g = await select('us-willys-mb'); await page.click('#focus'); await pause(1300);
    const p = await page.evaluate(id => window.__camp.hitPoint(id, 0), g.id); assert.ok(p, '模型上应有真实命中点');
    assert.equal(await page.evaluate(({x,y}) => document.elementFromPoint(x,y)?.classList.contains('scene-canvas'), p), true);
    await page.mouse.click(p.x, p.y); assert.equal((await state()).selection.slot, 0);
    const before = await group('us-willys-mb');
    await page.mouse.move(p.x,p.y); await page.mouse.down(); await page.mouse.move(p.x+45,p.y-25,{steps:12}); await page.mouse.up(); await pause(600);
    assert.notDeepEqual((await group('us-willys-mb')).instances[0].offset, before.instances[0].offset);
    await page.keyboard.press('q'); await pause(300);
    assert.equal((await group('us-willys-mb')).instances[0].headingOffset, -15);
    return { group: await group('us-willys-mb') };
  });
  await check('光线、俯视、纯净画面与可暂停导览', async () => {
    await page.select('#light', 'warm'); assert.equal((await state()).light, 'warm');
    await page.click('#map'); await pause(1000); assert.ok((await state()).camera.pitch > 86);
    await page.click('#hide-ui'); assert.equal(await page.$eval('.stage', e => e.classList.contains('clean')), true);
    await page.click('#hide-ui'); await page.click('#tour'); assert.equal((await state()).touring, true);
    await page.click('#tour'); assert.equal((await state()).touring, false);
    await page.click('#overview'); await pause(1000); await shot('fieldcamp-evening.png'); return { camera: (await state()).camera, light: 'warm' };
  });
  await check('导出文件、恢复预设、撤销、导入原布局', async () => {
    await page.select('#light', 'day'); const before = await state();
    const file = path.join(downloads, 'muster-fieldcamp-layout.json');
    if (fs.existsSync(file)) fs.unlinkSync(file);
    await page.click('#export');
    for (let i=0; i<60 && !fs.existsSync(file); i++) await pause(200);
    assert.ok(fs.existsSync(file)); const exported = JSON.parse(fs.readFileSync(file,'utf8'));
    assert.deepEqual(exported.groups, before.groups);
    // Edge 下载页可能自动抢焦点；隐藏页的 rAF / IntersectionObserver 会暂停。
    await page.bringToFront();
    await page.click('#reset'); await page.click('#confirm-reset'); await waitScene(); assert.equal((await state()).counts.models,26);
    await page.click('#undo'); await waitScene(); assert.deepEqual(comparable((await state()).groups), comparable(before.groups));
    await page.click('#reset'); await page.click('#confirm-reset'); await waitScene();
    await (await page.$('#file')).uploadFile(file); await waitScene();
    assert.deepEqual(comparable((await state()).groups), comparable(before.groups));
    return { exportedModels: exported.groups.reduce((n,g)=>n+g.instances.length,0), importedModels:(await state()).counts.models };
  });
  await check('刷新恢复与原展柜存储隔离', async () => {
    await pause(1200); const before = await state();
    assert.equal(await page.evaluate(()=>localStorage.getItem('muster.display.v3-grand-review')),sentinel);
    await page.reload({ waitUntil:'load', timeout:120000 }); await page.bringToFront(); await page.waitForFunction(()=>window.__campReady===true,{polling:200,timeout:300000}); await waitScene();
    const after = await state(); assert.deepEqual(comparable(after.groups),comparable(before.groups));
    assert.equal(await page.evaluate(()=>localStorage.getItem('muster.display.v3-grand-review')),sentinel);
    assert.deepEqual(after.camera,before.camera); await shot('fieldcamp-restored.png'); return { counts:after.counts, camera:after.camera };
  });
  await check('窄屏布局与可见画布', async () => {
    await page.setViewport({ width:390,height:844,deviceScaleFactor:1 }); await pause(1200);
    const size = await page.evaluate(()=>({ width:innerWidth, scrollWidth:document.documentElement.scrollWidth,
      canvasWidth:document.querySelector('.scene-canvas').getBoundingClientRect().width,
      canvasHeight:document.querySelector('.scene-canvas').getBoundingClientRect().height }));
    assert.equal(size.scrollWidth,size.width); assert.ok(size.canvasWidth>300 && size.canvasHeight>400);
    await shot('fieldcamp-mobile.png'); return { ...size, note:'桌面浏览器窄屏模拟，未测试真实手机性能' };
  });
  assert.deepEqual(report.errors,[]); assert.deepEqual(report.failures,[]); report.passed=true;
} catch(error) { report.error=error.stack??String(error); console.error(report.error); await shot('fieldcamp-failure.png').catch(()=>{}); process.exitCode=1; }
finally { report.finished=new Date().toISOString(); fs.mkdirSync(path.dirname(reportPath),{recursive:true}); fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n'); await browser.close(); }
console.log(`营地验收：${report.passed?'通过':'失败'}，${report.checks.length} 项完成。`);

