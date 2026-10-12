/**
 * Sling strap builder shared by the Soviet small arms (weapon-local or bore frame, metres).
 *
 * The free length hangs as a catenary between the two anchors for the given gravity direction,
 * is pushed out of simple capsule obstacles (stock, receiver, magazine ...) and swept as a flat strap.
 * Each end wraps around its attachment bar (swivel loop / dog collar) and is doubled back on
 * itself with a stitched tail, like the issue slings. The strap keeps its broad face towards the
 * weapon's side (the bars' direction sets the strap width direction).
 */
import { THREE, G, part, group } from '../../../../core/kit';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export interface SlingAnchor {
  /** Centre of the attachment bar the strap end wraps around. */
  bar: THREE.Vector3;
  /** Bar axis (unit): the strap's width direction at this end. */
  axis: THREE.Vector3;
  /** Bar radius (m). */
  r: number;
}

export interface Capsule {
  a: THREE.Vector3;
  b: THREE.Vector3;
  r: number;
}

/** Flat disc obstacle (drum / pan magazine): centre, unit axis, radius, half thickness. */
export interface Disc {
  c: THREE.Vector3;
  axis: THREE.Vector3;
  r: number;
  h: number;
}

export interface SlingSpec {
  front: SlingAnchor;
  rear: SlingAnchor;
  width: number;
  thickness: number;
  strap: THREE.Material;
  thread?: THREE.Material;
  hardware?: THREE.Material;
  /** Side the strap lives on (unit, e.g. +X): the strap face normal points this way, and a strap
   *  hanging straight along gravity bows towards it. */
  side: THREE.Vector3;
  obstacles?: Capsule[];
  discs?: Disc[];
  /** Adjustment buckle position (0 = rear end, 1 = front end) and size. */
  buckle?: { at: number; w: number; l: number };
  /** Length of the doubled, stitched tail at each end (m). */
  tail?: number;
}

/** Catenary between P0 and P1 with total length L for gravity g (unit). Returns n+1 points. */
export function catenary(P0: THREE.Vector3, P1: THREE.Vector3, L: number, g: THREE.Vector3, n: number, side: THREE.Vector3): THREE.Vector3[] {
  const up = g.clone().negate().normalize();
  const C = P1.clone().sub(P0);
  const vv = C.dot(up);
  const Ch = C.clone().addScaledVector(up, -vv);
  const h = Ch.length();
  const chord = C.length();
  const pts: THREE.Vector3[] = [];
  if (L <= chord + 1e-5) {
    for (let i = 0; i <= n; i++) pts.push(P0.clone().lerp(P1, i / n));
    return pts;
  }
  if (h < 0.02) {
    // (nearly) vertical chord: bow the strap sideways so its length is about L
    const cn = C.clone().normalize();
    const s = side.clone().addScaledVector(cn, -side.dot(cn));
    if (s.lengthSq() < 1e-8) s.set(1, 0, 0).addScaledVector(cn, -cn.x);
    s.normalize();
    const a = Math.sqrt(Math.max(0, ((L * L - chord * chord) * 3) / 16));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(P0.clone().lerp(P1, t).addScaledVector(s, 4 * a * t * (1 - t)));
    }
    return pts;
  }
  const ex = Ch.divideScalar(h);
  const target = Math.sqrt(L * L - vv * vv);
  let lo = 1e-5, hi = 1e4;
  for (let it = 0; it < 200; it++) {
    const mid = Math.sqrt(lo * hi);
    const f = 2 * mid * Math.sinh(Math.min(700, h / (2 * mid))) - target;
    if (f > 0) lo = mid;
    else hi = mid;
  }
  const a = Math.sqrt(lo * hi);
  const x0 = h / 2 - a * Math.atanh(Math.max(-0.999999, Math.min(0.999999, vv / L)));
  const y = (x: number) => a * Math.cosh((x - x0) / a);
  const c0 = y(0);
  for (let i = 0; i <= n; i++) {
    const x = (h * i) / n;
    pts.push(P0.clone().addScaledVector(ex, x).addScaledVector(up, y(x) - c0));
  }
  return pts;
}

function pushOut(P: THREE.Vector3[], caps: Capsule[], margin: number) {
  const ab = new THREE.Vector3(), ap = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 1; i < P.length - 1; i++) {
    const p = P[i];
    for (const c of caps) {
      ab.subVectors(c.b, c.a);
      ap.subVectors(p, c.a);
      const t = THREE.MathUtils.clamp(ap.dot(ab) / ab.lengthSq(), 0, 1);
      q.copy(c.a).addScaledVector(ab, t);
      const d = p.distanceTo(q);
      const need = c.r + margin;
      if (d < need) {
        const dir = d > 1e-6 ? p.clone().sub(q).divideScalar(d) : new THREE.Vector3(1, 0, 0);
        p.copy(q).addScaledVector(dir, need);
      }
    }
  }
}

