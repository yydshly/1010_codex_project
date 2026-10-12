/**
 * Fast SDF primitives for the human system.
 *
 * The core `S.*` primitives are general purpose; these are tuned for dense body/cloth grids:
 *  - Math.sqrt instead of Math.hypot (much faster in V8),
 *  - every primitive can be wrapped as a `Blob` with a bounding sphere, so a smooth union over
 *    dozens of body parts only evaluates the parts that can influence the query point
 *    (exact culling: a part further than `current + k` cannot change a smooth-min result),
 *  - oriented primitives take a local frame (3 unit axes), so parts follow the posed skeleton.
 *
 * Distances are metres. Everything returns plain `(x, y, z) => number` functions compatible with
 * `sdfMesh()` from core/geo/sdf.ts.
 */
import * as THREE from 'three';

export type SDF = (x: number, y: number, z: number) => number;
export type P3 = [number, number, number];
type VecLike = THREE.Vector3 | P3;

const vx = (v: VecLike) => (Array.isArray(v) ? v[0] : v.x);
const vy = (v: VecLike) => (Array.isArray(v) ? v[1] : v.y);
const vz = (v: VecLike) => (Array.isArray(v) ? v[2] : v.z);

/** Polynomial smooth min (k = blend radius, m). */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return a < b ? a : b;
  const d = a - b;
  const h = k - (d < 0 ? -d : d);
  if (h <= 0) return a < b ? a : b;
  const hh = h / k;
  return (a < b ? a : b) - hh * hh * k * 0.25;
}
/** Smooth max. */
export function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}
export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** A primitive with a bounding sphere that contains its zero level set. */
export interface Blob {
  f: SDF;
  cx: number;
  cy: number;
  cz: number;
  r: number;
  /** Optional per-blob blend radius (defaults to the blend's k). */
  k?: number;
}

/** Orthonormal local frame: origin + world directions of the local x, y, z axes. */
export interface Frame {
  o: THREE.Vector3;
  x: THREE.Vector3;
  y: THREE.Vector3;
  z: THREE.Vector3;
}

export function frameFromMatrix(m: THREE.Matrix4): Frame {
  const o = new THREE.Vector3(), x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3();
  m.extractBasis(x, y, z);
  o.setFromMatrixPosition(m);
  return { o, x: x.normalize(), y: y.normalize(), z: z.normalize() };
}
export function frameToMatrix(f: Frame): THREE.Matrix4 {
  return new THREE.Matrix4().makeBasis(f.x, f.y, f.z).setPosition(f.o);
}
/** World point from frame-local coordinates. */
export function fp(f: Frame, x: number, y: number, z: number): THREE.Vector3 {
  return f.o.clone().addScaledVector(f.x, x).addScaledVector(f.y, y).addScaledVector(f.z, z);
}
/** World direction from frame-local direction. */
export function fd(f: Frame, x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3().addScaledVector(f.x, x).addScaledVector(f.y, y).addScaledVector(f.z, z).normalize();
}

// ------------------------------------------------------------------ primitives

export function sphere(c: VecLike, r: number): Blob {
  const cx = vx(c), cy = vy(c), cz = vz(c);
  return {
    f: (x, y, z) => {
      const dx = x - cx, dy = y - cy, dz = z - cz;
      return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
    },
    cx, cy, cz, r,
  };
}

/**
 * Ellipsoid, radii (a, b, c) along the frame axes (or world axes if no frame given).
 * Uses the standard gradient-normalised approximation (accurate near the surface).
 */
export function ellipsoid(c: VecLike, rad: P3, axes?: { x: THREE.Vector3; y: THREE.Vector3; z: THREE.Vector3 }): Blob {
  const cx = vx(c), cy = vy(c), cz = vz(c);
  const [a, b, d] = rad;
  const ia = 1 / a, ib = 1 / b, id = 1 / d;
  const ia2 = ia * ia, ib2 = ib * ib, id2 = id * id;
  const X = axes?.x ?? new THREE.Vector3(1, 0, 0), Y = axes?.y ?? new THREE.Vector3(0, 1, 0), Z = axes?.z ?? new THREE.Vector3(0, 0, 1);
  const x0 = X.x, x1 = X.y, x2 = X.z, y0 = Y.x, y1 = Y.y, y2 = Y.z, z0 = Z.x, z1 = Z.y, z2 = Z.z;
  const minr = Math.min(a, b, d);
  return {
    f: (x, y, z) => {
      const px = x - cx, py = y - cy, pz = z - cz;
      const lx = px * x0 + py * x1 + pz * x2;
      const ly = px * y0 + py * y1 + pz * y2;
      const lz = px * z0 + py * z1 + pz * z2;
      const k0 = Math.sqrt(lx * lx * ia2 + ly * ly * ib2 + lz * lz * id2);
      const k1 = Math.sqrt(lx * lx * ia2 * ia2 + ly * ly * ib2 * ib2 + lz * lz * id2 * id2);
      if (k1 < 1e-12) return -minr;
      // clamp the interior to the true bound (the raw approximation can reach -max radius near the
      // centre of a thin ellipsoid, which makes meshers skip blocks that contain surface)
      const v = (k0 * (k0 - 1)) / k1;
      return v < -minr ? -minr : v;
    },
    cx, cy, cz, r: Math.max(a, b, d),
  };
}

