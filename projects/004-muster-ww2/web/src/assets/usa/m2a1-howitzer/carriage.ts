/**
 * Bottom carriage of the M2A1 carriage: fabricated box carrying the pintle bearing of the top
 * carriage and the trail hinge lugs; in front of it the girder axle with the wheel spindles,
 * pivoting on the longitudinal equalizing pin (lets the wheels follow uneven ground in action;
 * axle locks for travel); hand parking-brake levers on the front, brake rods to the drums; the
 * horizontal traversing rack; the two road wheels.
 *
 * Construction frame (see dims.ts): axle on X at z = 0, ground y = 0, +Z muzzle, +X gun's left.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { buildWheel } from './wheel';
import { cylX, cylY, cylZ, latheZ, type V2, type V3 } from './util';

const BC = D.bc;
const AX = D.axle;

/** Pintle bearing top face (the top carriage sits on it). */
export const RACE_TOP = BC.y1 + 0.024;

function box(): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const w = BC.x * 2, l = BC.z1 - BC.z0;
  const cz = (BC.z0 + BC.z1) / 2;
  // side plates in side view: deeper at the front (girder joint), chamfered underside at the rear
  const side: V2[] = [
    [BC.z0, BC.y0 + 0.12],
    [BC.z0 + 0.12, BC.y0],
    [BC.z1, BC.y0],
    [BC.z1, BC.y1],
    [BC.z0, BC.y1],
  ];
  o.push(part(G.plate(side, w - 0.016, 'zy', 0.006), P.paint()));
  // top plate (overhangs a little) with a lip, bottom plate
  o.push(part(G.rbox(w + 0.02, 0.016, l + 0.02, 0.005, 2), P.paint(), { p: [0, BC.y1 - 0.008, cz] }));
  o.push(part(G.rbox(w - 0.04, 0.012, l - 0.16, 0.004, 1), P.paint(), { p: [0, BC.y0 + 0.004, cz + 0.06] }));
  // welded edge strips on the side plates (front, rear) and a longitudinal stiffening rib
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(0.012, BC.y1 - BC.y0 - 0.03, 0.05, 0.003, 1), P.paint(), { p: [sx * (BC.x - 0.002), (BC.y0 + BC.y1) / 2 + 0.01, BC.z1 - 0.03] }));
    o.push(part(G.rbox(0.012, 0.03, l - 0.2, 0.003, 1), P.paint(), { p: [sx * (BC.x - 0.002), BC.y0 + 0.1, cz + 0.05] }));
    o.push(part(G.weld([[sx * (BC.x - 0.01), BC.y1 - 0.02, BC.z0 + 0.02], [sx * (BC.x - 0.01), BC.y1 - 0.02, BC.z1 - 0.02]], 0.0035), P.paint()));
  }
  // rear plate between the hinge lugs
  o.push(part(G.rbox(w - 0.02, BC.y1 - BC.y0 - 0.14, 0.014, 0.004, 1), P.paint(), { p: [0, (BC.y0 + BC.y1) / 2 + 0.06, BC.z0 + 0.007] }));

  // pintle bearing: race ring + bolt ring on the top plate
  const pz = D.pintleZ;
  o.push(part(G.lathe([[0.08, BC.y1], [0.215, BC.y1], [0.222, BC.y1 + 0.006], [0.222, BC.y1 + 0.018], [0.2, RACE_TOP], [0.08, RACE_TOP]], 64, 35), P.cast(), { p: [0, 0, pz] }));
  const bolts = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2 + 0.1;
    return { p: [Math.cos(a) * 0.238, BC.y1, pz + Math.sin(a) * 0.238] as V3 };
  });
  o.push(part(G.scatter(G.boltHead(0.018, 0.008), bolts), P.cast()));

  // traversing rack: curved toothed segment (horizontal) at the rear of the race, left of centre
  const rackR = 0.25, a0 = THREE.MathUtils.degToRad(-128), a1 = THREE.MathUtils.degToRad(-62);
  const nT = 30;
  const pts: V2[] = [];
  for (let i = 0; i <= nT * 2; i++) {
    const a = a0 + ((a1 - a0) * i) / (nT * 2);
    const r = i % 2 === 0 ? rackR : rackR + 0.009;
    pts.push([Math.cos(a) * r, -Math.sin(a) * r]);
  }
  for (let i = 12; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / 12;
    pts.push([Math.cos(a) * (rackR - 0.03), -Math.sin(a) * (rackR - 0.03)]);
  }
  // 'xz' plate: outline x -> X, outline y -> Z; rack sits on the top plate behind the race
  o.push(part(G.plate(pts.map(([x, z]) => [x, -z] as V2), 0.03, 'xz', 0.002), P.cast(), { p: [0, BC.y1 + 0.015, pz] }));
  return o;
}

