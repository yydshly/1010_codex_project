/**
 * Geometry helpers shared by the United Kingdom small-arms models (Rifle No. 4 Mk I, Sten Mk II,
 * Bren Mk II). Metres; weapon "design frames" use +Z towards the muzzle, +Y up, +X = weapon's left.
 * Angles around the bore are measured from +X towards +Y (90 deg = top, 180 deg = right side).
 * Nothing here depends on a particular weapon.
 */
import { THREE, G } from '../../../../core/kit';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export type V2 = [number, number];
export type V3 = [number, number, number];
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const RAD = Math.PI / 180;

// ------------------------------------------------------------------------------------------------
// Lathes, cylinders, plates

/** Lathe around +Z from [radius, z] points (z increasing). a0/a1: partial sweep in degrees (from +X to +Y). */
export function latheZ(profile: V2[], seg = 32, creaseDeg = 40, a0 = 0, a1 = 360): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg, (a0 + 90) * RAD, (a1 - a0) * RAD);
  g.rotateX(Math.PI / 2); // lathe +Y -> +Z
  return g;
}

/** Lathe around +X from [radius, x] points (x increasing). */
export function latheX(profile: V2[], seg = 24, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg);
  g.rotateZ(-Math.PI / 2); // lathe +Y -> +X
  return g;
}

/** Lathe around +Y from [radius, y] points. */
export const latheY = (profile: V2[], seg = 24, creaseDeg = 40) => G.lathe(profile, seg, creaseDeg);

/** Closed rectangular ring profile ri..ro between z0..z1 with small chamfers (for latheZ). */
export function ringProfile(ri: number, ro: number, z0: number, z1: number, ch = 0.0004): V2[] {
  const c = Math.min(ch, (ro - ri) / 3, (z1 - z0) / 3);
  return [[ri, z0 + c], [ri + c, z0], [ro - c, z0], [ro, z0 + c], [ro, z1 - c], [ro - c, z1], [ri + c, z1], [ri, z1 - c], [ri, z0 + c]];
}

/** Hollow tube along Z (outer ro, inner ri). */
export function tubeZ(ro: number, ri: number, z0: number, z1: number, seg = 32, ch = 0.0004): THREE.BufferGeometry {
  return latheZ(ringProfile(ri, ro, z0, z1, ch), seg, 35);
}

/** Solid cylinder along Z from z0 to z1 with chamfered ends. */
export function cylZ(r: number, z0: number, z1: number, seg = 24, ch = 0.0004): THREE.BufferGeometry {
  const c = Math.min(ch, r / 2, (z1 - z0) / 3);
  return latheZ([[0, z0], [r - c, z0], [r, z0 + c], [r, z1 - c], [r - c, z1], [0, z1]], seg, 35);
}

/** Solid cylinder along X from x0 to x1 with chamfered ends. */
export function cylX(r: number, x0: number, x1: number, seg = 16, ch = 0.0003): THREE.BufferGeometry {
  const c = Math.min(ch, r / 2, (x1 - x0) / 3);
  return latheX([[0, x0], [r - c, x0], [r, x0 + c], [r, x1 - c], [r - c, x1], [0, x1]], seg, 35);
}

