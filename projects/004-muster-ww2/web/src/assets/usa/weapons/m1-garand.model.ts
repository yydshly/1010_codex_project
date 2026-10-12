/**
 * U.S. Rifle, Caliber .30, M1 (M1 Garand) - shared weapon model. Gas-operated semi-automatic rifle,
 * .30-06, fed by an 8-round en-bloc clip. Depicts a WWII-production rifle: gas-port (spline-type) gas
 * cylinder, walnut stock and handguards, Parkerized metal, M1907 leather sling.
 *
 * STABLE EXPORT (used by the standalone catalog entry and by US soldier builders):
 *
 *   import { buildM1Garand } from '../usa/weapons/m1-garand.model';   // path relative to your module
 *   const m1 = buildM1Garand();                                          // -> WeaponModel (shared/contracts.ts)
 *
 *   M1GarandOptions
 *     detail: 'high' (default) | 'low'     'low' drops the finest detail (knob knurling, graduations)
 *
 *   Also exported: M1_GARAND (key lengths + ORIGIN_G = grip centre in the design frame),
 *   m1GarandRestContours() (weapon-local cross-sections at the rest points, for the display cradles),
 *   buildM1GarandSlingLocal(gravityLocal, slack, extraBoxes?) (the sling in weapon-local space with
 *   extra obstacle boxes, e.g. display cradles).
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, rifle's left side +X.
 * ORIGIN = trigger-hand grip centre: middle of the semi-pistol grip, 61 mm behind the trigger face and
 * 49 mm below the bore axis. Real scale (m): overall 1.107, barrel 0.610, length of pull 0.330.
 *
 *   grips.trigger  semi-pistol grip of the stock: axis forward and 33 deg up along the grip, palm on the
 *                  right side (-X), radius 21 mm, length 75 mm.
 *   grips.support  fore-end (stock + rear handguard) 200 mm ahead of the breech, just behind the lower
 *                  band area where the left hand holds the rifle: axis +Z, palm under (slightly left),
 *                  radius 22 mm, length 100 mm.
 *   shoulder       centre of the butt plate.
 *   muzzle         muzzle crown on the bore axis.
 *   sling          front = bar of the stock-ferrule swivel (under the front end of the stock), rear = bar
 *                  of the butt swivel (belly of the butt). sling.build(gravityLocal, slack = 0.12) returns
 *                  the M1907 leather sling hanging under the rifle; it is NOT part of `object`.
 *   restPoints     [belly of the butt behind the butt swivel, underside of the front handguard] (true
 *                  surface points, both outside the sling's span).
 *   sockets        'triggerFace' (+Z = finger push direction), 'opRodHandle', 'frontSight' (blade tip),
 *                  'rearSight' (aperture), 'bayonetLug' (front of the lug), 'clipLatch'.
 *
 * Authoring frame ("G-frame", see m1-garand/dims.ts): z = 0 at the bolt face, y = 0 on the bore; the
 * model is shifted at the end so that the grip centre is the origin.
 * Helpers: m1-garand/{dims,wood,metal,sling,materials}.ts, common/*.ts.
 */
import { THREE, group } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { Profile, V } from './common/geo';
import type { Box } from './common/sling';
import { GD, STOCK, FHG, RHG } from './m1-garand/dims';
import { buildWood } from './m1-garand/wood';
import { buildMetal, buildRearSight, SWIVELS, swivelBar } from './m1-garand/metal';
import { buildGarandSling } from './m1-garand/sling';
import { garandMaterials } from './m1-garand/materials';

export interface M1GarandOptions {
  detail?: 'high' | 'low';
}

const gripCentreG = () => {
  const s = STOCK.at(GD.gripZ);
  return V(0, (s.yTop + s.yBot) / 2 + 0.0004, GD.gripZ);
};

/** Grip centre (weapon-local origin) in the design frame. */
export const M1_GARAND = {
  length: GD.length,
  barrel: GD.barrel,
  lengthOfPull: GD.triggerZ - GD.buttZ,
  ORIGIN_G: gripCentreG(),
};

const L = (p: THREE.Vector3) => p.clone().sub(M1_GARAND.ORIGIN_G);

