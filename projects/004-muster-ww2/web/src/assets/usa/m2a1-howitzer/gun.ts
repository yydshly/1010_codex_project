/**
 * Elevating mass of the 105 mm Howitzer M2A1: tube with its muzzle band and locking ring,
 * breech ring with the horizontal sliding wedge (opens to the right) and its operating lever,
 * the Recoil Mechanism M2A1 (the recoil sleigh wrapped round the tube, the recuperator cylinder
 * carried ABOVE the tube, the buffer cylinder in the sleigh BELOW it inside the cradle; the whole
 * sleigh recoils with the tube, the piston rods are anchored in the cradle), the trough cradle with
 * its trunnions just ahead of the breech ring, the two toothed elevating arcs, the travelling
 * cradle-lock strut, and the elbow-telescope bracket.
 *
 * Cradle-local frame: origin on the trunnion axis, +Z along the bore towards the muzzle,
 * bore axis at y = D.boreAbove, +X the gun's left.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { latheZ, latheX, ringProfile, cylZ, cylX, circlePts, type V2, type V3 } from './util';

const BA = D.boreAbove;
/** Cradle trough cross-section (cradle-local y). */
export const CR = { hw: 0.14, wall: 0.013, floor: -0.175, top: 0.035 };
/** Elevating arcs: plane |x|, pitch radius, angular span (deg from +Z towards +Y). */
export const ARC = { x: 0.172, r: 0.24, a0: 172, a1: 250, t: 0.02 };
/** Elbow telescope line (cradle-local): x, y, rear and front ends along the bore. */
export const ELBOW = { x: 0.3, y: BA - 0.005, s0: -0.12, s1: 0.5 };
const RY = BA + D.recupUp; // recuperator axis
/** Equilibrator pin on the cross tube joining the two arcs (cradle-local z, y). */
const EQA = THREE.MathUtils.degToRad(205);
export const EQ_PIN: [number, number] = [Math.cos(EQA) * 0.205, Math.sin(EQA) * 0.205];

function tube(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const seg = hi ? 56 : 32;
  const zm = D.muzzle;
  const prof: V2[] = [
    [0, D.breechFront - 0.03],
    [0.1, D.breechFront - 0.03],
    [0.1, 0.12],
    [0.097, 0.2],
    [0.093, 0.6],
    [0.087, 1.1],
    [0.081, 1.6],
    [0.0755, zm - 0.1],
    [0.0755, zm - 0.085],
    [0.0795, zm - 0.075],
    [0.0795, zm - 0.008],
    [0.074, zm],
    // hollow muzzle: the dark bore liner shows inside
    [0.056, zm],
    [0.056, zm - 0.3],
    [0, zm - 0.3],
  ];
  o.push(part(latheZ(prof, seg, 30), P.tube(), { p: [0, BA, 0] }));
  // bore liner with the chamber end, shallow rifling lands
  o.push(part(latheZ([[0.0525, zm + 0.0005], [0.0525, zm - 0.299], [0.0562, zm - 0.299], [0.0562, zm + 0.0005], [0.0525, zm + 0.0005]], seg, 40), P.bore(), { p: [0, BA, 0] }));
  o.push(part(latheZ([[0, zm - 0.298], [0.053, zm - 0.298]], 24, 40), P.bore(), { p: [0, BA, 0] }));
  if (hi) {
    const lands: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 36; i++) {
      const g = G.rbox(0.0042, 0.0016, 0.29, 0.0005, 1);
      g.translate(0, 0.0525 - 0.0006, 0);
      g.rotateZ((i / 36) * Math.PI * 2);
      g.translate(0, 0, zm - 0.148);
      lands.push(g.index ? g.toNonIndexed() : g);
    }
    o.push(part(G.mergeGeometries(lands)!, P.bore(), { p: [0, BA, 0] }));
  }
  // locking ring screwed onto the tube against the breech ring, with spanner notches
  const lr = latheZ(ringProfile(0.1, 0.122, D.breechFront - 0.002, D.breechFront + 0.07, 0.004), seg, 35);
  o.push(part(lr, P.tube(), { p: [0, BA, 0] }));
  const notches: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    notches.push({ p: [Math.cos(a) * 0.122, BA + Math.sin(a) * 0.122, D.breechFront + 0.034], n: [Math.cos(a), Math.sin(a), 0] });
  }
  o.push(part(G.scatter(G.rbox(0.014, 0.006, 0.03, 0.002, 1), notches), P.bore()));
  return o;
}

