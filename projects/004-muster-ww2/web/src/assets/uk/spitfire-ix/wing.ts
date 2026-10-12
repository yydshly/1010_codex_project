/**
 * Spitfire LF Mk IXc wing, BODY frame, port side (mirrored for starboard).
 *
 * Elliptical planform (standard tips, 11.23 m span), NACA 2213 root to 2209.4 tip, 6 deg dihedral,
 * 2.5 deg washout. "C" (universal) wing as usually fitted to the Mk IX: one 20 mm Hispano Mk II in
 * the inner cannon bay with its barrel fairing, the unused outer cannon position closed by a
 * short plugged stub, two .303 Browning ports further out, a small teardrop blister over the
 * cannon feed on the upper skin. Underneath: wheel well + leg slot (with liners), the Mk IX's
 * symmetrical radiator housing (one per wing), pitot head (port), wing-tip navigation light.
 */
import * as THREE from 'three';
import { part, group } from '../../../core/kit';
import { crease } from '../../../core/geo/shapes';
import { gridGeo, lerp, smooth, nacaT, nacaC, cosSpace, flipAll, bar, cylAB, ellipseRing, tint } from './geom';
import { B, DIM, WG, planform, wingE } from './frame';
import { skin, P } from './paint';

export const tcAt = (ax: number) => lerp(WG.tRoot, WG.tTip, Math.min(1, ax / DIM.semi));
export const incAt = (ax: number) => lerp(WG.incRoot, WG.incTip, Math.min(1, ax / DIM.semi));
export const y0At = (ax: number) => WG.yRoot + ax * Math.tan(DIM.dihedral);

/** Surface point (body frame) at half-span ax, chord fraction u, upper or lower side. */
export function wingPt(ax: number, u: number, upper: boolean, side = 1): THREE.Vector3 {
  const { le, te } = planform(ax);
  const c = Math.max(te - le, 1e-4);
  const t = tcAt(ax);
  const yc = nacaC(u, WG.m, WG.p), yt = nacaT(u, t);
  const y = y0At(ax) - (u - WG.k) * c * Math.sin(incAt(ax)) + c * (upper ? yc + yt : yc - yt);
  return B(side * ax, y, le + u * c);
}
/** Lower / upper skin height at (ax, s). */
export function wingY(ax: number, s: number, upper: boolean): number {
  const { le, te } = planform(ax);
  return wingPt(ax, Math.min(1, Math.max(0, (s - le) / (te - le))), upper).y;
}

const US = cosSpace(44);

function wingRing(ax: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let k = US.length - 1; k >= 0; k--) pts.push(wingPt(ax, US[k], true));
  for (let k = 1; k < US.length; k++) pts.push(wingPt(ax, US[k], false));
  return pts;
}

function wingStations(): number[] {
  const out: number[] = [];
  for (let ax = 0; ax < 4.2; ax += 0.1) out.push(ax);
  const p0 = Math.asin(4.2 / DIM.semi), p1 = 0.993 * (Math.PI / 2);
  const K = 22;
  for (let k = 0; k <= K; k++) out.push(DIM.semi * Math.sin(lerp(p0, p1, k / K)));
  return [...new Set(out.map((v) => Math.round(v * 1e4) / 1e4))].sort((a, b) => a - b);
}

function wingSkin(): THREE.BufferGeometry {
  const rows = wingStations().map((ax) => wingRing(ax));
  return crease(gridGeo(rows, { closedU: true, capStart: false, capEnd: true }), 42);
}

