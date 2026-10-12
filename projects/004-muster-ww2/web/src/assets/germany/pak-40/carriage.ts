/**
 * PaK 40 carriage: torsion-bar axle tube with trailing crank arms and wheel spindles, lower
 * carriage with the traverse bearing and the trail hinge knuckles, top carriage (base plate,
 * cheeks with trunnion bearings), elevating gear + hand wheel and traversing gear + hand wheel
 * on the gunner's (left, +X) side. Raw frame, 0 deg traverse.
 */
import { THREE, G, part } from '../../../core/kit';
import type { Palette } from './palette';
import { TRUNNION, AXLE_Y, AXLE_Z, WHEEL_Y, HINGE, CHEEK_X, CHEEK_T } from './layout';
import { cylX, cylY, cylZ, bolts, stadium, circle, v3, D2R, type V2 } from './util';

/** Hand wheel with three spokes and a crank grip. Local: axis +X, grip on the +X side. */
function handWheel(P: Palette, R: number, gripAngle: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  out.push(part(G.torus(R, 0.0105, 10, 48), P.paint, { r: [0, 90, 0] }));
  out.push(part(cylX(0.024, -0.018, 0.016, 24, 0, 0, 0.003), P.paint));
  out.push(part(cylX(0.012, 0.016, 0.024, 12), P.steel));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + gripAngle + Math.PI / 3;
    const e = v3(0, Math.cos(a), Math.sin(a));
    out.push(part(G.rod(e.clone().multiplyScalar(0.02).setX(-0.004), e.clone().multiplyScalar(R - 0.006), 0.0075, 8), P.paint));
  }
  // crank grip on the rim
  const g = v3(0, Math.cos(gripAngle) * R, Math.sin(gripAngle) * R);
  out.push(part(cylX(0.009, 0, 0.018, 10, g.y, g.z), P.steel));
  out.push(part(G.lathe([[0, 0], [0.013, 0.003], [0.016, 0.02], [0.0155, 0.06], [0.012, 0.075], [0, 0.077]], 16, 50), P.grip, {
    p: [0.016, g.y, g.z],
    r: [0, 0, -90],
  }));
  return out;
}

/** Axle tube, crank arms, spindles. */
function axle(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  out.push(part(cylX(0.05, -0.655, 0.655, 32, AXLE_Y, AXLE_Z, 0.004), P.paint));
  for (const s of [1, -1]) {
    // end boss with the torsion-bar anchor
    out.push(part(cylX(0.062, s * 0.6, s * 0.66, 32, AXLE_Y, AXLE_Z, 0.005), P.paint));
    out.push(part(bolts([v3(s * 0.66, AXLE_Y + 0.035, AXLE_Z), v3(s * 0.66, AXLE_Y - 0.035, AXLE_Z), v3(s * 0.66, AXLE_Y, AXLE_Z + 0.035), v3(s * 0.66, AXLE_Y, AXLE_Z - 0.035)], [s, 0, 0], 0.016, 0.007), P.paint));
    // trailing crank arm
    out.push(part(G.plate(stadium([AXLE_Z, AXLE_Y], [0, WHEEL_Y], 0.056, 0.052, 10), 0.032, 'zy', 0.006), P.paint, { p: [s * 0.682, 0, 0] }));
    // spindle boss towards the wheel hub
    out.push(part(cylX(0.045, s * 0.698, s * 0.716, 28, WHEEL_Y, 0, 0.004), P.paint));
    // axle clamps holding the lower carriage
    for (const x of [0.24, 0.42]) out.push(part(cylX(0.058, s * (x - 0.025), s * (x + 0.025), 28, AXLE_Y, AXLE_Z, 0.004), P.paint));
  }
  return out;
}

/** Lower carriage body, traverse bearing, trail-hinge knuckles. */
function lowerCarriage(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // welded box saddle over the axle
  out.push(part(G.rbox(0.42, 0.13, 0.5, 0.018, 3), P.paint, { p: [0, 0.475, -0.1] }));
  // side webs down to the axle clamps
  for (const s of [1, -1]) {
    const web: V2[] = [[0.2, 0.43], [0.2, 0.53], [-0.33, 0.53], [-0.33, 0.43], [-0.05, 0.4]];
    out.push(part(G.plate(web, 0.014, 'zy', 0.003), P.paint, { p: [s * 0.214, 0, 0] }));
    // knuckle web + vertical knuckle for the trail pin
    out.push(part(G.rbox(0.075, 0.07, 0.12, 0.012, 2), P.paint, { p: [s * 0.2, HINGE.y, HINGE.z + 0.06] }));
    out.push(part(cylY(0.042, HINGE.y - 0.041, HINGE.y + 0.041, 28, s * HINGE.x, HINGE.z, 0.004), P.paint));
  }
  // traverse bearing ring on top of the saddle
  out.push(part(cylY(0.2, 0.538, 0.556, 48, 0, -0.12, 0.004), P.paint));
  // bolt rows on the saddle top
  const sb: THREE.Vector3[] = [];
  for (const x of [-0.18, 0.18]) for (const z of [0.1, -0.3]) sb.push(v3(x, 0.54, z));
  out.push(part(bolts(sb, [0, 1, 0], 0.018, 0.008), P.paint));
  return out;
}

