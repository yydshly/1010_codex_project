/**
 * Soft-goods modelling primitives for the British web gear (web pouches, carriers, felt covers).
 * Adapted from the Soviet gear toolkit (src/assets/soviet/gear/soft.ts). All sizes in metres.
 *
 *  - roundRect2D / slab: SDF building blocks for pouch bodies (2D outline with per-corner radii,
 *    extruded with rounded front / back edges and an optional variable front surface).
 *  - projectedBox: controlled-resolution mesher - a box-shaped grid (denser near its edges) is
 *    projected along rays from a centre onto a star-shaped SDF. Gives evenly tessellated,
 *    smooth-shaded bodies at a fraction of the triangles of a surface-nets mesh.
 *  - drape: a thin sheet (flap, tab, strap) that follows the surface of a body SDF at a gap, with
 *    real thickness and side walls, plus helpers to place details on it.
 *  - sweepSurface: generic closed-section sweep (sacks, rolls) from a point function.
 */
import { THREE, valueNoise3 } from '../../../core/kit';
import type { SDF } from '../../../core/geo/sdf';

export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const sstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Signed noise in [-1, 1]. */
export const snoise = (x: number, y: number, z: number, seed = 0) => (valueNoise3(x, y, z, seed) - 0.5) * 2;

/** Signed distance to a 2D rounded rectangle centred at (cx, cy) with per-corner radii. */
export function roundRect2D(
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  r: { tl: number; tr: number; bl: number; br: number },
): (x: number, y: number) => number {
  return (x, y) => {
    const px = x - cx, py = y - cy;
    const rr = px > 0 ? (py > 0 ? r.tr : r.br) : py > 0 ? r.tl : r.bl;
    const qx = Math.abs(px) - hw + rr, qy = Math.abs(py) - hh + rr;
    return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - rr;
  };
}

/**
 * Extrusion of a 2D region (d2 < 0 inside) from the back plane z0 to the front surface z1(x, y),
 * with a rounded front edge (rF) and back edge (rB).
 */
export function slab(
  d2: (x: number, y: number) => number,
  z0: number,
  z1: number | ((x: number, y: number) => number),
  rF: number,
  rB: number,
): SDF {
  return (x, y, z) => {
    const e = d2(x, y);
    const zf = typeof z1 === 'number' ? z1 : z1(x, y);
    const zc = (z0 + zf) / 2, hd = (zf - z0) / 2;
    const r = z > zc ? rF : rB;
    const dz = Math.abs(z - zc) - hd;
    const ax = e + r, az = dz + r;
    return Math.hypot(Math.max(ax, 0), Math.max(az, 0)) + Math.min(Math.max(ax, az), 0) - r;
  };
}

function gradient(f: SDF, x: number, y: number, z: number, e: number): THREE.Vector3 {
  const g = new THREE.Vector3(
    f(x + e, y, z) - f(x - e, y, z),
    f(x, y + e, z) - f(x, y - e, z),
    f(x, y, z + e) - f(x, y, z - e),
  );
  const l = g.length();
  return l > 0 ? g.multiplyScalar(1 / l) : g.set(0, 0, 1);
}

export interface ProjectedBoxOptions {
  /** Ray origin (must be inside the body and see all of its surface). */
  centre: V3;
  /** Half extents of the guide box (about the body's half size, measured from `centre`). */
  half: V3;
  /** Grid segments along X, Y, Z. */
  n: [number, number, number];
  /** Densify samples near the box edges (0 = uniform, 1 = strong). Default 0.55. */
  edge?: number;
  /** Gradient step for the normals (m). Default 0.0002. */
  eps?: number;
}

const warp = (s: number, a: number) => (1 - a) * s + a * Math.sin((Math.PI / 2) * s);

/**
 * Mesh a star-shaped SDF by projecting a box grid onto it (see file header). Indexed geometry,
 * vertices shared across the box faces, normals from the SDF gradient.
 */
