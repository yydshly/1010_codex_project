/**
 * DP-27 (Degtyaryov infantry light machine gun, 7.62 x 54 mmR) - shared weapon model.
 *
 * STABLE EXPORT (used by the standalone catalog entry and by the soldier builders):
 *
 *   import { buildDp27 } from '../soviet/weapons/dp27.model';   // path relative to your module
 *   const lmg = buildDp27({ bipod: 'folded' });                   // -> WeaponModel (shared/contracts.ts)
 *
 *   Dp27Options
 *     bipod:  'folded' (default) | 'deployed'   legs swung back under the casing / down, raked and splayed
 *     barrel: 'plain' (default) | 'finned'      early barrels with transverse cooling fins (seen through
 *                                               the casing windows)
 *     pan:    boolean (default true)            47-round pan magazine fitted on top
 *
 *   Also exported: DP27 (key lengths), dp27SectionLocal(zD) / dp27FrameSectionLocal() /
 *   dp27GuideSectionLocal() (weapon-local cross-sections for the display cradle), DP27_ORIGIN_D (grip
 *   centre in the design frame).
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, weapon's left side +X.
 * ORIGIN = trigger-hand grip centre: middle of the wooden wrist just behind the receiver's rear tang and
 * the trigger frame, 270 mm forward of the butt plate (76 mm behind the trigger face), 23.5 mm below the
 * bore axis. Real scale (m): overall 1.270, barrel 0.605, the bore lies 23.5 mm above the origin; butt
 * plate at z = -0.270, flash-hider face at z = +1.000.
 *
 *   grips.trigger  wrist of the butt (no pistol grip): axis forward along the wrist (rising ~7 deg),
 *                  palm on the right side (-X, slightly up), radius 19.5 mm, length 80 mm. The index
 *                  finger reaches the trigger 76 mm ahead; the fingers close the automatic safety lever.
 *   grips.support  underside of the barrel casing just ahead of the pan (520 mm ahead of the origin):
 *                  the usual carry / hip-firing hold on the casing, the guide tube under it and, when
 *                  folded, the bipod legs. Axis +Z, palm under (-Y). Folded: radius 32 mm round the whole
 *                  bundle (centre 17.5 mm below the bore); deployed: radius 28 mm (centre 10 mm below).
 *                  (Prone gunners on the bipod usually held the butt instead: see socket 'buttHold'.)
 *   shoulder       centre of the steel butt plate.
 *   muzzle         face of the conical flash hider on the bore axis.
 *   sling          front = wire loop of the swivel on the upper left of the casing, rear = swivel pin on
 *                  the left side of the butt. sling.build(gravityLocal, slack = 0.12) returns the cotton
 *                  webbing sling with its buckle and the rear D-ring; it is NOT part of `object`.
 *   restPoints     [flat underside of the trigger frame ahead of the trigger guard, underside of the guide
 *                  tube ahead of the bipod collar] (true surface points; both outside the sling's path, so
 *                  the strap never crosses a display cradle).
 *   sockets        'trigger' (trigger face), 'magazine' (pan centre, underside), 'bipodPivot', 'muzzle',
 *                  'frontSight' (post tip), 'rearSight' (notch), 'buttHold' (under the butt, ahead of the
 *                  lower lobe; +Z forward).
 *
 * Parts are authored in the DESIGN frame ("D-frame", dp27/layout.ts: z = 0 at the butt plate, y = 0 on
 * the bore) and shifted so that the grip centre is the origin. Helpers: dp27/{layout,butt,receiver,
 * barrel,bipod,pan,sling,geo,materials}.ts.
 */
import { THREE, group } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { DP, stockSection, guideSection, frameSection, bodySdf, stockTop, stockBot } from './dp27/layout';
import { buildButt } from './dp27/butt';
import { buildReceiver, PAN_ORIGIN } from './dp27/receiver';
import { buildBarrelGroup, frontSwivel } from './dp27/barrel';
import { buildBipod, legSegments, BIPOD_PIVOT, type BipodState } from './dp27/bipod';
import { buildDp27Pan } from './dp27/pan';
import { makeSling } from './dp27/sling';
import type { P2 } from './dp27/geo';

export interface Dp27Options {
  bipod?: BipodState;
  barrel?: 'plain' | 'finned';
  pan?: boolean;
}

/** Grip centre (weapon-local origin) in the design frame. */
export const DP27_ORIGIN_D = new THREE.Vector3(0, DP.gripY, DP.gripZ);

export const DP27 = {
  length: DP.length,
  barrel: DP.barrel,
  panDiameter: 0.265,
  /** Design-frame point -> weapon-local: subtract DP27_ORIGIN_D. */
  origin: DP27_ORIGIN_D,
};

const toLocal = (p: THREE.Vector3) => p.clone().sub(DP27_ORIGIN_D);
const L = (x: number, y: number, z: number) => toLocal(new THREE.Vector3(x, y, z));