function breechRing(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const z0 = D.breechRear, z1 = D.breechFront;
  const L = z1 - z0;
  const hw = 0.155;
  const yb = BA - 0.135, yt = BA + 0.12;
  const H = yt - yb;
  const mat = P.tube();
  // front section: full block
  const fL = 0.12;
  o.push(part(G.rbox(hw * 2, H, fL, 0.014, 2), mat, { p: [0, (yb + yt) / 2, z1 - fL / 2] }));
  // rear section: top and bottom bridges + left cheek; the wedge fills the slot from the right
  const rL = L - fL + 0.004;
  const zr = z0 + rL / 2;
  const wy0 = BA - 0.085, wy1 = BA + 0.075; // wedge slot
  o.push(part(G.rbox(hw * 2, yt - wy1, rL, 0.014, 2), mat, { p: [0, (wy1 + yt) / 2, zr] }));
  o.push(part(G.rbox(hw * 2, wy0 - yb, rL, 0.014, 2), mat, { p: [0, (yb + wy0) / 2, zr] }));
  o.push(part(G.rbox(0.05, wy1 - wy0 + 0.02, rL, 0.008, 2), mat, { p: [hw - 0.025, (wy0 + wy1) / 2, zr] }));
  // the wedge (closed): machined block, right end slightly proud of the ring's right face
  o.push(part(G.rbox(hw * 2 - 0.046, wy1 - wy0 - 0.004, rL - 0.012, 0.004, 2), P.bright(), { p: [-0.025 - 0.003, (wy0 + wy1) / 2, zr + 0.004] }));
  // wedge rear face details: firing-lock housing on the bore axis, extractor cam cover
  o.push(part(cylZ(0.034, z0 - 0.028, z0 + 0.01, hi ? 32 : 20, 0.004), P.bright(), { p: [0, BA, 0] }));
  o.push(part(cylZ(0.018, z0 - 0.036, z0 - 0.02, 20, 0.002), P.bore(), { p: [0, BA, 0] }));
  o.push(part(latheZ([[0.023, z0 - 0.029], [0.029, z0 - 0.029], [0.029, z0 - 0.026]], 24, 40), P.bore(), { p: [0, BA, 0] }));
  o.push(part(G.rbox(0.05, 0.03, 0.012, 0.004, 1), P.bright(), { p: [-0.09, wy0 + 0.03, z0 - 0.002] }));
  // firing-shaft lever on the wedge rear (lanyard eye to the right)
  o.push(part(G.rod([-0.01, BA - 0.02, z0 - 0.02], [-0.085, BA - 0.055, z0 - 0.03], 0.007, 8), P.bright()));
  o.push(part(G.torus(0.012, 0.004, 6, 14), P.bright(), { p: [-0.092, BA - 0.058, z0 - 0.03] }));
  // operating lever on the top: pivot boss towards the right, arm back to a vertical grip
  const top = yt;
  o.push(part(G.cyl(0.026, 0.028, 0.02, 24), mat, { p: [-0.07, top + 0.01, z0 + 0.11] }));
  o.push(part(G.rod([-0.07, top + 0.025, z0 + 0.11], [0.03, top + 0.025, z0 + 0.03], 0.012, 10, 0.009), P.bright()));
  o.push(part(G.cyl(0.013, 0.013, 0.014, 16), P.bright(), { p: [0.03, top + 0.03, z0 + 0.03] }));
  o.push(part(G.lathe([[0, 0], [0.012, 0.002], [0.014, 0.03], [0.018, 0.075], [0.016, 0.092], [0.009, 0.1], [0, 0.101]], 18, 50), P.bright(), { p: [0.03, top + 0.035, z0 + 0.03] }));
  // lubrication plug and stop on the top face
  o.push(part(G.cyl(0.011, 0.011, 0.012, 6), P.bright(), { p: [0.1, top + 0.006, z0 + 0.2] }));
  o.push(part(G.cyl(0.016, 0.018, 0.01, 20), P.bright(), { p: [-0.12, top + 0.005, z0 + 0.06] }));
  // right face: wedge guide cover plate with screws
  const rb: { p: V3; n: V3 }[] = [];
  for (const y of [wy1 + 0.02, wy0 - 0.02]) for (const z of [z0 + 0.03, z1 - 0.04]) rb.push({ p: [-hw, y, z], n: [-1, 0, 0] });
  o.push(part(G.scatter(G.boltHead(0.014, 0.005), rb), mat));
  // left face: data plate (brass) and the semi-automatic cam cover bolts
  o.push(part(G.rbox(0.003, 0.05, 0.09, 0.001, 1), P.brass(), { p: [hw + 0.0015, BA + 0.02, zr] }));
  // lug on top carrying the recuperator rear
  o.push(part(G.rbox(0.13, RY - D.recupR - yt + 0.035, 0.12, 0.01, 2), mat, { p: [0, (yt + RY - D.recupR + 0.035) / 2 - 0.004, D.recupRear + 0.08] }));
  return o;
}

