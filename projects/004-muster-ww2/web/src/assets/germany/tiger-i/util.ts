/** Small geometry helpers for the Tiger I modules (kept local to this asset). */
import { THREE, G } from '../../../core/kit';

export type V2 = [number, number];

const cboxCache = new Map<string, THREE.BufferGeometry>();
/**
 * Light chamfered box (w along X, h along Y, d along Z): chamfer on the edges around the
 * +Z/-Z faces only. ~28 triangles, for small repeated parts.
 */
export function cbox(w: number, h: number, d: number, b = 0.002): THREE.BufferGeometry {
  const key = [w, h, d, b].join(',');
  let g = cboxCache.get(key);
  if (!g) {
    const s = G.shape([
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ]);
    g = G.extrude(s, d, b, 1, 1);
    cboxCache.set(key, g);
  }
  return g.clone();
}

/** Rounded box with a single rounding segment. */
export function rb(w: number, h: number, d: number, r = 0.006): THREE.BufferGeometry {
  return G.rbox(w, h, d, r, 1);
}

/** Lathe profile (r, axial) around +Y, turned so the axis is +X (axial + -> +X). */
export function latheX(profile: V2[], seg = 36, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Lathe profile [r, axial] around +Z (axial + -> +Z). */
export function latheZ(profile: V2[], seg = 36, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Bolt-ring placements around the X axis at axial position x (for G.scatter). */
export function boltRingX(r: number, n: number, x: number, dir: 1 | -1 = 1, phase = 0): { p: THREE.Vector3; n: THREE.Vector3 }[] {
  const out: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    out.push({ p: new THREE.Vector3(x, Math.sin(a) * r, Math.cos(a) * r), n: new THREE.Vector3(dir, 0, 0) });
  }
  return out;
}

/** Bolt-ring placements around the Z axis at axial position z. */
export function boltRingZ(r: number, n: number, z: number, phase = 0): { p: THREE.Vector3; n: THREE.Vector3 }[] {
  const out: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    out.push({ p: new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z), n: new THREE.Vector3(0, 0, 1) });
  }
  return out;
}

let nutGeo: THREE.BufferGeometry | null = null;
/** Plain hex nut / bolt head (24 triangles), +Y up, base at y = 0. */
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

