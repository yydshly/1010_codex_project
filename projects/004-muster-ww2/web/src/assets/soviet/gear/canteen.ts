/**
 * Red Army glass water flask (0.75 l, pattern of the 1931-32 standard) in its cloth cover.
 *
 * With aluminium scarce after 1941, the light-green glass flask became the common issue type.
 * It was closed with a rubber plug tied to the neck with a cord and carried in a simple khaki
 * cloth bag gathered at the neck by a drawstring, on a strap over the shoulder.
 *
 * Gear-local frame (buildSovietCanteen, strap 'stubs' | 'none'): hangs on the RIGHT HIP from a
 * strap over the left shoulder. +Z away from the body, +Y up, the back of the cover on z = 0,
 * ORIGIN = midpoint between the two strap attachments (sewn to the cover's side seams).
 * strapAnchors = the two strap stub ends (+X side first); the infantry author draws the strap on.
 *
 * Display frame (strap 'display'): cover standing on its flat bottom at y = 0, centred on X/Z,
 * the strap lying in a loose loop on the ground behind it.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { SU } from './palette';
import { stitches } from './helpers';
import { sweepSurface, superXZ, sstep, snoise, clamp01, mergeFlat } from './soft';

/** Flask and cover dimensions (m). */
export const SU_FLASK = {
  /** Glass body half width / half depth / height to the shoulder. */
  a: 0.063,
  b: 0.031,
  /** Cloth cover over the glass. */
  cloth: 0.0028,
  bodyTop: 0.128,
  /** Gathered neck (drawstring) and top of the cover ruffle. */
  tieY: 0.162,
  ruffleTop: 0.181,
  /** Glass neck: outer radius, lip top. */
  neckR: 0.0165,
  lipTop: 0.193,
  /** Strap attachment height on the side seams. */
  strapY: 0.118,
  strapW: 0.022,
};

export type CanteenStrap = 'stubs' | 'display' | 'none';

export interface SovietCanteenOptions {
  /** 'stubs' (worn; default): short strap ends rising from the cover sides. 'display': strap lying on the ground. */
  strap?: CanteenStrap;
}

interface Ring {
  y: number;
  a: number;
  b: number;
  e: number;
  amp: number;
}

function ringAt(v: number): Ring {
  const F = SU_FLASK;
  const A = F.a + F.cloth, B = F.b + F.cloth, RB = 0.012, rt = F.neckR + 0.0032;
  const vA = 0.05, vB = 0.15, vC = 0.56, vD = 0.78, vE = 0.84;
  if (v <= vA) {
    const t = v / vA;
    return { y: 0, a: Math.max(1e-4, t * (A - RB)), b: Math.max(1e-4, t * (B - RB)), e: 2.6, amp: 0 };
  }
  if (v <= vB) {
    const f = ((v - vA) / (vB - vA)) * (Math.PI / 2);
    return { y: RB * (1 - Math.cos(f)), a: A - RB + RB * Math.sin(f), b: B - RB + RB * Math.sin(f), e: 2.6, amp: 0 };
  }
  if (v <= vC) {
    const t = (v - vB) / (vC - vB);
    const belly = 0.0018 * Math.sin(Math.PI * t);
    return { y: RB + (F.bodyTop - RB) * t, a: A + belly, b: B + belly, e: 2.6, amp: 0 };
  }
  if (v <= vD) {
    // shoulder: cloth pulled in towards the neck, pleats growing
    const t = (v - vC) / (vD - vC);
    const k = sstep(0, 1, t);
    const sh = Math.sin((t * Math.PI) / 2);
    return {
      y: F.bodyTop + (F.tieY - 0.004 - F.bodyTop) * sh,
      a: A + (rt - A) * k,
      b: B + (rt - B) * k,
      e: 2.6 + (2 - 2.6) * k,
      amp: 0.0034 * sstep(0.1, 0.95, t),
    };
  }
  if (v <= vE) {
    const t = (v - vD) / (vE - vD);
    return { y: F.tieY - 0.004 + 0.008 * t, a: rt, b: rt, e: 2, amp: 0.003 };
  }
  // ruffle above the drawstring, flaring a little
  const t = (v - vE) / (1 - vE);
  const r = rt + 0.0042 * Math.sin((t * Math.PI) / 2);
  return { y: F.tieY + 0.004 + (F.ruffleTop - 0.003 - F.tieY - 0.004) * t, a: r, b: r, e: 2, amp: 0.0028 + 0.0016 * t };
}

