/**
 * US Army (1944) canvas belt pouches, built from one generic cotton-duck pouch builder:
 *  - M1923 cartridge-belt pocket (one of ten; two 5-round stripper clips or one 8-round M1 clip)
 *  - M1937 BAR magazine-belt pocket (one of six; two 20-round BAR magazines)
 *  - Thompson 30-round magazine pouch (three cells, web belt loop)
 *  - M1942 first-aid pouch (Carlisle dressing, M1910 hanger)
 * All have a top flap closed by a lift-the-dot fastener.
 *
 * Gear-local frames (+Z away from the body, +Y up):
 *  - Pocket modules (M1923, M1937): ORIGIN on the belt centre line, on the OUTER FACE of the belt
 *    (pocket panel); the pocket's back lies on z = 0; the flap is sewn at the panel's top edge
 *    (`POCKET_*.panelTop`). These are integral to their belts - see belts.ts, which lays them along
 *    a waist path; they can also be placed one by one.
 *  - Thompson pouch: ORIGIN = belt-loop centre at belt mid-height. The web loop lies on the body in
 *    z = 0..0.0025, the belt passes behind the pouch (z 0.0025..0.0065), loop inside height 0.078
 *    (takes the 57 mm pistol belt or the cartridge belt).
 *  - First-aid pouch: hangs by an M1910 hanger. ORIGIN = midpoint of the two belt eyelets (hooks at
 *    x = +-0.025, y = 0), z = 0 = outer face of the belt.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { SDF } from '../../../core/geo/sdf';
import type { GearPiece } from '../../shared/contracts';
import { US, type WebShade } from './palette';
import { stitches, liftTheDot, orientZ, m1910Hanger, sheet, merge, boxX } from './parts';
import { roundRect2D, slab, projectedBox, drape, drapeEdge, roundedEnd, sstep, snoise, projectTo, normalAt, uSeam2D } from './soft';

type Obj = THREE.Object3D;

export interface PouchSpec {
  /** Body width (X), height (Y), depth at the rim of the front face (Z). */
  w: number;
  h: number;
  d: number;
  /** Top edge of the body (y) and the z of its back face. */
  yTop: number;
  zBack: number;
  rTop: number;
  rBot: number;
  /** Front / back edge rounding. */
  rF?: number;
  rB?: number;
  /** Extra front offset at (x, y) (contents pressing out); keep 0 towards the outline. */
  front?: (x: number, y: number) => number;
  /** How far the flap reaches down the front from the body top, its corner radius. */
  flapDrop: number;
  flapCorner?: number;
  /** Where the flap starts on the back (y, z), e.g. a panel's top edge. Default: body back top. */
  flapStart?: [number, number];
  /** Lift-the-dot x positions on the flap (default [0]). */
  dots?: number[];
  /** x positions of vertical partition seams (cells). */
  cells?: number[];
  /** Bind the flap edge with tape (default true); samples along the binding (default 48). */
  bind?: boolean;
  tapeSamples?: number;
  /** Stitch length and gap of the seams (default 0.0032 / 0.002). */
  stitch?: [number, number];
  /** Mesh resolution (body n, flap nu x nv). */
  n: [number, number, number];
  flapN?: [number, number];
  wrinkle?: number;
  seed?: number;
  shade?: WebShade;
}

export interface PouchBuild {
  parts: Obj[];
  body: SDF;
  zFront: (x: number, y: number) => number;
  flap: ReturnType<typeof drape>;
  yFlapEnd: number;
}

