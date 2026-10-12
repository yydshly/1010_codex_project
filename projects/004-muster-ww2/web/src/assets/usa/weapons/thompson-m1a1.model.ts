/**
 * Thompson submachine gun, Caliber .45, M1A1 - shared weapon model. Blowback-operated, .45 ACP,
 * simplified wartime model: side cocking handle, fixed peep rear sight with protective wings, smooth
 * barrel without compensator, horizontal fore-grip, walnut stock and pistol grip, Parkerized metal.
 * Magazine: 30-round box (default) or 20-round box (the drum does not fit the M1A1).
 *
 * STABLE EXPORT (used by the standalone catalog entry and by US soldier builders):
 *
 *   import { buildThompsonM1A1 } from '../usa/weapons/thompson-m1a1.model';   // path relative to yours
 *   const smg = buildThompsonM1A1({ magazine: '30' });                         // -> WeaponModel
 *
 *   ThompsonM1A1Options
 *     magazine: '30' (default) | '20' | 'none'  (boolean true/false = '30'/'none')
 *     detail:   'high' (default) | 'low'
 *
 *   Also exported: THOMPSON_M1A1 (key lengths + ORIGIN_T = grip centre in the design frame),
 *   thompsonRestContours() (weapon-local cross-sections at the rest points, for the display cradles),
 *   buildThompsonSlingLocal(gravityLocal, slack, extraBoxes?, magazine?) (the sling in weapon-local
 *   space with extra obstacle boxes pushed round along +X, e.g. display cradles).
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, gun's left side +X.
 * ORIGIN = trigger-hand grip centre: on the pistol-grip axis, 45 mm below the top of the grip (88 mm
 * below the bore). Real scale (m): overall 0.811, barrel 0.267, butt plate 0.284 behind the origin.
 *
 *   grips.trigger  pistol grip (raked 15 deg): axis up the grip, palm on the right-rear (-X / -Z),
 *                  radius 18.5 mm, length 90 mm. Trigger face 68 mm ahead of the grip axis.
 *   grips.support  horizontal fore-grip under the barrel, 360 mm ahead of the origin: axis +Z, palm under
 *                  (slightly left), radius 21 mm, length 100 mm.
 *   shoulder       centre of the butt plate.
 *   muzzle         muzzle crown on the bore axis.
 *   sling          front = bar of the swivel under the front of the fore-grip, rear = bar of the swivel
 *                  under the butt. sling.build(gravityLocal, slack = 0.12) returns the OD web sling; it is
 *                  NOT part of `object`.
 *   restPoints     [underside of the stock just behind the frame, underside of the fore-grip] (true
 *                  surface points).
 *   sockets        'triggerFace', 'magazine' (top centre of the magazine, +Y up), 'cockingHandle' (knob),
 *                  'frontSight' (blade tip), 'rearSight' (aperture), 'selector', 'safety'.
 *
 * Authoring frame ("T-frame", see thompson/dims.ts): z = 0 at the butt plate, y = 0 on the bore; the
 * model is shifted at the end so that the grip centre is the origin.
 */
import { THREE, group } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { Profile, V } from './common/geo';
import type { Box } from './common/sling';
import { TD, TSTOCK, TFORE, GRIP } from './thompson/dims';
import { buildThompsonParts, TSWIVELS, tSwivelBar, type ThompsonMagazine } from './thompson/parts';
import { buildThompsonSling } from './thompson/sling';
import { thompsonMaterials } from './thompson/materials';

export interface ThompsonM1A1Options {
  magazine?: ThompsonMagazine | boolean;
  detail?: 'high' | 'low';
}

const gripCentreT = () => V(...GRIP.top).addScaledVector(V(...GRIP.down), 0.045);

export const THOMPSON_M1A1 = {
  length: TD.length,
  barrel: TD.barrel,
  ORIGIN_T: gripCentreT(),
};

const L = (p: THREE.Vector3) => p.clone().sub(THOMPSON_M1A1.ORIGIN_T);

const magOf = (m: ThompsonM1A1Options['magazine']): ThompsonMagazine => (m === false || m === 'none' ? 'none' : m === '20' ? '20' : '30');

