/**
 * Small modelling helpers shared by the Soviet gear pieces: stitch rows, soft canvas bodies,
 * folded pouch flaps, belt loops and studs. All sizes in metres.
 */
import { THREE, G, S, sdfMesh, valueNoise3 } from '../../../core/kit';
import type { SDF } from '../../../core/geo/sdf';

type P = THREE.Vector3 | [number, number, number];
const V = (p: P) => (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone());

/**
 * A row of individual stitches (short rods) along a polyline. Returns one merged geometry.
 * len = stitch length, gap = spacing between stitches, r = thread radius.
 */
export function stitches(points: P[], o: { len?: number; gap?: number; r?: number; closed?: boolean } = {}): THREE.BufferGeometry {
  const len = o.len ?? 0.0032, gap = o.gap ?? 0.0018, r = o.r ?? 0.00055;
  const pts = points.map(V);
  if (o.closed) pts.push(pts[0].clone());
  // cumulative arc length, stitches placed continuously across segments
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
    parts.push(G.rod(p0, p1, r, 5).toNonIndexed());
  }
  if (!parts.length) {
    // keep a valid (degenerate, invisible) geometry so callers never produce an empty mesh
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    return g;
  }
  return G.mergeGeometries(parts)!;
}

/** Stitch row along a smooth curve (Catmull-Rom through the points). */
export function stitchCurve(points: P[], o: { len?: number; gap?: number; r?: number; closed?: boolean } = {}): THREE.BufferGeometry {
  const c = new THREE.CatmullRomCurve3(points.map(V), o.closed ?? false, 'centripetal');
  const n = Math.max(8, Math.round(c.getLength() / 0.002));
  return stitches(c.getSpacedPoints(n), { ...o, closed: false });
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface SoftBoxOptions {
  /** Width (X), height (Y), depth (Z) of the filled body. */
  w: number;
  h: number;
  d: number;
  /** Corner rounding radius. */
  r: number;
  /** Outward bulge of the front (+Z) face at its centre (m). */
  bulge?: number;
  /** Outward bulge of the side (+-X) faces. */
  sideBulge?: number;
  /** Fabric irregularity amplitude (m). */
  wrinkle?: number;
  seed?: number;
  /** Extra SDF shapes (in the same local frame) smooth-unioned with the body. */
  extra?: { f: SDF; k: number }[];
  /** Mesh cell size. Default 0.0025. */
  cell?: number;
}

/**
 * Soft canvas body: rounded box, centred on X and Y, back face on z = 0, front face at z = d,
 * with an optional stretched bulge on the front face and gentle fabric irregularities.
 */
export function softBox(o: SoftBoxOptions): THREE.BufferGeometry {
  const hw = o.w / 2, hh = o.h / 2, hd = o.d / 2;
  const bul = o.bulge ?? 0, sb = o.sideBulge ?? 0, wr = o.wrinkle ?? 0.0004, seed = o.seed ?? 1;
  let f: SDF = S.box([0, 0, hd], [hw, hh, hd], o.r);
  if (o.extra) for (const e of o.extra) f = S.smin(f, e.f, e.k);
  const body = f;
  const field: SDF = (x, y, z) => {
    const fx = Math.max(0, 1 - (x / hw) ** 2), fy = Math.max(0, 1 - (y / hh) ** 2), fz = Math.max(0, 1 - ((z - hd) / hd) ** 2);
    const front = bul * fx * fy * smoothstep(hd * 0.2, o.d, z);
    const side = sb * fy * fz * smoothstep(hw * 0.4, hw, Math.abs(x));
    const n = wr * (valueNoise3(x * 110, y * 110, z * 110, seed) - 0.5) * 2;
    return body(x, y, z) - front - side + n;
  };
  const m = 0.012 + bul + sb;
  return sdfMesh(field, { min: [-hw - m, -hh - m, -m], max: [hw + m, hh + m, o.d + m] }, o.cell ?? 0.0025);
}

/** Rectangle outline (CCW) with only the two BOTTOM corners rounded; top edge at y = 0. */
export function bottomRounded(w: number, h: number, r: number, seg = 6): G.V2[] {
  const hw = w / 2;
  const pts: G.V2[] = [];
  pts.push([-hw, 0]);
  for (let i = 0; i <= seg; i++) {
    const a = Math.PI + (i / seg) * (Math.PI / 2); // 180 -> 270 deg
    pts.push([-hw + r + Math.cos(a) * r, -h + r + Math.sin(a) * r]);
  }
  for (let i = 0; i <= seg; i++) {
    const a = 1.5 * Math.PI + (i / seg) * (Math.PI / 2); // 270 -> 360
    pts.push([hw - r + Math.cos(a) * r, -h + r + Math.sin(a) * r]);
  }
  pts.push([hw, 0]);
  return pts;
}

export interface FlapOptions {
  /** Flap width (X). */
  w: number;
  /** Body top (y), back face (z) and front face (z) the flap wraps around. */
  yTop: number;
  zBack: number;
  zFront: number;
  /** How far the front part hangs down from the body top (m). */
  drop: number;
  /** Flap thickness and clearance above the body surface. */
  t?: number;
  gap?: number;
  /** Radius of the fold over the front top edge. */
  bend?: number;
  /** Bottom corner radius of the front part. */
  corner?: number;
  /** Extra outward pad at the back (flap rises from the back panel). */
  x?: number;
}

/**
 * A folded pouch flap: flat top panel, rounded fold over the front edge and a front panel
 * with rounded bottom corners. Returns geometries + the front panel's outer z and bottom y
 * so closures (tabs, buttons) can be placed on it.
 */
export function flap(o: FlapOptions): { geos: THREE.BufferGeometry[]; zOut: number; yBottom: number; yFoldEnd: number } {
  const t = o.t ?? 0.003, gap = o.gap ?? 0.0008, rb = o.bend ?? 0.008, x = o.x ?? 0;
  const off = gap + t / 2;
  const Y = o.yTop + off, Z = o.zFront + off;
  const cy = o.yTop - rb, cz = o.zFront - rb, R = rb + off;
  const path: THREE.Vector3[] = [new THREE.Vector3(x, Y, o.zBack), new THREE.Vector3(x, Y, (o.zBack + cz) / 2)];
  const nrm: THREE.Vector3[] = [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0)];
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI / 2 - (i / 6) * (Math.PI / 2);
    path.push(new THREE.Vector3(x, cy + Math.sin(a) * R, cz + Math.cos(a) * R));
    nrm.push(new THREE.Vector3(0, Math.sin(a), Math.cos(a)));
  }
  const geos: THREE.BufferGeometry[] = [G.strap(path, o.w, t, nrm, { smooth: false })];
  const frontH = Math.max(0.004, o.drop - rb);
  const plate = G.plate(bottomRounded(o.w, frontH, o.corner ?? 0.008), t, 'xy', Math.min(0.0012, t * 0.4));
  plate.translate(x, cy, Z);
  geos.push(plate);
  // back hinge: the flap is sewn to the back panel - a short downward lip
  const lip = G.rbox(o.w, 0.012, t, t * 0.45, 2);
  lip.translate(x, o.yTop - 0.002, o.zBack - t / 2 - 0.0002);
  geos.push(lip);
  return { geos, zOut: Z + t / 2, yBottom: cy - frontH, yFoldEnd: cy };
}

