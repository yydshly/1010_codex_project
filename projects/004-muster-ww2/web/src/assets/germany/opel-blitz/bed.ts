/**
 * Opel Blitz cargo body (Pritsche): steel sub-frame sills on the chassis, wooden cross bearers
 * and floor boards, fixed headboard, hinged drop sides and tailgate of three planks with steel
 * capping, straps, hinges, corner latches and rope hooks; bow pockets, five removable bows with
 * wooden battens and an optional tarpaulin laced to the side boards. Also: rear mudguards over
 * the twin wheels, tail lamps and the convoy lamp, the tool box and the spare wheel carried
 * horizontally under the rear frame overhang.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import {
  type V2,
  type V3,
  type Station,
  sideSlab,
  frontSlab,
  merge,
  xf,
  box,
  cylX,
  cylZ,
  latheZ,
  bentRod,
  spline2,
  sweep,
  sheetSection,
  offset2,
  profileStations,
} from './util';
import { buildWheel } from './wheels';

export type Cover = 'canvas' | 'bows' | 'open';

const BX = D.bedX; // outer face of the side boards
const TH = 0.028; // board thickness
const Z0 = D.zBed0, Z1 = D.zBed1;
const FLOOR = D.bedFloor;
const YB = FLOOR + 0.003; // bottom of the side boards
const YT = YB + D.sideH; // top of the side boards
const PLANK = D.sideH / 3;
/** Bow stations along Z (front to rear). */
const BOWS = [Z0 - 0.06, -0.455, -1.29, -2.125, Z1 + 0.05];
const LEG_X = BX + 0.016; // bow legs sit in pockets outside the boards

/* ------------------------------------------------------------------ platform */

function platform(): { chassis: THREE.BufferGeometry[]; woodX: THREE.BufferGeometry[]; floor: THREE.BufferGeometry[]; body: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const chassis: THREE.BufferGeometry[] = [];
  const woodX: THREE.BufferGeometry[] = [];
  const floor: THREE.BufferGeometry[] = [];
  const body: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const len = Z0 - Z1 - 0.03;
  const zc = (Z0 + Z1) / 2;
  const sillTop = 0.95;
  // longitudinal sills (channel) on the frame, with clamp plates
  for (const s of [1, -1]) {
    chassis.push(box(0.07, sillTop - D.frameTop, len, [s * D.frameX, (sillTop + D.frameTop) / 2, zc], 0.004));
    for (const z of [0.2, -0.9, -2.0, -2.75]) {
      chassis.push(box(0.012, 0.2, 0.06, [s * (D.frameX + 0.036), D.frameTop + 0.03, z], 0.003));
      steel.push(bentRod([[s * (D.frameX + 0.045), sillTop - 0.02, z], [s * (D.frameX + 0.045), D.frameBot + 0.02, z], [s * (D.frameX - 0.05), D.frameBot - 0.005, z]], 0.007, 0.01, 6));
    }
  }
  // cross bearers (painted wood, grain across)
  const nB = 10;
  for (let i = 0; i < nB; i++) {
    const z = Z0 - 0.06 - (i * (Z0 - Z1 - 0.12)) / (nB - 1);
    woodX.push(box(2 * BX - 0.04, FLOOR - 0.04 - sillTop, 0.075, [0, (FLOOR - 0.04 + sillTop) / 2, z], 0.006));
  }
  // outer edge beams (steel angle) along the sides and at the rear
  for (const s of [1, -1]) {
    body.push(box(0.035, 0.11, len + 0.02, [s * (BX - 0.018), FLOOR - 0.055, zc], 0.004));
  }
  body.push(box(2 * BX, 0.11, 0.035, [0, FLOOR - 0.055, Z1 + 0.035], 0.004));
  // floor boards along Z
  const nF = 15;
  const fw = (2 * (BX - 0.035)) / nF;
  for (let i = 0; i < nF; i++) {
    const x = -(BX - 0.035) + (i + 0.5) * fw;
    floor.push(box(fw - 0.004, 0.036, len - 0.01, [x, FLOOR - 0.018, zc - 0.01], 0.004));
  }
  return { chassis, woodX, floor, body, steel };
}

/* ------------------------------------------------------------------ boards */

