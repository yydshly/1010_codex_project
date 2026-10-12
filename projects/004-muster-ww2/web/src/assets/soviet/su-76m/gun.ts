/**
 * ZiS-3Sh elevating mass for the SU-76M (adapted from the project's ZiS-3 field-gun module):
 * monobloc barrel with breech ring and vertical sliding wedge, two-chamber slotted muzzle brake,
 * recoil brake + recuperator cylinders under the barrel, trough cradle with trunnions and elevating
 * sectors, and the sight bracket with the panoramic sight. The vehicle mount (pedestal, cheeks),
 * the moving shield and the armoured recoil-gear cover are added in mount().
 *
 * Cradle-local frame: origin on the trunnion axis, +Z along the bore towards the muzzle,
 * bore axis at y = GD.boreAbove, +X the gun's left.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { GD as D, frontZ, FRONT_N } from './dims';
import type { Pal } from './palette';
import { latheZ, ringProfile, cylZ, cylX, slab, type P3 } from './util';

let P: Pal;

type V2 = [number, number];
type V3 = [number, number, number];

const BY = D.boreAbove;
/** Cradle trough cross-section. */
export const CR = { hw: 0.125, wall: 0.014, floor: -0.155, top: -0.005 };
/** Equilibrator lug on each side of the cradle (cradle-local). */
export const EQ_LUG: V3 = [0.235, -0.165, -0.42];

function barrelTube(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const seg = hi ? 56 : 32;
  const zb = D.muzzle - D.brakeLen; // brake rear face
  // outer profile: collar at the breech, long taper, slight swell under the brake threads
  const prof: V2[] = [
    [0, D.breechFront - 0.01],
    [0.09, D.breechFront - 0.01],
    [0.094, D.breechFront + 0.01],
    [0.094, D.breechFront + 0.075],
    [0.089, D.breechFront + 0.085],
    [0.087, D.breechFront + 0.2],
    [0.08, 0.6],
    [0.0735, 1.2],
    [0.066, 1.8],
    [0.058, zb - 0.06],
    [0.0585, zb - 0.04],
    [0.0605, zb - 0.03],
    [0.0605, zb + 0.02],
    // hollow muzzle end: the dark bore liner shows inside
    [0.047, zb + 0.02],
    [0.047, zb - 0.28],
    [0, zb - 0.28],
  ];
  o.push(part(latheZ(prof, seg, 30), P.paint, { p: [0, BY, 0] }));
  // bore liner (dark steel) with the chamber end
  o.push(part(latheZ([[0.0381, zb + 0.021], [0.0381, zb - 0.279], [0.0475, zb - 0.279], [0.0475, zb + 0.021], [0.0381, zb + 0.021]], seg, 40), P.bore, { p: [0, BY, 0] }));
  o.push(part(latheZ([[0, zb - 0.278], [0.039, zb - 0.278]], 24, 40), P.bore, { p: [0, BY, 0] }));
  // rifling: shallow lands inside the visible bore
  const lands: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const g = G.rbox(0.004, 0.0016, 0.29, 0.0005, 1);
    g.translate(0, 0.0381 - 0.0006, 0);
    g.rotateZ(a);
    g.translate(0, 0, zb - 0.13);
    lands.push(g);
  }
  if (hi) o.push(part(G.mergeGeometries(lands.map((g) => g.toNonIndexed()))!, P.bore, { p: [0, BY, 0] }));
  return o;
}

