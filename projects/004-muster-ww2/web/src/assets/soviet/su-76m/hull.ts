/**
 * SU-76M hull: welded rolled plates with thickness - the sharp nose (lower plate 30 deg, long upper
 * plate 60 deg from the vertical) with the driver's hatch in its centre and the bolted transmission
 * access plate, vertical sides, the low roof over the driver's and engine compartments (engine on the
 * right: access hatch, radiator intake grille and air outlet louvre; fuel filler caps on the left),
 * track guards with front mudguards, the rear plates and belly. Fittings: headlamp, tow hooks,
 * twin exhaust mufflers on the right guard, stowage boxes and pioneer tools.
 *
 * Hull frame: +Z forward, +X = the vehicle's left, y = 0 ground (see dims.ts).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { H, C, frontZ } from './dims';
import type { Pal } from './palette';
import { slab, surfaceFrame, applyFrame, merge, xf, weldBead, D2R, type P3 } from './util';

const { zN, yN, yB, yR, zRear, yRm, xL, yF, xFe, zFeF, zFeR } = H;
const zBF = H.zBF, zG = H.zG, zRB = H.zRB;

const norm = (y: number, z: number): P3 => {
  const l = Math.hypot(y, z);
  return [0, y / l, z / l];
};
/** plate frames: point at (x, s along the plate from its first point, offset along the normal) */
function plateFrame(z0: number, y0: number, z1: number, y1: number, n: P3) {
  const L = Math.hypot(z1 - z0, y1 - y0);
  const uz = (z1 - z0) / L, uy = (y1 - y0) / L;
  return { n, L, at: (x: number, s: number, off = 0): P3 => [x, y0 + s * uy + off * n[1], z0 + s * uz + off * n[2]] };
}
/** upper front plate, s measured from the nose apex up to the roof */
export const glacis = plateFrame(zN, yN, zG, yR, norm(zN - zG, yR - yN));
/** lower nose plate, s measured from the apex down to the belly */
const lowNose = plateFrame(zN, yN, zBF, yB, [0, -0.5, 0.866]);
/** lower rear plate, s measured from its top down to the belly */
const lowRear = plateFrame(zRear, yRm, zRB, yB, [0, -0.5, -0.866]);

/** Object modelled lying on y = 0 (local +Y = surface normal, local +X = u) placed on a surface. */
export function onPlate(obj: THREE.Object3D, o: P3, u: P3, n: P3): THREE.Object3D {
  return applyFrame(group([obj]), surfaceFrame(o, u, n));
}

/* ------------------------------------------------------------------------------------------ */

