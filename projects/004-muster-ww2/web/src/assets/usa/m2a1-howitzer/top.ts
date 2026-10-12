/**
 * Top carriage of the M2A1 carriage: cast turntable on the pintle bearing of the bottom carriage,
 * base with the two side cheeks carrying the trunnion bearings, elevating pinions meshing with
 * the cradle's toothed arcs (gearboxes on the cheeks, shaft and bevel box to the elevating
 * handwheel on the right), the worm-and-rack traversing gear with its handwheel on the left, the
 * spring equilibrator (compression springs on three guide rods, pushing the arcs' cross tube
 * below and behind the trunnions to balance the muzzle-heavy tube), shield supports, and the
 * Telescope Mount M21A1 with the Panoramic Telescope M12A2 on the left (gunner's) side.
 *
 * Construction frame (see dims.ts): axle on X at z = 0, ground y = 0, +Z muzzle, +X gun's left.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { RACE_TOP } from './carriage';
import { ARC, EQ_PIN } from './gun';
import { cylX, cylY, cylZ, latheZ, coilZ, ringProfile, type V2, type V3 } from './util';

const TY = D.trunY, TZ = D.trunZ, PZ = D.pintleZ;
/** Cheek plates: inner face |x|, thickness. */
export const CHEEK = { x: 0.19, t: 0.022 };
/** Top-carriage base slab. */
export const BASE = { y0: RACE_TOP, y1: 0.79, hx: 0.25, z0: -0.53, z1: 0.14 };
/** Elevating pinion: absolute angle about the trunnion (deg from +Z towards +Y) and radius. */
const PIN_A = THREE.MathUtils.degToRad(240);
const PIN_R = ARC.r + 0.011 + 0.024;
const PIN: V3 = [ARC.x, TY + Math.sin(PIN_A) * PIN_R, TZ + Math.cos(PIN_A) * PIN_R];
/** Equilibrator rear clevis. */
const EQ_REAR: V3 = [0, 0.842, -0.86];

/** Spoked handwheel in the YZ plane (axle along X), hub face towards +X, crank grip at a0. */
export function handwheel(R: number, a0: number, spokes: number, hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const rim = G.torus(R, 0.01, hi ? 10 : 8, hi ? 48 : 28);
  rim.rotateY(Math.PI / 2);
  o.push(part(rim, P.cast()));
  o.push(part(cylX(0.026, -0.024, 0.02, 24, 0.004), P.cast()));
  o.push(part(cylX(0.012, 0.02, 0.032, 16, 0.002), P.bright()));
  for (let i = 0; i < spokes; i++) {
    const a = a0 + Math.PI / spokes + (i * Math.PI * 2) / spokes;
    const c = Math.cos(a), s = Math.sin(a);
    o.push(part(G.rod([-0.006, s * 0.022, c * 0.022], [0, s * (R - 0.006), c * (R - 0.006)], 0.0085, 10, 0.006), P.cast()));
  }
  // crank handle on the rim: pin + turned grip, polished by hands
  const gy = Math.sin(a0) * R, gz = Math.cos(a0) * R;
  o.push(part(cylX(0.007, 0, 0.022, 12, 0.001), P.bright(), { p: [0, gy, gz] }));
  o.push(part(G.lathe([[0, 0], [0.012, 0.002], [0.0135, 0.02], [0.012, 0.062], [0.008, 0.07], [0, 0.071]], 18, 50), P.bright(), { p: [0.02, gy, gz], r: [0, 0, -90] }));
  return o;
}

