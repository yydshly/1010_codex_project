/**
 * Opel Blitz front end: radiator shell with the vertical-bar grille (no maker's badge, as on
 * late wartime trucks), radiator core and filler cap, butterfly bonnet with centre hinge and
 * vertical louvres in the side panels, bonnet catches, crowned front wings with rolled skirts,
 * inner aprons, running boards, headlamps on the wings, Notek blackout lamp on the left wing,
 * side marker lamps, channel bumper with tow hooks and the front apron with the crank boss.
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
  flatSlab,
  merge,
  xf,
  box,
  cylX,
  cylZ,
  latheZ,
  bentRod,
  spline2,
  sweep,
  profileStations,
  sheetSection,
  rrect,
  rect,
  arc2,
} from './util';

const t = D.sheet;

/* ------------------------------------------------------------------ radiator + grille */

const SHELL_OUT: V2[] = rrect(-D.bonnetX, 0.84, D.bonnetX, 1.578, [0.02, 0.02, 0.15, 0.15], 8);
const OPEN_X = 0.322, OPEN_Y0 = 0.905, OPEN_Y1 = 1.508, OPEN_R = 0.1;
const SHELL_IN: V2[] = rrect(-OPEN_X, OPEN_Y0, OPEN_X, OPEN_Y1, [0.012, 0.012, OPEN_R, OPEN_R], 8);

/** Top edge height of the grille opening at lateral position x. */
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
  // shell: a deep pressed surround (front frame + side walls)
  body.push(frontSlab(SHELL_OUT, 0.012, zf - 0.006, { holes: [SHELL_IN], bevel: 0.004 }));
  const ring = SHELL_OUT.map(([x, y]) => new THREE.Vector3(x, y, zf - 0.004));
  ring.push(ring[0].clone());
  // side walls of the shell back to the bonnet line
  const wallOuter = SHELL_OUT;
  const wallInner = wallOuter.map(([x, y]) => [x * ((D.bonnetX - 0.008) / D.bonnetX), 0.84 + (y - 0.84) * ((1.578 - 0.84 - 0.008) / (1.578 - 0.84))] as V2);
  body.push(frontSlab(wallOuter, zf - zb - 0.012, (zf + zb) / 2 - 0.006, { holes: [wallInner.slice().reverse()], bevel: 0.002 }));
  // rolled bead around the front edge of the shell
  const bead = SHELL_OUT.map(([x, y]) => new THREE.Vector3(x * 0.995, 0.84 + (y - 0.84) * 0.997, zf + 0.001));
  body.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bead, true, 'centripetal'), 160, 0.006, 6, true));
  // inner return of the opening (depth)
  body.push(frontSlab(SHELL_IN.map(([x, y]) => [x * 1.035, OPEN_Y0 - 0.012 + (y - OPEN_Y0) * 1.03] as V2), 0.03, zf - 0.027, { holes: [SHELL_IN], bevel: 0.001 }));
  // vertical grille bars
  const n = 29;
  for (let i = 0; i < n; i++) {
    const x = -OPEN_X + 0.012 + (i * (2 * OPEN_X - 0.024)) / (n - 1);
    const top = openTop(x) - 0.002;
    const h = top - OPEN_Y0;
    body.push(box(0.0055, h, 0.032, [x, OPEN_Y0 + h / 2, zf - 0.026], 0.0018));
  }
  // horizontal tie bars behind the grille bars
  for (const y of [1.06, 1.3]) body.push(box(2 * OPEN_X, 0.012, 0.008, [0, y, zf - 0.046], 0.002));
  // radiator core, header and bottom tanks (black)
  black.push(box(0.66, 0.6, 0.07, [0, 1.205, 2.665], 0.006));
  black.push(box(0.56, 0.06, 0.1, [0, 1.5, 2.665], 0.015));
  black.push(box(0.7, 0.07, 0.1, [0, 0.87, 2.665], 0.015));
  // core fins: fine horizontal lines on the core face
  for (let y = 0.93; y < 1.5; y += 0.018) black.push(box(0.64, 0.004, 0.006, [0, y, 2.703], 0.001));
  // filler neck and cap on top of the shell, protruding through the bonnet front
  body.push(xf(G.cyl(0.03, 0.03, 0.04, 20), [0, 1.575, 2.755]));
  steel.push(xf(G.lathe([[0, 0], [0.04, 0], [0.042, 0.008], [0.036, 0.018], [0.02, 0.024], [0.012, 0.034], [0, 0.036]], 28, 40), [0, 1.575, 2.755]));
  steel.push(xf(G.rbox(0.07, 0.012, 0.014, 0.004, 1), [0, 1.61, 2.755]));
  // starting-handle boss below the grille
  body.push(cylZ(0.03, 0.05, [0, 0.87, zf + 0.012], 18));
  steel.push(cylZ(0.016, 0.02, [0, 0.87, zf + 0.042], 12));
  // shell mounting bolts on the side walls
  const bolts: { p: V3; n: V3 }[] = [];
  for (const s of [1, -1]) for (const y of [0.95, 1.4]) bolts.push({ p: [s * D.bonnetX, y, 2.76], n: [s, 0, 0] });
  steel.push(G.scatter(G.boltHead(0.014, 0.007), bolts));
  return { body, black, steel };
}