/** Solid cylinder along Y from y0 to y1 with chamfered ends. */
export function cylY(r: number, y0: number, y1: number, seg = 16, ch = 0.0003): THREE.BufferGeometry {
  const c = Math.min(ch, r / 2, (y1 - y0) / 3);
  return latheY([[0, y0], [r - c, y0], [r, y0 + c], [r, y1 - c], [r - c, y1], [0, y1]], seg, 35);
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
export const ccw = (p: V2[]): V2[] => (area2D(p) < 0 ? [...p].reverse() : p);

/**
 * Extrude an outline (XY plane, optional holes cut through with real walls) along +Z from z0 to z1
 * with a small bevel.
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

/** Side-view plate: outline in (z, y), thickness t along X centred on x = 0, holes cut through. */
export function plateZY(outline: V2[], t: number, holes: V2[][] = [], bevel = 0.0004): THREE.BufferGeometry {
  const g = extrudeZ(outline, holes, -t / 2, t / 2, bevel);
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  G.flipWinding(g);
  return g;
}

/** Top-view plate: outline in (x, z), thickness t along Y centred on y = 0. */
export function plateXZ(outline: V2[], t: number, holes: V2[][] = [], bevel = 0.0004): THREE.BufferGeometry {
  const g = extrudeZ(outline, holes, -t / 2, t / 2, bevel);
  g.applyMatrix4(new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  G.flipWinding(g);
  return g;
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

/** Circle outline (CCW). */
export function circle2D(cu: number, cv: number, r: number, n = 16): V2[] {
  return Array.from({ length: n }, (_, i) => [cu + r * Math.cos((i / n) * Math.PI * 2), cv + r * Math.sin((i / n) * Math.PI * 2)] as V2);
}

/** Annular sector outline in the XY plane (degrees, 0 = +X, CCW). */
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

/** Offset a closed CCW polygon outwards by d along the averaged edge normals. */
export function offset2D(pts: V2[], d: number): V2[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    return [p[0] + (ty / l) * d, p[1] - (tx / l) * d] as V2;
  });
}

// ------------------------------------------------------------------------------------------------
// Transforms

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

/** Clone a geometry, point its +Y along n (spin about n, degrees) and move it to p. */
export function placeAlong(g: THREE.BufferGeometry, p: THREE.Vector3, n: THREE.Vector3, spinDeg = 0): THREE.BufferGeometry {
  const q = yTo(n);
  if (spinDeg) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spinDeg * RAD));
  return g.clone().applyMatrix4(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
}

/** Rotate a geometry (in place) about the X axis through (y, z) by deg. */
export function rotX(g: THREE.BufferGeometry, deg: number, y = 0, z = 0): THREE.BufferGeometry {
  g.translate(0, -y, -z);
  g.rotateX(deg * RAD);
  g.translate(0, y, z);
  return g;
}

// ------------------------------------------------------------------------------------------------
// Small hardware

/**
 * Slotted screw head (domed cheese head) whose +Y axis points out of the surface; base at y = 0.
 * Returns [head, slot] so the slot can use a dark recess material.
 */
export function screwParts(r: number, h: number, slotDeg = 30, seg = 18): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const head = G.lathe([[0, -0.0004], [r * 0.98, -0.0004], [r, h * 0.3], [r * 0.86, h * 0.8], [r * 0.5, h], [0, h]], seg, 50);
  const slot = new THREE.BoxGeometry(r * 1.9, h * 0.75, Math.max(0.0004, r * 0.24));
  slot.translate(0, h * 0.72, 0);
  slot.rotateY(slotDeg * RAD);
  return [head, slot];
}

// ------------------------------------------------------------------------------------------------
// Interpolation

/** Hermite interpolation through keyframes (x ascending) for each value column. */
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
    const d1 = k2[0] - k1[0];
    const m1 = k1 === k0 ? k2[c] - k1[c] : ((k2[c] - k0[c]) / (k2[0] - k0[0])) * d1;
    const m2 = k3 === k2 ? k2[c] - k1[c] : ((k3[c] - k1[c]) / (k3[0] - k1[0])) * d1;
    const t2 = t * t, t3 = t2 * t;
    out.push((2 * t3 - 3 * t2 + 1) * k1[c] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * k2[c] + (t3 - t2) * m2);
  }
  return out;
}

/** Piecewise-linear lookup through [x, y] points (clamped). */
export function lerpTable(pts: V2[]): (x: number) => number {
  return (x: number) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const t = (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
        return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
      }
    }
    return pts[pts.length - 1][1];
  };
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Evenly spaced values from a to b inclusive (n intervals). */
export const spaced = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

// ------------------------------------------------------------------------------------------------
// Super-ellipse sections (stocks, butts, grips)

/** Section with separate half heights / exponents above and below a split line. */
export interface Sec {
  hw: number;
  yTop: number;
  ySplit: number;
  yBot: number;
  eTop: number;
  eBot: number;
}

