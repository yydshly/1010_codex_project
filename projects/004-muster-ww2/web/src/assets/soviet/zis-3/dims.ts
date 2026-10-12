/**
 * Key dimensions of the 76 mm divisional gun M1942 (ZiS-3), metres.
 *
 * Authoring frame ("construction frame"): axle centre line on X at z = 0, ground at y = 0,
 * +Z towards the muzzle, +X the gun's left (gunner's side). The asset entry shifts the finished
 * model so the origin sits at the footprint centre.
 *
 * Reference numbers (see provenance in zis-3.asset.ts):
 *  - length travelling 6.095 m, width 1.645 m, height 1.375 m
 *  - barrel length 3,490 mm, line of fire (bore axis) 875 mm
 *  - GAZ-AA type wheels, 6.50-20 tyres (sponge-filled "GK"), two-window discs, 5-stud hubs
 *  - shield 5 mm; upper (main) shield, movable shield on the cradle, lower hinged shield
 *  - split tubular trails with spades; elevation -5..+37 deg, traverse 54 deg
 */
export const D = {
  /** Tyre outer radius (6.50-20: ~0.84 m diameter). */
  tyreR: 0.42,
  /** Rim bead radius (20 in rim). */
  rimR: 0.254,
  /** Tyre section width. */
  tyreW: 0.165,
  /** Wheel centre height: tyre radius minus ~15 mm static deflection. */
  axleY: 0.405,
  /** Wheel (tyre centre plane) half track. */
  wheelX: 0.725,

  /** Trunnion axis position (construction frame). */
  trunY: 0.83,
  trunZ: 0.0,
  /** Bore axis height above the trunnion axis (line of fire 0.875 m at 0 deg). */
  boreAbove: 0.045,

  /** Barrel: rear face of breech ring and muzzle, measured along the bore from the trunnion. */
  breechRear: -0.86,
  breechFront: -0.52,
  muzzle: 2.63,
  brakeLen: 0.36,

  /** Cradle extent along the bore (trunnion frame). */
  cradleRear: -0.49,
  cradleFront: 0.95,

  /** Main shield plane (construction frame z) and top height. */
  shieldZ: 0.26,
  shieldTop: 1.375,
  shieldT: 0.005,

  /** Trail hinge (vertical pin) position and trail length (hinge to spade heel, plan view). */
  hingeX: 0.26,
  hingeY: 0.45,
  hingeZ: -0.3,
  trailLen: 3.06,
  /** Trail axis height at the end box. */
  trailEndY: 0.25,
  /** Half spread angle of the trails when deployed (deg). */
  spreadDeg: 28,
  /** Closed: trail ends brought together to this half separation (m). */
  closedEndX: 0.075,
};

export const boreY = D.trunY + D.boreAbove;
