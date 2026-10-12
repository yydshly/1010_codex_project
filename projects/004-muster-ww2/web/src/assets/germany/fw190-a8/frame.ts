/**
 * Fw 190 A-8 reference frame, key dimensions and fuselage section model.
 *
 * Everything except the landing gear is authored in the BODY frame:
 *   x = asset left (port), y = up from the thrust line, z = -s,
 *   s = distance (m) aft of the spinner tip along the thrust line.
 * The body is pitched nose-up by the three-point ground angle and lifted so the propeller hub
 * sits at DIM.hubHeight; the main legs and the tail wheel strut are then sized in the ASSET
 * frame so the tyres meet y = 0 exactly.
 *
 * Research notes (see provenance in ../fw190-a8.asset.ts):
 *  - span 10.506 m, length 9.00 m, height 3.95 m (tail down, one blade vertical), wing area 18.3 m^2
 *  - wide-track (~3.5 m) inward-retracting main gear, semi-retractable tail wheel
 *  - BMW 801 D-2 14-cylinder radial in a close cowling with an engine-driven cooling fan behind
 *    the large spinner; VDM 9-12176 A three-blade wooden propeller, 3.3 m diameter
 *  - NACA 23015.3 root / 23009 tip sections, dihedral ~5.5 deg
 *  - three-point ground angle ~12.5 deg (estimate from photographs and general drawings)
 */
import * as THREE from 'three';
import { curve, lerp, type P2 } from './geom';

export const DEG = Math.PI / 180;

/** Body point from (x, y, s). */
export const B = (x: number, y: number, s: number) => new THREE.Vector3(x, y, -s);

export const DIM = {
  length: 9.0,
  span: 10.506,
  semi: 10.506 / 2,
  dihedral: 5.5 * DEG,
  theta: 12.5 * DEG,
  prop: { r: 1.65, plane: 0.34 },
  spinner: { len: 0.6, r: 0.41 },
  mainTyre: { r: 0.35, w: 0.175 },
  tailTyre: { r: 0.19, w: 0.15 },
  /** main gear pivot (port), body frame; y is taken from the wing lower skin */
  pivot: { x: 1.8, s: 2.36 },
  /** tail wheel strut exit on the fuselage underside */
  tailAttach: { s: 8.02 },
  /** propeller hub height above the ground in the parked attitude */
  hubHeight: 2.32,
  /** cowling */
  cowl: { lip: 0.56, rMax: 0.655, rOpen: 0.53, flaps0: 1.6, flaps1: 1.78 },
};

// ------------------------------------------------------------------ fuselage sections
const keys = (a: P2[]) => curve(a);
// top of the skin (y at x = 0)
const cT = keys([
  [0.6, 0.622], [0.75, 0.645], [0.95, 0.655], [1.4, 0.655], [1.62, 0.652], [1.8, 0.648], [2.2, 0.642], [2.8, 0.636],
  [3.3, 0.632], [4.0, 0.634], [4.8, 0.63], [5.6, 0.585], [6.4, 0.52], [7.2, 0.45], [8.0, 0.385], [8.6, 0.335], [8.92, 0.305],
]);
// bottom of the skin
const cB = keys([
  [0.6, -0.622], [0.75, -0.645], [0.95, -0.655], [1.4, -0.655], [1.62, -0.652], [1.8, -0.642], [2.2, -0.622], [2.6, -0.592],
  [3.0, -0.575], [3.6, -0.56], [4.0, -0.55], [4.4, -0.535], [4.8, -0.51], [5.6, -0.44], [6.4, -0.335], [7.2, -0.225], [8.0, -0.12],
  [8.6, -0.035], [8.92, 0.02],
]);
// max half width
const cW = keys([
  [0.6, 0.622], [0.75, 0.645], [0.95, 0.655], [1.4, 0.655], [1.62, 0.652], [1.8, 0.628], [2.2, 0.59], [2.8, 0.532],
  [3.3, 0.487], [4.0, 0.455], [4.8, 0.42], [5.6, 0.36], [6.4, 0.29], [7.2, 0.21], [8.0, 0.138], [8.6, 0.08], [8.92, 0.03],
]);
// height of the max width
const cM = keys([[0.6, 0.0], [1.62, 0.0], [2.2, 0.02], [2.8, 0.05], [3.3, 0.07], [4.0, 0.08], [4.8, 0.1], [6.4, 0.1], [8.0, 0.12], [8.92, 0.16]]);
// super-ellipse exponents (2 = ellipse; higher = boxier)
const cNT = keys([[0.6, 2.0], [1.62, 2.0], [2.2, 2.35], [2.8, 2.8], [3.3, 3.1], [4.0, 3.2], [4.8, 3.0], [5.6, 2.5], [6.4, 2.25], [8.92, 2.1]]);
const cNB = keys([[0.6, 2.0], [1.62, 2.0], [2.2, 2.2], [2.8, 2.4], [4.0, 2.5], [5.6, 2.3], [8.92, 2.1]]);

export const FUSE_S0 = 0.6;
export const FUSE_S1 = 8.92;

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
 * and rounded tips. Root chord (on the centreline) 2.32 m, LE at the root 1.75 m aft of the
 * spinner tip; wing area ~18.3 m^2.
 */
export const WG = {
  le0: 1.75,
  leK: 0.14,
  te0: 4.07,
  teK: 0.083,
  /** tip rounding starts here (half span) */
  tip0: 4.72,
  yRoot: -0.45,
  tRoot: 0.153,
  tTip: 0.09,
  m: 0.018,
  p: 0.15,
  incRoot: 2 * DEG,
  incTip: 0.5 * DEG,
  /** wheel well (lower skin opening) and leg slot */
  well: { x: 0.78, s: 2.3, r: 0.39, slotHalf: 0.085 },
  /** inboard end of the open leg slot (outboard edge of the closed inner well door) */
  slotX0: 1.12,
  /** armament: wing-root MG 151/20 (muzzle in the LE) and outer MG 151/20 (barrel ahead of the LE) */
  rootGun: 0.86,
  outerGun: 2.42,
  /** Balkenkreuz centre (half span) */
  cross: 3.55,
};
export function planform(ax: number): { le: number; te: number } {
  let le = WG.le0 + WG.leK * ax;
  let te = WG.te0 - WG.teK * ax;
  if (ax > WG.tip0) {
    // elliptic rounding about the 40 % chord line
    const t = Math.min(1, (ax - WG.tip0) / (DIM.semi - WG.tip0));
    const e = Math.sqrt(Math.max(0, 1 - t * t));
    const c = te - le;
    const mid = le + 0.42 * c;
    le = mid - 0.42 * c * e;
    te = mid + 0.58 * c * e;
  }
  return { le, te };
}

// ------------------------------------------------------------------ cockpit layout
/** windscreen base sW, windscreen arch sA, hood sA..sH1, sill height */
export const CK = { sW: 3.06, sA: 3.41, sH1: 4.97, sillY: 0.595, topW: 0.935 };
/** Half width of the cockpit opening in the skin (-1 outside). */
export function openingHalfWidth(s: number): number {
  if (s < CK.sW || s > CK.sH1) return -1;
  const sill = fuseX(s, CK.sillY);
  if (s < CK.sA) return lerp(0.15, fuseX(CK.sA, CK.sillY), (s - CK.sW) / (CK.sA - CK.sW));
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
