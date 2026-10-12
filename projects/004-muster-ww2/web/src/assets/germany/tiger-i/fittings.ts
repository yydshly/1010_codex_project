/**
 * External fittings of the Tiger I hull: tow cables and the track cable on the left side, gun
 * cleaning rods and tools on the right, the shovel on the glacis, crowbar and axe on the deck
 * edges, twin Bosch headlights on the front corners, five S-mine launchers, tow shackles, the two
 * oval Feifel air pre-cleaners with their ducts, jack, convoy tail light, antenna base and
 * restrained Balkenkreuz markings.
 */
import { THREE, G, part, group, decal } from '../../../core/kit';
import type { Palette } from './materials';
import { H, W, P } from './dims';
import { rearZ, EYE_F, REAR_LEAN } from './hull';
import { rb, cbox, nut, rope, latheX, type V2 } from './util';

// ------------------------------------------------------------------ helpers
/** Strap clamp over a round item of radius r lying along Z at (x, yc) on a flat base at y0. */
function clamp(pal: Palette, x: number, z: number, r: number, yc: number, y0: number): THREE.Object3D[] {
  return [
    part(rb(0.022, yc - y0 + 0.004, 0.03, 0.003), pal.sheet, { p: [x + r + 0.014, (y0 + yc) / 2, z] }),
    part(rb(0.022, yc - y0 + 0.004, 0.03, 0.003), pal.sheet, { p: [x - r - 0.014, (y0 + yc) / 2, z] }),
    part(G.torus(r + 0.006, 0.0045, 6, 14, Math.PI), pal.gun, { p: [x, yc, z] }),
    part(rb(0.02, 0.012, 0.032, 0.003), pal.gun, { p: [x + r + 0.02, yc + 0.004, z] }),
  ];
}

// ------------------------------------------------------------------ left side: tow cables and track cable
function cables(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const x = W.upper + 0.028;
  const z0 = 2.15, z1 = -2.3;
  for (const [y, r, flip] of [[1.3, 0.017, 1], [1.385, 0.017, -1]] as [number, number, number][]) {
    // straight run with a thimble eye at each end, the eyes over pins on the side plate
    out.push(part(rope([[x, y, z0 - 0.12], [x, y, (z0 + z1) / 2], [x, y, z1 + 0.12]], r, 0.07), pal.rope));
    for (const [ze, d] of [[z0, 1], [z1, -1]] as V2[]) {
      const eye = G.torus(0.055, r * 0.95, 8, 24);
      out.push(part(eye, pal.rope, { p: [x, y + flip * 0.012, ze - d * 0.02], r: [0, 90, 0], s: [1, 0.8, 1] }));
      out.push(part(G.cyl(r + 0.008, r + 0.008, 0.07, 14), pal.gun, { p: [x, y, ze - d * 0.1], r: [90, 0, 0] }));
      out.push(part(G.cyl(0.014, 0.014, 0.06, 10), pal.sheet, { p: [W.upper + 0.03, y + flip * 0.012, ze - d * 0.02], r: [0, 0, 90] }));
    }
  }
  // brackets holding both cables
  for (const z of [1.3, 0.2, -0.9, -1.8]) {
    out.push(part(rb(0.05, 0.16, 0.03, 0.004), pal.sheet, { p: [W.upper + 0.025, 1.34, z] }));
    out.push(part(rb(0.02, 0.2, 0.03, 0.004), pal.sheet, { p: [W.upper + 0.052, 1.34, z] }));
    out.push(part(nut(0.02, 0.008), pal.gun, { p: [W.upper + 0.062, 1.34, z], r: [0, 0, -90] }));
  }
  // thin track-laying cable: a hanging coil of four turns on a hook, secured by a strap
  const coil: G.V3[] = [];
  const cz = -1.95, cy = 1.56, cr = 0.14;
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2 * 4 + Math.PI / 2;
    const rr = cr + 0.012 * Math.sin(i * 0.9);
    coil.push([W.upper + 0.016 + (i / 96) * 0.048, cy + Math.sin(a) * rr, cz + Math.cos(a) * rr * 1.08]);
  }
  out.push(part(rope(coil, 0.0075, 0.035), pal.rope));
  out.push(part(rb(0.06, 0.03, 0.05, 0.006), pal.sheet, { p: [W.upper + 0.03, cy + cr + 0.02, cz] }));
  out.push(part(G.torus(0.03, 0.007, 6, 14, Math.PI), pal.sheet, { p: [W.upper + 0.045, cy + cr - 0.005, cz], r: [0, 90, 180] }));
  out.push(part(G.tube([[W.upper + 0.02, cy + cr + 0.02, cz + 0.03], [W.upper + 0.085, cy + 0.05, cz + 0.045], [W.upper + 0.085, cy - 0.06, cz + 0.045], [W.upper + 0.02, cy - cr - 0.03, cz + 0.03]], 0.006, 6, 20), pal.black));
  return out;
}

