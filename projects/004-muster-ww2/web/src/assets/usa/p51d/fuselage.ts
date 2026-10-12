/**
 * P-51D fuselage, BODY frame (x port, y up from the thrust line, z = -s).
 *
 * One lofted skin of super-elliptic sections whose parameters vary along the fuselage; the
 * cockpit opening is left out so the interior shows through the bubble canopy. Separate lofts:
 * the chin carburettor air scoop, the ventral radiator scoop (boundary-layer gap, intake lip,
 * duct, radiator face and opened exit flap). Also: six ejector exhaust stacks per side, spinner,
 * four-blade Hamilton Standard propeller (black, yellow tips) and the antenna mast.
 */
import * as THREE from 'three';
import { part, group, mirrorX } from '../../../core/kit';
import { curve, gridGeo, lerp, smooth, clamp, latheY, superRing, alignZ, bar, nacaT, nacaC, cosSpace, tint, flipAll, cylAB, type P2 } from './geom';
import { B, DIM, DEG } from './frame';
import { skin, P } from './paint';

// ---------------------------------------------------------------- section model
const cT = curve([
  [0.84, 0.393], [1.0, 0.405], [1.5, 0.437], [2.0, 0.469], [2.5, 0.503], [3.0, 0.536], [3.3, 0.556], [3.6, 0.6],
  [4.4, 0.62], [5.0, 0.607], [5.6, 0.565], [6.4, 0.497], [7.2, 0.435], [8.0, 0.378], [8.8, 0.332], [9.3, 0.3], [9.62, 0.27],
]);
const cB = curve([
  [0.84, -0.393], [1.0, -0.425], [1.5, -0.49], [2.0, -0.55], [2.5, -0.6], [3.0, -0.64], [4.0, -0.665], [5.0, -0.66],
  [5.6, -0.645], [6.4, -0.6], [7.2, -0.505], [8.0, -0.395], [8.6, -0.305], [9.1, -0.215], [9.62, -0.08],
]);
const cW = curve([
  [0.84, 0.393], [1.0, 0.401], [1.5, 0.409], [2.0, 0.414], [2.5, 0.419], [3.0, 0.424], [3.6, 0.43], [4.4, 0.43], [5.0, 0.42],
  [5.6, 0.39], [6.4, 0.335], [7.2, 0.27], [8.0, 0.2], [8.8, 0.13], [9.3, 0.075], [9.62, 0.03],
]);
const cM = curve([[0.84, 0], [2.0, -0.04], [3.3, -0.02], [4.4, 0.0], [5.6, -0.02], [7.2, -0.02], [8.8, 0.0], [9.62, 0.08]]);
const cNT = curve([[0.84, 2.0], [1.2, 2.2], [2.4, 2.5], [3.3, 3.0], [3.6, 3.3], [4.9, 3.3], [5.4, 2.6], [6.5, 2.3], [9.62, 2.2]]);
const cNB = curve([[0.84, 2.0], [1.5, 2.3], [3.0, 2.6], [5.5, 2.5], [7.5, 2.2], [9.62, 2.1]]);

export const FUSE_S0 = 0.84;
export const FUSE_S1 = 9.62;

interface Sec {
  yT: number;
  yB: number;
  hw: number;
  yM: number;
  nT: number;
  nB: number;
}
function sec(s: number): Sec {
  return { yT: cT(s), yB: cB(s), hw: cW(s), yM: cM(s), nT: cNT(s), nB: cNB(s) };
}
function secPt(c: Sec, a: number): P2 {
  const sa = Math.sin(a), ca = Math.cos(a);
  const up = ca >= 0;
  const n = up ? c.nT : c.nB;
  const x = c.hw * Math.sign(sa) * Math.pow(Math.abs(sa), 2 / n);
  const h = up ? c.yT - c.yM : c.yM - c.yB;
  const y = c.yM + Math.sign(ca) * h * Math.pow(Math.abs(ca), 2 / n);
  return [x, y];
}

