/**
 * Key dimensions of the Pz.Kpfw. IV Ausf. H (metres, asset frame: +Z forward, +X = vehicle left,
 * origin on the ground at the hull footprint centre).
 *
 * Verified reference numbers (see provenance in panzer-iv-h.asset.ts):
 *   hull length ~5.89-5.92 m, 7.02 m with gun forward, width 2.88 m (3.29 m with skirts),
 *   height 2.68 m, ground clearance 0.40 m, track 400 mm wide, 99 links per side,
 *   8 road wheels of 470 mm per side, 4 return rollers of 250 mm per side,
 *   turret ring 1680 mm, turret offset 66.5 mm to the left of the centre line,
 *   KwK 40 L/48 barrel 3615 mm.
 * Positions of individual components were laid out from published scale drawings/photos and
 * cross-checked against these totals.
 */

/** Track centre line (X), width, pitch and link count. */
export const TRACK = {
  x: 1.22,
  width: 0.4,
  pitch: 0.12,
  links: 99,
  /** pin line height above the ground on the bottom run */
  pinY: 0.017,
  /** inner running surface height above the ground on the bottom run */
  innerY: 0.031,
};

export const WHEEL = {
  r: 0.235,
  /** tyre width of one disc (470/90) */
  tyreW: 0.09,
  /** gap between the two discs (guide horn passes here) */
  gap: 0.075,
  /** centre height (tyre pressed ~3 mm onto the link) */
  y: 0.263,
};

/** Bogie centres (Z) and wheel offset from the bogie centre. */
export const BOGIE_Z = [1.52, 0.51, -0.5, -1.51];
export const BOGIE_HALF = 0.2575;

export const RETURN_ROLLER = { r: 0.125, y: 0.855, z: [1.63, 0.64, -0.36, -1.34] };

export const SPROCKET = { z: 2.43, y: 0.64, pitchR: (18 * 0.12) / (2 * Math.PI) };

export const IDLER = { z: -2.47, y: 0.54, r: 0.3 };

/** Hull heights. */
export const H = {
  belly: 0.4,
  fender: 1.07,
  roof: 1.72,
};

/** Hull X half-widths (outer faces). */
export const W = {
  lower: 0.915,
  upper: 1.04,
  fender: 1.44,
  skirt: 1.645,
};

/** Hull side profile key points (z, y). */
export const P = {
  noseBottom: [2.64, 0.52] as [number, number],
  noseTop: [2.53, 1.0] as [number, number],
  glacisTop: [1.985, 1.185] as [number, number],
  driverTop: [1.9, 1.72] as [number, number],
  bellyFront: [2.08, 0.4] as [number, number],
  bellyRear: [-2.3, 0.4] as [number, number],
  rearLowBottom: [-2.6, 0.56] as [number, number],
  rearLowTop: [-2.66, 1.07] as [number, number],
  rearUpTop: [-2.56, 1.72] as [number, number],
};

/** Turret ring centre and turret base height. */
export const TURRET = { x: 0.0665, z: 0.25, y: 1.735, ringR: 0.84 };

/** Gun axis height (global) and trunnion Z in turret-local coordinates. */
export const GUN = { y: 2.05, trunnionZ: 0.78, muzzleZ: 4.075 };