/* ------------------------------------------------------------------ bonnet */

const Y_SIDE = 1.465; // where the side panel meets the top arch

/** Right-to-left bonnet arch polyline (x, y) from the left side top over the crown. */
function bonnetArch(hw: number, n = 14): V2[] {
  const r = 0.09;
  const pts: V2[] = [];
  const cx = hw - r, cy = Y_SIDE;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  // crowned top towards the centre
  const yEdge = cy + r;
  const m = 8;
  for (let i = 1; i <= m; i++) {
    const x = cx * (1 - i / m);
    pts.push([x, yEdge + (D.bonnetTop - yEdge) * (1 - (x / cx) * (x / cx))]);
  }
  const left = pts;
  const right = left.slice(0, -1).reverse().map(([x, y]) => [-x, y] as V2);
  return [...left, ...right];
}

/** Vertical louvre hood (pressed), swept along Y, open towards the rear. */
function louvre(x: number, z: number, y0: number, y1: number, s: number): THREE.BufferGeometry {
  const line: V2[] = [];
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI * 0.62);
    line.push([Math.sin(a) * 0.009, 0.0065 - (1 - Math.cos(a)) * 0.011]);
  }
  const sec = sheetSection(line, 0.0022);
  const st: Station[] = [];
  const secs: V2[][] = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const y = y0 + (y1 - y0) * f;
    const k = Math.pow(Math.sin(Math.PI * f), 0.45);
    st.push({ p: new THREE.Vector3(x, y, z), u: new THREE.Vector3(s, 0, 0), v: new THREE.Vector3(0, 0, 1) });
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
  // top: arch shell (outer arch + inner arch back), extruded along Z
  const outer = bonnetArch(D.bonnetX);
  const inner = bonnetArch(D.bonnetX - t).map(([x, y]) => [x, y - t] as V2).reverse();
  body.push(frontSlab([...outer, ...inner], len, z0 + len / 2, { bevel: 0.0008 }));
  // centre hinge: knuckles along the crown
  steel.push(cylZ(0.0055, len - 0.02, [0, D.bonnetTop + 0.004, z0 + len / 2], 10));
  for (let k = 0; k < 8; k++) body.push(cylZ(0.009, len / 8 - 0.008, [0, D.bonnetTop + 0.003, z0 + (k + 0.5) * (len / 8)], 12));
  // side panels with vertical louvres
  const LZ0 = 1.86, LN = 18, LP = 0.034, LY0 = 1.2, LY1 = 1.405;
  const holes: V2[][] = [];
  for (let i = 0; i < LN; i++) {
    const zc = LZ0 + i * LP;
    holes.push(rrect(zc - 0.005, LY0, zc + 0.005, LY1, [0.004, 0.004, 0.004, 0.004], 2));
  }
  for (const s of [1, -1]) {
    const x = s * (D.bonnetX - t / 2);
    const outline = rect(z0, D.bonnetBot, z1, Y_SIDE + 0.001);
    const g = sideSlab(outline, t, x, { holes, bevel: 0.0006 });
    body.push(g);
    // louvre hoods (open towards the rear), black shadow panel behind the slots
    for (let i = 0; i < LN; i++) body.push(louvre(s * D.bonnetX, LZ0 + i * LP + 0.005, LY0, LY1, s));
    black.push(sideSlab(rect(LZ0 - 0.03, LY0 - 0.03, LZ0 + LN * LP + 0.01, LY1 + 0.03), 0.004, s * (D.bonnetX - 0.03)));
    // lower edge stiffening lip and the two catches with handles
    body.push(cylZ(0.005, len, [s * (D.bonnetX + 0.001), D.bonnetBot + 0.004, z0 + len / 2], 8));
    for (const zc of [1.95, 2.5]) {
      body.push(box(0.012, 0.05, 0.05, [s * (D.bonnetX + 0.006), D.bonnetBot + 0.035, zc], 0.004));
      steel.push(bentRod([[s * (D.bonnetX + 0.012), D.bonnetBot + 0.05, zc - 0.018], [s * (D.bonnetX + 0.03), D.bonnetBot + 0.045, zc], [s * (D.bonnetX + 0.012), D.bonnetBot + 0.05, zc + 0.018]], 0.004, 0.01, 6));
      steel.push(bentRod([[s * (D.bonnetX + 0.014), D.bonnetBot + 0.03, zc], [s * (D.bonnetX + 0.014), D.bonnetBot - 0.03, zc]], 0.004, 0.01, 6));
    }
    // lift handle on the side panel
    steel.push(bentRod([[s * (D.bonnetX + 0.002), 1.34, 2.56], [s * (D.bonnetX + 0.028), 1.34, 2.57], [s * (D.bonnetX + 0.028), 1.34, 2.65], [s * (D.bonnetX + 0.002), 1.34, 2.66]], 0.0045, 0.01, 6));
    // ledge the bonnet rests on (top of the inner apron)
    body.push(box(0.03, 0.01, len, [s * (D.bonnetX + 0.005), D.bonnetBot - 0.006, z0 + len / 2], 0.002));
  }
  return { body, black, steel };
}

