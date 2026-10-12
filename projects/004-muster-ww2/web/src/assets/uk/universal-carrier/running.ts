/**
 * Running gear of the Universal Carrier (built for the left side, mirrored for the right):
 * Horstmann springing with a two-wheel bogie at the front (bell cranks joined by a horizontal coil
 * spring) and a single-wheel "half bogie" at the rear (arm and crank sprung against a fixed bracket),
 * three pressed-disc road wheels with solid rubber tyres, the front idler on its bracket with the track
 * adjuster, the rear drive sprocket on the Ford axle with its steering brake drum, and 167 individually
 * modelled links per side.
 */
import { THREE, G, group, mirrorX } from '../../../core/kit';
import type { Pal } from './palette';
import { TRACK, WHEEL, SPROCKET, IDLER, H } from './dims';
import { trackLayout, linkGeometry, linkMatrices } from './track';
import { Bucket, latheX, cylX, boltRingX, hullOutline, nut, prism, rb, coil, alongDir, type P2, type P3 } from './util';

const TX = TRACK.x;
const XH = H.xSide;

/* ------------------------------------------------------------------ geometry cache */
let cache: Record<string, THREE.BufferGeometry> | null = null;
function geos() {
  if (cache) return cache;
  const c: Record<string, THREE.BufferGeometry> = {};
  const hw = WHEEL.w / 2;
  // solid rubber tyre, rounded shoulders
  c.tyre = latheX(
    [
      [0.214, -hw + 0.003],
      [0.236, -hw + 0.001],
      [0.247, -hw + 0.006],
      [0.2535, -hw + 0.016],
      [WHEEL.r, -hw + 0.03],
      [WHEEL.r, hw - 0.03],
      [0.2535, hw - 0.016],
      [0.247, hw - 0.006],
      [0.236, hw - 0.001],
      [0.214, hw - 0.003],
    ],
    44,
    50,
  );
  // pressed steel wheel: rim band with rolled lips, outer dished disc with a pressed ring, hub boss
  c.wheelDisc = latheX(
    [
      [0.2, -hw - 0.002],
      [0.219, -hw - 0.004],
      [0.221, -hw + 0.004],
      [0.212, -hw + 0.01],
      [0.212, hw - 0.01],
      [0.221, hw - 0.004],
      [0.219, hw + 0.004],
      [0.2, hw + 0.002],
      [0.186, hw - 0.004],
      [0.168, hw - 0.008],
      [0.158, hw - 0.004],
      [0.146, hw - 0.004],
      [0.136, hw - 0.01],
      [0.105, hw - 0.018],
      [0.084, hw - 0.016],
      [0.078, hw - 0.004],
      [0.068, hw + 0.004],
    ],
    44,
    32,
  );
  c.wheelDiscIn = latheX(
    [
      [0.068, -hw + 0.012],
      [0.11, -hw + 0.02],
      [0.17, -hw + 0.008],
      [0.201, -hw - 0.001],
    ],
    36,
    35,
  );
  // hub: boss, cap, six wheel nuts
  c.hub = latheX(
    [
      [0.0, hw - 0.02],
      [0.07, hw - 0.02],
      [0.07, hw + 0.012],
      [0.062, hw + 0.018],
      [0.04, hw + 0.018],
      [0.036, hw + 0.03],
      [0.03, hw + 0.037],
      [0.0, hw + 0.039],
    ],
    28,
    35,
  );
  c.hubNuts = G.scatter(nut(0.017, 0.008), boltRingX(0.052, 6, hw + 0.018, 1, Math.PI / 6));
  // idler: steel disc wheel, running rim between the guide horns, dished discs both sides
  const ihw = 0.045;
  c.idlerRim = latheX(
    [
      [0.175, -ihw],
      [0.2, -ihw],
      [IDLER.r - 0.002, -ihw + 0.004],
      [IDLER.r, -ihw + 0.012],
      [IDLER.r, ihw - 0.012],
      [IDLER.r - 0.002, ihw - 0.004],
      [0.2, ihw],
      [0.175, ihw],
      [0.172, ihw - 0.01],
      [0.172, -ihw + 0.01],
    ],
    48,
    40,
  );
  c.idlerDisc = latheX(
    [
      [0.176, ihw - 0.012],
      [0.15, ihw + 0.0],
      [0.1, ihw + 0.014],
      [0.075, ihw + 0.018],
      [0.07, ihw + 0.03],
      [0.055, ihw + 0.036],
      [0.035, ihw + 0.04],
      [0.03, ihw + 0.052],
      [0.0, ihw + 0.054],
    ],
    40,
    35,
  );
  c.idlerDiscIn = latheX(
    [
      [0.0, -ihw - 0.03],
      [0.06, -ihw - 0.03],
      [0.08, -ihw - 0.014],
      [0.13, -ihw - 0.004],
      [0.176, -ihw + 0.012],
    ],
    36,
    35,
  );
  c.idlerNuts = G.scatter(nut(0.016, 0.007), boltRingX(0.064, 6, ihw + 0.03, 1));
  c.link = linkGeometry();
  cache = c;
  return c;
}

