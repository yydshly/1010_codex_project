/**
 * T-34-85 cast turret (1944, Factory No. 183 pattern) with the 85 mm ZiS-S-53.
 *
 * Turret-local frame: origin on the hull roof at the turret-ring centre, +Z forward, +X = left.
 * The cast body is lofted through horizontal plan outlines (sloped sides and rear, undercut bustle),
 * with the welded roof plate, horizontal casting seam, split-hatch commander's cupola with five vision
 * slits (left rear), loader's hatch (right), two MK-4 periscopes, twin ventilator domes at the rear
 * of the roof, three bent-rod handrails, four lifting eyes and a pistol port on each side.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { T } from './dims';
import type { Pal } from './palette';
import { roundedRing, surfaceFrame, applyFrame, type P2 } from './util';

const D = Math.PI / 180;
/** roof plate top (turret-local y) */
export const YT = 0.726;

/* ---------------------------------- cast body ----------------------------------------------- */

interface Lvl { y: number; w: number; f: number; wf: number; r: number; wr: number; df: number; dr: number }
// plan outlines from the base (undercut bustle) to the roof
const LV: Lvl[] = [
  { y: 0.012, w: 0.95, f: 0.86, wf: 0.6, r: -0.9, wr: 0.55, df: 0.3, dr: 0.2 },
  { y: 0.06, w: 0.955, f: 0.93, wf: 0.61, r: -1.12, wr: 0.52, df: 0.3, dr: 0.3 },
  { y: 0.14, w: 0.945, f: 0.975, wf: 0.61, r: -1.3, wr: 0.5, df: 0.3, dr: 0.36 },
  { y: 0.24, w: 0.925, f: 0.99, wf: 0.6, r: -1.37, wr: 0.49, df: 0.3, dr: 0.38 },
  { y: 0.36, w: 0.89, f: 0.985, wf: 0.585, r: -1.375, wr: 0.47, df: 0.3, dr: 0.37 },
  { y: 0.48, w: 0.85, f: 0.965, wf: 0.565, r: -1.35, wr: 0.45, df: 0.3, dr: 0.35 },
  { y: 0.6, w: 0.805, f: 0.93, wf: 0.54, r: -1.3, wr: 0.43, df: 0.3, dr: 0.33 },
  { y: 0.69, w: 0.768, f: 0.895, wf: 0.515, r: -1.25, wr: 0.41, df: 0.29, dr: 0.31 },
  { y: 0.72, w: 0.745, f: 0.87, wf: 0.5, r: -1.22, wr: 0.39, df: 0.28, dr: 0.3 },
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
  const c: P2[] = [
    [wf, f], [-wf, f], [-w, f - L.df], [-w, r + L.dr], [-wr, r], [wr, r], [w, r + L.dr], [w, f - L.df],
  ];
  return roundedRing(c, [0.12, 0.12, 0.34, 0.42, 0.3, 0.3, 0.42, 0.34], 7, 3);
}

/**
 * Wall point + outward normal where the plan outline at height y meets the line `fixed` = v
 * (fixed 'z': pick the hit with the largest pick score, e.g. x * side).
 */
export function wallHit(y: number, fixed: 'x' | 'z', v: number, pick: (x: number, z: number) => number): { p: THREE.Vector3; n: THREE.Vector3 } {
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
  const h0 = hit(y), h1 = hit(Math.min(0.72, y + 0.03));
  const tl = Math.hypot(h0.tx, h0.tz);
  const nx = h0.tz / tl, nz = -h0.tx / tl; // CCW ring: outward normal on the right of the tangent
  const inset = (h0.x - h1.x) * nx + (h0.z - h1.z) * nz;
  const n = new THREE.Vector3(nx, inset / (Math.min(0.72, y + 0.03) - y), nz).normalize();
  return { p: new THREE.Vector3(h0.x, y, h0.z), n };
}

function body(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const secs = LV.map((L) => ({ z: L.y, ring: outline(L).map(([x, z]) => [x, -z] as P2) }));
  const g = G.loftZ(secs, true, 50);
  g.rotateX(-Math.PI / 2);
  out.push(part(g, P.cast));
  // welded roof plate, slightly inset, with its weld bead
  const top = LV[LV.length - 1];
  const roofO = outline(top, 0.03);
  out.push(part(G.plate(roofO, 0.02, 'xz', 0.004), P.paint, { p: [0, YT - 0.01, 0] }));
  const bead = outline(top, 0.026).map(([x, z]) => new THREE.Vector3(x, 0.722, z));
  out.push(part(G.tube(bead, 0.0065, 6, bead.length * 3, true), P.cast));
  // horizontal casting seam (parting line) round the walls
  const Ls = lerpLvl(0.3);
  const seam = outline(Ls, -0.004).map(([x, z]) => new THREE.Vector3(x, 0.3, z));
  out.push(part(G.tube(seam, 0.0055, 6, seam.length * 3, true), P.cast));
  return out;
}

