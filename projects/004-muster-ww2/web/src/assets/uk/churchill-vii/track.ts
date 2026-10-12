/**
 * Churchill track: individual cast manganese-steel links (22 in wide, 7.96 in pitch) laid along a
 * belt path that runs round the full height of the hull side: flat on the ground under the eleven
 * bogies, up the sloping front run to the idler high in the nose horn, back along the level top
 * run over the pannier (on its guide rails), round the rear drive sprocket and down to the last
 * bogie. The link count is the nearest whole number for the path length (80 per side on this
 * path; the real track is quoted at 72) and the links are spaced evenly along it.
 *
 * Also exports the inset of the belt path used to shape the pannier (track frame) side plates.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { R } from './dims';
import type { Pal } from './palette';
import { merge, type P2 } from '../cromwell/util';

interface Circ {
  c: P2; // (z, y)
  r: number;
}

/** pitch-line offset from the inner (wheel) face of a link */
export const HALF_T = R.t / 2;

function circles(): Circ[] {
  const nW = R.wheelZ.length;
  // CCW seen from +X in (z, y): rear wheel -> front wheel (ground run), idler, sprocket
  return [
    { c: [R.wheelZ[nW - 1], R.pathWheelY], r: R.wheelR + HALF_T },
    { c: [R.wheelZ[0], R.pathWheelY], r: R.wheelR + HALF_T },
    { c: [R.idlerZ, R.idlerY], r: R.idlerR + HALF_T },
    { c: [R.sprocketZ, R.sprocketY], r: R.sprocketPitchR },
  ];
}

/** External tangent normal (belt outside) for a CCW belt from A to B. */
function tangentNormal(A: Circ, B: Circ): P2 {
  const dz = B.c[0] - A.c[0], dy = B.c[1] - A.c[1];
  const L = Math.hypot(dz, dy);
  const d: P2 = [dz / L, dy / L];
  const p: P2 = [d[1], -d[0]];
  const s = (A.r - B.r) / L;
  const c = Math.sqrt(Math.max(0, 1 - s * s));
  return [p[0] * c + d[0] * s, p[1] * c + d[1] * s];
}

const onCirc = (C: Circ, a: number, off = 0): P2 => [C.c[0] + Math.cos(a) * (C.r + off), C.c[1] + Math.sin(a) * (C.r + off)];
const wrap = (a: number) => {
  let x = a % (Math.PI * 2);
  if (x < 0) x += Math.PI * 2;
  return x;
};

/** Closed belt polyline in (z, y), offset outwards by `off` from the pitch line (negative = inside). */
export function beltPolyline(off = 0, step = 0.01): P2[] {
  const nodes = circles();
  const n = nodes.length;
  const dep: number[] = [], arr: number[] = [];
  for (let i = 0; i < n; i++) {
    const nn = tangentNormal(nodes[i], nodes[(i + 1) % n]);
    const a0 = Math.atan2(nn[1], nn[0]);
    dep[i] = a0;
    arr[(i + 1) % n] = a0;
  }
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const C = nodes[i];
    const a0 = arr[i], da = wrap(dep[i] - a0);
    const steps = Math.max(1, Math.ceil((da * Math.max(0.02, C.r + off)) / step));
    for (let k = 0; k < steps; k++) out.push(onCirc(C, a0 + (da * k) / steps, off));
    const P0 = onCirc(C, dep[i], off), P1 = onCirc(nodes[(i + 1) % n], dep[i], off);
    const L = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]);
    const m = Math.max(1, Math.ceil(L / (step * 2)));
    for (let k = 0; k < m; k++) out.push([P0[0] + ((P1[0] - P0[0]) * k) / m, P0[1] + ((P1[1] - P0[1]) * k) / m]);
  }
  return out;
}

export interface TrackSolution {
  length: number;
  links: number;
  /** pin centres (z, y); link i spans pins[i] -> pins[i+1] */
  pins: P2[];
}

