/**
 * M3A1 interior (open top, so it must read from above): three front seats, steering wheel and column,
 * instrument panel, gear and transfer levers, pedals, the two fuel tanks at the front of the troop
 * compartment and the inward-facing side benches with back pads and ammunition lockers underneath.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import type { Pal } from './palette';
import { type V3, merge, xf, box, cushionGeo, cylX } from '../willys-mb/util';

const W = D.W, F = D.floorY;

function seatCushion(w: number, d: number, h: number, p: V3, rot: V3 = [0, 0, 0]): THREE.BufferGeometry {
  const g = cushionGeo(w, h, d, { r: 0.025, crown: 0.012, border: 0.03, sag: 0.006, seg: 0.03 });
  return xf(g, p, rot);
}

export function interior(P: Pal): THREE.Object3D {
  const paint: THREE.BufferGeometry[] = [], seat: THREE.BufferGeometry[] = [], black: THREE.BufferGeometry[] = [], steel: THREE.BufferGeometry[] = [], glass: THREE.BufferGeometry[] = [];

  // ---- front seats (driver on the left = +X, centre, right under the ring mount)
  const seatZ = 0.52;
  for (const x of [0.5, 0.0, -0.48]) {
    const w = 0.4;
    paint.push(box(w - 0.04, 0.3, 0.36, [x, F + 0.15, seatZ], 0.01)); // pedestal / locker
    seat.push(seatCushion(w, 0.4, 0.09, [x, F + 0.345, seatZ]));
    // back pad on a frame, slightly reclined
    seat.push(seatCushion(w, 0.44, 0.08, [x, F + 0.66, seatZ - 0.24], [-80, 0, 0]));
    paint.push(box(w - 0.02, 0.5, 0.02, [x, F + 0.64, seatZ - 0.3], 0.004, [10, 0, 0]));
  }

  // ---- instrument panel on the firewall, steering column and wheel
  paint.push(box(1.7, 0.16, 0.05, [0, 1.44, D.zCab - 0.03], 0.01));
  for (const [gx, gr] of [[0.62, 0.04], [0.5, 0.045], [0.38, 0.04], [0.26, 0.03]] as [number, number][]) {
    black.push(cylX(gr, 0.01, [0, 0, 0], 20).rotateY(Math.PI / 2).translate(gx, 1.45, D.zCab - 0.058));
    glass.push(cylX(gr - 0.004, 0.003, [0, 0, 0], 20).rotateY(Math.PI / 2).translate(gx, 1.45, D.zCab - 0.065));
  }
  const col0: V3 = [0.5, 1.12, D.zCab - 0.02];
  const col1: V3 = [0.5, 1.6, 0.8];
  steel.push(G.rod(col0, col1, 0.028, 12));
  const dir = new THREE.Vector3(col1[0] - col0[0], col1[1] - col0[1], col1[2] - col0[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().negate());
  const wheel: THREE.BufferGeometry[] = [G.torus(0.22, 0.014, 8, 48)];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    wheel.push(G.rod([0, 0, 0.01], [Math.cos(a) * 0.215, Math.sin(a) * 0.215, 0], 0.008, 6));
  }
  wheel.push(G.cyl(0.04, 0.045, 0.04, 16).rotateX(Math.PI / 2).translate(0, 0, 0.015));
  const wg = merge(wheel);
  wg.applyQuaternion(q);
  wg.translate(col1[0] + dir.x * 0.02, col1[1] + dir.y * 0.02, col1[2] + dir.z * 0.02);
  black.push(wg);

  // ---- levers (gear, transfer, front-drive, hand brake) and pedals
  for (const [x, z, lean] of [[0.23, 0.86, -14], [0.17, 0.9, -8], [0.11, 0.86, -18], [0.3, 0.8, -6]] as [number, number, number][]) {
    const lv = G.rod([0, 0, 0], [0, 0.46, 0], 0.01, 8);
    xf(lv, [x, F, z], [lean, 0, 0]);
    steel.push(lv);
    const knob = new THREE.SphereGeometry(0.022, 10, 8);
    const tip = new THREE.Vector3(0, 0.46, 0).applyEuler(new THREE.Euler(G.deg(lean), 0, 0));
    knob.translate(x + tip.x, F + tip.y, z + tip.z);
    black.push(knob);
  }
  paint.push(box(0.2, 0.05, 0.16, [0.2, F + 0.025, 0.86], 0.01));
  for (const x of [0.62, 0.48, 0.36]) {
    const pd = G.rod([0, 0, 0], [0, 0.22, 0], 0.009, 8);
    xf(pd, [x, F, D.zCab - 0.1], [-35, 0, 0]);
    steel.push(pd);
    steel.push(box(0.07, 0.012, 0.05, [x, F + 0.18, D.zCab - 0.22], 0.003, [-20, 0, 0]));
  }

  // ---- fuel tanks at the front corners of the troop compartment
  for (const s of [1, -1]) {
    paint.push(box(0.42, 0.52, 0.34, [s * (W - 0.24), F + 0.26, -0.07], 0.03));
    steel.push(G.cyl(0.035, 0.035, 0.04, 14).translate(s * (W - 0.24), F + 0.54, -0.07));
    paint.push(box(0.44, 0.03, 0.02, [s * (W - 0.24), F + 0.4, 0.105], 0.004));
  }

  // ---- side benches: seat cushions on ammunition lockers, back pads on the side plates
  const zb0 = -0.3, zb1 = D.zRearPlate + 0.05;
  const nSeg = 5;
  const segL = (zb0 - zb1) / nSeg;
  for (const s of [1, -1]) {
    const xi = s * (W - 0.23);
    paint.push(box(0.42, 0.36, zb0 - zb1, [xi + s * 0.01, F + 0.18, (zb0 + zb1) / 2], 0.012));
    // locker lid lines / hasps
    for (let i = 0; i < nSeg; i++) {
      const zc = zb0 - (i + 0.5) * segL;
      steel.push(box(0.012, 0.04, 0.05, [s * (W - 0.44) - s * 0.006, F + 0.3, zc], 0.003));
      seat.push(seatCushion(0.4, segL - 0.02, 0.085, [xi, F + 0.4, zc]));
      seat.push(seatCushion(0.4, segL - 0.03, 0.07, [s * (W - T2()), F + 0.72, zc], [0, 0, s * 90]));
    }
    // rifle brackets along the top of the back pads
    for (let i = 0; i <= nSeg; i++) {
      const z = zb0 - i * segL;
      steel.push(box(0.05, 0.02, 0.03, [s * (W - 0.03), 1.84, z], 0.004));
    }
  }
  // ---- .30 cal pintle sockets on the rear top corners and side tops
  for (const s of [1, -1]) {
    for (const z of [-1.0, D.zRearPlate + 0.2]) {
      paint.push(box(0.05, 0.12, 0.06, [s * (W - 0.035), D.top - 0.07, z], 0.006));
      steel.push(G.cyl(0.02, 0.02, 0.06, 12).translate(s * (W - 0.035), D.top + 0.02, z));
    }
  }

  return group([
    part(merge(paint), P.paint),
    part(merge(seat), P.seat),
    part(merge(black), P.black),
    part(merge(steel), P.steel),
    part(merge(glass), P.glass),
  ]);
}

/** back pad offset from the side plate outer face: plate thickness + half pad thickness */
function T2() {
  return D.t + 0.04;
}
