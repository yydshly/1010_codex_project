/**
 * PaK 40 split trails: tubular trails with hinge forks, end castings with ground skids, folding
 * spades with locking levers, carrying handles, towing eye (lunette) on the left trail's end.
 * Deployed: trails spread, spades hanging into the ground. Closed: trails swung together (the
 * lunette sits on the centre line between the ends) and the spades folded forward onto the trails.
 *
 * Trail-local frame: origin on the hinge-pin axis at the knuckle centre, trail running along -Z.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Palette } from './palette';
import { HINGE, SPREAD_DEPLOYED, CLOSED_END_X } from './layout';
import { cylX, cylY, stadium, v3, D2R, type V2 } from './util';

/** Hinge pin to the trail end (end casting spans -L-0.06 .. -L+0.13). */
export const TRAIL_L = 3.12;
const YE = -0.13;
const R0 = 0.064, R1 = 0.056;
const A = v3(0, 0, -0.25);
const B = v3(0, YE + 0.004, -TRAIL_L + 0.1);
const PIV = v3(0, YE + 0.09, -TRAIL_L - 0.09);
const RAKE = 5;
const BLADE = 0.392;
const FOLD = -95;
const END_W = 0.14;

const yAxis = (z: number) => A.y + ((z - A.z) * (B.y - A.y)) / (B.z - A.z);
const rAxis = (z: number) => R0 + ((z - A.z) * (R1 - R0)) / (B.z - A.z);

function spade(P: Palette, folded: boolean): THREE.Group {
  const out: THREE.Object3D[] = [];
  out.push(part(cylX(0.028, -0.058, 0.058, 24, 0, 0, 0.004), P.paint));
  const blade: V2[] = [
    [-0.06, -0.02], [-0.075, -0.06], [-0.165, -0.12], [-0.165, -0.35], [-0.145, -0.365],
    [0.145, -0.365], [0.165, -0.35], [0.165, -0.12], [0.075, -0.06], [0.06, -0.02],
  ];
  out.push(part(G.plate(blade, 0.012, 'xy', 0.003, 0.01), P.paint));
  const edge = part(G.plate([[-0.145, -0.358], [-0.135, -BLADE], [0.135, -BLADE], [0.145, -0.358]], 0.009, 'xy', 0.003), P.worn);
  edge.userData.contact = true;
  out.push(edge);
  // gussets and centre rib on the front face, bent-over side flanges
  for (const x of [-0.045, 0.045]) out.push(part(G.plate([[0.004, -0.02], [0.004, -0.2], [0.024, -0.02]], 0.012, 'zy', 0.002), P.paint, { p: [x, 0, 0] }));
  out.push(part(G.rbox(0.014, 0.25, 0.024, 0.004, 2), P.paint, { p: [0, -0.215, 0.016] }));
  for (const x of [-0.159, 0.159]) out.push(part(G.rbox(0.012, 0.22, 0.03, 0.004, 2), P.paint, { p: [x, -0.235, 0.014] }));
  // locking lever on the outer side
  out.push(part(cylX(0.022, 0.101, 0.119, 16, 0, 0, 0.003), P.paint));
  out.push(part(G.rod([0.11, 0, 0], [0.11, 0.13, 0.06], 0.008, 8), P.steel));
  out.push(part(new THREE.SphereGeometry(0.016, 12, 8), P.grip, { p: [0.11, 0.13, 0.06] }));
  const g = group(out);
  g.position.copy(PIV);
  g.rotation.x = (folded ? FOLD : -RAKE) * D2R;
  return g;
}

