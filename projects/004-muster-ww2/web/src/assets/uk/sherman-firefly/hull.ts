/**
 * Sherman V (M4A4) welded "small hatch" hull as converted for the Firefly Vc: rolled plates with real
 * thickness (2 in glacis at 56 deg, 1.5 in sides and rear, 0.75 in roof), the two drivers' hoods
 * protruding from the glacis with their British-fitted applique plates, small drivers' hatches with
 * periscopes, the three-piece bolted final drive housing, the plated-over hull MG port (the hull
 * gunner's position was given over to 17-pdr ammunition), the lengthened engine deck with the
 * rectangular bulge behind the turret (and the matching belly blister for the A57 cooling fan),
 * welded side applique plates, floor escape hatch, inspection plates and weld beads.
 *
 * Frame: +Z forward, +X = the tank's left, y = 0 ground.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Pal } from './palette';
import { H, GLACIS_TOP_Z, GLACIS_DEG, HOOD, SPROCKET, TURRET, ZS } from './dims';
import { slab, onSurface, roundedRing, prism, latheX, boltRingX, nut, rb, uHandle, merge, D, type P2, type P3 } from './util';

const { xLow, xSide, roof, sponson: ySp, belly } = H;
const SG = Math.sin(GLACIS_DEG * D), CG = Math.cos(GLACIS_DEG * D), TG = Math.tan(GLACIS_DEG * D);
const REAR_A = Math.atan2(H.rearTopZ - H.rearBotZ, roof - ySp); // upper rear plate angle from vertical
const SR = Math.sin(REAR_A), CR = Math.cos(REAR_A);

/** Glacis frame: a across (x), b measured DOWN the plate from its top edge. */
export const glacis = {
  n: [0, SG, CG] as P3,
  at: (a: number, b: number, off = 0): P3 => [a, roof - b * CG + off * SG, GLACIS_TOP_Z + b * SG + off * CG],
  down: [0, -CG, SG] as P3,
  len: (roof - H.glacisY) / CG,
};

/** Upper rear plate frame: b measured DOWN the plate from its top edge. */
export const rearPlate = {
  n: [0, SR, -CR] as P3,
  at: (a: number, b: number, off = 0): P3 => [a, roof - b * CR + off * SR, H.rearTopZ - b * SR - off * CR],
  len: Math.hypot(roof - ySp, H.rearTopZ - H.rearBotZ),
};

/** glacis outer face z at height y */
const glacisZAt = (y: number) => H.glacisZ - (y - H.glacisY) * TG;

/** Engine deck start (bulkhead line behind the turret). */
export const DECK_Z = -1.0;

/* ------------------------------------------------------------------------------ armour */

