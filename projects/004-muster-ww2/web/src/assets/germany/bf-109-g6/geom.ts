/** Geometry helpers for the Bf 109 G-6 (lofted skins, airfoils, frames). */
import * as THREE from 'three';

export type P2 = [number, number];

/** Monotone cubic (Fritsch-Carlson) interpolation through keys [x, y] (x ascending). */
export function curve(keys: P2[]): (x: number) => number {
  const n = keys.length;
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
  const d: number[] = [], m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i], b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]
    );
  };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Surface from a grid of points rows[i][j] (i: stations, j: around the section).
 * closedU joins the last column to the first (smooth seam). Optional flat caps at the
 * first/last row (fan to the row centroid). Normals are smooth; orientation is fixed so that
 * normals point away from each row's centroid.
 */
export function gridGeo(
  rows: THREE.Vector3[][],
  opts: {
    closedU?: boolean;
    capStart?: boolean;
    capEnd?: boolean;
    flatNormals?: boolean;
    /** return true to leave out the quad between rows i..i+1 and columns j..j+1 */
    skip?: (i: number, j: number) => boolean;
  } = {},
): THREE.BufferGeometry {
  const nr = rows.length, nc = rows[0].length;
  const closed = opts.closedU ?? true;
  const pos: number[] = [];
  for (const r of rows) for (const p of r) pos.push(p.x, p.y, p.z);
  const idx: number[] = [];
  const at = (i: number, j: number) => i * nc + (j % nc);
  const segU = closed ? nc : nc - 1;
  for (let i = 0; i < nr - 1; i++) {
    for (let j = 0; j < segU; j++) {
      if (opts.skip && opts.skip(i, j)) continue;
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      idx.push(a, b, d, b, c, d);
    }
  }
  // orientation test on the body (before caps)
  const g0 = new THREE.BufferGeometry();
  g0.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g0.setIndex(idx);
  g0.computeVertexNormals();
  let score = 0;
  const nrm = g0.attributes.normal;
  const tmp = new THREE.Vector3();
  for (let i = 0; i < nr; i++) {
    const c = new THREE.Vector3();
    for (const p of rows[i]) c.add(p);
    c.multiplyScalar(1 / nc);
    for (let j = 0; j < nc; j += Math.max(1, Math.floor(nc / 12))) {
      const k = at(i, j);
      tmp.set(pos[k * 3] - c.x, pos[k * 3 + 1] - c.y, pos[k * 3 + 2] - c.z);
      score += Math.sign(tmp.dot(new THREE.Vector3(nrm.getX(k), nrm.getY(k), nrm.getZ(k))));
    }
  }
  const flip = score < 0;
  if (flip) for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
  const addCap = (i: number, atStart: boolean) => {
    const c = new THREE.Vector3();
    for (const p of rows[i]) c.add(p);
    c.multiplyScalar(1 / nc);
    // separate vertices for a flat cap
    const base = pos.length / 3;
    for (const p of rows[i]) pos.push(p.x, p.y, p.z);
    pos.push(c.x, c.y, c.z);
    const ci = base + nc;
    // determine outward direction: away from the neighbouring row
    const nb = rows[atStart ? 1 : nr - 2];
    const cn = new THREE.Vector3();
    for (const p of nb) cn.add(p);
    cn.multiplyScalar(1 / nc);
    const out = c.clone().sub(cn);
    const tri: number[] = [];
    for (let j = 0; j < segU; j++) tri.push(base + j, base + ((j + 1) % nc), ci);
    // check winding of first triangle
    const p0 = rows[i][0], p1 = rows[i][1 % nc];
    const fn = p0.clone().sub(c).cross(p1.clone().sub(c));
    const ok = fn.dot(out) > 0;
    for (let t = 0; t < tri.length; t += 3) {
      if (ok) idx.push(tri[t], tri[t + 1], tri[t + 2]);
      else idx.push(tri[t], tri[t + 2], tri[t + 1]);
    }
  };
  if (opts.capStart) addCap(0, true);
  if (opts.capEnd) addCap(nr - 1, false);
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  if (opts.flatNormals) {
    g = g.toNonIndexed();
    g.computeVertexNormals();
  } else g.computeVertexNormals();
  return g;
}

