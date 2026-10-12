/**
 * Haversack, W.E. Patt. '37 (the "small pack") as worn on the back in battle order: a
 * rectangular web bag about 11 x 9 1/2 x 4 in. (0.28 x 0.24 x 0.10 m), filled (mess tin, washing
 * kit, rations, a groundsheet folded against the back), its flap over the top and half-way down
 * the front, closed by two 1-in. straps with brass tips through open brass buckles on chapes sewn
 * to the front. On the back (body side) two short straps near the top corners carry loose brass
 * buckles for the shoulder arms of the L-straps; two small buckles on chapes under the base take
 * the under-arm arms.
 *
 * Gear frame (mount 'back'): +Z away from the body, +Y up, the back face (and the straps on it)
 * on z >= 0, ORIGIN = centre of the back face. With the gear frame turned 180 deg for the back,
 * +X is the wearer's RIGHT. strapAnchors = [top buckle +X, top buckle -X, base buckle +X, base
 * buckle -X] (the bar the L-strap arm is threaded round).
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { SDF } from '../../../core/geo/sdf';
import type { GearPiece } from '../../shared/contracts';
import { UK } from './palette';
import { slab, roundRect2D, projectedBox, drape, roundedEnd, snoise, clamp01, sstep, projectTo, normalAt } from './soft';
import { stitches, gateBuckle, brassTip, placeOn, merge, boxX, frameAt } from './helpers';

export const HAVERSACK37 = { w: 0.28, h: 0.245, d: 0.1, flapDrop: 0.125 };

const WT = 0.0019;
const Z0 = 0.004; // back panel (the back straps and chapes lie on z = 0..Z0)

export function buildHaversack37(): GearPiece {
  const { w: W, h: H, d: D, flapDrop } = HAVERSACK37;
  const hw = W / 2, hh = H / 2;
  const web = UK.web(), strapMat = UK.webStrap(), thread = UK.thread(), brass = UK.brass();
  const parts: THREE.Object3D[] = [];

  // ---- the filled bag ----
  const outline = roundRect2D(0, 0, hw, hh, { tl: 0.012, tr: 0.012, bl: 0.02, br: 0.02 });
  const zF = (x: number, y: number) => {
    const u = clamp01(Math.abs(x) / hw), v = clamp01(Math.abs(y) / hh);
    const fill = Math.pow(Math.max(0, 1 - u ** 4), 0.5) * Math.pow(Math.max(0, 1 - v ** 4), 0.35);
    return Z0 + D * (0.82 + 0.18 * fill) + 0.0025 * snoise(x * 9, y * 9, 0, 41);
  };
  const base = slab(outline, Z0, zF, 0.024, 0.007);
  const body: SDF = (x, y, z) => base(x, y, z) + 0.0005 * snoise(x * 30, y * 30, z * 30, 17) + 0.00025 * snoise(x * 90, y * 90, z * 90, 8);
  parts.push(part(projectedBox(body, { centre: [0, 0, Z0 + D * 0.45], half: [hw, hh, D * 0.5 + 0.002], n: [22, 20, 10], edge: 0.6 }), web, { name: 'haversack' }));
  const on = (x: number, y: number, z: number, lift = 0.00025) => projectTo(body, new THREE.Vector3(x, y, z), lift, 16);
  const nAt = (p: THREE.Vector3) => normalAt(body, p);

  const st: THREE.BufferGeometry[] = [];
  const row = (a: [number, number, number], b: [number, number, number], n = 40, lift = 0.00025) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(on(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, lift));
    }
    st.push(stitches(pts, { len: 0.0034, gap: 0.002, r: 0.0005 }));
  };
  // gusset seams: rows round the front and back panel edges (on the sides and bottom)
  for (const s of [1, -1]) {
    row([s * (hw + 0.003), -hh + 0.02, Z0 + D * 0.8 - 0.006], [s * (hw + 0.003), hh - 0.03, Z0 + D * 0.8 - 0.006]);
    row([s * (hw + 0.003), -hh + 0.02, Z0 + 0.006], [s * (hw + 0.003), hh - 0.015, Z0 + 0.006]);
  }
  row([-hw + 0.03, -hh - 0.003, Z0 + D * 0.78 - 0.006], [hw - 0.03, -hh - 0.003, Z0 + D * 0.78 - 0.006]);
  row([-hw + 0.03, -hh - 0.003, Z0 + 0.006], [hw - 0.03, -hh - 0.003, Z0 + 0.006]);

  // ---- flap: from the back top edge over the top and half-way down the front ----
  const zTop = zF(0, hh - 0.02);
  const flap = drape(body, {
    path: [
      [hh + 0.0006, Z0 + 0.005],
      [hh + 0.003, Z0 + D * 0.4],
      [hh - 0.004, zTop - 0.004],
      [hh - 0.025, zTop + 0.002],
      [hh - flapDrop * 0.6, zF(0, hh - flapDrop * 0.6) + 0.002],
      [hh - flapDrop, zF(0, hh - flapDrop) + 0.002],
    ],
    halfWidth: roundedEnd(hw + 0.006, 0.026),
    gap: 0.0008,
    t: 0.003,
    nu: 20,
    nv: 32,
    // soft webbing: faint sag between the closure straps, the free edge standing off a little
    lift: (u, s, L) => 0.0024 * sstep(L - 0.06, L, s) + 0.0009 * Math.sin(Math.PI * clamp01(s / L)) * Math.cos(u * Math.PI * 1.5) ** 2,
  });
  parts.push(part(flap.geometry, web, { name: 'flap' }));
  {
    // bound edge: stitch row 4 mm in round the free edge and down both sides
    const sSide = flap.sAtY(hh - 0.01);
    const hx = hw + 0.006 - 0.0045;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) pts.push(flap.at(-hx, sSide + ((flap.L - 0.026 - sSide) * i) / 14, 0.0002));
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      const rc = 0.026 - 0.0045;
      pts.push(flap.at(-hx + rc - Math.cos(a) * rc, flap.L - 0.026 + Math.sin(a) * rc, 0.0002));
    }
    for (let i = 1; i < 24; i++) pts.push(flap.at(-hx + 0.0215 + ((2 * hx - 0.043) * i) / 24, flap.L - 0.0045, 0.0002));
    for (let i = 8; i >= 0; i--) {
      const a = (i / 8) * (Math.PI / 2);
      const rc = 0.026 - 0.0045;
      pts.push(flap.at(hx - rc + Math.cos(a) * rc, flap.L - 0.026 + Math.sin(a) * rc, 0.0002));
    }
    for (let i = 14; i >= 0; i--) pts.push(flap.at(hx, sSide + ((flap.L - 0.026 - sSide) * i) / 14, 0.0002));
    st.push(stitches(pts, { len: 0.0034, gap: 0.002, r: 0.0005 }));
    const hp: THREE.Vector3[] = [];
    for (let i = 0; i <= 30; i++) hp.push(flap.at(-hx + (2 * hx * i) / 30, 0.008, 0.0002));
    st.push(stitches(hp, { len: 0.0034, gap: 0.002, r: 0.0005 }));
  }

  // ---- closure straps (sewn on the flap) through buckles on chapes on the front ----
  const webG: THREE.BufferGeometry[] = [];
  const brassG: THREE.BufferGeometry[] = [];
  const SW = 0.025;
  const yFlapEdge = flap.at(0, flap.L, 0).y;
  const yBk = yFlapEdge - 0.034;
  for (const x of [-0.074, 0.074]) {
    // chape from below up to the buckle's lower bar
    const cp: THREE.Vector3[] = [], cn: THREE.Vector3[] = [];
    for (const y of [yBk - 0.042, yBk - 0.02, yBk - 0.0095]) {
      const p = on(x, y, zF(x, y), WT / 2 + 0.0003);
      cp.push(p);
      cn.push(nAt(p));
    }
    webG.push(G.strap(cp, SW, WT, cn, { samples: 10 }));
    st.push(placeOn(boxX(0, 0, 0.018, 0.018, 0), on(x, yBk - 0.03, zF(x, yBk - 0.03), WT + 0.0003), nAt(on(x, yBk - 0.03, zF(x, yBk - 0.03))), new THREE.Vector3(0, 1, 0)));
    // the strap: sewn on the flap, down over the flap edge, through the buckle, tip below
    const sp: THREE.Vector3[] = [], sn: THREE.Vector3[] = [];
    const s0 = flap.sAtY(hh - 0.035);
    for (let i = 0; i <= 8; i++) {
      const s = s0 + ((flap.L - 0.003 - s0) * i) / 8;
      const p = flap.at(x, s, WT / 2 + 0.0003);
      sp.push(p);
      sn.push(flap.at(x, s, 0.001).sub(flap.at(x, s, 0)).normalize());
    }
    for (const [y, lift] of [
      [yFlapEdge - 0.008, 0.0035],
      [yBk + 0.006, WT * 1.6],
      [yBk - 0.006, WT * 1.6],
      [yBk - 0.02, WT * 1.5],
      [yBk - 0.036, WT * 1.4],
    ] as [number, number][]) {
      const p = on(x, y, zF(x, y), lift + WT / 2);
      sp.push(p);
      sn.push(nAt(p));
    }
    webG.push(G.strap(sp, SW, WT, sn, { samples: 70 }));
    const L = new THREE.CatmullRomCurve3(sp, false, 'centripetal').getLength();
    const fe = frameAt(sp, sn, L);
    const tip = brassTip(SW, WT, 0.016);
    const out = fe.t.clone();
    brassG.push(placeOn(tip.plate, fe.p.clone().addScaledVector(out, 0.0005), fe.n, out), placeOn(tip.rivets, fe.p.clone().addScaledVector(out, 0.0005), fe.n, out));
    // box stitch fixing the strap to the flap
    const fs = flap.at(x, s0 + 0.018, WT + 0.0004);
    st.push(placeOn(boxX(0, 0, 0.019, 0.022, 0), fs, flap.at(x, s0 + 0.018, 0.001).sub(flap.at(x, s0 + 0.018, 0)).normalize(), new THREE.Vector3(0, 1, 0)));
    // buckle over the strap
    const bp = on(x, yBk, zF(x, yBk), WT * 3 + 0.0012);
    brassG.push(placeOn(gateBuckle(0.031, 0.021), bp, nAt(bp), new THREE.Vector3(0, 1, 0)));
  }

  // ---- back: loose buckles on short straps near the top corners ----
  const anchors: THREE.Vector3[] = [];
  const zb = Z0 - WT / 2 - 0.0003; // chape centre (on the back face)
  for (const s of [1, -1]) {
    const x = s * (hw - 0.032);
    const barY = hh + 0.004;
    const rw = 0.0008 + WT / 2 + 0.0002;
    const pts: THREE.Vector3[] = [new THREE.Vector3(x, hh - 0.075, zb), new THREE.Vector3(x, hh - 0.03, zb), new THREE.Vector3(x, barY - 0.004, zb)];
    const nrm: THREE.Vector3[] = [new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -1)];
    const bz = zb - WT / 2 - 0.0009 + rw; // buckle bar centre z (just clear of the back plane)
    for (let k = 0; k <= 6; k++) {
      const a = -Math.PI / 2 + (k / 6) * Math.PI;
      pts.push(new THREE.Vector3(x, barY + Math.cos(a) * rw, bz + Math.sin(-a) * rw));
      nrm.push(new THREE.Vector3(0, Math.cos(a), -Math.sin(a)));
    }
    void bz;
    webG.push(G.strap(pts.slice(0, 3), SW, WT, nrm.slice(0, 3), { samples: 8 }));
    // buckle lying in the back plane just above the top edge (frame axis along Y)
    const bk = gateBuckle(0.031, 0.021);
    bk.rotateZ(Math.PI);
    const bc = new THREE.Vector3(x, barY + 0.0085, Z0 * 0.5);
    brassG.push(bk.translate(bc.x, bc.y, bc.z));
    // chape end folded round the buckle's lower bar
    webG.push(G.strap([new THREE.Vector3(x, barY - 0.004, zb), new THREE.Vector3(x, barY - 0.0005, zb + 0.0004), new THREE.Vector3(x, barY + 0.0022, Z0 * 0.5), new THREE.Vector3(x, barY - 0.0005, Z0 - WT * 0.1), new THREE.Vector3(x, barY - 0.004, Z0 - 0.0001)], SW, WT * 0.9, [0, 0, -1], { samples: 12 }));
    st.push(placeOn(boxX(0, 0, 0.018, 0.022, 0), new THREE.Vector3(x, hh - 0.055, zb - WT / 2 - 0.0003), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)));
    anchors.push(new THREE.Vector3(x, barY + 0.0085, Z0 * 0.5));
  }
  // ---- base: two small buckles on chapes under the bag, near the back edge ----
  for (const s of [1, -1]) {
    const x0 = s * (hw - 0.07), x1 = s * (hw - 0.03);
    const zc = Z0 + 0.016;
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    for (const x of [x0, (x0 + x1) / 2, x1]) {
      const p = on(x, -hh - 0.01, zc, WT / 2 + 0.0003);
      pts.push(p);
      nrm.push(nAt(p));
    }
    webG.push(G.strap(pts, 0.02, WT, nrm, { samples: 10 }));
    const pb = on(x1 + s * 0.012, -hh - 0.01, zc, WT + 0.0012);
    const bk = gateBuckle(0.025, 0.017, 0.0027, 0.0014);
    brassG.push(placeOn(bk, pb, nAt(pb), new THREE.Vector3(s, 0, 0)));
    const ps = on((x0 + x1) / 2, -hh - 0.01, zc, WT + 0.0003);
    st.push(placeOn(boxX(0, 0, 0.016, 0.014, 0), ps, nAt(ps), new THREE.Vector3(s, 0, 0)));
    anchors.push(pb.clone().addScaledVector(new THREE.Vector3(s, 0, 0), 0.0075));
  }

  parts.push(part(merge(webG), strapMat));
  parts.push(part(merge(brassG), brass, { name: 'brass' }));
  parts.push(part(merge(st), thread));
  const object = group(parts);
  object.name = 'uk-haversack-37';
  const size = new THREE.Box3().setFromObject(object, true).getSize(new THREE.Vector3());
  return {
    id: 'uk-haversack-37',
    name: 'Haversack (small pack), Patt. 37',
    object,
    mount: 'back',
    size: { w: size.x, h: size.y, d: size.z },
    strapAnchors: anchors,
  };
}