function armour(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const tS = H.tSide;
  const zGs = glacisZAt(ySp); // glacis outer face at sponson height
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
  // A57 cooling fan blister under the belly, below the deck bulge
  out.push(part(rb(1.0, 0.06, 0.62, 0.02), P.paint, { p: [0, belly - 0.028, -1.22] }));
  // floor escape hatch behind the (now unused) hull gunner's seat, drain valves, inspection plates
  {
    const hx = -0.42, hz = 1.3 + ZS;
    const lid = roundedRing([[-0.23, -0.29], [0.23, -0.29], [0.23, 0.29], [-0.23, 0.29]], [0.06, 0.06, 0.06, 0.06], 4, 1);
    out.push(part(prism(lid, 0.016, 'xz', 0.004), P.paint, { p: [hx, belly - 0.008, hz] }));
    out.push(part(G.scatter(nut(0.022, 0.008), [[-0.18, -0.24], [0.18, -0.24], [-0.18, 0.24], [0.18, 0.24]].map(([x, z]) => ({ p: [hx + x, belly - 0.016, hz + z] as G.V3, n: [0, -1, 0] as G.V3 }))), P.paint));
    for (const x of [-0.12, 0.12]) out.push(part(G.cyl(0.02, 0.02, 0.09, 12), P.paint, { p: [hx + x, belly - 0.018, hz + 0.3], r: [0, 0, 90] }));
    const plates: [number, number, number][] = [[0.42, 1.62, 0.09], [0.0, 0.67, 0.075], [0.45, -0.25, 0.075], [-0.45, -0.25, 0.075], [0.0, -1.85, 0.11], [0.0, -2.35, 0.09]];
    for (const [x, z, r] of plates) {
      out.push(part(G.cyl(r, r + 0.006, 0.012, 22), P.paint, { p: [x, belly - 0.006, z] }));
      out.push(part(G.scatter(nut(0.018, 0.007), Array.from({ length: 6 }, (_, i) => ({ p: [x + Math.cos(i * 1.047) * (r - 0.02), belly - 0.012, z + Math.sin(i * 1.047) * (r - 0.02)] as G.V3, n: [0, -1, 0] as G.V3 }))), P.paint));
    }
  }
  // roof over the fighting compartment (hoods and engine deck sit on / ahead of / behind it)
  out.push(part(slab([[-xSide, roof, GLACIS_TOP_Z + 0.01], [xSide, roof, GLACIS_TOP_Z + 0.01], [xSide, roof, DECK_Z], [-xSide, roof, DECK_Z]], H.tRoof, [0, 1, 0], 0.004), P.paint));
  // engine deck side strips and the plate under the doors
  for (const sx of [-1, 1]) {
    out.push(part(slab([[sx * 0.72, roof, DECK_Z], [sx * xSide, roof, DECK_Z], [sx * xSide, roof, H.rearTopZ], [sx * 0.72, roof, H.rearTopZ]], H.tRoof, [0, 1, 0], 0.004), P.paint));
  }
  out.push(part(G.box(1.44, 0.01, 1.9), P.void, { p: [0, roof - 0.02, -1.8] }));
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

  // welded applique plates on the sponson sides (two on the right, one on the left)
  const app: [number, number, number, number][] = [
    // side, z centre, length, height
    [1, TURRET.z - 0.12, 0.64, 0.46],
    [-1, TURRET.z - 0.05, 0.64, 0.46],
    [-1, TURRET.z + 0.86, 0.5, 0.42],
  ];
  const w: THREE.BufferGeometry[] = [];
  const bead = (pts: P3[], r = 0.0075) => w.push(G.weld(pts, r));
  for (const [sx, zc, L, hgt] of app) {
    const yc = 1.56;
    const o = roundedRing([[-L / 2, -hgt / 2], [L / 2, -hgt / 2], [L / 2, hgt / 2], [-L / 2, hgt / 2]], [0.05, 0.05, 0.05, 0.05], 4, 1);
    out.push(part(prism(o, 0.025, 'zy', 0.006), P.paint, { p: [sx * (xSide + 0.0125), yc, zc] }));
    const xw = sx * (xSide + 0.004);
    bead([[xw, yc - hgt / 2 - 0.004, zc - L / 2 + 0.03], [xw, yc - hgt / 2 - 0.004, zc + L / 2 - 0.03]], 0.006);
    bead([[xw, yc + hgt / 2 + 0.004, zc - L / 2 + 0.03], [xw, yc + hgt / 2 + 0.004, zc + L / 2 - 0.03]], 0.006);
    for (const s of [-1, 1]) bead([[xw, yc - hgt / 2 + 0.03, zc + s * (L / 2 + 0.004)], [xw, yc + hgt / 2 - 0.03, zc + s * (L / 2 + 0.004)]], 0.006);
  }

  // weld beads along the main joints
  for (const sx of [-1, 1]) {
    bead([[sx * (xSide + 0.002), H.glacisY + 0.02, H.glacisZ - 0.03], [sx * (xSide + 0.002), roof - 0.005, GLACIS_TOP_Z + 0.004]]);
    bead([[sx * (xSide + 0.002), ySp + 0.01, H.rearBotZ + 0.004], [sx * (xSide + 0.002), roof - 0.005, H.rearTopZ - 0.004]]);
    bead([[sx * (xSide - 0.004), ySp - 0.004, H.rearBotZ + 0.03], [sx * (xSide - 0.004), ySp - 0.004, zGs - 0.06]], 0.006);
    bead([[sx * (xSide - 0.003), roof + 0.003, GLACIS_TOP_Z - 0.03], [sx * (xSide - 0.003), roof + 0.003, H.rearTopZ + 0.01]], 0.0055);
    bead([[sx * (xLow + 0.001), H.lowRearY, H.lowRearZ - 0.004], [sx * (xLow + 0.001), ySp - 0.01, H.lowRearZ - 0.004]], 0.006);
  }
  bead([[-xSide + 0.02, roof + 0.004, GLACIS_TOP_Z - 0.004], [-HOOD.x1, roof + 0.004, GLACIS_TOP_Z - 0.004]], 0.007);
  bead([[xSide - 0.02, roof + 0.004, GLACIS_TOP_Z - 0.004], [HOOD.x1, roof + 0.004, GLACIS_TOP_Z - 0.004]], 0.007);
  bead([[-HOOD.x0, roof + 0.004, GLACIS_TOP_Z - 0.004], [HOOD.x0, roof + 0.004, GLACIS_TOP_Z - 0.004]], 0.007);
  bead([[-xSide + 0.02, roof + 0.004, H.rearTopZ + 0.004], [xSide - 0.02, roof + 0.004, H.rearTopZ + 0.004]], 0.006);
  bead([[-xLow, H.lowRearY - 0.004, H.lowRearZ - 0.006], [xLow, H.lowRearY - 0.004, H.lowRearZ - 0.006]], 0.006);
  out.push(part(merge(w), P.paint));
  return out;
}

