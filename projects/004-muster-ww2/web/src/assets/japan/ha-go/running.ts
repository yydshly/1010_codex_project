/**
 * Running gear for one side (the tank's left, +X; mirrored for the right): four double road wheels
 * (dished discs with solid rubber tyres) in two bogies, the bell-crank suspension (each bogie hangs
 * from a bell crank whose upper arm bears on one long horizontal coil spring in a tube fixed to the
 * hull side between the bogies), two return rollers, the front drive sprocket with its final-drive
 * housing, and the rear idler on its adjusting crank.
 *
 * Wheel-local frame: axle along +X (outwards), origin at the centre of the wheel PAIR.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { R, H } from './dims';
import type { Pal } from './palette';
import { WIN, HALF_T, rollerY, solveTrack, buildTrack, linkAnglesAround, type TrackSolution } from './track';
import { latheX, discX, perforatedDisc, ringX, rb, merge, circle } from './util';

const g0 = R.tyreGap / 2, g1 = g0 + R.tyreW; // tyre faces from the pair centre
/** hull-side face the suspension is bolted to */
const x0 = H.xLow;
/** just inside the inner tyre (local to the track centre line, absolute below) */
const xIn = R.trackX - g1 - 0.012;

/* --------------------------------- road wheel ------------------------------------------- */

function singleRoadWheel(P: Pal, outerFace: boolean): THREE.Group {
  const Rt = R.wheelR, rSeat = Rt - 0.045;
  const parts: THREE.Object3D[] = [];
  // solid rubber tyre with rounded shoulders
  parts.push(
    part(
      latheX(
        [
          [rSeat, g0 + 0.003],
          [rSeat + 0.006, g0],
          [Rt - 0.016, g0],
          [Rt - 0.004, g0 + 0.006],
          [Rt, g0 + 0.016],
          [Rt, g1 - 0.016],
          [Rt - 0.004, g1 - 0.006],
          [Rt - 0.016, g1],
          [rSeat + 0.006, g1],
          [rSeat, g1 - 0.003],
          [rSeat, g0 + 0.003],
        ],
        40,
        35,
      ),
      P.rubber,
    ),
  );
  // steel rim band with the retaining lip on the outer face
  parts.push(
    part(
      latheX(
        [
          [rSeat - 0.03, g0 + 0.004],
          [rSeat + 0.001, g0 + 0.004],
          [rSeat + 0.001, g1 - 0.003],
          [rSeat + 0.008, g1],
          [rSeat + 0.008, g1 + 0.006],
          [rSeat - 0.004, g1 + 0.01],
          [rSeat - 0.03, g1 + 0.008],
          [rSeat - 0.034, g0 + 0.01],
          [rSeat - 0.03, g0 + 0.004],
        ],
        32,
        35,
      ),
      P.cast,
    ),
  );
  // dished pressed disc and hub
  const xh = g0 + 0.035;
  parts.push(
    part(
      latheX(
        [
          [0.07, xh - 0.008],
          [0.11, xh - 0.004],
          [rSeat - 0.032, g1 - 0.024],
          [rSeat - 0.032, g1 - 0.012],
          [rSeat - 0.05, g1 - 0.018],
          [0.12, xh + 0.012],
          [0.07, xh + 0.008],
          [0.07, xh - 0.008],
        ],
        32,
        28,
      ),
      P.cast,
    ),
  );
  parts.push(
    part(
      latheX(
        [
          [0.0, g0 - 0.02],
          [0.075, g0 - 0.02],
          [0.075, xh + 0.01],
          [0.066, xh + 0.03],
          [0.052, xh + 0.036],
          [0.048, xh + 0.07],
          [0.03, xh + 0.078],
          [0.0, xh + 0.08],
        ],
        24,
        35,
      ),
      P.cast,
    ),
  );
  if (outerFace) parts.push(part(G.scatter(G.boltHead(0.014, 0.007), ringX(0.058, 6, xh + 0.03, 1)), P.cast));
  return group(parts);
}

