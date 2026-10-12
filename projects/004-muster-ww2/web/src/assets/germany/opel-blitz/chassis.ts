/**
 * Opel Blitz chassis: pressed-channel ladder frame with riveted cross members, forged I-beam
 * front axle on semi-elliptic springs with shackles, steering box / drop arm / drag link / tie
 * rod, banjo rear axle on semi-elliptic springs, brake drums, six-cylinder engine underside,
 * clutch housing and five-speed gearbox, two-piece propeller shaft with centre bearing,
 * exhaust with silencer, fuel tank under the seat and the rear towing jaw.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, type V3, slab, merge, xf, box, cylX, latheX, bentRod, sweep, type Station } from './util';

const Y = D.axleY;
const FX = D.frameX;

/** Mirror a geometry across X (winding restored) when s < 0. */
const mir = (g: THREE.BufferGeometry, s: number) => (s < 0 ? xf(g, [0, 0, 0], [0, 0, 0], [-1, 1, 1]) : g);

/* ------------------------------------------------------------------ frame */

function frame(): { paint: THREE.BufferGeometry[]; rivets: THREE.BufferGeometry[] } {
  const paint: THREE.BufferGeometry[] = [];
  const rivetPts: { p: V3; n: V3 }[] = [];
  const z0 = D.frameZ0, z1 = D.frameZ1;
  const len = z0 - z1;
  const b = D.frameBot, tp = D.frameTop, th = 0.006, fl = 0.068;
  for (const s of [1, -1]) {
    const w = FX + s * 0.03; // web outer face
    const f = w - s * fl; // flange tips (inboard)
    const x0 = Math.min(w, f), x1 = Math.max(w, f);
    const prof: V2[] =
      s > 0
        ? [[x1, b], [x1, tp], [x0, tp], [x0, tp - th], [x1 - th, tp - th], [x1 - th, b + th], [x0, b + th], [x0, b]]
        : [[x0, b], [x0, tp], [x1, tp], [x1, tp - th], [x0 + th, tp - th], [x0 + th, b + th], [x1, b + th], [x1, b]];
    paint.push(slab(prof, len, [0, 0, z1 + len / 2], [1, 0, 0], [0, 1, 0], { bevel: 0.0015 }));
    // front horn tapering down to the bumper bracket
    paint.push(box(0.012, 0.13, 0.12, [w - s * 0.012, 0.6, z0 - 0.02], 0.004));
  }
  // cross members (channel, riveted through gussets to the webs)
  const cms: [number, number, number][] = [
    [2.72, 0.66, 0.1],
    [1.66, 0.7, 0.12],
    [0.62, 0.72, 0.09],
    [-0.1, 0.72, 0.09],
    [-0.78, 0.72, 0.09],
    [-2.05, 0.72, 0.09],
    [-2.88, 0.7, 0.12],
  ];
  for (const [z, y, h] of cms) {
    const wIn = 2 * (FX - 0.03 + 0.006);
    paint.push(box(wIn, h, 0.05, [0, y, z], 0.004));
    paint.push(box(wIn - 0.02, 0.006, 0.09, [0, y + h / 2 - 0.003, z], 0.002));
    paint.push(box(wIn - 0.02, 0.006, 0.09, [0, y - h / 2 + 0.003, z], 0.002));
    for (const s of [1, -1]) {
      // gusset plate on the web with a rivet pattern
      const xg = s * (FX - 0.03 + 0.008);
      paint.push(box(0.006, 0.15, 0.2, [xg, (D.frameBot + D.frameTop) / 2, z], 0.002));
      for (const dz of [-0.07, 0, 0.07]) for (const dy of [-0.045, 0.045]) rivetPts.push({ p: [xg - s * 0.003, (D.frameBot + D.frameTop) / 2 + dy, z + dz], n: [-s, 0, 0] });
    }
  }
  // rivet rows along the top flanges (body mounting)
  for (const s of [1, -1]) {
    for (let z = 2.7; z > -2.9; z -= 0.3) rivetPts.push({ p: [s * (FX + 0.03), D.frameTop - 0.03, z], n: [s, 0, 0] });
  }
  const rivets = [G.scatter(new THREE.SphereGeometry(0.008, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1), rivetPts)];
  return { paint, rivets };
}