function muzzleBrake(hi: boolean): THREE.Object3D[] {
  // Two-chamber slotted brake: rear threaded collar, two slotted chambers separated by a
  // baffle, front baffle ring. Slots are real openings between longitudinal bars.
  const o: THREE.Object3D[] = [];
  const seg = hi ? 48 : 28;
  const z0 = D.muzzle - D.brakeLen;
  const ro = 0.079, ri = 0.064, rb = 0.043; // outer, inner (chamber), baffle bore
  const mat = P.forged;
  const zc = [z0, z0 + 0.08, z0 + 0.19, z0 + 0.225, z0 + 0.325, D.muzzle];
  // rear collar (screwed on the barrel), with a spanner-flat ring
  o.push(part(latheZ([[0.059, zc[0]], [ro - 0.004, zc[0]], [ro, zc[0] + 0.006], [ro, zc[1]], [ri, zc[1]], [ri, zc[1] - 0.008], [0.059, zc[1] - 0.012], [0.059, zc[0]]], seg, 35), mat, { p: [0, BY, 0] }));
  // middle baffle and front ring (both full rings with the projectile passage)
  o.push(part(latheZ(ringProfile(rb, ro, zc[2], zc[3], 0.003), seg, 35), mat, { p: [0, BY, 0] }));
  o.push(part(latheZ([[rb, zc[4]], [ro, zc[4]], [ro, zc[5] - 0.008], [ro - 0.008, zc[5]], [rb + 0.006, zc[5]], [rb, zc[5] - 0.006], [rb, zc[4]]], seg, 35), mat, { p: [0, BY, 0] }));
  // baffle faces in the chambers are soot-darkened
  for (const z of [zc[2] - 0.0005, zc[4] - 0.0005]) {
    o.push(part(latheZ([[ri - 0.001, z], [rb + 0.001, z]], seg, 40), P.bore, { p: [0, BY, 0] }));
  }
  // chamber shells: solid top & bottom sectors, slotted sides (5 slots per side)
  for (const [a, b] of [[zc[1], zc[2]], [zc[3], zc[4]]]) {
    const segs: [number, number][] = [];
    // solid sectors (deg, measured from +X towards +Y)
    segs.push([55, 125], [235, 305]);
    for (const base of [-55, 125]) {
      const span = 110, slot = 12, n = 5;
      const bar = (span - n * slot) / (n - 1);
      let t = base + 0; // slots start right after the solid sector
      for (let i = 0; i < n - 1; i++) {
        t += slot;
        segs.push([t, t + bar]);
        t += bar;
      }
    }
    for (const [s0, s1] of segs) {
      const nSeg = Math.max(3, Math.round(((s1 - s0) / 360) * seg * 1.5));
      o.push(part(latheZ(ringProfile(ri, ro, a, b, 0.0025), nSeg, 35, s0, s1), mat, { p: [0, BY, 0] }));
    }
    // inner soot liner behind the slots (a thin dark sleeve would block the view; use the bore
    // colour only on the chamber floor)
  }
  // chamber floor: the barrel's muzzle face inside chamber one is dark
  o.push(part(latheZ([[ri - 0.001, zc[1] - 0.012], [0.047, zc[1] - 0.012]], seg, 40), P.bore, { p: [0, BY, 0] }));
  return o;
}

