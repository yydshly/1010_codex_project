/**
 * Fw 190 A-8 wing, BODY frame, port side (mirrored for starboard unless noted).
 *
 * Straight-tapered planform (swept leading edge, rounded tips), NACA 230-series sections
 * approximated by a cambered NACA 4-digit profile, 5.5 deg dihedral. Armament as standard on the
 * A-8: an MG 151/20 in each wing root (muzzle in the root leading edge, blister over the breech on
 * the upper skin) and an MG 151/20 in each outer bay (barrel ahead of the leading edge, rectangular
 * overwing blister). Underneath: the open leg slot outboard of the (closed) inner wheel-well door,
 * with a liner. Navigation lights on the tips; pitot head on the starboard tip (A-8 position).
 */
import * as THREE from 'three';
import { part, group } from '../../../core/kit';
import { crease } from '../../../core/geo/shapes';
import { gridGeo, lerp, smooth, nacaT, nacaC, cosSpace, flipAll, bar, cylAB, ellipseRing, tint } from './geom';
import { B, DIM, WG, planform } from './frame';
import { skin, P } from './paint';

/** Chord fraction about which the incidence (washout) is applied. */
const KI = 0.25;

export const tcAt = (ax: number) => lerp(WG.tRoot, WG.tTip, Math.min(1, ax / DIM.semi));
export const incAt = (ax: number) => lerp(WG.incRoot, WG.incTip, Math.min(1, ax / DIM.semi));
export const y0At = (ax: number) => WG.yRoot + ax * Math.tan(DIM.dihedral);

/** Surface point (body frame) at half-span ax, chord fraction u, upper or lower side. */
export function wingPt(ax: number, u: number, upper: boolean, side = 1): THREE.Vector3 {
  const { le, te } = planform(ax);
  const c = Math.max(te - le, 1e-4);
  const t = tcAt(ax);
  const yc = nacaC(u, WG.m, WG.p), yt = nacaT(u, t);
  const y = y0At(ax) - (u - KI) * c * Math.sin(incAt(ax)) + c * (upper ? yc + yt : yc - yt);
  return B(side * ax, y, le + u * c);
}
/** Lower / upper skin height at (ax, s). */
export function wingY(ax: number, s: number, upper: boolean): number {
  const { le, te } = planform(ax);
  return wingPt(ax, Math.min(1, Math.max(0, (s - le) / (te - le))), upper).y;
}

const US = cosSpace(40);

function wingRing(ax: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let k = US.length - 1; k >= 0; k--) pts.push(wingPt(ax, US[k], true));
  for (let k = 1; k < US.length - 1; k++) pts.push(wingPt(ax, US[k], false));
  return pts;
}

function wingStations(): number[] {
  const out: number[] = [];
  for (let ax = 0; ax < WG.tip0; ax += 0.1) out.push(ax);
  const K = 14;
  for (let k = 0; k <= K; k++) out.push(lerp(WG.tip0, DIM.semi - 0.004, Math.sin((k / K) * Math.PI * 0.5)));
  return [...new Set(out.map((v) => Math.round(v * 1e4) / 1e4))].sort((a, b) => a - b);
}

function wingSkin(): THREE.BufferGeometry {
  const rows = wingStations().map((ax) => wingRing(ax));
  return crease(gridGeo(rows, { closedU: true, capStart: false, capEnd: true }), 42);
}

/** Leg slot liner: open channel from the pivot inboard to the wheel-well door edge. */
function slotLiner(): THREE.Object3D {
  const cs = DIM.pivot.s, half = WG.well.slotHalf;
  const x0 = WG.slotX0, x1 = DIM.pivot.x + 0.07;
  const n = 8;
  const edge = (sgn: number) => {
    const lo: THREE.Vector3[] = [], hi: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const ax = lerp(x0, x1, i / n), s = cs + sgn * (half + 0.002);
      const yl = wingY(ax, s, false) + 0.004;
      lo.push(new THREE.Vector3(ax, yl, -s));
      hi.push(new THREE.Vector3(ax, yl + 0.12, -s));
    }
    return [lo, hi];
  };
  const [aLo, aHi] = edge(1), [bLo, bHi] = edge(-1);
  const geos = [gridGeo([aLo, aHi], { closedU: false }), gridGeo([bLo, bHi], { closedU: false }), gridGeo([aHi, bHi], { closedU: false })];
  // end walls
  for (const ax of [x0, x1]) {
    const yl = wingY(ax, cs, false) + 0.004;
    const g = new THREE.PlaneGeometry(2 * half + 0.004, 0.12);
    g.rotateY(Math.PI / 2);
    g.translate(ax, yl + 0.06, -cs);
    geos.push(g);
  }
  const mid = new THREE.Vector3((x0 + x1) / 2, wingY((x0 + x1) / 2, cs, false) + 0.05, -cs);
  for (const g of geos) {
    const p = g.attributes.position, nn = g.attributes.normal;
    let sc = 0;
    for (let i = 0; i < p.count; i++) sc += (mid.x - p.getX(i)) * nn.getX(i) + (mid.y - p.getY(i)) * nn.getY(i) + (mid.z - p.getZ(i)) * nn.getZ(i);
    if (sc < 0) flipAll(g);
  }
  return group(geos.map((g) => part(g, P.interior())));
}

