/**
 * Braces, W.E. Patt. '37 and Straps, supporting, "L" - the strapping of the 1937 web set.
 *
 *  - Braces (a left and a right): 1-in. (25 mm) webbing at both ends, flaring to 2 in. (50 mm)
 *    where they pass over the shoulders (the wide piece sewn over the 1-in. strap with edge rows
 *    and box stitching at both transitions), brass tips on both ends. From the buckle at the top
 *    back of each basic pouch a brace runs over the shoulder, crosses the other one in the middle
 *    of the back - the LEFT brace carries a sewn cross-over loop the right brace passes through -
 *    down through the angled buckle at the rear of the belt, and its end continues forward to the
 *    hip, where the water-bottle carrier (right) or the small pack (left, marching order) and the
 *    entrenching-tool carrier (rear) hang from the brace ends.
 *  - L-straps (a pair): for the small pack worn on the back in battle order. Two 1-in. arms sewn
 *    at right angles on a brass hook: the hook engages the upper window of the pouch buckle, the
 *    long arm runs over the shoulder to the loose buckle at the top back of the pack, the short arm
 *    under the arm to the small buckle at the base of the pack.
 *
 * Path builders (infantry use): the strap centre line is given as points + outward face normals
 * (e.g. fit.strapPath(...) -> { points, normals }), the result is in the same space as the path.
 *   buildBrace37(path, opts)         one brace; opts.shoulder = [s0, s1] arc length (m, from the
 *                                    path start = the pouch end) of the 2-in. section.
 *   buildBracePair37({ left, right }) both braces + the cross-over loop placed where the paths
 *                                    cross (the loop is sewn to the left brace, round the right one).
 *   buildLStrap37({ shoulder, underArm }) one L-strap: both paths START at the hook (corner).
 *   buildWebStrap37(path, opts)      any plain 1-in. web strap with brass tips.
 * Display pieces (review / catalog): buildBraces37() lays the pair flat in an X, crossed in the
 * loop; buildLStraps37() lays both L-straps flat. Mount 'shoulder-strap'.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { UK } from './palette';
import { stitches, taperedSheet, brassTip, placeOn, merge, boxX, smoothstep } from './helpers';

export const BRACE37 = {
  /** Strap width at the ends (1 in.), over the shoulder (2 in.), web thickness. */
  end: 0.025,
  shoulder: 0.05,
  t: 0.0022,
  /** Default display length and the 2-in. section (arc length from the pouch end). */
  length: 1.12,
  shoulderAt: [0.2, 0.56] as [number, number],
  /** Arc length of the cross-over loop on the left brace (display). */
  crossAt: 0.74,
};

export interface StrapPath {
  points: THREE.Vector3[];
  /** Outward face normal per point (or one for all). */
  normals: THREE.Vector3[] | THREE.Vector3;
}

/** Arc-length table of an open path. */
function table(path: StrapPath) {
  const pts = path.points;
  const nr = Array.isArray(path.normals) ? path.normals : pts.map(() => (path.normals as THREE.Vector3).clone());
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const cn = new THREE.CatmullRomCurve3(nr.map((n) => n.clone().normalize()), false, 'centripetal');
  const L = c.getLength();
  const at = (s: number) => {
    const u = Math.min(1, Math.max(0, s / L));
    const t = c.getTangentAt(u);
    const n = cn.getPoint(c.getUtoTmapping(u, s)).normalize();
    n.sub(t.clone().multiplyScalar(n.dot(t))).normalize();
    const b = new THREE.Vector3().crossVectors(t, n).normalize();
    return { p: c.getPointAt(u), t, n, b };
  };
  const sample = (n: number) => {
    const P: THREE.Vector3[] = [], N: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const f = at((L * i) / n);
      P.push(f.p);
      N.push(f.n);
    }
    return { P, N };
  };
  return { L, at, sample };
}

export interface WebStrapOptions {
  width?: number;
  thickness?: number;
  /** Brass tips on [start, end]. Default [false, true]. */
  tips?: [boolean, boolean];
  /** Width profile override: half width as a function of arc length s (m) and total L. */
  halfWidth?: (s: number, L: number) => number;
}