/** Ellipsoid expressed in a frame: centre given in frame-local coordinates. */
export function ellipsoidIn(fr: Frame, c: P3, rad: P3): Blob {
  return ellipsoid(fp(fr, c[0], c[1], c[2]), rad, fr);
}

/** Exact round cone (capsule with radius r1 at a, r2 at b). */
export function roundCone(a: VecLike, b: VecLike, r1: number, r2: number): Blob {
  const ax = vx(a), ay = vy(a), az = vz(a);
  const bax = vx(b) - ax, bay = vy(b) - ay, baz = vz(b) - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  if (l2 < 1e-12) return sphere(a, Math.max(r1, r2));
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const srr = Math.sign(rr) * rr * rr;
  const len = Math.sqrt(l2);
  return {
    f: (x, y, z) => {
      const pax = x - ax, pay = y - ay, paz = z - az;
      const yv = pax * bax + pay * bay + paz * baz;
      const z_ = yv - l2;
      const qx = pax * l2 - bax * yv, qy = pay * l2 - bay * yv, qz = paz * l2 - baz * yv;
      const x2 = qx * qx + qy * qy + qz * qz;
      const y2 = yv * yv * l2;
      const z2 = z_ * z_ * l2;
      const k = srr * x2;
      if ((z_ > 0 ? a2 : -a2) * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
      if ((yv > 0 ? a2 : -a2) * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
      return (Math.sqrt(x2 * a2 * il2) + yv * rr) * il2 - r1;
    },
    cx: ax + bax / 2, cy: ay + bay / 2, cz: az + baz / 2, r: len / 2 + Math.max(r1, r2),
  };
}

export function capsule(a: VecLike, b: VecLike, r: number): Blob {
  return roundCone(a, b, r, r);
}

/**
 * Round cone with an elliptical cross-section: radii are scaled by `sx` along the `side`
 * direction (projected perpendicular to the segment). Approximate (fine near the surface).
 */
export function flatCone(a: VecLike, b: VecLike, r1: number, r2: number, side: THREE.Vector3, sx: number): Blob {
  const A = new THREE.Vector3(vx(a), vy(a), vz(a)), B = new THREE.Vector3(vx(b), vy(b), vz(b));
  const u = B.clone().sub(A);
  const len = u.length();
  u.normalize();
  const s = side.clone().addScaledVector(u, -side.dot(u)).normalize();
  const w = new THREE.Vector3().crossVectors(u, s);
  const inner = roundCone([0, 0, 0], [0, len, 0], r1, r2).f;
  const ux = u.x, uy = u.y, uz = u.z, sxx = s.x, sxy = s.y, sxz = s.z, wx = w.x, wy = w.y, wz = w.z;
  const ax = A.x, ay = A.y, az = A.z;
  const isx = 1 / sx;
  const scale = Math.min(1, sx);
  return {
    f: (x, y, z) => {
      const px = x - ax, py = y - ay, pz = z - az;
      const ly = px * ux + py * uy + pz * uz;
      const lx = (px * sxx + py * sxy + pz * sxz) * isx;
      const lz = px * wx + py * wy + pz * wz;
      return inner(lx, ly, lz) * scale;
    },
    cx: (A.x + B.x) / 2, cy: (A.y + B.y) / 2, cz: (A.z + B.z) / 2, r: len / 2 + Math.max(r1, r2) * Math.max(1, sx),
  };
}

/** Rounded box with half extents h and corner radius r, oriented by a frame (centre in world). */
export function box(c: VecLike, h: P3, r: number, axes?: { x: THREE.Vector3; y: THREE.Vector3; z: THREE.Vector3 }): Blob {
  const cx = vx(c), cy = vy(c), cz = vz(c);
  const hx = h[0] - r, hy = h[1] - r, hz = h[2] - r;
  const X = axes?.x ?? new THREE.Vector3(1, 0, 0), Y = axes?.y ?? new THREE.Vector3(0, 1, 0), Z = axes?.z ?? new THREE.Vector3(0, 0, 1);
  const x0 = X.x, x1 = X.y, x2 = X.z, y0 = Y.x, y1 = Y.y, y2 = Y.z, z0 = Z.x, z1 = Z.y, z2 = Z.z;
  return {
    f: (x, y, z) => {
      const px = x - cx, py = y - cy, pz = z - cz;
      const qx = Math.abs(px * x0 + py * x1 + pz * x2) - hx;
      const qy = Math.abs(px * y0 + py * y1 + pz * y2) - hy;
      const qz = Math.abs(px * z0 + py * z1 + pz * z2) - hz;
      const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0, oz = qz > 0 ? qz : 0;
      const inside = Math.max(qx, qy, qz);
      return Math.sqrt(ox * ox + oy * oy + oz * oz) + (inside < 0 ? inside : 0) - r;
    },
    cx, cy, cz, r: Math.sqrt(h[0] * h[0] + h[1] * h[1] + h[2] * h[2]),
  };
}

/** Infinite cylinder around the line (p, dir) with radius r (used to carve grips). */
export function lineCylinder(p: VecLike, dir: THREE.Vector3, r: number): SDF {
  const px0 = vx(p), py0 = vy(p), pz0 = vz(p);
  const d = dir.clone().normalize();
  const dx = d.x, dy = d.y, dz = d.z;
  return (x, y, z) => {
    const qx = x - px0, qy = y - py0, qz = z - pz0;
    const t = qx * dx + qy * dy + qz * dz;
    const rx = qx - dx * t, ry = qy - dy * t, rz = qz - dz * t;
    return Math.sqrt(rx * rx + ry * ry + rz * rz) - r;
  };
}

/** Signed distance to a plane: positive on the side the normal points to. */
export function plane(o: VecLike, n: VecLike): SDF {
  let nx = vx(n), ny = vy(n), nz = vz(n);
  const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
  nx /= l; ny /= l; nz /= l;
  const ox = vx(o), oy = vy(o), oz = vz(o);
  return (x, y, z) => (x - ox) * nx + (y - oy) * ny + (z - oz) * nz;
}

// ------------------------------------------------------------------ combinators

/**
 * Smooth union of many blobs with exact bounding-sphere culling.
 * Blobs are evaluated in order; put the big central masses first for the best culling.
 */
export function blend(items: Blob[], k: number): SDF {
  const n = items.length;
  const fs = items.map((b) => b.f);
  const cx = Float64Array.from(items.map((b) => b.cx));
  const cy = Float64Array.from(items.map((b) => b.cy));
  const cz = Float64Array.from(items.map((b) => b.cz));
  const rr = Float64Array.from(items.map((b) => b.r));
  const kk = Float64Array.from(items.map((b) => b.k ?? k));
  return (x, y, z) => {
    let d = fs[0](x, y, z);
    for (let i = 1; i < n; i++) {
      const dx = x - cx[i], dy = y - cy[i], dz = z - cz[i];
      const ki = kk[i];
      const bd = Math.sqrt(dx * dx + dy * dy + dz * dz) - rr[i];
      if (bd > d + ki) continue;
      d = smin(d, fs[i](x, y, z), ki);
    }
    return d;
  };
}

/** Bounding sphere that encloses all blobs. */
export function boundsOf(items: Blob[]): { cx: number; cy: number; cz: number; r: number } {
  const box3 = new THREE.Box3();
  for (const b of items) {
    box3.expandByPoint(new THREE.Vector3(b.cx - b.r, b.cy - b.r, b.cz - b.r));
    box3.expandByPoint(new THREE.Vector3(b.cx + b.r, b.cy + b.r, b.cz + b.r));
  }
  const c = box3.getCenter(new THREE.Vector3());
  let r = 0;
  for (const b of items) r = Math.max(r, Math.sqrt((b.cx - c.x) ** 2 + (b.cy - c.y) ** 2 + (b.cz - c.z) ** 2) + b.r);
  return { cx: c.x, cy: c.y, cz: c.z, r };
}

/** Wrap an SDF built from blobs into a single blob (for nested culling). */
export function asBlob(f: SDF, items: Blob[], k = 0): Blob {
  const b = boundsOf(items);
  return { f, cx: b.cx, cy: b.cy, cz: b.cz, r: b.r + k, k: undefined };
}

/** Smooth subtraction of `b` from `a` (k = fillet radius). Only evaluates b near it. */
export function carve(a: SDF, cuts: Blob[], k: number): SDF {
  const n = cuts.length;
  return (x, y, z) => {
    let d = a(x, y, z);
    for (let i = 0; i < n; i++) {
      const c = cuts[i];
      const ki = c.k ?? k;
      const dx = x - c.cx, dy = y - c.cy, dz = z - c.cz;
      const bd = Math.sqrt(dx * dx + dy * dy + dz * dz) - c.r;
      if (bd > ki - d) continue; // -b < d - k  => no influence
      d = smax(d, -c.f(x, y, z), ki);
    }
    return d;
  };
}

/** Displace a field near its surface only (|d| < band), keeping far values untouched. */
export function displaceNear(a: SDF, disp: SDF, band = 0.02): SDF {
  return (x, y, z) => {
    const d = a(x, y, z);
    if (d > band || d < -band) return d;
    return d + disp(x, y, z);
  };
}

/** Evaluate `f` only inside an axis-aligned box (plus margin); outside return a safe distance. */
export function inBox(f: SDF, min: P3, max: P3): SDF {
  const [x0, y0, z0] = min, [x1, y1, z1] = max;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  const hx = (x1 - x0) / 2, hy = (y1 - y0) / 2, hz = (z1 - z0) / 2;
  return (x, y, z) => {
    const qx = Math.abs(x - cx) - hx, qy = Math.abs(y - cy) - hy, qz = Math.abs(z - cz) - hz;
    if (qx > 0 || qy > 0 || qz > 0) {
      const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0, oz = qz > 0 ? qz : 0;
      const out = Math.sqrt(ox * ox + oy * oy + oz * oz);
      if (out > 0.01) return out;
    }
    return f(x, y, z);
  };
}

/** Numerical gradient (unit) of an SDF. */
export function gradient(f: SDF, x: number, y: number, z: number, h = 0.001, out = new THREE.Vector3()): THREE.Vector3 {
  out.set(
    f(x + h, y, z) - f(x - h, y, z),
    f(x, y + h, z) - f(x, y - h, z),
    f(x, y, z + h) - f(x, y, z - h),
  );
  const l = out.length();
  return l > 0 ? out.multiplyScalar(1 / l) : out.set(0, 1, 0);
}

/** Project a point onto the zero surface by Newton steps. Returns position + outward normal. */
export function projectToSurface(f: SDF, p: THREE.Vector3, iters = 12): { position: THREE.Vector3; normal: THREE.Vector3; distance: number } {
  const q = p.clone();
  const n = new THREE.Vector3();
  let d = 0;
  for (let i = 0; i < iters; i++) {
    d = f(q.x, q.y, q.z);
    gradient(f, q.x, q.y, q.z, 0.0008, n);
    if (Math.abs(d) < 1e-5) break;
    q.addScaledVector(n, -d);
  }
  gradient(f, q.x, q.y, q.z, 0.0015, n);
  return { position: q, normal: n, distance: f(q.x, q.y, q.z) };
}

/**
 * First surface hit along a ray from `origin` in direction `dir` (or null within maxDist).
 * Conservative sphere tracing until the sign changes, then bisection (robust for the
 * approximate, near-Lipschitz fields used here). Starting inside returns the exit point.
 */
export function raycast(f: SDF, origin: THREE.Vector3, dir: THREE.Vector3, maxDist = 1.5): THREE.Vector3 | null {
  const d = dir.clone().normalize();
  const dx = d.x, dy = d.y, dz = d.z, ox = origin.x, oy = origin.y, oz = origin.z;
  let t0 = 0;
  let v0 = f(ox, oy, oz);
  const inside = v0 < 0;
  let t = 0;
  for (let i = 0; i < 400 && t < maxDist; i++) {
    const step = Math.max(Math.abs(v0) * 0.7, 2e-4);
    const t1 = Math.min(t + step, maxDist);
    const v1 = f(ox + dx * t1, oy + dy * t1, oz + dz * t1);
    if ((v1 < 0) !== inside) {
      // bisect [t, t1]
      let a = t, b = t1;
      for (let k = 0; k < 12; k++) {
        const m = (a + b) / 2;
        const vm = f(ox + dx * m, oy + dy * m, oz + dz * m);
        if ((vm < 0) !== inside) b = m; else a = m;
      }
      const tm = (a + b) / 2;
      return new THREE.Vector3(ox + dx * tm, oy + dy * tm, oz + dz * tm);
    }
    t0 = t;
    t = t1;
    v0 = v1;
  }
  void t0;
  return null;
}

// ------------------------------------------------------------------ lofts

/**
 * A loft is a tube along local +Y whose cross-section at height y is an ellipse with half-width
 * `a` (x), centred at z = `zm`, with front half-depth `bf` (z > zm) and back half-depth `bb`.
 * The profile is tabulated (fine rows) from smooth keyframes, so the surface is continuous and
 * free of the "stacked blobs" look. Distances are slope-corrected (good near the surface).
 */
export interface LoftTable {
  y0: number;
  dy: number;
  n: number;
  /** Interleaved rows: a, zm, bf, bb. */
  rows: Float64Array;
}

/** Keyframe: [y, front z, back z, half-width, z of the widest point (optional, default mid)]. */
export type LoftKey = [number, number, number, number, number?];

/** Monotone cubic (PCHIP) interpolation of samples (xs strictly increasing). */
export function pchip(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  const h: number[] = [], dl: number[] = [];
  for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); dl.push((ys[i + 1] - ys[i]) / h[i]); }
  const m: number[] = new Array(n).fill(0);
  m[0] = dl[0]; m[n - 1] = dl[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (dl[i - 1] * dl[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i]);
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]) * 0;
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
  };
}

