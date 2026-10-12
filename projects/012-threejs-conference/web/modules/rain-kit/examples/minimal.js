// 可复制到其他 Vite 项目；安装包后把下面路径换成 '@research/rain-kit'。
import * as THREE from 'three/webgpu';
import { createWeather, createWetGround, createDropletMaterial, createWalkControls, buildModelBvh } from '../index.js';

export async function createMinimalExample({ canvas, onState = () => {} }) {
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 1.25));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  await renderer.init();
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#111c27'); scene.fog = new THREE.Fog('#111c27', 20, 65);
  const camera = new THREE.PerspectiveCamera(55, 1, .1, 100);
  const host = new THREE.Group(); const blockers = new THREE.Group(); scene.add(host, blockers); blockers.visible = false;
  const geometries = new Set(); const materials = new Set();
  function box(size, position, color, { parent = host, glow = false } = {}) {
    const geometry = new THREE.BoxGeometry(...size); geometries.add(geometry);
    const material = new THREE.MeshStandardNodeMaterial({ color, roughness: .45,
      emissive: glow ? color : '#000000', emissiveIntensity: glow ? 3 : 0 }); materials.add(material);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); parent.add(mesh); return mesh;
  }
  const floor = box([80, .1, 80], [0, -.05, 0], '#28333e');
  const sample = box([2.8, 1.4, 2.8], [0, 1.2, -2], '#9bb9aa');
  box([3.6, .5, 3.6], [0, .25, -2], '#3a4851');
  box([3.6, 2.5, 3.6], [0, 1.25, -2], '#ffffff', { parent: blockers });
  const roof = box([6, .2, 5], [-6, 3.4, -6], '#355164');
  for (const x of [-8.7, -3.3]) for (const z of [-8.2, -3.8]) {
    box([.16, 3.3, .16], [x, 1.65, z], '#526778');
    box([.3, 3.3, .3], [x, 1.65, z], '#ffffff', { parent: blockers });
  }
  box([5.5, .12, .12], [-6, 3.3, -3.45], '#69ebd5', { glow: true });
  box([.18, 4, 2.4], [5, 2, -7], '#f79ebb', { glow: true });
  box([1.8, 2.5, 1.8], [5, 1.25, -7], '#ffffff', { parent: blockers });
  const sky = new THREE.HemisphereLight('#e0f7ff', '#203848', 2.2); scene.add(sky);
  const key = new THREE.DirectionalLight('#eef7ff', 3); key.position.set(-4, 10, 5); scene.add(key);
  for (const [position, color] of [[[-6, 3, -3], '#69ebd5'], [[5, 3, -5], '#f79ebb']]) {
    const light = new THREE.PointLight(color, 110, 18); light.position.set(...position); scene.add(light);
  }
  scene.updateMatrixWorld(true); buildModelBvh(blockers); buildModelBvh(roof); buildModelBvh(floor);
  const dryMaterial = sample.material;
  let modules = null; let disposed = false; let pending = false;
  function setView(view = 'wide') {
    modules?.walk.setActive(false);
    const views = { wide: [[8, 5.5, 12], [-1, 1, -4]], material: [[3.2, 2.6, 1], [0, 1.3, -2]], roof: [[-6, 1.65, 1], [-6, 1.65, -6]] };
    const [position, target] = views[view]; camera.position.set(...position); camera.lookAt(...target);
    modules?.walk.syncEulerFromCamera();
  }
  setView();
  async function mount() {
    if (disposed || pending || modules) return;
    pending = true; let ground; let droplets; let walk; let weather;
    try {
      ground = createWetGround({ scene, size: 80, y: .01, fogNear: 30, fogFar: 70,
        uvRepeat: 12, reflectionStrength: .8, normalWarp: .005, rippleStrength: .008, rippleNormalStrength: .002 });
      droplets = createDropletMaterial({ color: '#a6caba', metalness: .05, uvChannel: 0 }); sample.material = droplets.material;
      walk = createWalkControls({ camera, domElement: canvas, model: roof, colliders: [blockers], ground: floor,
        baseFov: 65, settings: { eyeHeight: 1.65, playerRadius: .38, moveSpeed: 3 } });
      weather = await createWeather({ scene, renderer, camera, capacity: 2000, count: 1500,
        height: { width: 60, height: 60, cameraHeight: 30, depth: 60, resolution: 192 },
        rain: { rainArea: { width: 18, height: 18 }, opacity: .5 }, hideObjects: [blockers] });
      modules = { weather, ground, droplets, walk };
    } catch (error) {
      weather?.dispose(); walk?.dispose(); droplets?.dispose(); ground?.dispose(); sample.material = dryMaterial; throw error;
    } finally { pending = false; }
    return modules;
  }
  function unmount() {
    if (!modules) return;
    const { weather, ground, droplets, walk } = modules; modules = null;
    walk.dispose(); weather.dispose(); ground.dispose(); sample.material = dryMaterial; droplets.dispose();
  }
  function setEffect(key, enabled) {
    if (!modules) return;
    if (key === 'weather') { modules.weather.setEnabled(enabled); modules.ground.setRippleAmount(enabled ? 1 : 0); }
    else if (key === 'ground') modules.ground.setEnabled(enabled);
    else if (key === 'droplets') modules.droplets.setEnabled(enabled);
    else if (key === 'walk') {
      if (enabled) { camera.position.set(0, 1.65, 9); camera.lookAt(0, 1.65, -6); }
      modules.walk.setActive(enabled);
    }
  }
  function resize(width, height) {
    renderer.setSize(Math.max(1, width), Math.max(1, height), false); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
  }
  await mount();
  let previous = performance.now(); let lastReport = 0;
  renderer.setAnimationLoop(now => {
    if (disposed) return; const delta = Math.min(Math.max((now - previous) / 1000, 0), .05); previous = now;
    if (modules) {
      modules.walk.update(delta); modules.weather.update(delta);
      modules.ground.update(delta); modules.droplets.update(delta);
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); modules.ground.updateReflection(renderer, camera);
    }
    renderer.render(scene, camera);
    if (now - lastReport > 300) {
      lastReport = now;
      onState({ mounted: Boolean(modules), backend: renderer.backend.isWebGLBackend ? 'WebGL2' : 'WebGPU',
        weather: modules?.weather.getState(), ground: modules?.ground.isEnabled(), droplets: modules?.droplets.getState(),
        walking: Boolean(modules?.walk.isActive()), position: camera.position.toArray(),
        effectGroups: scene.children.filter(child => ['CollisionRain', 'ReflectiveGround'].includes(child.name)).length });
    }
  });
  return { mount, unmount, setEffect, setView, resize, get modules() { return modules; },
    dispose() {
      if (disposed) return; disposed = true; renderer.setAnimationLoop(null); unmount();
      for (const geometry of geometries) { geometry.disposeBoundsTree?.(); geometry.dispose(); }
      for (const material of materials) material.dispose(); renderer.dispose();
    },
  };
}
