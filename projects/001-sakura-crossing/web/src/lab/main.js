import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pipeline } from '../rendering/post.js';
import { setOutlineResolution } from '../rendering/outline.js';
import { toonDiagnostics } from '../rendering/toon.js';
import { SCENES, createConfig } from './configs.js';
import { buildComponents } from './components.js';
import { FrameMetrics, summarize } from './metrics.js';
import licenseURL from '../../licenses/sakura-crossing-MIT.txt?url&no-inline';
import './style.css';
import '../directions/lab-links.css';

const $ = (id) => document.getElementById(id);
$('license-link').href = licenseURL;
const PRESETS = {
  spring: { bands: 3, shadowTint: '#6c5f8c', inkWidth: 1.2, saturation: 1.12, warmth: .05, sunlight: 2.25, ink: true, grade: true },
  ink: { bands: 2, shadowTint: '#526b88', inkWidth: 1.65, saturation: .8, warmth: 0, sunlight: 2.15, ink: true, grade: true },
};

function downloadJSON(name, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function start() {
  const abort = new AbortController(), signal = abort.signal;
  const listen = (el, event, fn) => el.addEventListener(event, fn, { signal });
  const stage = $('stage'), canvas = $('lab-scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  const sky = document.createElement('canvas'); sky.width = 2; sky.height = 256;
  const ctx = sky.getContext('2d'), grad = ctx.createLinearGradient(0, 0, 0, 256); grad.addColorStop(0, '#b9d4d7'); grad.addColorStop(1, '#e4e8d1'); ctx.fillStyle = grad; ctx.fillRect(0, 0, 2, 256);
  const background = new THREE.CanvasTexture(sky); background.colorSpace = THREE.SRGBColorSpace; scene.background = background;
  const camera = new THREE.PerspectiveCamera(42, 1, .2, 800);
  const sun = new THREE.DirectionalLight('#fff0d1', 2.25); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.normalBias = .04; sun.shadow.bias = -.0003; scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight('#c7c6e6', .78); fill.position.set(15, 10, -5); scene.add(fill);
  scene.add(new THREE.HemisphereLight('#d7e5e2', '#b5aa9b', 1.25));
  const pipeline = new Pipeline(renderer, scene, camera, { pixelBudget: 2.6e6 }); pipeline.forceScale = 1.5;
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.enablePan = false;
  controls.minPolarAngle = .35; controls.maxPolarAngle = Math.PI / 2 - .15; controls.rotateSpeed = .6;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  $('motion-enabled').checked = !reducedMotion.matches; $('motion-enabled').disabled = reducedMotion.matches;
  const diagnostics = toonDiagnostics(); $('patch-status').textContent = diagnostics.shadowTintPatch ? 'r' + diagnostics.revision + ' · 补丁可用' : '暗部补丁不可用';
  const metrics = new FrameMetrics(), records = [];
  let sceneId = SCENES[location.hash.slice(1)] ? location.hash.slice(1) : 'street';
  let config, world, width = 1, height = 1, inView = true, animationTime = 0, disposed = false, layoutSeed = 2411;
  let raf = 0, lastUI = 0, benchmark = null, switchStart = 0, firstFramePending = false, switchCount = 0;
  let lastInfo = {}, firstFrameMs = 0;
  const projected = new THREE.Vector3(), raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let pointerStart = null;

  function readStyle() {
    return { bands: Number($('bands').value), shadowTint: $('shadow-tint').value, inkWidth: Number($('ink-width').value), saturation: Number($('saturation').value), warmth: Number($('warmth').value), sunlight: Number($('sunlight').value), ink: $('ink-enabled').checked, grade: $('grade-enabled').checked, motion: $('motion-enabled').checked && !reducedMotion.matches };
  }
  function setStatus(text) { $('record-status').textContent = text; }
  function cancelRecord(reason) {
    if (!benchmark) return;
    benchmark = null; $('record-button').textContent = '记录 8 秒'; setStatus(reason + '，本次采样已取消。');
  }
  function resetMetrics() { metrics.reset(); lastUI = 0; }
  function resetCamera() {
    if (!config) return;
    // Clear residual orbit damping before placing a reproducible standard view.
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    const aspect = width / height, extent = Math.max(config.width, config.depth);
    // Fit every corner of the scene bounds in camera space, with room for labels.
    const direction = new THREE.Vector3(.52, .85, .9).normalize();
    const right = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanH = tanV * aspect;
    const offset = new THREE.Vector3(); let distance = 20;
    for (const x of [-config.width / 2, config.width / 2]) for (const y of [0, 7]) for (const z of [-config.depth / 2, config.depth / 2]) {
      offset.set(x, y - 2, z);
      distance = Math.max(distance, offset.dot(direction) + Math.max(Math.abs(offset.dot(right)) / (tanH * .87), Math.abs(offset.dot(up)) / (tanV * .78)));
    }
    controls.target.set(0, 2, 0); camera.position.copy(direction).multiplyScalar(distance).add(controls.target);
    controls.minDistance = Math.max(10, extent * .3); controls.maxDistance = Math.max(100, distance * 2.5);
    controls.update(); controls.enableDamping = damping; resetMetrics();
  }
  function applyStyle(manual = true) {
    if (manual) { cancelRecord('风格参数改变'); document.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', 'false')); }
    const style = readStyle();
    pipeline.setStyle(style); world?.applyStyle(style); sun.intensity = style.sunlight;
    ['ink-width', 'saturation', 'warmth', 'sunlight'].forEach((id) => { $(id + '-value').value = Number($(id).value).toFixed(2); });
    stage.dataset.style = JSON.stringify(style); resetMetrics();
  }
  function preset(name) {
    cancelRecord('风格预设改变');
    const p = PRESETS[name];
    $('bands').value = p.bands; $('shadow-tint').value = p.shadowTint;
    $('ink-width').value = p.inkWidth; $('saturation').value = p.saturation; $('warmth').value = p.warmth; $('sunlight').value = p.sunlight;
    $('ink-enabled').checked = p.ink; $('grade-enabled').checked = p.grade;
    applyStyle(false); document.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === name)));
  }
  function loadScene(id) {
    cancelRecord('场景配置改变'); switchStart = performance.now(); stage.dataset.ready = 'false';
    const nextConfig = createConfig(id, Number($('building-count').value), layoutSeed);
    // Build before retiring the current world so a failed build keeps its input visible.
    const nextWorld = buildComponents(nextConfig, readStyle());
    if (world) { world.dispose(); switchCount++; }
    sceneId = id; config = nextConfig; world = nextWorld; scene.add(world.root); animationTime = 0;
    $('scene-number').textContent = config.theme.number; $('scene-name').textContent = config.theme.name; $('scene-subtitle').textContent = config.theme.subtitle;
    document.querySelectorAll('.scene-tabs button[data-scene]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scene === id)));
    $('config-note').textContent = `${config.count} 栋建筑 · ${config.trees.length} 棵树 · 种子 ${config.seed}`;
    $('seed').value = config.seed;
    $('place-marker').textContent = world.landmark.name + ' · 开门 ↗'; $('place-marker').setAttribute('aria-pressed', 'false');
    stage.dataset.scene = id; stage.dataset.buildings = config.count; stage.dataset.seed = config.seed; stage.dataset.switches = switchCount;
    history.replaceState(null, '', '#' + id);
    const extent = Math.max(config.width, config.depth), half = extent * .65;
    sun.position.set(-extent * .6, extent * .9, extent * .5); sun.target.position.set(0, 0, 0);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: extent * 3 }); sun.shadow.camera.updateProjectionMatrix();
    scene.fog = new THREE.Fog('#d3e0d2', extent * 2.3, extent * 4.5);
    resetCamera(); world.animate(0, 0, reducedMotion.matches); applyStyle(false); firstFramePending = true;
  }
  function resize() {
    const box = stage.getBoundingClientRect(), w = Math.round(box.width), h = Math.round(box.height);
    if (w === width && h === height) return;
    cancelRecord('视口尺寸改变'); width = Math.max(1, w); height = Math.max(1, h);
    camera.aspect = width / height; camera.updateProjectionMatrix(); pipeline.setSize(width, height); setOutlineResolution(width, height);
    resetCamera(); resetMetrics();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);
  const visibilityObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; resetMetrics(); }, { threshold: 0 }); visibilityObserver.observe(stage);
  function toggleDoor() {
    cancelRecord('店门状态改变'); world.landmark.open = !world.landmark.open;
    $('place-marker').textContent = world.landmark.name + (world.landmark.open ? ' · 关门 ↙' : ' · 开门 ↗'); $('place-marker').setAttribute('aria-pressed', String(world.landmark.open)); resetMetrics();
  }
  function placeMarker() {
    projected.copy(world.landmark.anchor).project(camera);
    const x = (projected.x * .5 + .5) * width, y = (-projected.y * .5 + .5) * height;
    const button = $('place-marker');
    button.hidden = projected.z < -1 || projected.z > 1 || x < 0 || x > width || y < 75 || y > height - 60;
    button.style.left = THREE.MathUtils.clamp(x, 90, width - 90) + 'px'; button.style.top = y + 'px';
  }
  function info() {
    return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs?.length || 0 };
  }
  function metadata() {
    return {
      scene: sceneId, name: config.theme.name, buildings: config.count, seed: config.seed,
      style: readStyle(), doorOpen: world.landmark.open,
      viewport: { width, height, dpr: window.devicePixelRatio || 1 },
      render: { width: pipeline.size.x, height: pipeline.size.y, scale: pipeline.scale, pixelBudget: pipeline.pixelBudget, shadowMap: 1024 },
      camera: { position: camera.position.toArray(), target: controls.target.toArray(), fov: camera.fov },
      threeRevision: THREE.REVISION, userAgent: navigator.userAgent, shaderPatch: diagnostics.shadowTintPatch,
      firstFrameAfterBuildMs: firstFrameMs,
    };
  }
  function updateUI(now) {
    if (now - lastUI < 500) return; lastUI = now;
    const s = metrics.summary;
    $('metric-fps').textContent = s ? s.fps.toFixed(1) : '—'; $('metric-p95').textContent = s ? s.p95Ms.toFixed(1) : '—';
    $('metric-cpu').textContent = s ? s.cpuSubmitMs.toFixed(2) : '—';
    $('metric-calls').textContent = lastInfo.calls?.toLocaleString('en-US') || '—'; $('metric-triangles').textContent = lastInfo.triangles?.toLocaleString('en-US') || '—';
    ['geometries', 'textures', 'programs'].forEach((key) => { $('metric-' + key).textContent = lastInfo[key] ?? '—'; });
    $('render-size').textContent = `${pipeline.size.x} × ${pipeline.size.y} · ${pipeline.scale.toFixed(2)}×`;
    stage.dataset.resources = JSON.stringify(lastInfo);
    if (benchmark) {
      const remainingWarm = benchmark.warmUntil - now;
      $('record-button').textContent = '取消记录';
      setStatus(remainingWarm > 0 ? `正在预热 · ${(remainingWarm / 1000).toFixed(1)} 秒` : `正在记录 ${config.theme.name} · 剩余 ${Math.max(0, (benchmark.endAt - now) / 1000).toFixed(1)} 秒`);
    }
  }
  function showRecords() {
    $('records').replaceChildren();
    records.slice().reverse().forEach((r) => {
      const tr = document.createElement('tr');
      const values = [`${r.settings.name} / ${r.settings.buildings} 栋`, r.summary.fps.toFixed(1), r.summary.p95Ms.toFixed(1) + ' ms', r.submissions.calls, `${r.settings.render.width} × ${r.settings.render.height}`, `${r.settings.style.bands} 段 · 种子 ${r.settings.seed}`];
      values.forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.append(td); }); $('records').append(tr);
    });
    $('export-records').disabled = !records.length;
  }
  function recordFrame(now, interval, cpu) {
    if (!benchmark) return;
    if (now >= benchmark.warmUntil && interval > 0) { benchmark.intervals.push(interval); benchmark.cpu.push(cpu); }
    if (now < benchmark.endAt) return;
    const result = summarize(benchmark.intervals, benchmark.cpu);
    if (!result) { cancelRecord('未得到有效帧数据'); return; }
    records.push({ capturedAt: new Date().toISOString(), warmupMs: 2000, requestedDurationMs: 8000, measuredIntervalMs: benchmark.intervals.reduce((a, b) => a + b, 0), settings: benchmark.settings, summary: result, submissions: lastInfo, samples: { frameIntervalsMs: benchmark.intervals, cpuSubmitMs: benchmark.cpu } });
    if (records.length > 12) records.shift(); benchmark = null; showRecords();
    $('record-button').textContent = '记录 8 秒'; setStatus(`已记录 ${config.theme.name} · ${result.frames} 个帧间隔；可导出数据留存。`);
    $('records').dataset.count = records.length;
  }
  function frame(now) {
    if (disposed) return;
    if (!document.hidden && (inView || benchmark)) {
      const previous = metrics.previous, dt = previous == null ? 0 : Math.min((now - previous) / 1000, .05);
      if ($('motion-enabled').checked && !reducedMotion.matches) animationTime += dt;
      world.animate(animationTime, dt, reducedMotion.matches); controls.update(); placeMarker();
      renderer.info.reset(); const before = performance.now(); pipeline.render(); const cpu = performance.now() - before;
      const interval = metrics.frame(now, cpu); lastInfo = info();
      if (firstFramePending) { firstFrameMs = performance.now() - switchStart; firstFramePending = false; stage.dataset.ready = 'true'; stage.dataset.firstFrameMs = firstFrameMs.toFixed(2); }
      recordFrame(now, interval, cpu); updateUI(now);
    } else { metrics.previous = null; }
    raf = requestAnimationFrame(frame);
  }

  document.querySelectorAll('.scene-tabs button[data-scene]').forEach((button) => listen(button, 'click', () => loadScene(button.dataset.scene)));
  document.querySelectorAll('[data-preset]').forEach((button) => listen(button, 'click', () => preset(button.dataset.preset)));
  listen($('style-controls'), 'input', () => applyStyle());
  listen($('building-count'), 'change', () => loadScene(sceneId));
  listen($('seed-form'), 'submit', (event) => { event.preventDefault(); if ($('seed-form').reportValidity()) { layoutSeed = Number($('seed').value); loadScene(sceneId); } });
  listen($('render-scale'), 'change', () => { cancelRecord('渲染倍率改变'); pipeline.forceScale = Number($('render-scale').value); pipeline.setSize(width, height); applyStyle(false); resetMetrics(); });
  listen($('reset-style'), 'click', () => preset('spring'));
  listen($('reset-camera'), 'click', () => { cancelRecord('镜头改变'); resetCamera(); });
  listen($('place-marker'), 'click', toggleDoor);
  listen(controls, 'start', () => { cancelRecord('镜头操作'); resetMetrics(); });
  listen(canvas, 'pointerdown', (e) => { pointerStart = [e.clientX, e.clientY]; });
  listen(canvas, 'pointerup', (e) => {
    if (!pointerStart || Math.hypot(e.clientX - pointerStart[0], e.clientY - pointerStart[1]) > 5) { pointerStart = null; return; }
    pointerStart = null; const box = canvas.getBoundingClientRect(); pointer.set((e.clientX - box.left) / box.width * 2 - 1, -(e.clientY - box.top) / box.height * 2 + 1); raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(world.root.children, true).find((h) => !h.object.userData.isOutline && h.object.name !== 'falling-foliage');
    if (hit && world.landmark.targets.includes(hit.object)) toggleDoor();
  });
  listen(document, 'visibilitychange', () => { if (document.hidden) cancelRecord('页面进入后台'); resetMetrics(); });
  listen(reducedMotion, 'change', () => { cancelRecord('系统动态设置改变'); $('motion-enabled').checked = !reducedMotion.matches; $('motion-enabled').disabled = reducedMotion.matches; applyStyle(false); });
  listen($('record-button'), 'click', () => {
    if (benchmark) { cancelRecord('手动停止'); return; }
    resetCamera(); const now = performance.now(); benchmark = { warmUntil: now + 2000, endAt: now + 10000, intervals: [], cpu: [], settings: metadata() }; lastUI = 0; $('record-button').textContent = '取消记录'; setStatus('正在预热 · 2 秒');
  });
  listen($('export-config'), 'click', () => downloadJSON(`sakura-${sceneId}-${config.seed}-config.json`, { schemaVersion: 1, settings: metadata(), layout: config }));
  listen($('export-records'), 'click', () => downloadJSON('sakura-lab-measurements.json', { schemaVersion: 1, upstreamCommit: 'de01898e89c7f6ab3fad93fa802f0f5ac66fbd81', method: 'requestAnimationFrame intervals; CPU render submission; renderer.info includes shadows and postprocessing; not GPU timings or VRAM bytes', records }));
  listen(canvas, 'webglcontextlost', (event) => { event.preventDefault(); cancelRecord('图形上下文丢失'); $('scene-error').hidden = false; $('scene-error').textContent = '图形上下文已丢失，请刷新页面。'; });
  function dispose() {
    if (disposed) return; disposed = true; cancelAnimationFrame(raf); abort.abort(); resizeObserver.disconnect(); visibilityObserver.disconnect(); controls.dispose(); world?.dispose(); sun.shadow.dispose(); pipeline.dispose(); background.dispose(); renderer.dispose();
  }
  listen(window, 'pagehide', (event) => { if (!event.persisted) dispose(); });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
  resize(); loadScene(sceneId); raf = requestAnimationFrame(frame);
}

try { start(); }
catch (error) {
  console.error('Sakura Field Lab initialization failed:', error);
  $('scene-error').hidden = false; $('place-marker').hidden = true;
  $('style-controls').disabled = true; $('config-controls').disabled = true;
  document.querySelectorAll('button').forEach((button) => { button.disabled = true; });
}