/* ------------------------------------------------------------------ wings */

/** Side profile (z, y) of the wing crown line at its inner edge, rear to front. */
export const WING_PROFILE: V2[] = spline2(
  [
    [1.3, 0.772],
    [1.42, 0.782],
    [1.55, 0.84],
    [1.68, 0.935],
    [1.82, 1.012],
    [1.98, 1.062],
    [2.15, 1.085],
    [2.32, 1.08],
    [2.48, 1.058],
    [2.62, 1.003],
    [2.75, 0.918],
    [2.86, 0.808],
    [2.93, 0.708],
    [2.965, 0.63],
  ],
  56,
);

/** Wing cross-section as an open polyline (x, n); n = offset along the profile normal. */
function wingLine(): V2[] {
  const pts: V2[] = [];
  const x0 = D.wingIn, x1 = D.wingOut;
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const x = x0 + (x1 - 0.035 - x0) * f;
    pts.push([x, 0.034 * Math.sin(Math.PI * Math.pow(f, 0.8)) * (1 - 0.35 * f)]);
  }
  // rolled outer edge turning down into the skirt
  for (const [a, b] of [
    [x1 - 0.022, -0.004],
    [x1 - 0.011, -0.016],
    [x1 - 0.004, -0.034],
    [x1 - 0.001, -0.056],
    [x1, -0.076],
  ] as V2[])
    pts.push([a, b]);
  return pts;
}

function wings(): { body: THREE.BufferGeometry[]; black: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const sec = sheetSection(wingLine(), 0.003);
  const st = profileStations(WING_PROFILE);
  const wing = sweep(sec, st, true, 38);
  body.push(wing, xf(wing.clone(), [0, 0, 0], [0, 0, 0], [-1, 1, 1]));
  // beaded outer edge
  const beadPts = WING_PROFILE.map(([z, y], i) => {
    const s = st[i];
    return new THREE.Vector3(D.wingOut - 0.0005, y + s.v.y * -0.074, z + s.v.z * -0.074);
  });
  const bead = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beadPts, false, 'centripetal'), 120, 0.005, 6, false);
  body.push(bead, xf(bead.clone(), [0, 0, 0], [0, 0, 0], [-1, 1, 1]));
  for (const s of [1, -1]) {
    // inner apron between the wing and the bonnet ledge / frame
    const ap: V2[] = [
      [D.zFire, 0.83],
      [D.zRad, 0.83],
      [D.zRad, D.bonnetBot - 0.01],
      [D.zFire, D.bonnetBot - 0.01],
    ];
    body.push(sideSlab(ap, t, s * (D.wingIn - t / 2)));
    // wing stays: flat bars from the apron under the wing to the frame
    for (const zc of [1.86, 2.6]) {
      const yEnd = wingTopAt(0.84, zc).y - 0.012;
      steel.push(bentRod([[s * (D.frameX + 0.03), 0.79, zc], [s * 0.66, Math.min(yEnd - 0.08, 0.93), zc], [s * 0.84, yEnd, zc]], 0.008, 0.03));
      body.push(box(0.05, 0.006, 0.04, [s * 0.84, yEnd + 0.006, zc], 0.002));
    }
    // wing bolts along the inner edge
    const bolts: { p: V3; n: V3 }[] = [];
    for (let i = 8; i < WING_PROFILE.length - 4; i += 6) {
      const [z, y] = WING_PROFILE[i];
      bolts.push({ p: [s * (D.wingIn + 0.018), y + st[i].v.y * 0.006, z + st[i].v.z * 0.006], n: [st[i].v.x, st[i].v.y, st[i].v.z] });
    }
    steel.push(G.scatter(G.boltHead(0.013, 0.006), bolts));
  }
  // cross panel under the radiator between the wings (front apron)
  body.push(frontSlab(rect(-D.wingIn, 0.66, D.wingIn, 0.845), 0.003, D.zGrille - 0.01));
  return { body, black, steel };
}

