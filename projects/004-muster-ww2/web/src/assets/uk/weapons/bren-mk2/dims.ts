/**
 * Bren Mk II key dimensions in the design frame ("B-frame"): z = 0 at the rear face of the butt plate,
 * y = 0 on the bore axis, +x = the gun's left side; the muzzle (face of the flash hider) is at
 * z = 1.156 (overall length 1,156 mm, barrel 635 mm).
 *
 * Proportions: overall and barrel length from published figures; the body, butt, pistol grip, magazine,
 * barrel furniture and bipod positions were measured from a scaled right-side photograph of a Mk II
 * (Athens War Museum) levelled on the bore axis, and cross-checked against views of Inglis Mk IIs and a
 * left-side view; widths (not visible in side views) are estimated from oblique photographs.
 */
import { keyInterp, type Sec } from '../common/geo';

export const BR = {
  length: 1.156,
  muzzleZ: 1.156,
  breechZ: 0.521,

  // ---- body (receiver) and trigger group
  body: { z0: 0.236, z1: 0.578, hw: 0.025, top: 0.005, bot: -0.054 },
  /** raised top behind the magazine (rear-sight bed) */
  rearTop: { z0: 0.283, z1: 0.372, y: 0.012, hw: 0.022 },
  /** magazine housing on top of the body */
  housing: { z0: 0.372, z1: 0.578, y: 0.03, yFront: 0.018, zStep: 0.515, hw: 0.0235 },
  /** magazine opening in the housing top (x half width, z range) */
  opening: { z0: 0.402, z1: 0.5, hw: 0.0158 },
  /** cocking-handle slot on the right side */
  slot: { z0: 0.268, z1: 0.424, y0: -0.0415, y1: -0.0295, depth: 0.005 },
  handleZ: 0.411,
  trigGroup: { z0: 0.262, z1: 0.4, hw: 0.0185, bot: -0.07 },
  grip: { zRearTop: 0.29, zFrontTop: 0.344, top: -0.068, bot: -0.163, rakeDeg: 4 },
  triggerZ: 0.364,
  guard: { z0: 0.345, z1: 0.393, bot: -0.103 },
  changeLeverZ: 0.3,

  // ---- butt
  buttFront: 0.236,
  plate: 0.0022,

  // ---- lower frame (gas-cylinder casing) and gas cylinder under the barrel
  frame: { z0: 0.578, z1: 0.783, top: -0.021, bot: -0.056, hw: 0.015 },
  gasY: -0.037,
  gasR: 0.0125,
  gasCylFront: 0.866,
  tripodLugZ: 0.737,

  // ---- barrel furniture
  nut: { z0: 0.572, z1: 0.59, r: 0.0198 },
  handleBand: { z0: 0.668, z1: 0.711, r: 0.0186 },
  gasBlock: { z0: 0.866, z1: 0.905 },
  sleeve: { z0: 0.831, z1: 0.866, r: 0.0168 },
  foreCollar: { z0: 1.06, z1: 1.091, r: 0.0124 },
  flashRear: 1.091,

  // ---- sights (offset to the LEFT of the magazine)
  sightX: 0.0255,
  rearSightZ: 0.291,
  foreSightZ: 1.069,
  /** foresight blade tip height above the bore */
  foreTipY: 0.0372,

  // ---- magazine: side outline follows an arc (rimmed .303 rounds)
  mag: { baseZ: 0.451, baseY: 0.03, depth: 0.094, thick: 0.028, R: 0.296, th0: 6, th1: 37, insert: 0.014 },

  // ---- bipod (sleeve on the gas cylinder behind the gas block)
  bipod: { z: 0.8505, pivotY: -0.069, crossY: -0.0585, crossZ: 0.8415, armX: 0.0165, legX: 0.0238, legR: 0.0082, len: 0.3, spreadDeg: 13, rakeDeg: 8 },
};

/** Barrel outer radius at z (B-frame), ignoring the bands and collars. */
export const BARREL: [number, number][] = [
  [0.578, 0.0152],
  [0.668, 0.0148],
  [0.711, 0.0142],
  [0.768, 0.0138],
  [0.774, 0.0126],
  [0.866, 0.0126],
  [0.905, 0.0098],
  [1.06, 0.0096],
];
export function barrelR(z: number): number {
  let r = BARREL[0][1];
  for (const [zz, rr] of BARREL) if (z >= zz) r = rr;
  return r;
}

// ------------------------------------------------------------------------------------------------
// Butt sections: [z, half width, top, split, bottom, eTop, eBot]
const BUTT_KEYS: number[][] = [
  [0.0022, 0.0205, 0.0006, -0.056, -0.1178, 3.4, 3.0],
  [0.03, 0.0204, 0.0004, -0.05, -0.1106, 3.4, 3.0],
  [0.07, 0.0199, 0.0, -0.045, -0.1003, 3.4, 3.0],
  [0.1, 0.0192, -0.0008, -0.042, -0.0926, 3.3, 3.0],
  [0.114, 0.0186, -0.0035, -0.042, -0.089, 3.2, 3.0],
  [0.128, 0.0178, -0.009, -0.041, -0.0854, 3.1, 3.0],
  [0.142, 0.0171, -0.0132, -0.04, -0.0818, 3.1, 3.0],
  [0.16, 0.0166, -0.0148, -0.039, -0.0772, 3.2, 3.1],
  [0.2, 0.0163, -0.0153, -0.038, -0.0669, 3.4, 3.2],
  [0.236, 0.0163, -0.0155, -0.037, -0.058, 3.6, 3.4],
];
const toSec = ([hw, yTop, ySplit, yBot, eTop, eBot]: number[]): Sec => ({ hw, yTop, ySplit, yBot, eTop, eBot });
export const buttSec = (z: number): Sec => toSec(keyInterp(BUTT_KEYS, z));

/** Magazine centre line: point and direction at arc angle th (deg) in the (z, y) plane. */
export function magCentre(thDeg: number): { z: number; y: number; dz: number; dy: number } {
  const g = BR.mag;
  const t0 = (g.th0 * Math.PI) / 180, t = (thDeg * Math.PI) / 180;
  return {
    z: g.baseZ + g.R * (Math.cos(t0) - Math.cos(t)),
    y: g.baseY + g.R * (Math.sin(t) - Math.sin(t0)),
    dz: Math.sin(t),
    dy: Math.cos(t),
  };
}

/** Pistol-grip hand centre (B-frame): on the grip axis 40 mm below the top of the grip. */
export function gripCentre(): [number, number, number] {
  const g = BR.grip;
  const zMid = (g.zRearTop + g.zFrontTop) / 2;
  const d = 0.04;
  const r = (g.rakeDeg * Math.PI) / 180;
  return [0, g.top - d * Math.cos(r), zMid - d * Math.sin(r)];
}
