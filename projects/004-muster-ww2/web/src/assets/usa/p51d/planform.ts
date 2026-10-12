/**
 * P-51D wing planform and sections (BODY frame, |x| = ax half-span), shared by the wing mesh,
 * the markings and the skin shader (constants are exported so the GLSL stays in sync).
 *
 * Straight tapered laminar-flow wing: 235 sq ft over 37 ft span -> root chord 2.64 m on the
 * centre line, 1.23 m at the (virtual) tip, the 30 % chord line kept straight (slight sweep-back
 * of the leading edge, forward-swept trailing edge). The P-51D's leading-edge root extension
 * ("kink") is added inboard of ax = EXT_AX. Rounded wing tips. Dihedral 5 deg, incidence +1 deg
 * at the root washing out to -0.5 deg at the tip. Sections interpolate the published P-51D root
 * (BL 17.5, ~16.5 %) and tip (BL 215, ~11.4 %) ordinates.
 */
import * as THREE from 'three';
import { curve, lerp, clamp, type P2 } from './geom';
import { B, DEG, DIM } from './frame';

export const WING = {
  semi: DIM.semi,
  cr: 2.64,
  ct: 1.23,
  /** s of the straight 30 % chord line */
  s30: 2.79 + 0.3 * 2.64,
  /** chord-line height at the 30 % point on the centre line */
  y0: -0.53,
  dihedral: 5 * DEG,
  incRoot: 1.0 * DEG,
  incTip: -0.5 * DEG,
  /** root extension: extra LE chord on the centre line, and where it ends */
  ext: 0.36,
  extAx: 1.42,
  /** tip rounding starts here */
  roundAx: 5.22,
  roundN: 2.5,
};

/** Basic (unextended) local chord. */
export const chordBasic = (ax: number) => WING.cr - ((WING.cr - WING.ct) * Math.min(ax, WING.semi)) / WING.semi;

/** Root extension of the leading edge (m, >= 0), with a short smooth blend at the kink. */
export function extAt(ax: number): number {
  const b = 0.1;
  const x = ax / WING.extAx;
  const lin = WING.ext * (1 - x);
  if (ax >= WING.extAx + b) return 0;
  if (ax <= WING.extAx - b) return lin;
  // quadratic blend between the linear ramp and zero around the kink
  const t = (ax - (WING.extAx - b)) / (2 * b);
  const slope = WING.ext / WING.extAx;
  return (slope * b * (1 - t) * (1 - t)) ;
}

/** Leading / trailing edge station at half-span ax (with extension and rounded tip). */
export function planform(ax: number): { le: number; te: number } {
  const c = chordBasic(ax);
  let le = WING.s30 - 0.3 * c - extAt(ax);
  let te = WING.s30 + 0.7 * c;
  if (ax > WING.roundAx) {
    const q = clamp((ax - WING.roundAx) / (WING.semi - WING.roundAx), 0, 1);
    const n = WING.roundN;
    const e = Math.pow(Math.max(0, 1 - Math.pow(q, n)), 1 / n);
    const sp = WING.s30 + 0.12 * c;
    le = sp - (sp - le) * Math.pow(e, 1.0);
    te = sp + (te - sp) * Math.pow(e, 1.25);
  }
  return { le, te };
}

/** Chord-shrink factor of the rounded tip (1 inboard of roundAx, -> 0 at the tip). */
export function tipFactor(ax: number): number {
  if (ax <= WING.roundAx) return 1;
  const q = clamp((ax - WING.roundAx) / (WING.semi - WING.roundAx), 0, 1);
  const n = WING.roundN;
  return Math.pow(Math.max(0, 1 - Math.pow(q, n)), 1 / n);
}

