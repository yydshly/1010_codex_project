/**
 * IS-2 cast turret (1944, widened embrasure) with the 122 mm D-25T.
 *
 * Turret-local frame: origin on the hull roof at the turret-ring centre, +Z forward, +X = left.
 * The cast body is a signed-distance field (tapered plan with sloped sides, undercut bustle, the two
 * cheek bulges that flank the mantlet, a boss under the commander's cupola and the rear ball-mount
 * boss), meshed with Surface Nets. Crisp fittings are modelled as meshes: the cylindrical cast mantlet
 * with gun collar, coaxial DT and sight aperture, the D-25T barrel with its two-chamber muzzle brake,
 * the commander's cupola (six glazed vision slits, split hatch with MK-IV periscope), the loader's
 * hatch, two MK-IV periscopes, the ventilator cap, antenna socket, pistol ports, lifting lugs,
 * handrails, the rear DT ball mount and (optionally) the 12.7 mm DShK AA mount on the cupola ring.
 */
import { THREE, G, part, group, sdfMesh } from '../../../core/kit';
import { T } from './dims';
import type { Pal } from './palette';
import { latheZ, surfaceFrame, applyFrame, merge, xf, D2R, type P3, type P2 } from './util';
import { periscopeMk4 } from './hull';

const YT = T.roof;

/* ------------------------------------ cast body (SDF) ---------------------------------------- */

const PB = { zc: -0.1, hz: 1.24, hx: 1.05, rp: 0.36 };
const CHEEK = { x: 0.56, y: 0.29, z: 0.86, rx: 0.37, ry: 0.37, rz: 0.56 };
const CUP = { x: 0.55, z: -0.3, r: 0.33 };
const RMG = { x: 0.34, y: 0.36, z: -1.2 };
/** gun embrasure (front wall between the cheeks): radius round the trunnion axis, half width, rear */
const EMB = { r: 0.232, hx: 0.4, z0: 0.95 };
/** mantlet: inner radius of the bent plate (outer radius T.mantletR) */
const MANT_RI = 0.26;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function ellipsoid(x: number, y: number, z: number, rx: number, ry: number, rz: number): number {
  const k0 = Math.hypot(x / rx, y / ry, z / rz);
  const k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
/** bottom of the casting: flat, rising under the bustle (undercut) */
const yBot = (z: number) => 0.03 + Math.max(0, -z - 0.6) * 0.2;

/** Signed distance to the cast turret body (turret-local). */
export function turretSDF(x: number, y: number, z: number): number {
  // plan: rounded rectangle, tapering upwards (sloped walls), narrowing towards the bustle
  const ky = 1 + Math.max(0, y - 0.1) * 0.4 + Math.max(0, 0.1 - y) * 0.2;
  const kz = 1 + Math.max(0, -z - 0.2) * 0.3;
  const px = Math.abs(x) * ky * kz, pz = Math.abs((z - PB.zc) * ky);
  const qx = px - (PB.hx - PB.rp), qz = pz - (PB.hz - PB.rp);
  const d2 = (Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - PB.rp) / ky;
  // vertical extent with rounded roof edge and a small radius at the bottom
  const dTop = y - YT, dBot = yBot(z) - y;
  const dv = Math.max(dTop, dBot);
  const re = y > 0.35 ? 0.11 : 0.035;
  const wx = d2 + re, wy = dv + re;
  let d = Math.min(Math.max(wx, wy), 0) + Math.hypot(Math.max(wx, 0), Math.max(wy, 0)) - re;
  // cheek bulges either side of the mantlet
  const ax = Math.abs(x);
  let ch = ellipsoid(ax - CHEEK.x, y - CHEEK.y, z - CHEEK.z, CHEEK.rx, CHEEK.ry, CHEEK.rz);
  ch = Math.max(ch, dBot, y - (YT - 0.03));
  d = smin(d, ch, 0.14);
  // boss under the commander's cupola (left rear of the roof)
  const cb = Math.max(Math.hypot(x - CUP.x, z - CUP.z) - (CUP.r + 0.035), 0.32 - y, y - YT);
  d = smin(d, cb, 0.08);
  // rear ball-mount boss (left side of the rear wall)
  const rb = Math.hypot(x - RMG.x, (y - RMG.y) * 1.1, z - RMG.z) - 0.14;
  d = smin(d, rb, 0.05);
  // gun embrasure between the cheeks: the front wall is a cylinder round the trunnion axis, faired
  // back into the body; the mantlet turns in front of it with a small clearance
  const ez = clamp(z, EMB.z0, T.trunZ);
  const de = Math.hypot(z - ez, y - T.trunY) - EMB.r;
  const dx = ax - EMB.hx;
  const ew = de + 0.025, ex = dx + 0.025;
  const emb = Math.min(Math.max(ew, ex), 0) + Math.hypot(Math.max(ew, 0), Math.max(ex, 0)) - 0.025;
  d = smin(d, emb, 0.06);
  return d;
}

function castBody(P: Pal): THREE.Object3D[] {
  const g = sdfMesh(turretSDF, { min: [-1.12, -0.06, -1.5], max: [1.12, YT + 0.08, 1.72] }, 0.022, { project: 1 });
  // make the triangle winding agree with the (outward) gradient normals
  orientToNormals(g);
  dropHiddenBottom(g);
  return [part(g, P.cast)];
}

/**
 * Remove the downward-facing floor of the casting inside the turret ring (it rests on the hull
 * roof inside the ring collar and can never be seen).
 */
function dropHiddenBottom(g: THREE.BufferGeometry) {
  const pos = g.attributes.position, idx = g.index!;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const keep: number[] = [];
  for (let t = 0; t < idx.count; t += 3) {
    const i0 = idx.getX(t), i1 = idx.getX(t + 1), i2 = idx.getX(t + 2);
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    const low = Math.max(a.y, b.y, c.y) < 0.05;
    const cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3;
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    if (low && Math.hypot(cx, cz) < 0.95 && n.y < -0.5 * n.length()) continue;
    keep.push(i0, i1, i2);
  }
  g.setIndex(keep);
}

/** Flip the winding of an indexed mesh if most face normals disagree with its vertex normals. */
function orientToNormals(g: THREE.BufferGeometry) {
  const pos = g.attributes.position, nrm = g.attributes.normal, idx = g.index!;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  let score = 0;
  for (let t = 0; t < idx.count; t += 3 * 7) {
    const i0 = idx.getX(t), i1 = idx.getX(t + 1), i2 = idx.getX(t + 2);
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1).sub(a);
    c.fromBufferAttribute(pos, i2).sub(a);
    b.cross(c);
    n.fromBufferAttribute(nrm, i0);
    score += Math.sign(b.dot(n));
  }
  if (score < 0) G.flipWinding(g);
}

