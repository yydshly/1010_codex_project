/**
 * Sherman Firefly Vc (Sherman V = Medium Tank M4A4 converted to the OQF 17-pdr) - key dimensions.
 * Metres, asset frame: +Z forward, +X = the tank's left, y = 0 ground, origin at the footprint centre.
 *
 * Verified reference numbers (see the provenance block in ../sherman-firefly.asset.ts):
 *   - M4A4 hull 238.5 in (6.06 m) long, 103 in (2.62 m) wide, 108 in (2.74 m) high (split hatch)
 *   - M4A4 engine compartment lengthened by 11 in; VVSS bogie centres 63 5/8 in apart instead of 57 in
 *   - T48/T51 track, 16 9/16 in wide, 83 shoes per side, 160 in ground contact (M4A3: 79, 147 in)
 *   - glacis 2 in at 56 deg from vertical (welded "small hatch" hull), three-piece bolted final drive
 *   - Firefly: 25 ft 6 in (7.77 m) overall on the 19 ft 4 in Sherman I hull, i.e. the 17-pdr muzzle
 *     projects about 1.88 m beyond the nose; the Vc keeps the same front end, so the same overhang
 * The front half (sprocket, final drive, front bogie, turret ring) is the common Sherman layout and
 * follows the M4A3(75)W model of this project shifted forward by ZS; the rear is lengthened.
 * Plate junction heights and fitting positions are proportioned from photographs against the totals.
 */
const IN = 0.0254;

/** Forward shift of the common Sherman front end relative to the M4A3 model (centres the hull). */
export const ZS = 0.07;

/** Track: centre line X, width, pitch, shoes per side, pin-line offsets. */
export const TRACK = {
  x: (83 * IN) / 2, // 1.054
  width: 16.5625 * IN, // 0.421
  pitch: 6 * IN, // 0.1524
  links: 83,
  /** pin line height on the bottom run (outer rubber + chevron below it) */
  pinY: 2.1875 * IN, // 0.0556
  /** inner running surface above the pin line */
  inner: 1.5625 * IN, // 0.0397
  /** outer (ground) surface below the pin line */
  outer: 2.1875 * IN,
  /** end connector / guide horn lane centre, from the track centre line */
  hornX: 0.19,
};

/** Road wheel 20 x 9 in, pressed ~3 mm into the rubber pad. */
export const WHEEL = {
  r: 10 * IN, // 0.254
  w: 9 * IN, // 0.229
  y: TRACK.pinY + TRACK.inner + 10 * IN - 0.003,
};

/** Bogie pitch: the M4A3 model's 1.58 m plus the M4A4's extra 6 5/8 in (ground contact 160 in). */
const BP = 1.58 + 6.625 * IN;
/** Three VVSS bogies per side; wheel centres +/- half from the bogie centre. */
export const BOGIE = {
  z: [1.53 + ZS, 1.53 + ZS - BP, 1.53 + ZS - 2 * BP],
  half: 0.285,
};

/** Return roller on the upswept rear bracket of each bogie (bogie-relative z). */
export const ROLLER = { r: 0.083, w: 0.2, dz: -0.3, y: 0.868 };

/** Front drive sprocket (13 teeth), pitch radius at the pin line. */
export const SPROCKET = { z: 2.47 + ZS, y: 0.72, pitchR: (25.038 * IN) / 2, teeth: 13 };

/** Rear idler 22 in; its z is the nominal tensioner position (the track solver adjusts it). */
export const IDLER = { z: -2.68, y: 0.44, r: 11 * IN };

/** Hull heights and half-widths. */
export const H = {
  /** belly underside (ground clearance) */
  belly: 17.125 * IN,
  /** underside of the sponsons over the tracks */
  sponson: 1.12,
  /** hull roof / engine deck top */
  roof: 1.93,
  /** lower hull side outer face */
  xLow: 0.8,
  /** upper hull (sponson) side outer face */
  xSide: 1.305,
  /** glacis lower edge (joint with the final drive housing), outer face */
  glacisY: 1.03,
  glacisZ: 2.79 + ZS,
  /** upper rear plate: top at deck level, bottom at the sponson line */
  rearTopZ: -2.8,
  rearBotZ: -3.03,
  /** lower rear plate (vertical) and its bottom transition to the belly */
  lowRearZ: -2.84,
  lowRearY: 0.56,
  bellyRearZ: -2.66,
  bellyFrontZ: 2.42 + ZS,
  /** plate thicknesses */
  tGlacis: 2.0 * IN,
  tSide: 1.5 * IN,
  tRoof: 0.75 * IN,
  tBelly: 1.0 * IN,
};

/** Glacis slope, degrees from vertical (small-hatch welded hull). */
export const GLACIS_DEG = 56;
const TG = Math.tan((GLACIS_DEG * Math.PI) / 180);
/** glacis top edge (meets the roof) */
export const GLACIS_TOP_Z = H.glacisZ - (H.roof - H.glacisY) * TG;

/** Drivers' hoods protruding from the glacis: x range, top front edge z, front face slope. */
export const HOOD = { x0: 0.13, x1: 0.77, zTop: 1.9, frontDeg: 30 };

/** Turret: ring centre on the roof; gun axis at the 88 in fire height. */
export const TURRET = {
  z: 0.05 + ZS,
  ringR: (69 * IN) / 2 + 0.03,
  /** turret-local gun axis height above the roof plane */
  gunY: 88 * IN - 1.93,
  /** trunnion distance ahead of the ring centre */
  trunZ: 0.8,
  /** muzzle z in turret-local coordinates: 1.88 m beyond the nose */
  muzzleZ: 3.035 + 1.88 - (0.05 + ZS),
  /** roof height above the hull roof plane */
  roofY: 0.74,
};
