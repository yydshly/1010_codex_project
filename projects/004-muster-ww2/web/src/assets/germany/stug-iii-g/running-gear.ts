/**
 * Running gear of the StuG III Ausf. G (Panzer III chassis), built for the left side and
 * mirrored: six twin rubber-tyred road wheels on trailing torsion bar arms, hydraulic shock
 * absorbers on the first and last stations, three twin return rollers, front drive sprocket on
 * its final drive housing, rear disc idler on its tensioner crank, and the individually modelled
 * track.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Palette } from './materials';
import { TRACK, WHEEL, WHEEL_Z, ARM, RETURN_ROLLER, SPROCKET, IDLER, W } from './dims';
import { trackLayout, linkGeometries, linkMatrices } from './track';
import { latheX, boltRingX, hullOutline, nut, rb, circlePts, type V2 } from './util';

const K = WHEEL.r / 0.235; // road wheel profiles drawn for a 470 mm wheel, scaled radially
const sr = (p: V2[], k = K): V2[] => p.map(([r, a]) => [r * k, a]);

// ---------------------------------------------------------------- geometry cache
let geoCache: Record<string, THREE.BufferGeometry> | null = null;
function geos() {
  if (geoCache) return geoCache;
  const c: Record<string, THREE.BufferGeometry> = {};
  const hw = WHEEL.tyreW / 2;
  c.tyre = latheX(
    [
      [0.196 * K, -hw],
      [0.221 * K, -hw],
      [0.23 * K, -hw + 0.003],
      [0.2345 * K, -hw + 0.011],
      [0.235 * K, -0.02],
      [0.235 * K, 0.02],
      [0.2345 * K, hw - 0.011],
      [0.23 * K, hw - 0.003],
      [0.221 * K, hw],
      [0.196 * K, hw],
    ],
    40,
    60,
  );
  c.disc = latheX(
    sr([
      [0.074, -0.034],
      [0.15, -0.038],
      [0.188, -0.046],
      [0.205, -0.049],
      [0.207, -0.045],
      [0.197, -0.043],
      [0.197, 0.043],
      [0.207, 0.045],
      [0.205, 0.049],
      [0.188, 0.047],
      [0.17, 0.035],
      [0.146, 0.028],
      [0.134, 0.035],
      [0.118, 0.035],
      [0.104, 0.027],
      [0.082, 0.029],
      [0.077, 0.04],
      [0.07, 0.042],
      [0.074, -0.034],
    ]),
    40,
    35,
  );
  c.hub = latheX(
    [
      [0.074, 0.02],
      [0.074, 0.05],
      [0.069, 0.057],
      [0.052, 0.059],
      [0.05, 0.074],
      [0.043, 0.083],
      [0.023, 0.088],
      [0.0, 0.089],
    ],
    32,
    35,
  );
  c.hubInner = latheX(
    [
      [0.073, 0.02],
      [0.073, 0.05],
      [0.062, 0.056],
      [0.0, 0.057],
    ],
    28,
    35,
  );
  c.wheelNuts = G.scatter(nut(0.019, 0.009), boltRingX(0.094, 8, 0.032, 1, Math.PI / 8).map((b) => ({ p: b.p, n: b.n })));
  c.hubNut = nut(0.024, 0.008);
  // return roller (one disc)
  const rk = RETURN_ROLLER.r / 0.125;
  c.rrTyre = latheX(
    sr(
      [
        [0.1, -0.024],
        [0.119, -0.024],
        [0.1245, -0.018],
        [0.125, -0.008],
        [0.125, 0.008],
        [0.1245, 0.018],
        [0.119, 0.024],
        [0.1, 0.024],
      ],
      rk,
    ),
    32,
    60,
  );
  c.rrDisc = latheX(
    sr(
      [
        [0.04, -0.02],
        [0.09, -0.024],
        [0.106, -0.027],
        [0.108, -0.023],
        [0.101, -0.022],
        [0.101, 0.022],
        [0.108, 0.023],
        [0.106, 0.027],
        [0.09, 0.022],
        [0.06, 0.017],
        [0.045, 0.024],
        [0.04, -0.02],
      ],
      rk,
    ),
    32,
    35,
  );
  c.rrCap = latheX(
    [
      [0.045, 0.0],
      [0.045, 0.02],
      [0.038, 0.03],
      [0.02, 0.034],
      [0.0, 0.035],
    ],
    24,
    35,
  );
  // idler: running band on each disc
  const ir = IDLER.r;
  c.idlerBand = latheX(
    [
      [ir - 0.03, -0.028],
      [ir - 0.004, -0.028],
      [ir, -0.024],
      [ir, 0.024],
      [ir - 0.004, 0.028],
      [ir - 0.03, 0.028],
      [ir - 0.03, -0.028],
    ],
    48,
    40,
  );
  // idler disc with eight lightening holes
  const holes: V2[][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    holes.push(circlePts(0.05, 16).map(([x, y]) => [x + Math.cos(a) * 0.165, y + Math.sin(a) * 0.165] as V2));
  }
  const discPts: V2[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    discPts.push([Math.cos(a) * (ir - 0.02), Math.sin(a) * (ir - 0.02)]);
  }
  const idlerDisc = G.extrude(G.shape(discPts, 0, holes), 0.012, 0.002, 12, 1);
  idlerDisc.rotateY(Math.PI / 2);
  c.idlerDisc = idlerDisc;
  // link
  const lg = linkGeometries();
  c.linkSteel = lg.steel;
  c.linkBright = lg.bright;
  geoCache = c;
  return c;
}

// ---------------------------------------------------------------- road wheels
/** Twin road wheel centred on its axle, axis along X; outer disc towards +X. */
function roadWheelPair(pal: Palette, spin: number): THREE.Group {
  const g = geos();
  const off = WHEEL.gap / 2 + WHEEL.tyreW / 2;
  const outer = group(
    [
      part(g.tyre, pal.rubber),
      part(g.disc, pal.paint),
      part(g.hub, pal.cast),
      part(g.wheelNuts, pal.cast),
      part(g.hubNut, pal.gun, { p: [0.089, 0, 0], r: [0, 0, -90] }),
    ],
    { p: [off, 0, 0], r: [spin, 0, 0] },
  );
  const inner = group([part(g.tyre, pal.rubber), part(g.disc, pal.paint), part(g.hubInner, pal.cast)], { p: [-off, 0, 0], s: [-1, 1, 1] });
  const drum = part(G.cyl(0.078, 0.078, 2 * off - 0.06, 28), pal.cast, { r: [0, 0, 90] });
  return group([outer, inner, drum]);
}

