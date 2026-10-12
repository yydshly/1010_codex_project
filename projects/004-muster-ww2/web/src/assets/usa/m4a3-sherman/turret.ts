/**
 * D78461 "high bustle" cast turret of the M4A3(75)W with the 75 mm Gun M3 in the Combination Gun
 * Mount M34A1 (inner gun shield bolted to the turret front, wide outer rotor shield with the gun,
 * the coaxial .30 cal M1919A4 port and the M70F telescope port).
 *
 * Turret-local frame: origin on the hull roof plane at the turret-ring centre, +Z forward, +X = left.
 * The cast body is lofted through horizontal plan outlines (undercut, raised bustle; rounded roof
 * edge), with the cast-in thickened right cheek, pistol port (left), oval loader's hatch (left),
 * commander's all-round vision cupola or the earlier split hatch (right rear), gunner's periscope in
 * its protective housing with the commander's vane sight, loader's periscope, 2 in smoke mortar
 * aperture, antenna bracket, lifting eyes and the .50 cal M2 HB on its roof (or hatch-ring) pintle.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Pal } from './palette';
import { TURRET } from './dims';
import { roundedRing, surfaceFrame, applyFrame, latheZ, rb, nut, prism, uHandle, D, type P2, type P3 } from './util';
import { m2hb, pintlePost, m1919Jacket } from './mg';

const YT = TURRET.roofY;
const GY = TURRET.gunY;
const TZ = TURRET.trunZ;

/* ------------------------------------------------------------------------ cast body */

interface Lvl { y: number; w: number; f: number; wf: number; r: number; wr: number; df: number; dr: number }
const LV: Lvl[] = [
  { y: 0.012, w: 0.92, f: 0.8, wf: 0.42, r: -0.78, wr: 0.52, df: 0.3, dr: 0.34 },
  { y: 0.06, w: 0.948, f: 0.865, wf: 0.45, r: -0.93, wr: 0.58, df: 0.32, dr: 0.35 },
  { y: 0.15, w: 0.962, f: 0.91, wf: 0.47, r: -1.19, wr: 0.66, df: 0.34, dr: 0.34 },
  { y: 0.26, w: 0.964, f: 0.93, wf: 0.47, r: -1.245, wr: 0.68, df: 0.34, dr: 0.33 },
  { y: 0.38, w: 0.958, f: 0.925, wf: 0.465, r: -1.262, wr: 0.68, df: 0.34, dr: 0.32 },
  { y: 0.5, w: 0.945, f: 0.885, wf: 0.45, r: -1.255, wr: 0.675, df: 0.33, dr: 0.31 },
  { y: 0.6, w: 0.925, f: 0.83, wf: 0.43, r: -1.235, wr: 0.655, df: 0.31, dr: 0.3 },
  { y: 0.675, w: 0.895, f: 0.765, wf: 0.4, r: -1.2, wr: 0.625, df: 0.29, dr: 0.29 },
  { y: 0.72, w: 0.855, f: 0.7, wf: 0.37, r: -1.16, wr: 0.59, df: 0.27, dr: 0.28 },
  { y: YT, w: 0.815, f: 0.645, wf: 0.35, r: -1.12, wr: 0.56, df: 0.25, dr: 0.27 },
];

function lerpLvl(y: number): Lvl {
  let i = 0;
  while (i < LV.length - 2 && LV[i + 1].y < y) i++;
  const a = LV[i], b = LV[i + 1];
  const t = Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
  const m = (k: keyof Lvl) => a[k] + (b[k] - a[k]) * t;
  return { y, w: m('w'), f: m('f'), wf: m('wf'), r: m('r'), wr: m('wr'), df: m('df'), dr: m('dr') };
}

/** plan outline (x, z), CCW seen from above with x to the right, fixed point count */
function outline(L: Lvl, inset = 0): P2[] {
  const w = L.w - inset, wf = L.wf - inset, wr = L.wr - inset, f = L.f - inset, r = L.r + inset;
  const c: P2[] = [[wf, f], [-wf, f], [-w, f - L.df], [-w, r + L.dr], [-wr, r], [wr, r], [w, r + L.dr], [w, f - L.df]];
  return roundedRing(c, [0.22, 0.22, 0.5, 0.42, 0.3, 0.3, 0.42, 0.5], 7, 3).map((p) => cheek(p, L.y));
}

