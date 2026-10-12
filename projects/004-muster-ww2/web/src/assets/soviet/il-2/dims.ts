/**
 * Il-2 (two-seat, 1943-44) reference frame and key dimensions.
 *
 * Everything except the landing gear is authored in the BODY frame:
 *   x = asset left (port), y = up from the thrust line, z = -s,
 *   s = distance (m) aft of the spinner tip along the thrust line.
 * The body is pitched nose-up by the three-point ground angle and lifted so that the tail wheel
 * meets the ground; the main gear is then built directly in the asset frame down to y = 0.
 *
 * Research notes (see provenance in ../il-2.asset.ts):
 *  - span 14.60 m, length 11.65 m, wing area 38.5 m^2, tailplane span 4.90 m
 *  - centre-section chord 3.2 m; outer-panel leading edge swept back 15 deg (1943 'arrow' wing)
 *  - main wheels 800 x 260 mm, tail wheel 400 x 150 mm (fixed)
 *  - AV-5L-158 three-blade propeller, 3.6 m diameter
 *  - gear track, fuselage sections, wing thickness and ground angle are estimates
 *    from photographs / general arrangement (not measured drawings)
 */
import * as THREE from 'three';
import { DEG } from './geo';

/** Body point from (x, y, s). */
export const B = (x: number, y: number, s: number) => new THREE.Vector3(x, y, -s);

export const D = {
  length: 11.65,
  span: 14.6,
  semi: 7.3,
  /** three-point ground angle (nose up) */
  theta: 10.2 * DEG,
  spinner: { len: 0.74, r: 0.352 },
  prop: { r: 1.8, plane: 0.45 },
  wing: {
    rootLE: 2.8,
    chord: 3.2,
    /** centre-section half span (outer panel joint) */
    csHalf: 2.05,
    /** chord-line height at the root (body frame) */
    y0: -0.7,
    sweepLE: 15 * DEG,
    sweepTE: 1 * DEG,
    dihedral: 3 * DEG,
    tRoot: 0.15,
    tJoint: 0.145,
    tTip: 0.09,
    hinge: 0.75,
  },
  nacelle: { x: 1.7, s0: 2.42, s1: 5.35, well0: 2.95, well1: 4.9, halfW: 0.235, wellHalfW: 0.155 },
  /** main gear pivot (port side), body frame */
  pivot: { x: 1.7, y: -0.67, s: 3.2 },
  mainTyre: { r: 0.4, w: 0.26, flat: 0.015 },
  tailTyre: { r: 0.2, w: 0.15, flat: 0.01 },
  /** tail wheel swivel attachment on the fuselage underside */
  tailAttach: { s: 10.42 },
  /** tail wheel axle height below that attachment in the asset frame (leg + fork) */
  tailLeg: 0.41,
  /** cockpit opening (no top decking between these stations) */
  cockpit: { s0: 3.05, s1: 5.75 },
  canopy: { ws0: 3.05, ws1: 3.42, hood1: 4.42, bridge1: 4.8, gun1: 5.62 },
};
