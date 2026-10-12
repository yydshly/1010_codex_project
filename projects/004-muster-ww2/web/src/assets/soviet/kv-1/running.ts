/**
 * KV-1 running gear for one side (the tank's left, +X), adapted from the IS-2 module: six dual 600 mm
 * road wheels of the 1941 reinforced ribbed pattern (pressed discs with radial ribs and solid rubber
 * tyres, bolted hubs), the cast front idler on its crank, the rear drive sprocket with two 14-tooth
 * rings, three rubber-tyred dual return rollers on hull brackets, torsion-bar trailing arms with their
 * hull bosses, bump stops and the final-drive housing.
 *
 * Wheel-local frame: axle along +X (outwards), origin at the centre of the wheel PAIR.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { R, H } from './dims';
import type { Pal } from './palette';
import { latheX, discX, perforatedDisc, merge, xf } from './util';

const HEX_S = (() => {
  const g = G.cyl(0.011, 0.011, 0.011, 6);
  g.translate(0, 0.0055, 0);
  return g;
})();

/* --------------------------------- road wheel ------------------------------------------- */

/** One disc of the pair, outer face towards +X; it spans x = g0 (inner edge) to g1 (outer edge). */
function singleDisc(P: Pal, outer: boolean): THREE.Group {
  const g0 = R.tyreGap / 2, g1 = g0 + R.tyreW;
  const Rt = R.wheelR, rSeat = 0.252, rRim = 0.232;
  const ps: THREE.Object3D[] = [];
  // solid rubber tyre with rounded shoulders
  ps.push(
    part(
      latheX(
        [
          [rSeat, g0 + 0.006], [rSeat + 0.004, g0 + 0.002], [Rt - 0.014, g0 + 0.002], [Rt - 0.003, g0 + 0.012],
          [Rt, g0 + 0.026], [Rt, g1 - 0.026], [Rt - 0.003, g1 - 0.012], [Rt - 0.014, g1 - 0.002],
          [rSeat + 0.004, g1 - 0.002], [rSeat, g1 - 0.006],
        ],
        44,
        35,
      ),
      P.rubber,
    ),
  );
  // steel rim with clamping lips
  ps.push(
    part(
      latheX(
        [
          [rRim, g0 + 0.004], [rSeat + 0.001, g0 + 0.004], [rSeat + 0.008, g0 - 0.002], [rSeat + 0.008, g0 - 0.008],
          [rSeat - 0.004, g0 - 0.01], [rSeat - 0.004, g1 + 0.008], [rSeat + 0.01, g1 + 0.006], [rSeat + 0.01, g1],
          [rSeat + 0.001, g1 - 0.004], [rRim, g1 - 0.004],
        ],
        44,
        35,
      ),
      P.paint,
    ),
  );
  // pressed disc (dished: the web sits near the inner edge) with radial stiffening ribs
  const webX = g0 + 0.03;
  ps.push(part(discX(perforatedDisc(rRim + 0.002, 0.1, 0.012, [], 48, 0.003), webX), P.paint));
  const nV = 10;
  const h0 = g1 - 0.02 - webX;
  const rib = G.extrude(G.shape([[0.104, 0], [rRim - 0.004, 0], [rRim - 0.004, h0 * 0.35], [0.16, h0 * 0.85], [0.104, h0]]), 0.016, 0.004, 1, 1);
  rib.applyMatrix4(new THREE.Matrix4().set(0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1));
  G.flipWinding(rib);
  rib.translate(webX + 0.005, 0, 0);
  const ribs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < nV; i++) ribs.push(xf(rib, [0, 0, 0], [(i / nV) * Math.PI * 2 + (outer ? 0 : 0.3), 0, 0]));
  ps.push(part(merge(ribs), P.paint));
  // hub boss
  ps.push(
    part(
      latheX([[0.0, g0 - 0.03], [0.108, g0 - 0.03], [0.112, webX], [0.112, g1 - 0.014], [0.1, g1 - 0.002], [0.074, g1], [0.07, g1 + 0.012], [0.0, g1 + 0.012]], 36, 35),
      P.cast,
    ),
  );
  if (outer) {
    ps.push(
      part(
        G.scatter(
          HEX_S,
          Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return { p: [g1 - 0.002, Math.sin(a) * 0.09, Math.cos(a) * 0.09] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
          }),
        ),
        P.cast,
      ),
    );
    ps.push(part(latheX([[0.0, g1 + 0.012], [0.064, g1 + 0.012], [0.064, g1 + 0.032], [0.05, g1 + 0.05], [0.026, g1 + 0.057], [0.0, g1 + 0.058]], 28, 35), P.cast));
    ps.push(part(G.cyl(0.018, 0.018, 0.012, 6), P.cast, { p: [g1 + 0.062, 0, 0], r: [0, 0, 90] }));
  }
  return group(ps);
}

