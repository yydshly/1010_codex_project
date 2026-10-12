/**
 * MP 40 leather sling builder (bore frame, see mp40.model.ts).
 *
 * Construction follows the issue sling: dark-brown leather strap with an impressed line along each
 * border. REAR: the strap is threaded through the slot in the grip frame (lower housing) behind the
 * pistol grip, wrapped around the housing bottom and buttoned back on itself with a two-headed stud
 * and a keeper. FRONT: it wraps around the strap loop on the barrel collar (right side) and is held
 * doubled by a stud and the steel clamp buckle (Klemmstueck).
 *
 * The free length hangs as a catenary for the given gravity direction, then is pushed out to the
 * weapon's right side around simple collision boxes (magazine, grip, housing ...) like a taut strap.
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { MAT } from './materials';
import { basis, F } from './geo';

export interface SlingObstacle {
  c: THREE.Vector3;
  /** Local axes (unit). axes[0] must be +X (world) so the right-side push stays along -X. */
  axes: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  h: [number, number, number];
}

export interface SlingSpec {
  width: number;
  thickness: number;
  /** Vertical bar of the front strap loop (centre), bar radius, half-length of the straight bar. */
  front: { bar: THREE.Vector3; barR: number };
  /** Rear: slot through the grip frame. z = slot centre, hw = housing half width, yBottom = housing bottom, ySlot = slot centre height. */
  rear: { z: number; hw: number; yBottom: number; ySlot: number };
  obstacles: SlingObstacle[];
}

const X = new THREE.Vector3(1, 0, 0);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Catenary between P0 and P1 with total length L for gravity g (unit). Returns n+1 points. */
function catenary(P0: THREE.Vector3, P1: THREE.Vector3, L: number, g: THREE.Vector3, n: number, fallbackSide: THREE.Vector3): THREE.Vector3[] {
  const up = g.clone().negate().normalize();
  const C = P1.clone().sub(P0);
  const v = C.dot(up);
  const Ch = C.clone().addScaledVector(up, -v);
  const h = Ch.length();
  const chord = C.length();
  const pts: THREE.Vector3[] = [];
  if (L <= chord + 1e-5) {
    for (let i = 0; i <= n; i++) pts.push(P0.clone().lerp(P1, i / n));
    return pts;
  }
  if (h < 0.015) {
    // (nearly) vertical chord: bow the strap sideways (parabolic) so its length is about L
    const side = fallbackSide.clone().addScaledVector(C.clone().normalize(), -fallbackSide.dot(C.clone().normalize())).normalize();
    const a = Math.sqrt(Math.max(0, (L * L - chord * chord) * 3 / 16));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(P0.clone().lerp(P1, t).addScaledVector(side, 4 * a * t * (1 - t)));
    }
    return pts;
  }
  const ex = Ch.divideScalar(h);
  const target = Math.sqrt(L * L - v * v);
  // solve 2a sinh(h / 2a) = target for a (monotonic decreasing in a)
  let lo = 1e-5, hi = 1e4;
  for (let it = 0; it < 200; it++) {
    const mid = Math.sqrt(lo * hi);
    const f = 2 * mid * Math.sinh(Math.min(700, h / (2 * mid))) - target;
    if (f > 0) lo = mid;
    else hi = mid;
  }
  const a = Math.sqrt(lo * hi);
  const x0 = h / 2 - a * Math.atanh(Math.max(-0.999999, Math.min(0.999999, v / L)));
  const y = (x: number) => a * Math.cosh((x - x0) / a);
  const c0 = y(0);
  for (let i = 0; i <= n; i++) {
    const x = (h * i) / n;
    pts.push(P0.clone().addScaledVector(ex, x).addScaledVector(up, y(x) - c0));
  }
  return pts;
}

function tangents(P: THREE.Vector3[]): THREE.Vector3[] {
  return P.map((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    return b.clone().sub(a).normalize();
  });
}

function arcLengths(P: THREE.Vector3[]): number[] {
  const s = [0];
  for (let i = 1; i < P.length; i++) s.push(s[i - 1] + P[i].distanceTo(P[i - 1]));
  return s;
}

/** Sample position/normal on a polyline at arc length s. */
function sampleAt(P: THREE.Vector3[], N: THREE.Vector3[], S: number[], s: number) {
  let i = 1;
  while (i < S.length - 1 && S[i] < s) i++;
  const t = Math.max(0, Math.min(1, (s - S[i - 1]) / Math.max(1e-9, S[i] - S[i - 1])));
  const p = P[i - 1].clone().lerp(P[i], t);
  const n = N[i - 1].clone().lerp(N[i], t).normalize();
  const T = P[i].clone().sub(P[i - 1]).normalize();
  n.addScaledVector(T, -n.dot(T)).normalize();
  return { p, n, T };
}