/* ------------------------------------------------------------------ springs */

/** Semi-elliptic spring: leaves stacked below the main leaf; main leaf eyes at +-half. */
function spring(x: number, zc: number, yMain: number, half: number, R: number, leaves: number, lt: number, w: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < leaves; i++) {
    const hl = i === 0 ? half : Math.max(0.1, half * (1 - (i - 0.3) / leaves) * 0.98);
    const yc = yMain - i * lt;
    const pts: V3[] = [];
    const n = 16;
    for (let k = 0; k <= n; k++) {
      const zz = -hl + (2 * hl * k) / n;
      pts.push([x, yc + (R - Math.sqrt(R * R - zz * zz)), zc + zz]);
    }
    out.push(G.strap(pts, w, lt * 0.92, [0, 1, 0], { smooth: false }));
  }
  // eyes (rolled ends of the main leaf)
  const ey = yMain + (R - Math.sqrt(R * R - half * half)) + 0.012;
  for (const e of [half, -half]) {
    out.push(cylX(0.022, w, [x, ey, zc + e + Math.sign(e) * 0.012], 16));
  }
  // rebound clips
  for (const e of [0.45, -0.45]) {
    const zz = e * half;
    const yy = yMain + (R - Math.sqrt(R * R - zz * zz));
    out.push(box(w + 0.014, 0.012, 0.03, [x, yy + 0.008, zc + zz], 0.002));
  }
  return out;
}

/* ------------------------------------------------------------------ front axle */