/** Stock cross-section at design station zD (0..0.274 m from the butt plate), weapon-local [x, y]. */
export function dp27SectionLocal(zD: number): [number, number][] {
  return stockSection(zD).map(([x, y]: P2) => [x, y - DP27_ORIGIN_D.y] as [number, number]);
}

/** Trigger-frame cross-section ahead of the trigger guard (the rear display rest), weapon-local [x, y]. */
export function dp27FrameSectionLocal(): [number, number][] {
  return frameSection().map(([x, y]: P2) => [x, y - DP27_ORIGIN_D.y] as [number, number]);
}

/** Guide-tube cross-section (the lower tube under the casing), weapon-local [x, y]. */
export function dp27GuideSectionLocal(): [number, number][] {
  return guideSection().map(([x, y]: P2) => [x, y - DP27_ORIGIN_D.y] as [number, number]);
}

export function buildDp27(opts: Dp27Options = {}): WeaponModel {
  const bipod: BipodState = opts.bipod === 'deployed' ? 'deployed' : 'folded';
  const finned = opts.barrel === 'finned';
  const withPan = opts.pan !== false;

  const parts: THREE.Object3D[] = [...buildButt(), ...buildReceiver(), ...buildBarrelGroup({ finned }), ...buildBipod(bipod)];
  if (withPan) {
    const pan = buildDp27Pan();
    pan.position.copy(PAN_ORIGIN);
    parts.push(pan);
  }
  const inner = group(parts, { p: [-DP27_ORIGIN_D.x, -DP27_ORIGIN_D.y, -DP27_ORIGIN_D.z], name: 'dp27-parts' });
  const object = group([inner], { name: `dp27-${bipod}` });

  // --- grips ---
  const tAxis = new THREE.Vector3(0, 0.12, 1).normalize();
  const tPalm = new THREE.Vector3(-1, 0.25, 0);
  tPalm.addScaledVector(tAxis, -tPalm.dot(tAxis)).normalize();
  const trigger: Grip = { position: new THREE.Vector3(0, 0, 0), axis: tAxis, palm: tPalm, radius: 0.0195, length: 0.08 };
  const folded = bipod === 'folded';
  const support: Grip = {
    position: L(0, folded ? -0.0175 : -0.01, DP.supportZ),
    axis: new THREE.Vector3(0, 0, 1),
    palm: new THREE.Vector3(0, -1, 0),
    radius: folded ? 0.032 : 0.028,
    length: 0.09,
  };

  // --- sling ---
  const sw = frontSwivel();
  const sdf = bodySdf(legSegments(bipod));
  const hwRear = stockSection(DP.swivelRearZ).reduce((m, [x]) => Math.max(m, x), 0);
  const rearPivot = new THREE.Vector3(hwRear + 0.0035, DP.swivelRearY, DP.swivelRearZ);
  const buildSlingD = makeSling({
    frontBar: sw.bar.clone(),
    rearPivot,
    rearAxis: new THREE.Vector3(1, 0, 0),
    ringReach: 0.0135,
    outward: new THREE.Vector3(1, 0, 0),
    sdf,
    width: 0.026,
    thickness: 0.0022,
  });

  const buttHoldZ = 0.18;
  const buttHold = new THREE.Matrix4().makeTranslation(...L(0, stockBot(buttHoldZ) + 0.004, buttHoldZ).toArray());
  const sockets: Record<string, THREE.Matrix4> = {
    trigger: new THREE.Matrix4().makeTranslation(...L(0, -0.041, DP.triggerZ).toArray()),
    magazine: new THREE.Matrix4().makeTranslation(...toLocal(PAN_ORIGIN).toArray()),
    bipodPivot: new THREE.Matrix4().makeTranslation(...toLocal(BIPOD_PIVOT).toArray()),
    muzzle: new THREE.Matrix4().makeTranslation(...L(0, 0, DP.fhFront).toArray()),
    frontSight: new THREE.Matrix4().makeTranslation(...L(0, 0.047, DP.fsZ).toArray()),
    rearSight: new THREE.Matrix4().makeTranslation(...L(0, DP.notchY, DP.sightRear + 0.0115).toArray()),
    buttHold,
  };

  return {
    id: 'su-dp27',
    object,
    grips: { trigger, support },
    shoulder: L(0, (stockTop(0) + stockBot(0)) / 2, 0),
    muzzle: L(0, 0, DP.fhFront),
    sling: {
      front: toLocal(sw.bar),
      rear: toLocal(rearPivot),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = buildSlingD(gravityLocal.clone().normalize(), slack);
        return group([s], { p: [-DP27_ORIGIN_D.x, -DP27_ORIGIN_D.y, -DP27_ORIGIN_D.z], name: 'dp27-sling' });
      },
    },
    length: DP.length,
    restPoints: [L(0, DP.frameBot, DP.restRearZ), L(0, DP.guideY - DP.guideR, DP.restFrontZ)],
    sockets,
  };
}
