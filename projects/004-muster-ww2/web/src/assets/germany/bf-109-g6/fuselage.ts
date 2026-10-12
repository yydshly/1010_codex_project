/**
 * Bf 109 G-6 fuselage, BODY frame (x port, y up from the thrust line, z = -s).
 *
 * The skin is one lofted grid (stations x ring columns) of super-elliptic sections whose
 * parameters vary smoothly along the fuselage; the cockpit opening is left out of the grid so
 * the interior is really visible through the glazing. Separate lofts add the MG 131 breech
 * blisters (Beulen), the port supercharger intake, the chin oil cooler, exhaust stacks,
 * spinner and the VDM three-blade propeller.
 */
import * as THREE from 'three';
import { part, group, mirrorX } from '../../../core/kit';
import { curve, gridGeo, lerp, smooth, clamp, latheY, ellipseRing, alignZ, frameBar, nacaT, nacaC, cosSpace, type P2 } from './geom';
import { B, DIM } from './frame';
import { skin, P } from './paint';

// ---------------------------------------------------------------- section model
const cT = curve([
  [0.6, 0.3], [0.72, 0.313], [1.0, 0.343], [1.4, 0.372], [1.8, 0.395], [2.2, 0.413], [2.585, 0.428],
  [2.93, 0.475], [3.3, 0.49], [3.6, 0.5], [4.05, 0.555], [4.5, 0.535], [5.2, 0.49], [6.0, 0.436],
  [6.8, 0.386], [7.5, 0.346], [8.0, 0.322], [8.3, 0.308], [8.6, 0.295],
]);
const cB = curve([
  [0.6, -0.3], [0.72, -0.326], [1.0, -0.392], [1.4, -0.455], [1.8, -0.505], [2.2, -0.548], [2.6, -0.578],
  [3.0, -0.594], [3.6, -0.6], [4.1, -0.592], [4.45, -0.566], [5.0, -0.49], [6.0, -0.335], [7.0, -0.18],
  [8.0, -0.025], [8.3, 0.025], [8.6, 0.07],
]);
const cW = curve([
  [0.6, 0.3], [0.72, 0.316], [1.0, 0.343], [1.4, 0.363], [1.8, 0.376], [2.2, 0.388], [2.6, 0.399],
  [3.0, 0.408], [3.4, 0.411], [3.8, 0.404], [4.2, 0.389], [4.8, 0.354], [5.5, 0.305], [6.2, 0.25],
  [6.9, 0.192], [7.5, 0.14], [8.0, 0.099], [8.3, 0.074], [8.6, 0.045],
]);
const cM = curve([
  [0.6, 0.0], [1.0, -0.02], [1.6, -0.035], [2.4, -0.03], [2.93, 0.0], [3.6, 0.01], [4.4, 0.04], [5.5, 0.045],
  [6.5, 0.06], [7.5, 0.1], [8.6, 0.17],
]);
const cNT = curve([
  [0.6, 2.0], [1.0, 2.15], [1.8, 2.3], [2.4, 2.5], [2.93, 3.0], [3.6, 3.0], [4.3, 2.35], [5.5, 2.15], [8.6, 2.0],
]);
const cNB = curve([[0.6, 2.0], [1.2, 2.25], [2.0, 2.5], [3.0, 2.6], [4.0, 2.5], [5.0, 2.2], [6.5, 2.0], [8.6, 1.9]]);

export const FUSE_S0 = 0.6;
export const FUSE_S1 = 8.6;

export interface Sec {
  yT: number;
  yB: number;
  hw: number;
  yM: number;
  nT: number;
  nB: number;
}
export function sec(s: number): Sec {
  return { yT: cT(s), yB: cB(s), hw: cW(s), yM: cM(s), nT: cNT(s), nB: cNB(s) };
}

/** Point on a section at parameter a (0 = top, PI/2 = port max width, PI = bottom). */
export function secPt(c: Sec, a: number): P2 {
  const sa = Math.sin(a), ca = Math.cos(a);
  const up = ca >= 0;
  const n = up ? c.nT : c.nB;
  const x = c.hw * Math.sign(sa) * Math.pow(Math.abs(sa), 2 / n);
  const h = up ? c.yT - c.yM : c.yM - c.yB;
  const y = c.yM + Math.sign(ca) * h * Math.pow(Math.abs(ca), 2 / n);
  return [x, y];
}

