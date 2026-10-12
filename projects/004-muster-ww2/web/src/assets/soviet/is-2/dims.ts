/**
 * IS-2 (1944, ChKZ, cast straightened nose) key dimensions.
 * Asset frame: metres, +Z forward, +X = the tank's left, y = 0 ground, origin at the hull centre.
 *
 * Verified reference numbers (see provenance in ../is-2.asset.ts):
 *  - length with gun forward 9.83 m, hull length 6.77 m, width 3.07 m, height 2.73 m (2.63 m in some
 *    Russian tables), ground clearance 0.42 m
 *  - upper glacis 60 deg from vertical (one plane, "straightened"), lower nose 30 deg, upper hull sides
 *    15 deg, upper rear 49 deg, lower rear 41 deg
 *  - six dual road wheels per side, 550 mm, torsion bars; three return rollers; rear sprocket with two
 *    removable 14-tooth rings; cast front idler of the road-wheel pattern with a crank tensioner
 *  - track: 86 single-horn links per side, 650 mm wide, pitch 162 mm; contact length 4.31 m
 *  - D-25T, 48 calibres including the muzzle brake
 * Plate junction heights, turret plan and fittings are proportioned from a scale side/front drawing
 * (Wikimedia Commons "IS-2 scheme.jpg") and museum photographs.
 */
const D = Math.PI / 180;
const T60 = Math.tan(60 * D);
const T30 = Math.tan(30 * D);
const T15 = Math.tan(15 * D);
const T49 = Math.tan(49 * D);
const T41 = Math.tan(41 * D);

const zN = 3.3; // nose: junction of the upper glacis and the lower nose (before rounding)
const yN = 1.02;
const yB = 0.42; // belly (ground clearance)
const yF = 1.295; // top of the sponson floor / track guards
const ySp = 1.265; // underside of the sponson floor
const yR = 1.73; // hull roof / engine deck
const xSp = 1.265; // upper side plate at track-guard level (outer face)
const xR = xSp - (yR - yF) * T15; // roof edge
const xL = 0.83; // lower hull side (outer face, between the tracks)
const xFe = 1.55; // outer edge of the track guards
const zRr = -3.3; // junction of the upper and lower rear plates
const yRr = 1.0;
const rNose = 0.14; // radius of the cast nose rounding

/** unit directions (z, y) of the glacis (up the plate) and the lower nose (down the plate) */
const uG: [number, number] = [-Math.sin(60 * D), Math.cos(60 * D)];
const uN: [number, number] = [-Math.sin(30 * D), -Math.cos(30 * D)];

export const H = {
  zN, yN, yB, yF, ySp, yR, xSp, xR, xL, xFe, zRr, yRr, rNose,
  tan60: T60, tan15: T15, tan49: T49,
  /** glacis plane: z at height y */
  glacisZ: (y: number) => zN - (y - yN) * T60,
  /** lower nose plane: z at height y */
  noseZ: (y: number) => zN - (yN - y) * T30,
  /** upper rear plate: z at height y */
  rearZ: (y: number) => zRr + (y - yRr) * T49,
  /** lower rear plate: z at height y */
  lowRearZ: (y: number) => zRr + (yRr - y) * T41,
  /** upper side plate: x at height y */
  sideX: (y: number) => xSp - (y - yF) * T15,
  /** fillet tangent points on the glacis (T1) and the lower nose (T2), fillet centre (z, y) */
  T1: [zN + uG[0] * rNose, yN + uG[1] * rNose] as [number, number],
  T2: [zN + uN[0] * rNose, yN + uN[1] * rNose] as [number, number],
  FC: [zN + (uG[0] + uN[0]) * rNose, yN + (uG[1] + uN[1]) * rNose] as [number, number],
  get zG() { return this.glacisZ(yR); },
  get zGs() { return this.glacisZ(yF); },
  get zBF() { return this.noseZ(yB); },
  get zRt() { return this.rearZ(yR); },
  get zRs() { return this.rearZ(yF); },
  get zBR() { return this.lowRearZ(yB); },
};

/** Running gear. */
export const R = {
  trackX: 1.21,
  trackW: 0.65,
  pitch: 0.162,
  links: 86,
  /** link: plate thickness (pitch line at its middle), grouser depth, guide-horn height */
  plateT: 0.045,
  grouser: 0.03,
  horn: 0.1,
  wheelR: 0.275,
  /** tyre rests on the inner face of the link (4 mm tyre compression) */
  get innerFace() { return this.grouser + this.plateT; },
  get wheelY() { return this.grouser + this.plateT + this.wheelR - 0.004; },
  get pathWheelY() { return this.grouser + this.plateT + this.wheelR; },
  /** six road wheels, 4.31 m between the first and the last axle */
  wheelZ: [2.2, 1.338, 0.476, -0.386, -1.248, -2.11],
  /** single disc width and the gap between the two discs of a pair (the guide horn runs in it) */
  tyreW: 0.14,
  tyreGap: 0.12,
  /** return rollers (three per side, dual) */
  rrZ: [1.77, 0.045, -1.68],
  rrY: 0.88,
  rrR: 0.14,
  /** idler (same pattern as the road wheels); z is solved for track tension */
  idlerY: 0.77,
  idlerZ: 2.95,
  /** sprocket: two 14-tooth rings, pitch radius from 14 x 162 mm */
  sprocketTeeth: 14,
  get sprocketR() { return (this.sprocketTeeth * this.pitch) / (2 * Math.PI); },
  sprocketY: 0.72,
  sprocketZ: -2.83,
  /** torsion-bar arm: pivot ahead of and above the wheel axle */
  armDz: 0.28,
  armDy: 0.25,
};

/** Turret: ring centre on the hull roof. Turret-local frame = hull frame shifted to (0, yR, z). */
export const T = {
  z: 0.45,
  y: yR,
  /** roof top (turret-local y) */
  roof: 0.74,
  /** trunnion / gun axis (turret-local) */
  trunY: 0.31,
  trunZ: 1.42,
  mantletR: 0.4,
  /** muzzle (turret-local z) -> overall length 9.83 m from the rear of the hull */
  muzzleZ: 6.445 - 0.45,
};
