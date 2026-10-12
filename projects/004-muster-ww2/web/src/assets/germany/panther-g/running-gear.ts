/**
 * Running gear of the Panther Ausf. G (built for the left side, mirrored for the right): eight
 * torsion-bar stations per side, each trailing arm carrying a double 860 mm rubber-tyred road
 * wheel in the interleaved Schachtellaufwerk (16 wheels per side): inner pairs on stations
 * 1, 3, 5, 7 and outer pairs on stations 2, 4, 6, 8, the single guide horn of the track running
 * between the two discs of every pair. Front drive sprocket (17 teeth) on its final drive,
 * rear idler on the tensioner crank, and the individually modelled Kgs 64/660/150 track.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Palette } from './materials';
import { TRACK, WHEEL, STATION_Z, PLANE, SPROCKET, IDLER, W } from './dims';
import { trackLayout, linkGeometries, linkMatrices, WINDOW_X } from './track';
import { latheX, boltRingX, hullOutline, nut, circlePts, type V2 } from './util';

// ---------------------------------------------------------------- geometry cache
interface WheelGeos { tyre: THREE.BufferGeometry; disc: THREE.BufferGeometry; rimNuts: THREE.BufferGeometry; hub: THREE.BufferGeometry; hubNuts: THREE.BufferGeometry }
let cache: { hi: WheelGeos; lo: WheelGeos; misc: Record<string, THREE.BufferGeometry> } | null = null;

function wheelGeos(seg: number, full: boolean): WheelGeos {
  const hw = WHEEL.tyreW / 2;
  const R = WHEEL.r;
  const r0 = 0.37;
  const tyre = latheX(
    [
      [r0, -hw + 0.002],
      [R - 0.016, -hw + 0.002],
      [R - 0.006, -hw + 0.008],
      [R - 0.001, -hw + 0.02],
      [R, -0.012],
      [R, 0.012],
      [R - 0.001, hw - 0.02],
      [R - 0.006, hw - 0.008],
      [R - 0.016, hw - 0.002],
      [r0, hw - 0.002],
    ],
    seg,
    60,
  );
  // pressed disc: rim band under the tyre with its bolted retaining ring, dish and hub flange
  const disc = latheX(
    [
      [0.11, -0.03],
      [0.17, -0.024],
      [0.24, -0.016],
      [0.3, -0.026],
      [0.345, -0.04],
      [0.362, -0.048],
      [0.371, -0.05],
      [0.373, -0.046],
      [0.373, 0.046],
      [0.375, 0.048],
      [0.375, 0.054],
      [0.366, 0.056],
      [0.336, 0.056],
      [0.33, 0.05],
      [0.3, 0.036],
      [0.24, 0.018],
      [0.18, 0.01],
      [0.15, 0.012],
      [0.136, 0.018],
      [0.11, 0.02],
      [0.11, -0.03],
    ],
    seg,
    32,
  );
  const rimNuts = full ? G.scatter(nut(0.024, 0.008), boltRingX(0.352, 16, 0.055, 1, Math.PI / 16).map((b) => ({ p: b.p, n: b.n }))) : new THREE.BufferGeometry();
  const hub = full
    ? latheX(
        [
          [0.112, 0.0],
          [0.112, 0.022],
          [0.102, 0.03],
          [0.074, 0.032],
          [0.068, 0.04],
          [0.066, 0.052],
          [0.055, 0.06],
          [0.032, 0.064],
          [0.0, 0.065],
        ],
        Math.max(24, seg - 8),
        35,
      )
    : latheX(
        [
          [0.112, 0.0],
          [0.112, 0.02],
          [0.096, 0.028],
          [0.0, 0.03],
        ],
        Math.max(16, seg - 12),
        35,
      );
  const hubNuts = full
    ? G.scatter(nut(0.02, 0.009), boltRingX(0.09, 10, 0.031, 1, Math.PI / 10).map((b) => ({ p: b.p, n: b.n })))
    : new THREE.BufferGeometry();
  return { tyre, disc, rimNuts, hub, hubNuts };
}

function geos() {
  if (cache) return cache;
  const misc: Record<string, THREE.BufferGeometry> = {};
  const lg = linkGeometries();
  misc.linkSteel = lg.steel;
  misc.linkBright = lg.bright;
  misc.plug = latheX([[0, 0.064], [0.014, 0.064], [0.014, 0.072], [0, 0.072]], 12, 40);
  cache = { hi: wheelGeos(40, true), lo: wheelGeos(26, false), misc };
  return cache;
}

// ---------------------------------------------------------------- road wheels
/** One road wheel disc with tyre; outer face towards +X (face = -1 mirrors it). */
function wheel(pal: Palette, x: number, face: 1 | -1, hi: boolean, spin: number): THREE.Object3D {
  const c = geos();
  const g = hi ? c.hi : c.lo;
  const kids: THREE.Object3D[] = [part(g.tyre, pal.rubber), part(g.disc, pal.paint), part(g.hub, pal.cast)];
  if (hi) {
    kids.push(part(g.rimNuts, pal.paint));
    kids.push(part(g.hubNuts, pal.cast));
    kids.push(part(c.misc.plug, pal.gun));
  }
  return group(kids, { p: [x, 0, 0], s: [face, 1, 1], r: [spin, 0, 0] });
}