const N_PLEAT = 12;
/** Gathered-cloth pleat profile around the neck: irregular spacing and depth. */
function pleat(th: number, v: number): number {
  const ph = N_PLEAT * th + 0.9 * Math.sin(3 * th + 1.3) + 0.5 * Math.sin(5 * th + 0.4) + 0.6 * snoise(Math.cos(th) * 2, Math.sin(th) * 2, v * 3, 17);
  const depth = 0.65 + 0.55 * (0.5 + 0.5 * snoise(Math.cos(th) * 1.7, Math.sin(th) * 1.7, 5.5, 23));
  return Math.cos(ph) * depth;
}

/** Cover surface point: u around (0..1), v bottom -> top, `inset` pushes it inwards (inner face). */
function coverPoint(u: number, v: number, inset = 0): THREE.Vector3 {
  const th = u * Math.PI * 2;
  const r = ringAt(v);
  const [x, z] = superXZ(th, r.a, r.b, r.e);
  const rad = Math.hypot(x, z) || 1e-6;
  // side seams (two panels sewn at the sides), loose-cloth wrinkles in the body
  const seamD = Math.min(Math.abs(Math.sin(th)), 1);
  const bodyW = sstep(0.1, 0.2, v) * (1 - sstep(0.7, 0.8, v));
  let dr = 0.0011 * Math.exp(-((seamD / 0.06) ** 2)) * sstep(0.02, 0.1, v) * (1 - sstep(0.8, 0.86, v));
  dr += bodyW * (0.0011 * snoise(x * 40, r.y * 25, z * 40, 3) + 0.0005 * snoise(x * 90, r.y * 60, z * 90, 8));
  // loose-cloth drape: broad soft folds, and the neck pleats running out into the upper body
  dr += bodyW * 0.0019 * snoise(x * 14 + 3, r.y * 18, z * 14, 29);
  const run = sstep(0.36, 0.62, v) * (1 - sstep(0.6, 0.66, v));
  dr += 0.0013 * run * pleat(th, v) * sstep(0.36, 0.6, v);
  dr += r.amp * pleat(th, v) - r.amp * 0.3;
  dr -= inset;
  const k = (rad + dr) / rad;
  // the ruffle's free edge is uneven
  const yy = r.y + (v > 0.84 ? (v - 0.84) / 0.16 : 0) * 0.0028 * snoise(Math.cos(th) * 2.2, Math.sin(th) * 2.2, 9.1, 31);
  return new THREE.Vector3(x * k, yy, z * k);
}

function vRows(): number[] {
  const vs: number[] = [];
  const add = (a: number, b: number, n: number) => {
    for (let i = 0; i < n; i++) vs.push(a + ((b - a) * i) / n);
  };
  add(0, 0.05, 3);
  add(0.05, 0.15, 6);
  add(0.15, 0.56, 12);
  add(0.56, 0.78, 14);
  add(0.78, 0.84, 4);
  add(0.84, 1, 7);
  vs.push(1);
  return vs;
}

/** The cover in the display frame (bottom on y = 0). */
function buildCover(): THREE.BufferGeometry {
  const NU = 72;
  const vs = vRows();
  const outer = sweepSurface((u, v) => coverPoint(u, v), NU, 0, { vs, outward: (p) => new THREE.Vector3(p.x, 0, p.z) });
  // inner face of the ruffle + rim (the cloth has thickness where the top is open)
  const T = 0.0011;
  const vsIn = vs.filter((v) => v >= 0.8);
  const inner = sweepSurface((u, v) => coverPoint(u, v, T), NU, 0, { vs: vsIn, outward: (p) => new THREE.Vector3(-p.x, 0, -p.z) });
  const rim = sweepSurface((u, v) => coverPoint(u, 1, T * v), NU, 1, { outward: () => new THREE.Vector3(0, 1, 0) });
  return mergeFlat([outer, inner, rim]);
}