/** Strap geometry + brass tips along a path (shared by all builders). */
function strapParts(path: StrapPath, o: WebStrapOptions, mats = { web: UK.webStrap(), brass: UK.brass() }) {
  const W = o.width ?? BRACE37.end, T = o.thickness ?? BRACE37.t;
  const tb = table(path);
  const L = tb.L;
  const n = Math.max(12, Math.round(L / 0.01));
  const { P, N } = tb.sample(n);
  const tips = o.tips ?? [false, true];
  const tipL = W * 0.62;
  const hwF = o.halfWidth ?? (() => W / 2);
  // the strap stops just inside the folded end of each tip
  const sheet = taperedSheet(P, N, (t) => hwF(t * L, L), T, { samples: n * 2 });
  const brassG: THREE.BufferGeometry[] = [];
  for (const [k, on] of tips.entries()) {
    if (!on) continue;
    const f = tb.at(k === 0 ? 0 : L);
    const out = k === 0 ? f.t.clone().negate() : f.t.clone();
    const w = hwF(k === 0 ? 0 : L, L) * 2;
    const tip = brassTip(w, T, tipL);
    const at = f.p.clone().addScaledVector(out, 0.0006);
    brassG.push(placeOn(tip.plate, at, f.n, out), placeOn(tip.rivets, at, f.n, out));
  }
  return { sheet, brass: brassG, table: tb, L, W, T, mats };
}

/** A plain 1-in. web strap with brass tips along a path. */
export function buildWebStrap37(path: StrapPath, o: WebStrapOptions = {}): THREE.Group {
  const r = strapParts(path, o);
  const parts: THREE.Object3D[] = [part(r.sheet, r.mats.web)];
  if (r.brass.length) parts.push(part(merge(r.brass), r.mats.brass));
  const g = group(parts);
  g.name = 'uk-web-strap-37';
  return g;
}

export interface Brace37Options {
  /** Arc length range (m, from the path start) of the 2-in. shoulder section. */
  shoulder?: [number, number];
  /** Length of the flare at each end of the shoulder section (m). */
  flare?: number;
}

function braceHalfWidth(shoulder: [number, number], flare: number) {
  const a = BRACE37.end / 2, b = BRACE37.shoulder / 2;
  return (s: number) => {
    const k = smoothstep(shoulder[0] - flare, shoulder[0], s) * (1 - smoothstep(shoulder[1], shoulder[1] + flare, s));
    return a + (b - a) * k;
  };
}

/** One brace along a path (start = the pouch end, which goes up through the pouch buckle). */
export function buildBrace37(path: StrapPath, o: Brace37Options = {}): THREE.Group {
  const tb0 = table(path);
  const sh: [number, number] = o.shoulder ?? [Math.min(BRACE37.shoulderAt[0], tb0.L * 0.2), Math.min(BRACE37.shoulderAt[1], tb0.L * 0.55)];
  const flare = o.flare ?? 0.06;
  const hwF = braceHalfWidth(sh, flare);
  const r = strapParts(path, { width: BRACE37.end, tips: [true, true], halfWidth: (s) => hwF(s) });
  const parts: THREE.Object3D[] = [part(r.sheet, r.mats.web, { name: 'brace' })];
  // stitching: rows along both edges of the shoulder piece, box stitch at the transitions
  const thread = UK.thread();
  const st: THREE.BufferGeometry[] = [];
  const lift = BRACE37.t / 2 + 0.0002;
  for (const sg of [1, -1]) {
    const pts: THREE.Vector3[] = [];
    for (let s = sh[0] - flare * 0.6; s <= sh[1] + flare * 0.6; s += 0.004) {
      const f = r.table.at(s);
      pts.push(f.p.clone().addScaledVector(f.n, lift).addScaledVector(f.b, sg * (hwF(s) - 0.0028)));
    }
    st.push(stitches(pts, { len: 0.0034, gap: 0.002, r: 0.00045 }));
  }
  for (const s of [sh[0] - flare - 0.012, sh[1] + flare + 0.012]) {
    const f = r.table.at(s);
    st.push(placeOn(boxX(0, 0, 0.018, 0.018, 0), f.p.clone().addScaledVector(f.n, lift), f.n, f.t));
  }
  // short end reinforcement stitches behind each tip
  for (const s of [0.022, r.L - 0.022]) {
    const f = r.table.at(s);
    const a = f.p.clone().addScaledVector(f.n, lift).addScaledVector(f.b, -0.009);
    const b = f.p.clone().addScaledVector(f.n, lift).addScaledVector(f.b, 0.009);
    st.push(stitches([a, b], { len: 0.003, gap: 0.0018, r: 0.00045 }));
  }
  parts.push(part(merge(st), thread));
  parts.push(part(merge(r.brass), r.mats.brass));
  const g = group(parts);
  g.name = 'uk-brace-37';
  return g;
}

/**
 * Cross-over loop sewn to the left brace at arc length sL, round the right brace at arc length
 * sR. `below` = the right brace lies on the INNER side of the left one (negative normal).
 */
