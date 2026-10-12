/**
 * Churchill Mk VII hull: the narrow welded hull body between the tracks (152 mm vertical front plate
 * with the driver's visor and the hull Besa ball mount, sloped lower nose plate, flat roof and engine
 * deck, rear plate) and the two side panniers (track frames) that fill the inside of each track loop:
 * outer and inner horn plates shaped by the track path, the pannier block with its floor over the
 * bogies, the row of mud chutes under the top run and the Mk VII round-cornered escape door.
 *
 * Hull frame: +Z forward, +X = the tank's left, y = 0 ground (see dims.ts).
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { H, R } from './dims';
import type { Pal } from './palette';
import { beltPolyline, clipHalf, thin } from './track';
import { slab, onPlate, boss, row, rb, latheZ, merge, type P2, type P3 } from '../cromwell/util';
import { periscope } from '../cromwell/hull';

const { xH, yB, yR, zF, yF, zBF, zRr, yRl, zBR, xP, yPb } = H;
const tF = H.tFront, tS = H.tSide, tRf = H.tRoof, tRe = H.tRear;

/* ------------------------------------------------------------------ body */

function body(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    out.push(
      part(
        slab(
          [
            [sx * xH, yB, zBR],
            [sx * xH, yB, zBF],
            [sx * xH, yF, zF - tF],
            [sx * xH, yR - tRf, zF - tF],
            [sx * xH, yR - tRf, zRr + tRe],
            [sx * xH, yRl, zRr + tRe],
          ],
          tS,
          [sx, 0, 0],
          0.006,
        ),
        P.paint,
      ),
    );
  }
  const xo = xH + 0.004;
  const xi = xH - tS + 0.002;
  // vertical front plate
  out.push(part(slab([[-xo, yF, zF], [xo, yF, zF], [xo, yR, zF], [-xo, yR, zF]], tF, [0, 0, 1], 0.012), P.paint));
  // lower nose plate
  const noseN: P3 = [0, -(zF - zBF), yF - yB];
  out.push(part(slab([[-xi, yB, zBF], [xi, yB, zBF], [xi, yF, zF], [-xi, yF, zF]], 0.08, noseN, 0.01), P.paint));
  // rear plate and lower rear plate
  out.push(part(slab([[-xo, yRl, zRr], [-xo, yR, zRr], [xo, yR, zRr], [xo, yRl, zRr]], tRe, [0, 0, -1], 0.008), P.paint));
  out.push(part(slab([[-xi, yRl, zRr], [xi, yRl, zRr], [xi, yB, zBR], [-xi, yB, zBR]], 0.04, [0, -(zBR - zRr), yB - yRl], 0.006), P.paint));
  // roof: fighting compartment and engine deck
  const zJ = -0.3;
  out.push(part(slab([[-xo, yR, zJ], [xo, yR, zJ], [xo, yR, zF], [-xo, yR, zF]], tRf, [0, 1, 0], 0.005), P.paint));
  out.push(part(slab([[-xo, yR, zRr], [xo, yR, zRr], [xo, yR, zJ - 0.006], [-xo, yR, zJ - 0.006]], tRf, [0, 1, 0], 0.005), P.paint));
  // belly
  out.push(part(slab([[-xi, yB, zBR], [-xi, yB, zBF], [xi, yB, zBF], [xi, yB, zBR]], 0.025, [0, -1, 0], 0.004), P.paint));
  // weld beads along the front plate / roof and front plate / nose joints
  out.push(part(G.cyl(0.012, 0.012, 2 * xo, 6), P.paint, { p: [0, yR + 0.002, zF + 0.002], r: [0, 0, 90] }));
  out.push(part(G.cyl(0.014, 0.014, 2 * xi, 6), P.paint, { p: [0, yF, zF + 0.004], r: [0, 0, 90] }));
  // roof edge bolts
  const pn: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (const sx of [-1, 1]) pn.push(...row([sx * (xo - 0.03), yR, zF - 0.2], [sx * (xo - 0.03), yR, zRr + 0.1], [0, 1, 0], 30));
  out.push(part(G.scatter(boss(0.012, 0.007, 8), pn), P.cast));
  return out;
}

/* ------------------------------------------------------------------ pannier (left side) */

let outlineCache: P2[] | null = null;
/** Side outline (z, y) of the horn plates: the track loop inset, cut at the pannier floor. */
export function pannierOutline(): P2[] {
  if (outlineCache) return outlineCache;
  let o = beltPolyline(-(R.t / 2 + 0.035), 0.03);
  o = clipHalf(o, 0, 1, -yPb); // y >= yPb
  o = clipHalf(o, 1, 0, 2.95); // z >= -2.95 (the sprocket stands clear at the rear)
  outlineCache = thin(o, 0.012);
  return outlineCache;
}

