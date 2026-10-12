/**
 * Turret of the Tiger I, second (July 1943) pattern: 80 mm horseshoe side/rear wall bent from one
 * plate, 100 mm front plate, 25 mm roof with the thicker leading-edge plate, external cast mantlet
 * with the 8.8 cm KwK 36 L/56, its double-baffle muzzle brake, the binocular sight apertures
 * (TZF 9b) and the coaxial MG 34; low cast commander's cupola with seven periscopes (glass) and
 * the AA MG ring, loader's hatch with the central latch disc, loader's periscope, ventilator,
 * vision ports in both sides, the simplified pistol port plug (left rear), the loader's escape
 * hatch (right rear), spare track links on the sides and the rear stowage bin.
 *
 * Built in turret-local space: origin on the turret ring centre at the turret base, +Z forward.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Palette } from './materials';
import { TURRET, GUN } from './dims';
import { linkGeometries } from './track';
import { rb, cbox, nut, scatterN, basisGroup, latheZ, arcBand, merge, slabZY, prismY, boltRingZ, bead, type V2 } from './util';

/** wall height, roof thickness, outer half-width, front plate faces, rear ellipse */
const HT = 0.8;
const ROOF = HT + 0.025;
const XW = 1.08;
const ZF_IN = 0.76, ZF_OUT = 0.86;
const ZC = -0.25, RZ = 1.05;
const T_WALL = 0.08;
/** gun axis height and trunnion (turret local) */
const GY = GUN.y - TURRET.y;
const GZ = GUN.trunnionZ;
const MUZZLE = GUN.muzzleZ - TURRET.z - GZ;

/** Outer wall x (left, +) at z. */
export function wallX(z: number, off = 0): number {
  if (z >= ZC) return XW + off;
  const t = (z - ZC) / (RZ + off);
  return (XW + off) * Math.sqrt(Math.max(0, 1 - t * t));
}

/** Point and outward normal (x, z) on the left wall at z. */
function wallAt(z: number): { p: V2; n: V2 } {
  if (z >= ZC) return { p: [XW, z], n: [1, 0] };
  const x = wallX(z);
  const nx = x / (XW * XW), nz = (z - ZC) / (RZ * RZ);
  const l = Math.hypot(nx, nz);
  return { p: [x, z], n: [nx / l, nz / l] };
}

/** Horseshoe outline (x, z) at offset `off` from the outer wall, from front-left round the rear to front-right. */
function horseshoe(off: number, zFront: number, n = 40): V2[] {
  const pts: V2[] = [];
  pts.push([XW + off, zFront]);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI; // 0 = left side, pi = right side, via the rear
    pts.push([(XW + off) * Math.cos(a), ZC - (RZ + off) * Math.sin(a)]);
  }
  pts.push([-(XW + off), zFront]);
  return pts;
}

