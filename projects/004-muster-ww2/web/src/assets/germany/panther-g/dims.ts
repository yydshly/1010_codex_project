/**
 * Key dimensions of the Pz.Kpfw. V Panther Ausf. G (1944-45), in metres.
 * Asset frame: +Z forward, +X = vehicle left, origin on the ground at the footprint centre.
 *
 * Verified reference numbers (see provenance in panther-g.asset.ts):
 *   hull length 6.87 m, 8.66 m with the gun forward, width 3.27 m (3.42 m over the Schuerzen),
 *   height 2.99 m, crew 5, 7.5 cm KwK 42 L/70; upper glacis 80 mm at 55 deg, lower glacis 60 mm at
 *   55 deg, upper hull sides 50 mm at 29 deg (the Ausf. G one-piece side plate), lower sides
 *   40 mm vertical, turret front 100 mm, turret sides 45 mm at 25 deg; eight torsion-bar stations
 *   per side with double 860 mm road wheels in the interleaved Schachtellaufwerk (16 wheels per
 *   side); Kgs 64/660/150 track: 660 mm wide, 150 mm pitch, 87 links per side.
 * Heights of the hull, the station spacing, sprocket/idler positions and the turret layout were
 * estimated from photographs and published drawings and cross-checked against these totals.
 */

/** Track: centre line X, width, pitch, link count; pin line and running surface heights. */
export const TRACK = {
  x: 1.305,
  width: 0.66,
  pitch: 0.15,
  links: 87,
  pinY: 0.03,
  innerY: 0.06,
};

/** Road wheel: radius, tyre width, centre height (tyre pressed ~4 mm onto the link). */
export const WHEEL = { r: 0.43, tyreW: 0.1, y: 0.486 };

/** Wheel stations (Z of the axles), front to rear. */
export const STATION_Z = Array.from({ length: 8 }, (_, i) => 1.9 - 0.53 * i);

/**
 * Lateral wheel planes, offset from the track centre (+ = outwards). The single central guide
 * horn runs between the two discs of every station.
 *   odd stations (1, 3, 5, 7 from the front, index 0, 2, 4, 6): inner pair B + D
 *   even stations (2, 4, 6, 8, index 1, 3, 5, 7): outer pair A + C
 */
export const PLANE = { a: 0.24, b: 0.11, c: -0.11, d: -0.24 };

/**
 * Drive sprocket (17 teeth on 150 mm pitch); two tooth rings hugging the guide horn, so the
 * sprocket and the idler run between the inner wheel rows and may overlap them in side view.
 */
export const SPROCKET = { z: 2.68, y: 0.7, teeth: 17, pitchR: (17 * 0.15) / (2 * Math.PI), ringX: 0.04 };

/** Idler; z is solved by the track so the loop closes with exactly TRACK.links links. */
export const IDLER = { z: -2.51, y: 0.64, r: 0.33, discX: 0.04 };

/** Hull heights. */
export const H = {
  belly: 0.56,
  /** underside of the sponsons over the tracks = nose (upper / lower glacis joint) */
  sponson: 1.15,
  roof: 1.96,
};

/** Hull half-widths (outer faces). */
export const W = {
  /** lower hull side plates */
  lower: 0.87,
  /** upper side plates at the sponson floor and at the roof (29 deg slope) */
  sideBottom: 1.56,
  sideTop: 1.56 - (1.96 - 1.15) * Math.tan((29 * Math.PI) / 180),
  /** outer edge of the track guards */
  fender: 1.665,
};

const T55 = Math.tan((55 * Math.PI) / 180);
const T30 = Math.tan((30 * Math.PI) / 180);

/** Hull nose (upper / lower glacis joint), z. */
export const NOSE_Z = 3.435;
/** Upper glacis outer face: z at height y. */
export const glacisZ = (y: number) => NOSE_Z - (y - H.sponson) * T55;
/** Lower glacis outer face: z at height y (y <= H.sponson). */
export const lowerGlacisZ = (y: number) => NOSE_Z - (H.sponson - y) * T55;
/** Rear plate: bottom edge and outer face z at height y (top leaning forward 30 deg). */
export const REAR = { bottomY: 0.9, bottomZ: -3.435 };
export const rearZ = (y: number) => REAR.bottomZ + (y - REAR.bottomY) * T30;
/** Belly rear edge (lower rear plate runs from here up to the rear plate bottom). */
export const BELLY_REAR_Z = -3.08;
/** Upper side plate outer face: x at height y. */
export const sideX = (y: number) => W.sideBottom - (y - H.sponson) * Math.tan((29 * Math.PI) / 180);

/** Glacis and rear plate angles (deg from vertical). */
export const GLACIS_DEG = 55;
export const REAR_DEG = 30;
export const SIDE_DEG = 29;

/** Turret ring centre (on the hull roof) and turret base height. */
export const TURRET = { x: 0, z: 0.2, y: H.roof };

/** Gun axis height (global), trunnion Z (turret local) and muzzle Z (global, 8.66 m overall). */
export const GUN = { y: 2.3, trunnionZ: 0.88, muzzleZ: -3.435 + 8.66 };