/** Weapon-local cross-sections ([x, y] m) at the two rest points: [butt belly, front handguard]. */
export function m1GarandRestContours(): [number, number][][] {
  const oy = M1_GARAND.ORIGIN_G.y;
  const a = Profile.ring(STOCK.at(GD.rearRestZ), 72).map(([x, y]) => [x, y - oy] as [number, number]);
  const b = Profile.ring(FHG.at(GD.frontRestZ), 72).map(([x, y]) => [x, y - oy] as [number, number]);
  return [a, b];
}

/** Sling in weapon-local space; extra boxes (weapon-local) are pushed round along +X. */
export function buildM1GarandSlingLocal(gravityLocal: THREE.Vector3, slack = 0.12, extra: Box[] = []): THREE.Object3D {
  const o = M1_GARAND.ORIGIN_G;
  const ex = extra.map((b) => ({ min: [b.min[0] + o.x, b.min[1] + o.y, b.min[2] + o.z], max: [b.max[0] + o.x, b.max[1] + o.y, b.max[2] + o.z] }) as Box);
  const s = buildGarandSling(garandMaterials(), gravityLocal.clone().normalize(), slack, ex.length ? { extra: ex, push: V(1, 0, 0) } : {});
  return group([s], { p: [-o.x, -o.y, -o.z], name: 'm1-garand-sling' });
}

export function buildM1Garand(opts: M1GarandOptions = {}): WeaponModel {
  const detail = opts.detail ?? 'high';
  const m = garandMaterials();
  const gc = M1_GARAND.ORIGIN_G;

  const gGroup = group([...buildWood(m), ...buildMetal(m, detail), buildRearSight(m, detail)]);
  const root = group([gGroup], { p: [-gc.x, -gc.y, -gc.z], name: 'm1-garand-body' });
  const object = group([root]);
  object.name = 'm1-garand';

  // ---- grips
  const up = (33 * Math.PI) / 180;
  const tAxis = V(0, Math.sin(up), Math.cos(up));
  const tPalm = V(-1, 0.1, 0);
  tPalm.addScaledVector(tAxis, -tPalm.dot(tAxis)).normalize();
  const trigger: Grip = { position: V(0, 0, 0), axis: tAxis, palm: tPalm, radius: 0.021, length: 0.075 };
  const zs = GD.supportZ;
  const sy = (RHG.crown(zs) + STOCK.at(zs).yBot) / 2;
  const support: Grip = { position: L(V(0, sy, zs)), axis: V(0, 0, 1), palm: V(0.25, -1, 0).normalize(), radius: 0.022, length: 0.1 };

  const bs = STOCK.at(STOCK.z0);
  const shoulder = L(V(0, (bs.yTop + bs.yBot) / 2, GD.buttZ - 0.0005));
  const rear = V(0, STOCK.at(GD.rearRestZ).yBot, GD.rearRestZ);
  const front = V(0, FHG.at(GD.frontRestZ).yBot, GD.frontRestZ);

  const T = (p: THREE.Vector3) => new THREE.Matrix4().makeTranslation(...L(p).toArray());
  const sockets: Record<string, THREE.Matrix4> = {
    triggerFace: T(V(0, -0.075, GD.triggerZ)),
    opRodHandle: T(V(-0.0364, 0.0016, 0.013)),
    frontSight: T(V(0, 0.0265, GD.frontSightZ)),
    rearSight: T(V(0, GD.sightY, GD.apertureZ)),
    bayonetLug: T(V(0, -0.03, 0.5155)),
    clipLatch: T(V(GD.rcvHW + 0.0028, -0.0032, GD.heelFront + 0.0055)),
  };

  return {
    id: 'us-m1-garand',
    object,
    grips: { trigger, support },
    shoulder,
    muzzle: L(V(0, 0, GD.muzzleZ)),
    sling: {
      front: L(swivelBar(SWIVELS.front)),
      rear: L(swivelBar(SWIVELS.rear)),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = buildGarandSling(m, gravityLocal.clone().normalize(), slack);
        return group([s], { p: [-gc.x, -gc.y, -gc.z], name: 'm1-garand-sling' });
      },
    },
    length: GD.length,
    restPoints: [L(rear), L(front)],
    sockets,
  };
}