function frontAxle(): { paint: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[]; springs: THREE.BufferGeometry[] } {
  const z = D.zF;
  const paint: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const springs: THREE.BufferGeometry[] = [];
  // forged I-beam with dropped centre
  const path: [number, number][] = [
    [-0.6, Y + 0.008],
    [-0.52, Y + 0.004],
    [-0.4, Y],
    [-0.28, Y - 0.02],
    [-0.14, Y - 0.045],
    [0, Y - 0.05],
    [0.14, Y - 0.045],
    [0.28, Y - 0.02],
    [0.4, Y],
    [0.52, Y + 0.004],
    [0.6, Y + 0.008],
  ];
  const I: V2[] = [
    [-0.026, -0.036],
    [0.026, -0.036],
    [0.026, -0.024],
    [0.008, -0.02],
    [0.008, 0.02],
    [0.026, 0.024],
    [0.026, 0.036],
    [-0.026, 0.036],
    [-0.026, 0.024],
    [-0.008, 0.02],
    [-0.008, -0.02],
    [-0.026, -0.024],
  ];
  const st: Station[] = path.map(([x, y], i) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize();
    const v = new THREE.Vector3(-t.y, t.x, 0);
    return { p: new THREE.Vector3(x, y, z), u: new THREE.Vector3(0, 0, 1), v };
  });
  paint.push(sweep(I, st, true, 40));
  for (const s of [1, -1]) {
    // spring pad and U-bolts
    paint.push(box(0.1, 0.012, 0.12, [s * FX, Y + 0.042, z], 0.004));
    for (const dz of [-0.045, 0.045]) {
      steel.push(bentRod([[s * FX - 0.042, Y - 0.03, z + dz], [s * FX - 0.042, Y + 0.14, z + dz], [s * FX + 0.042, Y + 0.14, z + dz], [s * FX + 0.042, Y - 0.03, z + dz]], 0.008, 0.012));
      steel.push(box(0.1, 0.012, 0.022, [s * FX, Y - 0.032, z + dz], 0.003));
    }
    // kingpin boss, stub axle, steering arm
    paint.push(xf(G.cyl(0.036, 0.036, 0.15, 18), [s * 0.61, Y + 0.005, z]));
    paint.push(xf(G.cyl(0.028, 0.028, 0.03, 14), [s * 0.61, Y + 0.09, z]));
    paint.push(cylX(0.04, 0.06, [s * 0.65, Y, z], 18));
    // brake drum + backing plate
    paint.push(mir(latheX([[0.0, -0.09], [0.205, -0.09], [0.208, -0.084], [0.208, -0.074], [0.2, -0.07], [0.2, 0.03], [0.19, 0.036], [0.0, 0.036]].map(([r, a]) => [r, a] as V2), 40, 40), s).translate(s * 0.728, Y, z));
    paint.push(cylX(0.212, 0.008, [s * 0.634, Y, z], 40));
    paint.push(bentRod([[s * 0.62, Y + 0.02, z - 0.02], [s * 0.62, Y + 0.02, z - 0.14], [s * 0.57, Y + 0.02, z - 0.2]], 0.014, 0.04));
    // front spring (main leaf eyes at +-0.55), hanger at the front, shackle at the rear
    springs.push(...spring(s * FX, z, Y + 0.12, 0.55, 4.5, 9, 0.0085, 0.065));
    const eyeY = Y + 0.12 + (4.5 - Math.sqrt(4.5 * 4.5 - 0.55 * 0.55)) + 0.012;
    paint.push(box(0.09, D.frameBot - eyeY + 0.02, 0.07, [s * FX, (D.frameBot + eyeY) / 2 + 0.01, z + 0.57], 0.006));
    for (const dx of [-0.042, 0.042]) paint.push(box(0.01, 0.12, 0.035, [s * FX + dx, eyeY + 0.03, z - 0.575], 0.003));
    steel.push(cylX(0.012, 0.11, [s * FX, eyeY, z + 0.562], 10), cylX(0.012, 0.11, [s * FX, eyeY, z - 0.562], 10));
    // lever shock absorber
    paint.push(box(0.07, 0.08, 0.1, [s * (FX + 0.065), D.frameBot + 0.02, z + 0.2], 0.008));
    steel.push(bentRod([[s * (FX + 0.08), D.frameBot + 0.0, z + 0.16], [s * (FX + 0.08), Y + 0.12, z + 0.06]], 0.008, 0.01));
  }
  // tie rod behind the axle
  steel.push(G.rod([0.58, Y + 0.02, z - 0.2], [-0.58, Y + 0.02, z - 0.2], 0.016, 12));
  for (const s of [1, -1]) steel.push(xf(new THREE.SphereGeometry(0.026, 12, 8), [s * 0.58, Y + 0.02, z - 0.2]));
  // steering box on the left rail, drop arm and drag link to the left steering arm
  paint.push(box(0.12, 0.14, 0.16, [FX + 0.1, D.frameBot + 0.04, z - 0.36], 0.015));
  paint.push(cylX(0.05, 0.04, [FX + 0.17, D.frameBot + 0.02, z - 0.36], 16));
  paint.push(box(0.03, 0.2, 0.05, [FX + 0.2, D.frameBot - 0.07, z - 0.36], 0.008, [0, 0, 0]));
  steel.push(G.rod([FX + 0.2, D.frameBot - 0.16, z - 0.36], [0.66, Y + 0.08, z - 0.02], 0.017, 12));
  steel.push(xf(new THREE.SphereGeometry(0.028, 12, 8), [FX + 0.2, D.frameBot - 0.16, z - 0.36]));
  paint.push(bentRod([[0.66, Y + 0.08, z - 0.02], [0.7, Y + 0.08, z - 0.02]], 0.02, 0.01));
  return { paint, steel, springs };
}

/* ------------------------------------------------------------------ rear axle */

