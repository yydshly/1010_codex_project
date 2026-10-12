/**
 * ZiS-5V chassis: deep pressed-channel ladder frame with riveted cross members, forged I-beam
 * front axle on 11-leaf semi-elliptic springs (hubs only: the wartime ZiS-5V had brakes on the
 * rear wheels only), screw-and-pin steering box with drop arm, drag link and tie rod, double-
 * reduction rear axle with its large housing on 11-leaf springs plus 5-leaf helper springs,
 * rear brake drums, side-valve six-cylinder engine underside, clutch housing and four-speed
 * gearbox, one-piece propeller shaft, exhaust with silencer, the 60 l fuel tank under the
 * driver's seat and the rear towing hook.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, type V3, slab, merge, xf, box, cylX, cylZ, latheX, bentRod, sweep, type Station } from './util';

const Y = D.axleY;
const FX = D.frameX;

/** Mirror a geometry across X (winding restored) when s < 0. */
const mir = (g: THREE.BufferGeometry, s: number) => (s < 0 ? xf(g, [0, 0, 0], [0, 0, 0], [-1, 1, 1]) : g);

/* ------------------------------------------------------------------ frame */

function frame(): { paint: THREE.BufferGeometry[]; rivets: THREE.BufferGeometry[] } {
  const paint: THREE.BufferGeometry[] = [];
  const rivetPts: { p: V3; n: V3 }[] = [];
  const z0 = D.frameZ0, z1 = D.frameZ1;
  const len = z0 - z1;
  const b = D.frameBot, tp = D.frameTop, th = 0.006, fl = 0.07;
  for (const s of [1, -1]) {
    const w = FX + s * 0.03;
    const f = w - s * fl;
    const x0 = Math.min(w, f), x1 = Math.max(w, f);
    const prof: V2[] =
      s > 0
        ? [[x1, b], [x1, tp], [x0, tp], [x0, tp - th], [x1 - th, tp - th], [x1 - th, b + th], [x0, b + th], [x0, b]]
        : [[x0, b], [x0, tp], [x1, tp], [x1, tp - th], [x0 + th, tp - th], [x0 + th, b + th], [x1, b + th], [x1, b]];
    paint.push(slab(prof, len, [0, 0, z1 + len / 2], [1, 0, 0], [0, 1, 0], { bevel: 0.0015 }));
  }
  const cms: [number, number, number][] = [
    [2.84, 0.7, 0.12],
    [1.62, 0.72, 0.12],
    [0.6, 0.75, 0.1],
    [-0.35, 0.75, 0.1],
    [-0.85, 0.75, 0.1],
    [-2.1, 0.75, 0.1],
    [-2.86, 0.74, 0.14],
  ];
  for (const [z, y, h] of cms) {
    const wIn = 2 * (FX - 0.03 + 0.006);
    paint.push(box(wIn, h, 0.05, [0, y, z], 0.004));
    paint.push(box(wIn - 0.02, 0.006, 0.09, [0, y + h / 2 - 0.003, z], 0.002));
    paint.push(box(wIn - 0.02, 0.006, 0.09, [0, y - h / 2 + 0.003, z], 0.002));
    for (const s of [1, -1]) {
      const xg = s * (FX - 0.03 + 0.008);
      paint.push(box(0.006, 0.16, 0.2, [xg, (D.frameBot + D.frameTop) / 2, z], 0.002));
      for (const dz of [-0.07, 0, 0.07]) for (const dy of [-0.05, 0.05]) rivetPts.push({ p: [xg - s * 0.003, (D.frameBot + D.frameTop) / 2 + dy, z + dz], n: [-s, 0, 0] });
    }
  }
  for (const s of [1, -1]) for (let z = 2.75; z > -2.9; z -= 0.3) rivetPts.push({ p: [s * (FX + 0.03), D.frameTop - 0.03, z], n: [s, 0, 0] });
  const rivet = new THREE.SphereGeometry(0.008, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1);
  return { paint, rivets: [G.scatter(rivet, rivetPts)] };
}

/* ------------------------------------------------------------------ springs */

