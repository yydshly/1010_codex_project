/**
 * Cromwell Mk IV hull: a flat-sided box of bolted rolled-armour plates with real thickness (64 mm
 * vertical front plate, sloped nose plate with the nose ledge, 32 mm sides and rear, 20 mm roof and
 * belly) and rows of armour-bolt bosses along the plate edges; driver's armoured visor and the hull
 * Besa ball mount on the front plate; headlamps and front towing eyes; two roof hatches with
 * periscopes; engine deck with the fuel fillers, engine doors, side inlet louvres and the rear
 * radiator outlet louvre; rear plate with the armoured outlet cowl, exhausts, tail lamps, towing eyes
 * and pintle; belly escape hatch and drain plugs.
 *
 * Hull frame: +Z forward, +X = the tank's left, y = 0 ground (see dims.ts).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { H, T } from './dims';
import type { Pal } from './palette';
import { slab, onPlate, boss, row, rb, merge, latheZ, type P3 } from './util';

const { xS, yB, yR, zF, yL, zN, zBF, zRr, yRl, zBR } = H;
const tF = H.tFront, tS = H.tSide, tR = H.tRear, tRf = H.tRoof;
/** deck features start just behind the turret overhang */
const zDeck = T.z + T.zR - 0.1;

/* ------------------------------------------------------------------------------------------ */

