/**
 * Skatka: the Red Army greatcoat rolled into a tight sausage (about 0.10-0.12 m thick), bent into a
 * ring and worn over the LEFT shoulder, across the chest and back, with the two ends laid side by
 * side at the RIGHT hip and bound with a strap. Further short straps keep the roll tight.
 *
 * The roll is a sweep with a spiral cross-section (the coat's edge laps round as a step running
 * along the roll), lumps along its length, compression folds on the inside of the bend, squeezed
 * waists under the straps and domed end faces that show the rolled layers.
 *
 * buildSkatka(opts): ring in the gear-local XY plane, centred on the origin: X = across (the
 * chest-to-back direction when worn), Y = along the shoulder-to-hip diagonal (+Y = shoulder end),
 * Z = ring-plane normal. The overlapping ends and their binding strap are at the -Y end (hip) and
 * lie side by side along Z. strapAnchors: [0] top of the ring (shoulder contact), [1] the tie.
 *
 * buildSkatkaAlong(path, opts): the same roll along any closed centreline the caller supplies
 * (e.g. fitted around a posed torso); path[0] is where the ends overlap and are tied.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { SU } from './palette';
import { wireFrame } from './helpers';
import { sweepSurface, sstep, snoise } from './soft';

export interface SkatkaOptions {
  /** Roll diameter (m). Default 0.11. */
  diameter?: number;
  /** Length over which the two ends overlap at the tie (m). Default 0.14. */
  overlap?: number;
  /** Number of extra binding straps spread round the ring (default 2). */
  ties?: number;
  /** Noise seed (vary per soldier). */
  seed?: number;
}

export interface SkatkaRingOptions extends SkatkaOptions {
  /** Centreline ring semi-axes (m): a across (X), b along the diagonal (Y). Defaults 0.2 / 0.38. */
  a?: number;
  b?: number;
}

export interface SkatkaAlongOptions extends SkatkaOptions {
  /** Ring-plane normal (the ends are offset along it). Default: best-fit normal of the path. */
  normal?: THREE.Vector3;
}

interface Frame {
  p: THREE.Vector3;
  t: THREE.Vector3;
  n: THREE.Vector3; // in-plane, pointing away from the ring centre
  b: THREE.Vector3; // ring-plane normal side
}

function newellNormal(pts: THREE.Vector3[]): THREE.Vector3 {
  const n = new THREE.Vector3();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    n.x += (a.y - b.y) * (a.z + b.z);
    n.y += (a.z - b.z) * (a.x + b.x);
    n.z += (a.x - b.x) * (a.y + b.y);
  }
  return n.lengthSq() > 0 ? n.normalize() : new THREE.Vector3(0, 0, 1);
}

/**
 * Build the roll along a closed centreline. Returns the group and the tie position.
 */
