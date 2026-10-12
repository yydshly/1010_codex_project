/**
 * Flak 36 assembler: cross platform (fixed), pedestal + upper carriage + optional shield (built in
 * the raw frame at 0 deg traverse), the elevating mass pivoted about the trunnion axis to the
 * chosen elevation, and the two equilibrators stretched between their pivots. The pads of the four
 * levelling jacks sit on y = 0 by construction; the model is finally re-centred on its plan bounds.
 */
import { THREE, group } from '../../../core/kit';
import { palette } from './palette';
import { D, ELEVATIONS } from './dims';
import { buildPlatform } from './platform';
import { carriage, equilibrators } from './carriage';
import { ordnance } from './ordnance';
import { shield } from './shield';

export interface Flak36Opts {
  shield: boolean;
  elevation: keyof typeof ELEVATIONS;
}

export function buildFlak36(o: Flak36Opts): THREE.Group {
  const P = palette();
  const deg = ELEVATIONS[o.elevation];
  const gun = group(ordnance(P));
  gun.position.set(0, D.trunY, D.trunZ);
  gun.rotation.x = (-deg * Math.PI) / 180;
  const upper = [...carriage(P), ...equilibrators(P, deg), gun];
  if (o.shield) upper.push(...shield(P));
  const root = group([buildPlatform(P), group(upper, { name: 'f36-upper' })], { name: 'flak36' });

  // re-centre on the plan bounds (the pads already rest on y = 0)
  root.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(root, true);
  root.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  const out = group([root]);
  out.name = 'flak36-root';
  return out;
}
