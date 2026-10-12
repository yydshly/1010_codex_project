/**
 * M3A1 running gear: chassis frame, front driven axle on leaf springs with 8.25-20 combat tyres on
 * ventilated disc wheels, and the two rear track units (front drive sprocket on the rear axle, one
 * bogie with four dual rubber-tyred wheels on a volute spring, one dual support roller, rear idler
 * on its spring-loaded arm) with the moulded rubber centre-guide band track (58 x 4 in pitches).
 *
 * The band run is solved in the side plane (z, y): bottom run under the bogie wheels, round the idler,
 * over the support roller, round the sprocket. The idler position closes the loop at 58 pitches.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import type { Pal } from './palette';
import { type V2, type V3, latheX, merge, xm, xf, clampBelow, cylX, box, bentRod } from '../willys-mb/util';

/* ------------------------------------------------------------------ band loop solver */

interface Circle { c: V2; r: number; top?: boolean }

function tangent(a: Circle, b: Circle): [V2, V2] {
  const dz = b.c[0] - a.c[0], dy = b.c[1] - a.c[1];
  const L = Math.hypot(dz, dy);
  const u: V2 = [dz / L, dy / L];
  const up: V2 = [-u[1], u[0]];
  const al = (a.r - b.r) / L;
  const be = Math.sqrt(Math.max(0, 1 - al * al));
  const n: V2 = [al * u[0] + be * up[0], al * u[1] + be * up[1]];
  return [
    [a.c[0] + a.r * n[0], a.c[1] + a.r * n[1]],
    [b.c[0] + b.r * n[0], b.c[1] + b.r * n[1]],
  ];
}

const hb = D.bandT / 2;
const wheelY = D.bandC + hb + D.bogieWheelR;

function circles(idlerZ: number): Circle[] {
  const wF: Circle = { c: [D.zB + D.bogieDz[0], wheelY], r: D.bogieWheelR + hb };
  const wR: Circle = { c: [D.zB + D.bogieDz[3], wheelY], r: D.bogieWheelR + hb };
  const idl: Circle = { c: [idlerZ, D.idler.y], r: D.idler.r + hb };
  const rol: Circle = { c: [D.roller.z, D.roller.y], r: D.roller.r + hb, top: true };
  const spr: Circle = { c: [D.sprocket.z, D.sprocket.y], r: D.sprocket.pitchR };
  return [wF, wR, idl, rol, spr];
}

/** Dense clockwise (seen from +X) centre-line loop. */
function loop(idlerZ: number, step = 0.01): { pts: V2[]; len: number } {
  const seq = circles(idlerZ);
  const n = seq.length;
  const outs: V2[] = [], ins: V2[] = [];
  for (let i = 0; i < n; i++) {
    const [pa, pb] = tangent(seq[i], seq[(i + 1) % n]);
    outs[i] = pa;
    ins[(i + 1) % n] = pb;
  }
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const C = seq[i];
    const a0 = Math.atan2(ins[i][1] - C.c[1], ins[i][0] - C.c[0]);
    const a1 = Math.atan2(outs[i][1] - C.c[1], outs[i][0] - C.c[0]);
    let d = a0 - a1;
    while (d < 0) d += Math.PI * 2;
    while (d >= Math.PI * 2) d -= Math.PI * 2;
    if (C.top && d > Math.PI) d = 0;
    const na = Math.max(1, Math.ceil((d * C.r) / step));
    for (let k = 0; k < na; k++) {
      const a = a0 - (d * k) / na;
      pts.push([C.c[0] + C.r * Math.cos(a), C.c[1] + C.r * Math.sin(a)]);
    }
    const A = outs[i], B = ins[(i + 1) % n];
    const span = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const upper = !!C.top || i === 2;
    const sag = upper ? 0.008 * span * span : 0;
    const ns = Math.max(1, Math.ceil(span / step));
    const tz = (B[0] - A[0]) / span, ty = (B[1] - A[1]) / span;
    for (let k = 0; k < ns; k++) {
      const s = k / ns;
      const h = sag * 4 * s * (1 - s);
      pts.push([A[0] + (B[0] - A[0]) * s + ty * h, A[1] + (B[1] - A[1]) * s - tz * h]);
    }
  }
  let len = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return { pts, len };
}

