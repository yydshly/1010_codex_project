/**
 * BAR M1918A2 layout in the DESIGN frame ("B-frame"): metres, z = 0 at the rear face of the butt
 * plate, +Z towards the muzzle (front of the flash hider at z = 1.215), y = 0 on the bore axis,
 * +X = the gun's left side.
 *
 * Published figures used: overall length 1,214-1,215 mm (47.8 in), barrel 610 mm (24 in), sight
 * radius about 782-791 mm (30.8-31.1 in), 20-round box magazine. Everything else is proportioned to
 * these and to side-view photographs of museum rifles (see the asset's provenance):
 *  - a tall, flat-sided receiver (about 90 mm from the top to the bottom of the trigger housing) whose
 *    rear end slopes down onto the comb of the butt stock; rear sight on top at the rear, charging
 *    handle slot on the left, ejection port with its dust cover on the right, front face just ahead
 *    of the magazine;
 *  - the trigger housing under the rear half of the receiver with the rate-of-fire change lever on the
 *    left, the trigger guard, the magazine release in the front of the guard and the A2 magazine guides;
 *  - the magazine immediately ahead of the trigger guard;
 *  - a deep walnut hand guard (finger grooves on each side, steel heat shield on top) round the gas
 *    cylinder tube, the front sling swivel on a band just ahead of it;
 *  - the gas cylinder bracket with the gas regulator about two thirds of the way along the barrel;
 *  - the hooded front sight, the bipod bearing and the tubular flash hider at the muzzle.
 */
import { Profile } from '../common/geo';

export const BD = {
  length: 1.215,
  barrel: 0.61,
  muzzleZ: 1.15,
  fhFront: 1.215,
  breechZ: 0.54,
  // receiver
  rcvRear: 0.3,
  rcvFront: 0.575,
  rcvHW: 0.0185,
  /** top of the front section / of the rear-sight section (the rear section sits 3 mm lower) */
  rcvTop: 0.024,
  rcvTopRear: 0.0208,
  /** z where the top steps up from the rear-sight section to the front section */
  rcvStepZ: 0.424,
  /** rear slope: from the comb of the butt (rcvRear, slopeY0) up to the top (slopeZ1) */
  slopeY0: -0.0128,
  slopeZ1: 0.338,
  /** receiver bottom above the trigger housing, and of the magazine well / front section */
  rcvBot: -0.037,
  wellBot: -0.0615,
  // trigger housing + guard
  thRear: 0.3,
  thFront: 0.438,
  thBot: -0.0665,
  thHW: 0.0166,
  triggerZ: 0.378,
  guardRear: 0.354,
  guardFront: 0.434,
  guardBot: -0.0985,
  // magazine
  magZ0: 0.4405,
  magZ1: 0.5345,
  magTop: -0.03,
  magBot: -0.176,
  magHW: 0.0129,
  // sights
  rearSightZ: 0.352,
  frontSightZ: 1.118,
  sightY: 0.0385,
  // gas system, hand guard
  gasY: -0.0245,
  gasR: 0.0086,
  gasBlockZ0: 0.99,
  gasBlockZ1: 1.028,
  hgRear: 0.578,
  hgFront: 0.788,
  // bipod bearing + pivot
  bearingZ0: 1.128,
  bearingZ1: 1.152,
  pivotY: -0.035,
  pivotZ: 1.14,
  pivotX: 0.0118,
  legLen: 0.3,
  // sling swivels (pivot pins)
  frontSwivelZ: 0.806,
  rearSwivelZ: 0.118,
  // grips / display
  gripZ: 0.274,
  supportZ: 0.69,
  rearRestZ: 0.2,
  frontRestZ: 0.72,
};

/** Butt stock. Keys: [z, hw, yTop, ySplit, yBot, eTop, eBot]. */
export const BSTOCK = new Profile([
  [0.004, 0.0214, -0.038, -0.099, -0.165, 2.35, 2.45],
  [0.05, 0.0218, -0.0352, -0.094, -0.1555, 2.35, 2.45],
  [0.1, 0.0216, -0.0318, -0.0885, -0.1448, 2.35, 2.4],
  [0.15, 0.021, -0.0284, -0.083, -0.1338, 2.35, 2.4],
  [0.19, 0.0202, -0.0258, -0.0785, -0.1236, 2.35, 2.35],
  [0.212, 0.0194, -0.0243, -0.0752, -0.1176, 2.35, 2.3],
  [0.232, 0.0186, -0.0229, -0.0716, -0.1112, 2.35, 2.3],
  [0.25, 0.018, -0.0215, -0.068, -0.104, 2.35, 2.3],
  [0.266, 0.0177, -0.0202, -0.0642, -0.0958, 2.4, 2.35],
  [0.28, 0.0178, -0.019, -0.0605, -0.0868, 2.5, 2.4],
  [0.292, 0.0182, -0.0176, -0.0574, -0.0768, 2.7, 2.6],
  [0.3, 0.0186, -0.0165, -0.0555, -0.0688, 3.0, 2.8],
]);

/** Wooden hand guard round the gas cylinder tube (under the barrel): deep, flat-sided, round front. */
export const BHG = new Profile([
  [0.578, 0.0196, -0.0152, -0.037, -0.0648, 3.2, 3.0],
  [0.584, 0.0213, -0.0148, -0.037, -0.0698, 3.5, 3.3],
  [0.62, 0.0219, -0.0148, -0.037, -0.0722, 3.6, 3.4],
  [0.7, 0.0219, -0.0148, -0.037, -0.0722, 3.6, 3.4],
  [0.752, 0.0217, -0.0148, -0.037, -0.0714, 3.6, 3.4],
  [0.77, 0.0211, -0.015, -0.0365, -0.0676, 3.4, 3.1],
  [0.781, 0.0199, -0.0154, -0.036, -0.0606, 3.0, 2.8],
  [0.788, 0.0174, -0.016, -0.035, -0.0498, 2.6, 2.4],
]);

/** Barrel outer radius along z. */
export const BBARREL: [number, number][] = [
  [0.53, 0.0148],
  [0.576, 0.0148],
  [0.581, 0.0138],
  [0.62, 0.0134],
  [0.8, 0.0118],
  [0.95, 0.0106],
  [1.1, 0.0098],
  [1.15, 0.0096],
];

/** Barrel radius at z. */
export function barrelR(z: number): number {
  const k = BBARREL;
  if (z <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (z <= k[i][0]) {
      const [z0, r0] = k[i - 1], [z1, r1] = k[i];
      return r0 + ((r1 - r0) * (z - z0)) / (z1 - z0);
    }
  }
  return k[k.length - 1][1];
}