/** Weapon-local cross-sections ([x, y] m) at the two rest points: [stock, fore-grip]. */
export function thompsonRestContours(): [number, number][][] {
  const oy = THOMPSON_M1A1.ORIGIN_T.y;
  return [
    Profile.ring(TSTOCK.at(TD.rearRestZ), 72).map(([x, y]) => [x, y - oy] as [number, number]),
    Profile.ring(TFORE.at(TD.frontRestZ), 72).map(([x, y]) => [x, y - oy] as [number, number]),
  ];
}

/** Sling in weapon-local space; extra boxes (weapon-local) are pushed round along +X. */
export function buildThompsonSlingLocal(gravityLocal: THREE.Vector3, slack = 0.12, extra: Box[] = [], magazine: ThompsonM1A1Options['magazine'] = '30'): THREE.Object3D {
  const o = THOMPSON_M1A1.ORIGIN_T;
  const ex = extra.map((b) => ({ min: [b.min[0] + o.x, b.min[1] + o.y, b.min[2] + o.z], max: [b.max[0] + o.x, b.max[1] + o.y, b.max[2] + o.z] }) as Box);
  const s = buildThompsonSling(thompsonMaterials(), magOf(magazine), gravityLocal.clone().normalize(), slack, ex.length ? { extra: ex, push: V(1, 0, 0) } : {});
  return group([s], { p: [-o.x, -o.y, -o.z], name: 'thompson-sling' });
}

export function buildThompsonM1A1(opts: ThompsonM1A1Options = {}): WeaponModel {
  const mag = magOf(opts.magazine);
  const detail = opts.detail ?? 'high';
  const m = thompsonMaterials();
  const gc = THOMPSON_M1A1.ORIGIN_T;
  const inner = group(buildThompsonParts(m, mag, detail), { p: [-gc.x, -gc.y, -gc.z], name: 'thompson-parts' });
  const object = group([inner], { name: `thompson-m1a1-${mag}` });

  // ---- grips
  const up = V(...GRIP.down).negate();
  const fwd = V(...GRIP.fwd);
  const palmT = V(-0.8, 0, 0).addScaledVector(fwd, -0.6);
  palmT.addScaledVector(up, -palmT.dot(up)).normalize();
  const trigger: Grip = { position: V(0, 0, 0), axis: up, palm: palmT, radius: 0.0185, length: 0.09 };
  const fs = TFORE.at(TD.supportZ);
  const support: Grip = { position: L(V(0, (fs.yTop + fs.yBot) / 2, TD.supportZ)), axis: V(0, 0, 1), palm: V(0.25, -1, 0).normalize(), radius: 0.021, length: 0.1 };

  const bs = TSTOCK.at(TSTOCK.z0);
  const T = (p: THREE.Vector3) => new THREE.Matrix4().makeTranslation(...L(p).toArray());
  const sockets: Record<string, THREE.Matrix4> = {
    triggerFace: T(V(0, -0.058, TD.triggerZ)),
    magazine: T(V(0, TD.magTop, (TD.magZ0 + TD.magZ1) / 2)),
    cockingHandle: T(V(-TD.rcvHW - 0.021, 0.0085, 0.537)),
    frontSight: T(V(0, TD.sightY, TD.frontSightZ)),
    rearSight: T(V(0, TD.sightY, TD.rearSightZ)),
    selector: T(V(TD.rcvHW + 0.003, -0.0145, 0.404)),
    safety: T(V(TD.rcvHW + 0.003, -0.0145, 0.336)),
  };

  return {
    id: 'us-thompson-m1a1',
    object,
    grips: { trigger, support },
    shoulder: L(V(0, (bs.yTop + bs.yBot) / 2, -0.0036)),
    muzzle: L(V(0, 0, TD.muzzleZ)),
    sling: {
      front: L(tSwivelBar(TSWIVELS.front)),
      rear: L(tSwivelBar(TSWIVELS.rear)),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = buildThompsonSling(m, mag, gravityLocal.clone().normalize(), slack);
        return group([s], { p: [-gc.x, -gc.y, -gc.z], name: 'thompson-sling' });
      },
    },
    length: TD.length,
    restPoints: [L(V(0, TSTOCK.at(TD.rearRestZ).yBot, TD.rearRestZ)), L(V(0, TFORE.at(TD.frontRestZ).yBot, TD.frontRestZ))],
    sockets,
  };
}
