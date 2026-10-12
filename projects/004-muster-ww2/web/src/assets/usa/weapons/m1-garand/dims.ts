/**
 * M1 Garand layout in the DESIGN frame ("G-frame"): metres, z = 0 at the bolt face (breech),
 * +Z towards the muzzle, y = 0 on the bore axis, +X = the rifle's left side.
 *
 * Published figures used: overall length 43.6 in (1,107 mm), barrel 24 in (610 mm), length of pull
 * 13 in (330 mm), sight radius about 28 in (711 mm); the stock is 29.75 in (756 mm) long without the
 * butt plate, the rear (thin) handguard 9.75 in (248 mm) and the front (thick) handguard ~7.5 in
 * (190 mm). Everything else is proportioned to these (receiver, gas cylinder, bands, sights).
 * Front to rear on the barrel: gas cylinder (front sight, stacking swivel, bayonet lug) - front
 * handguard with its ferrule - lower band (pinned) - rear handguard with its band - receiver.
 * The stock ends under the lower band in the stock ferrule, which carries the front sling swivel.
 */
import { Profile } from '../common/geo';

export const GD = {
  length: 1.107,
  barrel: 0.61,
  buttZ: -0.497,
  muzzleZ: 0.61,
  // receiver
  heelRear: -0.161,
  heelFront: -0.106,
  ringRear: 0.004,
  ringFront: 0.042,
  ringR: 0.0168,
  rcvHW: 0.0172,
  rcvTop: 0.0125,
  wallTop: 0.0046,
  // rear sight (aperture plane) and front sight (blade)
  apertureZ: -0.1335,
  sightY: 0.0268,
  frontSightZ: 0.5775,
  // trigger group
  triggerZ: -0.167,
  guardFront: -0.099,
  guardRear: -0.214,
  // wood and bands
  stockFront: 0.2875,
  ferruleRear: 0.2745,
  rhgRear: 0.0425,
  rhgBandRear: 0.2695,
  rhgFront: 0.284,
  lowerBandRear: 0.2875,
  lowerBandFront: 0.2995,
  fhgRear: 0.2995,
  fhgFront: 0.4885,
  // gas cylinder
  gcRear: 0.4885,
  gcFront: 0.5985,
  gcTubeY: -0.0188,
  gcLockFront: 0.6085,
  // sling swivels (pivot pins)
  frontSwivelZ: 0.2805,
  rearSwivelZ: -0.36,
  stackSwivelZ: 0.556,
  // grips / display
  gripZ: -0.2285,
  supportZ: 0.2,
  rearRestZ: -0.412,
  frontRestZ: 0.43,
};

/**
 * Stock (one piece, butt plate to the stock ferrule). Keys: [z, hw, yTop, ySplit, yBot, eTop, eBot].
 * Along the receiver and fore-end the top is a flat shelf (inletting) that the receiver / rear
 * handguard sit on.
 */
