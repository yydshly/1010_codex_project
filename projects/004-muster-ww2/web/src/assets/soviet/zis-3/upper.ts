/**
 * Upper carriage of the ZiS-3: turntable on the lower carriage's combat pivot, fabricated base,
 * two side cheeks carrying the trunnion bearings, elevating gearbox + handwheel and traversing
 * gearbox + handwheel (both on the left, the gunlayer's side), the two spring equilibrator
 * columns, and the main (upper) shield: a single 5 mm plate notched over the wheels, with the
 * opening for the cradle (closed by the movable shield on the cradle), the sight window with a
 * sliding cover, rear stiffeners and braces.
 *
 * Construction frame (see dims.ts): axle on X at z = 0, ground y = 0, +Z muzzle, +X gun's left.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { PIVOT_TOP } from './carriage';
import { EQ_LUG } from './gun';
import { cylX, latheZ } from './util';

type V2 = [number, number];
type V3 = [number, number, number];

const TY = D.trunY, TZ = D.trunZ;
/** Cheek plates: inner face |x|, thickness. */
const CHEEK = { x: 0.16, t: 0.018 };
const BASE = { y0: PIVOT_TOP - 0.006, y1: PIVOT_TOP + 0.05, hx: 0.205, z0: -0.29, z1: 0.215 };
/** Main shield: back face plane, bottom edge. */
const SZ = D.shieldZ;
const SB = 0.53;

/** Handwheel in the YZ plane (axle along X), outer face towards +X, grip knob at angle a0. */
function handwheel(R: number, a0: number, hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const rim = G.torus(R, 0.0095, hi ? 10 : 8, hi ? 48 : 28);
  rim.rotateY(Math.PI / 2);
  o.push(part(rim, P.paint()));
  o.push(part(cylX(0.024, -0.022, 0.018, 24, 0.004), P.cast()));
  o.push(part(cylX(0.011, 0.018, 0.03, 16, 0.002), P.bright()));
  for (let i = 0; i < 3; i++) {
    const a = a0 + Math.PI / 3 + (i * Math.PI * 2) / 3;
    const c = Math.cos(a), s = Math.sin(a);
    o.push(part(G.rod([-0.004, s * 0.02, c * 0.02], [0, s * (R - 0.006), c * (R - 0.006)], 0.0075, 10, 0.0055), P.paint()));
  }
  // crank grip on the rim: steel pin + turned grip, polished by hands
  const gy = Math.sin(a0) * R, gz = Math.cos(a0) * R;
  o.push(part(cylX(0.007, 0, 0.02, 12, 0.001), P.bright(), { p: [0, gy, gz] }));
  o.push(part(G.lathe([[0, 0], [0.012, 0.002], [0.0135, 0.02], [0.012, 0.055], [0.008, 0.062], [0, 0.063]], 18, 50), P.bright(), { p: [0.018, gy, gz], r: [0, 0, -90] }));
  return o;
}

function turntableAndBase(): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const cz = -0.03;
  // turntable ring seated on the pivot race
  o.push(part(G.lathe([[0.06, BASE.y0], [0.19, BASE.y0], [0.198, BASE.y0 + 0.008], [0.198, BASE.y0 + 0.026], [0.17, BASE.y0 + 0.032], [0.06, BASE.y0 + 0.032]], 64, 35), P.cast(), { p: [0, 0, cz] }));
  // base: fabricated box between the cheeks
  const bh = BASE.y1 - (BASE.y0 + 0.028);
  o.push(part(G.rbox(BASE.hx * 2, bh, BASE.z1 - BASE.z0, 0.008, 2), P.paint(), { p: [0, BASE.y0 + 0.028 + bh / 2, (BASE.z0 + BASE.z1) / 2] }));
  // bolt ring holding the turntable to the base
  const bolts = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + 0.13;
    return { p: [Math.cos(a) * 0.182, BASE.y0 + 0.032, cz + Math.sin(a) * 0.182] as V3 };
  });
  o.push(part(G.scatter(G.boltHead(0.016, 0.006), bolts), P.cast()));
  // weld seams where the cheeks meet the base
  for (const sx of [1, -1]) {
    o.push(part(G.weld([[sx * (CHEEK.x - 0.003), BASE.y1 + 0.003, BASE.z0 + 0.03], [sx * (CHEEK.x - 0.003), BASE.y1 + 0.003, BASE.z1 - 0.03]], 0.004), P.paint()));
  }
  return o;
}