/** Top carriage: base plate, cheeks, trunnion bearings, cross members. */
function topCarriage(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const tz = TRUNNION.z, ty = TRUNNION.y;
  out.push(part(G.rbox(0.4, 0.03, 0.72, 0.008, 2), P.paint, { p: [0, 0.571, -0.26] }));
  const cheek: V2[] = [
    [0.08, 0.586],
    [0.08, 0.72],
    [-0.15, 0.95],
    [-0.24, 0.978],
    [-0.36, 0.975],
    [-0.44, 0.935],
    [-0.54, 0.79],
    [-0.54, 0.586],
  ];
  const cx = CHEEK_X - CHEEK_T / 2;
  for (const s of [1, -1]) {
    const hole = circle(-0.24, 0.72, 0.055, 20);
    const g = G.extrude(G.shape(cheek, 0.02, [hole]), CHEEK_T, 0.004, 8, 1);
    g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    G.flipWinding(g);
    out.push(part(g, P.paint, { p: [s * cx, 0, 0] }));
    // flange along the cheek's sloping front edge
    const a = v3(s * cx, 0.72, 0.08), b = v3(s * cx, 0.95, -0.15);
    const d = b.clone().sub(a);
    const len = d.length();
    out.push(part(G.rbox(0.05, len, 0.012, 0.004, 2), P.paint, {
      p: a.clone().add(b).multiplyScalar(0.5).add(v3(0, 0.004, 0.004)),
      r: [Math.atan2(d.z, d.y) / D2R, 0, 0],
    }));
    // trunnion bearing
    out.push(part(cylX(0.068, s * CHEEK_X, s * (CHEEK_X + (s > 0 ? 0.033 : 0.022)), 36, ty, tz, 0.004), P.paint));
    // fillet welds at the base
    out.push(part(G.rod([s * (cx + 0.01), 0.588, 0.07], [s * (cx + 0.01), 0.588, -0.53], 0.006, 6), P.paint));
  }
  // right trunnion cap + bolts
  out.push(part(cylX(0.05, -(CHEEK_X + 0.022), -(CHEEK_X + 0.034), 32, ty, tz, 0.003), P.paint));
  const cb: THREE.Vector3[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    cb.push(v3(-(CHEEK_X + 0.022), ty + Math.sin(a) * 0.058, tz + Math.cos(a) * 0.058));
  }
  out.push(part(bolts(cb, [-1, 0, 0], 0.016, 0.007), P.paint));
  // cross members between the cheeks
  out.push(part(G.rbox(2 * cx - CHEEK_T, 0.1, 0.05, 0.008, 2), P.paint, { p: [0, 0.636, 0.045] }));
  out.push(part(G.rbox(2 * cx - CHEEK_T, 0.08, 0.04, 0.008, 2), P.paint, { p: [0, 0.626, -0.51] }));
  return out;
}

/** Elevating gear (pinion on the arc) with its hand wheel, left side. */
function elevatingGear(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const tz = TRUNNION.z, ty = TRUNNION.y;
  const a = -118 * D2R;
  const pz = tz + Math.cos(a) * 0.3, py = ty + Math.sin(a) * 0.3;
  // pinion
  out.push(part(cylX(0.028, 0.204, 0.224, 14, py, pz, 0.002), P.steel));
  // gearbox on the cheek
  out.push(part(G.rbox(0.038, 0.1, 0.11, 0.01, 2), P.paint, { p: [0.184, py - 0.035, pz] }));
  out.push(part(cylX(0.034, 0.2, 0.24, 24, py - 0.05, pz, 0.003), P.paint));
  // shaft to the hand wheel
  out.push(part(cylX(0.013, 0.24, 0.34, 12, py - 0.05, pz), P.steel));
  const hw = handWheel(P, 0.1, 40 * D2R);
  for (const o of hw) {
    o.position.add(v3(0.345, py - 0.05, pz));
    out.push(o);
  }
  return out;
}

/** Traversing gear: hand wheel facing the gunner, worm housing on a bracket, left rear. */
function traversingGear(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const x = 0.33, y = 0.72, z = -0.7;
  // bracket from the left cheek
  const br: V2[] = [[-0.5, 0.6], [-0.5, 0.76], [-0.64, 0.76], [-0.64, 0.6]];
  out.push(part(G.plate(br, 0.014, 'zy', 0.003), P.paint, { p: [CHEEK_X + 0.007, 0, 0] }));
  out.push(part(G.rbox(0.18, 0.06, 0.06, 0.01, 2), P.paint, { p: [0.25, y, -0.6] }));
  // worm housing and vertical drive to the traverse ring
  out.push(part(cylZ(0.036, -0.64, -0.56, 24, x, y, 0.004), P.paint));
  out.push(part(cylY(0.016, 0.585, y - 0.03, 12, 0.25, -0.6), P.steel));
  // shaft + hand wheel (axis along Z, grip towards the gunner)
  out.push(part(cylZ(0.013, z, -0.64, 12, x, y), P.steel));
  const hw = handWheel(P, 0.085, 150 * D2R);
  const g = new THREE.Group();
  for (const o of hw) g.add(o);
  // local +X (grip side) -> world -Z (towards the gunner)
  g.rotation.set(0, Math.PI / 2, 0);
  g.position.set(x, y, z);
  out.push(g);
  return out;
}

export function carriage(P: Palette): THREE.Object3D[] {
  return [...axle(P), ...lowerCarriage(P), ...topCarriage(P), ...elevatingGear(P), ...traversingGear(P)];
}

