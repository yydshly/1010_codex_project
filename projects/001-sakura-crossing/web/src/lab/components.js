import * as THREE from 'three';
import { cel, flat, gradientMap } from '../rendering/toon.js';
import { hullOutline } from '../rendering/outline.js';
import { seededRandom } from './configs.js';

// Local component kit. Static parts are batched by geometry and material,
// while each built scene owns its GPU resources; shared toon ramps stay cached.
export function buildComponents(config, style, { ground = true, foliage = true } = {}) {
  const root = new THREE.Group(); root.name = 'configured-' + config.id;
  const geometries = new Map(), materials = new Map(), batches = new Map(), textures = new Set();
  const dummy = new THREE.Object3D(), matrix = new THREE.Matrix4();
  const toonMaterials = new Set(), outlines = [];
  function geo(type) {
    if (geometries.has(type)) return geometries.get(type);
    let g;
    if (type === 'box') g = new THREE.BoxGeometry(1, 1, 1);
    if (type === 'sphere') g = new THREE.IcosahedronGeometry(1, 1);
    if (type === 'cylinder') g = new THREE.CylinderGeometry(1, 1, 1, 10);
    if (type === 'plane') g = new THREE.PlaneGeometry(1, 1);
    if (type === 'roof') {
      const shape = new THREE.Shape(); shape.moveTo(-.5, 0); shape.lineTo(.5, 0); shape.lineTo(0, .9); shape.closePath();
      g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1 }); g.translate(0, 0, -.5);
    }
    if (!g) throw new Error('未知几何体 ' + type);
    geometries.set(type, g); return g;
  }
  function material(kind) {
    if (materials.has(kind)) return materials.get(kind);
    const m = kind === 'unlit' ? flat({ color: 0xffffff, cache: false }) : cel({ color: 0xffffff, bands: style.bands, tint: style.shadowTint, cache: false });
    materials.set(kind, m); if (m.isMeshToonMaterial) toonMaterials.add(m); return m;
  }
  function transform(x, z, rotation = 0, scale = 1) {
    const frame = new THREE.Object3D(); frame.position.set(x, .14, z); frame.rotation.y = rotation; frame.scale.setScalar(scale); frame.updateMatrix(); return frame.matrix;
  }
  const identity = new THREE.Matrix4();
  function part(type, size, position, color, frame = identity, rotation = [0, 0, 0], kind = 'toon') {
    dummy.position.set(...position); dummy.scale.set(...size); dummy.rotation.set(...rotation); dummy.updateMatrix();
    matrix.multiplyMatrices(frame, dummy.matrix);
    const key = type + ':' + kind;
    if (!batches.has(key)) batches.set(key, { geometry: geo(type), material: material(kind), items: [] });
    batches.get(key).items.push({ matrix: matrix.clone(), color: new THREE.Color(color) });
  }
  function box(size, position, color, frame, rotation, kind) { part('box', size, position, color, frame, rotation, kind); }

  let landmark;
  function house(item) {
    const f = transform(item.x, item.z, item.rotation), { width: w, height: h, depth: d } = item;
    box([w + .3, .18, d + .35], [0, .02, 0], '#d4cdc0', f);
    box([w, h, d], [0, h / 2 + .1, 0], item.wall, f);
    part('roof', [w + .6, 1.38, d + .6], [0, h + .1, 0], item.roof, f);
    box([w + .6, .15, d + .6], [0, h + .06, 0], item.roof, f);
    // Door recess and window frames share the same geometry across themes.
    box([1.25, 2.16, .09], [0, 1.18, d / 2 + .07], '#596f77', f, undefined, 'unlit');
    for (const x of [-w * .31, w * .31]) {
      box([.98, 1.38, .12], [x, 1.9, d / 2 + .09], '#b6aa99', f);
      box([.78, 1.17, .04], [x, 1.9, d / 2 + .17], '#9ab8bd', f, undefined, 'unlit');
      box([.035, 1.18, .055], [x, 1.9, d / 2 + .2], '#ecdfc6', f);
      box([.78, .05, .055], [x, 1.9, d / 2 + .2], '#ecdfc6', f);
      box([1.1, .12, .32], [x, 1.2, d / 2 + .17], '#b2a18b', f);
    }
    for (const x of [-w / 2 + .05, w / 2 - .05]) box([.1, h, .12], [x, h / 2 + .1, d / 2 + .04], '#b6a48f', f);
    for (const side of [-1, 1]) {
      box([.08, 1.2, 1.04], [side * (w / 2 + .05), 1.85, 0], '#b6aa99', f);
      box([.035, 1.02, .86], [side * (w / 2 + .1), 1.85, 0], '#9ab8bd', f, undefined, 'unlit');
      box([.04, .04, .88], [side * (w / 2 + .12), 1.85, 0], '#ecdfc6', f);
    }
    for (const x of [-w * .25, w * .25]) {
      box([.98, 1.24, .08], [x, 1.9, -d / 2 - .05], '#b6aa99', f);
      box([.8, 1.06, .035], [x, 1.9, -d / 2 - .1], '#9ab8bd', f, undefined, 'unlit');
      box([.035, 1.08, .04], [x, 1.9, -d / 2 - .12], '#ecdfc6', f);
      box([.82, .04, .04], [x, 1.9, -d / 2 - .12], '#ecdfc6', f);
    }
    if (item.shop) {
      const g = new THREE.Group(); g.position.set(item.x, .14, item.z); g.rotation.y = item.rotation; root.add(g);
      const signCanvas = document.createElement('canvas'); signCanvas.width = 768; signCanvas.height = 160;
      const ctx = signCanvas.getContext('2d'); ctx.fillStyle = '#f9efda'; ctx.fillRect(0, 0, 768, 160);
      ctx.fillStyle = '#496867'; ctx.font = 'bold 68px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(config.theme.shop, 384, 79);
      const texture = new THREE.CanvasTexture(signCanvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
      const signMat = flat({ map: texture, color: 0xffffff, cache: false }); materials.set('shop-sign', signMat);
      const sign = new THREE.Mesh(geo('box'), signMat); sign.scale.set(w * .78, .65, .11); sign.position.set(0, h - .32, d / 2 + .12); g.add(sign);
      const shell = hullOutline(sign, { thickness: .0022 }); outlines.push(shell);
      box([w + .22, .1, 1.12], [0, 2.8, d / 2 + .49], '#d79397', f, [.12, 0, 0]);
      for (let i = 0; i < 7; i++) box([w / 7, .23, .1], [-w / 2 + w / 14 + i * w / 7, 2.62, d / 2 + 1.04], i % 2 ? '#f3dfcc' : '#d79397', f);
      const pivot = new THREE.Group(); pivot.position.set(-.59, .12, d / 2 + .18); g.add(pivot);
      const door = new THREE.Mesh(geo('box'), material('toon')); door.position.set(.59, 1, 0); door.scale.set(1.18, 2, .07); door.material = cel({ color: '#95aeb0', bands: style.bands, tint: style.shadowTint, cache: false }); materials.set('door', door.material); toonMaterials.add(door.material); door.castShadow = true; pivot.add(door);
      const knob = new THREE.Mesh(geo('sphere'), material('unlit')); knob.position.set(1.03, 1, .07); knob.scale.setScalar(.052); pivot.add(knob);
      const anchor = new THREE.Vector3(0, h + 1.8, d / 2 + .2).applyMatrix4(f);
      landmark = { anchor, targets: [sign, door], pivot, open: false, progress: 0, name: config.theme.shop };
    } else {
      box([1.13, 2.05, .055], [0, 1.15, d / 2 + .13], '#a7b2ad', f);
      box([.13, .13, .12], [.38, 1.14, d / 2 + .18], '#e8d7ab', f);
    }
    // Chimneys and roof trim make every house the same recognizable component.
    box([.47, .95, .48], [w * .25, h + .73, -.5], '#a6a2a2', f);
    box([.6, .13, .59], [w * .25, h + 1.24, -.5], '#b6afaa', f);
  }
  function tree(item) {
    const random = seededRandom(item.seed), f = transform(item.x, item.z, 0, item.scale);
    part('cylinder', [.19, 3.6, .19], [0, 1.8, 0], '#887364', f);
    for (const sign of [-1, 1]) part('cylinder', [.095, 1.9, .095], [sign * .46, 3, 0], '#887364', f, [0, 0, sign * -.48]);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, radius = i < 2 ? .4 : 1.25;
      part('sphere', [1.05 + random() * .25, .8 + random() * .28, 1.04], [Math.cos(a) * radius, 3.75 + random() * .8, Math.sin(a) * radius], item.color, f, [random(), random(), random()]);
    }
    part('cylinder', [1.1, .1, 1.1], [0, .02, 0], '#90b697', f);
  }
  function bench(item) {
    const f = transform(item.x, item.z, item.rotation);
    for (let i = 0; i < 3; i++) box([2, .09, .14], [0, .54, -.15 + i * .19], '#ac8c71', f);
    for (let i = 0; i < 2; i++) box([2, .15, .08], [0, 1 + i * .19, -.38], '#ac8c71', f);
    for (const x of [-.72, .72]) { box([.08, .58, .62], [x, .27, 0], '#647978', f); box([.08, .92, .08], [x, .79, -.38], '#647978', f); }
  }
  function lamp(item) {
    const f = transform(item.x, item.z);
    part('cylinder', [.058, 3.6, .058], [0, 1.8, 0], '#697b7e', f);
    box([.55, .11, .55], [0, 3.65, 0], '#697b7e', f);
    box([.32, .44, .32], [0, 3.37, 0], '#ffe2ad', f, undefined, 'unlit');
    box([.47, .1, .47], [0, 3.1, 0], '#697b7e', f);
  }

  if (ground) box([config.width, .3, config.depth], [0, -.11, 0], config.theme.ground);
  config.paths.forEach((p) => box([p.width, .035, p.depth], [p.x, .07, p.z], p.kind === 'road' ? config.theme.path : p.kind === 'stripe' ? '#efe7d7' : p.kind === 'plaza' ? '#dcd0bc' : '#ded0b5', identity, [0, p.rotation || 0, 0]));
  config.buildings.forEach(house); config.trees.forEach(tree); config.benches.forEach(bench); config.lamps.forEach(lamp);
  if (config.fountain) {
    part('cylinder', [3.45, .26, 3.45], [0, .2, 0], '#b4b4ad');
    part('cylinder', [3.1, .07, 3.1], [0, .37, 0], '#8cbec3', identity, undefined, 'unlit');
    part('cylinder', [.55, 1.2, .55], [0, .97, 0], '#c6c2b5');
    part('cylinder', [1.7, .18, 1.7], [0, 1.61, 0], '#ded5c0');
    part('cylinder', [1.5, .04, 1.5], [0, 1.73, 0], '#9fcbd0', identity, undefined, 'unlit');
    part('sphere', [.2, .7, .2], [0, 2, 0], '#b7dbe1', identity, undefined, 'unlit');
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      box([.025, .007, 2.3], [Math.cos(a) * 6.2, .095, Math.sin(a) * 6.2], '#b7ab98', identity, [0, -a, 0]);
    }
  }
  const counts = {};
  batches.forEach(({ geometry, material: mat, items }, key) => {
    const mesh = new THREE.InstancedMesh(geometry, mat, items.length); mesh.name = 'kit/' + key;
    items.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, item.color); });
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = key !== 'box:unlit'; mesh.receiveShadow = key !== 'sphere:toon'; mesh.computeBoundingSphere(); root.add(mesh); counts[key] = items.length;
  });
  // Shared particle component, tinted to the current foliage palette.
  const particleCount = foliage ? Math.min(140, config.trees.length * 6) : 0;
  const particleMat = flat({ color: config.theme.foliage[0], side: THREE.DoubleSide, transparent: true, opacity: .8, depthWrite: false, cache: false }); materials.set('particles', particleMat);
  const particles = new THREE.InstancedMesh(geo('plane'), particleMat, particleCount); particles.name = 'falling-foliage'; root.add(particles);
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage); particles.frustumCulled = false;
  const random = seededRandom(config.seed + 19);
  const seeds = Array.from({ length: particleCount }, (_, i) => ({ tree: config.trees[i % config.trees.length], phase: random() * 6.3, y: random() * 5 }));
  let disposed = false;
  return {
    root, landmark, counts,
    applyStyle(next) {
      toonMaterials.forEach((m) => { m.gradientMap = gradientMap(next.bands); m.userData.shadowTint?.value.set(next.shadowTint); });
      outlines.forEach((shell) => { shell.visible = next.ink; shell.material.uniforms.uThickness.value = .0022 * next.inkWidth / 1.2; });
    },
    animate(time, dt, reducedMotion) {
      seeds.forEach(({ tree: t, phase, y }, i) => {
        dummy.position.set(t.x + Math.sin(time * .4 + phase) * 1.8, .2 + ((y - time * .45) % 5 + 5) % 5, t.z + Math.cos(phase + time * .15) * 1.5);
        dummy.rotation.set(phase + time * .3, time * .2, phase); dummy.scale.set(.08, .055, 1); dummy.updateMatrix(); particles.setMatrixAt(i, dummy.matrix);
      });
      particles.instanceMatrix.needsUpdate = true;
      if (landmark) {
        const target = landmark.open ? 1 : 0;
        landmark.progress = reducedMotion ? target : THREE.MathUtils.damp(landmark.progress, target, 7, dt);
        landmark.pivot.rotation.y = -landmark.progress * 1.48;
      }
    },
    dispose() {
      if (disposed) return; disposed = true;
      const allGeo = new Set(geometries.values()), allMat = new Set(materials.values());
      root.traverse((o) => {
        if (o.isInstancedMesh) o.dispose();
        if (o.geometry) allGeo.add(o.geometry);
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => allMat.add(m));
      });
      allGeo.forEach((g) => g.dispose()); allMat.forEach((m) => m.dispose()); textures.forEach((t) => t.dispose());
      root.removeFromParent(); root.clear(); geometries.clear(); materials.clear(); batches.clear(); toonMaterials.clear();
    },
  };
}