/**
 * Cast-in thickened right front cheek (D78461): a smooth radial swelling of the casting in front of
 * the gunner, blended into the wall (no separate part, so no visible seam).
 */
function cheek(p: P2, y: number): P2 {
  const [x, z] = p;
  const dx = x + 0.8, dz = z - 0.58;
  const g = Math.exp(-(dx * dx + dz * dz) / (2 * 0.21 * 0.21)) * Math.exp(-((y - 0.3) * (y - 0.3)) / (2 * 0.16 * 0.16));
  if (g < 1e-3) return p;
  const len = Math.hypot(x, z) || 1;
  const a = 0.034 * g;
  return [x + (x / len) * a, z + (z / len) * a];
}

/** Wall point + outward normal where the outline at height y meets the line fixed = v. */
function wallHit(y: number, fixed: 'x' | 'z', v: number, pick: (x: number, z: number) => number): { p: THREE.Vector3; n: THREE.Vector3 } {
  const hit = (yy: number) => {
    const ring = outline(lerpLvl(yy));
    let best: { x: number; z: number; tx: number; tz: number; s: number } | null = null;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const ia = fixed === 'z' ? 1 : 0;
      const da = a[ia] - v, db = b[ia] - v;
      if (da * db > 0 || a[ia] === b[ia]) continue;
      const t = da / (da - db);
      const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      const s = pick(x, z);
      if (!best || s > best.s) best = { x, z, tx: b[0] - a[0], tz: b[1] - a[1], s };
    }
    return best!;
  };
  const y2 = Math.min(YT - 0.005, y + 0.03);
  const h0 = hit(y), h1 = hit(y2);
  const tl = Math.hypot(h0.tx, h0.tz);
  const nx = h0.tz / tl, nz = -h0.tx / tl;
  const inset = (h0.x - h1.x) * nx + (h0.z - h1.z) * nz;
  const n = new THREE.Vector3(nx, inset / (y2 - y), nz).normalize();
  return { p: new THREE.Vector3(h0.x, y, h0.z), n };
}

function onWall(objs: THREE.Object3D[], h: { p: THREE.Vector3; n: THREE.Vector3 }, u: P3 = [0, 1, 0]): THREE.Object3D {
  return applyFrame(group(objs), surfaceFrame([h.p.x, h.p.y, h.p.z], u, [h.n.x, h.n.y, h.n.z]));
}

function body(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // (x, -z) mirrors the ring: reverse it so it stays CCW (walls and roof cap both face outward)
  const secs = LV.map((L) => ({ z: L.y, ring: outline(L).map(([x, z]) => [x, -z] as P2).reverse() }));
  const g = G.loftZ(secs, true, 40);
  g.rotateX(-Math.PI / 2);
  out.push(part(g, P.cast));
  // race gap under the casting
  out.push(part(G.cyl(0.92, 0.92, 0.012, 64, true), P.void, { p: [0, 0.006, 0] }));
  return out;
}

/* ------------------------------------------------------------------------ gun & mount */

/** arc section (z, y) round the trunnion axis for lofting shields along X */
function arcRing(rIn: number, rOut: number, a0: number, a1: number, k: number): P2[] {
  const pts: P2[] = [];
  const ro = rIn + (rOut - rIn) * k;
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([TZ + Math.cos(a) * ro, GY + Math.sin(a) * ro]);
  }
  for (let i = 4; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / 4;
    pts.push([TZ + Math.cos(a) * rIn, GY + Math.sin(a) * rIn]);
  }
  return pts;
}

function shieldLoft(xs: number[], ks: number[], rIn: number, rOut: number, a0: number, a1: number): THREE.BufferGeometry {
  const g = G.loftZ(xs.map((x, i) => ({ z: x, ring: arcRing(rIn, rOut, a0, a1, ks[i]) })), true, 45);
  g.rotateY(-Math.PI / 2);
  return g;
}