function buildRoll(path: THREE.Vector3[], o: SkatkaAlongOptions): { obj: THREE.Group; tie: THREE.Vector3; length: number } {
  const D = o.diameter ?? 0.11, R = D / 2;
  const ov = o.overlap ?? 0.14;
  const nTies = o.ties ?? 2;
  const seed = o.seed ?? 1;
  const curve = new THREE.CatmullRomCurve3(path, true, 'centripetal');
  const Lc = curve.getLength();
  const planeN = (o.normal ?? newellNormal(path)).clone().normalize();
  const centre = path.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / path.length);
  const L = Lc + ov; // roll length
  const h = R * 0.86; // side offset of each end at the overlap
  const trans = 0.12; // length over which an end moves aside
  /** Centreline frame at roll arc length s (0..L). */
  const frameAt = (s: number): Frame => {
    const u = (((s - ov / 2) / Lc) % 1 + 1) % 1; // tie (path[0]) sits at the middle of the overlap
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u).normalize();
    const b = planeN.clone().sub(t.clone().multiplyScalar(planeN.dot(t))).normalize();
    let n = new THREE.Vector3().crossVectors(t, b).normalize();
    if (n.dot(p.clone().sub(centre)) < 0) n.negate();
    // the start of the roll lies on one side of the ring plane, the end on the other
    const off = -h * (1 - sstep(ov, ov + trans, s)) + h * sstep(L - ov - trans, L - ov, s);
    return { p: p.clone().addScaledVector(b, off), t, n, b };
  };
  // ties: the end binding (middle of the overlap) + extra straps spread round the ring
  const tieS: number[] = [];
  for (let k = 1; k <= nTies; k++) tieS.push(ov + ((L - 2 * ov) * k) / (nTies + 1));
  const layer = 0.011; // visible step of the lapped coat edge
  const lapPhase = 0.9 + seed * 0.37;
  const radius = (phi: number, s: number) => {
    // lumpy along the length, slightly oval, spiral lap step, bend folds, strap waists
    let r = R * (1 + 0.05 * snoise(s * 5 + seed * 3.1, 0.5, 0.2, 61) + 0.022 * snoise(s * 14, 1.3, 0.7 + seed, 62));
    r *= 1 - 0.07 * Math.sin(phi) ** 2; // soft roll, a little flattened across the ring plane
    const lp = lapPhase + 0.35 * snoise(s * 2.2, 4.4, seed, 63);
    const x = ((((phi - lp) / (Math.PI * 2)) % 1) + 1) % 1;
    const saw = x - sstep(0.982, 1, x);
    r += layer * (saw - 0.5);
    // compression folds inside the bend, helical rolling creases, fuzzy unevenness
    const inner = Math.max(0, -Math.cos(phi));
    r += 0.0034 * inner * inner * Math.sin((s / 0.036) * Math.PI * 2 + 2.5 * snoise(s * 4, 2, seed, 64));
    const hel = Math.sin((s / 0.1) * Math.PI * 2 + phi + 1.5 * snoise(s * 3, 7, seed, 66));
    r -= 0.0042 * Math.pow(Math.max(0, hel), 10) * (0.6 + 0.4 * snoise(s * 9, phi, seed, 67));
    r += 0.0014 * snoise(Math.cos(phi) * 3 + s * 30, Math.sin(phi) * 3, s * 12, 65);
    for (const st of tieS) r *= 1 - 0.1 * Math.exp(-(((s - st) / 0.018) ** 2)) + 0.025 * Math.exp(-(((Math.abs(s - st) - 0.035) / 0.02) ** 2));
    const sm = ov / 2, sq = 1 - 0.14 * Math.exp(-(((s - sm) / 0.02) ** 2)), sq2 = 1 - 0.14 * Math.exp(-(((s - (L - ov / 2)) / 0.02) ** 2));
    r *= sq * sq2;
    // ends taper into rounded, slightly squashed caps
    const e0 = Math.min(s, L - s);
    r *= 0.86 + 0.14 * sstep(0, 0.05, e0);
    return r;
  };
  // rows along the length, denser near the ends and the ties
  const rows: number[] = [];
  const step = 0.012;
  for (let s = 0; s <= L + 1e-6; s += step) rows.push(s);
  if (rows[rows.length - 1] < L) rows.push(L);
  const NU = 30;
  const CAP = 22;
  const pitch = layer;
  // end caps: rows beyond the ends converge to the axis, showing the spiral of the rolled layers
  const capPoint = (phi: number, c: number, atStart: boolean) => {
    const s = atStart ? 0 : L;
    const f = frameAt(s);
    const rr = radius(phi, s) * (1 - c);
    const dome = R * 0.07 * Math.sqrt(Math.max(0, 1 - (1 - c) ** 2));
    // rolled layers: an Archimedean spiral groove on the end face
    const x = (((rr / pitch - phi / (Math.PI * 2)) % 1) + 1) % 1;
    const groove = 0.0065 * Math.pow(Math.sin(Math.PI * x), 3);
    const ax = (dome - groove * (1 - c) * sstep(0, 0.2, c)) * (atStart ? -1 : 1);
    return f.p.clone()
      .addScaledVector(f.n, Math.cos(phi) * rr)
      .addScaledVector(f.b, Math.sin(phi) * rr)
      .addScaledVector(f.t, ax);
  };
  const vs: number[] = [];
  for (let k = CAP; k >= 1; k--) vs.push(-k / CAP); // start cap (negative v: c = -v)
  for (const s of rows) vs.push(s / L);
  for (let k = 1; k <= CAP; k++) vs.push(1 + k / CAP); // end cap
  const frames = new Map<number, Frame>();
  const fr = (s: number) => {
    let f = frames.get(s);
    if (!f) {
      f = frameAt(s);
      frames.set(s, f);
    }
    return f;
  };
  const point = (u: number, v: number) => {
    const phi = u * Math.PI * 2;
    if (v < 0) return capPoint(phi, Math.min(0.999, -v), true);
    if (v > 1) return capPoint(phi, Math.min(0.999, v - 1), false);
    const s = v * L;
    const f = fr(s);
    const r = radius(phi, s);
    return f.p.clone().addScaledVector(f.n, Math.cos(phi) * r).addScaledVector(f.b, Math.sin(phi) * r);
  };
  const fs = fr(0), fe = fr(L);
  const geo = sweepSurface(point, NU, 0, {
    vs,
    poleStart: fs.p.clone().addScaledVector(fs.t, -R * 0.12),
    poleEnd: fe.p.clone().addScaledVector(fe.t, R * 0.12),
    outward: (p, v) => {
      const s = Math.min(L, Math.max(0, v * L));
      const f = fr(rows.reduce((a, b) => (Math.abs(b - s) < Math.abs(a - s) ? b : a), 0));
      return p.clone().sub(f.p);
    },
  });
  const parts: THREE.Object3D[] = [part(geo, SU.greatcoatRoll())];
  // straps: the end binding round both ends, and single straps round the roll
  const leather = SU.leather(), steel = SU.darkSteel();
  const SW = 0.02, ST = 0.0026;
  const strapRing = (s: number, both: boolean) => {
    const f = frameAt(s);
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    const N = 40;
    if (!both) {
      for (let i = 0; i < N; i++) {
        const phi = (i / N) * Math.PI * 2;
        const r = radius(phi, s) + ST / 2 + 0.0006;
        const d = f.n.clone().multiplyScalar(Math.cos(phi)).addScaledVector(f.b, Math.sin(phi));
        pts.push(f.p.clone().addScaledVector(d, r));
        nrm.push(d);
      }
    } else {
      // stadium round both ends (their centres lie +-h either side of the ring centreline)
      const ca = frameAt(ov / 2).p, cb = frameAt(L - ov / 2).p;
      const axis = cb.clone().sub(ca).normalize();
      const rr = R * 0.86 + ST / 2 + 0.0008;
      for (let i = 0; i < N; i++) {
        const phi = (i / N) * Math.PI * 2;
        const d = f.n.clone().multiplyScalar(Math.cos(phi)).addScaledVector(axis, Math.sin(phi));
        pts.push((Math.sin(phi) >= 0 ? cb : ca).clone().addScaledVector(d, rr));
        nrm.push(d);
      }
    }
    parts.push(part(G.strap(pts, SW, ST, nrm, { closed: true, samples: 80 }), leather));
    // buckle on the outer side, its bars across the strap
    const bp = pts[0].clone().addScaledVector(nrm[0], ST / 2 + 0.0012);
    const fb = wireFrame(0.026, 0.03, 0.0014, 0.004);
    const yAx = nrm[0].clone().cross(f.t).normalize();
    fb.applyMatrix4(new THREE.Matrix4().makeBasis(f.t, yAx, nrm[0]));
    fb.translate(bp.x, bp.y, bp.z);
    parts.push(part(fb, steel));
    // free end of the strap lying back over the strap past the buckle
    const tail = [0, N - 1, N - 2, N - 3].map((i) => pts[i].clone().addScaledVector(nrm[i], ST * 1.05));
    const tailN = [0, N - 1, N - 2, N - 3].map((i) => nrm[i].clone());
    parts.push(part(G.strap(tail, SW * 0.94, ST, tailN, { samples: 12 }), leather));
  };
  strapRing(ov / 2, true);
  for (const st of tieS) strapRing(st, false);
  const tie = frameAt(ov / 2).p.clone().lerp(frameAt(L - ov / 2).p, 0.5);
  return { obj: group(parts), tie, length: L };
}

