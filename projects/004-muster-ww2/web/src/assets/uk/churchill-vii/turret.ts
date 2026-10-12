/**
 * Churchill Mk VII composite turret: one cast piece for the four walls (rounded corners, sides leaning
 * in slightly) with a flat roof plate welded on top; cast mantlet with the 75 mm OQF gun (muzzle
 * counterweight) and the co-axial Besa; roof with the commander's all-round vision cupola (right),
 * the loader's hatch (left), periscopes, ventilator, lifting eyes; stowage bin on the turret rear.
 *
 * Turret-local frame: origin at the turret-ring centre on the underside of the turret body,
 * +Z forward, +X = the tank's left.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { T } from './dims';
import type { Pal } from './palette';
import { rb, latheZ, boss, merge, type P2 } from '../cromwell/util';
import { periscope } from '../cromwell/hull';

const { xW, zF, zR, h, inset } = T;

/** Plan ring (x, -z) of the turret walls at inset k: rounded rectangle, larger front corners. */
function planRing(k: number): P2[] {
  const x = xW - k, f = zF - k, r = zR + k;
  const rf = 0.3 - k * 0.5, rr = 0.2 - k * 0.5;
  const pts: P2[] = [];
  const arc = (cx: number, cz: number, rad: number, a0: number, n: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * rad, -(cz + Math.sin(a) * rad)]);
    }
  };
  // CCW in (x, z) from the front-left corner: front-left, rear-left, rear-right, front-right
  arc(x - rf, f - rf, rf, 0, 7); // front-left: from +x round to +z
  arc(-x + rf, f - rf, rf, Math.PI / 2, 7); // front-right
  arc(-x + rr, r + rr, rr, Math.PI, 6); // rear-right
  arc(x - rr, r + rr, rr, Math.PI * 1.5, 6); // rear-left
  return pts;
}

/** Wall inset at height y (sides lean in; slight bulge at mid-height). */
function kAt(y: number): number {
  const t = y / h;
  return inset * t * t * 0.7 + inset * t * 0.3;
}

function body(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const secs: { z: number; ring: P2[] }[] = [];
  for (const y of [0, 0.2, 0.4, 0.6, h - 0.03, h]) {
    const k = kAt(y) + (y === h ? 0.012 : 0);
    secs.push({ z: y, ring: planRing(k) });
  }
  const g = G.loftZ(secs, true, 40);
  g.rotateX(-Math.PI / 2);
  out.push(part(g, P.cast));
  // welded roof plate, a little proud and inset from the casting edge
  const roof = planRing(kAt(h) + 0.02).map(([x, nz]) => [x, nz] as G.V2);
  const rg = G.extrude(G.shape(roof), 0.022, 0.005, 1, 1);
  rg.rotateX(-Math.PI / 2);
  out.push(part(rg, P.paint, { p: [0, h + 0.005, 0] }));
  // splash ring round the base
  out.push(part(G.lathe([[T.ring + 0.05, -0.02], [T.ring + 0.09, -0.02], [T.ring + 0.09, 0.02], [T.ring + 0.05, 0.02]], 48, 40), P.cast));
  return out;
}

function gun(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y0 = T.trunY;
  const zFace = zF - kAt(y0) - 0.02;
  // cast mantlet: rounded block standing out of the turret face
  const mw = 0.62, mh = 0.44, mD = 0.2;
  const mg = G.extrude(G.shape([[-mw / 2, -mh / 2], [mw / 2, -mh / 2], [mw / 2, mh / 2], [-mw / 2, mh / 2]], 0.14), mD, 0.04, 8, 3);
  out.push(part(mg, P.cast, { p: [0.02, y0, zFace + mD / 2 - 0.04] }));
  const zM = zFace + mD - 0.04;
  // gun sleeve
  out.push(part(latheZ([[0.0, 0.0], [0.12, 0.0], [0.118, 0.04], [0.095, 0.07], [0.09, 0.22], [0.098, 0.23], [0.098, 0.25], [0.086, 0.26], [0.0, 0.26]], 36, 40), P.cast, { p: [0, y0, zM - 0.01] }));
  // 75 mm barrel with the muzzle counterweight; hollow muzzle
  const zb = zM + 0.24, zm = T.muzzleZ;
  const barrel = latheZ(
    [
      [0.0, zb],
      [0.06, zb],
      [0.058, zb + 0.1],
      [0.053, zb + 0.4],
      [0.047, zm - 0.28],
      [0.047, zm - 0.24],
      [0.058, zm - 0.21],
      [0.06, zm - 0.03],
      [0.055, zm],
      [0.0375, zm],
      [0.0375, zm - 0.3],
      [0.0, zm - 0.3],
    ],
    32,
    30,
  );
  out.push(part(barrel, P.paint, { p: [0, y0, 0] }));
  // co-axial Besa (left of the gun)
  const bx = 0.21, by = y0 + 0.02;
  out.push(part(latheZ([[0.0, 0.0], [0.045, 0.0], [0.045, 0.02], [0.036, 0.034], [0.034, 0.07], [0.0, 0.07]], 18, 40), P.cast, { p: [bx, by, zM - 0.005] }));
  out.push(part(latheZ([[0.0, 0.0], [0.017, 0.0], [0.017, 0.12], [0.0, 0.12]], 12, 40), P.gun, { p: [bx, by, zM + 0.06] }));
  out.push(part(latheZ([[0.011, 0.0], [0.022, 0.0], [0.024, 0.02], [0.024, 0.045], [0.011, 0.045]], 12, 40), P.gun, { p: [bx, by, zM + 0.175] }));
  // gunner's sight aperture (right)
  out.push(part(G.box(0.05, 0.036, 0.012), P.void, { p: [-0.2, y0 + 0.1, zM - 0.004] }));
  out.push(part(G.box(0.04, 0.026, 0.004), P.vision, { p: [-0.2, y0 + 0.1, zM + 0.002] }));
  return out;
}

