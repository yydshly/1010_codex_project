/**
 * Turret of the Pz.Kpfw. IV Ausf. H: welded turret from sloped plates (front 10 deg, sides
 * 25 deg, rear 12 deg) with a separate front plate and roof plates, external mantlet with the
 * 7.5 cm KwK 40 L/48, double-baffle muzzle brake, coaxial MG port and sight aperture, antenna
 * deflector rod under the gun, gunner's visor (the only front vision port on the H), two-leaf
 * side hatches, roof ventilator and signal port, lifting hooks, commander's cupola with five
 * glass vision blocks, single-piece hatch and MG ring, rear stowage bin and the turret
 * Schuerzen (sheet skirts on brackets) with two-leaf doors in line with the side hatches.
 *
 * Built in turret-local space: origin on the turret ring centre at the turret base, +Z forward.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Palette } from './materials';
import { TURRET, GUN } from './dims';
import { rb, cbox, nut, scatterN, convexFromPlanes, wallPlane, planeAt, basisGroup, latheZ, arcBand, type Plane, type V2 } from './util';

const D2R = Math.PI / 180;
/** side wall height (base to roof edge) and the front plate top edge */
const HT = 0.64;
const HF = 0.585;
/** where the sloped front roof plate meets the flat roof */
const ZB = 0.6;
const S_SIDE = 25, S_FRONT = 10, S_REAR = 12;
/** base outline (x, z): front plate corners, cheek/side corners, rear corners */
const FL: V2 = [0.58, 0.9], CL: V2 = [0.94, 0.5], RL: V2 = [0.86, -0.95];
const FR: V2 = [-0.58, 0.9], CR: V2 = [-0.94, 0.5], RR: V2 = [-0.86, -0.95];
const IN: V2 = [0, 0];
/** roof plate top */
const ROOF = HT + 0.013;
/** gun axis height and trunnion (turret local) */
const GY = GUN.y - TURRET.y;
const GZ = GUN.trunnionZ;
/** muzzle end in gun-local Z */
const MUZZLE = GUN.muzzleZ - TURRET.z - GZ;
/** side hatch centre (along Z) */
const DOOR_Z = 0.0;
/** turret skirt: inner face x, height range, front end, corner */
const SK = { x: 1.13, t: 0.006, y0: 0.05, y1: 0.61, zf: 0.5, zc: -0.93, rc: 0.5 };

const off = (p: Plane, o: number): Plane => ({ n: p.n, d: p.d + o });
const flip = (p: Plane): Plane => ({ n: [-p.n[0], -p.n[1], -p.n[2]], d: -p.d });

function planes() {
  const front = wallPlane(FR, FL, S_FRONT, IN);
  const cheekL = wallPlane(FL, CL, S_SIDE, IN);
  const cheekR = wallPlane(CR, FR, S_SIDE, IN);
  const sideL = wallPlane(CL, RL, S_SIDE, IN);
  const sideR = wallPlane(RR, CR, S_SIDE, IN);
  const rear = wallPlane(RL, RR, S_REAR, IN);
  const zF = FL[1] - HF * Math.tan(S_FRONT * D2R);
  const slope = planeAt([0, zF - ZB, HT - HF], [0, HF, zF]);
  const bottom = planeAt([0, -1, 0], [0, 0, 0]);
  const top = planeAt([0, 1, 0], [0, HT, 0]);
  return { front, cheekL, cheekR, sideL, sideR, rear, slope, bottom, top, zF };
}

/** Local frame on the left side wall at z = zc: x along the wall to the rear, y up the slope, z out. */
function sideFrame(zc: number) {
  const ex = RL[0] - CL[0], ez = RL[1] - CL[1];
  const l = Math.hypot(ex, ez);
  const x = new THREE.Vector3(ex / l, 0, ez / l);
  const z = new THREE.Vector3(...wallPlane(CL, RL, S_SIDE, IN).n);
  const y = new THREE.Vector3().crossVectors(z, x);
  const t = (zc - CL[1]) / ez;
  return { o: new THREE.Vector3(CL[0] + t * ex, 0, zc), x, y, z };
}

/** x of the left side wall face at height y and position z */
function sideX(y: number, z: number): number {
  const q = wallPlane(CL, RL, S_SIDE, IN);
  return (q.d - q.n[1] * y - q.n[2] * z) / q.n[0];
}

