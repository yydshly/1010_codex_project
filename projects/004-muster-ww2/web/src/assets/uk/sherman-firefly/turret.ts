/**
 * Firefly turret: the early low-bustle cast Sherman turret as converted for the OQF 17-pdr - the
 * Firefly mantlet in front of the M34-type rotor shield, the long 17-pdr barrel with its untapered
 * base section and double-baffle muzzle brake, the armoured radio box welded to the bustle rear (the
 * No. 19 set was moved out of the turret to make room for the recoil), the loader's hatch cut into the
 * left of the roof, the commander's split hatch, periscopes, 2 in bomb thrower, pistol port and
 * lifting eyes.
 *
 * Turret-local frame: origin on the hull roof plane at the turret-ring centre, +Z forward, +X = left.
 * The cast body is lofted through horizontal plan outlines (copied from the M4A3(75)W turret of this
 * project, with the shorter, lower bustle of the early casting).
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Pal } from './palette';
import { TURRET } from './dims';
import { roundedRing, surfaceFrame, applyFrame, latheZ, rb, nut, prism, uHandle, merge, D, type P2, type P3 } from './util';
import { m1919Jacket } from './mg';

const YT = TURRET.roofY;
const GY = TURRET.gunY;
const TZ = TURRET.trunZ;

/* ------------------------------------------------------------------------ cast body */

interface Lvl { y: number; w: number; f: number; wf: number; r: number; wr: number; df: number; dr: number }
const LV: Lvl[] = [
  { y: 0.012, w: 0.92, f: 0.8, wf: 0.42, r: -0.78, wr: 0.52, df: 0.3, dr: 0.34 },
  { y: 0.06, w: 0.948, f: 0.865, wf: 0.45, r: -0.9, wr: 0.56, df: 0.32, dr: 0.35 },
  { y: 0.15, w: 0.962, f: 0.91, wf: 0.47, r: -1.08, wr: 0.62, df: 0.34, dr: 0.34 },
  { y: 0.26, w: 0.964, f: 0.93, wf: 0.47, r: -1.14, wr: 0.64, df: 0.34, dr: 0.33 },
  { y: 0.38, w: 0.958, f: 0.925, wf: 0.465, r: -1.16, wr: 0.64, df: 0.34, dr: 0.32 },
  { y: 0.5, w: 0.945, f: 0.885, wf: 0.45, r: -1.155, wr: 0.635, df: 0.33, dr: 0.31 },
  { y: 0.6, w: 0.925, f: 0.83, wf: 0.43, r: -1.135, wr: 0.615, df: 0.31, dr: 0.3 },
  { y: 0.675, w: 0.895, f: 0.765, wf: 0.4, r: -1.1, wr: 0.59, df: 0.29, dr: 0.29 },
  { y: 0.72, w: 0.855, f: 0.7, wf: 0.37, r: -1.06, wr: 0.56, df: 0.27, dr: 0.28 },
  { y: YT, w: 0.815, f: 0.645, wf: 0.35, r: -1.02, wr: 0.53, df: 0.25, dr: 0.27 },
];

function lerpLvl(y: number): Lvl {
  let i = 0;
  while (i < LV.length - 2 && LV[i + 1].y < y) i++;
  const a = LV[i], b = LV[i + 1];
  const t = Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
  const m = (k: keyof Lvl) => a[k] + (b[k] - a[k]) * t;
  return { y, w: m('w'), f: m('f'), wf: m('wf'), r: m('r'), wr: m('wr'), df: m('df'), dr: m('dr') };
}

function outline(L: Lvl, inset = 0): P2[] {
  const w = L.w - inset, wf = L.wf - inset, wr = L.wr - inset, f = L.f - inset, r = L.r + inset;
  const c: P2[] = [[wf, f], [-wf, f], [-w, f - L.df], [-w, r + L.dr], [-wr, r], [wr, r], [w, r + L.dr], [w, f - L.df]];
  return roundedRing(c, [0.22, 0.22, 0.5, 0.42, 0.3, 0.3, 0.42, 0.5], 7, 3).map((p) => cheek(p, L.y));
}

