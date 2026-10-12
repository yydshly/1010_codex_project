/**
 * Fitting helpers on top of the shared fitting API (shared/human/fit.ts): fields for the belt and
 * rigid gear (so straps ride OVER them instead of through them), a strap path draped over any such
 * field with pinned ends, strap bands as fields, and belt arc-length lookups.
 * (Local copy of the Soviet infantry helpers, so this module owns its fitting code.)
 */
import * as THREE from 'three';
import { gradient, type SDF } from '../../shared/human/sdfx';
import type { BeltPath } from '../../shared/human/fit';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Union of fields. */
export function union(fs: SDF[]): SDF {
  return (x, y, z) => {
    let d = Infinity;
    for (const f of fs) {
      const v = f(x, y, z);
      if (v < d) d = v;
    }
    return d;
  };
}

/**
 * Rounded box in a rigid local frame (`m` maps local -> asset space), given by its local bounds.
 * Cheap bounding-sphere early-out far from the box.
 */
export function boxField(m: THREE.Matrix4, box: THREE.Box3, r = 0.006): SDF {
  const inv = m.clone().invert();
  const e = inv.elements;
  const c = box.getCenter(V()), h = box.getSize(V()).multiplyScalar(0.5);
  const hx = Math.max(h.x - r, 1e-4), hy = Math.max(h.y - r, 1e-4), hz = Math.max(h.z - r, 1e-4);
  const wc = c.clone().applyMatrix4(m);
  const R = h.length();
  return (x, y, z) => {
    const dx0 = x - wc.x, dy0 = y - wc.y, dz0 = z - wc.z;
    const dc = Math.sqrt(dx0 * dx0 + dy0 * dy0 + dz0 * dz0);
    if (dc > R + 0.08) return dc - R;
    const lx = e[0] * x + e[4] * y + e[8] * z + e[12] - c.x;
    const ly = e[1] * x + e[5] * y + e[9] * z + e[13] - c.y;
    const lz = e[2] * x + e[6] * y + e[10] * z + e[14] - c.z;
    const qx = Math.abs(lx) - hx, qy = Math.abs(ly) - hy, qz = Math.abs(lz) - hz;
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - r;
  };
}

/** Ellipsoid (centre, radii in a rigid local frame; `m` maps local -> asset space). */
export function ellipsoidField(m: THREE.Matrix4, c: THREE.Vector3, r: THREE.Vector3): SDF {
  const e = m.clone().invert().elements;
  const rmin = Math.min(r.x, r.y, r.z);
  return (x, y, z) => {
    const lx = (e[0] * x + e[4] * y + e[8] * z + e[12] - c.x) / r.x;
    const ly = (e[1] * x + e[5] * y + e[9] * z + e[13] - c.y) / r.y;
    const lz = (e[2] * x + e[6] * y + e[10] * z + e[14] - c.z) / r.z;
    return (Math.sqrt(lx * lx + ly * ly + lz * lz) - 1) * rmin;
  };
}

/** The belt band as a field (nearest belt sample, box section width x thickness). */
export function beltField(belt: BeltPath, up: THREE.Vector3, width: number, thickness: number): SDF {
  const P = belt.points, N = belt.normals;
  const n = P.length;
  const hw = width / 2, ht = thickness / 2;
  let ymin = Infinity, ymax = -Infinity;
  for (const p of P) { ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y); }
  return (x, y, z) => {
    // far above / below the band: the vertical distance is a lower bound with a sensible gradient
    if (y < ymin - hw - 0.03) return ymin - hw - y;
    if (y > ymax + hw + 0.03) return y - ymax - hw;
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const p = P[i];
      const d = (x - p.x) ** 2 + (y - p.y) ** 2 + (z - p.z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    const p = P[best], nn = N[best];
    const rx = x - p.x, ry = y - p.y, rz = z - p.z;
    const dn = rx * nn.x + ry * nn.y + rz * nn.z;
    const du = rx * up.x + ry * up.y + rz * up.z;
    const qa = Math.abs(du) - hw, qb = Math.abs(dn) - ht;
    const oa = Math.max(qa, 0), ob = Math.max(qb, 0);
    return Math.sqrt(oa * oa + ob * ob) + Math.min(Math.max(qa, qb), 0);
  };
}

/** Angle (deg, fit convention: 0 front, + left) on the belt at an arc length from the front centre. */
export function beltAngleAtArc(belt: BeltPath, arc: number): number {
  const P = belt.points, n = P.length;
  const dir = arc >= 0 ? 1 : -1;
  let acc = 0;
  let i = 0;
  const target = Math.abs(arc);
  for (let k = 0; k < n; k++) {
    const j = (i + dir + n) % n;
    const seg = P[i].distanceTo(P[j]);
    if (acc + seg >= target) {
      const t = (target - acc) / seg;
      return (dir * (k + t) * 360) / n;
    }
    acc += seg;
    i = j;
  }
  return dir * 180;
}

