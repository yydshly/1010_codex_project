/**
 * DP-27 sling: khaki cotton-webbing strap between the wire loop on the barrel jacket and the
 * swivel on the left side of the butt. The strap is solved as a hanging chain (position-based
 * relaxation under the given gravity, with the weapon body as a collision field), so it hangs
 * naturally for any weapon pose. Ends wrap their bars and fold back; a steel frame buckle sits on
 * the front fold, keepers hold the folds, and the rear D-ring swings to follow the strap.
 *
 * All positions are in the DP-27 DESIGN frame (see dp27.model.ts); the caller offsets the result.
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { dpMat } from './materials';

export type Sdf = (x: number, y: number, z: number) => number;

export interface SlingSetup {
  /** Centre of the front wire where the strap wraps. */
  frontBar: THREE.Vector3;
  /** Rear swivel pin centre (where the ring pivots). */
  rearPivot: THREE.Vector3;
  /** Rear pin axis (unit, pointing out of the stock). */
  rearAxis: THREE.Vector3;
  /** Distance from the rear pin to the ring's strap bar. */
  ringReach: number;
  /** Side the strap lies against (unit), e.g. the weapon's left (+X). */
  outward: THREE.Vector3;
  /** Collision field of the weapon body (negative inside). */
  sdf: Sdf;
  width?: number;
  thickness?: number;
}

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function gradient(f: Sdf, p: THREE.Vector3, e = 0.0007): THREE.Vector3 {
  const gx = f(p.x + e, p.y, p.z) - f(p.x - e, p.y, p.z);
  const gy = f(p.x, p.y + e, p.z) - f(p.x, p.y - e, p.z);
  const gz = f(p.x, p.y, p.z + e) - f(p.x, p.y, p.z - e);
  const g = V(gx, gy, gz);
  const l = g.length();
  return l > 1e-9 ? g.multiplyScalar(1 / l) : V(0, 1, 0);
}

/** Hanging-chain solve between fixed ends A and B with total length L. */
function solveChain(A: THREE.Vector3, B: THREE.Vector3, Lin: number, grav: THREE.Vector3, outward: THREE.Vector3, sdf: Sdf, margin: number, N = 56): THREE.Vector3[] {
  const chord = B.clone().sub(A);
  const D = chord.length();
  const L = Math.max(Lin, D * 1.0005);
  const up = grav.clone().negate();
  // exact catenary in the vertical plane through A and B (x along the horizontal part of the chord)
  const Y = chord.dot(up);
  const hvec = chord.clone().addScaledVector(up, -Y);
  const X = hvec.length();
  let p: THREE.Vector3[];
  if (X > 0.02 * L && L > Math.abs(Y) * 1.0001) {
    const h = hvec.normalize();
    const target = Math.sqrt(L * L - Y * Y);
    let lo = 1e-5, hi = 1e4;
    for (let k = 0; k < 200; k++) {
      const a = Math.sqrt(lo * hi);
      if (2 * a * Math.sinh(X / (2 * a)) > target) lo = a;
      else hi = a;
    }
    const a = Math.sqrt(lo * hi);
    const kk = X / (2 * a), m = Math.atanh(Math.max(-0.999999, Math.min(0.999999, Y / L)));
    const u1 = m - kk;
    const c = -a * Math.cosh(u1);
    const s1 = Math.sinh(u1);
    p = Array.from({ length: N + 1 }, (_, i) => {
      const s = (i / N) * L;
      const u = Math.asinh(s1 + s / a);
      const x = a * (u - u1);
      const y = a * Math.cosh(u) + c;
      return A.clone().addScaledVector(h, x).addScaledVector(up, y);
    });
    p[N].copy(B);
  } else {
    // (nearly) vertical chord: the strap hangs in a U below the lower end, a little to the outside
    const low = Y < 0 ? B : A;
    const drop = Math.max(0.005, (L - Math.abs(Y)) / 2);
    const side = outward.clone().addScaledVector(up, -outward.dot(up)).normalize().multiplyScalar(0.012);
    const mid = low.clone().addScaledVector(grav, drop).add(side);
    const curveP = new THREE.CatmullRomCurve3([A.clone(), (Y < 0 ? A : B).clone().lerp(mid, 0.5).add(side), mid, low.clone().lerp(mid, 0.4).add(side.clone().multiplyScalar(0.5)), B.clone()]);
    p = curveP.getSpacedPoints(N);
  }
  const rest = L / N;
  const push = (i: number) => {
    const q = p[i];
    const d = sdf(q.x, q.y, q.z);
    if (d < margin) q.addScaledVector(gradient(sdf, q), margin - d);
  };
  const constrain = (forward: boolean) => {
    for (let k = 0; k < N; k++) {
      const i = forward ? k : N - 1 - k;
      const a = p[i], b = p[i + 1];
      const d = b.clone().sub(a);
      const len = d.length() || 1e-9;
      const diff = (len - rest) / len;
      if (i === 0) b.addScaledVector(d, -diff);
      else if (i + 1 === N) a.addScaledVector(d, diff);
      else {
        a.addScaledVector(d, diff * 0.5);
        b.addScaledVector(d, -diff * 0.5);
      }
    }
  };
  // relax only against the weapon body: small gravity bias, strong length constraints
  for (let it = 0; it < 80; it++) {
    for (let i = 1; i < N; i++) p[i].addScaledVector(grav, 0.00025);
    for (let pass = 0; pass < 24; pass++) constrain(pass % 2 === 0);
    for (let i = 1; i < N; i++) push(i);
  }
  for (let pass = 0; pass < 40; pass++) {
    constrain(pass % 2 === 0);
    if (pass % 4 === 3) for (let i = 1; i < N; i++) push(i);
  }
  return p;
}

