/**
 * Fw 190 A-8 fuselage, BODY frame (x port, y up from the thrust line, z = -s).
 *
 * One lofted skin of super-elliptic sections (cockpit opening left out so the interior shows
 * through the glazing). BMW 801 D-2 close cowling: rolled front lip of the armoured cowl ring,
 * the 12-blade engine cooling fan visible in the annular gap behind the large spinner, a dark
 * engine face behind it, supercharger intake scoops on the cowling sides, exhaust outlets behind
 * the cooling gills, MG 131 breech bulges ahead of the windscreen and the gun troughs.
 * VDM 9-12176 A three-blade propeller with wide wooden blades (static).
 */
import * as THREE from 'three';
import { part, group, mirrorX } from '../../../core/kit';
import { curve, gridGeo, lerp, smooth, latheY, ellipseRing, nacaT, nacaC, cosSpace, flipAll, cylAB, type P2 } from './geom';
import { B, DIM, sec, secPt, fuseX, fuseYTop, fuseNormal, openingHalfWidth, CK, FUSE_S0, FUSE_S1 } from './frame';
import { skin, P } from './paint';

// ---------------------------------------------------------------- skin
function stations(): number[] {
  const out: number[] = [];
  const add = (a: number, b: number, step: number) => {
    const n = Math.max(1, Math.round((b - a) / step));
    for (let i = 0; i < n; i++) out.push(a + ((b - a) * i) / n);
  };
  add(FUSE_S0, 1.0, 0.04);
  add(1.0, 1.9, 0.06);
  add(1.9, 5.1, 0.04);
  add(5.1, 8.4, 0.09);
  add(8.4, FUSE_S1, 0.05);
  out.push(FUSE_S1);
  return out;
}

const NCOL = 112;

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
    return yc > CK.sillY - 0.02 && Math.abs(xc) < hwOpen + 0.004;
  };
  return gridGeo(rows, { closedU: true, capStart: false, capEnd: true, skip });
}

// ---------------------------------------------------------------- cowling front, fan, engine face
function cowlFront(): THREE.Object3D {
  const { lip, rOpen } = DIM.cowl;
  const r0 = sec(FUSE_S0).hw;
  // rolled lip of the cowl ring: inner edge -> front -> outer edge (meets the skin start)
  const rc = (r0 + rOpen) / 2, rr = (r0 - rOpen) / 2;
  const prof: P2[] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (1 - i / n);
    prof.push([rc + rr * Math.cos(a), FUSE_S0 - (FUSE_S0 - lip) * Math.pow(Math.sin(a), 0.7)]);
  }
  const lipG = latheY(prof, 96);
  lipG.rotateX(-Math.PI / 2); // +y (s) -> -z
  const duct = latheY([[rOpen - 0.004, FUSE_S0 + 0.32], [rOpen, FUSE_S0]], 96);
  duct.rotateX(-Math.PI / 2);
  return group([part(lipG, skin('FUSE')), part(duct, P.black())]);
}

/** 12-blade engine cooling fan and the engine face behind it. */
function fanAndEngine(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const sF = 0.69;
  // fan hub
  const hub = latheY([[0.0, sF - 0.02], [0.2, sF - 0.02], [0.22, sF], [0.22, sF + 0.05]], 48);
  hub.rotateX(-Math.PI / 2);
  out.push(part(hub, P.fan()));
  // blades: thin twisted plates from r = 0.2 to 0.515
  const NB = 12;
  for (let k = 0; k < NB; k++) {
    const a = (k / NB) * Math.PI * 2;
    const er = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    const et = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0);
    const rows: THREE.Vector3[][] = [];
    for (let i = 0; i <= 4; i++) {
      const r = lerp(0.2, 0.515, i / 4);
      const ch = lerp(0.1, 0.13, i / 4);
      const tw = lerp(40, 28, i / 4) * (Math.PI / 180);
      const cd = et.clone().multiplyScalar(Math.cos(tw)).add(new THREE.Vector3(0, 0, Math.sin(tw)));
      const nd = new THREE.Vector3().crossVectors(er, cd).normalize();
      const c = B(0, 0, sF + 0.02).addScaledVector(er, r);
      const ring: THREE.Vector3[] = [];
      const N = 8;
      for (let j = 0; j < N; j++) {
        const t = (j / N) * Math.PI * 2;
        ring.push(c.clone().addScaledVector(cd, 0.5 * ch * Math.cos(t)).addScaledVector(nd, 0.005 * Math.sin(t)));
      }
      rows.push(ring);
    }
    out.push(part(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), P.fan()));
  }
  // engine face: reduction-gear housing dome and a dark disc with cylinder-head bumps
  const face = latheY(
    [[0.0, sF + 0.07], [0.16, sF + 0.08], [0.24, sF + 0.13], [0.3, sF + 0.2], [0.53, sF + 0.21], [0.53, sF + 0.3]],
    64,
  );
  face.rotateX(-Math.PI / 2);
  out.push(part(face, P.black()));
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.2;
    const g = new THREE.SphereGeometry(1, 12, 8);
    g.scale(0.07, 0.07, 0.04);
    g.translate(0.4 * Math.cos(a), 0.4 * Math.sin(a), -(sF + 0.19));
    out.push(part(g, P.fan()));
  }
  return group(out);
}

