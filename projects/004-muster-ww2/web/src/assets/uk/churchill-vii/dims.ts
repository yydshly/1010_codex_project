/**
 * Churchill Mk VII (A22F) key dimensions (metres, asset frame: +Z forward, +X = the tank's left,
 * y = 0 ground).
 *
 * Verified reference numbers (see provenance in ../churchill-vii.asset.ts):
 *  - length 7.44 m (24 ft 5 in), width 3.25 m (10 ft 8 in); published height 2.49 m (8 ft 2 in)
 *    for the family - the Mk VII with its commander's cupola stands about 2.7 m in the model
 *  - eleven bogies per side, each with two 10 in (254 mm) wheels
 *  - 22 in (559 mm) cast manganese-steel tracks, 7.96 in (202 mm) pitch, 72 links per side quoted
 *    (the modelled path takes 80)
 *  - tracks run round the full height of the hull: the top run passes over the side panniers,
 *    front idler high in the nose "horn", drive sprocket high at the rear
 * Plate junction heights, the turret plan and the bogie spacing are proportioned from photographs
 * and published side views (not factory drawings).
 */

/** hull body side (between the tracks), outer face */
const xH = 1.03;
/** belly */
const yB = 0.5;
/** hull roof / engine deck */
const yR = 1.68;
/** vertical front (driver's) plate, outer face, and the bottom of it */
const zF = 3.3;
const yF = 1.0;
/** belly front edge (bottom of the lower nose plate) */
const zBF = 2.78;
/** vertical rear plate, outer face, and its bottom */
const zRr = -3.2;
const yRl = 0.92;
/** belly rear edge */
const zBR = -2.9;

export const H = {
  xH, yB, yR, zF, yF, zBF, zRr, yRl, zBR,
  tFront: 0.15,
  tSide: 0.095,
  tRoof: 0.025,
  tRear: 0.05,
  /** pannier (track frame) outer plate, outer face */
  xP: 1.585,
  /** bottom of the pannier (bogie mounting face) */
  yPb: 0.42,
  /** track guard: top surface height and outer edge */
  yG: 1.64,
  xG: 1.635,
  zGF: 3.56,
  zGR: -3.5,
};

const pitch = 0.2021; // 7.96 in
const t = 0.04; // link body thickness (pitch line at its centre)
const cleat = 0.012; // ground-side grouser depth
const wheelR = 0.127; // 10 in wheels
const idlerR = 0.3;
const teeth = 10;

/** Running gear. */
export const R = {
  trackX: 1.345,
  trackW: 0.559,
  pitch,
  t,
  cleat,
  /** pitch line height on the ground run */
  yPitch: t / 2 + cleat,
  /** inner (wheel) face height on the ground run */
  yInner: t + cleat,
  horn: 0.06,
  wheelR,
  /** wheel centre (2 mm compression) */
  wheelY: t + cleat + wheelR - 0.002,
  pathWheelY: t + cleat + wheelR,
  /** 11 bogie stations, front to rear */
  wheelZ: Array.from({ length: 11 }, (_, i) => 2.45 - i * 0.5),
  /** inner / outer wheel centre offset from the track centre, wheel width */
  wheelDX: 0.15,
  wheelW: 0.1,
  idlerR,
  idlerZ: 3.385,
  idlerY: 1.57 - idlerR - t / 2, // top of the pitch line at y = 1.57 (level top run)
  teeth,
  sprocketPitchR: (pitch * teeth) / (2 * Math.PI),
  sprocketZ: -3.36,
  sprocketY: 1.57 - (pitch * teeth) / (2 * Math.PI),
};

/** Turret: ring centre on the hull roof. */
export const T = {
  z: 0.85,
  y: yR + 0.02,
  ring: 0.74,
  /** turret-local plan at the base: half width, front face, rear face; body height */
  xW: 0.92,
  zF: 0.92,
  zR: -1.02,
  h: 0.8,
  /** top plan inset (cast sides lean in slightly) */
  inset: 0.055,
  trunY: 0.36,
  /** muzzle, turret-local z */
  muzzleZ: 3.42,
};
