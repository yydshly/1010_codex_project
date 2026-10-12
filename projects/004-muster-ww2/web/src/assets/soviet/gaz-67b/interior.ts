/**
 * GAZ-67B interior: two separate front seats and a two-place rear bench (pressed-steel bases
 * and back pans with leatherette pads), four-spoke steering wheel with bent-wood rim on an
 * inclined column, instrument cluster, pedals, gear and transfer levers, grab handle.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V3, merge, xf, box, bentRod, cylZ } from './util';

function frontSeat(x: number): { steel: THREE.BufferGeometry[]; pad: THREE.BufferGeometry[] } {
  const steel: THREE.BufferGeometry[] = [];
  const pad: THREE.BufferGeometry[] = [];
  const y0 = D.floorY;
  steel.push(box(0.4, 0.165, 0.4, [x, y0 + 0.0825, -0.2], 0.01));
  pad.push(box(0.44, 0.09, 0.45, [x, y0 + 0.21, -0.215], 0.035));
  // back pan + pad, tilted back 10 deg
  steel.push(box(0.44, 0.4, 0.025, [x, 0.985, -0.465], 0.01, [-10, 0, 0]));
  pad.push(box(0.4, 0.34, 0.06, [x, 0.985, -0.425], 0.025, [-10, 0, 0]));
  for (const s of [1, -1]) steel.push(bentRod([[x + s * 0.18, y0 + 0.16, -0.38], [x + s * 0.18, 0.8, -0.44]], 0.009, 0.01));
  return { steel, pad };
}

function steering(): THREE.Object3D {
  const c = new THREE.Vector3(0.33, 1.115, 0.285);
  const d = new THREE.Vector3(0, -Math.sin(G.deg(37)), Math.cos(G.deg(37)));
  const col = G.rod(c.clone().addScaledVector(d, 0.03), c.clone().addScaledVector(d, (D.zFire + 0.35 - c.z) / d.z), 0.02, 14);
  // wheel in local XY (axis Z), then tilted 37 deg about X
  const rim = G.torus(0.1925, 0.0125, 10, 64);
  const spokes: THREE.BufferGeometry[] = [];
  for (const a of [35, 145, 215, 325]) {
    const r = G.deg(a);
    spokes.push(G.rod([Math.cos(r) * 0.03, Math.sin(r) * 0.03, 0.03], [Math.cos(r) * 0.186, Math.sin(r) * 0.186, 0], 0.0055, 8));
  }
  const hub = merge([cylZ(0.036, 0.045, [0, 0, 0.035], 24), cylZ(0.024, 0.012, [0, 0, 0.006], 20)]);
  const place = (g: THREE.BufferGeometry) => xf(g, [c.x, c.y, c.z], [37, 0, 0]);
  return group([
    part(place(rim), P.wood()),
    part(merge([place(merge(spokes)), col]), P.black()),
    part(place(hub), P.bakelite()),
  ]);
}

function dash(): THREE.Object3D {
  const z = D.zDash;
  const black: THREE.BufferGeometry[] = [box(0.28, 0.105, 0.01, [0.1, 0.935, z - 0.005], 0.004)];
  const bezel: THREE.BufferGeometry[] = [];
  const face: THREE.BufferGeometry[] = [];
  const gauges: [number, number, number][] = [
    [0.1, 0.935, 0.036],
    [0.012, 0.957, 0.018],
    [0.012, 0.912, 0.018],
    [0.188, 0.957, 0.018],
    [0.188, 0.912, 0.018],
  ];
  for (const [x, y, r] of gauges) {
    const ring = G.torus(r, 0.0035, 8, 32);
    ring.translate(x, y, z - 0.012);
    bezel.push(ring);
    face.push(cylZ(r, 0.002, [x, y, z - 0.011], 28));
    // needle
    face.push(box(0.002, r * 0.8, 0.001, [x - r * 0.25, y + r * 0.2, z - 0.0125], 0.0004, [0, 0, 50]));
  }
  // knobs and switches
  const knobs: THREE.BufferGeometry[] = [];
  for (const [x, y] of [[-0.06, 0.88], [-0.13, 0.88], [0.27, 0.88], [0.33, 0.88]]) {
    knobs.push(cylZ(0.011, 0.02, [x, y, z - 0.012], 14));
    knobs.push(cylZ(0.004, 0.012, [x, y, z - 0.004], 8));
  }
  // passenger grab handle
  const grab = bentRod([[-0.25, 0.945, z - 0.002], [-0.27, 0.945, z - 0.045], [-0.53, 0.945, z - 0.045], [-0.55, 0.945, z - 0.002]], 0.0095, 0.02);
  return group([
    part(merge([...black, ...face]), P.black()),
    part(merge(bezel), P.steel()),
    part(merge(knobs), P.bakelite()),
    part(grab, P.body()),
  ]);
}

function controls(): THREE.Object3D {
  const steel: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const knob: THREE.BufferGeometry[] = [];
  const rubber: THREE.BufferGeometry[] = [];
  // clutch and brake pedals through the toe board, accelerator on the toe board
  for (const x of [0.44, 0.27]) {
    black.push(bentRod([[x, 0.615, 0.585], [x, 0.66, 0.54], [x, 0.72, 0.51]], 0.009, 0.03));
    steel.push(box(0.075, 0.012, 0.055, [x, 0.735, 0.505], 0.004, [-55, 0, 0]));
  }
  steel.push(box(0.05, 0.008, 0.11, [0.17, 0.62, 0.595], 0.003, [-50, 0, 0]));
  // gear lever and transfer-case lever on the tunnel, with rubber boots
  const levers: [V3, V3, number][] = [
    [[0, 0.702, 0.4], [0, 0.99, 0.3], 0.022],
    [[0.06, 0.69, 0.22], [0.075, 0.9, 0.16], 0.018],
  ];
  for (const [a, b, kr] of levers) {
    black.push(bentRod([a, [a[0], a[1] + 0.12, a[2] - 0.02], b], 0.0075, 0.06));
    const k = new THREE.SphereGeometry(kr, 16, 12);
    k.translate(b[0], b[1], b[2]);
    knob.push(k);
    rubber.push(xf(G.cyl(0.012, 0.035, 0.05, 14), [a[0], a[1] + 0.02, a[2]]));
  }
  return group([part(merge(steel), P.steel()), part(merge(black), P.black()), part(merge(knob), P.bakelite()), part(merge(rubber), P.rubber())]);
}

export function buildInterior(): THREE.Object3D {
  const steel: THREE.BufferGeometry[] = [];
  const pad: THREE.BufferGeometry[] = [];
  for (const x of [0.33, -0.33]) {
    const s = frontSeat(x);
    steel.push(...s.steel);
    pad.push(...s.pad);
  }
  // rear bench between the wheelhouses, backrest across the tub
  steel.push(box(1.02, 0.18, 0.42, [0, D.floorY + 0.09, -0.86], 0.01));
  pad.push(box(1.02, 0.09, 0.44, [0, D.floorY + 0.225, -0.87], 0.035));
  steel.push(box(1.26, 0.3, 0.025, [0, 0.95, -1.15], 0.01, [-12, 0, 0]));
  pad.push(box(1.0, 0.26, 0.06, [0, 0.95, -1.11], 0.025, [-12, 0, 0]));
  return group([part(merge(steel), P.body()), part(merge(pad), P.seat()), steering(), dash(), controls()]);
}
