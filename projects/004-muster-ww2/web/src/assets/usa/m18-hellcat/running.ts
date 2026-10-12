/**
 * Running gear of the M18 (built for the left side, mirrored for the right): five dual rubber-tyred
 * road wheels on trailing torsion-bar arms (hydraulic shock absorbers on the outer stations), four dual
 * return rollers on brackets, the toothed front drive sprocket on its final drive, the toothed rear
 * idler on its adjusting crank, and the individually modelled T69 track.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Pal } from './palette';
import { TRACK, WHEEL, ARM, ROLLER, SPROCKET, IDLER, H } from './dims';
import { trackLayout, shoeGeometry, pinGeometry, shoeMatrices, pinMatrices } from './track';
import { latheX, boltRingX, hullOutline, nut, rb, prism, circlePts, type P2 } from './util';

const TX = TRACK.x;
const DU = TRACK.dual;

/* ------------------------------------------------------------------ geometry cache */
let cache: Record<string, THREE.BufferGeometry> | null = null;
function geos() {
  if (cache) return cache;
  const c: Record<string, THREE.BufferGeometry> = {};
  const hw = WHEEL.w / 2;
  const R = WHEEL.r;
  // one tyre of the dual wheel, axis X, centred
  c.tyre = latheX(
    [
      [0.272, -hw],
      [0.3, -hw],
      [0.314, -hw + 0.006],
      [R - 0.002, -hw + 0.02],
      [R, -hw + 0.034],
      [R, hw - 0.034],
      [R - 0.002, hw - 0.02],
      [0.314, hw - 0.006],
      [0.3, hw],
      [0.272, hw],
    ],
    40,
    50,
  );
  // pressed steel rim with rolled lips, then the dished disc on the +X face
  c.disc = latheX(
    [
      [0.262, -hw - 0.002],
      [0.279, -hw - 0.004],
      [0.28, -hw + 0.004],
      [0.271, -hw + 0.01],
      [0.271, hw - 0.01],
      [0.28, hw - 0.004],
      [0.279, hw + 0.004],
      [0.262, hw + 0.002],
      [0.235, hw - 0.004],
      [0.19, hw + 0.004],
      [0.15, hw + 0.012],
      [0.118, hw + 0.016],
      [0.1, hw + 0.012],
      [0.082, hw + 0.018],
      [0.07, hw + 0.02],
    ],
    40,
    32,
  );
  // plain inner dish (mostly hidden)
  c.discIn = latheX(
    [
      [0.07, -hw + 0.03],
      [0.13, -hw + 0.02],
      [0.2, -hw + 0.008],
      [0.262, -hw - 0.002],
    ],
    32,
    35,
  );
  // hub cap and bolts (outer wheel only)
  c.hub = latheX(
    [
      [0.0, hw + 0.01],
      [0.075, hw + 0.01],
      [0.075, hw + 0.03],
      [0.062, hw + 0.042],
      [0.03, hw + 0.05],
      [0.0, hw + 0.052],
    ],
    28,
    35,
  );
  c.wheelBolts = G.scatter(nut(0.02, 0.008), boltRingX(0.092, 8, hw + 0.018, 1, Math.PI / 8));
  // return roller half: narrow rubber-tyred roller, axis X
  const rw = ROLLER.w / 2;
  c.roller = latheX(
    [
      [0.02, -rw],
      [0.05, -rw],
      [0.058, -rw + 0.004],
      [ROLLER.r, -rw + 0.01],
      [ROLLER.r, rw - 0.01],
      [0.058, rw - 0.004],
      [0.05, rw],
      [0.02, rw],
    ],
    28,
    40,
  );
  c.rollerHub = latheX([[0.048, -rw - 0.002], [0.052, -rw - 0.002], [0.052, rw + 0.002], [0.048, rw + 0.002]], 24, 40);
  // track
  c.shoe = shoeGeometry();
  c.pin = pinGeometry();
  cache = c;
  return c;
}

