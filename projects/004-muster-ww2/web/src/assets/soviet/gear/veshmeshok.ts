/**
 * Veshchevoi meshok ("veshmeshok", "sidor"), Red Army pattern 1941: a plain canvas sack closed by
 * a drawstring at the neck. Both ends of the single shoulder strap are sewn to the bottom corners;
 * the middle of the strap is tied round the gathered neck in a lark's-head knot, so that the two
 * halves form the shoulder straps. Packed size about 38 x 35 cm, 15-16 cm thick.
 *
 * Gear-local frame (mount 'back'): +Z away from the wearer's back, +Y up, the back face of the bag
 * against the body at z ~ 0, ORIGIN = top centre of the back face at the height of the neck knot.
 * strapAnchors (gear-local; with the usual back mount - gear frame turned 180 deg about Y - gear
 * +X is the wearer's RIGHT):
 *   [0] strap leg leaving the neck knot on the +X side (towards that shoulder),
 *   [1] strap leg on the -X side,
 *   [2] strap end at the bottom +X corner (the strap runs forward under that arm),
 *   [3] strap end at the bottom -X corner.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { SU } from './palette';
import { stitches } from './helpers';
import { sweepSurface, superXZ, sstep, snoise, mergeFlat } from './soft';

/** Packed bag dimensions (m). */
export const VESHMESHOK = { w: 0.37, d: 0.15, knotY: 0.321, tieY: 0.337, top: 0.378 };

interface Ring {
  y: number;
  a: number;
  b: number;
  e: number;
  amp: number;
}

const A = 0.183, BH = 0.07, RB = 0.045, RN = 0.02, ZC = 0.076;
const Y_BODY = 0.2, Y_NECK = 0.308;

function ringAt(v: number): Ring {
  if (v <= 0.05) {
    const t = v / 0.05;
    return { y: 0.004 * (1 - t * t), a: Math.max(1e-4, t * (A - RB)), b: Math.max(1e-4, t * (BH - RB)), e: 2.3, amp: 0 };
  }
  if (v <= 0.17) {
    const f = ((v - 0.05) / 0.12) * (Math.PI / 2);
    return { y: RB * (1 - Math.cos(f)), a: A - RB + RB * Math.sin(f), b: BH - RB + RB * Math.sin(f), e: 2.3, amp: 0 };
  }
  if (v <= 0.45) {
    // packed body: fullest in the lower third
    const t = (v - 0.17) / 0.28;
    const belly = Math.sin(Math.PI * (0.3 + 0.7 * t));
    return { y: RB + (Y_BODY - RB) * t, a: A + 0.006 * belly - 0.01 * t * t, b: BH + 0.01 * belly, e: 2.3, amp: 0.006 * sstep(0.3, 1, t) };
  }
  if (v <= 0.84) {
    // top of the sack drawn in to the neck: a sloping dome of deep radiating folds
    const t = (v - 0.45) / 0.39;
    const c = Math.cos((t * Math.PI) / 2);
    return {
      y: Y_BODY + (Y_NECK - Y_BODY) * Math.sin((t * Math.PI) / 2),
      a: RN + (A - 0.01 - RN) * Math.pow(c, 1.15),
      b: RN + (BH - RN) * Math.pow(c, 1.3),
      e: 2.3 - 0.3 * t,
      amp: 0.006 + 0.017 * sstep(0, 0.7, t) * (1 - 0.35 * sstep(0.8, 1, t)),
    };
  }
  if (v <= 0.9) {
    const t = (v - 0.84) / 0.06;
    return { y: Y_NECK + (VESHMESHOK.tieY + 0.007 - Y_NECK) * t, a: RN, b: RN, e: 2, amp: 0.0045 };
  }
  // the sack's mouth above the drawstring: a crumpled ruffle of canvas, open at the top
  const t = (v - 0.9) / 0.1;
  const r = RN + 0.017 * Math.pow(Math.sin((t * Math.PI) / 2), 0.8);
  return { y: VESHMESHOK.tieY + 0.007 + (VESHMESHOK.top - VESHMESHOK.tieY - 0.007) * t, a: r, b: r, e: 2, amp: 0.0065 + 0.004 * t };
}

