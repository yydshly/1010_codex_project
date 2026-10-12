/**
 * DP-27 layout: key stations and profile functions in the DESIGN frame ("D-frame"):
 * metres, z = 0 at the rear face of the butt plate, +Z towards the muzzle (flash-hider face at
 * z = 1.270), y = 0 on the bore axis, +X = the weapon's left side.
 *
 * Proportions from the published overall / barrel lengths (1,270 / 605 mm), the 265 mm pan and scaled
 * side-view photographs of a DP-27 (stock with the lower lobe, receiver, rear sight behind the pan,
 * perforated casing with its lower guide tube, bipod collar, front sight with ears on the casing,
 * exposed barrel with the conical flash hider).
 */
import { THREE } from '../../../../core/kit';
import { curve, rectRing, type P2 } from './geo';

export const DP = {
  length: 1.27,
  barrel: 0.605,
  // butt / stock
  buttPlateT: 0.0045,
  stockFront: 0.274,
  // receiver rear tang (lies on the wrist) and the stock connecting screw
  tangRear: 0.236,
  screwZ: 0.2475,
  screwY: -0.0095,
  // receiver (upper box) and its narrow sloped rear end
  rcvRear: 0.3,
  rcvFront: 0.61,
  rcvTop: 0.025,
  rcvBot: -0.021,
  rcvHW: 0.024,
  // trigger frame under the receiver
  frameRear: 0.274,
  frameFront: 0.497,
  frameBot: -0.0335,
  frameHW: 0.0155,
  guardRear: 0.32,
  guardFront: 0.39,
  triggerZ: 0.346,
  // rear sight (sector type) on the receiver behind the pan
  sightRear: 0.364,
  sightFront: 0.47,
  notchY: 0.0515,
  // pan magazine (centre of its underside)
  panZ: 0.608,
  panY: 0.0262,
  // barrel casing (upper tube) + lower guide tube (gas piston / return spring)
  casingR: 0.021,
  casingT: 0.0012,
  casingRear: 0.598,
  casingFront: 0.999,
  guideR: 0.0095,
  guideY: -0.029,
  guideRear: 0.556,
  guideFront: 0.962,
  uporZ: 0.751,
  fsZ: 0.982,
  // barrel
  breechZ: 0.56,
  barrelR: 0.0105,
  fhRear: 1.143,
  fhCone: 1.169,
  fhFront: 1.27,
  // bipod collar and leg pivots
  clampZ: 0.897,
  clampW: 0.026,
  pivotY: -0.0445,
  pivotX: 0.0159,
  legLen: 0.272,
  // sling swivels
  swivelFrontZ: 0.868,
  swivelFrontDeg: 22,
  swivelRearZ: 0.168,
  swivelRearY: -0.031,
  // grips / display
  gripZ: 0.27,
  gripY: -0.0235,
  supportZ: 0.79,
  restRearZ: 0.445,
  restFrontZ: 0.94,
};

/** Top of the wooden stock (y) along z. */
export const stockTop = curve([
  [0.0, 0.012],
  [0.02, 0.0124],
  [0.1, 0.0104],
  [0.18, 0.0066],
  [0.215, 0.0042],
  [0.232, 0.0016],
  [0.245, -0.0018],
  [0.258, -0.0035],
  [0.274, -0.004],
]);

/** Underside of the wooden stock (y): heel, the deep lower lobe, the wrist. */
export const stockBot = curve([
  [0.0, -0.08],
  [0.05, -0.0802],
  [0.06, -0.0832],
  [0.068, -0.0898],
  [0.076, -0.0975],
  [0.086, -0.1022],
  [0.1, -0.1035],
  [0.121, -0.103],
  [0.131, -0.1005],
  [0.138, -0.0955],
  [0.143, -0.0875],
  [0.147, -0.0765],
  [0.151, -0.066],
  [0.157, -0.0597],
  [0.168, -0.0577],
  [0.195, -0.0585],
  [0.215, -0.0598],
  [0.232, -0.0583],
  [0.248, -0.054],
  [0.262, -0.048],
  [0.274, -0.0425],
]);

/** Half width of the stock (x). */
export const stockHW = curve([
  [0.0, 0.0212],
  [0.07, 0.0214],
  [0.14, 0.0206],
  [0.18, 0.0188],
  [0.215, 0.0171],
  [0.245, 0.0162],
  [0.274, 0.0158],
]);

