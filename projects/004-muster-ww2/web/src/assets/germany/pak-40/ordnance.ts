/**
 * PaK 40 elevating mass: L/46 barrel with two-baffle muzzle brake, breech ring with horizontal
 * sliding block and operating crank, recuperator above the barrel (moves with the barrel),
 * trough cradle housing the buffer, trunnions, cradle front bracket, the cradle-mounted shutter
 * arc that closes the shield opening, the telescopic sight on the left and the elevating arc.
 *
 * Built in the raw frame at 0 deg elevation; the assembler pivots it about TRUNNION.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Palette } from './palette';
import { Y_BORE as YB, Z_BREECH, Z_MUZZLE, TRUNNION } from './layout';
import { latheZ, cylX, cylY, cylZ, annulus, circle, bolts, v3, D2R, type V2 } from './util';

/** Barrel outer radius along z (tapered monobloc tube). */
export function barrelR(z: number): number {
  return 0.083 + ((z + 0.66) * (0.053 - 0.083)) / (2.1 + 0.66);
}

function barrel(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const prof: V2[] = [
    [0, -0.7],
    [0.086, -0.7],
    [0.089, -0.697],
    [0.089, -0.676],
    [0.086, -0.673],
    [barrelR(-0.668), -0.668],
  ];
  for (const z of [-0.5, -0.2, 0.2, 0.6, 1.0, 1.4, 1.8, 2.1]) prof.push([barrelR(z), z]);
  prof.push([0.0565, 2.104], [0.0565, 2.16], [0.0375, 2.16]);
  out.push(part(latheZ(prof, 48, 30), P.barrel, { p: [0, YB, 0] }));
  // bore (inward-facing, sooty)
  out.push(part(latheZ([[0.0375, 2.161], [0.0375, 1.8], [0, 1.8]], 32, 60), P.bore, { p: [0, YB, 0] }));
  return out;
}

function muzzleBrake(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const R = 0.088, rb = 0.042;
  // rear block with threaded collar
  const rear: V2[] = [
    [0.0565, 2.12], [0.074, 2.12], [0.081, 2.127], [0.081, 2.186], [R, 2.194], [R, 2.235],
    [rb, 2.235], [rb, 2.16], [0.0565, 2.16], [0.0565, 2.12],
  ];
  out.push(part(latheZ(rear, 48, 35), P.scorched, { p: [0, YB, 0] }));
  // middle baffle (slightly dished rear face)
  const mid: V2[] = [[rb, 2.372], [rb, 2.336], [0.07, 2.33], [R, 2.33], [R, 2.372], [rb, 2.372]];
  out.push(part(latheZ(mid, 48, 35), P.scorched, { p: [0, YB, 0] }));
  // front baffle and face
  const front: V2[] = [[rb, 2.5], [rb, 2.462], [0.07, 2.455], [R, 2.455], [R, 2.49], [0.081, 2.5], [rb, 2.5]];
  out.push(part(latheZ(front, 48, 35), P.scorched, { p: [0, YB, 0] }));
  // top & bottom bridges (the side windows between them are the two gas chambers)
  for (const c of [90, 270]) {
    const sec = G.extrude(G.shape(annulus(0.066, R, c - 47, c + 47, 18), 0.002), 0.23, 0.0025, 12, 1);
    out.push(part(sec, P.scorched, { p: [0, YB, 2.345] }));
  }
  // sooty bore sleeves inside the rear block and the two baffles (the gas chambers stay open)
  for (const [z0, z1] of [[2.16, 2.235], [2.33, 2.372], [2.455, 2.501]]) {
    out.push(part(latheZ([[rb - 0.0005, z1], [rb - 0.0005, z0]], 32, 60), P.bore, { p: [0, YB, 0] }));
  }
  return out;
}

