/**
 * Turret of the Panther Ausf. G (Ausf. A/G pattern): 100 mm front plate at 10 deg, 45 mm side and
 * rear plates at 25 deg, 16 mm roof; late "chin" mantlet (from September 1944) with the 7.5 cm
 * KwK 42 L/70 and its double-baffle muzzle brake, the monocular TZF 12a sight aperture and the
 * coaxial MG 34; cast commander's cupola with seven periscopes (glass) and the AA MG ring, the
 * loader's periscope, the Nahverteidigungswaffe close-defence projector, the roof ventilator,
 * three crane sockets (Pilze) and the round escape hatch in the rear plate. No pistol ports.
 *
 * Built in turret-local space: origin on the turret ring centre at the turret base, +Z forward.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Palette } from './materials';
import { TURRET, GUN } from './dims';
import { rb, cbox, nut, scatterN, basisGroup, latheZ, arcBand, slabZY, loftY, boltRingZ, bead, type V2 } from './util';

const D2R = Math.PI / 180;
/** turret height, base plan, slopes */
const HT = 0.72;
const ZF0 = 0.95, ZR0 = -1.35, XW0 = 1.0;
const T10 = Math.tan(10 * D2R), T25 = Math.tan(25 * D2R);
const ZF1 = ZF0 - HT * T10, ZR1 = ZR0 + HT * T25, XW1 = XW0 - HT * T25;
/** gun axis height and trunnion (turret local) */
const GY = GUN.y - TURRET.y;
const GZ = GUN.trunnionZ;
const MUZZLE = GUN.muzzleZ - TURRET.z - GZ;

/** Front plate outer face: z at local height y. */
const frontZ = (y: number) => ZF0 - y * T10;
/** Side plate outer face (left): x at local height y. */
const sideXt = (y: number) => XW0 - y * T25;
/** Rear plate outer face: z at local height y. */
const rearZt = (y: number) => ZR0 + y * T25;

function planRing(xw: number, zf: number, zr: number, chF: number, chR: number): V2[] {
  return [
    [xw - chF, zf],
    [-xw + chF, zf],
    [-xw, zf - chF],
    [-xw, zr + chR],
    [-xw + chR, zr],
    [xw - chR, zr],
    [xw, zr + chR],
    [xw, zf - chF],
  ];
}

// ------------------------------------------------------------------ shell
function shell(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const body = loftY([
    { y: 0.012, ring: planRing(XW0, ZF0, ZR0, 0.1, 0.16) },
    { y: HT, ring: planRing(XW1, ZF1, ZR1, 0.07, 0.12) },
  ]);
  out.push(part(body, pal.paint));
  // turret ring base / race collar
  out.push(part(G.cyl(0.86, 0.88, 0.02, 64), pal.cast, { p: [0, 0.01, 0] }));
  // roof plate lying on the walls, with a slightly raised front section
  out.push(part(loftY([
    { y: HT - 0.004, ring: planRing(XW1 - 0.01, ZF1 - 0.01, ZR1 + 0.01, 0.06, 0.11) },
    { y: HT + 0.016, ring: planRing(XW1 - 0.02, ZF1 - 0.02, ZR1 + 0.02, 0.05, 0.1) },
  ]), pal.paint));
  // weld beads: side plates to front plate (the front plate is interlocked with the sides)
  for (const s of [1, -1]) {
    out.push(part(bead([[s * (XW0 - 0.1), 0.03, ZF0 - 0.004], [s * (XW1 - 0.07), HT - 0.02, ZF1 - 0.004]], 0.006), pal.paint));
    out.push(part(bead([[s * (XW0 - 0.004), 0.03, ZR0 + 0.16], [s * (XW1 - 0.004), HT - 0.02, ZR1 + 0.12]], 0.006), pal.paint));
  }
  // roof bolts round the edge
  const bolts: G.V3[] = [];
  for (let i = 0; i < 7; i++) {
    const z = ZF1 - 0.12 - i * ((ZF1 - ZR1 - 0.3) / 6);
    bolts.push([XW1 - 0.06, HT + 0.016, z], [-(XW1 - 0.06), HT + 0.016, z]);
  }
  out.push(part(scatterN(nut(0.022, 0.008), bolts, [0, 1, 0]), pal.paint));
  return out;
}

