/**
 * Hands: anatomical SDF hands with three-segment fingers, knuckles, palm pads and an opposable
 * thumb, meshed at ~2.2 mm.
 *
 * HAND-LOCAL FRAME (right hand; the left hand is its mirror image, see below):
 *   origin = wrist joint centre, +Y = towards the fingers (distal), +Z = palm normal (palmar side),
 *   +X = thumb side (radial). The LEFT hand uses the same proper frame (+Y distal, +Z palmar) but
 *   its geometry is mirrored (x -> -x), so its thumb lies on -X. `handMatrix()` returns the full
 *   hand-local -> world matrix including that mirror (determinant -1 for the left hand).
 *
 * GRIP CONVENTION (see Grip in shared/contracts.ts): the fist wraps a cylinder of `grip.radius`
 * whose axis points from the little-finger side to the index/thumb side; `grip.palm` points from
 * the cylinder centre to the palm. In hand-local space the canonical grip cylinder crosses the
 * palm diagonally (index end more distal, ~22 deg), centre at GRIP_CENTRE, palm contact on -Z.
 * Fingers are solved segment by segment to the tightest curl that does not penetrate the
 * cylinder; the cylinder is also carved out of the hand so soft tissue flattens against it
 * (no penetration, no visible gap).
 */
import * as THREE from 'three';
import { meshSDF as sdfMesh } from './mesh';
import { simplify } from './simplify';

/** Length of the forearm stub meshed with each hand (it disappears into the sleeve). */
export const FOREARM_STUB = 0.075;
import { blend, carve, ellipsoid, flatCone, lineCylinder, roundCone, sphere, smax, smin, type Blob, type Frame, type SDF } from './sdfx';
import type { Grip } from '../contracts';
import type { Side } from './skeleton';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

/**
 * Canonical grip cylinder in right-hand-local space: the cylinder crosses the palm at GRIP_BETA
 * degrees from the knuckle line (transverse: pistol grips, rifle wrists). Larger values give an
 * oblique grip (the rod runs more along the palm: rods held at the side, cradled fore-ends).
 */
export const GRIP_BETA = 22; // deg
export const GRIP_AXIS = V(Math.cos(GRIP_BETA * D2R), Math.sin(GRIP_BETA * D2R), 0);
/** Grip axis (hand-local, right hand) for a grip angle `beta` (deg). */
export function gripAxis(beta = GRIP_BETA): THREE.Vector3 {
  return V(Math.cos(beta * D2R), Math.sin(beta * D2R), 0);
}
/** Palm surface height (z) under the grip line. */
const PALM_Z = 0.0125;
/** How far flesh is allowed to compress against the grip (m). */
const COMPRESS = 0.0012;
export function gripCentre(radius: number): THREE.Vector3 {
  return V(0.0, 0.07, PALM_Z + radius - COMPRESS);
}

interface FingerDef {
  mcp: [number, number, number];
  base: [number, number, number];
  len: [number, number, number];
  rad: [number, number, number, number];
  spread: number;
}
const FINGERS: FingerDef[] = [
  { mcp: [0.0245, 0.093, 0.0], base: [0.016, 0.022, 0], len: [0.043, 0.025, 0.021], rad: [0.0094, 0.0085, 0.0076, 0.0066], spread: 5 },
  { mcp: [0.0045, 0.097, 0.0], base: [0.004, 0.024, 0], len: [0.047, 0.029, 0.022], rad: [0.0096, 0.0087, 0.0077, 0.0067], spread: 0 },
  { mcp: [-0.0145, 0.093, 0.0], base: [-0.008, 0.024, 0], len: [0.044, 0.028, 0.022], rad: [0.0091, 0.0083, 0.0074, 0.0064], spread: -5 },
  { mcp: [-0.0315, 0.083, 0.001], base: [-0.018, 0.026, 0], len: [0.034, 0.021, 0.019], rad: [0.008, 0.0073, 0.0066, 0.0058], spread: -12 },
];
const THUMB = {
  cmc: V(0.02, 0.019, 0.006),
  len: [0.044, 0.031, 0.027] as [number, number, number],
  rad: [0.0118, 0.0104, 0.0094, 0.0077] as [number, number, number, number],
};

