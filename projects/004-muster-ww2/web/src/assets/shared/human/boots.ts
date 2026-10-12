/**
 * Footwear and lower-leg wear, modelled in the FOOT FRAME of the skeleton (origin on the ground
 * below the ankle joint, +Z towards the toe, +Y up, +X the foot's left) and meshed per side.
 *
 *  - 'jackboot': tall marching boot. Leather upper with a shaft following the shin up to
 *    `shaft` metres, open top with real leather thickness (the trouser leg disappears inside),
 *    optional concertina creases above the instep; separate sole + stacked heel.
 *  - 'ankle': laced ankle boot (upper to ~0.13 m, tongue, laces), same sole construction;
 *    normally worn with gaiters or puttees (LegwearSpec).
 *
 * The sole bottom is exactly at y = 0 under the heel and the ball of the foot (slight toe spring),
 * so a soldier built on these boots stands on the ground plane.
 */
import * as THREE from 'three';
import { blend, ellipsoid, roundCone, sphere, smax, smin, sstep, clamp, type Blob, type SDF, type Frame } from './sdfx';
import { ridges, bump, rect2 } from './garment';
import type { Skeleton, Side } from './skeleton';
import { sgn } from './skeleton';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export interface FootwearSpec {
  /** 'jackboot' (tall marching boot) or 'ankle' (laced ankle boot). */
  style: 'jackboot' | 'ankle';
  /** Upper leather colour. */
  leather: number;
  /** Sole / heel colour (default near-black leather). */
  sole?: number;
  /** Jackboot shaft top height above the ground (m, 1.76 m figure), default 0.34. */
  shaft?: number;
  /** Concertina creases above the instep (jackboots), default true. */
  creases?: boolean;
  /** Ankle boots: show laces, default true. */
  laces?: boolean;
  /** Heel height incl. sole under the heel (m), default 0.026. Lifts the whole figure. */
  heel?: number;
}

export interface LegwearSpec {
  /** 'gaiters': short canvas gaiters with two straps; 'puttees': wrapped wool strips. */
  style: 'gaiters' | 'puttees';
  color: number;
  /** Top height above the ground (m), default gaiters 0.2 / puttees 0.33. */
  top?: number;
  /** Strap leather colour for gaiters. */
  strap?: number;
  kind?: 'canvas' | 'wool';
}

/** What covers the lower leg: the trousers end at `top` (tucked inside, or bloused over it). */
export interface LegCover {
  /** Height of the covering's top edge above the ground (m, world). */
  top: number;
  /** Inner radius at the top edge (tucked trousers must stay inside). */
  innerTop: number;
  /** Outer radius at the top edge (bloused trousers must stay outside). */
  outerTop: number;
}

export function legCover(foot: FootwearSpec, leg: LegwearSpec | null | undefined, s: number): LegCover {
  if (leg) {
    const top = (leg.top ?? (leg.style === 'gaiters' ? 0.2 : 0.33)) * s;
    return leg.style === 'gaiters' ? { top, innerTop: 0.047 * s, outerTop: 0.052 * s } : { top, innerTop: 0.052 * s, outerTop: 0.058 * s };
  }
  if (foot.style === 'jackboot') {
    const top = (foot.shaft ?? 0.34) * s;
    return { top, innerTop: 0.0655 * s, outerTop: 0.0695 * s };
  }
  return { top: 0.13 * s, innerTop: 0.047 * s, outerTop: 0.051 * s };
}

// ------------------------------------------------------------------ sole

