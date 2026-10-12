/** 本地原创场景构件：不冒充上游历史资产。保留地面 y=0，模型不用缩放。 */
import * as THREE from 'three';
import { JEEP_ROAD, ARMOR_ROAD, PATROL_PATH } from './motion';

export function buildCampEnvironment() {
  const root = new THREE.Group();
  root.name = 'fieldcamp-environment';
  const mat = (color: string, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness });
  const canvas = mat('#6e7350'), roof = mat('#7e8561'), wood = mat('#736047');
  const metal = mat('#71776c', 0.66), dark = mat('#292e25'), bag = mat('#999078');
  const asphalt = mat('#5e6258'), chalk = mat('#b7b4a1'), dirt = mat('#867f66');
  function box(w: number, h: number, l: number, material: THREE.Material, x: number, y: number, z: number, parent = root) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), material);
    m.position.set(x, y, z); m.castShadow = h > 0.2; m.receiveShadow = true; parent.add(m); return m;
  }
  function flat(w: number, l: number, material: THREE.Material, x: number, z: number, y = 0.014) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2), material);
    m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m;
  }
  // 紧凑停机坪与示意跑道：压缩距离用于微缩动作展示，不用于真实飞行计算。
  flat(34, 19, asphalt, -18, -7);
  flat(37, 5, dirt, -16, 5);
  flat(5, 43, dirt, 5, 0);
  flat(29, 7, dirt, 20, -3);
  box(94, 0.8, 15, dirt, -2, -0.42, -36);
  flat(92, 12, asphalt, -2, -36, 0.018);
  box(14, 0.8, 34, dirt, -38, -0.42, -20);
  flat(12, 34, asphalt, -38, -20, 0.018);
  flat(14, 12, asphalt, -32, -8, 0.019);
  for (let x = -43; x <= 40; x += 7) flat(3.5, 0.18, chalk, x, -36, 0.025);
  for (const x of [-45, 41]) for (let z = -40; z <= -32; z += 1.6) flat(3.2, 0.6, chalk, x, z, 0.026);
  function ribbon(curve: THREE.CatmullRomCurve3, width: number, material: THREE.Material, y: number) {
    const vertices: number[] = [], indices: number[] = [];
    for (let i = 0; i <= 160; i++) {
      const p = curve.getPointAt(i / 160), t = curve.getTangentAt(i / 160);
      const n = new THREE.Vector3(t.z, 0, -t.x).normalize().multiplyScalar(width / 2);
      vertices.push(p.x + n.x, y, p.z + n.z, p.x - n.x, y, p.z - n.z);
      if (i < 160) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, material); m.receiveShadow = true; root.add(m);
  }
  ribbon(JEEP_ROAD, 4.2, dirt, 0.026); ribbon(ARMOR_ROAD, 4, dirt, 0.027);
  ribbon(PATROL_PATH, 1.3, dirt, 0.025);
  for (let i = 0; i < 36; i++) {
    const p = JEEP_ROAD.getPointAt(i / 36), t = JEEP_ROAD.getTangentAt(i / 36);
    const dash = flat(0.1, 0.8, chalk, p.x, p.z, 0.033); dash.rotation.y = Math.atan2(t.x, t.z);
  }
  for (let x = -32; x < 0; x += 5) flat(2.8, 0.12, chalk, x, 5, 0.023);
  for (const x of [-25.5, -10.5]) {
    flat(12, 0.12, chalk, x, -1.8, 0.024);
    flat(0.12, 12, chalk, x, -7, 0.024);
  }
  // 波纹机库：轮廓造型与简化门洞，避免遮挡飞机。
  const hangar = new THREE.Group(); hangar.position.set(-24, 0, -19); root.add(hangar);
  const shape = new THREE.Shape(); shape.moveTo(-6, 0); shape.lineTo(-6, 1.5);
  shape.absellipse(0, 1.5, 6, 3.7, Math.PI, 0, true, 0); shape.lineTo(6, 0); shape.closePath();
  const shell = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 7, bevelEnabled: false, curveSegments: 24 }), metal);
  shell.position.z = -3.5; shell.castShadow = true; shell.receiveShadow = true; hangar.add(shell);
  box(9.4, 3.5, 0.06, dark, 0, 1.75, 3.55, hangar);
  for (let x = -5.7; x <= 5.7; x += 0.48) box(0.04, 0.08, 7.1, roof, x, 1.5 + 3.7 * Math.sqrt(Math.max(0, 1 - (x / 6) ** 2)), 0, hangar);
  function tent(x: number, z: number, w: number, l: number) {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    box(w, 2.1, l, canvas, 0, 1.05, 0, g);
    const geo = new THREE.ConeGeometry(1, 1, 4); geo.rotateY(Math.PI / 4);
    const r = new THREE.Mesh(geo, roof); r.scale.set(w / Math.SQRT2, 1.5, l / Math.SQRT2);
    r.position.y = 2.85; r.castShadow = true; g.add(r);
    box(1.5, 1.9, 0.03, dark, 0, 0.95, l / 2 + 0.025, g);
    for (const sx of [-1, 1]) {
      box(0.035, 2.15, 0.035, wood, sx * w / 2, 1.05, l / 2, g);
      const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(sx * w / 2, 2.1, l / 2), new THREE.Vector3(sx * (w / 2 + 1), 0.04, l / 2 + 1),
      ]), new THREE.LineBasicMaterial({ color: '#b0a58b' })); g.add(rope);
    }
  }
  tent(-8, -20, 6, 5); tent(20, 19, 7, 6); tent(30, 18, 6, 7);
  function crate(x: number, z: number, y = 0) {
    box(0.9, 0.65, 0.7, wood, x, y + 0.325, z);
    for (const dx of [-0.3, 0.3]) box(0.06, 0.68, 0.73, dark, x + dx, y + 0.325, z);
    box(0.91, 0.045, 0.72, roof, x, y + 0.675, z);
  }
  for (const [x, z] of [[-3, -18], [-2, -18], [-3, -17], [30, 13], [31, 13], [30, 14], [16, -11], [17, -11]]) crate(x, z);
  crate(30, 13, 0.7); crate(-3, -18, 0.7);
  const drumMat = mat('#5a634c', 0.62);
  for (const [x, z] of [[-30, -13], [-30, -14], [-31, -14], [-3, -20], [-2, -20], [32, 12]]) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.88, 16), drumMat);
    drum.position.set(x, 0.44, z); drum.castShadow = true; root.add(drum);
    for (const y of [0.15, 0.73]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.304, 0.018, 5, 16).rotateX(Math.PI / 2), dark);
      ring.position.set(x, y, z); root.add(ring);
    }
  }
  // 炮位前方的低沙袋墙；火炮朝 -Z，不遮住炮架配置。
  for (const x of [16.5, 27.5]) {
    for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) {
      const b = box(0.82, 0.32, 0.5, bag, x + (i - 3) * 0.8 + row * 0.17, 0.16 + row * 0.3, -20.5);
      b.rotation.y = (i % 2 ? 1 : -1) * 0.03;
    }
  }
  // 周边树木保持低面数，几何与材质共享。
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 2.8, 7);
  const leafGeo = new THREE.ConeGeometry(1.35, 3.1, 8);
  const leaf = mat('#454e36');
  const positions = [[-34, 12], [-31, 19], [-25, 20], [-19, 21], [-13, 21], [34, -20], [34, -11], [34, 3], [34, 9], [3, -22], [8, -22]];
  positions.forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(0.8 + (i % 4) * 0.13);
    const trunk = new THREE.Mesh(trunkGeo, wood); trunk.position.y = 1.4; trunk.castShadow = true; g.add(trunk);
    for (const y of [2.7, 4, 5]) { const crown = new THREE.Mesh(leafGeo, leaf); crown.position.y = y; crown.castShadow = true; g.add(crown); }
    root.add(g);
  });
  // 边界篱笆与简化路灯。
  for (let x = -30; x <= 32; x += 4) box(0.1, 1.3, 0.1, wood, x, 0.65, -23);
  for (const y of [0.45, 1]) box(63, 0.07, 0.07, wood, 1, y, -23);
  const lamps: THREE.Mesh[] = [];
  const lampMat = new THREE.MeshStandardMaterial({ color: '#e8d9a1', emissive: '#ffb85a', emissiveIntensity: 0.2 });
  for (const [x, z] of [[1, 18], [3, -12], [-1, 2], [30, 6]]) {
    box(0.09, 4, 0.09, dark, x, 2, z); box(0.9, 0.08, 0.09, dark, x + 0.4, 4, z);
    const lamp = box(0.34, 0.15, 0.3, lampMat, x + 0.75, 3.9, z); lamps.push(lamp);
  }
  function stencil(text: string, x: number, z: number, w: number, l: number) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const ctx = c.getContext('2d')!; ctx.font = 'bold 58px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c2bda0'; ctx.fillText(text, 256, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.position.set(x, 0.034, z); root.add(m);
  }
  stencil('A / FLIGHT', -19, 1.8, 12, 2); stencil('B / MOTOR', 22, 3.7, 11, 1.8);
  stencil('C / CAMP', 23, 15, 9, 1.6); stencil('D / BATTERY', 22, -10, 11, 1.7);
  stencil('09', -39, -36, 3, 3); stencil('27', 35, -36, 3, 3);
  return { root, setWarm(warm: boolean) { lampMat.emissiveIntensity = warm ? 3 : 0.2; } };
}
