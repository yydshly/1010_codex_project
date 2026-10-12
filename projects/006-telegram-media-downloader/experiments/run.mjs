import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import http from 'node:http';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const revision = '169a678627cec090ce1fa8b6eaac250547f0121a';
const expectedSourceHash = '80167ae47412eba6030c470a387e4e3e546e3b7a663e99b8dac92cb7d1d30ecf';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const upstream = await readFile(path.join(root, 'upstream', 'telegram-media-downloader.user.js'));
if (hash(upstream) !== expectedSourceHash) throw new Error('上游源码 SHA-256 与固定版本不符');
const source = upstream.toString('utf8');
const end = source.lastIndexOf('})();');
if (end < 0) throw new Error('未找到上游 IIFE 结束位置');
// 仅在内存中追加测试导出；下载函数、页面定时器及其分支保持原样。
const instrumented = source.slice(0, end) + 'globalThis.testExports = { tel_download_image, tel_download_video, tel_download_audio };\n' + source.slice(end);
const fixtureTypes = { image: ['test-image.jpeg', 'image/jpeg'], video: ['test-video.mp4', 'video/mp4'], voice: ['test-voice.ogg', 'audio/ogg'] };
const fixtures = Object.fromEntries(await Promise.all(Object.entries(fixtureTypes).map(async ([kind, [file, mime]]) => [kind, { file, mime, bytes: await readFile(path.join(root, 'fixtures', file)) }])));
const cases = new Map();
const server = http.createServer((request, response) => {
  const id = request.url.slice(1);
  const item = cases.get(id);
  if (!item) { response.writeHead(404); response.end(); return; }
  const { fixture, mode, requests } = item;
  const offset = Number((request.headers.range || '').match(/^bytes=(\d+)-$/)?.[1] || 0);
  const finish = Math.min(offset + 8192, fixture.bytes.length);
  const fullResponse = mode === 'full200' || !request.headers.range;
  const body = fullResponse ? fixture.bytes : fixture.bytes.subarray(offset, finish);
  const headers = { 'Content-Type': fixture.mime, 'Content-Length': body.length };
  if (!fullResponse) headers['Content-Range'] = `bytes ${mode === 'mismatch' ? offset + 1 : offset}-${finish - 1}/${fixture.bytes.length}`;
  requests.push({ range: request.headers.range || null, status: fullResponse ? 200 : 206, contentRange: headers['Content-Range'] || null, bytes: body.length });
  response.writeHead(fullResponse ? 200 : 206, headers);
  response.end(body);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 最小 DOM 替身只提供上游本次所需的属性和选择器。不是完整浏览器，也不是 Telegram 实际 DOM。
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.style = {}; this.className = ''; this.selectors = new Map(); this.attributes = {}; }
  get classList() { return { contains: name => this.className.split(' ').includes(name), add: name => { this.className += ` ${name}`; }, remove: name => { this.className = this.className.split(' ').filter(c => c !== name).join(' '); } }; }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  prepend(child) { child.parentNode = this; this.children.unshift(child); }
  insertBefore(child) { this.prepend(child); }
  removeChild(child) { this.children = this.children.filter(c => c !== child); }
  remove() { this.parentNode?.removeChild(this); }
  querySelectorAll(selector) {
    if (this.selectors.has(selector)) return [this.selectors.get(selector)].flat().filter(Boolean);
    const [tag, className] = selector.split('.');
    const matches = child => (!tag || child.tag === tag) && (!className || child.className.split(' ').includes(className));
    return this.children.flatMap(child => [...(matches(child) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  click() { this.onclick?.({ stopPropagation() {} }); }
}
function environment(id, fixture, route, writableMode) {
  const logs = [], saves = [], timers = [], urls = new Map(), savePromises = [], timeline = [];
  const body = new Element('body'), html = new Element('html');
  const document = {
    body,
    querySelector: selector => selector === 'body' ? body : selector === 'html' ? html : null,
    getElementById: id => {
      const find = node => node.id === id ? node : node.children.map(find).find(Boolean);
      return find(body) || null;
    },
    createElement: tag => {
      const element = new Element(tag);
      if (tag === 'a') element.click = () => {
        const name = element.download;
        const url = element.href;
        // 用保存适配器承接点击：Blob 取真实字节，HTTP 图片由适配器请求；不等于浏览器实际下载。
        const task = (async () => {
          const bytes = urls.has(url) ? Buffer.from(await urls.get(url).arrayBuffer()) : Buffer.from(await (await fetch(url)).arrayBuffer());
          const file = `${id}${path.extname(name)}`;
          await writeFile(path.join(root, 'results', file), bytes);
          saves.push({ file, suggestedName: name, bytes: bytes.length, sha256: hash(bytes), matchesOriginal: hash(bytes) === hash(fixture.bytes), adapter: 'anchor-save-adapter' });
        })();
        savePromises.push(task);
      };
      return element;
    }
  };
  const unsafeWindow = {};
  if (writableMode) {
    unsafeWindow.self = unsafeWindow; unsafeWindow.top = unsafeWindow;
    unsafeWindow.showSaveFilePicker = async () => ({ createWritable: async () => {
      let queue = Promise.resolve(), pending = 0; const chunks = [];
      return {
        write: blob => { pending++; timeline.push({ event: 'write-called', pending }); queue = queue.then(async () => { await delay(15); chunks.push(Buffer.from(await blob.arrayBuffer())); pending--; timeline.push({ event: 'write-resolved', pending }); }); return queue; },
        close: () => {
          const progress = body.querySelector('div.progress')?.querySelector('p');
          timeline.push({ event: 'close-called', pending, progress: progress?.innerText || null });
          const task = queue.then(async () => {
            await delay(15); const bytes = Buffer.concat(chunks); const file = `${id}.mp4`;
            await writeFile(path.join(root, 'results', file), bytes);
            saves.push({ file, bytes: bytes.length, sha256: hash(bytes), matchesOriginal: hash(bytes) === hash(fixture.bytes), adapter: 'queued-writable-test-double' });
            timeline.push({ event: 'close-resolved', progress: progress?.innerText || null });
          });
          savePromises.push(task); return task;
        }
      };
    } });
  }
  const context = vm.createContext({ document, unsafeWindow, location: { pathname: '/k/' }, Blob, fetch, Date, Math,
    window: { URL: { createObjectURL: blob => { const key = `blob:test-${urls.size}`; urls.set(key, blob); return key; }, revokeObjectURL() {} } },
    console: { log: (...args) => logs.push({ level: 'info', message: args.map(String).join(' ') }), error: (...args) => logs.push({ level: 'error', message: args.map(String).join(' ') }) },
    setInterval: callback => { timers.push(callback); return timers.length; }
  });
  vm.runInContext(instrumented, context, { filename: 'upstream-instrumented-for-test.js', timeout: 2000 });
  const url = `${base}/${id}`;
  let buttonInjected = null;
  if (route.startsWith('story')) {
    const isK = route.includes('-k-'), isVideo = fixture.mime.startsWith('video/');
    const story = new Element('div'); story.id = isK ? 'stories-viewer' : 'StoryViewer'; body.appendChild(story);
    const header = new Element('div'); story.appendChild(header);
    const media = new Element(isVideo ? 'video' : 'img'); media.src = url;
    story.selectors.set(isK ? "[class^='_ViewerStoryHeaderRight']" : '.GrsJNw3y', header);
    story.selectors.set(isVideo ? (isK ? 'video.media-video' : 'video') : (isK ? 'img.media-photo' : 'img.PVZ8TOWS'), media);
    timers[isK ? 1 : 0]();
    const button = header.querySelector('.tel-download');
    buttonInjected = Boolean(button?.onclick);
    if (!buttonInjected) throw new Error('Stories 夹具未注入按钮');
    button.click();
  } else context.testExports[`tel_download_${route}`](url);
  return { logs, saves, savePromises, timeline, body, buttonInjected };
}
const specifications = [
  ['image-anchor', 'image', 'range', 'image'],
  ['video-range', 'video', 'range', 'video'],
  ['voice-range', 'voice', 'range', 'audio'],
  ['story-k-image', 'image', 'range', 'story-k-image'],
  ['story-k-video', 'video', 'range', 'story-k-video'],
  ['story-a-image', 'image', 'range', 'story-a-image'],
  ['story-a-video', 'video', 'range', 'story-a-video'],
  ['video-full200', 'video', 'full200', 'video'],
  ['voice-full200', 'voice', 'full200', 'audio'],
  ['video-mismatch', 'video', 'mismatch', 'video'],
  ['voice-mismatch', 'voice', 'mismatch', 'audio'],
  ['video-write-timing', 'video', 'range', 'video', true]
];
const results = [];
try {
  await mkdir(path.join(root, 'results'), { recursive: true });
  for (const [id, kind, mode, route, writableMode] of specifications) {
    const fixture = fixtures[kind]; const requests = []; cases.set(id, { fixture, mode, requests });
    const start = performance.now(); const env = environment(id, fixture, route, writableMode);
    let outcome = 'timeout';
    for (let iteration = 0; iteration < 300; iteration++) {
      await delay(10);
      if (writableMode && !env.saves.length && env.body.querySelector('div.progress')?.querySelector('p')?.innerText === 'Completed' && !env.timeline.some(item => item.event === 'completed-before-close-resolved')) env.timeline.push({ event: 'completed-before-close-resolved' });
      if (env.saves.length) { outcome = env.saves[0].matchesOriginal ? 'complete-file' : 'incomplete-file'; break; }
      if (route === 'video' && env.body.querySelector('div.progress')?.querySelector('p')?.innerText === 'Aborted') { outcome = 'aborted-without-file'; break; }
    }
    await Promise.all(env.savePromises);
    const result = { id, environment: 'Node VM + real localhost HTTP + minimal DOM / save adapters', kind, responseMode: mode, route, writableMode: Boolean(writableMode), outcome,
      original: { file: fixture.file, bytes: fixture.bytes.length, sha256: hash(fixture.bytes) }, saved: env.saves, requests, buttonInjected: env.buttonInjected, timeline: env.timeline,
      progress: env.body.querySelector('div.progress')?.querySelector('p')?.innerText || null, durationMs: Math.round(performance.now() - start), logs: env.logs };
    results.push(result); console.log(`${id}: ${outcome}, requests=${requests.length}, saved=${env.saves[0]?.bytes ?? 0}/${fixture.bytes.length}`);
  }
} finally { await new Promise(resolve => server.close(resolve)); }
const report = { testedAt: new Date().toISOString(), revision, scriptVersion: '1.212', sourceSha256: expectedSourceHash,
  environment: { node: process.version, platform: process.platform, network: 'localhost real HTTP', dom: 'minimal test double', save: 'anchor adapter / queued writable test double' },
  scope: '受控源码实验；没有连接 Telegram，没有真实浏览器下载，不证明 Telegram DOM、权限、原图、最高画质或 Stories 当前兼容性。图片 HTTP 读取由保存适配器执行。',
  instrumentation: 'VM 内仅在 IIFE 结束前追加三个函数的测试导出；原下载函数、定时器与 Stories 路由代码未改。',
  fixtures: Object.fromEntries(Object.entries(fixtures).map(([kind, fixture]) => [kind, { file: fixture.file, bytes: fixture.bytes.length, sha256: hash(fixture.bytes) }])), results };
await writeFile(path.join(root, 'results', 'controlled-results.json'), JSON.stringify(report, null, 2) + '\n');
const expected = { 'image-anchor': 'complete-file', 'video-range': 'complete-file', 'voice-range': 'complete-file', 'story-k-image': 'complete-file', 'story-k-video': 'complete-file', 'story-a-image': 'complete-file', 'story-a-video': 'complete-file', 'video-full200': 'aborted-without-file', 'voice-full200': 'complete-file', 'video-mismatch': 'aborted-without-file', 'voice-mismatch': 'incomplete-file', 'video-write-timing': 'complete-file' };
for (const result of results) if (result.outcome !== expected[result.id]) throw new Error(`观察结果改变：${result.id}: ${result.outcome}`);
console.log('12 项受控实验完成；异常结果作为限制记录，不是 Telegram 账号实测。');
