/**
 * ZiS-5V front end: tall radiator shell with the vertical-bar grille and exposed filler cap,
 * butterfly bonnet with centre hinge and vertical louvres, the wartime flat front wings bent
 * from plain sheet (flat top, angled front and rear sections, turned-down outer flange), inner
 * aprons, wooden running boards on steel brackets, the single (left) headlamp on its bracket,
 * frame horns with tow hooks and the starting-handle boss. No bumper (fitted only to export
 * and bus chassis).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import {
  type V2,
  type V3,
  type Station,
  sideSlab,
  frontSlab,
  merge,
  xf,
  box,
  cylZ,
  latheZ,
  bentRod,
  sweep,
  profileStations,
  sheetSection,
  rrect,
  rect,
} from './util';

const t = 0.0025;

/* ------------------------------------------------------------------ radiator + grille */

const SH_X = 0.36, SH_Y0 = 0.76, SH_Y1 = 1.6;
const SHELL_OUT: V2[] = rrect(-SH_X, SH_Y0, SH_X, SH_Y1, [0.015, 0.015, 0.075, 0.075], 8);
const OPEN_X = 0.3, OPEN_Y0 = 0.83, OPEN_Y1 = 1.535, OPEN_R = 0.05;
const SHELL_IN: V2[] = rrect(-OPEN_X, OPEN_Y0, OPEN_X, OPEN_Y1, [0.01, 0.01, OPEN_R, OPEN_R], 8);

function openTop(x: number): number {
  const ax = Math.abs(x);
  const cx = OPEN_X - OPEN_R;
  if (ax <= cx) return OPEN_Y1;
  const dx = Math.min(OPEN_R, ax - cx);
  return OPEN_Y1 - OPEN_R + Math.sqrt(Math.max(0, OPEN_R * OPEN_R - dx * dx));
}

function radiator(): { body: THREE.BufferGeometry[]; black: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const zf = D.zGrille, zb = D.zRad;
  body.push(frontSlab(SHELL_OUT, 0.014, zf - 0.007, { holes: [SHELL_IN], bevel: 0.004 }));
  const k = (SH_X - 0.008) / SH_X;
  const wallInner = SHELL_OUT.map(([x, y]) => [x * k, SH_Y0 + (y - SH_Y0) * ((SH_Y1 - SH_Y0 - 0.008) / (SH_Y1 - SH_Y0))] as V2);
  body.push(frontSlab(SHELL_OUT, zf - zb - 0.014, (zf + zb) / 2 - 0.007, { holes: [wallInner.slice().reverse()], bevel: 0.002 }));
  const bead = SHELL_OUT.map(([x, y]) => new THREE.Vector3(x * 0.995, SH_Y0 + (y - SH_Y0) * 0.997, zf + 0.001));
  body.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bead, true, 'centripetal'), 160, 0.006, 6, true));
  body.push(frontSlab(SHELL_IN.map(([x, y]) => [x * 1.04, OPEN_Y0 - 0.012 + (y - OPEN_Y0) * 1.03] as V2), 0.028, zf - 0.028, { holes: [SHELL_IN], bevel: 0.001 }));
  // vertical grille bars with a centre bar
  const n = 25;
  for (let i = 0; i < n; i++) {
    const x = -OPEN_X + 0.012 + (i * (2 * OPEN_X - 0.024)) / (n - 1);
    const top = openTop(x) - 0.002;
    const h = top - OPEN_Y0;
    const w = i === (n - 1) / 2 ? 0.014 : 0.006;
    body.push(box(w, h, 0.03, [x, OPEN_Y0 + h / 2, zf - 0.027], 0.002));
  }
  for (const y of [1.0, 1.3]) body.push(box(2 * OPEN_X, 0.01, 0.008, [0, y, zf - 0.046], 0.002));
  // core, tanks
  black.push(box(0.62, 0.66, 0.07, [0, 1.16, 2.66], 0.006));
  black.push(box(0.44, 0.05, 0.1, [0, 1.515, 2.66], 0.015));
  black.push(box(0.64, 0.07, 0.1, [0, 0.8, 2.66], 0.015));
  for (let y = 0.86; y < 1.52; y += 0.018) black.push(box(0.6, 0.004, 0.006, [0, y, 2.698], 0.001));
  // filler neck + cap above the shell
  body.push(xf(G.cyl(0.032, 0.036, 0.04, 20), [0, SH_Y1 + 0.012, 2.8]));
  steel.push(xf(G.lathe([[0, 0], [0.042, 0], [0.044, 0.008], [0.038, 0.018], [0.022, 0.024], [0.014, 0.036], [0, 0.038]], 28, 40), [0, SH_Y1 + 0.03, 2.8]));
  steel.push(xf(G.rbox(0.075, 0.012, 0.014, 0.004, 1), [0, SH_Y1 + 0.068, 2.8]));
  // starting-handle boss and crank dog under the shell
  body.push(cylZ(0.032, 0.06, [0, 0.72, zf + 0.0], 18));
  steel.push(cylZ(0.016, 0.03, [0, 0.72, zf + 0.04], 12));
  // shell bolts
  const bolts: { p: V3; n: V3 }[] = [];
  for (const s of [1, -1]) for (const y of [0.9, 1.45]) bolts.push({ p: [s * SH_X, y, 2.8], n: [s, 0, 0] });
  steel.push(G.scatter(G.boltHead(0.014, 0.007), bolts));
  // radiator support rods to the cab bulkhead (typical ZiS-5 tie rods)
  for (const s of [1, -1]) steel.push(G.rod([s * 0.3, 1.5, 2.72], [s * 0.36, 1.52, 1.55], 0.007, 8));
  return { body, black, steel };
}

