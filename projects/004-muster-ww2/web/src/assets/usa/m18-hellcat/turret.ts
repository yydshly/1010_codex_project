/**
 * M18 open-topped turret: welded sloped side plates and overhanging rear bustle (walls with real
 * thickness), cast gun shield, the 76 mm gun (M1A2 with its double-baffle muzzle brake, or the plain
 * M1A1), the .50 cal M2 HB on the AA ring mount at the left rear, and a simplified interior visible
 * from above: breech with recoil guard, crew seats, ready-round rack, stowage box, handwheels and basket floor.
 *
 * Turret-local frame: origin at the ring centre on the hull roof plane, +Z forward, +X left.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Pal } from './palette';
import { TURRET } from './dims';
import { roundedRing, latheZ, latheX, rb, nut, prism, wallBand, circlePts, merge, uHandle, D, type P2, type P3 } from './util';
import { m2hb } from './mg';

const HT = TURRET.h;
const Y0 = 0.018; // wall base above the roof plane (sits on the race flange)

/** Base and top plan outlines (x, z) with the same corner list. */
const BASE: P2[] = [[0.5, 1.06], [0.98, 0.72], [1.04, -0.8], [0.9, -1.3], [-0.9, -1.3], [-1.04, -0.8], [-0.98, 0.72], [-0.5, 1.06]];
const TOP: P2[] = [[0.43, 0.88], [0.82, 0.6], [0.87, -0.76], [0.76, -1.19], [-0.76, -1.19], [-0.87, -0.76], [-0.82, 0.6], [-0.43, 0.88]];
const RADII = [0.12, 0.2, 0.2, 0.22, 0.22, 0.2, 0.2, 0.12];

/** Offset a closed (x, z) ring along its vertex normals (positive = outwards). */
function offsetRing(pts: P2[], d: number): P2[] {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const s = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]];
    const l1 = Math.hypot(e1[0], e1[1]) || 1, l2 = Math.hypot(e2[0], e2[1]) || 1;
    // outward normals of the two edges (for a CCW ring the outward normal is (dy, -dx))
    const n1 = [(s * e1[1]) / l1, (-s * e1[0]) / l1], n2 = [(s * e2[1]) / l2, (-s * e2[0]) / l2];
    let nx = n1[0] + n2[0], nz = n1[1] + n2[1];
    const ln = Math.hypot(nx, nz) || 1;
    nx /= ln;
    nz /= ln;
    const cosH = Math.max(0.5, nx * n1[0] + nz * n1[1]);
    return [p[0] + (nx * d) / cosH, p[1] + (nz * d) / cosH];
  });
}

const to3 = (r: P2[], y: number): P3[] => r.map(([x, z]) => [x, y, z]);

