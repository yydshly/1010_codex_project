/**
 * Open crew compartments of the Universal Carrier Mk II (all visible from above):
 *  - front: driver (right) and gunner (left) on low cushioned seats with backrests against the
 *    divisional plates; the driver's vertical steering wheel on its column, clutch / brake /
 *    accelerator pedals, gearbox cover with the gear lever and the hand-brake lever between the seats,
 *    the instrument panel on the cab front plate, the gunner's Bren pivot mounting and magazine rack;
 *  - rear: a cushioned locker seat in each rear compartment and stowed ammunition boxes / a can.
 */
import { THREE, G } from '../../../core/kit';
import type { Pal } from './palette';
import { H, ENGINE, CREW, BREN } from './dims';
import { cabFrontZ, glacis } from './hull';
import { Bucket, rb, cylX, cylZ, nut, bentRod, prism, merge, surfaceFrame, type P3 } from './util';

const XI = H.xSide - H.t;
const FL = H.floor;

/** Cushion: rounded slab with a soft crown on top and a piped seam round the upper edge. */
function cushion(w: number, h: number, d: number): THREE.BufferGeometry {
  const g = G.rbox(w, h, d, Math.min(0.028, h * 0.45), 3);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y > 0) {
      const ux = (2 * x) / w, uz = (2 * z) / d;
      p.setY(i, y + 0.012 * Math.max(0, 1 - ux * ux) * Math.max(0, 1 - uz * uz));
    }
  }
  g.computeVertexNormals();
  const pipe = G.tube(
    [
      [-w / 2 + 0.02, h / 2 - 0.004, -d / 2 + 0.004],
      [w / 2 - 0.02, h / 2 - 0.004, -d / 2 + 0.004],
      [w / 2 - 0.004, h / 2 - 0.004, -d / 2 + 0.02],
      [w / 2 - 0.004, h / 2 - 0.004, d / 2 - 0.02],
      [w / 2 - 0.02, h / 2 - 0.004, d / 2 - 0.004],
      [-w / 2 + 0.02, h / 2 - 0.004, d / 2 - 0.004],
      [-w / 2 + 0.004, h / 2 - 0.004, d / 2 - 0.02],
      [-w / 2 + 0.004, h / 2 - 0.004, -d / 2 + 0.02],
    ],
    0.0045,
    6,
    96,
    true,
  );
  return merge([g, pipe]);
}

/* ------------------------------------------------------------------ front seats */
function frontSeats(B: Bucket, P: Pal) {
  for (const x of [CREW.driverX, CREW.gunnerX]) {
    const z = CREW.seatZ;
    const top = CREW.seatY - 0.075; // top of the seat pan frame
    // seat pan frame: two side rails on legs, cross tubes, pan
    for (const dx of [-0.17, 0.17]) {
      B.put(P.paint, rb(0.03, 0.03, 0.4, 0.006), [x + dx, top - 0.015, z]);
      for (const dz of [-0.16, 0.16]) B.put(P.paint, rb(0.03, top - FL - 0.03, 0.03, 0.006), [x + dx, (FL + top - 0.03) / 2, z + dz]);
      B.put(P.paint, rb(0.05, 0.006, 0.05, 0.002), [x + dx, FL + 0.003, z + 0.16]);
      B.put(P.paint, rb(0.05, 0.006, 0.05, 0.002), [x + dx, FL + 0.003, z - 0.16]);
    }
    B.put(P.paint, cylX(0.012, 0.34, 10), [x, top - 0.02, z + 0.185]);
    B.put(P.paint, cylX(0.012, 0.34, 10), [x, FL + 0.08, z - 0.16]);
    B.put(P.sheet, rb(0.36, 0.006, 0.38, 0.002), [x, top - 0.003, z]);
    // cushion
    B.put(P.seat, cushion(0.4, 0.075, 0.4), [x, top + 0.0375, z + 0.005]);
    // backrest on two brackets from the divisional plate, leaning back
    const bz = H.divZ + 0.075, by = 0.7;
    B.put(P.seat, cushion(0.38, 0.065, 0.3), [x, by, bz], [-78, 0, 0]);
    for (const dx of [-0.13, 0.13]) {
      B.put(P.paint, rb(0.03, 0.2, 0.012, 0.003), [x + dx, by, H.divZ + 0.007]);
      B.put(P.paint, rb(0.03, 0.03, 0.04, 0.003), [x + dx, by - 0.08, H.divZ + 0.025]);
      B.put(P.paint, rb(0.03, 0.03, 0.04, 0.003), [x + dx, by + 0.08, H.divZ + 0.025]);
    }
  }
}