// ------------------------------------------------------------------ shell
function shell(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // horseshoe wall (one bent plate): outer path then inner path back
  const outer = horseshoe(0, ZF_IN);
  const inner = horseshoe(-T_WALL, ZF_IN).reverse();
  out.push(part(prismY([...outer, ...inner], 0, HT, 0.006), pal.paint));
  // front plate, slightly wider than the walls, with chamfered ends
  const fp: V2[] = [
    [-(XW + 0.015), ZF_IN],
    [XW + 0.015, ZF_IN],
    [XW + 0.015, ZF_OUT - 0.02],
    [XW - 0.005, ZF_OUT],
    [-(XW - 0.005), ZF_OUT],
    [-(XW + 0.015), ZF_OUT - 0.02],
  ];
  out.push(part(prismY(fp, 0, HT + 0.04, 0.008), pal.paint));
  // roof: main plate on the walls and the thicker leading-edge plate behind the front plate
  const roofOut = horseshoe(0.004, 0.52, 36);
  out.push(part(prismY(roofOut, HT, ROOF, 0.004), pal.paint));
  out.push(part(prismY([[-(XW + 0.004), 0.52], [XW + 0.004, 0.52], [XW + 0.004, ZF_IN], [-(XW + 0.004), ZF_IN]], HT, HT + 0.04, 0.005), pal.paint));
  // roof bolts along the edge
  const bolts: G.V3[] = [];
  for (let i = 0; i < 9; i++) {
    const a = 0.12 + (i / 8) * (Math.PI - 0.24);
    bolts.push([(XW - 0.05) * Math.cos(a), ROOF, ZC - (RZ - 0.05) * Math.sin(a)]);
  }
  for (const z of [0.1, 0.38]) bolts.push([XW - 0.05, ROOF, z], [-(XW - 0.05), ROOF, z]);
  for (let i = 0; i < 7; i++) bolts.push([-0.9 + i * 0.3, HT + 0.04, 0.6]);
  out.push(part(scatterN(nut(0.024, 0.008), bolts, [0, 1, 0]), pal.paint));
  // weld beads: roof to front plate across the top, wall to roof round the horseshoe
  out.push(part(bead([[-(XW - 0.01), HT + 0.042, ZF_IN - 0.004], [XW - 0.01, HT + 0.042, ZF_IN - 0.004]], 0.006), pal.paint));
  const rim: G.V3[] = horseshoe(0.006, 0.5, 28).map(([x, z]) => [x, HT - 0.002, z] as G.V3);
  out.push(part(bead(rim, 0.0055), pal.paint));
  // weld beads: wall to front plate
  for (const s of [1, -1]) out.push(part(G.rod([s * (XW + 0.002), 0.02, ZF_IN - 0.006], [s * (XW + 0.002), HT - 0.01, ZF_IN - 0.006], 0.006, 5), pal.paint));
  return out;
}

// ------------------------------------------------------------------ gun and mantlet (gun-local: origin at trunnion, +Z bore)
function mantletGeo(): THREE.BufferGeometry {
  // side profile (z, y): flat back against the front plate, front curved round the trunnion
  const R = 0.43, yh = 0.345, zb = ZF_OUT - GZ + 0.012;
  const pts: V2[] = [];
  const aMax = Math.asin(yh / R);
  pts.push([zb, -yh + 0.03], [zb + 0.03, -yh]);
  for (let i = 0; i <= 16; i++) {
    const a = -aMax + (2 * aMax * i) / 16;
    pts.push([Math.cos(a) * R, Math.sin(a) * R]);
  }
  pts.push([zb + 0.03, yh], [zb, yh - 0.03]);
  const g = slabZY(pts, [], 1.38, 0.026);
  g.translate(0.055, 0, 0);
  return g;
}

function muzzleBrake(pal: Palette, z0: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const R = 0.135, ri = 0.046;
  // rear collar threaded onto the barrel
  out.push(part(latheZ([[0.07, z0], [0.098, z0], [0.104, z0 + 0.012], [0.104, z0 + 0.05], [0.112, z0 + 0.056], [0.112, z0 + 0.075], [0.07, z0 + 0.075]], 36, 35), pal.paint));
  // rear, middle and front baffles (rounded, the front one domed)
  const baffle = (a: number, b: number) =>
    latheZ([[ri, a], [R - 0.02, a], [R - 0.004, a + 0.01], [R, a + 0.024], [R, b - 0.024], [R - 0.004, b - 0.01], [R - 0.02, b], [ri, b], [ri, a]], 40, 35);
  out.push(part(baffle(z0 + 0.075, z0 + 0.15), pal.paint));
  out.push(part(baffle(z0 + 0.26, z0 + 0.33), pal.paint));
  out.push(
    part(
      latheZ([[ri, z0 + 0.44], [R - 0.02, z0 + 0.44], [R - 0.004, z0 + 0.45], [R, z0 + 0.465], [R - 0.004, z0 + 0.49], [R - 0.022, z0 + 0.508], [0.08, z0 + 0.52], [ri, z0 + 0.52], [ri, z0 + 0.44]], 40, 35),
      pal.paint,
    ),
  );
  // top and bottom bridges enclosing the two side-port chambers
  for (const [a0, a1] of [[42, 138], [222, 318]]) out.push(part(arcBand(R - 0.024, R - 0.002, a0, a1, z0 + 0.1, z0 + 0.47, 12, 0.004), pal.paint));
  return out;
}

