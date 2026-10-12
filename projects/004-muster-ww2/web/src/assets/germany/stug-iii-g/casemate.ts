/**
 * Casemate (fighting compartment superstructure) of the StuG III Ausf. G: 80 mm front plate
 * leaning 10 deg with the sloped front roof plate above it, the wide side panniers over the track
 * guards with inward-sloping side plates and sloped front plates, flat roof and vertical rear
 * wall with the fume extractor cover. Welded box mantlet (Kastenblende) with the 7.5 cm StuK 40
 * L/48 and its double-baffle muzzle brake, driver's visor, gunner's periscope sight port, the
 * commander's cupola with seven periscopes (glass), the loader's two-piece hatch with the
 * folding MG shield and MG 34, lifting hooks and antenna base.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Palette } from './materials';
import { H, W, P, GUN } from './dims';
import { rb, cbox, nut, scatterN, convexFromPlanes, planeAt, basisGroup, latheZ, arcBand, merge, type Plane, type V2 } from './util';
import { bead } from './hull';

const off = (p: Plane, o: number): Plane => ({ n: p.n, d: p.d + o });

/** Outward plane through a (z, y) side-view segment, spanning all X. `out` is the outward side. */
function zyPlane(A: V2, B: V2, out: V2): Plane {
  const dz = B[0] - A[0], dy = B[1] - A[1];
  let nz = dy, ny = -dz;
  if (nz * (out[0] - A[0]) + ny * (out[1] - A[1]) < 0) (nz = -nz), (ny = -ny);
  return planeAt([0, ny, nz], [0, A[1], A[0]]);
}

/** Planes of the casemate parts (shared with fittings and markings). */
export function casePlanes() {
  const front = zyPlane(P.glacisTop, P.frontTop, [3, 1.4]);
  const slope = zyPlane(P.frontTop, P.roofFront, [3, 3]);
  const glacis = zyPlane(P.noseTop, P.glacisTop, [3, 3]);
  const top = planeAt([0, 1, 0], [0, H.roof, 0]);
  const rear = planeAt([0, 0, -1], [0, 0, P.caseRearZ]);
  const panFront = zyPlane([1.93, H.fender], P.roofFront, [3, 3]);
  const panSide = planeAt([H.roof - H.fender, W.panBase - W.panTop, 0], [W.panBase, H.fender, 0]);
  return { front, slope, glacis, top, rear, panFront, panSide };
}

/** X of the left pannier side face at height y. */
export function panX(y: number): number {
  return W.panBase - ((y - H.fender) / (H.roof - H.fender)) * (W.panBase - W.panTop);
}
/** Z of the central front plate face at height y. */
export function frontZ(y: number): number {
  const [z0, y0] = P.glacisTop, [z1, y1] = P.frontTop;
  return z0 + ((y - y0) / (y1 - y0)) * (z1 - z0);
}
/** Z of the pannier front face at height y. */
export function panFrontZ(y: number): number {
  return 1.93 + ((y - H.fender) / (H.roof - H.fender)) * (P.roofFront[0] - 1.93);
}