function pushOutDiscs(P: THREE.Vector3[], discs: Disc[], margin: number, side: THREE.Vector3) {
  const d = new THREE.Vector3();
  for (let i = 1; i < P.length - 1; i++) {
    const p = P[i];
    for (const c of discs) {
      d.subVectors(p, c.c);
      const ax = d.dot(c.axis);
      const rad = d.clone().addScaledVector(c.axis, -ax).length();
      if (rad < c.r + margin && Math.abs(ax) < c.h + margin) {
        const sg = c.axis.dot(side) >= 0 ? 1 : -1;
        p.addScaledVector(c.axis, sg * (c.h + margin) - ax);
      }
    }
  }
}

function smoothPts(P: THREE.Vector3[], iters: number) {
  for (let k = 0; k < iters; k++) {
    const c = P.map((p) => p.clone());
    for (let i = 1; i < P.length - 1; i++) P[i].copy(c[i - 1]).add(c[i + 1]).multiplyScalar(0.5).lerp(c[i], 0.5);
  }
}

/** Where the strap leaves a bar towards a direction d (tangent point on the loop circle). */
function leavePoint(an: SlingAnchor, towards: THREE.Vector3, t: number): THREE.Vector3 {
  const d = towards.clone().sub(an.bar);
  d.addScaledVector(an.axis, -d.dot(an.axis)).normalize();
  return an.bar.clone().addScaledVector(d, an.r + t / 2);
}

