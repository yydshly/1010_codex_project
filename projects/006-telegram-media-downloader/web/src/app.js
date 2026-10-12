import { media, steps, scenarios, roadmap, valueProfiles, source } from './content.js';

const get = (id) => document.getElementById(id);
const state = { kind: 'video', mode: 'after', version: 'k', running: false, playing: false, timer: null };
const buttons = (attribute) => [...document.querySelectorAll(`[${attribute}]`)];

function selectButtons(attribute, value) {
  for (const button of buttons(attribute)) button.setAttribute('aria-pressed', String(button.getAttribute(attribute) === String(value)));
}

function stopTimer() {
  clearTimeout(state.timer);
  state.timer = null;
  state.running = false;
}

function allowed() {
  return state.mode === 'after' && !(state.kind === 'audio' && state.version === 'a');
}

function renderMedia() {
  stopTimer();
  state.playing = false;
  const item = media[state.kind];
  const stage = document.querySelector('.media-stage');
  stage.dataset.kind = state.kind;
  stage.classList.remove('playing');
  document.querySelector('.landscape').hidden = state.kind === 'audio';
  document.querySelector('.audio-stage').hidden = state.kind !== 'audio';
  get('play-demo').hidden = !['video', 'audio'].includes(state.kind);
  get('play-demo').setAttribute('aria-pressed', 'false');
  get('play-demo').setAttribute('aria-label', '播放效果示意');
  get('play-demo').querySelector('span').textContent = '▷';
  get('stage-counter').textContent = { image: '图片 · 示意', video: '00:18 / 00:42', audio: '语音 · 示意', story: '图片故事 · 示意' }[state.kind];
  get('media-title').textContent = item.title;
  get('file-name').textContent = item.filename;
  get('file-meta').textContent = `${item.size} · 示例数据`;
  get('media-caption').textContent = item.caption;
  get('selected-media').textContent = item.label;
  get('media-detail').textContent = item.detail;
  get('media-source').href = source + item.anchor;
  get('media-source').textContent = `源码 ${item.lines} ↗`;
  get('progress-area').hidden = true;
  get('demo-status').classList.remove('error');
  get('demo-progress').classList.remove('error');
  get('demo-progress').setAttribute('aria-valuenow', '0');
  get('demo-progress').querySelector('span').style.width = '0%';
  get('run-demo').disabled = !allowed();
  get('run-demo').textContent = allowed() ? '演示保存流程 ↓' : '无保存入口 · 示意';
  get('simulate-failure').disabled = !allowed();
  const note = state.mode === 'before'
    ? '原页面示意：媒体可见，保存入口被隐藏。未连接真实 Telegram。'
    : state.kind === 'audio' && state.version === 'a'
      ? '源码边界：WebA 主线未提供同等语音下载入口，可切换到 WebK 查看示意。'
      : '按钮已补充。点击查看保存流程示意，不会下载真实文件。';
  get('demo-status').textContent = note;
  selectButtons('data-media', state.kind);
  selectButtons('data-mode', state.mode);
}

function finishDemo(failed = false) {
  stopTimer();
  get('run-demo').textContent = '重新演示 ↓';
  get('demo-status').classList.toggle('error', failed);
  get('demo-progress').classList.toggle('error', failed);
  get('demo-status').textContent = failed
    ? 'Aborted · 异常示意。真实失败原因与恢复能力仍需实测；没有保存文件。'
    : '示意完成 · 已展示保存路径，未下载或写入真实文件。';
  if (!failed && media[state.kind].progress) get('progress-label').textContent = '读取完成 · 示意';
}

function runDemo() {
  if (!allowed()) return;
  if (state.running) {
    stopTimer();
    get('run-demo').textContent = '重新演示 ↓';
    get('demo-status').textContent = '示意已停止。本页只停止动画，不代表上游具有取消下载功能。';
    return;
  }
  renderMedia();
  state.running = true;
  get('run-demo').textContent = '停止示意';
  const showProgress = media[state.kind].progress;
  const fail = get('simulate-failure').checked;
  get('progress-area').hidden = !showProgress;
  get('progress-label').textContent = '读取进度 · 示意';
  get('progress-number').textContent = '0%';
  get('range-output').textContent = 'Range: bytes=0- · 示例响应';
  const messages = state.kind === 'image' || state.kind === 'story'
    ? ['识别当前图片地址 · 示意', '准备浏览器保存入口 · 示意', '显示保存结果 · 示意']
    : ['读取已加载的媒体来源 · 示意', '检查响应类型和字节范围 · 示意', '逐段读取当前媒体 · 示意', '选择文件写入或 Blob 回退 · 示意', '展示保存结果 · 示意'];
  let index = 0;
  const tick = () => {
    if (!state.running) return;
    if (fail && index === 2) { finishDemo(true); return; }
    get('demo-status').textContent = messages[index];
    const progress = Math.round(((index + 1) / messages.length) * 100);
    if (showProgress) {
      const total = 25165824;
      const start = Math.floor((total * index) / messages.length);
      const end = Math.floor((total * (index + 1)) / messages.length) - 1;
      get('progress-number').textContent = `${progress}%`;
      get('demo-progress').setAttribute('aria-valuenow', String(progress));
      get('demo-progress').querySelector('span').style.width = `${progress}%`;
      get('range-output').textContent = `示例 Content-Range: bytes ${start}-${end}/${total}`;
    }
    index += 1;
    if (index === messages.length) state.timer = setTimeout(() => finishDemo(), 350);
    else state.timer = setTimeout(tick, 430);
  };
  tick();
}