/** Dual road wheel (pair) in wheel-local frame. */
export function roadWheelPair(P: Pal): THREE.Group {
  const outer = singleDisc(P, true);
  const inner = singleDisc(P, false);
  inner.scale.x = -1;
  const hub = part(G.cyl(0.095, 0.095, R.tyreGap + 0.06, 28), P.cast, { r: [0, 0, 90] });
  return group([outer, inner, hub]);
}

/** Cast front idler: two spoked discs with a steel running rim (no rubber), same width as a wheel pair. */
export function idler(P: Pal): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const r = R.idlerR;
  const g0 = R.tyreGap / 2, g1 = g0 + R.tyreW;
  for (const s of [-1, 1]) {
    const a = s * g0, b = s * g1;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    ps.push(part(latheX([[r - 0.05, lo + 0.004], [r - 0.004, lo], [r, lo + 0.012], [r, hi - 0.012], [r - 0.004, hi], [r - 0.05, hi - 0.004]], 48, 35), P.cast));
    const x = s * (g0 + 0.07);
    ps.push(part(discX(perforatedDisc(r - 0.045, 0.1, 0.03, [{ r: 0.055, at: 0.165, count: 6, phase: 0.2, seg: 14 }], 48, 0.005), x), P.cast));
  }
  ps.push(part(latheX([[0.0, -g1 - 0.02], [0.11, -g1 - 0.02], [0.115, -g1 + 0.02], [0.115, g1 - 0.02], [0.1, g1], [0.07, g1 + 0.012], [0.07, g1 + 0.045], [0.05, g1 + 0.06], [0.0, g1 + 0.062]], 32, 35), P.cast));
  ps.push(
    part(
      G.scatter(
        G.boltHead(0.02, 0.011),
        Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return { p: [g1 + 0.012, Math.sin(a) * 0.09, Math.cos(a) * 0.09] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
        }),
      ),
      P.cast,
    ),
  );
  return group(ps);
}

/* ---------------------------------- sprocket -------------------------------------------- */

function toothRing(): THREE.BufferGeometry {
  const n = R.sprocketTeeth;
  const rp = R.sprocketR;
  const rTip = rp + 0.042, rRoot = rp - 0.03, rIn = rp - 0.085;
  const s = new THREE.Shape();
  const pts: G.V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const st = (Math.PI * 2) / n;
    const prof: [number, number][] = [
      [-0.5, rRoot], [-0.36, rRoot + 0.004], [-0.26, rp - 0.004], [-0.17, rTip - 0.012], [-0.1, rTip], [0.1, rTip], [0.17, rTip - 0.012], [0.26, rp - 0.004], [0.36, rRoot + 0.004],
    ];
    for (const [f, r] of prof) {
      const aa = a + f * st;
      pts.push([Math.cos(aa) * r, Math.sin(aa) * r]);
    }
  }
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const hole = new THREE.Path();
  for (let i = 0; i <= 56; i++) {
    const a = -(i / 56) * Math.PI * 2;
    if (i === 0) hole.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
    else hole.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
  }
  s.holes.push(hole);
  return G.extrude(s, 0.05, 0.006, 4, 1);
}

