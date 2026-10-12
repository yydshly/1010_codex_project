/**
 * Saddle of Carriage 25-pr Mk I: base plate on the trail front (top traverse on a front pivot,
 * traversing screw at the rear), two arms carrying the trunnion bearings, elevating pinion box,
 * elevating and traversing handwheels on the left (layer's side), and the sight clinometer with
 * the No. 7 dial sight on its bracket on the left arm.
 *
 * Construction frame (see dims.ts).
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { cylX, cylY, handwheel, latheZ, type V2, type V3 } from './util';

const TY = D.trunY, TZ = D.trunZ;
const AX = D.armX + D.armT / 2;
const SY = D.saddleY;

function base(): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const z0 = -0.29, z1 = 0.17;
  const y0 = D.trailTopFront + 0.012;
  o.push(part(G.rbox(0.48, SY - y0, z1 - z0, 0.006, 2), P.paint(), { p: [0, (y0 + SY) / 2, (z0 + z1) / 2] }));
  // front pivot boss and bolts
  o.push(part(cylY(0.06, SY - 0.004, SY + 0.024, 32, 0.004), P.cast(), { p: [0, 0, 0.11] }));
  o.push(part(G.scatter(G.boltHead(0.016, 0.006), Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return { p: [Math.cos(a) * 0.08, SY, 0.11 + Math.sin(a) * 0.08] as V3 };
  })), P.cast()));
  // traversing screw housing across the rear of the base
  o.push(part(cylX(0.032, -0.2, 0.26, 28, 0.004), P.cast(), { p: [0, SY - 0.01, z0 - 0.02] }));
  o.push(part(G.rbox(0.09, 0.05, 0.06, 0.008, 1), P.cast(), { p: [0, SY - 0.03, z0 - 0.02] }));
  o.push(part(cylX(0.014, 0.26, 0.36, 16, 0.002), P.bright(), { p: [0, SY - 0.01, z0 - 0.02] }));
  // elevating pinion box between the arms (split round the arc)
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(0.05, 0.1, 0.13, 0.008, 2), P.cast(), { p: [sx * 0.042, SY + 0.05, -0.16] }));
  }
  o.push(part(cylX(0.022, -0.07, AX, 20, 0.003), P.bright(), { p: [0, SY + 0.06, -0.16] }));
  // bolt rows along the base edges
  const b: { p: V3; n: V3 }[] = [];
  for (const sx of [1, -1]) for (const z of [-0.24, -0.08, 0.05]) b.push({ p: [sx * 0.215, SY, z], n: [0, 1, 0] });
  o.push(part(G.scatter(G.boltHead(0.018, 0.007), b), P.paint()));
  return o;
}

/** Left arm (+X); mirrored for the right. */
function arm(): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const pts: V2[] = [
    [0.165, SY - 0.002],
    [0.165, 0.8],
    [0.05, 1.1],
  ];
  const R = 0.092;
  for (let i = 0; i <= 10; i++) {
    const a = THREE.MathUtils.degToRad(40 + (i / 10) * 140);
    pts.push([TZ + Math.cos(a) * R, TY + Math.sin(a) * R]);
  }
  pts.push([-0.3, 1.07], [-0.3, SY - 0.002]);
  o.push(part(G.plate(pts, D.armT, 'zy', 0.004, 0.01), P.paint(), { p: [AX, 0, 0] }));
  // rear edge flange and foot flange
  o.push(part(G.rbox(0.05, 1.07 - SY - 0.02, 0.012, 0.003, 1), P.paint(), { p: [AX + 0.015, (SY + 1.07) / 2, -0.294] }));
  o.push(part(G.rbox(0.05, 0.012, 0.44, 0.003, 1), P.paint(), { p: [AX + 0.015, SY + 0.006, -0.065] }));
  // trunnion bearing housing, cap and bolts
  const xo = AX + D.armT / 2;
  o.push(part(cylX(0.07, xo, xo + 0.028, 40, 0.005), P.cast(), { p: [0, TY, TZ] }));
  o.push(part(latheZ([[0.03, -0.004], [0.078, -0.004], [0.078, 0.004], [0.03, 0.004]], 40, 35), P.cast(), { p: [xo + 0.03, TY, TZ], r: [0, 90, 0] }));
  const cb: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    cb.push({ p: [xo + 0.034, TY + Math.sin(a) * 0.058, TZ + Math.cos(a) * 0.058], n: [1, 0, 0] });
  }
  o.push(part(G.scatter(G.boltHead(0.014, 0.006), cb), P.cast()));
  o.push(part(G.cyl(0.005, 0.005, 0.018, 8), P.bright(), { p: [xo + 0.012, TY + 0.078, TZ - 0.02] }));
  // bolts along the arm foot
  o.push(part(G.scatter(G.boltHead(0.014, 0.006), [-0.24, -0.12, 0.0, 0.12].map((z) => ({ p: [AX + 0.03, SY + 0.012, z] as V3 }))), P.paint()));
  return o;
}

