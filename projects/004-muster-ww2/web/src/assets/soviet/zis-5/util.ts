/**
 * Geometry helpers for the ZiS-5V (local to this asset): plates on arbitrary planes, swept
 * tubes along rounded paths, lathe helpers, merging, ground flattening and general section
 * sweeps (wings, springs, roof covering).
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

/** Panel in a plane x = const (outline in z,y). */
export const sideSlab = (outline: V2[], t: number, x: number, opts: { bevel?: number; holes?: V2[][]; corner?: number } = {}) =>
  slab(outline, t, [x, 0, 0], [0, 0, 1], [0, 1, 0], opts);
/** Panel in a plane y = const (outline in x,z). */
export const flatSlab = (outline: V2[], t: number, y: number, opts: { bevel?: number; holes?: V2[][]; corner?: number } = {}) =>
  slab(outline, t, [0, y, 0], [1, 0, 0], [0, 0, 1], opts);
/** Panel in a plane z = const (outline in x,y). */
export const frontSlab = (outline: V2[], t: number, z: number, opts: { bevel?: number; holes?: V2[][]; corner?: number } = {}) =>
  slab(outline, t, [0, 0, z], [1, 0, 0], [0, 1, 0], opts);

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

/** Closed lathe loop (radius, axial) around +X, auto-oriented so faces point outwards. */
export function latheLoopX(loop: V2[], seg = 48, creaseDeg = 40): THREE.BufferGeometry {
  let a = 0;
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i], q = loop[(i + 1) % loop.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return latheX(a < 0 ? loop.slice().reverse() : loop, seg, creaseDeg);
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

/** A frame for one sweep station: origin p, section x maps to u, section y maps to v. */
export interface Station {
  p: THREE.Vector3;
  u: THREE.Vector3;
  v: THREE.Vector3;
}

/**
 * Sweep closed 2D sections through a list of stations (all sections must have the same point
 * count; pass one section to reuse it everywhere). Ends are capped by triangulating the
 * section. Normals are creased at `creaseDeg`.
 */
export function sweep(sections: V2[] | V2[][], stations: Station[], caps = true, creaseDeg = 50): THREE.BufferGeometry {
  let secs: V2[][] = Array.isArray(sections[0][0]) ? (sections as V2[][]) : stations.map(() => sections as V2[]);
  // normalise to counter-clockwise sections
  let area = 0;
  const s0 = secs[0];
  for (let i = 0; i < s0.length; i++) {
    const p = s0[i], q = s0[(i + 1) % s0.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  if (area < 0) secs = secs.map((sc) => sc.slice().reverse());
  const n = secs[0].length;
  const m = stations.length;
  const w0 = stations[0].u.clone().cross(stations[0].v);
  const dir = stations[m - 1].p.clone().sub(stations[0].p);
  const fwd = dir.dot(w0) >= 0;
  const pos: number[] = [];
  const idx: number[] = [];
  const put = (st: Station, x: number, y: number) =>
    pos.push(st.p.x + st.u.x * x + st.v.x * y, st.p.y + st.u.y * x + st.v.y * y, st.p.z + st.u.z * x + st.v.z * y);
  for (let i = 0; i < m; i++) for (const [x, y] of secs[i]) put(stations[i], x, y);
  for (let i = 0; i < m - 1; i++) {
    for (let j = 0; j < n; j++) {
      const a = i * n + j, b = i * n + ((j + 1) % n), c = (i + 1) * n + j, d = (i + 1) * n + ((j + 1) % n);
      if (fwd) idx.push(a, b, c, b, d, c);
      else idx.push(a, c, b, b, c, d);
    }
  }
  if (caps) {
    for (const [si, isStart] of [[0, true], [m - 1, false]] as [number, boolean][]) {
      const contour = secs[si].map(([x, y]) => new THREE.Vector2(x, y));
      const tris = THREE.ShapeUtils.triangulateShape(contour, []);
      const base = pos.length / 3;
      for (const [x, y] of secs[si]) put(stations[si], x, y);
      const flip = isStart === fwd;
      for (const t of tris) {
        if (flip) idx.push(base + t[0], base + t[2], base + t[1]);
        else idx.push(base + t[0], base + t[1], base + t[2]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return G.crease(g, creaseDeg);
}

/**
 * Stations along a side-view profile (z, y) at lateral position x = 0: u = +X, v = the profile
 * normal pointing "up/out" (left of the travel direction in the z-y plane, travelling towards -z
 * gives an upward normal). Use with sections in (x, n) coordinates.
 */
export function profileStations(profile: V2[]): Station[] {
  const out: Station[] = [];
  for (let i = 0; i < profile.length; i++) {
    const a = profile[Math.max(0, i - 1)], b = profile[Math.min(profile.length - 1, i + 1)];
    const dz = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dz, dy) || 1;
    // tangent (dz, dy)/l in (z, y); normal rotated +90 deg in the (z, y) plane
    let nz = -dy / l, ny = dz / l;
    if (ny < 0 || (Math.abs(ny) < 1e-6 && nz < 0)) {
      nz = -nz;
      ny = -ny;
    }
    out.push({
      p: new THREE.Vector3(0, profile[i][1], profile[i][0]),
      u: new THREE.Vector3(1, 0, 0),
      v: new THREE.Vector3(0, ny, nz),
    });
  }
  return out;
}

/** Closed thin-sheet section from an open polyline (x, y) given thickness t (offset to -normal). */
export function sheetSection(line: V2[], t: number): V2[] {
  const inner = offset2(line, -t);
  return [...line, ...inner.reverse()];
}

/** Lathe around an arbitrary axis: profile (radius, axial) around +X then oriented to axis dir. */
export function latheAxis(profile: V2[], dir: V3, p: V3, seg = 32, creaseDeg = 40): THREE.BufferGeometry {
  const g = latheX(profile, seg, creaseDeg);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), vec(dir).normalize());
  g.applyQuaternion(q);
  g.translate(p[0], p[1], p[2]);
  return g;
}
