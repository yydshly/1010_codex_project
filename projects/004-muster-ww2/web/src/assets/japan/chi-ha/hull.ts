/**
 * Chi-Ha hull: riveted rolled plates with real thickness on the lower hull (between the tracks) and a
 * superstructure spanning the tracks. Stepped front: the driver's cab plate on the right stands a
 * little proud of the hull-MG plate on the left. Rows of round rivet heads along every plate seam,
 * driver's visor, hull MG ball mount, side vision ports, engine deck with the access hatch and the
 * two cooling-air louvres, sloped rear plate with the inspection door, tow hooks.
 *
 * Hull frame: +Z forward, +X = the tank's left, y = 0 ground (see dims.ts).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { H } from './dims';
import type { Pal } from './palette';
import { slab, onPlate, rb, merge, rivet, D, type P3 } from './util';

const { xLow: xL, xSide: xS, yBelly: yB, yGuard: yG, yRoof: yR } = H;
const V = (p: P3) => new THREE.Vector3(p[0], p[1], p[2]);

/** Newell normal of a planar polygon, oriented to agree with `hint`. */
function nrm(poly: P3[], hint: P3): P3 {
  const n = new THREE.Vector3();
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    n.x += (a[1] - b[1]) * (a[2] + b[2]);
    n.y += (a[2] - b[2]) * (a[0] + b[0]);
    n.z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  n.normalize();
  if (n.dot(V(hint)) < 0) n.negate();
  return [n.x, n.y, n.z];
}

/* ------------------------------------------------------------------ rivets */

type RP = { p: THREE.Vector3; n: THREE.Vector3; spin: number };
export class Rivets {
  list: RP[] = [];
  /** a row from a to b (inclusive), roughly `pitch` apart */
  row(a: P3, b: P3, n: P3, pitch = 0.1, skipEnds = false) {
    const L = V(a).distanceTo(V(b));
    const c = Math.max(2, Math.round(L / pitch) + 1);
    const N = V(n).normalize();
    G.along(a, b, c).forEach((p, i) => {
      if (skipEnds && (i === 0 || i === c - 1)) return;
      this.list.push({ p, n: N.clone(), spin: i });
    });
  }
  /** rows inset from the chosen edges of a planar polygon */
  edges(poly: P3[], n: P3, which: number[] | 'all', inset = 0.028, pitch = 0.1) {
    const N = V(n).normalize();
    const c = poly.reduce((acc, p) => acc.add(V(p)), new THREE.Vector3()).multiplyScalar(1 / poly.length);
    const idx = which === 'all' ? poly.map((_, i) => i) : which;
    for (const i of idx) {
      const a = V(poly[i]), b = V(poly[(i + 1) % poly.length]);
      const e = b.clone().sub(a);
      const L = e.length();
      e.normalize();
      const inw = new THREE.Vector3().crossVectors(N, e);
      if (inw.dot(c.clone().sub(a)) < 0) inw.negate();
      const a2 = a.clone().addScaledVector(inw, inset).addScaledVector(e, inset);
      const b2 = b.clone().addScaledVector(inw, inset).addScaledVector(e, -inset);
      if (L < inset * 3) continue;
      this.row([a2.x, a2.y, a2.z], [b2.x, b2.y, b2.z], n, pitch);
    }
  }
  mesh(P: Pal): THREE.Mesh {
    return part(G.scatter(rivet(), this.list), P.paint);
  }
}

/* ------------------------------------------------------------------ armour */

