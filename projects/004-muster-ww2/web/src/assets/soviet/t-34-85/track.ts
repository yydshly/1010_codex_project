/**
 * T-34 track: 72 individual cast 500 mm links per side (horned and flat links alternate),
 * laid along a solved belt path: flat on the ground under the road wheels, wrapped round the
 * front idler and the rear roller sprocket, and resting on top of the road wheels with a natural
 * sag between them (the T-34 has no return rollers). The idler position (track tension) is solved
 * so that exactly 72 links of 172 mm close the loop.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { R } from './dims';
import type { Pal } from './palette';
import type { P2 } from './util';
import { qbez } from './util';

interface Circ {
  c: P2; // (z, y)
  r: number;
}

/** pitch-line offset from the inner (wheel) face of a link */
const HALF_T = R.plateT / 2;

function wheelCircles(idlerZ: number): { W: Circ[]; I: Circ; S: Circ } {
  const W = R.wheelZ.map((z) => ({ c: [z, R.pathWheelY] as P2, r: R.wheelR + HALF_T }));
  return {
    W,
    I: { c: [idlerZ, R.idlerY], r: R.idlerR + HALF_T },
    S: { c: [R.sprocketZ, R.sprocketY], r: R.sprocketR + HALF_T },
  };
}

/** External tangent normal (belt on the right of travel = outside) for CCW belt from A to B. */
function tangentNormal(A: Circ, B: Circ): P2 {
  const dz = B.c[0] - A.c[0], dy = B.c[1] - A.c[1];
  const L = Math.hypot(dz, dy);
  const d: P2 = [dz / L, dy / L];
  const p: P2 = [d[1], -d[0]]; // right perpendicular
  const s = (A.r - B.r) / L;
  const c = Math.sqrt(Math.max(0, 1 - s * s));
  return [p[0] * c + d[0] * s, p[1] * c + d[1] * s];
}

const onCirc = (C: Circ, a: number): P2 => [C.c[0] + Math.cos(a) * C.r, C.c[1] + Math.sin(a) * C.r];
const ang = (n: P2) => Math.atan2(n[1], n[0]);
const wrap = (a: number) => {
  let x = a % (Math.PI * 2);
  if (x < 0) x += Math.PI * 2;
  return x;
};

/** Build the closed belt (pitch line) as a dense polyline in (z, y). */
function beltPolyline(idlerZ: number, sagK: number): P2[] {
  const { W, I, S } = wheelCircles(idlerZ);
  // loop order (CCW seen from +X): bottom run forward, idler, top run rearward, sprocket
  const nodes: Circ[] = [W[4], W[0], I, W[0], W[1], W[2], W[3], W[4], S];
  const sag: boolean[] = [false, false, true, true, true, true, true, true, false]; // span i: nodes[i] -> nodes[i+1]
  const n = nodes.length;
  // per span: departure angle on A, arrival angle on B, and the span polyline
  const dep: number[] = [], arr: number[] = [];
  const spans: P2[][] = [];
  for (let i = 0; i < n; i++) {
    const A = nodes[i], B = nodes[(i + 1) % n];
    const nn = tangentNormal(A, B);
    const a0 = ang(nn);
    const P0s = onCirc(A, a0), P2s = onCirc(B, a0);
    if (!sag[i] || sagK <= 0) {
      dep[i] = a0;
      arr[(i + 1) % n] = a0;
      spans.push([P0s, P2s]);
      continue;
    }
    const Lc = Math.hypot(P2s[0] - P0s[0], P2s[1] - P0s[1]);
    const phi = Math.atan(4 * sagK * Lc);
    const aA = a0 + phi, aB = a0 - phi;
    const P0 = onCirc(A, aA), P2 = onCirc(B, aB);
    const dA: P2 = [-Math.sin(aA), Math.cos(aA)];
    const dB: P2 = [-Math.sin(aB), Math.cos(aB)];
    // control point: intersection of P0 + t dA and P2 - u dB
    const det = dA[0] * -dB[1] - dA[1] * -dB[0];
    const rx = P2[0] - P0[0], ry = P2[1] - P0[1];
    const t = (rx * -dB[1] - ry * -dB[0]) / det;
    const Q: P2 = [P0[0] + dA[0] * t, P0[1] + dA[1] * t];
    const pts: P2[] = [];
    const steps = 40;
    for (let k = 0; k <= steps; k++) pts.push(qbez(P0, Q, P2, k / steps));
    dep[i] = aA;
    arr[(i + 1) % n] = aB;
    spans.push(pts);
  }
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    // arc on node i from arrival to departure (CCW)
    const C = nodes[i];
    const a0 = arr[i], da = wrap(dep[i] - a0);
    const steps = Math.max(1, Math.ceil((da * C.r) / 0.01));
    for (let k = 0; k < steps; k++) out.push(onCirc(C, a0 + (da * k) / steps));
    // span i (skip its last point: the next arc starts there)
    const sp = spans[i];
    if (sp.length === 2) {
      const L = Math.hypot(sp[1][0] - sp[0][0], sp[1][1] - sp[0][1]);
      const m = Math.max(1, Math.ceil(L / 0.02));
      for (let k = 0; k < m; k++) out.push([sp[0][0] + ((sp[1][0] - sp[0][0]) * k) / m, sp[0][1] + ((sp[1][1] - sp[0][1]) * k) / m]);
    } else {
      for (let k = 0; k < sp.length - 1; k++) out.push(sp[k]);
    }
  }
  return out;
}