const ARM_X = 0.9;
const ARM_T = 0.05;

/** Wheels, spacer and axle of one station (left side), axle along X at (0, 0) of the group. */
function stationWheels(pal: Palette, outer: boolean, spin: number): THREE.Group {
  const xt = TRACK.x;
  const out: THREE.Object3D[] = [];
  const xo = xt + (outer ? PLANE.a : PLANE.b);
  const xi = xt + (outer ? PLANE.c : PLANE.d);
  out.push(wheel(pal, xo, 1, true, spin));
  // the inner disc of an outer pair is seen through the gaps between the outer wheels
  out.push(wheel(pal, xi, outer ? 1 : -1, outer, spin + 17));
  // stub axle from the arm through the inner disc, spacer drum between the two discs
  const x0 = ARM_X + ARM_T / 2, x1 = xo - 0.03;
  out.push(part(G.cyl(0.055, 0.055, x1 - x0, 20), pal.cast, { p: [(x0 + x1) / 2, 0, 0], r: [0, 0, 90] }));
  const s0 = xi + 0.05, s1 = xo - 0.05;
  out.push(part(G.cyl(0.075, 0.075, s1 - s0, 24), pal.cast, { p: [(s0 + s1) / 2, 0, 0], r: [0, 0, 90] }));
  return group(out);
}

// ---------------------------------------------------------------- suspension arm
/** Trailing arm from the torsion bar housing on the hull side to the axle. */
function suspension(pal: Palette, zs: number): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const xs = W.lower;
  const piv: V2 = [0.27, 0.6];
  const axl: V2 = [0, WHEEL.y];
  // torsion bar housing: bolted flange on the hull side
  parts.push(part(G.cyl(0.1, 0.1, 0.024, 26), pal.cast, { p: [xs + 0.012, piv[1], zs + piv[0]], r: [0, 0, 90] }));
  parts.push(part(G.scatter(nut(0.02, 0.008), boltRingX(0.082, 8, 0.024, 1, 0.2).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [xs, piv[1], zs + piv[0]] }));
  // cast arm
  const outline = hullOutline([
    { c: [piv[0], piv[1]], r: 0.068 },
    { c: axl, r: 0.064 },
  ]);
  parts.push(part(G.plate(outline, ARM_T, 'zy', 0.01), pal.cast, { p: [ARM_X, 0, zs] }));
  parts.push(part(G.rod([ARM_X + ARM_T / 2, piv[1] - 0.005, zs + piv[0] - 0.05], [ARM_X + ARM_T / 2, axl[1] + 0.02, zs + 0.05], 0.016, 8), pal.cast));
  parts.push(part(nut(0.042, 0.012), pal.gun, { p: [ARM_X + ARM_T / 2, piv[1], zs + piv[0]], r: [0, 0, -90] }));
  // rubber bump stop on the hull side above the arm
  parts.push(part(G.rbox(0.05, 0.05, 0.09, 0.01, 1), pal.cast, { p: [xs + 0.025, 0.76, zs + 0.12] }));
  parts.push(part(G.rbox(0.04, 0.03, 0.07, 0.008, 1), pal.rubber, { p: [xs + 0.025, 0.725, zs + 0.12] }));
  return group(parts);
}

