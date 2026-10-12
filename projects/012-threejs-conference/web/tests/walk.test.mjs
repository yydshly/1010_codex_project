import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
import { buildModelBvh } from '../src/upstream/bvh.js';
import { createWalkControls } from '../src/controls/createWalkControls.js';

globalThis.window = new EventTarget(); window.matchMedia = () => ({ matches: false });
globalThis.document = new EventTarget(); document.pointerLockElement = null;
globalThis.HTMLElement = class extends EventTarget {}; globalThis.Element = HTMLElement;
function fixture({ wall = false, roof = false, curb = false } = {}) {
  const roots = new THREE.Group(); const material = new THREE.MeshBasicNodeMaterial();
  const add = (size, pos) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...pos); roots.add(mesh); };
  if (wall) add([20, 4, .5], [0, 2, 0]);
  if (roof) add([10, .2, 10], [0, 4, 0]);
  if (curb) add([10, .16, 4], [0, .08, -3]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), material); ground.rotation.x = -Math.PI / 2; ground.updateMatrixWorld();
  roots.updateMatrixWorld(true); buildModelBvh(roots); buildModelBvh(ground);
  const camera = new THREE.PerspectiveCamera(); camera.position.set(0, 1.65, 4); camera.lookAt(0, 1.65, -10);
  const walk = createWalkControls({ camera, domElement: new HTMLElement(), model: roots, colliders: [roots], ground, settings: { eyeHeight: 1.65, playerRadius: .38, moveSpeed: 3.4 } });
  walk.setActive(true); return { camera, walk, advance: n => { for (let i = 0; i < n; i++) walk.update(1 / 60); } };
}
test('BVH 阻挡迎面墙壁，持续前进不穿墙', () => {
  const f = fixture({ wall: true }); f.walk.setMoveAxes(0, -1); f.advance(300);
  assert.ok(f.camera.position.z > .62 && f.camera.position.z < .85, `z=${f.camera.position.z}`); f.walk.dispose();
});
test('斜向碰墙保留沿墙移动', () => {
  const f = fixture({ wall: true }); f.walk.setMoveAxes(1, -1); f.advance(180);
  assert.ok(f.camera.position.x > 5); assert.ok(f.camera.position.z > .62); f.walk.dispose();
});
test('雨棚下站在地面，而非跳到屋顶', () => {
  const f = fixture({ roof: true }); f.walk.setMoveAxes(0, -1); f.advance(120);
  assert.ok(Math.abs(f.camera.position.y - 1.65) < .001); f.walk.dispose();
});
test('重叠基础地面时，正确踏上 16 cm 路缘', () => {
  const f = fixture({ curb: true }); f.walk.setMoveAxes(0, -1); f.advance(125);
  assert.ok(f.camera.position.z < -1); assert.ok(Math.abs(f.camera.position.y - 1.81) < .001); f.walk.dispose();
});
test('蹲下保持脚底高度，窗口失焦停止持续移动', () => {
  const f = fixture(); f.walk.setCrouched(true); assert.ok(Math.abs(f.camera.position.y - 1.65 * .55) < .001);
  f.walk.setCrouched(false); f.walk.setMoveAxes(0, -1); f.advance(20); window.dispatchEvent(new Event('blur'));
  const z = f.camera.position.z; f.advance(60); assert.equal(f.camera.position.z, z); f.walk.dispose();
});
