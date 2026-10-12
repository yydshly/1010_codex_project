import '@fontsource-variable/inter';
import './style.css';
import { Catalog } from '../app/catalog';
import { Store } from '../app/store';
import { Actions } from '../app/actions';
import { SceneController } from '../app/scene';
import { ModelService } from '../app/models';
import { Interaction } from '../app/interaction';
import { fitToPlinth, newInstance } from '../app/layout';
import type { CameraView, Group } from '../app/types';
import { buildCampEnvironment } from './environment';
import { CAMP_SAVE_KEY, PRESET, ZONES, NAMES, LABELS } from './preset';
import { CampMotion, CYCLE_SECONDS } from './motion';

const mount = document.querySelector<HTMLDivElement>('#app')!;
mount.innerHTML = `
  <header class="masthead">
    <a class="brand" href="./"><span class="brand-mark">M</span><span>MUSTER<small>程序化模型 · 场景实验 004</small></span></a>
    <div class="heading"><span class="eyebrow">FIELD STATION / 1944</span><h1>野战机场与集结营地</h1></div>
    <nav class="header-links" aria-label="演示入口"><a class="archive-link" href="./">研究首页 <span>↗</span></a><a class="archive-link" href="./airport.html">机场保卫战 <span>↗</span></a><a class="archive-link" href="./battle.html">自由演习 <span>↗</span></a>
    <a class="archive-link" href="./archive.html">浏览 74 个模型 <span>↗</span></a></nav>
  </header>
  <main class="workspace">
    <aside class="guide">
      <div class="section-caption">SCENE ATLAS <span>场景导览</span></div>
      <p class="intro">让素材成为场景。<br>从停机保障到人员集结，<br>探索模型之间的关系。</p>
      <nav aria-label="场景分区">${ZONES.map(z => `<button class="zone" data-zone="${z.id}"><span>${z.number}</span><strong>${z.name}</strong><i>↗</i></button>`).join('')}</nav>
      <div class="guide-note"><span class="pin">●</span><div><strong>1944 年风格 · 美军素材</strong><p>概念微缩陈列场景。场地经过压缩，未复原某场真实战役。</p></div></div>
      <div class="weather"><label for="light">场景光线</label><select id="light"><option value="day">晴日 · 细节观察</option><option value="warm">傍晚 · 暖色侧光</option></select></div>
      <button class="tour-button" id="tour">开始镜头导览 <span>▶</span></button>
      <small class="credit">模型 / Kenton Wang · MIT<br>场景与中文界面 / 本地研究实验</small>
    </aside>
    <section class="stage" aria-label="可编辑的三维营地">
      <div class="stage-top"><span class="live-dot"></span><span id="stage-label">正在准备场景</span><span class="scale">模型尺寸 · 米</span></div>
      <div class="motion-panel" aria-label="营地动态演示">
        <div class="motion-heading"><span id="motion-status">运输 · 巡逻 · 起降</span><output id="motion-clock">00:00 / 01:30</output></div>
        <div class="motion-actions"><button id="motion-play" class="motion-primary" disabled>▶ 开始动态演示</button><button id="motion-restart" disabled>↶ 重播</button><button id="motion-exit" disabled>返回布置</button><select id="motion-speed" aria-label="演示速度"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></div>
        <input id="motion-seek" type="range" min="0" max="${CYCLE_SECONDS}" step="0.1" value="0" aria-label="演示时间，拖动后暂停" disabled>
        <div class="motion-bottom"><small id="motion-hint">90 秒循环 · 空格暂停 / 继续 · 可拖动时间轴</small><label><input id="motion-follow" type="checkbox"> 跟随飞机</label></div>
        <div class="sound-controls"><label><input id="motion-sound" type="checkbox" checked> 发动机 / 脚步声</label><input id="motion-volume" type="range" min="0" max="100" value="35" aria-label="演示音量"><output id="sound-status">点击开始后启用声音</output></div>
      </div>
      <div class="loading" id="loading"><span class="loader"></span><h2>正在搭建野战营地</h2><p id="progress">载入资产目录…</p><small>模型由代码实际生成，请稍候</small></div>
      <div class="story"><span class="eyebrow" id="story-number">00 / 场景全览</span><h2 id="story-title"></h2><p id="story-detail"></p></div>
      <div class="canvas-tools"><button id="overview" title="回到全景">全景 ↗</button><button id="map" title="俯视场地">俯视 ⊞</button><button id="hide-ui" title="收起画面说明">纯净画面 ◇</button></div>
      <div class="gesture">左拖空地环绕 · 右拖平移 · 滚轮缩放 · 点击模型选中</div>
    </section>
    <aside class="inspector">
      <div class="section-caption">FIELD KIT <span>选中与编辑</span></div>
      <label class="group-label" for="group-list">场景中的模型组</label><select id="group-list"></select>
      <div id="selection-panel"></div>
      <div class="history"><button id="undo">↶ 撤销</button><button id="redo">↷ 重做</button></div>
      <div class="save-box"><span class="save-dot"></span><div><strong id="save-status">本机自动保存</strong><small>布局与镜头 · 刷新可恢复</small></div></div>
      <div class="file-actions"><button id="export">导出布局</button><button id="import">导入布局</button></div>
      <input id="file" type="file" accept="application/json,.json" hidden>
      <button class="reset" id="reset">恢复营地初始布置</button>
      <p class="keyboard">拖动模型改变位置 · Q / E 旋转<br>双击模型聚焦 · Ctrl+Z 撤销</p>
    </aside>
  </main>
  <footer class="statusbar"><div class="status-title">营地清单 <small>实际场景实例</small></div><div class="counts" id="counts">准备中…</div><div class="status-right"><span id="build-status">正在生成</span><span>WEBGL / LIVE 3D</span></div></footer>
  <div class="toast" role="status" id="toast" hidden></div>
  <dialog id="reset-dialog"><h2>恢复初始营地？</h2><p>当前布局将替换为预设营地，可通过撤销找回。导出的文件不会受影响。</p><div><button id="cancel-reset">取消</button><button class="primary" id="confirm-reset">恢复布置</button></div></dialog>`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => mount.querySelector<T>(selector)!;