function escapeDoor(P: Pal): THREE.Object3D {
  // lying on y = 0 (plate), local +Y out of the plate, local X = hull +Z (forward), local Z = down
  const ps: THREE.Object3D[] = [];
  const w = 0.6, h = 0.62;
  const outline: G.V2[] = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ];
  // frame ring welded round the opening and the conical door
  ps.push(part(G.plate(outline.map(([a, b]) => [a * 1.14, b * 1.13] as G.V2), 0.014, 'xz', 0.004, 0.13), P.paint, { p: [0, 0.007, 0] }));
  ps.push(part(G.extrude(G.shape(outline, 0.1), 0.036, 0.016, 6, 2).rotateX(-Math.PI / 2), P.cast, { p: [0, 0.03, 0] }));
  // hinges on the front edge
  for (const z of [-0.18, 0.18]) {
    ps.push(part(G.cyl(0.024, 0.024, 0.1, 12), P.cast, { p: [w / 2 + 0.03, 0.03, z], r: [90, 0, 0] }));
    ps.push(part(rb(0.12, 0.016, 0.07, 0.005), P.cast, { p: [w / 2 - 0.03, 0.054, z] }));
  }
  // handle and lock
  ps.push(part(G.tube([[-0.2, 0.044, -0.07], [-0.21, 0.058, -0.04], [-0.21, 0.058, 0.04], [-0.2, 0.044, 0.07]], 0.008, 6, 18), P.cast));
  ps.push(part(G.cyl(0.035, 0.04, 0.016, 14), P.cast, { p: [-0.1, 0.054, 0.15] }));
  // pistol port in the door
  ps.push(part(G.cyl(0.05, 0.055, 0.02, 16), P.cast, { p: [0.06, 0.054, -0.1] }));
  return group(ps);
}

function pannierLeft(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const ol = pannierOutline();
  const tO = 0.03;
  // outer horn plate
  out.push(part(G.plate(ol, tO, 'zy', 0.008), P.paint, { p: [xP - tO / 2, 0, 0] }));
  // inner horn plate (just proud of the hull side)
  const xI = xH + 0.005;
  out.push(part(G.plate(ol, 0.03, 'zy', 0.006), P.paint, { p: [xI + 0.015, 0, 0] }));
  // pannier block between them (front cut back so the idler sits free in the horn)
  let blk = beltPolyline(-(R.t / 2 + 0.075), 0.03);
  blk = clipHalf(blk, 0, 1, -yPb);
  blk = clipHalf(blk, 1, 0, 2.9);
  blk = clipHalf(blk, -1, 0, 2.95);
  blk = thin(blk, 0.012);
  const bw = xP - tO - (xI + 0.03);
  out.push(part(G.plate(blk, bw, 'zy', 0.004), P.sheet, { p: [xI + 0.03 + bw / 2, 0, 0] }));
  // top-run guide rails on the pannier top, under the links' inner face either side of the guides
  const topY = R.idlerY + R.idlerR - 0.004;
  for (const sx of [-1, 1]) out.push(part(rb(0.06, 0.08, 5.8, 0.006), P.cast, { p: [R.trackX + sx * R.wheelDX, topY - 0.04, -0.05] }));
  // mud chutes: a row of dark openings under the top run
  const chutes: THREE.BufferGeometry[] = [];
  const cy = 1.37;
  for (let i = 0; i < 10; i++) {
    const z = 2.55 - i * 0.56;
    const v = G.box(0.012, 0.1, 0.24);
    v.translate(xP + 0.001, cy, z);
    chutes.push(v);
  }
  out.push(part(merge(chutes), P.void));
  // frames as lips round each opening (four bars each)
  const lips: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) {
    const z = 2.55 - i * 0.56;
    for (const dy of [-0.06, 0.06]) lips.push(rb(0.02, 0.02, 0.28, 0.005).translate(xP + 0.008, cy + dy, z));
    for (const dz of [-0.13, 0.13]) lips.push(rb(0.02, 0.1, 0.02, 0.005).translate(xP + 0.008, cy, z + dz));
  }
  out.push(part(merge(lips), P.paint));
  // escape door
  out.push(onPlate(escapeDoor(P), [xP, 0.95, 0.7], [0, 0, 1], [1, 0, 0]));
  // bolt rows along the top and bottom edges of the outer plate, and round the horn noses
  const bl: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  bl.push(...row([xP, 1.47, 2.95], [xP, 1.47, -2.8], [1, 0, 0], 26));
  bl.push(...row([xP, yPb + 0.05, 2.5], [xP, yPb + 0.05, -2.8], [1, 0, 0], 24));
  bl.push(...row([xP, 0.62, 2.72], [xP, 1.3, 3.25], [1, 0, 0], 5));
  out.push(part(G.scatter(boss(0.016, 0.01, 8), bl), P.cast));
  // idler hub boss and track adjuster on the horn plate
  out.push(part(G.cyl(0.11, 0.12, 0.03, 24), P.cast, { p: [xP + 0.015, R.idlerY, R.idlerZ], r: [0, 0, 90] }));
  out.push(part(G.cyl(0.06, 0.06, 0.04, 6), P.cast, { p: [xP + 0.045, R.idlerY, R.idlerZ], r: [0, 0, 90] }));
  out.push(part(rb(0.04, 0.08, 0.34, 0.01), P.cast, { p: [xP + 0.02, R.idlerY + 0.02, R.idlerZ - 0.3] }));
  out.push(part(G.scatter(G.boltHead(0.02, 0.01), [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i / 6) * Math.PI * 2;
    return { p: [xP + 0.03, R.idlerY + Math.sin(a) * 0.09, R.idlerZ + Math.cos(a) * 0.09] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
  })), P.cast));
  // pannier floor over the bogies
  out.push(part(rb(xP - xI, 0.03, 5.3, 0.008), P.sheet, { p: [(xP + xI) / 2, yPb + 0.015, -0.05] }));
  return out;
}