/** Build a loft table from a profile function y -> [a, zm, bf, bb]. */
export function loftTable(profile: (y: number) => [number, number, number, number], y0: number, y1: number, dy = 0.003): LoftTable {
  const n = Math.max(2, Math.ceil((y1 - y0) / dy) + 1);
  const rows = new Float64Array(n * 4);
  for (let i = 0; i < n; i++) {
    const p = profile(y0 + i * dy);
    rows[i * 4] = Math.max(1e-4, p[0]);
    rows[i * 4 + 1] = p[1];
    rows[i * 4 + 2] = Math.max(1e-4, p[2]);
    rows[i * 4 + 3] = Math.max(1e-4, p[3]);
  }
  return { y0, dy, n, rows };
}

/** Profile function from keyframes (PCHIP per parameter). `scale` multiplies all values. */
export function loftProfile(keys: LoftKey[], scale = 1): (y: number) => [number, number, number, number] {
  const ys = keys.map((k) => k[0] * scale);
  const a = pchip(ys, keys.map((k) => k[3] * scale));
  const zm = pchip(ys, keys.map((k) => (k[4] ?? (k[1] + k[2]) / 2) * scale));
  const fr = pchip(ys, keys.map((k) => k[1] * scale));
  const bk = pchip(ys, keys.map((k) => k[2] * scale));
  return (y) => {
    const m = zm(y);
    return [a(y), m, fr(y) - m, m - bk(y)];
  };
}

