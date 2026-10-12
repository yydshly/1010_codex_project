/**
 * Sten Mk II parts in the design frame ("S-frame": z = 0 at the rear face of the receiver end cap,
 * y = 0 on the bore / receiver-tube axis, +x = the gun's left side; muzzle at z = +0.548, rear of the
 * skeleton butt at z = -0.214; overall 0.762 m).
 *
 * Tubular receiver with the right-side cocking slot and its upward safety notch, rear end cap with the
 * butt catch, fixed aperture rear sight, blade foresight; welded sheet-steel trigger housing with the
 * trigger guard, trigger and push-through change lever; magazine-housing collar with the ejection port
 * (right) and the magazine well (left) with its catch; perforated barrel sleeve (three rows of three
 * holes); barrel with the stepped muzzle; late-pattern skeleton (loop) butt of bent steel tube; 32-round
 * box magazine inserted horizontally from the left.
 *
 * Proportions measured from a scaled side photograph of a Mk II with the skeleton butt (see provenance).
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V, RAD, latheZ, cylX, cylZ, extrudeZ, plateZY, roundRect, circle2D, sector2D, perfTube, holeCircle, holeRRect, screwParts, placeAlong, type V2 } from '../common/geo';
import type { UkwMats } from '../common/materials';

export const S = {
  muzzleZ: 0.548,
  buttRearZ: -0.214,
  tubeR: 0.01925,
  capFront: 0.012,
  tubeFront: 0.372,
  slot: { z0: 0.051, z1: 0.21, phi: 200 * RAD, w: 0.0078, notchZ: 0.093 },
  handleZ: 0.2035,
  housing: { z0: 0.019, z1: 0.226, hw: 0.013 },
  triggerZ: 0.078,
  selectorZ: 0.108,
  collar: { z0: 0.252, z1: 0.346, R: 0.0225 },
  well: { x0: 0.0165, x1: 0.064, z0: 0.2695, z1: 0.3255, hh: 0.0155 },
  mag: { x0: 0.026, x1: 0.2125, z0: 0.2805, z1: 0.3175, hh: 0.0117 },
  sleeve: { z0: 0.37, z1: 0.454, R: 0.0196 },
  rearSightZ: 0.0175,
  peepY: 0.0262,
  foreSightZ: 0.3575,
  gripZ: -0.006,
};

/** Skeleton butt centre line (S-frame, x = 0), front of the upper member to the front of the lower strut. */
export const BUTT_PATH: V2[] = [
  [0.011, -0.0152],
  [0.0, -0.0165],
  [-0.028, -0.0192],
  [-0.045, -0.0222],
  [-0.055, -0.0282],
  [-0.064, -0.0328],
  [-0.08, -0.0346],
  [-0.14, -0.0366],
  [-0.192, -0.0382],
  [-0.2035, -0.0396],
  [-0.2085, -0.0448],
  [-0.2035, -0.0535],
  [-0.18, -0.0745],
  [-0.1595, -0.0905],
  [-0.1515, -0.0942],
  [-0.1425, -0.0922],
  [-0.1, -0.0775],
  [-0.05, -0.0602],
  [-0.01, -0.0465],
  [0.013, -0.0395],
];
export const BUTT_R = 0.0049;

/** Point on the skeleton butt path near a given z on the lower strut (t along the last segments). */
export function lowerStrutAt(z: number): THREE.Vector3 {
  const seg = BUTT_PATH.slice(14);
  for (let i = 1; i < seg.length; i++) {
    const [z0, y0] = seg[i - 1], [z1, y1] = seg[i];
    if (z >= z0 && z <= z1) {
      const t = (z - z0) / (z1 - z0);
      return V(0, y0 + (y1 - y0) * t, z);
    }
  }
  return V(0, seg[seg.length - 1][1], z);
}

/** Housing side outline (z, y): rear edge, convex belly, front sweep up into the tube. */
const HOUSING: V2[] = [
  [0.019, -0.0115],
  [0.019, -0.0405],
  [0.024, -0.0438],
  [0.045, -0.0466],
  [0.08, -0.0487],
  [0.12, -0.0492],
  [0.155, -0.0474],
  [0.183, -0.0425],
  [0.203, -0.0345],
  [0.216, -0.0245],
  [0.2235, -0.0155],
  [0.226, -0.0115],
];

