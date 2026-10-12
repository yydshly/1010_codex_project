/**
 * PaK 40 assembler: builds every sub-assembly in the raw frame (axle centre at z = 0), applies the
 * trail configuration, pitches the gun about the wheel axis until the spades (deployed) or the
 * trail-end skids (closed) touch y = 0, then re-centres the model on its footprint.
 */
import { THREE, group } from '../../../core/kit';
import { palette } from './palette';
import { ordnance } from './ordnance';
import { carriage } from './carriage';
import { upperShield, lowerShield } from './shield';
import { trails } from './trails';
import { wheel } from './wheel';
import { WHEEL_X, WHEEL_Y } from './layout';

export interface Pak40Opts {
  trails: 'deployed' | 'closed';
  detail: 'high' | 'low';
}

/** Footprint centre of the deployed gun along Z in the raw frame (kept for both configurations). */
const Z_CENTRE = -0.44;

function contactMinY(root: THREE.Object3D, contacts: THREE.Mesh[]): number {
  root.updateMatrixWorld(true);
  let min = Infinity;
  const v = new THREE.Vector3();
  for (const m of contacts) {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
      if (v.y < min) min = v.y;
    }
  }
  return min;
}

export function buildPak40(o: Pak40Opts): THREE.Group {
  const P = palette();
  const hi = o.detail !== 'low';
  const closed = o.trails === 'closed';

  const body = group([ordnance(P), group(carriage(P)), group(upperShield(P)), group(lowerShield(P, closed)), trails(P, closed)]);
  body.position.set(0, -WHEEL_Y, 0);
  const pivot = group([body]);
  pivot.position.set(0, WHEEL_Y, 0);

  const wl = wheel(P, hi);
  wl.position.set(WHEEL_X, WHEEL_Y, 0);
  const wr = wheel(P, hi);
  wr.position.set(-WHEEL_X, WHEEL_Y, 0);
  wr.scale.x = -1;

  const root = group([pivot, wl, wr]);
  root.name = 'pak40';

  // pitch about the wheel axis so the lowest contact (spade edge / skid) sits exactly on y = 0
  const contacts: THREE.Mesh[] = [];
  body.traverse((c) => {
    if ((c as THREE.Mesh).isMesh && c.userData.contact) contacts.push(c as THREE.Mesh);
  });
  let lo = -10 * (Math.PI / 180), hi2 = 10 * (Math.PI / 180);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi2) / 2;
    pivot.rotation.x = mid;
    // rotating +X lifts the rear (trails), so minY increases with the angle
    if (contactMinY(root, contacts) > 2e-6) hi2 = mid;
    else lo = mid;
  }
  pivot.rotation.x = (lo + hi2) / 2;
  for (const c of contacts) c.userData.contact = undefined;

  root.position.z = -Z_CENTRE;
  const out = group([root]);
  out.name = 'pak40-root';
  return out;
}