// ------------------------------------------------------------------ armour body
function body(pal: Palette): THREE.Object3D[] {
  const q = casePlanes();
  const out: THREE.Object3D[] = [];
  const xc = W.lower;
  // central fighting compartment
  out.push(
    part(
      convexFromPlanes([
        q.front,
        q.slope,
        q.top,
        q.rear,
        off(q.glacis, -0.004),
        planeAt([0, -1, 0], [0, 1.08, 0]),
        planeAt([1, 0, 0], [xc, 0, 0]),
        planeAt([-1, 0, 0], [-xc, 0, 0]),
      ]),
      pal.paint,
    ),
  );
  // side panniers over the track guards (left, mirrored)
  const pan = convexFromPlanes([q.panSide, q.panFront, q.top, q.rear, planeAt([0, -1, 0], [0, H.fender, 0]), planeAt([-1, 0, 0], [xc - 0.04, 0, 0])]);
  out.push(mirrorX(part(pan, pal.paint)));
  // roof plate seams / overlaps: a thin raised plate over the rear roof, bolt rows
  out.push(part(rb(2 * W.panTop - 0.06, 0.012, 0.92, 0.003), pal.paint, { p: [0, H.roof + 0.006, P.caseRearZ + 0.49] }));
  const bolts: G.V3[] = [];
  for (let i = 0; i < 9; i++) bolts.push([-0.96 + i * 0.24, H.roof + 0.012, P.caseRearZ + 0.06]);
  for (let i = 0; i < 7; i++) {
    const z = 1.25 - i * 0.28;
    bolts.push([W.panTop - 0.05, H.roof, z], [-(W.panTop - 0.05), H.roof, z]);
  }
  out.push(part(scatterN(nut(0.022, 0.007), bolts, [0, 1, 0]), pal.paint));
  // weld beads: pannier front to central front, pannier side to roof, rear wall edges
  const beads: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    beads.push(bead([[s * (xc + 0.004), 1.1, frontZ(1.1) - 0.004], [s * (xc + 0.004), P.frontTop[1] - 0.01, frontZ(P.frontTop[1] - 0.01) - 0.004]]));
    beads.push(bead([[s * (W.panTop + 0.002), H.roof - 0.006, panFrontZ(H.roof) - 0.02], [s * (W.panTop + 0.002), H.roof - 0.006, P.caseRearZ + 0.02]], 0.005));
    beads.push(bead([[s * (W.panBase + 0.003), H.fender + 0.004, panFrontZ(H.fender) - 0.02], [s * (W.panBase + 0.003), H.fender + 0.004, P.caseRearZ + 0.02]], 0.005));
    beads.push(bead([[s * (panX(H.fender + 0.02) - 0.004), H.fender + 0.02, P.caseRearZ - 0.004], [s * (panX(H.roof - 0.02) - 0.004), H.roof - 0.02, P.caseRearZ - 0.004]], 0.005));
  }
  out.push(part(merge(beads), pal.paint));
  return out;
}

// ------------------------------------------------------------------ front plate fittings
function frontFittings(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const lean = (Math.atan2(P.glacisTop[0] - P.frontTop[0], P.frontTop[1] - P.glacisTop[1]) * 180) / Math.PI;
  // driver's visor (Fahrersehklappe) on the left
  const vy = 1.55, vx = 0.56;
  out.push(
    group(
      [
        part(rb(0.3, 0.13, 0.05, 0.012), pal.cast, { p: [0, 0, 0.025] }),
        part(rb(0.24, 0.07, 0.03, 0.01), pal.cast, { p: [0, -0.005, 0.06] }),
        part(cbox(0.18, 0.012, 0.012, 0.001), pal.dark, { p: [0, 0.012, 0.072] }),
        part(G.cyl(0.018, 0.018, 0.34, 14), pal.cast, { p: [0, 0.06, 0.03], r: [0, 0, 90] }),
        part(rb(0.36, 0.012, 0.06, 0.004), pal.paint, { p: [0, 0.1, 0.03], r: [-12, 0, 0] }),
        part(scatterN(nut(0.018, 0.008), [[-0.12, -0.04, 0.05], [0.12, -0.04, 0.05]], [0, 0, 1]), pal.cast),
      ],
      { p: [vx, vy, frontZ(vy)], r: [-lean, 0, 0] },
    ),
  );
  // bolt rows along the front plate edges (roof and glacis joints)
  const fb: G.V3[] = [];
  for (let i = 0; i < 8; i++) {
    const x = -0.84 + i * 0.24;
    if (Math.abs(x - GUN.x) < 0.3) continue;
    fb.push([x, P.frontTop[1] - 0.04, frontZ(P.frontTop[1] - 0.04)]);
  }
  out.push(part(scatterN(nut(0.024, 0.01), fb, [0, 0.17, 0.98]), pal.paint));
  // lifting hooks on the front roof corners
  for (const s of [1, -1]) out.push(part(G.torus(0.035, 0.011, 8, 16, Math.PI), pal.paint, { p: [s * 0.85, H.roof, 1.26], r: [0, 90, 0] }));
  return out;
}