/* ------------------------------------------------------------- three-piece final drive housing */

const HC: P2 = [2.66 + ZS, 0.74];
/** Side profile of the three-piece housing (z, y), closed, counter-clockwise; k scales about HC. */
function housingProfile(k: number): P2[] {
  const raw: P2[] = [
    [2.43, belly + 0.002],
    [2.6, belly + 0.012],
    [2.72, 0.475],
    [2.82, 0.54],
    [2.895, 0.625],
    [2.935, 0.72],
    [2.94, 0.8],
    [2.915, 0.885],
    [2.87, 0.955],
    [2.82, 1.012],
    [2.79, 1.034],
    [2.66, 1.036],
    [2.55, 1.0],
    [2.46, 0.9],
    [2.43, 0.7],
  ];
  return raw.map(([z, y]) => [HC[0] + (z + ZS - HC[0]) * k, HC[1] + (y - HC[1]) * k] as P2);
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
  const secs = xs.map((x, i) => ({ z: x, ring: housingProfile(ks[i]).map(([z, y]) => [z + housingDz(x), y] as P2) }));
  const g = G.loftZ(secs, true, 28);
  g.rotateY(-Math.PI / 2);
  out.push(part(g, P.cast));
  // the two vertical bolted joint flanges between the centre and side castings
  const outer = housingProfile(1).slice(0, 11); // bottom-rear round the nose to the top joint
  const fl: THREE.BufferGeometry[] = [];
  const bolts: { p: G.V3; n: G.V3; spin: number }[] = [];
  for (const xj of [-0.4, 0.4]) {
    const dz = housingDz(xj);
    const ring = housingProfile(1.06).map(([z, y]) => [z + dz, y] as P2);
    const f = G.loftZ([{ z: xj - 0.032, ring }, { z: xj + 0.032, ring }], true, 30);
    f.rotateY(-Math.PI / 2);
    fl.push(f);
    // bolts along both faces of the flange, following the profile
    let acc = 0;
    for (let i = 1; i < outer.length; i++) {
      const a = outer[i - 1], b = outer[i];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      while (acc < L) {
        const t = acc / L;
        const z = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        // pull the bolt slightly inside the flange edge (towards the profile centre)
        const q: P2 = [HC[0] + (z - HC[0]) * 1.035, HC[1] + (y - HC[1]) * 1.035];
        if (q[1] > belly + 0.05) for (const s of [-1, 1]) bolts.push({ p: [xj + s * 0.032, q[1], q[0] + dz], n: [s, 0, 0], spin: i + acc * 9 });
        acc += 0.075;
      }
      acc -= L;
    }
  }
  out.push(part(merge(fl), P.cast));
  out.push(part(G.scatter(nut(0.028, 0.012), bolts), P.cast));
  // bolt row along the top flange where the housing meets the hull
  const bn = new THREE.Vector3(0, 0.6, 0.8).normalize();
  const top: { p: G.V3; n: G.V3; spin: number }[] = [];
  for (let i = 0; i < 21; i++) {
    const x = -0.78 + (1.56 * i) / 20;
    top.push({ p: [x, 1.0, 2.845 + ZS + housingDz(x)], n: [0, bn.y, bn.z], spin: i * 0.7 });
  }
  out.push(part(G.scatter(nut(0.03, 0.011), top), P.cast));
  // final drive flanges (the sprocket hub bolts on here)
  for (const sx of [-1, 1]) {
    const fd = group([
      part(latheX([[0.2, 0.0], [0.245, 0.0], [0.245, 0.03], [0.225, 0.036], [0.19, 0.036]], 40, 40), P.cast),
      part(G.scatter(nut(0.022, 0.009), boltRingX(0.225, 12, 0.036, 1, 0.12)), P.cast),
    ], { p: [sx * (xLow - 0.002), SPROCKET.y, SPROCKET.z], s: [sx, 1, 1] });
    out.push(fd);
    // cast-in towing lug with its quick-release shackle
    const lx = sx * 0.62;
    const lug = prism([[-0.07, 0.0], [0.03, -0.035], [0.1, 0.005], [0.105, 0.06], [0.05, 0.085], [-0.05, 0.08]], 0.075, 'zy', 0.012);
    out.push(part(lug, P.cast, { p: [lx, 0.585, 2.84 + ZS + housingDz(lx)] }));
    out.push(part(G.cyl(0.026, 0.026, 0.078, 12), P.void, { p: [lx, 0.625, 2.915 + ZS + housingDz(lx)], r: [0, 0, 90] }));
    const sh = group([
      part(G.tube([[-0.05, 0.0, 0.0], [-0.05, -0.07, 0.02], [-0.02, -0.12, 0.03], [0.02, -0.12, 0.03], [0.05, -0.07, 0.02], [0.05, 0.0, 0.0]], 0.017, 8, 40), P.toolSteel),
      part(G.cyl(0.018, 0.018, 0.13, 10), P.toolSteel, { r: [0, 0, 90] }),
      part(G.cyl(0.03, 0.03, 0.012, 12), P.toolSteel, { p: [0.066, 0, 0], r: [0, 0, 90] }),
      part(G.cyl(0.028, 0.028, 0.012, 6), P.toolSteel, { p: [-0.066, 0, 0], r: [0, 0, 90] }),
    ], { p: [lx, 0.625, 2.915 + ZS + housingDz(lx)], r: [6, 0, 0] });
    out.push(sh);
  }
  return out;
}

