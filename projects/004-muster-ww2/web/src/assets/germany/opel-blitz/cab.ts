/**
 * Opel Blitz all-steel cab: side panels shaped around the front wings, front-hinged doors with
 * wind-down windows, raked two-pane windscreen with wipers, scuttle with ventilator, crowned
 * roof with drip rails, rear wall with window, trafficator housings, mirror; interior with
 * floor, gearbox tunnel, bench seat over the fuel tank, dashboard with instruments, steering
 * column and wheel, gear and handbrake levers and pedals.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import {
  type V2,
  type V3,
  slab,
  sideSlab,
  frontSlab,
  flatSlab,
  merge,
  xf,
  box,
  cylX,
  cylZ,
  latheZ,
  bentRod,
  rrect,
  rect,
  arc2,
  pipe,
} from './util';
import { WING_PROFILE } from './front';

const t = D.sheet;
const CX = D.cabX;

/** Height of the front wing crown at z (for the cut of the cab side), or -inf behind it. */
function wingY(z: number): number {
  if (z < WING_PROFILE[0][0]) return -1;
  for (let i = 1; i < WING_PROFILE.length; i++) {
    const a = WING_PROFILE[i - 1], b = WING_PROFILE[i];
    if (z >= a[0] && z <= b[0]) return a[1] + ((b[1] - a[1]) * (z - a[0])) / (b[0] - a[0]);
  }
  return WING_PROFILE[WING_PROFILE.length - 1][1];
}

/* ------------------------------------------------------------------ outlines */

const Z_DOOR0 = 0.9, Z_DOOR1 = 1.565, Y_DOOR0 = 0.905, Y_DOOR1 = 1.985;
/** Windscreen plane: base (zWs, belt) -> header (zTop, wsTop). */
const Z_WS_TOP = 1.552;

function sideOutline(): V2[] {
  const pts: V2[] = [];
  pts.push([D.zCabBack, D.cabBot]);
  // bottom edge, then up along the wing crown (+ clearance)
  const zCut0 = 1.3;
  pts.push([zCut0, D.cabBot]);
  for (let z = zCut0 + 0.04; z < D.zFire; z += 0.04) {
    const y = Math.max(D.cabBot, wingY(z) + 0.03);
    pts.push([z, y]);
  }
  pts.push([D.zFire, Math.max(D.cabBot, wingY(D.zFire) + 0.03)]);
  pts.push([D.zFire, D.belt]);
  pts.push([D.zWs + 0.01, D.belt]);
  // A-pillar up to the roof rail, rounding into the rail
  pts.push([Z_WS_TOP + 0.006, D.wsTop]);
  pts.push([Z_WS_TOP - 0.012, D.wsTop + 0.024]);
  pts.push([Z_WS_TOP - 0.036, D.rail - 0.004]);
  pts.push([Z_WS_TOP - 0.07, D.rail + 0.002]);
  pts.push([D.zCabBack + 0.04, D.rail + 0.002]);
  pts.push(...arc2(D.zCabBack + 0.04, D.rail - 0.038, 0.04, Math.PI / 2, Math.PI, 4).slice(1));
  return pts;
}

function doorOutline(inset: number): V2[] {
  return rrect(Z_DOOR0 + inset, Y_DOOR0 + inset, Z_DOOR1 - inset, Y_DOOR1 - inset, [0.02, 0.02, 0.02, 0.07], 5);
}
const WIN: V2[] = rrect(Z_DOOR0 + 0.05, 1.615, Z_DOOR1 - 0.05, Y_DOOR1 - 0.05, [0.012, 0.012, 0.012, 0.05], 5);

/* ------------------------------------------------------------------ shell */

