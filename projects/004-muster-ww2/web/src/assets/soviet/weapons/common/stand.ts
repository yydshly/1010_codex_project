/**
 * Presentation helper for the Soviet weapons on the shared weapon stand (shared/display.ts).
 *
 * The stand's felt-lined cradles are U rings (felt inner radius 15.5 mm, centre 13 mm above the rest
 * height). Given the weapon's cross-section at each rest point, the rest height handed to the stand is
 * corrected so the section actually touches the felt (no floating, no sinking). The stand height is then
 * chosen so the lowest part of the levelled weapon (and its sling) clears the stand base.
 */
import { THREE, group } from '../../../../core/kit';
import type { WeaponModel } from '../../../shared/contracts';
import { weaponStand } from '../../../shared/display';

const FELT_R = 0.0185 - 0.003;
const FELT_C = 0.013;
const BASE_TOP = 0.035 + 0.006;

/** Weapon-local rest height for a cross-section contour ([x, y] metres) resting in the felt cradle. */
export function feltRestY(contour: [number, number][]): number {
  let yc = Infinity;
  for (const [x, y] of contour) {
    const ax = Math.abs(x);
    yc = Math.min(yc, ax < FELT_R ? y + Math.sqrt(FELT_R * FELT_R - ax * ax) : y);
  }
  return yc - FELT_C;
}

export interface StandPresentation {
  /** Rest points (weapon-local) with the local cross-section used for felt contact. */
  rest: { p: THREE.Vector3; contour?: [number, number][] }[];
  sling?: boolean;
  slingSlack?: number;
  /** Clearance of the lowest point above the stand base (m). */
  clearance?: number;
  overhang?: number;
  minHeight?: number;
}

export function presentOnStand(w: WeaponModel, s: StandPresentation): THREE.Group {
  const rp = s.rest.map((r) => (r.contour ? r.p.clone().setY(feltRestY(r.contour)) : r.p.clone()));
  const onStand: WeaponModel = { ...w, restPoints: rp };
  const [a, b] = [...rp].sort((p, q) => p.z - q.z);
  const pitch = Math.atan2(b.y - a.y, b.z - a.z);
  const probe = new THREE.Group();
  probe.rotation.x = pitch;
  probe.add(w.object.clone(true));
  probe.updateMatrixWorld(true);
  const slack = s.slingSlack ?? 0.03;
  if (w.sling && s.sling !== false) {
    const gl = new THREE.Vector3(0, -1, 0).applyQuaternion(probe.quaternion.clone().invert());
    probe.add(w.sling.build(gl, slack));
  }
  probe.updateMatrixWorld(true);
  const lowest = new THREE.Box3().setFromObject(probe, true).min.y;
  const r0y = a.clone().applyMatrix4(probe.matrixWorld).y;
  const lift = Math.max(s.minHeight ?? 0.08, BASE_TOP + (s.clearance ?? 0.018) - 0.035 - (lowest - r0y));
  return group([weaponStand(onStand, { height: lift, sling: s.sling !== false, slingSlack: slack, overhang: s.overhang ?? 0.07 })]);
}
