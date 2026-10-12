/**
 * ZiS-5V wooden cab (from early 1943): a timber frame of posts and rails boarded with nailed
 * tongue-and-groove planks, wooden doors with strap hinges and wind-down windows, a steel
 * bulkhead and scuttle, a single-pane windscreen in a top-hinged frame with one wiper, a roof
 * of slats covered with dermatin (leatherette) and a rear wall with a small window. Interior:
 * plank floor, seat box over the fuel tank with canvas cushions, steel dash with gauges,
 * steering column with the wartime wooden wheel rim, levers and pedals. Seats are canvas over
 * wadding (wartime), the roof has no visor.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, type V3, frontSlab, flatSlab, slab, merge, xf, box, cylX, cylZ, latheZ, bentRod, rect, rrect } from './util';
import { WING_PROFILE } from './front';

const CX = D.cabX;
const ZB = D.zCabBack;
const Z_DOOR0 = 0.665, Z_DOOR1 = 1.345, Y_DOOR0 = 0.885, Y_DOOR1 = 2.012;
const Z_POST = 1.39; // A-post centre at the belt
const RAIL0 = 2.02, RAIL1 = 2.07;

function wingY(z: number): number {
  if (z < WING_PROFILE[0][0]) return -1;
  for (let i = 1; i < WING_PROFILE.length; i++) {
    const a = WING_PROFILE[i - 1], b = WING_PROFILE[i];
    if (z >= a[0] && z <= b[0]) return a[1] + ((b[1] - a[1]) * (z - a[0])) / (b[0] - a[0]);
  }
  return WING_PROFILE[WING_PROFILE.length - 1][1];
}

interface Parts {
  woodY: THREE.BufferGeometry[];
  woodZ: THREE.BufferGeometry[];
  woodX: THREE.BufferGeometry[];
  body: THREE.BufferGeometry[];
  black: THREE.BufferGeometry[];
  steel: THREE.BufferGeometry[];
  glass: THREE.BufferGeometry[];
  roof: THREE.BufferGeometry[];
  seat: THREE.BufferGeometry[];
  rubber: THREE.BufferGeometry[];
  bake: THREE.BufferGeometry[];
  wheel: THREE.BufferGeometry[];
}

/** Vertical planks in the plane x = xc between z0 and z1; bottom may follow a function of z. */
function planks(out: THREE.BufferGeometry[], xc: number, z0: number, z1: number, y0: number | ((z: number) => number), y1: number, pw = 0.088, th = 0.02) {
  const n = Math.max(1, Math.round((z1 - z0) / pw));
  const w = (z1 - z0) / n;
  for (let i = 0; i < n; i++) {
    const zc = z0 + (i + 0.5) * w;
    const yb = typeof y0 === 'number' ? y0 : Math.max(y0(zc - w / 2), y0(zc + w / 2));
    if (y1 - yb < 0.02) continue;
    out.push(box(th, y1 - yb, w - 0.003, [xc, (yb + y1) / 2, zc], 0.004));
  }
}

/* ------------------------------------------------------------------ sides */

