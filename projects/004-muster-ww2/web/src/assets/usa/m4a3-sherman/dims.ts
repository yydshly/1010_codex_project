/**
 * M4A3(75)W Sherman (Fisher Tank Arsenal, VVSS) - key dimensions.
 * Metres, asset frame: +Z forward, +X = the tank's left, y = 0 ground, origin at the footprint centre.
 *
 * Verified reference numbers (TM 9-759 "Tank, Medium, M4A3", Hunnicutt-derived data sheets, see the
 * provenance block in ../m4a3-sherman.asset.ts):
 *   - length 232.5 in (5.91 m) without sand shields (M4A3 mid production), 20 ft 7 in (6.27 m) over the
 *     sand shields; width 103 in (2.62 m) without, 105 in (2.67 m) with sand shields
 *   - height 108 in (2.74 m) over the split commander's hatch, 115.7 in (2.94 m) over the vision cupola
 *   - tread (track centres) 83 in (2.108 m), ground clearance 17 1/8 in (0.435 m), fire height 88 in
 *   - turret ring 69 in inside diameter
 *   - glacis 2.5 in at 47 deg; sides 1.5 in vertical; rear 1.5 in at 0-22 deg; top 0.75 in
 *   - road wheels 20 x 9 in, idler 22 x 9 in, sprocket 13 teeth / 25.038 in pitch diameter
 *   - tracks 16 9/16 in wide, 6 in pitch, 79 shoes per track, ground contact length 147 in
 *   - T51/T48 rubber shoes: 1 9/16 in inner and 2 3/16 in outer thickness about the pin line
 * Everything else (plate junction heights, bogie and fitting positions) is proportioned from
 * photographs and published drawings and cross-checked against these totals.
 */
const IN = 0.0254;

/** Track: centre line X, width, pitch, shoes per side, pin-line offsets. */
export const TRACK = {
  x: (83 * IN) / 2, // 1.054
  width: 16.5625 * IN, // 0.421
  pitch: 6 * IN, // 0.1524
  links: 79,
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

/** Three VVSS bogies per side; wheel centres +/- half from the bogie centre. */
export const BOGIE = {
  z: [1.53, -0.05, -1.63],
  half: 0.285,
};

/** Return roller on the upswept rear bracket of each bogie (bogie-relative z). */
export const ROLLER = { r: 0.083, w: 0.2, dz: -0.3, y: 0.868 };

/** Front drive sprocket (13 teeth), pitch radius at the pin line. */
export const SPROCKET = { z: 2.47, y: 0.72, pitchR: (25.038 * IN) / 2, teeth: 13 };

/** Rear idler 22 in; its z is the nominal tensioner position (the track solver adjusts it). */
export const IDLER = { z: -2.44, y: 0.44, r: 11 * IN };

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
  /** glacis lower edge (joint with the differential housing), outer face */
  glacisY: 1.03,
  glacisZ: 2.79,
  /** upper rear plate: top at deck level, bottom at the sponson line */
  rearTopZ: -2.62,
  rearBotZ: -2.87,
  /** lower rear plate (vertical) and its bottom transition to the belly */
  lowRearZ: -2.62,
  lowRearY: 0.56,
  bellyRearZ: -2.45,
  bellyFrontZ: 2.42,
  /** plate thicknesses */
  tGlacis: 2.5 * IN,
  tSide: 1.5 * IN,
  tRoof: 0.75 * IN,
  tBelly: 1.0 * IN,
};

const T47 = Math.tan((47 * Math.PI) / 180);
/** glacis top edge (meets the hatch casting / roof) */
export const GLACIS_TOP_Z = H.glacisZ - (H.roof - H.glacisY) * T47;

/** Turret: ring centre on the roof; gun axis at the 88 in fire height. */
export const TURRET = {
  z: 0.05,
  ringR: (69 * IN) / 2 + 0.03,
  /** turret-local gun axis height above the roof plane */
  gunY: 88 * IN - 1.93,
  /** trunnion distance ahead of the ring centre */
  trunZ: 0.8,
  /** muzzle z in turret-local coordinates (flush with the nose: "0 overhang") */
  muzzleZ: 2.88,
  /** roof height above the hull roof plane */
  roofY: 0.74,
};
