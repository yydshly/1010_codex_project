/**
 * Mosin-Nagant M1891/30 - part builders in the design "bore frame" (metres):
 *   z = u / 1000 (distance forward from the butt-plate face), y = height above the bore axis,
 *   x = weapon's left (+) / right (-, bolt-handle side). See dims.ts for the design stations (mm).
 * mosin-9130.model.ts shifts the assembled group so that the wrist grip centre is the origin.
 */
import { THREE, G, part, group, mirrorX } from '../../../../core/kit';
import { SUW } from '../common/materials';
import {
  latheZ, tubeZ, cylZ, cylX, sidePlate, frontPlate, orient, screwHead, perfTube, holeRRect, v3, D2R, type V2,
} from '../common/geo';
import { buildSling, type Capsule } from '../common/sling';
import { U, stockTop, stockBot, barrelR } from './dims';
import { stockRing, handguardRing, handguardSpec, resample, sectionContour, stockSpec, stockSideX } from './sections';

const MM = 0.001;
const P = (x: number, y: number, u: number) => v3(x * MM, y * MM, u * MM);
const mmPts = (pts: V2[]) => pts.map(([a, b]) => [a * MM, b * MM] as V2);

/** Sling slots (design mm): centre u, centre y, length (along u), height. */
export const SLOTS = {
  rear: { u: U.rearSlot, y: -80, l: 32, h: 10 },
  front: { u: U.frontSlot, y: -21, l: 28, h: 9 },
};

// ------------------------------------------------------------------------------------------------
// Wood

function stockStations(): number[] {
  const st: number[] = [];
  const add = (a: number, b: number, step: number) => {
    const n = Math.max(1, Math.round((b - a) / step));
    for (let i = 0; i < n; i++) st.push(a + ((b - a) * i) / n);
  };
  add(3.6, 12, 2.8);
  add(12, 240, 19);
  add(240, 400, 6.2);
  add(400, 540, 14);
  add(540, 572, 3.6);
  add(572, 732, 16);
  add(732, 758, 3.3);
  add(758, 1128, 30);
  add(1128, 1141, 3.2);
  st.push(1141);
  return st;
}

export function stockGeo(n = 72): THREE.BufferGeometry {
  const secs = stockStations().map((u) => {
    let ring = stockRing(u, n);
    if (u > 1136) {
      // rounded nose ahead of the front band
      const k = (u - 1136) / 5;
      const sh = 2.2 * k * k;
      const cy = (stockTop(u) + stockBot(u)) / 2;
      ring = ring.map(([x, y]) => {
        const d = Math.hypot(x, y - cy) || 1;
        return [x - (x / d) * sh, y - ((y - cy) / d) * sh] as V2;
      });
    }
    return { z: u * MM, ring: mmPts(ring) };
  });
  return G.loftZ(secs, true, 62);
}

export function handguardGeo(n = 56): THREE.BufferGeometry {
  const us: [number, number][] = [
    [652.2, -1.5], [652.8, -0.75], [654, -0.25], [656, -0.05], [658, 0],
  ];
  for (let u = 680; u < 1110; u += 26) us.push([u, 0]);
  us.push([1122, 0], [1124.5, -0.1], [1126.5, -0.5], [1128, -1.3]);
  return G.loftZ(us.map(([u, gr]) => ({ z: u * MM, ring: mmPts(handguardRing(u, n, gr)) })), true, 60);
}

// ------------------------------------------------------------------------------------------------
// Conformal fittings on the stock sides

const sideP = (u: number, y: number, off: number, sgn: number) => P(sgn * (stockSideX(u, y) + off), y, u);

function stadiumPts(uc: number, yc: number, hl: number, r: number, n = 36): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    pts.push([uc + Math.sign(c) * hl + r * c, yc + r * s]);
  }
  return pts;
}