// ------------------------------------------------------------------ box mantlet and gun (gun-local: origin on the axis at the front plate)
function gun(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  const z0 = GUN.mantletZ - frontZ(GUN.y); // mantlet depth in front of the plate
  // welded box: main box, raised front face, top and side cheek plates
  out.push(part(G.rbox(0.58, 0.44, z0 + 0.08, 0.02, 2), pal.paint, { p: [0, 0.01, (z0 - 0.08) / 2] }));
  out.push(part(G.rbox(0.5, 0.36, 0.04, 0.012, 2), pal.paint, { p: [0, 0.01, z0 + 0.01] }));
  out.push(part(rb(0.62, 0.03, z0 + 0.04, 0.008), pal.paint, { p: [0, 0.245, (z0 - 0.04) / 2] }));
  const mb: G.V3[] = [[-0.21, 0.15, z0 + 0.03], [0.21, 0.15, z0 + 0.03], [-0.21, -0.13, z0 + 0.03], [0.21, -0.13, z0 + 0.03]];
  out.push(part(scatterN(nut(0.028, 0.01), mb, [0, 0, 1]), pal.paint));
  // cast gun sleeve (recoil guard) with flange
  out.push(
    part(
      latheZ([[0, z0], [0.14, z0], [0.14, z0 + 0.03], [0.122, z0 + 0.04], [0.114, z0 + 0.05], [0.108, z0 + 0.25], [0.1, z0 + 0.27], [0.086, z0 + 0.285], [0, z0 + 0.285]], 40, 35),
      pal.cast,
    ),
  );
  // barrel with the step of the reinforced rear section
  const muzzle = GUN.muzzleZ - frontZ(GUN.y);
  const bEnd = muzzle - 0.34;
  out.push(part(latheZ([[0, z0 + 0.27], [0.078, z0 + 0.27], [0.076, z0 + 1.1], [0.072, z0 + 1.12], [0.068, z0 + 1.15], [0.06, bEnd + 0.02], [0, bEnd + 0.02]], 32, 35), pal.paint));
  // double-baffle muzzle brake
  const b0 = bEnd;
  const disc = (a: number, b: number, rOut: number) =>
    latheZ([[0.042, a], [rOut - 0.006, a], [rOut, a + 0.006], [rOut, b - 0.006], [rOut - 0.006, b], [0.042, b], [0.042, a]], 36, 35);
  out.push(part(latheZ([[0.06, b0], [0.082, b0], [0.088, b0 + 0.012], [0.088, b0 + 0.055], [0.06, b0 + 0.055]], 32, 35), pal.paint));
  out.push(part(disc(b0 + 0.055, b0 + 0.1, 0.104), pal.paint));
  out.push(part(disc(b0 + 0.19, b0 + 0.23, 0.104), pal.paint));
  out.push(part(latheZ([[0.042, b0 + 0.3], [0.098, b0 + 0.3], [0.104, b0 + 0.306], [0.104, b0 + 0.325], [0.094, b0 + 0.34], [0.042, b0 + 0.34], [0.042, b0 + 0.3]], 36, 35), pal.paint));
  out.push(part(arcBand(0.084, 0.104, 48, 132, b0 + 0.09, b0 + 0.31, 10, 0.003), pal.paint));
  out.push(part(arcBand(0.084, 0.104, 228, 312, b0 + 0.09, b0 + 0.31, 10, 0.003), pal.paint));
  out.push(part(G.cyl(0.0375, 0.0375, 0.5, 20, true), pal.dark, { p: [0, 0, muzzle - 0.25], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.0375, 0.0375, 0.004, 20), pal.dark, { p: [0, 0, b0 + 0.02], r: [90, 0, 0] }));
  return group(out, { p: [GUN.x, GUN.y, frontZ(GUN.y)] });
}

