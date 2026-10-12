/**
 * Belt, waist, W.E. Patt. '37: 2 1/4-inch (57 mm) "flat loop" belting with brass fittings - a
 * two-part "hook and loop" buckle at the front (the 1919 military pattern: one end's frame carries
 * a hooked tongue that engages the other end's frame), each end doubled back round its frame and
 * held by a brass slide, the length adjusted by double-hooked brass end tabs hooked into the flat
 * loops woven inside the belt; two angled 1-inch buckles on chapes at the rear for the brace ends.
 *
 * buildWaistBelt37({ points, normals }) builds the WHOLE belt along a closed centre-line path
 * (e.g. fit.beltPath(): points round the waist starting at the front centre where the buckle
 * sits and running towards the wearer's left, `normals` = outward belt-face directions). The
 * closure is bent along the path. Without a path a default oval waist (0.34 x 0.26 m, belt centre
 * line in the XZ plane at y = 0, buckle at +Z) is used - the review/display piece. The result is
 * in the same space as the path; strapAnchors = the two rear buckle gate bars (wearer's left first).
 *
 * Closure-local frame (buildBelt37Closure): origin on the belt centre line between the two frames,
 * X along the belt (the path direction), Y up, Z out of the belt; it spans x = -0.125 .. 0.125.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { UK } from './palette';
import { stitches, gateBuckle, merge, boxX, placeOn, frameAt, subPath, smoothstep } from './helpers';

export const BELT37 = { width: 0.057, t: 0.0034 };
const BW = BELT37.width, BT = BELT37.t;
const CLOSURE_HALF = 0.125;

export interface Belt37Options {
  /** Closed centre-line path round the waist, starting at the buckle (front centre). */
  points?: THREE.Vector3[];
  /** Outward face normal per point. */
  normals?: THREE.Vector3[];
  /** Arc-length fractions of the two rear brace buckles (default 0.39 and 0.61). */
  rearAt?: [number, number];
}

/** Default oval waist path (buckle at +Z, running towards +X first). */
function defaultPath(): { pts: THREE.Vector3[]; nrm: THREE.Vector3[] } {
  const a = 0.17, b = 0.13, N = 120;
  const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const s = Math.sin(t), c = Math.cos(t);
    pts.push(new THREE.Vector3(a * Math.sign(s) * Math.pow(Math.abs(s), 2 / 2.3), 0, b * Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.3)));
  }
  for (let i = 0; i < N; i++) {
    const d = pts[(i + 1) % N].clone().sub(pts[(i - 1 + N) % N]);
    const n = new THREE.Vector3(d.z, 0, -d.x).normalize();
    nrm.push(n.dot(pts[i]) < 0 ? n.negate() : n);
  }
  return { pts, nrm };
}