/** Point on a section for ring parameter t (0 = +x, pi/2 = top, pi = -x, 3pi/2 = bottom). */
export function secPoint(s: Sec, t: number): V2 {
  const c = Math.cos(t), sn = Math.sin(t);
  const top = sn >= 0;
  const e = top ? s.eTop : s.eBot;
  const x = s.hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
  const y = top ? s.ySplit + (s.yTop - s.ySplit) * Math.pow(Math.abs(sn), 2 / e) : s.ySplit - (s.ySplit - s.yBot) * Math.pow(Math.abs(sn), 2 / e);
  return [x, y];
}

/** Outward 2D normal of the section at parameter t. */
export function secNormal(s: Sec, t: number): V2 {
  const d = 1e-4;
  const a = secPoint(s, t - d), b = secPoint(s, t + d);
  const tx = b[0] - a[0], ty = b[1] - a[1];
  const l = Math.hypot(tx, ty) || 1;
  return [ty / l, -tx / l];
}

/** Closed ring of n points (CCW seen from +Z). */
export function secRing(s: Sec, n = 48): V2[] {
  return Array.from({ length: n }, (_, i) => secPoint(s, (i / n) * Math.PI * 2));
}

/** |x| of the section surface at height y. */
export function secSideX(s: Sec, y: number): number {
  const top = y >= s.ySplit;
  const e = top ? s.eTop : s.eBot;
  const f = top ? (y - s.ySplit) / (s.yTop - s.ySplit) : (s.ySplit - y) / (s.ySplit - s.yBot);
  const sn = Math.pow(Math.min(1, Math.max(0, f)), e / 2);
  const c = Math.sqrt(Math.max(0, 1 - sn * sn));
  return s.hw * Math.pow(c, 2 / e);
}

/** Ring of a section grown outward by d (along the 2D normals). */
export function secRingOffset(s: Sec, d: number, n = 48): V2[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const [x, y] = secPoint(s, t), [nx, ny] = secNormal(s, t);
    return [x + nx * d, y + ny * d] as V2;
  });
}

/**
 * Thin shell patch lying on a lofted section surface between ring parameters t0(z)..t1(z) and
 * z0..z1 (sheet-metal parts on wood: tangs, trigger-guard plates). `inset` = depth below the surface.
 */
export function shellPatch(
  secAt: (z: number) => Sec,
  z0: number,
  z1: number,
  t0: (z: number) => number,
  t1: (z: number) => number,
  thick: number,
  inset = 0.0004,
  nz = 10,
  nu = 10,
): THREE.BufferGeometry {
  const secs: { z: number; ring: V2[] }[] = [];
  for (let k = 0; k <= nz; k++) {
    const z = z0 + ((z1 - z0) * k) / nz;
    const s = secAt(z);
    const a = t0(z), b = t1(z);
    const ring: V2[] = [];
    for (let i = 0; i <= nu; i++) {
      const t = a + ((b - a) * i) / nu;
      const [x, y] = secPoint(s, t), [nx, ny] = secNormal(s, t);
      ring.push([x + nx * (thick - inset), y + ny * (thick - inset)]);
    }
    for (let i = nu; i >= 0; i--) {
      const t = a + ((b - a) * i) / nu;
      const [x, y] = secPoint(s, t), [nx, ny] = secNormal(s, t);
      ring.push([x - nx * inset, y - ny * inset]);
    }
    secs.push({ z, ring });
  }
  return G.loftZ(secs, true, 40);
}

// ------------------------------------------------------------------------------------------------
// Perforated tube (real-depth holes): conforming tile mesher on (phi, z) tiles.

export interface PerfHole {
  /** Centre angle (rad, from +X towards +Y) and centre z (m). */
  phi: number;
  z: number;
  /** Signed distance in the unrolled outer surface (s = arc length along +phi, z), centred on the hole. */
  sdf: (s: number, z: number) => number;
}

export const holeCircle = (d: number) => (s: number, z: number) => Math.hypot(s, z) - d / 2;
export const holeStadium = (w: number, h: number) => {
  const r = w / 2, hl = Math.max(0, h / 2 - r);
  return (s: number, z: number) => Math.hypot(s, Math.max(0, Math.abs(z) - hl)) - r;
};
export const holeRRect = (w: number, h: number, r: number) => (s: number, z: number) => {
  const qx = Math.abs(s) - w / 2 + r, qz = Math.abs(z) - h / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
};

