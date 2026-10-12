/**
 * PPSh-41 - design dimensions (millimetres), same design space as the Mosin module:
 *   u = distance FORWARD from the butt-plate face along the bore line (butt = 0, jacket front = 843)
 *   y = height relative to the bore axis (+ up), x = + weapon's left, - right (bolt-handle side).
 *
 * Reference figures (see the asset's provenance): overall length 843 mm, barrel 269 mm, 71-round drum,
 * 35-round box magazine. Receiver/jacket diameters, stock profile, drum size (~200 mm) and the sight
 * positions are estimated from photographs and scaled to the published overall and barrel lengths.
 */
import { mono } from '../mosin-9130/dims';

export const U = {
  butt: 0,
  wood0: 4.2, // butt plate thickness
  rearSwivel: 150,
  grip: 308, // trigger-hand grip centre on the wrist
  latch: 302, // receiver catch behind the receiver
  recRear: 321, // start of the receiver tube (rounded rear cap 306..321)
  guardRear: 340,
  trigger: 366,
  guardFront: 400,
  magCatch: 496,
  well0: 503,
  well1: 549,
  slot0: 398, // bolt-handle slot (right side)
  slot1: 480,
  port0: 468, // ejection port (top)
  port1: 512,
  rsight: 531, // L-flip rear sight pivot
  frontSwivel: 532,
  woodFront: 548,
  recFront: 548.5,
  hinge: 553,
  breech: 550,
  jacket0: 552,
  jacketSlots1: 813,
  muzzle: 819, // barrel 269 mm
  fsight: 823,
  front: 843, // top edge of the slanted compensator face
};

export const REC_R = 19.5;
export const JACKET_R = 17;

/** Drum magazine (71 rds): centre and size. */
export const DRUM = { u: 526, y: -160, R: 100, xR: -30.5, xL: 26.5 };

/** Stock top line (mm, rel. bore). */
export const stockTop = mono([
  [4, -30], [60, -28.6], [150, -26.6], [230, -24.6], [262, -23.4], [290, -22.4], [304, -21.3], [314, -18.8], [324, -14.2],
  [334, -10.6], [344, -9.2], [352, -9], [548, -9],
]);

/** Stock bottom line (mm, rel. bore). */
export const stockBot = mono([
  [4, -153], [60, -136.5], [150, -110], [220, -86.5], [250, -77], [275, -69], [300, -62.5], [320, -56.5], [336, -50.5],
  [350, -46.5], [366, -44.6], [548, -44],
]);

/** Half width at mid height / at the top edge / at the bottom. */
export const stockHW = mono([[4, 20.4], [150, 19.8], [230, 17.4], [272, 16.2], [300, 16.1], [330, 18.6], [352, 21], [548, 21]]);
export const stockHWT = mono([[4, 16.8], [150, 16], [240, 13.2], [300, 12.8], [322, 14.6], [340, 19.2], [352, 20.4], [548, 20.4]]);
export const stockHWB = mono([[4, 17.8], [150, 17.4], [240, 14.6], [300, 14.2], [340, 16.2], [362, 17.6], [548, 17.6]]);

/** Trigger-hand grip frame (design mm). */
export const GRIP = { u0: U.grip, y0: (stockTop(U.grip) + stockBot(U.grip)) / 2 };
