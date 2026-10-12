/**
 * Rifle No. 4 Mk I woodwork in the design frame ("R-frame": z = 0 at the breech face / bolt-head face,
 * y = 0 on the bore axis, +x = the rifle's left side; muzzle at z = +0.640, butt plate at z = -0.489).
 *
 * Two-piece stock: the butt (with its wrist and slight pistol-grip swell) is held in the receiver socket;
 * the fore-end runs from the socket to the upper band. Rear and front handguards sit on the fore-end,
 * joined at the lower band. All pieces are lofted through analytic super-ellipse sections (common/geo
 * Sec) so the metal fittings (socket, bands, butt plate, swivel bracket, trigger guard) can be seated
 * exactly on the wood.
 *
 * Proportions: overall length and barrel length from published figures; butt depth, drop, wrist,
 * fore-end and band positions measured from a scaled side photograph of a 1943 No. 4 Mk I.
 */
import { THREE, G, part } from '../../../../core/kit';
import { keyInterp, secPoint, secNormal, secRing, secRingOffset, secSideX, shellPatch, latheX, extrudeZ, stadium, warp, screwParts, placeAlong, V, type Sec, type V2 } from '../common/geo';
import type { UkwMats } from '../common/materials';

/** Key stations (R-frame, metres). */
export const R = {
  muzzleZ: 0.64,
  buttZ: -0.489,
  socketRear: -0.177,
  socketFront: -0.149,
  foreRear: -0.149,
  foreFront: 0.5712,
  hgRear: 0.031,
  lowerBandRear: 0.2895,
  lowerBandFront: 0.3055,
  hgFront: 0.5712,
  upperBandRear: 0.522,
  upperBandFront: 0.575,
  /** handguard crown heights: rear handguard rear / front, front handguard rear / front */
  hgTop: [0.0228, 0.0192, 0.0186, 0.0156],
  buttSwivelZ: -0.407,
  triggerZ: -0.131,
  gripZ: -0.228,
  supportZ: 0.1,
  rearRestZ: -0.433,
  frontRestZ: 0.5585,
};

/** [z, half width, top, split line, bottom, top exponent, bottom exponent] */
const BUTT: number[][] = [
  [-0.4868, 0.0211, -0.044, -0.1, -0.159, 2.6, 2.7],
  [-0.47, 0.0212, -0.0432, -0.098, -0.1545, 2.6, 2.7],
  [-0.43, 0.021, -0.0416, -0.093, -0.144, 2.6, 2.7],
  [-0.39, 0.0205, -0.04, -0.087, -0.132, 2.6, 2.6],
  [-0.35, 0.0198, -0.0382, -0.08, -0.118, 2.6, 2.6],
  [-0.31, 0.0189, -0.0362, -0.073, -0.1045, 2.6, 2.5],
  [-0.285, 0.018, -0.0342, -0.068, -0.0975, 2.5, 2.4],
  [-0.263, 0.0171, -0.0305, -0.0625, -0.0925, 2.4, 2.4],
  [-0.245, 0.0164, -0.026, -0.057, -0.0868, 2.4, 2.3],
  [-0.225, 0.016, -0.0195, -0.0505, -0.0785, 2.4, 2.3],
  [-0.205, 0.016, -0.0142, -0.0435, -0.0695, 2.5, 2.4],
  [-0.188, 0.0163, -0.0112, -0.0385, -0.0632, 2.7, 2.6],
  [-0.174, 0.0166, -0.0098, -0.0362, -0.0605, 2.9, 2.8],
  [-0.152, 0.0167, -0.0095, -0.036, -0.06, 3.0, 2.8],
];