// ------------------------------------------------------------------ right side: cleaning rods, sledgehammer
function rightSide(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const x = -(W.upper + 0.035);
  const y = 1.33;
  // bundle of cleaning rods (wooden sections with brass joints)
  const rodsPos: V2[] = [[0.0, 0.0], [0.0, 0.026], [0.0, -0.026], [-0.02, 0.013], [-0.02, -0.013], [0.018, 0.013]];
  for (const [dx, dy] of rodsPos) out.push(part(G.cyl(0.012, 0.012, 2.3, 10), pal.wood, { p: [x + dx, y + dy, 0.3], r: [90, 0, 0] }));
  for (const z of [-0.4, 0.3, 1.0]) for (const [dx, dy] of rodsPos) out.push(part(G.cyl(0.0135, 0.0135, 0.03, 10), pal.gun, { p: [x + dx, y + dy, z], r: [90, 0, 0] }));
  for (const z of [-0.6, 0.3, 1.2]) {
    out.push(part(rb(0.07, 0.024, 0.04, 0.004), pal.sheet, { p: [-(W.upper + 0.035), y - 0.052, z] }));
    out.push(part(G.torus(0.045, 0.005, 6, 18, Math.PI * 1.2), pal.gun, { p: [x, y, z], r: [0, 90, 0] }));
  }
  // sledgehammer on two brackets
  const hy = 1.62;
  out.push(part(G.cyl(0.016, 0.014, 0.8, 12), pal.wood, { p: [x + 0.005, hy, -1.55], r: [90, 0, 0] }));
  out.push(part(rb(0.055, 0.055, 0.15, 0.008), pal.toolSteel, { p: [x + 0.005, hy, -1.12] }));
  for (const z of [-1.3, -1.8]) out.push(part(rb(0.04, 0.05, 0.03, 0.004), pal.sheet, { p: [-(W.upper + 0.012), hy, z] }), part(G.torus(0.022, 0.004, 6, 12, Math.PI), pal.gun, { p: [x + 0.005, hy + 0.004, z], r: [0, 90, 0] }));
  return out;
}

// ------------------------------------------------------------------ glacis shovel, deck tools
function glacisShovel(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // lies across the glacis, blade to the left
  const a = Math.atan2(P.glacisTop[1] - P.noseTop[1], P.noseTop[0] - P.glacisTop[0]);
  const zc = (P.noseTop[0] + P.glacisTop[0]) / 2, yc = (P.noseTop[1] + P.glacisTop[1]) / 2 + 0.02;
  const k: THREE.Object3D[] = [];
  const blade: V2[] = [[0, -0.1], [0.17, -0.1], [0.24, -0.06], [0.27, 0], [0.24, 0.06], [0.17, 0.1], [0, 0.1]];
  k.push(part(G.plate(blade, 0.004, 'xz', 0.0012, 0.02), pal.toolSteel, { p: [0.36, -0.012, 0] }));
  k.push(part(rb(0.14, 0.012, 0.045, 0.004), pal.toolSteel, { p: [0.33, -0.006, 0] }));
  k.push(part(G.cyl(0.02, 0.017, 0.1, 14), pal.toolSteel, { p: [0.27, 0.006, 0], r: [0, 0, 90] }));
  k.push(part(G.cyl(0.017, 0.017, 0.66, 12), pal.wood, { p: [-0.1, 0.006, 0], r: [0, 0, 90] }));
  k.push(part(G.tube([[-0.43, 0.006, 0], [-0.47, 0.006, 0.05], [-0.56, 0.006, 0.05], [-0.59, 0.006, 0], [-0.56, 0.006, -0.05], [-0.47, 0.006, -0.05], [-0.43, 0.006, 0]], 0.011, 8, 24), pal.wood));
  for (const x of [0.1, -0.3]) {
    k.push(part(rb(0.03, 0.03, 0.022, 0.003), pal.sheet, { p: [x, -0.012, 0.03] }), part(rb(0.03, 0.03, 0.022, 0.003), pal.sheet, { p: [x, -0.012, -0.03] }));
    k.push(part(G.torus(0.023, 0.0045, 6, 14, Math.PI), pal.gun, { p: [x, 0.006, 0], r: [0, 90, 0] }));
  }
  out.push(group(k, { p: [0, yc, zc], r: [(-a * 180) / Math.PI, 0, 0] }));
  return out;
}

