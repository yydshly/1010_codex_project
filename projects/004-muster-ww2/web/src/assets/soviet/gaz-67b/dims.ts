/**
 * GAZ-67B key dimensions (metres). Asset frame: +Z forward, +X = vehicle's left, origin on the
 * ground at the footprint centre.
 *
 * Verified: overall length 3.345, width 1.685, height 1.70 (top raised), wheelbase 2.100,
 * track 1.446, ground clearance ~0.227, front overhang 0.47, rear overhang 0.775,
 * tyres 6.50-16. Body heights and panel positions are estimated from photographs.
 */
const L = 3.345;
const zFront = L / 2; // bumper face
const zF = zFront - 0.47; // front axle
const zR = zF - 2.1; // rear axle

export const D = {
  L,
  W: 1.685,
  zFront,
  zF,
  zR,
  track: 1.446,
  wheelX: 1.446 / 2,

  // 6.50-16 tyre on a 16 in disc wheel
  tyreR: 0.365, // over the tread lugs
  crownR: 0.353, // carcass crown
  tyreHW: 0.086, // half section width
  rimR: 0.2032, // 16 in bead seat
  flat: 0.02, // contact-patch flattening
  axleY: 0.345,

  // body tub
  t: 0.0025, // sheet thickness (real 1.0-1.9 mm)
  bodyX: 0.655, // outer face of the tub sides
  wingX: 0.8425, // wing outer edge (overall width 1.685)
  bodyBot: 0.46, // lower edge of the tub sides / running boards
  top: 1.0, // tub top edge, scuttle top, bonnet crown
  floorY: 0.535, // floor top surface
  zFire: 0.66, // firewall / scuttle front
  zWs: 0.505, // windscreen plane
  zDash: 0.5, // instrument panel face
  zRear: -1.4575, // rear wall outer face
  cornerR: 0.06, // plan radius of the rear tub corners

  // bonnet / front end
  bonnetX: 0.37, // bonnet half width
  zNose: 1.535, // radiator shell plane
  wingY: 0.78, // front wing top
  wingBendZ: 1.43, // where the outer wing turns down
  shelfX: 0.56, // inner (headlamp shelf) part of the wing
  rwingY: 0.76, // rear wing top
  runY: 0.46, // running board top

  // windscreen
  wsX: 0.64,
  wsBot: 1.02,
  wsTop: 1.365,

  // frame
  frameX: 0.36, // channel web centre
  frameBot: 0.42,
  frameTop: 0.53,
};