interface Layout { idlerZ: number; pts: V2[]; cum: number[]; total: number }
let cached: Layout | null = null;

export function layout(): Layout {
  if (cached) return cached;
  const target = D.pitches * D.pitch;
  let lo = D.zB - 0.6, hi = D.zB - 1.4; // loop grows as the idler moves rearwards
  for (let it = 0; it < 40; it++) {
    const mid = (lo + hi) / 2;
    if (loop(mid).len > target) hi = mid;
    else lo = mid;
  }
  const idlerZ = (lo + hi) / 2;
  const { pts } = loop(idlerZ);
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  cached = { idlerZ, pts, cum, total: cum[cum.length - 1] };
  return cached;
}

/** Position and unit tangent at arc length s along the loop. */
function at(L: Layout, s: number): { p: V2; t: V2 } {
  s = ((s % L.total) + L.total) % L.total;
  let lo = 0, hi = L.cum.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (L.cum[m] <= s) lo = m;
    else hi = m;
  }
  const a = L.pts[lo], b = L.pts[(lo + 1) % L.pts.length];
  const seg = Math.max(1e-9, L.cum[lo + 1] - L.cum[lo]);
  const k = (s - L.cum[lo]) / seg;
  const tz = (b[0] - a[0]) / seg, ty = (b[1] - a[1]) / seg;
  return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], t: [tz, ty] };
}

/* ------------------------------------------------------------------ band track */

