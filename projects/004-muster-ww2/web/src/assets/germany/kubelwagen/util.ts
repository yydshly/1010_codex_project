/**
 * Geometry helpers for the Kubelwagen (pressed-steel body panels built from planar slabs,
 * rolled fillets between panels, pressed stiffening beads, tyre contact flattening).
 * Local to this asset.
 */
import { THREE, G, part } from '../../../core/kit';

export type V2 = [number, number];
export type V3 = [number, number, number];

/** A 3D point given either as a tuple or a Vector3. */
export type P3 = V3 | THREE.Vector3;

export const vec = (a: P3) => (Array.isArray(a) ? new THREE.Vector3(a[0], a[1], a[2]) : a.clone());

/** Plane frame: u = outline x, v = outline y, n = outward normal (outer surface at n = 0). */
export interface Frame {
  o: V3;
  u: V3;
  v: V3;
  n: V3;
}

function basis(f: Frame): THREE.Matrix4 {
  const u = vec(f.u), v = vec(f.v), n = vec(f.n), o = vec(f.o);
  return new THREE.Matrix4().makeBasis(u, v, n).setPosition(o);
}

function applyFix(g: THREE.BufferGeometry, m: THREE.Matrix4) {
  g.applyMatrix4(m);
  if (m.determinant() < 0) G.flipWinding(g);
  return g;
}

/**
 * Planar panel: 2D outline (in frame u/v), thickness t extending INWARD (-n) from the
 * outer surface, optional holes and corner rounding.
 */
export function slabGeo(outline: V2[], t: number, f: Frame, opts: { bevel?: number; corner?: number; holes?: V2[][] } = {}): THREE.BufferGeometry {
  const sh = G.shape(outline, opts.corner ?? 0, opts.holes ?? []);
  const g = G.extrude(sh, t, opts.bevel ?? Math.min(0.0012, t * 0.4), 6, 1);
  g.translate(0, 0, -t / 2);
  return applyFix(g, basis(f));
}

export function slab(outline: V2[], t: number, f: Frame, mat: THREE.Material, opts: { bevel?: number; corner?: number; holes?: V2[][] } = {}) {
  return part(slabGeo(outline, t, f, opts), mat);
}

/** Tangent distance of a fillet of radius r in a corner of interior angle alpha (rad). */
export function tanOff(r: number, alpha: number) {
  return r / Math.tan(alpha / 2);
}

/**
 * Rolled fillet between two panels meeting along the sharp outer edge A->B.
 * d1, d2: unit directions perpendicular to the edge, lying in panel 1 / panel 2, pointing
 * away from the edge into each panel. The fillet has radius r (outer) and thickness t.
 */
export function filletGeo(A: P3, B: P3, d1v: P3, d2v: P3, r: number, t: number, seg = 10): THREE.BufferGeometry {
  const a = vec(A), b = vec(B);
  const e = b.clone().sub(a);
  const len = e.length();
  e.normalize();
  const d1 = vec(d1v).normalize();
  const d2 = vec(d2v).normalize();
  const alpha = Math.acos(THREE.MathUtils.clamp(d1.dot(d2), -1, 1));
  const e1 = d1.clone();
  const e2 = d2.clone().sub(d1.clone().multiplyScalar(d2.dot(d1))).normalize();
  const cx = r / Math.tan(alpha / 2), cy = r;
  const th2 = alpha + Math.PI / 2, th1 = Math.PI * 1.5;
  const pts: V2[] = [];
  for (let i = 0; i <= seg; i++) {
    const th = th2 + ((th1 - th2) * i) / seg;
    pts.push([cx + r * Math.cos(th), cy + r * Math.sin(th)]);
  }
  for (let i = seg; i >= 0; i--) {
    const th = th2 + ((th1 - th2) * i) / seg;
    pts.push([cx + (r - t) * Math.cos(th), cy + (r - t) * Math.sin(th)]);
  }
  const g = G.extrude(G.shape(pts), len, 0, 4, 1);
  g.translate(0, 0, len / 2);
  const m = new THREE.Matrix4().makeBasis(e1, e2, e).setPosition(a);
  return applyFix(g, m);
}

/** Centre of the fillet axis for an edge point (used for corner spheres). */
export function filletCentre(A: P3, d1v: P3, d2v: P3, r: number): THREE.Vector3 {
  const d1 = vec(d1v).normalize(), d2 = vec(d2v).normalize();
  const alpha = Math.acos(THREE.MathUtils.clamp(d1.dot(d2), -1, 1));
  const bis = d1.clone().add(d2).normalize();
  return vec(A).add(bis.multiplyScalar(r / Math.sin(alpha / 2)));
}

