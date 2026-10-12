/**
 * Geometry helpers for procedural hard-surface modelling.
 * All helpers return THREE.BufferGeometry in metres. Position them with `part()`
 * (see kit.ts), then let bake.ts merge everything per material.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LoftGeometry } from 'three/addons/geometries/LoftGeometry.js';
import { mergeGeometries, mergeVertices, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

export { LoftGeometry, mergeGeometries, mergeVertices, toCreasedNormals };

export type V2 = [number, number];
export type V3 = [number, number, number];
export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const deg = (d: number) => (d * Math.PI) / 180;

/** Axis-aligned box with rounded (bevelled) edges. r is clamped to half the smallest side. */
export function rbox(w: number, h: number, d: number, r = 0.004, segments = 2): THREE.BufferGeometry {
  const rr = Math.max(0.0001, Math.min(r, w / 2 - 1e-5, h / 2 - 1e-5, d / 2 - 1e-5));
  return new RoundedBoxGeometry(w, h, d, segments, rr);
}

/** Plain box (sharp edges). */
export function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d);
}

/** Cylinder along +Y, centred. */
export function cyl(rTop: number, rBottom: number, h: number, seg = 24, open = false): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open);
}

/**
 * Lathe around +Y from a profile of [radius, y] points (bottom to top).
 * Normals are creased at sharp profile corners (> creaseDeg).
 */
export function lathe(profile: V2[], seg = 32, creaseDeg = 40, phiStart = 0, phiLength = Math.PI * 2): THREE.BufferGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
  const g = new THREE.LatheGeometry(pts, seg, phiStart, phiLength);
  return crease(g, creaseDeg);
}

/** Smooth normals across angles below creaseDeg, split above (good for hard-surface). */
export function crease(g: THREE.BufferGeometry, creaseDeg = 35): THREE.BufferGeometry {
  const ng = toCreasedNormals(g.index ? g.toNonIndexed() : g, deg(creaseDeg));
  return mergeVertices(ng, 1e-6);
}

/** Shape from 2D points (counter-clockwise), optional per-corner rounding radius. */
export function shape(points: V2[], cornerRadius = 0, holes: V2[][] = []): THREE.Shape {
  const s = new THREE.Shape();
  roundedPath(s, points, cornerRadius);
  for (const h of holes) {
    const p = new THREE.Path();
    roundedPath(p, h, cornerRadius * 0.5);
    s.holes.push(p);
  }
  return s;
}

function roundedPath(p: THREE.Path, pts: V2[], r: number) {
  const n = pts.length;
  if (r <= 0) {
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n; i++) p.lineTo(pts[i][0], pts[i][1]);
    p.closePath();
    return;
  }
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const ab = [b[0] - a[0], b[1] - a[1]], bc = [c[0] - b[0], c[1] - b[1]];
    const lab = Math.hypot(ab[0], ab[1]), lbc = Math.hypot(bc[0], bc[1]);
    const rr = Math.min(r, lab / 2, lbc / 2);
    const p1: V2 = [b[0] - (ab[0] / lab) * rr, b[1] - (ab[1] / lab) * rr];
    const p2: V2 = [b[0] + (bc[0] / lbc) * rr, b[1] + (bc[1] / lbc) * rr];
    if (i === 0) p.moveTo(p1[0], p1[1]);
    else p.lineTo(p1[0], p1[1]);
    p.quadraticCurveTo(b[0], b[1], p2[0], p2[1]);
  }
  p.closePath();
}

/**
 * Extrude a 2D outline (in the XY plane) along Z by `depth`, centred on Z,
 * with a small chamfer/bevel for believable edges. Great for armour plates,
 * gun shields, brackets, stock profiles (then rotate into place).
 */
