/**
 * Key dimensions of the Sturmgeschuetz III Ausf. G (metres, asset frame: +Z forward, +X = vehicle
 * left, origin on the ground at the hull footprint centre).
 *
 * Reference totals (see provenance in stug-iii-g.asset.ts): length ~6.77-6.85 m with the gun,
 * width 2.95 m without Schuerzen, height 2.16 m, ground clearance ~0.39 m. Panzer III chassis:
 * 400 mm Kgs 61/400/120 track (93 links per side), six 520 mm twin road wheels per side on
 * torsion bars, three return rollers, front drive sprocket, rear idler.
 * Positions of individual components were laid out from photographs and published drawings and
 * cross-checked against these totals; they are not factory drawing values.
 */

export const TRACK = {
  x: 1.255,
  width: 0.4,
  pitch: 0.12,
  links: 93,
  /** pin line height above the ground on the bottom run */
  pinY: 0.017,
  /** inner running surface height above the ground on the bottom run */
  innerY: 0.031,
};

export const WHEEL = {
  r: 0.26,
  /** tyre width of one disc (520/95) */
  tyreW: 0.095,
  /** gap between the two discs (guide horn passes here) */
  gap: 0.07,
  /** centre height (tyre pressed ~3 mm onto the link) */
  y: 0.288,
};

/** Road wheel stations (Z), front to rear. */
export const WHEEL_Z = [1.43, 0.858, 0.286, -0.286, -0.858, -1.43];
/** Torsion bar arm: pivot sits this far ahead of the wheel centre (trailing arms). */
export const ARM = { dz: 0.3, y: 0.46 };

export const RETURN_ROLLER = { r: 0.12, y: 0.85, z: [1.16, 0.0, -1.16] };

export const SPROCKET = { z: 2.3, y: 0.63, teeth: 18, pitchR: (18 * 0.12) / (2 * Math.PI) };

export const IDLER = { z: -2.35, y: 0.5, r: 0.28 };

/** Hull heights. */
export const H = {
  belly: 0.385,
  fender: 1.04,
  deck: 1.46,
  roof: 1.94,
};

/** Hull X half-widths (outer faces). */
export const W = {
  lower: 0.96,
  /** engine compartment sides above the track guards */
  engine: 1.18,
  fender: 1.475,
  /** casemate pannier side: at the track guard and at the roof */
  panBase: 1.38,
  panTop: 1.14,
};

type P2 = [number, number];
/** Hull side profile key points (z, y). */
export const P = {
  bellyFront: [2.05, 0.385] as P2,
  noseBottom: [2.62, 0.6] as P2,
  noseTop: [2.5, 0.95] as P2,
  glacisTop: [1.93, 1.19] as P2,
  /** casemate front plate top edge (10 deg lean) */
  frontTop: [1.826, 1.78] as P2,
  /** front edge of the flat roof (sloped roof plate from frontTop) */
  roofFront: [1.35, 1.94] as P2,
  /** casemate rear wall (vertical) */
  caseRearZ: -0.62,
  /** engine deck rear edge, upper rear plate bottom */
  deckRear: [-2.34, 1.46] as P2,
  rearUpBottom: [-2.5, 1.04] as P2,
  rearLowBottom: [-2.46, 0.56] as P2,
  bellyRear: [-2.2, 0.385] as P2,
};

/** Gun: axis offset to the vehicle's right, height, mantlet face and muzzle Z. */
export const GUN = { x: -0.12, y: 1.45, mantletZ: 2.1, muzzleZ: 4.06 };