/** Fan-triangulated patch lying on the stock side (sgn = +1 left, -1 right). */
function sidePatch(outline: V2[], off: number, sgn: number): THREE.BufferGeometry {
  const cu = outline.reduce((a, p) => a + p[0], 0) / outline.length;
  const cy = outline.reduce((a, p) => a + p[1], 0) / outline.length;
  const pts = [sideP(cu, cy, off, sgn), ...outline.map(([u, y]) => sideP(u, y, off, sgn))];
  const pos: number[] = [];
  for (const p of pts) pos.push(p.x, p.y, p.z);
  const idx: number[] = [];
  const n = outline.length;
  for (let i = 0; i < n; i++) {
    const a = 1 + i, b = 1 + ((i + 1) % n);
    // face normal must point to sgn * X
    const e1 = pts[a].clone().sub(pts[0]), e2 = pts[b].clone().sub(pts[0]);
    if (e1.cross(e2).x * sgn >= 0) idx.push(0, a, b);
    else idx.push(0, b, a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function slotFittings(s: { u: number; y: number; l: number; h: number }): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const sgn of [1, -1]) {
    // dark opening
    out.push(part(sidePatch(stadiumPts(s.u, s.y, s.l / 2 - s.h / 2, s.h / 2), 0.1, sgn), SUW.internal()));
    // pressed steel escutcheon rim
    const rim = stadiumPts(s.u, s.y, s.l / 2 - s.h / 2, s.h / 2 + 1.25, 40).map(([u, y]) => sideP(u, y, 0.32, sgn));
    out.push(part(G.strap(rim, 2.3 * MM, 0.75 * MM, v3(sgn, 0, 0), { closed: true, smooth: false }), SUW.blued()));
  }
  return out;
}

/** Flat band spring inletted on the right side just behind a band. */
function bandSpring(uFront: number): THREE.Object3D[] {
  const y = -16.5;
  const pts: THREE.Vector3[] = [];
  for (let u = uFront - 46; u <= uFront - 0.8; u += 4.5) pts.push(sideP(u, y, 0.2, -1));
  const sp = part(G.strap(pts, 5.2 * MM, 0.9 * MM, v3(-1, 0, 0), { smooth: false }), SUW.blued());
  const stud = part(G.rbox(2.4 * MM, 4.6 * MM, 3.2 * MM, 0.8 * MM), SUW.blued(), { p: sideP(uFront - 2.6, y, 0.9, -1) });
  const tipScrew = screwHead(2.1 * MM, 0.8 * MM);
  const hp = sideP(uFront - 42, y, 0.55, -1);
  return [
    sp,
    stud,
    part(orient(tipScrew.head, hp, v3(-1, 0, 0), 0.4), SUW.blued()),
    part(orient(tipScrew.slot, hp, v3(-1, 0, 0), 0.4), SUW.internal()),
  ];
}

// ------------------------------------------------------------------------------------------------
// Barrel, sights, bands, cleaning rod

export function barrelParts(): THREE.Object3D[] {
  const prof: V2[] = [[0, 503]];
  const samples = [503, 574, 575.2, 577.2, 578, 600, 640, 652, 656, 660, 680, 720, 800, 900, 1000, 1100, 1160, 1200, 1229.8];
  for (const u of samples) prof.push([barrelR(u), u]);
  prof.push([barrelR(1231) - 0.35, 1231.4], [barrelR(1232) - 1.0, 1232], [4.7, 1232], [3.95, 1231.3], [3.95, 1229]);
  const barrel = latheZ(mmPts(prof), 36, 32);
  const bore = latheZ(mmPts([[3.97, 1229.6], [3.97, 1205], [0, 1205]]), 20, 60);
  return [part(barrel, SUW.blued()), part(bore, SUW.internal())];
}

export function rearSight(): THREE.Object3D[] {
  const b = SUW.blued();
  const out: THREE.Object3D[] = [];
  out.push(part(tubeZ(15.4 * MM, 11.9 * MM, 578 * MM, 652.5 * MM, 36, 0.8 * MM), b));
  // platform between the walls
  out.push(part(G.rbox(12.4 * MM, 3.4 * MM, 66 * MM, 0.8 * MM), b, { p: P(0, 14.2, 616) }));
  // curved side walls (ramps the slider rides on)
  const wall: V2[] = [[582, 12.5], [582, 16.6], [596, 17.2], [612, 18.2], [628, 19.8], [641, 21.6], [648, 22.4], [651.5, 20.6], [651.5, 12.5]];
  out.push(mirrorX(part(sidePlate(mmPts(wall), 2.2 * MM, 6.1 * MM, 0.5 * MM), b)));
  // leaf (lowered), hinged at the front
  const leaf: V2[] = [[585.5, 18.3], [585.5, 20.4], [616, 21.4], [646, 22.5], [649.2, 21.4], [649.2, 19.8], [646, 18.9]];
  out.push(part(sidePlate(mmPts(leaf), 9.3 * MM, 0, 0.45 * MM), b));
  // graduation ticks on the leaf top
  for (let i = 0; i < 9; i++) {
    const u = 604 + i * 4.6;
    const y = 21.1 + (u - 585.5) * (1.1 / 60.5) + 0.12;
    out.push(part(G.box(6.5 * MM, 0.3 * MM, 0.45 * MM), SUW.internal(), { p: P(0, y, u) }));
  }
  // slider with release catches and the notch plate
  out.push(part(G.rbox(15.4 * MM, 5.0 * MM, 10.5 * MM, 1.2 * MM), b, { p: P(0, 20.4, 594) }));
  out.push(mirrorX(part(cylX(1.9 * MM, 7.4 * MM, 9.1 * MM, 12), b, { p: P(0, 20.2, 594) })));
  const notch: V2[] = [[-6.2, 20.2], [6.2, 20.2], [6.2, 25.1], [1.25, 25.1], [0.3, 23.5], [-0.3, 23.5], [-1.25, 25.1], [-6.2, 25.1]];
  out.push(part(frontPlate(mmPts(notch), 2.3 * MM, 587.6 * MM, 0.3 * MM), b));
  // hinge pin
  out.push(part(cylX(1.5 * MM, -7.6 * MM, 7.6 * MM, 12), b, { p: P(0, 20.3, 647.2) }));
  return out;
}

export function frontSight(): THREE.Object3D[] {
  const b = SUW.blued();
  const out: THREE.Object3D[] = [];
  out.push(part(tubeZ(8.9 * MM, 7.6 * MM, 1197 * MM, 1219 * MM, 32, 0.6 * MM), b));
  out.push(part(G.rbox(8 * MM, 3.6 * MM, 16 * MM, 0.7 * MM), b, { p: P(0, 10.6, 1208) }));
  const post: V2[] = [[1205.6, 12.4], [1210.4, 12.4], [1209.5, 17.5], [1208.9, 21.6], [1207.1, 21.6], [1206.5, 17.5]];
  out.push(part(sidePlate(mmPts(post), 1.9 * MM, 0, 0.3 * MM), b));
  const hood = tubeZ(8.6 * MM, 7.7 * MM, 1199.5 * MM, 1216.5 * MM, 32, 0.4 * MM);
  hood.translate(0, 20.0 * MM, 0);
  out.push(part(hood, b));
  return out;
}

/**
 * Band section: convex hull of the stock + handguard sections (a steel band bridges the joint),
 * offset outwards by t, n points from the top centre running towards -X.
 */
function hullRing(u: number, n: number, t: number): V2[] {
  const pts = [...sectionContour(stockSpec(u), 360), ...sectionContour(handguardSpec(u), 360)].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: V2[] = [], up: V2[] = [];
  for (const p of pts) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  const hull = resample(lo.slice(0, -1).concat(up.slice(0, -1)), 360); // CCW
  const m = hull.length;
  const off: V2[] = hull.map((p, i) => {
    const a = hull[(i + m - 2) % m], b = hull[(i + 2) % m];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [p[0] + (dy / l) * t, p[1] - (dx / l) * t];
  });
  let top = 0;
  for (let i = 0; i < m; i++) if (off[i][1] - Math.abs(off[i][0]) * 4 > off[top][1] - Math.abs(off[top][0]) * 4) top = i;
  const rot = [...off.slice(top), ...off.slice(0, top)];
  return resample(rot, n);
}

function bandLoft(u0: number, u1: number, t: number, n = 72): THREE.BufferGeometry {
  const st: [number, number][] = [[u0, 0.05], [u0 + 0.5, t * 0.62], [u0 + 1.4, t], [u1 - 1.4, t], [u1 - 0.5, t * 0.62], [u1, 0.05]];
  return G.loftZ(st.map(([u, tt]) => ({ z: u * MM, ring: mmPts(hullRing(u, n, tt)) })), false, 50);
}

export function bands(): THREE.Object3D[] {
  const b = SUW.blued();
  return [
    part(bandLoft(897.5, 912.5, 1.45), b),
    part(bandLoft(1120, 1139, 1.55), b),
    ...bandSpring(897.5),
    ...bandSpring(1120),
  ];
}

export function cleaningRod(): THREE.Object3D[] {
  const s = SUW.bright();
  const y = -14.5;
  const shaft = cylZ(3.0 * MM, 1130 * MM, 1146 * MM, 16);
  const head = latheZ(mmPts([[0, 1145], [3.5, 1145], [4.4, 1146.4], [4.4, 1155.2], [3.7, 1157], [0, 1157]]), 20, 40);
  shaft.translate(0, y * MM, 0);
  head.translate(0, y * MM, 0);
  return [
    part(shaft, s),
    part(head, s),
    part(cylX(1.35 * MM, -4.55 * MM, 4.55 * MM, 12), SUW.internal(), { p: P(0, y, 1151) }),
  ];
}

// ------------------------------------------------------------------------------------------------
// Receiver & bolt

export function receiver(): THREE.Object3D[] {
  const b = SUW.blued();
  const out: THREE.Object3D[] = [];
  const R = 16.2;
  // receiver ring (barrel threads into it)
  out.push(part(latheZ(mmPts([[9.7, 500], [R, 500], [R, 530.4], [R - 1.0, 532], [14.6, 532], [9.7, 532], [9.7, 500]]), 40, 30), b));
  // loading-port section: tube with the top opening (real depth, see-through to the bolt)
  const port = perfTube({
    R: R * MM,
    t: 6.4 * MM,
    phis: [30, 150, 270, 390].map((d) => d * D2R),
    rows: [410 * MM, 502 * MM],
    dz: 4 * MM,
    z0: 410 * MM,
    nPhi: 12,
    holes: [{ phi: 90 * D2R, z: 456 * MM, sdf: holeRRect(21.5 * MM, 84 * MM, 6 * MM) }],
    caps: false,
  });
  out.push(part(port, b));
  // bridge with the charger (stripper-clip) guide
  out.push(part(tubeZ(R * MM, 9.7 * MM, 380 * MM, 410 * MM, 40, 0.9 * MM), b));
  const lug: V2[] = [[396, 14.5], [409.5, 14.5], [409.5, 19.4], [398.5, 19.4]];
  out.push(mirrorX(part(sidePlate(mmPts(lug), 3.4 * MM, 5.9 * MM, 0.5 * MM), b)));
  // rear channel behind the bridge (bolt tail rides in it)
  const channel = perfTube({
    R: 15 * MM,
    t: 5 * MM,
    phis: [192, 270, 348].map((d) => d * D2R),
    rows: [346 * MM, 381 * MM],
    dz: 5 * MM,
    z0: 346 * MM,
    nPhi: 8,
    caps: true,
  });
  out.push(part(channel, b));
  // tang lying on the wrist
  const tang: { z: number; ring: V2[] }[] = [];
  for (const u of [301, 303, 307, 315, 325, 335, 345, 352]) {
    const k = Math.min(1, (u - 301) / 6);
    const hw = (7.2 + 2.2 * Math.min(1, (u - 301) / 40)) * (0.55 + 0.45 * Math.sqrt(k));
    const yc = stockTop(u) + 1.1;
    const ring: V2[] = [];
    for (let i = 0; i < 20; i++) {
      const a = Math.PI / 2 + (i / 20) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      ring.push([Math.sign(c) * Math.pow(Math.abs(c), 0.5) * hw, yc + Math.sign(s) * Math.pow(Math.abs(s), 0.5) * 1.6]);
    }
    tang.push({ z: u * MM, ring: mmPts(ring) });
  }
  out.push(part(G.loftZ(tang, true, 60), b));
  return out;
}

export function bolt(): THREE.Object3D[] {
  const s = SUW.bright();
  const out: THREE.Object3D[] = [];
  out.push(part(cylZ(9.2 * MM, 345 * MM, 500 * MM, 32, 0.8 * MM), s));
  // guide rib along the body (visible in the loading port)
  out.push(part(G.rbox(3.2 * MM, 2.4 * MM, 112 * MM, 0.8 * MM), s, { p: P(4.9, 7.3, 440), r: [0, 0, -33] }));
  // cocking piece knob
  out.push(part(latheZ(mmPts([[0, 318], [8.2, 318], [9.6, 318.8], [10.2, 320.6], [10.2, 336], [9.4, 338.6], [6.4, 341], [6.4, 346]]), 32, 35), s));
  // bolt handle root, straight stem and round knob (right side)
  out.push(part(G.rbox(11 * MM, 12 * MM, 16 * MM, 2.8 * MM), s, { p: P(-9.5, -1.6, 372.5) }));
  out.push(part(G.rod([-13.5 * MM, -2.4 * MM, 372.5 * MM], [-46.5 * MM, -7.2 * MM, 371.2 * MM], 4.4 * MM, 16, 3.6 * MM), s));
  const knob = new THREE.SphereGeometry(9.5 * MM, 24, 16);
  knob.scale(1.02, 0.97, 1.06);
  out.push(part(knob, s, { p: P(-54.5, -8.3, 371) }));
  return out;
}

// ------------------------------------------------------------------------------------------------
// Magazine, trigger guard, trigger, screws, butt plate

function screw(p: THREE.Vector3, n: THREE.Vector3, r: number, spin = 0): THREE.Object3D[] {
  const sh = screwHead(r * MM, r * 0.34 * MM);
  return [part(orient(sh.head, p.clone(), n, spin), SUW.blued()), part(orient(sh.slot, p.clone(), n, spin), SUW.internal())];
}

export function magazineAndGuard(): THREE.Object3D[] {
  const b = SUW.blued();
  const out: THREE.Object3D[] = [];
  // stamped box: vertical front, flared lower edge, rear curving into the trigger-guard bow
  const box: V2[] = [[497, -40], [497.3, -68.5], [495.6, -74.6], [490.5, -77.2], [412, -77.6], [405.5, -75.8], [401.5, -70.5], [399.6, -60], [399.4, -40]];
  out.push(part(sidePlate(mmPts(box), 23.8 * MM, 0, 1.5 * MM), b));
  const skirt: V2[] = [[496.4, -67.5], [496.8, -72], [494, -76.6], [410, -77.1], [404.2, -74], [403.4, -67.5]];
  out.push(part(sidePlate(mmPts(skirt), 25.4 * MM, 0, 1.1 * MM), b));
  // floorplate (hinged at the front) with the latch at the rear
  const fp: V2[] = [[495.8, -76.4], [496, -78.6], [493.6, -80.2], [409, -80.4], [405.4, -78.8], [405.6, -76.4]];
  out.push(part(sidePlate(mmPts(fp), 24.2 * MM, 0, 0.8 * MM), b));
  out.push(part(G.rbox(15 * MM, 1.1 * MM, 62 * MM, 0.5 * MM), b, { p: P(0, -80.6, 452) }));
  out.push(part(cylX(2.2 * MM, -9 * MM, 9 * MM, 14), b, { p: P(0, -77.6, 494.2) }));
  out.push(part(G.rbox(8.6 * MM, 7 * MM, 5.2 * MM, 1.2 * MM), b, { p: P(0, -76.6, 403.2) }));
  for (let i = 0; i < 3; i++) out.push(part(G.box(8.2 * MM, 0.5 * MM, 0.6 * MM), SUW.internal(), { p: P(0, -80, 402.2 + i * 1.3) }));
  // front tang with the front guard screw
  const ft: { z: number; ring: V2[] }[] = [];
  for (const u of [499, 505, 512, 518, 522.5, 524.5]) {
    const k = u > 520 ? Math.sqrt(Math.max(0, 1 - ((u - 520) / 4.6) ** 2)) : 1;
    const yc = stockBot(u) - 0.25;
    ft.push({ z: u * MM, ring: mmPts(G.superRing(Math.max(0.6, 8 * k), 1.6, 20, 3.2).map(([x, y]) => [x, y + yc] as V2)) });
  }
  out.push(part(G.loftZ(ft, true, 60), b));
  out.push(...screw(P(0, stockBot(511) - 1.8, 511), v3(0, -1, 0), 4.0, 0.3));
  // trigger guard bow
  const bow: V2[] = [[401, -74], [394, -78.4], [380, -80.6], [363, -79.6], [347, -75.4], [331, -68.2], [320, -60.2], [313.6, -54.2]];
  const cz = 356, cy = -60;
  const bp = bow.map(([u, y]) => P(0, y, u));
  const bn = bow.map(([u, y]) => v3(0, y - cy, u - cz).normalize());
  out.push(part(G.strap(bp, 10.4 * MM, 3.4 * MM, bn, { samples: 40 }), b));
  // rear tang along the wrist underside with the rear guard screw
  const rt: { z: number; ring: V2[] }[] = [];
  for (const u of [282.5, 284.5, 289, 296, 304, 311, 316]) {
    const k = Math.min(1, Math.sqrt(Math.max(0, (u - 282.4) / 6)));
    const yc = stockBot(u) - 0.35;
    rt.push({ z: u * MM, ring: mmPts(G.superRing(Math.max(0.5, 6.4 * k), 1.5, 20, 3.2).map(([x, y]) => [x, y + yc] as V2)) });
  }
  out.push(part(G.loftZ(rt, true, 60), b));
  out.push(...screw(P(0, stockBot(297) - 1.7, 297), v3(0, -1, 0), 3.8, 1.1));
  // trigger
  const trig: V2[] = [[348.2, -47], [350.2, -56], [348.8, -63.8], [345, -70.2], [341, -72.6], [339.6, -71.4], [342.8, -65], [344.8, -57], [344.2, -47]];
  out.push(part(sidePlate(mmPts(trig), 5 * MM, 0, 1.2 * MM), b));
  return out;
}

export function buttPlate(n = 72): THREE.Object3D[] {
  const outline = mmPts(stockRing(3.6, n));
  const out: THREE.Object3D[] = [part(frontPlate(outline, 3.8 * MM, 1.8 * MM, 0.95 * MM), SUW.blued())];
  const yT = stockTop(0), yB = stockBot(0);
  out.push(...screw(P(0, yT - 20, -0.02), v3(0, 0, -1), 4.4, 0.5));
  out.push(...screw(P(0, yB + 26, -0.02), v3(0, 0, -1), 4.4, 1.9));
  return out;
}

export function slotHardware(): THREE.Object3D[] {
  return [...slotFittings(SLOTS.rear), ...slotFittings(SLOTS.front)];
}

// ------------------------------------------------------------------------------------------------
// Bayonet (M1891/30 socket bayonet, cruciform spike, fixed on the right of the muzzle)

export function bayonet(): THREE.Object3D[] {
  const b = SUW.blued();
  const out: THREE.Object3D[] = [];
  // socket with the sight slot, locking collar at the rear
  out.push(part(perfTube({
    R: 10.9 * MM,
    t: 1.8 * MM,
    phis: [30, 150, 270, 390].map((d) => d * D2R),
    rows: [1172 * MM, 1234 * MM],
    dz: 2 * MM,
    z0: 1172 * MM,
    nPhi: 10,
    holes: [{ phi: 90 * D2R, z: 1206 * MM, sdf: holeRRect(10.5 * MM, 48 * MM, 4 * MM) }],
  }), b));
  out.push(part(tubeZ(12.0 * MM, 9.1 * MM, 1161 * MM, 1172.2 * MM, 36, 0.8 * MM), b));
  out.push(part(G.rbox(4 * MM, 3.4 * MM, 6 * MM, 1 * MM), b, { p: P(-11.4, 1.5, 1166) }));
  // neck: from the socket front, outwards to the right and slightly down
  const bx = -21.5, by = -5;
  out.push(part(G.tube([P(-7.5, -3, 1226), P(-13, -4.4, 1230), P(-18.4, -5, 1233.5), P(bx, by, 1238)], 3.4 * MM, 12, 12), b));
  out.push(part(latheZ(mmPts([[0, 1234], [5.2, 1234], [6.2, 1236], [6.2, 1241], [5.0, 1245]]), 20, 40).translate(bx * MM, by * MM, 0), b));
  // cruciform blade: four fluted ribs tapering to a flat screwdriver point
  const secs: { z: number; ring: V2[] }[] = [];
  const stations: [number, number, number][] = [
    // u, arm half-span, flute radius
    [1244.6, 7.8, 4.6], [1250, 8.4, 3.6], [1330, 7.7, 3.2], [1430, 6.5, 2.7], [1530, 5.1, 2.2], [1610, 3.7, 1.7], [1640, 3.1, 1.45], [1652, 2.8, 1.3],
  ];
  const cross = (arm: number, core: number): V2[] => {
    const pts: V2[] = [];
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / 2;
      const c = Math.abs(Math.cos(2 * (a - Math.PI / 2)));
      const r = core + (arm - core) * Math.pow(c, 2.4);
      pts.push([bx + r * Math.cos(a), by + r * Math.sin(a)]);
    }
    return pts;
  };
  const flat = (w: number, t: number): V2[] => {
    const pts: V2[] = [];
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / 2;
      const c = Math.cos(a), s = Math.sin(a);
      pts.push([bx + Math.sign(c) * Math.pow(Math.abs(c), 0.35) * w, by + Math.sign(s) * Math.pow(Math.abs(s), 0.35) * t]);
    }
    return pts;
  };
  for (const [u, arm, core] of stations) secs.push({ z: u * MM, ring: mmPts(cross(arm, core)) });
  secs.push({ z: 1658 * MM, ring: mmPts(flat(2.5, 0.9)) });
  secs.push({ z: 1661.5 * MM, ring: mmPts(flat(2.1, 0.45)) });
  out.push(part(G.loftZ(secs, true, 50), b));
  return out;
}