/** Half width of the skin at height y (0 above the top / below the bottom). */
export function fuseX(s: number, y: number): number {
  const c = sec(s);
  if (y >= c.yM) {
    const t = (y - c.yM) / (c.yT - c.yM);
    return t >= 1 ? 0 : c.hw * Math.pow(1 - Math.pow(t, c.nT), 1 / c.nT);
  }
  const t = (c.yM - y) / (c.yM - c.yB);
  return t >= 1 ? 0 : c.hw * Math.pow(1 - Math.pow(t, c.nB), 1 / c.nB);
}
/** Height of the upper skin at half width x. */
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
/** Outward skin normal (port side) at (s, y). */
export function fuseNormal(s: number, y: number): THREE.Vector3 {
  const e = 0.004;
  const dxdy = (fuseX(s, y + e) - fuseX(s, y - e)) / (2 * e);
  const dxds = (fuseX(s + e, y) - fuseX(s - e, y)) / (2 * e);
  return new THREE.Vector3(1, -dxdy, dxds).normalize();
}

/** Cockpit: windscreen base at CK.sW, canopy sill from CK.sS, opening ends at CK.sE. */
export const CK = { sW: 3.3, sS: 3.62, sR0: 4.72, sE: 5.12, sillY: 0.44 };
/** Height of the cockpit opening edge (the canopy base) at station s. */
export function cutY(s: number): number {
  if (s < CK.sS) return lerp(0.545, CK.sillY, smooth(CK.sW, CK.sS, s));
  return lerp(CK.sillY, 0.62, smooth(CK.sR0, CK.sE, s));
}

// ---------------------------------------------------------------- skin
function stations(): number[] {
  const out: number[] = [];
  const add = (a: number, b: number, step: number) => {
    const n = Math.max(1, Math.round((b - a) / step));
    for (let i = 0; i < n; i++) out.push(a + ((b - a) * i) / n);
  };
  add(0.84, 1.1, 0.03);
  add(1.1, 3.2, 0.07);
  add(3.2, 5.2, 0.035);
  add(5.2, 8.0, 0.1);
  add(8.0, 9.62, 0.06);
  out.push(9.62);
  return out;
}
const NCOL = 112;

function buildSkin(): THREE.BufferGeometry {
  const st = stations();
  const rows: THREE.Vector3[][] = st.map((s) => {
    const c = sec(s);
    const r: THREE.Vector3[] = [];
    for (let j = 0; j < NCOL; j++) {
      const [x, y] = secPt(c, (j / NCOL) * Math.PI * 2);
      r.push(B(x, y, s));
    }
    return r;
  });
  const skip = (i: number, j: number) => {
    const s = (st[i] + st[i + 1]) / 2;
    if (s < CK.sW || s > CK.sE) return false;
    const p = rows[i][j], q = rows[i + 1][(j + 1) % NCOL];
    return (p.y + q.y) / 2 > cutY(s);
  };
  return gridGeo(rows, { capStart: true, capEnd: true, skip });
}

// ---------------------------------------------------------------- chin carburettor air scoop
function chinScoop(): THREE.Object3D {
  const s0 = 0.93, s1 = 2.72;
  const bot = curve([[0.93, -0.555], [1.3, -0.585], [1.8, -0.612], [2.3, -0.632], [2.72, -0.645]]);
  const top = curve([[0.93, -0.39], [1.3, -0.37], [1.8, -0.3], [2.72, -0.2]]);
  const hwc = curve([[0.93, 0.145], [1.3, 0.16], [1.8, 0.18], [2.3, 0.2], [2.72, 0.2]]);
  const ring = (s: number, inset = 0) => {
    const yb = bot(s) + inset, yt = top(s) - inset;
    return superRing(B(0, (yb + yt) / 2, s), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), hwc(s) - inset, (yt - yb) / 2, 3.2, 48);
  };
  const rows: THREE.Vector3[][] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) rows.push(ring(lerp(s0, s1, i / n)));
  const shell = gridGeo(rows, {});
  // mouth: rounded lip, dark duct, splitter and back face
  const lip = ring(s0, 0.008);
  const lipG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lip, true), 96, 0.01, 8, true);
  const duct = gridGeo([ring(s0 - 0.002, 0.016), ring(s0 + 0.12, 0.02)], { inward: true });
  const back = new THREE.PlaneGeometry(0.3, 0.2);
  back.translate(0, (bot(s0) + top(s0)) / 2, -(s0 + 0.12));
  const split = bar(B(0, bot(s0) + 0.02, s0 + 0.02), B(0, top(s0) - 0.02, s0 + 0.03), 0.012, 0.03, new THREE.Vector3(0, 0, 1), 0, 0.004);
  return group([part(shell, skin('FUSE')), part(lipG, skin('FUSE')), part(duct, P.black()), part(back, P.black()), part(split, P.black())]);
}

