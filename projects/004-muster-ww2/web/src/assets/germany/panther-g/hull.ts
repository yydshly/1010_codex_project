/**
 * Hull of the Panther Ausf. G: welded superstructure with the 80 mm upper glacis at 55 deg, the
 * one-piece 50 mm upper side plates at 29 deg, the 40 mm rear plate at 30 deg and the flat roof;
 * lower hull with the 60 mm lower glacis, 40 mm vertical side plates carrying the tow-eye
 * extensions front and rear, lower rear plate and belly. Weld seams along the plate joints.
 * Fittings: bow MG 34 in the Kugelblende, driver's and radio operator's roof hatches with the
 * driver's rotating periscope (no glacis visor on the Ausf. G), engine deck (central engine
 * hatch, two radiator intake grilles, two round fan grilles, filler caps), rear plate with the
 * twin exhausts in cast guards, stowage bins, tow coupling, and the track guards with the
 * Schuerzen rail. Solid plate bodies stand in for the armour; no interior is modelled.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Palette } from './materials';
import { H, W, NOSE_Z, REAR, BELLY_REAR_Z, TURRET, glacisZ, lowerGlacisZ, rearZ, sideX, GLACIS_DEG, REAR_DEG, SIDE_DEG } from './dims';
import { cbox, rb, nut, latheZ, scatterN, merge, circlePts, bead, slabZY, arcPts, loftY, basisGroup, type V2 } from './util';

const D2R = Math.PI / 180;

/** Tow-eye centres on the lower side plate extensions. */
export const EYE_F: V2 = [3.3, 0.86];
export const EYE_R: V2 = [-3.36, 0.8];

/** Frame on the left upper side plate at (z, y): local x = rearwards, y = up the slope, z = outward. */
export function onSide(kids: THREE.Object3D[], z: number, y: number, dz = 0): THREE.Group {
  const a = SIDE_DEG * D2R;
  const n = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
  const u = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0);
  const xl = new THREE.Vector3(0, 0, -1);
  return basisGroup(kids, new THREE.Vector3(sideX(y) + n.x * dz, y + n.y * dz, z), xl, u, n);
}

/** Frame on the upper glacis at (x, y): local x = +X, y = up the slope, z = outward normal. */
export function onGlacis(kids: THREE.Object3D[], x: number, y: number, dz = 0): THREE.Group {
  const a = GLACIS_DEG * D2R;
  const n = new THREE.Vector3(0, Math.sin(a), Math.cos(a));
  const u = new THREE.Vector3(0, Math.cos(a), -Math.sin(a));
  return basisGroup(kids, new THREE.Vector3(x, y + n.y * dz, glacisZ(y) + n.z * dz), new THREE.Vector3(1, 0, 0), u, n);
}

/** Frame on the rear plate at (x, y): local x = -X, y = up the plate, z = outward (rearwards). */
export function onRear(kids: THREE.Object3D[], x: number, y: number, dz = 0): THREE.Group {
  const a = REAR_DEG * D2R;
  const n = new THREE.Vector3(0, Math.sin(a), -Math.cos(a));
  const u = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
  return basisGroup(kids, new THREE.Vector3(x, y + n.y * dz, rearZ(y) + n.z * dz), new THREE.Vector3(-1, 0, 0), u, n);
}