function rearAxle(): { paint: THREE.BufferGeometry[]; casting: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[]; springs: THREE.BufferGeometry[] } {
  const z = D.zR;
  const paint: THREE.BufferGeometry[] = [];
  const casting: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const springs: THREE.BufferGeometry[] = [];
  // banjo housing (ground clearance 0.225 under it) with the cover and the pinion nose
  const banjo = new THREE.SphereGeometry(0.2, 32, 20);
  banjo.scale(0.62, 1.06, 1.0);
  banjo.translate(0, Y, z);
  casting.push(banjo);
  casting.push(cylX(0.16, 0.03, [-0.12, Y, z], 36));
  const bolts: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    bolts.push({ p: [-0.135, Y + Math.cos(a) * 0.14, z + Math.sin(a) * 0.14], n: [-1, 0, 0] });
  }
  steel.push(G.scatter(G.boltHead(0.016, 0.008), bolts));
  casting.push(xf(latheX([[0.0, 0.0], [0.1, 0.0], [0.09, 0.08], [0.07, 0.16], [0.065, 0.2], [0.0, 0.2]].map(([r, a]) => [r, a] as V2), 28, 40), [0, Y + 0.02, z + 0.15], [0, -90, 0]));
  // axle tubes with flared ends
  paint.push(cylX(0.058, 1.2, [0, Y, z], 20));
  for (const s of [1, -1]) {
    paint.push(mir(latheX([[0.058, 0], [0.075, 0.05], [0.08, 0.1]].map(([r, a]) => [r, a] as V2), 20, 40), s).translate(s * 0.5, Y, z));
    // brake drum + backing plate inboard of the twin wheels
    paint.push(mir(latheX([[0.0, -0.1], [0.21, -0.1], [0.214, -0.094], [0.214, -0.082], [0.205, -0.078], [0.205, 0.03], [0.19, 0.036], [0.0, 0.036]].map(([r, a]) => [r, a] as V2), 40, 40), s).translate(s * 0.7, Y, z));
    paint.push(cylX(0.218, 0.008, [s * 0.595, Y, z], 40));
    paint.push(cylX(0.078, 0.014, [s * 0.81, Y, z], 28));
    // spring on top of the axle tube, directly under the rail
    springs.push(...spring(s * FX, z, Y + 0.152, 0.64, 9, 9, 0.009, 0.07));
    paint.push(box(0.11, 0.02, 0.14, [s * FX, Y + 0.066, z], 0.004));
    for (const dz of [-0.05, 0.05]) {
      steel.push(bentRod([[s * FX - 0.045, Y - 0.07, z + dz], [s * FX - 0.045, Y + 0.17, z + dz], [s * FX + 0.045, Y + 0.17, z + dz], [s * FX + 0.045, Y - 0.07, z + dz]], 0.009, 0.012));
      steel.push(box(0.11, 0.014, 0.024, [s * FX, Y - 0.072, z + dz], 0.003));
    }
    const eyeY = Y + 0.152 + (9 - Math.sqrt(81 - 0.64 * 0.64)) + 0.012;
    paint.push(box(0.1, D.frameBot - eyeY + 0.03, 0.08, [s * FX, (D.frameBot + eyeY) / 2 + 0.012, z + 0.66], 0.006));
    for (const dx of [-0.045, 0.045]) paint.push(box(0.01, 0.1, 0.035, [s * FX + dx, eyeY + 0.03, z - 0.665], 0.003));
    steel.push(cylX(0.013, 0.12, [s * FX, eyeY, z + 0.652], 10), cylX(0.013, 0.12, [s * FX, eyeY, z - 0.652], 10));
    // bump stop on the frame above the axle
    paint.push(box(0.08, 0.03, 0.1, [s * FX, D.frameBot - 0.01, z], 0.008));
  }
  return { paint, casting, steel, springs };
}

/* ------------------------------------------------------------------ drivetrain */

