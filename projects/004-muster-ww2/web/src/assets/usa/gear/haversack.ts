/**
 * M1928 haversack with its pack carrier ("pack tail"), packed and worn as the full field pack
 * (US Army, 1944). OD cotton duck and web.
 *
 * Upper part: the haversack body - a canvas envelope folded round its contents: the two side
 * flaps wrap round the sides onto the outer face and are held by web binding straps; the top flap
 * comes over the top and down the outer face and carries the M1928 meat can pouch (semicircular,
 * flap closed by a web strap and buckle). The two shoulder straps are sewn to the top of the back
 * panel (they are the haversack's own "suspenders": they run over the shoulders and hook into the
 * top eyelets of the cartridge belt in front), and a single belt strap on the back panel hooks
 * into the belt at the back.
 * Lower part: the pack carrier - a canvas wrapper round the rolled blanket / shelter half, its side
 * flap overlapping on the outer face, three binding straps round the roll, joined to the haversack
 * body by the coupling strap. It hangs below the belt over the seat.
 *
 * Packed size (m): body 0.212 w x 0.335 h x ~0.105 d; carrier roll 0.224 w x 0.36 h x ~0.105 d;
 * overall about 0.71 m from the top of the body to the bottom of the roll.
 *
 * WORN frame (buildM1928Haversack -> GearPiece, mount 'back'): +Z away from the wearer's back, +Y
 * up, the back panel (against the body) on z = 0, ORIGIN = top centre of the back panel (the top
 * edge of the haversack body; put it at the shoulder-blade height, ~1.42 m on the reference figure;
 * the belt then crosses the back panel at y ~ -0.39). With the usual back mount (gear frame turned
 * 180 deg about Y) gear +X is the wearer's RIGHT.
 * strapAnchors (gear-local):
 *   [0] +X shoulder strap: end of the stub leaving the top of the pack towards that shoulder,
 *   [1] -X shoulder strap stub end,
 *   [2] belt strap: end of the stub hanging from the back panel (to the belt's rear eyelet).
 * `strapDirs` = unit directions of the straps at those anchors (continue the straps from there
 * with buildWebStrapAlong / buildHaversackStrapsAlong, see straps.ts).
 * `slots` (gear-local frames, origin on the canvas at an eyelet-pair midpoint, +Z = outward normal,
 * +Y up, hooks at +-0.025 along X) = the worn frames of M1910-hanger items:
 *   'bayonet' on the wearer's left side face (-X), for buildM1Bayonet (push out by BAYONET_CLEAR);
 *   'etool' on the outer face just below the top flap, for buildM1943EntrenchingTool (its back must
 *   clear the binding straps: push it out by `ETOOL_CLEAR`).
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { SDF } from '../../../core/geo/sdf';
import type { GearPiece } from '../../shared/contracts';
import { US, type WebShade } from './palette';
import { stitches, merge, sheet, barBuckle, boxX, grommet, orientZ, taperEnd, smoothstep } from './parts';
import { roundRect2D, projectedBox, drape, drapeEdge, roundedEnd, snoise, projectTo, normalAt, sstep, type Drape } from './soft';

type Obj = THREE.Object3D;

export const M1928 = {
  /** Haversack body half width, bottom y, depth (front face z at the centre, without bulge). */
  hw: 0.106,
  yBot: -0.335,
  d: 0.096,
  /** Pack carrier roll. */
  rollHW: 0.112,
  rollTop: -0.322,
  rollBot: -0.708,
  rollD: 0.1,
  /** Top flap reaches down to this y on the outer face. */
  flapEnd: -0.192,
  strapW: 0.048,
};
/** Extra outward push for the e-tool on the 'etool' slot (binding straps + coupling strap). */
export const ETOOL_CLEAR = 0.012;
/** Extra outward push for the bayonet on the 'bayonet' slot (the carrier roll's binding straps below). */
export const BAYONET_CLEAR = 0.006;

/** Slab with a variable back surface z0(x, y) and front surface z1(x, y), rounded edges. */
function slab2(d2: (x: number, y: number) => number, z0: (x: number, y: number) => number, z1: (x: number, y: number) => number, rF: number, rB: number): SDF {
  return (x, y, z) => {
    const e = d2(x, y);
    const zb = z0(x, y), zf = z1(x, y);
    const zc = (zb + zf) / 2, hd = (zf - zb) / 2;
    const r = z > zc ? rF : rB;
    const dz = Math.abs(z - zc) - hd;
    const ax = e + r, az = dz + r;
    return Math.hypot(Math.max(ax, 0), Math.max(az, 0)) + Math.min(Math.max(ax, az), 0) - r;
  };
}

