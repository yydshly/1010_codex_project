/**
 * Posed body: SDF anatomy attached to the skeleton.
 *
 * TRUNK: one continuous loft (cross-section keyframes, monotone-cubic interpolated) in REST TRUNK
 * SPACE (origin = pelvis origin between the hip joints, +Y up, +Z forward, spine straight), plus
 * anatomical masses (pectorals, scapulae, buttocks, shoulder girdle, clavicles) in the same space.
 * A world point is mapped into rest trunk space by blending the inverse transforms of the pelvis,
 * lumbar and chest bones by height ("inverse skinning"), so the trunk bends smoothly with the
 * spine - no stacked segments, no seams.
 *
 * LIMBS: blobs attached to the posed bones (world space). Arms blend into the trunk only near the
 * shoulder (variable blend radius), so a forearm crossing the belly never grows a web.
 *
 * NECK: defined in the neck frame (shared with the head mesh and the collar).
 *
 * The body is mostly hidden by clothing: it is the base surface garments are offset from, the
 * reference for fitting, and the review "body" layer of the test asset.
 */
import * as THREE from 'three';
import {
  blend, boundsOf, ellipsoid, roundCone, sphere, flatCone, smin, sstep, loftProfile, loftTable, loftSDF,
  type Blob, type SDF, type Frame, type LoftKey, type LoftTable,
} from './sdfx';
import { type Skeleton, type Side, sgn } from './skeleton';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/**
 * Trunk cross-sections (skin), rest trunk space at stature 1.76 m (y relative to the hip joints,
 * which sit at 0.903 m): [y, front z, back z, half-width, z of the widest point].
 * Targets: waist ~0.77 m girth at y 0.18 (1.08 m), chest ~0.93 m at the nipples (y 0.38),
 * hips/seat with the buttocks and thighs ~0.93 m, suprasternal notch y 0.53, C7 y 0.60.
 */
export const TRUNK_KEYS: LoftKey[] = [
  [-0.095, 0.035, -0.07, 0.07],
  [-0.06, 0.07, -0.105, 0.132],
  [-0.02, 0.088, -0.116, 0.155, -0.012],
  [0.03, 0.095, -0.113, 0.16, -0.006],
  [0.08, 0.098, -0.1, 0.153],
  [0.13, 0.1, -0.088, 0.145],
  [0.18, 0.102, -0.084, 0.141],
  [0.24, 0.104, -0.088, 0.146],
  [0.3, 0.11, -0.097, 0.155],
  [0.36, 0.121, -0.106, 0.162, -0.006],
  [0.41, 0.124, -0.112, 0.165, -0.012],
  [0.46, 0.114, -0.114, 0.161, -0.016],
  [0.51, 0.095, -0.107, 0.146, -0.02],
  [0.55, 0.07, -0.094, 0.116, -0.02],
  [0.59, 0.045, -0.075, 0.075, -0.016],
  [0.625, 0.03, -0.06, 0.05, -0.016],
];

// ------------------------------------------------------------------ trunk space

export interface TrunkSpace {
  /** World point -> rest trunk coordinates (written to out[0..2]). */
  toRest(x: number, y: number, z: number, out: number[]): void;
  /** Rest trunk point -> world. */
  toWorld(p: THREE.Vector3): THREE.Vector3;
  /** World direction of a rest-space direction at rest height y. */
  dirToWorld(d: THREE.Vector3, yRest: number): THREE.Vector3;
}

interface BoneXf { o: THREE.Vector3; r: THREE.Vector3; m: number[] }

