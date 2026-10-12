/**
 * Arisaka Type 99 short rifle (7.7x58mm Arisaka, 5-round internal magazine) - shared weapon model.
 * Depicts an early / mid-war rifle: blued steel, two-piece stock of reddish-brown Japanese hardwood (the
 * lower butt piece spliced on), upper handguard, lower band with the LEFT-side sling swivel, upper band /
 * nose cap with the bayonet lug and reinforcing tangs, ladder rear sight with the anti-aircraft lead arms
 * (shown folded), front sight between protective ears, straight bolt handle with the plum-shaped knob, large
 * knurled safety knob, optional sliding dust cover, cupped steel butt plate, left-side butt swivel, brown
 * leather sling. The folding wire monopod (early production, usually removed) is NOT fitted; the receiver
 * ring is plain (no imperial chrysanthemum or other markings are depicted).
 *
 * STABLE EXPORT (used by the standalone catalog entry and by Japanese soldier builders):
 *
 *   import { buildType99Rifle } from '../japan/weapons/type99-rifle.model';   // path relative to yours
 *   const rifle = buildType99Rifle();                                         // -> WeaponModel
 *
 *   Type99RifleOptions
 *     dustCover: boolean (default true)   sliding dust cover over the action (often discarded in the field)
 *     detail:    'high' (default) | 'low' 'low' drops knurling density, graduations, fewer segments
 *
 *   Also exported: TYPE99_RIFLE (key lengths + ORIGIN_R = grip centre in the design frame),
 *   type99RifleRestContours() (weapon-local cross-sections at the rest points, for the display cradles),
 *   buildType99SlingLocal(gravityLocal, slack, extraBoxes?, push?) (the sling in weapon-local space with extra
 *   obstacle boxes, e.g. display cradles).
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, rifle's left side +X.
 * ORIGIN = trigger-hand grip centre: middle of the wrist, 69 mm behind the trigger face and ~45 mm below
 * the bore axis. Real scale (m): overall 1.118, barrel 0.657; butt plate 0.261 behind the origin, muzzle
 * 0.857 ahead of it.
 *
 *   grips.trigger  wrist of the stock: axis forward and 24 deg up along the wrist, palm on the right side
 *                  (-X), radius 19 mm, length 70 mm.
 *   grips.support  fore-end (stock + handguard) 200 mm ahead of the breech, between the rear sight and the
 *                  lower band: axis +Z, palm under (slightly left), radius 21 mm, length 100 mm.
 *   shoulder       centre of the butt plate.
 *   muzzle         muzzle crown on the bore axis.
 *   sling          front = bar of the lower-band swivel (LEFT side), rear = bar of the butt swivel (LEFT side
 *                  of the butt). sling.build(gravityLocal, slack = 0.12) returns the leather sling; it is NOT
 *                  part of `object`.
 *   restPoints     [belly of the butt, underside of the fore-end between the bands] (true surface points).
 *   sockets        'triggerFace' (+Z = finger push direction), 'boltKnob' (knob centre, right side),
 *                  'safety' (rear face of the safety knob), 'frontSight' (blade tip), 'rearSight' (aperture),
 *                  'bayonetLug' (front of the lug), 'muzzle'.
 *
 * Authoring frame ("R-frame", see type99-rifle/dims.ts): z = 0 at the bolt face, y = 0 on the bore; the
 * model is shifted at the end so that the grip centre is the origin.
 * Helpers: type99-rifle/{dims,wood,metal,sling}.ts, common/*.ts.
 */
import { THREE, group } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { Profile, V } from './common/geo';
import type { Box } from './common/sling';
import { jpwMaterials } from './common/materials';
import { RD, STOCK, hgCrown } from './type99-rifle/dims';
import { buildWood } from './type99-rifle/wood';
import { buildMetal, SWIVELS, swivelBar } from './type99-rifle/metal';
import { buildT99Sling } from './type99-rifle/sling';

export interface Type99RifleOptions {
  dustCover?: boolean;
  detail?: 'high' | 'low';
}

const gripCentreR = () => {
  const s = STOCK.at(RD.gripZ);
  return V(0, (s.yTop + s.yBot) / 2, RD.gripZ);
};

/** Key lengths; ORIGIN_R = grip centre (weapon-local origin) in the design frame. */
export const TYPE99_RIFLE = {
  length: RD.length,
  barrel: RD.barrel,
  lengthOfPull: RD.triggerZ - RD.buttZ,
  ORIGIN_R: gripCentreR(),
};