const store = new Store(CAMP_SAVE_KEY);
const catalog = new Catalog(false);
const models = new ModelService();
const notify = (message: string) => {
  const toast = $('#toast'); toast.textContent = message; toast.hidden = false;
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.hidden = true, 4500);
};
let toastTimer = 0;
const actions = new Actions(store, catalog, notify);
const scene = new SceneController($('.stage'), store, catalog, models);
scene.rig.targetLimits = { x: 75, y: 40, z: 55 };
const interaction = new Interaction(scene, store, actions, catalog, models, notify);
const environment = buildCampEnvironment(); scene.studio.scene.add(environment.root);
const motion = new CampMotion(scene, i => ({ def: catalog.get(i.assetId)!, config: store.group(i.groupId)!.config }));
models.busy = () => interaction.busy;
actions.viewCenter = () => ({ x: scene.rig.target.x, z: scene.rig.target.z });
scene.onCameraSettled = () => store.setCamera(scene.rig.getView());
scene.onBuildError = (id, def, error, _failed, shown) => {
  console.error(`[fieldcamp] ${def.id} build failed`, error);
  if (shown) { store.silent(() => { store.group(id)!.config = { ...shown }; }); notify('该配置生成失败，已恢复之前的装备。'); }
  else { catalog.markBroken(def.id, error); notify(`${def.name} 生成失败，请查看控制台。`); }
};
let ready = false, editing = false, activeZone = 'overview', tourTimer = 0, tourIndex = 0;
let light = 'day';
function escape(value: string) { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); }
function named(g: Group) { return NAMES[g.assetId] ?? catalog.get(g.assetId)?.name ?? g.assetId; }
function selected() { return store.group(store.selection?.groupId); }
function focus() {
  if (motion.active) $<HTMLInputElement>('#motion-follow').checked = false;
  const s = store.selection;
  const boxes = s ? scene.modelBoxes(s.groupId, s.slot) : scene.modelBoxes();
  if (boxes.length) scene.rig.frameBoxes(boxes, { animate: true, fit: 1.2 });
}
interaction.onFocusRequest = focus;