export function trunkSpace(sk: Skeleton): TrunkSpace {
  const s = sk.s;
  const bones: BoneXf[] = [
    { o: sk.pelvis.o, r: V(), m: [] },
    { o: sk.lumbar.o, r: sk.rest.lumbar, m: [] },
    { o: sk.chest.o, r: sk.rest.chest, m: [] },
  ];
  const frames: Frame[] = [sk.pelvis, sk.lumbar, sk.chest];
  bones.forEach((b, i) => {
    const f = frames[i];
    b.m = [f.x.x, f.x.y, f.x.z, f.y.x, f.y.y, f.y.z, f.z.x, f.z.y, f.z.z];
  });
  const P0 = 0.05 * s, P1 = 0.15 * s, C0 = 0.24 * s, C1 = 0.34 * s;
  const [bp, bl, bc] = bones;
  const q = [0, 0, 0];
  const local = (b: BoneXf, x: number, y: number, z: number, out: number[]) => {
    const dx = x - b.o.x, dy = y - b.o.y, dz = z - b.o.z, m = b.m;
    out[0] = b.r.x + dx * m[0] + dy * m[1] + dz * m[2];
    out[1] = b.r.y + dx * m[3] + dy * m[4] + dz * m[5];
    out[2] = b.r.z + dx * m[6] + dy * m[7] + dz * m[8];
  };
  const ql = [0, 0, 0], qc = [0, 0, 0];
  return {
    toRest(x, y, z, out) {
      local(bp, x, y, z, q);
      const yy = q[1];
      if (yy <= P0) { out[0] = q[0]; out[1] = q[1]; out[2] = q[2]; return; }
      local(bl, x, y, z, ql);
      if (yy < P1) {
        const w = sstep(P0, P1, yy);
        out[0] = q[0] + (ql[0] - q[0]) * w; out[1] = q[1] + (ql[1] - q[1]) * w; out[2] = q[2] + (ql[2] - q[2]) * w;
        return;
      }
      if (yy <= C0) { out[0] = ql[0]; out[1] = ql[1]; out[2] = ql[2]; return; }
      local(bc, x, y, z, qc);
      if (yy < C1) {
        const w = sstep(C0, C1, yy);
        out[0] = ql[0] + (qc[0] - ql[0]) * w; out[1] = ql[1] + (qc[1] - ql[1]) * w; out[2] = ql[2] + (qc[2] - ql[2]) * w;
        return;
      }
      out[0] = qc[0]; out[1] = qc[1]; out[2] = qc[2];
    },
    toWorld(p) {
      const w = (i: number) => {
        const f = frames[i], b = bones[i];
        const d = p.clone().sub(b.r);
        return f.o.clone().addScaledVector(f.x, d.x).addScaledVector(f.y, d.y).addScaledVector(f.z, d.z);
      };
      const y = p.y;
      if (y <= P0) return w(0);
      if (y < P1) return w(0).lerp(w(1), sstep(P0, P1, y));
      if (y <= C0) return w(1);
      if (y < C1) return w(1).lerp(w(2), sstep(C0, C1, y));
      return w(2);
    },
    dirToWorld(d, y) {
      const w = (i: number) => {
        const f = frames[i];
        return V().addScaledVector(f.x, d.x).addScaledVector(f.y, d.y).addScaledVector(f.z, d.z);
      };
      let r: THREE.Vector3;
      if (y <= P0) r = w(0);
      else if (y < P1) r = w(0).lerp(w(1), sstep(P0, P1, y));
      else if (y <= C0) r = w(1);
      else if (y < C1) r = w(1).lerp(w(2), sstep(C0, C1, y));
      else r = w(2);
      return r.normalize();
    },
  };
}

/** Evaluate a rest-trunk-space SDF at world points. */
export function inTrunk(space: TrunkSpace, f: SDF): SDF {
  const q = [0, 0, 0];
  return (x, y, z) => {
    space.toRest(x, y, z, q);
    return f(q[0], q[1], q[2]);
  };
}

/** Wrap a loft table as a blob (bounding sphere in the loft's own space). */
export function loftBlob(t: LoftTable, cz = 0): Blob {
  const y1 = t.y0 + (t.n - 1) * t.dy;
  let r = 0;
  for (let i = 0; i < t.n; i++) {
    const a = t.rows[i * 4], zm = t.rows[i * 4 + 1], bf = t.rows[i * 4 + 2], bb = t.rows[i * 4 + 3];
    r = Math.max(r, a, Math.abs(zm + bf - cz), Math.abs(zm - bb - cz));
  }
  const cy = (t.y0 + y1) / 2;
  return { f: loftSDF(t), cx: 0, cy, cz, r: Math.sqrt(r * r + ((y1 - t.y0) / 2) ** 2) };
}