/* ------------------------------------------------------------------------------ shell */
function shell(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const t = 0.022;
  const oB = roundedRing(BASE, RADII, 5, 1);
  const oT = roundedRing(TOP, RADII.map((r) => r * 0.85), 5, 1);
  const iB = offsetRing(oB, -t);
  const iT = offsetRing(oT, -t);
  const walls = wallBand(to3(oB, Y0), to3(oT, HT), to3(iT, HT), to3(iB, Y0));
  out.push(part(walls, P.paint));
  // inner face of the walls in the interior colour (a thin liner just inside)
  const lB = offsetRing(oB, -t - 0.002), lT = offsetRing(oT, -t - 0.002);
  const lB2 = offsetRing(oB, -t - 0.006), lT2 = offsetRing(oT, -t - 0.006);
  out.push(part(wallBand(to3(lB, Y0 + 0.01), to3(lT, HT - 0.012), to3(lT2, HT - 0.012), to3(lB2, Y0 + 0.01)), P.inner));
  // bustle / turret floor plate with the ring opening
  const s = new THREE.Shape();
  const fo = offsetRing(oB, -0.01);
  s.moveTo(fo[0][0], fo[0][1]);
  for (const p of fo.slice(1)) s.lineTo(p[0], p[1]);
  s.closePath();
  const hole = new THREE.Path();
  const hc = circlePts(TURRET.ringR - 0.03, 56, 0, 0, true);
  hole.moveTo(hc[0][0], hc[0][1]);
  for (const p of hc.slice(1)) hole.lineTo(p[0], p[1]);
  hole.closePath();
  s.holes.push(hole);
  const fl = G.extrude(s, 0.014, 0.003, 1, 1);
  fl.applyMatrix4(new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  G.flipWinding(fl);
  out.push(part(fl, P.inner, { p: [0, Y0 + 0.007, 0] }));
  // weld beads at the wall corners and along the base
  const w: THREE.BufferGeometry[] = [];
  for (let i = 0; i < BASE.length; i++) {
    if (i === 0 || i === 7) continue;
    const b = BASE[i], tp = TOP[i];
    const k = 0.93; // slightly in from the sharp corner (the corners are rounded)
    w.push(G.weld([[b[0] * k, Y0 + 0.01, b[1] * k], [tp[0] * k, HT - 0.01, tp[1] * k]], 0.005));
  }
  // top rim reinforcing bar (flat bar on the outer face)
  const rim = offsetRing(oT, 0.004);
  const rimPts: THREE.Vector3[] = rim.map(([x, z]) => new THREE.Vector3(x, HT - 0.025, z));
  rimPts.push(rimPts[0].clone());
  out.push(part(G.strap(rimPts, 0.045, 0.01, [0, 1, 0], { closed: false, smooth: false }), P.paint));
  out.push(part(merge(w), P.paint));
  // lifting eyes on the side walls
  for (const sx of [-1, 1]) for (const z of [0.3, -0.9]) {
    const e = group([
      part(rb(0.06, 0.04, 0.09, 0.008), P.cast, { p: [0, 0.02, 0] }),
      part(G.torus(0.03, 0.01, 8, 16, Math.PI), P.cast, { p: [0, 0.04, 0], r: [0, 90, 0] }),
    ]);
    e.position.set(sx * 0.87, HT - 0.005, z);
    out.push(e);
  }
  // grab rails along the bustle sides
  for (const sx of [-1, 1]) {
    out.push(part(G.tube([[sx * 0.98, 0.28, -0.3], [sx * 1.02, 0.3, -0.34], [sx * 1.02, 0.3, -0.9], [sx * 0.975, 0.28, -0.94]], 0.011, 6, 30), P.paint));
  }
  return out;
}

/* ------------------------------------------------------------------------------ gun */
function gunShield(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const zT = TURRET.trunZ, yG = TURRET.gunY, R = 0.29;
  // cast shield: rounded front about the trunnion axis, flat back just inside the front wall
  const prof: P2[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = -62 * D + (i / 16) * (140 * D);
    prof.push([zT + Math.cos(a) * R, yG + Math.sin(a) * R]);
  }
  prof.push([zT + 0.06, yG + Math.sin(78 * D) * R], [zT + 0.06, yG - Math.sin(62 * D) * R]);
  out.push(part(prism(prof, 0.8, 'zy', 0.03), P.cast));
  // gun tube sleeve through the shield and its collar
  out.push(part(latheZ([[0.0, 0.0], [0.13, 0.0], [0.13, 0.02], [0.105, 0.04], [0.1, 0.34], [0.108, 0.35], [0.108, 0.38], [0.0, 0.38]], 32, 40), P.cast, { p: [0, yG, zT + R - 0.02] }));
  // bolts round the sleeve, lifting eyes on the shield
  const bolts: { p: G.V3; n: G.V3 }[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    bolts.push({ p: [Math.cos(a) * 0.165, yG + Math.sin(a) * 0.165, zT + R - 0.02], n: [0, 0, 1] });
  }
  out.push(part(G.scatter(nut(0.022, 0.009), bolts), P.cast));
  // coaxial-free right side: direct-sight telescope port (left of the gun)
  out.push(part(G.cyl(0.03, 0.03, 0.03, 14), P.cast, { p: [0.27, yG + 0.05, zT + R - 0.03], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.018, 0.018, 0.032, 12), P.vision, { p: [0.27, yG + 0.05, zT + R - 0.028], r: [90, 0, 0] }));
  return out;
}

function gunTube(P: Pal, brake: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const yG = TURRET.gunY;
  const z0 = TURRET.trunZ + 0.6;
  const zm = TURRET.muzzleZ;
  const zEnd = brake ? zm - 0.3 : zm;
  // tube: slight taper, bourrelet and (M1A2) threaded muzzle for the brake
  out.push(part(latheZ([[0.0, 0.0], [0.082, 0.0], [0.078, 0.35], [0.068, (zEnd - z0) * 0.6], [0.062, zEnd - z0 - 0.02], [0.066, zEnd - z0 - 0.01], [0.066, zEnd - z0], [0.019, zEnd - z0], [0.0, zEnd - z0 - 0.3]], 32, 40), P.paint, { p: [0, yG, z0] }));
  if (!brake) {
    out.push(part(G.cyl(0.038, 0.038, 0.006, 20), P.void, { p: [0, yG, zm + 0.001], r: [90, 0, 0] }));
    return out;
  }
  // double-baffle muzzle brake: body, two baffles joined by top and bottom straps, open sides
  const zb = zm - 0.3;
  out.push(part(latheZ([[0.0, 0.0], [0.074, 0.0], [0.074, 0.05], [0.07, 0.06], [0.0, 0.06]], 28, 40), P.paint, { p: [0, yG, zb] }));
  const baffle = (z: number, t: number) => out.push(part(G.rbox(0.23, 0.15, t, 0.02, 2), P.paint, { p: [0, yG, z] }));
  baffle(zb + 0.13, 0.04);
  baffle(zm - 0.022, 0.044);
  for (const sy of [-1, 1]) out.push(part(G.rbox(0.13, 0.018, 0.26, 0.006, 1), P.paint, { p: [0, yG + sy * 0.066, zb + 0.16] }));
  // bore visible through the side openings and at the muzzle
  out.push(part(G.cyl(0.04, 0.04, 0.24, 18), P.void, { p: [0, yG, zb + 0.17], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.04, 0.04, 0.006, 18), P.void, { p: [0, yG, zm + 0.001], r: [90, 0, 0] }));
  // blast faces inside the openings (darker)
  out.push(part(G.box(0.2, 0.11, 0.004), P.exhaust, { p: [0, yG, zb + 0.108] }));
  out.push(part(G.box(0.2, 0.11, 0.004), P.exhaust, { p: [0, yG, zm - 0.045] }));
  return out;
}

/* ------------------------------------------------------------------------------ interior */
function seat(P: Pal, h: number, back = true): THREE.Object3D {
  // pedestal seat standing on y = 0: post, pan with cushion, optional backrest
  const ps: THREE.Object3D[] = [
    part(G.cyl(0.07, 0.08, 0.02, 16), P.inner, { p: [0, 0.01, 0] }),
    part(G.cyl(0.025, 0.025, h - 0.04, 12), P.inner, { p: [0, h / 2, 0] }),
    part(rb(0.34, 0.03, 0.3, 0.01), P.inner, { p: [0, h - 0.015, 0] }),
    part(G.rbox(0.32, 0.05, 0.28, 0.02, 2), P.canvas, { p: [0, h + 0.025, 0] }),
  ];
  if (back) {
    ps.push(part(G.rod([0, h - 0.02, -0.15], [0, h + 0.18, -0.17], 0.015, 8), P.inner));
    ps.push(part(G.rbox(0.3, 0.16, 0.05, 0.02, 2), P.canvas, { p: [0, h + 0.22, -0.18], r: [-8, 0, 0] }));
  }
  return group(ps);
}

function readyRack(P: Pal): THREE.Object3D {
  // rounds lying across the bustle, noses to the left, in a sheet-steel rack; origin at the rack base
  const ps: THREE.Object3D[] = [];
  const caseG = latheX([[0.0, -0.3], [0.047, -0.3], [0.047, -0.29], [0.043, -0.286], [0.043, 0.18], [0.04, 0.22], [0.04, 0.24], [0.0, 0.24]], 18, 40);
  const shotG = latheX([[0.0, 0.0], [0.038, 0.0], [0.038, 0.12], [0.032, 0.2], [0.018, 0.26], [0.0, 0.28]], 18, 40);
  const cases: THREE.BufferGeometry[] = [], shots: THREE.BufferGeometry[] = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
    if (r === 1 && c === 4) continue;
    const y = 0.06 + r * 0.1, z = (c - 2) * 0.1 + (r ? 0.05 : 0);
    const a = caseG.clone();
    a.translate(-0.05, y, z);
    cases.push(a);
    const b = shotG.clone();
    b.translate(0.19, y, z);
    shots.push(b);
  }
  ps.push(part(merge(cases), P.brass));
  ps.push(part(merge(shots), P.gun));
  // rack: end frames with round cut-outs (as plates), base tray and a hold-down bar
  for (const x of [-0.3, 0.18]) ps.push(part(rb(0.012, 0.24, 0.56, 0.004), P.inner, { p: [x, 0.12, 0] }));
  ps.push(part(rb(0.62, 0.012, 0.56, 0.004), P.inner, { p: [-0.05, 0.006, 0] }));
  ps.push(part(G.cyl(0.01, 0.01, 0.52, 8), P.toolSteel, { p: [-0.05, 0.265, 0.0], r: [0, 0, 90] }));
  return group(ps);
}