function armour(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const zCF = frontZ(yR), zCG = frontZ(yF);
  // side plates: full height in front of the casemate, guard height under it
  const prof: [number, number][] = [[zBF, yB], [zN, yN], [zG, yR], [zCF, yR], [zCG, yF], [zRear, yF], [zRear, yRm], [zRB, yB]];
  for (const sx of [-1, 1]) {
    out.push(part(slab(prof.map(([z, y]) => [sx * xL, y, z] as P3), 0.015, [sx, 0, 0], 0.004), P.paint));
  }
  // nose plates, roof, rear plates, belly
  out.push(part(slab([[-xL, yB, zBF], [xL, yB, zBF], [xL, yN, zN], [-xL, yN, zN]], 0.035, lowNose.n, 0.005), P.paint));
  out.push(part(slab([[-xL, yN, zN], [xL, yN, zN], [xL, yR, zG], [-xL, yR, zG]], 0.025, glacis.n, 0.005), P.paint));
  out.push(part(slab([[-xL, yR, zG], [xL, yR, zG], [xL, yR, zCF], [-xL, yR, zCF]], 0.01, [0, 1, 0], 0.003), P.paint));
  out.push(part(slab([[-xL, yRm, zRear], [xL, yRm, zRear], [xL, yF, zRear], [-xL, yF, zRear]], 0.015, [0, 0, -1], 0.004), P.paint));
  out.push(part(slab([[-xL, yB, zRB], [xL, yB, zRB], [xL, yRm, zRear], [-xL, yRm, zRear]], 0.015, lowRear.n, 0.004), P.paint));
  out.push(part(slab([[-xL, yB, zRB], [xL, yB, zRB], [xL, yB, zBF], [-xL, yB, zBF]], 0.008, [0, -1, 0], 0.003), P.paint));

  // weld beads along the main joints
  const welds: THREE.BufferGeometry[] = [];
  const w = (pts: P3[], r = 0.005, pitch = 2.8) => welds.push(weldBead(pts, r, pitch));
  for (const sx of [-1, 1]) {
    w([[sx * (xL + 0.001), yN, zN - 0.003], [sx * (xL + 0.001), yR - 0.003, zG + 0.004]]);
    w([[sx * (xL + 0.001), yR - 0.002, zG - 0.01], [sx * (xL + 0.001), yR - 0.002, zCF + 0.01]]);
  }
  w([[-xL + 0.01, yN + 0.002, zN + 0.002], [xL - 0.01, yN + 0.002, zN + 0.002]], 0.006);
  w([[-xL + 0.01, yR + 0.002, zG - 0.002], [xL - 0.01, yR + 0.002, zG - 0.002]], 0.005);
  w([[-xL + 0.01, yRm, zRear - 0.003], [xL - 0.01, yRm, zRear - 0.003]], 0.005);
  out.push(part(merge(welds), P.paint));
  return out;
}

/* ---------------------------------------- front ---------------------------------------------- */

/** Driver's hatch: curved 25 mm door with the rotating periscope on its upper edge (lying on y = 0,
 *  local -Z = up the plate). */
function driverHatch(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  // frame ring welded into the plate cut-out
  ps.push(part(G.plate([[-0.31, -0.29], [0.31, -0.29], [0.31, 0.29], [-0.31, 0.29]], 0.02, 'xz', 0.004, 0.06), P.paint, { p: [0, 0.01, 0] }));
  // curved door: an arched shell (radius across the vehicle)
  const arc: G.V2[] = [];
  const rr = 0.9, half = 0.27, t = 0.025;
  const a1 = Math.asin(half / rr);
  for (let i = 0; i <= 10; i++) {
    const a = -a1 + (2 * a1 * i) / 10;
    arc.push([Math.sin(a) * rr, Math.cos(a) * rr - rr * Math.cos(a1)]);
  }
  for (let i = 10; i >= 0; i--) {
    const a = -a1 + (2 * a1 * i) / 10;
    arc.push([Math.sin(a) * (rr - t), Math.cos(a) * (rr - t) - rr * Math.cos(a1)]);
  }
  const door = G.extrude(G.shape(arc), 0.5, 0.006, 2, 1);
  ps.push(part(door, P.paint, { p: [0, 0.02, 0.0] }));
  // end caps of the arched door
  // periscope housing on the upper edge (towards -Z) and its window facing up the plate
  ps.push(part(G.rbox(0.2, 0.09, 0.1, 0.012, 2), P.paint, { p: [0, 0.07, -0.2] }));
  ps.push(part(G.lathe([[0.0, 0.0], [0.07, 0.0], [0.07, 0.03], [0.06, 0.04], [0.0, 0.04]], 24, 40), P.paint, { p: [0, 0.11, -0.2] }));
  ps.push(part(G.box(0.1, 0.04, 0.006), P.void, { p: [0, 0.075, -0.253] }));
  ps.push(part(G.box(0.09, 0.034, 0.004), P.vision, { p: [0, 0.075, -0.2555] }));
  // hinges at the upper edge, grab handle
  for (const sx of [-1, 1]) {
    ps.push(part(G.cyl(0.022, 0.022, 0.08, 12), P.paint, { p: [sx * 0.19, 0.035, -0.27], r: [0, 0, 90] }));
    ps.push(part(G.rbox(0.06, 0.012, 0.08, 0.004, 1), P.paint, { p: [sx * 0.19, 0.035, -0.23] }));
  }
  ps.push(part(G.tube([[-0.06, 0.05, 0.14], [-0.05, 0.085, 0.14], [0.05, 0.085, 0.14], [0.06, 0.05, 0.14]], 0.009, 8), P.paint));
  return group(ps);
}