/** Rectangular band swept along the loop: x0..x1 across, thickness bandT about the centre line. */
function bandGeo(L: Layout, x0: number, x1: number): THREE.BufferGeometry {
  const N = Math.round(L.total / 0.02);
  const ring: { c: V2; n: V2 }[] = [];
  for (let i = 0; i < N; i++) {
    // average the tangent over a short window for smooth normals on the arcs
    const a = at(L, (i / N) * L.total - 0.01), b = at(L, (i / N) * L.total + 0.01);
    const tz = b.p[0] - a.p[0], ty = b.p[1] - a.p[1];
    const l = Math.hypot(tz, ty) || 1;
    const c = at(L, (i / N) * L.total).p;
    ring.push({ c, n: [-ty / l, tz / l] }); // outward (left of the clockwise travel)
  }
  const pos: number[] = [], nor: number[] = [];
  const quad = (p: number[][], n: number[][]) => {
    for (const k of [0, 1, 2, 0, 2, 3]) {
      pos.push(...p[k]);
      nor.push(...n[k]);
    }
  };
  for (let i = 0; i < N; i++) {
    const A = ring[i], B = ring[(i + 1) % N];
    const P = (r: { c: V2; n: V2 }, x: number, side: number) => [x, r.c[1] + r.n[1] * hb * side, r.c[0] + r.n[0] * hb * side];
    const nOut = (r: { c: V2; n: V2 }) => [0, r.n[1], r.n[0]];
    const nIn = (r: { c: V2; n: V2 }) => [0, -r.n[1], -r.n[0]];
    // outer face (tread side)
    quad([P(A, x0, 1), P(B, x0, 1), P(B, x1, 1), P(A, x1, 1)], [nOut(A), nOut(B), nOut(B), nOut(A)]);
    // inner face
    quad([P(A, x1, -1), P(B, x1, -1), P(B, x0, -1), P(A, x0, -1)], [nIn(A), nIn(B), nIn(B), nIn(A)]);
    // side faces
    quad([P(A, x1, 1), P(B, x1, 1), P(B, x1, -1), P(A, x1, -1)], [[1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0]]);
    quad([P(A, x0, -1), P(B, x0, -1), P(B, x0, 1), P(A, x0, 1)], [[-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0]]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

/** Matrix for a band-local frame at arc length s: X across, Y outward (tread side), Z along travel. */
function bandFrame(L: Layout, s: number, xc: number): THREE.Matrix4 {
  const a = at(L, s - 0.01), b = at(L, s + 0.01);
  const tz = b.p[0] - a.p[0], ty = b.p[1] - a.p[1];
  const l = Math.hypot(tz, ty) || 1;
  const c = at(L, s).p;
  const T = new THREE.Vector3(0, ty / l, tz / l);
  const Nn = new THREE.Vector3(0, tz / l, -ty / l); // outward
  const X = new THREE.Vector3(1, 0, 0);
  return new THREE.Matrix4().makeBasis(X, Nn, T).setPosition(xc, c[1], c[0]);
}

function trackBand(P: Pal, xc: number): THREE.Object3D[] {
  const L = layout();
  const hw = D.bandW / 2;
  const rubber: THREE.BufferGeometry[] = [bandGeo(L, xc - hw, xc + hw)];
  const steel: THREE.BufferGeometry[] = [];
  // tread bars (outer), two per pitch either side of the centre, slightly angled
  const barL = hw - 0.03;
  const bar = G.rbox(barL, D.treadH + 0.003, 0.034, 0.006, 1);
  const guide = new THREE.BufferGeometry().copy(
    G.extrude(
      [
        [-0.034, 0],
        [0.034, 0],
        [0.02, 0.066],
        [-0.02, 0.066],
      ],
      0.046,
      0.006,
      1,
      1,
    ),
  );
  // guide outline in (z, inward height); rotate so x-extrusion is across the band
  guide.rotateY(Math.PI / 2); // extrude axis Z -> X ; outline x -> -Z
  const step = L.total / D.pitches;
  for (let k = 0; k < D.pitches; k++) {
    const sB = (k + 0.5) * step;
    const mB = bandFrame(L, sB, xc);
    for (const sx of [1, -1]) {
      const g = bar.clone();
      g.rotateY(sx * 0.12);
      g.translate(sx * (0.018 + barL / 2), hb + (D.treadH + 0.003) / 2 - 0.003, 0);
      rubber.push(xm(g, mB));
    }
    const mG = bandFrame(L, k * step, xc);
    const g = guide.clone();
    g.scale(1, -1, 1); // point inward (towards the wheels)
    G.flipWinding(g);
    g.translate(0, -hb + 0.002, 0);
    steel.push(xm(g, mG));
  }
  return [part(clampBelow(merge(rubber), 0), P.rubber), part(merge(steel), P.track)];
}

/* ------------------------------------------------------------------ wheels of the track unit */

/** Dual rubber-tyred disc wheel pair centred on the band (axis X), for bogie wheels / roller / idler. */
function dualWheel(P: Pal, r: number, tyre: number, discW: number, gap: number, spokes = false): THREE.Object3D[] {
  const steel: THREE.BufferGeometry[] = [], rub: THREE.BufferGeometry[] = [], voids: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const x0 = s * gap, x1 = s * (gap + discW);
    const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    rub.push(latheX([[r - tyre, lo + 0.004], [r - 0.006, lo], [r, lo + 0.008], [r, hi - 0.008], [r - 0.006, hi], [r - tyre, hi - 0.004]], 40, 50));
    // steel disc: rim, dished web, hub boss
    const outer = s > 0 ? hi : lo;
    const inner = s > 0 ? lo : hi;
    const web: V2[] = [
      [0.0, inner],
      [r - tyre, inner],
      [r - tyre, outer],
      [r - tyre - 0.012, outer],
      [r * 0.45, outer - s * 0.012],
      [r * 0.32, outer + s * 0.004],
      [0.0, outer + s * 0.004],
    ];
    if (s < 0) web.reverse();
    steel.push(latheX(s > 0 ? web : web.map(([a, b]) => [a, b] as V2), 32, 40));
    if (spokes) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const hole = cylX(r * 0.12, 0.004, [outer + s * 0.001, 0, 0], 12);
        xf(hole, [0, Math.sin(a) * r * 0.62, Math.cos(a) * r * 0.62]);
        voids.push(hole);
      }
    }
  }
  // axle through both discs
  steel.push(cylX(0.03, 2 * (gap + discW) + 0.03, [0, 0, 0], 14));
  const out = [part(merge(rub), P.rubber), part(merge(steel), P.chassis)];
  if (voids.length) out.push(part(merge(voids), P.void));
  return out;
}