/** Convex outline (CCW) around several circles, in 2D (for cast arms and brackets). */
export function hullOutline(circles: { c: V2; r: number }[], seg = 10): V2[] {
  const pts: V2[] = [];
  for (const k of circles)
    for (let i = 0; i < seg * 2; i++) {
      const a = (i / (seg * 2)) * Math.PI * 2;
      pts.push([k.c[0] + Math.cos(a) * k.r, k.c[1] + Math.sin(a) * k.r]);
    }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: V2[] = [], upper: V2[] = [];
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

/** Points of a circle (for extrude holes), clockwise. */
export function circlePts(r: number, n: number, cx = 0, cy = 0): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = -(i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** Scatter a geometry at placements given as [x,y,z] points all sharing one normal. */
export function scatterN(g: THREE.BufferGeometry, pts: G.V3[], n: G.V3): THREE.BufferGeometry {
  return G.scatter(g, pts.map((p) => ({ p, n })));
}

/** Group placed with an explicit basis (x, y, z axes, orthonormal, right-handed) at origin o. */
export function basisGroup(children: THREE.Object3D[], o: THREE.Vector3, x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  g.position.copy(o);
  return g;
}

/** Annular sector (angles in degrees, 0 = +X, 90 = +Y) extruded along +Z over [z0, z1]. */
export function arcBand(r0: number, r1: number, a0: number, a1: number, z0: number, z1: number, seg = 12, bevel = 0.002): THREE.BufferGeometry {
  const pts: V2[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = ((a0 + ((a1 - a0) * i) / seg) * Math.PI) / 180;
    pts.push([Math.cos(a) * r1, Math.sin(a) * r1]);
  }
  for (let i = seg; i >= 0; i--) {
    const a = ((a0 + ((a1 - a0) * i) / seg) * Math.PI) / 180;
    pts.push([Math.cos(a) * r0, Math.sin(a) * r0]);
  }
  const g = G.extrude(G.shape(pts), z1 - z0, bevel, 1, 1);
  g.translate(0, 0, (z0 + z1) / 2);
  return g;
}

/** Merge an array of geometries (indexed or not). */
export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return G.mergeGeometries(list.map((p) => (p.index ? p.toNonIndexed() : p)))!;
}

/** Weld bead along a polyline, light (5-sided), slightly lumpy. */
export function bead(pts: G.V3[], r = 0.0065): THREE.BufferGeometry {
  const P3 = pts.map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(P3, false, 'centripetal');
  const len = curve.getLength();
  const segs = Math.max(6, Math.round(len / 0.022));
  const g = new THREE.TubeGeometry(curve, segs, r, 5, false);
  const pos = g.attributes.position;
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, c);
    const s = 1 + 0.2 * Math.sin(i * 2.1);
    for (let j = 0; j <= 5; j++) {
      const k = i * 6 + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(s).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Wire rope: a tube along a smooth path whose radius is modulated by a helical three-strand
 * pattern (lay length `lay`), so the cable reads as twisted strands at close range.
 */
export function rope(points: G.V3[], r: number, lay = 0.07, closed = false): THREE.BufferGeometry {
  const P3 = points.map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(P3, closed, 'centripetal', 0.5);
  const len = curve.getLength();
  const segs = Math.max(8, Math.round(len / (lay / 5)));
  const radial = 9;
  const g = new THREE.TubeGeometry(curve, segs, r, radial, closed);
  const pos = g.attributes.position;
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, c);
    const s = t * len;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      const th = (j / radial) * Math.PI * 2;
      const f = 1 + 0.16 * Math.cos(3 * th - (2 * Math.PI * s) / lay);
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(f * 0.93).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Cross-section quad of a plate whose outer face runs A->B, thickness t along the unit normal n. */
export function sect(A: V2, B: V2, t: number, n: V2): V2[] {
  return [A, B, [B[0] + n[0] * t, B[1] + n[1] * t], [A[0] + n[0] * t, A[1] + n[1] * t]];
}

/** Unit normal of segment A->B pointing to the side of point `towards`. */
export function nrm(A: V2, B: V2, towards: V2): V2 {
  const dz = B[0] - A[0], dy = B[1] - A[1];
  const l = Math.hypot(dz, dy);
  let n: V2 = [-dy / l, dz / l];
  const mz = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
  if ((towards[0] - mz) * n[0] + (towards[1] - my) * n[1] < 0) n = [-n[0], -n[1]];
  return n;
}

export const lerp2 = (A: V2, B: V2, t: number): V2 => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];

/** Z of the line A->B (points (z, y)) at height y. */
export function zAt(A: V2, B: V2, y: number): number {
  return A[0] + ((y - A[1]) / (B[1] - A[1])) * (B[0] - A[0]);
}

/** Plate from a (z, y) side outline spanning x0..x1. */
export function prismX(outline: V2[], x0: number, x1: number, bevel = 0.004): THREE.BufferGeometry {
  const g = G.plate(outline, x1 - x0, 'zy', bevel);
  g.translate((x0 + x1) / 2, 0, 0);
  return g;
}

/** Plate from a (z, y) outline with holes (clockwise), thickness t along X, centred on x = 0. */
export function slabZY(outline: V2[], holes: V2[][], t: number, bevel = 0.004): THREE.BufferGeometry {
  const g = G.extrude(G.shape(outline, 0, holes), t, bevel, 6, 1);
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  G.flipWinding(g);
  return g;
}

/** Plate from an (x, y) outline with holes (clockwise), thickness t along Z, centred on z = 0. */
export function slabXY(outline: V2[], holes: V2[][], t: number, bevel = 0.004): THREE.BufferGeometry {
  return G.extrude(G.shape(outline, 0, holes), t, bevel, 6, 1);
}

/** Arc points (z, y) around centre c from angle a0 to a1 (degrees, 0 = +z, 90 = +y). */
export function arcPts(c: V2, r: number, a0: number, a1: number, n = 10): V2[] {
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
  }
  return out;
}

/** Plate from an (x, z) top outline spanning y0..y1 ('xz' plate maps outline y to +Z). */
export function prismY(outline: V2[], y0: number, y1: number, bevel = 0.004): THREE.BufferGeometry {
  const g = G.plate(outline, y1 - y0, 'xz', bevel);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
