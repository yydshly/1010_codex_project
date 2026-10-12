import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three/webgpu';
import { createWeather, createWetGround, createDropletMaterial } from '../modules/rain-kit/index.js';
import { createCollisionHeight } from '../modules/rain-kit/internal/height.js';

function fakeRenderer() {
  return { target: { host: true }, mrt: { host: true }, autoClear: false, computeCalls: 0, renders: 0,
    coordinateSystem: THREE.WebGPUCoordinateSystem,
    getRenderTarget() { return this.target; }, setRenderTarget(value) { this.target = value; },
    getMRT() { return this.mrt; }, setMRT(value) { this.mrt = value; },
    getDrawingBufferSize(value) { value.set(800, 600); },
    render() { this.renders++; if (this.fail) throw new Error('controlled render error'); },
    compute() { this.computeCalls++; },
  };
}
// 仅用于 CPU 接口测试的水花画布；真实 GPU 检查使用 verification.html。
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, beginPath() {}, ellipse() {}, stroke() {}, fill() {} }) }) };
test('天气可见数量不会超过分配容量；停雨停止高度与计算，恢复后继续', async () => {
  const scene = new THREE.Scene(); const renderer = fakeRenderer(); const camera = new THREE.PerspectiveCamera();
  const weather = await createWeather({ scene, renderer, camera, capacity: 1000, count: 800 });
  weather.setDropCount(5000); assert.equal(weather.rain.rainParticles.count, 1000);
  assert.equal(weather.rain.splashParticles.count, 1000); assert.equal(weather.getState().capacity, 1000);
  const renders = renderer.renders; const computes = renderer.computeCalls;
  weather.setEnabled(false); weather.update(1 / 60);
  assert.equal(renderer.computeCalls, computes); assert.equal(renderer.renders, renders); assert.equal(weather.group.visible, false);
  weather.setEnabled(true); weather.update(1 / 60); weather.update(1 / 60);
  assert.ok(renderer.computeCalls > computes); assert.ok(renderer.renders > renders);
  weather.dispose(); weather.dispose(); assert.equal(scene.children.length, 0); assert.equal(camera.layers.isEnabled(2), false);
  assert.throws(() => weather.rain.setDropCount(NaN), /有限数值/);
});
test('高度通道渲染异常时恢复宿主目标、MRT、材质、清屏与可见性', () => {
  const scene = new THREE.Scene(); const hidden = new THREE.Group(); hidden.visible = false; const visible = new THREE.Group();
  scene.add(hidden, visible); const override = new THREE.MeshBasicNodeMaterial(); scene.overrideMaterial = override;
  const renderer = fakeRenderer(); const previous = { target: renderer.target, mrt: renderer.mrt }; renderer.fail = true;
  const height = createCollisionHeight({ scene, renderer, frameSkip: 1 });
  assert.throws(() => height.update({ camera: new THREE.PerspectiveCamera(), hideObjects: [hidden, visible], force: true }), /controlled/);
  assert.equal(renderer.target, previous.target); assert.equal(renderer.mrt, previous.mrt); assert.equal(renderer.autoClear, false);
  assert.equal(scene.overrideMaterial, override); assert.equal(visible.visible, true); assert.equal(hidden.visible, false); height.dispose(); override.dispose();
});
test('湿地预算按实例配置，借用纹理不被释放，异常后恢复渲染状态', () => {
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(); camera.position.set(0, 4, 5); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const textures = { albedoMap: new THREE.Texture(), roughnessMap: new THREE.Texture(), normalMapTex: new THREE.Texture() };
  let releases = 0; for (const texture of Object.values(textures)) texture.addEventListener('dispose', () => releases++);
  const a = createWetGround({ scene, textures, frameSkip: 1, resolutionScale: .25 });
  const b = createWetGround({ scene, textures, frameSkip: 3, resolutionScale: .5 }); scene.updateMatrixWorld(true);
  const renderer = fakeRenderer(); a.updateReflection(renderer, camera); b.updateReflection(renderer, camera);
  assert.equal(a.renderTarget.width, 200); assert.equal(b.renderTarget.width, 1);
  const target = renderer.target; const mrt = renderer.mrt; renderer.fail = true;
  assert.throws(() => a.updateReflection(renderer, camera), /controlled/);
  assert.equal(a.mesh.visible, true); assert.equal(renderer.target, target); assert.equal(renderer.mrt, mrt); assert.equal(renderer.autoClear, false);
  a.dispose(); a.dispose(); b.dispose(); assert.equal(releases, 0); assert.equal(scene.children.length, 0);
  for (const texture of Object.values(textures)) texture.dispose();
});
test('原创水珠关闭强度为零，重新开启恢复用户参数，释放只触发一次', () => {
  const drops = createDropletMaterial({ amount: .7 }); let releases = 0; drops.material.addEventListener('dispose', () => releases++);
  drops.setEnabled(false); drops.setAmount(.3); drops.update(.02);
  assert.equal(drops.uniforms.amount.value, 0); assert.equal(drops.uniforms.time.value, 0);
  drops.setEnabled(true); assert.equal(drops.uniforms.amount.value, .3); drops.update(.02); assert.equal(drops.uniforms.time.value, .02);
  assert.throws(() => drops.setAmount(NaN), /有限数值/);
  drops.dispose(); drops.dispose(); assert.equal(releases, 1); assert.equal(drops.getState().amount, 0);
});
test('模块包的相对导入全部闭合，不依赖原街区或页面路径', async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../modules/rain-kit');
  async function visit(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = resolve(folder, entry.name); if (entry.isDirectory()) await visit(path);
      else if (entry.name.endsWith('.js')) {
        const code = await readFile(path, 'utf8');
        for (const [, specifier] of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
          if (specifier.startsWith('.')) {
            const target = resolve(dirname(path), specifier); assert.ok(!relative(root, target).startsWith('..'), `${path} escapes package`); await readFile(target);
          } else assert.ok(specifier.startsWith('three/') || specifier === 'three-mesh-bvh', `${path}: ${specifier}`);
        }
      }
    }
  }
  await visit(root);
});
