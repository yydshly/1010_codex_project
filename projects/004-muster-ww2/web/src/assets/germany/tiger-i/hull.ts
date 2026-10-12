/**
 * Hull of the Tiger I: welded box of plates with real thickness - 100 mm nose and driver's front
 * plate, 60 mm glacis and lower hull sides with the tow-eye extensions front and rear, 80 mm
 * superstructure sides and rear, 25 mm roof, belly and sponson floors - with weld seams, the
 * driver's visor and the Kugelblende ball mount with its MG 34, the two front roof hatches, the
 * engine deck (engine hatch, two radiator air-inlet grilles, two fan grilles, filler caps), the
 * rear plate with the guarded exhaust mufflers, inertia starter port and tow coupling, and the
 * front, side and rear track guards.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Palette } from './materials';
import { H, W, P } from './dims';
import { cbox, rb, nut, latheZ, scatterN, merge, circlePts, bead, sect, nrm, zAt, prismX, slabZY, arcPts, type V2 } from './util';

const INSIDE: V2 = [0, 0.9];

/** Outer face of the rear plate: z at height y. */
export const rearZ = (y: number) => zAt(P.rearBottom, P.rearTop, y);
/** Outer face of the driver's front plate: z at height y. */
export const frontZ = (y: number) => zAt(P.glacisTop, P.frontTop, y);
/** Lean of the front plate (deg, top tilted back) and of the rear plate (deg, top tilted forward). */
export const FRONT_LEAN = (Math.atan2(P.glacisTop[0] - P.frontTop[0], P.frontTop[1] - P.glacisTop[1]) * 180) / Math.PI;
export const REAR_LEAN = (Math.atan2(P.rearTop[0] - P.rearBottom[0], P.rearTop[1] - P.rearBottom[1]) * 180) / Math.PI;

/** Tow-eye centres on the side extensions. */
export const EYE_F: V2 = [3.03, 0.84];
export const EYE_R: V2 = [-2.97, 0.79];

