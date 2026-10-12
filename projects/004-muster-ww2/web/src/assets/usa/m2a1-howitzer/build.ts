/**
 * Assembles the 105 mm Howitzer M2A1 on Carriage M2A1 in the construction frame (bottom
 * carriage + wheels, split trails, top carriage with the shield, elevating mass on the
 * trunnions), then moves it so the origin sits on the ground at the centre of its plan footprint.
 * Wheels and spade edges touch y = 0 in both trail states (vertical hinge pins, fixed geometry).
 */
import { THREE, group } from '../../../core/kit';
import { D } from './dims';
import { buildBottomCarriage } from './carriage';
import { buildTopCarriage } from './top';
import { buildShield } from './shield';
import { buildElevatingMass } from './gun';
import { buildTrail, trailYaw } from './trails';

export interface M2a1Config {
  trails: 'deployed' | 'closed';
  detail: 'high' | 'low';
}

/** Tube elevation shown (deg): a typical firing elevation when deployed, level for travel. */
const ELEV = { deployed: 14, closed: 0 };

export function buildM2a1(cfg: M2a1Config): THREE.Group {
  const elev = ELEV[cfg.trails];
  const parts: THREE.Object3D[] = [];
  parts.push(buildBottomCarriage(cfg.detail));
  parts.push(buildTopCarriage({ detail: cfg.detail, elevation: elev }));
  parts.push(buildShield());

  const em = buildElevatingMass({ detail: cfg.detail });
  em.position.set(0, D.trunY, D.trunZ);
  em.rotation.x = -THREE.MathUtils.degToRad(elev);
  parts.push(em);

  const closedYaw = trailYaw('closed');
  const yaw = THREE.MathUtils.degToRad(trailYaw(cfg.trails));
  const tl = buildTrail({ left: true, closedYawDeg: closedYaw, detail: cfg.detail });
  tl.position.set(D.hingeX, D.hingeY, D.hingeZ);
  tl.rotation.y = yaw;
  parts.push(tl);
  const tr = buildTrail({ left: false, closedYawDeg: closedYaw, detail: cfg.detail });
  tr.position.set(D.hingeX, D.hingeY, D.hingeZ);
  tr.rotation.y = yaw;
  const trm = group([tr]);
  trm.scale.x = -1;
  parts.push(trm);

  const inner = group(parts, { name: 'm2a1-construction' });
  inner.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(inner, true);
  inner.position.set(-(b.min.x + b.max.x) / 2, 0, -(b.min.z + b.max.z) / 2);
  return group([inner], { name: 'm2a1-howitzer' });
}
