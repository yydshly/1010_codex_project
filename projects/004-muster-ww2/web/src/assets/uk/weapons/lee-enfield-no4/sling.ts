/**
 * Rifle No. 4 Mk I web sling (R-frame, see stock.ts): British khaki cotton web rifle sling with brass
 * end fittings, carried on the UNDERSIDE between the front swivel (lower band) and the butt swivel.
 *  FRONT: the strap passes up through the swivel, round its bar and back along the outer face, where
 *         the brass claw tip hooks into the strap; a brass keeper holds the doubled end.
 *  REAR:  the same round the bar of the butt swivel.
 * The free length hangs as a catenary for the given gravity direction, pushed clear of the butt,
 * trigger guard, magazine and fore-end (common/sling.ts).
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V, basis } from '../common/geo';
import { hangStrap, strapGeo, tailPoints, frameAt, keeper, clawTip, box, type Box } from '../common/sling';
import type { UkwMats } from '../common/materials';
import { buttSwivel } from './stock';
import { bandSwivel } from './metal';

export const NO4_SLING_W = 0.03;
export const NO4_SLING_T = 0.0021;

const OBSTACLES: Box[] = [
  box([-0.023, -0.16, -0.492], [0.023, -0.03, -0.45]),
  box([-0.023, -0.148, -0.45], [0.023, -0.03, -0.425]),
  box([-0.022, -0.136, -0.39], [0.022, -0.03, -0.37]),
  box([-0.021, -0.126, -0.37], [0.021, -0.03, -0.33]),
  box([-0.02, -0.111, -0.33], [0.02, -0.03, -0.29]),
  box([-0.019, -0.099, -0.29], [0.019, -0.02, -0.25]),
  box([-0.018, -0.09, -0.25], [0.018, -0.02, -0.21]),
  box([-0.018, -0.074, -0.21], [0.018, -0.01, -0.168]),
  box([-0.006, -0.095, -0.168], [0.006, -0.05, -0.104]),
  box([-0.016, -0.0965, -0.107], [0.016, -0.04, -0.015]),
  box([-0.02, -0.057, -0.015], [0.02, 0.0, 0.1]),
  box([-0.02, -0.043, 0.1], [0.02, 0.0, 0.2]),
  box([-0.019, -0.038, 0.2], [0.019, 0.0, 0.28]),
];

/** Brass fitting frame on the tail layer: x = width, y = outward, z = pointing direction. */
function tipFrame(p: THREE.Vector3, t: THREE.Vector3, n: THREE.Vector3): THREE.Matrix4 {
  const z = t.clone().normalize();
  const y = n.clone().addScaledVector(z, -n.dot(z)).normalize();
  const x = y.clone().cross(z).normalize();
  return basis(x, y, z, p);
}

export function buildNo4Sling(m: UkwMats, gravity: THREE.Vector3, slack: number): THREE.Group {
  const w = NO4_SLING_W, t = NO4_SLING_T;
  const out: THREE.Object3D[] = [];
  const barR = 0.0019 + t / 2 + 0.0003;

  const fs = bandSwivel();
  const rs = buttSwivel();
  // front: strap leaves the top of the front bar towards the rear; rear: leaves the top of the rear bar forwards
  const A = { p: fs.bar.clone().add(V(0, barR, 0)), dir: V(0, -0.15, -1).normalize(), n: V(0, 1, 0), lead: 0.01 };
  const B = { p: rs.bar.clone().add(V(0, barR, 0)), dir: V(0, -0.1, 1).normalize(), n: V(0, 1, 0), lead: 0.01 };
  const path = hangStrap(A, B, { width: w, thickness: t, gravity, slack, obstacles: OBSTACLES, pushAxis: 1, pushSign: -1, twist: 0.08, sideHint: V(1, 0, 0) });
  out.push(part(strapGeo(path.P, path.N, w, t, 5), m.web));

  // the outer face of the free strap (away from the rifle) at each end
  const outer = (s: number, ref: THREE.Vector3) => (path.at(s).n.dot(ref) >= 0 ? 1 : -1);
  const wrap = (bar: THREE.Vector3, back: number) => {
    // half turn from the top of the bar, round its far side (along `back` in z), to its underside
    const P: THREE.Vector3[] = [], N: THREE.Vector3[] = [];
    for (let k = 0; k <= 14; k++) {
      const a = Math.PI / 2 - (Math.PI * k) / 14;
      const n = V(0, Math.sin(a), back * Math.cos(a));
      P.push(bar.clone().addScaledVector(n, barR));
      N.push(n);
    }
    return { P, N };
  };
  const L = path.total;
  const tailF = 0.085, tailR = 0.105;
  // front end
  {
    const wr = wrap(fs.bar, 1);
    out.push(part(G.strap(wr.P, w, t, wr.N, { samples: 36 }), m.web));
    const side = -outer(0, V(0, 1, 0));
    const tl = tailPoints(path, 0, tailF, side, t, wr.P[wr.P.length - 1], 0.02);
    out.push(part(G.strap(tl.P, w, t, tl.N, { samples: 40 }), m.web));
    const f = path.at(tailF - 0.01);
    const off = f.n.clone().multiplyScalar(side * (t + 0.0003));
    out.push(clawTip(tipFrame(f.p.clone().add(off), f.t, f.n.clone().multiplyScalar(side)), w, t, m.brass, 0.02));
    out.push(keeper(frameAt(path, 0.045, side), w, t, 2, m.brass, 0.0075));
  }
  // rear end
  {
    const wr = wrap(rs.bar, -1);
    out.push(part(G.strap(wr.P, w, t, wr.N, { samples: 36 }), m.web));
    const side = -outer(L, V(0, 1, 0));
    const tl = tailPoints(path, L, L - tailR, side, t, wr.P[wr.P.length - 1], 0.02);
    out.push(part(G.strap(tl.P, w, t, tl.N, { samples: 40 }), m.web));
    const f = path.at(L - tailR + 0.01);
    const off = f.n.clone().multiplyScalar(side * (t + 0.0003));
    out.push(clawTip(tipFrame(f.p.clone().add(off), f.t.clone().negate(), f.n.clone().multiplyScalar(side)), w, t, m.brass, 0.02));
    out.push(keeper(frameAt(path, L - 0.05, side), w, t, 2, m.brass, 0.0075));
  }
  const g = group(out);
  g.name = 'no4-sling';
  return g;
}