// ------------------------------------------------------------------ plates
function plates(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const paint = pal.paint;
  const xl = W.lower, xu = W.upper;
  const tS = 0.06, tU = 0.08;
  const xi = xl - tS; // inner face of the lower side plates

  // lower hull side plates with the tow-eye extensions
  const yTop = H.sponson;
  const side: V2[] = [
    P.bellyRear,
    P.bellyFront,
    [2.95, 0.665],
    ...arcPts(EYE_F, 0.128, -100, 100, 14),
    P.noseTop,
    P.glacisTop,
    [rearZ(yTop), yTop],
    [rearZ(0.92), 0.92],
    ...arcPts(EYE_R, 0.118, 80, 280, 14),
    [-2.86, 0.64],
  ];
  const sideG = slabZY(side, [circlePts(0.056, 18, EYE_F[0], EYE_F[1]), circlePts(0.052, 18, EYE_R[0], EYE_R[1])], tS, 0.006);
  out.push(mirrorX(part(sideG, paint, { p: [xl - tS / 2, 0, 0] })));

  // belly, lower front plate, nose, glacis, lower rear plate
  out.push(part(prismX(sect(P.bellyRear, P.bellyFront, 0.025, [0, 1]), -xi, xi), paint));
  out.push(part(prismX(sect(P.bellyFront, P.noseBottom, 0.06, nrm(P.bellyFront, P.noseBottom, INSIDE)), -xi, xi, 0.005), paint));
  const noseN = nrm(P.noseBottom, P.noseTop, INSIDE);
  out.push(part(prismX(sect(P.noseBottom, P.noseTop, 0.1, noseN), -xi, xi, 0.008), paint));
  const glacisN = nrm(P.noseTop, P.glacisTop, INSIDE);
  out.push(part(prismX(sect(P.noseTop, P.glacisTop, 0.06, glacisN), -xi, xi, 0.006), paint));
  out.push(part(prismX(sect(P.bellyRear, P.rearBottom, 0.04, nrm(P.bellyRear, P.rearBottom, INSIDE)), -xi, xi), paint));

  // driver's front plate across the full superstructure width
  const drvN = nrm(P.glacisTop, P.frontTop, [0, 1.5]);
  out.push(part(prismX(sect(P.glacisTop, P.frontTop, 0.1, drvN), -(xu - tU), xu - tU, 0.008), paint));
  // rear plate: lower part between the hull sides, upper part across the sponsons
  const rearN = nrm(P.rearBottom, P.rearTop, [0, 1.5]);
  const rMid: V2 = [rearZ(yTop), yTop];
  out.push(part(prismX(sect(P.rearBottom, rMid, 0.08, rearN), -xi, xi, 0.006), paint));
  out.push(part(prismX(sect(rMid, P.rearTop, 0.08, rearN), -(xu - tU), xu - tU, 0.008), paint));

  // superstructure side plates between the front and rear plates
  const fb0: V2 = [P.glacisTop[0] + drvN[0] * 0.1, P.glacisTop[1] + drvN[1] * 0.1];
  const fb1: V2 = [P.frontTop[0] + drvN[0] * 0.1, P.frontTop[1] + drvN[1] * 0.1];
  const rb0: V2 = [rMid[0] + rearN[0] * 0.08, rMid[1]];
  const rb1: V2 = [P.rearTop[0] + rearN[0] * 0.08, P.rearTop[1]];
  const roofT = 0.025;
  const supSide: V2[] = [
    [rb0[0], yTop],
    [zAt(fb0, fb1, yTop), yTop],
    [zAt(fb0, fb1, H.roof - roofT), H.roof - roofT],
    [zAt(rb0, rb1, H.roof - roofT), H.roof - roofT],
  ];
  out.push(mirrorX(part(prismX(supSide, xu - tU, xu, 0.006), paint)));
  // sponson floors (25 mm) over the tracks
  const spZ0 = zAt(fb0, fb1, yTop) - 0.002, spZ1 = rb0[0] + 0.002;
  out.push(mirrorX(part(rb(xu - tU - xl, 0.025, spZ0 - spZ1, 0.004), paint, { p: [(xl + xu - tU) / 2, yTop + 0.0125, (spZ0 + spZ1) / 2] })));
  // roof: front plate, fighting compartment plate, engine deck (separate plates, visible seams)
  const rz0 = zAt(fb0, fb1, H.roof) - 0.002, rz3 = zAt(rb0, rb1, H.roof) + 0.002;
  const roofPlate = (z0: number, z1: number) => part(rb(2 * xu, roofT, z0 - z1 - 0.004, 0.004), paint, { p: [0, H.roof - roofT / 2, (z0 + z1) / 2] });
  out.push(roofPlate(rz0, 1.42), roofPlate(1.42, -0.84), roofPlate(-0.84, rz3));

  // interlocked plate ends: the superstructure sides stand proud of the front and rear plates
  for (const s of [1, -1]) {
    const xc = s * (xu - tU / 2);
    const fOut: V2[] = [
      [zAt(fb0, fb1, yTop), yTop],
      [zAt(P.glacisTop, P.frontTop, yTop) + 0.03, yTop],
      [zAt(P.glacisTop, P.frontTop, H.roof) + 0.03, H.roof],
      [zAt(fb0, fb1, H.roof), H.roof],
    ];
    out.push(part(prismX(fOut, xc - tU / 2, xc + tU / 2, 0.006), paint));
    const rOut: V2[] = [
      [rearZ(yTop) - 0.03, yTop],
      [zAt(rb0, rb1, yTop), yTop],
      [zAt(rb0, rb1, H.roof), H.roof],
      [P.rearTop[0] - 0.03, H.roof],
    ];
    out.push(part(prismX(rOut, xc - tU / 2, xc + tU / 2, 0.006), paint));
  }

  // ------------------------------------------------------------------ welds
  const beads: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    // superstructure side to front plate and rear plate (outer vertical corners)
    beads.push(bead([[s * (xu - tU - 0.004), yTop + 0.02, frontZ(yTop + 0.02) + 0.003], [s * (xu - tU - 0.004), H.roof - 0.02, frontZ(H.roof - 0.02) + 0.003]]));
    beads.push(bead([[s * (xu - tU - 0.004), yTop + 0.02, rearZ(yTop + 0.02) - 0.003], [s * (xu - tU - 0.004), H.roof - 0.02, rearZ(H.roof - 0.02) - 0.003]]));
    // side to roof
    beads.push(bead([[s * (xu - 0.002), H.roof + 0.001, rz0 - 0.03], [s * (xu - 0.002), H.roof + 0.001, rz3 + 0.03]], 0.0055));
    // side to sponson floor (underside)
    beads.push(bead([[s * (xu - tU - 0.004), yTop - 0.001, spZ0 - 0.03], [s * (xu - tU - 0.004), yTop - 0.001, spZ1 + 0.03]], 0.005));
    // lower hull side to sponson floor
    beads.push(bead([[s * (xl + 0.004), yTop - 0.002, spZ0 - 0.03], [s * (xl + 0.004), yTop - 0.002, spZ1 + 0.03]], 0.0055));
    // nose / glacis edges against the side plates
    beads.push(bead([[s * (xi - 0.002), P.noseBottom[1] + 0.02, P.noseBottom[0] + 0.004], [s * (xi - 0.002), P.noseTop[1] - 0.01, P.noseTop[0] + 0.004]]));
  }
  // nose to glacis, glacis to front plate, front plate to roof (across)
  beads.push(bead([[-xi, P.noseTop[1] + 0.004, P.noseTop[0] - 0.006], [xi, P.noseTop[1] + 0.004, P.noseTop[0] - 0.006]]));
  beads.push(bead([[-xi, P.glacisTop[1] + 0.006, P.glacisTop[0] + 0.004], [xi, P.glacisTop[1] + 0.006, P.glacisTop[0] + 0.004]]));
  beads.push(bead([[-xu + 0.02, H.roof + 0.002, rz0 - 0.004], [xu - 0.02, H.roof + 0.002, rz0 - 0.004]], 0.0055));
  beads.push(bead([[-xu + 0.02, H.roof + 0.002, rz3 + 0.004], [xu - 0.02, H.roof + 0.002, rz3 + 0.004]], 0.0055));
  out.push(part(merge(beads), paint));
  return out;
}