export const zTop = (sx: number) => (sx > 0 ? H.zTopMG : H.zTopCab);
/** superstructure front plates (outer faces) */
export const frontCab: P3[] = [[-xS, yG, H.zFrontBot], [H.xStep, yG, H.zFrontBot], [H.xStep, yR, H.zTopCab], [-xS, yR, H.zTopCab]];
export const frontMG: P3[] = [[H.xStep, yG, H.zFrontBot], [xS, yG, H.zFrontBot], [xS, yR, H.zTopMG], [H.xStep, yR, H.zTopMG]];
export const nCab = nrm(frontCab, [0, 0.3, 1]);
export const nMG = nrm(frontMG, [0, 0.3, 1]);
/** point on a front plate: fraction s (0 bottom .. 1 top) up the plate, at x, offset `off` along the normal */
export function onFront(which: 'cab' | 'mg', x: number, s: number, off = 0): P3 {
  const zt = which === 'cab' ? H.zTopCab : H.zTopMG;
  const n = which === 'cab' ? nCab : nMG;
  return [x + n[0] * off, yG + (yR - yG) * s + n[1] * off, H.zFrontBot + (zt - H.zFrontBot) * s + n[2] * off];
}
export const rearUpper: P3[] = [[-xS, yR, H.zDeckR], [xS, yR, H.zDeckR], [xS, yG, H.zRearBot], [-xS, yG, H.zRearBot]];
export const nRear = nrm(rearUpper, [0, 0.4, -1]);

function armour(P: Pal, rv: Rivets): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const add = (poly: P3[], hint: P3, t: number, rivetEdges: number[] | 'all' = [], mat = P.paint, pitch = 0.1) => {
    const n = nrm(poly, hint);
    out.push(part(slab(poly, t, n, 0.005), mat));
    if (rivetEdges === 'all' || rivetEdges.length) rv.edges(poly, n, rivetEdges, 0.026, pitch);
    return n;
  };
  // lower nose plate and upper nose plate (glacis)
  const lowNose: P3[] = [[-xL, yB, H.zBellyF], [xL, yB, H.zBellyF], [xL, H.yNose, H.zNose], [-xL, H.yNose, H.zNose]];
  add(lowNose, [0, -0.5, 1], H.tFront, [1, 3]);
  const glacis: P3[] = [[-xL, H.yNose, H.zNose], [xL, H.yNose, H.zNose], [xL, yG, H.zFrontBot], [-xL, yG, H.zFrontBot]];
  add(glacis, [0, 1, 0.2], H.tFront, [0, 1, 3]);
  // superstructure front plates and the cheek plate at the step
  add(frontCab, [0, 0.3, 1], H.tFront, [0, 2, 3]);
  add(frontMG, [0, 0.3, 1], H.tFront, [0, 1, 2]);
  const cheek: P3[] = [[H.xStep, yG, H.zFrontBot], [H.xStep, yR, H.zTopCab], [H.xStep, yR, H.zTopMG]];
  out.push(part(slab(cheek, 0.02, [1, 0, 0], 0.004), P.paint));
  for (const sx of [-1, 1]) {
    // lower hull side between the tracks
    const low: P3[] = [
      [sx * xL, yB, H.zBellyF], [sx * xL, H.yNose, H.zNose], [sx * xL, yG, H.zFrontBot], [sx * xL, yG, H.zLowRearTop],
      [sx * xL, H.yLowRear, H.zLowRear], [sx * xL, yB, H.zBellyR],
    ];
    add(low, [sx, 0, 0], H.tSide, [0, 1, 4]);
    // superstructure side over the track
    const zt = zTop(sx);
    const side: P3[] = [[sx * xS, yG, H.zFrontBot], [sx * xS, yR, zt], [sx * xS, yR, H.zDeckR], [sx * xS, yG, H.zRearBot]];
    add(side, [sx, 0, 0], H.tSide, 'all');
    // bulkhead rivet line and a frame line in the middle of the fighting compartment
    rv.row([sx * xS, yG + 0.04, H.zBulkhead], [sx * xS, yR - 0.04, H.zBulkhead], [sx, 0, 0], 0.09);
    rv.row([sx * xS, yG + 0.04, 0.72], [sx * xS, yR - 0.04, 0.72], [sx, 0, 0], 0.09);
    // sponson floor over the track
    const fl: P3[] = [[sx * xL, yG, H.zFrontBot], [sx * xS, yG, H.zFrontBot], [sx * xS, yG, H.zRearBot], [sx * xL, yG, H.zRearBot]];
    add(fl, [0, -1, 0], 0.012);
  }
  // roof: fighting compartment + engine deck in one plate (the seam is the rivet line at the bulkhead)
  const roof: P3[] = [[-xS, yR, H.zTopCab], [H.xStep, yR, H.zTopCab], [H.xStep, yR, H.zTopMG], [xS, yR, H.zTopMG], [xS, yR, H.zDeckR], [-xS, yR, H.zDeckR]];
  add(roof, [0, 1, 0], H.tRoof, 'all');
  rv.row([-xS + 0.03, yR, H.zBulkhead], [xS - 0.03, yR, H.zBulkhead], [0, 1, 0], 0.1);
  // rear: upper sloped plate, ledge, lower plate, belly slope, belly
  add(rearUpper, [0, 0.4, -1], H.tRear, [0, 1, 2, 3]);
  const ledge: P3[] = [[-xL, yG, H.zRearBot], [xL, yG, H.zRearBot], [xL, yG, H.zLowRearTop], [-xL, yG, H.zLowRearTop]];
  out.push(part(slab(ledge, 0.012, [0, -1, 0], 0.003), P.paint));
  const lowRear: P3[] = [[-xL, yG, H.zLowRearTop], [xL, yG, H.zLowRearTop], [xL, H.yLowRear, H.zLowRear], [-xL, H.yLowRear, H.zLowRear]];
  add(lowRear, [0, 0, -1], H.tRear, [0, 1, 2, 3]);
  const bellyR: P3[] = [[-xL, H.yLowRear, H.zLowRear], [xL, H.yLowRear, H.zLowRear], [xL, yB, H.zBellyR], [-xL, yB, H.zBellyR]];
  add(bellyR, [0, -1, -1], 0.015);
  const belly: P3[] = [[-xL, yB, H.zBellyR], [xL, yB, H.zBellyR], [xL, yB, H.zBellyF], [-xL, yB, H.zBellyF]];
  add(belly, [0, -1, 0], 0.012);
  // riveted angle strips along the outer roof edges and the nose ridge
  const angles: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const g = rb(0.03, 0.03, zTop(sx) - H.zDeckR, 0.004);
    g.translate(sx * (xS - 0.013), yR + 0.004, (zTop(sx) + H.zDeckR) / 2);
    angles.push(g);
  }
  const ridge = G.cyl(0.03, 0.03, 2 * xL + 0.02, 12);
  ridge.rotateZ(Math.PI / 2);
  ridge.translate(0, H.yNose - 0.012, H.zNose - 0.02);
  angles.push(ridge);
  out.push(part(merge(angles), P.paint));
  return out;
}

