/**
 * T-34-85 key dimensions (metres, asset frame: +Z forward, +X = tank's left, y = 0 ground).
 *
 * Verified reference numbers (see provenance in ../t-34-85.asset.ts):
 *  - hull length 6.10 m, length with gun forward ~8.1 m, width 3.00 m, height 2.70 m
 *  - ground clearance 0.40 m
 *  - road wheels 830 mm, five double wheels per side, no return rollers
 *  - track 500 mm wide, pitch 172 mm, 72 links per side (36 horned + 36 flat)
 *  - sprocket (rear) with six rollers, ~650 mm; idler (front) ~500 mm
 *  - turret ring 1600 mm
 *  - glacis 60 deg from vertical, lower nose plate ~53 deg, hull sides 40 deg
 *  - 85 mm ZiS-S-53, barrel 54.6 calibres
 * Everything else (plate junction heights, turret plan) is proportioned from drawings/photos.
 */
const T60 = Math.tan((60 * Math.PI) / 180);
const T53 = Math.tan((53 * Math.PI) / 180);
const T40 = Math.tan((40 * Math.PI) / 180);
const T47 = Math.tan((47 * Math.PI) / 180);
const T45 = 1;

const zN = 3.05; // nose (upper/lower glacis junction)
const yN = 0.78;
const yB = 0.4; // belly (ground clearance)
const ySp = 0.96; // underside of the sponsons (over the tracks)
const yR = 1.58; // hull roof / engine deck
const xSp = 1.47; // sponson outer edge
const xR = xSp - (yR - ySp) * T40; // roof edge (40 deg side plates)
const xL = 0.93; // lower hull side (between the tracks)
const zRr = -3.05; // rear plates junction
const yRr = 0.86;

export const H = {
  zN, yN, yB, ySp, yR, xSp, xR, xL, zRr, yRr,
  /** belly front / rear edge */
  zBF: zN - (yN - yB) * T53,
  zBR: zRr + (yRr - yB) * T45,
  /** glacis at roof level and at sponson level */
  zG: zN - (yR - yN) * T60,
  zGs: zN - (ySp - yN) * T60,
  /** upper rear plate at roof level and at sponson level */
  zRt: zRr + (yR - yRr) * T47,
  zRs: zRr + (ySp - yRr) * T47,
  tan60: T60,
  tan40: T40,
  tan47: T47,
  /** glacis plane: z at height y */
  glacisZ: (y: number) => zN - (y - yN) * T60,
  /** upper side plate: x at height y */
  sideX: (y: number) => xSp - (y - ySp) * T40,
  /** upper rear plate: z at height y */
  rearZ: (y: number) => zRr + (y - yRr) * T47,
};

/** Running gear. */
export const R = {
  gauge: 2.45,
  trackX: 2.45 / 2,
  trackW: 0.5,
  pitch: 0.172,
  links: 72,
  /** link: grouser (cleat) depth, plate thickness, guide-horn height */
  cleat: 0.02,
  plateT: 0.03,
  horn: 0.1,
  wheelR: 0.415,
  /** wheel centre height: tyre rests on the track's inner face (4 mm tyre compression) */
  wheelY: 0.02 + 0.03 + 0.415 - 0.004,
  /** wheel centre height used for the track path (uncompressed) */
  pathWheelY: 0.02 + 0.03 + 0.415,
  wheelZ: [1.88, 0.94, 0, -0.94, -1.88],
  /** single tyre width and the gap between the two tyres of a pair (guide horn passes) */
  tyreW: 0.15,
  tyreGap: 0.11,
  idlerR: 0.25,
  idlerY: 0.56,
  idlerZ: 2.64, // nominal; the track solver adjusts it (track tension)
  sprocketR: 0.329, // track inner face radius on the sprocket rims
  sprocketY: 0.56,
  sprocketZ: -2.69,
};

/** Turret: ring centre on the hull roof. */
export const T = {
  z: 0.8,
  y: yR,
  ring: 0.8,
  /** trunnion (turret-local) */
  trunY: 0.4,
  trunZ: 0.74,
  /** muzzle (turret-local z) -> overall length ~8.1 m */
  muzzleZ: 5.06 - 0.8,
};
