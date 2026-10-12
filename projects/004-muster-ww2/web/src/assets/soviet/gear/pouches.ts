/**
 * Red Army belt pouches (1943-44):
 *  - M1937 two-compartment leather rifle cartridge pouch (worn in pairs, 2 x 15 rounds)
 *  - PPSh-41 drum magazine pouch (canvas, leather strap and buckle)
 *  - PPSh-41 box magazine pouch (canvas, three 35-round magazines, wooden toggle)
 *  - grenade pouch (canvas, two compartments for two RGD-33 or four F-1, two wooden toggles)
 *
 * Gear-local frame for all of them: +Z away from the body, +Y up, the belt loops lie on the
 * body in z = 0..0.0025, the 45 mm waist belt passes behind the pouch (z 0.0025..0.0065),
 * ORIGIN = belt-loop centre at belt mid-height (the belt spans y = -0.0225..+0.0225).
 */
import { THREE, G, S, part, group } from '../../../core/kit';
import type { SDF } from '../../../core/geo/sdf';
import type { GearPiece } from '../../shared/contracts';
import { SU } from './palette';
import { stitches, beltLoop, stud, wireFrame } from './helpers';
import { roundRect2D, slab, projectedBox, drape, roundedEnd, sstep, snoise, projectTo, normalAt, uSeam2D, clamp01 } from './soft';

/** Red Army enlisted waist belt and loop stack-up (m). */
export const SU_BELT = { width: 0.045, loopT: 0.0025, beltT: 0.004 };
const ZB = SU_BELT.loopT + SU_BELT.beltT; // pouch back face

type Obj = THREE.Object3D;

/** Stitch row following points on a surface (lifted a little off it). */
function seam(f: SDF, pts2: [number, number][], zGuess: (x: number, y: number) => number, lift: number, mat: THREE.Material, o: { len?: number; gap?: number; r?: number } = {}): Obj {
  const pts = pts2.map(([x, y]) => projectTo(f, new THREE.Vector3(x, y, zGuess(x, y)), lift));
  return part(stitches(pts, { len: o.len ?? 0.0034, gap: o.gap ?? 0.002, r: o.r ?? 0.00055 }), mat);
}

/** Straight stitch row between two points (already on the surface). */
function seamLine(a: THREE.Vector3, b: THREE.Vector3, mat: THREE.Material): Obj {
  return part(stitches([a, b], { len: 0.0032, gap: 0.0019, r: 0.0005 }), mat);
}

/** Rectangular sewn box with an X (strap ends sewn onto a panel), points on plane z = zc facing +Z. */
function boxX(cx: number, cy: number, w: number, h: number, zc: number, mat: THREE.Material): Obj {
  const a = new THREE.Vector3(cx - w / 2, cy - h / 2, zc), b = new THREE.Vector3(cx + w / 2, cy - h / 2, zc);
  const c = new THREE.Vector3(cx + w / 2, cy + h / 2, zc), d = new THREE.Vector3(cx - w / 2, cy + h / 2, zc);
  const g = G.mergeGeometries([
    stitches([a, b, c, d, a], { len: 0.0028, gap: 0.0016, r: 0.0005 }),
    stitches([a, c], { len: 0.0028, gap: 0.0016, r: 0.0005 }),
    stitches([b, d], { len: 0.0028, gap: 0.0016, r: 0.0005 }),
  ])!;
  return part(g, mat);
}

/** Wooden toggle (barrel with a waist groove) lying along X, centred at the origin. */
function toggleGeo(len = 0.032, r = 0.0048): THREE.BufferGeometry {
  const h = len / 2;
  const g = G.lathe(
    [
      [0, -h],
      [r * 0.55, -h],
      [r * 0.9, -h + r * 0.35],
      [r, -h + r],
      [r, -0.004],
      [r * 0.82, -0.0015],
      [r * 0.82, 0.0015],
      [r, 0.004],
      [r, h - r],
      [r * 0.9, h - r * 0.35],
      [r * 0.55, h],
      [0, h],
    ],
    16,
    40,
  );
  g.rotateZ(Math.PI / 2);
  return g;
}