/** Wheel well + leg slot liners (open towards the discarded lower skin). */
function wellLiner(): THREE.Object3D {
  const { x: cx, s: cs, r, slotHalf } = WG.well;
  const N = 48;
  let roofY = Infinity;
  for (let k = 0; k <= N; k++) {
    const a = (k / N) * Math.PI * 2;
    roofY = Math.min(roofY, wingY(cx + r * Math.cos(a), cs + r * Math.sin(a), true) - 0.03);
  }
  const bottom: THREE.Vector3[] = [], top: THREE.Vector3[] = [];
  for (let k = 0; k <= N; k++) {
    const a = (k / N) * Math.PI * 2;
    const ax = cx + (r + 0.002) * Math.cos(a), s = cs + (r + 0.002) * Math.sin(a);
    bottom.push(new THREE.Vector3(ax, wingY(ax, s, false) + 0.004, -s));
    top.push(new THREE.Vector3(ax, roofY, -s));
  }
  const wall = gridGeo([bottom, top], { closedU: false, inward: true });
  const roof = new THREE.CircleGeometry(r + 0.004, 48);
  roof.rotateX(Math.PI / 2);
  roof.translate(cx, roofY, -cs);
  // leg slot channel: open box (walls + roof) from the pivot to the well
  const x0 = 0.5, x1 = cx - r * 0.6;
  const slot: THREE.BufferGeometry[] = [];
  const n = 8;
  const edge = (sgn: number) => {
    const lo: THREE.Vector3[] = [], hi: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const ax = lerp(x0, x1, i / n), s = cs + sgn * (slotHalf + 0.002);
      const yl = wingY(ax, s, false) + 0.004;
      lo.push(new THREE.Vector3(ax, yl, -s));
      hi.push(new THREE.Vector3(ax, yl + 0.13, -s));
    }
    return [lo, hi];
  };
  const [aLo, aHi] = edge(1), [bLo, bHi] = edge(-1);
  slot.push(gridGeo([aLo, aHi], { closedU: false }), gridGeo([bLo, bHi], { closedU: false }), gridGeo([aHi, bHi], { closedU: false }));
  // orient the slot faces towards the slot centre
  const mid = new THREE.Vector3((x0 + x1) / 2, wingY((x0 + x1) / 2, cs, false) + 0.05, -cs);
  for (const g of slot) {
    const p = g.attributes.position, nn = g.attributes.normal;
    let sc = 0;
    for (let i = 0; i < p.count; i++) sc += (mid.x - p.getX(i)) * nn.getX(i) + (mid.y - p.getY(i)) * nn.getY(i) + (mid.z - p.getZ(i)) * nn.getZ(i);
    if (sc < 0) flipAll(g);
  }
  return group([part(wall, P.interior()), part(roof, P.interior()), ...slot.map((g) => part(g, P.interior()))]);
}