// ---------------------------------------------------------------- sprocket + final drive
function gearOutline(teeth: number, rootR: number, tipR: number, phase: number): V2[] {
  const pts: V2[] = [];
  const pitchA = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = phase + i * pitchA;
    const hw = 0.26 * pitchA;
    const tw = 0.13 * pitchA;
    const add = (ang: number, r: number) => pts.push([Math.cos(ang) * r, Math.sin(ang) * r]);
    add(a - pitchA / 2, rootR);
    add(a - hw - 0.03, rootR);
    add(a - hw, rootR + 0.015);
    add(a - tw, tipR - 0.006);
    add(a - tw * 0.4, tipR);
    add(a + tw * 0.4, tipR);
    add(a + tw, tipR - 0.006);
    add(a + hw, rootR + 0.015);
    add(a + hw + 0.03, rootR);
  }
  return pts;
}

function sprocket(pal: Palette, phase: number): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const cx = TRACK.x;
  const { z, y, pitchR, teeth } = SPROCKET;
  // final drive housing bolted to the hull side
  parts.push(
    part(
      latheX(
        [
          [0.3, -0.01],
          [0.3, 0.03],
          [0.27, 0.044],
          [0.23, 0.07],
          [0.2, 0.12],
          [0.19, 0.2],
          [0.17, 0.215],
        ],
        44,
        30,
      ),
      pal.cast,
      { p: [W.lower, y, z] },
    ),
  );
  parts.push(part(G.scatter(nut(0.024, 0.011), boltRingX(0.278, 16, 0.032, 1).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [W.lower, y, z] }));
  // two toothed rings either side of the guide horns, the teeth sitting in the link windows
  const ringT = 0.024;
  const shape = G.shape(gearOutline(teeth, pitchR - 0.05, pitchR + 0.008, 0), 0, [circlePts(pitchR - 0.11, 44)]);
  const ring = G.extrude(shape, ringT, 0.003, 4, 1);
  ring.rotateY(Math.PI / 2);
  const rx0 = 180 - (phase * 180) / Math.PI;
  for (const wx of WINDOW_X) parts.push(part(ring, pal.cast, { p: [cx + wx, y, z], r: [rx0, 0, 0] }));
  // carrier drum from the final drive to the rings, web disc between the rings
  const d0 = W.lower + 0.21, d1 = cx + WINDOW_X[1];
  parts.push(part(G.cyl(0.17, 0.17, d1 - d0, 36), pal.cast, { p: [(d0 + d1) / 2, y, z], r: [0, 0, 90] }));
  parts.push(part(G.cyl(pitchR - 0.1, pitchR - 0.1, WINDOW_X[0] - WINDOW_X[1], 44), pal.cast, { p: [cx, y, z], r: [0, 0, 90] }));
  // outer dish with the hub and bolt rings
  const ox = cx + WINDOW_X[0] + ringT / 2;
  parts.push(
    part(
      latheX(
        [
          [pitchR - 0.1, -0.004],
          [pitchR - 0.11, 0.008],
          [0.22, 0.016],
          [0.16, 0.026],
          [0.15, 0.046],
          [0.11, 0.054],
          [0.1, 0.066],
          [0.07, 0.074],
          [0.0, 0.076],
        ],
        44,
        30,
      ),
      pal.cast,
      { p: [ox, y, z] },
    ),
  );
  parts.push(part(G.scatter(nut(0.02, 0.009), boltRingX(0.26, 14, 0.012, 1, 0.1).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [ox, y, z] }));
  parts.push(part(G.scatter(nut(0.02, 0.009), boltRingX(0.128, 10, 0.05, 1).map((b) => ({ p: b.p, n: b.n }))), pal.gun, { p: [ox, y, z] }));
  parts.push(part(nut(0.05, 0.012), pal.gun, { p: [ox + 0.076, y, z], r: [0, 0, -90] }));
  return group(parts);
}