function rotAbout(v: THREE.Vector3, axis: THREE.Vector3, ang: number) {
  return v.clone().applyAxisAngle(axis, ang);
}

interface Chain {
  pts: THREE.Vector3[];
  rad: number[];
}

/** Forward kinematics of a planar flexion chain. */
function chainFK(start: THREE.Vector3, dir0: THREE.Vector3, axis: THREE.Vector3, len: number[], ang: number[]): THREE.Vector3[] {
  const pts = [start.clone()];
  let acc = 0;
  for (let i = 0; i < len.length; i++) {
    acc += ang[i];
    pts.push(pts[i].clone().addScaledVector(rotAbout(dir0, axis, acc), len[i]));
  }
  return pts;
}

/** Signed clearance of a tapered segment from a cylinder (negative = penetrating). */
function clearance(a: THREE.Vector3, b: THREE.Vector3, ra: number, rb: number, c: THREE.Vector3, ax: THREE.Vector3, R: number): number {
  let m = Infinity;
  const q = V(), d = V();
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    q.copy(a).lerp(b, t).sub(c);
    d.copy(q).addScaledVector(ax, -q.dot(ax));
    const v = d.length() - R - (ra + (rb - ra) * t);
    if (v < m) m = v;
  }
  return m;
}

/**
 * Solve joint angles so each segment curls as far as possible without penetrating the cylinder.
 * min/max per joint in degrees.
 */
function wrapChain(
  start: THREE.Vector3, dir0: THREE.Vector3, axis: THREE.Vector3, len: number[], rad: number[],
  cyl: { c: THREE.Vector3; a: THREE.Vector3; R: number }, amin: number[], amax: number[],
): number[] {
  const ang = amin.map((x) => x * D2R);
  for (let j = 0; j < len.length; j++) {
    const test = (a: number) => {
      const trial = ang.slice();
      trial[j] = a;
      const pts = chainFK(start, dir0, axis, len.slice(0, j + 1), trial.slice(0, j + 1));
      return clearance(pts[j], pts[j + 1], rad[j], rad[j + 1], cyl.c, cyl.a, cyl.R) >= -COMPRESS;
    };
    const lo0 = amin[j] * D2R, hi0 = amax[j] * D2R;
    if (!test(lo0)) { ang[j] = lo0; continue; }
    let lo = lo0, hi = lo0;
    const step = 3 * D2R;
    while (hi < hi0) {
      const nx = Math.min(hi + step, hi0);
      if (!test(nx)) { hi = nx; break; }
      lo = nx;
      hi = nx;
      if (nx >= hi0) break;
    }
    if (hi > lo) {
      for (let k = 0; k < 7; k++) {
        const mid = (lo + hi) / 2;
        if (test(mid)) lo = mid; else hi = mid;
      }
    }
    ang[j] = lo;
  }
  return ang;
}

export interface HandPoseData {
  fingers: Chain[];
  thumb: Chain;
  /** Grip cylinder in hand-local space (for carving), if gripping. */
  cyl?: { c: THREE.Vector3; a: THREE.Vector3; R: number };
}

export interface GripHandOptions {
  /** Maximum curl fraction (0..1, default 1). Lower it for cradling support hands. */
  curl?: number;
  /** Thumb curl fraction (0..1, default 1). */
  thumbCurl?: number;
  /** Index finger: 'wrap' (default) or 'extended' (laid straight along the weapon side). */
  index?: 'wrap' | 'extended';
  /** Grip angle across the palm (deg from the knuckle line), default GRIP_BETA = 22 (transverse). */
  beta?: number;
}

