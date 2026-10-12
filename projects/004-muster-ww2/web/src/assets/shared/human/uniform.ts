/**
 * Uniforms: the documented `UniformSpec` and the builder that turns it into meshes for a posed body.
 *
 * Garments are SDF cloth layers derived from the body (see garment.ts):
 *  - TUNIC: a loft in rest trunk space (bends with the spine), sleeves along the arm bones,
 *    skirt draped over the thighs and the trouser seat; belt compression + gathering folds, elbow
 *    compression folds, shoulder and armhole seams; neck hole for the collar. Each part is cut
 *    only at its own edges (a cuff plane never touches the other arm or the torso). Hems and cuffs
 *    are separate fine meshes ("edge bands", garment.ts) with the real cloth thickness.
 *  - COLLAR ('stand' | 'turndown'), front placket strip with buttons, pockets (pleat, flap, button),
 *    shoulder straps / boards with piping: conforming patches meshed at 2.5-3 mm.
 *  - TROUSERS ('straight' | 'breeches' | 'tapered'), ending 'tucked' (into boots / puttees),
 *    'bloused' (over boot tops / gaiters) or 'loose'.
 *  - FOOTWEAR (boots.ts) and optional LEGWEAR (gaiters / puttees).
 *
 * HEIGHTS in a spec (belt, hem, pocket centres) are metres above the ground for the 1.76 m figure
 * standing barefoot; they scale with stature and follow the pose (they live in rest trunk space).
 */
import * as THREE from 'three';
import { M } from '../../../core/materials/library';
import type { SurfaceParams } from '../../../core/materials/surface';
import {
  blend, boundsOf, ellipsoid, roundCone, flatCone, smin, smax, sstep, clamp, loftProfile, loftTable,
  type Blob, type SDF, type Frame, type LoftKey,
} from './sdfx';
import { TRUNK_KEYS, inTrunk, sminNear, chainBound, armAxes, perpTo, loftBlob, type BodyModel } from './body';
import {
  garmentBody, edgeBand, planeCut, ridges, bump, surfaceChart, surfaceFrame, patchLayer, chartBounds, rect2, poly2,
  buttonGeometry, alignY, cord, type EdgeSpec, type SurfaceChart,
} from './garment';
import { bootSDF, footMatrix, legCover, legwearSDF, lacePoints, type FootwearSpec, type LegwearSpec } from './boots';
import { meshSDF, meshStats } from './mesh';
import { simplify } from './simplify';
import { sgn, type Side, type Skeleton } from './skeleton';

export type { FootwearSpec, LegwearSpec };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SIDES: Side[] = ['l', 'r'];

// ================================================================== spec

/** Cloth of a garment part. */
export interface ClothSpec {
  /** 'wool' (default), 'cotton' (drill) or 'canvas'. */
  kind?: 'wool' | 'cotton' | 'canvas';
  color: number;
  /** Extra material parameters (roughness, detailSize, dust...) passed to M.wool/M.cotton/M.canvas. */
  mat?: Partial<SurfaceParams>;
}

export type CollarSpec =
  /** Fold-over collar (e.g. German M40): stand + fall with front points. */
  | { style: 'turndown'; /** stand height at the back (m), default 0.032 */ height?: number; /** fall width (m), default 0.045 */ fall?: number; cloth?: ClothSpec }
  /** Standing collar (e.g. Soviet M43 gymnastyorka), closed at the front with small buttons. */
  | { style: 'stand'; /** default 0.036 */ height?: number; cloth?: ClothSpec; /** visible collar buttons (0-2), default 1 */ buttons?: number }
  | { style: 'none' };

export interface FrontSpec {
  /** 'full': buttoned from the collar to the hem; 'placket': short opening below the collar (pullover). */
  style: 'full' | 'placket' | 'none';
  /** Number of visible buttons on the front. */
  buttons: number;
  /** 'placket': length from the collar down (m), default 0.2. */
  length?: number;
  /** Buttons hidden under a fly strip (no visible buttons), default false. */
  fly?: boolean;
  /** Explicit button heights (m, 1.76 m figure barefoot), top to bottom. */
  buttonHeights?: number[];
}

export interface PocketSpec {
  at: 'chest' | 'skirt';
  side: 'l' | 'r' | 'both';
  /** Centre offset from the centre front (m, horizontal), default chest 0.095 / skirt 0.115. */
  x?: number;
  /** Centre height (m, 1.76 m figure barefoot), default chest 1.29 / skirt 0.92. */
  y?: number;
  /** Width and height (m). */
  w: number;
  h: number;
  /** Box pleat down the middle. */
  pleat?: boolean;
  flap?: { h: number; shape?: 'straight' | 'pointed' | 'scalloped'; button?: boolean } | null;
}

export interface ShoulderStrapSpec {
  /** 'strap': soft cloth shoulder strap (German); 'board': stiff shoulder board (Soviet pogon). */
  style: 'strap' | 'board';
  width?: number;
  length?: number;
  cloth?: ClothSpec;
  /** Piping (edge cord) colour, or null for none. */
  piping?: number | null;
  button?: boolean;
}

export interface ButtonSpec {
  color: number;
  /** Painted/pressed metal (default true). */
  metal?: boolean;
  /** Front button diameter (m), default 0.019; pocket / strap buttons 0.016. */
  diameter?: number;
  small?: number;
}

export interface TunicSpec {
  cloth: ClothSpec;
  /** Cloth thickness (m), default 0.0035 (wool). */
  thickness?: number;
  /** Extra looseness added everywhere (m), default 0. */
  ease?: number;
  /** Hem height (m), default 0.80. */
  hem?: number;
  /** Skirt flare: extra half-width per metre below the hips, default 0.08. */
  flare?: number;
  /** Belt line: the tunic is pulled in and gathered here (height m), or null. `gather` 0..1.5, default 1. */
  belt?: { height: number; gather?: number } | null;
  collar: CollarSpec;
  front: FrontSpec;
  pockets?: PocketSpec[];
  shoulderStraps?: ShoulderStrapSpec | null;
  /** Cuff: distance from the wrist joint back up the forearm (m), default 0.012; cuff buttons. */
  cuff?: { back?: number; buttons?: number };
  buttons?: ButtonSpec;
  /** Seam grooves (shoulder, armhole), default true. */
  seams?: boolean;
}

export interface TrouserSpec {
  cloth: ClothSpec;
  /** 'straight' trousers, 'breeches' (full thighs, tight below the knee), 'tapered'. */
  cut: 'straight' | 'breeches' | 'tapered';
  /** Extra thigh fullness (m), default 0 (breeches add 0.03 by themselves). */
  fullness?: number;
  /** 'tucked' into boots/puttees, 'bloused' over boot tops/gaiters, 'loose' hem at the ankle. */
  bottoms: 'tucked' | 'bloused' | 'loose';
}

/**
 * A complete uniform. `id` must be unique per distinct spec (it is part of the mesh cache key).
 * Materials are created with the memoised M.* presets, so identical colours merge into one draw call.
 */
export interface UniformSpec {
  id: string;
  tunic: TunicSpec;
  trousers: TrouserSpec;
  footwear: FootwearSpec;
  legwear?: LegwearSpec | null;
  /** Skin tone and hair colour (defaults 0xc9967a / 0x3a2c22). */
  skin?: { tone?: number; hair?: number };
}

/** A plain reference uniform (olive wool tunic, trousers tucked into jackboots). */
export const TEST_UNIFORM: UniformSpec = {
  id: 'test-olive',
  tunic: {
    cloth: { color: 0x5a5b45 },
    belt: { height: 1.03 },
    collar: { style: 'turndown' },
    front: { style: 'full', buttons: 5 },
    pockets: [
      { at: 'chest', side: 'both', w: 0.115, h: 0.135, pleat: true, flap: { h: 0.052, shape: 'scalloped', button: true } },
      { at: 'skirt', side: 'both', w: 0.16, h: 0.18, flap: { h: 0.065, shape: 'straight', button: true } },
    ],
    shoulderStraps: { style: 'strap', piping: null, button: true },
    buttons: { color: 0x55574a },
  },
  trousers: { cloth: { color: 0x565743 }, cut: 'straight', bottoms: 'tucked' },
  footwear: { style: 'jackboot', leather: 0x221a14 },
};