/* ------------------------------------------------------------ drivers' hoods & front roof */

function m6Periscope(P: Pal): THREE.Object3D {
  // M6 periscope head in its holder, window facing +Z, base on y = 0
  const ps: THREE.Object3D[] = [];
  ps.push(part(rb(0.2, 0.03, 0.1, 0.008), P.cast, { p: [0, 0.015, 0] }));
  ps.push(part(rb(0.155, 0.06, 0.062, 0.006), P.gun, { p: [0, 0.055, 0.0] }));
  ps.push(part(G.box(0.13, 0.036, 0.004), P.vision, { p: [0, 0.058, 0.032] }));
  ps.push(part(rb(0.165, 0.012, 0.075, 0.004), P.gun, { p: [0, 0.089, 0.004] }));
  return group(ps);
}

function driverHatch(P: Pal, side: 1 | -1): THREE.Object3D {
  // small drivers' hatch lying on the roof: local +Y up, +Z forward; hinge on the outboard side
  const ps: THREE.Object3D[] = [];
  const W = 0.44, L = 0.46;
  const ring = roundedRing([[-W / 2 - 0.035, -L / 2 - 0.035], [W / 2 + 0.035, -L / 2 - 0.035], [W / 2 + 0.035, L / 2 + 0.035], [-W / 2 - 0.035, L / 2 + 0.035]], [0.08, 0.08, 0.08, 0.08], 5, 1);
  ps.push(part(prism(ring, 0.024, 'xz', 0.006), P.paint, { p: [0, 0.012, 0] }));
  const lid = roundedRing([[-W / 2, -L / 2], [W / 2, -L / 2], [W / 2, L / 2], [-W / 2, L / 2]], [0.06, 0.06, 0.06, 0.06], 5, 1);
  ps.push(part(prism(lid, 0.036, 'xz', 0.009), P.paint, { p: [0, 0.04, 0] }));
  ps.push(part(G.box(W - 0.02, 0.004, L - 0.02), P.void, { p: [0, 0.023, 0] }));
  // M6 periscope in the hatch
  const pe = m6Periscope(P);
  pe.position.set(0.0, 0.056, 0.1);
  ps.push(pe);
  // hinges on the outboard edge
  const hx = side * (W / 2 + 0.03);
  for (const z of [-0.13, 0.13]) {
    ps.push(part(G.cyl(0.03, 0.03, 0.1, 16), P.cast, { p: [hx, 0.05, z], r: [90, 0, 0] }));
    ps.push(part(rb(0.07, 0.02, 0.09, 0.006), P.cast, { p: [hx - side * 0.04, 0.058, z] }));
  }
  ps.push(part(G.cyl(0.012, 0.012, 0.4, 8), P.toolSteel, { p: [hx, 0.05, 0], r: [90, 0, 0] }));
  // grab handle and lock boss
  ps.push(part(uHandle(0.12, 0.035, 0.008), P.paint, { p: [-side * 0.08, 0.058, -0.12] }));
  ps.push(part(G.cyl(0.026, 0.03, 0.012, 14), P.cast, { p: [-side * 0.15, 0.064, 0.0] }));
  return group(ps);
}