/** Cast-in thickened right front cheek, blended into the wall. */
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
  const secs = LV.map((L) => ({ z: L.y, ring: outline(L).map(([x, z]) => [x, -z] as P2).reverse() }));
  const g = G.loftZ(secs, true, 40);
  g.rotateX(-Math.PI / 2);
  out.push(part(g, P.cast));
  out.push(part(G.cyl(0.92, 0.92, 0.012, 64, true), P.void, { p: [0, 0.006, 0] }));
  return out;
}

/* ------------------------------------------------------------------------ gun & mount */

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

/** Lathe about +Z over part of the circumference (phi measured so that 0 = straight down). */
function latheZArc(profile: P2[], seg: number, lower: boolean): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, 40, lower ? -Math.PI / 2 : Math.PI / 2, Math.PI);
  g.rotateX(Math.PI / 2);
  return g;
}

/** 17-pdr barrel profile [r, z] (turret-local z), from the mantlet collar to the brake seat. */
function barrelProfile(z0: number, zB: number): P2[] {
  const zT = z0 + 1.25; // end of the untapered base section
  return [
    [0.0, z0],
    [0.084, z0],
    [0.084, zT],
    [0.078, zT + 0.05],
    [0.064, zB - 0.12],
    [0.062, zB - 0.02],
    [0.07, zB - 0.01],
    [0.07, zB],
    [0.0, zB],
  ];
}

