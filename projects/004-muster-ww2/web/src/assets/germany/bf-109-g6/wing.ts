/**
 * Bf 109 G-6 wing, BODY frame, port side (mirrored for starboard).
 *
 * Planform after the published span/area: straight tapered wing with the F/G rounded tip,
 * NACA 2R1 14.2 % root to 11.35 % tip (approximated by a 2 % cambered NACA 4-digit section),
 * 6.5 deg dihedral outboard of a flat centre section that runs under the fuselage.
 * The automatic leading-edge slats are shown dropped open, as usual on a parked 109, so their
 * recess in the wing nose is modelled. Underneath: open wheel well + leg slot (with liners),
 * the shallow coolant radiator with its intake, core and exit flap, pitot tube (port).
 */
import * as THREE from 'three';
import { part, group } from '../../../core/kit';
import { gridGeo, lerp, smooth, stripCap, nacaT, nacaC, cosSpace, frameBar } from './geom';
import { B, DIM, DEG } from './frame';
import { skin, P } from './paint';
import { crease } from '../../../core/geo/shapes';

export const WG = {
  flatAx: 0.3,
  tipAx: DIM.semi,
  roundAx: 4.28,
  yRoot: -0.484,
  inc: 1.0 * DEG,
  tRoot: 0.142,
  tTip: 0.1135,
  m: 0.02,
  p: 0.35,
  slat: { ax0: 2.92, ax1: 4.52, uUp: 0.14, uLo: 0.055, recess: 0.016, thick: 0.0125 },
};

const leS = (ax: number) => 2.1 + 0.0739 * ax;
const teS = (ax: number) => 4.2 - 0.126 * ax;

/** Leading / trailing edge station at half-span ax (with the rounded tip). */
export function planform(ax: number): { le: number; te: number } {
  const le0 = leS(ax), te0 = teS(ax);
  if (ax <= WG.roundAx) return { le: le0, te: te0 };
  const c0 = te0 - le0;
  const q = Math.min(1, (ax - WG.roundAx) / (WG.tipAx - WG.roundAx));
  const e = Math.sqrt(Math.max(0, 1 - q * q));
  const sp = le0 + 0.42 * c0;
  return { le: sp - 0.42 * c0 * e, te: sp + 0.58 * c0 * e };
}
export const tcAt = (ax: number) => lerp(WG.tRoot, WG.tTip, Math.min(1, ax / WG.tipAx));
export const y0At = (ax: number) => WG.yRoot + Math.max(0, ax - WG.flatAx) * Math.tan(DIM.dihedral);

/** Surface point (body frame) at half-span ax, chord fraction u, upper or lower side. */
export function wingPt(ax: number, u: number, upper: boolean, side = 1): THREE.Vector3 {
  const { le, te } = planform(ax);
  const c = te - le;
  const t = tcAt(ax);
  const yc = nacaC(u, WG.m, WG.p), yt = nacaT(u, t);
  const y = y0At(ax) - u * c * Math.sin(WG.inc) + c * (upper ? yc + yt : yc - yt);
  return B(side * ax, y, le + u * c);
}

/** In-section outward normal (y, s components) at (ax, u) by finite differences. */
function secNormal(ax: number, u: number, upper: boolean): { ny: number; ns: number } {
  const e = 0.002;
  const a = wingPt(ax, Math.max(0, u - e), upper), b = wingPt(ax, Math.min(1, u + e), upper);
  const ds = -(b.z - a.z), dy = b.y - a.y; // along the surface in (s, y)
  const l = Math.hypot(ds, dy) || 1;
  // outward: upper side -> rotate (ds, dy) by +90 deg in (s, y) giving (-dy, ds); lower side opposite
  const sgn = upper ? 1 : -1;
  return { ns: (-dy / l) * sgn, ny: (ds / l) * sgn };
}

const NU = 40;
const US = cosSpace(NU);