/** March from `from` along `dir` until the body is hit; return surface point and outward normal. */
export function hitBody(from: P3, dir: P3): { p: THREE.Vector3; n: THREE.Vector3 } {
  const d = new THREE.Vector3(...dir).normalize();
  const p = new THREE.Vector3(...from);
  let t = 0;
  for (let i = 0; i < 200; i++) {
    const v = turretSDF(p.x + d.x * t, p.y + d.y * t, p.z + d.z * t);
    if (v < 0.0005) break;
    t += Math.max(v * 0.8, 0.001);
  }
  const q = p.clone().addScaledVector(d, t);
  const h = 0.002;
  const n = new THREE.Vector3(
    turretSDF(q.x + h, q.y, q.z) - turretSDF(q.x - h, q.y, q.z),
    turretSDF(q.x, q.y + h, q.z) - turretSDF(q.x, q.y - h, q.z),
    turretSDF(q.x, q.y, q.z + h) - turretSDF(q.x, q.y, q.z - h),
  ).normalize();
  return { p: q, n };
}

/* ------------------------------------- gun & mantlet ----------------------------------------- */

function sectorOutline(r0: number, r1: number, a0: number, a1: number, seg = 16): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = a0 + ((a1 - a0) * i) / seg;
    pts.push([Math.cos(a) * r1, Math.sin(a) * r1]);
  }
  for (let i = seg; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / seg;
    pts.push([Math.cos(a) * r0, Math.sin(a) * r0]);
  }
  return pts;
}