/** Fore-end (without handguards). Top is the flat-domed bed the handguards sit on. */
const FORE: number[][] = [
  [-0.149, 0.0178, -0.004, -0.022, -0.0578, 7, 3.6],
  [-0.1, 0.0189, -0.004, -0.022, -0.0562, 7, 3.6],
  [-0.02, 0.0194, -0.004, -0.021, -0.0545, 7, 3.4],
  [0.03, 0.0193, -0.0032, -0.0185, -0.0492, 5, 3.2],
  [0.08, 0.019, -0.0018, -0.015, -0.0428, 4.5, 3.0],
  [0.15, 0.0186, -0.002, -0.012, -0.0382, 4.5, 2.8],
  [0.3, 0.0176, -0.0022, -0.009, -0.0322, 4.5, 2.6],
  [0.45, 0.0166, -0.0022, -0.0072, -0.0267, 4.5, 2.6],
  [0.53, 0.016, -0.0022, -0.0066, -0.0238, 4.5, 2.6],
  [0.5712, 0.0157, -0.0022, -0.0063, -0.0223, 4.5, 2.6],
];

const toSec = ([hw, yTop, ySplit, yBot, eTop, eBot]: number[]): Sec => ({ hw, yTop, ySplit, yBot, eTop, eBot });
export const buttSec = (z: number): Sec => toSec(keyInterp(BUTT, z));
export const foreSec = (z: number): Sec => toSec(keyInterp(FORE, z));

/** Handguard crown height at z (rear or front handguard). */
export function hgTopAt(z: number): number {
  const [a, b, c, d] = R.hgTop;
  if (z <= R.lowerBandRear + 0.008) return a + ((b - a) * (z - R.hgRear)) / (R.lowerBandRear - R.hgRear);
  return c + ((d - c) * (z - R.lowerBandFront)) / (R.hgFront - R.lowerBandFront);
}

/**
 * Handguard ring at z: crown arch over the barrel from the fore-end's split line, closed underneath by
 * the fore-end's top dome (crescent), point count 2n.
 */
function handguardRing(z: number, n = 22, shrink = 1): V2[] {
  const s = foreSec(z);
  const top = hgTopAt(z);
  const hwH = (s.hw + 0.0002) * shrink, eH = 2.2;
  const y0 = s.ySplit + 0.0004;
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI;
    const c = Math.cos(t), sn = Math.sin(t);
    pts.push([hwH * Math.sign(c) * Math.pow(Math.abs(c), 2 / eH), y0 + (top - y0) * shrink * Math.pow(sn, 2 / eH)]);
  }
  for (let i = n - 1; i >= 1; i--) {
    const t = (i / n) * Math.PI;
    const [x, y] = secPoint(s, t);
    pts.push([x * 0.985 * shrink, Math.max(y, y0) - 0.0003]);
  }
  return pts;
}

/**
 * Outline of the fore-end + handguard at z (for bands), grown outward by `grow`. n points, CCW.
 */
export function foreEndRing(z: number, grow: number, n = 48): V2[] {
  const s = foreSec(z);
  const top = hgTopAt(z);
  const eH = 2.2;
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t), sn = Math.sin(t);
    if (sn >= 0) {
      pts.push([(s.hw + 0.0002) * Math.sign(c) * Math.pow(Math.abs(c), 2 / eH), s.ySplit + (top - s.ySplit) * Math.pow(sn, 2 / eH)]);
    } else pts.push(secPoint(s, t));
  }
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    return [p[0] + (ty / l) * grow, p[1] - (tx / l) * grow] as V2;
  });
}

function stations(z0: number, z1: number, step: (z: number) => number): number[] {
  const out: number[] = [];
  let z = z0;
  while (z < z1 - 1e-6) {
    out.push(z);
    z += step(z);
  }
  out.push(z1);
  return out;
}