/** Bolted transmission access plate on the upper front plate. */
function accessPlate(P: Pal, w: number, l: number): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.plate([[-w / 2, -l / 2], [w / 2, -l / 2], [w / 2, l / 2], [-w / 2, l / 2]], 0.014, 'xz', 0.004, 0.03), P.paint, { p: [0, 0.007, 0] }));
  const b: { p: G.V3; n: G.V3; spin: number }[] = [];
  const nx = Math.max(2, Math.round(w / 0.12)), nz = Math.max(2, Math.round(l / 0.12));
  for (let i = 0; i <= nx; i++) for (const sz of [-1, 1]) b.push({ p: [-w / 2 + 0.025 + ((w - 0.05) * i) / nx, 0.014, sz * (l / 2 - 0.025)], n: [0, 1, 0], spin: i });
  for (let i = 1; i < nz; i++) for (const sx of [-1, 1]) b.push({ p: [sx * (w / 2 - 0.025), 0.014, -l / 2 + 0.025 + ((l - 0.05) * i) / nz], n: [0, 1, 0], spin: i });
  ps.push(part(G.scatter(G.boltHead(0.022, 0.009), b), P.paint));
  ps.push(part(G.tube([[-0.05, 0.014, 0], [-0.04, 0.045, 0], [0.04, 0.045, 0], [0.05, 0.014, 0]], 0.008, 8), P.paint));
  return group(ps);
}

function headlamp(P: Pal): THREE.Object3D {
  // lamp axis along +Z, bracket down to y = -0.13
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, -0.08], [0.05, -0.08], [0.07, -0.055], [0.078, -0.015], [0.078, 0.025], [0.073, 0.035]], 26, 40), P.paint, { r: [90, 0, 0] }));
  ps.push(part(G.lathe([[0.0, 0.022], [0.068, 0.026], [0.068, 0.03], [0.0, 0.036]], 26, 60), P.glass, { r: [90, 0, 0] }));
  ps.push(part(G.lathe([[0.0, -0.025], [0.066, 0.0], [0.066, 0.01], [0.0, 0.01]], 22, 60), P.bright, { r: [90, 0, 0] }));
  ps.push(part(G.torus(0.074, 0.007, 6, 26), P.paint, { p: [0, 0, 0.036] }));
  ps.push(part(G.rbox(0.028, 0.1, 0.028, 0.008, 1), P.paint, { p: [0, -0.1, -0.03] }));
  return group(ps);
}

/** Tow hook on its base plate, modelled with the base on y = 0, mouth opening towards -Z. */
function towHook(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.rbox(0.12, 0.025, 0.2, 0.01, 1), P.cast, { p: [0, 0.012, -0.01] }));
  const hook: G.V2[] = [
    [0.07, 0.0], [0.07, 0.025], [0.06, 0.08], [0.036, 0.115], [0.0, 0.13], [-0.04, 0.124], [-0.07, 0.1],
    [-0.084, 0.075], [-0.076, 0.06], [-0.06, 0.062], [-0.045, 0.08], [-0.022, 0.088], [0.0, 0.083],
    [0.017, 0.066], [0.024, 0.04], [0.016, 0.022], [-0.016, 0.02], [-0.016, 0.0],
  ];
  ps.push(part(G.plate(hook, 0.045, 'zy', 0.007), P.cast));
  ps.push(part(G.cyl(0.02, 0.02, 0.075, 12), P.cast, { p: [0, 0.052, 0.035], r: [0, 0, 90] }));
  return group(ps);
}

function frontFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const u: P3 = [1, 0, 0];
  // driver's hatch in the centre of the upper front plate, near its top
  out.push(onPlate(driverHatch(P), glacis.at(0, glacis.L - 0.38), u, glacis.n));
  // transmission access plate low on the upper front plate, and a smaller inspection plate
  out.push(onPlate(accessPlate(P, 1.2, 0.34), glacis.at(0, 0.3), u, glacis.n));
  // headlamp on the left front of the upper plate, on a bracket
  const hp = glacis.at(0.72, 0.55);
  const hl = headlamp(P);
  hl.position.set(hp[0], hp[1] + 0.13, hp[2] + 0.02);
  out.push(hl);
  out.push(part(G.rbox(0.05, 0.03, 0.09, 0.008, 1), P.paint, { p: [hp[0], hp[1] + 0.012, hp[2] - 0.01] }));
  // tow hooks on the lower nose
  for (const sx of [-1, 1]) out.push(onPlate(towHook(P), lowNose.at(sx * 0.62, 0.16), u, lowNose.n));
  // spare track links on the upper front plate (right side), on a bar
  const sl: THREE.Object3D[] = [];
  for (let i = 0; i < 3; i++) {
    sl.push(part(G.rbox(0.3, 0.02, 0.1, 0.006, 1), P.track, { p: [0, 0.03, -0.12 + i * 0.112] }));
    for (const sx of [-1, 1]) sl.push(part(G.rbox(0.022, 0.06, 0.07, 0.005, 1), P.track, { p: [sx * 0.078, 0.06, -0.12 + i * 0.112] }));
  }
  sl.push(part(G.rbox(0.36, 0.014, 0.03, 0.004, 1), P.paint, { p: [0, 0.007, -0.2] }));
  sl.push(part(G.rbox(0.36, 0.014, 0.03, 0.004, 1), P.paint, { p: [0, 0.007, 0.13] }));
  out.push(onPlate(group(sl), glacis.at(-0.68, 0.62), u, glacis.n));
  return out;
}

/* ---------------------------------- track guards --------------------------------------------- */

function guards(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const t = 0.005;
  for (const sx of [-1, 1]) {
    const xc = sx * (xL + xFe) / 2, w = xFe - xL + 0.005;
    // guard / sponson floor over the full length
    out.push(part(G.rbox(w, t, zFeF - zFeR, 0.002, 1), P.paint, { p: [xc, yF - t / 2, (zFeF + zFeR) / 2] }));
    // outer turned-down lip
    out.push(part(G.rbox(0.005, 0.04, zFeF - zFeR, 0.002, 1), P.paint, { p: [sx * (xFe - 0.0025), yF - 0.02, (zFeF + zFeR) / 2] }));
    // front mudguard sloping down ahead of the sprocket, and the short rear flap
    const fl = 0.13;
    out.push(part(G.rbox(w, t, fl, 0.002, 1), P.paint, { p: [xc, yF - t / 2 - Math.sin(30 * D2R) * fl / 2, zFeF + Math.cos(30 * D2R) * fl / 2 - 0.004], r: [30, 0, 0] }));
    out.push(part(G.rbox(w, t, 0.08, 0.002, 1), P.paint, { p: [xc, yF - t / 2 - 0.02, zFeR - 0.034], r: [-30, 0, 0] }));
    // support brackets under the guard
    for (const z of [1.95, 0.7, -0.62, -2.3]) {
      out.push(part(G.plate([[0, 0], [0.07, 0.1], [0.07, 0.12], [0, 0.12]], 0.008, 'xy', 0.002), P.paint, { p: [sx * (xL + 0.004), yF - 0.125, z], s: [sx, 1, 1] }));
    }
  }
  return out;
}

/* ---------------------------------------- deck ----------------------------------------------- */

