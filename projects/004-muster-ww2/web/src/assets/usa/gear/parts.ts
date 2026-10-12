/**
 * Small modelling helpers and hardware for the US gear pieces: stitch rows, thin sheets and
 * parametric surfaces, lift-the-dot fasteners, eyelets (grommets), the M1910 double-hook wire
 * hanger, frame buckles. Adapted from the Soviet / German gear helpers (copied into this folder).
 * All sizes in metres.
 */
import { THREE, G } from '../../../core/kit';

type V3 = [number, number, number];
type P = THREE.Vector3 | V3;
const V = (p: P) => (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone());

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Detail level of every US gear builder. 'low' (for pieces worn on a soldier, who has a 180k
 * triangle budget for figure + weapon + gear) keeps every modelled part but lowers mesh
 * resolutions (x0.6) and spaces stitches wider (x1.7): withUSGearDetail('low', () => buildX()).
 */
export const US_LOD = { low: false };
export function withUSGearDetail<T>(level: 'high' | 'low', fn: () => T): T {
  const prev = US_LOD.low;
  US_LOD.low = level === 'low';
  try {
    return fn();
  } finally {
    US_LOD.low = prev;
  }
}
/** A mesh resolution scaled for the current detail level. */
export const lodN = (n: number, min = 2) => (US_LOD.low ? Math.max(min, Math.round(n * 0.6)) : n);

/** Keep a valid (degenerate, invisible) geometry so callers never produce an empty mesh. */
export function emptyGeo(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  return g;
}

/** Merge (non-indexed) geometries; tolerant of an empty list. */
export function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const list = gs.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  }
  if (!list.length) return emptyGeo();
  return G.mergeGeometries(list) ?? emptyGeo();
}