function spring(x: number, zc: number, yMain: number, half: number, R: number, leaves: number, lt: number, w: number, eyes = true): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < leaves; i++) {
    const hl = i === 0 ? half : Math.max(0.09, half * (1 - (i - 0.3) / leaves) * 0.98);
    const yc = yMain - i * lt;
    const pts: V3[] = [];
    const n = 14;
    for (let k = 0; k <= n; k++) {
      const zz = -hl + (2 * hl * k) / n;
      pts.push([x, yc + (R - Math.sqrt(R * R - zz * zz)), zc + zz]);
    }
    out.push(G.strap(pts, w, lt * 0.92, [0, 1, 0], { smooth: false }));
  }
  if (eyes) {
    const ey = yMain + (R - Math.sqrt(R * R - half * half)) + 0.012;
    for (const e of [half, -half]) out.push(cylX(0.022, w, [x, ey, zc + e + Math.sign(e) * 0.012], 16));
  }
  for (const e of [0.45, -0.45]) {
    const zz = e * half;
    const yy = yMain + (R - Math.sqrt(R * R - zz * zz));
    out.push(box(w + 0.014, 0.012, 0.03, [x, yy + 0.008, zc + zz], 0.002));
  }
  return out;
}

/* ------------------------------------------------------------------ front axle */

function frontAxle(): { paint: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[]; springs: THREE.BufferGeometry[] } {
  const z = D.zF;
  const paint: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const springs: THREE.BufferGeometry[] = [];
  const path: [number, number][] = [
    [-0.62, Y + 0.008],
    [-0.52, Y + 0.004],
    [-0.4, Y],
    [-0.28, Y - 0.02],
    [-0.14, Y - 0.04],
    [0, Y - 0.045],
    [0.14, Y - 0.04],
    [0.28, Y - 0.02],
    [0.4, Y],
    [0.52, Y + 0.004],
    [0.62, Y + 0.008],
  ];
  const I: V2[] = [
    [-0.026, -0.036],
    [0.026, -0.036],
    [0.026, -0.024],
    [0.008, -0.02],
    [0.008, 0.02],
    [0.026, 0.024],
    [0.026, 0.036],
    [-0.026, 0.036],
    [-0.026, 0.024],
    [-0.008, 0.02],
    [-0.008, -0.02],
    [-0.026, -0.024],
  ];
  const st: Station[] = path.map(([x, y], i) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize();
    return { p: new THREE.Vector3(x, y, z), u: new THREE.Vector3(0, 0, 1), v: new THREE.Vector3(-t.y, t.x, 0) };
  });
  paint.push(sweep(I, st, true, 40));
  for (const s of [1, -1]) {
    paint.push(box(0.09, 0.012, 0.12, [s * FX, Y + 0.042, z], 0.004));
    for (const dz of [-0.045, 0.045]) {
      steel.push(bentRod([[s * FX - 0.038, Y - 0.03, z + dz], [s * FX - 0.038, Y + 0.15, z + dz], [s * FX + 0.038, Y + 0.15, z + dz], [s * FX + 0.038, Y - 0.03, z + dz]], 0.008, 0.012));
      steel.push(box(0.09, 0.012, 0.022, [s * FX, Y - 0.032, z + dz], 0.003));
    }
    // kingpin boss, stub axle, hub (no front brakes on the ZiS-5V), steering arm
    paint.push(xf(G.cyl(0.036, 0.036, 0.15, 18), [s * 0.64, Y + 0.005, z]));
    paint.push(xf(G.cyl(0.028, 0.028, 0.03, 14), [s * 0.64, Y + 0.09, z]));
    paint.push(mir(latheX([[0.03, -0.1], [0.075, -0.1], [0.085, -0.085], [0.085, 0.01], [0.095, 0.02], [0.095, 0.035], [0.0, 0.035]].map(([r, a]) => [r, a] as V2), 32, 40), s).translate(s * 0.765, Y, z));
    paint.push(bentRod([[s * 0.64, Y + 0.03, z - 0.02], [s * 0.64, Y + 0.03, z - 0.14], [s * 0.58, Y + 0.03, z - 0.2]], 0.014, 0.04));
    // 11-leaf front spring 1.015 m long
    springs.push(...spring(s * FX, z, Y + 0.13, 0.5075, 4.2, 11, 0.0072, 0.063));
    const eyeY = Y + 0.13 + (4.2 - Math.sqrt(4.2 * 4.2 - 0.5075 * 0.5075)) + 0.012;
    paint.push(box(0.085, D.frameBot - eyeY + 0.02, 0.07, [s * FX, (D.frameBot + eyeY) / 2 + 0.01, z + 0.525], 0.006));
    for (const dx of [-0.04, 0.04]) paint.push(box(0.01, 0.12, 0.035, [s * FX + dx, eyeY + 0.03, z - 0.53], 0.003));
    steel.push(cylX(0.012, 0.1, [s * FX, eyeY, z + 0.52], 10), cylX(0.012, 0.1, [s * FX, eyeY, z - 0.52], 10));
  }
  steel.push(G.rod([0.58, Y + 0.03, z - 0.2], [-0.58, Y + 0.03, z - 0.2], 0.016, 12));
  for (const s of [1, -1]) steel.push(xf(new THREE.SphereGeometry(0.026, 12, 8), [s * 0.58, Y + 0.03, z - 0.2]));
  // steering box on the left rail with drop arm and drag link
  paint.push(box(0.12, 0.15, 0.17, [FX + 0.1, D.frameBot + 0.05, z - 0.42], 0.015));
  paint.push(cylX(0.05, 0.04, [FX + 0.17, D.frameBot + 0.02, z - 0.42], 16));
  paint.push(box(0.03, 0.2, 0.05, [FX + 0.2, D.frameBot - 0.07, z - 0.42], 0.008));
  steel.push(G.rod([FX + 0.2, D.frameBot - 0.16, z - 0.42], [0.66, Y + 0.09, z - 0.02], 0.017, 12));
  steel.push(xf(new THREE.SphereGeometry(0.028, 12, 8), [FX + 0.2, D.frameBot - 0.16, z - 0.42]));
  paint.push(bentRod([[0.64, Y + 0.09, z - 0.02], [0.68, Y + 0.09, z - 0.02]], 0.02, 0.01));
  return { paint, steel, springs };
}

