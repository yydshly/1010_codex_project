/**
 * Shield of Carriage 25-pr Mk I: flat main plate with the slot for the cradle (covered by the
 * movable plate on the cradle) and the direct-fire telescope aperture on the left, side flaps
 * hinged to it and angled back over the wheels, stiffeners, brackets and stays to the saddle,
 * and the two leather cases (dial sight, clinometer) carried on the rear of the right side.
 *
 * Construction frame (see dims.ts).
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { rrect, type V2, type V3 } from './util';

const Z = D.shieldZ, T = D.shieldT, TOP = D.shieldTop, HW = D.shieldHW;
const BOT_C = 0.555, BOT_O = 0.88;
/** Telescope aperture centre (x, y). */
export const TEL_HOLE: V2 = [0.245, 1.3];

function mainPlate(): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const zc = Z + T / 2;
  const half: V2[] = [
    [0.46, BOT_C],
    [0.56, 0.66],
    [0.6, BOT_O],
    [HW, BOT_O],
    [HW, TOP],
  ];
  // bottom-left, the +X half up to the top, then the -X half back down
  const pts: V2[] = [[-0.46, BOT_C], ...half, ...half.slice().reverse().map(([x, y]) => [-x, y] as V2)];
  pts.pop();
  const slot = rrect(-0.155, 0.9, 0.155, 1.46, 0.03);
  const tel = rrect(TEL_HOLE[0] - 0.04, TEL_HOLE[1] - 0.035, TEL_HOLE[0] + 0.04, TEL_HOLE[1] + 0.035, 0.008);
  const sh = G.shape(pts, 0.01, [slot.slice().reverse(), tel.slice().reverse()]);
  o.push(part(G.extrude(sh, T, 0.0015, 6, 1), P.paint(), { p: [0, 0, zc] }));
  // telescope aperture shutter (open, slid up) in guides on the front face
  const fz = Z + T;
  o.push(part(G.rbox(0.1, 0.09, 0.004, 0.0015, 1), P.paint(), { p: [TEL_HOLE[0], TEL_HOLE[1] + 0.095, fz + 0.006] }));
  o.push(part(G.rbox(0.03, 0.012, 0.008, 0.002, 1), P.bright(), { p: [TEL_HOLE[0], TEL_HOLE[1] + 0.135, fz + 0.012] }));
  for (const gx of [TEL_HOLE[0] - 0.058, TEL_HOLE[0] + 0.058]) o.push(part(G.rbox(0.012, 0.24, 0.008, 0.002, 1), P.paint(), { p: [gx, TEL_HOLE[1] + 0.06, fz + 0.004] }));
  // rear stiffeners: angle along the top edge, verticals either side of the slot
  const bz = Z - 0.0005;
  o.push(part(G.rbox(HW * 2 - 0.02, 0.045, 0.006, 0.002, 1), P.paint(), { p: [0, TOP - 0.03, bz - 0.003] }));
  o.push(part(G.rbox(HW * 2 - 0.02, 0.006, 0.04, 0.002, 1), P.paint(), { p: [0, TOP - 0.05, bz - 0.02] }));
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(0.04, 1.4 - 0.7, 0.006, 0.002, 1), P.paint(), { p: [sx * 0.2, 1.05, bz - 0.003] }));
    o.push(part(G.rbox(0.006, 1.4 - 0.7, 0.035, 0.002, 1), P.paint(), { p: [sx * 0.218, 1.05, bz - 0.018] }));
    o.push(part(G.rbox(0.5, 0.035, 0.006, 0.002, 1), P.paint(), { p: [sx * 0.47, BOT_O + 0.025, bz - 0.003] }));
  }
  // bolt heads on the front face
  const fb: { p: V3; n: V3 }[] = [];
  for (const x of [-0.62, -0.46, -0.3, 0.3, 0.46, 0.62]) fb.push({ p: [x, TOP - 0.03, fz], n: [0, 0, 1] });
  for (const sx of [1, -1]) {
    for (const y of [0.78, 0.92, 1.06, 1.2, 1.34]) fb.push({ p: [sx * 0.2, y, fz], n: [0, 0, 1] });
    for (const x of [0.3, 0.45, 0.6]) fb.push({ p: [sx * x, BOT_O + 0.025, fz], n: [0, 0, 1] });
  }
  o.push(part(G.scatter(G.boltHead(0.017, 0.006), fb), P.paint()));
  return o;
}

