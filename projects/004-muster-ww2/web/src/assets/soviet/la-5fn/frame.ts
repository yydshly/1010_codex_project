/**
 * La-5FN reference frame, key dimensions and fuselage section model.
 *
 * Everything except the landing gear is authored in the BODY frame:
 *   x = asset left (port), y = up from the thrust line, z = -s,
 *   s = distance (m) aft of the spinner tip along the thrust line.
 * The body is pitched nose-up by the three-point ground angle and lifted so the propeller hub
 * sits at DIM.hubHeight; the main legs and the tail wheel strut are then sized in the ASSET
 * frame so the tyres meet y = 0 exactly.
 *
 * Research notes (see provenance in ../la-5fn.asset.ts):
 *  - span 9.80 m, length 8.67 m, wing area 17.5 m^2
 *  - Shvetsov ASh-82FN 14-cylinder two-row radial in a close cowling with front shutters, long
 *    supercharger intake on top of the cowling, individual exhaust stubs, side cowl flaps
 *  - VISh-105V three-blade propeller (~3.1 m, estimate)
 *  - FN-series lowered rear decking behind the cockpit with a glazed rear canopy section
 *  - inward-retracting main gear in the wing centre section, retractable tail wheel
 *  - three-point ground angle, gear track and section shapes are estimates from photographs and
 *    general arrangement drawings
 */
import * as THREE from 'three';
import { curve, lerp, type P2 } from './geom';

export const DEG = Math.PI / 180;

/** Body point from (x, y, s). */
export const B = (x: number, y: number, s: number) => new THREE.Vector3(x, y, -s);

export const DIM = {
  length: 8.67,
  span: 9.8,
  semi: 4.9,
  dihedral: 5.5 * DEG,
  theta: 11.5 * DEG,
  prop: { r: 1.55, plane: 0.3 },
  spinner: { len: 0.5, r: 0.29 },
  mainTyre: { r: 0.325, w: 0.2 },
  tailTyre: { r: 0.15, w: 0.12 },
  /** main gear pivot (port), body frame; y is taken from the wing lower skin */
  pivot: { x: 1.42, s: 2.55 },
  /** tail wheel strut exit on the fuselage underside */
  tailAttach: { s: 7.72 },
  /** propeller hub height above the ground in the parked attitude */
  hubHeight: 2.02,
  /** cowling: lip station, open (shutter) radius */
  cowl: { lip: 0.44, rOpen: 0.5, ring1: 1.34, flaps0: 1.42, flaps1: 1.98 },
};

// ------------------------------------------------------------------ fuselage sections
const keys = (a: P2[]) => curve(a);
// top of the skin (y at x = 0)
const cT = keys([
  [0.5, 0.6], [0.7, 0.632], [0.95, 0.645], [1.34, 0.645], [1.7, 0.628], [2.1, 0.6], [2.6, 0.566], [3.05, 0.545],
  [3.6, 0.535], [4.2, 0.53], [4.9, 0.518], [5.8, 0.475], [6.6, 0.425], [7.3, 0.375], [7.9, 0.33], [8.3, 0.29], [8.45, 0.26],
]);
// bottom of the skin
const cB = keys([
  [0.5, -0.6], [0.7, -0.632], [0.95, -0.645], [1.34, -0.645], [1.8, -0.64], [2.4, -0.625], [3.2, -0.6], [4.0, -0.57],
  [4.6, -0.53], [5.4, -0.44], [6.2, -0.33], [7.0, -0.215], [7.8, -0.1], [8.3, -0.02], [8.45, 0.03],
]);
// max half width
const cW = keys([
  [0.5, 0.6], [0.7, 0.632], [0.95, 0.645], [1.34, 0.645], [1.7, 0.6], [2.1, 0.535], [2.6, 0.49], [3.2, 0.465],
  [4.0, 0.45], [4.8, 0.415], [5.6, 0.355], [6.4, 0.285], [7.2, 0.205], [7.9, 0.13], [8.3, 0.07], [8.45, 0.03],
]);
// height of the max width
const cM = keys([[0.5, 0.0], [1.34, 0.0], [2.1, 0.02], [3.0, 0.05], [4.5, 0.07], [6.4, 0.09], [8.45, 0.14]]);
// super-ellipse exponents (2 = ellipse; higher = boxier)
const cNT = keys([[0.5, 2.0], [1.34, 2.0], [2.1, 2.3], [3.0, 2.6], [4.5, 2.6], [6.0, 2.3], [8.45, 2.1]]);
const cNB = keys([[0.5, 2.0], [1.34, 2.0], [2.1, 2.2], [3.0, 2.4], [5.0, 2.3], [8.45, 2.1]]);

