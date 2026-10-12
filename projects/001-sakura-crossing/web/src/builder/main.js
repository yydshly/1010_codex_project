import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pipeline } from '../rendering/post.js';
import { createWorld } from './world.js';
import { STORAGE_KEY, MAX_OBJECTS, TYPES, bounds, clone, createDefaultProject, validateProject, addObject, moveObject, rotateObject, removeObject, History, readSave, writeSave } from './model.js';
import licenseUrl from '../../licenses/sakura-crossing-MIT.txt?url&no-inline';
import './style.css';

const $ = (id) => document.getElementById(id);
$('license-link').href = licenseUrl;
function start() {
  const abort = new AbortController(), signal = abort.signal;
  const listen = (target, type, fn) => target.addEventListener(type, fn, { signal });
  const canvas = $('builder-scene'), stage = $('builder-stage');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#dbe5dc'); scene.fog = new THREE.Fog('#dbe5dc', 85, 150);
  const camera = new THREE.PerspectiveCamera(42, 1, .2, 220);
  const sun = new THREE.DirectionalLight('#fff0d1', 2.25); sun.position.set(-18, 28, 16); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 100 });
  sun.shadow.normalBias = .04; sun.shadow.bias = -.0003; scene.add(sun);
  const fill = new THREE.DirectionalLight('#c7c6e6', .78); fill.position.set(15, 10, -5); scene.add(fill);
  scene.add(new THREE.HemisphereLight('#d7e5e2', '#b5aa9b', 1.25));
  const pipeline = new Pipeline(renderer, scene, camera, { pixelBudget: 2.2e6 }); pipeline.forceScale = 1.5;
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.enablePan = false;
  controls.minPolarAngle = .3; controls.maxPolarAngle = Math.PI / 2 - .12; controls.minDistance = 20; controls.maxDistance = 140;
  controls.enabled = false;
  const world = createWorld(scene), history = new History();
  let project = createDefaultProject(), selected = null, savedSignature = null, savedAt = null, mode = 'edit', drag = null, inView = true, disposed = false, raf = 0;
  let initialMessage = '先添加一个物件，或拖动现有的小屋。';
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.1), groundPoint = new THREE.Vector3();
  const status = (message, error = false) => { $('builder-status').textContent = message; $('builder-status').dataset.error = String(error); };
  function updateSaved(save) {
    savedAt = save?.savedAt || null; savedSignature = save ? JSON.stringify(save.project) : null;
    $('reload-project').disabled = !save;
    $('saved-time').textContent = save ? '本机保存于 ' + new Date(save.savedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '本机尚无有效存档';
  }
  try { const save = readSave(window.localStorage); if (save) { project = save.project; initialMessage = '已恢复上次保存的小镇。'; } updateSaved(save); }
  catch { initialMessage = '本机存档无法读取，先打开示例；原存档未自动覆盖，可导出 JSON 备份。'; }
  function currentItem() { return project.objects.find((item) => item.id === selected); }
  function updateDirty() {
    const dirty = JSON.stringify(project) !== savedSignature;
    $('save-state').textContent = savedSignature == null ? '尚未保存' : dirty ? '有未保存修改' : '已保存到本机';
    $('save-state').dataset.dirty = String(dirty);
    $('undo').disabled = !history.past.length; $('redo').disabled = !history.future.length;
  }
  function inspector() {
    const item = currentItem(); world.select(item);
    $('selection-controls').disabled = !item; $('selection-empty').hidden = !!item;
    $('selection-type').textContent = item ? TYPES[item.type].name : '未选择';
    $('selection-name').textContent = item ? TYPES[item.type].name + ' ' + item.id.split('-')[1] : '—';
    $('selection-id').textContent = item?.id || '—';
    if (item) {
      $('position-x').value = item.x; $('position-z').value = item.z; $('rotation-value').textContent = item.rotation * 90 + '°';
      const half = bounds(item); $('position-x').min = -Math.floor(20 - half.x); $('position-x').max = Math.floor(20 - half.x); $('position-z').min = -Math.floor(20 - half.z); $('position-z').max = Math.floor(20 - half.z);
    }
    $('selected-label').hidden = !item;
    $('selected-label').textContent = item ? TYPES[item.type].name + ' ' + item.id.split('-')[1] : '';
  }
  function renderUI() {
    if (!currentItem()) selected = null;
    $('project-name').value = project.name; $('scene-project-name').textContent = project.name; $('theme').value = project.theme;
    $('ink-enabled').checked = project.style.ink; $('grade-enabled').checked = project.style.grade;
    pipeline.setStyle(project.style); world.sync(project); scene.updateMatrixWorld(true);
    $('object-count').textContent = project.objects.length + ' / ' + MAX_OBJECTS;
    const counts = ['house', 'tree', 'road'].map((type) => project.objects.filter((item) => item.type === type).length);
    $('town-counts').textContent = `${counts[0]} 栋房屋 · ${counts[1]} 棵树 · ${counts[2]} 段道路`;
    $('empty-note').hidden = !!project.objects.length;
    $('object-list').replaceChildren();
    for (const item of project.objects) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.objectId = item.id; button.dataset.type = item.type; button.dataset.x = item.x; button.dataset.z = item.z;
      button.setAttribute('aria-pressed', String(item.id === selected));
      const title = document.createElement('span'), position = document.createElement('small'); title.textContent = TYPES[item.type].name + ' ' + item.id.split('-')[1]; position.textContent = `X ${item.x} · Z ${item.z}`; button.append(title, position); $('object-list').append(button);
    }
    document.querySelectorAll('[data-add]').forEach((button) => { button.disabled = project.objects.length >= MAX_OBJECTS; });
    inspector(); updateDirty();
    stage.dataset.ready = 'true'; stage.dataset.objectCount = project.objects.length;
  }
  function commit(next, message) {
    const clean = validateProject(next);
    history.record(project, clean); project = clean; renderUI(); if (message) status(message);
  }
  function modify(fn, message) {
    const previousSelection = selected;
    try { const next = clone(project); fn(next); commit(next, message); } catch (error) { selected = previousSelection; renderUI(); status(error.message, true); }
  }
  function choose(id) { selected = id; renderUI(); }
  function finishDrag(cancel = false) {
    if (!drag) return;
    const previous = drag; drag = null;
    if (canvas.hasPointerCapture(previous.pointerId)) canvas.releasePointerCapture(previous.pointerId);
    if (cancel) { project = previous.before; renderUI(); status('已取消本次拖动。'); }
    else { const changed = history.record(previous.before, project); renderUI(); if (changed) status('已移动物件，可撤销或保存。'); }
    stage.classList.remove('dragging');
  }
  function setMode(next) {
    finishDrag(true); mode = next; controls.enabled = mode === 'orbit';
    document.querySelectorAll('[data-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    stage.dataset.mode = mode;
    $('mode-help').textContent = mode === 'edit' ? '点击选中 · 拖动移动 · 坐标吸附 1 格' : '拖动环顾 · 滚轮缩放 · 切回编辑移动物件';
  }
  function screenRay(event) {
    const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    scene.updateMatrixWorld(true); raycaster.setFromCamera(pointer, camera);
  }
  listen(canvas, 'pointerdown', (event) => {
    if (mode !== 'edit' || !event.isPrimary || event.button !== 0) return;
    screenRay(event); const hit = raycaster.intersectObjects(world.hits, false)[0];
    if (!hit) { choose(null); return; }
    choose(hit.object.userData.objectId); canvas.focus({ preventScroll: true });
    if (!raycaster.ray.intersectPlane(ground, groundPoint)) return;
    const item = currentItem(); drag = { pointerId: event.pointerId, before: clone(project), startX: event.clientX, startY: event.clientY, offsetX: item.x - groundPoint.x, offsetZ: item.z - groundPoint.z };
    canvas.setPointerCapture(event.pointerId);
  });
  listen(canvas, 'pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4) return;
    screenRay(event); if (!raycaster.ray.intersectPlane(ground, groundPoint)) return;
    moveObject(project, selected, groundPoint.x + drag.offsetX, groundPoint.z + drag.offsetZ);
    world.sync(project); inspector(); updateDirty(); stage.classList.add('dragging');
  });
  listen(canvas, 'pointerup', (event) => { if (drag?.pointerId === event.pointerId) finishDrag(); });
  listen(canvas, 'pointercancel', () => finishDrag(true));
  listen(canvas, 'lostpointercapture', () => { if (drag) finishDrag(true); });
  listen($('object-list'), 'click', (event) => {
    const button = event.target.closest('[data-object-id]'); if (!button) return;
    choose(button.dataset.objectId); $('object-list').querySelector(`[data-object-id="${selected}"]`)?.focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-add]').forEach((button) => listen(button, 'click', () => modify((next) => { selected = addObject(next, button.dataset.add); }, '已添加' + TYPES[button.dataset.add].name + '，拖动或输入坐标来移动。')));
  document.querySelectorAll('[data-mode]').forEach((button) => listen(button, 'click', () => setMode(button.dataset.mode)));
  document.querySelectorAll('[data-nudge]').forEach((button) => listen(button, 'click', () => {
    const item = currentItem(); if (!item) return; const [x, z] = button.dataset.nudge.split(',').map(Number);
    modify((next) => moveObject(next, selected, item.x + x, item.z + z), '已按网格移动物件。');
  }));
  listen($('position-form'), 'submit', (event) => { event.preventDefault(); if ($('position-form').reportValidity()) modify((next) => moveObject(next, selected, Number($('position-x').value), Number($('position-z').value)), '已应用坐标。'); });
  listen($('rotate-object'), 'click', () => modify((next) => rotateObject(next, selected), '已旋转 90°。'));
  function deleteSelected() { if (currentItem()) modify((next) => removeObject(next, selected), '物件已删除，可撤销。'); }
  listen($('delete-object'), 'click', deleteSelected);
  function undo() { finishDrag(true); const next = history.undo(project); if (next) { project = next; renderUI(); status('已撤销上一次修改。'); } }
  function redo() { finishDrag(true); const next = history.redo(project); if (next) { project = next; renderUI(); status('已重做上一次修改。'); } }
  listen($('undo'), 'click', undo); listen($('redo'), 'click', redo);
  listen(document, 'keydown', (event) => {
    if (event.target.closest('input,textarea,select,[contenteditable=true]')) return;
    if (event.key === 'Escape') { finishDrag(true); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return; }
    if (drag) return;
    if (event.key === 'Delete') { event.preventDefault(); deleteSelected(); }
    const nudge = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    const item = currentItem(); if (nudge && item && mode === 'edit') { event.preventDefault(); modify((next) => moveObject(next, selected, item.x + nudge[0], item.z + nudge[1]), '已按网格移动物件。'); }
  });
  listen($('project-name'), 'change', () => modify((next) => { next.name = $('project-name').value; }, '小镇名称已更新。'));
  listen($('theme'), 'change', () => modify((next) => { next.theme = $('theme').value; }, '已更新小镇配色。'));
  for (const id of ['ink', 'grade']) listen($(id + '-enabled'), 'change', () => modify((next) => { next.style[id] = $(id + '-enabled').checked; }, '画面设置已更新。'));
  listen($('grid-visible'), 'change', () => { world.grid.visible = $('grid-visible').checked; });
  listen($('save-project'), 'click', () => {
    finishDrag();
    try { updateSaved(writeSave(window.localStorage, project)); updateDirty(); status('小镇已保存到本机。刷新或重新加载可恢复。'); }
    catch (error) { status('保存未成功，当前编辑仍保留；请导出 JSON 备份。' + error.message, true); }
  });
  listen($('reload-project'), 'click', () => {
    finishDrag(true);
    try { const save = readSave(window.localStorage); if (!save) throw new Error('本机没有存档。'); commit(save.project, '已恢复上次保存的小镇，刚才的修改可撤销找回。'); updateSaved(save); updateDirty(); }
    catch (error) { status('重新加载未成功，当前小镇未被替换。' + error.message, true); }
  });
  listen($('load-example'), 'click', () => { finishDrag(true); commit(createDefaultProject(), '已载入初始示例；原修改可撤销，本机存档未被覆盖。'); });
  listen($('export-project'), 'click', () => {
    finishDrag(); const url = URL.createObjectURL(new Blob([JSON.stringify(validateProject(project), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'sakura-town.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); status('已导出当前小镇 JSON，可用于备份或重新导入。');
  });
  listen($('import-project'), 'click', () => $('import-file').click());
  listen($('import-file'), 'change', async () => {
    const file = $('import-file').files[0]; if (!file) return;
    try {
      if (file.size > 128 * 1024) throw new Error('配置文件需小于 128 KB。');
      const next = validateProject(JSON.parse(await file.text())); finishDrag(true); commit(next, '已导入小镇，可撤销；点击保存将它留在本机。');
    } catch (error) { status('导入失败，当前小镇保持原样。' + error.message, true); }
    finally { $('import-file').value = ''; }
  });
  listen(window, 'storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    try { updateSaved(readSave(window.localStorage)); updateDirty(); status('本机存档在另一页发生变化，当前编辑保留；可重新加载。'); }
    catch { status('另一页的存档无法读取，当前编辑保留。', true); }
  });
  function resetCamera() {
    controls.enableDamping = false; controls.update(); controls.target.set(0, 1, 0);
    const direction = new THREE.Vector3(.63, .9, 1).normalize();
    const right = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanH = tanV * camera.aspect;
    const offset = new THREE.Vector3(); let distance = 58;
    // Fit the ground and object height at every aspect ratio, including portrait screens.
    for (const x of [-20, 20]) for (const y of [0, 7]) for (const z of [-20, 20]) {
      offset.set(x, y - controls.target.y, z);
      distance = Math.max(distance, offset.dot(direction) + Math.max(Math.abs(offset.dot(right)) / (tanH * .9), Math.abs(offset.dot(up)) / (tanV * .85)));
    }
    camera.position.copy(direction).multiplyScalar(distance).add(controls.target);
    controls.maxDistance = Math.max(140, distance * 2);
    scene.fog.near = distance + 25; scene.fog.far = distance + 100;
    controls.update(); controls.enableDamping = true;
  }
  listen($('reset-camera'), 'click', resetCamera);
  function resize() { const width = stage.clientWidth, height = stage.clientHeight; camera.aspect = width / height; camera.updateProjectionMatrix(); pipeline.setSize(width, height); resetCamera(); }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);
  const visibilityObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { threshold: .01 }); visibilityObserver.observe(stage);
  function frame() {
    if (disposed) return;
    if (!document.hidden && inView) {
      controls.update(); const item = currentItem();
      if (item) { const point = world.projectAnchor(item).project(camera); $('selected-label').style.left = ((point.x + 1) / 2 * stage.clientWidth) + 'px'; $('selected-label').style.top = ((1 - point.y) / 2 * stage.clientHeight) + 'px'; }
      pipeline.render();
    }
    raf = requestAnimationFrame(frame);
  }
  listen(canvas, 'webglcontextlost', (event) => { event.preventDefault(); finishDrag(true); $('scene-error').hidden = false; $('scene-error').textContent = '图形上下文已丢失。请先导出 JSON 备份，再刷新。'; });
  function dispose() { if (disposed) return; disposed = true; cancelAnimationFrame(raf); abort.abort(); resizeObserver.disconnect(); visibilityObserver.disconnect(); controls.dispose(); world.dispose(); sun.shadow.dispose(); pipeline.dispose(); renderer.dispose(); }
  listen(window, 'pagehide', (event) => { if (!event.persisted) dispose(); });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
  renderUI(); setMode('edit'); resize(); status(initialMessage); raf = requestAnimationFrame(frame);
}
try { start(); }
catch (error) { console.error('Town builder initialization failed:', error); $('scene-error').hidden = false; $('scene-error').textContent = '小镇暂时无法呈现，请使用支持 WebGL 2 的浏览器并刷新。'; document.querySelectorAll('button,input,select').forEach((control) => { control.disabled = true; }); }
