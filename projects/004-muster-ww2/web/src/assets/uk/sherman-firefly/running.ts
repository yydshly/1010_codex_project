/**
 * VVSS running gear of the Sherman V (M4A4), copied from the M4A3(75)W model with the M4A4 bogie pitch (built for the left side, mirrored for the right):
 * three late-type bogies per side (cast bracket, twin volute springs, suspension arms, track skid and
 * the upswept rear return-roller bracket), 20 x 9 in "smooth concave" road wheels, the plain 13-tooth
 * drive sprocket on the final drive, the pressed-spoke 22 in idler on its adjustable bracket, and the
 * individually modelled T48 track.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Pal } from './palette';
import { TRACK, WHEEL, BOGIE, ROLLER, SPROCKET, IDLER, H } from './dims';
import { trackLayout, shoeGeometries, connectorGeometries, shoeMatrices, connectorMatrices } from './track';
import { latheX, boltRingX, hullOutline, nut, rb, prism, circlePts, type P2 } from './util';

const TX = TRACK.x;

/* ------------------------------------------------------------------ geometry cache */
let cache: Record<string, THREE.BufferGeometry> | null = null;
function geos() {
  if (cache) return cache;
  const c: Record<string, THREE.BufferGeometry> = {};
  const hw = WHEEL.w / 2;
  // road wheel tyre (one wide 9 in tyre), axis X, centred
  c.tyre = latheX(
    [
      [0.206, -hw],
      [0.236, -hw],
      [0.247, -hw + 0.006],
      [0.2525, -hw + 0.018],
      [WHEEL.r, -hw + 0.04],
      [WHEEL.r, hw - 0.04],
      [0.2525, hw - 0.018],
      [0.247, hw - 0.006],
      [0.236, hw],
      [0.206, hw],
    ],
    40,
    50,
  );
  // pressed steel rim under the tyre with rolled lips, then the smooth concave outer disc
  c.wheelDisc = latheX(
    [
      [0.198, -hw + 0.004],
      [0.214, -hw - 0.004],
      [0.216, -hw + 0.004],
      [0.205, -hw + 0.012],
      [0.205, hw - 0.012],
      [0.216, hw - 0.004],
      [0.214, hw + 0.004],
      [0.198, hw - 0.002],
      [0.17, hw - 0.018],
      [0.135, hw - 0.04],
      [0.105, hw - 0.055],
      [0.092, hw - 0.052],
      [0.086, hw - 0.03],
      [0.074, hw - 0.018],
    ],
    40,
    32,
  );
  // inner disc (plain dish, mostly hidden)
  c.wheelDiscIn = latheX(
    [
      [0.074, -hw + 0.02],
      [0.1, -hw + 0.05],
      [0.17, -hw + 0.02],
      [0.2, -hw + 0.002],
    ],
    32,
    35,
  );
  // hub boss, arm end boss, cap and bolts (outer)
  c.hub = latheX(
    [
      [0.0, hw - 0.04],
      [0.078, hw - 0.04],
      [0.078, hw + 0.005],
      [0.07, hw + 0.012],
      [0.0, hw + 0.012],
    ],
    28,
    35,
  );
  c.wheelBolts = G.scatter(nut(0.018, 0.008), boltRingX(0.062, 6, hw + 0.012, 1, Math.PI / 6));
  // return roller: single roller with a narrow tyre face, hub cap
  c.rollerBody = latheX(
    [
      [0.03, -ROLLER.w / 2],
      [0.072, -ROLLER.w / 2],
      [0.079, -ROLLER.w / 2 + 0.006],
      [ROLLER.r, -ROLLER.w / 2 + 0.014],
      [ROLLER.r, ROLLER.w / 2 - 0.014],
      [0.079, ROLLER.w / 2 - 0.006],
      [0.072, ROLLER.w / 2],
      [0.05, ROLLER.w / 2 - 0.004],
      [0.045, ROLLER.w / 2 + 0.012],
      [0.03, ROLLER.w / 2 + 0.02],
      [0.0, ROLLER.w / 2 + 0.022],
    ],
    28,
    40,
  );
  // idler rim (steel running band) and pressed spoked discs
  c.idlerRim = latheX(
    [
      [0.25, -hw],
      [0.268, -hw],
      [IDLER.r, -hw + 0.012],
      [IDLER.r, hw - 0.012],
      [0.268, hw],
      [0.25, hw],
      [0.25, -hw],
    ],
    48,
    40,
  );
  // spoked disc: annulus with six rounded-trapezoid openings (pressed), lying in XY -> axis X later
  const s = new THREE.Shape();
  const outer = circlePts(0.252, 48);
  s.moveTo(outer[0][0], outer[0][1]);
  for (const p of outer.slice(1)) s.lineTo(p[0], p[1]);
  s.closePath();
  const hub = new THREE.Path();
  const hc = circlePts(0.055, 20, 0, 0, true);
  hub.moveTo(hc[0][0], hc[0][1]);
  for (const p of hc.slice(1)) hub.lineTo(p[0], p[1]);
  hub.closePath();
  s.holes.push(hub);
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2 + 0.2, a1 = a0 + (Math.PI * 2) / 6 - 0.4;
    const pts: P2[] = [];
    const n = 7;
    for (let k = 0; k <= n; k++) {
      const a = a1 - ((a1 - a0) * k) / n;
      pts.push([Math.cos(a) * 0.212, Math.sin(a) * 0.212]);
    }
    for (let k = 0; k <= n; k++) {
      const a = a0 + ((a1 - a0) * k) / n;
      const r = 0.105 + 0.02 * Math.sin((k / n) * Math.PI);
      pts.push([Math.cos(a + (k === 0 ? 0.08 : k === n ? -0.08 : 0)) * r, Math.sin(a + (k === 0 ? 0.08 : k === n ? -0.08 : 0)) * r]);
    }
    const hp = new THREE.Path();
    hp.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) hp.lineTo(p[0], p[1]);
    hp.closePath();
    s.holes.push(hp);
  }
  const disc = G.extrude(s, 0.008, 0.002, 2, 1);
  disc.rotateY(Math.PI / 2);
  c.idlerDisc = disc;
  // flanged lip round each opening, approximated by the dished cone between hub and rim
  c.idlerCone = latheX(
    [
      [0.06, 0.0],
      [0.1, 0.03],
      [0.108, 0.034],
    ],
    32,
    40,
  );
  // track
  const sg = shoeGeometries();
  c.shoeRubber = sg.rubber;
  c.shoeSteel = sg.steel;
  const cg = connectorGeometries();
  c.connSteel = cg.steel;
  cache = c;
  return c;
}

