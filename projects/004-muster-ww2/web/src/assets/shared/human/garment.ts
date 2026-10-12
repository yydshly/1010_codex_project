/**
 * Garment toolkit: generic building blocks for clothing modelled as signed distance fields.
 *
 * CLOTH LAYER. A garment part is described by its INNER surface (the body plus ease), an SDF that
 * is negative inside. `clothLayer(inner, t, openings)` returns the solid cloth: the outer surface
 * is `inner - t`; each Opening removes material on one side of a cut (hem, cuff, collar hole) and
 * hollows the garment for a short depth behind the cut, so the edge shows the real cloth thickness
 * while the (invisible) inside elsewhere stays solid and costs no triangles.
 *
 * FOLDS. Folds displace the inner surface (negative = cloth moves outward) before the shell is
 * taken, so thickness is preserved. `ridges()` gives coherent, restrained fold patterns.
 *
 * SURFACE CHARTS. `surfaceChart(f, frame, ...)` samples the surface of any SDF as a height field
 * over a local tangent frame. Patches (pockets, flaps, plackets, shoulder straps, collar tabs)
 * are thin layers over the chart: they conform to the cloth (folds included), have crisp edges
 * with real thickness, and are cheap to mesh at 2.5-3 mm cells.
 *
 * All distances are metres, all fields world space unless stated.
 */
import * as THREE from 'three';
import { clamp, smax, smin, sstep, raycast, gradient, type Frame, type SDF } from './sdfx';
// (edge bands below use THREE vectors)

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------ layers & openings

export interface Opening {
  /** > 0 on the side that is cut away. */
  cut: SDF;
  /** If set: when cut < -reach the opening has no effect (skipped). */
  reach?: number;
  /** < 0 in the hollow region just behind the cut (inside the garment only). */
  cavity: SDF;
}

/** Half-space cut: removes points with (p - o).n > 0. */
export function planeCut(o: THREE.Vector3, n: THREE.Vector3): SDF {
  const nn = n.clone().normalize();
  const ox = o.x, oy = o.y, oz = o.z, nx = nn.x, ny = nn.y, nz = nn.z;
  return (x, y, z) => (x - ox) * nx + (y - oy) * ny + (z - oz) * nz;
}

/**
 * Opening at a plane: material beyond the plane (along n) is removed; the garment is hollow
 * (following `inner`) for `depth` behind the plane. `inner` may be the local part only (e.g. the
 * sleeve) so the hollow never reaches unrelated parts of the garment.
 */
export function planeOpening(o: THREE.Vector3, n: THREE.Vector3, depth: number, inner: SDF): Opening {
  const cut = planeCut(o, n);
  return {
    cut,
    reach: depth + 0.025,
    cavity: (x, y, z) => {
      const c = cut(x, y, z);
      const slab = -c - depth; // < 0 within depth behind the plane
      if (slab > 0.02) return slab;
      const a = inner(x, y, z);
      return a > slab ? a : slab;
    },
  };
}

/** Opening defined by an arbitrary cut field (e.g. a tube around the neck); no hollow. */
export function fieldOpening(cut: SDF): Opening {
  return { cut, cavity: () => 1 };
}

/**
 * Solid cloth from an inner surface: outer = inner - t, minus cuts, hollowed behind openings.
 * `band`: beyond this distance from the inner surface openings are not evaluated (speed).
 */
export function clothLayer(inner: SDF, t: number, openings: Opening[] = [], edgeRound = 0.0012): SDF {
  const n = openings.length;
  return (x, y, z) => {
    const a = inner(x, y, z);
    let d = a - t;
    // cuts and hollows only ever increase d, so far outside d is a safe (under)estimate
    if (d > 0.03) return d;
    for (let i = 0; i < n; i++) {
      const o = openings[i];
      const c = o.cut(x, y, z);
      // far on the kept side of a plane opening: neither the cut nor its hollow can matter
      if (o.reach !== undefined && c < -o.reach) continue;
      d = edgeRound > 0 ? smax(d, c, edgeRound) : Math.max(d, c);
      if (a < 0.004) {
        const cv = o.cavity(x, y, z);
        if (cv < 0.01) d = edgeRound > 0 ? smax(d, -cv, edgeRound) : Math.max(d, -cv);
      }
    }
    return d;
  };
}

