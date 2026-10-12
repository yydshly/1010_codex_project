/**
 * Spitfire LF Mk IXc cockpit and canopy (BODY frame).
 *
 * Canopy: three-piece windscreen with the flat bullet-proof front panel and curved side panels,
 * the blown (bulged) sliding hood with front and rear bows, and the fixed rear fairing with its
 * small side windows blending into the spine (high-back fuselage, no bubble canopy). External
 * rear-view mirror on the windscreen arch. Interior: grey-green tub, instrument panel, reflector
 * gunsight, seat with head armour, control column with spade grip.
 */
import * as THREE from 'three';
import { part, group } from '../../../core/kit';
import { bar, polyGeo, gridGeo, lerp, smooth, roundedBox, cylAB, flipAll } from './geom';
import { B, CK, fuseX, fuseYTop, openingHalfWidth } from './frame';
import { skin, P } from './paint';

const V3 = THREE.Vector3;

// ------------------------------------------------------------- canopy profile
/** Port half of the hood arch (sill -> crown) as [x, y]. */
function halfArch(crown: number, xs = 1): [number, number][] {
  const pts: [number, number][] = [
    [CK.sill, CK.sillY],
    [0.3, 0.345],
    [0.309, 0.375],
  ];
  const n = 11, ex = 2.5, yc = 0.4, a = 0.312;
  for (let i = 0; i <= n; i++) {
    const f = (i / n) * (Math.PI / 2);
    const c = Math.cos(f), s = Math.sin(f);
    pts.push([a * Math.pow(c, 2 / ex), yc + (crown - yc) * Math.pow(s, 2 / ex)]);
  }
  return pts.map(([x, y], i) => [i === 0 ? x : x * xs, y]);
}
/** Full arch at station s (port sill -> crown -> starboard sill). */
function arch(s: number, crown: number, xs = 1, grow = 0): THREE.Vector3[] {
  const h = halfArch(crown, xs).map(([x, y]) => [x + grow * (x / 0.31), y + grow] as [number, number]);
  const port = h.map(([x, y]) => B(x, y, s));
  const star = h.slice(0, -1).reverse().map(([x, y]) => B(-x, y, s));
  return [...port, ...star];
}
const HALF_N = halfArch(0.7).length; // points per half incl. crown

/** Frame chain of bars along a polyline, pushed outward from `centre` (body y axis). */
function chain(pts: THREE.Vector3[], w: number, h: number, cy = 0.3, mat = P.frame(), ext = 0.006): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const m = pts[k].clone().add(pts[k + 1]).multiplyScalar(0.5);
    const o = new V3(m.x, m.y - cy, 0).normalize();
    out.push(part(bar(pts[k].clone().addScaledVector(o, 0.003), pts[k + 1].clone().addScaledVector(o, 0.003), w, h, o, ext, 0.004), mat));
  }
  return out;
}

// ------------------------------------------------------------- windscreen
const FB = (sx: number) => B(sx * 0.16, fuseYTop(CK.sW, 0.16) + 0.002, CK.sW);
const FT = (sx: number) => B(sx * 0.135, 0.662, 3.705);
const ARCH_CROWN = 0.69;