/** The plain test uniform: olive wool tunic (no pockets, no belt) and trousers tucked into jackboots. */
export const PLAIN_TEST_UNIFORM: UniformSpec = {
  id: 'test-plain-olive',
  tunic: {
    cloth: { color: 0x5a5b45 },
    belt: null,
    hem: 0.8,
    collar: { style: 'turndown' },
    front: { style: 'full', buttons: 5 },
    pockets: [],
    shoulderStraps: null,
    buttons: { color: 0x55574a },
  },
  trousers: { cloth: { color: 0x565743 }, cut: 'straight', bottoms: 'tucked' },
  footwear: { style: 'jackboot', leather: 0x221a14 },
};

/** Heel height for a footwear spec (lifts the skeleton). */
export function footwearLift(f: FootwearSpec, stature = 1.76): number {
  return (f.heel ?? 0.026) * (stature / 1.76);
}

/** Material for a cloth spec (memoised). */
export function clothMaterial(c: ClothSpec): THREE.Material {
  const kind = c.kind ?? 'wool';
  if (kind === 'cotton') return M.cotton(c.color, c.mat ?? {});
  if (kind === 'canvas') return M.canvas(c.color, c.mat ?? {});
  return M.wool(c.color, { detailSize: 0.01, ...(c.mat ?? {}) });
}

// ================================================================== cloth shapes

/** Unbelted tunic inner surface (body + ease), rest trunk space, 1.76 m. */
export const TUNIC_KEYS: LoftKey[] = [
  [-0.3, 0.114, -0.15, 0.196, -0.012],
  [-0.15, 0.113, -0.149, 0.191, -0.012],
  [-0.08, 0.112, -0.147, 0.187, -0.012],
  [-0.02, 0.113, -0.145, 0.183, -0.012],
  [0.03, 0.115, -0.137, 0.178, -0.008],
  [0.08, 0.116, -0.123, 0.17, -0.004],
  [0.13, 0.117, -0.113, 0.164],
  [0.18, 0.118, -0.108, 0.162],
  [0.24, 0.121, -0.112, 0.166],
  [0.3, 0.127, -0.118, 0.171],
  [0.36, 0.135, -0.124, 0.176, -0.006],
  [0.41, 0.137, -0.128, 0.178, -0.012],
  [0.46, 0.126, -0.129, 0.174, -0.016],
  [0.51, 0.108, -0.121, 0.161, -0.02],
  [0.55, 0.083, -0.107, 0.13, -0.02],
  [0.59, 0.058, -0.088, 0.088, -0.016],
  [0.625, 0.045, -0.074, 0.066, -0.016],
];

/** Trouser pelvis inner surface, rest trunk space, 1.76 m. */
export const TROUSER_KEYS: LoftKey[] = [
  [-0.105, 0.045, -0.085, 0.1],
  [-0.06, 0.082, -0.12, 0.146],
  [-0.02, 0.099, -0.13, 0.167, -0.012],
  [0.03, 0.106, -0.124, 0.172, -0.006],
  [0.08, 0.108, -0.112, 0.165],
  [0.13, 0.109, -0.099, 0.155],
  [0.2, 0.108, -0.093, 0.151],
];

const HIP_REST = 0.903;

interface Rt { a: number; zm: number; bf: number; bb: number }

/** Everything the uniform builder derives from the body, shared by all parts. */
/** A garment edge band (hem, cuff, trouser bottom) meshed separately at a fine cell. */
export interface GarmentEdge {
  name: string;
  part: 'tunic' | 'trousers';
  field: SDF;
  min: [number, number, number];
  max: [number, number, number];
  /** Triangle budget after decimation. */
  budget: number;
}

export interface UniformFields {
  /** Tunic inner surface and solid cloth incl. the edge bands (world). */
  tunicInner: SDF;
  tunic: SDF;
  /** Coarse-meshed tunic body (solid, stops inside the edge bands). */
  tunicMain: SDF;
  /** Coarse-meshed trousers body. */
  trousersMain: SDF;
  /** Hems, cuffs and trouser bottoms with real thickness (fine meshes). */
  edges: GarmentEdge[];
  /** Tunic torso only (no sleeves), solid - for weapon clearance and fitting. */
  tunicTorso: SDF;
  trousers: SDF;
  /** Everything worn (tunic, trousers, boots, legwear) - the clothed surface. */
  clothed: SDF;
  /** Rest-space heights. */
  beltRest: number | null;
  hemRest: number;
  /** Collar top edge centre + neck axis (world). */
  collar: { base: THREE.Vector3; axis: THREE.Vector3; top: number };
}

