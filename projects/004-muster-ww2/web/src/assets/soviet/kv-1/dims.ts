/**
 * KV-1 Model 1941 (welded turret, 76.2 mm ZiS-5) key dimensions.
 * Asset frame: metres, +Z forward, +X = the tank's left, y = 0 ground, origin at the hull centre.
 *
 * Reference numbers (see provenance in ../kv-1.asset.ts):
 *  - hull length 6.675 m (6.75 m in English-language tables), width 3.32 m, height 2.71 m,
 *    ground clearance 0.45 m
 *  - six dual road wheels per side (600 mm), individual torsion bars; three rubber-tyred return
 *    rollers; rear drive sprocket, front idler
 *  - track 700 mm wide, pitch 160 mm, 86-90 single-horn links per side
 *  - ZiS-5 gun, 41.6 calibres (barrel ~3.17 m)
 * Plate junction heights, the turret plan and the fitting positions are proportioned from
 * photographs and published drawings; they are estimates, not factory figures.
 */
const zF = 6.675 / 2; // front of the nose / rear of the hull (hull centred on z = 0)

export const H = {
  zF,
  /** belly (ground clearance) and the front / rear belly edges */
  yB: 0.45,
  zBF: 2.98,
  zBR: -3.02,
  /** nose: junction of the lower nose plate and the glacis */
  zN: zF,
  yN: 0.95,
  /** top of the sponson floor / track guards and the underside of the sponson floor */
  yF: 1.13,
  ySp: 1.1,
  /** glacis top = foot of the upper front (driver's) plate */
  zG: 2.87,
  /** hull roof / engine deck and its front / rear edges */
  yR: 1.8,
  zRf: 2.48,
  zRt: -2.95,
  /** upper rear plate foot (at track-guard level) */
  zRb: -zF,
  /** lower hull sides (outer face), upper hull sides (outer face), outer edge of the guards */
  xL: 0.9,
  xSp: 1.33,
  xFe: 1.665,
};

/** Point (z, y) on the upper front plate at height y. */
export const frontZ = (y: number) => H.zG + ((y - H.yF) / (H.yR - H.yF)) * (H.zRf - H.zG);
/** Point (z, y) on the upper rear plate at height y. */
export const rearZ = (y: number) => H.zRb + ((y - H.yF) / (H.yR - H.yF)) * (H.zRt - H.zRb);

/** Running gear. */
export const R = {
  trackX: 1.31,
  trackW: 0.7,
  pitch: 0.16,
  links: 88,
  /** link: plate thickness (pitch line at its middle), grouser depth, guide-horn height */
  plateT: 0.045,
  grouser: 0.03,
  horn: 0.1,
  wheelR: 0.3,
  get innerFace() { return this.grouser + this.plateT; },
  /** tyre rests on the inner face of the link (4 mm tyre compression) */
  get wheelY() { return this.grouser + this.plateT + this.wheelR - 0.004; },
  get pathWheelY() { return this.grouser + this.plateT + this.wheelR; },
  /** six road wheels, 0.87 m apart */
  wheelZ: [2.2, 1.33, 0.46, -0.41, -1.28, -2.15],
  /** single disc width and the gap between the two discs of a pair (the guide horn runs in it) */
  tyreW: 0.155,
  tyreGap: 0.13,
  /** return rollers (three per side, dual, rubber tyred) */
  rrZ: [1.76, 0.02, -1.72],
  rrY: 0.86,
  rrR: 0.125,
  /** front idler; z is solved for track tension */
  idlerY: 0.62,
  idlerR: 0.29,
  idlerZ: 2.98,
  /** sprocket: 14 teeth on the 160 mm pitch */
  sprocketTeeth: 14,
  get sprocketR() { return (this.sprocketTeeth * this.pitch) / (2 * Math.PI); },
  sprocketY: 0.64,
  sprocketZ: -2.92,
  /** torsion-bar arm: pivot ahead of and above the wheel axle */
  armDz: 0.3,
  armDy: 0.2,
};

/** Turret: ring centre on the hull roof. Turret-local frame = hull frame shifted to (0, yR, z). */
export const T = {
  z: 0.45,
  /** roof (turret-local y) */
  roof: 0.8,
  /** side walls (half width), front plate, rear plate (turret-local z) */
  hx: 0.99,
  zFront: 0.9,
  hxFront: 0.6,
  zCheek: 0.52,
  zRear: -1.36,
  hxRear: 0.8,
  zRearCh: -1.16,
  /** rear of the turret ring: behind it the bottom of the bustle is undercut */
  zNiche: -0.8,
  yNiche: 0.14,
  /** trunnion / gun axis (turret-local) */
  trunY: 0.41,
  trunZ: 0.72,
  mantletR: 0.3,
  /** barrel: breech face 0.45 m behind the trunnions, 41.6 calibres of 76.2 mm */
  get muzzleZ() { return this.trunZ - 0.45 + 41.6 * 0.0762; },
};
