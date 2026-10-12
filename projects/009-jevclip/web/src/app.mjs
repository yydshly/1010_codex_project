import { KINDS, FOCUS_GROUPS, parseInput, segmentCues, evaluate, excerpts, formatTime, where, markdownReport } from './core.mjs';
import { sampleCues, sampleTitle } from './sample.mjs';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const storageKey = 'frame-notes:009:v1';
let state = { title: sampleTitle, sourceName: '原创合成示例.srt', cues: structuredClone(sampleCues), focus: [], hideFiller: true, overrides: {}, selected: 'S4', sample: true, upstream: false };
let filter = 'all', search = '', panel = 'summary', rows = [], points = [], playhead = 60, objectURL = null, videoKind = 'sample', persistEnabled = true, toastTimer;
const video = $('#video');
let restored = false;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved?.version === 1 && Array.isArray(saved.cues)) {
    const parsed = parseInput(JSON.stringify(saved.cues.map(cue => cue.verdict ? { ...cue, ...cue.verdict, reasons: cue.verdict.reasons } : cue)), 'session.json');
    const focus = Array.isArray(saved.focus) ? saved.focus.filter(f => typeof f === 'string' && f.length <= 80).slice(0, 5) : [];
    const overrides = Object.fromEntries(Object.entries(saved.overrides || {}).filter(([id, value]) => parsed.cues.some(cue => cue.id === id) && typeof value === 'boolean'));
    state = { ...state, title: String(saved.title || '我的视频研究').slice(0, 160), sourceName: String(saved.sourceName || '已恢复字幕').slice(0, 160), cues: parsed.cues, focus, hideFiller: saved.hideFiller !== false, overrides, selected: parsed.cues.some(c => c.id === saved.selected) ? saved.selected : parsed.cues[0].id, sample: saved.sample === true, upstream: parsed.upstream };
    videoKind = state.sample && saved.videoKind === 'sample' ? 'sample' : 'none';
    playhead = state.cues.find(c => c.id === state.selected)?.start || 0;
    restored = true;
  }
} catch { try { localStorage.removeItem(storageKey); } catch {} }

