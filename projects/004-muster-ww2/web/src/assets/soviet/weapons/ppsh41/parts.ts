/**
 * PPSh-41 - part builders in the design bore frame (metres; z = u / 1000 from the butt plate,
 * y above the bore axis, +x = weapon's left). See dims.ts for the stations (mm).
 */
import { THREE, G, part, mirrorX } from '../../../../core/kit';
import { SUW } from '../common/materials';
import {
  latheZ, latheX, tubeZ, cylZ, cylX, sidePlate, frontPlate, orient, screwHead, perfTube, holeStadium, holeRRect, v3, D2R,
  type V2, type PerfHole,
} from '../common/geo';
import { buildSling, type Capsule, type Disc } from '../common/sling';
import { sectionContour, resample, type SectionSpec } from '../mosin-9130/sections';
import { smooth01 } from '../mosin-9130/dims';
import { U, REC_R, JACKET_R, DRUM, stockTop, stockBot, stockHW, stockHWT, stockHWB } from './dims';

const MM = 0.001;
const P = (x: number, y: number, u: number) => v3(x * MM, y * MM, u * MM);
const mmPts = (pts: V2[]) => pts.map(([a, b]) => [a * MM, b * MM] as V2);

// ------------------------------------------------------------------------------------------------
// Stock

export function stockSpec(u: number): SectionSpec {
  const rec = smooth01(318, 352, u);
  return { yT: stockTop(u), yB: stockBot(u), hw: stockHW(u), hwT: stockHWT(u), hwB: stockHWB(u), eT: 2.7 + 2.6 * rec, eB: 2.6 + 0.7 * rec, mid: -0.04 * rec };
}

/** Stock section contour (mm) at u. */
export function stockSection(u: number, dense = 240): V2[] {
  return sectionContour(stockSpec(u), dense) as V2[];
}

/** +X surface of the stock at height y (mm). */
function sideX(u: number, y: number): number {
  let best = 0, bd = Infinity;
  for (const p of sectionContour(stockSpec(u), 480)) {
    if (p[0] <= 0) continue;
    const d = Math.abs(p[1] - y);
    if (d < bd) {
      bd = d;
      best = p[0];
    }
  }
  return best;
}

export function stockGeo(n = 64): THREE.BufferGeometry {
  const st = [4.2, 7, 11, 30, 60, 100, 150, 200, 230, 250, 262, 274, 286, 296, 304, 310, 316, 322, 328, 334, 340, 346, 352, 360, 380, 420, 460, 500, 530, 540, 544, 546.5, 548];
  const secs = st.map((u) => {
    let ring = resample(sectionContour(stockSpec(u)), n) as V2[];
    if (u > 540) {
      const k = (u - 540) / 8;
      const sh = 3.2 * k * k;
      const cy = (stockTop(u) + stockBot(u)) / 2;
      ring = ring.map(([x, y]) => {
        const d = Math.hypot(x, y - cy) || 1;
        return [x - (x / d) * sh * 0.8, y - ((y - cy) / d) * sh] as V2;
      });
    }
    return { z: u * MM, ring: mmPts(ring) };
  });
  return G.loftZ(secs, true, 62);
}

function screw(p: THREE.Vector3, n: THREE.Vector3, r: number, spin = 0): THREE.Object3D[] {
  const sh = screwHead(r * MM, r * 0.34 * MM);
  return [part(orient(sh.head, p.clone(), n, spin), SUW.blued()), part(orient(sh.slot, p.clone(), n, spin), SUW.internal())];
}

/** Steel butt plate with the hinged trap for the cleaning-kit compartment. */
export function buttPlate(): THREE.Object3D[] {
  const s = SUW.stamped();
  const outline = mmPts(resample(sectionContour(stockSpec(4.2)), 64) as V2[]);
  const out: THREE.Object3D[] = [part(frontPlate(outline, 4.4 * MM, 2.0 * MM, 1.0 * MM), s)];
  const lid: V2[] = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    lid.push([11.5 * Math.cos(a), -97 + 29 * Math.sin(a)]);
  }
  out.push(part(frontPlate(mmPts(lid), 1.2 * MM, -0.3 * MM, 0.45 * MM), s));
  out.push(part(cylX(1.9 * MM, -6.5 * MM, 6.5 * MM, 12), s, { p: P(0, -66.5, -0.9) }));
  out.push(part(G.rbox(6 * MM, 3.4 * MM, 2.2 * MM, 0.8 * MM), s, { p: P(0, -127.5, -0.6) }));
  out.push(...screw(P(0, -44, -0.02), v3(0, 0, -1), 4.2, 0.4));
  out.push(...screw(P(0, -140, -0.02), v3(0, 0, -1), 4.2, 1.4));
  return out;
}

