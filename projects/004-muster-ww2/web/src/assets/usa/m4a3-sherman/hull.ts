/**
 * M4A3(75)W welded hull ("second generation" large-hatch hull): rolled plates with real thickness
 * (2.5 in glacis at 47 deg, 1.5 in sides and rear, 0.75 in roof), the one-piece sharp-nosed E8543
 * differential housing with its bolt strip, cast-in towing lugs and welded footsteps, the E8020
 * drivers' hatch casting with the two large hatches, periscopes, ventilator, the engine deck (grilled
 * engine doors, filler caps with bullet splashes, lifting handles), the floor escape hatch and
 * inspection plates, and weld beads.
 *
 * Frame: +Z forward, +X = the tank's left, y = 0 ground.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Pal } from './palette';
import { H, GLACIS_TOP_Z, SPROCKET, TURRET } from './dims';
import { slab, onSurface, roundedRing, prism, latheX, boltRingX, nut, rb, uHandle, merge, D, type P2, type P3 } from './util';

const { xLow, xSide, roof, sponson: ySp, belly } = H;
const S47 = Math.sin(47 * D), C47 = Math.cos(47 * D);
const REAR_A = Math.atan2(H.rearTopZ - H.rearBotZ, roof - ySp); // upper rear plate angle from vertical
const SR = Math.sin(REAR_A), CR = Math.cos(REAR_A);

/** Glacis frame: a across (x), b measured DOWN the plate from its top edge. */
export const glacis = {
  n: [0, S47, C47] as P3,
  at: (a: number, b: number, off = 0): P3 => [a, roof - b * C47 + off * S47, GLACIS_TOP_Z + b * S47 + off * C47],
  /** plate-local "down the slope" direction */
  down: [0, -C47, S47] as P3,
};

/** Upper rear plate frame: b measured DOWN the plate from its top edge. */
export const rearPlate = {
  n: [0, SR, -CR] as P3,
  at: (a: number, b: number, off = 0): P3 => [a, roof - b * CR + off * SR, H.rearTopZ - b * SR - off * CR],
  len: Math.hypot(roof - ySp, H.rearTopZ - H.rearBotZ),
};

/* ------------------------------------------------------------------------------ armour */