function gun(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  out.push(part(mantletGeo(), pal.cast));
  const zFace = 0.43; // mantlet face on the axis
  // heavy gun sleeve (collar) on the mantlet with its bolt ring
  out.push(part(latheZ([[0.0, zFace - 0.05], [0.19, zFace - 0.05], [0.19, zFace + 0.02], [0.182, zFace + 0.05], [0.165, zFace + 0.07], [0.15, zFace + 0.14], [0.14, zFace + 0.158], [0.12, zFace + 0.166], [0.0, zFace + 0.166]], 44, 35), pal.cast));
  out.push(part(G.scatter(nut(0.03, 0.012), boltRingZ(0.186, 8, zFace + 0.03, Math.PI / 8).map((b) => ({ p: b.p, n: new THREE.Vector3(b.p.x, b.p.y, 0).normalize() }))), pal.cast));
  // mantlet face bolts
  const mbPts: { p: G.V3; n: G.V3 }[] = [];
  for (const x of [-0.5, 0.6])
    for (const yy of [0.25, -0.25]) {
      const zz = Math.sqrt(0.43 * 0.43 - yy * yy);
      mbPts.push({ p: [x, yy * 0.995, zz * 0.995], n: [0, yy / 0.43, zz / 0.43] });
    }
  out.push(part(G.scatter(nut(0.036, 0.013), mbPts), pal.cast));
  // barrel: reinforced rear section, taper, thread collar
  const bEnd = MUZZLE - 0.52;
  out.push(
    part(
      latheZ([[0, zFace + 0.1], [0.104, zFace + 0.1], [0.104, zFace + 0.33], [0.097, zFace + 0.36], [0.093, zFace + 0.6], [0.086, 2.2], [0.077, bEnd - 0.08], [0.083, bEnd - 0.07], [0.083, bEnd + 0.01], [0, bEnd + 0.01]], 36, 30),
      pal.paint,
    ),
  );
  out.push(...muzzleBrake(pal, bEnd));
  out.push(part(G.cyl(0.044, 0.044, 0.004, 20), pal.dark, { p: [0, 0, bEnd + 0.012], r: [90, 0, 0] }));
  // binocular sight apertures (TZF 9b) on the left of the gun, coaxial MG 34 on the right
  for (const x of [0.25, 0.34]) {
    const zx = Math.sqrt(0.43 * 0.43 - 0.05 * 0.05);
    out.push(part(latheZ([[0.0, 0], [0.034, 0], [0.034, 0.012], [0.026, 0.02], [0.0, 0.02]], 20, 35), pal.cast, { p: [x, 0.05, zx - 0.004] }));
    out.push(part(G.cyl(0.018, 0.018, 0.004, 16), pal.dark, { p: [x, 0.05, zx + 0.017], r: [90, 0, 0] }));
  }
  out.push(part(latheZ([[0, 0], [0.05, 0], [0.05, 0.03], [0.04, 0.045], [0.026, 0.05], [0, 0.05]], 24, 35), pal.cast, { p: [-0.32, 0.02, 0.4] }));
  out.push(part(G.cyl(0.013, 0.013, 0.06, 12), pal.gun, { p: [-0.32, 0.02, 0.475], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.0065, 0.0065, 0.003, 10), pal.dark, { p: [-0.32, 0.02, 0.5055], r: [90, 0, 0] }));
  // lifting eye on the mantlet top
  out.push(part(G.torus(0.035, 0.011, 8, 16, Math.PI), pal.cast, { p: [0.055, 0.345, 0.12], r: [0, 90, 0] }));
  return group(out, { p: [0, GY, GZ] });
}