// ------------------------------------------------------------------ shell
function shell(pal: Palette): THREE.Object3D[] {
  const p = planes();
  const out: THREE.Object3D[] = [];
  const walls = [p.front, p.cheekL, p.cheekR, p.sideL, p.sideR, p.rear];
  out.push(part(convexFromPlanes([...walls, p.slope, p.bottom, p.top]), pal.paint));
  // 50 mm front plate, standing 12 mm proud of the body with visible edges
  out.push(
    part(
      convexFromPlanes([off(p.front, 0.012), flip(off(p.front, -0.05)), p.bottom, off(p.slope, 0.01), off(p.cheekL, 0.012), off(p.cheekR, 0.012), off(p.sideL, 0.012), off(p.sideR, 0.012)]),
      pal.paint,
    ),
  );
  // roof: flat plate and the sloped front roof plate, overhanging the walls by 8 mm
  const sides8 = [off(p.cheekL, 0.008), off(p.cheekR, 0.008), off(p.sideL, 0.008), off(p.sideR, 0.008), off(p.rear, 0.008)];
  out.push(part(convexFromPlanes([planeAt([0, 1, 0], [0, ROOF, 0]), planeAt([0, -1, 0], [0, HT - 0.025, 0]), planeAt([0, 0, 1], [0, 0, ZB - 0.002]), ...sides8]), pal.paint));
  out.push(
    part(
      convexFromPlanes([off(p.slope, 0.013), flip(off(p.slope, -0.025)), planeAt([0, 0, -1], [0, 0, ZB + 0.002]), off(p.front, 0.0125), ...sides8]),
      pal.paint,
    ),
  );
  // bolts along the roof edges
  const bolts: G.V3[] = [];
  for (let i = 0; i < 6; i++) {
    const z = 0.42 - i * 0.24;
    const xr = sideX(HT, z) - 0.05;
    bolts.push([xr, ROOF, z], [-xr, ROOF, z]);
  }
  for (let i = 0; i < 5; i++) bolts.push([-0.36 + i * 0.18, ROOF, -0.74]);
  out.push(part(scatterN(nut(0.022, 0.007), bolts, [0, 1, 0]), pal.paint));
  return out;
}

// ------------------------------------------------------------------ side hatches (left, mirrored)
function sideHatch(pal: Palette): THREE.Object3D {
  const f = sideFrame(DOOR_Z);
  const kids: THREE.Object3D[] = [];
  const v0 = 0.1, v1 = 0.56, vc = (v0 + v1) / 2, hh = v1 - v0;
  kids.push(part(rb(0.735, hh + 0.014, 0.004, 0.0015), pal.dark, { p: [0, vc, 0.0015] }));
  for (const s of [-1, 1]) {
    const uc = s * 0.181;
    kids.push(part(rb(0.352, hh, 0.03, 0.008), pal.paint, { p: [uc, vc, 0.012] }));
    // hinges on the outer edge
    for (const v of [v0 + 0.09, v1 - 0.09]) {
      kids.push(part(G.cyl(0.019, 0.019, 0.075, 14), pal.paint, { p: [s * 0.372, v, 0.03] }));
      kids.push(part(rb(0.11, 0.045, 0.012, 0.004), pal.paint, { p: [s * 0.325, v, 0.031] }));
    }
    // handle near the inner edge
    kids.push(part(G.tube([[s * 0.04, vc - 0.05, 0.026], [s * 0.04, vc - 0.04, 0.05], [s * 0.04, vc + 0.04, 0.05], [s * 0.04, vc + 0.05, 0.026]], 0.007, 8, 12), pal.paint));
  }
  return basisGroup(kids, f.o, f.x, f.y, f.z);
}

// ------------------------------------------------------------------ gun and mantlet (gun-local: origin at trunnion, +Z bore)
function mantletGeo(): THREE.BufferGeometry {
  const pts: V2[] = [
    [-0.3, -0.22],
    [0.3, -0.22],
    [0.3, 0.24],
    [-0.3, 0.24],
  ];
  const d = 0.1;
  const g = G.extrude(G.shape(pts, 0.07), d, 0.024, 10, 3);
  // follow the 10 deg slope of the front plate with the back face
  const pos = g.attributes.position;
  const k = Math.tan(S_FRONT * D2R);
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i), y = pos.getY(i);
    const b = Math.min(1, Math.max(0, -z / (d / 2)));
    pos.setZ(i, z - b * y * k + 0.13);
  }
  pos.needsUpdate = true;
  return G.crease(g, 40);
}

