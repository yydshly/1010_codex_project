/**
 * Sten Mk II (9 x 19 mm submachine gun, 32-round box magazine inserted from the LEFT) - shared weapon
 * model. Depicts a late-production Mk II with the skeleton ("loop") butt of bent steel tube: tubular
 * receiver with the right-side cocking slot and safety notch, fixed aperture rear sight, blade foresight,
 * welded trigger housing with push-through change lever, magazine-housing collar with ejection port and
 * magazine well, perforated barrel sleeve (three rows of three holes), black-painted steel throughout,
 * 3/4 in web sling.
 *
 * STABLE EXPORT (used by the standalone catalog entry and by soldier builders):
 *
 *   import { buildStenMk2 } from '../uk/weapons/sten-mk2.model';   // path relative to your module
 *   const smg = buildStenMk2();                                     // -> WeaponModel (shared/contracts.ts)
 *
 *   StenMk2Options
 *     detail:   'high' (default) | 'low'   fewer segments
 *     magazine: boolean (default true)    32-round magazine inserted
 *
 *   Also exported: STEN (key lengths), stenStandRest(w) (rest points + cross-sections for the shared
 *   weaponStand()), STEN_ORIGIN_S (grip centre in the design frame).
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, gun's left side +X (the magazine
 * points along +X). ORIGIN = trigger-hand grip centre: the "small of the butt" formed by the front of the
 * skeleton butt (upper member under the end cap and lower strut at the rear of the trigger housing),
 * 84 mm behind the trigger and 31 mm below the bore axis. Real scale (m): overall 0.762, barrel 0.197
 * (0.094 visible ahead of the sleeve); the muzzle is 0.554 m ahead of the origin, the rear of the butt
 * 0.208 m behind it.
 *
 *   grips.trigger  small of the skeleton butt: axis forward and 15 deg up, palm on the right side (-X,
 *                  slightly up), radius 15 mm (the hand closes round the upper member and the strut),
 *                  length 60 mm.
 *   grips.support  barrel sleeve (the drill was to hold the sleeve, not the magazine, which wore the
 *                  magazine catch): axis +Z, palm under the sleeve and slightly left, radius 20 mm,
 *                  length 70 mm. Socket 'magazineHold' gives the commonly seen hold on the magazine
 *                  housing / magazine instead.
 *   shoulder       middle of the rear member of the skeleton butt.
 *   muzzle         muzzle face on the bore axis.
 *   sling          front = hook hole in the barrel sleeve (lower left), rear = lower butt strut.
 *                  sling.build(gravityLocal, slack = 0.12) returns the web sling with its wire hook, brass
 *                  loop and mid-length buckle; it is NOT part of `object`.
 *   restPoints     [bottom rear corner of the skeleton butt, underside of the barrel near the muzzle]
 *                  (true surface points; the sling hangs between them).
 *   sockets        'trigger' (trigger face, +Z forward), 'cockingHandle' (knob centre), 'magazine'
 *                  (magazine centre), 'magazineHold' (magazine well, palm from the rear), 'frontSight'
 *                  (blade tip), 'rearSight' (peep).
 *
 * Authoring frame ("S-frame", sten-mk2/parts.ts): z = 0 at the rear face of the end cap, y = 0 on the
 * bore; the model is shifted at the end so that the grip centre is the origin.
 */
import { THREE, group } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { ukwMaterials } from './common/materials';
import { V, RAD, circle2D, type V2 } from './common/geo';
import { S, BUTT_R, buildSten, lowerStrutAt } from './sten-mk2/parts';
import { buildStenSling, stenSlingHole, STEN_SLING_REAR_Z } from './sten-mk2/sling';

export interface StenMk2Options {
  detail?: 'high' | 'low';
  magazine?: boolean;
}

/** Grip centre (weapon-local origin) in the S-frame. */
export const STEN_ORIGIN_S = V(0, -0.031, S.gripZ);

export const STEN = {
  length: S.muzzleZ - S.buttRearZ,
  barrel: 0.197,
  origin: STEN_ORIGIN_S,
};

