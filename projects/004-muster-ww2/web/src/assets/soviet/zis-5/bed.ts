/**
 * ZiS-5V cargo platform: wooden longitudinal sills on the frame, cross bearers and floor boards,
 * fixed side boards and headboard (only the tailgate drops on the wartime truck) of four planks
 * each, outside wooden stakes in steel pockets, steel corner irons, tailgate hinges and latches,
 * rope hooks; the single tail lamp and the spare wheel in its carrier under the rear
 * overhang.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V3, merge, xf, box, cylX, cylZ, latheZ, bentRod, type V2 } from './util';
import { buildWheel } from './wheels';

const BO = D.bedX - 0.04; // outer face of the side boards (stakes stand proud to bedX)
const TH = 0.03;
const Z0 = D.zBed0, Z1 = D.zBed1;
const FLOOR = D.bedFloor;
const YB = FLOOR + 0.003;
const YT = YB + D.sideH;
const NPL = 4;
const PL = D.sideH / NPL;
const STAKES = [Z0 - 0.08, -0.62, -1.42, -2.2, Z1 + 0.08];

function platform(): { chassis: THREE.BufferGeometry[]; woodX: THREE.BufferGeometry[]; woodZ: THREE.BufferGeometry[]; floor: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const chassis: THREE.BufferGeometry[] = [];
  const woodX: THREE.BufferGeometry[] = [];
  const woodZ: THREE.BufferGeometry[] = [];
  const floor: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const len = Z0 - Z1;
  const zc = (Z0 + Z1) / 2;
  const sillTop = 0.95;
  // wooden sills on the frame, held by U-bolt clamps
  for (const s of [1, -1]) {
    woodZ.push(box(0.09, sillTop - D.frameTop, len - 0.02, [s * D.frameX, (sillTop + D.frameTop) / 2, zc], 0.006));
    for (const z of [-0.2, -1.0, -2.0, -2.7]) {
      steel.push(bentRod([[s * (D.frameX - 0.05), sillTop + 0.002, z], [s * (D.frameX - 0.05), D.frameBot - 0.02, z], [s * (D.frameX + 0.05), D.frameBot - 0.02, z], [s * (D.frameX + 0.05), sillTop + 0.002, z]], 0.007, 0.012, 6));
      chassis.push(box(0.12, 0.012, 0.05, [s * D.frameX, D.frameBot - 0.026, z], 0.003));
    }
  }
  // cross bearers
  const nB = 9;
  for (let i = 0; i < nB; i++) {
    const z = Z0 - 0.07 - (i * (len - 0.14)) / (nB - 1);
    woodX.push(box(2 * BO - 0.01, FLOOR - 0.045 - sillTop, 0.08, [0, (FLOOR - 0.045 + sillTop) / 2, z], 0.006));
  }
  // front and rear edge beams covering the floor-board ends
  for (const z of [Z0 - 0.016, Z1 + 0.016]) woodX.push(box(2 * BO, 0.1, 0.032, [0, FLOOR - 0.048, z], 0.005));
  // side edge beams under the boards
  for (const s of [1, -1]) woodZ.push(box(0.06, 0.1, len, [s * (BO - 0.03), FLOOR - 0.05, zc], 0.006));
  // floor boards along Z
  const nF = 14;
  const fw = (2 * (BO - TH)) / nF;
  for (let i = 0; i < nF; i++) floor.push(box(fw - 0.004, 0.042, len - 2 * TH - 0.01, [-(BO - TH) + (i + 0.5) * fw, FLOOR - 0.021, zc], 0.004));
  return { chassis, woodX, woodZ, floor, steel };
}

function sidesAndEnds(): { woodZ: THREE.BufferGeometry[]; woodX: THREE.BufferGeometry[]; woodY: THREE.BufferGeometry[]; body: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const woodZ: THREE.BufferGeometry[] = [];
  const woodX: THREE.BufferGeometry[] = [];
  const woodY: THREE.BufferGeometry[] = [];
  const body: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const L = Z0 - Z1 - 2 * TH, zc = (Z0 + Z1) / 2;
  for (const s of [1, -1]) {
    const x = s * (BO - TH / 2);
    for (let i = 0; i < NPL; i++) woodZ.push(box(TH, PL - 0.005, L, [x, YB + (i + 0.5) * PL, zc], 0.005));
    // outside stakes in steel pockets, with the top capping strip
    for (const z of STAKES) {
      woodY.push(box(0.04, D.sideH + 0.02, 0.06, [s * (BO + 0.02), YB + D.sideH / 2, z], 0.006));
      body.push(box(0.05, 0.12, 0.075, [s * (BO + 0.02), FLOOR - 0.04, z], 0.003));
      for (const y of [YB + 0.12, YT - 0.1]) steel.push(cylX(0.009, 0.1, [s * (BO + 0.01), y, z], 8));
    }
    body.push(box(TH + 0.01, 0.018, L, [x, YT + 0.004, zc], 0.003));
    // rope hooks
    for (let z = Z0 - 0.35; z > Z1 + 0.2; z -= 0.4) steel.push(bentRod([[s * (BO + 0.003), YB + 0.05, z], [s * (BO + 0.02), YB + 0.045, z], [s * (BO + 0.022), YB + 0.07, z]], 0.004, 0.008, 6));
    // nail heads along the stakes (bolts through the planks)
    const bolts: { p: V3; n: V3 }[] = [];
    for (const z of STAKES) for (let i = 0; i < NPL; i++) bolts.push({ p: [s * (BO + 0.04), YB + (i + 0.5) * PL, z], n: [s, 0, 0] });
    steel.push(G.scatter(G.boltHead(0.014, 0.006), bolts));
  }
  // headboard (fixed) and tailgate
  for (const [zf, dir] of [[Z0, 1], [Z1, -1]] as [number, number][]) {
    const z = zf - dir * (TH / 2);
    for (let i = 0; i < NPL; i++) woodX.push(box(2 * BO, PL - 0.005, TH, [0, YB + (i + 0.5) * PL, z], 0.005));
    body.push(box(2 * BO + 0.01, 0.018, TH + 0.01, [0, YT + 0.004, z], 0.003));
    for (const x of [-0.6, 0, 0.6]) woodY.push(box(0.07, D.sideH - 0.01, 0.035, [x, YB + D.sideH / 2, zf + dir * 0.017], 0.006));
    // corner irons
    for (const s of [1, -1]) {
      body.push(box(0.006, D.sideH, 0.08, [s * (BO + 0.003), YB + D.sideH / 2, zf - dir * 0.04], 0.002));
      body.push(box(0.08, D.sideH, 0.006, [s * (BO - 0.04), YB + D.sideH / 2, zf + dir * 0.003], 0.002));
    }
    if (dir < 0) {
      for (const x of [-0.75, 0.75]) steel.push(cylX(0.013, 0.1, [x, YB - 0.006, zf - 0.006], 12));
      // side latches
      for (const s of [1, -1]) {
        steel.push(bentRod([[s * (BO + 0.004), YT - 0.08, zf + 0.06], [s * (BO + 0.03), YT - 0.08, zf + 0.04], [s * (BO + 0.03), YT - 0.08, zf - 0.03]], 0.008, 0.012, 8));
      }
    }
  }
  return { woodZ, woodX, woodY, body, steel };
}

function lamps(): { body: THREE.BufferGeometry[]; red: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const red: THREE.BufferGeometry[] = [];
  const x = 0.78, y = 0.88, z = Z1 + 0.06;
  body.push(box(0.03, 0.12, 0.04, [x, y + 0.07, z + 0.02], 0.004));
  body.push(xf(latheZ([[0.0, -0.05], [0.042, -0.045], [0.05, -0.02], [0.052, 0.01]], 24, 40), [x, y, z - 0.01], [0, 180, 0]));
  red.push(xf(latheZ(([[0.0, 0.013], [0.028, 0.011], [0.045, 0.006], [0.047, 0.0]] as V2[]).reverse(), 24, 60), [x, y, z - 0.02], [0, 180, 0]));
  return { body, red };
}

function spareWheel(): THREE.Object3D[] {
  const zc = -2.42, yc = 0.52;
  const w = buildWheel('spare', 70);
  w.position.set(0, yc, zc);
  w.rotation.z = -Math.PI / 2;
  const carrier: THREE.BufferGeometry[] = [];
  for (const dz of [-0.26, 0.26]) carrier.push(bentRod([[-D.frameX, D.frameBot - 0.01, zc + dz], [-0.48, yc - 0.105, zc + dz], [0.48, yc - 0.105, zc + dz], [D.frameX, D.frameBot - 0.01, zc + dz]], 0.012, 0.06, 8));
  carrier.push(box(0.06, 0.16, 0.06, [0, D.frameBot - 0.06, zc], 0.006));
  carrier.push(cylX(0.02, 0.9, [0, D.frameBot - 0.02, zc], 10));
  return [w, part(merge(carrier), P.chassis())];
}

export function buildBed(): THREE.Object3D {
  const pf = platform();
  const se = sidesAndEnds();
  const lp = lamps();
  return group([
    part(merge(pf.chassis), P.chassis()),
    part(merge(pf.floor), P.floor()),
    part(merge([...pf.woodZ, ...se.woodZ]), P.woodZ()),
    part(merge([...pf.woodX, ...se.woodX]), P.woodX()),
    part(merge(se.woodY), P.woodY()),
    part(merge([...se.body, ...lp.body]), P.body()),
    part(merge([...pf.steel, ...se.steel]), P.steel()),
    part(merge(lp.red), P.redLens()),
    ...spareWheel(),
  ]);
}

export { cylZ };
