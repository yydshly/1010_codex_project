/**
 * Hanging slings for the Japanese small arms (weapon design frames, metres); adapted from the
 * project's US small-arms kit.
 *
 * hangStrap() solves the free span of a flat strap between two fittings for a gravity direction:
 *  - a straight lead-in leaves each fitting in its own direction,
 *  - the span between the lead-ins is a catenary of (chord + slack) length,
 *  - the span is pushed clear of the weapon body (axis-aligned boxes) along ONE push direction and
 *    relaxed like a taut strap draped over the obstacles,
 *  - the flat face follows the fitting orientation at both ends and twists smoothly into the
 *    natural hanging orientation (width horizontal, perpendicular to the strap) in between.
 *
 * swivelEnd() / wrapAroundBar() build the end where the strap passes round a swivel bar and is
 * doubled back on itself; hardware helpers (keeper, M1907 hook, D-ring, web slide buckle, web end
 * tip) sit on the solved path via frameAt().
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V, basis, smoothstep, type V3 } from './geo';

/** Axis-aligned obstacle box (min / max corners). */
export interface Box {
  min: V3;
  max: V3;
}

export const box = (min: V3, max: V3): Box => ({ min, max });

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

/** Catenary between P0 and P1 with total length L for gravity g (unit). Returns n+1 points. */
export function catenary(P0: THREE.Vector3, P1: THREE.Vector3, L: number, g: THREE.Vector3, n: number, side: THREE.Vector3): THREE.Vector3[] {
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
  obstacles?: Box[];
  /** Push direction for obstacle clearance: must be a principal axis (+-X, +-Y or +-Z). */
  push?: THREE.Vector3;
  /** Arc length over which the strap twists from the fitting orientation to hanging (m). */
  twist?: number;
  /** Preferred width direction when the strap hangs vertically, and bow side for vertical chords. */
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
      let n: THREE.Vector3;
      if (sA < sB) n = nA.clone().lerp(Nh[i], wA);
      else n = nB.clone().lerp(Nh[i], wB);
      if (n.lengthSq() < 1e-8) n = Nh[i].clone();
      n.addScaledVector(T[i], -n.dot(T[i]));
      return n.normalize();
    });
  };

  const push = (o.push ?? V(1, 0, 0)).clone().normalize();
  if (o.obstacles?.length) {
    // express each box with axes[0] = push
    const ax = [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)];
    const k = Math.abs(push.x) > 0.5 ? 0 : Math.abs(push.y) > 0.5 ? 1 : 2;
    const others = [0, 1, 2].filter((i) => i !== k);
    const obs = o.obstacles.map((b) => {
      const c = V((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
      const h = [(b.max[0] - b.min[0]) / 2, (b.max[1] - b.min[1]) / 2, (b.max[2] - b.min[2]) / 2];
      return { c, a0: push, a1: ax[others[0]], a2: ax[others[1]], h0: h[k], h1: h[others[0]], h2: h[others[1]] };
    });
    for (let pass = 0; pass < 2; pass++) {
      const N = normalsFor(P);
      const T = tangents(P);
      const need = new Float64Array(nP);
      for (let i = 2; i < nP - 2; i++) {
        const Wv = T[i].clone().cross(N[i]).normalize();
        const ext = (a: THREE.Vector3) => Math.abs(Wv.dot(a)) * (w / 2) + Math.abs(N[i].dot(a)) * (t / 2);
        let req = 0;
        for (const b of obs) {
          const d = P[i].clone().sub(b.c);
          if (Math.abs(d.dot(b.a1)) > b.h1 + ext(b.a1)) continue;
          if (Math.abs(d.dot(b.a2)) > b.h2 + ext(b.a2)) continue;
          const lim = b.c.dot(push) + b.h0 + ext(push) + 0.001;
          const cur = P[i].dot(push);
          if (cur < lim && cur > b.c.dot(push) - b.h0 - ext(push) - 0.02) req = Math.max(req, lim - cur);
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
 * A second layer lying on one face of the path between arc lengths s0 and s1 (a doubled end).
 * side = +1 / -1 chooses the face (along +n / -n). `start` optionally prepends a point (e.g. the end
 * of a wrap) that the tail converges from over `conv` metres. `taper` narrows the last few mm.
 */
export function tailGeo(path: StrapPath, s0: number, s1: number, side: number, width: number, thickness: number, start?: THREE.Vector3, conv = 0.016, layer = 1): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [], nr: THREE.Vector3[] = [];
  const steps = 22;
  const off = layer * (thickness + 0.0003);
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
  return G.strap(pts, width, thickness, nr, { samples: 40 });
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
 * Where a strap passes round a swivel bar. The bar runs along `axis` (the strap's width direction);
 * `dir` is the direction in which both layers leave the bar (towards the rest of the sling).
 * `faceSide` chooses which side of the bar the main (free) layer lies on.
 */
export interface BarEnd {
  bar: THREE.Vector3;
  axis: THREE.Vector3;
  dir: THREE.Vector3;
  barR: number;
  /** unit vector perpendicular to axis and dir: the main layer lies on +faceSide * n */
  n: THREE.Vector3;
}

export function barEnd(bar: THREE.Vector3, axis: THREE.Vector3, dir: THREE.Vector3, barR: number, prefer: THREE.Vector3): BarEnd {
  const d = dir.clone().addScaledVector(axis, -dir.dot(axis)).normalize();
  let n = axis.clone().cross(d).normalize();
  if (n.dot(prefer) < 0) n.negate();
  return { bar: bar.clone(), axis: axis.clone().normalize(), dir: d, barR, n };
}

/** Free-span start at a bar end (main layer), as a StrapEnd for hangStrap(). */
export function mainLayerStart(e: BarEnd, thickness: number, lead = 0.01): StrapEnd {
  const off = e.barR + thickness / 2 + 0.0003;
  return { p: e.bar.clone().addScaledVector(e.n, off), dir: e.dir.clone(), n: e.n.clone(), lead };
}

/** Half turn of strap round the bar from the main layer (+n) to the doubled layer (-n). */
export function wrapAroundBar(e: BarEnd, width: number, thickness: number, mat: THREE.Material): { mesh: THREE.Mesh; tailStart: THREE.Vector3 } {
  const off = e.barR + thickness / 2 + 0.0003;
  const pts: THREE.Vector3[] = [], nr: THREE.Vector3[] = [];
  const back = e.dir.clone().negate();
  const lead = 0.004;
  pts.push(e.bar.clone().addScaledVector(e.n, off).addScaledVector(e.dir, lead));
  nr.push(e.n.clone());
  for (let k = 0; k <= 12; k++) {
    const a = (Math.PI * k) / 12; // 0 = +n side, pi/2 = far side of the bar, pi = -n side
    const rd = e.n.clone().multiplyScalar(Math.cos(a)).addScaledVector(back, Math.sin(a));
    pts.push(e.bar.clone().addScaledVector(rd, off));
    nr.push(rd.clone());
  }
  const tailStart = e.bar.clone().addScaledVector(e.n, -off).addScaledVector(e.dir, lead);
  pts.push(tailStart.clone());
  nr.push(e.n.clone().negate());
  return { mesh: part(G.strap(pts, width, thickness, nr, { samples: 40 }), mat), tailStart };
}

/**
 * Leather / web keeper: closed loop around a stack of `layers` strap thicknesses (frame space: the
 * main strap centred at y = 0, extra layers stacked towards +y).
 */
export function keeper(m: THREE.Matrix4, width: number, thickness: number, layers: number, mat: THREE.Material, loopW = 0.012, loopT = 0.0019): THREE.Object3D {
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
  const k = part(G.strap(ring, loopW, loopT, nrm, { closed: true, smooth: false }), mat);
  const gk = group([k]);
  gk.applyMatrix4(m);
  return gk;
}

/**
 * M1907 sling hook ("frog"): a flat pressed plate lying on the outer layer with a rolled bar at the
 * rear end and two claws turned down through the strap holes at the front. Frame as for keeper();
 * the hook lies on the +y face of the stack, its claws point towards +z.
 */
export function m1907Hook(m: THREE.Matrix4, width: number, thickness: number, layers: number, mat: THREE.Material, len = 0.042): THREE.Object3D {
  const top = thickness / 2 + (layers - 1) * (thickness + 0.0003) + 0.0003;
  const w = width - 0.004, t = 0.0014;
  const ps: THREE.Object3D[] = [];
  // plate with rounded corners, slightly domed
  const plate = G.rbox(w, t, len, 0.0006, 2);
  const pos = plate.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setY(i, pos.getY(i) + 0.0006 * (1 - (2 * x / w) ** 2));
  }
  plate.computeVertexNormals();
  ps.push(part(plate, mat, { p: [0, top + t / 2, 0] }));
  // rolled bar at the rear end (the loop of the other strap end passes round it)
  const bar = new THREE.CylinderGeometry(0.0022, 0.0022, w + 0.001, 14);
  bar.rotateZ(Math.PI / 2);
  ps.push(part(bar, mat, { p: [0, top + 0.0012, -len / 2 + 0.0005] }));
  // pressed centre rib
  ps.push(part(G.rbox(0.004, 0.0008, len * 0.62, 0.0003, 1), mat, { p: [0, top + t + 0.0006, 0.002] }));
  // two claws bent down over the front end
  for (const sx of [-1, 1]) {
    ps.push(part(G.rbox(0.0034, 0.0046, 0.0016, 0.0005, 1), mat, { p: [sx * (w / 2 - 0.004), top - 0.0012, len / 2 - 0.0008] }));
  }
  const gh = group(ps);
  gh.applyMatrix4(m);
  return gh;
}

/** Wire D-ring lying across the strap (frame as for keeper(); ring plane = the strap's face plane). */
export function dRing(m: THREE.Matrix4, width: number, mat: THREE.Material, r = 0.0021, depth = 0.016): THREE.Object3D {
  const hw = width / 2 + 0.002;
  const pts: THREE.Vector3[] = [];
  // straight bar across the strap (along x) and the D bow towards +z
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / n;
    pts.push(V(hw * Math.sin(a) * 1.0, 0, depth * 0.35 + Math.cos(a) * depth * 0.65));
  }
  pts.push(V(hw * 0.75, 0, 0.0005), V(0, 0, 0), V(-hw * 0.75, 0, 0.0005));
  const ring = part(G.tube(pts, r, 10, 60, true), mat);
  const gr = group([ring]);
  gr.applyMatrix4(m);
  return gr;
}

/** Steel slide buckle (rectangular frame) around the stack; frame as for keeper(). */
export function slideBuckle(m: THREE.Matrix4, width: number, thickness: number, layers: number, mat: THREE.Material, len = 0.012): THREE.Object3D {
  const hw = width / 2 + 0.0018;
  const y0 = -thickness / 2 - 0.0011, y1 = thickness / 2 + (layers - 1) * (thickness + 0.0003) + 0.0011;
  const bar = 0.0017;
  const ps: THREE.Object3D[] = [
    part(G.rbox(2 * hw + 2 * bar, bar, len, 0.0006, 2), mat, { p: [0, y0 - bar / 2, 0] }),
    part(G.rbox(2 * hw + 2 * bar, bar, len, 0.0006, 2), mat, { p: [0, y1 + bar / 2, 0] }),
    part(G.rbox(2 * hw - 0.006, 0.0008, len * 0.55, 0.0003, 1), mat, { p: [0, y1 + bar + 0.0003, 0] }),
  ];
  for (const sx of [-1, 1]) ps.push(part(G.rbox(bar, y1 - y0 + 2 * bar, len, 0.0006, 2), mat, { p: [sx * (hw + bar / 2), (y0 + y1) / 2, 0] }));
  const gb = group(ps);
  gb.applyMatrix4(m);
  return gb;
}

/**
 * Web-sling adjusting buckle (open frame with a centre bar the web passes round, and a claw), as
 * on the M1923-pattern cotton web slings. Frame as for keeper(); length along z.
 */
export function webBuckle(m: THREE.Matrix4, width: number, thickness: number, layers: number, mat: THREE.Material, len = 0.026): THREE.Object3D {
  const hw = width / 2 + 0.0022;
  const y0 = -thickness / 2 - 0.0012, y1 = thickness / 2 + (layers - 1) * (thickness + 0.0003) + 0.0012;
  const r = 0.0014;
  const ps: THREE.Object3D[] = [];
  // side rails
  for (const sx of [-1, 1]) {
    ps.push(part(G.rbox(0.0026, y1 - y0 + 2 * r, len, 0.0008, 2), mat, { p: [sx * (hw + 0.0013), (y0 + y1) / 2, 0] }));
  }
  // cross bars (front, centre, rear) above and below the stack
  for (const [zz, yy] of [[-len / 2 + r, y1 + r], [len / 2 - r, y1 + r], [0, y1 + r], [-len / 2 + r, y0 - r], [len / 2 - r, y0 - r]] as const) {
    const b = new THREE.CylinderGeometry(r, r, 2 * hw + 0.0052, 10);
    b.rotateZ(Math.PI / 2);
    ps.push(part(b, mat, { p: [0, yy, zz] }));
  }
  const gb = group(ps);
  gb.applyMatrix4(m);
  return gb;
}

/** Stamped end tip (chape) on the free end of a web strap; frame as for keeper(), tip end at z = 0. */
export function webTip(m: THREE.Matrix4, width: number, thickness: number, mat: THREE.Material, len = 0.014): THREE.Object3D {
  const w = width + 0.0014, t = thickness + 0.0014;
  const g = G.rbox(w, t, len, 0.0006, 2);
  const gt = group([part(g, mat, { p: [0, 0, -len / 2] })]);
  gt.applyMatrix4(m);
  return gt;
}

/** Row of stitches across a strap (small raised thread bars) at frame m. */
export function stitchRow(m: THREE.Matrix4, width: number, thickness: number, mat: THREE.Material, n = 7, layerTop = 0): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const y = thickness / 2 + layerTop + 0.0002;
  for (let i = 0; i < n; i++) {
    const x = -width / 2 + 0.003 + ((width - 0.006) * i) / Math.max(1, n - 1);
    ps.push(part(G.rbox(0.0009, 0.0006, 0.0024, 0.0002, 1), mat, { p: [x, y, 0] }));
  }
  const gs = group(ps);
  gs.applyMatrix4(m);
  return gs;
}