/** Airfoil ring with duplicated points at the slat recess steps; depth = recess depth (0 outside). */
function wingRing(ax: number, depth: number): THREE.Vector3[] {
  const { uUp, uLo } = WG.slat;
  const pts: THREE.Vector3[] = [];
  const push = (u: number, upper: boolean, d: number) => {
    const p = wingPt(ax, u, upper);
    if (d > 0) {
      const n = secNormal(ax, u, upper);
      p.y -= n.ny * d;
      p.z += n.ns * d; // s = -z
    }
    pts.push(p);
  };
  // upper: TE -> LE
  const upU = US.filter((u) => u > uUp).reverse();
  for (const u of upU) push(u, true, 0);
  push(uUp, true, 0);
  push(uUp, true, depth);
  for (const u of US.filter((u) => u < uUp && u > 0).reverse()) push(u, true, depth);
  push(0, true, depth);
  for (const u of US.filter((u) => u > 0 && u < uLo)) push(u, false, depth);
  push(uLo, false, depth);
  push(uLo, false, 0);
  for (const u of US.filter((u) => u > uLo)) push(u, false, 0);
  return pts;
}

function wingStations(): number[] {
  const out: number[] = [];
  for (let ax = 0; ax < WG.roundAx - 0.01; ax += 0.1) out.push(ax);
  out.push(WG.flatAx);
  const K = 16;
  for (let k = 0; k <= K; k++) out.push(WG.roundAx + (WG.tipAx - WG.roundAx) * Math.sin((Math.PI / 2) * (k / K) * 0.985));
  out.push(WG.slat.ax0, WG.slat.ax1);
  return [...new Set(out.map((v) => Math.round(v * 1e4) / 1e4))].sort((a, b) => a - b);
}

function wingSkin(): THREE.BufferGeometry {
  const { ax0, ax1, recess } = WG.slat;
  const rows: THREE.Vector3[][] = [];
  for (const ax of wingStations()) {
    if (Math.abs(ax - ax0) < 1e-6) {
      rows.push(wingRing(ax, 0), wingRing(ax, recess));
    } else if (Math.abs(ax - ax1) < 1e-6) {
      rows.push(wingRing(ax, recess), wingRing(ax, 0));
    } else rows.push(wingRing(ax, ax > ax0 && ax < ax1 ? recess : 0));
  }
  const g = gridGeo(rows, { closedU: true, capStart: false, capEnd: true });
  return crease(g, 42);
}

/** Dropped-open leading-edge slat (a thin shell following the wing nose). */
function slat(): THREE.Object3D {
  const { ax0, ax1, uUp, uLo, thick } = WG.slat;
  const rows: THREE.Vector3[][] = [];
  const n = 18;
  const alpha = 12 * DEG; // nose-down rotation about the slat leading edge
  const dS = -0.07, dY = -0.02;
  const gap = 0.004;
  for (let i = 0; i <= n; i++) {
    const ax = lerp(ax0 + gap, ax1 - gap, i / n);
    const outer: THREE.Vector3[] = [];
    const inner: THREE.Vector3[] = [];
    const us: [number, boolean][] = [];
    for (const u of US.filter((u) => u < uUp).reverse()) us.push([u, true]);
    us.unshift([uUp, true]);
    for (const u of US.filter((u) => u > 0 && u < uLo)) us.push([u, false]);
    us.push([uLo, false]);
    for (const [u, up] of us) {
      const p = wingPt(ax, u, up);
      const nn = secNormal(ax, u, up);
      outer.push(p.clone());
      const q = p.clone();
      q.y -= nn.ny * thick;
      q.z += nn.ns * thick;
      inner.push(q);
    }
    // deploy: rotate nose-down about the slat leading edge, then translate forward/down
    const le = wingPt(ax, 0, true);
    const tf = (v: THREE.Vector3) => {
      const ds = -v.z + le.z, dy = v.y - le.y; // s = -z
      const ds2 = ds * Math.cos(alpha) - dy * Math.sin(alpha);
      const dy2 = ds * Math.sin(alpha) + dy * Math.cos(alpha);
      return new THREE.Vector3(v.x, le.y + dy2 + dY, -(-le.z + ds2 + dS));
    };
    const ring = [...outer.map(tf), ...inner.reverse().map(tf)];
    rows.push(ring);
  }
  const shell = crease(gridGeo(rows, { closedU: true }), 50);
  const out: THREE.Object3D[] = [part(shell, skin('WING'))];
  out.push(part(stripCap(rows[0], new THREE.Vector3(-1, 0, 0)), skin('WING')));
  out.push(part(stripCap(rows[rows.length - 1], new THREE.Vector3(1, 0, 0)), skin('WING')));
  // two guide rails between the slat and the recess
  for (const ax of [ax0 + 0.28, ax1 - 0.3]) {
    const a = wingPt(ax, 0.02, false).add(new THREE.Vector3(0, 0.03, 0.0));
    const b = a.clone().add(new THREE.Vector3(0, 0.0, 0.07));
    out.push(part(frameBar(a.clone().add(new THREE.Vector3(0, 0, -0.03)), b, 0.012, 0.028, new THREE.Vector3(0, 1, 0), 0, 0.003), P.steel()));
  }
  return group(out);
}