function breech(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const zc = -0.81;
  // breech ring
  out.push(part(G.rbox(0.3, 0.26, 0.27, 0.03, 4), P.barrel, { p: [0, YB - 0.005, zc] }));
  // guide grooves of the sliding block on the rear face
  for (const y of [0.078, -0.098]) out.push(part(G.rbox(0.26, 0.008, 0.006, 0.002, 1), P.steel, { p: [0, YB + y, Z_BREECH - 0.001] }));
  // chamfered front shoulder plate where the barrel enters
  out.push(part(cylZ(0.105, -0.683, -0.672, 40, 0, YB, 0.004), P.barrel));
  // sliding block: rear face visible within the ring, ends visible on both sides
  out.push(part(G.rbox(0.2, 0.16, 0.012, 0.004, 2), P.steel, { p: [0, YB - 0.01, Z_BREECH + 0.001] }));
  out.push(part(G.rbox(0.008, 0.15, 0.13, 0.003, 2), P.steel, { p: [0.151, YB - 0.01, -0.84] }));
  out.push(part(G.rbox(0.03, 0.15, 0.13, 0.006, 2), P.steel, { p: [-0.162, YB - 0.01, -0.84] }));
  // firing mechanism housing on the block's rear face + cocking lever
  out.push(part(cylZ(0.028, -0.978, -0.944, 28, 0, YB - 0.005, 0.004), P.steel));
  out.push(part(cylZ(0.012, -0.99, -0.975, 16, 0, YB - 0.005, 0.002), P.steel));
  out.push(part(G.rbox(0.012, 0.055, 0.012, 0.003, 2), P.steel, { p: [0.032, YB - 0.03, -0.962], r: [0, 0, -25] }));
  // ring bolts (block retaining screws)
  const bp: THREE.Vector3[] = [];
  for (const x of [-0.12, 0.12]) for (const y of [0.09, -0.1]) bp.push(v3(x, YB + y, -0.945));
  out.push(part(bolts(bp, [0, 0, -1], 0.018, 0.007), P.steel));
  // operating crank on the right (-X) side
  out.push(part(cylX(0.034, -0.15, -0.182, 24, YB - 0.075, -0.745, 0.004), P.steel));
  out.push(part(cylX(0.016, -0.18, -0.196, 16, YB - 0.075, -0.745), P.steel));
  const arm = G.strap(
    [[-0.19, YB - 0.075, -0.745], [-0.196, YB - 0.058, -0.84], [-0.2, YB - 0.02, -0.93], [-0.2, YB + 0.005, -0.975]],
    0.03,
    0.012,
    [-1, 0, 0],
  );
  out.push(part(arm, P.steel));
  out.push(part(cylX(0.012, -0.2, -0.215, 16, YB + 0.005, -0.975), P.steel));
  out.push(part(G.lathe([[0, 0], [0.014, 0.004], [0.016, 0.03], [0.015, 0.06], [0.011, 0.07], [0, 0.07]], 20, 50), P.grip, {
    p: [-0.213, YB + 0.005, -0.975],
    r: [0, 0, 90],
  }));
  // semi-automatic cam plate on the ring's right face
  out.push(part(G.rbox(0.012, 0.06, 0.1, 0.004, 2), P.steel, { p: [-0.156, YB + 0.07, -0.74] }));
  return out;
}

function recuperator(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = YB + 0.135;
  const prof: V2[] = [
    [0, -0.676], [0.045, -0.676], [0.047, -0.672], [0.047, -0.642], [0.042, -0.636],
    [0.042, -0.07], [0.047, -0.064], [0.047, -0.034], [0.043, -0.03], [0.02, -0.03],
  ];
  out.push(part(latheZ(prof, 36, 35), P.barrel, { p: [0, y, 0] }));
  // polished piston rod into the cradle front bracket
  out.push(part(cylZ(0.0165, -0.035, 0.04, 20, 0, y), P.steel));
  // rear lug on top of the breech ring
  out.push(part(G.rbox(0.1, 0.075, 0.05, 0.01, 2), P.barrel, { p: [0, YB + 0.12, -0.7] }));
  out.push(part(bolts([v3(0.032, YB + 0.158, -0.7), v3(-0.032, YB + 0.158, -0.7)], [0, 1, 0], 0.016, 0.007), P.barrel));
  // filler / pressure valve
  out.push(part(cylY(0.012, y + 0.04, y + 0.058, 16, 0, -0.35), P.barrel));
  out.push(part(cylY(0.007, y + 0.058, y + 0.07, 12, 0, -0.35), P.steel));
  // front support band on the barrel with saddle
  out.push(part(cylZ(barrelR(-0.055) + 0.008, -0.08, -0.03, 40, 0, YB, 0.003), P.barrel));
  out.push(part(G.rbox(0.05, 0.03, 0.05, 0.006, 2), P.barrel, { p: [0, YB + 0.092, -0.055] }));
  // rear clamp band
  out.push(part(cylZ(barrelR(-0.63) + 0.007, -0.668, -0.64, 40, 0, YB, 0.003), P.barrel));
  return out;
}