/**
 * The loft of a C-shaped section gets its end caps wound inwards (they were culled, leaving the
 * mantlet ends open): turn every triangle lying in an end plane z = +-zEnd to face outwards.
 */
function capsOutward(g: THREE.BufferGeometry, zEnd: number) {
  if (g.index) g.copy(g.toNonIndexed());
  const pos = g.attributes.position, nrm = g.attributes.normal;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < pos.count; t += 3) {
    a.fromBufferAttribute(pos, t);
    b.fromBufferAttribute(pos, t + 1);
    c.fromBufferAttribute(pos, t + 2);
    const s = Math.sign(a.z);
    if ([a, b, c].some((v) => Math.abs(Math.abs(v.z) - zEnd) > 1e-6 || Math.sign(v.z) !== s)) continue;
    const nz = b.clone().sub(a).cross(c.clone().sub(a)).z;
    if (nz * s < 0) {
      pos.setXYZ(t + 1, c.x, c.y, c.z);
      pos.setXYZ(t + 2, b.x, b.y, b.z);
    }
    for (let k = 0; k < 3; k++) nrm.setXYZ(t + k, 0, 0, s);
  }
  pos.needsUpdate = true;
  nrm.needsUpdate = true;
}

function mantletAndGun(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const tY = T.trunY, tZ = T.trunZ, Ro = T.mantletR, Ri = MANT_RI;
  const a0 = -51 * D2R, a1 = 51 * D2R;
  // mantlet: cylindrical segment of bent rolled armour plate round the trunnion axis, rounded ends
  const ring = (k: number): P2[] => {
    const pts: P2[] = [];
    const ro = Ri + (Ro - Ri) * k;
    for (let i = 0; i <= 18; i++) {
      const a = a0 + ((a1 - a0) * i) / 18;
      // softened (chamfered) upper and lower plate edges
      const r = i === 0 || i === 18 ? ro - 0.016 : ro;
      pts.push([-(tZ + Math.cos(a) * r), tY + Math.sin(a) * r]);
    }
    for (let i = 4; i >= 0; i--) {
      const a = a0 + ((a1 - a0) * i) / 4;
      pts.push([-(tZ + Math.cos(a) * Ri), tY + Math.sin(a) * Ri]);
    }
    return pts;
  };
  // rounded ends: the full plate thickness runs to the ends, with a quarter-round over the outer edge
  const half = 0.425, rEnd = 0.045, steps = 5;
  const secs: { z: number; ring: P2[] }[] = [];
  for (let i = 0; i <= steps; i++) {
    const phi = (i / steps) * (Math.PI / 2);
    const e = rEnd * (1 - Math.cos(phi)), k = 0.7 + 0.3 * Math.sin(phi);
    secs.push({ z: -half + e, ring: ring(k) }, { z: half - e, ring: ring(k) });
  }
  secs.sort((a, b) => a.z - b.z);
  const mg = G.loftZ(secs, true, 50);
  capsOutward(mg, half);
  mg.rotateY(Math.PI / 2);
  out.push(part(mg, P.paint));
  // closed ends: side plates filling the bend down towards the trunnion, outside the embrasure
  for (const sx of [-1, 1]) {
    const cap = G.extrude(sectorOutline(0.1, Ri + 0.025, -49.5 * D2R, 49.5 * D2R, 12), 0.02, 0.003, 4, 1);
    cap.rotateY(-Math.PI / 2); // outline x -> forward (+Z), extrusion -> -X
    cap.translate(sx * (half - 0.013), tY, tZ); // spans |x| = half - 0.023 .. half - 0.003
    out.push(part(cap, P.paint));
  }
  const zs = (y: number) => tZ + Math.sqrt(Math.max(0, Ro * Ro - (y - tY) * (y - tY)));
  // gun collar with bolted flange
  out.push(part(latheZ([[0.0, tZ + 0.2], [0.2, tZ + 0.2], [0.2, 1.8], [0.226, 1.8], [0.226, 1.832], [0.212, 1.842], [0.19, 1.852], [0.186, 1.95], [0.172, 1.966], [0.0, 1.966]], 44, 40), P.cast, { p: [0, tY, 0] }));
  out.push(part(G.scatter(G.boltHead(0.026, 0.013), Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    return { p: [Math.cos(a) * 0.212, tY + Math.sin(a) * 0.212, 1.832] as G.V3, n: [0, 0, 1] as G.V3, spin: a };
  })), P.cast));
  // D-25T barrel: thick root section, long gentle taper; bore darkened at the muzzle
  const zB = T.muzzleZ - 0.605; // start of the muzzle brake
  out.push(
    part(
      latheZ(
        [[0.0, 1.95], [0.152, 1.95], [0.152, 2.02], [0.146, 2.05], [0.132, 2.3], [0.121, 2.36], [0.11, 2.45], [0.104, 3.2], [0.097, 4.6], [0.093, zB + 0.02], [0.0, zB + 0.02]],
        40, 25,
      ),
      P.paint,
      { p: [0, tY, 0] },
    ),
  );
  out.push(...muzzleBrake(P, zB, tY));
  // coaxial DT (right of the gun) and the telescopic sight aperture (left)
  const cy = tY + 0.02, cx = -0.25;
  out.push(part(latheZ([[0.0, -0.02], [0.05, -0.02], [0.05, 0.02], [0.038, 0.04], [0.0, 0.04]], 20, 40), P.cast, { p: [cx, cy, zs(cy) - 0.01] }));
  out.push(part(latheZ([[0.0, 0.0], [0.014, 0.0], [0.014, 0.075], [0.0, 0.075]], 12, 40), P.gun, { p: [cx, cy, zs(cy) + 0.02] }));
  out.push(part(G.cyl(0.006, 0.006, 0.01, 8), P.void, { p: [cx, cy, zs(cy) + 0.092], r: [90, 0, 0] }));
  const sy = tY + 0.07, sx = 0.27;
  out.push(part(G.rbox(0.09, 0.07, 0.05, 0.012, 1), P.cast, { p: [sx, sy, zs(sy) - 0.01] }));
  out.push(part(G.box(0.05, 0.035, 0.004), P.void, { p: [sx, sy - 0.005, zs(sy) + 0.016] }));
  out.push(part(G.box(0.044, 0.03, 0.004), P.vision, { p: [sx, sy - 0.005, zs(sy) + 0.012] }));
  out.push(part(G.rbox(0.12, 0.018, 0.07, 0.006, 1), P.cast, { p: [sx, sy + 0.045, zs(sy + 0.045) + 0.0], r: [-12, 0, 0] }));
  return out;
}

