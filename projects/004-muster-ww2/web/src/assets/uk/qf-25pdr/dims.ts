/**
 * Key dimensions of the Ordnance QF 25-pounder Mk II on Carriage 25-pr Mk I, metres.
 *
 * Construction frame ("C"): the gun standing on its wheels on flat ground (y = 0), axle centre
 * line on X at z = 0, +Z towards the muzzle, +X the gun's left (layer's side). build.ts lifts
 * the gun onto the firing platform and re-centres the finished model on its footprint.
 *
 * Trunnion frame ("T"): origin on the trunnion axis, +Z along the bore, bore axis at
 * y = D.boreAbove. The elevating mass (ordnance + cradle) is modelled in this frame.
 *
 * Reference numbers (sources in qf-25pdr.asset.ts):
 *  - calibre 87.6 mm (3.45 in), barrel 28 calibres, bore about 2.35 m
 *  - length muzzle to towing eye 4.6 m (IWM example: hook to barrel 4.70 m)
 *  - width over the hubs 2.13 m, wheel to wheel about 2.0 m, track 1.79 m
 *  - trunnion height 1.16 m, ground to shield top 1.71 m (IWM example)
 *  - 9.00-16 pneumatic tyres (period British field-carriage size; ~0.89 m diameter)
 */
export const D = {
  /** Tyre outer radius (9.00-16) and section width; 16 in rim bead radius. */
  tyreR: 0.445,
  tyreW: 0.232,
  rimR: 0.2032,
  /** Wheel centre height: tyre radius minus ~15 mm static deflection. */
  axleY: 0.43,
  /** Tyre centre plane half track (track 1.79 m). */
  wheelX: 0.895,
  /** Outer face of the hub cap (width over hubs 2.13 m). */
  hubX: 1.065,

  /** Trunnion axis (C frame) and bore height above it. */
  trunY: 1.16,
  trunZ: -0.05,
  boreAbove: 0.1,

  /** Ordnance stations along the bore, T frame. */
  ringRear: -0.74,
  ringFront: -0.38,
  cwRear: -0.38,
  cwFront: -0.17,
  /** Barrel tube muzzle face (inside the brake) and the brake itself. */
  muzzle: 1.645,
  brakeRear: 1.585,
  brakeFront: 1.905,

  /** Cradle extent along the bore (T frame) and section. */
  cradleRear: -0.14,
  cradleFront: 0.72,
  cradleHW: 0.13,
  cradleTop: 0.0,
  cradleBot: -0.22,

  /** Saddle: arms inner face |x|, thickness, base top (C). */
  armX: 0.158,
  armT: 0.02,
  saddleY: 0.735,

  /** Trail (C frame). Front section = two side members around the breech well. */
  trailHW: 0.256,
  trailSideT: 0.012,
  trailFrontZ: 0.2,
  wellRearZ: -1.05,
  trailEndZ: -2.6,
  trailTopFront: 0.705,
  trailTopEnd: 0.335,
  trailBotFront: 0.262,
  trailBotEnd: 0.14,
  /** End box half width. */
  trailEndHW: 0.118,
  /** Towing eye centre (plan) and spade blade station. */
  eyeZ: -2.715,
  spadeZ: -2.5,

  /** Shield (C frame): rear face plane, top, main plate half width, flap length / angle. */
  shieldZ: 0.34,
  shieldT: 0.005,
  shieldTop: 1.655,
  shieldHW: 0.72,
  flapLen: 0.3,
  flapDeg: 40,

  /** Firing platform No. 9: outer radius, deck top height (the lift under the wheels). */
  platR: 1.15,
  platTop: 0.085,
};

/** Bore axis height (C frame, on wheels). */
export const BORE_Y = D.trunY + D.boreAbove;

/** Trail top / bottom height at station z (C frame), valid from the well to the end box. */
export function trailTop(z: number): number {
  if (z >= -0.3) return D.trailTopFront;
  const t = (-0.3 - z) / (-0.3 - D.trailEndZ);
  return D.trailTopFront + (D.trailTopEnd - D.trailTopFront) * t;
}
export function trailBot(z: number): number {
  if (z >= 0.0) return D.trailBotFront;
  const t = -z / -D.trailEndZ;
  return D.trailBotFront + (D.trailBotEnd - D.trailBotFront) * t;
}
/** Trail outer half width at station z. */
export function trailHalfW(z: number): number {
  if (z >= D.wellRearZ) return D.trailHW;
  const zc = -1.6;
  if (z >= zc) {
    const t = (D.wellRearZ - z) / (D.wellRearZ - zc);
    const s = t * t * (3 - 2 * t);
    return D.trailHW + (0.15 - D.trailHW) * s;
  }
  const t = (zc - z) / (zc - D.trailEndZ);
  return 0.15 + (D.trailEndHW - 0.15) * t;
}
