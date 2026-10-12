/** Hidden smoke test for geometry helpers. Not shown in the library. */
import { THREE, M, G, part, group, mirrorX } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { weaponStand } from '../shared/display';
import type { WeaponModel } from '../shared/contracts';

const def: AssetDef = {
  id: 'test-helpers',
  name: 'Helper Smoke Test',
  subtitle: 'Internal test',
  faction: 'germany',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary: 'Internal helper test.',
  facts: [],
  status: 'available',
  hidden: true,
  footprint: { w: 2, l: 2 },
  spacing: { default: 2.5, min: 2, max: 5 },
  maxQuantity: 4,
  provenance: { method: 'test', author: 'test', license: 'test', textures: 'test', references: [] },
  build() {
    const paint = M.paint(0x8f7d56);
    const parts: THREE.Object3D[] = [];
    // side-view plate (zy): a sloped armour plate profile, thickness along X
    parts.push(part(G.plate([[-0.4, 0], [0.4, 0], [0.3, 0.3], [-0.3, 0.3]], 0.03, 'zy', 0.004), paint, { p: [0.6, 0, 0] }));
    // top-view plate (xz)
    parts.push(part(G.plate([[-0.2, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]], 0.02, 'xz', 0.003, 0.03), paint, { p: [-0.6, 0.01, 0] }));
    // strap arc
    parts.push(part(G.strap([[-0.3, 0.05, 0.6], [0, 0.4, 0.6], [0.3, 0.05, 0.6]], 0.04, 0.004, [0, 0, 1]), M.leather(), {}));
    // loft
    const secs = [0, 0.2, 0.4, 0.6].map((z, i) => ({ z, ring: G.superRing(0.1 + i * 0.02, 0.08, 24, 3) }));
    parts.push(part(G.loftZ(secs), M.aluminium(), { p: [0, 0.12, -0.7] }));
    // mirrored extrude
    parts.push(mirrorX(part(G.extrude([[0, 0], [0.1, 0], [0.1, 0.2], [0, 0.25]], 0.05, 0.005), paint, { p: [0.25, 0, -0.2] })));
    // stand with a dummy weapon (bore along +Z, origin at grip)
    const gun = group([
      part(G.rod([0, 0.03, -0.3], [0, 0.03, 0.6], 0.012, 16), M.gunSteel()),
      part(G.rbox(0.04, 0.07, 0.45, 0.01, 3), M.wood(), { p: [0, -0.01, -0.3] }),
    ]);
    const w: WeaponModel = {
      id: 'dummy',
      object: gun,
      grips: {
        trigger: { position: new THREE.Vector3(), axis: new THREE.Vector3(0, 0, 1), palm: new THREE.Vector3(-1, 0, 0), radius: 0.02 },
        support: { position: new THREE.Vector3(0, 0.03, 0.3), axis: new THREE.Vector3(0, 0, 1), palm: new THREE.Vector3(0, -1, 0), radius: 0.015 },
      },
      muzzle: new THREE.Vector3(0, 0.03, 0.6),
      length: 1.1,
      restPoints: [new THREE.Vector3(0, -0.045, -0.35), new THREE.Vector3(0, 0.018, 0.35)],
    };
    parts.push(group([weaponStand(w)], { p: [0, 0, 1.2] }));
    return group(parts);
  },
};
export default def;
