/**
 * Bren Mk II light machine gun (.303 British, 30-round curved box magazine on top) - shared weapon
 * model. Depicts the simplified wartime Mk II: milled body with the leaf backsight and the foresight
 * offset to the LEFT of the magazine, fixed (non-folding) cocking handle on the right, pistol grip and
 * trigger guard with the change lever on the left, simplified walnut "slab" butt with the bent steel butt
 * plate (no butt strap, no rear grip / monopod), sling loop on the right of the butt, barrel with the
 * carrying handle (folded to the rear), gas block with the regulator and the gas cylinder below the
 * barrel, bipod sleeve with fixed-length legs, plain conical flash hider; black-finished steel.
 *
 * STABLE EXPORT (used by the standalone catalog entry and by soldier builders, e.g. the Bren Gunner):
 *
 *   import { buildBrenMk2 } from '../uk/weapons/bren-mk2.model';   // path relative to your module
 *   const lmg = buildBrenMk2({ bipod: 'folded' });                  // -> WeaponModel (shared/contracts.ts)
 *
 *   BrenMk2Options
 *     bipod:    'folded' (default) | 'deployed'   legs swung back under the gas cylinder / spread
 *     magazine: boolean (default true)            30-round magazine on top
 *     detail:   'high' (default) | 'low'          fewer segments
 *
 *   Also exported: BREN (key lengths + origin), brenStandRest(w) (rest points + cross-sections for the
 *   shared weaponStand()), brenOnBipod(w, sling) (gun set down on its bipod and butt toe, y = 0),
 *   BREN_ORIGIN_B (grip centre in the design frame), BREN_STANCE_PITCH (rad, nose-up on the bipod).
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, gun's left side +X.
 * ORIGIN = trigger-hand grip centre: on the (4 deg raked) pistol-grip axis, 40 mm below the top of the
 * grip, 108 mm below the bore. Real scale (m): overall 1.156, barrel 0.635; the muzzle is 0.842 m ahead of
 * the origin and the butt plate 0.314 m behind it.
 *
 *   grips.trigger  pistol grip: axis up the grip (slightly forward), palm on the right-rear (-X / -Z),
 *                  radius 20 mm, length 90 mm.
 *   grips.support  bipod folded (default): the folded legs and the gas-cylinder casing just ahead of the
 *                  body (hip / assault hold, left hand round the legs), axis +Z, palm under, radius 31 mm.
 *                  bipod deployed: the small of the butt (the prone hold, left hand under the wrist),
 *                  axis +Z, palm under, radius 20 mm.
 *                  Socket 'carryingHandle' gives the walnut carrying-handle grip (axis along the grip).
 *   shoulder       centre of the butt plate.
 *   muzzle         face of the flash hider on the bore axis.
 *   sling          front = cross-bar of the bipod sleeve, rear = bar of the sling loop on the right of the
 *                  butt. sling.build(gravityLocal, slack = 0.12) returns the web sling (brass hook, keeper,
 *                  claw tip); it is NOT part of `object`.
 *   restPoints     [underside of the steel shoe at the small of the butt, underside of the gas block]
 *                  (true surface points; the gun lies almost level on the shared stand).
 *   sockets        'trigger' (trigger face), 'cockingHandle' (knob centre), 'magazine' (magazine centre),
 *                  'carryingHandle' (handle grip centre; +Z = grip axis towards its end, +Y = up),
 *                  'buttHold' (small of the butt), 'bipodPivot', 'rearSight' (aperture), 'frontSight'
 *                  (blade tip), 'changeLever'.
 *
 * Authoring frame ("B-frame", bren-mk2/dims.ts): z = 0 at the rear of the butt plate, y = 0 on the bore;
 * the model is shifted at the end so that the grip centre is the origin.
 */
import { THREE, group } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { V, secRingOffset, circle2D, type V2 } from './common/geo';
import { BR, buttSec, gripCentre, magCentre } from './bren-mk2/dims';
import { buildButt, buttLoopBar } from './bren-mk2/butt';
import { buildBody, gripFrame } from './bren-mk2/body';
import { buildBarrel, HANDLE, CROSS_BAR } from './bren-mk2/barrel';
import { buildMagazine } from './bren-mk2/magazine';
import { buildBipodLegs, legPivot, footPoint, BREN_STANCE_PITCH, type BipodState } from './bren-mk2/bipod';
import { buildBrenSling } from './bren-mk2/sling';
import { brenMaterials } from './bren-mk2/materials';

export { BREN_STANCE_PITCH };

export interface BrenMk2Options {
  bipod?: BipodState;
  magazine?: boolean;
  detail?: 'high' | 'low';
}

/** Grip centre (weapon-local origin) in the B-frame. */
export const BREN_ORIGIN_B = V(...gripCentre());

export const BREN = {
  length: BR.length,
  barrel: 0.635,
  origin: BREN_ORIGIN_B,
  /** Stand rest stations (B-frame z). */
  rearRestZ: 0.212,
  frontRestZ: 0.888,
};