/** Build the garment fields for a body. */
export function uniformFields(spec: UniformSpec, bm: BodyModel): UniformFields {
  const sk = bm.sk, s = sk.s;
  const T = spec.tunic;
  const t = (T.thickness ?? 0.0035) * s;
  const ease = (T.ease ?? 0) * s;
  const yr = (h: number) => (h - HIP_REST) * s;
  const beltRest = T.belt ? yr(T.belt.height) : null;
  const hemRest = yr(T.hem ?? 0.8);
  const gather = T.belt?.gather ?? 1;
  const flare = T.flare ?? 0.08;
  const body = loftProfile(TRUNK_KEYS, s);
  const loose = loftProfile(TUNIC_KEYS, s);
  const yHipMax = 0.0;
  const profile = (y: number): [number, number, number, number] => {
    const p = loose(Math.max(y, -0.3 * s));
    let [a, zm, bf, bb] = p;
    a += ease; bf += ease; bb += ease;
    if (y < yHipMax) { const fl = (yHipMax - y) * flare; a += fl; bf += fl * 0.4; bb += fl * 0.5; }
    if (beltRest !== null) {
      const b = body(beltRest);
      const w = Math.exp(-(((y - beltRest) / (0.03 * s)) ** 2));
      const tgt: Rt = { a: b[0] + 0.004 * s, zm: b[1], bf: b[2] + 0.004 * s, bb: b[3] + 0.004 * s };
      a += (tgt.a - a) * w; zm += (tgt.zm - zm) * w; bf += (tgt.bf - bf) * w; bb += (tgt.bb - bb) * w;
      // blousing just above and below the belt
      const bl = 0.006 * s * gather * bump(y, beltRest + 0.05 * s, 0.03 * s) + 0.004 * s * gather * bump(y, beltRest - 0.045 * s, 0.025 * s);
      a += bl; bf += bl; bb += bl;
    }
    return [a, zm, bf, bb];
  };
  const tunicLoft = loftTable(profile, -0.32 * s, 0.63 * s, 0.003);
  const R = (x: number, y: number, z: number): [number, number, number] => [x * s, y * s, z * s];
  const e1 = 0.012 * s + ease;
  const torsoBlobs: Blob[] = [loftBlob(tunicLoft)];
  for (const m of [1, -1]) torsoBlobs.push({ ...flatCone(R(m * 0.03, 0.563, -0.036), R(m * 0.168, 0.522, -0.026), 0.034 * s + e1, 0.023 * s + e1, V(0, 0, 1), 1.75), k: 0.045 * s });
  torsoBlobs.push({ ...ellipsoid(R(0, 0.49, -0.018), [0.165 * s + e1, 0.055 * s + e1, 0.095 * s + e1]), k: 0.045 * s });
  const torsoRestBase = blend(torsoBlobs, 0.03 * s);
  // waist gathering (vertical folds converging on the belt), shoulder seam groove
  const seams = T.seams !== false;
  const torsoRest: SDF = (x, y, z) => {
    let d = torsoRestBase(x, y, z);
    if (d > 0.02 || d < -0.03) return d;
    if (beltRest !== null && gather > 0 && y > beltRest - 0.1 * s && y < beltRest + 0.12 * s) {
      const w = 0.004 * s * gather * (bump(y, beltRest + 0.035 * s, 0.028 * s) + 0.8 * bump(y, beltRest - 0.033 * s, 0.022 * s));
      if (w > 1e-5) {
        const th = Math.atan2(x, z);
        const backw = 0.55 + 0.45 * sstep(0.3, 2.2, Math.abs(th));
        d -= w * backw * ridges(th / (Math.PI * 2), 16, 2.2, 0.7);
      }
    }
    if (seams) {
      // shoulder seam: along the top of each shoulder, slightly behind the crest
      const ax = Math.abs(x);
      if (ax > 0.07 * s && ax < 0.2 * s && y > 0.49 * s) {
        const zc = -0.03 * s;
        d += 0.0012 * s * Math.exp(-(((z - zc) / (0.004 * s)) ** 2)) * sstep(0.07 * s, 0.09 * s, ax);
      }
    }
    return d;
  };
  const space = bm.space;
  const torsoW = inTrunk(space, torsoRest);
  const chestC = sk.chest.o;
  const torsoB: Blob = { f: torsoW, cx: chestC.x, cy: chestC.y - 0.2 * s, cz: chestC.z, r: 0.62 * s };

  // skirt draped over the thighs (garment thigh tubes, cut off below the hem anyway)
  const skirtThigh: Blob[] = [];
  for (const side of SIDES) {
    const L = sk.leg[side];
    const tt = L.knee.clone().sub(L.hip).normalize();
    skirtThigh.push({ ...roundCone(L.hip.clone().addScaledVector(tt, 0.03 * s), L.hip.clone().addScaledVector(tt, 0.26 * s), 0.083 * s + 0.018 * s + ease, 0.071 * s + 0.018 * s + ease), k: 0.04 * s });
  }
  const skirtBase: SDF = blend([torsoB, ...skirtThigh], 0.03 * s);
  // the skirt must drape OVER the trousers: hull of the trouser seat and upper thighs + cloth + gap
  const fullT = (spec.trousers.fullness ?? 0) * s + (spec.trousers.cut === 'breeches' ? 0.028 * s : 0);
  const hullBlobs: Blob[] = [loftBlob(loftTable(loftProfile(TROUSER_KEYS, s), -0.11 * s, 0.2 * s, 0.004))];
  // one wide seat mass: cloth bridges the cleft between the buttocks
  hullBlobs.push({ ...ellipsoid(R(0, -0.025, -0.064), [0.142 * s, 0.092 * s, 0.074 * s]), k: 0.04 * s });
  const hullRest = blend(hullBlobs, 0.04 * s);
  // the hull only matters over the seat and hips: above them it recedes (no ridge at its top cap)
  const hullPelvis = inTrunk(space, (x, y, z) => hullRest(x, y, z) + 0.03 * s * sstep(0.04 * s, 0.13 * s, y));
  const hullThighs: Blob[] = SIDES.map((side) => {
    const L = sk.leg[side];
    const tv = L.knee.clone().sub(L.hip).normalize();
    return { ...roundCone(L.hip.clone().addScaledVector(tv, 0.02 * s), L.hip.clone().addScaledVector(tv, 0.3 * s), 0.099 * s + fullT * 0.4, 0.078 * s + fullT * 0.3), k: 0.035 * s };
  });
  const pc0 = sk.pelvis.o;
  const hull = blend([{ f: hullPelvis, cx: pc0.x, cy: pc0.y, cz: pc0.z, r: 0.3 * s }, ...hullThighs], 0.035 * s);
  const hullGap = 0.0105 * s;
  // (no early exit on the skirt distance: where the seat hull defines the skirt, the skirt base may
  // be far away, and an over-estimated distance would make the mesher skip blocks -> holes)
  const torsoSkirt: SDF = (x, y, z) => smin(skirtBase(x, y, z), hull(x, y, z) - hullGap, 0.03 * s);
  let inner: SDF = torsoSkirt;
  const edges: GarmentEdge[] = [];
  const box = (pts: THREE.Vector3[], pad: number) => {
    const b = new THREE.Box3();
    for (const p of pts) b.expandByPoint(p);
    b.expandByScalar(pad);
    return { min: b.min.toArray() as [number, number, number], max: b.max.toArray() as [number, number, number] };
  };

  // torso: hem (plane in the pelvis frame, pelvis rigid) and neck hole
  const P = sk.pelvis;
  const hemO = P.o.clone().addScaledVector(P.y, hemRest);
  const N = sk.neck;
  const nb = N.o.clone().addScaledVector(N.z, 0.031 * s).addScaledVector(N.y, -0.02 * s);
  const nt = N.o.clone().addScaledVector(N.z, 0.036 * s).addScaledVector(N.y, 0.3 * s);
  const holeR = 0.062 * s;
  const hole = roundCone(nb, nt, holeR, holeR * 0.9).f;
  const neckCut: SDF = (x, y, z) => -hole(x, y, z);
  const hemEdge: EdgeSpec = { o: hemO, n: P.y.clone().negate(), inner: torsoSkirt, t, height: 0.026 * s, raise: 0.0009 * s };
  {
    const pts: THREE.Vector3[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const sy of [-0.01, 0.036]) {
      pts.push(hemO.clone().addScaledVector(P.x, sx * 0.3 * s).addScaledVector(P.z, sz * 0.24 * s).addScaledVector(P.y, sy * s));
    }
    edges.push({ name: 'hem', part: 'tunic', field: edgeBand(hemEdge), ...box(pts, 0.01), budget: 5000 });
  }
  const torsoBody = garmentBody(torsoSkirt, t, [hemEdge], [neckCut]);
  let tunicMain: SDF = torsoBody;

  // sleeves: each sleeve is cut at its own cuff only (a cuff plane never touches the other arm)
  const cuffBack = (T.cuff?.back ?? 0.012) * s;
  for (const side of SIDES) {
    const A = sk.arm[side];
    const { u, f, ant, lat } = armAxes(sk, side);
    const S = A.shoulder, E = A.elbow;
    const C = A.wrist.clone().addScaledVector(f, -cuffBack);
    const axesU = { x: lat, y: u, z: ant };
    const es = 0.013 * s + ease;
    const delt = { ...ellipsoid(S.clone().addScaledVector(lat, 0.01 * s).addScaledVector(u, 0.03 * s), [0.036 * s + es, 0.058 * s, 0.046 * s + es], axesU), k: 0.018 * s };
    const up = { ...roundCone(S.clone().addScaledVector(u, 0.02 * s), E, 0.058 * s + ease, 0.049 * s + ease), k: 0.03 * s };
    const fore = roundCone(E, C.clone().addScaledVector(f, 0.03 * s), 0.049 * s + ease, 0.044 * s + ease);
    const flexCos = u.dot(f);
    const flexAmt = sstep(0.95, 0.35, flexCos); // 0 straight -> 1 at ~70 deg
    const seed = side === 'l' ? 1.1 : 2.9;
    const armBase = blend([up, delt, { ...fore, k: 0.0025 * s }], 0.02 * s);
    const bis = u.clone().negate().add(f).normalize();
    const antIn = ant.clone();
    const armF: SDF = (x, y, z) => {
      let d = armBase(x, y, z);
      if (d > 0.02 || d < -0.03) return d;
      // elbow compression folds on the inner side
      const rx = x - E.x, ry = y - E.y, rz = z - E.z;
      const along = rx * bis.x + ry * bis.y + rz * bis.z;
      const dist2 = rx * rx + ry * ry + rz * rz;
      if (dist2 < 0.012 * s * s) {
        const inside = (rx * antIn.x + ry * antIn.y + rz * antIn.z) / Math.sqrt(dist2 + 1e-9);
        const w = 0.005 * flexAmt * s * sstep(-0.3, 0.5, inside) * Math.exp(-dist2 / (0.0036 * s * s));
        const q = rx * u.x + ry * u.y + rz * u.z;
        d -= w * ridges(q / (0.03 * s) + along * 8, 1, 2, seed);
      }
      // sleeve drape: two long soft folds down the upper arm, soft bunching above the cuff
      const pu = (x - S.x) * u.x + (y - S.y) * u.y + (z - S.z) * u.z;
      if (pu > 0.06 * s && pu < sk.upperArm - 0.03) {
        const px = (x - S.x) * lat.x + (y - S.y) * lat.y + (z - S.z) * lat.z, pz = (x - S.x) * ant.x + (y - S.y) * ant.y + (z - S.z) * ant.z;
        const th = Math.atan2(px, pz);
        d -= 0.002 * s * bump(pu, 0.15 * s, 0.08 * s) * ridges(th / (Math.PI * 2), 3, 3, seed + 0.4);
      }
      const pc = (x - C.x) * f.x + (y - C.y) * f.y + (z - C.z) * f.z;
      if (pc > -0.09 * s && pc < -0.03 * s) d -= 0.0018 * s * bump(pc, -0.06 * s, 0.018 * s) * ridges(Math.atan2(y - C.y, x - C.x) / 6.283, 3, 2, seed + 1.3);
      return d;
    };
    // cuff: band of real thickness; the cut is limited to a capsule around this forearm
    const reg = roundCone(C.clone().addScaledVector(f, -0.08 * s), C.clone().addScaledVector(f, 0.12 * s), 0.085 * s, 0.085 * s).f;
    const cuffEdge: EdgeSpec = { o: C, n: f, inner: fore.f, t, height: 0.028 * s, raise: 0.0011 * s, region: reg };
    edges.push({
      name: `cuff-${side}`, part: 'tunic', field: edgeBand(cuffEdge),
      ...box([C.clone().addScaledVector(f, 0.012 * s), C.clone().addScaledVector(f, -0.042 * s)], 0.066 * s), budget: 2200,
    });
    const sleeveBody = garmentBody(armF, t, [cuffEdge]);
    const bound = chainBound([S, E, C], 0.078 * s + ease + t);
    tunicMain = sminNear(tunicMain, sleeveBody, S, 0.035 * s, 0.07 * s, 0.16 * s, 0.004 * s, bound);
    inner = sminNear(inner, armF, S, 0.035 * s, 0.07 * s, 0.16 * s, 0.004 * s, chainBound([S, E, C], 0.078 * s + ease));
    if (seams) {
      // armhole seam: shallow groove on a sphere around the shoulder joint (upper half)
      const base = tunicMain;
      const Sc = S.clone(), nx = sk.chest.x.clone().multiplyScalar(sgn(side));
      tunicMain = (x, y, z) => {
        const d = base(x, y, z);
        if (d > 0.015 || d < -0.02) return d;
        const dx = x - Sc.x, dy = y - Sc.y, dz = z - Sc.z;
        const r2 = dx * dx + dy * dy + dz * dz;
        if (r2 > 0.016 * s * s) return d;
        const w = dx * nx.x + dy * nx.y + dz * nx.z - 0.004 * s;
        const fade = 1 - sstep(0.09 * s, 0.125 * s, Math.sqrt(r2));
        return d + 0.0012 * s * fade * Math.exp(-((w / (0.004 * s)) ** 2));
      };
    }
  }
  const tunicEdges = edges.filter((e) => e.part === 'tunic').map((e) => e.field);
  const hemBand = edges[0].field;
  const tunicMainF = tunicMain;
  const tunic: SDF = (x, y, z) => {
    let d = tunicMainF(x, y, z);
    for (const e of tunicEdges) { const v = e(x, y, z); if (v < d) d = v; }
    return d;
  };
  const tunicTorso: SDF = (x, y, z) => Math.min(torsoBody(x, y, z), hemBand(x, y, z));

  // trousers
  const TR = spec.trousers;
  const cover = legCover(spec.footwear, spec.legwear, s);
  const tt = 0.003 * s;
  const tp = loftTable(loftProfile(TROUSER_KEYS, s), -0.11 * s, 0.2 * s, 0.003);
  const trBlobs: Blob[] = [loftBlob(tp)];
  for (const m of [1, -1]) trBlobs.push({ ...ellipsoid(R(m * 0.062, -0.022, -0.068), [0.076 * s + 0.008 * s, 0.085 * s + 0.008 * s, 0.062 * s + 0.008 * s]), k: 0.03 * s });
  const trPelvisRest = blend(trBlobs, 0.03 * s);
  const trPelvis = inTrunk(space, trPelvisRest);
  const legParts: Blob[] = [];
  const trLegF: SDF[] = [];
  const full = (TR.fullness ?? 0) * s + (TR.cut === 'breeches' ? 0.028 * s : 0);
  const tuck = TR.bottoms === 'tucked';
  const trEdges: EdgeSpec[] = [];
  const trCuts: SDF[] = [];
  for (const side of SIDES) {
    const L = sk.leg[side];
    const tv = L.knee.clone().sub(L.hip).normalize();
    const sh = L.ankle.clone().sub(L.knee).normalize();
    const fwd = perpTo(tv, L.foot.z);
    const lat = new THREE.Vector3().crossVectors(tv, fwd).multiplyScalar(-sgn(side));
    if (lat.dot(sk.pelvis.x.clone().multiplyScalar(sgn(side))) < 0) lat.negate();
    const rKnee = (TR.cut === 'breeches' ? 0.06 : TR.cut === 'tapered' ? 0.066 : 0.07) * s;
    const coverAt = L.ankle.clone().addScaledVector(sh.clone().negate(), (cover.top - L.ankle.y) / Math.max(0.5, -sh.y));
    let rBottom: number;
    if (tuck) rBottom = cover.innerTop - 0.0045 * s;
    else if (TR.bottoms === 'bloused') rBottom = cover.outerTop + 0.01 * s;
    else rBottom = 0.062 * s;
    const endP = tuck ? coverAt.clone().addScaledVector(sh, 0.05 * s) : TR.bottoms === 'bloused' ? coverAt.clone().addScaledVector(sh, 0.025 * s) : L.ankle.clone().addScaledVector(sh, -0.03 * s);
    const thigh = { ...roundCone(L.hip.clone().addScaledVector(tv, 0.02 * s), L.knee, 0.099 * s + full * 0.4, rKnee), k: 0.035 * s };
    const midThigh = full > 0 ? [{ ...ellipsoid(L.hip.clone().addScaledVector(tv, 0.17 * s).addScaledVector(lat, 0.012 * s + full * 0.4), [0.088 * s + full * 0.6, 0.17 * s, 0.084 * s + full * 0.4], { x: lat, y: tv, z: fwd }), k: 0.05 * s }] : [];
    // knee to cover top, then continue inside the cover (tucked) / end over it (bloused)
    const kneeToCover = { ...roundCone(L.knee, coverAt, rKnee, rBottom + (tuck ? 0 : 0.002 * s)), k: 0.012 * s };
    const inside = { ...roundCone(coverAt, endP.clone().addScaledVector(sh, 0.03 * s), rBottom, rBottom * 0.96), k: 0.004 * s };
    const legBlobsS = [thigh, ...midThigh, kneeToCover, inside];
    legParts.push(...legBlobsS);
    const knee = L.knee.clone();
    const flexK = sstep(0.999, 0.9, tv.dot(sh));
    const seed = side === 'l' ? 0.3 : 1.9;
    const legBase = blend(legBlobsS, 0.02 * s);
    trLegF.push((x, y, z) => {
      let d = legBase(x, y, z);
      if (d > 0.02 || d < -0.03) return d;
      // back-of-knee compression folds and front knee bagging
      const rx = x - knee.x, ry = y - knee.y, rz = z - knee.z;
      const along = rx * tv.x + ry * tv.y + rz * tv.z;
      if (along > -0.08 * s && along < 0.08 * s) {
        const r2 = rx * rx + ry * ry + rz * rz;
        const back = -(rx * fwd.x + ry * fwd.y + rz * fwd.z) / Math.sqrt(r2 + 1e-9);
        d -= (0.0008 + 0.003 * flexK) * s * sstep(0.1, 0.7, back) * Math.exp(-(along * along) / (0.003 * s * s)) * ridges(along / (0.04 * s), 1, 1.5, seed);
      }
      // bunching above the boot / puttee top (tucked) or blousing folds (bloused)
      const h = y - cover.top;
      if (TR.bottoms !== 'loose' && h > -0.03 * s && h < 0.1 * s) {
        const th = Math.atan2(x - coverAt.x, z - coverAt.z);
        const amp = (tuck ? 0.003 : 0.0045) * s * bump(h, tuck ? 0.035 * s : 0.012 * s, 0.035 * s);
        d -= amp * ridges(h / (0.046 * s) + 0.45 * Math.sin(th * 2 + seed) + 0.25 * Math.sin(th * 3 + seed * 2), 1, 1.4, seed);
        if (!tuck) d -= 0.005 * s * bump(h, 0.0, 0.025 * s);
      }
      return d;
    });
    // bottoms: every cut is limited to this leg (a capsule around the lower shank)
    const reg = roundCone(coverAt.clone().addScaledVector(sh, -0.12 * s), L.ankle.clone().addScaledVector(sh, 0.1), 0.095 * s, 0.095 * s).f;
    if (tuck) {
      const pl = planeCut(endP, sh);
      trCuts.push((x, y, z) => Math.min(pl(x, y, z), -reg(x, y, z)));
    } else {
      const o = TR.bottoms === 'bloused' ? coverAt.clone().addScaledVector(sh, 0.022 * s) : endP;
      const e: EdgeSpec = { o, n: sh, inner: legBase, t: tt, height: 0.024 * s, raise: 0.0009 * s, region: reg };
      trEdges.push(e);
      edges.push({ name: `trouser-bottom-${side}`, part: 'trousers', field: edgeBand(e), ...box([o, o.clone().addScaledVector(sh, -0.03 * s)], 0.085 * s), budget: 2200 });
    }
  }
  const trLegsB: Blob[] = SIDES.map((side, i) => {
    const b = boundsOf(legParts.slice(i * (legParts.length / 2), (i + 1) * (legParts.length / 2)));
    return { f: trLegF[i], cx: b.cx, cy: b.cy, cz: b.cz, r: b.r, k: 0.035 * s };
  });
  const pc = sk.pelvis.o;
  const trInner = blend([{ f: trPelvis, cx: pc.x, cy: pc.y, cz: pc.z, r: 0.3 * s }, ...trLegsB], 0.035 * s);
  // waist top (hidden under the tunic)
  const topO = P.o.clone().addScaledVector(P.y, (beltRest ?? yr(1.03)) + 0.03 * s);
  trCuts.push(planeCut(topO, P.y));
  const trousersMain = garmentBody(trInner, tt, trEdges, trCuts);
  const trouserEdges = edges.filter((e) => e.part === 'trousers').map((e) => e.field);
  const trousers: SDF = (x, y, z) => {
    let d = trousersMain(x, y, z);
    for (const e of trouserEdges) { const v = e(x, y, z); if (v < d) d = v; }
    return d;
  };

  const collarBase = nb;
  const clothed: SDF = (x, y, z) => Math.min(tunic(x, y, z), trousers(x, y, z));
  return {
    tunicInner: inner, tunic, tunicMain: tunicMainF, tunicTorso, trousers, trousersMain, clothed, edges, beltRest, hemRest,
    collar: { base: collarBase, axis: nt.clone().sub(nb).normalize(), top: 0 },
  };
}