// ------------------------------------------------------------------ edges (hems, cuffs) with real thickness

/**
 * A garment edge (hem, cuff, trouser bottom). Material beyond the plane (p - o).n > 0 is cut
 * away. Near the edge the garment is a HOLLOW shell of real thickness; that shell is thinner than
 * a coarse mesh cell, so it is meshed separately at a fine cell as an `edgeBand` (a turned-up hem:
 * slightly raised, like the real folded hem), while the main garment (`garmentBody`, meshed coarse)
 * is solid and stops just inside the band. Result: crisp, clean edges with visible thickness and no
 * ragged holes, at the cost of one small extra mesh per edge.
 */
export interface EdgeSpec {
  /** A point on the edge plane and the cut normal (pointing to the side that is removed). */
  o: THREE.Vector3;
  n: THREE.Vector3;
  /** Inner surface of the garment part near this edge (negative inside), e.g. the sleeve. */
  inner: SDF;
  /** Cloth thickness of the part (m). */
  t: number;
  /** Height of the band measured back from the edge (m), e.g. 0.028. */
  height: number;
  /** Extra thickness of the band over the main cloth (turned-up hem), default 0.0009. */
  raise?: number;
  /** Limit where the cut applies (negative inside), e.g. a capsule around a cuff. Default: everywhere. */
  region?: SDF;
  /** Rounding of the free edge (m), default 0.0012. */
  round?: number;
}

const edgePlane = (e: EdgeSpec) => {
  const n = e.n.clone().normalize();
  const ox = e.o.x, oy = e.o.y, oz = e.o.z, nx = n.x, ny = n.y, nz = n.z;
  return (x: number, y: number, z: number) => (x - ox) * nx + (y - oy) * ny + (z - oz) * nz;
};

/**
 * Solid garment cloth (outer surface = inner - t) for the coarse mesh: stopped `height - overlap`
 * before each edge (inside the band, hidden under it), minus arbitrary `cuts` (> 0 = removed,
 * e.g. the neck hole). Sharp stops: they are hidden under the raised bands.
 */
export function garmentBody(inner: SDF, t: number, edges: EdgeSpec[] = [], cuts: SDF[] = [], overlap = 0.009): SDF {
  const planes = edges.map(edgePlane);
  const n = edges.length, nc = cuts.length;
  return (x, y, z) => {
    let d = inner(x, y, z) - t;
    if (d > 0.03) return d;
    for (let i = 0; i < n; i++) {
      const e = edges[i];
      let c = planes[i](x, y, z) + e.height - overlap;
      if (c < -0.05) continue;
      if (e.region) { const r = -e.region(x, y, z); if (r < c) c = r; }
      if (c > d) d = c;
    }
    for (let i = 0; i < nc; i++) d = smax(d, cuts[i](x, y, z), 0.0015);
    return d;
  };
}

/** The hollow edge band of real thickness for one edge (mesh it at ~2.5 mm). */
export function edgeBand(e: EdgeSpec): SDF {
  const plane = edgePlane(e);
  const raise = e.raise ?? 0.0009;
  const tt = e.t + raise;
  const round = e.round ?? 0.0012;
  return (x, y, z) => {
    const c = plane(x, y, z);
    // outside the slab: a safe lower bound
    if (c > 0.02 || c < -e.height - 0.02) return Math.max(c, -c - e.height);
    const a = e.inner(x, y, z);
    let d = Math.max(a - tt, -a); // the shell between the inner surface and the (raised) outer one
    d = smax(d, c, round); // free edge, rounded
    d = smax(d, -(c + e.height), round * 0.6); // top of the band (small step on the garment)
    if (e.region) d = Math.max(d, e.region(x, y, z));
    return d;
  };
}

