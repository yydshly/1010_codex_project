/**
 * Il-2 wing (body frame): constant-chord centre section, outer panels with the 1943 15 deg swept
 * leading edge and dihedral, engraved flap / aileron / bomb-bay lines, main-gear nacelles with
 * open wheel wells, VYa-23 cannons and ShKAS guns in the leading edge, optional RS-82 rails,
 * navigation lights and underwing stars.
 */
import * as THREE from 'three';
import { G, part, group, mirrorX } from '../../../core/kit';
import { Grid, V, lerp, clamp, linspace, uniq, cosSpace, conformDecal, bar } from './geo';
import { buildLifting, withGrooves, isAt, type Lifting } from './lifting';
import { D } from './dims';
import { drawStar, type Palette } from './paint';

const W = D.wing;
const XR = 6.72; // tip rounding start
const TAN_LE = Math.tan(W.sweepLE), TAN_TE = Math.tan(W.sweepTE), TAN_DI = Math.tan(W.dihedral);

const leS = (x: number) => W.rootLE + Math.max(0, x - W.csHalf) * TAN_LE;
const teS = (x: number) => W.rootLE + W.chord - Math.max(0, x - W.csHalf) * TAN_TE;
function tipE(x: number) {
  if (x <= XR) return 0;
  const u = clamp((x - XR) / (D.semi - XR), 0, 1);
  return 1 - Math.sqrt(Math.max(0, 1 - u * u));
}
export const wingLE = (x: number) => {
  const a = leS(x), b = teS(x), sm = a + 0.45 * (b - a);
  return a + tipE(x) * (sm - a);
};
export const wingTE = (x: number) => {
  const a = leS(x), b = teS(x), sm = a + 0.45 * (b - a);
  return b - tipE(x) * (b - sm);
};
export const wingY = (x: number) => W.y0 + Math.max(0, x - W.csHalf) * TAN_DI;
const wingTC = (x: number) =>
  x <= W.csHalf ? lerp(W.tRoot, W.tJoint, x / W.csHalf) : lerp(W.tJoint, W.tTip, clamp((x - W.csHalf) / (7.0 - W.csHalf), 0, 1));

const FLAP = [0.58, 4.4];
const AIL = [4.46, 6.92];
const BAYS = [[0.64, 1.02], [1.08, 1.44]];
const BAY_F = [0.32, 0.62];

let wingCache: Lifting | null = null;
export function wingSurface(): Lifting {
  if (wingCache) return wingCache;
  const tipSt = linspace(0, 1, 16).map((k) => 6.55 + (D.semi - 6.55) * Math.sin((k * Math.PI) / 2));
  const base = uniq([...linspace(0, 6.5, 50), ...tipSt]);
  const rowG = [W.csHalf, FLAP[1], AIL[0], AIL[1], ...BAYS.flat()];
  const stations = withGrooves(base, rowG, 0.004);
  const fd = 0.0013;
  const upperF = withGrooves(cosSpace(36), [W.hinge], fd);
  const lowerF = withGrooves(cosSpace(36), [W.hinge, ...BAY_F], fd);
  const L = buildLifting({
    stations,
    le: wingLE,
    te: wingTE,
    tc: wingTC,
    camber: 0.02,
    place: (x, s, v) => V(x, wingY(x) + v, -s),
    upperF,
    lowerF,
  });
  // engraved panel lines / control-surface gaps
  const DEP = 0.0014, GAP = 0.002;
  const inR = (x: number, r: number[]) => x >= r[0] - 1e-6 && x <= r[1] + 1e-6;
  L.grid.engrave((i, j) => {
    const x = stations[i];
    const { f, upper } = L.cols[j];
    if (isAt(x, W.csHalf)) return DEP;
    const aft = f >= W.hinge - 1e-6;
    if ((isAt(x, AIL[0]) || isAt(x, AIL[1])) && aft) return GAP;
    if (!upper && isAt(x, FLAP[1]) && aft) return GAP;
    if (isAt(f, W.hinge)) {
      if (inR(x, AIL)) return GAP;
      if (!upper && inR(x, FLAP)) return GAP;
    }
    if (!upper) {
      const inBayF = f >= BAY_F[0] - 1e-6 && f <= BAY_F[1] + 1e-6;
      if (BAYS.some((b) => (isAt(x, b[0]) || isAt(x, b[1])) && inBayF)) return DEP;
      if ((isAt(f, BAY_F[0]) || isAt(f, BAY_F[1])) && BAYS.some((b) => inR(x, b))) return DEP;
    }
    return 0;
  });
  wingCache = L;
  return L;
}