/** One stitch: a 4-sided open tube (8 triangles) from a to b with radius r. */
function stitchGeo(a: THREE.Vector3, b: THREE.Vector3, r: number): THREE.BufferGeometry {
  const d = b.clone().sub(a);
  const L = d.length();
  d.normalize();
  const ref = Math.abs(d.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = ref.clone().sub(d.clone().multiplyScalar(ref.dot(d))).normalize();
  const w = d.clone().cross(u).normalize();
  const pos: number[] = [], nrm: number[] = [];
  // triangular section (6 triangles): at 0.5 mm radius it reads exactly like a round thread
  const c3 = Math.cos((2 * Math.PI) / 3), s3 = Math.sin((2 * Math.PI) / 3);
  const ring = [u.clone(), u.clone().multiplyScalar(c3).addScaledVector(w, s3), u.clone().multiplyScalar(c3).addScaledVector(w, -s3)];
  for (let k = 0; k < 3; k++) {
    const n0 = ring[k], n1 = ring[(k + 1) % 3];
    const q = (n: THREE.Vector3, end: number) => (end ? b : a).clone().addScaledVector(n, r * (end ? 0.85 : 0.85));
    const A0 = q(n0, 0), B0 = q(n1, 0), A1 = q(n0, 1), B1 = q(n1, 1);
    const mid = n0.clone().add(n1).normalize();
    for (const v of [A0, B0, B1, A0, B1, A1]) pos.push(v.x, v.y, v.z);
    for (let i = 0; i < 6; i++) nrm.push(mid.x, mid.y, mid.z);
  }
  void L;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  // winding: make the first face agree with its normal
  const P = g.attributes.position as THREE.BufferAttribute;
  const v0 = new THREE.Vector3().fromBufferAttribute(P, 0), v1 = new THREE.Vector3().fromBufferAttribute(P, 1), v2 = new THREE.Vector3().fromBufferAttribute(P, 2);
  const fn = v1.sub(v0).cross(v2.sub(v0));
  if (fn.dot(ring[0].clone().add(ring[1])) < 0) G.flipWinding(g);
  return g;
}

/**
 * A row of individual stitches (short rods) along a polyline. Returns one merged geometry.
 * len = stitch length, gap = spacing between stitches, r = thread radius.
 */
export function stitches(points: P[], o: { len?: number; gap?: number; r?: number; closed?: boolean } = {}): THREE.BufferGeometry {
  const k = US_LOD.low ? 1.7 : 1;
  const len = (o.len ?? 0.0032) * k, gap = (o.gap ?? 0.0018) * k, r = o.r ?? 0.00055;
  const pts = points.map(V);
  if (o.closed) pts.push(pts[0].clone());
  const arc: number[] = [0];
  for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = arc[arc.length - 1];
  let seg = 0;
  const at = (s: number) => {
    while (seg < pts.length - 2 && arc[seg + 1] < s) seg++;
    const l = arc[seg + 1] - arc[seg] || 1e-9;
    return pts[seg].clone().lerp(pts[seg + 1], Math.min(1, Math.max(0, (s - arc[seg]) / l)));
  };
  const parts: THREE.BufferGeometry[] = [];
  for (let s = gap / 2; s + len <= total; s += len + gap) {
    const p0 = at(s), p1 = at(s + len);
    if (p0.distanceToSquared(p1) < 1e-12) continue;
    parts.push(stitchGeo(p0, p1, r));
  }
  return parts.length ? G.mergeGeometries(parts)! : emptyGeo();
}

/** Stitch row along a smooth curve (Catmull-Rom through the points). */
export function stitchCurve(points: P[], o: { len?: number; gap?: number; r?: number; closed?: boolean } = {}): THREE.BufferGeometry {
  const c = new THREE.CatmullRomCurve3(points.map(V), o.closed ?? false, 'centripetal');
  const n = Math.max(8, Math.round(c.getLength() / 0.002));
  return stitches(c.getSpacedPoints(n), { ...o, closed: false });
}

/** Rectangular box-X stitch pattern (strap ends sewn onto a panel) in the plane with normal n. */
export function boxX(c: THREE.Vector3, w: number, h: number, n: THREE.Vector3, up = new THREE.Vector3(0, 1, 0)): THREE.BufferGeometry {
  const N = n.clone().normalize();
  const U = up.clone().sub(N.clone().multiplyScalar(up.dot(N))).normalize();
  const R = U.clone().cross(N).normalize();
  const q = (a: number, b: number) => c.clone().addScaledVector(R, a * w * 0.5).addScaledVector(U, b * h * 0.5);
  const o = { len: 0.0028, gap: 0.0016, r: 0.00048 };
  return merge([stitches([q(-1, -1), q(1, -1), q(1, 1), q(-1, 1), q(-1, -1)], o), stitches([q(-1, -1), q(1, 1)], o), stitches([q(1, -1), q(-1, 1)], o)]);
}

/**
 * Parametric grid surface. fn(u, v) returns a point for u,v in [0,1].
 * closedU wraps u (the seam is welded). Normals from the geometry (smooth).
 */
export function paramSurface(fn: (u: number, v: number) => THREE.Vector3, nu0: number, nv0: number, closedU = false, flip = false): THREE.BufferGeometry {
  const nu = lodN(nu0, closedU ? 6 : 1), nv = lodN(nv0, 1);
  const cols = closedU ? nu : nu + 1;
  const pos: number[] = [];
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i < cols; i++) {
      const p = fn(i / nu, j / nv);
      pos.push(p.x, p.y, p.z);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const i1 = closedU ? (i + 1) % nu : i + 1;
      const a = j * cols + i, b = j * cols + i1, c = (j + 1) * cols + i1, d = (j + 1) * cols + i;
      if (flip) idx.push(a, c, b, a, d, c);
      else idx.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export interface SheetOptions {
  across?: number;
  samples?: number;
  closed?: boolean;
  bulge?: number;
}

/**
 * A thin sheet (flap, strap with shaped ends, loop) swept along a path. `normals` = outward face
 * direction per point (or one for all). `halfWidth(t, s, L)` gives the half-width so ends can be
 * rounded or pointed.
 */
export function sheet(
  points: P[],
  normals: P | P[],
  halfWidth: number | ((t: number, s: number, L: number) => number),
  thickness: number,
  opts: SheetOptions = {},
): THREE.BufferGeometry {
  const Pp = points.map(V);
  const perPoint = Array.isArray(normals) && (Array.isArray(normals[0]) || normals[0] instanceof THREE.Vector3);
  const Nraw = perPoint ? (normals as P[]).map((n) => V(n).normalize()) : Pp.map(() => V(normals as P).normalize());
  const closed = opts.closed ?? false;
  const samples = lodN(opts.samples ?? Math.max(4, Pp.length * 8), 4);
  const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
  if (Pp.length < 3) {
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      pts.push(Pp[0].clone().lerp(Pp[1], t));
      nrm.push(Nraw[0].clone().lerp(Nraw[1], t).normalize());
    }
  } else {
    const c = new THREE.CatmullRomCurve3(Pp, closed, 'centripetal');
    const cn = new THREE.CatmullRomCurve3(Nraw, closed, 'centripetal');
    const count = closed ? samples : samples + 1;
    for (let i = 0; i < count; i++) {
      const t = Math.min(i / samples, 1);
      pts.push(c.getPoint(t));
      nrm.push(cn.getPoint(t).normalize());
    }
  }
  const n = pts.length;
  const arc: number[] = [0];
  for (let i = 1; i < n; i++) arc.push(arc[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const L = arc[n - 1] || 1e-6;
  const hwF = typeof halfWidth === 'number' ? () => halfWidth : halfWidth;
  const nx = opts.across ?? 4;
  const bulge = opts.bulge ?? 0;
  const ht = thickness / 2;
  const pos: number[] = [];
  const rowSize = (nx + 1) * 2;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const T = next.clone().sub(prev).normalize();
    const N = nrm[i].clone().sub(T.clone().multiplyScalar(nrm[i].dot(T))).normalize();
    const B = T.clone().cross(N).normalize();
    const hw = Math.max(1e-5, hwF(arc[i] / L, arc[i], L));
    for (let j = 0; j <= nx; j++) {
      const x = (j / nx) * 2 - 1;
      const b = bulge * (1 - x * x);
      const q = p.clone().addScaledVector(B, x * hw).addScaledVector(N, b);
      const top = q.clone().addScaledVector(N, ht);
      const bot = q.clone().addScaledVector(N, -ht);
      pos.push(top.x, top.y, top.z, bot.x, bot.y, bot.z);
    }
  }
  const idx: number[] = [];
  const Tp = (i: number, j: number) => i * rowSize + j * 2;
  const Bo = (i: number, j: number) => i * rowSize + j * 2 + 1;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const i2 = (i + 1) % n;
    for (let j = 0; j < nx; j++) {
      idx.push(Tp(i, j), Tp(i2, j), Tp(i2, j + 1), Tp(i, j), Tp(i2, j + 1), Tp(i, j + 1));
      idx.push(Bo(i, j), Bo(i2, j + 1), Bo(i2, j), Bo(i, j), Bo(i, j + 1), Bo(i2, j + 1));
    }
    idx.push(Tp(i, 0), Bo(i, 0), Bo(i2, 0), Tp(i, 0), Bo(i2, 0), Tp(i2, 0));
    idx.push(Tp(i, nx), Tp(i2, nx), Bo(i2, nx), Tp(i, nx), Bo(i2, nx), Bo(i, nx));
  }
  if (!closed) {
    const e = n - 1;
    for (let j = 0; j < nx; j++) {
      idx.push(Tp(0, j), Tp(0, j + 1), Bo(0, j + 1), Tp(0, j), Bo(0, j + 1), Bo(0, j));
      idx.push(Tp(e, j), Bo(e, j + 1), Tp(e, j + 1), Tp(e, j), Bo(e, j), Bo(e, j + 1));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const out = G.crease(g, 50);
  G.ensureOutward(out);
  return out;
}

/** Half-width profile with rounded end(s): radius r at the start and/or end. */
export function roundEnds(hw: number, rStart: number, rEnd: number) {
  return (_t: number, s: number, L: number) => {
    let w = hw;
    if (rEnd > 0 && s > L - rEnd) {
      const d = s - (L - rEnd);
      w = hw - rEnd + Math.sqrt(Math.max(0, rEnd * rEnd - d * d));
    }
    if (rStart > 0 && s < rStart) {
      const d = rStart - s;
      w = Math.min(w, hw - rStart + Math.sqrt(Math.max(0, rStart * rStart - d * d)));
    }
    return Math.max(w, hw * 0.25);
  };
}

/** Half-width profile with a pointed / tapered tip at the end (web strap ends). */
export function taperEnd(hw: number, tipLen: number, tip = 0.35) {
  return (_t: number, s: number, L: number) => {
    if (s > L - tipLen) {
      const k = (L - s) / tipLen;
      return hw * (tip + (1 - tip) * Math.sqrt(Math.max(0, k)));
    }
    return hw;
  };
}

/** Face normals for a path lying in a plane: N_i = axis x T_i. */
export function planarNormals(points: P[], axis: V3 = [1, 0, 0], flip = false): THREE.Vector3[] {
  const Pp = points.map(V);
  const ax = new THREE.Vector3(...axis);
  return Pp.map((_, i) => {
    const a = Pp[Math.max(0, i - 1)], b = Pp[Math.min(Pp.length - 1, i + 1)];
    const n = ax.clone().cross(b.clone().sub(a).normalize()).normalize();
    return flip ? n.negate() : n;
  });
}

/**
 * Place a geometry authored facing +Z (base at z = 0) at p with its +Z along n; its +Y is turned
 * towards `up` (projected onto the plane), so shaped parts keep their orientation on a surface.
 */
export function orientZ(g: THREE.BufferGeometry, p: THREE.Vector3, n: THREE.Vector3, up = new THREE.Vector3(0, 1, 0)): THREE.BufferGeometry {
  const Z = n.clone().normalize();
  let Y = up.clone().sub(Z.clone().multiplyScalar(up.dot(Z)));
  if (Y.lengthSq() < 1e-8) Y = new THREE.Vector3(0, 0, 1).sub(Z.clone().multiplyScalar(Z.z));
  Y.normalize();
  const X = Y.clone().cross(Z).normalize();
  const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(p);
  const out = g.clone();
  out.applyMatrix4(m);
  return out;
}

/** Lathe profile [r, z] around +Z (base at z = 0). */
export function latheZ(profile: [number, number][], seg = 20, creaseDeg = 50): THREE.BufferGeometry {
  const g = G.lathe(profile, lodN(seg, 6), creaseDeg);
  g.rotateX(Math.PI / 2); // +Y -> +Z
  return g;
}

/**
 * Lift-the-dot fastener as seen closed on a flap: the stamped socket (a rounded-rectangle plate,
 * about 14 x 12 mm, with a raised rim round its opening) clinched through the flap, and the domed
 * head of the stud ("dot") standing up through the opening. Faces +Z, base on z = 0, the socket's
 * long side along X. One geometry (blackened brass).
 */
export function liftTheDot(scale = 1): THREE.BufferGeometry {
  const s = scale;
  const w = 0.0068 * s, h = 0.0058 * s, rc = 0.0028 * s;
  const outline: [number, number][] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 2; i++) {
      const a = a0 + (i / 2) * (Math.PI / 2);
      outline.push([cx + Math.cos(a) * rc, cy + Math.sin(a) * rc]);
    }
  };
  corner(w - rc, h - rc, 0);
  corner(-w + rc, h - rc, Math.PI / 2);
  corner(-w + rc, -h + rc, Math.PI);
  corner(w - rc, -h + rc, 1.5 * Math.PI);
  const hole: [number, number][] = [];
  const nh = US_LOD.low ? 8 : 12;
  for (let i = 0; i < nh; i++) {
    const a = -(i / nh) * Math.PI * 2;
    hole.push([Math.cos(a) * 0.0041 * s, Math.sin(a) * 0.0041 * s]);
  }
  const plate = G.extrude(G.shape(outline, 0, [hole]), 0.0011 * s, 0.00035 * s, 6, 1);
  plate.translate(0, 0, 0.00055 * s);
  const rim = G.torus(0.0043 * s, 0.00055 * s, 3, US_LOD.low ? 8 : 12);
  rim.translate(0, 0, 0.0011 * s);
  const dot = latheZ(
    [
      [0, 0.0034 * s],
      [0.0016 * s, 0.0033 * s],
      [0.0028 * s, 0.0027 * s],
      [0.0035 * s, 0.0017 * s],
      [0.0036 * s, 0.0002 * s],
      [0, 0.0002 * s],
    ],
    12,
    60,
  );
  return merge([plate, rim, dot]);
}

/** Small press stud / snap head (domed disc) facing +Z, base at z = 0. */
export function snapHead(r = 0.0055, h = 0.0026): THREE.BufferGeometry {
  return latheZ([[0, h], [r * 0.45, h * 0.97], [r * 0.8, h * 0.8], [r, h * 0.45], [r * 1.02, 0.0002], [0, 0]], 18, 50);
}

/**
 * Grommet / eyelet: rolled metal ring facing +Z (base z = 0). `hole` is a dark disc just below
 * the ring top that reads as the opening (the canvas itself is not cut).
 */
export function grommet(ro = 0.0048, ri = 0.0024, h = 0.0012, seg = 12): { ring: THREE.BufferGeometry; hole: THREE.BufferGeometry } {
  const ring = latheZ(
    [
      [ri, h * 0.4],
      [ri + 0.0003, h * 0.95],
      [ri + (ro - ri) * 0.45, h],
      [ro - 0.0003, h * 0.7],
      [ro, h * 0.15],
      [ri, 0],
    ],
    seg,
    60,
  );
  const hole = new THREE.CircleGeometry(ri + 0.0002, lodN(seg, 6));
  hole.translate(0, 0, h * 0.35);
  return { ring, hole };
}

/** Simple rectangular wire buckle frame (in the XY plane), outer size w x h, wire radius r. */
export function wireFrame(w: number, h: number, r: number, corner = 0.003, seg = 48, radial = 6): THREE.BufferGeometry {
  const hw = w / 2 - r, hh = h / 2 - r, c = Math.min(corner, hw, hh);
  const pts: THREE.Vector3[] = [];
  const corners: [number, number, number][] = [
    [hw - c, hh - c, 0],
    [-hw + c, hh - c, Math.PI / 2],
    [-hw + c, -hh + c, Math.PI],
    [hw - c, -hh + c, 1.5 * Math.PI],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (i / 4) * (Math.PI / 2);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * c, cy + Math.sin(a) * c, 0));
    }
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  return new THREE.TubeGeometry(curve, lodN(seg, 12), r, lodN(radial, 4), true);
}

