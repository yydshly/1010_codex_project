/**
 * Geometry helpers for the infantry module (owned here; built on the core kit).
 *
 * The core `crease()` goes through three's toCreasedNormals, whose vertex hash quantises
 * positions to 1 cm, which averages normals across neighbouring small faces (belts, buttons,
 * buckles). `fineCrease` re-creases at 0.01 mm scale; the F.* wrappers use it.
 */
import { THREE, G } from '../../../core/kit';
import { sheet as gearSheet, type SheetOptions } from '../gear/util';

type V2 = [number, number];
type V3 = [number, number, number];

export function fineCrease(g: THREE.BufferGeometry, creaseDeg = 40): THREE.BufferGeometry {
  const k = 1000;
  const src = g.index ? g.toNonIndexed() : g.clone();
  for (const name of Object.keys(src.attributes)) if (name !== 'position' && name !== 'normal') src.deleteAttribute(name);
  src.scale(k, k, k);
  const ng = G.toCreasedNormals(src, G.deg(creaseDeg));
  ng.scale(1 / k, 1 / k, 1 / k);
  return G.mergeVertices(ng, 1e-7);
}

export const F = {
  /** Lathe around +Y; the profile may run either way (it is ordered bottom-to-top so faces point outwards). */
  lathe: (profile: V2[], seg = 32, creaseDeg = 40) => {
    const pr = profile[0][1] > profile[profile.length - 1][1] ? [...profile].reverse() : profile;
    return fineCrease(new THREE.LatheGeometry(pr.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg), creaseDeg);
  },
  extrude: (s: THREE.Shape | V2[], depth: number, bevel = 0.002, curveSegments = 8, bevelSegments = 2) => fineCrease(G.extrude(s, depth, bevel, curveSegments, bevelSegments), 40),
  plate: (outline: V2[], t: number, plane: 'xy' | 'zy' | 'xz' = 'zy', bevel = 0.002, cornerRadius = 0) => fineCrease(G.plate(outline, t, plane, bevel, cornerRadius), 40),
  strap: (points: (THREE.Vector3 | V3)[], width: number, thickness: number, normals: THREE.Vector3 | V3 | (THREE.Vector3 | V3)[], opts: { closed?: boolean; samples?: number; smooth?: boolean } = {}) =>
    fineCrease(G.strap(points, width, thickness, normals, opts), 50),
  sheet: (
    points: (THREE.Vector3 | V3)[],
    normals: THREE.Vector3 | V3 | (THREE.Vector3 | V3)[],
    halfWidth: number | ((t: number, s: number, L: number) => number),
    thickness: number,
    opts: SheetOptions = {},
  ) => fineCrease(gearSheet(points, normals, halfWidth, thickness, opts), 50),
  tube: (points: (THREE.Vector3 | V3)[], r: number, radialSeg = 8, tubularSeg?: number, closed = false) => G.tube(points, r, radialSeg, tubularSeg, closed),
};

/** Rounded-rectangle outline (CCW) centred at the origin. */
export function roundRect(w: number, h: number, r: number, n = 5): V2[] {
  const pts: V2[] = [];
  const hw = w / 2, hh = h / 2, rr = Math.min(r, hw * 0.999, hh * 0.999);
  const corners: [number, number, number][] = [
    [hw - rr, hh - rr, 0],
    [-hw + rr, hh - rr, Math.PI / 2],
    [-hw + rr, -hh + rr, Math.PI],
    [hw - rr, -hh + rr, Math.PI * 1.5],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
  }
  return pts;
}

/**
 * Soft "pillow" block: a rounded box whose front face bulges by `bulge` (for filled pouches
 * and bags). Built from RoundedBoxGeometry with a smooth bulge displacement; +Z front.
 */
export function pillow(w: number, h: number, d: number, r: number, bulge: number, seg = 3, taperTop = 0): THREE.BufferGeometry {
  const g = G.rbox(w, h, d, r, seg);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const u = (2 * v.x) / w, t = (2 * v.y) / h;
    const f = Math.max(0, 1 - u * u) * Math.max(0, 1 - t * t);
    const front = THREE.MathUtils.clamp((v.z / (d / 2) + 1) / 2, 0, 1);
    v.z += bulge * f * front;
    if (taperTop) v.z -= taperTop * THREE.MathUtils.clamp(t, 0, 1) * front * d;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  return fineCrease(g, 70);
}

/** Orient a +Y-up geometry so +Y aligns with `n` at p (optional spin about n). */
export function placeY(g: THREE.BufferGeometry, p: THREE.Vector3 | V3, n: THREE.Vector3 | V3, spin = 0): THREE.BufferGeometry {
  const N = (Array.isArray(n) ? new THREE.Vector3(...n) : n.clone()).normalize();
  const P = Array.isArray(p) ? new THREE.Vector3(...p) : p;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), N);
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
  const out = g.clone();
  out.applyQuaternion(q);
  out.translate(P.x, P.y, P.z);
  return out;
}

/** Domed stud / rivet head along +Y, base at y = 0. */
export function dome(r: number, h: number, seg = 14): THREE.BufferGeometry {
  return F.lathe([[0, h], [r * 0.55, h * 0.9], [r * 0.88, h * 0.55], [r, h * 0.15], [r, 0], [0, 0]], seg, 55);
}

/** Tunic button: slightly domed pebbled disc with a rim, along +Y, base at y = 0. */
export function buttonGeo(d = 0.019, h = 0.0042): THREE.BufferGeometry {
  const r = d / 2;
  return F.lathe([[0, h], [r * 0.5, h * 0.96], [r * 0.8, h * 0.84], [r * 0.93, h * 0.8], [r, h * 0.62], [r * 0.98, h * 0.2], [r * 0.9, 0], [0, 0]], 20, 55);
}

/** Merge helper (non-indexed safe). */
export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const norm = geos.map((g) => {
    const c = g.index ? g.toNonIndexed() : g.clone();
    for (const n of Object.keys(c.attributes)) if (n !== 'position' && n !== 'normal') c.deleteAttribute(n);
    return c;
  });
  return G.mergeVertices(G.mergeGeometries(norm)!, 1e-7);
}

/** Creased-at-mm-scale loft (see G.loftZ). */
export function loftZF(sections: { z: number; ring: V2[]; dx?: number; dy?: number }[], caps = true, creaseDeg = 55): THREE.BufferGeometry {
  return fineCrease(G.loftZ(sections, caps, creaseDeg), creaseDeg);
}
