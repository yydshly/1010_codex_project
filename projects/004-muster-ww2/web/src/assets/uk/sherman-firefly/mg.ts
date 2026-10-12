/**
 * Coaxial .30 cal Browning M1919A4 of the Sherman Firefly Vc (copied from the M4A3(75)W model):
 * the exposed, perforated barrel jacket. Gun-local frame: bore along +Z, +Y up, origin at the rear
 * of the exposed jacket.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Pal } from './palette';
import { latheZ, merge } from './util';

/** Exposed .30 cal M1919A4 barrel jacket (perforated) along +Z from the origin, length L. */
export function m1919Jacket(P: Pal, L: number): THREE.Group {
  const ps: THREE.Object3D[] = [];
  ps.push(part(latheZ([[0.0, 0.0], [0.024, 0.0], [0.024, L - 0.04], [0.02, L - 0.03], [0.02, L], [0.0, L]], 16, 40), P.gun));
  ps.push(part(latheZ([[0.0, L - 0.005], [0.011, L - 0.005], [0.011, L + 0.02], [0.0, L + 0.02]], 10, 40), P.gun));
  ps.push(part(G.cyl(0.0035, 0.0035, 0.004, 6), P.void, { p: [0, 0, L + 0.02], r: [90, 0, 0] }));
  const holes: THREE.BufferGeometry[] = [];
  const rows = Math.max(1, Math.floor((L - 0.07) / 0.03));
  for (let i = 0; i < rows; i++) for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + (i % 2) * 0.52;
    const h = new THREE.CylinderGeometry(0.0065, 0.0065, 0.004, 8);
    h.rotateZ(Math.PI / 2);
    h.rotateZ(a);
    h.translate(Math.cos(a) * 0.0235, Math.sin(a) * 0.0235, 0.03 + i * 0.03);
    holes.push(h);
  }
  ps.push(part(merge(holes), P.void));
  return group(ps);
}
