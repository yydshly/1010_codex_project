/**
 * PaK 40 shield: upper shield of two 4 mm plates spaced 25 mm apart (flat centre panel with the
 * barrel slot and the sight aperture, wings folded back), spacer bolts, shield brackets to the top
 * carriage; lower shield on the axle with a hinged bottom flap that folds up for towing.
 */
import { THREE, G, part } from '../../../core/kit';
import type { Palette } from './palette';
import { SHIELD as S } from './layout';
import { ZPlane, planePlate, meetX, bolts, rrect, v3, D2R, type V2 } from './util';

const TAN_SLOPE = Math.tan(S.slopeDeg * D2R);
const TAN_WING = Math.tan(S.wingDeg * D2R);

/** Front plate planes: centre, left wing (+X), right wing (-X). */
export const PL_CENTRE = new ZPlane(v3(0, S.bottomY, S.bottomZ), v3(0, TAN_SLOPE, 1));
export const PL_LEFT = new ZPlane(v3(S.foldX, S.bottomY, S.bottomZ), v3(TAN_WING, TAN_SLOPE, 1));
export const PL_RIGHT = new ZPlane(v3(-S.foldX, S.bottomY, S.bottomZ), v3(-TAN_WING, TAN_SLOPE, 1));

/** Front-view outline of the upper shield (x, y), CCW. */
function outline(): V2[] {
  const half: V2[] = [
    [0, 0.6],
    [0.6, 0.6],
    [0.645, 0.64],
    [0.7, 0.935],
    [S.outerX - 0.03, 0.935],
    [S.outerX, 0.965],
    [S.outerX, 1.1],
    [0.875, S.topY],
  ];
  const out: V2[] = [...half];
  for (let i = half.length - 1; i >= 1; i--) out.push([-half[i][0], half[i][1]]);
  return out;
}