function sides(p: Parts) {
  for (const s of [1, -1]) {
    const xo = s * (CX - 0.01); // plank centre plane
    const xf2 = s * (CX - 0.002); // frame members (proud)
    // rear corner post, A-post (lower), sill and belt rails
    p.woodY.push(box(0.05, RAIL0 - D.cabBot, 0.06, [s * (CX - 0.02), (RAIL0 + D.cabBot) / 2, ZB + 0.03], 0.006));
    p.woodZ.push(box(0.04, 0.06, Z_DOOR0 - ZB - 0.005, [xf2, D.cabBot + 0.03, (ZB + Z_DOOR0) / 2], 0.006));
    p.woodZ.push(box(0.04, 0.05, Z_DOOR0 - ZB - 0.005, [xf2, D.belt, (ZB + Z_DOOR0) / 2], 0.006));
    // rear quarter boarding
    planks(p.woodY, xo, ZB + 0.06, Z_DOOR0 - 0.03, D.cabBot + 0.01, RAIL0);
    p.woodY.push(box(0.04, RAIL0 - D.cabBot, 0.05, [xf2, (RAIL0 + D.cabBot) / 2, Z_DOOR0 - 0.028], 0.006));
    // front section below the belt (cut around the wing) and the A-post
    const yW = (z: number) => Math.max(D.cabBot, wingY(z) + 0.02);
    planks(p.woodY, xo, Z_DOOR1 + 0.005, D.zFire, yW, D.belt);
    p.woodY.push(box(0.04, D.belt - yW(Z_DOOR1 + 0.02), 0.05, [xf2, (D.belt + yW(Z_DOOR1 + 0.02)) / 2, Z_DOOR1 + 0.03], 0.006));
    p.woodZ.push(box(0.04, 0.05, D.zFire - Z_DOOR1, [xf2, D.belt, (Z_DOOR1 + D.zFire) / 2], 0.006));
    // A-post above the belt, raked to follow the windscreen
    p.woodY.push(xf(G.rbox(0.05, RAIL0 - D.belt + 0.02, 0.06, 0.006, 1), [s * (CX - 0.02), (RAIL0 + D.belt) / 2, Z_POST], [-2, 0, 0]));
    // roof side rail (cornice)
    p.woodZ.push(box(0.06, RAIL1 - RAIL0, D.zFire - ZB - 0.06, [s * (CX - 0.022), (RAIL0 + RAIL1) / 2, (ZB + D.zFire - 0.06) / 2], 0.008));
    // ---- door
    const zc = (Z_DOOR0 + Z_DOOR1) / 2, zl = Z_DOOR1 - Z_DOOR0;
    const xd = s * (CX + 0.001);
    p.woodY.push(box(0.035, Y_DOOR1 - Y_DOOR0, 0.05, [xd, (Y_DOOR0 + Y_DOOR1) / 2, Z_DOOR0 + 0.025], 0.006));
    p.woodY.push(box(0.035, Y_DOOR1 - Y_DOOR0, 0.05, [xd, (Y_DOOR0 + Y_DOOR1) / 2, Z_DOOR1 - 0.025], 0.006));
    p.woodZ.push(box(0.035, 0.06, zl - 0.1, [xd, Y_DOOR0 + 0.03, zc], 0.006));
    p.woodZ.push(box(0.035, 0.065, zl - 0.1, [xd, D.belt + 0.005, zc], 0.006));
    p.woodZ.push(box(0.035, 0.04, zl - 0.1, [xd, Y_DOOR1 - 0.02, zc], 0.006));
    planks(p.woodY, s * (CX - 0.006), Z_DOOR0 + 0.05, Z_DOOR1 - 0.05, Y_DOOR0 + 0.06, D.belt - 0.028, 0.097, 0.018);
    // window glass (wound up) and a thin glazing bead
    p.glass.push(slab(rrect(Z_DOOR0 + 0.045, D.belt + 0.03, Z_DOOR1 - 0.045, Y_DOOR1 - 0.035, [0.004, 0.004, 0.004, 0.004], 2), 0.005, [s * (CX - 0.004), 0, 0], [0, 0, 1], [0, 1, 0]));
    // strap hinges across the front stile onto the A-post
    for (const y of [1.08, 1.5, 1.9]) {
      p.body.push(box(0.006, 0.035, 0.22, [s * (CX + 0.02), y, Z_DOOR1 - 0.07], 0.002));
      p.steel.push(xf(G.cyl(0.01, 0.01, 0.06, 10), [s * (CX + 0.022), y, Z_DOOR1 + 0.012]));
    }
    // handle and lock
    p.steel.push(bentRod([[s * (CX + 0.02), 1.52, Z_DOOR0 + 0.07], [s * (CX + 0.045), 1.52, Z_DOOR0 + 0.085], [s * (CX + 0.045), 1.52, Z_DOOR0 + 0.18]], 0.008, 0.015, 8));
    p.steel.push(cylX(0.015, 0.012, [s * (CX + 0.022), 1.52, Z_DOOR0 + 0.07], 12));
    // nail heads along the rails (the boarding is nailed on)
    const nails: { p: V3; n: V3 }[] = [];
    for (let z = ZB + 0.1; z < Z_DOOR0 - 0.04; z += 0.088) for (const y of [D.cabBot + 0.03, D.belt]) nails.push({ p: [s * (CX + 0.018), y, z], n: [s, 0, 0] });
    for (let z = Z_DOOR0 + 0.09; z < Z_DOOR1 - 0.06; z += 0.097) for (const y of [Y_DOOR0 + 0.03, D.belt + 0.005]) nails.push({ p: [s * (CX + 0.018), y, z], n: [s, 0, 0] });
    p.steel.push(G.scatter(new THREE.SphereGeometry(0.005, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1), nails));
  }
}

