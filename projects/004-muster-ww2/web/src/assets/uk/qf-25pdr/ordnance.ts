/**
 * Ordnance QF 25-pr Mk II as fitted from 1942: monobloc barrel (28 calibres) with the screwed-on
 * double-baffle muzzle brake, the counterbalance weight clamped on just in front of the breech
 * ring, and the breech ring with its vertical sliding block (shown closed), breech mechanism
 * lever on the right, firing mechanism housing and the lug that carries the recoil rods.
 *
 * Trunnion frame (see dims.ts): origin on the trunnion axis, +Z along the bore, bore axis at
 * y = D.boreAbove, +X the gun's left.
 */
import { THREE, G, part } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { latheZ, ringProfile, cylX, cylZ, type V2, type V3 } from './util';

const BY = D.boreAbove;
/** Bore radius (87.6 mm calibre). */
export const BORE_R = 0.0438;

/** Barrel outer radius at station z (T frame), forward of the counterweight. */
export function barrelR(z: number): number {
  const k: V2[] = [
    [D.cwFront, 0.1],
    [0.0, 0.0975],
    [0.7, 0.0865],
    [1.3, 0.077],
    [D.brakeRear, 0.0735],
  ];
  if (z <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (z <= k[i][0]) {
      const t = (z - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
      return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * t;
    }
  }
  return k[k.length - 1][1];
}

function barrel(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const seg = hi ? 64 : 32;
  const zM = D.muzzle;
  const prof: V2[] = [
    [0, D.ringFront - 0.2],
    [0.104, D.ringFront - 0.2],
    [0.104, D.cwFront - 0.01],
    [barrelR(D.cwFront), D.cwFront],
  ];
  for (const z of [0.0, 0.35, 0.7, 1.0, 1.3, D.brakeRear - 0.02]) prof.push([barrelR(z), z]);
  // thread shoulder under the brake, then the muzzle face and the hollow bore
  prof.push([0.0735, D.brakeRear - 0.004], [0.071, D.brakeRear], [0.071, zM - 0.003], [0.068, zM]);
  prof.push([BORE_R + 0.004, zM], [BORE_R, zM - 0.004], [BORE_R, zM - 0.32], [0, zM - 0.32]);
  o.push(part(latheZ(prof, seg, 30), P.barrel(), { p: [0, BY, 0] }));
  // dark bore liner inside the visible muzzle end
  o.push(part(latheZ([[BORE_R - 0.0005, zM - 0.003], [BORE_R - 0.0005, zM - 0.318], [0, zM - 0.318]], seg, 40), P.bore(), { p: [0, BY, 0] }));
  if (hi) {
    // rifling lands (34 grooves) just inside the muzzle
    const lands: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 34; i++) {
      const g = G.rbox(0.0036, 0.0016, 0.3, 0.0005, 1);
      g.translate(0, BORE_R - 0.0012, 0);
      g.rotateZ((i / 34) * Math.PI * 2);
      g.translate(0, 0, zM - 0.16);
      lands.push(g.index ? g.toNonIndexed() : g);
    }
    o.push(part(G.mergeGeometries(lands)!, P.bore(), { p: [0, BY, 0] }));
  }
  return o;
}

function counterweight(hi: boolean): THREE.Object3D[] {
  // Heavy steel collar clamped round the barrel in front of the breech ring (balances the
  // weight of the muzzle brake on the trunnions). Split clamp lugs on top.
  const o: THREE.Object3D[] = [];
  const seg = hi ? 64 : 32;
  const z0 = D.cwRear, z1 = D.cwFront;
  const R = 0.128;
  o.push(
    part(
      latheZ([[0.103, z0], [R - 0.006, z0], [R, z0 + 0.006], [R, z1 - 0.022], [R - 0.012, z1 - 0.004], [0.106, z1], [0.1, z1]], seg, 35),
      P.barrel(),
      { p: [0, BY, 0] },
    ),
  );
  // shallow grooves (split line) round the collar
  o.push(part(G.torus(R + 0.0005, 0.0022, 6, seg), P.bore(), { p: [0, BY, (z0 + z1) / 2 - 0.02] }));
  // clamp lugs and two clamp bolts across the split on top
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(0.03, 0.03, 0.12, 0.006, 2), P.barrel(), { p: [sx * 0.022, BY + R - 0.004, (z0 + z1) / 2 - 0.005] }));
  }
  for (const z of [(z0 + z1) / 2 - 0.045, (z0 + z1) / 2 + 0.035]) {
    o.push(part(cylX(0.009, -0.052, 0.052, 12, 0.002), P.bright(), { p: [0, BY + R + 0.002, z] }));
    o.push(part(G.boltHead(0.02, 0.01), P.block(), { p: [0.037, BY + R + 0.002, z], r: [0, 0, -90] }));
  }
  return o;
}