/** Rear drive sprocket; tooth k sits at angle toothAngle(k) in the (z, y) plane. */
export function sprocket(P: Pal): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const ring = toothRing();
  for (const x of [-0.18, 0.18]) {
    const g = ring.clone();
    g.rotateY(Math.PI / 2);
    ps.push(part(g, P.track, { p: [x, 0, 0] }));
  }
  const rCarrier = R.sprocketR - 0.08;
  for (const x of [-0.14, 0.14]) {
    ps.push(part(discX(perforatedDisc(rCarrier, 0.11, 0.03, [{ r: 0.05, at: 0.19, count: 6, phase: 0.26, seg: 14 }], 56, 0.004), x), P.cast));
    ps.push(part(latheX([[rCarrier - 0.03, x - 0.035], [rCarrier + 0.004, x - 0.035], [rCarrier + 0.004, x + 0.035], [rCarrier - 0.03, x + 0.035]], 56, 35), P.cast));
  }
  ps.push(
    part(
      G.scatter(
        G.boltHead(0.022, 0.012),
        Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2 + Math.PI / 14;
          return { p: [0.205, Math.sin(a) * (R.sprocketR - 0.058), Math.cos(a) * (R.sprocketR - 0.058)] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
        }),
      ),
      P.cast,
    ),
  );
  ps.push(part(latheX([[0.0, -0.23], [0.12, -0.23], [0.125, -0.16], [0.125, 0.17], [0.11, 0.19], [0.0, 0.19]], 36, 35), P.cast));
  ps.push(part(latheX([[0.0, 0.19], [0.085, 0.19], [0.085, 0.215], [0.07, 0.232], [0.03, 0.238], [0.0, 0.239]], 30, 35), P.cast));
  ps.push(
    part(
      G.scatter(
        G.boltHead(0.02, 0.011),
        Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return { p: [0.19, Math.sin(a) * 0.1, Math.cos(a) * 0.1] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
        }),
      ),
      P.cast,
    ),
  );
  return group(ps);
}

/** Angle (radians, in the (z, y) plane from +Z towards +Y) of tooth k before rotation. */
export function toothAngle(k: number): number {
  const a = (k / R.sprocketTeeth) * Math.PI * 2;
  return Math.PI - a;
}

/* -------------------------------- return roller ----------------------------------------- */

export function returnRoller(P: Pal): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const r = R.rrR;
  for (const s of [-1, 1]) {
    const c = s * 0.12;
    // rubber tyre and steel centre
    ps.push(part(latheX([[r - 0.03, c - 0.05], [r - 0.01, c - 0.05], [r, c - 0.038], [r, c + 0.038], [r - 0.01, c + 0.05], [r - 0.03, c + 0.05]], 36, 35), P.rubber));
    ps.push(part(latheX([[0.05, c - 0.052], [r - 0.028, c - 0.052], [r - 0.028, c + 0.052], [0.05, c + 0.052]], 36, 35), P.cast));
  }
  ps.push(part(G.cyl(0.055, 0.055, 0.36, 20), P.cast, { r: [0, 0, 90] }));
  ps.push(part(latheX([[0.0, 0.175], [0.065, 0.175], [0.065, 0.195], [0.05, 0.208], [0.0, 0.21]], 24, 35), P.cast));
  ps.push(
    part(
      G.scatter(
        G.boltHead(0.013, 0.008),
        Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return { p: [0.195, Math.sin(a) * 0.045, Math.cos(a) * 0.045] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
        }),
      ),
      P.cast,
    ),
  );
  return group(ps);
}

/* ------------------------------ suspension & housings ----------------------------------- */