function shell(): { body: THREE.BufferGeometry[]; black: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[]; glass: THREE.BufferGeometry[]; rubber: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const rubber: THREE.BufferGeometry[] = [];
  const outline = sideOutline();
  const doorHole = doorOutline(0);
  for (const s of [1, -1]) {
    const x = s * (CX - t / 2);
    body.push(sideSlab(outline, t, x, { holes: [doorHole.slice().reverse()], bevel: 0.0008 }));
    // door (slightly proud) with its window opening
    body.push(sideSlab(doorOutline(0.004), 0.004, s * (CX - 0.001), { holes: [WIN.slice().reverse()], bevel: 0.0012 }));
    // door inner skin (painted), leaves the window slot open
    body.push(sideSlab(rect(Z_DOOR0 + 0.02, Y_DOOR0 + 0.02, Z_DOOR1 - 0.02, 1.6), 0.004, s * (CX - 0.05)));
    body.push(flatSlab(rect(s > 0 ? CX - 0.05 : -CX + 0.003, Z_DOOR0 + 0.02, s > 0 ? CX - 0.003 : -CX + 0.05, Z_DOOR1 - 0.02), 0.004, 1.6));
    // pressed swage along the door and the cab side below the window
    body.push(box(0.006, 0.014, Z_DOOR1 - Z_DOOR0 - 0.03, [s * (CX + 0.003), 1.52, (Z_DOOR0 + Z_DOOR1) / 2], 0.005));
    body.push(box(0.006, 0.014, Z_DOOR0 - D.zCabBack - 0.05, [s * (CX + 0.001), 1.52, (Z_DOOR0 + D.zCabBack) / 2 + 0.01], 0.005));
    // window glass (wound up) in the door
    glass.push(sideSlab(rrect(Z_DOOR0 + 0.045, 1.6, Z_DOOR1 - 0.045, Y_DOOR1 - 0.045, [0.01, 0.01, 0.01, 0.045], 5), 0.004, s * (CX - 0.012)));
    rubber.push(sideSlab(WIN, 0.006, s * (CX - 0.006), { holes: [rrect(Z_DOOR0 + 0.058, 1.623, Z_DOOR1 - 0.058, Y_DOOR1 - 0.058, [0.01, 0.01, 0.01, 0.045], 5).reverse()] }));
    // hinges on the front edge of the door
    for (const y of [1.08, 1.45]) {
      steel.push(xf(G.cyl(0.011, 0.011, 0.09, 12), [s * (CX + 0.012), y, Z_DOOR1 + 0.004]));
      body.push(box(0.012, 0.07, 0.05, [s * (CX + 0.004), y, Z_DOOR1 - 0.022], 0.003));
      body.push(box(0.012, 0.07, 0.03, [s * (CX + 0.004), y, Z_DOOR1 + 0.022], 0.003));
    }
    // outside handle (lever) and lock
    steel.push(bentRod([[s * (CX + 0.004), 1.5, Z_DOOR0 + 0.06], [s * (CX + 0.03), 1.5, Z_DOOR0 + 0.075], [s * (CX + 0.03), 1.5, Z_DOOR0 + 0.17]], 0.008, 0.015, 8));
    steel.push(cylX(0.014, 0.012, [s * (CX + 0.008), 1.5, Z_DOOR0 + 0.06], 12));
    // grab handle behind the door
    steel.push(bentRod([[s * (CX + 0.002), 1.25, D.zCabBack + 0.2], [s * (CX + 0.04), 1.25, D.zCabBack + 0.2], [s * (CX + 0.04), 1.65, D.zCabBack + 0.2], [s * (CX + 0.002), 1.65, D.zCabBack + 0.2]], 0.01, 0.03, 8));
    // trafficator (Winker) housing on the cab side behind the door
    body.push(box(0.03, 0.2, 0.04, [s * (CX + 0.015), 1.78, D.zCabBack + 0.13], 0.01));
    black.push(box(0.008, 0.16, 0.022, [s * (CX + 0.031), 1.78, D.zCabBack + 0.13], 0.003));
    // drip rail over the door
    body.push(cylZ(0.006, 1.02, [s * (CX + 0.006), D.rail + 0.004, 1.03], 8));
  }
  // cab front panel (bulkhead) outboard of the bonnet + scuttle top
  const bulk: V2[] = [
    [-CX, D.belt],
    [-CX, wingY(D.zFire) + 0.03],
    [-D.bonnetX - 0.02, wingY(D.zFire) + 0.03],
    [-D.bonnetX - 0.02, 0.93],
    [D.bonnetX + 0.02, 0.93],
    [D.bonnetX + 0.02, wingY(D.zFire) + 0.03],
    [CX, wingY(D.zFire) + 0.03],
    [CX, D.belt],
  ];
  body.push(frontSlab(bulk.slice().reverse(), t, D.zFire - t / 2));
  body.push(flatSlab(rect(-CX, D.zWs - 0.01, CX, D.zFire + 0.004), t, D.belt - t / 2));
  body.push(box(2 * CX, 0.02, 0.02, [0, D.belt - 0.005, D.zFire], 0.006));
  // scuttle ventilator flap
  body.push(box(0.36, 0.012, 0.07, [0, D.belt + 0.006, D.zFire - 0.05], 0.005));
  steel.push(box(0.03, 0.02, 0.02, [0.14, D.belt + 0.01, D.zFire - 0.1], 0.004));
  // windscreen frame: two panes in a raked frame
  const wsO: V3 = [0, D.belt, D.zWs];
  const up = new THREE.Vector3(0, D.wsTop - D.belt, Z_WS_TOP - D.zWs);
  const H = up.length();
  const paneL: V2 = [0.035, 0.87];
  const paneH: V2 = [0.04, H - 0.04];
  const holes = [1, -1].map((s) => rrect(s > 0 ? paneL[0] : -paneL[1], paneH[0], s > 0 ? paneL[1] : -paneL[0], paneH[1], [0.02, 0.02, 0.02, 0.02], 4).reverse());
  body.push(slab(rect(-CX + 0.003, 0, CX - 0.003, H + 0.004), 0.02, wsO, [1, 0, 0], [0, up.y, up.z], { holes, bevel: 0.003 }));
  for (const s of [1, -1]) {
    const g = rrect(s > 0 ? paneL[0] + 0.006 : -paneL[1] + 0.006, paneH[0] + 0.006, s > 0 ? paneL[1] - 0.006 : -paneL[0] - 0.006, paneH[1] - 0.006, [0.015, 0.015, 0.015, 0.015], 4);
    glass.push(slab(g, 0.005, wsO, [1, 0, 0], [0, up.y, up.z]));
    // pane frames (each pane opens outwards at the top)
    const fr = rrect(s > 0 ? paneL[0] - 0.012 : -paneL[1] - 0.012, paneH[0] - 0.012, s > 0 ? paneL[1] + 0.012 : -paneL[0] + 0.012, paneH[1] + 0.012, [0.025, 0.025, 0.025, 0.025], 4);
    const n = new THREE.Vector3(1, 0, 0).cross(up.clone().normalize()).normalize();
    const o2: V3 = [wsO[0] + n.x * 0.012, wsO[1] + n.y * 0.012, wsO[2] + n.z * 0.012];
    body.push(slab(fr, 0.008, o2, [1, 0, 0], [0, up.y, up.z], { holes: [g.slice().reverse()], bevel: 0.002 }));
    // wiper motor on the header and arm/blade on the glass
    const hx = s * 0.42;
    const top = new THREE.Vector3(hx, D.wsTop - 0.03, Z_WS_TOP + 0.005 + 0.02);
    black.push(xf(G.cyl(0.024, 0.024, 0.06, 14), [hx, D.wsTop + 0.012, Z_WS_TOP - 0.03], [90, 0, 0]));
    const dir = up.clone().normalize().multiplyScalar(-1);
    const tip = top.clone().addScaledVector(dir, 0.26).add(new THREE.Vector3(s * 0.05, 0, 0)).addScaledVector(n, 0.004);
    steel.push(G.rod(top.clone().addScaledVector(n, 0.02), tip, 0.0035, 8));
    rubber.push(G.rod(tip.clone().add(new THREE.Vector3(-0.012 * s, 0.1, 0)).addScaledVector(n, -0.004), tip.clone().add(new THREE.Vector3(0.012 * s, -0.12, 0)).addScaledVector(n, -0.004), 0.004, 6));
  }
  // windscreen header rail under the roof brow
  body.push(box(2 * CX, 0.03, 0.035, [0, D.wsTop + 0.012, Z_WS_TOP + 0.002], 0.008));
  // rear-view mirror on the left A-pillar
  steel.push(bentRod([[CX + 0.005, 1.8, 1.58], [CX + 0.08, 1.82, 1.6], [CX + 0.13, 1.84, 1.6]], 0.007, 0.03, 8));
  body.push(xf(latheZ([[0.0, 0.012], [0.058, 0.012], [0.062, 0.004], [0.062, -0.004], [0.0, -0.008]], 24, 40), [CX + 0.145, 1.86, 1.6]));
  glass.push(xf(G.cyl(0.054, 0.054, 0.002, 24).rotateX(Math.PI / 2), [CX + 0.145, 1.86, 1.59]));
  // roof: crowned loft, drip rails
  const roofSecs: { z: number; ring: V2[] }[] = [];
  const zs: number[] = [];
  const zR0 = D.zCabBack - 0.003, zR1 = Z_WS_TOP + 0.012;
  for (let i = 0; i <= 18; i++) zs.push(zR0 + ((zR1 - zR0) * i) / 18);
  const roofH = (z: number) => {
    const back = Math.min(1, (z - zR0) / 0.05);
    const front = Math.min(1, (zR1 - z) / 0.13);
    const f = Math.sqrt(Math.max(0.04, Math.min(back, 1))) * Math.sqrt(Math.max(0.03, 1 - Math.pow(1 - Math.max(0, front), 2)));
    return f;
  };
  for (const z of zs) {
    const f = roofH(z);
    const ring: V2[] = [];
    const n = 36;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const x = (CX + 0.002) * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3.2);
      const y = s >= 0 ? D.rail - 0.02 + (D.roofY - D.rail + 0.02) * f * Math.pow(s, 2 / 3.2) : D.rail - 0.02 - 0.01 * Math.pow(-s, 0.5);
      ring.push([x, y]);
    }
    roofSecs.push({ z, ring });
  }
  body.push(G.loftZ(roofSecs, true, 50));
  for (const s of [1, -1]) body.push(cylZ(0.007, zR1 - zR0 - 0.03, [s * (CX + 0.006), D.rail + 0.004, (zR0 + zR1) / 2 - 0.01], 8));
  // rear wall with window
  const rwHole = rrect(-0.3, 1.63, 0.3, 1.87, [0.035, 0.035, 0.035, 0.035], 4);
  body.push(frontSlab(rect(-CX, D.cabBot, CX, D.rail - 0.01), t, D.zCabBack + t / 2, { holes: [rwHole.slice().reverse()] }));
  glass.push(frontSlab(rrect(-0.29, 1.64, 0.29, 1.86, [0.03, 0.03, 0.03, 0.03], 4), 0.005, D.zCabBack + 0.012));
  rubber.push(frontSlab(rwHole, 0.008, D.zCabBack + 0.006, { holes: [rrect(-0.28, 1.65, 0.28, 1.85, [0.03, 0.03, 0.03, 0.03], 4).reverse()] }));
  // rear corner posts (rounded) and bottom sill
  for (const s of [1, -1]) body.push(xf(G.cyl(0.022, 0.022, D.rail - D.cabBot - 0.02, 12), [s * (CX - 0.02), (D.rail + D.cabBot) / 2 - 0.01, D.zCabBack + 0.02]));
  body.push(box(2 * CX, 0.04, 0.04, [0, D.cabBot + 0.02, D.zCabBack + 0.02], 0.006));
  // bolts along the sill
  const bolts: { p: V3; n: V3 }[] = [];
  for (const s of [1, -1]) for (let z = 0.6; z < 1.25; z += 0.12) bolts.push({ p: [s * CX, D.cabBot + 0.02, z], n: [s, 0, 0] });
  steel.push(G.scatter(G.boltHead(0.012, 0.005), bolts));
  // cab mounting blocks on the frame
  for (const s of [1, -1]) for (const z of [0.62, 1.55]) black.push(box(0.12, D.floorY - D.frameTop - 0.02, 0.1, [s * D.frameX, (D.floorY + D.frameTop) / 2 - 0.01, z], 0.006));
  // underside of the cab: floor pan skirt from the sill down
  return { body, black, steel, glass, rubber };
}

