/** Small geometry helpers used by the PaK 40 modules. */
import { THREE, G } from '../../../core/kit';

export type V2 = [number, number];
export type V3 = [number, number, number];
export const D2R = Math.PI / 180;
export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Lathe around +Z from a [radius, z] profile. Lathe phi = 0 points to -Y, phi = PI/2 to +X. */
export function latheZ(profile: V2[], seg = 40, creaseDeg = 40, phiStart = 0, phiLength = Math.PI * 2): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg, phiStart, phiLength);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Lathe around +X from a [radius, x] profile. */
export function latheX(profile: V2[], seg = 40, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Cylinder along X centred at (x0..x1). */
export function cylX(r: number, x0: number, x1: number, seg = 24, y = 0, z = 0, bevel = 0.002): THREE.BufferGeometry {
  const b = Math.min(bevel, r * 0.3, Math.abs(x1 - x0) * 0.3);
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
  const g = latheX([[0, lo], [r - b, lo], [r, lo + b], [r, hi - b], [r - b, hi], [0, hi]], seg, 40);
  g.translate(0, y, z);
  return g;
}

/** Cylinder along Z (z0..z1) with small end chamfers. */
export function cylZ(r: number, z0: number, z1: number, seg = 24, x = 0, y = 0, bevel = 0.002): THREE.BufferGeometry {
  const b = Math.min(bevel, r * 0.3, Math.abs(z1 - z0) * 0.3);
  const lo = Math.min(z0, z1), hi = Math.max(z0, z1);
  const g = latheZ([[0, lo], [r - b, lo], [r, lo + b], [r, hi - b], [r - b, hi], [0, hi]], seg, 40);
  g.translate(x, y, 0);
  return g;
}

/** Cylinder along Y (y0..y1) with small end chamfers. */
export function cylY(r: number, y0: number, y1: number, seg = 24, x = 0, z = 0, bevel = 0.002): THREE.BufferGeometry {
  const b = Math.min(bevel, r * 0.3, Math.abs(y1 - y0) * 0.3);
  const lo = Math.min(y0, y1), hi = Math.max(y0, y1);
  const g = G.lathe([[0, lo], [r - b, lo], [r, lo + b], [r, hi - b], [r - b, hi], [0, hi]], seg, 40);
  g.translate(x, 0, z);
  return g;
}

/** Plane written as z = f(x, y) (never vertical in z). */
export class ZPlane {
  readonly p0: THREE.Vector3;
  readonly n: THREE.Vector3;
  constructor(p0: THREE.Vector3, n: THREE.Vector3) {
    this.p0 = p0.clone();
    this.n = n.clone().normalize();
  }
  zAt(x: number, y: number): number {
    return this.p0.z - (this.n.x * (x - this.p0.x) + this.n.y * (y - this.p0.y)) / this.n.z;
  }
  at(x: number, y: number): THREE.Vector3 {
    return new THREE.Vector3(x, y, this.zAt(x, y));
  }
  offset(d: number): ZPlane {
    return new ZPlane(this.p0.clone().addScaledVector(this.n, d), this.n);
  }
  coef(): [number, number, number] {
    const B = -this.n.x / this.n.z, C = -this.n.y / this.n.z;
    return [this.p0.z - B * this.p0.x - C * this.p0.y, B, C];
  }
}

/** X where two planes intersect at height y. */
export function meetX(a: ZPlane, b: ZPlane, y: number): number {
  const [A1, B1, C1] = a.coef(), [A2, B2, C2] = b.coef();
  return (A2 - A1 + (C2 - C1) * y) / (B1 - B2);
}

/**
 * Flat plate lying in a plane; outline & holes are given as front-view (x, y) points that are
 * projected onto the plane. `e1` is the in-plane "horizontal" direction. Thickness centred on the plane.
 */
export function planePlate(
  pl: ZPlane,
  e1: THREE.Vector3,
  outline: V2[],
  holes: V2[][],
  t: number,
  bevel = 0.0015,
  corner = 0.006,
): THREE.BufferGeometry {
  const n = pl.n;
  const u = e1.clone().sub(n.clone().multiplyScalar(e1.dot(n))).normalize();
  const v = n.clone().cross(u).normalize();
  const o = pl.p0;
  const to2 = ([x, y]: V2): V2 => {
    const P = pl.at(x, y).sub(o);
    return [P.dot(u), P.dot(v)];
  };
  const sh = G.shape(outline.map(to2), corner, holes.map((h) => h.map(to2)));
  const g = G.extrude(sh, t, bevel, 6, 1);
  const m = new THREE.Matrix4().makeBasis(u, v, n).setPosition(o);
  g.applyMatrix4(m);
  return g;
}

/** Rounded-rectangle outline (x0..x1, y0..y1) as a point list with chamfered corners. */
export function rrect(x0: number, y0: number, x1: number, y1: number, c = 0.01): V2[] {
  return [
    [x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c],
  ];
}

/** Circle outline. */
export function circle(cx: number, cy: number, r: number, n = 24): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** Annular sector outline in a 2D plane (angles in degrees, CCW from +u). */
export function annulus(r0: number, r1: number, a0: number, a1: number, steps = 16, cu = 0, cv = 0): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (a0 + ((a1 - a0) * i) / steps) * D2R;
    pts.push([cu + Math.cos(a) * r1, cv + Math.sin(a) * r1]);
  }
  for (let i = steps; i >= 0; i--) {
    const a = (a0 + ((a1 - a0) * i) / steps) * D2R;
    pts.push([cu + Math.cos(a) * r0, cv + Math.sin(a) * r0]);
  }
  return pts;
}