function breech(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const z0 = D.breechRear, z1 = D.breechFront;
  const L = z1 - z0, zc = (z0 + z1) / 2;
  const cy = BY - 0.035; // ring centre (taller below the bore: the wedge drops to open)
  const H = 0.29, W = 0.235;
  const ringMat = P.forged;
  // ring body: two cheeks, top bridge, front wall (the wedge slot runs vertically through it)
  const slotW = 0.13;
  const cheekW = (W - slotW) / 2;
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(cheekW, H, L, 0.012, 2), ringMat, { p: [sx * (slotW / 2 + cheekW / 2), cy, zc] }));
  }
  o.push(part(G.rbox(slotW + 0.01, 0.07, L, 0.01, 2), ringMat, { p: [0, cy + H / 2 - 0.035, zc] }));
  o.push(part(G.rbox(slotW + 0.01, H - 0.02, 0.1, 0.008, 2), ringMat, { p: [0, cy - 0.005, z1 - 0.05] }));
  // the wedge (closed): bright-ish blued block filling the slot, rear face slightly proud
  const wedgeTop = cy + H / 2 - 0.07;
  const wedgeBot = cy - H / 2 - 0.012;
  const wh = wedgeTop - wedgeBot;
  o.push(part(G.rbox(slotW - 0.004, wh, L - 0.1 + 0.006, 0.006, 2), P.bright, { p: [0, wedgeBot + wh / 2, z0 + (L - 0.1) / 2 - 0.003] }));
  // loading groove on the wedge top (visible from above/behind)
  o.push(part(G.rbox(0.08, 0.01, 0.12, 0.004, 1), P.bright, { p: [0, wedgeTop - 0.003, z0 + 0.07] }));
  // breech face: chamber mouth ring around the bore on the ring's rear face (above the wedge)
  // rear face bosses & cover bolts
  const bolts: { p: V3; n: V3 }[] = [];
  for (const sx of [1, -1]) {
    for (const y of [cy + 0.1, cy - 0.1]) bolts.push({ p: [sx * (slotW / 2 + cheekW / 2), y, z0], n: [0, 0, -1] });
  }
  o.push(part(G.scatter(G.boltHead(0.02, 0.008), bolts), ringMat));
  // lower lug for the recoil cylinders
  o.push(part(G.rbox(0.2, 0.08, 0.14, 0.01, 2), ringMat, { p: [0, cy - H / 2 - 0.02, z1 - 0.07] }));
  // guide claws riding on the cradle rails (both sides, at rail height)
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(0.03, 0.035, L - 0.04, 0.006, 1), ringMat, { p: [sx * (W / 2 + 0.012), CR.top + 0.01, zc + 0.02] }));
  }
  // --- breech mechanism, right side (-X): crank lever with handle, lever shaft boss
  const sxR = -1;
  const shaft: V3 = [sxR * (W / 2), cy + 0.02, z0 + 0.12];
  o.push(part(cylX(0.03, 0, 0.03, 24, 0.004), ringMat, { p: [shaft[0] - 0.03, shaft[1], shaft[2]] }));
  o.push(part(cylX(0.016, 0, 0.05, 16, 0.002), P.bright, { p: [shaft[0] - 0.05, shaft[1], shaft[2]] }));
  // lever arm: from the shaft boss rearward and down
  const arm0: V3 = [shaft[0] - 0.042, shaft[1], shaft[2]];
  const arm1: V3 = [shaft[0] - 0.042, shaft[1] - 0.1, shaft[2] - 0.2];
  o.push(part(G.rod(arm0, arm1, 0.014, 12, 0.011), P.paint));
  o.push(part(G.rbox(0.028, 0.05, 0.06, 0.008, 1), P.paint, { p: [arm0[0], arm0[1] - 0.01, arm0[2] - 0.02], r: [26, 0, 0] }));
  // handle grip (bare steel, polished by hands)
  o.push(part(cylX(0.015, 0, 0.1, 16, 0.004), P.bright, { p: [arm1[0] - 0.1 + 0.012, arm1[1], arm1[2]] }));
  o.push(part(new THREE.SphereGeometry(0.018, 16, 10), P.bright, { p: [arm1[0] - 0.095, arm1[1], arm1[2]] }));
  // semi-automatic copier cam on the left side (+X)
  o.push(part(G.plate([[z0 + 0.02, cy - 0.06], [z0 + 0.2, cy - 0.06], [z0 + 0.25, cy + 0.02], [z0 + 0.08, cy + 0.06], [z0 + 0.02, cy + 0.03]], 0.012, 'zy', 0.003), ringMat, { p: [W / 2 + 0.006, 0, 0] }));
  o.push(part(cylX(0.022, 0, 0.02, 20, 0.003), P.bright, { p: [W / 2 + 0.01, cy - 0.02, z0 + 0.1] }));
  // extractor lever pin & firing mechanism housing at the rear face bottom
  o.push(part(G.rbox(0.05, 0.05, 0.03, 0.006, 1), ringMat, { p: [0.04, wedgeBot + 0.03, z0 - 0.012] }));
  o.push(part(G.cyl(0.008, 0.008, 0.18, 10), P.bright, { p: [0, wedgeBot + 0.05, z0 + 0.03], r: [0, 0, 90] }));
  void hi;
  return o;
}

