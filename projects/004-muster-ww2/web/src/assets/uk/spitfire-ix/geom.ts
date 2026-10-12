/** Geometry helpers for the Spitfire LF Mk IXc (lofted skins, airfoils, bars, panes). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type P2 = [number, number];

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

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

/** Reverse triangle winding in place and recompute normals. */
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
    for (let i = 0; i < p.count; i += 3) {
      const x = p.getX(i + 1), y = p.getY(i + 1), z = p.getZ(i + 1);
      p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
      p.setXYZ(i + 2, x, y, z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Surface from a grid of points rows[i][j] (i: stations, j: around the section).
 * Orientation is fixed so normals point away from each row's centroid. Optional fan caps
 * (to the row centroid) - only used on convex / star-shaped end sections.
 */
export function gridGeo(
  rows: THREE.Vector3[][],
  opts: { closedU?: boolean; capStart?: boolean; capEnd?: boolean; skip?: (i: number, j: number) => boolean; inward?: boolean } = {},
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
  const flip = opts.inward ? score > 0 : score < 0;
  if (flip) for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
  const addCap = (i: number, atStart: boolean) => {
    const c = new THREE.Vector3();
    for (const p of rows[i]) c.add(p);
    c.multiplyScalar(1 / nc);
    const base = pos.length / 3;
    for (const p of rows[i]) pos.push(p.x, p.y, p.z);
    pos.push(c.x, c.y, c.z);
    const ci = base + nc;
    const nb = rows[atStart ? 1 : nr - 2];
    const cn = new THREE.Vector3();
    for (const p of nb) cn.add(p);
    cn.multiplyScalar(1 / nc);
    const out = c.clone().sub(cn);
    // winding from the polygon's summed normal (robust for any convex-ish ring)
    const pn = new THREE.Vector3();
    for (let j = 0; j < segU; j++) {
      const p0 = rows[i][j].clone().sub(c), p1 = rows[i][(j + 1) % nc].clone().sub(c);
      pn.add(p0.cross(p1));
    }
    const ok = pn.dot(out) > 0;
    for (let j = 0; j < segU; j++) {
      const a = base + j, b = base + ((j + 1) % nc);
      if (ok) idx.push(a, b, ci);
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

/** Symmetric NACA 4-digit half thickness (chord 1). */
export function nacaT(u: number, t: number): number {
  const x = clamp(u, 0, 1);
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

export function roundedBox(w: number, h: number, d: number, r: number, seg = 2): THREE.BufferGeometry {
  const rr = Math.max(0.0001, Math.min(r, w / 2 - 1e-5, h / 2 - 1e-5, d / 2 - 1e-5));
  return new RoundedBoxGeometry(w, h, d, seg, rr);
}

/** Rounded rectangular bar from a to b (w across, h along `up`), extended by ext at both ends. */
export function bar(a: THREE.Vector3, b: THREE.Vector3, w: number, h: number, up: THREE.Vector3, ext = 0, r = 0.003): THREE.BufferGeometry {
  const dir = b.clone().sub(a).normalize();
  const a2 = a.clone().addScaledVector(dir, -ext), b2 = b.clone().addScaledVector(dir, ext);
  const len = a2.distanceTo(b2);
  const geo = roundedBox(w, h, len, r);
  const z = dir;
  const y = up.clone().sub(z.clone().multiplyScalar(up.dot(z))).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  m.setPosition(a2.clone().add(b2).multiplyScalar(0.5));
  geo.applyMatrix4(m);
  return geo;
}

/** Cylinder between p0 and p1 (radius r0 at p0, r1 at p1). */
export function cylAB(p0: THREE.Vector3, p1: THREE.Vector3, r0: number, r1 = r0, seg = 20, open = false): THREE.BufferGeometry {
  const len = p0.distanceTo(p1);
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, open);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(p0, q, new THREE.Vector3(1, 1, 1)));
  return g;
}

/** Thin surface from a (roughly planar, convex) polygon - glazing. */
export function polyGeo(pts: THREE.Vector3[]): THREE.BufferGeometry {
  const pos: number[] = [];
  for (let i = 1; i < pts.length - 1; i++) for (const p of [pts[0], pts[i], pts[i + 1]]) pos.push(p.x, p.y, p.z);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Lathe about +Y from [radius, y] profile points. */
export function latheY(profile: P2[], seg = 48): THREE.BufferGeometry {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y)), seg);
}

/** Ellipse ring around c in the plane spanned by u, v (semi-axes a along u, b along v). */
export function ellipseRing(c: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, a: number, b: number, n: number, ex = 2): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    const ct = Math.cos(t), st = Math.sin(t);
    const x = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / ex), y = Math.sign(st) * Math.pow(Math.abs(st), 2 / ex);
    out.push(c.clone().addScaledVector(u, a * x).addScaledVector(v, b * y));
  }
  return out;
}

/** Matrix mapping local +Y to `dir` with origin p. */
export function alignY(p: THREE.Vector3, dir: THREE.Vector3): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
}

/** Per-vertex constant colour (for the lens material). */
export function tint(g: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const col = new THREE.Color(hex);
  const c = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < g.attributes.position.count; i++) col.toArray(c, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