function gun(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  out.push(part(mantletGeo(), pal.cast));
  // bolts on the mantlet face
  const mb: G.V3[] = [[-0.22, 0.17, 0.181], [0.22, 0.17, 0.181], [-0.22, -0.15, 0.181], [0.22, -0.15, 0.181]];
  out.push(part(scatterN(nut(0.026, 0.01), mb, [0, 0, 1]), pal.cast));
  // gun sleeve (recoil guard) with flange
  out.push(
    part(
      latheZ([[0, 0.17], [0.136, 0.17], [0.136, 0.196], [0.118, 0.204], [0.111, 0.215], [0.107, 0.45], [0.1, 0.472], [0.088, 0.486], [0.08, 0.492], [0, 0.492]], 40, 35),
      pal.cast,
    ),
  );
  // barrel with the step of the reinforced rear section
  const bEnd = MUZZLE - 0.34;
  out.push(part(latheZ([[0, 0.48], [0.077, 0.48], [0.075, 1.35], [0.071, 1.37], [0.067, 1.4], [0.06, bEnd + 0.02], [0, bEnd + 0.02]], 32, 35), pal.paint));
  // double-baffle muzzle brake
  const z0 = bEnd;
  const disc = (a: number, b: number, rOut: number) =>
    latheZ([[0.042, a], [rOut - 0.006, a], [rOut, a + 0.006], [rOut, b - 0.006], [rOut - 0.006, b], [0.042, b], [0.042, a]], 36, 35);
  out.push(part(latheZ([[0.06, z0], [0.082, z0], [0.088, z0 + 0.012], [0.088, z0 + 0.055], [0.06, z0 + 0.055]], 32, 35), pal.paint));
  out.push(part(disc(z0 + 0.055, z0 + 0.1, 0.104), pal.paint));
  out.push(part(disc(z0 + 0.19, z0 + 0.23, 0.104), pal.paint));
  out.push(part(latheZ([[0.042, z0 + 0.3], [0.098, z0 + 0.3], [0.104, z0 + 0.306], [0.104, z0 + 0.325], [0.094, z0 + 0.34], [0.042, z0 + 0.34], [0.042, z0 + 0.3]], 36, 35), pal.paint));
  out.push(part(arcBand(0.084, 0.104, 48, 132, z0 + 0.09, z0 + 0.31, 10, 0.003), pal.paint));
  out.push(part(arcBand(0.084, 0.104, 228, 312, z0 + 0.09, z0 + 0.31, 10, 0.003), pal.paint));
  // bore
  out.push(part(G.cyl(0.0375, 0.0375, 0.5, 20, true), pal.dark, { p: [0, 0, MUZZLE - 0.25], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.0375, 0.0375, 0.004, 20), pal.dark, { p: [0, 0, z0 + 0.02], r: [90, 0, 0] }));
  // coaxial MG 34 port (tank's right) and gunner's sight aperture (tank's left)
  out.push(part(latheZ([[0, 0.16], [0.045, 0.16], [0.045, 0.19], [0.036, 0.205], [0.02, 0.21], [0, 0.21]], 24, 35), pal.cast, { p: [-0.19, 0.03, 0] }));
  out.push(part(G.cyl(0.0125, 0.0125, 0.05, 12), pal.gun, { p: [-0.19, 0.03, 0.225], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.006, 0.006, 0.003, 10), pal.dark, { p: [-0.19, 0.03, 0.2505], r: [90, 0, 0] }));
  out.push(part(rb(0.075, 0.055, 0.03, 0.01), pal.cast, { p: [0.165, 0.06, 0.18] }));
  out.push(part(rb(0.046, 0.024, 0.004, 0.002), pal.dark, { p: [0.165, 0.06, 0.1955] }));
  // antenna deflector rod under the gun, clamped to the barrel
  out.push(part(G.tube([[0, -0.2, 0.17], [0, -0.17, 0.4], [0, -0.13, 0.75], [0, -0.095, 1.05], [0, -0.084, 1.2]], 0.011, 8, 24), pal.paint));
  out.push(part(G.torus(0.078, 0.009, 8, 28), pal.paint, { p: [0, 0, 1.2] }));
  out.push(part(rb(0.03, 0.03, 0.06, 0.006), pal.paint, { p: [0, -0.085, 1.2] }));
  return group(out, { p: [0, GY, GZ] });
}