/** Half width of the skin at height y (>= 0; 0 above the top / below the bottom). */
export function fuseX(s: number, y: number): number {
  const c = sec(s);
  if (y >= c.yM) {
    const t = (y - c.yM) / (c.yT - c.yM);
    return t >= 1 ? 0 : c.hw * Math.pow(1 - Math.pow(t, c.nT), 1 / c.nT);
  }
  const t = (c.yM - y) / (c.yM - c.yB);
  return t >= 1 ? 0 : c.hw * Math.pow(1 - Math.pow(t, c.nB), 1 / c.nB);
}

/** Height of the upper skin at half width x (port), for x < hw. */
export function fuseYTop(s: number, x: number): number {
  const c = sec(s);
  const q = Math.min(0.999999, Math.abs(x) / c.hw);
  return c.yM + (c.yT - c.yM) * Math.pow(1 - Math.pow(q, c.nT), 1 / c.nT);
}
/** Height of the lower skin at half width x. */
export function fuseYBot(s: number, x: number): number {
  const c = sec(s);
  const q = Math.min(0.999999, Math.abs(x) / c.hw);
  return c.yM - (c.yM - c.yB) * Math.pow(1 - Math.pow(q, c.nB), 1 / c.nB);
}

/** Outward skin normal (body frame) on the port side at (s, y). */
export function fuseNormal(s: number, y: number): THREE.Vector3 {
  const e = 0.004;
  const dxdy = (fuseX(s, y + e) - fuseX(s, y - e)) / (2 * e);
  const dxds = (fuseX(s + e, y) - fuseX(s - e, y)) / (2 * e);
  // surface x = f(s, y); body z = -s
  return new THREE.Vector3(1, -dxdy, dxds).normalize();
}

// cockpit opening outline (plan view): windscreen base at 2.585, hood 2.93 - 3.60
export const CK = { sW: 2.585, sH0: 2.93, sH1: 3.6, sR1: 4.06, sillX: 0.3 };
export function openingHalfWidth(s: number): number {
  if (s < CK.sW || s > CK.sH1) return -1;
  if (s < CK.sH0) return lerp(0.15, CK.sillX, (s - CK.sW) / (CK.sH0 - CK.sW));
  return CK.sillX;
}
/** Hood sill height (straight line between the hood bows). */
export function sillY(s: number): number {
  return lerp(0.4, 0.424, (s - CK.sH0) / (CK.sH1 - CK.sH0));
}

// ---------------------------------------------------------------- skin
function stations(): number[] {
  const out: number[] = [];
  const add = (a: number, b: number, step: number) => {
    const n = Math.max(1, Math.round((b - a) / step));
    for (let i = 0; i < n; i++) out.push(a + ((b - a) * i) / n);
  };
  add(0.6, 1.0, 0.025);
  add(1.0, 2.5, 0.05);
  add(2.5, 4.3, 0.03);
  add(4.3, 7.6, 0.08);
  add(7.6, 8.6, 0.05);
  out.push(8.6);
  return out;
}

const NCOL = 128;

export function buildSkin(): THREE.BufferGeometry {
  const st = stations();
  const rows: THREE.Vector3[][] = [];
  for (const s of st) {
    const c = sec(s);
    const r: THREE.Vector3[] = [];
    for (let j = 0; j < NCOL; j++) {
      const [x, y] = secPt(c, (j / NCOL) * Math.PI * 2);
      r.push(B(x, y, s));
    }
    rows.push(r);
  }
  const skip = (i: number, j: number) => {
    const s = (st[i] + st[i + 1]) / 2;
    const hwOpen = openingHalfWidth(s);
    if (hwOpen < 0) return false;
    const p = rows[i][j], q = rows[i + 1][(j + 1) % NCOL];
    const xc = (p.x + q.x) / 2, yc = (p.y + q.y) / 2;
    return yc > 0.25 && Math.abs(xc) < hwOpen;
  };
  return gridGeo(rows, { closedU: true, capStart: true, capEnd: true, skip });
}