function armour(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const noseN: P3 = [0, -(zN - zBF), yL - 0.03 - yB];
  for (const sx of [-1, 1]) {
    // hull side plate: full profile; upper front / rear plates overlap its ends
    out.push(
      part(
        slab(
          [
            [sx * xS, yB, zBR],
            [sx * xS, yB, zBF],
            [sx * xS, yL, zN],
            [sx * xS, yL, zF - tF],
            [sx * xS, yR - tRf, zF - tF],
            [sx * xS, yR - tRf, zRr + tR],
            [sx * xS, yRl, zRr + tR],
            [sx * xS, yRl, zRr],
          ],
          tS,
          [sx, 0, 0],
          0.005,
        ),
        P.paint,
      ),
    );
  }
  const xo = xS + 0.004; // overlapping plates stand 4 mm proud of the sides
  const xi = xS - tS + 0.001; // plates set between the sides
  // vertical front (driver's) plate
  out.push(part(slab([[-xo, yL, zF], [xo, yL, zF], [xo, yR - tRf, zF], [-xo, yR - tRf, zF]], tF, [0, 0, 1], 0.008), P.paint));
  // nose ledge (the "step" in front of the driver's plate) and the sloped nose plate
  out.push(part(slab([[-xi, yL, zF - tF], [xi, yL, zF - tF], [xi, yL, zN], [-xi, yL, zN]], 0.035, [0, 1, 0], 0.006), P.paint));
  out.push(part(slab([[-xi, yB, zBF], [xi, yB, zBF], [xi, yL - 0.03, zN], [-xi, yL - 0.03, zN]], 0.05, noseN, 0.008), P.paint));
  // rounded nose beam along the ledge edge
  out.push(part(G.cyl(0.03, 0.03, 2 * xi, 12), P.paint, { p: [0, yL - 0.022, zN - 0.012], r: [0, 0, 90] }));
  // upper rear plate, lower rear plate
  out.push(part(slab([[-xo, yRl, zRr], [-xo, yR - tRf, zRr], [xo, yR - tRf, zRr], [xo, yRl, zRr]], tR, [0, 0, -1], 0.008), P.paint));
  const lrN: P3 = [0, -(zRr - zBR), -(yRl - yB)];
  out.push(part(slab([[-xi, yRl, zRr], [xi, yRl, zRr], [xi, yB, zBR], [-xi, yB, zBR]], 0.03, [0, -Math.abs(lrN[1]), -Math.abs(lrN[2])], 0.006), P.paint));
  // roof: fighting compartment (front) and engine deck plates, both overlapping the sides
  const zJ = zDeck + 0.04;
  out.push(part(slab([[-xo, yR, zJ], [xo, yR, zJ], [xo, yR, zF + 0.004], [-xo, yR, zF + 0.004]], tRf, [0, 1, 0], 0.004), P.paint));
  out.push(part(slab([[-xo, yR, zRr - 0.004], [xo, yR, zRr - 0.004], [xo, yR, zJ - 0.006], [-xo, yR, zJ - 0.006]], tRf, [0, 1, 0], 0.004), P.paint));
  // belly
  out.push(part(slab([[-xi, yB, zBR], [-xi, yB, zBF], [xi, yB, zBF], [xi, yB, zBR]], 0.02, [0, -1, 0], 0.004), P.paint));

  // armour-bolt bosses along the plate edges
  const bs = boss(0.017, 0.011, 10);
  const pl: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  // front plate: top and bottom rows, outer columns
  pl.push(...row([-0.94, yR - tRf - 0.045, zF], [0.94, yR - tRf - 0.045, zF], [0, 0, 1], 13));
  pl.push(...row([-0.94, yL + 0.04, zF], [0.94, yL + 0.04, zF], [0, 0, 1], 13));
  for (const sx of [-1, 1]) pl.push(...row([sx * 0.975, yL + 0.13, zF], [sx * 0.975, yR - 0.13, zF], [0, 0, 1], 3));
  // sides above the guards: top row, front and rear columns, and a row along the guard line
  for (const sx of [-1, 1]) {
    pl.push(...row([sx * xS, yR - tRf - 0.04, zF - tF - 0.06], [sx * xS, yR - tRf - 0.04, zRr + tR + 0.06], [sx, 0, 0], 22));
    // joint between the fighting-compartment and engine-compartment side plates
    pl.push(...row([sx * xS, H.yG + 0.08, zDeck + 0.06], [sx * xS, yR - 0.1, zDeck + 0.06], [sx, 0, 0], 4));
    pl.push(...row([sx * xS, H.yG + 0.1, zF - tF - 0.035], [sx * xS, yR - 0.13, zF - tF - 0.035], [sx, 0, 0], 3));
    pl.push(...row([sx * xS, H.yG + 0.1, zRr + tR + 0.035], [sx * xS, yR - 0.13, zRr + tR + 0.035], [sx, 0, 0], 3));
  }
  // rear plate
  pl.push(...row([-0.94, yR - tRf - 0.045, zRr], [0.94, yR - tRf - 0.045, zRr], [0, 0, -1], 13));
  for (const sx of [-1, 1]) pl.push(...row([sx * 0.975, yRl + 0.08, zRr], [sx * 0.975, yR - 0.12, zRr], [0, 0, -1], 5));
  out.push(part(G.scatter(bs, pl), P.cast));
  // nose plate and roof edge rivets (smaller)
  const sm = boss(0.012, 0.007, 8);
  const pn: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  const nn = new THREE.Vector3(...noseN).normalize();
  const noseAt = (x: number, t: number) => new THREE.Vector3(x, yB + (yL - 0.03 - yB) * t, zBF + (zN - zBF) * t);
  for (let i = 0; i < 13; i++) pn.push({ p: noseAt(-0.9 + (i * 1.8) / 12, 0.88), n: nn, spin: i });
  for (let i = 0; i < 13; i++) pn.push({ p: noseAt(-0.9 + (i * 1.8) / 12, 0.1), n: nn, spin: i });
  for (const sx of [-1, 1]) {
    pn.push(...row([sx * (xo - 0.028), yR, zF - 0.1], [sx * (xo - 0.028), yR, zRr + 0.1], [0, 1, 0], 26));
  }
  pn.push(...row([-0.9, yR, zJ - 0.022], [0.9, yR, zJ - 0.022], [0, 1, 0], 11));
  out.push(part(G.scatter(sm, pn), P.cast));
  return out;
}

/* ---------------------------------------- front ---------------------------------------------- */

