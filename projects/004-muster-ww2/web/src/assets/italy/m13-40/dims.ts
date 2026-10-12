/**
 * Carro Armato M13/40 key dimensions (metres, asset frame: +Z forward, +X = the tank's left,
 * y = 0 ground, origin at the footprint centre).
 *
 * Published reference numbers (see provenance in ../m13-40.asset.ts):
 *  - length 4.915 m, width 2.28 m, height 2.37 m, ground clearance 0.41 m
 *  - tracks 26 cm wide, 80 links per side (regioesercito.it; tanks-encyclopedia gives 84)
 *  - per side two leaf-sprung bogie units, each with two rocking sub-bogies carrying two double
 *    road wheels (8 double wheels per side), three rubber-tyred return rollers, front drive sprocket,
 *    rear idler with the track tensioner
 * Plate junction heights, wheel stations and the turret plan are proportioned from photographs and
 * general-arrangement views (not factory drawings).
 */

/** Hull. */
export const H = {
  /** belly underside (ground clearance) */
  belly: 0.41,
  /** lower hull side half width (between the tracks) */
  xLow: 0.8,
  /** superstructure / engine compartment side half width (over the tracks) */
  xSup: 1.02,
  /** sponson floor = track guard line */
  yGuard: 1.0,
  /** fighting compartment roof */
  yRoof: 1.66,
  /** engine deck (front edge, rear edge) */
  yDeck: 1.55,
  yDeckRear: 1.53,
  /** engine compartment side half width (narrower than the superstructure: fenders alongside) */
  xEng: 0.84,
  /** superstructure front plate: bottom (z at yGuard) and top (z at yRoof) */
  zFrontBot: 1.6,
  zFrontTop: 1.44,
  /** rear wall of the fighting compartment / start of the engine deck */
  zStep: -0.4,
  /** engine deck rear edge, rear upper (sloped) plate bottom */
  zDeckRear: -2.04,
  zRear: -2.33,
  yRearKnee: 1.22,
  /** nose: front edge z, lower and upper edge heights; belly front edge */
  zNose: 2.33,
  yNoseLow: 0.72,
  yNoseTop: 0.8,
  zBellyF: 1.96,
  /** glacis top (meets the superstructure front plate) */
  yGlacisTop: 1.105,
  /** lower hull rear plate */
  zLowRear: -2.33,
  yLowRearBot: 0.62,
  zBellyR: -2.1,
  /** outer edge of the track guards */
  xGuard: 1.135,
};

const plateT = 0.018; // link shoe thickness
const cleat = 0.012; // ground-side grouser depth
const inner = plateT + cleat; // wheel path height above ground on the bottom run
const wheelR = 0.155;

/** Running gear (one side, the tank's left, x = +R.trackX). */
export const R = {
  trackX: 1.005,
  trackW: 0.26,
  links: 80,
  plateT,
  cleat,
  inner,
  /** centre guide horn height above the shoe's inner face */
  horn: 0.05,
  wheelR,
  /** road wheel centre: tyre pressed 3 mm onto the link's inner face */
  wheelY: inner + wheelR - 0.003,
  pathWheelY: inner + wheelR,
  /** single tyre width and the gap between the two tyres (guide horn lane) */
  tyreW: 0.072,
  tyreGap: 0.056,
  /** bogie unit centres; sub-bogie centres at +/- subDz; wheels at +/- wheelDz from those */
  unitZ: [0.63, -0.79],
  subDz: 0.36,
  wheelDz: 0.176,
  /** return rollers */
  rollerR: 0.068,
  rollerY: 0.852,
  rollerZ: [1.02, 0.0, -1.1],
  /** front drive sprocket */
  sprocketZ: 2.2,
  sprocketY: 0.735,
  teeth: 10,
  /** rear idler (nominal; fixed, the pitch is solved to close the loop) */
  idlerR: 0.205,
  idlerZ: -2.16,
  idlerY: 0.56,
};

/** wheel centre z list (front to rear) */
export function wheelZs(): number[] {
  const out: number[] = [];
  for (const u of R.unitZ) for (const s of [R.subDz, -R.subDz]) for (const w of [R.wheelDz, -R.wheelDz]) out.push(u + s + w);
  return out.sort((a, b) => b - a);
}

/** Turret: ring centre on the fighting compartment roof. */
export const T = {
  z: 0.43,
  y: H.yRoof + 0.012,
  /** body height */
  h: 0.53,
  /** gun axis (turret-local) */
  gunY: 0.27,
  gunX: -0.05,
  /** co-axial MG, to the LEFT of the gun (tank's left, +X) */
  mgX: 0.17,
  /** front plate at mid height (turret-local z) */
  zFront: 0.6,
};
