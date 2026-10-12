/**
 * Shield of the M2A1 carriage (the early, single-layer type): left and right main shields joined
 * below the cradle by a V-shaped lower web, upper edges folded back, the outer parts raised clear
 * of the tyres so the shield can traverse with the top carriage; vertical sight slot in the left
 * shield for the elbow telescope, rear stiffeners and a tool box on the right shield.
 *
 * Construction frame: back face of the main shield on z = D.shieldZ, +X gun's left.
 */
import { G, part, group, THREE } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, type V3 } from './util';

const T = D.shieldT;
const TOP = 1.3; // top of the vertical part
const FOLD = 0.12; // folded-back strip length
const FOLD_DEG = 35;

/** Sight slot in the left shield (front view x, y). */
const SLOT = { x: 0.3, y0: 1.07, y1: 1.29, hw: 0.024 };

function outline(): V2[] {
  // full shield in front view (x, y), counter-clockwise
  const pts: V2[] = [
    // bottom of the V web and right half (negative x)
    [0.0, 0.7],
    [-0.1, 0.64],
    [-0.46, 0.64],
    [-0.46, 1.06],
    [-0.8, 1.06],
    [-0.8, TOP],
    [-0.205, TOP],
    [-0.205, 0.87],
    [0.0, 0.79],
    [0.205, 0.87],
    [0.205, TOP],
    [0.8, TOP],
    [0.8, 1.06],
    [0.46, 1.06],
    [0.46, 0.64],
    [0.1, 0.64],
  ];
  return pts.reverse();
}

export function buildShield(): THREE.Group {
  const o: THREE.Object3D[] = [];
  const zc = D.shieldZ + T / 2;
  const slot: V2[] = [
    [SLOT.x - SLOT.hw, SLOT.y0],
    [SLOT.x + SLOT.hw, SLOT.y0],
    [SLOT.x + SLOT.hw, SLOT.y1],
    [SLOT.x - SLOT.hw, SLOT.y1],
  ];
  const sh = G.shape(outline(), 0.02, [slot.reverse()]);
  o.push(part(G.extrude(sh, T, 0.0015, 6, 1), P.paint(), { p: [0, 0, zc] }));
  // folded-back top strips (one per side)
  const a = THREE.MathUtils.degToRad(FOLD_DEG);
  for (const sx of [1, -1]) {
    const w = 0.8 - 0.205;
    const cx = sx * (0.205 + w / 2);
    o.push(part(G.rbox(w, FOLD, T, 0.0015, 1), P.paint(), { p: [cx, TOP + (FOLD / 2) * Math.cos(a) - 0.002, zc - (FOLD / 2) * Math.sin(a)], r: [-FOLD_DEG, 0, 0] }));
    // fold bead
    o.push(part(G.rod([sx * 0.215, TOP - 0.001, zc], [sx * 0.79, TOP - 0.001, zc], 0.004, 8), P.paint()));
  }
  // slot frame (front face) and sliding shutter guides
  const fz = D.shieldZ + T;
  o.push(part(G.rbox(0.012, SLOT.y1 - SLOT.y0 + 0.04, 0.008, 0.002, 1), P.paint(), { p: [SLOT.x - SLOT.hw - 0.012, (SLOT.y0 + SLOT.y1) / 2, fz + 0.004] }));
  o.push(part(G.rbox(0.012, SLOT.y1 - SLOT.y0 + 0.04, 0.008, 0.002, 1), P.paint(), { p: [SLOT.x + SLOT.hw + 0.012, (SLOT.y0 + SLOT.y1) / 2, fz + 0.004] }));
  // rear stiffeners: angle strips down each panel and along the lower edges
  const bz = D.shieldZ - 0.0005;
  for (const sx of [1, -1]) {
    for (const x of [0.46, 0.7]) {
      const y0 = x > 0.5 ? 1.08 : 0.68;
      o.push(part(G.rbox(0.035, TOP - y0 - 0.02, 0.005, 0.0015, 1), P.paint(), { p: [sx * x, (TOP + y0) / 2, bz - 0.0025] }));
      o.push(part(G.rbox(0.005, TOP - y0 - 0.02, 0.03, 0.0015, 1), P.paint(), { p: [sx * (x + 0.015), (TOP + y0) / 2, bz - 0.015] }));
    }
    o.push(part(G.rbox(0.3, 0.03, 0.005, 0.0015, 1), P.paint(), { p: [sx * 0.31, 0.665, bz - 0.0025] }));
    o.push(part(G.rbox(0.33, 0.03, 0.005, 0.0015, 1), P.paint(), { p: [sx * 0.63, 1.085, bz - 0.0025] }));
  }
  // bolt heads on the front face (stiffener and bracket attachments)
  const fb: { p: V3; n: V3 }[] = [];
  for (const sx of [1, -1]) {
    for (const y of [0.72, 0.9, 1.1, 1.26]) fb.push({ p: [sx * 0.46, y, fz], n: [0, 0, 1] });
    for (const y of [1.12, 1.26]) fb.push({ p: [sx * 0.7, y, fz], n: [0, 0, 1] });
    for (const y of [0.92, 1.02, 1.1]) fb.push({ p: [sx * 0.23, y, fz], n: [0, 0, 1] });
    fb.push({ p: [sx * 0.56, 1.12, fz], n: [0, 0, 1] });
    fb.push({ p: [sx * 0.6, 1.26, fz], n: [0, 0, 1] });
    for (const x of [0.2, 0.36]) fb.push({ p: [sx * x, 0.665, fz], n: [0, 0, 1] });
  }
  o.push(part(G.scatter(G.boltHead(0.017, 0.006), fb), P.paint()));
  // tool box on the rear of the right shield (lower inner corner)
  o.push(part(G.rbox(0.2, 0.14, 0.09, 0.008, 2), P.paint(), { p: [-0.3, 0.76, D.shieldZ - 0.047] }));
  o.push(part(G.rbox(0.206, 0.012, 0.096, 0.004, 1), P.paint(), { p: [-0.3, 0.834, D.shieldZ - 0.047] }));
  o.push(part(G.rbox(0.03, 0.03, 0.01, 0.003, 1), P.bright(), { p: [-0.3, 0.8, D.shieldZ - 0.095] }));
  return group(o, { name: 'shield' });
}
