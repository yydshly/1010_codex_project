/**
 * Machine guns for the M4A3(75)W: the .50 cal Browning M2 HB (flexible, on its cradle and pintle
 * post, with a 105-round ammunition chest) and the exposed barrel jacket of the .30 cal Browning
 * M1919A4 (bow and coaxial guns).
 *
 * Gun-local frames: bore along +Z, +Y up, origin on the pintle/cradle pivot (M2) or at the rear of
 * the exposed jacket (M1919A4).
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Pal } from './palette';
import { latheZ, rb, nut, merge } from './util';

/** .50 cal M2 HB on its cradle; pivot at the origin, receiver above it. Overall ~1.65 m. */
export function m2hb(P: Pal): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const ry = 0.1; // receiver centre height above the pivot
  // receiver body (side plates with the trunnion block at the front)
  ps.push(part(rb(0.105, 0.125, 0.56, 0.008), P.gun, { p: [0, ry, -0.14] }));
  ps.push(part(rb(0.11, 0.012, 0.3, 0.004), P.gun, { p: [0, ry + 0.068, -0.02] })); // feed cover
  ps.push(part(rb(0.09, 0.02, 0.1, 0.004), P.gun, { p: [0, ry + 0.07, -0.26] })); // top plate rear
  ps.push(part(rb(0.118, 0.1, 0.1, 0.006), P.gun, { p: [0, ry - 0.005, 0.1] })); // trunnion block
  // side plate rivets / cover latch
  const riv: G.V3[] = [];
  for (const z of [-0.38, -0.3, -0.2, -0.1, 0.0]) for (const y of [ry - 0.04, ry + 0.035]) riv.push([0.0535, y, z]);
  ps.push(part(G.scatter(G.rivetHead(0.005), riv.map((p) => ({ p, n: [1, 0, 0] as G.V3 }))), P.gun));
  ps.push(part(G.scatter(G.rivetHead(0.005), riv.map((p) => ({ p: [-p[0], p[1], p[2]] as G.V3, n: [-1, 0, 0] as G.V3 }))), P.gun));
  ps.push(part(G.cyl(0.012, 0.012, 0.03, 10), P.gun, { p: [0, ry + 0.08, 0.1], r: [0, 0, 90] }));
  // charging handle slot on the right side, handle
  ps.push(part(G.box(0.004, 0.012, 0.22), P.void, { p: [-0.054, ry + 0.01, -0.2] }));
  ps.push(part(rb(0.04, 0.03, 0.03, 0.006), P.gun, { p: [-0.07, ry + 0.01, -0.12] }));
  // backplate, spade grips and butterfly trigger
  ps.push(part(rb(0.13, 0.13, 0.03, 0.008), P.gun, { p: [0, ry, -0.435] }));
  for (const sx of [-1, 1]) {
    ps.push(part(G.rod([sx * 0.045, ry - 0.02, -0.45], [sx * 0.07, ry - 0.075, -0.56], 0.013, 8), P.gun));
    ps.push(part(G.rod([sx * 0.07, ry - 0.075, -0.56], [sx * 0.07, ry + 0.05, -0.56], 0.016, 10), P.rubber)); // black spade grips
    ps.push(part(G.rod([sx * 0.07, ry + 0.05, -0.56], [sx * 0.045, ry + 0.03, -0.45], 0.012, 8), P.gun));
  }
  ps.push(part(rb(0.05, 0.03, 0.012, 0.004), P.gun, { p: [0, ry + 0.01, -0.46] }));
  // rear sight leaf (folded) and front sight on the barrel support
  ps.push(part(rb(0.03, 0.012, 0.06, 0.003), P.gun, { p: [0, ry + 0.08, -0.33] }));
  // barrel support (perforated) with front sight post
  ps.push(part(latheZ([[0.0, 0.0], [0.045, 0.0], [0.045, 0.18], [0.035, 0.2], [0.0, 0.2]], 18, 40), P.gun, { p: [0, ry, 0.15] }));
  const holes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + (i % 2) * 0.5;
    const h = new THREE.CylinderGeometry(0.009, 0.009, 0.004, 8);
    h.rotateZ(Math.PI / 2);
    h.rotateZ(a);
    h.translate(Math.cos(a) * 0.045, ry + Math.sin(a) * 0.045, 0.19 + i * 0.045);
    holes.push(h);
  }
  ps.push(part(merge(holes), P.void));
  ps.push(part(rb(0.012, 0.05, 0.02, 0.003), P.gun, { p: [0, ry + 0.065, 0.33] }));
  // heavy barrel with its muzzle
  ps.push(part(latheZ([[0.0, 0.0], [0.03, 0.0], [0.028, 0.6], [0.026, 0.95], [0.028, 0.96], [0.028, 0.99], [0.012, 0.99], [0.012, 0.95], [0.0, 0.95]], 16, 40), P.gun, { p: [0, ry, 0.34] }));
  // cradle and pintle yoke under the receiver
  ps.push(part(rb(0.14, 0.03, 0.3, 0.006), P.gun, { p: [0, 0.03, -0.05] }));
  for (const sx of [-1, 1]) ps.push(part(rb(0.012, 0.07, 0.08, 0.004), P.gun, { p: [sx * 0.065, 0.05, 0.08] }));
  ps.push(part(G.cyl(0.018, 0.018, 0.16, 10), P.gun, { p: [0, 0.07, 0.08], r: [0, 0, 90] }));
  ps.push(part(G.cyl(0.028, 0.03, 0.06, 12), P.gun, { p: [0, 0.0, 0.0] }));
  // 105-round ammunition chest on its tray (left side, feeding right-to-left from the left)
  ps.push(part(rb(0.1, 0.2, 0.3, 0.008), P.paint, { p: [0.12, ry - 0.02, -0.02] }));
  ps.push(part(rb(0.104, 0.012, 0.29, 0.004), P.paint, { p: [0.12, ry + 0.085, -0.02] }));
  ps.push(part(G.box(0.03, 0.01, 0.06), P.gun, { p: [0.12, ry + 0.095, -0.02] }));
  ps.push(part(rb(0.13, 0.012, 0.32, 0.004), P.gun, { p: [0.12, ry - 0.125, -0.02] }));
  ps.push(part(G.rod([0.06, ry - 0.12, -0.02], [0.02, 0.03, -0.02], 0.01, 8), P.gun));
  // short belt stub from the chest into the feedway
  const belt: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.CylinderGeometry(0.0105, 0.0105, 0.1, 8);
    c.rotateX(Math.PI / 2);
    c.translate(0.07 - i * 0.02, ry + 0.07 - i * 0.004, 0.0);
    belt.push(c);
  }
  ps.push(part(merge(belt), P.toolSteel));
  return group(ps);
}