function turntableAndBase(): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  // turntable ring seated on the pintle race, pintle hub down into the bottom carriage
  o.push(part(G.lathe([[0.07, BASE.y0], [0.2, BASE.y0], [0.208, BASE.y0 + 0.008], [0.208, BASE.y0 + 0.02], [0.18, BASE.y1 - 0.004], [0.07, BASE.y1 - 0.004]], 64, 35), P.cast(), { p: [0, 0, PZ] }));
  o.push(part(cylY(0.09, BASE.y0 - 0.12, BASE.y1 + 0.02, 40, 0.006), P.cast(), { p: [0, 0, PZ] }));
  o.push(part(G.cyl(0.055, 0.055, 0.02, 6), P.cast(), { p: [0, BASE.y1 + 0.03, PZ] }));
  // base slab between and under the cheeks, front cross member (shield bracket foot)
  const bl = BASE.z1 - BASE.z0;
  o.push(part(G.rbox(BASE.hx * 2, 0.024, bl, 0.006, 2), P.cast(), { p: [0, BASE.y1 - 0.012, (BASE.z0 + BASE.z1) / 2] }));
  o.push(part(G.rbox(BASE.hx * 2 + 0.02, 0.07, 0.05, 0.008, 2), P.cast(), { p: [0, BASE.y1 + 0.02, BASE.z1 - 0.025] }));
  // bolt ring holding the turntable ring to the base
  const bolts = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + 0.13;
    return { p: [Math.cos(a) * 0.19, BASE.y1, PZ + Math.sin(a) * 0.19] as V3 };
  });
  o.push(part(G.scatter(G.boltHead(0.016, 0.007), bolts), P.cast()));
  // rear tail carrying the equilibrator clevis (fabricated channel)
  const tz0 = BASE.z0 + 0.04, tz1 = EQ_REAR[2] - 0.03;
  o.push(part(G.rbox(0.11, 0.035, tz0 - tz1, 0.006, 2), P.paint(), { p: [0, BASE.y1 - 0.02, (tz0 + tz1) / 2] }));
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(0.012, 0.06, tz0 - tz1, 0.003, 1), P.paint(), { p: [sx * 0.05, BASE.y1 - 0.045, (tz0 + tz1) / 2] }));
    o.push(part(G.plate([[0, 0], [0.07, 0], [0.05, 0.075], [0.015, 0.075]], 0.014, 'zy', 0.003), P.cast(), { p: [sx * 0.03, BASE.y1 - 0.004, EQ_REAR[2] - 0.035] }));
  }
  return o;
}