/** Left flap (+X), hinged at the main plate edge and angled back. Mirrored for the right. */
function flap(): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const L = D.flapLen;
  const outline: V2[] = [
    [0.004, BOT_O + 0.02],
    [L, BOT_O + 0.06],
    [L, TOP - 0.07],
    [L - 0.05, TOP - 0.02],
    [0.004, TOP],
  ];
  const g = G.plate(outline, T, 'xy', 0.0015, 0.008);
  const inner = group([part(g, P.paint(), { p: [0, 0, T / 2] })]);
  // stiffening lip along the outer edge (behind)
  inner.add(part(G.rbox(0.006, TOP - BOT_O - 0.16, 0.03, 0.002, 1), P.paint(), { p: [L - 0.006, (BOT_O + TOP) / 2 - 0.01, -0.015] }));
  const fl = group([inner], { p: [HW, 0, Z], r: [0, D.flapDeg, 0] });
  o.push(fl);
  // hinge knuckles and pin on the rear side of the fold
  for (const y of [BOT_O + 0.12, (BOT_O + TOP) / 2, TOP - 0.12]) {
    o.push(part(G.cyl(0.011, 0.011, 0.09, 14), P.paint(), { p: [HW, y, Z - 0.008] }));
    o.push(part(G.rbox(0.04, 0.08, 0.004, 0.0015, 1), P.paint(), { p: [HW - 0.024, y, Z - 0.002] }));
  }
  o.push(part(G.cyl(0.004, 0.004, TOP - BOT_O - 0.1, 8), P.bright(), { p: [HW, (BOT_O + TOP) / 2, Z - 0.008] }));
  return o;
}

function supports(): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  // lower brackets: from the saddle base front up to the shield back (both sides of the slot)
  for (const sx of [1, -1]) {
    const x = sx * 0.2;
    o.push(part(G.plate([[0.14, D.saddleY - 0.02], [Z, 0.64], [Z, 0.98], [Z - 0.04, 0.98], [0.12, 0.82]], 0.012, 'zy', 0.003), P.paint(), { p: [x, 0, 0] }));
    // diagonal stays from the saddle base corners to the upper shield
    const a: V3 = [sx * 0.23, D.saddleY + 0.01, 0.12];
    const b: V3 = [sx * 0.52, TOP - 0.2, Z - 0.012];
    o.push(part(G.rod(a, b, 0.012, 10), P.paint()));
    o.push(part(G.rbox(0.06, 0.05, 0.012, 0.003, 1), P.paint(), { p: [b[0], b[1], Z - 0.006] }));
    o.push(part(G.rbox(0.05, 0.02, 0.05, 0.004, 1), P.cast(), { p: [a[0], a[1] + 0.005, a[2]] }));
  }
  // lower centre skirt tie to the trail front
  o.push(part(G.rbox(0.36, 0.03, Z - D.trailFrontZ, 0.004, 1), P.paint(), { p: [0, 0.6, (Z + D.trailFrontZ) / 2] }));
  return o;
}

function cases(): THREE.Object3D[] {
  // Leather cases for the dial sight and the clinometer on the rear of the right-hand side.
  const o: THREE.Object3D[] = [];
  const box = (x: number, y: number, w: number, h: number, d: number) => {
    const zc = Z - 0.012 - d / 2;
    const back = zc - d / 2;
    o.push(part(G.rbox(w, h, d, 0.014, 3), P.leather(), { p: [x, y, zc] }));
    // lid band, closing strap and buckle on the face towards the crew
    o.push(part(G.rbox(w + 0.006, 0.05, d + 0.006, 0.012, 2), P.leather(), { p: [x, y + h / 2 - 0.02, zc] }));
    o.push(part(G.rbox(0.025, 0.075, 0.005, 0.002, 1), P.leather(), { p: [x, y + h / 2 - 0.06, back - 0.003] }));
    o.push(part(G.rbox(0.022, 0.016, 0.005, 0.002, 1), P.bright(), { p: [x, y + h / 2 - 0.1, back - 0.004] }));
    // mounting bracket to the shield
    o.push(part(G.rbox(w + 0.02, 0.03, 0.012, 0.002, 1), P.paint(), { p: [x, y - 0.02, Z - 0.006] }));
  };
  box(-0.33, 1.28, 0.12, 0.2, 0.1);
  box(-0.615, 1.25, 0.11, 0.16, 0.09);
  return o;
}

export function buildShield(): THREE.Group {
  return group([...mainPlate(), mirrorX(group(flap())), ...supports(), ...cases()], { name: 'shield' });
}