/** Two belt loops on the pouch back + their stitching. */
function loops(xs: number[], w: number, yTop: number, yBot: number, mat: THREE.Material, thread: THREE.Material, t = 0.0025): Obj[] {
  const out: Obj[] = [];
  for (const x of xs) {
    out.push(part(beltLoop(x, yTop, yBot, ZB, w, t), mat));
    for (const y of [yTop - 0.001, yBot + 0.001]) {
      out.push(seamLine(new THREE.Vector3(x - w / 2 + 0.003, y, t + 0.0003), new THREE.Vector3(x + w / 2 - 0.003, y, t + 0.0003), thread));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// M1937 leather cartridge pouch
// ---------------------------------------------------------------------------------------------

/** M1937 pouch dimensions (m): body 152 x 100 x ~50 mm, two compartments of three 5-round clips. */
export const M1937 = { w: 0.156, yTop: 0.034, yBot: -0.068, cTop: 0.028, cBot: -0.064, cw: 0.071, d0: 0.046, d1: 0.037 };

export function buildM1937CartridgePouch(): GearPiece {
  const leather = SU.leather();
  const thread = SU.threadDark();
  const steel = SU.darkSteel();
  const parts: Obj[] = [];
  const BT = 0.0045; // two-layer back
  const zc0 = ZB + BT;
  const { w: W, yTop, yBot, cTop, cBot, cw: CW, d0: D0, d1: D1 } = M1937;
  const CH = cTop - cBot, cy = (cTop + cBot) / 2;
  // back panel
  parts.push(part(G.rbox(W, yTop - yBot, BT, 0.0016, 2), leather, { p: [0, (yTop + yBot) / 2, ZB + BT / 2] }));
  const back: SDF = S.box([0, (yTop + yBot) / 2, ZB + BT / 2], [W / 2, (yTop - yBot) / 2, BT / 2], 0.0015);
  const FT = 0.0032, TT = 0.0028; // flap / tongue leather
  for (const sx of [-1, 1]) {
    const cx = sx * 0.0385;
    const outline = roundRect2D(cx, cy, CW / 2, CH / 2, { tl: 0.003, tr: 0.003, bl: 0.006, br: 0.006 });
    // V section: deeper at the top; gentle moulding over the clips
    const zF = (x: number, y: number) => {
      const t = clamp01((y - cBot) / CH);
      const u = (x - cx) / (CW / 2);
      return zc0 + D1 + (D0 - D1) * t + 0.0014 * Math.max(0, 1 - u * u) * Math.sin(Math.PI * clamp01(t));
    };
    const body = slab(outline, zc0 - 0.0006, zF, 0.0045, 0.0015);
    parts.push(part(projectedBox(body, { centre: [cx, cy, zc0 + 0.02], half: [CW / 2, CH / 2, 0.021], n: [12, 14, 7] }), leather));
    // flap: from the back panel top, over the compartment, down the front
    const fd: SDF = (x, y, z) => {
      const a = body(x, y, z), b = back(x, y, z);
      const k = 0.012, h = Math.max(k - Math.abs(a - b), 0) / k;
      return Math.min(a, b) - h * h * k * 0.25;
    };
    const flapDrop = 0.037;
    const fl = drape(fd, {
      path: [
        [yTop - 0.003, ZB + BT * 0.5],
        [yTop + 0.001, zc0 + 0.001],
        [cTop + 0.004, zc0 + 0.012],
        [cTop + 0.002, zc0 + D0 * 0.65],
        [cTop - 0.003, zc0 + D0 + 0.001],
        [cTop - flapDrop * 0.5, zc0 + D0],
        [cTop - flapDrop, zc0 + D0 - 0.001],
      ],
      x0: cx,
      halfWidth: roundedEnd(CW / 2 + 0.001, 0.009),
      gap: 0.0005,
      t: FT,
      nu: 10,
      nv: 30,
    });
    parts.push(part(fl.geometry, leather));
    // flap edge stitching (sides and front edge), 3 mm in from the edge
    const sFront = fl.sAtY(cTop - 0.004);
    const fpts: THREE.Vector3[] = [];
    const hwS = CW / 2 + 0.001 - 0.003;
    for (let i = 0; i <= 8; i++) fpts.push(fl.at(-hwS, sFront + ((fl.L - 0.003 - sFront) * i) / 8, 0.0002));
    for (let i = 1; i < 12; i++) fpts.push(fl.at(-hwS + (2 * hwS * i) / 12, fl.L - 0.003, 0.0002));
    for (let i = 8; i >= 0; i--) fpts.push(fl.at(hwS, sFront + ((fl.L - 0.003 - sFront) * i) / 8, 0.0002));
    parts.push(part(stitches(fpts, { len: 0.003, gap: 0.0018, r: 0.0005 }), thread));
    // front panel seam (sides + bottom)
    parts.push(seam(body, uSeam2D(cx, cy, CW / 2, CH / 2, 0.006, 0.0026, cTop - 0.012), (x, y) => zF(x, y), 0.0002, thread));
    // closing tongue: riveted to the flap, down over the front to the stud
    const yFlapEnd = fl.at(0, fl.L, 0).y;
    const tongueTop = yFlapEnd + 0.018, tongueEnd = -0.052;
    const tn = drape(body, {
      path: [
        [tongueTop, zF(cx, tongueTop) + 0.004],
        [(tongueTop + tongueEnd) / 2, zF(cx, (tongueTop + tongueEnd) / 2)],
        [tongueEnd, zF(cx, tongueEnd)],
      ],
      x0: cx,
      halfWidth: roundedEnd(0.0068, 0.0066),
      gap: 0.0004,
      t: TT,
      nu: 6,
      nv: 22,
      lift: (_u, s) => {
        const y = tongueTop - s;
        return (FT + 0.0007) * sstep(yFlapEnd - 0.003, yFlapEnd + 0.002, y);
      },
    });
    parts.push(part(tn.geometry, leather));
    // rivet through tongue and flap
    const rv = tn.at(0, 0.006, 0);
    parts.push(part(G.scatter(G.rivetHead(0.0021), [{ p: rv, n: normalAt(body, rv) }]), steel));
    // stud on the compartment front, through the slot in the tongue end
    const sp = projectTo(body, new THREE.Vector3(cx, tongueEnd + 0.0085, zF(cx, tongueEnd + 0.0085)), -0.0004);
    const sg = stud(0.0036, 0.0062);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalAt(body, sp));
    sg.applyQuaternion(q);
    sg.translate(sp.x, sp.y, sp.z);
    parts.push(part(sg, steel));
  }
  // belt loops (riveted), D-ring for the Y-strap hook on a tab at the back top
  parts.push(...loops([-0.042, 0.042], 0.026, 0.026, -0.027, leather, thread, 0.0028));
  const rivets: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (const x of [-0.042, 0.042]) for (const y of [0.0265, -0.0275]) rivets.push({ p: new THREE.Vector3(x, y, ZB - 0.0026), n: new THREE.Vector3(0, 0, -1) });
  const tabZ = ZB - 0.0012;
  const tab = G.strap(
    [
      [0, 0.008, tabZ],
      [0, 0.028, tabZ],
      [0, 0.035, tabZ - 0.0004],
      [0, 0.0388, tabZ - 0.0012],
    ],
    0.016,
    0.0024,
    [0, 0, -1],
    { samples: 16 },
  );
  parts.push(part(tab, leather));
  rivets.push({ p: new THREE.Vector3(0, 0.016, tabZ - 0.0013), n: new THREE.Vector3(0, 0, -1) });
  parts.push(part(G.scatter(G.rivetHead(0.0022), rivets), steel));
  const dBar = new THREE.Vector3(0, 0.0395, tabZ - 0.0012);
  parts.push(part(G.rod([-0.0095, dBar.y, dBar.z], [0.0095, dBar.y, dBar.z], 0.0013, 8), steel));
  const arc = G.torus(0.0095, 0.0013, 8, 20, Math.PI);
  arc.translate(0, dBar.y, dBar.z);
  parts.push(part(arc, steel));

  const obj = group(parts);
  obj.name = 'su-m1937-cartridge-pouch';
  return {
    id: 'su-m1937-cartridge-pouch',
    name: 'M1937 cartridge pouch',
    object: obj,
    mount: 'belt-front-left',
    size: { w: W, h: 0.11, d: 0.06 },
    belt: { loopWidth: SU_BELT.width },
    strapAnchors: [new THREE.Vector3(0, dBar.y + 0.0095, dBar.z)],
  };
}

// ---------------------------------------------------------------------------------------------
// Canvas pouches
// ---------------------------------------------------------------------------------------------

interface CanvasBodySpec {
  /** Width (X) and height (Y) of the outline, top edge y. */
  w: number;
  h: number;
  yTop: number;
  /** Depth at the rim of the front face (Z), before bulges. */
  d: number;
  rTop: number;
  rBot: number;
  /** Front / back edge rounding. */
  rF: number;
  rB: number;
  /** Extra front offset at (x, y) (bulges, cells); keep it 0 towards the outline. */
  front?: (x: number, y: number) => number;
  wrinkle?: number;
  seed?: number;
  n: [number, number, number];
}

function canvasBody(s: CanvasBodySpec) {
  const cy = s.yTop - s.h / 2;
  const outline = roundRect2D(0, cy, s.w / 2, s.h / 2, { tl: s.rTop, tr: s.rTop, bl: s.rBot, br: s.rBot });
  const zF = (x: number, y: number) => ZB + s.d + (s.front ? s.front(x, y) : 0);
  const base = slab(outline, ZB, zF, s.rF, s.rB);
  const wr = s.wrinkle ?? 0.0005, seed = s.seed ?? 3;
  const f: SDF = (x, y, z) => base(x, y, z) + wr * snoise(x * 26, y * 26, z * 26, seed) + wr * 0.35 * snoise(x * 70, y * 70, z * 70, seed + 7);
  const geo = projectedBox(f, { centre: [0, cy, ZB + s.d / 2], half: [s.w / 2, s.h / 2, s.d / 2 + 0.002], n: s.n });
  return { f, geo, cy, zF, outline };
}

/** Standard pouch flap: from the back top edge over the top and down the front by `drop`. */
function canvasFlap(f: SDF, s: CanvasBodySpec, drop: number, rc: number, t = 0.0026, extraW = 0.0012) {
  const zf = ZB + s.d;
  return drape(f, {
    path: [
      [s.yTop - 0.006, ZB + 0.0015],
      [s.yTop, ZB + 0.012],
      [s.yTop + 0.001, ZB + s.d * 0.5],
      [s.yTop, zf - s.rF * 0.6],
      [s.yTop - s.rF * 0.6, zf],
      [s.yTop - drop * 0.55, zf],
      [s.yTop - drop, zf],
    ],
    halfWidth: roundedEnd(s.w / 2 + extraW, rc),
    gap: 0.0007,
    t,
    nu: 16,
    nv: 34,
    lift: (u, sArc) => 0.0006 * (1 + snoise(u * 2.5, sArc * 40, 3.3, 11)),
  });
}

/** Stitch row around the flap's sides and free edge, `ins` in from the edge. */
function flapSeam(fl: ReturnType<typeof drape>, hw: number, sFrom: number, ins: number, mat: THREE.Material): Obj {
  const pts: THREE.Vector3[] = [];
  const h = hw - ins, sEnd = fl.L - ins;
  const n = Math.max(4, Math.round((sEnd - sFrom) / 0.004));
  for (let i = 0; i <= n; i++) pts.push(fl.at(-h, sFrom + ((sEnd - sFrom) * i) / n, 0.00015));
  const m = Math.max(4, Math.round((2 * h) / 0.004));
  for (let i = 1; i < m; i++) pts.push(fl.at(-h + (2 * h * i) / m, sEnd, 0.00015));
  for (let i = n; i >= 0; i--) pts.push(fl.at(h, sFrom + ((sEnd - sFrom) * i) / n, 0.00015));
  return part(stitches(pts, { len: 0.0034, gap: 0.002, r: 0.00055 }), mat);
}

/** Wooden toggle on a short cord at p (surface normal n), plus the flap's cord loop over it. */
function toggleClosure(p: THREE.Vector3, n: THREE.Vector3, loopTop: THREE.Vector3, cord: THREE.Material, wood: THREE.Material): Obj[] {
  const out: Obj[] = [];
  const c = p.clone().addScaledVector(n, 0.0062);
  const tg = toggleGeo();
  tg.translate(c.x, c.y, c.z);
  out.push(part(tg, wood));
  // cord stem from the pouch front into the toggle waist
  out.push(part(G.rod(p.clone().addScaledVector(n, -0.001), c, 0.0013, 6), cord));
  // flap loop: from under the flap edge, down behind the toggle waist and back up
  const lp = [
    loopTop.clone().add(new THREE.Vector3(-0.0035, 0, 0)),
    new THREE.Vector3(c.x - 0.0035, c.y + 0.004, c.z + 0.001),
    new THREE.Vector3(c.x - 0.0025, c.y - 0.0045, c.z + 0.0035),
    new THREE.Vector3(c.x, c.y - 0.0062, c.z + 0.0036),
    new THREE.Vector3(c.x + 0.0025, c.y - 0.0045, c.z + 0.0035),
    new THREE.Vector3(c.x + 0.0035, c.y + 0.004, c.z + 0.001),
    loopTop.clone().add(new THREE.Vector3(0.0035, 0, 0)),
  ];
  out.push(part(G.tube(lp, 0.0016, 6, 40), cord));
  return out;
}

/** PPSh-41 drum pouch body: 225 x 225 x ~70 mm for one 71-round drum (dia. ~200 mm). */
export const PPSH_DRUM_POUCH = { w: 0.225, h: 0.232, yTop: 0.034, d: 0.064 };

export function buildPPShDrumPouch(): GearPiece {
  const canvas = SU.canvas(), strapMat = SU.canvasStrap(), thread = SU.thread();
  const leather = SU.leather(), steel = SU.darkSteel();
  const P = PPSH_DRUM_POUCH;
  const dcx = 0, dcy = P.yTop - P.h / 2 - 0.004; // drum centre (the drum presses the front)
  const spec: CanvasBodySpec = {
    w: P.w,
    h: P.h,
    yTop: P.yTop,
    d: P.d,
    rTop: 0.014,
    rBot: 0.06,
    rF: 0.017,
    rB: 0.006,
    front: (x, y) => {
      const r = Math.hypot(x - dcx, y - dcy);
      return 0.0075 * sstep(0.108, 0.07, r);
    },
    wrinkle: 0.0006,
    seed: 21,
    n: [20, 20, 8],
  };
  const body = canvasBody(spec);
  const parts: Obj[] = [part(body.geo, canvas)];
  // front gusset seam (U) and flap
  parts.push(seam(body.f, uSeam2D(0, body.cy, P.w / 2, P.h / 2, spec.rBot, 0.004, P.yTop - 0.03), body.zF, 0.0002, thread));
  const drop = 0.09;
  const fl = canvasFlap(body.f, spec, drop, 0.024);
  parts.push(part(fl.geometry, canvas));
  parts.push(flapSeam(fl, P.w / 2 + 0.0012, fl.sAtY(P.yTop - 0.012), 0.0045, thread));
  // closure: leather strap sewn to the flap, down through a frame buckle on a tab sewn to the body
  const yFlapEnd = fl.at(0, fl.L, 0).y;
  const yBuckle = yFlapEnd - 0.038;
  const tabTop = yBuckle + 0.004, tabBot = yBuckle - 0.026;
  const tab = drape(body.f, {
    path: [
      [tabTop, body.zF(0, tabTop)],
      [tabBot, body.zF(0, tabBot)],
    ],
    halfWidth: roundedEnd(0.0115, 0.004),
    gap: 0.0003,
    t: 0.0026,
    nu: 6,
    nv: 10,
  });
  parts.push(part(tab.geometry, leather));
  const strapTop = yFlapEnd + 0.05, strapEnd = yBuckle - 0.03;
  const TT = 0.0028;
  const st = drape(body.f, {
    path: [
      [strapTop, body.zF(0, strapTop) + 0.004],
      [(strapTop + strapEnd) / 2, body.zF(0, (strapTop + strapEnd) / 2)],
      [strapEnd, body.zF(0, strapEnd)],
    ],
    halfWidth: roundedEnd(0.0095, 0.009),
    gap: 0.0004,
    t: TT,
    nu: 6,
    nv: 36,
    lift: (_u, s) => {
      const y = strapTop - s;
      const onFlap = sstep(yFlapEnd - 0.003, yFlapEnd + 0.002, y) * (0.0026 + 0.0012);
      const onTab = (1 - sstep(tabTop - 0.002, tabTop + 0.003, y)) * sstep(tabBot - 0.004, tabBot + 0.001, y) * (0.0026 + 0.0004);
      return Math.max(onFlap, onTab);
    },
  });
  parts.push(part(st.geometry, leather));
  // strap sewn onto the flap: box stitch
  const sb = st.at(0, 0.02, 0.0002);
  parts.push(boxX(sb.x, sb.y, 0.013, 0.02, sb.z, SU.threadDark()));
  // buckle frame over the strap on the tab, with prong
  const bp = st.at(0, strapTop - yBuckle, 0.0009);
  const bn = normalAt(body.f, bp);
  const frame = wireFrame(0.028, 0.024, 0.0014, 0.004);
  const bar = G.rod([-0.013, 0, 0], [0.013, 0, 0], 0.0013, 6);
  const prong = G.rod([0, 0, 0.0012], [0, 0.0105, 0.0016], 0.0009, 6);
  const bq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), bn);
  for (const g of [frame, bar, prong]) {
    g.applyQuaternion(bq);
    g.translate(bp.x, bp.y, bp.z);
    parts.push(part(g, steel));
  }
  // flap sewn to the back panel: stitch row across the hinge
  const h0 = fl.at(-P.w / 2 + 0.006, 0.004, 0.0002), h1 = fl.at(P.w / 2 - 0.006, 0.004, 0.0002);
  parts.push(seamLine(h0, h1, thread));
  parts.push(...loops([-0.058, 0.058], 0.04, 0.026, -0.028, strapMat, thread));
  const obj = group(parts);
  obj.name = 'su-ppsh-drum-pouch';
  return {
    id: 'su-ppsh-drum-pouch',
    name: 'PPSh-41 drum magazine pouch',
    object: obj,
    mount: 'belt-front-right',
    size: { w: P.w + 0.004, h: P.h + 0.01, d: ZB + P.d + 0.015 },
    belt: { loopWidth: SU_BELT.width },
  };
}