function armour(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const tS = H.tSide;
  const zGs = H.glacisZ - (ySp - H.glacisY) * Math.tan(47 * D); // glacis outer face at sponson height
  // glacis (one piece, full width over the sponsons)
  out.push(
    part(
      slab(
        [
          [-xSide, H.glacisY, H.glacisZ],
          [xSide, H.glacisY, H.glacisZ],
          [xSide, roof, GLACIS_TOP_Z],
          [-xSide, roof, GLACIS_TOP_Z],
        ],
        H.tGlacis,
        glacis.n,
        0.006,
      ),
      P.paint,
    ),
  );
  for (const sx of [-1, 1]) {
    // upper side plates (vertical)
    out.push(
      part(
        slab(
          [
            [sx * xSide, ySp, H.rearBotZ],
            [sx * xSide, ySp, zGs - 0.01],
            [sx * xSide, roof - 0.01, GLACIS_TOP_Z - 0.03],
            [sx * xSide, roof - 0.01, H.rearTopZ + 0.01],
          ],
          tS,
          [sx, 0, 0],
          0.006,
        ),
        P.paint,
      ),
    );
    // lower side plates between the tracks
    out.push(
      part(
        slab(
          [
            [sx * xLow, belly, H.bellyRearZ],
            [sx * xLow, belly, H.bellyFrontZ + 0.1],
            [sx * xLow, ySp + 0.01, H.bellyFrontZ + 0.1],
            [sx * xLow, ySp + 0.01, H.lowRearZ],
            [sx * xLow, H.lowRearY, H.lowRearZ],
          ],
          tS,
          [sx, 0, 0],
          0.005,
        ),
        P.paint,
      ),
    );
    // sponson floor over the track
    out.push(
      part(
        slab(
          [
            [sx * (xLow - 0.01), ySp, H.rearBotZ + 0.02],
            [sx * (xSide - 0.01), ySp, H.rearBotZ + 0.02],
            [sx * (xSide - 0.01), ySp, zGs - 0.04],
            [sx * (xLow - 0.01), ySp, zGs - 0.04],
          ],
          0.013,
          [0, -1, 0],
          0.003,
        ),
        P.paint,
      ),
    );
  }
  // rear overhang floor between the sponsons
  out.push(part(slab([[-xLow, ySp, H.rearBotZ + 0.02], [xLow, ySp, H.rearBotZ + 0.02], [xLow, ySp, H.lowRearZ], [-xLow, ySp, H.lowRearZ]], 0.013, [0, -1, 0], 0.003), P.paint));
  // belly
  out.push(part(slab([[-xLow, belly, H.bellyRearZ], [xLow, belly, H.bellyRearZ], [xLow, belly, H.bellyFrontZ + 0.1], [-xLow, belly, H.bellyFrontZ + 0.1]], H.tBelly, [0, -1, 0], 0.004), P.paint));
  // floor escape hatch behind the assistant driver (hinged at its front edge), drain valve and
  // inspection plates along the floor
  {
    const hx = -0.42, hz = 1.3;
    const lid = roundedRing([[-0.23, -0.29], [0.23, -0.29], [0.23, 0.29], [-0.23, 0.29]], [0.06, 0.06, 0.06, 0.06], 4, 1);
    out.push(part(prism(lid, 0.016, 'xz', 0.004), P.paint, { p: [hx, belly - 0.008, hz] }));
    out.push(part(G.scatter(nut(0.022, 0.008), [[-0.18, -0.24], [0.18, -0.24], [-0.18, 0.24], [0.18, 0.24]].map(([x, z]) => ({ p: [hx + x, belly - 0.016, hz + z] as G.V3, n: [0, -1, 0] as G.V3 }))), P.paint));
    for (const x of [-0.12, 0.12]) out.push(part(G.cyl(0.02, 0.02, 0.09, 12), P.paint, { p: [hx + x, belly - 0.018, hz + 0.3], r: [0, 0, 90] }));
    const plates: [number, number, number][] = [[0.42, 1.55, 0.09], [0.0, 0.6, 0.075], [0.45, -0.3, 0.075], [-0.45, -0.3, 0.075], [0.0, -1.4, 0.11], [0.0, -2.05, 0.09]];
    for (const [x, z, r] of plates) {
      out.push(part(G.cyl(r, r + 0.006, 0.012, 22), P.paint, { p: [x, belly - 0.006, z] }));
      out.push(part(G.scatter(nut(0.018, 0.007), Array.from({ length: 6 }, (_, i) => ({ p: [x + Math.cos(i * 1.047) * (r - 0.02), belly - 0.012, z + Math.sin(i * 1.047) * (r - 0.02)] as G.V3, n: [0, -1, 0] as G.V3 }))), P.paint));
    }
  }
  // roof over the fighting compartment (the hatch casting and engine deck sit on / behind it)
  out.push(part(slab([[-xSide, roof, 0.99], [xSide, roof, 0.99], [xSide, roof, -1.06], [-xSide, roof, -1.06]], H.tRoof, [0, 1, 0], 0.004), P.paint));
  // engine deck side strips and the plate under the doors
  for (const sx of [-1, 1]) {
    out.push(part(slab([[sx * 0.72, roof, -1.06], [sx * xSide, roof, -1.06], [sx * xSide, roof, H.rearTopZ], [sx * 0.72, roof, H.rearTopZ]], H.tRoof, [0, 1, 0], 0.004), P.paint));
  }
  out.push(part(G.box(1.44, 0.01, 1.56), P.void, { p: [0, roof - 0.02, -1.84] }));
  // upper rear plate (sloped), lower rear plate (vertical), bottom transition to the belly
  out.push(
    part(
      slab(
        [
          [-xSide, ySp, H.rearBotZ],
          [xSide, ySp, H.rearBotZ],
          [xSide, roof, H.rearTopZ],
          [-xSide, roof, H.rearTopZ],
        ],
        tS,
        rearPlate.n,
        0.006,
      ),
      P.paint,
    ),
  );
  out.push(part(slab([[-xLow, H.lowRearY, H.lowRearZ], [xLow, H.lowRearY, H.lowRearZ], [xLow, ySp, H.lowRearZ], [-xLow, ySp, H.lowRearZ]], tS, [0, 0, -1], 0.005), P.paint));
  const tn = new THREE.Vector3(0, -(H.lowRearZ - H.bellyRearZ), -(H.lowRearY - belly)).normalize();
  out.push(part(slab([[-xLow, H.lowRearY, H.lowRearZ], [-xLow, belly, H.bellyRearZ], [xLow, belly, H.bellyRearZ], [xLow, H.lowRearY, H.lowRearZ]], tS, [tn.x, tn.y, tn.z], 0.005), P.paint));

  // weld beads along the main joints
  const w: THREE.BufferGeometry[] = [];
  const bead = (pts: P3[], r = 0.0075) => w.push(G.weld(pts, r));
  for (const sx of [-1, 1]) {
    // glacis to side plate
    bead([[sx * (xSide + 0.002), H.glacisY + 0.02, H.glacisZ - 0.03], [sx * (xSide + 0.002), roof - 0.005, GLACIS_TOP_Z + 0.004]]);
    // rear plate to side plate
    bead([[sx * (xSide + 0.002), ySp + 0.01, H.rearBotZ + 0.004], [sx * (xSide + 0.002), roof - 0.005, H.rearTopZ - 0.004]]);
    // side plate to sponson floor and to the roof
    bead([[sx * (xSide - 0.004), ySp - 0.004, H.rearBotZ + 0.03], [sx * (xSide - 0.004), ySp - 0.004, zGs - 0.06]], 0.006);
    bead([[sx * (xSide - 0.003), roof + 0.003, GLACIS_TOP_Z - 0.03], [sx * (xSide - 0.003), roof + 0.003, H.rearTopZ + 0.01]], 0.0055);
    // lower rear plate to lower side
    bead([[sx * (xLow + 0.001), H.lowRearY, H.lowRearZ - 0.004], [sx * (xLow + 0.001), ySp - 0.01, H.lowRearZ - 0.004]], 0.006);
  }
  bead([[-xSide + 0.02, roof + 0.004, GLACIS_TOP_Z - 0.004], [xSide - 0.02, roof + 0.004, GLACIS_TOP_Z - 0.004]], 0.007);
  bead([[-xSide + 0.02, roof + 0.004, H.rearTopZ + 0.004], [xSide - 0.02, roof + 0.004, H.rearTopZ + 0.004]], 0.006);
  bead([[-xLow, H.lowRearY - 0.004, H.lowRearZ - 0.006], [xLow, H.lowRearY - 0.004, H.lowRearZ - 0.006]], 0.006);
  out.push(part(merge(w), P.paint));
  return out;
}

