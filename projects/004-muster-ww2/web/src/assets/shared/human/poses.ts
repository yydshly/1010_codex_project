/**
 * Static poses. Each pose defines the stance (legs, pelvis, spine, head), where the weapon sits
 * relative to the body, and what each hand does. Arms are solved with two-bone IK so the wrists
 * meet the hand frames computed from the weapon's Grip metadata (see hands.ts).
 *
 *   stand          natural standing, weight on the right leg, hands relaxed (no weapon)
 *   port-arms      rifle diagonally across the chest, muzzle up-left, underside/sling to the front;
 *                  right hand on the wrist of the stock at the right hip, left hand under the
 *                  fore-end at left-shoulder height
 *   order-arms     rifle upright at the right side, butt on the ground (y = 0) beside the right
 *                  boot toe, right hand gripping the fore-end near the upper band, left arm hanging
 *   low-ready      SMG / LMG at waist level pointing forward and slightly down; right hand on the
 *                  trigger grip, left hand on the support grip
 *   shoulder-carry LMG carried over the right shoulder, muzzle to the rear and up; the receiver /
 *                  jacket rests on the shoulder, the right hand holds the pistol grip in front of
 *                  the chest (butt forward-down), left arm hanging
 */
import * as THREE from 'three';
import type { Grip, WeaponModel } from '../contracts';
import { DEFAULT_BODY, elbowFlex, solveArm, solveBody, sgn, type ArmChain, type BodyParams, type Side, type Skeleton, type StanceSpec } from './skeleton';
export type { StanceSpec };
import { GRIP_BETA, gripHandFrame, type GripHandOptions } from './hands';
import type { Frame, SDF } from './sdfx';

export type PoseId = 'stand' | 'port-arms' | 'order-arms' | 'low-ready' | 'shoulder-carry' | 'aim-rifle';

export const POSES: { id: PoseId; label: string; weapon: 'none' | 'rifle' | 'smg-lmg' | 'lmg' }[] = [
  { id: 'stand', label: 'Standing', weapon: 'none' },
  { id: 'port-arms', label: 'Port Arms', weapon: 'rifle' },
  { id: 'order-arms', label: 'Order Arms', weapon: 'rifle' },
  { id: 'low-ready', label: 'Low Ready', weapon: 'smg-lmg' },
  { id: 'shoulder-carry', label: 'Shoulder Carry', weapon: 'lmg' },
];

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

export type HandUse =
  | { kind: 'relaxed'; curl?: number }
  | { kind: 'grip'; /** weapon-local */ grip: Grip; opts?: GripHandOptions };

export interface SolvedPose {
  id: PoseId;
  sk: Skeleton;
  /** Weapon-local -> asset space (identity if no weapon). */
  weaponMatrix: THREE.Matrix4 | null;
  hands: Record<Side, HandUse>;
}

// ------------------------------------------------------------------ stances