function hingeLugs(): THREE.Object3D[] {
  // Left trail hinge (+X): upper and lower lug plates projecting from the rear corner, pin.
  const o: THREE.Object3D[] = [];
  const x = D.hingeX, z = D.hingeZ;
  for (const y of [D.hingeY + 0.118, D.hingeY - 0.118]) {
    const lug: V2[] = [
      [x - 0.12, BC.z0 + 0.06],
      [x + 0.06, BC.z0 + 0.06],
      [x + 0.066, z],
      [x + 0.045, z - 0.05],
      [x - 0.03, z - 0.066],
      [x - 0.1, z - 0.02],
    ];
    o.push(part(G.plate(lug, 0.026, 'xz', 0.005, 0.012), P.cast(), { p: [0, y, 0] }));
  }
  // hinge boss web between the lugs (vertical, at the box corner)
  o.push(part(G.rbox(0.05, 0.21, 0.08, 0.008, 1), P.cast(), { p: [x - 0.05, D.hingeY, BC.z0 - 0.01] }));
  // pin with head and nut
  o.push(part(cylY(0.026, D.hingeY - 0.15, D.hingeY + 0.15, 20, 0.003), P.bright(), { p: [x, 0, z] }));
  o.push(part(cylY(0.04, D.hingeY + 0.131, D.hingeY + 0.145, 24, 0.003), P.cast(), { p: [x, 0, z] }));
  o.push(part(G.cyl(0.034, 0.034, 0.014, 6), P.cast(), { p: [x, D.hingeY - 0.139, z] }));
  // gusset under the lower lug
  o.push(part(G.plate([[BC.z0 + 0.05, 0], [BC.z0 - 0.04, 0], [BC.z0 + 0.05, -0.08]], 0.016, 'zy', 0.003), P.paint(), { p: [x - 0.03, D.hingeY - 0.131, 0] }));
  return o;
}

function axleGirder(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const cy = (AX.y0 + AX.y1) / 2, h = AX.y1 - AX.y0;
  // fabricated box girder: front + rear webs, top + bottom flanges
  o.push(part(G.rbox(AX.x * 2, h, AX.hz * 2, 0.01, 2), P.paint(), { p: [0, cy, 0] }));
  for (const y of [AX.y1 + 0.006, AX.y0 - 0.006]) {
    o.push(part(G.rbox(AX.x * 2 - 0.04, 0.012, AX.hz * 2 + 0.03, 0.004, 1), P.paint(), { p: [0, y, 0] }));
  }
  // vertical stiffeners on the front web
  for (const x of [-0.46, -0.2, 0.2, 0.46]) {
    o.push(part(G.rbox(0.012, h - 0.02, 0.018, 0.003, 1), P.paint(), { p: [x, cy, AX.hz + 0.008] }));
  }
  // spindle ends: collar + spindle into the hub (both sides)
  for (const sx of [1, -1]) {
    o.push(part(cylX(0.075, 0, 0.03, 32, 0.005), P.cast(), { p: [sx > 0 ? AX.x - 0.01 : -AX.x - 0.02, D.axleY, 0] }));
    const x0 = AX.x + 0.02, x1 = D.wheelX - 0.16;
    o.push(part(cylX(0.05, sx > 0 ? x0 : -x1, sx > 0 ? x1 : -x0, 24, 0.003), P.cast(), { p: [0, D.axleY, 0] }));
  }
  // equalizing support: cast boss on the front web with the longitudinal pivot pin
  o.push(part(cylZ(0.085, AX.hz, AX.hz + 0.05, 36, 0.006), P.cast(), { p: [0, D.axleY, 0] }));
  o.push(part(cylZ(0.04, AX.hz + 0.05, AX.hz + 0.068, 24, 0.003), P.bright(), { p: [0, D.axleY, 0] }));
  o.push(part(G.cyl(0.05, 0.05, 0.016, 6), P.cast(), { p: [0, D.axleY, AX.hz + 0.074], r: [90, 0, 0] }));
  o.push(part(G.scatter(G.boltHead(0.016, 0.007), Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return { p: [Math.cos(a) * 0.066, D.axleY + Math.sin(a) * 0.066, AX.hz + 0.05] as V3, n: [0, 0, 1] as V3 };
  })), P.cast()));
  // rear: bearing housings joining the girder to the bottom-carriage front
  o.push(part(cylZ(0.09, -AX.hz - 0.03, -AX.hz, 36, 0.006), P.cast(), { p: [0, D.axleY, 0] }));
  o.push(part(G.rbox(0.36, 0.1, BC.z1 * -1 - AX.hz + 0.01, 0.01, 2), P.cast(), { p: [0, D.axleY + 0.04, (BC.z1 - AX.hz) / 2] }));
  // axle locks: short levers on the girder top each side of the centre (travel position)
  for (const sx of [1, -1]) {
    const lx = sx * 0.12;
    o.push(part(G.rbox(0.04, 0.04, 0.07, 0.006, 1), P.cast(), { p: [lx, AX.y1 + 0.03, 0.01] }));
    o.push(part(cylX(0.012, -0.03, 0.03, 12, 0.002), P.bright(), { p: [lx, AX.y1 + 0.035, 0.01] }));
    o.push(part(G.rod([lx + sx * 0.022, AX.y1 + 0.035, 0.01], [lx + sx * 0.03, AX.y1 + 0.14, 0.07], 0.009, 10), P.paint()));
    o.push(part(new THREE.SphereGeometry(0.014, 12, 8), P.paint(), { p: [lx + sx * 0.03, AX.y1 + 0.14, 0.07] }));
  }
  void hi;
  return o;
}

