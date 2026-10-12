/** Small modelling helpers for the Universal Carrier (kept local to this asset). */
import { THREE, G, part, group } from '../../../core/kit';

export type P2 = [number, number];
export type P3 = [number, number, number];
export const D = Math.PI / 180;
const V = (p: P3) => new THREE.Vector3(p[0], p[1], p[2]);

/**
 * Geometry collector: parts are pushed per material and merged once at the end (fast to build; the
 * baker would merge them anyway).
 */
export class Bucket {
  private map = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(mat: THREE.Material, g: THREE.BufferGeometry, m?: THREE.Matrix4): THREE.BufferGeometry {
    let a = this.map.get(mat);
    if (!a) this.map.set(mat, (a = []));
    const gg = g.clone();
    for (const k of Object.keys(gg.attributes)) if (k !== 'position' && k !== 'normal') gg.deleteAttribute(k);
    gg.morphAttributes = {};
    if (!gg.attributes.normal) gg.computeVertexNormals();
    if (!gg.index) {
      const n = gg.attributes.position.count;
      const idx = new Uint32Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      gg.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    if (m) {
      gg.applyMatrix4(m);
      if (m.determinant() < 0) {
        const ia = gg.index!.array as Uint32Array | Uint16Array;
        for (let i = 0; i < ia.length; i += 3) {
          const t = ia[i + 1];
          ia[i + 1] = ia[i + 2];
          ia[i + 2] = t;
        }
      }
    }
    a.push(gg);
    return gg;
  }
  /** Add a geometry placed with a position (+ optional Euler degrees XYZ). */
  put(mat: THREE.Material, g: THREE.BufferGeometry, p: P3 = [0, 0, 0], r?: P3, s?: P3): void {
    const m = new THREE.Matrix4().compose(
      V(p),
      new THREE.Quaternion().setFromEuler(new THREE.Euler((r?.[0] ?? 0) * D, (r?.[1] ?? 0) * D, (r?.[2] ?? 0) * D)),
      s ? V(s) : new THREE.Vector3(1, 1, 1),
    );
    this.add(mat, g, m);
  }
  /** Meshes (one per material). */
  meshes(): THREE.Group {
    const out: THREE.Object3D[] = [];
    for (const [mat, list] of this.map) {
      if (!list.length) continue;
      const g = G.mergeGeometries(list, false);
      if (!g) throw new Error('universal-carrier: merge failed for ' + mat.name);
      out.push(part(g, mat));
    }
    return group(out);
  }
}

/**
 * Planar slab: `outer` is the OUTER face polygon (3D, coplanar), `outward` its outward normal.
 * Extruded inward by `t` with a bevel on its edges. Optional holes (3D points on the same plane).
 */
export function slab(outer: P3[], t: number, outward: P3, bevel = 0.003, corner = 0, holes: P3[][] = []): THREE.BufferGeometry {
  const n = V(outward).normalize();
  const o = V(outer[0]);
  const e = V(outer[1]).sub(o);
  const u = e.sub(n.clone().multiplyScalar(e.dot(n))).normalize();
  const v = new THREE.Vector3().crossVectors(n, u);
  const to2 = (p: P3): P2 => {
    const d = V(p).sub(o);
    return [d.dot(u), d.dot(v)];
  };
  let pts: P2[] = outer.map(to2);
  if (THREE.ShapeUtils.isClockWise(pts.map(([x, y]) => new THREE.Vector2(x, y)))) pts = pts.reverse();
  const hs = holes.map((h) => {
    let hp = h.map(to2);
    if (!THREE.ShapeUtils.isClockWise(hp.map(([x, y]) => new THREE.Vector2(x, y)))) hp = hp.reverse();
    return hp;
  });
  const g = G.extrude(G.shape(pts, corner, hs), t, bevel, 6, 1);
  g.translate(0, 0, -t / 2);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(u, v, n).setPosition(o));
  return g;
}

/**
 * Light prism: outline in 2D, thickness t, plane 'xy' (thickness along Z), 'zy' (outline x -> Z,
 * thickness along X) or 'xz' (outline y -> Z, thickness along Y). Centred on the thickness axis.
 */
export function prism(outline: P2[], t: number, plane: 'xy' | 'zy' | 'xz' = 'zy', bevel = 0.002, holes: P2[][] = []): THREE.BufferGeometry {
  const g = G.extrude(G.shape(outline, 0, holes), t, bevel, 1, 1);
  if (plane === 'xy') return g;
  const m = new THREE.Matrix4();
  if (plane === 'zy') m.set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
  else m.set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  g.applyMatrix4(m);
  G.flipWinding(g);
  return g;
}

/** Rounded box with a single rounding segment. */
export function rb(w: number, h: number, d: number, r = 0.004): THREE.BufferGeometry {
  return G.rbox(w, h, d, r, 1);
}