function drivetrain(): { casting: THREE.BufferGeometry[]; paint: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[]; exhaust: THREE.BufferGeometry[]; black: THREE.BufferGeometry[] } {
  const casting: THREE.BufferGeometry[] = [];
  const paint: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  // six-cylinder OHV engine: block, head, rocker cover, sump, timing cover, bell housing
  casting.push(box(0.26, 0.4, 0.82, [0, 1.0, 2.17], 0.02));
  casting.push(box(0.24, 0.1, 0.8, [0, 1.25, 2.17], 0.015));
  casting.push(box(0.18, 0.07, 0.76, [0, 1.335, 2.17], 0.025));
  casting.push(box(0.3, 0.2, 0.7, [0, 0.72, 2.2], 0.03));
  casting.push(box(0.22, 0.08, 0.5, [0, 0.6, 2.26], 0.03));
  casting.push(box(0.22, 0.3, 0.06, [0, 0.98, 2.6], 0.02));
  casting.push(xf(G.cyl(0.2, 0.24, 0.16, 28), [0, 0.86, 1.68], [90, 0, 0]));
  // manifold side (right) and generator/starter bosses (left)
  casting.push(box(0.05, 0.08, 0.7, [-0.16, 1.12, 2.17], 0.015));
  casting.push(xf(G.cyl(0.05, 0.05, 0.26, 18), [0.16, 0.95, 2.36], [90, 0, 0]));
  casting.push(xf(G.cyl(0.045, 0.045, 0.2, 18), [-0.15, 0.78, 1.78], [90, 0, 0]));
  // engine mounts to the frame
  for (const s of [1, -1]) paint.push(box(0.18, 0.05, 0.08, [s * 0.26, 0.78, 2.45], 0.008), box(0.18, 0.05, 0.08, [s * 0.26, 0.78, 1.75], 0.008));
  // fan behind the radiator
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 180;
    black.push(xf(G.rbox(0.07, 0.4, 0.008, 0.004, 1), [0, 1.1, 2.64], [0, 12, a]));
  }
  black.push(xf(G.cyl(0.05, 0.05, 0.06, 16), [0, 1.1, 2.62], [90, 0, 0]));
  // gearbox (5-speed) with the gear-lever tower and handbrake drum on the output
  casting.push(box(0.24, 0.24, 0.5, [0, 0.8, 1.35], 0.025));
  casting.push(box(0.14, 0.12, 0.18, [0, 0.96, 1.4], 0.02));
  casting.push(xf(G.cyl(0.08, 0.08, 0.12, 20), [0, 0.8, 1.06], [90, 0, 0]));
  paint.push(xf(G.cyl(0.13, 0.13, 0.05, 32), [0, 0.8, 1.0], [90, 0, 0]));
  // propeller shafts: gearbox -> centre bearing -> rear axle
  const shaft = (a: V3, b: V3, r: number) => {
    paint.push(G.rod(a, b, r, 16));
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    for (const p of [a, b]) {
      const y = G.rbox(0.1, 0.1, 0.05, 0.01, 1);
      y.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir));
      y.translate(p[0], p[1], p[2]);
      steel.push(y);
    }
  };
  const cb: V3 = [0, 0.65, -0.1];
  shaft([0, 0.78, 0.94], cb, 0.035);
  shaft(cb, [0, Y + 0.02, D.zR + 0.38], 0.04);
  paint.push(box(0.2, 0.1, 0.08, [0, 0.68, -0.1], 0.01));
  paint.push(box(0.64, 0.03, 0.05, [0, 0.72, -0.1], 0.004));
  // exhaust: manifold downpipe on the right, pipe under the cab, silencer, tail pipe
  const exhaust: THREE.BufferGeometry[] = [];
  exhaust.push(bentRod([[-0.17, 1.02, 2.0], [-0.2, 0.85, 1.92], [-0.24, 0.62, 1.7], [-0.25, 0.6, 1.3], [-0.26, 0.62, 0.95]], 0.028, 0.1));
  exhaust.push(latheX([[0, -0.3], [0.07, -0.3], [0.09, -0.28], [0.09, 0.28], [0.07, 0.3], [0, 0.3]].map(([r, a]) => [r, a] as V2), 28, 40).rotateY(-Math.PI / 2).translate(-0.26, 0.62, 0.6));
  for (const zz of [0.46, 0.76]) exhaust.push(G.torus(0.092, 0.006, 6, 28).translate(-0.26, 0.62, zz));
  exhaust.push(bentRod([[-0.26, 0.62, 0.3], [-0.27, 0.61, 0.0], [-0.34, 0.6, -0.45], [-0.55, 0.57, -0.62], [-0.62, 0.52, -0.66]], 0.024, 0.08));
  // silencer hangers from the right rail
  for (const zz of [0.45, 0.75]) paint.push(bentRod([[-0.26, 0.715, zz], [-0.3, 0.74, zz], [-0.39, 0.74, zz]], 0.008, 0.015));
  return { casting, paint, steel, exhaust, black };
}