// ------------------------------------------------------------------ front plate fittings
function frontFittings(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const lean = FRONT_LEAN;
  const on = (x: number, y: number, h = 0): THREE.Vector3 => {
    const z = frontZ(y);
    const a = (lean * Math.PI) / 180;
    return new THREE.Vector3(x, y + Math.sin(a) * h, z + Math.cos(a) * h);
  };
  // driver's visor (Fahrersehklappe) on the left: armoured block with slit and rain guard
  out.push(
    group(
      [
        part(rb(0.4, 0.22, 0.03, 0.01), pal.paint, { p: [0, 0, 0.015] }),
        part(rb(0.3, 0.13, 0.07, 0.022), pal.cast, { p: [0, -0.005, 0.045] }),
        part(cbox(0.2, 0.014, 0.012, 0.002), pal.dark, { p: [0, 0.012, 0.078] }),
        part(cbox(0.19, 0.006, 0.004, 0.001), pal.glass, { p: [0, 0.012, 0.074] }),
        part(G.cyl(0.02, 0.02, 0.36, 12), pal.cast, { p: [0, 0.075, 0.035], r: [0, 0, 90] }),
        part(scatterN(nut(0.022, 0.009), [[-0.17, -0.08, 0.03], [0.17, -0.08, 0.03], [-0.17, 0.08, 0.03], [0.17, 0.08, 0.03]], [0, 0, 1]), pal.paint),
      ],
      { p: on(0.52, 1.555), r: [-lean, 0, 0] },
    ),
  );
  // Kugelblende 100 with MG 34 on the right
  out.push(
    group(
      [
        part(latheZ([[0.19, 0.0], [0.19, 0.025], [0.175, 0.045], [0.14, 0.055], [0.13, 0.065]], 40, 40), pal.cast),
        part(new THREE.SphereGeometry(0.12, 30, 16, 0, Math.PI * 2, 0, Math.PI / 2), pal.cast, { p: [0, 0, 0.035], r: [90, 0, 0] }),
        part(G.cyl(0.036, 0.042, 0.06, 18), pal.cast, { p: [0, 0, 0.17], r: [90, 0, 0] }),
        part(G.cyl(0.021, 0.021, 0.22, 14), pal.gun, { p: [0, 0, 0.3], r: [90, 0, 0] }),
        part(
          G.scatter(
            G.cyl(0.0052, 0.0052, 0.004, 6),
            [0.23, 0.27, 0.31, 0.35].flatMap((z) => [
              { p: [0.0195, 0, z] as G.V3, n: [1, 0, 0] as G.V3 },
              { p: [-0.0195, 0, z] as G.V3, n: [-1, 0, 0] as G.V3 },
              { p: [0, 0.0195, z] as G.V3, n: [0, 1, 0] as G.V3 },
            ]),
          ),
          pal.dark,
        ),
        part(G.cyl(0.01, 0.013, 0.045, 12), pal.gun, { p: [0, 0, 0.43], r: [90, 0, 0] }),
        part(G.cyl(0.0055, 0.0055, 0.004, 8), pal.dark, { p: [0, 0, 0.452], r: [90, 0, 0] }),
      ],
      { p: on(-0.55, 1.53), r: [-lean, 0, 0] },
    ),
  );
  // bolts along the top edge of the front plate
  const tb: G.V3[] = [];
  for (let i = 0; i < 11; i++) tb.push([-1.4 + i * 0.28, H.roof, P.frontTop[0] - 0.05]);
  out.push(part(scatterN(nut(0.022, 0.008), tb, [0, 1, 0]), pal.paint));
  return out;
}

