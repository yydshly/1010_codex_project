/**
 * Skeleton: adult male anthropometry, joint hierarchy and posing (FK for legs/spine, analytic
 * two-bone IK for arms and legs).
 *
 * Asset space: metres, +Y up, +Z forward (soldier facing), +X = the soldier's LEFT.
 * Origin on the ground between the feet. Side 'r' = right (-X), 'l' = left (+X).
 *
 * Proportions (stature H = 1.76 m barefoot, head top incl. short hair):
 *   head (vertex-chin) 0.235 (~H/7.5), porion (ear canal) 1.626, shoulder joints 1.405 at +-0.175
 *   (acromion ~1.445),
 *   bideltoid breadth over the tunic ~0.46, hip joints 0.903 at +-0.088, knee 0.49, ankle 0.078,
 *   upper arm 0.32, forearm 0.255, hand 0.19, thigh 0.41, shank 0.415, foot 0.265.
 * All lengths scale linearly with `stature`. Footwear lifts the whole body by `lift`.
 */
import * as THREE from 'three';
import type { Frame } from './sdfx';

export type Side = 'r' | 'l';
export const SIDES: Side[] = ['r', 'l'];
/** +1 for the left side (+X), -1 for the right side (-X). */
export const sgn = (s: Side) => (s === 'l' ? 1 : -1);

const D2R = Math.PI / 180;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export interface BodyParams {
  /** Barefoot stature incl. short hair (m). Default 1.76. */
  stature: number;
  /** Heel height of the footwear under the foot (m). Default 0.024 (leather sole + heel). */
  lift: number;
}
export const DEFAULT_BODY: BodyParams = { stature: 1.76, lift: 0.026 };

/** Reference dimensions at stature 1.76 m (scaled by stature / 1.76). */
export const REF = {
  hipY: 0.903,
  hipX: 0.088,
  thigh: 0.41,
  shank: 0.415,
  ankleY: 0.078,
  /** Ankle joint to heel back / to toe tip (bare foot). */
  heelBack: 0.058,
  toeFront: 0.207,
  footWidth: 0.1,
  lumbar: [0, 0.105, -0.045] as const,
  chest: [0, 0.2, -0.005] as const,
  neck: [0, 0.262, 0.005] as const,
  head: [0, 0.156, 0.045] as const,
  /** Shoulder joint (humeral head centre) relative to the chest joint. */
  shoulder: [0.175, 0.197, 0.05] as const,
  /** Sternoclavicular joint relative to the chest joint. */
  clavicle: [0.02, 0.228, 0.105] as const,
  upperArm: 0.32,
  forearm: 0.255,
  hand: 0.19,
};

/** Pose parameters for everything except the arms. Angles in degrees. */
export interface StanceSpec {
  feet: Record<Side, { x: number; z: number; /** toe-out, degrees (outward positive) */ yaw: number }>;
  pelvis: {
    /** Offset of the mid-hip point (m) from the midpoint of the ankles, in x/z. */
    shift: [number, number];
    /** Extra lowering of the pelvis below the straight-leg height (m); bends the knees. */
    drop: number;
    /** [pitch (+ forward), yaw (+ turn left), roll (+ left hip up)] */
    rot: [number, number, number];
  };
  /** Lumbar, chest, neck and head rotations: [pitch, yaw, roll] relative to the parent. */
  lumbar: [number, number, number];
  chest: [number, number, number];
  neck: [number, number, number];
  head: [number, number, number];
  /** Shoulder girdle: [elevation (m, + up), protraction (m, + forward)] per side. */
  shoulders: Record<Side, [number, number]>;
}

export interface ArmChain {
  clavicle: THREE.Vector3;
  shoulder: THREE.Vector3;
  elbow: THREE.Vector3;
  wrist: THREE.Vector3;
  /** Hand frame (see hands.ts): origin at the wrist joint, +Y towards the fingers, +Z palm normal. */
  hand: Frame;
  /** True when the IK target was reachable. */
  reached: boolean;
  /** Wrist bend (deg) between forearm and hand axes. */
  wristBend: number;
}

export interface LegChain {
  hip: THREE.Vector3;
  knee: THREE.Vector3;
  ankle: THREE.Vector3;
  /** Foot frame: origin on the ground below the ankle, +Z towards the toe, +Y up, +X foot's left. */
  foot: Frame;
}

export interface Skeleton {
  params: BodyParams;
  /** Scale factor stature / 1.76. */
  s: number;
  pelvis: Frame;
  lumbar: Frame;
  chest: Frame;
  neck: Frame;
  /** Head frame: origin at the midpoint between the ear canals (porion), Frankfurt plane = local XZ. */
  head: Frame;
  leg: Record<Side, LegChain>;
  /** Arms are filled in by `solveArm` once the hand targets are known. */
  arm: Record<Side, ArmChain>;
  upperArm: number;
  forearm: number;
  /** Rest-pose (unrotated) offsets of the spine joints from the pelvis origin (scaled). */
  rest: { lumbar: THREE.Vector3; chest: THREE.Vector3; neck: THREE.Vector3; head: THREE.Vector3 };
}

// ------------------------------------------------------------------ frame helpers

