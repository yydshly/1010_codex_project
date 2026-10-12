/** Small modelling helpers for the T-34-85 (all local to this asset). */
import { THREE, G } from '../../../core/kit';

export type P3 = [number, number, number];
export type P2 = [number, number];
const V = (p: P3) => new THREE.Vector3(p[0], p[1], p[2]);

/**
 * Planar armour slab. `outer` is the OUTER face polygon (3D, coplanar), `outward` its outward normal.
 * The plate is extruded inward by `t`, with a bevel on its edges.
 */
export function slab(outer: P3[], t: number, outward: P3, bevel = 0.006, corner = 0): THREE.BufferGeometry {
  const n = V(outward).normalize();
  const o = V(outer[0]);
  const e = V(outer[1]).sub(o);
  const u = e.sub(n.clone().multiplyScalar(e.dot(n))).normalize();
  const v = new THREE.Vector3().crossVectors(n, u);
  let pts: G.V2[] = outer.map((p) => {
    const d = V(p).sub(o);
    return [d.dot(u), d.dot(v)];
  });
  if (THREE.ShapeUtils.isClockWise(pts.map(([x, y]) => new THREE.Vector2(x, y)))) pts = pts.reverse();
  const g = G.extrude(G.shape(pts, corner), t, bevel, 6, 1);
  g.translate(0, 0, -t / 2);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(u, v, n).setPosition(o));
  return g;
}

/**
 * Local frame on a plane: origin o, in-plane axes u (right), v (up the plate), normal n (outward).
 * Returns a Matrix4 mapping local (x=u, y=n, z=v) so that parts modelled "lying on the ground"
 * (+Y up, standing on y=0) sit on the plate surface with +Y along the plate normal.
 */
export function surfaceFrame(o: P3, u: P3, n: P3): THREE.Matrix4 {
  const N = V(n).normalize();
  const U = V(u).sub(N.clone().multiplyScalar(V(u).dot(N))).normalize();
  const W = new THREE.Vector3().crossVectors(U, N); // local +Z
  return new THREE.Matrix4().makeBasis(U, N, W).setPosition(V(o));
}

/** Apply a matrix to an Object3D (sets position/quaternion/scale). */
export function applyFrame<T extends THREE.Object3D>(obj: T, m: THREE.Matrix4): T {
  m.decompose(obj.position, obj.quaternion, obj.scale);
  return obj;
}

/** A ring of bolt heads (placements for G.scatter) on a plane with normal n. */
export function boltRing(c: P3, n: P3, r: number, count: number, phase = 0): { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] {
  const N = V(n).normalize();
  const a = Math.abs(N.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const U = new THREE.Vector3().crossVectors(a, N).normalize();
  const W = new THREE.Vector3().crossVectors(N, U);
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = phase + (i / count) * Math.PI * 2;
    const p = V(c).addScaledVector(U, Math.cos(t) * r).addScaledVector(W, Math.sin(t) * r);
    out.push({ p, n: N.clone(), spin: t * 1.7 });
  }
  return out;
}

/** Bolt placements along a segment. */
export function boltLine(a: P3, b: P3, n: P3, count: number): { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] {
  const N = V(n).normalize();
  return G.along(a, b, count).map((p, i) => ({ p, n: N.clone(), spin: i * 0.9 }));
}

/**
 * Convex polygon with rounded corners, sampled with a FIXED number of points (so rings with the same
 * corner count can be lofted). corners are CCW; radii per corner.
 */
