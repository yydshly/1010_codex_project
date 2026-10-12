/**
 * Ha-Go hull: riveted plates with real thickness. Box-shaped lower hull between the tracks with a
 * steep lower nose plate and a long shallow glacis carrying the two final-drive / brake access
 * hatches; a superstructure spanning the tracks whose sides bulge outwards over the track guards;
 * a sloped front plate with the driver's visor on the right and the projecting three-sided hull-MG
 * bay on the left; flat roof and engine deck; sloped upper rear plate, ledge and lower rear plate.
 * Rows of round rivet heads along the plate seams; engine deck access hatches, louvred intake,
 * right-hand cooling-air outlet ahead of the silencer, tow hooks and tail lamp.
 *
 * Hull frame: +Z forward, +X = the tank's left, y = 0 ground (see dims.ts).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { H } from './dims';
import type { Pal } from './palette';
import { slab, onPlate, rb, merge, rivet, D, type P3 } from './util';

const { xLow: xL, yBelly: yB, yGuard: yG, yRoof: yR } = H;
const V = (p: P3) => new THREE.Vector3(p[0], p[1], p[2]);

/** Newell normal of a planar polygon, oriented to agree with `hint`. */
export function nrm(poly: P3[], hint: P3): P3 {
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

/** superstructure front plate: z at height y */
export const zf = (y: number) => H.zFrontBot + ((y - yG) * (H.zFrontTop - H.zFrontBot)) / (yR - yG);
/** upper rear plate: z at height y */
export const zr = (y: number) => H.zRearBot + ((y - yG) * (H.zDeckR - H.zRearBot)) / (yR - yG);
/** half cross-section of the superstructure side (x, y), bottom to top */
export const PROFILE: [number, number][] = [
  [H.xFloor, yG],
  [H.xBulge, H.yBulge],
  [H.xRoof, yR],
];
/** x of the superstructure side at height y (y in [yG, yR]) */
export function sideX(y: number): number {
  const [a, b, c] = PROFILE;
  if (y <= b[1]) return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
  return b[0] + ((c[0] - b[0]) * (y - b[1])) / (c[1] - b[1]);
}
/** outward normal of the superstructure side facet at height y, side sx */
export function sideN(sx: number, y: number): P3 {
  const [a, b, c] = PROFILE;
  const [p, q] = y <= b[1] ? [a, b] : [b, c];
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const L = Math.hypot(dx, dy);
  return [(sx * dy) / L, -dx / L, 0];
}

/** MG bay (left front): base x range on the front plate, front face x range, forward offset */
export const BAY = { x0: 0.12, x1: 0.74, f0: 0.23, f1: 0.63, d: 0.12, yLo: 0.815 };
const nFront = nrm([[0, yG, zf(yG)], [1, yG, zf(yG)], [1, yR, zf(yR)]], [0, 0.3, 1]);
export { nFront };
/** point on the (main) front plate at x, fraction s (0 bottom .. 1 top) */
export const onFront = (x: number, s: number, dz = 0): P3 => {
  const y = yG + (yR - yG) * s;
  return [x, y, zf(y) + dz];
};

/* ------------------------------------------------------------------ rivets */

type RP = { p: THREE.Vector3; n: THREE.Vector3; spin: number };
export class Rivets {
  list: RP[] = [];
  row(a: P3, b: P3, n: P3, pitch = 0.09) {
    const L = V(a).distanceTo(V(b));
    const c = Math.max(2, Math.round(L / pitch) + 1);
    const N = V(n).normalize();
    G.along(a, b, c).forEach((p, i) => this.list.push({ p, n: N.clone(), spin: i }));
  }
  /** rows inset from the chosen edges of a planar polygon */
  edges(poly: P3[], n: P3, which: number[] | 'all', inset = 0.024, pitch = 0.09) {
    const N = V(n).normalize();
    const c = poly.reduce((acc, p) => acc.add(V(p)), new THREE.Vector3()).multiplyScalar(1 / poly.length);
    const idx = which === 'all' ? poly.map((_, i) => i) : which;
    for (const i of idx) {
      const a = V(poly[i]), b = V(poly[(i + 1) % poly.length]);
      const e = b.clone().sub(a);
      const L = e.length();
      if (L < inset * 3) continue;
      e.normalize();
      const inw = new THREE.Vector3().crossVectors(N, e);
      if (inw.dot(c.clone().sub(a)) < 0) inw.negate();
      const a2 = a.clone().addScaledVector(inw, inset).addScaledVector(e, inset);
      const b2 = b.clone().addScaledVector(inw, inset).addScaledVector(e, -inset);
      this.row([a2.x, a2.y, a2.z], [b2.x, b2.y, b2.z], n, pitch);
    }
  }
  mesh(P: Pal): THREE.Mesh {
    return part(G.scatter(rivet(), this.list), P.paint);
  }
}

/* ------------------------------------------------------------------ armour */

function armour(P: Pal, rv: Rivets): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const add = (poly: P3[], hint: P3, t: number, rivetEdges: number[] | 'all' = [], pitch = 0.09) => {
    const n = nrm(poly, hint);
    out.push(part(slab(poly, t, n, 0.004), P.paint));
    if (rivetEdges === 'all' || rivetEdges.length) rv.edges(poly, n, rivetEdges, 0.022, pitch);
    return n;
  };
  // lower nose plate and glacis
  const lowNose: P3[] = [[-xL, yB, H.zBellyF], [xL, yB, H.zBellyF], [xL, H.yNose, H.zNose], [-xL, H.yNose, H.zNose]];
  add(lowNose, [0, -0.3, 1], H.tFront, [1, 3]);
  const glacis: P3[] = [[-xL, H.yNose, H.zNose], [xL, H.yNose, H.zNose], [xL, yG, H.zFrontBot], [-xL, yG, H.zFrontBot]];
  add(glacis, [0, 1, 0.3], H.tFront, [0, 1, 3]);
  // superstructure front plate (full cross-section)
  const secF: P3[] = [];
  const secR: P3[] = [];
  const ring: [number, number][] = [
    [-PROFILE[0][0], PROFILE[0][1]], [PROFILE[0][0], PROFILE[0][1]], PROFILE[1], PROFILE[2],
    [-PROFILE[2][0], PROFILE[2][1]], [-PROFILE[1][0], PROFILE[1][1]],
  ];
  for (const [x, y] of ring) {
    secF.push([x, y, zf(y)]);
    secR.push([x, y, zr(y)]);
  }
  add(secF, [0, 0.3, 1], H.tFront, [2, 3, 4, 5]);
  add(secR, [0, 0.4, -1], H.tRear, 'all');
  for (const sx of [-1, 1]) {
    // lower hull side between the tracks
    const low: P3[] = [
      [sx * xL, yB, H.zBellyF], [sx * xL, H.yNose, H.zNose], [sx * xL, yG, H.zFrontBot], [sx * xL, yG, H.zLowRearTop],
      [sx * xL, H.yLowRear, H.zLowRear], [sx * xL, yB, H.zBellyR],
    ];
    add(low, [sx, 0, 0], H.tSide, [0, 1, 4]);
    // superstructure sides: lower (flared) and upper facets
    for (let k = 0; k < 2; k++) {
      const [a, b] = [PROFILE[k], PROFILE[k + 1]];
      const f: P3[] = [[sx * a[0], a[1], zf(a[1])], [sx * b[0], b[1], zf(b[1])], [sx * b[0], b[1], zr(b[1])], [sx * a[0], a[1], zr(a[1])]];
      add(f, sideN(sx, (a[1] + b[1]) / 2), H.tSide, k === 0 ? [0, 1, 2] : [0, 1, 2, 3]);
    }
    // frame line at the bulkhead and a middle frame line on the upper facet
    for (const z of [H.zBulkhead, 0.72]) {
      rv.row([sx * sideX(H.yBulge + 0.03), H.yBulge + 0.03, z], [sx * sideX(yR - 0.03), yR - 0.03, z], sideN(sx, 1.3), 0.085);
    }
    // sponson floor over the track
    const fl: P3[] = [[sx * xL, yG, zf(yG)], [sx * H.xFloor, yG, zf(yG)], [sx * H.xFloor, yG, zr(yG)], [sx * xL, yG, zr(yG)]];
    add(fl, [0, -1, 0], 0.01);
  }
  // roof: fighting compartment + engine deck (the seam is the rivet line at the bulkhead)
  const roof: P3[] = [[-H.xRoof, yR, zf(yR)], [H.xRoof, yR, zf(yR)], [H.xRoof, yR, zr(yR)], [-H.xRoof, yR, zr(yR)]];
  add(roof, [0, 1, 0], H.tRoof, 'all');
  rv.row([-H.xRoof + 0.03, yR, H.zBulkhead], [H.xRoof - 0.03, yR, H.zBulkhead], [0, 1, 0], 0.09);
  // rear: ledge, lower plate, belly slope, belly
  const ledge: P3[] = [[-xL, yG, H.zRearBot], [xL, yG, H.zRearBot], [xL, yG, H.zLowRearTop], [-xL, yG, H.zLowRearTop]];
  out.push(part(slab(ledge, 0.01, [0, -1, 0], 0.003), P.paint));
  const lowRear: P3[] = [[-xL, yG, H.zLowRearTop], [xL, yG, H.zLowRearTop], [xL, H.yLowRear, H.zLowRear], [-xL, H.yLowRear, H.zLowRear]];
  add(lowRear, [0, 0, -1], H.tRear, [0, 1, 2, 3]);
  const bellyR: P3[] = [[-xL, H.yLowRear, H.zLowRear], [xL, H.yLowRear, H.zLowRear], [xL, yB, H.zBellyR], [-xL, yB, H.zBellyR]];
  add(bellyR, [0, -1, -1], 0.012);
  const belly: P3[] = [[-xL, yB, H.zBellyR], [xL, yB, H.zBellyR], [xL, yB, H.zBellyF], [-xL, yB, H.zBellyF]];
  add(belly, [0, -1, 0], 0.01);
  // hull-MG bay on the left of the front plate: front face, two cheeks and a roof
  const { x0, x1, f0, f1, d, yLo } = BAY;
  const bayPoint = (x: number, y: number, off: number): P3 => [x, y, zf(y) + off];
  const face: P3[] = [bayPoint(f0, yLo, d), bayPoint(f1, yLo, d), bayPoint(f1, yR, d), bayPoint(f0, yR, d)];
  add(face, [0, 0.3, 1], H.tFront, [1, 2, 3]);
  add([bayPoint(x0, yLo, 0), bayPoint(f0, yLo, d), bayPoint(f0, yR, d), bayPoint(x0, yR, 0)], [-1, 0, 0.6], H.tFront, [2]);
  add([bayPoint(f1, yLo, d), bayPoint(x1, yLo, 0), bayPoint(x1, yR, 0), bayPoint(f1, yR, d)], [1, 0, 0.6], H.tFront, [2]);
  add([bayPoint(x0, yR, 0), bayPoint(f0, yR, d), bayPoint(f1, yR, d), bayPoint(x1, yR, 0)], [0, 1, 0], H.tRoof, [1]);
  // riveted angle strips along the roof side edges and the nose ridge
  const angles: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const g = rb(0.026, 0.026, zf(yR) - zr(yR), 0.004);
    g.translate(sx * (H.xRoof - 0.012), yR + 0.004, (zf(yR) + zr(yR)) / 2);
    angles.push(g);
  }
  const ridge = G.cyl(0.024, 0.024, 2 * xL + 0.02, 12);
  ridge.rotateZ(Math.PI / 2);
  ridge.translate(0, H.yNose - 0.01, H.zNose - 0.016);
  angles.push(ridge);
  out.push(part(merge(angles), P.paint));
  return out;
}