/* ------------------------------------------------------------------ running boards */

function runningBoards(): { body: THREE.BufferGeometry[]; black: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const zA = 0.43, zB = 1.34;
  for (const s of [1, -1]) {
    const x0 = 0.6, x1 = D.wingOut - 0.003;
    // tread plate with turned-down outer lip
    const line: V2[] = [
      [x0, 0.0],
      [x1 - 0.02, 0.0],
      [x1 - 0.004, -0.006],
      [x1, -0.03],
    ];
    const sec = sheetSection(line, 0.003).map(([a, b]) => [s * a, b] as V2);
    const st: Station[] = [zA, zB].map((z) => ({ p: new THREE.Vector3(0, D.runY, z), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0) }));
    body.push(sweep(sec, st, true, 50));
    // pressed longitudinal ribs
    for (const xr of [0.68, 0.75, 0.82, 0.89]) body.push(box(0.012, 0.006, zB - zA - 0.12, [s * xr, D.runY + 0.002, (zA + zB) / 2], 0.003));
    // support brackets from the frame
    for (const zc of [0.55, 1.2]) {
      body.push(box(x1 - D.frameX - 0.03, 0.012, 0.05, [s * ((x1 + D.frameX + 0.03) / 2), D.runY - 0.012, zc], 0.003));
      body.push(xf(G.rbox(0.01, 0.12, 0.05, 0.003, 1), [s * (D.frameX + 0.04), D.runY - 0.06, zc]));
    }
  }
  return { body, black };
}

/* ------------------------------------------------------------------ lamps */

function headlamp(x: number, z: number, yFoot: number): { body: THREE.BufferGeometry[]; black: THREE.BufferGeometry[]; refl: THREE.BufferGeometry[]; lens: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const refl: THREE.BufferGeometry[] = [];
  const lens: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const yc = yFoot + 0.19;
  // pressed foot on the wing + stem + fork
  body.push(xf(G.lathe([[0.055, 0], [0.052, 0.01], [0.034, 0.022], [0.02, 0.036], [0.018, 0.05]], 24, 40), [x, yFoot - 0.004, z - 0.02]));
  body.push(xf(G.cyl(0.017, 0.017, 0.08, 14), [x, yFoot + 0.085, z - 0.02]));
  body.push(bentRod([[x - 0.1, yc - 0.01, z - 0.03], [x - 0.08, yc - 0.08, z - 0.025], [x, yc - 0.1, z - 0.02], [x + 0.08, yc - 0.08, z - 0.025], [x + 0.1, yc - 0.01, z - 0.03]], 0.009, 0.05));
  for (const s of [1, -1]) steel.push(cylX(0.014, 0.02, [x + s * 0.1, yc - 0.01, z - 0.03], 12));
  // bucket and rim (axis +Z)
  body.push(xf(latheZ([[0.0, -0.1], [0.035, -0.098], [0.062, -0.085], [0.08, -0.062], [0.09, -0.032], [0.094, 0.0], [0.095, 0.006]], 40, 35), [x, yc, z]));
  body.push(xf(latheZ([[0.09, 0.0], [0.098, 0.0], [0.1, 0.007], [0.098, 0.016], [0.09, 0.02], [0.086, 0.018]], 48, 40), [x, yc, z + 0.004]));
  refl.push(xf(latheZ(([[0.014, -0.068], [0.035, -0.06], [0.056, -0.04], [0.074, -0.014], [0.086, 0.008]] as V2[]).reverse(), 40, 60), [x, yc, z]));
  black.push(xf(new THREE.SphereGeometry(0.014, 12, 8), [x, yc, z - 0.03]));
  lens.push(xf(latheZ(([[0.0, 0.016], [0.035, 0.0155], [0.065, 0.012], [0.087, 0.005], [0.088, 0.0]] as V2[]).reverse(), 48, 60), [x, yc, z + 0.006]));
  return { body, black, refl, lens, steel };
}

