import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeSignTexture } from './textures.js';
import { createDropletMaterial } from '../effects/droplets.js';
import { createDistrict } from './district.js';
import { buildModelBvh } from '../upstream/bvh.js';

export function createWorld(scene) {
  const geometryCache = new Map();
  const materials = {
    concrete: new THREE.MeshStandardNodeMaterial({ color: '#273440', roughness: .92 }),
    concrete2: new THREE.MeshStandardNodeMaterial({ color: '#1f2937', roughness: .8 }),
    metal: new THREE.MeshStandardNodeMaterial({ color: '#2b4145', metalness: .8, roughness: .4 }),
    walkway: new THREE.MeshStandardNodeMaterial({ color: '#343e47', roughness: .75 }),
    black: new THREE.MeshStandardNodeMaterial({ color: '#080d14', roughness: .8 }),
  };
  const neonMaterials = [];
  const pointLights = [];
  const collisionRoot = new THREE.Group(); collisionRoot.name = 'walk-proxies'; collisionRoot.visible = false; scene.add(collisionRoot);
  const collisionMat = new THREE.MeshBasicNodeMaterial();
  function collider(size, pos) { return box(size, pos, collisionMat, collisionRoot); }
  function box(size, pos, mat, parent = scene) {
    const key = size.join(',');
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE.BoxGeometry(...size));
    const mesh = new THREE.Mesh(geometryCache.get(key), mat); mesh.position.set(...pos);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function emissive(color, intensity = 2.5, group = 0) {
    const m = new THREE.MeshStandardNodeMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: .6 });
    neonMaterials.push({ material: m, group, color }); return m;
  }
  function lamp(pos, color, power, distance, group) {
    const l = new THREE.PointLight(color, power, distance, 2); l.position.set(...pos); scene.add(l);
    pointLights.push({ light: l, group, color }); return l;
  }
  const cyan = emissive('#63f7c6', 3, 0);
  const magenta = emissive('#e267ad', 2.6, 1);
  const gold = emissive('#f3cc69', 2.8, 2);
  const dimWindows = emissive('#adbfce', .4, 3);
  // 街道约 12 米宽，纵深 65 米，所有建筑均为原创参数化几何。
  for (const side of [-1, 1]) {
    box([2.5, .16, 68], [side * 6.8, .08, -22], materials.walkway);
    collider([2.5, .16, 68], [side * 6.8, .08, -22]);
    box([.12, .3, 68], [side * 5.55, .16, -22], materials.metal);
    for (let i = 0; i < 8; i++) {
      if (i === 4) continue; // 横街路口留空，连接市集与站台。
      const height = 11 + ((i * 7 + (side + 1) * 3) % 12);
      const z = 7 - i * 8;
      const x = side * (10 + (i % 2) * .3);
      box([6.5, height, 7.7], [x, height / 2, z], i % 2 ? materials.concrete : materials.concrete2);
      collider([6.5, height, 7.7], [x, height / 2, z]);
      box([6.7, .35, 7.9], [x, 4.2, z], materials.metal);
      box([6.7, .3, 7.9], [x, height - .2, z], materials.metal);
      // 面向街道的门、窗、通风管和灯带。
      box([.14, 2.6, 2], [side * 6.68, 1.55, z + .9], materials.black);
      for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
        const on = (row * 3 + col + i) % 4 !== 0;
        box([.035, 1.2, .8], [side * 6.72, 6.1 + row * 2.7, z - 2.5 + col * 2.1], on ? dimWindows : materials.black);
        box([.11, .09, 1.1], [side * 6.57, 5.45 + row * 2.7, z - 2.5 + col * 2.1], materials.metal);
      }
      box([.17, height - 1, .15], [side * 6.55, height / 2, z - 3.5], materials.metal);
      box([.4, .9, 1.3], [side * 6.4, 5.2, z - 2], materials.metal);
      if (i % 2 === 0) {
        box([.08, .05, 5.8], [side * 6.57, 3.15, z], side === -1 ? cyan : magenta);
        lamp([side * 5.2, 3.1, z], side === -1 ? '#63f7c6' : '#e267ad', 75, 14, side === -1 ? 0 : 1);
      }
    }
  }
  // 远处的楼层和霓虹，形成街道纵深。
  box([22, 27, 7], [0, 13.5, -59], materials.concrete);
  collider([22, 27, 7], [0, 13.5, -59]);
  for (let i = 0; i < 7; i++) {
    box([1.2, 10 + i * 2, 5], [-25 + i * 8, 18 + i % 3 * 3, -68 - i % 2 * 6], materials.concrete2);
  }
  function sign(text, subtitle, color, pos, size, rotationY = 0, vertical = false, group = 0) {
    const tex = makeSignTexture(text, subtitle, color, vertical);
    const m = new THREE.MeshStandardNodeMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 2.1, roughness: .8 });
    neonMaterials.push({ material: m, group, color: '#ffffff', textured: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), m); mesh.position.set(...pos); mesh.rotation.y = rotationY; scene.add(mesh);
    const back = box([size[0] + .12, size[1] + .12, .12], pos, materials.metal); back.rotation.y = rotationY; back.position.z -= Math.cos(rotationY) * .08; back.position.x -= Math.sin(rotationY) * .08;
    return mesh;
  }
  sign('雨巷', 'NIGHT MARKET / 012', '#cfe887', [-5.5, 6.7, .3], [1.5, 5], .28, true, 0);
  sign('霓虹', 'OPEN ALL NIGHT', '#f69bca', [5.4, 6, -5], [1.4, 4.6], -.3, true, 1);
  sign('月光商店', 'MOONLIGHT · 24H', '#75e7d6', [-3.6, 3.5, -14.6], [4.5, 1.5], 0, false, 0);
  sign('夜航', 'AFTER HOURS', '#eed48c', [4.5, 4.7, -21.1], [3.2, 1.1], -.25, false, 2);
  sign('NEON', 'WEBGPU / TSL', '#f386c1', [-1, 10, -58], [9, 2.8], 0, false, 1);
  sign('雨', 'RAIN', '#c7ec96', [-5.4, 9.1, -30], [1.6, 5.3], .15, true, 0);
  sign('02', 'PUNK CITY', '#75cbff', [5.2, 10, -37], [2.4, 4], -.2, false, 0);
  // 可观察的雨棚：高度纹理会记录它的顶面。
  box([3.5, .16, 5], [-5.25, 3.6, -3.5], materials.metal);
  for (const z of [-6, -1]) box([3.6, .045, .05], [-5.25, 3.68, z], cyan);
  for (const x of [-7, -3.5]) box([.05, .045, 5], [x, 3.68, -3.5], cyan);
  for (const z of [-5.9, -1.1]) box([.12, 3.6, .12], [-3.6, 1.8, z], materials.metal);
  for (const z of [-5.9, -1.1]) collider([.18, 3.6, .18], [-3.6, 1.8, z]);
  // 原创招牌墙、街边道具与几何车辆。
  box([1.1, 1.7, .7], [5.1, .95, -9], materials.metal);
  collider([1.1, 1.7, .7], [5.1, .95, -9]);
  sign('雨夜', 'RESEARCH', '#a5dcc2', [5.1, 1.1, -8.61], [.85, .9], 0, false, 0);
  for (const pos of [[-5, .45, -10], [5, .45, -20], [-4.7, .45, -25]]) {
    box([.65, .9, .65], pos, materials.metal);
    collider([.65, .9, .65], pos);
    box([.7, .08, .7], [pos[0], pos[1] + .48, pos[2]], materials.black);
  }
  for (let i = 0; i < 7; i++) box([.65, .012, 2.2], [-3.6 + i * 1.2, .008, -17.2], new THREE.MeshStandardNodeMaterial({ color: '#737d7b', roughness: .6 }));
  const car = new THREE.Group(); car.position.set(-.7, 0, -4); car.rotation.y = -.15; scene.add(car);
  const bodyRain = createDropletMaterial('#52655b');
  const glassRain = createDropletMaterial('#233843', true);
  const rainMaterials = [bodyRain, glassRain];
  function panel(size, pos, rainMaterial, bevel = .09) {
    const geom = new RoundedBoxGeometry(...size, 2, bevel); geom.setAttribute('uv1', geom.attributes.uv.clone());
    const mesh = new THREE.Mesh(geom, rainMaterial.material); mesh.position.set(...pos); mesh.castShadow = true; car.add(mesh); return mesh;
  }
  panel([2.4, .65, 4.9], [0, .78, 0], bodyRain);
  panel([2.05, .35, 1.8], [0, 1.17, 1.45], bodyRain);
  panel([1.9, .78, 2.25], [0, 1.42, -.3], glassRain);
  panel([1.96, .11, 2.32], [0, 1.87, -.3], bodyRain, .04);
  box([2.4, .15, .1], [0, .57, 2.5], materials.black, car);
  box([2.4, .14, .1], [0, .58, -2.5], materials.black, car);
  box([2.12, .08, .06], [0, 1.02, 2.48], emissive('#e5f7cf', 3, 2), car);
  box([2.12, .07, .06], [0, .99, -2.48], emissive('#f77488', 3, 1), car);
  box([.3, .13, .3], [1.17, 1.4, .2], materials.black, car);
  box([.3, .13, .3], [-1.17, 1.4, .2], materials.black, car);
  for (const x of [-1.15, 1.15]) for (const z of [-1.55, 1.55]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .29, 24), materials.black);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(x, .48, z); car.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .31, 12), materials.metal);
    hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); car.add(hub);
  }
  lamp([-.7, .8, -1], '#dae8b2', 35, 7, 2);
  lamp([-.7, .6, -6.7], '#ef7193', 20, 6, 1);
  const carCollider = collider([2.65, 2.15, 5.15], [-.7, 1.075, -4]); carCollider.rotation.y = -.15;
  const district = createDistrict(scene, { box, sign, materials, emissive, lamp, collider });
  buildModelBvh(collisionRoot); collisionRoot.updateMatrixWorld(true);
  const ambient = new THREE.HemisphereLight('#9caac9', '#27394d', 1.6); scene.add(ambient);
  const moon = new THREE.DirectionalLight('#b6c4d8', 2.2); moon.position.set(4, 24, 10); scene.add(moon);
  const carFill = new THREE.DirectionalLight('#c8eadb', 1.8); carFill.position.set(-8, 6, 7); scene.add(carFill);
  return {
    car, rainMaterials, collisionRoot, landmarks: district.landmarks, hideFromHeight: district.hideFromHeight,
    update: district.update, dispose: district.dispose,
    setLook(look) {
      const palettes = { neon: ['#63f7c6', '#e267ad', '#f3cc69'], amber: ['#d8b767', '#e48057', '#cbe18a'], blue: ['#65cddd', '#8c9aea', '#a9cbd9'] };
      const palette = palettes[look];
      for (const entry of neonMaterials) if (!entry.textured && entry.group < 3) {
        entry.material.color.set(palette[entry.group]); entry.material.emissive.set(palette[entry.group]);
      }
      for (const entry of pointLights) entry.light.color.set(palette[entry.group]);
      ambient.color.set(look === 'amber' ? '#cdb38d' : look === 'blue' ? '#7caddb' : '#9caac9');
      scene.fog.color.set(look === 'amber' ? '#15120e' : look === 'blue' ? '#0b1628' : '#0d1220');
      scene.background.copy(scene.fog.color);
    },
  };
}
