/**
 * Running gear of the Tiger I (built for the left side, mirrored for the right): eight
 * torsion-bar stations per side, 515 mm apart, each arm carrying three 800 mm rubber-tyred road
 * wheels in the interleaved and overlapping Schachtellaufwerk (24 wheels per side), 12-bolt tyre
 * retaining rims (from April 1943), hydraulic shock absorbers on the first and last arm, front
 * drive sprocket with the star-pattern hub on its final drive, rear 700 mm idler on the
 * tensioner crank, and the individually modelled 725 mm combat track.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Palette } from './materials';
import { TRACK, WHEEL, STATION_Z, PLANE, SPROCKET, IDLER, W } from './dims';
import { trackLayout, linkGeometries, linkMatrices, WINDOW_X } from './track';
import { latheX, boltRingX, hullOutline, nut, rb, circlePts, type V2 } from './util';

// ---------------------------------------------------------------- geometry cache
interface WheelGeos { tyre: THREE.BufferGeometry; disc: THREE.BufferGeometry; rimNuts: THREE.BufferGeometry; hub: THREE.BufferGeometry; hubNuts: THREE.BufferGeometry }
let cache: { hi: WheelGeos; lo: WheelGeos; misc: Record<string, THREE.BufferGeometry> } | null = null;

function wheelGeos(seg: number, full: boolean): WheelGeos {
  const hw = WHEEL.tyreW / 2;
  const R = WHEEL.r;
  const tyre = latheX(
    [
      [0.338, -hw + 0.002],
      [R - 0.016, -hw + 0.002],
      [R - 0.006, -hw + 0.008],
      [R - 0.001, -hw + 0.02],
      [R, -0.012],
      [R, 0.012],
      [R - 0.001, hw - 0.02],
      [R - 0.006, hw - 0.008],
      [R - 0.016, hw - 0.002],
      [0.338, hw - 0.002],
    ],
    seg,
    60,
  );
  // pressed disc: rim band under the tyre, bolted retaining ring, dish and hub flange
  const disc = latheX(
    [
      [0.1, -0.026],
      [0.15, -0.02],
      [0.21, -0.014],
      [0.27, -0.022],
      [0.312, -0.036],
      [0.33, -0.044],
      [0.339, -0.047],
      [0.341, -0.043],
      [0.341, 0.043],
      [0.343, 0.045],
      [0.343, 0.05],
      [0.334, 0.052],
      [0.304, 0.052],
      [0.298, 0.046],
      [0.27, 0.034],
      [0.21, 0.016],
      [0.16, 0.008],
      [0.14, 0.01],
      [0.128, 0.016],
      [0.1, 0.018],
      [0.1, -0.026],
    ],
    seg,
    32,
  );
  const rimNuts = G.scatter(nut(0.024, 0.008), boltRingX(0.318, 12, 0.051, 1, Math.PI / 12).map((b) => ({ p: b.p, n: b.n })));
  const hub = full
    ? latheX(
        [
          [0.104, 0.0],
          [0.104, 0.02],
          [0.096, 0.028],
          [0.07, 0.03],
          [0.064, 0.036],
          [0.062, 0.048],
          [0.052, 0.056],
          [0.03, 0.06],
          [0.0, 0.061],
        ],
        Math.max(24, seg - 8),
        35,
      )
    : latheX(
        [
          [0.104, 0.0],
          [0.104, 0.02],
          [0.09, 0.028],
          [0.0, 0.03],
        ],
        Math.max(16, seg - 12),
        35,
      );
  const hubNuts = full
    ? G.scatter(nut(0.02, 0.009), boltRingX(0.084, 8, 0.029, 1, Math.PI / 8).map((b) => ({ p: b.p, n: b.n })))
    : new THREE.BufferGeometry();
  return { tyre, disc, rimNuts, hub, hubNuts };
}

function geos() {
  if (cache) return cache;
  const misc: Record<string, THREE.BufferGeometry> = {};
  const lg = linkGeometries();
  misc.linkSteel = lg.steel;
  misc.linkBright = lg.bright;
  misc.plug = latheX([[0, 0.06], [0.012, 0.06], [0.012, 0.067], [0, 0.067]], 12, 40);
  cache = { hi: wheelGeos(40, true), lo: wheelGeos(26, false), misc };
  return cache;
}

// ---------------------------------------------------------------- road wheels
/** One road wheel disc with tyre; outer face towards +X (face = -1 mirrors it). */
function wheel(pal: Palette, x: number, face: 1 | -1, hi: boolean, spin: number): THREE.Object3D {
  const c = geos();
  const g = hi ? c.hi : c.lo;
  const kids: THREE.Object3D[] = [part(g.tyre, pal.rubber), part(g.disc, pal.paint), part(g.rimNuts, pal.paint), part(g.hub, pal.cast)];
  if (hi) {
    kids.push(part(g.hubNuts, pal.cast));
    kids.push(part(c.misc.plug, pal.gun));
  }
  return group(kids, { p: [x, 0, 0], s: [face, 1, 1], r: [spin, 0, 0] });
}