/** Underwing radiator housing (the Mk IX has one under each wing). */
function radiator(): THREE.Object3D {
  const { xa, xb, s0, s1 } = WG.rad;
  const xc = (xa + xb) / 2, hw = (xb - xa) / 2;
  const tilt = DIM.dihedral;
  const depthAt = (s: number) => lerp(0.25, 0.2, smooth(s0, s1, s));
  const ring = (s: number, inset = 0): THREE.Vector3[] => {
    const yw = wingY(xc, s, false);
    const d = depthAt(s) - inset;
    const out: THREE.Vector3[] = [];
    const N = 44, ex = 5;
    const cy = yw - d / 2 + 0.05;
    const hh = d / 2 + 0.05;
    for (let k = 0; k < N; k++) {
      const t = (k / N) * Math.PI * 2;
      const c = Math.cos(t), sn = Math.sin(t);
      const lx = (hw - inset) * Math.sign(c) * Math.pow(Math.abs(c), 2 / ex);
      const ly = hh * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / ex);
      out.push(new THREE.Vector3(xc + lx * Math.cos(tilt) - ly * Math.sin(tilt), cy + lx * Math.sin(tilt) + ly * Math.cos(tilt), -s));
    }
    return out;
  };
  const rows: THREE.Vector3[][] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    // rounded nose on the housing: shrink the first rings slightly
    const s = lerp(s0, s1, t);
    rows.push(ring(s, 0.012 * (1 - smooth(0, 0.12, t))));
  }
  const shell = gridGeo(rows, { closedU: true });
  const duct = flipAll(gridGeo([ring(s0 - 0.001, 0.014), ring(s0 + 0.14, 0.014)], { closedU: true }));
  const lipPts = ring(s0, 0.008);
  const lip = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPts, true), 100, 0.008, 8, true);
  const ywF = wingY(xc, s0 + 0.14, false);
  const core = new THREE.BoxGeometry(xb - xa - 0.03, 0.17, 0.035);
  core.rotateZ(tilt);
  core.translate(xc, ywF - 0.06, -(s0 + 0.14));
  // core face: vertical matrix bars
  const bars: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 18; k++) {
    const x = xa + 0.03 + (k / 17) * (xb - xa - 0.06);
    const g = new THREE.BoxGeometry(0.004, 0.16, 0.012);
    g.rotateZ(tilt);
    g.translate(x, ywF - 0.06 + (x - xc) * Math.tan(tilt), -(s0 + 0.12));
    bars.push(g);
  }
  // exit: dark rear face and the flap, slightly open
  const ywR = wingY(xc, s1, false);
  const rear = new THREE.PlaneGeometry(xb - xa - 0.02, 0.14);
  rear.rotateY(Math.PI);
  rear.rotateZ(tilt);
  rear.translate(xc, ywR - 0.08, -(s1 - 0.004));
  const n = new THREE.Vector3(-Math.sin(tilt), Math.cos(tilt), 0);
  const fa = new THREE.Vector3(xc, ywR - depthAt(s1) + 0.006, -(s1 - 0.01));
  const fb = new THREE.Vector3(xc, ywR - depthAt(s1) + 0.035, -(s1 + 0.3));
  const flap = bar(fa, fb, xb - xa - 0.008, 0.01, n, 0, 0.003);
  // flap side plates
  const sides: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const x = xc + sx * (hw - 0.004);
    const pts = [new THREE.Vector3(x, ywR - 0.01, -(s1 - 0.02)), new THREE.Vector3(x, ywR - depthAt(s1) + 0.006, -(s1 - 0.02)), new THREE.Vector3(x, ywR - depthAt(s1) + 0.035, -(s1 + 0.3)), new THREE.Vector3(x, wingY(x, s1 + 0.3, false) - 0.004, -(s1 + 0.3))];
    const g = bar(pts[0].clone().lerp(pts[1], 0.5), pts[2].clone().lerp(pts[3], 0.5), 0.006, Math.max(0.02, pts[0].y - pts[1].y), n, 0, 0.002);
    sides.push(g);
  }
  return group([
    part(shell, skin('WING')),
    part(duct, P.black()),
    part(lip, skin('WING')),
    part(core, P.matrix()),
    ...bars.map((g) => part(g, P.matrix())),
    part(rear, P.black()),
    part(flap, skin('WING')),
    ...sides.map((g) => part(g, skin('WING'))),
  ]);
}