function recoilCylinders(hi: boolean): THREE.Object3D[] {
  // Recoil brake (right) and recuperator (left) side by side under the barrel; the cylinders are
  // fixed to the breech ring lug and recoil with the barrel, the rods are anchored in the cradle.
  const o: THREE.Object3D[] = [];
  const seg = hi ? 32 : 20;
  const y = BY - 0.13;
  const z0 = D.breechFront - 0.06, z1 = 0.78;
  for (const [x, r] of [[0.056, 0.047], [-0.056, 0.042]] as [number, number][]) {
    o.push(part(cylZ(r, z0, z1, seg, 0.006), P.paint, { p: [x, y, 0] }));
    // end caps (screwed), filler plug on the recuperator
    o.push(part(latheZ([[r - 0.012, z1], [r + 0.003, z1], [r + 0.003, z1 + 0.035], [r - 0.004, z1 + 0.04], [0.02, z1 + 0.04]], seg, 35), P.cast, { p: [x, y, 0] }));
    o.push(part(latheZ([[0, z0 - 0.03], [r + 0.004, z0 - 0.03], [r + 0.004, z0 + 0.02], [r - 0.004, z0 + 0.03]], seg, 35), P.cast, { p: [x, y, 0] }));
    // piston / rod to the cradle front plate
    o.push(part(cylZ(0.017, z1 + 0.03, D.cradleFront + 0.005, 16, 0.002), P.bright, { p: [x, y, 0] }));
  }
  o.push(part(G.boltHead(0.022, 0.01), P.cast, { p: [0.056, y + 0.047, 0.2] }));
  o.push(part(G.boltHead(0.022, 0.01), P.cast, { p: [0.056, y + 0.047, -0.2] }));
  // clamp bands tying both cylinders to each other
  for (const zc of [-0.1, 0.45]) {
    o.push(part(G.rbox(0.21, 0.02, 0.03, 0.006, 1), P.paint, { p: [0, y - 0.035, zc] }));
  }
  return o;
}

function cradle(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const zr = D.cradleRear, zf = D.cradleFront;
  const L = zf - zr, zc = (zr + zf) / 2;
  const mat = P.paint;
  // trough: floor + walls (with top guide rails)
  o.push(part(G.rbox(CR.hw * 2, 0.018, L, 0.005, 2), mat, { p: [0, CR.floor + 0.009, zc] }));
  for (const sx of [1, -1]) {
    const wx = sx * (CR.hw - CR.wall / 2);
    o.push(part(G.rbox(CR.wall, CR.top - CR.floor, L, 0.004, 1), mat, { p: [wx, (CR.top + CR.floor) / 2, zc] }));
    // guide rail along the top edge (bright slideway on top)
    o.push(part(G.rbox(0.032, 0.02, L - 0.02, 0.004, 1), P.cast, { p: [sx * (CR.hw - 0.012), CR.top - 0.002, zc] }));
    o.push(part(G.rbox(0.02, 0.004, L - 0.06, 0.001, 1), P.bright, { p: [sx * (CR.hw - 0.014), CR.top + 0.0095, zc] }));
    // longitudinal stiffening rib on the outer wall
    o.push(part(G.rbox(0.01, 0.022, L - 0.1, 0.003, 1), mat, { p: [sx * (CR.hw + 0.004), CR.floor + 0.05, zc] }));
    // trunnion boss + trunnion pin
    o.push(part(cylX(0.068, 0, 0.03, 36, 0.006), P.cast, { p: [sx > 0 ? CR.hw - 0.004 : -CR.hw - 0.026, 0, 0] }));
    o.push(part(cylX(0.038, 0, 0.1, 28, 0.004), P.bright, { p: [sx > 0 ? CR.hw + 0.02 : -CR.hw - 0.12, 0, 0] }));
    // equilibrator lug arm (behind the cheeks)
    const lx = sx * EQ_LUG[0];
    o.push(part(G.rbox(Math.abs(lx) - CR.hw + 0.01, 0.05, 0.05, 0.008, 1), P.cast, { p: [sx * ((Math.abs(lx) + CR.hw) / 2), EQ_LUG[1], EQ_LUG[2]] }));
    o.push(part(cylX(0.022, 0, 0.06, 16, 0.003), P.cast, { p: [lx - 0.03, EQ_LUG[1], EQ_LUG[2]] }));
  }
  // elevating sectors (two, one each side just outside the walls), toothed, on the trunnion axis
  const sector = (): THREE.BufferGeometry => {
    const pts: V2[] = [];
    const rIn = 0.13, rOut = 0.205;
    const a0 = THREE.MathUtils.degToRad(186), a1 = THREE.MathUtils.degToRad(240);
    const nT = 20;
    for (let i = 0; i <= nT * 2; i++) {
      const a = a0 + ((a1 - a0) * i) / (nT * 2);
      const r = i % 2 === 0 ? rOut : rOut + 0.011;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    for (let i = 12; i >= 0; i--) {
      const a = a0 + ((a1 - a0) * i) / 12;
      pts.push([Math.cos(a) * rIn, Math.sin(a) * rIn]);
    }
    // outline is in (z, y) of the side view
    return G.plate(pts.map(([u, v]) => [u, v] as V2), 0.02, 'zy', 0.002);
  };
  for (const sx of [1, -1]) o.push(part(sector(), P.cast, { p: [sx * (CR.hw + 0.014), 0, 0] }));
  // front section: closed box over the rods, front plate with the barrel bearing collar
  const fz0 = 0.56;
  o.push(part(G.rbox(CR.hw * 2, 0.012, zf - fz0, 0.004, 1), mat, { p: [0, CR.top + 0.006 + 0.0, (fz0 + zf) / 2 - 0.0], s: [1, 1, 1] }));
  o.push(part(G.rbox(CR.hw * 2 + 0.01, CR.top - CR.floor + 0.04, 0.022, 0.006, 2), P.cast, { p: [0, (CR.top + CR.floor) / 2 + 0.01, zf - 0.011] }));
  o.push(part(latheZ(ringProfile(0.083, 0.115, zf - 0.03, zf + 0.035, 0.004), hi ? 48 : 28, 35), P.paint, { p: [0, BY, 0] }));
  // rod nuts on the front plate
  for (const x of [0.056, -0.056]) {
    o.push(part(G.boltHead(0.042, 0.02), P.cast, { p: [x, BY - 0.13, zf], r: [90, 0, 0] }));
  }
  // bolts round the collar
  const cb: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    cb.push({ p: [Math.cos(a) * 0.1, BY + Math.sin(a) * 0.1, zf + 0.035], n: [0, 0, 1] });
  }
  o.push(part(G.scatter(G.boltHead(0.014, 0.006), cb), P.cast));
  // rear cross member and recoil indicator (left wall)
  o.push(part(G.rbox(CR.hw * 2, 0.05, 0.03, 0.006, 1), P.cast, { p: [0, CR.floor + 0.03, zr + 0.02] }));
  o.push(part(G.rbox(0.008, 0.03, 0.22, 0.002, 1), P.brass, { p: [CR.hw + 0.006, CR.top - 0.03, -0.25] }));
  o.push(part(G.rbox(0.012, 0.02, 0.02, 0.003, 1), P.bright, { p: [CR.hw + 0.012, CR.top - 0.03, -0.33] }));
  return o;
}

