// 原创中文面板；调用本机固定上游副本，不包含上游模型或水珠着色器。
import './local-shell.css';
import * as THREE from 'three/webgpu';
import { createEffectsController } from './local-effects.js';

const source = 'https://github.com/ektogamat/threejs-conference/blob/8cc20593b2270e2ce832e7b7b44356705daddec4/';
const techniques = {
  rain: { title: '雨滴与水花', sub: '高度图 + GPU 粒子', mark: '╱╱',
    watch: '看空中的雨丝、落地水花和路面雨纹。关闭后，湿润地面与车身水珠仍可单独观察。',
    principle: '先从上方拍摄场景，把屋顶高度写进纹理。GPU 并行移动雨滴，查询它脚下的高度；碰到表面就回收重生。',
    flow: '俯视高度图 → GPU 碰撞查询 → 批量雨丝与水花',
    limit: '高度图每列只存最高面；水花是独立动画，没有逐滴配对。', file: 'docs/techniques/collision-rain.md' },
  reflection: { title: '湿地反射', sub: '镜像相机 + 涟漪', mark: '▱',
    watch: '看车辆和招牌在路面里的倒影。关闭镜像后，路面材质和灯光高光仍然存在。可提高倒影强度，放大差别。',
    principle: '把相机镜像到地面另一侧，再渲染一次城市。地面按粗糙度混合这张画面，法线与雨纹轻微扰动采样。',
    flow: '镜像相机 → 半分辨率画面 → 粗糙度混合',
    limit: '适合平坦地面。关闭开关同时停止镜像更新；并未模拟真实积水。', file: 'docs/techniques/wet-ground.md' },
  droplets: { title: '车身水珠', sub: '法线 + 粗糙度', mark: '◌',
    watch: '靠近车辆，看车漆和玻璃上流动的细小水珠。用“只看此项”去掉空中雨和辉光，方便比较。',
    principle: 'TSL 在材质里计算水珠掩码。对掩码做有限差分得到法线，再改变粗糙度，让高光表现出凸起与滑落。',
    flow: '水珠图案 → 法线 / 粗糙度 → 湿润高光',
    limit: '没有逐颗水滴几何；超过 20 米开始淡出，32 米完全关闭。面板让水珠独立于降雨，并同时收零法线扰动。', file: 'docs/techniques/car-surface-rain.md' },
  bloom: { title: '霓虹辉光', sub: 'Bloom + 镜头光晕', mark: '✳',
    watch: '看发光招牌周围的扩散光晕。关闭后招牌仍然亮，但边缘更清楚；镜头光晕也一起关闭。',
    principle: '后处理提取发光部分，以半分辨率模糊再加回画面。相关镜头光晕一起参与合成，营造夜景气氛。',
    flow: '发光缓冲 → 半分辨率模糊 → 合成光晕',
    limit: '这是后处理光效；不能代替照亮物体的真实灯光。设备禁用的镜头光晕不会被强制打开。', file: 'src/post/postprocessing.js' },
};
const bar = document.createElement('aside'); bar.id = 'research-bar'; bar.setAttribute('aria-label', '本地研究体验');
bar.innerHTML = `<a href="http://127.0.0.1:5188/research.html" id="research-return">← 统一研究入口</a><span>原库 8cc2059</span><button type="button" id="research-open" aria-expanded="false" aria-controls="research-panel">中文效果面板</button>`;
document.body.appendChild(bar);
const panel = document.createElement('aside'); panel.id = 'research-panel'; panel.hidden = true;
panel.setAttribute('aria-label', '原库中文效果控制'); panel.setAttribute('data-ui-block-look', 'true');
panel.innerHTML = `<header><div><small>原库完整场景 · 实时对照</small><h2>把雨夜，一层层看清。</h2></div><button type="button" id="research-close" aria-label="收起中文面板">×</button></header>
  <p id="research-ready" role="status">进入城市后即可控制效果。</p>
  <fieldset id="research-controls" disabled><legend class="research-sr">渲染效果开关</legend>
  <div class="research-rows">${Object.entries(techniques).map(([key, item]) => `<div class="research-row" data-effect-row="${key}"><button type="button" class="research-topic" data-topic="${key}" aria-pressed="${key === 'rain'}" aria-label="查看${item.title}原理"><i>${item.mark}</i><span><b>${item.title}</b><small>${item.sub}</small></span></button><label class="research-switch"><input type="checkbox" data-effect="${key}" id="research-${key}" aria-label="${item.title}" checked><span aria-hidden="true"></span></label></div>`).join('')}</div>
  <div class="research-presets"><button type="button" id="research-all-on">全部开启</button><button type="button" id="research-all-off">全部关闭</button><button type="button" id="research-isolate">只看此项</button></div>
  <div class="research-views" role="group" aria-label="定点观察"><span>定点观察</span><button type="button" data-research-view="street">街口</button><button type="button" data-research-view="car">车身</button><button type="button" data-research-view="ground">倒影</button></div>
  <article class="research-principle" aria-labelledby="research-topic-title"><small>观察什么 / HOW IT WORKS</small><h3 id="research-topic-title"></h3><p id="research-watch"></p><div id="research-flow"></div><p id="research-principle-text"></p><details><summary>原理边界与源码</summary><p id="research-limit"></p><a id="research-source" target="_blank" rel="noopener">固定版本实现 ↗</a></details></article>
  <details class="research-fine"><summary>细调参数</summary><label>倒影强度 <output id="research-reflection-value">0.08</output><input id="research-reflection-strength" aria-label="倒影强度" type="range" min="0" max="0.4" step="0.02" value="0.08"></label><label>可见雨滴 <output id="research-count-value">5000</output><input id="research-count" aria-label="可见雨滴数量" type="range" min="500" max="5000" step="500" value="5000"></label><p>计算缓冲规模保持不变。</p></details>
  <button type="button" id="research-resume">继续漫游 · 收起面板</button></fieldset>
  <footer><div id="research-runtime"></div><p>WASD 移动 · Shift 快走 · C 蹲下<br>拖动环顾 · P 展开 / 收起面板</p></footer>`;