/** Two-chamber (TsAKB pattern) muzzle brake: rear clamp collar, three baffles, side windows. */
function muzzleBrake(P: Pal, z0: number, tY: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const R0 = 0.14, rb = 0.066;
  const zc0 = z0, zR = z0 + 0.12, zW1 = zR + 0.06, zM = zW1 + 0.16, zW2 = zM + 0.05, zF = zW2 + 0.16, zE = z0 + 0.605;
  // clamp collar over the barrel
  out.push(part(latheZ([[0.0, zc0], [0.116, zc0], [0.122, zc0 + 0.012], [0.122, zR - 0.01], [0.13, zR], [0.0, zR]], 36, 35), P.paint, { p: [0, tY, 0] }));
  // baffles: rear, middle and front rings, each an annulus round the projectile passage
  const baffle = (za: number, zb: number, chamferFront: boolean, chamferRear: boolean) =>
    part(
      latheZ(
        [
          [rb, za], [R0 - (chamferRear ? 0.012 : 0), za], [R0, za + (chamferRear ? 0.012 : 0)],
          [R0, zb - (chamferFront ? 0.014 : 0)], [R0 - (chamferFront ? 0.014 : 0), zb], [rb, zb], [rb, za],
        ],
        40, 35,
      ),
      P.paint,
      { p: [0, tY, 0] },
    );
  out.push(baffle(zR, zW1, false, true), baffle(zM, zW2, false, false), baffle(zF, zE, true, false));
  // top and bottom bridges between the baffles (the windows are the open sides)
  for (const [a0, a1] of [[48, 132], [228, 312]] as [number, number][]) {
    const g = G.extrude(sectorOutline(R0 - 0.035, R0, a0 * D2R, a1 * D2R, 14), zF - zW1 + 0.01, 0.004, 4, 1);
    g.translate(0, tY, (zW1 + zF) / 2);
    out.push(part(g, P.paint));
  }
  // dark bore at the barrel face and inside the passage
  out.push(part(G.cyl(0.061, 0.061, 0.004, 20), P.void, { p: [0, tY, z0 + 0.021], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.0655, 0.0655, zE - zR, 20, true), P.void, { p: [0, tY, (zR + zE) / 2], r: [90, 0, 0] }));
  return out;
}