/* ------------------------------------------------------------------ wheels */
function roadWheel(B: Bucket, P: Pal, z: number, spin: number) {
  const g = geos();
  const m = new THREE.Matrix4().makeRotationX(spin).setPosition(TX, WHEEL.y, z);
  B.add(P.rubber, g.tyre, m);
  B.add(P.paint, g.wheelDisc, m);
  B.add(P.paint, g.wheelDiscIn, m);
  B.add(P.cast, g.hub, m);
  B.add(P.cast, g.hubNuts, m);
}

/* ------------------------------------------------------------------ Horstmann units */
const ARM_X = TX - WHEEL.w / 2 - 0.022; // arm plane (between the bogie frame and the wheels)
const SPRING_X = 0.79;
const SPRING_Y = 0.455;
const PIV_Y = 0.37;
const PIV_Y_REAR = 0.35;

/** Coil spring with its guide rod and cups between two points (same x). */
function springUnit(B: Bucket, P: Pal, a: P3, b: P3, turns = 8) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
  const dir = Bv.clone().sub(A);
  const len = dir.length();
  const cupL = 0.022;
  const m = alongDir(a, [dir.x, dir.y, dir.z]);
  // spring between the cups
  const spring = coil(len - 2 * cupL, 0.029, 0.0068, turns, 7);
  spring.translate(0, cupL, 0);
  B.add(P.spring, spring, m);
  // cups (spring seats) and the telescopic guide rod
  for (const [y0, flip] of [[0, 1], [len, -1]] as [number, number][]) {
    const cup = G.lathe([[0.0, 0], [0.038, 0], [0.038, 0.006], [0.034, 0.008], [0.024, 0.01], [0.022, cupL], [0.0, cupL]], 20, 40);
    if (flip < 0) cup.rotateX(Math.PI);
    cup.translate(0, y0, 0);
    B.add(P.cast, cup, m);
  }
  const rod = new THREE.CylinderGeometry(0.009, 0.009, len - 0.01, 10, 1);
  rod.translate(0, len / 2, 0);
  B.add(P.steel, rod, m);
  const sleeve = new THREE.CylinderGeometry(0.014, 0.014, len * 0.5, 12, 1);
  sleeve.translate(0, len * 0.27, 0);
  B.add(P.steel, sleeve, m);
}

/** Pivot pin + boss from the bogie frame through the arm, with its castle nut. */
function pivot(B: Bucket, P: Pal, z: number, y: number, x0: number, x1: number, r = 0.022) {
  B.put(P.steel, cylX(r * 0.55, x1 - x0 + 0.03, 12), [(x0 + x1) / 2 + 0.01, y, z]);
  B.put(P.cast, cylX(r, x1 - x0, 18), [(x0 + x1) / 2, y, z]);
  B.put(P.steel, nut(0.03, 0.012), [x1 + 0.012, y, z], [0, 0, -90]);
}

/** Wheel spindle from the arm into the hub. */
function spindle(B: Bucket, P: Pal, z: number) {
  B.put(P.cast, cylX(0.034, TX - WHEEL.w / 2 + 0.02 - ARM_X + 0.012, 18), [(ARM_X + TX - WHEEL.w / 2 + 0.02) / 2, WHEEL.y, z]);
  B.put(P.cast, cylX(0.05, 0.012, 20), [ARM_X + 0.018, WHEEL.y, z]);
}