export function projectedBox(f: SDF, o: ProjectedBoxOptions): THREE.BufferGeometry {
  const [cx, cy, cz] = o.centre, [hx, hy, hz] = o.half, [nx, ny, nz] = o.n;
  const a = o.edge ?? 0.55;
  const eps = o.eps ?? 2e-4;
  const axis = (n: number) => Array.from({ length: n + 1 }, (_, i) => warp((i / n) * 2 - 1, a));
  const SX = axis(nx), SY = axis(ny), SZ = axis(nz);
  const map = new Map<number, number>();
  const pos: number[] = [], nrm: number[] = [];
  const vtx = (i: number, j: number, k: number) => {
    const key = (i * (ny + 1) + j) * (nz + 1) + k;
    const hit = map.get(key);
    if (hit !== undefined) return hit;
    const dx = SX[i] * hx, dy = SY[j] * hy, dz = SZ[k] * hz;
    const L = Math.hypot(dx, dy, dz) || 1e-6;
    const ux = dx / L, uy = dy / L, uz = dz / L;
    let lo = 0, hi = L * 1.25, guard = 0;
    while (f(cx + ux * hi, cy + uy * hi, cz + uz * hi) < 0 && guard++ < 24) {
      lo = hi;
      hi *= 1.4;
    }
    for (let it = 0; it < 26; it++) {
      const m = (lo + hi) / 2;
      if (f(cx + ux * m, cy + uy * m, cz + uz * m) < 0) lo = m;
      else hi = m;
    }
    const t = (lo + hi) / 2;
    const px = cx + ux * t, py = cy + uy * t, pz = cz + uz * t;
    const g = gradient(f, px, py, pz, eps);
    const v = pos.length / 3;
    pos.push(px, py, pz);
    nrm.push(g.x, g.y, g.z);
    map.set(key, v);
    return v;
  };
  const idx: number[] = [];
  const P = (v: number) => new THREE.Vector3(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
  const quad = (v0: number, v1: number, v2: number, v3: number) => {
    const a0 = P(v0), a1 = P(v1), a2 = P(v2), a3 = P(v3);
    const n = a1.clone().sub(a0).cross(a2.clone().sub(a0)).add(a2.clone().sub(a0).cross(a3.clone().sub(a0)));
    const vn = new THREE.Vector3(nrm[v0 * 3] + nrm[v2 * 3], nrm[v0 * 3 + 1] + nrm[v2 * 3 + 1], nrm[v0 * 3 + 2] + nrm[v2 * 3 + 2]);
    const flip = n.dot(vn) < 0;
    // split along the shorter diagonal
    const d02 = a0.distanceToSquared(a2), d13 = a1.distanceToSquared(a3);
    if (d02 <= d13) {
      if (!flip) idx.push(v0, v1, v2, v0, v2, v3);
      else idx.push(v0, v2, v1, v0, v3, v2);
    } else {
      if (!flip) idx.push(v0, v1, v3, v1, v2, v3);
      else idx.push(v0, v3, v1, v1, v3, v2);
    }
  };
  // +-X faces (vary j, k)
  for (const i of [0, nx]) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) quad(vtx(i, j, k), vtx(i, j + 1, k), vtx(i, j + 1, k + 1), vtx(i, j, k + 1));
  // +-Y faces (vary i, k)
  for (const j of [0, ny]) for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) quad(vtx(i, j, k), vtx(i + 1, j, k), vtx(i + 1, j, k + 1), vtx(i, j, k + 1));
  // +-Z faces (vary i, j)
  for (const k of [0, nz]) for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) quad(vtx(i, j, k), vtx(i + 1, j, k), vtx(i + 1, j + 1, k), vtx(i, j + 1, k));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}