/** Left cheek (+X side); mirrored for the right. */
function cheek(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const cx = CHEEK.x + CHEEK.t / 2;
  const br = 0.082;
  const pts: V2[] = [
    [BASE.z0 + 0.01, BASE.y1 - 0.004],
    [BASE.z1 - 0.04, BASE.y1 - 0.004],
    [BASE.z1, BASE.y1 + 0.05],
    [BASE.z1, 0.95],
    [-0.1, 1.03],
  ];
  for (let i = 0; i <= 10; i++) {
    const a = THREE.MathUtils.degToRad(25 + (i / 10) * 175);
    pts.push([TZ + Math.cos(a) * br, TY + Math.sin(a) * br]);
  }
  pts.push([-0.46, 0.95], [BASE.z0 + 0.01, 0.88]);
  o.push(part(G.plate(pts, CHEEK.t, 'zy', 0.005, 0.014), P.cast(), { p: [cx, 0, 0] }));
  // outer stiffening flange along the front and rear edges
  o.push(part(G.rod([cx + 0.014, BASE.y1 + 0.02, BASE.z1 - 0.01], [cx + 0.014, 0.94, BASE.z1 - 0.01], 0.012, 10), P.cast()));
  o.push(part(G.rod([cx + 0.014, 0.87, BASE.z0 + 0.03], [cx + 0.014, 1.0, -0.39], 0.012, 10), P.cast()));
  // trunnion bearing housing and bolted cap
  o.push(part(cylX(0.072, CHEEK.x + CHEEK.t, 0.252, 40, 0.006), P.cast(), { p: [0, TY, TZ] }));
  o.push(part(latheZ(ringProfile(0.03, 0.078, -0.004, 0.004, 0.002), 40, 35), P.cast(), { p: [0.252, TY, TZ], r: [0, 90, 0] }));
  const capBolts: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    capBolts.push({ p: [0.256, TY + Math.sin(a) * 0.056, TZ + Math.cos(a) * 0.056], n: [1, 0, 0] });
  }
  o.push(part(G.scatter(G.boltHead(0.015, 0.006), capBolts), P.cast()));
  o.push(part(G.cyl(0.005, 0.005, 0.018, 8), P.bright(), { p: [0.225, TY + 0.078, TZ - 0.012] }));
  // elevating pinion (in the arc plane) on its shaft through the cheek, gearbox outside
  const gear: V2[] = [];
  const nt = 12;
  for (let i = 0; i < nt * 2; i++) {
    const a = (i / (nt * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 0.028 : 0.021;
    gear.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  o.push(part(G.plate(gear, 0.018, 'zy', 0.0015), P.bright(), { p: PIN }));
  o.push(part(cylX(0.012, PIN[0] - 0.015, 0.29, 14, 0.002), P.bright(), { p: [0, PIN[1], PIN[2]] }));
  o.push(part(G.rbox(0.05, 0.085, 0.11, 0.01, 2), P.cast(), { p: [CHEEK.x + CHEEK.t + 0.025, PIN[1] + 0.012, PIN[2]] }));
  o.push(part(G.scatter(G.boltHead(0.012, 0.005), [
    { p: [CHEEK.x + CHEEK.t + 0.05, PIN[1] + 0.045, PIN[2] + 0.04], n: [1, 0, 0] },
    { p: [CHEEK.x + CHEEK.t + 0.05, PIN[1] - 0.022, PIN[2] + 0.04], n: [1, 0, 0] },
    { p: [CHEEK.x + CHEEK.t + 0.05, PIN[1] + 0.045, PIN[2] - 0.04], n: [1, 0, 0] },
    { p: [CHEEK.x + CHEEK.t + 0.05, PIN[1] - 0.022, PIN[2] - 0.04], n: [1, 0, 0] },
  ]), P.cast()));
  void hi;
  return o;
}

function elevatingDrive(hi: boolean): THREE.Object3D[] {
  // Right side (-X): shaft from the right pinion gearbox back to a bevel box on a bracket,
  // handwheel on a short cross shaft outboard.
  const o: THREE.Object3D[] = [];
  const gx = -(CHEEK.x + CHEEK.t + 0.05);
  const bevel: V3 = [-0.33, 0.875, -0.63];
  // cardan shaft housing from the gearbox rear face to the bevel box
  const a: V3 = [gx + 0.01, PIN[1] + 0.01, PIN[2] - 0.055];
  o.push(part(G.tube([a, [gx - 0.02, PIN[1] + 0.03, PIN[2] - 0.12], [bevel[0] + 0.02, bevel[1] - 0.005, bevel[2] + 0.07], [bevel[0], bevel[1], bevel[2] + 0.035]], 0.016, 10, 24), P.cast()));
  o.push(part(G.rbox(0.07, 0.07, 0.07, 0.01, 2), P.cast(), { p: bevel }));
  // bracket from the cheek rear to the bevel box
  o.push(part(G.rbox(0.13, 0.03, 0.05, 0.006, 1), P.cast(), { p: [-(CHEEK.x + CHEEK.t + 0.05), bevel[1] - 0.02, bevel[2] + 0.05] }));
  o.push(part(G.rbox(0.03, 0.12, 0.05, 0.006, 1), P.cast(), { p: [-(CHEEK.x + CHEEK.t + 0.01), bevel[1] - 0.04, bevel[2] + 0.05] }));
  o.push(part(cylX(0.012, -0.45, bevel[0] - 0.035, 14, 0.002), P.bright(), { p: [0, bevel[1], bevel[2]] }));
  const hw = group(handwheel(0.1, THREE.MathUtils.degToRad(-35), 4, hi), { p: [-0.455, bevel[1], bevel[2]] });
  const m = group([hw]);
  m.scale.x = -1; // hub face outboard (-X)
  m.position.x = 0;
  // mirror about x = 0 would move it to +X; instead flip in place
  hw.position.x = 0.455;
  o.push(m);
  return o;
}

function traversingGear(hi: boolean): THREE.Object3D[] {
  // Worm housing under the rear of the base (meshing with the rack on the bottom carriage),
  // cross shaft out to the traversing handwheel on the left.
  const o: THREE.Object3D[] = [];
  const wy = D.bc.y1 + 0.015, wz = PZ - 0.285;
  o.push(part(cylX(0.034, -0.08, 0.2, 28, 0.004), P.cast(), { p: [0, wy, wz] }));
  o.push(part(cylX(0.04, 0.2, 0.225, 28, 0.004), P.cast(), { p: [0, wy, wz] }));
  o.push(part(cylX(0.04, -0.105, -0.08, 28, 0.004), P.cast(), { p: [0, wy, wz] }));
  // hanger brackets from the base
  for (const x of [-0.04, 0.16]) {
    o.push(part(G.rbox(0.03, BASE.y1 - wy + 0.01, 0.06, 0.006, 1), P.cast(), { p: [x, (BASE.y1 + wy) / 2, wz + 0.01] }));
  }
  o.push(part(cylX(0.012, 0.225, 0.4, 14, 0.002), P.bright(), { p: [0, wy, wz] }));
  o.push(part(G.rbox(0.03, 0.06, 0.06, 0.006, 1), P.cast(), { p: [0.33, wy, wz] }));
  o.push(group(handwheel(0.085, THREE.MathUtils.degToRad(150), 3, hi), { p: [0.41, wy, wz] }));
  return o;
}

function equilibrator(elevDeg: number, hi: boolean): THREE.Object3D[] {
  // Strut from the rear clevis on the top-carriage tail forward to the lug under the arcs' cross
  // tube. Compression springs (outer + inner) between two end plates on three guide rods.
  const o: THREE.Object3D[] = [];
  const e = THREE.MathUtils.degToRad(elevDeg);
  const s0 = EQ_PIN[0], y0 = EQ_PIN[1] - 0.045;
  const B = new THREE.Vector3(0, TY + s0 * Math.sin(e) + y0 * Math.cos(e), TZ + s0 * Math.cos(e) - y0 * Math.sin(e));
  const A = new THREE.Vector3(...EQ_REAR);
  const dir = B.clone().sub(A);
  const len = dir.length();
  dir.normalize();
  // local frame: build along +Z from 0 (rear clevis) to len (front eye), then orient
  const loc: THREE.Object3D[] = [];
  const pz0 = 0.05, pz1 = 0.3; // spring pack between the plates
  loc.push(part(G.rbox(0.05, 0.05, 0.05, 0.008, 1), P.cast(), { p: [0, 0, 0.012] }));
  loc.push(part(cylX(0.012, -0.045, 0.045, 12, 0.002), P.bright()));
  loc.push(part(cylZ(0.022, 0.03, pz0, 20, 0.003), P.cast()));
  // end plates (triangular with rounded lobes for the guide rods)
  const plate = (): THREE.BufferGeometry => {
    const pts: V2[] = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const lobe = Math.pow(Math.max(0, Math.cos(3 * (a - Math.PI / 2))), 6);
      const r = 0.064 + 0.024 * lobe;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return G.extrude(pts, 0.016, 0.003, 8, 1);
  };
  loc.push(part(plate(), P.cast(), { p: [0, 0, pz0] }));
  loc.push(part(plate(), P.cast(), { p: [0, 0, pz1] }));
  // three guide rods (bright) with nuts beyond the plates
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
    const x = Math.cos(a) * 0.08, y = Math.sin(a) * 0.08;
    loc.push(part(cylZ(0.008, pz0 - 0.025, pz1 + 0.03, 12, 0.001), P.bright(), { p: [x, y, 0] }));
    for (const z of [pz0 - 0.016, pz1 + 0.016]) loc.push(part(G.cyl(0.013, 0.013, 0.012, 6), P.cast(), { p: [x, y, z], r: [90, 0, 0] }));
  }
  // nested compression springs
  const turnsO = hi ? 7.5 : 6;
  loc.push(part(coilZ(0.05, 0.008, pz0 + 0.012, pz1 - 0.012, turnsO, hi ? 8 : 6, hi ? 26 : 16), P.paint()));
  loc.push(part(coilZ(0.029, 0.0055, pz0 + 0.01, pz1 - 0.01, turnsO + 3, hi ? 7 : 5, hi ? 22 : 14), P.paint()));
  // push rod forward to the front eye on the lug pin
  loc.push(part(cylZ(0.016, pz1 - 0.02, len - 0.02, 16, 0.002), P.bright()));
  loc.push(part(cylZ(0.026, pz1 + 0.008, pz1 + 0.05, 20, 0.003), P.cast()));
  const eye = G.torus(0.02, 0.009, 8, 20);
  eye.rotateY(Math.PI / 2);
  loc.push(part(eye, P.cast(), { p: [0, 0, len] }));
  const g = group(loc);
  g.position.copy(A);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  o.push(g);
  return o;
}

function shieldSupports(): THREE.Object3D[] {
  // Flanged brackets from the cheek fronts forward to the shield, diagonal braces to the
  // outer panels (left side; mirrored).
  const o: THREE.Object3D[] = [];
  const x = CHEEK.x + CHEEK.t + 0.006;
  const zS = D.shieldZ;
  o.push(part(G.plate([[BASE.z1 - 0.01, BASE.y1 + 0.03], [zS, BASE.y1 + 0.03], [zS, 1.1], [zS - 0.03, 1.1], [BASE.z1 - 0.01, 0.95]], 0.014, 'zy', 0.003, 0.01), P.cast(), { p: [x, 0, 0] }));
  // foot on the base front cross member
  o.push(part(G.rbox(0.05, 0.014, zS - BASE.z1 + 0.02, 0.003, 1), P.cast(), { p: [x - 0.02, BASE.y1 + 0.037, (zS + BASE.z1) / 2] }));
  // diagonal brace tube to the outer panel
  o.push(part(G.rod([x + 0.005, BASE.y1 + 0.06, BASE.z1 + 0.02], [0.56, 1.12, zS - 0.012], 0.013, 10), P.paint()));
  o.push(part(G.rbox(0.06, 0.05, 0.012, 0.003, 1), P.paint(), { p: [0.56, 1.12, zS - 0.006] }));
  // upper horizontal brace from the bracket top to the outer panel
  o.push(part(G.rod([x + 0.005, 1.08, zS - 0.02], [0.6, 1.26, zS - 0.012], 0.011, 10), P.paint()));
  o.push(part(G.rbox(0.05, 0.05, 0.012, 0.003, 1), P.paint(), { p: [0.6, 1.26, zS - 0.006] }));
  return o;
}

function panoramicSight(hi: boolean): THREE.Object3D[] {
  // Telescope Mount M21A1 on a bracket rising from the left cheek, Panoramic Telescope M12A2 in
  // its socket: vertical body, azimuth micrometer, rotating head with the objective window
  // facing forward, eyepiece sloping back towards the gunner.
  const o: THREE.Object3D[] = [];
  const x = 0.335, z = -0.53;
  const baseY = 1.06;
  // bracket: cast arm from the cheek's rear edge out to the mount
  o.push(part(G.rbox(x - CHEEK.x - CHEEK.t + 0.02, 0.04, 0.07, 0.008, 2), P.cast(), { p: [(x + CHEEK.x + CHEEK.t) / 2, 0.97, z + 0.07] }));
  o.push(part(G.rod([CHEEK.x + CHEEK.t + 0.005, 0.9, -0.44], [x - 0.02, 0.97, z + 0.06], 0.014, 10), P.cast()));
  o.push(part(cylY(0.024, 0.95, baseY, 20, 0.003), P.cast(), { p: [x, 0, z + 0.07] }));
  // mount body (black enamel) with the elevation/cross-level knobs and level vials
  const my = baseY + 0.06;
  o.push(part(G.rbox(0.07, 0.12, 0.15, 0.01, 2), P.optic(), { p: [x, my, z + 0.03] }));
  o.push(part(cylX(0.042, x + 0.035, x + 0.06, 32, 0.003), P.optic(), { p: [0, my, z + 0.03] }));
  o.push(part(cylX(0.043, x + 0.05, x + 0.058, 32, 0.002), P.brass(), { p: [0, my, z + 0.03] }));
  o.push(part(cylX(0.014, x + 0.06, x + 0.09, 16, 0.002), P.optic(), { p: [0, my, z + 0.03] }));
  o.push(part(G.cyl(0.013, 0.013, 0.03, 16), P.optic(), { p: [x, my - 0.02, z - 0.06], r: [90, 0, 0] }));
  for (const [vx, vz, rot] of [[x - 0.036, z + 0.04, 0], [x, z + 0.108, 90]] as [number, number, number][]) {
    o.push(part(G.rbox(0.012, 0.018, 0.07, 0.004, 1), P.optic(), { p: [vx, my + 0.05, vz], r: [0, rot, 0] }));
    o.push(part(G.rbox(0.006, 0.01, 0.05, 0.002, 1), P.glass(), { p: [vx - (rot ? 0 : 0.006), my + 0.056, vz + (rot ? 0.006 : 0)], r: [0, rot, 0] }));
  }
  // telescope socket + body
  const ty0 = my + 0.06;
  o.push(part(cylY(0.03, ty0, ty0 + 0.03, 28, 0.003), P.optic(), { p: [x, 0, z + 0.03] }));
  o.push(part(cylY(0.024, ty0 + 0.03, ty0 + 0.19, 28, 0.003), P.optic(), { p: [x, 0, z + 0.03] }));
  // azimuth micrometer and scale ring
  o.push(part(cylY(0.036, ty0 + 0.06, ty0 + 0.1, 32, 0.004), P.optic(), { p: [x, 0, z + 0.03] }));
  o.push(part(cylY(0.037, ty0 + 0.075, ty0 + 0.086, 32, 0.002), P.brass(), { p: [x, 0, z + 0.03] }));
  o.push(part(cylX(0.015, x + 0.03, x + 0.07, 16, 0.002), P.optic(), { p: [0, ty0 + 0.08, z + 0.03] }));
  // rotating head with the objective window
  const hy = ty0 + 0.19;
  o.push(part(G.rbox(0.06, 0.07, 0.075, 0.012, 2), P.optic(), { p: [x, hy + 0.035, z + 0.035] }));
  o.push(part(G.rbox(0.04, 0.034, 0.004, 0.002, 1), P.glass(), { p: [x, hy + 0.038, z + 0.074] }));
  o.push(part(G.rbox(0.05, 0.012, 0.03, 0.004, 1), P.optic(), { p: [x, hy + 0.074, z + 0.06] }));
  // eyepiece: tube sloping back and down towards the gunner, rubber eye guard
  const e0: V3 = [x, ty0 + 0.12, z + 0.02];
  const e1: V3 = [x + 0.03, ty0 + 0.06, z - 0.1];
  o.push(part(G.rod(e0, e1, 0.016, 20), P.optic()));
  const d = new THREE.Vector3(...e1).sub(new THREE.Vector3(...e0)).normalize();
  const cup = latheZ([[0.016, 0], [0.023, 0], [0.023, 0.03], [0.018, 0.03]], 24, 40);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
  cup.applyQuaternion(q);
  o.push(part(cup, P.rubber(), { p: e1 }));
  void hi;
  return o;
}

function rangeQuadrant(): THREE.Object3D[] {
  // Range quadrant box on the right cheek (assistant gunner's side).
  const o: THREE.Object3D[] = [];
  const x = -(CHEEK.x + CHEEK.t + 0.035), y = 1.14, z = -0.2;
  o.push(part(G.rbox(0.05, 0.02, 0.09, 0.004, 1), P.cast(), { p: [x + 0.012, y - 0.07, z] }));
  o.push(part(G.rbox(0.05, 0.1, 0.12, 0.008, 2), P.optic(), { p: [x, y, z] }));
  o.push(part(cylX(0.036, x - 0.04, x - 0.025, 32, 0.002), P.optic(), { p: [0, y, z] }));
  o.push(part(cylX(0.037, x - 0.034, x - 0.028, 32, 0.001), P.brass(), { p: [0, y, z] }));
  o.push(part(G.rbox(0.012, 0.01, 0.06, 0.003, 1), P.glass(), { p: [x - 0.02, y + 0.052, z] }));
  return o;
}

export interface TopOpts {
  detail: 'high' | 'low';
  elevation: number;
}

export function buildTopCarriage(opts: TopOpts): THREE.Group {
  const hi = opts.detail === 'high';
  const parts: THREE.Object3D[] = [
    ...turntableAndBase(),
    mirrorX(group(cheek(hi))),
    ...elevatingDrive(hi),
    ...traversingGear(hi),
    ...equilibrator(opts.elevation, hi),
    mirrorX(group(shieldSupports())),
    ...panoramicSight(hi),
    ...rangeQuadrant(),
  ];
  return group(parts, { name: 'top-carriage' });
}