// ------------------------------------------------------------------------------------------------
// Sling: canvas strap on the left side, hung from leather dog collars threaded through the slots.

function dogCollar(s: { u: number; y: number; h: number }): { geo: THREE.BufferGeometry; bar: THREE.Vector3; axis: THREE.Vector3; buckle: THREE.Vector3 } {
  const u = s.u;
  const yb = stockBot(u);
  const yThrough = s.y - s.h / 2 + 2.4;
  const xl = stockSideX(u, yThrough), xr = stockSideX(u, yThrough);
  const drop = 16; // the loop hangs below the stock on the left side
  const pts: V2[] = [
    [0, yThrough],
    [-xr, yThrough],
    [-xr - 1.8, yThrough - 3.5],
    [-stockSideX(u, (yThrough + yb) / 2) - 1.9, (yThrough + yb) / 2],
    [-stockSideX(u, yb + 3) - 1.4, yb + 1.2],
    [-5, yb - 1.9],
    [6, yb - 3.2],
    [xl + 5.5, yb - drop * 0.55],
    [xl + 9.5, yb - drop * 0.15],
    [xl + 9.8, (yb + yThrough) / 2],
    [xl + 5.5, yThrough - 2.2],
    [xl, yThrough],
  ];
  const P3 = pts.map(([x, y]) => P(x, y, u));
  const N3 = pts.map(([x, y], i) => {
    const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
    const tx = b[0] - a[0], ty = b[1] - a[1];
    return v3(ty, -tx, 0).normalize();
  });
  // make normals point away from the loop interior (centroid)
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  N3.forEach((n, i) => {
    if (n.x * (pts[i][0] - cx) + n.y * (pts[i][1] - cy) < 0) n.negate();
  });
  const geo = G.strap(P3, 17 * MM, 2.8 * MM, N3, { closed: true, samples: 64 });
  const bar = P(xl + 9.6 + 1.4, (yb - drop * 0.15 + (yb + yThrough) / 2) / 2, u);
  const axis = P(xl + 9.8, (yb + yThrough) / 2, u).sub(P(xl + 9.5, yb - drop * 0.15, u)).normalize();
  const buckle = P(xl + 7.2, yb - drop * 0.42, u);
  return { geo, bar, axis, buckle };
}

