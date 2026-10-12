/**
 * Carrier, Universal, No. 1 Mk II - key dimensions.
 * Metres, asset frame: +Z forward, +X = the vehicle's left, y = 0 ground, origin at the footprint centre.
 *
 * Verified totals (see the provenance block in ../universal-carrier.asset.ts):
 *   - length 12 ft (3.66 m), width 6 ft 9 in (2.06 m), height 5 ft 2 in (1.57 m)
 *   - three road wheels per side on Horstmann springing: a two-wheel bogie at the front and a single
 *     wheel "half bogie" at the rear; final drive (Ford commercial axle) and drive sprockets at the rear,
 *     idlers at the front
 *   - driver seated on the right, gunner (Bren) on the left; Ford V8 in the centre of the hull between
 *     two rear compartments
 *   - tracks of narrow cast links, about 167-168 links per side, with twin guide horns
 * Everything else (plate junctions, wheel positions, fitting positions) is proportioned from photographs
 * and scale drawings against these totals.
 */

/** Track: centre line X, width, links per side, pitch, pin-line offsets. */
export const TRACK = {
  x: 0.885,
  width: 0.245,
  links: 167,
  /** chosen so that 167 links close the loop with the idler near its nominal position */
  pitch: 0.0429,
  /** pin line to the ground face (grouser tip) */
  outer: 0.021,
  /** pin line to the inner running face */
  inner: 0.011,
  /** twin guide horns: lane centre from the track centre line, and height above the running face */
  hornX: 0.064,
  hornH: 0.036,
};

/** Road wheels: pressed disc with a solid rubber tyre, sitting ~3 mm into the tyre at the contact. */
export const WHEEL = {
  r: 0.255,
  w: 0.1,
  y: TRACK.outer + TRACK.inner + 0.255 - 0.003,
  /** front bogie pair and the rear single wheel */
  z: [0.805, 0.215, -0.93],
};

/** Front idler (the tensioner): steel disc wheel; its z is nominal (the solver moves it). */
export const IDLER = { z: 1.43, y: 0.345, r: 0.212 };

/** Rear drive sprocket on the Ford axle: 15 teeth engaging every second link. */
export const SPROCKET = {
  z: -1.47,
  y: 0.352,
  teeth: 15,
  /** pin-circle radius: 30 joints on the circle */
  pitchR: TRACK.pitch / (2 * Math.sin(Math.PI / 30)),
};

/** Hull body. */
export const H = {
  /** hull side outer face */
  xSide: 0.7,
  /** plate thickness (sides, rear, belly) */
  t: 0.009,
  /** belly underside */
  belly: 0.205,
  /** top edge of the hull sides and rear plate */
  top: 1.04,
  /** rear plate and its lower edge; belly rear bend */
  rearZ: -1.765,
  rearLowY: 0.3,
  bellyRearZ: -1.62,
  /** nose: belly front bend, nose tip, upper nose plate top (= foot of the cab front plate) */
  bellyFrontZ: 1.56,
  noseZ: 1.83,
  noseY: 0.42,
  glacisTopZ: 1.5,
  glacisTopY: 0.9,
  /** driver's front panel (the "straight panel", right side and middle): top edge */
  cabFrontTopZ: 1.487,
  cabTopY: 1.4,
  /** hull side cheeks: rear end of the raised part (driver's side) and where they meet the side line */
  cabSideRearZ: 1.25,
  cabSideDropZ: 0.95,
  /** gunner's bay: angular box jutting out over the upper nose on the left, raised roof */
  bay: {
    backZ: 1.495,
    frontZ: 1.645,
    /** inner rear corner (at the driver's panel), front face edges */
    xInBack: 0.1,
    xInFront: 0.22,
    xOutFront: 0.58,
    topY: 1.57,
    roofRearZ: 1.3,
  },
  /** interior floor top */
  floor: 0.222,
  /** track guards: underside height, outer edge */
  guardY: 0.628,
  guardX: 1.03,
  /** divisional plate between the front compartment and the rear compartments / engine */
  divZ: 0.62,
};

/** Engine housing along the centre line. */
export const ENGINE = {
  halfW: 0.32,
  /** top half width (the upper edges are chamfered) */
  topHalfW: 0.22,
  shoulderY: 0.95,
  topY: 1.075,
  frontZ: H.divZ,
  rearZ: H.rearZ + 0.012,
};

/** Crew positions (seat centres). Driver on the right (-X), gunner on the left (+X). */
export const CREW = {
  driverX: -0.39,
  gunnerX: 0.4,
  seatZ: 0.86,
  seatY: 0.49,
};

/**
 * Bren gun mounting in the gunner's hood (asset frame): top of the pedestal / fork crossbar, and the
 * gun's grip origin (weapon-local origin) with the bore level at the aperture centre.
 */
export const BREN = {
  /** aperture centre (x, y) in the gunner's hood face */
  x: 0.39,
  y: 1.3,
  /** fork of the pivot mounting (under the gun's gas-cylinder casing) */
  pivot: [0.39, 1.19, 1.45] as [number, number, number],
  /** weapon origin (pistol-grip centre, 148 mm below the bore) */
  origin: [0.39, 1.3 - 0.148, 1.0] as [number, number, number],
};