function windscreen(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const glass = P.glass();
  // armoured front panel: a thick slab
  const fbL = FB(1), fbR = FB(-1), ftL = FT(1), ftR = FT(-1);
  const nrm = new V3().crossVectors(fbR.clone().sub(fbL), ftL.clone().sub(fbL)).normalize();
  if (nrm.z < 0) nrm.negate();
  const quad = [fbL, fbR, ftR, ftL];
  const front = quad.map((p) => p.clone().addScaledVector(nrm, 0.003));
  const back = quad.map((p) => p.clone().addScaledVector(nrm, -0.035));
  out.push(part(polyGeo(front), glass), part(polyGeo(back), glass));
  for (let k = 0; k < 4; k++) {
    const k2 = (k + 1) % 4;
    out.push(part(polyGeo([front[k], front[k2], back[k2], back[k]]), glass));
  }
  // curved side panels: strip between the front-panel edge and the windscreen arch
  const A = arch(CK.sA, ARCH_CROWN, 0.975);
  for (const sx of [1, -1]) {
    const archHalf = sx > 0 ? A.slice(0, HALF_N) : A.slice(HALF_N - 1).reverse();
    // arch from the sill up to the point whose |x| ~ 0.14
    let jTop = 0;
    for (let j = 0; j < archHalf.length; j++) if (Math.abs(archHalf[j].x) > 0.145) jTop = j;
    const edgeB = archHalf.slice(0, jTop + 1);
    const n = edgeB.length;
    const fb = FB(sx), ft = FT(sx);
    const edgeA: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) edgeA.push(fb.clone().lerp(ft, i / (n - 1)));
    const mid = edgeA.map((p, i) => {
      const q = p.clone().lerp(edgeB[i], 0.5);
      return q.add(new V3(sx * 0.012 * Math.sin((Math.PI * i) / (n - 1)), 0, 0));
    });
    out.push(part(gridGeo([edgeA, mid, edgeB], { closedU: false }), glass));
    // frames: front post, bottom edge along the skin
    out.push(part(bar(fb, ft, 0.03, 0.02, new V3(sx, 0.3, 0.6), 0.01, 0.004), P.frame()));
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 4; k++) {
      const s = lerp(CK.sW + 0.004, CK.sA, k / 4);
      const x = openingHalfWidth(s);
      pts.push(B(sx * x, fuseYTop(s, x) + 0.004, s));
    }
    for (let k = 0; k < 4; k++) out.push(part(bar(pts[k], pts[k + 1], 0.032, 0.014, new V3(sx * 0.5, 1, 0), 0.006, 0.004), P.frame()));
    // top edge of the side panel to the arch
    out.push(part(bar(ft, edgeB[n - 1], 0.026, 0.016, new V3(0, 1, 0.2), 0.008, 0.004), P.frame()));
  }
  // front panel frame (top / bottom), top plate between panel top and arch crown
  out.push(part(bar(fbL, fbR, 0.032, 0.02, new V3(0, 1, 0.3), 0.012, 0.004), P.frame()));
  out.push(part(bar(ftL, ftR, 0.03, 0.02, new V3(0, 0.7, 0.7), 0.012, 0.004), P.frame()));
  const topL = A.find((p) => p.x > 0 && p.x < 0.15) ?? A[HALF_N - 2];
  out.push(part(polyGeo([ftL.clone().add(new V3(0, 0.004, 0)), topL.clone().add(new V3(0, 0.004, 0)), A[HALF_N - 1].clone().add(new V3(0, 0.004, 0)), new V3(-topL.x, topL.y + 0.004, topL.z), ftR.clone().add(new V3(0, 0.004, 0))]), P.frame()));
  // windscreen arch frame
  out.push(...chain(A, 0.03, 0.02));
  // rear-view mirror on the arch
  const mBase = A[HALF_N - 1].clone().add(new V3(0, 0.008, 0));
  const mTop = mBase.clone().add(new V3(0, 0.05, 0.01));
  out.push(part(cylAB(mBase, mTop, 0.007, 0.006, 10), P.steel()));
  const housing = new THREE.SphereGeometry(1, 20, 12);
  housing.scale(0.075, 0.03, 0.022);
  housing.translate(mTop.x, mTop.y + 0.02, mTop.z);
  out.push(part(housing, P.frame()));
  const mirror = new THREE.PlaneGeometry(0.13, 0.042);
  mirror.rotateY(Math.PI);
  mirror.translate(mTop.x, mTop.y + 0.02, mTop.z - 0.0195);
  out.push(part(mirror, P.oleo()));
  return group(out);
}

// ------------------------------------------------------------- sliding hood
function hood(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const rows: THREE.Vector3[][] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = lerp(CK.sH0, CK.sH1, t);
    const crown = 0.703 + 0.012 * Math.sin(Math.PI * t);
    rows.push(arch(s, crown, 1.0 + 0.012 * Math.sin(Math.PI * t), 0.006));
  }
  out.push(part(gridGeo(rows, { closedU: false }), P.glass()));
  out.push(...chain(rows[0], 0.034, 0.02));
  out.push(...chain(rows[n], 0.04, 0.022));
  // sill rails
  const nc = rows[0].length;
  for (const j of [0, nc - 1]) {
    for (let i = 0; i < n; i++) {
      const a = rows[i][j], b = rows[i + 1][j];
      const sx = Math.sign(a.x);
      out.push(part(bar(a.clone().add(new V3(sx * 0.004, 0.006, 0)), b.clone().add(new V3(sx * 0.004, 0.006, 0)), 0.02, 0.03, new V3(sx, 0.2, 0), 0.002, 0.004), P.frame()));
    }
  }
  // hood catch handle at the front bow (inside, top)
  const hc = rows[0][HALF_N - 1].clone().add(new V3(0, -0.035, -0.02));
  out.push(part(roundedBox(0.07, 0.014, 0.02, 0.005), P.black(), { p: hc }));
  return group(out);
}