/**
 * Stamped flat-bar web buckle (the blackened "friction" buckles of US web gear): a rectangular
 * frame of flat strip with a centre bar, in the XY plane, facing +Z (base z = 0).
 * w = outer width (across the strap), h = outer height (along the strap).
 */
export function barBuckle(w: number, h: number, bar = 0.0028, t = 0.0014, centre = true): THREE.BufferGeometry {
  const hw = w / 2, hh = h / 2;
  // one extruded frame (outline + one or two openings): ~160 triangles instead of five rounded boxes
  const ix = hw - bar;
  const rect = (x0: number, y0: number, x1: number, y1: number) => [new THREE.Vector2(x0, y0), new THREE.Vector2(x1, y0), new THREE.Vector2(x1, y1), new THREE.Vector2(x0, y1)];
  const sh = new THREE.Shape(rect(-hw, -hh, hw, hh));
  const holes = centre ? [rect(-ix, bar * 0.45, ix, hh - bar), rect(-ix, -hh + bar, ix, -bar * 0.45)] : [rect(-ix, -hh + bar, ix, hh - bar)];
  for (const hp of holes) sh.holes.push(new THREE.Path(hp.slice().reverse()));
  const g = G.extrude(sh, t, Math.min(0.0004, t * 0.3), 1, 1);
  g.translate(0, 0, t / 2);
  return g;
}

