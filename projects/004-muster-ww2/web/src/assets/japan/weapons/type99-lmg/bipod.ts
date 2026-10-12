/**
 * Type 99 LMG bipod (L-frame): a yoke clamped round the gas cylinder just behind the gas block, two
 * tubular legs on hinge pins either side, knurled lock collars and flat feet.
 *   'folded'   legs swung back under the barrel, flanking the gas cylinder
 *   'deployed' legs down and splayed, feet flat for the stance pitch (see LMG_STANCE_PITCH)
 */
import { THREE, G, part } from '../../../../core/kit';
import { V, cylX, knurledKnob, placeAlong, latheY } from '../common/geo';
import { LD, BUTT } from './dims';
import type { JpwMats } from '../common/materials';

export type LmgBipod = 'folded' | 'deployed';

const PIVOT_X = 0.0175;
const PIVOT_Y = LD.bipodY - 0.006;

export const legPivot = (side: 1 | -1) => V(side * PIVOT_X, PIVOT_Y, LD.bipodZ);

export function legDir(state: LmgBipod, side: 1 | -1): THREE.Vector3 {
  return state === 'folded' ? V(side * 0.045, -0.035, -1).normalize() : V(side * 0.34, -1, 0.1).normalize();
}

/** Centre of the bottom face of a foot (L-frame). */
export function footPoint(state: LmgBipod, side: 1 | -1): THREE.Vector3 {
  return legPivot(side).addScaledVector(legDir(state, side), LD.legLen + 0.006);
}

/** Lowest point of the butt (toe) in the L-frame. */
export function buttToe(): THREE.Vector3 {
  const s = BUTT.at(LD.plateZ);
  return V(0, s.yBot - 0.0014, 0.001);
}

/**
 * Nose-up pitch (rad) at which the deployed feet and the butt toe touch one ground plane.
 * (Rotation about +X by -pitch lifts the muzzle.)
 */
export function stancePitch(): number {
  const f = footPoint('deployed', 1), t = buttToe();
  return -Math.atan2(f.y - t.y, f.z - t.z);
}

export function buildBipod(m: JpwMats, state: LmgBipod, hi: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const z = LD.bipodZ, gy = LD.gasY;
  // yoke: clamp ring round the gas cylinder with the hinge lugs below
  out.push(part(new THREE.CylinderGeometry(LD.gasR + 0.0035, LD.gasR + 0.0035, 0.018, 28).rotateX(Math.PI / 2), m.blued, { p: [0, gy, z] }));
  out.push(part(G.rbox(2 * PIVOT_X + 0.006, 0.012, 0.016, 0.003, 2), m.blued, { p: [0, PIVOT_Y - 0.001, z] }));
  out.push(part(cylX(0.0026, 2 * PIVOT_X + 0.02, 12), m.bluedDark, { p: [0, PIVOT_Y, z] }));
  // clamp screw on top of the yoke (under the barrel) - nut on the right
  out.push(part(new THREE.CylinderGeometry(0.004, 0.004, 0.005, 6).rotateZ(Math.PI / 2), m.bluedDark, { p: [-(LD.gasR + 0.006), gy, z] }));
  const pitch = stancePitch();
  for (const side of [1, -1] as const) {
    const p = legPivot(side);
    const d = legDir(state, side);
    const hinge = p.clone().add(V(side * 0.006, 0, 0));
    out.push(part(G.rbox(0.008, 0.014, 0.014, 0.0025, 2), m.blued, { p: hinge.toArray() as [number, number, number] }));
    const a = hinge.clone().addScaledVector(d, 0.006);
    const b = hinge.clone().addScaledVector(d, LD.legLen * 0.58);
    const c = hinge.clone().addScaledVector(d, LD.legLen);
    out.push(part(G.rod(a, b, 0.0068, 16), m.blued));
    out.push(part(G.rod(b, c, 0.0056, 16), m.blued));
    const col = knurledKnob(0.0085, 0.014, hi ? 20 : 12, 0.0004, 0.0006);
    out.push(part(placeAlong(col, b.clone().addScaledVector(d, -0.007), d), m.bluedDark));
    // foot: flat disc pad (level with the ground when deployed), spike stub below
    const foot = latheY([[0, 0], [0.013, 0], [0.0145, 0.0015], [0.0135, 0.0035], [0.0065, 0.0055], [0.0056, 0.009], [0, 0.009]], 24, 45);
    if (state === 'deployed') {
      // lay the pad flat in the final (pitched) stance: its up vector is world up expressed in the L-frame
      const up = V(0, Math.cos(pitch), Math.sin(pitch));
      const fp = footPoint(state, side);
      out.push(part(placeAlong(foot, fp, up), m.bluedDark));
    } else {
      out.push(part(placeAlong(foot, c.clone().addScaledVector(d, 0.006), d.clone().negate()), m.bluedDark));
    }
  }
  return out;
}