/** Nacelle (gear fairing) under the centre section, with the open wheel well. */
function nacelle(pal: Palette): THREE.Object3D {
  const N = D.nacelle;
  const xc = N.x;
  const keys = [N.well0 - 0.003, N.well0 + 0.003, N.well1 - 0.003, N.well1 + 0.003];
  const S = uniq([...linspace(N.s0, N.s1, 44).filter((s) => !keys.some((k) => Math.abs(s - k) < 0.012)), ...keys]);
  const ex = 2 / 2.4;
  const P = S.map((s) => {
    const kn = s < 2.95 ? Math.sqrt(Math.max(0, 1 - (1 - (s - N.s0) / (2.95 - N.s0)) ** 2)) : 1;
    const kt = s > 4.85 ? Math.sqrt(Math.max(0, 1 - ((s - 4.85) / (N.s1 - 4.85)) ** 2)) : 1;
    const k = Math.max(0.04, Math.min(kn, kt));
    const a = N.halfW * k, bt = 0.2 * Math.pow(k, 0.8), bb = 0.31 * k;
    const yc = -0.79 + 0.07 * clamp((s - 4.55) / (N.s1 - 4.55), 0, 1);
    const pt = (phi: number) => {
      const c = Math.cos(phi), sn = Math.sin(phi);
      const x = xc + a * Math.sign(c) * Math.pow(Math.abs(c), ex);
      const y = yc + (sn >= 0 ? bt : bb) * Math.sign(sn) * Math.pow(Math.abs(sn), ex);
      return V(x, y, -s);
    };
    const wW = Math.min(N.wellHalfW, a * 0.8);
    const phiO = -Math.acos(Math.pow(wW / a, 2.4 / 2));
    const phiI = Math.PI - phiO;
    const well = s > N.well0 && s < N.well1;
    const ring: THREE.Vector3[] = [];
    for (const u of linspace(0, 1, 30)) ring.push(pt(lerp(phiO, phiI, u)));
    const lipI = ring[ring.length - 1].clone(), lipO = ring[0].clone();
    const roofY = lipO.y + 0.4;
    ring.push(lipI.clone());
    ring.push(well ? V(lipI.x, roofY, -s) : lipI.clone());
    for (const u of linspace(0, 1, 7)) {
      const x = lerp(lipI.x, lipO.x, u);
      // bottom of the fairing where there is no well: follow the super-ellipse section
      const cc = Math.pow(Math.min(1, Math.abs(x - xc) / Math.max(a, 1e-4)), 1.2);
      const yb = well ? roofY : yc - bb * Math.pow(Math.sqrt(Math.max(0, 1 - cc * cc)), ex);
      ring.push(V(x, yb, -s));
    }
    ring.push(well ? V(lipO.x, roofY, -s) : lipO.clone());
    ring.push(lipO.clone());
    return ring;
  });
  const g = new Grid(P, true, (i, j) => P[i][j].clone().sub(V(xc, -0.79, -S[i])));
  return part(g.sheet(0, S.length - 1, 0, P[0].length - 1), pal.bottom, { name: 'nacelle' });
}

/** VYa-23 cannon and ShKAS machine gun muzzles ahead of the port leading edge. */
function guns(pal: Palette): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const xCan = 2.32, xMg = 2.64;
  const leC = wingLE(xCan), yC = wingY(xCan) + 0.012;
  out.push(part(G.lathe([[0, 0], [0.054, 0], [0.054, 0.14], [0.051, 0.32], [0.044, 0.5], [0.037, 0.6], [0.029, 0.625], [0.022, 0.628]], 24), pal.top, {
    p: [xCan, yC, -(leC + 0.16)], r: [90, 0, 0],
  }));
  const bl = 0.56, b0 = leC - 0.44;
  out.push(part(G.cyl(0.0205, 0.0205, bl, 14), pal.gun, { p: [xCan, yC, -(b0 - bl / 2)], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.026, 0.026, 0.07, 16), pal.gun, { p: [xCan, yC, -(b0 - bl - 0.02)], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.011, 0.011, 0.004, 10), pal.dark, { p: [xCan, yC, -(b0 - bl - 0.056)], r: [90, 0, 0] }));
  const leM = wingLE(xMg), yM = wingY(xMg) + 0.03;
  out.push(part(G.cyl(0.02, 0.022, 0.16, 16), pal.top, { p: [xMg, yM, -(leM - 0.04)], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.0085, 0.0085, 0.14, 10), pal.gun, { p: [xMg, yM, -(leM - 0.18)], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.012, 0.012, 0.03, 12), pal.gun, { p: [xMg, yM, -(leM - 0.25)], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.005, 0.005, 0.003, 8), pal.dark, { p: [xMg, yM, -(leM - 0.2655)], r: [90, 0, 0] }));
  return group(out, { name: 'guns' });
}

