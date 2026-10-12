/**
 * Helmet, steel, Mk II (British Army, 1938-45) - the WWII "Brodie": a shallow bowl pressed in
 * one piece from manganese steel with a wide sloping brim, a separate non-magnetic rim edging
 * crimped round the brim edge (joined at the back), khaki-green paint with a rough anti-glare
 * finish. Mk II (1936-38 pattern) liner: black oilcloth headband held off the shell by rubber
 * buffers, a single oilcloth piece with five fingers laced together at the top by a cord, a pressed
 * fibre cross and a rubber "celtic cross" crown pad, the whole liner held by one bolt through the
 * crown (domed nut outside). Flat chinstrap lugs riveted to the bowl sides; elasticated khaki
 * chinstrap with fabric-covered spring ends, wire hooks and a sliding adjuster.
 *
 * Helmet-local frame: origin = centre of the head opening at the lower edge of the liner headband
 * (the band plane, which is also the bowl/brim junction), +Z = forward (brow), +Y = up,
 * +X = wearer's left.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { UK } from './palette';
import { stitches, taperedSheet, roundedEnds, subPath, frameAt, placeOn, wireFrame, patchSheet, merge } from './helpers';

// ---- shell parameters (outer surface, metres) ----
const A = 0.1; // bowl base half-width (X) where the wall is vertical
const B = 0.118; // bowl base half-length (Z)
const H = 0.108; // outer crown height above the band plane
const RF = 0.009; // fillet radius bowl -> brim
const W = 0.038; // brim width (plan offset from the bowl base line)
const T = 0.0011; // plate thickness (0.036 in manganese steel, drawn a hair heavier)
const NX = 2.15, NY = 2.1; // dome superellipse exponents
const S_DOME = 0.6, S_FIL = 0.72; // parameter split: dome | fillet | brim
/** Rim edge drop below the band plane: 8.5 mm at the sides, 12 mm front and back. */
const drop = (u: number) => 0.0085 + 0.0035 * Math.cos(u) ** 2;

const U = 60;

function planDir(u: number) {
  // point on the base ellipse and its outward plan normal
  const e = new THREE.Vector2(A * Math.sin(u), B * Math.cos(u));
  const n = new THREE.Vector2(Math.sin(u) / A, Math.cos(u) / B).normalize();
  return { e, n };
}

/** Outer shell point for azimuth u (0 = front, +pi/2 = +X) and meridian parameter s (0 crown .. 1 rim edge). */
function outerPt(u: number, s: number): THREE.Vector3 {
  const { e, n } = planDir(u);
  if (s <= S_DOME) {
    const phi = (Math.min(1, Math.max(0, s / S_DOME)) * Math.PI) / 2;
    const rho = Math.pow(Math.sin(phi), 2 / NX);
    const y = RF + (H - RF) * Math.pow(Math.cos(phi), 2 / NY);
    return new THREE.Vector3(e.x * rho, y, e.y * rho);
  }
  if (s <= S_FIL) {
    const a = ((s - S_DOME) / (S_FIL - S_DOME)) * (Math.PI / 2); // 0 = vertical wall, pi/2 = horizontal
    const d = RF - RF * Math.cos(a);
    const y = RF - RF * Math.sin(a);
    return new THREE.Vector3(e.x + n.x * d, y, e.y + n.y * d);
  }
  const f = (s - S_FIL) / (1 - S_FIL);
  const d = RF + (W - RF) * f;
  const y = -drop(u) * Math.pow(f, 1.25);
  return new THREE.Vector3(e.x + n.x * d, y, e.y + n.y * d);
}

let normalSign = 0;
/** Outward unit normal of the outer surface. */
function outerN(u: number, s: number): THREE.Vector3 {
  if (s < 1e-3) return new THREE.Vector3(0, 1, 0);
  const e = 1e-4;
  const du = outerPt(u + e, s).sub(outerPt(u - e, s));
  const ds = outerPt(u, Math.min(1, s + e)).sub(outerPt(u, Math.max(0, s - e)));
  const n = new THREE.Vector3().crossVectors(du, ds).normalize();
  if (!normalSign) {
    // calibrate once on the bowl side wall: outward = away from the axis
    const p = outerPt(Math.PI / 2, 0.4);
    const du2 = outerPt(Math.PI / 2 + e, 0.4).sub(outerPt(Math.PI / 2 - e, 0.4));
    const ds2 = outerPt(Math.PI / 2, 0.4 + e).sub(outerPt(Math.PI / 2, 0.4 - e));
    normalSign = new THREE.Vector3().crossVectors(du2, ds2).dot(new THREE.Vector3(p.x, 0, p.z)) > 0 ? 1 : -1;
  }
  return n.multiplyScalar(normalSign);
}

