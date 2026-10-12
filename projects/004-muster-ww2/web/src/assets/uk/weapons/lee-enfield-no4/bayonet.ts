/**
 * No. 4 Mk II spike bayonet (round-section spike, 8 in / 200 mm blade, 10 in / 250 mm overall), fixed:
 * the socket slides over the muzzle up to the foresight block and locks on the barrel lugs with a
 * spring catch. R-frame (see stock.ts).
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { latheZ, cylX } from '../common/geo';
import type { UkwMats } from '../common/materials';
import { RM } from './metal';

const SOCKET_REAR = RM.fsFront + 0.0008;
const SOCKET_FRONT = SOCKET_REAR + 0.05;

export const NO4_BAYONET = {
  socketRear: SOCKET_REAR,
  socketFront: SOCKET_FRONT,
  pointZ: SOCKET_REAR + 0.25,
};

export function buildNo4Bayonet(m: UkwMats, hi: boolean): THREE.Object3D {
  const seg = hi ? 32 : 20;
  const z0 = SOCKET_REAR, z1 = SOCKET_FRONT, zp = NO4_BAYONET.pointZ;
  const out: THREE.Object3D[] = [];
  // socket: tube over the muzzle and lugs, closed front shoulder tapering into the spike
  out.push(
    part(
      latheZ(
        [
          [0.0106, z0],
          [0.0117, z0 + 0.0004],
          [0.0121, z0 + 0.002],
          [0.0121, z1 - 0.012],
          [0.0114, z1 - 0.006],
          [0.0092, z1 - 0.001],
          [0.0072, z1],
          [0.0062, z1 + 0.003],
          [0, z1 + 0.003],
          [0, z0 + 0.034],
          [0.0106, z0 + 0.034],
        ],
        seg,
        35,
      ),
      m.black,
    ),
  );
  // raised locking ring near the rear of the socket
  out.push(part(latheZ([[0.012, z0 + 0.006], [0.0128, z0 + 0.0068], [0.0128, z0 + 0.0122], [0.012, z0 + 0.013]], seg, 35), m.black));
  // spring catch on the right side of the socket: leaf, pivot and thumb button
  out.push(part(G.rbox(0.0024, 0.0062, 0.026, 0.0008, 2), m.blued, { p: [-0.0128, 0, z0 + 0.023] }));
  out.push(part(cylX(0.0016, -0.0146, -0.0134, 12), m.blued, { p: [0, 0, z0 + 0.031] }));
  out.push(part(G.rbox(0.0036, 0.0078, 0.0062, 0.0012, 2), m.blued, { p: [-0.0138, 0, z0 + 0.0115] }));
  for (let i = 0; i < 3; i++) out.push(part(G.box(0.0007, 0.0066, 0.0007), m.blued, { p: [-0.0158, 0, z0 + 0.0096 + i * 0.0018] }));
  // round spike, tapering, sharpened to a point over the last 30 mm
  const zs = z1 + 0.003;
  out.push(
    part(
      latheZ(
        [
          [0, zs - 0.001],
          [0.0056, zs - 0.001],
          [0.0056, zs + 0.004],
          [0.0049, zs + 0.012],
          [0.0043, zp - 0.075],
          [0.0038, zp - 0.03],
          [0.0022, zp - 0.012],
          [0.0003, zp - 0.0005],
          [0, zp],
        ],
        hi ? 24 : 16,
        35,
      ),
      m.blued,
    ),
  );
  const g = group(out);
  g.name = 'no4-bayonet';
  return g;
}
