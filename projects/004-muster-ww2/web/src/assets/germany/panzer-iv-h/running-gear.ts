/**
 * Running gear of the Pz.Kpfw. IV Ausf. H (built for the left side, mirrored for the right):
 * 8 twin rubber-tyred road wheels in 4 leaf-sprung bogies, 4 twin rubber-tyred return rollers,
 * front drive sprocket on its final drive housing, rear tubular idler on its crank, and the
 * individually modelled track.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Palette } from './materials';
import { TRACK, WHEEL, BOGIE_Z, BOGIE_HALF, RETURN_ROLLER, SPROCKET, IDLER, W } from './dims';
import { trackLayout, linkGeometries, linkMatrices } from './track';
import { latheX, boltRingX, hullOutline, nut, rb, type V2 } from './util';


// ---------------------------------------------------------------- geometry cache
let geoCache: Record<string, THREE.BufferGeometry> | null = null;
function geos() {
  if (geoCache) return geoCache;
  const c: Record<string, THREE.BufferGeometry> = {};
  // road wheel (one disc, outer face towards +X, centred on its own mid plane)
  c.tyre = latheX(
    [
      [0.196, -0.045],
      [0.221, -0.045],
      [0.23, -0.042],
      [0.2345, -0.034],
      [0.235, -0.02],
      [0.235, 0.02],
      [0.2345, 0.034],
      [0.23, 0.042],
      [0.221, 0.045],
      [0.196, 0.045],
    ],
    36,
    60,
  );
  c.disc = latheX(
    [
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
    ],
    36,
    35,
  );
  c.hub = latheX(
    [
      [0.071, 0.02],
      [0.071, 0.05],
      [0.066, 0.057],
      [0.05, 0.059],
      [0.048, 0.072],
      [0.041, 0.081],
      [0.022, 0.086],
      [0.0, 0.087],
    ],
    32,
    35,
  );
  c.hubInner = latheX(
    [
      [0.07, 0.02],
      [0.07, 0.05],
      [0.06, 0.056],
      [0.0, 0.057],
    ],
    28,
    35,
  );
  c.wheelNuts = G.scatter(nut(0.019, 0.009), boltRingX(0.088, 8, 0.03, 1, Math.PI / 8).map((b) => ({ p: b.p, n: b.n })));
  c.hubNut = nut(0.022, 0.008);
  // return roller (one disc)
  c.rrTyre = latheX(
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
    32,
    60,
  );
  c.rrDisc = latheX(
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
  // idler: running band and tubular rim
  c.idlerBand = latheX(
    [
      [0.282, -0.026],
      [0.296, -0.026],
      [0.3, -0.022],
      [0.3, 0.022],
      [0.296, 0.026],
      [0.282, 0.026],
      [0.282, -0.026],
    ],
    48,
    40,
  );
  const tr = G.torus(0.262, 0.021, 10, 48);
  tr.rotateY(Math.PI / 2);
  c.idlerTube = tr;
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
  const outer = group([
    part(g.tyre, pal.rubber),
    part(g.disc, pal.paint),
    part(g.hub, pal.cast),
    part(g.wheelNuts, pal.cast),
    part(g.hubNut, pal.gun, { p: [0.087, 0, 0], r: [0, 0, -90] }),
  ], { p: [off, 0, 0], r: [spin, 0, 0] });
  const inner = group([part(g.tyre, pal.rubber), part(g.disc, pal.paint), part(g.hubInner, pal.cast)], { p: [-off, 0, 0], s: [-1, 1, 1] });
  // central spacer drum between the discs
  const drum = part(G.cyl(0.074, 0.074, 2 * off - 0.06, 28), pal.cast, { r: [0, 0, 90] });
  return group([outer, inner, drum]);
}

// ---------------------------------------------------------------- bogie
function leaf(z0: number, z1: number, yc: number, curv: number, x: number, w: number, t: number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const nrm: THREE.Vector3[] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const z = z0 + ((z1 - z0) * i) / n;
    const y = yc - curv * z * z;
    pts.push(new THREE.Vector3(x, y, z));
    const slope = -2 * curv * z;
    nrm.push(new THREE.Vector3(0, 1, -slope).normalize());
  }
  return G.strap(pts, w, t, nrm, { smooth: false });
}

function bogie(pal: Palette, zb: number, damper: 0 | 1 | -1): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const xs = W.lower; // hull side outer face
  const armX = 1.022, armT = 0.05;
  // mounting plate bolted to the hull side
  const plateT = 0.03;
  parts.push(
    part(
      G.plate(
        [
          [-0.21, 0.43],
          [0.21, 0.43],
          [0.17, 0.8],
          [-0.17, 0.8],
        ],
        plateT,
        'zy',
        0.006,
        0.02,
      ),
      pal.cast,
      { p: [xs + plateT / 2, 0, zb] },
    ),
  );
  const bolts: { p: V2 }[] = [];
  for (const [bz, by] of [[-0.18, 0.46], [0.18, 0.46], [-0.145, 0.77], [0.145, 0.77], [-0.19, 0.6], [0.19, 0.6]] as V2[]) bolts.push({ p: [bz, by] });
  parts.push(
    part(
      G.scatter(nut(0.026, 0.012), bolts.map((b) => ({ p: [xs + plateT, b.p[1], zb + b.p[0]] as G.V3, n: [1, 0, 0] as G.V3 }))),
      pal.cast,
    ),
  );
  // cast pivot housing and spring tower
  parts.push(part(rb(0.07, 0.13, 0.29, 0.02), pal.cast, { p: [xs + plateT + 0.035, 0.515, zb] }));
  parts.push(part(rb(0.07, 0.2, 0.11, 0.018), pal.cast, { p: [xs + plateT + 0.035, 0.66, zb] }));
  // swing arms (front and rear)
  for (const s of [1, -1]) {
    const piv: V2 = [s * 0.08, 0.5];
    const axl: V2 = [s * BOGIE_HALF, WHEEL.y];
    const rol: V2 = [s * 0.235, 0.6];
    const outline = hullOutline([
      { c: piv, r: 0.058 },
      { c: axl, r: 0.052 },
      { c: rol, r: 0.036 },
    ]);
    parts.push(part(G.plate(outline, armT, 'zy', 0.008), pal.cast, { p: [armX, 0, zb] }));
    // pivot pin boss and nut
    parts.push(part(G.cyl(0.04, 0.04, 0.02, 20), pal.cast, { p: [armX + armT / 2 + 0.01, piv[1], zb + piv[0]], r: [0, 0, 90] }));
    parts.push(part(nut(0.03, 0.012), pal.gun, { p: [armX + armT / 2 + 0.02, piv[1], zb + piv[0]], r: [0, 0, -90] }));
    // spring roller on the arm
    parts.push(part(G.cyl(0.026, 0.026, 0.075, 18), pal.bright, { p: [armX, rol[1], zb + rol[0]], r: [0, 0, 90] }));
    // axle stub into the wheel hub
    parts.push(part(G.cyl(0.045, 0.045, 0.14, 20), pal.cast, { p: [armX + 0.07, axl[1], zb + axl[0]], r: [0, 0, 90] }));
    // rubber bump stop on the housing above the arm
    parts.push(part(rb(0.05, 0.035, 0.06, 0.008), pal.rubber, { p: [xs + plateT + 0.04, 0.6, zb + s * 0.12] }));
    parts.push(part(rb(0.055, 0.03, 0.07, 0.006), pal.cast, { p: [xs + plateT + 0.04, 0.63, zb + s * 0.12] }));
  }
  // semi-elliptic leaf spring pack resting on the arm rollers, clamped at the tower
  const nLeaves = 7;
  const leafT = 0.0085, leafW = 0.066, curv = 0.95;
  const baseY = 0.626 + 0.0 + curv * 0.235 * 0.235; // lowest leaf touches roller tops at z = +/-0.235
  for (let k = 0; k < nLeaves; k++) {
    const half = 0.265 - k * 0.032;
    parts.push(part(leaf(-half, half, baseY + leafT / 2 + k * (leafT + 0.0008), curv, armX, leafW, leafT), pal.track, { p: [0, 0, zb] }));
  }
  const topY = baseY + nLeaves * (leafT + 0.0008);
  // centre clamp: saddle + two U-bolts
  parts.push(part(rb(0.085, 0.03, 0.09, 0.006), pal.cast, { p: [armX, topY + 0.012, zb] }));
  parts.push(part(rb(0.09, 0.03, 0.1, 0.006), pal.cast, { p: [armX, baseY - 0.015, zb] }));
  for (const dz of [-0.035, 0.035]) {
    parts.push(part(G.rod([armX - 0.048, baseY - 0.03, zb + dz], [armX - 0.048, topY + 0.03, zb + dz], 0.007, 8), pal.gun));
    parts.push(part(G.rod([armX + 0.048, baseY - 0.03, zb + dz], [armX + 0.048, topY + 0.03, zb + dz], 0.007, 8), pal.gun));
  }
  // hydraulic shock absorber on the first and last bogie
  if (damper !== 0) {
    const s = damper;
    const top = new THREE.Vector3(xs + 0.035, 0.86, zb + s * 0.2);
    const bot = new THREE.Vector3(armX - 0.04, 0.4, zb + s * 0.2);
    const mid = top.clone().lerp(bot, 0.45);
    parts.push(part(G.rod(top, mid, 0.03, 16), pal.cast));
    parts.push(part(G.rod(mid, bot, 0.016, 12), pal.bright));
    parts.push(part(rb(0.05, 0.05, 0.06, 0.01), pal.cast, { p: [top.x - 0.005, top.y + 0.02, top.z] }));
    parts.push(part(G.cyl(0.028, 0.028, 0.05, 16), pal.cast, { p: [bot.x, bot.y, bot.z], r: [0, 0, 90] }));
  }
  return group(parts);
}

// ---------------------------------------------------------------- return roller
function returnRoller(pal: Palette, z: number): THREE.Group {
  const g = geos();
  const y = RETURN_ROLLER.y;
  const cx = TRACK.x;
  const off = 0.06;
  const parts: THREE.Object3D[] = [];
  for (const s of [1, -1]) {
    parts.push(group([part(g.rrTyre, pal.rubber), part(g.rrDisc, pal.paint)], { p: [cx + s * off, y, z], s: [s, 1, 1] }));
  }
  parts.push(part(g.rrCap, pal.cast, { p: [cx + off + 0.02, y, z] }));
  parts.push(part(nut(0.016, 0.006), pal.gun, { p: [cx + off + 0.055, y, z], r: [0, 0, -90] }));
  parts.push(part(G.cyl(0.04, 0.04, 2 * off - 0.02, 20), pal.cast, { p: [cx, y, z], r: [0, 0, 90] }));
  // cast bracket from the hull side
  const x0 = W.lower, x1 = cx - off - 0.03;
  parts.push(part(G.plate([[-0.09, -0.07], [0.09, -0.07], [0.06, 0.07], [-0.06, 0.07]], 0.03, 'zy', 0.006, 0.012), pal.cast, { p: [x0 + 0.015, y, z] }));
  parts.push(part(G.rod([x0 + 0.02, y - 0.005, z], [x1, y, z], 0.045, 18, 0.036), pal.cast));
  parts.push(part(rb(0.05, 0.07, 0.035, 0.008), pal.cast, { p: [x0 + 0.05, y - 0.05, z], r: [0, 0, 35] }));
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
    const hw = 0.3 * pitchA; // half width at root (angle)
    const tw = 0.16 * pitchA; // half width at tip
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

function circlePts(r: number, n: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = -(i / n) * Math.PI * 2; // clockwise for holes
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
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
          [0.27, -0.01],
          [0.27, 0.02],
          [0.24, 0.035],
          [0.2, 0.06],
          [0.175, 0.1],
          [0.165, 0.125],
          [0.15, 0.13],
        ],
        40,
        30,
      ),
      pal.cast,
      { p: [W.lower, y, z] },
    ),
  );
  parts.push(part(G.scatter(nut(0.022, 0.01), boltRingX(0.25, 14, 0.022, 1).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [W.lower, y, z] }));
  // toothed rings: teeth sit in the link windows beside the guide horn
  const ringT = 0.024;
  const shape = G.shape(gearOutline(18, pitchR - 0.032, pitchR + 0.006, 0), 0, [circlePts(pitchR - 0.1, 40)]);
  const ring = G.extrude(shape, ringT, 0.003, 4, 1);
  ring.rotateY(Math.PI / 2); // XY outline -> ZY plane (thickness along X)
  const lx = cx - 0.039, rx = cx + 0.039;
  const toothRot = (phase * 180) / Math.PI;
  // after rotateY(90): outline x -> -Z, outline y -> Y. A tooth at outline angle 0 points to -Z.
  // Rotating about X by (180 - phase) brings it to the link centre angle measured atan2(y, z).
  const rx0 = 180 - toothRot;
  parts.push(part(ring, pal.cast, { p: [lx, y, z], r: [rx0, 0, 0] }));
  parts.push(part(ring, pal.cast, { p: [rx, y, z], r: [rx0, 0, 0] }));
  // carrier: inner cone from the final drive, drum between the rings, outer dish and hub
  parts.push(
    part(
      latheX(
        [
          [0.15, -0.105],
          [0.2, -0.085],
          [0.255, -0.06],
          [0.26, -0.05],
        ],
        40,
        30,
      ),
      pal.cast,
      { p: [cx, y, z], s: [1, 1, 1] },
    ),
  );
  parts.push(part(G.cyl(0.155, 0.155, 0.2, 32, true), pal.cast, { p: [cx - 0.17, y, z], r: [0, 0, 90] }));
  parts.push(part(G.cyl(0.25, 0.25, 0.056, 44), pal.cast, { p: [cx, y, z], r: [0, 0, 90] }));
  parts.push(
    part(
      latheX(
        [
          [0.26, 0.05],
          [0.252, 0.06],
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
  parts.push(part(G.scatter(nut(0.02, 0.009), boltRingX(0.225, 12, 0.065, 1, 0.1).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [cx, y, z] }));
  parts.push(part(G.scatter(nut(0.018, 0.008), boltRingX(0.105, 8, 0.12, 1).map((b) => ({ p: b.p, n: b.n }))), pal.gun, { p: [cx, y, z] }));
  // radial stiffening ribs on the outer dish
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    const r0 = 0.13, r1 = 0.24;
    const p0 = new THREE.Vector3(cx + 0.105, y + Math.sin(a) * r0, z + Math.cos(a) * r0);
    const p1 = new THREE.Vector3(cx + 0.066, y + Math.sin(a) * r1, z + Math.cos(a) * r1);
    parts.push(part(G.rod(p0, p1, 0.011, 8), pal.cast));
  }
  return group(parts);
}

// ---------------------------------------------------------------- idler on its crank
function idler(pal: Palette, zI: number): THREE.Group {
  const g = geos();
  const parts: THREE.Object3D[] = [];
  const cx = TRACK.x, y = IDLER.y;
  for (const s of [1, -1]) {
    const x = cx + s * 0.1;
    parts.push(part(g.idlerBand, pal.paint, { p: [x, y, zI] }));
    parts.push(part(g.idlerTube, pal.paint, { p: [x, y, zI] }));
    // eight tubular spokes, slightly dished towards the hub
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + (s > 0 ? 0 : Math.PI / 8);
      const hubR = 0.085, rimR = 0.25;
      const p0 = new THREE.Vector3(cx + s * 0.07, y + Math.sin(a) * hubR, zI + Math.cos(a) * hubR);
      const p1 = new THREE.Vector3(x, y + Math.sin(a) * rimR, zI + Math.cos(a) * rimR);
      parts.push(part(G.rod(p0, p1, 0.017, 10), pal.paint));
    }
  }
  // hub barrel and outer cap
  parts.push(part(G.cyl(0.09, 0.09, 0.2, 32), pal.paint, { p: [cx, y, zI], r: [0, 0, 90] }));
  parts.push(part(g.rrCap, pal.cast, { p: [cx + 0.1, y, zI], s: [1, 1.5, 1.5] }));
  parts.push(part(G.scatter(nut(0.016, 0.007), boltRingX(0.072, 6, 0.1, 1).map((b) => ({ p: b.p, n: b.n }))), pal.gun, { p: [cx, y, zI] }));
  // crank arm and axle to the hull (track tensioner)
  const x0 = W.lower;
  parts.push(part(G.cyl(0.075, 0.075, cx - 0.1 - x0, 24), pal.cast, { p: [(x0 + cx - 0.1) / 2, y, zI], r: [0, 0, 90] }));
  const crank = hullOutline([
    { c: [0, 0], r: 0.09 },
    { c: [0.16, 0.1], r: 0.07 },
  ]);
  parts.push(part(G.plate(crank, 0.045, 'zy', 0.008), pal.cast, { p: [x0 + 0.03, y, zI] }));
  parts.push(part(G.cyl(0.085, 0.085, 0.03, 28), pal.cast, { p: [x0 + 0.015, y + 0.1, zI + 0.16], r: [0, 0, 90] }));
  parts.push(part(G.scatter(nut(0.018, 0.008), boltRingX(0.065, 6, 0.03, 1).map((b) => ({ p: b.p, n: b.n }))), pal.cast, { p: [x0, y + 0.1, zI + 0.16] }));
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
export function runningGear(pal: Palette, only?: string): THREE.Group {
  const layout = trackLayout();
  const left: THREE.Object3D[] = [];
  const want = (k: string) => !only || only === k;
  let spin = 0;
  for (let i = 0; i < BOGIE_Z.length; i++) {
    const zb = BOGIE_Z[i];
    if (want('bogies')) left.push(bogie(pal, zb, i === 0 ? 1 : i === BOGIE_Z.length - 1 ? -1 : 0));
    for (const s of [1, -1]) {
      if (want('wheels')) left.push(group([roadWheelPair(pal, (spin += 17))], { p: [TRACK.x, WHEEL.y, zb + s * BOGIE_HALF] }));
    }
  }
  if (want('rollers')) for (const z of RETURN_ROLLER.z) left.push(returnRoller(pal, z));
  if (want('sprocket')) left.push(sprocket(pal, layout.sprocketPhase));
  if (want('idler')) left.push(idler(pal, layout.idlerZ));
  if (want('track')) left.push(track(pal));
  return mirrorX(group(left));
}

export { trackLayout };
