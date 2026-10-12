/**
 * Mosin-Nagant M1891/30 - design dimensions.
 *
 * DESIGN SPACE (used by every part builder in this folder): millimetres.
 *   u = distance FORWARD from the butt-plate face along the bore line (butt = 0, muzzle = 1232)
 *   y = height relative to the bore axis (+ up)
 *   x = + weapon's left, - weapon's right (bolt handle side)
 * The model file converts design space to the weapon-local frame of shared/contracts.ts
 * (metres, origin = trigger-hand grip centre on the wrist).
 *
 * Reference figures (see the asset's provenance): overall length 1232 mm, barrel 730 mm,
 * stock length 1143 mm, length of pull 343 mm, sight radius ~622 mm, cleaning rod 667 mm,
 * bolt assembly ~184 mm, bayonet ~500 mm overall with a ~430 mm cruciform blade.
 * Profile heights/widths of the stock are estimated from side/top photographs to match those.
 */
import * as THREE from 'three';

export type P2 = [number, number];

/** Monotone cubic (Fritsch-Carlson) interpolation through [x, y] control points. */
export function mono(pts: P2[]): (x: number) => number {
  const n = pts.length;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

export const smooth01 = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Key stations along u (mm). */
export const U = {
  butt: 0,
  woodRear: 3.6, // butt plate thickness
  rearSlot: 175,
  grip: 290, // trigger-hand grip centre on the wrist
  tgTangRear: 284,
  tgRear: 313, // trigger guard bow enters the stock
  trigger: 343, // trigger face (length of pull 343 mm)
  cockRear: 318, // cocking-piece knob rear face (bolt assembly ~184 mm)
  boltHandle: 375,
  tangRear: 300, // receiver tang end
  bridgeRear: 380,
  bridgeFront: 410,
  portFront: 495,
  magRear: 398,
  magFront: 500,
  breech: 502,
  ringFront: 532,
  rsRear: 580, // rear sight base
  rsNotch: 588,
  rsPivot: 646,
  rsFront: 652,
  hgRear: 652, // handguard
  grooveA: 548,
  grooveB: 752,
  frontSlot: 850,
  rearBand: 905,
  frontBand: 1130,
  woodFront: 1140,
  hgFront: 1128,
  rodHead: 1150,
  rodHeadEnd: 1168,
  fsBase0: 1198,
  fsBase1: 1218,
  fsPost: 1208,
  muzzle: 1232,
};

/** Stock top line (mm, rel. bore). The wood's upper edge / wrist comb line. */
export const stockTop = mono([
  [3, -56.1], [150, -36.9], [290, -18.6], [305, -16.7], [330, -13.7], [352, -11.5], [368, -9.2], [380, -5.6],
  [390, -4.1], [528, -4.0], [545, -2.3], [565, -2.0], [1141, -2.0],
]);

/** Stock bottom line (mm, rel. bore). */
export const stockBot = mono([
  [3, -178.4], [150, -119.3], [290, -63.0], [303, -57.4], [315, -52.9], [332, -50.5], [398, -49.0], [500, -45.6],
  [525, -42.8], [560, -39.6], [650, -36.3], [800, -33.4], [900, -31.6], [1000, -29.5], [1100, -27.1], [1141, -26.0],
]);

/** Max half width (at mid height). */
export const stockHW = mono([
  [3, 21.2], [150, 19.9], [255, 17.4], [295, 16.9], [330, 17.8], [368, 20.2], [398, 21.8], [500, 21.8], [530, 20.4],
  [570, 18.6], [650, 17.8], [800, 16.7], [1000, 15.7], [1141, 14.8],
]);

/** Half width at the top edge. */
export const stockHWT = mono([
  [3, 17.8], [150, 15.8], [270, 13.0], [300, 12.4], [340, 12.8], [368, 14.2], [384, 16.8], [528, 16.9], [548, 16.0],
  [600, 15.3], [652, 14.9], [1141, 12.7],
]);

/** Half width at the bottom. */
export const stockHWB = mono([
  [3, 18.8], [150, 17.0], [270, 14.0], [300, 13.7], [330, 15.0], [398, 17.3], [500, 17.3], [540, 15.7], [650, 14.5],
  [800, 13.5], [1141, 11.9],
]);

/** Barrel outer radius (mm) along u. */
export const barrelR = mono([
  [502, 14.3], [574, 14.3], [578, 12.2], [652, 12.0], [660, 11.2], [900, 9.7], [1128, 8.5], [1232, 7.45],
]);

/** Handguard top (mm, rel. bore). */
export const hgTop = (u: number) => barrelR(u) + 4.6;

/** Design (mm) -> weapon-local (m). */
export interface Frame {
  u0: number;
  y0: number;
}
export function toLocal(f: Frame, x: number, y: number, u: number): THREE.Vector3 {
  return new THREE.Vector3(x / 1000, (y - f.y0) / 1000, (u - f.u0) / 1000);
}

/** Grip centre on the wrist (design mm). */
export const GRIP: Frame = { u0: U.grip, y0: (stockTop(U.grip) + stockBot(U.grip)) / 2 };