for (const button of buttons('data-media')) button.addEventListener('click', () => { state.kind = button.dataset.media; renderMedia(); });
for (const button of buttons('data-mode')) button.addEventListener('click', () => { state.mode = button.dataset.mode; renderMedia(); });
get('web-version').addEventListener('change', (event) => { state.version = event.target.value; renderMedia(); });
get('run-demo').addEventListener('click', runDemo);
get('reset-demo').addEventListener('click', () => { get('simulate-failure').checked = false; renderMedia(); });
get('play-demo').addEventListener('click', () => {
  state.playing = !state.playing;
  document.querySelector('.media-stage').classList.toggle('playing', state.playing);
  get('play-demo').setAttribute('aria-pressed', String(state.playing));
  get('play-demo').setAttribute('aria-label', state.playing ? '暂停效果示意' : '播放效果示意');
  get('play-demo').querySelector('span').textContent = state.playing ? 'Ⅱ' : '▷';
  get('stage-counter').textContent = state.playing ? '动态示意 · 无真实音视频' : (state.kind === 'audio' ? '语音 · 示意' : '00:18 / 00:42');
});

const wave = document.querySelector('.waveform');
for (let index = 0; index < 43; index += 1) {
  const bar = document.createElement('i');
  bar.style.height = `${12 + Math.abs(Math.sin(index * 1.7)) * 44}px`;
  bar.style.setProperty('--i', index);
  wave.append(bar);
}

for (const button of buttons('data-step')) button.addEventListener('click', () => {
  const index = Number(button.dataset.step);
  const step = steps[index];
  selectButtons('data-step', index);
  get('step-title').textContent = step.heading;
  get('step-text').textContent = step.text;
  get('step-code').textContent = step.code;
  get('step-source').href = step.url;
  get('step-source').textContent = `${step.lines} ↗`;
});

for (const button of buttons('data-scenario')) button.addEventListener('click', () => {
  const index = Number(button.dataset.scenario);
  const scenario = scenarios[index];
  selectButtons('data-scenario', index);
  get('scenario-number').textContent = scenario.symbol;
  get('scenario-heading').textContent = scenario.heading;
  get('scenario-text').textContent = scenario.text;
  get('scenario-value').textContent = scenario.value;
  get('scenario-boundary').textContent = scenario.boundary;
});

for (const [index, item] of roadmap.entries()) {
  const details = document.createElement('details');
  details.open = index === 0;
  details.innerHTML = `<summary><span class="roadmap-number">0${index + 1}</span><strong>${item.title}</strong><small>${item.tag}</small><span class="expand-icon" aria-hidden="true">＋</span></summary><div class="roadmap-body"><div><p>${item.text}</p><p class="roadmap-prerequisite">${item.prerequisite}</p></div><div><p class="roadmap-output">${item.output}</p><p>${item.acceptance}</p>${item.source ? `<a href="${item.source}" target="_blank" rel="noopener">相关上游讨论 ↗</a>` : '<p class="roadmap-prerequisite">本研究设想 · 效果与投入待验证</p>'}</div></div>`;
  details.addEventListener('toggle', () => {
    if (details.open) for (const other of get('roadmap').querySelectorAll('details')) if (other !== details) other.open = false;
  });
  get('roadmap').append(details);
}

function renderValue(key) {
  const profile = valueProfiles[key];
  selectButtons('data-value', key);
  for (const [id, field] of [['heading', 'heading'], ['description', 'description'], ['priority', 'priority'], ['benefit', 'benefit'], ['cost', 'cost'], ['measure', 'measure']]) get(`value-${id}`).textContent = profile[field];
}
for (const button of buttons('data-value')) button.addEventListener('click', () => renderValue(button.dataset.value));
renderValue('occasional');