async function settle() {
  for (let i = 0; i < 80; i++) {
    await models.whenIdle(0); await scene.whenCompiled(); await scene.whenRendered();
    if (models.pendingAt(0) === 0 && scene.preparingCount() === 0) return;
  }
  throw new Error('模型未能准备完成');
}
function makePreset(): Group[] {
  return PRESET.map(p => {
    const def = catalog.get(p.assetId);
    if (!def || !catalog.placeable(p.assetId)) throw new Error(`场景素材不可用：${p.assetId}`);
    const g: Group = { id: p.id, assetId: p.assetId, config: actions.normalizeConfig(def, p.config),
      quantity: p.n, formation: p.formation ?? 'single', spacing: p.spacing ?? def.spacing.default,
      columns: p.columns ?? 'auto', heading: p.heading, anchor: { x: p.x, z: p.z },
      instances: Array.from({ length: p.n }, (_, i) => newInstance(i)) };
    fitToPlinth(g, def); return g;
  });
}
function navigate(zone: string, animate = true) {
  const z = ZONES.find(z => z.id === zone)!; activeZone = z.id;
  scene.rig.setView(z.view, animate);
  if (motion.active) { $<HTMLInputElement>('#motion-follow').checked = zone === 'flight'; if (zone === 'flight') updateMotion(); }
  const g = store.group(z.group) ?? store.groups.find(g => g.assetId === PRESET.find(p => p.id === z.group)?.assetId);
  store.select(g ? { groupId: g.id, slot: null } : null);
  $('#story-number').textContent = `${z.number} / ${z.name}`;
  $('#story-title').textContent = z.subtitle; $('#story-detail').textContent = z.detail;
  document.querySelectorAll<HTMLElement>('[data-zone]').forEach(b => b.classList.toggle('active', b.dataset.zone === zone));
  $('#stage-label').textContent = z.name; scene.requestRender();
}
function stopTour() { clearTimeout(tourTimer); tourTimer = 0; $('#tour').innerHTML = '开始镜头导览 <span>▶</span>'; }
function tourStep() {
  navigate(ZONES[tourIndex % ZONES.length].id); tourIndex++;
  tourTimer = window.setTimeout(tourStep, 8500);
}
function setLight(value: string) {
  light = value; const warm = value === 'warm', s = scene.studio;
  s.key.color.set(warm ? '#ffd08b' : '#fff1e0'); s.key.intensity = warm ? 2.3 : 2.6;
  s.fill.color.set(warm ? '#a6b8d5' : '#dfe7f2'); s.fill.intensity = warm ? 0.35 : 0.55;
  s.hemi.intensity = warm ? 0.23 : 0.35; s.scene.environmentIntensity = warm ? 0.32 : 0.55;
  s.renderer.toneMappingExposure = warm ? 0.92 : 1;
  environment.setWarm(warm); scene.requestRender();
}