const STANCES: Record<PoseId, StanceSpec> = {
  'aim-rifle': {
    feet: { r: { x: -0.14, z: -0.045, yaw: 8 }, l: { x: 0.125, z: 0.1, yaw: 8 } },
    pelvis: { shift: [-0.01, 0], drop: 0.022, rot: [5, 0, 0] },
    lumbar: [3, 0, 0], chest: [2, 0, 0], neck: [4, 0, 0], head: [3, 0, 0],
    shoulders: { r: [-0.004, 0.012], l: [0, 0.02] },
  },
  stand: {
    feet: { r: { x: -0.108, z: 0.0, yaw: 10 }, l: { x: 0.118, z: 0.045, yaw: 14 } },
    pelvis: { shift: [-0.022, -0.012], drop: 0.006, rot: [3, 2, -2.2] },
    lumbar: [-2, -1, 1.2],
    chest: [-2.5, -1, 1.2],
    neck: [6, 0, -0.5],
    head: [-3.5, 3, 0.5],
    shoulders: { r: [-0.006, 0], l: [0.002, 0.004] },
  },
  'port-arms': {
    feet: { r: { x: -0.112, z: 0.0, yaw: 9 }, l: { x: 0.114, z: 0.025, yaw: 12 } },
    pelvis: { shift: [-0.012, -0.008], drop: 0.007, rot: [3, 3, -1.2] },
    lumbar: [-1.5, -1, 0.6],
    chest: [-2, -2, 0.6],
    neck: [5, 0, 0],
    head: [-3, 1, 0],
    shoulders: { r: [-0.004, 0.006], l: [0.008, 0.016] },
  },
  'order-arms': {
    feet: { r: { x: -0.1, z: 0.0, yaw: 9 }, l: { x: 0.105, z: 0.012, yaw: 11 } },
    pelvis: { shift: [-0.006, -0.008], drop: 0.005, rot: [3, 0.5, -0.8] },
    lumbar: [-1.5, 0, 0.4],
    chest: [-2.5, 0, 0.2],
    neck: [6, 0, 0],
    head: [-3.5, 0.5, 0],
    shoulders: { r: [-0.008, 0.004], l: [0, 0] },
  },
  'low-ready': {
    feet: { r: { x: -0.14, z: -0.045, yaw: 14 }, l: { x: 0.125, z: 0.1, yaw: 10 } },
    pelvis: { shift: [-0.01, 0.0], drop: 0.022, rot: [5, 6, -0.8] },
    lumbar: [3, 0, 0.5],
    chest: [2, -5, 0.5],
    neck: [4, 0, 0],
    head: [3, -1, 0],
    shoulders: { r: [-0.004, 0.012], l: [0.0, 0.02] },
  },
  'shoulder-carry': {
    feet: { r: { x: -0.11, z: 0.0, yaw: 10 }, l: { x: 0.118, z: 0.04, yaw: 13 } },
    pelvis: { shift: [0.012, -0.008], drop: 0.008, rot: [3, -1, 1.5] },
    lumbar: [-1, 0, -1],
    chest: [-2, 0, -2],
    neck: [5, 0, 1.5],
    head: [-3, 2, 0],
    shoulders: { r: [0.012, 0.004], l: [-0.004, 0] },
  },
};

/** The stance of a pose (copy; safe to tweak and pass to `solvePose` via overrides). */
export function stanceOf(id: PoseId): StanceSpec {
  return JSON.parse(JSON.stringify(STANCES[id]));
}

// ------------------------------------------------------------------ helpers

/** Rotation taking weapon-local axes to the given world bore (+Z) and top (+Y) directions. */
function weaponBasis(bore: THREE.Vector3, top: THREE.Vector3): THREE.Matrix4 {
  const z = bore.clone().normalize();
  const y = top.clone().addScaledVector(z, -top.dot(z)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z);
}

/** Lowest point of a weapon's geometry in the given placement (asset space). */
export function weaponMinY(w: WeaponModel, m: THREE.Matrix4): number {
  let min = Infinity;
  const v = V();
  w.object.updateMatrixWorld(true);
  const root = new THREE.Matrix4().copy(w.object.matrixWorld).invert();
  w.object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const rel = new THREE.Matrix4().multiplyMatrices(m, root).multiply(mesh.matrixWorld);
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(rel);
      if (v.y < min) min = v.y;
    }
  });
  return min;
}

/** Sample weapon vertices (weapon-local), subsampled, for clearance tests. */
function weaponSamples(w: WeaponModel, max = 1500): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  w.object.updateMatrixWorld(true);
  const root = new THREE.Matrix4().copy(w.object.matrixWorld).invert();
  let total = 0;
  w.object.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) total += m.geometry.attributes.position.count; });
  const stride = Math.max(1, Math.floor(total / max));
  let k = 0;
  w.object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const rel = new THREE.Matrix4().multiplyMatrices(root, mesh.matrixWorld);
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++, k++) if (k % stride === 0) pts.push(V().fromBufferAttribute(p, i).applyMatrix4(rel));
  });
  return pts;
}

/**
 * Push a placed weapon along `dir` until none of its sample points is inside `body` + margin.
 * Returns the (possibly) adjusted matrix.
 */
export function clearWeapon(w: WeaponModel, m: THREE.Matrix4, body: SDF, dir: THREE.Vector3, margin = 0.006, maxShift = 0.12): THREE.Matrix4 {
  const pts = weaponSamples(w);
  const d = dir.clone().normalize();
  const worst = (mm: THREE.Matrix4) => {
    let pen = 0;
    const v = V();
    for (const p of pts) {
      v.copy(p).applyMatrix4(mm);
      const s = body(v.x, v.y, v.z) - margin;
      if (s < pen) pen = s;
    }
    return -pen;
  };
  let shift = 0;
  const out = m.clone();
  for (let i = 0; i < 40; i++) {
    const pen = worst(out);
    if (pen <= 1e-4 || shift >= maxShift) break;
    const step = Math.min(pen + 0.002, maxShift - shift);
    shift += step;
    out.premultiply(new THREE.Matrix4().makeTranslation(d.x * step, d.y * step, d.z * step));
  }
  return out;
}