/* ------------------------------------------------------------------ road wheel */
function dualWheel(P: Pal, spin: number): THREE.Group {
  const g = geos();
  const half = (s: 1 | -1) =>
    group(
      [
        part(g.tyre, P.rubber),
        part(g.disc, P.paint),
        part(g.discIn, P.paint),
      ],
      { p: [s * DU, 0, 0], s: [s, 1, 1] },
    );
  const wheel = group(
    [
      half(1),
      half(-1),
      // hub drum joining the two halves, outer cap and wheel nuts
      part(G.cyl(0.07, 0.07, 2 * DU - WHEEL.w + 0.03, 24), P.cast, { r: [0, 0, 90] }),
      part(g.hub, P.cast, { p: [DU, 0, 0] }),
      part(g.wheelBolts, P.cast, { p: [DU, 0, 0] }),
    ],
    { r: [spin, 0, 0] },
  );
  wheel.userData.campMotion = { kind: 'wheel', radius: WHEEL.r, pivot: [0, 0, 0] };
  return wheel;
}

/* ------------------------------------------------------------------ one suspension station */
function station(P: Pal, i: number): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const zw = WHEEL.z[i], yw = WHEEL.y;
  const zp = zw + ARM.dz, yp = yw + ARM.dy;
  const xh = H.xLow;
  // torsion bar anchor boss on the hull side and bolted retainer
  ps.push(part(G.cyl(0.085, 0.09, 0.04, 26), P.cast, { p: [xh + 0.02, yp, zp], r: [0, 0, 90] }));
  ps.push(part(G.scatter(nut(0.022, 0.009), boltRingX(0.068, 6, xh + 0.04, 1, 0.3)), P.cast, { p: [0, yp, zp] }));
  // trailing arm (cast), pivot boss and spindle boss
  const arm = hullOutline([{ c: [zp, yp], r: 0.066 }, { c: [zw, yw], r: 0.075 }], 10);
  ps.push(part(prism(arm, 0.05, 'zy', 0.01), P.cast, { p: [ARM.x, 0, 0] }));
  ps.push(part(G.cyl(0.06, 0.06, 0.07, 22), P.cast, { p: [ARM.x + 0.005, yp, zp], r: [0, 0, 90] }));
  ps.push(part(nut(0.05, 0.02), P.cast, { p: [ARM.x + 0.03, yp, zp], r: [0, 0, -90] }));
  // stiffening rib along the arm
  ps.push(part(G.rod([ARM.x + 0.028, yp - 0.01, zp - 0.04], [ARM.x + 0.028, yw + 0.02, zw + 0.05], 0.014, 8), P.cast));
  // spindle from the arm into the hub
  ps.push(part(G.cyl(0.045, 0.045, TX - ARM.x, 18), P.toolSteel, { p: [(TX + ARM.x) / 2, yw, zw], r: [0, 0, 90] }));
  // bump stop bracket on the hull side above the arm
  ps.push(part(rb(0.07, 0.07, 0.11, 0.01), P.cast, { p: [xh + 0.035, yw + 0.3, zw + 0.12] }));
  ps.push(part(G.cyl(0.03, 0.03, 0.03, 14), P.rubber, { p: [xh + 0.05, yw + 0.25, zw + 0.12] }));
  // the dual road wheel
  ps.push(group([dualWheel(P, i * 23)], { p: [TX, yw, zw] }));
  // shock absorbers on the two front and two rear stations
  if (i !== 2) {
    const s = i < 2 ? 1 : -1;
    const a = new THREE.Vector3(ARM.x - 0.045, yw + 0.1, zw + 0.12);
    const b = new THREE.Vector3(xh + 0.05, 0.93, zw + 0.12 + s * 0.2);
    const mid = a.clone().lerp(b, 0.5);
    ps.push(part(G.rod(a, mid.clone().lerp(b, 0.15), 0.028, 12), P.cast));
    ps.push(part(G.rod(mid.clone().lerp(a, 0.1), b, 0.018, 10), P.toolSteel));
    ps.push(part(G.cyl(0.03, 0.03, 0.05, 12), P.cast, { p: [a.x, a.y, a.z], r: [0, 0, 90] }));
    ps.push(part(rb(0.05, 0.05, 0.08, 0.008), P.cast, { p: [xh + 0.025, b.y, b.z] }));
  }
  return group(ps);
}

