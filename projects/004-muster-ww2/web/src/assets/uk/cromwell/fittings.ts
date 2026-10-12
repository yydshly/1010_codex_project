/**
 * External fittings of the Cromwell hull: full-length track guards with their support gussets, the
 * hinged front and rear mud flaps, the side plates hung from the guard edges over the top run of the
 * track, one stowage bin on each rear track guard, and pioneer tools in clamps on the front guards
 * (shovel and pick on the left, crowbar and sledgehammer on the right).
 *
 * Hull frame: +Z forward, +X = the tank's left, y = 0 ground. Built for the left side and mirrored
 * where the layout is symmetric.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { H, R } from './dims';
import type { Pal } from './palette';
import { rb, row, boss, merge } from './util';
import { linkGeometry } from './track';

const { xS, yG, guardX } = H;
const gt = 0.006; // guard sheet thickness
const zGf = 3.05, zGr = -3.07; // flat guard ends (flaps beyond)
const skirtY0 = 0.765; // bottom edge of the side plates

/* ------------------------------------------------------------------ guards (left side) */

function guardLeft(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const w = guardX - xS;
  // flat guard
  out.push(part(G.box(w, gt, zGf - zGr), P.sheet, { p: [xS + w / 2, yG - gt / 2, (zGf + zGr) / 2] }));
  // angle strip where the guard meets the hull side, and the rolled outer edge
  out.push(part(rb(0.012, 0.04, zGf - zGr - 0.02, 0.003), P.sheet, { p: [xS + 0.006, yG + 0.018, (zGf + zGr) / 2] }));
  out.push(part(G.cyl(0.009, 0.009, zGf - zGr, 8), P.sheet, { p: [guardX - 0.009, yG - 0.004, (zGf + zGr) / 2], r: [90, 0, 0] }));
  // support gussets under the guard, between the wheel stations
  const gus: THREE.BufferGeometry[] = [];
  for (const z of [2.35, 1.3, 0.4, -0.5, -1.4, -2.35]) {
    const g = G.plate([[xS, yG - gt], [guardX - 0.03, yG - gt], [xS, yG - gt - 0.12]], 0.008, 'xy', 0.002);
    g.translate(0, 0, z);
    gus.push(g);
  }
  out.push(part(merge(gus), P.sheet));
  // front mud flap on its hinge, rear flap
  const fl = (z0: number, z1: number, y1: number) => {
    const l = Math.hypot(z1 - z0, y1 - yG);
    const a = (Math.atan2(yG - y1, Math.abs(z1 - z0)) * 180) / Math.PI;
    const s = z1 > z0 ? 1 : -1;
    out.push(part(G.box(w - 0.004, gt, l), P.sheet, { p: [xS + w / 2, (yG + y1) / 2 - gt / 2, (z0 + z1) / 2], r: [s * a, 0, 0] }));
    out.push(part(G.cyl(0.011, 0.011, w - 0.03, 10), P.sheet, { p: [xS + w / 2, yG - 0.004, z0], r: [0, 0, 90] }));
    for (const x of [xS + 0.1, guardX - 0.1]) out.push(part(rb(0.05, 0.012, 0.07, 0.003), P.sheet, { p: [x, yG + 0.002, z0 - s * 0.03] }));
  };
  fl(zGf, H.zGF, 0.905);
  fl(zGr, H.zGR, 0.915);
  return out;
}

/* ------------------------------------------------------------------ side plates (left side) */