/* ------------------------------------------------------------------ road wheel */
function roadWheel(P: Pal, spin: number): THREE.Group {
  const g = geos();
  return group(
    [
      part(g.tyre, P.rubber),
      part(g.wheelDisc, P.paint),
      part(g.wheelDiscIn, P.paint),
      part(g.hub, P.cast),
      part(g.wheelBolts, P.cast),
    ],
    { r: [spin, 0, 0] },
  );
}

/* ------------------------------------------------------------------ volute spring */
function voluteSpring(y0: number, y1: number, r0: number, r1: number, turns: number): THREE.BufferGeometry {
  // flat strip coiled into a telescoping cone: the strip width runs up the spring axis
  const pts: THREE.Vector3[] = [];
  const nrm: THREE.Vector3[] = [];
  const n = Math.round(turns * 24);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    const y = y0 + (y1 - y0) * t;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    nrm.push(new THREE.Vector3(Math.cos(a), 0.25, Math.sin(a)).normalize());
  }
  return G.strap(pts, 0.045, 0.008, nrm, { smooth: false });
}

/* ------------------------------------------------------------------ bogie */
function bogie(P: Pal, zb: number, spin: number): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const xh = H.xLow; // hull side face
  const xo = TX + WHEEL.w / 2 + 0.02; // outer suspension arm plane
  const xi = TX - WHEEL.w / 2 - 0.022; // inner suspension arm plane
  const pivY = 0.565, pivZ = 0.105;

  // --- bracket: mounting flange bolted to the hull side (12-hole trapezoid + underside bolts)
  const flange = prism(
    [
      [-0.25, 0.47],
      [0.25, 0.47],
      [0.22, 0.95],
      [-0.22, 0.95],
    ],
    0.032,
    'zy',
    0.006,
  );
  ps.push(part(flange, P.cast, { p: [xh + 0.016, 0, zb] }));
  const bolts: G.V3[] = [];
  for (const z of [-0.2, -0.12, -0.04, 0.04, 0.12, 0.2]) bolts.push([xh + 0.032, 0.9, zb + z * 0.9]);
  for (const z of [-0.22, -0.13, 0.13, 0.22]) bolts.push([xh + 0.032, 0.515, zb + z]);
  for (const z of [-0.2, 0.2]) bolts.push([xh + 0.032, 0.71, zb + z]);
  ps.push(part(G.scatter(nut(0.03, 0.013), bolts.map((p) => ({ p, n: [1, 0, 0] as G.V3 }))), P.cast));

  // --- upper housing: the cast "hat" spanning over both wheels
  const hatOutline: P2[] = [
    [-0.215, 0.64],
    [-0.13, 0.62],
    [0.13, 0.62],
    [0.215, 0.64],
    [0.225, 0.7],
    [0.205, 0.79],
    [0.17, 0.805],
    [-0.17, 0.805],
    [-0.205, 0.79],
    [-0.225, 0.7],
  ];
  const hat = prism(hatOutline, xo + 0.035 - (xh + 0.03), 'zy', 0.012);
  ps.push(part(hat, P.cast, { p: [(xo + 0.035 + xh + 0.03) / 2, 0, zb] }));
  // raised ribs on the outer face of the housing
  for (const z of [-0.15, 0, 0.15]) ps.push(part(rb(0.02, 0.13, 0.024, 0.006), P.cast, { p: [xo + 0.044, 0.715, zb + z] }));
  ps.push(part(rb(0.02, 0.024, 0.4, 0.006), P.cast, { p: [xo + 0.044, 0.785, zb] }));
  // track skid on top (the upper run rides on it if it sags)
  ps.push(part(prism([[-0.12, 0], [0.16, 0], [0.2, 0.012], [0.19, 0.03], [-0.1, 0.03], [-0.14, 0.012]], 0.2, 'zy', 0.004), P.bright, { p: [TX, 0.8, zb] }));
  ps.push(part(rb(0.24, 0.018, 0.3, 0.005), P.cast, { p: [TX, 0.803, zb + 0.02] }));

  // --- legs carrying the arm pivots (outer and inner), open in the middle to show the springs
  for (const s of [1, -1]) {
    for (const x of [xo + 0.018, xi - 0.02]) {
      const leg = prism(hullOutline([{ c: [s * 0.16, 0.66], r: 0.045 }, { c: [s * pivZ, pivY], r: 0.055 }], 8), 0.034, 'zy', 0.007);
      ps.push(part(leg, P.cast, { p: [x, 0, zb] }));
    }
    // pivot pin through both legs with its nuts
    ps.push(part(G.cyl(0.03, 0.03, xo - xi + 0.1, 16), P.cast, { p: [(xo + xi) / 2, pivY, zb + s * pivZ], r: [0, 0, 90] }));
    ps.push(part(nut(0.045, 0.018), P.cast, { p: [xo + 0.05, pivY, zb + s * pivZ], r: [0, 0, -90] }));
    ps.push(part(G.cyl(0.012, 0.012, 0.03, 8), P.toolSteel, { p: [xo + 0.07, pivY, zb + s * pivZ], r: [0, 0, 90] }));
  }

  // --- volute springs (two, side by side across the bogie) on the spring seat
  const seatY = 0.5;
  for (const x of [TX - 0.058, TX + 0.058]) {
    ps.push(part(voluteSpring(seatY + 0.02, 0.63, 0.062, 0.042, 4.2), P.track, { p: [x, 0, zb] }));
  }
  ps.push(part(rb(0.26, 0.03, 0.16, 0.008), P.cast, { p: [TX, seatY + 0.005, zb] }));
  ps.push(part(rb(0.24, 0.02, 0.13, 0.006), P.cast, { p: [TX, 0.628, zb] }));

  // --- suspension arms: outer and inner plates from the pivot to the wheel spindle, toe under the seat
  for (const s of [1, -1]) {
    const wz = s * BOGIE.half;
    const outline = hullOutline([
      { c: [s * pivZ, pivY], r: 0.06 },
      { c: [wz, WHEEL.y], r: 0.082 },
    ], 10);
    for (const [x, t] of [[xo, 0.034], [xi, 0.03]] as [number, number][]) {
      ps.push(part(prism(outline, t, 'zy', 0.008), P.cast, { p: [x, 0, zb] }));
    }
    // lever toe from the pivot in under the spring seat
    const toe = hullOutline([
      { c: [s * pivZ, pivY], r: 0.045 },
      { c: [s * 0.03, seatY - 0.02], r: 0.03 },
    ], 8);
    ps.push(part(prism(toe, 0.2, 'zy', 0.006), P.cast, { p: [TX, 0, zb] }));
    // stiffening web along the outer arm
    const a = new THREE.Vector3(xo + 0.02, pivY - 0.02, zb + s * pivZ);
    const b = new THREE.Vector3(xo + 0.02, WHEEL.y + 0.03, zb + wz - s * 0.03);
    ps.push(part(G.rod(a, b, 0.016, 8), P.cast));
    // spindle boss and hub cap outside the outer arm
    ps.push(part(G.cyl(0.07, 0.074, 0.03, 24), P.cast, { p: [xo + 0.03, WHEEL.y, zb + wz], r: [0, 0, 90] }));
    ps.push(part(latheX([[0.0, 0.0], [0.055, 0.0], [0.055, 0.014], [0.046, 0.024], [0.0, 0.026]], 24, 40), P.cast, { p: [xo + 0.045, WHEEL.y, zb + wz] }));
    ps.push(part(G.scatter(nut(0.016, 0.008), boltRingX(0.046, 5, xo + 0.059, 1, spin * 0.02)), P.cast, { p: [0, WHEEL.y, zb + wz] }));
    ps.push(part(G.cyl(0.006, 0.006, 0.02, 8), P.toolSteel, { p: [xo + 0.078, WHEEL.y + 0.012, zb + wz + 0.01], r: [0, 0, 90] }));
    // the wheel itself
    ps.push(group([roadWheel(P, spin + s * 23)], { p: [TX, WHEEL.y, zb + wz] }));
  }

  // --- upswept return roller bracket (inboard) and the roller
  const rz = zb + ROLLER.dz;
  const bx = xh + 0.036;
  const armO = hullOutline([
    { c: [-0.13, 0.735], r: 0.06 },
    { c: [ROLLER.dz + 0.02, ROLLER.y], r: 0.05 },
  ], 8);
  ps.push(part(prism(armO, 0.04, 'zy', 0.008), P.cast, { p: [bx + 0.02, 0, zb] }));
  ps.push(part(G.rod([bx + 0.02, 0.76, zb - 0.1], [bx + 0.02, ROLLER.y + 0.03, rz + 0.07], 0.022, 10), P.cast));
  // axle across the inner horn lane into the roller
  ps.push(part(G.cyl(0.02, 0.02, TX - bx, 12), P.toolSteel, { p: [(TX + bx) / 2, ROLLER.y, rz], r: [0, 0, 90] }));
  ps.push(part(G.cyl(0.045, 0.045, 0.03, 18), P.cast, { p: [bx + 0.05, ROLLER.y, rz], r: [0, 0, 90] }));
  const g = geos();
  ps.push(part(g.rollerBody, P.paint, { p: [TX, ROLLER.y, rz] }));
  ps.push(part(nut(0.024, 0.01), P.cast, { p: [TX + ROLLER.w / 2 + 0.02, ROLLER.y, rz], r: [0, 0, -90] }));
  return group(ps);
}