/** Collision capsules (bore frame) keeping the free strap outside the rifle. */
function slingObstacles(): Capsule[] {
  const caps: Capsule[] = [];
  const pts = [20, 120, 220, 300, 380, 470, 560, 700, 850];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], bb = pts[i + 1];
    const ya = (stockTop(a) + stockBot(a)) / 2, yb = (stockTop(bb) + stockBot(bb)) / 2;
    const r = Math.min((stockTop(a) - stockBot(a)) / 2, 20);
    caps.push({ a: P(0, ya, a), b: P(0, yb, bb), r: r * MM });
  }
  caps.push({ a: P(0, -70, 402), b: P(0, -70, 496), r: 14 * MM });
  caps.push({ a: P(0, -76, 330), b: P(0, -80, 392), r: 7 * MM });
  return caps;
}

export function mosinSling(gravity: THREE.Vector3, slack: number): THREE.Group {
  const rear = dogCollar(SLOTS.rear), front = dogCollar(SLOTS.front);
  const parts: THREE.Object3D[] = [part(rear.geo, SUW.leather()), part(front.geo, SUW.leather())];
  // small steel roller buckles on the collars
  for (const c of [rear, front]) {
    const fr = G.torus(3.6 * MM, 0.8 * MM, 6, 16);
    fr.scale(1, 1.35, 1);
    fr.rotateY(Math.PI / 2);
    parts.push(part(fr, SUW.blued(), { p: c.buckle }));
  }
  const strap = buildSling(
    {
      rear: { bar: rear.bar, axis: rear.axis, r: 1.7 * MM },
      front: { bar: front.bar, axis: front.axis, r: 1.7 * MM },
      width: 32 * MM,
      thickness: 2.1 * MM,
      strap: SUW.canvas(),
      thread: SUW.thread(),
      hardware: SUW.blued(),
      side: v3(1, 0, 0),
      obstacles: slingObstacles(),
      buckle: { at: 0.3, w: 36 * MM, l: 9 * MM },
      tail: 0.05,
    },
    gravity,
    slack,
  );
  parts.push(strap);
  return group(parts, { name: 'mosin-sling' });
}

/** Sling attachment points (bore frame): the dog-collar loops the canvas wraps around. */
export function slingPoints(): { front: THREE.Vector3; rear: THREE.Vector3 } {
  return { front: dogCollar(SLOTS.front).bar, rear: dogCollar(SLOTS.rear).bar };
}

/** Stock cross-section (design mm) for rest-point / cradle contact computations. */
export function stockSection(u: number): V2[] {
  return sectionContour(stockSpec(u), 240);
}