function deckTools(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.roof;
  // crowbar along the left deck edge
  const cx = 1.5;
  out.push(part(G.tube([[cx, y + 0.02, -0.95], [cx, y + 0.02, -2.2], [cx, y + 0.03, -2.26], [cx, y + 0.055, -2.3]], 0.015, 8, 24), pal.toolSteel));
  out.push(part(rb(0.03, 0.01, 0.08, 0.003), pal.toolSteel, { p: [cx, y + 0.016, -0.92] }));
  out.push(...clamp(pal, cx, -1.25, 0.015, y + 0.02, y), ...clamp(pal, cx, -2.0, 0.015, y + 0.02, y));
  // axe along the right deck edge
  const ax = -1.5;
  const head: V2[] = [[-0.03, -0.035], [0.03, -0.035], [0.05, -0.02], [0.11, -0.055], [0.13, 0.0], [0.11, 0.055], [0.05, 0.02], [0.03, 0.035], [-0.03, 0.035], [-0.05, 0]];
  out.push(part(G.plate(head, 0.03, 'xz', 0.004), pal.toolSteel, { p: [ax, y + 0.022, -1.0], r: [0, -90, 0] }));
  out.push(part(G.cyl(0.017, 0.014, 0.72, 12), pal.wood, { p: [ax, y + 0.022, -1.4], r: [90, 0, 0], s: [1, 1, 1.25] }));
  out.push(...clamp(pal, ax, -1.15, 0.017, y + 0.022, y), ...clamp(pal, ax, -1.62, 0.016, y + 0.022, y));
  // wire cutter beside it
  const wx = -1.5, wz = -2.1;
  out.push(part(G.tube([[wx + 0.012, y + 0.02, wz + 0.2], [wx + 0.018, y + 0.02, wz - 0.1], [wx + 0.02, y + 0.02, wz - 0.35]], 0.011, 8, 12), pal.toolSteel));
  out.push(part(G.tube([[wx - 0.012, y + 0.02, wz + 0.2], [wx - 0.018, y + 0.02, wz - 0.1], [wx - 0.02, y + 0.02, wz - 0.35]], 0.011, 8, 12), pal.toolSteel));
  out.push(part(rb(0.07, 0.024, 0.13, 0.008), pal.toolSteel, { p: [wx, y + 0.02, wz + 0.26] }));
  out.push(...clamp(pal, wx, wz - 0.15, 0.03, y + 0.02, y));
  return out;
}