// ------------------------------------------------------------------ roof fittings
function cupola(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  const base = 0.43, top = 0.2;
  out.push(
    part(
      G.lathe(
        [
          [0.3, 0],
          [base, 0],
          [base, 0.018],
          [base - 0.015, 0.03],
          [0.39, 0.155],
          [0.372, 0.185],
          [0.362, top],
          [0.3, top],
          [0.3, top - 0.02],
          [0.28, top - 0.02],
        ],
        64,
        30,
      ),
      pal.cast,
    ),
  );
  // seven periscopes in the sloped face, each under a cast brow, with glass
  for (let k = 0; k < 7; k++) {
    const a = ((k + 0.5) * 2 * Math.PI) / 7;
    const radial = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const up = new THREE.Vector3(0, 1, 0);
    const xAx = new THREE.Vector3().crossVectors(up, radial).normalize();
    // local frame on the sloped face: z = outward face normal, y up the slope
    const nz = radial.clone().multiplyScalar(0.125).add(up.clone().multiplyScalar(0.025)).normalize();
    const zAx = nz;
    const yAx = new THREE.Vector3().crossVectors(zAx, xAx).normalize();
    const r0 = 0.405, y0 = 0.1;
    const kids = [
      part(rb(0.15, 0.06, 0.03, 0.006), pal.dark, { p: [0, 0, -0.01] }),
      part(rb(0.13, 0.045, 0.006, 0.002), pal.glass, { p: [0, 0, 0.003] }),
      part(rb(0.19, 0.034, 0.05, 0.01), pal.cast, { p: [0, 0.05, 0.004] }),
      part(rb(0.024, 0.08, 0.036, 0.006), pal.cast, { p: [0.087, 0.005, -0.002] }),
      part(rb(0.024, 0.08, 0.036, 0.006), pal.cast, { p: [-0.087, 0.005, -0.002] }),
    ];
    out.push(basisGroup(kids, new THREE.Vector3(radial.x * r0, y0, radial.z * r0), xAx, yAx, zAx));
  }
  // side-swinging hatch: lid, pivot post and lifting lever
  out.push(part(G.lathe([[0, top - 0.004], [0.29, top - 0.004], [0.292, top + 0.014], [0.27, top + 0.03], [0.2, top + 0.04], [0.0, top + 0.044]], 48, 30), pal.cast));
  out.push(part(G.tube([[-0.06, top + 0.04, 0.08], [-0.05, top + 0.064, 0.08], [0.05, top + 0.064, 0.08], [0.06, top + 0.04, 0.08]], 0.009, 8, 12), pal.paint));
  out.push(part(G.cyl(0.05, 0.055, 0.1, 20), pal.cast, { p: [-0.3, top + 0.01, -0.12] }));
  out.push(part(rb(0.14, 0.03, 0.08, 0.008), pal.cast, { p: [-0.23, top + 0.045, -0.09], r: [0, -30, 0] }));
  out.push(part(G.cyl(0.02, 0.02, 0.05, 12), pal.gun, { p: [-0.3, top + 0.07, -0.12] }));
  // AA MG ring welded on the periscope brows, with its sliding mount
  out.push(part(G.torus(0.415, 0.013, 8, 72, Math.PI * 1.6), pal.paint, { p: [0, 0.172, 0], r: [90, 0, 90 + 18] }));
  out.push(part(rb(0.09, 0.05, 0.07, 0.01), pal.paint, { p: [0.0, 0.2, -0.415] }));
  out.push(part(G.cyl(0.016, 0.016, 0.08, 10), pal.gun, { p: [0.0, 0.25, -0.415] }));
  return group(out, { p: [0.52, ROOF, -0.46] });
}