function sidePlatesLeft(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const x = guardX - 0.003;
  const panels: [number, number][] = [
    [2.62, 0.9],
    [0.88, -0.84],
    [-0.86, -2.66],
  ];
  const bolts: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (let i = 0; i < panels.length; i++) {
    const [a, b] = panels[i];
    let outline: G.V2[] = [[b, skirtY0], [a, skirtY0], [a, yG - gt], [b, yG - gt]];
    // the front panel's leading corner is cut away over the idler, the rear panel's trailing corner likewise
    if (i === 0) outline = [[b, skirtY0], [a - 0.16, skirtY0], [a, skirtY0 + 0.1], [a, yG - gt], [b, yG - gt]];
    if (i === panels.length - 1) outline = [[b + 0.16, skirtY0], [a, skirtY0], [a, yG - gt], [b, yG - gt], [b, skirtY0 + 0.1]];
    out.push(part(G.plate(outline, 0.006, 'zy', 0.0015, 0.008), P.sheet, { p: [x, 0, 0] }));
    // inward-folded stiffening lip along the bottom edge
    const l0 = i === 0 ? a - 0.16 : a, l1 = i === panels.length - 1 ? b + 0.16 : b;
    out.push(part(rb(0.03, 0.006, l0 - l1, 0.002), P.sheet, { p: [x - 0.015, skirtY0 + 0.003, (l0 + l1) / 2] }));
    // bolts along the top edge (into the guard's turned-down edge) and at the panel ends
    bolts.push(...row([x + 0.003, yG - 0.035, a - 0.05], [x + 0.003, yG - 0.035, b + 0.05], [1, 0, 0], Math.round((a - b) / 0.2) + 1));
    for (const z of [a - 0.03, b + 0.03]) bolts.push({ p: new THREE.Vector3(x + 0.003, (skirtY0 + yG) / 2, z), n: new THREE.Vector3(1, 0, 0), spin: z });
  }
  out.push(part(G.scatter(boss(0.011, 0.007, 8), bolts), P.sheet));
  // backing strip along the guard edge the plates hang from
  out.push(part(rb(0.012, 0.06, 5.3, 0.003), P.sheet, { p: [x - 0.009, yG - 0.036, -0.02] }));
  return out;
}

/* ------------------------------------------------------------------ bins */

/** Stowage bin on the rear left guard: base on y = yG, against the hull side. */
function hullBin(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const w = 0.38, hgt = 0.42, l = 1.46;
  const x0 = xS + 0.006, xc = x0 + w / 2;
  const zc = -1.78, y0 = yG;
  ps.push(part(G.rbox(w, hgt, l, 0.012, 2), P.sheet, { p: [xc, y0 + hgt / 2, zc] }));
  // lid hinged along the hull side, overlapping the top
  ps.push(part(G.rbox(w + 0.018, 0.026, l + 0.02, 0.008, 2), P.sheet, { p: [xc + 0.006, y0 + hgt + 0.006, zc] }));
  for (const z of [zc - l * 0.3, zc + l * 0.3]) ps.push(part(G.cyl(0.011, 0.011, 0.2, 10), P.sheet, { p: [x0 + 0.012, y0 + hgt + 0.012, z], r: [90, 0, 0] }));
  // pressed swages on the outer face and ends
  const sw: THREE.BufferGeometry[] = [];
  for (const y of [0.12, 0.28]) {
    const g = G.rbox(0.012, 0.03, l - 0.12, 0.006, 1);
    g.translate(x0 + w + 0.001, y0 + y, zc);
    sw.push(g);
  }
  for (const sz of [-1, 1]) {
    const g = G.rbox(w - 0.1, 0.03, 0.012, 0.006, 1);
    g.translate(xc, y0 + 0.2, zc + sz * (l / 2 + 0.001));
    sw.push(g);
  }
  ps.push(part(merge(sw), P.sheet));
  // hasps and staples on the outer face
  for (const z of [zc - l * 0.32, zc + l * 0.32]) {
    ps.push(part(rb(0.012, 0.08, 0.036, 0.003), P.sheet, { p: [x0 + w + 0.01, y0 + hgt - 0.03, z] }));
    ps.push(part(G.torus(0.013, 0.0045, 6, 12), P.gun, { p: [x0 + w + 0.018, y0 + hgt - 0.075, z], r: [0, 90, 0] }));
  }
  return group(ps);
}

/* ------------------------------------------------------------------ tools */

/** Clamp: two posts on the guard and a strap over a handle of radius r lying along Z at height yc. */
function clamp(P: Pal, x: number, z: number, r: number, yc: number): THREE.Object3D[] {
  const y0 = yG;
  return [
    part(rb(0.02, yc - y0 + 0.004, 0.026, 0.003), P.sheet, { p: [x + r + 0.013, (y0 + yc) / 2, z] }),
    part(rb(0.02, yc - y0 + 0.004, 0.026, 0.003), P.sheet, { p: [x - r - 0.013, (y0 + yc) / 2, z] }),
    part(G.torus(r + 0.005, 0.0045, 6, 14, Math.PI), P.gun, { p: [x, yc, z] }),
    part(rb(0.018, 0.012, 0.03, 0.003), P.gun, { p: [x + r + 0.018, yc + 0.004, z] }),
  ];
}