// ------------------------------------------------------------------ front plate fittings
function frontFittings(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const k = Math.tan(S_FRONT * D2R);
  const zOn = (y: number) => FL[1] - y * k + 0.0125;
  // gunner's visor (Sehklappe) left of the mantlet
  const vy = 0.36;
  out.push(
    group(
      [
        part(rb(0.2, 0.1, 0.045, 0.012), pal.cast, { p: [0, 0, 0.022] }),
        part(rb(0.15, 0.05, 0.03, 0.008), pal.cast, { p: [0, -0.004, 0.05] }),
        part(cbox(0.11, 0.009, 0.01, 0.001), pal.dark, { p: [0, 0.004, 0.062] }),
        part(scatterN(nut(0.018, 0.007), [[-0.08, -0.03, 0.045], [0.08, -0.03, 0.045]], [0, 0, 1]), pal.cast),
      ],
      { p: [0.43, vy, zOn(vy)], r: [-S_FRONT, 0, 0] },
    ),
  );
  // rain guard over the mantlet
  out.push(part(rb(0.72, 0.006, 0.07, 0.002), pal.paint, { p: [0, 0.572, zOn(0.572) + 0.03], r: [20, 0, 0] }));
  return out;
}

// ------------------------------------------------------------------ roof fittings
function roofFittings(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // ventilator (fume extractor) under an armoured mushroom cover
  out.push(part(G.cyl(0.1, 0.105, 0.012, 32), pal.paint, { p: [0, ROOF + 0.006, 0.3] }));
  out.push(part(G.cyl(0.07, 0.07, 0.04, 24), pal.paint, { p: [0, ROOF + 0.03, 0.3] }));
  out.push(part(G.lathe([[0, 0.0], [0.118, 0.0], [0.125, 0.008], [0.12, 0.02], [0.09, 0.03], [0, 0.034]], 32, 35), pal.cast, { p: [0, ROOF + 0.046, 0.3] }));
  // signal port with hinged cover (loader's side)
  out.push(part(G.cyl(0.075, 0.08, 0.015, 24), pal.paint, { p: [-0.3, ROOF + 0.0075, 0.16] }));
  out.push(part(G.cyl(0.06, 0.064, 0.018, 24), pal.cast, { p: [-0.3, ROOF + 0.024, 0.16] }));
  out.push(part(rb(0.05, 0.02, 0.05, 0.005), pal.paint, { p: [-0.3, ROOF + 0.02, 0.085] }));
  out.push(part(G.cyl(0.011, 0.011, 0.07, 10), pal.paint, { p: [-0.3, ROOF + 0.024, 0.075], r: [0, 0, 90] }));
  // lifting hooks
  for (const [x, z] of [[0.54, 0.46], [-0.54, 0.46], [0.46, -0.72], [-0.46, -0.72]] as V2[]) {
    out.push(part(rb(0.07, 0.012, 0.03, 0.004), pal.paint, { p: [x, ROOF + 0.006, z] }));
    out.push(part(G.torus(0.028, 0.01, 8, 16, Math.PI), pal.paint, { p: [x, ROOF + 0.008, z] }));
  }
  return out;
}