export function frameFromQuat(o: THREE.Vector3, q: THREE.Quaternion): Frame {
  return {
    o: o.clone(),
    x: V(1, 0, 0).applyQuaternion(q),
    y: V(0, 1, 0).applyQuaternion(q),
    z: V(0, 0, 1).applyQuaternion(q),
  };
}
export function quatOfFrame(f: Frame): THREE.Quaternion {
  const m = new THREE.Matrix4().makeBasis(f.x, f.y, f.z);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}
/** Rotation from [pitch, yaw, roll] degrees (applied yaw, then pitch, then roll). */
export function rotPYR(r: [number, number, number]): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'YXZ'));
}
function child(parent: Frame, pq: THREE.Quaternion, off: readonly [number, number, number], s: number, rot: [number, number, number]) {
  const o = parent.o.clone().add(V(off[0] * s, off[1] * s, off[2] * s).applyQuaternion(pq));
  const q = pq.clone().multiply(rotPYR(rot));
  return { frame: frameFromQuat(o, q), q };
}

// ------------------------------------------------------------------ IK

/**
 * Analytic two-bone IK. Returns the middle joint for a chain root -> end with lengths l1, l2.
 * `hint` is the preferred bend direction (e.g. elbow down/out). If `align` is given, the middle
 * joint is chosen on the solution circle to also align the second bone with `align` (weight w).
 */
export function twoBone(
  root: THREE.Vector3,
  target: THREE.Vector3,
  l1: number,
  l2: number,
  hint: THREE.Vector3,
  align?: THREE.Vector3,
  alignWeight = 0.6,
): { mid: THREE.Vector3; end: THREE.Vector3; reached: boolean } {
  const dir = target.clone().sub(root);
  let d = dir.length();
  dir.normalize();
  const maxR = (l1 + l2) * 0.9995;
  const minR = Math.abs(l1 - l2) + 1e-3;
  let reached = true;
  if (d > maxR) { d = maxR; reached = false; }
  if (d < minR) d = minR;
  const end = root.clone().addScaledVector(dir, d);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const c = root.clone().addScaledVector(dir, a);
  // orthonormal basis around dir
  let u = hint.clone().addScaledVector(dir, -hint.dot(dir));
  if (u.lengthSq() < 1e-8) u = new THREE.Vector3(0, -1, 0).addScaledVector(dir, dir.y);
  u.normalize();
  const w = new THREE.Vector3().crossVectors(dir, u);
  if (!align || h < 1e-4) return { mid: c.addScaledVector(u, h), end, reached };
  let best = -Infinity, bestAng = 0;
  for (let i = -60; i <= 60; i++) {
    const ang = (i / 60) * Math.PI * 0.75;
    const m = c.clone().addScaledVector(u, h * Math.cos(ang)).addScaledVector(w, h * Math.sin(ang));
    const fore = end.clone().sub(m).normalize();
    const score = Math.cos(ang) + alignWeight * fore.dot(align);
    if (score > best) { best = score; bestAng = ang; }
  }
  const mid = c.addScaledVector(u, h * Math.cos(bestAng)).addScaledVector(w, h * Math.sin(bestAng));
  return { mid, end, reached };
}

// ------------------------------------------------------------------ solving

