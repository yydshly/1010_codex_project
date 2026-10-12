/**
 * Key dimensions of the Pz.Kpfw. VI Tiger Ausf. E, mid-production (July 1943 pattern), in metres.
 * Asset frame: +Z forward, +X = vehicle left, origin on the ground at the footprint centre.
 *
 * Verified reference numbers (see provenance in tiger-i.asset.ts):
 *   hull length 6.316 m, 8.45 m with the gun forward, width 3.547 m over the 725 mm combat tracks
 *   (3.142 m on transport tracks), height ~2.9-3.0 m (2.885 m quoted for the low cupola),
 *   firing height (gun axis) 2.195 m, ground clearance 0.47 m, 800 mm road wheels on 8 torsion-bar
 *   stations per side 515 mm apart with three wheels per arm (24 per side), 96 links of 130 mm
 *   pitch per track, 20-tooth drive sprocket, 700 mm idler, turret ball race 2100 mm.
 * The side profile of the plates and the position of fittings were laid out from photographs and
 * published scale drawings and cross-checked against these totals; the track loop is solved so
 * that exactly 96 links close it.
 */

/** Track: centre line X, width, pitch, link count; pin line and running surface heights. */
export const TRACK = {
  x: 1.411,
  width: 0.725,
  pitch: 0.13,
  links: 96,
  pinY: 0.028,
  innerY: 0.05,
};

/** Road wheel: radius, tyre width, centre height (tyre pressed ~4 mm onto the link). */
export const WHEEL = { r: 0.4, tyreW: 0.095, y: 0.446 };

/** Wheel stations (Z of the axles), front to rear, 515 mm apart. Odd stations = index 0, 2, 4, 6. */
export const STATION_Z = Array.from({ length: 8 }, (_, i) => 1.78 - 0.515 * i);

/**
 * Lateral wheel planes, offset from the track centre (+ = outwards). The original 520 mm track
 * layout (three symmetric rows, central row doubled) sits on the inner part of the 725 mm combat
 * track; the extra outermost wheel of every arm runs on the outer extension.
 *   odd stations:  P1 (outermost single) + P4/P5 (central double, between the guide horns)
 *   even stations: P2/P3 (outer pair) + P6 (inner row)
 */
export const PLANE = {
  p1: 0.3,
  p2: 0.195,
  p3: 0.09,
  p4: -0.0525,
  p5: -0.1525,
  p6: -0.295,
  hornA: 0.0225,
  hornB: -0.2275,
  /** centre of the two central rows (sprocket rings and idler run here) */
  mid: -0.1025,
};

/** Drive sprocket (20 teeth on 130 mm pitch). */
export const SPROCKET = { z: 2.6, y: 0.72, teeth: 20, pitchR: (20 * 0.13) / (2 * Math.PI) };

/** Idler (700 mm); z is solved by the track so the loop closes with 96 links. */
export const IDLER = { z: -2.27, y: 0.52, r: 0.35 };

/** Hull heights. */
export const H = {
  belly: 0.47,
  /** underside of the sponsons (pannier floor) over the tracks */
  sponson: 1.2,
  /** top of the hull roof */
  roof: 1.8,
};

/** Hull half-widths (outer faces). */
export const W = {
  lower: 0.915,
  upper: 1.571,
  /** outer edge of the side track guards */
  guard: 1.765,
};

/** Side-profile key points (z, y) of the hull (outer faces). */
export const P = {
  bellyFront: [2.4, 0.47] as [number, number],
  noseBottom: [2.98, 0.68] as [number, number],
  noseTop: [2.76, 1.18] as [number, number],
  glacisTop: [2.56, 1.2] as [number, number],
  frontTop: [2.465, 1.8] as [number, number],
  bellyRear: [-2.4, 0.47] as [number, number],
  rearBottom: [-2.84, 0.66] as [number, number],
  rearTop: [-2.74, 1.8] as [number, number],
};

/** Turret ring centre (on the hull roof) and turret base height. */
export const TURRET = { x: 0, z: 0.3, y: 1.81 };

/** Gun axis height (global), trunnion Z (turret local) and muzzle Z (global, 8.45 m overall). */
export const GUN = { y: 2.195, trunnionZ: 0.7, muzzleZ: 5.292 };