// ------------------------------------------------------------------ plates
function plates(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const paint = pal.paint;
  const yS = H.sponson, yR = H.roof;
  const xB = W.sideBottom, xT = W.sideTop;
  // superstructure: sponsons over the tracks, glacis, side plates, rear plate and roof
  const upper = loftY([
    { y: yS, ring: [[xB, glacisZ(yS)], [-xB, glacisZ(yS)], [-xB, rearZ(yS)], [xB, rearZ(yS)]] },
    { y: yR, ring: [[xT, glacisZ(yR)], [-xT, glacisZ(yR)], [-xT, rearZ(yR)], [xT, rearZ(yR)]] },
  ]);
  out.push(part(upper, paint));
  // lower hull core between the side plates
  const xc = W.lower - 0.04;
  const ring = (zr: number, zf: number): V2[] => [[xc, zf], [-xc, zf], [-xc, zr], [xc, zr]];
  const lower = loftY([
    { y: H.belly, ring: ring(BELLY_REAR_Z, lowerGlacisZ(H.belly)) },
    { y: REAR.bottomY, ring: ring(REAR.bottomZ, lowerGlacisZ(REAR.bottomY)) },
    { y: yS, ring: ring(rearZ(yS), NOSE_Z) },
    { y: yS + 0.05, ring: ring(rearZ(yS + 0.05) + 0.02, glacisZ(yS + 0.05) - 0.02) },
  ]);
  out.push(part(lower, paint));
  // lower hull side plates (40 mm) with the tow-eye extensions front and rear
  const side: V2[] = [
    [BELLY_REAR_Z, H.belly],
    [lowerGlacisZ(H.belly), H.belly],
    [3.08, 0.64],
    ...arcPts(EYE_F, 0.125, -95, 80, 12),
    [NOSE_Z - 0.01, yS - 0.01],
    [NOSE_Z - 0.03, yS + 0.01],
    [rearZ(yS + 0.01) + 0.02, yS + 0.01],
    [REAR.bottomZ + 0.02, 0.96],
    ...arcPts(EYE_R, 0.11, 85, 265, 12),
    [BELLY_REAR_Z - 0.2, 0.62],
  ];
  const sideG = slabZY(side, [circlePts(0.05, 18, EYE_F[0], EYE_F[1]), circlePts(0.045, 18, EYE_R[0], EYE_R[1])], 0.04, 0.006);
  out.push(mirrorX(part(sideG, paint, { p: [W.lower - 0.02, 0, 0] })));

  // ------------------------------------------------------------------ welds
  const beads: THREE.BufferGeometry[] = [];
  const gz = (y: number) => glacisZ(y);
  for (const s of [1, -1]) {
    // glacis to side plate, side to roof, side to rear plate
    beads.push(bead([[s * (xB - 0.004), yS + 0.01, gz(yS + 0.01) - 0.004], [s * (xT - 0.004), yR - 0.006, gz(yR - 0.006) - 0.004]], 0.007));
    beads.push(bead([[s * (xT - 0.002), yR + 0.001, gz(yR) - 0.03], [s * (xT - 0.002), yR + 0.001, rearZ(yR) + 0.03]], 0.006));
    beads.push(bead([[s * (xB - 0.004), yS + 0.01, rearZ(yS + 0.01) + 0.004], [s * (xT - 0.004), yR - 0.006, rearZ(yR - 0.006) + 0.004]], 0.006));
    // lower side plate to sponson floor
    beads.push(bead([[s * (W.lower + 0.004), yS - 0.003, 3.2], [s * (W.lower + 0.004), yS - 0.003, rearZ(yS) + 0.05]], 0.006));
  }
  // glacis to roof, rear plate to roof, glacis to lower glacis (nose)
  beads.push(bead([[-xT + 0.02, yR + 0.002, gz(yR) - 0.004], [xT - 0.02, yR + 0.002, gz(yR) - 0.004]], 0.006));
  beads.push(bead([[-xT + 0.02, yR + 0.002, rearZ(yR) + 0.004], [xT - 0.02, yR + 0.002, rearZ(yR) + 0.004]], 0.006));
  beads.push(bead([[-W.lower + 0.02, yS - 0.004, NOSE_Z - 0.006], [W.lower - 0.02, yS - 0.004, NOSE_Z - 0.006]], 0.007));
  out.push(part(merge(beads), paint));

  // roof plate seams (engine deck / fighting compartment joint) and the turret race guard
  out.push(part(rb(2 * xT - 0.04, 0.008, 0.04, 0.003), paint, { p: [0, yR + 0.004, -1.2] }));
  out.push(part(G.cyl(0.9, 0.9, 0.014, 72, true), pal.dark, { p: [TURRET.x, yR + 0.007, TURRET.z] }));
  return out;
}