export function extrude(s: THREE.Shape | V2[], depth: number, bevel = 0.003, curveSegments = 8, bevelSegments = 2): THREE.BufferGeometry {
  const sh = Array.isArray(s) ? shape(s) : s;
  const b = Math.max(0, Math.min(bevel, depth / 2 - 1e-5));
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: Math.max(1e-5, depth - 2 * b),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b,
    bevelSegments,
    curveSegments,
  });
  g.translate(0, 0, -(depth - 2 * b) / 2);
  return crease(g, 40);
}

/**
 * Armour-plate style slab: 2D outline + thickness t, oriented by `plane`:
 *  - 'xy': outline x -> X, outline y -> Y, thickness along Z
 *  - 'zy': outline x -> Z, outline y -> Y, thickness along X (side-view drawings)
 *  - 'xz': outline x -> X, outline y -> Z, thickness along Y (top-view drawings)
 * The slab is centred on its thickness axis.
 */
export function plate(outline: V2[], t: number, plane: 'xy' | 'zy' | 'xz' = 'zy', bevel = 0.004, cornerRadius = 0): THREE.BufferGeometry {
  const g = extrude(shape(outline, cornerRadius), t, bevel);
  if (plane === 'xy') return g;
  const m = new THREE.Matrix4();
  if (plane === 'zy') m.set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
  else m.set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  g.applyMatrix4(m); // a reflection: normals are transformed correctly, winding must be flipped
  flipWinding(g);
  return g;
}

/** Reverse triangle winding (after a mirroring transform). Normals are left untouched. */
export function flipWinding(g: THREE.BufferGeometry) {
  const idx = g.index;
  if (idx) {
    const a = idx.array as Uint32Array | Uint16Array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = t;
    }
    idx.needsUpdate = true;
    return;
  }
  for (const name of Object.keys(g.attributes)) {
    const at = g.attributes[name] as THREE.BufferAttribute;
    const s = at.itemSize, arr = at.array as Float32Array;
    for (let v = 0; v + 2 < at.count; v += 3) {
      for (let c = 0; c < s; c++) {
        const i1 = (v + 1) * s + c, i2 = (v + 2) * s + c;
        const t = arr[i1];
        arr[i1] = arr[i2];
        arr[i2] = t;
      }
    }
    at.needsUpdate = true;
  }
}

/** Cylinder/rod between two points (optionally tapered: rEnd at b). */
export function rod(a: THREE.Vector3 | V3, b: THREE.Vector3 | V3, r: number, seg = 12, rEnd?: number): THREE.BufferGeometry {
  const A = Array.isArray(a) ? v3(...a) : a, B = Array.isArray(b) ? v3(...b) : b;
  const len = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(rEnd ?? r, r, len, seg, 1, false);
  g.translate(0, len / 2, 0);
  const dir = B.clone().sub(A).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.applyQuaternion(q);
  g.translate(A.x, A.y, A.z);
  return g;
}

/** Tube along a smooth curve through points. */
export function tube(points: (THREE.Vector3 | V3)[], r: number, radialSeg = 10, tubularSeg?: number, closed = false): THREE.BufferGeometry {
  const P = points.map((p) => (Array.isArray(p) ? v3(...p) : p));
  const curve = new THREE.CatmullRomCurve3(P, closed, 'centripetal', 0.5);
  return new THREE.TubeGeometry(curve, tubularSeg ?? Math.max(8, P.length * 8), r, radialSeg, closed);
}

/**
 * Flat strap (belt, sling, webbing) swept along a path with a rectangular section.
 * `normals` is the strap's outward face direction at each point (e.g. away from the body),
 * or one vector used everywhere.
 */