document.body.appendChild(panel);
let selected = 'rain'; let connected = false; let entered = false; let usingPointer = false;
function selectTopic(key) {
  selected = key; const info = techniques[key];
  document.querySelector('#research-topic-title').textContent = info.title;
  document.querySelector('#research-watch').textContent = info.watch;
  document.querySelector('#research-flow').textContent = info.flow;
  document.querySelector('#research-principle-text').textContent = info.principle;
  document.querySelector('#research-limit').textContent = info.limit;
  document.querySelector('#research-source').href = source + info.file;
  panel.querySelectorAll('[data-topic]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.topic === key)));
}
selectTopic(selected);
function openPanel(open) { panel.hidden = !open; document.querySelector('#research-open').setAttribute('aria-expanded', String(open)); }
document.querySelector('#research-open').addEventListener('click', () => openPanel(panel.hidden));
bar.querySelector('a').addEventListener('click', () => { if (document.pointerLockElement) document.exitPointerLock?.(); });
panel.querySelectorAll('[data-topic]').forEach(button => button.addEventListener('click', () => selectTopic(button.dataset.topic)));

export function connectResearchPanel({ world, pipeline, camera, cameraDirector, renderer, appShell, profile, perfStats }) {
  if (connected) return;
  connected = true;
  const effects = createEffectsController({ world, pipeline, profile });
  const walk = cameraDirector.walkControls;
  const canvas = renderer.domElement; canvas.tabIndex = 0;
  function releaseLook() { if (document.pointerLockElement) document.exitPointerLock?.(); walk?.clearInput(); }
  function focusScene() { canvas.focus({ preventScroll: true }); }
  function closePanel() { openPanel(false); focusScene(); }
  panel.addEventListener('pointerdown', () => { usingPointer = true; releaseLook(); });
  panel.addEventListener('keydown', event => {
    usingPointer = false; event.stopPropagation();
    if (event.code === 'Escape' || event.code === 'KeyP' && !event.repeat && !event.target.matches('input')) { event.preventDefault(); closePanel(); }
  });
  bar.addEventListener('pointerdown', releaseLook);
  document.querySelector('#research-close').addEventListener('click', closePanel);
  document.querySelector('#research-resume').addEventListener('click', closePanel);
  document.querySelector('#research-open').addEventListener('click', () => { if (!panel.hidden) releaseLook(); else focusScene(); });
  window.addEventListener('keydown', event => {
    if (event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
    if (event.code === 'KeyP' && !event.repeat && entered) { event.preventDefault(); releaseLook(); openPanel(panel.hidden); if (panel.hidden) focusScene(); }
    if (event.code === 'Escape' && !panel.hidden) closePanel();
  });
  function sync() {
    if (appShell.isFinishedIntro() && !entered) {
      entered = true; document.querySelector('#research-controls').disabled = false;
      if (!matchMedia('(max-width:640px)').matches) openPanel(true);
    }
    const state = effects.getState();
    panel.querySelectorAll('[data-effect]').forEach(input => {
      input.checked = state[input.dataset.effect]; input.disabled = !effects.available[input.dataset.effect];
      input.closest('.research-row').classList.toggle('is-off', !input.checked);
    });
    const count = Object.values(state).filter(Boolean).length;
    document.querySelector('#research-ready').textContent = entered ? `${count} / 4 效果开启 · 可随时漫游与对照` : '点击 ENTER 进入城市后即可控制效果。';
    const intensity = Math.round((world.carSurfaceRain?.uniforms?.uIntensity?.value ?? 0) * 100);
    document.querySelector('#research-runtime').textContent = `${renderer.backend.isWebGLBackend ? 'WebGL2' : 'WebGPU'} · ${perfStats.fps} FPS · 水珠实际强度 ${intensity}%\nX ${camera.position.x.toFixed(1)} · Y ${camera.position.y.toFixed(2)} · Z ${camera.position.z.toFixed(1)}`;
  }
  panel.querySelectorAll('[data-effect]').forEach(input => input.addEventListener('change', () => {
    effects.setEffect(input.dataset.effect, input.checked); selectTopic(input.dataset.effect); sync();
    if (usingPointer) focusScene();
  }));
  for (const [id, action] of [['research-all-on', () => effects.setAll(true)], ['research-all-off', () => effects.setAll(false)], ['research-isolate', () => effects.isolate(selected)]])
    document.querySelector(`#${id}`).addEventListener('click', () => { action(); sync(); if (usingPointer) focusScene(); });
  const strength = document.querySelector('#research-reflection-strength'); strength.value = world.ground?.uniforms?.reflectionStrength?.value ?? .08;
  const strengthOutput = document.querySelector('#research-reflection-value'); strengthOutput.value = Number(strength.value).toFixed(2);
  strength.addEventListener('input', () => { effects.setReflectionStrength(strength.value); strengthOutput.value = Number(strength.value).toFixed(2); });
  const count = document.querySelector('#research-count'); count.value = world.rain?.params?.count ?? 5000;
  const countOutput = document.querySelector('#research-count-value'); countOutput.value = count.value;
  count.addEventListener('input', () => { world.rain?.setDropCount(Number(count.value)); countOutput.value = count.value; });
  panel.querySelectorAll('[data-research-view]').forEach(button => button.addEventListener('click', () => {
    releaseLook(); const view = button.dataset.researchView;
    cameraDirector.setCameraMode('walk'); walk?.setCrouched(view === 'ground');
    if (view === 'street' || !world.car) cameraDirector.resetCameraPose();
    else {
      const bounds = new THREE.Box3().setFromObject(world.car); const center = bounds.getCenter(new THREE.Vector3());
      const groundY = world.ground.mesh.position.y;
      camera.position.set(view === 'car' ? bounds.min.x - 1.7 : bounds.min.x - 6, groundY + 1.55 * (view === 'ground' ? .55 : 1), center.z + (view === 'car' ? 1 : -3));
      camera.lookAt(center.x, view === 'car' ? center.y + .2 : groundY + .2, center.z);
      walk?.syncEulerFromCamera(); walk?.snapCameraToGround(); cameraDirector.syncWalkFocusPoint();
    }
    selectTopic(view === 'ground' ? 'reflection' : view === 'car' ? 'droplets' : 'rain'); sync(); focusScene();
  }));
  sync(); const interval = setInterval(sync, 300);
  window.addEventListener('pagehide', () => { clearInterval(interval); effects.dispose(); }, { once: true });
}
