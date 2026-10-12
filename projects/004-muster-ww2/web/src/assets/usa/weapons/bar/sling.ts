/**
 * Cotton web sling on the BAR M1918A2 (B-frame, see dims.ts): olive-drab webbing, 1.25 in wide, of the
 * M1923 web rifle-sling pattern, between the swivel on the band just ahead of the hand guard and the
 * swivel under the butt. It hangs under the gun and passes below the magazine.
 *  FRONT: the web passes round the swivel bar and is doubled back and stitched, with a sliding keeper.
 *  REAR:  the web passes round the butt-swivel bar and runs back through the adjusting buckle; the
 *         free end carries a stamped metal tip.
 * The free length is solved as a strap hanging for the given gravity direction, pushed clear of the
 * gun body (boxes below) along one principal direction.
 */
import { THREE, part, group } from '../../../../core/kit';
import { V } from '../common/geo';
import { hangStrap, barEnd, mainLayerStart, wrapAroundBar, strapGeo, tailGeo, frameAt, keeper, webBuckle, webTip, stitchRow, box, type Box } from '../common/sling';
import { BSWIVELS, bSwivelBar } from './parts';
import { BD, BSTOCK } from './dims';
import type { BarMats } from './materials';
import type { BarBipod } from './bipod';

export const BAR_WEB = { width: 0.0318, thickness: 0.0022 };

/** Obstacle boxes of the gun body (B-frame). */
export function barBodyBoxes(bipod: BarBipod, magazine = true): Box[] {
  const b: Box[] = [
    box([-0.0225, BSTOCK.at(0.12).yBot - 0.0015, 0.12], [0.0225, -0.03, 0.2]),
    box([-0.0215, BSTOCK.at(0.2).yBot - 0.0015, 0.2], [0.0215, -0.02, 0.3]),
    box([-0.0195, BD.guardBot - 0.0025, 0.3], [0.0195, -0.03, BD.thFront]),
    box([-0.0195, BD.wellBot - 0.002, BD.thFront], [0.0195, -0.03, BD.rcvFront]),
    box([-0.0225, -0.0735, BD.rcvFront], [0.0225, -0.012, BD.hgFront + 0.002]),
  ];
  if (magazine) b.push(box([-0.0205, BD.magBot - 0.0035, 0.415], [0.0205, -0.03, BD.magZ1 + 0.003]));
  if (bipod === 'folded') {
    b.push(box([-0.046, -0.047, 0.8], [0.046, -0.012, 0.88]));
    b.push(box([-0.042, -0.045, 0.88], [0.042, -0.018, 1.15]));
  }
  return b;
}

export interface BarSlingOptions {
  extra?: Box[];
  push?: THREE.Vector3;
  bipod?: BarBipod;
  magazine?: boolean;
}

export function buildBarSling(m: BarMats, gravity: THREE.Vector3, slack: number, o: BarSlingOptions = {}): THREE.Group {
  const { width: w, thickness: t } = BAR_WEB;
  const out: THREE.Object3D[] = [];
  const up = V(0, 1, 0);
  const fe = barEnd(bSwivelBar(BSWIVELS.front), V(1, 0, 0), V(0, -0.15, -1), BSWIVELS.wire, up);
  const re = barEnd(bSwivelBar(BSWIVELS.rear), V(1, 0, 0), BSWIVELS.rear.dir, BSWIVELS.wire, up);
  const path = hangStrap(mainLayerStart(fe, t, 0.012), mainLayerStart(re, t, 0.01), {
    width: w,
    thickness: t,
    gravity: gravity.clone().normalize(),
    slack,
    obstacles: [...barBodyBoxes(o.bipod ?? 'folded', o.magazine !== false), ...(o.extra ?? [])],
    push: o.push ?? V(0, -1, 0),
    twist: 0.08,
    sideHint: V(0, -1, 0),
    samples: 72,
  });
  out.push(part(strapGeo(path.P, path.N, w, t, 5), m.web));
  const L = path.total;
  // front: doubled and stitched, keeper
  {
    const wrap = wrapAroundBar(fe, w, t, m.web);
    out.push(wrap.mesh);
    const side = path.at(0).n.dot(fe.n) >= 0 ? -1 : 1;
    out.push(part(tailGeo(path, 0, 0.075, side, w, t, wrap.tailStart, 0.016), m.web));
    for (const s of [0.052, 0.064]) out.push(stitchRow(frameAt(path, s, side), w, t, m.thread, 8, t + 0.0003));
    out.push(keeper(frameAt(path, 0.03, side), w, t, 2, m.web, 0.011, 0.0018));
  }
  // rear: through the adjusting buckle, free end with tip
  {
    const wrap = wrapAroundBar(re, w, t, m.web);
    out.push(wrap.mesh);
    const side = path.at(L).n.dot(re.n) >= 0 ? -1 : 1;
    const end = L - 0.19;
    out.push(part(tailGeo(path, L, end, side, w, t, wrap.tailStart, 0.016), m.web));
    out.push(webBuckle(frameAt(path, L - 0.048, side), w, t, 2, m.blackened));
    const tm = frameAt(path, end, side);
    tm.multiply(new THREE.Matrix4().makeTranslation(0, t + 0.0003, 0));
    tm.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    out.push(webTip(tm, w, t, m.blackened));
    out.push(keeper(frameAt(path, L - 0.12, side), w, t, 2, m.web, 0.011, 0.0018));
  }
  const g = group(out);
  g.name = 'bar-web-sling';
  return g;
}