/* ------------------------------------------------------------------ front fittings */

/** driver's visor: armoured flap with a vision slit, hinged at its top edge; lying on y = 0 facing +Y */
function driverVisor(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const W = 0.34, L = 0.24;
  ps.push(part(rb(W + 0.05, 0.016, L + 0.05, 0.005), P.paint, { p: [0, 0.008, 0] }));
  ps.push(part(rb(W, 0.024, L, 0.007), P.paint, { p: [0, 0.028, 0.004] }));
  // vision slit with the glass block behind it
  ps.push(part(G.box(W * 0.6, 0.012, 0.014), P.void, { p: [0, 0.036, 0.02] }));
  ps.push(part(G.box(W * 0.56, 0.004, 0.01), P.glass, { p: [0, 0.03, 0.02] }));
  for (const x of [-0.11, 0.11]) ps.push(part(G.cyl(0.015, 0.015, 0.06, 12), P.paint, { p: [x, 0.026, -L / 2 - 0.018], r: [0, 0, 90] }));
  ps.push(part(G.rod([-0.16, 0.026, -L / 2 - 0.018], [0.16, 0.026, -L / 2 - 0.018], 0.007, 8), P.paint));
  // small handle at the bottom edge
  ps.push(part(G.tube([[-0.04, 0.04, L / 2 - 0.03], [-0.03, 0.058, L / 2 - 0.03], [0.03, 0.058, L / 2 - 0.03], [0.04, 0.04, L / 2 - 0.03]], 0.006, 6), P.paint));
  const rp: RP[] = [];
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rp.push({ p: new THREE.Vector3(x * (W / 2 + 0.012), 0.016, z * (L / 2 + 0.012)), n: new THREE.Vector3(0, 1, 0), spin: 0 });
  ps.push(part(G.scatter(rivet(), rp), P.paint));
  return group(ps);
}