/** Hispano barrel + fairing, blanked outer cannon stub, .303 ports, feed blister. */
function armament(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const fwd = new THREE.Vector3(0, 0, 1);
  // 20 mm Hispano Mk II (inner bay)
  {
    const ax = WG.cannon;
    const { le } = planform(ax);
    const p = wingPt(ax, 0.0, true);
    const y = p.y - 0.004;
    const rows: THREE.Vector3[][] = [];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const s = lerp(le + 0.12, le - 0.24, t);
      const r = lerp(0.066, 0.045, smooth(0.2, 1, t));
      rows.push(ellipseRing(B(ax, y, s), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), r, r * 0.96, 28));
    }
    // rounded front of the fairing
    for (let i = 1; i <= 4; i++) {
      const a = (i / 4) * (Math.PI / 2);
      const r = 0.045 * Math.cos(a);
      rows.push(ellipseRing(B(ax, y, le - 0.24 - 0.018 * Math.sin(a)), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), Math.max(r, 0.024), Math.max(r, 0.024) * 0.96, 28));
    }
    out.push(part(gridGeo(rows, { closedU: true, capEnd: true }), skin('WING')));
    const b0 = B(ax, y, le - 0.2), b1 = B(ax, y, le - 0.56);
    out.push(part(cylAB(b0, b1, 0.021, 0.021, 20), P.gun()));
    out.push(part(cylAB(b1.clone().addScaledVector(fwd, -0.04), b1.clone().addScaledVector(fwd, 0.004), 0.026, 0.024, 20), P.gun()));
    const bore = new THREE.CircleGeometry(0.012, 14);
    bore.translate(b1.x, b1.y, b1.z + 0.0045);
    out.push(part(bore, P.black()));
  }
  // blanked outer cannon position: short plugged stub
  {
    const ax = WG.stub;
    const { le } = planform(ax);
    const y = wingPt(ax, 0.0, true).y - 0.004;
    const rows: THREE.Vector3[][] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const s = lerp(le + 0.08, le - 0.08, t);
      const r = lerp(0.052, 0.042, t);
      rows.push(ellipseRing(B(ax, y, s), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), r, r * 0.95, 24));
    }
    for (let i = 1; i <= 5; i++) {
      const a = (i / 5) * (Math.PI / 2);
      const r = 0.042 * Math.cos(a);
      rows.push(ellipseRing(B(ax, y, le - 0.08 - 0.03 * Math.sin(a)), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), Math.max(r, 0.004), Math.max(r, 0.004) * 0.95, 24));
    }
    out.push(part(gridGeo(rows, { closedU: true }), skin('WING')));
  }
  // .303 Browning ports in the leading edge
  for (const ax of WG.mg) {
    const p = wingPt(ax, 0.0, true);
    const a = p.clone().addScaledVector(fwd, -0.012), b = p.clone().addScaledVector(fwd, 0.004);
    out.push(part(cylAB(a, b, 0.0115, 0.0115, 14), P.black()));
  }
  // teardrop blister over the cannon feed (upper skin)
  {
    const ax = WG.cannon + 0.06;
    const { le, te } = planform(ax);
    const c = te - le;
    const sA = le + 0.2 * c, sB = le + 0.5 * c;
    const rows: THREE.Vector3[][] = [];
    const n = 20;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const s = lerp(sA, sB, t);
      const env = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.7);
      const h = 0.038 * env + 0.0005, w = 0.075 * env + 0.001;
      const yb = wingY(ax, s, true);
      const cc = B(ax, yb - 0.02, s);
      rows.push(ellipseRing(cc, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), w, h + 0.02, 24));
    }
    out.push(part(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), skin('WING')));
  }
  return group(out);
}

/** Pitot head under the port wing. */
export function buildPitot(): THREE.Object3D {
  const ax = 3.95;
  const { le } = planform(ax);
  const root = wingPt(ax, 0.12, false);
  const low = root.clone().add(new THREE.Vector3(0, -0.13, 0.02));
  const tip = new THREE.Vector3(ax, low.y, -(le - 0.12));
  const strut = bar(root.clone().add(new THREE.Vector3(0, 0.012, 0)), low, 0.012, 0.045, new THREE.Vector3(0, 0, 1), 0, 0.005);
  const tube = bar(low.clone().add(new THREE.Vector3(0, 0, -0.03)), tip, 0.016, 0.016, new THREE.Vector3(0, 1, 0), 0, 0.0075);
  const head = new THREE.CylinderGeometry(0.004, 0.008, 0.05, 12);
  head.rotateX(Math.PI / 2);
  head.translate(tip.x, tip.y, tip.z + 0.02);
  return group([part(strut, P.black()), part(tube, P.black()), part(head, P.steel())]);
}

/** Wing-tip navigation light (red port / green starboard via vertex colour). */
export function navLight(side: 1 | -1): THREE.Object3D {
  const ax = 5.4;
  const p = wingPt(ax, 0.3, true, side);
  const g = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(0.02, 0.016, 0.05);
  g.translate(p.x, p.y - 0.004, p.z);
  return part(tint(g, side > 0 ? 0xd0281c : 0x1f9a44), P.lens());
}

export function buildWingPort(): THREE.Object3D {
  return group([part(wingSkin(), skin('WING')), wellLiner(), radiator(), armament()]);
}
void wingE;