/** Wheel well + leg slot liners (open towards the discarded skin below). */
function wellLiner(): THREE.Object3D {
  const cx = 1.36, cs = 2.68, r = 0.345;
  const N = 48;
  const bottom: THREE.Vector3[] = [], top: THREE.Vector3[] = [];
  let roofY = Infinity;
  for (let k = 0; k <= N; k++) {
    const a = (k / N) * Math.PI * 2;
    const ax = cx + r * Math.cos(a), s = cs + r * Math.sin(a);
    const { le, te } = planform(ax);
    const u = (s - le) / (te - le);
    roofY = Math.min(roofY, wingPt(ax, u, true).y - 0.035);
  }
  for (let k = 0; k <= N; k++) {
    const a = (k / N) * Math.PI * 2;
    const ax = cx + (r + 0.002) * Math.cos(a), s = cs + (r + 0.002) * Math.sin(a);
    const { le, te } = planform(ax);
    const u = (s - le) / (te - le);
    const lo = wingPt(ax, u, false);
    bottom.push(new THREE.Vector3(ax, lo.y + 0.003, -s));
    top.push(new THREE.Vector3(ax, roofY, -s));
  }
  // wall with normals facing the well axis
  const wall = gridGeo([bottom, top], { closedU: false });
  flipIfOutward(wall, new THREE.Vector3(cx, roofY - 0.1, -cs));
  const roof = new THREE.CircleGeometry(r + 0.004, 48);
  roof.rotateX(Math.PI / 2); // facing down
  roof.translate(cx, roofY, -cs);
  // leg slot channel
  const s0 = 2.38, s1 = 2.53, x0 = 0.52, x1 = 1.12;
  const slot: THREE.BufferGeometry[] = [];
  const box = new THREE.BoxGeometry(x1 - x0, 0.16, s1 - s0);
  box.translate(0, 0.08, 0);
  box.rotateZ(DIM.dihedral);
  // position the box so its bottom sits just inside the lower skin
  const xm = (x0 + x1) / 2;
  const lo = wingPt(xm, (2.455 - planform(xm).le) / (planform(xm).te - planform(xm).le), false).y;
  box.translate(xm, lo + 0.002, -(s0 + s1) / 2);
  flipAll(box);
  slot.push(box);
  return group([part(wall, P.rlm02()), part(roof, P.rlm02()), part(slot[0], P.rlm02())]);
}

function flipAll(g: THREE.BufferGeometry) {
  const idx = g.index!.array as Uint32Array | Uint16Array;
  for (let k = 0; k < idx.length; k += 3) {
    const t = idx[k + 1];
    idx[k + 1] = idx[k + 2];
    idx[k + 2] = t;
  }
  g.computeVertexNormals();
}
function flipIfOutward(g: THREE.BufferGeometry, inside: THREE.Vector3) {
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  let score = 0;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 5) {
    v.fromBufferAttribute(p, i).sub(inside);
    score += Math.sign(v.x * n.getX(i) + v.z * n.getZ(i));
  }
  if (score > 0) flipAll(g);
}