function recuperator(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const seg = hi ? 44 : 26;
  const r = D.recupR, z0 = D.recupRear, z1 = D.recupFront;
  o.push(part(cylZ(r, z0, z1, seg, 0.006), P.tube(), { p: [0, RY, 0] }));
  // rear head: bolted flange
  o.push(part(latheZ([[0, z0 - 0.03], [r - 0.01, z0 - 0.03], [r + 0.008, z0 - 0.022], [r + 0.008, z0 + 0.012], [r, z0 + 0.016]], seg, 35), P.tube(), { p: [0, RY, 0] }));
  const rbolts: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.39;
    rbolts.push({ p: [Math.cos(a) * (r - 0.018), RY + Math.sin(a) * (r - 0.018), z0 - 0.03], n: [0, 0, -1] });
  }
  o.push(part(G.scatter(G.boltHead(0.014, 0.006), rbolts), P.cast()));
  // front head with two spanner holes and a filler plug
  o.push(part(latheZ([[r - 0.004, z1 - 0.01], [r + 0.006, z1 - 0.006], [r + 0.006, z1 + 0.03], [r - 0.004, z1 + 0.038], [0, z1 + 0.04]], seg, 35), P.tube(), { p: [0, RY, 0] }));
  for (const sx of [1, -1]) {
    o.push(part(cylZ(0.011, z1 + 0.032, z1 + 0.041, 16, 0.001), P.bore(), { p: [sx * 0.04, RY, 0] }));
  }
  o.push(part(G.cyl(0.012, 0.012, 0.014, 6), P.bright(), { p: [0, RY + 0.045, z1 + 0.042], r: [90, 0, 0] }));
  // filling / gauge plug on the top rear
  o.push(part(G.boltHead(0.022, 0.012), P.bright(), { p: [0, RY + r - 0.002, z0 + 0.12] }));
  return o;
}

/** Yoke band: ring round the tube + ring round the recuperator joined by a web. */
function yoke(zc: number, len: number, rTube: number, hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const seg = hi ? 48 : 28;
  const z0 = zc - len / 2, z1 = zc + len / 2;
  o.push(part(latheZ(ringProfile(rTube, rTube + 0.018, z0, z1, 0.004), seg, 35), P.tube(), { p: [0, BA, 0] }));
  o.push(part(latheZ(ringProfile(D.recupR, D.recupR + 0.016, z0, z1, 0.004), seg, 35), P.tube(), { p: [0, RY, 0] }));
  const webH = RY - D.recupR - (BA + rTube);
  o.push(part(G.rbox(0.07, webH + 0.03, len, 0.006, 1), P.tube(), { p: [0, BA + rTube + webH / 2, zc] }));
  // clamp bolts on each side of the tube ring
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(0.03, 0.03, len * 0.8, 0.005, 1), P.tube(), { p: [sx * (rTube + 0.02), BA, zc] }));
    o.push(part(G.boltHead(0.018, 0.008), P.cast(), { p: [sx * (rTube + 0.02), BA + 0.015, zc], r: [0, 0, 0] }));
  }
  return o;
}

