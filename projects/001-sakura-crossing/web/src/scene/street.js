import * as THREE from 'three';
import { cel, flat } from '../rendering/toon.js';
import { PAL } from '../rendering/palette.js';
import { hullOutlineTree } from '../rendering/outline.js';

// Local scene, authored for this experiment. Geometry and textures are generated
// at runtime; no upstream world geometry, screenshots or audio are embedded.
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function faceted(geometry) {
  const result = geometry.index ? geometry.toNonIndexed() : geometry;
  if (result !== geometry) geometry.dispose();
  result.computeVertexNormals();
  return result;
}

function box(parent, size, pos, material, { shadow = true } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...pos);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  parent.add(mesh);
  return mesh;
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function signTexture() {
  return canvasTexture(1024, 256, (c, w, h) => {
    c.fillStyle = '#fff8ec'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c96b77'; c.fillRect(0, 0, w, 8); c.fillRect(0, h - 9, w, 9);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 88px "Yu Gothic", "Microsoft YaHei", sans-serif';
    c.fillStyle = '#386881'; c.fillText('春日研究商店', w / 2, 102);
    c.font = '24px "Segoe UI", sans-serif'; c.fillStyle = '#887d8b';
    c.fillText('OPEN SOURCE NOTES  •  DISCOVER SOMETHING', w / 2, 199);
  });
}

function awningTexture() {
  return canvasTexture(512, 128, (c, w, h) => {
    c.fillStyle = '#e7a0a4'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#f7e1d9' : '#c56671';
      c.fillRect(i * w / 8, 0, w / 8, h);
    }
  });
}

function shutterTexture() {
  return canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = '#b3afc5'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 18) {
      c.fillStyle = '#8f8b9f'; c.fillRect(0, y, w, 2);
      c.fillStyle = '#d1cddd'; c.fillRect(0, y + 2, w, 2);
    }
    c.fillStyle = '#e4dde3'; c.fillRect(120, 170, 272, 135);
    c.textAlign = 'center'; c.fillStyle = '#796e83';
    c.font = 'bold 34px "Yu Gothic", "Microsoft YaHei", sans-serif';
    c.fillText('灵感，等你开启', w / 2, 225);
    c.font = '20px sans-serif'; c.fillText('SEE YOU SOON', w / 2, 271);
  });
}

function interiorTexture() {
  return canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = '#f5d9a6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#bd8c77'; c.fillRect(32, 130, w - 64, 12); c.fillRect(32, 310, w - 64, 12);
    const colors = ['#a7797e', '#81988b', '#eac387', '#7c91a4'];
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 8; i++) {
        const x = 50 + i * 52, y = row ? 228 : 55;
        c.fillStyle = colors[(i + row) % 4]; c.fillRect(x, y, 28, 75);
        c.fillStyle = '#f7ecdb'; c.fillRect(x + 4, y + 29, 20, 18);
      }
    }
    c.fillStyle = '#ae7e67'; c.fillRect(15, 385, w - 30, 100);
    c.fillStyle = '#edc99f'; c.fillRect(8, 381, w - 16, 14);
    c.textAlign = 'center'; c.fillStyle = '#805a66'; c.font = '25px "Yu Gothic", sans-serif';
    c.fillText('欢迎翻阅 · 研究笔记', w / 2, 365);
  });
}

function branch(parent, from, to, radius) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const direction = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .65, radius, direction.length(), 7), cel({ color: 0x896777 }));
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
}