// ------------------------------------------------------------- fixed rear fairing
function surfaceAt(s: number, psi: number): THREE.Vector3 {
  // ray from (0, 0.3) at angle psi (0 = port horizontal, PI/2 = up) to the fuselage skin
  let lo = 0, hi = 0.6;
  for (let k = 0; k < 30; k++) {
    const r = (lo + hi) / 2;
    const x = r * Math.cos(psi), y = 0.3 + r * Math.sin(psi);
    if (fuseX(s, y) > Math.abs(x) && y < fuseYTop(s, 0)) lo = r;
    else hi = r;
  }
  const r = lo - 0.002;
  return B(r * Math.cos(psi), 0.3 + r * Math.sin(psi), s);
}

function rearFairing(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const s0 = CK.sH1 + 0.012, s1 = CK.sR;
  const base = arch(s0, 0.698, 0.985);
  const nc = base.length;
  const psis = base.map((p) => {
    const psi = Math.atan2(p.y - 0.3, Math.abs(p.x));
    return p.x >= 0 ? psi : Math.PI - psi;
  });
  const rows: THREE.Vector3[][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = lerp(s0, s1, t);
    const b = arch(s, 0.698, 0.985);
    const f = smooth(0, 1, t);
    rows.push(b.map((p, j) => p.clone().lerp(surfaceAt(s, psis[j]), f)));
  }
  // side windows: rows 1..6, columns 3..9 on each side
  const win = (i: number, j: number) => i >= 1 && i < 6 && ((j >= 3 && j < 9) || (j >= nc - 10 && j < nc - 4));
  out.push(part(gridGeo(rows, { closedU: false, skip: win }), skin('FUSE')));
  for (const [j0, j1] of [[3, 9], [nc - 10, nc - 4]]) {
    const sub = rows.slice(1, 7).map((r) => r.slice(j0, j1 + 1));
    const cen = new V3(0, 0.3, sub[0][0].z);
    const off = (d: number) =>
      sub.map((r) =>
        r.map((p) => {
          const o = new V3(p.x, p.y - cen.y, 0).normalize();
          return p.clone().addScaledVector(o, d);
        }),
      );
    out.push(part(gridGeo(off(0.0015), { closedU: false }), P.glass()));
    out.push(part(gridGeo(off(-0.03), { closedU: false }), P.interior()));
    // window frame
    const edge = [...sub[0], ...sub.map((r) => r[r.length - 1]).slice(1), ...sub[sub.length - 1].slice().reverse().slice(1), ...sub.map((r) => r[0]).reverse().slice(1)];
    out.push(...chain(edge, 0.018, 0.01, 0.3, P.frame(), 0.004));
  }
  // bulkhead under the fairing (so the fuselage interior never shows through)
  const sh = new THREE.Shape();
  const h = halfArch(0.69, 0.97);
  sh.moveTo(h[0][0] - 0.01, -0.1);
  for (const [x, y] of h) sh.lineTo(x - 0.012, y - 0.008);
  for (const [x, y] of h.slice().reverse()) sh.lineTo(-(x - 0.012), y - 0.008);
  sh.lineTo(-(h[0][0] - 0.01), -0.1);
  const bulk = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false });
  bulk.translate(0, 0, -(s0 + 0.004));
  out.push(part(bulk, P.interior()));
  return group(out);
}

// ------------------------------------------------------------- interior
function tub(): THREE.Object3D {
  const rows: THREE.Vector3[][] = [];
  const s0 = CK.sW + 0.02, s1 = CK.sH1;
  const floor = -0.28, nWall = 10;
  for (let i = 0; i <= 14; i++) {
    const s = lerp(s0, s1, i / 14);
    const hw = openingHalfWidth(s);
    const topY = fuseYTop(s, hw) - 0.008;
    const ring: THREE.Vector3[] = [];
    for (let k = 0; k <= nWall; k++) {
      const y = lerp(topY, floor, k / nWall);
      ring.push(B(fuseX(s, y) - 0.013, y, s));
    }
    for (let k = nWall; k >= 0; k--) {
      const y = lerp(topY, floor, k / nWall);
      ring.push(B(-(fuseX(s, y) - 0.013), y, s));
    }
    rows.push(ring);
  }
  const g = gridGeo(rows, { closedU: false, inward: true });
  return part(g, P.interior());
}