/** Clip a polygon to x >= x0 (keep = 1) or x <= x0 (keep = -1). */
function clipX(poly: V2[], x0: number, keep: 1 | -1): V2[] {
  const inside = (p: V2) => (keep > 0 ? p[0] >= x0 : p[0] <= x0);
  const out: V2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) {
      const t = (x0 - a[0]) / (b[0] - a[0]);
      out.push([x0, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

const SLOT: V2[] = rrect(-0.125, 0.84, 0.125, 1.165, 0.04);
const SIGHT_HOLE: V2[] = rrect(0.198, 0.992, 0.272, 1.048, 0.008);

/** One layer (front or rear) of the upper shield. */
function layer(off: number): THREE.BufferGeometry[] {
  const c = PL_CENTRE.offset(off), l = PL_LEFT.offset(off), r = PL_RIGHT.offset(off);
  const xf = meetX(c, l, 0.9);
  const full = outline();
  const centre = clipX(clipX(full, -xf, 1), xf, -1);
  const left = clipX(full, xf, 1);
  const right = clipX(full, -xf, -1);
  return [
    planePlate(c, v3(1, 0, 0), centre, [SLOT, SIGHT_HOLE], S.t, 0.0015, 0.004),
    planePlate(l, v3(1, 0, 0), left, [], S.t, 0.0015, 0.004),
    planePlate(r, v3(1, 0, 0), right, [], S.t, 0.0015, 0.004),
  ];
}

function planeFor(x: number): ZPlane {
  return x > S.foldX ? PL_LEFT : x < -S.foldX ? PL_RIGHT : PL_CENTRE;
}

/** Spacer-bolt positions (front view). */
function boltPts(): V2[] {
  const pts: V2[] = [];
  for (let x = -0.8; x <= 0.801; x += 0.2) pts.push([x, S.topY - 0.03]);
  for (const s of [1, -1]) {
    pts.push([s * 0.975, 1.08], [s * 0.965, 0.975], [s * 0.82, 0.965]);
    pts.push([s * 0.55, 0.63], [s * 0.34, 0.63], [s * 0.63, 0.8]);
    pts.push([s * 0.17, 0.63], [s * 0.19, 0.9]);
  }
  pts.push([0, 0.63], [-0.19, 1.02], [0.33, 1.02]);
  return pts;
}

/** Upper shield (traverses with the top carriage). */
export function upperShield(P: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const g of layer(0)) out.push(part(g, P.paint));
  for (const g of layer(-S.gap)) out.push(part(g, P.paint));
  // spacer bolts: heads on the front plate, nuts on the rear, spacer tubes in the gap
  const heads: THREE.Vector3[] = [];
  const nuts: THREE.Vector3[] = [];
  const spacers: THREE.BufferGeometry[] = [];
  for (const [x, y] of boltPts()) {
    const pl = planeFor(x);
    const n = pl.n;
    heads.push(pl.at(x, y).addScaledVector(n, S.t / 2 - 0.0005));
    const rp = pl.offset(-S.gap);
    nuts.push(rp.at(x, y).addScaledVector(n, -S.t / 2 + 0.0005));
    const a = pl.at(x, y), b = rp.at(x, y);
    spacers.push(G.rod(a, b, 0.011, 10));
  }
  // heads face along each plate's normal: group by plane
  const byPlane = new Map<ZPlane, THREE.Vector3[]>();
  const nutsByPlane = new Map<ZPlane, THREE.Vector3[]>();
  boltPts().forEach(([x], i) => {
    const pl = planeFor(x);
    if (!byPlane.has(pl)) { byPlane.set(pl, []); nutsByPlane.set(pl, []); }
    byPlane.get(pl)!.push(heads[i]);
    nutsByPlane.get(pl)!.push(nuts[i]);
  });
  for (const [pl, pts] of byPlane) {
    out.push(part(G.scatter(G.rivetHead(0.0095), pts.map((p) => ({ p, n: pl.n }))), P.paint));
    out.push(part(bolts(nutsByPlane.get(pl)!, pl.n.clone().negate(), 0.019, 0.01), P.paint));
  }
  for (const g of spacers) out.push(part(g, P.paint));

  // sliding cover of the sight aperture (behind the rear plate, parked open to the left)
  const rp = PL_CENTRE.offset(-S.gap - S.t / 2 - 0.0022);
  out.push(part(planePlate(rp, v3(1, 0, 0), rrect(0.265, 0.985, 0.36, 1.055, 0.006), [], 0.004, 0.001, 0.004), P.paint));
  const gp = PL_CENTRE.offset(-S.gap - S.t / 2 - 0.003);
  for (const y of [0.978, 1.062]) out.push(part(planePlate(gp, v3(1, 0, 0), rrect(0.18, y - 0.006, 0.375, y + 0.006, 0.002), [], 0.006, 0.001, 0.002), P.paint));
  const knob = rp.at(0.35, 1.02).addScaledVector(PL_CENTRE.n, -0.004);
  out.push(part(G.rod(knob, knob.clone().addScaledVector(PL_CENTRE.n, -0.025), 0.007, 10), P.steel));

  // shield brackets to the top-carriage cheeks
  const zr = (y: number) => PL_CENTRE.offset(-S.gap - S.t / 2).zAt(0, y);
  for (const s of [1, -1]) {
    const br: V2[] = [[0.03, 0.635], [zr(0.635) - 0.001, 0.635], [zr(0.77) - 0.001, 0.77], [0.03, 0.73]];
    out.push(part(G.plate(br, 0.014, 'zy', 0.003), P.paint, { p: [s * 0.172, 0, 0] }));
    out.push(part(bolts([v3(s * 0.179, 0.66, 0.06), v3(s * 0.179, 0.7, 0.06)], [s, 0, 0], 0.016, 0.007), P.paint));
    // diagonal strut from the top-carriage base to the wing
    const wr = (s > 0 ? PL_LEFT : PL_RIGHT).offset(-S.gap - S.t / 2 - 0.006);
    const end = wr.at(s * 0.58, 0.8);
    const start = v3(s * 0.19, 0.6, 0.02);
    out.push(part(G.rod(start, end, 0.016, 12), P.paint));
    // strut foot plates
    out.push(part(planePlate(wr, v3(1, 0, 0), rrect(s * 0.58 - 0.04, 0.765, s * 0.58 + 0.04, 0.835, 0.008), [], 0.008, 0.002, 0.006), P.paint));
    out.push(part(G.rbox(0.05, 0.02, 0.06, 0.005, 2), P.paint, { p: [s * 0.19, 0.595, 0.02] }));
  }
  return out;
}

/** Lower-shield plane (fixed to the axle), top edge tucked behind the upper shield. */
const PL_LOWER = new ZPlane(v3(0, 0.62, 0.238), v3(0, 0.2, 1));
const HINGE_Y = 0.44;

/** Lower shield on the axle; `folded` turns the bottom flap up for towing. */
export function lowerShield(P: Palette, folded: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const t = 0.006;
  out.push(part(planePlate(PL_LOWER, v3(1, 0, 0), rrect(-0.62, HINGE_Y + 0.003, 0.62, 0.62, 0.012), [], t, 0.0015, 0.004), P.paint));
  // flap (built hanging, rotated about the hinge line when folded)
  const flap = planePlate(PL_LOWER, v3(1, 0, 0), [[-0.62, 0.31], [-0.585, 0.275], [0.585, 0.275], [0.62, 0.31], [0.62, HINGE_Y - 0.003], [-0.62, HINGE_Y - 0.003]], [], t, 0.0015, 0.004);
  const hz = PL_LOWER.zAt(0, HINGE_Y) + t / 2 + 0.006;
  if (folded) {
    flap.translate(0, -HINGE_Y, -hz);
    flap.rotateX(Math.PI);
    flap.translate(0, HINGE_Y, hz);
  }
  out.push(part(flap, P.paint));
  // hinge knuckles on the front face
  for (const x of [-0.45, -0.15, 0.15, 0.45]) {
    out.push(part(G.cyl(0.011, 0.011, 0.07, 12), P.paint, { p: [x, HINGE_Y, hz - 0.002], r: [0, 0, 90] }));
  }
  // stiffening flange along the top edge (rear face) and brackets to the axle tube
  const back = PL_LOWER.offset(-t / 2 - 0.009);
  out.push(part(planePlate(back, v3(1, 0, 0), rrect(-0.6, 0.575, 0.6, 0.605, 0.004), [], 0.018, 0.002, 0.003), P.paint));
  for (const s of [1, -1]) {
    const x = s * 0.4;
    const zb = PL_LOWER.zAt(x, 0.53) - t / 2 - 0.0005;
    const br: V2[] = [[0.12, 0.435], [zb, 0.47], [zb, 0.59], [0.12, 0.515]];
    out.push(part(G.plate(br, 0.012, 'zy', 0.003), P.paint, { p: [x, 0, 0] }));
  }
  // bolt heads on the fixed plate's front face
  const bp: THREE.Vector3[] = [];
  for (const x of [-0.55, -0.4, -0.25, 0.25, 0.4, 0.55]) bp.push(PL_LOWER.at(x, 0.585).addScaledVector(PL_LOWER.n, t / 2));
  out.push(part(G.scatter(G.rivetHead(0.009), bp.map((p) => ({ p, n: PL_LOWER.n }))), P.paint));
  return out;
}
