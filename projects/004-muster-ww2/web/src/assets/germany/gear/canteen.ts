/**
 * Feldflasche 31 (M31 canteen, 0.8 l) in its brown felt cover with press studs, the oval
 * drinking cup (Trinkbecher) inverted over the neck, and the leather harness (horizontal
 * band + vertical strap passing over the cup and through its handle bracket, with buckle
 * and carrying hook).
 *
 * Gear-local frame: +Z away from the body (front of the canteen), +Y up, the back of the felt
 * cover touches z = 0, origin at the carrying hook (which clips to the bread bag's D-ring).
 * Overall about 0.135 m wide, 0.26 m tall, 0.075 m deep.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { P } from './palette';
import { paramSurface, sheet, frameBuckle, pressStud, domeHead, placeAlong, roundEnds, lerp, sstep, planarNormals } from './util';

type V3 = [number, number, number];

// bottle (felt-covered) half dimensions and profile
const A = 0.0675; // half width
const B = 0.037; // half depth
const H = 0.19; // top of shoulder
const RB = 0.016; // bottom edge radius
const RS = 0.046; // shoulder radius (width)
const RSB = 0.029; // shoulder radius (depth)
/** Slight belly on the sides: widest in the lower half. */
const bulge = (y: number) => 1 + 0.03 * Math.sin(Math.PI * Math.min(1, Math.max(0, (y - RB) / (H - RS - RB))));
const KID = 0.007; // kidney bend (edges curve towards the body)
const EXP = 2.5;

interface Row { a: number; b: number; y: number }

// horizontal harness band: the felt is pressed in slightly under the leather
const BAND_Y = 0.098;
const BAND_HW = 0.0085;
const groove = (y: number) => 0.0011 * (1 - sstep(BAND_HW - 0.0008, BAND_HW + 0.0028, Math.abs(y - BAND_Y)));

function rows(): Row[] {
  const r: Row[] = [{ a: 0.0006, b: 0.0003, y: 0 }];
  for (let i = 0; i <= 7; i++) {
    const f = (i / 7) * (Math.PI / 2);
    r.push({ a: A - RB + RB * Math.sin(f), b: B - RB + RB * Math.sin(f), y: RB * (1 - Math.cos(f)) });
  }
  const ys = [0.034, 0.055, 0.074, BAND_Y - BAND_HW - 0.0035, BAND_Y - BAND_HW + 0.0005, BAND_Y - 0.004, BAND_Y + 0.004, BAND_Y + BAND_HW - 0.0005, BAND_Y + BAND_HW + 0.0035, 0.121, H - RS];
  for (const y of ys) r.push({ a: A * bulge(y), b: B * (0.5 + 0.5 * bulge(y)), y });
  for (let i = 1; i <= 12; i++) {
    const f = (i / 12) * (Math.PI / 2);
    r.push({ a: A - RS + RS * Math.cos(f), b: B - RSB + RSB * Math.cos(f), y: H - RS + RS * Math.sin(f) });
  }
  r.push({ a: 0.017, b: 0.012, y: H + 0.004 });
  r.push({ a: 0.0135, b: 0.0125, y: H + 0.006 });
  return r;
}

/** Section point: th = 0 -> +X edge, pi/2 -> front (+Z), pi -> -X edge, 3pi/2 -> back. */
function sec(th: number, a: number, b: number): THREE.Vector3 {
  const c = Math.cos(th), s = Math.sin(th);
  const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / EXP);
  let z = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / EXP);
  z -= KID * (a / A) * ((x / A) ** 2 - 0.35);
  return new THREE.Vector3(x, 0, z);
}