/** hull MG ball mount with the 7.7 mm Type 97 barrel in its armoured jacket; +Y out of the plate */
export function ballMG(P: Pal, dir: THREE.Vector3, scale = 1): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const k = scale;
  ps.push(part(G.lathe([[0.12 * k, 0], [0.116 * k, 0.016], [0.096 * k, 0.036], [0.084 * k, 0.04], [0.08 * k, 0.03]], 32, 40), P.cast));
  ps.push(part(G.lathe([[0.0, -0.01], [0.074 * k, -0.01], [0.08 * k, 0.025], [0.072 * k, 0.056], [0.044 * k, 0.08], [0.0, 0.084]], 24, 60), P.cast));
  ps.push(part(G.scatter(rivet(), Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return { p: new THREE.Vector3(Math.cos(a) * 0.104 * k, 0.018, Math.sin(a) * 0.104 * k), n: new THREE.Vector3(0, 1, 0), spin: a };
  })), P.cast));
  const a = new THREE.Vector3(0, 0.055, 0), b = a.clone().addScaledVector(dir, 0.14), c = b.clone().addScaledVector(dir, 0.15);
  ps.push(part(G.rod(a, b, 0.026, 16), P.cast));
  ps.push(part(G.rod(b, c, 0.017, 14), P.gun));
  ps.push(part(G.rod(c.clone().addScaledVector(dir, -0.012), c.clone().addScaledVector(dir, 0.004), 0.006, 8), P.void));
  for (let i = 0; i < 3; i++) {
    const q = b.clone().addScaledVector(dir, 0.028 + i * 0.038);
    ps.push(part(G.rod(q, q.clone().addScaledVector(dir, 0.01), 0.0175, 14), P.void));
  }
  return group(ps);
}

