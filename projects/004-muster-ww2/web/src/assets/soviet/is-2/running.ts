/**
 * IS-2 running gear for one side (the tank's left, +X): six dual cast road wheels (spoked discs with
 * solid rubber tyres, bolted hubs), the front idler of the same pattern on its crank, the rear drive
 * sprocket with two removable 14-tooth rings, three dual return rollers on hull brackets, torsion-bar
 * trailing arms with their hull bosses, bump stops and the final-drive housing.
 *
 * Wheel-local frame: axle along +X (outwards), origin at the centre of the wheel PAIR.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { R, H } from './dims';
import type { Pal } from './palette';
import { latheX, discX, perforatedDisc, merge, xf } from './util';

/* --------------------------------- road wheel ------------------------------------------- */

/** plain hex bolt heads (no washer) for the wheels: cheap, they are repeated many times */
const HEX_S = (() => {
  const g = G.cyl(0.0105, 0.0105, 0.011, 6);
  g.translate(0, 0.0055, 0);
  return g;
})();
const HEX_XS = (() => {
  const g = G.cyl(0.0075, 0.0075, 0.008, 6);
  g.translate(0, 0.004, 0);
  return g;
})();

/**
 * One disc of the pair, outer face towards +X; it spans x = g0 (inner edge, at the horn gap) to
 * g1 (outer edge).
 */
function singleDisc(P: Pal, outer: boolean): THREE.Group {
  const g0 = R.tyreGap / 2, g1 = g0 + R.tyreW;
  const Rt = R.wheelR, rSeat = 0.232, rRim = 0.212;
  const ps: THREE.Object3D[] = [];
  // solid rubber tyre with rounded shoulders
  ps.push(
    part(
      latheX(
        [
          [rSeat, g0 + 0.006],
          [rSeat + 0.004, g0 + 0.002],
          [Rt - 0.014, g0 + 0.002],
          [Rt - 0.003, g0 + 0.012],
          [Rt, g0 + 0.026],
          [Rt, g1 - 0.026],
          [Rt - 0.003, g1 - 0.012],
          [Rt - 0.014, g1 - 0.002],
          [rSeat + 0.004, g1 - 0.002],
          [rSeat, g1 - 0.006],
        ],
        44,
        35,
      ),
      P.rubber,
    ),
  );
  // steel rim (tyre seat) with clamping lips on both faces
  ps.push(
    part(
      latheX(
        [
          [rRim, g0 + 0.004],
          [rSeat + 0.001, g0 + 0.004],
          [rSeat + 0.008, g0 - 0.002],
          [rSeat + 0.008, g0 - 0.008],
          [rSeat - 0.004, g0 - 0.01],
          [rSeat - 0.004, g1 + 0.008],
          [rSeat + 0.01, g1 + 0.006],
          [rSeat + 0.01, g1 + 0.0],
          [rSeat + 0.001, g1 - 0.004],
          [rRim, g1 - 0.004],
        ],
        44,
        35,
      ),
      P.cast,
    ),
  );
  // recessed web between hub and rim, and the spokes (radial cast vanes) standing on it
  const webX = g0 + 0.035;
  ps.push(part(discX(perforatedDisc(rRim + 0.002, 0.095, 0.014, [], 48, 0.003), webX), P.cast));
  const nV = outer ? 24 : 16;
  // vane: radial fin, taller towards the hub (dished look), skewed slightly like the castings.
  // outline x = radius (-> Y), outline y = height off the web (-> X); thickness along Z.
  const h0 = g1 - 0.01 - webX;
  const vane = G.extrude(G.shape([[0.098, 0], [rRim - 0.002, 0], [rRim - 0.002, h0 * 0.62], [0.13, h0], [0.098, h0]]), 0.011, 0.0025, 1, 1);
  vane.applyMatrix4(new THREE.Matrix4().set(0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1));
  G.flipWinding(vane);
  vane.rotateY(0.18);
  vane.translate(webX + 0.006, 0, 0);
  const vanes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < nV; i++) vanes.push(xf(vane, [0, 0, 0], [(i / nV) * Math.PI * 2, 0, 0]));
  ps.push(part(merge(vanes), P.cast));
  // hub boss
  ps.push(
    part(
      latheX(
        [
          [0.0, g0 - 0.03],
          [0.1, g0 - 0.03],
          [0.104, webX],
          [0.104, g1 - 0.012],
          [0.096, g1 - 0.002],
          [0.07, g1],
          [0.066, g1 + 0.012],
          [0.0, g1 + 0.012],
        ],
        36,
        35,
      ),
      P.cast,
    ),
  );
  if (outer) {
    // ring of hub bolts, domed hub cap with its own bolts and centre nut
    ps.push(
      part(
        G.scatter(
          HEX_S,
          Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return { p: [g1 - 0.002, Math.sin(a) * 0.084, Math.cos(a) * 0.084] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
          }),
        ),
        P.cast,
      ),
    );
    ps.push(part(latheX([[0.0, g1 + 0.012], [0.062, g1 + 0.012], [0.062, g1 + 0.03], [0.05, g1 + 0.048], [0.026, g1 + 0.056], [0.0, g1 + 0.058]], 28, 35), P.cast));
    ps.push(
      part(
        G.scatter(
          HEX_XS,
          Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 + 0.3;
            return { p: [g1 + 0.03, Math.sin(a) * 0.05, Math.cos(a) * 0.05] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
          }),
        ),
        P.cast,
      ),
    );
    ps.push(part(G.cyl(0.016, 0.016, 0.012, 6), P.cast, { p: [g1 + 0.062, 0, 0], r: [0, 0, 90] }));
  }
  return group(ps);
}

