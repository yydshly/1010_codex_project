/**
 * Running gear for one side (the tank's left, +X): five large double road wheels (pressed-steel
 * dished discs with solid rubber tyres, bolted tyre-retaining rings and hub caps), the front idler
 * on its track-adjusting crank, the rear drive sprocket (two toothed rings that engage the windows
 * of the skeleton links), the Christie crank arms with their pivot housings and the final drive.
 *
 * Wheel-local frame: axle along +X (outwards), origin at the centre of the wheel PAIR.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { R, H } from './dims';
import type { Pal } from './palette';
import { WIN, HALF_T } from './track';
import { latheX, discX, perforatedDisc, ringX, rb, merge, nut, circle } from './util';

/* --------------------------------- road wheel ------------------------------------------- */

/** One wheel of the pair, outer face towards +X. */
function singleRoadWheel(P: Pal, detailed: boolean): THREE.Group {
  const g0 = R.tyreGap / 2, g1 = g0 + R.tyreW; // 0.035 .. 0.165
  const sT = detailed ? 52 : 40, sD = detailed ? 44 : 32;
  const Rt = R.wheelR, rSeat = 0.338;
  const parts: THREE.Object3D[] = [];
  // solid rubber tyre with rounded shoulders and a shallow moulded groove on the outer wall
  parts.push(
    part(
      latheX(
        [
          [rSeat, g0 + 0.003],
          [rSeat + 0.006, g0],
          [Rt - 0.024, g0],
          [Rt - 0.006, g0 + 0.007],
          [Rt, g0 + 0.02],
          [Rt, g1 - 0.02],
          [Rt - 0.006, g1 - 0.007],
          [Rt - 0.022, g1],
          [rSeat + 0.006, g1],
          [rSeat, g1 - 0.003],
          [rSeat, g0 + 0.003],
        ],
        sT,
        35,
      ),
      P.rubber,
    ),
  );
  // steel wheel band under the tyre, with the tyre-retaining ring on the outer face
  parts.push(
    part(
      latheX(
        [
          [0.3, g0 + 0.004],
          [rSeat + 0.001, g0 + 0.004],
          [rSeat + 0.001, g1 - 0.004],
          [0.346, g1 - 0.002],
          [0.346, g1 + 0.006],
          [0.338, g1 + 0.011],
          [0.3, g1 + 0.011],
          [0.294, g1 + 0.004],
          [0.294, g0 + 0.01],
          [0.3, g0 + 0.004],
        ],
        sD,
        35,
      ),
      P.cast,
    ),
  );
  // pressed dished disc: from the band inwards to the hub flange
  const xh = g0 + 0.045; // hub flange plane
  parts.push(
    part(
      latheX(
        [
          [0.13, xh - 0.008],
          [0.2, xh - 0.004],
          [0.296, g1 - 0.03],
          [0.296, g1 - 0.018],
          [0.292, g1 - 0.012],
          [0.232, g1 - 0.03],
          [0.224, g1 - 0.024],
          [0.214, g1 - 0.03],
          [0.14, xh + 0.01],
          [0.13, xh + 0.008],
          [0.13, xh - 0.008],
        ],
        sD,
        28,
      ),
      P.cast,
    ),
  );
  // hub boss and hub cap
  parts.push(
    part(
      latheX(
        [
          [0.0, g0 - 0.02],
          [0.135, g0 - 0.02],
          [0.135, xh - 0.006],
          [0.13, xh + 0.012],
          [0.1, xh + 0.02],
          [0.098, xh + 0.052],
          [0.09, xh + 0.06],
          [0.072, xh + 0.062],
          [0.066, xh + 0.1],
          [0.058, xh + 0.108],
          [0.02, xh + 0.11],
          [0.0, xh + 0.112],
        ],
        detailed ? 32 : 24,
        35,
      ),
      P.cast,
    ),
  );
  if (detailed) {
    // tyre-retaining ring bolts and hub nuts
    parts.push(part(G.scatter(nut(0.018, 0.008), ringX(0.32, 16, g1 + 0.011, 1, 0.1)), P.cast));
    parts.push(part(G.scatter(nut(0.022, 0.011), ringX(0.082, 8, xh + 0.062, 1)), P.cast));
    parts.push(part(G.scatter(nut(0.016, 0.007), ringX(0.165, 10, xh + 0.012, 1, 0.3)), P.cast));
  }
  return group(parts);
}

let wheelCache: THREE.Group | null = null;
/** Double road wheel (pair) in wheel-local frame. */
export function roadWheelPair(P: Pal): THREE.Group {
  if (wheelCache) return wheelCache.clone();
  const outer = singleRoadWheel(P, true);
  const inner = singleRoadWheel(P, false);
  inner.scale.x = -1; // mirrored inner wheel (dish facing the hull)
  const hub = part(G.cyl(0.12, 0.12, R.tyreGap + 0.04, 32), P.cast, { r: [0, 0, 90] });
  wheelCache = group([outer, inner, hub]);
  return wheelCache.clone();
}

