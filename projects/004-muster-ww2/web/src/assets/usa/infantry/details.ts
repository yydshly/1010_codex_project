/**
 * Small garment details the shared UniformSpec does not cover:
 *  - the M1941 jacket's two slash hand pockets: a welted opening at each front hip, running from
 *    low towards the front up towards the side (conforming strips on the jacket surface).
 */
import * as THREE from 'three';
import { G } from '../../../core/kit';
import type { SoldierBuild } from '../../shared/human/soldier';
import { clothMaterial } from '../../shared/human/uniform';
import { JACKET_CLOTH } from './uniform';

export function jacketDetails(sol: SoldierBuild): THREE.Object3D[] {
  const fit = sol.fit;
  const out: THREE.Object3D[] = [];
  const mat = clothMaterial(JACKET_CLOTH);
  for (const s of [1, -1]) {
    const a = fit.surfacePoint({ angle: s * 25, height: 0.845 }).position;
    const b = fit.surfacePoint({ angle: s * 43, height: 0.955 }).position;
    const path = fit.strapPath([a, a.clone().lerp(b, 0.5), b], 0.0014, { samples: 16, tension: 0.4 });
    const geo = G.strap(path.points, 0.011, 0.0022, path.normals, { smooth: false });
    const m = new THREE.Mesh(geo, mat);
    m.name = `slash-pocket-${s > 0 ? 'l' : 'r'}`;
    out.push(m);
  }
  return out;
}