// ---------------------------------------------------------------- idler on its crank
function idlerDisc(): THREE.BufferGeometry {
  // flat disc with eight lightening holes, then dished by displacing along X
  const holes: V2[][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    holes.push(circlePts(0.045, 16, Math.cos(a) * 0.19, Math.sin(a) * 0.19));
  }
  const g = G.extrude(G.shape(circlePts(0.29, 48).reverse(), 0, holes), 0.01, 0.002, 2, 1);
  g.rotateY(Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getY(i), pos.getZ(i));
    const t = Math.min(1, Math.max(0, (r - 0.09) / 0.18));
    pos.setX(i, pos.getX(i) + 0.04 * (1 - t) * (1 - t));
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return G.crease(g, 40);
}

function idler(pal: Palette, zI: number): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const y = IDLER.y;
  const c0 = TRACK.x;
  const R = IDLER.r;
  const disc = idlerDisc();
  const band = latheX(
    [
      [R - 0.045, -0.017],
      [R - 0.006, -0.017],
      [R, -0.011],
      [R, 0.011],
      [R - 0.006, 0.017],
      [R - 0.045, 0.017],
      [R - 0.045, -0.017],
    ],
    48,
    40,
  );
  for (const s of [1, -1]) {
    const x = c0 + s * IDLER.discX;
    parts.push(part(band, pal.paint, { p: [x, y, zI] }));
    parts.push(part(disc, pal.paint, { p: [x + s * 0.008, y, zI], s: [s, 1, 1] }));
  }
  // hub barrel, outer cap and nuts
  parts.push(part(G.cyl(0.085, 0.085, 0.12, 32), pal.cast, { p: [c0, y, zI], r: [0, 0, 90] }));
  parts.push(part(latheX([[0.085, 0.0], [0.085, 0.02], [0.066, 0.036], [0.04, 0.046], [0, 0.048]], 28, 35), pal.cast, { p: [c0 + 0.06, y, zI] }));
  parts.push(part(G.scatter(nut(0.02, 0.009), boltRingX(0.07, 6, 0.08, 1).map((b) => ({ p: b.p, n: b.n }))), pal.gun, { p: [c0, y, zI] }));
  // crank arm (track tensioner) from the hull side
  const x0 = W.lower;
  parts.push(part(G.cyl(0.065, 0.065, c0 - 0.06 - x0, 24), pal.cast, { p: [(x0 + c0 - 0.06) / 2, y, zI], r: [0, 0, 90] }));
  const crank = hullOutline([
    { c: [0, 0], r: 0.095 },
    { c: [0.2, 0.08], r: 0.08 },
  ]);
  parts.push(part(G.plate(crank, 0.05, 'zy', 0.01), pal.cast, { p: [x0 + 0.04, y, zI] }));
  parts.push(part(G.cyl(0.1, 0.1, 0.03, 28), pal.cast, { p: [x0 + 0.015, y + 0.08, zI + 0.2], r: [0, 0, 90] }));
  parts.push(part(G.scatter(nut(0.02, 0.009), boltRingX(0.078, 6, 0.03, 1).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [x0, y + 0.08, zI + 0.2] }));
  return group(parts);
}

// ---------------------------------------------------------------- track
function track(pal: Palette): THREE.Group {
  const c = geos();
  const layout = trackLayout();
  const mats = linkMatrices(layout, TRACK.x);
  const a = new THREE.InstancedMesh(c.misc.linkSteel, pal.track, mats.length);
  const b = new THREE.InstancedMesh(c.misc.linkBright, pal.bright, mats.length);
  mats.forEach((m, i) => {
    a.setMatrixAt(i, m);
    b.setMatrixAt(i, m);
  });
  return group([a, b]);
}

/** Complete running gear for both sides. */
export function runningGear(pal: Palette, only?: string): THREE.Group {
  const layout = trackLayout();
  const left: THREE.Object3D[] = [];
  const want = (k: string) => !only || only === k || only === 'running';
  for (let i = 0; i < STATION_Z.length; i++) {
    const zs = STATION_Z[i];
    if (want('suspension')) left.push(suspension(pal, zs));
    if (want('wheels')) left.push(group([stationWheels(pal, i % 2 === 1, i * 37)], { p: [0, WHEEL.y, zs] }));
  }
  if (want('sprocket')) left.push(sprocket(pal, layout.sprocketPhase));
  if (want('idler')) left.push(idler(pal, layout.idlerZ));
  if (want('track')) left.push(track(pal));
  return mirrorX(group(left));
}

export { trackLayout };