/** Rotation about Z by +90 deg: drapes authored with their path in the XZ plane (width along Y). */
const RZ = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
const RZi = RZ.clone().invert();

interface DrapeX {
  geometry: THREE.BufferGeometry;
  L: number;
  at(yo: number, s: number, above?: number): THREE.Vector3;
}

/**
 * A sheet draped over f whose guide path lies in the XZ plane at height y0 ([x, z] points), width
 * along Y. Built with `drape` in a frame rotated 90 deg about Z.
 */
function drapeX(f: SDF, o: { path: [number, number][]; y0: number; halfWidth: number | ((s: number, L: number) => number); gap: number; t: number; nu?: number; nv?: number; lift?: (u: number, s: number, L: number) => number }): DrapeX {
  const v = new THREE.Vector3();
  const fr: SDF = (x, y, z) => {
    v.set(x, y, z).applyMatrix4(RZ);
    return f(v.x, v.y, v.z);
  };
  // world (x, y) = RZ (x', y') = (-y', x'): a world path point [x, z] at height y0 is x' = y0, y' = -x
  const d: Drape = drape(fr, { ...o, x0: o.y0, path: o.path.map(([x, z]) => [-x, z]) });
  const geometry = d.geometry.applyMatrix4(RZ);
  return {
    geometry,
    L: d.L,
    at: (yo, s, above = 0) => d.at(yo, s, above).applyMatrix4(RZ),
  };
}
void RZi;

/** Points of a horizontal band round a body at height y (closed loop), projected to `level`. */
function ringAround(f: SDF, y: number, cz: number, levelOf: number | ((p: THREE.Vector3) => number), n = 64, from = 0, to = Math.PI * 2): THREE.Vector3[] {
  const lv = typeof levelOf === 'number' ? () => levelOf : levelOf;
  const level = 0.001;
  const pts: THREE.Vector3[] = [];
  const closed = to - from >= Math.PI * 2 - 1e-6;
  const cnt = closed ? n : n + 1;
  for (let i = 0; i < cnt; i++) {
    const a = from + ((to - from) * i) / n;
    const p = new THREE.Vector3(Math.sin(a) * 0.3, y, cz + Math.cos(a) * 0.3);
    // march in from outside along the ray to the centre, then project to the level set
    const c = new THREE.Vector3(0, y, cz);
    const dir = c.clone().sub(p).normalize();
    let tt = 0;
    for (let k = 0; k < 120; k++) {
      if (f(p.x + dir.x * tt, p.y + dir.y * tt, p.z + dir.z * tt) < level) break;
      tt += 0.003;
    }
    const q = p.clone().addScaledVector(dir, tt);
    projectTo(f, q, level, 12);
    q.y = y;
    projectTo(f, q, lv(q), 8);
    q.y = y;
    projectTo(f, q, lv(q), 4);
    pts.push(q);
  }
  return pts;
}

/** A web strap lying on f along points (normals from f), with thickness t. */
function strapOn(f: SDF, pts: THREE.Vector3[], w: number, t: number, closed = false, hw?: (t: number, s: number, L: number) => number): THREE.BufferGeometry {
  const nrm = pts.map((p) => normalAt(f, p));
  if (closed) return G.strap(pts, w, t, nrm, { closed: true, smooth: false });
  return sheet(pts, nrm, hw ?? w / 2, t, { across: 2, samples: Math.max(8, pts.length) });
}

export interface M1928HaversackOptions {
  shade?: WebShade;
  /** Include the pack carrier with its roll (default true). */
  carrier?: boolean;
  /** Include the meat can pouch on the top flap (default true). */
  meatCan?: boolean;
  /** Shoulder / belt strap stubs (default 'stubs'). */
  straps?: 'stubs' | 'none';
}

