/**
 * Kar98k leather sling (K-frame, see stock.ts), carried on the rifle's LEFT side.
 *  FRONT: the strap passes through the swivel on the left of the lower band, wraps round the outer
 *         bar and is doubled back on itself, held by a two-headed stud and a leather keeper.
 *  REAR:  the strap goes up the left side of the butt, through the sling slot, down the right side,
 *         round the belly of the butt and is doubled back down along the strap, held by a steel
 *         slide buckle and a stud.
 * The free length hangs as a catenary for the given gravity direction (see common/sling.ts).
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V } from '../common/geo';
import { hangStrap, obbMinMax, strapGeo, tailGeo, frameAt, keeper, stud, slideBuckle, type Obb } from '../common/sling';
import { K } from './metal';
import { STOCK, sectionAt, secPoint, secNormal } from './stock';
import type { K98Mats } from './materials';

export const SLING_W = 0.031;
export const SLING_T = 0.0035;

const OBSTACLES: Obb[] = [
  obbMinMax([-0.0216, -0.16, -0.515], [0.0216, -0.027, -0.4]),
  obbMinMax([-0.0216, -0.133, -0.4], [0.0216, -0.022, -0.3]),
  obbMinMax([-0.0206, -0.107, -0.3], [0.0206, -0.012, -0.2]),
  obbMinMax([-0.02, -0.068, -0.2], [0.02, 0.012, -0.1]),
  obbMinMax([-0.007, -0.092, -0.168], [0.007, -0.058, -0.1]),
  obbMinMax([-0.0216, -0.063, -0.1], [0.0216, 0.018, 0.04]),
  obbMinMax([-0.0206, -0.034, 0.04], [0.0206, 0.02, 0.3]),
  obbMinMax([-0.019, -0.04, 0.3], [0.019, 0.019, 0.535]),
];

/** Point on the butt section at the slot station, offset outward by d, for parameter t. */
function buttPt(t: number, d: number): { p: THREE.Vector3; n: THREE.Vector3 } {
  const s = sectionAt(STOCK.slot.z);
  const [x, y] = secPoint(s, t), [nx, ny] = secNormal(s, t);
  return { p: V(x + nx * d, y + ny * d, STOCK.slot.z), n: V(nx, ny, 0) };
}

/** Parameter t on the left side (x > 0) of the slot station where the surface is at height y. */
function tAtY(y: number, left = true): number {
  const s = sectionAt(STOCK.slot.z);
  let lo = -Math.PI / 2, hi = Math.PI / 2;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (secPoint(s, mid)[1] < y) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return left ? t : Math.PI - t;
}

export function buildK98Sling(m: K98Mats, gravity: THREE.Vector3, slack: number): THREE.Group {
  const w = SLING_W, t = SLING_T;
  const out: THREE.Object3D[] = [];
  const off = t / 2 + 0.0003;

  // ---- front fitting: wrap round the swivel's outer bar (bar along Y, strap width along Y)
  const sw = K.swivel;
  const rw = sw.r + off;
  const zBack = sw.z - 0.007;
  const A = { p: V(sw.x - rw, sw.yC, zBack), dir: V(0, 0, -1), n: V(1, 0, 0), lead: 0.01 };

  // ---- rear fitting: loop round the belly bar through the slot (loop in the XY plane, width along Z)
  const sl = STOCK.slot;
  const tB = -0.62; // where the strap leaves the left side of the butt
  const b0 = buttPt(tB, off);
  // direction down the left face (decreasing t)
  const bm = buttPt(tB - 0.02, off).p, bp = buttPt(tB + 0.02, off).p;
  const bDir = bm.clone().sub(bp).normalize();
  const B = { p: b0.p.clone(), dir: bDir, n: b0.n.clone(), lead: 0.008 };

  const path = hangStrap(A, B, { width: w, thickness: t, gravity, slack, obstacles: OBSTACLES, push: V(1, 0, 0), twist: 0.07, sideHint: V(1, 0, 0) });
  out.push(part(strapGeo(path.P, path.N, w, t, 5), m.leather));

  // front wrap (half turn round the bar) and the doubled tail with stud and keeper
  {
    const pts: THREE.Vector3[] = [V(sw.x - rw, sw.yC, zBack)];
    const nr: THREE.Vector3[] = [V(-1, 0, 0)];
    for (let k = 0; k <= 12; k++) {
      const a = Math.PI - (Math.PI * k) / 12; // from the inner side round the front to the outer side
      pts.push(V(sw.x + rw * Math.cos(a), sw.yC, sw.z + rw * Math.sin(a)));
      nr.push(V(Math.cos(a), 0, Math.sin(a)));
    }
    pts.push(V(sw.x + rw, sw.yC, zBack));
    nr.push(V(1, 0, 0));
    out.push(part(G.strap(pts, w, t, nr, { samples: 40 }), m.leather));
    const start = V(sw.x + rw, sw.yC, zBack);
    out.push(part(tailGeo(path, 0, 0.078, 1, w, t, start, 0.022), m.leather));
    out.push(stud(frameAt(path, 0.036, 1), t, 2, m.slingSteel));
    out.push(keeper(frameAt(path, 0.06, 1), w, t, 2, m.leather));
  }

  // rear loop: up the left face, through the slot, down the right face, round the belly
  {
    const s = sectionAt(sl.z);
    const ySlotFloor = sl.y - sl.h / 2 + off - 0.0002;
    const tSlotL = tAtY(sl.y - sl.h / 2 - 0.0012, true);
    const tSlotR = Math.PI - tSlotL;
    const pts: THREE.Vector3[] = [], nr: THREE.Vector3[] = [];
    const add = (q: { p: THREE.Vector3; n: THREE.Vector3 }) => {
      pts.push(q.p);
      nr.push(q.n);
    };
    // left face from the exit point up to the slot's lower edge
    for (let k = 0; k <= 5; k++) add(buttPt(tB + ((tSlotL - tB) * k) / 5, off));
    // over the edge into the slot, lying on the bar of wood below the slot
    const xL = secPoint(s, tSlotL)[0], xR = -xL;
    add({ p: V(xL - 0.001, ySlotFloor + 0.0004, sl.z), n: V(0.6, 0.8, 0).normalize() });
    for (let k = 0; k <= 4; k++) add({ p: V(xL - 0.003 - ((xL - xR - 0.006) * k) / 4, ySlotFloor, sl.z), n: V(0, 1, 0) });
    add({ p: V(xR + 0.001, ySlotFloor + 0.0004, sl.z), n: V(-0.6, 0.8, 0).normalize() });
    // down the right face and round the belly to the left exit point (outside the main strap)
    const tEnd = 2 * Math.PI + tB;
    for (let k = 0; k <= 14; k++) {
      const tt = tSlotR + ((tEnd - tSlotR) * k) / 14;
      const q = buttPt(tt, off + (k === 14 ? t + 0.0003 : 0));
      add(q);
    }
    out.push(part(G.strap(pts, w, t, nr, { samples: 120 }), m.leather));
    const start = pts[pts.length - 1].clone();
    const L = path.total;
    // the solved face normal at the rear end may point into the stock: stack the tail outwards
    const sideR = path.at(L).n.dot(B.n) >= 0 ? 1 : -1;
    out.push(part(tailGeo(path, L, L - 0.062, sideR, w, t, start, 0.012), m.leather));
    out.push(slideBuckle(frameAt(path, L - 0.026, sideR), w, t, 2, m.slingSteel, 0.011));
    out.push(stud(frameAt(path, L - 0.045, sideR), t, 2, m.slingSteel));
  }
  const g = group(out);
  g.name = 'kar98k-sling';
  return g;
}