// ================================================================== meshing helpers

export interface UniformLOD {
  /** Cell sizes (m). */
  tunic: number;
  trousers: number;
  boots: number;
  detail: number;
  /** Hems, cuffs, trouser bottoms. */
  edge: number;
  /** Triangle budgets after decimation. */
  budget: { tunic: number; trousers: number; boots: number; detail: number };
}

export const DEFAULT_LOD: UniformLOD = {
  tunic: 0.0074,
  trousers: 0.0072,
  boots: 0.0068,
  detail: 0.0026,
  edge: 0.0028,
  budget: { tunic: 30000, trousers: 14000, boots: 4500, detail: 1800 },
};

/** Optional profiling sink (set by tests): receives one line per meshed part. */
export const meshLog: { on: boolean; lines: string[] } = { on: false, lines: [] };

function mesh(f: SDF, min: [number, number, number], max: [number, number, number], cell: number, budget: number, project = 0, name = '', keep?: (x: number, y: number, z: number) => boolean): THREE.BufferGeometry {
  const t0 = performance.now();
  const g = meshSDF(f, { min, max }, cell, { project, keep });
  const t1 = performance.now();
  // tight error: thin patches (pockets, plackets, collar falls, hem bands) sit 1-5 mm above the
  // cloth, so the decimated cloth must not bulge through them
  const out = simplify(g, budget, { maxError: Math.min(cell * 0.35, 0.0009) });
  if (meshLog.on) {
    meshLog.lines.push(name.padEnd(16) + ' cell ' + (cell * 1000).toFixed(1) + 'mm mesh ' + (t1 - t0).toFixed(0) + 'ms (' + meshStats.evals +
      ' evals) simp ' + (performance.now() - t1).toFixed(0) + 'ms tris ' + g.index!.count / 3 + ' -> ' + out.index!.count / 3);
  }
  return out;
}

