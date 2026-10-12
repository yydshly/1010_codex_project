/**
 * Il-2 tail surfaces (body frame): fin + rudder as one surface with an engraved hinge gap,
 * tailplane + elevators, and the tail stars.
 */
import * as THREE from 'three';
import { part, group, mirrorX } from '../../../core/kit';
import { V, lerp, clamp, linspace, uniq, cosSpace, conformDecal, DEG } from './geo';
import { buildLifting, withGrooves, isAt, type Lifting } from './lifting';
import { drawStar, type Palette } from './paint';

// ---------------- fin + rudder (span coordinate u = y, thickness along x)
const HINGE = 10.95;
const F_H = 0.55; // grid column that carries the hinge line
const Y_BOT = 0.02, Y_R = 1.1, Y_TOP = 1.48;
const finLEs = (y: number) => 9.95 + (y - 0.2) * Math.tan(36 * DEG);
const finTEs = (y: number) => (y < 0.5 ? lerp(11.55, 11.65, clamp((y - Y_BOT) / (0.5 - Y_BOT), 0, 1)) : lerp(11.65, 11.58, clamp((y - 0.5) / 0.6, 0, 1)));
function topE(y: number) {
  if (y <= Y_R) return 0;
  const u = clamp((y - Y_R) / (Y_TOP - Y_R), 0, 1);
  return 1 - Math.sqrt(Math.max(0, 1 - u * u));
}
const finLE = (y: number) => {
  const a = finLEs(y), b = finTEs(y), m = a + 0.62 * (b - a);
  return a + topE(y) * (m - a);
};
const finTE = (y: number) => {
  const a = finLEs(y), b = finTEs(y), m = a + 0.62 * (b - a);
  return b - topE(y) * (b - m);
};
/** real hinge fraction at height y (clamped inside the chord near the rounded top) */
const hingeF = (y: number) => clamp((HINGE - finLE(y)) / Math.max(1e-4, finTE(y) - finLE(y)), 0.08, 0.92);
const colToReal = (y: number, f: number) => {
  const fh = hingeF(y);
  return f < F_H ? (f * fh) / F_H : fh + ((f - F_H) * (1 - fh)) / (1 - F_H);
};
const realToCol = (y: number, fr: number) => {
  const fh = hingeF(y);
  return fr < fh ? (fr * F_H) / fh : F_H + ((fr - fh) * (1 - F_H)) / (1 - fh);
};

let finCache: Lifting | null = null;
function finSurface(): Lifting {
  if (finCache) return finCache;
  const top = linspace(0, 1, 12).map((k) => Y_R - 0.1 + (Y_TOP - Y_R + 0.1) * Math.sin((k * Math.PI) / 2));
  const stations = uniq([...linspace(Y_BOT, 0.08, 4), ...linspace(0.12, Y_R - 0.14, 12), ...top]);
  const cols = withGrooves(cosSpace(28), [F_H], 0.0026);
  const L = buildLifting({
    stations,
    le: finLE,
    te: finTE,
    tc: () => 0.11,
    place: (y, s, v) => {
      const le = finLE(y), te = finTE(y), c = Math.max(1e-5, te - le);
      const f = (s - le) / c;
      return V(v, y, -(le + colToReal(y, f) * c));
    },
    thickScale: (y) => (y < 0.08 ? Math.sqrt(Math.max(0, 1 - ((0.08 - y) / (0.08 - Y_BOT)) ** 2)) : 1),
    upperF: cols,
    lowerF: cols,
  });
  L.grid.engrave((i, j) => {
    const y = stations[i];
    if (isAt(L.cols[j].f, F_H) && y < Y_R + 0.12 && y > Y_BOT + 0.03) return 0.0022;
    return 0;
  });
  finCache = L;
  return L;
}

// ---------------- tailplane + elevators (port half; u = x)
const TP_Y = -0.02;
const TP_TIP = 2.45, TP_R = 1.95;
const tpLEs = (x: number) => 10.0 + x * Math.tan(9 * DEG);
const tpTEs = (x: number) => 11.5 - x * Math.tan(4 * DEG);
function tpE(x: number) {
  if (x <= TP_R) return 0;
  const u = clamp((x - TP_R) / (TP_TIP - TP_R), 0, 1);
  return 1 - Math.sqrt(Math.max(0, 1 - u * u));
}
const tpLE = (x: number) => {
  const a = tpLEs(x), b = tpTEs(x), m = a + 0.5 * (b - a);
  return a + tpE(x) * (m - a);
};
const tpTE = (x: number) => {
  const a = tpLEs(x), b = tpTEs(x), m = a + 0.5 * (b - a);
  return b - tpE(x) * (b - m);
};
const EL_HINGE = 0.58;
const EL_SPAN = [0.1, 2.3];

function tailplane(): Lifting {
  const tip = linspace(0, 1, 12).map((k) => 1.85 + (TP_TIP - 1.85) * Math.sin((k * Math.PI) / 2));
  const stations = withGrooves(uniq([...linspace(0, 1.8, 18), ...tip]), EL_SPAN, 0.004);
  const cols = withGrooves(cosSpace(28), [EL_HINGE], 0.0026);
  const L = buildLifting({
    stations,
    le: tpLE,
    te: tpTE,
    tc: () => 0.1,
    place: (x, s, v) => V(x, TP_Y + v, -s),
    upperF: cols,
    lowerF: cols,
  });
  L.grid.engrave((i, j) => {
    const x = stations[i];
    const f = L.cols[j].f;
    if (isAt(f, EL_HINGE) && x >= EL_SPAN[0] - 1e-6 && x <= EL_SPAN[1] + 1e-6) return 0.0022;
    if ((isAt(x, EL_SPAN[0]) || isAt(x, EL_SPAN[1])) && f > EL_HINGE) return 0.0022;
    return 0;
  });
  return L;
}

function finStar(side: number): THREE.Mesh {
  const L = finSurface();
  const sc = 10.9, yc = 0.66, size = 0.7;
  return conformDecal(
    'su-il2-star',
    1,
    drawStar,
    (u, v) => {
      const s = sc + (u - 0.5) * size * side;
      const y = yc + (v - 0.5) * size;
      const le = finLE(y), c = finTE(y) - le;
      const fc = realToCol(y, clamp((s - le) / c, 0, 1));
      const p = L.surf(y, fc, true);
      const p2 = L.surf(y + 0.01, fc, true), p3 = L.surf(y, clamp(fc + 0.004, 0, 1), true);
      const n = p2.clone().sub(p).cross(p3.clone().sub(p)).normalize();
      if (n.x < 0) n.negate();
      return { p: V(p.x * side, p.y, p.z), n: V(n.x * side, n.y, n.z) };
    },
    16,
    16,
    0.0025,
    512,
  );
}

export function buildTail(pal: Palette): THREE.Object3D {
  const F = finSurface();
  const T = tailplane();
  const out: THREE.Object3D[] = [
    part(F.upper(), pal.top, { name: 'fin-port' }),
    part(F.lower(), pal.top, { name: 'fin-stbd' }),
    mirrorX(group([part(T.upper(), pal.top), part(T.lower(), pal.bottom)], { name: 'tailplane-port' })),
    finStar(1),
    finStar(-1),
  ];
  return group(out, { name: 'tail' });
}
