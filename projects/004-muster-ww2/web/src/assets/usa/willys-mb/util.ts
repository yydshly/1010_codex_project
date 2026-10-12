/**
 * Geometry helpers for the Willys MB (local to this asset): plates on arbitrary planes, swept
 * tubes along rounded paths, lathe helpers, merging, ground flattening and upholstery cushions.
 */
import { THREE, G } from '../../../core/kit';

export type V2 = [number, number];
export type V3 = [number, number, number];

export const vec = (a: V3 | THREE.Vector3) => (Array.isArray(a) ? new THREE.Vector3(a[0], a[1], a[2]) : a.clone());

/** Transform a geometry in place: scale, rotate (Euler XYZ, degrees), translate. */
export function xf(g: THREE.BufferGeometry, p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: number | V3 = 1) {
  const m = new THREE.Matrix4().compose(
    vec(p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(G.deg(r[0]), G.deg(r[1]), G.deg(r[2]))),
    typeof s === 'number' ? new THREE.Vector3(s, s, s) : vec(s),
  );
  g.applyMatrix4(m);
  if (m.determinant() < 0) G.flipWinding(g);
  return g;
}

/** Apply a matrix; flips winding for mirroring matrices. */
export function xm(g: THREE.BufferGeometry, m: THREE.Matrix4) {
  g.applyMatrix4(m);
  if (m.determinant() < 0) G.flipWinding(g);
  return g;
}

/** Merge geometries (position + normal only). */
export function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const norm = gs.map((g) => {
    const h = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(h.attributes)) if (k !== 'position' && k !== 'normal') h.deleteAttribute(k);
    if (!h.attributes.normal) h.computeVertexNormals();
    return h;
  });
  return G.mergeGeometries(norm)!;
}

/** Mirror copies (X -> -X) of geometries, winding fixed. */
export function mirrored(gs: THREE.BufferGeometry[]): THREE.BufferGeometry[] {
  return gs.map((g) => xf(g.clone(), [0, 0, 0], [0, 0, 0], [-1, 1, 1]));
}

/**
 * Flat panel from a 2D outline on the plane through `o` spanned by u (outline x) and v
 * (outline y); thickness t along n = u x v, centred on the plane. Holes optional.
 */
export function slab(
  outline: V2[],
  t: number,
  o: V3,
  u: V3,
  v: V3,
  opts: { bevel?: number; holes?: V2[][]; corner?: number; curveSeg?: number } = {},
): THREE.BufferGeometry {
  const sh = G.shape(outline, opts.corner ?? 0, opts.holes ?? []);
  const g = G.extrude(sh, t, opts.bevel ?? Math.min(0.0008, t * 0.3), opts.curveSeg ?? 6, 1);
  const U = vec(u).normalize(), V = vec(v).normalize();
  const N = U.clone().cross(V).normalize();
  const m = new THREE.Matrix4().makeBasis(U, V, N).setPosition(vec(o));
  g.applyMatrix4(m);
  if (m.determinant() < 0) G.flipWinding(g);
  return g;
}

type SlabOpts = { bevel?: number; holes?: V2[][]; corner?: number; curveSeg?: number };
/** Panel in a plane x = const (outline in z,y). */
export const sideSlab = (outline: V2[], t: number, x: number, opts: SlabOpts = {}) => slab(outline, t, [x, 0, 0], [0, 0, 1], [0, 1, 0], opts);
/** Panel in a plane y = const (outline in x,z). */
export const flatSlab = (outline: V2[], t: number, y: number, opts: SlabOpts = {}) => slab(outline, t, [0, y, 0], [1, 0, 0], [0, 0, 1], opts);
/** Panel in a plane z = const (outline in x,y). */
export const frontSlab = (outline: V2[], t: number, z: number, opts: SlabOpts = {}) => slab(outline, t, [0, 0, z], [1, 0, 0], [0, 1, 0], opts);

/** Rectangle outline helper. */
export function rect(x0: number, y0: number, x1: number, y1: number): V2[] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

/** Rounded rectangle outline with per-corner radii [bl, br, tr, tl]. */
export function rrect(x0: number, y0: number, x1: number, y1: number, r: [number, number, number, number], n = 6): V2[] {
  const pts: V2[] = [];
  const corner = (cx: number, cy: number, rr: number, a0: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
  };
  const [bl, br, tr, tl] = r;
  if (bl > 0) corner(x0 + bl, y0 + bl, bl, Math.PI);
  else pts.push([x0, y0]);
  if (br > 0) corner(x1 - br, y0 + br, br, -Math.PI / 2);
  else pts.push([x1, y0]);
  if (tr > 0) corner(x1 - tr, y1 - tr, tr, 0);
  else pts.push([x1, y1]);
  if (tl > 0) corner(x0 + tl, y1 - tl, tl, Math.PI / 2);
  else pts.push([x0, y1]);
  return pts;
}