/* ------------------------------------------------------------------ bonnet */

const Y_SIDE = 1.49;

function bonnetArch(hw: number, n = 12): V2[] {
  const r = 0.07;
  const pts: V2[] = [];
  const cx = hw - r, cy = Y_SIDE;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const yEdge = cy + r;
  const m = 8;
  for (let i = 1; i <= m; i++) {
    const x = cx * (1 - i / m);
    pts.push([x, yEdge + (D.bonnetTop - yEdge) * (1 - (x / cx) * (x / cx))]);
  }
  const right = pts.slice(0, -1).reverse().map(([x, y]) => [-x, y] as V2);
  return [...pts, ...right];
}

function louvre(x: number, z: number, y0: number, y1: number, s: number): THREE.BufferGeometry {
  const line: V2[] = [];
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI * 0.62);
    line.push([Math.sin(a) * 0.008, 0.006 - (1 - Math.cos(a)) * 0.01]);
  }
  const sec = sheetSection(line, 0.0022);
  const st: Station[] = [];
  const secs: V2[][] = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const k = Math.pow(Math.sin(Math.PI * f), 0.45);
    st.push({ p: new THREE.Vector3(x, y0 + (y1 - y0) * f, z), u: new THREE.Vector3(s, 0, 0), v: new THREE.Vector3(0, 0, 1) });
    secs.push(sec.map(([a, b]) => [a * Math.max(0.05, k), b] as V2));
  }
  return sweep(secs, st, true, 60);
}