/** Front drive sprocket: two toothed discs either side of the centre guides + hub and dish. */
function sprocket(P: Pal): THREE.Object3D[] {
  const S = D.sprocket;
  const tipR = S.pitchR - hb - 0.004;
  const rootR = tipR - 0.03;
  const outline: V2[] = [];
  const n = S.teeth;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const da = (Math.PI * 2) / n;
    for (const [f, rr] of [
      [0.0, rootR],
      [0.18, rootR],
      [0.32, tipR],
      [0.68, tipR],
      [0.82, rootR],
    ] as [number, number][]) {
      const b = a + f * da;
      outline.push([Math.cos(b) * rr, Math.sin(b) * rr]);
    }
  }
  const disc = G.extrude(G.shape(outline, 0, [circleCW(0.06, 20)]), 0.026, 0.003, 1, 1);
  const parts: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const g = disc.clone();
    g.rotateY(Math.PI / 2);
    g.translate(s * 0.058, 0, 0);
    parts.push(g);
  }
  // dished centre + hub with nut ring, outer side
  parts.push(latheX([[0.0, -0.045], [0.17, -0.045], [0.17, 0.045], [0.0, 0.045]], 40, 40));
  parts.push(latheX([[0.0, 0.07], [0.12, 0.07], [0.12, 0.09], [0.075, 0.15], [0.05, 0.19], [0.0, 0.19]], 32, 40));
  const nuts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const nut = G.cyl(0.011, 0.011, 0.014, 6);
    nut.rotateZ(-Math.PI / 2);
    nut.translate(0.098, Math.sin(a) * 0.1, Math.cos(a) * 0.1);
    nuts.push(nut);
  }
  parts.push(...nuts);
  // teeth faces worn bright are part of the chassis casting here
  return [part(merge(parts), P.chassis)];
}

function circleCW(r: number, n: number): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = -(i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/** One complete track unit (band, sprocket, bogie, roller, idler) for side s (+1 left, -1 right). */
function trackUnit(P: Pal, s: 1 | -1): THREE.Object3D {
  const L = layout();
  const xc = s * D.trackX;
  const kids: THREE.Object3D[] = [];
  kids.push(...trackBand(P, xc));
  const gap = 0.036;
  // bogie wheels: four duals
  for (const dz of D.bogieDz) {
    kids.push(group(dualWheel(P, D.bogieWheelR, 0.028, 0.1, gap, true), { p: [xc, wheelY, D.zB + dz] }));
  }
  // support roller
  kids.push(group(dualWheel(P, D.roller.r, 0.02, 0.085, gap), { p: [xc, D.roller.y, D.roller.z] }));
  // idler
  kids.push(group(dualWheel(P, D.idler.r, 0.03, 0.1, gap, true), { p: [xc, D.idler.y, L.idlerZ] }));
  // sprocket
  kids.push(group(sprocket(P), { p: [xc, D.sprocket.y, D.sprocket.z], s: [s, 1, 1] }));

  // bogie frame (inboard of the band), pivot arms, volute spring and roller bracket
  const xi = s * (D.trackX - D.bandW / 2 - 0.045);
  const ch: THREE.BufferGeometry[] = [];
  ch.push(box(0.07, 0.1, 1.02, [xi, 0.3, D.zB], 0.012)); // bogie frame beam
  for (const dz of D.bogieDz) {
    // wheel arm from the beam to each axle
    ch.push(box(0.05, 0.06, 0.2, [xi + s * 0.005, (wheelY + 0.3) / 2, D.zB + dz * 0.85], 0.01, [dz > 0 ? 18 : -18, 0, 0]));
    ch.push(cylX(0.045, 0.06, [xi + s * 0.03, wheelY, D.zB + dz], 16));
  }
  // cast bogie bracket and volute spring housing rising to the frame
  ch.push(box(0.1, 0.34, 0.26, [xi, 0.48, D.zB], 0.02));
  const coil: V3[] = [];
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2 * 4;
    coil.push([xi + Math.cos(a) * 0.07 - s * 0.09, 0.36 + i * 0.0045, D.zB + Math.sin(a) * 0.07]);
  }
  ch.push(G.tube(coil, 0.014, 6, 240));
  ch.push(box(0.2, 0.03, 0.2, [xi - s * 0.07, 0.345, D.zB], 0.006));
  ch.push(box(0.2, 0.03, 0.2, [xi - s * 0.07, 0.64, D.zB], 0.006));
  // roller bracket arm up to the support roller axle
  ch.push(box(0.06, 0.2, 0.08, [xi, D.roller.y - 0.07, D.roller.z], 0.01));
  ch.push(cylX(0.026, 0.07, [xi + s * 0.04, D.roller.y, D.roller.z], 12));
  // bracket from the spring housing to the chassis frame
  ch.push(box(Math.abs(xi) - D.frameX + 0.06, 0.1, 0.3, [s * ((Math.abs(xi) + D.frameX) / 2), 0.68, D.zB], 0.01));
  // idler arm and tension spring (M3A1: spring-loaded idler)
  ch.push(box(0.06, 0.08, Math.abs(L.idlerZ - (D.zB - 0.5)) + 0.08, [xi, (D.idler.y + 0.32) / 2, (L.idlerZ + D.zB - 0.5) / 2], 0.01, [Math.atan2(D.idler.y - 0.32, D.zB - 0.5 - L.idlerZ) * (180 / Math.PI), 0, 0]));
  ch.push(cylX(0.05, 0.07, [xi + s * 0.03, D.idler.y, L.idlerZ], 16));
  ch.push(G.rod([xi - s * 0.06, D.idler.y + 0.1, L.idlerZ + 0.1], [xi - s * 0.06, 0.62, D.zB - 0.45], 0.03, 12));
  ch.push(box(0.05, 0.16, 0.16, [xi - s * 0.04, 0.62, D.zB - 0.45], 0.01));
  ch.push(box(Math.abs(xi) - D.frameX, 0.08, 0.14, [s * ((Math.abs(xi) + D.frameX) / 2), 0.7, D.zB - 0.45], 0.01));
  kids.push(part(merge(ch), P.chassis));
  return group(kids);
}