/* ------------------------------------------------------------------ interior */

function interior(): { body: THREE.BufferGeometry[]; black: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[]; seat: THREE.BufferGeometry[]; bake: THREE.BufferGeometry[]; glass: THREE.BufferGeometry[]; rubber: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const seat: THREE.BufferGeometry[] = [];
  const bake: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const rubber: THREE.BufferGeometry[] = [];
  const fy = D.floorY;
  // floor: front part, side strips beside the seat box
  body.push(flatSlab(rect(-CX + t, 1.0, CX - t, D.zFire - t), 0.004, fy - 0.002));
  for (const s of [1, -1]) body.push(flatSlab(rect(s > 0 ? 0.36 : -CX + t, D.zCabBack + t, s > 0 ? CX - t : -0.36, 1.0), 0.004, fy - 0.002));
  // rubber floor mats
  rubber.push(flatSlab(rect(0.12, 1.05, 0.8, 1.5), 0.006, fy + 0.003, { corner: 0.02 }), flatSlab(rect(-0.8, 1.05, -0.2, 1.5), 0.006, fy + 0.003, { corner: 0.02 }));
  // gearbox tunnel and toe board hump
  body.push(box(0.36, 0.1, 0.46, [0, fy + 0.05, 1.27], 0.03));
  body.push(box(0.54, 0.2, 0.22, [0, fy + 0.1, 1.61], 0.04));
  // toe board (sloped) across the width
  body.push(slab(rect(-CX + t, 0, CX - t, 0.2), 0.004, [0, fy, 1.56], [1, 0, 0], [0, 0.15, 0.14]));
  // seat box over the fuel tank
  body.push(frontSlab(rect(-CX + t, fy, CX - t, 1.27), 0.004, 1.0));
  body.push(flatSlab(rect(-CX + t, D.zCabBack + t, CX - t, 1.0), 0.004, 1.27));
  // bench seat: cushion and backrest in pleated leatherette
  const cushion = G.rbox(1.72, 0.12, 0.42, 0.05, 3);
  seat.push(xf(cushion, [0, 1.33, 0.8], [-4, 0, 0]));
  for (let i = -3; i <= 3; i++) seat.push(xf(G.rbox(0.012, 0.012, 0.4, 0.005, 1), [i * 0.22, 1.393, 0.8], [-4, 0, 0]));
  seat.push(xf(G.rbox(1.72, 0.48, 0.11, 0.045, 3), [0, 1.64, 0.595], [-12, 0, 0]));
  for (let i = -3; i <= 3; i++) seat.push(xf(G.rbox(0.012, 0.44, 0.012, 0.005, 1), [i * 0.22, 1.64, 0.653], [-12, 0, 0]));
  // dashboard (painted), instrument panel (black) with gauges
  const dz = D.zWs - 0.012;
  body.push(frontSlab(rect(-CX + t, 1.36, CX - t, D.belt - t), 0.004, dz));
  body.push(flatSlab(rect(-CX + t, dz - 0.06, CX - t, dz), 0.004, 1.362));
  black.push(frontSlab(rrect(0.24, 1.4, 0.72, 1.555, [0.02, 0.02, 0.02, 0.02], 3), 0.006, dz - 0.004));
  for (const [gx, gr] of [[0.36, 0.05], [0.52, 0.035], [0.63, 0.035]] as [number, number][]) {
    steel.push(xf(latheZ([[gr - 0.006, 0.0], [gr + 0.004, 0.0], [gr + 0.006, 0.006], [gr, 0.01]], 28, 40), [gx, 1.475, dz - 0.01], [0, 180, 0]));
    body.push(xf(G.cyl(gr, gr, 0.004, 28).rotateX(Math.PI / 2), [gx, 1.475, dz - 0.009]));
    glass.push(xf(G.cyl(gr, gr, 0.002, 28).rotateX(Math.PI / 2), [gx, 1.475, dz - 0.016]));
    black.push(xf(G.rbox(0.004, gr * 0.8, 0.002, 0.001, 1), [gx, 1.475 + gr * 0.2, dz - 0.013], [0, 0, 35]));
  }
  for (const [kx, ky] of [[0.28, 1.42], [0.44, 1.42], [0.0, 1.45], [-0.1, 1.45]] as [number, number][]) bake.push(cylZ(0.011, 0.02, [kx, ky, dz - 0.014], 12));
  // steering column and wheel (driver on the left, +X)
  const hub = new THREE.Vector3(0.47, 1.53, 1.24);
  const nrm = new THREE.Vector3(0, 0.8, -0.6).normalize();
  const colEnd = hub.clone().addScaledVector(nrm, -0.72);
  black.push(G.rod(colEnd, hub.clone().addScaledVector(nrm, -0.02), 0.022, 14));
  black.push(G.rod(colEnd, hub.clone().addScaledVector(nrm, -0.35), 0.03, 14));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
  const rim = G.torus(0.225, 0.013, 10, 56).applyQuaternion(q);
  rim.translate(hub.x, hub.y, hub.z);
  bake.push(rim);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    const e = new THREE.Vector3(Math.cos(a), Math.sin(a), 0).applyQuaternion(q);
    bake.push(G.rod(hub.clone(), hub.clone().addScaledVector(e, 0.215), 0.008, 8));
  }
  bake.push(xf(G.cyl(0.035, 0.04, 0.03, 18), [0, 0, 0]).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm)).translate(hub.x, hub.y, hub.z));
  // gear lever and handbrake lever on the tunnel
  steel.push(bentRod([[0.02, fy + 0.1, 1.38], [0.05, 1.3, 1.34], [0.09, 1.5, 1.26]], 0.009, 0.1, 8));
  bake.push(xf(new THREE.SphereGeometry(0.024, 14, 10), [0.09, 1.515, 1.26]));
  body.push(box(0.1, 0.03, 0.1, [0.02, fy + 0.105, 1.38], 0.01));
  steel.push(bentRod([[0.2, fy + 0.02, 1.2], [0.21, 1.2, 1.18], [0.22, 1.38, 1.12]], 0.01, 0.05, 8));
  bake.push(xf(G.cyl(0.014, 0.014, 0.08, 10), [0.222, 1.41, 1.11], [20, 0, 0]));
  // pedals: clutch, brake (left of the column), accelerator
  for (const [px, pl] of [[0.56, 0.3], [0.4, 0.3]] as [number, number][]) {
    steel.push(bentRod([[px, fy + 0.02, 1.62], [px, fy + 0.18, 1.55], [px, fy + pl - 0.05, 1.5]], 0.009, 0.04, 8));
    rubber.push(xf(G.rbox(0.07, 0.05, 0.02, 0.006, 1), [px, fy + pl - 0.04, 1.49], [-30, 0, 0]));
  }
  rubber.push(xf(G.rbox(0.05, 0.14, 0.012, 0.005, 1), [0.25, fy + 0.1, 1.5], [-50, 0, 0]));
  // door check straps and inner handles
  for (const s of [1, -1]) {
    steel.push(bentRod([[s * (CX - 0.055), 1.45, Z_DOOR0 + 0.08], [s * (CX - 0.075), 1.45, Z_DOOR0 + 0.1], [s * (CX - 0.075), 1.45, Z_DOOR0 + 0.18]], 0.006, 0.01, 8));
    steel.push(cylX(0.02, 0.01, [s * (CX - 0.058), 1.3, (Z_DOOR0 + Z_DOOR1) / 2], 12));
    bake.push(bentRod([[s * (CX - 0.064), 1.3, (Z_DOOR0 + Z_DOOR1) / 2], [s * (CX - 0.064), 1.3, (Z_DOOR0 + Z_DOOR1) / 2 + 0.08], [s * (CX - 0.085), 1.3, (Z_DOOR0 + Z_DOOR1) / 2 + 0.085]], 0.007, 0.01, 8));
  }
  // interior light / roof bows
  for (const z of [0.8, 1.2]) body.push(box(2 * CX - 0.01, 0.02, 0.03, [0, D.rail - 0.035, z], 0.006));
  return { body, black, steel, seat, bake, glass, rubber };
}

export function buildCab(): THREE.Object3D {
  const sh = shell();
  const it = interior();
  return group([
    part(merge([...sh.body, ...it.body]), P.body()),
    part(merge([...sh.black, ...it.black]), P.black()),
    part(merge([...sh.steel, ...it.steel]), P.steel()),
    part(merge([...sh.glass, ...it.glass]), P.glass()),
    part(merge([...sh.rubber, ...it.rubber]), P.rubber()),
    part(merge(it.seat), P.seat()),
    part(merge(it.bake), P.bakelite()),
  ]);
}

export { cylX, pipe };