/** Driver's armoured visor (closed), modelled on the plate: local +Y out of the plate, +Z up. */
function driverVisor(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  // frame plate welded round the opening
  ps.push(part(G.plate([[-0.22, -0.13], [0.22, -0.13], [0.22, 0.13], [-0.22, 0.13]], 0.02, 'xz', 0.005, 0.02), P.paint, { p: [0, 0.01, 0] }));
  // visor door (hinged at the top), slightly proud of the frame
  ps.push(part(rb(0.36, 0.05, 0.19, 0.012), P.cast, { p: [0, 0.042, -0.01] }));
  // vision slit across the door with the dark prism behind
  ps.push(part(G.box(0.2, 0.012, 0.016), P.void, { p: [0, 0.064, 0.03] }));
  ps.push(part(G.box(0.19, 0.004, 0.012), P.vision, { p: [0, 0.061, 0.03] }));
  ps.push(part(rb(0.24, 0.018, 0.022, 0.005), P.cast, { p: [0, 0.07, 0.052] }));
  // top hinge: two knuckles on the frame and a centre knuckle on the door
  for (const x of [-0.13, 0.13]) ps.push(part(G.cyl(0.02, 0.02, 0.06, 12), P.cast, { p: [x, 0.04, 0.105], r: [0, 0, 90] }));
  ps.push(part(G.cyl(0.018, 0.018, 0.19, 12), P.cast, { p: [0, 0.04, 0.105], r: [0, 0, 90] }));
  // operating lug and stop on the side
  ps.push(part(rb(0.04, 0.03, 0.05, 0.006), P.cast, { p: [0.2, 0.035, -0.06] }));
  ps.push(part(G.scatter(G.boltHead(0.018, 0.008), [
    { p: [-0.195, 0.02, -0.11] }, { p: [0.195, 0.02, -0.11] }, { p: [-0.195, 0.02, 0.11] }, { p: [0.195, 0.02, 0.11] },
  ]), P.cast));
  return group(ps);
}

/** Hull Besa ball mount: local +Y out of the plate. */
function besaBall(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  // bolted armoured collar
  ps.push(part(G.lathe([[0.19, 0], [0.19, 0.022], [0.175, 0.04], [0.14, 0.05], [0.125, 0.048], [0.125, 0.0]], 36, 40), P.cast));
  ps.push(part(G.scatter(G.boltHead(0.02, 0.009), Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    return { p: [Math.cos(a) * 0.165, 0.028, Math.sin(a) * 0.165] as G.V3, spin: a };
  })), P.cast));
  // the ball
  ps.push(part(new THREE.SphereGeometry(0.128, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), P.cast, { p: [0, -0.035, 0] }));
  // Besa barrel sleeve, barrel and flash guard, pointing along the hull axis (plate normal)
  ps.push(part(G.cyl(0.038, 0.042, 0.1, 18), P.cast, { p: [0, 0.12, 0] }));
  ps.push(part(G.cyl(0.02, 0.02, 0.12, 14), P.gun, { p: [0, 0.22, 0] }));
  ps.push(part(G.lathe([[0.011, 0.0], [0.022, 0.0], [0.024, 0.02], [0.024, 0.045], [0.011, 0.045]], 14, 40), P.gun, { p: [0, 0.275, 0] }));
  ps.push(part(G.cyl(0.011, 0.011, 0.004, 10), P.void, { p: [0, 0.318, 0] }));
  return group(ps);
}

/** Headlamp with a blackout hood over the upper half, pointing +Z; origin at the lamp centre. */
function headlamp(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(latheZ([[0.0, -0.07], [0.045, -0.07], [0.062, -0.048], [0.07, -0.01], [0.07, 0.026], [0.064, 0.034]], 24, 40), P.black));
  ps.push(part(latheZ([[0.0, -0.016], [0.058, 0.0], [0.058, 0.01], [0.0, 0.01]], 22, 60), P.gun));
  ps.push(part(latheZ([[0.0, 0.022], [0.06, 0.024], [0.06, 0.028], [0.0, 0.032]], 22, 60), P.vision));
  ps.push(part(G.torus(0.066, 0.006, 6, 24), P.black, { p: [0, 0, 0.032] }));
  // hood over the upper half of the lens
  const hood = G.lathe([[0.068, 0.028], [0.074, 0.028], [0.074, 0.095], [0.068, 0.095], [0.068, 0.028]], 14, 40, Math.PI / 2, Math.PI);
  hood.rotateX(Math.PI / 2);
  ps.push(part(hood, P.black));
  // bracket block from the lamp body back into the plate pad
  ps.push(part(rb(0.06, 0.06, 0.07, 0.008), P.paint, { p: [0, -0.012, -0.1] }));
  return group(ps);
}