function gunMount(P: Pal, shade: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // M34-type rotor shield behind the mantlet, bolt rows along its top and bottom edges
  const RR = 0.272;
  out.push(part(shieldLoft([-0.44, -0.432, -0.414, -0.385, 0.385, 0.414, 0.432, 0.44], [0.5, 0.75, 0.92, 1, 1, 0.92, 0.75, 0.5], 0.12, RR, -70 * D, 80 * D), P.cast));
  const rb0: { p: G.V3; n: G.V3; spin: number }[] = [];
  for (const a of [64 * D, -56 * D]) {
    for (let i = 0; i < 7; i++) {
      const x = -0.36 + (0.72 * i) / 6;
      rb0.push({ p: [x, GY + Math.sin(a) * (RR - 0.002), TZ + Math.cos(a) * (RR - 0.002)], n: [0, Math.sin(a), Math.cos(a)], spin: i * 0.9 });
    }
  }
  out.push(part(G.scatter(nut(0.032, 0.014), rb0), P.cast));
  // Firefly mantlet: narrower and deeper than the M34A1 shield, rounded ends, thick front face
  const xs = [-0.34, -0.334, -0.318, -0.29, 0.29, 0.318, 0.334, 0.34];
  const ks = [0.35, 0.68, 0.9, 1, 1, 0.9, 0.68, 0.35];
  const RO = 0.37;
  out.push(part(shieldLoft(xs, ks, 0.285, RO, -46 * D, 48 * D), P.cast));
  const zF = (y: number, r = RO) => TZ + Math.sqrt(Math.max(0, r * r - (y - GY) * (y - GY)));
  // raised barrel boss with the enlarged opening, and the gun's cradle sleeve
  const zb = zF(GY) - 0.03;
  out.push(part(latheZ([[0.0, 0.0], [0.155, 0.0], [0.155, 0.05], [0.145, 0.09], [0.128, 0.11], [0.118, 0.2], [0.108, 0.215], [0.0, 0.215]], 40, 40), P.cast, { p: [0, GY, zb] }));
  out.push(part(G.scatter(nut(0.022, 0.01), Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    return { p: [Math.cos(a) * 0.135, GY + Math.sin(a) * 0.135, zb + 0.05] as G.V3, n: [0, 0, 1] as G.V3 };
  })), P.cast));
  // 17-pdr barrel (hollow muzzle) and double-baffle muzzle brake
  const z0 = zb + 0.2;
  const zM = TURRET.muzzleZ;
  const LB = 0.36; // brake length
  const zB = zM - LB;
  const prof = barrelProfile(z0, zB);
  if (!shade) {
    out.push(part(latheZ(prof, 40, 28), P.paint, { p: [0, GY, 0] }));
  } else {
    // crew countershading: underside of the forward barrel painted off-white
    const zs = z0 + 0.9;
    const back = prof.filter(([, z]) => z <= zs);
    const fwd = prof.filter(([, z]) => z >= zs);
    const rAt = (z: number) => {
      for (let i = 1; i < prof.length; i++) {
        const a = prof[i - 1], b = prof[i];
        if (z >= a[1] && z <= b[1] && b[1] > a[1]) return a[0] + ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]);
      }
      return 0.08;
    };
    const backP: P2[] = [...back, [rAt(zs), zs], [0, zs]];
    const fwdP: P2[] = [[0, zs], [rAt(zs), zs], ...fwd];
    out.push(part(latheZ(backP, 40, 28), P.paint, { p: [0, GY, 0] }));
    out.push(part(latheZArc(fwdP, 20, false), P.paint, { p: [0, GY, 0] }));
    out.push(part(latheZArc(fwdP, 20, true), P.shade, { p: [0, GY, 0] }));
  }
  const brakeMat = shade ? P.shade : P.paint;
  out.push(part(G.cyl(0.036, 0.036, 0.6, 16), P.void, { p: [0, GY, zM - 0.3], r: [90, 0, 0] }));
  // brake: rear sleeve, first baffle, front baffle, closed top and bottom webs, open sides
  out.push(part(latheZ([[0.04, 0.0], [0.092, 0.0], [0.098, 0.01], [0.098, 0.1], [0.04, 0.1]], 32, 40), brakeMat, { p: [0, GY, zB] }));
  for (const [zz, t] of [[0.19, 0.035], [LB - 0.035, 0.035]] as [number, number][]) {
    out.push(part(latheZ([[0.04, 0.0], [0.098, 0.0], [0.098, t - 0.006], [0.092, t], [0.04, t]], 32, 40), brakeMat, { p: [0, GY, zB + zz] }));
  }
  for (const s of [1, -1]) {
    const web = G.lathe([[0.084, 0.1], [0.098, 0.1], [0.098, LB], [0.084, LB]], 10, 40, s > 0 ? Math.PI * 0.72 : -Math.PI * 0.28, Math.PI * 0.56);
    web.rotateX(Math.PI / 2);
    out.push(part(web, brakeMat, { p: [0, GY, zB] }));
  }
  out.push(part(G.cyl(0.04, 0.04, LB - 0.1, 16, true), P.void, { p: [0, GY, zB + 0.1 + (LB - 0.1) / 2], r: [90, 0, 0] }));
  // coaxial .30 cal (left) in its armoured boss, telescope port (right)
  const cy = GY + 0.0, cx = 0.215;
  out.push(part(latheZ([[0.0, 0.0], [0.055, 0.0], [0.055, 0.03], [0.042, 0.055], [0.0, 0.058]], 22, 40), P.cast, { p: [cx, cy, zF(cy) - 0.02] }));
  const cj = m1919Jacket(P, 0.1);
  cj.position.set(cx, cy, zF(cy) + 0.03);
  out.push(cj);
  const ty = GY + 0.06, tx = -0.2;
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

