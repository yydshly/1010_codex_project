/**
 * GAZ-67B chassis: channel-section ladder frame, front driven axle on four quarter-elliptic
 * springs, rear axle on semi-elliptic springs carried outboard of the frame, differentials,
 * propeller shafts, engine sump / gearbox / transfer case, exhaust, steering box and links,
 * rear towing pintle.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, type V3, slab, merge, xf, box, cylX, latheX, bentRod } from './util';

const Y = D.axleY;

function frame(): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const z0 = D.zFront - 0.055, z1 = -1.44;
  const len = z0 - z1;
  const b = D.frameBot, tp = D.frameTop, th = 0.004;
  for (const s of [1, -1]) {
    const w = D.frameX + s * 0.025; // web (outer)
    const f = D.frameX - s * 0.025; // flange tips (inner)
    const x0 = s > 0 ? f : w, x1 = s > 0 ? w : f;
    const prof: V2[] =
      s > 0
        ? [[x1, b], [x1, tp], [x0, tp], [x0, tp - th], [x1 - th, tp - th], [x1 - th, b + th], [x0, b + th], [x0, b]]
        : [[x0, b], [x0, tp], [x1, tp], [x1, tp - th], [x0 + th, tp - th], [x0 + th, b + th], [x1, b + th], [x1, b]];
    out.push(slab(prof, len, [0, 0, z1 + len / 2], [1, 0, 0], [0, 1, 0], { bevel: 0.0012 }));
  }
  for (const z of [1.5, 0.62, -0.3, -1.42]) out.push(box(2 * D.frameX - 0.05, 0.08, 0.05, [0, D.frameTop - 0.045, z], 0.004));
  return out;
}

function leafStack(a: THREE.Vector3, b: THREE.Vector3, leaves: number, down: number): THREE.BufferGeometry[] {
  // quarter-elliptic: all leaves anchored at a (frame end), the main leaf reaches b (axle)
  const out: THREE.BufferGeometry[] = [];
  const dir = b.clone().sub(a);
  const L = dir.length();
  dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  for (let i = 0; i < leaves; i++) {
    const li = L * (1 - i * 0.14);
    const g = G.rbox(0.045, 0.0065, li, 0.002, 1);
    g.translate(0, down * i * 0.0068, li / 2);
    g.applyQuaternion(q);
    g.translate(a.x, a.y, a.z);
    out.push(g);
  }
  return out;
}

function frontAxle(): { paint: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const z = D.zF;
  const paint: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  // differential and tubes
  const diff = new THREE.SphereGeometry(0.11, 24, 16);
  diff.scale(0.75, 0.95, 1.05);
  diff.translate(0, Y, z);
  paint.push(diff);
  paint.push(xf(G.cyl(0.05, 0.045, 0.12, 18), [0, Y + 0.01, z - 0.14], [90, 0, 0]));
  paint.push(cylX(0.042, 1.1, [0, Y, z], 18));
  for (const s of [1, -1]) {
    // spherical steering-knuckle housing, kingpin caps, steering arm
    const k = new THREE.SphereGeometry(0.082, 20, 14);
    k.scale(0.75, 1, 1);
    k.translate(s * 0.585, Y, z);
    paint.push(k);
    paint.push(xf(G.cyl(0.03, 0.03, 0.03, 12), [s * 0.6, Y + 0.085, z]));
    paint.push(xf(G.cyl(0.03, 0.03, 0.03, 12), [s * 0.6, Y - 0.085, z]));
    paint.push(box(0.03, 0.02, 0.16, [s * 0.6, Y + 0.075, z - 0.08], 0.005));
    paint.push(cylX(0.15, 0.006, [s * 0.632, Y, z], 32));
    // four quarter-elliptic springs (two per side) from frame brackets to the axle
    const x = s * 0.44;
    paint.push(box(0.1, 0.17, 0.08, [x, 0.445, z - 0.62], 0.008));
    steel.push(...leafStack(new THREE.Vector3(x, 0.49, z - 0.6), new THREE.Vector3(x, Y + 0.058, z), 6, -1));
    steel.push(...leafStack(new THREE.Vector3(x, 0.405, z - 0.6), new THREE.Vector3(x, Y - 0.055, z), 6, 1));
    paint.push(box(0.06, 0.03, 0.06, [x, Y + 0.052, z], 0.004));
    paint.push(box(0.06, 0.03, 0.06, [x, Y - 0.05, z], 0.004));
    // lever shock absorber on the frame with link to the axle
    paint.push(box(0.07, 0.07, 0.09, [s * 0.41, 0.49, z - 0.25], 0.008));
    steel.push(bentRod([[s * 0.43, 0.47, z - 0.22], [s * 0.44, 0.44, z - 0.1], [s * 0.44, Y + 0.07, z - 0.02]], 0.008, 0.02));
  }
  // tie rod and drag link to the steering box on the left rail
  steel.push(G.rod([0.6, Y + 0.07, z - 0.155], [-0.6, Y + 0.07, z - 0.155], 0.013, 12));
  steel.push(G.rod([0.6, Y + 0.085, z - 0.12], [0.42, 0.49, z - 0.19], 0.014, 12));
  paint.push(box(0.1, 0.12, 0.12, [0.43, 0.56, z - 0.19], 0.012));
  return { paint, steel };
}

function arcLeaf(x: number, zc: number, yc: number, half: number, R: number, th: number): THREE.BufferGeometry {
  const pts: V3[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const zz = -half + (2 * half * i) / n;
    pts.push([x, yc + (R - Math.sqrt(R * R - zz * zz)), zc + zz]);
  }
  return G.strap(pts, 0.045, th, [0, 1, 0], { smooth: false });
}

function rearAxle(): { paint: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const z = D.zR;
  const paint: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const banjo = new THREE.SphereGeometry(0.125, 24, 16);
  banjo.scale(0.62, 1, 1);
  banjo.translate(0, Y, z);
  paint.push(banjo);
  paint.push(cylX(0.1, 0.02, [-0.075, Y, z], 28));
  paint.push(xf(G.cyl(0.045, 0.05, 0.14, 18), [0, Y + 0.01, z + 0.17], [90, 0, 0]));
  paint.push(cylX(0.042, 1.2, [0, Y, z], 18));
  for (const s of [1, -1]) {
    const x = s * 0.5;
    paint.push(cylX(0.15, 0.006, [s * 0.632, Y, z], 32));
    // semi-elliptic spring above the axle, outboard of the frame
    for (let i = 0; i < 6; i++) steel.push(arcLeaf(x, z, Y + 0.105 - i * 0.0068, 0.47 - i * 0.075, 2.3, 0.0065));
    for (const e of [0.47, -0.47]) steel.push(cylX(0.017, 0.05, [x, Y + 0.105 + (2.3 - Math.sqrt(2.3 * 2.3 - 0.47 * 0.47)) + 0.005, z + e], 14));
    paint.push(box(0.06, 0.03, 0.1, [x, Y + 0.055, z], 0.004));
    for (const dz of [-0.04, 0.04]) steel.push(bentRod([[x - 0.03, Y - 0.03, z + dz], [x - 0.03, Y + 0.075, z + dz]], 0.006, 0.01), bentRod([[x + 0.03, Y - 0.03, z + dz], [x + 0.03, Y + 0.075, z + dz]], 0.006, 0.01));
    // cantilever hangers from the frame web
    paint.push(box(0.15, 0.06, 0.06, [s * 0.46, 0.5, z + 0.47], 0.006));
    paint.push(box(0.15, 0.05, 0.05, [s * 0.46, 0.53, z - 0.485], 0.006));
    paint.push(box(0.012, 0.07, 0.03, [x + s * 0.03, 0.49, z - 0.475], 0.003));
    // lever shock absorber
    paint.push(box(0.07, 0.07, 0.09, [s * 0.29, 0.49, z + 0.27], 0.008));
    steel.push(bentRod([[s * 0.3, 0.47, z + 0.24], [s * 0.33, 0.44, z + 0.14], [s * 0.36, Y + 0.05, z + 0.05]], 0.008, 0.02));
  }
  return { paint, steel };
}

function drivetrain(): { engine: THREE.BufferGeometry[]; paint: THREE.BufferGeometry[]; exhaust: THREE.BufferGeometry[] } {
  const engine: THREE.BufferGeometry[] = [];
  engine.push(box(0.34, 0.36, 0.66, [0, 0.72, 1.07], 0.02));
  engine.push(box(0.3, 0.06, 0.6, [0, 0.93, 1.07], 0.015));
  engine.push(box(0.28, 0.08, 0.5, [0, 0.515, 1.08], 0.02));
  engine.push(xf(G.cyl(0.16, 0.2, 0.12, 24), [0, 0.66, 0.68], [90, 0, 0]));
  engine.push(box(0.2, 0.2, 0.3, [0, 0.585, 0.49], 0.015));
  engine.push(box(0.26, 0.2, 0.18, [0, 0.52, 0.22], 0.015));
  const paint: THREE.BufferGeometry[] = [];
  const shaft = (a: V3, b: V3) => {
    paint.push(G.rod(a, b, 0.027, 14));
    for (const p of [a, b]) {
      const y = G.rbox(0.07, 0.07, 0.03, 0.008, 1);
      const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      y.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir));
      y.translate(p[0], p[1], p[2]);
      paint.push(y);
    }
  };
  shaft([0, 0.46, 0.33], [0, Y + 0.01, D.zF - 0.2]);
  shaft([0, 0.46, 0.12], [0, Y + 0.01, D.zR + 0.24]);
  // exhaust: downpipe, pipe along the right side, silencer, tail pipe
  const exhaust: THREE.BufferGeometry[] = [];
  exhaust.push(bentRod([[-0.2, 0.66, 1.0], [-0.21, 0.44, 0.88], [-0.23, 0.43, 0.6], [-0.24, 0.445, 0.14]], 0.022, 0.08));
  exhaust.push(latheX([[0, -0.2], [0.05, -0.2], [0.064, -0.19], [0.064, 0.19], [0.05, 0.2], [0, 0.2]], 24, 40));
  exhaust[exhaust.length - 1].rotateY(-Math.PI / 2);
  exhaust[exhaust.length - 1].translate(-0.24, 0.445, -0.06);
  exhaust.push(bentRod([[-0.24, 0.445, -0.26], [-0.26, 0.43, -0.34], [-0.44, 0.4, -0.38]], 0.02, 0.05));
  return { engine, paint, exhaust };
}

function pintle(): THREE.BufferGeometry[] {
  const z = -1.44;
  return [
    box(0.16, 0.12, 0.012, [0, 0.47, z - 0.006], 0.003),
    box(0.06, 0.07, 0.07, [0, 0.45, z - 0.045], 0.008),
    bentRod([[0, 0.45, z - 0.08], [0, 0.43, z - 0.12], [0, 0.46, z - 0.15], [0, 0.5, z - 0.13]], 0.016, 0.02, 10),
  ];
}

export function buildChassis(): THREE.Object3D {
  const fa = frontAxle();
  const ra = rearAxle();
  const dt = drivetrain();
  return group([
    part(merge([...frame(), ...fa.paint, ...ra.paint, ...dt.paint, ...pintle()]), P.chassis()),
    part(merge([...fa.steel, ...ra.steel]), P.chassis()),
    part(merge(dt.engine), P.engine()),
    part(merge(dt.exhaust), P.exhaust()),
  ]);
}
