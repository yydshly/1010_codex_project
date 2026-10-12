/**
 * Small geometry helpers shared by the German weapon models (Kar98k, MG 42 assembly).
 * All in metres. Nothing here depends on a particular weapon.
 */
import { THREE, G } from '../../../../core/kit';

export type V2 = [number, number];
export type V3 = [number, number, number];
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const RAD = Math.PI / 180;

/** Lathe around +Z from a profile of [radius, z] points (z increasing). */
export function latheZ(profile: V2[], seg = 32, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg);
  g.rotateX(Math.PI / 2); // lathe +Y -> +Z
  return g;
}

/** Lathe around +X from a profile of [radius, x] points (x increasing). */
export function latheX(profile: V2[], seg = 24, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg);
  g.rotateZ(-Math.PI / 2); // lathe +Y -> +X
  return g;
}

/** Lathe around +Y (profile [radius, y]). */
export const latheY = (profile: V2[], seg = 24, creaseDeg = 40) => G.lathe(profile, seg, creaseDeg);

/** Cylinder along +Z centred at the origin. */
export function cylZ(r: number, len: number, seg = 16): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Cylinder along +X centred at the origin. */
export function cylX(r: number, len: number, seg = 12): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
  g.rotateZ(Math.PI / 2);
  return g;
}

/** Annular sector outline in the XY plane (angles in degrees, 0 = +X, CCW). */
export function sector2D(rOut: number, rIn: number, a0: number, a1: number, n = 24, cx = 0, cy = 0): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * RAD;
    pts.push([cx + rOut * Math.cos(a), cy + rOut * Math.sin(a)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = (a0 + ((a1 - a0) * i) / n) * RAD;
    pts.push([cx + rIn * Math.cos(a), cy + rIn * Math.sin(a)]);
  }
  return pts;
}

