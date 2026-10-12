import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pipeline } from './rendering/post.js';
import { PAL } from './rendering/palette.js';
import { setOutlineResolution } from './rendering/outline.js';
import { buildStreet, buildSky } from './scene/street.js';
import { setupBusiness } from './business.js';
import { setupProductSummary } from './directions/catalog.js';
import { setupStreetTour } from './tour/director.js';
import './style.css';
import './directions/summary.css';

setupProductSummary();
const business = setupBusiness();
const canvas = document.querySelector('#scene');
const frameElement = document.querySelector('#scene-frame');
const inkButton = document.querySelector('#ink-toggle');
const gradeButton = document.querySelector('#grade-toggle');

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PAL.fog, 45, 100);
  const camera = new THREE.PerspectiveCamera(43, 1, .25, 220);
  const sun = new THREE.DirectionalLight(PAL.sun, 2.25);
  sun.position.set(-12, 18, 12);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
  sun.shadow.normalBias = .035; sun.shadow.bias = -.00035; scene.add(sun);
  const fill = new THREE.DirectionalLight(PAL.fill, 1.08); fill.position.set(12, 7, -10); scene.add(fill);
  const bounce = new THREE.DirectionalLight(0xd8cbe8, .34); bounce.position.set(5, -8, 12); scene.add(bounce);
  scene.add(new THREE.HemisphereLight(PAL.hemiSky, PAL.hemiGround, 1.12));
  buildSky(scene);
  const world = buildStreet(scene);
  const pipeline = new Pipeline(renderer, scene, camera);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 12; controls.maxDistance = 65;
  controls.minPolarAngle = .55; controls.maxPolarAngle = Math.PI / 2 - .12;
  controls.minAzimuthAngle = -.55; controls.maxAzimuthAngle = .95;
  controls.rotateSpeed = .55;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let isOpen = false, tour;
  function setShop(open, immediate = false) {
    if (isOpen !== open) {
      isOpen = open; world.shop.setOpen(open);
      document.querySelector('#shop-status').textContent = open ? '店门已开启，欢迎浏览 3 份研究资料' : '店门待开启，3 份资料等你发现';
    }
    if (immediate) world.shop.update(0, true);
  }
  business.bindWorld({ openShop: () => setShop(true, tour?.ownsCamera), setCollection: world.setCollection });
  document.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyE' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || business.isDialogOpen() || event.target.closest('input,textarea,select,[contenteditable=true]')) return;
    tour.explore();
    if (isOpen) setShop(false); else business.action('shop');
  });
  for (const [button, effect] of [[inkButton, 'ink'], [gradeButton, 'grade']]) {
    button.addEventListener('click', () => {
      pipeline.enabled[effect] = !pipeline.enabled[effect];
      button.setAttribute('aria-pressed', String(pipeline.enabled[effect]));
      button.querySelector('span').textContent = pipeline.enabled[effect] ? '开' : '关';
      if (effect === 'ink') world.shop.outlines.visible = pipeline.enabled.ink;
    });
  }
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const hitTargets = world.places.flatMap((place) => place.targets);
  const placeByTarget = new Map(world.places.flatMap((place) => place.targets.map((target) => [target, place.id])));
  let down;
  canvas.addEventListener('pointerdown', (event) => { down = event.isPrimary ? { x: event.clientX, y: event.clientY, id: event.pointerId } : undefined; });
  canvas.addEventListener('pointercancel', () => { down = undefined; });
  canvas.addEventListener('pointerup', (event) => {
    if (!down || down.id !== event.pointerId || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) { down = undefined; return; }
    down = undefined;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(hitTargets, false)[0];
    if (hit) business.action(placeByTarget.get(hit.object));
  });
  const hotspots = world.places.map((place) => ({ ...place, button: document.querySelector('[data-place="' + place.id + '"]') }));
  const projected = new THREE.Vector3();
  let width = 1, height = 1, narrowView;
  function resetView() {
    narrowView = width / height < 1;
    controls.enableDamping = false; controls.update();
    camera.fov = narrowView ? 50 : 43;
    camera.position.set(narrowView ? 10 : 13, narrowView ? 16 : 12, narrowView ? 39 : 30);
    controls.target.set(0, 2.2, -.7);
    camera.updateProjectionMatrix(); controls.update(); controls.enableDamping = true;
  }
  document.querySelector('#reset-view').addEventListener('click', () => { tour.explore(); resetView(); });
  function resize() {
    width = frameElement.clientWidth; height = frameElement.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    pipeline.setSize(width, height); setOutlineResolution(width, height);
    if (narrowView !== (width / height < 1)) {
      if (tour?.ownsCamera) narrowView = width / height < 1;
      else resetView();
    }
  }
  new ResizeObserver(resize).observe(frameElement);
  resize(); resetView();
  tour = setupStreetTour({ camera, controls, canvas, frameElement, setShop, reducedMotion });
  function positionHotspots() {
    const occupied = [];
    hotspots.forEach(({ id, point, button }) => {
      projected.copy(point).project(camera);
      const rawX = (projected.x * .5 + .5) * width;
      const rawY = (-projected.y * .5 + .5) * height;
      const visible = (!tour.ownsCamera || id === tour.place) && projected.z > -1 && projected.z < 1 && rawX >= 0 && rawX <= width && rawY > 65 && rawY < height - 60;
      button.hidden = !visible;
      if (!visible) return;
      const half = button.offsetWidth / 2 + 9;
      const x = THREE.MathUtils.clamp(rawX, half, width - half);
      let y = rawY;
      occupied.forEach((previous) => { if (Math.abs(x - previous.x) < half + previous.half && Math.abs(y - previous.y) < 36) y = previous.y - 42; });
      y = Math.max(95, y); occupied.push({ x, y, half });
      button.style.left = x + 'px'; button.style.top = y + 'px';
    });
  }
  let inView = true;
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { rootMargin: '40px' }).observe(frameElement);
  const timer = new THREE.Timer(); timer.connect(document);
  let petalTime = 0, loggedFrame = false;
  world.animatePetals(0);
  function frame(timestamp) {
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), .05);
    tour.update(timer.getDelta(), !document.hidden && inView && !business.isDialogOpen());
    if (!document.hidden && inView) {
      if (!reducedMotion.matches) { petalTime += dt; world.animatePetals(petalTime); }
      world.shop.update(tour.paused ? 0 : dt, reducedMotion.matches);
      if (!tour.ownsCamera) controls.update();
      positionHotspots();
      renderer.info.reset(); pipeline.render();
      if (!loggedFrame) {
        console.info('Sakura Research Lane first frame: ' + JSON.stringify({ drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, viewport: [width, height] }));
        loggedFrame = true;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
try { start(); }
catch (error) {
  console.error('Unable to initialize Sakura Research Lane:', error);
  document.querySelector('#scene-error').hidden = false;
  document.querySelector('#hotspots').hidden = true;
  [inkButton, gradeButton, document.querySelector('#reset-view')].forEach((button) => { button.disabled = true; });
}