/** Fuel tank (82 l) under the seat, carried transversely on the frame between the rails. */
function fuelTank(): { paint: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const paint: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const zc = 0.76, yc = 0.86;
  const sec: V2[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    sec.push([0.2 * Math.sign(c) * Math.pow(Math.abs(c), 0.7), 0.17 * Math.sign(s) * Math.pow(Math.abs(s), 0.7)]);
  }
  const st: Station[] = [-0.34, -0.33, 0.33, 0.34].map((x, i) => ({
    p: new THREE.Vector3(x, yc, zc),
    u: new THREE.Vector3(0, 0, 1),
    v: new THREE.Vector3(0, 1, 0),
  }));
  const secs = st.map((_, i) => (i === 0 || i === 3 ? sec.map(([a, b]) => [a * 0.96, b * 0.95] as V2) : sec));
  paint.push(sweep(secs, st, true, 45));
  // seam flanges and straps
  for (const x of [-0.335, 0.335]) paint.push(xf(G.rbox(0.008, 0.36, 0.42, 0.01, 1), [x, yc, zc]));
  for (const x of [-0.2, 0.2]) {
    steel.push(G.strap([[x, yc + 0.19, zc - 0.22], [x, yc + 0.12, zc - 0.25], [x, yc - 0.12, zc - 0.25], [x, yc - 0.18, zc - 0.1], [x, yc - 0.18, zc + 0.1], [x, yc - 0.12, zc + 0.25], [x, yc + 0.12, zc + 0.25], [x, yc + 0.19, zc + 0.22]], 0.035, 0.004, [[0, 0, -1], [0, 0, -1], [0, 0, -1], [0, -1, 0], [0, -1, 0], [0, 0, 1], [0, 0, 1], [0, 0, 1]] as V3[], { smooth: true }));
  }
  // support bearers across the rails
  for (const zz of [zc - 0.24, zc + 0.24]) paint.push(box(0.84, 0.04, 0.05, [0, D.frameTop + 0.02, zz], 0.004));
  return { paint, steel };
}

/** Rear towing jaw on the rear cross member. */
function towJaw(): THREE.BufferGeometry[] {
  const z = D.frameZ1 + 0.13;
  return [
    box(0.26, 0.16, 0.014, [0, 0.7, z - 0.007], 0.003),
    box(0.1, 0.1, 0.14, [0, 0.68, z - 0.08], 0.012),
    box(0.12, 0.02, 0.1, [0, 0.72, z - 0.19], 0.004),
    box(0.12, 0.02, 0.1, [0, 0.64, z - 0.19], 0.004),
    xf(G.cyl(0.018, 0.018, 0.16, 12), [0, 0.68, z - 0.2]),
    xf(G.cyl(0.03, 0.03, 0.02, 14), [0, 0.765, z - 0.2]),
  ];
}

export function buildChassis(): THREE.Object3D {
  const fr = frame();
  const fa = frontAxle();
  const ra = rearAxle();
  const dt = drivetrain();
  const ft = fuelTank();
  return group([
    part(merge([...fr.paint, ...fa.paint, ...ra.paint, ...dt.paint, ...towJaw()]), P.chassis()),
    part(merge([...fr.rivets, ...fa.springs, ...ra.springs]), P.chassis()),
    part(merge([...fa.steel, ...ra.steel, ...dt.steel, ...ft.steel]), P.steel()),
    part(merge([...ra.casting, ...dt.casting]), P.casting()),
    part(merge(dt.exhaust), P.exhaust()),
    part(merge(dt.black), P.black()),
    part(merge(ft.paint), P.body()),
  ]);
}