/** Stock cross-section ring (CCW seen from +Z, fixed point count). */
export function stockRing(z: number, inset = 0): P2[] {
  const hw = stockHW(z) - inset;
  const top = stockTop(z) - inset;
  const bot = stockBot(z) + inset;
  const h = top - bot;
  const rT = Math.min(0.0085, h * 0.3);
  const rB = Math.min(0.0095, h * 0.3);
  return rectRing(hw, top, bot, rT, rB, 5, 3);
}

/** Stock cross-section at station z in the D-frame, as [x, y] pairs (for the display cradle). */
export function stockSection(z: number): P2[] {
  return stockRing(z);
}

/** Trigger-frame cross-section (flat bottom ahead of the trigger guard) in the D-frame. */
export function frameSection(): P2[] {
  return rectRing(DP.frameHW, -0.02, DP.frameBot, 0.001, 0.0012, 3, 3);
}

/** Guide-tube (lower tube) cross-section in the D-frame. */
export function guideSection(): P2[] {
  return Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return [DP.guideR * Math.cos(a), DP.guideY + DP.guideR * Math.sin(a)] as P2;
  });
}

// ------------------------------------------------------------------------------------------------
// Collision field for the sling solver (D-frame; negative inside). Cheap union of boxes / capsules.

type Sdf = (x: number, y: number, z: number) => number;

const sdBox = (x: number, y: number, z: number, cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, r = 0) => {
  const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r, qz = Math.abs(z - cz) - hz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
};

function sdCapsule(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, r: number) {
  const pa = p.clone().sub(a), ba = b.clone().sub(a);
  const h = Math.max(0, Math.min(1, pa.dot(ba) / ba.lengthSq()));
  return pa.sub(ba.multiplyScalar(h)).length() - r;
}

/** Weapon body collision field. `legs` = segments of the bipod legs in the current state. */
export function bodySdf(legs: [THREE.Vector3, THREE.Vector3][]): Sdf {
  const P = new THREE.Vector3();
  return (x, y, z) => {
    let d = Infinity;
    // wooden stock
    if (z < DP.stockFront + 0.01) {
      const zc = Math.max(0, Math.min(DP.stockFront, z));
      const top = stockTop(zc), bot = stockBot(zc), hw = stockHW(zc);
      d = Math.min(d, sdBox(x, y, z, 0, (top + bot) / 2, DP.stockFront / 2, hw, (top - bot) / 2, DP.stockFront / 2, 0.006));
    }
    // receiver + trigger frame + guard
    d = Math.min(d, sdBox(x, y, z, 0, (DP.rcvTop + DP.rcvBot) / 2, (DP.rcvRear + DP.rcvFront) / 2, DP.rcvHW, (DP.rcvTop - DP.rcvBot) / 2, (DP.rcvFront - DP.rcvRear) / 2, 0.004));
    d = Math.min(d, sdBox(x, y, z, 0, -0.02, (DP.frameRear + DP.frameFront) / 2, DP.frameHW, 0.0135, (DP.frameFront - DP.frameRear) / 2, 0.002));
    d = Math.min(d, sdBox(x, y, z, 0, -0.045, (DP.guardRear + DP.guardFront) / 2, 0.0055, 0.013, (DP.guardFront - DP.guardRear) / 2, 0.002));
    // casing and guide tube
    if (z > DP.casingRear - 0.02 && z < DP.casingFront + 0.02) {
      const zc = Math.max(DP.casingRear, Math.min(DP.casingFront, z));
      d = Math.min(d, Math.hypot(x, y, z - zc) - DP.casingR);
      d = Math.min(d, Math.hypot(x, y - DP.guideY, z - zc) - DP.guideR);
    }
    // bipod collar
    d = Math.min(d, sdBox(x, y, z, 0, -0.012, DP.clampZ, 0.026, 0.037, DP.clampW / 2, 0.004));
    // pan
    const rr = Math.hypot(x, z - DP.panZ) - 0.1325;
    const ry = Math.abs(y - (DP.panY + 0.009)) - 0.0105;
    d = Math.min(d, Math.hypot(Math.max(rr, 0), Math.max(ry, 0)) + Math.min(Math.max(rr, ry), 0));
    // bipod legs
    P.set(x, y, z);
    for (const [a, b] of legs) d = Math.min(d, sdCapsule(P, a, b, 0.0065));
    return d;
  };
}