function update() {
  const locked = motion.active || motion.preparing;
  const counts = scene.counts();
  $('#counts').innerHTML = `<span><b>${counts.total.aircraft}</b> 飞机</span><span><b>${counts.total.vehicles}</b> 车辆</span><span><b>${counts.total.artillery}</b> 火炮</span><span><b>${counts.total.personnel}</b> 人员</span><span class="count-total"><b>${counts.models}</b> 总计</span>`;
  $('#build-status').textContent = scene.preparingCount() ? `${scene.preparingCount()} 组准备中` : ready ? '场景已就绪' : '正在生成';
  $<HTMLButtonElement>('#undo').disabled = !store.canUndo || !ready || editing || locked;
  $<HTMLButtonElement>('#redo').disabled = !store.canRedo || !ready || editing || locked;
  for (const id of ['import', 'reset']) $<HTMLButtonElement>('#' + id).disabled = !ready || editing || locked;
  const g = selected(), def = g && catalog.get(g.assetId);
  const list = $<HTMLSelectElement>('#group-list');
  list.innerHTML = '<option value="">选择一个模型组…</option>' + store.groups.map(p => `<option value="${escape(p.id)}">${escape(named(p))} · ${p.instances.length}</option>`).join('');
  list.value = g?.id ?? '';
  if (!g || !def) { $('#selection-panel').innerHTML = '<div class="empty-selection">点击场景中的模型<br>查看装备与编队选项</div>'; return; }
  const options = (def.options ?? []).map(o => {
    const label = escape(LABELS[o.id] ?? o.label);
    if (o.kind === 'toggle') return `<label class="toggle"><span>${label}</span><input data-option="${o.id}" type="checkbox" ${g.config[o.id] ? 'checked' : ''} ${editing || locked ? 'disabled' : ''}></label>`;
    return `<label class="select-option">${label}<select data-option="${o.id}" ${editing || locked ? 'disabled' : ''}>${o.choices.map(c => `<option value="${c.id}" ${g.config[o.id] === c.id ? 'selected' : ''}>${escape(LABELS[c.id] ?? c.label)}</option>`).join('')}</select></label>`;
  }).join('');
  const cap = Math.min(actions.capFor(g).cap, g.assetId === 'us-rifleman' ? 20 : def.category === 'Aircraft' ? 2 : 4);
  const disabled = editing || !ready || locked ? 'disabled' : '';
  $('#selection-panel').innerHTML = `<div class="asset-title"><span>${def.category.toUpperCase()} / US</span><h2>${escape(def.name)}</h2><p>${locked ? '动态演示中 · 返回布置后可编辑' : store.selection?.slot !== null ? `选中组内模型 ${(store.selection?.slot ?? 0) + 1}` : '整组编辑 · 拖动模型即可移动'}</p></div>
    <button class="focus-button" id="focus">聚焦此组 ↗</button>
    <div class="control-section"><h3>编队与布置</h3><div class="quantity"><label for="quantity">数量</label><div><button id="decrease" ${disabled} ${g.quantity <= 1 ? 'disabled' : ''}>−</button><input id="quantity" type="number" min="1" max="${cap}" value="${g.quantity}" ${disabled}><button id="increase" ${disabled} ${g.quantity >= cap ? 'disabled' : ''}>+</button></div></div>
    <label class="select-option">队形<select id="formation" ${disabled}><option value="single" ${g.formation === 'single' ? 'selected' : ''}>单个</option><option value="line" ${g.formation === 'line' ? 'selected' : ''}>横队</option><option value="grid" ${g.formation === 'grid' ? 'selected' : ''}>网格</option></select></label>
    <label class="spacing">间距 <output>${g.spacing.toFixed(1)} m</output><input id="spacing" type="range" min="${def.spacing.min}" max="${def.spacing.max}" step="0.1" value="${g.spacing}" ${disabled}></label>
    <div class="rotate"><button id="rotate-left" ${disabled}>↶ 转向 15°</button><button id="rotate-right" ${disabled}>转向 15° ↷</button></div></div>
    <div class="control-section equipment"><h3>装备配置 <small>${scene.preparingCount() && editing ? '生成中…' : '实际模型'}</small></h3>${options || '<p class="fixed-model">该素材为固定配置，可调整数量与布局。</p>'}</div>
    <a class="source-link" href="${NAMES[def.id] ? `./harness.html?asset=${encodeURIComponent('usa/' + def.id.slice(3))}&ref=1` : './archive.html'}" target="_blank" rel="noopener">六视图与比例参照 ↗</a>`;
  $('#focus').onclick = focus;
  const quantity = (n: number) => actions.setQuantity(g.id, Math.max(1, Math.min(n, cap)));
  $('#decrease').onclick = () => quantity(g.quantity - 1); $('#increase').onclick = () => quantity(g.quantity + 1);
  $<HTMLInputElement>('#quantity').onchange = e => quantity(Number((e.target as HTMLInputElement).value));
  $<HTMLSelectElement>('#formation').onchange = e => actions.setFormation(g.id, (e.target as HTMLSelectElement).value as Group['formation']);
  // 在 change 提交一次，避免重绘打断滑块拖动；输入过程中只更新数值提示。
  $<HTMLInputElement>('#spacing').oninput = e => $('#selection-panel output').textContent = Number((e.target as HTMLInputElement).value).toFixed(1) + ' m';
  $<HTMLInputElement>('#spacing').onchange = e => actions.setSpacing(g.id, Number((e.target as HTMLInputElement).value));
  $('#rotate-left').onclick = () => actions.rotateBy(g.id, store.selection?.slot ?? null, -15);
  $('#rotate-right').onclick = () => actions.rotateBy(g.id, store.selection?.slot ?? null, 15);
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-option]').forEach(input => input.onchange = () => {
    void edit(async () => { actions.setConfig(g.id, { [input.dataset.option!]: input instanceof HTMLInputElement ? input.checked : input.value }); await settle(); });
  });
}
let updateQueued = false;
function queueUI() { if (!updateQueued) { updateQueued = true; queueMicrotask(() => { updateQueued = false; update(); }); } }
store.on(event => {
  if (event.layout) scene.sync(); else if (event.selection) scene.updateMarkers();
  queueUI();
});
scene.onUpdate = queueUI;
async function edit(task: () => Promise<void>) {
  if (!ready || editing || motion.active || motion.preparing) return; editing = true; update();
  try { await task(); } catch (error) { console.error(error); notify('操作失败：' + String((error as Error).message)); }
  finally { editing = false; update(); }
}
document.querySelectorAll<HTMLElement>('[data-zone]').forEach(b => b.onclick = () => { if (ready) { stopTour(); navigate(b.dataset.zone!); } });
$('#overview').onclick = () => { stopTour(); navigate('overview'); };
$('#map').onclick = () => { stopTour(); $<HTMLInputElement>('#motion-follow').checked = false; scene.rig.setView({ target: [0, 0, 0], distance: 123, yaw: 0, pitch: 87 }, true); };
$('#hide-ui').onclick = () => { $('.stage').classList.toggle('clean'); $('#hide-ui').textContent = $('.stage').classList.contains('clean') ? '恢复说明 ◇' : '纯净画面 ◇'; };
$('#tour').onclick = () => { if (!ready) return; if (tourTimer) stopTour(); else { tourIndex = 0; tourStep(); $('#tour').innerHTML = '暂停镜头导览 <span>Ⅱ</span>'; } };
scene.canvas.addEventListener('pointerdown', stopTour);
$<HTMLSelectElement>('#light').onchange = e => setLight((e.target as HTMLSelectElement).value);
$<HTMLSelectElement>('#group-list').onchange = e => store.select((e.target as HTMLSelectElement).value ? { groupId: (e.target as HTMLSelectElement).value, slot: null } : null);
$('#undo').onclick = () => store.undo(); $('#redo').onclick = () => store.redo();
$('#export').onclick = () => {
  if (!ready) return;
  const data = { kind: 'muster-fieldcamp', v: 1, groups: store.groups, camera: scene.rig.getView() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'muster-fieldcamp-layout.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); notify('已导出营地布局，可通过导入恢复。');
};
$('#import').onclick = () => { if (ready && !editing) $<HTMLInputElement>('#file').click(); };
$<HTMLInputElement>('#file').onchange = async e => {
  const input = e.target as HTMLInputElement, file = input.files?.[0]; if (!file) return;
  await edit(async () => {
    if (file.size > 2_000_000) throw new Error('布局文件过大');
    const data = JSON.parse(await file.text());
    if (data.kind !== 'muster-fieldcamp' || data.v !== 1 || !Array.isArray(data.groups) || !data.groups.length || data.groups.length > 100) throw new Error('请选择此场景导出的布局 JSON');
    // 在临时 Store 中使用原版 restore 校验、规范化，不让无效文件破坏当前场景。
    const candidate = new Store(CAMP_SAVE_KEY); candidate.autosave = false;
    const check = new Actions(candidate, catalog, () => undefined).restore(data.groups);
    if (check.skipped || check.dormant || check.restored !== data.groups.length) throw new Error('文件包含无效或不可用模型');
    const total = candidate.groups.reduce((n, g) => n + g.instances.length, 0);
    if (total > 60) throw new Error('营地演示最多导入 60 个模型');
    await Promise.all(candidate.groups.map(g => models.request(catalog.get(g.assetId)!, g.config, 0)));
    store.commit('导入营地', () => { store.groups = candidate.groups; store.dormant = []; });
    await settle(); navigate('overview'); if (validView(data.camera)) scene.rig.setView(data.camera); notify(`已导入 ${total} 个模型，可撤销。`);
  }); input.value = '';
};
const dialog = $<HTMLDialogElement>('#reset-dialog');
$('#reset').onclick = () => { if (ready && !editing) dialog.showModal(); };
$('#cancel-reset').onclick = () => dialog.close();
$('#confirm-reset').onclick = () => { dialog.close(); void edit(async () => {
  store.commit('恢复营地', () => { store.groups = makePreset(); store.dormant = []; });
  await settle(); navigate('overview'); notify('已恢复初始营地，可撤销。');
}); };
window.addEventListener('keydown', e => {
  if (!ready || editing || dialog.open || (e.target as HTMLElement).closest('input,select,textarea,button')) return;
  if (e.code === 'Space') { e.preventDefault(); void toggleMotion(); return; }
  if (motion.active || motion.preparing) { if (e.key.toLowerCase() === 'f') focus(); return; }
  const g = selected();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); }
  else if (g && ['q', 'e'].includes(e.key.toLowerCase())) actions.rotateBy(g.id, store.selection?.slot ?? null, e.key.toLowerCase() === 'q' ? -15 : 15);
  else if (e.key.toLowerCase() === 'f') focus();
});
window.addEventListener('pagehide', () => store.save());