/** Wheels, spacers and axle of one station (left side), axle along X at (0, 0) of the group. */
function stationWheels(pal: Palette, odd: boolean, spin: number): THREE.Group {
  const xt = TRACK.x;
  const out: THREE.Object3D[] = [];
  const armX = 1.0;
  if (odd) {
    out.push(wheel(pal, xt + PLANE.p1, 1, true, spin));
    out.push(wheel(pal, xt + PLANE.p4, 1, false, spin + 11));
    out.push(wheel(pal, xt + PLANE.p5, -1, false, spin + 23));
    // axle tube through the hubs and spacer between the central pair and the outer wheel
    const x0 = armX, x1 = xt + PLANE.p1 - 0.02;
    out.push(part(G.cyl(0.058, 0.058, x1 - x0, 20), pal.cast, { p: [(x0 + x1) / 2, 0, 0], r: [0, 0, 90] }));
    const s0 = xt + PLANE.p4 + 0.05, s1 = xt + PLANE.p1 - 0.05;
    out.push(part(G.cyl(0.085, 0.085, s1 - s0, 24), pal.cast, { p: [(s0 + s1) / 2, 0, 0], r: [0, 0, 90] }));
  } else {
    out.push(wheel(pal, xt + PLANE.p2, 1, true, spin));
    out.push(wheel(pal, xt + PLANE.p3, 1, false, spin + 13));
    out.push(wheel(pal, xt + PLANE.p6, -1, false, spin + 29));
    const x0 = armX, x1 = xt + PLANE.p2 - 0.02;
    out.push(part(G.cyl(0.058, 0.058, x1 - x0, 20), pal.cast, { p: [(x0 + x1) / 2, 0, 0], r: [0, 0, 90] }));
    const s0 = xt + PLANE.p6 + 0.05, s1 = xt + PLANE.p3 - 0.05;
    out.push(part(G.cyl(0.085, 0.085, s1 - s0, 24), pal.cast, { p: [(s0 + s1) / 2, 0, 0], r: [0, 0, 90] }));
  }
  return group(out);
}

// ---------------------------------------------------------------- suspension arm
/** Trailing arm from the torsion bar housing on the hull side to the axle; plus stops/dampers. */
function suspension(pal: Palette, zs: number, damper: 0 | 1 | -1): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const xs = W.lower;
  const piv: V2 = [0.27, 0.575];
  const axl: V2 = [0, WHEEL.y];
  const armX = 0.965, armT = 0.055;
  // torsion bar housing: bolted flange on the hull side
  parts.push(part(G.cyl(0.115, 0.115, 0.03, 28), pal.cast, { p: [xs + 0.015, piv[1], zs + piv[0]], r: [0, 0, 90] }));
  parts.push(part(G.scatter(nut(0.022, 0.009), boltRingX(0.095, 8, 0.03, 1, 0.2).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [xs, piv[1], zs + piv[0]] }));
  // cast arm
  const outline = hullOutline([
    { c: [piv[0], piv[1]], r: 0.075 },
    { c: axl, r: 0.07 },
  ]);
  parts.push(part(G.plate(outline, armT, 'zy', 0.01), pal.cast, { p: [armX, 0, zs] }));
  // web rib on the arm
  parts.push(part(G.rod([armX + armT / 2, piv[1] - 0.01, zs + piv[0] - 0.05], [armX + armT / 2, axl[1] + 0.02, zs + 0.05], 0.018, 8), pal.cast));
  // pivot boss and axle boss
  parts.push(part(G.cyl(0.07, 0.07, 0.035, 24), pal.cast, { p: [armX + armT / 2 + 0.012, piv[1], zs + piv[0]], r: [0, 0, 90] }));
  parts.push(part(nut(0.045, 0.014), pal.gun, { p: [armX + armT / 2 + 0.029, piv[1], zs + piv[0]], r: [0, 0, -90] }));
  // rubber bump stop on the hull side above the arm
  parts.push(part(rb(0.07, 0.05, 0.1, 0.012), pal.cast, { p: [xs + 0.035, 0.74, zs + 0.13] }));
  parts.push(part(rb(0.06, 0.03, 0.08, 0.01), pal.rubber, { p: [xs + 0.035, 0.705, zs + 0.13] }));
  if (damper !== 0) {
    // hydraulic shock absorber from a bracket high on the hull side down to the arm
    const top = new THREE.Vector3(xs + 0.05, 0.98, zs - damper * 0.1);
    const bot = new THREE.Vector3(armX + 0.01, 0.52, zs + 0.13);
    const mid = top.clone().lerp(bot, 0.5);
    parts.push(part(G.rod(top, mid, 0.04, 16), pal.cast));
    parts.push(part(G.rod(mid, bot, 0.02, 12), pal.bright));
    parts.push(part(rb(0.07, 0.06, 0.1, 0.012), pal.cast, { p: [xs + 0.035, top.y + 0.03, top.z] }));
    parts.push(part(G.cyl(0.03, 0.03, 0.06, 16), pal.cast, { p: [bot.x, bot.y, bot.z], r: [0, 0, 90] }));
  }
  return group(parts);
}

