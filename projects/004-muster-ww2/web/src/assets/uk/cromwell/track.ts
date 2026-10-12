/**
 * Cromwell track: 125 individual cast manganese-steel, dry-pin skeleton links per side (14 in wide,
 * 4 in pitch, a centre guide horn on every link), laid along a solved belt path: flat on the ground
 * under the road wheels, wrapped round the front idler and the rear toothed sprocket, and resting on
 * top of the road wheels with a natural sag between them (slack track, no return rollers). The idler
 * position (track tension) is solved so that exactly R.links links close the loop.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { R } from './dims';
import type { Pal } from './palette';
import { qbez, merge, type P2 } from './util';

interface Circ {
  c: P2; // (z, y)
  r: number;
}

/** pitch-line offset from the inner (wheel) face of a link */
export const HALF_T = R.plateT / 2;

function wheelCircles(idlerZ: number): { W: Circ[]; I: Circ; S: Circ } {
  const W = R.wheelZ.map((z) => ({ c: [z, R.pathWheelY] as P2, r: R.wheelR + HALF_T }));
  return {
    W,
    I: { c: [idlerZ, R.idlerY], r: R.idlerR + HALF_T },
    S: { c: [R.sprocketZ, R.sprocketY], r: R.sprocketPitchR },
  };
}

/** External tangent normal (belt on the right of travel = outside) for a CCW belt from A to B. */
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

/** The closed belt (pitch line) as a dense polyline in (z, y). */
function beltPolyline(idlerZ: number, sagK: number): P2[] {
  const { W, I, S } = wheelCircles(idlerZ);
  // loop order (CCW seen from +X): bottom run forward, idler, top run rearward over the wheels, sprocket
  const nodes: Circ[] = [W[4], W[0], I, W[0], W[1], W[2], W[3], W[4], S];
  const sag: boolean[] = [false, false, true, true, true, true, true, true, false];
  const n = nodes.length;
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
    const C = nodes[i];
    const a0 = arr[i], da = wrap(dep[i] - a0);
    const steps = Math.max(1, Math.ceil((da * C.r) / 0.006));
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
  length: number;
  /** pin centres (z, y); link i spans pins[i] -> pins[i+1] */
  pins: P2[];
}