/** Pintle post for the M2 standing on y = 0 (height h). */
export function pintlePost(P: Pal, h: number): THREE.Group {
  return group([
    part(G.cyl(0.07, 0.08, 0.03, 18), P.cast, { p: [0, 0.015, 0] }),
    part(G.scatter(nut(0.016, 0.007), Array.from({ length: 4 }, (_, i) => ({ p: [Math.cos(i * 1.571 + 0.785) * 0.058, 0.03, Math.sin(i * 1.571 + 0.785) * 0.058] as G.V3 }))), P.cast),
    part(G.cyl(0.03, 0.03, 0.05, 14), P.cast, { p: [0, 0.055, 0], r: [0, 0, 90] }),
    part(rb(0.05, 0.08, 0.06, 0.01), P.cast, { p: [0, 0.06, 0] }),
    part(G.cyl(0.024, 0.026, h - 0.08, 14), P.gun, { p: [0, 0.08 + (h - 0.08) / 2, 0] }),
    part(G.cyl(0.034, 0.034, 0.04, 14), P.gun, { p: [0, h - 0.02, 0] }),
  ]);
}

/** Exposed .30 cal M1919A4 barrel jacket (perforated) along +Z from the origin, length L. */
export function m1919Jacket(P: Pal, L: number): THREE.Group {
  const ps: THREE.Object3D[] = [];
  ps.push(part(latheZ([[0.0, 0.0], [0.024, 0.0], [0.024, L - 0.04], [0.02, L - 0.03], [0.02, L], [0.0, L]], 16, 40), P.gun));
  ps.push(part(latheZ([[0.0, L - 0.005], [0.011, L - 0.005], [0.011, L + 0.02], [0.0, L + 0.02]], 10, 40), P.gun));
  ps.push(part(G.cyl(0.0035, 0.0035, 0.004, 6), P.void, { p: [0, 0, L + 0.02], r: [90, 0, 0] }));
  const holes: THREE.BufferGeometry[] = [];
  const rows = Math.max(1, Math.floor((L - 0.07) / 0.03));
  for (let i = 0; i < rows; i++) for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + (i % 2) * 0.52;
    const h = new THREE.CylinderGeometry(0.0065, 0.0065, 0.004, 8);
    h.rotateZ(Math.PI / 2);
    h.rotateZ(a);
    h.translate(Math.cos(a) * 0.0235, Math.sin(a) * 0.0235, 0.03 + i * 0.03);
    holes.push(h);
  }
  ps.push(part(merge(holes), P.void));
  return group(ps);
}