export interface DrapeOptions {
  /** Guide path in the YZ plane (at the sheet centre x0), from the sewn end to the free end: [y, z]. */
  path: [number, number][];
  /** Sheet centre x. Default 0. */
  x0?: number;
  /** Half width, or a function of the arc length s (0..L) - e.g. rounded corners at the free end. */
  halfWidth: number | ((s: number, L: number) => number);
  /** Gap between the body surface and the sheet's inner face. */
  gap: number;
  /** Sheet thickness. */
  t: number;
  /** Segments across the width and along the path. */
  nu?: number;
  nv?: number;
  /** Extra outward offset (m) at (u in -1..1, s, L): slack, wrinkles, stiffness at a fold. */
  lift?: (u: number, s: number, L: number) => number;
}

/** Returns the half-width function for a sheet with rounded corners (radius rc) at the free end. */
export function roundedEnd(hw: number, rc: number) {
  return (s: number, L: number) => {
    const d = L - s;
    if (d >= rc) return hw;
    const k = rc - d;
    return hw - rc + Math.sqrt(Math.max(0, rc * rc - k * k)) * 0.999 + 1e-4;
  };
}

export interface Drape {
  geometry: THREE.BufferGeometry;
  /** Length of the guide path (m). */
  L: number;
  /** Point on the OUTER face at lateral offset xo (m from x0) and arc length s, raised by `above`. */
  at(xo: number, s: number, above?: number): THREE.Vector3;
  /** Arc length where the guide path (searched from its free end backwards) crosses height y. */
  sAtY(y: number): number;
}

/**
 * A sheet of thickness t draped over the body SDF f at a gap (flap, tongue, tab). The guide path is
 * resampled by arc length; each row is spread across the width and projected onto the offset
 * surface. Outer face, inner face and edge walls, smooth-shaded per face.
 */