/** A grip on the fore-end at a given height (for order arms), in weapon-local space. */
function orderArmsGrip(w: WeaponModel, bottom: THREE.Vector3, gripHeight: number): Grip {
  // the weapon stands with +Z up; bottom = lowest weapon-local point projected on the bore axis
  const z = bottom.z + gripHeight;
  const sup = w.grips.support;
  const len = Math.max(1e-3, w.muzzle.z - sup.position.z);
  const t = THREE.MathUtils.clamp((z - sup.position.z) / len, 0, 1);
  const y = THREE.MathUtils.lerp(sup.position.y, w.muzzle.y, t) * 0.6;
  return { position: V(0, y, z), axis: V(0, 0, 1), palm: V(-1, 0, 0), radius: sup.radius * (1 - 0.15 * t), length: 0.1 };
}

function relaxedArm(sk: Skeleton, side: Side, o: { abd: number; flex: number; elbow: number; pron: number; wrist?: number }) {
  // upper arm hangs from the shoulder: abduction (out), flexion (+ forward)
  const C = sk.chest;
  const down = C.y.clone().negate();
  const out = C.x.clone().multiplyScalar(sgn(side));
  const fwd = C.z.clone();
  const a = sk.arm[side];
  // abduction: rotate "down" about the forward axis towards the outside; flexion: swing forward
  const u = down.clone()
    .applyAxisAngle(fwd, sgn(side) * o.abd * D2R)
    .applyAxisAngle(C.x, -o.flex * D2R)
    .normalize();
  const elbow = a.shoulder.clone().addScaledVector(u, sk.upperArm);
  // forearm: bend forward in the arm's sagittal plane
  const bendAxis = new THREE.Vector3().crossVectors(u, fwd).normalize();
  const f = u.clone().applyAxisAngle(bendAxis, o.elbow * D2R).normalize();
  const wrist = elbow.clone().addScaledVector(f, sk.forearm);
  // hand: fingers continue the forearm (slight flexion), palm towards the thigh, pronated a little
  const handY = f.clone().applyAxisAngle(bendAxis, (o.wrist ?? 6) * D2R).normalize();
  let palm = out.clone().negate(); // medial
  palm.addScaledVector(handY, -palm.dot(handY)).normalize();
  palm.applyAxisAngle(handY, sgn(side) * o.pron * D2R);
  palm = palm.normalize();
  const x = new THREE.Vector3().crossVectors(handY, palm).normalize();
  const hand: Frame = { o: wrist.clone(), x, y: handY, z: palm };
  sk.arm[side] = { clavicle: a.clavicle, shoulder: a.shoulder, elbow, wrist, hand, reached: true, wristBend: o.wrist ?? 6 };
}

function gripArm(sk: Skeleton, side: Side, grip: Grip, wm: THREE.Matrix4, hint: THREE.Vector3, align = 0.8, beta = GRIP_BETA): ArmChain {
  const hf = gripHandFrame(grip, side, beta);
  const rot = new THREE.Matrix3().setFromMatrix4(wm);
  const frame: Frame = {
    o: hf.o.clone().applyMatrix4(wm),
    x: hf.x.clone().applyMatrix3(rot).normalize(),
    y: hf.y.clone().applyMatrix3(rot).normalize(),
    z: hf.z.clone().applyMatrix3(rot).normalize(),
  };
  return solveArm(sk, side, frame, hint, align);
}

/** A grip with its palm direction rotated about the grip axis (deg). */
export function rollGrip(g: Grip, deg: number): Grip {
  if (!deg) return g;
  const a = g.axis.clone().normalize();
  return { ...g, palm: g.palm.clone().applyAxisAngle(a, deg * D2R) };
}

interface ArmFit { grip: Grip; roll: number; arm: ArmChain; score: number }

/**
 * Solve an arm onto a grip, letting the hand roll around the grip axis (+-maxRoll deg; a hand
 * can hold a cylinder at any roll) to find the most natural wrist: small wrist bend, elbow neither
 * locked straight nor jammed, target reached.
 */