// ---------------------------------------------------------------- ventral radiator scoop
const RS = { lip: 4.75, exit: 6.86, flapEnd: 7.1 };
const rsBot = curve([[4.75, -1.055], [5.1, -1.115], [5.6, -1.13], [6.1, -1.1], [6.5, -1.03], [6.86, -0.95]]);
const rsHW = curve([[4.75, 0.285], [5.3, 0.305], [6.0, 0.3], [6.5, 0.275], [6.86, 0.25]]);
const rsTop = (s: number) => lerp(-0.745, -0.45, smooth(5.0, 5.35, s));

function radiatorScoop(): THREE.Object3D {
  const ring = (s: number, inset = 0) => {
    const yb = rsBot(s) + inset, yt = rsTop(s) - inset * 0.3;
    return superRing(B(0, (yb + yt) / 2, s), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), rsHW(s) - inset, (yt - yb) / 2, 3.4, 56);
  };
  const rows: THREE.Vector3[][] = [];
  const n = 36;
  for (let i = 0; i <= n; i++) rows.push(ring(lerp(RS.lip, RS.exit, i / n)));
  const shell = gridGeo(rows, {});
  const out: THREE.Object3D[] = [part(shell, skin('FUSE'))];
  // intake lip and inner duct
  const lip = ring(RS.lip, 0.008);
  out.push(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lip, true), 120, 0.011, 8, true), skin('FUSE')));
  out.push(part(gridGeo([ring(RS.lip - 0.002, 0.018), ring(RS.lip + 0.25, 0.02), ring(RS.lip + 0.5, 0.03)], { inward: true }), P.well()));
  // radiator / oil-cooler face inside the duct
  const cy = (rsBot(5.3) + rsTop(5.25)) / 2;
  const core = new THREE.BoxGeometry(0.5, 0.3, 0.03);
  core.translate(0, cy - 0.04, -(RS.lip + 0.5));
  out.push(part(core, P.matrix()));
  // exit: inner lining at the tail of the scoop, dark rear face
  out.push(part(gridGeo([ring(RS.exit - 0.35, 0.018), ring(RS.exit + 0.001, 0.012)], { inward: true }), P.well()));
  const rear = new THREE.PlaneGeometry(0.46, 0.34);
  rear.rotateY(Math.PI);
  rear.translate(0, -0.72, -(RS.exit - 0.3));
  out.push(part(rear, P.matrix()));
  // exit flap: curved plate hinged near the rear of the scoop floor, opened down
  const frows: THREE.Vector3[][] = [];
  const hinge = 6.62;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const s = lerp(hinge, RS.flapEnd, t);
    const yb = lerp(rsBot(hinge), -0.87, t) - 0.035 * Math.sin(t * Math.PI);
    const hw = lerp(rsHW(hinge) + 0.004, 0.235, t);
    const outer: THREE.Vector3[] = [], inner: THREE.Vector3[] = [];
    const N = 16;
    for (let k = 0; k <= N; k++) {
      const a = lerp(-1, 1, k / N);
      const lift = 0.012 * a * a;
      outer.push(B(a * hw, yb + lift, s));
      inner.push(B(a * (hw - 0.006), yb + lift + 0.008, s));
    }
    frows.push([...outer, ...inner.reverse()]);
  }
  out.push(part(gridGeo(frows, { closedU: true }), skin('FUSE')));
  // flap actuator link
  out.push(part(cylAB(B(0, rsBot(6.9) + 0.03, 6.9), B(0, -0.62, 6.75), 0.012), P.steel()));
  return group(out);
}