/**
 * Pressed stiffening bead on a panel: a flattened capsule from A to B lying on the surface,
 * protruding h along n, width w.
 */
export function beadGeo(A: P3, B: P3, n: P3, w: number, h: number, radialSeg = 10): THREE.BufferGeometry {
  const a = vec(A), b = vec(B);
  const dir = b.clone().sub(a);
  const L = dir.length();
  dir.normalize();
  const N = vec(n).normalize();
  const W = dir.clone().cross(N).normalize();
  const g = new THREE.CapsuleGeometry(w / 2, Math.max(0.001, L - w), 3, radialSeg);
  const sN = h / (w / 2);
  // capsule local: Y = length, X / Z radial -> X -> N (scaled), Z -> W
  const m = new THREE.Matrix4().makeBasis(N.clone().multiplyScalar(sN), dir, W).setPosition(a.clone().add(b).multiplyScalar(0.5));
  return applyFix(g, m);
}

/** Flatten a (world-placed) geometry at the ground: every vertex below y0 is lifted to y0. */
export function clampGround(g: THREE.BufferGeometry, y0 = 0) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute | undefined;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < y0) {
      p.setY(i, y0);
      if (n) n.setXYZ(i, n.getX(i) * 0.3, -1, n.getZ(i) * 0.3);
    }
  }
  if (n) {
    for (let i = 0; i < n.count; i++) {
      const x = n.getX(i), y = n.getY(i), z = n.getZ(i);
      const l = Math.hypot(x, y, z) || 1;
      n.setXYZ(i, x / l, y / l, z / l);
    }
    n.needsUpdate = true;
  }
  p.needsUpdate = true;
  return g;
}

/** Transform a geometry by a placement (position + Euler degrees). */
export function placed(g: THREE.BufferGeometry, p: P3, rDeg: V3 = [0, 0, 0], s: number | V3 = 1) {
  const m = new THREE.Matrix4().compose(
    vec(p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(G.deg(rDeg[0]), G.deg(rDeg[1]), G.deg(rDeg[2]))),
    typeof s === 'number' ? new THREE.Vector3(s, s, s) : vec(s),
  );
  return applyFix(g, m);
}

/** Merge a list of geometries (non-indexed safe). */
export function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const norm = gs.map((g) => {
    let h = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(h.attributes)) if (k !== 'position' && k !== 'normal') h.deleteAttribute(k);
    if (!h.attributes.normal) h.computeVertexNormals();
    return h;
  });
  return G.mergeGeometries(norm)!;
}

/** Lathe profile (r, axial) turned so the axis is +X (axial + -> +X). */
export function latheX(profile: V2[], seg = 48, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Lathe profile (r, axial) turned so the axis is +Z. */
export function latheZ(profile: V2[], seg = 48, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Arc of points (in 2D) around a centre, angles in radians. */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

/** 2D line helpers. */
export function lerp2(a: V2, b: V2, t: number): V2 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
/** Offset the infinite line a->b by d to its LEFT (counter-clockwise normal). */
export function offsetLine(a: V2, b: V2, d: number): [V2, V2] {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  const nx = -dy / l, ny = dx / l;
  return [
    [a[0] + nx * d, a[1] + ny * d],
    [b[0] + nx * d, b[1] + ny * d],
  ];
}
export function intersect(a: [V2, V2], b: [V2, V2]): V2 {
  const [p, p2] = a, [q, q2] = b;
  const r = [p2[0] - p[0], p2[1] - p[1]], s = [q2[0] - q[0], q2[1] - q[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / den;
  return [p[0] + r[0] * t, p[1] + r[1] * t];
}
/** Point on line (a->b) at a given coordinate: axis 0 = x given, 1 = y given. */
export function atCoord(line: [V2, V2], axis: 0 | 1, value: number): V2 {
  const [a, b] = line;
  const t = (value - a[axis]) / (b[axis] - a[axis]);
  return lerp2(a, b, t);
}

/** Rounded-rectangle outline (centred), for small plates. */
export function rrect(w: number, h: number, cx = 0, cy = 0): V2[] {
  return [
    [cx - w / 2, cy - h / 2],
    [cx + w / 2, cy - h / 2],
    [cx + w / 2, cy + h / 2],
    [cx - w / 2, cy + h / 2],
  ];
}
