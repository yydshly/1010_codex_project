/**
 * Type 97 medium tank Chi-Ha (original 57 mm gun turret) - key dimensions.
 * Metres, asset frame: +Z forward, +X = the tank's left, y = 0 ground, origin at the footprint centre.
 *
 * Verified reference numbers (see provenance in ../chi-ha.asset.ts):
 *  - length 5.50 m, width 2.33 m, height 2.21-2.23 m, crew 4
 *  - riveted rolled-plate hull on a frame; published nose plate angles are ~80 deg (upper) and ~62 deg
 *    (lower) to the vertical - modelled at ~75 / ~50 deg so the nose closes over the final drives
 *  - bell-crank suspension: six double-tyred road wheels per side, the four centre wheels paired in
 *    two bogies, the end wheels independently on bell cranks; armoured compression-spring housings
 *  - three return rollers per side (the centre one carries only the inner half of the track)
 *  - front drive sprocket, rear idler, 96 single-guide-horn links per side
 *  - two-man turret offset to the right, commander's cupola, rear-turret MG, horseshoe (handrail)
 *    radio antenna round the turret
 * Plate junction heights, wheel stations, the track width (~0.33 m) and the turret plan are
 * proportioned from photographs and published side/front views (not factory drawings).
 */

/** Hull. */
export const H = {
  /** lower hull side outer face (between the tracks) */
  xLow: 0.66,
  /** superstructure side outer face (over the tracks) */
  xSide: 1.04,
  /** track-guard (fender) outer edge */
  xGuard: 1.165,
  /** inner edge of the guard where it runs clear of the superstructure (front and rear) */
  xGuardIn: 0.83,
  /** belly underside (ground clearance ~0.40 m) */
  yBelly: 0.4,
  /** sponson floor / fender level */
  yGuard: 0.955,
  /** hull roof (fighting compartment and engine deck) */
  yRoof: 1.5,
  /** lower nose plate: belly front edge (z) up to the nose ridge (z, y) */
  zBellyF: 2.12,
  zNose: 2.62,
  yNose: 0.82,
  /** upper nose plate (glacis) runs back from the ridge to the superstructure front foot */
  zFrontBot: 2.12,
  /** superstructure front plate tops: driver's cab (right, -X) and hull-MG plate (left, +X) */
  zTopCab: 1.93,
  zTopMG: 1.8,
  /** x of the step between the driver's cab plate and the MG plate */
  xStep: -0.04,
  /** engine deck rear edge; the upper rear plate slopes down to (zRearBot, yGuard) */
  zDeckR: -2.16,
  zRearBot: -2.58,
  /** lower rear plate: top (z at yGuard) and bottom (zLowRear, yLowRear); belly rear edge */
  zLowRearTop: -2.52,
  zLowRear: -2.5,
  yLowRear: 0.58,
  zBellyR: -2.3,
  /** turret / engine compartment bulkhead line on the roof */
  zBulkhead: -0.42,
  /** guard ends */
  zGuardF: 2.74,
  zGuardR: -2.74,
  /** plate thicknesses */
  tFront: 0.025,
  tSide: 0.02,
  tRoof: 0.012,
  tRear: 0.02,
};

const plateT = 0.018; // link shoe thickness
const cleat = 0.012; // grouser depth on the ground side
const inner = plateT + cleat;

/** Running gear (left side, x > 0; mirrored for the right). */
export const R = {
  trackX: 1.0,
  trackW: 0.33,
  links: 96,
  plateT,
  cleat,
  /** centre guide horn height above the shoe's inner face */
  horn: 0.06,
  wheelR: 0.235,
  /** wheel centre: tyre rests on the link inner face (4 mm compression) */
  wheelY: inner + 0.235 - 0.004,
  pathWheelY: inner + 0.235,
  /** road wheel stations: front (independent), bogie A pair, bogie B pair, rear (independent) */
  wheelZ: [1.72, 1.02, 0.46, -0.36, -0.92, -1.62],
  /** single tyre width and the gap between the two tyres (the guide horn runs in it) */
  tyreW: 0.1,
  tyreGap: 0.07,
  /** front drive sprocket; pitch radius is re-derived by the track solver to match the link pitch */
  sprocketZ: 2.36,
  sprocketY: 0.6,
  sprocketR0: 0.27,
  /** rear idler */
  idlerZ: -2.4,
  idlerY: 0.5,
  idlerR: 0.22,
  /** return rollers */
  rollerZ: [1.22, 0.05, -1.12],
  rollerR: 0.075,
};

/** Turret: ring centre on the hull roof (offset to the right, -X). */
export const T = {
  x: -0.16,
  z: 0.52,
  /** base (bottom) radius, roof radius, body height */
  rBase: 0.66,
  rTop: 0.53,
  h: 0.5,
  /** rear bustle extension beyond the round body */
  bustle: 0.2,
  /** gun trunnion (turret-local) */
  gunY: 0.25,
  gunZ: 0.62,
  /** barrel length ahead of the trunnion (57 mm L/18.4 ~ 1.05 m) */
  barrel: 1.05,
};
