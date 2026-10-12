/**
 * Hanging weapon slings shared by the German weapon models (Kar98k, MG 42). Weapon-local frame.
 *
 * hangStrap() solves the free span of a flat strap between two fittings for a gravity direction:
 *  - a straight lead-in leaves each fitting in its own direction,
 *  - the span between the lead-ins is a catenary of (chord + slack) length,
 *  - the span is pushed clear of the weapon body (oriented boxes) along one push direction, relaxed
 *    like a taut strap draped over the obstacles,
 *  - the flat face follows the fitting orientation at both ends and twists smoothly into the
 *    natural hanging orientation (width horizontal, perpendicular to the strap) in between.
 * Helpers build the doubled tail, keepers, studs and slide buckles on top of the solved path.
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V, basis, smoothstep, type V3 } from './geo';

/** Oriented box. axes[0] must be the push direction used with it. */
export interface Obb {
  c: THREE.Vector3;
  axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  h: V3;
}

/** Box with axes X / (Y, Z rotated by pitch about X). */
export function obb(c: V3, h: V3, pitchDeg = 0): Obb {
  const q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), (pitchDeg * Math.PI) / 180);
  return { c: V(...c), h, axes: [V(1, 0, 0), V(0, 1, 0).applyQuaternion(q), V(0, 0, 1).applyQuaternion(q)] };
}

/** Box from min/max corners (axis aligned). */
export function obbMinMax(min: V3, max: V3): Obb {
  return obb([(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2]);
}

export interface StrapEnd {
  /** Where the free strap leaves the fitting. */
  p: THREE.Vector3;
  /** Direction from the fitting into the free span (unit). */
  dir: THREE.Vector3;
  /** Face normal of the strap at the fitting (unit, perpendicular to dir). */
  n: THREE.Vector3;
  /** Straight lead-in length (m). */
  lead?: number;
}

export interface StrapFrame {
  p: THREE.Vector3;
  /** tangent (from end A towards end B) */
  t: THREE.Vector3;
  /** face normal */
  n: THREE.Vector3;
  /** width direction t x n */
  w: THREE.Vector3;
}

export interface StrapPath {
  P: THREE.Vector3[];
  N: THREE.Vector3[];
  S: number[];
  total: number;
  at(s: number): StrapFrame;
}

/** Catenary between P0 and P1 with total length L for gravity g (unit). Returns n+1 points. */
function catenary(P0: THREE.Vector3, P1: THREE.Vector3, L: number, g: THREE.Vector3, n: number, side: THREE.Vector3): THREE.Vector3[] {
  const up = g.clone().negate().normalize();
  const C = P1.clone().sub(P0);
  const chord = C.length();
  const v = C.dot(up);
  const Ch = C.clone().addScaledVector(up, -v);
  const h = Ch.length();
  const pts: THREE.Vector3[] = [];
  if (L <= chord + 1e-5) {
    for (let i = 0; i <= n; i++) pts.push(P0.clone().lerp(P1, i / n));
    return pts;
  }
  if (h < 0.01) {
    // (nearly) vertical chord: bow the strap sideways so its length is about L
    const cd = C.clone().normalize();
    const sd = side.clone().addScaledVector(cd, -side.dot(cd)).normalize();
    const a = Math.sqrt(Math.max(0, ((L * L - chord * chord) * 3) / 16));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(P0.clone().lerp(P1, t).addScaledVector(sd, 4 * a * t * (1 - t)));
    }
    return pts;
  }
  const ex = Ch.divideScalar(h);
  const target = Math.sqrt(Math.max(L * L - v * v, h * h * 1.000001));
  let lo = 1e-5, hi = 1e4;
  for (let it = 0; it < 200; it++) {
    const mid = Math.sqrt(lo * hi);
    const f = 2 * mid * Math.sinh(Math.min(700, h / (2 * mid))) - target;
    if (f > 0) lo = mid;
    else hi = mid;
  }
  const a = Math.sqrt(lo * hi);
  const x0 = h / 2 - a * Math.atanh(Math.max(-0.999999, Math.min(0.999999, v / L)));
  const y = (x: number) => a * Math.cosh(Math.max(-700, Math.min(700, (x - x0) / a)));
  const c0 = y(0);
  for (let i = 0; i <= n; i++) {
    // denser sampling near the low point of the curve
    const x = (h * i) / n;
    pts.push(P0.clone().addScaledVector(ex, x).addScaledVector(up, y(x) - c0));
  }
  return pts;
}