// ------------------------------------------------------------------------------------------------
// Receiver, jacket, barrel, sights

export function receiver(): THREE.Object3D[] {
  const s = SUW.stamped();
  const out: THREE.Object3D[] = [];
  const holes: PerfHole[] = [
    { phi: 90 * D2R, z: ((U.port0 + U.port1) / 2) * MM, sdf: holeRRect(15 * MM, (U.port1 - U.port0) * MM, 3 * MM) },
    { phi: 180 * D2R, z: ((U.slot0 + U.slot1) / 2) * MM, sdf: holeStadium(7 * MM, (U.slot1 - U.slot0) * MM) },
  ];
  out.push(part(perfTube({
    R: REC_R * MM,
    t: 1.6 * MM,
    phis: [-90, 0, 60, 120, 150, 210, 270].map((d) => d * D2R),
    rows: [321 * MM, 548.5 * MM],
    dz: 6.5 * MM,
    z0: 321 * MM,
    nPhi: 6,
    holes,
  }), s));
  // rounded rear cap (buffer housing)
  out.push(part(latheZ(mmPts([[0, 305.5], [7, 306], [12.5, 308.2], [16.4, 311.6], [18.6, 315.6], [19.4, 319], [19.5, 321.6]]), 40, 50), s));
  // receiver catch on the wrist behind the receiver
  out.push(part(G.rbox(12 * MM, 7 * MM, 11 * MM, 2 * MM), SUW.blued(), { p: P(0, -12.2, 302) }));
  for (let i = 0; i < 4; i++) out.push(part(G.box(10 * MM, 0.6 * MM, 0.7 * MM), SUW.internal(), { p: P(0, -8.6, 298.8 + i * 2.1) }));
  // step down to the barrel jacket
  out.push(part(latheZ(mmPts([[15.7, 548.5], [19.5, 548.5], [19.3, 550.4], [17.9, 552.6], [17.0, 553.6], [15.7, 553.6], [15.7, 548.5]]), 40, 35), s));
  // bolt (seen through the port and the handle slot), recoil-spring guide behind it
  out.push(part(cylZ(17.4 * MM, 450 * MM, 547.5 * MM, 36, 1 * MM), SUW.bright()));
  out.push(part(cylZ(7 * MM, 322 * MM, 450 * MM, 16), SUW.internal()));
  // lower-receiver floor inside the tube (hides the stock inletting seen through the slot)
  out.push(part(G.box(35 * MM, 1.2 * MM, 130 * MM), SUW.internal(), { p: P(0, -8.2, 386) }));
  // recoil spring coils around the guide
  const coil: THREE.Vector3[] = [];
  for (let i = 0; i <= 26 * 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    coil.push(P(8.2 * Math.cos(a), 8.2 * Math.sin(a), 330 + (i / (26 * 12)) * 118));
  }
  out.push(part(G.tube(coil, 1.0 * MM, 5, 26 * 12), SUW.blued()));
  // cocking handle with the sliding safety catch (right side, bolt forward)
  const bl = SUW.blued();
  out.push(part(G.rbox(9 * MM, 6.0 * MM, 6.6 * MM, 1.6 * MM), bl, { p: P(-18.5, 0, 474) }));
  out.push(part(G.rbox(12 * MM, 9 * MM, 9.4 * MM, 2.4 * MM), bl, { p: P(-27.5, 0, 474) }));
  out.push(part(cylX(6 * MM, -39.5 * MM, -32 * MM, 20, 1.6 * MM), bl, { p: P(0, 0, 474) }));
  out.push(part(G.rbox(7.4 * MM, 2.2 * MM, 8.2 * MM, 0.8 * MM), SUW.bright(), { p: P(-25, 5.4, 474) }));
  for (let i = 0; i < 3; i++) out.push(part(G.box(6.6 * MM, 0.4 * MM, 0.6 * MM), SUW.internal(), { p: P(-25, 6.6, 471.6 + i * 2.4) }));
  return out;
}