export function housingBottom(z: number): number {
  for (let i = 2; i < HOUSING.length; i++) {
    const [z0, y0] = HOUSING[i - 1], [z1, y1] = HOUSING[i];
    if (z >= z0 && z <= z1) return y0 + ((y1 - y0) * (z - z0)) / (z1 - z0);
  }
  return -0.04;
}

export function buildSten(m: UkwMats, hi: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const seg = hi ? 40 : 24;
  const R = S.tubeR;
  const [scHead, scSlot] = screwParts(0.0028, 0.001, 25);
  const screw = (p: THREE.Vector3, n: THREE.Vector3, spin = 25) => {
    out.push(part(placeAlong(scHead, p, n), m.stamped), part(placeAlong(scSlot, p, n, spin), m.recess));
  };

  // ================= receiver tube with the cocking slot + safety notch (real openings with walls)
  {
    const sl = S.slot;
    const t = 0.0016;
    const n = hi ? 44 : 28;
    const half = (sl.w / 2 / R) / RAD; // half gap of the slot (deg)
    const notchTop = 162; // the notch runs up the right side to here (deg)
    const nz0 = sl.notchZ - 0.0036, nz1 = sl.notchZ + 0.0036;
    const ring = (lo: number, hi2: number) => sector2D(R, R - t, hi2, lo + 360, n);
    const rings: { z: number; ring: V2[] }[] = [];
    const rEnd = sl.w / 2;
    // rounded rear end of the slot
    for (let k = 0; k <= 5; k++) {
      const a = (k / 5) * (Math.PI / 2);
      const z = sl.z0 + rEnd * (1 - Math.cos(a));
      const h = Math.max(0.15, (rEnd * Math.sin(a)) / R / RAD);
      rings.push({ z, ring: ring(200 - h, 200 + h) });
    }
    rings.push({ z: nz0 - 0.0002, ring: ring(200 - half, 200 + half) });
    rings.push({ z: nz0, ring: ring(notchTop + 3, 200 + half) });
    rings.push({ z: nz0 + 0.0012, ring: ring(notchTop, 200 + half) });
    rings.push({ z: nz1 - 0.0012, ring: ring(notchTop, 200 + half) });
    rings.push({ z: nz1, ring: ring(notchTop + 3, 200 + half) });
    rings.push({ z: nz1 + 0.0002, ring: ring(200 - half, 200 + half) });
    for (let k = 5; k >= 0; k--) {
      const a = (k / 5) * (Math.PI / 2);
      const z = sl.z1 - rEnd * (1 - Math.cos(a));
      const h = Math.max(0.15, (rEnd * Math.sin(a)) / R / RAD);
      rings.push({ z, ring: ring(200 - h, 200 + h) });
    }
    out.push(part(G.loftZ(rings, false, 50), m.stamped));
    out.push(part(latheZ([[R, 0.004], [R, sl.z0 + 0.0001]], seg, 35), m.stamped));
    out.push(part(latheZ([[R, sl.z1 - 0.0001], [R, S.collar.z0 + 0.002]], seg, 35), m.stamped));
    // tube between the collar and the barrel sleeve
    out.push(part(latheZ([[R, S.collar.z0 + 0.001], [R, S.tubeFront]], seg, 35), m.stamped));
    // bolt body inside (seen through the slot and the ejection port)
    out.push(part(cylZ(R - 0.0019, 0.14, 0.334, 24, 0.001), m.bright));
    out.push(part(cylZ(R - 0.0028, 0.03, 0.14, 20, 0.001), m.recess));
    // cocking handle: shank + knob projecting from the slot (right side), bolt forward
    const dir = V(Math.cos(sl.phi), Math.sin(sl.phi), 0);
    const base = V(0, 0, S.handleZ).addScaledVector(dir, R - 0.003);
    out.push(part(G.rod(base, base.clone().addScaledVector(dir, 0.0075), 0.0034, 16), m.stamped));
    const knob = latheZ([[0, 0], [0.0058, 0], [0.0064, 0.0012], [0.0064, 0.0118], [0.0058, 0.0135], [0.004, 0.0142], [0, 0.0142]], 24, 35);
    knob.rotateY(-Math.PI / 2);
    knob.rotateZ(sl.phi - Math.PI);
    const kp = base.clone().addScaledVector(dir, 0.0072);
    knob.translate(kp.x, kp.y, kp.z);
    out.push(part(knob, m.stamped));
    // weld beads along the housing-tube joint (both sides)
    for (const sx of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let z = S.housing.z0 + 0.002; z <= S.housing.z1 - 0.004; z += 0.012) pts.push(V(sx * (S.housing.hw + 0.0006), -Math.sqrt(R * R - S.housing.hw * S.housing.hw) + 0.0004, z));
      out.push(part(G.weld(pts, 0.0011), m.stamped));
    }
  }

  // ================= rear end cap with its flange, butt lug and catch button
  {
    out.push(part(latheZ([[0, -0.0035], [0.0105, -0.0035], [0.016, -0.0022], [0.0198, 0.0], [0.0212, 0.0012], [0.0212, 0.0058], [0.0198, 0.0072], [R + 0.0003, 0.0078], [R + 0.0003, S.capFront], [R - 0.0004, S.capFront + 0.0006]], seg, 35), m.stamped));
    // catch button in the cap (lower rear) and the lug under the cap carrying the butt
    out.push(part(G.rbox(0.013, 0.0105, 0.0175, 0.002, 1), m.stamped, { p: [0, -0.0182, 0.0066] }));
    out.push(part(cylZ(0.0038, -0.0062, -0.0028, 16), m.stamped, { p: [0, -0.009, 0] }));
    out.push(part(cylX(0.0019, -0.0072, 0.0072, 12), m.stamped, { p: [0, -0.0205, 0.0035] }));
  }

  // ================= fixed aperture rear sight (plate with peep, saddle foot)
  {
    const z = S.rearSightZ;
    const plate: V2[] = [[-0.0066, 0.0155], [0.0066, 0.0155], [0.0066, 0.0235], [0.0052, 0.0292], [0, 0.0306], [-0.0052, 0.0292], [-0.0066, 0.0235]];
    out.push(part(extrudeZ(plate, [circle2D(0, S.peepY, 0.00125, 14)], z - 0.0011, z + 0.0011, 0.0003), m.stamped));
    out.push(part(G.rbox(0.0134, 0.004, 0.009, 0.0012, 1), m.stamped, { p: [0, R - 0.0003, z + 0.0012] }));
  }

  // ================= blade foresight on a saddle at the front of the receiver
  {
    const z = S.foreSightZ;
    out.push(part(G.rbox(0.0105, 0.0046, 0.013, 0.0014, 1), m.stamped, { p: [0, R + 0.0003, z] }));
    const blade: V2[] = [[z - 0.0055, R + 0.001], [z + 0.0052, R + 0.001], [z + 0.0022, 0.0258], [z - 0.0012, 0.0258], [z - 0.0055, 0.022]];
    out.push(part(plateZY(blade, 0.0019, [], 0.0003), m.stamped));
  }

  // ================= trigger housing, guard, trigger, change lever, pins
  {
    const h = S.housing;
    out.push(part(plateZY(HOUSING, 2 * h.hw, [], 0.0016), m.stamped));
    // cover plate seam along the belly and the two cover screws on the right side
    for (const sx of [-1, 1]) {
      const seam: THREE.Vector3[] = [];
      for (let z = 0.024; z <= 0.2; z += 0.008) seam.push(V(sx * (h.hw + 0.0001), housingBottom(z) + 0.0046, z));
      out.push(part(G.tube(seam, 0.00045, 4, 48), m.recess));
    }
    screw(V(-h.hw - 0.0002, -0.022, 0.034), V(-1, 0, 0), 60);
    screw(V(-h.hw - 0.0002, -0.021, 0.192), V(-1, 0, 0), 10);
    // trigger & sear pins through the housing
    for (const [z, y] of [[0.072, -0.0305], [0.146, -0.031]] as V2[]) out.push(part(cylX(0.0019, -h.hw - 0.0006, h.hw + 0.0006, 12), m.stamped, { p: [0, y, z] }));
    // change lever (push-through button) above the trigger
    out.push(part(cylX(0.0043, -h.hw - 0.0022, h.hw + 0.0016, 20, 0.0007), m.stamped, { p: [0, -0.0322, S.selectorZ] }));
    out.push(part(cylX(0.0027, h.hw + 0.0016, h.hw + 0.0029, 16, 0.0004), m.stamped, { p: [0, -0.0322, S.selectorZ] }));
    // trigger guard: flat bar loop under the rear of the housing
    const gz0 = 0.0445, gz1 = 0.1005, gy = -0.0608;
    const loop: THREE.Vector3[] = [
      V(0, housingBottom(gz1) + 0.001, gz1),
      V(0, gy + 0.004, gz1),
      V(0, gy + 0.0008, gz1 - 0.0022),
      V(0, gy, gz1 - 0.008),
      V(0, gy, gz0 + 0.008),
      V(0, gy + 0.0008, gz0 + 0.0022),
      V(0, gy + 0.004, gz0),
      V(0, housingBottom(gz0) + 0.001, gz0),
    ];
    const c = V(0, gy + 0.013, (gz0 + gz1) / 2);
    const Nn = loop.map((p) => p.clone().sub(c).setX(0).normalize());
    out.push(part(G.strap(loop, 0.0095, 0.0026, Nn, { samples: 50, smooth: true }), m.stamped));
    // trigger blade
    const tp = [V(0, -0.046, S.triggerZ + 0.0012), V(0, -0.0505, S.triggerZ + 0.0006), V(0, -0.0545, S.triggerZ - 0.0012), V(0, -0.0572, S.triggerZ - 0.0042)];
    out.push(part(G.strap(tp, 0.0052, 0.0034, V(0, 0, 1), { samples: 20 }), m.stamped));
    out.push(part(G.box(0.0042, 0.0005, 0.011), m.recess, { p: [0, housingBottom(S.triggerZ) - 0.0001, S.triggerZ] }));
    // butt strut lug at the rear of the housing with its cross pin
    out.push(part(G.rbox(0.011, 0.012, 0.009, 0.0015, 1), m.stamped, { p: [0, -0.0385, 0.0175] }));
    out.push(part(cylX(0.0017, -0.0064, 0.0064, 12), m.stamped, { p: [0, -0.0395, 0.016] }));
  }

  // ================= magazine-housing collar: ejection port (right), magazine well (left), catch
  {
    const c = S.collar;
    const port = { phi: 212 * RAD, z: 0.2935, sdf: holeRRect(0.0205, 0.049, 0.003) };
    const phis = [0, 60, 120, 180, 245, 300, 360].map((d) => d * RAD);
    out.push(part(perfTube({ R: c.R, t: 0.0033, phis, rows: [c.z0, 0.264, 0.324, c.z1], dz: 0.002, z0: c.z0, nPhi: 6, holes: [port], inner: true, caps: true }), m.stamped));
    // chamfer rings at both ends of the collar
    for (const z of [c.z0, c.z1]) out.push(part(latheZ([[c.R - 0.0033, z - 0.0008], [c.R - 0.0006, z - 0.0008], [c.R - 0.0006, z + 0.0008], [c.R - 0.0033, z + 0.0008]], seg, 35), m.stamped));
    // magazine well: rectangular sleeve projecting to the left, lip at its mouth
    const w = S.well;
    const zc = (w.z0 + w.z1) / 2;
    const outer = roundRect(zc, 0, w.z1 - w.z0, 2 * w.hh, 0.0035, 3);
    const inner = roundRect(zc, 0, S.mag.z1 - S.mag.z0 + 0.0012, 2 * S.mag.hh + 0.0012, 0.0018, 3);
    out.push(part(plateZY(outer, w.x1 - w.x0, [inner], 0.0008), m.stamped, { p: [(w.x0 + w.x1) / 2, 0, 0] }));
    const lipO = roundRect(zc, 0, w.z1 - w.z0 + 0.003, 2 * w.hh + 0.003, 0.004, 3);
    out.push(part(plateZY(lipO, 0.0028, [outer], 0.0006), m.stamped, { p: [w.x1 - 0.0016, 0, 0] }));
    // magazine catch: two ears on the front of the well, plunger with a mushroom head and its spring
    const cz = w.z1 + 0.0052;
    for (const x of [0.0305, 0.0555]) out.push(part(G.rbox(0.0032, 0.0098, 0.0072, 0.0009, 1), m.stamped, { p: [x, 0, w.z1 + 0.0032] }));
    out.push(part(cylX(0.0017, 0.022, 0.0655, 12), m.stamped, { p: [0, 0, cz] }));
    out.push(part(latheZ([[0, 0], [0.0052, 0], [0.0052, 0.0014], [0.0034, 0.0032], [0, 0.0036]], 20, 40).rotateY(Math.PI / 2), m.stamped, { p: [0.0655, 0, cz] }));
    const coil: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 12) * Math.PI * 2;
      coil.push(V(0.034 + (i / 96) * 0.019, Math.sin(a) * 0.0034, cz + Math.cos(a) * 0.0034));
    }
    out.push(part(G.tube(coil, 0.0006, 5, 200), m.blued));
  }

  // ================= magazine (32 rounds, inserted from the left)
  {
    const mag: THREE.Object3D[] = [];
    const g = S.mag;
    const zc = (g.z0 + g.z1) / 2;
    const sec = roundRect(zc, 0, g.z1 - g.z0, 2 * g.hh, 0.0022, 3);
    mag.push(part(plateZY(sec, g.x1 - g.x0, [], 0.0009), m.stamped, { p: [(g.x0 + g.x1) / 2, 0, 0] }));
    // floor plate with its folded lip, and the spot-welded seam line along the back
    const fp = roundRect(zc, 0, g.z1 - g.z0 + 0.0026, 2 * g.hh + 0.0026, 0.0028, 3);
    mag.push(part(plateZY(fp, 0.0034, [], 0.0009), m.stamped, { p: [g.x1 + 0.0012, 0, 0] }));
    mag.push(part(G.box(g.x1 - 0.07, 0.0006, 0.0008), m.recess, { p: [(0.07 + g.x1) / 2 - 0.004, g.hh * 0.35, g.z0 - 0.0002] }));
    // shallow pressed rib along both flat sides
    for (const sy of [-1, 1]) mag.push(part(G.rbox(g.x1 - 0.085, 0.0008, 0.0105, 0.0003, 1), m.stamped, { p: [(0.085 + g.x1) / 2 - 0.006, sy * (g.hh + 0.0002), zc] }));
      const mg = group(mag, { name: 'sten-magazine' });
    mg.userData.stenPart = 'magazine';
    out.push(mg);
  }

  // ================= barrel sleeve (three rows of three holes) with front ring and latch
  {
    const sv = S.sleeve;
    const holes: { phi: number; z: number; sdf: (s: number, z: number) => number }[] = [];
    const zs = [0.3875, 0.412, 0.4365];
    for (const deg of [90, 210, 330]) for (const z of zs) holes.push({ phi: deg * RAD, z, sdf: holeCircle(0.0068) });
    const phis: number[] = [];
    for (let d = 0; d <= 360; d += 30) phis.push((d + 15) * RAD);
    out.push(part(perfTube({ R: sv.R, t: 0.0022, phis, rows: [sv.z0, 0.4, 0.424, sv.z1], dz: 0.0015, z0: sv.z0, nPhi: 4, holes, inner: true, caps: true }), m.stamped));
    out.push(part(latheZ([[0.0082, sv.z1 - 0.0045], [sv.R + 0.0006, sv.z1 - 0.0045], [sv.R + 0.0006, sv.z1 - 0.001], [sv.R - 0.0004, sv.z1], [0.0082, sv.z1]], seg, 35), m.stamped));
    out.push(part(latheZ([[sv.R - 0.0008, sv.z0 - 0.001], [sv.R + 0.0009, sv.z0 - 0.001], [sv.R + 0.0009, sv.z0 + 0.0052], [sv.R - 0.0008, sv.z0 + 0.0052]], seg, 35), m.stamped));
    // sleeve latch on the left of the receiver front
    out.push(part(G.rbox(0.004, 0.0078, 0.0165, 0.0012, 1), m.stamped, { p: [R + 0.0016, 0.0062, sv.z0 - 0.0085], r: [0, 0, -18] }));
    // dark interior seen through the holes
    out.push(part(cylZ(sv.R - 0.0024, sv.z0 + 0.002, sv.z1 - 0.004, 20, 0.0005), m.recess));
  }

  // ================= barrel: stepped muzzle, crown and bore
  {
    const z0 = S.sleeve.z1 - 0.002, zm = S.muzzleZ;
    out.push(part(latheZ([[0, z0], [0.0079, z0], [0.0079, zm - 0.027], [0.0074, zm - 0.0258], [0.0068, zm - 0.0255], [0.0068, zm - 0.0008], [0.0062, zm], [0.0046, zm - 0.0004], [0.0045, zm - 0.012], [0, zm - 0.012]], seg, 30), m.black));
    out.push(part(cylZ(0.0044, zm - 0.0118, zm - 0.0112, 16), m.recess));
  }

  // ================= skeleton (loop) butt of bent tube
  {
    const pts = BUTT_PATH.map(([z, y]) => V(0, y, z));
    out.push(part(G.tube(pts, BUTT_R, 12, 150), m.stamped));
    // flattened strut end at the housing lug
    out.push(part(G.rbox(0.0068, 0.0092, 0.012, 0.0018, 1), m.stamped, { p: [0, -0.0402, 0.009], r: [-19, 0, 0] }));
  }
  return out;
}
