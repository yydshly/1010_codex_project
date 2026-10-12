/**
 * Karabiner 98 kurz (Kar98k), 7.92 x 57 mm Mauser bolt-action rifle - shared weapon model.
 * Depicts a 1940s-production rifle with a solid walnut stock (semi-pistol-grip wrist, cupped butt
 * plate, sling slot and butt disc), hooded front sight and turned-down bolt handle.
 *
 * STABLE EXPORT (used by the standalone catalog entry and by soldier builders):
 *
 *   import { buildKar98k } from '../germany/weapons/kar98k.model';   // path relative to your module
 *   const k98 = buildKar98k();                                         // -> WeaponModel (shared/contracts.ts)
 *
 *   Kar98kOptions
 *     detail: 'high' (default) | 'low'     'low' drops the finest detail (graduations, knurling)
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, rifle's left side +X.
 * ORIGIN = trigger-hand grip centre: middle of the stock wrist, 81 mm behind the trigger face,
 * 47 mm below the bore axis. Real scale (m): overall 1.110, barrel 0.600.
 *
 *   grips.trigger  stock wrist: axis forward and 18 deg up along the semi-pistol grip, palm on the
 *                  right side (-X) of the wrist, radius 22.5 mm.
 *   grips.support  fore-end + handguard just ahead of the rear sight (close to the balance point):
 *                  axis +Z, palm under the fore-end (slightly left), radius 22 mm.
 *   shoulder       centre of the butt plate.
 *   muzzle         muzzle crown on the bore axis.
 *   sling          front = outer bar of the swivel on the LEFT of the lower band, rear = sling slot
 *                  (left opening) through the butt. sling.build(gravityLocal, slack = 0.12) returns the
 *                  leather sling; it is NOT part of `object`.
 *   restPoints     [bottom of the stock wrist behind the trigger guard, bottom of the fore-end between the bands]
 *                  (true surface points). kar98kCradleRestPoints() gives the felt-corrected pair for the
 *                  shared weaponStand().
 *   sockets        'triggerFace' (+Z = finger push direction), 'boltKnob', 'bayonetLug' (front end of the
 *                  lug, +Z forward), 'frontSight' (blade tip), 'rearSight' (notch).
 *
 * Authoring frame ("K-frame", see kar98k/stock.ts): z = 0 at the breech face, y = 0 on the bore;
 * the model is shifted at the end so that the grip centre is the origin.
 */
import { THREE, group } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { k98Materials } from './kar98k/materials';
import { buildStock, sectionAt, secPoint, STOCK } from './kar98k/stock';
import { buildMetal, K } from './kar98k/metal';
import { buildK98Sling } from './kar98k/sling';
import { feltLift } from './common/cradle';
import { V, type V2 } from './common/geo';

export interface Kar98kOptions {
  detail?: 'high' | 'low';
}

/** Key K-frame positions (metres). */
export const KAR98K_DIMS = {
  length: 1.11,
  barrel: 0.6,
  muzzleZ: K.muzzleZ,
  buttFaceZ: STOCK.buttZ - 0.0022,
  gripZ: -0.2155,
  supportZ: 0.135,
  rearRestZ: -0.215,
  frontRestZ: 0.4,
};

const gripCentreK = () => {
  const s = sectionAt(KAR98K_DIMS.gripZ);
  return V(0, (s.yTop + s.yBot) / 2, KAR98K_DIMS.gripZ);
};

