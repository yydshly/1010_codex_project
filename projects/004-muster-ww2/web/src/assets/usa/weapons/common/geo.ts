/**
 * Geometry helpers shared by the US small-arms models (M1 Garand, Thompson M1A1, BAR M1918A2).
 * All in metres, weapon design frames (bore along +Z, +Y up, +X = the weapon's left side).
 *
 *  - lathes / cylinders along the principal axes, side-view (ZY) and top-view (XZ) plates,
 *    extrusions with real through-holes, warps, screw heads, placement helpers
 *  - Profile: a wooden stock / fore-end described by analytic super-ellipse cross-sections
 *    (keyframed along z). The same section function lofts the wood AND seats every fitting
 *    (butt plates, ferrules, swivel plates, shell patches) exactly on its surface.
 */
import { THREE, G } from '../../../../core/kit';

export type V2 = [number, number];
export type V3 = [number, number, number];
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const RAD = Math.PI / 180;

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

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

/** Circle outline (CCW). */
export function circle2D(r: number, n = 24, cx = 0, cy = 0): V2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as V2;
  });
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

/** Side-view plate: outline in (z, y), thickness t along X centred on x = 0, holes cut through. */
export function plateZY(outline: V2[], t: number, holes: V2[][] = [], bevel = 0.0005): THREE.BufferGeometry {
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
 * Slotted screw head (domed) whose +Y axis points out of the surface; base at y = 0.
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

/** Merge geometries (non-indexed/indexed mix safe; keeps position + normal only). */
export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const list = geos.map((g) => {
    const c = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(c.attributes)) if (k !== 'position' && k !== 'normal') c.deleteAttribute(k);
    if (!c.attributes.normal) c.computeVertexNormals();
    return c;
  });
  return G.mergeGeometries(list)!;
}

/** Catmull-Rom (Hermite) interpolation through keyframes (x ascending) for each value column. */
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

/** Piecewise-linear lookup in [x, y] pairs (x ascending). */
export function lerpKeys(keys: V2[], x: number): number {
  if (x <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (x <= keys[i][0]) {
      const [x0, y0] = keys[i - 1], [x1, y1] = keys[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return keys[keys.length - 1][1];
}

// ------------------------------------------------------------------------------------------------
// Profile: wood described by super-ellipse sections keyed along z

export interface Sec {
  /** half width at the widest line */
  hw: number;
  /** top centre, widest line, bottom centre (y) */
  yTop: number;
  ySplit: number;
  yBot: number;
  /** super-ellipse exponents of the upper and the lower half */
  eTop: number;
  eBot: number;
  /** lateral offset of the section centre (x), optional */
  dx: number;
}

/**
 * keys: [z, hw, yTop, ySplit, yBot, eTop, eBot] (+ optional dx). Hermite-interpolated.
 * Ring parameter t: 0 = +x (left side), pi/2 = top, pi = -x, 3pi/2 = bottom.
 */
export class Profile {
  constructor(readonly keys: number[][]) {}

  at(z: number): Sec {
    const k = keyInterp(this.keys, z);
    return { hw: k[0], yTop: k[1], ySplit: k[2], yBot: k[3], eTop: k[4], eBot: k[5], dx: k[6] ?? 0 };
  }

  get z0() {
    return this.keys[0][0];
  }

  get z1() {
    return this.keys[this.keys.length - 1][0];
  }

  static point(s: Sec, t: number): V2 {
    const c = Math.cos(t), sn = Math.sin(t);
    const top = sn >= 0;
    const e = top ? s.eTop : s.eBot;
    const x = s.dx + s.hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
    const y = top ? s.ySplit + (s.yTop - s.ySplit) * Math.pow(Math.abs(sn), 2 / e) : s.ySplit - (s.ySplit - s.yBot) * Math.pow(Math.abs(sn), 2 / e);
    return [x, y];
  }

  static normal(s: Sec, t: number): V2 {
    const d = 1e-4;
    const a = Profile.point(s, t - d), b = Profile.point(s, t + d);
    const tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    return [ty / l, -tx / l];
  }

  static ring(s: Sec, n = 48, grow = 0): V2[] {
    return Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      const p = Profile.point(s, t);
      if (!grow) return p;
      const nn = Profile.normal(s, t);
      return [p[0] + nn[0] * grow, p[1] + nn[1] * grow] as V2;
    });
  }

  ringAt(z: number, n = 48, grow = 0): V2[] {
    return Profile.ring(this.at(z), n, grow);
  }

  /** |x| (from the centre line) of the side surface at height y. */
  sideX(z: number, y: number): number {
    const s = this.at(z);
    const top = y >= s.ySplit;
    const e = top ? s.eTop : s.eBot;
    const f = top ? (y - s.ySplit) / (s.yTop - s.ySplit) : (s.ySplit - y) / (s.ySplit - s.yBot);
    const sn = Math.pow(clamp(f, 0, 1), e / 2);
    const c = Math.sqrt(Math.max(0, 1 - sn * sn));
    return s.hw * Math.pow(c, 2 / e);
  }

  /** Surface point + outward normal (3D, normal in the section plane) at z for parameter t. */
  surf(z: number, t: number, off = 0): { p: THREE.Vector3; n: THREE.Vector3 } {
    const s = this.at(z);
    const [x, y] = Profile.point(s, t), [nx, ny] = Profile.normal(s, t);
    return { p: V(x + nx * off, y + ny * off, z), n: V(nx, ny, 0) };
  }

  /** Loft between z0 and z1 at the given stations. */
  loft(stations: number[], n = 48, creaseDeg = 50, grow = 0): THREE.BufferGeometry {
    return G.loftZ(
      stations.map((z) => ({ z, ring: this.ringAt(z, n, grow) })),
      true,
      creaseDeg,
    );
  }

  /**
   * Thin shell patch lying on the surface between ring parameters t0(z)..t1(z) and z0..z1.
   * `inset` is how deep the inner face sits below the surface; total thickness `thick`.
   */
  shell(z0: number, z1: number, t0: (z: number) => number, t1: (z: number) => number, thick: number, inset = 0.0004, nz = 10, nu = 10): THREE.BufferGeometry {
    const secs: { z: number; ring: V2[] }[] = [];
    for (let k = 0; k <= nz; k++) {
      const z = z0 + ((z1 - z0) * k) / nz;
      const s = this.at(z);
      const a = t0(z), b = t1(z);
      const ring: V2[] = [];
      for (let i = 0; i <= nu; i++) {
        const t = a + ((b - a) * i) / nu;
        const [x, y] = Profile.point(s, t), [nx, ny] = Profile.normal(s, t);
        ring.push([x + nx * (thick - inset), y + ny * (thick - inset)]);
      }
      for (let i = nu; i >= 0; i--) {
        const t = a + ((b - a) * i) / nu;
        const [x, y] = Profile.point(s, t), [nx, ny] = Profile.normal(s, t);
        ring.push([x - nx * inset, y - ny * inset]);
      }
      secs.push({ z, ring });
    }
    return G.loftZ(secs, true, 40);
  }

  /** Ring parameter on the side where the surface is at height y (left side: t in [-pi/2, pi/2]). */
  tAtY(z: number, y: number, left = true): number {
    const s = this.at(z);
    let lo = -Math.PI / 2, hi = Math.PI / 2;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (Profile.point(s, mid)[1] < y) lo = mid;
      else hi = mid;
    }
    const t = (lo + hi) / 2;
    return left ? t : Math.PI - t;
  }
}