export function drape(f: SDF, o: DrapeOptions): Drape {
  const nu = o.nu ?? 10, nv = o.nv ?? 24, x0 = o.x0 ?? 0;
  const P = o.path.map(([y, z]) => new THREE.Vector3(x0, y, z));
  const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
  const L = curve.getLength();
  const hwF = typeof o.halfWidth === 'number' ? () => o.halfWidth as number : o.halfWidth;
  const eps = 2e-4;
  const level = (u: number, s: number) => o.gap + (o.lift ? o.lift(u, s, L) : 0);
  const onInner = (xo: number, s: number) => {
    const c = curve.getPointAt(Math.min(1, Math.max(0, s / L)));
    const hw = hwF(s, L);
    const p = new THREE.Vector3(x0 + xo, c.y, c.z);
    projectTo(f, p, level(hw > 0 ? xo / hw : 0, s), 10);
    return p;
  };
  const outer: THREE.Vector3[][] = [], inner: THREE.Vector3[][] = [];
  for (let j = 0; j <= nv; j++) {
    const s = (j / nv) * L;
    const hw = hwF(s, L);
    const ro: THREE.Vector3[] = [], ri: THREE.Vector3[] = [];
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1;
      const p = onInner(u * hw, s);
      const n = gradient(f, p.x, p.y, p.z, eps);
      ri.push(p.clone());
      ro.push(p.clone().addScaledVector(n, o.t));
    }
    outer.push(ro);
    inner.push(ri);
  }
  const parts: THREE.BufferGeometry[] = [];
  const grid = (rows: THREE.Vector3[][], flip: boolean) => {
    const pos: number[] = [], idx: number[] = [];
    const W = rows[0].length;
    for (const r of rows) for (const p of r) pos.push(p.x, p.y, p.z);
    for (let j = 0; j < rows.length - 1; j++)
      for (let i = 0; i < W - 1; i++) {
        const a = j * W + i, b = a + 1, c = a + W + 1, d = a + W;
        if (flip) idx.push(a, c, b, a, d, c);
        else idx.push(a, b, c, a, c, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  // winding: the outer face normal must agree with the SDF gradient
  const testG = grid([outer[0].slice(0, 2), outer[1].slice(0, 2)], false);
  const tn = new THREE.Vector3().fromBufferAttribute(testG.attributes.normal as THREE.BufferAttribute, 0);
  const g0 = gradient(f, inner[0][0].x, inner[0][0].y, inner[0][0].z, eps);
  const flipOuter = tn.dot(g0) < 0;
  parts.push(grid(outer, flipOuter), grid(inner, !flipOuter));
  // walls along both long edges and both ends, each wound to face away from the sheet
  const wall = (a: THREE.Vector3[], b: THREE.Vector3[], out: THREE.Vector3) => {
    const g = grid([a, b], false);
    const n = new THREE.Vector3().fromBufferAttribute(g.attributes.normal as THREE.BufferAttribute, 0);
    return n.dot(out) < 0 ? grid([a, b], true) : g;
  };
  const colO = (i: number) => outer.map((r) => r[i]), colI = (i: number) => inner.map((r) => r[i]);
  const mj = nv >> 1, mi = nu >> 1;
  parts.push(wall(colO(0), colI(0), outer[mj][0].clone().sub(outer[mj][1])));
  parts.push(wall(colO(nu), colI(nu), outer[mj][nu].clone().sub(outer[mj][nu - 1])));
  parts.push(wall(outer[0], inner[0], outer[0][mi].clone().sub(outer[1][mi])));
  parts.push(wall(outer[nv], inner[nv], outer[nv][mi].clone().sub(outer[nv - 1][mi])));
  return {
    geometry: mergeFlat(parts),
    L,
    at(xo: number, s: number, above = 0) {
      const p = onInner(xo, s);
      return p.addScaledVector(gradient(f, p.x, p.y, p.z, eps), o.t + above);
    },
    sAtY(y: number) {
      const N = 400;
      let prev = curve.getPointAt(1).y;
      for (let k = N - 1; k >= 0; k--) {
        const cy = curve.getPointAt(k / N).y;
        if ((cy - y) * (prev - y) <= 0) return (k / N) * L;
        prev = cy;
      }
      return 0;
    },
  };
}

/** Merge geometries (position + normal only) into one indexed geometry. */
export function mergeFlat(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  for (const g of gs) {
    const base = pos.length / 3;
    const p = g.attributes.position as THREE.BufferAttribute;
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nrm.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    if (g.index) {
      const a = g.index.array;
      for (let i = 0; i < a.length; i++) idx.push(a[i] + base);
    } else for (let i = 0; i < p.count; i++) idx.push(base + i);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.setIndex(idx);
  return out;
}

/**
 * Closed-section sweep: point(u, v) for u in [0, 1) around the section (wrapping) and v in [0, 1]
 * along the length. Optional poles close either end (bottom/top) with a single centre vertex.
 * Normals are computed from the mesh (outward orientation is enforced with `outward`).
 */
export function sweepSurface(
  point: (u: number, v: number) => THREE.Vector3,
  nu: number,
  nv: number,
  o: { poleStart?: THREE.Vector3; poleEnd?: THREE.Vector3; outward?: (p: THREE.Vector3, v: number) => THREE.Vector3; vs?: number[] } = {},
): THREE.BufferGeometry {
  const vs = o.vs ?? Array.from({ length: nv + 1 }, (_, j) => j / nv);
  const rows = vs.length;
  const pos: number[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < nu; i++) {
      const p = point(i / nu, vs[j]);
      pos.push(p.x, p.y, p.z);
    }
  const idx: number[] = [];
  for (let j = 0; j < rows - 1; j++)
    for (let i = 0; i < nu; i++) {
      const i1 = (i + 1) % nu;
      const a = j * nu + i, b = j * nu + i1, c = (j + 1) * nu + i1, d = (j + 1) * nu + i;
      idx.push(a, b, c, a, c, d);
    }
  let ps = -1, pe = -1;
  if (o.poleStart) {
    ps = pos.length / 3;
    pos.push(o.poleStart.x, o.poleStart.y, o.poleStart.z);
    for (let i = 0; i < nu; i++) idx.push(ps, (i + 1) % nu, i);
  }
  if (o.poleEnd) {
    pe = pos.length / 3;
    pos.push(o.poleEnd.x, o.poleEnd.y, o.poleEnd.z);
    const base = (rows - 1) * nu;
    for (let i = 0; i < nu; i++) idx.push(pe, base + i, base + ((i + 1) % nu));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (o.outward) {
    // flip if the majority of normals point inwards
    const pa = g.attributes.position as THREE.BufferAttribute, na = g.attributes.normal as THREE.BufferAttribute;
    let score = 0;
    const p = new THREE.Vector3(), n = new THREE.Vector3();
    const step = Math.max(1, Math.floor(pa.count / 500));
    for (let i = 0; i < nu * rows; i += step) {
      p.fromBufferAttribute(pa, i);
      n.fromBufferAttribute(na, i);
      const j = Math.floor(i / nu);
      score += Math.sign(n.dot(o.outward(p, vs[Math.min(rows - 1, j)])));
    }
    if (score < 0) {
      const a = g.index!.array as Uint32Array | Uint16Array;
      for (let i = 0; i < a.length; i += 3) {
        const t = a[i + 1];
        a[i + 1] = a[i + 2];
        a[i + 2] = t;
      }
      g.computeVertexNormals();
    }
  }
  return g;
}

/** Move p onto the level set f = level along the gradient (in place) and return it. */
export function projectTo(f: SDF, p: THREE.Vector3, level = 0, iters = 10): THREE.Vector3 {
  for (let it = 0; it < iters; it++) {
    const d = f(p.x, p.y, p.z) - level;
    if (Math.abs(d) < 1e-6) break;
    p.addScaledVector(gradient(f, p.x, p.y, p.z, 2e-4), -d);
  }
  return p;
}

/** Unit SDF gradient (surface normal) at p. */
export function normalAt(f: SDF, p: THREE.Vector3): THREE.Vector3 {
  return gradient(f, p.x, p.y, p.z, 2e-4);
}

/**
 * Points along a U-shaped seam on the face of a 2D rounded-rectangle outline (inset by `ins`):
 * down the left side from yTop, around the bottom, up the right side to yTop. 2D [x, y] list.
 */
export function uSeam2D(cx: number, cy: number, hw: number, hh: number, rBottom: number, ins: number, yTop: number, step = 0.004): [number, number][] {
  const w = hw - ins, h = hh - ins, r = Math.max(0.001, rBottom - ins);
  const yb = cy - h;
  const pts: [number, number][] = [];
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
  };
  const arc = (ax: number, ay: number, a0: number, a1: number) => {
    const n = Math.max(2, Math.round((Math.abs(a1 - a0) * r) / step));
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push([ax + Math.cos(a) * r, ay + Math.sin(a) * r]);
    }
  };
  line(cx - w, yTop, cx - w, yb + r);
  arc(cx - w + r, yb + r, Math.PI, 1.5 * Math.PI);
  line(cx - w + r, yb, cx + w - r, yb);
  arc(cx + w - r, yb + r, 1.5 * Math.PI, 2 * Math.PI);
  line(cx + w, yb + r, cx + w, yTop);
  pts.push([cx + w, yTop]);
  return pts;
}

/** Superellipse point (exponent e: 2 = ellipse, higher = boxier) for angle th in the XZ plane. */
export function superXZ(th: number, a: number, b: number, e: number): [number, number] {
  const c = Math.cos(th), s = Math.sin(th);
  const k = 2 / e;
  return [a * Math.sign(c) * Math.pow(Math.abs(c), k), b * Math.sign(s) * Math.pow(Math.abs(s), k)];
}

/** Evenly spaced points along a Catmull-Rom curve through `pts` (count + 1 points). */
export function resample(pts: THREE.Vector3[], count: number, closed = false): THREE.Vector3[] {
  const c = new THREE.CatmullRomCurve3(pts, closed, 'centripetal');
  return c.getSpacedPoints(count);
}