/* ------------------------------------------------------------------ front / roof / rear details */

function driverVisor(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.plate([[-0.2, -0.12], [0.2, -0.12], [0.2, 0.12], [-0.2, 0.12]], 0.03, 'xz', 0.008, 0.02), P.cast, { p: [0, 0.015, 0] }));
  ps.push(part(rb(0.28, 0.04, 0.12, 0.012), P.cast, { p: [0, 0.05, 0] }));
  ps.push(part(G.box(0.18, 0.01, 0.022), P.void, { p: [0, 0.07, 0.02] }));
  ps.push(part(G.box(0.17, 0.004, 0.016), P.vision, { p: [0, 0.074, 0.02] }));
  for (const x of [-0.12, 0.12]) ps.push(part(G.cyl(0.018, 0.018, 0.05, 10), P.cast, { p: [x, 0.05, 0.09], r: [0, 0, 90] }));
  ps.push(part(G.scatter(G.boltHead(0.02, 0.009), [
    { p: [-0.17, 0.03, -0.09] }, { p: [0.17, 0.03, -0.09] }, { p: [-0.17, 0.03, 0.09] }, { p: [0.17, 0.03, 0.09] },
  ]), P.cast));
  return group(ps);
}

function besaBall(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.2, 0], [0.2, 0.025], [0.18, 0.045], [0.14, 0.055], [0.125, 0.05], [0.125, 0.0]], 32, 40), P.cast));
  ps.push(part(new THREE.SphereGeometry(0.13, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), P.cast, { p: [0, -0.03, 0] }));
  ps.push(part(G.cyl(0.04, 0.045, 0.1, 16), P.cast, { p: [0, 0.12, 0] }));
  ps.push(part(G.cyl(0.02, 0.02, 0.14, 12), P.gun, { p: [0, 0.23, 0] }));
  ps.push(part(G.lathe([[0.011, 0.0], [0.024, 0.0], [0.026, 0.02], [0.026, 0.05], [0.011, 0.05]], 14, 40), P.gun, { p: [0, 0.29, 0] }));
  ps.push(part(G.cyl(0.011, 0.011, 0.004, 10), P.void, { p: [0, 0.338, 0] }));
  return group(ps);
}

function headlamp(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(latheZ([[0.0, -0.07], [0.045, -0.07], [0.062, -0.048], [0.07, -0.01], [0.07, 0.026], [0.064, 0.034]], 20, 40), P.black));
  ps.push(part(latheZ([[0.0, 0.022], [0.06, 0.024], [0.06, 0.028], [0.0, 0.032]], 20, 60), P.vision));
  const hood = G.lathe([[0.068, 0.028], [0.074, 0.028], [0.074, 0.09], [0.068, 0.09], [0.068, 0.028]], 12, 40, Math.PI / 2, Math.PI);
  hood.rotateX(Math.PI / 2);
  ps.push(part(hood, P.black));
  ps.push(part(rb(0.06, 0.06, 0.08, 0.008), P.paint, { p: [0, -0.02, -0.1] }));
  return group(ps);
}