function buildTree(scene) {
  const tree = new THREE.Group();
  tree.name = 'single-sakura-tree';
  tree.position.set(-4.1, .12, -.15);
  scene.add(tree);
  branch(tree, [0, 0, 0], [.15, 3.1, 0], .22);
  const arms = [[-1.6, 3.9, .05], [1.7, 4.2, -.1], [.2, 4.7, -.7], [-.6, 4, 1.15], [1.1, 3.7, 1.1]];
  arms.forEach((end) => branch(tree, [.12, 2.3, 0], end, .115));
  const random = rng(2411);
  const geometry = faceted(new THREE.IcosahedronGeometry(1, 1));
  const blossoms = new THREE.InstancedMesh(geometry, cel({ color: 0xffffff, bands: 'soft3' }), 24);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 24; i++) {
    const angle = i * 2.39996;
    const radius = i < 6 ? .5 : 1.45 + random() * .9;
    dummy.position.set(Math.cos(angle) * radius, 4.0 + random() * 1.35, Math.sin(angle) * radius * .72);
    const scale = .72 + random() * .58;
    dummy.scale.set(scale * 1.18, scale * .85, scale);
    dummy.rotation.set(random(), random(), random()); dummy.updateMatrix();
    blossoms.setMatrixAt(i, dummy.matrix);
    blossoms.setColorAt(i, new THREE.Color(PAL.blossom[i % PAL.blossom.length]));
  }
  blossoms.instanceMatrix.needsUpdate = true;
  blossoms.instanceColor.needsUpdate = true;
  blossoms.castShadow = true;
  blossoms.receiveShadow = false; // Keep the painted blossom mass pale, like upstream.
  tree.add(blossoms);

  const petals = new THREE.InstancedMesh(new THREE.PlaneGeometry(.10, .065), flat({ color: 0xf3bdcb, side: THREE.DoubleSide, transparent: true, opacity: .85, depthWrite: false }), 46);
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const seeds = Array.from({ length: 46 }, () => [random() * 6, random() * 7, random() * Math.PI * 2]);
  scene.add(petals);
  return (time) => {
    seeds.forEach(([x, y, phase], i) => {
      dummy.position.set(-7 + x + Math.sin(time * .32 + phase) * .8, .10 + ((y - time * .27) % 6 + 6) % 6, -.2 + Math.sin(phase) * 2.1 + time % 1 * .01);
      dummy.scale.set(1, 1, 1); dummy.rotation.set(phase + time * .3, time * .4, phase); dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    });
    petals.instanceMatrix.needsUpdate = true;
  };
}

function buildShop(scene) {
  const root = new THREE.Group(); root.name = 'single-shop'; root.position.set(1.8, .16, -.05); scene.add(root);
  const wall = cel({ color: PAL.wall }), trim = cel({ color: 0xddd1cb }), blue = cel({ color: PAL.blue });
  box(root, [5.6, 4.0, 3.8], [0, 2.0, -1.9], wall);
  box(root, [5.85, .16, 4.05], [0, 4.08, -1.92], cel({ color: PAL.roof }));
  box(root, [5.55, .25, .55], [0, .13, .15], trim);
  box(root, [5.3, .80, .14], [0, 3.5, .09], cel({ color: 0xfbf5e9 }));
  const signMaterial = flat({ map: signTexture(), color: 0xffffff, cache: false });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.12, .78), signMaterial);
  sign.position.set(0, 3.51, .18); root.add(sign);

  box(root, [3.46, 2.85, .16], [0, 1.62, .1], blue);
  const interior = new THREE.Mesh(new THREE.PlaneGeometry(3.17, 2.58), flat({ color: 0xffffff, map: interiorTexture(), cache: false }));
  interior.position.set(0, 1.59, .205); root.add(interior);
  box(root, [.11, 2.65, .14], [0, 1.6, .26], cel({ color: 0xb69485 }));
  const shutter = box(root, [3.19, 2.65, .075], [0, 1.62, .34], cel({ color: 0xffffff, map: shutterTexture(), cache: false }));
  box(root, [3.5, .18, .32], [0, 3.0, .25], trim);
  box(root, [.11, 2.9, .17], [-1.71, 1.58, .24], trim);
  box(root, [.11, 2.9, .17], [1.71, 1.58, .24], trim);
  for (const x of [-2.2, 2.2]) {
    box(root, [.68, 1.85, .11], [x, 1.55, .1], blue);
    box(root, [.52, 1.65, .04], [x, 1.55, .18], cel({ color: 0x9cb8c1 }));
    box(root, [.68, .065, .09], [x, 1.65, .23], trim);
  }
  const canopyMat = cel({ color: 0xffffff, map: awningTexture(), cache: false });
  const awning = box(root, [5.7, .11, 1.07], [0, 3.03, .56], canopyMat);
  awning.rotation.x = .13;
  box(root, [5.7, .30, .10], [0, 2.88, 1.08], canopyMat);
  const lampMat = cel({ color: 0xffe1a6, emissive: 0xe6ae66, emissiveIntensity: 0.0, cache: false });
  for (const x of [-2.3, 2.3]) {
    box(root, [.10, .28, .19], [x, 3.95, .12], blue);
    box(root, [.36, .14, .34], [x, 3.87, .24], blue);
    box(root, [.26, .08, .24], [x, 3.77, .24], lampMat);
  }
  box(root, [.45, .64, .22], [2.33, .55, .38], cel({ color: PAL.coral }));
  box(root, [.32, .055, .02], [2.33, .65, .50], flat({ color: 0x784f66 }));

  // A small constant-width hull accents the shop trim. Screen-space ink handles everything else.
  const trimShells = new THREE.Group();
  box(trimShells, [5.86, .14, .12], [0, 4.12, .11], cel({ color: PAL.roof }));
  root.add(trimShells); hullOutlineTree(trimShells, { thickness: .0022 });
  let target = 0, progress = 0;
  return {
    hitTargets: [sign, shutter, interior],
    outlines: trimShells,
    setOpen(open) { target = open ? 1 : 0; },
    update(dt, reducedMotion) {
      progress = reducedMotion ? target : THREE.MathUtils.damp(progress, target, 6, dt);
      const scale = 1 - progress * .96;
      shutter.scale.y = scale;
      shutter.position.y = 2.945 - 2.65 * scale / 2;
      lampMat.emissiveIntensity = progress * 1.3;
    },
  };
}

