/** Small geometry helpers for the StuG III Ausf. G modules (kept local to this asset). */
import { THREE, G } from '../../../core/kit';

export type V2 = [number, number];

const cboxCache = new Map<string, THREE.BufferGeometry>();
/**
 * Light chamfered box (w along X, h along Y, d along Z): chamfer on the edges around the
 * +Z/-Z faces only. ~28 triangles, for small repeated parts (link pads, cleats, straps).
 */
export function cbox(w: number, h: number, d: number, b = 0.002): THREE.BufferGeometry {
  const key = [w, h, d, b].join(',');
  let g = cboxCache.get(key);
  if (!g) {
    const s = G.shape([
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ]);
    g = G.extrude(s, d, b, 1, 1);
    cboxCache.set(key, g);
  }
  return g.clone();
}

/** Rounded box with a single rounding segment (108 triangles). */
export function rb(w: number, h: number, d: number, r = 0.006): THREE.BufferGeometry {
  return G.rbox(w, h, d, r, 1);
}

/** Lathe profile (r, axial) around +Y, turned so the axis is +X (axial +  -> +X). */
export function latheX(profile: V2[], seg = 36, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Bolt-ring placements around the X axis at axial position x (for G.scatter). */
export function boltRingX(r: number, n: number, x: number, dir: 1 | -1 = 1, phase = 0): { p: THREE.Vector3; n: THREE.Vector3 }[] {
  const out: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    out.push({ p: new THREE.Vector3(x, Math.sin(a) * r, Math.cos(a) * r), n: new THREE.Vector3(dir, 0, 0) });
  }
  return out;
}

let nutGeo: THREE.BufferGeometry | null = null;
/** Plain hex nut / bolt head (24 triangles), +Y up, base at y = 0, 1 unit across flats-ish. */
export function nut(size = 0.02, height = 0.009): THREE.BufferGeometry {
  if (!nutGeo) {
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1);
    g.translate(0, 0.5, 0);
    nutGeo = G.crease(g, 30);
  }
  const g = nutGeo.clone();
  g.scale(size, height, size);
  return g;
}