/* ----------------------------------- idler ---------------------------------------------- */

export function idler(P: Pal): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const rimR = R.idlerR;
  const g0 = R.tyreGap / 2, g1 = g0 + R.tyreW;
  const one = (outerSide: boolean) => {
    const s: THREE.Object3D[] = [];
    // rim the track rides on, with a rolled lip on its outer edge
    s.push(
      part(
        latheX(
          [
            [rimR - 0.04, g0 + 0.004],
            [rimR, g0 + 0.004],
            [rimR, g1 - 0.006],
            [rimR - 0.004, g1],
            [rimR - 0.03, g1],
            [rimR - 0.036, g1 - 0.03],
            [rimR - 0.04, g0 + 0.004],
          ],
          56,
          35,
        ),
        P.cast,
      ),
    );
    // dished web with six lightening holes
    s.push(part(discX(perforatedDisc(rimR - 0.034, 0.09, 0.014, [{ r: 0.042, at: 0.18, count: 6, phase: 0.26, seg: 14 }], 56, 0.003), g0 + 0.07), P.cast));
    // hub
    s.push(part(latheX([[0.0, g0 - 0.02], [0.095, g0 - 0.02], [0.095, g0 + 0.1], [0.085, g0 + 0.11], [0.0, g0 + 0.11]], 32, 35), P.cast));
    if (outerSide) {
      s.push(part(latheX([[0.0, g0 + 0.11], [0.07, g0 + 0.11], [0.07, g0 + 0.132], [0.058, g0 + 0.142], [0.0, g0 + 0.144]], 32, 35), P.cast));
      s.push(part(G.scatter(G.boltHead(0.017, 0.009), ringX(0.082, 8, g0 + 0.11, 1, 0.2)), P.cast));
      s.push(part(G.scatter(G.boltHead(0.014, 0.008), ringX(0.23, 12, g0 + 0.077, 1, 0.1)), P.cast));
    }
    return group(s);
  };
  const o = one(true);
  const i = one(false);
  i.scale.x = -1;
  parts.push(o, i, part(G.cyl(0.085, 0.085, R.tyreGap + 0.04, 24), P.cast, { r: [0, 0, 90] }));
  return group(parts);
}

/* ---------------------------------- sprocket -------------------------------------------- */