// ------------------------------------------------------------------ neck (shared with head & collar)

/**
 * Neck in the NECK frame (origin at the base of the neck, C7/T1 level at the spine; +Y up the
 * neck, +Z forward). Returns blobs in world space.
 */
export const NECK = {
  /** Neck axis end points in the neck frame (1.76 m): base (inside the trunk) and under the skull. */
  bottom: [0, -0.044, 0.03] as const,
  top: [0, 0.111, 0.033] as const,
  rBottom: 0.058,
  rTop: 0.051,
};

export function neckBlobs(sk: Skeleton): Blob[] {
  const s = sk.s, N = sk.neck;
  const p = (x: number, y: number, z: number) => N.o.clone().addScaledVector(N.x, x * s).addScaledVector(N.y, y * s).addScaledVector(N.z, z * s);
  const [b, t] = [NECK.bottom, NECK.top];
  return [
    { ...roundCone(p(b[0], b[1], b[2]), p(t[0], t[1], t[2]), NECK.rBottom * s, NECK.rTop * s), k: 0.045 * s },
    { ...roundCone(p(t[0], t[1], t[2]), p(0, 0.2, 0.05), NECK.rTop * s, 0.05 * s), k: 0.02 * s },
    // sternocleidomastoids (behind the ear -> sternal notch)
    { ...roundCone(p(0.05, 0.16, 0.035), p(0.018, 0.005, 0.098), 0.013 * s, 0.011 * s), k: 0.012 * s },
    { ...roundCone(p(-0.05, 0.16, 0.035), p(-0.018, 0.005, 0.098), 0.013 * s, 0.011 * s), k: 0.012 * s },
  ];
}

// ------------------------------------------------------------------ limbs

export interface ArmBlobs { deltoid: Blob[]; upper: Blob[]; fore: Blob[] }
export interface LegBlobs { thigh: Blob[]; shank: Blob[]; foot: Blob[] }

/** Unit vector perpendicular to `axis`, as close as possible to `pref`. */
export function perpTo(axis: THREE.Vector3, pref: THREE.Vector3, fallback = V(0, 0, 1)): THREE.Vector3 {
  const v = pref.clone().addScaledVector(axis, -pref.dot(axis));
  if (v.lengthSq() < 1e-8) v.copy(fallback).addScaledVector(axis, -fallback.dot(axis));
  return v.normalize();
}

/** Anatomical axes of an upper arm: along (u), anterior (a, towards the forearm bend), lateral. */
export function armAxes(sk: Skeleton, side: Side) {
  const A = sk.arm[side];
  const u = A.elbow.clone().sub(A.shoulder).normalize();
  const f = A.wrist.clone().sub(A.elbow).normalize();
  const flex = u.dot(f);
  const fwd = sk.chest.z.clone();
  let ant = f.clone().addScaledVector(u, -f.dot(u));
  if (flex > 0.985 || ant.lengthSq() < 1e-6) ant = perpTo(u, fwd);
  else ant.normalize().lerp(perpTo(u, fwd), sstep(0.9, 0.985, flex)).normalize();
  const lat = new THREE.Vector3().crossVectors(u, ant).multiplyScalar(-sgn(side));
  // make lateral point away from the midline
  if (lat.dot(sk.chest.x.clone().multiplyScalar(sgn(side))) < 0) lat.negate();
  return { u, f, ant, lat };
}