function cradle(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const z0 = -0.66, z1 = 0.03;
  const outer: V2[] = [
    [-0.125, 0.02], [-0.125, -0.172], [-0.097, -0.21], [0.097, -0.21], [0.125, -0.172], [0.125, 0.02],
    [0.105, 0.02], [0.105, -0.086], [0.086, -0.105], [-0.086, -0.105], [-0.105, -0.086], [-0.105, 0.02],
  ];
  const trough = G.extrude(G.shape(outer, 0.004), z1 - z0, 0.004, 8, 1);
  out.push(part(trough, P.barrel, { p: [0, YB, (z0 + z1) / 2] }));
  // slide rails
  for (const x of [-0.115, 0.115]) out.push(part(G.rbox(0.022, 0.012, z1 - z0 - 0.02, 0.003, 2), P.steel, { p: [x, YB + 0.026, (z0 + z1) / 2] }));
  // stiffening ribs under the trough
  for (const z of [-0.5, -0.12]) out.push(part(G.rbox(0.23, 0.02, 0.025, 0.005, 2), P.barrel, { p: [0, YB - 0.21, z] }));
  // buffer rear end cap
  out.push(part(cylZ(0.04, -0.69, -0.66, 28, 0, YB - 0.155), P.barrel));
  out.push(part(bolts([v3(0, YB - 0.155, -0.69)], [0, 0, -1], 0.03, 0.012), P.barrel));
  // trunnion bosses
  for (const s of [1, -1]) out.push(part(cylX(0.046, 0.125 * s, 0.158 * s, 28, TRUNNION.y, TRUNNION.z), P.barrel));
  // front bracket: carries the recuperator piston rod
  const fb = G.extrude(
    G.shape([[-0.125, -0.21], [0.125, -0.21], [0.125, 0.07], [0.075, 0.175], [-0.075, 0.175], [-0.125, 0.07]], 0.012, [circle(0, 0, barrelR(0.04) + 0.006, 32)]),
    0.022,
    0.003,
    8,
    1,
  );
  out.push(part(fb, P.barrel, { p: [0, YB, 0.041] }));
  out.push(part(bolts([v3(0, YB + 0.135, 0.052)], [0, 0, 1], 0.036, 0.014), P.steel));
  // buffer front cap
  out.push(part(cylZ(0.04, 0.052, 0.08, 28, 0, YB - 0.155), P.barrel));
  out.push(part(bolts([v3(0, YB - 0.155, 0.08)], [0, 0, 1], 0.03, 0.012), P.barrel));
  const fbb: THREE.Vector3[] = [];
  for (const x of [-0.1, 0.1]) for (const y of [-0.18, 0.04]) fbb.push(v3(x, YB + y, 0.052));
  out.push(part(bolts(fbb, [0, 0, 1], 0.016, 0.006), P.barrel));
  return out;
}

/** Shutter arc on the cradle that closes the shield opening around the barrel (behind the shield). */
function shutter(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const cz = TRUNNION.z, cy = TRUNNION.y;
  const r0 = 0.427, r1 = 0.433;
  const band = (a0: number, a1: number, w: number, x: number) =>
    out.push(part(G.plate(annulus(r0, r1, a0, a1, 10, cz, cy), w, 'zy', 0.0015), P.paint, { p: [x, 0, 0] }));
  band(-14.2, -4.0, 0.32, 0);
  band(19.0, 36.4, 0.32, 0);
  for (const s of [1, -1]) band(-4.0, 19.0, 0.075, s * 0.1225);
  // struts to the cradle front bracket
  for (const s of [1, -1]) {
    out.push(part(G.rbox(0.018, 0.05, 0.085, 0.004, 2), P.paint, { p: [s * 0.134, YB - 0.08, 0.09] }));
    out.push(part(G.rbox(0.018, 0.035, 0.046, 0.004, 2), P.paint, { p: [s * 0.09, YB + 0.12, 0.073] }));
  }
  return out;
}