/* ------------------------------------------------------------------ differential housing */

/** Side profile of the E8543 housing (z, y), closed, counter-clockwise; k shrinks it at the ends. */
function housingProfile(k: number): P2[] {
  const c: P2 = [2.66, 0.74];
  const raw: P2[] = [
    [2.43, belly + 0.002],
    [2.6, belly + 0.018],
    [2.75, 0.505],
    [2.865, 0.58],
    [2.935, 0.66],
    [2.962, 0.725],
    [2.958, 0.765],
    [2.9, 0.87],
    [2.845, 0.975],
    [2.84, 1.004],
    [2.822, 1.028],
    [2.79, 1.036],
    [2.66, 1.036],
    [2.55, 1.0],
    [2.46, 0.9],
    [2.43, 0.7],
  ];
  return raw.map(([z, y]) => [c[0] + (z - c[0]) * k, c[1] + (y - c[1]) * k] as P2);
}

/** Plan curvature of the housing: the ends sweep back towards the final drives. */
const housingDz = (x: number) => -0.1 * Math.pow(Math.min(1, Math.abs(x) / 0.852), 3);

function housing(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const xs = [-0.852, -0.846, -0.834, -0.812, -0.76, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.76, 0.812, 0.834, 0.846, 0.852];
  const ks = xs.map((x) => {
    const e = 0.852 - Math.abs(x);
    return e > 0.09 ? 1 : 0.8 + 0.2 * Math.sin((e / 0.09) * Math.PI * 0.5);
  });
  // rings are (z, y); lofted along +Z then turned so the loft axis becomes X
  const secs = xs.map((x, i) => ({ z: x, ring: housingProfile(ks[i]).map(([z, y]) => [z + housingDz(x), y] as P2) }));
  const g = G.loftZ(secs, true, 28);
  g.rotateY(-Math.PI / 2); // (a, b, s) -> (-s, b, a): ring z -> Z, loft -> X
  out.push(part(g, P.cast));
  // bolt row along the top of the upper face, sheltered under the protective lip
  const bn = new THREE.Vector3(0, 0.055, 0.105).normalize();
  const bolts: { p: G.V3; n: G.V3; spin: number }[] = [];
  for (let i = 0; i < 19; i++) {
    const x = -0.74 + (1.48 * i) / 18;
    bolts.push({ p: [x, 0.962, 2.858 + housingDz(x)], n: [0, bn.y, bn.z], spin: i * 0.7 });
  }
  out.push(part(G.scatter(nut(0.03, 0.011), bolts), P.cast));
  // Fisher-style weld beads filling the bolt strip overcut at the ends
  const wb: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) wb.push(G.weld([[sx * (0.8 + i * 0.012), 1.02, 2.8], [sx * (0.8 + i * 0.012), 1.036, 2.72]], 0.005));
  }
  out.push(part(merge(wb), P.cast));
  // final drive flanges (the sprocket hub bolts on here)
  for (const sx of [-1, 1]) {
    const fd = group([
      part(latheX([[0.2, 0.0], [0.245, 0.0], [0.245, 0.03], [0.225, 0.036], [0.19, 0.036]], 40, 40), P.cast),
      part(G.scatter(nut(0.022, 0.009), boltRingX(0.225, 12, 0.036, 1, 0.12)), P.cast),
    ], { p: [sx * (xLow - 0.002), SPROCKET.y, SPROCKET.z], s: [sx, 1, 1] });
    out.push(fd);
    // cast-in towing lug with its quick-release shackle
    const lx = sx * 0.5;
    const lug = prism([[-0.07, 0.0], [0.03, -0.035], [0.1, 0.005], [0.105, 0.06], [0.05, 0.085], [-0.05, 0.08]], 0.075, 'zy', 0.012);
    out.push(part(lug, P.cast, { p: [lx, 0.585, 2.88] }));
    out.push(part(G.cyl(0.026, 0.026, 0.078, 12), P.void, { p: [lx, 0.625, 2.955], r: [0, 0, 90] }));
    const sh = group([
      part(G.tube([[-0.05, 0.0, 0.0], [-0.05, -0.07, 0.02], [-0.02, -0.12, 0.03], [0.02, -0.12, 0.03], [0.05, -0.07, 0.02], [0.05, 0.0, 0.0]], 0.017, 8, 40), P.toolSteel),
      part(G.cyl(0.018, 0.018, 0.13, 10), P.toolSteel, { r: [0, 0, 90] }),
      part(G.cyl(0.03, 0.03, 0.012, 12), P.toolSteel, { p: [0.066, 0, 0], r: [0, 0, 90] }),
      part(G.cyl(0.028, 0.028, 0.012, 6), P.toolSteel, { p: [-0.066, 0, 0], r: [0, 0, 90] }),
    ], { p: [lx, 0.625, 2.955], r: [6, 0, 0] });
    out.push(sh);
    // small welded footstep on the upper face
    const n = new THREE.Vector3(0, 0.215, 0.12).normalize();
    out.push(onSurface([part(uHandle(0.16, 0.05, 0.009, 6), P.paint, { r: [0, 0, 0] })], [sx * 0.62, 0.9, 2.9], [1, 0, 0], [0, n.y, n.z]));
  }
  return out;
}