function tangents(P: THREE.Vector3[]): THREE.Vector3[] {
  return P.map((_, i) => P[Math.min(P.length - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize());
}

function arcLengths(P: THREE.Vector3[]): number[] {
  const s = [0];
  for (let i = 1; i < P.length; i++) s.push(s[i - 1] + P[i].distanceTo(P[i - 1]));
  return s;
}

export interface HangOptions {
  width: number;
  thickness: number;
  gravity: THREE.Vector3;
  slack: number;
  obstacles?: Obb[];
  /** Push direction for obstacle clearance (unit). Every obstacle's axes[0] must equal it. */
  push?: THREE.Vector3;
  /** Arc length over which the strap twists from the fitting orientation to hanging (m). */
  twist?: number;
  /** Preferred width direction when the strap hangs vertically. */
  sideHint?: THREE.Vector3;
  samples?: number;
}

/** Solve the free span of a strap between two fittings (see file header). */
export function hangStrap(A: StrapEnd, B: StrapEnd, o: HangOptions): StrapPath {
  const g = o.gravity.clone().normalize();
  const w = o.width, t = o.thickness;
  const A1 = A.p.clone().addScaledVector(A.dir, A.lead ?? 0.012);
  const B1 = B.p.clone().addScaledVector(B.dir, B.lead ?? 0.012);
  const chord = A1.distanceTo(B1);
  const side = o.sideHint ?? V(1, 0, 0);
  const cat = catenary(A1, B1, chord + Math.max(0, o.slack), g, o.samples ?? 48, side);
  let P = [A.p.clone(), ...cat, B.p.clone()];
  const nP = P.length;
  const twistLen = o.twist ?? 0.06;

  const normalsFor = (pts: THREE.Vector3[]) => {
    const T = tangents(pts);
    const S = arcLengths(pts);
    const total = S[S.length - 1];
    // natural hanging orientation: width horizontal and perpendicular to the strap
    const Nh: THREE.Vector3[] = [];
    let prevW: THREE.Vector3 | null = null;
    for (let i = 0; i < pts.length; i++) {
      let Wv = T[i].clone().cross(g);
      if (Wv.lengthSq() < 0.04) {
        // near vertical: keep the previous width direction (or the hint), made perpendicular to T
        const ref = prevW ?? side;
        Wv = ref.clone().addScaledVector(T[i], -ref.dot(T[i]));
      }
      Wv.normalize();
      if (prevW && Wv.dot(prevW) < 0) Wv.negate();
      prevW = Wv.clone();
      Nh.push(Wv.clone().cross(T[i]).normalize());
    }
    // sign continuity with the fitting normal at A
    if (Nh[0].dot(A.n) < 0) Nh.forEach((n) => n.negate());
    const nA = A.n.clone();
    const nB = B.n.clone().multiplyScalar(B.n.dot(Nh[Nh.length - 1]) < 0 ? -1 : 1);
    return pts.map((_, i) => {
      const sA = S[i], sB = total - S[i];
      const wA = smoothstep(0, twistLen, sA), wB = smoothstep(0, twistLen, sB);
      let n: THREE.Vector3;
      if (sA < sB) n = nA.clone().lerp(Nh[i], wA);
      else n = nB.clone().lerp(Nh[i], wB);
      if (n.lengthSq() < 1e-8) n = Nh[i].clone();
      n.addScaledVector(T[i], -n.dot(T[i]));
      return n.normalize();
    });
  };

  // obstacle clearance along the push direction (taut-strap relaxation), two passes
  const push = o.push ?? V(1, 0, 0);
  if (o.obstacles?.length) {
    for (let pass = 0; pass < 2; pass++) {
      const N = normalsFor(P);
      const T = tangents(P);
      const need = new Float64Array(nP);
      for (let i = 2; i < nP - 2; i++) {
        const Wv = T[i].clone().cross(N[i]).normalize();
        const ext = (ax: THREE.Vector3) => Math.abs(Wv.dot(ax)) * (w / 2) + Math.abs(N[i].dot(ax)) * (t / 2);
        let req = 0;
        for (const b of o.obstacles) {
          const d = P[i].clone().sub(b.c);
          if (Math.abs(d.dot(b.axes[1])) > b.h[1] + ext(b.axes[1])) continue;
          if (Math.abs(d.dot(b.axes[2])) > b.h[2] + ext(b.axes[2])) continue;
          const lim = b.c.dot(push) + b.h[0] + ext(push) + 0.001;
          const cur = P[i].dot(push);
          if (cur < lim && cur > b.c.dot(push) - b.h[0] - ext(push) - 0.02) req = Math.max(req, lim - cur);
        }
        need[i] = req;
      }
      const dx = Float64Array.from(need);
      for (let it = 0; it < 3000; it++) {
        let change = 0;
        for (let i = 1; i < nP - 1; i++) {
          const val = Math.max(need[i], 0.5 * (dx[i - 1] + dx[i + 1]));
          change = Math.max(change, Math.abs(val - dx[i]));
          dx[i] = val;
        }
        if (change < 1e-7) break;
      }
      P = P.map((p, i) => p.clone().addScaledVector(push, dx[i]));
    }
  }
  const N = normalsFor(P);
  const S = arcLengths(P);
  const total = S[S.length - 1];
  const at = (s: number): StrapFrame => {
    const ss = Math.max(0, Math.min(total, s));
    let i = 1;
    while (i < S.length - 1 && S[i] < ss) i++;
    const f = Math.max(0, Math.min(1, (ss - S[i - 1]) / Math.max(1e-9, S[i] - S[i - 1])));
    const p = P[i - 1].clone().lerp(P[i], f);
    const tt = P[i].clone().sub(P[i - 1]).normalize();
    const n = N[i - 1].clone().lerp(N[i], f);
    n.addScaledVector(tt, -n.dot(tt)).normalize();
    return { p, t: tt, n, w: tt.clone().cross(n).normalize() };
  };
  return { P, N, S, total, at };
}

/** Strap geometry along a solved path (or any points / normals). */
export function strapGeo(P: THREE.Vector3[], N: THREE.Vector3[], width: number, thickness: number, samplesPerPoint = 4): THREE.BufferGeometry {
  return G.strap(P, width, thickness, N, { samples: Math.max(8, P.length * samplesPerPoint) });
}

/**
 * A second layer lying on one face of the path between arc lengths s0 and s1 (the doubled end of a
 * sling). side = +1 / -1 chooses the face (along +n / -n). `start` optionally prepends points (e.g. the
 * end of a wrap) that the tail converges from over `conv` metres.
 */
export function tailGeo(path: StrapPath, s0: number, s1: number, side: number, width: number, thickness: number, start?: THREE.Vector3, conv = 0.016): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [], nr: THREE.Vector3[] = [];
  const steps = 18;
  const off = thickness + 0.0003;
  for (let k = 0; k <= steps; k++) {
    const s = s0 + ((s1 - s0) * k) / steps;
    const f = path.at(s);
    let p = f.p.clone().addScaledVector(f.n, side * off);
    if (start) {
      const c = smoothstep(0, conv, Math.abs(s - s0));
      p = start.clone().lerp(p, c);
    }
    pts.push(p);
    nr.push(f.n.clone());
  }
  // taper the tail end slightly (cut leather end)
  return G.strap(pts, width, thickness, nr, { samples: 36 });
}

/** Frame matrix at arc length s: x = width, y = face normal (towards `side`), z = tangent. */
export function frameAt(path: StrapPath, s: number, side = 1): THREE.Matrix4 {
  const f = path.at(s);
  const y = f.n.clone().multiplyScalar(side);
  const z = f.t.clone();
  const x = y.clone().cross(z).normalize();
  return basis(x, y, z, f.p);
}

/**
 * Leather keeper: closed loop around a stack of `layers` strap thicknesses (in frame space the
 * main strap is centred at y = 0, extra layers stack towards +y).
 */
export function keeper(m: THREE.Matrix4, width: number, thickness: number, layers: number, mat: THREE.Material, loopW = 0.011): THREE.Object3D {
  const hw = width / 2 + 0.0012, y0 = -thickness / 2 - 0.001, y1 = thickness / 2 + (layers - 1) * (thickness + 0.0003) + 0.001, r = 0.0016;
  const ring: THREE.Vector3[] = [];
  const nrm: THREE.Vector3[] = [];
  const cs: [number, number, number, number][] = [
    [hw - r, y1 - r, 0, 90],
    [-hw + r, y1 - r, 90, 180],
    [-hw + r, y0 + r, 180, 270],
    [hw - r, y0 + r, 270, 360],
  ];
  for (const [cx, cy, a0, a1] of cs) {
    for (let k = 0; k <= 3; k++) {
      const a = ((a0 + ((a1 - a0) * k) / 3) * Math.PI) / 180;
      ring.push(V(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0));
      nrm.push(V(Math.cos(a), Math.sin(a), 0));
    }
  }
  const k = part(G.strap(ring, loopW, 0.0019, nrm, { closed: true, smooth: false }), mat);
  const gk = group([k]);
  gk.applyMatrix4(m);
  return gk;
}

/** Two-headed stud (button) through the stack; frame as for keeper(). */
export function stud(m: THREE.Matrix4, thickness: number, layers: number, mat: THREE.Material, r = 0.0042): THREE.Object3D {
  const top = thickness / 2 + (layers - 1) * (thickness + 0.0003);
  const head = G.lathe([[0, 0], [r, 0], [r * 1.03, 0.0007], [r * 0.9, 0.0017], [r * 0.5, 0.0025], [0, 0.0027]], 20, 50);
  const parts = [
    part(head, mat, { p: [0, top, 0] }),
    part(head, mat, { p: [0, -thickness / 2, 0], r: [180, 0, 0] }),
    part(G.cyl(r * 0.5, r * 0.5, top + thickness / 2, 12), mat, { p: [0, (top - thickness / 2) / 2, 0] }),
  ];
  const gs = group(parts);
  gs.applyMatrix4(m);
  return gs;
}

/** Steel slide buckle (rectangular frame) around the stack; frame as for keeper(). */
export function slideBuckle(m: THREE.Matrix4, width: number, thickness: number, layers: number, mat: THREE.Material, len = 0.012): THREE.Object3D {
  const hw = width / 2 + 0.0018;
  const y0 = -thickness / 2 - 0.0011, y1 = thickness / 2 + (layers - 1) * (thickness + 0.0003) + 0.0011;
  const bar = 0.0017;
  const ps: THREE.Object3D[] = [
    part(G.rbox(2 * hw + 2 * bar, bar, len, 0.0006, 2), mat, { p: [0, y0 - bar / 2, 0] }),
    part(G.rbox(2 * hw + 2 * bar, bar, len, 0.0006, 2), mat, { p: [0, y1 + bar / 2, 0] }),
    // raised centre rib on the outer plate
    part(G.rbox(2 * hw - 0.006, 0.0008, len * 0.55, 0.0003, 1), mat, { p: [0, y1 + bar + 0.0003, 0] }),
  ];
  for (const sx of [-1, 1]) ps.push(part(G.rbox(bar, y1 - y0 + 2 * bar, len, 0.0006, 2), mat, { p: [sx * (hw + bar / 2), (y0 + y1) / 2, 0] }));
  const gb = group(ps);
  gb.applyMatrix4(m);
  return gb;
}