/**
 * Vertical belt loop on the back of a belt item. The loop strap lies against the body
 * (z from 0 to t); the belt passes between the loop and the item's back face at z = zBack.
 */
export function beltLoop(x: number, yTop: number, yBottom: number, zBack: number, w: number, t = 0.0025): THREE.BufferGeometry {
  const zc = t / 2;
  const pts = [
    [x, yTop + 0.004, zBack + t * 0.3],
    [x, yTop - 0.004, zc + 0.001],
    [x, yTop - 0.012, zc],
    [x, (yTop + yBottom) / 2, zc],
    [x, yBottom + 0.012, zc],
    [x, yBottom + 0.004, zc + 0.001],
    [x, yBottom - 0.004, zBack + t * 0.3],
  ].map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  return G.strap(pts, w, t, new THREE.Vector3(0, 0, -1), { samples: 36 });
}

/** Small stamped stud / button facing +Z, base at z = 0. */
export function stud(r = 0.0045, h = 0.003): THREE.BufferGeometry {
  const g = G.lathe(
    [
      [0, 0],
      [r * 0.55, 0],
      [r * 0.55, h * 0.35],
      [r, h * 0.45],
      [r * 0.95, h * 0.75],
      [r * 0.6, h],
      [0, h * 1.05],
    ],
    20,
    50,
  );
  g.rotateX(Math.PI / 2);
  return g;
}

/** Flat four-hole-free stamped button with a raised rim, facing +Z (base at z = 0). */
export function button(r = 0.008, h = 0.0028): THREE.BufferGeometry {
  const g = G.lathe(
    [
      [0, 0],
      [r, 0],
      [r, h * 0.6],
      [r * 0.92, h],
      [r * 0.78, h * 0.95],
      [r * 0.7, h * 0.7],
      [0, h * 0.65],
    ],
    24,
    40,
  );
  g.rotateX(Math.PI / 2);
  return g;
}

/** Simple rectangular wire buckle frame (in the XY plane), outer size w x h, wire radius r. */
export function wireFrame(w: number, h: number, r: number, corner = 0.003): THREE.BufferGeometry {
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
  return new THREE.TubeGeometry(curve, 64, r, 8, true);
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
  for (const v of verts) { zMin = Math.min(zMin, v.z); zMax = Math.max(zMax, v.z); }
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
    if (d < bestD) { bestD = d; best = ang; }
  }
  obj.rotation.x += best;
  return best;
}