/* ------------------------------------------------------------ hatch casting & front roof */

function m6Periscope(P: Pal): THREE.Object3D {
  // M6 periscope head in its holder, window facing +Z, base on y = 0
  const ps: THREE.Object3D[] = [];
  ps.push(part(rb(0.2, 0.03, 0.1, 0.008), P.cast, { p: [0, 0.015, 0] }));
  ps.push(part(rb(0.155, 0.06, 0.062, 0.006), P.gun, { p: [0, 0.055, 0.0] }));
  ps.push(part(G.box(0.13, 0.036, 0.004), P.vision, { p: [0, 0.058, 0.032] }));
  ps.push(part(rb(0.165, 0.012, 0.075, 0.004), P.gun, { p: [0, 0.089, 0.004] }));
  return group(ps);
}

function driverHatch(P: Pal, side: 1 | -1, variant: 'late' | 'early'): THREE.Object3D {
  // lying on the roof: local +Y up, +Z forward; hinge on the outboard side
  const ps: THREE.Object3D[] = [];
  const W = 0.5, L = 0.54;
  const ring = roundedRing([[-W / 2 - 0.04, -L / 2 - 0.04], [W / 2 + 0.04, -L / 2 - 0.04], [W / 2 + 0.04, L / 2 + 0.04], [-W / 2 - 0.04, L / 2 + 0.04]], [0.1, 0.1, 0.1, 0.1], 5, 1);
  // raised collar of the casting round the opening
  ps.push(part(prism(ring, 0.03, 'xz', 0.008), P.cast, { p: [0, 0.015, 0] }));
  const lid = roundedRing([[-W / 2, -L / 2], [W / 2, -L / 2], [W / 2, L / 2], [-W / 2, L / 2]], [0.08, 0.08, 0.08, 0.08], 5, 1);
  ps.push(part(prism(lid, 0.04, 'xz', 0.01), P.cast, { p: [0, 0.048, 0] }));
  ps.push(part(G.box(W - 0.02, 0.004, L - 0.02), P.void, { p: [0, 0.029, 0] }));
  // M6 periscope in the forward part of the hatch, with its guard
  const pe = m6Periscope(P);
  pe.position.set(0, 0.066, 0.13);
  ps.push(pe);
  ps.push(part(G.tube([[-0.13, 0.068, 0.2], [-0.12, 0.16, 0.22], [0.12, 0.16, 0.22], [0.13, 0.068, 0.2]], 0.008, 6, 30), P.cast));
  // spring-balanced hinge housing on the outboard edge
  const hx = side * (W / 2 + 0.035);
  ps.push(part(G.cyl(0.042, 0.042, 0.3, 18), P.cast, { p: [hx, 0.07, -0.05], r: [90, 0, 0] }));
  ps.push(part(rb(0.07, 0.03, 0.28, 0.008), P.cast, { p: [hx - side * 0.04, 0.07, -0.05] }));
  for (const z of [-0.2, 0.1]) ps.push(part(G.cyl(0.046, 0.046, 0.02, 18), P.cast, { p: [hx, 0.07, z], r: [90, 0, 0] }));
  // grab handle on the lid and the lock boss
  ps.push(part(uHandle(0.14, 0.04, 0.008), P.paint, { p: [-side * 0.05, 0.068, -0.14] }));
  ps.push(part(G.cyl(0.028, 0.032, 0.014, 14), P.cast, { p: [-side * 0.15, 0.075, -0.02] }));
  if (variant === 'early') ps.push(part(G.cyl(0.03, 0.03, 0.01, 14), P.toolSteel, { p: [-side * 0.15, 0.084, -0.02] }));
  return group(ps);
}