const ROWS = rows();
function bottlePoint(th: number, v: number): THREE.Vector3 {
  const f = v * (ROWS.length - 1);
  const i = Math.min(ROWS.length - 2, Math.floor(f));
  const t = f - i;
  const r0 = ROWS[i], r1 = ROWS[i + 1];
  const y = lerp(r0.y, r1.y, t);
  const g = groove(y);
  const p = sec(th, lerp(r0.a, r1.a, t) - g, lerp(r0.b, r1.b, t) - g);
  p.y = y;
  return p;
}
/** Felt surface point at height y on the section angle th (sides only, RB < y < H - RS). */
function sidePoint(th: number, y: number, off = 0): THREE.Vector3 {
  // follow the tessellated profile exactly (rows are linear in between), incl. the band groove
  let i = 0;
  while (i < ROWS.length - 2 && ROWS[i + 1].y < y) i++;
  const r0 = ROWS[i], r1 = ROWS[i + 1];
  const t = r1.y > r0.y ? Math.min(1, Math.max(0, (y - r0.y) / (r1.y - r0.y))) : 0;
  const g = groove(y);
  const p = sec(th, lerp(r0.a, r1.a, t) - g + off, lerp(r0.b, r1.b, t) - g + off);
  p.y = y;
  return p;
}

// cup (inverted over the neck, rim resting on the shoulder)
const CUP = { a: 0.0592, b: 0.0362, rimY: 0.173, h: 0.071, t: 0.0011 };