/** 2D asymmetric-ellipse distance (approximate, exact on the axes). */
function secDist(rows: Float64Array, r: number, x: number, z: number): number {
  const a = rows[r], dz = z - rows[r + 1];
  const b = dz > 0 ? rows[r + 2] : rows[r + 3];
  const ia = 1 / a, ib = 1 / b;
  const px = x * ia, pz = dz * ib;
  const k0 = Math.sqrt(px * px + pz * pz);
  const qx = px * ia, qz = pz * ib;
  const k1 = Math.sqrt(qx * qx + qz * qz);
  if (k1 < 1e-9) return -(a < b ? a : b);
  return (k0 * (k0 - 1)) / k1;
}

/** SDF of a loft in its local frame (x lateral, y along the axis, z forward). Ends are flat caps. */
export function loftSDF(t: LoftTable): SDF {
  const { y0, dy, n, rows } = t;
  const y1 = y0 + (n - 1) * dy;
  const idy = 1 / dy;
  return (x, y, z) => {
    let yy = y, cap = 0;
    if (yy < y0) { cap = y0 - yy; yy = y0; }
    else if (yy > y1) { cap = yy - y1; yy = y1; }
    let fi = (yy - y0) * idy;
    let i = fi | 0;
    if (i >= n - 1) i = n - 2;
    const f = fi - i;
    const d0 = secDist(rows, i * 4, x, z), d1 = secDist(rows, i * 4 + 4, x, z);
    const D = (d1 - d0) * idy;
    const d = (d0 + (d1 - d0) * f) / Math.sqrt(1 + D * D);
    if (cap > 0) return d > cap ? d : cap;
    return d;
  };
}

/** Section parameters of a loft at height y (linear between rows). */
export function loftAt(t: LoftTable, y: number): [number, number, number, number] {
  const fi = clamp((y - t.y0) / t.dy, 0, t.n - 1.0001);
  const i = fi | 0, f = fi - i, r = t.rows;
  const o: [number, number, number, number] = [0, 0, 0, 0];
  for (let k = 0; k < 4; k++) o[k] = r[i * 4 + k] + (r[i * 4 + 4 + k] - r[i * 4 + k]) * f;
  return o;
}
