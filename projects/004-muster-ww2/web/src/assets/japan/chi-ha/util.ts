/** Small modelling helpers for the Chi-Ha (all local to this asset). */
import { THREE, G } from '../../../core/kit';

export type P3 = [number, number, number];
export type P2 = [number, number];
const V = (p: P3) => new THREE.Vector3(p[0], p[1], p[2]);
export const D = Math.PI / 180;

/**
 * Planar armour slab. `outer` is the OUTER face polygon (3D, coplanar), `outward` its outward normal.
 * The plate is extruded inward by `t`, with a bevel on its edges.
 */
export function slab(outer: P3[], t: number, outward: P3, bevel = 0.005, corner = 0): THREE.BufferGeometry {
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
 * Object modelled "lying on the ground" (+Y up, standing on y = 0) placed on a plate: local +Y
 * along the plate normal n, local +X along the in-plane axis u, origin at o.
 */
export function onPlate(obj: THREE.Object3D, o: P3, u: P3, n: P3): THREE.Object3D {
  const N = V(n).normalize();
  const U = V(u).sub(N.clone().multiplyScalar(V(u).dot(N))).normalize();
  const W = new THREE.Vector3().crossVectors(U, N);
  const m = new THREE.Matrix4().makeBasis(U, N, W).setPosition(V(o));
  const g = new THREE.Group();
  g.add(obj);
  m.decompose(g.position, g.quaternion, g.scale);
  return g;
}

/** Lathe profile [r, axial] around +Y turned so the axis is +X (axial + -> +X). */
export function latheX(profile: G.V2[], seg = 36, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Lathe profile [r, axial] around +Z (axial + -> +Z). */
export function latheZ(profile: G.V2[], seg = 36, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Disc geometry in the XY plane turned so its axis is +X, then moved to axial position x. */
export function discX(g: THREE.BufferGeometry, x: number): THREE.BufferGeometry {
  g.rotateY(Math.PI / 2);
  g.translate(x, 0, 0);
  return g;
}

/** Flat annulus disc with circular holes, lying in the XY plane (thickness along Z, centred). */
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

/** Merge an array of geometries (indexed or not, uv attributes dropped). */
export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return G.mergeGeometries(
    list.map((p) => {
      const g = p.index ? p.toNonIndexed() : p;
      if (g.attributes.uv) g.deleteAttribute('uv');
      if (g.attributes.uv1) g.deleteAttribute('uv1');
      return g;
    }),
  )!;
}

/** Rounded box with a single rounding segment (cheap). */
export function rb(w: number, h: number, d: number, r = 0.006): THREE.BufferGeometry {
  return G.rbox(w, h, d, r, 1);
}

type Pl = { p: THREE.Vector3; n: THREE.Vector3; spin: number };

/** Placements along a segment with a shared normal (for G.scatter). */
export function row(a: P3, b: P3, n: P3, count: number): Pl[] {
  const N = V(n).normalize();
  return G.along(a, b, count).map((p, i) => ({ p, n: N.clone(), spin: i * 0.9 }));
}

/** Bolt-ring placements around the X axis at axial position x (for G.scatter). */
export function ringX(r: number, n: number, x: number, dir: 1 | -1 = 1, phase = 0): Pl[] {
  const out: Pl[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    out.push({ p: new THREE.Vector3(x, Math.sin(a) * r, Math.cos(a) * r), n: new THREE.Vector3(dir, 0, 0), spin: a });
  }
  return out;
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

let rivetGeo: THREE.BufferGeometry | null = null;
/** Round rivet head (+Y up, base at y = 0), shared geometry. */
export function rivet(): THREE.BufferGeometry {
  if (!rivetGeo) {
    const g = new THREE.SphereGeometry(0.0095, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, 0.6, 1);
    rivetGeo = g;
  }
  return rivetGeo;
}