/** Slot layout of the barrel jacket (upper, side and lower rows; top and bottom stay solid). */
function jacketLayout(): { phis: number[]; rows: number[][]; holes: PerfHole[] } {
  const cols = [0, 45, 90, 135, 180, 225, 270, 315];
  const phis = [-22.5, 22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((d) => d * D2R);
  const straight = [552, 561, 606, 651, 696, 741, 786, 813];
  const stagger = [552, 583.5, 628.5, 673.5, 718.5, 763.5, 813];
  const rows: number[][] = [];
  const holes: PerfHole[] = [];
  for (const c of cols) {
    const solid = c === 90 || c === 270;
    const st = c === 0 || c === 180;
    const r = st ? stagger : straight;
    rows.push(r.map((z) => z * MM));
    if (solid) continue;
    const centres = st ? [606, 651, 696, 741] : [583.5, 628.5, 673.5, 718.5, 763.5];
    for (const z of centres) holes.push({ phi: c * D2R, z: z * MM, sdf: holeStadium(7 * MM, 30 * MM) });
    if (c === 45 || c === 135) holes.push({ phi: c * D2R, z: 799.5 * MM, sdf: holeStadium(6.5 * MM, 16 * MM) });
  }
  return { phis, rows, holes };
}

/** Tube section whose front end is cut by the slanted compensator plane z = zc + k*y. */
function slantedTube(R: number, t: number, z0: number, zc: number, k: number, seg = 48, J = 4): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  const Ri = R - t;
  const add = (x: number, y: number, z: number, n: THREE.Vector3) => {
    pos.push(x, y, z);
    nor.push(n.x, n.y, n.z);
    return pos.length / 3 - 1;
  };
  const grid = (r: number, sgn: number) => {
    const g: number[][] = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const ze = zc + k * r * s;
      const col: number[] = [];
      for (let j = 0; j <= J; j++) col.push(add(r * c, r * s, z0 + ((ze - z0) * j) / J, v3(c * sgn, s * sgn, 0)));
      g.push(col);
    }
    for (let i = 0; i < seg; i++) {
      for (let j = 0; j < J; j++) {
        const a = g[i][j], b = g[i + 1][j], c2 = g[i + 1][j + 1], d = g[i][j + 1];
        if (sgn > 0) idx.push(a, b, c2, a, c2, d);
        else idx.push(a, c2, b, a, d, c2);
      }
    }
  };
  grid(R, 1);
  grid(Ri, -1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

export function jacket(): THREE.Object3D[] {
  const s = SUW.stamped();
  const out: THREE.Object3D[] = [];
  const L = jacketLayout();
  out.push(part(perfTube({ R: JACKET_R * MM, t: 1.3 * MM, phis: L.phis, rows: L.rows, dz: 4.5 * MM, z0: 552 * MM, nPhi: 6, holes: L.holes }), s));
  // compensator: slanted front section and the front plate with the bullet hole
  const k = 14 / 17, zc = 829;
  out.push(part(slantedTube(JACKET_R * MM, 1.3 * MM, 813 * MM, zc * MM, k), s));
  const sk = Math.sqrt(1 + k * k);
  const ell: V2[] = [], hole: V2[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    ell.push([JACKET_R * Math.cos(a) * MM, JACKET_R * Math.sin(a) * sk * MM]);
    hole.push([5.4 * Math.cos(-a) * MM, 5.4 * Math.sin(-a) * sk * MM]);
  }
  const plateG = G.extrude(G.shape(ell, 0, [hole]), 2 * MM, 0.35 * MM, 12, 1);
  const d = v3(0, 1, k).normalize(), n = v3(0, -k, 1).normalize();
  plateG.applyMatrix4(new THREE.Matrix4().makeBasis(v3(1, 0, 0), d, n));
  plateG.translate(0, 0, zc * MM);
  plateG.translate(-n.x * 1.0 * MM, -n.y * 1.0 * MM, -n.z * 1.0 * MM);
  out.push(part(plateG, s));
  // barrel inside the jacket (chrome-lined bore)
  const bar = latheZ(mmPts([[0, 548], [9.6, 548], [9.6, 560], [8.7, 566], [8.4, 700], [8.2, 815.5], [7.5, 819], [4.3, 819], [3.95, 818.4], [3.95, 812]]), 28, 35);
  out.push(part(bar, SUW.blued()));
  out.push(part(latheZ(mmPts([[3.98, 818.8], [3.98, 790], [0, 790]]), 16, 60), SUW.internal()));
  // hooded front sight on the jacket top
  out.push(part(G.rbox(7 * MM, 5.6 * MM, 20 * MM, 1.2 * MM), SUW.blued(), { p: P(0, 18.6, 818) }));
  const post: V2[] = [[820.8, 20.8], [825.2, 20.8], [824.4, 27.4], [823.8, 30.4], [822.2, 30.4], [821.6, 27.4]];
  out.push(part(sidePlate(mmPts(post), 1.8 * MM, 0, 0.3 * MM), SUW.blued()));
  const hood = tubeZ(7.2 * MM, 6.4 * MM, 816.5 * MM, 829.5 * MM, 28, 0.35 * MM);
  hood.translate(0, 26.2 * MM, 0);
  out.push(part(hood, SUW.blued()));
  return out;
}

/** Later-production L-type flip rear sight (100 / 200 m leaves) on the receiver top. */
export function rearSight(): THREE.Object3D[] {
  const b = SUW.blued();
  const out: THREE.Object3D[] = [];
  out.push(part(G.rbox(11 * MM, 2.6 * MM, 26 * MM, 0.8 * MM), b, { p: P(0, 19.8, 533.5) }));
  for (const u of [523.8, 543.2]) {
    const rv = new THREE.SphereGeometry(1.7 * MM, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    rv.scale(1, 0.6, 1);
    out.push(part(rv, b, { p: P(0, 21.1, u) }));
  }
  const lug: V2[] = [[526.5, 20.5], [535.5, 20.5], [534.5, 25.4], [527.5, 25.4]];
  out.push(mirrorX(part(sidePlate(mmPts(lug), 1.4 * MM, 5.7 * MM, 0.3 * MM), b)));
  out.push(part(cylX(1.4 * MM, -6.6 * MM, 6.6 * MM, 12), b, { p: P(0, 23.2, 531) }));
  // standing 100 m leaf with the U notch
  const leaf: V2[] = [[-5, 21.4], [5, 21.4], [5, 31.8], [1.3, 31.8], [1.3, 29.4], [-1.3, 29.4], [-1.3, 31.8], [-5, 31.8]];
  out.push(part(frontPlate(mmPts(leaf), 1.8 * MM, 530.2 * MM, 0.3 * MM), b));
  // folded 200 m leaf lying forward
  out.push(part(G.rbox(9.6 * MM, 1.6 * MM, 12.5 * MM, 0.5 * MM), b, { p: P(0, 22.9, 538.4) }));
  return out;
}

// ------------------------------------------------------------------------------------------------
// Trigger group, magazine well, hinge

export function lowerParts(): THREE.Object3D[] {
  const s = SUW.stamped(), b = SUW.blued();
  const out: THREE.Object3D[] = [];
  // trigger guard (stamped loop)
  const bow: V2[] = [[400.5, -43.2], [400.6, -52], [397.4, -61.2], [389.5, -66], [370, -66.6], [352, -66.2], [344.4, -62], [340.8, -54], [340.6, -44.6]];
  const bp = bow.map(([u, y]) => P(0, y, u));
  const bn = bow.map(([u, y]) => v3(0, y + 50, u - 370).normalize());
  out.push(part(G.strap(bp, 11 * MM, 2.6 * MM, bn, { samples: 44 }), s));
  // trigger and the fire selector ahead of it
  const trig: V2[] = [[368.2, -44], [369.6, -51.5], [367.8, -58], [364.5, -61.8], [362.4, -61.2], [364.6, -56.4], [365.6, -50.5], [365.2, -44]];
  out.push(part(sidePlate(mmPts(trig), 5 * MM, 0, 1.1 * MM), b));
  const sel: V2[] = [[383, -44], [391.4, -44], [390.4, -48.6], [386.8, -51.8], [384, -50.6]];
  out.push(part(sidePlate(mmPts(sel), 4 * MM, 0, 0.8 * MM), b));
  // magazine well lip and the magazine catch behind it
  const lip: THREE.Vector3[] = [];
  const u0 = U.well0 - 1.5, u1 = U.well1, hx = 12.6;
  for (const [x, u] of [[hx, u0], [hx, u1], [-hx, u1], [-hx, u0]] as V2[]) lip.push(P(x, -44.4, u));
  out.push(part(G.strap(lip, 3 * MM, 1.2 * MM, v3(0, -1, 0), { closed: true, smooth: false }), s));
  const cat: V2[] = [[489.5, -43.5], [501.8, -43.5], [501.8, -47], [498.4, -52.6], [492.8, -53], [489.8, -49.5]];
  out.push(part(sidePlate(mmPts(cat), 11 * MM, 0, 0.9 * MM), b));
  for (let i = 0; i < 3; i++) out.push(part(G.box(9 * MM, 0.5 * MM, 0.8 * MM), SUW.internal(), { p: P(0, -51.4 + i * 2.2, 491.4 - i * 0.6) }));
  // hinge at the front of the lower receiver
  out.push(part(G.rbox(29 * MM, 18 * MM, 15 * MM, 3 * MM), s, { p: P(0, -18.6, 552.2) }));
  out.push(part(cylX(3 * MM, -16 * MM, 16 * MM, 16), b, { p: P(0, -21, 553) }));
  for (const sx of [1, -1]) {
    const h = new THREE.SphereGeometry(3.7 * MM, 16, 8);
    h.scale(0.45, 1, 1);
    out.push(part(h, b, { p: P(sx * 15.4, -21, 553) }));
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// Magazines

export function drum(): THREE.Object3D[] {
  const s = SUW.stamped();
  const out: THREE.Object3D[] = [];
  const body: V2[] = [
    [0, -32.2], [10, -32.2], [12, -31.6], [13, -30.6], [44, -30.6], [45, -31.4], [48, -31.4], [49, -30.6], [86, -30.6], [87, -31.4],
    [90, -31.4], [91, -30.6], [96.6, -30.6], [99.2, -29.6], [100, -27.6], [100, 23.4], [100.9, 24], [100.9, 25.6], [99.4, 26.4],
  ];
  const lid: V2[] = [
    [99.6, 23.2], [101.7, 23.2], [101.7, 28.8], [101, 29.8], [96, 30.4], [79, 30.9], [78, 31.9], [74.5, 32.1], [73.5, 31.1], [40, 32],
    [22, 33], [16.5, 33.3], [16, 34.2], [15, 36.6], [0, 36.6],
  ];
  const c = P(0, DRUM.y, DRUM.u);
  out.push(part(latheX(mmPts(body), 72, 40), s, { p: c }));
  out.push(part(latheX(mmPts(lid), 72, 40), s, { p: c }));
  // winding lever across the hub with its knob
  out.push(part(G.rbox(4.6 * MM, 30 * MM, 8.5 * MM, 2 * MM), SUW.blued(), { p: c.clone().add(P(38.4, 0, 0)) }));
  out.push(part(cylX(4.4 * MM, 36.6 * MM, 44.5 * MM, 16, 1.4 * MM), SUW.blued(), { p: c.clone().add(P(0, 13, 0)) }));
  // cover latch on the rim (upper rear)
  const th = 130 * D2R;
  out.push(part(G.rbox(7 * MM, 5 * MM, 18 * MM, 1.6 * MM), SUW.blued(), {
    p: P(22.5, DRUM.y + 101.5 * Math.sin(th), DRUM.u + 101.5 * Math.cos(th)),
    r: [-40, 0, 0],
  }));
  // feed tower (neck) into the magazine well, with stiffening ribs and a flared base
  out.push(part(G.rbox(20 * MM, 26 * MM, 42 * MM, 2.4 * MM), s, { p: P(0, -48.6, DRUM.u) }));
  out.push(part(G.rbox(26 * MM, 8 * MM, 52 * MM, 3 * MM), s, { p: P(0, -61.2, DRUM.u) }));
  out.push(mirrorX(part(G.rbox(1 * MM, 15 * MM, 3 * MM, 0.4 * MM), s, { p: P(10.2, -52.6, DRUM.u - 12) })));
  out.push(mirrorX(part(G.rbox(1 * MM, 15 * MM, 3 * MM, 0.4 * MM), s, { p: P(10.2, -52.6, DRUM.u + 12) })));
  return out;
}

/** 35-round curved box magazine: centreline, and the local frame at parameter t (0 = top). */
function boxCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3([P(0, -32, 526), P(0, -80, 527.5), P(0, -130, 533), P(0, -180, 543.5), P(0, -228, 557)], false, 'centripetal');
}

export function boxFrame(t: number): { p: THREE.Vector3; T: THREE.Vector3; N: THREE.Vector3 } {
  const cv = boxCurve();
  const p = cv.getPointAt(t);
  const T = cv.getTangentAt(t).normalize();
  const N = T.clone().cross(v3(1, 0, 0)).normalize();
  return { p, T, N };
}

export function boxMagazine(): THREE.Object3D[] {
  const s = SUW.stamped();
  const out: THREE.Object3D[] = [];
  const secs: THREE.Vector3[][] = [];
  const nS = 26, nR = 32;
  for (let i = 0; i <= nS; i++) {
    const t = i / nS;
    const { p, N } = boxFrame(t);
    const a = (10 + 0.6 * t) * MM, bb = (21 + 1.4 * t) * MM;
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j < nR; j++) {
      const ang = (j / nR) * Math.PI * 2;
      const cx = Math.sign(Math.cos(ang)) * Math.pow(Math.abs(Math.cos(ang)), 2 / 5);
      const cy = Math.sign(Math.sin(ang)) * Math.pow(Math.abs(Math.sin(ang)), 2 / 5);
      ring.push(p.clone().add(v3(cx * a, 0, 0)).addScaledVector(N, cy * bb));
    }
    secs.push(ring);
  }
  const g = G.crease(new G.LoftGeometry(secs, { closed: true, capStart: true, capEnd: true }), 50);
  G.ensureOutward(g);
  out.push(part(g, s));
  // stamped side ribs
  for (const sx of [1, -1]) {
    for (const off of [-9, 9]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) {
        const t = 0.2 + (0.72 * i) / 16;
        const { p, N } = boxFrame(t);
        pts.push(p.clone().add(v3(sx * (10 + 0.6 * t + 0.35) * MM, 0, 0)).addScaledVector(N, off * MM));
      }
      out.push(part(G.strap(pts, 2.6 * MM, 0.9 * MM, v3(sx, 0, 0), { smooth: false }), s));
    }
  }
  // floorplate
  const e = boxFrame(1);
  const fp = G.rbox(24 * MM, 4 * MM, 48 * MM, 1.4 * MM);
  out.push(part(orient(fp, e.p.clone().addScaledVector(e.T, 1.2 * MM), e.T.clone().negate()), s));
  return out;
}

// ------------------------------------------------------------------------------------------------
// Sling swivels and sling

const REAR_SW = { u: U.rearSwivel, y: -74 };
const FRONT_SW = { u: U.frontSwivel, y: 0 };

function fanPatch(outline: V2[], xOf: (u: number, y: number) => number): THREE.BufferGeometry {
  const cu = outline.reduce((a, p) => a + p[0], 0) / outline.length;
  const cy = outline.reduce((a, p) => a + p[1], 0) / outline.length;
  const pts = [P(xOf(cu, cy), cy, cu), ...outline.map(([u, y]) => P(xOf(u, y), y, u))];
  const pos: number[] = [];
  for (const p of pts) pos.push(p.x, p.y, p.z);
  const idx: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = 1 + i, b = 1 + ((i + 1) % outline.length);
    const e1 = pts[a].clone().sub(pts[0]), e2 = pts[b].clone().sub(pts[0]);
    if (e1.cross(e2).x >= 0) idx.push(0, a, b);
    else idx.push(0, b, a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function rearBarX(): number {
  return sideX(REAR_SW.u + 19.5, REAR_SW.y) + 2.6;
}

export function swivels(): THREE.Object3D[] {
  const b = SUW.blued();
  const out: THREE.Object3D[] = [];
  // rear: oval plate screwed to the left of the butt, stud and D loop lying against the wood
  const ov: V2[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    ov.push([REAR_SW.u + 2 + 15 * Math.cos(a), REAR_SW.y + 6.5 * Math.sin(a)]);
  }
  const plateTop = fanPatch(ov, (u, y) => sideX(u, y) + 1.3);
  out.push(part(plateTop, b));
  out.push(part(G.strap(ov.map(([u, y]) => P(sideX(u, y) + 0.65, y, u)), 1.3 * MM, 1.3 * MM, v3(1, 0, 0), { closed: true, smooth: false }), b));
  for (const du of [-10, 14]) out.push(...screw(P(sideX(REAR_SW.u + du, REAR_SW.y) + 1.3, REAR_SW.y, REAR_SW.u + du), v3(1, 0, 0), 2.6, 0.8));
  const xs = sideX(REAR_SW.u, REAR_SW.y);
  out.push(part(cylX(3.2 * MM, (xs + 1) * MM, (xs + 4.4) * MM, 14, 0.6 * MM), b, { p: P(0, REAR_SW.y, REAR_SW.u) }));
  const xl = rearBarX();
  const loopR = [[146.5, -69.5], [165, -65.2], [169.5, -68.6], [169.5, -79.4], [165, -82.8], [146.5, -78.5], [144.5, -74]].map(([u, y]) => P(xl, y, u));
  out.push(part(G.tube(loopR, 1.8 * MM, 8, 56, true), b));
  // front: welded bracket on the receiver's left side, stud and D loop pointing rearwards
  out.push(part(G.rbox(3 * MM, 11 * MM, 15 * MM, 1 * MM), b, { p: P(REC_R + 0.6, 0, FRONT_SW.u) }));
  out.push(part(cylX(2.8 * MM, (REC_R + 1.6) * MM, (REC_R + 5) * MM, 14, 0.5 * MM), b, { p: P(0, 0, FRONT_SW.u) }));
  const xf = REC_R + 3.4;
  const loopF = [[535.5, 4.5], [517, 8.8], [512.5, 5.4], [512.5, -5.4], [517, -8.8], [535.5, -4.5], [537.5, 0]].map(([u, y]) => P(xf, y, u));
  out.push(part(G.tube(loopF, 1.8 * MM, 8, 56, true), b));
  return out;
}

export function slingPoints(): { front: THREE.Vector3; rear: THREE.Vector3 } {
  return { front: P(REC_R + 3.4, 0, 512.5), rear: P(rearBarX(), REAR_SW.y, 169.5) };
}

function obstacles(): Capsule[] {
  const caps: Capsule[] = [];
  const st = [20, 120, 220, 300, 340];
  for (let i = 0; i < st.length - 1; i++) {
    const a = st[i], bb = st[i + 1];
    const ya = (stockTop(a) + stockBot(a)) / 2, yb = (stockTop(bb) + stockBot(bb)) / 2;
    caps.push({ a: P(0, ya, a), b: P(0, yb, bb), r: Math.min(20, (stockTop(a) - stockBot(a)) / 2) * MM });
  }
  caps.push({ a: P(0, -8, 320), b: P(0, -8, 548), r: 21 * MM });
  caps.push({ a: P(0, 0, 548), b: P(0, 0, 843), r: 18.5 * MM });
  caps.push({ a: P(0, -55, 345), b: P(0, -55, 398), r: 12 * MM });
  return caps;
}

export function ppshSling(gravity: THREE.Vector3, slack: number, withDrum: boolean): THREE.Group {
  const sp = slingPoints();
  const discs: Disc[] = withDrum ? [{ c: P(3, DRUM.y, DRUM.u), axis: v3(1, 0, 0), r: 103 * MM, h: 35 * MM }] : [];
  const caps = obstacles();
  if (!withDrum) {
    const top = boxFrame(0).p, bot = boxFrame(1).p;
    caps.push({ a: top, b: bot, r: 24 * MM });
  }
  return buildSling(
    {
      rear: { bar: sp.rear, axis: v3(0, 1, 0), r: 1.8 * MM },
      front: { bar: sp.front, axis: v3(0, 1, 0), r: 1.8 * MM },
      width: 24 * MM,
      thickness: 2 * MM,
      strap: SUW.canvas(),
      thread: SUW.thread(),
      hardware: SUW.blued(),
      side: v3(1, 0, 0),
      obstacles: caps,
      discs,
      buckle: { at: 0.28, w: 27 * MM, l: 8 * MM },
      tail: 0.042,
    },
    gravity,
    slack,
  );
}
