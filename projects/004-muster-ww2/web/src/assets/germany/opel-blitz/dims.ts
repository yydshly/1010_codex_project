/**
 * Opel Blitz 3.6-36S key dimensions (metres). Asset frame: +Z forward, +X = vehicle's left
 * (driver's side), origin on the ground at the footprint centre.
 *
 * Published data (W. Oswald / de.wikipedia "Opel Blitz 3,6"): length 6.05-6.105 m (cargo body),
 * width 2.265 m, height 2.02-2.115 m over the cab without bows, 2.565 m over the tarpaulin,
 * wheelbase 3.60 m, track 1.542 m front / 1.62 m rear, ground clearance 0.225 m, loading
 * platform 3.50 x 2.125 m, tyres 190-20. Overhangs, cab, bonnet and wing heights are estimated
 * from photographs and scale drawings of preserved vehicles.
 */
const L = 6.06;
const zFront = L / 2; // bumper face
const zF = 2.2; // front axle (front overhang 0.83)
const zR = zF - 3.6; // rear axle

export const D = {
  L,
  zFront,
  zBack: -L / 2,
  zF,
  zR,
  trackF: 1.542,
  trackR: 1.62,
  wheelXF: 1.542 / 2,
  dualX: 1.62 / 2, // centre between the twin rear tyres
  dualOff: 0.113, // each twin tyre centre from the dual centre

  // 190-20 tyre on a 20 in disc wheel
  tyreR: 0.458, // over the tread bars
  crownR: 0.446, // carcass crown
  tyreHW: 0.097, // half section width
  rimR: 0.254, // 20 in bead seat
  flat: 0.02, // contact-patch flattening
  axleY: 0.438,

  // frame (pressed channel, web outboard)
  frameX: 0.43, // web centre
  frameBot: 0.64,
  frameTop: 0.81,
  frameZ0: 2.93,
  frameZ1: -2.94,

  // cab (all-steel Opel cab)
  cabX: 0.925, // outer face of the cab sides
  zCabBack: 0.5,
  zFire: 1.72, // cab front panel (bulkhead) behind the bonnet
  zWs: 1.61, // windscreen base
  cabBot: 0.86, // lower edge of the cab sides
  floorY: 0.94, // cab floor top
  belt: 1.585, // window sill / scuttle top
  wsTop: 1.975, // windscreen header
  rail: 2.02, // roof side rail (drip line)
  roofY: 2.125, // roof crown
  sheet: 0.0025, // body sheet thickness (real ~1.25 mm)

  // bonnet / radiator
  bonnetX: 0.395, // bonnet half width
  bonnetTop: 1.56,
  bonnetBot: 1.08,
  zRad: 2.725, // radiator shell rear face
  zGrille: 2.8, // radiator shell front face

  // front wings
  wingIn: 0.415,
  wingOut: 0.965,
  runY: 0.765, // running-board top

  // cargo body (wooden platform with drop sides)
  bedX: 1.12, // outer face of the side boards
  zBed0: 0.455, // front face of the headboard
  zBed1: -L / 2, // rear face of the tailgate
  bedFloor: 1.1, // top of the floor boards
  sideH: 0.42, // drop-side height above the floor
  bowTop: 2.545, // crown of the bows (tarpaulin 2.565 m)
};
