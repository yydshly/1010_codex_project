/**
 * Rifle No. 4 Mk I (.303 British, Lee action, 10-round detachable magazine) - shared weapon model.
 * Depicts a wartime British-made rifle: two-piece beech stock (butt + fore-end) with rear and front
 * handguards, brass butt plate with trap, Mk I aperture backsight (ladder leaf folded down, 300-yard
 * battle aperture up) between protecting ears, protected blade foresight, exposed muzzle with the two
 * bayonet-mounting lugs, black-finished steel, bright bolt with round knob, web sling on the underside.
 *
 * STABLE EXPORT (used by the standalone catalog entry and by soldier builders):
 *
 *   import { buildLeeEnfieldNo4 } from '../uk/weapons/lee-enfield-no4.model';   // path relative to your module
 *   const rifle = buildLeeEnfieldNo4();                                          // -> WeaponModel (shared/contracts.ts)
 *
 *   LeeEnfieldNo4Options
 *     detail:  'high' (default) | 'low'     'low' drops graduations / knurling and uses fewer segments
 *     bayonet: 'none' (default) | 'fixed'   No. 4 Mk II spike bayonet fixed on the muzzle
 *
 *   Also exported: NO4 (key lengths), no4StandRest(w) (felt-corrected rest points for the shared
 *   weaponStand()), NO4_ORIGIN_R (grip centre in the design frame).
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, rifle's left side +X.
 * ORIGIN = trigger-hand grip centre: middle of the wrist of the butt, 97 mm behind the trigger and
 * 50 mm below the bore axis. Real scale (m): overall 1.129, barrel 0.640; the bore lies 50 mm above the
 * origin, the butt plate is 0.264 m behind it and the muzzle 0.868 m ahead of it.
 *
 *   grips.trigger  wrist of the butt (no pistol grip): axis forward and 19 deg up along the wrist, palm
 *                  on the right side (-X, slightly up), radius 22 mm, length 75 mm.
 *   grips.support  fore-end + rear handguard just ahead of the magazine (close to the balance point):
 *                  axis +Z, palm under the fore-end (slightly left), radius 24 mm, length 110 mm.
 *   shoulder       centre of the brass butt plate.
 *   muzzle         muzzle crown on the bore axis (bayonet point when fixed: socket 'bayonetPoint').
 *   sling          front = bar of the swivel under the lower band, rear = bar of the butt swivel (both on
 *                  the underside). sling.build(gravityLocal, slack = 0.12) returns the web sling with its
 *                  brass claw tips and keepers; it is NOT part of `object`.
 *   restPoints     [bottom of the butt behind the butt swivel, bottom of the upper band's screw lug]
 *                  (true surface points; the sling hangs between them). no4StandRest() gives the
 *                  felt-corrected pair with their cross-sections for the shared stand.
 *   sockets        'trigger' (trigger face, +Z forward), 'boltKnob', 'magazine' (magazine centre),
 *                  'frontSight' (blade tip), 'rearSight' (battle aperture), 'bayonetLug', 'bayonetPoint'
 *                  (only with the bayonet fixed).
 *
 * Authoring frame ("R-frame", lee-enfield-no4/stock.ts): z = 0 at the breech face, y = 0 on the bore;
 * the model is shifted at the end so that the grip centre is the origin.
 */
import { THREE, group } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { ukwMaterials } from './common/materials';
import { V, secRing, type V2 } from './common/geo';
import { R, buttSec, foreSec, buildStock, buildButtFittings, foreEndRing, buttSwivel } from './lee-enfield-no4/stock';
import { buildMetal, bandSwivel, RM, NO4_LENGTH } from './lee-enfield-no4/metal';
import { buildNo4Sling } from './lee-enfield-no4/sling';
import { buildNo4Bayonet, NO4_BAYONET } from './lee-enfield-no4/bayonet';

export interface LeeEnfieldNo4Options {
  detail?: 'high' | 'low';
  bayonet?: 'none' | 'fixed';
}

const gripCentre = () => {
  const s = buttSec(R.gripZ);
  return V(0, (s.yTop + s.yBot) / 2, R.gripZ);
};

/** Grip centre (weapon-local origin) in the R-frame. */
export const NO4_ORIGIN_R = gripCentre();

export const NO4 = {
  length: NO4_LENGTH,
  barrel: 0.64,
  /** R-frame point -> weapon-local: subtract NO4_ORIGIN_R. */
  origin: NO4_ORIGIN_R,
};