function roofFittings(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // loader's hatch (right) with the central latch disc and rear hinge
  const lz = -0.3, lx = -0.5;
  out.push(part(G.lathe([[0.3, 0], [0.3, 0.012], [0.285, 0.018], [0.27, 0.018]], 44, 35), pal.paint, { p: [lx, ROOF, lz] }));
  out.push(part(G.lathe([[0, 0.012], [0.27, 0.012], [0.272, 0.03], [0.26, 0.038], [0.0, 0.038]], 44, 30), pal.paint, { p: [lx, ROOF, lz] }));
  out.push(part(G.cyl(0.06, 0.064, 0.016, 24), pal.cast, { p: [lx, ROOF + 0.046, lz] }));
  out.push(part(rb(0.06, 0.012, 0.016, 0.004), pal.gun, { p: [lx, ROOF + 0.058, lz] }));
  out.push(part(rb(0.24, 0.05, 0.08, 0.012), pal.cast, { p: [lx, ROOF + 0.03, lz - 0.3] }));
  out.push(part(G.cyl(0.024, 0.024, 0.3, 14), pal.cast, { p: [lx, ROOF + 0.045, lz - 0.32], r: [0, 0, 90] }));
  out.push(part(G.tube([[lx - 0.1, ROOF + 0.036, lz + 0.12], [lx - 0.08, ROOF + 0.07, lz + 0.14], [lx + 0.08, ROOF + 0.07, lz + 0.14], [lx + 0.1, ROOF + 0.036, lz + 0.12]], 0.009, 8, 16), pal.paint));
  // loader's periscope ahead of the hatch
  out.push(part(rb(0.2, 0.02, 0.16, 0.006), pal.paint, { p: [-0.52, ROOF + 0.01, 0.2] }));
  out.push(part(rb(0.16, 0.07, 0.12, 0.014), pal.cast, { p: [-0.52, ROOF + 0.05, 0.2] }));
  out.push(part(rb(0.19, 0.014, 0.15, 0.005), pal.cast, { p: [-0.52, ROOF + 0.092, 0.205] }));
  out.push(part(cbox(0.12, 0.034, 0.005, 0.001), pal.glass, { p: [-0.52, ROOF + 0.052, 0.262] }));
  out.push(part(cbox(0.13, 0.044, 0.004, 0.001), pal.dark, { p: [-0.52, ROOF + 0.052, 0.259] }));
  // ventilator (fume extractor) under its armoured cover, front right of the roof
  out.push(part(G.cyl(0.11, 0.115, 0.014, 32), pal.paint, { p: [-0.18, HT + 0.047, 0.66] }));
  out.push(part(G.cyl(0.07, 0.07, 0.04, 24), pal.paint, { p: [-0.18, HT + 0.074, 0.66] }));
  out.push(part(G.lathe([[0, 0], [0.13, 0], [0.136, 0.008], [0.128, 0.022], [0.09, 0.032], [0, 0.036]], 36, 35), pal.cast, { p: [-0.18, HT + 0.094, 0.66] }));
  // lifting eyes
  for (const [x, z] of [[0.62, 0.3], [-0.62, 0.62]] as V2[]) {
    out.push(part(rb(0.08, 0.014, 0.04, 0.004), pal.paint, { p: [x, ROOF + 0.007, z] }));
    out.push(part(G.torus(0.03, 0.011, 8, 16, Math.PI), pal.paint, { p: [x, ROOF + 0.009, z] }));
  }
  return out;
}

// ------------------------------------------------------------------ side fittings
/** Group on the left wall at z (mirrored for the right when mirror = true), local z = outward. */
function onWall(kids: THREE.Object3D[], z: number, y: number, right = false): THREE.Object3D {
  const w = wallAt(z);
  const n = new THREE.Vector3(w.n[0], 0, w.n[1]);
  const up = new THREE.Vector3(0, 1, 0);
  const xAx = new THREE.Vector3().crossVectors(up, n).normalize();
  const g = basisGroup(kids, new THREE.Vector3(w.p[0], y, w.p[1]), xAx, up, n);
  if (!right) return g;
  const m = new THREE.Group();
  m.scale.x = -1;
  m.add(g);
  return m;
}

