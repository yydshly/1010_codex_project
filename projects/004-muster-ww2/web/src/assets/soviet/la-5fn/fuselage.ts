/**
 * La-5FN fuselage, BODY frame (x port, y up from the thrust line, z = -s).
 *
 * One lofted skin of super-elliptic sections (cockpit opening left out so the interior shows
 * through the glazing). ASh-82FN close cowling: rolled front lip, the two rows of front shutter
 * blades (shown partly open) in front of a dark engine face with cylinder heads, the long
 * supercharger intake on top of the cowling, the two synchronised ShVAK cannon barrels lying in
 * their cowling troughs, split side cowl flaps standing slightly proud of the skin, individual
 * exhaust stubs emerging below them with the metal heat plates behind, and the ventral oil
 * cooler fairing. VISh-105V three-blade propeller (static) with a pointed spinner.
 */
import * as THREE from 'three';
import { part, group, mirrorX } from '../../../core/kit';
import { curve, gridGeo, lerp, smooth, latheY, ellipseRing, nacaT, nacaC, cosSpace, cylAB, type P2 } from './geom';
import { B, DIM, sec, secPt, fuseX, fuseYTop, fuseYBot, fuseNormal, openingHalfWidth, CK, FUSE_S0, FUSE_S1 } from './frame';
import { skin, P } from './paint';

// ---------------------------------------------------------------- skin
function stations(): number[] {
  const out: number[] = [];
  const add = (a: number, b: number, step: number) => {
    const n = Math.max(1, Math.round((b - a) / step));
    for (let i = 0; i < n; i++) out.push(a + ((b - a) * i) / n);
  };
  add(FUSE_S0, 1.0, 0.05);
  add(1.0, 2.2, 0.06);
  add(2.2, 4.4, 0.045);
  add(4.4, 7.9, 0.1);
  add(7.9, FUSE_S1, 0.05);
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
    return yc > CK.sillY - 0.02 && Math.abs(xc) < hwOpen + 0.004;
  };
  return gridGeo(rows, { closedU: true, capStart: false, capEnd: true, skip });
}

// ---------------------------------------------------------------- cowling front, shutters, engine face
function cowlFront(): THREE.Object3D {
  const { lip, rOpen } = DIM.cowl;
  const r0 = sec(FUSE_S0).hw;
  // rolled lip of the cowl ring: inner edge -> front -> outer edge (meets the skin start)
  const rc = (r0 + rOpen) / 2, rr = (r0 - rOpen) / 2;
  const prof: P2[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (1 - i / n);
    prof.push([rc + rr * Math.cos(a), FUSE_S0 - (FUSE_S0 - lip) * Math.pow(Math.sin(a), 0.7)]);
  }
  const lipG = latheY(prof, 96);
  lipG.rotateX(-Math.PI / 2); // +y (s) -> -z
  const duct = latheY([[rOpen - 0.004, FUSE_S0 + 0.3], [rOpen, FUSE_S0]], 96);
  duct.rotateX(-Math.PI / 2);
  return group([part(lipG, skin('FUSE')), part(duct, P.black())]);
}

/** Front shutters: two rows of 12 blades (partly open) and the engine face behind them. */
function shuttersAndEngine(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  // shutter ring carrier
  const ring = latheY([[0.27, 0.52], [0.3, 0.515], [0.3, 0.55], [0.27, 0.56]], 64);
  ring.rotateX(-Math.PI / 2);
  out.push(part(ring, P.engine()));
  const NB = 12;
  for (const [sRow, r0, r1, ph] of [[0.555, 0.3, 0.405, 0], [0.585, 0.395, 0.497, Math.PI / NB]] as const) {
    for (let k = 0; k < NB; k++) {
      const a = (k / NB) * Math.PI * 2 + ph;
      const er = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      const et = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0);
      const tw = 38 * (Math.PI / 180);
      const rows: THREE.Vector3[][] = [];
      for (let i = 0; i <= 2; i++) {
        const r = lerp(r0, r1, i / 2);
        const ch = ((2 * Math.PI * r) / NB) * 0.92;
        const cd = et.clone().multiplyScalar(Math.cos(tw)).add(new THREE.Vector3(0, 0, Math.sin(tw)));
        const nd = new THREE.Vector3().crossVectors(er, cd).normalize();
        const c = B(0, 0, sRow).addScaledVector(er, r);
        const rr: THREE.Vector3[] = [];
        const N = 6;
        for (let j = 0; j < N; j++) {
          const t = (j / N) * Math.PI * 2;
          rr.push(c.clone().addScaledVector(cd, 0.5 * ch * Math.cos(t)).addScaledVector(nd, 0.004 * Math.sin(t)));
        }
        rows.push(rr);
      }
      out.push(part(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), P.engine()));
    }
  }
  // engine face: reduction-gear housing and a dark disc with cylinder heads
  const sF = 0.62;
  const face = latheY(
    [[0.0, sF + 0.0], [0.16, sF + 0.01], [0.22, sF + 0.06], [0.26, sF + 0.12], [0.5, sF + 0.13], [0.5, sF + 0.25]],
    64,
  );
  face.rotateX(-Math.PI / 2);
  out.push(part(face, P.black()));
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.2;
    const g = new THREE.SphereGeometry(1, 12, 8);
    g.scale(0.07, 0.07, 0.05);
    g.translate(0.38 * Math.cos(a), 0.38 * Math.sin(a), -(sF + 0.11));
    out.push(part(g, P.engine()));
  }
  return group(out);
}

