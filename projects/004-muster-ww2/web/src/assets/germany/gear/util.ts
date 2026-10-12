/**
 * Small modelling helpers shared by the German field-gear pieces.
 * (Local to this folder; nothing here is part of the core kit.)
 */
import { THREE, G } from '../../../core/kit';

type V3 = [number, number, number];
const toV = (p: THREE.Vector3 | V3) => (Array.isArray(p) ? new THREE.Vector3(...p) : p.clone());

/**
 * Parametric grid surface. fn(u, v) returns a point for u,v in [0,1].
 * closedU wraps u (the seam is welded). Normals from the geometry (smooth).
 */
export function paramSurface(
  fn: (u: number, v: number) => THREE.Vector3,
  nu: number,
  nv: number,
  closedU = false,
  flip = false,
): THREE.BufferGeometry {
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
  /** Grid columns across the width (default 6). */
  across?: number;
  /** Samples along the path (default points * 8). */
  samples?: number;
  /** Close the path into a loop. */
  closed?: boolean;
  /** Curvature across the width: offset along N = bulge * (1 - x^2). */
  bulge?: number;
}

/**
 * A thin sheet (flap, strap with shaped ends, belt loop, liner finger) swept along a path.
 * `normals` = outward face direction per point (or one for all). `halfWidth(t, s, L)` gives the
 * half-width at parameter t in [0,1] (s = arc length, L = total length) so ends can be rounded or pointed.
 */
export function sheet(
  points: (THREE.Vector3 | V3)[],
  normals: THREE.Vector3 | V3 | (THREE.Vector3 | V3)[],
  halfWidth: number | ((t: number, s: number, L: number) => number),
  thickness: number,
  opts: SheetOptions = {},
): THREE.BufferGeometry {
  const P = points.map(toV);
  const perPoint = Array.isArray(normals) && (Array.isArray(normals[0]) || normals[0] instanceof THREE.Vector3);
  const Nraw = perPoint
    ? (normals as (THREE.Vector3 | V3)[]).map((n) => toV(n).normalize())
    : P.map(() => toV(normals as THREE.Vector3 | V3).normalize());
  const closed = opts.closed ?? false;
  const samples = opts.samples ?? Math.max(4, P.length * 8);
  let pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
  if (P.length < 3) {
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      pts.push(P[0].clone().lerp(P[1], t));
      nrm.push(Nraw[0].clone().lerp(Nraw[1], t).normalize());
    }
  } else {
    const c = new THREE.CatmullRomCurve3(P, closed, 'centripetal');
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
  const nx = opts.across ?? 6;
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
  const T = (i: number, j: number) => i * rowSize + j * 2;
  const Bo = (i: number, j: number) => i * rowSize + j * 2 + 1;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const i2 = (i + 1) % n;
    for (let j = 0; j < nx; j++) {
      idx.push(T(i, j), T(i2, j), T(i2, j + 1), T(i, j), T(i2, j + 1), T(i, j + 1));
      idx.push(Bo(i, j), Bo(i2, j + 1), Bo(i2, j), Bo(i, j), Bo(i, j + 1), Bo(i2, j + 1));
    }
    // side walls
    idx.push(T(i, 0), Bo(i, 0), Bo(i2, 0), T(i, 0), Bo(i2, 0), T(i2, 0));
    idx.push(T(i, nx), T(i2, nx), Bo(i2, nx), T(i, nx), Bo(i2, nx), Bo(i, nx));
  }
  if (!closed) {
    const e = n - 1;
    for (let j = 0; j < nx; j++) {
      idx.push(T(0, j), T(0, j + 1), Bo(0, j + 1), T(0, j), Bo(0, j + 1), Bo(0, j));
      idx.push(T(e, j), Bo(e, j + 1), T(e, j + 1), T(e, j), Bo(e, j), Bo(e, j + 1));
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

/** Half-width profile with a pointed tongue at the end (strap ends). */
export function pointedEnd(hw: number, tipLen: number) {
  return (_t: number, s: number, L: number) => {
    if (s > L - tipLen) {
      const k = (L - s) / tipLen; // 1 -> 0
      return hw * (0.35 + 0.65 * Math.sqrt(Math.max(0, k)));
    }
    return hw;
  };
}

/**
 * A row of stitches along a path, sitting on a surface with outward normal(s).
 * Each stitch is a tiny flattened capsule-ish box. Returns one merged geometry.
 */
export function stitches(
  points: (THREE.Vector3 | V3)[],
  normal: THREE.Vector3 | V3 | ((p: THREE.Vector3) => THREE.Vector3),
  spacing = 0.004,
  size: { len?: number; w?: number; h?: number } = {},
  closed = false,
): THREE.BufferGeometry {
  const P = points.map(toV);
  const curve = P.length > 2 ? new THREE.CatmullRomCurve3(P, closed, 'centripetal') : new THREE.LineCurve3(P[0], P[1]);
  const L = curve.getLength();
  const n = Math.max(1, Math.floor(L / spacing));
  const len = size.len ?? spacing * 0.62, w = size.w ?? 0.0009, h = size.h ?? 0.0006;
  // stitch = small box without its bottom face (it sits on the surface)
  const box = new THREE.BoxGeometry(w, h, len).toNonIndexed();
  const bp = box.attributes.position.array as Float32Array, bn = box.attributes.normal.array as Float32Array;
  const keepP: number[] = [], keepN: number[] = [];
  for (let v = 0; v < bp.length / 3; v++) {
    if (v >= 18 && v < 24) continue; // -Y face
    keepP.push(bp[v * 3], bp[v * 3 + 1], bp[v * 3 + 2]);
    keepN.push(bn[v * 3], bn[v * 3 + 1], bn[v * 3 + 2]);
  }
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', new THREE.Float32BufferAttribute(keepP, 3));
  base.setAttribute('normal', new THREE.Float32BufferAttribute(keepN, 3));
  base.translate(0, h * 0.15, 0);
  const geos: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const nr = typeof normal === 'function' ? normal(p) : toV(normal as THREE.Vector3 | V3);
    const N = nr.clone().sub(tan.clone().multiplyScalar(nr.dot(tan))).normalize();
    const X = N.clone().cross(tan).normalize();
    m.makeBasis(X, N, tan).setPosition(p);
    geos.push(base.clone().applyMatrix4(m));
  }
  return G.mergeGeometries(geos)!;
}

/**
 * Rectangular strap buckle (roller-less frame buckle) in the XY plane, facing +Z.
 * w = inner width (strap width + clearance), h = inner height, r = wire radius.
 * Includes centre bar and tongue (prong) pointing towards -Y.
 */
export function frameBuckle(w: number, h: number, r: number, bar = true): THREE.BufferGeometry {
  const hw = w / 2 + r, hh = h / 2 + r, c = r * 2.2;
  const loop: V3[] = [
    [-hw + c, hh, 0], [hw - c, hh, 0], [hw, hh - c, 0], [hw, -hh + c, 0], [hw - c, -hh, 0], [-hw + c, -hh, 0], [-hw, -hh + c, 0], [-hw, hh - c, 0],
  ];
  const parts: THREE.BufferGeometry[] = [G.tube(loop, r, 8, 64, true).toNonIndexed()];
  if (bar) {
    parts.push(G.rod([-hw, 0, 0], [hw, 0, 0], r * 0.9, 8).toNonIndexed());
    // prong from the bar, resting across the lower half
    parts.push(G.tube([[0, 0, r * 0.9], [0, -hh * 0.5, r * 1.6], [0, -hh - r * 0.6, r * 1.2]], r * 0.6, 6, 12).toNonIndexed());
  }
  return G.mergeGeometries(parts)!;
}

/** D-ring in the XY plane (flat side along the top, at y = 0), wire radius r. */
export function dRing(w: number, h: number, r: number): THREE.BufferGeometry {
  const pts: V3[] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI; // bottom half-ellipse
    pts.push([Math.cos(a) * w * 0.5, Math.sin(a) * h, 0]);
  }
  // pts go from (-w/2,0) down to (0,-h) to (w/2,0); closed by the straight bar
  const ring = G.tube(pts, r, 8, 40).toNonIndexed();
  const bar = G.rod([-w / 2, 0, 0], [w / 2, 0, 0], r, 8).toNonIndexed();
  const caps = [
    new THREE.SphereGeometry(r, 8, 6).translate(-w / 2, 0, 0).toNonIndexed(),
    new THREE.SphereGeometry(r, 8, 6).translate(w / 2, 0, 0).toNonIndexed(),
  ];
  return G.mergeGeometries([ring, bar, ...caps])!;
}

