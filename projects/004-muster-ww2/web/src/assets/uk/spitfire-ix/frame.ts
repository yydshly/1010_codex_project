/**
 * Spitfire LF Mk IXc reference frame, key dimensions and fuselage section model.
 *
 * Everything except the landing gear is authored in the BODY frame:
 *   x = asset left (port), y = up from the thrust line, z = -s,
 *   s = distance (m) aft of the spinner tip along the thrust line.
 * The body is pitched nose-up by the three-point ground angle and lifted so the tail wheel
 * strut attachment sits at DIM.tailHeight; the main legs are then sized in the ASSET frame so
 * the tyres meet y = 0 exactly.
 *
 * Research notes (see provenance in ../spitfire-ix.asset.ts):
 *  - span 36 ft 10 in (11.23 m, standard elliptical tips), length 31 ft 0.5 in (9.47 m)
 *  - wing area 242 sq ft (22.48 m^2) -> root chord ~2.52 m for the elliptical planform
 *  - NACA 2213 root / 2209.4 tip, dihedral 6 deg, incidence +2 deg root to -0.5 deg tip
 *  - Rotol four-blade propeller 10 ft 9 in (3.27 m) in a pointed spinner
 *  - main undercarriage track ~5 ft 8.5 in (1.74 m), outward retracting; fixed tail wheel
 *  - three-point ground angle ~11.5 deg (estimate from photographs); with one blade vertical
 *    the propeller tip reaches ~3.84 m, matching the published 3.86 m height
 */
import * as THREE from 'three';
import { curve, lerp, type P2 } from './geom';

export const DEG = Math.PI / 180;

/** Body point from (x, y, s). */
export const B = (x: number, y: number, s: number) => new THREE.Vector3(x, y, -s);

export const DIM = {
  length: 9.47,
  span: 11.23,
  semi: 11.23 / 2,
  dihedral: 6 * DEG,
  theta: 11.5 * DEG,
  prop: { r: 1.635, plane: 0.4 },
  spinner: { len: 0.8, r: 0.296 },
  mainTyre: { r: 0.305, w: 0.165 },
  tailTyre: { r: 0.125, w: 0.09 },
  /** main gear pivot (port), body frame; y is taken from the wing lower skin */
  pivot: { x: 0.62, s: 2.72 },
  /** tail wheel strut attachment on the fuselage underside */
  tailAttach: { s: 8.72 },
  /** height of that attachment above the ground (strut + fork + wheel) */
  tailHeight: 0.42,
};

// ------------------------------------------------------------------ fuselage sections
const keys = (a: P2[]) => curve(a);
const cT = keys([
  [0.78, 0.29], [0.9, 0.302], [1.1, 0.322], [1.4, 0.345], [1.8, 0.368], [2.3, 0.392], [2.8, 0.41], [3.45, 0.425],
  [4.0, 0.432], [4.5, 0.436], [5.0, 0.436], [5.6, 0.428], [6.3, 0.404], [7.0, 0.364], [7.7, 0.318], [8.3, 0.28],
  [8.8, 0.25], [9.08, 0.236],
]);
const cB = keys([
  [0.78, -0.3], [0.9, -0.33], [1.1, -0.38], [1.4, -0.435], [1.8, -0.49], [2.3, -0.54], [2.8, -0.572], [3.45, -0.59],
  [4.0, -0.592], [4.5, -0.582], [5.0, -0.556], [5.6, -0.518], [6.3, -0.452], [7.0, -0.365], [7.7, -0.27], [8.3, -0.205],
  [8.8, -0.158], [9.08, -0.128],
]);
const cW = keys([
  [0.78, 0.292], [0.9, 0.308], [1.1, 0.332], [1.4, 0.355], [1.8, 0.374], [2.3, 0.39], [2.8, 0.398], [3.45, 0.4],
  [4.0, 0.396], [4.5, 0.386], [5.0, 0.368], [5.6, 0.338], [6.3, 0.293], [7.0, 0.241], [7.7, 0.185], [8.3, 0.131],
  [8.8, 0.083], [9.08, 0.036],
]);
const cM = keys([[0.78, -0.005], [1.4, -0.03], [2.3, -0.05], [3.45, -0.05], [4.5, -0.03], [5.6, 0.0], [7.0, 0.03], [8.3, 0.05], [9.08, 0.065]]);
const cNT = keys([[0.78, 2.0], [1.4, 2.05], [2.5, 2.2], [3.45, 2.35], [4.5, 2.35], [5.5, 2.15], [9.08, 2.0]]);
const cNB = keys([[0.78, 2.0], [1.4, 2.1], [2.5, 2.3], [4.5, 2.3], [6.0, 2.1], [9.08, 2.0]]);

export const FUSE_S0 = 0.78;
export const FUSE_S1 = 9.08;

export interface Sec {
  yT: number;
  yB: number;
  hw: number;
  yM: number;
  nT: number;
  nB: number;
}
export function sec(s: number): Sec {
  return { yT: cT(s), yB: cB(s), hw: cW(s), yM: cM(s), nT: cNT(s), nB: cNB(s) };
}