function sight(hi: boolean): THREE.Object3D[] {
  // Sight bracket on the left cradle wall, sight body with range drum, PG-1 type panoramic sight.
  const o: THREE.Object3D[] = [];
  const x = 0.27, zb = -0.06;
  const baseY = CR.top + 0.02;
  // bracket: cast arm from the left wall out and up
  o.push(part(G.plate([[-0.08, 0], [0.06, 0], [0.04, 0.16], [-0.05, 0.16]], 0.022, 'zy', 0.004), P.cast, { p: [CR.hw + 0.02, baseY - 0.04, zb] }));
  o.push(part(G.rbox(x - CR.hw, 0.03, 0.08, 0.008, 2), P.cast, { p: [(x + CR.hw) / 2 + 0.01, baseY + 0.13, zb] }));
  const sy = baseY + 0.17;
  // sight body (black enamel) with range drum on the left
  o.push(part(G.rbox(0.06, 0.1, 0.12, 0.008, 2), P.optic, { p: [x, sy + 0.03, zb] }));
  o.push(part(cylX(0.038, 0, 0.03, 32, 0.003), P.optic, { p: [x + 0.03, sy + 0.03, zb - 0.01] }));
  o.push(part(cylX(0.039, 0, 0.012, 32, 0.002), P.brass, { p: [x + 0.036, sy + 0.03, zb - 0.01] }));
  o.push(part(cylX(0.012, 0, 0.03, 16, 0.002), P.optic, { p: [x + 0.06, sy + 0.03, zb - 0.01] }));
  // cross-level vial housing
  o.push(part(G.rbox(0.02, 0.018, 0.07, 0.004, 1), P.optic, { p: [x - 0.035, sy + 0.05, zb + 0.02] }));
  o.push(part(G.rbox(0.012, 0.01, 0.05, 0.003, 1), P.glass, { p: [x - 0.041, sy + 0.055, zb + 0.02] }));
  // panoramic sight: vertical body, rotating head with objective window, angled eyepiece
  const py = sy + 0.08;
  o.push(part(G.cyl(0.028, 0.03, 0.07, 28), P.optic, { p: [x, py + 0.035, zb] }));
  o.push(part(G.cyl(0.032, 0.032, 0.012, 28), P.brass, { p: [x, py + 0.075, zb] }));
  o.push(part(G.rbox(0.055, 0.06, 0.07, 0.01, 2), P.optic, { p: [x, py + 0.11, zb + 0.005] }));
  o.push(part(G.rbox(0.035, 0.03, 0.004, 0.002, 1), P.glass, { p: [x, py + 0.113, zb + 0.041] }));
  // eyepiece tube angled back towards the gunner
  const e0: V3 = [x, py + 0.02, zb - 0.02];
  const e1: V3 = [x, py + 0.0, zb - 0.13];
  o.push(part(G.rod(e0, e1, 0.017, 20), P.optic));
  o.push(part(latheZ([[0.018, 0], [0.024, 0], [0.024, 0.03], [0.018, 0.03]], 24, 40), P.rubber, { p: e1, r: [-(Math.atan2(0.02, 0.11) * 180) / Math.PI + 180, 0, 0] }));
  o.push(part(cylZ(0.013, -0.001, 0.001, 20), P.glass, { p: [e1[0], e1[1] - 0.001, e1[2] + 0.006] }));
  // direct-fire telescope running forward to the shield window
  const t0: V3 = [x - 0.005, sy + 0.0, zb + 0.06];
  const t1: V3 = [x - 0.005, sy + 0.0, 0.07];
  o.push(part(G.rod(t0, t1, 0.019, 20), P.optic));
  o.push(part(cylZ(0.025, t1[2] - 0.04, t1[2], 24, 0.003), P.optic, { p: [t1[0], t1[1], 0] }));
  o.push(part(cylZ(0.019, t1[2] - 0.001, t1[2] + 0.001, 20), P.glass, { p: [t1[0], t1[1], 0.001] }));
  void hi;
  return o;
}