function ventilator(P: Pal, covered: boolean): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  // armoured mushroom ventilator dome
  ps.push(part(G.lathe([[0.0, 0.0], [0.13, 0.0], [0.13, 0.02], [0.11, 0.03], [0.1, 0.06], [0.0, 0.06]], 32, 40), P.cast));
  ps.push(part(G.lathe([[0.0, 0.1], [0.07, 0.098], [0.12, 0.088], [0.15, 0.07], [0.155, 0.06], [0.0, 0.06]], 32, 40), P.cast));
  if (covered) {
    // sheet metal cover (introduced Aug. 1944): open-fronted box bolted to the roof
    ps.push(part(G.box(0.36, 0.004, 0.34), P.sheet, { p: [0, 0.14, -0.02] }));
    for (const sx of [-1, 1]) ps.push(part(G.box(0.004, 0.14, 0.34), P.sheet, { p: [sx * 0.178, 0.07, -0.02] }));
    ps.push(part(G.box(0.36, 0.14, 0.004), P.sheet, { p: [0, 0.07, -0.19] }));
    for (const sx of [-1, 1]) ps.push(part(rb(0.04, 0.008, 0.36, 0.003), P.sheet, { p: [sx * 0.19, 0.004, -0.02] }));
    ps.push(part(G.scatter(nut(0.016, 0.007), [-0.12, 0.0, 0.12].flatMap((z) => [[0.19, 0.008, z - 0.02], [-0.19, 0.008, z - 0.02]] as G.V3[]).map((p) => ({ p }))), P.sheet));
    // rolled lip along the open front
    ps.push(part(G.cyl(0.006, 0.006, 0.36, 8), P.sheet, { p: [0, 0.14, 0.15], r: [0, 0, 90] }));
  } else {
    // U-bolt for the drivers' hatch padlocks
    ps.push(part(G.tube([[-0.04, 0.0, 0.2], [-0.04, 0.05, 0.2], [0.0, 0.07, 0.2], [0.04, 0.05, 0.2], [0.04, 0.0, 0.2]], 0.008, 6, 20), P.toolSteel));
  }
  return group(ps);
}