/* ------------------------------------------------------------------ rear axle */

function rearAxle(): { paint: THREE.BufferGeometry[]; casting: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[]; springs: THREE.BufferGeometry[] } {
  const z = D.zR;
  const paint: THREE.BufferGeometry[] = [];
  const casting: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const springs: THREE.BufferGeometry[] = [];
  // double-reduction final drive: banjo (clearance 0.25 under it) + tall spur-gear housing
  const banjo = new THREE.SphereGeometry(0.155, 32, 20);
  banjo.scale(0.75, 1.1, 1.05);
  banjo.translate(0, Y, z);
  casting.push(banjo);
  const hous = new THREE.SphereGeometry(0.15, 28, 18);
  hous.scale(0.85, 1.1, 0.9);
  hous.translate(-0.02, Y + 0.12, z + 0.06);
  casting.push(hous);
  casting.push(cylX(0.13, 0.03, [-0.12, Y + 0.1, z + 0.06], 32));
  const bolts: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    bolts.push({ p: [-0.135, Y + 0.1 + Math.cos(a) * 0.11, z + 0.06 + Math.sin(a) * 0.11], n: [-1, 0, 0] });
  }
  steel.push(G.scatter(G.boltHead(0.016, 0.008), bolts));
  casting.push(xf(latheX([[0.0, 0.0], [0.09, 0.0], [0.08, 0.08], [0.065, 0.16], [0.06, 0.2], [0.0, 0.2]].map(([r, a]) => [r, a] as V2), 28, 40), [0, Y + 0.14, z + 0.14], [0, -90, 0]));
  paint.push(cylX(0.06, 1.25, [0, Y, z], 20));
  for (const s of [1, -1]) {
    paint.push(mir(latheX([[0.06, 0], [0.075, 0.05], [0.08, 0.1]].map(([r, a]) => [r, a] as V2), 20, 40), s).translate(s * 0.52, Y, z));
    // brake drum + backing plate
    paint.push(mir(latheX([[0.0, -0.1], [0.205, -0.1], [0.21, -0.094], [0.21, -0.082], [0.2, -0.078], [0.2, 0.03], [0.185, 0.036], [0.0, 0.036]].map(([r, a]) => [r, a] as V2), 40, 40), s).translate(s * 0.72, Y, z));
    paint.push(cylX(0.214, 0.008, [s * 0.615, Y, z], 40));
    paint.push(cylX(0.078, 0.014, [s * D.dualX, Y, z], 28));
    // 11-leaf main spring (1.37 m) and 5-leaf helper (0.964 m) above it
    springs.push(...spring(s * FX, z, Y + 0.17, 0.685, 10, 11, 0.0085, 0.076));
    springs.push(...spring(s * FX, z, Y + 0.212, 0.482, 6, 5, 0.0085, 0.076, false));
    paint.push(box(0.11, 0.02, 0.14, [s * FX, Y + 0.068, z], 0.004));
    for (const dz of [-0.055, 0.055]) {
      steel.push(bentRod([[s * FX - 0.048, Y - 0.07, z + dz], [s * FX - 0.048, Y + 0.228, z + dz], [s * FX + 0.048, Y + 0.228, z + dz], [s * FX + 0.048, Y - 0.07, z + dz]], 0.009, 0.012));
      steel.push(box(0.12, 0.014, 0.024, [s * FX, Y - 0.072, z + dz], 0.003));
    }
    const eyeY = Y + 0.17 + (10 - Math.sqrt(100 - 0.685 * 0.685)) + 0.012;
    paint.push(box(0.1, D.frameBot - eyeY + 0.03, 0.08, [s * FX, (D.frameBot + eyeY) / 2 + 0.012, z + 0.7], 0.006));
    for (const dx of [-0.047, 0.047]) paint.push(box(0.01, 0.1, 0.035, [s * FX + dx, eyeY + 0.03, z - 0.705], 0.003));
    steel.push(cylX(0.013, 0.12, [s * FX, eyeY, z + 0.697], 10), cylX(0.013, 0.12, [s * FX, eyeY, z - 0.697], 10));
    // helper-spring stops on the frame
    const hy = Y + 0.212 + 0.004 + (6 - Math.sqrt(36 - 0.482 * 0.482));
    for (const e of [0.482, -0.482]) paint.push(box(0.1, D.frameBot - hy + 0.004, 0.06, [s * FX, (D.frameBot + hy) / 2 + 0.006, z + e], 0.006));
  }
  return { paint, casting, steel, springs };
}