/* ------------------------------------------------------------------ front wheel */

function frontWheel(P: Pal, spin: number): THREE.Object3D {
  const R = D.tyreR, hw = D.tyreHW, rb = D.rimR;
  const crown = R - 0.013;
  // carcass profile (radius, x) from inner bead round the crown to the outer bead
  const prof: V2[] = [];
  const N = 22;
  prof.push([rb - 0.005, -hw + 0.03]);
  prof.push([rb + 0.03, -hw + 0.012]);
  for (let i = 0; i <= N; i++) {
    const a = -Math.PI / 2 + (i / N) * Math.PI;
    const s = Math.sin(a), c = Math.cos(a);
    const rr = rb + 0.09 + (crown - rb - 0.09) * Math.pow(Math.abs(c), 0.35);
    prof.push([rr, hw * Math.sign(s) * Math.pow(Math.abs(s), 0.6)]);
  }
  prof.push([rb + 0.03, hw - 0.012]);
  prof.push([rb - 0.005, hw - 0.03]);
  const tyre: THREE.BufferGeometry[] = [latheX(prof, 64, 60)];
  // non-directional military bar tread: alternating shoulder bars
  const nL = 36;
  for (let i = 0; i < nL; i++) {
    const a = (i / nL) * Math.PI * 2 + spin;
    for (const sx of [1, -1]) {
      const off = sx * (i % 2 === 0 ? 0.035 : 0.045);
      const lug = G.rbox(0.1, 0.018, 0.045, 0.005, 1);
      lug.translate(off, crown + 0.004, 0);
      lug.rotateX(a + (sx > 0 ? 0 : Math.PI / nL));
      tyre.push(lug);
    }
  }
  const tg = merge(tyre);
  tg.translate(0, D.axleY, 0);
  clampBelow(tg, 0);
  tg.translate(0, -D.axleY, 0);
  // 20 x 7 ventilated steel disc wheel: rim with bead flanges, dished disc with vent holes, hub
  const rim = latheX(
    [
      [rb + 0.012, -hw + 0.02],
      [rb, -hw + 0.022],
      [rb - 0.012, -hw + 0.04],
      [rb - 0.012, hw - 0.04],
      [rb, hw - 0.022],
      [rb + 0.012, hw - 0.02],
      [rb + 0.006, hw - 0.016],
      [rb - 0.02, hw - 0.03],
      [rb - 0.02, -hw + 0.03],
      [rb + 0.006, -hw + 0.016],
    ],
    48,
    40,
  );
  const disc = latheX(
    [
      [0.0, 0.035],
      [0.12, 0.035],
      [0.16, 0.02],
      [0.2, -0.01],
      [rb - 0.02, -0.02],
      [rb - 0.02, -0.03],
      [0.2, -0.022],
      [0.16, 0.01],
      [0.12, 0.025],
      [0.0, 0.025],
    ].reverse() as V2[],
    48,
    40,
  );
  const hub = latheX(
    [
      [0.0, 0.035],
      [0.1, 0.035],
      [0.1, 0.05],
      [0.075, 0.07],
      [0.068, 0.1],
      [0.05, 0.13],
      [0.0, 0.132],
    ],
    32,
    40,
  );
  const holes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + spin;
    const h = G.cyl(0.028, 0.028, 0.004, 14);
    h.scale(1, 1, 1.5);
    h.rotateZ(-Math.PI / 2);
    h.rotateX(a);
    h.translate(0, 0, 0);
    const rr = 0.178;
    xf(h, [0.009, Math.sin(a) * rr, Math.cos(a) * rr], [0, 0, 0]);
    holes.push(h);
  }
  const nuts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + spin;
    const n = G.cyl(0.012, 0.012, 0.018, 6);
    n.rotateZ(-Math.PI / 2);
    n.translate(0.044, Math.sin(a) * 0.084, Math.cos(a) * 0.084);
    nuts.push(n);
  }
  return group([
    part(tg, P.rubber),
    part(merge([rim, disc, hub, ...nuts]), P.chassis),
    part(merge(holes), P.void),
  ]);
}