/** Stadium (slot) outline centred at (cu, cv): total length lu along u, height lv along v (CCW). */
export function stadium(cu: number, cv: number, lu: number, lv: number, nHalf = 8): V2[] {
  const vertical = lv > lu;
  const L = vertical ? lv : lu, T = vertical ? lu : lv;
  const r = T / 2, half = Math.max(0, L / 2 - r);
  const pts: V2[] = [];
  for (let i = 0; i <= nHalf; i++) {
    const a = -Math.PI / 2 + (i / nHalf) * Math.PI;
    pts.push([half + r * Math.cos(a), r * Math.sin(a)]);
  }
  for (let i = 0; i <= nHalf; i++) {
    const a = Math.PI / 2 + (i / nHalf) * Math.PI;
    pts.push([-half + r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts.map(([a, b]) => (vertical ? [cu - b, cv + a] : [cu + a, cv + b]) as V2);
}

/** Rounded rectangle outline (CCW) centred at (cu, cv). */
export function roundRect(cu: number, cv: number, w: number, h: number, r: number, n = 4): V2[] {
  const rr = Math.min(r, w / 2 - 1e-5, h / 2 - 1e-5);
  const pts: V2[] = [];
  const cs: [number, number, number][] = [
    [cu + w / 2 - rr, cv - h / 2 + rr, -90],
    [cu + w / 2 - rr, cv + h / 2 - rr, 0],
    [cu - w / 2 + rr, cv + h / 2 - rr, 90],
    [cu - w / 2 + rr, cv - h / 2 + rr, 180],
  ];
  for (const [x, y, a0] of cs) {
    for (let i = 0; i <= n; i++) {
      const a = (a0 + (i / n) * 90) * RAD;
      pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]);
    }
  }
  return pts;
}

/** Signed area (positive = CCW). */
export function area2D(p: V2[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

/** Make an outline CCW. */
export const ccw = (p: V2[]): V2[] => (area2D(p) < 0 ? [...p].reverse() : p);

/**
 * Extrude an outline (XY plane, with holes) along +Z from z0 to z1 with a small bevel.
 * Holes are cut through (real side walls), so openings have depth.
 */
export function extrudeZ(outline: V2[], holes: V2[][], z0: number, z1: number, bevel = 0.0004, curveSegments = 4): THREE.BufferGeometry {
  const s = new THREE.Shape(ccw(outline).map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) s.holes.push(new THREE.Path(ccw(h).reverse().map(([x, y]) => new THREE.Vector2(x, y))));
  const depth = z1 - z0;
  const b = Math.max(0, Math.min(bevel, depth / 2 - 1e-5));
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(1e-5, depth - 2 * b),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b,
    bevelSegments: 1,
    curveSegments,
  });
  g.translate(0, 0, z0 + b);
  return G.crease(g, 40);
}

/**
 * Side-view plate: outline in (z, y), thickness t along X centred on x = 0, holes cut through.
 */
export function plateZY(outline: V2[], t: number, holes: V2[][] = [], bevel = 0.0005): THREE.BufferGeometry {
  // build in XY with (u -> X = z, v -> Y = y), extrude along Z, then swap X <-> Z
  const g = extrudeZ(outline, holes, -t / 2, t / 2, bevel);
  const m = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
  g.applyMatrix4(m);
  G.flipWinding(g);
  return g;
}

/** Top-view plate: outline in (x, z), thickness t along Y centred on y = 0. */
export function plateXZ(outline: V2[], t: number, holes: V2[][] = [], bevel = 0.0005): THREE.BufferGeometry {
  const g = extrudeZ(outline, holes, -t / 2, t / 2, bevel);
  const m = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  g.applyMatrix4(m);
  G.flipWinding(g);
  return g;
}

/** Offset vertices by a function of their position; optionally recompute normals. */
export function warp(g: THREE.BufferGeometry, fn: (p: THREE.Vector3) => void, recompute = true): THREE.BufferGeometry {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    fn(p);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  if (recompute) g.computeVertexNormals();
  return g;
}

/** Matrix from an orthonormal basis (columns) and an origin. */
export function basis(x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3, o: THREE.Vector3): THREE.Matrix4 {
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(o);
}

/** Quaternion rotating +Y onto dir. */
export const yTo = (dir: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

/**
 * Slotted screw head (domed cheese head) whose +Y axis points out of the surface; base at y = 0.
 * Returns [head, slot] geometries so the slot can use a dark recess material.
 */
export function screwParts(r: number, h: number, slotDeg = 30, seg = 18): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const head = G.lathe(
    [
      [0, -0.0004],
      [r * 0.98, -0.0004],
      [r, h * 0.3],
      [r * 0.86, h * 0.8],
      [r * 0.5, h],
      [0, h],
    ],
    seg,
    50,
  );
  const slot = new THREE.BoxGeometry(r * 1.9, h * 0.75, Math.max(0.0004, r * 0.24));
  slot.translate(0, h * 0.72, 0);
  slot.rotateY(slotDeg * RAD);
  return [head, slot];
}

/** Place a geometry with a position and a "+Y points along n" orientation (plus spin about n). */
export function placeAlong(g: THREE.BufferGeometry, p: THREE.Vector3, n: THREE.Vector3, spinDeg = 0): THREE.BufferGeometry {
  const q = yTo(n);
  if (spinDeg) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spinDeg * RAD));
  const m = new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
  return g.clone().applyMatrix4(m);
}

/** Merge geometries (non-indexed/indexed mix safe). */
export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const list = geos.map((g) => {
    const c = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(c.attributes)) if (k !== 'position' && k !== 'normal') c.deleteAttribute(k);
    if (!c.attributes.normal) c.computeVertexNormals();
    return c;
  });
  return G.mergeGeometries(list)!;
}

/** Catmull-Rom interpolation through keyframes (x ascending) for each value column. */
export function keyInterp(keys: number[][], x: number): number[] {
  const n = keys.length;
  if (x <= keys[0][0]) return keys[0].slice(1);
  if (x >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (i < n - 2 && keys[i + 1][0] < x) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const t = (x - k1[0]) / (k2[0] - k1[0]);
  const out: number[] = [];
  for (let c = 1; c < k1.length; c++) {
    // non-uniform spacing: use tangents scaled by the neighbouring intervals (monotone-ish)
    const d1 = k2[0] - k1[0];
    const m1 = k1 === k0 ? (k2[c] - k1[c]) : ((k2[c] - k0[c]) / (k2[0] - k0[0])) * d1;
    const m2 = k3 === k2 ? (k2[c] - k1[c]) : ((k3[c] - k1[c]) / (k3[0] - k1[0])) * d1;
    const t2 = t * t, t3 = t2 * t;
    out.push((2 * t3 - 3 * t2 + 1) * k1[c] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * k2[c] + (t3 - t2) * m2);
  }
  return out;
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