/** Blister on the upper skin (teardrop or boxy), centred at half-span ax, chord range u0..u1. */
function blister(ax: number, u0: number, u1: number, w: number, h: number, ex: number): THREE.Object3D {
  const { le, te } = planform(ax);
  const c = te - le;
  const rows: THREE.Vector3[][] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = le + lerp(u0, u1, t) * c;
    const env = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.45);
    const hh = h * env + 0.0005, ww = w * Math.pow(env, 0.6) + 0.001;
    const yb = wingY(ax, s, true);
    rows.push(ellipseRing(B(ax, yb - 0.02, s), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), ww, hh + 0.02, 28, ex));
  }
  return part(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), skin('WING'));
}

/** MG 151/20 installations (root and outer) with their blisters. */
function armament(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const fwd = new THREE.Vector3(0, 0, 1);
  // wing-root MG 151/20: short blast tube in the root leading edge
  {
    const ax = WG.rootGun;
    const p = wingPt(ax, 0.0, true);
    const a = p.clone().addScaledVector(fwd, -0.03), b = p.clone().addScaledVector(fwd, 0.05);
    out.push(part(cylAB(a, b, 0.026, 0.024, 18), P.gun()));
    const bore = new THREE.CircleGeometry(0.014, 14);
    bore.translate(b.x, b.y, b.z + 0.0005);
    out.push(part(bore, P.black()));
    out.push(blister(ax, 0.08, 0.42, 0.075, 0.03, 2.2));
  }
  // outer MG 151/20: barrel ahead of the leading edge with a fairing sleeve
  {
    const ax = WG.outerGun;
    const { le } = planform(ax);
    const y = wingPt(ax, 0.0, true).y - 0.004;
    const rows: THREE.Vector3[][] = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const s = lerp(le + 0.1, le - 0.12, t);
      const r = lerp(0.05, 0.036, smooth(0.25, 1, t));
      rows.push(ellipseRing(B(ax, y, s), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), r, r * 0.95, 24));
    }
    for (let i = 1; i <= 3; i++) {
      const a = (i / 3) * (Math.PI / 2);
      const r = Math.max(0.022, 0.036 * Math.cos(a));
      rows.push(ellipseRing(B(ax, y, le - 0.12 - 0.014 * Math.sin(a)), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), r, r * 0.95, 24));
    }
    out.push(part(gridGeo(rows, { closedU: true, capEnd: true }), skin('WING')));
    const b0 = B(ax, y, le - 0.1), b1 = B(ax, y, le - 0.36);
    out.push(part(cylAB(b0, b1, 0.017, 0.017, 16), P.gun()));
    out.push(part(cylAB(b1.clone().addScaledVector(fwd, -0.05), b1.clone().addScaledVector(fwd, 0.004), 0.022, 0.02, 16), P.gun()));
    const bore = new THREE.CircleGeometry(0.01, 12);
    bore.translate(b1.x, b1.y, b1.z + 0.0045);
    out.push(part(bore, P.black()));
    out.push(blister(ax, 0.22, 0.52, 0.09, 0.022, 4));
    // spent-case chute under the wing
    const q = wingPt(ax, 0.5, false);
    const chute = new THREE.PlaneGeometry(0.05, 0.12);
    chute.rotateX(Math.PI / 2);
    chute.translate(q.x, q.y - 0.0025, q.z);
    out.push(part(chute, P.black()));
  }
  return group(out);
}

/** Pitot head at the starboard wing tip (A-8 position). */
export function buildPitot(): THREE.Object3D {
  const ax = DIM.semi - 0.42;
  const { le } = planform(ax);
  const root = wingPt(ax, 0.02, true, -1);
  const r2 = wingPt(ax, 0.0, false, -1);
  const c = root.clone().lerp(r2, 0.5);
  const tip = new THREE.Vector3(c.x, c.y, -(le - 0.42));
  const tube = cylAB(c.clone().add(new THREE.Vector3(0, 0, -0.04)), tip, 0.012, 0.008, 12);
  const head = cylAB(tip, tip.clone().add(new THREE.Vector3(0, 0, 0.06)), 0.008, 0.005, 12);
  return group([part(tube, P.steel()), part(head, P.steel())]);
}

/** Wing-tip navigation light (red port / green starboard via vertex colour). */
export function navLight(side: 1 | -1): THREE.Object3D {
  const ax = DIM.semi - 0.1;
  const p = wingPt(ax, 0.28, true, side);
  const q = wingPt(ax, 0.28, false, side);
  const g = new THREE.SphereGeometry(1, 20, 10);
  g.scale(0.03, Math.max(0.012, (p.y - q.y) * 0.45), 0.05);
  g.translate(p.x + side * 0.05, (p.y + q.y) / 2, p.z);
  return part(tint(g, side > 0 ? 0xd0281c : 0x1f9a44), P.lens());
}

export function buildWingPort(): THREE.Object3D {
  return group([part(wingSkin(), skin('WING')), slotLiner(), armament()]);
}