/** Bogie frame: mounting plate bolted to the hull side + cast body out to the pivot plane. */
function bogieFrame(B: Bucket, P: Pal, zc: number, half: number) {
  const plate = prism(
    [
      [zc - half, 0.3],
      [zc + half, 0.3],
      [zc + half - 0.03, 0.55],
      [zc - half + 0.03, 0.55],
    ],
    0.018,
    'zy',
    0.004,
  );
  B.put(P.cast, plate, [XH + 0.009, 0, 0]);
  const bolts: { p: P3; n: P3 }[] = [];
  for (const dz of [-half + 0.035, -half / 3, half / 3, half - 0.035]) {
    bolts.push({ p: [XH + 0.018, 0.525, zc + dz * 0.95], n: [1, 0, 0] });
    bolts.push({ p: [XH + 0.018, 0.325, zc + dz], n: [1, 0, 0] });
  }
  B.add(P.cast, G.scatter(nut(0.022, 0.009), bolts));
  // cast body (a deep box with chamfered ends) from the plate out to the arm plane
  const body = prism(
    [
      [zc - half + 0.06, 0.31],
      [zc + half - 0.06, 0.31],
      [zc + half - 0.02, 0.35],
      [zc + half - 0.03, 0.408],
      [zc - half + 0.03, 0.408],
      [zc - half + 0.02, 0.35],
    ],
    ARM_X - 0.016 - (XH + 0.018),
    'zy',
    0.008,
  );
  B.put(P.cast, body, [(ARM_X - 0.016 + XH + 0.018) / 2, 0, 0]);
  // ribs on the outer face
  for (const dz of [-half * 0.45, 0, half * 0.45]) B.put(P.cast, rb(0.016, 0.08, 0.018, 0.005), [ARM_X - 0.02, 0.36, zc + dz]);
}

/** Arm plate (bell crank) through several circles, in the arm plane. */
function arm(B: Bucket, P: Pal, circles: { c: P2; r: number }[], t = 0.022) {
  B.put(P.cast, prism(hullOutline(circles, 9), t, 'zy', 0.005), [ARM_X, 0, 0]);
}

function frontBogie(B: Bucket, P: Pal) {
  const [zF, zM] = WHEEL.z;
  const zc = (zF + zM) / 2;
  bogieFrame(B, P, zc, 0.2);
  const pF: P2 = [zc + 0.13, PIV_Y], pM: P2 = [zc - 0.13, PIV_Y];
  // front wheel: straight arm with its crank horn; middle wheel: bell crank
  arm(B, P, [{ c: pF, r: 0.036 }, { c: [zF, WHEEL.y], r: 0.045 }, { c: [pF[0] - 0.02, SPRING_Y], r: 0.026 }]);
  arm(B, P, [{ c: pM, r: 0.036 }, { c: [zM, WHEEL.y], r: 0.045 }, { c: [pM[0] + 0.02, SPRING_Y], r: 0.026 }]);
  for (const p of [pF, pM]) pivot(B, P, p[0], p[1], XH + 0.02, ARM_X + 0.011);
  // spring between the crank horns (pins through the horn eyes)
  const a: P3 = [SPRING_X, SPRING_Y, pM[0] + 0.035];
  const b: P3 = [SPRING_X, SPRING_Y, pF[0] - 0.035];
  springUnit(B, P, a, b, 6);
  for (const z of [pM[0] + 0.02, pF[0] - 0.02]) {
    B.put(P.steel, cylX(0.011, ARM_X - SPRING_X + 0.03, 10), [(ARM_X + SPRING_X) / 2, SPRING_Y, z]);
    B.put(P.cast, rb(0.05, 0.05, 0.03, 0.008), [SPRING_X + 0.005, SPRING_Y, z + (z < zc ? 0.004 : -0.004)]);
  }
  spindle(B, P, zF);
  spindle(B, P, zM);
}

