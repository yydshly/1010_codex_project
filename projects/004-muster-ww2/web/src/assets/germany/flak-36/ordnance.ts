/**
 * Flak 36 elevating mass in the barrel frame (origin on the trunnion axis, bore along +Z at
 * y = D.boreOff, 0 deg elevation): multi-section L/56 barrel with the section-joint collar and a
 * plain muzzle, breech ring with the horizontal sliding block and operating lever, cradle trough
 * (recoil brake below the barrel), recuperator cylinder above the barrel with its rod to the breech
 * ring, trunnions, the equilibrator cross-brackets, the elevating arc on the right and the ZF 20
 * direct-fire telescope on the right trunnion extension.
 */
import { THREE, G, part } from '../../../core/kit';
import type { Palette } from './palette';
import { D } from './dims';
import { latheZ, cylX, cylZ, annulus, circle, bolts, v3, type V2 } from './util';

const YB = D.boreOff;

/** Barrel outer radius along z (barrel frame). */
export function barrelR(z: number): number {
  if (z < 1.95) return 0.108;
  if (z < 2.35) return 0.108 - ((z - 1.95) / 0.4) * 0.01;
  return 0.097 - ((z - 2.35) / (4.05 - 2.35)) * 0.019;
}

function barrel(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const z0 = D.ringFront, zm = D.muzzleZ;
  const prof: V2[] = [
    [0, z0], [0.126, z0], [0.13, z0 + 0.005], [0.13, z0 + 0.05], [0.12, z0 + 0.06], [0.108, z0 + 0.07],
  ];
  for (const z of [0.4, 1.2, 1.95, 2.15, 2.35]) prof.push([barrelR(z), z]);
  // section-joint collar
  prof.push([0.097, 2.42], [0.108, 2.43], [0.111, 2.44], [0.111, 2.52], [0.106, 2.53], [barrelR(2.54), 2.54]);
  for (const z of [3.0, 3.6, 4.02]) prof.push([barrelR(z), z]);
  // muzzle swell with a chamfered face
  prof.push([0.079, 4.04], [0.044, 4.04]);
  o.push(part(latheZ(prof, 48, 30), P.barrel, { p: [0, YB, 0] }));
  o.push(part(latheZ([[0.079, 4.04], [0.083, 4.06], [0.083, zm - 0.012], [0.078, zm], [0.046, zm], [0.044, zm - 0.004]], 48, 30), P.scorched, { p: [0, YB, 0] }));
  // bore (inward-facing, sooty)
  o.push(part(latheZ([[0.044, zm + 0.001], [0.044, zm - 0.5], [0, zm - 0.5]], 32, 60), P.bore, { p: [0, YB, 0] }));
  return o;
}

function breech(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const z0 = D.breechZ, z1 = D.ringFront;
  const L = z1 - z0, zc = (z0 + z1) / 2;
  o.push(part(G.rbox(0.34, 0.33, L, 0.035, 4), P.barrel, { p: [0, YB, zc] }));
  // sliding block: rear face and its end protruding on the right (-X)
  o.push(part(G.rbox(0.22, 0.2, 0.014, 0.005, 2), P.steel, { p: [0, YB - 0.01, z0 - 0.002] }));
  o.push(part(G.rbox(0.05, 0.19, 0.16, 0.008, 2), P.steel, { p: [-0.19, YB - 0.01, z0 + 0.1] }));
  for (const y of [0.1, -0.12]) o.push(part(G.rbox(0.3, 0.008, 0.006, 0.002, 1), P.steel, { p: [0, YB + y, z0 - 0.002] }));
  // firing mechanism housing and cocking lever
  o.push(part(cylZ(0.035, z0 - 0.05, z0, 28, 0.02, YB - 0.01, 0.005), P.steel));
  o.push(part(G.rbox(0.014, 0.07, 0.014, 0.004, 1), P.steel, { p: [0.065, YB - 0.05, z0 - 0.03], r: [0, 0, -20] }));
  const bp: THREE.Vector3[] = [];
  for (const x of [-0.135, 0.135]) for (const y of [0.13, -0.13]) bp.push(v3(x, YB + y, z0 - 0.001));
  o.push(part(bolts(bp, [0, 0, -1], 0.02, 0.008), P.steel));
  // operating lever on the right: pivot boss, arm back along the ring, grip
  o.push(part(cylX(0.04, -0.17, -0.235, 24, YB - 0.1, z1 - 0.08, 0.004), P.steel));
  const arm = G.strap([[-0.236, YB - 0.1, z1 - 0.08], [-0.238, YB - 0.08, z0 + 0.1], [-0.238, YB - 0.04, z0 - 0.06]], 0.035, 0.014, [-1, 0, 0]);
  o.push(part(arm, P.steel));
  o.push(part(G.lathe([[0, 0], [0.015, 0.004], [0.017, 0.03], [0.016, 0.08], [0.011, 0.09], [0, 0.09]], 20, 50), P.grip, { p: [-0.243, YB - 0.04, z0 - 0.06], r: [0, 0, 90] }));
  // loading tray arms on the ring's rear corners (tray folded away)
  for (const s of [1, -1]) o.push(part(G.rbox(0.025, 0.04, 0.12, 0.006, 1), P.barrel, { p: [s * 0.155, YB - 0.15, z0 - 0.05] }));
  return o;
}