// ------------------------------------------------------------------ roof: hatches, ventilator
function hullHatch(pal: Palette, hinge: 1 | -1): THREE.Group {
  const k: THREE.Object3D[] = [];
  // ring frame welded to the roof, domed lid, hinge housing and periscope
  k.push(part(G.lathe([[0.3, 0], [0.3, 0.018], [0.285, 0.024], [0.27, 0.024], [0.27, 0.01]], 44, 35), pal.paint));
  k.push(part(G.lathe([[0.0, 0.058], [0.13, 0.056], [0.22, 0.048], [0.262, 0.036], [0.268, 0.024], [0.262, 0.016], [0.0, 0.016]], 44, 30), pal.cast));
  k.push(part(rb(0.12, 0.07, 0.16, 0.015), pal.cast, { p: [hinge * 0.3, 0.04, 0] }));
  k.push(part(G.cyl(0.03, 0.03, 0.2, 16), pal.cast, { p: [hinge * 0.33, 0.05, 0], r: [90, 0, 0] }));
  k.push(part(rb(0.1, 0.03, 0.08, 0.006), pal.paint, { p: [hinge * 0.22, 0.062, 0] }));
  // periscope head in the lid front with armoured hood and glass
  k.push(part(rb(0.16, 0.07, 0.1, 0.012), pal.cast, { p: [-hinge * 0.02, 0.085, 0.12] }));
  k.push(part(rb(0.18, 0.012, 0.13, 0.004), pal.cast, { p: [-hinge * 0.02, 0.124, 0.125] }));
  k.push(part(cbox(0.12, 0.034, 0.006, 0.001), pal.glass, { p: [-hinge * 0.02, 0.09, 0.172] }));
  k.push(part(cbox(0.13, 0.044, 0.004, 0.001), pal.dark, { p: [-hinge * 0.02, 0.09, 0.168] }));
  // grab handle
  k.push(part(G.tube([[-hinge * 0.15, 0.05, -0.1], [-hinge * 0.19, 0.08, -0.05], [-hinge * 0.19, 0.08, 0.02], [-hinge * 0.15, 0.05, 0.06]], 0.008, 8, 16), pal.paint));
  return group(k);
}

function roofFittings(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.roof;
  out.push(group([hullHatch(pal, 1)], { p: [0.66, y, 1.95] }));
  out.push(group([hullHatch(pal, -1)], { p: [-0.66, y, 1.95] }));
  // hull ventilator between the hatches
  out.push(part(G.cyl(0.1, 0.105, 0.014, 28), pal.paint, { p: [0, y + 0.007, 2.18] }));
  out.push(part(G.cyl(0.065, 0.065, 0.045, 24), pal.paint, { p: [0, y + 0.035, 2.18] }));
  out.push(part(G.lathe([[0, 0], [0.12, 0], [0.126, 0.008], [0.118, 0.022], [0.08, 0.032], [0, 0.036]], 32, 35), pal.cast, { p: [0, y + 0.057, 2.18] }));
  // turret race: dark gap ring under the turret
  out.push(part(G.cyl(1.07, 1.07, 0.012, 72, true), pal.dark, { p: [0, y + 0.006, 0.3] }));
  // lifting eyes on the roof corners
  for (const [lx, lz] of [[1.35, 2.2], [-1.35, 2.2], [1.4, -2.5], [-1.4, -2.5]] as V2[]) {
    out.push(part(rb(0.1, 0.014, 0.05, 0.004), pal.paint, { p: [lx, y + 0.007, lz] }));
    out.push(part(G.torus(0.04, 0.013, 8, 16, Math.PI), pal.paint, { p: [lx, y + 0.01, lz], r: [0, 90, 0] }));
  }
  return out;
}