export interface PerfTubeOpts {
  R: number;
  t: number;
  /** Column breakpoints (rad), increasing; a full tube spans exactly 2 PI. */
  phis: number[];
  /** z breakpoints shared by every column (m), increasing; each tile holds at most one hole. */
  rows: number[];
  /** Lattice spacing along z (m); breakpoints are snapped to it. */
  dz: number;
  z0?: number;
  nPhi?: number;
  holes?: PerfHole[];
  caps?: boolean;
  inner?: boolean;
}

export function perfTube(o: PerfTubeOpts): THREE.BufferGeometry {
  const R = o.R, Ri = o.R - o.t, nPhi = o.nPhi ?? 4;
  const z0 = o.z0 ?? 0, dz = o.dz;
  const TWO_PI = Math.PI * 2;
  const phis = o.phis;
  const nCol = phis.length - 1;
  const closed = Math.abs(phis[nCol] - phis[0] - TWO_PI) < 1e-6;
  const snap = (z: number) => z0 + Math.round((z - z0) / dz) * dz;
  const rows = o.rows.map(snap);
  const lat = (za: number, zb: number) => {
    const k0 = Math.round((za - z0) / dz), k1 = Math.round((zb - z0) / dz);
    const out: number[] = [];
    for (let k = k0; k <= k1; k++) out.push(z0 + k * dz);
    return out;
  };
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  const addV = (x: number, y: number, z: number, n: THREE.Vector3) => {
    pos.push(x, y, z);
    nor.push(n.x, n.y, n.z);
    return pos.length / 3 - 1;
  };
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), fn = new THREE.Vector3(), ns = new THREE.Vector3();
  const tri = (a: number, b: number, c: number) => {
    ab.set(pos[b * 3] - pos[a * 3], pos[b * 3 + 1] - pos[a * 3 + 1], pos[b * 3 + 2] - pos[a * 3 + 2]);
    ac.set(pos[c * 3] - pos[a * 3], pos[c * 3 + 1] - pos[a * 3 + 1], pos[c * 3 + 2] - pos[a * 3 + 2]);
    fn.crossVectors(ab, ac);
    ns.set(nor[a * 3] + nor[b * 3] + nor[c * 3], nor[a * 3 + 1] + nor[b * 3 + 1] + nor[c * 3 + 1], nor[a * 3 + 2] + nor[b * 3 + 2] + nor[c * 3 + 2]);
    if (fn.dot(ns) >= 0) idx.push(a, b, c);
    else idx.push(a, c, b);
  };
  const quad = (a: number, b: number, c: number, d: number) => {
    tri(a, b, c);
    tri(a, c, d);
  };
  const radial = (phi: number, s: number) => new THREE.Vector3(Math.cos(phi) * s, Math.sin(phi) * s, 0);
  const surfV = (phi: number, z: number, outer: boolean) => {
    const r = outer ? R : Ri;
    return addV(r * Math.cos(phi), r * Math.sin(phi), z, radial(phi, outer ? 1 : -1));
  };
  const norm = (a: number, ref: number) => {
    let d = a - ref;
    while (d > Math.PI) d -= TWO_PI;
    while (d < -Math.PI) d += TWO_PI;
    return d;
  };
  const holes = o.holes ?? [];
  const surfaces = o.inner === false ? [true] : [true, false];
  for (let j = 0; j < nCol; j++) {
    const pA = phis[j], pB = phis[j + 1];
    for (let i = 0; i < rows.length - 1; i++) {
      const za = rows[i], zb = rows[i + 1];
      const L = lat(za, zb);
      const pc = (pA + pB) / 2;
      const hole = holes.find((h) => Math.abs(norm(h.phi, pc)) < (pB - pA) / 2 && h.z > za && h.z < zb);
      if (!hole) {
        for (const outer of surfaces) {
          const grid: number[][] = [];
          for (let a = 0; a <= nPhi; a++) {
            const phi = pA + ((pB - pA) * a) / nPhi;
            grid.push(L.map((z) => surfV(phi, z, outer)));
          }
          for (let a = 0; a < nPhi; a++) for (let b = 0; b < L.length - 1; b++) quad(grid[a][b], grid[a + 1][b], grid[a + 1][b + 1], grid[a][b + 1]);
        }
        continue;
      }
      const ring: [number, number][] = [];
      for (let a = 0; a < nPhi; a++) ring.push([pA + ((pB - pA) * a) / nPhi, za]);
      for (let b = 0; b < L.length - 1; b++) ring.push([pB, L[b]]);
      for (let a = 0; a < nPhi; a++) ring.push([pB - ((pB - pA) * a) / nPhi, zb]);
      for (let b = L.length - 1; b > 0; b--) ring.push([pA, L[b]]);
      const hphi = pc + norm(hole.phi, pc);
      const outline = ring.map(([phi, z]) => {
        const ds = (phi - hphi) * R, dzz = z - hole.z;
        const len = Math.hypot(ds, dzz);
        const us = ds / len, uz = dzz / len;
        let lo = 0, hi = len;
        for (let it = 0; it < 30; it++) {
          const m = (lo + hi) / 2;
          if (hole.sdf(us * m, uz * m) < 0) lo = m;
          else hi = m;
        }
        const rho = (lo + hi) / 2;
        const s = us * rho, zz = uz * rho;
        const e = 1e-5;
        const gs = hole.sdf(s + e, zz) - hole.sdf(s - e, zz), gz = hole.sdf(s, zz + e) - hole.sdf(s, zz - e);
        const gl = Math.hypot(gs, gz) || 1;
        return { phi: hphi + s / R, z: hole.z + zz, gs: gs / gl, gz: gz / gl };
      });
      const n = ring.length;
      for (const outer of surfaces) {
        const bv = ring.map(([phi, z]) => surfV(phi, z, outer));
        const hv = outline.map((h) => surfV(h.phi, h.z, outer));
        for (let k = 0; k < n; k++) quad(bv[k], bv[(k + 1) % n], hv[(k + 1) % n], hv[k]);
      }
      const wall = (h: (typeof outline)[number], r: number) => {
        const ePhi = new THREE.Vector3(-Math.sin(h.phi), Math.cos(h.phi), 0);
        const nn = ePhi.multiplyScalar(-h.gs).add(new THREE.Vector3(0, 0, -h.gz)).normalize();
        return addV(r * Math.cos(h.phi), r * Math.sin(h.phi), h.z, nn);
      };
      const wo = outline.map((h) => wall(h, R));
      const wi = outline.map((h) => wall(h, Ri));
      for (let k = 0; k < n; k++) quad(wo[k], wo[(k + 1) % n], wi[(k + 1) % n], wi[k]);
    }
    if (o.caps !== false) {
      for (const [z, sgn] of [[rows[0], -1], [rows[rows.length - 1], 1]] as [number, number][]) {
        const nz = new THREE.Vector3(0, 0, sgn);
        const outerV: number[] = [], innerV: number[] = [];
        for (let a = 0; a <= nPhi; a++) {
          const phi = pA + ((pB - pA) * a) / nPhi;
          outerV.push(addV(R * Math.cos(phi), R * Math.sin(phi), z, nz));
          innerV.push(addV(Ri * Math.cos(phi), Ri * Math.sin(phi), z, nz));
        }
        for (let a = 0; a < nPhi; a++) quad(outerV[a], outerV[a + 1], innerV[a + 1], innerV[a]);
      }
    }
  }
  if (!closed) {
    for (const [phi, sgn] of [[phis[0], -1], [phis[nCol], 1]] as [number, number][]) {
      const L = lat(rows[0], rows[rows.length - 1]);
      const nn = new THREE.Vector3(-Math.sin(phi) * sgn, Math.cos(phi) * sgn, 0);
      const ov = L.map((z) => addV(R * Math.cos(phi), R * Math.sin(phi), z, nn));
      const iv = L.map((z) => addV(Ri * Math.cos(phi), Ri * Math.sin(phi), z, nn));
      for (let b = 0; b < L.length - 1; b++) quad(ov[b], ov[b + 1], iv[b + 1], iv[b]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return mergeVertices(g, 1e-7);
}