let solCache: TrackSolution | null = null;
export function solveTrack(): TrackSolution {
  if (solCache) return solCache;
  const poly = beltPolyline(0, 0.004);
  const cum: number[] = [0];
  for (let i = 1; i <= poly.length; i++) {
    const a = poly[i - 1], b = poly[i % poly.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const L = cum[cum.length - 1];
  const links = Math.round(L / R.pitch);
  const at = (s: number): P2 => {
    s = ((s % L) + L) % L;
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (cum[m] <= s) lo = m;
      else hi = m;
    }
    const a = poly[lo], b = poly[(lo + 1) % poly.length];
    const t = (s - cum[lo]) / (cum[lo + 1] - cum[lo] || 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  // phase: a pin under the middle bogie (tidy ground run)
  const zMid = R.wheelZ[5];
  let s0 = 0;
  for (let i = 0; i < poly.length; i++) {
    if (poly[i][1] < 0.1 && poly[i][0] >= zMid) {
      s0 = cum[i];
      break;
    }
  }
  const pins: P2[] = [];
  for (let i = 0; i < links; i++) pins.push(at(s0 + (i * L) / links));
  solCache = { length: L, links, pins };
  return solCache;
}

/* ------------------------------------------------------------------------------------------ */
/* Link geometry (link-local: Z along the track, +Y towards the wheels, -Y ground side, X across). */

/** sprocket tooth windows: centre across the track and size */
export const WIN = { x: 0.15, w: 0.07, l: 0.07 };

let linkCache: THREE.BufferGeometry | null = null;
export function linkGeometry(): THREE.BufferGeometry {
  if (linkCache) return linkCache;
  const p = R.pitch, W = R.trackW, t = R.t;
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    parts.push((g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m));
  };
  // cast shoe with two sprocket windows (real holes)
  const lz = p - 0.05;
  const hw = W / 2;
  const outline: G.V2[] = [
    [-hw, -lz / 2],
    [hw, -lz / 2],
    [hw, lz / 2],
    [-hw, lz / 2],
  ];
  const holes: G.V2[][] = [];
  for (const sx of [-1, 1]) {
    const x0 = sx * WIN.x - WIN.w / 2, x1 = sx * WIN.x + WIN.w / 2;
    holes.push([
      [x0, -WIN.l / 2],
      [x0, WIN.l / 2],
      [x1, WIN.l / 2],
      [x1, -WIN.l / 2],
    ]);
  }
  const g = new THREE.ExtrudeGeometry(G.shape(outline, 0, holes), {
    depth: t - 0.008,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelOffset: -0.004,
    bevelSegments: 1,
    curveSegments: 1,
  });
  g.translate(0, 0, -(t - 0.008) / 2);
  g.rotateX(-Math.PI / 2);
  add(G.crease(g, 40));
  // hinge lugs: front row 4, rear row 3 -> neighbours interleave
  const knR = 0.022;
  const front: [number, number][] = [[-0.279, -0.2], [-0.1, -0.02], [0.02, 0.1], [0.2, 0.279]];
  const rear: [number, number][] = [[-0.19, -0.11], [-0.01, 0.01], [0.11, 0.19]];
  for (const [a, b] of front) add(G.cyl(knR, knR, b - a - 0.004, 8), (a + b) / 2, 0, p / 2 - 0.004, 0, 0, Math.PI / 2);
  for (const [a, b] of rear) {
    if (b - a < 0.05) continue;
    add(G.cyl(knR, knR, b - a - 0.004, 8), (a + b) / 2, 0, -p / 2 + 0.004, 0, 0, Math.PI / 2);
  }
  // ground-side grouser: a transverse bar across the shoe, stepped at the centre
  const gy = -t / 2 - R.cleat / 2;
  for (const sx of [-1, 1]) add(G.box(0.2, R.cleat, 0.03), sx * 0.155, gy, 0.01);
  add(G.box(0.08, R.cleat * 0.8, 0.05), 0, gy + R.cleat * 0.1, -0.01);
  // inner-face ribs either side of the wheel paths and the centre guide horn
  for (const sx of [-1, 1]) add(G.box(0.02, 0.012, lz - 0.02), sx * 0.255, t / 2 + 0.004, 0);
  const hg = G.lathe(
    [
      [0.0, 0],
      [0.05, 0],
      [0.045, 0.025],
      [0.03, 0.048],
      [0.014, R.horn - 0.003],
      [0.0, R.horn],
    ],
    8,
    50,
  );
  hg.scale(0.55, 1, 1.1);
  add(hg, 0, t / 2 - 0.002, 0);
  linkCache = G.mergeVertices(merge(parts), 1e-5);
  return linkCache;
}

function pinGeometry(): THREE.BufferGeometry {
  const g1 = G.cyl(0.011, 0.011, R.trackW + 0.01, 6, true);
  g1.rotateZ(Math.PI / 2);
  const head = G.cyl(0.018, 0.018, 0.008, 6);
  head.rotateZ(Math.PI / 2);
  head.translate(R.trackW / 2 + 0.008, 0, 0);
  return merge([g1, head]);
}

/** One side's track (for the tank's left side, x = +R.trackX). */
export function buildTrack(P: Pal, sol: TrackSolution): THREE.Group {
  const gL = linkGeometry(), gPin = pinGeometry();
  const out: THREE.Object3D[] = [];
  const n = sol.pins.length;
  const X = new THREE.Vector3(1, 0, 0);
  const links: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const a = sol.pins[i], b = sol.pins[(i + 1) % n];
    const dz = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dz, dy);
    const Z = new THREE.Vector3(0, dy / L, dz / L);
    const Y = new THREE.Vector3(0, dz / L, -dy / L); // inward (towards the wheels)
    const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(R.trackX, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
    links.push(gL.clone().applyMatrix4(m));
    links.push(gPin.clone().applyMatrix4(new THREE.Matrix4().makeTranslation(R.trackX, a[1], a[0])));
  }
  out.push(part(merge(links), P.track));
  return group(out, { name: 'track' });
}

/** Link-centre angles (atan2(y - cy, z - cz)) of links wrapped on a circle of centre c, radius r. */
export function linkAnglesAround(sol: TrackSolution, c: P2, r: number): number[] {
  const res: number[] = [];
  const n = sol.pins.length;
  for (let i = 0; i < n; i++) {
    const a = sol.pins[i], b = sol.pins[(i + 1) % n];
    const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.hypot(m[0] - c[0], m[1] - c[1]);
    if (Math.abs(d - r) < 0.03) res.push(Math.atan2(m[1] - c[1], m[0] - c[0]));
  }
  return res;
}

/** Clip a convex polygon (z, y) against the half-plane a*z + b*y + c >= 0. */
export function clipHalf(poly: P2[], a: number, b: number, c: number): P2[] {
  const out: P2[] = [];
  const f = (p: P2) => a * p[0] + b * p[1] + c;
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length];
    const fp = f(P), fq = f(Q);
    if (fp >= 0) out.push(P);
    if ((fp >= 0) !== (fq >= 0)) {
      const t = fp / (fp - fq);
      out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
    }
  }
  return out;
}

/** Simplify a dense polyline by dropping points closer than `d` to the previous kept point. */
export function thin(poly: P2[], d: number): P2[] {
  const out: P2[] = [];
  for (const p of poly) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) >= d) out.push(p);
  }
  const f = out[0], l = out[out.length - 1];
  if (out.length > 3 && Math.hypot(f[0] - l[0], f[1] - l[1]) < d * 0.5) out.pop();
  return out;
}
