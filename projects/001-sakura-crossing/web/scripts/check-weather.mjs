import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three/webgpu';
import * as WEBGL from 'three';
import { createWalkControls, createWeather, createWetGround } from '@research/rain-kit';
import { createStreetColliders } from '../src/weather/collision.js';
import { toonDiagnostics } from '../src/rendering/toon.js';

globalThis.window = new EventTarget(); window.matchMedia=()=>({matches:false});
globalThis.document = new EventTarget(); document.pointerLockElement=null;
globalThis.HTMLElement=class extends EventTarget {}; globalThis.Element=HTMLElement;
function fixture(position, target) {
  const colliders=createStreetColliders();
  const material=new THREE.MeshBasicMaterial();
  const ground=new THREE.Mesh(new THREE.BoxGeometry(100,.12,100),material);
  ground.position.y=-.12; ground.updateMatrixWorld();
  const model=new THREE.Group();
  // These are the existing street's road and pedestrian slab dimensions.
  for(const [size,pos] of [[[34,.08,5.3],[0,-.015,3.9]],[[27,.16,8],[0,.015,-3.1]]]) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.fromArray(pos);model.add(mesh);
  }
  model.updateMatrixWorld(true);
  const camera=new THREE.PerspectiveCamera();camera.position.fromArray(position);camera.lookAt(new THREE.Vector3().fromArray(target));
  const walk=createWalkControls({camera,domElement:new HTMLElement(),model,colliders:[colliders.root],ground,
    settings:{eyeHeight:1.65,moveSpeed:2.8,playerRadius:.28,maxStepUp:.3,maxStepDown:.7}});
  walk.setActive(true);
  return {camera,walk,advance:n=>{for(let i=0;i<n;i++)walk.update(1/60)},dispose(){walk.dispose();colliders.dispose();ground.geometry.dispose();model.traverse(o=>o.geometry?.dispose());material.dispose()}};
}
test('本项目安装的包与 012 已交付 tgz 摘要相同；两条管线共享 Three 核心',async()=>{
  const data=await readFile(new URL('../packages/research-rain-kit-0.1.0.tgz',import.meta.url));
  assert.equal(createHash('sha256').update(data).digest('hex'),'e72613d271757f8b17c641fd61cdec3f8085bd9a79304ba8990d88a489008643');
  assert.equal(THREE.Mesh,WEBGL.Mesh);assert.equal(THREE.REVISION,'185');
  assert.equal(typeof createWeather,'function');assert.equal(typeof createWetGround,'function');
  assert.equal(toonDiagnostics().shadowTintPatch,true,'原 WebGL 暗部补丁继续匹配');
});
test('樱花街商店的静态 BVH 墙体阻止持续倒退穿墙',()=>{
  const f=fixture([1.8,1.745,.65],[1.8,1.745,5.5]);f.walk.setMoveAxes(0,1);f.advance(360);
  assert.ok(f.camera.position.z>=.22&&f.camera.position.z<.4,`z=${f.camera.position.z}`);
  assert.ok(Math.abs(f.camera.position.y-1.745)<.001);f.dispose();
});
test('原街道到人行道踏上 7 cm 台阶，蹲下不改变脚底，退出停止输入',()=>{
  const f=fixture([0,1.675,3.9],[0,1.675,-5]);f.walk.setMoveAxes(0,-1);f.advance(70);
  assert.ok(f.camera.position.z<.9);assert.ok(Math.abs(f.camera.position.y-1.745)<.001);
  f.walk.setCrouched(true);assert.ok(Math.abs(f.camera.position.y-(.095+1.65*.55))<.001);
  f.walk.setActive(false);const before=f.camera.position.clone();f.advance(120);assert.deepEqual(f.camera.position,before);f.dispose();
});
test('阅读亭前方入口没有被屋顶或宽盒体封死，沿街移动保持地面高度',()=>{
  const f=fixture([8.6,1.745,.65],[8.6,1.745,-1.3]);f.walk.setMoveAxes(0,-1);f.advance(45);
  assert.ok(f.camera.position.z<-.8,`z=${f.camera.position.z}`);
  assert.ok(Math.abs(f.camera.position.y-1.745)<.001);f.dispose();
});