function rearUnit(B: Bucket, P: Pal) {
  const zR = WHEEL.z[2];
  const pv: P2 = [zR + 0.24, PIV_Y_REAR];
  const zc = zR + 0.36;
  bogieFrame(B, P, zc, 0.17);
  // trailing arm with its crank horn
  arm(B, P, [{ c: pv, r: 0.036 }, { c: [zR, WHEEL.y], r: 0.045 }, { c: [pv[0] - 0.015, SPRING_Y], r: 0.026 }]);
  pivot(B, P, pv[0], pv[1], XH + 0.02, ARM_X + 0.011);
  // fixed crank bracket ahead of the pivot, the spring runs back from it to the arm's horn
  const fz = zc + 0.13;
  B.put(P.cast, prism(hullOutline([{ c: [fz, 0.36], r: 0.03 }, { c: [fz, SPRING_Y], r: 0.03 }], 8), 0.024, 'zy', 0.005), [ARM_X, 0, 0]);
  B.put(P.steel, cylX(0.011, ARM_X - SPRING_X + 0.03, 10), [(ARM_X + SPRING_X) / 2, SPRING_Y, fz]);
  B.put(P.cast, rb(0.05, 0.05, 0.03, 0.008), [SPRING_X + 0.005, SPRING_Y, fz - 0.004]);
  B.put(P.steel, cylX(0.011, ARM_X - SPRING_X + 0.03, 10), [(ARM_X + SPRING_X) / 2, SPRING_Y, pv[0] - 0.015]);
  B.put(P.cast, rb(0.05, 0.05, 0.03, 0.008), [SPRING_X + 0.005, SPRING_Y, pv[0] - 0.011]);
  springUnit(B, P, [SPRING_X, SPRING_Y, pv[0] + 0.0], [SPRING_X, SPRING_Y, fz - 0.019], 7);
  spindle(B, P, zR);
}

/* ------------------------------------------------------------------ sprocket */
function sprocket(B: Bucket, P: Pal, toothAngles: number[]) {
  const { z, y, pitchR } = SPROCKET;
  const linkMidR = pitchR * Math.cos(Math.PI / 30);
  const rootR = linkMidR - TRACK.inner - 0.004;
  const tipR = linkMidR + 0.006;
  // toothed ring: root circle with 15 teeth (each tooth centred on a link window)
  const s = new THREE.Shape();
  const pts: P2[] = [];
  const nSeg = 15 * 8;
  const halfTooth = 0.0085 / linkMidR; // half angular width at the tip
  for (let i = 0; i < nSeg; i++) {
    const a = (i / nSeg) * Math.PI * 2;
    pts.push([Math.cos(a) * rootR, Math.sin(a) * rootR]);
  }
  s.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) s.lineTo(p[0], p[1]);
  s.closePath();
  const hole = new THREE.Path();
  for (let i = 0; i <= 32; i++) {
    const a = -(i / 32) * Math.PI * 2;
    if (i === 0) hole.moveTo(Math.cos(a) * 0.07, Math.sin(a) * 0.07);
    else hole.lineTo(Math.cos(a) * 0.07, Math.sin(a) * 0.07);
  }
  s.holes.push(hole);
  const ringW = 0.034;
  const ring = G.extrude(s, ringW, 0.003, 1, 1);
  ring.rotateY(Math.PI / 2); // outline (u, v) -> (-z, y)
  B.put(P.cast, ring, [TX, y, z]);
  // teeth: individual tapered blocks at the link-centre angles
  for (const a of toothAngles) {
    const tooth = prism(
      [
        [-0.012, rootR - 0.006],
        [0.012, rootR - 0.006],
        [halfTooth * linkMidR * 0.8, tipR - 0.004],
        [halfTooth * linkMidR * 0.45, tipR],
        [-halfTooth * linkMidR * 0.45, tipR],
        [-halfTooth * linkMidR * 0.8, tipR - 0.004],
      ],
      0.028,
      'xy',
      0.002,
    );
    // outline x = tangential, y = radial; rotate so radial points at angle a in the (z, y) plane
    const m = new THREE.Matrix4().makeRotationY(Math.PI / 2); // outline x -> -z ... thickness along X
    const r = new THREE.Matrix4().makeRotationX(-(a - Math.PI / 2));
    const t = new THREE.Matrix4().makeTranslation(TX, y, z);
    B.add(P.cast, tooth, t.multiply(r).multiply(m));
  }
  // dished outer disc, hub, bolts and cap (outboard)
  const xo = TX + ringW / 2;
  B.put(P.cast, latheX([[0.07, -0.004], [0.165, -0.004], [0.17, 0.004], [0.14, 0.014], [0.1, 0.02], [0.08, 0.03], [0.07, 0.03]], 40, 35), [xo, y, z]);
  B.add(P.cast, G.scatter(nut(0.018, 0.008), boltRingX(0.13, 10, xo + 0.006, 1, 0.2)), new THREE.Matrix4().makeTranslation(0, y, z));
  B.put(P.cast, latheX([[0.0, 0.0], [0.072, 0.0], [0.072, 0.03], [0.06, 0.042], [0.045, 0.046], [0.04, 0.062], [0.0, 0.066]], 32, 35), [xo, y, z]);
  B.add(P.cast, G.scatter(nut(0.016, 0.007), boltRingX(0.056, 6, xo + 0.043, 1)), new THREE.Matrix4().makeTranslation(0, y, z));
  // inner disc, brake drum and the axle housing out of the hull side
  const xi = TX - ringW / 2;
  B.put(P.cast, latheX([[0.07, 0.004], [0.165, 0.004], [0.16, -0.012], [0.1, -0.02], [0.07, -0.02]], 40, 35), [xi, y, z]);
  B.put(P.cast, latheX([[0.125, -0.052], [0.132, -0.046], [0.132, -0.006], [0.125, 0.0], [0.06, 0.0]], 40, 40), [xi - 0.02, y, z]);
  B.put(P.cast, latheX([[0.075, 0.0], [0.075, 0.012], [0.06, 0.012], [0.06, xi - 0.075 - XH], [0.09, xi - 0.075 - XH], [0.09, xi - 0.06 - XH]], 32, 40), [XH, y, z]);
  B.add(P.cast, G.scatter(nut(0.018, 0.008), boltRingX(0.078, 8, XH + 0.013, 1, 0.3)), new THREE.Matrix4().makeTranslation(0, y, z));
}