function visionPort(pal: Palette): THREE.Object3D[] {
  return [
    part(latheZ([[0.0, 0], [0.12, 0], [0.12, 0.012], [0.108, 0.022], [0.0, 0.022]], 32, 35), pal.paint),
    part(latheZ([[0.0, 0.02], [0.085, 0.02], [0.085, 0.045], [0.075, 0.055], [0.0, 0.058]], 28, 35), pal.cast),
    part(cbox(0.09, 0.009, 0.01, 0.001), pal.dark, { p: [0, -0.012, 0.056] }),
    part(scatterN(nut(0.02, 0.008), [[0.1, 0, 0.012], [-0.1, 0, 0.012], [0, 0.1, 0.012], [0, -0.1, 0.012]], [0, 0, 1]), pal.paint),
  ];
}

function escapeHatch(pal: Palette): THREE.Object3D[] {
  return [
    part(latheZ([[0.0, 0], [0.25, 0], [0.25, 0.018], [0.238, 0.03], [0.0, 0.03]], 44, 35), pal.paint),
    part(latheZ([[0.0, 0.028], [0.215, 0.028], [0.215, 0.044], [0.2, 0.054], [0.0, 0.056]], 44, 35), pal.cast),
    // bottom hinge
    part(rb(0.2, 0.06, 0.07, 0.012), pal.cast, { p: [0, -0.24, 0.035] }),
    part(G.cyl(0.024, 0.024, 0.26, 14), pal.cast, { p: [0, -0.25, 0.06], r: [0, 0, 90] }),
    // handle near the top edge
    part(G.tube([[-0.06, 0.13, 0.056], [-0.045, 0.16, 0.085], [0.045, 0.16, 0.085], [0.06, 0.13, 0.056]], 0.009, 8, 16), pal.paint),
  ];
}

function pistolPort(pal: Palette): THREE.Object3D[] {
  return [
    part(latheZ([[0.0, 0], [0.075, 0], [0.075, 0.012], [0.066, 0.02], [0.0, 0.02]], 28, 35), pal.paint),
    part(latheZ([[0.0, 0.018], [0.046, 0.018], [0.046, 0.04], [0.036, 0.05], [0.0, 0.052]], 24, 35), pal.cast),
    part(G.torus(0.014, 0.004, 6, 12), pal.gun, { p: [0, 0.03, 0.056], r: [0, 90, 0] }),
    // retaining chain hanging from the plug
    part(G.tube([[0, 0.02, 0.05], [0.01, -0.03, 0.03], [0.015, -0.08, 0.012], [0.03, -0.1, 0.006]], 0.0035, 5, 16), pal.gun),
  ];
}

let spareLinkGeo: { steel: THREE.BufferGeometry; bright: THREE.BufferGeometry } | null = null;
function spareLinks(pal: Palette, count: number): THREE.Object3D[] {
  if (!spareLinkGeo) spareLinkGeo = linkGeometries();
  // links hang vertically (track width along local y), horns towards the wall, ground face out
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0));
  const steel: THREE.BufferGeometry[] = [], bright: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const mm = m.clone().setPosition((i - (count - 1) / 2) * 0.14, 0, 0.13);
    steel.push(spareLinkGeo.steel.clone().applyMatrix4(mm));
    bright.push(spareLinkGeo.bright.clone().applyMatrix4(mm));
  }
  const w = count * 0.14 + 0.06;
  const out: THREE.Object3D[] = [part(merge(steel), pal.track), part(merge(bright), pal.bright)];
  // holders: hooks over the top edge and a retaining bar across the bottom
  for (const y of [0.3, -0.3]) {
    out.push(part(rb(w, 0.03, 0.012, 0.004), pal.paint, { p: [0, y, 0.175] }));
    for (const s of [1, -1]) out.push(part(rb(0.03, 0.03, 0.17, 0.004), pal.paint, { p: [s * (w / 2 - 0.015), y, 0.09] }));
  }
  out.push(part(scatterN(nut(0.022, 0.01), [[w / 2 - 0.03, 0.3, 0.181], [-(w / 2 - 0.03), 0.3, 0.181], [w / 2 - 0.03, -0.3, 0.181], [-(w / 2 - 0.03), -0.3, 0.181]], [0, 0, 1]), pal.gun));
  return out;
}