/** Offset (grow) a field: positive `d` makes it thicker. */
export const grow = (f: SDF, d: number): SDF => (x, y, z) => f(x, y, z) - d;

/** Displace a field only near its surface. `disp` < 0 moves the surface outward. */
export function displaced(f: SDF, disp: SDF, band = 0.03): SDF {
  return (x, y, z) => {
    const d = f(x, y, z);
    if (d > band || d < -band) return d;
    return d + disp(x, y, z);
  };
}

// ------------------------------------------------------------------ fold patterns

/**
 * Soft cloth ridges: returns 0..1 with `count` ridges per unit of `u`, sharpened by `sharp`
 * (1 = sine, 2-3 = narrower crests with wide shallow valleys), phase-jittered by `seed`
 * so the pattern is irregular but coherent (no noise).
 */
export function ridges(u: number, count: number, sharp = 2, seed = 0): number {
  const ph = u * count * Math.PI * 2 + Math.sin(u * 2.3 + seed) * 1.3 + Math.sin(u * 5.1 + seed * 1.7) * 0.6;
  const s = 0.5 + 0.5 * Math.sin(ph);
  return Math.pow(s, sharp);
}

/** Gaussian bump. */
export const bump = (x: number, c: number, w: number) => {
  const t = (x - c) / w;
  return Math.exp(-t * t);
};

// ------------------------------------------------------------------ surface charts & patches

/** Local height field of an SDF surface over a tangent frame (x = u, y = v, z = normal). */
export interface SurfaceChart {
  frame: Frame;
  /** Height of the surface along frame.z at (u, v) (bilinear). */
  h(u: number, v: number): number;
  /** Approximate SDF of the surface (positive outside = along +z). */
  sdf: SDF;
  /** World point on the surface at (u, v), lifted by `lift` along the local normal. */
  point(u: number, v: number, lift?: number): THREE.Vector3;
  /** Local surface normal (world) at (u, v). */
  normal(u: number, v: number): THREE.Vector3;
  hu: number;
  hv: number;
}

/**
 * Sample the surface of `f` around `frame` (origin near the surface, z = outward normal) on a
 * grid of (2*hu) x (2*hv) metres. Rays start `reach` outside and march inward along -z.
 */