/* ------------------------------------------------------------------ drivetrain */

function drivetrain(): { casting: THREE.BufferGeometry[]; paint: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[]; exhaust: THREE.BufferGeometry[]; black: THREE.BufferGeometry[] } {
  const casting: THREE.BufferGeometry[] = [];
  const paint: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  // side-valve six: block, flat head, sump, timing cover, bell housing, manifolds
  casting.push(box(0.26, 0.42, 0.9, [0, 1.03, 2.18], 0.02));
  casting.push(box(0.23, 0.07, 0.86, [0, 1.275, 2.18], 0.015));
  casting.push(box(0.3, 0.2, 0.76, [0, 0.74, 2.2], 0.03));
  casting.push(box(0.22, 0.08, 0.55, [0, 0.62, 2.25], 0.03));
  casting.push(box(0.22, 0.3, 0.06, [0, 1.0, 2.66], 0.02));
  casting.push(xf(G.cyl(0.2, 0.25, 0.16, 28), [0, 0.88, 1.66], [90, 0, 0]));
  casting.push(box(0.06, 0.1, 0.78, [-0.16, 1.08, 2.18], 0.015));
  casting.push(xf(G.cyl(0.05, 0.05, 0.26, 18), [0.16, 0.98, 2.4], [90, 0, 0]));
  casting.push(xf(G.cyl(0.045, 0.045, 0.2, 18), [-0.15, 0.8, 1.76], [90, 0, 0]));
  for (const s of [1, -1]) paint.push(box(0.18, 0.05, 0.08, [s * 0.26, 0.8, 2.5], 0.008), box(0.18, 0.05, 0.08, [s * 0.26, 0.8, 1.74], 0.008));
  for (let i = 0; i < 4; i++) black.push(xf(G.rbox(0.07, 0.42, 0.008, 0.004, 1), [0, 1.16, 2.7], [0, 12, (i / 4) * 180]));
  black.push(xf(G.cyl(0.05, 0.05, 0.06, 16), [0, 1.16, 2.68], [90, 0, 0]));
  // four-speed gearbox
  casting.push(box(0.24, 0.24, 0.42, [0, 0.83, 1.36], 0.025));
  casting.push(box(0.14, 0.12, 0.16, [0, 0.98, 1.4], 0.02));
  paint.push(xf(G.cyl(0.13, 0.13, 0.05, 32), [0, 0.82, 1.1], [90, 0, 0]));
  // one-piece propeller shaft with two joints
  const a: V3 = [0, 0.8, 1.06], b: V3 = [0, Y + 0.16, D.zR + 0.33];
  paint.push(G.rod(a, b, 0.036, 16));
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
  for (const p of [a, b]) {
    const y = G.rbox(0.1, 0.1, 0.05, 0.01, 1);
    y.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir));
    y.translate(p[0], p[1], p[2]);
    steel.push(y);
  }
  // exhaust on the right: downpipe, pipe, silencer, tail pipe ahead of the rear wheels
  const exhaust: THREE.BufferGeometry[] = [];
  exhaust.push(bentRod([[-0.17, 1.05, 2.0], [-0.2, 0.86, 1.92], [-0.25, 0.64, 1.7], [-0.26, 0.63, 1.2], [-0.27, 0.64, 0.75]], 0.028, 0.1));
  exhaust.push(latheX([[0, -0.3], [0.07, -0.3], [0.09, -0.28], [0.09, 0.28], [0.07, 0.3], [0, 0.3]].map(([r, a]) => [r, a] as V2), 28, 40).rotateY(-Math.PI / 2).translate(-0.27, 0.64, 0.4));
  for (const zz of [0.26, 0.56]) exhaust.push(G.torus(0.092, 0.006, 6, 28).translate(-0.27, 0.64, zz));
  exhaust.push(bentRod([[-0.27, 0.64, 0.1], [-0.28, 0.63, -0.2], [-0.36, 0.62, -0.6], [-0.56, 0.58, -0.78], [-0.62, 0.53, -0.82]], 0.024, 0.08));
  for (const zz of [0.25, 0.55]) paint.push(bentRod([[-0.27, 0.735, zz], [-0.31, 0.76, zz], [-0.39, 0.76, zz]], 0.008, 0.015));
  return { casting, paint, steel, exhaust, black };
}