// ------------------------------------------------------------------ cupola (seven periscopes)
function cupola(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  const R = 0.3;
  out.push(
    part(
      G.lathe([[0, 0], [R + 0.04, 0], [R + 0.04, 0.02], [R + 0.01, 0.03], [R, 0.04], [R, 0.15], [R + 0.012, 0.155], [R + 0.012, 0.172], [R - 0.02, 0.18], [0, 0.18]], 56, 35),
      pal.cast,
    ),
  );
  // seven periscope heads in armoured housings around the ring
  for (let k = 0; k < 7; k++) {
    const a = ((k * 360) / 7) * (Math.PI / 180);
    const z = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const y = new THREE.Vector3(0, 1, 0);
    const x = new THREE.Vector3().crossVectors(y, z);
    const kids = [
      part(rb(0.13, 0.08, 0.05, 0.008), pal.cast, { p: [0, 0.0, -0.01] }),
      part(rb(0.1, 0.045, 0.012, 0.003), pal.dark, { p: [0, 0.0, 0.012] }),
      part(rb(0.09, 0.036, 0.008, 0.002), pal.glass, { p: [0, 0.0, 0.019] }),
      part(rb(0.15, 0.018, 0.07, 0.005), pal.cast, { p: [0, 0.046, 0.0] }),
    ];
    out.push(basisGroup(kids, new THREE.Vector3(z.x * R, 0.1, z.z * R), x, y, z));
  }
  // two-piece hatch with the port for the scissors periscope at the front
  for (const s of [1, -1]) {
    out.push(part(G.lathe([[0, 0.18], [R - 0.03, 0.18], [R - 0.03, 0.198], [R - 0.05, 0.21], [0, 0.214]], 40, 30, s > 0 ? 0 : Math.PI, Math.PI), pal.cast, { p: [0, 0, 0] }));
    out.push(part(G.cyl(0.02, 0.02, 0.1, 12), pal.cast, { p: [s * (R - 0.02), 0.2, 0], r: [90, 0, 0] }));
    out.push(part(G.tube([[s * 0.06, 0.21, -0.06], [s * 0.06, 0.232, -0.04], [s * 0.06, 0.232, 0.04], [s * 0.06, 0.21, 0.06]], 0.007, 8, 12), pal.paint));
  }
  out.push(part(rb(0.012, 0.012, 2 * (R - 0.04), 0.003), pal.dark, { p: [0, 0.205, 0] }));
  out.push(part(G.cyl(0.04, 0.042, 0.02, 18), pal.cast, { p: [0, 0.22, R - 0.1] }));
  return group(out, { p: [0.6, H.roof, -0.12] });
}

// ------------------------------------------------------------------ loader's hatch, MG shield and MG 34
function mg34(pal: Palette): THREE.Group {
  // simplified MG 34 on its mount, bore along +Z, origin at the mount pivot
  const out: THREE.Object3D[] = [];
  out.push(part(rb(0.05, 0.07, 0.3, 0.008), pal.gun, { p: [0, 0.03, -0.05] }));
  out.push(part(rb(0.04, 0.05, 0.14, 0.008), pal.gun, { p: [0, 0.075, 0.02] }));
  out.push(part(G.cyl(0.022, 0.022, 0.34, 14), pal.gun, { p: [0, 0.03, 0.27], r: [90, 0, 0] }));
  out.push(part(G.scatter(G.cyl(0.006, 0.006, 0.004, 6), [0.16, 0.22, 0.28, 0.34, 0.4].flatMap((z) => [
    { p: [0.0205, 0.03, z] as G.V3, n: [1, 0, 0] as G.V3 },
    { p: [-0.0205, 0.03, z] as G.V3, n: [-1, 0, 0] as G.V3 },
  ])), pal.dark));
  out.push(part(G.cyl(0.01, 0.014, 0.05, 12), pal.gun, { p: [0, 0.03, 0.465], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.006, 0.006, 0.004, 8), pal.dark, { p: [0, 0.03, 0.49], r: [90, 0, 0] }));
  // pistol grip, butt stock, drum magazine
  out.push(part(rb(0.025, 0.09, 0.035, 0.008), pal.black, { p: [0, -0.04, -0.12], r: [-15, 0, 0] }));
  out.push(part(G.rbox(0.04, 0.09, 0.22, 0.012, 1), pal.black, { p: [0, 0.0, -0.3] }));
  out.push(part(G.cyl(0.055, 0.055, 0.07, 18), pal.gun, { p: [-0.06, 0.02, 0.0], r: [0, 0, 90] }));
  // mount pivot post
  out.push(part(G.cyl(0.015, 0.015, 0.1, 10), pal.gun, { p: [0, -0.05, 0.0] }));
  return group(out);
}