function splitHatch(P: Pal): THREE.Object3D {
  // commander's split hatch on its rotating ring
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.37, 0.0], [0.37, 0.025], [0.355, 0.04], [0.345, 0.065], [0.29, 0.065], [0.29, 0.05], [0.0, 0.05]], 56, 40), P.cast));
  for (const sx of [-1, 1]) {
    const half = G.lathe([[0.0, 0.1], [0.2, 0.097], [0.27, 0.088], [0.285, 0.078], [0.285, 0.062], [0.0, 0.062]], 24, 45, sx > 0 ? 0 : Math.PI, Math.PI);
    ps.push(part(half, P.cast, { p: [sx * 0.006, 0, 0] }));
    ps.push(part(rb(0.02, 0.018, 0.5, 0.006), P.cast, { p: [sx * 0.018, 0.1, 0] }));
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
  // square hatch cut into the roof for the Firefly loader, hinged at its front edge (opens forward),
  // with the spring/shock-absorber housing beside the hinge
  const ps: THREE.Object3D[] = [];
  const S = 0.44;
  const sq = (a: number, r: number): P2[] => roundedRing([[-a, -a], [a, -a], [a, a], [-a, a]], [r, r, r, r], 5, 1);
  ps.push(part(prism(sq(S / 2 + 0.045, 0.07), 0.026, 'xz', 0.006), P.paint, { p: [0, 0.013, 0] }));
  ps.push(part(prism(sq(S / 2, 0.05), 0.032, 'xz', 0.008), P.paint, { p: [0, 0.04, 0] }));
  ps.push(part(G.box(S - 0.02, 0.004, S - 0.02), P.void, { p: [0, 0.024, 0] }));
  // hinge knuckles on the front edge and the pin
  for (const x of [-0.14, 0.14]) {
    ps.push(part(G.cyl(0.028, 0.028, 0.08, 14), P.cast, { p: [x, 0.05, S / 2 + 0.035], r: [0, 0, 90] }));
    ps.push(part(rb(0.08, 0.018, 0.06, 0.005), P.cast, { p: [x, 0.058, S / 2 - 0.005] }));
  }
  ps.push(part(G.cyl(0.011, 0.011, 0.38, 8), P.toolSteel, { p: [0, 0.05, S / 2 + 0.035], r: [0, 0, 90] }));
  // spring cylinder alongside the hinge
  ps.push(part(G.cyl(0.03, 0.03, 0.2, 14), P.cast, { p: [0.0, 0.055, S / 2 + 0.045], r: [0, 0, 90] }));
  // lock boss and grab handle
  ps.push(part(G.cyl(0.024, 0.028, 0.012, 14), P.cast, { p: [0.1, 0.062, -0.12] }));
  ps.push(part(uHandle(0.12, 0.035, 0.008), P.paint, { p: [-0.05, 0.056, -0.12] }));
  return group(ps);
}

function gunnerPeriscope(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.1, 0.0], [0.1, 0.02], [0.09, 0.03], [0.0, 0.03]], 28, 40), P.cast));
  ps.push(part(rb(0.13, 0.085, 0.09, 0.008), P.gun, { p: [0, 0.07, 0] }));
  ps.push(part(G.box(0.1, 0.045, 0.004), P.vision, { p: [0, 0.075, 0.046] }));
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

function roofFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const place = (o: THREE.Object3D, x: number, z: number, ry = 0) => {
    o.position.set(x, YT - 0.004, z);
    o.rotation.y = ry * D;
    out.push(o);
    return o;
  };
  place(splitHatch(P), -0.37, -0.3);
  place(loaderHatch(P), 0.36, -0.12);
  place(gunnerPeriscope(P), -0.42, 0.42);
  place(vaneSight(P), -0.2, 0.33);
  place(m6Periscope(P), 0.42, 0.36);
  // 2 in bomb thrower aperture
  out.push(part(G.lathe([[0.0, 0.0], [0.055, 0.0], [0.05, 0.012], [0.0, 0.012]], 22, 40), P.cast, { p: [0.12, YT - 0.004, 0.5] }));
  out.push(part(G.cyl(0.028, 0.028, 0.016, 18), P.void, { p: [0.12, YT + 0.002, 0.5] }));
  // lifting eyes
  place(lifting(P), 0.66, 0.3, 90);
  place(lifting(P), -0.66, 0.12, 90);
  place(lifting(P), 0.0, -0.86, 0);
  return out;
}