/** World-space AABB helper. */
function boxAround(pts: THREE.Vector3[], pad: number): { min: [number, number, number]; max: [number, number, number] } {
  const b = new THREE.Box3();
  for (const p of pts) b.expandByPoint(p);
  b.expandByScalar(pad);
  return { min: b.min.toArray() as [number, number, number], max: b.max.toArray() as [number, number, number] };
}

// ================================================================== the builder

export interface UniformBuild {
  /** Meshes in asset space (skin is not included: head and hands are separate). */
  parts: THREE.Mesh[];
  fields: UniformFields;
  /** Named frames on the uniform surface (x = right-to-left across, y = up, z = outward normal). */
  anchors: Record<string, Frame>;
}

/** Build all uniform meshes for a body. */
export function buildUniform(spec: UniformSpec, bm: BodyModel, lod: UniformLOD = DEFAULT_LOD): UniformBuild {
  const sk = bm.sk, s = sk.s;
  let tl = performance.now();
  const stage = (name: string) => {
    const n = performance.now();
    if (meshLog.on) meshLog.lines.push(`[stage] ${name} ${(n - tl).toFixed(0)}ms`);
    tl = n;
  };
  const F = uniformFields(spec, bm);
  stage('fields');
  const T = spec.tunic;
  const parts: THREE.Mesh[] = [];
  const anchors: Record<string, Frame> = {};
  const tunicMat = clothMaterial(T.cloth);
  const trouserMat = clothMaterial(spec.trousers.cloth);
  const add = (g: THREE.BufferGeometry, m: THREE.Material, name: string) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.name = name;
    parts.push(mesh);
    return mesh;
  };

  // ---- tunic
  {
    const pts: THREE.Vector3[] = [sk.neck.o.clone().addScaledVector(sk.neck.y, 0.08 * s), sk.pelvis.o.clone().addScaledVector(sk.pelvis.y, F.hemRest)];
    for (const side of SIDES) { const A = sk.arm[side]; pts.push(A.shoulder, A.elbow, A.wrist); }
    for (const side of SIDES) pts.push(sk.leg[side].hip.clone().addScaledVector(sk.leg[side].knee.clone().sub(sk.leg[side].hip).normalize(), 0.12 * s));
    // explicit torso extents (joints alone can leave the back of the skirt outside the box)
    const P = sk.pelvis, C = sk.chest;
    for (const [fr, h] of [[P, F.hemRest], [P, 0], [P, 0.2 * s], [C, 0], [C, 0.2 * s]] as const) {
      const o = fr.o.clone().addScaledVector(fr.y, h);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push(o.clone().addScaledVector(fr.x, sx * 0.2 * s).addScaledVector(fr.z, sz * 0.13 * s));
    }
    const b = boxAround(pts, 0.13 * s);
    b.min[1] = Math.max(b.min[1], sk.pelvis.o.y + F.hemRest - 0.08 * s);
    add(mesh(F.tunicMain, b.min, b.max, lod.tunic * s, lod.budget.tunic, 0, 'tunic'), tunicMat, 'tunic');
  }
  // ---- trousers
  {
    const pts: THREE.Vector3[] = [sk.pelvis.o.clone().addScaledVector(sk.pelvis.y, (F.beltRest ?? 0.13 * s) + 0.03 * s)];
    for (const side of SIDES) { const L = sk.leg[side]; pts.push(L.hip, L.knee, L.ankle.clone().setY(0.14 * s)); }
    // the seat and the front of the thighs reach well beyond the joints
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push(sk.pelvis.o.clone().addScaledVector(sk.pelvis.x, sx * 0.18 * s).addScaledVector(sk.pelvis.z, sz * 0.12 * s).addScaledVector(sk.pelvis.y, -0.05 * s));
    const b = boxAround(pts, 0.13 * s);
    const cover = legCover(spec.footwear, spec.legwear, s);
    b.min[1] = Math.max(0, cover.top - 0.08 * s);
    b.max[1] = Math.min(b.max[1], sk.pelvis.o.y + (F.beltRest ?? 0.13 * s) + 0.045 * s);
    const tun = F.tunic;
    add(mesh(F.trousersMain, b.min, b.max, lod.trousers * s, lod.budget.trousers, 0, 'trousers', (x, y, z) => tun(x, y, z) > -0.004 * s), trouserMat, 'trousers');
  }
  // ---- hems, cuffs, trouser bottoms (fine)
  for (const e of F.edges) {
    const tun = F.tunic;
    const keep = e.part === 'trousers' ? (x: number, y: number, z: number) => tun(x, y, z) > -0.003 * s : undefined;
    add(mesh(e.field, e.min, e.max, lod.edge * s, Math.round(e.budget * (lod.budget.tunic / 30000)), 1, e.name, keep), e.part === 'tunic' ? tunicMat : trouserMat, e.name);
  }
  // ---- boots, soles, legwear
  buildFootwear(spec, bm, lod, add);

  // ---- collar, placket, pockets, straps, buttons
  const btn = T.buttons ?? { color: 0x55574a };
  const btnMat = btn.metal === false
    ? M.surface({ color: btn.color, roughness: 0.6, name: 'button-' + btn.color })
    : M.paint(btn.color, { roughness: 0.42, metalness: 0.35, wear: 0.4, dust: 0.08, cavity: 0.2, name: 'button-' + btn.color });
  const btnGeo = buttonGeometry((btn.diameter ?? 0.019) * s, 0.0052 * s, 18);
  const btnSmall = buttonGeometry((btn.small ?? 0.016) * s, 0.0046 * s, 16);
  const buttonAt = (geo: THREE.BufferGeometry, p: THREE.Vector3, n: THREE.Vector3, name: string) => {
    const m = new THREE.Mesh(geo, btnMat);
    m.applyMatrix4(alignY(p, n));
    m.name = name;
    parts.push(m);
  };
  stage('garments+boots');
  buildCollar(spec, bm, F, lod, add, anchors, buttonAt, btnSmall);
  stage('collar');
  buildFront(spec, bm, F, lod, add, buttonAt, btnGeo);
  stage('front');
  buildPockets(spec, bm, F, lod, add, buttonAt, btnSmall, anchors);
  stage('pockets');
  buildStraps(spec, bm, F, lod, add, buttonAt, btnSmall, anchors);
  stage('straps');
  return { parts, fields: F, anchors };
}