function hatch(P: Pal, w: number, l: number): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.plate([[-w / 2 - 0.04, -l / 2 - 0.04], [w / 2 + 0.04, -l / 2 - 0.04], [w / 2 + 0.04, l / 2 + 0.04], [-w / 2 - 0.04, l / 2 + 0.04]], 0.016, 'xz', 0.004, 0.05), P.paint, { p: [0, 0.008, 0] }));
  ps.push(part(G.plate([[-w / 2, -l / 2], [w / 2, -l / 2], [w / 2, l / 2], [-w / 2, l / 2]], 0.03, 'xz', 0.006, 0.04), P.paint, { p: [0, 0.031, 0] }));
  for (const z of [-l * 0.3, l * 0.3]) ps.push(part(G.cyl(0.022, 0.022, 0.08, 12), P.paint, { p: [w / 2 + 0.03, 0.035, z], r: [90, 0, 0] }));
  ps.push(part(G.tube([[-w / 2 + 0.06, 0.046, 0.06], [-w / 2 + 0.05, 0.08, 0.03], [-w / 2 + 0.05, 0.08, -0.03], [-w / 2 + 0.06, 0.046, -0.06]], 0.008, 6, 16), P.paint));
  return group(ps);
}

function front(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // driver right (-X), hull Besa left (+X)
  out.push(onPlate(driverVisor(P), [-0.52, 1.38, zF], [-1, 0, 0], [0, 0, 1]));
  out.push(onPlate(besaBall(P), [0.5, 1.32, zF], [1, 0, 0], [0, 0, 1]));
  for (const sx of [-1, 1]) {
    const hl = headlamp(P);
    hl.position.set(sx * 0.86, 1.5, zF + 0.11);
    out.push(hl);
  }
  // roof hatches with periscopes for the driver and hull gunner
  for (const sx of [-1, 1]) {
    const h = hatch(P, 0.5, 0.5);
    h.position.set(sx * 0.5, yR, 2.62);
    if (sx > 0) h.scale.x = -1;
    out.push(h);
    const ps = periscope(P);
    ps.position.set(sx * 0.5, yR, 3.08);
    out.push(ps);
  }
  // towing eyes on the lower nose plate
  for (const sx of [-1, 1]) {
    const t = 0.35;
    out.push(part(rb(0.14, 0.12, 0.1, 0.02), P.cast, { p: [sx * 0.72, yB + (yF - yB) * t, zBF + (zF - zBF) * t + 0.04] }));
    out.push(part(G.torus(0.05, 0.015, 8, 16), P.cast, { p: [sx * 0.72, yB + (yF - yB) * t - 0.02, zBF + (zF - zBF) * t + 0.1], r: [0, 90, 0] }));
  }
  return out;
}

function rear(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const z = zRr;
  // exhaust silencers across the upper rear plate with their outlet pipes
  for (const sx of [-1, 1]) {
    out.push(part(G.cyl(0.11, 0.11, 0.62, 20), P.exhaust, { p: [sx * 0.5, 1.4, z - 0.14], r: [0, 0, 90] }));
    for (const dx of [-0.26, 0.26]) out.push(part(rb(0.04, 0.12, 0.14, 0.008), P.paint, { p: [sx * 0.5 + dx, 1.4, z - 0.07] }));
    out.push(part(G.tube([[sx * 0.82, 1.4, z - 0.14], [sx * 0.86, 1.38, z - 0.14], [sx * 0.88, 1.28, z - 0.16], [sx * 0.88, 1.18, z - 0.18]], 0.045, 12, 20), P.exhaust));
    out.push(part(G.cyl(0.036, 0.036, 0.004, 12), P.void, { p: [sx * 0.88, 1.176, z - 0.18] }));
    // tow hooks
    out.push(part(rb(0.16, 0.16, 0.08, 0.02), P.cast, { p: [sx * 0.7, 1.05, z - 0.04] }));
    out.push(part(G.torus(0.05, 0.016, 8, 16), P.cast, { p: [sx * 0.7, 0.98, z - 0.1], r: [0, 90, 0] }));
    // tail lamps
    out.push(part(rb(0.1, 0.08, 0.06, 0.01), P.black, { p: [sx * 0.88, 1.58, z - 0.03] }));
    out.push(part(G.box(0.07, 0.03, 0.004), P.glass, { p: [sx * 0.88, 1.588, z - 0.061] }));
  }
  // transmission access plate
  out.push(part(G.plate([[-0.3, 1.0], [0.3, 1.0], [0.3, 1.22], [-0.3, 1.22]], 0.022, 'xy', 0.005, 0.03), P.paint, { p: [0, 0, z - 0.011] }));
  const bl: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  bl.push(...row([-0.27, 1.02, z - 0.022], [0.27, 1.02, z - 0.022], [0, 0, -1], 6));
  bl.push(...row([-0.27, 1.2, z - 0.022], [0.27, 1.2, z - 0.022], [0, 0, -1], 6));
  out.push(part(G.scatter(G.boltHead(0.022, 0.009), bl), P.paint));
  return out;
}

export function hull(P: Pal): THREE.Group {
  const left = group(pannierLeft(P));
  return group([...body(P), mirrorX(left), ...front(P), ...rear(P)], { name: 'hull' });
}