// ---------------------------------------------------------------- spinner & propeller
function spinner(): THREE.Object3D {
  const L = DIM.spinner.len, R = DIM.spinner.r;
  const prof: P2[] = [[0.003, 0.0]];
  const n = 36;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const el = R * Math.pow(1 - Math.pow(1 - u, 2.0), 1 / 2.0);
    const rho = (R * R + L * L) / (2 * R);
    const og = Math.sqrt(Math.max(0, rho * rho - (L * (1 - u)) ** 2)) + R - rho;
    prof.push([Math.max(0.005, 0.45 * el + 0.55 * og), u * L]);
  }
  prof.push([R - 0.008, L + 0.006]);
  prof.push([0.2, L + 0.01]);
  const g = latheY(prof, 64);
  g.rotateX(-Math.PI / 2); // +y -> -z (aft)
  return part(g, P.amt12());
}

/** Spinner radius at station s (for blade roots). */
function spinnerR(s: number): number {
  const L = DIM.spinner.len, R = DIM.spinner.r;
  const u = Math.min(1, Math.max(0, s / L));
  const el = R * Math.pow(1 - Math.pow(1 - u, 2.0), 1 / 2.0);
  const rho = (R * R + L * L) / (2 * R);
  const og = Math.sqrt(Math.max(0, rho * rho - (L * (1 - u)) ** 2)) + R - rho;
  return 0.45 * el + 0.55 * og;
}

/** One VISh-105V metal blade along +radial er, rotating towards et (body frame). */
function blade(er: THREE.Vector3, et: THREE.Vector3): THREE.BufferGeometry {
  const zf = new THREE.Vector3(0, 0, 1);
  const hub = B(0, 0, DIM.prop.plane);
  const chordAt = curve([[0.16, 0.095], [0.3, 0.13], [0.45, 0.19], [0.7, 0.225], [1.0, 0.225], [1.25, 0.205], [1.42, 0.175], [1.52, 0.15]]);
  const tcAt = curve([[0.16, 1.0], [0.28, 0.62], [0.42, 0.22], [0.7, 0.12], [1.1, 0.08], [1.55, 0.06]]);
  const Pitch = 2.6;
  const R0 = 0.16, R1 = DIM.prop.r;
  const rTip = R1 - 0.12;
  const us = cosSpace(14);
  const ringAt = (r: number): THREE.Vector3[] => {
    let c = chordAt(Math.min(r, 1.52));
    if (r > rTip) c *= Math.sqrt(Math.max(0.004, 1 - ((r - rTip) / (R1 - rTip)) ** 2));
    const tc = tcAt(r);
    const beta = Math.atan(Pitch / (2 * Math.PI * Math.max(r, 0.35)));
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
        cu = lerp(cu, 0.05 * Math.cos(ang), round);
        cv = lerp(cv, 0.05 * Math.sin(ang), round);
      }
      ring.push(hub.clone().addScaledVector(er, r).addScaledVector(chordDir, cu).addScaledVector(nSuc, cv));
    }
    return ring;
  };
  const rows: THREE.Vector3[][] = [];
  const nA = 26;
  for (let i = 0; i <= nA; i++) rows.push(ringAt(lerp(R0, rTip, 1 - Math.pow(1 - i / nA, 1.2))));
  const nB = 8;
  for (let i = 1; i <= nB; i++) rows.push(ringAt(lerp(rTip, R1 - 0.002, Math.sin((i / nB) * Math.PI * 0.5))));
  return gridGeo(rows, { closedU: true, capStart: true, capEnd: true });
}

