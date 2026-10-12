/**
 * SU-76M light self-propelled gun key dimensions (late production, 1944-45).
 * Asset frame: metres, +Z forward, +X = the vehicle's left, y = 0 ground, origin at the hull centre.
 *
 * Reference numbers (see provenance in ../su-76m.asset.ts):
 *  - length ~4.97-5.0 m, width 2.72-2.74 m, height 2.1-2.2 m, ground clearance 0.30 m
 *  - hull front: upper plate 25 mm at 60 deg, lower plate 35 mm at 30 deg (from the vertical);
 *    sides 15 mm vertical; casemate front 25 mm at 25 deg, casemate sides 10 mm at ~20 deg
 *  - T-70 derived running gear lengthened by one road wheel: six small (550 mm) rubber-tyred road
 *    wheels per side on individual torsion bars, three return rollers, front drive sprocket, rear
 *    idler of the road-wheel pattern; small-link 300 mm tracks
 *  - 76.2 mm ZiS-3Sh (ZiS-3 ordnance, 41.6 calibres) with a two-chamber muzzle brake
 * Plate junction heights, the casemate plan and all fitting positions are proportioned from
 * photographs and scale drawings; they are estimates, not factory figures.
 */
const T25 = Math.tan((25 * Math.PI) / 180);
const T20 = Math.tan((20 * Math.PI) / 180);

export const H = {
  /** nose apex (junction of the upper and lower front plates) */
  zN: 2.45,
  yN: 0.64,
  /** belly and the foot of the lower nose plate (30 deg from the vertical) */
  yB: 0.3,
  get zBF() { return this.zN - (this.yN - this.yB) * Math.tan((30 * Math.PI) / 180); },
  /** hull roof (driver's compartment / engine deck) */
  yR: 1.25,
  /** top of the upper front plate (60 deg from the vertical) */
  get zG() { return this.zN - (this.yR - this.yN) / Math.tan((30 * Math.PI) / 180); },
  /** hull rear face and the lower rear plate (30 deg) */
  zRear: -2.42,
  yRm: 0.5,
  get zRB() { return this.zRear + (this.yRm - this.yB) * Math.tan((30 * Math.PI) / 180); },
  /** lower hull side (outer face) */
  xL: 0.99,
  /** track guards / sponson floor (top face) and their outer edge */
  yF: 0.735,
  xFe: 1.375,
  /** guards run from zFeF to zFeR */
  zFeF: 2.46,
  zFeR: -2.46,
};

/** Casemate (fighting compartment). */
export const C = {
  /** foot of the front plate on the hull roof (z at y = H.yR) */
  zFoot: 0.35,
  /** top edge height of the front plate and sides */
  yTop: 2.14,
  /** rear top of the sides (cut down) and the rear plate top (late, higher rear plate) */
  yRearTop: 1.8,
  /** sides: full height back to zTopR, then sloping down to zCutR */
  zTopR: -1.3,
  zCutR: -1.86,
  /** side plate outer face at the guard level */
  xBase: 1.345,
  tFront: 0.025,
  tSide: 0.012,
  tRear: 0.012,
};
/** z of the casemate front plate (outer face) at height y. */
export const frontZ = (y: number) => C.zFoot - (y - H.yR) * T25;
/** |x| of the casemate side plate (outer face) at height y. */
export const sideX = (y: number) => C.xBase - (y - H.yF) * T20;
export const FRONT_N: [number, number, number] = [0, Math.sin((25 * Math.PI) / 180), Math.cos((25 * Math.PI) / 180)];
export const SIDE_N = (sx: number): [number, number, number] => [sx * Math.cos((20 * Math.PI) / 180), Math.sin((20 * Math.PI) / 180), 0];

/** Running gear. */
export const R = {
  trackX: 1.222,
  trackW: 0.3,
  pitch: 0.111,
  /** link plate thickness (pitch line at its middle), grouser depth, guide-horn height and x */
  plateT: 0.018,
  grouser: 0.014,
  horn: 0.07,
  hornX: 0.078,
  wheelR: 0.275,
  get innerFace() { return this.grouser + this.plateT; },
  /** tyre rests on the inner face of the link (3 mm tyre compression) */
  get wheelY() { return this.grouser + this.plateT + this.wheelR - 0.003; },
  get pathWheelY() { return this.grouser + this.plateT + this.wheelR; },
  /** six road wheels, evenly pitched */
  wheelZ: [1.68, 1.02, 0.36, -0.3, -0.96, -1.62],
  /** tyre width (runs between the two guide horns) */
  tyreW: 0.11,
  /** return rollers (three per side) */
  rrZ: [1.2, 0.03, -1.13],
  rrY: 0.54,
  rrR: 0.085,
  /** rear idler (road-wheel pattern); z is solved for track tension, target idlerZ */
  idlerY: 0.4,
  get idlerR() { return this.wheelR; },
  idlerZ: -2.2,
  /** front drive sprocket: 13 teeth on the 111 mm pitch */
  sprocketTeeth: 13,
  get sprocketR() { return (this.sprocketTeeth * this.pitch) / (2 * Math.PI); },
  sprocketY: 0.45,
  sprocketZ: 2.22,
  /** torsion-bar trailing arm: pivot ahead of / behind and above the wheel axle */
  armDz: 0.26,
  armDy: 0.12,
};

/**
 * Gun: ZiS-3Sh ordnance. Cradle-local frame (as in the ZiS-3 modules): origin on the trunnion axis,
 * +Z along the bore, bore axis at y = boreAbove.
 */
export const GD = {
  /** trunnion axis in the hull frame */
  trunY: 1.53,
  trunZ: 0.0,
  trunX: 0.0,
  boreAbove: 0.045,
  breechRear: -0.86,
  breechFront: -0.52,
  muzzle: 2.63,
  brakeLen: 0.36,
  cradleRear: -0.49,
  cradleFront: 0.95,
};