function interior(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const yG = TURRET.gunY, zT = TURRET.trunZ;
  const floorY = -0.44;
  // basket floor and the race skirt below the roof
  out.push(part(G.cyl(TURRET.ringR - 0.04, TURRET.ringR - 0.04, 0.02, 48), P.inner, { p: [0, floorY, 0] }));
  out.push(part(G.cyl(TURRET.ringR - 0.03, TURRET.ringR - 0.03, -floorY + 0.01, 48, true), P.inner, { p: [0, floorY / 2, 0] }));
  // treadplate pattern on the floor
  const tread: THREE.BufferGeometry[] = [];
  for (let i = -7; i <= 7; i++) for (let k = -7; k <= 7; k++) {
    const x = i * 0.1, z = k * 0.1;
    if (x * x + z * z > 0.72 * 0.72) continue;
    const b = G.box(0.04, 0.006, 0.012);
    b.rotateY(((i + k) % 2 === 0 ? 45 : -45) * D);
    b.translate(x, floorY + 0.012, z);
    tread.push(b);
  }
  out.push(part(merge(tread), P.inner));
  // breech ring and block, cradle, recoil cylinders and the recoil guard
  out.push(part(rb(0.3, 0.3, 0.36, 0.02), P.gun, { p: [0, yG, zT - 0.34] }));
  out.push(part(rb(0.22, 0.22, 0.04, 0.01), P.gun, { p: [0, yG - 0.01, zT - 0.535] }));
  out.push(part(G.cyl(0.02, 0.02, 0.12, 10), P.gun, { p: [-0.09, yG + 0.06, zT - 0.58], r: [90, 0, 0] }));
  out.push(part(rb(0.26, 0.2, 0.34, 0.02), P.gun, { p: [0, yG, zT - 0.02] }));
  for (const sy of [-1, 1]) out.push(part(G.cyl(0.05, 0.05, 0.62, 18), P.gun, { p: [0, yG + sy * 0.14, zT - 0.12], r: [90, 0, 0] }));
  out.push(part(G.tube([[0.2, yG - 0.1, zT - 0.18], [0.22, yG - 0.1, zT - 0.9], [-0.22, yG - 0.1, zT - 0.9], [-0.2, yG - 0.1, zT - 0.18]], 0.018, 8, 48), P.gun));
  out.push(part(G.rod([0.21, yG - 0.1, zT - 0.5], [0.21, floorY + 0.4, zT - 0.5], 0.016, 8), P.gun));
  out.push(part(G.rod([-0.21, yG - 0.1, zT - 0.5], [-0.21, floorY + 0.4, zT - 0.5], 0.016, 8), P.gun));
  // trunnion brackets on the front wall
  for (const sx of [-1, 1]) out.push(part(rb(0.06, 0.34, 0.24, 0.012), P.inner, { p: [sx * 0.19, yG - 0.02, zT + 0.02] }));
  // gunner's position (left of the gun): sight, elevation and traverse handwheels, seat
  out.push(part(rb(0.07, 0.07, 0.4, 0.01), P.gun, { p: [0.3, yG + 0.05, zT - 0.1] }));
  out.push(part(G.cyl(0.03, 0.035, 0.08, 12), P.gun, { p: [0.3, yG + 0.05, zT - 0.34], r: [90, 0, 0] }));
  out.push(part(G.torus(0.09, 0.01, 6, 24), P.gun, { p: [0.28, yG - 0.18, zT - 0.3], r: [0, 90, 0] }));
  out.push(part(G.rod([0.2, yG - 0.18, zT - 0.3], [0.28, yG - 0.18, zT - 0.3], 0.012, 8), P.gun));
  out.push(part(rb(0.14, 0.16, 0.12, 0.01), P.inner, { p: [0.5, yG - 0.2, zT - 0.1] }));
  out.push(part(G.torus(0.1, 0.011, 6, 24), P.gun, { p: [0.5, yG - 0.2, zT - 0.18], r: [0, 0, 0] }));
  out.push(group([seat(P, 0.5)], { p: [0.34, floorY, zT - 0.62], r: [0, 0, 0] }));
  // loader's seat (right of the gun) and the commander's seat (left rear)
  out.push(group([seat(P, 0.48)], { p: [-0.46, floorY, -0.1], r: [0, 20, 0] }));
  out.push(group([seat(P, 0.62)], { p: [0.46, floorY, -0.45], r: [0, -15, 0] }));
  // ready rounds in the bustle against the rear wall, stowage box on the right of the bustle
  out.push(group([readyRack(P)], { p: [-0.02, Y0 + 0.014, -0.98] }));
  out.push(part(rb(0.34, 0.24, 0.28, 0.012), P.inner, { p: [-0.58, Y0 + 0.134, -0.95] }));
  out.push(part(rb(0.3, 0.012, 0.22, 0.004), P.gun, { p: [-0.58, Y0 + 0.26, -0.95] }));
  for (const x of [-0.66, -0.58, -0.5]) out.push(part(G.cyl(0.014, 0.014, 0.02, 10), P.gun, { p: [x, Y0 + 0.2, -0.8], r: [90, 0, 0] }));
  // spare .50 cal ammunition boxes on the left bustle floor
  for (const k of [0, 1]) out.push(part(rb(0.1, 0.18, 0.28, 0.006), P.inner, { p: [0.7, Y0 + 0.104, -0.5 - k * 0.14], r: [0, 90, 0] }));
  return out;
}

