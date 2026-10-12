/**
 * Running gear for one side (the tank's left, +X): five double road wheels (cast, dished, with
 * partial ribbing, holes round the hub and perforated solid rubber tyres), the cast fully-ribbed
 * front idler with its 10-bolt hub cap and crank, the rear cast drive sprocket with six rollers and
 * reinforcing rings, suspension arms and the final drive housing.
 *
 * Wheel-local frame: axle along +X (outwards), origin at the centre of the wheel PAIR.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { R, H } from './dims';
import type { Pal } from './palette';
import { perforatedDisc, sectorOutline } from './util';

/** lathe around +Y (profile [r, y]) turned so that its axis is +X */
function latheX(profile: G.V2[], seg = 48, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateZ(-Math.PI / 2);
  return g;
}
/** disc in XY plane -> axis along +X */
function discX(g: THREE.BufferGeometry, x: number): THREE.BufferGeometry {
  g.rotateY(Math.PI / 2);
  g.translate(x, 0, 0);
  return g;
}

/* --------------------------------- road wheel ------------------------------------------- */

/** One wheel of the pair, outer face towards +X. x0 = inner edge of the tyre, x1 = outer edge. */
function singleRoadWheel(P: Pal, detailed: boolean): THREE.Group {
  const g0 = R.tyreGap / 2, g1 = g0 + R.tyreW; // 0.055 .. 0.205
  const Rt = R.wheelR, rSeat = 0.334;
  const parts: THREE.Object3D[] = [];
  // tyre: tread band + seat band full width, recessed outer sidewall behind a perforated skin
  const sw = g1 - 0.02; // recessed sidewall plane
  parts.push(
    part(
      latheX(
        [
          [rSeat, g0 + 0.004],
          [0.36, g0],
          [Rt - 0.03, g0],
          [Rt - 0.006, g0 + 0.008],
          [Rt, g0 + 0.022],
          [Rt, g1 - 0.022],
          [Rt - 0.006, g1 - 0.008],
          [Rt - 0.02, g1],
          [0.398, g1],
          [0.396, sw],
          [0.35, sw],
          [0.348, g1],
          [rSeat + 0.004, g1],
          [rSeat, g1 - 0.004],
          [rSeat, g0 + 0.004],
        ],
        64,
        35,
      ),
      P.rubber,
    ),
  );
  // perforated sidewall skin (the characteristic holes of the solid tyre)
  parts.push(
    part(
      discX(perforatedDisc(0.397, 0.349, 0.02, [{ r: 0.0105, at: 0.3735, count: 26, seg: 8 }], 64, 0.003), sw + 0.01),
      P.rubber,
    ),
  );
  // steel rim under the tyre with a lip on the outer face
  parts.push(
    part(
      latheX(
        [
          [0.3, g0 + 0.005],
          [rSeat + 0.001, g0 + 0.005],
          [rSeat + 0.001, g1 - 0.006],
          [0.341, g1 - 0.004],
          [0.341, g1 + 0.004],
          [0.33, g1 + 0.008],
          [0.305, g1 + 0.004],
          [0.3, g0 + 0.005],
        ],
        56,
        35,
      ),
      P.cast,
    ),
  );
  // dished cast disc: from the rim, dishing inwards to a flat hole band round the hub
  const dishIn = g0 + 0.07; // hub band mid plane
  const dA: G.V2 = [0.205, dishIn + 0.011], dB: G.V2 = [0.292, g1 - 0.004]; // outer dish surface line (r, x)
  parts.push(
    part(
      latheX(
        [
          [0.2, dishIn - 0.011],
          [0.302, g1 - 0.034],
          [0.306, g1 - 0.014],
          [0.3, g1 - 0.004],
          dB,
          [0.215, dishIn + 0.014],
          [0.2, dishIn + 0.011],
          [0.2, dishIn - 0.011],
        ],
        56,
        30,
      ),
      P.cast,
    ),
  );
  // hole band (6 holes round the hub)
  parts.push(part(discX(perforatedDisc(0.2, 0.095, 0.022, [{ r: 0.034, at: 0.148, count: 6, phase: Math.PI / 6, seg: 14 }], 48, 0.003), dishIn - 0.011), P.cast));
  // hub boss, hub cap and bolts
  parts.push(
    part(
      latheX(
        [
          [0.0, g0 - 0.02],
          [0.098, g0 - 0.02],
          [0.098, dishIn + 0.03],
          [0.088, dishIn + 0.04],
          [0.078, dishIn + 0.042],
          [0.078, dishIn + 0.07],
          [0.07, dishIn + 0.078],
          [0.045, dishIn + 0.078],
          [0.04, dishIn + 0.09],
          [0.0, dishIn + 0.092],
        ],
        40,
        35,
      ),
      P.cast,
    ),
  );
  if (detailed) {
    const bolts = G.scatter(
      G.boltHead(0.02, 0.012),
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return { p: [dishIn + 0.078, Math.sin(a) * 0.058, Math.cos(a) * 0.058] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
      }),
    );
    parts.push(part(bolts, P.cast));
    // partial ribbing: 6 full-length ribs between the holes (hub to rim) + 6 short ribs on the dish
    const ribs: THREE.BufferGeometry[] = [];
    const dr = dB[0] - dA[0], dx = dB[1] - dA[1];
    const dl = Math.hypot(dr, dx);
    const slope = Math.atan2(dx, dr);
    const nr = -dx / dl, nx = dr / dl; // outward normal of the dish surface in (r, x)
    for (let i = 0; i < 12; i++) {
      // long ribs sit between the hub holes (holes at 30 + k*60 deg)
      const a = (i / 12) * Math.PI * 2 + Math.PI / 6;
      const long = i % 2 === 0;
      if (long) {
        const rb = G.rbox(0.018, 0.106, 0.016, 0.004, 1);
        rb.translate(dishIn + 0.011 + 0.008, 0.149, 0);
        rb.rotateX(-a);
        ribs.push(rb.toNonIndexed());
      }
      // rib along the dish cone (short ribs stop half way: "partial ribbing")
      const t0 = long ? 0.0 : 0.45;
      const len = dl * (1 - t0) - 0.004;
      const rd = G.rbox(0.016, len, 0.016, 0.004, 1);
      rd.rotateZ(-slope);
      const tm = t0 + (1 - t0) / 2;
      const rMid = dA[0] + dr * tm + nr * 0.007;
      const xMid = dA[1] + dx * tm + nx * 0.007;
      rd.translate(xMid, rMid, 0);
      rd.rotateX(-a);
      ribs.push(rd.toNonIndexed());
    }
    parts.push(part(G.mergeGeometries(ribs.map((r) => r.toNonIndexed()))!, P.cast));
  }
  return group(parts);
}

