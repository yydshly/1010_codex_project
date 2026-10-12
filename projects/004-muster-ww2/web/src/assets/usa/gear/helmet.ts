/**
 * M1 steel helmet (US Army, 1944 production): one-piece Hadfield manganese-steel shell (1.1 mm)
 * with a flared brim all round, a crimped-on stainless-steel rim with its seam at the FRONT
 * (front-seam rims were made until late 1944), swivel chinstrap bails (adopted 1943) welded low on
 * the sides, and an OD cotton-web chinstrap (buckle on one half, hook on
 * the other; the T1 pull-out release of 1944 is not fitted). Flat OD No. 319 paint with ground cork for a matte, gritty finish.
 * Inside: the separate fibre/plastic LINER with its herringbone-twill suspension (six straps
 * gathered at the crown by a cord, adjustable headband, leather nape strap); the liner's own
 * brown leather chinstrap is worn over the front brim of the steel shell, as commonly done.
 *
 * Helmet-local frame: origin = centre of the head opening in the plane of the liner headband
 * (the "liner band" plane, y = 0), +Z = forward (brow), +Y = up, +X = wearer's left.
 * Shell: 0.238 m wide, 0.283 m long, 0.178 m from the rear rim to the crown.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { US } from './palette';
import { stitches, sheet, roundEnds, taperEnd, barBuckle, merge, smoothstep, lerp } from './parts';

// ---------------------------------------------------------------------------------------------
// Shell surface
// ---------------------------------------------------------------------------------------------

/** Plan of the dome at the brim break: half width (X), half length front / rear (Z), superellipse exponent. */
const A = 0.1055, BF = 0.1195, BR = 0.1245, PEXP = 2.2, ZC = -0.0015;
/** Outer crown height. */
const HC = 0.139;
/** Meridian superellipse exponents (> 2 give the M1's full shoulders, broad crown and near-vertical lower walls). */
const MEXP = 2.6, HEXP = 2.45;
/** Shell plate thickness. */
const T = 0.0011;

/** Brim-break height (where the wall turns out into the brim) at azimuth u (0 = front, +pi/2 = +X). */
const yBreak = (u: number) => -0.0205 + 0.005 * Math.cos(u) - 0.002 * Math.cos(2 * u);
/** Brim flare: horizontal width and drop at azimuth u. */
function brimWD(u: number): { w: number; d: number } {
  const c = Math.cos(u), c2 = c * c;
  return c >= 0 ? { w: 0.0135 + 0.0075 * c2, d: 0.011 - 0.0045 * c2 } : { w: 0.0135 + 0.0055 * c2, d: 0.011 + 0.0022 * c2 };
}

function planXZ(u: number): [number, number] {
  const s = Math.sin(u), c = Math.cos(u);
  const k = 2 / PEXP;
  const x = A * Math.sign(s) * Math.pow(Math.abs(s), k);
  const z = (c >= 0 ? BF : BR) * Math.sign(c) * Math.pow(Math.abs(c), k);
  return [x, z];
}

/** Outward unit normal of the plan outline at azimuth u (XZ). */
function planNormal(u: number): [number, number] {
  const e = 1e-4;
  const [x0, z0] = planXZ(u - e), [x1, z1] = planXZ(u + e);
  let nx = z1 - z0, nz = -(x1 - x0);
  const l = Math.hypot(nx, nz) || 1;
  nx /= l;
  nz /= l;
  const [px, pz] = planXZ(u);
  if (nx * px + nz * pz < 0) {
    nx = -nx;
    nz = -nz;
  }
  return [nx, nz];
}

/**
 * Outer shell point. v in [0, 1] = dome (crown -> brim break), v in [1, 2] = brim (break -> edge).
 */
function shellPoint(u: number, v: number, out = new THREE.Vector3()): THREE.Vector3 {
  const [px, pz] = planXZ(u);
  const yb = yBreak(u);
  if (v <= 1) {
    const th = v * (Math.PI / 2);
    const rho = Math.pow(Math.sin(th), 2 / MEXP);
    const h = Math.pow(Math.cos(th), 2 / HEXP);
    return out.set(rho * px, yb + (HC - yb) * h, rho * pz + ZC);
  }
  const s = Math.min(1, v - 1);
  const { w, d } = brimWD(u);
  const [nx, nz] = planNormal(u);
  const B = new THREE.Vector3(px, yb, pz + ZC);
  const E = new THREE.Vector3(px + nx * w, yb - d, pz + nz * w + ZC);
  const len = B.distanceTo(E);
  const D = E.clone().sub(B).normalize();
  const P1 = B.clone().add(new THREE.Vector3(0, -Math.min(0.0055, d * 0.55), 0));
  const P2 = E.clone().addScaledVector(D, -len * 0.42);
  // cubic Bezier: leaves the wall going straight down, straightens out along the brim
  const a = (1 - s) ** 3, b = 3 * (1 - s) ** 2 * s, c = 3 * (1 - s) * s * s, e = s ** 3;
  return out.set(B.x * a + P1.x * b + P2.x * c + E.x * e, B.y * a + P1.y * b + P2.y * c + E.y * e, B.z * a + P1.z * b + P2.z * c + E.z * e);
}