function updateMotion() {
  const m = motion.getState(), clock = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  $('#motion-clock').textContent = `${clock(m.time)} / 01:30`;
  $('#motion-status').textContent = m.preparing ? '正在准备动作…' : m.active ? `${m.playing ? '运行中' : '已暂停'} · ${m.phase}` : '运输 · 巡逻 · 起降';
  $('#motion-play').textContent = m.active ? m.playing ? 'Ⅱ 暂停演示' : '▶ 继续演示' : '▶ 开始动态演示';
  $<HTMLButtonElement>('#motion-play').disabled = !ready || editing || m.preparing;
  for (const id of ['motion-restart', 'motion-exit']) $<HTMLButtonElement>('#' + id).disabled = !m.active || m.preparing;
  const seek = $<HTMLInputElement>('#motion-seek'); seek.disabled = !m.active || m.preparing; seek.value = String(m.time);
  $('#motion-hint').textContent = m.active ? '动态布置 · 拖动时间轴查看阶段 · 返回布置可编辑' : '90 秒循环 · 空格暂停 / 继续 · 可拖动时间轴';
  const sound = m.audio;
  $('#sound-status').textContent = sound.issue ? '声音不可用' : !sound.enabled ? '已静音' : m.preparing ? '等待动作就绪' : !m.active ? '点击开始后启用声音' : !m.playing ? '声音已暂停' : sound.context === 'running' ? '空间声场 · ' + Math.round(sound.volume * 100) + '%' : '点击声音开关启用';
  interaction.enabled = !m.active && !m.preparing;
  $('.gesture').textContent = m.active ? '左拖环绕 · 右拖平移 · 滚轮缩放 · 空格暂停 / 继续' : '左拖空地环绕 · 右拖平移 · 滚轮缩放 · 点击模型选中';
  if (m.active && $<HTMLInputElement>('#motion-follow').checked) {
    const aircraft = m.actors.find(a => a.kind === 'aircraft');
    if (aircraft) scene.rig.setView({ target: [aircraft.position[0], aircraft.position[1] + 1.5, aircraft.position[2]], yaw: 28, pitch: 28, distance: 42 });
  }
}
let lastMotionLock = false;
motion.onChange = () => { updateMotion(); const lock = motion.active || motion.preparing; if (lock !== lastMotionLock) { lastMotionLock = lock; update(); } };
async function toggleMotion() {
  if (!ready || editing || motion.preparing) return;
  if (motion.active) { motion.playing ? motion.pause() : motion.play(); return; }
  stopTour(); motion.audio.unlock();
  try { await motion.enter(); scene.rig.setView({ target: [-4, 3, -8], yaw: 28, pitch: 48, distance: 153 }, true); }
  catch (error) { console.error(error); notify('动作准备失败：' + String(error)); }
}
$('#motion-play').onclick = () => { void toggleMotion(); };
$('#motion-restart').onclick = () => motion.restart();
$('#motion-exit').onclick = () => { motion.exit(); navigate('overview'); notify('已恢复保存的布置，可继续编辑。'); };
$<HTMLInputElement>('#motion-seek').oninput = e => motion.seek(Number((e.target as HTMLInputElement).value));
$<HTMLSelectElement>('#motion-speed').onchange = e => motion.setSpeed(Number((e.target as HTMLSelectElement).value));
$<HTMLInputElement>('#motion-follow').onchange = updateMotion;
$<HTMLInputElement>('#motion-sound').onchange = e => motion.audio.setEnabled((e.target as HTMLInputElement).checked);
$<HTMLInputElement>('#motion-volume').oninput = e => motion.audio.setVolume(Number((e.target as HTMLInputElement).value) / 100);
document.addEventListener('visibilitychange', () => { if (document.hidden && motion.playing) motion.pause(); });