/**
 * M1910 double-hook wire hanger, in the item's gear frame: the two hooks pass through belt
 * eyelets at (+-spacing/2, 0, 0) from the outside (z > 0) to the inside of the belt and turn down
 * behind it (tips at z = -beltT - wire). The legs come down the outside and join in a flat U
 * at y = -drop, where the item's web tab wraps the wire. Wire radius r.
 */
export function m1910Hanger(o: { spacing?: number; drop?: number; beltT?: number; r?: number; zOut?: number } = {}): THREE.BufferGeometry {
  const sp = (o.spacing ?? 0.05) / 2, drop = o.drop ?? 0.045, bt = o.beltT ?? 0.004, r = o.r ?? 0.0015;
  const zo = o.zOut ?? r + 0.0006; // leg centre in front of the belt face
  const zi = -bt - r - 0.0003; // hook leg behind the belt
  const pts: THREE.Vector3[] = [];
  const side = (s: number, rev: boolean) => {
    const x = s * sp;
    const q: THREE.Vector3[] = [
      new THREE.Vector3(x, -0.016, zi + 0.0008),
      new THREE.Vector3(x, -0.006, zi),
      new THREE.Vector3(x, -0.0012, zi * 0.7),
      new THREE.Vector3(x, 0.0012, zi * 0.25),
      new THREE.Vector3(x, 0.0016, zo * 0.2),
      new THREE.Vector3(x, 0.0008, zo * 0.8),
      new THREE.Vector3(x, -0.004, zo),
      new THREE.Vector3(x * 0.99, -drop * 0.55, zo),
      new THREE.Vector3(x * 0.93, -drop + 0.006, zo),
      new THREE.Vector3(x * 0.72, -drop, zo),
    ];
    return rev ? q.reverse() : q;
  };
  pts.push(...side(-1, false));
  pts.push(new THREE.Vector3(0, -drop - 0.0005, zo));
  pts.push(...side(1, true));
  const g = G.tube(pts, r, lodN(6, 5), lodN(90, 30));
  // rounded wire ends
  const cap = (p: THREE.Vector3) => new THREE.SphereGeometry(r, 8, 6).translate(p.x, p.y, p.z).toNonIndexed();
  return merge([g, cap(pts[0]), cap(pts[pts.length - 1])]);
}

