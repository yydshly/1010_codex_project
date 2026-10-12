/**
 * ZiS-5V assembly: chassis, wheels, front end, wooden cab and cargo platform.
 */
import { THREE, group } from '../../../core/kit';
import { D } from './dims';
import { buildWheel } from './wheels';
import { buildChassis } from './chassis';
import { buildFront } from './front';
import { buildCab } from './cab';
import { buildBed } from './bed';

function wheels(): THREE.Object3D[] {
  const kids: THREE.Object3D[] = [];
  const g = -D.axleY;
  const spins = [23, 151, 77, 211, 41, 183, 109, 262];
  let i = 0;
  for (const s of [1, -1]) {
    const w = buildWheel('front', spins[i++], g);
    w.position.set(s * D.wheelXF, D.axleY, D.zF);
    if (s < 0) w.scale.x = -1;
    kids.push(w);
  }
  for (const s of [1, -1]) {
    const o = buildWheel('dualOuter', spins[i++], g);
    o.position.set(s * (D.dualX + D.dualOff), D.axleY, D.zR);
    if (s < 0) o.scale.x = -1;
    const n = buildWheel('dualInner', spins[i++], g);
    n.position.set(s * (D.dualX - D.dualOff), D.axleY, D.zR);
    if (s > 0) n.scale.x = -1;
    kids.push(o, n);
  }
  return kids;
}

export function buildZis5(): THREE.Object3D {
  return group([buildChassis(), buildFront(), buildCab(), buildBed(), ...wheels()], { name: 'zis-5v' });
}