function louvre(P: Pal, w: number, l: number, slats: number, mesh: boolean): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const fw = 0.035;
  ps.push(part(G.rbox(w + 2 * fw, 0.03, fw, 0.006, 1), P.paint, { p: [0, 0.015, l / 2 + fw / 2] }));
  ps.push(part(G.rbox(w + 2 * fw, 0.03, fw, 0.006, 1), P.paint, { p: [0, 0.015, -l / 2 - fw / 2] }));
  ps.push(part(G.rbox(fw, 0.03, l, 0.006, 1), P.paint, { p: [w / 2 + fw / 2, 0.015, 0] }));
  ps.push(part(G.rbox(fw, 0.03, l, 0.006, 1), P.paint, { p: [-w / 2 - fw / 2, 0.015, 0] }));
  ps.push(part(G.box(w, 0.004, l), P.void, { p: [0, 0.004, 0] }));
  const sg: THREE.BufferGeometry[] = [];
  const pitch = l / slats;
  for (let i = 0; i < slats; i++) {
    const s = G.box(w - 0.004, 0.006, pitch * 1.05);
    s.rotateX(-40 * D2R);
    s.translate(0, 0.016, -l / 2 + pitch * (i + 0.5));
    sg.push(s);
  }
  ps.push(part(merge(sg), P.paint));
  if (mesh) {
    const mg: THREE.BufferGeometry[] = [];
    const step = 0.04;
    for (let x = -w / 2 + step / 2; x < w / 2; x += step) mg.push(xf(G.box(0.004, 0.004, l + 0.02), [x, 0.034, 0]));
    for (let z = -l / 2 + step / 2; z < l / 2; z += step) mg.push(xf(G.box(w + 0.02, 0.004, 0.004), [0, 0.038, z]));
    ps.push(part(merge(mg), P.track));
  }
  return group(ps);
}

function fillerCap(P: Pal): THREE.Object3D {
  return group([
    part(G.lathe([[0.0, 0.0], [0.07, 0.0], [0.07, 0.01], [0.058, 0.018], [0.0, 0.018]], 22, 40), P.paint),
    part(G.lathe([[0.0, 0.018], [0.042, 0.018], [0.042, 0.03], [0.034, 0.037], [0.0, 0.037]], 18, 40), P.paint),
    part(G.rbox(0.06, 0.014, 0.012, 0.004, 1), P.paint, { p: [0, 0.044, 0] }),
  ]);
}