// ---------------------------------------------------------------- footwear

function buildFootwear(spec: UniformSpec, bm: BodyModel, lod: UniformLOD, add: (g: THREE.BufferGeometry, m: THREE.Material, n: string) => THREE.Mesh) {
  const sk = bm.sk, s = sk.s;
  const FW = spec.footwear;
  const upperMat = M.leather(FW.leather, { roughness: 0.5, wear: 0.3, dust: 0.28, dustHeight: 0.25, name: 'boot-' + FW.leather });
  const soleMat = M.leather(FW.sole ?? 0x19140f, { roughness: 0.72, wear: 0.2, dust: 0.45, dustHeight: 0.15, detailStrength: 0.3, name: 'sole-' + (FW.sole ?? 0x19140f) });
  for (const side of SIDES) {
    const L = sk.leg[side];
    const foot = L.foot;
    // shank direction in the (left-foot) boot frame
    const shW = L.knee.clone().sub(L.ankle).normalize();
    const sh = V(shW.dot(foot.x), shW.dot(foot.y), shW.dot(foot.z));
    if (side === 'r') sh.x = -sh.x;
    const bt = bootSDF(FW, s, L.ankle.y, sh);
    const mtx = footMatrix(foot, side);
    const up = mesh(bt.upper, bt.min, bt.max, lod.boots * s, lod.budget.boots, 1, 'boot', (x, y, z) => bt.sole(x, y, z) > -0.0008 * s);
    const rim = mesh(bt.rim, bt.rimMin, bt.rimMax, lod.edge * s, 1600, 1, 'boot-rim');
    const so = mesh(bt.sole, [-0.07 * s, -0.003, -0.09 * s], [0.07 * s, 0.035 * s, 0.25 * s], 0.0042 * s, 1500, 1, 'sole', (x, y, z) => bt.upper(x, y, z) > -0.0008 * s);
    for (const [g, m, n] of [[up, upperMat, 'boot'], [rim, upperMat, 'boot-rim'], [so, soleMat, 'sole']] as const) {
      const me = add(g, m, `${n}-${side}`);
      me.applyMatrix4(mtx);
    }
    if (FW.style === 'ankle' && FW.laces !== false) {
      const lp = lacePoints(s, L.ankle.y);
      const laceMat = M.leather(0x241c15, { roughness: 0.7, name: 'lace' });
      const g = new THREE.BufferGeometry();
      const geos: THREE.BufferGeometry[] = [];
      for (const [a, b] of lp.crosses) geos.push(cord([a.clone().add(V(0, 0, 0.004 * s)), a.clone().lerp(b, 0.5).add(V(0, 0, 0.0065 * s)), b.clone().add(V(0, 0, 0.004 * s))], 0.0012 * s, false, 4));
      void g;
      for (const gg of geos) { const me = add(gg, laceMat, `lace-${side}`); me.applyMatrix4(mtx); }
    }
  }
  const LW = spec.legwear;
  if (LW) {
    const mat = LW.kind === 'wool' || LW.style === 'puttees' ? M.wool(LW.color, { detailSize: 0.008 }) : M.canvas(LW.color);
    const strapMat = M.leather(LW.strap ?? 0x3b2a1c, { name: 'gaiter-strap' });
    for (const side of SIDES) {
      const legB = [...bm.leg[side].shank];
      const shankF = blend(legB, 0.02 * s);
      const lw = legwearSDF(sk, side, LW, shankF);
      add(mesh(lw.f, lw.min, lw.max, 0.004 * s, 4500, 1), mat, `legwear-${side}`);
      if (lw.straps) add(mesh(lw.straps, lw.min, lw.max, 0.003 * s, 1600, 1), strapMat, `legwear-strap-${side}`);
    }
  }
}

// ---------------------------------------------------------------- collar