interface FitCost {
  /** Preferred elbow flexion (deg) and its weight per degree. */
  flex: number;
  flexW?: number;
  /** Wrist bend allowed without cost (deg) and the weight per degree beyond it. */
  bendFree?: number;
  bendW?: number;
}

function fitGripArm(sk: Skeleton, side: Side, grip: Grip, wm: THREE.Matrix4, hint: THREE.Vector3, align: number, beta: number, maxRoll = 40, cost: FitCost = { flex: 70 }): ArmFit {
  const saved = sk.arm[side];
  let best: ArmFit | null = null;
  const flexW = cost.flexW ?? 0.12, bendFree = cost.bendFree ?? 12, bendW = cost.bendW ?? 1.2;
  for (let r = -maxRoll; r <= maxRoll + 1e-6; r += 5) {
    const g = rollGrip(grip, r);
    sk.arm[side] = saved;
    const arm = gripArm(sk, side, g, wm, hint, align, beta);
    const flex = elbowFlex(arm);
    let score = Math.max(0, arm.wristBend - bendFree) * bendW + 0.15 * Math.abs(r) + (arm.reached ? 0 : 300);
    score += flexW * Math.abs(flex - cost.flex);
    if (flex < 18) score += (18 - flex) * 2;
    if (flex > 135) score += (flex - 135) * 2;
    if (!best || score < best.score) best = { grip: g, roll: r, arm, score };
  }
  sk.arm[side] = best!.arm;
  return best!;
}

/** Grip angle for a hand on a grip: transverse on pistol grips / stock wrists, oblique on fore-ends. */
function betaFor(grip: Grip, support: boolean): number {
  const along = Math.abs(grip.axis.clone().normalize().z);
  return support && along > 0.7 ? 40 : GRIP_BETA;
}

export interface PoseOverrides {
  /** Replace the stance (use stanceOf(id) and tweak). */
  stance?: StanceSpec;
  /** Grip overrides in weapon-local space. */
  grips?: Partial<Record<Side, Grip>>;
  /** Hand options per side (curl, thumbCurl, index, beta = grip angle across the palm). */
  handOpts?: Partial<Record<Side, GripHandOptions>>;
  /** Extra transform applied to the weapon placement (asset space, pre-multiplied). */
  weaponOffset?: THREE.Matrix4;
  /** Torso SDF used to keep the weapon clear of the body (set by buildSoldier). */
  clearance?: SDF;
}

/** Body-following directions: forward / left / up of the pelvis (horizontal) and the chest. */
function bodyAxes(sk: Skeleton) {
  const up = V(0, 1, 0);
  const fwdP = sk.pelvis.z.clone().setY(0).normalize();
  const leftP = new THREE.Vector3().crossVectors(up, fwdP);
  const fwdC = sk.chest.z.clone().setY(0).normalize();
  const leftC = new THREE.Vector3().crossVectors(up, fwdC);
  return { up, fwdP, leftP, fwdC, leftC };
}