export const FUSE_S0 = 0.5;
export const FUSE_S1 = 8.45;

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
 * Straight-tapered planform with a swept leading edge, a slightly forward-swept trailing edge
 * and rounded tips. Root chord (on the centreline) 2.45 m, LE at the root 1.95 m aft of the
 * spinner tip; wing area ~17.5 m^2.
 */
export const WG = {
  le0: 1.95,
  leK: 0.205,
  te0: 4.4,
  teK: 0.065,
  /** tip rounding starts here (half span) */
  tip0: 4.3,
  yRoot: -0.44,
  tRoot: 0.155,
  tTip: 0.1,
  m: 0.016,
  p: 0.2,
  incRoot: 1.5 * DEG,
  incTip: 0.0,
  /** wheel well (lower skin opening) and leg slot */
  well: { x: 0.62, s: 2.55, r: 0.36, slotHalf: 0.08 },
  /** inboard end of the open leg slot (outboard edge of the closed inner well door) */
  slotX0: 0.98,
  /** slat span (outer wing) */
  slat0: 2.35,
  slat1: 4.25,
  /** star centre (half span, lower surface) */
  star: 3.2,
};
export function planform(ax: number): { le: number; te: number } {
  let le = WG.le0 + WG.leK * ax;
  let te = WG.te0 - WG.teK * ax;
  if (ax > WG.tip0) {
    // elliptic rounding about the 40 % chord line
    const t = Math.min(1, (ax - WG.tip0) / (DIM.semi - WG.tip0));
    const e = Math.sqrt(Math.max(0, 1 - t * t));
    const c = te - le;
    const mid = le + 0.4 * c;
    le = mid - 0.4 * c * e;
    te = mid + 0.6 * c * e;
  }
  return { le, te };
}

// ------------------------------------------------------------------ cockpit layout
/** windscreen base sW, windscreen arch sA, end of the open cockpit sH1, sill height */
export const CK = { sW: 3.02, sA: 3.36, sH1: 4.3, sillY: 0.47 };
/** Half width of the cockpit opening in the skin (-1 outside). */
export function openingHalfWidth(s: number): number {
  if (s < CK.sW || s > CK.sH1) return -1;
  const sill = fuseX(s, CK.sillY);
  if (s < CK.sA) return lerp(0.13, fuseX(CK.sA, CK.sillY), (s - CK.sW) / (CK.sA - CK.sW));
  return sill;
}

// ------------------------------------------------------------------ body -> asset
export function bodyToAsset(): THREE.Matrix4 {
  const rot = new THREE.Matrix4().makeRotationX(-DIM.theta);
  const hub = B(0, 0, DIM.prop.plane).applyMatrix4(rot);
  const nose = new THREE.Vector3(0, 0, 0).applyMatrix4(rot);
  const tail = B(0, 0.4, DIM.length).applyMatrix4(rot);
  const ty = DIM.hubHeight - hub.y;
  const tz = -(nose.z + tail.z) / 2;
  return new THREE.Matrix4().makeTranslation(0, ty, tz).multiply(rot);
}
export const BODY_TO_ASSET = bodyToAsset();
export const ASSET_TO_BODY = BODY_TO_ASSET.clone().invert();
export const toAsset = (v: THREE.Vector3) => v.clone().applyMatrix4(BODY_TO_ASSET);
export const dirToAsset = (v: THREE.Vector3) => v.clone().transformDirection(BODY_TO_ASSET);