function sleigh(hi: boolean): THREE.Object3D[] {
  // Sleigh body under the tube (buffer cylinder inside), riding on the cradle rails, with its
  // rear yoke against the breech ring; buffer rod forward to the cradle front plate.
  const o: THREE.Object3D[] = [];
  const s0 = D.breechFront, s1 = 1.42;
  const L = s1 - s0;
  const y0 = CR.top - 0.06, y1 = BA - 0.07;
  o.push(part(G.rbox(0.22, y1 - y0, L, 0.012, 2), P.tube(), { p: [0, (y0 + y1) / 2, (s0 + s1) / 2] }));
  // guide rails (bright slideways) on both sides at the cradle-rail height
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(0.024, 0.03, L - 0.04, 0.004, 1), P.tube(), { p: [sx * 0.122, CR.top + 0.017, (s0 + s1) / 2] }));
    o.push(part(G.rbox(0.004, 0.02, L - 0.1, 0.001, 1), P.bright(), { p: [sx * 0.1345, CR.top + 0.014, (s0 + s1) / 2 + 0.03] }));
  }
  // saddle under the tube along the top of the sleigh
  o.push(part(G.rbox(0.13, 0.03, L - 0.2, 0.01, 2), P.tube(), { p: [0, y1 + 0.01, (s0 + s1) / 2] }));
  // front: buffer cylinder head + piston rod to the cradle front plate, rod nut
  const by = CR.top - 0.03;
  o.push(part(cylZ(0.055, s1, s1 + 0.03, hi ? 36 : 20, 0.004), P.tube(), { p: [0, by, 0] }));
  o.push(part(cylZ(0.022, s1 + 0.03, D.cradleFront + 0.004, 20, 0.002), P.bright(), { p: [0, by, 0] }));
  // rear yoke round the tube behind the recuperator lug
  o.push(...yoke(0.07, 0.1, 0.1, hi));
  return o;
}

function cradle(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const zr = D.cradleRear, zf = D.cradleFront;
  const L = zf - zr, zc = (zr + zf) / 2;
  const mat = P.paint();
  // trough: floor + walls with top rails
  o.push(part(G.rbox(CR.hw * 2, 0.016, L, 0.005, 2), mat, { p: [0, CR.floor + 0.008, zc] }));
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(CR.wall, CR.top - CR.floor, L, 0.004, 1), mat, { p: [sx * (CR.hw - CR.wall / 2), (CR.top + CR.floor) / 2, zc] }));
    // rail cap along the top edge
    o.push(part(G.rbox(0.03, 0.016, L - 0.02, 0.004, 1), P.cast(), { p: [sx * (CR.hw - 0.012), CR.top - 0.006, zc] }));
    // lower flange (outside) and a longitudinal rib
    o.push(part(G.rbox(0.03, 0.012, L - 0.04, 0.003, 1), mat, { p: [sx * (CR.hw + 0.01), CR.floor + 0.006, zc] }));
    o.push(part(G.rbox(0.01, 0.022, L - 0.3, 0.003, 1), mat, { p: [sx * (CR.hw + 0.004), CR.floor + 0.09, zc + 0.12] }));
    // trunnion boss + pin
    o.push(part(cylX(0.064, 0, 0.034, 36, 0.006), P.cast(), { p: [sx > 0 ? CR.hw - 0.004 : -CR.hw - 0.03, 0, 0] }));
    o.push(part(cylX(0.04, 0, 0.1, 28, 0.004), P.bright(), { p: [sx > 0 ? CR.hw + 0.03 : -CR.hw - 0.13, 0, 0] }));
    // vertical stiffeners on the walls
    for (const z of [0.35, 0.75, 1.15]) o.push(part(G.rbox(0.008, CR.top - CR.floor - 0.03, 0.02, 0.002, 1), mat, { p: [sx * (CR.hw + 0.004), (CR.top + CR.floor) / 2, z] }));
  }
  // front: plate with the buffer rod nut, bearing collar round the tube, top cover strap
  o.push(part(G.rbox(CR.hw * 2 + 0.012, CR.top - CR.floor + 0.02, 0.024, 0.006, 2), P.cast(), { p: [0, (CR.top + CR.floor) / 2, zf - 0.012] }));
  o.push(part(G.boltHead(0.046, 0.022), P.cast(), { p: [0, CR.top - 0.03, zf], r: [90, 0, 0] }));
  const fb: { p: V3; n: V3 }[] = [];
  for (const sx of [1, -1]) for (const y of [CR.floor + 0.04, CR.top - 0.02]) fb.push({ p: [sx * 0.105, y, zf], n: [0, 0, 1] });
  o.push(part(G.scatter(G.boltHead(0.016, 0.006), fb), P.cast()));
  // rear cross member
  o.push(part(G.rbox(CR.hw * 2, 0.05, 0.03, 0.006, 1), P.cast(), { p: [0, CR.floor + 0.03, zr + 0.02] }));
  // cradle-lock strut (travel lock): hinge lug under the cradle front, strut folded up and latched
  o.push(part(G.rbox(0.06, 0.03, 0.06, 0.006, 1), P.cast(), { p: [0, CR.floor - 0.012, 1.02] }));
  o.push(part(G.rbox(0.05, 0.03, 0.05, 0.006, 1), P.cast(), { p: [0, CR.floor - 0.012, 0.52] }));
  o.push(part(G.rbox(0.04, 0.026, 0.5, 0.006, 1), P.paint(), { p: [0, CR.floor - 0.038, 0.77] }));
  o.push(part(cylX(0.012, -0.04, 0.04, 12, 0.002), P.bright(), { p: [0, CR.floor - 0.03, 1.02] }));
  o.push(part(G.rbox(0.06, 0.012, 0.03, 0.004, 1), P.bright(), { p: [0, CR.floor - 0.03, 0.52] }));
  // recoil indicator (brass scale + pointer) on the left wall
  o.push(part(G.rbox(0.006, 0.026, 0.3, 0.002, 1), P.brass(), { p: [CR.hw + 0.004, CR.top - 0.035, 0.18] }));
  void hi;
  return o;
}

