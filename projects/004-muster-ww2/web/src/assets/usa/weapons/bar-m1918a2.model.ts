/**
 * Browning Automatic Rifle, Caliber .30, M1918A2 - shared weapon model. Gas-operated, air-cooled,
 * magazine-fed automatic rifle, .30-06, 20-round box magazine, automatic fire only at two selectable
 * rates (change lever S / F / A). Depicts a WWII (1943-44) rifle: walnut butt stock and hand guard,
 * Parkerized metal, hinged butt plate with the shoulder rest folded, skid-footed bipod on the flash
 * hider, cotton web sling. No carrying handle (a late-war addition) and no butt monopod (dropped from
 * production in 1942 and usually discarded).
 *
 * STABLE EXPORT (used by the standalone catalog entry and by US soldier builders, e.g. the BAR gunner):
 *
 *   import { buildBarM1918A2 } from '../usa/weapons/bar-m1918a2.model';   // path relative to yours
 *   const bar = buildBarM1918A2({ bipod: 'folded' });                     // -> WeaponModel
 *
 *   BarM1918A2Options
 *     bipod:    'folded' (default) | 'deployed' | 'none'   legs swung back along the gas cylinder / legs
 *               down on the skid feet / bipod removed (common in the field; the flash hider stays)
 *     magazine: boolean (default true)                     20-round magazine fitted
 *     detail:   'high' (default) | 'low'                   'low' drops knurling, letters, graduations
 *     groundPitch: radians (deployed only)                 nose-up pitch the skid feet are laid flat for;
 *               default BAR_M1918A2.bipodPitch (feet and butt toe on one ground plane)
 *
 *   Also exported: BAR_M1918A2 (key lengths, ORIGIN_B = grip centre in the design frame, bipodPitch),
 *   barRestContours() (weapon-local cross-sections at the rest points, for the display cradles),
 *   buildBarSlingLocal(gravityLocal, slack, extraBoxes?, push?, bipod?, magazine?) (the sling in
 *   weapon-local space with extra obstacle boxes, e.g. display cradles).
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, gun's left side +X.
 * ORIGIN = trigger-hand grip centre: middle of the semi-pistol-grip wrist of the butt stock, 104 mm
 * behind the trigger face and 54 mm below the bore axis. Real scale (m): overall 1.215, barrel 0.610,
 * butt plate 0.274 behind the origin, flash hider face 0.941 ahead of it.
 *
 *   grips.trigger  wrist / semi-pistol grip: axis forward and 38 deg up along the grip, palm on the right
 *                  side (-X), radius 21 mm, length 75 mm.
 *   grips.support  wooden hand guard (the fore-end), 416 mm ahead of the origin, where the left hand holds
 *                  the gun in a standing low-ready / assault-fire position: axis +Z, palm under (slightly
 *                  left), radius 26 mm round the deep hand guard (57 mm tall, 44 mm wide), length 100 mm.
 *                  Alternatives for other poses in sockets: 'magazineHold' (front of the magazine),
 *                  'buttHold' (under the butt, the prone gunner's left hand on the bipod).
 *   shoulder       centre of the butt plate (shoulder rest folded).
 *   muzzle         face of the flash hider on the bore axis.
 *   sling          front = bar of the swivel on the band just ahead of the hand guard, rear = bar of the
 *                  butt swivel. sling.build(gravityLocal, slack = 0.12) returns the olive-drab web sling
 *                  hanging under the gun (below the magazine); it is NOT part of `object`.
 *   restPoints     [belly of the butt ahead of the rear swivel, underside of the hand guard] (true surface
 *                  points).
 *   sockets        'triggerFace', 'magazine' (top centre of the magazine, +Y up), 'magazineHold',
 *                  'chargingHandle' (knob, left side), 'selector' (change lever pivot, left side),
 *                  'frontSight' (blade tip), 'rearSight' (aperture), 'bipodPivot', 'buttHold',
 *                  'shoulderRest' (hinge of the folded rest).
 *
 * Authoring frame ("B-frame", see bar/dims.ts): z = 0 at the butt plate, y = 0 on the bore; the model is
 * shifted at the end so that the grip centre is the origin. Helpers: bar/{dims,parts,bipod,sling,
 * materials}.ts, common/*.ts.
 */
import { THREE, group } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { Profile, V } from './common/geo';
import type { Box } from './common/sling';
import { BD, BSTOCK, BHG } from './bar/dims';
import { buildBarParts, BSWIVELS, bSwivelBar } from './bar/parts';
import { buildBarBipod, bipodGroundPitch, type BarBipod } from './bar/bipod';
import { buildBarSling } from './bar/sling';
import { barMaterials } from './bar/materials';

export type { BarBipod };

export interface BarM1918A2Options {
  bipod?: BarBipod;
  magazine?: boolean;
  detail?: 'high' | 'low';
  groundPitch?: number;
}

const gripCentreB = () => {
  const s = BSTOCK.at(BD.gripZ);
  return V(0, (s.yTop + s.yBot) / 2, BD.gripZ);
};

/** Key lengths; ORIGIN_B = grip centre (weapon-local origin) in the design frame. */
export const BAR_M1918A2 = {
  length: BD.length,
  barrel: BD.barrel,
  lengthOfPull: BD.triggerZ - BSTOCK.z0,
  ORIGIN_B: gripCentreB(),
  /** nose-up pitch (rad) at which the deployed skid feet and the toe of the butt share one ground plane */
  bipodPitch: bipodGroundPitch(),
};