/** Solve pelvis, legs, spine, neck and head for a stance. Arms are initialised hanging. */
export function solveBody(st: StanceSpec, params: BodyParams = DEFAULT_BODY): Skeleton {
  const s = params.stature / 1.76;
  const lift = params.lift;
  const thigh = REF.thigh * s, shank = REF.shank * s;
  const ankleY = REF.ankleY * s + lift;

  // feet
  const foot: Record<Side, Frame> = {} as Record<Side, Frame>;
  for (const side of ['r', 'l'] as Side[]) {
    const f = st.feet[side];
    const yawOut = f.yaw * D2R * sgn(side); // left foot toes turn to +X
    const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yawOut);
    foot[side] = frameFromQuat(V(f.x * s, 0, f.z * s), q);
  }
  const ankle = { r: foot.r.o.clone().setY(ankleY), l: foot.l.o.clone().setY(ankleY) };

  // pelvis
  const pq = rotPYR(st.pelvis.rot);
  const mid = ankle.r.clone().add(ankle.l).multiplyScalar(0.5);
  const pelvisO = V(mid.x + st.pelvis.shift[0] * s, 0, mid.z + st.pelvis.shift[1] * s);
  // straight-leg height for the supporting (lower) leg
  const hipOff = (side: Side) => V(sgn(side) * REF.hipX * s, 0, 0).applyQuaternion(pq);
  let yStraight = Infinity;
  for (const side of ['r', 'l'] as Side[]) {
    const ho = hipOff(side);
    const dx = pelvisO.x + ho.x - ankle[side].x, dz = pelvisO.z + ho.z - ankle[side].z;
    const reach = (thigh + shank) * 0.9995;
    const vy = Math.sqrt(Math.max(0, reach * reach - dx * dx - dz * dz));
    yStraight = Math.min(yStraight, ankle[side].y + vy - ho.y);
  }
  pelvisO.y = yStraight - st.pelvis.drop * s;
  const pelvis = frameFromQuat(pelvisO, pq);

  // legs
  const leg = {} as Record<Side, LegChain>;
  for (const side of ['r', 'l'] as Side[]) {
    const hip = pelvisO.clone().add(hipOff(side));
    const fwd = foot[side].z.clone();
    const hint = fwd.clone().multiplyScalar(1).add(V(sgn(side) * 0.12, 0, 0));
    const ik = twoBone(hip, ankle[side], thigh, shank, hint);
    leg[side] = { hip, knee: ik.mid, ankle: ik.end, foot: foot[side] };
  }

  // spine
  const lum = child(pelvis, pq, REF.lumbar, s, st.lumbar);
  const ch = child(lum.frame, lum.q, REF.chest, s, st.chest);
  const nk = child(ch.frame, ch.q, REF.neck, s, st.neck);
  const hd = child(nk.frame, nk.q, REF.head, s, st.head);

  const sk: Skeleton = {
    params,
    s,
    pelvis,
    lumbar: lum.frame,
    chest: ch.frame,
    neck: nk.frame,
    head: hd.frame,
    leg,
    arm: {} as Record<Side, ArmChain>,
    upperArm: REF.upperArm * s,
    forearm: REF.forearm * s,
    rest: (() => {
      const l = V(...REF.lumbar).multiplyScalar(s);
      const c = l.clone().add(V(...REF.chest).multiplyScalar(s));
      const n = c.clone().add(V(...REF.neck).multiplyScalar(s));
      const h = n.clone().add(V(...REF.head).multiplyScalar(s));
      return { lumbar: l, chest: c, neck: n, head: h };
    })(),
  };
  for (const side of ['r', 'l'] as Side[]) {
    const [elev, prot] = st.shoulders[side];
    const c = ch.frame;
    const shoulder = c.o.clone()
      .addScaledVector(c.x, sgn(side) * REF.shoulder[0] * s)
      .addScaledVector(c.y, REF.shoulder[1] * s + elev)
      .addScaledVector(c.z, REF.shoulder[2] * s + prot);
    const clavicle = c.o.clone()
      .addScaledVector(c.x, sgn(side) * REF.clavicle[0] * s)
      .addScaledVector(c.y, REF.clavicle[1] * s)
      .addScaledVector(c.z, REF.clavicle[2] * s);
    sk.arm[side] = {
      clavicle,
      shoulder,
      elbow: shoulder.clone().add(V(0, -sk.upperArm, 0)),
      wrist: shoulder.clone().add(V(0, -sk.upperArm - sk.forearm, 0)),
      hand: frameFromQuat(shoulder.clone().add(V(0, -sk.upperArm - sk.forearm, 0)), new THREE.Quaternion()),
      reached: true,
      wristBend: 0,
    };
  }
  return sk;
}

/**
 * Solve one arm so the wrist reaches `hand.o` and the hand has the orientation of `hand`.
 * `hint` is the preferred elbow direction (world). Writes into sk.arm[side].
 */
export function solveArm(sk: Skeleton, side: Side, hand: Frame, hint: THREE.Vector3, alignWeight = 0.8): ArmChain {
  const a = sk.arm[side];
  // Let the shoulder girdle follow a far reach a little (protraction / elevation, max ~3.5 cm).
  const reach = sk.upperArm + sk.forearm;
  const toT = hand.o.clone().sub(a.shoulder);
  const over = toT.length() - reach * 0.97;
  const shoulder = a.shoulder.clone();
  if (over > 0) shoulder.addScaledVector(toT.clone().normalize(), Math.min(over, 0.035));
  // The hand's proximal direction (towards the elbow) is -hand.y; the forearm should run along +hand.y.
  const ik = twoBone(shoulder, hand.o, sk.upperArm, sk.forearm, hint, hand.y, alignWeight);
  const fore = ik.end.clone().sub(ik.mid).normalize();
  const bend = (Math.acos(THREE.MathUtils.clamp(fore.dot(hand.y), -1, 1)) * 180) / Math.PI;
  const res: ArmChain = {
    clavicle: a.clavicle,
    shoulder,
    elbow: ik.mid,
    wrist: ik.end,
    hand: { o: ik.end.clone(), x: hand.x.clone(), y: hand.y.clone(), z: hand.z.clone() },
    reached: ik.reached,
    wristBend: bend,
  };
  sk.arm[side] = res;
  return res;
}

/** Elbow flexion angle (deg, 0 = straight). */
export function elbowFlex(a: ArmChain): number {
  const u = a.elbow.clone().sub(a.shoulder).normalize();
  const f = a.wrist.clone().sub(a.elbow).normalize();
  return (Math.acos(THREE.MathUtils.clamp(u.dot(f), -1, 1)) * 180) / Math.PI;
}
/** Knee flexion angle (deg, 0 = straight). */
export function kneeFlex(l: LegChain): number {
  const u = l.knee.clone().sub(l.hip).normalize();
  const f = l.ankle.clone().sub(l.knee).normalize();
  return (Math.acos(THREE.MathUtils.clamp(u.dot(f), -1, 1)) * 180) / Math.PI;
}