/** Glass neck (thick tube with a rolled lip) and the rubber plug, display frame. */
function buildNeck(): THREE.Object3D[] {
  const F = SU_FLASK;
  const R = F.neckR, top = F.lipTop;
  const glass = G.lathe(
    [
      [0.024, F.tieY - 0.022],
      [0.02, F.tieY - 0.012],
      [R, F.tieY - 0.004],
      [R - 0.0003, top - 0.009],
      [R + 0.0012, top - 0.0075],
      [R + 0.0022, top - 0.005],
      [R + 0.002, top - 0.0015],
      [R + 0.0006, top],
      [0.0112, top],
      [0.0102, top - 0.004],
      [0.0098, F.tieY - 0.01],
      [0.017, F.tieY - 0.024],
    ],
    32,
    35,
  );
  const plug = G.lathe(
    [
      [0, top - 0.013],
      [0.0088, top - 0.013],
      [0.0098, top - 0.004],
      [0.0104, top + 0.0005],
      [0.0122, top + 0.0012],
      [0.0126, top + 0.004],
      [0.0118, top + 0.0068],
      [0.0085, top + 0.0082],
      [0, top + 0.0086],
    ],
    28,
    40,
  );
  const cord = SU.cord();
  const parts: THREE.Object3D[] = [part(glass, SU.glass()), part(plug, SU.rubber())];
  // plug cord: tied round the neck under the lip, a short lead to a turn round the plug head
  const ringY = top - 0.012;
  parts.push(part(G.torus(R + 0.0011, 0.0011, 6, 40), cord, { p: [0, ringY, 0], r: [90, 0, 0] }));
  parts.push(part(G.torus(0.0126, 0.001, 6, 36), cord, { p: [0, top + 0.0026, 0], r: [90, 0, 0] }));
  const a0 = 1.2; // lead leaves the neck ring on the front-left
  const lead = [
    new THREE.Vector3(Math.cos(a0) * (R + 0.0012), ringY + 0.0005, Math.sin(a0) * (R + 0.0012)),
    new THREE.Vector3(Math.cos(a0 + 0.2) * (R + 0.006), ringY + 0.003, Math.sin(a0 + 0.2) * (R + 0.006)),
    new THREE.Vector3(Math.cos(a0 + 0.45) * (R + 0.0075), top + 0.0005, Math.sin(a0 + 0.45) * (R + 0.0075)),
    new THREE.Vector3(Math.cos(a0 + 0.7) * 0.0138, top + 0.0026, Math.sin(a0 + 0.7) * 0.0138),
  ];
  parts.push(part(G.tube(lead, 0.001, 6, 24), cord));
  return parts;
}

/** Drawstring gathered at the neck, knotted at the front with two loops and hanging tails. */
function buildDrawstring(): THREE.Object3D[] {
  const F = SU_FLASK;
  const cord = SU.cord();
  const rr = F.neckR + 0.0032 + 0.0026;
  const y = F.tieY;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const wob = 0.0007 * Math.sin(a * N_PLEAT);
    pts.push(new THREE.Vector3(Math.cos(a) * (rr + wob), y + 0.0006 * Math.sin(a * 3), Math.sin(a) * (rr + wob)));
  }
  const out: THREE.Object3D[] = [part(G.tube(pts, 0.0014, 6, 80, true), cord)];
  const k = new THREE.Vector3(0.004, y - 0.001, rr + 0.0016); // knot on the front
  out.push(part(new THREE.SphereGeometry(0.0032, 12, 10).scale(1.1, 0.85, 0.8).translate(k.x, k.y, k.z), cord));
  const loop = (s: number) => [
    k.clone(),
    k.clone().add(new THREE.Vector3(s * 0.007, 0.004, 0.002)),
    k.clone().add(new THREE.Vector3(s * 0.013, 0.0015, 0.004)),
    k.clone().add(new THREE.Vector3(s * 0.011, -0.004, 0.0035)),
    k.clone().add(new THREE.Vector3(s * 0.004, -0.002, 0.002)),
  ];
  out.push(part(G.tube(loop(1), 0.0013, 6, 24), cord), part(G.tube(loop(-1), 0.0013, 6, 24), cord));
  // tails hang down the shoulder of the cover with overhand knots at the ends
  const tails: [number, number][] = [
    [0.006, 0.05],
    [-0.004, 0.036],
  ];
  for (const [dx, len] of tails) {
    const tp: THREE.Vector3[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const yy = k.y - t * len;
      // follow the cover's outer surface as it widens below the neck
      const v = 0.56 + (0.78 - 0.56) * clamp01((yy - F.bodyTop) / (F.tieY - F.bodyTop));
      const zSurf = ringAt(v).b + 0.0022;
      tp.push(new THREE.Vector3(k.x + dx * t + 0.002 * Math.sin(t * 5), yy, Math.max(k.z * (1 - t) + zSurf * t, zSurf)));
    }
    out.push(part(G.tube(tp, 0.0013, 6, 40), cord));
    const e = tp[tp.length - 1];
    out.push(part(new THREE.SphereGeometry(0.0024, 10, 8).translate(e.x, e.y, e.z), cord));
  }
  return out;
}