// ------------------------------------------------------------------ gun and mantlet (gun-local: origin at trunnion, +Z bore)
function mantletGeo(): THREE.BufferGeometry {
  // side profile (z, y): flat back on the front plate, upper face curved round the trunnion,
  // lower part carried straight down into the flat "chin" that deflects shots away from the roof
  const R = 0.34, zb = -0.07;
  const pts: V2[] = [];
  pts.push([zb, -0.3], [0.2, -0.3], [0.25, -0.27], [0.27, -0.22], [0.29, -0.1]);
  for (let i = 0; i <= 12; i++) {
    const a = (-15 + (75 * i) / 12) * D2R;
    pts.push([-0.02 + Math.cos(a) * R, Math.sin(a) * R]);
  }
  pts.push([0.02, 0.3], [zb, 0.28]);
  const g = slabZY(pts, [], 1.26, 0.025);
  return g;
}

function muzzleBrake(pal: Palette, z0: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const R = 0.105, ri = 0.042;
  out.push(part(latheZ([[0.062, z0], [0.08, z0], [0.085, z0 + 0.01], [0.085, z0 + 0.05], [0.09, z0 + 0.055], [0.09, z0 + 0.07], [0.062, z0 + 0.07]], 32, 35), pal.paint));
  const baffle = (a: number, b: number) =>
    latheZ([[ri, a], [R - 0.016, a], [R - 0.004, a + 0.008], [R, a + 0.02], [R, b - 0.02], [R - 0.004, b - 0.008], [R - 0.016, b], [ri, b], [ri, a]], 36, 35);
  out.push(part(baffle(z0 + 0.07, z0 + 0.13), pal.paint));
  out.push(part(baffle(z0 + 0.22, z0 + 0.28), pal.paint));
  out.push(part(latheZ([[ri, z0 + 0.37], [R - 0.016, z0 + 0.37], [R - 0.004, z0 + 0.378], [R, z0 + 0.39], [R - 0.004, z0 + 0.41], [R - 0.02, z0 + 0.425], [0.07, z0 + 0.432], [ri, z0 + 0.432], [ri, z0 + 0.37]], 36, 35), pal.paint));
  for (const [a0, a1] of [[40, 140], [220, 320]]) out.push(part(arcBand(R - 0.02, R - 0.002, a0, a1, z0 + 0.09, z0 + 0.4, 10, 0.004), pal.paint));
  return out;
}

function gun(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  out.push(part(mantletGeo(), pal.cast));
  const zFace = 0.31; // mantlet face on the axis
  // gun sleeve collar on the mantlet, bolt ring
  out.push(part(latheZ([[0.0, zFace - 0.04], [0.15, zFace - 0.04], [0.15, zFace + 0.02], [0.142, zFace + 0.05], [0.125, zFace + 0.07], [0.11, zFace + 0.2], [0.1, zFace + 0.215], [0.0, zFace + 0.215]], 40, 35), pal.cast));
  out.push(part(G.scatter(nut(0.026, 0.01), boltRingZ(0.145, 8, zFace + 0.0, Math.PI / 8).map((b) => ({ p: b.p, n: new THREE.Vector3(b.p.x, b.p.y, 0).normalize() }))), pal.cast));
  // barrel: thicker rear section, long taper, thread collar for the brake
  const bEnd = MUZZLE - 0.432;
  out.push(
    part(
      latheZ([[0, zFace + 0.15], [0.088, zFace + 0.15], [0.088, zFace + 0.62], [0.08, zFace + 0.66], [0.077, zFace + 1.0], [0.068, 2.6], [0.06, bEnd - 0.06], [0.064, bEnd - 0.05], [0.064, bEnd + 0.01], [0, bEnd + 0.01]], 32, 30),
      pal.paint,
    ),
  );
  out.push(...muzzleBrake(pal, bEnd));
  out.push(part(G.cyl(0.038, 0.038, 0.004, 20), pal.dark, { p: [0, 0, bEnd + 0.012], r: [90, 0, 0] }));
  // monocular sight aperture (TZF 12a) left of the gun, coaxial MG 34 ball to the right
  const onFace = (x: number, y: number) => {
    const R = 0.34;
    const zz = -0.02 + Math.sqrt(Math.max(0, R * R - y * y));
    return new THREE.Vector3(x, y, zz);
  };
  const sp = onFace(0.3, 0.11);
  out.push(part(latheZ([[0.0, -0.01], [0.04, -0.01], [0.04, 0.014], [0.03, 0.024], [0.0, 0.024]], 20, 35), pal.cast, { p: sp }));
  out.push(part(G.cyl(0.018, 0.018, 0.004, 16), pal.dark, { p: [sp.x, sp.y, sp.z + 0.024], r: [90, 0, 0] }));
  const mp = onFace(-0.3, 0.03);
  out.push(part(latheZ([[0, -0.01], [0.05, -0.01], [0.05, 0.02], [0.04, 0.036], [0.026, 0.042], [0, 0.042]], 24, 35), pal.cast, { p: mp }));
  out.push(part(G.cyl(0.012, 0.012, 0.05, 12), pal.gun, { p: [mp.x, mp.y, mp.z + 0.06], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.006, 0.006, 0.003, 10), pal.dark, { p: [mp.x, mp.y, mp.z + 0.086], r: [90, 0, 0] }));
  // lifting eye on the mantlet top
  out.push(part(G.torus(0.03, 0.01, 8, 16, Math.PI), pal.cast, { p: [0.0, 0.3, 0.06], r: [0, 90, 0] }));
  return group(out, { p: [0, GY, GZ] });
}