function arm(P: Pal, pz: number, py: number, z: number, y: number, xa: number, xb: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const len = Math.hypot(pz - z, py - y);
  const a = Math.atan2(py - y, pz - z);
  const w = xb - xa;
  const body = G.plate(
    [[-0.07, -0.075], [len * 0.5, -0.058], [len + 0.06, -0.085], [len + 0.06, 0.085], [len * 0.5, 0.058], [-0.07, 0.075]],
    w,
    'zy',
    0.012,
    0.05,
  );
  body.rotateX(-a);
  body.translate((xa + xb) / 2, y, z);
  out.push(part(body, P.cast));
  out.push(part(G.cyl(0.075, 0.075, w + 0.03, 24), P.cast, { p: [(xa + xb) / 2 + 0.01, y, z], r: [0, 0, 90] }));
  return out;
}

/** Suspension arms, bosses, bump stops, return-roller brackets, idler crank, final drive (left side). */
export function suspension(P: Pal, idlerZ: number): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const x0 = H.xL;
  const xw = R.trackX - R.tyreGap / 2 - R.tyreW - 0.012;
  for (const z of R.wheelZ) {
    const pz = z + R.armDz, py = R.wheelY + R.armDy;
    ps.push(...arm(P, pz, py, z, R.wheelY, x0 + 0.03, xw - 0.005));
    ps.push(part(latheX([[0.0, x0 - 0.01], [0.125, x0 - 0.01], [0.125, x0 + 0.03], [0.11, x0 + 0.045], [0.0, x0 + 0.045]], 30, 35), P.cast, { p: [0, py, pz] }));
    ps.push(part(latheX([[0.0, xw - 0.02], [0.07, xw - 0.02], [0.07, xw + 0.005], [0.055, xw + 0.018], [0.0, xw + 0.02]], 24, 35), P.cast, { p: [0, py, pz] }));
    // bump stop above the wheel, clear of the tyre
    const by = R.wheelY + R.wheelR + 0.12;
    ps.push(part(G.rbox(0.13, 0.1, 0.14, 0.012, 1), P.paint, { p: [x0 + 0.065, by + 0.05, z - 0.08] }));
    ps.push(part(G.cyl(0.045, 0.05, 0.05, 16), P.cast, { p: [x0 + 0.075, by - 0.02, z - 0.08] }));
  }
  for (const z of R.rrZ) {
    ps.push(part(latheX([[0.0, x0 - 0.01], [0.1, x0 - 0.01], [0.1, x0 + 0.05], [0.085, x0 + 0.07], [0.0, x0 + 0.07]], 26, 35), P.cast, { p: [0, R.rrY, z] }));
    ps.push(part(G.cyl(0.045, 0.045, R.trackX - x0 - 0.12, 16), P.cast, { p: [(x0 + R.trackX - 0.12) / 2, R.rrY, z], r: [0, 0, 90] }));
  }
  // idler crank (track tensioner)
  const cz = idlerZ - 0.3, cy = R.idlerY - 0.02;
  ps.push(part(latheX([[0.0, x0 - 0.01], [0.13, x0 - 0.01], [0.13, x0 + 0.04], [0.115, x0 + 0.055], [0.0, x0 + 0.055]], 30, 35), P.cast, { p: [0, cy, cz] }));
  ps.push(...arm(P, cz, cy, idlerZ, R.idlerY, x0 + 0.04, xw - 0.005));
  // final-drive housing between the hull side and the sprocket, with its bolt ring
  ps.push(
    part(
      latheX([[0.0, x0 - 0.01], [0.27, x0 - 0.01], [0.28, x0 + 0.015], [0.26, x0 + 0.06], [0.2, x0 + 0.1], [0.16, x0 + 0.15], [0.0, x0 + 0.15]], 40, 30),
      P.cast,
      { p: [0, R.sprocketY, R.sprocketZ] },
    ),
  );
  ps.push(
    part(
      G.scatter(
        G.boltHead(0.024, 0.013),
        Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return { p: [x0 + 0.02, R.sprocketY + Math.sin(a) * 0.245, R.sprocketZ + Math.cos(a) * 0.245] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
        }),
      ),
      P.cast,
    ),
  );
  return group(ps);
}