/** One cheek (left, +X side); mirrored for the right. */
function cheek(): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const cx = CHEEK.x + CHEEK.t / 2;
  const pts: V2[] = [
    [BASE.z0, BASE.y1 - 0.01],
    [BASE.z1, BASE.y1 - 0.01],
    [BASE.z1 + 0.02, BASE.y1 + 0.04],
    [0.1, TY + 0.055],
  ];
  for (let i = 0; i <= 8; i++) {
    const a = THREE.MathUtils.degToRad(35 + (i / 8) * 110);
    pts.push([TZ + Math.cos(a) * 0.09, TY + Math.sin(a) * 0.09]);
  }
  pts.push([-0.14, TY + 0.03], [BASE.z0, BASE.y1 + 0.07]);
  o.push(part(G.plate(pts, CHEEK.t, 'zy', 0.004, 0.012), P.paint(), { p: [cx, 0, 0] }));
  // outer flange along the rear edge (stiffener)
  const r0: V3 = [cx + 0.012, BASE.y1 + 0.06, BASE.z0 + 0.01];
  const r1: V3 = [cx + 0.012, TY + 0.02, -0.13];
  o.push(part(G.rod(r0, r1, 0.011, 10), P.paint()));
  // trunnion bearing housing and cap (the trunnion pin end shows through the cap)
  o.push(part(cylX(0.066, CHEEK.x + CHEEK.t, 0.222, 40, 0.005), P.cast(), { p: [0, TY, TZ] }));
  o.push(part(latheZ([[0.03, -0.003], [0.074, -0.003], [0.074, 0.003], [0.03, 0.003]], 40, 35), P.cast(), { p: [0.222 - 0.003, TY, TZ], r: [0, 90, 0] }));
  const capBolts: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    capBolts.push({ p: [0.225, TY + Math.sin(a) * 0.055, TZ + Math.cos(a) * 0.055], n: [1, 0, 0] });
  }
  o.push(part(G.scatter(G.boltHead(0.014, 0.006), capBolts), P.cast()));
  // lubrication nipple on the housing top
  o.push(part(G.cyl(0.005, 0.005, 0.016, 8), P.bright(), { p: [0.2, TY + 0.072, TZ - 0.01] }));
  return o;
}

function elevatingGear(hi: boolean): THREE.Object3D[] {
  // Gearbox on the left cheek; its pinion (inside) meshes with the cradle's toothed sector.
  const o: THREE.Object3D[] = [];
  const x = CHEEK.x + CHEEK.t, y = 0.75, z = -0.2;
  o.push(part(G.rbox(0.05, 0.1, 0.11, 0.01, 2), P.cast(), { p: [x + 0.025, y, z] }));
  o.push(part(cylX(0.034, x + 0.05, x + 0.068, 28, 0.004), P.cast(), { p: [0, y, z] }));
  o.push(part(G.scatter(G.boltHead(0.012, 0.005), [
    { p: [x + 0.05, y + 0.036, z + 0.04], n: [1, 0, 0] },
    { p: [x + 0.05, y - 0.036, z + 0.04], n: [1, 0, 0] },
    { p: [x + 0.05, y + 0.036, z - 0.04], n: [1, 0, 0] },
    { p: [x + 0.05, y - 0.036, z - 0.04], n: [1, 0, 0] },
  ]), P.cast()));
  o.push(part(cylX(0.013, x + 0.068, 0.335, 16, 0.002), P.bright(), { p: [0, y, z] }));
  o.push(group(handwheel(0.1, THREE.MathUtils.degToRad(-50), hi), { p: [0.345, y, z] }));
  return o;
}