export function surfaceChart(f: SDF, frame: Frame, hu: number, hv: number, res = 0.004, reach = 0.06): SurfaceChart {
  const nu = Math.max(2, Math.ceil((2 * hu) / res) + 1), nv = Math.max(2, Math.ceil((2 * hv) / res) + 1);
  const du = (2 * hu) / (nu - 1), dv = (2 * hv) / (nv - 1);
  const H = new Float32Array(nu * nv);
  const o = frame.o, X = frame.x, Y = frame.y, Z = frame.z;
  const dir = Z.clone().negate();
  const p = V();
  const ox0 = o.x, oy0 = o.y, oz0 = o.z;
  // coherent sampling: Newton steps along z from the neighbouring sample's height (a few field
  // evaluations per sample); a full raycast only to seed each row or when the steps do not settle
  const settle = (u: number, v: number, h0: number): number => {
    let h = h0;
    const bx = ox0 + X.x * u + Y.x * v, by = oy0 + X.y * u + Y.y * v, bz = oz0 + X.z * u + Y.z * v;
    for (let k = 0; k < 6; k++) {
      const d = f(bx + Z.x * h, by + Z.y * h, bz + Z.z * h);
      if (d < 2e-5 && d > -2e-5) return h;
      h -= d > 0.01 ? 0.01 : d < -0.01 ? -0.01 : d;
    }
    const d = f(bx + Z.x * h, by + Z.y * h, bz + Z.z * h);
    return d < 0.0005 && d > -0.0005 ? h : NaN;
  };
  const ray = (u: number, v: number): number => {
    p.copy(o).addScaledVector(X, u).addScaledVector(Y, v).addScaledVector(Z, reach);
    const hit = raycast(f, p, dir, reach * 2.5);
    return hit ? reach - hit.distanceTo(p) : -reach;
  };
  for (let j = 0; j < nv; j++) {
    let prev = NaN;
    for (let i = 0; i < nu; i++) {
      const u = -hu + i * du, v = -hv + j * dv;
      const up = j > 0 ? H[i + (j - 1) * nu] : NaN;
      const guess = !Number.isNaN(prev) ? prev : up;
      let h = Number.isNaN(guess) ? NaN : settle(u, v, guess);
      if (Number.isNaN(h) || Math.abs(h - guess) > 0.012) h = ray(u, v);
      H[i + j * nu] = h;
      prev = h;
    }
  }
  const h = (u: number, v: number) => {
    const fu = clamp((u + hu) / du, 0, nu - 1.001), fv = clamp((v + hv) / dv, 0, nv - 1.001);
    const i = fu | 0, j = fv | 0, a = fu - i, b = fv - j;
    const k = i + j * nu;
    return (H[k] * (1 - a) + H[k + 1] * a) * (1 - b) + (H[k + nu] * (1 - a) + H[k + nu + 1] * a) * b;
  };
  const ox = o.x, oy = o.y, oz = o.z;
  const sdf: SDF = (x, y, z) => {
    const dx = x - ox, dy = y - oy, dz = z - oz;
    const u = dx * X.x + dy * X.y + dz * X.z, v = dx * Y.x + dy * Y.y + dz * Y.z, w = dx * Z.x + dy * Z.y + dz * Z.z;
    // slope-corrected height field distance
    const e = 0.004;
    const hc = h(u, v);
    const gu = (h(u + e, v) - h(u - e, v)) / (2 * e), gv = (h(u, v + e) - h(u, v - e)) / (2 * e);
    return (w - hc) / Math.sqrt(1 + gu * gu + gv * gv);
  };
  const point = (u: number, v: number, lift = 0) => o.clone().addScaledVector(X, u).addScaledVector(Y, v).addScaledVector(Z, h(u, v) + lift);
  const normal = (u: number, v: number) => {
    const e = 0.004;
    const gu = (h(u + e, v) - h(u - e, v)) / (2 * e), gv = (h(u, v + e) - h(u, v - e)) / (2 * e);
    return V().addScaledVector(Z, 1).addScaledVector(X, -gu).addScaledVector(Y, -gv).normalize();
  };
  return { frame, h, sdf, point, normal, hu, hv };
}

/** 2D signed distance of a rounded rectangle centred at (cu, cv), half sizes (a, b), radius r. */
export function rect2(u: number, v: number, cu: number, cv: number, a: number, b: number, r = 0): number {
  const qx = Math.abs(u - cu) - a + r, qy = Math.abs(v - cv) - b + r;
  const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0;
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
}

/** 2D signed distance to a convex/concave polygon (points in order). */
export function poly2(u: number, v: number, pts: [number, number][]): number {
  let d = Infinity, sgn = 1;
  const n = pts.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [ax, ay] = pts[j], [bx, by] = pts[i];
    const ex = bx - ax, ey = by - ay, wx = u - ax, wy = v - ay;
    const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey || 1), 0, 1);
    const dx = wx - ex * t, dy = wy - ey * t;
    d = Math.min(d, dx * dx + dy * dy);
    const c1 = v >= ay, c2 = v < by, c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) sgn = -sgn;
  }
  return sgn * Math.sqrt(d);
}

export type Outline2 = (u: number, v: number) => number;

/**
 * A thin conforming layer on a chart: from `below` under the surface to `top` above it, clipped
 * to `outline` (2D, chart coordinates), edges softened by `round`. `topFn` optionally varies the
 * thickness over (u, v) (e.g. fade out an embedded edge).
 */
