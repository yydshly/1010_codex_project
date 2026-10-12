/**
 * Small modelling helpers for the British 1937-pattern web gear: stitch rows, tapered sheets,
 * stamped brass fittings (tips, buckles, hooks, press studs, slides) and strap utilities.
 * All sizes in metres. Fittings are built in a local frame and placed with `placeOn`.
 */
import { THREE, G } from '../../../core/kit';

type P = THREE.Vector3 | [number, number, number];
const V = (p: P) => (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone());

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * A row of individual stitches along a polyline, each a slim 4-sided prism (8 triangles).
 * len = stitch length, gap = spacing, r = thread radius.
 */
export function stitches(points: P[], o: { len?: number; gap?: number; r?: number; closed?: boolean } = {}): THREE.BufferGeometry {
  const len = o.len ?? 0.0034, gap = o.gap ?? 0.0019, r = o.r ?? 0.00055;
  const pts = points.map(V);
  if (o.closed) pts.push(pts[0].clone());
  const arc: number[] = [0];
  for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = arc[arc.length - 1];
  let seg = 0;
  const at = (s: number) => {
    while (seg < pts.length - 2 && arc[seg + 1] < s) seg++;
    const l = arc[seg + 1] - arc[seg] || 1e-9;
    return pts[seg].clone().lerp(pts[seg + 1], clamp01((s - arc[seg]) / l));
  };
  const pos: number[] = [];
  for (let s = gap / 2; s + len <= total + 1e-9; s += len + gap) {
    seg = 0;
    prism(pos, at(s), at(Math.min(total, s + len)), r);
  }
  return prismGeometry(pos);
}

/** Stitch row along a smooth curve (Catmull-Rom through the points). */
export function stitchCurve(points: P[], o: { len?: number; gap?: number; r?: number; closed?: boolean } = {}): THREE.BufferGeometry {
  const c = new THREE.CatmullRomCurve3(points.map(V), o.closed ?? false, 'centripetal');
  const n = Math.max(8, Math.round(c.getLength() / 0.002));
  return stitches(c.getSpacedPoints(n), { ...o, closed: false });
}

/** Rectangular box stitch with an X (a strap end sewn onto a panel), in the plane z = zc facing +Z. */
export function boxX(cx: number, cy: number, w: number, h: number, zc: number): THREE.BufferGeometry {
  const a = new THREE.Vector3(cx - w / 2, cy - h / 2, zc), b = new THREE.Vector3(cx + w / 2, cy - h / 2, zc);
  const c = new THREE.Vector3(cx + w / 2, cy + h / 2, zc), d = new THREE.Vector3(cx - w / 2, cy + h / 2, zc);
  const o = { len: 0.0028, gap: 0.0016, r: 0.0005 };
  return G.mergeGeometries([stitches([a, b, c, d, a], o), stitches([a, c], o), stitches([b, d], o)])!;
}

/**
 * A thin sheet swept along a path with a VARIABLE width (tongues, tapered straps, flaps with
 * rounded ends): halfWidth(t) for t in [0, 1] along the path, normals = outward face direction
 * per point (or one for all). Real thickness with side and end walls.
 */
