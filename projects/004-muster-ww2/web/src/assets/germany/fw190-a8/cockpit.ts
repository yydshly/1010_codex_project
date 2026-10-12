/**
 * Fw 190 A-8 cockpit and canopy (BODY frame).
 *
 * Canopy: framed windscreen with the flat 50 mm armoured-glass front panel and curved quarter
 * panels, then the standard flat-topped sliding hood of the A-8 (the bulged "blown" hood only
 * appeared on the line in the last production batches) - one moulded transparency on a metal sill
 * frame, ending in a sheet-metal rear fairing that carries the antenna mast. The pilot's head
 * armour is fixed inside the hood behind the seat. Interior: RLM 66 tub, instrument panel with a
 * Revi 16B reflector sight on the coaming, seat with back armour, control column.
 */
import * as THREE from 'three';
import { part, group } from '../../../core/kit';
import { bar, polyGeo, gridGeo, lerp, curve, roundedBox, cylAB } from './geom';
import { B, CK, fuseX, fuseYTop, openingHalfWidth } from './frame';
import { P } from './paint';
import { finTop } from './tail';

const V3 = THREE.Vector3;

/** Hood crown height along s (arch -> rear fairing end). */
const crownAt = curve([
  [3.41, 0.9], [3.6, 0.924], [3.8, 0.934], [4.05, 0.935], [4.3, 0.918], [4.55, 0.86], [4.75, 0.78], [4.9, 0.7], [5.0, 0.645],
]);
/** Side (sill) half width of the hood. */
const sillX = (s: number) => Math.max(0.2, openingHalfWidth(Math.min(CK.sH1 - 0.001, Math.max(CK.sA, s)))) + 0.006;
const GLASS_END = 4.62;
const NH = 14;

/** Port half of the hood arch (sill -> crown) as [x, y]. */
function halfArch(s: number, grow = 0): [number, number][] {
  const xo = sillX(s) + grow, y0 = CK.sillY, crown = crownAt(s) + grow;
  const pts: [number, number][] = [];
  const ex = 2.9;
  for (let i = 0; i <= NH; i++) {
    const f = (i / NH) * (Math.PI / 2);
    const c = Math.cos(f), sn = Math.sin(f);
    // slight tumblehome: the sides lean in a little above the sill
    const xx = xo * Math.pow(c, 2 / ex) * (1 - 0.04 * sn);
    pts.push([xx, y0 + (crown - y0) * Math.pow(sn, 2 / ex)]);
  }
  return pts;
}
/** Full arch at station s (port sill -> crown -> starboard sill). */
function arch(s: number, grow = 0): THREE.Vector3[] {
  const h = halfArch(s, grow);
  const port = h.map(([x, y]) => B(x, y, s));
  const star = h.slice(0, -1).reverse().map(([x, y]) => B(-x, y, s));
  return [...port, ...star];
}

/** Frame chain of bars along a polyline, pushed outward from the canopy axis. */
function chain(pts: THREE.Vector3[], w: number, h: number, cy = 0.6, mat = P.frame(), ext = 0.006): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const m = pts[k].clone().add(pts[k + 1]).multiplyScalar(0.5);
    const o = new V3(m.x, Math.max(0.05, m.y - cy), 0).normalize();
    out.push(part(bar(pts[k].clone().addScaledVector(o, 0.003), pts[k + 1].clone().addScaledVector(o, 0.003), w, h, o, ext, 0.004), mat));
  }
  return out;
}

// ------------------------------------------------------------- windscreen
const FB = (sx: number) => B(sx * 0.17, fuseYTop(CK.sW, 0.17) + 0.002, CK.sW);
const FT = (sx: number) => B(sx * 0.14, 0.884, CK.sA - 0.03);