let wheelCache: THREE.Group | null = null;
/** Double road wheel (pair) in wheel-local frame. */
export function roadWheelPair(P: Pal): THREE.Group {
  const outer = singleRoadWheel(P, true);
  const inner = singleRoadWheel(P, false);
  inner.scale.x = -1; // mirrored inner wheel (dish facing the hull)
  // spacer between the two discs (hub), no parts in the guide-horn gap beyond r = 0.1
  const hub = part(G.cyl(0.095, 0.095, R.tyreGap + 0.04, 32), P.cast, { r: [0, 0, 90] });
  const g = group([outer, inner, hub]);
  wheelCache = g;
  return g;
}

/* ----------------------------------- idler ---------------------------------------------- */

export function idler(P: Pal): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const rimR = R.idlerR;
  const one = (outerSide: boolean) => {
    const s: THREE.Object3D[] = [];
    // rim (the track rolls on it)
    s.push(
      part(
        latheX(
          [
            [rimR - 0.035, 0.05],
            [rimR, 0.052],
            [rimR, 0.118],
            [rimR - 0.006, 0.124],
            [rimR - 0.035, 0.124],
            [rimR - 0.035, 0.05],
          ],
          56,
          35,
        ),
        P.cast,
      ),
    );
    // web
    s.push(
      part(
        latheX(
          [
            [0.08, 0.07],
            [rimR - 0.03, 0.074],
            [rimR - 0.03, 0.098],
            [0.08, 0.108],
            [0.08, 0.07],
          ],
          48,
          35,
        ),
        P.cast,
      ),
    );
    // full ribbing: 10 radial ribs on the outer face of the web
    const ribs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.1;
      const rb = G.box(0.03, rimR - 0.035 - 0.08, 0.02);
      rb.translate(0.112, (rimR - 0.035 + 0.08) / 2, 0);
      rb.rotateX(a);
      ribs.push(rb.toNonIndexed());
    }
    s.push(part(G.mergeGeometries(ribs)!, P.cast));
    // hub boss
    s.push(
      part(
        latheX(
          [
            [0.0, 0.03],
            [0.085, 0.03],
            [0.085, 0.13],
            [0.075, 0.138],
            [0.0, 0.138],
          ],
          32,
          35,
        ),
        P.cast,
      ),
    );
    if (outerSide) {
      // hub cap with 10 bolts
      s.push(part(latheX([[0.0, 0.138], [0.068, 0.138], [0.068, 0.158], [0.058, 0.168], [0.0, 0.17]], 32, 35), P.cast));
      s.push(
        part(
          G.scatter(
            G.boltHead(0.017, 0.01),
            Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              return { p: [0.138, Math.sin(a) * 0.076, Math.cos(a) * 0.076] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
            }),
          ),
          P.cast,
        ),
      );
    }
    return group(s);
  };
  const o = one(true);
  const i = one(false);
  i.scale.x = -1;
  parts.push(o, i, part(G.cyl(0.075, 0.075, 0.12, 24), P.cast, { r: [0, 0, 90] }));
  return group(parts);
}