/* ------------------------------------------------------------------ front, windscreen, roof, rear */

function frontAndRoof(p: Parts) {
  // steel bulkhead (engine side) and scuttle top
  const bulk: V2[] = [
    [-CX, D.belt],
    [-CX, wingY(D.zFire) + 0.02],
    [-D.bonnetX - 0.02, wingY(D.zFire) + 0.02],
    [-D.bonnetX - 0.02, 0.95],
    [D.bonnetX + 0.02, 0.95],
    [D.bonnetX + 0.02, wingY(D.zFire) + 0.02],
    [CX, wingY(D.zFire) + 0.02],
    [CX, D.belt],
  ];
  p.body.push(frontSlab(bulk.slice().reverse(), 0.003, D.zFire - 0.0015));
  // wooden boarding and framing on the cab front outboard of the bonnet
  for (const s of [1, -1]) {
    const x0 = D.bonnetX + 0.03, x1 = CX - 0.03;
    const yb = wingY(D.zFire) + 0.025;
    const n = 5;
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) p.woodY.push(box(w - 0.003, D.belt - 0.03 - yb, 0.018, [s * (x0 + (i + 0.5) * w), (yb + D.belt - 0.03) / 2, D.zFire + 0.009], 0.004));
    p.woodY.push(box(0.05, D.belt - yb + 0.02, 0.035, [s * (CX - 0.025), (yb + D.belt) / 2, D.zFire + 0.016], 0.006));
    p.woodY.push(box(0.04, D.belt - yb + 0.02, 0.03, [s * (D.bonnetX + 0.035), (yb + D.belt) / 2, D.zFire + 0.014], 0.006));
    p.woodX.push(box(x1 - x0 + 0.06, 0.045, 0.03, [s * (x0 + x1) / 2, yb + 0.02, D.zFire + 0.016], 0.006));
  }
  p.body.push(flatSlab(rect(-CX, D.zWs - 0.02, CX, D.zFire + 0.004), 0.003, D.belt + 0.02));
  p.woodX.push(box(2 * CX, 0.05, 0.06, [0, D.belt, D.zFire - 0.02], 0.006));
  // scuttle vent
  p.body.push(box(0.34, 0.012, 0.06, [0, D.belt + 0.028, D.zFire - 0.04], 0.004));
  // windscreen: frame + single pane, top-hinged, raked slightly back
  const wsO: V3 = [0, D.belt + 0.021, D.zWs];
  const up = new THREE.Vector3(0, D.wsTop - D.belt - 0.021, -0.016);
  const H = up.length();
  const W = CX - 0.045;
  const hole = rrect(-W + 0.04, 0.035, W - 0.04, H - 0.035, [0.015, 0.015, 0.015, 0.015], 3).reverse();
  p.body.push(slab(rect(-W, 0, W, H), 0.028, wsO, [1, 0, 0], [0, up.y, up.z], { holes: [hole], bevel: 0.004 }));
  p.glass.push(slab(rrect(-W + 0.045, 0.04, W - 0.045, H - 0.04, [0.012, 0.012, 0.012, 0.012], 3), 0.005, wsO, [1, 0, 0], [0, up.y, up.z]));
  // header rail under the roof front and top hinge knuckles
  p.woodX.push(box(2 * CX, 0.05, 0.06, [0, D.wsTop + 0.02, D.zWs - 0.02], 0.006));
  for (const x of [-0.5, 0, 0.5]) p.steel.push(cylX(0.009, 0.1, [x, D.wsTop + 0.002, D.zWs + 0.02], 10));
  // opening stays at both ends
  for (const s of [1, -1]) p.steel.push(bentRod([[s * (W - 0.02), D.belt + 0.05, D.zWs - 0.015], [s * (W - 0.02), D.belt + 0.2, D.zWs - 0.03], [s * (W - 0.02), D.belt + 0.28, D.zWs - 0.02]], 0.005, 0.02, 6));
  // single wiper on the driver's side, motor on the header
  p.black.push(xf(G.cyl(0.024, 0.024, 0.06, 14), [0.4, D.wsTop + 0.02, D.zWs - 0.06], [90, 0, 0]));
  p.steel.push(G.rod([0.4, D.wsTop - 0.02, D.zWs + 0.022], [0.44, D.wsTop - 0.28, D.zWs + 0.02], 0.0035, 8));
  p.rubber.push(G.rod([0.43, D.wsTop - 0.17, D.zWs + 0.016], [0.455, D.wsTop - 0.39, D.zWs + 0.016], 0.004, 6));
  // roof: slats covered with dermatin (loft), front overhang
  const secs: { z: number; ring: V2[] }[] = [];
  const z0 = ZB - 0.02, z1 = D.zWs + 0.025;
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const z = z0 + ((z1 - z0) * i) / N;
    const back = Math.min(1, (z - z0) / 0.035), front = Math.min(1, (z1 - z) / 0.05);
    const f = Math.sqrt(Math.max(0.05, Math.min(back, front)));
    const ring: V2[] = [];
    const n = 32;
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2;
      const c = Math.cos(a), sn = Math.sin(a);
      const x = (CX + 0.012) * Math.sign(c) * Math.pow(Math.abs(c), 2 / 4.5);
      const y = sn >= 0 ? RAIL1 - 0.03 + (D.roofY - RAIL1 + 0.03) * (0.35 + 0.65 * f) * Math.pow(sn, 2 / 4.5) : RAIL1 - 0.03 - 0.012 * Math.pow(-sn, 0.5);
      ring.push([x, y]);
    }
    secs.push({ z, ring });
  }
  p.roof.push(G.loftZ(secs, true, 50));
  // roof slat edges showing under the covering (tacked edge strip)
  for (const s of [1, -1]) p.woodZ.push(box(0.02, 0.02, z1 - z0 - 0.02, [s * (CX + 0.012), RAIL1 - 0.012, (z0 + z1) / 2], 0.004));
  // rear wall: vertical boarding around a small window
  const zr = ZB + 0.01;
  const win = { x0: -0.28, x1: 0.28, y0: 1.66, y1: 1.9 };
  const pw = 0.09;
  const nP = Math.round((2 * CX - 0.1) / pw);
  const w = (2 * CX - 0.1) / nP;
  for (let i = 0; i < nP; i++) {
    const xc = -CX + 0.05 + (i + 0.5) * w;
    if (xc + w / 2 > win.x0 && xc - w / 2 < win.x1) {
      p.woodY.push(box(w - 0.003, win.y0 - D.cabBot, 0.02, [xc, (win.y0 + D.cabBot) / 2, zr], 0.004));
      p.woodY.push(box(w - 0.003, RAIL0 - win.y1, 0.02, [xc, (RAIL0 + win.y1) / 2, zr], 0.004));
    } else p.woodY.push(box(w - 0.003, RAIL0 - D.cabBot, 0.02, [xc, (RAIL0 + D.cabBot) / 2, zr], 0.004));
  }
  p.woodX.push(box(2 * CX, 0.05, 0.035, [0, D.belt, zr - 0.02], 0.006));
  p.woodX.push(box(2 * CX, 0.06, 0.035, [0, D.cabBot + 0.03, zr - 0.02], 0.006));
  p.woodX.push(box(0.64, 0.04, 0.03, [0, win.y0 - 0.02, zr - 0.022], 0.005), box(0.64, 0.04, 0.03, [0, win.y1 + 0.02, zr - 0.022], 0.005));
  for (const x of [win.x0 - 0.02, win.x1 + 0.02]) p.woodY.push(box(0.04, win.y1 - win.y0 + 0.08, 0.03, [x, (win.y0 + win.y1) / 2, zr - 0.022], 0.005));
  p.glass.push(frontSlab(rect(win.x0, win.y0, win.x1, win.y1), 0.005, zr));
  // cab mounting blocks on the frame
  for (const s of [1, -1]) for (const z of [0.36, 1.35]) p.black.push(box(0.12, D.floorY - D.frameTop - 0.02, 0.1, [s * D.frameX, (D.floorY + D.frameTop) / 2 - 0.01, z], 0.006));
}