/* ------------------------------------------------------------------ return rollers */
function returnRoller(P: Pal, z: number): THREE.Group {
  const g = geos();
  const ps: THREE.Object3D[] = [];
  const y = ROLLER.y;
  const xh = H.xLow;
  for (const s of [1, -1]) ps.push(part(g.roller, P.rubber, { p: [TX + s * 0.074, y, z] }), part(g.rollerHub, P.paint, { p: [TX + s * 0.074, y, z] }));
  ps.push(part(G.cyl(0.05, 0.05, 0.075, 18), P.paint, { p: [TX, y, z], r: [0, 0, 90] }));
  ps.push(part(G.cyl(0.022, 0.022, TX + 0.12 - xh, 12), P.toolSteel, { p: [(TX + 0.12 + xh) / 2, y, z], r: [0, 0, 90] }));
  ps.push(part(latheX([[0.0, 0.0], [0.045, 0.0], [0.045, 0.015], [0.035, 0.024], [0.0, 0.026]], 18, 40), P.cast, { p: [TX + 0.112, y, z] }));
  // bracket: a cast arm from a pad on the hull side
  const br = hullOutline([{ c: [0, y], r: 0.045 }, { c: [0.02, y + 0.1], r: 0.06 }], 8);
  ps.push(part(prism(br, 0.05, 'zy', 0.008), P.cast, { p: [xh + 0.045, 0, z] }));
  ps.push(part(rb(0.03, 0.2, 0.16, 0.008), P.cast, { p: [xh + 0.015, y + 0.07, z + 0.01] }));
  ps.push(part(G.scatter(nut(0.02, 0.008), [[-0.05, 0.13], [0.07, 0.13], [-0.05, 0.0], [0.07, 0.0]].map(([dz, dy]) => ({ p: [xh + 0.03, y + dy, z + dz] as G.V3, n: [1, 0, 0] as G.V3 }))), P.cast));
  return group(ps);
}

/* ------------------------------------------------------------------ toothed wheels */
function toothOutline(teeth: number, rootR: number, tipR: number): P2[] {
  const pts: P2[] = [];
  const pa = (Math.PI * 2) / teeth;
  const add = (a: number, r: number) => pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  for (let i = 0; i < teeth; i++) {
    const a = i * pa;
    add(a - pa / 2, rootR);
    add(a - pa * 0.34, rootR + 0.006);
    add(a - pa * 0.25, rootR + 0.03);
    add(a - pa * 0.17, (rootR + tipR) / 2 + 0.012);
    add(a - pa * 0.09, tipR - 0.008);
    add(a - pa * 0.03, tipR);
    add(a + pa * 0.03, tipR);
    add(a + pa * 0.09, tipR - 0.008);
    add(a + pa * 0.17, (rootR + tipR) / 2 + 0.012);
    add(a + pa * 0.25, rootR + 0.03);
    add(a + pa * 0.34, rootR + 0.006);
  }
  return pts;
}

function toothRing(teeth: number, rootR: number, tipR: number, holeR: number, t: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const o = toothOutline(teeth, rootR, tipR);
  shape.moveTo(o[0][0], o[0][1]);
  for (const p of o.slice(1)) shape.lineTo(p[0], p[1]);
  shape.closePath();
  const hole = new THREE.Path();
  const hc = circlePts(holeR, 40, 0, 0, true);
  hole.moveTo(hc[0][0], hc[0][1]);
  for (const p of hc.slice(1)) hole.lineTo(p[0], p[1]);
  hole.closePath();
  shape.holes.push(hole);
  const ring = G.extrude(shape, t, 0.004, 1, 1);
  ring.rotateY(Math.PI / 2); // outline x -> -Z, y -> Y ; tooth 0 points to -Z
  return ring;
}

function sprocket(P: Pal, phase: number): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const { z, y, pitchR, teeth } = SPROCKET;
  const ring = toothRing(teeth, pitchR - 0.075, pitchR + 0.004, 0.15, 0.03);
  const rx = 180 - (phase * 180) / Math.PI;
  for (const s of [1, -1]) ps.push(part(ring, P.cast, { p: [TX + s * 0.1, y, z], r: [rx, 0, 0] }));
  // hub drum between the rings, spoked carrier discs and bolt circles
  ps.push(part(G.cyl(0.155, 0.155, 0.2, 40, true), P.cast, { p: [TX, y, z], r: [0, 0, 90] }));
  for (const s of [1, -1]) {
    ps.push(part(latheX([[0.12, -0.012], [0.19, -0.012], [0.19, 0.012], [0.12, 0.012]], 40, 40), P.cast, { p: [TX + s * 0.078, y, z] }));
  }
  ps.push(part(G.scatter(nut(0.02, 0.009), boltRingX(0.17, 12, TX + 0.117, 1, 0.13)), P.cast, { p: [0, y, z] }));
  // outer dish and hub cap
  ps.push(part(latheX([[0.155, 0.0], [0.15, 0.014], [0.12, 0.03], [0.09, 0.034], [0.085, 0.05], [0.06, 0.056], [0.0, 0.058]], 40, 30), P.cast, { p: [TX + 0.114, y, z] }));
  ps.push(part(G.scatter(nut(0.018, 0.008), boltRingX(0.07, 8, TX + 0.114 + 0.056, 1)), P.cast, { p: [0, y, z] }));
  const rotating = group(ps.splice(0));
  rotating.userData.campMotion = { kind: 'wheel', radius: SPROCKET.pitchR, pivot: [TX, y, z] };
  ps.push(rotating);
  // hub to the final drive
  ps.push(part(G.cyl(0.13, 0.13, TX - 0.1 - H.xLow, 32), P.cast, { p: [(TX - 0.1 + H.xLow) / 2, y, z], r: [0, 0, 90] }));
  return group(ps);
}