// --------------------------------------------------------------- sections (UIUC ordinates)
const X = [0, 0.005585, 0.022214, 0.049516, 0.086881, 0.133474, 0.188255, 0.25, 0.31733, 0.38874, 0.462635, 0.537365, 0.611261, 0.682671, 0.75, 0.811745, 0.866526, 0.913119, 0.950485, 0.977786, 1];
const ROOT_U = [0, 0.015258, 0.030339, 0.044768, 0.058429, 0.069751, 0.079882, 0.087311, 0.093243, 0.094701, 0.090031, 0.081477, 0.071686, 0.061562, 0.050766, 0.038145, 0.024587, 0.013701, 0.00672, 0.002797, 0];
const ROOT_L = [0, -0.013319, -0.026406, -0.036992, -0.046725, -0.05474, -0.061409, -0.067201, -0.070078, -0.070449, -0.067352, -0.059454, -0.047939, -0.036264, -0.026548, -0.018118, -0.010593, -0.005384, -0.002509, -0.00102, 0];
const TIP_U = [0, 0.0080857, 0.0171943, 0.0265966, 0.0357669, 0.0443234, 0.051949, 0.0586048, 0.0639389, 0.0675523, 0.0700939, 0.0689003, 0.062002, 0.0504744, 0.0370719, 0.0250994, 0.0161636, 0.0094824, 0.0047928, 0.0020193, 0];
const TIP_L = [0, -0.0072395, -0.0141771, -0.0199017, -0.025304, -0.0305286, -0.035021, -0.0385206, -0.0414433, -0.0429331, -0.0440883, -0.0435437, -0.0389807, -0.0301552, -0.0205715, -0.0123279, -0.0063297, -0.0029648, -0.0014429, -0.0006126, 0];

/** Interpolate ordinates in sqrt(u) near the nose so the LE stays round. */
function ordinateCurve(ys: number[]): (u: number) => number {
  const keys: P2[] = X.map((x, i) => [Math.sqrt(x), ys[i]]);
  const f = curve(keys);
  return (u: number) => f(Math.sqrt(clamp(u, 0, 1)));
}
const rU = ordinateCurve(ROOT_U), rL = ordinateCurve(ROOT_L), tU = ordinateCurve(TIP_U), tL = ordinateCurve(TIP_L);

/** Section blend weight root -> tip. */
export const secW = (ax: number) => clamp((ax - 0.445) / (5.46 - 0.445), 0, 1);

/** Ordinate (fraction of the basic chord) at chord fraction u of the section at ax. */
export function ordinate(ax: number, u: number, upper: boolean): number {
  const w = secW(ax);
  return upper ? lerp(rU(u), tU(u), w) : lerp(rL(u), tL(u), w);
}

/** Chord-line height at chord station s for the section at ax. */
export function chordY(ax: number, s: number): number {
  const inc = lerp(WING.incRoot, WING.incTip, Math.min(1, ax / WING.semi));
  return WING.y0 + ax * Math.tan(WING.dihedral) - (s - WING.s30) * Math.tan(inc);
}

/**
 * Surface point (body frame) at half-span ax, chord fraction u (of the extended, tip-rounded
 * chord), upper or lower side; side = +1 port, -1 starboard.
 */
export function wingPt(ax: number, u: number, upper: boolean, side = 1): THREE.Vector3 {
  const { le, te } = planform(ax);
  const c = te - le;
  const s = le + u * c;
  // absolute thickness follows the basic chord (the extension is a fairing, not a thicker wing)
  const tScale = chordBasic(ax) * tipFactor(ax);
  const y = chordY(ax, s) + tScale * ordinate(ax, u, upper);
  return B(side * ax, y, s);
}

/** Lower / upper surface height at (ax, s); s must lie inside the chord. */
export function wingSurfY(ax: number, s: number, upper: boolean): number {
  const { le, te } = planform(ax);
  const u = clamp((s - le) / (te - le), 0, 1);
  return wingPt(ax, u, upper).y;
}

/** Main wheel well (lower wing, port side): centre (ax, s) and radius. */
export const WELL = { ax: 0.735, s: 3.13, r: 0.37 };
/** Leg bay slot from the well out to the pivot. */
export const SLOT = { ax0: 1.02, ax1: 2.1, s0: 3.08, s1: 3.44 };
/** Gun ports (half-span stations). */
export const GUNS = [2.5, 2.72, 2.94];
/** Aileron and flap spanwise limits (ax) and hinge chord fraction. */
export const CTRL = { flap0: 0.46, flap1: 3.2, ail0: 3.24, ail1: 5.2, hinge: 0.76 };