export function buildCanteen(): GearPiece {
  const felt = P.felt();
  const leather = P.brownLeather();
  const cupMat = P.blackPaint();
  const hw = P.hardware();
  const alu = P.alu();
  const parts: THREE.Object3D[] = [];

  // --- felt-covered bottle ---
  const NTH = 64, NV = ROWS.length - 1;
  const bottle = paramSurface((u, v) => bottlePoint(-u * Math.PI * 2, v), NTH, NV, true);
  G.ensureOutward(bottle);
  parts.push(part(bottle, felt));
  // felt overlap seam along the -X edge with four press studs
  const seamPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) seamPts.push(sidePoint(Math.PI + 0.12, lerp(0.012, H - 0.012, i / 10), 0.0006));
  const seamN = seamPts.map((p) => new THREE.Vector3(-1, 0, 0.35).normalize());
  parts.push(part(sheet(seamPts, seamN, 0.009, 0.0022, { across: 3, samples: 40 }), felt));
  for (const y of [0.04, 0.085, 0.13, 0.17]) {
    const p = sidePoint(Math.PI + 0.12, y, 0.0017);
    parts.push(part(placeAlong(pressStud(0.0052, 0.0024), p, [-1, 0, 0.35]), alu));
  }
  // neck (hidden under the cup, but modelled)
  parts.push(part(G.cyl(0.0125, 0.0135, 0.02, 20), alu, { p: [0, H + 0.014, 0] }));
  parts.push(part(G.cyl(0.0148, 0.0148, 0.016, 24), P.bakelite(), { p: [0, H + 0.03, 0] }));

  // --- drinking cup (inverted): superellipse walls, domed base on top, rolled rim ---
  const cupSec = (th: number, a: number, b: number) => {
    const c = Math.cos(th), s = Math.sin(th);
    return new THREE.Vector3(a * Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.6), 0, b * Math.sign(s) * Math.pow(Math.abs(s), 2 / 2.6));
  };
  const cupProfile: [number, number][] = [
    // [scale, y] from the rim upwards
    [1.0, 0],
    [0.995, CUP.h * 0.5],
    [0.985, CUP.h - 0.008],
    [0.955, CUP.h - 0.0025],
    [0.9, CUP.h],
    [0.0, CUP.h + 0.0008],
  ];
  const cupPt = (th: number, v: number, inset: number) => {
    const f = v * (cupProfile.length - 1);
    const i = Math.min(cupProfile.length - 2, Math.floor(f));
    const t = f - i;
    const sc = lerp(cupProfile[i][0], cupProfile[i + 1][0], t);
    const y = lerp(cupProfile[i][1], cupProfile[i + 1][1], t) - (i >= 3 ? inset : 0);
    const p = cupSec(th, Math.max(0.001, CUP.a * sc - inset), Math.max(0.001, CUP.b * sc - inset));
    p.y = CUP.rimY + y;
    return p;
  };
  const cupOut = paramSurface((u, v) => cupPt(-u * Math.PI * 2, v, 0), 48, 18, true);
  G.ensureOutward(cupOut);
  const cupIn = paramSurface((u, v) => cupPt(u * Math.PI * 2, v, CUP.t), 48, 18, true);
  parts.push(part(cupOut, cupMat), part(cupIn, cupMat));
  const rimPts: THREE.Vector3[] = [];
  for (let i = 0; i < 48; i++) {
    const p = cupSec((i / 48) * Math.PI * 2, CUP.a - CUP.t * 0.5, CUP.b - CUP.t * 0.5);
    p.y = CUP.rimY - 0.0004;
    rimPts.push(p);
  }
  parts.push(part(G.tube(rimPts, 0.0013, 6, 72, true), cupMat));

  // --- harness ---
  const SW = 0.0085; // half strap width (17 mm strap)
  const ST = 0.0026;
  // horizontal band around the waist
  const band: THREE.Vector3[] = [], bandN: THREE.Vector3[] = [];
  for (let i = 0; i < 48; i++) {
    const th = (i / 48) * Math.PI * 2;
    const p = sidePoint(th, BAND_Y, 0.0017);
    band.push(p);
    const q = sidePoint(th + 0.01, BAND_Y, 0.0017);
    const tg = q.clone().sub(p).normalize();
    bandN.push(tg.clone().cross(new THREE.Vector3(0, 1, 0)).normalize());
  }
  const bandGeo = sheet(band, bandN, SW, ST, { closed: true, across: 3, samples: 96 });
  parts.push(part(bandGeo, leather));
  // vertical strap in the x = 0 plane: front (lower) -> bottom -> back -> over the cup -> front
  const lift = (y: number) => 0.0016 + 0.0026 * (1 - sstep(0.004, 0.016, Math.abs(y - BAND_Y)));
  const vp: THREE.Vector3[] = [];
  const front = (y: number) => sidePoint(Math.PI / 2, y, lift(y));
  const back = (y: number) => sidePoint((3 * Math.PI) / 2, y, lift(y));
  // start just above the buckle on the front, go down
  for (const y of [0.132, 0.11, BAND_Y, 0.085, 0.06, 0.035, 0.016]) vp.push(front(y));
  vp.push(new THREE.Vector3(0, 0.0035, B - 0.012).setY(-0.0012));
  vp.push(new THREE.Vector3(0, -0.0016, 0.0));
  vp.push(new THREE.Vector3(0, -0.0012, -B + 0.006));
  for (const y of [0.016, 0.035, 0.06, 0.085, BAND_Y, 0.11, 0.135, 0.158]) vp.push(back(y));
  // up the back of the cup and over its base
  const cb = (y: number, s: number) => {
    const p = cupSec((3 * Math.PI) / 2, CUP.a, CUP.b * s + 0.0016);
    p.y = y;
    return p;
  };
  vp.push(cb(CUP.rimY + 0.004, 1.0));
  vp.push(cb(CUP.rimY + 0.04, 1.0));
  vp.push(cb(CUP.rimY + CUP.h - 0.006, 0.985));
  vp.push(new THREE.Vector3(0, CUP.rimY + CUP.h + 0.0022, -CUP.b * 0.55));
  vp.push(new THREE.Vector3(0, CUP.rimY + CUP.h + 0.0024, 0));
  vp.push(new THREE.Vector3(0, CUP.rimY + CUP.h + 0.0022, CUP.b * 0.55));
  const cf = (y: number, s: number, extra = 0) => {
    const p = cupSec(Math.PI / 2, CUP.a, CUP.b * s + 0.0016 + extra);
    p.y = y;
    return p;
  };
  vp.push(cf(CUP.rimY + CUP.h - 0.006, 0.985));
  vp.push(cf(CUP.rimY + 0.045, 1.0));
  vp.push(cf(CUP.rimY + 0.02, 1.0));
  vp.push(cf(CUP.rimY + 0.002, 1.0));
  vp.push(front(0.162));
  vp.push(front(0.148));
  const vN = vp.map((p, i) => {
    const a = vp[Math.max(0, i - 1)], b = vp[Math.min(vp.length - 1, i + 1)];
    const tg = b.clone().sub(a).normalize();
    const n = new THREE.Vector3(1, 0, 0).cross(tg).normalize();
    // outward from the canteen's vertical axis
    const out = new THREE.Vector3(0, p.y - 0.12, p.z);
    return n.dot(out) < 0 ? n.negate() : n;
  });
  parts.push(part(sheet(vp, vN, SW, ST, { across: 3, samples: 120 }), leather));
  // buckle on the front with the tail end passing through it
  const bp = front(0.139);
  const bg = frameBuckle(0.02, 0.014, 0.0013, true);
  bg.translate(bp.x, bp.y, bp.z + 0.0032);
  parts.push(part(bg, hw));
  const tail: THREE.Vector3[] = [];
  for (const y of [0.145, 0.137, 0.128, 0.12]) tail.push(front(y).add(new THREE.Vector3(0, 0, 0.0027)));
  const tailN = tail.map(() => new THREE.Vector3(0, 0, 1));
  parts.push(part(sheet(tail, tailN, roundEnds(SW * 0.95, 0, 0.007), ST * 0.9, { across: 3, samples: 16 }), leather));
  // keeper loop just below the buckle
  const kp = front(0.124);
  parts.push(part(G.rbox(SW * 2 + 0.004, 0.007, 0.0032, 0.0012, 2), leather, { p: [kp.x, kp.y, kp.z + 0.0035] }));

  // cup handle bracket over the strap on the cup front, with folded wire bail
  const hy = CUP.rimY + 0.03;
  const hz = CUP.b + 0.0016 + ST + 0.0012;
  parts.push(part(G.rbox(0.032, 0.012, 0.0014, 0.0005, 2), cupMat, { p: [0, hy, hz] }));
  for (const sx of [1, -1]) {
    parts.push(part(G.rbox(0.005, 0.012, hz - CUP.b, 0.0008, 1), cupMat, { p: [sx * 0.0145, hy, (hz + CUP.b) / 2] }));
    parts.push(part(placeAlong(domeHead(0.0022, 0.0012, 10), [sx * 0.0145, hy, hz + 0.0006], [0, 0, 1]), cupMat));
  }
  const bail: V3[] = [
    [0.0165, hy - 0.004, hz + 0.0012],
    [0.022, hy - 0.022, CUP.b + 0.0045],
    [0.0, hy - 0.03, CUP.b + 0.004],
    [-0.022, hy - 0.022, CUP.b + 0.0045],
    [-0.0165, hy - 0.004, hz + 0.0012],
  ];
  parts.push(part(G.tube(bail, 0.0013, 6, 48), hw));

  // carrying hook on the back strap (clips to the bread bag D-ring)
  const hookBase = cb(CUP.rimY + 0.012, 1.0).add(new THREE.Vector3(0, 0, -ST));
  const hookPts: V3[] = [
    [0, hookBase.y - 0.012, hookBase.z],
    [0, hookBase.y + 0.012, hookBase.z - 0.001],
    [0, hookBase.y + 0.026, hookBase.z - 0.004],
    [0, hookBase.y + 0.031, hookBase.z - 0.011],
    [0, hookBase.y + 0.026, hookBase.z - 0.017],
    [0, hookBase.y + 0.016, hookBase.z - 0.018],
  ];
  parts.push(part(sheet(hookPts, planarNormals(hookPts), 0.006, 0.0022, { across: 2, samples: 30 }), hw));
  // hook riveted through the strap
  parts.push(part(placeAlong(domeHead(0.0028, 0.0014, 10), [0, hookBase.y - 0.006, hookBase.z - 0.001], [0, 0, -1]), hw));
  parts.push(part(placeAlong(domeHead(0.0028, 0.0014, 10), [0, hookBase.y - 0.006, hookBase.z + ST + 0.0003], [0, 0, 1]), hw));

  // --- into the gear frame ---
  const inner = group(parts);
  const box = new THREE.Box3().setFromObject(inner, true);
  const hookTop = new THREE.Vector3(0, hookBase.y + 0.031, hookBase.z - 0.011);
  inner.position.set(0, -hookTop.y, -box.min.z);
  const object = group([inner]);
  object.name = 'de-feldflasche-31';
  const size = box.getSize(new THREE.Vector3());
  return {
    id: 'de-feldflasche-31',
    name: 'Feldflasche 31 with Trinkbecher',
    object,
    mount: 'belt-rear-right',
    size: { w: size.x, h: size.y, d: size.z },
    strapAnchors: [new THREE.Vector3(0, 0, hookTop.z - box.min.z)],
  };
}
