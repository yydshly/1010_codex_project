/**
 * SU-76M running gear for one side (the vehicle's left, +X): six single pressed-steel road wheels
 * with solid rubber tyres (T-70 pattern, 550 mm), the rear idler of the same pattern on its crank,
 * the front drive sprocket with a bolted 13-tooth ring, three small rubber-tyred return rollers on
 * hull brackets, torsion-bar trailing arms with their hull bosses, bump stops and the final-drive
 * housing.
 *
 * Wheel-local frame: axle along +X (outwards), origin on the wheel centre plane.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { R, H } from './dims';
import type { Pal } from './palette';
import { latheX, discX, perforatedDisc, merge, xf } from './util';

/* --------------------------------- road wheel ------------------------------------------- */

/** Single road wheel (also used as the idler). */
export function roadWheel(P: Pal): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const Rt = R.wheelR, hw = R.tyreW / 2, rSeat = 0.226;
  // solid rubber tyre with rounded shoulders
  ps.push(
    part(
      latheX(
        [
          [rSeat, -hw + 0.004], [rSeat + 0.004, -hw], [Rt - 0.012, -hw], [Rt - 0.002, -hw + 0.01], [Rt, -hw + 0.022],
          [Rt, hw - 0.022], [Rt - 0.002, hw - 0.01], [Rt - 0.012, hw], [rSeat + 0.004, hw], [rSeat, hw - 0.004],
        ],
        44,
        35,
      ),
      P.rubber,
    ),
  );
  // pressed dish: rim band, conical web to the hub flange (closed section with thickness)
  ps.push(
    part(
      latheX(
        [
          [rSeat - 0.001, -hw + 0.006], [rSeat - 0.001, hw - 0.004], [rSeat - 0.012, hw - 0.002], [0.19, hw + 0.004],
          [0.13, hw - 0.004], [0.09, hw + 0.012], [0.085, hw + 0.012], [0.085, hw + 0.004], [0.125, hw - 0.012],
          [0.185, hw - 0.004], [rSeat - 0.014, hw - 0.01], [rSeat - 0.014, -hw + 0.012], [rSeat - 0.004, -hw + 0.006],
        ],
        44,
        35,
      ),
      P.paint,
    ),
  );
  // six radial stiffening swages pressed into the web
  const sw: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const g = G.rbox(0.012, 0.085, 0.024, 0.006, 1);
    g.translate(hw + 0.003, 0.15, 0);
    g.rotateX((i / 6) * Math.PI * 2 + 0.26);
    sw.push(g);
  }
  ps.push(part(merge(sw), P.paint));
  // hub with cap and bolt ring
  ps.push(part(latheX([[0.0, -hw - 0.05], [0.07, -hw - 0.05], [0.075, -hw - 0.03], [0.075, hw + 0.01], [0.0, hw + 0.01]], 28, 35), P.cast));
  ps.push(part(latheX([[0.0, hw + 0.01], [0.062, hw + 0.01], [0.062, hw + 0.03], [0.05, hw + 0.05], [0.028, hw + 0.058], [0.0, hw + 0.06]], 24, 35), P.cast));
  ps.push(
    part(
      G.scatter(
        G.boltHead(0.018, 0.01),
        Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return { p: [hw + 0.011, Math.sin(a) * 0.072, Math.cos(a) * 0.072] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
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
  const rTip = rp + 0.03, rRoot = rp - 0.022, rIn = rp - 0.07;
  const pts: G.V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const st = (Math.PI * 2) / n;
    const prof: [number, number][] = [
      [-0.5, rRoot], [-0.34, rRoot + 0.003], [-0.24, rp - 0.004], [-0.15, rTip - 0.01], [-0.08, rTip], [0.08, rTip], [0.15, rTip - 0.01], [0.24, rp - 0.004], [0.34, rRoot + 0.003],
    ];
    for (const [f, r] of prof) {
      const aa = a + f * st;
      pts.push([Math.cos(aa) * r, Math.sin(aa) * r]);
    }
  }
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const hole = new THREE.Path();
  for (let i = 0; i <= 48; i++) {
    const a = -(i / 48) * Math.PI * 2;
    if (i === 0) hole.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
    else hole.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
  }
  s.holes.push(hole);
  const g = G.extrude(s, 0.036, 0.005, 4, 1);
  g.rotateY(Math.PI / 2);
  return g;
}

/** Front drive sprocket; tooth k sits at angle toothAngle(k) in the (z, y) plane. */
export function sprocket(P: Pal): THREE.Group {
  const ps: THREE.Object3D[] = [];
  ps.push(part(toothRing(), P.track));
  const rC = R.sprocketR - 0.06;
  // two dished carrier discs clamping the ring, with lightening holes
  for (const x of [-0.03, 0.03]) {
    ps.push(part(discX(perforatedDisc(rC, 0.07, 0.012, [{ r: 0.03, at: 0.12, count: 6, phase: 0.26, seg: 12 }], 48, 0.003), x), P.cast));
  }
  ps.push(
    part(
      G.scatter(
        G.boltHead(0.018, 0.009),
        Array.from({ length: 13 }, (_, i) => {
          const a = (i / 13) * Math.PI * 2 + Math.PI / 13;
          return { p: [0.036, Math.sin(a) * (R.sprocketR - 0.045), Math.cos(a) * (R.sprocketR - 0.045)] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
        }),
      ),
      P.cast,
    ),
  );
  // hub and cap
  ps.push(part(latheX([[0.0, -0.13], [0.09, -0.13], [0.095, -0.1], [0.095, 0.05], [0.08, 0.07], [0.0, 0.07]], 32, 35), P.cast));
  ps.push(part(latheX([[0.0, 0.07], [0.06, 0.07], [0.06, 0.09], [0.045, 0.106], [0.0, 0.11]], 24, 35), P.cast));
  ps.push(
    part(
      G.scatter(
        G.boltHead(0.017, 0.009),
        Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return { p: [0.07, Math.sin(a) * 0.072, Math.cos(a) * 0.072] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
        }),
      ),
      P.cast,
    ),
  );
  return group(ps);
}

/** Angle (radians, in the (z, y) plane from +Z towards +Y) of tooth k before rotation. */
export function toothAngle(k: number): number {
  // the ring outline starts with a tooth centred at angle 0 in the shape's XY plane; after the
  // rotateY(90 deg) the shape's x maps to -z, so tooth 0 points along -Z (angle PI)
  const a = (k / R.sprocketTeeth) * Math.PI * 2;
  return Math.PI - a;
}

/* -------------------------------- return roller ----------------------------------------- */

export function returnRoller(P: Pal): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const r = R.rrR;
  ps.push(part(latheX([[r - 0.025, -0.05], [r - 0.008, -0.05], [r, -0.038], [r, 0.038], [r - 0.008, 0.05], [r - 0.025, 0.05]], 32, 35), P.rubber));
  ps.push(part(latheX([[0.03, -0.052], [r - 0.024, -0.052], [r - 0.024, 0.052], [0.03, 0.052]], 32, 35), P.cast));
  ps.push(part(latheX([[0.0, 0.05], [0.045, 0.05], [0.045, 0.066], [0.035, 0.078], [0.0, 0.08]], 20, 35), P.cast));
  ps.push(part(G.cyl(0.035, 0.035, 0.1, 16), P.cast, { r: [0, 0, 90] }));
  return group(ps);
}

/* ------------------------------ suspension & housings ----------------------------------- */

function arm(P: Pal, pz: number, py: number, z: number, y: number, xa: number, xb: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const len = Math.hypot(pz - z, py - y);
  const a = Math.atan2(py - y, pz - z);
  const w = xb - xa;
  const body = G.plate(
    [[-0.05, -0.05], [len * 0.5, -0.038], [len + 0.045, -0.055], [len + 0.045, 0.055], [len * 0.5, 0.038], [-0.05, 0.05]],
    w,
    'zy',
    0.01,
    0.035,
  );
  body.rotateX(-a);
  body.translate((xa + xb) / 2, y, z);
  out.push(part(body, P.cast));
  out.push(part(G.cyl(0.055, 0.055, w + 0.02, 20), P.cast, { p: [(xa + xb) / 2 + 0.005, y, z], r: [0, 0, 90] }));
  return out;
}

/** Suspension arms, bosses, bump stops, return-roller brackets, idler crank, final drive (left side). */
export function suspension(P: Pal, idlerZ: number): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const x0 = H.xL;
  const xw = R.trackX - R.tyreW / 2 - 0.05;
  for (const z of R.wheelZ) {
    const pz = z + R.armDz, py = R.wheelY + R.armDy;
    ps.push(...arm(P, pz, py, z, R.wheelY, x0 + 0.02, xw - 0.004));
    ps.push(part(latheX([[0.0, x0 - 0.01], [0.09, x0 - 0.01], [0.09, x0 + 0.02], [0.08, x0 + 0.032], [0.0, x0 + 0.032]], 26, 35), P.cast, { p: [0, py, pz] }));
    // bump stop on the hull side above the arm
    ps.push(part(G.rbox(0.07, 0.07, 0.09, 0.01, 1), P.paint, { p: [x0 + 0.035, py + 0.11, pz - 0.1] }));
    ps.push(part(G.cyl(0.03, 0.034, 0.035, 14), P.rubber, { p: [x0 + 0.04, py + 0.06, pz - 0.1] }));
  }
  for (const z of R.rrZ) {
    ps.push(part(latheX([[0.0, x0 - 0.01], [0.07, x0 - 0.01], [0.07, x0 + 0.03], [0.058, x0 + 0.045], [0.0, x0 + 0.045]], 22, 35), P.cast, { p: [0, R.rrY, z] }));
    ps.push(part(G.cyl(0.03, 0.03, R.trackX - x0 - 0.05, 14), P.cast, { p: [(x0 + R.trackX - 0.05) / 2, R.rrY, z], r: [0, 0, 90] }));
  }
  // idler crank (track tensioner) on the rear hull side
  const cz = idlerZ + 0.26, cy = R.idlerY + 0.03;
  ps.push(part(latheX([[0.0, x0 - 0.01], [0.1, x0 - 0.01], [0.1, x0 + 0.03], [0.088, x0 + 0.042], [0.0, x0 + 0.042]], 26, 35), P.cast, { p: [0, cy, cz] }));
  ps.push(...arm(P, cz, cy, idlerZ, R.idlerY, x0 + 0.03, xw - 0.004));
  // tensioner screw housing on the hull side
  ps.push(part(G.rbox(0.06, 0.08, 0.2, 0.012, 1), P.cast, { p: [x0 + 0.03, cy + 0.12, cz + 0.08] }));
  // final-drive housing between the hull side and the sprocket, with its bolt ring
  ps.push(
    part(
      latheX([[0.0, x0 - 0.01], [0.17, x0 - 0.01], [0.175, x0 + 0.015], [0.16, x0 + 0.05], [0.125, x0 + 0.08], [0.105, x0 + 0.1], [0.0, x0 + 0.1]], 36, 30),
      P.cast,
      { p: [0, R.sprocketY, R.sprocketZ] },
    ),
  );
  ps.push(
    part(
      G.scatter(
        G.boltHead(0.02, 0.011),
        Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return { p: [x0 + 0.02, R.sprocketY + Math.sin(a) * 0.15, R.sprocketZ + Math.cos(a) * 0.15] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
        }),
      ),
      P.cast,
    ),
  );
  void xf;
  return group(ps);
}