// ------------------------------------------------------------------ cupola
function cupola(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  out.push(
    part(
      G.lathe(
        [
          [0, 0],
          [0.345, 0],
          [0.345, 0.018],
          [0.33, 0.028],
          [0.316, 0.034],
          [0.316, 0.19],
          [0.333, 0.195],
          [0.333, 0.217],
          [0.31, 0.227],
          [0.268, 0.227],
          [0.268, 0.213],
          [0, 0.213],
        ],
        56,
        35,
      ),
      pal.cast,
    ),
  );
  // five vision blocks with armoured frames
  for (let k = 0; k < 5; k++) {
    const a = (k * 72 * Math.PI) / 180;
    const z = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const y = new THREE.Vector3(0, 1, 0);
    const x = new THREE.Vector3().crossVectors(y, z);
    const kids = [
      part(rb(0.13, 0.07, 0.03, 0.004), pal.dark, { p: [0, 0, -0.012] }),
      part(rb(0.112, 0.052, 0.008, 0.002), pal.glass, { p: [0, 0, 0.007] }),
      part(rb(0.18, 0.03, 0.05, 0.008), pal.cast, { p: [0, 0.05, 0.004] }),
      part(rb(0.18, 0.022, 0.036, 0.006), pal.cast, { p: [0, -0.046, -0.003] }),
      part(rb(0.024, 0.08, 0.036, 0.006), pal.cast, { p: [0.077, 0, -0.003] }),
      part(rb(0.024, 0.08, 0.036, 0.006), pal.cast, { p: [-0.077, 0, -0.003] }),
    ];
    out.push(basisGroup(kids, new THREE.Vector3(z.x * 0.316, 0.112, z.z * 0.316), x, y, z));
  }
  // single-piece hatch
  out.push(part(G.lathe([[0, 0.213], [0.262, 0.213], [0.262, 0.233], [0.25, 0.247], [0.2, 0.257], [0.12, 0.261], [0, 0.261]], 48, 30), pal.cast));
  out.push(part(G.tube([[-0.05, 0.257, 0.05], [-0.04, 0.276, 0.05], [0.04, 0.276, 0.05], [0.05, 0.257, 0.05]], 0.008, 8, 12), pal.paint));
  // hinge at the rear with its counterweight arm
  out.push(part(rb(0.14, 0.05, 0.07, 0.01), pal.cast, { p: [0, 0.235, -0.285] }));
  out.push(part(G.cyl(0.022, 0.022, 0.18, 14), pal.cast, { p: [0, 0.24, -0.31], r: [0, 0, 90] }));
  out.push(part(rb(0.06, 0.02, 0.12, 0.006), pal.cast, { p: [0, 0.257, -0.22] }));
  // MG ring (Fliegerbeschussgeraet) around the hatch ring
  out.push(part(G.torus(0.352, 0.011, 8, 64), pal.paint, { p: [0, 0.207, 0], r: [90, 0, 0] }));
  for (let k = 0; k < 6; k++) {
    const a = ((k * 60 + 36) * Math.PI) / 180;
    out.push(part(rb(0.03, 0.016, 0.03, 0.004), pal.paint, { p: [Math.sin(a) * 0.338, 0.207, Math.cos(a) * 0.338], r: [0, (a * 180) / Math.PI, 0] }));
  }
  return group(out, { p: [0, ROOF, -0.47] });
}

// ------------------------------------------------------------------ stowage bin
function stowageBin(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  out.push(part(G.rbox(1.24, 0.3, 0.4, 0.02, 2), pal.sheet, { p: [0, -0.02, 0] }));
  // lid (top and upper rear) with an overlapping lip
  out.push(part(G.rbox(1.252, 0.07, 0.412, 0.02, 2), pal.sheet, { p: [0, 0.145, -0.004] }));
  // stiffening swages on the rear face
  for (const x of [-0.31, 0.31]) out.push(part(rb(0.28, 0.12, 0.012, 0.006), pal.sheet, { p: [x, -0.03, -0.2] }));
  // latches
  for (const x of [-0.42, 0.42]) {
    out.push(part(rb(0.05, 0.07, 0.018, 0.005), pal.gun, { p: [x, 0.1, -0.212] }));
    out.push(part(G.cyl(0.008, 0.008, 0.05, 8), pal.gun, { p: [x, 0.13, -0.218], r: [0, 0, 90] }));
  }
  // lid hinges at the front edge
  for (const x of [-0.45, 0, 0.45]) out.push(part(G.cyl(0.012, 0.012, 0.09, 10), pal.sheet, { p: [x, 0.17, 0.205], r: [0, 0, 90] }));
  // mounting brackets to the turret rear plate
  for (const x of [-0.42, 0.42]) {
    out.push(part(rb(0.045, 0.02, 0.48, 0.004), pal.paint, { p: [x, -0.18, 0.03] }));
    out.push(part(rb(0.045, 0.2, 0.02, 0.004), pal.paint, { p: [x, -0.09, 0.225] }));
  }
  return group(out, { p: [0, 0.35, -1.12] });
}