function loaderPosition(pal: Palette, shieldUp: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const hx = -0.55, hz = -0.22;
  // two-piece loader's hatch (front and rear leaves)
  out.push(part(rb(0.6, 0.012, 0.66, 0.004), pal.paint, { p: [hx, H.roof + 0.006, hz] }));
  for (const s of [1, -1]) {
    out.push(part(rb(0.54, 0.02, 0.29, 0.008), pal.paint, { p: [hx, H.roof + 0.022, hz + s * 0.152] }));
    out.push(part(G.cyl(0.018, 0.018, 0.1, 12), pal.paint, { p: [hx + 0.2, H.roof + 0.03, hz + s * 0.31], r: [0, 0, 90] }));
    out.push(part(G.cyl(0.018, 0.018, 0.1, 12), pal.paint, { p: [hx - 0.2, H.roof + 0.03, hz + s * 0.31], r: [0, 0, 90] }));
    out.push(part(G.tube([[hx - 0.07, H.roof + 0.032, hz + s * 0.1], [hx - 0.05, H.roof + 0.06, hz + s * 0.1], [hx + 0.05, H.roof + 0.06, hz + s * 0.1], [hx + 0.07, H.roof + 0.032, hz + s * 0.1]], 0.007, 8, 12), pal.paint));
  }
  // folding MG shield in front of the hatch: square plate with the MG aperture
  const sw = 0.54, sh = 0.44, st = 0.012;
  const shieldKids: THREE.Object3D[] = [
    part(
      G.plate([[-sw / 2, 0], [sw / 2, 0], [sw / 2, sh], [-sw / 2, sh]].map(([x, y]) => [x, y] as V2), st, 'xy', 0.003),
      pal.paint,
      { p: [0, 0, 0] },
    ),
    part(rb(0.07, 0.05, 0.004, 0.002), pal.dark, { p: [0.0, 0.29, st / 2 + 0.001] }),
    part(rb(0.1, 0.02, 0.03, 0.004), pal.paint, { p: [0.0, 0.325, 0.015] }),
    // side stiffeners
    part(rb(0.02, sh - 0.04, 0.03, 0.004), pal.paint, { p: [sw / 2 - 0.02, sh / 2, -0.02] }),
    part(rb(0.02, sh - 0.04, 0.03, 0.004), pal.paint, { p: [-sw / 2 + 0.02, sh / 2, -0.02] }),
  ];
  const sz = 0.22;
  // hinge brackets on the roof
  for (const s of [1, -1]) {
    out.push(part(rb(0.04, 0.04, 0.06, 0.006), pal.paint, { p: [hx + s * 0.22, H.roof + 0.02, sz] }));
    out.push(part(G.cyl(0.013, 0.013, 0.06, 10), pal.gun, { p: [hx + s * 0.22, H.roof + 0.03, sz], r: [0, 0, 90] }));
  }
  if (shieldUp) {
    out.push(group(shieldKids, { p: [hx, H.roof + 0.02, sz], r: [-8, 0, 0] }));
    // bracing struts to the roof behind
    for (const s of [1, -1]) out.push(part(G.rod([hx + s * 0.2, H.roof + 0.26, sz - 0.04], [hx + s * 0.2, H.roof + 0.01, sz - 0.2], 0.009, 8), pal.paint));
    out.push(part(rb(0.44, 0.012, 0.03, 0.003), pal.paint, { p: [hx, H.roof + 0.006, sz - 0.2] }));
    // MG 34 behind the shield, barrel through the aperture, on a cradle arm from the shield
    out.push(group([mg34(pal)], { p: [hx, H.roof + 0.28, sz - 0.18] }));
    out.push(part(rb(0.05, 0.03, 0.2, 0.006), pal.paint, { p: [hx, H.roof + 0.215, sz - 0.1] }));
    out.push(part(rb(0.1, 0.1, 0.012, 0.004), pal.paint, { p: [hx, H.roof + 0.22, sz - 0.01] }));
  } else {
    // folded forward flat on the roof, MG stowed inside
    out.push(group(shieldKids, { p: [hx, H.roof + 0.02 + st / 2, sz], r: [90, 0, 0] }));
  }
  return out;
}