/** Finger/thumb chains for a hand gripping a cylinder of radius R (hand-local, right hand). */
export function gripPose(R: number, opts: GripHandOptions = {}): HandPoseData {
  const curl = opts.curl ?? 1;
  const tc = opts.thumbCurl ?? 1;
  const beta = opts.beta ?? GRIP_BETA;
  const ga = gripAxis(beta);
  const cyl = { c: gripCentre(R), a: ga.clone(), R };
  const perp = V(-ga.y, ga.x, 0); // in the palm plane, perpendicular to the grip
  // oblique grips: the fingers keep closer to their natural direction
  const follow = 0.65 * (1 - 0.6 * Math.min(1, Math.max(0, (beta - GRIP_BETA) / 40)));
  const fingers: Chain[] = FINGERS.map((f, i) => {
    const nat = V(Math.sin(f.spread * D2R), Math.cos(f.spread * D2R), 0);
    const dir0 = nat.clone().lerp(perp, follow).normalize();
    const axis = V(dir0.y, -dir0.x, 0).normalize(); // radial, in the palm plane
    const start = V(...f.mcp);
    const extended = opts.index === 'extended' && i === 0;
    const amin = extended ? [18, 8, 4] : [8, 12, 6];
    const amax = extended ? [18, 8, 4] : [92 * curl, 105 * curl, 70 * curl];
    const ang = wrapChain(start, dir0, axis, f.len, f.rad, cyl, amin, amax.map((a, k) => Math.max(a, amin[k])));
    return { pts: chainFK(start, dir0, axis, f.len, ang), rad: [...f.rad] };
  });
  // Thumb: metacarpal in opposition, phalanges wrap around the far side of the grip.
  const md = V(0.36, 0.62, 0.7).normalize();
  const mcpT = THUMB.cmc.clone().addScaledVector(md, THUMB.len[0]);
  const tAxis = ga.clone().negate();
  const tDir = md.clone().addScaledVector(tAxis, -md.dot(tAxis)).normalize();
  const tAng = wrapChain(mcpT, tDir, tAxis, THUMB.len.slice(1), THUMB.rad.slice(1), cyl, [0, 0], [60 * tc, 70 * tc]);
  const tp = chainFK(mcpT, tDir, tAxis, THUMB.len.slice(1), tAng);
  const thumb: Chain = { pts: [THUMB.cmc.clone(), ...tp], rad: [...THUMB.rad] };
  return { fingers, thumb, cyl };
}

/** Relaxed, slightly cupped hand (hand-local, right hand). `curl` scales finger flexion. */
export function relaxedPose(curl = 1): HandPoseData {
  const mcpA = [16, 21, 26, 32], pipA = [26, 36, 40, 42], dipA = [12, 15, 17, 18];
  const fingers: Chain[] = FINGERS.map((f, i) => {
    const sp = f.spread * 0.6;
    const dir0 = V(Math.sin(sp * D2R), Math.cos(sp * D2R), 0);
    const axis = V(dir0.y, -dir0.x, 0);
    const ang = [mcpA[i], pipA[i], dipA[i]].map((a) => a * curl * D2R);
    return { pts: chainFK(V(...f.mcp), dir0, axis, f.len, ang), rad: [...f.rad] };
  });
  const md = V(0.52, 0.72, 0.46).normalize();
  const mcpT = THUMB.cmc.clone().addScaledVector(md, THUMB.len[0]);
  const tAxis = V(-0.62, 0.2, 0.75).normalize();
  const tDir = V(0.3, 0.9, 0.3).normalize();
  const tp = chainFK(mcpT, tDir, tAxis, THUMB.len.slice(1), [10 * D2R, 18 * D2R]);
  return { fingers, thumb: { pts: [THUMB.cmc.clone(), ...tp], rad: [...THUMB.rad] } };
}