export function buildM1928Haversack(o: M1928HaversackOptions = {}): GearPiece & { strapDirs: THREE.Vector3[]; slots: Record<string, THREE.Matrix4> } {
  const H = M1928;
  const shade = o.shade ?? 'od7';
  const canvas = US.canvas(shade), web = US.web(shade), tape = US.tape(shade), thread = US.thread();
  const parts: Obj[] = [];
  const st: THREE.BufferGeometry[] = [];
  const metal: THREE.BufferGeometry[] = [];
  const webG: THREE.BufferGeometry[] = [];
  const canvasG: THREE.BufferGeometry[] = [];
  const tapeG: THREE.BufferGeometry[] = [];
  const S = (pts: THREE.Vector3[], len = 0.0034, gap = 0.0021) => st.push(stitches(pts, { len, gap, r: 0.0005 }));

  // ---------------------------------------------------------------- haversack body
  const cyB = H.yBot / 2;
  const outB = roundRect2D(0, cyB, H.hw, -H.yBot / 2, { tl: 0.022, tr: 0.022, bl: 0.03, br: 0.03 });
  const bulge = (x: number, y: number) => {
    const u = Math.max(0, 1 - (x / H.hw) ** 2);
    const v = Math.max(0, 1 - ((y - cyB) / (-H.yBot / 2)) ** 2);
    return 0.009 * Math.sqrt(u) * Math.sqrt(v) - 0.004 * sstep(-0.05, 0, y);
  };
  const zFb = (x: number, y: number) => H.d + bulge(x, y);
  const baseB = slab2(outB, () => 0, zFb, 0.03, 0.012);
  const body: SDF = (x, y, z) => baseB(x, y, z) + 0.0007 * snoise(x * 18, y * 14, z * 18, 41) + 0.0003 * snoise(x * 55, y * 50, z * 55, 13);
  canvasG.push(projectedBox(body, { centre: [0, cyB, H.d * 0.5], half: [H.hw, -H.yBot / 2, H.d * 0.5 + 0.005], n: [12, 18, 6], edge: 0.6 }));

  // side flaps: from the back panel's side edges round the sides onto the outer face (overlap at the centre)
  const sideT = 0.0024;
  const sideFlaps: DrapeX[] = [];
  for (const sx of [-1, 1]) {
    // the +X flap lies on top of the -X one
    const gap = sx > 0 ? 0.0033 : 0.0006;
    const xEnd = -sx * 0.014;
    const df = drapeX(body, {
      path: [
        [sx * (H.hw - 0.004), 0.004],
        [sx * (H.hw + 0.004), 0.03],
        [sx * (H.hw + 0.004), H.d * 0.7],
        [sx * (H.hw - 0.012), H.d + 0.01],
        [sx * 0.05, H.d + 0.012],
        [xEnd, H.d + 0.012],
      ],
      y0: cyB - 0.002,
      halfWidth: -H.yBot / 2 - 0.006,
      gap,
      t: sideT,
      nu: 9,
      nv: 14,
      lift: (u, s) => 0.0005 * (1 + snoise(u * 3, s * 30, 1.3, sx > 0 ? 51 : 53)),
    });
    sideFlaps.push(df);
    canvasG.push(df.geometry);
    // bound free edge (vertical) and a stitch row inside it - only below the top flap, where it shows
    const e: THREE.Vector3[] = [], es: THREE.Vector3[] = [];
    const y0e = cyB - 0.002;
    const yA = H.yBot + 0.009 - y0e, yB = H.flapEnd + 0.012 - y0e;
    for (let i = 0; i <= 12; i++) {
      const yo = yA + ((yB - yA) * i) / 12;
      e.push(df.at(yo, df.L - 0.0014, -0.0012));
      es.push(df.at(yo, df.L - 0.0062, 0.00015));
    }
    tapeG.push(sheet(e, e.map((q) => normalAt(body, q)), 0.0028, sideT + 0.0014, { across: 2, samples: 16 }));
    S(es);
  }
  const outerLevel = 0.0033 + sideT; // side flaps' outer surface level over the body

  // ---------------------------------------------------------------- top flap (over the side flaps)
  const flapT = 0.0028;
  const flapHW = H.hw + 0.004;
  const flap = drape(body, {
    path: [
      [-0.05, -0.001],
      [-0.012, -0.0015],
      [0.006, 0.012],
      [0.012, H.d * 0.5],
      [0.004, H.d + 0.004],
      [-0.03, H.d + 0.014],
      [-0.1, H.d + 0.016],
      [H.flapEnd, H.d + 0.014],
    ],
    halfWidth: roundedEnd(flapHW, 0.03),
    gap: outerLevel + 0.0006,
    t: flapT,
    nu: 11,
    nv: 26,
    lift: (u, s) => 0.0006 * (1 + snoise(u * 2.4, s * 22, 3.3, 61)) + 0.0014 * sstep(0.55, 1, Math.abs(u)) * sstep(0.02, 0.1, s),
  });
  canvasG.push(flap.geometry);
  const flapTop = flap.sAtY(0.004);
  const bind = drapeEdge(flap, flapHW, 0.03, flapTop, -0.0014, 0.001, 12);
  tapeG.push(sheet(bind, bind.map((q) => normalAt(body, q)), 0.0029, flapT + 0.0016, { across: 2, samples: 64 }));
  const fsp: THREE.Vector3[] = [];
  const fw = flapHW - 0.0065;
  for (let i = 0; i <= 14; i++) fsp.push(flap.at(-fw, flapTop + ((flap.L - 0.035 - flapTop) * i) / 14, 0.00015));
  for (let i = 1; i < 10; i++) fsp.push(flap.at(-fw + 0.02 + ((2 * fw - 0.04) * i) / 10, flap.L - 0.0065, 0.00015));
  for (let i = 14; i >= 0; i--) fsp.push(flap.at(fw, flapTop + ((flap.L - 0.035 - flapTop) * i) / 14, 0.00015));
  S(fsp);

  // ---------------------------------------------------------------- binding straps on the side flaps
  const bindY = [-0.232, -0.298];
  const bsW = 0.0205, bsT = 0.0022;
  // the -X flap alone (level 0.003) on its side, both flaps (0.0057) from the +X flap's edge on
  const flapLevel = (p: THREE.Vector3) => 0.0006 + sideT + 0.0027 * sstep(-0.022, -0.009, p.x);
  for (const y of bindY) {
    // strap sewn on the -X flap near the side, across the outer face to a buckle on the +X flap
    const lvl = (p: THREE.Vector3) => flapLevel(p) + 0.0007 + bsT / 2;
    const pts = ringAround(body, y, H.d * 0.5, lvl, 30, -Math.PI * 0.62, Math.PI * 0.36);
    webG.push(strapOn(body, pts, bsW, bsT, false, taperEnd(bsW / 2, 0.012, 0.55)));
    // buckle at ~ x = +0.058 on the outer face; the strap end passes through it
    const bq = new THREE.Vector3(0.058, y, H.d + 0.05);
    const bp = projectTo(body, bq, lvl(bq) + bsT / 2 + 0.0006);
    const bn = normalAt(body, bp);
    metal.push(orientZ(barBuckle(bsW + 0.006, 0.016, 0.0026, 0.0014, true).rotateZ(Math.PI / 2), bp, bn));
    // sewn end on the -X side (box stitch)
    const sp = pts[3];
    st.push(boxX(sp.clone().addScaledVector(normalAt(body, sp), bsT / 2 + 0.0002), 0.014, bsW - 0.006, normalAt(body, sp)));
  }

  // ---------------------------------------------------------------- meat can pouch on the top flap
  if (o.meatCan !== false) {
    const mw = 0.099, mTop = -0.014, mH = 0.172, mD = 0.042;
    const mcy = mTop - mH / 2;
    const outM = roundRect2D(0, mcy, mw, mH / 2, { tl: 0.012, tr: 0.012, bl: 0.085, br: 0.085 });
    const zOn = (x: number, y: number) => zFb(x, y) + outerLevel + 0.0006 + flapT - 0.0012;
    const baseM = slab2(outM, zOn, (x, y) => zOn(x, y) + mD - 0.012 * (1 - Math.max(0, 1 - (x / mw) ** 2)), 0.014, 0.004);
    const mc: SDF = (x, y, z) => baseM(x, y, z) + 0.0004 * snoise(x * 30, y * 30, z * 30, 71);
    const zc = zOn(0, mcy) + mD / 2;
    canvasG.push(projectedBox(mc, { centre: [0, mcy, zc], half: [mw, mH / 2, mD / 2 + 0.004], n: [12, 12, 4], edge: 0.6 }));
    // U seam round the sides and bottom of the front
    const seam: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = Math.PI + (i / 40) * Math.PI; // left side round the bottom to the right side
      const r = 0.085;
      let x = Math.cos(a) * (mw - 0.005), y = mcy - mH / 2 + r + Math.sin(a) * (r - 0.005);
      if (i === 0 || i === 40) y = mTop - 0.05;
      x = Math.max(-mw + 0.005, Math.min(mw - 0.005, x));
      seam.push(projectTo(mc, new THREE.Vector3(x, y, zc + mD), 0.0002));
    }
    S(seam);
    // flap over the top of the pouch
    const mf = drape(mc, {
      path: [
        [mTop - 0.012, zOn(0, mTop) + 0.002],
        [mTop + 0.001, zOn(0, mTop) + 0.006],
        [mTop + 0.002, zc],
        [mTop - 0.004, zc + mD / 2 + 0.002],
        [mTop - 0.03, zc + mD / 2 + 0.002],
        [mTop - 0.062, zc + mD / 2 + 0.001],
      ],
      halfWidth: roundedEnd(mw + 0.0015, 0.014),
      gap: 0.0006,
      t: 0.0026,
      nu: 10,
      nv: 14,
      lift: (u, s) => 0.0005 * (1 + snoise(u * 2, s * 40, 7.7, 73)),
    });
    canvasG.push(mf.geometry);
    const mb = drapeEdge(mf, mw + 0.0015, 0.014, mf.sAtY(mTop + 0.001), -0.0013, 0.0009, 8);
    tapeG.push(sheet(mb, mb.map((q) => normalAt(mc, q)), 0.0026, 0.0038, { across: 2, samples: 48 }));
    // closing strap from the flap end down to a buckle on the pouch front
    const s0 = mf.at(0, mf.L - 0.02, 0.0002);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const y = s0.y - (i / 10) * 0.058;
      const p = new THREE.Vector3(0, y, zc + mD + 0.01);
      projectTo(mc, p, 0.0026 + 0.0011 + (i === 0 ? 0.0026 : 0));
      pts.push(p);
    }
    webG.push(strapOn(mc, pts, 0.019, 0.0022, false, taperEnd(0.0095, 0.01, 0.5)));
    const bk = projectTo(mc, new THREE.Vector3(0, s0.y - 0.042, zc + mD + 0.01), 0.0045);
    metal.push(orientZ(barBuckle(0.025, 0.016, 0.0026, 0.0014, true), bk, normalAt(mc, bk)));
    // buckle tab sewn to the front
    const tb = projectTo(mc, new THREE.Vector3(0, s0.y - 0.052, zc + mD + 0.01), 0.0012);
    webG.push(strapOn(mc, [tb.clone().setY(tb.y + 0.012), tb, tb.clone().setY(tb.y - 0.014)].map((p) => projectTo(mc, p, 0.0012)), 0.019, 0.002));
    st.push(boxX(projectTo(mc, tb.clone().setY(tb.y - 0.008), 0.0024), 0.014, 0.01, normalAt(mc, tb)));
  }

  // ---------------------------------------------------------------- pack carrier with the roll
  let roll: SDF | null = null;
  if (o.carrier !== false) {
    const cyR = (H.rollTop + H.rollBot) / 2, hhR = (H.rollTop - H.rollBot) / 2;
    const outR = roundRect2D(0, cyR, H.rollHW, hhR, { tl: 0.03, tr: 0.03, bl: 0.045, br: 0.045 });
    const zFr = (x: number, y: number) => {
      const u = Math.max(0, 1 - (x / H.rollHW) ** 2);
      // pinched in under the haversack body where the carrier's top is folded round it
      const pinch = 1 - 0.3 * (1 - sstep(H.rollTop - 0.045, H.rollTop - 0.012, y));
      return 0.004 + (H.rollD + 0.01 * Math.sqrt(u)) * (0.72 + 0.28 * pinch);
    };
    const baseR = slab2(outR, () => 0.004, zFr, 0.042, 0.02);
    roll = (x, y, z) => baseR(x, y, z) + 0.0008 * snoise(x * 16, y * 12, z * 16, 81) + 0.0003 * snoise(x * 60, y * 45, z * 60, 83);
    const R = roll;
    canvasG.push(projectedBox(R, { centre: [0, cyR, 0.055], half: [H.rollHW, hhR, 0.058], n: [12, 18, 6], edge: 0.6 }));
    // carrier side flap overlapping on the outer face (from the +X side), bound edge
    const cf = drapeX(R, {
      path: [
        [H.rollHW - 0.01, 0.01],
        [H.rollHW + 0.004, 0.04],
        [H.rollHW, 0.085],
        [H.rollHW - 0.03, H.rollD + 0.012],
        [0.03, H.rollD + 0.016],
        [-0.03, H.rollD + 0.016],
      ],
      y0: cyR - 0.004,
      halfWidth: hhR - 0.012,
      gap: 0.0006,
      t: 0.0024,
      nu: 9,
      nv: 14,
      lift: (u, s) => 0.0005 * (1 + snoise(u * 3, s * 28, 2.1, 87)),
    });
    canvasG.push(cf.geometry);
    const ce: THREE.Vector3[] = [], ces: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      const yo = -(hhR - 0.016) + ((2 * (hhR - 0.016)) * i) / 16;
      ce.push(cf.at(yo, cf.L - 0.0014, -0.0012));
      ces.push(cf.at(yo, cf.L - 0.0062, 0.00015));
    }
    tapeG.push(sheet(ce, ce.map((q) => normalAt(R, q)), 0.0028, 0.0038, { across: 2, samples: 24 }));
    S(ces);
    // three binding straps round the roll, buckled on the outer face
    // the carrier flap covers the +X side and the outer face up to x = -0.03
    const covered = (p: THREE.Vector3) => sstep(-0.037, -0.025, p.x) * (p.z > 0.022 ? 1 : sstep(H.rollHW - 0.02, H.rollHW - 0.008, p.x));
    for (const y of [-0.41, -0.52, -0.632]) {
      const lvl = (p: THREE.Vector3) => 0.0017 + 0.003 * covered(p);
      const pts = ringAround(R, y, 0.055, lvl, 48);
      webG.push(G.strap(pts, 0.0205, 0.0022, pts.map((p) => normalAt(R, p)), { closed: true, smooth: false }));
      const bq = new THREE.Vector3(-0.052, y, 0.2);
      const bp = projectTo(R, bq, 0.0017 + 0.0017);
      metal.push(orientZ(barBuckle(0.026, 0.016, 0.0026, 0.0014, true).rotateZ(Math.PI / 2), bp, normalAt(R, bp)));
      // loose end past the buckle
      const tail: THREE.Vector3[] = [];
      // the free end leaves the buckle's far bar and lies on the strap towards +X
      for (let i = 0; i <= 5; i++) tail.push(projectTo(R, new THREE.Vector3(-0.0405 + i * 0.0065, y + 0.0003 * i, 0.2), 0.0017 + 0.0024));
      webG.push(strapOn(R, tail, 0.0205, 0.002, false, taperEnd(0.01, 0.008, 0.5)));
    }
    // coupling strap: from the haversack's bottom over the junction to the carrier, with a buckle
    const cp: THREE.Vector3[] = [];
    const U: SDF = (x, y, z) => Math.min(body(x, y, z) - outerLevel, R(x, y, z) - 0.0034);
    for (let i = 0; i <= 16; i++) {
      const y = -0.313 - (i / 16) * 0.083;
      cp.push(projectTo(U, new THREE.Vector3(0, y, 0.2), 0.0028));
    }
    // keep the strap taut over the crease
    for (let it = 0; it < 6; it++) for (let i = 1; i < cp.length - 1; i++) {
      const m = cp[i - 1].clone().add(cp[i + 1]).multiplyScalar(0.5);
      if (U(m.x, m.y, m.z) > 0.0028) cp[i].lerp(m, 0.6);
    }
    webG.push(strapOn(U, cp, 0.024, 0.0024));
    const cb = cp[10].clone().addScaledVector(normalAt(U, cp[10]), 0.0022);
    metal.push(orientZ(barBuckle(0.03, 0.017, 0.0027, 0.0014, true), cb, normalAt(U, cp[10])));
    st.push(boxX(cp[2].clone().addScaledVector(normalAt(U, cp[2]), 0.0014), 0.018, 0.014, normalAt(U, cp[2])));
  }

  // ---------------------------------------------------------------- straps on the back panel
  const anchors: THREE.Vector3[] = [];
  const dirs: THREE.Vector3[] = [];
  const back = new THREE.Vector3(0, 0, -1);
  for (const sx of [1, -1]) {
    // shoulder strap sewn down the back panel from the top corner, leaving over the top edge
    const x = sx * 0.062;
    const root = [
      new THREE.Vector3(x, -0.105, -0.0014),
      new THREE.Vector3(x, -0.04, -0.0014),
      new THREE.Vector3(x + sx * 0.002, -0.004, -0.0016),
    ];
    const stub = [
      new THREE.Vector3(x + sx * 0.004, 0.018, -0.006),
      new THREE.Vector3(x + sx * 0.008, 0.036, -0.018),
      new THREE.Vector3(x + sx * 0.012, 0.048, -0.034),
    ];
    const path = o.straps === 'none' ? root : [...root, ...stub];
    const fwd = new THREE.Vector3(0, 0, 1), over = new THREE.Vector3(0, 0.6, 0.8);
    const nrm = path.map((_p, i) => (i < 3 ? fwd.clone() : fwd.clone().lerp(over, Math.min(1, (i - 2) / 2)).normalize()));
    webG.push(sheet(path, nrm, H.strapW / 2, 0.0028, { across: 2, samples: 30 }));
    st.push(boxX(new THREE.Vector3(x, -0.085, -0.0031), H.strapW - 0.01, 0.03, back));
    st.push(boxX(new THREE.Vector3(x, -0.035, -0.0031), H.strapW - 0.01, 0.022, back));
    const end = path[path.length - 1];
    anchors.push(end.clone());
    dirs.push(end.clone().sub(path[path.length - 2]).normalize());
  }
  // belt strap on the back panel (to the belt's rear eyelet)
  {
    const pts = [new THREE.Vector3(0, -0.2, -0.0014), new THREE.Vector3(0, -0.27, -0.0014), new THREE.Vector3(0, -0.33, -0.0016)];
    if (o.straps !== 'none') pts.push(new THREE.Vector3(0, -0.36, -0.0024));
    webG.push(sheet(pts, pts.map(() => back.clone()), 0.012, 0.0024, { across: 2, samples: 16 }));
    st.push(boxX(new THREE.Vector3(0, -0.215, -0.0029), 0.018, 0.022, back));
    anchors.push(pts[pts.length - 1].clone());
    dirs.push(new THREE.Vector3(0, -1, 0));
  }

  // ---------------------------------------------------------------- eyelets / slots
  const slots: Record<string, THREE.Matrix4> = {};
  const rings: THREE.BufferGeometry[] = [], holes: THREE.BufferGeometry[] = [];
  const addPair = (name: string, c: THREE.Vector3, along: THREE.Vector3, f: SDF, level: number) => {
    const pp: THREE.Vector3[] = [];
    for (const s of [-1, 1]) {
      const p = projectTo(f, c.clone().addScaledVector(along, s * 0.025), level);
      const n = normalAt(f, p);
      const { ring, hole } = grommet(0.0046, 0.0023, 0.0011);
      rings.push(orientZ(ring, p, n));
      holes.push(orientZ(hole, p, n));
      pp.push(p);
    }
    const o2 = pp[0].clone().add(pp[1]).multiplyScalar(0.5).addScaledVector(normalAt(f, pp[0]).add(normalAt(f, pp[1])).normalize(), 0.0011);
    const X = pp[1].clone().sub(pp[0]).normalize();
    const n = normalAt(f, o2);
    const Y = new THREE.Vector3(0, 1, 0).addScaledVector(X, -X.y).normalize();
    const Z = X.clone().cross(Y).normalize();
    if (Z.dot(n) < 0) {
      X.negate();
      Z.negate();
    }
    slots[name] = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(o2);
  };
  // bayonet: on the wearer's left side face (gear -X), eyelets spaced along the depth
  addPair('bayonet', new THREE.Vector3(-H.hw - 0.02, -0.06, H.d * 0.5), new THREE.Vector3(0, 0, 1), body, 0.0006 + sideT);
  addPair('etool', new THREE.Vector3(0, H.flapEnd - 0.016, H.d + 0.05), new THREE.Vector3(1, 0, 0), body, 0.0033 + sideT);
  metal.push(...rings);

  parts.push(part(merge(canvasG), canvas, { name: 'haversack' }));
  parts.push(part(merge(webG), web, { name: 'straps' }));
  parts.push(part(merge(tapeG), tape));
  parts.push(part(merge(st), thread));
  parts.push(part(merge(metal), US.blackMetal()));
  parts.push(part(merge(holes), US.eyeletHole()));
  const object = group(parts);
  object.name = 'us-m1928-haversack';
  const b = new THREE.Box3().setFromObject(object, true);
  const size = b.getSize(new THREE.Vector3());
  void smoothstep;
  return {
    id: 'us-m1928-haversack',
    name: 'M1928 haversack with pack carrier',
    object,
    mount: 'back',
    size: { w: size.x, h: size.y, d: b.max.z },
    strapAnchors: anchors,
    strapDirs: dirs,
    slots,
  };
}