// ------------------------------------------------------------------ roof fittings
function cupola(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  const base = 0.33, top = 0.19;
  out.push(
    part(
      G.lathe(
        [
          [0.26, 0],
          [base, 0],
          [base, 0.02],
          [base - 0.012, 0.03],
          [0.31, 0.15],
          [0.298, 0.175],
          [0.29, top],
          [0.24, top],
          [0.24, top - 0.02],
          [0.22, top - 0.02],
        ],
        56,
        30,
      ),
      pal.cast,
    ),
  );
  // seven periscopes in the sloped face under cast brows, with glass
  for (let k = 0; k < 7; k++) {
    const a = ((k + 0.5) * 2 * Math.PI) / 7;
    const radial = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const up = new THREE.Vector3(0, 1, 0);
    const xAx = new THREE.Vector3().crossVectors(up, radial).normalize();
    const zAx = radial.clone().multiplyScalar(0.12).add(up.clone().multiplyScalar(0.02)).normalize();
    const yAx = new THREE.Vector3().crossVectors(zAx, xAx).normalize();
    const r0 = 0.322, y0 = 0.09;
    const kids = [
      part(rb(0.12, 0.05, 0.03, 0.005), pal.dark, { p: [0, 0, -0.01] }),
      part(rb(0.1, 0.036, 0.006, 0.002), pal.glass, { p: [0, 0, 0.003] }),
      part(rb(0.15, 0.03, 0.045, 0.008), pal.cast, { p: [0, 0.042, 0.002] }),
    ];
    out.push(basisGroup(kids, new THREE.Vector3(radial.x * r0, y0, radial.z * r0), xAx, yAx, zAx));
  }
  // hatch lid (lifts and swings) with its pivot housing
  out.push(part(G.lathe([[0, top - 0.004], [0.232, top - 0.004], [0.234, top + 0.014], [0.214, top + 0.028], [0.15, top + 0.036], [0.0, top + 0.04]], 44, 30), pal.cast));
  out.push(part(G.cyl(0.045, 0.05, 0.09, 20), pal.cast, { p: [-0.25, top + 0.01, -0.1] }));
  out.push(part(rb(0.12, 0.028, 0.07, 0.008), pal.cast, { p: [-0.19, top + 0.042, -0.08], r: [0, -30, 0] }));
  out.push(part(G.tube([[-0.05, top + 0.036, 0.07], [-0.04, top + 0.058, 0.07], [0.04, top + 0.058, 0.07], [0.05, top + 0.036, 0.07]], 0.008, 8, 12), pal.paint));
  // AA MG ring (Fliegerbeschussgeraet) on the periscope brows, with its mount
  out.push(part(G.torus(0.33, 0.012, 8, 64, Math.PI * 1.7), pal.paint, { p: [0, 0.165, 0], r: [90, 0, 90 + 20] }));
  out.push(part(rb(0.08, 0.05, 0.06, 0.01), pal.paint, { p: [0.0, 0.19, -0.33] }));
  out.push(part(G.cyl(0.014, 0.014, 0.08, 10), pal.gun, { p: [0.0, 0.25, -0.33] }));
  return group(out, { p: [0.31, HT + 0.016, -0.6] });
}