/** SDF of a hand (hand-local, right hand). `forearm` = unit direction wrist -> elbow (hand-local). */
export function handSDF(pose: HandPoseData, forearm: THREE.Vector3 = V(0, -1, 0)): { f: SDF; min: [number, number, number]; max: [number, number, number] } {
  const fa = forearm.clone().normalize();
  const side = V(1, 0, 0);
  const palm: Blob[] = [
    ellipsoid([0.0, 0.058, 0.002], [0.034, 0.036, 0.0118]),
    ellipsoid([-0.025, 0.046, 0.005], [0.0128, 0.03, 0.0115]),
    roundCone([-0.027, 0.081, 0.0035], [0.022, 0.089, 0.0035], 0.0102, 0.0102),
    flatCone([0, 0.024, 0.0005], [0, -0.004, 0], 0.0205, 0.0215, side, 1.32),
    flatCone(V(0, -0.004, 0), fa.clone().multiplyScalar(FOREARM_STUB), 0.0215, 0.0245, side, 1.24),
  ];
  for (const f of FINGERS) {
    palm.push(roundCone(f.base, f.mcp, 0.0098, f.rad[0] + 0.0004));
    palm.push(sphere([f.mcp[0], f.mcp[1], f.mcp[2] - 0.0025], f.rad[0] * 0.98));
  }
  // thenar eminence along the thumb metacarpal + the metacarpal itself
  const t = pose.thumb;
  const md = t.pts[1].clone().sub(t.pts[0]).normalize();
  const thenarC = t.pts[0].clone().addScaledVector(md, 0.017).add(V(-0.007, 0.004, 0.009));
  const tz = V(0, 0, 1).addScaledVector(md, -md.z).normalize();
  palm.push(ellipsoid(thenarC, [0.0155, 0.024, 0.0125], { x: new THREE.Vector3().crossVectors(md, tz), y: md, z: tz }));
  palm.push(roundCone(t.pts[0], t.pts[1], t.rad[0], t.rad[1]));
  const palmF = blend(palm, 0.011);

  const digitF = (c: Chain, from: number): SDF => {
    const segs: Blob[] = [];
    for (let i = from; i < c.pts.length - 1; i++) segs.push(roundCone(c.pts[i], c.pts[i + 1], c.rad[i], c.rad[i + 1]));
    // finger pad at the tip (palmar side, slightly fuller)
    const n = c.pts.length;
    const tipDir = c.pts[n - 1].clone().sub(c.pts[n - 2]).normalize();
    segs.push(sphere(c.pts[n - 1].clone().addScaledVector(tipDir, -0.006), c.rad[n - 1] * 1.08));
    return blend(segs, 0.0028);
  };
  const digits = [...pose.fingers.map((c) => digitF(c, 0)), digitF(t, 1)];
  let f: SDF = (x, y, z) => {
    const p = palmF(x, y, z);
    let d = Infinity;
    for (let i = 0; i < digits.length; i++) {
      const v = smin(p, digits[i](x, y, z), i === 4 ? 0.009 : 0.0065);
      if (v < d) d = v;
    }
    return d;
  };
  if (pose.cyl) {
    const cylF = lineCylinder(pose.cyl.c, pose.cyl.a, pose.cyl.R + 0.0004);
    const base = f;
    f = (x, y, z) => smax(base(x, y, z), -cylF(x, y, z), 0.0025);
  }
  void carve;
  // bounds from all chain points + forearm stub
  const b = new THREE.Box3();
  b.expandByPoint(V(-0.048, -0.01, -0.03)).expandByPoint(V(0.05, 0.1, 0.03));
  b.expandByPoint(fa.clone().multiplyScalar(FOREARM_STUB));
  for (const c of [...pose.fingers, t]) for (const p of c.pts) b.expandByPoint(p);
  b.expandByScalar(0.03);
  return { f, min: b.min.toArray() as [number, number, number], max: b.max.toArray() as [number, number, number] };
}

// ------------------------------------------------------------------ meshing & placement

const geoCache = new Map<string, THREE.BufferGeometry>();
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Mesh a hand pose (hand-local, right hand geometry). Cached by key. */
export function handGeometry(key: string, make: () => { pose: HandPoseData; forearm: THREE.Vector3 }, cell = 0.0026, budget = 7000): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    const { pose, forearm } = make();
    const h = handSDF(pose, forearm);
    g = simplify(sdfMesh(h.f, { min: h.min, max: h.max }, cell, { project: 1 }), budget, { maxError: 0.0005 });
    geoCache.set(key, g);
  }
  return g;
}