function crossLoop(left: ReturnType<typeof table>, sL: number, right: ReturnType<typeof table>, sR: number, rightHalfW: number): { web: THREE.BufferGeometry; thread: THREE.BufferGeometry } {
  const fl = left.at(sL), fr = right.at(sR);
  const T = BRACE37.t, LT = 0.0018;
  const outside = fr.p.clone().sub(fl.p).dot(fl.n) >= 0;
  // loop section in the right brace's cross plane (b across it, n through its thickness)
  const n = fr.n.clone().multiplyScalar(outside ? 1 : -1); // from the left brace towards the far face of the right one
  const hwL = rightHalfW + 0.0022;
  const near = fr.p.clone().addScaledVector(n, -(T / 2 + T + 0.0005)); // on the left brace's face
  const far = fr.p.clone().addScaledVector(n, T / 2 + LT / 2 + 0.0004);
  const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
  const add = (u: number, onFar: boolean) => {
    const c = onFar ? far : near;
    pts.push(c.clone().addScaledVector(fr.b, u));
    nrm.push(onFar ? n.clone() : n.clone().negate());
  };
  const N = 8;
  for (let i = 0; i <= N; i++) add(-hwL + (2 * hwL * i) / N, true);
  // round the edge
  for (let k = 1; k < 4; k++) {
    const a = (k / 4) * Math.PI;
    const mid = near.clone().lerp(far, 0.5);
    const rad = far.distanceTo(near) / 2;
    const p = mid.clone().addScaledVector(fr.b, hwL + Math.sin(a) * 0.0014).addScaledVector(n, Math.cos(a) * rad);
    pts.push(p);
    nrm.push(fr.b.clone().multiplyScalar(Math.sin(a)).addScaledVector(n, Math.cos(a)).normalize());
  }
  for (let i = N; i >= 0; i--) add(-hwL + (2 * hwL * i) / N, false);
  for (let k = 1; k < 4; k++) {
    const a = (k / 4) * Math.PI;
    const mid = near.clone().lerp(far, 0.5);
    const rad = far.distanceTo(near) / 2;
    const p = mid.clone().addScaledVector(fr.b, -hwL - Math.sin(a) * 0.0014).addScaledVector(n, -Math.cos(a) * rad);
    pts.push(p);
    nrm.push(fr.b.clone().multiplyScalar(-Math.sin(a)).addScaledVector(n, -Math.cos(a)).normalize());
  }
  const web = G.strap(pts, 0.02, LT, nrm, { closed: true, samples: 48 });
  // stitched to the left brace: a box across the loop's near layer
  const thread = placeOn(boxX(0, 0, 0.016, 0.014, 0), fl.p.clone().addScaledVector(fl.n, (outside ? 1 : -1) * (T / 2 + 0.0002)), fl.n.clone().multiplyScalar(outside ? 1 : -1), fr.t);
  return { web, thread };
}

/** Both braces along their paths with the cross-over loop where they cross. */
export function buildBracePair37(o: { left: StrapPath; right: StrapPath; leftOptions?: Brace37Options; rightOptions?: Brace37Options }): THREE.Group {
  const L = buildBrace37(o.left, o.leftOptions), R = buildBrace37(o.right, o.rightOptions);
  const tl = table(o.left), tr = table(o.right);
  // closest approach
  let best = { d: Infinity, a: 0, b: 0 };
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const pa = tl.at((tl.L * i) / n).p;
    for (let j = 0; j <= n; j++) {
      const d = pa.distanceToSquared(tr.at((tr.L * j) / n).p);
      if (d < best.d) best = { d, a: (tl.L * i) / n, b: (tr.L * j) / n };
    }
  }
  const parts: THREE.Object3D[] = [L, R];
  if (Math.sqrt(best.d) < 0.03) {
    const lp = crossLoop(tl, best.a, tr, best.b, BRACE37.end / 2);
    parts.push(part(lp.web, UK.webStrap()), part(lp.thread, UK.thread()));
  }
  const g = group(parts);
  g.name = 'uk-braces-37';
  return g;
}

/** Default display: the pair laid flat in an X on the board, the right brace through the loop. */
export function buildBraces37(): GearPiece {
  const len = BRACE37.length, cs = BRACE37.crossAt;
  const ang = (52 * Math.PI) / 180;
  const T = BRACE37.t;
  const mk = (sgn: number, bump: number) => {
    const d = new THREE.Vector3(Math.sin(ang / 2) * sgn, 0, -Math.cos(ang / 2));
    const pts: THREE.Vector3[] = [];
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const s = (len * i) / N;
      const p = d.clone().multiplyScalar(s - cs);
      // lying flat; slight natural waviness; the upper brace rides over the lower one at the cross
      const k = Math.exp(-(((s - cs) / 0.05) ** 2));
      p.y = T / 2 + bump * k + 0.0006 * Math.sin(s * 9 + sgn);
      pts.push(p);
    }
    return { points: pts, normals: new THREE.Vector3(0, 1, 0) };
  };
  const left = mk(1, 0), right = mk(-1, T + 0.0022);
  const obj = buildBracePair37({ left, right });
  obj.name = 'uk-braces-37';
  const size = new THREE.Box3().setFromObject(obj, true).getSize(new THREE.Vector3());
  return {
    id: 'uk-braces-37',
    name: 'Braces, Patt. 37 (pair)',
    object: obj,
    mount: 'shoulder-strap',
    size: { w: size.x, h: size.y, d: size.z },
  };
}