/** Generic US cotton-duck pouch: body, U seam, top flap with bound edge, lift-the-dot(s), cell seams. */
export function buildPouch(s: PouchSpec): PouchBuild {
  const shade = s.shade ?? 'od7';
  const canvas = US.canvas(shade), tape = US.tape(shade), thread = US.thread();
  const cy = s.yTop - s.h / 2;
  const outline = roundRect2D(0, cy, s.w / 2, s.h / 2, { tl: s.rTop, tr: s.rTop, bl: s.rBot, br: s.rBot });
  const rF = s.rF ?? Math.min(0.012, s.d * 0.4), rB = s.rB ?? 0.004;
  const zF = (x: number, y: number) => s.zBack + s.d + (s.front ? s.front(x, y) : 0);
  const base = slab(outline, s.zBack, zF, rF, rB);
  const wr = s.wrinkle ?? 0.0004, seed = s.seed ?? 3;
  const body: SDF = (x, y, z) => base(x, y, z) + wr * snoise(x * 28, y * 28, z * 28, seed) + wr * 0.35 * snoise(x * 75, y * 75, z * 75, seed + 7);
  const parts: Obj[] = [];
  parts.push(part(projectedBox(body, { centre: [0, cy, s.zBack + s.d / 2], half: [s.w / 2, s.h / 2, s.d / 2 + 0.002], n: s.n }), canvas));
  // front U seam (sides and bottom), stitched
  const seamPts = uSeam2D(0, cy, s.w / 2, s.h / 2, s.rBot, 0.0032, s.yTop - Math.min(0.02, s.flapDrop * 0.6), 0.004).map(([x, y]) =>
    projectTo(body, new THREE.Vector3(x, y, zF(x, y)), 0.00018),
  );
  const [sl, sg] = s.stitch ?? [0.0032, 0.002];
  const stitchParts: THREE.BufferGeometry[] = [stitches(seamPts, { len: sl, gap: sg, r: 0.00048 })];
  // flap: from the back (or the panel's top edge), over the top, down the front
  const zf0 = s.zBack + s.d;
  const [fy0, fz0] = s.flapStart ?? [s.yTop - 0.006, s.zBack + 0.0015];
  const nuv = s.flapN ?? [10, 26];
  const flapHW = s.w / 2 + 0.0012;
  const fl = drape(body, {
    path: [
      [fy0, fz0],
      [Math.max(fy0, s.yTop) + 0.0015, s.zBack + 0.004],
      [s.yTop + 0.0012, s.zBack + s.d * 0.5],
      [s.yTop, zf0 - rF * 0.6],
      [s.yTop - rF * 0.6, zf0],
      [s.yTop - s.flapDrop * 0.55, zf0],
      [s.yTop - s.flapDrop, zf0],
    ],
    halfWidth: roundedEnd(flapHW, s.flapCorner ?? Math.min(0.012, s.w * 0.15)),
    gap: 0.0006,
    t: 0.0026,
    nu: nuv[0],
    nv: nuv[1],
    lift: (u, sa) => 0.0005 * (1 + snoise(u * 2.3, sa * 38, 2.9, seed + 11)),
  });
  parts.push(part(fl.geometry, canvas));
  const rc = s.flapCorner ?? Math.min(0.012, s.w * 0.15);
  if (s.bind !== false) {
    // flat binding tape round the flap's sides and free end
    const per = drapeEdge(fl, flapHW, rc, fl.sAtY(s.yTop - 0.0035), -0.0013, 0.0008, 8);
    parts.push(part(sheet(per, per.map((q) => normalAt(body, q)), 0.0026, 0.0038, { across: 2, samples: s.tapeSamples ?? 48 }), tape));
  }
  // stitch row across the flap near its free edge
  const fs: THREE.Vector3[] = [];
  const inset = s.bind !== false ? 0.0055 : 0.003;
  for (let i = 0; i <= 10; i++) fs.push(fl.at(-(flapHW - inset) + ((2 * (flapHW - inset)) * i) / 10, fl.L - inset, 0.00015));
  stitchParts.push(stitches(fs, { len: 0.003, gap: 0.0019, r: 0.00048 }));
  // lift-the-dot(s): socket on the flap near its end
  const dots: THREE.BufferGeometry[] = [];
  for (const x of s.dots ?? [0]) {
    const p = fl.at(x, fl.L - Math.min(0.013, s.flapDrop * 0.4), 0.0001);
    dots.push(orientZ(liftTheDot(), p, normalAt(body, p)));
  }
  parts.push(part(merge(dots), US.blackMetal()));
  // cell partition seams down the front
  const yFlapEnd = fl.at(0, fl.L, 0).y;
  for (const x of s.cells ?? []) {
    const pts: THREE.Vector3[] = [];
    const yb = s.yTop - s.h + 0.01;
    for (let i = 0; i <= 24; i++) {
      const y = yFlapEnd - 0.003 - ((yFlapEnd - 0.003 - yb) * i) / 24;
      pts.push(projectTo(body, new THREE.Vector3(x, y, zF(x, y)), 0.00018));
    }
    stitchParts.push(stitches(pts, { len: 0.0032, gap: 0.002, r: 0.00048 }));
  }
  parts.push(part(merge(stitchParts), thread));
  return { parts, body, zFront: zF, flap: fl, yFlapEnd };
}

// ---------------------------------------------------------------------------------------------
// Pocket modules for the integral belts
// ---------------------------------------------------------------------------------------------

/** M1923 pocket panel data (m): the wide woven pocket panel is `panelH` high, centred on y = 0. */
export const POCKET_M1923 = { w: 0.068, h: 0.084, d: 0.026, yTop: 0.046, panelTop: 0.05, pitch: 0.0736 };
/** M1937 BAR pocket data (m): holds two 20-round magazines, one behind the other. */
export const POCKET_M1937 = { w: 0.098, h: 0.135, d: 0.052, yTop: 0.036, panelTop: 0.04, pitch: 0.106 };

