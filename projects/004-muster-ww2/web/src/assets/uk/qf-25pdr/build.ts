/**
 * Assembles the QF 25-pounder: the carriage (trail, spade, saddle, shield) and the elevating mass
 * are built in the construction frame (gun on its wheels), then the gun is lifted onto the
 * firing platform: the wheels stand on the deck and the carriage is pitched about the axle so
 * the spade still rests exactly on the ground. The bore is kept level. Finally the model is
 * re-centred on its plan footprint.
 */
import { THREE, group } from '../../../core/kit';
import { D } from './dims';
import { buildWheel } from './wheel';
import { buildTrail, buildSpade } from './trail';
import { buildSaddle } from './saddle';
import { buildShield } from './shield';
import { buildOrdnance } from './ordnance';
import { buildCradle } from './cradle';
import { buildPlatform } from './platform';

export interface Qf25Config {
  detail: 'high' | 'low';
}

/** Barrel elevation shown relative to the ground (deg): level, as on display. */
const ELEVATION = 0;

/** Lowest y of an object in its root's frame (the root must have no parent). */
function minY(root: THREE.Object3D, target: THREE.Object3D): number {
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(target, true).min.y;
}

export function buildQf25(cfg: Qf25Config): THREE.Group {
  const hi = cfg.detail === 'high';
  const lift = D.platTop;

  // --- carriage in the construction frame
  const em = group([...buildOrdnance(hi), ...buildCradle(hi)], { name: 'elevating-mass' });
  em.position.set(0, D.trunY, D.trunZ);
  const spade = buildSpade();
  const carriage = group([buildTrail(hi), spade, buildSaddle(hi), buildShield(), em], { name: 'carriage' });
  carriage.position.set(0, -D.axleY, 0);
  // pivot on the axle, lifted onto the platform deck
  const pivot = group([carriage], { name: 'carriage-pivot' });
  pivot.position.set(0, D.axleY + lift, 0);

  // pitch about the axle until the spade rests on the ground (bisection on the real geometry)
  let lo = THREE.MathUtils.degToRad(-8), hi2 = 0;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi2) / 2;
    pivot.rotation.x = mid;
    if (minY(pivot, spade) > 0) hi2 = mid;
    else lo = mid;
  }
  const phi = (lo + hi2) / 2;
  pivot.rotation.x = phi;
  // shift the tiny residual so the spade sits exactly on y = 0
  pivot.position.y -= minY(pivot, spade);
  // keep the bore at the display elevation relative to the ground
  em.rotation.x = -THREE.MathUtils.degToRad(ELEVATION) - phi;

  // --- wheels on the platform deck (they stay upright; the carriage pitches about the axle)
  const parts: THREE.Object3D[] = [pivot];
  const wl = buildWheel({ detail: cfg.detail, spin: 20 });
  wl.position.set(D.wheelX, D.axleY + lift, 0);
  parts.push(wl);
  const wr = buildWheel({ detail: cfg.detail, spin: -35 });
  wr.position.set(D.wheelX, D.axleY + lift, 0);
  const holder = group([wr]);
  holder.scale.x = -1;
  parts.push(holder);
  parts.push(buildPlatform(hi));

  const inner = group(parts, { name: 'qf-25pdr-construction' });
  inner.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(inner, true);
  inner.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  return group([inner], { name: 'qf-25pdr' });
}