// ------------------------------------------------------------------ glacis: bow MG, periscope
function bowMG(pal: Palette): THREE.Object3D {
  // Kugelblende 80 with the MG 34 (Ausf. G: ball mount, no letterbox flap)
  return onGlacis(
    [
      part(latheZ([[0.18, 0.0], [0.18, 0.022], [0.165, 0.04], [0.135, 0.05], [0.125, 0.06]], 40, 40), pal.cast),
      part(new THREE.SphereGeometry(0.115, 30, 16, 0, Math.PI * 2, 0, Math.PI / 2), pal.cast, { p: [0, 0, 0.03], r: [90, 0, 0] }),
      part(G.cyl(0.034, 0.04, 0.06, 18), pal.cast, { p: [0, 0, 0.16], r: [90, 0, 0] }),
      part(G.cyl(0.02, 0.02, 0.2, 14), pal.gun, { p: [0, 0, 0.28], r: [90, 0, 0] }),
      part(G.cyl(0.01, 0.013, 0.045, 12), pal.gun, { p: [0, 0, 0.4], r: [90, 0, 0] }),
      part(G.cyl(0.0055, 0.0055, 0.004, 8), pal.dark, { p: [0, 0, 0.423], r: [90, 0, 0] }),
      // cast collar / rain lip above the ball
      part(rb(0.3, 0.05, 0.05, 0.014), pal.cast, { p: [0, 0.2, 0.02] }),
    ],
    -0.56,
    1.6,
  );
}

function hatch(pal: Palette, hingeSide: 1 | -1, scope: boolean): THREE.Group {
  const k: THREE.Object3D[] = [];
  // rounded-rectangle lid on a welded frame, hinge on the outer side, grab handle, periscope
  k.push(part(rb(0.56, 0.02, 0.5, 0.02), pal.paint, { p: [0, 0.01, 0] }));
  k.push(part(rb(0.5, 0.035, 0.44, 0.03), pal.cast, { p: [0, 0.035, 0] }));
  k.push(part(G.cyl(0.035, 0.035, 0.26, 16), pal.cast, { p: [hingeSide * 0.29, 0.045, 0], r: [90, 0, 0] }));
  for (const z of [-0.09, 0.09]) k.push(part(rb(0.1, 0.03, 0.05, 0.008), pal.cast, { p: [hingeSide * 0.24, 0.05, z] }));
  k.push(part(G.tube([[-hingeSide * 0.16, 0.052, -0.1], [-hingeSide * 0.2, 0.08, -0.07], [-hingeSide * 0.2, 0.08, 0.03], [-hingeSide * 0.16, 0.052, 0.06]], 0.009, 8, 16), pal.paint));
  if (scope) {
    k.push(part(rb(0.16, 0.06, 0.1, 0.012), pal.cast, { p: [0, 0.08, 0.12] }));
    k.push(part(rb(0.18, 0.012, 0.13, 0.004), pal.cast, { p: [0, 0.114, 0.126] }));
    k.push(part(cbox(0.12, 0.03, 0.006, 0.001), pal.glass, { p: [0, 0.083, 0.172] }));
    k.push(part(cbox(0.13, 0.04, 0.004, 0.001), pal.dark, { p: [0, 0.083, 0.168] }));
  }
  return group(k);
}

function driverPeriscope(pal: Palette): THREE.Object3D[] {
  // rotating periscope ahead of the driver's hatch under its welded rain guard
  const x = 0.62, z = 2.08, y = H.roof;
  return [
    part(G.cyl(0.1, 0.105, 0.02, 28), pal.paint, { p: [x, y + 0.01, z] }),
    part(G.cyl(0.07, 0.075, 0.07, 24), pal.cast, { p: [x, y + 0.055, z] }),
    part(rb(0.13, 0.06, 0.09, 0.01), pal.cast, { p: [x, y + 0.115, z + 0.02] }),
    part(cbox(0.1, 0.03, 0.005, 0.001), pal.glass, { p: [x, y + 0.115, z + 0.067] }),
    part(cbox(0.11, 0.04, 0.004, 0.001), pal.dark, { p: [x, y + 0.115, z + 0.064] }),
    // rain guard: bent strip arching over the head
    part(G.tube([[x - 0.14, y + 0.005, z + 0.1], [x - 0.12, y + 0.17, z + 0.1], [x + 0.12, y + 0.17, z + 0.1], [x + 0.14, y + 0.005, z + 0.1]], 0.012, 8, 20), pal.paint),
  ];
}