/** Towing eye bracket with a shackle; base on y = 0 (plate), shackle hanging towards -Z (down). */
function towEye(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(rb(0.2, 0.03, 0.2, 0.01), P.cast, { p: [0, 0.015, 0] }));
  for (const x of [-0.05, 0.05]) ps.push(part(G.plate([[-0.07, 0], [0.07, 0], [0.05, 0.1], [0.0, 0.12], [-0.05, 0.1]], 0.03, 'zy', 0.006), P.cast, { p: [x, 0.02, 0] }));
  ps.push(part(G.cyl(0.02, 0.02, 0.16, 12), P.cast, { p: [0, 0.095, 0.0], r: [0, 0, 90] }));
  ps.push(part(G.tube([[-0.035, 0.095, 0.0], [-0.045, 0.1, -0.08], [0.0, 0.1, -0.13], [0.045, 0.1, -0.08], [0.035, 0.095, 0.0]], 0.014, 8, 30), P.cast));
  return group(ps);
}

/** Vickers tank periscope Mk IV in its rotating mount with a rain guard; base on y = 0, window +Z. */
export function periscope(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.09, 0.0], [0.09, 0.018], [0.082, 0.026], [0.0, 0.026]], 26, 40), P.paint));
  ps.push(part(G.scatter(G.boltHead(0.012, 0.006), Array.from({ length: 6 }, (_, i) => ({ p: [Math.cos(i * 1.047 + 0.5) * 0.072, 0.025, Math.sin(i * 1.047 + 0.5) * 0.072] as G.V3, spin: i }))), P.paint));
  ps.push(part(rb(0.11, 0.075, 0.07, 0.008), P.gun, { p: [0, 0.062, 0] }));
  ps.push(part(G.box(0.086, 0.036, 0.004), P.vision, { p: [0, 0.066, 0.036] }));
  ps.push(part(rb(0.13, 0.012, 0.1, 0.004), P.paint, { p: [0, 0.106, 0.012] }));
  ps.push(part(rb(0.012, 0.05, 0.09, 0.003), P.paint, { p: [0.062, 0.078, 0.01] }));
  ps.push(part(rb(0.012, 0.05, 0.09, 0.003), P.paint, { p: [-0.062, 0.078, 0.01] }));
  return group(ps);
}