/** Three-plank board in the plane x = const (side) from z0 to z1. */
function sideBoard(s: number, za: number, zb: number): { wood: THREE.BufferGeometry[]; body: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const wood: THREE.BufferGeometry[] = [];
  const body: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const x = s * (BX - TH / 2);
  const L = za - zb, zc = (za + zb) / 2;
  for (let i = 0; i < 3; i++) wood.push(box(TH, PLANK - 0.004, L, [x, YB + (i + 0.5) * PLANK, zc], 0.005));
  // top capping (U section) and bottom strip
  body.push(box(TH + 0.012, 0.024, L + 0.004, [x, YT - 0.006, zc], 0.004));
  body.push(box(0.006, 0.04, L, [s * (BX + 0.002), YB + 0.022, zc], 0.002));
  // vertical straps on the outside (also carry the bow pockets)
  const straps = [za - 0.05, ...BOWS.slice(1, -1), zb + 0.05];
  for (const z of straps) body.push(box(0.006, D.sideH - 0.02, 0.05, [s * (BX + 0.003), YB + D.sideH / 2, z], 0.002));
  // hinges: knuckle on the edge beam, strap up the board
  for (const z of [za - 0.35, (za + zb) / 2 + 0.4, (za + zb) / 2 - 0.4, zb + 0.35]) {
    steel.push(cylZ(0.012, 0.08, [s * (BX + 0.004), YB - 0.004, z], 12));
    body.push(box(0.006, 0.16, 0.045, [s * (BX + 0.004), YB + 0.08, z], 0.002));
  }
  // rope hooks along the bottom edge
  for (let z = za - 0.2; z > zb + 0.1; z -= 0.42) steel.push(bentRod([[s * (BX + 0.005), YB + 0.06, z], [s * (BX + 0.025), YB + 0.055, z], [s * (BX + 0.027), YB + 0.075, z]], 0.004, 0.008, 6));
  return { wood, body, steel };
}

/** Three-plank board across the bed (headboard / tailgate) at z = zf (outer face). */
function endBoard(zf: number, dir: number): { wood: THREE.BufferGeometry[]; body: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const wood: THREE.BufferGeometry[] = [];
  const body: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const z = zf - dir * (TH / 2);
  const W = 2 * BX;
  for (let i = 0; i < 3; i++) wood.push(box(W, PLANK - 0.004, TH, [0, YB + (i + 0.5) * PLANK, z], 0.005));
  body.push(box(W + 0.004, 0.024, TH + 0.012, [0, YT - 0.006, z], 0.004));
  body.push(box(W, 0.04, 0.006, [0, YB + 0.022, zf + dir * 0.002], 0.002));
  for (const x of [-0.75, -0.25, 0.25, 0.75]) body.push(box(0.05, D.sideH - 0.02, 0.006, [x, YB + D.sideH / 2, zf + dir * 0.003], 0.002));
  // corner posts (steel angle) and latches
  for (const s of [1, -1]) {
    body.push(box(0.045, D.sideH + 0.01, 0.045, [s * (BX - 0.012), YB + D.sideH / 2, zf - dir * 0.012], 0.004));
    steel.push(bentRod([[s * (BX + 0.004), YT - 0.06, zf - dir * 0.04], [s * (BX + 0.018), YT - 0.06, zf - dir * 0.02], [s * (BX + 0.018), YT - 0.06, zf + dir * 0.02]], 0.007, 0.01, 8));
    steel.push(xf(G.cyl(0.011, 0.011, 0.05, 10), [s * (BX + 0.018), YT - 0.06, zf + dir * 0.025], [90, 0, 0]));
  }
  if (dir < 0) {
    // tailgate hinges at the bottom
    for (const x of [-0.7, 0, 0.7]) steel.push(cylX(0.012, 0.09, [x, YB - 0.004, zf + dir * 0.004], 12));
  }
  return { wood, body, steel };
}

/* ------------------------------------------------------------------ bows + tarpaulin */

/** Bow centre line (x, y), left bottom -> crown -> right bottom. */
function bowLine(off = 0): V2[] {
  const half = spline2(
    [
      [LEG_X, 1.24],
      [LEG_X, 1.7],
      [LEG_X, 2.1],
      [LEG_X - 0.04, 2.27],
      [LEG_X - 0.14, 2.39],
      [LEG_X - 0.33, 2.475],
      [0.5, 2.515],
      [0, 2.53],
    ],
    40,
  );
  const full: V2[] = [...half, ...half.slice(0, -1).reverse().map(([x, y]) => [-x, y] as V2)];
  if (off === 0) return full;
  // offset outwards (away from the bow's centre): travel is up the left leg -> over -> down the right
  return offset2(full, -off);
}