/** A single road wheel disc (for the spare wheels carried on the hull). */
export function spareWheel(pal: Palette): THREE.Group {
  const g = geos();
  return group([part(g.tyre, pal.rubber), part(g.disc, pal.paint), part(g.hub, pal.cast), part(g.wheelNuts, pal.cast)]);
}

// ---------------------------------------------------------------- torsion bar station
function station(pal: Palette, zw: number, damper: boolean): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const xs = W.lower;
  const armX = 1.035, armT = 0.05;
  const piv: V2 = [zw + ARM.dz, ARM.y];
  const axl: V2 = [zw, WHEEL.y];
  // cast torsion bar bearing housing bolted to the hull side
  parts.push(part(G.cyl(0.085, 0.09, 0.04, 28), pal.cast, { p: [xs + 0.02, piv[1], piv[0]], r: [0, 0, 90] }));
  parts.push(part(G.scatter(nut(0.02, 0.009), boltRingX(0.07, 6, 0.04, 1, 0.3).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [xs, piv[1], piv[0]] }));
  // trailing swing arm
  const outline = hullOutline([
    { c: [piv[0], piv[1]], r: 0.068 },
    { c: [axl[0], axl[1]], r: 0.058 },
  ]);
  parts.push(part(G.plate(outline, armT, 'zy', 0.01), pal.cast, { p: [armX, 0, 0] }));
  parts.push(part(G.cyl(0.05, 0.05, 0.03, 20), pal.cast, { p: [armX + armT / 2 + 0.012, piv[1], piv[0]], r: [0, 0, 90] }));
  parts.push(part(nut(0.032, 0.012), pal.gun, { p: [armX + armT / 2 + 0.026, piv[1], piv[0]], r: [0, 0, -90] }));
  // axle stub into the wheel hub
  parts.push(part(G.cyl(0.05, 0.05, 0.12, 20), pal.cast, { p: [armX + 0.07, axl[1], axl[0]], r: [0, 0, 90] }));
  // rubber bump stop above the arm
  parts.push(part(rb(0.06, 0.05, 0.08, 0.01), pal.cast, { p: [xs + 0.03, 0.66, zw + 0.12] }));
  parts.push(part(rb(0.05, 0.04, 0.065, 0.01), pal.rubber, { p: [xs + 0.04, 0.62, zw + 0.12] }));
  if (damper) {
    // hydraulic shock absorber from a hull bracket to the arm
    const top = new THREE.Vector3(xs + 0.04, 0.9, zw - 0.02);
    const bot = new THREE.Vector3(armX - 0.04, 0.42, zw + 0.12);
    const mid = top.clone().lerp(bot, 0.45);
    parts.push(part(G.rod(top, mid, 0.034, 16), pal.cast));
    parts.push(part(G.rod(mid, bot, 0.017, 12), pal.bright));
    parts.push(part(rb(0.06, 0.05, 0.08, 0.01), pal.cast, { p: [top.x - 0.005, top.y + 0.02, top.z] }));
    parts.push(part(G.cyl(0.03, 0.03, 0.05, 16), pal.cast, { p: [bot.x, bot.y, bot.z], r: [0, 0, 90] }));
  }
  return group(parts);
}