/** Plan outline of the sole (left foot, x = foot-left = lateral), 2D SDF in (x, z). */
function soleOutline(x: number, z: number, s: number): number {
  // tapered 2D capsules: heel -> ball -> toe (medial side straighter)
  const seg = (ax: number, az: number, bx: number, bz: number, ra: number, rb: number) => {
    const ex = bx - ax, ez = bz - az;
    const l2 = ex * ex + ez * ez;
    const t = clamp(((x - ax) * ex + (z - az) * ez) / l2, 0, 1);
    const dx = x - ax - ex * t, dz = z - az - ez * t;
    return Math.sqrt(dx * dx + dz * dz) - (ra + (rb - ra) * t);
  };
  const a = seg(0.002 * s, -0.03 * s, 0.006 * s, 0.135 * s, 0.038 * s, 0.054 * s);
  const b = seg(0.006 * s, 0.135 * s, -0.006 * s, 0.198 * s, 0.054 * s, 0.035 * s);
  const k = 0.02 * s;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Sole + heel SDF in the foot frame (left foot). Bottom at y = 0. */
export function soleSDF(s: number, heel: number): SDF {
  const toe0 = 0.17 * s, heelFront = 0.018 * s, waistEnd = 0.075 * s;
  const tSole = 0.011 * s;
  return (x, y, z) => {
    const o = soleOutline(x, z, s);
    // bottom: 0 under heel and ball, arch lifted between, toe spring at the tip
    let bottom = 0;
    if (z > heelFront && z < waistEnd) bottom = (heel - tSole) * (1 - sstep(heelFront, waistEnd, z)) * 0.0 + 0.004 * s * Math.sin(Math.PI * (z - heelFront) / (waistEnd - heelFront));
    if (z > toe0) bottom = ((z - toe0) / (0.06 * s)) ** 2 * 0.009 * s;
    // top: heel height at the back, sole thickness at the front
    const top = z < heelFront ? heel : z < waistEnd ? heel + (tSole + bottom - heel) * sstep(heelFront, waistEnd, z) : tSole + bottom;
    const slab = Math.max(bottom - y, y - top);
    let d = smax(o, slab, 0.0015 * s);
    // heel block separated from the sole layer by a thin groove
    if (z < heelFront + 0.004 * s) {
      const g = Math.abs(y - (heel - tSole)) - 0.0007 * s;
      const edge = -o - 0.0016 * s;
      d = Math.max(d, -Math.max(g, edge));
    }
    return d;
  };
}

// ------------------------------------------------------------------ uppers

export interface BootBuild {
  /** Leather upper (solid; it stops just inside the top rim band). Mesh coarse (~6 mm). */
  upper: SDF;
  /** Top rim of the shaft: a hollow band with the real leather thickness. Mesh fine (~2.6 mm). */
  rim: SDF;
  /** Bounds of the rim in the foot frame. */
  rimMin: [number, number, number];
  rimMax: [number, number, number];
  sole: SDF;
  /** Bounds in the foot frame. */
  min: [number, number, number];
  max: [number, number, number];
}

/**
 * Boot SDFs in the foot frame for a LEFT foot (mirror x for the right foot).
 * `shank` = unit direction from the ankle towards the knee, in the same foot frame (left foot).
 */
export function bootSDF(spec: FootwearSpec, s: number, ankleY: number, shank: THREE.Vector3): BootBuild {
  const heel = spec.heel ?? 0.026 * s;
  const soleTop = (z: number) => (z < 0.018 * s ? heel : z < 0.075 * s ? heel + (0.011 * s - heel) * sstep(0.018 * s, 0.075 * s, z) : 0.011 * s + (z > 0.17 * s ? ((z - 0.17 * s) / (0.06 * s)) ** 2 * 0.009 * s : 0));
  const A = V(0, ankleY, 0);
  const tall = spec.style === 'jackboot';
  const shaftTop = tall ? (spec.shaft ?? 0.34) * s : 0.13 * s;
  const sh = shank.clone().normalize();
  const topC = A.clone().addScaledVector(sh, (shaftTop - ankleY) / Math.max(0.5, sh.y));
  const lastBlobs: Blob[] = [
    // heel counter
    { ...ellipsoid([0.0, heel + 0.034 * s, -0.026 * s], [0.041 * s, 0.05 * s, 0.043 * s]), k: 0.02 * s },
    // vamp / instep
    { ...ellipsoid([0.004 * s, heel * 0.5 + 0.043 * s, 0.07 * s], [0.047 * s, 0.047 * s, 0.1 * s]), k: 0.022 * s },
    // toe box
    { ...ellipsoid([0.006 * s, 0.03 * s, 0.168 * s], [0.05 * s, 0.03 * s, 0.062 * s]), k: 0.018 * s },
    // ankle
    { ...roundCone(A.clone().addScaledVector(sh, -0.035 * s), A.clone().addScaledVector(sh, 0.04 * s), 0.05 * s, 0.049 * s), k: 0.03 * s },
  ];
  const last = blend(lastBlobs, 0.02 * s);
  // shaft (tall boots) or collar (ankle boots)
  const rA = 0.049 * s;
  const rT = tall ? 0.0695 * s : 0.051 * s;
  const shaftStart = A.clone().addScaledVector(sh, 0.02 * s);
  const shaft = roundCone(shaftStart, topC, rA, rT).f;
  const creases = tall && spec.creases !== false;
  const upperOuter: SDF = (x, y, z) => {
    let d = smin(last(x, y, z), shaft(x, y, z), 0.035 * s);
    if (creases) {
      // concertina creases: soft horizontal ridges above the instep, strongest at the front
      const h = y - ankleY;
      if (h > -0.03 * s && h < 0.13 * s && z > -0.02 * s) {
        const front = sstep(-0.01 * s, 0.05 * s, z - 0.3 * x);
        const w = bump(h, 0.05 * s, 0.045 * s) * front;
        if (w > 0.01) d -= 0.0022 * s * w * ridges(h / (0.024 * s) + 0.25 * Math.sin(x * 60), 1, 2.5, 1.3);
      }
    }
    return d;
  };
  // open top: cut perpendicular to the shin. The main upper is solid and stops inside the rim
  // band; the rim (hollow, real leather thickness, very slightly raised like a finished edge) is
  // meshed finely so the edge is crisp (a thin shell would break up at the coarse cell).
  const tLeather = 0.0042 * s;
  const innerShaft = roundCone(shaftStart, topC.clone().addScaledVector(sh, 0.05 * s), rA - tLeather, rT - tLeather).f;
  const nTop = sh.clone();
  const cut = (x: number, y: number, z: number) => (x - topC.x) * nTop.x + (y - topC.y) * nTop.y + (z - topC.z) * nTop.z;
  const rimH = 0.022 * s, rimRaise = 0.0007 * s;
  const rim: SDF = (x, y, z) => {
    const c = cut(x, y, z);
    if (c > 0.02 || c < -rimH - 0.02) return Math.max(c, -c - rimH);
    let d = Math.max(upperOuter(x, y, z) - rimRaise, -innerShaft(x, y, z));
    d = smax(d, c, 0.0014 * s);
    d = smax(d, -(c + rimH), 0.0008 * s);
    return d;
  };
  const upper: SDF = (x, y, z) => {
    let d = upperOuter(x, y, z);
    if (d > 0.02) return d;
    const c = cut(x, y, z) + rimH - 0.008 * s;
    if (c > d) d = c;
    // sit on the sole: cut below the sole top (embedded 2 mm)
    d = Math.max(d, soleTop(z) - 0.002 * s - y);
    if (!tall) {
      // front lace opening: shallow groove and a tongue between the facings
      const lx = Math.abs(x - 0.004 * s);
      if (z > 0.02 * s && y > ankleY - 0.01 * s) {
        const g = Math.max(0.006 * s - lx, 0) * 0.5;
        d += g * sstep(ankleY - 0.01 * s, ankleY + 0.01 * s, y);
      }
    }
    return d;
  };
  const sole = soleSDF(s, heel);
  const top = topC.clone().addScaledVector(sh, 0.01);
  const rimC = topC.clone().addScaledVector(sh, -rimH / 2);
  const rimR = rT + 0.02 * s;
  return {
    upper,
    rim,
    rimMin: [rimC.x - rimR - 0.02 * s, rimC.y - rimH - 0.03 * s, rimC.z - rimR - 0.02 * s],
    rimMax: [rimC.x + rimR + 0.02 * s, rimC.y + rimH + 0.03 * s, rimC.z + rimR + 0.02 * s],
    sole,
    min: [Math.min(-0.075 * s, top.x - 0.08 * s), -0.002, Math.min(-0.085 * s, top.z - 0.08 * s)],
    max: [Math.max(0.075 * s, top.x + 0.08 * s), top.y + 0.02 * s, Math.max(0.25 * s, top.z + 0.08 * s)],
  };
}

/** Lace + eyelet points for an ankle boot (left foot frame). */
export function lacePoints(s: number, ankleY: number): { eyelets: THREE.Vector3[]; crosses: [THREE.Vector3, THREE.Vector3][] } {
  const eyelets: THREE.Vector3[] = [];
  const crosses: [THREE.Vector3, THREE.Vector3][] = [];
  const rows = 5;
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1);
    const y = ankleY * 0.62 + t * (0.125 * s - ankleY * 0.62);
    const z = 0.075 * s - t * 0.05 * s;
    const hw = 0.012 * s + t * 0.004 * s;
    eyelets.push(V(0.004 * s + hw, y, z), V(0.004 * s - hw, y, z));
  }
  for (let i = 0; i + 1 < rows; i++) {
    crosses.push([eyelets[i * 2], eyelets[(i + 1) * 2 + 1]]);
    crosses.push([eyelets[i * 2 + 1], eyelets[(i + 1) * 2]]);
  }
  return { eyelets, crosses };
}