function roofFittings(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.roof;
  out.push(group([hatch(pal, 1, false)], { p: [0.62, y, 1.72] }));
  out.push(group([hatch(pal, -1, true)], { p: [-0.62, y, 1.72] }));
  out.push(...driverPeriscope(pal));
  // lifting eyes on the roof front and rear corners
  for (const [lx, lz] of [[0.95, 2.05], [-0.95, 2.05], [0.98, -2.6], [-0.98, -2.6]] as V2[]) {
    out.push(part(rb(0.1, 0.014, 0.05, 0.004), pal.paint, { p: [lx, y + 0.007, lz] }));
    out.push(part(G.torus(0.04, 0.013, 8, 16, Math.PI), pal.paint, { p: [lx, y + 0.01, lz], r: [0, 90, 0] }));
  }
  // bolts along the glacis top edge (roof plate)
  const tb: G.V3[] = [];
  for (let i = 0; i < 9; i++) tb.push([-0.96 + i * 0.24, y, glacisZ(y) - 0.05]);
  out.push(part(scatterN(nut(0.022, 0.008), tb, [0, 1, 0]), pal.paint));
  return out;
}

// ------------------------------------------------------------------ engine deck
function rectGrille(pal: Palette, w: number, l: number): THREE.Group {
  const k: THREE.Object3D[] = [];
  const fr = 0.045;
  k.push(part(rb(w, 0.03, fr, 0.006), pal.paint, { p: [0, 0.015, l / 2 - fr / 2] }));
  k.push(part(rb(w, 0.03, fr, 0.006), pal.paint, { p: [0, 0.015, -l / 2 + fr / 2] }));
  k.push(part(rb(fr, 0.03, l - 2 * fr, 0.006), pal.paint, { p: [w / 2 - fr / 2, 0.015, 0] }));
  k.push(part(rb(fr, 0.03, l - 2 * fr, 0.006), pal.paint, { p: [-w / 2 + fr / 2, 0.015, 0] }));
  k.push(part(cbox(w - 2 * fr, 0.004, l - 2 * fr, 0.001), pal.dark, { p: [0, 0.004, 0] }));
  // armoured louvre slats across the opening
  const n = Math.round((l - 2 * fr) / 0.05);
  for (let i = 0; i < n; i++) {
    const z = -l / 2 + fr + ((i + 0.5) * (l - 2 * fr)) / n;
    k.push(part(cbox(w - 2 * fr + 0.006, 0.032, 0.012, 0.002), pal.paint, { p: [0, 0.018, z], r: [24, 0, 0] }));
  }
  // fine mesh screen over the slats: thin wires both ways
  const wires: THREE.BufferGeometry[] = [];
  for (let x = -w / 2 + fr + 0.02; x < w / 2 - fr; x += 0.03) wires.push(cbox(0.003, 0.003, l - 2 * fr, 0.0005).translate(x, 0.034, 0));
  k.push(part(merge(wires), pal.gun));
  for (const s of [1, -1]) k.push(part(G.cyl(0.016, 0.016, 0.1, 12), pal.paint, { p: [s * (w / 2 - 0.14), 0.03, l / 2 + 0.008], r: [0, 0, 90] }));
  return group(k);
}

function fanGrille(pal: Palette, r: number): THREE.Group {
  const k: THREE.Object3D[] = [];
  // round armoured fan housing: raised collar, dark void, fan hub and blades, radial bars
  k.push(part(G.lathe([[r - 0.05, 0], [r + 0.03, 0], [r + 0.03, 0.014], [r + 0.01, 0.034], [r - 0.02, 0.038], [r - 0.05, 0.03]], 48, 40), pal.paint));
  k.push(part(G.cyl(r - 0.045, r - 0.045, 0.004, 40), pal.dark, { p: [0, 0.004, 0] }));
  k.push(part(G.cyl(0.07, 0.07, 0.03, 20), pal.gun, { p: [0, 0.02, 0] }));
  for (let b = 0; b < 8; b++) k.push(part(cbox(0.03, 0.004, r - 0.12, 0.001), pal.gun, { p: [Math.sin((b * Math.PI) / 4) * (r / 2), 0.012, Math.cos((b * Math.PI) / 4) * (r / 2)], r: [0, b * 45, 14] }));
  for (let b = 0; b < 10; b++) {
    const a = (b / 10) * Math.PI;
    k.push(part(cbox(2 * (r - 0.05), 0.012, 0.012, 0.002), pal.paint, { p: [0, 0.03, 0], r: [0, (a * 180) / Math.PI, 0] }));
  }
  k.push(part(G.torus(r * 0.55, 0.007, 6, 40), pal.paint, { p: [0, 0.03, 0], r: [90, 0, 0] }));
  k.push(part(G.cyl(0.05, 0.05, 0.02, 16), pal.paint, { p: [0, 0.035, 0] }));
  return group(k);
}