for (let part = 1; part <= 5; part += 1) {
  const segment = document.createElement('div');
  segment.innerHTML = `<strong>${part}</strong><span>${(part - 1) * 200}–${part * 200 - 1}</span>`;
  get('byte-map').append(segment);
}
function renderRange() {
  const part = Number(get('range-part').value);
  const response = get('range-response').value;
  const start = (part - 1) * 200;
  const end = part * 200 - 1;
  get('range-part-label').textContent = String(part);
  for (const [index, segment] of [...get('byte-map').children].entries()) {
    segment.classList.toggle('read', response === '200' || index < part - 1);
    segment.classList.toggle('current', response !== '200' && index === part - 1);
    segment.classList.toggle('invalid', response === 'mismatch' && index === part - 1);
  }
  if (response === '200') {
    get('range-code').textContent = `请求 Range: bytes=${start}-\n响应 HTTP 200 · 完整文件\nContent-Range: 未提供\n示例响应体：1,000 字节`;
    get('range-explanation').textContent = '服务端可能忽略 Range 返回完整资源。200 与 206 要分开处理；后续段若把全文件继续追加，会造成重复内容。所查主线仍强制解析范围头，不能把本示意当成它已正确支持该情况。';
  } else if (response === 'mismatch') {
    const mismatch = start + 10;
    get('range-code').textContent = `请求 Range: bytes=${start}-\n响应 HTTP 206\nContent-Range: bytes ${mismatch}-${end}/1000\n预期起点 ${start} ≠ 实际起点 ${mismatch}`;
    get('range-explanation').textContent = '返回起点与预期不一致，不能直接拼接。需要停止并报告范围错误；实际影响和后续恢复能力需要真实网络与写入测试。';
  } else {
    get('range-code').textContent = `请求 Range: bytes=${start}-\n响应 HTTP 206\nContent-Range: bytes ${start}-${end}/1000\n本段 = ${end} − ${start} + 1 = 200 字节\n累计 = ${end + 1} 字节 · ${(end + 1) / 10}%\n${part === 5 ? '全部字节已读 · 仍需等待写入和关闭' : `下一偏移 = ${end + 1}`}`;
    get('range-explanation').textContent = part === 5 ? '读到 100% 只说明字节读取结束。写入成功、文件关闭和最终完整性核验完成后，才能报告整个任务成功。' : '字节位置从 0 开始，结束位置也在本段内，因此长度要加 1。下一次从 end + 1 继续；分段读取本身没有保存刷新后的任务状态。';
  }
}
get('range-part').addEventListener('input', renderRange);
get('range-response').addEventListener('change', renderRange);
renderRange();