/* ------------------------------------- gun -------------------------------------------------- */

function latheZ(profile: G.V2[], seg = 32, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateX(Math.PI / 2);
  return g;
}

function gunAndMantlet(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const tY = T.trunY, tZ = T.trunZ;
  // cast mantlet: annular sector round the trunnion axis, lofted along X with rounded ends
  const Ro = 0.42, Ri = 0.22, a0 = -52 * D, a1 = 50 * D;
  const ring = (k: number): P2[] => {
    const pts: P2[] = [];
    const ro = Ri + (Ro - Ri) * k;
    for (let i = 0; i <= 16; i++) {
      const a = a0 + ((a1 - a0) * i) / 16;
      pts.push([-(tZ + Math.cos(a) * ro), tY + Math.sin(a) * ro]);
    }
    for (let i = 4; i >= 0; i--) {
      const a = a0 + ((a1 - a0) * i) / 4;
      pts.push([-(tZ + Math.cos(a) * Ri), tY + Math.sin(a) * Ri]);
    }
    return pts;
  };
  const xs = [-0.56, -0.552, -0.535, -0.505, -0.46, 0.46, 0.505, 0.535, 0.552, 0.56];
  const ks = [0.45, 0.66, 0.82, 0.93, 1, 1, 0.93, 0.82, 0.66, 0.45];
  const mg = G.loftZ(xs.map((x, i) => ({ z: x, ring: ring(ks[i]) })), true, 50);
  mg.rotateY(Math.PI / 2);
  out.push(part(mg, P.cast));
  // gun sleeve with its root collar
  const sleeve = latheZ([[0.0, 1.0], [0.172, 1.0], [0.178, 1.1], [0.178, 1.19], [0.168, 1.21], [0.142, 1.225], [0.136, 1.52], [0.143, 1.53], [0.143, 1.57], [0.13, 1.585], [0.0, 1.585]], 40, 40);
  out.push(part(sleeve, P.cast, { p: [0, tY, 0] }));
  // 85 mm ZiS-S-53 barrel, 54.6 calibres; hollow muzzle
  const zM = T.muzzleZ;
  const barrel = latheZ(
    [[0.0, 1.56], [0.1, 1.56], [0.1, 1.64], [0.086, 2.6], [0.072, zM - 0.3], [0.07, zM - 0.02], [0.066, zM], [0.0425, zM], [0.0425, zM - 0.45], [0.0, zM - 0.45]],
    36, 30,
  );
  out.push(part(barrel, P.paint, { p: [0, tY, 0] }));
  // coaxial DT (right of the gun) and the TSh-16 sight aperture (left)
  const zs = (y: number) => tZ + Math.sqrt(Ro * Ro - (y - tY) * (y - tY));
  out.push(part(latheZ([[0.0, 0.0], [0.045, 0.0], [0.045, 0.03], [0.035, 0.045], [0.0, 0.045]], 20, 40), P.cast, { p: [-0.21, 0.44, zs(0.44) - 0.02] }));
  out.push(part(latheZ([[0.0, 0.0], [0.013, 0.0], [0.013, 0.08], [0.0, 0.08]], 12, 40), P.gun, { p: [-0.21, 0.44, zs(0.44) + 0.0] }));
  out.push(part(G.cyl(0.006, 0.006, 0.01, 8), P.void, { p: [-0.21, 0.44, zs(0.44) + 0.078], r: [90, 0, 0] }));
  out.push(part(G.rbox(0.07, 0.05, 0.03, 0.008, 1), P.void, { p: [0.23, 0.47, zs(0.47) - 0.01] }));
  out.push(part(G.rbox(0.1, 0.018, 0.05, 0.006, 1), P.cast, { p: [0.23, 0.505, zs(0.505) - 0.005], r: [-10, 0, 0] }));
  return out;
}

/* ---------------------------------- roof fittings ------------------------------------------ */