// ---------------------------------------------------------------- exhausts (port)
function exhausts(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  for (let k = 0; k < 6; k++) {
    const s = 1.5 + k * 0.148;
    const y = 0.035;
    const xs = fuseX(s, y);
    const base = B(xs - 0.04, y, s);
    const dir = new THREE.Vector3(0.62, -0.08, -0.78).normalize();
    const len = 0.105;
    // flattened stack, flaring slightly towards the outlet (fishtail)
    const g = new THREE.CylinderGeometry(1.15, 1, len, 20, 1, true);
    g.translate(0, len / 2, 0);
    g.scale(0.03, 1, 0.022);
    const cap = new THREE.CircleGeometry(1, 20);
    cap.rotateX(-Math.PI / 2);
    cap.scale(0.031, 1, 0.022);
    cap.translate(0, len - 0.035, 0);
    const lip = new THREE.TorusGeometry(1, 0.11, 6, 20);
    lip.rotateX(Math.PI / 2);
    lip.scale(0.034, 0.05, 0.025);
    lip.translate(0, len, 0);
    const yl = dir.clone();
    const xl = new THREE.Vector3(0, 1, 0).addScaledVector(yl, -yl.y).normalize();
    const zl = new THREE.Vector3().crossVectors(xl, yl).normalize();
    const m = new THREE.Matrix4().makeBasis(xl, yl, zl).setPosition(base);
    for (const gg of [g, cap, lip]) gg.applyMatrix4(m);
    out.push(part(g, P.exhaust()), part(lip, P.exhaust()), part(cap, P.black()));
  }
  return group(out);
}

// ---------------------------------------------------------------- spinner & propeller
function spinner(): THREE.Object3D {
  const L = DIM.spinner.len, R = DIM.spinner.r;
  const prof: P2[] = [[0.006, 0.0]];
  const n = 44;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    // blunt ogive
    const r = R * Math.pow(Math.max(0, 1 - Math.pow(1 - u, 1.9)), 0.62);
    prof.push([Math.max(0.01, r), u * L]);
  }
  prof.push([R - 0.004, L + 0.012]);
  prof.push([0.1, L + 0.014]);
  const g = latheY(prof, 72);
  g.rotateX(-Math.PI / 2); // +y -> -z (aft)
  // back plate ring between spinner and cowl
  const ring = new THREE.TorusGeometry(R - 0.006, 0.008, 8, 72);
  ring.translate(0, 0, -L);
  return group([part(g, skin('FUSE')), part(ring, P.black())]);
}