/* ------------------------------------------------------------------ interior */

function interior(p: Parts) {
  const fy = D.floorY;
  // plank floor (front part) and side floor beside the seat box
  for (let i = 0; i < 9; i++) {
    const x = -CX + 0.02 + (i + 0.5) * ((2 * CX - 0.04) / 9);
    p.woodZ.push(box((2 * CX - 0.04) / 9 - 0.004, 0.022, D.zFire - 0.74, [x, fy - 0.011, (0.74 + D.zFire) / 2], 0.003));
  }
  // toe board + gearbox hump
  p.body.push(box(0.4, 0.14, 0.46, [0, fy + 0.07, 1.25], 0.03));
  p.body.push(slab(rect(-CX + 0.02, 0, CX - 0.02, 0.2), 0.004, [0, fy, 1.36], [1, 0, 0], [0, 0.15, 0.13]));
  // seat box (wood) over the tank, leatherette cushion and backrest
  p.woodX.push(box(2 * CX - 0.04, 1.25 - fy + 0.02, 0.02, [0, (1.25 + fy) / 2 - 0.01, 0.73], 0.004));
  p.woodX.push(box(2 * CX - 0.04, 0.02, 0.5, [0, 1.25, 0.49], 0.004));
  p.seat.push(xf(G.rbox(1.7, 0.1, 0.42, 0.04, 3), [0, 1.31, 0.51], [-4, 0, 0]));
  for (let i = -3; i <= 3; i++) p.seat.push(xf(G.rbox(0.012, 0.012, 0.4, 0.005, 1), [i * 0.22, 1.363, 0.51], [-4, 0, 0]));
  p.seat.push(xf(G.rbox(1.7, 0.42, 0.09, 0.04, 3), [0, 1.62, 0.3], [-10, 0, 0]));
  p.woodX.push(box(2 * CX - 0.04, 0.05, 0.03, [0, 1.86, 0.26], 0.005));
  // dashboard: steel panel with a black instrument cluster
  const dz = D.zWs - 0.03;
  p.body.push(frontSlab(rect(-CX + 0.02, 1.38, CX - 0.02, D.belt + 0.02), 0.004, dz));
  p.black.push(frontSlab(rrect(0.2, 1.42, 0.66, 1.56, [0.015, 0.015, 0.015, 0.015], 3), 0.006, dz - 0.004));
  for (const [gx, gr] of [[0.3, 0.045], [0.45, 0.034], [0.57, 0.034]] as [number, number][]) {
    p.steel.push(xf(latheZ([[gr - 0.006, 0.0], [gr + 0.004, 0.0], [gr + 0.006, 0.006], [gr, 0.01]], 28, 40), [gx, 1.49, dz - 0.01], [0, 180, 0]));
    p.body.push(xf(G.cyl(gr, gr, 0.004, 28).rotateX(Math.PI / 2), [gx, 1.49, dz - 0.009]));
    p.glass.push(xf(G.cyl(gr, gr, 0.002, 28).rotateX(Math.PI / 2), [gx, 1.49, dz - 0.016]));
    p.black.push(xf(G.rbox(0.004, gr * 0.8, 0.002, 0.001, 1), [gx, 1.49 + gr * 0.2, dz - 0.013], [0, 0, 35]));
  }
  for (const [kx, ky] of [[0.24, 1.435], [0.4, 1.435], [-0.05, 1.46]] as [number, number][]) p.bake.push(cylZ(0.011, 0.02, [kx, ky, dz - 0.014], 12));
  // steering: column, wooden rim, steel spokes, bakelite hub
  const hub = new THREE.Vector3(0.44, 1.56, 1.08);
  const nrm = new THREE.Vector3(0, 0.76, -0.65).normalize();
  const colEnd = hub.clone().addScaledVector(nrm, -0.78);
  p.black.push(G.rod(colEnd, hub.clone().addScaledVector(nrm, -0.02), 0.022, 14));
  p.black.push(G.rod(colEnd, hub.clone().addScaledVector(nrm, -0.4), 0.03, 14));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
  const rim = G.torus(0.235, 0.015, 10, 56).applyQuaternion(q);
  rim.translate(hub.x, hub.y, hub.z);
  p.wheel.push(rim);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    const e = new THREE.Vector3(Math.cos(a), Math.sin(a), 0).applyQuaternion(q);
    p.steel.push(G.rod(hub.clone(), hub.clone().addScaledVector(e, 0.225), 0.007, 8));
  }
  p.bake.push(G.cyl(0.035, 0.04, 0.03, 18).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm)).translate(hub.x, hub.y, hub.z));
  // gear lever, handbrake, pedals
  p.steel.push(bentRod([[0.02, fy + 0.14, 1.3], [0.05, 1.3, 1.25], [0.08, 1.52, 1.17]], 0.009, 0.1, 8));
  p.bake.push(xf(new THREE.SphereGeometry(0.024, 14, 10), [0.08, 1.535, 1.17]));
  p.steel.push(bentRod([[0.22, fy + 0.02, 1.05], [0.23, 1.2, 1.03], [0.24, 1.4, 0.98]], 0.01, 0.05, 8));
  p.bake.push(xf(G.cyl(0.014, 0.014, 0.08, 10), [0.242, 1.43, 0.975], [20, 0, 0]));
  for (const px of [0.56, 0.38]) {
    p.steel.push(bentRod([[px, fy + 0.02, 1.46], [px, fy + 0.18, 1.4], [px, fy + 0.25, 1.35]], 0.009, 0.04, 8));
    p.rubber.push(xf(G.rbox(0.07, 0.05, 0.02, 0.006, 1), [px, fy + 0.26, 1.34], [-30, 0, 0]));
  }
  p.rubber.push(xf(G.rbox(0.05, 0.13, 0.012, 0.005, 1), [0.24, fy + 0.1, 1.36], [-50, 0, 0]));
  // inner door handles
  for (const s of [1, -1]) p.steel.push(bentRod([[s * (CX - 0.035), 1.45, Z_DOOR0 + 0.08], [s * (CX - 0.06), 1.45, Z_DOOR0 + 0.1], [s * (CX - 0.06), 1.45, Z_DOOR0 + 0.18]], 0.006, 0.01, 8));
}

export function buildCab(): THREE.Object3D {
  const p: Parts = { woodY: [], woodZ: [], woodX: [], body: [], black: [], steel: [], glass: [], roof: [], seat: [], rubber: [], bake: [], wheel: [] };
  sides(p);
  frontAndRoof(p);
  interior(p);
  return group([
    part(merge(p.woodY), P.woodY()),
    part(merge(p.woodZ), P.woodZ()),
    part(merge(p.woodX), P.woodX()),
    part(merge(p.body), P.body()),
    part(merge(p.black), P.black()),
    part(merge(p.steel), P.steel()),
    part(merge(p.glass), P.glass()),
    part(merge(p.roof), P.dermatin()),
    part(merge(p.seat), P.seat()),
    part(merge(p.rubber), P.rubber()),
    part(merge(p.bake), P.bakelite()),
    part(merge(p.wheel), P.wheelWood()),
  ]);
}