// ---------------------------------------------------------------- cowling details
/** MG 131 breech blister (port side). */
function beule(): THREE.BufferGeometry {
  const rows: THREE.Vector3[][] = [];
  const s0 = 1.86, s1 = 2.68;
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const s = lerp(s0, s1, i / n);
    const rise = smooth(s0, 2.26, s);
    const fall = 1 - smooth(2.5, s1, s) ** 1.5;
    const h = 0.08 * Math.pow(rise, 0.42) * fall + 0.0005;
    const w = (0.02 + 0.092 * Math.pow(rise, 0.38)) * (0.55 + 0.45 * fall);
    const xq = 0.235;
    const yq = fuseYTop(s, xq);
    // outward normal of the section at q
    const e = 0.004;
    const dy = (fuseYTop(s, xq + e) - fuseYTop(s, xq - e)) / (2 * e);
    const nrm = new THREE.Vector3(-dy, 1, 0).normalize(); // in (x, y)
    const tan = new THREE.Vector3(nrm.y, -nrm.x, 0);
    const d = 0.045;
    const c = B(xq, yq, s).addScaledVector(nrm, -d);
    rows.push(ellipseRing(c, nrm, tan, h + d, w, 28));
  }
  return gridGeo(rows, { closedU: true, capStart: true, capEnd: true });
}

/** Port supercharger intake scoop. */
function intake(): THREE.Object3D {
  const rows: THREE.Vector3[][] = [];
  const s0 = 1.93, s1 = 2.56;
  const yc = 0.03;
  const n = 18;
  let mouth = new THREE.Vector3();
  let rMouth = 0;
  for (let i = 0; i <= n; i++) {
    const s = lerp(s0, s1, i / n);
    const t = i / n;
    const r = lerp(0.078, 0.022, smooth(0.2, 1, t)) * (1 - 0.1 * smooth(0.0, 0.15, t));
    const out = lerp(0.052, -0.04, smooth(0.1, 1, t));
    const xs = fuseX(s, yc);
    const c = B(xs + out, yc - 0.012 * t, s);
    if (i === 0) {
      mouth = c.clone();
      rMouth = r;
    }
    rows.push(ellipseRing(c, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), r, r * 1.04, 28));
  }
  const shell = gridGeo(rows, { closedU: true, capStart: false, capEnd: true });
  const lip = new THREE.TorusGeometry(rMouth - 0.004, 0.0075, 10, 32);
  const inner = new THREE.CylinderGeometry(rMouth - 0.008, rMouth - 0.008, 0.07, 28, 1, true);
  inner.rotateX(Math.PI / 2);
  // flip inner cylinder faces inwards
  const ia = inner.index!.array as Uint16Array | Uint32Array;
  for (let k = 0; k < ia.length; k += 3) {
    const t = ia[k + 1];
    ia[k + 1] = ia[k + 2];
    ia[k + 2] = t;
  }
  inner.computeVertexNormals();
  const back = new THREE.CircleGeometry(rMouth - 0.006, 24);
  return group([
    part(shell, skin('FUSE')),
    part(lip, skin('FUSE'), { p: mouth }),
    part(inner, P.black(), { p: mouth.clone().add(new THREE.Vector3(0, 0, -0.035)) }),
    part(back, P.black(), { p: mouth.clone().add(new THREE.Vector3(0, 0, -0.065)) }),
  ]);
}