/**
 * Tilt an object about the X axis so that it rests on both ends of its length (Z): the lowest
 * points of its rear third and front third end up at the same height. Returns the angle (rad).
 */
export function restLevelZ(obj: THREE.Object3D, range = 0.12): number {
  const verts: THREE.Vector3[] = [];
  obj.updateMatrixWorld(true);
  const inv = obj.parent ? new THREE.Matrix4().copy(obj.parent.matrixWorld).invert() : new THREE.Matrix4();
  obj.traverse((m) => {
    const mesh = m as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pa = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const mat = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld);
    const step = Math.max(1, Math.floor(pa.count / 3000));
    for (let i = 0; i < pa.count; i += step) verts.push(new THREE.Vector3().fromBufferAttribute(pa, i).applyMatrix4(mat));
  });
  let zMin = Infinity, zMax = -Infinity;
  for (const v of verts) {
    zMin = Math.min(zMin, v.z);
    zMax = Math.max(zMax, v.z);
  }
  const a = zMin + (zMax - zMin) / 3, b = zMax - (zMax - zMin) / 3;
  const score = (ang: number) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    let lo = Infinity, hi = Infinity, all = Infinity;
    for (const v of verts) {
      const y = v.y * c - v.z * s;
      all = Math.min(all, y);
      if (v.z < a) lo = Math.min(lo, y);
      else if (v.z > b) hi = Math.min(hi, y);
    }
    return { d: Math.abs(lo - hi), ok: Math.min(lo, hi) - all };
  };
  let best = 0, bestD = Infinity;
  for (let i = -60; i <= 60; i++) {
    const ang = (i / 60) * range;
    const r = score(ang);
    const d = r.d + Math.max(0, r.ok) * 4;
    if (d < bestD) {
      bestD = d;
      best = ang;
    }
  }
  obj.rotation.x += best;
  return best;
}