function muzzleBrake(hi: boolean): THREE.Object3D[] {
  // Double-baffle brake: threaded rear body, two chambers with a large side port each side,
  // middle baffle and front baffle. Solid top and bottom webs between the ports.
  const o: THREE.Object3D[] = [];
  const seg = hi ? 56 : 30;
  const mat = P.scorched();
  const ro = 0.1, ri = 0.084, rb = 0.052; // outer, chamber, baffle passage
  const z0 = D.brakeRear;
  const zc = [z0, D.muzzle, 1.765, 1.795, 1.878, D.brakeFront];
  // rear body screwed over the muzzle; its front face forms the chamber floor ring
  o.push(
    part(
      latheZ([[0.0712, zc[0]], [ro - 0.008, zc[0]], [ro, zc[0] + 0.008], [ro, zc[1]], [ri, zc[1]], [0.0712, zc[1] - 0.003], [0.0712, zc[0]]], seg, 35),
      mat,
      { p: [0, BY, 0] },
    ),
  );
  // spanner flats ring on the rear body
  o.push(part(G.torus(ro, 0.0025, 6, seg), mat, { p: [0, BY, zc[0] + 0.03] }));
  // middle baffle and front baffle
  o.push(part(latheZ(ringProfile(rb, ro, zc[2], zc[3], 0.003), seg, 35), mat, { p: [0, BY, 0] }));
  o.push(part(latheZ([[rb, zc[4]], [ro, zc[4]], [ro, zc[5] - 0.008], [ro - 0.008, zc[5]], [rb + 0.006, zc[5]], [rb, zc[5] - 0.006], [rb, zc[4]]], seg, 35), mat, { p: [0, BY, 0] }));
  // sooty baffle faces inside the chambers
  for (const z of [zc[2] - 0.0006, zc[4] - 0.0006]) {
    o.push(part(latheZ([[ri - 0.001, z], [rb + 0.001, z]], seg, 40), P.bore(), { p: [0, BY, 0] }));
  }
  // chamber walls: solid webs top and bottom (deg from +X towards +Y), ports on both sides
  const webs: [number, number][] = [
    [42, 138],
    [222, 318],
  ];
  for (const [a, b] of [
    [zc[1], zc[2]],
    [zc[3], zc[4]],
  ]) {
    for (const [s0, s1] of webs) {
      const nSeg = Math.max(4, Math.round(((s1 - s0) / 360) * seg * 1.4));
      o.push(part(latheZ(ringProfile(ri, ro, a, b, 0.0025), nSeg, 35, s0, s1), mat, { p: [0, BY, 0] }));
      // close the cut faces of the web (port side walls)
      for (const s of [s0, s1]) {
        const r = THREE.MathUtils.degToRad(s);
        const g = G.rbox(ro - ri, 0.004, b - a, 0.0012, 1);
        g.rotateZ(r);
        const off = s === s0 ? 0.002 : -0.002;
        const rr = (ro + ri) / 2;
        const t = new THREE.Vector2(-Math.sin(r), Math.cos(r)).multiplyScalar(off);
        o.push(part(g, mat, { p: [Math.cos(r) * rr + t.x, BY + Math.sin(r) * rr + t.y, (a + b) / 2] }));
      }
    }
  }
  return o;
}