function sideFittings(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const vy = 0.46;
  out.push(onWall(visionPort(pal), 0.47, vy));
  out.push(onWall(visionPort(pal), 0.47, vy, true));
  out.push(onWall(pistolPort(pal), -0.82, 0.42));
  out.push(onWall(escapeHatch(pal), -0.64, 0.4, true));
  out.push(onWall(spareLinks(pal, 3), 0.02, 0.4));
  out.push(onWall(spareLinks(pal, 2), 0.08, 0.4, true));
  return out;
}

// ------------------------------------------------------------------ stowage bin
function stowageBin(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const hw = 0.62, back = -1.66, y0 = 0.2, y1 = 0.56;
  // plan outline: front edge follows the turret rear 30 mm off the wall, straight back with rounded corners
  const front: V2[] = [];
  for (let i = 0; i <= 16; i++) {
    const x = -hw + (2 * hw * i) / 16;
    const t = x / (XW + 0.03);
    front.push([x, ZC - (RZ + 0.03) * Math.sqrt(Math.max(0, 1 - t * t))]);
  }
  const outline: V2[] = [...front.reverse(), [-hw, back + 0.04], [-hw + 0.04, back], [hw - 0.04, back], [hw, back + 0.04]];
  // outline order: from +x front round... ensure a simple polygon
  const body = prismY(outline, y0, y1 - 0.05, 0.012);
  out.push(part(body, pal.sheet));
  // lid with overlapping lip
  const lid: V2[] = outline.map(([x, z]) => [x * 1.012, z < -1.3 ? z - 0.008 : z]);
  out.push(part(prismY(lid, y1 - 0.055, y1, 0.012), pal.sheet));
  // stiffening swages on the back and latches
  for (const x of [-0.3, 0.3]) out.push(part(rb(0.34, 0.16, 0.012, 0.006), pal.sheet, { p: [x, (y0 + y1) / 2 - 0.02, back - 0.004] }));
  for (const x of [-0.46, 0, 0.46]) {
    out.push(part(rb(0.05, 0.07, 0.016, 0.005), pal.gun, { p: [x, y1 - 0.06, back - 0.01] }));
    out.push(part(G.cyl(0.008, 0.008, 0.05, 8), pal.gun, { p: [x, y1 - 0.035, back - 0.018], r: [0, 0, 90] }));
  }
  // mounting brackets to the turret wall
  for (const s of [1, -1]) {
    const x = s * 0.42;
    const zw = ZC - RZ * Math.sqrt(1 - (x / XW) ** 2);
    out.push(part(rb(0.05, 0.02, zw - back + 0.02, 0.004), pal.paint, { p: [x, y0 - 0.012, (zw + back) / 2] }));
    out.push(part(rb(0.05, 0.16, 0.02, 0.004), pal.paint, { p: [x, y0 + 0.06, zw - 0.005] }));
  }
  return out;
}

/** Complete turret, positioned on the hull. */
export function turret(pal: Palette): THREE.Group {
  const kids: THREE.Object3D[] = [];
  kids.push(...shell(pal));
  kids.push(gun(pal));
  kids.push(cupola(pal));
  kids.push(...roofFittings(pal));
  kids.push(...sideFittings(pal));
  kids.push(...stowageBin(pal));
  return group(kids, { p: [TURRET.x, TURRET.y, TURRET.z] });
}