/** small vision port with its armoured cover; lying on y = 0 facing +Y, long axis X */
function visionPort(P: Pal, w = 0.16): THREE.Object3D {
  return group([
    part(rb(w + 0.05, 0.014, 0.09, 0.005), P.paint, { p: [0, 0.007, 0] }),
    part(rb(w, 0.026, 0.055, 0.007), P.paint, { p: [0, 0.024, 0] }),
    part(G.box(w * 0.7, 0.01, 0.01), P.void, { p: [0, 0.034, 0] }),
    part(G.cyl(0.01, 0.01, w * 0.6, 10), P.paint, { p: [0, 0.026, -0.036], r: [0, 0, 90] }),
  ]);
}

/** bolted access hatch lying on y = 0, hinges along -Z */
function accessHatch(P: Pal, w: number, l: number, handle = true): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(rb(w, 0.018, l, 0.007), P.paint, { p: [0, 0.009, 0] }));
  ps.push(part(rb(w - 0.05, 0.008, l - 0.05, 0.003), P.paint, { p: [0, 0.021, 0] }));
  for (const x of [-w / 2 + 0.09, w / 2 - 0.09]) {
    ps.push(part(G.cyl(0.015, 0.015, 0.08, 12), P.paint, { p: [x, 0.016, -l / 2 - 0.01], r: [0, 0, 90] }));
    ps.push(part(rb(0.06, 0.008, 0.1, 0.003), P.paint, { p: [x, 0.022, -l / 2 + 0.04] }));
  }
  if (handle) ps.push(part(G.tube([[-0.06, 0.018, l / 2 - 0.05], [-0.05, 0.048, l / 2 - 0.05], [0.05, 0.048, l / 2 - 0.05], [0.06, 0.018, l / 2 - 0.05]], 0.007, 8), P.paint));
  const rp: RP[] = [];
  const inset = 0.022;
  for (const [a, b] of [
    [[-w / 2 + inset, 0.018, -l / 2 + inset], [w / 2 - inset, 0.018, -l / 2 + inset]],
    [[-w / 2 + inset, 0.018, l / 2 - inset], [w / 2 - inset, 0.018, l / 2 - inset]],
    [[-w / 2 + inset, 0.018, -l / 2 + inset], [-w / 2 + inset, 0.018, l / 2 - inset]],
    [[w / 2 - inset, 0.018, -l / 2 + inset], [w / 2 - inset, 0.018, l / 2 - inset]],
  ] as [P3, P3][]) {
    G.along(a, b, Math.max(2, Math.round(V(a).distanceTo(V(b)) / 0.08) + 1)).forEach((p, i) => rp.push({ p, n: new THREE.Vector3(0, 1, 0), spin: i }));
  }
  ps.push(part(G.scatter(G.boltHead(0.016, 0.007), rp), P.paint));
  return group(ps);
}