function hatchCasting(P: Pal, variant: 'late' | 'early'): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const z0 = GLACIS_TOP_Z + 0.004, z1 = 0.99;
  // the E8020 casting spanning the full width of the front roof
  const plan = roundedRing([[-xSide + 0.005, z1], [xSide - 0.005, z1], [xSide - 0.005, z0], [-xSide + 0.005, z0]], [0.02, 0.02, 0.01, 0.01], 3, 0);
  out.push(part(prism(plan, 0.05, 'xz', 0.012), P.cast, { p: [0, roof - 0.012, 0] }));
  const top = roof + 0.013;
  const hz = 1.4;
  for (const side of [1, -1] as const) {
    const h = driverHatch(P, side, variant);
    h.position.set(side * 0.44, top, hz);
    out.push(h);
    // fixed auxiliary periscope ahead of the hatch with its (short) bullet splash
    const pe = m6Periscope(P);
    pe.position.set(side * 0.44, top, 1.72);
    out.push(pe);
    out.push(part(prism([[-0.12, 0], [0.12, 0], [0.1, 0.05], [-0.1, 0.05]], 0.03, 'xy', 0.006), P.cast, { p: [side * 0.44, top, 1.8], r: [-18, 0, 0] }));
    for (const sx of [-1, 1]) out.push(part(prism([[0, 0], [0.09, 0], [0.09, 0.03], [0, 0.07]], 0.022, 'zy', 0.005), P.cast, { p: [side * 0.44 + sx * 0.12, top, 1.71] }));
  }
  const v = ventilator(P, variant === 'late');
  v.position.set(0, top, 1.46);
  out.push(v);
  return out;
}

/* ------------------------------------------------------------------------ engine deck */