export function strap(
  points: (THREE.Vector3 | V3)[],
  width: number,
  thickness: number,
  normals: THREE.Vector3 | V3 | (THREE.Vector3 | V3)[],
  opts: { closed?: boolean; samples?: number; smooth?: boolean } = {},
): THREE.BufferGeometry {
  const P = points.map((p) => (Array.isArray(p) ? v3(...p) : p.clone()));
  const perPoint = Array.isArray(normals) && (Array.isArray(normals[0]) || normals[0] instanceof THREE.Vector3);
  const Nraw = perPoint
    ? (normals as (THREE.Vector3 | V3)[]).map((n) => (Array.isArray(n) ? v3(...n) : n.clone()).normalize())
    : P.map(() => (Array.isArray(normals) ? v3(...(normals as V3)) : (normals as THREE.Vector3).clone()).normalize());
  const closed = opts.closed ?? false;
  const samples = opts.samples ?? Math.max(2, P.length * (opts.smooth === false ? 1 : 6));
  let pts: THREE.Vector3[], nrm: THREE.Vector3[];
  if (opts.smooth === false || P.length < 3) {
    pts = P;
    nrm = Nraw;
  } else {
    const c = new THREE.CatmullRomCurve3(P, closed, 'centripetal');
    const cn = new THREE.CatmullRomCurve3(Nraw.map((n) => n.clone()), closed, 'centripetal');
    pts = [];
    nrm = [];
    const count = closed ? samples : samples + 1;
    for (let i = 0; i < count; i++) {
      const t = Math.min(i / samples, 1);
      pts.push(c.getPoint(t));
      nrm.push(cn.getPoint(t).normalize());
    }
  }
  const n = pts.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const hw = width / 2, ht = thickness / 2;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const t = next.clone().sub(prev).normalize();
    const N = nrm[i].clone().sub(t.clone().multiplyScalar(nrm[i].dot(t))).normalize();
    const B = t.clone().cross(N).normalize();
    const c = [
      p.clone().addScaledVector(B, -hw).addScaledVector(N, ht),
      p.clone().addScaledVector(B, hw).addScaledVector(N, ht),
      p.clone().addScaledVector(B, hw).addScaledVector(N, -ht),
      p.clone().addScaledVector(B, -hw).addScaledVector(N, -ht),
    ];
    for (const q of c) pos.push(q.x, q.y, q.z);
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = i * 4, b = ((i + 1) % n) * 4;
    for (let s = 0; s < 4; s++) {
      const s1 = (s + 1) % 4;
      idx.push(a + s, b + s, b + s1, a + s, b + s1, a + s1);
    }
  }
  if (!closed) {
    const e = (n - 1) * 4;
    idx.push(0, 2, 1, 0, 3, 2);
    idx.push(e, e + 1, e + 2, e, e + 2, e + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const ng = crease(g, 50);
  ensureOutward(ng);
  return ng;
}

/** Heuristic for closed-ish shapes: if most normals point towards the centroid, flip. */
export function ensureOutward(g: THREE.BufferGeometry) {
  g.computeBoundingBox();
  const c = g.boundingBox!.getCenter(new THREE.Vector3());
  const p = g.attributes.position, n = g.attributes.normal;
  let score = 0;
  const tmp = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i += Math.max(1, Math.floor(p.count / 400))) {
    tmp.fromBufferAttribute(p, i).sub(c);
    nn.fromBufferAttribute(n, i);
    score += Math.sign(tmp.dot(nn));
  }
  if (score < 0) {
    flipWinding(g);
    const arr = n.array as Float32Array;
    for (let i = 0; i < arr.length; i++) arr[i] = -arr[i];
    n.needsUpdate = true;
  }
}

/**
 * Loft through cross-sections given as 2D rings placed along +Z.
 * sections: [{ z, ring: [x,y][] , dx?, dy? }]. All rings need the same point count.
 */
export function loftZ(sections: { z: number; ring: V2[]; dx?: number; dy?: number }[], caps = true, creaseDeg = 55): THREE.BufferGeometry {
  const secs = sections.map((s) => s.ring.map(([x, y]) => new THREE.Vector3(x + (s.dx ?? 0), y + (s.dy ?? 0), s.z)));
  const g = new LoftGeometry(secs, { closed: true, capStart: caps, capEnd: caps });
  const out = crease(g, creaseDeg);
  ensureOutward(out);
  return out;
}