/** late-pattern towing bracket: a plate on the nose wrapping over the ridge onto the glacis, with a hook */
function towBracket(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const nLow = nrm([[-xL, yB, H.zBellyF], [xL, yB, H.zBellyF], [xL, H.yNose, H.zNose]], [0, -0.3, 1]);
  const nGl = nrm([[-xL, H.yNose, H.zNose], [xL, H.yNose, H.zNose], [xL, yG, H.zFrontBot]], [0, 1, 0.3]);
  for (const sx of [-1, 1]) {
    const x = sx * 0.42;
    // plate on the lower nose
    const s = 0.62;
    const pL: P3 = [x, yB + (H.yNose - yB) * s, H.zBellyF + (H.zNose - H.zBellyF) * s];
    out.push(onPlate(part(rb(0.1, 0.022, 0.2, 0.006), P.cast, { p: [0, 0.011, 0] }), pL, [1, 0, 0], nLow));
    // L-shaped wrap onto the glacis
    const pG: P3 = [x, H.yNose + (yG - H.yNose) * 0.1, H.zNose + (H.zFrontBot - H.zNose) * 0.1];
    out.push(onPlate(part(rb(0.1, 0.02, 0.12, 0.006), P.cast, { p: [0, 0.01, 0] }), pG, [1, 0, 0], nGl));
    // hook: a thick rounded eye sticking out of the nose plate
    const hk = G.torus(0.045, 0.017, 8, 20, Math.PI * 1.3);
    hk.rotateY(Math.PI / 2);
    hk.rotateX(-0.6);
    out.push(onPlate(part(hk, P.cast, { p: [0, 0.05, 0.0] }), pL, [1, 0, 0], nLow));
    out.push(onPlate(group([
      part(rb(0.04, 0.05, 0.05, 0.008), P.cast, { p: [0, 0.035, 0.03] }),
    ]), pL, [1, 0, 0], nLow));
  }
  return out;
}

function front(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  out.push(onPlate(driverVisor(P), onFront(-0.4, 0.56), [1, 0, 0], nFront));
  // hull MG in the bay face, pointing forward and a little down
  const bayC: P3 = onFront((BAY.f0 + BAY.f1) / 2 + 0.02, 0.47, BAY.d);
  const dirLocal = new THREE.Vector3(0, nFront[2], nFront[1]).normalize();
  out.push(onPlate(ballMG(P, dirLocal), bayC, [1, 0, 0], nFront));
  // glacis access hatches (brakes / final drives)
  const nGl = nrm([[-xL, H.yNose, H.zNose], [xL, H.yNose, H.zNose], [xL, yG, H.zFrontBot]], [0, 1, 0.3]);
  for (const sx of [-1, 1]) {
    const t = 0.52;
    const c: P3 = [sx * 0.29, H.yNose + (yG - H.yNose) * t, H.zNose + (H.zFrontBot - H.zNose) * t];
    // local -Z (hinges) should face up the glacis (towards the superstructure)
    out.push(onPlate(accessHatch(P, 0.4, 0.3, false), c, [-1, 0, 0], nGl));
  }
  // side vision ports: driver (right) and MG gunner (left) on the upper side facets
  for (const sx of [-1, 1]) {
    const y = 1.27;
    out.push(onPlate(visionPort(P), [sx * sideX(y), y, 1.05], [0, 0, 1], sideN(sx, y)));
  }
  out.push(...towBracket(P));
  // rear tow hooks on the lower rear plate
  for (const sx of [-1, 1]) {
    const hk = G.torus(0.04, 0.015, 8, 18, Math.PI * 1.3);
    hk.rotateY(Math.PI / 2);
    out.push(onPlate(group([part(rb(0.09, 0.02, 0.14, 0.006), P.cast, { p: [0, 0.01, 0] }), part(hk, P.cast, { p: [0, 0.045, 0.02] })]), [sx * 0.42, 0.7, H.zLowRear - 0.01], [1, 0, 0], [0, 0, -1]));
  }
  return out;
}

