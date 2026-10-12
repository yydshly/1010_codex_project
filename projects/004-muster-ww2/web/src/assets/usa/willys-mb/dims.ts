/**
 * Willys MB key dimensions (metres). Asset frame: +Z forward, +X = vehicle's left (driver's
 * side), origin on the ground at the footprint centre.
 *
 * Verified (TM 9-803, 1944, par. 3 "Data"): wheelbase 80 in (2.032 m), length over-all
 * 132 5/8 in (3.37 m), width over-all 62 in (1.575 m), height 69 5/8 in top up / 52 in top down,
 * tread 49 in (1.245 m) front and rear, ground clearance 8 5/8 in (0.219 m), tyres 16 x 6.00 on
 * 16 x 4.50E combat wheels, pintle height 21 in (loaded). Springs (par. 153): front 36 1/4 in
 * between eyes, 8 leaves; rear 42 in, 9 leaves; 1 3/4 in wide. Windscreen glass 580 x 311 mm per
 * pane (reproduction glass data). Body heights, overhangs and panel positions are estimated
 * from photographs of preserved vehicles and scaled to the verified overall figures.
 */
const zFront = 1.665; // front bumper face
const zF = zFront - 0.54; // front axle
const zR = zF - 2.032; // rear axle

export const D = {
  zFront,
  zF,
  zR,
  track: 1.245,
  wheelX: 1.245 / 2,

  // 6.00-16 mud-and-snow tyre on a 16 x 4.50E combat wheel
  tyreR: 0.362, // over the tread bars
  crownR: 0.35, // carcass crown
  tyreHW: 0.077, // half section width
  rimR: 0.2032, // 16 in bead seat
  flat: 0.016, // contact-patch flattening
  axleY: 0.346,

  // body tub
  t: 0.0022, // sheet thickness (real ~1.2-1.6 mm, slightly thickened for display)
  bodyX: 0.72, // outer face of the tub sides
  bodyBot: 0.5, // lower edge of the tub sides
  top: 0.96, // tub top edge behind the cut-outs
  cowlY: 0.975, // cowl top
  floorY: 0.625, // floor top surface
  zCowl: 0.645, // cowl front / firewall (hood rear edge)
  zWs: 0.535, // windscreen hinge line on the cowl
  zDash: 0.5, // instrument panel (cockpit face)
  dashBot: 0.845, // lower edge of the instrument panel
  zRear: -1.475, // rear panel outer face
  cornerR: 0.05, // plan radius of the rear tub corners
  archR: 0.44, // rear wheel opening radius (centred on the rear axle)

  // hood / front end
  hoodX: 0.44, // hood half width (= grille half width)
  hoodY: 0.972, // hood top
  zGrille: 1.565, // grille face
  zHoodF: 1.562, // hood front edge
  wingX: 0.7875, // front fender outer edge (overall width 1.575)
  wingY: 0.815, // front fender top
  wingBendZ: 1.46, // where the fender top starts to roll down
  wingNoseR: 0.11,

  // windscreen
  wsX: 0.665, // frame half width
  wsH: 0.45, // frame height along its plane
  wsRake: 12, // degrees back from vertical

  // frame
  frameX: 0.355, // channel web centre
  frameBot: 0.5,
  frameTop: 0.6,
  zFrameF: 1.605,
  zFrameR: -1.465,

  // stowage
  spare: { x: -0.27, y: 0.85 },
  jerry: { x: 0.34 },
};
