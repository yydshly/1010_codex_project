/**
 * Type 99 light machine gun (7.7x58mm Arisaka, 30-round curved box magazine on top) - shared weapon model.
 * Depicts an early-production gun: blued steel, wooden butt with the steel butt plate and the folding
 * monopod (shown folded), wooden grooved pistol grip, rectangular receiver with the magazine well on top
 * and the cocking handle on the right, barrel-lock nut, finned rear half of the barrel with the folding
 * carrying handle (folded to the right), conical flash hider, gas cylinder and gas block with regulator and
 * bayonet lug, folding bipod, open sights offset to the LEFT of the magazine, canvas sling on left-side
 * swivels. No markings are depicted.
 *
 * STABLE EXPORT (used by the standalone catalog entry and by Japanese soldier builders, e.g. an LMG gunner):
 *
 *   import { buildType99Lmg } from '../japan/weapons/type99-lmg.model';   // path relative to yours
 *   const lmg = buildType99Lmg({ bipod: 'folded' });                       // -> WeaponModel
 *
 *   Type99LmgOptions
 *     bipod:    'folded' (default) | 'deployed'   legs swung back under the barrel / legs down and splayed
 *     magazine: boolean (default true)            30-round magazine on top
 *     detail:   'high' (default) | 'low'          fewer segments, no graduations
 *
 *   Also exported: TYPE99_LMG (key lengths, ORIGIN_L = grip centre in the design frame, stancePitch),
 *   type99LmgStandRest(w) (rest points + cross-sections for the shared stand), type99LmgOnBipod(w, sling)
 *   (the gun set down on its bipod feet and butt toe, y = 0), buildType99LmgSlingLocal(...).
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, gun's left side +X.
 * ORIGIN = trigger-hand grip centre: on the (18 deg raked) pistol-grip axis, 45 mm below the top of the
 * grip (~0.105 m below the bore). Real scale (m): overall 1.181, barrel 0.550; the butt plate is ~0.35 m
 * behind the origin and the flash-hider face ~0.83 m ahead of it.
 *
 *   grips.trigger  pistol grip: axis up the grip (leaning forward), palm on the right-rear (-X / -Z),
 *                  radius 17 mm, length 90 mm.
 *   grips.support  bipod folded (default): the folded legs and the gas cylinder under the finned barrel,
 *                  about 0.2 m ahead of the receiver (standing / assault hold): axis +Z, palm under,
 *                  radius 24 mm, length 80 mm.
 *                  bipod deployed: the small of the butt (the prone gunner's left hand), axis +Z, palm under,
 *                  radius 22 mm.
 *                  Sockets: 'carryingHandle' (wooden grip of the handle, +Z along it), 'buttHold'.
 *   shoulder       centre of the butt plate.
 *   muzzle         face of the flash hider on the bore axis.
 *   sling          front = bar of the swivel on the lower left of the barrel-lock nut, rear = bar of the butt
 *                  swivel (left side). sling.build(gravityLocal, slack = 0.12) returns the canvas sling; it
 *                  is NOT part of `object`.
 *   restPoints     [belly of the butt, underside of the gas block] (true surface points).
 *   sockets        'trigger', 'cockingHandle', 'magazine' (top of the magazine well, +Y up), 'rearSight'
 *                  (aperture), 'frontSight' (blade tip), 'bipodPivot', 'carryingHandle', 'buttHold'.
 *
 * Authoring frame ("L-frame", type99-lmg/dims.ts): z = 0 at the rear of the butt plate, y = 0 on the bore;
 * shifted at the end so that the grip centre is the origin. Helpers: type99-lmg/{dims,parts,bipod,sling}.ts.
 */
import { THREE, group } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { V, Profile, type V2 } from './common/geo';
import type { Box } from './common/sling';
import { jpwMaterials } from './common/materials';
import { LD, BUTT } from './type99-lmg/dims';
import { buildParts, gripFrame, gasBlockOutline, LSWIVELS, lSwivelBar } from './type99-lmg/parts';
import { buildBipod, legPivot, legDir, stancePitch, type LmgBipod } from './type99-lmg/bipod';
import { buildLmgSling } from './type99-lmg/sling';

export type { LmgBipod };

export interface Type99LmgOptions {
  bipod?: LmgBipod;
  magazine?: boolean;
  detail?: 'high' | 'low';
}

const originL = () => gripFrame().top.clone().addScaledVector(gripFrame().down, 0.045);

export const TYPE99_LMG = {
  length: LD.length,
  barrel: LD.barrel,
  ORIGIN_L: originL(),
  /** nose-up pitch (rad) at which the deployed feet and the butt toe share one ground plane */
  stancePitch: stancePitch(),
};

const L = (p: THREE.Vector3) => p.clone().sub(TYPE99_LMG.ORIGIN_L);

export function buildType99LmgSlingLocal(gravityLocal: THREE.Vector3, slack = 0.12, extra: Box[] = [], push = V(1, 0, 0), bipod: LmgBipod = 'folded', magazine = true): THREE.Object3D {
  const o = TYPE99_LMG.ORIGIN_L;
  const ex = extra.map((b) => ({ min: [b.min[0] + o.x, b.min[1] + o.y, b.min[2] + o.z], max: [b.max[0] + o.x, b.max[1] + o.y, b.max[2] + o.z] }) as Box);
  const s = buildLmgSling(jpwMaterials(), gravityLocal.clone().normalize(), slack, { extra: ex, push, bipod, magazine });
  return group([s], { p: [-o.x, -o.y, -o.z], name: 'type99-lmg-sling' });
}

