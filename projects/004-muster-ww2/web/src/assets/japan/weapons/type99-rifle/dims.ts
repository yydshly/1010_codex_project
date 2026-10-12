/**
 * Arisaka Type 99 short rifle layout in the DESIGN frame ("R-frame"): metres, z = 0 at the bolt face
 * (breech), +Z towards the muzzle, y = 0 on the bore axis, +X = the rifle's left side.
 *
 * Published figures used: overall length 1,118 mm, barrel 657 mm (so the butt plate is 461 mm behind the
 * breech). Everything else (receiver, stock sections, bands, sights, swivels) is proportioned from
 * photographs of early / mid-war rifles, not measured.
 * Front to rear: front sight with protective ears on the barrel - nose cap / upper band with the bayonet
 * lug and reinforcing tangs - upper handguard - lower band with the LEFT-side sling swivel - rear sight
 * (ladder with the anti-aircraft lead arms) on the barrel ahead of the receiver ring - receiver with the
 * sliding dust cover - bolt with the straight handle and plum-shaped knob - knurled safety knob -
 * two-piece stock (lower butt piece spliced on) with the LEFT-side butt swivel and a cupped steel butt plate.
 */
import { Profile } from '../common/geo';

export const RD = {
  length: 1.118,
  barrel: 0.657,
  buttZ: -0.461,
  woodButtZ: -0.4565,
  muzzleZ: 0.657,
  // receiver
  ringRear: -0.036,
  ringFront: 0.032,
  ringR: 0.0166,
  bodyR: 0.0158,
  bridgeRear: -0.152,
  bridgeFront: -0.122,
  rcvRear: -0.173,
  tangRear: -0.215,
  // bolt
  boltR: 0.0092,
  boltRear: -0.1735,
  handleZ: -0.1628,
  safetyZ0: -0.1915,
  safetyZ1: -0.1745,
  // sights
  rsBase0: 0.046,
  rsBase1: 0.114,
  sightY: 0.0222,
  frontSightZ: 0.638,
  // trigger group / magazine
  triggerZ: -0.131,
  guardFront: -0.099,
  guardRear: -0.18,
  floorFront: 0.004,
  floorRear: -0.099,
  // wood / bands
  hgRear: 0.119,
  hgFront: 0.548,
  lowerBand0: 0.372,
  lowerBand1: 0.388,
  upperBand0: 0.53,
  upperBand1: 0.556,
  capFront: 0.58,
  stockFront: 0.555,
  // swivels (pivot pins on the left side)
  frontSwivelZ: 0.38,
  rearSwivelZ: -0.33,
  // grips / display
  gripZ: -0.2,
  supportZ: 0.2,
  rearRestZ: -0.4,
  frontRestZ: 0.47,
};

/**
 * Stock (one profile from the butt plate to the nose cap; the lower butt piece is cut from it along
 * spliceY(); its front end is found by spliceFront() in wood.ts). Keys: [z, hw, yTop, ySplit, yBot, eTop, eBot].
 */
export const STOCK = new Profile([
  [-0.4565, 0.0204, -0.0302, -0.0905, -0.152, 2.4, 2.4],
  [-0.43, 0.0207, -0.0290, -0.0875, -0.1455, 2.4, 2.4],
  [-0.39, 0.0206, -0.0274, -0.0825, -0.1352, 2.4, 2.35],
  [-0.35, 0.0200, -0.0258, -0.0765, -0.1232, 2.4, 2.35],
  [-0.31, 0.0191, -0.0243, -0.0705, -0.1102, 2.4, 2.3],
  [-0.28, 0.0181, -0.0228, -0.0650, -0.0985, 2.4, 2.3],
  [-0.255, 0.0171, -0.0214, -0.0590, -0.0858, 2.4, 2.3],
  [-0.235, 0.0164, -0.0201, -0.0535, -0.0752, 2.45, 2.3],
  [-0.215, 0.0162, -0.0190, -0.0480, -0.0680, 2.6, 2.4],
  [-0.198, 0.0167, -0.0184, -0.0430, -0.0648, 3.0, 2.6],
  [-0.181, 0.0177, -0.0170, -0.0392, -0.0638, 3.8, 2.9],
  [-0.169, 0.0188, -0.0068, -0.0366, -0.0636, 4.6, 3.2],
  [-0.158, 0.0192, -0.0040, -0.0358, -0.0636, 4.8, 3.3],
  [-0.12, 0.0196, -0.0030, -0.0350, -0.0636, 5.0, 3.4],
  [-0.04, 0.0196, -0.0030, -0.0345, -0.0636, 5.0, 3.4],
  [-0.005, 0.0193, -0.0030, -0.0318, -0.0605, 5.0, 3.3],
  [0.02, 0.0187, -0.0020, -0.0270, -0.0530, 4.8, 3.1],
  [0.05, 0.0180, -0.0010, -0.0215, -0.0465, 4.4, 2.8],
  [0.09, 0.0175, 0.0, -0.0185, -0.0428, 4.2, 2.7],
  [0.18, 0.0167, 0.0, -0.0165, -0.0395, 4.2, 2.6],
  [0.3, 0.0158, 0.0, -0.0148, -0.0362, 4.2, 2.6],
  [0.42, 0.0150, 0.0, -0.0135, -0.0332, 4.2, 2.6],
  [0.555, 0.0141, 0.0, -0.0122, -0.0300, 4.2, 2.6],
]);

/** Height (y) of the splice between the stock and the separate lower butt piece at z. */
export const spliceY = (z: number) => -0.0985 + ((z - RD.woodButtZ) * (0.0985 - 0.0848)) / (-0.262 - RD.woodButtZ);

/** Upper handguard crown height at z (tapers towards the nose cap). */
export const hgCrown = (z: number) => 0.0162 - ((z - RD.hgRear) * (0.0162 - 0.0128)) / (RD.hgFront - RD.hgRear);

/** Barrel outer radius along z (R-frame). */
export const BARREL_R: [number, number][] = [
  [-0.004, 0.0148],
  [0.032, 0.0148],
  [0.036, 0.0136],
  [0.12, 0.0126],
  [0.22, 0.0114],
  [0.34, 0.0102],
  [0.46, 0.0094],
  [0.56, 0.009],
  [0.657, 0.0087],
];

export function barrelR(z: number): number {
  const k = BARREL_R;
  if (z <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (z <= k[i][0]) {
      const [z0, r0] = k[i - 1], [z1, r1] = k[i];
      return r0 + ((r1 - r0) * (z - z0)) / (z1 - z0);
    }
  }
  return k[k.length - 1][1];
}