function bows(): { body: THREE.BufferGeometry[]; wood: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const wood: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const line = bowLine();
  for (const z of BOWS) {
    const pts: V3[] = line.map(([x, y]) => [x, y, z]);
    const nrm: V3[] = line.map((_, i) => {
      const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      return [dy / l, -dx / l, 0];
    });
    body.push(G.strap(pts, 0.045, 0.012, nrm, { smooth: false }));
  }
  // wooden battens under the bows: ridge + two shoulder battens
  const len = BOWS[0] - BOWS[BOWS.length - 1] + 0.1;
  const zc = (BOWS[0] + BOWS[BOWS.length - 1]) / 2;
  wood.push(box(0.06, 0.024, len, [0, 2.53 - 0.018, zc], 0.005));
  // shoulder battens: seated under the bows where the bow line passes x = 0.93
  const iS = line.findIndex(([x]) => x < 0.93);
  const pa = line[iS - 1], pb = line[iS + 1];
  const tl = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
  const inx = -(pb[1] - pa[1]) / tl, iny = (pb[0] - pa[0]) / tl; // inward (left of travel)
  const ang = (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180) / Math.PI;
  for (const s of [1, -1]) {
    const bx = line[iS][0] + inx * 0.018, by = line[iS][1] + iny * 0.018;
    wood.push(xf(G.rbox(0.055, 0.022, len, 0.005, 1), [s * bx, by, zc], [0, 0, s * (ang - 180)]));
    wood.push(box(0.022, 0.05, len, [s * (LEG_X - 0.018), 2.0, zc], 0.005));
  }
  // bow pockets (steel sleeves) on the outside of the side boards
  for (const s of [1, -1]) {
    for (const z of BOWS) {
      const zz = Math.min(Math.max(z, Z1 + 0.06), Z0 - 0.06);
      body.push(box(0.022, 0.26, 0.065, [s * (BX + 0.013), YT - 0.14, zz], 0.003));
      steel.push(cylX(0.006, 0.03, [s * (BX + 0.02), YT - 0.06, zz], 8));
    }
  }
  return { body, wood, steel };
}