/** One M1923 cartridge-belt pocket (holds one M1 en-bloc clip; the flap has a lift-the-dot). */
export function buildM1923Pocket(o: { shade?: WebShade; seed?: number } = {}): GearPiece {
  const P = POCKET_M1923;
  const pb = buildPouch({
    w: P.w,
    h: P.h,
    d: P.d,
    yTop: P.yTop,
    zBack: 0,
    rTop: 0.004,
    rBot: 0.009,
    rF: 0.008,
    rB: 0.003,
    front: (x, y) => {
      // clip of cartridges pressing the canvas out (lower 3/4 of the pocket)
      const u = Math.max(0, 1 - (x / (P.w / 2)) ** 2);
      return 0.003 * Math.sqrt(u) * sstep(P.yTop - P.h + 0.006, P.yTop - P.h + 0.03, y) * (1 - sstep(P.yTop - 0.012, P.yTop, y));
    },
    flapDrop: 0.036,
    flapCorner: 0.009,
    flapStart: [P.panelTop - 0.002, 0.0012],
    bind: false,
    n: [6, 8, 4],
    flapN: [4, 12],
    stitch: [0.0036, 0.0024],
    wrinkle: 0.0003,
    seed: o.seed ?? 5,
    shade: o.shade ?? 'od7',
  });
  const obj = group(pb.parts);
  obj.name = 'us-m1923-pocket';
  return {
    id: 'us-m1923-pocket',
    name: 'M1923 cartridge belt pocket',
    object: obj,
    mount: 'belt-front-left',
    size: { w: P.w + 0.003, h: P.panelTop - (P.yTop - P.h) + 0.003, d: P.d + 0.008 },
  };
}

/** One M1937 BAR-belt pocket (two 20-round magazines side by side). */
export function buildM1937BarPocket(o: { shade?: WebShade; seed?: number } = {}): GearPiece {
  const P = POCKET_M1937;
  const pb = buildPouch({
    w: P.w,
    h: P.h,
    d: P.d,
    yTop: P.yTop,
    zBack: 0,
    rTop: 0.006,
    rBot: 0.012,
    rF: 0.014,
    rB: 0.004,
    front: (x, y) => {
      // the front magazine's flat side pressing the canvas out, a little slack towards the edges
      const u = Math.max(0, 1 - (x / (P.w / 2 - 0.006)) ** 4);
      return 0.0022 * u * sstep(P.yTop - P.h + 0.008, P.yTop - P.h + 0.035, y) * (1 - sstep(P.yTop - 0.02, P.yTop, y));
    },
    flapDrop: 0.05,
    flapCorner: 0.012,
    flapStart: [P.panelTop - 0.002, 0.0012],
    bind: true,
    tapeSamples: 30,
    n: [8, 10, 5],
    flapN: [6, 16],
    wrinkle: 0.0004,
    seed: o.seed ?? 9,
    shade: o.shade ?? 'od7',
  });
  const obj = group(pb.parts);
  obj.name = 'us-m1937-bar-pocket';
  return {
    id: 'us-m1937-bar-pocket',
    name: 'M1937 BAR belt pocket',
    object: obj,
    mount: 'belt-front-left',
    size: { w: P.w + 0.004, h: P.panelTop - (P.yTop - P.h) + 0.004, d: P.d + 0.01 },
  };
}

// ---------------------------------------------------------------------------------------------
// Thompson 30-round magazine pouch (belt loop)
// ---------------------------------------------------------------------------------------------

/** Belt-loop stack-up for loop-mounted pouches (m). */
export const US_LOOP = { loopT: 0.0025, beltT: 0.004, loopInnerH: 0.078 };

/** Wide web belt loop on the back of a pouch: sewn at the top, passes down behind the belt, sewn at the bottom. */
function webLoop(w: number, yTop: number, yBot: number, zBack: number, shade: WebShade): Obj[] {
  const t = US_LOOP.loopT;
  const zc = t / 2;
  const pts = [
    [0, yTop + 0.012, zBack - t * 0.5],
    [0, yTop + 0.002, zBack - t * 0.5],
    [0, yTop - 0.004, zc + 0.0012],
    [0, yTop - 0.012, zc],
    [0, (yTop + yBot) / 2, zc],
    [0, yBot + 0.012, zc],
    [0, yBot + 0.004, zc + 0.0012],
    [0, yBot - 0.002, zBack - t * 0.5],
    [0, yBot - 0.014, zBack - t * 0.5],
  ].map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const out: Obj[] = [part(G.strap(pts, w, t, new THREE.Vector3(0, 0, -1), { samples: 40 }), US.web(shade))];
  const th = US.thread();
  const st: THREE.BufferGeometry[] = [];
  for (const y of [yTop + 0.007, yBot - 0.008]) st.push(boxX(new THREE.Vector3(0, y, zBack - t - 0.0002), w - 0.008, 0.008, new THREE.Vector3(0, 0, -1)));
  out.push(part(merge(st), th));
  return out;
}