/* ------------------------------------------------------------------ frame, axles, springs */

function chassis(P: Pal): THREE.Object3D {
  const g: THREE.BufferGeometry[] = [];
  const zf0 = 2.62, zr0 = D.zRearPlate + 0.06;
  for (const s of [1, -1]) {
    const x = s * D.frameX;
    // channel rail: web + flanges
    g.push(box(0.012, D.frameTop - D.frameBot, zf0 - zr0, [x, (D.frameTop + D.frameBot) / 2, (zf0 + zr0) / 2], 0.003));
    g.push(box(0.075, 0.012, zf0 - zr0, [x - s * 0.032, D.frameTop - 0.006, (zf0 + zr0) / 2], 0.003));
    g.push(box(0.075, 0.012, zf0 - zr0, [x - s * 0.032, D.frameBot + 0.006, (zf0 + zr0) / 2], 0.003));
    // front roller brackets (frame horns) out to the roller axle
    const rc = D.rollerC;
    g.push(box(0.03, 0.26, rc.z - zf0 + 0.2, [s * (rc.len / 2 + 0.05), rc.y, (rc.z + zf0 - 0.2) / 2], 0.006));
    g.push(box(s * (rc.len / 2 + 0.05) - x, 0.12, 0.1, [(x + s * (rc.len / 2 + 0.05)) / 2, D.frameTop - 0.08, zf0 - 0.1], 0.006));
    // front leaf spring
    for (let k = 0; k < 6; k++) {
      const len = 1.0 - k * 0.14;
      const z0 = D.zF + len / 2, z1 = D.zF - len / 2;
      g.push(box(0.065, 0.012, len, [x, 0.598 - k * 0.013, (z0 + z1) / 2], 0.003));
    }
    g.push(box(0.08, 0.05, 0.12, [x, 0.535, D.zF], 0.006)); // spring seat / U-bolts
    g.push(box(0.05, 0.1, 0.05, [x, 0.62, D.zF + 0.62], 0.006)); // front hanger
    g.push(box(0.05, 0.12, 0.05, [x, 0.6, D.zF - 0.62], 0.006)); // shackle
    // steering knuckle and hub spindle
    g.push(G.cyl(0.06, 0.06, 0.2, 16).translate(s * 0.64, D.axleY, D.zF));
    g.push(cylX(0.075, 0.1, [s * 0.7, D.axleY, D.zF], 20));
    // rear-axle housing tube to the sprocket
    g.push(cylX(0.06, 0.24, [s * 0.52, D.sprocket.y, D.sprocket.z], 16));
    g.push(cylX(0.08, 0.06, [s * 0.66, D.sprocket.y, D.sprocket.z], 18));
    // rear body cross-member stubs and rear bumperettes
    g.push(box(0.1, 0.14, 0.1, [s * 0.62, 0.76, D.zRearPlate - 0.045], 0.01));
  }
  // cross-members
  for (const z of [2.45, 1.2, 0.2, -0.6, -1.6, -2.4, zr0 + 0.05]) g.push(box(D.frameX * 2, 0.12, 0.08, [0, 0.72, z], 0.008));
  // front axle housing with the offset differential
  g.push(cylX(0.055, 1.22, [0, D.axleY, D.zF], 16));
  const diff = new THREE.SphereGeometry(0.17, 24, 16);
  diff.scale(0.85, 1, 1);
  diff.translate(-0.12, D.axleY, D.zF);
  g.push(diff);
  g.push(G.cyl(0.07, 0.07, 0.12, 16).rotateX(Math.PI / 2).translate(-0.12, D.axleY + 0.02, D.zF - 0.2));
  // tie rod / drag link
  g.push(G.rod([-0.62, D.axleY - 0.02, D.zF - 0.2], [0.62, D.axleY - 0.02, D.zF - 0.2], 0.016, 8));
  g.push(G.rod([0.6, D.axleY + 0.05, D.zF - 0.1], [0.5, 0.78, D.zF - 0.9], 0.018, 8));
  // rear axle differential (sprocket drive)
  g.push(cylX(0.065, 0.8, [0, D.sprocket.y, D.sprocket.z], 16));
  const rdiff = new THREE.SphereGeometry(0.19, 24, 16);
  rdiff.scale(0.8, 1, 1);
  rdiff.translate(0, D.sprocket.y, D.sprocket.z);
  g.push(rdiff);
  // engine sump, gearbox, transfer case and propeller shafts
  g.push(box(0.4, 0.2, 0.7, [0, 0.72, 1.85], 0.03));
  g.push(box(0.34, 0.24, 0.4, [0, 0.74, 1.1], 0.03));
  g.push(box(0.38, 0.26, 0.34, [0.05, 0.62, 0.55], 0.03));
  g.push(G.rod([-0.05, 0.6, 0.52], [-0.1, D.axleY + 0.04, D.zF - 0.25], 0.035, 10));
  g.push(G.rod([0.0, 0.58, 0.38], [0.0, D.sprocket.y + 0.03, D.sprocket.z + 0.16], 0.04, 10));
  // exhaust silencer under the right side
  const ex = merge([
    cylX(0.09, 0.02, [0, 0, 0], 16),
    G.cyl(0.09, 0.09, 0.8, 18).rotateX(Math.PI / 2),
  ]);
  ex.translate(-0.3, 0.64, 0.0);
  g.push(ex);
  // pintle hook at the rear (28 in pintle height)
  g.push(box(0.14, 0.14, 0.1, [0, 0.72, D.zRearPlate + 0.01], 0.012));
  g.push(G.torus(0.035, 0.014, 8, 20, Math.PI * 1.6).rotateZ(-Math.PI * 0.3).rotateY(Math.PI / 2).translate(0, 0.72, D.zRearPlate - 0.075));
  // front unditching roller between the frame horns
  const rc = D.rollerC;
  const roller = merge([
    cylX(rc.r, rc.len - 0.04, [0, 0, 0], 32),
    cylX(rc.r - 0.012, rc.len + 0.01, [0, 0, 0], 32),
  ]);
  roller.translate(0, rc.y, rc.z);
  const shaft = cylX(0.03, rc.len + 0.16, [0, rc.y, rc.z], 12);
  return group([part(merge(g), P.chassis), part(roller, P.paint), part(shaft, P.steel)]);
}

export function runningGear(P: Pal): THREE.Object3D {
  const kids: THREE.Object3D[] = [chassis(P)];
  const spins = [0.1, 0.31];
  for (const s of [1, -1] as const) {
    const w = frontWheel(P, spins[s > 0 ? 0 : 1]);
    w.position.set(s * D.wheelX, D.axleY, D.zF);
    if (s < 0) w.scale.x = -1;
    kids.push(w);
    kids.push(trackUnit(P, s));
  }
  return group(kids);
}