function bonnet(): { body: THREE.BufferGeometry[]; black: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const z0 = D.zFire + 0.004, z1 = D.zRad;
  const len = z1 - z0;
  const outer = bonnetArch(D.bonnetX);
  const inner = bonnetArch(D.bonnetX - t).map(([x, y]) => [x, y - t] as V2).reverse();
  body.push(frontSlab([...outer, ...inner], len, z0 + len / 2, { bevel: 0.0008 }));
  steel.push(cylZ(0.0055, len - 0.02, [0, D.bonnetTop + 0.004, z0 + len / 2], 10));
  for (let k = 0; k < 9; k++) body.push(cylZ(0.009, len / 9 - 0.008, [0, D.bonnetTop + 0.003, z0 + (k + 0.5) * (len / 9)], 12));
  // side panels with a long row of vertical louvres
  const LZ0 = 1.7, LN = 26, LP = 0.034, LY0 = 1.18, LY1 = 1.4;
  const holes: V2[][] = [];
  for (let i = 0; i < LN; i++) {
    const zc = LZ0 + i * LP;
    holes.push(rrect(zc - 0.005, LY0, zc + 0.005, LY1, [0.004, 0.004, 0.004, 0.004], 2));
  }
  for (const s of [1, -1]) {
    body.push(sideSlab(rect(z0, D.bonnetBot, z1, Y_SIDE + 0.001), t, s * (D.bonnetX - t / 2), { holes, bevel: 0.0006 }));
    for (let i = 0; i < LN; i++) body.push(louvre(s * D.bonnetX, LZ0 + i * LP + 0.005, LY0, LY1, s));
    black.push(sideSlab(rect(LZ0 - 0.03, LY0 - 0.03, LZ0 + LN * LP + 0.01, LY1 + 0.03), 0.004, s * (D.bonnetX - 0.03)));
    body.push(cylZ(0.005, len, [s * (D.bonnetX + 0.001), D.bonnetBot + 0.004, z0 + len / 2], 8));
    for (const zc of [1.75, 2.55]) {
      body.push(box(0.012, 0.05, 0.05, [s * (D.bonnetX + 0.006), D.bonnetBot + 0.035, zc], 0.004));
      steel.push(bentRod([[s * (D.bonnetX + 0.012), D.bonnetBot + 0.05, zc - 0.018], [s * (D.bonnetX + 0.03), D.bonnetBot + 0.045, zc], [s * (D.bonnetX + 0.012), D.bonnetBot + 0.05, zc + 0.018]], 0.004, 0.01, 6));
      steel.push(bentRod([[s * (D.bonnetX + 0.014), D.bonnetBot + 0.03, zc], [s * (D.bonnetX + 0.014), D.bonnetBot - 0.03, zc]], 0.004, 0.01, 6));
    }
    steel.push(bentRod([[s * (D.bonnetX + 0.002), 1.3, 2.58], [s * (D.bonnetX + 0.028), 1.3, 2.59], [s * (D.bonnetX + 0.028), 1.3, 2.67], [s * (D.bonnetX + 0.002), 1.3, 2.68]], 0.0045, 0.01, 6));
    body.push(box(0.064, 0.01, len, [s * (D.bonnetX + 0.028), D.bonnetBot - 0.006, z0 + len / 2], 0.002));
  }
  return { body, black, steel };
}

/* ------------------------------------------------------------------ flat wings */

/** Round the corners of a 2D polyline with quadratic fillets. */
function fillet2(pts: V2[], r: number, seg = 5): V2[] {
  const out: V2[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const rr = Math.min(r, la / 2, lc / 2);
    const p1: V2 = [b[0] + ((a[0] - b[0]) / la) * rr, b[1] + ((a[1] - b[1]) / la) * rr];
    const p2: V2 = [b[0] + ((c[0] - b[0]) / lc) * rr, b[1] + ((c[1] - b[1]) / lc) * rr];
    for (let k = 0; k <= seg; k++) {
      const u = k / seg;
      out.push([
        (1 - u) * (1 - u) * p1[0] + 2 * (1 - u) * u * b[0] + u * u * p2[0],
        (1 - u) * (1 - u) * p1[1] + 2 * (1 - u) * u * b[1] + u * u * p2[1],
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  // densify long straight runs
  const dense: V2[] = [out[0]];
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i];
    const nn = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.08));
    for (let k = 1; k <= nn; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / nn, a[1] + ((b[1] - a[1]) * k) / nn]);
  }
  return dense;
}

/** Wing side profile (z, y) rear to front: rear slope, flat top, bent-down front. */
export const WING_PROFILE: V2[] = fillet2(
  [
    [1.27, D.runY + 0.012],
    [1.62, D.wingY],
    [2.64, D.wingY],
    [2.9, 0.66],
  ],
  0.05,
);

