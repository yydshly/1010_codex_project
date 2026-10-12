/**
 * Il-2 fuselage shape (body frame, see dims.ts): station profiles, the section ring, the
 * cockpit sill line and the canopy arch. Shared by the fuselage, canopy and decal code.
 *
 * Section ring: parameter t (degrees) runs 0 = port waist (+X), 90 = top, 180 = starboard
 * waist, 270 = keel. Each half is a super-ellipse (separate exponents / widths top & bottom).
 */
import * as THREE from 'three';
import { curve, lerp, DEG, V } from './geo';

export const SEC = {
  /** top centreline (in the cockpit zone a virtual value that only sets the sill height) */
  top: curve([
    [0.76, 0.362], [0.9, 0.428], [1.2, 0.505], [1.8, 0.575], [2.5, 0.61], [3.05, 0.63],
    [3.35, 0.725], [3.6, 0.74], [4.4, 0.745], [4.8, 0.785], [5.75, 0.8], [6.4, 0.765],
    [7.4, 0.67], [8.5, 0.55], [9.5, 0.435], [10.3, 0.34], [10.9, 0.265], [11.3, 0.18],
  ]),
  bot: curve([
    [0.76, -0.366], [0.9, -0.47], [1.2, -0.61], [1.6, -0.715], [2.2, -0.8], [2.8, -0.855],
    [3.4, -0.878], [5.0, -0.888], [6.0, -0.87], [6.8, -0.8], [8.0, -0.665], [9.2, -0.53],
    [10.2, -0.425], [10.8, -0.335], [11.3, -0.17],
  ]),
  yc: curve([[0.76, 0.0], [1.5, -0.03], [2.8, -0.08], [4.5, -0.08], [6.0, -0.07], [8.0, -0.05], [10.0, -0.03], [11.3, 0.005]]),
  hw: curve([
    [0.76, 0.362], [0.9, 0.405], [1.2, 0.455], [1.8, 0.5], [2.5, 0.527], [3.2, 0.548], [4.5, 0.553],
    [5.5, 0.535], [6.3, 0.49], [7.5, 0.4], [8.8, 0.3], [10.0, 0.212], [10.8, 0.145], [11.3, 0.07],
  ]),
  nT: curve([[0.76, 2.0], [1.3, 2.4], [2.8, 2.6], [3.3, 3.0], [5.6, 3.0], [6.5, 2.5], [11.3, 2.3]]),
  nB: curve([[0.76, 2.0], [1.3, 2.6], [5.5, 2.7], [7.0, 2.4], [11.3, 2.2]]),
  kT: curve([[0.76, 1.0], [1.3, 0.8], [2.8, 0.82], [3.3, 0.86], [5.6, 0.86], [6.5, 0.78], [11.3, 0.76]]),
  kB: curve([[0.76, 1.0], [1.3, 0.88], [11.3, 0.9]]),
  /** paint demarcation angle (deg, below the port waist) */
  tD: curve([[0.76, -13], [2.8, -11], [6.0, -13], [11.3, -15]]),
};

export const T_SILL = 45;

export interface Section {
  s: number;
  yc: number;
  top: number;
  bot: number;
  hw: number;
  nT: number;
  nB: number;
  kT: number;
  kB: number;
}

export function secAt(s: number): Section {
  return {
    s,
    yc: SEC.yc(s),
    top: SEC.top(s),
    bot: SEC.bot(s),
    hw: SEC.hw(s),
    nT: SEC.nT(s),
    nB: SEC.nB(s),
    kT: SEC.kT(s),
    kB: SEC.kB(s),
  };
}

/** Point on the section ring at parameter tDeg (body frame). */
export function ringPoint(sec: Section, tDeg: number): THREE.Vector3 {
  const t = tDeg * DEG;
  const c = Math.cos(t), sn = Math.sin(t);
  const up = sn >= 0;
  const ex = 2 / (up ? sec.nT : sec.nB);
  const w = sec.hw * lerp(1, up ? sec.kT : sec.kB, sn * sn);
  const x = w * Math.sign(c) * Math.pow(Math.abs(c), ex);
  const h = up ? sec.top - sec.yc : sec.yc - sec.bot;
  const y = sec.yc + h * Math.sign(sn) * Math.pow(Math.abs(sn), ex);
  return V(x, y, -sec.s);
}

/** Port sill point at station s (mirror x for starboard). */
export function sillAt(s: number): THREE.Vector3 {
  return ringPoint(secAt(s), T_SILL);
}

/**
 * Canopy arch at station s: points from the port sill over the top to the starboard sill.
 * topY = crown height, topW = half width of the flat-ish crown, n = points.
 */
export function archAt(s: number, topY: number, topW: number, n = 17, sill?: THREE.Vector3): THREE.Vector3[] {
  const sl = sill ?? sillAt(s);
  const pts: THREE.Vector3[] = [];
  // profile: side wall leans inwards, rounded shoulder, gently crowned top
  const x0 = sl.x, y0 = sl.y;
  const shoulderY = lerp(y0, topY, 0.72);
  const shoulderX = lerp(x0, topW, 0.35) + 0.02;
  const half = (n - 1) / 2;
  for (let i = 0; i <= half; i++) {
    const u = i / half; // 0 at sill, 1 at crown centre
    let x: number, y: number;
    if (u < 0.45) {
      const k = u / 0.45;
      x = lerp(x0, shoulderX, k);
      y = lerp(y0, shoulderY, k);
    } else {
      const k = (u - 0.45) / 0.55; // quarter ellipse from the shoulder to the crown
      const a = (k * Math.PI) / 2;
      x = shoulderX * Math.cos(a) * (1 - 0.0 * k);
      y = shoulderY + (topY - shoulderY) * Math.sin(a);
    }
    pts.push(V(x, y, -s));
  }
  const port = pts.slice();
  const stbd = port.slice(0, -1).reverse().map((p) => V(-p.x, p.y, p.z));
  return [...port, ...stbd];
}