function deck(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = yR;
  const zCF = frontZ(yR);
  // engine access hatch on the right (-X) with bolted edge and two grips
  const zc = (zG + zCF) / 2 + 0.05, hl = 0.62, hw = 0.5, xc = -0.36;
  out.push(part(G.plate([[-hw / 2, -hl / 2], [hw / 2, -hl / 2], [hw / 2, hl / 2], [-hw / 2, hl / 2]], 0.016, 'xz', 0.004, 0.03), P.paint, { p: [xc, y + 0.008, zc] }));
  const bolts: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const z = zc - hl / 2 + 0.04 + (i * (hl - 0.08)) / 5;
    for (const sx of [-1, 1]) bolts.push({ p: new THREE.Vector3(xc + sx * (hw / 2 - 0.025), y + 0.016, z), n: new THREE.Vector3(0, 1, 0), spin: i });
  }
  for (let i = 1; i < 5; i++) {
    const x = xc - hw / 2 + 0.025 + (i * (hw - 0.05)) / 5;
    for (const sz of [-1, 1]) bolts.push({ p: new THREE.Vector3(x, y + 0.016, zc + sz * (hl / 2 - 0.025)), n: new THREE.Vector3(0, 1, 0), spin: i });
  }
  out.push(part(G.scatter(G.boltHead(0.022, 0.009), bolts), P.paint));
  for (const sz of [-1, 1]) out.push(part(G.tube([[xc - 0.07, y + 0.016, zc + sz * 0.18], [xc - 0.055, y + 0.05, zc + sz * 0.18], [xc + 0.055, y + 0.05, zc + sz * 0.18], [xc + 0.07, y + 0.016, zc + sz * 0.18]], 0.009, 8), P.paint));
  // radiator intake grille beside the hatch (towards the hull edge) and outlet louvre behind it
  const g1 = louvre(P, 0.26, 0.62, 9, true);
  g1.position.set(-0.8, y, zc);
  out.push(g1);
  // outlet louvre: raised, angled box on the right rear of the engine deck, in front of the casemate
  const ob: THREE.Object3D[] = [];
  const ow = 0.62, ol = 0.2;
  ob.push(part(G.plate([[0, 0], [ol, 0], [ol, 0.14], [0.03, 0.14]], 0.012, 'zy', 0.003), P.paint, { p: [ow / 2, 0, 0] }));
  ob.push(part(G.plate([[0, 0], [ol, 0], [ol, 0.14], [0.03, 0.14]], 0.012, 'zy', 0.003), P.paint, { p: [-ow / 2, 0, 0] }));
  ob.push(part(G.rbox(ow + 0.012, 0.012, ol - 0.03, 0.003, 1), P.paint, { p: [0, 0.14, 0.03 + (ol - 0.03) / 2] }));
  ob.push(part(G.box(ow - 0.01, 0.12, 0.004), P.void, { p: [0, 0.07, 0.01] }));
  const sl: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const s = G.box(ow - 0.012, 0.004, 0.05);
    s.rotateX(-35 * D2R);
    s.translate(0, 0.02 + i * 0.024, 0.02);
    sl.push(s);
  }
  ob.push(part(merge(sl), P.paint));
  const og = group(ob);
  og.position.set(-0.6, y, zCF + 0.02);
  out.push(og);
  // fuel filler caps on the left of the roof
  for (const z of [zc - 0.18, zc + 0.18]) {
    const c = fillerCap(P);
    c.position.set(0.72, y, z);
    out.push(c);
  }
  // lifting eyes at the roof corners
  for (const sx of [-1, 1]) {
    out.push(part(G.torus(0.03, 0.009, 6, 16), P.paint, { p: [sx * (xL - 0.06), y + 0.03, zG - 0.1], r: [0, 90, 0] }));
    out.push(part(G.rbox(0.025, 0.016, 0.08, 0.004, 1), P.paint, { p: [sx * (xL - 0.06), y + 0.008, zG - 0.1] }));
  }
  return out;
}

/* --------------------------------------- exhaust --------------------------------------------- */

/** Twin mufflers on the right guard, alongside the hull side (right = -X). */
function exhausts(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const z0 = 0.78, z1 = 1.42, r = 0.075;
  for (const [i, x] of [[0, -(xL + 0.1)], [1, -(xL + 0.27)]] as [number, number][]) {
    const y = yF + r + 0.03;
    out.push(part(G.lathe([[0.0, z0], [r - 0.02, z0], [r, z0 + 0.02], [r, z1 - 0.02], [r - 0.02, z1], [0.0, z1]].map(([a, b]) => [a, b] as G.V2), 26, 40), P.exhaust, { p: [x, y, 0], r: [90, 0, 0] }));
    // bands and feet
    for (const z of [z0 + 0.12, z1 - 0.12]) {
      out.push(part(G.torus(r + 0.004, 0.006, 6, 24), P.paint, { p: [x, y, z] }));
      out.push(part(G.rbox(0.05, 0.03, 0.03, 0.004, 1), P.paint, { p: [x, yF + 0.015, z] }));
    }
    // inlet pipe from the hull side (front) and the tailpipe pointing rearwards/outwards
    const xi = -(xL + 0.005);
    out.push(part(G.tube([[xi, y + 0.02 + i * 0.06, z1 + 0.06], [x + 0.02, y + 0.02 + i * 0.03, z1 + 0.06], [x, y, z1 - 0.02]], 0.022, 10), P.exhaust));
    out.push(part(G.tube([[x, y - 0.01, z0 + 0.02], [x, y - 0.02, z0 - 0.06], [x - 0.03, y - 0.03, z0 - 0.12]], 0.02, 10), P.exhaust));
    out.push(part(G.cyl(0.016, 0.016, 0.004, 12), P.void, { p: [x - 0.034, y - 0.031, z0 - 0.128], r: [90, 0, 0] }));
  }
  // heat shield plate behind the mufflers
  out.push(part(G.rbox(0.004, 0.2, z1 - z0 + 0.1, 0.002, 1), P.paint, { p: [-(xL + 0.012), yF + 0.11, (z0 + z1) / 2] }));
  return out;
}