function gunMount(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // rotor shield (behind the gun shield): a curved casting about the trunnion axis whose top and
  // bottom edges run back into the turret front; bolt rows along both edges
  const RR = 0.272;
  out.push(part(shieldLoft([-0.5, -0.492, -0.472, -0.44, 0.44, 0.472, 0.492, 0.5], [0.5, 0.75, 0.92, 1, 1, 0.92, 0.75, 0.5], 0.12, RR, -70 * D, 80 * D), P.cast));
  const rb0: { p: G.V3; n: G.V3; spin: number }[] = [];
  for (const a of [64 * D, -56 * D]) {
    for (let i = 0; i < 7; i++) {
      const x = -0.39 + (0.78 * i) / 6;
      rb0.push({ p: [x, GY + Math.sin(a) * (RR - 0.002), TZ + Math.cos(a) * (RR - 0.002)], n: [0, Math.sin(a), Math.cos(a)], spin: i * 0.9 });
    }
  }
  out.push(part(G.scatter(nut(0.032, 0.014), rb0), P.cast));
  // M34A1 full-width gun shield (moves with the gun): wide, rounded ends
  const xs = [-0.465, -0.458, -0.442, -0.41, 0.41, 0.442, 0.458, 0.465];
  const ks = [0.35, 0.68, 0.9, 1, 1, 0.9, 0.68, 0.35];
  out.push(part(shieldLoft(xs, ks, 0.285, 0.345, -38 * D, 40 * D), P.cast));
  const zF = (y: number, r = 0.345) => TZ + Math.sqrt(Math.max(0, r * r - (y - GY) * (y - GY)));
  // gun boss and sleeve
  out.push(part(latheZ([[0.0, 0.0], [0.125, 0.0], [0.125, 0.03], [0.11, 0.07], [0.092, 0.08], [0.088, 0.15], [0.078, 0.16], [0.0, 0.16]], 36, 40), P.cast, { p: [0, GY, zF(GY) - 0.02] }));
  // 75 mm Gun M3 barrel (hollow muzzle)
  const z0 = zF(GY) + 0.12, zM = TURRET.muzzleZ;
  out.push(
    part(
      latheZ(
        [
          [0.0, z0],
          [0.066, z0],
          [0.064, z0 + 0.2],
          [0.056, zM - 0.36],
          [0.055, zM - 0.25],
          [0.059, zM - 0.235],
          [0.059, zM - 0.012],
          [0.055, zM],
          [0.038, zM],
          [0.038, zM - 0.5],
          [0.0, zM - 0.5],
        ],
        40,
        28,
      ),
      P.paint,
      { p: [0, GY, 0] },
    ),
  );
  // coaxial M1919A4 (tank's left) in its armoured boss, M70F telescope port (right)
  const cy = GY + 0.0, cx = 0.205;
  out.push(part(latheZ([[0.0, 0.0], [0.055, 0.0], [0.055, 0.03], [0.042, 0.055], [0.0, 0.058]], 22, 40), P.cast, { p: [cx, cy, zF(cy) - 0.02] }));
  const cj = m1919Jacket(P, 0.1);
  cj.position.set(cx, cy, zF(cy) + 0.03);
  out.push(cj);
  const ty = GY + 0.05, tx = -0.2;
  out.push(part(rb(0.1, 0.075, 0.05, 0.015), P.cast, { p: [tx, ty, zF(ty) - 0.005] }));
  out.push(part(G.box(0.036, 0.036, 0.01), P.void, { p: [tx, ty, zF(ty) + 0.02] }));
  out.push(part(G.cyl(0.016, 0.016, 0.006, 16), P.vision, { p: [tx, ty, zF(ty) + 0.017], r: [90, 0, 0] }));
  return out;
}

/* ------------------------------------------------------------------------ roof fittings */