function engineDeck(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.roof;
  for (const s of [1, -1]) {
    out.push(group([rectGrille(pal, 0.46, 0.62)], { p: [s * 0.8, y, -1.62] }));
    out.push(group([fanGrille(pal, 0.25)], { p: [s * 0.78, y, -2.35] }));
  }
  // engine access hatch with its two round air-intake ports, hinges and lifting handles
  const hz = -1.95;
  out.push(part(rb(0.86, 0.03, 1.1, 0.012), pal.paint, { p: [0, y + 0.015, hz] }));
  out.push(part(rb(0.78, 0.01, 1.02, 0.004), pal.paint, { p: [0, y + 0.034, hz] }));
  for (const z of [hz + 0.28, hz - 0.18]) {
    out.push(part(G.cyl(0.13, 0.135, 0.03, 32), pal.paint, { p: [0, y + 0.05, z] }));
    out.push(part(G.lathe([[0, 0], [0.155, 0], [0.16, 0.01], [0.152, 0.024], [0.11, 0.034], [0, 0.038]], 36, 35), pal.cast, { p: [0, y + 0.065, z] }));
  }
  for (const x of [-0.25, 0.25]) out.push(part(G.cyl(0.02, 0.02, 0.14, 14), pal.paint, { p: [x, y + 0.04, hz + 0.56], r: [0, 0, 90] }));
  for (const x of [-0.32, 0.32]) out.push(part(G.tube([[x, y + 0.036, hz - 0.43], [x, y + 0.07, hz - 0.41], [x, y + 0.07, hz - 0.33], [x, y + 0.036, hz - 0.31]], 0.009, 8, 16), pal.paint));
  // fuel filler caps ahead of the fan grilles
  for (const s of [1, -1]) {
    out.push(part(G.cyl(0.07, 0.075, 0.016, 24), pal.paint, { p: [s * 0.8, y + 0.008, -2.72] }));
    out.push(part(G.cyl(0.05, 0.05, 0.022, 24), pal.cast, { p: [s * 0.8, y + 0.027, -2.72] }));
    out.push(part(rb(0.06, 0.012, 0.018, 0.004), pal.cast, { p: [s * 0.8, y + 0.044, -2.72] }));
  }
  return out;
}

// ------------------------------------------------------------------ rear plate
function exhaust(pal: Palette, x: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const yb = 1.28;
  const zb = rearZ(yb);
  const zc = zb - 0.14;
  const y1 = 2.42;
  // cast armoured guard round the pipe where it leaves the plate
  out.push(onRear([part(G.rbox(0.26, 0.3, 0.1, 0.03, 2), pal.cast, { p: [0, 0, 0.05] })], x, yb));
  out.push(part(G.lathe([[0, 0], [0.11, 0], [0.12, 0.02], [0.12, 0.26], [0.1, 0.3], [0.085, 0.31], [0, 0.31]], 32, 35), pal.cast, { p: [x, yb - 0.12, zc] }));
  // elbow out of the guard, vertical pipe and tail
  out.push(part(G.tube([[x, yb, zb - 0.02], [x, yb + 0.02, zc + 0.06], [x, yb + 0.12, zc]], 0.07, 14, 12), pal.exhaust));
  out.push(part(G.cyl(0.068, 0.07, y1 - (yb + 0.1), 24), pal.exhaust, { p: [x, (y1 + yb + 0.1) / 2, zc] }));
  out.push(part(G.cyl(0.074, 0.074, 0.03, 24), pal.exhaust, { p: [x, y1 - 0.02, zc] }));
  out.push(part(G.cyl(0.058, 0.058, 0.01, 20), pal.dark, { p: [x, y1 + 0.001, zc] }));
  // support strap to the rear plate high up
  const ys = 1.82;
  out.push(part(G.torus(0.078, 0.008, 6, 24), pal.sheet, { p: [x, ys, zc], r: [90, 0, 0] }));
  out.push(part(rb(0.03, 0.03, rearZ(ys) - zc - 0.07, 0.004), pal.sheet, { p: [x, ys, (rearZ(ys) + zc + 0.07) / 2] }));
  return out;
}