export function buildSling(spec: SlingSpec, gravity: THREE.Vector3, slack = 0.12): THREE.Group {
  const g = gravity.clone().normalize();
  const w = spec.width, th = spec.thickness;
  const side = spec.side.clone().normalize();
  const out: THREE.Object3D[] = [];

  // free span: from the rear bar to the front bar (leave points face each other)
  const A = leavePoint(spec.rear, spec.front.bar, th);
  const B = leavePoint(spec.front, spec.rear.bar, th);
  const chord = A.distanceTo(B);
  const n = Math.max(24, Math.round(chord / 0.012));
  const P = catenary(A, B, chord + Math.max(0, slack), g, n, side);
  if (spec.obstacles?.length || spec.discs?.length) {
    const caps = spec.obstacles ?? [], discs = spec.discs ?? [];
    for (let k = 0; k < 5; k++) {
      pushOut(P, caps, th / 2 + 0.0015);
      pushOutDiscs(P, discs, th / 2 + 0.0015, side);
      smoothPts(P, 2);
    }
    pushOut(P, caps, th / 2 + 0.001);
    pushOutDiscs(P, discs, th / 2 + 0.001, side);
  }

  // strap face normals: width follows the bar axes (slerped), face = T x W, oriented to `side`
  const qA = new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), spec.rear.axis.clone().normalize());
  const qB = new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), spec.front.axis.clone().normalize());
  const N: THREE.Vector3[] = P.map((p, i) => {
    const T = P[Math.min(P.length - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize();
    const Wd = v(0, 1, 0).applyQuaternion(qA.clone().slerp(qB, i / (P.length - 1)));
    Wd.addScaledVector(T, -Wd.dot(T));
    if (Wd.lengthSq() < 1e-8) Wd.copy(side).cross(T);
    Wd.normalize();
    const nn = T.clone().cross(Wd).normalize();
    if (nn.dot(side) < 0) nn.negate();
    return nn;
  });
  out.push(part(G.strap(P, w, th, N, { smooth: false }), spec.strap));

  // end loops around the bars + doubled tails
  const tailL = spec.tail ?? 0.045;
  const ends: [SlingAnchor, number][] = [[spec.rear, 0], [spec.front, P.length - 1]];
  for (const [an, i0] of ends) {
    const ax = an.axis.clone().normalize();
    const p0 = P[i0];
    const e1 = p0.clone().sub(an.bar);
    e1.addScaledVector(ax, -e1.dot(ax)).normalize();
    const e2 = ax.clone().cross(e1).normalize();
    // strap continues from p0 into the span: which way round the bar?
    const inward = P[i0 === 0 ? 1 : P.length - 2].clone().sub(p0);
    const dirSign = inward.dot(e2) > 0 ? -1 : 1;
    const rr = an.r + th / 2;
    const loop: THREE.Vector3[] = [];
    const ln: THREE.Vector3[] = [];
    const steps = 14;
    for (let s = 0; s <= steps; s++) {
      const a = (dirSign * Math.PI * 2 * s) / steps * 0.97;
      const d = e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a));
      loop.push(an.bar.clone().addScaledVector(d, rr + (th * 1.05 * s) / steps));
      ln.push(d);
    }
    out.push(part(G.strap(loop, w, th, ln, { smooth: false }), spec.strap));
    // tail: parallel to the main strap, offset towards the weapon side
    const tail: THREE.Vector3[] = [];
    const tn: THREE.Vector3[] = [];
    let acc = 0;
    const step = i0 === 0 ? 1 : -1;
    for (let k = i0; k >= 0 && k < P.length; k += step) {
      const prev = P[k - step];
      if (prev) acc += P[k].distanceTo(prev);
      if (acc > tailL) break;
      tail.push(P[k].clone().addScaledVector(N[k], -th * 1.02));
      tn.push(N[k]);
    }
    if (tail.length >= 2) {
      out.push(part(G.strap(tail, w * 0.98, th, tn, { smooth: false }), spec.strap));
      if (spec.thread) {
        // two stitched bar-tacks across the doubled section
        for (const f of [0.35, 0.8]) {
          const k = Math.min(tail.length - 1, Math.round(f * (tail.length - 1)));
          const kk = i0 + step * k;
          const T = P[Math.min(P.length - 1, kk + 1)].clone().sub(P[Math.max(0, kk - 1)]).normalize();
          const Wd = N[kk].clone().cross(T).normalize();
          const c = P[kk].clone().addScaledVector(N[kk], th * 0.5 + 0.0002);
          const s = G.rod(c.clone().addScaledVector(Wd, -w * 0.42), c.clone().addScaledVector(Wd, w * 0.42), 0.0005, 5);
          out.push(part(s, spec.thread));
        }
      }
    }
  }

  // adjustment buckle: rectangular steel frame around the strap
  if (spec.buckle && spec.hardware) {
    const S: number[] = [0];
    for (let i = 1; i < P.length; i++) S.push(S[i - 1] + P[i].distanceTo(P[i - 1]));
    const target = S[S.length - 1] * spec.buckle.at;
    let i = 1;
    while (i < S.length - 1 && S[i] < target) i++;
    const T = P[i].clone().sub(P[i - 1]).normalize();
    const Nn = N[i];
    const Wd = Nn.clone().cross(T).normalize();
    const c = P[i - 1].clone().lerp(P[i], 0.5);
    const bw = spec.buckle.w, bl = spec.buckle.l, bt = 0.0032;
    // solid rectangular frame: two side bars along the strap, two cross bars and a centre roller
    const hw = bw / 2 + bt / 2, hn = th * 1.6 + bt / 2;
    const bars: THREE.BufferGeometry[] = [];
    const basis = new THREE.Matrix4().makeBasis(Wd, Nn, T);
    const bar = (w: number, h: number, l: number, off: THREE.Vector3) => {
      const g0 = G.rbox(w, h, l, Math.min(w, h, l) * 0.45, 2);
      g0.applyMatrix4(basis);
      g0.translate(c.x + off.x, c.y + off.y, c.z + off.z);
      bars.push(g0.index ? g0.toNonIndexed() : g0);
    };
    for (const sT of [-0.5, 0.5]) bar(bw + bt * 2, bt, bt, T.clone().multiplyScalar(sT * bl).addScaledVector(Nn, hn * 0.35));
    for (const sW of [-1, 1]) bar(bt, hn * 2 + bt, bl + bt, Wd.clone().multiplyScalar(sW * hw));
    bar(bw, bt * 0.9, bt * 0.9, Nn.clone().multiplyScalar(hn));
    out.push(part(G.mergeGeometries(bars)!, spec.hardware));
    // doubled strap through the buckle
    const seg: THREE.Vector3[] = [];
    const sn: THREE.Vector3[] = [];
    for (let k = Math.max(0, i - 4); k <= Math.min(P.length - 1, i + 4); k++) {
      seg.push(P[k].clone().addScaledVector(N[k], th * 1.02));
      sn.push(N[k]);
    }
    out.push(part(G.strap(seg, w * 0.98, th, sn, { smooth: false }), spec.strap));
  }
  return group(out, { name: 'sling' });
}