function mk4(P: Pal): THREE.Object3D {
  // MK-4 periscope in its rotating base, window facing +Z; base on y = 0
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.1, 0.0], [0.1, 0.022], [0.09, 0.032], [0.0, 0.032]], 28, 40), P.paint));
  ps.push(part(G.scatter(G.boltHead(0.014, 0.006), Array.from({ length: 6 }, (_, i) => ({ p: [Math.cos(i * 1.047) * 0.08, 0.03, Math.sin(i * 1.047) * 0.08] as G.V3, spin: i }))), P.paint));
  ps.push(part(G.plate([[-0.08, 0], [0.075, 0], [0.075, 0.1], [0.02, 0.125], [-0.08, 0.125]], 0.1, 'zy', 0.008), P.paint, { p: [0, 0.03, 0] }));
  ps.push(part(G.box(0.078, 0.05, 0.004), P.void, { p: [0, 0.095, 0.0765] }));
  ps.push(part(G.box(0.07, 0.042, 0.004), P.vision, { p: [0, 0.095, 0.0785] }));
  ps.push(part(G.rbox(0.12, 0.012, 0.05, 0.004, 1), P.paint, { p: [0, 0.14, 0.07], r: [-12, 0, 0] }));
  return group(ps);
}

function cupola(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(
    part(
      G.lathe([[0.0, 0.0], [0.345, 0.0], [0.345, 0.028], [0.318, 0.045], [0.31, 0.2], [0.302, 0.214], [0.306, 0.218], [0.306, 0.238], [0.29, 0.248], [0.24, 0.248], [0.24, 0.232], [0.0, 0.232]], 56, 40),
      P.cast,
    ),
  );
  // five vision slits with glass blocks and brows
  for (let k = 0; k < 5; k++) {
    const a = (k * 72) * D;
    const s = Math.sin(a), c = Math.cos(a);
    const at = (r: number, y: number): G.V3 => [s * r, y, c * r];
    const ry = (a * 180) / Math.PI;
    ps.push(part(G.box(0.13, 0.032, 0.02), P.void, { p: at(0.308, 0.125), r: [0, ry, 0] }));
    ps.push(part(G.box(0.11, 0.024, 0.004), P.vision, { p: at(0.3205, 0.125), r: [0, ry, 0] }));
    ps.push(part(G.rbox(0.17, 0.022, 0.035, 0.006, 1), P.cast, { p: at(0.325, 0.152), r: [0, ry, 0] }));
    ps.push(part(G.rbox(0.17, 0.016, 0.03, 0.005, 1), P.cast, { p: at(0.322, 0.098), r: [0, ry, 0] }));
  }
  // split hatch: two domed halves hinged at the sides, with a visible parting gap
  for (const sx of [-1, 1]) {
    const half = G.lathe([[0.0, 0.265], [0.18, 0.262], [0.236, 0.254], [0.246, 0.244], [0.246, 0.232], [0.0, 0.232]], 24, 45, sx > 0 ? 0 : Math.PI, Math.PI);
    ps.push(part(half, P.cast, { p: [sx * 0.008, 0, 0] }));
    // stiffening lip along the parting edge
    ps.push(part(G.rbox(0.018, 0.016, 0.44, 0.005, 1), P.cast, { p: [sx * 0.018, 0.27, 0] }));
    for (const z of [-0.1, 0.1]) {
      ps.push(part(G.cyl(0.022, 0.022, 0.07, 12), P.cast, { p: [sx * 0.262, 0.252, z], r: [90, 0, 0] }));
      ps.push(part(G.rbox(0.05, 0.018, 0.06, 0.005, 1), P.cast, { p: [sx * 0.236, 0.262, z] }));
    }
    ps.push(part(G.tube([[sx * 0.07, 0.262, -0.06], [sx * 0.09, 0.3, -0.05], [sx * 0.09, 0.3, 0.05], [sx * 0.07, 0.262, 0.06]], 0.008, 6), P.paint));
  }
  const p = mk4(P);
  p.position.set(0.13, 0.258, 0.12);
  p.scale.setScalar(0.85);
  ps.push(p);
  return group(ps);
}

function loaderHatch(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.27, 0.0], [0.27, 0.02], [0.255, 0.03], [0.0, 0.03]], 40, 40), P.cast));
  ps.push(part(G.lathe([[0.0, 0.058], [0.18, 0.056], [0.236, 0.048], [0.245, 0.04], [0.245, 0.028], [0.0, 0.028]], 40, 45), P.cast));
  for (const x of [-0.1, 0.1]) ps.push(part(G.cyl(0.024, 0.024, 0.07, 12), P.cast, { p: [x, 0.045, -0.265], r: [0, 0, 90] }));
  ps.push(part(G.rbox(0.3, 0.035, 0.05, 0.01, 1), P.cast, { p: [0, 0.03, -0.25] }));
  ps.push(part(G.tube([[-0.07, 0.055, 0.12], [-0.06, 0.09, 0.12], [0.06, 0.09, 0.12], [0.07, 0.055, 0.12]], 0.009, 6), P.paint));
  ps.push(part(G.cyl(0.03, 0.035, 0.02, 14), P.cast, { p: [0, 0.066, 0.0] }));
  return group(ps);
}

