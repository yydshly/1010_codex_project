/**
 * Cradle of the 25-pr: casing under the barrel holding the hydraulic buffer (upper) and the
 * hydro-pneumatic recuperator (lower), slides on top for the breech ring claws, trunnion cheeks,
 * front barrel bearing, cylinder end caps, recoil rods to the breech-ring lug, recoil indicator,
 * elevating arc underneath, the movable shield plate and the direct-fire telescope (left).
 *
 * Trunnion frame (see dims.ts).
 */
import { THREE, G, part } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { RODS, barrelR } from './ordnance';
import { latheZ, ringProfile, cylX, cylZ, type V2, type V3 } from './util';

const BY = D.boreAbove;
const HW = D.cradleHW, TOP = D.cradleTop, BOT = D.cradleBot;

function casing(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const z0 = D.cradleRear, z1 = D.cradleFront - 0.03;
  const L = z1 - z0;
  const sec = G.superRing(HW, (TOP - BOT) / 2, hi ? 40 : 24, 3.4);
  const cy = (TOP + BOT) / 2;
  o.push(part(G.extrude(sec.map(([x, y]) => [x, y + cy] as V2), L, 0.006, 4, 1), P.paint(), { p: [0, 0, (z0 + z1) / 2] }));
  // slides along the top edges with bright wearing strips
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(0.03, 0.024, L - 0.02, 0.004, 1), P.cast(), { p: [sx * (HW - 0.018), TOP + 0.01, (z0 + z1) / 2] }));
    o.push(part(G.rbox(0.018, 0.003, L - 0.06, 0.001, 1), P.bright(), { p: [sx * (HW - 0.02), TOP + 0.023, (z0 + z1) / 2] }));
    // longitudinal rib
    o.push(part(G.rbox(0.008, 0.02, L - 0.12, 0.003, 1), P.paint(), { p: [sx * (HW + 0.002), BOT + 0.09, (z0 + z1) / 2 + 0.03] }));
    // trunnion cheek + trunnion boss + pin
    const ch: V2[] = [[-0.12, BOT + 0.05], [0.12, BOT + 0.05], [0.09, 0.075], [-0.09, 0.075]];
    o.push(part(G.plate(ch, 0.016, 'zy', 0.004), P.cast(), { p: [sx * (HW + 0.008), 0, 0] }));
    o.push(part(cylX(0.06, 0, 0.012, 32, 0.004), P.cast(), { p: [sx > 0 ? HW + 0.016 : -HW - 0.028, 0, 0] }));
    o.push(part(cylX(0.04, 0, 0.075, 28, 0.004), P.bright(), { p: [sx > 0 ? HW + 0.02 : -HW - 0.095, 0, 0] }));
  }
  // front bearing ring round the barrel, web down to the casing
  const zb = D.cradleFront;
  const rI = barrelR(zb) + 0.003;
  o.push(part(latheZ(ringProfile(rI, rI + 0.03, zb - 0.1, zb, 0.004), hi ? 48 : 28, 35), P.cast(), { p: [0, BY, 0] }));
  o.push(part(G.rbox(0.12, BY - rI - TOP + 0.01, 0.08, 0.006, 1), P.cast(), { p: [0, TOP + (BY - rI - TOP) / 2, zb - 0.05] }));
  // front cap plate with buffer + recuperator end caps
  o.push(part(G.extrude(sec.map(([x, y]) => [x * 1.03, y * 1.03 + cy] as V2), 0.03, 0.006, 4, 1), P.cast(), { p: [0, 0, z1 + 0.015] }));
  for (const [y, rr] of [[RODS[0][0], 0.042], [RODS[1][0], 0.055]] as [number, number][]) {
    o.push(part(latheZ([[0, zb + 0.035], [rr - 0.012, zb + 0.035], [rr, zb + 0.022], [rr, zb], [0, zb]], hi ? 36 : 20, 35), P.cast(), { p: [0, y, 0] }));
    const nb: { p: V3; n: V3 }[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      nb.push({ p: [Math.cos(a) * (rr + 0.012), y + Math.sin(a) * (rr + 0.012) * 0.8, zb], n: [0, 0, 1] });
    }
    o.push(part(G.scatter(G.boltHead(0.014, 0.006), nb), P.cast()));
  }
  o.push(part(G.boltHead(0.024, 0.012), P.bright(), { p: [0, RODS[1][0], zb + 0.035], r: [90, 0, 0] }));
  // rear cap with glands, recoil rods to the breech-ring lug
  o.push(part(G.rbox(HW * 2, TOP - BOT, 0.03, 0.008, 2), P.cast(), { p: [0, cy, z0 - 0.005] }));
  for (const [y, r] of RODS) {
    o.push(part(cylZ(r + 0.014, z0 - 0.045, z0 - 0.018, 24, 0.003), P.cast(), { p: [0, y, 0] }));
    o.push(part(cylZ(r, D.ringFront, z0 - 0.04, 20, 0.002), P.bright(), { p: [0, y, 0] }));
  }
  // recoil indicator on the left wall: brass scale and pointer
  o.push(part(G.rbox(0.006, 0.026, 0.22, 0.002, 1), P.brass(), { p: [HW + 0.004, TOP - 0.04, 0.3] }));
  o.push(part(G.rbox(0.014, 0.018, 0.018, 0.003, 1), P.bright(), { p: [HW + 0.008, TOP - 0.04, 0.2] }));
  // filling plug on top of the casing
  o.push(part(G.boltHead(0.03, 0.012), P.cast(), { p: [0.07, TOP + 0.001, 0.5] }));
  return o;
}

