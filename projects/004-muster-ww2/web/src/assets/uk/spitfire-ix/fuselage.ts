/**
 * Spitfire LF Mk IXc fuselage, BODY frame (x port, y up from the thrust line, z = -s).
 *
 * One lofted skin of super-elliptic sections (cockpit opening left out so the interior shows
 * through the glazing), Merlin 66 cowling details: six fishtail exhaust stacks per side, the
 * carburettor air intake under the nose, the pointed Rotol spinner and four-blade propeller
 * (black blades, yellow tips), and the VHF aerial mast on the spine.
 */
import * as THREE from 'three';
import { part, group, mirrorX } from '../../../core/kit';
import { curve, gridGeo, lerp, smooth, latheY, ellipseRing, nacaT, nacaC, cosSpace, flipAll, type P2 } from './geom';
import { B, DIM, sec, secPt, fuseX, fuseYTop, fuseYBot, fuseNormal, openingHalfWidth, FUSE_S0, FUSE_S1 } from './frame';
import { skin, P } from './paint';

// ---------------------------------------------------------------- skin
function stations(): number[] {
  const out: number[] = [];
  const add = (a: number, b: number, step: number) => {
    const n = Math.max(1, Math.round((b - a) / step));
    for (let i = 0; i < n; i++) out.push(a + ((b - a) * i) / n);
  };
  add(FUSE_S0, 1.0, 0.03);
  add(1.0, 2.5, 0.06);
  add(2.5, 5.2, 0.034);
  add(5.2, 8.4, 0.08);
  add(8.4, FUSE_S1, 0.05);
  out.push(FUSE_S1);
  return out;
}

const NCOL = 96;

function buildSkin(): THREE.BufferGeometry {
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

// ---------------------------------------------------------------- exhausts
/** Six fishtail ejector stacks (port side). */
function exhausts(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  for (let k = 0; k < 6; k++) {
    const s = 1.26 + k * 0.172;
    const y = 0.075 - 0.003 * k;
    const xs = fuseX(s, y);
    const n = fuseNormal(s, y);
    const dir = new THREE.Vector3(0.42, -0.04, -0.9).normalize(); // outwards and aft
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(dir, -dir.y).normalize();
    const side = new THREE.Vector3().crossVectors(up, dir).normalize();
    const base = B(xs, y, s).addScaledVector(n, -0.03);
    const rows: THREE.Vector3[][] = [];
    const L = 0.115;
    const NR = 7;
    for (let i = 0; i <= NR; i++) {
      const t = i / NR;
      const c = base.clone().addScaledVector(dir, t * L);
      const hh = lerp(0.038, 0.058, smooth(0.35, 1, t)); // fishtail flare (vertical)
      const hw = lerp(0.02, 0.016, t);
      rows.push(ellipseRing(c, up, side, hh, hw, 20, 2.6));
    }
    out.push(part(gridGeo(rows, { closedU: true, capStart: true }), P.exhaust()));
    // sooty inside of the mouth
    const mouth = base.clone().addScaledVector(dir, L - 0.012);
    const cap = gridGeo([ellipseRing(mouth, up, side, 0.053, 0.013, 20, 2.6), ellipseRing(mouth.clone().addScaledVector(dir, -0.001), up, side, 0.001, 0.001, 20)], { closedU: true });
    out.push(part(cap, P.black()));
    // mounting flange on the cowling
    const fl = gridGeo(
      [ellipseRing(B(xs, y, s).addScaledVector(n, -0.006), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), 0.05, 0.032, 16, 3),
       ellipseRing(B(xs, y, s).addScaledVector(n, 0.008), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), 0.046, 0.028, 16, 3)],
      { closedU: true, capEnd: true },
    );
    out.push(part(fl, P.exhaust()));
  }
  return group(out);
}

// ---------------------------------------------------------------- carburettor intake
function carbIntake(): THREE.Object3D {
  const s0 = 1.04, s1 = 2.5;
  const ring = (s: number, inset = 0): THREE.Vector3[] => {
    const t = (s - s0) / (s1 - s0);
    const yb = fuseYBot(s, 0);
    const depth = 0.13 * (1 - smooth(0.25, 1, t) ** 1.2) + 0.004;
    const hw = lerp(0.1, 0.07, t) - inset;
    const bot = yb - depth + inset;
    const top = yb + 0.08;
    const cy = (bot + top) / 2, hh = (top - bot) / 2;
    return ellipseRing(B(0, cy, s), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), hw, hh, 36, 4.5);
  };
  const rows: THREE.Vector3[][] = [];
  for (let i = 0; i <= 20; i++) rows.push(ring(lerp(s0, s1, i / 20)));
  const shell = gridGeo(rows, { closedU: true, capEnd: true });
  const duct = flipAll(gridGeo([ring(s0 - 0.002, 0.009), ring(s0 + 0.12, 0.009)], { closedU: true }));
  const lipPts = ring(s0, 0.004);
  lipPts.push(lipPts[0].clone());
  const lip = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPts, true), 60, 0.0055, 8, true);
  const back = gridGeo([ring(s0 + 0.12, 0.009), ring(s0 + 0.121, 0.09)], { closedU: true });
  return group([part(shell, skin('FUSE')), part(duct, P.black()), part(lip, skin('FUSE')), part(back, P.black())]);
}