/** PPSh-41 box-magazine pouch: 120 x 205 x ~50 mm, three 35-round magazines side by side. */
export const PPSH_BOX_POUCH = { w: 0.12, h: 0.215, yTop: 0.034, d: 0.046 };

export function buildPPShBoxPouch(): GearPiece {
  const canvas = SU.canvas(), strapMat = SU.canvasStrap(), thread = SU.thread(), cord = SU.cord();
  const P = PPSH_BOX_POUCH;
  const cells = [-0.04, 0, 0.04];
  const spec: CanvasBodySpec = {
    w: P.w,
    h: P.h,
    yTop: P.yTop,
    d: P.d,
    rTop: 0.01,
    rBot: 0.016,
    rF: 0.012,
    rB: 0.005,
    front: (x, y) => {
      // three magazines under the canvas; sewn partitions between them
      let m = 0;
      for (const c of cells) m = Math.max(m, Math.sqrt(Math.max(0, 1 - ((x - c) / 0.021) ** 2)));
      const vy = sstep(P.yTop - P.h + 0.004, P.yTop - P.h + 0.03, y);
      return 0.0045 * m * vy - 0.0022 * (1 - m) * vy;
    },
    wrinkle: 0.0004,
    seed: 5,
    n: [14, 22, 7],
  };
  const body = canvasBody(spec);
  const parts: Obj[] = [part(body.geo, canvas)];
  parts.push(seam(body.f, uSeam2D(0, body.cy, P.w / 2, P.h / 2, spec.rBot, 0.0035, P.yTop - 0.02), body.zF, 0.0002, thread));
  const drop = 0.05;
  const fl = canvasFlap(body.f, spec, drop, 0.012);
  parts.push(part(fl.geometry, canvas));
  parts.push(flapSeam(fl, P.w / 2 + 0.0012, fl.sAtY(P.yTop - 0.01), 0.004, thread));
  // partition seams between the magazine cells
  const yFlapEnd = fl.at(0, fl.L, 0).y;
  for (const x of [-0.02, 0.02]) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 40; i++) pts.push([x, yFlapEnd - 0.002 - ((yFlapEnd - 0.002 - (P.yTop - P.h + 0.012)) * i) / 40]);
    parts.push(seam(body.f, pts, body.zF, 0.0002, thread));
  }
  // wooden toggle closure under the flap edge
  const tp = projectTo(body.f, new THREE.Vector3(0, yFlapEnd - 0.016, body.zF(0, yFlapEnd - 0.016)), 0);
  const loopTop = fl.at(0, fl.L - 0.004, -0.0018);
  parts.push(...toggleClosure(tp, normalAt(body.f, tp), loopTop, cord, SU.toggleWood()));
  const h0 = fl.at(-P.w / 2 + 0.005, 0.004, 0.0002), h1 = fl.at(P.w / 2 - 0.005, 0.004, 0.0002);
  parts.push(seamLine(h0, h1, thread));
  parts.push(...loops([-0.032, 0.032], 0.03, 0.026, -0.028, strapMat, thread));
  const obj = group(parts);
  obj.name = 'su-ppsh-box-pouch';
  return {
    id: 'su-ppsh-box-pouch',
    name: 'PPSh-41 box magazine pouch',
    object: obj,
    mount: 'belt-front-right',
    size: { w: P.w + 0.004, h: P.h + 0.01, d: ZB + P.d + 0.02 },
    belt: { loopWidth: SU_BELT.width },
  };
}