/** Rotation basis for a weapon so that the weapon-local vector `gv` points along `want`, top towards `top`. */
function alignGrips(gv: THREE.Vector3, want: THREE.Vector3, top: THREE.Vector3): THREE.Matrix4 {
  let basis = weaponBasis(want, top);
  for (let i = 0; i < 5; i++) {
    const g = gv.clone().applyMatrix4(new THREE.Matrix4().extractRotation(basis)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(g, want);
    const b2 = V(0, 0, 1).applyMatrix4(basis).applyQuaternion(q);
    basis = weaponBasis(b2, top);
  }
  return basis;
}

function placeAt(basis: THREE.Matrix4, local: THREE.Vector3, target: THREE.Vector3): THREE.Matrix4 {
  const tp = local.clone().applyMatrix4(new THREE.Matrix4().extractRotation(basis));
  return basis.clone().setPosition(target.clone().sub(tp));
}

/**
 * Solve a pose: skeleton + weapon placement + hand specs.
 * The weapon is required for every pose except 'stand'.
 *
 * Grips: each hand uses the weapon grip (or `ov.grips`), rolled about the grip axis to the most
 * natural wrist; the rolled grip and the grip angle (`opts.beta`) are returned in `hands[side]`,
 * so hand meshes built from the returned HandUse match the arm exactly.
 */
export function solvePose(id: PoseId, weapon?: WeaponModel | null, params: BodyParams = DEFAULT_BODY, ov: PoseOverrides = {}): SolvedPose {
  const st = ov.stance ?? STANCES[id];
  const sk = solveBody(st, params);
  const lift = params.lift;
  const s = sk.s;
  const C = sk.chest, P = sk.pelvis;
  const hands: Record<Side, HandUse> = { r: { kind: 'relaxed' }, l: { kind: 'relaxed' } };
  let wm: THREE.Matrix4 | null = null;
  const hangR = { abd: 6, flex: -3, elbow: 14, pron: 18 };
  const hangL = { abd: 6, flex: 2, elbow: 16, pron: 18 };

  if (id === 'stand' || !weapon) {
    relaxedArm(sk, 'r', hangR);
    relaxedArm(sk, 'l', hangL);
    return { id, sk, weaponMatrix: null, hands };
  }
  const w = weapon;
  const gR = ov.grips?.r;
  const gL = ov.grips?.l;
  const A = bodyAxes(sk);
  const dir = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, x: number, y: number, z: number) =>
    V().addScaledVector(a, x).addScaledVector(b, y).addScaledVector(c, z).normalize();
  const saved = { r: sk.arm.r, l: sk.arm.l };
  const reset = () => { sk.arm.r = saved.r; sk.arm.l = saved.l; };
  const handOpt = (side: Side, beta: number, extra: GripHandOptions = {}): GripHandOptions => ({ beta, ...extra, ...(ov.handOpts?.[side] ?? {}) });

  if (id === 'port-arms') {
    // right hand on the wrist of the stock just in front of the right hip (forearm about
    // horizontal, elbow at the side); rifle diagonal across the chest, the barrel crossing the
    // point of the left shoulder; underside (sling) to the front
    const trig = gR ?? w.grips.trigger;
    const sup = gL ?? w.grips.support;
    const bR = ov.handOpts?.r?.beta ?? betaFor(trig, false);
    const bL = ov.handOpts?.l?.beta ?? betaFor(sup, true);
    const rT = P.o.clone().addScaledVector(A.leftP, -0.07 * s).addScaledVector(A.up, 0.125 * s).addScaledVector(A.fwdP, 0.205 * s);
    const gv = sup.position.clone().sub(trig.position);
    const top = A.fwdC.clone().negate().addScaledVector(A.up, 0.25).normalize();
    const hintR = dir(A.leftC, A.up, A.fwdC, -0.6, -0.5, -0.6);
    const hintL = dir(A.leftC, A.up, A.fwdC, 0.5, -1, -0.1);
    let best: { wm: THREE.Matrix4; cost: number } | null = null;
    for (const ang of [46, 50, 54, 58]) {
      for (const lean of [0, 6, 12]) {
        const a = ang * D2R;
        const want = dir(A.leftC, A.up, A.fwdC, Math.cos(a), Math.sin(a), Math.sin(lean * D2R));
        const m = placeAt(alignGrips(gv, want, top), trig.position, rT);
        reset();
        const fr = fitGripArm(sk, 'r', trig, m, hintR, 0.9, bR, 30, { flex: 90 });
        const fl = fitGripArm(sk, 'l', sup, m, hintL, 0.9, bL, 40, { flex: 100 });
        const cost = fr.score + fl.score + 0.6 * Math.abs(ang - 52) + 0.4 * lean;
        if (!best || cost < best.cost) best = { wm: m, cost };
      }
    }
    wm = best!.wm;
    if (ov.weaponOffset) wm.premultiply(ov.weaponOffset);
    if (ov.clearance) wm = clearWeapon(w, wm, ov.clearance, A.fwdC, 0.008, 0.1);
    reset();
    const fr = fitGripArm(sk, 'r', trig, wm, hintR, 0.9, bR, 30, { flex: 90 });
    const fl = fitGripArm(sk, 'l', sup, wm, hintL, 0.9, bL, 40, { flex: 100 });
    hands.r = { kind: 'grip', grip: fr.grip, opts: handOpt('r', bR) };
    hands.l = { kind: 'grip', grip: fl.grip, opts: handOpt('l', bL, { curl: 0.85 }) };
  } else if (id === 'order-arms') {
    const foot = sk.leg.r.foot;
    // butt beside the right boot toe (outside), bore vertical, top facing back, left side to the leg
    const top = foot.z.clone().negate().setY(0).normalize();
    const basis = weaponBasis(V(0, 1, 0).addScaledVector(C.z, 0.025).normalize(), top);
    const rot = new THREE.Matrix4().extractRotation(basis);
    const minY = weaponMinY(w, rot);
    const buttLocal = (w.shoulder ?? V(0, -0.05, w.muzzle.z - w.length)).clone();
    const toe = foot.o.clone().addScaledVector(foot.z, 0.19 * s).addScaledVector(foot.x, -0.082 * s);
    const bl = buttLocal.clone().applyMatrix4(rot);
    wm = basis.clone().setPosition(V(toe.x - bl.x, -minY, toe.z - bl.z));
    if (ov.weaponOffset) wm.premultiply(ov.weaponOffset);
    if (ov.clearance) {
      wm = clearWeapon(w, wm, ov.clearance, foot.x.clone().negate().setY(0), 0.006, 0.08);
      const my = weaponMinY(w, wm);
      wm.premultiply(new THREE.Matrix4().makeTranslation(0, -my, 0));
    }
    // right hand around the fore-end at about hip-joint height: oblique grip, arm hanging
    const bottomLocal = V(0, 0, buttLocal.z);
    const grip = gR ?? orderArmsGrip(w, bottomLocal, (0.8 + lift) * s);
    const hint = dir(A.leftC, A.up, A.fwdC, -0.35, -0.5, -0.8);
    const oc: FitCost = { flex: 20, flexW: 0.8, bendFree: 35, bendW: 1 };
    let bestB = { beta: 0, fit: null as ArmFit | null };
    for (const b of ov.handOpts?.r?.beta !== undefined ? [ov.handOpts.r.beta] : [-10, 0, 10, 22]) {
      const saveR = sk.arm.r;
      const f = fitGripArm(sk, 'r', grip, wm, hint, 0.9, b, 60, oc);
      if (!bestB.fit || f.score < bestB.fit.score) bestB = { beta: b, fit: f };
      sk.arm.r = saveR;
    }
    const fr = fitGripArm(sk, 'r', grip, wm, hint, 0.9, bestB.beta, 60, oc);
    hands.r = { kind: 'grip', grip: fr.grip, opts: handOpt('r', bestB.beta) };
    relaxedArm(sk, 'l', hangL);
  } else if (id === 'low-ready' || id === 'aim-rifle') {
    // SMG / LMG at the right hip, pointing forward-down. The weapon crosses in front of the belly
    // (muzzle turned in to the left) as far as needed for the left hand to reach the support grip
    // with a bent elbow, while the rear of the receiver / the stock passes beside the right hip.
    // Candidates that would put the weapon into the body are rejected up front (instead of pushing
    // the weapon away from the body afterwards, which straightens both arms).
    const trig = gR ?? w.grips.trigger;
    const sup = gL ?? w.grips.support;
    const bR = ov.handOpts?.r?.beta ?? betaFor(trig, false);
    const bL = ov.handOpts?.l?.beta ?? betaFor(sup, true);
    const hintR = dir(A.leftC, A.up, A.fwdC, -0.55, -0.8, -0.35);
    const hintL = dir(A.leftC, A.up, A.fwdC, 0.45, -1, -0.05);
    const LR_SUPPORT: FitCost = { flex: 55, flexW: 0.35 };
    const pts = ov.clearance ? weaponSamples(w, 320) : [];
    const clr = ov.clearance;
    const penetration = (m: THREE.Matrix4) => {
      if (!clr) return 0;
      let pen = 0;
      const q = V();
      for (const p of pts) {
        q.copy(p).applyMatrix4(m);
        const d = clr(q.x, q.y, q.z) - 0.006;
        if (-d > pen) pen = -d;
      }
      return pen;
    };
    let best: { wm: THREE.Matrix4; cost: number } | null = null;
    for (const [ox, oz] of [[-0.1, 0.2], [-0.13, 0.17], [-0.16, 0.15], [-0.13, 0.21], [-0.17, 0.19]]) {
      const rT = P.o.clone().addScaledVector(A.leftP, ox * s).addScaledVector(A.up, (id === 'aim-rifle' ? 0.44 : 0.075) * s).addScaledVector(A.fwdP, oz * s);
      for (let yaw = 0; yaw <= (id === 'aim-rifle' ? 0 : 45); yaw += 7.5) {
        for (const pitch of id === 'aim-rifle' ? [0] : [-6, -12]) {
          const bore = A.fwdP.clone().applyAxisAngle(A.up, yaw * D2R);
          bore.addScaledVector(A.up, Math.tan(pitch * D2R)).normalize();
          const m = placeAt(weaponBasis(bore, A.up.clone().addScaledVector(A.leftP, -0.06)), trig.position, rT);
          const pen = penetration(m);
          if (pen > 0.03) continue;
          reset();
          const fr = fitGripArm(sk, 'r', trig, m, hintR, 0.9, bR, 30, { flex: 85 });
          const fl = fitGripArm(sk, 'l', sup, m, hintL, 0.9, bL, 40, LR_SUPPORT);
          const cost = fr.score + fl.score + 0.3 * yaw + 0.5 * Math.abs(pitch + 9) + 900 * pen + 40 * Math.abs(oz - 0.18);
          if (!best || cost < best.cost) best = { wm: m, cost };
        }
      }
    }
    if (!best) {
      const rT = P.o.clone().addScaledVector(A.leftP, -0.13 * s).addScaledVector(A.up, (id === 'aim-rifle' ? 0.44 : 0.075) * s).addScaledVector(A.fwdP, 0.2 * s);
      best = { wm: placeAt(weaponBasis(A.fwdP, A.up), trig.position, rT), cost: 0 };
    }
    wm = best.wm;
    if (ov.weaponOffset) wm.premultiply(ov.weaponOffset);
    if (ov.clearance) wm = clearWeapon(w, wm, ov.clearance, A.leftP.clone().multiplyScalar(-1).addScaledVector(A.fwdP, 0.8), 0.006, 0.12);
    reset();
    const fr = fitGripArm(sk, 'r', trig, wm, hintR, 0.9, bR, 30, { flex: 85 });
    const fl = fitGripArm(sk, 'l', sup, wm, hintL, 0.9, bL, 40, LR_SUPPORT);
    hands.r = { kind: 'grip', grip: fr.grip, opts: handOpt('r', bR) };
    hands.l = { kind: 'grip', grip: fl.grip, opts: handOpt('l', bL) };
  } else if (id === 'shoulder-carry') {
    // LMG over the right shoulder, muzzle to the rear and up: the receiver / barrel jacket rests on
    // top of the shoulder, the butt points forward-down in front of the chest and the right hand
    // holds the pistol grip; the left arm hangs.
    const trig = gR ?? w.grips.trigger;
    const sh = sk.arm.r.shoulder;
    const rise = 27 * D2R;
    const bore = A.fwdC.clone().multiplyScalar(-Math.cos(rise)).addScaledVector(A.up, Math.sin(rise)).normalize();
    const basis = weaponBasis(bore, A.up.clone().addScaledVector(A.leftC, -0.18));
    const rot = new THREE.Matrix4().extractRotation(basis);
    // rest point: the underside of the weapon a little ahead of the trigger grip
    const span = w.grips.support.position.z - trig.position.z;
    const zRest = trig.position.z + Math.min(0.26, Math.max(0.12, 0.45 * span));
    let yRest = Infinity;
    for (const q of weaponSamples(w, 4000)) if (Math.abs(q.z - zRest) < 0.03 && Math.abs(q.x) < 0.035 && q.y < yRest) yRest = q.y;
    if (!isFinite(yRest)) yRest = trig.position.y + 0.03;
    const restW = V(0, yRest, zRest).applyMatrix4(rot);
    const target = sh.clone().addScaledVector(A.up, 0.077 * s).addScaledVector(A.leftC, 0.004 * s).addScaledVector(A.fwdC, -0.004 * s);
    wm = basis.clone().setPosition(target.sub(restW));
    if (ov.weaponOffset) wm.premultiply(ov.weaponOffset);
    if (ov.clearance) wm = clearWeapon(w, wm, ov.clearance, A.up, 0.004, 0.1);
    const bR = ov.handOpts?.r?.beta ?? betaFor(trig, false);
    const fr = fitGripArm(sk, 'r', trig, wm, dir(A.leftC, A.up, A.fwdC, -0.35, -1, 0.15), 0.9, bR, 40, { flex: 115, flexW: 0.2 });
    hands.r = { kind: 'grip', grip: fr.grip, opts: handOpt('r', bR) };
    relaxedArm(sk, 'l', hangL);
  }
  return { id, sk, weaponMatrix: wm, hands };
}