// ---------------------------------------------------------------- return roller
function returnRoller(pal: Palette, z: number): THREE.Group {
  const g = geos();
  const y = RETURN_ROLLER.y;
  const cx = TRACK.x;
  const off = 0.058;
  const parts: THREE.Object3D[] = [];
  for (const s of [1, -1]) {
    parts.push(group([part(g.rrTyre, pal.rubber), part(g.rrDisc, pal.paint)], { p: [cx + s * off, y, z], s: [s, 1, 1] }));
  }
  parts.push(part(g.rrCap, pal.cast, { p: [cx + off + 0.02, y, z] }));
  parts.push(part(nut(0.016, 0.006), pal.gun, { p: [cx + off + 0.055, y, z], r: [0, 0, -90] }));
  parts.push(part(G.cyl(0.04, 0.04, 2 * off - 0.02, 20), pal.cast, { p: [cx, y, z], r: [0, 0, 90] }));
  // cast bracket and stub axle from the hull side
  const x0 = W.lower, x1 = cx - off - 0.03;
  parts.push(part(G.plate([[-0.09, -0.07], [0.09, -0.07], [0.06, 0.07], [-0.06, 0.07]], 0.03, 'zy', 0.006, 0.012), pal.cast, { p: [x0 + 0.015, y, z] }));
  parts.push(part(G.rod([x0 + 0.02, y - 0.005, z], [x1, y, z], 0.045, 18, 0.036), pal.cast));
  parts.push(
    part(G.scatter(nut(0.018, 0.008), [[-0.07, -0.05], [0.07, -0.05], [-0.045, 0.05], [0.045, 0.05]].map(([bz, by]) => ({ p: [x0 + 0.03, y + by, z + bz] as G.V3, n: [1, 0, 0] as G.V3 }))), pal.cast),
  );
  return group(parts);
}

// ---------------------------------------------------------------- sprocket + final drive
function gearOutline(teeth: number, rootR: number, tipR: number, phase: number): V2[] {
  const pts: V2[] = [];
  const pitchA = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = phase + i * pitchA;
    const hw = 0.3 * pitchA;
    const tw = 0.16 * pitchA;
    const add = (ang: number, r: number) => pts.push([Math.cos(ang) * r, Math.sin(ang) * r]);
    add(a - pitchA / 2, rootR);
    add(a - hw - 0.02, rootR);
    add(a - hw, rootR + 0.012);
    add(a - tw, tipR - 0.004);
    add(a - tw * 0.4, tipR);
    add(a + tw * 0.4, tipR);
    add(a + tw, tipR - 0.004);
    add(a + hw, rootR + 0.012);
    add(a + hw + 0.02, rootR);
  }
  return pts;
}

function sprocket(pal: Palette, phase: number): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const cx = TRACK.x;
  const { z, y, pitchR } = SPROCKET;
  // final drive housing on the hull nose
  parts.push(
    part(
      latheX(
        [
          [0.26, -0.01],
          [0.26, 0.02],
          [0.23, 0.035],
          [0.195, 0.06],
          [0.17, 0.1],
          [0.16, 0.125],
          [0.15, 0.13],
        ],
        40,
        30,
      ),
      pal.cast,
      { p: [W.lower, y, z] },
    ),
  );
  parts.push(part(G.scatter(nut(0.022, 0.01), boltRingX(0.24, 14, 0.022, 1).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [W.lower, y, z] }));
  // toothed rings either side of the guide horn
  const ringT = 0.024;
  const shape = G.shape(gearOutline(SPROCKET.teeth, pitchR - 0.032, pitchR + 0.006, 0), 0, [circlePts(pitchR - 0.1, 40)]);
  const ring = G.extrude(shape, ringT, 0.003, 4, 1);
  ring.rotateY(Math.PI / 2);
  const rx0 = 180 - (phase * 180) / Math.PI;
  parts.push(part(ring, pal.cast, { p: [cx - 0.039, y, z], r: [rx0, 0, 0] }));
  parts.push(part(ring, pal.cast, { p: [cx + 0.039, y, z], r: [rx0, 0, 0] }));
  // carrier: inner cone, drum between the rings, outer dish and hub
  parts.push(part(latheX([[0.15, -0.1], [0.2, -0.082], [0.25, -0.058], [0.255, -0.05]], 40, 30), pal.cast, { p: [cx, y, z] }));
  parts.push(part(G.cyl(0.15, 0.15, 0.2, 32, true), pal.cast, { p: [cx - 0.17, y, z], r: [0, 0, 90] }));
  parts.push(part(G.cyl(0.245, 0.245, 0.056, 44), pal.cast, { p: [cx, y, z], r: [0, 0, 90] }));
  parts.push(
    part(
      latheX(
        [
          [0.255, 0.05],
          [0.247, 0.06],
          [0.2, 0.072],
          [0.16, 0.08],
          [0.135, 0.1],
          [0.12, 0.118],
          [0.092, 0.122],
          [0.085, 0.14],
          [0.06, 0.148],
          [0.0, 0.15],
        ],
        40,
        30,
      ),
      pal.cast,
      { p: [cx, y, z] },
    ),
  );
  parts.push(part(G.scatter(nut(0.02, 0.009), boltRingX(0.22, 12, 0.065, 1, 0.1).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [cx, y, z] }));
  parts.push(part(G.scatter(nut(0.018, 0.008), boltRingX(0.105, 8, 0.12, 1).map((b) => ({ p: b.p, n: b.n }))), pal.gun, { p: [cx, y, z] }));
  return group(parts);
}