/** Tarpaulin: sagging sheet over the bows, end panels and lacing. */
function tarpaulin(): { canvas: THREE.BufferGeometry[]; rope: THREE.BufferGeometry[] } {
  const canvas: THREE.BufferGeometry[] = [];
  const rope: THREE.BufferGeometry[] = [];
  const base = bowLine(0.012).filter(([, y]) => y >= 1.3 - 1e-6);
  // extend the hem a little lower on the outside of the boards
  const line: V2[] = [[base[0][0] + 0.003, 1.3], ...base.slice(1, -1), [base[base.length - 1][0] - 0.003, 1.3]];
  // resample to a fixed count
  const secLine = spline2(line, 72);
  const zA = Z0 + 0.02, zB = Z1 - 0.015;
  const stations: Station[] = [];
  const secs: V2[][] = [];
  const N = 44;
  for (let i = 0; i <= N; i++) {
    const z = zA + ((zB - zA) * i) / N;
    // sag between bows: 0 at a bow, max mid-bay
    let sag = 0;
    for (let k = 0; k < BOWS.length - 1; k++) {
      const a = BOWS[k], b = BOWS[k + 1];
      if (z <= a && z >= b) sag = Math.sin((Math.PI * (a - z)) / (a - b));
    }
    if (z > BOWS[0]) sag = 0.3 * Math.min(1, (z - BOWS[0]) / 0.1);
    if (z < BOWS[BOWS.length - 1]) sag = 0.3 * Math.min(1, (BOWS[BOWS.length - 1] - z) / 0.1);
    const sec = secLine.map(([x, y], j) => {
      const f = j / (secLine.length - 1);
      // crown sags more than the sides; small cloth ripples
      const top = Math.max(0, (y - 2.0) / 0.53);
      const d = sag * (0.009 + 0.004 * top) + 0.002 * Math.sin(z * 9.0 + f * 23.0) * Math.sin(f * Math.PI);
      const a = secLine[Math.max(0, j - 1)], b = secLine[Math.min(secLine.length - 1, j + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      // inward normal (left of travel) for the left-to-right travel
      return [x - (dy / l) * d, y + (dx / l) * d] as V2;
    });
    secs.push(sheetSection(sec, 0.004));
    stations.push({ p: new THREE.Vector3(0, 0, z), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0) });
  }
  canvas.push(sweep(secs, stations, true, 70));
  // end panels (front closed, rear with two laced flaps)
  canvas.push(frontSlab(secLine, 0.004, zA + 0.002, { bevel: 0.001 }));
  const leftHalf = secLine.filter(([x]) => x >= -0.03);
  const rightHalf = secLine.filter(([x]) => x <= 0.03);
  canvas.push(frontSlab([...leftHalf, [-0.03, 1.3]], 0.004, zB - 0.002, { bevel: 0.001 }));
  canvas.push(frontSlab([[0.03, 1.3], ...rightHalf], 0.004, zB - 0.007, { bevel: 0.001 }));
  // tie straps with buckles across the rear flaps
  for (const s of [1, -1]) {
    for (const y of [1.62, 2.02]) {
      canvas.push(box(0.05, 0.3, 0.004, [s * 0.18, y, zB - 0.011], 0.0015));
    }
  }
  // hem ropes along the lower edges and lashing down to the rope hooks
  for (const s of [1, -1]) {
    const x = s * (line[0][0] + 0.004);
    rope.push(cylZ(0.006, zA - zB, [x, 1.302, (zA + zB) / 2], 6));
    for (let z = Z0 - 0.2; z > Z1 + 0.1; z -= 0.42) {
      rope.push(G.rod([x, 1.3, z + 0.1], [s * (BX + 0.027), YB + 0.075, z], 0.004, 5));
      rope.push(G.rod([x, 1.3, z - 0.1], [s * (BX + 0.027), YB + 0.075, z], 0.004, 5));
    }
  }
  // rear flap lacing (vertical, down the centre)
  for (let y = 1.36; y < 2.45; y += 0.08) rope.push(G.rod([-0.02, y, zB - 0.012], [0.02, y + 0.04, zB - 0.012], 0.0035, 5));
  // front and rear hems across the ends
  rope.push(cylX(0.006, 2 * line[0][0], [0, 1.302, zA + 0.004], 6), cylX(0.006, 2 * line[0][0], [0, 1.302, zB - 0.006], 6));
  return { canvas, rope };
}

/* ------------------------------------------------------------------ mudguards, lamps, stowage */

function mudguards(): { body: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const z = D.zR;
  const top = 0.938;
  const prof: V2[] = spline2(
    [
      [z - 0.64, 0.6],
      [z - 0.6, 0.76],
      [z - 0.5, 0.88],
      [z - 0.34, top],
      [z, top],
      [z + 0.34, top],
      [z + 0.5, 0.88],
      [z + 0.58, 0.76],
      [z + 0.6, 0.66],
    ],
    40,
  );
  const x0 = D.dualX - 0.24, x1 = D.dualX + 0.25;
  const line: V2[] = [
    [x0, -0.02],
    [x0 + 0.01, 0.0],
    [x1 - 0.02, 0.0],
    [x1 - 0.006, -0.01],
    [x1, -0.04],
  ];
  const sec = sheetSection(line, 0.003);
  const st = profileStations(prof);
  const g = sweep(sec, st, true, 40);
  body.push(g, xf(g.clone(), [0, 0, 0], [0, 0, 0], [-1, 1, 1]));
  for (const s of [1, -1]) {
    // brackets to the bed bearers
    for (const dz of [-0.45, 0.45]) body.push(box(0.03, 0.08, 0.03, [s * (D.dualX + 0.1), 0.9, z + dz], 0.004));
    steel.push(bentRod([[s * (D.frameX + 0.04), 0.9, z + 0.52], [s * (x0 + 0.02), 0.72, z + 0.58]], 0.008, 0.01, 6));
  }
  return { body, steel };
}

function lamps(): { body: THREE.BufferGeometry[]; red: THREE.BufferGeometry[]; black: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const red: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const z = Z1 + 0.05;
  for (const s of [1, -1]) {
    const x = s * 0.86, y = 0.9;
    body.push(box(0.03, 0.14, 0.04, [x, y + 0.08, z + 0.02], 0.004));
    body.push(xf(latheZ([[0.0, -0.05], [0.045, -0.045], [0.055, -0.02], [0.056, 0.01]], 24, 40), [x, y, z - 0.01], [0, 180, 0]));
    red.push(xf(latheZ(([[0.0, 0.014], [0.03, 0.012], [0.048, 0.006], [0.05, 0.0]] as V2[]).reverse(), 24, 60), [x, y, z - 0.02], [0, 180, 0]));
    // stop lamp: small housing with a lens above the tail lamp
    body.push(box(0.06, 0.045, 0.03, [x, y + 0.075, z - 0.01], 0.008));
    red.push(box(0.045, 0.03, 0.008, [x, y + 0.075, z - 0.027], 0.003));
  }
  // convoy (distance) lamp on the left rear: box with a slotted face
  body.push(box(0.14, 0.06, 0.07, [0.5, 0.9, z], 0.008));
  for (let i = 0; i < 4; i++) black.push(box(0.022, 0.035, 0.004, [0.45 + i * 0.033, 0.9, z - 0.036], 0.001));
  body.push(box(0.03, 0.08, 0.03, [0.5, 0.96, z + 0.02], 0.004));
  return { body, red, black };
}

function toolBox(): { body: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const x = 0.86, y = 0.77, z = -0.52;
  body.push(box(0.3, 0.3, 0.6, [x, y, z], 0.012));
  body.push(box(0.012, 0.28, 0.58, [x + 0.152, y + 0.005, z], 0.004));
  steel.push(cylZ(0.008, 0.5, [x + 0.158, y + 0.13, z], 8));
  steel.push(box(0.012, 0.06, 0.03, [x + 0.162, y - 0.08, z], 0.003));
  for (const dz of [-0.2, 0.2]) {
    steel.push(bentRod([[x - 0.14, 0.93, z + dz], [x - 0.14, y - 0.16, z + dz], [x + 0.14, y - 0.16, z + dz], [x + 0.14, 0.93, z + dz]], 0.008, 0.02, 6));
  }
  return { body, steel };
}

function spareWheel(): THREE.Object3D[] {
  const zc = -2.45, yc = 0.52;
  const w = buildWheel('spare', 30);
  w.position.set(0, yc, zc);
  w.rotation.z = -Math.PI / 2; // hub side facing down
  const carrier: THREE.BufferGeometry[] = [];
  for (const dz of [-0.28, 0.28]) {
    carrier.push(bentRod([[-D.frameX, D.frameBot - 0.01, zc + dz], [-0.5, yc - 0.11, zc + dz], [0.5, yc - 0.11, zc + dz], [D.frameX, D.frameBot - 0.01, zc + dz]], 0.012, 0.06, 8));
  }
  carrier.push(box(0.06, 0.16, 0.06, [0, D.frameBot - 0.06, zc], 0.006));
  carrier.push(cylX(0.02, 0.9, [0, D.frameBot - 0.02, zc], 10));
  return [w, part(merge(carrier), P.chassis())];
}

/* ------------------------------------------------------------------ assembly */

export function buildBed(cover: Cover): THREE.Object3D {
  const pf = platform();
  const woodZ: THREE.BufferGeometry[] = [];
  const woodX: THREE.BufferGeometry[] = [...pf.woodX];
  const body: THREE.BufferGeometry[] = [...pf.body];
  const steel: THREE.BufferGeometry[] = [...pf.steel];
  const black: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const sb = sideBoard(s, Z0 - TH, Z1 + TH);
    woodZ.push(...sb.wood);
    body.push(...sb.body);
    steel.push(...sb.steel);
  }
  for (const [zf, dir] of [[Z0, 1], [Z1, -1]] as [number, number][]) {
    const eb = endBoard(zf, dir);
    woodX.push(...eb.wood);
    body.push(...eb.body);
    steel.push(...eb.steel);
  }
  const mg = mudguards();
  body.push(...mg.body);
  steel.push(...mg.steel);
  const lp = lamps();
  body.push(...lp.body);
  black.push(...lp.black);
  const tb = toolBox();
  body.push(...tb.body);
  steel.push(...tb.steel);
  const kids: THREE.Object3D[] = [];
  if (cover !== 'open') {
    const bw = bows();
    body.push(...bw.body);
    woodZ.push(...bw.wood);
    steel.push(...bw.steel);
  } else {
    // empty bow pockets only
    for (const s of [1, -1]) for (const z of BOWS) {
      const zz = Math.min(Math.max(z, Z1 + 0.06), Z0 - 0.06);
      body.push(box(0.022, 0.26, 0.065, [s * (BX + 0.013), YT - 0.14, zz], 0.003));
    }
  }
  if (cover === 'canvas') {
    const tp = tarpaulin();
    kids.push(part(merge(tp.canvas), P.canvas()), part(merge(tp.rope), P.rope()));
  }
  kids.push(
    part(merge(pf.chassis), P.chassis()),
    part(merge(pf.floor), P.floor()),
    part(merge(woodZ), P.woodZ()),
    part(merge(woodX), P.woodX()),
    part(merge(body), P.body()),
    part(merge(steel), P.steel()),
    part(merge(black), P.black()),
    part(merge(lp.red), P.redLens()),
    ...spareWheel(),
  );
  return group(kids);
}

export { sideSlab };