/* ---------------------------------- sprocket -------------------------------------------- */

/** Rear drive sprocket; rollers at angles 30 + k*60 deg in the (z, y) plane before rotation. */
export function sprocket(P: Pal): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const rim = R.sprocketR;
  const one = (outerSide: boolean) => {
    const s: THREE.Object3D[] = [];
    // rim ring the track rides on (with reinforcing ring)
    s.push(
      part(
        latheX(
          [
            [rim - 0.04, 0.05],
            [rim, 0.052],
            [rim, 0.118],
            [rim - 0.008, 0.126],
            [rim - 0.03, 0.126],
            [rim - 0.034, 0.134],
            [rim - 0.05, 0.134],
            [rim - 0.054, 0.12],
            [rim - 0.04, 0.05],
          ],
          64,
          35,
        ),
        P.cast,
      ),
    );
    // web with six large mud-exit holes
    s.push(
      part(
        discX(perforatedDisc(rim - 0.035, 0.1, 0.026, [{ r: 0.058, at: 0.2, count: 6, phase: 0, seg: 16 }], 64, 0.004), 0.088),
        P.cast,
      ),
    );
    // inner reinforcing ring round the hub
    s.push(part(latheX([[0.1, 0.1], [0.13, 0.1], [0.13, 0.118], [0.12, 0.126], [0.1, 0.126]], 40, 35), P.cast));
    // hub
    s.push(part(latheX([[0.0, 0.04], [0.105, 0.04], [0.105, 0.14], [0.095, 0.15], [0.0, 0.15]], 36, 35), P.cast));
    if (outerSide) {
      s.push(part(latheX([[0.0, 0.15], [0.078, 0.15], [0.078, 0.172], [0.066, 0.182], [0.0, 0.184]], 32, 35), P.cast));
      s.push(
        part(
          G.scatter(
            G.boltHead(0.018, 0.011),
            Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return { p: [0.15, Math.sin(a) * 0.09, Math.cos(a) * 0.09] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
            }),
          ),
          P.cast,
        ),
      );
    }
    return group(s);
  };
  const o = one(true), i = one(false);
  i.scale.x = -1;
  parts.push(o, i);
  // six rollers between the discs
  const rollers: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 6; k++) {
    const a = ((30 + k * 60) * Math.PI) / 180;
    const r = G.lathe([[0.0, -0.075], [0.03, -0.075], [0.042, -0.06], [0.042, 0.06], [0.03, 0.075], [0.0, 0.075]], 16, 40);
    r.rotateZ(-Math.PI / 2);
    r.translate(0, Math.sin(a) * 0.268, Math.cos(a) * 0.268);
    rollers.push(r.toNonIndexed());
  }
  parts.push(part(G.mergeGeometries(rollers)!, P.track));
  parts.push(part(G.cyl(0.09, 0.09, 0.12, 24), P.cast, { r: [0, 0, 90] }));
  return group(parts);
}