/** Notek blackout driving lamp (hooded, slotted front) on a bracket. */
function notek(x: number, z: number, yFoot: number): { body: THREE.BufferGeometry[]; black: THREE.BufferGeometry[]; lens: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const lens: THREE.BufferGeometry[] = [];
  const yc = yFoot + 0.1;
  body.push(xf(G.lathe([[0.03, 0], [0.028, 0.008], [0.014, 0.018], [0.012, 0.03]], 20, 40), [x, yFoot - 0.003, z]));
  body.push(xf(G.cyl(0.012, 0.012, 0.05, 12), [x, yFoot + 0.05, z]));
  // round body with the flat-topped hood
  body.push(xf(latheZ([[0.0, -0.07], [0.04, -0.066], [0.058, -0.045], [0.064, -0.01], [0.065, 0.02]], 32, 40), [x, yc, z]));
  const hood: V2[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * 0.08 + (i / 12) * Math.PI * 0.84;
    hood.push([Math.cos(a) * 0.069, Math.sin(a) * 0.069]);
  }
  const hs = sheetSection(hood, 0.003);
  body.push(sweep(hs, [0.0, 0.07].map((dz) => ({ p: new THREE.Vector3(x, yc, z + dz), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0) })), true, 50));
  // slotted face: horizontal louvres over a small lens
  lens.push(xf(G.cyl(0.056, 0.056, 0.004, 28).rotateX(Math.PI / 2), [x, yc, z + 0.022]));
  for (let i = 0; i < 5; i++) black.push(box(0.1, 0.006, 0.012, [x, yc - 0.036 + i * 0.012, z + 0.03], 0.002));
  black.push(box(0.11, 0.012, 0.012, [x, yc + 0.03, z + 0.03], 0.002));
  return { body, black, lens };
}

/** Small side-marker lamp on the outer wing crown. */
function markerLamp(x: number, z: number, yFoot: number): { body: THREE.BufferGeometry[]; lens: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const lens: THREE.BufferGeometry[] = [];
  body.push(xf(G.lathe([[0.025, 0], [0.022, 0.012], [0.012, 0.02], [0.01, 0.04]], 16, 40), [x, yFoot - 0.003, z]));
  body.push(xf(latheZ([[0.0, -0.04], [0.025, -0.036], [0.032, -0.015], [0.033, 0.012]], 24, 40), [x, yFoot + 0.065, z]));
  lens.push(xf(latheZ(([[0.0, 0.02], [0.02, 0.018], [0.03, 0.01], [0.031, 0.0]] as V2[]).reverse(), 24, 60), [x, yFoot + 0.065, z + 0.012]));
  return { body, lens };
}

/** Height of the wing's top surface at (x, z) (inner-edge profile + crown). */
export function wingTopAt(x: number, z: number): { y: number; n: THREE.Vector3 } {
  let best = 0;
  for (let i = 1; i < WING_PROFILE.length; i++) if (Math.abs(WING_PROFILE[i][0] - z) < Math.abs(WING_PROFILE[best][0] - z)) best = i;
  const st = profileStations(WING_PROFILE)[best];
  const line = wingLine();
  let nOff = 0;
  for (let i = 1; i < line.length; i++) {
    if (line[i][0] >= Math.abs(x)) {
      const a = line[i - 1], b = line[i];
      const f = (Math.abs(x) - a[0]) / Math.max(1e-6, b[0] - a[0]);
      nOff = a[1] + (b[1] - a[1]) * f;
      break;
    }
  }
  const [zz, yy] = WING_PROFILE[best];
  return { y: yy + st.v.y * nOff + (z - zz) * (-st.v.z / Math.max(0.2, st.v.y)), n: st.v.clone() };
}