// ------------------------------------------------------------------ front: headlights, shackles
function headlight(pal: Palette, x: number): THREE.Object3D[] {
  const z = 2.3, y = H.roof;
  return [
    part(rb(0.12, 0.014, 0.1, 0.004), pal.paint, { p: [x, y + 0.007, z] }),
    part(G.cyl(0.018, 0.022, 0.07, 12), pal.black, { p: [x, y + 0.05, z] }),
    part(G.lathe([[0, -0.07], [0.05, -0.07], [0.075, -0.045], [0.084, -0.01], [0.084, 0.03], [0.08, 0.034], [0, 0.034]], 28, 35), pal.black, { p: [x, y + 0.15, z], r: [90, 0, 0] }),
    part(G.cyl(0.078, 0.078, 0.008, 28), pal.glass, { p: [x, y + 0.15, z + 0.034], r: [90, 0, 0] }),
    // blackout cover with the horizontal slit
    part(G.cyl(0.084, 0.084, 0.01, 28), pal.black, { p: [x, y + 0.15, z + 0.042], r: [90, 0, 0] }),
    part(cbox(0.085, 0.012, 0.004, 0.001), pal.glass, { p: [x, y + 0.15, z + 0.048] }),
    part(rb(0.11, 0.02, 0.022, 0.005), pal.black, { p: [x, y + 0.168, z + 0.052] }),
    part(G.tube([[x, y + 0.05, z - 0.02], [x - Math.sign(x) * 0.02, y + 0.012, z - 0.1], [x - Math.sign(x) * 0.08, y + 0.008, z - 0.2]], 0.006, 6, 12), pal.black),
  ];
}

function shackles(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const s of [1, -1]) {
    const x = s * (W.lower - 0.03);
    // U-shackle: pin through the tow eye along X, legs either side of the eye plate, bow hanging
    // down and forward (local +Y of the group points along the legs)
    const L = 0.1, hw = 0.055;
    const k = [
      part(G.cyl(0.018, 0.018, 2 * hw + 0.07, 12), pal.gun, { r: [0, 0, 90] }),
      part(nut(0.036, 0.016), pal.gun, { p: [hw + 0.035, 0, 0], r: [0, 0, -90] }),
      part(G.cyl(0.03, 0.03, 0.03, 14), pal.gun, { p: [-hw - 0.02, 0, 0], r: [0, 0, 90] }),
      part(G.cyl(0.016, 0.016, L, 10), pal.gun, { p: [hw, L / 2, 0] }),
      part(G.cyl(0.016, 0.016, L, 10), pal.gun, { p: [-hw, L / 2, 0] }),
      part(G.torus(hw, 0.016, 8, 20, Math.PI), pal.gun, { p: [0, L, 0] }),
    ];
    out.push(group(k, { p: [x, EYE_F[1], EYE_F[0]], r: [150, 0, 0] }));
  }
  return out;
}

// ------------------------------------------------------------------ S-mine launchers
function sMine(pal: Palette, x: number, z: number, out: number, arm = false): THREE.Object3D[] {
  const y = H.roof;
  const k: THREE.Object3D[] = [];
  // bracket strips and base, launcher cup tilted outwards, electrical conduit
  k.push(part(rb(0.14, 0.014, 0.03, 0.004), pal.paint, { p: [0, 0.007, 0.05] }), part(rb(0.14, 0.014, 0.03, 0.004), pal.paint, { p: [0, 0.007, -0.05] }));
  k.push(part(rb(0.12, 0.02, 0.13, 0.006), pal.paint, { p: [0, 0.024, 0] }));
  const tube = group(
    [
      part(G.lathe([[0.0, 0], [0.058, 0], [0.058, 0.03], [0.052, 0.034], [0.052, 0.19], [0.058, 0.195], [0.058, 0.205], [0.047, 0.205], [0.047, 0.04], [0.0, 0.04]], 28, 35), pal.paint),
      part(G.cyl(0.046, 0.046, 0.004, 20), pal.dark, { p: [0, 0.2, 0] }),
      part(G.torus(0.056, 0.004, 6, 24), pal.paint, { p: [0, 0.12, 0], r: [90, 0, 0] }),
    ],
    { p: [0, 0.034, 0], r: [0, 0, -out * 28] },
  );
  k.push(tube);
  k.push(part(G.tube([[0, 0.02, -0.066], [0.0, 0.012, -0.12], [-out * 0.06, 0.008, -0.2]], 0.006, 6, 10), pal.black));
  const res: THREE.Object3D[] = [group(k, { p: [x, y, z] })];
  if (arm) {
    // removable arms from the rear and side walls carrying the rear-corner launchers
    const s = Math.sign(x);
    res.push(part(rb(0.1, 0.03, 0.16, 0.005), pal.paint, { p: [x, y - 0.015, z] }));
    res.push(part(rb(Math.abs(x) - W.upper + 0.06, 0.05, 0.04, 0.006), pal.paint, { p: [s * (W.upper + (Math.abs(x) - W.upper) / 2 - 0.03), y - 0.04, z + 0.05] }));
    res.push(part(rb(0.04, 0.05, rearZ(y) - z + 0.1, 0.006), pal.paint, { p: [x - s * 0.02, y - 0.04, (z + rearZ(y)) / 2 + 0.05] }));
  }
  return res;
}