/** Point on a section at parameter a (0 = top, PI/2 = port max width, PI = bottom). */
export function secPt(c: Sec, a: number): P2 {
  const sa = Math.sin(a), ca = Math.cos(a);
  const up = ca >= 0;
  const n = up ? c.nT : c.nB;
  const x = c.hw * Math.sign(sa) * Math.pow(Math.abs(sa), 2 / n);
  const h = up ? c.yT - c.yM : c.yM - c.yB;
  const y = c.yM + Math.sign(ca) * h * Math.pow(Math.abs(ca), 2 / n);
  return [x, y];
}

/** Half width of the skin at height y (0 above the top / below the bottom). */
export function fuseX(s: number, y: number): number {
  const c = sec(s);
  if (y >= c.yM) {
    const t = (y - c.yM) / (c.yT - c.yM);
    return t >= 1 ? 0 : c.hw * Math.pow(1 - Math.pow(t, c.nT), 1 / c.nT);
  }
  const t = (c.yM - y) / (c.yM - c.yB);
  return t >= 1 ? 0 : c.hw * Math.pow(1 - Math.pow(t, c.nB), 1 / c.nB);
}
/** Height of the upper skin at half width x. */
export function fuseYTop(s: number, x: number): number {
  const c = sec(s);
  const q = Math.min(0.999999, Math.abs(x) / c.hw);
  return c.yM + (c.yT - c.yM) * Math.pow(1 - Math.pow(q, c.nT), 1 / c.nT);
}
/** Height of the lower skin at half width x. */
export function fuseYBot(s: number, x: number): number {
  const c = sec(s);
  const q = Math.min(0.999999, Math.abs(x) / c.hw);
  return c.yM - (c.yM - c.yB) * Math.pow(1 - Math.pow(q, c.nB), 1 / c.nB);
}
/** Outward skin normal (body frame) on the port side at (s, y). */
export function fuseNormal(s: number, y: number): THREE.Vector3 {
  const e = 0.004;
  const dxdy = (fuseX(s, y + e) - fuseX(s, y - e)) / (2 * e);
  const dxds = (fuseX(s + e, y) - fuseX(s - e, y)) / (2 * e);
  return new THREE.Vector3(1, -dxdy, dxds).normalize();
}

// ------------------------------------------------------------------ wing layout
/**
 * Elliptical planform: leading and trailing edges are quarter-ellipses about a straight axis
 * line (near the main spar) at 30 % of the root chord; LE at the root 2.25 m aft of the spinner.
 */
export const WG = {
  c0: 2.52,
  k: 0.3,
  sAxis: 2.25 + 0.3 * 2.52,
  yRoot: -0.46,
  tRoot: 0.13,
  tTip: 0.094,
  m: 0.02,
  p: 0.2,
  incRoot: 2 * DEG,
  incTip: -0.5 * DEG,
  /** wheel well (lower skin opening) and leg slot */
  well: { x: 1.5, s: 2.72, r: 0.335, slotHalf: 0.075 },
  /** radiator housings (both wings) */
  rad: { xa: 1.24, xb: 1.76, s0: 3.12, s1: 4.12 },
  /** armament stations (port; mirrored): 20 mm Hispano, blanked outer cannon stub, two .303 */
  cannon: 2.05,
  stub: 2.33,
  mg: [2.95, 3.2],
  /** roundel centre (half span) */
  roundel: 3.42,
};
export function wingE(ax: number): number {
  return Math.sqrt(Math.max(0, 1 - (ax / DIM.semi) ** 2));
}
export function planform(ax: number): { le: number; te: number } {
  const e = wingE(ax);
  return { le: WG.sAxis - WG.k * WG.c0 * e, te: WG.sAxis + (1 - WG.k) * WG.c0 * e };
}

// ------------------------------------------------------------------ cockpit layout
/** windscreen base sW, windscreen arch sA, hood sH0..sH1, rear fairing end sR */
export const CK = { sW: 3.47, sA: 3.72, sH0: 3.745, sH1: 4.42, sR: 5.08, sill: 0.285, sillY: 0.318 };
/** Half width of the cockpit opening in the skin (-1 outside). */
export function openingHalfWidth(s: number): number {
  if (s < CK.sW || s > CK.sH1) return -1;
  if (s < CK.sA) return lerp(0.15, CK.sill, (s - CK.sW) / (CK.sA - CK.sW));
  return CK.sill;
}

// ------------------------------------------------------------------ body -> asset
export function bodyToAsset(): THREE.Matrix4 {
  const rot = new THREE.Matrix4().makeRotationX(-DIM.theta);
  const ta = B(0, cB(DIM.tailAttach.s), DIM.tailAttach.s).applyMatrix4(rot);
  const nose = new THREE.Vector3(0, 0, 0).applyMatrix4(rot);
  const tail = B(0, 0.45, DIM.length).applyMatrix4(rot);
  const ty = DIM.tailHeight - ta.y;
  const tz = -(nose.z + tail.z) / 2;
  return new THREE.Matrix4().makeTranslation(0, ty, tz).multiply(rot);
}
export const BODY_TO_ASSET = bodyToAsset();
export const ASSET_TO_BODY = BODY_TO_ASSET.clone().invert();
export const toAsset = (v: THREE.Vector3) => v.clone().applyMatrix4(BODY_TO_ASSET);
export const dirToAsset = (v: THREE.Vector3) => v.clone().transformDirection(BODY_TO_ASSET);