function m6Periscope(P: Pal): THREE.Object3D {
  return group([
    part(G.lathe([[0.0, 0.0], [0.085, 0.0], [0.085, 0.02], [0.075, 0.03], [0.0, 0.03]], 24, 40), P.cast),
    part(rb(0.15, 0.06, 0.06, 0.006), P.gun, { p: [0, 0.058, 0.0] }),
    part(G.box(0.125, 0.034, 0.004), P.vision, { p: [0, 0.06, 0.031] }),
    part(rb(0.16, 0.012, 0.074, 0.004), P.gun, { p: [0, 0.092, 0.004] }),
  ]);
}

function visionCupola(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.37, 0.0], [0.37, 0.02], [0.35, 0.03], [0.345, 0.2], [0.33, 0.21], [0.27, 0.21], [0.27, 0.19], [0.0, 0.19]], 56, 40), P.cast));
  ps.push(part(G.scatter(nut(0.022, 0.009), Array.from({ length: 12 }, (_, i) => ({ p: [Math.cos((i / 12) * Math.PI * 2) * 0.357, 0.022, Math.sin((i / 12) * Math.PI * 2) * 0.357] as G.V3, spin: i }))), P.cast));
  // six vision blocks round the wall, each under a small cast brow
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    const ry = (a * 180) / Math.PI;
    const at = (r: number, y: number): G.V3 => [Math.sin(a) * r, y, Math.cos(a) * r];
    ps.push(part(G.box(0.15, 0.075, 0.03), P.void, { p: at(0.338, 0.105), r: [0, ry, 0] }));
    ps.push(part(G.box(0.14, 0.066, 0.004), P.vision, { p: at(0.35, 0.105), r: [0, ry, 0] }));
    ps.push(part(rb(0.18, 0.018, 0.04, 0.006), P.cast, { p: at(0.35, 0.152), r: [0, ry, 0] }));
    for (const s of [-1, 1]) ps.push(part(rb(0.018, 0.09, 0.03, 0.005), P.cast, { p: [Math.sin(a) * 0.35 + Math.cos(a) * s * 0.087, 0.105, Math.cos(a) * 0.35 - Math.sin(a) * s * 0.087], r: [0, ry, 0] }));
  }
  // single round hatch, hinged at the rear, with its M6 periscope and grab handle
  ps.push(part(G.lathe([[0.0, 0.25], [0.18, 0.245], [0.25, 0.232], [0.262, 0.222], [0.262, 0.205], [0.0, 0.205]], 48, 45), P.cast));
  ps.push(part(rb(0.2, 0.05, 0.07, 0.012), P.cast, { p: [0, 0.232, -0.285] }));
  for (const x of [-0.07, 0.07]) ps.push(part(G.cyl(0.028, 0.028, 0.06, 14), P.cast, { p: [x, 0.236, -0.3], r: [0, 0, 90] }));
  const pe = m6Periscope(P);
  pe.position.set(0.1, 0.244, 0.08);
  pe.scale.setScalar(0.85);
  ps.push(pe);
  ps.push(part(uHandle(0.12, 0.035, 0.008), P.paint, { p: [-0.1, 0.24, 0.05], r: [0, 90, 0] }));
  return group(ps);
}

function splitHatch(P: Pal): THREE.Object3D {
  // early commander's split hatch (D69993 with equilibrator) on its rotating ring
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.37, 0.0], [0.37, 0.025], [0.355, 0.04], [0.345, 0.065], [0.29, 0.065], [0.29, 0.05], [0.0, 0.05]], 56, 40), P.cast));
  for (const sx of [-1, 1]) {
    const half = G.lathe([[0.0, 0.1], [0.2, 0.097], [0.27, 0.088], [0.285, 0.078], [0.285, 0.062], [0.0, 0.062]], 24, 45, sx > 0 ? 0 : Math.PI, Math.PI);
    ps.push(part(half, P.cast, { p: [sx * 0.006, 0, 0] }));
    ps.push(part(rb(0.02, 0.018, 0.5, 0.006), P.cast, { p: [sx * 0.018, 0.1, 0] }));
    // hinge with integral spring (equilibrator) housing on the outer edge
    ps.push(part(G.cyl(0.03, 0.03, 0.26, 16), P.cast, { p: [sx * 0.31, 0.085, 0], r: [90, 0, 0] }));
    ps.push(part(rb(0.06, 0.02, 0.24, 0.006), P.cast, { p: [sx * 0.275, 0.09, 0] }));
    ps.push(part(uHandle(0.1, 0.03, 0.007), P.paint, { p: [sx * 0.12, 0.098, 0.1], r: [0, 90, 0] }));
  }
  const pe = m6Periscope(P);
  pe.position.set(0.14, 0.098, 0.12);
  pe.scale.setScalar(0.8);
  ps.push(pe);
  return group(ps);
}