export function armBlobs(sk: Skeleton, side: Side): ArmBlobs {
  const s = sk.s, A = sk.arm[side];
  const { u, f, ant, lat } = armAxes(sk, side);
  const S = A.shoulder, E = A.elbow, W = A.wrist;
  const axesU = { x: lat, y: u, z: ant };
  // k: blend radius used when the chain is assembled (small: masses protrude, no inflation)
  const deltoid: Blob[] = [
    { ...ellipsoid(S.clone().addScaledVector(lat, 0.012 * s).addScaledVector(u, 0.035 * s), [0.036 * s, 0.068 * s, 0.046 * s], axesU), k: 0.03 * s },
  ];
  const rE = 0.034 * s;
  const upper: Blob[] = [
    { ...roundCone(S.clone().addScaledVector(u, 0.035 * s), E, 0.043 * s, rE), k: 0.02 * s },
    { ...ellipsoid(S.clone().addScaledVector(u, 0.175 * s).addScaledVector(ant, 0.014 * s), [0.034 * s, 0.085 * s, 0.034 * s], axesU), k: 0.014 * s },
    { ...ellipsoid(S.clone().addScaledVector(u, 0.14 * s).addScaledVector(ant, -0.014 * s), [0.037 * s, 0.1 * s, 0.034 * s], axesU), k: 0.014 * s },
  ];
  const hx = A.hand.x.clone(), hz = A.hand.z.clone();
  const fx = perpTo(f, hx), fz = new THREE.Vector3().crossVectors(fx, f);
  const fore: Blob[] = [
    { ...roundCone(E, W, rE, 0.024 * s), k: 0.004 * s },
    { ...sphere(E.clone().addScaledVector(ant, -0.012 * s).addScaledVector(u, 0.004 * s), 0.022 * s), k: 0.01 * s },
    { ...ellipsoid(E.clone().addScaledVector(f, 0.075 * s).addScaledVector(fz, 0.004 * s), [0.038 * s, 0.078 * s, 0.031 * s], { x: fx, y: f, z: fz }), k: 0.014 * s },
    { ...ellipsoid(W.clone().addScaledVector(f, -0.035 * s), [0.029 * s, 0.045 * s, 0.019 * s], { x: fx, y: f, z: perpTo(f, hz) }), k: 0.01 * s },
  ];
  return { deltoid, upper, fore };
}

export function legBlobs(sk: Skeleton, side: Side): LegBlobs {
  const s = sk.s, Lg = sk.leg[side];
  const H = Lg.hip, K = Lg.knee, A = Lg.ankle, ft = Lg.foot;
  const t = K.clone().sub(H).normalize();
  const sh = A.clone().sub(K).normalize();
  const fwd = perpTo(t, ft.z);
  const lat = new THREE.Vector3().crossVectors(t, fwd).multiplyScalar(-sgn(side));
  if (lat.dot(sk.pelvis.x.clone().multiplyScalar(sgn(side))) < 0) lat.negate();
  const axT = { x: lat, y: t, z: fwd };
  const fwdS = perpTo(sh, ft.z);
  const latS = new THREE.Vector3().crossVectors(sh, fwdS);
  if (latS.dot(lat) < 0) latS.negate();
  const axS = { x: latS, y: sh, z: fwdS };
  const rK = 0.053 * s;
  const thigh: Blob[] = [
    { ...roundCone(H.clone().addScaledVector(t, 0.01 * s), K, 0.083 * s, rK), k: 0.04 * s },
    { ...ellipsoid(H.clone().addScaledVector(t, 0.07 * s).addScaledVector(lat, 0.022 * s).addScaledVector(fwd, -0.006 * s), [0.058 * s, 0.1 * s, 0.066 * s], axT), k: 0.03 * s },
    { ...ellipsoid(H.clone().addScaledVector(t, 0.21 * s).addScaledVector(fwd, 0.02 * s).addScaledVector(lat, 0.006 * s), [0.058 * s, 0.17 * s, 0.06 * s], axT), k: 0.02 * s },
    { ...ellipsoid(H.clone().addScaledVector(t, 0.11 * s).addScaledVector(lat, -0.03 * s), [0.046 * s, 0.12 * s, 0.052 * s], axT), k: 0.02 * s },
    { ...ellipsoid(H.clone().addScaledVector(t, 0.22 * s).addScaledVector(fwd, -0.026 * s), [0.054 * s, 0.15 * s, 0.05 * s], axT), k: 0.02 * s },
  ];
  const shank: Blob[] = [
    { ...roundCone(K, A, rK, 0.033 * s), k: 0.006 * s },
    { ...sphere(K.clone().addScaledVector(fwd, 0.03 * s).addScaledVector(t, -0.012 * s), 0.02 * s), k: 0.012 * s },
    { ...ellipsoid(K.clone().addScaledVector(sh, 0.13 * s).addScaledVector(fwdS, -0.027 * s), [0.05 * s, 0.115 * s, 0.046 * s], axS), k: 0.02 * s },
    { ...sphere(A.clone().addScaledVector(latS, 0.024 * s), 0.016 * s), k: 0.008 * s },
    { ...sphere(A.clone().addScaledVector(latS, -0.02 * s).addScaledVector(sh, -0.006 * s), 0.016 * s), k: 0.008 * s },
  ];
  // bare foot (review layer only; boots replace it)
  const F = ft, lift = sk.params.lift;
  const fp = (x: number, y: number, z: number) => F.o.clone().addScaledVector(F.x, x * sgn(side) * -1).addScaledVector(F.y, y).addScaledVector(F.z, z);
  const foot: Blob[] = [
    { ...sphere(fp(0, lift + 0.032 * s, -0.03 * s), 0.033 * s), k: 0.02 * s },
    { ...ellipsoid(fp(0.004 * s, lift * 0.6 + 0.032 * s, 0.065 * s), [0.042 * s, 0.03 * s, 0.09 * s], F), k: 0.02 * s },
    { ...ellipsoid(fp(0.006 * s, lift * 0.25 + 0.019 * s, 0.155 * s), [0.047 * s, 0.018 * s, 0.05 * s], F), k: 0.015 * s },
  ];
  return { thigh, shank, foot };
}

