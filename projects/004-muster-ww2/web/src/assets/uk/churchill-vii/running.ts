/**
 * Running gear for one side (the tank's left, +X): eleven small bogies (two 10 in all-steel wheels
 * on a common axle either side of the track guide, a cast bogie bracket up into the pannier floor
 * where the coil spring sits), the front idler carried between the two horn plates of the nose, the
 * rear drive sprocket (two toothed rings engaging the windows of the links) and its final-drive
 * housing on the hull side.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { R, H } from './dims';
import type { Pal } from './palette';
import { WIN, HALF_T } from './track';
import { latheX, discX, perforatedDisc, ringX, rb, circle, merge } from '../cromwell/util';

/* ------------------------------------------------------------------ bogie wheel */

let wheelGeo: THREE.BufferGeometry | null = null;
/** One small all-steel wheel, axle along X, outer face +X, centred on its width. */
function wheelGeometry(): THREE.BufferGeometry {
  if (wheelGeo) return wheelGeo;
  const r = R.wheelR, w = R.wheelW / 2;
  wheelGeo = latheX(
    [
      [0.0, -w + 0.012],
      [0.045, -w + 0.012],
      [0.07, -w + 0.004],
      [r - 0.018, -w + 0.004],
      [r - 0.004, -w],
      [r, -w + 0.012],
      [r, w - 0.012],
      [r - 0.004, w],
      [r - 0.02, w],
      [r - 0.026, w - 0.012],
      [0.07, w - 0.02],
      [0.05, w - 0.004],
      [0.04, w + 0.016],
      [0.028, w + 0.024],
      [0.0, w + 0.026],
    ],
    30,
    35,
  );
  return wheelGeo;
}

let bogieCache: THREE.Group | null = null;
/** Bogie in its local frame: origin at the axle centre = track centre line. */
export function bogie(P: Pal): THREE.Group {
  if (bogieCache) return bogieCache.clone();
  const ps: THREE.Object3D[] = [];
  const wg = wheelGeometry();
  ps.push(part(wg, P.cast, { p: [R.wheelDX, 0, 0] }));
  const inner = part(wg, P.cast, { p: [-R.wheelDX, 0, 0] });
  inner.scale.x = -1;
  ps.push(inner);
  // axle through both wheels
  ps.push(part(G.cyl(0.035, 0.035, 2 * R.wheelDX + R.wheelW, 16), P.cast, { r: [0, 0, 90] }));
  // bogie bracket between the wheels: boss round the axle and the arm up to the pannier floor
  const gapW = 2 * R.wheelDX - R.wheelW - 0.02;
  ps.push(part(G.cyl(0.052, 0.052, gapW, 18), P.cast, { r: [0, 0, 90] }));
  const top = H.yPb - R.wheelY + 0.01;
  ps.push(part(rb(gapW - 0.02, top - 0.02, 0.1, 0.014), P.cast, { p: [0, (top + 0.02) / 2, -0.02] }));
  // side cheeks of the bracket showing between the wheels and the pannier floor
  ps.push(part(rb(2 * R.wheelDX + R.wheelW - 0.02, 0.05, 0.2, 0.012), P.cast, { p: [0, top - 0.025, 0] }));
  bogieCache = group(ps);
  return bogieCache.clone();
}

/* ------------------------------------------------------------------ idler */

export function idler(P: Pal): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const rim = R.idlerR;
  for (const sx of [-1, 1]) {
    const x = sx * WIN.x;
    // rim the links ride on, with a lip
    ps.push(
      part(
        latheX(
          [
            [rim - 0.04, x - 0.05],
            [rim, x - 0.05],
            [rim, x + 0.05],
            [rim - 0.04, x + 0.05],
          ],
          48,
          35,
        ),
        P.cast,
      ),
    );
    ps.push(part(discX(perforatedDisc(rim - 0.035, 0.08, 0.02, [{ r: 0.04, at: 0.175, count: 6, phase: 0.3, seg: 12 }], 48, 0.003), x), P.cast));
  }
  ps.push(part(G.cyl(0.08, 0.08, 2 * WIN.x + 0.06, 24), P.cast, { r: [0, 0, 90] }));
  // axle running out to both horn plates
  const span = H.xP - 0.03 - (H.xH + 0.035);
  ps.push(part(G.cyl(0.05, 0.05, span, 16), P.cast, { r: [0, 0, 90] }));
  return group(ps);
}

/* ------------------------------------------------------------------ sprocket */

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

/** Rear drive sprocket; tooth k at angle k * 360/teeth, measured as atan2(y, z) before rotation. */
export function sprocket(P: Pal): THREE.Group {
  const ps: THREE.Object3D[] = [];
  const pr = R.sprocketPitchR;
  const rRoot = pr - HALF_T - 0.01, rTip = pr + HALF_T + 0.012;
  const gear = G.extrude(G.shape(gearOutline(R.teeth, rRoot, rTip, 0.04, 0.02), 0, [circle(rRoot - 0.06, 40)]), 0.045, 0.004, 2, 1);
  gear.rotateY(-Math.PI / 2);
  for (const sx of [-1, 1]) {
    const g = gear.clone();
    g.translate(sx * WIN.x, 0, 0);
    ps.push(part(g, P.cast));
  }
  // drum between the rings, below the guide-horn tips
  const dr = pr - HALF_T - R.horn - 0.015;
  ps.push(part(latheX([[dr - 0.02, -WIN.x], [dr, -WIN.x + 0.01], [dr, WIN.x - 0.01], [dr - 0.02, WIN.x]], 40, 35), P.cast));
  // outer web with holes, inner web, hub and cap
  ps.push(part(discX(perforatedDisc(rRoot - 0.03, 0.09, 0.02, [{ r: 0.045, at: 0.18, count: 6, phase: 0.52, seg: 12 }], 48, 0.003), WIN.x + 0.01), P.cast));
  ps.push(part(discX(perforatedDisc(rRoot - 0.03, 0.09, 0.02, [], 48, 0.003), -WIN.x - 0.01), P.cast));
  ps.push(part(latheX([[0.0, -WIN.x - 0.03], [0.1, -WIN.x - 0.03], [0.1, WIN.x + 0.04], [0.085, WIN.x + 0.055], [0.0, WIN.x + 0.058]], 32, 35), P.cast));
  ps.push(part(G.scatter(G.boltHead(0.02, 0.01), ringX(0.075, 8, WIN.x + 0.04, 1, 0.2)), P.cast));
  ps.push(part(G.scatter(G.boltHead(0.018, 0.009), ringX(rRoot - 0.05, 10, WIN.x + 0.02, 1, 0.1)), P.cast));
  return group(ps);
}

/** Final-drive housing from the hull side out to the sprocket (left side, hull frame). */
export function finalDrive(P: Pal): THREE.Object3D {
  const x0 = H.xH, x1 = R.trackX - WIN.x - 0.04;
  const g = merge([
    latheX([[0.0, 0.0], [0.24, 0.0], [0.25, 0.02], [0.22, 0.05], [0.14, 0.08], [0.12, x1 - x0], [0.0, x1 - x0]], 32, 30),
  ]);
  return group([
    part(g, P.cast, { p: [x0, R.sprocketY, R.sprocketZ] }),
    part(G.scatter(G.boltHead(0.022, 0.011), ringX(0.2, 10, x0 + 0.02, 1).map((b) => ({ ...b, p: b.p.add(new THREE.Vector3(0, R.sprocketY, R.sprocketZ)) }))), P.cast),
  ]);
}