function domeHead(r: number, h: number): THREE.BufferGeometry {
  return F.lathe([[0, 0], [r, 0], [r * 1.04, h * 0.25], [r * 0.9, h * 0.65], [r * 0.5, h * 0.93], [0, h]], 20, 50);
}

export function buildSling(spec: SlingSpec, gravity: THREE.Vector3, slack: number): THREE.Group {
  const w = spec.width, t = spec.thickness;
  const g = gravity.clone().normalize();
  const leather = MAT.leather(), line = MAT.leatherLine(), steel = MAT.blued();
  const out: THREE.Object3D[] = [];

  // ---- anchors
  const bar = spec.front.bar;
  const rw = spec.front.barR + t / 2 + 0.0002;
  const FA = new THREE.Vector3(bar.x + rw, bar.y, bar.z);
  const FA2 = FA.clone().add(new THREE.Vector3(0, 0, -0.012));
  const { z: zs, hw, yBottom: yB, ySlot } = spec.rear;
  const RA = new THREE.Vector3(-hw + t / 2, yB - 0.0016, zs);
  const RB = RA.clone().add(new THREE.Vector3(-0.0015, -0.016, 0));

  // ---- free length as a catenary (lead-in segments at both ends)
  const chord = RB.distanceTo(FA2);
  const cat = catenary(RB, FA2, chord + Math.max(0, slack), g, 44, X.clone().negate());
  let P: THREE.Vector3[] = [RA.clone(), ...cat, FA.clone()];
  const nP = P.length;

  // ---- orientation: ends keep the attachment orientation, the free part hangs flat (width horizontal)
  const sag = (() => {
    let m = 0;
    for (const p of cat) {
      const d = p.clone().sub(RB);
      const along = FA2.clone().sub(RB).normalize();
      const perp = d.addScaledVector(along, -d.dot(along)).length();
      if (perp > m) m = perp;
    }
    return m;
  })();
  const twist = smooth(0.004, 0.04, sag);
  const normalsFor = (pts: THREE.Vector3[]) => {
    const T = tangents(pts);
    const S = arcLengths(pts);
    const total = S[S.length - 1];
    const nRear = X.clone(); // width along Z at the slot
    const nFront = X.clone().negate(); // width along Y at the front loop
    return pts.map((_, i) => {
      const Ti = T[i];
      let W = Ti.clone().cross(g);
      if (W.lengthSq() < 1e-6) W = Ti.clone().cross(new THREE.Vector3(0, 0, 1));
      W.normalize();
      const Nm = W.clone().cross(Ti).normalize(); // in the vertical plane, perpendicular to the strap
      if (Nm.dot(g) < 0) Nm.negate(); // outer face towards the ground
      const sR = S[i], sF = total - S[i];
      const wR = smooth(0.012, 0.095, sR), wF = smooth(0.02, 0.11, sF);
      const wMid = Math.min(wR, wF) * twist;
      const nEnd = sR < sF ? nRear : nFront;
      return nEnd.clone().lerp(Nm, wMid).normalize();
    });
  };

  // ---- push the strap out to the right of the obstacles (taut-string relaxation)
  for (let pass = 0; pass < 2; pass++) {
    const N = normalsFor(P);
    const T = tangents(P);
    const need = new Float64Array(nP);
    for (let i = 1; i < nP - 1; i++) {
      const Wv = T[i].clone().cross(N[i]).normalize();
      const ext = (ax: THREE.Vector3) => Math.abs(Wv.dot(ax)) * (w / 2) + Math.abs(N[i].dot(ax)) * (t / 2);
      let req = 0;
      for (const o of spec.obstacles) {
        const d = P[i].clone().sub(o.c);
        const ly = d.dot(o.axes[1]), lz = d.dot(o.axes[2]);
        if (Math.abs(ly) > o.h[1] + ext(o.axes[1]) || Math.abs(lz) > o.h[2] + ext(o.axes[2])) continue;
        const limit = o.c.x - o.h[0] - ext(X) - 0.0012;
        if (P[i].x > limit) req = Math.min(req, limit - P[i].x);
      }
      need[i] = req;
    }
    const dx = Float64Array.from(need);
    for (let it = 0; it < 4000; it++) {
      let change = 0;
      for (let i = 1; i < nP - 1; i++) {
        const v = Math.min(need[i], 0.5 * (dx[i - 1] + dx[i + 1]));
        change = Math.max(change, Math.abs(v - dx[i]));
        dx[i] = v;
      }
      if (change < 1e-7) break;
    }
    P = P.map((p, i) => p.clone().add(new THREE.Vector3(dx[i], 0, 0)));
  }
  const N = normalsFor(P);
  const S = arcLengths(P);
  const total = S[S.length - 1];

  // ---- main strap + impressed border lines (both faces)
  out.push(part(F.strap(P, w, t, N, { samples: nP * 4 }), leather));
  const T = tangents(P);
  for (const side of [-1, 1]) {
    for (const face of [-1, 1]) {
      const pts = P.map((p, i) => {
        const Wv = T[i].clone().cross(N[i]).normalize();
        return p.clone().addScaledVector(Wv, side * (w / 2 - 0.0026)).addScaledVector(N[i], face * (t / 2 + 0.00008));
      });
      out.push(part(F.strap(pts, 0.0008, 0.00018, N, { samples: nP * 4 }), line));
    }
  }

  // ---- doubled tails, studs, keeper and buckle
  // side of the main strap the doubled tail lies on: fixed per end (the strap normal twists along the
  // length, so the sign is taken where the strap leaves its attachment, pointing away from the gun)
  const sideAt = (s: number) => (sampleAt(P, N, S, s).n.x <= 0 ? 1 : -1);
  const signRear = sideAt(0.0005), signFront = sideAt(total - 0.0005);
  const outward = (n: THREE.Vector3, s: number) => n.clone().multiplyScalar(s < total / 2 ? signRear : signFront);
  const off = t + 0.0002;
  const tail = (s0: number, s1: number, extra: THREE.Vector3[]) => {
    const pts: THREE.Vector3[] = [], nr: THREE.Vector3[] = [];
    const steps = 14;
    for (let k = 0; k <= steps; k++) {
      const s = s0 + ((s1 - s0) * k) / steps;
      const q = sampleAt(P, N, S, s);
      pts.push(q.p.clone().addScaledVector(outward(q.n, s), off));
      nr.push(q.n);
    }
    return { pts: [...extra, ...pts], nr };
  };
  const frame = (s: number) => {
    const q = sampleAt(P, N, S, s);
    const d = outward(q.n, s);
    const lx = d.clone().cross(q.T).normalize();
    return { m: basis(lx, d, q.T, q.p), q, d };
  };

  // rear wrap through the slot and around the housing bottom (plane z = zs, width along Z)
  const xo = -hw - t / 2 - 0.0002;
  const wrapPts: THREE.Vector3[] = [
    new THREE.Vector3(xo, RA.y, zs),
    new THREE.Vector3(xo, yB - 0.0004, zs),
    new THREE.Vector3(xo, ySlot - 0.0012, zs),
    new THREE.Vector3(-hw - 0.0004, ySlot, zs),
    new THREE.Vector3(0, ySlot + 0.0002, zs),
    new THREE.Vector3(hw + 0.0004, ySlot, zs),
    new THREE.Vector3(hw + t / 2 + 0.0002, ySlot - 0.0013, zs),
    new THREE.Vector3(hw + t / 2 + 0.0002, yB + 0.0010, zs),
    new THREE.Vector3(hw - 0.0014, yB - t / 2 - 0.0002, zs),
    new THREE.Vector3(-hw + 0.0045, yB - t / 2 - 0.0002, zs),
    new THREE.Vector3(RA.x, yB - 0.0036, zs),
    RA.clone(),
  ];
  const wrapN: THREE.Vector3[] = [
    [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [1, 0, 0], [1, 0, 0], [0, -1, 0], [0, -1, 0], [1, 0, 0], [1, 0, 0],
  ].map((a) => new THREE.Vector3(...(a as [number, number, number])));
  out.push(part(F.strap(wrapPts, w, t, wrapN, { samples: 90 }), leather));
  // rear tail (outer layer) from the wrap down along the main strap
  const rearTail = tail(0.0, 0.034, []);
  rearTail.pts[0] = new THREE.Vector3(xo, RA.y, zs);
  out.push(part(F.strap(rearTail.pts, w, t, rearTail.nr, { samples: 40 }), leather));

  // front: wrap around the loop bar (horizontal plane at bar.y, width along Y) and the outer tail
  const wrapF: THREE.Vector3[] = [], wrapFN: THREE.Vector3[] = [];
  for (let k = 0; k <= 12; k++) {
    const a = (Math.PI * k) / 12;
    const c = Math.cos(a), s = Math.sin(a);
    wrapF.push(new THREE.Vector3(bar.x + rw * c, bar.y, bar.z + rw * s));
    wrapFN.push(new THREE.Vector3(c, 0, s));
  }
  out.push(part(F.strap(wrapF, w, t, wrapFN, { samples: 36 }), leather));
  const sF0 = total; // front end
  const frontTail = (() => {
    const pts: THREE.Vector3[] = [new THREE.Vector3(bar.x - rw, bar.y, bar.z)];
    const nr: THREE.Vector3[] = [X.clone().negate()];
    const steps = 16;
    for (let k = 1; k <= steps; k++) {
      const s = sF0 - (0.072 * k) / steps;
      const q = sampleAt(P, N, S, s);
      const conv = smooth(0.0, 0.016, sF0 - s);
      const base = q.p.clone().addScaledVector(outward(q.n, s), off);
      const start = new THREE.Vector3(bar.x - rw, q.p.y, q.p.z);
      pts.push(start.lerp(base, conv));
      nr.push(q.n);
    }
    return { pts, nr };
  })();
  out.push(part(F.strap(frontTail.pts, w, t, frontTail.nr, { samples: 50 }), leather));

  // studs (two-headed buttons) through both layers
  const head = domeHead(0.0042, 0.0027);
  const stud = (s: number) => {
    const { m } = frame(s);
    const parts: THREE.Object3D[] = [];
    // local y = outward: main strap spans -t/2..t/2, tail spans off-t/2..off+t/2
    parts.push(part(head, steel, { p: [0, off + t / 2, 0] }));
    parts.push(part(head, steel, { p: [0, -t / 2, 0], r: [180, 0, 0] }));
    parts.push(part(G.cyl(0.0021, 0.0021, off + t, 12), steel, { p: [0, off / 2, 0] }));
    const gr = group(parts);
    gr.applyMatrix4(m);
    return gr;
  };
  out.push(stud(0.012));
  out.push(stud(total - 0.030));

  // keeper (leather loop) around both layers at the rear
  const keeper = (s: number) => {
    const { m } = frame(s);
    const hwk = w / 2 + 0.0011, y0 = -t / 2 - 0.0010, y1 = off + t / 2 + 0.0010, r = 0.0016;
    const ring: THREE.Vector3[] = [];
    const nrm: THREE.Vector3[] = [];
    const cs: [number, number, number, number][] = [
      [hwk - r, y1 - r, 0, 90], [-hwk + r, y1 - r, 90, 180], [-hwk + r, y0 + r, 180, 270], [hwk - r, y0 + r, 270, 360],
    ];
    for (const [cx, cy, a0, a1] of cs) {
      for (let k = 0; k <= 3; k++) {
        const a = G.deg(a0 + ((a1 - a0) * k) / 3);
        ring.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0));
        nrm.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
      }
    }
    const gk = part(F.strap(ring, 0.0095, 0.0019, nrm, { closed: true, smooth: false }), leather);
    gk.applyMatrix4(m);
    return gk;
  };
  out.push(keeper(0.025));

  // clamp buckle (Klemmstueck) around both layers at the front tail end
  const buckle = (s: number) => {
    const { m } = frame(s);
    const hwb = w / 2 + 0.0019;
    const y0 = -t / 2 - 0.0012, y1 = off + t / 2 + 0.0012;
    const L = 0.011;
    const ps: THREE.Object3D[] = [];
    ps.push(part(G.rbox(2 * hwb + 0.0022, 0.0016, L, 0.0006, 2), steel, { p: [0, y0 - 0.0008, 0] }));
    // outer clamp plate, slightly domed (two stacked plates)
    ps.push(part(G.rbox(2 * hwb + 0.0022, 0.0016, L, 0.0006, 2), steel, { p: [0, y1 + 0.0008, 0] }));
    ps.push(part(G.rbox(2 * hwb - 0.004, 0.0009, L * 0.72, 0.0004, 2), steel, { p: [0, y1 + 0.0019, 0.0006] }));
    for (const sx of [-1, 1]) ps.push(part(G.rbox(0.0020, y1 - y0 + 0.0032, L, 0.0006, 2), steel, { p: [sx * (hwb + 0.0001), (y0 + y1) / 2, 0] }));
    const gb = group(ps);
    gb.applyMatrix4(m);
    return gb;
  };
  out.push(buckle(total - 0.062));

  const res = group(out);
  res.name = 'mp40-sling';
  return res;
}