function buildCollar(
  spec: UniformSpec, bm: BodyModel, F: UniformFields, lod: UniformLOD,
  add: (g: THREE.BufferGeometry, m: THREE.Material, n: string) => THREE.Mesh, anchors: Record<string, Frame>,
  buttonAt: (g: THREE.BufferGeometry, p: THREE.Vector3, n: THREE.Vector3, name: string) => void, btnSmall: THREE.BufferGeometry,
) {
  const C = spec.tunic.collar;
  if (C.style === 'none') return;
  const sk = bm.sk, s = sk.s, N = sk.neck;
  const mat = clothMaterial(C.cloth ?? spec.tunic.cloth);
  // collar frame: axis along the neck, origin at the neck axis at the neck base
  const ax = F.collar.axis.clone();
  const zf = perpTo(ax, N.z);
  const xf = new THREE.Vector3().crossVectors(ax, zf);
  const o = F.collar.base.clone();
  // neckline height per angle: where a cylinder of radius rc meets the tunic
  const rIn = 0.0595 * s, tC = 0.0048 * s;
  const rMid = rIn + tC / 2;
  const nA = 48;
  const hNL = new Float32Array(nA + 1);
  for (let i = 0; i <= nA; i++) {
    const th = (i / nA) * Math.PI * 2 - Math.PI;
    const dir = zf.clone().multiplyScalar(Math.cos(th)).addScaledVector(xf, Math.sin(th));
    let h = 0.12 * s;
    for (; h > -0.1 * s; h -= 0.002 * s) {
      const p = o.clone().addScaledVector(ax, h).addScaledVector(dir, rIn + tC + 0.004 * s);
      if (F.tunicTorso(p.x, p.y, p.z) < 0) break;
    }
    hNL[i] = h;
  }
  const nl = (th: number) => {
    const f = ((th + Math.PI) / (Math.PI * 2)) * nA;
    const i = clamp(Math.floor(f), 0, nA - 1), a = f - i;
    return hNL[i] * (1 - a) + hNL[i + 1] * a;
  };
  const turndown = C.style === 'turndown';
  const standH = (C.height ?? (turndown ? 0.032 : 0.036)) * s;
  const fallW = (turndown ? (C as { fall?: number }).fall ?? 0.045 : 0) * s;
  const ox = o.x, oy = o.y, oz = o.z;
  // the stand rises from the neckline; its top is level with the back of the neckline
  let hBack = -Infinity;
  for (let i = 0; i <= nA; i++) hBack = Math.max(hBack, hNL[i]);
  const topAt = (th: number) => {
    const front = Math.cos(th); // 1 at the front
    return hBack + standH - (turndown ? 0.012 : 0.008) * s * sstep(0.2, 1, front);
  };
  const tunicF = F.tunicTorso;
  const tFall = 0.005 * s;
  const stand = (r: number, h: number, th: number) => {
    const hb = nl(th) - 0.012 * s, ht = topAt(th);
    return rect2(r, h, rMid, (hb + ht) / 2, tC / 2, (ht - hb) / 2, tC * 0.45);
  };
  const f: SDF = (x, y, z) => {
    const px = x - ox, py = y - oy, pz = z - oz;
    const h = px * ax.x + py * ax.y + pz * ax.z;
    const rx = px - ax.x * h, ry = py - ax.y * h, rz = pz - ax.z * h;
    const r = Math.sqrt(rx * rx + ry * ry + rz * rz);
    const th = Math.atan2(rx * xf.x + ry * xf.y + rz * xf.z, rx * zf.x + ry * zf.y + rz * zf.z);
    const ht = topAt(th);
    let d = stand(r, h, th);
    if (turndown) {
      // fall: a layer folded over the stand (from the fold at the top down past the neckline) and
      // draped onto the tunic; at the back it ends just below the neckline seam, at the front it
      // runs further down into the collar points. Limited by height below the fold, not by radius
      // (a radial limit lets it spread over the shoulders).
      const g = smin(d, tunicF(x, y, z), 0.014 * s);
      const front = sstep(0.25, 1, Math.cos(th));
      const bottom = nl(th) - (0.005 + (fallW - 0.02 * s) * front * front) ;
      const fall = Math.max(g - tFall, -g - 0.0015 * s, bottom - h, h - (ht + tC * 0.5 + tFall * 0.6), r - (rMid + 0.075 * s));
      d = smin(d, fall, 0.0025 * s);
    }
    // front opening: the ends meet at the throat; the fall opens in a V (collar points)
    const arc = r * Math.abs(th);
    const vOpen = turndown ? 0.004 * s + Math.max(0, ht - h) * 0.85 : 0.0025 * s;
    d = smax(d, vOpen - arc, 0.0012 * s);
    return d;
  };
  const b = boxAround([o.clone().addScaledVector(ax, -0.06 * s), o.clone().addScaledVector(ax, hBack + standH + 0.02 * s)], 0.07 * s + fallW);
  add(mesh(f, b.min, b.max, 0.0022 * s, turndown ? 4500 : 3000, 1, 'collar', (x, y, z) => tunicF(x, y, z) > -0.0055 * s), mat, 'collar');
  // collar front frames (for collar tabs / insignia): on the fall (turndown) or the stand
  for (const side of SIDES) {
    const th = sgn(side) * (turndown ? 0.55 : 0.45);
    const dir = zf.clone().multiplyScalar(Math.cos(th)).addScaledVector(xf, Math.sin(th));
    const h = topAt(th) - (turndown ? 0.018 * s : standH * 0.5);
    const rr = turndown ? rMid + tC / 2 + fallW * 0.45 : rMid + tC / 2;
    const seed = o.clone().addScaledVector(ax, h).addScaledVector(dir, rr + 0.02 * s);
    const fr = surfaceFrame((x, y, z) => f(x, y, z), seed, ax, dir);
    const p = fr.o, n = fr.z;
    const y = ax.clone().addScaledVector(n, -ax.dot(n)).normalize();
    anchors[`collar-${side}`] = { o: p, x: new THREE.Vector3().crossVectors(y, n), y, z: n };
  }
  if (C.style === 'stand' && (C.buttons ?? 1) > 0) {
    const h = (nl(0) + topAt(0)) / 2;
    const p = o.clone().addScaledVector(ax, h).addScaledVector(zf, rMid + tC / 2 + 0.001 * s).addScaledVector(xf, 0.006 * s);
    buttonAt(btnSmall, p, zf.clone(), 'collar-button');
  }
  void lod;
}

// ---------------------------------------------------------------- front placket

function frontChartFrame(bm: BodyModel, F: UniformFields, xOff: number, y: number): Frame {
  const sk = bm.sk;
  const up = bm.space.dirToWorld(V(0, 1, 0), y - sk.pelvis.o.y);
  const fwd = sk.chest.z.clone();
  const seed = V(xOff, y, sk.chest.o.z + 0.2 * sk.s).addScaledVector(sk.chest.x, 0);
  // start in front of the body and project onto the tunic
  return surfaceFrame(F.tunicTorso, seed, up, fwd);
}

function buildFront(
  spec: UniformSpec, bm: BodyModel, F: UniformFields, lod: UniformLOD,
  add: (g: THREE.BufferGeometry, m: THREE.Material, n: string) => THREE.Mesh,
  buttonAt: (g: THREE.BufferGeometry, p: THREE.Vector3, n: THREE.Vector3, name: string) => void, btnGeo: THREE.BufferGeometry,
) {
  const FR = spec.tunic.front;
  if (FR.style === 'none') return;
  const sk = bm.sk, s = sk.s;
  const mat = clothMaterial(spec.tunic.cloth);
  const toWorldY = (h: number) => sk.pelvis.o.y + (h - HIP_REST) * s;
  const yTop = sk.neck.o.y - 0.035 * s;
  const yBot = FR.style === 'full' ? sk.pelvis.o.y + F.hemRest + 0.003 * s : yTop - (FR.length ?? 0.2) * s;
  const yMid = (yTop + yBot) / 2;
  const halfV = (yTop - yBot) / 2;
  // chart along the centre front
  const cf = sk.chest.o.clone();
  const fr0 = frontChartFrame(bm, F, cf.x, yMid);
  const frame: Frame = { o: fr0.o, x: sk.chest.x.clone(), y: V(0, 1, 0), z: sk.chest.z.clone().setY(0).normalize() };
  frame.x = new THREE.Vector3().crossVectors(frame.y, frame.z).normalize();
  const chart = surfaceChart(F.tunicTorso, frame, 0.05 * s, halfV + 0.01 * s, 0.004 * s, 0.09 * s);
  // overlapping panel edge 1.8 cm to the wearer's right of the centre line; the strip fades out
  const edgeU = -0.018 * s, w = 0.04 * s;
  const outline = (u: number, v: number) => Math.max(edgeU - u, u - (edgeU + w), Math.abs(v) - halfV);
  // the overlapping front edge stands 2.2 mm proud; towards the sewn inner edge the strip thins
  // to 0.8 mm (a stitched step), never to a sliver thinner than the mesh can resolve
  const tStrip = 0.0022 * s;
  const topFn = (u: number) => tStrip - 0.0014 * s * sstep(edgeU + w * 0.3, edgeU + w, u);
  const f = patchLayer(chart, outline, tStrip, 0.003 * s, 0.0007 * s, topFn);
  const b = chartBounds(frame, edgeU - 0.008 * s, edgeU + w + 0.008 * s, -halfV - 0.008 * s, halfV + 0.008 * s, -0.1 * s, 0.02 * s);
  add(mesh(f, b.min, b.max, 0.0024 * s, 3000, 1, 'placket', (x, y, z) => chart.sdf(x, y, z) > -0.0015 * s), mat, 'placket');
  if (!FR.fly && FR.buttons > 0) {
    const hs = FR.buttonHeights?.map(toWorldY) ?? Array.from({ length: FR.buttons }, (_, i) => {
      const top = yTop - 0.022 * s, bot = FR.style === 'full' ? toWorldY(0.93) : yBot + 0.025 * s;
      return FR.buttons === 1 ? top : top + ((bot - top) * i) / (FR.buttons - 1);
    });
    hs.forEach((y, i) => {
      const v = y - frame.o.y;
      const p = chart.point(0, v, tStrip);
      buttonAt(btnGeo, p, chart.normal(0, v), `front-button-${i}`);
    });
  }
}

// ---------------------------------------------------------------- pockets