function traversingGear(hi: boolean): THREE.Object3D[] {
  // Traversing gearbox on the front of the left cheek (screw mechanism acting on the lower
  // carriage), handwheel just behind the shield, in front of the elevating handwheel.
  const o: THREE.Object3D[] = [];
  const x = CHEEK.x + CHEEK.t, y = 0.665, z = 0.075;
  o.push(part(G.rbox(0.045, 0.085, 0.085, 0.009, 2), P.cast(), { p: [x + 0.0225, y, z] }));
  o.push(part(cylX(0.028, x + 0.045, x + 0.06, 24, 0.003), P.cast(), { p: [0, y, z] }));
  o.push(part(cylX(0.012, x + 0.06, 0.318, 16, 0.002), P.bright(), { p: [0, y, z] }));
  // housing of the traverse screw running down to the lower carriage
  o.push(part(G.rod([x + 0.01, y - 0.04, z - 0.02], [0.12, BASE.y0 - 0.03, z - 0.12], 0.02, 14), P.paint()));
  o.push(group(handwheel(0.085, THREE.MathUtils.degToRad(200), hi), { p: [0.328, y, z] }));
  return o;
}

function equilibrator(): THREE.Object3D[] {
  // Tension-type spring column: anchored on the base, pulling the cradle lug (behind and below
  // the trunnions) to balance the muzzle-heavy elevating mass. Left side; mirrored.
  const o: THREE.Object3D[] = [];
  const x = 0.245;
  const B: V3 = [x, TY + EQ_LUG[1], TZ + EQ_LUG[2]];
  const A: V3 = [x, BASE.y1 - 0.01, -0.12];
  const a = new THREE.Vector3(...A), b = new THREE.Vector3(...B);
  const dir = b.clone().sub(a).normalize();
  const hEnd = a.clone().addScaledVector(dir, 0.17);
  o.push(part(G.rod(a.clone().addScaledVector(dir, 0.025), hEnd, 0.031, 20), P.paint()));
  // screwed end caps
  o.push(part(G.rod(a.clone().addScaledVector(dir, 0.012), a.clone().addScaledVector(dir, 0.03), 0.034, 20), P.cast()));
  o.push(part(G.rod(hEnd, hEnd.clone().addScaledVector(dir, 0.014), 0.034, 20, 0.026), P.cast()));
  // pull rod and eye on the cradle lug pin
  o.push(part(G.rod(hEnd, b.clone().addScaledVector(dir, -0.018), 0.011, 12), P.bright()));
  const eye = G.torus(0.02, 0.008, 8, 20);
  eye.rotateY(Math.PI / 2);
  o.push(part(eye, P.cast(), { p: B }));
  // anchor: clevis bracket welded to the base side
  o.push(part(G.rbox(0.07, 0.03, 0.06, 0.006, 1), P.cast(), { p: [BASE.hx + 0.03, BASE.y1 - 0.025, A[2]] }));
  o.push(part(cylX(0.014, BASE.hx, x + 0.04, 14, 0.002), P.bright(), { p: [0, A[1], A[2]] }));
  return o;
}

