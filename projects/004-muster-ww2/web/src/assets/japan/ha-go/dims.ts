/**
 * Type 95 light tank Ha-Go (late production, longer 37 mm gun) - key dimensions.
 * Metres, asset frame: +Z forward, +X = the tank's left, y = 0 ground, origin at the footprint centre.
 *
 * Verified reference numbers (see provenance in ../ha-go.asset.ts):
 *  - length 4.38 m, width 2.06-2.07 m, height 2.13-2.28 m (sources differ), crew 3, 7.4 t
 *  - riveted hull; one-man turret offset to the LEFT, driver front right, hull MG front left
 *  - engine at the rear offset to the right; exhaust out of the right side into a silencer on the
 *    right rear track guard
 *  - bell-crank suspension: two bogies per side with two road wheels each, a long horizontal coil
 *    spring in a tube along the hull side between them, two return rollers, front sprocket, rear idler
 *  - narrow all-steel track about 0.25 m wide, roughly 98 links per side
 * Plate junction heights, wheel stations and the turret plan are proportioned from photographs and
 * published views (not factory drawings).
 */

/** Hull. */
export const H = {
  /** lower hull side outer face (between the tracks) */
  xLow: 0.6,
  /** superstructure: sponson floor outer edge, widest point of the bulged side, roof edge */
  xFloor: 0.8,
  xBulge: 0.905,
  yBulge: 1.1,
  xRoof: 0.86,
  /** track-guard outer edge (overall width 2.07 m) */
  xGuard: 1.035,
  /** belly underside (ground clearance ~0.40 m) */
  yBelly: 0.4,
  /** sponson floor / track-guard level */
  yGuard: 0.88,
  /** hull roof (fighting compartment and engine deck) */
  yRoof: 1.46,
  /** lower nose plate: belly front edge up to the nose ridge */
  zBellyF: 1.9,
  zNose: 2.03,
  yNose: 0.72,
  /** glacis rises from the nose ridge to the superstructure front foot */
  zFrontBot: 1.52,
  /** superstructure front plate top edge (plate leans back ~20 deg) */
  zFrontTop: 1.31,
  /** engine deck rear edge; the upper rear plate slopes down to (zRearBot, yGuard) */
  zDeckR: -1.66,
  zRearBot: -1.96,
  /** lower rear plate: top (z at yGuard) and bottom; belly rear edge */
  zLowRearTop: -1.93,
  zLowRear: -1.92,
  yLowRear: 0.56,
  zBellyR: -1.74,
  /** turret / engine compartment bulkhead line on the roof */
  zBulkhead: -0.12,
  /** guard ends */
  zGuardF: 2.18,
  zGuardR: -2.12,
  tFront: 0.014,
  tSide: 0.012,
  tRoof: 0.009,
  tRear: 0.01,
};

const plateT = 0.016; // link shoe thickness
const cleat = 0.01; // grouser depth on the ground side
const inner = plateT + cleat;

/** Running gear (left side, x > 0; mirrored for the right). */
export const R = {
  trackX: 0.87,
  trackW: 0.25,
  links: 98,
  plateT,
  cleat,
  /** centre guide horn height above the shoe's inner face */
  horn: 0.05,
  wheelR: 0.25,
  /** wheel centre: tyre rests on the link inner face (4 mm compression) */
  wheelY: inner + 0.25 - 0.004,
  pathWheelY: inner + 0.25,
  /** road wheel stations: bogie A (front pair), bogie B (rear pair) */
  wheelZ: [1.09, 0.5, -0.5, -1.09],
  /** single tyre width and the gap between the two tyres (the guide horn runs in it) */
  tyreW: 0.072,
  tyreGap: 0.052,
  /** front drive sprocket; pitch radius is re-derived by the track solver to match the link pitch */
  sprocketZ: 1.8,
  sprocketY: 0.53,
  sprocketR0: 0.235,
  /** rear idler */
  idlerZ: -1.83,
  idlerY: 0.36,
  idlerR: 0.215,
  /** return rollers (one over each bogie) */
  rollerZ: [0.8, -0.72],
  rollerR: 0.06,
  /** spring tube axis height and the bogie pivot height above the wheel centres */
  springY: 0.56,
};

/** Turret: ring centre on the hull roof (offset to the left, +X). */
export const T = {
  x: 0.2,
  z: 0.66,
  /** base (bottom) radius, roof radius, body height */
  rBase: 0.52,
  rTop: 0.44,
  h: 0.48,
  /** rear bustle extension beyond the round body */
  bustle: 0.08,
  /** gun trunnion (turret-local) */
  gunY: 0.24,
  /** barrel length ahead of the mantlet face */
  barrel: 0.86,
};
