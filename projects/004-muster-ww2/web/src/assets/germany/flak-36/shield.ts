/**
 * Gun shield (Schutzschild) as issued from 1941 for the ground role: 1.95 m x 1.75 m front plate
 * (10 mm) with an open-topped slot for the elevating barrel and a small hatch on the right, two
 * swept-back 6 mm side plates (75 mm wide at the top, 560 mm at the bottom) and the support frame
 * that ties it to the front of the upper carriage. Raw frame; traverses with the upper carriage.
 */
import { THREE, G, part, mirrorX, group } from '../../../core/kit';
import type { Palette } from './palette';
import { D } from './dims';
import { bolts, v3, barBetween, type V2 } from './util';

const T = 0.012;
/** Side-plate sweep: angle from straight back towards the outside (deg). */
const WING = 40;

export function shield(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const z = D.shieldZ, y0 = D.shieldBot, y1 = D.shieldTop, W = D.shieldHalfW, sw = D.slotHalfW, sb = D.slotBot;
  const outline: V2[] = [
    [-W, y0], [W, y0], [W, y1 - 0.05], [W - 0.05, y1], [sw + 0.02, y1], [sw, y1 - 0.02], [sw, sb + 0.05], [sw - 0.05, sb],
    [-sw + 0.05, sb], [-sw, sb + 0.05], [-sw, y1 - 0.02], [-sw - 0.02, y1], [-W + 0.05, y1], [-W, y1 - 0.05],
  ];
  o.push(part(G.plate(outline, T, 'xy', 0.003), P.paint, { p: [0, 0, z] }));
  // folded stiffening lip along the bottom edge and the slot edges (rear face)
  o.push(part(G.rbox(2 * W - 0.04, 0.04, 0.01, 0.003, 1), P.paint, { p: [0, y0 + 0.02, z - T / 2 - 0.005] }));
  for (const s of [1, -1]) {
    o.push(part(G.rbox(0.035, y1 - sb - 0.08, 0.01, 0.003, 1), P.paint, { p: [s * (sw + 0.02), (sb + y1) / 2 + 0.02, z - T / 2 - 0.005] }));
  }
  // hatch on the right (-X) half: door plate, two hinges on top, latch
  const hx = -0.55, hy = 1.5;
  o.push(part(G.rbox(0.3, 0.24, 0.008, 0.004, 1), P.paint, { p: [hx, hy, z + T / 2 + 0.004] }));
  for (const dx of [-0.09, 0.09]) o.push(part(G.cyl(0.012, 0.012, 0.06, 12), P.paint, { p: [hx + dx, hy + 0.125, z + T / 2 + 0.01], r: [0, 0, 90] }));
  o.push(part(G.rbox(0.03, 0.05, 0.016, 0.004, 1), P.steel, { p: [hx, hy - 0.09, z + T / 2 + 0.012] }));
  // bolt heads where the plate is fixed to the support frame
  const bp: THREE.Vector3[] = [];
  for (const x of [-0.85, -0.6, -0.3, 0.3, 0.6, 0.85]) bp.push(v3(x, y0 + 0.39, z + T / 2));
  for (const s of [1, -1]) for (const y of [1.35, 1.8]) bp.push(v3(s * 0.72, y, z + T / 2));
  o.push(part(bolts(bp, [0, 0, 1], 0.022, 0.008), P.steel));

  // swept-back side plates (built on +X, mirrored)
  const wing: V2[] = [[0, y0], [-0.56, y0], [-0.075, y1], [0, y1]];
  const wg = part(G.plate(wing, 0.008, 'zy', 0.003), P.paint);
  const wingGroup = group([wg], { p: [W + 0.004, 0, z - T / 2], r: [0, -WING, 0] });
  // hinge strip joining it to the front plate
  const hinge = part(G.rbox(0.025, y1 - y0 - 0.04, 0.025, 0.006, 1), P.paint, { p: [W - 0.005, (y0 + y1) / 2, z - T / 2 - 0.012] });
  o.push(mirrorX(group([wingGroup, hinge])));

  // support frame: transverse beam behind the plate, struts back to the side walls, stiffeners
  const zb = z - T / 2 - 0.03;
  const yb = y0 + 0.39;
  o.push(part(G.rbox(2 * W - 0.3, 0.08, 0.06, 0.008, 2), P.paint, { p: [0, yb, zb] }));
  for (const s of [1, -1]) {
    o.push(barBetween([s * 0.3, D.deckTop + 0.04, D.cheekZ1 - 0.06], [s * 0.3, yb, zb - 0.02], 0.06, 0.07, P.paint));
    for (const x of [0.42, 0.72]) {
      o.push(part(G.rbox(0.04, y1 - yb - 0.12, 0.035, 0.006, 1), P.paint, { p: [s * x, (yb + y1 - 0.12) / 2, z - T / 2 - 0.0175] }));
    }
  }
  return o;
}