/** Hull roof hatch lying on y = 0, hinged on the outer (+X) edge; split = two-piece driver's hatch. */
function roofHatch(P: Pal, split: boolean): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const W = 0.56, L = 0.5, t = 0.028;
  // coaming ring
  ps.push(part(G.plate([[-W / 2 - 0.035, -L / 2 - 0.035], [W / 2 + 0.035, -L / 2 - 0.035], [W / 2 + 0.035, L / 2 + 0.035], [-W / 2 - 0.035, L / 2 + 0.035]], 0.014, 'xz', 0.004, 0.05), P.paint, { p: [0, 0.007, 0] }));
  if (split) {
    for (const s of [-1, 1]) ps.push(part(G.plate([[-W / 2, 0], [W / 2, 0], [W / 2, L / 2 - 0.006], [-W / 2, L / 2 - 0.006]], t, 'xz', 0.005, 0.03), P.paint, { p: [0, 0.014 + t / 2, s > 0 ? 0.003 : -L / 2 + 0.003] }));
  } else {
    ps.push(part(G.plate([[-W / 2, -L / 2], [W / 2, -L / 2], [W / 2, L / 2], [-W / 2, L / 2]], t, 'xz', 0.005, 0.04), P.paint, { p: [0, 0.014 + t / 2, 0] }));
  }
  // hinges on the outer edge
  for (const z of [-0.15, 0.15]) {
    ps.push(part(G.cyl(0.022, 0.022, 0.08, 12), P.paint, { p: [W / 2 + 0.03, 0.03, z], r: [90, 0, 0] }));
    ps.push(part(rb(0.07, 0.016, 0.06, 0.004), P.paint, { p: [W / 2 - 0.01, 0.046, z] }));
  }
  // lifting handle and lock
  ps.push(part(G.tube([[-0.18, 0.042, 0.06], [-0.19, 0.075, 0.03], [-0.19, 0.075, -0.03], [-0.18, 0.042, -0.06]], 0.008, 6, 20), P.paint));
  ps.push(part(G.cyl(0.03, 0.034, 0.016, 14), P.paint, { p: [-0.05, 0.05, -0.14] }));
  // periscope in the forward part of the hatch
  const pz = periscope(P);
  pz.position.set(0.05, 0.042, 0.12);
  ps.push(pz);
  return group(ps);
}

function frontFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const fz = zF;
  // driver's visor (right) and hull Besa ball mount (left)
  out.push(onPlate(driverVisor(P), [-0.5, 1.29, fz], [-1, 0, 0], [0, 0, 1]));
  out.push(onPlate(besaBall(P), [0.5, 1.25, fz], [1, 0, 0], [0, 0, 1]));
  // headlamps on the front plate near the outer corners
  for (const sx of [-1, 1]) {
    const hl = headlamp(P);
    hl.position.set(sx * 0.84, 1.3, fz + 0.1);
    out.push(hl);
    out.push(part(rb(0.1, 0.1, 0.012, 0.004), P.paint, { p: [sx * 0.84, 1.288, fz + 0.006] }));
  }
  // towing eyes on the nose plate
  const nn: P3 = [0, -(zN - zBF), yL - 0.03 - yB];
  const noseAt = (x: number, t: number): P3 => [x, yB + (yL - 0.03 - yB) * t, zBF + (zN - zBF) * t];
  for (const sx of [-1, 1]) out.push(onPlate(towEye(P), noseAt(sx * 0.74, 0.42), [-1, 0, 0], nn));
  // roof hatches: driver right (two-piece), hull gunner left
  const hd = roofHatch(P, true);
  hd.position.set(-0.5, yR, 2.4);
  const hg = roofHatch(P, false);
  hg.position.set(0.5, yR, 2.4);
  hg.scale.x = -1; // hinge on the tank's left edge
  out.push(hd, hg);
  return out;
}

/* ---------------------------------------- deck ----------------------------------------------- */

/**
 * Armoured louvre lying on y = 0: frame, dark well, inclined slats. `across` = slats run along X
 * (pitch along Z) when true, else slats run along Z (pitch along X).
 */
export function louvre(P: Pal, w: number, l: number, slats: number, across: boolean, tilt = 38): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const fw = 0.04, fh = 0.035;
  ps.push(part(rb(w + 2 * fw, fh, fw, 0.008), P.paint, { p: [0, fh / 2, l / 2 + fw / 2] }));
  ps.push(part(rb(w + 2 * fw, fh, fw, 0.008), P.paint, { p: [0, fh / 2, -l / 2 - fw / 2] }));
  ps.push(part(rb(fw, fh, l, 0.008), P.paint, { p: [w / 2 + fw / 2, fh / 2, 0] }));
  ps.push(part(rb(fw, fh, l, 0.008), P.paint, { p: [-w / 2 - fw / 2, fh / 2, 0] }));
  ps.push(part(G.box(w, 0.004, l), P.void, { p: [0, 0.004, 0] }));
  const sg: THREE.BufferGeometry[] = [];
  const span = across ? l : w, len = across ? w : l;
  const pitch = span / slats;
  for (let i = 0; i < slats; i++) {
    const s = G.box(len - 0.004, 0.01, pitch * 1.08);
    s.rotateX((-tilt * Math.PI) / 180);
    s.translate(0, fh * 0.55, -span / 2 + pitch * (i + 0.5));
    if (!across) s.rotateY(Math.PI / 2);
    sg.push(s);
  }
  // a stiffening bar under the slats
  const bar = G.box(across ? 0.02 : w, 0.01, across ? l : 0.02);
  bar.translate(0, 0.009, 0);
  sg.push(bar);
  ps.push(part(merge(sg), P.paint));
  return group(ps);
}

