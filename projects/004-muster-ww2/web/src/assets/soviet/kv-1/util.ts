/** Small modelling helpers for the KV-1 (copied from the IS-2 helpers; local to this asset). */
import { THREE, G } from '../../../core/kit';

export type P3 = [number, number, number];
export type P2 = [number, number];
const V = (p: P3) => new THREE.Vector3(p[0], p[1], p[2]);
export const D2R = Math.PI / 180;

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
 * Local frame on a surface: origin o, in-plane direction u, outward normal n.
 * Local (x = u, y = n, z = u x n): parts modelled "lying on the ground" (+Y up, standing on y = 0)
 * sit on the surface with +Y along the normal.
 */
export function surfaceFrame(o: P3 | THREE.Vector3, u: P3 | THREE.Vector3, n: P3 | THREE.Vector3): THREE.Matrix4 {
  const O = Array.isArray(o) ? V(o) : o.clone();
  const N = (Array.isArray(n) ? V(n) : n.clone()).normalize();
  const Uin = Array.isArray(u) ? V(u) : u.clone();
  const U = Uin.sub(N.clone().multiplyScalar(Uin.dot(N))).normalize();
  const W = new THREE.Vector3().crossVectors(U, N);
  return new THREE.Matrix4().makeBasis(U, N, W).setPosition(O);
}

/** Apply a matrix to an Object3D (sets position/quaternion/scale). */
export function applyFrame<T extends THREE.Object3D>(obj: T, m: THREE.Matrix4): T {
  m.decompose(obj.position, obj.quaternion, obj.scale);
  return obj;
}

/** A ring of bolt placements (for G.scatter) on a plane with normal n. */
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
 * Flat annulus disc with circular holes, lying in the XY plane (thickness along Z, centred).
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

/**
 * Weld bead along a polyline (like G.weld, but with a coarser ripple pitch so that the long hull
 * seams stay cheap): a 6-sided tube whose radius alternates slightly from segment to segment.
 */
export function weldBead(points: P3[], r = 0.006, pitch = 2.8): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map(V), false, 'centripetal');
  const segs = Math.max(6, Math.round(curve.getLength() / (r * pitch)));
  const radial = 6;
  const g = new THREE.TubeGeometry(curve, segs, r, radial, false);
  const pos = g.attributes.position;
  const tmp = new THREE.Vector3(), ctr = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, ctr);
    const s = 1 + 0.15 * Math.sin(i * 2.4);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      tmp.fromBufferAttribute(pos, k).sub(ctr).multiplyScalar(s).add(ctr);
      pos.setXYZ(k, tmp.x, tmp.y, tmp.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Quadratic Bezier point. */
export function qbez(a: P2, q: P2, b: P2, t: number): P2 {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * q[0] + t * t * b[0], u * u * a[1] + 2 * u * t * q[1] + t * t * b[1]];
}

/** Lathe around +Y (profile [r, y]) turned so that its axis is +X. */
export function latheX(profile: G.V2[], seg = 48, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Lathe around +Y (profile [r, y]) turned so that its axis is +Z. */
export function latheZ(profile: G.V2[], seg = 32, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Disc/extrusion in the XY plane (thickness along Z) turned so that its axis is +X, moved to x. */
export function discX(g: THREE.BufferGeometry, x: number): THREE.BufferGeometry {
  g.rotateY(Math.PI / 2);
  g.translate(x, 0, 0);
  return g;
}

/** Merge a list of geometries (indexed or not) into one non-indexed geometry without uvs. */
export function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const list = gs.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    if (n.attributes.uv) n.deleteAttribute('uv');
    if (n.attributes.uv1) n.deleteAttribute('uv1');
    return n;
  });
  return G.mergeGeometries(list)!;
}

/** Transform a copy of a geometry by position / Euler (radians) / scale. */
export function xf(g: THREE.BufferGeometry, p: P3 = [0, 0, 0], r: P3 = [0, 0, 0], s: number | P3 = 1): THREE.BufferGeometry {
  const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : V(s);
  const m = new THREE.Matrix4().compose(V(p), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2])), sc);
  const out = g.clone();
  out.applyMatrix4(m);
  return out;
}