export function buildType99Lmg(opts: Type99LmgOptions = {}): WeaponModel {
  const hi = (opts.detail ?? 'high') === 'high';
  const bipod: LmgBipod = opts.bipod ?? 'folded';
  const withMag = opts.magazine !== false;
  const m = jpwMaterials();
  const gc = TYPE99_LMG.ORIGIN_L;
  const inner = group([...buildParts(m, withMag, hi), ...buildBipod(m, bipod, hi)], { p: [-gc.x, -gc.y, -gc.z], name: 'type99-lmg-parts' });
  const object = group([inner], { name: bipod === 'deployed' ? 'jp-type99-lmg-bipod' : 'jp-type99-lmg' });

  // ---- grips
  const gf = gripFrame();
  const up = gf.down.clone().negate();
  const back = gf.fwd.clone().negate();
  const tPalm = V(-0.8, 0, 0).addScaledVector(back, 0.6);
  tPalm.addScaledVector(up, -tPalm.dot(up)).normalize();
  const trigger: Grip = { position: V(0, 0, 0), axis: up, palm: tPalm, radius: 0.017, length: 0.09 };
  let support: Grip;
  if (bipod === 'folded') {
    const zs = 0.79;
    const lp = legPivot(1), d = legDir('folded', 1);
    const legY = lp.y + d.y * ((zs - lp.z) / d.z);
    const yc = (legY - 0.0062 + (-0.0212)) / 2;
    support = { position: L(V(0, yc, zs)), axis: V(0, 0, 1), palm: V(0.25, -1, 0).normalize(), radius: 0.024, length: 0.08 };
  } else {
    const zs = 0.2;
    const s = BUTT.at(zs);
    support = { position: L(V(0, (s.yTop + s.yBot) / 2, zs)), axis: V(0, 0, 1), palm: V(0.2, -1, 0).normalize(), radius: 0.022, length: 0.07 };
  }

  const T = (p: THREE.Vector3, q?: THREE.Quaternion) => new THREE.Matrix4().compose(L(p), q ?? new THREE.Quaternion(), V(1, 1, 1));
  const s0 = BUTT.at(LD.plateZ);
  const bs = BUTT.at(0.2);
  const sockets: Record<string, THREE.Matrix4> = {
    trigger: T(V(0, LD.thBot - 0.01, LD.triggerZ + 0.002)),
    cockingHandle: T(V(-LD.rcvHW - 0.03, -0.006, 0.582)),
    magazine: T(V(0, LD.rcvTop + 0.01, (LD.wellZ0 + LD.wellZ1) / 2)),
    rearSight: T(V(LD.sightX, LD.sightY, LD.rearSightZ)),
    frontSight: T(V(LD.sightX, LD.sightY, LD.frontSightZ)),
    bipodPivot: T(V(0, LD.bipodY - 0.006, LD.bipodZ)),
    carryingHandle: T(V(-0.036, 0.004, LD.handleZ + 0.069)),
    buttHold: T(V(0, (bs.yTop + bs.yBot) / 2, 0.2)),
  };

  return {
    id: 'jp-type99-lmg',
    object,
    grips: { trigger, support },
    shoulder: L(V(0, (s0.yTop + s0.yBot) / 2, 0)),
    muzzle: L(V(0, 0, LD.fhZ1)),
    sling: {
      front: L(lSwivelBar(LSWIVELS.front)),
      rear: L(lSwivelBar(LSWIVELS.rear)),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = buildLmgSling(m, gravityLocal.clone().normalize(), slack, { bipod, magazine: withMag });
        return group([s], { p: [-gc.x, -gc.y, -gc.z], name: 'type99-lmg-sling' });
      },
    },
    length: LD.length,
    restPoints: [L(V(0, BUTT.at(LD.rearRestZ).yBot, LD.rearRestZ)), L(V(0, LD.gasY - 0.0118, LD.frontRestZ))],
    sockets,
  };
}

/** Rest points for the shared stand, with weapon-local cross-sections (for felt contact). */
export function type99LmgStandRest(w: WeaponModel): { p: THREE.Vector3; contour: V2[] }[] {
  const [rear, front] = [...w.restPoints].sort((a, b) => a.z - b.z);
  const oy = TYPE99_LMG.ORIGIN_L.y;
  const rc = Profile.ring(BUTT.at(LD.rearRestZ), 72).map(([x, y]) => [x, y - oy] as V2);
  const fc = gasBlockOutline().map(([x, y]) => [x, y - oy] as V2);
  return [
    { p: rear, contour: rc },
    { p: front, contour: fc },
  ];
}

/**
 * The gun set down on its deployed bipod feet and the toe of the butt (pitched nose-up so both touch
 * y = 0); footprint centred on the origin. `w` must have been built with bipod 'deployed'.
 */
export function type99LmgOnBipod(w: WeaponModel, sling: boolean, slack = 0.04): THREE.Group {
  const holder = new THREE.Group();
  holder.rotation.x = -TYPE99_LMG.stancePitch;
  holder.add(w.object.clone(true));
  if (sling && w.sling) {
    const gLocal = V(0, -1, 0).applyQuaternion(holder.quaternion.clone().invert());
    holder.add(w.sling.build(gLocal, slack));
  }
  holder.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(holder, true);
  const c = b.getCenter(V());
  holder.position.set(-c.x, -b.min.y, -c.z);
  return group([holder]);
}