/** Outward unit normal of the outer shell surface. */
function shellNormal(u: number, v: number): THREE.Vector3 {
  const e = 1e-4;
  const vv = Math.min(2 - e, Math.max(e, v));
  const du = shellPoint(u + e, vv).sub(shellPoint(u - e, vv));
  const dv = shellPoint(u, vv + e).sub(shellPoint(u, vv - e));
  const n = du.cross(dv).normalize();
  const p = shellPoint(u, vv);
  if (v < 1e-3) return new THREE.Vector3(0, 1, 0);
  // outward: away from a point on the helmet axis (for the brim: upwards/outwards)
  const c = new THREE.Vector3(0, v > 1 ? p.y - 0.05 : 0.02, ZC);
  if (n.dot(p.clone().sub(c)) < 0) n.negate();
  return n;
}

/** Brim direction (unit tangent along the brim towards the edge) at the edge. */
function brimDir(u: number): THREE.Vector3 {
  return shellPoint(u, 2).sub(shellPoint(u, 1.985)).normalize();
}

const NU = 72;

function grid(rows: THREE.Vector3[][], normals?: THREE.Vector3[][]): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  const W = rows[0].length;
  rows.forEach((r, j) => r.forEach((p, i) => {
    pos.push(p.x, p.y, p.z);
    if (normals) {
      const n = normals[j][i];
      nrm.push(n.x, n.y, n.z);
    }
  }));
  for (let j = 0; j < rows.length - 1; j++)
    for (let i = 0; i < W; i++) {
      const i1 = (i + 1) % W;
      const a = j * W + i, b = j * W + i1, c = (j + 1) * W + i1, d = (j + 1) * W + i;
      idx.push(a, b, c, a, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (normals) g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  if (!normals) g.computeVertexNormals();
  return g;
}

/** Make the triangle winding agree with the stored normals (checked on a sample triangle). */
function fixWinding(g: THREE.BufferGeometry, tri = 0) {
  const idx = g.index!.array;
  const pa = g.attributes.position as THREE.BufferAttribute, na = g.attributes.normal as THREE.BufferAttribute;
  const i0 = tri * 3;
  const A0 = new THREE.Vector3().fromBufferAttribute(pa, idx[i0]);
  const B0 = new THREE.Vector3().fromBufferAttribute(pa, idx[i0 + 1]);
  const C0 = new THREE.Vector3().fromBufferAttribute(pa, idx[i0 + 2]);
  const fn = B0.sub(A0).cross(C0.sub(A0));
  const vn = new THREE.Vector3().fromBufferAttribute(na, idx[i0]);
  if (fn.dot(vn) < 0) G.flipWinding(g);
}

/** Dome rows: denser towards the break; brim rows. */
const V_OUT = [
  ...Array.from({ length: 20 }, (_, i) => 1 - Math.pow(1 - i / 20, 1.2)),
  1,
  1.07, 1.16, 1.27, 1.4, 1.55, 1.7, 1.85, 2,
];

function shellGeometry(): THREE.BufferGeometry {
  const us = Array.from({ length: NU }, (_, i) => (i / NU) * Math.PI * 2);
  const rows: THREE.Vector3[][] = [], nrm: THREE.Vector3[][] = [];
  for (const v of V_OUT) {
    rows.push(us.map((u) => shellPoint(u, Math.max(v, 0.002))));
    nrm.push(us.map((u) => shellNormal(u, Math.max(v, 0.002))));
  }
  // flat edge (hidden under the rolled rim) and the inner surface from the edge up past the liner edge
  const V_IN = [2, 1.75, 1.5, 1.25, 1.08, 1, 0.93, 0.84];
  for (const v of V_IN) {
    rows.push(us.map((u) => shellPoint(u, v).addScaledVector(shellNormal(u, v), -T)));
    nrm.push(us.map((u) => shellNormal(u, v).negate()));
  }
  const g = grid(rows, nrm);
  fixWinding(g, (8 * NU + 5) * 2);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Rolled stainless rim with the front seam
// ---------------------------------------------------------------------------------------------

function rimGeometry(): THREE.BufferGeometry {
  const NS = 84, NP = 8;
  const gap = 0.00045 / BF; // half gap of the front seam (rad)
  const ra = 0.0027, rb = 0.00175;
  const rows: THREE.Vector3[][] = [], nrm: THREE.Vector3[][] = [];
  const centres: THREE.Vector3[] = [];
  for (let i = 0; i <= NS; i++) {
    const u = gap + (i / NS) * (Math.PI * 2 - 2 * gap);
    const E = shellPoint(u, 2);
    const D = brimDir(u);
    const N = shellNormal(u, 1.99);
    const C = E.clone().addScaledVector(D, -ra * 0.72).addScaledVector(N, -T / 2);
    centres.push(C);
    const r: THREE.Vector3[] = [], n: THREE.Vector3[] = [];
    for (let k = 0; k < NP; k++) {
      const ph = (k / NP) * Math.PI * 2;
      r.push(C.clone().addScaledVector(D, ra * Math.cos(ph)).addScaledVector(N, rb * Math.sin(ph)));
      n.push(D.clone().multiplyScalar(Math.cos(ph) / ra).addScaledVector(N, Math.sin(ph) / rb).normalize());
    }
    rows.push(r);
    nrm.push(n);
  }
  const g = grid(rows, nrm);
  fixWinding(g, (42 * NP + 2) * 2);
  // flat butt ends at the seam
  const caps: THREE.BufferGeometry[] = [];
  for (const [ri, sgn] of [[0, -1], [NS, 1]] as [number, number][]) {
    const c = centres[ri];
    const pos: number[] = [];
    const ring = rows[ri];
    const tdir = (ri === 0 ? centres[1].clone().sub(centres[0]) : centres[NS].clone().sub(centres[NS - 1])).normalize();
    for (let k = 0; k < NP; k++) {
      const a = ring[k], b = ring[(k + 1) % NP];
      pos.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    cg.computeVertexNormals();
    const n0 = new THREE.Vector3().fromBufferAttribute(cg.attributes.normal as THREE.BufferAttribute, 0);
    if (n0.dot(tdir) * sgn < 0) {
      G.flipWinding(cg);
      cg.computeVertexNormals();
    }
    caps.push(cg);
  }
  return merge([g, ...caps]);
}

// ---------------------------------------------------------------------------------------------
// Liner
// ---------------------------------------------------------------------------------------------

const LINER_GAP = 0.0013, LINER_T = 0.0027;
/** Liner edge: a little above the brim break. */
const V_LINER_EDGE = 0.985;

function linerOuter(u: number, v: number) {
  return shellPoint(u, v).addScaledVector(shellNormal(u, v), -(T + LINER_GAP));
}
function linerInner(u: number, v: number) {
  return shellPoint(u, v).addScaledVector(shellNormal(u, v), -(T + LINER_GAP + LINER_T));
}

function linerGeometry(): THREE.BufferGeometry {
  const N = 56;
  const us = Array.from({ length: N }, (_, i) => (i / N) * Math.PI * 2);
  const rows: THREE.Vector3[][] = [];
  // inner surface crown -> edge
  const vIn = Array.from({ length: 13 }, (_, i) => V_LINER_EDGE * (1 - Math.pow(1 - i / 12, 1.3)));
  for (const v of vIn) rows.push(us.map((u) => linerInner(u, Math.max(v, 0.003))));
  // rounded, slightly beaded edge
  for (let k = 1; k <= 3; k++) {
    const a = (k / 4) * Math.PI;
    rows.push(
      us.map((u) => {
        const pi = linerInner(u, V_LINER_EDGE), po = linerOuter(u, V_LINER_EDGE);
        const c = pi.clone().add(po).multiplyScalar(0.5);
        const n = shellNormal(u, V_LINER_EDGE);
        const down = new THREE.Vector3(0, -1, 0);
        return c.addScaledVector(n, -Math.cos(a) * (LINER_T / 2 + 0.0004)).addScaledVector(down, Math.sin(a) * 0.0016);
      }),
    );
  }
  for (const v of [V_LINER_EDGE, 0.94, 0.86]) rows.push(us.map((u) => linerOuter(u, v)));
  const g = grid(rows);
  // inner face must face the head (towards the axis)
  const na = g.attributes.normal as THREE.BufferAttribute, pa = g.attributes.position as THREE.BufferAttribute;
  const i = 8 * N + 3;
  const p = new THREE.Vector3().fromBufferAttribute(pa, i), n = new THREE.Vector3().fromBufferAttribute(na, i);
  if (n.dot(new THREE.Vector3(-p.x, 0, -(p.z - ZC))) < 0) {
    G.flipWinding(g);
    g.computeVertexNormals();
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Fit data & rest pose
// ---------------------------------------------------------------------------------------------

/** Parameter v where the outer shell (dome) reaches height y at azimuth u. */
function vAtY(u: number, y: number): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (shellPoint(u, m).y > y) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/** Bail azimuths (slightly aft of the ear line) and height above the brim break. */
const BAIL_U = Math.PI / 2 + 0.07;
const BAIL_DY = 0.0125;

/** Fit data for the infantry modules (helmet-local metres). */
export const M1_FIT = {
  /** Rim edge heights: front (visor), sides, rear (lowest). */
  frontRimY: -0.0240,
  sideRimY: -0.0296,
  rearRimY: -0.0409,
  /** Headband ring (liner suspension) at y = 0: half width (X) and half length (Z), band width. */
  headband: { y: 0.002, a: 0.081, b: 0.1005, width: 0.022 },
  /** Underside of the suspension at the crown (the head crown sits just below it). */
  suspensionCrownY: 0.117,
  /** Liner inner crown (bare liner). */
  linerCrownY: HC - T - LINER_GAP - LINER_T,
  /** Suggested head placement: brow line at y = -0.008, head crown at ~0.112. */
  browY: -0.008,
  /** Chinstrap bail pivots (wearer's left +X, right -X); filled in below. */
  bails: [] as THREE.Vector3[],
};

/**
 * Resting pose on a flat surface (helmet standing on its rim): tilt about X (radians, positive =
 * nose up) and the height of the supporting plane in the tilted frame.
 */
export function m1RestPose(): { tilt: number; floorY: number } {
  const rim: THREE.Vector3[] = [];
  for (let i = 0; i < 240; i++) {
    const u = (i / 240) * Math.PI * 2;
    const E = shellPoint(u, 2);
    const N = shellNormal(u, 1.99);
    rim.push(E.addScaledVector(N, -0.0018));
  }
  const com = new THREE.Vector3(0, 0.052, ZC - 0.004);
  let best = { tilt: 0, floorY: 0, e: Infinity };
  for (let a = -0.3; a <= 0.3; a += 0.0015) {
    const ca = Math.cos(a), sa = Math.sin(a);
    let mn = Infinity;
    for (const p of rim) mn = Math.min(mn, p.y * ca + p.z * sa);
    const e = com.y * ca + com.z * sa - mn;
    if (e < best.e) best = { tilt: a, floorY: mn, e };
  }
  return { tilt: best.tilt, floorY: best.floorY };
}

// ---------------------------------------------------------------------------------------------
// Chinstrap
// ---------------------------------------------------------------------------------------------

export type ChinstrapMode = 'open' | 'none' | 'laid';

export interface M1HelmetOptions {
  /**
   * 'open' - both chinstrap halves hang loose from the bails over the brim (worn, strap undone);
   * 'none' - no chinstrap (bails only; the infantry author may draw a worn strap with
   *          `buildM1Chinstrap`);
   * 'laid' - display pose: the helmet resting on its rim (`m1RestPose`), the halves run over the
   *          brim edge and lie flat on the ground in front of the visor.
   */
  chinstrap?: ChinstrapMode;
  /** Liner leather chinstrap worn over the front brim (default true). */
  linerStrap?: boolean;
}

const CH_W = 0.019, CH_T = 0.0016;

/** Chinstrap buckle (blackened stamped frame with centre bar), facing +Z, centred. */
function chinBuckle(): THREE.BufferGeometry {
  return barBuckle(0.024, 0.02, 0.0026, 0.0013, true);
}

/**
 * Flat stamped hook at the free end of the short chinstrap half: the strap is sewn round the hook's
 * bar, the plate ends in a lip bent back over itself (engages the buckle on the long half).
 * Strap enters from -Y; faces +Z, base on z = 0.
 */
function chinHook(): THREE.BufferGeometry {
  const w = 0.0068;
  const path: THREE.Vector3[] = [
    new THREE.Vector3(0, -0.007, 0.0006),
    new THREE.Vector3(0, 0.002, 0.0006),
    new THREE.Vector3(0, 0.0075, 0.0007),
    new THREE.Vector3(0, 0.0098, 0.0019),
    new THREE.Vector3(0, 0.0086, 0.0034),
    new THREE.Vector3(0, 0.0052, 0.0036),
  ];
  const nrm = [
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0.3, 1),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0.3, -1),
    new THREE.Vector3(0, 0, -1),
  ];
  const plate = sheet(path, nrm, roundEnds(w, 0.002, 0.003), 0.0011, { across: 3, samples: 24 });
  const bar = G.rbox(0.0175, 0.0026, 0.0019, 0.0007, 1);
  bar.translate(0, -0.0045, 0.0017);
  return merge([plate, bar]);
}

/** Frame at arc length s along a polyline strap path: point, tangent, face normal. */
function frameAt(pts: THREE.Vector3[], nrm: THREE.Vector3[], s: number) {
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const cn = new THREE.CatmullRomCurve3(nrm.map((n) => n.clone()), false, 'centripetal');
  const L = c.getLength();
  const t = Math.min(1, Math.max(0, s / L));
  const p = c.getPointAt(t), tg = c.getTangentAt(t).normalize();
  const n = cn.getPointAt(t).normalize();
  const N = n.sub(tg.clone().multiplyScalar(n.dot(tg))).normalize();
  return { p, tg, N, L };
}

/** Place a +Z-facing hardware geometry on a strap: its +Y along the strap tangent. */
function onStrap(g: THREE.BufferGeometry, f: { p: THREE.Vector3; tg: THREE.Vector3; N: THREE.Vector3 }, lift = 0): THREE.BufferGeometry {
  const X = f.tg.clone().cross(f.N).normalize();
  const m = new THREE.Matrix4().makeBasis(X, f.tg, f.N).setPosition(f.p.clone().addScaledVector(f.N, lift));
  return g.clone().applyMatrix4(m);
}

/**
 * A worn chinstrap along a caller-supplied path (helmet-local), e.g. from the left bail, under the
 * chin, to the right bail. `outward` = strap face direction at each point (away from the skin).
 * The buckle sits at `buckleAt` (0..1 along the path).
 */
export function buildM1Chinstrap(path: THREE.Vector3[], outward: THREE.Vector3[], buckleAt = 0.62): THREE.Group {
  const web = US.web('od7');
  const g = G.strap(path, CH_W, CH_T, outward, { samples: Math.max(40, path.length * 10) });
  const f = frameAt(path, outward, 0);
  const L = f.L;
  const fb = frameAt(path, outward, L * buckleAt);
  return group([part(g, web), part(onStrap(chinBuckle(), fb, CH_T / 2), US.blackMetal())]);
}

// ---------------------------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------------------------

export function buildM1Helmet(opts: M1HelmetOptions = {}): GearPiece {
  const mode = opts.chinstrap ?? 'open';
  const paint = US.helmetPaint();
  const black = US.blackMetal();
  const web = US.web('od7');
  const thread = US.thread();
  const hbt = US.hbt();
  const leather = US.leather();
  const parts: THREE.Object3D[] = [];

  parts.push(part(shellGeometry(), paint, { name: 'shell' }));
  parts.push(part(rimGeometry(), US.rimPaint(), { name: 'rim' }));
  parts.push(part(linerGeometry(), US.linerPaint(), { name: 'liner' }));

  // --- liner suspension: headband, six HBT straps gathered at the crown by a cord, nape strap
  const hb = M1_FIT.headband;
  const bandPts: THREE.Vector3[] = [], bandN: THREE.Vector3[] = [];
  for (let k = 0; k < 64; k++) {
    const u = (k / 64) * Math.PI * 2;
    const v = vAtY(u, hb.y);
    const li = linerInner(u, v);
    const sideness = Math.abs(Math.sin(u));
    const off = 0.0105 + 0.0065 * sideness * sideness;
    const n = shellNormal(u, v);
    n.y = 0;
    n.normalize();
    bandPts.push(li.clone().addScaledVector(n, -off));
    bandN.push(n);
  }
  parts.push(part(G.strap(bandPts, hb.width, 0.0016, bandN, { closed: true, smooth: false }), hbt));
  // headband stitching rows (top and bottom edge)
  for (const dy of [-hb.width / 2 + 0.0022]) {
    const sp = bandPts.map((p, i) => p.clone().addScaledVector(bandN[i], -0.0009).add(new THREE.Vector3(0, dy, 0)));
    parts.push(part(stitches([...sp, sp[0]], { len: 0.003, gap: 0.0022, r: 0.00042 }), thread));
  }

  const crownR = 0.03;
  const crownY = M1_FIT.suspensionCrownY + 0.002;
  const tips: THREE.Vector3[] = [];
  for (let k = 0; k < 6; k++) {
    const u = (k / 6) * Math.PI * 2 + Math.PI / 6;
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    const [px, pz] = planXZ(u);
    const dirXZ = new THREE.Vector2(px, pz).normalize();
    for (let i = 0; i <= 10; i++) {
      const f = i / 10;
      if (f < 0.35) {
        // lower part lies against the liner, from the rivet down near the edge up to the headband
        const v = lerp(0.9, vAtY(u, hb.y + 0.018), f / 0.35);
        const li = linerInner(u, v);
        const n = shellNormal(u, v);
        pts.push(li.addScaledVector(n, -0.0012 - 0.004 * (f / 0.35)));
        nrm.push(n.clone().negate());
      } else {
        // upper part stands off the liner and runs to the crown ring
        const g = (f - 0.35) / 0.65;
        const v0 = vAtY(u, hb.y + 0.018);
        const v = lerp(v0, 0.2, g);
        const li = linerInner(u, v);
        const n = shellNormal(u, v);
        const p = li.addScaledVector(n, -(0.0052 + 0.013 * smoothstep(0, 1, g)));
        // pull the upper end in to the crown ring
        const ring = new THREE.Vector3(dirXZ.x * crownR, crownY, dirXZ.y * crownR + ZC);
        p.lerp(ring, smoothstep(0.55, 1, g));
        pts.push(p);
        nrm.push(n.clone().negate());
      }
    }
    tips.push(pts[pts.length - 1].clone());
    parts.push(part(sheet(pts, nrm, roundEnds(0.008, 0.004, 0.004), 0.0013, { across: 2, samples: 14 }), hbt));
    // rivet (A-washer) holding the strap to the liner
    const rv = linerInner(u, 0.915).addScaledVector(shellNormal(u, 0.915), -0.0015);
    parts.push(part(G.cyl(0.0034, 0.0034, 0.001, 12).rotateX(Math.PI / 2).lookAt(shellNormal(u, 0.915)).translate(rv.x, rv.y, rv.z), black));
  }
  // crown cord through the strap ends, with a small knot at the back
  const cord: THREE.Vector3[] = [];
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    cord.push(new THREE.Vector3(Math.sin(a) * crownR * 0.93, crownY - 0.0022 + 0.0008 * Math.sin(a * 6), Math.cos(a) * crownR * 0.93 + ZC));
  }
  parts.push(part(G.tube(cord, 0.0011, 5, 48, true), hbt));
  parts.push(part(new THREE.SphereGeometry(0.0028, 8, 6).scale(1.2, 0.8, 1).translate(0, crownY - 0.0035, -crownR * 0.93 + ZC), hbt));

  // nape strap (leather, rear, below the headband) on two HBT tabs
  {
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    const yN = -0.017;
    for (let i = 0; i <= 8; i++) {
      const u = Math.PI + ((i / 8) * 2 - 1) * 0.44;
      const v = vAtY(u, yN);
      const n = shellNormal(u, v);
      n.y = 0;
      n.normalize();
      pts.push(linerInner(u, v).addScaledVector(n, -0.016));
      nrm.push(n.clone().negate());
    }
    parts.push(part(sheet(pts, nrm, roundEnds(0.0105, 0.009, 0.009), 0.0028, { across: 3, samples: 32, bulge: -0.0008 }), leather));
    for (const s of [-1, 1]) {
      const u = Math.PI + s * 0.4;
      const a = linerInner(u, vAtY(u, yN + 0.004)).addScaledVector(shellNormal(u, 0.9), -0.017);
      const b = linerInner(u, vAtY(u, hb.y - 0.006)).addScaledVector(shellNormal(u, 0.9), -0.011);
      parts.push(part(sheet([a, b], [shellNormal(u, 0.9).negate(), shellNormal(u, 0.9).negate()], 0.0065, 0.0013, { across: 2, samples: 4 }), hbt));
    }
  }

  // --- liner leather chinstrap worn over the front brim of the shell
  if (opts.linerStrap !== false) {
    const lt = 0.0019, lw = 0.0158;
    const uSide = 1.2;
    /** One side, from the liner attachment (outside the liner, at its lower edge) to the front. */
    const sideSeq = (s: number): [THREE.Vector3, THREE.Vector3][] => {
      const seq: [THREE.Vector3, THREE.Vector3][] = [];
      const u = s * uSide;
      const nL = shellNormal(u, V_LINER_EDGE);
      // attachment just below the liner edge, in the flare opening
      seq.push([linerOuter(u, V_LINER_EDGE).addScaledVector(nL, lt / 2 + 0.0002).add(new THREE.Vector3(0, -0.004, 0)), nL.clone().negate()]);
      // under the brim
      for (const vv of [1.25, 1.6]) {
        const n = shellNormal(u, vv);
        seq.push([shellPoint(u, vv).addScaledVector(n, -T - lt / 2 - 0.0003), n.clone().negate()]);
      }
      // round the rolled rim bead: underside -> edge -> top
      const E = shellPoint(u, 2), D = brimDir(u), N = shellNormal(u, 1.99);
      const Cc = E.clone().addScaledVector(D, -0.0027 * 0.72).addScaledVector(N, -T / 2);
      for (let k = 0; k <= 4; k++) {
        const ps = -Math.PI / 2 + (k / 4) * Math.PI;
        const q = Cc.clone()
          .addScaledVector(D, (0.0027 + lt / 2 + 0.0003) * Math.cos(ps))
          .addScaledVector(N, (0.00175 + lt / 2 + 0.0003) * Math.sin(ps));
        seq.push([q, D.clone().multiplyScalar(Math.cos(ps)).addScaledVector(N, Math.sin(ps)).normalize()]);
      }
      // over the top of the brim, running forward and up the flare towards the visor centre
      for (const f of [0.84, 0.64, 0.44, 0.22]) {
        const uu = u * f;
        const vv = lerp(1.3, 1.72, f);
        const n = shellNormal(uu, vv);
        seq.push([shellPoint(uu, vv).addScaledVector(n, lt / 2 + 0.0003), n]);
      }
      return seq;
    };
    const seq = [...sideSeq(1), [shellPoint(0, 1.3).addScaledVector(shellNormal(0, 1.3), lt / 2 + 0.0003), shellNormal(0, 1.3)] as [THREE.Vector3, THREE.Vector3], ...sideSeq(-1).reverse()];
    const pts = seq.map((q) => q[0]), nrm = seq.map((q) => q[1]);
    parts.push(part(sheet(pts, nrm, lw / 2, lt, { across: 2, samples: 76 }), US.leatherDark()));
    // small adjusting buckle on the strap at the front-left
    const L = frameAt(pts, nrm, 0).L;
    parts.push(part(onStrap(barBuckle(0.02, 0.016, 0.0022, 0.0012, true), frameAt(pts, nrm, L * 0.37), lt / 2), black));
  }

  // --- swivel bails: keeper welded to the shell + rectangular wire loop
  const bails: THREE.Vector3[] = [];
  const bailFrames: { p: THREE.Vector3; n: THREE.Vector3; side: number; bottom: THREE.Vector3; down: THREE.Vector3; t: THREE.Vector3 }[] = [];
  for (const side of [1, -1]) {
    const u = side * BAIL_U;
    const v = vAtY(u, yBreak(u) + BAIL_DY);
    const p = shellPoint(u, v);
    const n = shellNormal(u, v);
    const t = new THREE.Vector3(0, 1, 0).cross(n).normalize(); // horizontal tangent
    // keeper: a small stamped strap bent over the bail's top bar, two welded feet
    const kpts = [
      p.clone().addScaledVector(n, 0.0005).add(new THREE.Vector3(0, 0.0055, 0)),
      p.clone().addScaledVector(n, 0.0022).add(new THREE.Vector3(0, 0.0012, 0)),
      p.clone().addScaledVector(n, 0.0034).add(new THREE.Vector3(0, -0.0012, 0)),
      p.clone().addScaledVector(n, 0.0022).add(new THREE.Vector3(0, -0.0036, 0)),
      p.clone().addScaledVector(n, 0.0005).add(new THREE.Vector3(0, -0.0058, 0)),
    ];
    parts.push(part(sheet(kpts, [n, n, n, n, n], 0.0052, 0.0011, { across: 2, samples: 16 }), paint));
    // weld beads at the keeper feet
    for (const dy of [0.0062, -0.0064]) {
      const c = p.clone().addScaledVector(n, 0.0003).add(new THREE.Vector3(0, dy, 0));
      parts.push(part(G.weld([c.clone().addScaledVector(t, -0.0048), c.clone().addScaledVector(t, 0.0048)], 0.0007), paint));
    }
    // bail loop hanging down against the brim flare, tilted outwards
    const pivot = p.clone().addScaledVector(n, 0.0021).add(new THREE.Vector3(0, -0.0006, 0));
    bails.push(pivot.clone());
    const down = new THREE.Vector3(0, -1, 0).addScaledVector(n, 0.42).normalize();
    const out = t.clone().cross(down).normalize();
    const w = 0.0118, h = 0.0165, r = 0.0011;
    const loop = [
      pivot.clone().addScaledVector(t, -w),
      pivot.clone().addScaledVector(t, -w).addScaledVector(down, h * 0.5),
      pivot.clone().addScaledVector(t, -w * 0.9).addScaledVector(down, h),
      pivot.clone().addScaledVector(t, w * 0.9).addScaledVector(down, h),
      pivot.clone().addScaledVector(t, w).addScaledVector(down, h * 0.5),
      pivot.clone().addScaledVector(t, w),
    ];
    const bl = G.tube([...loop, loop[0]], r, 5, 40, false);
    parts.push(part(bl, black));
    const bottom = pivot.clone().addScaledVector(down, h);
    bailFrames.push({ p: pivot, n: out, side, bottom, down, t });
  }
  M1_FIT.bails = bails;

  // --- chinstrap halves
  if (mode !== 'none') {
    const rest = m1RestPose();
    const cosT = Math.cos(rest.tilt), sinT = Math.sin(rest.tilt);
    // rested frame <-> helmet frame (rotation about X by -tilt: y' = y cos + z sin)
    const toRest = (p: THREE.Vector3) => new THREE.Vector3(p.x, p.y * cosT + p.z * sinT, -p.y * sinT + p.z * cosT);
    const fromRest = (p: THREE.Vector3) => new THREE.Vector3(p.x, p.y * cosT - p.z * sinT, p.y * sinT + p.z * cosT);
    const LD = 0.021; // doubled (sewn) length below the bail
    for (const bf of bailFrames) {
      const side = bf.side;
      const u = side * BAIL_U;
      const long = side > 0;
      // route = centre line of the strap: bail bottom bar -> down the brim flare -> over the rim bead
      const R: THREE.Vector3[] = [], RN: THREE.Vector3[] = [];
      R.push(bf.bottom.clone());
      RN.push(bf.n.clone().addScaledVector(bf.down, -0.3).normalize());
      for (const vv of [1.42, 1.7, 1.9]) {
        const n = shellNormal(u, vv);
        R.push(shellPoint(u, vv).addScaledVector(n, CH_T * 0.8 + 0.0005));
        RN.push(n);
      }
      const E = shellPoint(u, 2), D = brimDir(u), N = shellNormal(u, 1.99);
      const Cc = E.clone().addScaledVector(D, -0.0027 * 0.72).addScaledVector(N, -T / 2);
      R.push(Cc.clone().addScaledVector(D, 0.0027 * 0.55).addScaledVector(N, 0.00175 + CH_T / 2 + 0.0004));
      RN.push(N.clone().addScaledVector(D, 0.4).normalize());
      R.push(Cc.clone().addScaledVector(D, 0.0027 + CH_T / 2 + 0.0005).addScaledVector(N, 0.0004));
      RN.push(D.clone().addScaledVector(N, 0.6).normalize());
      const outH = D.clone().setY(0).normalize();
      if (mode === 'open') {
        const e0 = R[R.length - 1];
        const hang = long ? 0.13 : 0.08;
        R.push(e0.clone().add(new THREE.Vector3(0, -0.009, 0)).addScaledVector(outH, 0.0022));
        RN.push(outH.clone().add(new THREE.Vector3(0, 0.3, 0)).normalize());
        R.push(e0.clone().add(new THREE.Vector3(0, -0.03, 0)).addScaledVector(outH, 0.0012));
        RN.push(outH.clone());
        R.push(e0.clone().add(new THREE.Vector3(0, -hang, 0)).addScaledVector(outH, -0.003));
        RN.push(outH.clone());
      } else {
        // laid: arcs down from the rim edge to the floor, then runs forward along the floor
        const e0r = toRest(R[R.length - 1]);
        const fy = rest.floorY + CH_T / 2 + 0.0002;
        const oR = toRest(outH.clone().add(E)).sub(toRest(E)).setY(0).normalize();
        const seqR: [THREE.Vector3, THREE.Vector3][] = [
          [new THREE.Vector3(e0r.x + oR.x * 0.0065, e0r.y - (e0r.y - fy) * 0.45, e0r.z + oR.z * 0.0065 + 0.002), oR.clone().add(new THREE.Vector3(0, 0.45, 0)).normalize()],
          [new THREE.Vector3(e0r.x + oR.x * 0.015, fy + 0.0012, e0r.z + oR.z * 0.015 + 0.006), new THREE.Vector3(0, 1, 0).addScaledVector(oR, 0.25).normalize()],
          [new THREE.Vector3(e0r.x + oR.x * 0.022 - side * 0.001, fy, e0r.z + 0.03), new THREE.Vector3(0, 1, 0)],
        ];
        const fwd = long
          ? [[side * 0.106, 0.1], [side * 0.087, 0.152], [side * 0.05, 0.188], [side * 0.014, 0.202]]
          : [[side * 0.1, 0.097], [side * 0.078, 0.136], [side * 0.055, 0.157]];
        for (const [x, z] of fwd) seqR.push([new THREE.Vector3(x, fy, z), new THREE.Vector3(0, 1, 0)]);
        for (const [p, n] of seqR) {
          R.push(fromRest(p));
          RN.push(fromRest(n).normalize());
        }
      }
      // resample the route, then build the strap: return layer -> wrap round the bail bar -> strap
      const rc = new THREE.CatmullRomCurve3(R, false, 'centripetal');
      const rn = new THREE.CatmullRomCurve3(RN, false, 'centripetal');
      const RL = rc.getLength();
      const at = (s: number) => {
        const t = Math.min(1, Math.max(0, s / RL));
        const p = rc.getPointAt(t), tg = rc.getTangentAt(t).normalize();
        const n = rn.getPoint(rc.getUtoTmapping(t, 0)).normalize();
        const Nn = n.sub(tg.clone().multiplyScalar(n.dot(tg))).normalize();
        return { p, tg, N: Nn };
      };
      const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
      const lay = CH_T / 2 + 0.00012;
      for (const sv of [LD, LD * 0.6, LD * 0.3, 0.004]) {
        const f = at(sv);
        pts.push(f.p.clone().addScaledVector(f.N, lay));
        nrm.push(f.N.clone());
      }
      const f0 = at(0);
      const rw = lay + 0.0011;
      for (let k = 0; k <= 6; k++) {
        const aa = (k / 6) * Math.PI;
        const dir = f0.N.clone().multiplyScalar(Math.cos(aa)).addScaledVector(f0.tg, -Math.sin(aa));
        pts.push(f0.p.clone().addScaledVector(dir, rw));
        nrm.push(dir.clone());
      }
      const nS = Math.max(12, Math.round(RL / 0.006));
      for (let i = 1; i <= nS; i++) {
        const sv = 0.004 + ((RL - 0.004) * i) / nS;
        const f = at(sv);
        const k = 1 - smoothstep(LD, LD + 0.01, sv);
        pts.push(f.p.clone().addScaledVector(f.N, -lay * k));
        nrm.push(f.N.clone());
      }
      parts.push(part(sheet(pts, nrm, long ? taperEnd(CH_W / 2, 0.006, 0.8) : CH_W / 2, CH_T, { across: 2, samples: Math.round(pts.length * 1.5) }), web));
      // stitch row across the doubled strap near its end
      const fs = at(LD - 0.004);
      const sc = fs.p.clone().addScaledVector(fs.N, lay + CH_T / 2 + 0.0002);
      const wdir = fs.tg.clone().cross(fs.N).normalize();
      parts.push(part(stitches([sc.clone().addScaledVector(wdir, -0.0075), sc.clone().addScaledVector(wdir, 0.0075)], { len: 0.0024, gap: 0.0014, r: 0.00045 }), thread));
      // hardware
      const L = frameAt(pts, nrm, 0).L;
      if (long) {
        // adjustment buckle near the end, short doubled tail through it
        const fbk = frameAt(pts, nrm, L - 0.042);
        parts.push(part(onStrap(chinBuckle(), fbk, CH_T / 2), black));
        const ft = frameAt(pts, nrm, L - 0.03);
        const tail = sheet(
          [ft.p.clone().addScaledVector(ft.N, CH_T + 0.0002), ft.p.clone().addScaledVector(ft.tg, 0.018).addScaledVector(ft.N, CH_T + 0.0002)],
          [ft.N, ft.N],
          roundEnds(CH_W / 2 - 0.0006, 0, 0.004),
          CH_T,
          { across: 2, samples: 6 },
        );
        parts.push(part(tail, web));
      } else {
        // flat hook at the free end
        const fe = frameAt(pts, nrm, L - 0.004);
        parts.push(part(onStrap(chinHook(), fe, CH_T / 2 - 0.0004), black));
      }
    }
  }

  const obj = group(parts);
  obj.name = 'us-m1-helmet';
  return {
    id: 'us-m1-helmet',
    name: 'M1 steel helmet',
    object: obj,
    mount: 'head',
    size: { w: 0.238, h: 0.18, d: 0.283 },
  };
}
