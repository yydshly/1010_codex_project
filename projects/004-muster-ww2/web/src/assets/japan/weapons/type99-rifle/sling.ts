/**
 * Type 99 rifle leather sling (R-frame, see dims.ts), about 30 mm wide, between the two LEFT-side
 * swivels (lower band and butt). Depicted in a common carrying adjustment:
 *  FRONT: the strap passes round the lower-band swivel bar and is doubled back, held by a sewn loop and a
 *         leather keeper.
 *  REAR:  the strap passes round the butt-swivel bar, is doubled back through a steel frame buckle and
 *         its tip is held by a keeper.
 * Simplified: stitching, adjustment holes and the buckle tongue are not modelled; the free length hangs
 * as one strap solved for gravity.
 */
import { THREE, part, group } from '../../../../core/kit';
import { V } from '../common/geo';
import { hangStrap, barEnd, mainLayerStart, wrapAroundBar, strapGeo, tailGeo, frameAt, keeper, slideBuckle, box, type Box } from '../common/sling';
import { SWIVELS, swivelBar } from './metal';
import type { JpwMats } from '../common/materials';

export const T99_SLING = { width: 0.03, thickness: 0.0032 };

/** Rifle body (R-frame) as boxes for the strap solver. */
const BODY: Box[] = [
  box([-0.022, -0.156, -0.462], [0.022, -0.025, -0.26]),
  box([-0.019, -0.09, -0.26], [0.019, 0.0, -0.1]),
  box([-0.02, -0.066, -0.1], [0.02, 0.019, 0.04]),
  box([-0.019, -0.048, 0.04], [0.019, 0.017, 0.36]),
  box([-0.021, -0.041, 0.36], [0.021, 0.018, 0.4]),
  box([-0.017, -0.036, 0.4], [0.017, 0.016, 0.58]),
  box([-0.011, -0.03, 0.58], [0.011, 0.024, 0.66]),
];

export interface T99SlingOptions {
  /** Extra obstacles (e.g. display cradles), R-frame. */
  extra?: Box[];
  /** Push direction for obstacle clearance (principal axis). Default +X (the swivels are on the left). */
  push?: THREE.Vector3;
}

export function buildT99Sling(m: JpwMats, gravity: THREE.Vector3, slack: number, o: T99SlingOptions = {}): THREE.Group {
  const { width: w, thickness: t } = T99_SLING;
  const out: THREE.Object3D[] = [];
  const left = V(1, 0, 0);
  const fd = V(SWIVELS.front.dir.x, 0, SWIVELS.front.dir.z).normalize();
  const rd = V(SWIVELS.rear.dir.x, 0, SWIVELS.rear.dir.z).normalize();
  const fe = barEnd(swivelBar(SWIVELS.front), V(0, 1, 0), fd, SWIVELS.wire, left);
  const re = barEnd(swivelBar(SWIVELS.rear), V(0, 1, 0), rd, SWIVELS.wire, left);
  const A = mainLayerStart(fe, t, 0.008);
  const B = mainLayerStart(re, t, 0.008);
  const path = hangStrap(A, B, {
    width: w,
    thickness: t,
    gravity: gravity.clone().normalize(),
    slack,
    obstacles: [...BODY, ...(o.extra ?? [])],
    push: o.push ?? left,
    twist: 0.6,
    sideHint: V(0, 1, 0),
  });
  out.push(part(strapGeo(path.P, path.N, w, t, 5), m.leather));
  const L = path.total;
  // ---- front: wrap, doubled end, sewn loop + keeper
  {
    const wrap = wrapAroundBar(fe, w, t, m.leather);
    out.push(wrap.mesh);
    const side = path.at(0).n.dot(fe.n) >= 0 ? -1 : 1;
    const tailEnd = Math.min(0.1, L * 0.2);
    out.push(part(tailGeo(path, 0, tailEnd, side, w, t, wrap.tailStart, 0.018), m.leather));
    out.push(keeper(frameAt(path, 0.03, side), w, t, 2, m.leather, 0.011, 0.002));
    out.push(keeper(frameAt(path, tailEnd - 0.012, side), w, t, 2, m.leather, 0.014, 0.0022));
  }
  // ---- rear: wrap, doubled end through the frame buckle, keeper on the tip
  {
    const wrap = wrapAroundBar(re, w, t, m.leather);
    out.push(wrap.mesh);
    const side = path.at(L).n.dot(re.n) >= 0 ? -1 : 1;
    const tailEnd = L - Math.min(0.16, L * 0.3);
    out.push(part(tailGeo(path, L, tailEnd, side, w, t, wrap.tailStart, 0.018), m.leather));
    out.push(slideBuckle(frameAt(path, L - 0.05, side), w, t, 2, m.blackened, 0.014));
    out.push(keeper(frameAt(path, tailEnd + 0.018, side), w, t, 2, m.leather, 0.012, 0.002));
  }
  const g = group(out);
  g.name = 'type99-sling';
  return g;
}