/** Chin oil cooler with intake, core and exit flap. */
function oilCooler(): THREE.Object3D {
  const s0 = 0.84, s1 = 1.62;
  const ring = (s: number, scale = 1, inset = 0): THREE.Vector3[] => {
    const yb = -0.52 - 0.02 * smooth(s0, s1, s) + inset;
    const hw = (0.15 + 0.012 * smooth(s0, s1, s)) * scale - inset;
    const hh = 0.14;
    const out: THREE.Vector3[] = [];
    const N = 36;
    for (let k = 0; k < N; k++) {
      const t = (k / N) * Math.PI * 2;
      const c = Math.cos(t), sn = Math.sin(t);
      const ex = 4.5;
      const x = hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / ex);
      const y = yb + hh + hh * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / ex);
      out.push(B(x, y, s));
    }
    return out;
  };
  const rows: THREE.Vector3[][] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) rows.push(ring(lerp(s0, s1, i / n)));
  const shell = gridGeo(rows, { closedU: true });
  // inner duct (faces inward: build then flip by reversing ring order)
  const irows: THREE.Vector3[][] = [];
  for (let i = 0; i <= 3; i++) irows.push(ring(lerp(s0 - 0.002, s0 + 0.09, i / 3), 1, 0.014).reverse());
  const duct = gridGeo(irows, { closedU: true });
  // flip normals of the duct (gridGeo orients away from centroid; we want towards it)
  const di = duct.index!.array as Uint32Array | Uint16Array;
  for (let k = 0; k < di.length; k += 3) {
    const t = di[k + 1];
    di[k + 1] = di[k + 2];
    di[k + 2] = t;
  }
  duct.computeVertexNormals();
  // lip: tube around the intake mouth
  const lipPts = ring(s0, 1, 0.007);
  lipPts.push(lipPts[0].clone());
  const lip = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPts, true), 72, 0.009, 8, true);
  // radiator core
  const yb0 = -0.52;
  const core = new THREE.BoxGeometry(0.28, 0.2, 0.02);
  // exit: dark rear face and a slightly opened flap
  const sf = s1;
  const ybF = -0.54;
  const flap = frameBar(B(0, ybF + 0.004, sf - 0.005), B(0, ybF - 0.022, sf + 0.13), 0.35, 0.008, new THREE.Vector3(0, 1, 0.2), 0, 0.003);
  const rear = new THREE.PlaneGeometry(0.33, 0.12);
  return group([
    part(shell, skin('FUSE')),
    part(duct, P.interior()),
    part(lip, skin('FUSE')),
    part(core, P.matrix(), { p: B(0, yb0 + 0.13, s0 + 0.075) }),
    part(flap, skin('FUSE')),
    part(rear, P.black(), { p: B(0, ybF + 0.07, sf - 0.004), r: [0, 180, 0] }),
  ]);
}

/** Six ejector exhaust stacks (port). */
function exhausts(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  for (let k = 0; k < 6; k++) {
    const s = 1.02 + k * 0.158;
    const y = -0.2 - 0.004 * k;
    const xs = fuseX(s, y);
    const base = B(xs - 0.03, y, s);
    const dir = new THREE.Vector3(0.56, -0.2, -0.8).normalize();
    const len = 0.1;
    const g = new THREE.CylinderGeometry(1, 1, len, 18, 1, true);
    g.translate(0, len / 2, 0);
    g.scale(0.033, 1, 0.018);
    // a closed, sooty bottom inside the stack
    const cap = new THREE.CircleGeometry(1, 18);
    cap.rotateX(-Math.PI / 2);
    cap.scale(0.03, 1, 0.016);
    cap.translate(0, len - 0.03, 0);
    const lipG = new THREE.TorusGeometry(1, 0.12, 6, 18);
    lipG.rotateX(Math.PI / 2);
    lipG.scale(0.032, 0.05, 0.018);
    lipG.translate(0, len, 0);
    // local y -> stack axis, local x (long axis of the oval) -> as close to vertical as possible
    const yl = dir.clone();
    const xl = new THREE.Vector3(0, 1, 0).addScaledVector(yl, -yl.y).normalize();
    const zl = new THREE.Vector3().crossVectors(xl, yl).normalize();
    const m = new THREE.Matrix4().makeBasis(xl, yl, zl).setPosition(base);
    for (const gg of [g, cap, lipG]) gg.applyMatrix4(m);
    out.push(part(g, P.exhaust()), part(lipG, P.exhaust()), part(cap, P.black()));
  }
  return group(out);
}

/** MG 131 blast tubes lying in the cowling troughs (port). */
function gunTubes(): THREE.Object3D {
  const x = 0.085;
  const a = B(x, fuseYTop(0.68, x) - 0.012, 0.66);
  const b = B(x, fuseYTop(1.0, x) - 0.022, 1.0);
  const g = new THREE.CylinderGeometry(0.016, 0.016, a.distanceTo(b), 14);
  const m = new THREE.Matrix4().compose(
    a.clone().add(b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()),
    new THREE.Vector3(1, 1, 1),
  );
  g.applyMatrix4(m);
  const bore = new THREE.CircleGeometry(0.011, 12);
  bore.applyMatrix4(alignZ(a.clone().add(new THREE.Vector3(0, 0, 0.0005)), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));
  return group([part(g, P.gun()), part(bore, P.black())]);
}