function handwheels(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const xo = AX + D.armT / 2;
  // elevating gearbox on the left arm and the elevating handwheel
  const e: V3 = [0, 1.0, -0.25];
  o.push(part(G.rbox(0.055, 0.12, 0.1, 0.01, 2), P.cast(), { p: [xo + 0.0275, e[1] - 0.02, e[2]] }));
  o.push(part(cylX(0.032, xo + 0.055, xo + 0.075, 28, 0.004), P.cast(), { p: [0, e[1], e[2]] }));
  o.push(part(cylX(0.013, xo + 0.075, 0.37, 16, 0.002), P.bright(), { p: [0, e[1], e[2]] }));
  o.push(group(handwheel(0.105, THREE.MathUtils.degToRad(-60), hi, P.paint(), P.cast(), P.bright()), { p: [0.38, e[1], e[2]] }));
  // shaft housing down to the pinion box
  o.push(part(G.rod([xo + 0.03, e[1] - 0.07, e[2] + 0.02], [xo + 0.03, SY + 0.06, -0.16], 0.016, 12), P.cast()));
  // traversing handwheel on the traversing screw
  o.push(group(handwheel(0.088, THREE.MathUtils.degToRad(150), hi, P.paint(), P.cast(), P.bright()), { p: [0.37, SY - 0.01, -0.31] }));
  return o;
}

function sights(): THREE.Object3D[] {
  // Sight clinometer (range drum, level vials) on a bracket from the left arm, the No. 7 dial
  // sight (panoramic) on top of it with its eyepiece towards the layer.
  const o: THREE.Object3D[] = [];
  const xo = AX + D.armT / 2;
  const x = 0.335, z = -0.4, y = 1.2;
  // bracket: plate from the arm's rear edge out to the sight
  o.push(part(G.rbox(x - xo + 0.02, 0.04, 0.07, 0.006, 1), P.cast(), { p: [(x + xo) / 2, 1.06, -0.3] }));
  o.push(part(G.rbox(0.05, 0.14, 0.05, 0.008, 1), P.cast(), { p: [x, 1.11, -0.33] }));
  o.push(part(G.rbox(0.06, 0.03, 0.12, 0.006, 1), P.cast(), { p: [x, y - 0.06, z + 0.03] }));
  // clinometer body with the range drum outboard and the vial housings on top
  o.push(part(G.rbox(0.07, 0.1, 0.1, 0.008, 2), P.optic(), { p: [x, y, z] }));
  o.push(part(cylX(0.042, x + 0.035, x + 0.06, 40, 0.003), P.optic(), { p: [0, y - 0.005, z] }));
  o.push(part(cylX(0.043, x + 0.041, x + 0.053, 40, 0.002), P.brass(), { p: [0, y - 0.005, z] }));
  o.push(part(cylX(0.012, x + 0.06, x + 0.085, 16, 0.002), P.bright(), { p: [0, y - 0.005, z] }));
  o.push(part(G.rbox(0.03, 0.02, 0.08, 0.005, 1), P.optic(), { p: [x - 0.012, y + 0.06, z] }));
  o.push(part(G.rbox(0.014, 0.008, 0.055, 0.003, 1), P.glass(), { p: [x - 0.012, y + 0.072, z] }));
  o.push(part(G.rbox(0.07, 0.02, 0.028, 0.005, 1), P.optic(), { p: [x, y + 0.06, z + 0.045] }));
  // dial sight: stem, azimuth ring (brass scale), rotating head with objective, eyepiece
  const py = y + 0.07;
  o.push(part(cylY(0.028, py, py + 0.08, 28, 0.003), P.optic(), { p: [x, 0, z] }));
  o.push(part(cylY(0.036, py + 0.08, py + 0.1, 32, 0.002), P.brass(), { p: [x, 0, z] }));
  o.push(part(cylY(0.032, py + 0.1, py + 0.14, 32, 0.003), P.optic(), { p: [x, 0, z] }));
  o.push(part(G.rbox(0.06, 0.065, 0.075, 0.012, 2), P.optic(), { p: [x, py + 0.172, z + 0.005] }));
  o.push(part(G.rbox(0.036, 0.032, 0.004, 0.002, 1), P.glass(), { p: [x, py + 0.176, z + 0.043] }));
  const e0: V3 = [x, py + 0.04, z - 0.025];
  const e1: V3 = [x, py + 0.02, z - 0.13];
  o.push(part(G.rod(e0, e1, 0.017, 20), P.optic()));
  o.push(part(latheZ([[0.018, 0], [0.025, 0], [0.025, 0.035], [0.018, 0.035]], 24, 40), P.rubber(), { p: e1, r: [180 - (Math.atan2(0.02, 0.105) * 180) / Math.PI, 0, 0] }));
  return o;
}

function seatNote(): THREE.Object3D[] {
  return [];
}

export function buildSaddle(hi: boolean): THREE.Group {
  return group([...base(), mirrorX(group(arm())), ...handwheels(hi), ...sights(), ...seatNote()], { name: 'saddle' });
}