function trailLocal(P: Palette, lunette: boolean, folded: boolean): THREE.Group {
  const out: THREE.Object3D[] = [];
  // hinge fork: lugs above and below the carriage knuckle, pin with head
  for (const y of [0.064, -0.064]) {
    out.push(part(G.plate(stadium([0, 0.0], [0, -0.17], 0.052, 0.066, 10), 0.022, 'xz', 0.004), P.paint, { p: [0, y, 0] }));
  }
  out.push(part(G.rbox(0.14, 0.15, 0.2, 0.024, 3), P.paint, { p: [0, 0, -0.2] }));
  out.push(part(cylY(0.017, -0.088, 0.088, 16, 0, 0), P.steel));
  out.push(part(cylY(0.028, 0.075, 0.088, 6, 0, 0, 0.002), P.paint));
  // tapered tube
  out.push(part(G.rod(A, B, R0, 28, R1), P.paint));
  const slope = Math.atan2(B.y - A.y, -(B.z - A.z)) / D2R;
  for (const z of [-0.3, -TRAIL_L + 0.13]) {
    out.push(part(G.torus(rAxis(z) + 0.002, 0.0055, 6, 28), P.paint, { p: [0, yAxis(z), z], r: [slope, 0, 0] }));
  }
  // end casting with ground skid
  out.push(part(G.rbox(END_W, 0.13, 0.19, 0.022, 3), P.paint, { p: [0, YE, -TRAIL_L + 0.035] }));
  const skid = part(G.rbox(0.128, 0.012, 0.16, 0.004, 2), P.paint, { p: [0, YE - 0.069, -TRAIL_L + 0.03] });
  skid.userData.contact = true;
  out.push(skid);
  // spade pivot lugs + pin
  for (const x of [-0.08, 0.08]) {
    out.push(part(G.plate(stadium([-TRAIL_L - 0.01, YE + 0.035], [PIV.z, PIV.y], 0.04, 0.034, 10), 0.02, 'zy', 0.004), P.paint, { p: [x, 0, 0] }));
  }
  out.push(part(cylX(0.017, -0.104, 0.104, 16, PIV.y, PIV.z), P.steel));
  for (const s of [1, -1]) out.push(part(cylX(0.022, s * 0.09, s * 0.1, 6, PIV.y, PIV.z, 0.002), P.steel));
  out.push(spade(P, folded));
  // carrying handles: one on top mid-way, one on the outer side near the end
  const hTop = (z1: number, z2: number) => {
    const y1 = yAxis(z1) + rAxis(z1) * 0.85, y2 = yAxis(z2) + rAxis(z2) * 0.85;
    return G.tube([[0, y1, z1], [0, y1 + 0.07, z1 - 0.03], [0, y2 + 0.07, z2 + 0.03], [0, y2, z2]], 0.0105, 8, 32);
  };
  const hSide = (z1: number, z2: number) => {
    const x1 = rAxis(z1) * 0.85, x2 = rAxis(z2) * 0.85;
    return G.tube([[x1, yAxis(z1), z1], [x1 + 0.07, yAxis(z1) + 0.004, z1 - 0.03], [x2 + 0.07, yAxis(z2) + 0.004, z2 + 0.03], [x2, yAxis(z2), z2]], 0.0105, 8, 32);
  };
  out.push(part(hTop(-1.42, -1.72), P.paint));
  out.push(part(hSide(-TRAIL_L + 0.66, -TRAIL_L + 0.42), P.paint));
  if (lunette) {
    // towing eye on a bracket from the end casting's inner face; centred between the closed ends
    const lx = -(CLOSED_END_X + END_W / 2);
    const bx0 = -END_W / 2 + 0.01, bx1 = lx + 0.05;
    out.push(part(G.rbox(bx0 - bx1, 0.045, 0.07, 0.008, 2), P.paint, { p: [(bx0 + bx1) / 2, YE, -TRAIL_L + 0.02] }));
    out.push(part(G.torus(0.045, 0.016, 12, 32), P.steel, { p: [lx, YE, -TRAIL_L + 0.02], r: [90, 0, 0] }));
  }
  return group(out);
}

/** Both trails in the raw frame. */
export function trails(P: Palette, closed: boolean): THREE.Group {
  const endX = CLOSED_END_X + END_W / 2;
  const a = closed ? Math.asin((HINGE.x - endX) / TRAIL_L) / D2R : -SPREAD_DEPLOYED;
  const left = trailLocal(P, true, closed);
  left.rotation.y = a * D2R;
  left.position.set(HINGE.x, HINGE.y, HINGE.z);
  const rightInner = trailLocal(P, false, closed);
  rightInner.rotation.y = a * D2R;
  rightInner.position.set(HINGE.x, HINGE.y, HINGE.z);
  const right = new THREE.Group();
  right.scale.x = -1;
  right.add(rightInner);
  const g = group([left, right]);
  g.name = 'pak40-trails';
  return g;
}