/* ------------------------------------------------------------------ idler */
function idler(B: Bucket, P: Pal, zI: number) {
  const g = geos();
  const y = IDLER.y;
  const m = new THREE.Matrix4().makeRotationX(0.4).setPosition(TX, y, zI);
  B.add(P.paint, g.idlerRim, m);
  B.add(P.paint, g.idlerDisc, m);
  B.add(P.paint, g.idlerDiscIn, m);
  B.add(P.cast, g.idlerNuts, m);
  // stub axle into the bracket, cast bracket on the hull side (slotted for the adjuster)
  const xi = TX - 0.045 - 0.03;
  B.put(P.cast, cylX(0.036, xi - XH - 0.02, 18), [(xi + XH + 0.02) / 2, y, zI]);
  const br = prism(
    [
      [zI - 0.2, y - 0.1],
      [zI + 0.07, y - 0.07],
      [zI + 0.09, y + 0.07],
      [zI - 0.2, y + 0.11],
    ],
    0.03,
    'zy',
    0.006,
  );
  B.put(P.cast, br, [XH + 0.015, 0, 0]);
  B.put(P.cast, rb(0.05, 0.1, 0.12, 0.01), [XH + 0.05, y, zI]);
  B.add(
    P.cast,
    G.scatter(
      nut(0.022, 0.009),
      ([[-0.17, -0.07], [-0.17, 0.08], [-0.06, 0.09], [-0.06, -0.08], [0.05, 0.05], [0.05, -0.05]] as P2[]).map(([dz, dy]) => ({ p: [XH + 0.03, y + dy, zI + dz] as P3, n: [1, 0, 0] as P3 })),
    ),
  );
  // track adjuster: threaded rod from a rear lug into the axle block, lock nuts
  B.put(P.cast, rb(0.04, 0.06, 0.05, 0.008), [XH + 0.05, y, zI - 0.24]);
  B.add(P.steel, G.rod([XH + 0.05, y, zI - 0.22], [XH + 0.05, y, zI - 0.06], 0.011, 10));
  B.put(P.steel, nut(0.03, 0.016), [XH + 0.05, y, zI - 0.2], [90, 0, 0]);
  B.put(P.steel, nut(0.03, 0.016), [XH + 0.05, y, zI - 0.1], [90, 0, 0]);
}

/* ------------------------------------------------------------------ track */
function track(B: Bucket, P: Pal) {
  const g = geos();
  const lay = trackLayout();
  for (const m of linkMatrices(lay, TX)) B.add(P.track, g.link, m);
}

/** Complete running gear for both sides. */
export function runningGear(P: Pal): THREE.Group {
  const lay = trackLayout();
  const B = new Bucket();
  WHEEL.z.forEach((z, i) => roadWheel(B, P, z, i * 0.7));
  frontBogie(B, P);
  rearUnit(B, P);
  sprocket(B, P, lay.toothAngles);
  idler(B, P, lay.idlerZ);
  track(B, P);
  return mirrorX(group([B.meshes()]));
}