function stowageBin(pal: Palette, x: number): THREE.Object3D {
  const w = 0.56, h = 0.36, d = 0.26;
  return onRear(
    [
      part(rb(w, h, d, 0.012), pal.sheet, { p: [0, 0, d / 2 + 0.01] }),
      part(rb(w + 0.02, 0.03, d + 0.02, 0.008), pal.sheet, { p: [0, h / 2 - 0.01, d / 2 + 0.012] }),
      part(rb(w - 0.12, h - 0.12, 0.01, 0.004), pal.sheet, { p: [0, -0.02, d + 0.012] }),
      ...[-0.18, 0.18].map((dx) => part(rb(0.05, 0.06, 0.016, 0.004), pal.gun, { p: [dx, h / 2 - 0.05, d + 0.016] })),
      ...[-0.2, 0.2].map((dx) => part(rb(0.04, h - 0.04, 0.02, 0.004), pal.paint, { p: [dx, 0, 0.01] })),
    ],
    x,
    1.42,
  );
}

function rearFittings(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  out.push(...exhaust(pal, 0.42), ...exhaust(pal, -0.42));
  out.push(stowageBin(pal, 1.02), stowageBin(pal, -1.02));
  // inertia starter port with cover, between the exhausts
  out.push(onRear([part(G.cyl(0.08, 0.08, 0.022, 28), pal.paint, { r: [90, 0, 0], p: [0, 0, 0.011] }), part(G.cyl(0.03, 0.03, 0.03, 14), pal.paint, { p: [0, 0, 0.03], r: [90, 0, 0] })], 0, 1.3));
  // rear plate bolts (top edge) and the idler adjusters on the lower rear corners
  const rb0: G.V3[] = [];
  for (let i = 0; i < 9; i++) rb0.push([-0.96 + i * 0.24, H.roof, rearZ(H.roof) + 0.05]);
  out.push(part(scatterN(nut(0.022, 0.008), rb0, [0, 1, 0]), pal.paint));
  // tow coupling jaw at the bottom centre of the lower rear
  const jy = 0.8, jz = REAR.bottomZ + 0.12;
  out.push(part(rb(0.3, 0.2, 0.05, 0.012), pal.paint, { p: [0, jy, jz - 0.02] }));
  for (const s of [1, -1]) out.push(part(rb(0.035, 0.15, 0.13, 0.01), pal.paint, { p: [s * 0.055, jy - 0.01, jz - 0.1] }));
  out.push(part(G.cyl(0.018, 0.018, 0.2, 12), pal.gun, { p: [0, jy - 0.01, jz - 0.13], r: [0, 0, 90] }));
  out.push(part(G.cyl(0.022, 0.022, 0.025, 12), pal.gun, { p: [0, jy + 0.08, jz - 0.13] }));
  return out;
}

