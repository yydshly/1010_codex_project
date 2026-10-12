/** Geometry helpers for the P-47D (copied from the P-51D kit) (lofted skins, airfoils, bars, panes). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type P2 = [number, number];
const V3 = THREE.Vector3;

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
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Cosine-spaced parameters 0..1 (n values). */
export function cosSpace(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((1 - Math.cos((i / (n - 1)) * Math.PI)) / 2);
  return out;
}
export function linspace(a: number, b: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(a + ((b - a) * i) / (n - 1));
  return out;
}

/** Reverse the winding of every triangle (indexed or not) and recompute normals. */
export function flipAll(g: THREE.BufferGeometry): THREE.BufferGeometry {
  if (g.index) {
    const idx = g.index.array as Uint32Array | Uint16Array;
    for (let k = 0; k < idx.length; k += 3) {
      const t = idx[k + 1];
      idx[k + 1] = idx[k + 2];
      idx[k + 2] = t;
    }
  } else {
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k += 3) {
      const x = p.getX(k + 1), y = p.getY(k + 1), z = p.getZ(k + 1);
      p.setXYZ(k + 1, p.getX(k + 2), p.getY(k + 2), p.getZ(k + 2));
      p.setXYZ(k + 2, x, y, z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Surface from a grid of points rows[i][j] (i: stations, j: around the section).
 * closedU joins the last column to the first. Optional flat caps at the first/last row (fan to
 * the row centroid - rows must be star-shaped around their centroid). Orientation is fixed so
 * that normals point away from each row's centroid (use `inward` for ducts / liners).
 */
export function gridGeo(
  rows: THREE.Vector3[][],
  opts: {
    closedU?: boolean;
    capStart?: boolean;
    capEnd?: boolean;
    inward?: boolean;
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
  // orientation test: face normals vs. direction from the row centroid
  let score = 0;
  const cen: THREE.Vector3[] = rows.map((r) => {
    const c = new V3();
    for (const p of r) c.add(p);
    return c.multiplyScalar(1 / r.length);
  });
  const pa = new V3(), pb = new V3(), pc = new V3(), fn = new V3(), mid = new V3();
  for (let t = 0; t < idx.length; t += 3 * Math.max(1, Math.floor(idx.length / 3 / 400))) {
    pa.fromArray(pos, idx[t] * 3);
    pb.fromArray(pos, idx[t + 1] * 3);
    pc.fromArray(pos, idx[t + 2] * 3);
    fn.subVectors(pb, pa).cross(pc.clone().sub(pa));
    mid.copy(pa).add(pb).add(pc).multiplyScalar(1 / 3);
    const ri = Math.floor(idx[t] / nc);
    score += Math.sign(fn.dot(mid.sub(cen[ri])));
  }
  const flip = opts.inward ? score > 0 : score < 0;
  if (flip) for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
  const addCap = (i: number, atStart: boolean) => {
    const c = cen[i];
    const base = pos.length / 3;
    for (const p of rows[i]) pos.push(p.x, p.y, p.z);
    pos.push(c.x, c.y, c.z);
    const ci = base + nc;
    const out = c.clone().sub(cen[atStart ? 1 : nr - 2]);
    if (opts.inward) out.negate();
    for (let j = 0; j < segU; j++) {
      const a = base + j, b = base + ((j + 1) % nc);
      const p0 = rows[i][j], p1 = rows[i][(j + 1) % nc];
      const f = p0.clone().sub(c).cross(p1.clone().sub(c));
      if (f.dot(out) >= 0) idx.push(a, b, ci);
      else idx.push(a, ci, b);
    }
  };
  if (opts.capStart) addCap(0, true);
  if (opts.capEnd) addCap(nr - 1, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function roundedBox(w: number, h: number, d: number, r: number, seg = 2): THREE.BufferGeometry {
  const rr = Math.max(0.0001, Math.min(r, w / 2 - 1e-5, h / 2 - 1e-5, d / 2 - 1e-5));
  return new RoundedBoxGeometry(w, h, d, seg, rr);
}

/** Matrix from explicit axes (x, y, z) and origin. */
export function basis(p: THREE.Vector3, x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeBasis(x.clone().normalize(), y.clone().normalize(), z.clone().normalize());
  m.setPosition(p);
  return m;
}

/** Matrix mapping local +Z to `dir` (and local +Y towards `up`) with origin p. */
export function alignZ(p: THREE.Vector3, dir: THREE.Vector3, up: THREE.Vector3): THREE.Matrix4 {
  const z = dir.clone().normalize();
  let x = new V3().crossVectors(up, z);
  if (x.lengthSq() < 1e-10) x = new V3().crossVectors(new V3(1, 0, 0), z);
  x.normalize();
  const y = new V3().crossVectors(z, x).normalize();
  return basis(p, x, y, z);
}

/** Matrix mapping local +Y to `dir` with origin p. */
export function alignY(p: THREE.Vector3, dir: THREE.Vector3, spin = 0): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir.clone().normalize());
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), spin));
  return new THREE.Matrix4().compose(p, q, new V3(1, 1, 1));
}

/** Rounded rectangular bar between a and b (width w, height h along `up`), extended by ext. */
export function bar(a: THREE.Vector3, b: THREE.Vector3, w: number, h: number, up: THREE.Vector3, ext = 0, r = 0.003): THREE.BufferGeometry {
  const d = b.clone().sub(a).normalize();
  const a2 = a.clone().addScaledVector(d, -ext), b2 = b.clone().addScaledVector(d, ext);
  const len = a2.distanceTo(b2);
  const geo = roundedBox(w, h, len, r);
  const zAxis = d;
  let yAxis = up.clone().sub(zAxis.clone().multiplyScalar(up.dot(zAxis)));
  if (yAxis.lengthSq() < 1e-10) yAxis = new V3(0, 1, 0).sub(zAxis.clone().multiplyScalar(zAxis.y));
  yAxis.normalize();
  const xAxis = new V3().crossVectors(yAxis, zAxis).normalize();
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  m.setPosition(a2.clone().add(b2).multiplyScalar(0.5));
  geo.applyMatrix4(m);
  return geo;
}

/** Cylinder from p0 (radius r0) to p1 (radius r1). */
export function cylAB(p0: THREE.Vector3, p1: THREE.Vector3, r0: number, r1 = r0, seg = 20, open = false): THREE.BufferGeometry {
  const len = p0.distanceTo(p1);
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, open);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), p1.clone().sub(p0).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(p0, q, new V3(1, 1, 1)));
  return g;
}

/** Tube along a polyline (Catmull-Rom). */
export function tubeAlong(pts: THREE.Vector3[], r: number, seg = 24, radial = 8): THREE.BufferGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, radial, false);
}

/** Thin surface from a (roughly planar, convex) polygon - glazing, plates. */
export function polyGeo(pts: THREE.Vector3[]): THREE.BufferGeometry {
  const pos: number[] = [];
  for (let i = 1; i < pts.length - 1; i++) for (const p of [pts[0], pts[i], pts[i + 1]]) pos.push(p.x, p.y, p.z);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
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
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y)), seg);
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

/** Super-elliptic ring (exponent ex) around c in the plane (u, v). */
export function superRing(c: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, a: number, b: number, ex: number, n: number, phase = 0): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2 + phase;
    const cs = Math.cos(t), sn = Math.sin(t);
    const x = a * Math.sign(cs) * Math.pow(Math.abs(cs), 2 / ex);
    const y = b * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / ex);
    out.push(c.clone().addScaledVector(u, x).addScaledVector(v, y));
  }
  return out;
}

/** Give a geometry a constant vertex colour (for vertex-coloured materials). */
export function tint(g: THREE.BufferGeometry, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(arr, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
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
