/**
 * Key dimensions of the 105 mm Howitzer M2A1 on Carriage M2A1, metres.
 *
 * Construction frame: axle centre line on X at z = 0, ground at y = 0, +Z towards the muzzle,
 * +X the gun's left (gunner's side). build.ts shifts the finished model so the origin sits at the
 * centre of its plan footprint.
 *
 * Reference numbers (TM 9-1325, Sept. 1944, "Data"; see provenance in m2a1-howitzer.asset.ts):
 *  - howitzer, muzzle to rear face of breech ring 101.35 in (2.574 m); tube 93.05 in (2.363 m);
 *    bore 78.02 in; horizontal sliding-wedge breech; hydropneumatic constant recoil, 42 in
 *  - carriage M2A1: length ~19 3/8 ft (5.90 m), width over hub caps ~84.5 in (2.146 m),
 *    height ~60 in (1.52 m), road clearance ~13 3/8 in (0.34 m), 4,475 lb travelling
 *  - elevation -84 to +1,180 mils (-4.7 to +66 deg), traverse 23 deg right / left
 *  - combat tyres 9.00 x 20 (about 1.02 m over the tread)
 * The carriage has no firing jack: it fires from its two wheels and the two trail spades, the
 * axle pivoting on the equalizing support so both wheels stay on uneven ground.
 */
export const D = {
  /** 9.00-20 combat tyre: outer radius, section width, 20 in rim bead radius. */
  tyreR: 0.51,
  tyreW: 0.25,
  rimR: 0.254,
  /** Wheel centre height: tyre radius minus ~20 mm static deflection. */
  axleY: 0.49,
  /** Tyre centre-plane half track (hub caps end at +-1.073 -> 2.146 m over hub caps). */
  wheelX: 0.915,
  hubCapX: 1.073,

  /** Bottom carriage box (behind the axle girder). */
  bc: { x: 0.3, y0: 0.35, y1: 0.74, z0: -0.56, z1: -0.08 },
  /** Axle girder (box beam spanning between the wheels). */
  axle: { x: 0.74, y0: 0.39, y1: 0.6, hz: 0.065 },
  /** Top-carriage pintle axis (traverse pivot) z, and top face of the bottom carriage. */
  pintleZ: -0.3,

  /** Trunnion axis (elevation pivot). */
  trunY: 1.05,
  trunZ: -0.28,
  /** Bore axis above the trunnion axis. */
  boreAbove: 0.13,

  /** Along the bore from the trunnion: breech-ring rear and front faces, muzzle. */
  breechRear: -0.38,
  breechFront: -0.08,
  muzzle: -0.38 + 2.574,
  /** Recuperator (above the tube): axis offset above the bore, radius, rear / front ends. */
  recupUp: 0.205,
  recupR: 0.084,
  recupRear: -0.36,
  recupFront: 1.46,
  /** Cradle extent along the bore; section (cradle-local y relative to the trunnion axis). */
  cradleRear: -0.07,
  cradleFront: 1.58,

  /** Main shield: rear face plane (construction z) and top of the vertical part. */
  shieldZ: 0.3,
  shieldT: 0.005,

  /** Trail hinge pins (vertical) and trail length hinge -> end tip (plan view). */
  hingeX: 0.24,
  hingeY: 0.56,
  hingeZ: -0.62,
  trailLen: 3.07,
  /** Trail axis height at the end. */
  trailEndY: 0.37,
  /** Half spread angle of the trails when deployed (deg). */
  spreadDeg: 28,
  /** Closed: trail axes at the ends this far from the centre line. */
  closedEndX: 0.085,
};

export const boreY0 = D.trunY + D.boreAbove;