function breechRing(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const z0 = D.ringRear, z1 = D.ringFront;
  const L = z1 - z0, zc = (z0 + z1) / 2;
  const W = 0.29, H = 0.31;
  const cy = BY - 0.018;
  const yb = cy - H / 2, yt = cy + H / 2;
  // ring body: rounded block, the top more generously rounded round the chamber
  const sec: V2[] = [
    [-W / 2 + 0.02, yb],
    [W / 2 - 0.02, yb],
    [W / 2, yb + 0.02],
    [W / 2, yt - 0.07],
    [W / 2 - 0.035, yt - 0.018],
    [W / 2 - 0.075, yt],
    [-W / 2 + 0.075, yt],
    [-W / 2 + 0.035, yt - 0.018],
    [-W / 2, yt - 0.07],
    [-W / 2, yb + 0.02],
  ];
  const ringG = G.extrude(G.shape(sec, 0.012), L, 0.008, 8, 2);
  o.push(part(ringG, P.barrel(), { p: [0, 0, zc] }));
  // vertical sliding block (closed): its rear face and the slot seams show on the rear of the ring,
  // the bottom of the block stands a little below the ring
  const bw = 0.15, bh = 0.25;
  const byc = cy - 0.03;
  o.push(part(G.rbox(bw, bh, 0.1, 0.006, 2), P.block(), { p: [0, byc, z0 + 0.046] }));
  o.push(part(G.rbox(bw + 0.012, 0.03, 0.2, 0.006, 1), P.block(), { p: [0, yb - 0.008, z0 + 0.1] }));
  // seam shadow round the block on the rear face
  o.push(part(G.rbox(bw + 0.008, bh + 0.008, 0.002, 0.001, 1), P.bore(), { p: [0, byc, z0 - 0.0015] }));
  // chamber mouth marking and block rear details: firing mechanism housing, cocking indicator
  o.push(part(cylZ(0.03, z0 - 0.022, z0 - 0.004, 24, 0.003), P.block(), { p: [0, BY, 0] }));
  o.push(part(cylZ(0.012, z0 - 0.03, z0 - 0.02, 16, 0.002), P.bright(), { p: [0, BY, 0] }));
  o.push(part(G.rbox(0.05, 0.035, 0.02, 0.005, 1), P.block(), { p: [0.035, byc - 0.075, z0 - 0.008] }));
  // bolts on the rear face of the ring
  const b: { p: V3; n: V3 }[] = [];
  for (const sx of [1, -1]) for (const y of [yt - 0.06, yb + 0.05]) b.push({ p: [sx * (W / 2 - 0.035), y, z0], n: [0, 0, -1] });
  o.push(part(G.scatter(G.boltHead(0.018, 0.007), b), P.barrel()));
  // --- breech mechanism lever on the right (-X): boss, shaft, lever arm down and back, handle
  const bx = -W / 2;
  const by = cy + 0.045, bz = z0 + 0.12;
  o.push(part(cylX(0.036, bx - 0.028, bx + 0.002, 28, 0.004), P.barrel(), { p: [0, by, bz] }));
  o.push(part(cylX(0.016, bx - 0.05, bx - 0.02, 16, 0.002), P.bright(), { p: [0, by, bz] }));
  const a0: V3 = [bx - 0.045, by, bz];
  const a1: V3 = [bx - 0.045, by - 0.2, bz - 0.2];
  o.push(part(G.rod(a0, a1, 0.016, 12, 0.012), P.block()));
  o.push(part(G.rbox(0.03, 0.06, 0.08, 0.01, 2), P.block(), { p: [a0[0], a0[1] - 0.012, a0[2] - 0.015], r: [45, 0, 0] }));
  o.push(part(cylX(0.016, 0, 0.11, 16, 0.004), P.bright(), { p: [a1[0] - 0.105, a1[1], a1[2]] }));
  o.push(part(new THREE.SphereGeometry(0.019, 16, 10), P.bright(), { p: [a1[0] - 0.1, a1[1], a1[2]] }));
  // lever catch plate on the ring side
  o.push(part(G.plate([[z0 + 0.02, cy - 0.12], [z0 + 0.1, cy - 0.12], [z0 + 0.1, cy - 0.06], [z0 + 0.02, cy - 0.08]], 0.01, 'zy', 0.003), P.barrel(), { p: [bx - 0.004, 0, 0] }));
  // --- firing lever bracket on the left side of the ring (connects to the layer's firing gear)
  o.push(part(G.rbox(0.02, 0.06, 0.1, 0.005, 1), P.barrel(), { p: [W / 2 + 0.01, cy - 0.04, z0 + 0.1] }));
  o.push(part(cylX(0.012, W / 2 + 0.02, W / 2 + 0.05, 14, 0.002), P.bright(), { p: [0, cy - 0.04, z0 + 0.1] }));
  // --- lug under the front of the ring carrying the buffer and recuperator rods
  const lugZ0 = z1 - 0.085;
  o.push(part(G.rbox(0.13, 0.13, z1 - lugZ0, 0.012, 2), P.barrel(), { p: [0, yb - 0.055, (lugZ0 + z1) / 2] }));
  for (const [y, r] of RODS) {
    o.push(part(G.boltHead(r * 2.6, 0.018), P.block(), { p: [0, y, z1], r: [90, 0, 0] }));
  }
  // guide claws riding on the cradle slides (both sides)
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(0.03, 0.03, L - 0.06, 0.006, 1), P.barrel(), { p: [sx * 0.112, yb + 0.012, zc + 0.02] }));
  }
  void hi;
  return o;
}

/** Recoil rod centre heights (T frame, x = 0) and radii: buffer (upper), recuperator (lower). */
export const RODS: [number, number][] = [
  [-0.055, 0.018],
  [-0.155, 0.022],
];

export function buildOrdnance(hi: boolean): THREE.Object3D[] {
  return [...barrel(hi), ...counterweight(hi), ...muzzleBrake(hi), ...breechRing(hi)];
}