/* ------------------------------------------------------------------ front fittings */

/** driver's visor: armoured flap with two slits hinged at its top edge; lying on y = 0 facing +Y */
function driverVisor(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const W = 0.4, L = 0.2;
  ps.push(part(rb(W + 0.06, 0.02, L + 0.06, 0.006), P.paint, { p: [0, 0.01, 0] }));
  ps.push(part(rb(W, 0.028, L, 0.008), P.paint, { p: [0, 0.034, 0.004] }));
  for (const z of [-0.03, 0.04]) ps.push(part(G.box(W * 0.62, 0.012, 0.012), P.void, { p: [0, 0.045, z] }));
  // hinge along the top (plate's -Z local = up the plate), two knuckles
  for (const x of [-0.13, 0.13]) ps.push(part(G.cyl(0.018, 0.018, 0.07, 12), P.paint, { p: [x, 0.03, -L / 2 - 0.02], r: [0, 0, 90] }));
  ps.push(part(G.rod([-0.19, 0.03, -L / 2 - 0.02], [0.19, 0.03, -L / 2 - 0.02], 0.008, 8), P.paint));
  // side guides
  for (const x of [-1, 1]) ps.push(part(rb(0.022, 0.03, L + 0.04, 0.005), P.paint, { p: [x * (W / 2 + 0.024), 0.035, 0] }));
  return group(ps);
}

