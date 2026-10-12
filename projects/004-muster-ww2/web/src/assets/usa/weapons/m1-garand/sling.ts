/**
 * M1907 two-piece leather rifle sling on the M1 Garand (G-frame, see dims.ts), 1.25 in wide.
 * Depicted in the usual carrying adjustment:
 *  FRONT: the long strap passes round the bar of the stock-ferrule swivel and is doubled back on its
 *         outer face; the doubled end is held by the front hook (frog), with a keeper next to the swivel.
 *  REAR:  the short strap passes round the butt-swivel bar and is doubled back and hooked the same way;
 *         the D-ring where short and long strap join sits a little ahead of it, with the second keeper.
 * Simplified: the adjustment holes are not modelled and the long/short strap junction is shown as a
 * D-ring with a short doubled tab, the free length hangs as one strap solved for gravity.
 */
import { THREE, part, group } from '../../../../core/kit';
import { V } from '../common/geo';
import { hangStrap, barEnd, mainLayerStart, wrapAroundBar, strapGeo, tailGeo, frameAt, keeper, m1907Hook, dRing, box, type Box } from '../common/sling';
import { SWIVELS, swivelBar } from './metal';
import type { GarandMats } from './materials';

export const M1907 = { width: 0.0318, thickness: 0.0034 };

/** Weapon body (G-frame) as boxes for the strap solver. */
const BODY: Box[] = [
  box([-0.022, -0.168, -0.5], [0.022, -0.03, -0.3]),
  box([-0.02, -0.106, -0.3], [0.02, -0.01, -0.214]),
  box([-0.007, -0.092, -0.216], [0.007, -0.06, -0.097]),
  box([-0.0225, -0.067, -0.214], [0.0225, 0.0, 0.02]),
  box([-0.021, -0.046, 0.02], [0.021, 0.017, 0.29]),
  box([-0.017, -0.036, 0.29], [0.017, 0.016, 0.612]),
];

export interface GarandSlingOptions {
  /** Extra obstacles (e.g. display cradles), weapon design frame. */
  extra?: Box[];
  /** Push direction for obstacle clearance (principal axis). Default -Y (away from the underside). */
  push?: THREE.Vector3;
}

export function buildGarandSling(m: GarandMats, gravity: THREE.Vector3, slack: number, o: GarandSlingOptions = {}): THREE.Group {
  const { width: w, thickness: t } = M1907;
  const out: THREE.Object3D[] = [];
  const up = V(0, 1, 0);
  const fe = barEnd(swivelBar(SWIVELS.front), V(1, 0, 0), SWIVELS.front.dir, SWIVELS.wire, up);
  const re = barEnd(swivelBar(SWIVELS.rear), V(1, 0, 0), SWIVELS.rear.dir, SWIVELS.wire, up);
  const A = mainLayerStart(fe, t, 0.01);
  const B = mainLayerStart(re, t, 0.01);
  const push = o.push ?? V(0, -1, 0);
  const path = hangStrap(A, B, {
    width: w,
    thickness: t,
    gravity: gravity.clone().normalize(),
    slack,
    obstacles: [...BODY, ...(o.extra ?? [])],
    push,
    twist: 0.08,
    sideHint: V(0, -1, 0),
  });
  out.push(part(strapGeo(path.P, path.N, w, t, 5), m.leather));
  const L = path.total;

  // ---- front end: wrap, doubled end with hook, keeper
  {
    const wrap = wrapAroundBar(fe, w, t, m.leather);
    out.push(wrap.mesh);
    const side = path.at(0).n.dot(fe.n) >= 0 ? -1 : 1;
    const tailEnd = 0.15;
    out.push(part(tailGeo(path, 0, tailEnd, side, w, t, wrap.tailStart, 0.02), m.leather));
    out.push(keeper(frameAt(path, 0.042, side), w, t, 2, m.leather, 0.013, 0.0022));
    out.push(m1907Hook(frameAt(path, tailEnd - 0.024, side), w, t, 2, m.brass));
  }
  // ---- rear end: wrap, doubled end with hook; D-ring junction and keeper ahead of it
  {
    const wrap = wrapAroundBar(re, w, t, m.leather);
    out.push(wrap.mesh);
    const side = path.at(L).n.dot(re.n) >= 0 ? -1 : 1;
    const tailEnd = L - 0.11;
    out.push(part(tailGeo(path, L, tailEnd, side, w, t, wrap.tailStart, 0.02), m.leather));
    // hook at the end of the doubled part: claws point along the tail (towards -s)
    const hm = frameAt(path, tailEnd + 0.024, side);
    hm.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    out.push(m1907Hook(hm, w, t, 2, m.brass));
    out.push(keeper(frameAt(path, L - 0.035, side), w, t, 2, m.leather, 0.013, 0.0022));
    // junction of the long and short strap: D-ring with the short strap's folded tab
    const sd = L - 0.25;
    out.push(part(tailGeo(path, sd, sd + 0.045, side, w, t), m.leather));
    const dm = frameAt(path, sd - 0.002, side);
    dm.multiply(new THREE.Matrix4().makeTranslation(0, t + 0.0012, 0));
    dm.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    out.push(dRing(dm, w, m.brass, 0.0022, 0.017));
  }
  const g = group(out);
  g.name = 'm1907-sling';
  return g;
}