/** Two empty RO-82 launch rails under the port outer wing. */
function rails(pal: Palette, L: Lifting): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  for (const x of [3.45, 3.95]) {
    const le = wingLE(x), te = wingTE(x), c = te - le;
    const s0 = le + 0.12, s1 = s0 + 1.0;
    const yLow = (s: number) => L.surf(x, (s - le) / c, false).y;
    const yr = Math.min(yLow(s0), yLow(s1)) - 0.075;
    const A = V(x, yr, -s0), Bp = V(x, yr, -s1);
    out.push(part(bar(A, Bp, 0.012, 0.045, V(0, 1, 0), 0.002), pal.bottom));
    out.push(part(bar(A.clone().add(V(0, -0.024, 0)), Bp.clone().add(V(0, -0.024, 0)), 0.034, 0.008, V(0, 1, 0), 0.002), pal.bottom));
    for (const s of [s0 + 0.15, s1 - 0.2]) {
      const top = yLow(s) + 0.02;
      out.push(part(G.rbox(0.016, top - yr, 0.07, 0.006), pal.bottom, { p: [x, (top + yr) / 2, -s] }));
    }
    out.push(part(G.rbox(0.03, 0.03, 0.02, 0.004), pal.dark, { p: [x, yr - 0.012, -(s1 - 0.01)] }));
  }
  return group(out, { name: 'rs82-rails' });
}

function underwingStar(side: number, L: Lifting): THREE.Mesh {
  const xc = 5.3, size = 1.22;
  const sc = wingLE(xc) + 0.46 * (wingTE(xc) - wingLE(xc));
  return conformDecal(
    'su-il2-star',
    1,
    drawStar,
    (u, v) => {
      const x = xc + (u - 0.5) * size;
      const s = sc - (v - 0.5) * size; // image up = forward
      const le = wingLE(x), c = wingTE(x) - le;
      const f = clamp((s - le) / c, 0, 1);
      const p = L.surf(x, f, false);
      const p2 = L.surf(x + 0.01, f, false), p3 = L.surf(x, clamp(f + 0.004, 0, 1), false);
      const n = p2.clone().sub(p).cross(p3.clone().sub(p)).normalize();
      if (n.y > 0) n.negate();
      return { p: V(p.x * side, p.y, p.z), n: V(n.x * side, n.y, n.z) };
    },
    18,
    18,
    0.003,
    512,
  );
}

export function buildWing(pal: Palette, opts: { rails: boolean }): THREE.Object3D {
  const L = wingSurface();
  const port: THREE.Object3D[] = [
    part(L.upper(), pal.top, { name: 'wing-upper' }),
    part(L.lower(), pal.bottom, { name: 'wing-lower' }),
    nacelle(pal),
    guns(pal),
  ];
  if (opts.rails) port.push(rails(pal, L));
  const out: THREE.Object3D[] = [mirrorX(group(port, { name: 'wing-port' }))];
  // navigation lights (red port, green starboard) and underwing stars
  const xl = D.semi - 0.035;
  const sl = wingLE(xl) + 0.02;
  const lens = new THREE.SphereGeometry(0.03, 14, 10);
  lens.scale(0.8, 0.7, 1.6);
  out.push(part(lens, pal.navRed, { p: [xl, wingY(xl), -sl] }));
  out.push(part(lens.clone(), pal.navGreen, { p: [-xl, wingY(xl), -sl] }));
  out.push(underwingStar(1, L), underwingStar(-1, L));
  return group(out, { name: 'wing' });
}