/** Outer dome height at normalised plan radius rho (0 axis .. 1 bowl base). */
function domeY(rho: number): number {
  return RF + (H - RF) * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, rho), NX)), 1 / NY);
}
const rhoOf = (x: number, z: number) => Math.hypot(x / A, z / B);

/** Meridian parameter where the outer dome reaches height y (RF < y < H). */
function sAtY(y: number): number {
  const c = Math.pow(Math.min(1, Math.max(0, (y - RF) / (H - RF))), NY / 2);
  return (Math.acos(c) / (Math.PI / 2)) * S_DOME;
}

function rows(n: number, a: number, b: number, bias = 1): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(a + (b - a) * Math.pow(i / n, bias));
  return out;
}

function shellGeometry(): THREE.BufferGeometry {
  const so = [...rows(16, 0, S_DOME, 0.8), ...rows(4, S_DOME, S_FIL), ...rows(8, S_FIL, 1), 1];
  const si = [...rows(8, 0, S_DOME, 0.8), ...rows(3, S_DOME, S_FIL), ...rows(5, S_FIL, 1), 1];
  const ring: { p: THREE.Vector3; n: THREE.Vector3 }[][] = [];
  for (const s of so) {
    ring.push(Array.from({ length: U }, (_, j) => {
      const u = (j / U) * Math.PI * 2;
      return { p: outerPt(u, s), n: outerN(u, s) };
    }));
  }
  // edge wall (hidden under the rim edging)
  ring.push(Array.from({ length: U }, (_, j) => {
    const u = (j / U) * Math.PI * 2;
    const n = outerN(u, 1);
    const ds = outerPt(u, 1).sub(outerPt(u, 0.999)).normalize();
    return { p: outerPt(u, 1).addScaledVector(n, -T / 2).addScaledVector(ds, T * 0.4), n: ds };
  }));
  for (let i = si.length - 1; i >= 0; i--) {
    const s = si[i];
    ring.push(Array.from({ length: U }, (_, j) => {
      const u = (j / U) * Math.PI * 2;
      const n = outerN(u, s);
      return { p: outerPt(u, s).addScaledVector(n, -T), n: n.clone().negate() };
    }));
  }
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  for (const r of ring) for (const v of r) {
    pos.push(v.p.x, v.p.y, v.p.z);
    nrm.push(v.n.x, v.n.y, v.n.z);
  }
  for (let i = 0; i < ring.length - 1; i++) {
    for (let j = 0; j < U; j++) {
      const a = i * U + j, b = i * U + ((j + 1) % U), c = (i + 1) * U + j, d = (i + 1) * U + ((j + 1) % U);
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  // winding must agree with the supplied normals (test a face on the outer side wall)
  const i0 = (8 * U + 5) * 6;
  const P0 = new THREE.Vector3().fromArray(pos, idx[i0] * 3), P1 = new THREE.Vector3().fromArray(pos, idx[i0 + 1] * 3), P2 = new THREE.Vector3().fromArray(pos, idx[i0 + 2] * 3);
  const fn = P1.clone().sub(P0).cross(P2.clone().sub(P0));
  if (fn.dot(new THREE.Vector3().fromArray(nrm, idx[i0] * 3)) < 0) G.flipWinding(g);
  return g;
}

/** Rim edging: a flattened tube wrapping the brim edge, open at the back where a clip covers the joint. */
function rimGeometry(): { rim: THREE.BufferGeometry; joint: THREE.BufferGeometry } {
  const ae = 0.0031, an = 0.002;
  const sec = 8;
  const tube = (u0: number, u1: number, n: number, k: number) => {
    const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const u = u0 + ((u1 - u0) * i) / n;
      const p = outerPt(u, 1), nn = outerN(u, 1);
      const tg = outerPt(u, 1).sub(outerPt(u, 0.995)).normalize();
      const c = p.addScaledVector(nn, -T / 2).addScaledVector(tg, -0.0008);
      for (let j = 0; j < sec; j++) {
        const th = (j / sec) * Math.PI * 2;
        const q = c.clone().addScaledVector(tg, ae * k * Math.cos(th)).addScaledVector(nn, an * k * Math.sin(th));
        const m = tg.clone().multiplyScalar(Math.cos(th) / ae).addScaledVector(nn, Math.sin(th) / an).normalize();
        pos.push(q.x, q.y, q.z);
        nrm.push(m.x, m.y, m.z);
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < sec; j++) {
      const a = i * sec + j, b = i * sec + ((j + 1) % sec), c2 = (i + 1) * sec + j, d = (i + 1) * sec + ((j + 1) % sec);
      idx.push(a, b, c2, b, d, c2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setIndex(idx);
    const A0 = new THREE.Vector3().fromArray(pos, idx[0] * 3), A1 = new THREE.Vector3().fromArray(pos, idx[1] * 3), A2 = new THREE.Vector3().fromArray(pos, idx[2] * 3);
    const fn = A1.clone().sub(A0).cross(A2.clone().sub(A0));
    if (fn.dot(new THREE.Vector3().fromArray(nrm, idx[0] * 3)) < 0) G.flipWinding(g);
    // end caps (flat ellipses)
    const caps: THREE.BufferGeometry[] = [];
    for (const i of [0, n]) {
      const cp: number[] = [];
      const cn = new THREE.Vector3().fromArray(pos, (i * sec) * 3).sub(new THREE.Vector3().fromArray(pos, ((i === 0 ? 1 : n - 1) * sec) * 3)).normalize();
      for (let j = 1; j < sec - 1; j++) {
        const v0 = new THREE.Vector3().fromArray(pos, (i * sec) * 3), v1 = new THREE.Vector3().fromArray(pos, (i * sec + j) * 3), v2 = new THREE.Vector3().fromArray(pos, (i * sec + j + 1) * 3);
        const f = v1.clone().sub(v0).cross(v2.clone().sub(v0));
        const tri = f.dot(cn) > 0 ? [v0, v1, v2] : [v0, v2, v1];
        for (const q of tri) cp.push(q.x, q.y, q.z);
      }
      const cg = new THREE.BufferGeometry();
      cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
      cg.computeVertexNormals();
      caps.push(cg);
    }
    return merge([g, ...caps]);
  };
  const gapU = 0.012;
  const rim = tube(Math.PI + gapU, 3 * Math.PI - gapU, 120, 1);
  const joint = tube(Math.PI - 0.035, Math.PI + 0.035, 5, 1.2);
  return { rim, joint };
}

/** Azimuth + scale of a point on the scaled bowl ellipse through it: x = k A sin u, z = k B cos u. */
function ellipseCoords(p: THREE.Vector3): { u: number; k: number } {
  const k = Math.hypot(p.x / A, p.z / B);
  return { u: Math.atan2(p.x / A, p.z / B), k };
}

/** Point on the scaled ellipse (k, u) at height y. */
function onEllipse(k: number, u: number, y: number): THREE.Vector3 {
  return new THREE.Vector3(k * A * Math.sin(u), y, k * B * Math.cos(u));
}

/**
 * A strip across the crown along azimuth u (through the axis), following the inside of the dome
 * at `inset` below the inner shell surface: centre-line points and inward normals.
 */
function crownStrip(u: number, halfLen: number, inset: number): { pts: THREE.Vector3[]; nrm: THREE.Vector3[] } {
  // find the meridian parameter at arc length halfLen from the crown
  let sEnd = 0, acc = 0, prev = outerPt(u, 0);
  for (let i = 1; i <= 400 && acc < halfLen; i++) {
    const s = (i / 400) * S_DOME;
    const q = outerPt(u, s);
    acc += q.distanceTo(prev);
    prev = q;
    sEnd = s;
  }
  const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
  const N = 8;
  for (let i = N; i >= 1; i--) {
    const s = (i / N) * sEnd, n = outerN(u + Math.PI, s);
    pts.push(outerPt(u + Math.PI, s).addScaledVector(n, -(T + inset)));
    nrm.push(n.clone().negate());
  }
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * sEnd, n = outerN(u, s);
    pts.push(outerPt(u, s).addScaledVector(n, -(T + inset)));
    nrm.push(n.clone().negate());
  }
  return { pts, nrm };
}

export type ChinstrapMode = 'open' | 'none' | 'laid';

export interface Mk2HelmetOptions {
  /**
   * 'open' - the chinstrap hangs as a loop below the helmet from both lugs (worn, strap undone);
   * 'none' - no chinstrap (lugs only; draw a worn strap with `buildMk2Chinstrap`);
   * 'laid' - display: the strap leaves the lugs, passes under the side brims and lies on the
   *          surface in a loose loop in front of the helmet (the helmet rests on its brim).
   */
  chinstrap?: ChinstrapMode;
}

/** Height of the chinstrap-lug rivet above the band plane. */
const LUG_Y = 0.018;

/** Fit data for the infantry modules (helmet-local metres). */
export const MK2_FIT = {
  /** Band plane = bowl/brim junction; the rim edge droops below it. */
  rimSideY: -drop(Math.PI / 2),
  rimFrontY: -drop(0),
  /** Outer crown (without the bolt nut) and the lowest point of the crown pad inside. */
  crownY: H,
  padCrownY: H - T - 0.0085,
  /** Inside of the headband (half axes, X and Z) and its height range. */
  band: { a: A - T - 0.0122, b: B - T - 0.0122, y0: 0, y1: 0.034 },
  /** Overall shell size incl. rim: w along X, l along Z. */
  size: { w: 2 * (A + W + 0.0028), l: 2 * (B + W + 0.0028) },
  /** Chinstrap hook points (bottom of the lug bales), wearer's left +X first. */
  lugs: [new THREE.Vector3(A - T - 0.0016, LUG_Y - 0.0193, 0), new THREE.Vector3(-(A - T - 0.0016), LUG_Y - 0.0193, 0)],
};

const STRAP_W = 0.016, STRAP_T = 0.0018;


/**
 * Chinstrap along a caller-supplied path (helmet-local), from the +X lug hook to the -X lug hook,
 * with `outward` = strap face direction per point (away from the skin). Adds the fabric-covered
 * spring sections at both ends, the wire hooks and a sliding adjuster at `slideAt` (0..1).
 */
export function buildMk2Chinstrap(path: THREE.Vector3[], outward: THREE.Vector3[], slideAt = 0.3): THREE.Group {
  const web = UK.chinWeb(), steel = UK.blackSteel();
  const parts: THREE.Object3D[] = [];
  const L = new THREE.CatmullRomCurve3(path, false, 'centripetal').getLength();
  parts.push(part(G.strap(path, STRAP_W, STRAP_T, outward, { samples: Math.max(40, Math.round(L / 0.0055)) }), web));
  // fabric-covered spring sleeves near both ends, with a stitched turn-over at the hook
  const thread = UK.thread();
  for (const [s0, s1] of [[0.004, 0.05], [L - 0.05, L - 0.004]]) {
    const sp = subPath(path, outward, s0, s1, 10);
    parts.push(part(G.strap(sp.pts, STRAP_W + 0.0025, STRAP_T + 0.0026, sp.nrm, { samples: 30 }), web));
    // gathered ridges over the coil
    for (let k = 1; k < 7; k++) {
      const f = frameAt(path, outward, s0 + ((s1 - s0) * k) / 7);
      const b = new THREE.Vector3().crossVectors(f.t, f.n).normalize();
      const c = f.p.clone().addScaledVector(f.n, (STRAP_T + 0.0026) / 2);
      parts.push(part(stitches([c.clone().addScaledVector(b, -(STRAP_W + 0.002) / 2), c.clone().addScaledVector(b, (STRAP_W + 0.002) / 2)], { len: 0.02, gap: 0.001, r: 0.00045 }), thread));
    }
  }
  // wire hooks through the lug bales
  for (const end of [0, 1]) {
    const f = frameAt(path, outward, end === 0 ? 0 : L);
    const dir = end === 0 ? f.t.clone().negate() : f.t.clone(); // pointing out of the strap
    const p0 = f.p.clone().addScaledVector(dir, -0.004);
    const p1 = f.p.clone().addScaledVector(dir, 0.004);
    const p2 = f.p.clone().addScaledVector(dir, 0.0075).addScaledVector(f.n, 0.0025);
    const p3 = f.p.clone().addScaledVector(dir, 0.006).addScaledVector(f.n, 0.005);
    const p4 = f.p.clone().addScaledVector(dir, 0.002).addScaledVector(f.n, 0.0048);
    parts.push(part(G.tube([p0, p1, p2, p3, p4], 0.0009, 6, 20), steel));
  }
  // sliding adjuster: rectangular frame with a centre bar, riding on the strap
  const f = frameAt(path, outward, L * slideAt);
  const fr = wireFrame(STRAP_W + 0.004, 0.013, 0.0009, 0.0016, 36);
  fr.rotateZ(Math.PI / 2);
  const bar = G.rod([0, -(STRAP_W + 0.004) / 2 + 0.001, 0], [0, (STRAP_W + 0.004) / 2 - 0.001, 0], 0.0009, 6);
  bar.rotateZ(Math.PI / 2);
  const slide = merge([fr, bar]);
  // local: strap along Y, face +Z; the frame lies in XY with its long side across the strap (X)
  slide.rotateZ(Math.PI / 2);
  parts.push(part(placeOn(slide, f.p.clone().addScaledVector(f.n, STRAP_T / 2 + 0.0006), f.n, f.t), steel));
  // doubled strap end under the adjuster
  const sp = subPath(path, outward, L * slideAt - 0.03, L * slideAt + 0.006, 8);
  parts.push(part(G.strap(sp.pts.map((p, i) => p.clone().addScaledVector(sp.nrm[i], STRAP_T)), STRAP_W, STRAP_T, sp.nrm, { samples: 16 }), web));
  return group(parts);
}

/** The chinstrap lug: flat stamped plate riveted inside the bowl side, with a hanging loop. */
function lug(side: number, paint: THREE.Material, steel: THREE.Material): THREE.Object3D[] {
  const u = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  const s = sAtY(LUG_Y);
  const po = outerPt(u, s), n = outerN(u, s);
  const out: THREE.Object3D[] = [];
  // outside: domed rivet head, painted over
  out.push(part(G.scatter(G.rivetHead(0.0034), [{ p: po.clone().addScaledVector(n, -0.0002), n }]), paint));
  // inside: plate against the wall + peened rivet end
  const pi = po.clone().addScaledVector(n, -T - 0.0008);
  const plate = G.rbox(0.0015, 0.021, 0.013, 0.0006, 1);
  plate.translate(pi.x, pi.y - 0.004, pi.z);
  out.push(part(plate, steel));
  out.push(part(G.scatter(G.rivetHead(0.0022), [{ p: pi.clone().addScaledVector(n, -0.0008), n: n.clone().negate() }]), steel));
  // loop (bale) hanging below the plate, in the plane of the wall
  const lp = G.torus(0.0048, 0.00105, 6, 16, Math.PI);
  lp.rotateY(Math.PI / 2); // arc in the YZ plane
  lp.rotateX(Math.PI); // bulging downwards
  lp.translate(pi.x - side * 0.0008, pi.y - 0.0145, pi.z);
  out.push(part(lp, steel));
  return out;
}

export function buildMk2Helmet(opts: Mk2HelmetOptions = {}): GearPiece {
  const mode = opts.chinstrap ?? 'open';
  const paint = UK.helmetPaint();
  const steel = UK.blackSteel();
  const parts: THREE.Object3D[] = [part(shellGeometry(), paint, { name: 'shell' })];
  const { rim, joint } = rimGeometry();
  parts.push(part(rim, UK.rimPaint(), { name: 'rim' }), part(joint, UK.rimPaint()));

  // crown bolt: domed nut and washer outside (painted over), bolt head + washer inside
  const nut = G.lathe([[0, 0], [0.0066, 0], [0.0066, 0.0007], [0.0048, 0.0009], [0.0046, 0.0022], [0.0036, 0.0034], [0.002, 0.004], [0, 0.0042]], 16, 40);
  parts.push(part(nut, paint, { p: [0, H - 0.0003, 0] }));

  // ---- liner ----
  const oil = UK.oilcloth(), rubber = UK.rubber();
  const bandA = A - T - 0.0115, bandB = B - T - 0.0115;
  const bandPts: THREE.Vector3[] = [], bandN: THREE.Vector3[] = [];
  const NB = 72;
  for (let k = 0; k < NB; k++) {
    const u = (k / NB) * Math.PI * 2;
    const p = new THREE.Vector3(bandA * Math.sin(u), 0.017, bandB * Math.cos(u));
    bandPts.push(p);
    bandN.push(new THREE.Vector3(Math.sin(u) / bandA, 0, Math.cos(u) / bandB).normalize().negate());
  }
  parts.push(part(G.strap(bandPts, 0.034, 0.0013, bandN, { closed: true, smooth: false }), oil, { name: 'headband' }));
  // stitch row along the top and bottom of the band (inside face)
  const bandStitch = (y: number) => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 96; k++) {
      const u = (k / 96) * Math.PI * 2;
      const n = new THREE.Vector3(Math.sin(u) / bandA, 0, Math.cos(u) / bandB).normalize();
      pts.push(new THREE.Vector3(bandA * Math.sin(u), y, bandB * Math.cos(u)).addScaledVector(n, -0.0008));
    }
    return stitches(pts, { len: 0.004, gap: 0.0025, r: 0.0004 });
  };
  parts.push(part(bandStitch(0.0305), UK.thread()));
  // rubber buffers ("doughnuts") between the band and the shell
  const buf = G.lathe([[0.0022, -0.0052], [0.0052, -0.0052], [0.0058, -0.0044], [0.0058, 0.0044], [0.0052, 0.0052], [0.0022, 0.0052]], 9, 40);
  const bufs: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (let k = 0; k < 8; k++) {
    const u = ((k + 0.5) / 8) * Math.PI * 2;
    const n = new THREE.Vector3(Math.sin(u) / A, 0, Math.cos(u) / B).normalize();
    const p = new THREE.Vector3(bandA * Math.sin(u), 0.017, bandB * Math.cos(u)).addScaledVector(n, 0.0007 + 0.0052);
    bufs.push({ p, n });
  }
  parts.push(part(G.scatter(buf, bufs), rubber));

  // five oilcloth fingers rising from the band, laced together at the top
  const tips: THREE.Vector3[] = [];
  const fingerGeos: THREE.BufferGeometry[] = [];
  const FI = 0.0146; // inset of the fingers below the inner shell surface
  for (let k = 0; k < 5; k++) {
    const u = Math.PI + (k / 5) * Math.PI * 2;
    const dirX = Math.sin(u), dirZ = Math.cos(u);
    // centre line: inside the band top, up along the dome, then pulled in to the laced tip
    const cl: THREE.Vector3[] = [];
    for (const y of [0.022, 0.034, 0.046, 0.057, 0.066]) {
      const sv = sAtY(y);
      const n = outerN(u, sv);
      const q = outerPt(u, sv).addScaledVector(n, -(T + FI));
      q.y = Math.min(q.y, y);
      cl.push(q);
    }
    const tip = new THREE.Vector3(dirX * 0.037, 0.0835, dirZ * 0.043);
    cl.push(new THREE.Vector3(dirX * 0.056, 0.0775, dirZ * 0.065), tip);
    tips.push(tip.clone().add(new THREE.Vector3(0, -0.0012, 0)));
    const curve = new THREE.CatmullRomCurve3(cl, false, 'centripetal');
    const Lf = curve.getLength();
    const NR = 16, NC = 6;
    const grid: THREE.Vector3[][] = [];
    for (let i = 0; i <= NR; i++) {
      const t = i / NR;
      const c = curve.getPointAt(t);
      const ec = ellipseCoords(c);
      // half width shrinks with the circumference; round the tip
      const d = (1 - t) * Lf, rc = 0.012;
      const endF = d < rc ? Math.sqrt(Math.max(0.03, 1 - ((rc - d) / rc) ** 2)) : 1;
      // the five fingers are cut from one piece: they fill ~80% of the circumference, meeting in
      // shallow V notches at the band
      const du = THREE.MathUtils.lerp(0.62, 0.5, Math.min(1, t / 0.25)) * endF;
      const row: THREE.Vector3[] = [];
      for (let j = 0; j <= NC; j++) {
        const f = (j / NC) * 2 - 1;
        row.push(onEllipse(ec.k, ec.u + f * du, c.y));
      }
      grid.push(row);
    }
    fingerGeos.push(patchSheet(grid, 0.0011, new THREE.Vector3(-dirX, -0.6, -dirZ)));
  }
  parts.push(part(merge(fingerGeos), oil, { name: 'liner-fingers' }));
  // lacing cord through the finger tips (slightly sagging between them), bow at the back
  const lace: THREE.Vector3[] = [];
  for (let k = 0; k < 5; k++) {
    const a = tips[k], b = tips[(k + 1) % 5];
    for (let i = 0; i < 4; i++) {
      const f = i / 4;
      const p = a.clone().lerp(b, f);
      p.y -= 0.0035 * Math.sin(Math.PI * f);
      p.x *= 1 - 0.06 * Math.sin(Math.PI * f);
      p.z *= 1 - 0.06 * Math.sin(Math.PI * f);
      lace.push(p);
    }
  }
  const cord = UK.cord();
  parts.push(part(G.tube(lace, 0.001, 5, 48, true), cord));
  const kb = tips[0].clone();
  const bow = [
    [kb, kb.clone().add(new THREE.Vector3(0.008, -0.004, 0.003)), kb.clone().add(new THREE.Vector3(0.012, -0.002, 0.006)), kb.clone().add(new THREE.Vector3(0.004, 0.0005, 0.003)), kb],
    [kb, kb.clone().add(new THREE.Vector3(-0.008, -0.004, 0.003)), kb.clone().add(new THREE.Vector3(-0.012, -0.002, 0.006)), kb.clone().add(new THREE.Vector3(-0.004, 0.0005, 0.003)), kb],
    [kb, kb.clone().add(new THREE.Vector3(0.003, -0.012, 0.004)), kb.clone().add(new THREE.Vector3(0.005, -0.02, 0.006))],
    [kb, kb.clone().add(new THREE.Vector3(-0.002, -0.011, 0.005)), kb.clone().add(new THREE.Vector3(-0.003, -0.018, 0.008))],
  ];
  parts.push(part(merge(bow.map((b) => G.tube(b, 0.0009, 4, 10))), cord));

  // crown: rubber "celtic cross" pad against the shell, fibre cross below it, bolt head in the middle
  const padT = 0.0075;
  const ring = G.lathe([[0.0235, -padT], [0.031, -padT], [0.031, 0], [0.0235, 0]], 32, 40);
  const pa = ring.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) pa.setY(i, pa.getY(i) + domeY(rhoOf(pa.getX(i), pa.getZ(i))) - T - 0.0001);
  ring.computeVertexNormals();
  const padGeos: THREE.BufferGeometry[] = [ring];
  for (const u of [0, Math.PI / 2]) {
    const st = crownStrip(u, 0.039, padT / 2 + 0.0001);
    const L = new THREE.CatmullRomCurve3(st.pts, false, 'centripetal').getLength();
    padGeos.push(taperedSheet(st.pts, st.nrm, roundedEnds(0.0065, L, 0.004, 0.004), padT, { samples: 24 }));
  }
  parts.push(part(merge(padGeos), rubber, { name: 'crown-pad' }));
  const fibreGeos: THREE.BufferGeometry[] = [];
  for (const [u, half] of [[0, 0.075], [Math.PI / 2, 0.062]] as [number, number][]) {
    const st = crownStrip(u, half, padT + 0.0013);
    const L = new THREE.CatmullRomCurve3(st.pts, false, 'centripetal').getLength();
    fibreGeos.push(taperedSheet(st.pts, st.nrm, roundedEnds(0.0095, L, 0.006, 0.006), 0.0022, { samples: 28 }));
  }
  parts.push(part(merge(fibreGeos), UK.fibre()));
  // rivets through the fibre strip ends
  const fr: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (const [u, half] of [[0, 0.075], [Math.PI / 2, 0.062]] as [number, number][]) {
    const st = crownStrip(u, half - 0.008, padT + 0.0013 + 0.0011);
    for (const i of [0, st.pts.length - 1]) fr.push({ p: st.pts[i], n: st.nrm[i] });
  }
  parts.push(part(G.scatter(G.rivetHead(0.0022), fr), UK.brassDark()));
  const bh = G.lathe([[0, 0], [0.0085, 0], [0.0085, 0.0008], [0.0052, 0.001], [0.0052, 0.0034], [0.0035, 0.0042], [0, 0.0044]], 16, 40);
  bh.rotateX(Math.PI);
  parts.push(part(bh, UK.brassDark(), { p: [0, H - T - padT - 0.0023, 0] }));

  // chinstrap lugs
  for (const side of [1, -1]) parts.push(...lug(side, paint, steel));

  // ---- chinstrap ----
  const [lugL, lugR] = MK2_FIT.lugs;
  if (mode === 'open') {
    const path: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    const ctr = new THREE.Vector3(0, -0.07, 0.01);
    const pts = [
      lugL.clone(),
      new THREE.Vector3(lugL.x - 0.001, -0.03, 0.004),
      new THREE.Vector3(lugL.x * 0.86, -0.075, 0.012),
      new THREE.Vector3(lugL.x * 0.5, -0.118, 0.018),
      new THREE.Vector3(0, -0.13, 0.02),
      new THREE.Vector3(lugR.x * 0.5, -0.118, 0.018),
      new THREE.Vector3(lugR.x * 0.86, -0.075, 0.012),
      new THREE.Vector3(lugR.x + 0.001, -0.03, 0.004),
      lugR.clone(),
    ];
    for (const p of pts) {
      path.push(p);
      const d = p.clone().sub(ctr);
      d.z = 0;
      nrm.push(d.normalize());
    }
    parts.push(buildMk2Chinstrap(path, nrm, 0.32));
  } else if (mode === 'laid') {
    parts.push(buildMk2Chinstrap(...laidPath(), 0.24));
  }

  const obj = group(parts);
  obj.name = 'uk-mk2-helmet';
  return {
    id: 'uk-mk2-helmet',
    name: 'Helmet, steel, Mk II',
    object: obj,
    mount: 'head',
    size: { w: MK2_FIT.size.w, h: H + 0.004 + drop(0) + 0.003, d: MK2_FIT.size.l },
  };
}