// ---------------------------------------------------------------- sprocket + final drive
function gearOutline(teeth: number, rootR: number, tipR: number, phase: number): V2[] {
  const pts: V2[] = [];
  const pitchA = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = phase + i * pitchA;
    const hw = 0.28 * pitchA;
    const tw = 0.14 * pitchA;
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
          [0.3, 0.028],
          [0.27, 0.042],
          [0.23, 0.07],
          [0.205, 0.12],
          [0.195, 0.2],
          [0.18, 0.21],
        ],
        44,
        30,
      ),
      pal.cast,
      { p: [W.lower, y, z] },
    ),
  );
  parts.push(part(G.scatter(nut(0.024, 0.011), boltRingX(0.278, 16, 0.03, 1).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [W.lower, y, z] }));
  // two toothed rings, the teeth sitting in the link windows
  const ringT = 0.03;
  const shape = G.shape(gearOutline(teeth, pitchR - 0.06, pitchR + 0.008, 0), 0, [circlePts(pitchR - 0.12, 44)]);
  const ring = G.extrude(shape, ringT, 0.003, 4, 1);
  ring.rotateY(Math.PI / 2);
  const rx0 = 180 - (phase * 180) / Math.PI;
  for (const wx of WINDOW_X) parts.push(part(ring, pal.cast, { p: [cx + wx, y, z], r: [rx0, 0, 0] }));
  // carrier drum from the final drive, web between the rings
  parts.push(part(G.cyl(0.19, 0.19, cx + WINDOW_X[1] - W.lower - 0.2, 36), pal.cast, { p: [(W.lower + 0.2 + cx + WINDOW_X[1]) / 2, y, z], r: [0, 0, 90] }));
  parts.push(part(G.cyl(0.31, 0.31, WINDOW_X[0] - WINDOW_X[1], 44, true), pal.cast, { p: [cx + PLANE.mid, y, z], r: [0, 0, 90] }));
  parts.push(part(G.cyl(0.25, 0.25, WINDOW_X[0] - WINDOW_X[1], 36), pal.cast, { p: [cx + PLANE.mid, y, z], r: [0, 0, 90] }));
  // outer dish with the star-pattern hub
  const ox = cx + WINDOW_X[0] + ringT / 2;
  parts.push(
    part(
      latheX(
        [
          [0.355, -0.01],
          [0.35, 0.004],
          [0.3, 0.012],
          [0.2, 0.024],
          [0.16, 0.03],
          [0.15, 0.05],
          [0.11, 0.058],
          [0.1, 0.07],
          [0.07, 0.078],
          [0.0, 0.08],
        ],
        44,
        30,
      ),
      pal.cast,
      { p: [ox, y, z] },
    ),
  );
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.1;
    const r0 = 0.155, r1 = 0.32;
    const p0 = new THREE.Vector3(ox + 0.034, y + Math.sin(a) * r0, z + Math.cos(a) * r0);
    const p1 = new THREE.Vector3(ox + 0.012, y + Math.sin(a) * r1, z + Math.cos(a) * r1);
    parts.push(part(G.rod(p0, p1, 0.012, 8), pal.cast));
  }
  parts.push(part(G.scatter(nut(0.022, 0.01), boltRingX(0.3, 16, 0.012, 1, 0.1).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [ox, y, z] }));
  parts.push(part(G.scatter(nut(0.02, 0.009), boltRingX(0.128, 10, 0.062, 1).map((b) => ({ p: b.p, n: b.n }))), pal.gun, { p: [ox, y, z] }));
  parts.push(part(nut(0.05, 0.012), pal.gun, { p: [ox + 0.08, y, z], r: [0, 0, -90] }));
  return group(parts);
}