function wingLine(): V2[] {
  const x0 = D.wingIn, x1 = D.wingOut;
  return [
    [x0, 0.0],
    [x1 - 0.012, 0.0],
    [x1 - 0.003, -0.004],
    [x1, -0.014],
    [x1, -0.035],
  ];
}

function wings(): { body: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const sec = sheetSection(wingLine(), 0.003);
  const st = profileStations(WING_PROFILE);
  const wing = sweep(sec, st, true, 30);
  body.push(wing, xf(wing.clone(), [0, 0, 0], [0, 0, 0], [-1, 1, 1]));
  for (const s of [1, -1]) {
    // inner apron between the wing and the bonnet ledge, down to the frame
    const ap: V2[] = [
      [D.zFire, 0.85],
      [2.64, 0.85],
      [2.64, D.bonnetBot - 0.01],
      [D.zFire, D.bonnetBot - 0.01],
    ];
    body.push(sideSlab(ap, t, s * (D.wingIn - t / 2)));
    // stays from the frame to the wing underside
    for (const zc of [1.8, 2.55]) {
      steel.push(bentRod([[s * (D.frameX + 0.03), 0.8, zc], [s * 0.62, 0.93, zc], [s * 0.82, D.wingY - 0.004, zc]], 0.008, 0.03));
      body.push(box(0.05, 0.006, 0.04, [s * 0.82, D.wingY - 0.006, zc], 0.002));
    }
    // bolts along the wing's inner edge and the bent seams
    const bolts: { p: V3; n: V3 }[] = [];
    for (let i = 2; i < WING_PROFILE.length - 2; i += 4) {
      const [z, y] = WING_PROFILE[i];
      bolts.push({ p: [s * (D.wingIn + 0.018), y + st[i].v.y * 0.0015, z + st[i].v.z * 0.0015], n: [st[i].v.x, st[i].v.y, st[i].v.z] });
    }
    steel.push(G.scatter(G.boltHead(0.013, 0.006), bolts));
  }
  // front cross panel under the radiator between the aprons
  body.push(frontSlab(rect(-D.wingIn, 0.62, D.wingIn, SH_Y0 + 0.01), 0.003, D.zGrille - 0.02));
  return { body, steel };
}

/* ------------------------------------------------------------------ running boards (wooden) */

function runningBoards(): { wood: THREE.BufferGeometry[]; body: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const wood: THREE.BufferGeometry[] = [];
  const body: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const zA = 0.24, zB = 1.3;
  for (const s of [1, -1]) {
    for (let i = 0; i < 3; i++) {
      const x = 0.595 + i * 0.1;
      wood.push(box(0.096, 0.032, zB - zA, [s * x, D.runY - 0.016, (zA + zB) / 2], 0.005));
    }
    body.push(box(0.006, 0.05, zB - zA, [s * (D.wingOut - 0.003), D.runY - 0.02, (zA + zB) / 2], 0.002));
    for (const zc of [0.36, 1.18]) {
      body.push(box(D.wingOut - D.frameX - 0.03, 0.012, 0.05, [s * ((D.wingOut + D.frameX + 0.03) / 2), D.runY - 0.038, zc], 0.003));
      body.push(xf(G.rbox(0.01, 0.12, 0.05, 0.003, 1), [s * (D.frameX + 0.04), D.runY - 0.09, zc]));
      for (const x of [0.6, 0.7, 0.8]) steel.push(xf(G.cyl(0.008, 0.008, 0.004, 8), [s * x, D.runY + 0.001, zc]));
    }
  }
  return { wood, body, steel };
}

/* ------------------------------------------------------------------ headlamp, hooks */

