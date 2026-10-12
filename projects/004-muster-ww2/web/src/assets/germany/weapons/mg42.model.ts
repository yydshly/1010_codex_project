/**
 * MG 42 (Maschinengewehr 42), 7.92 x 57 mm belt-fed general-purpose machine gun - shared weapon model.
 * Stamped sheet-steel receiver with top feed cover, perforated barrel jacket with the right-side
 * barrel-change opening and barrel catch, recoil booster and flash cone, tangent rear sight with the
 * folding AA peep, folding front sight, Bakelite butt stock with folding shoulder rest and pistol grip.
 *
 * STABLE EXPORT (used by the standalone catalog entry and by soldier builders):
 *
 *   import { buildMg42 } from '../germany/weapons/mg42.model';   // path relative to your module
 *   const mg = buildMg42({ bipod: 'folded', drum: true });        // -> WeaponModel (shared/contracts.ts)
 *
 *   Mg42Options
 *     bipod:  'folded' (default) | 'deployed'    Zweibein on the front holder
 *     drum:   boolean (default true)             50-round belt drum on the feed side + belt stub
 *     detail: 'high' (default) | 'low'
 *     groundPitchDeg: number                     (deployed only) gun pitch at which the feet lie flat;
 *                                                mg42BipodStance() computes it for resting on the ground
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, weapon's left side +X.
 * ORIGIN = trigger-hand grip centre on the pistol-grip axis, 48 mm below the top of the grip.
 * Real scale (m): overall 1.220, barrel 0.530; the bore lies 106 mm above the origin.
 *
 *   grips.trigger  pistol grip: axis up the (17 deg raked) grip, palm on the right-rear, radius 19 mm.
 *   grips.support  bipod folded: the ends of the folded bipod legs under the jacket (the assault-fire
 *                  hold, left hand on the end of the folded leg), axis +Z, palm under the legs.
 *                  bipod deployed: top of the barrel jacket just ahead of the rear sight, palm on top.
 *   shoulder       centre of the butt plate.
 *   muzzle         face of the flash cone on the bore axis.
 *   sling          front = eye under the front of the barrel jacket (spring hook), rear = clamp round
 *                  the lower end of the pistol grip. sling.build(gravityLocal, slack = 0.12) returns the
 *                  leather carrying sling; it is NOT part of `object`.
 *   restPoints     [underside of the butt stock neck, underside of the recoil booster] (true surface
 *                  points, outside the sling's span). mg42CradleRestPoints() gives felt-corrected points.
 *   sockets        'bipodPivot', 'drum' (drum centre), 'feedCover', 'triggerFace'.
 *
 * Authoring frame ("B-frame", see mg42/util.ts): z = 0 at the butt plate, flash-cone face at z = 1.22,
 * y = 0 on the bore. The model is shifted at the end so that the grip centre is the origin.
 */
import { THREE, group } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { mg42Materials } from './mg42/materials';
import { D } from './mg42/dims';
import { buildJacket, JACKET as J, SLING_EYE } from './mg42/jacket';
import { buildReceiver, GRIP_DOWN, gripAt } from './mg42/receiver';
import { buildStock, BUTT_CENTRE, BUTT_BOTTOM } from './mg42/stock';
import { buildBipod, footPin, BIPOD, legPivot, type BipodState } from './mg42/bipod';
import { buildDrum } from './mg42/drum';
import { buildMg42Sling, CLAMP_S } from './mg42/sling';
import { feltLift } from './common/cradle';
import type { V2 } from './common/geo';

export interface Mg42Options {
  bipod?: BipodState;
  drum?: boolean;
  detail?: 'high' | 'low';
  groundPitchDeg?: number;
}

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
/** grip centre (B-frame) */
const GRIP_S = 0.048;
export const MG42_DIMS = {
  length: D.length,
  barrel: D.muzzle - D.breech,
  gripCentre: gripAt(GRIP_S),
  rearRestZ: 0.2,
  frontRestZ: 1.15,
};