/** Rolled greatcoat ring in the gear-local XY plane (see the file header for the frame). */
export function buildSkatka(o: SkatkaRingOptions = {}): GearPiece {
  const a = o.a ?? 0.2, b = o.b ?? 0.38;
  const D = o.diameter ?? 0.11;
  // closed ellipse centreline starting at the bottom (hip), running towards +X first
  const path: THREE.Vector3[] = [];
  const N = 48;
  for (let i = 0; i < N; i++) {
    const t = -Math.PI / 2 + (i / N) * Math.PI * 2;
    // slightly egg-shaped: fuller at the hip, narrower over the shoulder
    const k = 1 - 0.06 * Math.sin(t);
    path.push(new THREE.Vector3(a * Math.cos(t) * k, b * Math.sin(t), 0));
  }
  const { obj } = buildRoll(path, { ...o, normal: new THREE.Vector3(0, 0, 1) });
  obj.name = 'su-skatka';
  return {
    id: 'su-skatka',
    name: 'Skatka (rolled greatcoat)',
    object: obj,
    mount: 'shoulder-strap',
    size: { w: 2 * a + D, h: 2 * b + D, d: D * 1.9 },
    strapAnchors: [new THREE.Vector3(0, b, 0), new THREE.Vector3(0, -b, 0)],
  };
}

/** Rolled greatcoat along a caller-supplied closed centreline (path[0] = tie position). */
export function buildSkatkaAlong(path: THREE.Vector3[], o: SkatkaAlongOptions = {}): GearPiece {
  const { obj, tie } = buildRoll(path, o);
  obj.name = 'su-skatka';
  const box = new THREE.Box3().setFromObject(obj, true);
  const size = box.getSize(new THREE.Vector3());
  return {
    id: 'su-skatka',
    name: 'Skatka (rolled greatcoat)',
    object: obj,
    mount: 'shoulder-strap',
    size: { w: size.x, h: size.y, d: size.z },
    strapAnchors: [tie],
  };
}
