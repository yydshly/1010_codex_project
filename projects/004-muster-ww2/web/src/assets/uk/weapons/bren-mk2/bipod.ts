/**
 * Bren Mk II bipod legs (B-frame, see dims.ts). The Mk II bipod has fixed-length (non-telescopic)
 * tubular legs hinged on the yoke of the bipod sleeve (barrel.ts builds the sleeve, yoke, cross-bar and
 * pivot bolt). Each leg: hinge knuckle, tapered tube with a reinforcing ferrule, and a flat spade foot
 * with a turned-up toe.
 *   deployed: legs spread 13 deg each side and raked 8 deg forward; the feet are shaped to sit flat on
 *             the ground when the gun rests on its bipod and the toe of the butt (BREN_STANCE_PITCH).
 *   folded:   legs swung back under the gas cylinder and lower frame, side by side, feet towards the body.
 */
import { THREE, G, part } from '../../../../core/kit';
import { V, RAD, latheY, cylX, basis, extrudeZ, type V2 } from '../common/geo';
import type { UkwMats } from '../common/materials';
import { BR } from './dims';

export type BipodState = 'folded' | 'deployed';

/** Leg pivot (knuckle centre) for side s (+1 left, -1 right). */
export const legPivot = (s: number) => V(s * BR.bipod.legX, BR.bipod.pivotY, BR.bipod.z);

/** Unit leg direction (pivot towards foot). */
export function legDir(state: BipodState, s: number): THREE.Vector3 {
  const bp = BR.bipod;
  if (state === 'deployed') return V(s * Math.tan(bp.spreadDeg * RAD), -1, Math.tan(bp.rakeDeg * RAD)).normalize();
  return V(s * 0.004, -0.046, -1).normalize();
}

/** Lowest point of the foot sole (B-frame). */
export const footPoint = (state: BipodState, s: number) => legPivot(s).addScaledVector(legDir(state, s), BR.bipod.len);

/** Butt toe (lowest rear point of the butt plate), B-frame. */
export const BUTT_TOE = V(0, -0.1186, 0.0008);

/**
 * Nose-up pitch (rad) at which the deployed feet and the butt toe touch a flat ground together.
 * A point p of the weapon rises by p.z * sin(pitch) (rotation about X).
 */
export function stancePitch(): number {
  const f = footPoint('deployed', 1);
  return Math.atan2(BUTT_TOE.y - f.y, f.z - BUTT_TOE.z);
}
export const BREN_STANCE_PITCH = stancePitch();

export function buildBipodLegs(m: UkwMats, state: BipodState, hi: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const bp = BR.bipod;
  const seg = hi ? 28 : 14;
  // sole normal (pointing down out of the sole) in the B-frame at the stance pitch
  const ph = BREN_STANCE_PITCH;
  const soleDown = V(0, -Math.cos(ph), -Math.sin(ph));
  for (const s of [-1, 1]) {
    const p0 = legPivot(s);
    const d = legDir(state, s);
    // knuckle on the pivot bolt
    out.push(part(cylX(0.0082, p0.x - 0.004, p0.x + 0.004, seg, 0.0008), m.black, { p: [0, p0.y, p0.z] }));
    // leg frame: y along the leg (towards the foot)
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d);
    const place = (g: THREE.BufferGeometry, t: number) => g.applyQuaternion(q).translate(p0.x + d.x * t, p0.y + d.y * t, p0.z + d.z * t);
    // neck from the knuckle into the tube
    out.push(part(place(latheY([[0, 0], [0.0062, 0], [0.0068, 0.004], [0.0088, 0.016], [0.0088, 0.03], [0.0079, 0.033], [0, 0.033]], seg, 40), 0.002), m.black));
    // tapered tube
    const L = bp.len;
    out.push(part(place(latheY([[0, 0], [bp.legR - 0.0004, 0], [bp.legR - 0.0004, 0.004], [bp.legR - 0.0014, L - 0.085], [bp.legR - 0.0016, L - 0.035], [0, L - 0.035]], seg, 30), 0.03), m.black));
    // ferrule / clamp band a third of the way down
    out.push(part(place(latheY([[0, 0], [bp.legR + 0.0004, 0], [bp.legR + 0.0008, 0.002], [bp.legR + 0.0008, 0.011], [bp.legR + 0.0004, 0.013], [0, 0.013]], seg, 40), 0.09), m.black));
    // foot: shank + flat spade with a turned-up toe, sole perpendicular to soleDown in the deployed pose
    const tip = p0.clone().addScaledVector(d, L);
    out.push(part(place(latheY([[0, 0], [bp.legR - 0.0018, 0], [bp.legR - 0.0022, 0.02], [0.0048, 0.03], [0, 0.03]], seg, 40), L - 0.036), m.black));
    // sole frame: n = up out of the top of the sole, f = forward along the sole
    const legFwdRef = state === 'deployed' ? V(0, 0, 1) : V(0, -1, 0);
    let n: THREE.Vector3, f: THREE.Vector3;
    if (state === 'deployed') {
      n = soleDown.clone().negate();
      f = legFwdRef.clone().addScaledVector(n, -legFwdRef.dot(n)).normalize();
    } else {
      // folded: rotate the deployed sole frame with the leg (rigid foot)
      const dd = legDir('deployed', s);
      const qf = new THREE.Quaternion().setFromUnitVectors(dd, d);
      n = soleDown.clone().negate().applyQuaternion(qf);
      const f0 = V(0, 0, 1).addScaledVector(soleDown, -V(0, 0, 1).dot(soleDown)).normalize();
      f = f0.applyQuaternion(qf);
    }
    const x = n.clone().cross(f).normalize();
    const fm = basis(x, n, f, tip);
    // spade: rounded, wider at the toe, with a raised rim along its edge and a rear claw
    const sole: V2[] = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const c = Math.cos(a), sn = Math.sin(a);
      const hw = sn > 0 ? 0.0125 : 0.0095; // wider towards the toe (+y = forward)
      sole.push([hw * Math.sign(c) * Math.pow(Math.abs(c), 0.7), 0.004 + (sn > 0 ? 0.019 : 0.015) * Math.sign(sn) * Math.pow(Math.abs(sn), 0.8)]);
    }
    const pad = extrudeZ(sole, [], 0, 0.003, 0.0008, 2);
    // extrudeZ outline is (x, y) -> map outline y to the forward axis and thickness to the normal
    pad.applyMatrix4(new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1));
    G.flipWinding(pad);
    pad.applyMatrix4(fm);
    out.push(part(pad, m.black));
    // raised stiffening rib along the spade and the turned-up toe
    const rib = G.rbox(0.0035, 0.0035, 0.03, 0.0012, 1);
    rib.translate(0, 0.004, 0.004);
    rib.applyMatrix4(fm);
    out.push(part(rib, m.black));
    const toe = G.rbox(0.021, 0.008, 0.003, 0.0012, 1);
    toe.rotateX(-35 * RAD);
    toe.translate(0, 0.0038, 0.0232);
    toe.applyMatrix4(fm);
    out.push(part(toe, m.black));
    // web from the shank to the spade
    const web = G.rbox(0.005, 0.011, 0.02, 0.0015, 1);
    web.translate(0, 0.0072, 0.0015);
    web.applyMatrix4(fm);
    out.push(part(web, m.black));
    // rear claw digging in behind the spade
    const claw = G.rbox(0.004, 0.012, 0.004, 0.0012, 1);
    claw.rotateX(30 * RAD);
    claw.translate(0, 0.0035, -0.0135);
    claw.applyMatrix4(fm);
    out.push(part(claw, m.black));
  }
  return out;
}