function splashU(w: number, d: number, h: number): THREE.BufferGeometry {
  // U-shaped bullet splash bar: open towards -Z (rear)
  const parts: THREE.BufferGeometry[] = [];
  parts.push(G.rbox(w, h, 0.03, 0.008, 1).translate(0, h / 2, d / 2));
  for (const s of [-1, 1]) parts.push(G.rbox(0.03, h, d, 0.008, 1).translate((s * (w - 0.03)) / 2, h / 2, 0));
  return merge(parts);
}

function fillerCap(P: Pal): THREE.Object3D {
  return group([
    part(G.lathe([[0.0, 0.0], [0.1, 0.0], [0.1, 0.012], [0.09, 0.02], [0.0, 0.02]], 28, 40), P.cast),
    part(G.lathe([[0.0, 0.02], [0.07, 0.02], [0.07, 0.04], [0.06, 0.05], [0.0, 0.052]], 24, 40), P.cast),
    part(rb(0.1, 0.022, 0.024, 0.006), P.cast, { p: [0, 0.062, 0] }),
    part(G.scatter(nut(0.014, 0.006), Array.from({ length: 6 }, (_, i) => ({ p: [Math.cos(i * 1.047) * 0.085, 0.02, Math.sin(i * 1.047) * 0.085] as G.V3 }))), P.cast),
  ]);
}