function propeller(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const rs = spinnerR(DIM.prop.plane);
  for (let k = 0; k < 3; k++) {
    const ang = (k * 2 * Math.PI) / 3 + 0.35;
    const er = new THREE.Vector3(-Math.sin(ang), Math.cos(ang), 0);
    const et = new THREE.Vector3(-Math.cos(ang), -Math.sin(ang), 0);
    out.push(part(blade(er, et), P.blade()));
    // blade cuff where the blade leaves the spinner
    const a = B(0, 0, DIM.prop.plane).addScaledVector(er, rs - 0.03), b = B(0, 0, DIM.prop.plane).addScaledVector(er, rs + 0.03);
    out.push(part(cylAB(a, b, 0.056, 0.054, 20), P.steel()));
  }
  return group(out);
}

// ---------------------------------------------------------------- top intake
/** Long supercharger air intake along the top of the cowling (centreline). */
function topIntake(): THREE.Object3D {
  const s0 = 0.46, s1 = 1.62, w = 0.115;
  const hAt = (s: number) => 0.12 * (1 - smooth(1.2, s1, s)) + 0.004;
  const rows: THREE.Vector3[][] = [];
  const n = 22;
  const ringAt = (s: number, shrink = 0) => {
    const yb = fuseYTop(Math.max(FUSE_S0 + 0.01, s), 0) - 0.05;
    const yt = fuseYTop(Math.max(FUSE_S0 + 0.01, s), 0) + hAt(s);
    const yc = (yb + yt) / 2;
    return ellipseRing(B(0, yc, s), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), w - shrink, (yt - yb) / 2 - shrink, 28, 3.2);
  };
  for (let i = 0; i <= n; i++) rows.push(ringAt(lerp(s0, s1, i / n)));
  const shell = gridGeo(rows, { closedU: true, capEnd: true });
  // mouth: lip ring into a dark throat
  const outer = rows[0];
  const inner = ringAt(s0, 0.012);
  const lip = gridGeo([outer, inner], { closedU: true });
  const throat = gridGeo([inner, ringAt(s0 + 0.2, 0.02).map((p) => p.clone())], { closedU: true, inward: true, capEnd: true });
  return group([part(shell, skin('FUSE')), part(lip, skin('FUSE')), part(throat, P.black())]);
}

// ---------------------------------------------------------------- ShVAK cannon
/** One synchronised ShVAK barrel lying in its cowling trough (port; mirrored). */
function shvak(): THREE.Object3D {
  const x = 0.215;
  const out: THREE.Object3D[] = [];
  const yAt = (s: number) => fuseYTop(Math.max(FUSE_S0 + 0.01, s), x) - 0.004;
  const a = B(x, yAt(0.52), 0.44), b = B(x, yAt(1.7), 1.7);
  out.push(part(cylAB(a, b, 0.018, 0.018, 14), P.gun()));
  // muzzle collar and bore
  out.push(part(cylAB(a.clone().add(new THREE.Vector3(0, 0, 0.0)), a.clone().add(new THREE.Vector3(0, 0, -0.06)), 0.024, 0.024, 16), P.gun()));
  const bore = new THREE.CircleGeometry(0.011, 12);
  bore.translate(a.x, a.y, a.z + 0.001);
  out.push(part(bore, P.black()));
  return group(out);
}

// ---------------------------------------------------------------- cowl flaps, exhausts, heat plates
/** Plate conforming to the skin between s0..s1 and heights y0..y1, standing off by off(t). */
function skinPlate(s0: number, s1: number, y0: number, y1: number, off: (t: number) => number, th: number, ns = 10, ny = 12): THREE.BufferGeometry {
  const rows: THREE.Vector3[][] = [];
  for (let i = 0; i <= ns; i++) {
    const t = i / ns;
    const s = lerp(s0, s1, t);
    const outer: THREE.Vector3[] = [], inner: THREE.Vector3[] = [];
    for (let j = 0; j <= ny; j++) {
      const y = lerp(y0, y1, j / ny);
      const n = fuseNormal(s, y);
      const p = B(fuseX(s, y), y, s);
      outer.push(p.clone().addScaledVector(n, off(t) + th));
      inner.push(p.clone().addScaledVector(n, off(t)));
    }
    rows.push([...outer, ...inner.reverse()]);
  }
  return gridGeo(rows, { closedU: true, capStart: true, capEnd: true });
}