/** Convex outline (CCW) around several circles, in 2D (for cast levers and brackets). */
export function hullOutline(circles: { c: V2; r: number }[], seg = 10): V2[] {
  const pts: V2[] = [];
  for (const k of circles)
    for (let i = 0; i < seg * 2; i++) {
      const a = (i / (seg * 2)) * Math.PI * 2;
      pts.push([k.c[0] + Math.cos(a) * k.r, k.c[1] + Math.sin(a) * k.r]);
    }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: V2[] = [], upper: V2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Points of a circle (for extrude holes), clockwise. */
export function circlePts(r: number, n: number, cx = 0, cy = 0): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = -(i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** Scatter a geometry at placements given as [x,y,z] points all sharing one normal. */
export function scatterN(g: THREE.BufferGeometry, pts: G.V3[], n: G.V3): THREE.BufferGeometry {
  return G.scatter(g, pts.map((p) => ({ p, n })));
}

/** A plane n . p = d with outward normal n (need not be unit length). */
export interface Plane { n: G.V3; d: number }

/** Plane through point p with outward normal n. */
export function planeAt(n: G.V3, p: G.V3): Plane {
  const l = Math.hypot(n[0], n[1], n[2]);
  const u: G.V3 = [n[0] / l, n[1] / l, n[2] / l];
  return { n: u, d: u[0] * p[0] + u[1] * p[1] + u[2] * p[2] };
}

/**
 * Wall plane standing on the base edge A->B (points (x, z) at height y0), leaning inwards by
 * `slopeDeg` from vertical. `inside` is any (x, z) point inside the footprint.
 */
export function wallPlane(A: V2, B: V2, slopeDeg: number, inside: V2, y0 = 0): Plane {
  const ex = B[0] - A[0], ez = B[1] - A[1];
  const l = Math.hypot(ex, ez);
  let mx = ez / l, mz = -ex / l;
  if ((inside[0] - A[0]) * mx + (inside[1] - A[1]) * mz > 0) (mx = -mx), (mz = -mz);
  const s = (slopeDeg * Math.PI) / 180;
  return planeAt([mx * Math.cos(s), Math.sin(s), mz * Math.cos(s)], [A[0], y0, A[1]]);
}

/**
 * Convex solid bounded by planes (outward normals). Vertices are the pairwise-triple plane
 * intersections inside all half-spaces; faces are flat (creased normals). Used for armour
 * bodies with sloped plates, mantlets and cast blocks.
 */
export function convexFromPlanes(planes: Plane[], creaseDeg = 20): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const n = planes.length;
  const m = new THREE.Matrix3();
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        const a = planes[i], b = planes[j], c = planes[k];
        m.set(a.n[0], a.n[1], a.n[2], b.n[0], b.n[1], b.n[2], c.n[0], c.n[1], c.n[2]);
        if (Math.abs(m.determinant()) < 1e-9) continue;
        const inv = m.clone().invert();
        const p = new THREE.Vector3(a.d, b.d, c.d).applyMatrix3(inv);
        let ok = true;
        for (const q of planes) if (q.n[0] * p.x + q.n[1] * p.y + q.n[2] * p.z > q.d + 1e-7) { ok = false; break; }
        if (ok && !pts.some((o) => o.distanceToSquared(p) < 1e-12)) pts.push(p);
      }
  // build faces plane by plane: collect vertices on the plane, sort them around their centroid
  const pos: number[] = [];
  for (const q of planes) {
    const on = pts.filter((p) => Math.abs(q.n[0] * p.x + q.n[1] * p.y + q.n[2] * p.z - q.d) < 1e-6);
    if (on.length < 3) continue;
    const c = on.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / on.length);
    const nn = new THREE.Vector3(...q.n);
    const u = new THREE.Vector3().subVectors(on[0], c).normalize();
    const v = new THREE.Vector3().crossVectors(nn, u);
    on.sort((p1, p2) => {
      const d1 = new THREE.Vector3().subVectors(p1, c), d2 = new THREE.Vector3().subVectors(p2, c);
      return Math.atan2(d1.dot(v), d1.dot(u)) - Math.atan2(d2.dot(v), d2.dot(u));
    });
    for (let i = 1; i < on.length - 1; i++) pos.push(on[0].x, on[0].y, on[0].z, on[i].x, on[i].y, on[i].z, on[i + 1].x, on[i + 1].y, on[i + 1].z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return G.crease(g, creaseDeg);
}

/** Group placed with an explicit basis (x, y, z axes, orthonormal, right-handed) at origin o. */
export function basisGroup(children: THREE.Object3D[], o: THREE.Vector3, x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  g.position.copy(o);
  return g;
}

/** Lathe profile [r, axial] around +Z (axial + -> +Z). */
export function latheZ(profile: V2[], seg = 36, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Annular sector (angles in degrees, 0 = +X, 90 = +Y) extruded along +Z over [z0, z1]. */
export function arcBand(r0: number, r1: number, a0: number, a1: number, z0: number, z1: number, seg = 12, bevel = 0.002): THREE.BufferGeometry {
  const pts: V2[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = ((a0 + ((a1 - a0) * i) / seg) * Math.PI) / 180;
    pts.push([Math.cos(a) * r1, Math.sin(a) * r1]);
  }
  for (let i = seg; i >= 0; i--) {
    const a = ((a0 + ((a1 - a0) * i) / seg) * Math.PI) / 180;
    pts.push([Math.cos(a) * r0, Math.sin(a) * r0]);
  }
  const g = G.extrude(G.shape(pts), z1 - z0, bevel, 1, 1);
  g.translate(0, 0, (z0 + z1) / 2);
  return g;
}

/** Merge an array of geometries (indexed or not). */
export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return G.mergeGeometries(list.map((p) => (p.index ? p.toNonIndexed() : p)))!;
}
