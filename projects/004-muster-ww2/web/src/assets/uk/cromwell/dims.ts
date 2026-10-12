/**
 * Cromwell Mk IV key dimensions (metres, asset frame: +Z forward, +X = the tank's left, y = 0 ground).
 *
 * Verified reference numbers (see provenance in ../cromwell.asset.ts):
 *  - length 6.35 m (20 ft 10 in), width 2.908 m (9 ft 6.5 in), height 2.49 m (8 ft 2 in)
 *  - ground clearance 0.41 m (16 in)
 *  - Christie suspension, five road wheels per side, no return rollers (slack track resting on
 *    the road wheels), rear drive sprocket, front idler with the track adjuster
 *  - 14 in (356 mm) manganese-steel dry-pin tracks with a centre guide, 4 in (101.6 mm) pitch,
 *    124-125 links per side
 *  - turret ring 60 in (1524 mm)
 *  - 75 mm OQF Mk V, barrel 3.00 m (L/40)
 * Plate junction heights, the turret plan and the wheel stations are proportioned from photographs
 * and published side/front views (not factory drawings).
 */

const xS = 1.02; // hull side outer face (the hull box sits between the tracks)
const yB = 0.41; // belly (ground clearance)
const yR = 1.56; // hull roof / engine deck
const yG = 1.0; // track guard top surface
const zF = 2.93; // vertical front (driver's) plate, outer face
const yL = 0.94; // nose ledge top (bottom of the vertical front plate)
const zN = 3.03; // front edge of the nose ledge (top of the lower nose plate)
const zBF = 2.45; // belly front edge
const zRr = -3.02; // rear plate outer face
const yRl = 0.66; // bottom of the vertical rear plate
const zBR = -2.74; // belly rear edge

export const H = {
  xS, yB, yR, yG, zF, yL, zN, zBF, zRr, yRl, zBR,
  /** outer face of the track-guard side plates */
  guardX: 1.452,
  /** guard ends (with the mud flaps) */
  zGF: 3.17,
  zGR: -3.17,
  /** plate thicknesses */
  tFront: 0.064,
  tSide: 0.032,
  tRoof: 0.02,
  tRear: 0.032,
};

const plateT = 0.02; // link shoe thickness
const cleat = 0.012; // ground-side grouser depth
const wheelR = 0.405;
const inner = plateT + cleat; // height of the link's wheel path above the ground on the bottom run
const pitch = 0.1016;
const teeth = 20;

/** Running gear. */
export const R = {
  trackX: 1.255,
  trackW: 0.356,
  pitch,
  links: 125,
  plateT,
  cleat,
  /** centre guide horn height above the shoe's inner face */
  horn: 0.072,
  wheelR,
  /** wheel centre: tyre rests on the link's inner face (4 mm tyre compression) */
  wheelY: inner + wheelR - 0.004,
  /** wheel centre height used for the track path (uncompressed) */
  pathWheelY: inner + wheelR,
  wheelZ: [1.75, 0.85, -0.05, -0.95, -1.85],
  /** single tyre width and the gap between the two tyres of a pair (the guide horn runs in it) */
  tyreW: 0.13,
  tyreGap: 0.07,
  idlerR: 0.29,
  idlerY: 0.6,
  idlerZ: 2.6, // nominal; the track solver adjusts it (track tension)
  /** sprocket: pitch radius chosen so the link pitch matches the tooth spacing exactly */
  teeth,
  sprocketPitchR: (pitch * teeth) / (2 * Math.PI),
  sprocketY: 0.62,
  sprocketZ: -2.78,
};

/** Turret: ring centre on the hull roof. */
export const T = {
  z: 0.4,
  /** underside of the turret body (a small gap over the hull roof, covered by the splash ring) */
  y: yR + 0.022,
  ring: 0.762,
  /** turret-local plan: half width, front face, rear face; body height */
  xW: 0.9,
  zF: 0.86,
  zR: -1.02,
  h: 0.72,
  /** trunnion (turret-local) */
  trunY: 0.34,
  trunZ: 0.78,
  /** muzzle, turret-local z (3.0 m barrel from the breech face) */
  muzzleZ: 3.1,
};