/** NACA 4-digit style section (chord 1, LE at u=0). Returns upper & lower (u, v) arrays with n points each, LE->TE. */
export function airfoil(t: number, camber = 0.02, pc = 0.35, n = 40): { upper: P2[]; lower: P2[] } {
  const upper: P2[] = [], lower: P2[] = [];
  for (let i = 0; i < n; i++) {
    const beta = (i / (n - 1)) * Math.PI;
    const u = (1 - Math.cos(beta)) / 2;
    const yt = 5 * t * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);
    let yc = 0, dy = 0;
    if (camber > 0) {
      if (u < pc) {
        yc = (camber / (pc * pc)) * (2 * pc * u - u * u);
        dy = ((2 * camber) / (pc * pc)) * (pc - u);
      } else {
        yc = (camber / ((1 - pc) ** 2)) * (1 - 2 * pc + 2 * pc * u - u * u);
        dy = ((2 * camber) / ((1 - pc) ** 2)) * (pc - u);
      }
    }
    const th = Math.atan(dy);
    upper.push([u - yt * Math.sin(th), yc + yt * Math.cos(th)]);
    lower.push([u + yt * Math.sin(th), yc - yt * Math.cos(th)]);
  }
  return { upper, lower };
}

/** Closed ring TE(upper) -> LE -> TE(lower), with both TE points coincident (hard TE edge). */
export function airfoilRing(t: number, camber = 0.02, pc = 0.35, n = 40): P2[] {
  const { upper, lower } = airfoil(t, camber, pc, n);
  const ring: P2[] = [];
  for (let i = n - 1; i >= 0; i--) ring.push(upper[i]);
  for (let i = 1; i < n; i++) ring.push(lower[i]);
  // make the TE exactly closed
  const te: P2 = [(ring[0][0] + ring[ring.length - 1][0]) / 2, (ring[0][1] + ring[ring.length - 1][1]) / 2];
  ring[0] = te;
  ring[ring.length - 1] = [te[0], te[1]];
  return ring;
}

/** Rectangular bar between a and b (width w across `side`, height h along `up`), with small bevel. */
export function bar(a: THREE.Vector3, b: THREE.Vector3, w: number, h: number, up: THREE.Vector3, r = 0.002): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const g = new THREE.BoxGeometry(1, 1, 1);
  const rr = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4);
  // use rounded box via three addon for softness
  g.dispose();
  const geo = roundedBox(w, h, len, rr);
  const zAxis = b.clone().sub(a).normalize();
  const yAxis = up.clone().sub(zAxis.clone().multiplyScalar(up.dot(zAxis))).normalize();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  m.setPosition(a.clone().add(b).multiplyScalar(0.5));
  geo.applyMatrix4(m);
  return geo;
}

import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export function roundedBox(w: number, h: number, d: number, r: number, seg = 2): THREE.BufferGeometry {
  const rr = Math.max(0.0001, Math.min(r, w / 2 - 1e-5, h / 2 - 1e-5, d / 2 - 1e-5));
  return new RoundedBoxGeometry(w, h, d, seg, rr);
}

/** Flat pane (quad or polygon) with thickness, from a planar CCW polygon of 3D points. */
export function pane(pts: THREE.Vector3[], thick: number, outward?: THREE.Vector3): THREE.BufferGeometry {
  const c = new THREE.Vector3();
  for (const p of pts) c.add(p);
  c.multiplyScalar(1 / pts.length);
  let n = new THREE.Vector3();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i].clone().sub(c), b = pts[(i + 1) % pts.length].clone().sub(c);
    n.add(a.cross(b));
  }
  n.normalize();
  if (outward && n.dot(outward) < 0) n = n.negate();
  const half = n.clone().multiplyScalar(thick / 2);
  const top = pts.map((p) => p.clone().add(half));
  const bot = pts.map((p) => p.clone().sub(half));
  const pos: number[] = [];
  const push = (v: THREE.Vector3) => pos.push(v.x, v.y, v.z);
  const tri = (a: THREE.Vector3, b: THREE.Vector3, d: THREE.Vector3, want: THREE.Vector3) => {
    const fn = b.clone().sub(a).cross(d.clone().sub(a));
    if (fn.dot(want) >= 0) { push(a); push(b); push(d); } else { push(a); push(d); push(b); }
  };
  const ct = c.clone().add(half), cb = c.clone().sub(half);
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    tri(top[i], top[j], ct, n);
    tri(bot[i], bot[j], cb, n.clone().negate());
    const side = pts[i].clone().add(pts[j]).multiplyScalar(0.5).sub(c).normalize();
    tri(top[i], bot[i], bot[j], side);
    tri(top[i], bot[j], top[j], side);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Transform a geometry by position + basis. */