let wheelCache: THREE.Group | null = null;
export function roadWheelPair(P: Pal): THREE.Group {
  if (wheelCache) return wheelCache.clone();
  const outer = singleRoadWheel(P, true);
  const inner = singleRoadWheel(P, false);
  inner.scale.x = -1;
  const hub = part(G.cyl(0.07, 0.07, R.tyreGap + 0.04, 24), P.cast, { r: [0, 0, 90] });
  wheelCache = group([outer, inner, hub]);
  return wheelCache.clone();
}

/* ------------------------------------ idler --------------------------------------------- */

export function idler(P: Pal): THREE.Group {
  const rimR = R.idlerR;
  const one = (outerSide: boolean) => {
    const s: THREE.Object3D[] = [];
    s.push(
      part(
        latheX(
          [
            [rimR - 0.035, g0 + 0.004],
            [rimR, g0 + 0.004],
            [rimR, g1 - 0.006],
            [rimR - 0.004, g1],
            [rimR - 0.028, g1],
            [rimR - 0.034, g1 - 0.03],
            [rimR - 0.035, g0 + 0.004],
          ],
          48,
          35,
        ),
        P.cast,
      ),
    );
    s.push(part(discX(perforatedDisc(rimR - 0.03, 0.07, 0.012, [{ r: 0.028, at: 0.13, count: 6, phase: 0.26, seg: 12 }], 48, 0.003), g0 + 0.06), P.cast));
    s.push(part(latheX([[0.0, g0 - 0.02], [0.075, g0 - 0.02], [0.075, g0 + 0.09], [0.066, g0 + 0.1], [0.0, g0 + 0.1]], 28, 35), P.cast));
    if (outerSide) {
      s.push(part(latheX([[0.0, g0 + 0.1], [0.055, g0 + 0.1], [0.055, g0 + 0.12], [0.045, g0 + 0.128], [0.0, g0 + 0.13]], 24, 35), P.cast));
      s.push(part(G.scatter(G.boltHead(0.014, 0.007), ringX(0.064, 6, g0 + 0.1, 1, 0.2)), P.cast));
    }
    return group(s);
  };
  const o = one(true);
  const i = one(false);
  i.scale.x = -1;
  return group([o, i, part(G.cyl(0.07, 0.07, R.tyreGap + 0.04, 24), P.cast, { r: [0, 0, 90] })]);
}

/* ---------------------------------- sprocket -------------------------------------------- */

/** Gear outline (CCW) with `n` trapezoidal teeth, tooth 0 centred on angle 0. */
function gearOutline(n: number, rRoot: number, rTip: number, halfRoot: number, halfTip: number): G.V2[] {
  const pts: G.V2[] = [];
  const step = (Math.PI * 2) / n;
  for (let k = 0; k < n; k++) {
    const a = k * step;
    const aR = halfRoot / rRoot, aT = halfTip / rTip;
    for (let j = 1; j <= 3; j++) {
      const b = a - step + aR + ((step - 2 * aR) * j) / 4;
      pts.push([Math.cos(b) * rRoot, Math.sin(b) * rRoot]);
    }
    pts.push([Math.cos(a - aR) * rRoot, Math.sin(a - aR) * rRoot]);
    pts.push([Math.cos(a - aT) * rTip, Math.sin(a - aT) * rTip]);
    pts.push([Math.cos(a + aT) * rTip, Math.sin(a + aT) * rTip]);
    pts.push([Math.cos(a + aR) * rRoot, Math.sin(a + aR) * rRoot]);
  }
  return pts;
}

