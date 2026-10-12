/**
 * SU-76M track (belt solver adapted from the KV-1 module): individual small-pitch 300 mm links with
 * two guide horns (the single road wheels run between them), laid along a solved belt path: flat on
 * the ground under the six road wheels, rising to the FRONT drive sprocket, back over three return
 * rollers with a slight sag, round the REAR idler and down to the last road wheel. The number of links
 * is chosen for the target idler position, then the idler position is solved so the loop closes.
 *
 * Link-local frame: X across the track, +Y towards the wheels (inner face), Z along the track;
 * origin on the pitch line at the link centre.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { R } from './dims';
import type { Pal } from './palette';
import type { P2 } from './util';
import { qbez, merge, xf } from './util';

interface Circ {
  c: P2; // (z, y)
  r: number;
}

const HALF_T = R.plateT / 2;

function circles(idlerZ: number) {
  const rw = R.wheelR + HALF_T;
  return {
    W: R.wheelZ.map((z) => ({ c: [z, R.pathWheelY] as P2, r: rw })),
    I: { c: [idlerZ, R.idlerY] as P2, r: R.idlerR + HALF_T },
    RR: R.rrZ.map((z) => ({ c: [z, R.rrY] as P2, r: R.rrR + HALF_T })),
    S: { c: [R.sprocketZ, R.sprocketY] as P2, r: R.sprocketR },
  };
}

/** External tangent normal for a belt running from A to B with both circles on its left. */
function tangentNormal(A: Circ, B: Circ): P2 {
  const dz = B.c[0] - A.c[0], dy = B.c[1] - A.c[1];
  const L = Math.hypot(dz, dy);
  const d: P2 = [dz / L, dy / L];
  const p: P2 = [d[1], -d[0]];
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

function beltPolyline(idlerZ: number, sagK: number): P2[] {
  const { W, I, RR, S } = circles(idlerZ);
  const nodes: Circ[] = [W[5], W[0], S, RR[0], RR[1], RR[2], I];
  const sag: boolean[] = [false, false, true, true, true, true, false];
  const n = nodes.length;
  const dep: number[] = [], arr: number[] = [];
  const spans: P2[][] = [];
  for (let i = 0; i < n; i++) {
    const A = nodes[i], B = nodes[(i + 1) % n];
    const a0 = ang(tangentNormal(A, B));
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
    const det = dA[0] * -dB[1] - dA[1] * -dB[0];
    const rx = P2[0] - P0[0], ry = P2[1] - P0[1];
    const t = (rx * -dB[1] - ry * -dB[0]) / det;
    const Q: P2 = [P0[0] + dA[0] * t, P0[1] + dA[1] * t];
    const pts: P2[] = [];
    for (let k = 0; k <= 40; k++) pts.push(qbez(P0, Q, P2, k / 40));
    dep[i] = aA;
    arr[(i + 1) % n] = aB;
    spans.push(pts);
  }
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const C = nodes[i];
    const a0 = arr[i], da = wrap(dep[i] - a0);
    const steps = Math.max(1, Math.ceil((da * C.r) / 0.01));
    for (let k = 0; k < steps; k++) out.push(onCirc(C, a0 + (da * k) / steps));
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
  links: number;
  length: number;
  /** pin centres (z, y); links[i] spans pins[i] -> pins[i+1] */
  pins: P2[];
}

let cached: TrackSolution | null = null;

/** Choose the link count for the target idler position, then solve the idler position. */
export function solveTrack(sagK = 0.03): TrackSolution {
  if (cached && cached.sagK === sagK) return cached;
  const links = Math.round(polyLength(beltPolyline(R.idlerZ, sagK)) / R.pitch);
  const target = links * R.pitch;
  // moving the idler rearwards (more negative z) lengthens the belt
  let lo = R.idlerZ - 0.3, hi = R.idlerZ + 0.3;
  for (let it = 0; it < 40; it++) {
    const mid = (lo + hi) / 2;
    if (polyLength(beltPolyline(mid, sagK)) > target) lo = mid;
    else hi = mid;
  }
  const idlerZ = (lo + hi) / 2;
  const poly = beltPolyline(idlerZ, sagK);
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
  // phase: a pin exactly under the third road wheel
  let s0 = 0;
  for (let i = 0; i < poly.length; i++) {
    if (poly[i][1] < 0.1 && poly[i][0] >= R.wheelZ[2]) {
      s0 = cum[i];
      break;
    }
  }
  const pins: P2[] = [];
  for (let i = 0; i < links; i++) pins.push(at(s0 + (i * L) / links));
  cached = { idlerZ, sagK, links, length: L, pins };
  return cached;
}

/* ------------------------------------------------------------------------------------------ */

/** One pressed/cast small-pitch link with two guide horns and the hinge pin at its front edge. */
export function linkGeometry(): THREE.BufferGeometry {
  const p = R.pitch, W = R.trackW, t = R.plateT;
  const L = p - 0.024; // body length between the hinge rows
  const winX = 0.028, winZ = 0.022; // central sprocket window half sizes
  const gs: THREE.BufferGeometry[] = [];
  // two side shoes either side of the sprocket window, and the bridges in front of / behind it
  for (const sx of [-1, 1]) {
    const w = W / 2 - winX;
    gs.push(xf(G.rbox(w, t, L, 0.004, 1), [sx * (winX + w / 2), 0, 0]));
  }
  for (const sz of [-1, 1]) gs.push(xf(G.box(2 * winX + 0.004, t * 0.9, L / 2 - winZ), [0, 0, sz * (winZ + (L / 2 - winZ) / 2)]));
  // transverse grouser on the ground side
  gs.push(xf(G.box(W - 0.03, R.grouser + 0.002, 0.024), [0, -t / 2 - R.grouser / 2 + 0.001, -0.008]));
  // hinge knuckles: 5 slots across, front row even slots, rear row odd slots (neighbours interleave)
  const slots = 5, sw = W / slots, kr = 0.012;
  const kn = G.cyl(kr, kr, sw - 0.006, 7);
  kn.rotateZ(Math.PI / 2);
  for (let i = 0; i < slots; i++) {
    const x = -W / 2 + sw * (i + 0.5);
    const z = (i % 2 === 0 ? 1 : -1) * (p / 2 - 0.004);
    gs.push(xf(kn, [x, 0, z]));
  }
  // pin through the front knuckle row, with a small head on the outer edge
  const pin = G.cyl(0.006, 0.006, W + 0.01, 6);
  pin.rotateZ(Math.PI / 2);
  gs.push(xf(pin, [0, 0, p / 2 - 0.004]));
  // two guide horns standing on the inner face
  const hornO: G.V2[] = [[-0.04, 0], [0.04, 0], [0.026, R.horn * 0.6], [0.012, R.horn], [-0.012, R.horn], [-0.026, R.horn * 0.6]];
  const hg = G.plate(hornO, 0.022, 'zy', 0.005);
  for (const sx of [-1, 1]) gs.push(xf(hg, [sx * R.hornX, t / 2 - 0.003, 0]));
  return G.mergeVertices(merge(gs), 1e-5);
}

/** One side's track (for the vehicle's left side, x = +R.trackX). */
export function buildTrack(P: Pal, sol: TrackSolution): THREE.Group {
  const gL = linkGeometry();
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
    const mesh = part(gL, P.track);
    m.decompose(mesh.position, mesh.quaternion, mesh.scale);
    out.push(mesh);
  }
  return group(out, { name: 'track' });
}

/** Angles (atan2(y - cy, z - cz)) of the link centres wrapped round a circle of centre c and radius r. */
export function linkAnglesAround(sol: TrackSolution, c: P2, r: number): number[] {
  const res: number[] = [];
  const n = sol.pins.length;
  for (let i = 0; i < n; i++) {
    const a = sol.pins[i], b = sol.pins[(i + 1) % n];
    const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.hypot(m[0] - c[0], m[1] - c[1]);
    if (Math.abs(d - r) < 0.02) res.push(Math.atan2(m[1] - c[1], m[0] - c[0]));
  }
  return res;
}