export function placeGeo(g: THREE.BufferGeometry, m: THREE.Matrix4): THREE.BufferGeometry {
  g.applyMatrix4(m);
  return g;
}

/** Matrix that maps local +Y to `dir` and places the origin at `p`. */
export function alignY(p: THREE.Vector3, dir: THREE.Vector3, spin = 0): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
  return new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
}

/** Matrix from explicit axes (x, y, z) and origin. */
export function basis(p: THREE.Vector3, x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeBasis(x.clone().normalize(), y.clone().normalize(), z.clone().normalize());
  m.setPosition(p);
  return m;
}

/** Merge several non-indexed/indexed geometries (position/normal only). */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const clean = geos.map((g) => {
    const c = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(c.attributes)) if (k !== 'position' && k !== 'normal') c.deleteAttribute(k);
    if (!c.attributes.normal) c.computeVertexNormals();
    return c;
  });
  return mergeGeometries(clean)!;
}

/** Rounded bar from a to b, extended by `ext` at both ends (frames, struts). */
export function frameBar(
  a: THREE.Vector3,
  b: THREE.Vector3,
  w: number,
  h: number,
  up: THREE.Vector3,
  ext = 0,
  r = 0.003,
): THREE.BufferGeometry {
  const d = b.clone().sub(a).normalize();
  return bar(a.clone().addScaledVector(d, -ext), b.clone().addScaledVector(d, ext), w, h, up, r);
}

/** Thin double-sided surface from a (roughly planar, convex) polygon - used for glazing. */
export function polyGeo(pts: THREE.Vector3[]): THREE.BufferGeometry {
  const pos: number[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    for (const p of [pts[0], pts[i], pts[i + 1]]) pos.push(p.x, p.y, p.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Strip surface between two polylines of equal length (e.g. a glazing panel that is gently bent). */
export function stripGeo(a: THREE.Vector3[], b: THREE.Vector3[]): THREE.BufferGeometry {
  return gridGeo([a, b], { closedU: false });
}

/**
 * End cap for a thin closed ring made of an outer arc (0..n-1) followed by the inner arc
 * returning (n..2n-1), so point i pairs with point 2n-1-i. `outward` = cap normal direction.
 */
export function stripCap(ring: THREE.Vector3[], outward: THREE.Vector3): THREE.BufferGeometry {
  const n = ring.length / 2;
  const pos: number[] = [];
  const tri = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3) => {
    const fn = q.clone().sub(p).cross(r.clone().sub(p));
    const arr = fn.dot(outward) >= 0 ? [p, q, r] : [p, r, q];
    for (const v of arr) pos.push(v.x, v.y, v.z);
  };
  for (let i = 0; i < n - 1; i++) {
    const a = ring[i], b = ring[i + 1], c = ring[2 * n - 2 - i], d = ring[2 * n - 1 - i];
    tri(a, b, c);
    tri(a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Lathe about +Y from [radius, y] profile points. */
export function latheY(profile: P2[], seg = 48): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y)),
    seg,
  );
}

/** Ellipse ring around centre c in the plane spanned by u, v (semi-axes a along u, b along v). */
export function ellipseRing(c: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, a: number, b: number, n: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    out.push(c.clone().addScaledVector(u, a * Math.cos(t)).addScaledVector(v, b * Math.sin(t)));
  }
  return out;
}

/** Matrix mapping local +Z to `dir` (and local +Y towards `up`) with origin p. */
export function alignZ(p: THREE.Vector3, dir: THREE.Vector3, up: THREE.Vector3): THREE.Matrix4 {
  const z = dir.clone().normalize();
  const x = new THREE.Vector3().crossVectors(up, z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  return basis(p, x, y, z);
}

/** Symmetric NACA 4-digit half thickness (chord 1). */
export function nacaT(u: number, t: number): number {
  const x = Math.max(0, Math.min(1, u));
  return 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
}

/** NACA 4-digit mean camber line (chord 1). */
export function nacaC(u: number, m: number, p: number): number {
  if (m <= 0) return 0;
  return u < p ? (m / (p * p)) * (2 * p * u - u * u) : (m / ((1 - p) ** 2)) * (1 - 2 * p + 2 * p * u - u * u);
}

/** Cosine-spaced parameters 0..1 (n values). */
export function cosSpace(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((1 - Math.cos((i / (n - 1)) * Math.PI)) / 2);
  return out;
}