/** hull MG ball mount with the Type 97 MG barrel in its armoured jacket; +Y out of the plate */
function hullMG(P: Pal, plateNormal: P3): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.15, 0], [0.145, 0.02], [0.12, 0.045], [0.105, 0.05], [0.1, 0.04]], 32, 40), P.cast));
  ps.push(part(G.lathe([[0.0, -0.01], [0.092, -0.01], [0.1, 0.03], [0.09, 0.07], [0.055, 0.1], [0.0, 0.105]], 24, 60), P.cast));
  ps.push(part(G.scatter(rivet(), Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return { p: new THREE.Vector3(Math.cos(a) * 0.132, 0.022, Math.sin(a) * 0.132), n: new THREE.Vector3(0, 1, 0), spin: a };
  })), P.cast));
  // barrel pointing along the hull +Z (expressed in plate-local: y = normal, z = down the plate)
  const n = V(plateNormal);
  const dir = new THREE.Vector3(0, n.z, n.y).normalize();
  const a = new THREE.Vector3(0, 0.07, 0), b = a.clone().addScaledVector(dir, 0.16), c = b.clone().addScaledVector(dir, 0.16);
  ps.push(part(G.rod(a, b, 0.03, 16), P.cast));
  ps.push(part(G.rod(b, c, 0.02, 14), P.gun));
  ps.push(part(G.rod(c.clone().addScaledVector(dir, -0.012), c.clone().addScaledVector(dir, 0.004), 0.007, 8), P.void));
  // cooling slots on the jacket (dark bands)
  for (let i = 0; i < 3; i++) {
    const q = b.clone().addScaledVector(dir, 0.03 + i * 0.04);
    ps.push(part(G.rod(q, q.clone().addScaledVector(dir, 0.012), 0.0205, 14), P.void));
  }
  return group(ps);
}

/** small vision port with its armoured cover; lying on y = 0 facing +Y, long axis X */
function visionPort(P: Pal, w = 0.2): THREE.Object3D {
  return group([
    part(rb(w + 0.05, 0.016, 0.1, 0.005), P.paint, { p: [0, 0.008, 0] }),
    part(rb(w, 0.03, 0.06, 0.008), P.paint, { p: [0, 0.028, 0] }),
    part(G.box(w * 0.7, 0.01, 0.01), P.void, { p: [0, 0.04, 0] }),
    part(G.cyl(0.012, 0.012, w * 0.6, 10), P.paint, { p: [0, 0.03, -0.04], r: [0, 0, 90] }),
  ]);
}

/** cast tow hook on its base; base on y = 0, hook opening towards +Z (away from the plate) */
function towHook(P: Pal): THREE.Object3D {
  const hook: G.V2[] = [
    [0.07, 0.0], [0.07, 0.025], [0.06, 0.08], [0.036, 0.118], [0.0, 0.132], [-0.04, 0.124], [-0.07, 0.1],
    [-0.084, 0.074], [-0.076, 0.06], [-0.058, 0.064], [-0.042, 0.084], [-0.02, 0.09], [0.0, 0.085],
    [0.016, 0.066], [0.022, 0.04], [0.014, 0.022], [-0.016, 0.02], [-0.016, 0.0],
  ];
  return group([
    part(rb(0.1, 0.024, 0.18, 0.008), P.cast, { p: [0, 0.012, 0] }),
    part(G.plate(hook, 0.045, 'zy', 0.007), P.cast, { p: [0, 0.01, 0] }),
    part(G.scatter(rivet(), [[-0.035, 0.024, -0.065], [0.035, 0.024, -0.065], [-0.035, 0.024, 0.065], [0.035, 0.024, 0.065]].map((p) => ({ p: V(p as P3), n: new THREE.Vector3(0, 1, 0) }))), P.cast),
  ]);
}