/** Lathe profile [r, axial] around +Y turned so the axis is +X. */
export function latheX(profile: P2[], seg = 32, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Lathe profile [r, axial] around +Z (axial + -> +Z). */
export function latheZ(profile: P2[], seg = 32, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Cylinder with its axis along X, centred. */
export function cylX(r: number, len: number, seg = 16, r2?: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r2 ?? r, r, len, seg, 1);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Cylinder with its axis along Z, centred. */
export function cylZ(r: number, len: number, seg = 16, r2?: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r2 ?? r, r, len, seg, 1);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Bolt ring placements around the X axis at axial position x. */
export function boltRingX(r: number, n: number, x: number, dir: 1 | -1 = 1, phase = 0): { p: THREE.Vector3; n: THREE.Vector3 }[] {
  const out: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    out.push({ p: new THREE.Vector3(x, Math.sin(a) * r, Math.cos(a) * r), n: new THREE.Vector3(dir, 0, 0) });
  }
  return out;
}

let nutGeo: THREE.BufferGeometry | null = null;
/** Plain hex nut / bolt head, +Y up, base at y = 0. */
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

let rivetGeo: THREE.BufferGeometry | null = null;
/** Low dome rivet head (+Y up, base at y = 0), ~20 tris. */
export function rivet(r = 0.007): THREE.BufferGeometry {
  if (!rivetGeo) {
    const g = new THREE.SphereGeometry(1, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, 0.5, 1);
    rivetGeo = g;
  }
  const g = rivetGeo.clone();
  g.scale(r, r, r);
  return g;
}

/** Row of rivets from a to b on a surface with normal n. */
export function rivetRow(a: P3, b: P3, count: number, n: P3, r = 0.0065): THREE.BufferGeometry {
  return G.scatter(rivet(r), G.along(a, b, count).map((p) => ({ p, n })));
}

/** Convex outline (CCW) around several circles (cast levers, brackets). */
export function hullOutline(circles: { c: P2; r: number }[], seg = 10): P2[] {
  const pts: P2[] = [];
  for (const k of circles)
    for (let i = 0; i < seg * 2; i++) {
      const a = (i / (seg * 2)) * Math.PI * 2;
      pts.push([k.c[0] + Math.cos(a) * k.r, k.c[1] + Math.sin(a) * k.r]);
    }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P2[] = [], upper: P2[] = [];
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

/** Circle points; clockwise when cw (for extrude holes). */
export function circlePts(r: number, n: number, cx = 0, cy = 0, cw = false): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((cw ? -i : i) / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** Rounded rectangle outline (CCW), few points per corner. */
export function rrect(x0: number, y0: number, x1: number, y1: number, r: number, per = 3): P2[] {
  const pts: P2[] = [];
  const c: [number, number, number][] = [
    [x1 - r, y0 + r, -90],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, 90],
    [x0 + r, y0 + r, 180],
  ];
  for (const [cx, cy, a0] of c)
    for (let k = 0; k <= per; k++) {
      const a = (a0 + (90 * k) / per) * D;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  return pts;
}

/** Merge geometries (indexed or not). */
export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return G.mergeGeometries(
    list.map((p) => {
      const g = p.index ? p.toNonIndexed() : p;
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      return g;
    }),
  )!;
}

/** Pipe/rod through points with small fillets at the bends. */
export function bentRod(points: P3[], r: number, fillet = 0.02, seg = 8): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const P = points.map(V);
  for (let i = 0; i < P.length; i++) {
    if (i === 0 || i === P.length - 1) {
      pts.push(P[i]);
      continue;
    }
    const a = P[i - 1], b = P[i], c = P[i + 1];
    const d1 = b.clone().sub(a), d2 = c.clone().sub(b);
    const f1 = Math.min(fillet, d1.length() * 0.45), f2 = Math.min(fillet, d2.length() * 0.45);
    pts.push(b.clone().addScaledVector(d1.normalize(), -f1));
    pts.push(b.clone().addScaledVector(d1, -f1 * 0.3).addScaledVector(d2.clone().normalize(), f2 * 0.3));
    pts.push(b.clone().addScaledVector(d2.normalize(), f2));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  return new THREE.TubeGeometry(curve, Math.max(12, pts.length * 6), r, seg, false);
}

/** Helical coil spring along +Y from y = 0 to len (wire radius rw, coil radius rc). */
export function coil(len: number, rc: number, rw: number, turns: number, seg = 7): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const n = Math.round(turns * 14);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    // closed, ground ends: the pitch flattens over the first and last half turn
    const ends = 0.5 / turns;
    let y: number;
    if (t < ends) y = (t / ends) * (rw * 2) ;
    else if (t > 1 - ends) y = len - ((1 - t) / ends) * (rw * 2);
    else y = rw * 2 + ((t - ends) / (1 - 2 * ends)) * (len - rw * 4);
    pts.push(new THREE.Vector3(Math.cos(a) * rc, y, Math.sin(a) * rc));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  return new THREE.TubeGeometry(curve, n * 2, rw, seg, false);
}

/** Matrix placing a +Y-up part so +Y follows `dir` from point `a`. */
export function alongDir(a: P3, dir: P3): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), V(dir).normalize());
  return new THREE.Matrix4().compose(V(a), q, new THREE.Vector3(1, 1, 1));
}

/** Local frame on a surface: +X along u, +Y along the normal n, origin o. */
export function surfaceFrame(o: P3, u: P3, n: P3): THREE.Matrix4 {
  const N = V(n).normalize();
  const U = V(u).sub(N.clone().multiplyScalar(V(u).dot(N))).normalize();
  const W = new THREE.Vector3().crossVectors(U, N);
  return new THREE.Matrix4().makeBasis(U, N, W).setPosition(V(o));
}
