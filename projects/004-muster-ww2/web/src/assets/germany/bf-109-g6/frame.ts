/**
 * Bf 109 G-6 reference frame and key dimensions.
 *
 * Everything except the landing gear is authored in the BODY frame:
 *   x = asset left (port), y = up from the thrust line, z = -s
 *   where s is the distance (m) aft of the spinner tip, measured along the thrust line.
 * The body is then pitched nose-up by the ground angle (three-point attitude) and placed so the
 * tyres touch y = 0 (see bodyToAsset). The gear is built directly in the asset frame so it
 * meets the ground exactly.
 *
 * Numbers (research notes):
 *  - span 9.925 m, length 9.02 m (NASM) / 8.95 m (other sources), wing area 16.05 m^2
 *  - NACA 2R1 14.2 root / 2R1 11.35 tip sections, dihedral ~6.5 deg
 *  - main wheels 660 x 160 mm, fixed tail wheel 350 x 135 mm, track ~2.0 m
 *  - VDM 9-12087 three-blade propeller, 3.0 m diameter
 *  - three-point ground angle ~12-13 deg; NASM height 3.4 m (tail down, blade vertical)
 *  - main legs hinge on a forging at the firewall and are splayed outwards
 */
import * as THREE from 'three';

export const DEG = Math.PI / 180;

/** Body point from (x, y, s). */
export const B = (x: number, y: number, s: number) => new THREE.Vector3(x, y, -s);

export const DIM = {
  length: 9.02,
  span: 9.925,
  semi: 9.925 / 2,
  dihedral: 6.5 * DEG,
  /** ground (sitting) angle, nose up */
  theta: 12.0 * DEG,
  /** main gear pivot (port side), body frame */
  pivot: { x: 0.63, y: -0.55, s: 2.42 },
  /** pivot height above the ground in the parked attitude */
  pivotHeight: 1.07,
  /** tail wheel strut attachment on the fuselage underside */
  tailAttach: { y: 0.045, s: 8.25 },
  mainTyre: { r: 0.33, w: 0.16 },
  tailTyre: { r: 0.175, w: 0.135 },
  prop: { r: 1.5, plane: 0.43 },
  spinner: { len: 0.62, r: 0.296 },
};

/** Body -> asset transform (pitch nose-up by theta, then place on the ground, centred). */
export function bodyToAsset(): THREE.Matrix4 {
  const rot = new THREE.Matrix4().makeRotationX(-DIM.theta);
  const pv = B(DIM.pivot.x, DIM.pivot.y, DIM.pivot.s).applyMatrix4(rot);
  const nose = new THREE.Vector3(0, 0, 0).applyMatrix4(rot);
  const tail = B(0, 0.5, DIM.length).applyMatrix4(rot);
  const ty = DIM.pivotHeight - pv.y;
  const tz = -(nose.z + tail.z) / 2;
  return new THREE.Matrix4().makeTranslation(0, ty, tz).multiply(rot);
}

export const BODY_TO_ASSET = bodyToAsset();
export const ASSET_TO_BODY = BODY_TO_ASSET.clone().invert();

/** Body point -> asset point. */
export const toAsset = (v: THREE.Vector3) => v.clone().applyMatrix4(BODY_TO_ASSET);
/** Body direction -> asset direction. */
export const dirToAsset = (v: THREE.Vector3) => v.clone().transformDirection(BODY_TO_ASSET);