/** Underwing coolant radiator (port). */
function radiator(): THREE.Object3D {
  const xa = 0.93, xb = 1.63, xc = (xa + xb) / 2, hw = (xb - xa) / 2;
  const s0 = 3.08, s1 = 3.68;
  const tilt = DIM.dihedral;
  const lowerAt = (x: number, s: number) => {
    const { le, te } = planform(x);
    return wingPt(x, (s - le) / (te - le), false).y;
  };
  const depthAt = (s: number) => lerp(0.125, 0.115, (s - s0) / (s1 - s0));
  const ring = (s: number, inset = 0): THREE.Vector3[] => {
    const yw = lowerAt(xc, s);
    const d = depthAt(s) - inset;
    const out: THREE.Vector3[] = [];
    const N = 40;
    const ex = 5;
    const cy = yw - d / 2 + 0.05;
    const hh = d / 2 + 0.05;
    for (let k = 0; k < N; k++) {
      const t = (k / N) * Math.PI * 2;
      const c = Math.cos(t), sn = Math.sin(t);
      const lx = (hw - inset) * Math.sign(c) * Math.pow(Math.abs(c), 2 / ex);
      const ly = hh * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / ex);
      // tilt with the dihedral about the housing centre
      const x = xc + lx * Math.cos(tilt) - ly * Math.sin(tilt);
      const y = cy + lx * Math.sin(tilt) + ly * Math.cos(tilt);
      out.push(new THREE.Vector3(x, y, -s));
    }
    return out;
  };
  const rows: THREE.Vector3[][] = [];
  for (let i = 0; i <= 10; i++) rows.push(ring(lerp(s0, s1, i / 10)));
  const shell = gridGeo(rows, { closedU: true });
  const irows = [ring(s0 - 0.001, 0.012), ring(s0 + 0.1, 0.012)];
  const duct = gridGeo(irows, { closedU: true });
  flipAll(duct);
  const lipPts = ring(s0, 0.006);
  const lip = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPts, true), 96, 0.007, 8, true);
  const ywF = lowerAt(xc, s0 + 0.1);
  const core = new THREE.BoxGeometry(xb - xa - 0.03, 0.15, 0.03);
  core.rotateZ(tilt);
  core.translate(xc, ywF - 0.05, -(s0 + 0.1));
  // exit: dark rear face and the lower flap, slightly open
  const ywR = lowerAt(xc, s1);
  const rear = new THREE.PlaneGeometry(xb - xa - 0.02, 0.1);
  rear.rotateY(Math.PI);
  rear.rotateZ(tilt);
  rear.translate(xc, ywR - 0.055, -(s1 - 0.004));
  const fa = new THREE.Vector3(xc, ywR - depthAt(s1) + 0.004, -(s1 - 0.01));
  const fb = new THREE.Vector3(xc, ywR - depthAt(s1) - 0.012, -(s1 + 0.27));
  const flap = frameBar(fa, fb, xb - xa - 0.005, 0.009, new THREE.Vector3(-Math.sin(tilt), Math.cos(tilt), 0), 0, 0.003);
  return group([
    part(shell, skin('WING')),
    part(duct, skin('WING')),
    part(lip, skin('WING')),
    part(core, P.matrix()),
    part(rear, P.black()),
    part(flap, skin('WING')),
  ]);
}

/** Pitot tube under the port wing. */
function pitot(): THREE.Object3D {
  const ax = 3.78;
  const { le } = planform(ax);
  const root = wingPt(ax, 0.1, false);
  const low = root.clone().add(new THREE.Vector3(0, -0.075, 0.03));
  const tip = new THREE.Vector3(ax, low.y, -(le - 0.2));
  const strut = frameBar(root.clone().add(new THREE.Vector3(0, 0.01, 0)), low, 0.012, 0.035, new THREE.Vector3(0, 0, 1), 0, 0.004);
  const tube = frameBar(low.clone().add(new THREE.Vector3(0, 0, -0.03)), tip, 0.014, 0.014, new THREE.Vector3(0, 1, 0), 0, 0.0065);
  const head = new THREE.CylinderGeometry(0.004, 0.008, 0.05, 12);
  head.rotateX(Math.PI / 2);
  head.translate(tip.x, tip.y, tip.z + 0.02);
  return group([part(strut, P.steel()), part(tube, P.steel()), part(head, P.steel())]);
}

/** Wingtip navigation light (red port / green starboard via vertex colour). */
export function navLight(side: 1 | -1): THREE.Object3D {
  const ax = 4.74;
  const { le, te } = planform(ax);
  const u = 0.3;
  const p = wingPt(ax, u, true, side);
  const g = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(0.018, 0.016, 0.045);
  g.translate(p.x, p.y - 0.004, p.z);
  const col = new THREE.Color(side > 0 ? 0xd0281c : 0x1f9a44);
  const c = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < g.attributes.position.count; i++) col.toArray(c, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  void le;
  void te;
  return part(g, P.lens() as unknown as THREE.Material);
}

export function buildWingPort(): THREE.Object3D {
  return group([part(wingSkin(), skin('WING')), slat(), wellLiner(), radiator()]);
}
export function buildPitot(): THREE.Object3D {
  return pitot();
}