// 小型只读验收入口；实际操作由控件与鼠标触发，不提供绕过 UI 的编辑捷径。
const qa = {
  getState: () => ({ ready, editing, zone: activeZone, light, touring: !!tourTimer, catalog: catalog.listed().length,
    groups: JSON.parse(JSON.stringify(store.groups)), selection: store.selection, counts: scene.counts(),
    preparing: scene.preparingCount(), camera: scene.rig.getView(), issues: catalog.issues, models: models.stats(), motion: motion.getState(), render: scene.renderStats(),
    poses: scene.renderedInstances().map(i => ({ groupId: i.groupId, slot: i.slot, position: i.root.position.toArray(), quaternion: i.root.quaternion.toArray() })) }),
  hitPoint: (id: string, slot = 0) => scene.clientHitPoint(id, slot),
};
Object.assign(window, { __camp: qa, __campReady: false });
async function boot() {
  store.autosave = false; await catalog.load();
  if (catalog.issues.length) throw new Error('资产目录加载异常');
  $('#progress').textContent = '生成 8 类飞机、车辆、火炮与人物…';
  const saved = Store.loadSaved(CAMP_SAVE_KEY);
  if (saved?.groups.length && saved.groups.length <= 100 && saved.groups.reduce((n, g) => n + (g.instances?.length ?? 0), 0) <= 60) {
    const result = actions.restore(saved.groups);
    if (!result.restored) store.groups = makePreset();
  } else store.groups = makePreset();
  scene.sync(); await settle();
  ready = true; navigate('overview', false);
  if (validView(saved?.camera)) scene.rig.setView(saved.camera);
  store.clearHistory(); store.autosave = true; store.setCamera(scene.rig.getView()); store.save();
  $('#loading').hidden = true; Object.assign(window, { __campReady: true }); update(); updateMotion();
}
function validView(v: unknown): v is CameraView {
  const c = v as CameraView | undefined;
  return !!c && Array.isArray(c.target) && c.target.length === 3 && c.target.every(Number.isFinite) && [c.distance, c.yaw, c.pitch].every(Number.isFinite);
}
void boot().catch(error => { console.error(error); $('#progress').textContent = `场景准备失败：${String(error.message ?? error)}。请刷新重试。`; $('#loading h2').textContent = '场景未能就绪'; $('#loading .loader').hidden = true; });

// 首页内嵌使用同一暂停逻辑；只接受同源父页面的有限控制指令。
window.addEventListener('message', event => {
  if (window.parent === window || event.source !== window.parent || event.origin !== location.origin || event.data?.type !== 'muster-hub') return;
  if (event.data.action === 'pause' && motion.playing) motion.pause();
  if (event.data.action === 'resume' && motion.active && !motion.playing && ready && !motion.preparing) motion.play();
  window.parent.postMessage({ type: 'muster-hub-status', ready, active: motion.active, playing: motion.playing }, location.origin);
});


if (window.parent !== window) document.querySelectorAll<HTMLAnchorElement>('header a, nav a').forEach(a => { a.target = '_top'; });