/** Grenade pouch: 160 x 200 x ~70 mm, two compartments (two F-1 each, stacked), two toggles. */
export const GRENADE_POUCH = { w: 0.16, h: 0.21, yTop: 0.034, d: 0.06 };

export function buildGrenadePouch(): GearPiece {
  const canvas = SU.canvas(), strapMat = SU.canvasStrap(), thread = SU.thread(), cord = SU.cord();
  const P = GRENADE_POUCH;
  const yb = P.yTop - P.h;
  const lumps: [number, number][] = [];
  for (const x of [-0.04, 0.04]) for (const y of [yb + 0.052, yb + 0.132]) lumps.push([x, y]);
  const spec: CanvasBodySpec = {
    w: P.w,
    h: P.h,
    yTop: P.yTop,
    d: P.d,
    rTop: 0.012,
    rBot: 0.026,
    rF: 0.016,
    rB: 0.006,
    front: (x, y) => {
      // four grenade bodies pressing into the canvas, partition seam at x = 0
      let m = 0;
      for (const [lx, ly] of lumps) {
        const r2 = ((x - lx) / 0.032) ** 2 + ((y - ly) / 0.042) ** 2;
        m = Math.max(m, Math.max(0, 1 - r2) ** 2);
      }
      const groove = Math.exp(-((x / 0.006) ** 2)) * sstep(yb + 0.004, yb + 0.03, y);
      return 0.0065 * m - 0.0035 * groove;
    },
    wrinkle: 0.0005,
    seed: 9,
    n: [18, 20, 8],
  };
  const body = canvasBody(spec);
  const parts: Obj[] = [part(body.geo, canvas)];
  parts.push(seam(body.f, uSeam2D(0, body.cy, P.w / 2, P.h / 2, spec.rBot, 0.004, P.yTop - 0.024), body.zF, 0.0002, thread));
  const drop = 0.062;
  const fl = canvasFlap(body.f, spec, drop, 0.02);
  parts.push(part(fl.geometry, canvas));
  parts.push(flapSeam(fl, P.w / 2 + 0.0012, fl.sAtY(P.yTop - 0.012), 0.0045, thread));
  const yFlapEnd = fl.at(0, fl.L, 0).y;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 40; i++) pts.push([0, yFlapEnd - 0.002 - ((yFlapEnd - 0.002 - (yb + 0.012)) * i) / 40]);
  parts.push(seam(body.f, pts, body.zF, 0.0002, thread));
  const wood = SU.toggleWood();
  for (const x of [-0.04, 0.04]) {
    const tp = projectTo(body.f, new THREE.Vector3(x, yFlapEnd - 0.017, body.zF(x, yFlapEnd - 0.017)), 0);
    const loopTop = fl.at(x, fl.L - 0.004, -0.0018);
    parts.push(...toggleClosure(tp, normalAt(body.f, tp), loopTop, cord, wood));
  }
  const h0 = fl.at(-P.w / 2 + 0.006, 0.004, 0.0002), h1 = fl.at(P.w / 2 - 0.006, 0.004, 0.0002);
  parts.push(seamLine(h0, h1, thread));
  parts.push(...loops([-0.045, 0.045], 0.034, 0.026, -0.028, strapMat, thread));
  const obj = group(parts);
  obj.name = 'su-grenade-pouch';
  return {
    id: 'su-grenade-pouch',
    name: 'Grenade pouch',
    object: obj,
    mount: 'belt-left',
    size: { w: P.w + 0.004, h: P.h + 0.01, d: ZB + P.d + 0.02 },
    belt: { loopWidth: SU_BELT.width },
  };
}