function ventilator(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.13, 0.0], [0.13, 0.015], [0.105, 0.03], [0.1, 0.07], [0.0, 0.07]], 32, 40), P.cast));
  ps.push(part(G.cyl(0.098, 0.098, 0.004, 24), P.void, { p: [0, 0.071, 0] }));
  for (let k = 0; k < 4; k++) {
    const a = k * 90 * D + 45 * D;
    ps.push(part(G.rbox(0.022, 0.04, 0.03, 0.005, 1), P.cast, { p: [Math.sin(a) * 0.095, 0.085, Math.cos(a) * 0.095], r: [0, (a * 180) / Math.PI, 0] }));
  }
  ps.push(part(G.lathe([[0.0, 0.178], [0.05, 0.174], [0.095, 0.162], [0.128, 0.143], [0.15, 0.12], [0.157, 0.104], [0.148, 0.097], [0.0, 0.097]], 40, 50), P.cast));
  return group(ps);
}

/** bent-rod handrail between a and b standing off along n */
function handrail(a: THREE.Vector3, b: THREE.Vector3, n: THREE.Vector3, off = 0.07, r = 0.011): THREE.BufferGeometry {
  const d = b.clone().sub(a);
  const e = d.clone().normalize().multiplyScalar(0.03);
  const pts = [
    a.clone().addScaledVector(n, -0.005),
    a.clone().addScaledVector(n, off * 0.6),
    a.clone().addScaledVector(n, off).add(e),
    a.clone().lerp(b, 0.5).addScaledVector(n, off),
    b.clone().addScaledVector(n, off).sub(e),
    b.clone().addScaledVector(n, off * 0.6),
    b.clone().addScaledVector(n, -0.005),
  ];
  return G.tube(pts, r, 8, 60);
}

function wallFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const rails: THREE.BufferGeometry[] = [];
  const at = (y: number, z: number, sx: number) => wallHit(y, 'z', z, (x) => x * sx);
  for (const sx of [-1, 1]) {
    // handrail along the side
    const a = at(0.53, 0.3, sx), b = at(0.53, -0.88, sx);
    rails.push(handrail(a.p, b.p, a.n.clone().add(b.n).normalize()));
    // lifting eyes near the top edge
    for (const z of [0.5, -0.78]) {
      const h = at(0.63, z, sx);
      const fr = surfaceFrame([h.p.x, h.p.y, h.p.z], [0, 0, 1], [h.n.x, h.n.y, h.n.z]);
      out.push(applyFrame(group([
        part(G.rbox(0.03, 0.03, 0.1, 0.008, 1), P.cast, { p: [0, 0.008, 0] }),
        part(G.torus(0.036, 0.013, 8, 18), P.cast, { p: [0, 0.045, 0], r: [0, 90, 0] }),
      ]), fr));
    }
    // pistol port with reinforcing pad and plug
    const pp = at(0.34, -0.4, sx);
    const pf = surfaceFrame([pp.p.x, pp.p.y, pp.p.z], [0, 0, 1], [pp.n.x, pp.n.y, pp.n.z]);
    out.push(applyFrame(group([
      part(G.lathe([[0.0, -0.012], [0.115, -0.012], [0.112, 0.012], [0.1, 0.022], [0.0, 0.022]], 32, 40), P.cast),
      part(G.lathe([[0.0, 0.0], [0.052, 0.0], [0.052, 0.03], [0.04, 0.045], [0.0, 0.048]], 24, 40), P.cast),
    ]), pf));
  }
  // rear handrail
  const ra = wallHit(0.5, 'x', -0.3, (_x, z) => -z), rb = wallHit(0.5, 'x', 0.3, (_x, z) => -z);
  rails.push(handrail(ra.p, rb.p, ra.n.clone().add(rb.n).normalize()));
  out.push(part(G.mergeGeometries(rails.map((g) => g.toNonIndexed()))!, P.paint));
  return out;
}

export function turret(P: Pal): THREE.Group {
  const out: THREE.Object3D[] = [...body(P), ...gunAndMantlet(P), ...wallFittings(P)];
  const cup = cupola(P);
  cup.position.set(0.36, YT, -0.52);
  const lh = loaderHatch(P);
  lh.position.set(-0.36, YT, -0.28);
  const pg = mk4(P);
  pg.position.set(0.42, YT, 0.3);
  const pl = mk4(P);
  pl.position.set(-0.4, YT, 0.2);
  out.push(cup, lh, pg, pl);
  for (const sx of [-1, 1]) {
    const v = ventilator(P);
    v.position.set(sx * 0.16, YT, -1.0);
    out.push(v);
  }
  return group(out, { name: 'turret', p: [0, 0, 0] });
}