/* ------------------------------------------------------------------------------ AA mount */
function aaMount(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const yR = HT + 0.065;
  // ring-mount rail following the rear half of the turret rim, just outside it
  const rim = offsetRing(roundedRing(TOP, RADII.map((r) => r * 0.85), 8, 3), 0.03);
  const n = rim.length;
  // walk the rim from the left side round the rear to the right side
  let iL = 0, iR = 0, best = 1e9, bestR = 1e9;
  for (let i = 0; i < n; i++) {
    const [x, z] = rim[i];
    const dl = Math.hypot(z + 0.15, 0) + (x < 0 ? 9 : 0);
    const dr = Math.hypot(z + 0.15, 0) + (x > 0 ? 9 : 0);
    if (dl < best) { best = dl; iL = i; }
    if (dr < bestR) { bestR = dr; iR = i; }
  }
  const pts: G.V3[] = [];
  // direction: step from iL towards the rear (decreasing z first)
  const step = rim[(iL + 1) % n][1] < rim[iL][1] ? 1 : -1;
  for (let k = 0, i = iL; k <= n; k++, i = (i + step + n) % n) {
    pts.push([rim[i][0], yR, rim[i][1]]);
    if (i === iR) break;
  }
  out.push(part(G.tube(pts, 0.022, 10, pts.length * 3), P.paint));
  // support brackets from the wall top
  for (let k = 1; k < pts.length - 1; k += Math.max(1, Math.floor(pts.length / 7))) {
    const [x, , z] = pts[k];
    out.push(part(rb(0.05, yR - HT + 0.03, 0.05, 0.008), P.paint, { p: [x * 0.985, (yR + HT) / 2 - 0.01, z * 0.99] }));
  }
  // carriage (cradle trolley) at the left rear, pintle post and the gun
  const kc = Math.round(pts.length * 0.3);
  const [cx, , cz] = pts[kc];
  const [nx, , nz] = pts[kc + 1];
  const car = group([], { p: [cx, yR, cz] });
  car.rotation.y = Math.atan2(nx - cx, nz - cz) + Math.PI / 2;
  car.add(part(rb(0.2, 0.08, 0.14, 0.012), P.cast, { p: [0, 0.0, 0] }));
  for (const sx of [-1, 1]) car.add(part(G.cyl(0.025, 0.025, 0.03, 12), P.toolSteel, { p: [sx * 0.08, -0.04, 0.03], r: [90, 0, 0] }));
  car.add(part(G.cyl(0.024, 0.026, 0.1, 14), P.gun, { p: [0, 0.08, 0] }));
  car.add(part(G.cyl(0.034, 0.034, 0.04, 14), P.gun, { p: [0, 0.13, 0] }));
  out.push(car);
  const gun = m2hb(P);
  gun.position.set(cx, yR + 0.16, cz);
  gun.rotation.set(-6 * D, 8 * D, 0);
  out.push(gun);
  return out;
}

export function turret(P: Pal, brake: boolean): THREE.Group {
  return group([...shell(P), ...gunShield(P), ...gunTube(P, brake), ...interior(P), ...aaMount(P)], { name: 'turret' });
}
