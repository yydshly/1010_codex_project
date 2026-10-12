/**
 * Hanging web slings for the UK weapon models (weapon design frame; +Z muzzle, +Y up, +X left).
 *
 * hangStrap() solves the free span of a flat strap between two fittings for a gravity direction:
 *  - a short straight lead-in leaves each fitting in its own direction,
 *  - the span between the lead-ins is a catenary of (chord + slack) length,
 *  - the span is pushed clear of the weapon body (axis-aligned boxes) along one axis direction and
 *    relaxed like a taut strap draped over the obstacles,
 *  - the flat face follows the fitting orientation at both ends and twists smoothly into the natural
 *    hanging orientation (width horizontal, perpendicular to the strap) in between.
 * Helpers add the doubled ends, the brass claw tips and keepers of British web slings, and the wrap
 * of a strap round a round bar (swivel bars, butt tubes).
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V, basis, smoothstep } from './geo';

/** Axis-aligned obstacle box (design frame). */
export interface Box {
  min: [number, number, number];
  max: [number, number, number];
}
export const box = (min: [number, number, number], max: [number, number, number]): Box => ({ min, max });

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
  t: THREE.Vector3;
  n: THREE.Vector3;
  w: THREE.Vector3;
}

export interface StrapPath {
  P: THREE.Vector3[];
  N: THREE.Vector3[];
  S: number[];
  total: number;
  at(s: number): StrapFrame;
}

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
    const x = (h * i) / n;
    pts.push(P0.clone().addScaledVector(ex, x).addScaledVector(up, y(x) - c0));
  }
  return pts;
}