export function taperedSheet(
  points: P[],
  normals: P | P[],
  halfWidth: (t: number) => number,
  thickness: number,
  o: { samples?: number; across?: number; bulge?: number | ((t: number) => number) } = {},
): THREE.BufferGeometry {
  const pts = points.map(V);
  const per = Array.isArray(normals) && (Array.isArray(normals[0]) || normals[0] instanceof THREE.Vector3);
  const nr = per ? (normals as P[]).map((n) => V(n).normalize()) : pts.map(() => V(normals as P).normalize());
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const cn = new THREE.CatmullRomCurve3(nr, false, 'centripetal');
  const ns = o.samples ?? Math.max(8, pts.length * 6);
  const na = o.across ?? 2;
  const L = c.getLength();
  const rowsO: THREE.Vector3[][] = [], rowsI: THREE.Vector3[][] = [];
  for (let i = 0; i <= ns; i++) {
    const t = i / ns;
    const p = c.getPointAt(t);
    const tg = c.getTangentAt(t);
    const u0 = cn.getPoint(c.getUtoTmapping(t, t * L)).normalize();
    const N = u0.sub(tg.clone().multiplyScalar(u0.dot(tg))).normalize();
    const B = new THREE.Vector3().crossVectors(tg, N).normalize();
    const hw = Math.max(1e-5, halfWidth(t));
    const ro: THREE.Vector3[] = [], ri: THREE.Vector3[] = [];
    for (let j = 0; j <= na; j++) {
      const s = (j / na) * 2 - 1;
      const bv = typeof o.bulge === 'function' ? o.bulge(t) : (o.bulge ?? 0);
      const bul = bv * (1 - s * s);
      const q = p.clone().addScaledVector(B, s * hw).addScaledVector(N, bul);
      ro.push(q.clone().addScaledVector(N, thickness / 2));
      ri.push(q.clone().addScaledVector(N, -thickness / 2));
    }
    rowsO.push(ro);
    rowsI.push(ri);
  }
  const pos: number[] = [];
  const quad = (a: THREE.Vector3, b: THREE.Vector3, cc: THREE.Vector3, d: THREE.Vector3) => {
    for (const q of [a, b, cc, a, cc, d]) pos.push(q.x, q.y, q.z);
  };
  for (let i = 0; i < ns; i++) {
    for (let j = 0; j < na; j++) {
      quad(rowsO[i][j], rowsO[i][j + 1], rowsO[i + 1][j + 1], rowsO[i + 1][j]);
      quad(rowsI[i][j], rowsI[i + 1][j], rowsI[i + 1][j + 1], rowsI[i][j + 1]);
    }
    quad(rowsO[i][0], rowsO[i + 1][0], rowsI[i + 1][0], rowsI[i][0]);
    quad(rowsO[i][na], rowsI[i][na], rowsI[i + 1][na], rowsO[i + 1][na]);
  }
  for (let j = 0; j < na; j++) {
    quad(rowsO[0][j], rowsI[0][j], rowsI[0][j + 1], rowsO[0][j + 1]);
    quad(rowsO[ns][j], rowsO[ns][j + 1], rowsI[ns][j + 1], rowsI[ns][j]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const m = G.mergeVertices(g, 1e-7);
  const out = G.crease(m, 55);
  G.ensureOutward(out);
  return out;
}

/** Half-width function: constant `hw` with rounded ends of radius rc at the start/end (0 = square). */
export function roundedEnds(hw: number, L: number, rc0: number, rc1: number) {
  return (t: number) => {
    const s = t * L;
    let w = hw;
    if (rc0 > 0 && s < rc0) w = Math.min(w, hw - rc0 + Math.sqrt(Math.max(0, rc0 * rc0 - (rc0 - s) ** 2)));
    if (rc1 > 0 && L - s < rc1) w = Math.min(w, hw - rc1 + Math.sqrt(Math.max(0, rc1 * rc1 - (rc1 - (L - s)) ** 2)));
    return Math.max(0.0004, w);
  };
}

/** Length of a polyline / smooth path. */
export function pathLength(points: P[]): number {
  const c = new THREE.CatmullRomCurve3(points.map(V), false, 'centripetal');
  return c.getLength();
}

/**
 * Transform a fitting built in its local frame (strap axis along +Y, face normal +Z, width X)
 * onto point p with face normal n and strap direction d (d is orthogonalised against n).
 */
export function placeOn(g: THREE.BufferGeometry, p: THREE.Vector3, n: THREE.Vector3, d: THREE.Vector3): THREE.BufferGeometry {
  const N = n.clone().normalize();
  const Y = d.clone().sub(N.clone().multiplyScalar(d.dot(N))).normalize();
  const X = new THREE.Vector3().crossVectors(Y, N).normalize();
  const m = new THREE.Matrix4().makeBasis(X, Y, N).setPosition(p);
  return g.applyMatrix4(m);
}

// ---------------------------------------------------------------------------------------------
// Stamped brass fittings (local frame: strap along +Y, face +Z, width X)
// ---------------------------------------------------------------------------------------------

/**
 * Brass tip ("Tips, brass") clamped over a strap end: front and back plates with the typical
 * double-lobed inner edge, the folded end at y = 0 (strap extends to -Y), two rivets.
 * w = strap width, t = strap thickness, L = tip length.
 */
export function brassTip(w: number, t: number, L = w * 0.62): { plate: THREE.BufferGeometry; rivets: THREE.BufferGeometry } {
  const hw = w / 2 + 0.0004;
  const pt = 0.0006; // sheet thickness
  const outline: G.V2[] = [];
  const N = 18;
  outline.push([-hw, 0], [hw, 0]);
  for (let i = 0; i <= N; i++) {
    const x = hw - (2 * hw * i) / N;
    // inner edge: a shallow arc, longest in the middle, with rounded corners
    const u = x / hw;
    const corner = 1 - Math.sqrt(Math.max(0, 1 - Math.max(0, Math.abs(u) - 0.8) ** 2 / 0.04));
    outline.push([x * (1 - 0.04 * corner), -L * (0.82 + 0.18 * (1 - u * u)) + L * 0.12 * corner]);
  }
  const plates: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const g = G.extrude(outline, pt, 0.00018, 4, 1);
    g.translate(0, 0, s * (t / 2 + pt / 2 + 0.00005));
    plates.push(g);
  }
  // folded end: half tube around the strap end
  const fold = new THREE.CylinderGeometry(t / 2 + pt, t / 2 + pt, 2 * hw, 10, 1, true, 0, Math.PI);
  fold.rotateZ(Math.PI / 2); // axis along X, the half shell covers the +Y end
  plates.push(fold);
  const rv = G.scatter(G.rivetHead(Math.min(0.0018, w * 0.07)), [
    { p: [-hw * 0.45, -L * 0.36, t / 2 + pt], n: [0, 0, 1] },
    { p: [hw * 0.45, -L * 0.36, t / 2 + pt], n: [0, 0, 1] },
  ]);
  return { plate: merge(plates), rivets: rv };
}

function bar(x0: number, y0: number, x1: number, y1: number, bw: number, bt: number): THREE.BufferGeometry {
  const w = Math.max(Math.abs(x1 - x0), bw), h = Math.max(Math.abs(y1 - y0), bw);
  const g = G.rbox(w, h, bt, Math.min(bw, bt) * 0.45, 1);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
  return g;
}

/**
 * The 1937-pattern "open" buckle (Mills pattern) for 1-inch or 2-inch strapping: a flat stamped
 * frame whose lower bar is split with two inturned ends, so a strap can be slipped in; the strap
 * is sewn round the top bar. Outer size w (X) x h (Y), centred; bar width bw, thickness bt.
 */
export function gateBuckle(w: number, h: number, bw = 0.0031, bt = 0.0016): THREE.BufferGeometry {
  const hw = w / 2, hh = h / 2, g = w * 0.1;
  const parts = [
    bar(-hw, hh - bw / 2, hw, hh - bw / 2, bw, bt), // top bar
    bar(-hw + bw / 2, -hh, -hw + bw / 2, hh, bw, bt),
    bar(hw - bw / 2, -hh, hw - bw / 2, hh, bw, bt),
    bar(-hw, -hh + bw / 2, -g, -hh + bw / 2, bw, bt),
    bar(g, -hh + bw / 2, hw, -hh + bw / 2, bw, bt),
    // inturned tips
    bar(-g - bw * 0.35, -hh + bw * 0.5, -g + bw * 0.05, -hh + bw * 1.35, bw * 0.75, bt),
    bar(g - bw * 0.05, -hh + bw * 0.5, g + bw * 0.35, -hh + bw * 1.35, bw * 0.75, bt),
  ];
  return merge(parts);
}

/**
 * The 4-bar "Buckle, brass, 1-in. with loop" (Mills patent) on the top back of the basic pouch:
 * a closed frame with an inner bar a third of the way down (narrow upper window).
 */
export function fourBarBuckle(w: number, h: number, bw = 0.0028, bt = 0.0015): THREE.BufferGeometry {
  const hw = w / 2, hh = h / 2;
  const yb = hh - h * 0.36;
  const parts = [
    bar(-hw, hh - bw / 2, hw, hh - bw / 2, bw, bt),
    bar(-hw, -hh + bw / 2, hw, -hh + bw / 2, bw, bt),
    bar(-hw + bw / 2, -hh, -hw + bw / 2, hh, bw, bt),
    bar(hw - bw / 2, -hh, hw - bw / 2, hh, bw, bt),
    bar(-hw + bw, yb, hw - bw, yb, bw * 0.9, bt * 0.95),
  ];
  return merge(parts);
}

/**
 * Newey-type press stud cap (the visible "crown" half): rolled rim and a low dome, facing +Z,
 * base at z = 0. r = cap radius.
 */
export function pressStud(r = 0.0055, h = 0.0026): THREE.BufferGeometry {
  const g = G.lathe(
    [
      [0, 0],
      [r * 0.98, 0],
      [r, h * 0.35],
      [r * 0.9, h * 0.62],
      [r * 0.72, h * 0.66],
      [r * 0.62, h * 0.82],
      [r * 0.3, h],
      [0, h * 1.02],
    ],
    20,
    38,
  );
  g.rotateX(Math.PI / 2);
  return g;
}

/** Hollow eyelet (grommet) facing +Z, base at z = 0: a rolled ring. */
export function eyelet(r = 0.003, rin = 0.0017, h = 0.0012): THREE.BufferGeometry {
  const g = G.lathe(
    [
      [rin, -0.0006],
      [rin, h * 0.7],
      [rin + (r - rin) * 0.3, h],
      [r * 0.92, h * 0.85],
      [r, h * 0.3],
      [r, 0],
    ],
    16,
    40,
  );
  g.rotateX(Math.PI / 2);
  return g;
}

/**
 * Brass double hook ("Hooks, brass, 2 1/4-in.") seen from the front: a flat wire loop along Y
 * whose top and bottom ends curl over the belt's top and bottom edges back towards -Z.
 * span = belt width, r = wire radius. Local: loop centre at the origin, the straight part lies
 * on z = 0 (in front of the belt face at z = -r), hook tips end at z = -depth.
 */
export function beltHookWire(span: number, depth: number, r = 0.0011): THREE.BufferGeometry {
  const h = span / 2 + r * 1.5;
  const pts: THREE.Vector3[] = [];
  // top curl (over the belt top edge, tip down behind the belt)
  pts.push(new THREE.Vector3(0, h - depth * 1.1, -depth));
  pts.push(new THREE.Vector3(0, h + r * 0.4, -depth * 0.85));
  pts.push(new THREE.Vector3(0, h + r * 1.4, -depth * 0.4));
  pts.push(new THREE.Vector3(0, h + r * 0.6, -r * 0.2));
  pts.push(new THREE.Vector3(0, h - 0.006, 0));
  pts.push(new THREE.Vector3(0, -h + 0.006, 0));
  pts.push(new THREE.Vector3(0, -h - r * 0.6, -r * 0.2));
  pts.push(new THREE.Vector3(0, -h - r * 1.4, -depth * 0.4));
  pts.push(new THREE.Vector3(0, -h - r * 0.4, -depth * 0.85));
  pts.push(new THREE.Vector3(0, -h + depth * 1.1, -depth));
  return G.tube(pts, r, 6, 60);
}

/** Flat oval stamped-brass rivet cap / burr, facing +Z, base at z = 0. */
export function rivet(r = 0.0018): THREE.BufferGeometry {
  const g = G.rivetHead(r);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Positions of a slim 4-sided prism from a to b (8 triangles), appended to pos. */
export function prism(pos: number[], a: THREE.Vector3, b: THREE.Vector3, r: number) {
  const d = b.clone().sub(a);
  if (d.lengthSq() < 1e-12) return;
  d.normalize();
  const up = Math.abs(d.z) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
  const u = new THREE.Vector3().crossVectors(d, up).normalize().multiplyScalar(r);
  const w = new THREE.Vector3().crossVectors(u, d).normalize().multiplyScalar(r * 0.8);
  const ring = (c: THREE.Vector3) => [c.clone().add(u), c.clone().add(w), c.clone().sub(u), c.clone().sub(w)];
  const A = ring(a), B = ring(b);
  for (let k = 0; k < 4; k++) {
    const k1 = (k + 1) % 4;
    for (const q of [A[k], B[k], B[k1], A[k], B[k1], A[k1]]) pos.push(q.x, q.y, q.z);
  }
}

/** Geometry from a position list built with `prism`. */
export function prismGeometry(pos: number[]): THREE.BufferGeometry {
  if (!pos.length) pos.push(0, 0, 0, 0, 0, 0, 0, 0, 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Whip stitching (overcast seam) along an edge: each stitch runs diagonally over the edge from
 * one face to the other. pts = points ON the edge, faceN = normal of the visible face, edgeN =
 * outward normal of the edge (both per point). pitch = stitch spacing, depth = how far in from
 * the edge the needle enters.
 */
export function whipStitch(pts: THREE.Vector3[], faceN: THREE.Vector3[], edgeN: THREE.Vector3[], pitch = 0.006, depth = 0.003, r = 0.0006): THREE.BufferGeometry {
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const cf = new THREE.CatmullRomCurve3(faceN, false, 'centripetal');
  const ce = new THREE.CatmullRomCurve3(edgeN, false, 'centripetal');
  const L = c.getLength();
  const n = Math.max(1, Math.floor(L / pitch));
  const pos: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.1) / n, t1 = Math.min(1, (i + 0.8) / n);
    const a = c.getPointAt(t0), b = c.getPointAt(t1);
    const fa = cf.getPoint(t0).normalize(), fb = cf.getPoint(t1).normalize();
    const ea = ce.getPoint(t0).normalize(), eb = ce.getPoint(t1).normalize();
    const p0 = a.clone().addScaledVector(fa, r * 0.7).addScaledVector(ea, -depth);
    const p1 = a.clone().lerp(b, 0.5).addScaledVector(ea.clone().add(eb).normalize(), r * 1.1).addScaledVector(fa.clone().add(fb).normalize(), r * 0.2);
    const p2 = b.clone().addScaledVector(fb, -r * 0.7).addScaledVector(eb, -depth);
    prism(pos, p0, p1, r);
    prism(pos, p1, p2, r);
  }
  return prismGeometry(pos);
}

/** A thread segment (one continuous slim prism through the points). */
export function thread(points: THREE.Vector3[], r = 0.0005): THREE.BufferGeometry {
  return G.tube(points, r, 4, Math.max(2, points.length * 2));
}

/**
 * Resample a sub-range [s0, s1] (arc length, m) of a smooth path with its per-point normals.
 * Returns points + normals ready for G.strap / taperedSheet.
 */
export function subPath(points: THREE.Vector3[], normals: THREE.Vector3[], s0: number, s1: number, n = 12): { pts: THREE.Vector3[]; nrm: THREE.Vector3[] } {
  const c = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const cn = new THREE.CatmullRomCurve3(normals.map((v) => v.clone()), false, 'centripetal');
  const L = c.getLength();
  const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const s = Math.min(L, Math.max(0, s0 + ((s1 - s0) * i) / n));
    const u = s / L;
    pts.push(c.getPointAt(u));
    nrm.push(cn.getPoint(c.getUtoTmapping(u, s)).normalize());
  }
  return { pts, nrm };
}

/** Point, tangent and normal at arc length s along a path with per-point normals. */
export function frameAt(points: THREE.Vector3[], normals: THREE.Vector3[], s: number): { p: THREE.Vector3; t: THREE.Vector3; n: THREE.Vector3 } {
  const c = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const cn = new THREE.CatmullRomCurve3(normals.map((v) => v.clone()), false, 'centripetal');
  const L = c.getLength();
  const u = Math.min(1, Math.max(0, s / L));
  const t = c.getTangentAt(u);
  const n = cn.getPoint(c.getUtoTmapping(u, s)).normalize();
  n.sub(t.clone().multiplyScalar(n.dot(t))).normalize();
  return { p: c.getPointAt(u), t, n };
}

/** Rectangular wire frame (slide / keeper) in the XY plane, outer size w x h, wire radius r. */
export function wireFrame(w: number, h: number, r: number, corner = 0.002, seg = 48): THREE.BufferGeometry {
  const hw = w / 2 - r, hh = h / 2 - r, c = Math.min(corner, hw, hh);
  const pts: THREE.Vector3[] = [];
  const corners: [number, number, number][] = [
    [hw - c, hh - c, 0],
    [-hw + c, hh - c, Math.PI / 2],
    [-hw + c, -hh + c, Math.PI],
    [hw - c, -hh + c, 1.5 * Math.PI],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 3; i++) {
      const a = a0 + (i / 3) * (Math.PI / 2);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * c, cy + Math.sin(a) * c, 0));
    }
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  return new THREE.TubeGeometry(curve, seg, r, 6, true);
}