function loaderHatch(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const oval = (a: number, b: number, n = 36): P2[] => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * a, Math.sin((i / n) * Math.PI * 2) * b] as P2);
  ps.push(part(prism(oval(0.235, 0.305), 0.03, 'xz', 0.008), P.cast, { p: [0, 0.015, 0] }));
  ps.push(part(prism(oval(0.2, 0.27), 0.035, 'xz', 0.01), P.cast, { p: [0, 0.045, 0] }));
  ps.push(part(G.lathe([[0.0, 0.0], [0.12, 0.0], [0.06, 0.012], [0.0, 0.014]], 24, 40), P.cast, { p: [0, 0.062, 0], s: [1, 1, 1.35] }));
  // hinges on the outboard (left) side and the handle
  for (const z of [-0.14, 0.14]) ps.push(part(G.cyl(0.026, 0.026, 0.07, 14), P.cast, { p: [0.225, 0.045, z], r: [90, 0, 0] }));
  ps.push(part(rb(0.06, 0.02, 0.36, 0.006), P.cast, { p: [0.19, 0.056, 0] }));
  ps.push(part(uHandle(0.12, 0.035, 0.008), P.paint, { p: [-0.1, 0.06, 0], r: [0, 90, 0] }));
  return group(ps);
}

function gunnerPeriscope(P: Pal): THREE.Object3D {
  // M4A1 periscope in its protective housing; window faces +Z
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.1, 0.0], [0.1, 0.02], [0.09, 0.03], [0.0, 0.03]], 28, 40), P.cast));
  ps.push(part(rb(0.13, 0.085, 0.09, 0.008), P.gun, { p: [0, 0.07, 0] }));
  ps.push(part(G.box(0.1, 0.045, 0.004), P.vision, { p: [0, 0.075, 0.046] }));
  // guard: two side plates and a roof plate
  for (const sx of [-1, 1]) ps.push(part(prism([[-0.12, 0], [0.13, 0], [0.12, 0.14], [-0.1, 0.15]], 0.015, 'zy', 0.004), P.cast, { p: [sx * 0.1, 0.0, 0] }));
  ps.push(part(rb(0.22, 0.016, 0.24, 0.005), P.cast, { p: [0, 0.153, 0.005], r: [-4, 0, 0] }));
  return group(ps);
}

function vaneSight(P: Pal): THREE.Object3D {
  return group([
    part(rb(0.06, 0.012, 0.05, 0.004), P.cast, { p: [0, 0.006, 0] }),
    part(G.cyl(0.008, 0.008, 0.07, 8), P.gun, { p: [0, 0.045, 0] }),
    part(prism([[-0.03, 0], [0.03, 0], [0.012, 0.06], [-0.012, 0.06]], 0.003, 'xy', 0.001), P.gun, { p: [0, 0.075, 0] }),
  ]);
}

function lifting(P: Pal): THREE.Object3D {
  return group([
    part(rb(0.07, 0.025, 0.1, 0.008), P.cast, { p: [0, 0.012, 0] }),
    part(G.torus(0.035, 0.012, 8, 18), P.cast, { p: [0, 0.05, 0], r: [0, 90, 0] }),
  ]);
}

