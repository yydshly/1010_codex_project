/** Small modelling helpers for the M13/40 (local to this asset). */
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

/** Side-view (z, y) outline extruded across X between x0 and x1 (solid body). */
export function sideBody(outline: P2[], x0: number, x1: number, bevel = 0.008): THREE.BufferGeometry {
  const g = G.plate(outline, x1 - x0, 'zy', bevel);
  g.translate((x0 + x1) / 2, 0, 0);
  return g;
}

/**
 * Closed prismoid between two horizontal rings (same point count, CCW seen from above in (x, z)),
 * bottom ring at y0 and top ring at y1. Flat shaded (creased). Used for the turret body.
 */
export function prismoid(bottom: P2[], y0: number, top: P2[], y1: number): THREE.BufferGeometry {
  const n = bottom.length;
  const pos: number[] = [];
  const tri = (a: P3, b: P3, c: P3) => pos.push(...a, ...b, ...c);
  const B = bottom.map(([x, z]): P3 => [x, y0, z]);
  const T = top.map(([x, z]): P3 => [x, y1, z]);
  // orientation: ensure CCW seen from +Y (x right, -z up) -> use signed area in (x, -z)
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = bottom[i], b = bottom[(i + 1) % n];
    area += a[0] * -b[1] - b[0] * -a[1];
  }
  const ccw = area > 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (ccw) {
      tri(B[i], B[j], T[j]);
      tri(B[i], T[j], T[i]);
    } else {
      tri(B[i], T[j], B[j]);
      tri(B[i], T[i], T[j]);
    }
  }
  for (let i = 1; i < n - 1; i++) {
    if (ccw) {
      tri(T[0], T[i], T[i + 1]);
      tri(B[0], B[i + 1], B[i]);
    } else {
      tri(T[0], T[i + 1], T[i]);
      tri(B[0], B[i], B[i + 1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  G.ensureOutward(g);
  return g;
}

/** Lathe profile [r, axial] around +Y turned so the axis is +X (axial + -> +X). */
export function latheX(profile: G.V2[], seg = 32, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Lathe profile [r, axial] around +Y turned so the axis is +Z (axial + -> +Z). */
export function latheZ(profile: G.V2[], seg = 32, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Cylinder along X centred at x. */
export function cylX(r: number, len: number, seg = 16, x = 0): THREE.BufferGeometry {
  const g = G.cyl(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  g.translate(x, 0, 0);
  return g;
}

/** Cylinder along Z centred at z. */
export function cylZ(r: number, len: number, seg = 16, z = 0): THREE.BufferGeometry {
  const g = G.cyl(r, r, len, seg);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, z);
  return g;
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
  return G.rbox(w, h, d, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4), 1);
}

let boltGeo: THREE.BufferGeometry | null = null;
/** Round-headed armour bolt (low poly), +Y up, base at y = 0. */
export function bolt(r = 0.011, h = 0.007): THREE.BufferGeometry {
  if (!boltGeo) {
    boltGeo = G.lathe(
      [
        [0.0, 0.0],
        [1.0, 0.0],
        [1.0, 0.3],
        [0.75, 0.75],
        [0.0, 1.0],
      ],
      8,
      50,
    );
  }
  const g = boltGeo.clone();
  g.scale(r, h, r);
  return g;
}

let nutGeo: THREE.BufferGeometry | null = null;
/** Hex nut, +Y up, base at y = 0. */
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

export type Placed = { p: THREE.Vector3; n: THREE.Vector3; spin: number };

/** Placements along a segment with a shared normal (for G.scatter). */
export function row(a: P3, b: P3, n: P3, count: number): Placed[] {
  const N = V(n).normalize();
  return G.along(a, b, count).map((p, i) => ({ p, n: N.clone(), spin: i * 0.9 }));
}

/** Bolt ring around the X axis at axial position x (for G.scatter). */
export function ringX(r: number, n: number, x: number, dir: 1 | -1 = 1, phase = 0): Placed[] {
  const out: Placed[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    out.push({ p: new THREE.Vector3(x, Math.sin(a) * r, Math.cos(a) * r), n: new THREE.Vector3(dir, 0, 0), spin: a });
  }
  return out;
}

/** Quadratic Bezier point. */
export function qbez(a: P2, q: P2, b: P2, t: number): P2 {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * q[0] + t * t * b[0], u * u * a[1] + 2 * u * t * q[1] + t * t * b[1]];
}

/** Orient an object so its local +Z faces `n` (local +Y stays as close to world +Y as possible). */
export function faceTo<T extends THREE.Object3D>(o: T, p: P3, n: P3): T {
  const N = V(n).normalize();
  const up = Math.abs(N.y) > 0.95 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const X = new THREE.Vector3().crossVectors(up, N).normalize();
  const Y = new THREE.Vector3().crossVectors(N, X);
  o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, N));
  o.position.set(p[0], p[1], p[2]);
  return o;
}

/**
 * Side-view (z, y) outline extruded across X, with the half width varying linearly with height
 * (w0 at y0, w1 at y1): sloped side plates.
 */
export function taperBody(outline: P2[], w0: number, w1: number, y0: number, y1: number, bevel = 0.008): THREE.BufferGeometry {
  const g = G.plate(outline, 2, 'zy', bevel);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.max(0, (p.getY(i) - y0) / (y1 - y0)));
    p.setX(i, p.getX(i) * (w0 + (w1 - w0) * t));
  }
  return G.crease(g, 40);
}

/** Bent sheet: a (z, y) polyline offset downwards by t, extruded across X from x0 to x1. */
export function bentSheet(path: P2[], t: number, x0: number, x1: number, bevel = 0.002): THREE.BufferGeometry {
  const top = path;
  const bot: P2[] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const dz = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dz, dy) || 1;
    // normal pointing "down/outward" from the travel direction
    let nz = dy / L, ny = -dz / L;
    if (ny > 0) {
      nz = -nz;
      ny = -ny;
    }
    bot.push([path[i][0] + nz * t, path[i][1] + ny * t]);
  }
  return sideBody([...top, ...bot.reverse()], x0, x1, bevel);
}