// ------------------------------------------------------------------ engine deck
function grille(pal: Palette, w: number, l: number, fans: boolean): THREE.Group {
  const k: THREE.Object3D[] = [];
  const fr = 0.05; // frame width
  // heavy armoured frame around the opening
  k.push(part(rb(w, 0.03, fr, 0.006), pal.paint, { p: [0, 0.015, l / 2 - fr / 2] }));
  k.push(part(rb(w, 0.03, fr, 0.006), pal.paint, { p: [0, 0.015, -l / 2 + fr / 2] }));
  k.push(part(rb(fr, 0.03, l - 2 * fr, 0.006), pal.paint, { p: [w / 2 - fr / 2, 0.015, 0] }));
  k.push(part(rb(fr, 0.03, l - 2 * fr, 0.006), pal.paint, { p: [-w / 2 + fr / 2, 0.015, 0] }));
  // dark duct void below
  k.push(part(cbox(w - 2 * fr, 0.004, l - 2 * fr, 0.001), pal.dark, { p: [0, -0.02, 0] }));
  if (fans) {
    for (const s of [1, -1]) {
      const fx = s * (w / 4 - 0.005);
      k.push(part(G.cyl(Math.min(w / 4 - 0.02, l / 2 - fr - 0.01), Math.min(w / 4 - 0.02, l / 2 - fr - 0.01), 0.02, 36, true), pal.black, { p: [fx, -0.008, 0] }));
      k.push(part(G.cyl(0.05, 0.05, 0.02, 20), pal.gun, { p: [fx, -0.006, 0] }));
      for (let b = 0; b < 8; b++) {
        const a = (b / 8) * 180;
        k.push(part(cbox(0.012, 0.004, 0.16, 0.001), pal.gun, { p: [fx, -0.009, 0], r: [0, a, 12] }));
      }
    }
  }
  // armoured slats running fore and aft, tilted like louvres
  const n = Math.round((w - 2 * fr) / 0.055);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + fr + ((i + 0.5) * (w - 2 * fr)) / n;
    k.push(part(cbox(0.014, 0.04, l - 2 * fr + 0.01, 0.002), pal.paint, { p: [x, 0.01, 0], r: [0, 0, 22] }));
  }
  // cross bar and hinge / latch lugs
  k.push(part(rb(w - 2 * fr, 0.018, 0.03, 0.004), pal.paint, { p: [0, 0.022, 0] }));
  for (const s of [1, -1]) k.push(part(G.cyl(0.018, 0.018, 0.1, 12), pal.paint, { p: [s * (w / 2 - 0.15), 0.03, l / 2 + 0.01], r: [0, 0, 90] }));
  k.push(part(rb(0.06, 0.03, 0.05, 0.006), pal.paint, { p: [0, 0.03, -l / 2 + 0.01] }));
  return group(k);
}

