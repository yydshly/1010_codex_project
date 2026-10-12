/**
 * Assembles the complete ZiS-3 in the construction frame (lower carriage + wheels, split trails,
 * upper carriage with the main shield, elevating mass on the trunnions), then moves it so the
 * origin sits on the ground at the centre of its plan footprint.
 */
import { THREE, group } from '../../../core/kit';
import { D } from './dims';
import { buildLowerCarriage } from './carriage';
import { buildTrail, trailYaw } from './trails';
import { buildUpperCarriage } from './upper';
import { buildElevatingMass } from './gun';

export interface Zis3Config {
  trails: 'deployed' | 'closed';
  detail: 'high' | 'low';
}

/** Barrel elevation shown (deg): level, as on display. */
const ELEVATION = 0;

export function buildZis3(cfg: Zis3Config): THREE.Group {
  const parts: THREE.Object3D[] = [];
  parts.push(buildLowerCarriage(cfg.detail));
  parts.push(buildUpperCarriage(cfg.detail));

  const em = buildElevatingMass({ detail: cfg.detail });
  em.position.set(0, D.trunY, D.trunZ);
  em.rotation.x = -THREE.MathUtils.degToRad(ELEVATION);
  parts.push(em);

  const yaw = trailYaw(cfg.trails);
  const tl = buildTrail({ left: true, detail: cfg.detail });
  tl.position.set(D.hingeX, D.hingeY, D.hingeZ);
  tl.rotation.y = THREE.MathUtils.degToRad(yaw);
  parts.push(tl);
  const tr = buildTrail({ left: false, detail: cfg.detail });
  tr.position.set(D.hingeX, D.hingeY, D.hingeZ);
  tr.rotation.y = THREE.MathUtils.degToRad(yaw);
  const trm = group([tr]);
  trm.scale.x = -1;
  parts.push(trm);

  const inner = group(parts, { name: 'zis-3-construction' });
  inner.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(inner, true);
  inner.position.set(-(b.min.x + b.max.x) / 2, 0, -(b.min.z + b.max.z) / 2);
  return group([inner], { name: 'zis-3' });
}