function roofFittings(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = HT + 0.016;
  // loader's periscope (right front)
  out.push(part(rb(0.18, 0.02, 0.15, 0.006), pal.paint, { p: [-0.38, y + 0.01, 0.35] }));
  out.push(part(rb(0.14, 0.065, 0.11, 0.013), pal.cast, { p: [-0.38, y + 0.05, 0.35] }));
  out.push(part(rb(0.17, 0.013, 0.14, 0.005), pal.cast, { p: [-0.38, y + 0.089, 0.355] }));
  out.push(part(cbox(0.1, 0.03, 0.005, 0.001), pal.glass, { p: [-0.38, y + 0.052, 0.407] }));
  out.push(part(cbox(0.11, 0.04, 0.004, 0.001), pal.dark, { p: [-0.38, y + 0.052, 0.404] }));
  // ventilator (fume extractor) under its armoured cover, roof front centre
  out.push(part(G.cyl(0.1, 0.105, 0.014, 32), pal.paint, { p: [0.05, y + 0.007, 0.5] }));
  out.push(part(G.cyl(0.065, 0.065, 0.04, 24), pal.paint, { p: [0.05, y + 0.034, 0.5] }));
  out.push(part(G.lathe([[0, 0], [0.12, 0], [0.126, 0.008], [0.118, 0.02], [0.08, 0.03], [0, 0.034]], 36, 35), pal.cast, { p: [0.05, y + 0.054, 0.5] }));
  // Nahverteidigungswaffe (close-defence projector), right rear of the roof
  out.push(part(G.cyl(0.11, 0.115, 0.02, 32), pal.paint, { p: [-0.36, y + 0.01, -0.62] }));
  out.push(part(G.cyl(0.075, 0.08, 0.1, 28), pal.cast, { p: [-0.36, y + 0.07, -0.62] }));
  out.push(part(G.cyl(0.085, 0.085, 0.018, 28), pal.cast, { p: [-0.36, y + 0.129, -0.62] }));
  out.push(part(G.cyl(0.03, 0.03, 0.008, 16), pal.gun, { p: [-0.36, y + 0.142, -0.62] }));
  // three crane sockets (Pilze)
  for (const [x, z] of [[0.45, 0.25], [-0.5, -0.15], [0.05, -0.95]] as V2[]) {
    out.push(part(G.cyl(0.035, 0.04, 0.05, 16), pal.paint, { p: [x, y + 0.025, z] }));
    out.push(part(G.cyl(0.055, 0.05, 0.03, 20), pal.paint, { p: [x, y + 0.065, z] }));
  }
  return out;
}

// ------------------------------------------------------------------ rear escape hatch
function rearHatch(pal: Palette): THREE.Object3D {
  const ly = 0.36;
  const o = new THREE.Vector3(0, ly, rearZt(ly));
  const n = new THREE.Vector3(0, Math.sin(25 * D2R), -Math.cos(25 * D2R));
  const u = new THREE.Vector3(0, Math.cos(25 * D2R), Math.sin(25 * D2R));
  const kids = [
    part(latheZ([[0.0, 0], [0.25, 0], [0.25, 0.016], [0.238, 0.026], [0.0, 0.026]], 44, 35), pal.paint),
    part(latheZ([[0.0, 0.024], [0.215, 0.024], [0.215, 0.04], [0.2, 0.05], [0.0, 0.052]], 44, 35), pal.cast),
    part(rb(0.2, 0.06, 0.07, 0.012), pal.cast, { p: [0, -0.22, 0.035] }),
    part(G.cyl(0.024, 0.024, 0.26, 14), pal.cast, { p: [0, -0.23, 0.06], r: [0, 0, 90] }),
    part(G.tube([[-0.06, 0.12, 0.052], [-0.045, 0.15, 0.08], [0.045, 0.15, 0.08], [0.06, 0.12, 0.052]], 0.009, 8, 16), pal.paint),
  ];
  return basisGroup(kids, o, new THREE.Vector3(-1, 0, 0), u, n);
}

/** Complete turret, positioned on the hull. */
export function turret(pal: Palette): THREE.Group {
  const kids: THREE.Object3D[] = [];
  kids.push(...shell(pal));
  kids.push(gun(pal));
  kids.push(cupola(pal));
  kids.push(...roofFittings(pal));
  kids.push(rearHatch(pal));
  return group(kids, { p: [TURRET.x, TURRET.y, TURRET.z] });
}

/** Outer faces of the turret (local), exported for fittings. */
export const TURRET_FACES = { frontZ, sideXt, rearZt, HT };