function handBrake(): THREE.Object3D[] {
  // Left side (+X): ratchet quadrant on the girder front, lever standing up, rod to the drum cam.
  const o: THREE.Object3D[] = [];
  const x = 0.6, zf = AX.hz + 0.004;
  // quadrant plate (toothed arc) and pivot boss
  const q: V2[] = [];
  const pr = 0.09;
  for (let i = 0; i <= 20; i++) {
    const a = THREE.MathUtils.degToRad(40 + (i / 20) * 70);
    const r = i % 2 === 0 ? pr : pr + 0.008;
    q.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  q.push([0.01, 0.0], [0.04, -0.02]);
  o.push(part(G.plate(q, 0.01, 'zy', 0.002), P.cast(), { p: [x + 0.03, AX.y1 - 0.06, zf + 0.03], r: [0, 0, 0] }));
  o.push(part(G.rbox(0.05, 0.08, 0.05, 0.008, 1), P.cast(), { p: [x, AX.y1 - 0.07, zf + 0.02] }));
  o.push(part(cylX(0.016, x - 0.035, x + 0.04, 14, 0.002), P.bright(), { p: [0, AX.y1 - 0.06, zf + 0.03] }));
  // lever: flat bar rising forward, round grip
  const l0: V3 = [x + 0.015, AX.y1 - 0.06, zf + 0.03];
  const l1: V3 = [x + 0.015, AX.y1 + 0.26, zf + 0.13];
  o.push(part(G.rod(l0, l1, 0.012, 10, 0.009), P.paint()));
  o.push(part(G.rod([l1[0], l1[1] - 0.06, l1[2] - 0.018], [l1[0], l1[1] + 0.02, l1[2] + 0.006], 0.014, 12), P.bright()));
  o.push(part(G.rod([l1[0] - 0.012, l1[1] - 0.08, l1[2] - 0.024], [l1[0] - 0.012, AX.y1 - 0.02, zf + 0.05], 0.004, 6), P.bright()));
  // brake rod under the girder to the cam lever at the backing plate
  o.push(part(G.rod([x, AX.y0 + 0.04, zf + 0.01], [D.wheelX - 0.11, D.axleY + 0.13, -0.09], 0.007, 8), P.bright()));
  return o;
}

export function buildBottomCarriage(detail: 'high' | 'low'): THREE.Group {
  const hi = detail === 'high';
  const parts: THREE.Object3D[] = [];
  parts.push(...box());
  parts.push(mirrorX(group(hingeLugs())));
  parts.push(...axleGirder(hi));
  parts.push(mirrorX(group(handBrake())));
  // wheels (left, and a mirrored right wheel turned to a different rotation)
  const wl = buildWheel({ detail, spin: 14 });
  wl.position.set(D.wheelX, D.axleY, 0);
  parts.push(wl);
  const wr = buildWheel({ detail, spin: -31 });
  wr.position.set(D.wheelX, D.axleY, 0);
  const holder = group([wr]);
  holder.scale.x = -1;
  parts.push(holder);
  return group(parts, { name: 'bottom-carriage' });
}

export { latheZ };
