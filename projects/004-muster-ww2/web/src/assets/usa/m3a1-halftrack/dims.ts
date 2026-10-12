/**
 * M3A1 half-track key dimensions (metres). Asset frame: +Z forward, +X = vehicle's left (driver's
 * side), origin on the ground at the footprint centre.
 *
 * Verified (TM 9-710, 1944, par. 4 "Tabulated data", M3A1 column): wheelbase 135 1/2 in (3.442 m),
 * length with front roller 242 5/8 in (6.163 m; 249 5/8 in with winch), width 87 1/2 in (2.223 m,
 * over the mine racks), height 95 5/8 in (2.43 m, to the M49 ring), tread 63 13/16 in (1.621 m),
 * 8.25-20 combat tyres on 20 x 7 wheels, ground clearance 11 3/16 in, pintle height 28 in.
 * Track (afvdatabase.com): 12 in wide centre-guide band, 4 in pitch, 58 pitches, 46.75 in ground
 * contact; one bogie per side with four dual wheels, one dual support roller, 18-tooth front
 * sprocket, rear idler; body width without racks about 77 1/4 in. Plate heights, overhangs and
 * the layout of fittings are estimated from photographs of preserved vehicles and scaled to these
 * overall figures.
 */
const IN = 0.0254;

export const zFront = (242.625 * IN) / 2; // roller face
export const zRear = -zFront;
export const zF = 1.84; // front axle
export const zB = zF - 135.5 * IN; // bogie centre (wheelbase is measured to it)

export const D = {
  IN,
  zFront,
  zRear,
  zF,
  zB,

  // front wheels: 8.25-20 combat tyre on a 20 x 7 ventilated disc wheel
  tyreR: 0.482,
  tyreHW: 0.112,
  rimR: 0.254,
  axleY: 0.47,
  wheelX: (63.8125 * IN) / 2,

  // rear track units
  trackX: (63.8125 * IN) / 2,
  bandW: 12 * IN,
  pitch: 4 * IN,
  pitches: 58,
  bandT: 0.028, // carcass thickness
  treadH: 0.012, // tread bar height (outer)
  bandC: 0.012 + 0.014, // band centre line above the ground on the bottom run
  bogieWheelR: 0.145,
  bogieDz: [0.56, 0.2, -0.2, -0.56],
  sprocket: { z: zB + 1.02, y: 0.46, pitchR: (4 * IN) / (2 * Math.sin(Math.PI / 18)), teeth: 18 },
  idler: { y: 0.43, r: 0.25 },
  roller: { z: zB, y: 0.631, r: 0.11 },

  // armoured body
  W: 0.98, // outer half width of the body sides
  t: 0.008, // plate thickness (1/4 in, slightly thickened for display)
  bodyBot: 0.84, // lower edge of the rear body sides
  top: 1.93, // top edge of the sides
  floorY: 0.97, // floor top surface
  zRearPlate: zRear + 0.11, // rear plate outer face (the pintle hook reaches zRear)
  zCab: 1.02, // cab front / firewall line (windscreen base)
  zDoorF: 0.98,
  zDoorR: 0.2,
  doorBot: 1.02,

  // engine hood and front end
  hoodTopX: 0.45,
  hoodBotX: 0.53,
  hoodY0: 1.47, // hood top at the radiator
  hoodY1: 1.53, // hood top at the cowl
  hoodBot: 1.06,
  zRad: 2.24, // radiator armour face
  wingY: 1.06, // front fender top
  wingX0: 0.56,
  wingX1: 0.985,
  zWingF: 2.34,

  // front roller
  rollerC: { y: 0.86, z: zFront - 0.17, r: 0.17, len: 0.92 },

  // chassis frame
  frameX: 0.43,
  frameBot: 0.62,
  frameTop: 0.84,

  // M49 ring mount "pulpit" over the right front seat
  ring: { x: -0.47, z: 0.47, r: 0.48, top: 2.43 },
};