function polyLength(p: P2[]): number {
  let L = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    L += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return L;
}

export interface TrackSolution {
  idlerZ: number;
  sagK: number;
  length: number;
  /** pin centres (z, y), links[i] spans pins[i] -> pins[i+1] */
  pins: P2[];
}

/** Solve the idler position so that `R.links` links of `R.pitch` close the loop with the given sag. */
export function solveTrack(sagK = 0.036): TrackSolution {
  const target = R.links * R.pitch;
  let lo = R.idlerZ - 0.3, hi = R.idlerZ + 0.3;
  for (let it = 0; it < 40; it++) {
    const mid = (lo + hi) / 2;
    const L = polyLength(beltPolyline(mid, sagK));
    if (L > target) hi = mid;
    else lo = mid;
  }
  const idlerZ = (lo + hi) / 2;
  const poly = beltPolyline(idlerZ, sagK);
  // cumulative lengths
  const cum: number[] = [0];
  for (let i = 1; i <= poly.length; i++) {
    const a = poly[i - 1], b = poly[i % poly.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const L = cum[cum.length - 1];
  const at = (s: number): P2 => {
    s = ((s % L) + L) % L;
    let lo2 = 0, hi2 = cum.length - 1;
    while (hi2 - lo2 > 1) {
      const m = (lo2 + hi2) >> 1;
      if (cum[m] <= s) lo2 = m;
      else hi2 = m;
    }
    const a = poly[lo2], b = poly[(lo2 + 1) % poly.length];
    const t = (s - cum[lo2]) / (cum[lo2 + 1] - cum[lo2] || 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  // phase: put a pin exactly under the middle road wheel (tidy ground run)
  const s0 = (() => {
    // the polyline starts at the arrival point on W5 (bottom run start); find s where z == wheel 3 on the bottom run
    for (let i = 0; i < poly.length; i++) if (poly[i][1] < 0.2 && poly[i][0] >= R.wheelZ[2]) return cum[i];
    return 0;
  })();
  const pins: P2[] = [];
  for (let i = 0; i < R.links; i++) pins.push(at(s0 + (i * L) / R.links));
  return { idlerZ, sagK, length: L, pins };
}

/* ------------------------------------------------------------------------------------------ */
/* Link geometry (link-local: Z along the track, +Y towards the wheels, -Y ground side, X across). */

export function linkGeometry(horned: boolean): THREE.BufferGeometry {
  const p = R.pitch, W = R.trackW;
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    const gg = (g.index ? g.toNonIndexed() : g).clone();
    gg.deleteAttribute('uv');
    parts.push(gg.applyMatrix4(m));
  };
  // main shoe plate (between the hinge rows), slightly shorter than the pitch
  add(G.rbox(W, R.plateT, p - 0.05, 0.008, 1));
  // side end pads (the outer ends of the shoe are solid across the full pitch)
  for (const sx of [-1, 1]) add(G.rbox(0.035, R.plateT * 0.9, p - 0.012, 0.006, 1), sx * (W / 2 - 0.0175), 0, 0);
  // hinge knuckles: front row even slots, rear row odd slots -> neighbours interleave
  const slots = 9, sw = (W - 0.07) / slots;
  const knR = 0.021;
  for (let i = 0; i < slots; i++) {
    const x = -W / 2 + 0.035 + sw * (i + 0.5);
    const zEdge = i % 2 === 0 ? p / 2 : -p / 2;
    add(G.cyl(knR, knR, sw - 0.006, 8), x, 0, zEdge * 0.96, 0, 0, Math.PI / 2);
  }
  // ground-side waffle grousers: transverse bars + longitudinal ribs
  const gy = -HALF_T - R.cleat / 2;
  for (const z of [-0.045, 0.0, 0.045]) add(G.box(W - 0.05, R.cleat, 0.016), 0, gy, z);
  for (const x of [-0.2, -0.1, 0.0, 0.1, 0.2]) add(G.box(0.014, R.cleat * 0.85, 0.09), x, gy + 0.0015, 0);
  // inner face: two raised wheel paths
  for (const sx of [-1, 1]) add(G.box(0.14, 0.006, p - 0.06), sx * 0.13, HALF_T + 0.003, 0);
  if (horned) {
    // cast guide horn: tapered block, rounded top
    const hg = G.lathe(
      [
        [0.0, 0],
        [0.05, 0],
        [0.045, 0.06],
        [0.034, 0.088],
        [0.02, R.horn - 0.002],
        [0.0, R.horn],
      ],
      8,
      50,
    );
    hg.scale(0.75, 1, 1.0);
    add(hg, 0, HALF_T, 0);
    // horn root web
    add(G.rbox(0.09, 0.02, 0.11, 0.006, 1), 0, HALF_T + 0.008, 0);
  }
  const merged = G.mergeGeometries(parts)!;
  return G.mergeVertices(merged, 1e-5);
}

/** Pin ends visible at both track edges (one merged geometry per link pitch). */
function pinGeometry(): THREE.BufferGeometry {
  const g1 = G.cyl(0.011, 0.011, R.trackW + 0.03, 6);
  g1.rotateZ(Math.PI / 2);
  return g1;
}

/**
 * One side's track (for the tank's left side, x = +R.trackX). Returns the group and the solution
 * (for placing the idler and phasing the sprocket).
 */
export function buildTrack(P: Pal, sol: TrackSolution): THREE.Group {
  const gH = linkGeometry(true), gF = linkGeometry(false), gPin = pinGeometry();
  const out: THREE.Object3D[] = [];
  const n = sol.pins.length;
  const X = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i < n; i++) {
    const a = sol.pins[i], b = sol.pins[(i + 1) % n];
    const dz = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dz, dy);
    const Z = new THREE.Vector3(0, dy / L, dz / L);
    const Y = new THREE.Vector3(0, dz / L, -dy / L); // inward (towards the wheels)
    const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(R.trackX, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
    const mesh = part(i % 2 === 0 ? gH : gF, P.track);
    m.decompose(mesh.position, mesh.quaternion, mesh.scale);
    out.push(mesh);
    const pin = part(gPin, P.track, { p: [R.trackX, a[1], a[0]] });
    out.push(pin);
  }
  return group(out, { name: 'track' });
}

/** Horn centre angles (radians, atan2(y - cy, z - cz)) of horned links wrapped on a wheel of centre c. */
export function hornAnglesAround(sol: TrackSolution, c: P2, r: number): number[] {
  const res: number[] = [];
  const n = sol.pins.length;
  for (let i = 0; i < n; i += 2) {
    const a = sol.pins[i], b = sol.pins[(i + 1) % n];
    const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.hypot(m[0] - c[0], m[1] - c[1]);
    if (Math.abs(d - r) < 0.03) res.push(Math.atan2(m[1] - c[1], m[0] - c[0]));
  }
  return res;
}