// ------------------------------------------------------------------ assembly

export interface BodyModel {
  sk: Skeleton;
  space: TrunkSpace;
  /** Trunk (loft + masses) in rest trunk space. */
  trunkRest: SDF;
  /** Trunk in world space. */
  trunk: SDF;
  trunkLoft: LoftTable;
  neck: Blob[];
  arm: Record<Side, ArmBlobs>;
  leg: Record<Side, LegBlobs>;
  /** Whole body without the head (world), feet included. */
  full: SDF;
  /** Trunk + neck + deltoids (no arms/legs): weapon clearance. */
  torso: SDF;
}

/** Variable-radius smooth union of `a` with `b`, where k fades out with distance from `c`. */
export function sminNear(a: SDF, b: SDF, c: THREE.Vector3, k: number, r0: number, r1: number, kFar = 0.003, bound?: { cx: number; cy: number; cz: number; r: number } | SDF): SDF {
  const cx = c.x, cy = c.y, cz = c.z;
  const bf = typeof bound === 'function' ? bound : null;
  const bs = bound && typeof bound !== 'function' ? bound : null;
  const bx = bs?.cx ?? 0, by = bs?.cy ?? 0, bz = bs?.cz ?? 0, br = bs?.r ?? Infinity;
  return (x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const kk = kFar + (k - kFar) * (1 - sstep(r0, r1, dist));
    const da = a(x, y, z);
    if (bf) {
      if (bf(x, y, z) > da + kk) return da;
    } else if (br !== Infinity) {
      const ex = x - bx, ey = y - by, ez = z - bz;
      if (Math.sqrt(ex * ex + ey * ey + ez * ez) - br > da + kk) return da;
    }
    return smin(da, b(x, y, z), kk);
  };
}

/** Conservative bound of a limb chain: distance to the polyline minus a radius (cheap culling). */
export function chainBound(pts: THREE.Vector3[], r: number): SDF {
  const n = pts.length - 1;
  const ax = new Float64Array(n), ay = new Float64Array(n), az = new Float64Array(n);
  const ex = new Float64Array(n), ey = new Float64Array(n), ez = new Float64Array(n), il = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    ax[i] = pts[i].x; ay[i] = pts[i].y; az[i] = pts[i].z;
    ex[i] = pts[i + 1].x - pts[i].x; ey[i] = pts[i + 1].y - pts[i].y; ez[i] = pts[i + 1].z - pts[i].z;
    il[i] = 1 / Math.max(1e-12, ex[i] * ex[i] + ey[i] * ey[i] + ez[i] * ez[i]);
  }
  return (x, y, z) => {
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      const px = x - ax[i], py = y - ay[i], pz = z - az[i];
      let t = (px * ex[i] + py * ey[i] + pz * ez[i]) * il[i];
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = px - ex[i] * t, qy = py - ey[i] * t, qz = pz - ez[i] * t;
      const d2 = qx * qx + qy * qy + qz * qz;
      if (d2 < best) best = d2;
    }
    return Math.sqrt(best) - r;
  };
}