/**
 * Super-ellipse ring (rounded-rectangle-like section) with n points, CCW seen from +Z.
 * a = half width, b = half height (or yTop / yBottom for asymmetric sections).
 */
export function superRing(a: number, b: number, n = 32, exp = 2.5, yTop?: number, yBottom?: number): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / exp);
    let y = Math.sign(s) * Math.pow(Math.abs(s), 2 / exp);
    y = y >= 0 ? y * (yTop ?? b) : y * (yBottom ?? b);
    pts.push([x, y]);
  }
  return pts;
}

/** Hex bolt head (with washer) pointing along +Y, base at y=0. */
export function boltHead(size = 0.012, height = 0.006): THREE.BufferGeometry {
  const head = new THREE.CylinderGeometry(size / 2, size / 2, height, 6, 1);
  head.translate(0, height / 2 + height * 0.25, 0);
  const washer = new THREE.CylinderGeometry(size * 0.62, size * 0.62, height * 0.25, 16, 1);
  washer.translate(0, height * 0.125, 0);
  return crease(mergeGeometries([head.toNonIndexed(), washer.toNonIndexed()])!, 30);
}

/** Dome rivet head along +Y, base at y = 0. */
export function rivetHead(r = 0.006): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, 0.55, 1);
  return g;
}

/**
 * Place copies of a small geometry at many transforms and merge them into one geometry.
 * Each placement: position + surface normal (the geometry's +Y is aligned to the normal).
 */
export function scatter(g: THREE.BufferGeometry, placements: { p: THREE.Vector3 | V3; n?: THREE.Vector3 | V3; spin?: number; s?: number }[]): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const base = g.index ? g.toNonIndexed() : g;
  for (const pl of placements) {
    const p = Array.isArray(pl.p) ? v3(...pl.p) : pl.p;
    const n = pl.n ? (Array.isArray(pl.n) ? v3(...pl.n) : pl.n.clone()).normalize() : up.clone();
    const q = new THREE.Quaternion().setFromUnitVectors(up, n);
    if (pl.spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(up, pl.spin));
    const sc = pl.s ?? 1;
    const m = new THREE.Matrix4().compose(p, q, new THREE.Vector3(sc, sc, sc));
    parts.push(base.clone().applyMatrix4(m));
  }
  return mergeGeometries(parts)!;
}

/** Evenly spaced points along a segment (inclusive), handy for bolt rows. */
export function along(a: V3, b: V3, count: number): THREE.Vector3[] {
  const A = v3(...a), B = v3(...b);
  if (count <= 1) return [A.clone().lerp(B, 0.5)];
  return Array.from({ length: count }, (_, i) => A.clone().lerp(B, i / (count - 1)));
}

/** Torus section (handles, rims). Lies in the XY plane. */
export function torus(R: number, r: number, radialSeg = 10, tubularSeg = 32, arc = Math.PI * 2): THREE.BufferGeometry {
  return new THREE.TorusGeometry(R, r, radialSeg, tubularSeg, arc);
}

/** Weld bead along a polyline: slightly lumpy tube. */
export function weld(points: (THREE.Vector3 | V3)[], r = 0.004): THREE.BufferGeometry {
  const P = points.map((p) => (Array.isArray(p) ? v3(...p) : p));
  const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
  const len = curve.getLength();
  const segs = Math.max(8, Math.round(len / (r * 1.5)));
  const radial = 6;
  const g = new THREE.TubeGeometry(curve, segs, r, radial, false);
  const pos = g.attributes.position;
  const tmp = new THREE.Vector3();
  const ctr = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, ctr);
    const s = 1 + 0.18 * Math.sin(i * 1.7);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      if (k >= pos.count) break;
      tmp.fromBufferAttribute(pos, k).sub(ctr).multiplyScalar(s).add(ctr);
      pos.setXYZ(k, tmp.x, tmp.y, tmp.z);
    }
  }
  g.computeVertexNormals();
  return g;
}