/* ---------------------------------- roof fittings ------------------------------------------ */

function cupola(P: Pal, aa: boolean): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  // cast body: slightly conical drum, welded into the roof
  ps.push(part(G.lathe([[0.0, -0.02], [0.37, -0.02], [0.37, 0.012], [0.35, 0.03], [0.338, 0.19], [0.328, 0.205], [0.33, 0.212], [0.33, 0.232], [0.3, 0.24], [0.0, 0.24]], 56, 40), P.cast));
  // six vision slits: glass block in a dark slot, brow above, sill below
  for (let k = 0; k < 6; k++) {
    const a = (k * 60 + 30) * D2R;
    const s = Math.sin(a), c = Math.cos(a);
    const at = (r: number, y: number): G.V3 => [s * r, y, c * r];
    const ry = a / D2R;
    ps.push(part(G.box(0.13, 0.034, 0.02), P.void, { p: at(0.335, 0.115), r: [0, ry, 0] }));
    ps.push(part(G.box(0.11, 0.026, 0.004), P.vision, { p: at(0.345, 0.115), r: [0, ry, 0] }));
    ps.push(part(G.rbox(0.17, 0.024, 0.04, 0.007, 1), P.cast, { p: at(0.35, 0.145), r: [0, ry, 0] }));
    ps.push(part(G.rbox(0.16, 0.016, 0.03, 0.005, 1), P.cast, { p: at(0.346, 0.086), r: [0, ry, 0] }));
  }
  // rotating hatch ring (the DShK bracket rides on it)
  ps.push(part(G.lathe([[0.3, 0.232], [0.345, 0.232], [0.345, 0.262], [0.335, 0.27], [0.3, 0.27]], 56, 40), P.cast));
  // split hatch: two domed leaves hinged at the sides, with a visible parting gap
  for (const sx of [-1, 1]) {
    const half = G.lathe([[0.0, 0.3], [0.17, 0.296], [0.26, 0.284], [0.285, 0.272], [0.285, 0.262], [0.0, 0.262]], 24, 45, sx > 0 ? 0 : Math.PI, Math.PI);
    ps.push(part(half, P.cast, { p: [sx * 0.007, 0, 0] }));
    ps.push(part(G.rbox(0.016, 0.018, 0.5, 0.005, 1), P.cast, { p: [sx * 0.016, 0.3, 0] }));
    for (const z of [-0.11, 0.11]) {
      ps.push(part(G.cyl(0.016, 0.016, 0.075, 12), P.cast, { p: [sx * 0.302, 0.279, z], r: [90, 0, 0] }));
      ps.push(part(G.rbox(0.06, 0.014, 0.05, 0.004, 1), P.cast, { p: [sx * 0.268, 0.285, z] }));
    }
    ps.push(part(G.tube([[sx * 0.07, 0.298, -0.06], [sx * 0.09, 0.33, -0.05], [sx * 0.09, 0.33, 0.05], [sx * 0.07, 0.298, 0.06]], 0.008, 6), P.paint));
  }
  // MK-IV periscope in the right leaf, looking forward
  const p = periscopeMk4(P);
  p.position.set(-0.13, 0.29, 0.1);
  p.scale.setScalar(0.8);
  ps.push(p);
  if (aa) ps.push(dshkMount(P));
  return group(ps);
}