/** Toothed elevating arc (sector plate with lightening holes) on the +X side. */
function elevatingArc(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const { r, a0, a1 } = ARC;
  const pts: V2[] = [];
  // side-view outline in (z, y): hub round the trunnion, toothed rim a0..a1
  const nT = hi ? 34 : 20;
  for (let i = 0; i <= nT * 2; i++) {
    const a = THREE.MathUtils.degToRad(a1 - ((a1 - a0) * i) / (nT * 2));
    const rr = i % 2 === 0 ? r : r + 0.011;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  // back to the hub (radius 0.07) along the a0 edge, round the hub, down the a1 edge
  for (let i = 0; i <= 8; i++) {
    const a = THREE.MathUtils.degToRad(a0 - (i / 8) * (360 - (a1 - a0)));
    pts.push([Math.cos(a) * 0.07, Math.sin(a) * 0.07]);
  }
  const holes: V2[][] = [];
  for (const [aa, rr, hr] of [[185, 0.17, 0.03], [232, 0.17, 0.03], [212, 0.11, 0.022]] as [number, number, number][]) {
    const a = THREE.MathUtils.degToRad(aa);
    holes.push(circlePts(Math.cos(a) * rr, Math.sin(a) * rr, hr, 20).reverse());
  }
  const sh = G.shape(pts.reverse(), 0, []);
  for (const h of holes) {
    const p = new THREE.Path();
    p.moveTo(h[0][0], h[0][1]);
    for (let i = 1; i < h.length; i++) p.lineTo(h[i][0], h[i][1]);
    p.closePath();
    sh.holes.push(p);
  }
  const g = G.extrude(sh, ARC.t, 0.002, 8, 1);
  // extrude is in XY (x = z-side, y = y) with depth along Z: map to the zy side view
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  G.flipWinding(g);
  o.push(part(g, P.cast(), { p: [ARC.x, 0, 0] }));
  // rim flange (stiffening lip along the teeth root) and the spacer to the cradle wall
  const lip: V2[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = THREE.MathUtils.degToRad(a0 + ((a1 - a0) * i) / 24);
    lip.push([Math.cos(a) * (r - 0.004), Math.sin(a) * (r - 0.004)]);
  }
  o.push(part(G.tube(lip.map(([z, y]) => [ARC.x - 0.016, y, z] as V3), 0.007, 6, 40), P.cast()));
  // hub bolts round the trunnion boss
  const hb: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    hb.push({ p: [ARC.x + ARC.t / 2, Math.sin(a) * 0.052, Math.cos(a) * 0.052], n: [1, 0, 0] });
  }
  o.push(part(G.scatter(G.boltHead(0.013, 0.006), hb), P.cast()));
  // stop lug at the lower end of the teeth
  const as = THREE.MathUtils.degToRad(a1 + 3);
  o.push(part(G.rbox(0.03, 0.03, 0.03, 0.005, 1), P.cast(), { p: [ARC.x, Math.sin(as) * (r - 0.01), Math.cos(as) * (r - 0.01)] }));
  return o;
}