function buildPockets(
  spec: UniformSpec, bm: BodyModel, F: UniformFields, lod: UniformLOD,
  add: (g: THREE.BufferGeometry, m: THREE.Material, n: string) => THREE.Mesh,
  buttonAt: (g: THREE.BufferGeometry, p: THREE.Vector3, n: THREE.Vector3, name: string) => void, btnSmall: THREE.BufferGeometry,
  anchors: Record<string, Frame>,
) {
  const sk = bm.sk, s = sk.s;
  const mat = clothMaterial(spec.tunic.cloth);
  for (const P of spec.tunic.pockets ?? []) {
    const sides: Side[] = P.side === 'both' ? ['l', 'r'] : [P.side];
    for (const side of sides) {
      const chest = P.at === 'chest';
      const xo = (P.x ?? (chest ? 0.095 : 0.115)) * s * sgn(side);
      const yh = P.y ?? (chest ? 1.29 : 0.92);
      const yw = sk.pelvis.o.y + (yh - HIP_REST) * s;
      const trunkDir = bm.space.dirToWorld(V(0, 1, 0), (yh - HIP_REST) * s);
      const lateral = chest ? sk.chest.x : sk.pelvis.x;
      const fwd = (chest ? sk.chest.z : sk.pelvis.z).clone();
      // seed in front of the body at the pocket position, projected onto the tunic
      const seedBase = bm.space.toWorld(V((P.x ?? (chest ? 0.095 : 0.115)) * s * sgn(side), (yh - HIP_REST) * s, 0.25 * s));
      const fr = surfaceFrame(F.tunicTorso, seedBase.clone().addScaledVector(fwd, 0), trunkDir, fwd);
      void xo; void yw; void lateral;
      const w = P.w * s, h = P.h * s;
      const chart = surfaceChart(F.tunicTorso, fr, w / 2 + 0.012 * s, h / 2 + 0.012 * s, 0.0035 * s, 0.07 * s);
      const tP = 0.0025 * s;
      const pocket = (u: number, v: number) => rect2(u, v, 0, 0, w / 2, h / 2, 0.006 * s);
      let f = patchLayer(chart, pocket, tP, 0.003 * s, 0.0009 * s);
      if (P.pleat) {
        const base = f;
        const pw = 0.022 * s;
        f = (x, y, z) => {
          const d = base(x, y, z);
          if (d > 0.004) return d;
          const dx = x - fr.o.x, dy = y - fr.o.y, dz = z - fr.o.z;
          const u = dx * fr.x.x + dy * fr.x.y + dz * fr.x.z;
          const g = Math.min(Math.abs(u - pw), Math.abs(u + pw));
          return d + 0.0012 * s * Math.exp(-((g / (0.0016 * s)) ** 2));
        };
      }
      if (P.flap) {
        const fh = P.flap.h * s, fw = w / 2 + 0.004 * s;
        const top = h / 2 + 0.006 * s;
        const shape = P.flap.shape ?? 'straight';
        const bottomAt = (u: number) => {
          const t = Math.abs(u) / fw;
          if (shape === 'pointed') return top - fh + (fh * 0.28) * t;
          if (shape === 'scalloped') return top - fh + fh * 0.22 * t * t + 0.004 * s * Math.sin(t * Math.PI) - 0.0;
          return top - fh + 0.002 * s * t * t;
        };
        const flapOut = (u: number, v: number) => Math.max(Math.abs(u) - fw, v - top, bottomAt(u) - v);
        const flap = patchLayer(chart, flapOut, tP * 2.15, 0.0015 * s, 0.001 * s);
        const base = f;
        f = (x, y, z) => Math.min(base(x, y, z), flap(x, y, z));
        if (P.flap.button !== false) {
          const vb = bottomAt(0) + 0.013 * s;
          buttonAt(btnSmall, chart.point(0, vb, tP * 2.2), chart.normal(0, vb), `pocket-button-${P.at}-${side}`);
        }
      }
      const b = chartBounds(fr, -w / 2 - 0.01 * s, w / 2 + 0.01 * s, -h / 2 - 0.01 * s, h / 2 + 0.012 * s, -0.028 * s, 0.012 * s);
      add(mesh(f, b.min, b.max, lod.detail * s, lod.budget.detail, 1, 'pocket-' + P.at, (x, y, z) => chart.sdf(x, y, z) > -0.0015 * s), mat, `pocket-${P.at}-${side}`);
      anchors[`pocket-${P.at}-${side}`] = fr;
    }
  }
}

// ---------------------------------------------------------------- shoulder straps / boards

function buildStraps(
  spec: UniformSpec, bm: BodyModel, F: UniformFields, lod: UniformLOD,
  add: (g: THREE.BufferGeometry, m: THREE.Material, n: string) => THREE.Mesh,
  buttonAt: (g: THREE.BufferGeometry, p: THREE.Vector3, n: THREE.Vector3, name: string) => void, btnSmall: THREE.BufferGeometry,
  anchors: Record<string, Frame>,
) {
  const SS = spec.tunic.shoulderStraps;
  if (!SS) return;
  const sk = bm.sk, s = sk.s;
  const board = SS.style === 'board';
  const mat = clothMaterial(SS.cloth ?? spec.tunic.cloth);
  const w = (SS.width ?? (board ? 0.06 : 0.047)) * s;
  const len = (SS.length ?? (board ? 0.14 : 0.125)) * s;
  for (const side of SIDES) {
    const A = sk.arm[side];
    // from the shoulder seam (above the acromion) towards the collar
    const outer = bm.space.toWorld(V(sgn(side) * 0.17 * s, 0.6 * s, -0.022 * s));
    const innerP = bm.space.toWorld(V(sgn(side) * 0.05 * s, 0.64 * s, -0.022 * s));
    void A;
    const mid = outer.clone().lerp(innerP, 0.5);
    const along = innerP.clone().sub(outer).normalize();
    const fr0 = surfaceFrame(F.tunic, mid.clone().addScaledVector(bm.space.dirToWorld(V(0, 1, 0), 0.6 * s), 0.03 * s), along, bm.space.dirToWorld(V(0, 1, 0), 0.6 * s));
    // frame: y along the strap towards the collar, z outward (up)
    const chart = surfaceChart(F.tunic, fr0, w / 2 + 0.01 * s, len / 2 + 0.015 * s, 0.003 * s, 0.05 * s);
    const tS = (board ? 0.0048 : 0.0035) * s;
    const v0 = -len / 2 + 0.004 * s, v1 = len / 2;
    const tip = board ? w * 0.28 : w * 0.45;
    const outline = (u: number, v: number) => {
      if (v < v1 - tip) return Math.max(Math.abs(u) - w / 2, v0 - v);
      // pointed / rounded end towards the collar
      if (board) return poly2(u, v, [[-w / 2, v0], [w / 2, v0], [w / 2, v1 - tip], [0, v1], [-w / 2, v1 - tip]]);
      const cu = 0, cv = v1 - w / 2;
      return Math.max(Math.sqrt((u - cu) ** 2 + (v - cv) ** 2) - w / 2, v0 - v);
    };
    const f = patchLayer(chart, outline, tS, 0.003 * s, 0.0012 * s);
    const b = chartBounds(fr0, -w / 2 - 0.008 * s, w / 2 + 0.008 * s, -len / 2 - 0.008 * s, len / 2 + 0.008 * s, -0.03 * s, 0.014 * s);
    add(mesh(f, b.min, b.max, lod.detail * s, 1500, 1, 'strap', (x, y, z) => chart.sdf(x, y, z) > -0.0015 * s), mat, `shoulder-strap-${side}`);
    if (SS.piping != null) {
      const pm = M.wool(SS.piping, { detailSize: 0.006, name: 'piping-' + SS.piping });
      const pts: THREE.Vector3[] = [];
      const n = 40;
      for (let i = 0; i <= n; i++) {
        const tt = i / n;
        // walk the outline: up the right edge, round the end, down the left edge
        let u: number, v: number;
        if (tt < 0.35) { u = w / 2; v = v0 + (v1 - tip - v0) * (tt / 0.35); }
        else if (tt < 0.65) { const a = ((tt - 0.35) / 0.3) * Math.PI; u = (w / 2) * Math.cos(a); v = v1 - tip + tip * Math.sin(a) * (board ? 1 : 1); }
        else { u = -w / 2; v = v1 - tip - (v1 - tip - v0) * ((tt - 0.65) / 0.35); }
        pts.push(chart.point(u * 0.97, v, tS));
      }
      add(cord(pts, 0.0016 * s, false, 5), pm, `strap-piping-${side}`);
    }
    if (SS.button !== false) {
      const vb = v1 - (board ? tip + 0.012 * s : w * 0.5);
      buttonAt(btnSmall, chart.point(0, vb, tS), chart.normal(0, vb), `strap-button-${side}`);
    }
    anchors[`shoulder-strap-${side}`] = fr0;
  }
  void lod;
}

export type { SurfaceChart };