export function buildLeeEnfieldNo4(opts: LeeEnfieldNo4Options = {}): WeaponModel {
  const hi = (opts.detail ?? 'high') === 'high';
  const fixed = opts.bayonet === 'fixed';
  const m = ukwMaterials();
  const gc = NO4_ORIGIN_R;
  const L = (p: THREE.Vector3) => p.clone().sub(gc);

  const parts: THREE.Object3D[] = [...buildStock(m, hi), ...buildButtFittings(m, hi), ...buildMetal(m, hi)];
  if (fixed) parts.push(buildNo4Bayonet(m, hi));
  const inner = group(parts, { p: [-gc.x, -gc.y, -gc.z], name: 'no4-parts' });
  const object = group([inner], { name: fixed ? 'no4-bayonet' : 'no4' });

  // grips
  const up = (19 * Math.PI) / 180;
  const tAxis = V(0, Math.sin(up), Math.cos(up));
  const tPalm = V(-1, 0.12, 0);
  tPalm.addScaledVector(tAxis, -tPalm.dot(tAxis)).normalize();
  const trigger: Grip = { position: V(0, 0, 0), axis: tAxis, palm: tPalm, radius: 0.022, length: 0.075 };
  const fz = R.supportZ;
  const fsec = foreSec(fz);
  const hgTop = foreEndRing(fz, 0).reduce((mx, p) => Math.max(mx, p[1]), -1);
  const support: Grip = {
    position: L(V(0, (hgTop + fsec.yBot) / 2, fz)),
    axis: V(0, 0, 1),
    palm: V(0.3, -1, 0).normalize(),
    radius: 0.024,
    length: 0.11,
  };

  const bs = buttSec(R.buttZ);
  const shoulder = L(V(0, (bs.yTop + bs.yBot) / 2, R.buttZ - 0.0026));
  const fs = bandSwivel(), rs = buttSwivel();
  const rear = V(0, buttSec(R.rearRestZ).yBot, R.rearRestZ);
  const front = V(0, upperBandLugBottom(), R.frontRestZ);

  const T = (p: THREE.Vector3) => new THREE.Matrix4().makeTranslation(...L(p).toArray());
  const sockets: Record<string, THREE.Matrix4> = {
    trigger: T(V(0, -0.065, R.triggerZ + 0.001)),
    boltKnob: T(RM.knob),
    magazine: T(V(0, -0.075, (RM.magRear + RM.magFront) / 2)),
    frontSight: T(V(0, RM.fsBladeTop, 0.594)),
    rearSight: T(V(0, RM.apertureY, RM.apertureZ)),
    bayonetLug: T(V(0, 0, 0.6215)),
  };
  if (fixed) sockets.bayonetPoint = T(V(0, 0, NO4_BAYONET.pointZ));

  return {
    id: 'uk-lee-enfield-no4',
    object,
    grips: { trigger, support },
    shoulder,
    muzzle: L(V(0, 0, R.muzzleZ)),
    sling: {
      front: L(fs.bar),
      rear: L(rs.bar),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = buildNo4Sling(m, gravityLocal.clone().normalize(), slack);
        return group([s], { p: [-gc.x, -gc.y, -gc.z], name: 'no4-sling' });
      },
    },
    length: fixed ? NO4_BAYONET.pointZ - (R.buttZ - 0.0026) : NO4_LENGTH,
    restPoints: [L(rear), L(front)],
    sockets,
  };
}

/** Lowest point of the upper band's screw lug (R-frame y). */
function upperBandLugBottom(): number {
  return foreSec(R.upperBandRear + 0.004).yBot - 0.0016 - 0.0024 - 0.0031;
}

/**
 * Rest points for the shared weaponStand() with their weapon-local cross-sections (for felt contact):
 * the butt behind the butt swivel and the upper band (with its screw lug).
 */
export function no4StandRest(w: WeaponModel): { p: THREE.Vector3; contour: V2[] }[] {
  const [rear, front] = [...w.restPoints].sort((a, b) => a.z - b.z);
  const oy = NO4_ORIGIN_R.y;
  const rc = secRing(buttSec(R.rearRestZ), 72).map(([x, y]) => [x, y - oy] as V2);
  // upper band with its screw lug underneath (lug bottom replaces the band outline where |x| < 4 mm)
  const lugY = upperBandLugBottom();
  const fc = foreEndRing(R.upperBandRear + 0.004, 0.0016, 72).map(([x, y]) => [x, (Math.abs(x) < 0.0041 ? Math.min(y, lugY) : y) - oy] as V2);
  return [
    { p: rear, contour: rc },
    { p: front, contour: fc },
  ];
}