// ---------------------------------------------------------------- spinner & propeller
function spinner(): THREE.Object3D {
  const L = DIM.spinner.len, R = DIM.spinner.r;
  const prof: P2[] = [[0.004, 0.0]];
  const n = 40;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const el = R * Math.pow(1 - Math.pow(1 - u, 2.1), 1 / 2.1);
    const rho = (R * R + L * L) / (2 * R);
    const og = Math.sqrt(Math.max(0, rho * rho - (L * (1 - u)) ** 2)) + R - rho;
    prof.push([Math.max(0.006, 0.72 * el + 0.28 * og), u * L]);
  }
  prof.push([R - 0.01, L + 0.008]);
  prof.push([0.24, L + 0.012]);
  const g = latheY(prof, 72);
  g.rotateX(-Math.PI / 2); // +y -> -z (aft)
  return part(g, P.rlm70());
}

/** One wide VDM wooden blade along +radial er, rotating towards et (body frame). */
function blade(er: THREE.Vector3, et: THREE.Vector3): THREE.BufferGeometry {
  const zf = new THREE.Vector3(0, 0, 1);
  const hub = B(0, 0, DIM.prop.plane);
  const chordAt = curve([[0.26, 0.14], [0.38, 0.17], [0.5, 0.25], [0.7, 0.315], [1.0, 0.33], [1.25, 0.315], [1.45, 0.28], [1.58, 0.24]]);
  const tcAt = curve([[0.26, 1.0], [0.38, 0.72], [0.52, 0.28], [0.75, 0.15], [1.1, 0.1], [1.65, 0.07]]);
  const Pitch = 2.9;
  const R0 = 0.26, R1 = DIM.prop.r;
  const rTip = R1 - 0.16;
  const us = cosSpace(16);
  const ringAt = (r: number): THREE.Vector3[] => {
    let c = chordAt(Math.min(r, 1.58));
    if (r > rTip) c *= Math.sqrt(Math.max(0.004, 1 - ((r - rTip) / (R1 - rTip)) ** 2));
    const tc = tcAt(r);
    const beta = Math.atan(Pitch / (2 * Math.PI * Math.max(r, 0.4)));
    const chordDir = et.clone().multiplyScalar(-Math.cos(beta)).addScaledVector(zf, -Math.sin(beta));
    const nSuc = et.clone().multiplyScalar(-Math.sin(beta)).addScaledVector(zf, Math.cos(beta));
    const round = 1 - smooth(0.34, 0.5, r);
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
        cu = lerp(cu, 0.07 * Math.cos(ang), round);
        cv = lerp(cv, 0.07 * Math.sin(ang), round);
      }
      ring.push(hub.clone().addScaledVector(er, r).addScaledVector(chordDir, cu).addScaledVector(nSuc, cv));
    }
    return ring;
  };
  const rows: THREE.Vector3[][] = [];
  const nA = 30;
  for (let i = 0; i <= nA; i++) rows.push(ringAt(lerp(R0, rTip, 1 - Math.pow(1 - i / nA, 1.2))));
  const nB = 10;
  for (let i = 1; i <= nB; i++) rows.push(ringAt(lerp(rTip, R1 - 0.002, Math.sin((i / nB) * Math.PI * 0.5))));
  return gridGeo(rows, { closedU: true, capStart: true, capEnd: true });
}

function propeller(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  for (let k = 0; k < 3; k++) {
    const ang = (k * 2 * Math.PI) / 3;
    const er = new THREE.Vector3(-Math.sin(ang), Math.cos(ang), 0);
    // clockwise seen from behind: the top blade moves to starboard (-x)
    const et = new THREE.Vector3(-Math.cos(ang), -Math.sin(ang), 0);
    out.push(part(blade(er, et), P.rlm70()));
    // metal root ferrule where the blade leaves the spinner
    const a = B(0, 0, DIM.prop.plane).addScaledVector(er, 0.33), b = B(0, 0, DIM.prop.plane).addScaledVector(er, 0.4);
    out.push(part(cylAB(a, b, 0.074, 0.073, 24), P.steel()));
  }
  return group(out);
}