// ---------------------------------------------------------------- spinner & propeller
function spinner(): THREE.Object3D {
  const L = DIM.spinner.len, R = DIM.spinner.r;
  const prof: P2[] = [];
  prof.push([0.012, 0.03]);
  prof.push([0.019, 0.004]);
  prof.push([0.026, 0.0]);
  const n = 40;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const rho = (R * R + L * L) / (2 * R);
    const og = Math.sqrt(Math.max(0, rho * rho - (L * (1 - u)) ** 2)) + R - rho;
    const el = R * Math.sqrt(1 - (1 - u) ** 2);
    const r = Math.max(0.028, 0.5 * el + 0.5 * og);
    prof.push([r, u * L]);
  }
  prof.push([R + 0.001, L + 0.004]);
  prof.push([R - 0.01, L + 0.012]);
  prof.push([0.06, L + 0.014]);
  const g = latheY(prof, 64);
  g.rotateX(-Math.PI / 2); // +y -> -z (aft)
  const muzzle = new THREE.CylinderGeometry(0.017, 0.017, 0.06, 16, 1, true);
  muzzle.rotateX(Math.PI / 2);
  muzzle.translate(0, 0, -0.035);
  return group([part(g, P.rlm70()), part(muzzle, P.gun())]);
}

/** One VDM 9-12087 blade along +radial `er`, rotating towards `et` (body frame). */
function blade(er: THREE.Vector3, et: THREE.Vector3): THREE.BufferGeometry {
  const zf = new THREE.Vector3(0, 0, 1); // forward in the body frame
  const hub = B(0, 0, DIM.prop.plane);
  const chordAt = curve([[0.2, 0.1], [0.3, 0.13], [0.42, 0.25], [0.6, 0.3], [0.85, 0.305], [1.1, 0.285], [1.3, 0.25], [1.42, 0.2]]);
  const tcAt = curve([[0.2, 1.0], [0.3, 0.7], [0.45, 0.2], [0.7, 0.11], [1.0, 0.08], [1.5, 0.055]]);
  const Pitch = 2.6;
  const rows: THREE.Vector3[][] = [];
  const nr = 34;
  const us = cosSpace(18);
  const R0 = 0.19, R1 = DIM.prop.r;
  for (let i = 0; i <= nr; i++) {
    const t = i / nr;
    const r = lerp(R0, R1 - 0.002, 1 - Math.pow(1 - t, 1.15));
    let c = chordAt(Math.min(r, 1.42));
    // rounded tip
    if (r > 1.34) c *= Math.sqrt(Math.max(0.0025, 1 - ((r - 1.34) / (R1 - 1.34)) ** 2));
    const tc = tcAt(r);
    const beta = Math.atan(Pitch / (2 * Math.PI * Math.max(r, 0.35)));
    const chordDir = et.clone().multiplyScalar(-Math.cos(beta)).addScaledVector(zf, -Math.sin(beta));
    const nSuc = et.clone().multiplyScalar(-Math.sin(beta)).addScaledVector(zf, Math.cos(beta));
    const round = 1 - smooth(0.24, 0.4, r); // circular shank near the root
    const ring: THREE.Vector3[] = [];
    const piv = 0.4;
    const pts: P2[] = [];
    for (let k = us.length - 1; k >= 0; k--) pts.push([us[k], nacaC(us[k], 0.03, 0.4) + nacaT(us[k], tc)]);
    for (let k = 1; k < us.length - 1; k++) pts.push([us[k], nacaC(us[k], 0.03, 0.4) - nacaT(us[k], tc)]);
    const N = pts.length;
    for (let k = 0; k < N; k++) {
      let [u, v] = pts[k];
      let cu = (u - piv) * c, cv = v * c;
      if (round > 0) {
        const ang = (k / N) * Math.PI * 2;
        const rr = 0.052;
        cu = lerp(cu, rr * Math.cos(ang), round);
        cv = lerp(cv, rr * Math.sin(ang), round);
      }
      ring.push(hub.clone().addScaledVector(er, r).addScaledVector(chordDir, cu).addScaledVector(nSuc, cv));
    }
    rows.push(ring);
  }
  return gridGeo(rows, { closedU: true, capStart: true, capEnd: true });
}