/** One Hamilton Standard blade along +radial er, rotating towards et (body frame). */
function blade(er: THREE.Vector3, et: THREE.Vector3): THREE.BufferGeometry {
  const zf = new THREE.Vector3(0, 0, 1);
  const hub = B(0, 0, DIM.prop.plane);
  const chordAt = curve([[0.2, 0.11], [0.3, 0.14], [0.45, 0.22], [0.7, 0.275], [1.0, 0.285], [1.3, 0.265], [1.55, 0.22], [1.68, 0.17]]);
  const tcAt = curve([[0.2, 1.0], [0.3, 0.6], [0.45, 0.2], [0.7, 0.11], [1.0, 0.08], [1.7, 0.055]]);
  const Pitch = 3.2;
  const rows: THREE.Vector3[][] = [];
  const nr = 36;
  const us = cosSpace(16);
  const R0 = 0.2, R1 = DIM.prop.r;
  const yel = new THREE.Color(0xd8a51e), blk = new THREE.Color(0x1c1c1d);
  for (let i = 0; i <= nr; i++) {
    const t = i / nr;
    const r = lerp(R0, R1 - 0.002, 1 - Math.pow(1 - t, 1.15));
    let c = chordAt(Math.min(r, 1.68));
    if (r > 1.52) c *= Math.sqrt(Math.max(0.0025, 1 - ((r - 1.52) / (R1 - 1.52)) ** 2));
    const tc = tcAt(r);
    const beta = Math.atan(Pitch / (2 * Math.PI * Math.max(r, 0.38)));
    const chordDir = et.clone().multiplyScalar(-Math.cos(beta)).addScaledVector(zf, -Math.sin(beta));
    const nSuc = et.clone().multiplyScalar(-Math.sin(beta)).addScaledVector(zf, Math.cos(beta));
    const round = 1 - smooth(0.26, 0.42, r);
    const pts: P2[] = [];
    for (let k = us.length - 1; k >= 0; k--) pts.push([us[k], nacaC(us[k], 0.03, 0.4) + nacaT(us[k], tc)]);
    for (let k = 1; k < us.length - 1; k++) pts.push([us[k], nacaC(us[k], 0.03, 0.4) - nacaT(us[k], tc)]);
    const N = pts.length;
    const ring: THREE.Vector3[] = [];
    for (let k = 0; k < N; k++) {
      const [u, v] = pts[k];
      let cu = (u - 0.4) * c, cv = v * c;
      if (round > 0) {
        const ang = (k / N) * Math.PI * 2;
        cu = lerp(cu, 0.058 * Math.cos(ang), round);
        cv = lerp(cv, 0.058 * Math.sin(ang), round);
      }
      ring.push(hub.clone().addScaledVector(er, r).addScaledVector(chordDir, cu).addScaledVector(nSuc, cv));
    }
    rows.push(ring);
  }
  const g = gridGeo(rows, { capStart: true, capEnd: true });
  // colour by radius: yellow tip (about 4 in), black blade
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).sub(hub);
    const r = v.dot(er);
    (r > R1 - 0.105 ? yel : blk).toArray(col, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

function propeller(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const phase = 42 * DEG;
  for (let k = 0; k < 4; k++) {
    const ang = phase + (k * Math.PI) / 2;
    const er = new THREE.Vector3(-Math.sin(ang), Math.cos(ang), 0);
    // clockwise seen from behind: the top blade moves to starboard (-x)
    const et = new THREE.Vector3(-Math.cos(ang), -Math.sin(ang), 0);
    out.push(part(blade(er, et), P.vpaint()));
  }
  return group(out);
}

// ---------------------------------------------------------------- antenna mast
function antenna(): THREE.Object3D {
  const sBase = 5.52;
  const base = B(0, fuseYTop(sBase, 0) - 0.01, sBase);
  const top = B(0, base.y + 0.36, sBase + 0.16);
  const rows: THREE.Vector3[][] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = base.clone().lerp(top, t);
    const ch = lerp(0.09, 0.025, t);
    const th = lerp(0.014, 0.006, t);
    const ring: THREE.Vector3[] = [];
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const cz = Math.cos(a);
      const half = th * 0.5 * Math.pow(Math.abs(Math.sin(a)), 0.8) * (1 - 0.35 * Math.max(0, -cz));
      ring.push(p.clone().add(new THREE.Vector3(Math.sign(Math.sin(a)) * half, 0, cz * ch * 0.5)));
    }
    rows.push(ring);
  }
  return part(gridGeo(rows, { capEnd: true }), P.black());
}

// ---------------------------------------------------------------- small fittings
function fittings(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  // fuselage fuel tank filler cap (port, behind the cockpit)
  {
    const s = 5.35, y = 0.47;
    const n = fuseNormal(s, y);
    const m = new THREE.Matrix4().compose(B(fuseX(s, y), y, s).addScaledVector(n, 0.001), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n), new THREE.Vector3(1, 1, 1));
    const g2 = new THREE.CylinderGeometry(0.045, 0.047, 0.006, 24);
    g2.applyMatrix4(m);
    out.push(part(g2, P.bare()));
  }
  // tail cone navigation light fairing / hook
  return group(out);
}

export function buildFuselage(): THREE.Object3D {
  return group([
    part(buildSkin(), skin('FUSE')),
    exhausts(),
    mirrorX(exhausts(), false),
    chinScoop(),
    radiatorScoop(),
    spinner(),
    propeller(),
    antenna(),
    fittings(),
  ]);
}

export { clamp, flipAll, tint };