/* ------------------------------------------------------------------ driver's controls */
function steering(B: Bucket, P: Pal) {
  const x = CREW.driverX;
  const hub = new THREE.Vector3(x, 1.0, 1.2);
  const dir = new THREE.Vector3(0, -0.42, 0.907).normalize(); // down the column, towards the nose
  const zEnd = cabFrontZ(0.95) - H.t - 0.03;
  const end = hub.clone().addScaledVector(dir, (zEnd - hub.z) / dir.z);
  // column jacket + steering box on the glacis frame
  B.add(P.black, G.rod(hub.clone().addScaledVector(dir, 0.04), end, 0.022, 14));
  B.put(P.black, rb(0.11, 0.13, 0.08, 0.012), [end.x, end.y - 0.02, end.z + 0.02]);
  B.add(P.paint, G.scatter(nut(0.016, 0.007), [[-0.04, 0.03], [0.04, 0.03], [-0.04, -0.07], [0.04, -0.07]].map(([dx, dy]) => ({ p: [end.x + dx, end.y + dy, end.z + 0.06] as P3, n: [0, 0, 1] as P3 }))));
  B.add(P.paint, prism([[0, 0], [0.12, 0], [0.12, 0.02], [0, 0.14]], 0.012, 'zy', 0.002).translate(0, end.y - 0.14, end.z - 0.03), new THREE.Matrix4().makeTranslation(x - 0.06, 0, 0));
  B.add(P.paint, prism([[0, 0], [0.12, 0], [0.12, 0.02], [0, 0.14]], 0.012, 'zy', 0.002).translate(0, end.y - 0.14, end.z - 0.03), new THREE.Matrix4().makeTranslation(x + 0.06, 0, 0));
  // wheel in its own frame: X across, Y up in the wheel plane, Z towards the driver
  const n = dir.clone().negate();
  const e1 = new THREE.Vector3(1, 0, 0);
  const e2 = n.clone().cross(e1).normalize();
  if (e2.y < 0) e2.negate();
  const e3 = e1.clone().cross(e2);
  const m = new THREE.Matrix4().makeBasis(e1, e2, e3).setPosition(hub);
  const R = 0.2;
  const w: THREE.BufferGeometry[] = [];
  w.push(G.torus(R, 0.0125, 10, 72));
  for (const a of [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]) {
    const c = Math.cos(a), s = Math.sin(a);
    const pts: P3[] = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const r = 0.035 + (R - 0.035) * t;
      pts.push([c * r, s * r, -0.03 * (1 - t) ** 1.4]);
    }
    w.push(G.tube(pts, 0.0075, 8, 16));
  }
  w.push(G.cyl(0.036, 0.04, 0.035, 22).rotateX(Math.PI / 2).translate(0, 0, -0.03));
  w.push(G.lathe([[0.0, 0.0], [0.03, 0.0], [0.03, 0.006], [0.02, 0.014], [0.0, 0.016]], 20, 40).rotateX(Math.PI / 2).translate(0, 0, -0.012));
  B.add(P.black, merge(w), m);
}