/** Dual road wheel (pair) in wheel-local frame. The idler uses the same wheel. */
export function roadWheelPair(P: Pal): THREE.Group {
  const outer = singleDisc(P, true);
  const inner = singleDisc(P, false);
  inner.scale.x = -1; // mirrored inner disc (hub towards the hull)
  const hub = part(G.cyl(0.09, 0.09, R.tyreGap + 0.06, 28), P.cast, { r: [0, 0, 90] });
  return group([outer, inner, hub]);
}

/* ---------------------------------- sprocket -------------------------------------------- */

function toothRing(): THREE.BufferGeometry {
  const n = R.sprocketTeeth;
  const rp = R.sprocketR;
  const rTip = rp + 0.042, rRoot = rp - 0.03, rIn = rp - 0.085;
  const s = new THREE.Shape();
  const pts: G.V2[] = [];
  for (let i = 0; i < n; i++) {
    // tooth centred at the link centre (between pins): angle i*step + step/2 -> set by caller phase
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
  const g = G.extrude(s, 0.05, 0.006, 4, 1);
  return g;
}

/** Rear drive sprocket; tooth k sits at angle k * 360/14 in the (z, y) plane before rotation. */
export function sprocket(P: Pal): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const ring = toothRing();
  // two rings either side of the guide horns, running in the link windows
  for (const x of [-0.168, 0.168]) {
    const g = ring.clone();
    g.rotateY(Math.PI / 2); // disc in the ZY plane, teeth at angle a measured from +Y towards +Z?
    ps.push(part(g, P.track, { p: [x, 0, 0] }));
  }
  // cast wheel centre carrying the rings: dished discs with six lightening holes
  const rCarrier = R.sprocketR - 0.08;
  for (const x of [-0.13, 0.13]) {
    ps.push(part(discX(perforatedDisc(rCarrier, 0.11, 0.03, [{ r: 0.05, at: 0.19, count: 6, phase: 0.26, seg: 14 }], 56, 0.004), x), P.cast));
    ps.push(part(latheX([[rCarrier - 0.03, x - 0.035], [rCarrier + 0.004, x - 0.035], [rCarrier + 0.004, x + 0.035], [rCarrier - 0.03, x + 0.035]], 56, 35), P.cast));
  }
  // ring-to-carrier bolts on the outer ring
  ps.push(
    part(
      G.scatter(
        G.boltHead(0.022, 0.012),
        Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2 + Math.PI / 14;
          return { p: [0.193, Math.sin(a) * (R.sprocketR - 0.058), Math.cos(a) * (R.sprocketR - 0.058)] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
        }),
      ),
      P.cast,
    ),
  );
  // hub, final-drive hub cap and its bolts
  ps.push(part(latheX([[0.0, -0.22], [0.12, -0.22], [0.125, -0.15], [0.125, 0.16], [0.11, 0.18], [0.0, 0.18]], 36, 35), P.cast));
  ps.push(part(latheX([[0.0, 0.18], [0.085, 0.18], [0.085, 0.205], [0.07, 0.222], [0.03, 0.228], [0.0, 0.229]], 30, 35), P.cast));
  ps.push(
    part(
      G.scatter(
        G.boltHead(0.02, 0.011),
        Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return { p: [0.18, Math.sin(a) * 0.1, Math.cos(a) * 0.1] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
        }),
      ),
      P.cast,
    ),
  );
  return group(ps);
}

/** Angle (radians, measured in the (z, y) plane from +Z towards +Y) of tooth k before rotation. */
export function toothAngle(k: number): number {
  // toothRing is built in XY with tooth k at angle a_k from +X; rotateY(90deg) maps X -> -Z, Y -> Y
  const a = (k / R.sprocketTeeth) * Math.PI * 2;
  return Math.PI - a;
}

/* -------------------------------- return roller ----------------------------------------- */