/** Lowest point of the rim edging (the helmet rests here on a flat surface). */
export function mk2RestY(): number {
  const { rim } = rimGeometry();
  rim.computeBoundingBox();
  return rim.boundingBox!.min.y;
}

/** Display path: from the lugs down under the side brims onto the floor and round the front. */
function laidPath(): [THREE.Vector3[], THREE.Vector3[]] {
  const floor = mk2RestY() + STRAP_T / 2 + 0.00005;
  const lugL = MK2_FIT.lugs[0];
  const half = (side: number) => {
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    const add = (x: number, y: number, z: number, n: [number, number, number]) => {
      pts.push(new THREE.Vector3(side * x, y, z));
      nrm.push(new THREE.Vector3(side * n[0], n[1], n[2]).normalize());
    };
    const lx = Math.abs(lugL.x);
    add(lx, lugL.y, 0, [-1, 0, 0]);
    add(lx - 0.0005, lugL.y - 0.007, 0.0015, [-1, 0.1, 0]);
    add(lx + 0.004, floor + 0.0045, 0.006, [-0.4, 1, 0]);
    add(lx + 0.02, floor, 0.012, [0, 1, 0]);
    add(0.152, floor, 0.03, [0, 1, 0]);
    add(0.16, floor, 0.075, [0, 1, 0]);
    add(0.15, floor, 0.13, [0, 1, 0]);
    add(0.105, floor, 0.175, [0, 1, 0]);
    add(0.045, floor, 0.195, [0, 1, 0]);
    return { pts, nrm };
  };
  const l = half(1), r = half(-1);
  const pts = [...l.pts, new THREE.Vector3(0, floor, 0.198), ...r.pts.reverse()];
  const nrm = [...l.nrm, new THREE.Vector3(0, 1, 0), ...r.nrm.reverse()];
  return [pts, nrm];
}