export function buildBrenMk2(opts: BrenMk2Options = {}): WeaponModel {
  const hi = (opts.detail ?? 'high') === 'high';
  const bipod: BipodState = opts.bipod ?? 'folded';
  const m = brenMaterials();
  const gc = BREN_ORIGIN_B;
  const L = (p: THREE.Vector3) => p.clone().sub(gc);

  const parts: THREE.Object3D[] = [...buildButt(m, hi), ...buildBody(m, hi), ...buildBarrel(m, hi), ...buildBipodLegs(m, bipod, hi)];
  if (opts.magazine !== false) parts.push(buildMagazine(m, hi));
  const inner = group(parts, { p: [-gc.x, -gc.y, -gc.z], name: 'bren-parts' });
  const object = group([inner], { name: bipod === 'deployed' ? 'bren-mk2-bipod' : 'bren-mk2' });

  // ---- grips
  const gf = gripFrame();
  const up = gf.down.clone().negate();
  const back = gf.fwd.clone().negate();
  const tPalm = V(-0.8, 0, 0).addScaledVector(back, 0.6);
  tPalm.addScaledVector(up, -tPalm.dot(up)).normalize();
  const trigger: Grip = { position: V(0, 0, 0), axis: up, palm: tPalm, radius: 0.02, length: 0.09 };
  let support: Grip;
  if (bipod === 'folded') {
    // folded legs + gas-cylinder casing, 70 mm ahead of the body front
    const zs = 0.648;
    const lp = legPivot(1), fp = footPoint('folded', 1);
    const yLeg = lp.y + ((fp.y - lp.y) * (lp.z - zs)) / (lp.z - fp.z);
    // the bundle of the two legs (x = +-24 mm) and the casing between them: ~64 x 63 mm
    const yc = (BR.frame.top + yLeg - BR.bipod.legR) / 2;
    support = { position: L(V(0, yc, zs)), axis: V(0, 0, 1), palm: V(0.25, -1, 0).normalize(), radius: 0.031, length: 0.08 };
  } else {
    const zs = 0.19;
    const s = buttSec(zs);
    support = { position: L(V(0, (s.yTop + s.yBot) / 2, zs)), axis: V(0, 0, 1), palm: V(0.2, -1, 0).normalize(), radius: 0.02, length: 0.07 };
  }

  // ---- sockets
  const T = (p: THREE.Vector3, q?: THREE.Quaternion) => new THREE.Matrix4().compose(L(p), q ?? new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
  const hd = HANDLE.dir.clone().normalize();
  const hc = V(HANDLE.x, HANDLE.pivot.y + 0.0055, HANDLE.pivot.z).addScaledVector(hd, 0.068);
  const hq = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(1, 0, 0), hd.clone().cross(V(1, 0, 0)).normalize(), hd));
  const mc = magCentre((BR.mag.th0 + BR.mag.th1) / 2);
  const bs = buttSec(0.19);
  const sockets: Record<string, THREE.Matrix4> = {
    trigger: T(V(0, -0.078, BR.triggerZ + 0.002)),
    cockingHandle: T(V(-BR.body.hw - 0.028, (BR.slot.y0 + BR.slot.y1) / 2, BR.handleZ)),
    magazine: T(V(0, mc.y, mc.z)),
    carryingHandle: T(hc, hq),
    buttHold: T(V(0, (bs.yTop + bs.yBot) / 2, 0.19)),
    bipodPivot: T(V(0, BR.bipod.pivotY, BR.bipod.z)),
    rearSight: T(V(BR.sightX, 0.047, BR.rearSightZ)),
    frontSight: T(V(BR.sightX, BR.foreTipY, BR.foreSightZ)),
    changeLever: T(V(BR.trigGroup.hw + 0.003, -0.061, BR.changeLeverZ)),
  };

  const s0 = buttSec(BR.plate + 0.001);
  const shoulder = L(V(0, (s0.yTop + s0.yBot) / 2, 0));
  const rear = V(0, buttSec(BREN.rearRestZ).yBot - 0.0012, BREN.rearRestZ);
  const front = V(0, BR.gasY - 0.0149, BREN.frontRestZ);

  return {
    id: 'uk-bren-mk2',
    object,
    grips: { trigger, support },
    shoulder,
    muzzle: L(V(0, 0, BR.muzzleZ)),
    sling: {
      front: L(CROSS_BAR.c),
      rear: L(buttLoopBar()),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = buildBrenSling(m, gravityLocal.clone().normalize(), slack);
        return group([s], { p: [-gc.x, -gc.y, -gc.z], name: 'bren-sling' });
      },
    },
    length: BR.length,
    restPoints: [L(rear), L(front)],
    sockets,
  };
}

/** Rest points for the shared weaponStand() with weapon-local cross-sections (for felt contact). */
export function brenStandRest(w: WeaponModel): { p: THREE.Vector3; contour: V2[] }[] {
  const [rear, front] = [...w.restPoints].sort((a, b) => a.z - b.z);
  const oy = BREN_ORIGIN_B.y;
  // the steel shoe under the front of the wrist (butt section grown by 1.2 mm, flat-topped)
  const rc = secRingOffset(buttSec(BREN.rearRestZ), 0.0012, 72).map(([x, y]) => [x, y - oy] as V2);
  const fc = circle2D(0, BR.gasY - oy, 0.0149, 32);
  return [
    { p: rear, contour: rc },
    { p: front, contour: fc },
  ];
}

/**
 * The gun set down on its deployed bipod and the toe of the butt: pitched nose-up so that the lowest
 * points of the feet and of the butt touch y = 0; footprint centred on the origin. `w` must have been
 * built with bipod 'deployed'.
 */
export function brenOnBipod(w: WeaponModel, sling: boolean, slack = 0.05): THREE.Group {
  const holder = new THREE.Group();
  holder.rotation.x = -BREN_STANCE_PITCH;
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