function pedalsAndLevers(B: Bucket, P: Pal) {
  const x = CREW.driverX;
  // pedal cross-shaft on brackets above the nose floor, three pedals
  const zs = 1.45, ys = 0.3;
  B.put(P.steel, cylX(0.012, 0.36, 12), [x, ys, zs]);
  for (const dx of [-0.19, 0.19]) B.put(P.paint, rb(0.02, ys - FL + 0.03, 0.05, 0.004), [x + dx, (ys + FL) / 2, zs]);
  for (const [dx, wide] of [[-0.12, true], [-0.02, true]] as [number, boolean][]) {
    const a: P3 = [x + dx, ys, zs];
    const b: P3 = [x + dx, 0.47, zs - 0.13];
    B.add(P.steel, G.rod(a, b, 0.01, 10));
    B.put(P.steel, rb(wide ? 0.075 : 0.05, 0.1, 0.014, 0.004), [b[0], b[1] + 0.01, b[2] - 0.004], [-32, 0, 0]);
    B.put(P.steel, rb(0.03, 0.03, 0.03, 0.006), a);
  }
  // accelerator (roller pedal hinged at the heel)
  B.put(P.steel, rb(0.06, 0.008, 0.2, 0.003), [x + 0.12, 0.3, 1.38], [-30, 0, 0]);
  B.put(P.steel, cylX(0.014, 0.05, 12), [x + 0.12, 0.246, 1.3]);

  // gearbox cover between the seats
  const hz0 = H.divZ + 0.01, hz1 = 1.1;
  B.put(P.sheet, rb(0.26, 0.15, hz1 - hz0, 0.03), [0, FL + 0.075, (hz0 + hz1) / 2]);
  B.add(P.sheet, G.scatter(nut(0.014, 0.004), [-0.11, 0.11].flatMap((dx) => [0.7, 0.85, 1.0].map((z) => ({ p: [dx, FL + 0.03, z] as P3, n: [Math.sign(dx), 0, 0] as P3 })))));
  // gear lever: gate plate, rubber-free ball joint, cranked lever, black knob
  const gz = 0.95, gy = FL + 0.15;
  B.put(P.paint, rb(0.1, 0.012, 0.12, 0.004), [0.02, gy + 0.006, gz]);
  B.put(P.steel, new THREE.SphereGeometry(0.022, 14, 8), [0.02, gy + 0.018, gz]);
  B.add(P.steel, G.tube([[0.02, gy + 0.02, gz], [0.02, gy + 0.2, gz - 0.02], [0.03, gy + 0.36, gz - 0.07], [0.035, gy + 0.44, gz - 0.1]], 0.008, 8, 24));
  B.put(P.black, new THREE.SphereGeometry(0.024, 16, 10), [0.035, gy + 0.46, gz - 0.105]);
  // hand-brake: toothed quadrant on the right of the cover, lever with the release rod and grip
  const hx = -0.14, hz = 0.84;
  B.add(P.paint, prism([[0, 0], [0.16, 0], [0.14, 0.08], [0.06, 0.12], [0.0, 0.1]], 0.008, 'zy', 0.002).translate(-0.004, FL + 0.14, hz - 0.08));
  B.put(P.steel, cylX(0.012, 0.04, 10), [hx, FL + 0.2, hz]);
  B.add(P.steel, G.rod([hx - 0.012, FL + 0.2, hz], [hx - 0.012, FL + 0.5, hz - 0.12], 0.011, 10));
  B.add(P.steel, G.rod([hx - 0.024, FL + 0.22, hz], [hx - 0.024, FL + 0.49, hz - 0.115], 0.004, 6));
  B.put(P.black, cylZ(0.016, 0.1, 14), [hx - 0.012, FL + 0.53, hz - 0.135], [-22, 0, 0]);
}

function instruments(B: Bucket, P: Pal) {
  // instrument panel on the inside of the cab front plate, between the crew
  const x0 = -0.135, x1 = 0.095, y0 = 0.98, y1 = 1.13;
  const yc = (y0 + y1) / 2;
  const zb = cabFrontZ(yc) - H.t - 0.004;
  B.put(P.black, rb(x1 - x0, y1 - y0, 0.04, 0.006), [(x0 + x1) / 2, yc, zb - 0.02]);
  const face = zb - 0.041;
  const gauges: [number, number, number][] = [[-0.085, 1.075, 0.03], [-0.015, 1.075, 0.03], [0.05, 1.08, 0.024], [-0.05, 1.012, 0.02], [0.02, 1.012, 0.02]];
  for (const [gx, gy, r] of gauges) {
    B.put(P.dial, cylZ(r, 0.004, 22), [gx, gy, face + 0.002]);
    B.put(P.bright, G.torus(r + 0.002, 0.0028, 6, 22), [gx, gy, face - 0.001]);
    B.put(P.glass, cylZ(r, 0.001, 22), [gx, gy, face - 0.001]);
    B.put(P.black, rb(0.0022, r * 0.8, 0.001, 0.0005), [gx + r * 0.2, gy + r * 0.2, face - 0.0005], [0, 0, -35]);
  }
  // switches and a push button along the bottom edge
  for (const gx of [0.06, 0.08]) B.put(P.steel, cylZ(0.004, 0.022, 8), [gx, 1.0, face - 0.01], [15, 0, 0]);
  B.put(P.bright, cylZ(0.008, 0.01, 12), [-0.115, 1.0, face - 0.004]);
  // speedometer cable and wiring loom from the panel down the front plate
  B.add(P.black, G.tube([[-0.02, y0 + 0.01, zb - 0.02], [-0.02, y0 - 0.06, zb - 0.01], [0.0, 0.9, zb + 0.004], [0.01, 0.8, cabFrontZ(0.9) - 0.03]], 0.0045, 6, 24));
  B.add(P.black, G.tube([[0.07, y0 + 0.01, zb - 0.02], [0.08, y0 - 0.07, zb - 0.01], [0.1, 0.9, zb + 0.004]], 0.004, 6, 20));
}

