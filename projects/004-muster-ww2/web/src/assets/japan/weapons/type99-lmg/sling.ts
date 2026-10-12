/**
 * Type 99 LMG canvas sling (L-frame), about 32 mm wide, between the LEFT-side swivels on the barrel-lock
 * nut and on the butt. Each end passes round its swivel bar and is doubled back; a steel frame buckle on
 * the rear doubled end and leather-bound keepers hold the ends. Simplified: stitching and adjustment
 * details are not modelled.
 */
import { THREE, part, group } from '../../../../core/kit';
import { V } from '../common/geo';
import { hangStrap, barEnd, mainLayerStart, wrapAroundBar, strapGeo, tailGeo, frameAt, keeper, slideBuckle, box, type Box } from '../common/sling';
import { LSWIVELS, lSwivelBar } from './parts';
import type { LmgBipod } from './bipod';
import type { JpwMats } from '../common/materials';

export const LMG_SLING = { width: 0.032, thickness: 0.0026 };

function bodyBoxes(bipod: LmgBipod, magazine: boolean): Box[] {
  const b: Box[] = [
    box([-0.022, -0.152, 0.0], [0.022, -0.018, 0.2]),
    box([-0.02, -0.1, 0.2], [0.02, -0.004, 0.3]),
    box([-0.028, -0.046, 0.296], [0.028, 0.03, 0.606]),
    box([-0.018, -0.165, 0.32], [0.018, -0.04, 0.45]),
    box([-0.024, -0.024, 0.606], [0.024, 0.024, 0.87]),
    box([-0.04, -0.01, 0.636], [0.0, 0.018, 0.78]),
    box([-0.016, -0.046, 0.87], [0.016, 0.018, 1.0]),
    box([-0.023, -0.023, 1.0], [0.023, 0.023, 1.182]),
    box([0.02, 0.012, 0.38], [0.048, 0.072, 0.43]),
  ];
  if (magazine) b.push(box([-0.013, 0.02, 0.44], [0.013, 0.23, 0.6]));
  if (bipod === 'folded') b.push(box([-0.03, -0.05, 0.6], [0.03, -0.02, 0.93]));
  else b.push(box([-0.12, -0.33, 0.88], [0.12, -0.02, 0.98]));
  return b;
}

export interface LmgSlingOptions {
  extra?: Box[];
  push?: THREE.Vector3;
  bipod?: LmgBipod;
  magazine?: boolean;
}

export function buildLmgSling(m: JpwMats, gravity: THREE.Vector3, slack: number, o: LmgSlingOptions = {}): THREE.Group {
  const { width: w, thickness: t } = LMG_SLING;
  const out: THREE.Object3D[] = [];
  const left = V(1, 0, 0);
  const fd = V(LSWIVELS.front.dir.x, 0, LSWIVELS.front.dir.z).normalize();
  const rd = V(LSWIVELS.rear.dir.x, 0, LSWIVELS.rear.dir.z).normalize();
  const fe = barEnd(lSwivelBar(LSWIVELS.front), V(0, 1, 0), fd, LSWIVELS.wire, left);
  const re = barEnd(lSwivelBar(LSWIVELS.rear), V(0, 1, 0), rd, LSWIVELS.wire, left);
  const path = hangStrap(mainLayerStart(fe, t, 0.008), mainLayerStart(re, t, 0.008), {
    width: w,
    thickness: t,
    gravity: gravity.clone().normalize(),
    slack,
    obstacles: [...bodyBoxes(o.bipod ?? 'folded', o.magazine !== false), ...(o.extra ?? [])],
    push: o.push ?? left,
    twist: 0.6,
    sideHint: V(0, 1, 0),
  });
  out.push(part(strapGeo(path.P, path.N, w, t, 5), m.canvas));
  const L = path.total;
  {
    const wrap = wrapAroundBar(fe, w, t, m.canvas);
    out.push(wrap.mesh);
    const side = path.at(0).n.dot(fe.n) >= 0 ? -1 : 1;
    const tailEnd = Math.min(0.09, L * 0.2);
    out.push(part(tailGeo(path, 0, tailEnd, side, w, t, wrap.tailStart, 0.018), m.canvas));
    out.push(keeper(frameAt(path, 0.028, side), w, t, 2, m.leather, 0.012, 0.002));
    out.push(keeper(frameAt(path, tailEnd - 0.01, side), w, t, 2, m.leather, 0.012, 0.002));
  }
  {
    const wrap = wrapAroundBar(re, w, t, m.canvas);
    out.push(wrap.mesh);
    const side = path.at(L).n.dot(re.n) >= 0 ? -1 : 1;
    const tailEnd = L - Math.min(0.15, L * 0.3);
    out.push(part(tailGeo(path, L, tailEnd, side, w, t, wrap.tailStart, 0.018), m.canvas));
    out.push(slideBuckle(frameAt(path, L - 0.045, side), w, t, 2, m.blackened, 0.014));
    out.push(keeper(frameAt(path, tailEnd + 0.016, side), w, t, 2, m.leather, 0.012, 0.002));
  }
  const g = group(out);
  g.name = 'type99-lmg-sling';
  return g;
}