// ------------------------------------------------------------------ rear plate: Feifel pre-cleaners, jack, tail light
function feifel(pal: Palette, s: 1 | -1): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const x = s * 1.1, y0 = 1.05, y1 = 1.5;
  const zc = rearZ((y0 + y1) / 2) - 0.2;
  // oval canister (redesigned large oval type), domed top, band clamps
  const body = G.lathe([[0.0, 0], [0.13, 0], [0.155, 0.02], [0.16, 0.05], [0.16, y1 - y0 - 0.03], [0.15, y1 - y0 - 0.005], [0.1, y1 - y0 + 0.02], [0.0, y1 - y0 + 0.03]], 36, 30);
  out.push(part(body, pal.sheet, { p: [x, y0, zc], s: [1.3, 1, 1] }));
  for (const yy of [y0 + 0.1, y1 - 0.07]) out.push(part(G.torus(0.163, 0.007, 6, 36), pal.sheet, { p: [x, yy, zc], r: [90, 0, 0], s: [1.3, 1, 1] }));
  // rectangular intake ports round the side
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
    const px = x + Math.cos(a) * 0.161 * 1.3, pz = zc - Math.sin(a) * 0.161;
    const nx = Math.cos(a) / 1.3, nz = -Math.sin(a);
    for (const yy of [y0 + 0.2, y0 + 0.3]) out.push(part(cbox(0.034, 0.04, 0.006, 0.001), pal.dark, { p: [px, yy, pz], r: [0, (Math.atan2(nx, nz) * 180) / Math.PI, 0] }));
  }
  // mounting brackets to the rear plate
  for (const yy of [y0 + 0.08, y1 - 0.05]) out.push(part(rb(0.2, 0.04, rearZ(yy) - zc, 0.006), pal.paint, { p: [x, yy, (rearZ(yy) + zc) / 2] }));
  // outlet duct from the top, over the deck edge to the middle of the engine deck
  const yTop = y1 + 0.03;
  out.push(
    part(
      G.tube(
        [
          [x, yTop - 0.01, zc],
          [x, yTop + 0.12, zc + 0.02],
          [s * 0.98, H.roof + 0.08, rearZ(H.roof) - 0.02],
          [s * 0.72, H.roof + 0.075, -2.52],
          [s * 0.56, H.roof + 0.07, -2.42],
        ],
        0.05,
        12,
        40,
      ),
      pal.sheet,
    ),
  );
  out.push(part(G.cyl(0.056, 0.056, 0.04, 16), pal.sheet, { p: [s * 0.545, H.roof + 0.07, -2.41], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.047, 0.047, 0.004, 16), pal.dark, { p: [s * 0.545, H.roof + 0.07, -2.388], r: [90, 0, 0] }));
  out.push(part(rb(0.1, 0.07, 0.03, 0.006), pal.sheet, { p: [s * 0.62, H.roof + 0.035, -2.46] }));
  return out;
}