/** Closure assembly in its local frame: belting (the two doubled ends) and brass fittings. */
export function belt37ClosureGeometry(): { belting: THREE.BufferGeometry; brass: THREE.BufferGeometry } {
  const brassGeos: THREE.BufferGeometry[] = [];
  const beltGeos: THREE.BufferGeometry[] = [];
  const H = BW + 0.005; // frame height
  const gap = 0.004; // between the two frames
  const fw = 0.013; // frame width along the belt
  const bar = 0.0032; // bar section
  const r = bar / 2 + BT / 2 + 0.0002; // doubled layers at z = +-r
  for (const side of [1, -1]) {
    const xi = (side * gap) / 2, xo = side * (gap / 2 + fw);
    const cx = xo - (side * bar) / 2; // outer upright centre
    const up = (x: number) => { const q = G.rbox(bar, H, bar * 0.85, 0.0011, 1); q.translate(x, 0, 0); return q; };
    brassGeos.push(up(xi + (side * bar) / 2), up(cx));
    for (const y of [H / 2 - bar / 2, -H / 2 + bar / 2]) {
      const q = G.rbox(fw, bar, bar * 0.85, 0.0011, 1);
      q.translate((xi + xo) / 2, y, 0);
      brassGeos.push(q);
    }
    // the belt end: outer layer (blending into the single belt beyond the closure), round the
    // outer upright, back along the inside to the end tab
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    for (const x of [CLOSURE_HALF + 0.004, 0.11, 0.085, 0.05, Math.abs(cx) + 0.006]) {
      const k = 1 - smoothstep(0.085, 0.12, x);
      pts.push(new THREE.Vector3(side * x, 0, r * k));
      nrm.push(new THREE.Vector3(0, 0, 1));
    }
    for (let k = 0; k <= 8; k++) {
      const psi = Math.PI / 2 - (k / 8) * Math.PI;
      pts.push(new THREE.Vector3(cx - side * r * Math.cos(psi) * 1.02, 0, r * Math.sin(psi)));
      nrm.push(new THREE.Vector3(-side * Math.cos(psi), 0, Math.sin(psi)));
    }
    for (const x of [Math.abs(cx) + 0.006, 0.05, 0.098]) {
      pts.push(new THREE.Vector3(side * x, 0, -r));
      nrm.push(new THREE.Vector3(0, 0, -1));
    }
    beltGeos.push(G.strap(pts, BW, BT, nrm, { samples: 60 }));
    // brass slide over the doubled end, 30 mm from the frame
    const sx = side * (gap / 2 + fw + 0.03);
    const hz = r + BT / 2 + 0.0005, hy = BW / 2 + 0.0008;
    const loop: [number, number, number, number][] = [
      [hy - 0.001, hz, 0.25, 1], [0, hz + 0.0002, 0, 1], [-hy + 0.001, hz, -0.25, 1], [-hy - 0.0002, 0, -1, 0],
      [-hy + 0.001, -hz, -0.25, -1], [0, -hz - 0.0002, 0, -1], [hy - 0.001, -hz, 0.25, -1], [hy + 0.0002, 0, 1, 0],
    ];
    brassGeos.push(G.strap(loop.map(([y, z]) => new THREE.Vector3(sx, y, z)), 0.0085, 0.0008, loop.map(([, , ny, nz]) => new THREE.Vector3(0, ny, nz).normalize()), { closed: true, samples: 40 }));
    // end tab on the inside: brass plate with three rivets and the double hook into the flat loops
    const tx = side * 0.1;
    const zt = -r - BT / 2 - 0.0006;
    const plate = G.extrude([[-0.01, -0.022], [0.01, -0.022], [0.01, 0.022], [-0.01, 0.022]], 0.001, 0.0003, 2, 1);
    plate.translate(tx, 0, zt);
    brassGeos.push(plate);
    brassGeos.push(G.scatter(G.rivetHead(0.0021), [-0.014, 0, 0.014].map((y) => ({ p: new THREE.Vector3(tx, y, zt - 0.0004), n: new THREE.Vector3(0, 0, -1) }))));
    for (const y of [-0.012, 0.012]) {
      brassGeos.push(G.tube([[tx + side * 0.006, y, zt - 0.0005], [tx + side * 0.014, y, zt - 0.0022], [tx + side * 0.018, y, zt - 0.0008], [tx + side * 0.019, y, zt + 0.0015]], 0.0012, 6, 10));
    }
  }
  // hooked tongue on the +X frame, engaging the -X frame
  const tongue = G.extrude([[0.004, -0.012], [-0.006, -0.012], [-0.009, -0.007], [-0.009, 0.007], [-0.006, 0.012], [0.004, 0.012]], 0.0012, 0.0004, 4, 1);
  tongue.translate(gap / 2 + bar, 0, bar * 0.55);
  brassGeos.push(tongue);
  brassGeos.push(G.tube([[-gap / 2 - 0.004, 0, bar * 0.55], [-gap / 2 - 0.0065, 0, bar * 0.2], [-gap / 2 - 0.006, 0, -bar * 0.5]], 0.0019, 8, 8));
  return { belting: merge(beltGeos), brass: merge(brassGeos) };
}