export function buildMg42(opts: Mg42Options = {}): WeaponModel {
  const bipod = opts.bipod ?? 'folded';
  const withDrum = opts.drum !== false;
  const detail = opts.detail ?? 'high';
  const m = mg42Materials('bakelite');
  const gc = MG42_DIMS.gripCentre.clone();
  const L = (p: THREE.Vector3) => p.clone().sub(gc);

  const parts: THREE.Object3D[] = [
    ...buildStock(m),
    ...buildReceiver(m),
    ...buildJacket(m, detail),
    ...buildBipod(m, bipod, opts.groundPitchDeg ?? 7),
  ];
  if (withDrum) parts.push(...buildDrum(m, detail));
  const body = group(parts);
  const root = group([body], { p: [-gc.x, -gc.y, -gc.z], name: 'mg42-body' });
  const object = group([root]);
  object.name = 'mg42';

  // ---- grips
  const up = GRIP_DOWN.clone().negate();
  const fwd = V(1, 0, 0).cross(up).normalize();
  const palmT = V(-0.8, 0, 0).addScaledVector(fwd, -0.6);
  palmT.addScaledVector(up, -palmT.dot(up)).normalize();
  const trigger: Grip = { position: V(0, 0, 0), axis: up, palm: palmT, radius: 0.019, length: 0.095 };
  let support: Grip;
  if (bipod === 'folded') {
    // ends of the folded legs (side by side under the jacket), just ahead of the feet
    const zs = footPin('folded', 1).z + 0.03;
    const p0 = legPivot(1), p1 = footPin('folded', 1);
    const y = p0.y + ((p1.y - p0.y) * (p0.z - zs)) / (p0.z - p1.z);
    // centred slightly below the leg axis so fingers wrapping the legs stay clear of the jacket
    support = { position: L(V(0, y - 0.0022, zs)), axis: V(0, 0, 1), palm: V(0.3, -1, 0).normalize(), radius: 0.0135, length: 0.07 };
  } else {
    support = { position: L(V(0, D.jY, 0.75)), axis: V(0, 0, 1), palm: V(0, 1, 0), radius: 0.025, length: 0.09 };
  }

  const clampBar = gripAt(CLAMP_S).addScaledVector(fwd, -0.0315).addScaledVector(up, -0.0055);
  const sockets: Record<string, THREE.Matrix4> = {
    bipodPivot: new THREE.Matrix4().makeTranslation(...L(V(0, BIPOD.pivotY, BIPOD.z)).toArray()),
    feedCover: new THREE.Matrix4().makeTranslation(...L(V(0, 0.048, D.feedZ)).toArray()),
    triggerFace: new THREE.Matrix4().makeTranslation(...L(V(0, -0.08, 0.372)).toArray()),
  };
  if (withDrum) sockets.drum = new THREE.Matrix4().makeTranslation(...L(V(D.drumX, D.drumY, D.drumZ)).toArray());

  return {
    id: 'de-mg42',
    object,
    grips: { trigger, support },
    shoulder: L(BUTT_CENTRE),
    muzzle: L(V(0, 0, D.length)),
    sling: {
      front: L(SLING_EYE),
      rear: L(clampBar),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = buildMg42Sling(m, gravityLocal.clone().normalize(), slack);
        return group([s], { p: [-gc.x, -gc.y, -gc.z], name: 'mg42-sling' });
      },
    },
    length: D.length,
    restPoints: [L(V(0, -0.0615, MG42_DIMS.rearRestZ)), L(V(0, -0.0198, MG42_DIMS.frontRestZ))],
    sockets,
  };
}

/** Felt-corrected rest points for the shared weaponStand(). */
export function mg42CradleRestPoints(w: WeaponModel): THREE.Vector3[] {
  // stock neck section at z = 0.2 (super-ellipse 43.8 x 69.7 mm, exponent 2.4) and the booster tube
  const stock: V2[] = Array.from({ length: 72 }, (_, i) => {
    const t = (i / 72) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), e = 2.4;
    return [0.0219 * Math.sign(c) * Math.abs(c) ** (2 / e), 0.03485 + 0.03485 * Math.sign(s) * Math.abs(s) ** (2 / e)] as V2;
  });
  const tube: V2[] = Array.from({ length: 48 }, (_, i) => {
    const t = (i / 48) * Math.PI * 2;
    return [0.0198 * Math.cos(t), 0.0198 + 0.0198 * Math.sin(t)] as V2;
  });
  const lifts = [feltLift(stock), feltLift(tube)];
  return [...w.restPoints].sort((a, b) => a.z - b.z).map((p, i) => p.clone().setY(p.y - lifts[Math.min(i, 1)]));
}

/**
 * Stance for resting the gun on the ground on its deployed bipod and the butt: returns the pitch
 * (muzzle up, degrees) at which both feet and the lowest point of the butt touch the ground, and the
 * height of the weapon-local origin above the ground for that pitch (rotation.x = -pitch).
 */
export function mg42BipodStance(): { pitchDeg: number; originHeight: number; gripClearance: number } {
  const gc = MG42_DIMS.gripCentre;
  const rotY = (p: THREE.Vector3, th: number) => p.y * Math.cos(th) + p.z * Math.sin(th);
  const feet = [footPin('deployed', 1), footPin('deployed', -1)];
  // underside of the butt: the bottom line of the stock and the lower edge of the steel butt cap
  const butt: THREE.Vector3[] = [V(0, BUTT_BOTTOM - 0.0012, 0.0012), V(0, BUTT_BOTTOM - 0.0012, 0.0062)];
  for (const [z, y] of [[0.02, -0.1495], [0.05, -0.147], [0.08, -0.1395], [0.11, -0.1245]]) butt.push(V(0, y, z));
  const feetY = (th: number) => Math.min(...feet.map((p) => rotY(p, th))) - BIPOD.soleDrop;
  const buttY = (th: number) => Math.min(...butt.map((p) => rotY(p, th)));
  let lo = 0, hi = (25 * Math.PI) / 180;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (feetY(mid) < buttY(mid)) lo = mid;
    else hi = mid;
  }
  const th = (lo + hi) / 2;
  const ground = Math.min(feetY(th), buttY(th));
  const gripBottom = rotY(gripAt(0.1128), th);
  const drumBottom = rotY(V(D.drumX, D.drumY - 0.056, D.drumZ), th);
  return {
    pitchDeg: (th * 180) / Math.PI,
    originHeight: rotY(gc, th) - ground,
    gripClearance: Math.min(gripBottom, drumBottom) - ground,
  };
}

export const MG42_JACKET = J;