function rearItems(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // 15 t jack standing between the exhausts, in two brackets
  const jz = rearZ(1.4) - 0.1;
  out.push(part(latheX([[0, 0], [0.07, 0], [0.07, 0.3], [0.055, 0.31], [0.055, 0.4], [0.03, 0.42], [0, 0.42]], 24, 35), pal.black, { p: [0, 1.2, jz], r: [0, 0, 90] }));
  out.push(part(rb(0.2, 0.03, 0.14, 0.006), pal.black, { p: [0, 1.2, jz] }));
  out.push(part(G.cyl(0.012, 0.012, 0.22, 8), pal.gun, { p: [0.05, 1.5, jz - 0.04], r: [0, 0, 90] }));
  for (const y of [1.32, 1.52]) {
    out.push(part(G.torus(0.078, 0.006, 6, 20, Math.PI), pal.sheet, { p: [0, y, jz], r: [90, 0, 180] }));
    out.push(part(rb(0.2, 0.03, rearZ(y) - jz, 0.004), pal.sheet, { p: [0, y, (rearZ(y) + jz) / 2] }));
  }
  // convoy tail light (Notek) and brake light, upper left of the rear plate
  const tx = 0.74, ty = 1.66, tz = rearZ(ty);
  const k = [
    part(rb(0.14, 0.09, 0.07, 0.012), pal.black, { p: [0, 0, -0.035] }),
    part(cbox(0.1, 0.014, 0.006, 0.001), pal.glass, { p: [0, 0.018, -0.071] }),
    ...[-0.036, -0.012, 0.012, 0.036].map((dx) => part(cbox(0.016, 0.02, 0.006, 0.001), pal.glass, { p: [dx, -0.014, -0.071] })),
    part(rb(0.02, 0.1, 0.03, 0.004), pal.paint, { p: [-0.08, 0, -0.015] }),
  ];
  out.push(group(k, { p: [tx, ty, tz], r: [REAR_LEAN, 0, 0] }));
  return out;
}

// ------------------------------------------------------------------ antenna base
function antennaBase(pal: Palette): THREE.Object3D[] {
  const x = -1.28, z = -0.72, y = H.roof;
  return [
    part(G.cyl(0.08, 0.085, 0.02, 24), pal.paint, { p: [x, y + 0.01, z] }),
    part(G.lathe([[0, 0], [0.05, 0], [0.056, 0.02], [0.046, 0.1], [0.03, 0.12], [0, 0.12]], 20, 35), pal.black, { p: [x, y + 0.02, z] }),
    part(G.cyl(0.07, 0.07, 0.075, 24, true), pal.paint, { p: [x, y + 0.057, z] }),
    part(G.cyl(0.018, 0.022, 0.06, 12), pal.gun, { p: [x, y + 0.17, z] }),
  ];
}

// ------------------------------------------------------------------ markings
function drawCross(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const a = w * 0.3, b = w * 0.16;
  ctx.fillStyle = '#e9e5da';
  ctx.fillRect(0, (h - a) / 2, w, a);
  ctx.fillRect((w - a) / 2, 0, a, h);
  ctx.fillStyle = '#151515';
  ctx.fillRect(0, (h - b) / 2, w, b);
  ctx.fillRect((w - b) / 2, 0, b, h);
}

function markings(): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const xo = W.upper + 0.003;
  out.push(decal('tiger-balkenkreuz', 0.36, 0.36, drawCross, { p: [xo, 1.6, -0.55], r: [0, 90, 0] }));
  out.push(decal('tiger-balkenkreuz', 0.36, 0.36, drawCross, { p: [-xo, 1.6, -0.55], r: [0, -90, 0] }));
  const y = 1.67;
  out.push(decal('tiger-balkenkreuz', 0.2, 0.2, drawCross, { p: [-0.73, y, rearZ(y) - 0.004], r: [REAR_LEAN, 180, 0] }));
  return out;
}

/** All hull fittings. */
export function fittings(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  out.push(...cables(pal));
  out.push(...rightSide(pal));
  out.push(...glacisShovel(pal));
  out.push(...deckTools(pal));
  out.push(...headlight(pal, 1.3), ...headlight(pal, -1.3));
  out.push(...shackles(pal));
  out.push(...sMine(pal, 1.44, 2.02, 1), ...sMine(pal, -1.44, 2.02, -1), ...sMine(pal, 1.46, 0.42, 1));
  out.push(...sMine(pal, 1.64, -2.52, 1, true), ...sMine(pal, -1.64, -2.52, -1, true));
  out.push(...feifel(pal, 1), ...feifel(pal, -1));
  out.push(...rearItems(pal));
  out.push(...antennaBase(pal));
  out.push(...markings());
  return group(out);
}