/** Front drive sprocket; tooth k at angle k * 360/teeth (atan2(y, z)) before rotation. */
export function sprocket(P: Pal, sol: TrackSolution): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const pr = sol.sprocketR;
  const rRoot = pr - HALF_T - 0.01, rTip = pr + HALF_T + 0.02;
  const gear = G.extrude(G.shape(gearOutline(sol.teeth, rRoot, rTip, 0.018, 0.008), 0, [circle(rRoot - 0.045, 40)]), 0.024, 0.003, 2, 1);
  gear.rotateY(-Math.PI / 2);
  for (const sx of [-1, 1]) {
    const g = gear.clone();
    g.translate(sx * WIN.x, 0, 0);
    parts.push(part(g, P.cast));
    parts.push(part(latheX([[rRoot - 0.042, -0.01], [rRoot - 0.004, -0.01], [rRoot - 0.004, 0.01], [rRoot - 0.042, 0.01]], 40, 35), P.cast, { p: [sx * (WIN.x - 0.022), 0, 0] }));
  }
  // drum between the rings
  parts.push(part(latheX([[rRoot - 0.07, -WIN.x + 0.02], [rRoot - 0.06, -WIN.x + 0.03], [rRoot - 0.06, WIN.x - 0.03], [rRoot - 0.07, WIN.x - 0.02]], 36, 35), P.cast));
  // outer web with holes and the hub
  parts.push(part(discX(perforatedDisc(rRoot - 0.03, 0.08, 0.014, [{ r: 0.03, at: 0.14, count: 6, phase: 0.52, seg: 12 }], 48, 0.003), WIN.x - 0.004), P.cast));
  parts.push(part(discX(perforatedDisc(rRoot - 0.03, 0.14, 0.014, [], 48, 0.003), -WIN.x + 0.004), P.cast));
  parts.push(part(latheX([[0.0, -WIN.x - 0.02], [0.09, -WIN.x - 0.02], [0.09, WIN.x + 0.02], [0.082, WIN.x + 0.03], [0.0, WIN.x + 0.03]], 32, 35), P.cast));
  parts.push(part(latheX([[0.0, WIN.x + 0.03], [0.065, WIN.x + 0.03], [0.065, WIN.x + 0.05], [0.055, WIN.x + 0.058], [0.0, WIN.x + 0.06]], 28, 35), P.cast));
  parts.push(part(G.scatter(G.boltHead(0.016, 0.008), ringX(0.076, 8, WIN.x + 0.03, 1, 0.15)), P.cast));
  parts.push(part(G.scatter(G.boltHead(0.014, 0.008), ringX(rRoot - 0.03, 12, WIN.x + 0.004 + 0.007, 1, 0.1)), P.cast));
  return group(parts);
}

/* -------------------------------- return rollers ---------------------------------------- */

function rollerHalf(P: Pal, xa: number, xb: number): THREE.Object3D[] {
  const r = R.rollerR;
  return [
    part(latheX([[r - 0.02, xa], [r - 0.004, xa], [r, xa + 0.006], [r, xb - 0.006], [r - 0.004, xb], [r - 0.02, xb], [r - 0.02, xa]], 28, 35), P.rubber),
    part(latheX([[0.0, xa - 0.004], [r - 0.018, xa - 0.004], [r - 0.018, xb + 0.004], [0.026, xb + 0.01], [0.0, xb + 0.012]], 24, 35), P.cast),
  ];
}

/** Return rollers with their brackets on the hull side (hull frame, left side). */
export function returnRollers(P: Pal, sol: TrackSolution): THREE.Group {
  const parts: THREE.Object3D[] = [];
  for (let i = 0; i < R.rollerZ.length; i++) {
    const z = R.rollerZ[i], y = rollerY(i, sol.sprocketR);
    const rs: THREE.Object3D[] = [];
    rs.push(...rollerHalf(P, -0.105, -0.022), ...rollerHalf(P, 0.022, 0.1));
    rs.push(part(G.cyl(0.026, 0.026, 0.05, 16), P.cast, { r: [0, 0, 90] }));
    parts.push(group(rs, { p: [R.trackX, y, z] }));
    // stub axle and a bracket plate hanging from the sponson floor on the hull side
    const xa = R.trackX - 0.105;
    parts.push(part(G.cyl(0.022, 0.022, xa - x0 + 0.01, 14), P.cast, { p: [(x0 + xa) / 2, y, z], r: [0, 0, 90] }));
    const hb = H.yGuard - y + 0.05;
    parts.push(part(rb(0.04, hb, 0.09, 0.01), P.cast, { p: [x0 + 0.02, y - 0.05 + hb / 2, z] }));
    parts.push(part(G.cyl(0.042, 0.042, 0.02, 16), P.cast, { p: [x0 + 0.05, y, z], r: [0, 0, 90] }));
  }
  return group(parts);
}

