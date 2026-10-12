/**
 * .50 cal Browning M2 HB (flexible) on its cradle, with a 105-round ammunition chest.
 * Gun-local frame: bore along +Z, +Y up, origin on the cradle pivot. Overall ~1.65 m.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Pal } from './palette';
import { latheZ, rb, merge } from './util';

export function m2hb(P: Pal): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const ry = 0.1; // receiver centre height above the pivot
  // receiver body with the trunnion block at the front, feed cover
  ps.push(part(rb(0.105, 0.125, 0.56, 0.008), P.gun, { p: [0, ry, -0.14] }));
  ps.push(part(rb(0.11, 0.012, 0.3, 0.004), P.gun, { p: [0, ry + 0.068, -0.02] }));
  ps.push(part(rb(0.09, 0.02, 0.1, 0.004), P.gun, { p: [0, ry + 0.07, -0.26] }));
  ps.push(part(rb(0.118, 0.1, 0.1, 0.006), P.gun, { p: [0, ry - 0.005, 0.1] }));
  const riv: G.V3[] = [];
  for (const z of [-0.38, -0.3, -0.2, -0.1, 0.0]) for (const y of [ry - 0.04, ry + 0.035]) riv.push([0.0535, y, z]);
  ps.push(part(G.scatter(G.rivetHead(0.005), riv.map((p) => ({ p, n: [1, 0, 0] as G.V3 }))), P.gun));
  ps.push(part(G.scatter(G.rivetHead(0.005), riv.map((p) => ({ p: [-p[0], p[1], p[2]] as G.V3, n: [-1, 0, 0] as G.V3 }))), P.gun));
  // charging handle slot and handle on the right side
  ps.push(part(G.box(0.004, 0.012, 0.22), P.void, { p: [-0.054, ry + 0.01, -0.2] }));
  ps.push(part(rb(0.04, 0.03, 0.03, 0.006), P.gun, { p: [-0.07, ry + 0.01, -0.12] }));
  // backplate, spade grips, butterfly trigger
  ps.push(part(rb(0.13, 0.13, 0.03, 0.008), P.gun, { p: [0, ry, -0.435] }));
  for (const sx of [-1, 1]) {
    ps.push(part(G.rod([sx * 0.045, ry - 0.02, -0.45], [sx * 0.07, ry - 0.075, -0.56], 0.013, 8), P.gun));
    ps.push(part(G.rod([sx * 0.07, ry - 0.075, -0.56], [sx * 0.07, ry + 0.05, -0.56], 0.016, 10), P.rubber));
    ps.push(part(G.rod([sx * 0.07, ry + 0.05, -0.56], [sx * 0.045, ry + 0.03, -0.45], 0.012, 8), P.gun));
  }
  ps.push(part(rb(0.05, 0.03, 0.012, 0.004), P.gun, { p: [0, ry + 0.01, -0.46] }));
  // rear sight leaf (raised)
  ps.push(part(rb(0.03, 0.06, 0.012, 0.003), P.gun, { p: [0, ry + 0.1, -0.33] }));
  // perforated barrel support with front sight post
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
  // heavy barrel and muzzle
  ps.push(part(latheZ([[0.0, 0.0], [0.03, 0.0], [0.028, 0.6], [0.026, 0.95], [0.028, 0.96], [0.028, 0.99], [0.012, 0.99], [0.012, 0.95], [0.0, 0.95]], 16, 40), P.gun, { p: [0, ry, 0.34] }));
  // cradle and yoke under the receiver
  ps.push(part(rb(0.14, 0.03, 0.3, 0.006), P.gun, { p: [0, 0.03, -0.05] }));
  for (const sx of [-1, 1]) ps.push(part(rb(0.012, 0.07, 0.08, 0.004), P.gun, { p: [sx * 0.065, 0.05, 0.08] }));
  ps.push(part(G.cyl(0.018, 0.018, 0.16, 10), P.gun, { p: [0, 0.07, 0.08], r: [0, 0, 90] }));
  ps.push(part(G.cyl(0.028, 0.03, 0.06, 12), P.gun, { p: [0, 0.0, 0.0] }));
  // ammunition chest on its tray (left side) and the belt stub into the feedway
  ps.push(part(rb(0.1, 0.2, 0.3, 0.008), P.paint, { p: [0.12, ry - 0.02, -0.02] }));
  ps.push(part(rb(0.104, 0.012, 0.29, 0.004), P.paint, { p: [0.12, ry + 0.085, -0.02] }));
  ps.push(part(G.box(0.03, 0.01, 0.06), P.gun, { p: [0.12, ry + 0.095, -0.02] }));
  ps.push(part(rb(0.13, 0.012, 0.32, 0.004), P.gun, { p: [0.12, ry - 0.125, -0.02] }));
  ps.push(part(G.rod([0.06, ry - 0.12, -0.02], [0.02, 0.03, -0.02], 0.01, 8), P.gun));
  const belt: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.CylinderGeometry(0.0105, 0.0105, 0.1, 8);
    c.rotateX(Math.PI / 2);
    c.translate(0.07 - i * 0.02, ry + 0.07 - i * 0.004, 0.0);
    belt.push(c);
  }
  ps.push(part(merge(belt), P.brass));
  return group(ps);
}