// ------------------------------------------------------------------ track guards and Schuerzen rail
function guards(pal: Palette): THREE.Object3D[] {
  const left: THREE.Object3D[] = [];
  const t = 0.005, y = H.sponson;
  const x0 = W.sideBottom - 0.12, x1 = W.fender;
  const zf = NOSE_Z - 0.02, zr = rearZ(y) + 0.02;
  // side guard strip under the sponson edge, full length
  left.push(part(G.box(x1 - x0, t, zf - zr), pal.sheet, { p: [(x0 + x1) / 2, y - t / 2 - 0.001, (zf + zr) / 2] }));
  left.push(part(G.box(0.004, 0.03, zf - zr), pal.sheet, { p: [x1 - 0.002, y - 0.016, (zf + zr) / 2] }));
  // Schuerzen hanger rail: angle strip along the guard edge with drop brackets
  left.push(part(rb(0.03, 0.05, zf - zr - 0.2, 0.004), pal.sheet, { p: [x1 + 0.015, y - 0.035, (zf + zr) / 2 - 0.05] }));
  const gb: G.V3[] = [];
  for (let z = zr + 0.2; z < zf - 0.2; z += 0.3) gb.push([x0 + 0.03, y - 0.006, z]);
  left.push(part(scatterN(nut(0.018, 0.006).rotateX(Math.PI), gb, [0, 1, 0]), pal.sheet));
  // front mudguard over the sprocket: fixed section continuing the glacis edge, then the flap
  const gw = x1 - 0.98;
  const front = group(
    [
      part(G.box(gw, t, 0.26), pal.sheet, { p: [0, -t / 2, 0.13] }),
      part(G.box(0.004, 0.035, 0.26), pal.sheet, { p: [gw / 2 - 0.002, -0.0175, 0.13] }),
      part(G.box(0.004, 0.035, 0.26), pal.sheet, { p: [-gw / 2 + 0.002, -0.0175, 0.13] }),
      part(G.box(gw, 0.035, 0.004), pal.sheet, { p: [0, -0.0175, 0.258] }),
    ],
    { p: [0.98 + gw / 2, y - 0.002, zf - 0.03], r: [38, 0, 0] },
  );
  left.push(front);
  // rear mudguard flap
  left.push(
    group(
      [
        part(G.box(gw, t, 0.26), pal.sheet, { p: [0, -t / 2, -0.13] }),
        part(G.box(0.004, 0.035, 0.26), pal.sheet, { p: [gw / 2 - 0.002, -0.0175, -0.13] }),
        part(G.box(0.004, 0.035, 0.26), pal.sheet, { p: [-gw / 2 + 0.002, -0.0175, -0.13] }),
      ],
      { p: [0.98 + gw / 2, y - 0.002, zr + 0.01], r: [-20, 0, 0] },
    ),
  );
  return [mirrorX(group(left))];
}

/** Schuerzen: 5 mm skirt plates hung from the rail, five per side. */
export function schuerzen(pal: Palette): THREE.Object3D[] {
  const left: THREE.Object3D[] = [];
  const x = W.fender + 0.04, t = 0.005;
  const y1 = H.sponson - 0.02, y0 = y1 - 0.5;
  const zf = 2.72, zr = -3.02;
  const n = 5, gap = 0.012;
  const L = (zf - zr - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const z1 = zf - i * (L + gap), z0 = z1 - L;
    const kids: THREE.Object3D[] = [];
    const outline: V2[] = i === 0 ? [[0, 0], [L, 0], [L, 0.5], [0.08, 0.5], [0, 0.4]] : [[0, 0], [L, 0], [L, 0.5], [0, 0.5]];
    kids.push(part(G.plate(outline, t, 'zy', 0.0015), pal.sheet, { p: [0, 0, 0] }));
    // hanger hooks over the rail
    for (const f of [0.18, 0.82]) kids.push(part(rb(0.012, 0.06, 0.05, 0.003), pal.sheet, { p: [-0.012, 0.5 + 0.005, L * f] }));
    left.push(group(kids, { p: [x, y0, z0] }));
  }
  return [mirrorX(group(left))];
}

// ------------------------------------------------------------------ belly
function belly(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.belly;
  for (const [z, w, l] of [[1.8, 0.8, 0.5], [0.1, 0.6, 0.6], [-1.9, 0.9, 0.7]] as G.V3[]) {
    out.push(part(rb(w, 0.014, l, 0.004), pal.paint, { p: [0, y - 0.006, z] }));
  }
  // torsion bar anchor caps along the belly edges
  const caps: G.V3[] = [];
  for (let i = 0; i < 8; i++) caps.push([0.72, y - 0.004, 1.9 - 0.53 * i + 0.27], [-0.72, y - 0.004, 1.9 - 0.53 * i + 0.27]);
  out.push(part(scatterN(G.cyl(0.05, 0.05, 0.012, 16).translate(0, 0.006, 0), caps, [0, -1, 0]), pal.paint));
  return out;
}

/** Everything that belongs to the hull structure. */
export function hull(pal: Palette): THREE.Group {
  const kids: THREE.Object3D[] = [...plates(pal), bowMG(pal), ...roofFittings(pal), ...engineDeck(pal), ...rearFittings(pal), ...guards(pal), ...belly(pal)];
  return group(kids);
}