export function patchLayer(chart: SurfaceChart, outline: Outline2, top: number, below = 0.003, round = 0.001, topFn?: (u: number, v: number) => number): SDF {
  const { frame } = chart;
  const o = frame.o, X = frame.x, Y = frame.y;
  const ox = o.x, oy = o.y, oz = o.z;
  return (x, y, z) => {
    const dx = x - ox, dy = y - oy, dz = z - oz;
    const u = dx * X.x + dy * X.y + dz * X.z, v = dx * Y.x + dy * Y.y + dz * Y.z;
    const s = chart.sdf(x, y, z);
    const tt = topFn ? topFn(u, v) : top;
    const layer = Math.max(s - tt, -s - below);
    return smax(layer, outline(u, v), round);
  };
}

/** Tangent frame on the surface of `f`: projects `seed` onto it; y follows `up` projected. */
export function surfaceFrame(f: SDF, seed: THREE.Vector3, up: THREE.Vector3, towards?: THREE.Vector3): Frame {
  const n = V();
  let q = seed.clone();
  // with a direction: cast a ray back along -towards through the seed (exact placement)
  const hit = towards ? raycast(f, seed.clone().addScaledVector(towards.clone().normalize(), 0.15), towards.clone().normalize().negate(), 0.6) : null;
  if (hit) q = hit;
  else {
    // otherwise project with a few Newton steps
    for (let i = 0; i < 16; i++) {
      const d = f(q.x, q.y, q.z);
      gradient(f, q.x, q.y, q.z, 0.001, n);
      if (Math.abs(d) < 1e-5) break;
      q.addScaledVector(n, -d);
    }
  }
  gradient(f, q.x, q.y, q.z, 0.004, n);
  if (towards && n.dot(towards) < 0) n.negate();
  const y = up.clone().addScaledVector(n, -up.dot(n)).normalize();
  const x = new THREE.Vector3().crossVectors(y, n).normalize();
  return { o: q, x, y, z: n };
}

/** Axis-aligned bounds of a chart region (u, v extents plus depth), for meshing. */
export function chartBounds(frame: Frame, u0: number, u1: number, v0: number, v1: number, w0: number, w1: number): { min: [number, number, number]; max: [number, number, number] } {
  const b = new THREE.Box3();
  for (const u of [u0, u1]) for (const v of [v0, v1]) for (const w of [w0, w1]) {
    b.expandByPoint(frame.o.clone().addScaledVector(frame.x, u).addScaledVector(frame.y, v).addScaledVector(frame.z, w));
  }
  return { min: b.min.toArray() as [number, number, number], max: b.max.toArray() as [number, number, number] };
}

// ------------------------------------------------------------------ small rigid details

/** Uniform button (domed disc, optional rim) as lathe geometry: axis +Y = outward normal, base at y = 0. */
export function buttonGeometry(diameter = 0.018, height = 0.0045, seg = 14): THREE.BufferGeometry {
  const r = diameter / 2;
  const prof: [number, number][] = [
    [0, height], [r * 0.35, height * 0.98], [r * 0.62, height * 0.9], [r * 0.8, height * 0.78],
    [r * 0.9, height * 0.8], [r * 0.99, height * 0.55], [r, height * 0.25], [r * 0.93, 0],
  ];
  // LatheGeometry faces point outward when the profile runs from the bottom up
  const pts = prof.map(([x, y]) => new THREE.Vector2(x, y)).reverse();
  const g = new THREE.LatheGeometry(pts, seg);
  g.computeVertexNormals();
  return g;
}

/** Matrix placing a +Y-up local object at `p` with +Y along `n` and +Z close to `fwd`. */
export function alignY(p: THREE.Vector3, n: THREE.Vector3, fwd = V(0, 1, 0)): THREE.Matrix4 {
  const y = n.clone().normalize();
  let z = fwd.clone().addScaledVector(y, -fwd.dot(y));
  if (z.lengthSq() < 1e-8) z = V(1, 0, 0).addScaledVector(y, -y.x);
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(p);
}

/** Tube along points (e.g. piping, laces, stitching cords). */
export function cord(points: THREE.Vector3[], r: number, closed = false, radial = 6): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  return new THREE.TubeGeometry(curve, Math.max(8, points.length * 3), r, radial, closed);
}

/** Smooth union helper re-exported for garment authors. */
export { smin, smax, sstep, clamp };