/* ------------------------------------------------------------------ gunner */
function brenMount(B: Bucket, P: Pal) {
  const [px, py, pz] = BREN.pivot;
  // pedestal bolted to the inside of the upper nose plate within the gunner's bay, inclined post up to
  // the pivot, fork either side of the gun's gas-cylinder casing with trunnion stubs (the gun itself is
  // an asset option)
  const nIn: P3 = [0, -glacis.n[1], -glacis.n[2]];
  const bs = 0.11;
  const bm = surfaceFrame(glacis.at(px, bs, -(H.t + 0.001)), [1, 0, 0], nIn);
  B.add(P.cast, rb(0.13, 0.02, 0.11, 0.005).translate(0, 0.01, 0), bm);
  B.add(P.cast, G.scatter(nut(0.016, 0.007), [[-0.05, -0.04], [0.05, -0.04], [-0.05, 0.04], [0.05, 0.04]].map(([dx, dz]) => ({ p: new THREE.Vector3(dx, 0.02, dz).applyMatrix4(bm), n: new THREE.Vector3(...nIn) }))));
  const base = new THREE.Vector3(0, 0.02, 0).applyMatrix4(bm);
  const armY = py - 0.07;
  B.add(P.cast, G.rod(base, [px, armY, pz], 0.022, 14));
  B.put(P.cast, G.cyl(0.026, 0.026, 0.05, 18), [px, armY + 0.01, pz]);
  B.put(P.steel, G.cyl(0.014, 0.014, 0.05, 12), [px, py - 0.025, pz]);
  B.put(P.cast, rb(0.13, 0.018, 0.04, 0.005), [px, py, pz]);
  for (const sx of [-1, 1]) {
    B.put(P.cast, rb(0.014, 0.1, 0.04, 0.004), [px + sx * 0.058, py + 0.05, pz]);
    B.put(P.steel, cylX(0.007, 0.03, 10), [px + sx * 0.045, py + 0.085, pz]);
    B.put(P.steel, nut(0.018, 0.006), [px + sx * 0.065, py + 0.085, pz], [0, 0, sx > 0 ? -90 : 90]);
  }
  // clamp handle on the post
  B.add(P.steel, G.rod([px, armY + 0.02, pz], [px - 0.07, armY + 0.04, pz - 0.04], 0.006, 8));
  B.put(P.black, new THREE.SphereGeometry(0.013, 12, 8), [px - 0.072, armY + 0.041, pz - 0.041]);
}

function magazineRack(B: Bucket, P: Pal) {
  // six Bren magazines in a sheet-steel rack on the left hull wall beside the gunner
  const x = XI - 0.045;
  const z0 = 0.98, y0 = 0.64;
  B.put(P.sheet, rb(0.06, 0.03, 0.48, 0.004), [x, y0, z0 + 0.2]);
  B.put(P.sheet, rb(0.012, 0.16, 0.48, 0.003), [XI - 0.006, y0 + 0.07, z0 + 0.2]);
  B.put(P.canvas, rb(0.064, 0.022, 0.46, 0.004), [x, y0 + 0.12, z0 + 0.2]);
  const g = BREN_MAG();
  for (let i = 0; i < 6; i++) {
    B.put(P.black, g, [x, y0 + 0.012, z0 + 0.02 + i * 0.07]);
  }
}