function elbowTelescope(): THREE.Object3D[] {
  // Elbow telescope (direct fire) on a bracket from the left cradle wall, objective just behind
  // the sight slot in the left main shield, eyepiece elbow turned out to the gunner.
  const o: THREE.Object3D[] = [];
  const { x, y, s0, s1 } = ELBOW;
  // bracket: cast arm from the cradle wall out over the trunnion bearing
  o.push(part(G.rbox(x - CR.hw - 0.02, 0.03, 0.08, 0.008, 2), P.cast(), { p: [(x + CR.hw) / 2 + 0.005, y - 0.045, 0.1] }));
  o.push(part(G.plate([[0.04, 0], [0.16, 0], [0.14, 0.06], [0.06, 0.06]], 0.018, 'zy', 0.004), P.cast(), { p: [CR.hw + 0.009, y - 0.105, 0] }));
  o.push(part(G.rbox(0.05, 0.045, 0.1, 0.008, 2), P.cast(), { p: [x, y - 0.035, 0.1] }));
  // telescope tube (black enamel), objective hood, eyepiece elbow
  o.push(part(cylZ(0.022, s0 + 0.04, s1 - 0.04, 28, 0.003), P.optic(), { p: [x, y, 0] }));
  o.push(part(latheZ([[0.022, s1 - 0.045], [0.028, s1 - 0.04], [0.028, s1], [0.024, s1], [0.024, s1 - 0.03], [0.018, s1 - 0.03]], 28, 40), P.optic(), { p: [x, y, 0] }));
  o.push(part(cylZ(0.019, s1 - 0.031, s1 - 0.029, 20, 0.0005), P.glass(), { p: [x, y, 0] }));
  o.push(part(G.rbox(0.05, 0.05, 0.05, 0.008, 2), P.optic(), { p: [x, y, s0 + 0.035] }));
  o.push(part(cylX(0.016, x + 0.02, x + 0.1, 24, 0.002), P.optic(), { p: [0, y, s0 + 0.035] }));
  o.push(part(latheX([[0.016, 0], [0.022, 0], [0.022, 0.03], [0.017, 0.03]], 24, 40), P.rubber(), { p: [x + 0.1, y, s0 + 0.035] }));
  o.push(part(cylX(0.012, x + 0.121, x + 0.123, 18, 0.0005), P.glass(), { p: [0, y, s0 + 0.035] }));
  // clamp bands with knurled knobs
  for (const z of [0.02, 0.2]) {
    o.push(part(latheZ(ringProfile(0.022, 0.028, z - 0.012, z + 0.012, 0.002), 24, 40), P.optic(), { p: [x, y, 0] }));
    o.push(part(G.cyl(0.009, 0.009, 0.02, 12), P.bright(), { p: [x + 0.036, y, z], r: [0, 0, 90] }));
  }
  return o;
}

export interface GunOpts {
  detail: 'high' | 'low';
}

/** Elevating mass in the cradle-local frame. */
export function buildElevatingMass(opts: GunOpts): THREE.Group {
  const hi = opts.detail === 'high';
  const arcs = group(elevatingArc(hi));
  const arcR = group([arcs.clone(true)]);
  arcR.scale.x = -1;
  const parts: THREE.Object3D[] = [
    ...tube(hi),
    ...breechRing(hi),
    ...recuperator(hi),
    ...yoke(0.64, 0.09, 0.093, hi),
    ...yoke(1.36, 0.1, 0.084, hi),
    ...sleigh(hi),
    ...cradle(hi),
    arcs,
    arcR,
    // cross tube tying the arcs together, with the centre lug for the equilibrator link
    part(cylX(0.022, -ARC.x + 0.01, ARC.x - 0.01, 24, 0.003), P.cast(), { p: [0, EQ_PIN[1], EQ_PIN[0]] }),
    part(G.rbox(0.05, 0.07, 0.05, 0.008, 1), P.cast(), { p: [0, EQ_PIN[1] - 0.025, EQ_PIN[0]] }),
    part(cylX(0.011, -0.04, 0.04, 12, 0.002), P.bright(), { p: [0, EQ_PIN[1] - 0.045, EQ_PIN[0]] }),
    ...elbowTelescope(),
  ];
  return group(parts, { name: 'elevating-mass' });
}