const NP = 9;
function folds(th: number, v: number, n = NP): number {
  const ph = n * th + 1.1 * Math.sin(2 * th + 0.7) + 0.8 * snoise(Math.cos(th) * 1.5, Math.sin(th) * 1.5, v * 4, 41);
  const depth = 0.5 + 0.7 * (0.5 + 0.5 * snoise(Math.cos(th) * 1.3, Math.sin(th) * 1.3, 2.2 + v * 2, 43));
  // sharp crests, soft troughs (canvas folds)
  const c = Math.cos(ph);
  return (c > 0 ? Math.pow(c, 0.6) : -Math.pow(-c, 1.8) * 0.5) * depth;
}

function bagPoint(u: number, v: number): THREE.Vector3 {
  const th = u * Math.PI * 2;
  const r = ringAt(v);
  // flatter back (against the wearer), fuller front
  const back = Math.sin(th) < 0;
  const [x, z0] = superXZ(th, r.a, back ? r.b * 0.9 : r.b, back ? r.e + 1.3 : r.e);
  const rad = Math.hypot(x, z0) || 1e-6;
  const body = sstep(0.1, 0.2, v) * (1 - sstep(0.6, 0.8, v));
  let dr = body * (0.006 * snoise(x * 9 + 1, r.y * 9, z0 * 9, 5) + 0.002 * snoise(x * 26, r.y * 26, z0 * 26, 7));
  dr += body * 0.0008 * snoise(x * 70, r.y * 70, z0 * 70, 9);
  const tuft = v > 0.9 ? (v - 0.9) / 0.1 : 0;
  dr += r.amp * folds(th, v, tuft > 0 ? 11 : NP) - r.amp * 0.2;
  const k = (rad + dr) / rad;
  // the ruffle leans and its edge is ragged
  const wob = tuft * (0.006 * snoise(Math.cos(th) * 2.2, Math.sin(th) * 2.2, 7.7, 51) + 0.004 * Math.cos(th - 0.8));
  return new THREE.Vector3(x * k + tuft * tuft * 0.005, r.y + wob, ZC + z0 * k - tuft * tuft * 0.003);
}

function vRows(): number[] {
  const vs: number[] = [];
  const add = (a: number, b: number, n: number) => {
    for (let i = 0; i < n; i++) vs.push(a + ((b - a) * i) / n);
  };
  add(0, 0.05, 3);
  add(0.05, 0.17, 6);
  add(0.17, 0.45, 10);
  add(0.45, 0.84, 20);
  add(0.84, 0.9, 4);
  add(0.9, 1, 8);
  vs.push(1);
  return vs;
}