/** ZF 3x8 telescopic sight on its bracket, left of the cradle. */
function sight(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const x = 0.235, y = 1.02;
  // rubber eye-cup
  out.push(part(latheZ([[0.021, -0.405], [0.03, -0.405], [0.032, -0.395], [0.03, -0.37], [0.027, -0.356], [0.021, -0.356], [0.021, -0.405]], 28, 35), P.eyecup, { p: [x, y, 0] }));
  // eyepiece with knurled focusing ring, main tube, objective housing with recessed lens
  const tube: V2[] = [
    [0.017, -0.356], [0.026, -0.356], [0.026, -0.346], [0.029, -0.343], [0.029, -0.325], [0.026, -0.322], [0.026, -0.312],
    [0.0215, -0.305], [0.0215, 0.035], [0.029, 0.045], [0.029, 0.098], [0.026, 0.1], [0.024, 0.086], [0, 0.086],
  ];
  out.push(part(latheZ(tube, 32, 35), P.black, { p: [x, y, 0] }));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    out.push(part(G.rbox(0.004, 0.003, 0.016, 0.001, 1), P.black, { p: [x + Math.cos(a) * 0.029, y + Math.sin(a) * 0.029, -0.334], r: [0, 0, (a * 180) / Math.PI + 90] }));
  }
  out.push(part(cylZ(0.0235, 0.084, 0.087, 28, x, y, 0.0005), P.glass));
  out.push(part(cylZ(0.016, -0.358, -0.355, 24, x, y, 0.0005), P.glass));
  // mount: body, collars, range drum and deflection knob
  out.push(part(G.rbox(0.058, 0.04, 0.24, 0.008, 2), P.paint, { p: [x, y - 0.045, -0.125] }));
  for (const z of [-0.2, -0.04]) out.push(part(cylZ(0.029, z - 0.018, z + 0.018, 28, x, y, 0.003), P.paint));
  out.push(part(cylY(0.03, y - 0.03, y - 0.065, 32, x + 0.0, -0.255, 0.003), P.paint));
  out.push(part(cylY(0.032, y - 0.066, y - 0.075, 32, x, -0.255, 0.002), P.steel));
  out.push(part(cylX(0.018, x + 0.028, x + 0.052, 24, y - 0.045, -0.12, 0.003), P.paint));
  out.push(part(cylX(0.02, x + 0.052, x + 0.062, 24, y - 0.045, -0.12, 0.002), P.steel));
  // bracket arm on the cradle's left rail
  out.push(part(G.rbox(0.095, 0.04, 0.07, 0.008, 2), P.paint, { p: [0.165, 0.985, -0.1] }));
  out.push(part(bolts([v3(0.14, 1.005, -0.12), v3(0.14, 1.005, -0.08)], [0, 1, 0], 0.014, 0.006), P.paint));
  return out;
}

/** Elevating arc (toothed sector) outside the left cheek, fixed to the trunnion. */
function elevatingArc(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const cz = TRUNNION.z, cy = TRUNNION.y;
  const x = 0.214;
  const sector = annulus(0.055, 0.265, -176, -104, 20, cz, cy);
  const hole = annulus(0.1, 0.225, -166, -114, 12, cz, cy);
  const sh = G.shape(sector, 0.006, [hole]);
  const g = G.extrude(sh, 0.018, 0.003, 8, 1);
  // extrude is in XY (outline x->X); remap to z->Z, y->Y, thickness along X
  const m = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
  g.applyMatrix4(m);
  G.flipWinding(g);
  out.push(part(g, P.paint, { p: [x, 0, 0] }));
  out.push(part(cylX(0.062, 0.198, 0.228, 32, cy, cz, 0.004), P.paint));
  out.push(part(cylX(0.022, 0.228, 0.236, 16, cy, cz), P.steel));
  for (let a = -174; a <= -106; a += 3.4) {
    const r = 0.272;
    out.push(part(G.rbox(0.017, 0.016, 0.01, 0.002, 1), P.steel, {
      p: [x, cy + Math.sin(a * D2R) * r, cz + Math.cos(a * D2R) * r],
      r: [90 - a, 0, 0],
    }));
  }
  return out;
}

/** The complete elevating mass in the raw frame (0 deg elevation). */
export function ordnance(P: Palette): THREE.Group {
  const g = group([
    ...barrel(P),
    ...muzzleBrake(P),
    ...breech(P),
    ...recuperator(P),
    ...cradle(P),
    ...shutter(P),
    ...sight(P),
    ...elevatingArc(P),
  ]);
  g.name = 'pak40-ordnance';
  void Z_MUZZLE;
  return g;
}