/** Stadium (two circles joined) outline between points a and b in 2D, radius r. */
export function stadium(a: V2, b: V2, ra: number, rb = ra, steps = 12): V2[] {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const ang = Math.atan2(dy, dx);
  const pts: V2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = ang - Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([b[0] + Math.cos(t) * rb, b[1] + Math.sin(t) * rb]);
  }
  for (let i = 0; i <= steps; i++) {
    const t = ang + Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([a[0] + Math.cos(t) * ra, a[1] + Math.sin(t) * ra]);
  }
  return pts;
}

/** Bolt heads scattered at positions all facing the same normal. */
export function bolts(pts: THREE.Vector3[], n: THREE.Vector3 | V3, size = 0.016, h = 0.008): THREE.BufferGeometry {
  const N = Array.isArray(n) ? v3(...n) : n;
  return G.scatter(
    G.boltHead(size, h),
    pts.map((p, i) => ({ p, n: N, spin: (i * 0.7) % 1.0 })),
  );
}

/** Dome rivets. */
export function rivets(pts: THREE.Vector3[], n: THREE.Vector3 | V3, r = 0.006): THREE.BufferGeometry {
  const N = Array.isArray(n) ? v3(...n) : n;
  return G.scatter(G.rivetHead(r), pts.map((p) => ({ p, n: N })));
}

/** Clamp every vertex below `y` onto the plane y (tyre contact patch). */
export function flattenBelow(g: THREE.BufferGeometry, y: number): THREE.BufferGeometry {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < y) p.setY(i, y);
  p.needsUpdate = true;
  return g;
}

/**
 * Geometry transformed by a local frame: shape-space X -> `u`, Y -> `v`, Z -> `w` (unit vectors),
 * then translated to `o`. The frame must be right-handed (u x v = w).
 */
export function frame(g: THREE.BufferGeometry, u: THREE.Vector3, v: THREE.Vector3, w: THREE.Vector3, o: THREE.Vector3 | V3): THREE.BufferGeometry {
  const O = Array.isArray(o) ? v3(...o) : o;
  const m = new THREE.Matrix4().makeBasis(u, v, w).setPosition(O);
  g.applyMatrix4(m);
  return g;
}

/** Merge different geometries (position + normal only) into one non-indexed geometry. */
export function mergeAll(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const g0 of gs) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    const p = g.attributes.position.array as Float32Array;
    const n = g.attributes.normal.array as Float32Array;
    for (let i = 0; i < p.length; i++) pos.push(p[i]);
    for (let i = 0; i < n.length; i++) nor.push(n[i]);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

/** Axis-aligned bounding box of an object (world), exact on vertices. */
export function exactBounds(o: THREE.Object3D): THREE.Box3 {
  o.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(o, true);
}