function front(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  out.push(onPlate(driverVisor(P), onFront('cab', -0.52, 0.58), [1, 0, 0], nCab));
  out.push(onPlate(hullMG(P, nMG), onFront('mg', 0.5, 0.5), [1, 0, 0], nMG));
  // small vision port for the MG gunner next to the ball
  out.push(onPlate(visionPort(P, 0.14), onFront('mg', 0.14, 0.62), [1, 0, 0], nMG));
  // side vision ports (driver right, MG gunner left) and fighting compartment ports
  for (const sx of [-1, 1]) {
    out.push(onPlate(visionPort(P), [sx * xS, 1.3, 1.5], [0, 0, 1], [sx, 0, 0]));
  }
  // tow hooks: two on the lower nose, two on the lower rear plate
  const nLow = nrm([[-xL, yB, H.zBellyF], [xL, yB, H.zBellyF], [xL, H.yNose, H.zNose]], [0, -0.5, 1]);
  for (const sx of [-1, 1]) {
    const s = 0.55;
    const p: P3 = [sx * 0.46, yB + (H.yNose - yB) * s, H.zBellyF + (H.zNose - H.zBellyF) * s];
    out.push(onPlate(towHook(P), p, [1, 0, 0], nLow));
    out.push(onPlate(towHook(P), [sx * 0.46, 0.76, H.zLowRear - 0.012], [1, 0, 0], [0, 0, -1]));
  }
  return out;
}

/* ------------------------------------------------------------------ engine deck */

/** louvred cooling-air grille lying on y = 0, l along Z */
function louvre(P: Pal, w: number, l: number, slats: number): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const fw = 0.04;
  const frame: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const a = rb(w + 2 * fw, 0.035, fw, 0.006);
    a.translate(0, 0.0175, s * (l / 2 + fw / 2));
    frame.push(a);
    const b = rb(fw, 0.035, l, 0.006);
    b.translate(s * (w / 2 + fw / 2), 0.0175, 0);
    frame.push(b);
  }
  ps.push(part(merge(frame), P.paint));
  ps.push(part(G.box(w, 0.004, l), P.void, { p: [0, 0.006, 0] }));
  const sg: THREE.BufferGeometry[] = [];
  const pitch = l / slats;
  for (let i = 0; i < slats; i++) {
    const s = G.box(w - 0.004, 0.006, pitch * 1.1);
    s.rotateX(-35 * D);
    s.translate(0, 0.02, -l / 2 + pitch * (i + 0.5));
    sg.push(s);
  }
  ps.push(part(merge(sg), P.sheet));
  // rivets on the frame
  const rp: RP[] = [];
  for (const s of [-1, 1]) {
    G.along([s * (w / 2 + fw / 2), 0.035, -l / 2 + 0.03], [s * (w / 2 + fw / 2), 0.035, l / 2 - 0.03], Math.round(l / 0.1) + 1).forEach((p, i) => rp.push({ p, n: new THREE.Vector3(0, 1, 0), spin: i }));
  }
  ps.push(part(G.scatter(rivet(), rp), P.paint));
  return group(ps);
}

