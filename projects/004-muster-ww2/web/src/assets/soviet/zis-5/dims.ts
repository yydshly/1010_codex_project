/**
 * ZiS-5V key dimensions (metres). Asset frame: +Z forward, +X = vehicle's left (driver's side),
 * origin on the ground at the footprint centre.
 *
 * Published data (ru/en Wikipedia, autogallery.org.ru): length 6.06 m with the (export-only)
 * bumper, width 2.235 m, height 2.16 m unladen, wheelbase 3.81 m, track 1.53-1.545 m front /
 * 1.675 m rear, clearance 0.25 m under the rear axle, platform inside 3.085 x 2.085 x 0.60 m,
 * loading height 1.10 m, tyres 34x7, front springs 1.015 m (11 leaves), rear springs 1.37 m
 * (11 leaves + 5-leaf 0.964 m helper). Overhangs, cab, bonnet and wing heights are estimated
 * from photographs of preserved trucks. The wartime ZiS-5V had no front bumper, so the model
 * is ~6.0 m long.
 */
const zFront = 3.0; // front of the frame horns / tow hooks
const zF = 2.37; // front axle
const zR = zF - 3.81; // rear axle

export const D = {
  zFront,
  zBack: -3.0,
  zF,
  zR,
  trackF: 1.53,
  trackR: 1.675,
  wheelXF: 1.53 / 2,
  dualX: 1.675 / 2,
  dualOff: 0.104,

  // 34x7 tyre on a 20 in disc wheel with demountable rim
  tyreR: 0.437, // over the tread
  crownR: 0.426, // carcass crown
  tyreHW: 0.09, // half section width
  rimR: 0.254,
  flat: 0.017,
  axleY: 0.42,

  // frame
  frameX: 0.43,
  frameBot: 0.66,
  frameTop: 0.84,
  frameZ0: 2.93,
  frameZ1: -2.92,

  // cab (wooden, ZiS-5V from 1943)
  cabX: 0.9, // outer face of the cab sides
  zCabBack: 0.23,
  zFire: 1.52, // cab front (bulkhead) behind the bonnet
  zWs: 1.43, // windscreen base
  cabBot: 0.84,
  floorY: 0.96,
  belt: 1.6,
  wsTop: 2.0,
  roofY: 2.16,
  rail: 2.07,

  // bonnet / radiator
  bonnetX: 0.37,
  bonnetTop: 1.575,
  bonnetBot: 1.03,
  zRad: 2.72,
  zGrille: 2.86,

  // flat front wings
  wingIn: 0.43,
  wingOut: 0.905,
  wingY: 1.0, // top of the horizontal section
  runY: 0.72,

  // cargo platform (fixed sides, tailgate only)
  bedX: 1.115, // outer face of the side boards (overall width 2.235)
  zBed0: 0.165,
  zBed1: -3.0,
  bedFloor: 1.1,
  sideH: 0.6,
};