function poster(parent, size, position, text, subtitle, color) {
  const texture = canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = '#f9f0df'; c.fillRect(0, 0, w, h);
    c.fillStyle = color; c.fillRect(20, 20, w - 40, 9);
    c.textAlign = 'center'; c.fillStyle = '#426c77'; c.font = 'bold 63px "Microsoft YaHei", sans-serif';
    c.fillText(text, w / 2, 170);
    c.font = '25px "Microsoft YaHei", sans-serif'; c.fillStyle = '#8b7e84'; c.fillText(subtitle, w / 2, 226);
    c.fillStyle = color;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(135 + i * 120, 330, 31, 0, Math.PI * 2); c.fill(); }
    c.font = '22px sans-serif'; c.fillStyle = '#7c8b83'; c.fillText('SPRING / RESEARCH / DISCOVER', w / 2, 431);
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), flat({ map: texture, color: 0xffffff, cache: false }));
  mesh.position.set(...position); parent.add(mesh); return mesh;
}

function buildBulletin(scene) {
  const root = new THREE.Group(); root.position.set(-8.6, .16, -.25); scene.add(root);
  const wood = cel({ color: 0x779a8b });
  for (const x of [-1.2, 1.2]) box(root, [.16, 2.8, .18], [x, 1.4, 0], wood);
  box(root, [2.85, 2.35, .18], [0, 2.0, 0], wood);
  const board = poster(root, [2.56, 2.1], [0, 2.0, .102], '效果图鉴', '描线 · 色阶 · 调色', '#c48591');
  box(root, [3.1, .18, .85], [0, 3.28, .02], cel({ color: 0x5e7d77 }));
  return { target: board, point: new THREE.Vector3(-8.6, 4.1, -.25) };
}

