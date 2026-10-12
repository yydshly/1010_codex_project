import * as THREE from 'three';
import { cel, flat } from './rendering/toon.js';

export const SHOPS = ['花见团子', '青叶茶屋', '铃木饭团', '春日面包'];
const LOCATIONS = [[-5.9, -4.9], [5.9, -4.9], [-5.9, 4.9], [5.9, 4.9]];
const COLORS = ['#247d75', '#ca8431', '#8c69b4'];

export function createStreet(container, labelsContainer, { route = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  camera.position.set(18, 25, 26);
  camera.lookAt(0, .65, 0);
  scene.add(new THREE.HemisphereLight('#fff4dc', '#9887a1', 2.3));
  const sunlight = new THREE.DirectionalLight('#fff5df', 2.2);
  sunlight.position.set(-9, 19, 8); sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  sunlight.shadow.camera.left = sunlight.shadow.camera.bottom = -16;
  sunlight.shadow.camera.right = sunlight.shadow.camera.top = 16;
  sunlight.shadow.camera.far = 45; sunlight.shadow.bias = -.001;
  scene.add(sunlight);

  const materials = new Map();
  function material(color) {
    if (!materials.has(color)) materials.set(color, cel({ color, bands: 3, tint: '#9682a3' }));
    return materials.get(color);
  }
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const sphereGeometry = new THREE.IcosahedronGeometry(1, 1);
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 10);
  function part(parent, geometry, size, position, color) {
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.scale.set(...size); mesh.position.set(...position);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const box = (parent, size, position, color) => part(parent, boxGeometry, size, position, color);
  const ball = (parent, size, position, color) => part(parent, sphereGeometry, size, position, color);
  const cylinder = (parent, size, position, color) => part(parent, cylinderGeometry, size, position, color);
  const world = new THREE.Group(); scene.add(world);
  box(world, [21, .55, 18], [0, -.37, 0], '#c8cbb5');
  box(world, [20.9, .12, 17.9], [0, -.035, 0], '#e4ddc5');
  box(world, [3.6, .05, 17.3], [0, .04, 0], '#eae5d2');
  box(world, [20.3, .055, 3.2], [0, .04, 0], '#eae5d2');
  // Four equal-length conceptual trips. Paths are presentation, not learned navigation.
  if (!route) LOCATIONS.forEach(([x, z]) => {
    const path = box(world, [1.3, .035, Math.hypot(x, z)], [x / 2, .055, z / 2], '#f1ebda');
    path.rotation.y = Math.atan2(x, z);
  });
  const paving = new THREE.Mesh(new THREE.CircleGeometry(2.35, 32), material('#d8d0b9'));
  paving.rotation.x = -Math.PI / 2; paving.position.y = .1; paving.receiveShadow = true; world.add(paving);
  const centerCircle = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.15, 32), flat({ color: '#eee7d8' }));
  centerCircle.rotation.x = -Math.PI / 2; centerCircle.position.y = .11; world.add(centerCircle);

  function sign(parent, text, y, z, color = '#536c5b') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#faf0d4'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = color; ctx.font = 'bold 58px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 65);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.7, .68), flat({ map: texture, cache: false }));
    plate.position.set(0, y, z); parent.add(plate);
  }
  if (route) {
    for (const [index, x] of [-3.8, 3.8].entries()) {
      box(world, [1.35, .035, 6.7], [x, .065, 0], '#f1ebda');
      const gate = new THREE.Group(); gate.position.set(x, .1, -.7); world.add(gate);
      for (const sx of [-.8, .8]) box(gate, [.12, 1.75, .12], [sx, .88, 0], '#9f9073');
      box(gate, [1.9, .18, .25], [0, 1.8, 0], '#b8a384');
      sign(gate, index ? '东街' : '西街', 1.42, .08, '#71835f');
    }
  }
  LOCATIONS.forEach(([x, z], index) => {
    const house = new THREE.Group(); house.position.set(x, .1, z);
    house.rotation.y = Math.atan2(-x, -z); world.add(house);
    const wall = ['#f1e2cb', '#d4dece', '#e7d3c5', '#eadfba'][index];
    const roof = ['#b96f72', '#758a7d', '#bd977f', '#b8996a'][index];
    box(house, [3.55, .18, 2.8], [0, .08, 0], '#d0c5ad');
    box(house, [3.25, 2.4, 2.5], [0, 1.35, 0], wall);
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-1.9, 0); roofShape.lineTo(1.9, 0); roofShape.lineTo(0, 1.05); roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 2.95, bevelEnabled: false });
    roofGeo.translate(0, 0, -1.475);
    const roofMesh = new THREE.Mesh(roofGeo, material(roof)); roofMesh.position.y = 2.55;
    roofMesh.castShadow = true; house.add(roofMesh);
    box(house, [3.86, .12, 3], [0, 2.57, 0], roof);
    box(house, [.8, 1.62, .12], [0, .97, 1.27], '#91a5a1');
    for (const side of [-1, 1]) {
      box(house, [.73, .84, .12], [side * 1.07, 1.23, 1.3], '#f5e9d0');
      box(house, [.59, .67, .06], [side * 1.07, 1.23, 1.39], '#a3b7af');
      box(house, [.035, .7, .06], [side * 1.07, 1.23, 1.44], '#e8e0c4');
      box(house, [.77, .1, .38], [side * 1.07, .78, 1.36], '#a6a185');
    }
    box(house, [3.5, .1, .9], [0, 2.05, 1.63], roof).rotation.x = .16;
    for (let j = 0; j < 8; j++) box(house, [.42, .23, .08], [-1.49 + j * .425, 1.91, 2.07], j % 2 ? '#f6e8d0' : roof);
    sign(house, SHOPS[index], 2.4, 1.36);
    const table = new THREE.Group(); table.position.set(1, 0, 2); house.add(table);
    box(table, [.65, .13, .55], [0, .65, 0], '#aa8c63');
    for (const sx of [-.24, .24]) box(table, [.09, .65, .09], [sx, .32, .15], '#aa8c63');
    for (let j = 0; j < 3; j++) ball(table, [.09, .09, .09], [-.15 + j * .15, .78, 0], ['#c5ca95', '#eed2c1', '#f5ecdb'][j]);
    const label = document.createElement('div'); label.className = 'shop-label';
    label.innerHTML = `<b>${String.fromCharCode(65 + index)}</b>${SHOPS[index]}`; labelsContainer.append(label);
  });

  function tree(x, z, scale = 1) {
    const group = new THREE.Group(); group.position.set(x, .1, z); group.scale.setScalar(scale); world.add(group);
    cylinder(group, [.16, 2.7, .16], [0, 1.35, 0], '#99796a');
    const branch = cylinder(group, [.09, 1.5, .09], [.4, 2.1, 0], '#99796a'); branch.rotation.z = -.55;
    const clusters = [[0, 3.1, 0], [-.75, 2.8, .2], [.72, 3.05, .25], [.05, 3.55, .05], [-.28, 3.05, -.7], [.27, 2.85, .78]];
    clusters.forEach(([cx, cy, cz], i) => ball(group, [1.12, .85, .95], [cx, cy, cz], i % 2 ? '#eeb6bd' : '#f3c9c9'));
    cylinder(group, [.75, .1, .75], [0, .05, 0], '#aab594');
  }
  tree(-9, -1.7, 1.1); tree(9, 1.5, .95); tree(-1, -7.5, .86); tree(-9, 6.8, .8);
  for (const [x, z] of [[9, -6.8], [-9, -6.7], [1, 7.4]]) {
    cylinder(world, [.055, 2.4, .055], [x, 1.3, z], '#6d7d70');
    box(world, [.3, .5, .3], [x, 2.5, z], '#f6e2b6');
    box(world, [.4, .12, .4], [x, 2.77, z], '#647663');
  }
  // Petal positions are fixed for a stable presentation; their motion does not reach policies.
  const petalGeometry = new THREE.PlaneGeometry(.095, .15);
  const petals = new THREE.InstancedMesh(petalGeometry, flat({ color: '#e5a9b6', side: THREE.DoubleSide }), 42);
  const dummy = new THREE.Object3D(); world.add(petals);

  const targets = LOCATIONS.map(([x, z]) => new THREE.Vector3(x * .64, .16, z * .64));
  const ring = new THREE.Mesh(new THREE.RingGeometry(.69, .88, 36), flat({ color: '#e2ab44', side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.copy(targets[0]); ring.position.y = .15; scene.add(ring);
  const food = new THREE.Group();
  cylinder(food, [.24, .05, .24], [0, .2, 0], '#faf0d5');
  for (let i = 0; i < 3; i++) ball(food, [.11, .11, .11], [-.13 + .13 * i, .33, 0], ['#bdd1a0', '#f4dfcb', '#e8acbd'][i]);
  food.position.copy(targets[0]); scene.add(food);

  const residents = COLORS.map((color, index) => {
    const group = new THREE.Group(); const body = new THREE.Group(); group.add(body); scene.add(group);
    ball(body, [.29, .37, .25], [0, .55, 0], color);
    ball(body, [.31, .29, .28], [0, 1.02, 0], '#f2e5d5');
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.12, .24, 3), material('#e4cbb8'));
      ear.position.set(side * .2, 1.29, 0); body.add(ear);
      ball(body, [.028, .035, .025], [side * .12, 1.07, .25], '#3f5248');
      const arm = ball(body, [.075, .21, .08], [side * .31, .63, .025], color); arm.rotation.z = side * .2;
    }
    ball(body, [.038, .022, .025], [0, .98, .27], '#c58c87');
    const legs = [-1, 1].map(side => ball(body, [.095, .18, .095], [side * .12, .21, 0], '#566e60'));
    cylinder(group, [.45, .035, .45], [0, .11, 0], color);
    const start = new THREE.Vector3((index - 1) * .75, .1, .35);
    group.position.copy(start);
    const label = document.createElement('div'); label.className = 'resident-label';
    label.textContent = ['C', 'R', 'Q'][index]; label.style.background = color;
    labelsContainer.append(label);
    return { group, body, legs, start, from: start.clone(), label, target: start.clone(), hit: false };
  });

  let animationStart = -1, animationDuration = 690, frame, targetIndex = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 1, height = 1;
  const vector = new THREE.Vector3();
  function resize() {
    width = Math.max(1, container.clientWidth); height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    const aspect = width / height, halfHeight = Math.max(8.8, 12.4 / aspect);
    // Fit both the ground and the elevated rooftops without clipping on wide screens.
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
    camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(container); resize();

  function animate(now) {
    frame = requestAnimationFrame(animate);
    if (animationStart >= 0) {
      const t = Math.min(1, (now - animationStart) / animationDuration);
      residents.forEach((resident, index) => {
        const travel = route ? t : t < .42 ? t / .42 : t < .6 ? 1 : 1 - (t - .6) / .4;
        const eased = travel * travel * (3 - 2 * travel);
        resident.group.position.lerpVectors(route ? resident.from : resident.start, resident.target, eased);
        const direction = resident.target.clone().sub(route ? resident.from : resident.start);
        resident.body.rotation.y = Math.atan2(direction.x, direction.z) + (!route && t > .6 ? Math.PI : 0);
        resident.body.position.y = reduced ? 0 : Math.abs(Math.sin(t * 25)) * .045 * (t < .42 || t > .6 ? 1 : 0);
        resident.legs.forEach((leg, j) => { leg.rotation.x = reduced ? 0 : Math.sin(t * 25 + j * Math.PI) * .35; });
      });
      if (t === 1) animationStart = -1;
    }
    if (!reduced) {
      for (let i = 0; i < 42; i++) {
        const time = now / 1000;
        dummy.position.set(Math.sin(i * 21.3) * 10 + Math.sin(time * .3 + i) * .3,
          4.8 - ((time * .2 + i * .31) % 4.6), Math.cos(i * 17.1) * 8);
        dummy.rotation.set(time * .4 + i, i, time * .2); dummy.updateMatrix(); petals.setMatrixAt(i, dummy.matrix);
      }
      petals.instanceMatrix.needsUpdate = true;
      food.position.y = targets[targetIndex].y + Math.sin(now / 550) * .06;
    }
    LOCATIONS.forEach(([x, z], index) => {
      vector.set(x, 4.1, z).project(camera);
      const label = labelsContainer.children[index];
      label.style.left = `${(vector.x / 2 + .5) * width}px`;
      label.style.top = `${(-vector.y / 2 + .5) * height}px`;
    });
    residents.forEach(resident => {
      vector.copy(resident.group.position).add(new THREE.Vector3(0, route ? 2.5 : 1.85, 0)).project(camera);
      resident.label.style.left = `${(vector.x / 2 + .5) * width}px`;
      resident.label.style.top = `${(-vector.y / 2 + .5) * height}px`;
    });
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(animate);
  return {
    update(state, duration = 690) {
      targetIndex = state.target; ring.position.copy(targets[targetIndex]); ring.position.y = .15;
      food.position.copy(targets[targetIndex]);
      [...labelsContainer.querySelectorAll('.shop-label')].forEach((label, i) => label.classList.toggle('active', i === targetIndex));
      for (const [index, key] of ['cadence', 'rule', 'q'].entries()) {
        const last = state.agents[key].last;
        if (last) {
          residents[index].target.copy(targets[last.action]).add(new THREE.Vector3((index - 1) * .34, 0, 0));
          residents[index].hit = last.hit;
        }
      }
      if (state.tick > 0) { animationStart = performance.now(); animationDuration = duration; }
    },
    updateRoute(state, duration = 520) {
      targetIndex = [0, 2, 1, 3][state.view.target];
      ring.position.copy(targets[targetIndex]); ring.position.y = .15; food.position.copy(targets[targetIndex]);
      [...labelsContainer.querySelectorAll('.shop-label')].forEach((label, i) => label.classList.toggle('active', i === targetIndex));
      for (const [index, key] of ['cadence', 'rule', 'q'].entries()) {
        const resident = residents[index], [x, z] = state.positions[key];
        resident.from.copy(resident.group.position);
        resident.target.set(x + (index - 1) * .7, .1, z + .12 * index);
      }
      animationStart = performance.now(); animationDuration = duration;
    },
    reset() { residents.forEach(resident => resident.group.position.copy(resident.start)); animationStart = -1; },
    dispose() { cancelAnimationFrame(frame); observer.disconnect(); renderer.dispose(); },
  };
}