/* ------------------------------------------------------------------ sprocket */
function toothOutline(teeth: number, rootR: number, tipR: number, phase: number): P2[] {
  const pts: P2[] = [];
  const pa = (Math.PI * 2) / teeth;
  const add = (a: number, r: number) => pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  for (let i = 0; i < teeth; i++) {
    const a = phase + i * pa;
    // gap (root) centred between teeth, rounded; tooth flanks curve to a blunt tip
    add(a - pa / 2, rootR);
    add(a - pa * 0.36, rootR + 0.006);
    add(a - pa * 0.27, rootR + 0.035);
    add(a - pa * 0.2, (rootR + tipR) / 2 + 0.015);
    add(a - pa * 0.12, tipR - 0.01);
    add(a - pa * 0.05, tipR);
    add(a + pa * 0.05, tipR);
    add(a + pa * 0.12, tipR - 0.01);
    add(a + pa * 0.2, (rootR + tipR) / 2 + 0.015);
    add(a + pa * 0.27, rootR + 0.035);
    add(a + pa * 0.36, rootR + 0.006);
  }
  return pts;
}

function sprocket(P: Pal, phase: number): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const { z, y, pitchR, teeth } = SPROCKET;
  const rootR = pitchR - 0.09, tipR = pitchR + 0.03;
  const shape = new THREE.Shape();
  const o = toothOutline(teeth, rootR, tipR, 0);
  shape.moveTo(o[0][0], o[0][1]);
  for (const p of o.slice(1)) shape.lineTo(p[0], p[1]);
  shape.closePath();
  const hole = new THREE.Path();
  const hc = circlePts(0.16, 40, 0, 0, true);
  hole.moveTo(hc[0][0], hc[0][1]);
  for (const p of hc.slice(1)) hole.lineTo(p[0], p[1]);
  hole.closePath();
  shape.holes.push(hole);
  const ring = G.extrude(shape, 0.028, 0.004, 1, 1);
  ring.rotateY(Math.PI / 2); // outline x -> -Z, y -> Y ; teeth at outline angle 0 point to -Z
  // bring a tooth to the shoe-centre angle (atan2(y, z) measured about the sprocket centre)
  const rx = 180 - (phase * 180) / Math.PI;
  for (const s of [1, -1]) ps.push(part(ring, P.cast, { p: [TX + s * TRACK.hornX, y, z], r: [rx, 0, 0] }));
  // hub drum between the rings, flanges and bolt circles
  ps.push(part(G.cyl(0.17, 0.17, 2 * TRACK.hornX - 0.02, 40, true), P.cast, { p: [TX, y, z], r: [0, 0, 90] }));
  for (const s of [1, -1]) {
    ps.push(part(latheX([[0.155, -0.02], [0.2, -0.02], [0.2, 0.02], [0.155, 0.02]], 40, 40), P.cast, { p: [TX + s * (TRACK.hornX - 0.03), y, z] }));
  }
  ps.push(part(G.scatter(nut(0.022, 0.01), boltRingX(0.185, 12, TX + TRACK.hornX + 0.014, 1, 0.13)), P.cast, { p: [0, y, z] }));
  // outer dish and hub cap
  ps.push(
    part(
      latheX([[0.17, 0.0], [0.165, 0.014], [0.13, 0.03], [0.1, 0.034], [0.094, 0.05], [0.07, 0.056], [0.0, 0.058]], 40, 30),
      P.cast,
      { p: [TX + TRACK.hornX + 0.012, y, z] },
    ),
  );
  ps.push(part(G.scatter(nut(0.02, 0.009), boltRingX(0.08, 8, TX + TRACK.hornX + 0.058, 1)), P.cast, { p: [0, y, z] }));
  ps.push(part(nut(0.036, 0.012), P.cast, { p: [TX + TRACK.hornX + 0.068, y, z], r: [0, 0, -90] }));
  // short hub to the final drive flange (the flange itself belongs to the differential housing)
  ps.push(part(G.cyl(0.165, 0.165, TX - TRACK.hornX - H.xLow - 0.03, 32), P.cast, { p: [(TX - TRACK.hornX + H.xLow + 0.03) / 2, y, z], r: [0, 0, 90] }));
  return group(ps);
}