/** GS shovel lying on the guard, blade forward, D-handle rearward; origin on the guard at the blade. */
function shovel(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = yG + 0.022;
  const blade: G.V2[] = [[-0.12, 0], [0.12, 0], [0.12, 0.2], [0.08, 0.27], [0, 0.3], [-0.08, 0.27], [-0.12, 0.2]];
  out.push(part(G.plate(blade, 0.004, 'xz', 0.0012, 0.02), P.toolSteel, { p: [0, yG + 0.004, 0] }));
  out.push(part(rb(0.05, 0.012, 0.16, 0.004), P.toolSteel, { p: [0, yG + 0.01, 0.06] }));
  out.push(part(G.cyl(0.02, 0.017, 0.12, 14), P.toolSteel, { p: [0, y, -0.06], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.017, 0.017, 0.62, 12), P.wood, { p: [0, y, -0.43], r: [90, 0, 0] }));
  out.push(part(G.tube([[0, y, -0.73], [0.05, y, -0.77], [0.05, y, -0.86], [0, y, -0.89], [-0.05, y, -0.86], [-0.05, y, -0.77], [0, y, -0.73]], 0.011, 8, 24), P.wood));
  out.push(...clamp(P, 0, -0.22, 0.017, y), ...clamp(P, 0, -0.62, 0.017, y));
  return out;
}

/** Pick helve and pick head, stowed separately along the guard (head ahead of the helve). */
function pick(P: Pal): THREE.Object3D[] {
  const y = yG + 0.024;
  const out: THREE.Object3D[] = [
    part(G.cyl(0.02, 0.016, 0.9, 12), P.wood, { p: [0, y, -0.45], r: [90, 0, 0] }),
    part(G.cyl(0.024, 0.024, 0.05, 12), P.wood, { p: [0, y, 0.0], r: [90, 0, 0] }),
  ];
  // pick head lying flat, point forward, chisel end rearward, eye in the middle
  const hy = yG + 0.018;
  const hz = 0.42;
  out.push(part(G.tube([[0, hy + 0.004, hz + 0.3], [0.006, hy + 0.002, hz + 0.15], [0.01, hy, hz], [0.006, hy + 0.002, hz - 0.15], [0, hy + 0.004, hz - 0.29]], 0.013, 8, 30), P.toolSteel));
  out.push(part(rb(0.07, 0.046, 0.07, 0.01), P.toolSteel, { p: [0.01, hy + 0.006, hz] }));
  out.push(part(rb(0.012, 0.01, 0.04, 0.003), P.toolSteel, { p: [0, hy + 0.002, hz - 0.305] }));
  out.push(...clamp(P, 0.004, hz + 0.18, 0.014, hy), ...clamp(P, 0.004, hz - 0.18, 0.014, hy));
  out.push(...clamp(P, 0, -0.3, 0.02, y), ...clamp(P, 0, -0.72, 0.017, y));
  return out;
}

function crowbar(P: Pal): THREE.Object3D[] {
  const y = yG + 0.02;
  return [
    part(G.tube([[0, y, 0.7], [0, y, -0.6], [0, y + 0.012, -0.66], [0, y + 0.04, -0.69]], 0.014, 8, 20), P.toolSteel),
    part(rb(0.028, 0.01, 0.08, 0.003), P.toolSteel, { p: [0, y - 0.004, 0.73] }),
    ...clamp(P, 0, 0.42, 0.014, y),
    ...clamp(P, 0, -0.38, 0.014, y),
  ];
}

function sledge(P: Pal): THREE.Object3D[] {
  const y = yG + 0.026;
  return [
    part(G.cyl(0.018, 0.015, 0.8, 12), P.wood, { p: [0, y, -0.4], r: [90, 0, 0] }),
    part(rb(0.2, 0.06, 0.07, 0.01), P.toolSteel, { p: [0, y + 0.004, 0.03] }),
    ...clamp(P, 0, -0.3, 0.018, y),
    ...clamp(P, 0, -0.66, 0.016, y),
  ];
}