/** Strap: sewn onto the side seam, then either a short stub upwards or laid on the ground. */
function buildStrap(mode: CanteenStrap): { parts: THREE.Object3D[]; ends: THREE.Vector3[] } {
  const F = SU_FLASK;
  const mat = SU.canvasStrap();
  const W = F.strapW, T = 0.0022;
  const parts: THREE.Object3D[] = [];
  const ends: THREE.Vector3[] = [];
  const sideX = (y: number) => {
    const v = 0.15 + (0.56 - 0.15) * clamp01((y - 0.012) / (F.bodyTop - 0.012));
    return ringAt(v).a + 0.0011 + T / 2;
  };
  if (mode === 'none') return { parts, ends };
  const thread = SU.thread();
  const y0 = F.strapY - 0.036, y1 = F.strapY + 0.006;
  if (mode === 'display') {
    // one continuous strap: from the +X sewn end it falls back round the side of the cover,
    // lies in a loose loop on the ground behind the flask and rises to the -X sewn end
    const B = F.b + F.cloth;
    const half = (s: number) => {
      const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
      const add = (x: number, y: number, z: number, n: [number, number, number]) => {
        pts.push(new THREE.Vector3(s * x, y, z));
        nrm.push(new THREE.Vector3(s * n[0], n[1], n[2]).normalize());
      };
      add(sideX(y1), y1, 0, [1, 0, 0]);
      add(sideX((y0 + y1) / 2), (y0 + y1) / 2, 0, [1, 0, 0]);
      add(sideX(y0), y0, 0, [1, 0, 0]);
      add(sideX(0.06) + 0.0015, 0.058, -0.017, [1, 0, -0.5]);
      add(sideX(0.04) * 0.86, 0.034, -(B + 0.006), [0.6, 0.2, -1]);
      add(sideX(0.04) * 0.7, 0.012, -(B + 0.02), [0.2, 0.8, -0.6]);
      add(sideX(0.04) * 0.66, T / 2 + 0.0003, -(B + 0.038), [0, 1, 0]);
      const zc = -(B + 0.1), ax = 0.105, az = 0.07;
      for (let i = 1; i <= 7; i++) {
        const a = ((60 - (150 * i) / 8) * Math.PI) / 180;
        add(ax * Math.cos(a) + 0.003 * Math.sin(4 * a), T / 2 + 0.0003, zc + az * Math.sin(a), [0, 1, 0]);
      }
      return { pts, nrm };
    };
    const A = half(1), Bh = half(-1);
    const back = new THREE.Vector3(0, T / 2 + 0.0003, -(B + 0.1) - 0.07);
    const pts = [...A.pts, back, ...Bh.pts.reverse()];
    const nrm = [...A.nrm, new THREE.Vector3(0, 1, 0), ...Bh.nrm.reverse()];
    parts.push(part(G.strap(pts, W, T, nrm, { samples: pts.length * 6 }), mat));
  }
  for (const s of [1, -1]) {
    if (mode === 'stubs') {
      const pts: THREE.Vector3[] = [];
      const nrm: THREE.Vector3[] = [];
      for (const y of [y0, (y0 + y1) / 2, y1]) {
        pts.push(new THREE.Vector3(s * sideX(y), y, 0));
        nrm.push(new THREE.Vector3(s, 0, 0));
      }
      // rises past the shoulder, leaning in towards the carrying shoulder
      const top = [
        [s * (sideX(F.bodyTop) + 0.002), F.bodyTop + 0.012],
        [s * (sideX(F.bodyTop) - 0.004), F.bodyTop + 0.04],
        [s * (sideX(F.bodyTop) - 0.012), F.bodyTop + 0.075],
      ];
      for (const [x, y] of top) {
        pts.push(new THREE.Vector3(x, y, 0));
        nrm.push(new THREE.Vector3(s, 0.25, 0).normalize());
      }
      ends.push(pts[pts.length - 1].clone());
      parts.push(part(G.strap(pts, W, T, nrm, { samples: pts.length * 6 }), mat));
    }
    // box-X stitching of the sewn end
    const zc = 0, h = y1 - y0 - 0.006, yc = (y0 + y1) / 2;
    const xS = s * (sideX(yc) + T / 2 + 0.0003);
    const q = (dy: number, dz: number) => new THREE.Vector3(xS, yc + dy, zc + dz);
    const hw = W / 2 - 0.003, hh = h / 2;
    const g = G.mergeGeometries([
      stitches([q(-hh, -hw), q(-hh, hw), q(hh, hw), q(hh, -hw), q(-hh, -hw)], { len: 0.0028, gap: 0.0016, r: 0.0005 }),
      stitches([q(-hh, -hw), q(hh, hw)], { len: 0.0028, gap: 0.0016, r: 0.0005 }),
      stitches([q(-hh, hw), q(hh, -hw)], { len: 0.0028, gap: 0.0016, r: 0.0005 }),
    ])!;
    parts.push(part(g, thread));
  }
  return { parts, ends };
}