/** Elevating mass in the cradle-local frame. */
function elevatingMass(): THREE.Object3D[] {
  const hi = true;
  return [...barrelTube(hi), ...muzzleBrake(hi), ...breech(hi), ...recoilCylinders(hi), ...cradle(hi), ...sight(hi)];
}

/** Hand wheel with spokes and a crank handle, axis along +X, centred on the origin. */
function handWheel(r: number): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  o.push(part(G.torus(r, 0.009, 8, 32), P.cast, { r: [0, 90, 0] }));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    o.push(part(G.rod([0, 0, 0], [0, Math.sin(a) * r, Math.cos(a) * r], 0.006, 8), P.cast));
  }
  o.push(part(cylX(0.022, -0.02, 0.02, 16, 0.003), P.cast));
  const a = 0.4;
  const hp: V3 = [0, Math.sin(a) * r, Math.cos(a) * r];
  o.push(part(cylX(0.011, 0, 0.07, 12, 0.003), P.bright, { p: hp }));
  return o;
}

/**
 * The complete gun installation in the hull frame: pedestal and upper carriage cheeks on the
 * fighting-compartment floor, the elevating mass on its trunnions, the moving shield parallel to
 * the casemate front plate, the armoured cover over the recoil gear and the hand wheels.
 */
export function gunMount(pal: Pal, floorY: number): THREE.Group {
  P = pal;
  const out: THREE.Object3D[] = [];
  const tY = D.trunY, tZ = D.trunZ, tX = D.trunX;
  // elevating mass (0 deg elevation)
  out.push(group(elevatingMass(), { p: [tX, tY, tZ] }));
  // pedestal: fabricated box standing on the floor, with a traverse plate on top
  const pTop = tY - 0.34;
  out.push(part(G.rbox(0.42, pTop - floorY, 0.5, 0.012, 2), P.paint, { p: [tX, (pTop + floorY) / 2, tZ + 0.02] }));
  out.push(part(G.rbox(0.62, 0.02, 0.62, 0.008, 1), P.paint, { p: [tX, floorY + 0.01, tZ + 0.02] }));
  out.push(part(G.lathe([[0.0, 0.0], [0.3, 0.0], [0.3, 0.03], [0.28, 0.04], [0.0, 0.04]], 40, 40), P.cast, { p: [tX, pTop, tZ + 0.02] }));
  // upper-carriage cheeks carrying the trunnions
  const cheek: G.V2[] = [[-0.3, 0.0], [0.26, 0.0], [0.18, 0.2], [0.09, 0.33], [-0.09, 0.33], [-0.2, 0.2]];
  for (const sx of [-1, 1]) {
    out.push(part(G.plate(cheek, 0.028, 'zy', 0.005), P.cast, { p: [tX + sx * 0.268, pTop + 0.04, tZ] }));
    out.push(part(cylX(0.07, -0.02, 0.02, 28, 0.004), P.cast, { p: [tX + sx * 0.285, tY, tZ] }));
  }
  // elevating hand wheel (left, gunner's side) and traverse hand wheel below it
  for (const hw of [handWheel(0.1)]) out.push(group(hw, { p: [tX + 0.36, tY - 0.12, tZ - 0.32] }));
  out.push(part(G.rod([tX + 0.3, tY - 0.12, tZ - 0.32], [tX + 0.36, tY - 0.12, tZ - 0.32], 0.014, 10), P.cast));
  out.push(group(handWheel(0.085), { p: [tX + 0.34, pTop - 0.14, tZ - 0.2] }));
  out.push(part(G.rod([tX + 0.21, pTop - 0.14, tZ - 0.2], [tX + 0.34, pTop - 0.14, tZ - 0.2], 0.014, 10), P.cast));
  out.push(part(G.rbox(0.1, 0.14, 0.12, 0.01, 1), P.cast, { p: [tX + 0.19, pTop - 0.1, tZ - 0.2] }));

  // moving shield: flat plate parallel to the casemate front, just ahead of it, with a cut-out for
  // the recoil-gear cover and the barrel
  const by = tY + D.boreAbove;
  const n = new THREE.Vector3(...FRONT_N);
  const up = new THREE.Vector3(0, n.z, -n.y); // up the plate
  const c0 = new THREE.Vector3(tX, by, frontZ(by)).addScaledVector(n, 0.035);
  const P3at = (x: number, s: number, off = 0): P3 => {
    const v = c0.clone().addScaledVector(up, s).addScaledVector(n, off);
    return [v.x + x, v.y, v.z];
  };
  const shW = 0.4, sLo = -0.3, sHi = 0.3;
  out.push(part(slab([P3at(-shW, sLo), P3at(shW, sLo), P3at(shW, sHi), P3at(-shW, sHi)], 0.02, FRONT_N, 0.005), P.paint));
  // bolts round the shield edge
  const bolts: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const x = -shW + 0.04 + (i * (2 * shW - 0.08)) / 5;
    for (const s of [sLo + 0.035, sHi - 0.035]) bolts.push({ p: new THREE.Vector3(...P3at(x, s)), n: n.clone(), spin: i });
  }
  for (const sx of [-1, 1]) for (const s of [-0.1, 0.1]) bolts.push({ p: new THREE.Vector3(...P3at(sx * (shW - 0.035), s)), n: n.clone(), spin: s });
  out.push(part(G.scatter(G.boltHead(0.024, 0.01), bolts), P.paint));
  // armoured recoil-gear cover: box round the cradle trough, from the shield to the cradle front
  const zs = c0.z - 0.04, zf = tZ + D.cradleFront - 0.03;
  const yTop = tY - 0.035, yBot = tY - 0.2;
  const sleeve = G.extrude(G.shape([[-0.15, yBot], [0.15, yBot], [0.16, yTop - 0.03], [0.14, yTop], [-0.14, yTop], [-0.16, yTop - 0.03]], 0.01), zf - zs, 0.006, 2, 1);
  out.push(part(sleeve, P.paint, { p: [tX, 0, (zs + zf) / 2] }));
  // front cap of the cover (rounded lip) and seam welds
  out.push(part(G.rbox(0.33, 0.03, 0.03, 0.01, 2), P.paint, { p: [tX, yBot + 0.015, zf - 0.01] }));
  out.push(part(G.weld([[tX - 0.15, yBot + 0.002, zs + 0.03], [tX - 0.15, yBot + 0.002, zf - 0.02]], 0.004), P.paint));
  out.push(part(G.weld([[tX + 0.15, yBot + 0.002, zs + 0.03], [tX + 0.15, yBot + 0.002, zf - 0.02]], 0.004), P.paint));
  return group(out, { name: 'gun' });
}