function windscreen(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const glass = P.armourGlass();
  const fbL = FB(1), fbR = FB(-1), ftL = FT(1), ftR = FT(-1);
  const nrm = new V3().crossVectors(fbR.clone().sub(fbL), ftL.clone().sub(fbL)).normalize();
  if (nrm.z < 0) nrm.negate();
  const quad = [fbL, fbR, ftR, ftL];
  const front = quad.map((p) => p.clone().addScaledVector(nrm, 0.003));
  const back = quad.map((p) => p.clone().addScaledVector(nrm, -0.05));
  out.push(part(polyGeo(front), glass), part(polyGeo(back.slice().reverse()), glass));
  for (let k = 0; k < 4; k++) {
    const k2 = (k + 1) % 4;
    out.push(part(polyGeo([front[k], back[k], back[k2], front[k2]]), glass));
  }
  // quarter panels: strip between the front-panel edge and the windscreen arch
  const A = arch(CK.sA);
  const HALF = NH + 1;
  for (const sx of [1, -1]) {
    const archHalf = sx > 0 ? A.slice(0, HALF) : A.slice(HALF - 1).reverse();
    let jTop = 0;
    for (let j = 0; j < archHalf.length; j++) if (Math.abs(archHalf[j].x) > 0.15) jTop = j;
    const edgeB = archHalf.slice(0, jTop + 1);
    const n = edgeB.length;
    const fb = FB(sx), ft = FT(sx);
    const edgeA: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) edgeA.push(fb.clone().lerp(ft, i / (n - 1)));
    const mid = edgeA.map((p, i) => {
      const q = p.clone().lerp(edgeB[i], 0.5);
      return q.add(new V3(sx * 0.018 * Math.sin((Math.PI * i) / (n - 1)), 0, 0));
    });
    out.push(part(gridGeo([edgeA, mid, edgeB], { closedU: false }), P.glass()));
    // frames: front post, bottom edge along the skin, top edge to the arch
    out.push(part(bar(fb, ft, 0.03, 0.02, new V3(sx, 0.3, 0.6), 0.01, 0.004), P.frame()));
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 4; k++) {
      const s = lerp(CK.sW + 0.004, CK.sA, k / 4);
      const x = s < CK.sA - 0.001 ? lerp(0.17, sillX(CK.sA), (s - CK.sW) / (CK.sA - CK.sW)) : sillX(CK.sA);
      pts.push(B(sx * x, Math.max(fuseYTop(s, x), CK.sillY) + 0.004, s));
    }
    for (let k = 0; k < 4; k++) out.push(part(bar(pts[k], pts[k + 1], 0.034, 0.016, new V3(sx * 0.5, 1, 0), 0.006, 0.004), P.frame()));
    out.push(part(bar(ft, edgeB[n - 1], 0.026, 0.016, new V3(0, 1, 0.2), 0.008, 0.004), P.frame()));
  }
  out.push(part(bar(fbL, fbR, 0.034, 0.022, new V3(0, 1, 0.3), 0.014, 0.004), P.frame()));
  out.push(part(bar(ftL, ftR, 0.032, 0.022, new V3(0, 0.7, 0.7), 0.014, 0.004), P.frame()));
  // top plate between the front panel top and the arch crown
  const topL = A.find((p) => p.x > 0 && p.x < 0.15) ?? A[HALF - 2];
  const up = new V3(0, 0.004, 0);
  out.push(part(polyGeo([ftL.clone().add(up), topL.clone().add(up), A[HALF - 1].clone().add(up), new V3(-topL.x, topL.y + 0.004, topL.z), ftR.clone().add(up)]), P.frame()));
  // windscreen arch frame
  out.push(...chain(A, 0.036, 0.022));
  return group(out);
}