/** Circle outline (CCW). */
export function circle(cx: number, cy: number, r: number, n = 32): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** Stadium (slot) outline: vertical slot of width w between y0 and y1 (fully rounded ends). */
export function slot(cx: number, y0: number, y1: number, w: number, n = 8): V2[] {
  const r = w / 2;
  return rrect(cx - r, y0, cx + r, y1, [r - 1e-5, r - 1e-5, r - 1e-5, r - 1e-5], n);
}

/** Smooth 2D curve through control points (Catmull-Rom), n samples. */
export function spline2(ctrl: V2[], n: number): V2[] {
  const c = new THREE.SplineCurve(ctrl.map(([x, y]) => new THREE.Vector2(x, y)));
  return c.getSpacedPoints(n).map((p) => [p.x, p.y] as V2);
}

/** Round the corners of a 3D polyline (quadratic fillets); returns a dense point list. */
export function roundPath(pts: V3[], r: number, seg = 6, step = 0.05): THREE.Vector3[] {
  const P = pts.map((p) => vec(p));
  const out: THREE.Vector3[] = [];
  const pushLine = (a: THREE.Vector3, b: THREE.Vector3) => {
    const n = Math.max(1, Math.ceil(a.distanceTo(b) / step));
    for (let i = out.length ? 1 : 0; i <= n; i++) out.push(a.clone().lerp(b, i / n));
  };
  let prev = P[0];
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    const ab = b.clone().sub(a), bc = c.clone().sub(b);
    const rr = Math.min(r, ab.length() / 2, bc.length() / 2);
    const p1 = b.clone().addScaledVector(ab.normalize(), -rr);
    const p2 = b.clone().addScaledVector(bc.normalize(), rr);
    pushLine(prev, p1);
    for (let k = 1; k <= seg; k++) {
      const t = k / seg;
      const q = p1.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(b, 2 * (1 - t) * t).addScaledVector(p2, t * t);
      out.push(q);
    }
    prev = p2;
  }
  pushLine(prev, P[P.length - 1]);
  return out;
}

/** Tube through a dense list of points (no smoothing overshoot for dense input). */
export function pipe(points: (THREE.Vector3 | V3)[], r: number, radial = 8, closed = false): THREE.BufferGeometry {
  const P = points.map((p) => (Array.isArray(p) ? vec(p) : p));
  const curve = new THREE.CatmullRomCurve3(P, closed, 'centripetal', 0.5);
  return new THREE.TubeGeometry(curve, Math.max(4, Math.round(P.length * 1.5)), r, radial, closed);
}

/** Rod with rounded ends along a rounded polyline (handles, brackets, bows). */
export function bentRod(pts: V3[], r: number, bendR = 0.02, radial = 8): THREE.BufferGeometry {
  const path = roundPath(pts, bendR, 6, 0.03);
  const tube = pipe(path, r, radial);
  const cap = (p: THREE.Vector3) => {
    const s = new THREE.SphereGeometry(r, radial, Math.max(3, radial / 2));
    s.translate(p.x, p.y, p.z);
    return s;
  };
  return merge([tube, cap(path[0]), cap(path[path.length - 1])]);
}

/** Lathe profile (radius, axial) around +X. */
export function latheX(profile: V2[], seg = 48, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Lathe profile (radius, axial) around +Z. */
export function latheZ(profile: V2[], seg = 48, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Cylinder along X centred at p. */
export function cylX(r: number, len: number, p: V3, seg = 20, rEnd?: number): THREE.BufferGeometry {
  const g = G.cyl(rEnd ?? r, r, len, seg);
  g.rotateZ(-Math.PI / 2);
  g.translate(p[0], p[1], p[2]);
  return g;
}

/** Cylinder along Z centred at p. */
export function cylZ(r: number, len: number, p: V3, seg = 20): THREE.BufferGeometry {
  const g = G.cyl(r, r, len, seg);
  g.rotateX(Math.PI / 2);
  g.translate(p[0], p[1], p[2]);
  return g;
}

/** Cylinder along Y centred at p. */
export function cylY(r: number, len: number, p: V3, seg = 20): THREE.BufferGeometry {
  const g = G.cyl(r, r, len, seg);
  g.translate(p[0], p[1], p[2]);
  return g;
}

/** Rounded box centred at p with optional rotation. */
export function box(w: number, h: number, d: number, p: V3, r = 0.004, rot: V3 = [0, 0, 0]): THREE.BufferGeometry {
  return xf(G.rbox(w, h, d, r, 1), p, rot);
}

/** Every vertex below y0 is lifted onto y0 (tyre contact patch); normals there point down. */
export function clampBelow(g: THREE.BufferGeometry, y0: number) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute | undefined;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < y0) {
      p.setY(i, y0);
      if (n) {
        const x = n.getX(i) * 0.3, z = n.getZ(i) * 0.3;
        const l = Math.hypot(x, 1, z);
        n.setXYZ(i, x / l, -1 / l, z / l);
      }
    }
  }
  p.needsUpdate = true;
  if (n) n.needsUpdate = true;
  return g;
}