function roofFittings(P: Pal, cupola: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const place = (o: THREE.Object3D, x: number, z: number, ry = 0) => {
    o.position.set(x, YT - 0.004, z);
    o.rotation.y = ry * D;
    out.push(o);
    return o;
  };
  place(cupola ? visionCupola(P) : splitHatch(P), -0.37, -0.33);
  place(loaderHatch(P), 0.4, -0.1);
  place(gunnerPeriscope(P), -0.42, 0.42);
  place(vaneSight(P), -0.2, 0.33);
  place(m6Periscope(P), 0.42, 0.4);
  // 2 in smoke mortar aperture (first, flush type) and its surround
  out.push(part(G.lathe([[0.0, 0.0], [0.055, 0.0], [0.05, 0.012], [0.0, 0.012]], 22, 40), P.cast, { p: [0.17, YT - 0.004, 0.52] }));
  out.push(part(G.cyl(0.028, 0.028, 0.016, 18), P.void, { p: [0.17, YT + 0.002, 0.52] }));
  // antenna bracket (built up from three plates) with the mast base, on the bustle
  const ab = group([
    part(rb(0.16, 0.012, 0.13, 0.003), P.cast, { p: [0, 0.006, 0] }),
    part(rb(0.012, 0.09, 0.13, 0.003), P.cast, { p: [0.074, 0.05, 0] }),
    part(rb(0.012, 0.09, 0.13, 0.003), P.cast, { p: [-0.074, 0.05, 0] }),
    part(G.cyl(0.05, 0.05, 0.02, 18), P.cast, { p: [0, 0.1, 0] }),
    part(G.cyl(0.03, 0.036, 0.07, 16), P.gun, { p: [0, 0.145, 0] }),
    part(G.cyl(0.012, 0.012, 0.05, 10), P.toolSteel, { p: [0, 0.2, 0] }),
  ]);
  place(ab, 0.52, -0.92);
  // lifting eyes: two on the roof edge ahead of the hatches, one on the bustle
  place(lifting(P), 0.62, 0.36, 90);
  place(lifting(P), -0.64, 0.12, 90);
  place(lifting(P), 0.0, -1.0, 0);
  // .50 cal M2 HB: roof pintle (vision cupola tanks) or hatch-ring pintle (split hatch tanks)
  const pin = cupola ? { x: 0.12, z: -0.74, h: 0.3 } : { x: -0.37, z: -0.64, h: 0.34 };
  const post = pintlePost(P, pin.h);
  place(post, pin.x, pin.z);
  const mg = m2hb(P);
  mg.position.set(pin.x, YT + pin.h + 0.02, pin.z);
  mg.rotation.set(-6 * D, cupola ? 0 : 8 * D, 0);
  out.push(mg);
  // L-shaped MG barrel brackets on the bustle rear (Sept. 1944)
  if (cupola) {
    for (const sx of [-1, 1]) {
      const h = wallHit(0.45, 'x', sx * 0.3, (_x, z) => -z);
      // local X = across, Y = out of the wall, Z = up
      out.push(onWall([
        part(rb(0.06, 0.012, 0.1, 0.003), P.cast, { p: [0, 0.006, 0] }),
        part(rb(0.06, 0.07, 0.012, 0.003), P.cast, { p: [0, 0.04, -0.044] }),
      ], h, [1, 0, 0]));
    }
  }
  return out;
}

function wallFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // pistol port on the left wall: raised pad, hinged round door, latch
  const pp = wallHit(0.36, 'z', -0.32, (x) => x);
  out.push(onWall([
    part(G.lathe([[0.0, -0.02], [0.135, -0.02], [0.13, 0.012], [0.115, 0.024], [0.0, 0.024]], 36, 40), P.cast),
    part(G.lathe([[0.0, 0.024], [0.092, 0.024], [0.092, 0.04], [0.082, 0.05], [0.0, 0.052]], 30, 40), P.cast),
    part(G.cyl(0.02, 0.02, 0.09, 12), P.cast, { p: [0, 0.035, -0.11], r: [0, 0, 90] }),
    part(rb(0.035, 0.018, 0.05, 0.005), P.cast, { p: [0, 0.058, 0.07] }),
  ], pp));
  return out;
}

/** Complete turret in turret-local coordinates. */
export function turret(P: Pal, cupola: boolean): THREE.Group {
  return group([...body(P), ...gunMount(P), ...roofFittings(P, cupola), ...wallFittings(P)], { name: 'turret' });
}