function engineDeck(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const top = roof;
  // turret race splash guard ring
  const ring: THREE.BufferGeometry[] = [];
  const R0 = TURRET.ringR + 0.1;
  const segs = 64;
  const pts: P2[] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push([Math.cos(a) * (R0 + 0.025), Math.sin(a) * (R0 + 0.025)]);
  }
  const s = G.shape(pts);
  const hole = new THREE.Path();
  for (let i = 0; i <= segs; i++) {
    const a = -(i / segs) * Math.PI * 2;
    const x = Math.cos(a) * R0, y = Math.sin(a) * R0;
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  s.holes.push(hole);
  const rg = G.extrude(s, 0.05, 0.006, 1, 1);
  rg.rotateX(-Math.PI / 2);
  ring.push(rg);
  out.push(part(merge(ring), P.paint, { p: [0, top + 0.025, TURRET.z] }));
  // single large drain hole at the rear of the splash ring
  out.push(part(G.cyl(0.022, 0.022, 0.06, 12), P.void, { p: [0, top + 0.022, TURRET.z - R0 - 0.012], r: [90, 0, 0] }));

  // forward engine deck plate: coolant filler with its U-shaped splash, fuel fillers each side
  out.push(part(rb(1.42, 0.02, 0.4, 0.004), P.paint, { p: [0, top + 0.004, -1.26] }));
  const fc = fillerCap(P);
  fc.position.set(0, top + 0.014, -1.27);
  out.push(fc);
  out.push(part(splashU(0.34, 0.3, 0.07), P.paint, { p: [0, top + 0.012, -1.26] }));
  for (const sx of [-1, 1]) {
    const f = fillerCap(P);
    f.position.set(sx * 1.02, top, -1.17);
    out.push(f);
    out.push(part(splashU(0.3, 0.28, 0.065), P.paint, { p: [sx * 1.02, top, -1.16] }));
  }
  // grilled engine access doors (left and right), hinged on the outboard edges
  const dz0 = -1.475, dz1 = -2.215, dl = dz0 - dz1;
  for (const sx of [-1, 1]) {
    const cx = sx * 0.365;
    const door: THREE.Object3D[] = [];
    // frame plate with a rectangular grille opening
    const outer = G.shape([[-0.345, -dl / 2], [0.345, -dl / 2], [0.345, dl / 2], [-0.345, dl / 2]]);
    const hole = new THREE.Path();
    const gw = 0.25, gl = dl / 2 - 0.07;
    hole.moveTo(-gw, -gl);
    hole.lineTo(-gw, gl);
    hole.lineTo(gw, gl);
    hole.lineTo(gw, -gl);
    hole.closePath();
    outer.holes.push(hole);
    const plate = G.extrude(outer, 0.026, 0.005, 1, 1);
    plate.rotateX(-Math.PI / 2);
    door.push(part(plate, P.paint, { p: [0, 0.013, 0] }));
    // tightly spaced grille bars, set into the opening
    const bars: THREE.BufferGeometry[] = [];
    const nb = 21;
    for (let i = 0; i < nb; i++) {
      const b = G.box(2 * gw, 0.03, 0.0075);
      b.rotateX(-20 * D);
      b.translate(0, 0.008, -gl + ((2 * gl) * (i + 0.5)) / nb);
      bars.push(b);
    }
    bars.push(G.box(0.012, 0.028, 2 * gl).translate(0, 0.01, 0));
    door.push(part(merge(bars), P.paint));
    door.push(part(G.box(2 * gw, 0.004, 2 * gl), P.void, { p: [0, -0.012, 0] }));
    // hinges on the outboard edge
    for (const z of [-0.24, 0.24]) {
      door.push(part(G.cyl(0.024, 0.024, 0.12, 14), P.paint, { p: [sx * 0.36, 0.022, z], r: [90, 0, 0] }));
      door.push(part(rb(0.07, 0.014, 0.1, 0.004), P.paint, { p: [sx * 0.32, 0.028, z] }));
      door.push(part(rb(0.07, 0.014, 0.1, 0.004), P.paint, { p: [sx * 0.4, 0.004, z] }));
    }
    // welded lifting handle near the inboard edge, hold-down bolts at the mating corners
    door.push(part(uHandle(0.16, 0.05, 0.009), P.paint, { p: [-sx * 0.29, 0.026, 0], r: [0, 90, 0] }));
    door.push(part(G.scatter(nut(0.03, 0.012), [[-sx * 0.315, 0.026, dl / 2 - 0.035], [-sx * 0.315, 0.026, -dl / 2 + 0.035]].map((p) => ({ p: p as G.V3 }))), P.paint));
    out.push(group(door, { p: [cx, top, (dz0 + dz1) / 2] }));
    // rubber-faced door bumper on the deck strip outboard of the door
    out.push(part(rb(0.06, 0.035, 0.08, 0.008), P.paint, { p: [sx * 0.8, top + 0.017, -1.84] }));
    out.push(part(rb(0.045, 0.012, 0.06, 0.004), P.rubber, { p: [sx * 0.8, top + 0.04, -1.84] }));
  }
  // rearmost engine deck plates (two pieces) with welded lifting handles
  for (const sx of [-1, 1]) {
    out.push(part(rb(0.705, 0.024, 0.37, 0.005), P.paint, { p: [sx * 0.36, top + 0.006, -2.42] }));
    out.push(part(uHandle(0.18, 0.055, 0.01), P.paint, { p: [sx * 0.36, top + 0.018, -2.44] }));
    out.push(part(G.scatter(nut(0.026, 0.01), [[sx * 0.06, top + 0.018, -2.27], [sx * 0.66, top + 0.018, -2.27], [sx * 0.06, top + 0.018, -2.58], [sx * 0.66, top + 0.018, -2.58]].map((p) => ({ p: p as G.V3 }))), P.paint));
  }
  // rear hull lifting rings on the deck corners
  for (const sx of [-1, 1]) {
    out.push(part(rb(0.1, 0.03, 0.08, 0.01), P.cast, { p: [sx * 1.18, top + 0.015, -2.5] }));
    out.push(part(G.torus(0.04, 0.014, 8, 20), P.cast, { p: [sx * 1.18, top + 0.06, -2.5], r: [0, 90, 0] }));
  }
  return out;
}

/** The whole hull. `variant` 'late' = Aug. 1944 on (ventilator cover); 'early' = open ventilator. */
export function hull(P: Pal, variant: 'late' | 'early'): THREE.Group {
  return group([...armour(P), ...housing(P), ...hatchCasting(P, variant), ...engineDeck(P)], { name: 'hull' });
}