// ------------------------------------------------------------------ gaiters & puttees (world space)

/**
 * Lower-leg wear around the shank (world space): a tube from just above the boot collar to
 * `top`, following the shin. Gaiters get two strap bands; puttees a spiral wrap relief.
 */
export function legwearSDF(sk: Skeleton, side: Side, spec: LegwearSpec, bodyShank: SDF): { f: SDF; straps: SDF | null; min: [number, number, number]; max: [number, number, number] } {
  const s = sk.s;
  const L = sk.leg[side];
  const sh = L.knee.clone().sub(L.ankle).normalize();
  const top = (spec.top ?? (spec.style === 'gaiters' ? 0.2 : 0.33)) * s;
  const bottom = spec.style === 'gaiters' ? 0.075 * s : 0.1 * s;
  const at = (h: number) => L.ankle.clone().addScaledVector(sh, (h - L.ankle.y) / Math.max(0.5, sh.y));
  const pB = at(bottom), pT = at(top);
  const t = spec.style === 'gaiters' ? 0.0028 * s : 0.004 * s;
  const ease = spec.style === 'gaiters' ? 0.004 * s : 0.006 * s;
  const fwd = L.foot.z.clone().addScaledVector(sh, -L.foot.z.dot(sh)).normalize();
  const lat = new THREE.Vector3().crossVectors(sh, fwd).multiplyScalar(-sgn(side));
  const seed = side === 'l' ? 0.7 : 2.1;
  const inner: SDF = (x, y, z) => bodyShank(x, y, z) - ease;
  const f: SDF = (x, y, z) => {
    const a = inner(x, y, z);
    let d = a - t;
    if (d > 0.03) return d;
    const h = y;
    // puttee wraps: diagonal steps (each turn overlaps the one below)
    if (spec.style === 'puttees') {
      const px = x - pB.x, pz = z - pB.z;
      const th = Math.atan2(px * lat.x + pz * lat.z, px * fwd.x + pz * fwd.z) * sgn(side);
      const u = (h - bottom) / (0.045 * s) + th / (Math.PI * 2);
      const fr = u - Math.floor(u);
      d -= 0.0022 * s * fr * fr;
    }
    // top and bottom edges (open, with thickness)
    d = smax(d, h - top, 0.0015 * s);
    d = smax(d, bottom - h, 0.0015 * s);
    return d;
  };
  let straps: SDF | null = null;
  if (spec.style === 'gaiters') {
    const hs = [bottom + 0.035 * s, top - 0.03 * s];
    straps = (x, y, z) => {
      const a = inner(x, y, z) - t;
      let d = Infinity;
      for (const hh of hs) {
        const band = Math.max(a - 0.0032 * s, -a - 0.002 * s, Math.abs(y - hh) - 0.008 * s);
        d = Math.min(d, band);
      }
      return d;
    };
  }
  const bmin = new THREE.Vector3(Math.min(pB.x, pT.x), bottom, Math.min(pB.z, pT.z)).subScalar(0.09 * s);
  const bmax = new THREE.Vector3(Math.max(pB.x, pT.x), top, Math.max(pB.z, pT.z)).addScalar(0.09 * s);
  bmin.y = bottom - 0.01; bmax.y = top + 0.01;
  return { f, straps, min: bmin.toArray() as [number, number, number], max: bmax.toArray() as [number, number, number] };
}

/** Foot frame as a matrix (for placing boot meshes); mirrors x for the right foot. */
export function footMatrix(foot: Frame, side: Side): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeBasis(foot.x, foot.y, foot.z).setPosition(foot.o);
  if (side === 'r') m.multiply(new THREE.Matrix4().makeScale(-1, 1, 1));
  return m;
}

export { rect2 };