function buildPavilion(scene) {
  const root = new THREE.Group(); root.position.set(8.6, .16, -1.5); scene.add(root);
  const wood = cel({ color: 0xb49383 }), roof = cel({ color: 0x668893 });
  box(root, [4.0, .2, 3.4], [0, .1, -.8], cel({ color: 0xe0d1bf }));
  for (const x of [-1.65, 1.65]) for (const z of [.6, -2.1]) box(root, [.17, 2.8, .17], [x, 1.5, z], wood);
  const roofMesh = box(root, [4.4, .24, 3.9], [0, 3.02, -.8], roof); roofMesh.rotation.x = .035;
  box(root, [3.5, .6, .15], [0, 2.7, .63], wood);
  const sign = poster(root, [2.6, .55], [0, 2.73, .72], '阅读亭', 'YOUR READING LIST', '#729286');
  box(root, [2.8, .14, .7], [0, .8, -.8], wood);
  box(root, [2.8, .6, .12], [0, 1.15, -1.18], wood);
  for (const x of [-1.1, 1.1]) box(root, [.14, .7, .5], [x, .4, -.8], wood);
  box(root, [.95, 1.45, .35], [1.1, .85, -1.8], cel({ color: 0x688579 }));
  const bookColors = [0xc47c89, 0xe5bd7e, 0x8199b3, 0xb5af88];
  for (let i = 0; i < 6; i++) box(root, [.09, .4 + i % 2 * .08, .22], [.74 + i * .13, 1.33, -1.56], cel({ color: bookColors[i % 4] }));
  const glow = cel({ color: 0xffdea4, emissive: 0xf3b85e, emissiveIntensity: 0, cache: false });
  box(root, [.22, .35, .22], [-1.5, 2.5, .7], glow);
  const bookmark = box(root, [.4, .64, .035], [-1.5, 2, .86], cel({ color: 0xc98391 })); bookmark.visible = false;
  return { targets: [sign, roofMesh], point: new THREE.Vector3(8.6, 3.95, -1.5), setCollection(active) { glow.emissiveIntensity = active ? 1.8 : 0; bookmark.visible = active; } };
}

function buildDressing(scene) {
  const cream = cel({ color: 0xe5ddc9 }), green = cel({ color: 0x91a893 });
  const walk = box(scene, [27, .16, 8], [0, .015, -3.1], cel({ color: 0xe1dcd5 }), { shadow: false }); walk.receiveShadow = true;
  for (const [x, height, color] of [[-8.5, 3.8, 0xdfb9a7], [-2.7, 3.2, 0xe8d6b6], [3, 4.4, 0xb7c8c1], [8.6, 3.4, 0xd6c0cb]]) {
    const house = new THREE.Group(); house.position.set(x, .16, -6.9); scene.add(house);
    box(house, [4.4, height, 2.5], [0, height / 2, -.6], cel({ color }));
    box(house, [4.7, .2, 2.85], [0, height + .08, -.6], cel({ color: 0x737d8c }));
    for (const windowX of [-1.2, 1.2]) {
      box(house, [.95, .9, .08], [windowX, height - 1.0, .69], cream);
      box(house, [.77, .72, .035], [windowX, height - 1.0, .75], cel({ color: 0x9eb7bd }));
    }
  }
  for (const x of [-11.8, -6.3, 5.0, 11.6]) {
    box(scene, [.9, .4, .85], [x, .3, -.6], cel({ color: 0xb18b7c }));
    const bush = new THREE.Mesh(faceted(new THREE.IcosahedronGeometry(.6, 1)), green);
    bush.position.set(x, .8, -.6); bush.scale.set(1, .65, .8); bush.castShadow = true; scene.add(bush);
  }
  for (const x of [-11.3, 11.5]) {
    box(scene, [.1, 4.6, .1], [x, 2.3, 1.2], cel({ color: 0x638085 }));
    box(scene, [.65, .12, .6], [x, 4.7, 1.2], cel({ color: 0x5e7483 }));
    box(scene, [.34, .42, .34], [x, 4.42, 1.2], cel({ color: 0xffe4b3 }));
  }
  for (let i = 0; i < 8; i++) box(scene, [1.8, .018, .32], [-5.9, .041, 2.08 + i * .53], flat({ color: 0xf8eee0 }), { shadow: false });
  const fence = cel({ color: 0xb4beb3 });
  for (let x = -13; x <= 13; x += 1.1) box(scene, [.07, .55, .07], [x, .33, 7.65], fence);
  box(scene, [27, .08, .09], [0, .54, 7.65], fence);
  for (const x of [-4.5, -3.0]) box(scene, [.14, .6, .5], [x, .35, -2.2], cream);
  box(scene, [2.3, .14, .65], [-3.75, .65, -2.2], cel({ color: 0xb69783 }));
  box(scene, [2.3, .4, .1], [-3.75, .98, -2.48], cel({ color: 0xb69783 }));
}