function ventilator(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.13, 0.0], [0.13, 0.02], [0.11, 0.03], [0.1, 0.06], [0.0, 0.06]], 32, 40), P.cast));
  ps.push(part(G.lathe([[0.0, 0.1], [0.07, 0.098], [0.12, 0.088], [0.15, 0.07], [0.155, 0.06], [0.0, 0.06]], 32, 40), P.cast));
  return group(ps);
}

function hoods(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const tf = Math.tan(HOOD.frontDeg * D);
  // hood front face: z = zTop + (roof - y) * tf ; glacis: z = glacisZAt(y)
  const yMeet = (HOOD.zTop + roof * tf - H.glacisZ - H.glacisY * TG) / (tf - TG);
  const zMeet = HOOD.zTop + (roof - yMeet) * tf;
  const zBack = GLACIS_TOP_Z - 0.03;
  const outline: P2[] = [
    [zBack, roof],
    [HOOD.zTop, roof],
    [zMeet + 0.04 * Math.sin(HOOD.frontDeg * D), yMeet - 0.04 * Math.cos(HOOD.frontDeg * D)],
    [zBack, roof - 0.14],
  ];
  const wH = HOOD.x1 - HOOD.x0;
  const hoodGeo = prism(outline, wH, 'zy', 0.01);
  // applique plate welded on the front face (1 in, a little wider than the hood)
  const fn = new THREE.Vector3(0, Math.sin(HOOD.frontDeg * D), Math.cos(HOOD.frontDeg * D));
  const fLen = (roof - yMeet) / Math.cos(HOOD.frontDeg * D);
  const w: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const xc = sx * (HOOD.x0 + HOOD.x1) / 2;
    out.push(part(hoodGeo, P.paint, { p: [xc, 0, 0] }));
    // applique plate: centred on the face, 0.0125 out
    const mid = new THREE.Vector3(xc, (roof + yMeet) / 2 - 0.01, (HOOD.zTop + zMeet) / 2);
    const plate = G.rbox(wH + 0.04, fLen + 0.03, 0.025, 0.006, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), fn);
    const pm = part(plate, P.paint);
    pm.quaternion.copy(q);
    pm.position.copy(mid).addScaledVector(fn, 0.0125);
    out.push(pm);
    // weld beads: hood sides to the glacis, plate edges
    for (const x of [xc - wH / 2, xc + wH / 2]) {
      w.push(G.weld([[x, yMeet + 0.01, zMeet - 0.01], [x, roof - 0.01, GLACIS_TOP_Z + 0.01]], 0.0065));
    }
    w.push(G.weld([[xc - wH / 2 - 0.02, yMeet - 0.005, zMeet + 0.01], [xc + wH / 2 + 0.02, yMeet - 0.005, zMeet + 0.01]], 0.0065));
    // welded-up direct vision port on the front face (late M4A4) - a raised patch in the applique
    const dv = part(G.rbox(0.2, 0.06, 0.012, 0.004, 1), P.paint);
    dv.quaternion.copy(q);
    dv.position.copy(mid).addScaledVector(fn, 0.029).add(new THREE.Vector3(sx * -0.02, 0.05, -0.03));
    out.push(dv);
    // fixed periscope in the hood top ahead of the hatch, with a small guard
    const pe = m6Periscope(P);
    pe.position.set(sx * 0.45, roof, HOOD.zTop - 0.1);
    out.push(pe);
    out.push(part(G.tube([[sx * 0.45 - 0.13, roof, HOOD.zTop - 0.04], [sx * 0.45 - 0.12, roof + 0.13, HOOD.zTop - 0.03], [sx * 0.45 + 0.12, roof + 0.13, HOOD.zTop - 0.03], [sx * 0.45 + 0.13, roof, HOOD.zTop - 0.04]], 0.008, 6, 30), P.cast));
    // small drivers' hatch
    const h = driverHatch(P, sx as 1 | -1);
    h.position.set(sx * 0.45, roof, 1.47);
    out.push(h);
  }
  out.push(part(merge(w), P.paint));
  const v = ventilator(P);
  v.position.set(0, roof, 1.37);
  out.push(v);
  return out;
}