function elevatingArc(): THREE.Object3D[] {
  // Toothed arc hanging under the rear of the casing, centred on the trunnions.
  const o: THREE.Object3D[] = [];
  const rIn = 0.245, rOut = 0.325;
  const a0 = THREE.MathUtils.degToRad(4), a1 = THREE.MathUtils.degToRad(58);
  const pts: V2[] = [];
  const nT = 22;
  for (let i = 0; i <= nT * 2; i++) {
    const a = a0 + ((a1 - a0) * i) / (nT * 2);
    const r = i % 2 === 0 ? rOut : rOut + 0.012;
    pts.push([-Math.sin(a) * r, -Math.cos(a) * r]);
  }
  for (let i = 12; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / 12;
    pts.push([-Math.sin(a) * rIn, -Math.cos(a) * rIn]);
  }
  o.push(part(G.plate(pts.reverse(), 0.028, 'zy', 0.003), P.cast()));
  // web joining the arc to the casing bottom
  o.push(part(G.plate([[0.0, BOT + 0.005], [-0.13, BOT + 0.005], [-0.2, -0.16], [-0.02, -0.26]], 0.024, 'zy', 0.004), P.cast()));
  return o;
}

function movableShield(): THREE.Object3D[] {
  // Plate carried on the cradle just in front of the main shield, covering its slot.
  const o: THREE.Object3D[] = [];
  const z = D.shieldZ - D.trunZ + D.shieldT + 0.012;
  const hw = 0.23, y0 = -0.29, y1 = 0.36;
  const hole: V2[] = [[-(HW + 0.006), BOT - 0.006], [HW + 0.006, BOT - 0.006], [HW + 0.006, TOP + 0.03]];
  const rB = barrelR(z) + 0.006;
  for (let i = 0; i <= 16; i++) {
    const a = THREE.MathUtils.degToRad(-12 + (204 * i) / 16);
    hole.push([Math.cos(a) * rB, BY + Math.sin(a) * rB]);
  }
  hole.push([-(HW + 0.006), TOP + 0.03]);
  const sh = G.shape([[-hw, y0], [hw, y0], [hw, y1], [-hw, y1]], 0.02, [hole.slice().reverse()]);
  o.push(part(G.extrude(sh, 0.005, 0.0015, 6, 1), P.paint(), { p: [0, 0, z] }));
  // folded stiffening edges and the collar welded round the casing
  o.push(part(G.rbox(hw * 2 - 0.02, 0.005, 0.022, 0.0015, 1), P.paint(), { p: [0, y1 - 0.003, z + 0.012] }));
  for (const sx of [1, -1]) o.push(part(G.rbox(0.005, y1 - y0 - 0.03, 0.02, 0.0015, 1), P.paint(), { p: [sx * (hw - 0.003), (y0 + y1) / 2, z + 0.011] }));
  o.push(part(G.rbox(HW * 2 + 0.03, 0.02, 0.05, 0.004, 1), P.paint(), { p: [0, BOT - 0.004, z + 0.02] }));
  const b: { p: V3; n: V3 }[] = [];
  for (const sx of [1, -1]) for (const y of [BOT + 0.03, BOT + 0.12, y1 - 0.05]) b.push({ p: [sx * (HW + 0.045), y, z + 0.0025], n: [0, 0, 1] });
  o.push(part(G.scatter(G.boltHead(0.016, 0.006), b), P.paint()));
  return o;
}

function telescope(): THREE.Object3D[] {
  // Direct-fire telescope on the left, on a bracket from the left trunnion, looking through the
  // aperture in the shield.
  const o: THREE.Object3D[] = [];
  const x = 0.245, y = TEL_Y;
  const zr = -0.23, zf = D.shieldZ - D.trunZ - 0.012;
  o.push(part(cylZ(0.021, zr, zf, 24, 0.003), P.optic(), { p: [x, y, 0] }));
  o.push(part(cylZ(0.027, zf - 0.07, zf, 24, 0.003), P.optic(), { p: [x, y, 0] }));
  o.push(part(cylZ(0.02, zf - 0.001, zf + 0.001, 20), P.glass(), { p: [x, y, 0.001] }));
  // eyepiece + rubber eye guard
  o.push(part(cylZ(0.025, zr - 0.06, zr, 24, 0.003), P.optic(), { p: [x, y, 0] }));
  o.push(part(latheZ([[0.02, zr - 0.1], [0.027, zr - 0.1], [0.027, zr - 0.06], [0.02, zr - 0.06]], 24, 40), P.rubber(), { p: [x, y, 0] }));
  // mounting bands and bracket down to the trunnion pin
  for (const zz of [-0.05, 0.14]) o.push(part(latheZ(ringProfile(0.021, 0.028, zz - 0.015, zz + 0.015, 0.002), 24, 40), P.cast(), { p: [x, y, 0] }));
  o.push(part(G.rbox(0.03, y - 0.02, 0.05, 0.006, 1), P.cast(), { p: [x, y / 2, -0.05] }));
  o.push(part(G.rbox(0.04, 0.03, 0.05, 0.006, 1), P.cast(), { p: [x, 0.0, -0.05] }));
  // elevation drum on the telescope mount
  o.push(part(cylX(0.026, x + 0.02, x + 0.045, 28, 0.003), P.brass(), { p: [0, y / 2, -0.05] }));
  return o;
}

/** Direct-fire telescope axis height in the T frame. */
export const TEL_Y = 0.14;

export function buildCradle(hi: boolean): THREE.Object3D[] {
  return [...casing(hi), ...elevatingArc(), ...movableShield(), ...telescope()];
}
