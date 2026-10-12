/**
 * Thompson M1A1 layout in the DESIGN frame ("T-frame"): metres, z = 0 at the rear face of the butt
 * plate, +Z towards the muzzle (muzzle at z = 0.811), y = 0 on the bore axis, +X = the gun's left.
 *
 * Published figures used: overall length about 32 in (810-813 mm), barrel 10.5 in (267 mm). The
 * receiver, frame, pistol grip, horizontal fore-grip, stock and magazine are proportioned to these.
 * Rear to front: butt stock - frame with pistol grip, trigger guard and magazine well under the
 * receiver - receiver (fixed peep rear sight with protective wings on top at the rear, cocking
 * handle on the right, selector and safety levers on the left) - smooth barrel with the horizontal
 * fore-grip under its rear part and the blade front sight near the muzzle.
 */
import { Profile } from '../common/geo';

export const TD = {
  length: 0.811,
  barrel: 0.267,
  muzzleZ: 0.811,
  breechZ: 0.544,
  // receiver
  rcvRear: 0.262,
  rcvFront: 0.557,
  rcvHW: 0.0171,
  rcvTop: 0.0205,
  rcvBot: -0.0255,
  // frame (trigger / grip frame) under the receiver
  frameRear: 0.262,
  frameFront: 0.472,
  frameBot: -0.0455,
  frameHW: 0.0158,
  // trigger, guard, grip
  triggerZ: 0.352,
  guardRear: 0.327,
  guardFront: 0.414,
  gripTopZ: 0.296,
  gripRake: 15,
  gripLen: 0.1,
  // magazine well and magazine
  magZ0: 0.4765,
  magZ1: 0.5165,
  magTop: -0.016,
  // barrel, fore-grip, front sight
  fgRear: 0.562,
  fgFront: 0.728,
  frontSightZ: 0.791,
  // sights
  rearSightZ: 0.288,
  sightY: 0.0355,
  // sling swivels (pivot pins)
  frontSwivelZ: 0.707,
  rearSwivelZ: 0.068,
  // grips / display
  supportZ: 0.645,
  rearRestZ: 0.226,
  frontRestZ: 0.66,
};

/** Butt stock. Keys: [z, hw, yTop, ySplit, yBot, eTop, eBot]. */
export const TSTOCK = new Profile([
  [0.004, 0.0198, -0.0215, -0.075, -0.1455, 2.4, 2.5],
  [0.03, 0.0199, -0.0200, -0.0715, -0.1375, 2.4, 2.5],
  [0.07, 0.0196, -0.0172, -0.0662, -0.1245, 2.4, 2.45],
  [0.11, 0.019, -0.0142, -0.061, -0.1105, 2.4, 2.4],
  [0.15, 0.0182, -0.0108, -0.0555, -0.0955, 2.4, 2.4],
  [0.19, 0.0174, -0.0068, -0.0495, -0.0805, 2.45, 2.4],
  [0.225, 0.0168, -0.0028, -0.0425, -0.0678, 2.6, 2.45],
  [0.248, 0.0166, 0.0015, -0.0360, -0.0588, 2.9, 2.6],
  [0.262, 0.0166, 0.0045, -0.0320, -0.0545, 3.2, 2.8],
]);

/** Horizontal fore-grip under the rear of the barrel. */
export const TFORE = new Profile([
  [0.562, 0.0146, 0.0022, -0.0092, -0.0335, 3.0, 2.6],
  [0.568, 0.0168, 0.0032, -0.0098, -0.0368, 3.0, 2.8],
  [0.585, 0.0175, 0.0035, -0.0102, -0.0386, 3.0, 3.0],
  [0.65, 0.0176, 0.0035, -0.0105, -0.0392, 3.0, 3.0],
  [0.71, 0.0174, 0.0034, -0.0104, -0.0386, 3.0, 3.0],
  [0.722, 0.0165, 0.0030, -0.0100, -0.0362, 3.0, 2.8],
  [0.728, 0.0144, 0.0024, -0.0096, -0.0325, 3.0, 2.6],
]);

/** Barrel outer radius along z. */
export const TBARREL: [number, number][] = [
  [0.54, 0.0134],
  [0.566, 0.0134],
  [0.62, 0.0126],
  [0.7, 0.0116],
  [0.78, 0.0108],
  [0.811, 0.0106],
];

/** Pistol-grip frame: top centre, axis direction (down the grip), forward direction. */
export const GRIP = (() => {
  const r = (TD.gripRake * Math.PI) / 180;
  return {
    top: [0, TD.frameBot + 0.0015, TD.gripTopZ] as [number, number, number],
    down: [0, -Math.cos(r), -Math.sin(r)] as [number, number, number],
    fwd: [0, -Math.sin(r), Math.cos(r)] as [number, number, number],
  };
})();