export function buildStock(m: UkwMats, hi: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const N = hi ? 48 : 32;

  // ---------------- butt (heel at the brass butt plate, wrist into the socket)
  {
    const zs = stations(R.buttZ + 0.0022, R.socketFront - 0.003, (z) => (z > -0.3 ? 0.008 : 0.018));
    const secs = zs.map((z) => ({ z, ring: secRing(buttSec(z), N) }));
    out.push(part(G.loftZ(secs, true, 50), m.beech));
  }

  // ---------------- fore-end
  {
    const zs = stations(R.foreRear + 0.0005, R.foreFront, (z) => (z < 0.1 ? 0.012 : 0.026));
    const secs = zs.map((z) => ({ z, ring: secRing(foreSec(z), N) }));
    // softened rear end against the socket
    secs[0] = { z: secs[0].z, ring: secRingOffset(foreSec(secs[0].z), -0.0012, N) };
    out.push(part(G.loftZ(secs, true, 50), m.beech));
  }

  // ---------------- handguards (rear: receiver ring to lower band; front: lower band to upper band)
  const guard = (z0: number, z1: number) => {
    const zs = stations(z0, z1, () => 0.016);
    const secs = zs.map((z) => ({ z, ring: handguardRing(z) }));
    // chamfered ends
    secs[0] = { z: z0, ring: handguardRing(z0 + 0.0015, 22, 0.94) };
    secs.splice(1, 0, { z: z0 + 0.002, ring: handguardRing(z0 + 0.002) });
    const last = secs.length - 1;
    secs[last] = { z: z1, ring: handguardRing(z1 - 0.0015, 22, 0.94) };
    secs.splice(last, 0, { z: z1 - 0.002, ring: handguardRing(z1 - 0.002) });
    return part(G.loftZ(secs, true, 50), m.beechGuard);
  };
  out.push(guard(R.hgRear, R.lowerBandRear + 0.004));
  out.push(guard(R.lowerBandFront - 0.004, R.hgFront));

  // ---------------- fore-end draw-bolt escutcheon with its screw on the right side
  {
    const z = -0.141, y = -0.024;
    const onRight = (g: THREE.BufferGeometry, lift: number) => {
      g.translate(0, y, z);
      warp(g, (p) => {
        p.x = -(secSideX(foreSec(p.z), p.y) + lift + p.x);
      }, false);
      G.flipWinding(g);
      g.computeVertexNormals();
      return g;
    };
    out.push(part(onRight(latheX([[0, -0.0008], [0.0058, -0.0008], [0.0058, 0.0003], [0.0052, 0.0009], [0, 0.0009]], 24, 45), 0), m.black));
    const [head, slot] = screwParts(0.0034, 0.0012, 20);
    const hp = V(-(secSideX(foreSec(z), y) + 0.0009), y, z);
    out.push(part(placeAlong(head, hp, V(-1, 0, 0)), m.black), part(placeAlong(slot, hp, V(-1, 0, 0), 20), m.recess));
  }
  return out;
}

