/**
 * Presentation of the US weapons on the shared weapon stand (src/assets/shared/display.ts).
 *
 * The stand's felt-lined cradles are U rings (felt inner radius 15.5 mm, centre 13 mm above the
 * rest height). Given the weapon's cross-section at each rest point, the rest height handed to the
 * stand is corrected so the section actually touches the felt (no floating, no sinking). The stand
 * height is then chosen so the lowest part of the levelled weapon (and its sling) clears the base.
 *
 * Slings: the stand builds the sling through weapon.sling.build(gravityLocal, slack). A caller may
 * pass `slingBuild` to replace it (e.g. to add the stand's cradles as obstacles), receiving the
 * weapon-local boxes occupied by the cradles and uprights.
 */
import { THREE, group } from '../../../../core/kit';
import type { WeaponModel } from '../../../shared/contracts';
import { weaponStand } from '../../../shared/display';
import type { Box } from './sling';

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
  /** Replacement sling builder for the stand (cradle boxes in weapon-local space). */
  slingBuild?: (gravityLocal: THREE.Vector3, slack: number, cradles: Box[]) => THREE.Object3D;
  /** Clearance of the lowest point above the stand base (m). */
  clearance?: number;
  overhang?: number;
  minHeight?: number;
}

/** Weapon-local boxes occupied by the cradle rings and uprights below the given rest points. */
export function cradleBoxes(rp: THREE.Vector3[], pitch: number, depth = 0.45): Box[] {
  const s = Math.abs(Math.sin(pitch));
  return rp.map((p) => {
    const dz = 0.012 + depth * s;
    return { min: [-0.03, p.y - depth, p.z - dz], max: [0.03, p.y + 0.026, p.z + dz] } as Box;
  });
}

export function presentOnStand(w: WeaponModel, s: StandPresentation): THREE.Group {
  const rp = s.rest.map((r) => (r.contour ? r.p.clone().setY(feltRestY(r.contour)) : r.p.clone()));
  const [a, b] = [...rp].sort((p, q) => p.z - q.z);
  const pitch = Math.atan2(b.y - a.y, b.z - a.z);
  const slack = s.slingSlack ?? 0.03;
  const showSling = !!w.sling && s.sling !== false;
  let sling = w.sling;
  if (w.sling && s.slingBuild) {
    const boxes = cradleBoxes(rp, pitch);
    const fn = s.slingBuild;
    sling = { ...w.sling, build: (g: THREE.Vector3, sl?: number) => fn(g, sl ?? slack, boxes) };
  }
  const onStand: WeaponModel = { ...w, restPoints: rp, sling };

  // probe: lowest point of the levelled weapon (+ sling) relative to the rear rest point
  const probe = new THREE.Group();
  probe.rotation.x = pitch;
  probe.add(w.object.clone(true));
  probe.updateMatrixWorld(true);
  if (showSling && sling) {
    const gl = new THREE.Vector3(0, -1, 0).applyQuaternion(probe.quaternion.clone().invert());
    probe.add(sling.build(gl, slack));
  }
  probe.updateMatrixWorld(true);
  const lowest = new THREE.Box3().setFromObject(probe, true).min.y;
  const r0y = a.clone().applyMatrix4(probe.matrixWorld).y;
  const lift = Math.max(s.minHeight ?? 0.08, BASE_TOP + (s.clearance ?? 0.018) - 0.035 - (lowest - r0y));
  const stand = weaponStand(onStand, { height: lift, sling: showSling, slingSlack: slack, overhang: s.overhang ?? 0.07 });
  // centre the footprint (weapon + stand) on the origin
  const g = group([stand]);
  const bb = new THREE.Box3().setFromObject(g, true);
  stand.position.x -= (bb.min.x + bb.max.x) / 2;
  stand.position.z -= (bb.min.z + bb.max.z) / 2;
  return g;
}
