/**
 * Cotton web sling on the Thompson M1A1 (T-frame, see dims.ts): olive-drab webbing, 1.25 in wide,
 * of the M1923 web rifle-sling pattern, between the swivel under the front of the horizontal fore-grip
 * and the swivel under the butt.
 *  FRONT: the web passes round the swivel bar and is doubled back and stitched, with a sliding keeper.
 *  REAR:  the web passes round the butt-swivel bar and runs back through the adjusting buckle; the
 *         free end carries a stamped metal tip.
 * The free length hangs as a strap solved for gravity; stitching is shown as thread bars.
 */
import { THREE, part, group } from '../../../../core/kit';
import { V } from '../common/geo';
import { hangStrap, barEnd, mainLayerStart, wrapAroundBar, strapGeo, tailGeo, frameAt, keeper, webBuckle, webTip, stitchRow, box, type Box } from '../common/sling';
import { TSWIVELS, tSwivelBar, magBottom, type ThompsonMagazine } from './parts';
import { TD } from './dims';
import type { ThompsonMats } from './materials';

export const WEB = { width: 0.0318, thickness: 0.0022 };

function body(mag: ThompsonMagazine): Box[] {
  const b: Box[] = [
    box([-0.021, -0.148, 0.0], [0.021, 0.006, 0.262]),
    box([-0.0175, -0.047, 0.262], [0.0175, 0.022, 0.557]),
    box([-0.017, -0.148, 0.255], [0.017, -0.04, 0.33]),
    box([-0.006, -0.074, 0.325], [0.006, -0.045, 0.416]),
    box([-0.018, -0.041, 0.562], [0.018, 0.012, 0.728]),
    box([-0.012, -0.012, 0.728], [0.012, 0.036, 0.812]),
  ];
  if (mag !== 'none') b.push(box([-0.0135, magBottom(mag) - 0.004, TD.magZ0 - 0.002], [0.0135, -0.02, TD.magZ1 + 0.002]));
  return b;
}

export interface ThompsonSlingOptions {
  extra?: Box[];
  push?: THREE.Vector3;
}

export function buildThompsonSling(m: ThompsonMats, mag: ThompsonMagazine, gravity: THREE.Vector3, slack: number, o: ThompsonSlingOptions = {}): THREE.Group {
  const { width: w, thickness: t } = WEB;
  const out: THREE.Object3D[] = [];
  const up = V(0, 1, 0);
  const fe = barEnd(tSwivelBar(TSWIVELS.front), V(1, 0, 0), TSWIVELS.front.dir, TSWIVELS.wire, up);
  const re = barEnd(tSwivelBar(TSWIVELS.rear), V(1, 0, 0), TSWIVELS.rear.dir, TSWIVELS.wire, up);
  const path = hangStrap(mainLayerStart(fe, t, 0.01), mainLayerStart(re, t, 0.01), {
    width: w,
    thickness: t,
    gravity: gravity.clone().normalize(),
    slack,
    obstacles: [...body(mag), ...(o.extra ?? [])],
    push: o.push ?? V(0, -1, 0),
    twist: 0.08,
    sideHint: V(0, -1, 0),
    samples: 64,
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
    const end = L - 0.175;
    out.push(part(tailGeo(path, L, end, side, w, t, wrap.tailStart, 0.016), m.web));
    out.push(webBuckle(frameAt(path, L - 0.045, side), w, t, 2, m.blackened));
    const tm = frameAt(path, end, side);
    tm.multiply(new THREE.Matrix4().makeTranslation(0, t + 0.0003, 0));
    tm.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    out.push(webTip(tm, w, t, m.blackened));
    out.push(keeper(frameAt(path, L - 0.11, side), w, t, 2, m.web, 0.011, 0.0018));
  }
  const g = group(out);
  g.name = 'thompson-web-sling';
  return g;
}