/** Stations from z0 to z1 with a step function (denser where needed). */
export function stations(z0: number, z1: number, step: (z: number) => number): number[] {
  const out: number[] = [];
  let z = z0;
  while (z < z1 - 1e-6) {
    out.push(z);
    z += Math.max(0.001, step(z));
  }
  out.push(z1);
  return out;
}

/**
 * Wrap a geometry authored with x = height above a surface onto the side of a profile:
 * p.x -> side * (sideX(z, y) + lift + p.x). side = +1 left, -1 right.
 */
export function onSide(g: THREE.BufferGeometry, prof: Profile, side: 1 | -1, lift = 0): THREE.BufferGeometry {
  warp(
    g,
    (p) => {
      p.x = side * (prof.sideX(p.z, p.y) + lift + p.x);
    },
    false,
  );
  if (side < 0) G.flipWinding(g);
  g.computeVertexNormals();
  return g;
}

/** Knurled ring (alternating ridges) lathe profile helper: returns [r, z] points. */
export function knurlProfile(r0: number, r1: number, z0: number, z1: number, n: number): V2[] {
  const pts: V2[] = [];
  const dz = (z1 - z0) / n;
  for (let i = 0; i < n; i++) {
    const z = z0 + i * dz;
    pts.push([r0, z], [r1, z + dz * 0.25], [r1, z + dz * 0.6], [r0, z + dz * 0.85]);
  }
  pts.push([r0, z1]);
  return pts;
}

/**
 * Straight-knurled (axial ridges) knob along +Y from y = 0 to y = h: `ridges` ridges round the rim,
 * chamfered edges. The outer band alternates between r and r - depth.
 */
export function knurledKnob(r: number, h: number, ridges: number, depth = 0.0004, chamfer = 0.0005): THREE.BufferGeometry {
  const seg = ridges * 2;
  const prof = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(r - chamfer, 0),
    new THREE.Vector2(r, chamfer),
    new THREE.Vector2(r, h - chamfer),
    new THREE.Vector2(r - chamfer, h),
    new THREE.Vector2(0, h),
  ];
  const g = new THREE.LatheGeometry(prof, seg);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const rr = Math.hypot(x, z);
    if (rr < r - 1e-6) continue;
    const a = Math.atan2(x, z);
    const k = Math.round((a / (Math.PI * 2)) * seg);
    const rad = ((k % 2) + 2) % 2 === 0 ? r : r - depth;
    pos.setXYZ(i, (x / rr) * rad, y, (z / rr) * rad);
  }
  return G.crease(g.toNonIndexed(), 30);
}