/** The whole canteen in the display frame (bottom on y = 0). */
function buildDisplayFrame(mode: CanteenStrap) {
  const parts: THREE.Object3D[] = [part(buildCover(), SU.cloth())];
  parts.push(...buildNeck(), ...buildDrawstring());
  // side seam stitching up both sides
  const thread = SU.thread();
  for (const s of [0, 0.5]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 36; i++) {
      const v = 0.1 + ((0.74 - 0.1) * i) / 36;
      const p = coverPoint(s, v);
      const k = (Math.hypot(p.x, p.z) + 0.0005) / (Math.hypot(p.x, p.z) || 1);
      pts.push(new THREE.Vector3(p.x * k, p.y, p.z * k + 0.0028));
    }
    parts.push(part(stitches(pts, { len: 0.003, gap: 0.0018, r: 0.0005 }), thread));
  }
  const strap = buildStrap(mode);
  parts.push(...strap.parts);
  return { parts, ends: strap.ends };
}

/** Glass flask in cloth cover with drawstring and strap. */
export function buildSovietCanteen(opts: SovietCanteenOptions = {}): GearPiece {
  const mode = opts.strap ?? 'stubs';
  const { parts, ends } = buildDisplayFrame(mode);
  const inner = group(parts);
  const F = SU_FLASK;
  let object: THREE.Group;
  let anchors: THREE.Vector3[] = [];
  const box = new THREE.Box3().setFromObject(inner, true);
  if (mode === 'display') {
    object = group([inner]);
  } else {
    // gear frame: back of the cover on z = 0, origin between the strap attachments
    const zBack = -(F.b + F.cloth + 0.0022);
    inner.position.set(0, -F.strapY, -zBack);
    object = group([inner]);
    anchors = ends.map((e) => e.clone().add(inner.position));
  }
  object.name = 'su-glass-flask';
  const size = box.getSize(new THREE.Vector3());
  return {
    id: 'su-glass-flask',
    name: 'Glass water flask in cloth cover',
    object,
    mount: 'hip',
    size: { w: size.x, h: size.y, d: size.z },
    strapAnchors: anchors,
  };
}