/** All-round vision cupola: base on y = 0. */
function cupola(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.36, 0.0], [0.36, 0.02], [0.33, 0.035], [0.32, 0.14], [0.3, 0.15], [0.0, 0.15]], 40, 40), P.cast));
  // eight episcopes round the wall under rain guards
  const ep: THREE.BufferGeometry[] = [], gl: THREE.BufferGeometry[] = [], hd: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const m = new THREE.Matrix4().makeRotationY(a);
    const b = rb(0.13, 0.06, 0.04, 0.006);
    b.translate(0, 0.085, 0.32);
    ep.push(b.applyMatrix4(m));
    const gg = G.box(0.1, 0.035, 0.004);
    gg.translate(0, 0.085, 0.342);
    gl.push(gg.applyMatrix4(m));
    const hh = rb(0.16, 0.012, 0.06, 0.004);
    hh.translate(0, 0.122, 0.34);
    hd.push(hh.applyMatrix4(m));
  }
  ps.push(part(merge(ep), P.gun), part(merge(gl), P.vision), part(merge(hd), P.cast));
  // two-piece hatch on top
  for (const s of [-1, 1]) {
    ps.push(part(G.plate([[-0.27, 0], [0.27, 0], [0.25, 0.12], [0.14, 0.23], [-0.14, 0.23], [-0.25, 0.12]].map(([x, z]) => [x, s * z] as G.V2), 0.03, 'xz', 0.006), P.paint, { p: [0, 0.165, s * 0.004] }));
  }
  ps.push(part(G.cyl(0.02, 0.02, 0.5, 10), P.paint, { p: [0, 0.18, 0], r: [0, 0, 90] }));
  ps.push(part(G.tube([[-0.06, 0.18, 0.1], [-0.06, 0.22, 0.12], [0.06, 0.22, 0.12], [0.06, 0.18, 0.1]], 0.009, 6, 16), P.paint));
  return group(ps);
}

function loaderHatch(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.3, 0.0], [0.3, 0.03], [0.28, 0.04], [0.0, 0.04]], 32, 40), P.cast));
  for (const s of [-1, 1]) ps.push(part(G.plate([[-0.25, 0], [0.25, 0], [0.2, 0.16], [0, 0.24], [-0.2, 0.16]].map(([x, z]) => [x, s * z] as G.V2), 0.026, 'xz', 0.006), P.paint, { p: [0, 0.055, s * 0.004] }));
  ps.push(part(G.cyl(0.018, 0.018, 0.46, 10), P.paint, { p: [0, 0.066, 0], r: [0, 0, 90] }));
  return group(ps);
}

function liftingEye(P: Pal): THREE.Object3D {
  return group([
    part(rb(0.06, 0.03, 0.1, 0.008), P.cast, { p: [0, 0.015, 0] }),
    part(G.torus(0.035, 0.012, 8, 16, Math.PI), P.cast, { p: [0, 0.03, 0], r: [0, 90, 0] }),
  ]);
}

function rearBin(P: Pal): THREE.Object3D {
  const w = 1.1, d = 0.3, ht = 0.34;
  return group([
    part(rb(w, ht, d, 0.02), P.sheet, { p: [0, 0, -d / 2] }),
    part(rb(w + 0.02, 0.03, d + 0.02, 0.008), P.sheet, { p: [0, ht / 2, -d / 2] }),
    ...[-0.4, 0.4].map((x) => part(rb(0.05, 0.05, 0.02, 0.006), P.gun, { p: [x, ht / 2 - 0.05, -d - 0.008] })),
    ...[-0.5, 0.5].map((x) => part(rb(0.04, 0.05, 0.1, 0.006), P.sheet, { p: [x, -0.1, 0.03] })),
  ]);
}

export function turret(P: Pal): THREE.Group {
  const out: THREE.Object3D[] = [...body(P), ...gun(P)];
  const cup = cupola(P);
  cup.position.set(-0.4, h + 0.016, -0.42);
  const lh = loaderHatch(P);
  lh.position.set(0.4, h + 0.016, -0.36);
  out.push(cup, lh);
  for (const [x, z] of [[-0.42, 0.5], [0.36, 0.42]] as [number, number][]) {
    const p = periscope(P);
    p.position.set(x, h + 0.016, z);
    out.push(p);
  }
  // ventilator dome
  out.push(part(G.lathe([[0.0, 0.0], [0.12, 0.0], [0.12, 0.03], [0.1, 0.07], [0.0, 0.08]], 24, 40), P.cast, { p: [0.02, h + 0.016, 0.02] }));
  for (const [x, z] of [[0.72, 0.55], [-0.72, 0.55], [0.72, -0.72], [-0.72, -0.72]] as [number, number][]) {
    const e = liftingEye(P);
    e.position.set(x, h + 0.016, z);
    out.push(e);
  }
  // aerial base
  out.push(part(G.cyl(0.05, 0.06, 0.06, 16), P.cast, { p: [0.55, h + 0.046, -0.72] }));
  // stowage bin on the turret rear
  const bin = rearBin(P);
  const zb = zR + kAt(0.42) + 0.01;
  bin.position.set(0, 0.42, zb);
  out.push(bin);
  // cast-in bosses (weld points) on the walls
  const bs: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (const sx of [-1, 1]) for (const z of [0.3, -0.3]) bs.push({ p: new THREE.Vector3(sx * (xW - kAt(0.62)), 0.62, z), n: new THREE.Vector3(sx, 0, 0), spin: z });
  out.push(part(G.scatter(boss(0.03, 0.015, 12), bs), P.cast));
  return group(out, { name: 'turret' });
}