function mainShield(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const t = D.shieldT;
  const zc = SZ + t / 2;
  // outline: bottom edge with the cradle notch in the middle, wheel notches at both ends
  const notch = 0.158, notchTop = 1.0;
  const outline: V2[] = [
    [-0.595, SB], [-notch, SB], [-notch, notchTop - 0.02], [-notch + 0.02, notchTop], [notch - 0.02, notchTop], [notch, notchTop - 0.02], [notch, SB],
    [0.595, SB], [0.615, SB + 0.02], [0.615, 0.775], [0.725, 0.805], [0.725, 1.2], [0.6, D.shieldTop],
    [-0.6, D.shieldTop], [-0.725, 1.2], [-0.725, 0.805], [-0.615, 0.775], [-0.615, SB + 0.02],
  ];
  // sight window on the gunlayer's side (+X), in line with the direct-fire telescope
  const win: V2[] = [[0.222, 0.958], [0.31, 0.958], [0.31, 1.07], [0.222, 1.07]];
  const sh = G.shape(outline, 0.012, [win.slice().reverse()]);
  o.push(part(G.extrude(sh, t, 0.0015, 6, 1), P.paint(), { p: [0, 0, zc] }));
  // sliding cover over the sight window (raised = open) in two guide strips on the front face
  const fz = SZ + t;
  o.push(part(G.rbox(0.11, 0.1, 0.004, 0.0015, 1), P.paint(), { p: [0.266, 1.13, fz + 0.006] }));
  o.push(part(G.rbox(0.04, 0.012, 0.006, 0.002, 1), P.paint(), { p: [0.266, 1.172, fz + 0.011] }));
  for (const gx of [0.205, 0.327]) {
    o.push(part(G.rbox(0.014, 0.25, 0.008, 0.002, 1), P.paint(), { p: [gx, 1.06, fz + 0.004] }));
  }
  // bolt heads on the front face: the rear stiffeners and bracket attachments
  const fb: { p: V3; n: V3 }[] = [];
  for (const x of [-0.56, -0.4, -0.25, 0.25, 0.4, 0.56]) fb.push({ p: [x, D.shieldTop - 0.045, fz], n: [0, 0, 1] });
  for (const sx of [1, -1]) {
    for (const y of [0.62, 0.72, 0.84, 0.95]) fb.push({ p: [sx * 0.205, y, fz], n: [0, 0, 1] });
    for (const y of [0.9, 1.05, 1.18]) fb.push({ p: [sx * 0.69, y, fz], n: [0, 0, 1] });
    fb.push({ p: [sx * 0.52, 0.96, fz], n: [0, 0, 1] });
  }
  for (const x of [-0.5, -0.38, 0.38, 0.5]) fb.push({ p: [x, SB + 0.03, fz], n: [0, 0, 1] });
  o.push(part(G.scatter(G.boltHead(0.017, 0.006), fb), P.paint()));
  // rear: stiffening angles along the top edge and down both outer edges
  const bz = SZ - 0.0005;
  o.push(part(G.rbox(1.12, 0.04, 0.006, 0.002, 1), P.paint(), { p: [0, D.shieldTop - 0.045, bz - 0.003] }));
  o.push(part(G.rbox(1.12, 0.006, 0.035, 0.002, 1), P.paint(), { p: [0, D.shieldTop - 0.065, bz - 0.0175] }));
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(0.04, 0.38, 0.006, 0.002, 1), P.paint(), { p: [sx * 0.69, 1.0, bz - 0.003] }));
    o.push(part(G.rbox(0.006, 0.38, 0.035, 0.002, 1), P.paint(), { p: [sx * 0.67, 1.0, bz - 0.0175] }));
    // lower stiffener along the bottom edge between notch and wheel cut-out
    o.push(part(G.rbox(0.4, 0.035, 0.006, 0.002, 1), P.paint(), { p: [sx * 0.39, SB + 0.03, bz - 0.003] }));
  }
  // shield brackets: vertical flanges from the cheek fronts to the shield back
  for (const sx of [1, -1]) {
    const x = sx * 0.205;
    o.push(part(G.plate([[BASE.z1 - 0.01, BASE.y1 - 0.03], [SZ, BASE.y1 - 0.03], [SZ, 0.97], [SZ - 0.035, 0.97], [BASE.z1 - 0.01, 0.72]], 0.012, 'zy', 0.003), P.paint(), { p: [x, 0, 0] }));
    // connecting plate to the cheek
    o.push(part(G.rbox(Math.abs(x) - CHEEK.x - CHEEK.t + 0.004, 0.12, 0.03, 0.004, 1), P.paint(), { p: [sx * ((Math.abs(x) + CHEEK.x + CHEEK.t) / 2), BASE.y1 + 0.05, BASE.z1 - 0.005] }));
  }
  // grab handle on the rear top edge (crew use it when manhandling the gun)
  o.push(part(G.tube([[-0.1, D.shieldTop - 0.09, bz], [-0.1, D.shieldTop - 0.09, bz - 0.055], [0.1, D.shieldTop - 0.09, bz - 0.055], [0.1, D.shieldTop - 0.09, bz]], 0.009, 8, 40), P.paint()));
  return o;
}

export function buildUpperCarriage(detail: 'high' | 'low'): THREE.Group {
  const hi = detail === 'high';
  const parts: THREE.Object3D[] = [
    ...turntableAndBase(),
    mirrorX(group(cheek())),
    mirrorX(group(equilibrator())),
    ...elevatingGear(hi),
    ...traversingGear(hi),
    ...mainShield(hi),
  ];
  return group(parts, { name: 'upper-carriage' });
}