// ---------------------------------------------------------------- idler on its crank
function idler(pal: Palette, zI: number): THREE.Group {
  const g = geos();
  const parts: THREE.Object3D[] = [];
  const cx = TRACK.x, y = IDLER.y;
  for (const s of [1, -1]) {
    const x = cx + s * 0.085;
    parts.push(part(g.idlerBand, pal.paint, { p: [x, y, zI] }));
    parts.push(part(g.idlerDisc, pal.paint, { p: [x + s * 0.01, y, zI] }));
  }
  parts.push(part(G.cyl(0.09, 0.09, 0.2, 32), pal.paint, { p: [cx, y, zI], r: [0, 0, 90] }));
  parts.push(part(g.rrCap, pal.cast, { p: [cx + 0.1, y, zI], s: [1, 1.5, 1.5] }));
  parts.push(part(G.scatter(nut(0.016, 0.007), boltRingX(0.072, 6, 0.1, 1).map((b) => ({ p: b.p, n: b.n }))), pal.gun, { p: [cx, y, zI] }));
  // tensioner crank and axle to the hull
  const x0 = W.lower;
  parts.push(part(G.cyl(0.07, 0.07, cx - 0.1 - x0, 24), pal.cast, { p: [(x0 + cx - 0.1) / 2, y, zI], r: [0, 0, 90] }));
  const crank = hullOutline([
    { c: [0, 0], r: 0.085 },
    { c: [0.15, 0.1], r: 0.07 },
  ]);
  parts.push(part(G.plate(crank, 0.045, 'zy', 0.008), pal.cast, { p: [x0 + 0.03, y, zI] }));
  parts.push(part(G.cyl(0.085, 0.085, 0.03, 28), pal.cast, { p: [x0 + 0.015, y + 0.1, zI + 0.15], r: [0, 0, 90] }));
  parts.push(part(G.scatter(nut(0.018, 0.008), boltRingX(0.065, 6, 0.03, 1).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [x0, y + 0.1, zI + 0.15] }));
  return group(parts);
}

// ---------------------------------------------------------------- track
function track(pal: Palette): THREE.Group {
  const g = geos();
  const layout = trackLayout();
  const mats = linkMatrices(layout, TRACK.x);
  const a = new THREE.InstancedMesh(g.linkSteel, pal.track, mats.length);
  const b = new THREE.InstancedMesh(g.linkBright, pal.bright, mats.length);
  mats.forEach((m, i) => {
    a.setMatrixAt(i, m);
    b.setMatrixAt(i, m);
  });
  return group([a, b]);
}

/** Complete running gear for both sides. */
export function runningGear(pal: Palette): THREE.Group {
  const layout = trackLayout();
  const left: THREE.Object3D[] = [];
  let spin = 0;
  WHEEL_Z.forEach((zw, i) => {
    left.push(station(pal, zw, i === 0 || i === WHEEL_Z.length - 1));
    left.push(group([roadWheelPair(pal, (spin += 17))], { p: [TRACK.x, WHEEL.y, zw] }));
  });
  for (const z of RETURN_ROLLER.z) left.push(returnRoller(pal, z));
  left.push(sprocket(pal, layout.sprocketPhase));
  left.push(idler(pal, layout.idlerZ));
  left.push(track(pal));
  return mirrorX(group(left));
}

export { trackLayout };