export function buildKar98k(opts: Kar98kOptions = {}): WeaponModel {
  const detail = opts.detail ?? 'high';
  const m = k98Materials();
  const gc = gripCentreK();
  const L = (p: THREE.Vector3) => p.clone().sub(gc);

  const kGroup = group([...buildStock(m), ...buildMetal(m, detail)]);
  const root = group([kGroup], { p: [-gc.x, -gc.y, -gc.z], name: 'kar98k-body' });
  const object = group([root]);
  object.name = 'kar98k';

  // grips
  const up = (18 * Math.PI) / 180;
  const tAxis = V(0, Math.sin(up), Math.cos(up));
  const tPalm = V(-1, 0.12, 0);
  tPalm.addScaledVector(tAxis, -tPalm.dot(tAxis)).normalize();
  const trigger: Grip = { position: V(0, 0, 0), axis: tAxis, palm: tPalm, radius: 0.0225, length: 0.075 };
  const zs = KAR98K_DIMS.supportZ;
  const ss = sectionAt(zs);
  const hgTop = STOCK.hgTop0 + ((STOCK.hgTop1 - STOCK.hgTop0) * (zs - STOCK.hgRear)) / (STOCK.hgFront - STOCK.hgRear);
  const support: Grip = {
    position: L(V(0, (hgTop + ss.yBot) / 2, zs)),
    axis: V(0, 0, 1),
    palm: V(0.3, -1, 0).normalize(),
    radius: 0.022,
    length: 0.11,
  };

  const buttS = sectionAt(STOCK.buttZ);
  const shoulder = L(V(0, (buttS.yTop + buttS.yBot) / 2, KAR98K_DIMS.buttFaceZ));
  const rear = V(0, sectionAt(KAR98K_DIMS.rearRestZ).yBot, KAR98K_DIMS.rearRestZ);
  const front = V(0, sectionAt(KAR98K_DIMS.frontRestZ).yBot, KAR98K_DIMS.frontRestZ);

  const sockets: Record<string, THREE.Matrix4> = {
    triggerFace: new THREE.Matrix4().makeTranslation(...L(K.triggerFace).toArray()),
    boltKnob: new THREE.Matrix4().makeTranslation(...L(K.knob).toArray()),
    bayonetLug: new THREE.Matrix4().makeTranslation(...L(K.lugFront).toArray()),
    frontSight: new THREE.Matrix4().makeTranslation(...L(V(0, 0.024, K.fsZ)).toArray()),
    rearSight: new THREE.Matrix4().makeTranslation(...L(V(0, 0.0232, 0.0412)).toArray()),
  };

  return {
    id: 'de-kar98k',
    object,
    grips: { trigger, support },
    shoulder,
    muzzle: L(V(0, 0, K.muzzleZ)),
    sling: {
      front: L(V(K.swivel.x, K.swivel.yC, K.swivel.z)),
      rear: L(V(sectionAt(STOCK.slot.z).hw, STOCK.slot.y, STOCK.slot.z)),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = buildK98Sling(m, gravityLocal.clone().normalize(), slack);
        return group([s], { p: [-gc.x, -gc.y, -gc.z], name: 'kar98k-sling' });
      },
    },
    length: K.muzzleZ - KAR98K_DIMS.buttFaceZ,
    restPoints: [L(rear), L(front)],
    sockets,
  };
}

/**
 * Rest points for the shared weaponStand(): the true underside points lowered by the height at which
 * the stock section first touches the felt of the U cradle (so the rifle neither floats nor sinks).
 */
export function kar98kCradleRestPoints(w: WeaponModel): THREE.Vector3[] {
  const rel = (z: number, floorplate: boolean): V2[] => {
    const s = sectionAt(z);
    const pts = Array.from({ length: 72 }, (_, i) => {
      const t = (i / 72) * Math.PI * 2;
      const [x, y] = secPoint(s, t);
      // the floorplate stands 1.5 mm proud across the flat bottom
      const onPlate = floorplate && Math.abs(t - 1.5 * Math.PI) < 0.4;
      return [x, onPlate ? y - 0.0015 : y] as V2;
    });
    const minY = Math.min(...pts.map((p) => p[1]));
    return pts.map(([x, y]) => [x, y - minY] as V2);
  };
  const lifts = [feltLift(rel(KAR98K_DIMS.rearRestZ, false)), feltLift(rel(KAR98K_DIMS.frontRestZ, false))];
  return [...w.restPoints]
    .sort((a, b) => a.z - b.z)
    .map((p, i) => p.clone().setY(p.y - lifts[Math.min(i, 1)]));
}