const L = (p: THREE.Vector3) => p.clone().sub(TYPE99_RIFLE.ORIGIN_R);

/** Weapon-local cross-sections ([x, y] m) at the two rest points: [butt belly, fore-end]. */
export function type99RifleRestContours(): [number, number][][] {
  const oy = TYPE99_RIFLE.ORIGIN_R.y;
  return [
    Profile.ring(STOCK.at(RD.rearRestZ), 72).map(([x, y]) => [x, y - oy] as [number, number]),
    Profile.ring(STOCK.at(RD.frontRestZ), 72).map(([x, y]) => [x, y - oy] as [number, number]),
  ];
}

/** Sling in weapon-local space; extra boxes (weapon-local) are pushed round along `push` (default +X). */
export function buildType99SlingLocal(gravityLocal: THREE.Vector3, slack = 0.12, extra: Box[] = [], push = V(1, 0, 0)): THREE.Object3D {
  const o = TYPE99_RIFLE.ORIGIN_R;
  const ex = extra.map((b) => ({ min: [b.min[0] + o.x, b.min[1] + o.y, b.min[2] + o.z], max: [b.max[0] + o.x, b.max[1] + o.y, b.max[2] + o.z] }) as Box);
  const s = buildT99Sling(jpwMaterials(), gravityLocal.clone().normalize(), slack, { extra: ex, push });
  return group([s], { p: [-o.x, -o.y, -o.z], name: 'type99-rifle-sling' });
}

export function buildType99Rifle(opts: Type99RifleOptions = {}): WeaponModel {
  const hi = (opts.detail ?? 'high') === 'high';
  const m = jpwMaterials();
  const gc = TYPE99_RIFLE.ORIGIN_R;
  const inner = group([...buildWood(m, hi), ...buildMetal(m, { dustCover: opts.dustCover !== false, hi })], { p: [-gc.x, -gc.y, -gc.z], name: 'type99-rifle-parts' });
  const object = group([inner], { name: 'jp-type99-rifle' });

  // ---- grips
  const up = (24 * Math.PI) / 180;
  const tAxis = V(0, Math.sin(up), Math.cos(up));
  const tPalm = V(-1, 0.1, 0);
  tPalm.addScaledVector(tAxis, -tPalm.dot(tAxis)).normalize();
  const trigger: Grip = { position: V(0, 0, 0), axis: tAxis, palm: tPalm, radius: 0.019, length: 0.07 };
  const zs = RD.supportZ;
  const sy = (hgCrown(zs) + STOCK.at(zs).yBot) / 2;
  const support: Grip = { position: L(V(0, sy, zs)), axis: V(0, 0, 1), palm: V(0.25, -1, 0).normalize(), radius: 0.021, length: 0.1 };

  const bs = STOCK.at(STOCK.z0);
  const shoulder = L(V(0, (bs.yTop + bs.yBot) / 2, RD.buttZ));
  const rear = V(0, STOCK.at(RD.rearRestZ).yBot, RD.rearRestZ);
  const front = V(0, STOCK.at(RD.frontRestZ).yBot, RD.frontRestZ);
  const kdir = V(-1, -0.2, -0.04).normalize();
  const knob = V(-RD.boltR + 0.001, -0.0005, RD.handleZ).addScaledVector(kdir, 0.058);

  const T = (p: THREE.Vector3) => new THREE.Matrix4().makeTranslation(...L(p).toArray());
  const sockets: Record<string, THREE.Matrix4> = {
    triggerFace: T(V(0, -0.074, RD.triggerZ)),
    boltKnob: T(knob),
    safety: T(V(0, 0, RD.safetyZ0 - 0.002)),
    frontSight: T(V(0, RD.sightY, RD.frontSightZ)),
    rearSight: T(V(0, 0.0222, RD.rsBase0 + 0.013)),
    bayonetLug: T(V(0, -0.025, RD.capFront + 0.024)),
    muzzle: T(V(0, 0, RD.muzzleZ)),
  };

  return {
    id: 'jp-type99-rifle',
    object,
    grips: { trigger, support },
    shoulder,
    muzzle: L(V(0, 0, RD.muzzleZ)),
    sling: {
      front: L(swivelBar(SWIVELS.front)),
      rear: L(swivelBar(SWIVELS.rear)),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = buildT99Sling(m, gravityLocal.clone().normalize(), slack);
        return group([s], { p: [-gc.x, -gc.y, -gc.z], name: 'type99-rifle-sling' });
      },
    },
    length: RD.length,
    restPoints: [L(rear), L(front)],
    sockets,
  };
}