function fillerCap(P: Pal): THREE.Object3D {
  return group([
    part(G.lathe([[0.0, 0.0], [0.1, 0.0], [0.1, 0.012], [0.09, 0.018], [0.0, 0.018]], 28, 40), P.paint),
    part(G.lathe([[0.0, 0.018], [0.072, 0.018], [0.072, 0.035], [0.062, 0.045], [0.0, 0.047]], 28, 40), P.cast),
    part(rb(0.1, 0.018, 0.022, 0.005), P.cast, { p: [0, 0.056, 0] }),
    part(rb(0.04, 0.03, 0.05, 0.006), P.cast, { p: [0.085, 0.03, 0] }),
  ]);
}

function engineDeck(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = yR;
  // fuel fillers behind the turret
  for (const sx of [-1, 1]) {
    const f = fillerCap(P);
    f.position.set(sx * 0.78, y, zDeck - 0.1);
    out.push(f);
  }
  // engine access doors (two, side by side) with bolted edges, hinges and lifting handles
  const z0 = zDeck - 0.26, z1 = z0 - 1.1, dw = 0.57;
  for (const sx of [-1, 1]) {
    const xc = sx * (dw / 2 + 0.012);
    out.push(part(G.plate([[-dw / 2, z1], [dw / 2, z1], [dw / 2, z0], [-dw / 2, z0]], 0.026, 'xz', 0.005, 0.02), P.paint, { p: [xc, y + 0.013, 0] }));
    const bl: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
    bl.push(...row([xc - dw / 2 + 0.03, y + 0.026, z0 - 0.04], [xc - dw / 2 + 0.03, y + 0.026, z1 + 0.04], [0, 1, 0], 9));
    bl.push(...row([xc + dw / 2 - 0.03, y + 0.026, z0 - 0.04], [xc + dw / 2 - 0.03, y + 0.026, z1 + 0.04], [0, 1, 0], 9));
    bl.push(...row([xc - dw / 2 + 0.09, y + 0.026, z1 + 0.03], [xc + dw / 2 - 0.09, y + 0.026, z1 + 0.03], [0, 1, 0], 4));
    out.push(part(G.scatter(G.boltHead(0.022, 0.009), bl), P.paint));
    for (const x of [xc - 0.16, xc + 0.16]) {
      out.push(part(G.cyl(0.022, 0.022, 0.1, 12), P.paint, { p: [x, y + 0.03, z0 + 0.012], r: [0, 0, 90] }));
      out.push(part(rb(0.06, 0.012, 0.09, 0.004), P.paint, { p: [x, y + 0.03, z0 - 0.03] }));
    }
    out.push(part(G.tube([[xc - 0.07, y + 0.026, z0 - 0.62], [xc - 0.06, y + 0.07, z0 - 0.62], [xc + 0.06, y + 0.07, z0 - 0.62], [xc + 0.07, y + 0.026, z0 - 0.62]], 0.01, 6, 20), P.paint));
  }
  // centre strip between the doors
  out.push(part(rb(0.03, 0.018, 1.1, 0.004), P.paint, { p: [0, y + 0.009, (z0 + z1) / 2] }));
  // side air-inlet louvres alongside the doors
  for (const sx of [-1, 1]) {
    const lv = louvre(P, 0.26, 1.08, 14, true);
    lv.position.set(sx * 0.83, y, (z0 + z1) / 2);
    out.push(lv);
  }
  // rear radiator outlet louvre across the deck
  const rz0 = z1 - 0.14, rz1 = zRr + 0.07;
  const rl = louvre(P, 1.78, rz0 - rz1, 9, true, 30);
  rl.position.set(0, y, (rz0 + rz1) / 2);
  out.push(rl);
  // lifting eyes at the deck corners and ahead of the doors
  for (const sx of [-1, 1]) {
    for (const z of [zRr + 0.04, zDeck - 0.02]) {
      out.push(part(G.torus(0.032, 0.011, 8, 16), P.cast, { p: [sx * 0.97, y + 0.036, z], r: [0, 90, 0] }));
      out.push(part(rb(0.028, 0.02, 0.09, 0.006), P.cast, { p: [sx * 0.97, y + 0.01, z] }));
    }
  }
  return out;
}