// ------------------------------------------------------------------ turret Schuerzen
function skirts(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const { x, t, y0, y1, zf, zc, rc } = SK;
  const xm = x + t / 2;
  const h = y1 - y0, yc = (y0 + y1) / 2;
  const dz0 = DOOR_Z + 0.36, dz1 = DOOR_Z - 0.36;
  const left: THREE.Object3D[] = [];
  // front piece with chamfered top corner
  left.push(part(G.plate([[dz0 + 0.004, y0], [zf, y0], [zf, y1 - 0.09], [zf - 0.07, y1], [dz0 + 0.004, y1]], t, 'zy', 0.0015), pal.sheet, { p: [xm, 0, 0] }));
  // strips above and below the doors
  left.push(part(rb(t, 0.035, dz0 - dz1, 0.0015), pal.sheet, { p: [xm, y1 - 0.0175, DOOR_Z] }));
  left.push(part(rb(t, 0.035, dz0 - dz1, 0.0015), pal.sheet, { p: [xm, y0 + 0.0175, DOOR_Z] }));
  // two door leaves, hinged at their outer edges
  const dh = h - 0.078;
  for (const s of [1, -1]) {
    const zc2 = DOOR_Z + s * 0.18;
    left.push(part(rb(t, dh, 0.352, 0.0015), pal.sheet, { p: [xm + 0.001, yc, zc2] }));
    for (const v of [-0.17, 0, 0.17]) {
      left.push(part(G.cyl(0.011, 0.011, 0.06, 10), pal.sheet, { p: [xm + 0.012, yc + v, DOOR_Z + s * 0.365] }));
      left.push(part(rb(0.004, 0.035, 0.07, 0.001), pal.sheet, { p: [xm + 0.005, yc + v, DOOR_Z + s * 0.33] }));
    }
    // handle
    left.push(part(G.tube([[xm + 0.004, yc - 0.05, DOOR_Z + s * 0.03], [xm + 0.03, yc - 0.035, DOOR_Z + s * 0.03], [xm + 0.03, yc + 0.035, DOOR_Z + s * 0.03], [xm + 0.004, yc + 0.05, DOOR_Z + s * 0.03]], 0.006, 6, 12), pal.sheet));
  }
  // rear piece
  left.push(part(rb(t, h, dz1 - 0.004 - zc, 0.0015), pal.sheet, { p: [xm, yc, (dz1 - 0.004 + zc) / 2] }));
  // corner arc down to the rear piece
  const arc: V2[] = [];
  const ai: V2[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (-i / 12) * (Math.PI / 2);
    arc.push([x - rc + Math.cos(a) * (rc + t), zc + Math.sin(a) * (rc + t)]);
    ai.push([x - rc + Math.cos(a) * rc, zc + Math.sin(a) * rc]);
  }
  // 'xz' plate: outline x -> X, outline y -> Z (plate() maps y to +Z after its reflection)
  const band = G.plate([...arc, ...ai.reverse()], h, 'xz', 0.0015);
  left.push(part(band, pal.sheet, { p: [0, yc, 0] }));
  // brackets: struts from the turret wall to the skirt (upper and lower rows)
  for (const z of [0.43, -0.62]) {
    for (const [y, w] of [[y1 - 0.06, 0.05], [y0 + 0.07, 0.045]] as V2[]) {
      const xs = sideX(y, z);
      const len = x - xs;
      left.push(part(rb(len, 0.012, w, 0.003), pal.sheet, { p: [xs + len / 2, y, z] }));
      left.push(part(rb(0.012, 0.06, w + 0.02, 0.003), pal.sheet, { p: [x - 0.006, y, z] }));
    }
  }
  // rear diagonal strut over the stowage bin to the corner
  left.push(part(G.rod([0.6, y1 - 0.06, -0.82], [x - rc * 0.35, y1 - 0.06, zc - rc * 0.8], 0.011, 8), pal.sheet));
  out.push(mirrorX(group(left)));
  // rear straight piece (one plate across)
  const zr = zc - rc - t / 2;
  out.push(part(rb(2 * (x - rc) + 0.002, h, t, 0.0015), pal.sheet, { p: [0, yc, zr] }));
  // rear brackets from the bin frame
  for (const xx of [-0.3, 0.3]) out.push(part(rb(0.04, 0.012, 0.16, 0.003), pal.sheet, { p: [xx, y1 - 0.06, zr + 0.085] }));
  return out;
}

/** Complete turret, positioned on the hull (turret ring offset 66.5 mm to the left). */
export function turret(pal: Palette): THREE.Group {
  const kids: THREE.Object3D[] = [];
  kids.push(...shell(pal));
  kids.push(mirrorX(sideHatch(pal)));
  kids.push(gun(pal));
  kids.push(...frontFittings(pal));
  kids.push(...roofFittings(pal));
  kids.push(cupola(pal));
  kids.push(stowageBin(pal));
  kids.push(...skirts(pal));
  return group(kids, { p: [TURRET.x, TURRET.y, TURRET.z] });
}
