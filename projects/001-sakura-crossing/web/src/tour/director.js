import * as THREE from 'three';
import { TourClock, TOUR_STOPS, sampleTour, smooth } from './route.js';
import { TourNarrator } from './narrator.js';
import voiceUrl from './audio/tour-zh.mp3?url';
import './style.css';

export function setupStreetTour({ camera, controls, canvas, frameElement, setShop, reducedMotion }) {
  const clock = new TourClock();
  const audio = document.querySelector('#tour-audio');
  audio.src = voiceUrl;
  const panel = document.querySelector('#street-tour');
  const start = document.querySelector('#tour-start');
  const pause = document.querySelector('#tour-pause');
  const free = document.querySelector('#tour-free');
  const sound = document.querySelector('#tour-sound');
  const slider = document.querySelector('#tour-progress');
  const status = document.querySelector('#tour-status');
  const time = document.querySelector('#tour-time');
  const caption = document.querySelector('#tour-caption');
  const chapter = document.querySelector('#tour-chapter');
  const subtitle = document.querySelector('#tour-subtitle');
  const hint = document.querySelector('#scene-hint');
  const stops = [...document.querySelectorAll('[data-tour-stop]')];
  const position = new THREE.Vector3(), target = new THREE.Vector3();
  let entry = null, entryTime = 0, reason = '', cameraOwned = false;
  const narrator = new TourNarrator(audio, clock, (message) => { reason = message; sync(); });
  const put = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

  function takeCamera() {
    if (!cameraOwned) {
      // Flush pending OrbitControls damping before giving the director ownership.
      controls.enableDamping = false; controls.update();
      controls.enabled = false; cameraOwned = true;
    }
  }
  function releaseCamera() {
    if (!cameraOwned) return;
    controls.enabled = true;
    controls.enableDamping = false; controls.update(); controls.enableDamping = true;
    cameraOwned = false;
  }
  function applyPose(sample, immediate = false) {
    position.fromArray(sample.position); target.fromArray(sample.target);
    const fov = frameElement.clientWidth / frameElement.clientHeight < 1 ? 50 : 43;
    if (entry && !reducedMotion.matches) {
      const amount = smooth(Math.min(1, entryTime / 1.5));
      position.lerpVectors(entry.position, position, amount);
      target.lerpVectors(entry.target, target, amount);
      camera.fov = THREE.MathUtils.lerp(entry.fov, fov, amount);
    } else camera.fov = fov;
    camera.position.copy(position); controls.target.copy(target); camera.lookAt(target);
    camera.updateProjectionMatrix();
    setShop(sample.shopOpen, immediate);
  }
  function sync() {
    const sample = sampleTour(clock.elapsed, reducedMotion.matches);
    const active = clock.ownsCamera;
    panel.dataset.mode = clock.mode;
    frameElement.dataset.touring = String(active);
    start.textContent = clock.mode === 'idle' ? '开始一分钟导览' : '从头再走一遍';
    pause.disabled = !active; pause.textContent = clock.mode === 'paused' ? '继续导览' : '暂停导览';
    sound.setAttribute('aria-pressed', String(!audio.muted));
    sound.textContent = audio.muted ? '讲解声音：关' : '讲解声音：开';
    slider.value = String(clock.elapsed);
    slider.setAttribute('aria-valuetext', `${formatTime(clock.elapsed)}，${TOUR_STOPS[sample.stop].name}`);
    put(time, `${formatTime(clock.elapsed)} / 01:00`);
    const message = clock.mode === 'idle' ? '三站，60 秒。点击开始，听中文讲解，随镜头认识这条街。'
      : clock.mode === 'free' ? '自由探索 · 拖动环顾、滚轮缩放，点击地点发现资料。'
      : clock.mode === 'complete' ? '一分钟导览已完成 · 现在可以自由探索，也可以从头再走。'
      : clock.mode === 'paused' ? `已暂停 · ${reason || TOUR_STOPS[sample.stop].name}`
      : narrator.waiting ? '正在准备中文讲解 · 语音就绪后镜头一起出发'
      : `导览中 · ${sample.stop + 1} / 3 · ${TOUR_STOPS[sample.stop].name}`;
    put(status, message);
    caption.hidden = !active;
    put(chapter, `0${sample.stop + 1} / ${TOUR_STOPS[sample.stop].name}`);
    put(subtitle, sample.caption);
    put(hint, active ? '镜头导览中 · 拖动画面接管视角' : '拖动环顾 · 滚轮缩放');
    stops.forEach((button, index) => {
      button.setAttribute('aria-pressed', String(clock.mode !== 'idle' && index === sample.stop));
    });
  }
  function explore() {
    freezeNarration();
    clock.explore(); entry = null; reason = ''; releaseCamera(); sync();
  }
  function freezeNarration() {
    const previous = clock.elapsed;
    narrator.pause(); entryTime += Math.max(0, clock.elapsed - previous);
    if (clock.ownsCamera) applyPose(sampleTour(clock.elapsed, reducedMotion.matches));
    if (entryTime >= 1.5) entry = null;
  }
  function suspend(message) {
    if (clock.mode !== 'playing') return;
    freezeNarration();
    clock.pause(); reason = message; sync();
  }
  start.addEventListener('click', () => {
    clock.start(); reason = ''; takeCamera();
    narrator.seek(0);
    entry = { position: camera.position.clone(), target: controls.target.clone(), fov: camera.fov };
    entryTime = 0; applyPose(sampleTour(0, reducedMotion.matches), true); narrator.play(); sync();
  });
  pause.addEventListener('click', () => {
    if (clock.mode === 'playing') { freezeNarration(); clock.pause(); }
    else if (clock.mode === 'paused') { clock.toggle(); narrator.play(); }
    reason = ''; sync();
  });
  free.addEventListener('click', explore);
  sound.addEventListener('click', () => { audio.muted = !audio.muted; sync(); });
  function seek(value) {
    narrator.seek(value);
    takeCamera(); clock.seek(value); entry = null; reason = '';
    applyPose(sampleTour(clock.elapsed, reducedMotion.matches), true);
    if (!clock.ownsCamera) releaseCamera();
    sync();
  }
  slider.addEventListener('input', () => seek(Number(slider.value)));
  stops.forEach((button, index) => button.addEventListener('click', () => seek(TOUR_STOPS[index].at)));
  canvas.addEventListener('pointerdown', () => { if (clock.ownsCamera) explore(); }, { capture: true });
  canvas.addEventListener('wheel', () => { if (clock.ownsCamera) explore(); }, { capture: true, passive: true });
  document.addEventListener('street:content-open', () => suspend('阅读面板打开；关闭后可继续'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend('页面已切到后台；回来后可继续'); });
  [start, free, sound, slider, ...stops].forEach((button) => { button.disabled = false; });
  sync();
  return {
    get ownsCamera() { return clock.ownsCamera; },
    get paused() { return clock.mode === 'paused' || narrator.waiting; },
    get place() { return TOUR_STOPS[sampleTour(clock.elapsed).stop].place; },
    explore,
    update(_delta, visible) {
      if (!visible) suspend('街景离开视野；回来后可继续');
      if (clock.mode === 'playing') {
        const previous = clock.elapsed;
        narrator.sample(); entryTime += Math.max(0, clock.elapsed - previous);
        applyPose(sampleTour(clock.elapsed, reducedMotion.matches));
        if (entryTime >= 1.5) entry = null;
        if (!clock.ownsCamera) { narrator.stop(); releaseCamera(); }
      } else if (clock.mode === 'complete' && cameraOwned) {
        entry = null; applyPose(sampleTour(clock.elapsed, reducedMotion.matches)); releaseCamera();
      }
      sync();
    },
  };
}
