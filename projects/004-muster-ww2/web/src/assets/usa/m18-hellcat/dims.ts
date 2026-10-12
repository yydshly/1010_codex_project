/**
 * 76 mm Gun Motor Carriage M18 "Hellcat" - key dimensions.
 * Metres, asset frame: +Z forward, +X = the vehicle's left, y = 0 ground, origin at the hull footprint centre.
 *
 * Verified reference numbers (see the provenance block in ../m18-hellcat.asset.ts):
 *   - length 208 in (5.28 m) without the gun, 21 ft 10 in (6.65 m) with it; gun overhang 54 in (1.37 m)
 *   - width 113 in (2.87 m); height 101 in (2.57 m) over the .50 cal AA machine gun
 *   - ground clearance 14.25 in (0.362 m); tread (track centres) 94.625 in (2.40 m)
 *   - T69 centre-guide, single-pin, rubber-bushed steel track: 12 in shoe (14.375 in over the pins),
 *     5.09 in (129 mm) pitch, 83 shoes per side; ground contact length 116.5 in (2.96 m)
 *   - torsion bar suspension, 5 dual road wheels and 4 dual return rollers per side, front sprocket,
 *     rear idler; turret ring 69 in
 * Wheel diameters, plate junction heights and fitting positions are proportioned from photographs and
 * published drawings against these totals.
 */
const IN = 0.0254;

export const LEN = 208 * IN; // 5.283
export const HALF_L = LEN / 2; // 2.642

/** Track: centre line X, width, pitch, shoes per side, pin-line offsets. */
export const TRACK = {
  x: (94.625 * IN) / 2, // 1.202
  width: 12 * IN, // 0.305
  pinWidth: 14.375 * IN, // 0.365
  pitch: 0.129,
  links: 83,
  /** pin line height on the bottom run (grouser tips on the ground) */
  pinY: 0.034,
  /** wheel running surface above the pin line */
  inner: 0.012,
  /** dual wheel tyre centres from the track centre line (straddling the centre guide) */
  dual: 0.086,
};

/** Dual rubber-tyred road wheels (5 per side), pressed ~3 mm into the steel running surface. */
export const WHEEL = {
  r: 0.325,
  /** width of ONE tyre */
  w: 0.1,
  y: TRACK.pinY + TRACK.inner + 0.325 - 0.003,
  z: [1.47, 0.73, -0.01, -0.75, -1.49],
};

/** Torsion-bar arm: trailing arm, pivot ahead of the wheel spindle. */
export const ARM = { dz: 0.34, dy: 0.2, x: 0.985 };

/** Dual return rollers (4 per side) on brackets from the hull side. */
export const ROLLER = { r: 0.068, w: 0.075, y: 0.845, z: [1.1, 0.36, -0.38, -1.12] };

/** Front drive sprocket, pitch radius at the pin line (13 teeth at 129 mm pitch). */
export const SPROCKET = { z: 2.29, y: 0.665, teeth: 13, pitchR: 0.129 / (2 * Math.sin(Math.PI / 13)) };

/** Rear toothed idler; its z is nominal (the track solver places it so 83 shoes close the loop). */
export const IDLER = { z: -2.27, y: 0.5, r: 0.235, teeth: 12 };

/** Hull heights and half-widths. */
export const H = {
  belly: 14.25 * IN, // 0.362
  /** sponson floor over the tracks */
  sponson: 1.0,
  /** hull roof / engine deck */
  roof: 1.45,
  /** lower hull side outer face */
  xLow: 0.93,
  /** upper hull side at the sponson line (outer face) and at the roof edge */
  xSideLow: 1.4,
  xSideTop: 1.235,
  /** nose: lower plate (45 deg) from the belly up to the knuckle, upper glacis back to the roof */
  bellyFrontZ: 1.98,
  noseY: 0.96,
  noseZ: 2.6,
  glacisTopZ: 1.74,
  /** rear plate (vertical) and the lower rear plate sloping in to the belly */
  rearZ: -2.62,
  rearLowY: 0.72,
  bellyRearZ: -2.32,
  tPlate: 0.0127,
  tSide: 0.0127,
  tRoof: 0.0095,
};

/** Turret: ring centre on the roof, gun axis and muzzle in turret-local coordinates. */
export const TURRET = {
  z: 0.12,
  ringR: (69 * IN) / 2, // 0.876
  /** wall height above the roof */
  h: 0.63,
  /** gun axis height above the roof plane */
  gunY: 0.36,
  /** trunnion distance ahead of the ring centre */
  trunZ: 0.86,
  /** muzzle z in turret-local coordinates (gun overhang 54 in beyond the hull front) */
  muzzleZ: HALF_L + 54 * IN - 0.12,
};