/** Proper hand frame (see header) that places the canonical grip onto `grip` (grip space). */
export function gripHandFrame(grip: Grip, side: Side, beta = GRIP_BETA): Frame {
  const mirror = side === 'l' ? -1 : 1;
  const ga = gripAxis(beta);
  const Ah = ga.clone().setX(ga.x * mirror);
  const Ph = V(0, 0, -1);
  const Ch = gripCentre(grip.radius);
  Ch.x *= mirror;
  // rotation mapping (Ah, Ph) -> (grip.axis, grip.palm)
  const Ag = grip.axis.clone().normalize();
  const Pg = grip.palm.clone().addScaledVector(Ag, -grip.palm.dot(Ag)).normalize();
  const Bh = new THREE.Vector3().crossVectors(Ah, Ph);
  const Bg = new THREE.Vector3().crossVectors(Ag, Pg);
  const Mh = new THREE.Matrix4().makeBasis(Ah, Ph, Bh);
  const Mg = new THREE.Matrix4().makeBasis(Ag, Pg, Bg);
  const R = Mg.multiply(Mh.transpose());
  const x = V(1, 0, 0).applyMatrix4(R), y = V(0, 1, 0).applyMatrix4(R), z = V(0, 0, 1).applyMatrix4(R);
  const o = grip.position.clone().sub(Ch.applyMatrix4(R));
  return { o, x, y, z };
}

/** Hand-local -> world matrix for a hand frame (includes the mirror for the left hand). */
export function handMatrix(frame: Frame, side: Side): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeBasis(frame.x, frame.y, frame.z).setPosition(frame.o);
  if (side === 'l') m.multiply(new THREE.Matrix4().makeScale(-1, 1, 1));
  return m;
}

/** Convert a world direction into the hand's (right-hand canonical) local space. */
export function toHandLocalDir(dir: THREE.Vector3, frame: Frame, side: Side): THREE.Vector3 {
  const d = V(dir.dot(frame.x), dir.dot(frame.y), dir.dot(frame.z));
  if (side === 'l') d.x = -d.x;
  return d.normalize();
}

export interface HandBuild {
  mesh: THREE.Mesh;
  /** Hand frame in the same space as the grip (or as given). */
  frame: Frame;
}

/**
 * A hand wrapped around `grip` (grip/weapon space). `opts.forearm` = direction from the wrist
 * towards the elbow expressed in the same space (defaults to the hand's own -Y).
 * The returned mesh is positioned in grip space; add it next to the weapon object.
 */
export function gripHand(grip: Grip, side: Side, material: THREE.Material, opts: GripHandOptions & { forearm?: THREE.Vector3 } = {}): HandBuild {
  const frame = gripHandFrame(grip, side, opts.beta ?? GRIP_BETA);
  const fl = opts.forearm ? toHandLocalDir(opts.forearm, frame, side) : V(0, -1, 0);
  const q = (v: number) => Math.round(v * 20) / 20;
  const key = `grip|${r3(grip.radius)}|${opts.curl ?? 1}|${opts.thumbCurl ?? 1}|${opts.index ?? 'wrap'}|${opts.beta ?? GRIP_BETA}|${q(fl.x)},${q(fl.y)},${q(fl.z)}`;
  const geo = handGeometry(key, () => ({ pose: gripPose(grip.radius, opts), forearm: V(q(fl.x), q(fl.y), q(fl.z)).normalize() }));
  const mesh = new THREE.Mesh(geo, material);
  mesh.applyMatrix4(handMatrix(frame, side));
  mesh.name = `hand-${side}`;
  return { mesh, frame };
}

/**
 * A relaxed hand. `frame` = hand frame in world/asset space; `forearm` = wrist -> elbow direction
 * in the same space. Returns the mesh positioned by the frame.
 */
export function relaxedHand(side: Side, frame: Frame, material: THREE.Material, opts: { forearm?: THREE.Vector3; curl?: number } = {}): HandBuild {
  const fl = opts.forearm ? toHandLocalDir(opts.forearm, frame, side) : V(0, -1, 0);
  const q = (v: number) => Math.round(v * 20) / 20;
  const curl = opts.curl ?? 1;
  const key = `relaxed|${curl}|${q(fl.x)},${q(fl.y)},${q(fl.z)}`;
  const geo = handGeometry(key, () => ({ pose: relaxedPose(curl), forearm: V(q(fl.x), q(fl.y), q(fl.z)).normalize() }));
  const mesh = new THREE.Mesh(geo, material);
  mesh.applyMatrix4(handMatrix(frame, side));
  mesh.name = `hand-${side}`;
  return { mesh, frame };
}