/** Plated-over hull MG port: round armour plug welded into the ball-mount opening. */
function mgPortPlug(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.2, 0.0], [0.19, 0.03], [0.17, 0.045], [0.0, 0.05]], 36, 40), P.cast));
  ps.push(part(G.lathe([[0.0, 0.045], [0.13, 0.045], [0.12, 0.07], [0.0, 0.075]], 32, 40), P.paint));
  ps.push(part(G.torus(0.2, 0.008, 6, 36), P.paint, { p: [0, 0.004, 0], r: [90, 0, 0] }));
  ps.push(part(G.scatter(nut(0.02, 0.008), Array.from({ length: 8 }, (_, i) => ({ p: [Math.cos((i / 8) * Math.PI * 2 + 0.2) * 0.165, 0.042, Math.sin((i / 8) * Math.PI * 2 + 0.2) * 0.165] as G.V3 }))), P.cast));
  out.push(onSurface(ps, glacis.at(-0.38, 0.98), [1, 0, 0], glacis.n));
  return out;
}

/* ------------------------------------------------------------------------ engine deck */

function splashU(w: number, d: number, h: number): THREE.BufferGeometry {
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
  out.push(part(rg, P.paint, { p: [0, top + 0.025, TURRET.z] }));

  // rectangular bulge across the deck just behind the turret (A57 cooling fan), bolted cover plate
  const bz = -1.22;
  out.push(part(rb(1.56, 0.1, 0.5, 0.02), P.paint, { p: [0, top + 0.04, bz] }));
  out.push(part(rb(1.3, 0.02, 0.36, 0.006), P.paint, { p: [0, top + 0.095, bz] }));
  const bb: G.V3[] = [];
  for (let i = 0; i < 9; i++) for (const dz of [-0.2, 0.2]) bb.push([-0.68 + (1.36 * i) / 8, top + 0.09, bz + dz]);
  out.push(part(G.scatter(nut(0.024, 0.009), bb.map((p) => ({ p }))), P.paint));
  out.push(part(uHandle(0.16, 0.05, 0.009), P.paint, { p: [0, top + 0.105, bz] }));
  // fuel fillers each side of the bulge with their U-shaped splash guards
  for (const sx of [-1, 1]) {
    const f = fillerCap(P);
    f.position.set(sx * 1.03, top, -1.2);
    out.push(f);
    out.push(part(splashU(0.3, 0.28, 0.065), P.paint, { p: [sx * 1.03, top, -1.19] }));
  }
  // grilled engine access doors (left and right), hinged on the outboard edges
  const dz0 = -1.56, dz1 = -2.48, dl = dz0 - dz1;
  for (const sx of [-1, 1]) {
    const cx = sx * 0.365;
    const door: THREE.Object3D[] = [];
    const outer = G.shape([[-0.345, -dl / 2], [0.345, -dl / 2], [0.345, dl / 2], [-0.345, dl / 2]]);
    const hole2 = new THREE.Path();
    const gw = 0.25, gl = dl / 2 - 0.07;
    hole2.moveTo(-gw, -gl);
    hole2.lineTo(-gw, gl);
    hole2.lineTo(gw, gl);
    hole2.lineTo(gw, -gl);
    hole2.closePath();
    outer.holes.push(hole2);
    const plate = G.extrude(outer, 0.026, 0.005, 1, 1);
    plate.rotateX(-Math.PI / 2);
    door.push(part(plate, P.paint, { p: [0, 0.013, 0] }));
    const bars: THREE.BufferGeometry[] = [];
    const nb = 26;
    for (let i = 0; i < nb; i++) {
      const b = G.box(2 * gw, 0.03, 0.0075);
      b.rotateX(-20 * D);
      b.translate(0, 0.008, -gl + ((2 * gl) * (i + 0.5)) / nb);
      bars.push(b);
    }
    bars.push(G.box(0.012, 0.028, 2 * gl).translate(0, 0.01, 0));
    door.push(part(merge(bars), P.paint));
    door.push(part(G.box(2 * gw, 0.004, 2 * gl), P.void, { p: [0, -0.012, 0] }));
    for (const z of [-0.3, 0.3]) {
      door.push(part(G.cyl(0.024, 0.024, 0.12, 14), P.paint, { p: [sx * 0.36, 0.022, z], r: [90, 0, 0] }));
      door.push(part(rb(0.07, 0.014, 0.1, 0.004), P.paint, { p: [sx * 0.32, 0.028, z] }));
      door.push(part(rb(0.07, 0.014, 0.1, 0.004), P.paint, { p: [sx * 0.4, 0.004, z] }));
    }
    door.push(part(uHandle(0.16, 0.05, 0.009), P.paint, { p: [-sx * 0.29, 0.026, 0], r: [0, 90, 0] }));
    door.push(part(G.scatter(nut(0.03, 0.012), [[-sx * 0.315, 0.026, dl / 2 - 0.035], [-sx * 0.315, 0.026, -dl / 2 + 0.035]].map((p) => ({ p: p as G.V3 }))), P.paint));
    out.push(group(door, { p: [cx, top, (dz0 + dz1) / 2] }));
    out.push(part(rb(0.06, 0.035, 0.08, 0.008), P.paint, { p: [sx * 0.8, top + 0.017, -2.0] }));
    out.push(part(rb(0.045, 0.012, 0.06, 0.004), P.rubber, { p: [sx * 0.8, top + 0.04, -2.0] }));
  }
  // plate between the bulge and the doors
  out.push(part(rb(1.42, 0.02, 0.1, 0.004), P.paint, { p: [0, top + 0.004, -1.51] }));
  // rearmost engine deck plates (two pieces) with welded lifting handles
  for (const sx of [-1, 1]) {
    out.push(part(rb(0.705, 0.024, 0.3, 0.005), P.paint, { p: [sx * 0.36, top + 0.006, -2.64] }));
    out.push(part(uHandle(0.18, 0.055, 0.01), P.paint, { p: [sx * 0.36, top + 0.018, -2.64] }));
    out.push(part(G.scatter(nut(0.026, 0.01), [[sx * 0.06, top + 0.018, -2.52], [sx * 0.66, top + 0.018, -2.52], [sx * 0.06, top + 0.018, -2.76], [sx * 0.66, top + 0.018, -2.76]].map((p) => ({ p: p as G.V3 }))), P.paint));
  }
  // rear hull lifting rings on the deck corners
  for (const sx of [-1, 1]) {
    out.push(part(rb(0.1, 0.03, 0.08, 0.01), P.cast, { p: [sx * 1.18, top + 0.015, -2.66] }));
    out.push(part(G.torus(0.04, 0.014, 8, 20), P.cast, { p: [sx * 1.18, top + 0.06, -2.66], r: [0, 90, 0] }));
  }
  return out;
}

/** The whole hull. */
export function hull(P: Pal): THREE.Group {
  return group([...armour(P), ...housing(P), ...hoods(P), ...mgPortPlug(P), ...engineDeck(P)], { name: 'hull' });
}