/* ---------------------------------------- rear ----------------------------------------------- */

/** Armoured outlet cowl on the rear plate: hood with downward louvres; origin at plate top centre. */
function outletCowl(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const w = 1.56, h = 0.3, d = 0.15;
  // top plate and cheek plates
  ps.push(part(rb(w + 0.06, 0.02, d + 0.01, 0.005), P.paint, { p: [0, -0.012, -d / 2] }));
  for (const sx of [-1, 1]) ps.push(part(G.plate([[0, 0], [-d, 0], [-d, -0.1], [-0.02, -h]], 0.02, 'zy', 0.004), P.paint, { p: [sx * (w / 2 + 0.02), 0, 0] }));
  // louvre slats facing down / rearwards
  const sg: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const s = G.box(w, 0.008, 0.07);
    s.rotateX((-50 * Math.PI) / 180);
    const t = i / 6;
    s.translate(0, -0.05 - t * (h - 0.08), -d + 0.03 + t * (d - 0.06));
    sg.push(s);
  }
  ps.push(part(merge(sg), P.paint));
  ps.push(part(G.box(w, h - 0.03, 0.004), P.void, { p: [0, -h / 2, -0.012] }));
  // bottom flap (fording cover) hinge
  ps.push(part(G.cyl(0.014, 0.014, w, 10), P.paint, { p: [0, -h + 0.005, -0.03], r: [0, 0, 90] }));
  return group(ps);
}

function exhaust(P: Pal): THREE.Object3D {
  // leaves the rear plate (origin) going rearwards (-Z), turning down; with a mounting flange
  const ps: THREE.Object3D[] = [];
  ps.push(part(latheZ([[0.0, 0.0], [0.085, 0.0], [0.085, -0.016], [0.075, -0.026], [0.0, -0.026]], 22, 40), P.paint));
  const path: G.V3[] = [[0, 0, -0.01], [0, 0, -0.06], [0, -0.025, -0.1], [0, -0.08, -0.12], [0, -0.17, -0.125]];
  ps.push(part(G.tube(path, 0.05, 16, 32), P.exhaust));
  ps.push(part(G.cyl(0.056, 0.056, 0.03, 18), P.exhaust, { p: [0, -0.17, -0.125] }));
  ps.push(part(G.cyl(0.044, 0.044, 0.004, 16), P.void, { p: [0, -0.187, -0.125] }));
  return group(ps);
}

function tailLamp(P: Pal): THREE.Object3D {
  return group([
    part(rb(0.1, 0.08, 0.06, 0.01), P.black, { p: [0, 0, -0.03] }),
    part(G.box(0.07, 0.03, 0.004), P.glass, { p: [0, 0.008, -0.061] }),
    part(rb(0.11, 0.012, 0.07, 0.003), P.black, { p: [0, 0.046, -0.035] }),
  ]);
}

