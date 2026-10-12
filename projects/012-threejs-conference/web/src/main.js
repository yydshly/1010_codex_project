import './style.css';
import './experience.css';
import * as THREE from 'three/webgpu';
import { color, float, mix, pass, smoothstep, texture, uniform, vec3, vec4 } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWeather, createWetGround, createWalkControls } from '../modules/rain-kit/index.js';
import { createWorld } from './scene/world.js';
import { views, renderPrinciple } from './content.js';
import { bindResearchLinks, localHost } from './platform/researchLinks.js';

bindResearchLinks();
if (!localHost) document.querySelector('#upstream-open').textContent = '查看原库本机运行说明 ↗';

renderPrinciple('rain');
document.querySelectorAll('[data-principle]').forEach(button => {
  button.addEventListener('click', () => renderPrinciple(button.dataset.principle));
  button.addEventListener('keydown', event => {
    const list = [...document.querySelectorAll('[data-principle]')];
    let index = list.indexOf(button);
    if (event.key === 'ArrowRight') index = (index + 1) % list.length;
    else if (event.key === 'ArrowLeft') index = (index + list.length - 1) % list.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = list.length - 1;
    else return;
    event.preventDefault(); renderPrinciple(list[index].dataset.principle); list[index].focus();
  });
});

const loading = document.querySelector('#loading');
const container = document.querySelector('#viewport');
let app = null;
document.querySelector('#upstream-open').addEventListener('click', async () => {
  if (!localHost) { location.assign('./research.html#local'); return; }
  const button = document.querySelector('#upstream-open'); button.disabled = true; button.textContent = '正在连接原库…';
  document.querySelector('#upstream-error').hidden = true;
  try {
    const response = await fetch('http://127.0.0.1:5195/', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('upstream unavailable');
    location.assign('http://127.0.0.1:5195/');
  } catch { document.querySelector('#upstream-error').hidden = false; button.disabled = false; button.textContent = '原库完整体验 ↗'; }
});

async function start() {
  const renderer = new THREE.WebGPURenderer({ canvas: document.querySelector('#scene'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(max-width:760px)').matches ? 1 : 1.4));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  await renderer.init();
  document.querySelector('#engine-status').textContent = renderer.backend.isWebGLBackend ? 'WebGL2 兼容渲染' : 'WebGPU · 实时渲染';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d1220'); scene.fog = new THREE.FogExp2('#0d1220', .018);
  const camera = new THREE.PerspectiveCamera(49, 1, .1, 180); camera.layers.enable(2);
  camera.position.fromArray(views.street.position);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.fromArray(views.street.target); controls.enableDamping = true;
  controls.minDistance = 2.5; controls.maxDistance = 48;
  controls.maxPolarAngle = Math.PI * .49; controls.minPolarAngle = .12;
  controls.enablePan = false;
  const world = createWorld(scene);
  const ground = createWetGround({ scene, size: 150, y: 0, uvRepeat: 20, fogNear: 40, fogFar: 110, roughnessScale: .65, reflectionStrength: .65, normalWarp: .008, rippleScale: 1.5, rippleStrength: .009, rippleNormalStrength: .002 });
  const walk = createWalkControls({ camera, domElement: renderer.domElement, model: world.collisionRoot, colliders: [world.collisionRoot], ground: ground.mesh, baseFov: 68, settings: { eyeHeight: 1.65, moveSpeed: 3.4, playerRadius: .38 } });
  let walking = false; const savedPosition = new THREE.Vector3(); const savedTarget = new THREE.Vector3(); let distanceWalked = 0;
  document.querySelector('#loading-detail').textContent = '编译可复用天气、倒影与水珠模块';
  const weather = await createWeather({ scene, renderer, camera, capacity: 5000, count: 3000,
    hideObjects: world.hideFromHeight,
    height: { width: 80, height: 80, cameraHeight: 60, depth: 90 },
    rain: { rainArea: { width: 35, height: 45 } } });
  const { rain, height: collisionHeight } = weather;

  const pipeline = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  const sceneColor = scenePass.getTextureNode('output');
  const glow = bloom(sceneColor, .55, .3, 1.05); glow.setResolutionScale(.5);
  const bloomAmount = uniform(1);
  const tint = uniform(new THREE.Color('#effff4'));
  pipeline.outputNode = sceneColor.add(glow.mul(bloomAmount)).mul(vec4(tint, 1));
  const debugPipeline = new THREE.RenderPipeline(renderer);
  const heightSample = texture(collisionHeight.renderTarget.texture).y.div(25).clamp(0, 1);
  debugPipeline.outputNode = vec4(mix(vec3(.06, .1, .16), vec3(.85, .95, .55), heightSample), 1);
  // RGBA8 的行字节需是 256 的倍数；192 × 4 = 768，避免回读填充行造成条纹。
  const mapSize = 192;
  const debugTarget = new THREE.RenderTarget(mapSize, mapSize, { type: THREE.UnsignedByteType });
  const debugCtx = document.querySelector('#height-map').getContext('2d');
  let debugVisible = false; let readPending = false; let debugFrame = 0;
  let activeView = 'street'; let tour = false; let transition = null; let visible = true;
  let simulationEnabled = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastTime = performance.now(); let statTime = lastTime; let frameCount = 0; let tourTime = 0;
  const minTarget = new THREE.Vector3(-1, 2.5, -15);
  const state = { rain: true, reflection: true, bloom: true, droplets: true, count: 3000, look: 'neon' };

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: '120px' }); visibilityObserver.observe(container);
  function stopTour() { tour = false; controls.autoRotate = false; document.querySelector('#tour').setAttribute('aria-pressed', 'false'); document.querySelector('#tour').setAttribute('aria-label', '开启镜头导览'); document.querySelector('#tour').textContent = '▶'; }
  function setView(key, instant = false) {
    if (walking) setWalking(false);
    stopTour(); activeView = key;
    const view = views[key];
    if (instant) { camera.position.fromArray(view.position); controls.target.fromArray(view.target); controls.update(); transition = null; }
    else transition = { start: performance.now(), from: camera.position.clone(), fromTarget: controls.target.clone(), to: new THREE.Vector3().fromArray(view.position), target: new THREE.Vector3().fromArray(view.target) };
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === key)));
    document.querySelector('#view-label').textContent = view.label;
    document.querySelector('#scene-title').textContent = view.title;
    document.querySelector('#scene-caption').textContent = view.caption;
  }
  document.querySelectorAll('[data-view], [data-focus]').forEach(button => button.addEventListener('click', () => {
    setView(button.dataset.view || button.dataset.focus);
    if (button.dataset.focus) document.querySelector('#showcase').scrollIntoView({ behavior: 'smooth' });
  }));
  controls.addEventListener('start', () => { stopTour(); transition = null; });
  function setWalking(enabled) {
    if (walking === enabled) return;
    stopTour(); transition = null; simulationEnabled = true; walking = enabled; controls.enabled = !enabled;
    if (enabled) {
      savedPosition.copy(camera.position); savedTarget.copy(controls.target); teleport('street'); walk.setActive(true);
      document.querySelector('#scene').focus();
    } else {
      if (document.fullscreenElement) void document.exitFullscreen();
      walk.setActive(false); camera.position.copy(savedPosition); controls.target.copy(savedTarget); camera.fov = 49; camera.updateProjectionMatrix(); controls.update();
    }
    document.querySelector('#walk-toggle').textContent = enabled ? '退出漫游 · 返回观察' : '进入第一人称漫游';
    document.querySelector('#walk-toggle').setAttribute('aria-pressed', String(enabled));
    document.querySelector('#walk-hud').hidden = !enabled; document.querySelector('#walk-tools').hidden = !enabled;
    document.querySelector('.viewport-wrap').classList.toggle('walking', enabled);
    document.querySelector('#input-hint').textContent = enabled ? 'WASD · 拖动视角 · Esc 返回' : '拖动环顾 · 滚轮缩放';
    document.querySelector('#walk-sprint').checked = false;
  }
  function teleport(key) {
    const place = world.landmarks[key]; walk.clearInput(); camera.position.fromArray(place.position); camera.lookAt(new THREE.Vector3().fromArray(place.target)); walk.syncEulerFromCamera();
    if (walking) walk.snapCameraToGround(); document.querySelector('#walk-location').textContent = place.name;
  }
  document.querySelector('#scene').tabIndex = 0;
  document.querySelector('#walk-toggle').addEventListener('click', () => setWalking(!walking));
  document.querySelector('#walk-exit').addEventListener('click', () => setWalking(false));
  document.querySelector('#walk-fullscreen').addEventListener('click', async () => { try { await document.querySelector('.viewport-wrap').requestFullscreen(); } catch { document.querySelector('#input-hint').textContent = '当前浏览器未接受全屏；可继续窗口漫游'; } });
  document.querySelectorAll('[data-destination]').forEach(button => button.addEventListener('click', () => { if (!walking) setWalking(true); teleport(button.dataset.destination); }));
  document.querySelector('#walk-lock').addEventListener('click', async () => { try { await walk.requestPointerLock(); } catch { document.querySelector('#input-hint').textContent = '可拖动看四周；当前浏览器未接受鼠标锁定'; } });
  window.addEventListener('keydown', event => { if (event.code === 'Escape' && walking) setWalking(false); });
  const axes = { forward: [0, -1], backward: [0, 1], left: [-1, 0], right: [1, 0] };
  document.querySelectorAll('[data-move]').forEach(button => {
    button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); walk.setMoveAxes(...axes[button.dataset.move]); });
    const release = () => walk.setMoveAxes(0, 0); button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
  });
  function bindToggle(id, key, apply) {
    document.querySelector(id).addEventListener('change', event => { state[key] = event.target.checked; apply(state[key]); });
  }
  bindToggle('#rain-toggle', 'rain', enabled => { rain.setEnabled(enabled); ground.setRippleAmount(enabled ? 1 : 0); });
  bindToggle('#reflection-toggle', 'reflection', enabled => ground.setReflectionEnabled(enabled));
  bindToggle('#bloom-toggle', 'bloom', enabled => { bloomAmount.value = enabled ? 1 : 0; });
  bindToggle('#droplets-toggle', 'droplets', enabled => world.rainMaterials.forEach(m => m.setEnabled(enabled)));
  document.querySelector('#density').addEventListener('input', event => {
    state.count = Number(event.target.value); rain.setDropCount(state.count);
    document.querySelector('#density-output').textContent = state.count.toLocaleString('en-US');
  });
  function setLook(key) {
    state.look = key; world.setLook(key);
    tint.value.set(key === 'amber' ? '#fff3d5' : key === 'blue' ? '#d3e7ff' : '#effff4');
    document.querySelectorAll('[data-look]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.look === key)));
  }
  document.querySelectorAll('[data-look]').forEach(button => button.addEventListener('click', () => setLook(button.dataset.look)));
  document.querySelector('#height-toggle').addEventListener('click', () => {
    debugVisible = !debugVisible; document.querySelector('#height-panel').hidden = !debugVisible;
    document.querySelector('#height-toggle').setAttribute('aria-pressed', String(debugVisible));
  });
  document.querySelector('#tour').addEventListener('click', () => {
    simulationEnabled = true;
    if (tour) { stopTour(); return; }
    setView('street', true); tour = true; tourTime = 0;
    document.querySelector('#tour').setAttribute('aria-pressed', 'true'); document.querySelector('#tour').setAttribute('aria-label', '暂停镜头导览'); document.querySelector('#tour').textContent = 'Ⅱ';
  });
  document.querySelector('#reset').addEventListener('click', () => {
    for (const id of ['rain-toggle', 'reflection-toggle', 'bloom-toggle', 'droplets-toggle']) {
      const el = document.getElementById(id); el.checked = true; el.dispatchEvent(new Event('change'));
    }
    const density = document.querySelector('#density'); density.value = '3000'; density.dispatchEvent(new Event('input'));
    setLook('neon'); setView('street'); debugVisible = false; document.querySelector('#height-panel').hidden = true; document.querySelector('#height-toggle').setAttribute('aria-pressed', 'false');
  });
  async function updateHeightPreview() {
    if (readPending) return; readPending = true;
    try {
      renderer.setRenderTarget(debugTarget); debugPipeline.render(); renderer.setRenderTarget(null);
      const pixels = await renderer.readRenderTargetPixelsAsync(debugTarget, 0, 0, mapSize, mapSize);
      debugCtx.putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, mapSize * mapSize * 4), mapSize, mapSize), 0, 0);
    } catch (error) {
      document.querySelector('#height-panel span').textContent = '高度图预览不可用'; console.warn('height preview', error);
    } finally { readPending = false; renderer.setRenderTarget(null); }
  }
  function frame(now) {
    const delta = Math.min((now - lastTime) / 1000, .05); lastTime = now;
    if (!visible || document.hidden) { statTime = now; frameCount = 0; return; }
    if (transition) {
      const t = Math.min((now - transition.start) / 1000, 1); const eased = t * t * (3 - 2 * t);
      camera.position.lerpVectors(transition.from, transition.to, eased); controls.target.lerpVectors(transition.fromTarget, transition.target, eased);
      if (t >= 1) transition = null;
    }
    if (tour) {
      tourTime += delta;
      camera.position.set(2 + Math.sin(tourTime * .18) * 1.3, 3.3 + Math.sin(tourTime * .12) * .5, 10 + Math.cos(tourTime * .17) * 3);
      controls.target.copy(minTarget);
    }
    if (walking) {
      const before = camera.position.clone(); walk.settings.moveSpeed = document.querySelector('#walk-sprint').checked ? 5.5 : 3.4;
      walk.update(delta); distanceWalked += Math.hypot(camera.position.x - before.x, camera.position.z - before.z);
    } else controls.update();
    if (simulationEnabled) {
      weather.update(delta); ground.update(delta); world.rainMaterials.forEach(m => m.update(delta));
      world.update(delta, camera);
    }
    if (state.reflection) ground.updateReflection(renderer, camera);
    pipeline.render();
    if (debugVisible && ++debugFrame % 30 === 0) void updateHeightPreview();
    frameCount++;
    if (now - statTime > 1000) {
      document.querySelector('#frame-stat').textContent = `${Math.round(frameCount * 1000 / (now - statTime))} FPS · 当前窗口`;
      if (walking) {
        document.querySelector('#position-readout').textContent = `X ${camera.position.x.toFixed(1)} · Y ${camera.position.y.toFixed(2)} · Z ${camera.position.z.toFixed(1)} / 已行走 ${distanceWalked.toFixed(1)} m`;
        const nearest = Object.values(world.landmarks).sort((a, b) => Math.hypot(a.position[0] - camera.position.x, a.position[2] - camera.position.z) - Math.hypot(b.position[0] - camera.position.x, b.position[2] - camera.position.z))[0];
        document.querySelector('#walk-location').textContent = nearest.name;
      }
      statTime = now; frameCount = 0;
    }
  }
  renderer.setAnimationLoop(frame);
  // 窗口可观察数据用于手工验证，均来自本地实时渲染状态。
  app = { renderer, scene, camera, world, ground, weather, rain, collisionHeight, state, setView, setLook, walk, walking: () => walking };
  window.__rainLab = app;
  loading.hidden = true;
  window.addEventListener('pagehide', () => { renderer.setAnimationLoop(null); observer.disconnect(); visibilityObserver.disconnect(); controls.dispose(); walk.dispose(); world.dispose(); weather.dispose(); ground.dispose(); pipeline.dispose(); debugPipeline.dispose(); debugTarget.dispose(); renderer.dispose(); }, { once: true });
}

start().catch(error => {
  console.error('Rain lab initialization failed', error);
  loading.classList.add('error'); loading.querySelector('strong').textContent = '此环境未能启动三维渲染';
  document.querySelector('#loading-detail').textContent = '请在支持 WebGPU 的浏览器中，通过 localhost 或 HTTPS 打开。下方技术说明仍可阅读。';
  document.querySelector('#engine-status').textContent = '渲染未启动';
});