function headlamp(x: number, z: number, yFoot: number): { body: THREE.BufferGeometry[]; black: THREE.BufferGeometry[]; refl: THREE.BufferGeometry[]; lens: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const refl: THREE.BufferGeometry[] = [];
  const lens: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const yc = yFoot + 0.2;
  body.push(xf(G.lathe([[0.05, 0], [0.047, 0.01], [0.03, 0.02], [0.018, 0.034], [0.016, 0.05]], 24, 40), [x, yFoot - 0.003, z - 0.03]));
  body.push(xf(G.cyl(0.016, 0.016, 0.09, 14), [x, yFoot + 0.09, z - 0.03]));
  body.push(bentRod([[x - 0.1, yc - 0.01, z - 0.035], [x - 0.08, yc - 0.085, z - 0.03], [x, yc - 0.105, z - 0.03], [x + 0.08, yc - 0.085, z - 0.03], [x + 0.1, yc - 0.01, z - 0.035]], 0.009, 0.05));
  body.push(xf(latheZ([[0.0, -0.11], [0.04, -0.107], [0.068, -0.092], [0.087, -0.068], [0.097, -0.035], [0.1, 0.0], [0.101, 0.006]], 40, 35), [x, yc, z]));
  body.push(xf(latheZ([[0.096, 0.0], [0.104, 0.0], [0.106, 0.007], [0.104, 0.016], [0.096, 0.02], [0.092, 0.018]], 48, 40), [x, yc, z + 0.004]));
  refl.push(xf(latheZ(([[0.014, -0.072], [0.038, -0.064], [0.06, -0.043], [0.079, -0.015], [0.092, 0.008]] as V2[]).reverse(), 40, 60), [x, yc, z]));
  black.push(xf(new THREE.SphereGeometry(0.014, 12, 8), [x, yc, z - 0.032]));
  lens.push(xf(latheZ(([[0.0, 0.017], [0.038, 0.0165], [0.07, 0.013], [0.093, 0.005], [0.094, 0.0]] as V2[]).reverse(), 48, 60), [x, yc, z + 0.006]));
  for (const s of [1, -1]) steel.push(xf(G.cyl(0.014, 0.014, 0.02, 12).rotateZ(Math.PI / 2), [x + s * 0.1, yc - 0.01, z - 0.035]));
  return { body, black, refl, lens, steel };
}

export function buildFront(): THREE.Object3D {
  const rad = radiator();
  const bon = bonnet();
  const wg = wings();
  const rb = runningBoards();
  const body = [...rad.body, ...bon.body, ...wg.body, ...rb.body];
  const black = [...rad.black, ...bon.black];
  const steel = [...rad.steel, ...bon.steel, ...wg.steel, ...rb.steel];
  const refl: THREE.BufferGeometry[] = [];
  const lens: THREE.BufferGeometry[] = [];
  // single headlamp on the left wing beside the radiator (right lamp deleted in wartime)
  const h = headlamp(0.62, 2.5, D.wingY + 0.003);
  body.push(...h.body);
  black.push(...h.black);
  refl.push(...h.refl);
  lens.push(...h.lens);
  steel.push(...h.steel);
  // blanked mounting pad where the right lamp used to be
  body.push(xf(G.cyl(0.04, 0.045, 0.012, 20), [-0.62, D.wingY + 0.008, 2.47]));
  // tow hooks on the frame horns (no bumper on the ZiS-5V)
  for (const s of [1, -1]) {
    body.push(box(0.02, 0.16, 0.12, [s * (D.frameX + 0.01), 0.75, D.frameZ0 - 0.03], 0.004));
    steel.push(bentRod([[s * D.frameX, 0.77, D.frameZ0 - 0.04], [s * D.frameX, 0.74, D.frameZ0 + 0.03], [s * D.frameX, 0.68, D.frameZ0 + 0.05], [s * D.frameX, 0.64, D.frameZ0 + 0.01]], 0.017, 0.025, 10));
  }
  return group([
    part(merge(body), P.body()),
    part(merge(black), P.black()),
    part(merge(steel), P.steel()),
    part(merge(refl), P.reflector()),
    part(merge(lens), P.lens()),
    part(merge(rb.wood), P.woodZ()),
  ]);
}