function rearDetails(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const z = zRr;
  const cowl = outletCowl(P);
  cowl.position.set(0, yR - 0.004, z);
  out.push(cowl);
  for (const sx of [-1, 1]) {
    const ex = exhaust(P);
    ex.position.set(sx * 0.46, 1.1, z);
    out.push(ex);
    const tl = tailLamp(P);
    tl.position.set(sx * 0.84, 1.1, z);
    out.push(tl);
    // towing eyes low on the rear plate (shackle hanging down)
    out.push(onPlate(towEye(P), [sx * 0.74, 0.8, z], [1, 0, 0], [0, 0, -1]));
  }
  // transmission access plate with its bolt ring and two lifting handles
  out.push(part(G.plate([[-0.34, 0.8], [0.34, 0.8], [0.34, 1.04], [-0.34, 1.04]], 0.022, 'xy', 0.005, 0.03), P.paint, { p: [0, 0, z - 0.011] }));
  const bl: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  bl.push(...row([-0.31, 0.822, z - 0.022], [0.31, 0.822, z - 0.022], [0, 0, -1], 7));
  bl.push(...row([-0.31, 1.018, z - 0.022], [0.31, 1.018, z - 0.022], [0, 0, -1], 7));
  out.push(part(G.scatter(G.boltHead(0.022, 0.009), bl), P.paint));
  for (const sx of [-1, 1]) out.push(part(G.tube([[sx * 0.2, 0.87, z - 0.02], [sx * 0.2, 0.89, z - 0.06], [sx * 0.2, 0.95, z - 0.06], [sx * 0.2, 0.97, z - 0.02]], 0.009, 6, 16), P.paint));
  // towing pintle on the lower rear plate
  const pin = group([
    part(rb(0.18, 0.14, 0.03, 0.01), P.cast, { p: [0, 0, -0.015] }),
    part(G.lathe([[0.0, 0.0], [0.045, 0.0], [0.045, 0.1], [0.06, 0.11], [0.06, 0.13], [0.0, 0.13]], 16, 40).rotateX(-Math.PI / 2), P.cast, { p: [0, -0.02, -0.02] }),
    part(G.torus(0.05, 0.014, 8, 18, Math.PI * 1.3), P.cast, { p: [0, 0.03, -0.09], r: [90, 0, 0] }),
  ]);
  pin.position.set(0, 0.72, z);
  out.push(pin);
  return out;
}

/* ------------------------------------------------------------------------------------------ */

function belly(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = yB;
  out.push(part(G.plate([[-0.25, -0.22], [0.25, -0.22], [0.25, 0.22], [-0.25, 0.22]], 0.02, 'xz', 0.005, 0.05), P.paint, { p: [0.45, y - 0.01, 1.6] }));
  const b: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) b.push({ p: new THREE.Vector3(0.45 - 0.2 + i * 0.08, y - 0.02, 1.6 + sz * 0.19), n: new THREE.Vector3(0, -1, 0), spin: i });
  out.push(part(G.scatter(G.boltHead(0.024, 0.01), b), P.paint));
  const plugs: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (const [x, z] of [[0.3, 0.5], [-0.3, -0.4], [0.0, -1.2], [0.45, -1.8], [-0.45, -1.8], [0.0, -2.3]] as [number, number][]) plugs.push({ p: new THREE.Vector3(x, y - 0.002, z), n: new THREE.Vector3(0, -1, 0), spin: x });
  out.push(part(G.scatter(G.lathe([[0.0, 0.0], [0.06, 0.0], [0.06, 0.012], [0.035, 0.022], [0.035, 0.04], [0.0, 0.04]], 16, 40), plugs), P.paint));
  for (const z of [-0.9, -1.9]) out.push(part(G.plate([[-0.32, -0.26], [0.32, -0.26], [0.32, 0.26], [-0.32, 0.26]], 0.014, 'xz', 0.004, 0.05), P.paint, { p: [0, y - 0.007, z] }));
  return out;
}

export function hull(P: Pal): THREE.Group {
  const out: THREE.Object3D[] = [...armour(P), ...frontFittings(P), ...engineDeck(P), ...rearDetails(P), ...belly(P)];
  return group(out, { name: 'hull' });
}