/** Armoured No. 19 set box welded to the bustle rear, with lid, bolts, aerial base and handles. */
function radioBox(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const W = 0.9, y0 = 0.2, y1 = 0.62, zIn = -0.92, zOut = -1.5;
  const side: P2[] = [[zIn, y0], [zOut + 0.08, y0], [zOut, y0 + 0.08], [zOut, y1], [zIn, y1]];
  out.push(part(prism(side, W, 'zy', 0.012), P.paint));
  // top lid plate (bolted), slightly proud, with hinges at its front edge
  const lidZ0 = -1.16, lidZ1 = zOut + 0.02;
  out.push(part(rb(W - 0.06, 0.02, lidZ0 - lidZ1, 0.006), P.paint, { p: [0, y1 + 0.01, (lidZ0 + lidZ1) / 2] }));
  const bolts: G.V3[] = [];
  for (let i = 0; i < 7; i++) bolts.push([-0.38 + (0.76 * i) / 6, y1 + 0.02, lidZ1 + 0.03]);
  for (const x of [-0.38, 0.38]) for (const z of [-1.24, -1.36]) bolts.push([x, y1 + 0.02, z]);
  out.push(part(G.scatter(nut(0.022, 0.009), bolts.map((p) => ({ p }))), P.paint));
  for (const x of [-0.25, 0.25]) out.push(part(G.cyl(0.02, 0.02, 0.1, 12), P.paint, { p: [x, y1 + 0.02, lidZ0 + 0.01], r: [0, 0, 90] }));
  // aerial base on the left rear of the lid, the short stub of the mast
  const ab = group([
    part(G.cyl(0.05, 0.055, 0.03, 18), P.cast, { p: [0, 0.015, 0] }),
    part(G.cyl(0.032, 0.036, 0.08, 16), P.gun, { p: [0, 0.07, 0] }),
    part(G.cyl(0.012, 0.012, 0.06, 10), P.toolSteel, { p: [0, 0.14, 0] }),
  ], { p: [0.26, y1 + 0.02, -1.4] });
  out.push(ab);
  // grab handles on the rear face, weld beads at the turret wall
  for (const x of [-0.25, 0.25]) out.push(part(uHandle(0.14, 0.045, 0.009), P.paint, { p: [x, (y0 + y1) / 2 + 0.05, zOut], r: [-90, 0, 0] }));
  const w: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const h = wallHit(0.4, 'x', s * (W / 2 + 0.004), (_x, z) => -z);
    w.push(G.weld([[s * (W / 2 + 0.004), y0 + 0.01, h.p.z - 0.01], [s * (W / 2 + 0.004), y1 - 0.01, h.p.z - 0.01]], 0.007));
  }
  const ht = wallHit(y1 - 0.01, 'x', 0, (_x, z) => -z);
  w.push(G.weld([[-W / 2 + 0.01, y1 + 0.003, ht.p.z - 0.005], [W / 2 - 0.01, y1 + 0.003, ht.p.z - 0.005]], 0.007));
  out.push(part(merge(w), P.paint));
  return out;
}

function wallFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // pistol port on the left wall: raised pad, hinged round door, latch
  const pp = wallHit(0.36, 'z', -0.3, (x) => x);
  out.push(onWall([
    part(G.lathe([[0.0, -0.02], [0.135, -0.02], [0.13, 0.012], [0.115, 0.024], [0.0, 0.024]], 36, 40), P.cast),
    part(G.lathe([[0.0, 0.024], [0.092, 0.024], [0.092, 0.04], [0.082, 0.05], [0.0, 0.052]], 30, 40), P.cast),
    part(G.cyl(0.02, 0.02, 0.09, 12), P.cast, { p: [0, 0.035, -0.11], r: [0, 0, 90] }),
    part(rb(0.035, 0.018, 0.05, 0.005), P.cast, { p: [0, 0.058, 0.07] }),
  ], pp));
  return out;
}

/** Complete turret in turret-local coordinates. `shade` = barrel countershading. */
export function turret(P: Pal, shade: boolean): THREE.Group {
  return group([...body(P), ...gunMount(P, shade), ...roofFittings(P), ...radioBox(P), ...wallFittings(P)], { name: 'turret' });
}