/** Arc-length lookup of frames along a closed path. */
function frameTable(pts: THREE.Vector3[], nrm: THREE.Vector3[]) {
  const closed = [...pts, pts[0].clone()];
  const cn = [...nrm, nrm[0].clone()];
  const c = new THREE.CatmullRomCurve3(closed, false, 'centripetal');
  const cnc = new THREE.CatmullRomCurve3(cn, false, 'centripetal');
  const L = c.getLength();
  const N = Math.max(400, Math.round(L / 0.002));
  const P: THREE.Vector3[] = [], T: THREE.Vector3[] = [], Nn: THREE.Vector3[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    P.push(c.getPointAt(u));
    const t = c.getTangentAt(u);
    const n = cnc.getPoint(c.getUtoTmapping(u, u * L)).normalize();
    n.sub(t.clone().multiplyScalar(n.dot(t))).normalize();
    T.push(t);
    Nn.push(n);
  }
  const at = (s: number) => {
    const ss = ((s % L) + L) % L;
    const f = (ss / L) * N;
    const i = Math.min(N - 1, Math.floor(f)), w = f - i;
    const p = P[i].clone().lerp(P[i + 1], w), t = T[i].clone().lerp(T[i + 1], w).normalize(), n = Nn[i].clone().lerp(Nn[i + 1], w).normalize();
    const y = new THREE.Vector3().crossVectors(n, t).normalize();
    return { p, t, n, y };
  };
  return { L, at, closed, cn };
}

/** Bend geometry built along local X onto the path (x = arc length from the path start). */
function bend(g: THREE.BufferGeometry, ft: ReturnType<typeof frameTable>): THREE.BufferGeometry {
  const q = g.index ? g.toNonIndexed() : g;
  const pa = q.attributes.position as THREE.BufferAttribute;
  const na = q.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
    const f = ft.at(x);
    const p = f.p.clone().addScaledVector(f.y, y).addScaledVector(f.n, z);
    pa.setXYZ(i, p.x, p.y, p.z);
    if (na) {
      const nx = na.getX(i), ny = na.getY(i), nz = na.getZ(i);
      const n = f.t.clone().multiplyScalar(nx).addScaledVector(f.y, ny).addScaledVector(f.n, nz).normalize();
      na.setXYZ(i, n.x, n.y, n.z);
    }
  }
  return q;
}

/** Rear brace buckle on its angled chape, local: origin on the belt top edge, Z out, leaning towards +X by `lean`. */
function braceChape(lean: number) {
  const d = new THREE.Vector3(Math.sin(lean), Math.cos(lean), 0);
  const WT = 0.0022, W = 0.025;
  const z = BT / 2 + WT / 2 + 0.0002;
  // the chape is sewn on the belt face; the buckle rises only a little above the top edge
  const p0 = new THREE.Vector3(-d.x * 0.034, -0.046, z), p1 = new THREE.Vector3(-d.x * 0.012, -0.016, z), p2 = d.clone().multiplyScalar(0.004).setZ(z);
  const web = [G.strap([p0, p1, p2], W, WT, [0, 0, 1], { samples: 12 })];
  const bk = gateBuckle(0.031, 0.02);
  bk.rotateZ(Math.PI);
  const bc = p2.clone().addScaledVector(d, 0.009).setZ(z + 0.0012);
  const brass = [placeOn(bk, bc, new THREE.Vector3(0, 0, 1), d)];
  web.push(G.strap([p2.clone().addScaledVector(d, 0.002).setZ(z + WT), p2.clone().addScaledVector(d, -0.016).setZ(z + WT)], W, WT, [0, 0, 1], { samples: 4 }));
  const thread = [placeOn(boxX(0, 0, 0.018, 0.018, 0), new THREE.Vector3(-d.x * 0.026, -0.034, z + WT / 2 + 0.0003), new THREE.Vector3(0, 0, 1), d.clone())];
  return { web, brass, thread, top: bc.clone().addScaledVector(d, 0.0086) };
}

