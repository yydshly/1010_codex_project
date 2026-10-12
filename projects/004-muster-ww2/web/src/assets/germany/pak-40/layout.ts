/**
 * Key layout numbers for the PaK 40 model (metres, raw frame: axle centre at z = 0, before the
 * final re-centring). +Y up, +Z towards the muzzle, +X = the gun's left (gunner's side).
 *
 * Verified reference values (see provenance in pak-40.asset.ts):
 *   barrel incl. muzzle brake 3.45 m (L/46), overall length 6.185 m, width ~2.0 m, height ~1.2 m,
 *   firing height 960 mm, recoil 900 mm, wheel diameter ~885 mm, tyre width ~15 cm,
 *   clear spacing between wheels ~1.47 m, shield 2 x 4 mm plates 25 mm apart.
 */
import { THREE } from '../../../core/kit';

/** Bore axis height (firing height 960 mm). */
export const Y_BORE = 0.96;
/** Rear face of the breech ring and front of the muzzle brake: 3.45 m apart. */
export const Z_BREECH = -0.95;
export const Z_MUZZLE = 2.5;
/** Trunnion axis (elevation pivot). */
export const TRUNNION = new THREE.Vector3(0, 0.905, -0.3);

/** Wheels: 885 mm over the tyre, 15 cm tyre, 1.47 m clear between tyres -> 1.62 m track. */
export const TYRE_R = 0.4425;
export const TYRE_W = 0.15;
export const TYRE_FLAT = 0.012;
export const WHEEL_Y = TYRE_R - TYRE_FLAT;
export const WHEEL_X = 0.81;

/** Torsion-bar axle tube (in front of the wheel centres, crank arms trail back to the hubs). */
export const AXLE_Y = 0.465;
export const AXLE_Z = 0.12;

/** Trail hinge pins (vertical) at the rear corners of the lower carriage. */
export const HINGE = { x: 0.24, y: 0.43, z: -0.43 };
/** Trail spread for the deployed state (each side), degrees (spade spread ~3.6 m). */
export const SPREAD_DEPLOYED = 26;
/** Half-gap between closed trail ends. */
export const CLOSED_END_X = 0.105;

/** Upper shield: centre panel plane (front plate), slope from vertical and wing fold. */
export const SHIELD = {
  bottomY: 0.6,
  bottomZ: 0.3,
  topY: 1.23,
  slopeDeg: 18,
  foldX: 0.4,
  wingDeg: 25,
  outerX: 1.01,
  /** plate thickness (4 mm) and centre-to-centre spacing (4 + 25 mm gap -> 29 mm) */
  t: 0.0045,
  gap: 0.029,
};

/** Top-carriage cheeks (outer face x). */
export const CHEEK_X = 0.165;
export const CHEEK_T = 0.02;