/* ------------------------------ suspension & spring tube -------------------------------- */

/** a plate "arm" between two (z, y) points in the plane x, with thickness along X */
function arm(x: number, a: [number, number], b: [number, number], w: number, t: number): THREE.BufferGeometry {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const g = rb(t, L + w, w, Math.min(0.012, w / 3));
  g.rotateX(Math.atan2(b[0] - a[0], b[1] - a[1]));
  g.translate(x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
  return g;
}

/** Bogies, bell cranks, the horizontal spring tube, idler crank and final drive (left side, hull frame). */
export function suspension(P: Pal): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const geo: THREE.BufferGeometry[] = [];
  const wy = R.wheelY;
  const Z = R.wheelZ;
  const xb = (x0 + xIn) / 2 + 0.03; // bogie beam plane
  const xc = xb - 0.04; // bell crank plane
  const xs = x0 + 0.065; // spring tube axis
  const ySp = R.springY;
  // axle stubs of all four wheels
  for (const z of Z) {
    const ax = G.cyl(0.045, 0.045, R.trackX - xb, 18);
    ax.rotateZ(Math.PI / 2);
    ax.translate((xb + R.trackX) / 2, wy, z);
    geo.push(ax);
  }
  // bogie: beam between the axles and a web up to the pivot; bell crank from the bogie pivot up to
  // the hull pivot, and its upper arm on to the spring rod end (towards the middle of the tank)
  const bogie = (za: number, zb: number, dir: 1 | -1) => {
    const zc = (za + zb) / 2;
    geo.push(arm(xb, [za, wy], [zb, wy], 0.09, 0.045));
    const py = wy + 0.12;
    geo.push(arm(xb, [zc - 0.07, wy + 0.01], [zc, py], 0.1, 0.045));
    geo.push(arm(xb, [zc + 0.07, wy + 0.01], [zc, py], 0.1, 0.045));
    const hz = zc - dir * 0.13, hy = py + 0.07;
    geo.push(arm(xc, [zc, py], [hz, hy], 0.085, 0.034));
    const ez = zc - dir * 0.24; // upper arm end = spring rod end
    geo.push(arm(xc, [hz, hy], [ez, ySp], 0.075, 0.034));
    // hull pivot boss and pin, bogie pivot pin
    parts.push(part(G.cyl(0.062, 0.068, 0.03, 20), P.cast, { p: [x0 + 0.015, hy, hz], r: [0, 0, 90] }));
    const pin = G.cyl(0.03, 0.03, xc - x0 + 0.02, 14);
    pin.rotateZ(Math.PI / 2);
    pin.translate((x0 + xc) / 2, hy, hz);
    geo.push(pin);
    const bp = G.cyl(0.036, 0.036, xb - xc + 0.07, 14);
    bp.rotateZ(Math.PI / 2);
    bp.translate((xb + xc) / 2, py, zc);
    geo.push(bp);
    return ez;
  };
  const eA = bogie(Z[0], Z[1], 1);
  const eB = bogie(Z[2], Z[3], -1);
  parts.push(part(merge(geo), P.cast));
  // the long spring tube between the crank ends, with collars, end rods and strap brackets
  const zMid = (eA + eB) / 2, L = Math.abs(eA - eB) - 0.16;
  const tube = latheX([[0.0, -L / 2], [0.046, -L / 2], [0.05, -L / 2 + 0.01], [0.05, L / 2 - 0.01], [0.046, L / 2], [0.0, L / 2]], 22, 35);
  tube.rotateY(Math.PI / 2);
  parts.push(part(tube, P.paint, { p: [xs, ySp, zMid] }));
  for (const s of [-1, 1]) {
    parts.push(part(G.cyl(0.058, 0.058, 0.03, 20), P.cast, { p: [xs, ySp, zMid + s * (L / 2 - 0.03)], r: [90, 0, 0] }));
    const ze = s > 0 ? eA : eB;
    parts.push(part(G.rod([xs, ySp, zMid + s * (L / 2 - 0.01)], [xs, ySp, ze], 0.018, 10), P.gun));
    parts.push(part(G.cyl(0.026, 0.026, xc - xs + 0.03, 12), P.cast, { p: [(xs + xc) / 2, ySp, ze], r: [0, 0, 90] }));
  }
  for (const f of [-0.33, 0, 0.33]) {
    const z = zMid + f * L;
    parts.push(part(rb(xs - x0 + 0.012, 0.026, 0.07, 0.006), P.cast, { p: [(x0 + xs) / 2, ySp + 0.045, z] }));
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 8; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 8;
      pts.push([xs + Math.cos(a) * 0.054, ySp + Math.sin(a) * 0.054, z]);
    }
    parts.push(part(G.strap(pts, 0.03, 0.005, [0, 0, 1], { smooth: false }), P.paint));
  }
  // idler crank (track adjuster): boss on the hull side, crank to the idler axle, adjuster screw
  const cz = R.idlerZ + 0.18, cy = R.idlerY + 0.1;
  parts.push(part(G.cyl(0.07, 0.08, 0.04, 24), P.cast, { p: [x0 + 0.02, cy, cz], r: [0, 0, 90] }));
  const ca = Math.atan2(R.idlerZ - cz, R.idlerY - cy);
  const cl = Math.hypot(R.idlerZ - cz, R.idlerY - cy);
  parts.push(part(rb(0.045, cl + 0.09, 0.08, 0.014), P.cast, { p: [x0 + 0.06, (cy + R.idlerY) / 2, (cz + R.idlerZ) / 2], r: [(ca * 180) / Math.PI, 0, 0] }));
  const ix = R.trackX - g0 - 0.04;
  parts.push(part(G.cyl(0.045, 0.045, ix - x0, 18), P.cast, { p: [(x0 + ix) / 2, R.idlerY, R.idlerZ], r: [0, 0, 90] }));
  parts.push(part(G.rod([x0 + 0.04, cy + 0.03, cz + 0.02], [x0 + 0.04, cy + 0.17, cz + 0.24], 0.02, 12), P.cast));
  // final drive housing between hull side and sprocket
  const xsd = R.trackX - WIN.x - 0.03;
  parts.push(
    part(
      latheX([[0.0, 0.0], [0.16, 0.0], [0.17, 0.02], [0.155, 0.045], [0.11, 0.07], [0.09, xsd - x0], [0.0, xsd - x0]], 32, 30),
      P.cast,
      { p: [x0, R.sprocketY, R.sprocketZ] },
    ),
  );
  parts.push(part(G.scatter(G.boltHead(0.016, 0.009), ringX(0.145, 10, x0 + 0.02, 1).map((b) => ({ ...b, p: b.p.add(new THREE.Vector3(0, R.sprocketY, R.sprocketZ)) }))), P.cast));
  return group(parts);
}

export { xIn };

/* ---------------------------------- assembly -------------------------------------------- */

/** Complete running gear and tracks for both sides (hull frame). */
export function runningGear(P: Pal): THREE.Group {
  const sol = solveTrack();
  const left: THREE.Object3D[] = [];
  for (const z of R.wheelZ) left.push(group([roadWheelPair(P)], { p: [R.trackX, R.wheelY, z] }));
  left.push(group([idler(P)], { p: [R.trackX, R.idlerY, R.idlerZ] }));
  const sp = sprocket(P, sol);
  const ang = linkAnglesAround(sol, [R.sprocketZ, R.sprocketY], sol.sprocketR);
  sp.position.set(R.trackX, R.sprocketY, R.sprocketZ);
  sp.rotation.x = ang.length ? -ang[0] : 0;
  left.push(sp);
  left.push(suspension(P));
  left.push(returnRollers(P, sol));
  left.push(buildTrack(P, sol));
  return mirrorX(group(left), true);
}