function projectTo(f: SDF, p: THREE.Vector3, target: number, iters = 12): THREE.Vector3 {
  const n = V();
  for (let i = 0; i < iters; i++) {
    const d = f(p.x, p.y, p.z);
    const e = target - d;
    if (Math.abs(e) < 2e-5) break;
    gradient(f, p.x, p.y, p.z, 0.0008, n);
    p.addScaledVector(n, e);
  }
  return p;
}

export interface DrapeResult {
  points: THREE.Vector3[];
  normals: THREE.Vector3[];
}

/**
 * Strap / roll centreline over the field `f` at `offset` from its surface: sampled through the
 * control points, projected onto the offset surface, then relaxed like a taut strap (it bridges
 * hollows and never enters the offset surface). `pin` keeps the first and last points (strap
 * ends sewn to gear); `endNormals` give the strap face direction there, blended over `blend` m.
 */
export function drape(
  f: SDF,
  control: THREE.Vector3[],
  offset: number,
  opts: { closed?: boolean; tension?: number; step?: number; pin?: boolean; endNormals?: [THREE.Vector3 | null, THREE.Vector3 | null]; blend?: number; iters?: number } = {},
): DrapeResult {
  const closed = opts.closed ?? false;
  const pin = !closed && (opts.pin ?? false);
  const curve = new THREE.CatmullRomCurve3(control.map((p) => p.clone()), closed, 'centripetal');
  const len = curve.getLength();
  const n = Math.max(12, Math.ceil(len / (opts.step ?? 0.012)));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= (closed ? n - 1 : n); i++) pts.push(curve.getPointAt(i / n));
  const N = pts.length;
  const fixed = (i: number) => pin && (i === 0 || i === N - 1);
  for (let i = 0; i < N; i++) if (!fixed(i)) projectTo(f, pts[i], offset);
  const iters = opts.iters ?? Math.round(40 * (opts.tension ?? 0.5));
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < N; i++) {
      if (fixed(i) || (!closed && (i === 0 || i === N - 1))) continue;
      const a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N];
      const p = pts[i].lerp(a.clone().add(b).multiplyScalar(0.5), 0.5);
      if (f(p.x, p.y, p.z) < offset) projectTo(f, p, offset, 6);
    }
  }
  const normals: THREE.Vector3[] = [];
  const g = V();
  for (let i = 0; i < N; i++) {
    const p = pts[i];
    gradient(f, p.x, p.y, p.z, 0.002, g);
    const a = pts[closed ? (i - 1 + N) % N : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % N : Math.min(N - 1, i + 1)];
    const t = b.clone().sub(a).normalize();
    const nn = g.clone().addScaledVector(t, -g.dot(t)).normalize();
    normals.push(nn);
  }
  // blend towards the given end normals (strap ends leaving a piece of gear)
  if (opts.endNormals) {
    const bl = opts.blend ?? 0.05;
    const acc: number[] = [0];
    for (let i = 1; i < N; i++) acc.push(acc[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const L = acc[N - 1];
    const [n0, n1] = opts.endNormals;
    for (let i = 0; i < N; i++) {
      if (n0) {
        const w = 1 - Math.min(1, acc[i] / bl);
        if (w > 0) normals[i].lerp(n0, w * w * (3 - 2 * w)).normalize();
      }
      if (n1) {
        const w = 1 - Math.min(1, (L - acc[i]) / bl);
        if (w > 0) normals[i].lerp(n1, w * w * (3 - 2 * w)).normalize();
      }
    }
  }
  return { points: pts, normals };
}

/** A strap band as a field (nearest sample, box section) so other straps can lie over it. */
export function strapField(points: THREE.Vector3[], normals: THREE.Vector3[], width: number, thickness: number): SDF {
  const n = points.length;
  const tang = points.map((_p, i) => points[Math.min(n - 1, i + 1)].clone().sub(points[Math.max(0, i - 1)]).normalize());
  const side = normals.map((nn, i) => new THREE.Vector3().crossVectors(tang[i], nn).normalize());
  const box = new THREE.Box3().setFromPoints(points).expandByScalar(width + 0.05);
  const hw = width / 2, ht = thickness / 2;
  return (x, y, z) => {
    const ox0 = Math.max(box.min.x - x, 0, x - box.max.x), oy0 = Math.max(box.min.y - y, 0, y - box.max.y), oz0 = Math.max(box.min.z - z, 0, z - box.max.z);
    if (ox0 > 0 || oy0 > 0 || oz0 > 0) return Math.sqrt(ox0 * ox0 + oy0 * oy0 + oz0 * oz0) + 0.05;
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const p = points[i];
      const d = (x - p.x) ** 2 + (y - p.y) ** 2 + (z - p.z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    const p = points[best], nn = normals[best], s = side[best];
    const rx = x - p.x, ry = y - p.y, rz = z - p.z;
    const qa = Math.abs(rx * s.x + ry * s.y + rz * s.z) - hw;
    const qb = Math.abs(rx * nn.x + ry * nn.y + rz * nn.z) - ht;
    const oa = Math.max(qa, 0), ob = Math.max(qb, 0);
    return Math.sqrt(oa * oa + ob * ob) + Math.min(Math.max(qa, qb), 0);
  };
}