export function buildStreet(scene) {
  const ground = box(scene, [100, .12, 100], [0, -.12, 0], cel({ color: 0xc4c8d3 }), { shadow: false });
  ground.receiveShadow = true;
  const road = box(scene, [34, .08, 5.3], [0, -.015, 3.9], cel({ color: PAL.road }), { shadow: false }); road.receiveShadow = true;
  for (const z of [.83, 6.96]) {
    const walk = box(scene, [34, .16, 1.1], [0, .035, z], cel({ color: PAL.sidewalk }), { shadow: false }); walk.receiveShadow = true;
    box(scene, [34, .20, .13], [0, .025, z + (z < 2 ? .57 : -.57)], cel({ color: 0xc7c2d0 }));
  }
  const paint = flat({ color: 0xf3e8d6 });
  for (let x = -15; x <= 15; x += 4) box(scene, [1.8, .012, .065], [x, .031, 4], paint, { shadow: false });
  box(scene, [34, .012, .065], [0, .032, 1.59], flat({ color: 0xe3bd66 }), { shadow: false });
  const drain = flat({ color: 0x7e798c });
  for (let i = 0; i < 5; i++) box(scene, [.36, .014, .035], [4.5, .13, .63 + i * .065], drain, { shadow: false });
  for (const x of [-12.8, 12.6]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.075, .095, 6.8, 8), cel({ color: 0x858397 }));
    post.position.set(x, 3.36, -.8); post.castShadow = true; scene.add(post);
    box(scene, [1.2, .11, .12], [x, 5.95, -.8], cel({ color: 0x5a596e }));
  }
  for (const z of [-1.1, -.8, -.5]) {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-12.8, 6.1, z), new THREE.Vector3(0, 5.0, z), new THREE.Vector3(12.6, 6.1, z));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .014, 4, false), flat({ color: 0x57566c })));
  }
  buildDressing(scene);
  const shop = buildShop(scene);
  const bulletin = buildBulletin(scene);
  const pavilion = buildPavilion(scene);
  const animatePetals = buildTree(scene);
  return {
    ground, road, shop, animatePetals, setCollection: pavilion.setCollection,
    places: [
      { id: 'effects', point: bulletin.point, targets: [bulletin.target] },
      { id: 'shop', point: new THREE.Vector3(1.8, 5.1, -.05), targets: shop.hitTargets },
      { id: 'collection', point: pavilion.point, targets: pavilion.targets },
    ],
  };
}

export function buildSky(scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(160, 24, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vDir; void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec3 vDir; void main(){float h=normalize(vDir).y;vec3 c=mix(vec3(.83,.85,.91),vec3(.54,.70,.80),smoothstep(-.05,.65,h));gl_FragColor=vec4(c,1.0);}',
  }));
  scene.add(sky);
  for (const [x, y, z, scale] of [[-14, 13, -30, 1.5], [9, 16, -36, 2], [24, 11, -25, 1.1]]) {
    const cloud = new THREE.Group(); cloud.position.set(x, y, z); scene.add(cloud);
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(faceted(new THREE.IcosahedronGeometry(1, 1)), flat({ color: i % 2 ? 0xf6ece5 : 0xfff5e9 }));
      mesh.position.set((i - 2) * 1.6 * scale, i % 2 * .4, 0); mesh.scale.set(2 * scale, .75 * scale, scale); cloud.add(mesh);
    }
  }
}