function tools(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // left front guard: shovel (blade forward) and pick
  out.push(group(shovel(P), { p: [1.3, 0, 2.55] }));
  out.push(group(pick(P), { p: [1.13, 0, 1.92] }));
  // right front guard: crowbar and sledgehammer
  out.push(group(crowbar(P), { p: [-1.33, 0, 1.8] }));
  out.push(group(sledge(P), { p: [-1.14, 0, 2.62] }));
  return out;
}

/* ------------------------------------------------------------------ spare links, tow cable */

/** Six spare track links on the nose plate (two rows of three) under a retaining bar. */
function spareLinks(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const { yB, yL, zBF, zN } = H;
  const dy = yL - 0.03 - yB, dz = zN - zBF;
  const L = Math.hypot(dy, dz);
  const n = new THREE.Vector3(0, -dz, dy).normalize(); // outward (forward / down)
  const up = new THREE.Vector3(0, dy, dz).normalize(); // up the plate
  const at = (x: number, s: number, off: number) =>
    new THREE.Vector3(x, yB + (dy * s) / L, zBF + (dz * s) / L).addScaledVector(n, off);
  const lg = linkGeometry();
  const X = new THREE.Vector3(1, 0, 0);
  const Zd = up.clone().negate(); // link Z (with Y = n, X x Y = Z points down the plate)
  const off = R.plateT / 2 + R.cleat + 0.002;
  for (const x of [-0.37, 0, 0.37]) {
    for (const s of [0.36, 0.36 + R.pitch]) {
      const m = part(lg, P.track);
      new THREE.Matrix4().makeBasis(X, n, Zd).setPosition(at(x, s, off)).decompose(m.position, m.quaternion, m.scale);
      out.push(m);
    }
  }
  // retaining bar across the links with its two end brackets
  const bar = at(0, 0.36 + R.pitch / 2, off + R.plateT / 2 + R.horn + 0.018);
  out.push(part(G.rod(bar.clone().setX(-0.6), bar.clone().setX(0.6), 0.014, 10), P.sheet));
  for (const sx of [-1, 1]) {
    const a = at(sx * 0.6, 0.36 + R.pitch / 2, 0), b = bar.clone().setX(sx * 0.6);
    out.push(part(G.rod(a, b, 0.018, 10), P.sheet));
    out.push(part(G.cyl(0.032, 0.032, 0.012, 14), P.sheet, { p: [a.x, a.y, a.z], r: [(Math.atan2(n.z, n.y) * 180) / Math.PI, 0, 0] }));
  }
  return out;
}

/** Tow cable stowed along the upper left hull side in four clips, with its eyes at the ends. */
function towCable(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const x = H.xS + 0.018, y = 1.33, z0 = 2.62, z1 = -0.62;
  out.push(part(G.tube([[x, y, z0], [x + 0.002, y - 0.006, (z0 * 2 + z1) / 3], [x + 0.002, y - 0.006, (z0 + z1 * 2) / 3], [x, y, z1]], 0.015, 8, 60), P.cable));
  for (const [z, s] of [[z0, 1], [z1, -1]] as [number, number][]) {
    out.push(part(G.cyl(0.02, 0.02, 0.07, 10), P.gun, { p: [x, y, z + s * 0.03], r: [90, 0, 0] }));
    out.push(part(G.torus(0.045, 0.012, 8, 18), P.cable, { p: [x, y, z + s * 0.11], r: [0, 90, 0] }));
  }
  for (const z of [2.25, 1.25, 0.25, -0.35]) {
    out.push(part(rb(0.012, 0.05, 0.04, 0.003), P.sheet, { p: [H.xS + 0.006, y, z] }));
    out.push(part(G.torus(0.02, 0.005, 6, 14, Math.PI), P.sheet, { p: [x, y, z], r: [0, 90, -90] }));
  }
  return out;
}

export function fittings(P: Pal): THREE.Group {
  const left = group([...guardLeft(P), ...sidePlatesLeft(P), hullBin(P)]);
  return group([mirrorX(left), ...tools(P), ...spareLinks(P), ...towCable(P)], { name: 'fittings' });
}