// ------------------------------------------------------------- sliding hood
function hood(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const sA = CK.sA + 0.012;
  const glassRows: THREE.Vector3[][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) glassRows.push(arch(lerp(sA, GLASS_END, i / n), 0.004));
  out.push(part(gridGeo(glassRows, { closedU: false }), P.glass()));
  // rear sheet-metal fairing: arches to the end of the opening, closed by the rear bow
  const metalRows: THREE.Vector3[][] = [];
  const m = 6;
  for (let i = 0; i <= m; i++) metalRows.push(arch(lerp(GLASS_END, 5.0, i / m), 0.005));
  out.push(part(gridGeo(metalRows, { closedU: false }), P.frame()));
  const endArch = metalRows[m];
  const endCap = [...endArch, B(0, CK.sillY, 5.0)];
  out.push(part(polyGeo(endCap.slice().reverse()), P.frame()));
  // bows: front bow, glass/metal joint
  out.push(...chain(glassRows[0], 0.03, 0.02));
  out.push(...chain(arch(GLASS_END, 0.004), 0.026, 0.014));
  // sill rails (hood frame)
  const nc = glassRows[0].length;
  for (const j of [0, nc - 1]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const s = lerp(sA, 5.0, i / 10);
      const a = arch(s, 0.004);
      pts.push(a[j]);
    }
    for (let i = 0; i < 10; i++) {
      const a = pts[i], b = pts[i + 1];
      const sx = Math.sign(a.x);
      out.push(part(bar(a.clone().add(new V3(sx * 0.006, 0.008, 0)), b.clone().add(new V3(sx * 0.006, 0.008, 0)), 0.02, 0.036, new V3(sx, 0.15, 0), 0.003, 0.004), P.frame()));
    }
  }
  // antenna mast on the rear fairing, wire to the fin
  const mBase = B(0, crownAt(4.86) + 0.002, 4.86);
  const mTop = B(0, crownAt(4.86) + 0.15, 4.95);
  out.push(part(bar(mBase, mTop, 0.012, 0.04, new V3(0, 0, 1), 0, 0.005), P.frame()));
  const ft = finTop();
  out.push(part(cylAB(mTop, ft, 0.0022, 0.0022, 6), P.wire()));
  const ins = cylAB(mTop.clone().lerp(ft, 0.02), mTop.clone().lerp(ft, 0.035), 0.007, 0.007, 10);
  out.push(part(ins, P.black()));
  return group(out);
}

// ------------------------------------------------------------- head armour
function headArmour(): THREE.Object3D {
  const s = 4.36;
  const h = halfArch(s, -0.028);
  const sh = new THREE.Shape();
  const yb = 0.5;
  sh.moveTo(h[0][0] * 0.62, yb);
  for (const [x, y] of h) if (y > yb + 0.03) sh.lineTo(Math.min(x, 0.2), y);
  for (const [x, y] of h.slice().reverse()) if (y > yb + 0.03) sh.lineTo(-Math.min(x, 0.2), y);
  sh.lineTo(-h[0][0] * 0.62, yb);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.014, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -s);
  const out: THREE.Object3D[] = [part(g, P.interior())];
  // support strut to the hood rear
  out.push(part(bar(B(0, 0.62, s + 0.01), B(0, crownAt(4.6) - 0.02, 4.6), 0.03, 0.012, new V3(0, 1, 0), 0.01, 0.004), P.interior()));
  return group(out);
}

// ------------------------------------------------------------- interior
function tub(): THREE.Object3D {
  const rows: THREE.Vector3[][] = [];
  const s0 = CK.sW + 0.02, s1 = CK.sH1;
  const floor = -0.25, nWall = 10;
  for (let i = 0; i <= 16; i++) {
    const s = lerp(s0, s1, i / 16);
    const topY = CK.sillY - 0.012;
    const ring: THREE.Vector3[] = [];
    for (let k = 0; k <= nWall; k++) {
      const y = lerp(topY, floor, k / nWall);
      ring.push(B(fuseX(s, y) - 0.014, y, s));
    }
    for (let k = nWall; k >= 0; k--) {
      const y = lerp(topY, floor, k / nWall);
      ring.push(B(-(fuseX(s, y) - 0.014), y, s));
    }
    rows.push(ring);
  }
  const out: THREE.Object3D[] = [part(gridGeo(rows, { closedU: false, inward: true }), P.interior())];
  // rear bulkhead closing the fuselage behind the seat
  const sb = CK.sH1 - 0.004;
  const sh = new THREE.Shape();
  const N = 12;
  for (let k = 0; k <= N; k++) {
    const y = lerp(floor, CK.sillY, k / N);
    const x = fuseX(sb, y) - 0.01;
    if (k === 0) sh.moveTo(x, y);
    else sh.lineTo(x, y);
  }
  for (let k = N; k >= 0; k--) {
    const y = lerp(floor, CK.sillY, k / N);
    sh.lineTo(-(fuseX(sb, y) - 0.01), y);
  }
  const bulk = new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: false });
  bulk.translate(0, 0, -sb);
  out.push(part(bulk, P.interior()));
  return group(out);
}