function fittings(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const I = P.interior();
  // instrument panel with dials
  const sP = 3.63;
  const sh = new THREE.Shape();
  const N = 10, top = 0.36, bot = -0.02;
  for (let k = 0; k <= N; k++) {
    const y = lerp(bot, top, k / N);
    const x = fuseX(sP, y) - 0.02;
    if (k === 0) sh.moveTo(x, y);
    else sh.lineTo(x, y);
  }
  for (let k = N; k >= 0; k--) sh.lineTo(-(fuseX(sP, lerp(bot, top, k / N)) - 0.02), lerp(bot, top, k / N));
  const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false });
  pg.translate(0, 0, -sP - 0.006);
  out.push(part(pg, P.black()));
  const dials: [number, number, number][] = [
    [-0.12, 0.24, 0.036], [0, 0.25, 0.04], [0.12, 0.24, 0.036], [-0.12, 0.13, 0.036], [0, 0.13, 0.04], [0.12, 0.13, 0.036],
    [-0.22, 0.18, 0.026], [0.22, 0.18, 0.026], [-0.2, 0.06, 0.022], [0.2, 0.06, 0.022],
  ];
  for (const [x, y, r] of dials) {
    const ring = new THREE.TorusGeometry(r, 0.004, 6, 24);
    ring.translate(x, y, -(sP - 0.008));
    out.push(part(ring, P.steel()));
  }
  // coaming and reflector sight
  out.push(part(roundedBox(0.34, 0.03, 0.1, 0.012), P.black(), { p: B(0, 0.375, sP - 0.03) }));
  out.push(part(roundedBox(0.07, 0.07, 0.14, 0.008), P.black(), { p: B(0, 0.43, sP - 0.02) }));
  const refl = new THREE.PlaneGeometry(0.075, 0.075);
  refl.rotateX(-35 * (Math.PI / 180));
  refl.translate(0, 0.5, -(sP + 0.02));
  out.push(part(refl, P.glass()));
  // seat (bucket) on its frame, head armour on the bulkhead
  const sSeat = 4.22;
  out.push(part(roundedBox(0.36, 0.03, 0.34, 0.01), P.black(), { p: B(0, -0.12, sSeat - 0.08) }));
  out.push(part(roundedBox(0.38, 0.44, 0.03, 0.012), P.black(), { p: B(0, 0.1, sSeat + 0.1), r: [-12, 0, 0] }));
  for (const sx of [1, -1]) out.push(part(roundedBox(0.025, 0.18, 0.32, 0.008), P.black(), { p: B(sx * 0.18, -0.04, sSeat - 0.06) }));
  out.push(part(roundedBox(0.34, 0.26, 0.022, 0.03), P.gun(), { p: B(0, 0.5, CK.sH1 - 0.02), r: [-6, 0, 0] }));
  out.push(part(roundedBox(0.18, 0.08, 0.05, 0.02), P.black(), { p: B(0, 0.5, CK.sH1 - 0.045) }));
  // harness straps over the seat back
  for (const sx of [1, -1]) {
    const a = B(sx * 0.07, 0.34, sSeat + 0.13), b = B(sx * 0.08, 0.02, sSeat + 0.06);
    out.push(part(bar(a, b, 0.045, 0.004, new V3(0, 0, -1), 0.004, 0.0015), P.interior()));
  }
  // control column with spade grip
  const c0 = B(0, -0.27, 3.95), c1 = B(0, 0.1, 3.9);
  out.push(part(cylAB(c0, c1, 0.016, 0.014, 12), P.black()));
  const grip = new THREE.TorusGeometry(0.055, 0.011, 8, 24);
  grip.translate(c1.x, c1.y + 0.05, c1.z);
  out.push(part(grip, P.black()));
  // floor, trim wheel box on the port wall
  const fl = new THREE.PlaneGeometry(0.46, 0.9);
  fl.rotateX(-Math.PI / 2);
  fl.translate(0, -0.278, -4.0);
  out.push(part(fl, I));
  out.push(part(roundedBox(0.05, 0.1, 0.22, 0.01), I, { p: B(fuseX(3.95, 0.1) - 0.04, 0.1, 3.95) }));
  const tw = new THREE.TorusGeometry(0.07, 0.01, 6, 24);
  tw.rotateY(Math.PI / 2);
  tw.translate(fuseX(4.05, 0.0) - 0.05, 0.0, -4.05);
  out.push(part(tw, P.black()));
  return group(out);
}

export function buildCockpit(): THREE.Object3D {
  return group([windscreen(), hood(), rearFairing(), tub(), fittings()]);
}
void flipAll;