export function buildWaistBelt37(opts: Belt37Options = {}): GearPiece {
  const def = defaultPath();
  const ft = frameTable(opts.points ?? def.pts, opts.normals ?? def.nrm);
  const L = ft.L;
  const parts: THREE.Object3D[] = [];
  // the single belt between the closure ends
  const body = subPath(ft.closed, ft.cn, CLOSURE_HALF, L - CLOSURE_HALF, Math.max(60, Math.round((L - 2 * CLOSURE_HALF) / 0.008)));
  parts.push(part(G.strap(body.pts, BW, BT, body.nrm, { samples: body.pts.length * 2 }), UK.belting(), { name: 'belt' }));
  // woven selvedge ridges along both edges
  const selv: THREE.BufferGeometry[] = [];
  for (const dy of [BW / 2 - 0.0028, -BW / 2 + 0.0028]) {
    const row = body.pts.map((p, i) => {
      const f = ft.at(CLOSURE_HALF + ((L - 2 * CLOSURE_HALF) * i) / (body.pts.length - 1));
      return p.clone().addScaledVector(body.nrm[i], BT / 2 + 0.0002).addScaledVector(f.y, dy);
    });
    selv.push(stitches(row, { len: 0.0045, gap: 0.0011, r: 0.0004 }));
  }
  // closure, bent along the path
  const clo = belt37ClosureGeometry();
  parts.push(part(bend(clo.belting, ft), UK.belting()), part(bend(clo.brass, ft), UK.brass(), { name: 'buckle' }));
  // rear brace buckles
  const rear = opts.rearAt ?? [0.39, 0.61];
  const web: THREE.BufferGeometry[] = [], brass: THREE.BufferGeometry[] = [];
  const anchors: THREE.Vector3[] = [];
  rear.forEach((fr, k) => {
    const f = ft.at(fr * L);
    const m = new THREE.Matrix4().makeBasis(f.t, f.y, f.n).setPosition(f.p.clone().addScaledVector(f.y, BW / 2));
    const c = braceChape(k === 0 ? 0.75 : -0.75);
    for (const g of c.web) web.push(g.applyMatrix4(m));
    for (const g of c.brass) brass.push(g.applyMatrix4(m));
    for (const g of c.thread) selv.push(g.applyMatrix4(m));
    anchors.push(c.top.applyMatrix4(m));
  });
  parts.push(part(merge(selv), UK.thread()));
  parts.push(part(merge(web), UK.webStrap()), part(merge(brass), UK.brass()));
  const obj = group(parts);
  obj.name = 'uk-waist-belt-37';
  const size = new THREE.Box3().setFromObject(obj, true).getSize(new THREE.Vector3());
  return {
    id: 'uk-waist-belt-37',
    name: 'Belt, waist, W.E. Patt. 37',
    object: obj,
    mount: 'belt-front-left',
    size: { w: size.x, h: size.y, d: size.z },
    belt: { loopWidth: BW },
    strapAnchors: anchors,
  };
}

void frameAt;

/**
 * Frame on the belt's OUTER face at arc fraction f (0 = the buckle at the front centre, running
 * towards the wearer's left: ~0.25 left side, 0.5 back, ~0.75 right side), as a Matrix4 in the
 * GearPiece convention (+X along the belt towards the wearer's left at the front, +Y up, +Z out).
 * Uses the same path as buildWaistBelt37(opts) (default oval without a path) - handy to lay out
 * belt items on the display belt.
 */
export function belt37FrameAt(f: number, opts: Belt37Options = {}): THREE.Matrix4 {
  const def = defaultPath();
  const ft = frameTable(opts.points ?? def.pts, opts.normals ?? def.nrm);
  const fr = ft.at(f * ft.L);
  return new THREE.Matrix4().makeBasis(fr.t, fr.y, fr.n).setPosition(fr.p.clone().addScaledVector(fr.n, BT / 2));
}
