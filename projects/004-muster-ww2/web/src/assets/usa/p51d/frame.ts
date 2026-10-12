/**
 * P-51D Mustang reference frame and key dimensions.
 *
 * Everything except the landing gear is authored in the BODY frame:
 *   x = asset left (port), y = up from the thrust line, z = -s
 *   where s is the distance (m) aft of the spinner tip, measured along the thrust line.
 * The body is pitched nose-up by the three-point ground angle and placed so the tyres touch
 * y = 0 (see bodyToAsset). Landing gear is built in the ASSET frame so it meets the ground exactly.
 *
 * Research notes (see provenance in p51d.asset.ts):
 *  - span 37 ft 0 in (11.28 m), length 32 ft 3 in (9.83 m), wing area 235 sq ft (21.83 m^2)
 *  - height 13 ft 4.5 in (4.08 m) "tail wheel on ground, vertical propeller blade"
 *    -> propeller hub ~2.38 m above the ground in the three-point attitude
 *  - NASM height 3.71 m (12 ft 2 in) = propeller vertical in the level (flying) attitude
 *  - Hamilton Standard four-blade propeller, 11 ft 2 in (3.40 m) diameter
 *  - wing sections: NAA/NACA 45-100 series, P-51D root (BL 17.5) ~16.5 % and tip (BL 215) ~11.4 %
 *    (coordinates: UIUC airfoil database), dihedral ~5 deg
 *  - main gear: wide track (~12 ft / 3.6 m), inward retracting, 27 in tyres; retractable,
 *    steerable tail wheel
 */
import * as THREE from 'three';

export const DEG = Math.PI / 180;

/** Body point from (x, y, s). */
export const B = (x: number, y: number, s: number) => new THREE.Vector3(x, y, -s);

export const DIM = {
  length: 9.83,
  span: 11.28,
  semi: 11.28 / 2,
  /** three-point ground angle, nose up */
  theta: 10.0 * DEG,
  /** propeller hub height above the ground in the three-point attitude (4.08 m - 1.70 m) */
  hubHeight: 2.38,
  /** main gear pivot (port side), body frame */
  pivot: { x: 1.97, y: -0.41, s: 3.3 },
  /** leg rake (forward, body frame) and track of the wheel centres */
  rake: 8 * DEG,
  track: 3.62,
  mainTyre: { r: 0.343, w: 0.2 },
  tailTyre: { r: 0.16, w: 0.105 },
  /** tail wheel strut attachment on the fuselage underside */
  tailAttach: { y: -0.3, s: 8.46 },
  prop: { r: 1.7, plane: 0.5 },
  spinner: { len: 0.86, r: 0.393 },
};

/** Body -> asset transform (pitch nose-up by theta, place the hub at hubHeight, centre in z). */
function bodyToAsset(): THREE.Matrix4 {
  const rot = new THREE.Matrix4().makeRotationX(-DIM.theta);
  const hub = B(0, 0, DIM.prop.plane).applyMatrix4(rot);
  const nose = new THREE.Vector3(0, 0, 0).applyMatrix4(rot);
  const tail = B(0, 0.6, DIM.length).applyMatrix4(rot);
  const ty = DIM.hubHeight - hub.y;
  const tz = -(nose.z + tail.z) / 2;
  return new THREE.Matrix4().makeTranslation(0, ty, tz).multiply(rot);
}

export const BODY_TO_ASSET = bodyToAsset();
export const ASSET_TO_BODY = BODY_TO_ASSET.clone().invert();

/** Body point -> asset point. */
export const toAsset = (v: THREE.Vector3) => v.clone().applyMatrix4(BODY_TO_ASSET);
/** Body direction -> asset direction. */
export const dirToAsset = (v: THREE.Vector3) => v.clone().transformDirection(BODY_TO_ASSET);
/** Asset point -> body point. */
export const toBody = (v: THREE.Vector3) => v.clone().applyMatrix4(ASSET_TO_BODY);