// ------------------------------------------------------------------ roof and rear wall fittings
function roofFittings(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.roof;
  // gunner's periscope sight port with the sliding armour cover
  const sx = 0.26, sz = 1.2;
  out.push(part(rb(0.34, 0.016, 0.3, 0.004), pal.paint, { p: [sx, y + 0.008, sz] }));
  out.push(part(rb(0.2, 0.024, 0.18, 0.006), pal.cast, { p: [sx + 0.05, y + 0.028, sz - 0.02] }));
  out.push(part(rb(0.08, 0.1, 0.1, 0.012), pal.cast, { p: [sx - 0.07, y + 0.066, sz + 0.02] }));
  out.push(part(rb(0.06, 0.032, 0.008, 0.002), pal.glass, { p: [sx - 0.07, y + 0.08, sz + 0.072] }));
  out.push(part(rb(0.24, 0.012, 0.03, 0.003), pal.paint, { p: [sx, y + 0.022, sz + 0.16] }));
  // fume extractor (ventilator) under an armoured cover on the rear wall
  const vx = -0.4, vy = 1.72, vz = P.caseRearZ;
  out.push(part(rb(0.34, 0.26, 0.05, 0.01), pal.paint, { p: [vx, vy, vz - 0.025] }));
  out.push(part(G.cyl(0.1, 0.11, 0.07, 28), pal.cast, { p: [vx, vy, vz - 0.075], r: [-90, 0, 0] }));
  out.push(part(rb(0.24, 0.02, 0.12, 0.004), pal.paint, { p: [vx, vy + 0.13, vz - 0.07] }));
  // rear lifting hooks
  for (const s of [1, -1]) out.push(part(G.torus(0.035, 0.011, 8, 16, Math.PI), pal.paint, { p: [s * 0.85, y, P.caseRearZ + 0.12], r: [0, 90, 0] }));
  // antenna base on the right rear roof corner (rod not fitted)
  const ax = -0.98, az = P.caseRearZ + 0.18;
  out.push(part(G.cyl(0.07, 0.075, 0.02, 24), pal.paint, { p: [ax, y + 0.01, az] }));
  out.push(part(G.lathe([[0, 0], [0.045, 0], [0.05, 0.02], [0.04, 0.09], [0.028, 0.11], [0, 0.11]], 20, 35), pal.black, { p: [ax, y + 0.02, az] }));
  out.push(part(G.cyl(0.016, 0.02, 0.05, 12), pal.gun, { p: [ax, y + 0.155, az] }));
  out.push(part(G.cyl(0.065, 0.065, 0.06, 24, true), pal.paint, { p: [ax, y + 0.05, az] }));
  return out;
}

/** Complete casemate. */
export function casemate(pal: Palette, shieldUp: boolean): THREE.Group {
  return group([...body(pal), ...frontFittings(pal), gun(pal), cupola(pal), ...loaderPosition(pal, shieldUp), ...roofFittings(pal)]);
}