export const STOCK = new Profile([
  [-0.4935, 0.0212, -0.0362, -0.0995, -0.1672, 2.3, 2.4],
  [-0.47, 0.0215, -0.0352, -0.0965, -0.1595, 2.3, 2.4],
  [-0.44, 0.0217, -0.0338, -0.0925, -0.1498, 2.3, 2.4],
  [-0.40, 0.0216, -0.0318, -0.0870, -0.1370, 2.3, 2.35],
  [-0.36, 0.0211, -0.0296, -0.0810, -0.1240, 2.3, 2.35],
  [-0.33, 0.0205, -0.0278, -0.0765, -0.1145, 2.3, 2.3],
  [-0.305, 0.0198, -0.0262, -0.0722, -0.1080, 2.3, 2.3],
  [-0.285, 0.0191, -0.0247, -0.0685, -0.1040, 2.3, 2.3],
  [-0.268, 0.0184, -0.0232, -0.0650, -0.1008, 2.3, 2.25],
  [-0.254, 0.0179, -0.0214, -0.0615, -0.0962, 2.3, 2.25],
  [-0.242, 0.0176, -0.0197, -0.0578, -0.0898, 2.3, 2.25],
  [-0.231, 0.0175, -0.0178, -0.0536, -0.0822, 2.35, 2.3],
  [-0.221, 0.0177, -0.0158, -0.0497, -0.0760, 2.5, 2.4],
  [-0.21, 0.0183, -0.0135, -0.0455, -0.0712, 2.9, 2.6],
  [-0.197, 0.0192, -0.0108, -0.0420, -0.0685, 3.4, 2.8],
  [-0.183, 0.0203, -0.0082, -0.0392, -0.0672, 4.0, 3.0],
  [-0.170, 0.0212, -0.0066, -0.0372, -0.0665, 4.6, 3.2],
  [-0.155, 0.0218, -0.0060, -0.0360, -0.0662, 5.0, 3.3],
  [-0.10, 0.0222, -0.0060, -0.0345, -0.0660, 5.0, 3.4],
  [-0.03, 0.0222, -0.0060, -0.0335, -0.0660, 5.0, 3.4],
  [0.0, 0.0221, -0.0058, -0.0320, -0.0645, 5.0, 3.3],
  [0.02, 0.0218, -0.0054, -0.0290, -0.0598, 4.8, 3.1],
  [0.04, 0.0212, -0.0049, -0.0240, -0.0515, 4.6, 2.9],
  [0.06, 0.0205, -0.0045, -0.0190, -0.0448, 4.4, 2.7],
  [0.085, 0.0199, -0.0042, -0.0150, -0.0408, 4.4, 2.6],
  [0.13, 0.0193, -0.0040, -0.0130, -0.0385, 4.4, 2.55],
  [0.2, 0.0185, -0.0040, -0.0122, -0.0362, 4.4, 2.5],
  [0.26, 0.0177, -0.0040, -0.0118, -0.0343, 4.4, 2.5],
  [0.2875, 0.0173, -0.0040, -0.0116, -0.0335, 4.4, 2.5],
]);

/** Front (thick) handguard round barrel and operating rod. */
export const FHG = new Profile([
  [0.2995, 0.0166, 0.0142, -0.0072, -0.0312, 2.4, 2.3],
  [0.35, 0.0164, 0.0139, -0.0073, -0.0309, 2.4, 2.3],
  [0.42, 0.0161, 0.0134, -0.0074, -0.0305, 2.4, 2.3],
  [0.4885, 0.0158, 0.0129, -0.0075, -0.0300, 2.4, 2.3],
]);

/** Rear (thin) handguard crown height and bottom edges (left / right: the right edge is higher,
 *  leaving the slot in which the operating rod shows). */
export const RHG = {
  crown: (z: number) => 0.0168 - (0.0026 * (z - 0.0425)) / 0.2415,
  yLeft: -0.004,
  yRight: 0.003,
  eTop: 2.2,
};

/** Barrel outer radius along z (G-frame). */
export const BARREL_R: [number, number][] = [
  [-0.004, 0.0152],
  [0.042, 0.0152],
  [0.046, 0.0142],
  [0.09, 0.0128],
  [0.17, 0.0112],
  [0.26, 0.0098],
  [0.35, 0.0091],
  [0.45, 0.0087],
  [0.49, 0.0084],
  [0.5, 0.0081],
  [0.61, 0.0079],
];

/** Operating rod path (G-frame): piston in the gas cylinder -> right side under the handguards ->
 *  the dog-leg up to the handle -> rear section along the right of the receiver. */
export const OPROD = {
  piston: { z0: 0.505, z1: 0.585, r: 0.0064 },
  rodR: 0.0041,
  /** centre line points [x, y, z] from the piston back to the handle */
  path: [
    [0.0, -0.0188, 0.505],
    [0.0, -0.0188, 0.48],
    [-0.004, -0.0168, 0.44],
    [-0.0122, -0.0072, 0.35],
    [-0.0152, -0.0006, 0.29],
    [-0.016, 0.0, 0.2],
    [-0.0171, 0.0, 0.1],
    [-0.0186, 0.0004, 0.05],
    [-0.0194, 0.0012, 0.03],
    [-0.0196, 0.0012, 0.021],
  ] as [number, number, number][],
  /** rear section (flat bar along the right of the receiver) */
  rear: { x: -0.0196, y: 0.0012, z0: -0.095, z1: 0.026, h: 0.0092, t: 0.0042 },
  handleZ: 0.013,
};