let magGeo: THREE.BufferGeometry | null = null;
/** 30-round Bren magazine: curved box (outline in the (z, y) plane), thickness along X. */
function BREN_MAG(): THREE.BufferGeometry {
  if (magGeo) return magGeo;
  const R = 0.3, th0 = 0, th1 = 34;
  const pts: [number, number][] = [];
  const n = 8;
  const depth = 0.092;
  for (let i = 0; i <= n; i++) {
    const t = ((th0 + ((th1 - th0) * i) / n) * Math.PI) / 180;
    pts.push([R * (1 - Math.cos(t)) - depth / 2, R * Math.sin(t)]);
  }
  for (let i = n; i >= 0; i--) {
    const t = ((th0 + ((th1 - th0) * i) / n) * Math.PI) / 180;
    pts.push([R * (1 - Math.cos(t)) + depth / 2 - 0.012 * (i / n), R * Math.sin(t) * 0.98]);
  }
  const body = prism(pts, 0.028, 'zy', 0.003);
  const lips = rb(0.03, 0.012, 0.05, 0.003);
  lips.translate(0, R * Math.sin((th1 * Math.PI) / 180) + 0.004, R * (1 - Math.cos((th1 * Math.PI) / 180)) - 0.01);
  magGeo = merge([body, lips]);
  return magGeo;
}

/* ------------------------------------------------------------------ rear compartments */
function rearSeats(B: Bucket, P: Pal) {
  const w = ENGINE.halfW;
  for (const sx of [1, -1]) {
    const xa = w + 0.012, xb = XI - 0.006;
    const xc = sx * (xa + xb) / 2, wx = xb - xa;
    const z0 = -0.46, z1 = -0.06;
    // locker box with a hinged lid, cushion on top
    const ly = 0.46;
    B.put(P.sheet, rb(wx, ly - FL, z1 - z0, 0.006), [xc, (FL + ly) / 2, (z0 + z1) / 2]);
    B.put(P.sheet, rb(wx + 0.008, 0.01, z1 - z0 + 0.008, 0.003), [xc, ly + 0.005, (z0 + z1) / 2]);
    B.put(P.steel, rb(0.03, 0.04, 0.008, 0.002), [xc, ly - 0.03, z1 + 0.004]);
    B.put(P.seat, cushion(wx - 0.02, 0.07, z1 - z0 - 0.04), [xc, ly + 0.045, (z0 + z1) / 2 + 0.01]);
    // backrest pad on a frame at the rear of the seat
    B.put(P.seat, cushion(wx - 0.04, 0.06, 0.26), [xc, 0.74, z0 - 0.02], [-96, 0, 0]);
    for (const dx of [-wx / 2 + 0.04, wx / 2 - 0.04]) {
      B.put(P.paint, rb(0.02, 0.5, 0.02, 0.004), [xc + dx, (ly + 0.9) / 2 + 0.01, z0 - 0.06]);
    }
    // stowage behind: two ammunition boxes, a can (right) or a rolled groundsheet (left)
    const zb = -1.0;
    for (let i = 0; i < 2; i++) {
      const bz = zb - i * 0.3;
      B.put(P.paint, rb(0.3, 0.17, 0.26, 0.006), [xc, FL + 0.085, bz]);
      B.put(P.paint, rb(0.31, 0.012, 0.27, 0.003), [xc, FL + 0.176, bz]);
      B.add(P.steel, bentRod([[xc - 0.06, FL + 0.18, bz], [xc - 0.05, FL + 0.215, bz], [xc + 0.05, FL + 0.215, bz], [xc + 0.06, FL + 0.18, bz]], 0.004, 0.01));
      B.put(P.steel, rb(0.03, 0.05, 0.01, 0.002), [xc, FL + 0.14, bz + 0.135]);
    }
    if (sx < 0) {
      // 2-gallon can standing at the rear
      const cz = zb - 0.62;
      B.put(P.paint, rb(0.3, 0.34, 0.12, 0.012), [xc, FL + 0.17, cz]);
      B.put(P.paint, rb(0.2, 0.02, 0.012, 0.004), [xc, FL + 0.345, cz]);
      B.put(P.steel, G.cyl(0.02, 0.02, 0.03, 12), [xc + sx * 0.1, FL + 0.355, cz]);
    } else {
      const rz = zb - 0.62;
      B.put(P.canvas, cylX(0.07, 0.3, 18), [xc, FL + 0.07, rz]);
      for (const dx of [-0.09, 0.09]) B.put(P.canvas, G.torus(0.072, 0.006, 6, 20), [xc + dx, FL + 0.07, rz], [0, 90, 0]);
    }
  }
}

export function interior(P: Pal): THREE.Group {
  const B = new Bucket();
  frontSeats(B, P);
  steering(B, P);
  pedalsAndLevers(B, P);
  instruments(B, P);
  brenMount(B, P);
  magazineRack(B, P);
  rearSeats(B, P);
  return B.meshes();
}