function engineDeck(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.roof;
  // radiator air inlet grilles (forward) and fan grilles (aft), both sides
  for (const s of [1, -1]) {
    out.push(group([grille(pal, 0.8, 0.66, false)], { p: [s * 1.02, y, -1.3] }));
    out.push(group([grille(pal, 0.8, 0.7, true)], { p: [s * 1.02, y, -2.15] }));
  }
  // engine access hatch with its ventilation cover, hinges and lifting handles
  const hz = -1.76;
  out.push(part(rb(0.92, 0.028, 1.02, 0.01), pal.paint, { p: [0, y + 0.014, hz] }));
  out.push(part(rb(0.84, 0.01, 0.94, 0.004), pal.paint, { p: [0, y + 0.031, hz] }));
  out.push(part(G.cyl(0.13, 0.14, 0.03, 32), pal.paint, { p: [0, y + 0.05, hz - 0.1] }));
  out.push(part(G.lathe([[0, 0], [0.17, 0], [0.176, 0.01], [0.17, 0.024], [0.12, 0.034], [0, 0.038]], 36, 35), pal.cast, { p: [0, y + 0.065, hz - 0.1] }));
  for (const x of [-0.3, 0.3]) out.push(part(G.cyl(0.022, 0.022, 0.14, 14), pal.paint, { p: [x, y + 0.04, hz + 0.52], r: [0, 0, 90] }));
  for (const x of [-0.34, 0.34]) out.push(part(G.tube([[x - 0.05, y + 0.034, hz - 0.4], [x - 0.035, y + 0.07, hz - 0.4], [x + 0.035, y + 0.07, hz - 0.4], [x + 0.05, y + 0.034, hz - 0.4]], 0.009, 8, 16), pal.paint));
  const hb: G.V3[] = [];
  for (let i = 0; i < 6; i++) hb.push([-0.42 + i * 0.168, y + 0.028, hz + 0.49], [-0.42 + i * 0.168, y + 0.028, hz - 0.49]);
  out.push(part(scatterN(nut(0.02, 0.008), hb, [0, 1, 0]), pal.paint));
  // fuel filler caps ahead of the engine hatch
  for (const s of [1, -1]) {
    out.push(part(G.cyl(0.075, 0.08, 0.018, 24), pal.paint, { p: [s * 0.36, y + 0.009, -1.1] }));
    out.push(part(G.cyl(0.055, 0.055, 0.024, 24), pal.cast, { p: [s * 0.36, y + 0.03, -1.1] }));
    out.push(part(rb(0.07, 0.014, 0.02, 0.004), pal.cast, { p: [s * 0.36, y + 0.048, -1.1] }));
  }
  return out;
}

// ------------------------------------------------------------------ rear plate
function rearFittings(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const lean = REAR_LEAN;
  // two vertical exhaust mufflers with sheet-metal guards
  for (const s of [1, -1]) {
    const x = s * 0.4, y0 = 1.13, y1 = 1.64, r = 0.11;
    const zc = rearZ((y0 + y1) / 2) - r - 0.05;
    out.push(part(G.lathe([[0, 0], [0.09, 0], [r, 0.02], [r, y1 - y0 - 0.02], [0.09, y1 - y0], [0, y1 - y0]], 32, 30), pal.exhaust, { p: [x, y0, zc] }));
    // inlet elbow from the plate, tail pipe up through the guard top
    out.push(part(G.tube([[x, y0 + 0.08, rearZ(y0 + 0.08) + 0.01], [x, y0 + 0.07, zc + 0.04], [x, y0 + 0.02, zc + 0.02]], 0.05, 12, 12), pal.exhaust));
    out.push(part(G.cyl(0.042, 0.042, 0.2, 16), pal.exhaust, { p: [x, y1 + 0.08, zc - 0.02] }));
    out.push(part(G.cyl(0.034, 0.034, 0.01, 16), pal.dark, { p: [x, y1 + 0.176, zc - 0.02] }));
    // guard: curved shroud open towards the plate, top cover, mounting straps
    const gr = r + 0.045;
    const ph0 = Math.PI - 1.75, phL = 3.5;
    const shroud = G.lathe([[gr, 0], [gr + 0.004, 0], [gr + 0.004, y1 - y0 + 0.08], [gr, y1 - y0 + 0.08], [gr, 0]], 32, 60, ph0, phL);
    out.push(part(shroud, pal.sheet, { p: [x, y0 - 0.02, zc] }));
    const cap = G.lathe([[0.05, 0], [gr + 0.006, 0], [gr + 0.006, 0.006], [0.05, 0.006], [0.05, 0]], 32, 40);
    out.push(part(cap, pal.sheet, { p: [x, y1 + 0.06, zc] }));
    for (const yy of [y0 + 0.08, y1 - 0.04]) {
      out.push(part(G.lathe([[gr + 0.004, 0], [gr + 0.011, 0], [gr + 0.011, 0.03], [gr + 0.004, 0.03], [gr + 0.004, 0]], 32, 60, ph0 - 0.05, phL + 0.1), pal.sheet, { p: [x, yy - 0.015, zc] }));
      for (const sx of [1, -1]) out.push(part(rb(0.02, 0.05, rearZ(yy) - zc - 0.02, 0.004), pal.sheet, { p: [x + sx * (gr - 0.01), yy, (rearZ(yy) + zc) / 2] }));
    }
  }
  // inertia starter port with its cover, below and between the exhausts
  out.push(group([part(G.cyl(0.085, 0.085, 0.022, 28), pal.paint, { r: [90, 0, 0] }), part(G.cyl(0.03, 0.03, 0.03, 14), pal.paint, { p: [0, 0, -0.02], r: [90, 0, 0] }), part(rb(0.05, 0.02, 0.02, 0.005), pal.paint, { p: [0, 0.07, -0.015] })], { p: [0, 1.02, rearZ(1.02) - 0.011], r: [lean, 0, 0] }));
  // tow coupling (jaw) at the bottom centre
  const jz = rearZ(0.78) - 0.02;
  out.push(part(rb(0.3, 0.2, 0.04, 0.012), pal.paint, { p: [0, 0.78, jz] }));
  for (const s of [1, -1]) out.push(part(rb(0.035, 0.15, 0.16, 0.01), pal.paint, { p: [s * 0.055, 0.77, jz - 0.09] }));
  out.push(part(G.cyl(0.018, 0.018, 0.2, 12), pal.gun, { p: [0, 0.77, jz - 0.13], r: [0, 0, 90] }));
  out.push(part(G.cyl(0.022, 0.022, 0.025, 12), pal.gun, { p: [0, 0.86, jz - 0.13] }));
  // track tensioner adjusters at the rear corners
  for (const s of [1, -1]) {
    out.push(part(G.cyl(0.055, 0.055, 0.1, 18), pal.cast, { p: [s * 0.74, 0.8, rearZ(0.8) - 0.04], r: [90, 0, 0] }));
    out.push(part(nut(0.06, 0.035), pal.gun, { p: [s * 0.74, 0.8, rearZ(0.8) - 0.09], r: [-90, 0, 0] }));
  }
  // bolts along the rear plate top edge (engine deck cover)
  const rbolts: G.V3[] = [];
  for (let i = 0; i < 12; i++) rbolts.push([-1.43 + i * 0.26, H.roof, P.rearTop[0] + 0.05]);
  out.push(part(scatterN(nut(0.022, 0.008), rbolts, [0, 1, 0]), pal.paint));
  return out;
}

