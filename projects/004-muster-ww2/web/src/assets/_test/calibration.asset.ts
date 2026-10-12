/** Hidden calibration asset: material swatches + SDF sanity check. Not shown in the library. */
import { THREE, M, G, S, sdfMesh, part, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';

const def: AssetDef = {
  id: 'test-calibration',
  name: 'Material Calibration',
  subtitle: 'Internal test',
  faction: 'germany',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary: 'Internal material and mesher calibration object.',
  facts: [],
  status: 'available',
  hidden: true,
  footprint: { w: 2, l: 1 },
  spacing: { default: 2.5, min: 2, max: 5 },
  maxQuantity: 4,
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project',
    author: 'Project team',
    license: 'Project-owned',
    textures: 'Procedural (generated in code)',
    references: [],
  },
  build() {
    const swatches: [string, THREE.Material][] = [
      ['paint', M.paint(0x9a8a60)],
      ['gunSteel', M.gunSteel()],
      ['wood', M.wood()],
      ['leather', M.leather()],
      ['wool', M.wool(0x5d6150)],
      ['cotton', M.cotton(0x8a7f5d)],
      ['canvas', M.canvas(0x7f7556)],
      ['steel', M.steel()],
    ];
    const parts: THREE.Object3D[] = [];
    swatches.forEach(([, mat], i) => {
      const x = (i % 4) * 0.45 - 0.675;
      const z = Math.floor(i / 4) * 0.45 - 0.225;
      parts.push(part(G.rbox(0.3, 0.2, 0.3, 0.02, 3), mat, { p: [x, 0.1, z] }));
      parts.push(part(new THREE.SphereGeometry(0.08, 32, 16), mat, { p: [x, 0.28, z] }));
    });
    const blob = sdfMesh(
      S.smin(S.sphere([0, 0.12, 0], 0.1), S.capsule([-0.1, 0.05, 0], [0.1, 0.2, 0], 0.04), 0.05),
      { min: [-0.2, -0.02, -0.15], max: [0.2, 0.3, 0.15] },
      0.006,
    );
    parts.push(part(blob, M.skin(), { p: [0.95, 0.0, 0] }));
    parts.push(part(new THREE.SphereGeometry(0.1, 32, 16), M.glass(), { p: [0.95, 0.35, 0] }));
    return group(parts);
  },
};
export default def;