/** Press stud / snap head (domed disc) along +Y, base at y = 0. */
export function pressStud(r = 0.0055, h = 0.0028): THREE.BufferGeometry {
  return G.lathe([[0, h], [r * 0.45, h * 0.97], [r * 0.8, h * 0.8], [r, h * 0.45], [r * 1.02, 0.0002], [0, 0]], 20, 50);
}

/** Domed rivet / pin head along +Y. */
export function domeHead(r: number, h: number, seg = 16): THREE.BufferGeometry {
  return G.lathe([[0, h], [r * 0.55, h * 0.88], [r * 0.9, h * 0.5], [r, h * 0.12], [r, 0], [0, 0]], seg, 50);
}

/** Orient a +Y-up geometry so +Y aligns with `n` and place it at p. */
export function placeAlong(g: THREE.BufferGeometry, p: THREE.Vector3 | V3, n: THREE.Vector3 | V3, spin = 0): THREE.BufferGeometry {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), toV(n).normalize());
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
  const out = g.clone();
  out.applyQuaternion(q);
  const P = toV(p);
  out.translate(P.x, P.y, P.z);
  return out;
}

/**
 * Face normals for a path lying in a plane: N_i = axis x T_i (so a sheet's width runs along
 * `axis`). flip reverses them.
 */
export function planarNormals(points: (THREE.Vector3 | V3)[], axis: V3 = [1, 0, 0], flip = false): THREE.Vector3[] {
  const P = points.map(toV);
  const ax = new THREE.Vector3(...axis);
  return P.map((_, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const n = ax.clone().cross(b.clone().sub(a).normalize()).normalize();
    return flip ? n.negate() : n;
  });
}

/** Smoothstep. */
export const sstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