/** 12.7 mm DShK on its bracket, mounted on the cupola ring (cupola-local frame). */
function dshkMount(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  // bracket: clamp on the rear of the ring, strut up to the pintle cradle
  const bz = -0.34;
  ps.push(part(G.rbox(0.16, 0.05, 0.08, 0.012, 1), P.paint, { p: [0, 0.25, bz] }));
  ps.push(part(G.rod([0, 0.27, bz], [0, 0.52, bz + 0.02], 0.028, 14), P.paint));
  ps.push(part(G.rod([-0.06, 0.26, bz + 0.02], [0, 0.44, bz + 0.02], 0.014, 10), P.paint));
  ps.push(part(G.rod([0.06, 0.26, bz + 0.02], [0, 0.44, bz + 0.02], 0.014, 10), P.paint));
  ps.push(part(G.cyl(0.04, 0.04, 0.06, 16), P.paint, { p: [0, 0.54, bz + 0.02] }));
  // cradle yoke
  ps.push(part(G.rbox(0.16, 0.03, 0.08, 0.008, 1), P.paint, { p: [0, 0.585, bz + 0.03] }));
  for (const sx of [-1, 1]) ps.push(part(G.rbox(0.02, 0.09, 0.07, 0.006, 1), P.paint, { p: [sx * 0.075, 0.62, bz + 0.03] }));
  // the gun, elevated about 12 deg, pointing forward
  const gun = group(dshk(P), { p: [0, 0.64, bz + 0.03], r: [-12, 0, 0] });
  ps.push(gun);
  return group(ps);
}

/** DShK 1938: gun-local, trunnion at the origin, bore along +Z. */
function dshk(P: Pal): THREE.Object3D[] {
  const ps: THREE.Object3D[] = [];
  // receiver with top cover, back plate and spade grips
  ps.push(part(G.rbox(0.1, 0.12, 0.44, 0.01, 1), P.gun, { p: [0, 0.03, -0.02] }));
  ps.push(part(G.rbox(0.11, 0.03, 0.3, 0.008, 1), P.gun, { p: [0, 0.1, -0.04] }));
  ps.push(part(G.rbox(0.12, 0.13, 0.03, 0.008, 1), P.gun, { p: [0, 0.03, -0.25] }));
  for (const sx of [-1, 1]) {
    ps.push(part(G.rod([sx * 0.04, 0.03, -0.26], [sx * 0.08, 0.02, -0.36], 0.013, 8), P.gun));
    ps.push(part(G.rod([sx * 0.08, 0.02, -0.36], [sx * 0.08, -0.08, -0.37], 0.016, 10), P.gun));
  }
  ps.push(part(G.rbox(0.1, 0.02, 0.02, 0.005, 1), P.gun, { p: [0, 0.0, -0.37] }));
  // feed cover hinge and the cocking handle
  ps.push(part(G.cyl(0.012, 0.012, 0.12, 8), P.gun, { p: [0, 0.115, 0.1], r: [0, 0, 90] }));
  ps.push(part(G.rod([-0.05, 0.02, 0.05], [-0.1, 0.02, 0.05], 0.009, 8), P.gun));
  // K-8T collimator sight on the cover
  ps.push(part(G.rbox(0.05, 0.06, 0.07, 0.006, 1), P.gun, { p: [0, 0.145, 0.02] }));
  ps.push(part(G.cyl(0.02, 0.02, 0.004, 14), P.glass, { p: [0, 0.155, 0.057], r: [90, 0, 0] }));
  // barrel: finned cooling section, plain barrel, flat muzzle brake, front sight
  ps.push(part(latheZ([[0.0, 0.2], [0.028, 0.2], [0.028, 1.28], [0.0, 1.28]], 14, 40), P.gun, { p: [0, 0.02, 0] }));
  const fins: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 16; i++) fins.push(xf(G.cyl(0.046, 0.046, 0.008, 16), [0, 0.02, 0.24 + i * 0.022], [Math.PI / 2, 0, 0]));
  ps.push(part(merge(fins), P.gun));
  ps.push(part(G.rbox(0.065, 0.05, 0.1, 0.008, 1), P.gun, { p: [0, 0.02, 1.33] }));
  for (const sx of [-1, 1]) ps.push(part(G.box(0.004, 0.028, 0.04), P.void, { p: [sx * 0.033, 0.02, 1.34] }));
  ps.push(part(G.cyl(0.013, 0.013, 0.004, 10), P.void, { p: [0, 0.02, 1.382], r: [90, 0, 0] }));
  ps.push(part(G.rbox(0.008, 0.05, 0.02, 0.003, 1), P.gun, { p: [0, 0.07, 1.2] }));
  // 50-round belt box on the left
  ps.push(part(G.rbox(0.1, 0.2, 0.28, 0.01, 1), P.paint, { p: [0.11, -0.03, 0.0] }));
  ps.push(part(G.rbox(0.105, 0.02, 0.285, 0.006, 1), P.paint, { p: [0.11, 0.075, 0.0] }));
  ps.push(part(G.tube([[0.08, 0.09, -0.07], [0.11, 0.13, -0.07], [0.11, 0.13, 0.07], [0.08, 0.09, 0.07]], 0.006, 6), P.paint));
  return ps;
}

