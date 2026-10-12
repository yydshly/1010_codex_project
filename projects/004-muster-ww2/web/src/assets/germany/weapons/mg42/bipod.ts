/**
 * MG 42 bipod (Zweibein) on the front bipod holder of the barrel jacket (B-frame, see util.ts).
 * Head clamp with the transverse fold pin, two tubular legs with spring catches, hinged claw feet.
 *  - folded:   legs swung back side by side along the underside of the jacket (carry position)
 *  - deployed: legs swung forward-down and splayed; the feet are turned so their soles lie level on
 *              the ground for a given gun pitch (see mg42BipodStance in mg42.model.ts)
 */
import { THREE, G, part, group } from '../../../../core/kit';
import type { Mg42Mats } from './materials';
import { D } from './dims';
import { JACKET as J } from './jacket';
import { cylX, cylZ } from './util';

export const BIPOD = {
  z: D.bipodZ,
  pivotY: J.bot - 0.0185,
  legLen: 0.3,
  legR: 0.0068,
  legX: 0.0088,
  /** deployed angles (deg): forward rake from vertical and sideways splay of each leg */
  rake: 18,
  splay: 22,
  /** sole of the foot below the foot pin (m) */
  soleDrop: 0.0068,
};

export type BipodState = 'folded' | 'deployed';

function rotLeg(fold: number, splay: number): THREE.Euler {
  return new THREE.Euler(THREE.MathUtils.degToRad(fold), 0, THREE.MathUtils.degToRad(splay), 'XYZ');
}

/** Leg rotation (Euler) for a state; side +1 = left leg (+X). */
export function legEuler(state: BipodState, side: number): THREE.Euler {
  // folded: swung back past horizontal by ~1.7 deg so the leg ends lie close under the jacket
  return state === 'folded' ? rotLeg(91.7, 0) : rotLeg(-BIPOD.rake, side * BIPOD.splay);
}

/** Pivot of a leg (B-frame). */
export const legPivot = (side: number) => new THREE.Vector3(side * BIPOD.legX, BIPOD.pivotY, BIPOD.z);

/** Foot pin position (B-frame) for a state. */
export function footPin(state: BipodState, side: number): THREE.Vector3 {
  const d = new THREE.Vector3(0, -BIPOD.legLen, 0).applyEuler(legEuler(state, side));
  return legPivot(side).add(d);
}

/**
 * Build the bipod. groundPitchDeg = gun pitch (muzzle up) at which the deployed feet lie flat on
 * the ground.
 */
export function buildBipod(mats: Mg42Mats, state: BipodState, groundPitchDeg = 7): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const z = BIPOD.z;
  // ---- head: saddle clamped to the holder lug, fold pin with heads, spring catch plate
  out.push(part(G.rbox(0.034, 0.0105, 0.028, 0.0028, 2), mats.phos, { p: [0, J.bot - 0.0118, z] }));
  out.push(part(G.rbox(0.026, 0.006, 0.02, 0.0018, 2), mats.phos, { p: [0, BIPOD.pivotY + 0.001, z] }));
  out.push(part(cylX(0.0027, 0.043, 12), mats.blued, { p: [0, BIPOD.pivotY, z] }));
  for (const s of [1, -1]) out.push(part(cylX(0.0042, 0.0016, 16), mats.blued, { p: [s * 0.0222, BIPOD.pivotY, z] }));
  out.push(part(G.rbox(0.012, 0.0022, 0.03, 0.0008, 1), mats.blued, { p: [0, J.bot - 0.0058, z - 0.02], r: [-4, 0, 0] }));

  // ---- legs
  for (const side of [1, -1]) {
    const leg = new THREE.Group();
    // knuckle round the fold pin
    leg.add(part(cylX(0.0062, 0.0092, 18), mats.phos));
    // splay hinge block and the tube
    leg.add(part(G.rbox(0.011, 0.018, 0.0125, 0.0025, 2), mats.phos, { p: [0, -0.012, 0] }));
    leg.add(part(G.rod([0, -0.018, 0], [0, -0.2, 0], BIPOD.legR, 16), mats.phos));
    leg.add(part(G.rod([0, -0.2, 0], [0, -BIPOD.legLen + 0.008, 0], BIPOD.legR * 0.88, 16, BIPOD.legR * 0.82), mats.phos));
    // pressed collar where the lower leg is swaged
    leg.add(part(G.cyl(BIPOD.legR + 0.0008, BIPOD.legR + 0.0008, 0.006, 18), mats.phos, { p: [0, -0.2, 0] }));
    // leg catch: spring plate with a thumb piece
    leg.add(part(G.rbox(0.004, 0.034, 0.006, 0.0012, 1), mats.blued, { p: [0, -0.04, 0.0074] }));
    leg.add(part(G.rbox(0.008, 0.005, 0.009, 0.0015, 2), mats.blued, { p: [0, -0.058, 0.009] }));
    // foot pin knuckle
    leg.add(part(G.rbox(0.011, 0.012, 0.012, 0.003, 2), mats.phos, { p: [0, -BIPOD.legLen + 0.004, 0] }));
    leg.add(part(cylX(0.0022, 0.016, 10), mats.blued, { p: [0, -BIPOD.legLen, 0] }));
    const piv = legPivot(side);
    leg.position.copy(piv);
    leg.rotation.copy(legEuler(state, side));
    out.push(leg);

    // ---- foot: claw plate with upturned ends, hinged on the pin
    const foot = new THREE.Group();
    const sole = G.rbox(0.02, 0.0034, 0.046, 0.0014, 2);
    // bend the ends up (claw / runner shape)
    const p = sole.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const zz = p.getZ(i);
      const e = Math.max(0, Math.abs(zz) - 0.014);
      p.setY(i, p.getY(i) + e * e * 9);
    }
    sole.computeVertexNormals();
    foot.add(part(sole, mats.phos, { p: [0, -BIPOD.soleDrop + 0.0017, 0] }));
    // cheeks carrying the pin, and a pressed stiffening rib along the sole
    for (const s of [1, -1]) foot.add(part(G.rbox(0.0022, 0.009, 0.012, 0.0008, 1), mats.phos, { p: [s * 0.0068, -0.0022, 0] }));
    foot.add(part(G.rbox(0.005, 0.0016, 0.026, 0.0007, 1), mats.phos, { p: [0, -BIPOD.soleDrop + 0.0038, 0] }));
    foot.position.copy(footPin(state, side));
    if (state === 'deployed') {
      // sole level with the ground for the given gun pitch (world down in the gun frame)
      const th = THREE.MathUtils.degToRad(groundPitchDeg);
      const up = new THREE.Vector3(0, Math.cos(th), Math.sin(th));
      const fwd = new THREE.Vector3(0, 0, 1).addScaledVector(up, -up.z).normalize();
      const x = up.clone().cross(fwd).normalize();
      foot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, fwd));
    } else {
      // folded: foot lies flat under the end of the leg
      foot.rotation.set(0, 0, 0);
    }
    out.push(foot);
  }
  // stud on the jacket underside that the folded legs clip onto
  out.push(part(cylZ(0.0026, 0.008, 12), mats.blued, { p: [0, J.bot - 0.004, BIPOD.z - BIPOD.legLen + 0.03] }));
  return out;
}

/** Group helper. */
export const bipodGroup = (mats: Mg42Mats, state: BipodState, pitch = 7) => group(buildBipod(mats, state, pitch));