/** 60 l fuel tank under the driver's seat (inside the cab seat box, visible from below). */
function fuelTank(): { paint: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const paint: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const zc = 0.5, yc = 1.02;
  const sec: V2[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    sec.push([0.17 * Math.sign(c) * Math.pow(Math.abs(c), 0.7), 0.13 * Math.sign(s) * Math.pow(Math.abs(s), 0.7)]);
  }
  const xs = [0.02, 0.03, 0.8, 0.81];
  const st: Station[] = xs.map((x) => ({ p: new THREE.Vector3(x, yc, zc), u: new THREE.Vector3(0, 0, 1), v: new THREE.Vector3(0, 1, 0) }));
  const secs = st.map((_, i) => (i === 0 || i === 3 ? sec.map(([a, b]) => [a * 0.96, b * 0.95] as V2) : sec));
  paint.push(sweep(secs, st, true, 45));
  for (const x of [0.025, 0.805]) paint.push(xf(G.rbox(0.008, 0.28, 0.36, 0.01, 1), [x, yc, zc]));
  for (const x of [0.2, 0.62]) steel.push(box(0.035, 0.004, 0.36, [x, yc - 0.132, zc], 0.001));
  return { paint, steel };
}

/** Rear towing hook (pintle) with its sprung shank and latch on the rear cross member. */
function towHook(): { paint: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const z = D.frameZ1 + 0.06;
  const paint: THREE.BufferGeometry[] = [
    box(0.26, 0.17, 0.014, [0, 0.745, z - 0.007], 0.003),
    xf(latheX([[0.0, 0.0], [0.055, 0.0], [0.055, 0.1], [0.045, 0.11], [0.0, 0.11]].map(([r, a]) => [r, a] as V2), 24, 40), [0, 0.745, z - 0.012], [0, 90, 0]),
  ];
  for (const s of [1, -1]) paint.push(box(0.012, 0.13, 0.06, [s * 0.1, 0.745, z - 0.04], 0.003));
  const steel: THREE.BufferGeometry[] = [
    cylZ(0.022, 0.06, [0, 0.745, z - 0.145]),
    bentRod([[0, 0.745, z - 0.17], [0, 0.72, z - 0.2], [0, 0.69, z - 0.2], [0, 0.67, z - 0.17], [0, 0.69, z - 0.14], [0, 0.73, z - 0.14]], 0.017, 0.02, 10),
    bentRod([[0.0, 0.775, z - 0.16], [0.0, 0.76, z - 0.2], [0.0, 0.735, z - 0.215]], 0.007, 0.01, 8),
  ];
  return { paint, steel };
}

export function buildChassis(): THREE.Object3D {
  const fr = frame();
  const fa = frontAxle();
  const ra = rearAxle();
  const dt = drivetrain();
  const ft = fuelTank();
  const th = towHook();
  return group([
    part(merge([...fr.paint, ...fa.paint, ...ra.paint, ...dt.paint, ...th.paint]), P.chassis()),
    part(merge([...fr.rivets, ...fa.springs, ...ra.springs]), P.chassis()),
    part(merge([...fa.steel, ...ra.steel, ...dt.steel, ...ft.steel, ...th.steel]), P.steel()),
    part(merge([...ra.casting, ...dt.casting]), P.casting()),
    part(merge(dt.exhaust), P.exhaust()),
    part(merge(dt.black), P.black()),
    part(merge(ft.paint), P.body()),
  ]);
}
