/**
 * Sten Mk II sling (S-frame, see parts.ts): 3/4 in (19 mm) khaki cotton web strap with an adjustable
 * brass buckle at mid-length.
 *  FRONT: a steel wire loop sewn into the strap end hooks through a hole of the barrel sleeve (the
 *         rear hole of the lower-left row).
 *  REAR:  the strap is passed round the lower strut of the skeleton butt and through the brass loop on
 *         its end, making a tightening loop.
 * The free length hangs as a catenary for the given gravity direction, pushed clear of the trigger
 * housing, guard, magazine housing and magazine (common/sling.ts).
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V, RAD } from '../common/geo';
import { hangStrap, strapGeo, tailPoints, frameAt, keeper, box, type Box } from '../common/sling';
import type { UkwMats } from '../common/materials';
import { S, BUTT_R, lowerStrutAt } from './parts';

export const STEN_SLING_W = 0.019;
export const STEN_SLING_T = 0.0018;

const OBSTACLES: Box[] = [
  box([-0.021, -0.021, 0.0], [0.021, 0.021, 0.252]),
  box([-0.024, -0.024, 0.252], [0.024, 0.024, 0.346]),
  box([-0.0145, -0.0505, 0.019], [0.0145, 0.0, 0.226]),
  box([-0.006, -0.0625, 0.044], [0.006, -0.04, 0.101]),
  box([0.016, -0.0175, 0.267], [0.222, 0.0175, 0.34]),
  box([-0.021, -0.021, 0.346], [0.021, 0.021, 0.372]),
];

/** Front hook hole on the sleeve (weapon design frame). */
export function stenSlingHole(): THREE.Vector3 {
  const phi = 330 * RAD;
  return V(S.sleeve.R * Math.cos(phi), S.sleeve.R * Math.sin(phi), 0.3875);
}

/** Rear attachment: centre of the lower butt strut where the strap loops round it. */
export const STEN_SLING_REAR_Z = -0.121;

export function buildStenSling(m: UkwMats, gravity: THREE.Vector3, slack: number): THREE.Group {
  const w = STEN_SLING_W, t = STEN_SLING_T;
  const out: THREE.Object3D[] = [];

  // ---- front: wire loop hooked into the sleeve hole; the strap end is sewn round the loop's bar
  const hole = stenSlingHole();
  const radial = V(hole.x, hole.y, 0).normalize();
  const bar = hole.clone().addScaledVector(radial, 0.0075).add(V(0, -0.0085, -0.004));
  {
    const hw = w / 2 + 0.0012;
    // wire: bar across the strap end, two sides converging into the hole, tip turned inside
    const tip = hole.clone().addScaledVector(radial, -0.0012);
    const inner = hole.clone().addScaledVector(radial, -0.0045).add(V(0, 0, 0.0035));
    const wire = [
      bar.clone().add(V(0, 0, -hw)),
      bar.clone().add(V(0, 0, hw)),
      bar.clone().add(V(0, 0, hw)).lerp(tip, 0.55).add(V(0, 0, -0.002)),
      tip.clone().add(V(0, 0, 0.0012)),
      inner,
    ];
    out.push(part(G.tube(wire, 0.0011, 6, 60), m.blued));
    out.push(part(G.tube([bar.clone().add(V(0, 0, -hw)), bar.clone().add(V(0, 0, -hw)).lerp(tip, 0.55).add(V(0, 0, 0.002)), tip.clone().add(V(0, 0, -0.0012))], 0.0011, 6, 30), m.blued));
  }
  const barR = 0.0011 + t / 2 + 0.0002;
  const A = { p: bar.clone().add(V(0, -barR, 0)), dir: V(0, -0.5, -1).normalize(), n: V(0, -1, 0), lead: 0.012 };

  // ---- rear: loop round the lower strut
  const sc = lowerStrutAt(STEN_SLING_REAR_Z);
  const sd = lowerStrutAt(STEN_SLING_REAR_Z + 0.01).sub(sc).normalize();
  const loopR = BUTT_R + t / 2 + 0.0003;
  const down = V(0, -1, 0).addScaledVector(sd, -sd.y).normalize();
  const B = { p: sc.clone().addScaledVector(down, loopR + 0.0045), dir: V(0, -0.2, 1).normalize(), n: V(0, 1, 0), lead: 0.01 };

  const path = hangStrap(A, B, { width: w, thickness: t, gravity, slack, obstacles: OBSTACLES, pushAxis: 1, pushSign: -1, twist: 0.06, sideHint: V(1, 0, 0) });
  out.push(part(strapGeo(path.P, path.N, w, t, 3), m.web));
  const L = path.total;

  // front fold of the strap round the wire bar with a stitched box on the doubled end
  {
    const P: THREE.Vector3[] = [], N: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const a = -Math.PI / 2 + (Math.PI * k) / 10;
      const n = V(0, Math.sin(a), Math.cos(a));
      P.push(bar.clone().addScaledVector(n, barR));
      N.push(n);
    }
    out.push(part(G.strap(P, w, t, N, { samples: 24 }), m.web));
    const side = path.at(0).n.dot(V(0, 1, 0)) >= 0 ? 1 : -1;
    const tl = tailPoints(path, 0, 0.032, side, t, P[P.length - 1], 0.01);
    out.push(part(G.strap(tl.P, w, t, tl.N, { samples: 20 }), m.web));
  }
  // rear: loop round the strut, doubled end with the brass loop the main strap runs through
  {
    const e1 = V(1, 0, 0);
    const e2 = sd.clone().cross(e1).normalize();
    const P: THREE.Vector3[] = [], N: THREE.Vector3[] = [];
    for (let k = 0; k <= 20; k++) {
      const a = -Math.PI / 2 + (2 * Math.PI * k) / 20;
      const n = e2.clone().multiplyScalar(Math.sin(a)).addScaledVector(V(0, 0, 0).add(e2.clone().cross(sd)), Math.cos(a)).normalize();
      P.push(sc.clone().addScaledVector(n, loopR + (k / 20) * (t + 0.0003)));
      N.push(n);
    }
    void e1;
    out.push(part(G.strap(P, w, t, N.map((n) => n.clone()), { samples: 40 }), m.web));
    const side = path.at(L).n.dot(V(0, -1, 0)) >= 0 ? 1 : -1;
    const tl = tailPoints(path, L, L - 0.03, side, t, P[P.length - 1], 0.012);
    out.push(part(G.strap(tl.P, w, t, tl.N, { samples: 20 }), m.web));
    out.push(keeper(frameAt(path, L - 0.024, side), w, t, 2, m.brass, 0.009, 0.0016));
  }
  // adjustable buckle at mid-length with the doubled strap through it
  {
    const s0 = L * 0.52;
    const side = 1;
    const tl = tailPoints(path, s0 - 0.05, s0 + 0.02, side, t);
    out.push(part(G.strap(tl.P, w, t, tl.N, { samples: 20 }), m.web));
    out.push(keeper(frameAt(path, s0 - 0.003, side), w, t, 2, m.brass, 0.012, 0.0018));
    // centre bar of the buckle across the doubled strap
    const fb = frameAt(path, s0 - 0.003, side);
    const cb = new THREE.Mesh(G.rbox(w + 0.004, 0.0014, 0.0016, 0.0005, 1), m.brass);
    cb.applyMatrix4(fb.clone().multiply(new THREE.Matrix4().makeTranslation(0, t + 0.0012, 0)));
    out.push(cb);
  }
  const g = group(out);
  g.name = 'sten-sling';
  return g;
}