// ------------------------------------------------------------------ track guards
function guards(pal: Palette): THREE.Object3D[] {
  const left: THREE.Object3D[] = [];
  const t = 0.005, y = H.sponson;
  const x0 = W.upper, x1 = W.guard;
  const zf = frontZ(y) - 0.004, zr = rearZ(y) + 0.004;
  // straight side guard with triangular ends, bolted to the sponson edge
  const sideOut: V2[] = [
    [x0, zr + 0.2],
    [x0 + 0.02, zr + 0.2],
    [x1, zr + 0.42],
    [x1, zf - 0.42],
    [x0 + 0.02, zf - 0.2],
    [x0, zf - 0.2],
  ];
  left.push(part(G.plate(sideOut, t, 'xz', 0.0015), pal.sheet, { p: [0, y - t / 2, 0] }));
  left.push(part(G.box(0.004, 0.035, zf - zr - 0.84), pal.sheet, { p: [x1 - 0.002, y - 0.0175, (zf + zr) / 2] }));
  left.push(part(G.box(0.03, 0.012, zf - zr - 0.4), pal.sheet, { p: [x0 + 0.015, y - 0.011, (zf + zr) / 2] }));
  const gb: G.V3[] = [];
  for (let z = zr + 0.3; z < zf - 0.25; z += 0.32) gb.push([x0 + 0.03, y, z]);
  left.push(part(scatterN(nut(0.018, 0.006), gb, [0, 1, 0]), pal.sheet));
  // front guard: fixed section from the front plate and hinged flap over the sprocket
  const gx0 = 0.99, gw = x1 - gx0;
  const fixL = 0.34, fixA = 11, flapL = 0.26, flapA = 34;
  const fixed = group(
    [
      part(G.box(gw, t, fixL), pal.sheet, { p: [0, -t / 2, fixL / 2] }),
      part(G.box(0.004, 0.035, fixL), pal.sheet, { p: [gw / 2 - 0.002, -0.0175, fixL / 2] }),
      part(G.box(0.004, 0.035, fixL), pal.sheet, { p: [-gw / 2 + 0.002, -0.0175, fixL / 2] }),
    ],
    { p: [gx0 + gw / 2, y, zf - 0.02], r: [fixA, 0, 0] },
  );
  left.push(fixed);
  const a1 = (fixA * Math.PI) / 180;
  const hy = y - Math.sin(a1) * fixL, hz = zf - 0.02 + Math.cos(a1) * fixL;
  left.push(part(G.cyl(0.012, 0.012, gw - 0.08, 12), pal.sheet, { p: [gx0 + gw / 2, hy - 0.004, hz], r: [0, 0, 90] }));
  left.push(
    group(
      [
        part(G.box(gw - 0.01, t, flapL), pal.sheet, { p: [0, -t / 2, flapL / 2] }),
        part(G.box(0.004, 0.035, flapL), pal.sheet, { p: [(gw - 0.01) / 2 - 0.002, -0.0175, flapL / 2] }),
        part(G.box(gw - 0.01, 0.035, 0.004), pal.sheet, { p: [0, -0.0175, flapL - 0.002] }),
        part(G.box(0.004, 0.035, flapL), pal.sheet, { p: [-(gw - 0.01) / 2 + 0.002, -0.0175, flapL / 2] }),
      ],
      { p: [gx0 + gw / 2, hy, hz + 0.004], r: [flapA, 0, 0] },
    ),
  );
  // bracket from the sponson front to the fixed guard
  left.push(part(G.plate([[0, 0], [0.14, 0], [0, -0.1]], 0.01, 'zy', 0.002), pal.sheet, { p: [gx0 + 0.04, y - 0.004, zf - 0.02] }));
  // rear guard: hinged flap behind the rear plate
  const rl = 0.3;
  left.push(part(G.cyl(0.011, 0.011, gw - 0.08, 12), pal.sheet, { p: [gx0 + gw / 2, y - 0.004, zr - 0.012], r: [0, 0, 90] }));
  left.push(
    group(
      [
        part(G.box(gw - 0.01, t, rl), pal.sheet, { p: [0, -t / 2, -rl / 2] }),
        part(G.box(0.004, 0.035, rl), pal.sheet, { p: [(gw - 0.01) / 2 - 0.002, -0.0175, -rl / 2] }),
        part(G.box(0.004, 0.035, rl), pal.sheet, { p: [-(gw - 0.01) / 2 + 0.002, -0.0175, -rl / 2] }),
      ],
      { p: [gx0 + gw / 2, y, zr - 0.016], r: [-24, 0, 0] },
    ),
  );
  return [mirrorX(group(left))];
}