/* ------------------------------------------------------------------ idler */
function idler(P: Pal, zI: number): THREE.Group {
  const g = geos();
  const ps: THREE.Object3D[] = [];
  const y = IDLER.y;
  const hw = WHEEL.w / 2;
  ps.push(part(g.idlerRim, P.paint, { p: [TX, y, zI] }));
  for (const s of [1, -1]) {
    ps.push(part(g.idlerDisc, P.paint, { p: [TX + s * (hw - 0.03), y, zI] }));
    ps.push(part(g.idlerCone, P.paint, { p: [TX + s * (hw - 0.03), y, zI], s: [s * -1, 1, 1] }));
  }
  ps.push(part(G.cyl(0.06, 0.06, WHEEL.w - 0.04, 24), P.cast, { p: [TX, y, zI], r: [0, 0, 90] }));
  ps.push(part(latheX([[0.0, 0.0], [0.07, 0.0], [0.07, 0.02], [0.058, 0.035], [0.0, 0.04]], 28, 40), P.cast, { p: [TX + hw - 0.035, y, zI] }));
  ps.push(part(G.scatter(nut(0.016, 0.007), boltRingX(0.05, 6, TX + hw + 0.0, 1)), P.cast, { p: [0, y, zI] }));
  // idler spindle, bracket arm to the hull and the track adjusting link
  const xh = H.xLow;
  ps.push(part(G.cyl(0.045, 0.045, TX - hw - xh + 0.04, 18), P.cast, { p: [(TX - hw + xh) / 2, y, zI], r: [0, 0, 90] }));
  const arm = hullOutline([
    { c: [0, y], r: 0.085 },
    { c: [0.28, y + 0.06], r: 0.07 },
  ], 10);
  ps.push(part(prism(arm, 0.045, 'zy', 0.008), P.cast, { p: [xh + 0.06, 0, zI] }));
  // bracket casting on the hull side
  const br = prism(
    [
      [0.12, y - 0.12],
      [0.42, y - 0.1],
      [0.46, y + 0.18],
      [0.14, y + 0.2],
    ],
    0.04,
    'zy',
    0.008,
  );
  ps.push(part(br, P.cast, { p: [xh + 0.02, 0, zI] }));
  ps.push(part(G.scatter(nut(0.026, 0.011), [[0.17, y - 0.07], [0.39, y - 0.06], [0.42, y + 0.14], [0.18, y + 0.15], [0.3, y + 0.16]].map(([bz, by]) => ({ p: [xh + 0.04, by, zI + bz] as G.V3, n: [1, 0, 0] as G.V3 }))), P.cast));
  ps.push(part(G.cyl(0.06, 0.06, 0.1, 22), P.cast, { p: [xh + 0.08, y + 0.06, zI + 0.28], r: [0, 0, 90] }));
  // adjusting screw with its lock nut, running forward along the hull side
  ps.push(part(G.rod([xh + 0.06, y + 0.06, zI + 0.34], [xh + 0.06, y + 0.07, zI + 0.62], 0.02, 10), P.toolSteel));
  ps.push(part(nut(0.05, 0.03), P.toolSteel, { p: [xh + 0.06, y + 0.068, zI + 0.56], r: [90, 0, 0] }));
  ps.push(part(rb(0.06, 0.09, 0.07, 0.01), P.cast, { p: [xh + 0.045, y + 0.07, zI + 0.66] }));
  return group(ps);
}

/* ------------------------------------------------------------------ track */
function track(P: Pal): THREE.Group {
  const g = geos();
  const lay = trackLayout();
  const sm = shoeMatrices(lay, TX);
  const cm = connectorMatrices(lay, TX);
  const a = new THREE.InstancedMesh(g.shoeRubber, P.rubber, sm.length);
  const b = new THREE.InstancedMesh(g.shoeSteel, P.track, sm.length);
  const c = new THREE.InstancedMesh(g.connSteel, P.track, cm.length);
  sm.forEach((m, i) => {
    a.setMatrixAt(i, m);
    b.setMatrixAt(i, m);
  });
  cm.forEach((m, i) => {
    c.setMatrixAt(i, m);
  });
  return group([a, b, c]);
}

/** Complete running gear for both sides. */
export function runningGear(P: Pal): THREE.Group {
  const lay = trackLayout();
  const left: THREE.Object3D[] = [];
  BOGIE.z.forEach((zb, i) => left.push(bogie(P, zb, i * 37)));
  left.push(sprocket(P, lay.sprocketPhase));
  left.push(idler(P, lay.idlerZ));
  left.push(track(P));
  return mirrorX(group(left));
}