const tangents = (P: THREE.Vector3[]) => P.map((_, i) => P[Math.min(P.length - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize());
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
  obstacles?: Box[];
  /** Push axis for obstacle clearance: 0 = X, 1 = Y, 2 = Z; sign +1 / -1. */
  pushAxis?: 0 | 1 | 2;
  pushSign?: 1 | -1;
  /** Arc length over which the strap twists from the fitting orientation to hanging (m). */
  twist?: number;
  /** Preferred width direction when the strap hangs vertically. */
  sideHint?: THREE.Vector3;
  samples?: number;
}

export function hangStrap(A: StrapEnd, B: StrapEnd, o: HangOptions): StrapPath {
  const g = o.gravity.clone().normalize();
  const w = o.width, t = o.thickness;
  const A1 = A.p.clone().addScaledVector(A.dir, A.lead ?? 0.012);
  const B1 = B.p.clone().addScaledVector(B.dir, B.lead ?? 0.012);
  const chord = A1.distanceTo(B1);
  const side = o.sideHint ?? V(1, 0, 0);
  const cat = catenary(A1, B1, chord + Math.max(0, o.slack), g, o.samples ?? 56, side);
  let P = [A.p.clone(), ...cat, B.p.clone()];
  const nP = P.length;
  const twistLen = o.twist ?? 0.06;

  const normalsFor = (pts: THREE.Vector3[]) => {
    const T = tangents(pts);
    const S = arcLengths(pts);
    const total = S[S.length - 1];
    const Nh: THREE.Vector3[] = [];
    let prevW: THREE.Vector3 | null = null;
    for (let i = 0; i < pts.length; i++) {
      let Wv = T[i].clone().cross(g);
      if (Wv.lengthSq() < 0.04) {
        const ref = prevW ?? side;
        Wv = ref.clone().addScaledVector(T[i], -ref.dot(T[i]));
      }
      Wv.normalize();
      if (prevW && Wv.dot(prevW) < 0) Wv.negate();
      prevW = Wv.clone();
      Nh.push(Wv.clone().cross(T[i]).normalize());
    }
    if (Nh[0].dot(A.n) < 0) Nh.forEach((n) => n.negate());
    const nA = A.n.clone();
    const nB = B.n.clone().multiplyScalar(B.n.dot(Nh[Nh.length - 1]) < 0 ? -1 : 1);
    return pts.map((_, i) => {
      const sA = S[i], sB = total - S[i];
      const wA = smoothstep(0, twistLen, sA), wB = smoothstep(0, twistLen, sB);
      let n = sA < sB ? nA.clone().lerp(Nh[i], wA) : nB.clone().lerp(Nh[i], wB);
      if (n.lengthSq() < 1e-8) n = Nh[i].clone();
      n.addScaledVector(T[i], -n.dot(T[i]));
      return n.normalize();
    });
  };

  const ax = o.pushAxis ?? 1;
  const sg = o.pushSign ?? -1;
  const others = [0, 1, 2].filter((k) => k !== ax) as number[];
  if (o.obstacles?.length) {
    for (let pass = 0; pass < 3; pass++) {
      const N = normalsFor(P);
      const T = tangents(P);
      const need = new Float64Array(nP);
      for (let i = 2; i < nP - 2; i++) {
        const Wv = T[i].clone().cross(N[i]).normalize();
        const ext = (k: number) => Math.abs(Wv.getComponent(k)) * (w / 2) + Math.abs(N[i].getComponent(k)) * (t / 2);
        let req = 0;
        for (const b of o.obstacles) {
          let inside = true;
          for (const k of others) {
            const c = P[i].getComponent(k);
            if (c < b.min[k] - ext(k) || c > b.max[k] + ext(k)) {
              inside = false;
              break;
            }
          }
          if (!inside) continue;
          const cur = sg * P[i].getComponent(ax);
          const far = sg > 0 ? b.max[ax] : -b.min[ax];
          const near = sg > 0 ? b.min[ax] : -b.max[ax];
          const lim = far + ext(ax) + 0.0008;
          if (cur < lim && cur > near - ext(ax) - 0.03) req = Math.max(req, lim - cur);
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
      P = P.map((p, i) => {
        const q = p.clone();
        q.setComponent(ax, q.getComponent(ax) + sg * dx[i]);
        return q;
      });
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

/** Strap geometry along a solved path. */
export function strapGeo(P: THREE.Vector3[], N: THREE.Vector3[], width: number, thickness: number, samplesPerPoint = 4): THREE.BufferGeometry {
  return G.strap(P, width, thickness, N, { samples: Math.max(8, P.length * samplesPerPoint) });
}

/**
 * Second layer lying on one face of the path between arc lengths s0 and s1 (doubled end of a sling),
 * side = +1 / -1 chooses the face. `start` optionally prepends the end of a wrap the tail converges from.
 */
export function tailPoints(path: StrapPath, s0: number, s1: number, side: number, thickness: number, start?: THREE.Vector3, conv = 0.016): { P: THREE.Vector3[]; N: THREE.Vector3[] } {
  const P: THREE.Vector3[] = [], N: THREE.Vector3[] = [];
  const steps = 20;
  const off = thickness + 0.0003;
  for (let k = 0; k <= steps; k++) {
    const s = s0 + ((s1 - s0) * k) / steps;
    const f = path.at(s);
    let p = f.p.clone().addScaledVector(f.n, side * off);
    if (start) p = start.clone().lerp(p, smoothstep(0, conv, Math.abs(s - s0)));
    P.push(p);
    N.push(f.n.clone());
  }
  return { P, N };
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
 * Rectangular keeper / slide round a stack of `layers` strap thicknesses (frame space: the main strap
 * is centred at y = 0, extra layers stack towards +y). Brass for British web slings.
 */
export function keeper(m: THREE.Matrix4, width: number, thickness: number, layers: number, mat: THREE.Material, len = 0.008, bar = 0.0014): THREE.Object3D {
  const hw = width / 2 + 0.0008;
  const y0 = -thickness / 2 - 0.0005, y1 = thickness / 2 + (layers - 1) * (thickness + 0.0003) + 0.0005;
  const ps: THREE.Object3D[] = [
    part(G.rbox(2 * hw + 2 * bar, bar, len, 0.0005, 2), mat, { p: [0, y0 - bar / 2, 0] }),
    part(G.rbox(2 * hw + 2 * bar, bar, len, 0.0005, 2), mat, { p: [0, y1 + bar / 2, 0] }),
  ];
  for (const sx of [-1, 1]) ps.push(part(G.rbox(bar, y1 - y0 + 2 * bar, len, 0.0005, 2), mat, { p: [sx * (hw + bar / 2), (y0 + y1) / 2, 0] }));
  const gk = group(ps);
  gk.applyMatrix4(m);
  return gk;
}

/**
 * Brass claw tip of a British web sling end, lying on the strap (frame as for keeper, tip pointing
 * along +z). The tip caps the strap end and two small claws turn down through the strap below.
 */
export function clawTip(m: THREE.Matrix4, width: number, thickness: number, mat: THREE.Material, len = 0.02): THREE.Object3D {
  const hw = width / 2 + 0.0006;
  const top = thickness / 2 + 0.0006;
  const ps: THREE.Object3D[] = [];
  // folded brass cap: top and bottom leaves joined by a rounded nose
  const outline: [number, number][] = [
    [-hw, -len / 2],
    [hw, -len / 2],
    [hw, len / 2 - 0.004],
    [hw - 0.004, len / 2],
    [-hw + 0.004, len / 2],
    [-hw, len / 2 - 0.004],
  ];
  const leaf = G.plate(outline, 0.0008, 'xz', 0.0003);
  ps.push(part(leaf, mat, { p: [0, top, 0] }), part(leaf.clone(), mat, { p: [0, -top, 0] }));
  ps.push(part(G.rbox(2 * hw - 0.006, 2 * top + 0.0008, 0.0014, 0.0005, 2), mat, { p: [0, 0, len / 2 - 0.0006] }));
  // two claws at the tip, turned down through the tail into the strap below
  const drop = 2 * thickness + 0.0012;
  for (const sx of [-1, 1]) {
    ps.push(part(G.rbox(0.0028, drop + top, 0.0011, 0.0004, 1), mat, { p: [sx * hw * 0.42, top - (drop + top) / 2 + 0.0004, len / 2 + 0.0002] }));
  }
  // rivet pair
  for (const sx of [-1, 1]) ps.push(part(G.cyl(0.0012, 0.0012, 0.0006, 10), mat, { p: [sx * hw * 0.4, top + 0.0006, -len * 0.15] }));
  const gt = group(ps);
  gt.applyMatrix4(m);
  return gt;
}

/**
 * Strap wrapped half-way round a cylindrical bar (axis along `axis`) and returning parallel to itself:
 * returns points / normals from the outgoing side, round the far side of the bar, to the return side.
 * c = bar centre, r = bar radius + half strap thickness, out = direction from the bar towards the free
 * strap (perpendicular to axis), dirSide = which side of the bar the main strap lies on (perpendicular to
 * both). Points start at (c + dirSide * r) going along -out round to (c - dirSide * r).
 */
export function wrapBar(c: THREE.Vector3, axis: THREE.Vector3, r: number, out: THREE.Vector3, dirSide: THREE.Vector3, steps = 12): { P: THREE.Vector3[]; N: THREE.Vector3[] } {
  const P: THREE.Vector3[] = [], N: THREE.Vector3[] = [];
  const u = dirSide.clone().normalize();
  const o = out.clone().normalize().negate();
  for (let k = 0; k <= steps; k++) {
    const a = (Math.PI * k) / steps;
    const n = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(o, Math.sin(a));
    P.push(c.clone().addScaledVector(n, r));
    N.push(n);
  }
  void axis;
  return { P, N };
}