export function bodyModel(sk: Skeleton): BodyModel {
  const s = sk.s;
  const space = trunkSpace(sk);
  const trunkLoft = loftTable(loftProfile(TRUNK_KEYS, s), -0.1 * s, 0.63 * s, 0.003);
  const R = (x: number, y: number, z: number): [number, number, number] => [x * s, y * s, z * s];
  const rs: Blob[] = [loftBlob(trunkLoft)];
  for (const m of [1, -1]) {
    // trapezius: flattened cone from the neck base to the acromion
    rs.push({ ...flatCone(R(m * 0.03, 0.563, -0.036), R(m * 0.168, 0.522, -0.026), 0.034 * s, 0.023 * s, V(0, 0, 1), 1.9), k: 0.045 * s });
    // scapulae
    rs.push({ ...ellipsoid(R(m * 0.083, 0.43, -0.088), [0.058 * s, 0.075 * s, 0.03 * s]), k: 0.03 * s });
    // buttocks
    rs.push({ ...ellipsoid(R(m * 0.062, -0.022, -0.068), [0.076 * s, 0.085 * s, 0.062 * s]), k: 0.028 * s });
    // clavicles
    rs.push({ ...roundCone(R(m * 0.022, 0.534, 0.06), R(m * 0.16, 0.548, 0.004), 0.0105 * s, 0.0095 * s), k: 0.016 * s });
  }
  // shoulder girdle (trapezius / upper chest mass) out to the acromions
  rs.push({ ...ellipsoid(R(0, 0.49, -0.018), [0.165 * s, 0.055 * s, 0.095 * s]), k: 0.045 * s });
  const trunkRest = blend(rs, 0.03 * s);
  const trunk = inTrunk(space, trunkRest);
  const chestC = sk.chest.o;
  const trunkB: Blob = { f: trunk, cx: chestC.x, cy: chestC.y - 0.1 * s, cz: chestC.z, r: 0.5 * s };

  const neck = neckBlobs(sk);
  const arm = { l: armBlobs(sk, 'l'), r: armBlobs(sk, 'r') };
  const leg = { l: legBlobs(sk, 'l'), r: legBlobs(sk, 'r') };

  const core = blend([
    trunkB,
    ...neck,
    ...leg.l.thigh, ...leg.r.thigh, ...leg.l.shank, ...leg.r.shank, ...leg.l.foot, ...leg.r.foot,
  ], 0.03 * s);
  const armL = [...arm.l.deltoid, ...arm.l.upper, ...arm.l.fore], armR = [...arm.r.deltoid, ...arm.r.upper, ...arm.r.fore];
  const full = sminNear(
    sminNear(core, blend(armL, 0.02 * s), sk.arm.l.shoulder, 0.04 * s, 0.07 * s, 0.15 * s, 0.003, boundsOf(armL)),
    blend(armR, 0.02 * s), sk.arm.r.shoulder, 0.04 * s, 0.07 * s, 0.15 * s, 0.003, boundsOf(armR));
  const torso = blend([trunkB, ...neck, ...arm.l.deltoid.map((b) => ({ ...b, k: 0.035 * s })), ...arm.r.deltoid.map((b) => ({ ...b, k: 0.035 * s }))], 0.03 * s);
  return { sk, space, trunkRest, trunk, trunkLoft, neck, arm, leg, full, torso };
}

/** Back-compat helper: the whole body SDF of a skeleton. */
export function bodySDF(sk: Skeleton): SDF {
  return bodyModel(sk).full;
}