function propeller(): THREE.Object3D {
  const blades: THREE.Object3D[] = [];
  for (let k = 0; k < 3; k++) {
    const ang = (k * 2 * Math.PI) / 3; // blade 0 points straight up
    const er = new THREE.Vector3(-Math.sin(ang), Math.cos(ang), 0);
    // clockwise seen from behind (looking forward): top blade moves to starboard (-x)
    const et = new THREE.Vector3(-Math.cos(ang), -Math.sin(ang), 0);
    blades.push(part(blade(er, et), P.rlm70()));
  }
  return group(blades);
}

// ---------------------------------------------------------------- antennas
function antennas(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  // mast on the spine behind the fixed rear glazing, raked back
  const sBase = 4.55;
  const base = B(0, fuseYTop(sBase, 0) - 0.01, sBase);
  const top = B(0, base.y + 0.3, sBase + 0.1);
  const rows: THREE.Vector3[][] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = base.clone().lerp(top, t);
    const ch = lerp(0.085, 0.035, t);
    const th = lerp(0.016, 0.008, t);
    const ring: THREE.Vector3[] = [];
    const N = 16;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      // streamlined (lens) section: chord along the body axis, thickness across
      const cz = Math.cos(a);
      const half = th * 0.5 * Math.pow(Math.abs(Math.sin(a)), 0.8) * (1 - 0.35 * Math.max(0, -cz));
      ring.push(p.clone().add(new THREE.Vector3(Math.sign(Math.sin(a)) * half, 0, cz * ch * 0.5)));
    }
    rows.push(ring);
  }
  out.push(part(gridGeo(rows, { closedU: true, capEnd: true }), skin('FUSE')));
  // aerial wire: mast top -> fin top, with insulators; lead-in to the starboard side
  const finTop = B(0, 0.975, 8.47);
  const wTop = top.clone().add(new THREE.Vector3(0, -0.01, -0.02));
  out.push(part(frameBar(wTop, finTop, 0.0032, 0.0032, new THREE.Vector3(0, 1, 0), 0, 0.0015), P.wire()));
  const ins = (p: THREE.Vector3, dir: THREE.Vector3) => {
    const g = new THREE.CapsuleGeometry(0.009, 0.05, 4, 10);
    g.applyMatrix4(
      new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()), new THREE.Vector3(1, 1, 1)),
    );
    return part(g, P.insulator());
  };
  const wd = finTop.clone().sub(wTop).normalize();
  out.push(ins(wTop.clone().addScaledVector(wd, 0.16), wd));
  out.push(ins(finTop.clone().addScaledVector(wd, -0.2), wd));
  const leadA = wTop.clone().addScaledVector(wd, 0.7);
  const leadB = B(-fuseX(5.0, 0.36) + 0.002, 0.36, 5.0);
  out.push(part(frameBar(leadA, leadB, 0.0025, 0.0025, new THREE.Vector3(0, 0, 1), 0, 0.001), P.wire()));
  out.push(ins(leadB.clone().add(new THREE.Vector3(-0.012, 0.02, 0)), leadA.clone().sub(leadB)));
  // FuG 25a whip under the rear fuselage
  const wb = B(0, fuseYBot(6.3, 0) + 0.01, 6.3);
  const wt = wb.clone().add(new THREE.Vector3(0, -0.3, -0.16));
  out.push(part(frameBar(wb, wt, 0.006, 0.006, new THREE.Vector3(0, 0, 1), 0, 0.0028), P.wire()));
  out.push(part(new THREE.CylinderGeometry(0.018, 0.022, 0.03, 14), P.black(), { p: wb.clone().add(new THREE.Vector3(0, -0.005, 0)) }));
  return group(out);
}

// ---------------------------------------------------------------- assembly
export function buildFuselage(): THREE.Object3D {
  const port = group([part(beule(), skin('FUSE')), intake(), exhausts(), gunTubes()]);
  const star = group([part(beule(), skin('FUSE')), exhausts(), gunTubes()]);
  const starM = mirrorX(star, false);
  return group([
    part(buildSkin(), skin('FUSE')),
    port,
    starM,
    oilCooler(),
    spinner(),
    propeller(),
    antennas(),
  ]);
}

export { clamp };