// ---------------------------------------------------------------- idler on its crank
function idlerDisc(): THREE.BufferGeometry {
  // flat disc with six lightening holes, then dished by displacing along X
  const holes: V2[][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    holes.push(circlePts(0.052, 16, Math.cos(a) * 0.19, Math.sin(a) * 0.19));
  }
  const g = G.extrude(G.shape(circlePts(0.305, 48).reverse(), 0, holes), 0.012, 0.002, 2, 1);
  g.rotateY(Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getY(i), pos.getZ(i));
    const t = Math.min(1, Math.max(0, (r - 0.09) / 0.2));
    pos.setX(i, pos.getX(i) + 0.045 * (1 - t) * (1 - t));
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return G.crease(g, 40);
}

function idler(pal: Palette, zI: number): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const y = IDLER.y;
  const c0 = TRACK.x + PLANE.mid;
  const disc = idlerDisc();
  const band = latheX(
    [
      [0.3, -0.046],
      [0.343, -0.046],
      [0.35, -0.04],
      [0.35, 0.04],
      [0.343, 0.046],
      [0.3, 0.046],
      [0.3, -0.046],
    ],
    48,
    40,
  );
  for (const s of [1, -1]) {
    const x = c0 + s * 0.05;
    parts.push(part(band, pal.paint, { p: [x, y, zI] }));
    parts.push(part(disc, pal.paint, { p: [x + s * 0.012, y, zI], s: [s, 1, 1] }));
  }
  // hub barrel, outer cap and nuts
  parts.push(part(G.cyl(0.09, 0.09, 0.17, 32), pal.cast, { p: [c0, y, zI], r: [0, 0, 90] }));
  parts.push(part(latheX([[0.09, 0.0], [0.09, 0.02], [0.07, 0.04], [0.04, 0.05], [0, 0.052]], 28, 35), pal.cast, { p: [c0 + 0.1, y, zI] }));
  parts.push(part(G.scatter(nut(0.02, 0.009), boltRingX(0.074, 6, 0.1, 1).map((b) => ({ p: b.p, n: b.n }))), pal.gun, { p: [c0, y, zI] }));
  // crank arm (track tensioner) from the hull tail
  const x0 = W.lower;
  parts.push(part(G.cyl(0.07, 0.07, c0 - 0.1 - x0, 24), pal.cast, { p: [(x0 + c0 - 0.1) / 2, y, zI], r: [0, 0, 90] }));
  const crank = hullOutline([
    { c: [0, 0], r: 0.1 },
    { c: [-0.2, 0.08], r: 0.085 },
  ]);
  parts.push(part(G.plate(crank, 0.05, 'zy', 0.01), pal.cast, { p: [x0 + 0.04, y, zI] }));
  parts.push(part(G.cyl(0.1, 0.1, 0.03, 28), pal.cast, { p: [x0 + 0.015, y + 0.08, zI - 0.2], r: [0, 0, 90] }));
  parts.push(part(G.scatter(nut(0.02, 0.009), boltRingX(0.078, 6, 0.03, 1).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [x0, y + 0.08, zI - 0.2] }));
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
    if (want('suspension')) left.push(suspension(pal, zs, i === 0 ? 1 : i === STATION_Z.length - 1 ? -1 : 0));
    if (want('wheels')) left.push(group([stationWheels(pal, i % 2 === 0, i * 37)], { p: [0, WHEEL.y, zs] }));
  }
  if (want('sprocket')) left.push(sprocket(pal, layout.sprocketPhase));
  if (want('idler')) left.push(idler(pal, layout.idlerZ));
  if (want('track')) left.push(track(pal));
  return mirrorX(group(left));
}

export { trackLayout };