export function buildVeshmeshok(): GearPiece {
  const canvas = SU.canvas(), strapMat = SU.canvasStrap(), cord = SU.cord(), thread = SU.thread();
  const vs = vRows();
  const V0 = VESHMESHOK;
  const bag = sweepSurface((u, v) => bagPoint(u, v), 84, 0, {
    vs,
    poleStart: new THREE.Vector3(0, 0.0045, ZC),
    outward: (p) => new THREE.Vector3(p.x, 0, p.z - ZC),
  });
  // inside of the ruffle (cloth thickness), its rim, and the gathered cloth closing the mouth
  const T = 0.0016;
  const inset = (u: number, v: number, d: number) => {
    const p = bagPoint(u, v);
    const q = new THREE.Vector3(p.x, 0, p.z - ZC);
    const l = q.length() || 1;
    return new THREE.Vector3(p.x - (q.x / l) * d, p.y, p.z - (q.z / l) * d);
  };
  const vIn = vs.filter((v) => v >= 0.9).reverse();
  const innerG = sweepSurface((u, v) => inset(u, v, T), 84, 0, {
    vs: vIn,
    poleEnd: new THREE.Vector3(0.002, V0.tieY + 0.004, ZC + 0.001),
    outward: (p) => new THREE.Vector3(-p.x, 0.3, ZC - p.z),
  });
  const rimG = sweepSurface((u, v) => inset(u, 1, T * v), 84, 1, { outward: () => new THREE.Vector3(0, 1, 0) });
  const parts: THREE.Object3D[] = [part(mergeFlat([bag, innerG, rimG]), canvas)];
  // seams: round the bottom panel, and up the +X side
  const ring: THREE.Vector3[] = [];
  for (let i = 0; i <= 96; i++) {
    const p = bagPoint(i / 96, 0.11);
    ring.push(p.add(new THREE.Vector3(p.x, 0, p.z - ZC).normalize().multiplyScalar(0.0006)));
  }
  parts.push(part(stitches(ring, { len: 0.004, gap: 0.0025, r: 0.0006 }), thread));
  const side: THREE.Vector3[] = [];
  for (let i = 0; i <= 30; i++) {
    const p = bagPoint(0.004, 0.12 + (0.5 * i) / 30);
    side.push(p.add(new THREE.Vector3(0.0007, 0, 0)));
  }
  parts.push(part(stitches(side, { len: 0.004, gap: 0.0025, r: 0.0006 }), thread));

  // drawstring round the neck, knotted on the front, tails hanging
  const V = VESHMESHOK;
  const nr = RN + 0.0045;
  const cordRing: THREE.Vector3[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    cordRing.push(new THREE.Vector3(Math.cos(a) * (nr + 0.0008 * Math.sin(a * NP)), V.tieY + 0.001 * Math.sin(a * 2), ZC + Math.sin(a) * (nr + 0.0008 * Math.sin(a * NP))));
  }
  parts.push(part(G.tube(cordRing, 0.0022, 6, 80, true), cord));
  const kn = new THREE.Vector3(0.006, V.tieY, ZC + nr + 0.002);
  parts.push(part(new THREE.SphereGeometry(0.0045, 12, 10).scale(1.2, 0.9, 0.9).translate(kn.x, kn.y, kn.z), cord));
  for (const [dx, len, sd] of [
    [0.012, 0.075, 1],
    [-0.006, 0.058, -1],
  ] as [number, number, number][]) {
    const tp: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const y = kn.y - t * len;
      // lie on the upper bag surface as it widens
      const q = Math.min(1, Math.max(0, (y - Y_BODY) / (Y_NECK - Y_BODY)));
      const v = y >= Y_NECK ? 0.86 : 0.45 + (0.39 * 2 * Math.asin(q)) / Math.PI;
      const rg = ringAt(v);
      const zS = ZC + rg.b + rg.amp * 0.9 + 0.003;
      tp.push(new THREE.Vector3(kn.x + dx * t + sd * 0.003 * Math.sin(t * 4), y, Math.max(kn.z - t * 0.002, zS)));
    }
    parts.push(part(G.tube(tp, 0.0021, 6, 40), cord));
    const e = tp[tp.length - 1];
    parts.push(part(new THREE.SphereGeometry(0.0036, 10, 8).translate(e.x, e.y, e.z), cord));
  }

  // shoulder strap: lark's-head knot round the neck (two wraps of the strap), two legs leaving
  // the back of the knot towards the shoulders
  const SW = 0.032, ST = 0.0042;
  const anchors: THREE.Vector3[] = [];
  const wraps: [number, number, number][] = [
    [V.knotY - 0.006, 0.0165, 0],
    [V.knotY + 0.007, 0.0155, 0.0022],
  ];
  for (const [yw, w, dr] of wraps) {
    const br = RN + 0.005 + ST / 2 + dr;
    const band: THREE.Vector3[] = [], bandN: THREE.Vector3[] = [];
    const tilt = dr > 0 ? 0.005 : -0.004, ta = dr > 0 ? 0.6 : 2.4;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const rr = br + 0.0022 * Math.sin(a * NP + 1 + dr * 300) + 0.001 * Math.sin(a * 3);
      band.push(new THREE.Vector3(Math.cos(a) * rr, yw + tilt * Math.cos(a - ta), ZC + Math.sin(a) * rr));
      bandN.push(new THREE.Vector3(Math.cos(a), 0.15 * Math.sin(a), Math.sin(a)).normalize());
    }
    parts.push(part(G.strap(band, w, ST, bandN, { closed: true, samples: 72 }), strapMat));
  }
  const br = RN + 0.005 + ST;
  for (const s of [1, -1]) {
    // each leg leaves the back of the knot and turns flat to run over the shoulder
    const a0 = -Math.PI / 2 + s * 0.5;
    const pts = [
      new THREE.Vector3(Math.cos(a0) * br, V.knotY, ZC + Math.sin(a0) * br),
      new THREE.Vector3(s * 0.026, V.knotY + 0.006, ZC - br - 0.018),
      new THREE.Vector3(s * 0.046, V.knotY + 0.014, ZC - br - 0.042),
      new THREE.Vector3(s * 0.062, V.knotY + 0.02, ZC - br - 0.066),
    ];
    const nrm = [
      new THREE.Vector3(s * 0.4, 0, -1).normalize(),
      new THREE.Vector3(s * 0.3, 0.5, -0.8).normalize(),
      new THREE.Vector3(s * 0.25, 0.85, -0.35).normalize(),
      new THREE.Vector3(s * 0.2, 0.97, -0.1).normalize(),
    ];
    parts.push(part(G.strap(pts, SW, ST, nrm, { samples: 30 }), strapMat));
    anchors.push(pts[pts.length - 1].clone());
  }
  // strap ends sewn to the bottom corners (on the back face), leading forward under the arms
  const bottomEnds: THREE.Vector3[] = [];
  for (const s of [1, -1]) {
    const xc = s * (A - 0.03);
    const zb = -0.0035;
    const pts = [
      new THREE.Vector3(xc - s * 0.02, 0.03, zb + 0.004),
      new THREE.Vector3(xc, 0.044, zb),
      new THREE.Vector3(xc + s * 0.022, 0.06, zb - 0.003),
      new THREE.Vector3(xc + s * 0.036, 0.074, zb - 0.02),
    ];
    const nrm = [
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(s * 0.4, 0, -1).normalize(),
      new THREE.Vector3(s * 0.9, 0, -0.5).normalize(),
    ];
    parts.push(part(G.strap(pts, SW * 1.1, ST * 0.8, nrm, { samples: 28 }), strapMat));
    // sewn-on end: box stitch on the strap face against the bag
    const c = pts[1];
    const q = (dx: number, dy: number) => new THREE.Vector3(c.x + dx, c.y + dy, zb - ST * 0.4 - 0.0004);
    const hw = SW * 0.45, hh = 0.014;
    const g = G.mergeGeometries([
      stitches([q(-hw, -hh), q(hw, -hh), q(hw, hh), q(-hw, hh), q(-hw, -hh)], { len: 0.0035, gap: 0.002, r: 0.0006 }),
      stitches([q(-hw, -hh), q(hw, hh)], { len: 0.0035, gap: 0.002, r: 0.0006 }),
      stitches([q(-hw, hh), q(hw, -hh)], { len: 0.0035, gap: 0.002, r: 0.0006 }),
    ])!;
    parts.push(part(g, thread));
    bottomEnds.push(pts[pts.length - 1].clone());
  }

  const inner = group(parts);
  // gear frame: origin at the top centre of the back face, at the neck-knot height
  inner.position.set(0, -V.knotY, 0);
  const obj = group([inner]);
  obj.name = 'su-veshmeshok';
  const off = new THREE.Vector3(0, -V.knotY, 0);
  return {
    id: 'su-veshmeshok',
    name: 'Veshmeshok (pattern 1941)',
    object: obj,
    mount: 'back',
    size: { w: 0.4, h: V.top, d: 0.165 },
    strapAnchors: [...anchors, ...bottomEnds].map((p) => p.clone().add(off)),
  };
}