/* ------------------------------------------------------------------ engine deck */

/** louvred grille lying on y = 0, l along Z */
function louvre(P: Pal, w: number, l: number, slats: number): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const fw = 0.035;
  const frame: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const a = rb(w + 2 * fw, 0.03, fw, 0.005);
    a.translate(0, 0.015, s * (l / 2 + fw / 2));
    frame.push(a);
    const b = rb(fw, 0.03, l, 0.005);
    b.translate(s * (w / 2 + fw / 2), 0.015, 0);
    frame.push(b);
  }
  ps.push(part(merge(frame), P.paint));
  ps.push(part(G.box(w, 0.004, l), P.void, { p: [0, 0.005, 0] }));
  const sg: THREE.BufferGeometry[] = [];
  const pitch = l / slats;
  for (let i = 0; i < slats; i++) {
    const s = G.box(w - 0.004, 0.005, pitch * 1.1);
    s.rotateX(-35 * D);
    s.translate(0, 0.017, -l / 2 + pitch * (i + 0.5));
    sg.push(s);
  }
  ps.push(part(merge(sg), P.sheet));
  const rp: RP[] = [];
  for (const s of [-1, 1]) {
    G.along([s * (w / 2 + fw / 2), 0.03, -l / 2 + 0.03], [s * (w / 2 + fw / 2), 0.03, l / 2 - 0.03], Math.round(l / 0.09) + 1).forEach((p, i) => rp.push({ p, n: new THREE.Vector3(0, 1, 0), spin: i }));
  }
  ps.push(part(G.scatter(rivet(), rp), P.paint));
  return group(ps);
}

function deck(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // engine access hatches (the engine sits right of centre) and the louvred intake on the left
  out.push(group([accessHatch(P, 0.62, 0.56)], { p: [-0.26, yR, -0.62] }));
  out.push(group([accessHatch(P, 0.62, 0.5)], { p: [-0.26, yR, -1.24] }));
  out.push(group([louvre(P, 0.3, 0.98, 13)], { p: [0.54, yR, -0.95] }));
  // filler cap and a small hatch behind the turret
  out.push(part(G.cyl(0.055, 0.06, 0.028, 20), P.cast, { p: [0.5, yR + 0.014, -0.3] }));
  out.push(part(rb(0.07, 0.016, 0.018, 0.004), P.cast, { p: [0.5, yR + 0.034, -0.3] }));
  // lifting eyes at the deck corners
  for (const sx of [-1, 1]) {
    for (const z of [zr(yR) + 0.1, zf(yR) - 0.12]) {
      out.push(part(G.torus(0.026, 0.008, 6, 16), P.cast, { p: [sx * 0.76, yR + 0.026, z], r: [0, 90, 0] }));
      out.push(part(rb(0.045, 0.014, 0.05, 0.004), P.cast, { p: [sx * 0.76, yR + 0.007, z] }));
    }
  }
  // right side: cooling-air outlet louvre on the upper side facet, ahead of the silencer
  {
    const y = 1.26;
    out.push(onPlate(louvre(P, 0.18, 0.46, 7), [-sideX(y), y, -0.62], [0, 0, 1], sideN(-1, y)));
  }
  // rear plate: inspection door and tail lamp
  const nRear = nrm([[-1, yR, zr(yR)], [1, yR, zr(yR)], [1, yG, zr(yG)]], [0, 0.4, -1]);
  const yc = (yR + yG) / 2 + 0.02;
  out.push(onPlate(accessHatch(P, 0.66, 0.3), [0.06, yc, zr(yc)], [-1, 0, 0], nRear));
  const lamp = group([
    part(rb(0.1, 0.045, 0.07, 0.01), P.paint, { p: [0, 0.022, 0] }),
    part(rb(0.07, 0.006, 0.04, 0.002), P.glass, { p: [0, 0.047, 0] }),
  ]);
  const yl = yG + 0.12;
  out.push(onPlate(lamp, [0.62, yl, zr(yl)], [1, 0, 0], nRear));
  return out;
}

export function hull(P: Pal): THREE.Group {
  const rv = new Rivets();
  const parts = [...armour(P, rv), ...front(P), ...deck(P)];
  parts.push(rv.mesh(P));
  return group(parts, { name: 'hull' });
}