export function roundedRing(corners: P2[], radii: number[], perCorner = 5, perEdge = 2): P2[] {
  const n = corners.length;
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = corners[(i - 1 + n) % n], b = corners[i], c = corners[(i + 1) % n];
    const ab = [b[0] - a[0], b[1] - a[1]], bc = [c[0] - b[0], c[1] - b[1]];
    const lab = Math.hypot(ab[0], ab[1]) || 1e-6, lbc = Math.hypot(bc[0], bc[1]) || 1e-6;
    const r = Math.min(radii[i], lab * 0.45, lbc * 0.45);
    const p1: P2 = [b[0] - (ab[0] / lab) * r, b[1] - (ab[1] / lab) * r];
    const p2: P2 = [b[0] + (bc[0] / lbc) * r, b[1] + (bc[1] / lbc) * r];
    for (let k = 0; k < perCorner; k++) {
      const t = perCorner === 1 ? 0.5 : k / (perCorner - 1);
      const x = (1 - t) * (1 - t) * p1[0] + 2 * (1 - t) * t * b[0] + t * t * p2[0];
      const y = (1 - t) * (1 - t) * p1[1] + 2 * (1 - t) * t * b[1] + t * t * p2[1];
      out.push([x, y]);
    }
    // intermediate points along the edge to the next corner
    const nx = corners[(i + 1) % n], nn = corners[(i + 2) % n];
    const e1 = [nx[0] - b[0], nx[1] - b[1]];
    const le = Math.hypot(e1[0], e1[1]) || 1e-6;
    const rNext = Math.min(radii[(i + 1) % n], le * 0.45, Math.hypot(nn[0] - nx[0], nn[1] - nx[1]) * 0.45);
    const q1: P2 = p2;
    const q2: P2 = [nx[0] - (e1[0] / le) * rNext, nx[1] - (e1[1] / le) * rNext];
    for (let k = 1; k <= perEdge; k++) {
      const t = k / (perEdge + 1);
      out.push([q1[0] + (q2[0] - q1[0]) * t, q1[1] + (q2[1] - q1[1]) * t]);
    }
  }
  return out;
}

/** Annulus sector outline in 2D (angles in radians), CCW. */
export function sectorOutline(r0: number, r1: number, a0: number, a1: number, seg = 16): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = a0 + ((a1 - a0) * i) / seg;
    pts.push([Math.cos(a) * r1, Math.sin(a) * r1]);
  }
  for (let i = seg; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / seg;
    pts.push([Math.cos(a) * r0, Math.sin(a) * r0]);
  }
  return pts;
}

/** Circle outline (CCW). */
export function circle(r: number, seg = 32, cx = 0, cy = 0): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/**
 * Flat annulus disc with circular holes, lying in the XY plane (thickness along Z, centred).
 * Used for perforated tyre walls, wheel webs and sprocket discs.
 */
export function perforatedDisc(
  rOut: number,
  rIn: number,
  t: number,
  holes: { r: number; at: number; count: number; phase?: number; seg?: number }[],
  seg = 48,
  bevel = 0.002,
): THREE.BufferGeometry {
  const poly = (p: THREE.Path, r: number, n: number, cx: number, cy: number, cw: boolean) => {
    for (let i = 0; i <= n; i++) {
      const a = ((cw ? -i : i) / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
  };
  const s = new THREE.Shape();
  poly(s, rOut, seg, 0, 0, false);
  if (rIn > 0) {
    const inner = new THREE.Path();
    poly(inner, rIn, seg, 0, 0, true);
    s.holes.push(inner);
  }
  for (const h of holes) {
    for (let i = 0; i < h.count; i++) {
      const a = (h.phase ?? 0) + (i / h.count) * Math.PI * 2;
      const p = new THREE.Path();
      poly(p, h.r, h.seg ?? 10, Math.cos(a) * h.at, Math.sin(a) * h.at, true);
      s.holes.push(p);
    }
  }
  const b = Math.min(bevel, t / 2 - 1e-4);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(1e-4, t - 2 * b),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b,
    bevelSegments: 1,
    curveSegments: 1,
  });
  g.translate(0, 0, -(t - 2 * b) / 2);
  return G.crease(g, 40);
}

/** Quadratic Bezier point. */
export function qbez(a: P2, q: P2, b: P2, t: number): P2 {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * q[0] + t * t * b[0], u * u * a[1] + 2 * u * t * q[1] + t * t * b[1]];
}