function hingedHatch(P: Pal, w: number, l: number): THREE.Object3D {
  // lying on y = 0, hinges at -Z edge
  const ps: THREE.Object3D[] = [];
  ps.push(part(rb(w, 0.022, l, 0.008), P.paint, { p: [0, 0.011, 0] }));
  ps.push(part(rb(w - 0.06, 0.01, l - 0.06, 0.004), P.paint, { p: [0, 0.026, 0] }));
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) {
    ps.push(part(G.cyl(0.018, 0.018, 0.1, 12), P.paint, { p: [x, 0.02, -l / 2 - 0.012], r: [0, 0, 90] }));
    ps.push(part(rb(0.07, 0.01, 0.14, 0.003), P.paint, { p: [x, 0.026, -l / 2 + 0.06] }));
  }
  // lifting handle
  ps.push(part(G.tube([[-0.07, 0.02, l / 2 - 0.07], [-0.06, 0.055, l / 2 - 0.07], [0.06, 0.055, l / 2 - 0.07], [0.07, 0.02, l / 2 - 0.07]], 0.008, 8), P.paint));
  const rp: RP[] = [];
  const inset = 0.03;
  for (const [a, b] of [
    [[-w / 2 + inset, 0.022, -l / 2 + inset], [w / 2 - inset, 0.022, -l / 2 + inset]],
    [[-w / 2 + inset, 0.022, l / 2 - inset], [w / 2 - inset, 0.022, l / 2 - inset]],
    [[-w / 2 + inset, 0.022, -l / 2 + inset], [-w / 2 + inset, 0.022, l / 2 - inset]],
    [[w / 2 - inset, 0.022, -l / 2 + inset], [w / 2 - inset, 0.022, l / 2 - inset]],
  ] as [P3, P3][]) {
    G.along(a, b, Math.max(2, Math.round(V(a).distanceTo(V(b)) / 0.09) + 1)).forEach((p, i) => rp.push({ p, n: new THREE.Vector3(0, 1, 0), spin: i }));
  }
  ps.push(part(G.scatter(rivet(), rp), P.paint));
  return group(ps);
}

function deck(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // engine access hatch (centre) and the two cooling-air louvres beside it
  out.push(group([hingedHatch(P, 0.72, 0.78)], { p: [0, yR, -1.2] }));
  for (const sx of [-1, 1]) out.push(group([louvre(P, 0.34, 1.12, 14)], { p: [sx * 0.66, yR, -1.36] }));
  // small hatch behind the turret (bulkhead access) and two filler caps
  out.push(group([hingedHatch(P, 0.46, 0.34)], { p: [0, yR, -0.66] }));
  for (const sx of [-1, 1]) {
    out.push(part(G.cyl(0.06, 0.065, 0.03, 20), P.cast, { p: [sx * 0.66, yR + 0.015, -0.6] }));
    out.push(part(rb(0.08, 0.018, 0.02, 0.004), P.cast, { p: [sx * 0.66, yR + 0.036, -0.6] }));
  }
  // lifting eyes at the deck corners
  for (const sx of [-1, 1]) {
    for (const z of [-2.06, 1.66]) {
      out.push(part(G.torus(0.03, 0.009, 6, 16), P.cast, { p: [sx * 0.93, yR + 0.03, z], r: [0, 90, 0] }));
      out.push(part(rb(0.05, 0.016, 0.06, 0.004), P.cast, { p: [sx * 0.93, yR + 0.008, z] }));
    }
  }
  // rear plate: inspection door with hinges, tail lamp
  const doorC: P3 = [0, (yR + yG) / 2, (H.zDeckR + H.zRearBot) / 2];
  out.push(onPlate(hingedHatch(P, 0.8, 0.36), doorC, [1, 0, 0], nRear));
  const lamp = group([
    part(rb(0.12, 0.05, 0.08, 0.012), P.paint, { p: [0, 0.025, 0] }),
    part(rb(0.08, 0.006, 0.045, 0.002), P.glass, { p: [0, 0.052, 0] }),
  ]);
  out.push(onPlate(lamp, [-0.78, yR - 0.72 * (yR - yG), H.zDeckR + 0.72 * (H.zRearBot - H.zDeckR)], [1, 0, 0], nRear));
  return out;
}

export function hull(P: Pal): THREE.Group {
  const rv = new Rivets();
  const parts = [...armour(P, rv), ...front(P), ...deck(P)];
  parts.push(rv.mesh(P));
  return group(parts, { name: 'hull' });
}