/** Points on an arc (2D). */
export function arc2(cx: number, cy: number, r: number, a0: number, a1: number, n: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

/** Offset a 2D polyline sideways by d (to the left of the travel direction). */
export function offset2(pts: V2[], d: number): V2[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / l) * d, p[1] + (dx / l) * d] as V2;
  });
}

/** Closed band outline of thickness t along an open 2D polyline (sheet-metal profile). */
export function band(path: V2[], t: number): V2[] {
  return [...path, ...offset2(path, -t).reverse()];
}

/** Resample a 2D polyline so no segment is longer than `step`. */
export function densify2(pts: V2[], step: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Matrix mapping local (x, y, z) onto a frame with origin o and axes X, Y (Z = X x Y). */
export function frame(o: V3 | THREE.Vector3, X: V3 | THREE.Vector3, Y: V3 | THREE.Vector3): THREE.Matrix4 {
  const x = vec(X).normalize();
  const y0 = vec(Y);
  const z = x.clone().cross(y0).normalize();
  const y = z.clone().cross(x).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(vec(o));
}

/**
 * Upholstered cushion: rounded slab (w along X, h thickness along Y, d along Z) with a crowned
 * top, a soft border seam just inside the edge and optional shallow quilting across X.
 */
export function cushionGeo(
  w: number,
  h: number,
  d: number,
  o: { r?: number; crown?: number; quilt?: number; pitch?: number; border?: number; seg?: number; sag?: number } = {},
): THREE.BufferGeometry {
  const seg = o.seg ?? 0.016;
  const sx = Math.max(8, Math.round(w / seg)), sz = Math.max(8, Math.round(d / seg)), sy = 4;
  const src = new THREE.BoxGeometry(w, h, d, sx, sy, sz);
  src.deleteAttribute('uv');
  src.deleteAttribute('normal');
  const g = G.mergeVertices(src, 1e-6);
  const r = Math.min(o.r ?? 0.03, h * 0.49);
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  const crown = o.crown ?? 0.012, quilt = o.quilt ?? 0, border = o.border ?? 0.04, pitch = o.pitch ?? 0.1, sag = o.sag ?? 0;
  const nP = Math.max(1, Math.round((d - 2 * border) / pitch));
  const pd = (d - 2 * border) / nP;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(THREE.MathUtils.clamp(v.x, -hw, hw), THREE.MathUtils.clamp(v.y, -hh, hh), THREE.MathUtils.clamp(v.z, -hd, hd));
    const dl = v.clone().sub(c);
    if (dl.lengthSq() > 1e-14) dl.normalize().multiplyScalar(r);
    v.copy(c).add(dl);
    const top = THREE.MathUtils.clamp(v.y / (h / 2), 0, 1) ** 3;
    if (top > 0) {
      const ux = v.x / (w / 2), uz = v.z / (d / 2);
      v.y += crown * Math.max(0, 1 - ux * ux) * Math.max(0, 1 - uz * uz) * top;
      // a slight hollow where the occupant sat
      v.y -= sag * Math.exp(-((ux / 0.55) ** 2) - (((uz + 0.1) / 0.6) ** 2)) * top;
      const ex = THREE.MathUtils.clamp((w / 2 - border - Math.abs(v.x)) / 0.02 + 1, 0, 1);
      const ez = THREE.MathUtils.clamp((d / 2 - border * 0.8 - Math.abs(v.z)) / 0.02 + 1, 0, 1);
      if (quilt > 0) {
        const ph = (v.z + d / 2 - border) / pd;
        const roll = Math.abs(Math.sin(Math.PI * ph)) ** 0.5;
        v.y -= quilt * (1 - roll) * ex * ez * top;
      }
      const bx = Math.abs(Math.abs(v.x) - (w / 2 - border)), bz = Math.abs(Math.abs(v.z) - (d / 2 - border * 0.8));
      const seam = Math.max(Math.exp(-((bx / 0.005) ** 2)) * ez, Math.exp(-((bz / 0.005) ** 2)) * ex);
      v.y -= 0.004 * seam * top;
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
