/**
 * Bren Mk II sling (B-frame, see dims.ts): khaki cotton web LMG sling with brass fittings.
 *  REAR:  the brass spring hook on the sling end hooks onto the sling loop on the RIGHT side of the butt.
 *  FRONT: the plain end loops "rifle fashion" round the cross-bar between the arms of the bipod sleeve
 *         and returns along the strap, held by a brass keeper and its claw tip.
 * The free length hangs as a catenary for the given gravity direction and is pushed to the right of
 * the butt, pistol grip, trigger group and body (common/sling.ts).
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V, basis } from '../common/geo';
import { hangStrap, strapGeo, tailPoints, frameAt, keeper, clawTip, box, type Box } from '../common/sling';
import type { UkwMats } from '../common/materials';
import { buttLoopBar } from './butt';
import { CROSS_BAR } from './barrel';

export const BREN_SLING_W = 0.025;
export const BREN_SLING_T = 0.002;

const OBSTACLES: Box[] = [
  // butt (right half), wrist, body, trigger group, pistol grip, guard, lower frame
  box([-0.022, -0.12, 0.0], [0.022, 0.002, 0.07]),
  box([-0.021, -0.1, 0.07], [0.021, 0.0, 0.12]),
  box([-0.019, -0.086, 0.12], [0.019, -0.01, 0.17]),
  box([-0.018, -0.072, 0.17], [0.018, -0.01, 0.236]),
  box([-0.026, -0.056, 0.236], [0.026, 0.03, 0.578]),
  box([-0.02, -0.072, 0.26], [0.02, -0.05, 0.402]),
  box([-0.017, -0.166, 0.282], [0.017, -0.066, 0.352]),
  box([-0.006, -0.105, 0.343], [0.006, -0.066, 0.396]),
  box([-0.016, -0.058, 0.578], [0.016, -0.02, 0.785]),
];

export function buildBrenSling(m: UkwMats, gravity: THREE.Vector3, slack: number): THREE.Group {
  const w = BREN_SLING_W, t = BREN_SLING_T;
  const g = gravity.clone().normalize();
  const out: THREE.Object3D[] = [];

  // ---- front: round the cross-bar (axis X); the main strap leaves the underside of the bar rearwards
  const cb = CROSS_BAR.c, barR = CROSS_BAR.r + t / 2 + 0.0002;
  const A = { p: cb.clone().add(V(0, -barR, 0)), dir: V(0, -0.35, -1).normalize(), n: V(0, -1, 0), lead: 0.012 };

  // ---- rear: brass spring hook on the butt loop; its eye carries the doubled strap end
  const bar = buttLoopBar();
  const toFront = A.p.clone().sub(bar).normalize();
  const h = toFront.clone().multiplyScalar(0.7).addScaledVector(g, 0.55).normalize();
  // keep the hook lying along the side of the butt (no x swing into the wood)
  h.x = Math.min(h.x, 0);
  h.normalize();
  const eye = bar.clone().addScaledVector(h, 0.034);
  const eyeN = V(-1, 0, 0).addScaledVector(h, -V(-1, 0, 0).dot(h)).normalize(); // face normal (out of the butt side)
  const B = { p: eye.clone(), dir: h.clone(), n: eyeN.clone(), lead: 0.014 };

  const path = hangStrap(A, B, { width: w, thickness: t, gravity: g, slack, obstacles: OBSTACLES, pushAxis: 0, pushSign: -1, twist: 0.07, sideHint: V(1, 0, 0) });
  out.push(part(strapGeo(path.P, path.N, w, t, 3), m.web));
  const L = path.total;

  // front wrap round the bar and the returning tail with keeper + claw tip
  {
    const P: THREE.Vector3[] = [], N: THREE.Vector3[] = [];
    for (let k = 0; k <= 14; k++) {
      const a = -Math.PI / 2 + (Math.PI * k) / 14; // bottom -> front -> top
      const n = V(0, Math.sin(a), Math.cos(a));
      P.push(cb.clone().addScaledVector(n, barR));
      N.push(n);
    }
    out.push(part(G.strap(P, w, t, N, { samples: 30 }), m.web));
    // the tail runs back on top of the main strap
    const side = path.at(0).n.dot(V(0, 1, 0)) >= 0 ? 1 : -1;
    const tailLen = 0.16;
    const tl = tailPoints(path, 0, tailLen, side, t, P[P.length - 1], 0.02);
    out.push(part(G.strap(tl.P, w, t, tl.N, { samples: 40 }), m.web));
    const f = path.at(tailLen - 0.012);
    const off = f.n.clone().multiplyScalar(side * (t + 0.0003));
    const z = f.t.clone().normalize();
    const y = f.n.clone().multiplyScalar(side);
    y.addScaledVector(z, -y.dot(z)).normalize();
    out.push(clawTip(basis(y.clone().cross(z).normalize(), y, z, f.p.clone().add(off)), w, t, m.brass, 0.02));
    out.push(keeper(frameAt(path, 0.07, side), w, t, 2, m.brass, 0.009, 0.0016));
  }

  // rear: strap doubled through the hook eye, stitched, with the brass hook on the butt loop
  {
    const side = 1;
    const tl = tailPoints(path, L, L - 0.05, side, t);
    out.push(part(G.strap(tl.P, w, t, tl.N, { samples: 20 }), m.web));
    // fold round the eye bar
    const fe = path.at(L);
    const P: THREE.Vector3[] = [], N: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const a = (Math.PI * k) / 10;
      const n = fe.n.clone().multiplyScalar(-Math.cos(a)).addScaledVector(fe.t, Math.sin(a));
      P.push(fe.p.clone().addScaledVector(fe.n, (t + 0.0003) / 2).addScaledVector(n, (t + 0.0003) / 2 + 0.0016));
      N.push(n);
    }
    out.push(part(G.strap(P, w, t, N, { samples: 20 }), m.web));
    // stitching box (darker thread lines) on the doubled end
    out.push(keeper(frameAt(path, L - 0.036, side), w, t, 2, m.brass, 0.008, 0.0015));
    // hook: eye frame across the strap + shank to the loop bar + J round the bar
    const zE = h.clone();
    const yE = eyeN.clone();
    const xE = yE.clone().cross(zE).normalize();
    const eyeM = basis(xE, yE, zE, eye.clone().addScaledVector(h, 0.0032));
    const hw = w / 2 + 0.0018;
    const ring: THREE.Vector3[] = [V(-hw, 0, -0.003), V(hw, 0, -0.003), V(hw, 0, 0.003), V(-hw, 0, 0.003)];
    out.push(part(G.tube([...ring, ring[0]].map((p) => p.clone().applyMatrix4(eyeM)), 0.0014, 6, 48), m.brass));
    const shank0 = V(0, 0, -0.003).applyMatrix4(eyeM);
    const barC = bar.clone();
    const hookPts = [
      shank0,
      shank0.clone().lerp(barC, 0.5).addScaledVector(yE, 0.0012),
      barC.clone().addScaledVector(h, 0.006).addScaledVector(yE, 0.001),
      barC.clone().add(V(0, -0.0034, 0)).addScaledVector(h, 0.001),
      barC.clone().add(V(0, 0, 0)).addScaledVector(h, -0.0036),
      barC.clone().add(V(0, 0.0038, 0)).addScaledVector(h, -0.0005),
      barC.clone().add(V(0, 0.0036, 0)).addScaledVector(h, 0.0042),
    ];
    out.push(part(G.tube(hookPts, 0.0019, 8, 50), m.brass));
    // spring gate closing the hook
    out.push(part(G.rod(barC.clone().addScaledVector(h, 0.012), barC.clone().add(V(0, 0.0032, 0)).addScaledVector(h, 0.0048), 0.0008, 6), m.brass));
  }
  const grp = group(out);
  grp.name = 'bren-sling';
  return grp;
}