/**
 * A sheet with real thickness from a grid of mid-surface points (rows along the sheet, columns
 * across it): outer and inner faces offset by +-t/2 along the grid normals, plus the four edge
 * walls. `towards` = a direction the OUTER face should roughly face at the grid centre.
 */
export function patchSheet(grid: THREE.Vector3[][], t: number, towards: THREE.Vector3): THREE.BufferGeometry {
  const R = grid.length, C = grid[0].length;
  const nrm: THREE.Vector3[][] = [];
  for (let i = 0; i < R; i++) {
    const row: THREE.Vector3[] = [];
    for (let j = 0; j < C; j++) {
      const a = grid[Math.min(R - 1, i + 1)][j].clone().sub(grid[Math.max(0, i - 1)][j]);
      const b = grid[i][Math.min(C - 1, j + 1)].clone().sub(grid[i][Math.max(0, j - 1)]);
      row.push(new THREE.Vector3().crossVectors(b, a).normalize());
    }
    nrm.push(row);
  }
  const mid = nrm[R >> 1][C >> 1];
  const sgn = mid.dot(towards) < 0 ? -1 : 1;
  const O = grid.map((r, i) => r.map((p, j) => p.clone().addScaledVector(nrm[i][j], (sgn * t) / 2)));
  const I = grid.map((r, i) => r.map((p, j) => p.clone().addScaledVector(nrm[i][j], (-sgn * t) / 2)));
  const pos: number[] = [];
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
    for (const q of [a, b, c, a, c, d]) pos.push(q.x, q.y, q.z);
  };
  for (let i = 0; i < R - 1; i++) {
    for (let j = 0; j < C - 1; j++) {
      quad(O[i][j], O[i][j + 1], O[i + 1][j + 1], O[i + 1][j]);
      quad(I[i][j], I[i + 1][j], I[i + 1][j + 1], I[i][j + 1]);
    }
    quad(O[i][0], O[i + 1][0], I[i + 1][0], I[i][0]);
    quad(O[i][C - 1], I[i][C - 1], I[i + 1][C - 1], O[i + 1][C - 1]);
  }
  for (let j = 0; j < C - 1; j++) {
    quad(O[0][j], I[0][j], I[0][j + 1], O[0][j + 1]);
    quad(O[R - 1][j], O[R - 1][j + 1], I[R - 1][j + 1], I[R - 1][j]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const m = G.mergeVertices(g, 1e-7);
  const out = G.crease(m, 55);
  // orient: the outer face (centre) must face `towards`
  out.computeBoundingBox();
  const pa = out.attributes.position as THREE.BufferAttribute, na = out.attributes.normal as THREE.BufferAttribute;
  const target = O[R >> 1][C >> 1];
  let best = -1, bd = Infinity;
  for (let k = 0; k < pa.count; k++) {
    const d = (pa.getX(k) - target.x) ** 2 + (pa.getY(k) - target.y) ** 2 + (pa.getZ(k) - target.z) ** 2;
    if (d < bd) { bd = d; best = k; }
  }
  if (best >= 0 && new THREE.Vector3().fromBufferAttribute(na, best).dot(towards) < 0) {
    G.flipWinding(out);
    const arr = na.array as Float32Array;
    for (let k = 0; k < arr.length; k++) arr[k] = -arr[k];
  }
  return out;
}

/** toNonIndexed() only when needed, uv dropped (so merged geometries share attributes). */
export function flat(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const q = g.index ? g.toNonIndexed() : g;
  if (q.attributes.uv) q.deleteAttribute('uv');
  if (q.attributes.uv1) q.deleteAttribute('uv1');
  if (!q.attributes.normal) q.computeVertexNormals();
  return q;
}

/** Merge geometries (any mix of indexed / non-indexed, uv dropped). */
export function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return G.mergeGeometries(gs.map(flat))!;
}