/** All vertices of an object's meshes in the frame of `root` (sampled). */
export function sampleVerts(obj: THREE.Object3D, root: THREE.Object3D, maxPer = 4000): THREE.Vector3[] {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const out: THREE.Vector3[] = [];
  obj.traverse((m) => {
    const mesh = m as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pa = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const mat = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld);
    const step = Math.max(1, Math.floor(pa.count / maxPer));
    for (let i = 0; i < pa.count; i += step) out.push(new THREE.Vector3().fromBufferAttribute(pa, i).applyMatrix4(mat));
  });
  return out;
}

/**
 * Roll an object about its parent's Z axis (towards -X going down) until its +X long edge also
 * touches the lowest support, i.e. the natural resting pose of a flat item that otherwise rocks on
 * a central ridge. Returns the roll angle (rad) applied to obj.rotation.z.
 */
export function restRollZ(obj: THREE.Object3D, maxDeg = 40): number {
  const root = obj.parent ?? obj;
  obj.rotation.z = 0;
  const verts = sampleVerts(obj, root, 3000);
  let xMax = -Infinity;
  for (const v of verts) xMax = Math.max(xMax, v.x);
  const edgeX = xMax * 0.72;
  let best = 0;
  for (let d = 0; d <= maxDeg; d += 0.25) {
    const a = -(d * Math.PI) / 180;
    const c = Math.cos(a), sn = Math.sin(a);
    let all = Infinity, edge = Infinity;
    for (const v of verts) {
      const y = v.x * sn + v.y * c;
      all = Math.min(all, y);
      if (v.x > edgeX) edge = Math.min(edge, y);
    }
    best = a;
    if (edge - all < 0.0006) break;
  }
  obj.rotation.z = best;
  return best;
}

/**
 * Pitch an object about its parent's X axis to its stable resting pose on a floor: the angle that
 * minimises the height of the centre of mass `com` (given in the parent frame at pitch 0) above the
 * lowest point. Returns the angle (rad) applied to obj.rotation.x (added to any existing value).
 */
export function restPitchX(obj: THREE.Object3D, com: THREE.Vector3, maxDeg = 25): number {
  const root = obj.parent ?? obj;
  const verts = sampleVerts(obj, root, 4000);
  let best = 0, bestE = Infinity;
  for (let d = -maxDeg; d <= maxDeg; d += 0.1) {
    const a = (d * Math.PI) / 180;
    const c = Math.cos(a), sn = Math.sin(a);
    let mn = Infinity;
    for (const v of verts) mn = Math.min(mn, v.y * c - v.z * sn);
    const e = com.y * c - com.z * sn - mn;
    if (e < bestE - 1e-7) {
      bestE = e;
      best = a;
    }
  }
  obj.rotation.x += best;
  return best;
}