// ---------------------------------------------------------------------------------------------
// L-straps
// ---------------------------------------------------------------------------------------------

/** Brass hook at the L-strap corner, local: strap face +Z, hook pointing to -Y (towards the pouch buckle). */
function lHookGeometry(): THREE.BufferGeometry {
  const plate = G.extrude(
    [
      [-0.0135, 0.004],
      [0.0135, 0.004],
      [0.0135, -0.012],
      [0.004, -0.016],
      [-0.004, -0.016],
      [-0.0135, -0.012],
    ],
    0.001,
    0.0003,
    2,
    1,
  );
  plate.translate(0, 0, BRACE37.t / 2 + 0.0006);
  const wire = G.tube(
    [
      [0, -0.014, BRACE37.t / 2 + 0.001],
      [0, -0.022, BRACE37.t / 2 + 0.002],
      [0, -0.0265, BRACE37.t / 2 - 0.001],
      [0, -0.025, -BRACE37.t / 2 - 0.0035],
      [0, -0.019, -BRACE37.t / 2 - 0.004],
    ],
    0.0016,
    8,
    20,
  );
  const rv = G.scatter(G.rivetHead(0.0018), [
    { p: [-0.007, -0.004, BRACE37.t / 2 + 0.0011], n: [0, 0, 1] },
    { p: [0.007, -0.004, BRACE37.t / 2 + 0.0011], n: [0, 0, 1] },
  ]);
  return merge([plate, wire, rv]);
}

/** One L-strap; both paths start at the corner hook. */
export function buildLStrap37(o: { shoulder: StrapPath; underArm: StrapPath }): THREE.Group {
  const a = strapParts(o.shoulder, { tips: [false, true] });
  const b = strapParts(o.underArm, { tips: [false, true] });
  const parts: THREE.Object3D[] = [part(merge([a.sheet, b.sheet]), a.mats.web, { name: 'l-strap' })];
  const fa = a.table.at(0), fb = b.table.at(0);
  // corner: the hook plate riveted over the joint, pointing away from both arms
  const dir = fa.t.clone().add(fb.t).multiplyScalar(-1).normalize();
  const hook = placeOn(lHookGeometry(), fa.p.clone().lerp(fb.p, 0.5).addScaledVector(dir, -0.006), fa.n, dir.clone().negate());
  const st: THREE.BufferGeometry[] = [];
  for (const [t, s0] of [[a.table, 0.03], [b.table, 0.03]] as const) {
    const f = t.at(s0);
    st.push(placeOn(boxX(0, 0, 0.018, 0.02, 0), f.p.clone().addScaledVector(f.n, BRACE37.t / 2 + 0.0002), f.n, f.t));
  }
  parts.push(part(merge([hook, ...a.brass, ...b.brass]), a.mats.brass));
  parts.push(part(merge(st), UK.thread()));
  const g = group(parts);
  g.name = 'uk-l-strap-37';
  return g;
}

/** Default display: both L-straps laid flat, long arms side by side. */
export function buildLStraps37(): GearPiece {
  const T = BRACE37.t;
  const parts: THREE.Object3D[] = [];
  for (const sgn of [1, -1]) {
    const x0 = sgn * 0.05;
    const up = new THREE.Vector3(0, 1, 0);
    const long: THREE.Vector3[] = [], short: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) long.push(new THREE.Vector3(x0 + sgn * 0.004 * Math.sin(i * 0.7), T / 2, 0.2 - (0.56 * i) / 12));
    // the short arm starts on top of the long arm's end (sewn corner under the hook plate)
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      short.push(new THREE.Vector3(x0 + sgn * 0.31 * u, T / 2 + T * 1.05 * (1 - smoothstep(0.04, 0.12, u)), 0.2 + 0.0025 * Math.sin(i)));
    }
    long[0].z = 0.2;
    parts.push(buildLStrap37({ shoulder: { points: long, normals: up }, underArm: { points: short, normals: up } }));
  }
  const obj = group(parts);
  obj.name = 'uk-l-straps-37';
  const size = new THREE.Box3().setFromObject(obj, true).getSize(new THREE.Vector3());
  return { id: 'uk-l-straps-37', name: 'Straps, supporting, L, Patt. 37 (pair)', object: obj, mount: 'shoulder-strap', size: { w: size.x, h: size.y, d: size.z } };
}