/** Brass butt plate with heel tang, trap lid and two screws; butt swivel bracket and swivel. */
export function buildButtFittings(m: UkwMats, hi: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const bz = R.buttZ;
  const N = hi ? 56 : 36;
  const ringOff = (z: number, d: number): V2[] => secRingOffset(buttSec(z), d, N);
  // butt plate: solid brass plate on the end of the butt with a short rim lapping over the wood
  out.push(part(extrudeZ(ringOff(bz, 0.0013), [], bz - 0.0032, bz + 0.0006, 0.0009, 2), m.brass));
  out.push(part(extrudeZ(ringOff(bz + 0.003, 0.0014), [ringOff(bz + 0.003, -0.0002)], bz + 0.0004, bz + 0.0058, 0.0005, 2), m.brass));
  // heel tang over the top of the butt
  out.push(part(shellPatch(buttSec, bz, bz + 0.038, () => Math.PI / 2 - 0.5, () => Math.PI / 2 + 0.5, 0.0018, 0.0003, 8, 8), m.brass));
  const s0 = buttSec(bz);
  const cy = (s0.yTop + s0.yBot) / 2, hh = (s0.yTop - s0.yBot) / 2;
  const [head, slot] = screwParts(0.0035, 0.0012, 20);
  const tangP = V(0, buttSec(bz + 0.025).yTop + 0.0016, bz + 0.025);
  out.push(part(placeAlong(head, tangP, V(0, 1, 0), 0), m.brass), part(placeAlong(slot, tangP, V(0, 1, 0), 90), m.recess));
  // trap lid: raised oval on the plate face with its hinge at the top and a thumb catch below
  const lidZ = bz - 0.0032;
  const lidY = cy + hh * 0.05;
  {
    const lid = stadium(0, 0, 0.022, 0.05, 10);
    const g = G.extrude(G.shape(lid), 0.0012, 0.0004);
    g.translate(0, lidY, lidZ - 0.0006);
    out.push(part(g, m.brass));
    // lid seam (dark outline)
    const seam = G.extrude(G.shape(stadium(0, 0, 0.0234, 0.0514, 10), 0, [stadium(0, 0, 0.0222, 0.0502, 10)]), 0.0004, 0);
    seam.translate(0, lidY, lidZ - 0.0001);
    out.push(part(seam, m.recess));
    // hinge knuckle at the top of the lid
    const hinge = latheX([[0, -0.006], [0.0017, -0.006], [0.0017, 0.006], [0, 0.006]], 12, 45);
    hinge.translate(0, lidY + 0.0255, lidZ - 0.0012);
    out.push(part(hinge, m.brass));
    // screw below the lid
    const sp = V(0, cy - hh * 0.68, lidZ);
    out.push(part(placeAlong(head, sp, V(0, 0, -1)), m.brass), part(placeAlong(slot, sp, V(0, 0, -1), 60), m.recess));
    // thumb notch of the catch
    out.push(part(G.rbox(0.008, 0.0024, 0.0016, 0.0006, 2), m.brass, { p: [0, lidY - 0.0262, lidZ - 0.0008] }));
  }

  // ---------------- butt swivel: inletted bracket plate on the bottom, pivot pin, swivel loop
  {
    const z = R.buttSwivelZ;
    const plateG = shellPatch(buttSec, z - 0.017, z + 0.017, () => (3 * Math.PI) / 2 - 0.33, () => (3 * Math.PI) / 2 + 0.33, 0.0016, 0.0005, 8, 8);
    out.push(part(plateG, m.black));
    for (const dz of [-0.012, 0.012]) {
      const sp = V(0, buttSec(z + dz).yBot - 0.0011, z + dz);
      out.push(part(placeAlong(head, sp, V(0, -1, 0)), m.black), part(placeAlong(slot, sp, V(0, -1, 0), 90), m.recess));
    }
    // recess slot in the plate (the loop folds into it)
    out.push(part(G.rbox(0.013, 0.0006, 0.009, 0.0002, 1), m.recess, { p: [0, buttSec(z).yBot - 0.0013, z] }));
    const sw = buttSwivel();
    // lugs holding the pivot pin
    for (const sx of [-1, 1]) out.push(part(G.rbox(0.0022, 0.005, 0.0075, 0.0007, 2), m.black, { p: [sx * 0.0086, sw.pivot.y + 0.0012, sw.pivot.z] }));
    out.push(part(G.rod([-0.0098, sw.pivot.y, sw.pivot.z], [0.0098, sw.pivot.y, sw.pivot.z], 0.0014, 12), m.black));
    out.push(part(G.tube(sw.loop, 0.0019, 10, 80, true), m.black));
  }
  return out;
}

/** Rounded-rectangle wire loop in the plane spanned by +X and d, from t = 0 (pivot bar) to t = L. */
export function wireLoop(origin: THREE.Vector3, d: THREE.Vector3, w: number, L: number, rr: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const corners: [number, number, number][] = [
    [w - rr, rr, -90],
    [w - rr, L - rr, 0],
    [-w + rr, L - rr, 90],
    [-w + rr, rr, 180],
  ];
  for (const [cu, ct, a0] of corners) {
    for (let i = 0; i <= 4; i++) {
      const a = ((a0 + 22.5 * i) * Math.PI) / 180;
      const u = cu + rr * Math.cos(a), t = ct + rr * Math.sin(a);
      pts.push(origin.clone().addScaledVector(d, t).setX(origin.x + u));
    }
  }
  return pts;
}

/** Butt swivel geometry (R-frame): pivot pin centre, loop polyline, sling bar centre. */
export function buttSwivel() {
  const z = R.buttSwivelZ;
  const yb = buttSec(z).yBot;
  const pivot = V(0, yb - 0.0045, z + 0.004);
  // loop hanging down and slightly back from the pivot; the sling bar is its far bar (along X)
  const w = 0.0182, L = 0.0215;
  const d = V(0, -1, -0.42).normalize();
  const bar = pivot.clone().addScaledVector(d, L);
  return { pivot, bar, dir: d, width: 2 * w, len: L, loop: wireLoop(pivot, d, w, L, 0.0045) };
}

export { secNormal };