/* ------------------------------------------------------------------ bumper */

function bumper(): { body: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const body: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const zf = D.zFront;
  // channel section, open at the back
  const sec: V2[] = [
    [0.0, 0.0],
    [0.0, 0.15],
    [-0.065, 0.15],
    [-0.065, 0.143],
    [-0.006, 0.143],
    [-0.006, 0.007],
    [-0.065, 0.007],
    [-0.065, 0.0],
  ];
  const st: Station[] = [-0.97, 0.97].map((x) => ({ p: new THREE.Vector3(x, 0.5, zf), u: new THREE.Vector3(0, 0, 1), v: new THREE.Vector3(0, 1, 0) }));
  body.push(sweep(sec, st, true, 40));
  for (const s of [1, -1]) body.push(box(0.065, 0.15, 0.006, [s * 0.967, 0.575, zf - 0.035], 0.002));
  // brackets to the frame horns
  for (const s of [1, -1]) {
    body.push(box(0.012, 0.12, 0.1, [s * (D.frameX + 0.018), 0.57, zf - 0.11], 0.003));
    // tow hooks
    steel.push(bentRod([[s * 0.52, 0.5, zf - 0.05], [s * 0.52, 0.47, zf - 0.01], [s * 0.52, 0.43, zf + 0.0], [s * 0.52, 0.405, zf - 0.03]], 0.014, 0.02, 10));
    steel.push(box(0.05, 0.05, 0.05, [s * 0.52, 0.5, zf - 0.05], 0.004));
  }
  const bolts: { p: V3; n: V3 }[] = [];
  for (const s of [1, -1]) for (const dy of [0.045, 0.105]) bolts.push({ p: [s * (D.frameX + 0.018), 0.5 + dy, zf], n: [0, 0, 1] });
  steel.push(G.scatter(G.boltHead(0.02, 0.008), bolts));
  return { body, steel };
}

export function buildFront(): THREE.Object3D {
  const rad = radiator();
  const bon = bonnet();
  const wg = wings();
  const rb = runningBoards();
  const bp = bumper();
  const body: THREE.BufferGeometry[] = [...rad.body, ...bon.body, ...wg.body, ...rb.body, ...bp.body];
  const black: THREE.BufferGeometry[] = [...rad.black, ...bon.black, ...wg.black, ...rb.black];
  const steel: THREE.BufferGeometry[] = [...rad.steel, ...bon.steel, ...wg.steel, ...bp.steel];
  const refl: THREE.BufferGeometry[] = [];
  const lens: THREE.BufferGeometry[] = [];
  // headlamps on the wings next to the bonnet
  for (const s of [1, -1]) {
    const x = s * 0.64, z = 2.46;
    const w = wingTopAt(x, z);
    const h = headlamp(x, z, w.y);
    body.push(...h.body);
    black.push(...h.black);
    refl.push(...h.refl);
    lens.push(...h.lens);
    steel.push(...h.steel);
    const mx = s * 0.87, mz = 2.3;
    const m = markerLamp(mx, mz, wingTopAt(mx, mz).y);
    body.push(...m.body);
    lens.push(...m.lens);
  }
  // electric horn (trumpet) on a bracket beside the radiator shell, left side
  {
    const hx = D.bonnetX + 0.075, hy = 0.98, hz = 2.78;
    body.push(xf(latheZ([[0.0, -0.06], [0.04, -0.058], [0.045, -0.04], [0.02, -0.03], [0.016, 0.0], [0.03, 0.03], [0.05, 0.05], [0.052, 0.055]], 28, 40), [hx, hy, hz]));
    black.push(xf(G.cyl(0.046, 0.046, 0.004, 24).rotateX(Math.PI / 2), [hx, hy, hz + 0.05]));
    body.push(box(0.05, 0.012, 0.08, [hx - 0.04, hy - 0.045, hz - 0.03], 0.003));
  }
  // Notek on the left wing, ahead of the headlamp
  {
    const x = 0.8, z = 2.68;
    const nk = notek(x, z, wingTopAt(x, z).y);
    body.push(...nk.body);
    black.push(...nk.black);
    lens.push(...nk.lens);
  }
  return group([
    part(merge(body), P.body()),
    part(merge(black), P.black()),
    part(merge(steel), P.steel()),
    part(merge(refl), P.reflector()),
    part(merge(lens), P.lens()),
  ]);
}

export { flatSlab, arc2 };