// ---------------------------------------------------------------- exhausts & intakes
/** Exhaust outlets behind the cooling gills (port side): four side stubs and two lower stubs. */
function exhausts(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const stub = (s: number, y: number, dir: THREE.Vector3, L: number, hh: number, hw: number) => {
    const xs = fuseX(s, y);
    const n = fuseNormal(s, y);
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(dir, -dir.y).normalize();
    const side = new THREE.Vector3().crossVectors(up, dir).normalize();
    const base = B(xs, y, s).addScaledVector(n, -0.03);
    const rows: THREE.Vector3[][] = [];
    const NR = 5;
    for (let i = 0; i <= NR; i++) {
      const t = i / NR;
      const c = base.clone().addScaledVector(dir, t * L);
      rows.push(ellipseRing(c, up, side, hh, hw, 18, 2.4));
    }
    out.push(part(gridGeo(rows, { closedU: true, capStart: true }), P.exhaust()));
    const mouth = base.clone().addScaledVector(dir, L - 0.01);
    out.push(part(gridGeo([ellipseRing(mouth, up, side, hh - 0.005, hw - 0.005, 18, 2.4), ellipseRing(mouth.clone().addScaledVector(dir, -0.002), up, side, 0.001, 0.001, 18)], { closedU: true }), P.black()));
  };
  const d1 = new THREE.Vector3(0.35, -0.05, -0.94).normalize();
  for (let k = 0; k < 4; k++) stub(1.84 + 0.018 * k, -0.14 - 0.07 * k, d1, 0.1, 0.03, 0.022);
  const d2 = new THREE.Vector3(0.25, -0.35, -0.9).normalize();
  for (let k = 0; k < 2; k++) stub(1.86, -0.46 - 0.06 * k, d2, 0.09, 0.028, 0.022);
  // sooty recess panel around the side outlets
  const rows: THREE.Vector3[][] = [];
  for (let i = 0; i <= 6; i++) {
    const s = lerp(1.79, 1.99, i / 6);
    const r: THREE.Vector3[] = [];
    for (let j = 0; j <= 10; j++) {
      const y = lerp(-0.1, -0.4, j / 10);
      r.push(B(fuseX(s, y) + 0.0015, y, s));
    }
    rows.push(r);
  }
  out.push(part(gridGeo(rows, { closedU: false }), P.black()));
  return group(out);
}

/** Supercharger intake scoop on the cowling side (port). */
function intake(): THREE.Object3D {
  const s0 = 1.12, s1 = 1.58, yc = 0.16;
  const rows: THREE.Vector3[][] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = lerp(s0, s1, t);
    const h = 0.055 * (1 - smooth(0.35, 1, t)) + 0.004;
    const hw = 0.085;
    const xs = fuseX(s, yc);
    const nn = fuseNormal(s, yc);
    const ring: THREE.Vector3[] = [];
    const N = 24;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const ly = hw * Math.sign(ca) * Math.pow(Math.abs(ca), 0.5);
      const lo = Math.max(-0.02, h * sa);
      ring.push(B(xs, yc + ly, s).addScaledVector(nn, lo));
    }
    rows.push(ring);
  }
  const shell = gridGeo(rows, { closedU: true, capEnd: true });
  const mouth = rows[0].map((p) => p.clone());
  const c = new THREE.Vector3();
  for (const p of mouth) c.add(p);
  c.multiplyScalar(1 / mouth.length);
  const inner = gridGeo([mouth.map((p) => p.clone().lerp(c, 0.15).add(new THREE.Vector3(0, 0, -0.01))), mouth.map((p) => p.clone().lerp(c, 0.9).add(new THREE.Vector3(0, 0, -0.03)))], { closedU: true });
  return group([part(shell, skin('FUSE')), part(inner, P.black())]);
}

/** MG 131 breech bulges on the gun cover ahead of the windscreen (port one; mirrored). */
function mg131Bulge(): THREE.Object3D {
  const s0 = 2.3, s1 = 3.02, xc = 0.2;
  const rows: THREE.Vector3[][] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = lerp(s0, s1, t);
    const env = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 0.55);
    const h = 0.055 * env + 0.001, w = 0.075 * env + 0.001;
    const yb = fuseYTop(s, xc);
    const ring = ellipseRing(B(xc, yb - 0.03, s), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), w, h + 0.03, 24);
    rows.push(ring);
  }
  return part(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), skin('FUSE'));
}

/** MG 131 muzzles sunk in the cowling troughs (port one; mirrored). */
function mg131Muzzle(): THREE.Object3D {
  const x = 0.105, s = 0.9;
  const y = fuseYTop(s, x) - 0.012;
  const a = B(x, y, s + 0.1), b = B(x, y, s - 0.02);
  const bore = new THREE.CircleGeometry(0.008, 12);
  bore.translate(b.x, b.y, b.z + 0.0005);
  return group([part(cylAB(a, b, 0.016, 0.016, 14), P.gun()), part(bore, P.black())]);
}

// ---------------------------------------------------------------- assembly
export function buildFuselage(): THREE.Object3D {
  return group([
    part(buildSkin(), skin('FUSE')),
    cowlFront(),
    fanAndEngine(),
    spinner(),
    propeller(),
    exhausts(),
    mirrorX(exhausts(), false),
    intake(),
    mirrorX(intake(), false),
    mg131Bulge(),
    mirrorX(mg131Bulge(), false),
    mg131Muzzle(),
    mirrorX(mg131Muzzle(), false),
  ]);
}
void flipAll;