function cradle(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const W = D.cradleHalfW, z0 = D.cradleZ0, z1 = D.cradleZ1;
  const rs = 0.135;
  // sleeve round the recoiling barrel, with end collars
  const sleeve: V2[] = [
    [0.11, z0], [rs + 0.012, z0], [rs + 0.015, z0 + 0.005], [rs + 0.015, z0 + 0.05], [rs, z0 + 0.06], [rs, z1 - 0.12],
    [rs + 0.012, z1 - 0.11], [rs + 0.012, z1 - 0.05], [0.11, z1 - 0.05],
  ];
  o.push(part(latheZ(sleeve, 48, 35), P.barrel, { p: [0, YB, 0] }));
  // recoil brake cylinder under the sleeve
  const yb = YB - rs - 0.055;
  const buf: V2[] = [[0, z0 + 0.02], [0.062, z0 + 0.02], [0.07, z0 + 0.03], [0.07, z1 - 0.02], [0.062, z1 - 0.01], [0, z1 - 0.01]];
  o.push(part(latheZ(buf, 32, 35), P.barrel, { p: [0, yb, 0] }));
  o.push(part(G.rbox(0.05, 0.05, z1 - z0 - 0.1, 0.01, 2), P.barrel, { p: [0, yb + 0.05, (z0 + z1) / 2] }));
  o.push(part(cylZ(0.04, z1 - 0.01, z1 + 0.02, 24, 0, yb, 0.005), P.barrel));
  o.push(part(bolts([v3(0, yb, z1 + 0.02)], [0, 0, 1], 0.03, 0.012), P.steel));
  // cradle head: plate round the sleeve front joining the recuperator
  const headOutline: V2[] = [[-0.15, yb - 0.02], [0.15, yb - 0.02], [0.16, YB + 0.05], [0.1, D.recY + 0.08], [-0.1, D.recY + 0.08], [-0.16, YB + 0.05]];
  const head = G.extrude(G.shape(headOutline, 0.02, [circle(0, YB, barrelR(z1) + 0.008, 32)]), 0.07, 0.006, 8, 1);
  o.push(part(head, P.cast, { p: [0, 0, z1 - 0.06] }));
  // trunnion carrier block round the rear of the sleeve
  o.push(part(G.rbox(2 * W, 0.36, 0.62, 0.025, 3), P.cast, { p: [0, -0.03, 0.02] }));
  // trunnions and their collars
  for (const s of [1, -1]) {
    o.push(part(cylX(0.1, s * W, s * (W + 0.03), 32, 0, 0, 0.006), P.cast));
    o.push(part(cylX(0.07, s * (W + 0.03), s * (D.cheekX - D.cheekT), 28, 0, 0), P.steel));
  }
  // right trunnion extension carrying the sight bracket
  o.push(part(cylX(0.05, -D.cheekX, -D.cheekX - 0.07, 24, 0, 0, 0.004), P.cast));
  // equilibrator cross-brackets and eye pins
  for (const s of [1, -1]) {
    const x0 = s * 0.12, x1 = s * (D.eqX - 0.075);
    const sh = G.shape([[D.eqUpZ - 0.12, -0.1], [D.eqUpZ + 0.12, -0.1], [D.eqUpZ + 0.07, 0.03], [D.eqUpZ - 0.07, 0.03]], 0.01);
    const plate = G.extrude(sh, Math.abs(x1 - x0), 0.004, 6, 1);
    // extrude is along Z; turn it so the depth runs along X
    plate.rotateY(-Math.PI / 2);
    o.push(part(plate, P.cast, { p: [(x0 + x1) / 2, D.eqUpY + 0.035, 0] }));
    o.push(part(cylX(0.034, s * (D.eqX - 0.08), s * (D.eqX + 0.075), 20, D.eqUpY, D.eqUpZ, 0.004), P.steel));
    o.push(part(cylX(0.05, s * (D.eqX + 0.06), s * (D.eqX + 0.075), 20, D.eqUpY, D.eqUpZ, 0.003), P.steel));
  }
  return o;
}