// ---------------------------------------------------------------- spinner & propeller
function spinner(): THREE.Object3D {
  const L = DIM.spinner.len, R = DIM.spinner.r;
  const prof: P2[] = [[0.004, 0.0]];
  const n = 44;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    // tangent ogive blended with an ellipse: long, pointed Rotol spinner
    const rho = (R * R + L * L) / (2 * R);
    const og = Math.sqrt(Math.max(0, rho * rho - (L * (1 - u)) ** 2)) + R - rho;
    const el = R * Math.sqrt(1 - (1 - u) ** 2);
    prof.push([Math.max(0.006, 0.62 * og + 0.38 * el), u * L]);
  }
  prof.push([R + 0.002, L + 0.004]);
  prof.push([R - 0.012, L + 0.014]);
  prof.push([0.08, L + 0.016]);
  const g = latheY(prof, 64);
  g.rotateX(-Math.PI / 2); // +y -> -z (aft)
  return part(g, P.sky());
}

/** One Rotol (Jablo) blade along +radial er, rotating towards et (body frame); returns [black, yellow tip]. */
function blade(er: THREE.Vector3, et: THREE.Vector3): THREE.BufferGeometry[] {
  const zf = new THREE.Vector3(0, 0, 1);
  const hub = B(0, 0, DIM.prop.plane);
  const chordAt = curve([[0.18, 0.11], [0.3, 0.155], [0.45, 0.245], [0.65, 0.278], [0.9, 0.28], [1.2, 0.262], [1.42, 0.232], [1.55, 0.2]]);
  const tcAt = curve([[0.18, 1.0], [0.3, 0.62], [0.45, 0.2], [0.7, 0.12], [1.0, 0.09], [1.6, 0.06]]);
  const Pitch = 2.4;
  const R0 = 0.17, R1 = DIM.prop.r;
  const rTip = R1 - 0.1;
  const us = cosSpace(18);
  const ringAt = (r: number): THREE.Vector3[] => {
    let c = chordAt(Math.min(r, 1.55));
    if (r > 1.42) c *= Math.sqrt(Math.max(0.0025, 1 - ((r - 1.42) / (R1 - 1.42)) ** 2));
    const tc = tcAt(r);
    const beta = Math.atan(Pitch / (2 * Math.PI * Math.max(r, 0.35)));
    const chordDir = et.clone().multiplyScalar(-Math.cos(beta)).addScaledVector(zf, -Math.sin(beta));
    const nSuc = et.clone().multiplyScalar(-Math.sin(beta)).addScaledVector(zf, Math.cos(beta));
    const round = 1 - smooth(0.22, 0.38, r);
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
        cu = lerp(cu, 0.056 * Math.cos(ang), round);
        cv = lerp(cv, 0.056 * Math.sin(ang), round);
      }
      ring.push(hub.clone().addScaledVector(er, r).addScaledVector(chordDir, cu).addScaledVector(nSuc, cv));
    }
    return ring;
  };
  const rowsA: THREE.Vector3[][] = [], rowsB: THREE.Vector3[][] = [];
  const nA = 30;
  for (let i = 0; i <= nA; i++) rowsA.push(ringAt(lerp(R0, rTip, 1 - Math.pow(1 - i / nA, 1.2))));
  const nB = 10;
  for (let i = 0; i <= nB; i++) rowsB.push(ringAt(lerp(rTip, R1 - 0.002, Math.sin((i / nB) * Math.PI * 0.5))));
  return [gridGeo(rowsA, { closedU: true, capStart: true }), gridGeo(rowsB, { closedU: true, capEnd: true })];
}

function propeller(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const off = 15 * (Math.PI / 180);
  for (let k = 0; k < 4; k++) {
    const ang = off + (k * Math.PI) / 2;
    const er = new THREE.Vector3(-Math.sin(ang), Math.cos(ang), 0);
    // clockwise seen from behind (Merlin, right-hand tractor): top blade moves to starboard (-x)
    const et = new THREE.Vector3(-Math.cos(ang), -Math.sin(ang), 0);
    const [a, b] = blade(er, et);
    out.push(part(a, P.black()), part(b, P.yellow()));
  }
  return group(out);
}

// ---------------------------------------------------------------- aerial mast
function mast(): THREE.Object3D {
  const sBase = 5.22;
  const base = B(0, fuseYTop(sBase, 0) - 0.012, sBase);
  const top = B(0, base.y + 0.5, sBase + 0.2);
  const rows: THREE.Vector3[][] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = base.clone().lerp(top, t);
    const ch = lerp(0.16, 0.045, t);
    const th = lerp(0.024, 0.009, t);
    const ring: THREE.Vector3[] = [];
    const N = 18;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      const cz = Math.cos(a);
      const half = th * 0.5 * Math.pow(Math.abs(Math.sin(a)), 0.8) * (1 - 0.4 * Math.max(0, -cz));
      ring.push(p.clone().add(new THREE.Vector3(Math.sign(Math.sin(a)) * half, 0, cz * ch * 0.5)));
    }
    rows.push(ring);
  }
  return part(gridGeo(rows, { closedU: true, capEnd: true }), skin('FUSE'));
}

// ---------------------------------------------------------------- assembly
export function buildFuselage(): THREE.Object3D {
  return group([
    part(buildSkin(), skin('FUSE')),
    exhausts(),
    mirrorX(exhausts(), false),
    carbIntake(),
    spinner(),
    propeller(),
    mast(),
  ]);
}
void fuseNormal;