/**
 * Overcast (whip) stitching seen on a surface seam: diagonal stitches crossing the seam line.
 * pts = points along the seam ON the surface, nrm = surface normals there; w = half reach across
 * the seam, pitch = stitch spacing, r = thread radius (the thread is lifted by r).
 */
export function overcast(pts: THREE.Vector3[], nrm: THREE.Vector3[], w = 0.0025, pitch = 0.006, r = 0.0005): THREE.BufferGeometry {
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const cn = new THREE.CatmullRomCurve3(nrm.map((v) => v.clone()), false, 'centripetal');
  const L = c.getLength();
  const n = Math.max(1, Math.floor(L / pitch));
  const pos: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.15) / n, t1 = Math.min(1, (i + 0.85) / n);
    const a = c.getPointAt(t0), b = c.getPointAt(t1);
    const tg = c.getTangentAt((t0 + t1) / 2);
    const nn = cn.getPoint(c.getUtoTmapping((t0 + t1) / 2, ((t0 + t1) / 2) * L)).normalize();
    const side = new THREE.Vector3().crossVectors(tg, nn).normalize();
    const p0 = a.clone().addScaledVector(side, -w).addScaledVector(nn, r * 0.6);
    const pm = a.clone().lerp(b, 0.5).addScaledVector(nn, r * 1.6);
    const p1 = b.clone().addScaledVector(side, w).addScaledVector(nn, r * 0.6);
    prism(pos, p0, pm, r);
    prism(pos, pm, p1, r);
  }
  return prismGeometry(pos);
}