/** Rectangular-section ribbon with chamfered edges, per-node face normals and widths. */
function ribbon(pts: THREE.Vector3[], nrm: THREE.Vector3[], widths: number[], t: number): THREE.BufferGeometry {
  const n = pts.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const ch = Math.min(t * 0.35, 0.0006);
  const ringN = 8;
  for (let i = 0; i < n; i++) {
    const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(n - 1, i + 1)];
    const tg = next.clone().sub(prev).normalize();
    const N = nrm[i].clone().addScaledVector(tg, -nrm[i].dot(tg)).normalize();
    const B = tg.clone().cross(N).normalize();
    const hw = widths[i] / 2, ht = t / 2;
    // chamfered rectangle (x along B, y along N)
    const sec: [number, number][] = [
      [-hw + ch, ht], [hw - ch, ht], [hw, ht - ch], [hw, -ht + ch],
      [hw - ch, -ht], [-hw + ch, -ht], [-hw, -ht + ch], [-hw, ht - ch],
    ];
    for (const [x, y] of sec) {
      const q = pts[i].clone().addScaledVector(B, x).addScaledVector(N, y);
      pos.push(q.x, q.y, q.z);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * ringN, b = (i + 1) * ringN;
    for (let s = 0; s < ringN; s++) {
      const s1 = (s + 1) % ringN;
      idx.push(a + s, b + s, b + s1, a + s, b + s1, a + s1);
    }
  }
  const e = (n - 1) * ringN;
  for (let k = 1; k < ringN - 1; k++) {
    idx.push(0, k + 1, k);
    idx.push(e, e + k, e + k + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const out = G.crease(g, 50);
  G.ensureOutward(out);
  return out;
}

/** Resample a polyline to spacing ds. */
function resample(pts: THREE.Vector3[], ds: number): THREE.Vector3[] {
  const out = [pts[0].clone()];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const l = a.distanceTo(b);
    let t0 = 0;
    while (acc + l * (1 - t0) >= ds) {
      const need = ds - acc;
      t0 += need / l;
      out.push(a.clone().lerp(b, t0));
      acc = 0;
    }
    acc += l * (1 - t0);
  }
  if (out[out.length - 1].distanceTo(pts[pts.length - 1]) > ds * 0.3) out.push(pts[pts.length - 1].clone());
  else out[out.length - 1].copy(pts[pts.length - 1]);
  return out;
}

/** Face normals along a path: `outward` made perpendicular to the path, kept continuous. */
function faceNormals(pts: THREE.Vector3[], outward: THREE.Vector3): THREE.Vector3[] {
  const res: THREE.Vector3[] = [];
  let last = outward.clone();
  for (let i = 0; i < pts.length; i++) {
    const tg = pts[Math.min(pts.length - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
    let n = outward.clone().addScaledVector(tg, -outward.dot(tg));
    if (n.length() < 0.15) n = last.clone().addScaledVector(tg, -last.dot(tg));
    n.normalize();
    if (n.dot(last) < 0) n.negate();
    res.push(n);
    last = n;
  }
  return res;
}

/** Frame (tangent, normal, binormal) at index i. */
function frameAt(pts: THREE.Vector3[], nrm: THREE.Vector3[], i: number) {
  const tg = pts[Math.min(pts.length - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
  const N = nrm[i].clone().addScaledVector(tg, -nrm[i].dot(tg)).normalize();
  const B = tg.clone().cross(N).normalize();
  return { tg, N, B };
}

function basisMatrix(x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3, p: THREE.Vector3) {
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(p);
}

/** Box placed in a frame: w along B, h along N, d along tangent. */
function framedBox(w: number, h: number, d: number, r: number, f: { tg: THREE.Vector3; N: THREE.Vector3; B: THREE.Vector3 }, at: THREE.Vector3, mat: THREE.Material) {
  const g = G.rbox(w, h, d, r, 2);
  g.applyMatrix4(basisMatrix(f.B, f.N, f.tg, at));
  return part(g, mat);
}

/** Rectangular wire frame (buckle / keeper frame) around the strap, in the plane normal to the tangent. */
function wireFrame(w: number, h: number, r: number, f: { tg: THREE.Vector3; N: THREE.Vector3; B: THREE.Vector3 }, at: THREE.Vector3, mat: THREE.Material, centreBar = false) {
  const hw = w / 2, hh = h / 2;
  const c = (x: number, y: number) => at.clone().addScaledVector(f.B, x).addScaledVector(f.N, y);
  const rr = r * 1.6;
  const loop = [c(-hw + rr, hh), c(hw - rr, hh), c(hw, hh - rr), c(hw, -hh + rr), c(hw - rr, -hh), c(-hw + rr, -hh), c(-hw, -hh + rr), c(-hw, hh - rr)];
  const parts = [part(G.tube(loop, r, 6, 48, true), mat)];
  if (centreBar) parts.push(part(G.rod(c(-hw, 0).addScaledVector(f.tg, 0), c(hw, 0), r * 0.85, 6), mat));
  return parts;
}

export function makeSling(s: SlingSetup) {
  const W = s.width ?? 0.026;
  const T = s.thickness ?? 0.0022;
  const out = s.outward.clone().normalize();
  const axis = s.rearAxis.clone().normalize();

  return function build(gravityLocal: THREE.Vector3, slack = 0.12): THREE.Group {
    const grav = gravityLocal.clone().normalize();
    const canvas = dpMat.canvas();
    const steel = dpMat.bare();
    const margin = T / 2 + 0.0009;

    // rear ring direction: start towards the front bar, in the plane normal to the pin axis
    const ringDir = (towards: THREE.Vector3) => {
      const d = towards.clone().sub(s.rearPivot);
      d.addScaledVector(axis, -d.dot(axis));
      if (d.length() < 1e-5) d.set(0, -1, 0);
      return d.normalize();
    };
    let rd = ringDir(s.frontBar.clone().addScaledVector(grav, 0.1));
    let pts: THREE.Vector3[] = [];
    for (let pass = 0; pass < 2; pass++) {
      const rearBar = s.rearPivot.clone().addScaledVector(rd, s.ringReach).addScaledVector(axis, 0.0015);
      const A = s.frontBar.clone().addScaledVector(out, -(0.0014 + T / 2));
      const B = rearBar.clone().addScaledVector(out, -(0.0017 + T / 2));
      const L = A.distanceTo(B) + Math.max(0.004, slack);
      pts = solveChain(A, B, L, grav, out, s.sdf, margin);
      rd = ringDir(pts[pts.length - 6]);
    }
    const DS = 0.006;
    const P = resample(pts, DS);
    const nrm = faceNormals(P, out);
    const widths = P.map((_, i) => {
      const fromFront = i * DS;
      return W - Math.max(0, 1 - fromFront / 0.035) * (W - 0.019); // bunched where it wraps the small front loop
    });
    const parts: THREE.Object3D[] = [part(ribbon(P, nrm, widths, T), canvas)];

    // --- folds (strap doubled back over itself at both ends) ---
    const fold = (fromStart: boolean, len: number) => {
      const k = Math.min(P.length - 2, Math.round(len / DS));
      const idx = fromStart ? Array.from({ length: k + 1 }, (_, i) => i) : Array.from({ length: k + 1 }, (_, i) => P.length - 1 - i);
      const fp = idx.map((i) => P[i].clone().addScaledVector(nrm[i], T + 0.0003));
      const fn = idx.map((i) => nrm[i].clone());
      const fw = idx.map((i) => widths[i] - 0.0006);
      // wrap arc around the bar: from the main strap end to the fold's start, bulging away from the strap run
      const i0 = idx[0], i1 = idx[1];
      const run = P[i1].clone().sub(P[i0]).normalize();
      const c = P[i0].clone().addScaledVector(nrm[i0], (T + 0.0003) / 2);
      const rad = (T + 0.0003) / 2;
      const arc: THREE.Vector3[] = [];
      const arcN: THREE.Vector3[] = [];
      for (let a = 0; a <= 6; a++) {
        const phi = (a / 6) * Math.PI;
        const dir = nrm[i0].clone().multiplyScalar(-Math.cos(phi)).addScaledVector(run, -Math.sin(phi));
        arc.push(c.clone().addScaledVector(dir, rad + T / 2 + 0.0002));
        arcN.push(dir.clone());
      }
      parts.push(part(ribbon([...arc], arcN, arc.map(() => fw[0]), T), canvas));
      parts.push(part(ribbon(fp, fn, fw, T), canvas));
      // tucked end: slightly thinner tip
      return { idx, fp, fn };
    };
    const front = fold(true, 0.085);
    fold(false, 0.055);

    // keepers (a band of the same webbing around both layers) and the front buckle
    const keeper = (i: number) => {
      const f = frameAt(P, nrm, i);
      const at = P[i].clone().addScaledVector(f.N, (T + 0.0003) / 2);
      parts.push(framedBox(widths[i] + 0.0032, 2 * T + 0.0036, 0.011, 0.0012, f, at, canvas));
    };
    keeper(Math.min(P.length - 1, 9));
    keeper(Math.max(0, P.length - 1 - 7));
    {
      const i = Math.min(P.length - 1, front.idx[front.idx.length - 1] - 2);
      const f = frameAt(P, nrm, i);
      const at = P[i].clone().addScaledVector(f.N, (T + 0.0003) / 2);
      parts.push(...wireFrame(widths[i] + 0.0045, 2 * T + 0.0052, 0.0011, f, at, steel, true));
      // buckle prong lying on the fold
      parts.push(part(G.rod(at.clone().addScaledVector(f.N, T * 0.9), at.clone().addScaledVector(f.N, T * 1.1).addScaledVector(f.tg, -0.012), 0.0007, 6), steel));
    }

    // --- rear D-ring swinging on the stock swivel pin ---
    {
      const bar = s.rearPivot.clone().addScaledVector(rd, s.ringReach).addScaledVector(axis, 0.0015);
      const bd = axis.clone().cross(rd).normalize(); // bar direction, in the plane of the stock side
      const hl = W / 2 + 0.0035;
      const pv = s.rearPivot.clone().addScaledVector(axis, 0.0015);
      const e1 = bar.clone().addScaledVector(bd, hl), e2 = bar.clone().addScaledVector(bd, -hl);
      const ring = [
        e1,
        bar.clone().addScaledVector(bd, hl * 0.25),
        bar.clone().addScaledVector(bd, -hl * 0.25),
        e2,
        pv.clone().addScaledVector(bd, -hl * 0.55).addScaledVector(rd, s.ringReach * 0.45),
        pv.clone().addScaledVector(bd, -0.0035).addScaledVector(rd, -0.0036),
        pv.clone().addScaledVector(bd, 0.0035).addScaledVector(rd, -0.0036),
        pv.clone().addScaledVector(bd, hl * 0.55).addScaledVector(rd, s.ringReach * 0.45),
      ];
      parts.push(part(G.tube(ring, 0.0017, 7, 52, true), steel));
    }
    const g = group(parts);
    g.name = 'dp27-sling';
    return g;
  };
}