/** Rest points in the S-frame (true surface points). */
const REST_REAR = V(0, -0.0942 - BUTT_R, -0.1515);
const REST_FRONT = V(0, -0.0079, 0.508);

export function buildStenMk2(opts: StenMk2Options = {}): WeaponModel {
  const hi = (opts.detail ?? 'high') === 'high';
  const m = ukwMaterials();
  const gc = STEN_ORIGIN_S;
  const L = (p: THREE.Vector3) => p.clone().sub(gc);

  let parts = buildSten(m, hi);
  if (opts.magazine === false) parts = parts.filter((p) => p.userData.stenPart !== 'magazine');
  const inner = group(parts, { p: [-gc.x, -gc.y, -gc.z], name: 'sten-parts' });
  const object = group([inner], { name: 'sten-mk2' });

  const up = 15 * RAD;
  const tAxis = V(0, Math.sin(up), Math.cos(up));
  const tPalm = V(-1, 0.1, 0);
  tPalm.addScaledVector(tAxis, -tPalm.dot(tAxis)).normalize();
  const trigger: Grip = { position: V(0, 0, 0), axis: tAxis, palm: tPalm, radius: 0.015, length: 0.06 };
  const sv = S.sleeve;
  const support: Grip = {
    position: L(V(0, 0, (sv.z0 + sv.z1) / 2 - 0.004)),
    axis: V(0, 0, 1),
    palm: V(0.35, -1, 0).normalize(),
    radius: 0.02,
    length: 0.07,
  };

  const T = (p: THREE.Vector3, rot?: THREE.Quaternion) => {
    const mtx = new THREE.Matrix4();
    mtx.compose(L(p), rot ?? new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    return mtx;
  };
  const kdir = V(Math.cos(S.slot.phi), Math.sin(S.slot.phi), 0);
  const sockets: Record<string, THREE.Matrix4> = {
    trigger: T(V(0, -0.052, S.triggerZ + 0.001)),
    cockingHandle: T(V(0, 0, S.handleZ).addScaledVector(kdir, S.tubeR + 0.015)),
    magazine: T(V((S.mag.x0 + S.mag.x1) / 2, 0, (S.mag.z0 + S.mag.z1) / 2)),
    magazineHold: T(V(0.05, 0, (S.well.z0 + S.well.z1) / 2)),
    frontSight: T(V(0, 0.0258, S.foreSightZ)),
    rearSight: T(V(0, S.peepY, S.rearSightZ)),
  };

  // shoulder: middle of the slanted rear member of the butt, on its rear surface
  const shoulder = L(V(0, -0.066, -0.184 - BUTT_R * 0.7));
  const rear = lowerStrutAt(STEN_SLING_REAR_Z);

  return {
    id: 'uk-sten-mk2',
    object,
    grips: { trigger, support },
    shoulder,
    muzzle: L(V(0, 0, S.muzzleZ)),
    sling: {
      front: L(stenSlingHole()),
      rear: L(rear),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = buildStenSling(m, gravityLocal.clone().normalize(), slack);
        return group([s], { p: [-gc.x, -gc.y, -gc.z], name: 'sten-sling' });
      },
    },
    length: STEN.length,
    restPoints: [L(REST_REAR), L(REST_FRONT)],
    sockets,
  };
}

/** Rest points for the shared weaponStand() with weapon-local cross-sections (for felt contact). */
export function stenStandRest(w: WeaponModel): { p: THREE.Vector3; contour: V2[] }[] {
  const [rear, front] = [...w.restPoints].sort((a, b) => a.z - b.z);
  const oy = STEN_ORIGIN_S.y;
  // the butt corner: a tube bent in the Y-Z plane, cut across by the cradle plane -> a slightly
  // elongated section; the barrel: a circle
  const rc = circle2D(0, REST_REAR.y + BUTT_R - oy, BUTT_R, 24).map(([x, y]) => [x, y] as V2);
  const fc = circle2D(0, REST_FRONT.y + 0.0079 - oy, 0.0079, 24).map(([x, y]) => [x, y] as V2);
  return [
    { p: rear, contour: rc },
    { p: front, contour: fc },
  ];
}