/** Signed 2D distance to a closed polygon (negative inside). */
export function polyDist2D(poly: [number, number][]): (x: number, y: number) => number {
  return (x, y) => {
    let d = Infinity, sgn = 1;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      const ex = xi - xj, ey = yi - yj, wx = x - xj, wy = y - yj;
      const h = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-12)));
      d = Math.min(d, Math.hypot(wx - ex * h, wy - ey * h));
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) sgn = -sgn;
    }
    return sgn * d;
  };
}

/** Densely sampled rounded polygon: corners [x, y, radius] in order (CCW or CW), n samples per arc. */
export function roundedPoly(corners: [number, number, number][], n = 8): [number, number][] {
  const out: [number, number][] = [];
  const N = corners.length;
  for (let i = 0; i < N; i++) {
    const [px, py] = corners[(i - 1 + N) % N], [cx, cy, r] = corners[i], [nx, ny] = corners[(i + 1) % N];
    const a = new THREE.Vector2(px - cx, py - cy).normalize(), b = new THREE.Vector2(nx - cx, ny - cy).normalize();
    const ang = Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
    const t = r / Math.tan(ang / 2 || 1e-6);
    const p0 = new THREE.Vector2(cx, cy).addScaledVector(a, t), p1 = new THREE.Vector2(cx, cy).addScaledVector(b, t);
    if (r <= 0) { out.push([cx, cy]); continue; }
    // quadratic Bezier approximation of the fillet through the corner
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      const x = (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * cx + u * u * p1.x;
      const y = (1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * cy + u * u * p1.y;
      out.push([x, y]);
    }
  }
  return out;
}