function fittings(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const I = P.interior();
  // instrument panel with dials
  const sP = 3.3;
  const sh = new THREE.Shape();
  const N = 10, top = 0.56, bot = 0.12;
  for (let k = 0; k <= N; k++) {
    const y = lerp(bot, top, k / N);
    const x = Math.min(0.3, fuseX(sP, y) - 0.03);
    if (k === 0) sh.moveTo(x, y);
    else sh.lineTo(x, y);
  }
  for (let k = N; k >= 0; k--) sh.lineTo(-Math.min(0.3, fuseX(sP, lerp(bot, top, k / N)) - 0.03), lerp(bot, top, k / N));
  const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.014, bevelEnabled: false });
  pg.translate(0, 0, -sP - 0.007);
  out.push(part(pg, P.black()));
  const dials: [number, number, number][] = [
    [-0.12, 0.47, 0.036], [0, 0.46, 0.04], [0.12, 0.47, 0.036], [-0.12, 0.36, 0.036], [0.0, 0.35, 0.04], [0.12, 0.36, 0.036],
    [-0.21, 0.4, 0.026], [0.21, 0.4, 0.026], [-0.18, 0.26, 0.024], [0.18, 0.26, 0.024], [0, 0.23, 0.03],
  ];
  for (const [x, y, r] of dials) {
    const ring = new THREE.TorusGeometry(r, 0.004, 6, 24);
    ring.translate(x, y, -(sP - 0.009));
    out.push(part(ring, P.steel()));
  }
  // coaming and Revi 16B reflector sight
  out.push(part(roundedBox(0.4, 0.035, 0.14, 0.014), P.black(), { p: B(0, 0.6, sP - 0.05) }));
  out.push(part(roundedBox(0.07, 0.09, 0.14, 0.01), P.black(), { p: B(0, 0.66, sP + 0.0) }));
  const refl = new THREE.PlaneGeometry(0.08, 0.08);
  refl.rotateX(-35 * (Math.PI / 180));
  refl.translate(0, 0.74, -(sP + 0.03));
  out.push(part(refl, P.glass()));
  // seat (bucket) with back armour, harness
  const sSeat = 4.2;
  out.push(part(roundedBox(0.38, 0.035, 0.36, 0.012), P.black(), { p: B(0, 0.02, sSeat - 0.12) }));
  out.push(part(roundedBox(0.42, 0.48, 0.03, 0.02), P.gun(), { p: B(0, 0.26, sSeat + 0.08), r: [-14, 0, 0] }));
  for (const sx of [1, -1]) out.push(part(roundedBox(0.025, 0.2, 0.34, 0.008), P.black(), { p: B(sx * 0.19, 0.1, sSeat - 0.1) }));
  for (const sx of [1, -1]) {
    const a = B(sx * 0.08, 0.5, sSeat + 0.1), b = B(sx * 0.09, 0.14, sSeat + 0.02);
    out.push(part(bar(a, b, 0.045, 0.005, new V3(0, 0, -1), 0.004, 0.0015), P.rlm02()));
  }
  // control column
  const c0 = B(0, -0.22, 3.72), c1 = B(0, 0.24, 3.68);
  out.push(part(cylAB(c0, c1, 0.018, 0.015, 12), P.black()));
  out.push(part(roundedBox(0.04, 0.12, 0.05, 0.014), P.black(), { p: c1.clone().add(new V3(0, 0.06, 0)) }));
  // floor and side consoles
  const fl = new THREE.PlaneGeometry(0.5, 1.2);
  fl.rotateX(-Math.PI / 2);
  fl.translate(0, -0.248, -3.95);
  out.push(part(fl, I));
  for (const sx of [1, -1]) {
    const x = sx * (fuseX(3.95, 0.3) - 0.07);
    out.push(part(roundedBox(0.1, 0.05, 0.62, 0.01), I, { p: B(x, 0.3, 3.95) }));
    for (let k = 0; k < 3; k++) out.push(part(roundedBox(0.025, 0.04, 0.025, 0.006), P.black(), { p: B(x, 0.34, 3.8 + 0.12 * k) }));
  }
  return group(out);
}

export function buildCockpit(): THREE.Object3D {
  return group([windscreen(), hood(), headArmour(), tub(), fittings()]);
}