export function returnRoller(P: Pal): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const r = R.rrR;
  for (const s of [-1, 1]) {
    const c = s * 0.105;
    ps.push(
      part(
        latheX(
          [
            [0.05, c - 0.05],
            [r - 0.012, c - 0.05],
            [r, c - 0.04],
            [r, c + 0.04],
            [r - 0.012, c + 0.05],
            [0.05, c + 0.05],
          ],
          40,
          35,
        ),
        P.cast,
      ),
    );
  }
  // hub between the two rollers and the outer hub cap with bolts
  ps.push(part(G.cyl(0.055, 0.055, 0.32, 20), P.cast, { r: [0, 0, 90] }));
  ps.push(part(latheX([[0.0, 0.155], [0.065, 0.155], [0.065, 0.175], [0.05, 0.188], [0.0, 0.19]], 24, 35), P.cast));
  ps.push(
    part(
      G.scatter(
        G.boltHead(0.013, 0.008),
        Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return { p: [0.175, Math.sin(a) * 0.045, Math.cos(a) * 0.045] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
        }),
      ),
      P.cast,
    ),
  );
  return group(ps);
}

/* ------------------------------ suspension & housings ----------------------------------- */

/** Cast trailing arm from the pivot (pz, py) to the axle (z, y), lying at x in [xa, xb]. */
function arm(P: Pal, pz: number, py: number, z: number, y: number, xa: number, xb: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const len = Math.hypot(pz - z, py - y);
  const a = Math.atan2(py - y, pz - z); // angle in the (z, y) plane
  const w = xb - xa;
  // arm body: tapered plate with rounded ends, built along +Z then rotated about X
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
  // axle boss at the wheel and the torsion-bar boss at the pivot
  out.push(part(G.cyl(0.075, 0.075, w + 0.03, 24), P.cast, { p: [(xa + xb) / 2 + 0.01, y, z], r: [0, 0, 90] }));
  return out;
}

/** Suspension arms, bosses, bump stops, return-roller brackets, idler crank, final drive (left side). */
export function suspension(P: Pal, idlerZ: number): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const x0 = H.xL; // hull side face
  const xw = R.trackX - R.tyreGap / 2 - R.tyreW - 0.012; // just inside the inner disc
  for (const z of R.wheelZ) {
    const pz = z + R.armDz, py = R.wheelY + R.armDy;
    ps.push(...arm(P, pz, py, z, R.wheelY, x0 + 0.03, xw - 0.005));
    // torsion-bar housing boss on the hull side with its end cap
    ps.push(part(latheX([[0.0, x0 - 0.01], [0.125, x0 - 0.01], [0.125, x0 + 0.03], [0.11, x0 + 0.045], [0.0, x0 + 0.045]], 30, 35), P.cast, { p: [0, py, pz] }));
    ps.push(part(latheX([[0.0, xw - 0.02], [0.07, xw - 0.02], [0.07, xw + 0.005], [0.055, xw + 0.018], [0.0, xw + 0.02]], 24, 35), P.cast, { p: [0, py, pz] }));
    // bump stop above the wheel: welded bracket with a cylindrical stop
    const by = R.wheelY + 0.33;
    ps.push(part(G.rbox(0.13, 0.12, 0.14, 0.012, 1), P.paint, { p: [x0 + 0.065, by + 0.04, z + 0.06] }));
    ps.push(part(G.cyl(0.045, 0.05, 0.07, 16), P.cast, { p: [x0 + 0.075, by - 0.045, z + 0.06] }));
  }
  // return-roller brackets: bosses on the hull side and stub axles
  for (const z of R.rrZ) {
    ps.push(part(latheX([[0.0, x0 - 0.01], [0.1, x0 - 0.01], [0.1, x0 + 0.05], [0.085, x0 + 0.07], [0.0, x0 + 0.07]], 26, 35), P.cast, { p: [0, R.rrY, z] }));
    ps.push(part(G.cyl(0.045, 0.045, R.trackX - x0 - 0.1, 16), P.cast, { p: [(x0 + R.trackX - 0.1) / 2, R.rrY, z], r: [0, 0, 90] }));
  }
  // idler crank (track tensioner): boss on the hull, crank arm to the idler axle
  const cz = idlerZ - 0.26, cy = R.idlerY - 0.1;
  ps.push(part(latheX([[0.0, x0 - 0.01], [0.13, x0 - 0.01], [0.13, x0 + 0.04], [0.115, x0 + 0.055], [0.0, x0 + 0.055]], 30, 35), P.cast, { p: [0, cy, cz] }));
  ps.push(...arm(P, cz, cy, idlerZ, R.idlerY, x0 + 0.04, xw - 0.005));
  // mud scraper ahead of the sprocket
  ps.push(part(G.rbox(0.1, 0.05, 0.16, 0.01, 1), P.paint, { p: [x0 + 0.05, R.sprocketY + 0.2, R.sprocketZ + 0.4], r: [30, 0, 0] }));
  // final-drive housing (cast) between the hull side and the sprocket, with its bolt ring
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

export { xf };