function loaderHatch(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, -0.01], [0.3, -0.01], [0.3, 0.02], [0.285, 0.03], [0.0, 0.03]], 44, 40), P.cast));
  ps.push(part(G.lathe([[0.0, 0.066], [0.2, 0.063], [0.262, 0.052], [0.272, 0.042], [0.272, 0.028], [0.0, 0.028]], 44, 45), P.cast));
  for (const x of [-0.11, 0.11]) ps.push(part(G.cyl(0.026, 0.026, 0.08, 12), P.cast, { p: [x, 0.05, -0.29], r: [0, 0, 90] }));
  ps.push(part(G.rbox(0.34, 0.04, 0.06, 0.012, 1), P.cast, { p: [0, 0.035, -0.27] }));
  ps.push(part(G.tube([[-0.07, 0.062, 0.13], [-0.06, 0.1, 0.13], [0.06, 0.1, 0.13], [0.07, 0.062, 0.13]], 0.009, 6), P.paint));
  ps.push(part(G.cyl(0.032, 0.036, 0.022, 14), P.cast, { p: [0, 0.075, 0.0] }));
  return group(ps);
}

function ventilator(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, -0.01], [0.15, -0.01], [0.15, 0.015], [0.12, 0.03], [0.115, 0.06], [0.0, 0.06]], 32, 40), P.cast));
  for (let k = 0; k < 4; k++) {
    const a = k * 90 * D2R + 45 * D2R;
    ps.push(part(G.rbox(0.024, 0.045, 0.034, 0.005, 1), P.cast, { p: [Math.sin(a) * 0.1, 0.08, Math.cos(a) * 0.1], r: [0, a / D2R, 0] }));
  }
  ps.push(part(G.cyl(0.11, 0.11, 0.004, 24), P.void, { p: [0, 0.062, 0] }));
  ps.push(part(G.lathe([[0.0, 0.17], [0.06, 0.166], [0.11, 0.152], [0.145, 0.132], [0.165, 0.11], [0.172, 0.096], [0.162, 0.09], [0.0, 0.09]], 40, 50), P.cast));
  return group(ps);
}

/** bent-rod handrail between a and b standing off along n */
function handrail(a: THREE.Vector3, b: THREE.Vector3, n: THREE.Vector3, off = 0.07, r = 0.011): THREE.BufferGeometry {
  const e = b.clone().sub(a).normalize().multiplyScalar(0.03);
  const pts = [
    a.clone().addScaledVector(n, -0.006),
    a.clone().addScaledVector(n, off * 0.6),
    a.clone().addScaledVector(n, off).add(e),
    a.clone().lerp(b, 0.5).addScaledVector(n, off),
    b.clone().addScaledVector(n, off).sub(e),
    b.clone().addScaledVector(n, off * 0.6),
    b.clone().addScaledVector(n, -0.006),
  ];
  return G.tube(pts, r, 8, 60);
}

function wallFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const rails: THREE.BufferGeometry[] = [];
  const side = (y: number, z: number, sx: number) => hitBody([sx * 1.4, y, z], [-sx, 0, 0]);
  for (const sx of [-1, 1]) {
    // handrail along the rear half of the side
    const a = side(0.46, -0.12, sx), b = side(0.46, -0.98, sx);
    rails.push(handrail(a.p, b.p, a.n.clone().add(b.n).setY(0).normalize()));
    // lifting lugs near the top edge
    for (const z of [0.55, -0.85]) {
      const h = side(0.6, z, sx);
      const fr = surfaceFrame(h.p, [0, 0, 1], h.n);
      out.push(applyFrame(group([
        part(G.rbox(0.035, 0.04, 0.11, 0.01, 1), P.cast, { p: [0, 0.012, 0] }),
        part(G.torus(0.04, 0.014, 8, 18, Math.PI * 1.25), P.cast, { p: [0, 0.03, 0], r: [0, 90, -20] }),
      ]), fr));
    }
    // pistol port with reinforcing ring and armoured plug
    const pp = side(0.32, -0.28, sx);
    const pf = surfaceFrame(pp.p, [0, 0, 1], pp.n);
    out.push(applyFrame(group([
      part(G.lathe([[0.0, -0.014], [0.105, -0.014], [0.102, 0.008], [0.09, 0.016], [0.0, 0.016]], 32, 40), P.cast),
      part(G.lathe([[0.0, 0.0], [0.05, 0.0], [0.05, 0.026], [0.038, 0.04], [0.0, 0.043]], 24, 40), P.cast),
    ]), pf));
  }
  // rear handrail on the right half of the rear wall (the ball mount is on the left)
  const ra = hitBody([-0.62, 0.5, -2.0], [0, 0, 1]), rb = hitBody([-0.08, 0.5, -2.0], [0, 0, 1]);
  rails.push(handrail(ra.p, rb.p, ra.n.clone().add(rb.n).setY(0).normalize()));
  out.push(part(merge(rails), P.paint));
  // rear DT in its ball mount
  const bm = hitBody([RMG.x, RMG.y, -2.0], [0, 0, 1]);
  const fr = surfaceFrame(bm.p, [1, 0, 0], [0, 0, -1]);
  out.push(applyFrame(group([
    part(G.lathe([[0.0, -0.04], [0.11, -0.04], [0.105, 0.0], [0.09, 0.02], [0.0, 0.02]], 32, 40), P.cast),
    part(new THREE.SphereGeometry(0.075, 24, 14), P.cast, { p: [0, 0.03, 0] }),
    part(G.lathe([[0.0, 0.08], [0.03, 0.08], [0.03, 0.12], [0.016, 0.13], [0.016, 0.19], [0.0, 0.19]], 16, 40), P.gun, { p: [0, 0.0, 0] }),
    part(G.cyl(0.007, 0.007, 0.006, 8), P.void, { p: [0, 0.19, 0] }),
  ]), fr));
  return out;
}

export function turret(P: Pal, aa: boolean): THREE.Group {
  const out: THREE.Object3D[] = [...castBody(P), ...mantletAndGun(P), ...wallFittings(P)];
  const cup = cupola(P, aa);
  cup.position.set(CUP.x, YT, CUP.z);
  const lh = loaderHatch(P);
  lh.position.set(-0.42, YT, -0.26);
  const pg = periscopeMk4(P);
  pg.position.set(0.4, YT, 0.5);
  const pl = periscopeMk4(P);
  pl.position.set(-0.44, YT, 0.36);
  const vt = ventilator(P);
  vt.position.set(0.0, YT, 0.62);
  out.push(cup, lh, pg, pl, vt);
  // antenna socket (armoured base) on the right of the roof
  out.push(part(G.lathe([[0.0, -0.01], [0.07, -0.01], [0.07, 0.02], [0.05, 0.035], [0.03, 0.04], [0.03, 0.09], [0.018, 0.1], [0.0, 0.1]], 20, 40), P.paint, { p: [-0.68, YT, 0.12] }));
  // weld bead round the cupola base
  const bead: THREE.Vector3[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    bead.push(new THREE.Vector3(CUP.x + Math.sin(a) * 0.375, YT - 0.004, CUP.z + Math.cos(a) * 0.375));
  }
  out.push(part(G.tube(bead, 0.007, 6, 96, true), P.cast));
  return group(out, { name: 'turret' });
}

export { clamp };
