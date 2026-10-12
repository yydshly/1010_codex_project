/**
 * Cross-section rings for the stock, handguard and barrel bands (design space, mm).
 * All rings start at the top centre and run with a consistent orientation, resampled by
 * arc length, so consecutive sections correspond point-for-point in a loft.
 */
import { U, stockTop, stockBot, stockHW, stockHWT, stockHWB, hgTop, smooth01, type P2 } from './dims';

/** Resample a closed polyline to n points evenly by arc length, starting at pts[0]. */
export function resample(pts: P2[], n: number): P2[] {
  const m = pts.length;
  const cum = [0];
  for (let i = 1; i <= m; i++) {
    const a = pts[i - 1], b = pts[i % m];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const L = cum[m];
  const out: P2[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (k / n) * L;
    while (j < m - 1 && cum[j + 1] < s) j++;
    const a = pts[j], b = pts[(j + 1) % m];
    const t = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

export interface SectionSpec {
  yT: number;
  yB: number;
  /** half widths: at mid height, at the top edge, at the bottom */
  hw: number;
  hwT: number;
  hwB: number;
  /** superellipse exponents for the upper / lower half */
  eT: number;
  eB: number;
  /** relative height of the widest point (0 = middle, + = higher) */
  mid?: number;
}

/**
 * Closed section contour. Dense polyline (then resampled). Starts at top centre, runs towards -X.
 */
export function sectionContour(s: SectionSpec, dense = 360): P2[] {
  const ym = (s.yT + s.yB) / 2 + (s.mid ?? 0) * (s.yT - s.yB) * 0.5;
  const pts: P2[] = [];
  for (let i = 0; i < dense; i++) {
    const t = Math.PI / 2 + (i / dense) * Math.PI * 2;
    const c = Math.cos(t), sn = Math.sin(t);
    const up = sn >= 0;
    const e = up ? s.eT : s.eB;
    const cx = Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
    const sy = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / e);
    const y = up ? ym + sy * (s.yT - ym) : ym + sy * (ym - s.yB);
    // half width varies with height: quadratic blend mid -> edge
    const k = Math.abs(sy);
    const edge = up ? s.hwT : s.hwB;
    const hw = s.hw + (edge - s.hw) * k * k;
    pts.push([cx * hw, y]);
  }
  return pts;
}

/** Finger groove depth field on the fore-end sides (mm, >= 0). */
export function grooveDepth(u: number, y: number): number {
  const a = U.grooveA, b = U.grooveB;
  if (u < a || u > b) return 0;
  const R = 16; // rounded (oval) ends
  const dEnd = Math.min(u - a, b - u);
  const endK = dEnd >= R ? 1 : Math.sqrt(Math.max(0, 1 - ((R - dEnd) / R) ** 2));
  const yc = -13.2, hh = 5.6 * endK;
  if (hh <= 0.01) return 0;
  const v = (y - yc) / hh;
  if (Math.abs(v) >= 1) return 0;
  const prof = (1 - v * v) ** 1.5;
  return 2.1 * prof * Math.min(1, endK * 1.4);
}

export function stockSpec(u: number): SectionSpec {
  // blend exponents: squarer top along the fore-end (flat joint to the handguard)
  const fore = smooth01(380, 540, u);
  const butt = 1 - smooth01(250, 330, u);
  return {
    yT: stockTop(u),
    yB: stockBot(u),
    hw: stockHW(u),
    hwT: stockHWT(u),
    hwB: stockHWB(u),
    eT: 3.0 + 1.6 * fore - 0.3 * butt,
    eB: 2.35 + 0.35 * butt,
    mid: -0.1 * fore + 0.05 * butt,
  };
}

/** Stock ring at u with the finger grooves applied; n points. */
export function stockRing(u: number, n: number): P2[] {
  const pts = resample(sectionContour(stockSpec(u)), n);
  if (u >= U.grooveA && u <= U.grooveB) {
    for (const p of pts) {
      const g = grooveDepth(u, p[1]);
      if (g > 0) p[0] -= Math.sign(p[0]) * g;
    }
  }
  return pts;
}

/** Outer half width of the stock surface at height y (on the +X side), for placing fittings. */
export function stockSideX(u: number, y: number): number {
  const pts = sectionContour(stockSpec(u), 720);
  let best = 0, bd = Infinity;
  for (const p of pts) {
    if (p[0] <= 0) continue;
    const d = Math.abs(p[1] - y);
    if (d < bd) { bd = d; best = p[0]; }
  }
  return best - grooveDepth(u, y);
}

export function handguardSpec(u: number): SectionSpec {
  const hw = stockHWT(u) - 0.25;
  return { yT: hgTop(u), yB: -2.6, hw: hw, hwT: hw * 0.9, hwB: hw, eT: 2.35, eB: 8, mid: -0.96 };
}

export function handguardRing(u: number, n: number, grow = 0): P2[] {
  const s = handguardSpec(u);
  return resample(sectionContour({ ...s, yT: s.yT + grow, yB: s.yB - grow, hw: s.hw + grow, hwT: s.hwT + grow * 0.5, hwB: s.hwB + grow }), n);
}

/** Union of stock + handguard outline at u, offset outwards by t (for barrel bands). Polar sampling. */
export function bandRing(u: number, n: number, t: number): P2[] {
  const stock = sectionContour(stockSpec(u), 720);
  const hg = sectionContour(handguardSpec(u), 720);
  const all = [...stock, ...hg];
  const cy = (stockBot(u) + hgTop(u)) / 2;
  // polar max radius in angular bins
  const bins = 720;
  const rad = new Float64Array(bins).fill(0);
  for (const [x, y] of all) {
    const a = Math.atan2(y - cy, x);
    const b = Math.floor(((a + Math.PI) / (Math.PI * 2)) * bins) % bins;
    rad[b] = Math.max(rad[b], Math.hypot(x, y - cy));
  }
  // fill empty bins and smooth
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < bins; i++) if (rad[i] === 0) rad[i] = Math.max(rad[(i + bins - 1) % bins], rad[(i + 1) % bins]);
  }
  const sm = new Float64Array(bins);
  for (let i = 0; i < bins; i++) {
    let m = 0;
    for (let j = -3; j <= 3; j++) m = Math.max(m, rad[(i + j + bins) % bins]);
    sm[i] = m;
  }
  const poly: P2[] = [];
  for (let i = 0; i < bins; i++) {
    const a = -Math.PI + ((i + 0.5) / bins) * Math.PI * 2;
    poly.push([Math.cos(a) * sm[i], cy + Math.sin(a) * sm[i]]);
  }
  // offset along the 2D normal
  const off: P2[] = poly.map((p, i) => {
    const a = poly[(i + bins - 2) % bins], b = poly[(i + 2) % bins];
    let nx = b[1] - a[1], ny = -(b[0] - a[0]);
    const l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    // make it point outwards
    if (nx * p[0] + ny * (p[1] - cy) < 0) { nx = -nx; ny = -ny; }
    return [p[0] + nx * t, p[1] + ny * t];
  });
  // rotate so that the ring starts at the top centre (angle +90deg)
  const start = Math.floor(((Math.PI / 2 + Math.PI) / (Math.PI * 2)) * bins);
  const rot = [...off.slice(start), ...off.slice(0, start)];
  // run the same direction as sectionContour (towards -X first)
  const dir = rot[5][0] < 0 ? rot : [rot[0], ...rot.slice(1).reverse()];
  return resample(dir, n);
}