let solCache: TrackSolution | null = null;
/** Solve the idler position so that R.links links of R.pitch close the loop with the given sag. */
export function solveTrack(sagK = 0.03): TrackSolution {
  if (solCache && solCache.sagK === sagK) return solCache;
  const target = R.links * R.pitch;
  let lo = R.idlerZ - 0.5, hi = R.idlerZ + 0.5;
  for (let it = 0; it < 44; it++) {
    const mid = (lo + hi) / 2;
    const L = polyLength(beltPolyline(mid, sagK));
    if (L > target) hi = mid;
    else lo = mid;
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
  // phase: a pin exactly under the middle road wheel (tidy ground run)
  let s0 = 0;
  for (let i = 0; i < poly.length; i++) {
    if (poly[i][1] < 0.2 && poly[i][0] >= R.wheelZ[2]) {
      s0 = cum[i];
      break;
    }
  }
  const pins: P2[] = [];
  for (let i = 0; i < R.links; i++) pins.push(at(s0 + (i * L) / R.links));
  solCache = { idlerZ, sagK, length: L, pins };
  return solCache;
}

/* ------------------------------------------------------------------------------------------ */
/* Link geometry (link-local: Z along the track, +Y towards the wheels, -Y ground side, X across). */

/** window (sprocket tooth hole) centre across the track and its size */
export const WIN = { x: 0.098, w: 0.052, l: 0.036 };

let linkCache: THREE.BufferGeometry | null = null;
export function linkGeometry(): THREE.BufferGeometry {
  if (linkCache) return linkCache;
  const p = R.pitch, W = R.trackW, t = R.plateT;
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    parts.push((g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m));
  };
  // two skeleton shoe halves, each with its sprocket window (real hole)
  const x0 = 0.026, x1 = W / 2, lz = p - 0.03;
  for (const sx of [-1, 1]) {
    // ExtrudeGeometry normalises the contour / hole orientation itself, so mirrored points are fine
    const outline: G.V2[] = [
      [sx * x0, -lz / 2],
      [sx * x1, -lz / 2],
      [sx * x1, lz / 2],
      [sx * x0, lz / 2],
    ];
    const hole: G.V2[] = [
      [sx * (WIN.x - WIN.w / 2), -WIN.l / 2],
      [sx * (WIN.x - WIN.w / 2), WIN.l / 2],
      [sx * (WIN.x + WIN.w / 2), WIN.l / 2],
      [sx * (WIN.x + WIN.w / 2), -WIN.l / 2],
    ];
    const g = new THREE.ExtrudeGeometry(G.shape(outline, 0, [hole]), {
      depth: t - 0.004,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelOffset: -0.002,
      bevelSegments: 1,
      curveSegments: 1,
    });
    g.translate(0, 0, -(t - 0.004) / 2);
    g.rotateX(-Math.PI / 2);
    add(G.crease(g, 40));
  }
  // centre bridge under the guide horn
  add(G.box(2 * x0 + 0.004, t * 0.9, lz + 0.006));
  // hinge knuckles: front row 3 lugs (edges + centre), rear row 2 lugs -> neighbours interleave
  const knR = 0.0125;
  const front: [number, number][] = [[-0.178, -0.12], [-0.035, 0.035], [0.12, 0.178]];
  const rear: [number, number][] = [[-0.114, -0.041], [0.041, 0.114]];
  for (const [a, b] of front) add(G.cyl(knR, knR, b - a - 0.004, 6), (a + b) / 2, 0, p / 2 - 0.002, 0, 0, Math.PI / 2);
  for (const [a, b] of rear) add(G.cyl(knR, knR, b - a - 0.004, 6), (a + b) / 2, 0, -p / 2 + 0.002, 0, 0, Math.PI / 2);
  // ground-side grousers: one transverse bar per half and a centre pad
  const gy = -t / 2 - R.cleat / 2;
  for (const sx of [-1, 1]) add(G.box(0.13, R.cleat, 0.016), sx * 0.107, gy, -0.006);
  add(G.box(0.05, R.cleat * 0.8, 0.03), 0, gy + R.cleat * 0.1, 0.008);
  // centre guide horn on the inner face (tapered cast tooth)
  const hg = G.lathe(
    [
      [0.0, 0],
      [0.036, 0],
      [0.032, 0.03],
      [0.022, 0.058],
      [0.012, R.horn - 0.003],
      [0.0, R.horn],
    ],
    8,
    50,
  );
  hg.scale(0.62, 1, 1.0);
  add(hg, 0, t / 2 - 0.002, 0);
  linkCache = G.mergeVertices(merge(parts), 1e-5);
  return linkCache;
}

/** Dry pin with a head on the outer end and a split-pin washer on the inner end. */
function pinGeometry(): THREE.BufferGeometry {
  const g1 = G.cyl(0.0078, 0.0078, R.trackW + 0.008, 5, true);
  g1.rotateZ(Math.PI / 2);
  const head = G.cyl(0.013, 0.013, 0.006, 6);
  head.rotateZ(Math.PI / 2);
  head.translate(R.trackW / 2 + 0.006, 0, 0);
  const tail = G.cyl(0.011, 0.011, 0.005, 6);
  tail.rotateZ(Math.PI / 2);
  tail.translate(-R.trackW / 2 - 0.007, 0, 0);
  return merge([g1, head, tail]);
}

/** One side's track (for the tank's left side, x = +R.trackX). */
export function buildTrack(P: Pal, sol: TrackSolution): THREE.Group {
  const gL = linkGeometry(), gPin = pinGeometry();
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
    out.push(part(gPin, P.track, { p: [R.trackX, a[1], a[0]] }));
  }
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
    if (Math.abs(d - r) < 0.02) res.push(Math.atan2(m[1] - c[1], m[0] - c[0]));
  }
  return res;
}