/** Gear outline (CCW) with `n` trapezoidal teeth, tooth 0 centred on angle 0 (+x of the outline). */
function gearOutline(n: number, rRoot: number, rTip: number, halfRoot: number, halfTip: number): G.V2[] {
  const pts: G.V2[] = [];
  const step = (Math.PI * 2) / n;
  for (let k = 0; k < n; k++) {
    const a = k * step;
    const aR = halfRoot / rRoot, aT = halfTip / rTip;
    // root arc from the previous tooth to this one
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

/**
 * Rear drive sprocket; tooth k at angle k * 360/teeth in the (z, y) plane before rotation
 * (angle measured as atan2(y, z)).
 */
export function sprocket(P: Pal): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const pr = R.sprocketPitchR;
  const rRoot = pr - HALF_T - 0.012, rTip = pr + HALF_T + 0.022;
  // outline built in (x, y) with angle measured from +x; we map outline x -> z, y -> y
  const gear = G.extrude(G.shape(gearOutline(R.teeth, rRoot, rTip, 0.02, 0.009), 0, [circle(rRoot - 0.055, 48)]), 0.028, 0.003, 2, 1);
  // gear lies in XY with thickness along Z; turn it so thickness is along X and outline x -> Z
  gear.rotateY(-Math.PI / 2);
  for (const sx of [-1, 1]) {
    const g = gear.clone();
    g.translate(sx * WIN.x, 0, 0);
    parts.push(part(g, P.cast));
    // bolted ring flange behind each toothed ring
    parts.push(part(latheX([[rRoot - 0.05, -0.012], [rRoot - 0.004, -0.012], [rRoot - 0.004, 0.012], [rRoot - 0.05, 0.012]], 48, 35), P.cast, { p: [sx * (WIN.x - 0.026), 0, 0] }));
  }
  // drum between the rings (below the guide-horn tips)
  parts.push(part(latheX([[0.2, -WIN.x + 0.02], [0.215, -WIN.x + 0.03], [0.215, WIN.x - 0.03], [0.2, WIN.x - 0.02]], 40, 35), P.cast));
  // outer web with six holes and the hub
  parts.push(part(discX(perforatedDisc(rRoot - 0.03, 0.1, 0.016, [{ r: 0.045, at: 0.19, count: 6, phase: 0.52, seg: 14 }], 56, 0.003), WIN.x - 0.004), P.cast));
  parts.push(part(discX(perforatedDisc(rRoot - 0.03, 0.195, 0.016, [], 56, 0.003), -WIN.x + 0.004), P.cast));
  parts.push(part(latheX([[0.0, -WIN.x - 0.02], [0.11, -WIN.x - 0.02], [0.11, WIN.x + 0.02], [0.1, WIN.x + 0.03], [0.0, WIN.x + 0.03]], 36, 35), P.cast));
  parts.push(part(latheX([[0.0, WIN.x + 0.03], [0.08, WIN.x + 0.03], [0.08, WIN.x + 0.052], [0.068, WIN.x + 0.062], [0.0, WIN.x + 0.064]], 32, 35), P.cast));
  parts.push(part(G.scatter(G.boltHead(0.018, 0.01), ringX(0.094, 10, WIN.x + 0.03, 1, 0.15)), P.cast));
  parts.push(part(G.scatter(G.boltHead(0.016, 0.009), ringX(rRoot - 0.03, 12, WIN.x + 0.004 + 0.008, 1, 0.1)), P.cast));
  return group(parts);
}

/* ------------------------------ suspension & housings ----------------------------------- */

/** Christie crank arms, pivot housings, idler crank + adjuster, final drive (left side, hull frame). */
export function suspension(P: Pal, idlerZ: number): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const x0 = H.xS; // hull side outer face
  const xw = R.trackX - R.tyreGap / 2 - R.tyreW - 0.012; // just inside the inner tyre
  const arms: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const z = R.wheelZ[i];
    // trailing crank: pivot above and ahead of the axle
    const pz = z + 0.24, py = R.wheelY + 0.12;
    const len = Math.hypot(pz - z, py - R.wheelY);
    const angle = Math.atan2(pz - z, py - R.wheelY);
    const w = xw - x0 - 0.01;
    const a = rb(w, len + 0.13, 0.12, 0.02);
    a.rotateX(angle);
    a.translate(x0 + 0.01 + w / 2, (py + R.wheelY) / 2, (pz + z) / 2);
    arms.push(a);
    // pivot housing bolted to the hull side
    parts.push(part(G.cyl(0.1, 0.11, 0.03, 24), P.cast, { p: [x0 + 0.015, py, pz], r: [0, 0, 90] }));
    parts.push(part(G.scatter(G.boltHead(0.018, 0.009), ringX(0.085, 6, x0 + 0.03, 1, 0.3).map((b) => ({ ...b, p: b.p.add(new THREE.Vector3(0, py, pz)) }))), P.cast));
    // axle stub
    const ax = G.cyl(0.07, 0.07, xw - x0 + 0.03, 20);
    ax.rotateZ(Math.PI / 2);
    ax.translate(x0 + (xw - x0) / 2 + 0.02, R.wheelY, z);
    arms.push(ax);
  }
  parts.push(part(merge(arms), P.cast));
  // idler crank (track adjuster): boss on the hull side, crank to the idler axle, adjuster rod
  const cz = idlerZ - 0.2, cy = R.idlerY + 0.1;
  parts.push(part(G.cyl(0.1, 0.11, 0.05, 28), P.cast, { p: [x0 + 0.025, cy, cz], r: [0, 0, 90] }));
  const cl = Math.hypot(idlerZ - cz, R.idlerY - cy);
  const ca = Math.atan2(idlerZ - cz, R.idlerY - cy);
  parts.push(part(rb(0.06, cl + 0.12, 0.11, 0.02), P.cast, { p: [x0 + 0.075, (cy + R.idlerY) / 2, (cz + idlerZ) / 2], r: [(ca * 180) / Math.PI, 0, 0] }));
  const ix = R.trackX - R.tyreGap / 2 - R.tyreW;
  parts.push(part(G.cyl(0.06, 0.06, ix - x0 + 0.02, 20), P.cast, { p: [(x0 + ix) / 2, R.idlerY, idlerZ], r: [0, 0, 90] }));
  // adjuster screw housing running up to the nose
  parts.push(part(G.rod([x0 + 0.05, cy + 0.02, cz + 0.02], [x0 + 0.05, cy + 0.22, cz + 0.3], 0.028, 12), P.cast));
  parts.push(part(G.cyl(0.045, 0.045, 0.06, 12), P.cast, { p: [x0 + 0.05, cy + 0.24, cz + 0.33], r: [-34, 0, 0] }));
  // final drive housing between hull side and sprocket
  const xs = R.trackX - WIN.x - 0.04;
  parts.push(
    part(
      latheX([[0.0, 0.0], [0.22, 0.0], [0.23, 0.02], [0.215, 0.05], [0.16, 0.08], [0.13, xs - x0], [0.0, xs - x0]], 36, 30),
      P.cast,
      { p: [x0, R.sprocketY, R.sprocketZ] },
    ),
  );
  parts.push(part(G.scatter(G.boltHead(0.022, 0.012), ringX(0.2, 12, x0 + 0.02, 1).map((b) => ({ ...b, p: b.p.add(new THREE.Vector3(0, R.sprocketY, R.sprocketZ)) }))), P.cast));
  return group(parts);
}