for (const button of buttons('data-play-artifact')) button.addEventListener('click', async () => {
  const artifact = get(button.dataset.playArtifact);
  for (const other of document.querySelectorAll('.artifact-grid video, .artifact-grid audio')) if (other !== artifact) other.pause();
  artifact.currentTime = 0;
  try { await artifact.play(); get('artifact-play-status').textContent = `正在播放：${artifact.getAttribute('aria-label')}。来自本地受控实验。`; }
  catch { get('artifact-play-status').textContent = '浏览器未能播放此格式；可下载实验文件在本地检查。'; }
});
async function loadExperimentResults() {
  try {
    const response = await fetch('./experiments/controlled-results.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const report = await response.json();
    const labels = { 'image-anchor': '图片链接保存', 'video-range': '视频正常分段', 'voice-range': '语音正常分段', 'story-k-image': 'WebK 图片 Stories', 'story-k-video': 'WebK 视频 Stories', 'story-a-image': 'WebA 图片 Stories', 'story-a-video': 'WebA 视频 Stories', 'video-full200': '视频缺少范围头', 'voice-full200': '语音缺少范围头', 'video-mismatch': '视频起点错配', 'voice-mismatch': '语音起点错配', 'video-write-timing': '视频延迟写入' };
    const outcomes = { 'complete-file': '完整 · 哈希一致', 'incomplete-file': '截断 · 哈希不一致', 'aborted-without-file': '中止 · 无文件', timeout: '超时' };
    get('experiment-summary').textContent = `${report.results.length} 项已执行：9 项输出完整文件，2 项中止，1 项输出截断文件。Stories 为模拟 DOM；成功数不能作为 Telegram 下载成功率。`;
    for (const result of report.results) {
      const row = document.createElement('tr');
      const values = [labels[result.id] || result.id, `${result.requests[0]?.status ?? '—'} · ${result.requests.length} 请求${result.buttonInjected ? ' · 模拟 DOM 按钮' : ''}`, outcomes[result.outcome] || result.outcome, `${result.saved[0]?.bytes ?? 0} / ${result.original.bytes}`];
      for (const value of values) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
      row.dataset.outcome = result.outcome; get('experiment-rows').append(row);
    }
    const close = report.results.find(item => item.id === 'video-write-timing')?.timeline.find(item => item.event === 'close-called');
    get('pending-write-count').textContent = String(close?.pending ?? '未知');
    for (const [kind, fixture] of Object.entries(report.fixtures)) {
      const line = document.createElement('p'); const title = document.createElement('strong'); const code = document.createElement('code');
      title.textContent = `${{ image: '图片', video: '视频', voice: '语音' }[kind]} · 原文件 / 正常输出 SHA-256`;
      code.textContent = fixture.sha256; line.append(title, code); get('artifact-hashes').append(line);
    }
  } catch { get('experiment-summary').textContent = '实验记录加载失败；请打开完整 JSON 查看已保存结果。'; }
}
loadExperimentResults();

const readingLinks = [...document.querySelectorAll('.reading-nav a')];
const readingSections = readingLinks.map((link) => document.querySelector(link.hash));
function updateReadingChapter() {
  const threshold = document.querySelector('.reading-nav').offsetHeight + 25;
  const current = readingSections.filter((section) => section.getBoundingClientRect().top <= threshold).at(-1);
  for (const link of readingLinks) {
    const active = current && link.hash === `#${current.id}`;
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
let readingFrame = null;
window.addEventListener('scroll', () => {
  if (readingFrame !== null) return;
  readingFrame = requestAnimationFrame(() => { readingFrame = null; updateReadingChapter(); });
}, { passive: true });
window.addEventListener('resize', updateReadingChapter);
updateReadingChapter();

window.addEventListener('pagehide', stopTimer);
// Keep fragment navigation aligned after the interactive panel changes height.
for (const link of document.querySelectorAll('a[href^="#"]')) link.addEventListener('click', (event) => {
  const hash = link.getAttribute('href');
  const target = hash === '#' ? null : document.getElementById(hash.slice(1));
  if (hash !== '#' && !target) return;
  event.preventDefault();
  if (target) {
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  const nextHash = hash === '#' ? '' : hash;
  if (location.hash !== nextHash) history.pushState(null, '', `${location.pathname}${location.search}${nextHash}`);
  const chapterOffset = ['main', 'observatory'].includes(target?.id) ? 30 : document.querySelector('.reading-nav').offsetHeight + 20;
  window.scrollTo({ top: target ? Math.max(0, target.getBoundingClientRect().top + window.scrollY - chapterOffset) : 0, behavior: 'instant' });
  updateReadingChapter();
});
renderMedia();

// A single research record supplies the complete prose and fixed source links.
async function loadResearchSummary() {
  try {
    const response = await fetch('./docs/understanding-summary.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    for (const [index, section] of data.sections.entries()) {
      const item = document.createElement('details');
      item.className = 'summary-topic';
      item.open = index === 0;
      const heading = document.createElement('summary');
      heading.textContent = `${String(index + 1).padStart(2, '0')} / ${section.title}`;
      item.append(heading);
      for (const paragraph of section.body) {
        const p = document.createElement('p');
        p.textContent = paragraph;
        item.append(p);
      }
      get('complete-summary').append(item);
    }
    for (const [index, module] of data.modules.entries()) {
      const card = document.createElement('article');
      const heading = document.createElement('h4');
      heading.textContent = `${String(index + 1).padStart(2, '0')} / ${module.title}`;
      const p = document.createElement('p');
      p.textContent = module.detail;
      const link = document.createElement('a');
      link.href = `${data.upstream}/blob/${data.revision}/${data.sourceFile}${module.anchor}`;
      link.target = '_blank'; link.rel = 'noopener'; link.textContent = `固定源码 ${module.lines} ↗`;
      card.append(heading, p, link);
      get('module-map').append(card);
    }
    get('summary-status').textContent = '9 个主题 · 27 段完整摘要 · 9 组源码职责；点击标题展开。';
  } catch (error) {
    get('summary-status').textContent = `摘要读取失败（${error.message}），可通过下方 Markdown 阅读完整资料。`;
  }
}
get('expand-summary').addEventListener('click', () => {
  for (const topic of document.querySelectorAll('.summary-topic')) topic.open = true;
});
get('collapse-summary').addEventListener('click', () => {
  for (const topic of document.querySelectorAll('.summary-topic')) topic.open = false;
});
const guideDialog = get('guide-dialog');
let guideZoom = 100;
function setGuideZoom(value) {
  guideZoom = Math.max(100, Math.min(300, value));
  get('guide-dialog-image').style.width = `${guideZoom}%`;
  get('guide-zoom-value').textContent = `${guideZoom}%`;
  get('guide-zoom-out').disabled = guideZoom === 100;
  get('guide-zoom-in').disabled = guideZoom === 300;
}
get('open-guide').addEventListener('click', () => { setGuideZoom(100); guideDialog.showModal(); });
get('close-guide').addEventListener('click', () => guideDialog.close());
get('guide-zoom-in').addEventListener('click', () => setGuideZoom(guideZoom + 50));
get('guide-zoom-out').addEventListener('click', () => setGuideZoom(guideZoom - 50));
loadResearchSummary();