// ------------------------------------------------------------------ belly
function belly(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.belly;
  for (const [z, w, l] of [[1.7, 0.8, 0.5], [0.2, 0.6, 0.6], [-1.6, 0.9, 0.7]] as G.V3[]) {
    out.push(part(rb(w, 0.014, l, 0.004), pal.paint, { p: [0, y - 0.006, z] }));
    const bolts: G.V3[] = [];
    for (let i = 0; i < 6; i++) {
      const t = i / 5 - 0.5;
      bolts.push([t * (w - 0.06), y - 0.013, z + l / 2 - 0.03], [t * (w - 0.06), y - 0.013, z - l / 2 + 0.03]);
    }
    out.push(part(scatterN(nut(0.024, 0.008), bolts, [0, -1, 0]), pal.paint));
  }
  for (const [x, z] of [[0.45, 0.95], [-0.45, 0.95], [0.4, -0.7], [-0.4, -0.7], [0, -2.15]] as V2[]) {
    out.push(part(G.cyl(0.075, 0.08, 0.014, 20), pal.paint, { p: [x, y - 0.006, z] }));
    out.push(part(nut(0.04, 0.012), pal.paint, { p: [x, y - 0.012, z], r: [180, 0, 0] }));
  }
  // torsion bar anchor caps along the belly edges
  const caps: G.V3[] = [];
  for (let i = 0; i < 8; i++) caps.push([0.7, y - 0.004, 1.78 - 0.515 * i + 0.27], [-0.7, y - 0.004, 1.78 - 0.515 * i + 0.27]);
  out.push(part(scatterN(G.cyl(0.05, 0.05, 0.012, 16).translate(0, 0.006, 0), caps, [0, -1, 0]), pal.paint));
  return out;
}

/** Everything that belongs to the hull structure. */
export function hull(pal: Palette): THREE.Group {
  const kids: THREE.Object3D[] = [...plates(pal), ...frontFittings(pal), ...roofFittings(pal), ...engineDeck(pal), ...rearFittings(pal), ...guards(pal), ...belly(pal)];
  return group(kids);
}