function recuperator(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const y = D.recY, R = D.recR, zf = D.cradleZ1 + 0.02;
  const prof: V2[] = [
    [0, -0.05], [R - 0.01, -0.05], [R, -0.04], [R, 0.0], [R - 0.006, 0.006], [R - 0.006, zf - 0.08], [R, zf - 0.07], [R, zf], [0, zf],
  ];
  o.push(part(latheZ(prof, 36, 35), P.barrel, { p: [0, y, 0] }));
  // piston rod back to the breech-ring lug
  o.push(part(cylZ(0.024, D.ringFront - 0.08, -0.05, 20, 0, y), P.bright));
  o.push(part(G.rbox(0.1, y - (YB + 0.165) + 0.04, 0.07, 0.01, 2), P.barrel, { p: [0, (y + YB + 0.165) / 2, D.ringFront - 0.1] }));
  o.push(part(cylZ(0.04, D.ringFront - 0.08, D.ringFront - 0.06, 24, 0, y, 0.004), P.steel));
  // saddles joining the recuperator to the cradle guides
  for (const z of [0.5, 1.2]) {
    o.push(part(cylZ(R + 0.012, z - 0.03, z + 0.03, 36, 0, y, 0.004), P.barrel));
    o.push(part(G.rbox(0.1, 0.06, 0.07, 0.008, 1), P.barrel, { p: [0, y - R - 0.005, z] }));
  }
  // filling valve
  o.push(part(cylZ(0.014, zf, zf + 0.03, 16, 0, y + 0.03), P.steel));
  return o;
}

/** Elevating arc on the right of the cradle, centred on the trunnion axis. */
function elevatingArc(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const x = -0.215;
  o.push(part(G.plate(annulus(0.26, 0.38, 186, 262, 24), 0.025, 'zy', 0.004), P.cast, { p: [x, 0, 0] }));
  // teeth on the outer edge
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = ((187 + (74 * i) / (n - 1)) * Math.PI) / 180;
    o.push(part(G.rbox(0.02, 0.018, 0.012, 0.002, 1), P.steel, { p: [x, Math.sin(a) * 0.389, Math.cos(a) * 0.389], r: [90 - (a * 180) / Math.PI, 0, 0] }));
  }
  // web back to the cradle side
  o.push(part(G.rbox(0.06, 0.1, 0.12, 0.008, 2), P.cast, { p: [-0.185, -0.2, -0.2] }));
  return o;
}

/** ZF 20 telescope on its bracket on the right trunnion extension. */
function sight(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const x = -0.44, y = 0.2;
  o.push(part(G.rbox(0.05, 0.2, 0.08, 0.01, 2), P.cast, { p: [-0.41, 0.09, 0] }));
  o.push(part(G.rbox(0.06, 0.05, 0.16, 0.008, 2), P.black, { p: [x, y - 0.05, -0.02] }));
  const tube: V2[] = [
    [0, -0.3], [0.024, -0.3], [0.03, -0.29], [0.03, -0.24], [0.022, -0.23], [0.022, 0.06], [0.03, 0.07], [0.03, 0.12], [0.027, 0.125], [0.025, 0.11], [0, 0.11],
  ];
  o.push(part(latheZ(tube, 28, 35), P.black, { p: [x, y, 0] }));
  o.push(part(cylZ(0.026, 0.108, 0.111, 24, x, y, 0.0005), P.glass));
  o.push(part(cylZ(0.02, -0.305, -0.302, 24, x, y, 0.0005), P.glass));
  // rubber brow pad
  o.push(part(G.rbox(0.08, 0.04, 0.03, 0.012, 3), P.leather, { p: [x, y + 0.02, -0.33] }));
  return o;
}

/** The complete elevating mass (barrel frame). */
export function ordnance(P: Palette): THREE.Object3D[] {
  return [...barrel(P), ...breech(P), ...cradle(P), ...recuperator(P), ...elevatingArc(P), ...sight(P)];
}