/* ------------------------------------- stowage & tools --------------------------------------- */

function box(P: Pal, w: number, h: number, l: number): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.rbox(w, h, l, 0.01, 2), P.paint, { p: [0, h / 2, 0] }));
  ps.push(part(G.rbox(w + 0.012, 0.02, l + 0.012, 0.006, 1), P.paint, { p: [0, h - 0.01, 0] }));
  for (const sz of [-1, 1]) ps.push(part(G.rbox(0.03, 0.03, 0.02, 0.004, 1), P.paint, { p: [w / 2 + 0.01, h - 0.05, sz * l * 0.3] }));
  ps.push(part(G.rbox(0.02, 0.05, 0.04, 0.004, 1), P.bright, { p: [w / 2 + 0.012, h - 0.04, 0] }));
  return group(ps);
}

function shovel(P: Pal): THREE.Object3D {
  // lying along +Z, blade at -Z end
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.cyl(0.018, 0.018, 0.75, 10), P.wood, { p: [0, 0.02, 0.2], r: [90, 0, 0] }));
  ps.push(part(G.plate([[-0.11, 0], [0.11, 0], [0.11, 0.2], [0.05, 0.27], [-0.05, 0.27], [-0.11, 0.2]], 0.004, 'xz', 0.001), P.bright, { p: [0, 0.012, -0.25], r: [0, 180, 0] }));
  ps.push(part(G.cyl(0.022, 0.018, 0.1, 10), P.paint, { p: [0, 0.02, -0.2], r: [90, 0, 0] }));
  ps.push(part(G.rbox(0.03, 0.02, 0.02, 0.004, 1), P.paint, { p: [0, 0.01, 0.4] }));
  ps.push(part(G.rbox(0.03, 0.02, 0.02, 0.004, 1), P.paint, { p: [0, 0.01, -0.1] }));
  return group(ps);
}

function axe(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.rbox(0.035, 0.03, 0.62, 0.012, 2), P.wood, { p: [0, 0.02, 0] }));
  ps.push(part(G.plate([[-0.03, 0], [0.03, 0], [0.04, 0.16], [-0.06, 0.18]], 0.022, 'zy', 0.003), P.bright, { p: [0, 0.02, 0.29], r: [0, 90, 90] }));
  return group(ps);
}

function crowbar(P: Pal): THREE.Object3D {
  return group([part(G.cyl(0.014, 0.014, 1.1, 8), P.bright, { p: [0, 0.016, 0], r: [90, 0, 0] })]);
}

function stowage(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const xm = (xL + xFe) / 2;
  // ZIP / tool boxes on both front guards
  const b1 = box(P, 0.3, 0.26, 0.56);
  b1.position.set(xm, yF, 0.96);
  out.push(b1);
  const b2 = box(P, 0.3, 0.2, 0.5);
  b2.rotation.y = Math.PI;
  b2.position.set(-xm, yF, 1.95);
  out.push(b2);
  // pioneer tools on the left guard behind the box
  const sh = shovel(P);
  sh.position.set(xm + 0.07, yF, 1.8);
  out.push(sh);
  const ax = axe(P);
  ax.position.set(xL + 0.15, yF, 1.95);
  out.push(ax);
  const cb = crowbar(P);
  cb.position.set(xL + 0.045, yF, 1.85);
  out.push(cb);
  // tool clamps
  for (const z of [1.45, 2.3]) out.push(part(G.rbox(0.32, 0.012, 0.025, 0.004, 1), P.paint, { p: [xm, yF + 0.005, z] }));
  return out;
}

export function hull(P: Pal): THREE.Group {
  const out: THREE.Object3D[] = [...armour(P), ...frontFittings(P), ...guards(P), ...deck(P), ...exhausts(P), ...stowage(P)];
  void C;
  return group(out, { name: 'hull' });
}
