/**
 * Type 99 light machine gun layout in the DESIGN frame ("L-frame"): metres, z = 0 at the rear face of the
 * butt plate, +Z towards the muzzle (flash-hider face at 1.181), y = 0 on the bore axis, +X = the gun's
 * left side.
 *
 * Published figures used: overall length 1,181 mm, barrel 550 mm. Everything else is proportioned from
 * photographs (not measured): wooden butt with a steel butt plate and the folding monopod under it,
 * rectangular receiver with the top magazine well and the cocking handle on the right, wooden pistol grip,
 * barrel locked by a nut at the receiver front, finned rear half of the barrel with the folding carrying
 * handle, gas cylinder below the barrel ending in the gas block that carries the bipod, conical flash hider
 * screwed on the muzzle, open sights offset to the LEFT of the magazine.
 */
import { Profile } from '../common/geo';

export const LD = {
  length: 1.181,
  barrel: 0.55,
  plateZ: 0.0045,
  // receiver
  rcvRear: 0.296,
  rcvFront: 0.606,
  rcvTop: 0.027,
  rcvBot: -0.043,
  rcvHW: 0.0255,
  // magazine well (top) and magazine
  wellZ0: 0.452,
  wellZ1: 0.546,
  magW: 0.0232,
  // trigger group / grip
  thZ0: 0.33,
  thZ1: 0.452,
  thBot: -0.058,
  thHW: 0.0165,
  triggerZ: 0.4,
  gripTopZ: 0.365,
  gripRake: 18, // deg (bottom towards the rear)
  gripLen: 0.102,
  // barrel
  nutZ0: 0.606,
  nutZ1: 0.632,
  finZ0: 0.656,
  finZ1: 0.868,
  chamberZ: 0.545,
  muzzleZ: 1.095,
  fhZ1: 1.181,
  // gas system / bipod
  gasY: -0.031,
  gasR: 0.0085,
  gbZ0: 0.928,
  gbZ1: 0.978,
  bipodZ: 0.905,
  bipodY: -0.031,
  legLen: 0.285,
  // sights (offset to the LEFT)
  sightX: 0.037,
  sightY: 0.063,
  rearSightZ: 0.405,
  frontSightZ: 1.062,
  // carrying handle
  handleZ: 0.644,
  // sling swivels (pivot pins, left side)
  frontSwivelZ: 0.617,
  rearSwivelZ: 0.125,
  // grips / display
  supportZ: 0.715,
  rearRestZ: 0.19,
  frontRestZ: 0.955,
};

/** Butt: keys [z, hw, yTop, ySplit, yBot, eTop, eBot] from the butt plate to the receiver. */
export const BUTT = new Profile([
  [LD.plateZ, 0.0202, -0.0225, -0.0855, -0.1485, 2.5, 2.5],
  [0.04, 0.0206, -0.0212, -0.0825, -0.1415, 2.5, 2.5],
  [0.1, 0.0203, -0.0188, -0.0765, -0.1285, 2.5, 2.45],
  [0.16, 0.0194, -0.0158, -0.0692, -0.1125, 2.5, 2.4],
  [0.21, 0.0183, -0.0128, -0.0602, -0.0935, 2.6, 2.4],
  [0.245, 0.0176, -0.0102, -0.0518, -0.0768, 2.8, 2.5],
  [0.27, 0.0178, -0.0078, -0.0452, -0.0648, 3.2, 2.7],
  [0.29, 0.0186, -0.0058, -0.0405, -0.0582, 3.6, 3.0],
  [0.302, 0.019, -0.005, -0.039, -0.0565, 3.8, 3.0],
]);

/** Barrel outer radius (smooth sections) along z. */
export function barrelR(z: number): number {
  if (z < LD.finZ1 + 0.004) return 0.0134;
  const t = Math.min(1, (z - LD.finZ1) / (LD.muzzleZ - LD.finZ1));
  return 0.0122 - 0.0012 * t;
}

/** Magazine centre line: from the well (s = 0) up and curving forward (s = 1). Returns [z, y] + tangent. */
export function magCentre(s: number): { z: number; y: number; tz: number; ty: number } {
  // circular arc: starts vertical at the well centre, curving forwards (radius R)
  const R = 0.5;
  const len = 0.19;
  const a = (s * len) / R;
  const z0 = (LD.wellZ0 + LD.wellZ1) / 2 - 0.004;
  const y0 = LD.rcvTop - 0.012;
  return { z: z0 + R * (1 - Math.cos(a)), y: y0 + R * Math.sin(a), tz: Math.sin(a), ty: Math.cos(a) };
}