export const THOMPSON_POUCH = { w: 0.108, h: 0.222, d: 0.04, yTop: 0.04 };

export function buildThompsonPouch(o: { shade?: WebShade } = {}): GearPiece {
  const P = THOMPSON_POUCH;
  const shade = o.shade ?? 'od7';
  const zBack = US_LOOP.loopT + US_LOOP.beltT;
  const cells = [-0.036, 0, 0.036];
  const pb = buildPouch({
    w: P.w,
    h: P.h,
    d: P.d,
    yTop: P.yTop,
    zBack,
    rTop: 0.008,
    rBot: 0.012,
    rF: 0.012,
    rB: 0.004,
    front: (x, y) => {
      let m = 0;
      for (const c of cells) m = Math.max(m, Math.sqrt(Math.max(0, 1 - ((x - c) / 0.017) ** 2)));
      const vy = sstep(P.yTop - P.h + 0.004, P.yTop - P.h + 0.03, y);
      return 0.004 * m * vy - 0.002 * (1 - m) * vy;
    },
    flapDrop: 0.058,
    flapCorner: 0.012,
    cells: [-0.018, 0.018],
    bind: true,
    n: [12, 20, 6],
    flapN: [10, 26],
    wrinkle: 0.0004,
    seed: 17,
    shade,
  });
  const parts: Obj[] = [...pb.parts];
  const li = US_LOOP.loopInnerH;
  parts.push(...webLoop(0.1, li / 2, -li / 2, zBack, shade));
  const obj = group(parts);
  obj.name = 'us-thompson-pouch';
  return {
    id: 'us-thompson-30rd-pouch',
    name: 'Thompson 30-round magazine pouch',
    object: obj,
    mount: 'belt-front-left',
    size: { w: P.w + 0.004, h: P.h + 0.01, d: zBack + P.d + 0.012 },
    belt: { loopWidth: li },
  };
}

// ---------------------------------------------------------------------------------------------
// M1942 first-aid pouch (M1910 hanger)
// ---------------------------------------------------------------------------------------------

export const FIRST_AID_POUCH = { w: 0.142, h: 0.092, d: 0.036, drop: 0.036 };

export function buildFirstAidPouch(o: { shade?: WebShade } = {}): GearPiece {
  const P = FIRST_AID_POUCH;
  const shade = o.shade ?? 'od7';
  const zBack = 0.0045; // pouch back in front of the hanger wire
  const yTop = -P.drop - 0.008;
  const pb = buildPouch({
    w: P.w,
    h: P.h,
    d: P.d,
    yTop,
    zBack,
    rTop: 0.006,
    rBot: 0.012,
    rF: 0.012,
    rB: 0.004,
    front: (x, y) => {
      // the boxed dressing: a flat, slightly domed front
      const u = Math.max(0, 1 - (x / (P.w / 2 - 0.008)) ** 2);
      return 0.0025 * Math.sqrt(u) * sstep(yTop - P.h + 0.005, yTop - P.h + 0.025, y);
    },
    flapDrop: 0.05,
    flapCorner: 0.014,
    bind: true,
    n: [14, 10, 6],
    flapN: [12, 22],
    wrinkle: 0.00035,
    seed: 23,
    shade,
  });
  const parts: Obj[] = [...pb.parts];
  // hanger tab on the back (web loop round the U of the hanger) + the hanger
  const tabTop = new THREE.Vector3(0, -P.drop + 0.0024, 0.0021);
  const tp = [
    new THREE.Vector3(0, yTop - 0.03, zBack - 0.0012),
    new THREE.Vector3(0, yTop + 0.002, zBack - 0.0012),
    new THREE.Vector3(0, tabTop.y - 0.004, zBack - 0.0014),
    new THREE.Vector3(0, tabTop.y + 0.0014, 0.0036),
    new THREE.Vector3(0, tabTop.y + 0.0012, 0.0004),
    new THREE.Vector3(0, tabTop.y - 0.006, -0.0002),
    new THREE.Vector3(0, yTop - 0.004, -0.0004),
  ];
  const tn = [
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0.3, -1),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0.3, 1),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0, -1),
  ].map((v) => v.normalize());
  parts.push(part(sheet(tp, tn, 0.011, 0.0022, { across: 3, samples: 34 }), US.web(shade)));
  parts.push(part(m1910Hanger({ spacing: 0.05, drop: P.drop, r: 0.0015 }), US.wire(), { name: 'hanger' }));
  const obj = group(parts);
  obj.name = 'us-m1942-first-aid-pouch';
  return {
    id: 'us-m1942-first-aid-pouch',
    name: 'M1942 first-aid pouch',
    object: obj,
    mount: 'belt-front-right',
    size: { w: P.w + 0.004, h: P.drop + P.h + 0.02, d: zBack + P.d + 0.01 },
  };
}