/* ------------------------------ suspension & housings ----------------------------------- */

/** Suspension arms, idler crank, final drive housing, bump stops (left side, hull frame). */
export function suspension(P: Pal, idlerZ: number): THREE.Group {
  const parts: THREE.Object3D[] = [];
  const x0 = H.xL; // hull side face
  const xw = R.trackX - R.tyreGap / 2 - R.tyreW - 0.015; // just inside the inner tyre
  for (let i = 0; i < 5; i++) {
    const z = R.wheelZ[i];
    // Christie balance arm: pivot above and ahead of the axle (front wheel: vertical spring), trailing to the wheel
    const pz = z + (i === 0 ? 0.0 : 0.2), py = R.wheelY + 0.2;
    const len = Math.hypot(pz - z, py - R.wheelY);
    const angle = Math.atan2(pz - z, py - R.wheelY);
    const w = xw - x0;
    parts.push(part(G.rbox(w, len + 0.14, 0.13, 0.02, 2), P.cast, { p: [x0 + w / 2, (py + R.wheelY) / 2, (pz + z) / 2], r: [(angle * 180) / Math.PI, 0, 0] }));
    // pivot boss on the hull side
    parts.push(part(G.cyl(0.085, 0.095, 0.03, 24), P.cast, { p: [x0 + 0.015, py, pz], r: [0, 0, 90] }));
    // axle stub
    parts.push(part(G.cyl(0.06, 0.06, xw - x0 + 0.04, 20), P.cast, { p: [x0 + w / 2 + 0.02, R.wheelY, z], r: [0, 0, 90] }));
  }
  // idler crank (track tensioner): boss on the hull, crank arm to the idler axle
  const cz = idlerZ - 0.18, cy = R.idlerY + 0.1;
  parts.push(part(G.cyl(0.1, 0.11, 0.05, 28), P.cast, { p: [x0 + 0.025, cy, cz], r: [0, 0, 90] }));
  const cl = Math.hypot(idlerZ - cz, R.idlerY - cy);
  const ca = Math.atan2(idlerZ - cz, R.idlerY - cy);
  parts.push(part(G.rbox(0.06, cl + 0.12, 0.11, 0.02, 2), P.cast, { p: [x0 + 0.075, (cy + R.idlerY) / 2, (cz + idlerZ) / 2], r: [(ca * 180) / Math.PI, 0, 0] }));
  parts.push(part(G.cyl(0.065, 0.065, R.trackX - 0.12 - x0 + 0.02, 20), P.cast, { p: [(x0 + R.trackX - 0.12) / 2, R.idlerY, idlerZ], r: [0, 0, 90] }));
  // final drive housing (cast) between hull and sprocket
  parts.push(
    part(
      latheX([[0.0, 0.0], [0.2, 0.0], [0.21, 0.02], [0.2, 0.06], [0.15, 0.1], [0.12, 0.148], [0.0, 0.148]], 36, 30),
      P.cast,
      { p: [x0, R.sprocketY, R.sprocketZ] },
    ),
  );
  parts.push(
    part(
      G.scatter(
        G.boltHead(0.02, 0.012),
        Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return { p: [x0 + 0.02, R.sprocketY + Math.sin(a) * 0.185, R.sprocketZ + Math.cos(a) * 0.185] as G.V3, n: [1, 0, 0] as G.V3, spin: a };
        }),
      ),
      P.cast,
    ),
  );
  return group(parts);
}

export { sectorOutline, mirrorX };