function toast(message, error = false) {
  clearTimeout(toastTimer);
  const element = $('#toast'); element.textContent = message; element.classList.toggle('error', error); element.hidden = false;
  toastTimer = setTimeout(() => { element.hidden = true; }, error ? 6000 : 3500);
}
function persist() {
  if (!persistEnabled) return;
  try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...state, videoKind })); }
  catch { persistEnabled = false; toast('浏览器存储空间不足，本次仍可使用，请导出笔记。', true); }
}
function duration() { return Math.max(0, ...state.cues.map(c => c.end || 0)); }
function selectedRow() { return rows.find(row => row.id === state.selected) || rows[0]; }
function render() {
  rows = evaluate(state.cues, state); points = excerpts(rows, state.focus);
  $('#document-title').textContent = state.title;
  $('#source-name').textContent = state.sourceName;
  $('#mode-label').textContent = state.upstream ? 'Jevclip 判断结果 · 本地关注点' : '本地规则筛选';
  $('#sample-tag').hidden = !state.sample;
  $('#hide-filler').checked = state.hideFiller;
  $('#hide-filler').disabled = state.upstream;
  $('#hide-filler').closest('label').title = state.upstream ? '已导入 Jevclip 判断，保留上游取舍，可逐段人工修正' : '';
  $('#reset-overrides').disabled = !Object.keys(state.overrides).length;
  $('#focus-chips').innerHTML = state.focus.map((item, index) => `<span class="focus-chip"><span title="${escape((FOCUS_GROUPS[item] || [item]).join('、'))}">${escape(item)}</span><button data-remove-focus="${index}" aria-label="移除关注点 ${escape(item)}">×</button></span>`).join('');
  document.querySelectorAll('[data-focus]').forEach(button => { button.classList.toggle('chosen', state.focus.includes(button.dataset.focus)); button.disabled = state.focus.includes(button.dataset.focus); });
  $('#stat-total').textContent = rows.length;
  $('#stat-kept').textContent = rows.filter(row => row.keep === true).length;
  $('#stat-duration').textContent = state.cues[0].start === null ? '—' : formatTime(rows.filter(row => row.keep === true).reduce((total, row) => total + row.end - row.start, 0));
  $('#stat-evidence').textContent = `${points.length} 条摘录均关联原文`;
  $('#summary-count').textContent = `${points.length} 条`;
  renderOverview(); renderTimeline(); renderEvidence(); updatePlayhead();
  persist();
}
function renderOverview() {
  const timed = state.cues[0].start !== null;
  const total = duration();
  $('#overview-track').innerHTML = rows.map((row, index) => `<button class="overview-segment ${row.keep === false ? 'dropped' : row.keep === null ? 'unknown' : ''} ${row.id === state.selected ? 'selected' : ''}" style="left:${timed ? row.start / total * 100 : index / rows.length * 100}%;width:calc(${timed ? (row.end - row.start) / total * 100 : 100 / rows.length}% - 3px)" data-jump="${escape(row.id)}" title="${escape(`${row.id} · ${where(row)} · ${row.keep === null ? '未判断' : row.keep ? '保留' : '舍弃'}`)}" aria-label="回查片段 ${escape(row.id)}"></button>`).join('') + (timed ? '<span class="playhead" id="playhead"></span>' : '');
  $('#overview-mid').textContent = timed ? formatTime(total / 2) : '按段落定位';
  $('#overview-end').textContent = timed ? formatTime(total) : `${rows.length} 段`;
  $('.overview-scale>span:first-child').textContent = timed ? '00:00' : '¶1';
}
function renderTimeline() {
  const list = $('#timeline-list'); const scrollTop = list.scrollTop;
  const visible = rows.filter(row => (filter === 'all' || (filter === 'kept' ? row.keep === true : row.keep === false)) && row.text.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  $('#visible-count').textContent = visible.length;
  document.querySelectorAll('[data-filter]').forEach(button => { const active = filter === button.dataset.filter; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active); });
  list.innerHTML = visible.length ? visible.map(row => `<article class="timeline-row ${row.id === state.selected ? 'selected' : ''} ${row.keep === false ? 'dropped' : row.keep === null ? 'unknown' : ''}" data-row="${escape(row.id)}">
    <button class="row-jump" data-jump="${escape(row.id)}" aria-label="查看 ${escape(row.id)} 原文"><span class="row-time">${escape(row.start === null ? where(row) : formatTime(row.start))}<small>${escape(row.id)}${row.start === null ? '' : ` / ${Math.ceil(row.end - row.start)}s`}</small></span><span><span class="row-text">${escape(row.text)}</span><span class="row-meta"><span class="kind-label">${escape(KINDS[row.kind] || row.kind)}</span><span class="row-state">${row.keep === null ? '待判断' : row.keep ? '✓ 保留' : '— 舍弃'}</span>${Object.hasOwn(state.overrides, row.id) ? '<span class="manual-label">人工修正</span>' : ''}</span></span></button><button class="decision-button" data-toggle="${escape(row.id)}" aria-label="${row.keep ? '舍弃' : '保留'}片段 ${escape(row.id)}" title="${escape(row.reason)}">${row.keep === null ? '?' : row.keep ? '✓' : '＋'}</button></article>`).join('') : '<div class="timeline-empty">没有符合条件的片段。<br />试试清空搜索、切换“全部”或调整关注点。</div>';
  list.scrollTop = scrollTop;
}
function renderEvidence() {
  document.querySelectorAll('[data-panel]').forEach(button => { const active = panel === button.dataset.panel; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active); });
  $('#summary-panel').hidden = panel !== 'summary'; $('#source-panel').hidden = panel !== 'source';
  $('#summary-list').innerHTML = points.length ? points.map((point, i) => `<article class="summary-item ${point.id === state.selected ? 'selected' : ''}"><div class="summary-title"><span class="point-number">${String(i + 1).padStart(2, '0')}</span><span>${escape(KINDS[point.kind] || point.kind)}</span></div><p>${escape(point.text)}</p><button class="citation" data-cite="${escape(point.id)}" aria-label="回查摘要依据 ${escape(point.id)}"><span>◷ ${escape(where(point.source))}</span><span>${escape(point.id)} ↗</span></button></article>`).join('') : '<div class="summary-empty">暂时没有保留的片段。<br />调整关注点，或在时间线中人工保留内容。</div>';
  const row = selectedRow();
  $('#source-panel').innerHTML = row ? `<div class="source-detail-heading"><span>${escape(row.id)} · ${escape(where(row))}</span><span>${escape(KINDS[row.kind] || row.kind)}</span></div><p class="source-full-text">${escape(row.text)}</p><div class="source-status">${row.keep === null ? '尚未判断' : row.keep ? '✓ 当前保留' : '— 当前舍弃'}<br />${escape(row.reason)}${row.verdict?.value !== null && row.verdict?.value !== undefined ? `<br />上游价值分：${escape(row.verdict.value)}` : ''}${row.estimated ? '<br />仅有开始时间，终点为推定位置，需核对。' : ''}</div><div class="source-detail-actions"><button data-set-keep="true" data-id="${escape(row.id)}" class="${row.keep === true ? 'chosen' : ''}">保留这一段</button><button data-set-keep="false" data-id="${escape(row.id)}" class="${row.keep === false ? 'chosen' : ''}">舍弃这一段</button></div>` : '';
}
function updatePlayhead() {
  const marker = $('#playhead'); if (marker) marker.style.left = `${Math.min(100, playhead / (duration() || 1) * 100)}%`;
  $('#playhead-label').textContent = state.cues[0].start === null ? '无时间稿 · 段落定位' : `${formatTime(playhead)} / ${formatTime(videoKind !== 'none' && Number.isFinite(video.duration) ? video.duration : duration())}`;
}
function setVideo(src, kind, name) {
  video.pause();
  if (objectURL) { URL.revokeObjectURL(objectURL); objectURL = null; }
  videoKind = kind;
  if (src) { video.src = src; video.hidden = false; $('#no-video').hidden = true; video.load(); }
  else { video.removeAttribute('src'); video.load(); video.hidden = true; $('#no-video').hidden = false; }
  $('#video-name').textContent = name;
  updatePlayhead();
}
function selectCue(id, { seek = true, scroll = true, citation = false } = {}) {
  const cue = rows.find(row => row.id === id); if (!cue) return;
  state.selected = id;
  if (citation) { filter = 'all'; search = ''; $('#search-input').value = ''; panel = 'source'; }
  if (cue.start !== null) {
    playhead = cue.start;
    if (seek && videoKind !== 'none' && video.readyState >= 1) {
      if (cue.start >= video.duration) toast('该字幕时间超出视频时长，请确认字幕与视频对应。', true);
      else video.currentTime = cue.start;
    }
  }
  renderOverview(); renderTimeline(); renderEvidence(); updatePlayhead(); persist();
  if (scroll) {
    const list = $('#timeline-list');
    const element = [...list.querySelectorAll('[data-row]')].find(row => row.dataset.row === id);
    if (element) list.scrollTop += element.getBoundingClientRect().top - list.getBoundingClientRect().top - (list.clientHeight - element.clientHeight) / 2;
  }
}
function addFocus(item) {
  item = item.trim(); if (!item) return;
  if (state.focus.some(f => f.toLocaleLowerCase() === item.toLocaleLowerCase())) { toast('这个关注点已经添加'); return; }
  if (state.focus.length >= 5) { toast('最多添加 5 个关注点，请先移除一个。', true); return; }
  state.focus.push(item); $('#focus-input').value = ''; render();
}
async function importSubtitle(file) {
  if (!file) return;
  try {
    if (!/\.(srt|vtt|json|txt|md)$/i.test(file.name)) throw new Error('请选择 SRT、VTT、JSON、TXT 或 MD 文件');
    if (file.size > 5 * 1024 * 1024) throw new Error('字幕文件最多 5 MB，请拆分后导入');
    const text = await file.text();
    const parsed = parseInput(text, file.name);
    const cues = segmentCues(parsed.cues);
    state = { ...state, title: file.name.replace(/\.[^.]+$/, ''), sourceName: file.name, cues, selected: cues[0].id, sample: false, upstream: parsed.upstream, overrides: {} };
    filter = 'all'; search = ''; panel = 'summary'; $('#search-input').value = ''; playhead = cues[0].start || 0;
    if (videoKind === 'sample') setVideo(null, 'none', '未关联视频 · 可先阅读字幕');
    if (!parsed.timed) video.pause();
    render();
    toast(`已导入 ${cues.length} 个${parsed.timed ? '时间片段' : '文字段落'}${parsed.upstream ? '，保留上游判断结果' : ''}`);
  } catch (error) { toast(error.message || '字幕导入失败', true); }
  finally { $('#subtitle-file').value = ''; }
}
function importVideo(file) {
  if (!file) return;
  if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name)) { toast('请选择浏览器支持的视频文件', true); return; }
  const src = URL.createObjectURL(file); setVideo(src, 'local', file.name); objectURL = src; persist();
  toast('视频已关联。请确认它与当前字幕对应。'); $('#video-file').value = '';
}
$('#subtitle-button').addEventListener('click', () => $('#subtitle-file').click());
$('#subtitle-file').addEventListener('change', event => importSubtitle(event.target.files[0]));
$('#video-button').addEventListener('click', () => $('#video-file').click());
$('#empty-video-button').addEventListener('click', () => $('#video-file').click());
$('#video-file').addEventListener('change', event => importVideo(event.target.files[0]));
const dropZone = $('#drop-zone');
for (const type of ['dragenter', 'dragover']) dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.add('dragover'); });
for (const type of ['dragleave', 'drop']) dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', event => importSubtitle(event.dataTransfer.files[0]));
$('#focus-form').addEventListener('submit', event => { event.preventDefault(); addFocus($('#focus-input').value); });
$('#focus-chips').addEventListener('click', event => { const button = event.target.closest('[data-remove-focus]'); if (button) { state.focus.splice(Number(button.dataset.removeFocus), 1); render(); } });
document.querySelectorAll('[data-focus]').forEach(button => button.addEventListener('click', () => addFocus(button.dataset.focus)));
$('#clear-focus').addEventListener('click', () => { state.focus = []; render(); });
$('#hide-filler').addEventListener('change', event => { state.hideFiller = event.target.checked; render(); });
$('#reset-overrides').addEventListener('click', () => { state.overrides = {}; render(); toast('人工取舍已重置'); });
$('#search-input').addEventListener('input', event => { search = event.target.value; renderTimeline(); });
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; renderTimeline(); }));
document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => { panel = button.dataset.panel; renderEvidence(); }));
document.addEventListener('click', event => {
  const jump = event.target.closest('[data-jump]'); if (jump) selectCue(jump.dataset.jump);
  const cite = event.target.closest('[data-cite]'); if (cite) selectCue(cite.dataset.cite, { citation: true });
  const toggle = event.target.closest('[data-toggle]'); if (toggle) { const row = rows.find(r => r.id === toggle.dataset.toggle); state.overrides[row.id] = row.keep !== true; render(); }
  const decision = event.target.closest('[data-set-keep]'); if (decision) { state.overrides[decision.dataset.id] = decision.dataset.setKeep === 'true'; render(); }
});
$('#sample-button').addEventListener('click', () => {
  state = { title: sampleTitle, sourceName: '原创合成示例.srt', cues: structuredClone(sampleCues), focus: [], hideFiller: true, overrides: {}, selected: 'S4', sample: true, upstream: false };
  filter = 'all'; search = ''; panel = 'summary'; $('#search-input').value = ''; playhead = 60;
  setVideo('./demo.mp4', 'sample', '原创合成示例 · 无配音'); render(); toast('已载入原创合成示例');
});
$('#export-button').addEventListener('click', () => {
  const body = markdownReport(state.title, rows, state.focus, state.upstream ? '导入 Jevclip 判断 + 本地关注点筛选' : '本地规则筛选');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${state.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 80)}-研究笔记.md`;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('已导出摘要、原文与逐段取舍');
});
$('#clear-storage').addEventListener('click', () => {
  try { localStorage.removeItem(storageKey); persistEnabled = false; toast('本机记录已清除，本次会话不再自动保存。'); }
  catch { toast('浏览器无法访问本机存储', true); }
});
$('#about-button').addEventListener('click', () => $('#about-dialog').showModal());
$('#close-about').addEventListener('click', () => $('#about-dialog').close());
$('#about-dialog').addEventListener('click', event => { if (event.target === $('#about-dialog')) { const rect = event.target.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close(); } });
function syncVideoPosition() {
  const cue = selectedRow(); if (cue?.start !== null && cue?.start < video.duration) video.currentTime = cue.start;
  updatePlayhead();
}
video.addEventListener('loadedmetadata', syncVideoPosition);
video.addEventListener('timeupdate', () => {
  if (state.cues[0].start === null) return;
  playhead = video.currentTime; updatePlayhead();
  const cue = rows.find(row => row.start <= playhead && row.end > playhead);
  if (cue && cue.id !== state.selected) { state.selected = cue.id; renderOverview(); renderTimeline(); renderEvidence(); updatePlayhead(); }
});
video.addEventListener('error', () => { if (videoKind !== 'none') toast('浏览器无法解码这个视频，请转换为 H.264 MP4 或 WebM；字幕仍可继续研究。', true); });
window.addEventListener('beforeunload', () => { if (objectURL) URL.revokeObjectURL(objectURL); });
if (videoKind === 'none') setVideo(null, 'none', '已恢复字幕 · 请重新关联本地视频');
render();
if (videoKind !== 'none' && video.readyState >= 1) syncVideoPosition();
if (restored) toast(state.sample ? '已恢复上次研究进度' : '已恢复字幕与取舍；本地视频需重新关联。');
