/**
 * Il-2 assembly: body-frame parts pitched to the three-point attitude, gear built in the asset
 * frame down to y = 0, footprint centred on the origin.
 */
import * as THREE from 'three';
import { group, boundsOf } from '../../../core/kit';
import { D, B } from './dims';
import { SEC } from './shape';
import { palette } from './paint';
import { buildFuselage } from './fuselage';
import { buildCanopy } from './canopy';
import { buildWing } from './wing';
import { buildTail } from './tail';
import { buildProp } from './prop';
import { buildGear } from './gear';

export interface Il2Options {
  rails: boolean;
}

export function buildIl2(opts: Il2Options): THREE.Object3D {
  const pal = palette();
  const body = group([
    buildFuselage(pal).object,
    buildCanopy(pal),
    buildWing(pal, { rails: opts.rails }),
    buildTail(pal),
    buildProp(pal),
  ], { name: 'body' });

  // three-point attitude: tail-wheel strut attachment height fixes the vertical offset
  const th = D.theta;
  const tailBot = SEC.bot(D.tailAttach.s) + 0.03;
  const tb = B(0, tailBot, D.tailAttach.s);
  const ty = D.tailTyre.r - D.tailTyre.flat + D.tailLeg - (tb.y * Math.cos(th) + tb.z * Math.sin(th));
  const M = new THREE.Matrix4().makeTranslation(0, ty, 0).multiply(new THREE.Matrix4().makeRotationX(-th));
  body.rotation.x = -th;
  body.position.y = ty;
  const toAsset = (v: THREE.Vector3) => v.clone().applyMatrix4(M);

  const root = group([body, buildGear(pal, toAsset, tailBot)], { name: 'il-2' });
  const b = boundsOf(root);
  root.position.z = -(b.min.z + b.max.z) / 2;
  root.position.x = -(b.min.x + b.max.x) / 2;
  return group([root]);
}