function cowlFlaps(): THREE.Object3D {
  const { flaps0, flaps1 } = DIM.cowl;
  const off = (t: number) => 0.0015 + 0.024 * t * t;
  return group([
    part(skinPlate(flaps0, flaps1, 0.03, 0.44, off, 0.005), skin('FUSE')),
    part(skinPlate(flaps0, flaps1, -0.5, -0.02, off, 0.005), skin('FUSE')),
  ]);
}

/** Individual exhaust stubs below the lower cowl flap (port side) and the heat plate behind. */
function exhausts(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const stub = (s: number, y: number, dir: THREE.Vector3, L: number, hh: number, hw: number) => {
    const xs = fuseX(s, y);
    const n = fuseNormal(s, y);
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(dir, -dir.y).normalize();
    const side = new THREE.Vector3().crossVectors(up, dir).normalize();
    const base = B(xs, y, s).addScaledVector(n, -0.03);
    const rows: THREE.Vector3[][] = [];
    const NR = 4;
    for (let i = 0; i <= NR; i++) {
      const t = i / NR;
      const c = base.clone().addScaledVector(dir, t * L);
      rows.push(ellipseRing(c, up, side, hh, hw, 16, 2.4));
    }
    out.push(part(gridGeo(rows, { closedU: true, capStart: true }), P.exhaust()));
    const mouth = base.clone().addScaledVector(dir, L - 0.008);
    out.push(
      part(
        gridGeo([ellipseRing(mouth, up, side, hh - 0.005, hw - 0.005, 16, 2.4), ellipseRing(mouth.clone().addScaledVector(dir, -0.002), up, side, 0.001, 0.001, 16)], { closedU: true }),
        P.black(),
      ),
    );
  };
  const d1 = new THREE.Vector3(0.3, -0.08, -0.95).normalize();
  const ys = [-0.07, -0.16, -0.25, -0.34, -0.43];
  ys.forEach((y, k) => stub(DIM.cowl.flaps1 + 0.02 + 0.012 * (k % 2), y, d1, 0.11, 0.032, 0.024));
  // heat protection plate on the fuselage side behind the stubs
  out.push(part(skinPlate(DIM.cowl.flaps1 + 0.06, 2.62, -0.5, 0.02, () => 0.001, 0.003, 10, 10), P.heat()));
  return group(out);
}

// ---------------------------------------------------------------- oil cooler
/** Ventral oil cooler fairing under the cowling rear with its intake and exit flap. */
function oilCooler(): THREE.Object3D {
  const s0 = 1.2, s1 = 2.25, w = 0.17;
  const rows: THREE.Vector3[][] = [];
  const n = 14;
  const ringAt = (s: number, h: number, shrink = 0) => {
    const yt = fuseYBot(s, 0) + 0.05;
    const yb = fuseYBot(s, 0) - h;
    return ellipseRing(B(0, (yt + yb) / 2, s), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), w - shrink, (yt - yb) / 2 - shrink, 24, 2.8);
  };
  const hAt = (t: number) => 0.075 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.5 + t * 0.62)), 0.6) + 0.004;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    rows.push(ringAt(lerp(s0, s1, t), t < 0.5 ? 0.075 : hAt(t)));
  }
  const shell = gridGeo(rows, { closedU: true, capEnd: true });
  const inner = ringAt(s0, 0.075, 0.012);
  const lip = gridGeo([rows[0], inner], { closedU: true });
  const throat = gridGeo([inner, ringAt(s0 + 0.12, 0.075, 0.02)], { closedU: true, inward: true, capEnd: true });
  // exit flap under the fuselage behind the fairing (slightly open)
  const sF = s1 + 0.02;
  const yF = fuseYBot(sF, 0);
  const flap = new THREE.BoxGeometry(0.3, 0.006, 0.16);
  flap.rotateX(-8 * (Math.PI / 180));
  flap.translate(0, yF - 0.012, -(sF + 0.08));
  return group([part(shell, skin('FUSE')), part(lip, skin('FUSE')), part(throat, P.black()), part(flap, skin('FUSE'))]);
}

// ---------------------------------------------------------------- assembly
export function buildFuselage(): THREE.Object3D {
  return group([
    part(buildSkin(), skin('FUSE')),
    cowlFront(),
    shuttersAndEngine(),
    spinner(),
    propeller(),
    topIntake(),
    shvak(),
    mirrorX(shvak(), false),
    cowlFlaps(),
    mirrorX(cowlFlaps(), false),
    exhausts(),
    mirrorX(exhausts(), false),
    oilCooler(),
  ]);
}