function idler(P: Pal, zI: number, phase: number): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const y = IDLER.y;
  const pr = IDLER.r + TRACK.inner;
  const ring = toothRing(IDLER.teeth, pr - 0.06, pr + 0.002, 0.12, 0.028);
  const rx = 180 - (phase * 180) / Math.PI;
  for (const s of [1, -1]) ps.push(part(ring, P.cast, { p: [TX + s * 0.1, y, zI], r: [rx, 0, 0] }));
  ps.push(part(G.cyl(0.13, 0.13, 0.2, 36, true), P.cast, { p: [TX, y, zI], r: [0, 0, 90] }));
  for (const s of [1, -1]) ps.push(part(latheX([[0.1, -0.01], [0.16, -0.01], [0.16, 0.01], [0.1, 0.01]], 36, 40), P.cast, { p: [TX + s * 0.075, y, zI] }));
  ps.push(part(latheX([[0.13, 0.0], [0.12, 0.02], [0.07, 0.03], [0.06, 0.045], [0.0, 0.047]], 32, 30), P.cast, { p: [TX + 0.114, y, zI] }));
  ps.push(part(G.scatter(nut(0.018, 0.008), boltRingX(0.1, 8, TX + 0.124, 1)), P.cast, { p: [0, y, zI] }));
  const rotating = group(ps.splice(0));
  rotating.userData.campMotion = { kind: 'wheel', radius: IDLER.r, pivot: [TX, y, zI] };
  ps.push(rotating);
  // spindle to the adjusting crank on the hull side
  const xh = H.xLow;
  ps.push(part(G.cyl(0.045, 0.045, TX - 0.1 - xh, 18), P.cast, { p: [(TX - 0.1 + xh) / 2, y, zI], r: [0, 0, 90] }));
  const crank = hullOutline([{ c: [zI, y], r: 0.075 }, { c: [zI + 0.22, y + 0.08], r: 0.08 }], 10);
  ps.push(part(prism(crank, 0.05, 'zy', 0.01), P.cast, { p: [xh + 0.05, 0, 0] }));
  ps.push(part(G.cyl(0.1, 0.1, 0.05, 26), P.cast, { p: [xh + 0.02, y + 0.08, zI + 0.22], r: [0, 0, 90] }));
  ps.push(part(G.scatter(nut(0.022, 0.009), boltRingX(0.078, 8, xh + 0.045, 1)), P.cast, { p: [0, y + 0.08, zI + 0.22] }));
  return group(ps);
}

/* ------------------------------------------------------------------ track */
function track(P: Pal): THREE.Group {
  const g = geos();
  const lay = trackLayout();
  const sm = shoeMatrices(lay, TX);
  const pm = pinMatrices(lay, TX);
  const a = new THREE.InstancedMesh(g.shoe, P.track, sm.length);
  const b = new THREE.InstancedMesh(g.pin, P.track, pm.length);
  sm.forEach((m, i) => a.setMatrixAt(i, m));
  pm.forEach((m, i) => b.setMatrixAt(i, m));
  const track = group([a, b]);
  track.userData.campMotion = { kind: 'track' };
  return track;
}

/** Complete running gear for both sides. */
export function runningGear(P: Pal): THREE.Group {
  const lay = trackLayout();
  const left: THREE.Object3D[] = [];
  WHEEL.z.forEach((_, i) => left.push(station(P, i)));
  ROLLER.z.forEach((z) => left.push(returnRoller(P, z)));
  left.push(sprocket(P, lay.sprocketPhase));
  left.push(idler(P, lay.idlerZ, lay.idlerPhase));
  left.push(track(P));
  return mirrorX(group(left));
}