const L = (p: THREE.Vector3) => p.clone().sub(BAR_M1918A2.ORIGIN_B);

/** Weapon-local cross-sections ([x, y] m) at the two rest points: [butt belly, hand guard]. */
export function barRestContours(): [number, number][][] {
  const oy = BAR_M1918A2.ORIGIN_B.y;
  return [
    Profile.ring(BSTOCK.at(BD.rearRestZ), 72).map(([x, y]) => [x, y - oy] as [number, number]),
    Profile.ring(BHG.at(BD.frontRestZ), 72).map(([x, y]) => [x, y - oy] as [number, number]),
  ];
}

/** Sling in weapon-local space; extra boxes (weapon-local) are pushed round along `push` (default +X). */
export function buildBarSlingLocal(gravityLocal: THREE.Vector3, slack = 0.12, extra: Box[] = [], push = V(1, 0, 0), bipod: BarBipod = 'folded', magazine = true): THREE.Object3D {
  const o = BAR_M1918A2.ORIGIN_B;
  const ex = extra.map((b) => ({ min: [b.min[0] + o.x, b.min[1] + o.y, b.min[2] + o.z], max: [b.max[0] + o.x, b.max[1] + o.y, b.max[2] + o.z] }) as Box);
  const s = buildBarSling(barMaterials(), gravityLocal.clone().normalize(), slack, { extra: ex, push, bipod, magazine });
  return group([s], { p: [-o.x, -o.y, -o.z], name: 'bar-sling' });
}

export function buildBarM1918A2(opts: BarM1918A2Options = {}): WeaponModel {
  const detail = opts.detail ?? 'high';
  const bipod: BarBipod = opts.bipod ?? 'folded';
  const withMag = opts.magazine !== false;
  const m = barMaterials();
  const gc = BAR_M1918A2.ORIGIN_B;
  const pitch = opts.groundPitch ?? BAR_M1918A2.bipodPitch;
  const partsB = [...buildBarParts(m, withMag, detail), ...buildBarBipod(m, bipod, pitch, detail === 'high')];
  const inner = group(partsB, { p: [-gc.x, -gc.y, -gc.z], name: 'bar-parts' });
  const object = group([inner], { name: `bar-m1918a2-${bipod}` });

  // ---- grips
  const up = (38 * Math.PI) / 180;
  const tAxis = V(0, Math.sin(up), Math.cos(up));
  const tPalm = V(-1, 0.1, 0);
  tPalm.addScaledVector(tAxis, -tPalm.dot(tAxis)).normalize();
  const trigger: Grip = { position: V(0, 0, 0), axis: tAxis, palm: tPalm, radius: 0.021, length: 0.075 };
  // centre a little below the middle of the deep hand guard so palm (radius along `palm`) meets its
  // underside and the fingers wrap its flat sides
  const hs = BHG.at(BD.supportZ);
  const support: Grip = { position: L(V(0, hs.yBot + 0.0262, BD.supportZ)), axis: V(0, 0, 1), palm: V(0.25, -1, 0).normalize(), radius: 0.026, length: 0.1 };

  const bs = BSTOCK.at(BSTOCK.z0);
  const T = (p: THREE.Vector3) => new THREE.Matrix4().makeTranslation(...L(p).toArray());
  const sockets: Record<string, THREE.Matrix4> = {
    triggerFace: T(V(0, BD.thBot - 0.012, BD.triggerZ - 0.0005)),
    magazine: T(V(0, BD.magTop, (BD.magZ0 + BD.magZ1) / 2)),
    magazineHold: T(V(0, -0.1, BD.magZ1 + 0.002)),
    chargingHandle: T(V(BD.rcvHW + 0.022, -0.0015, 0.5575)),
    selector: T(V(BD.thHW + 0.003, -0.0525, 0.402)),
    frontSight: T(V(0, BD.sightY, BD.frontSightZ)),
    rearSight: T(V(0, BD.sightY, BD.rearSightZ)),
    bipodPivot: T(V(0, BD.pivotY, BD.pivotZ)),
    buttHold: T(V(0, BSTOCK.at(0.08).yBot, 0.08)),
    shoulderRest: T(V(0, bs.yTop - 0.0027, BSTOCK.z0 - 0.0046)),
  };

  return {
    id: 'us-bar-m1918a2',
    object,
    grips: { trigger, support },
    shoulder: L(V(0, (bs.yTop + bs.yBot) / 2, BSTOCK.z0 - 0.0045)),
    muzzle: L(V(0, 0, BD.fhFront)),
    sling: {
      front: L(bSwivelBar(BSWIVELS.front)),
      rear: L(bSwivelBar(BSWIVELS.rear)),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = buildBarSling(m, gravityLocal.clone().normalize(), slack, { bipod, magazine: withMag });
        return group([s], { p: [-gc.x, -gc.y, -gc.z], name: 'bar-sling' });
      },
    },
    length: BD.length,
    restPoints: [L(V(0, BSTOCK.at(BD.rearRestZ).yBot, BD.rearRestZ)), L(V(0, BHG.at(BD.frontRestZ).yBot, BD.frontRestZ))],
    sockets,
  };
}
