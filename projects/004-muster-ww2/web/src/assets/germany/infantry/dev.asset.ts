/** Hidden review sheet for the German infantry kit pieces (laid out flat, for close-up checks). */
import { THREE, group } from '../../../core/kit';
import type { AssetDef } from '../../../core/types';
import { k98Pouch, mp40Pouch, p38Holster, toolPouch } from './kit/pouches';
import { breadBag, gasMaskCanister, beltBuckle } from './kit/bags';
import { assaultPack } from './kit/aframe';
import { fieldCap } from './kit/cap';

const def: AssetDef = {
  id: 'de-infantry-dev',
  name: 'German Infantry Kit Sheet',
  subtitle: 'Internal test',
  faction: 'germany',
  category: 'Infantry',
  countAs: 'personnel',
  summary: 'Internal review sheet of the German infantry kit pieces.',
  facts: [],
  status: 'available',
  hidden: true,
  footprint: { w: 1.2, l: 0.4 },
  spacing: { default: 1.5, min: 1, max: 3 },
  maxQuantity: 1,
  options: [
    { kind: 'select', id: 'set', label: 'Set', default: 'belt', choices: [
      { id: 'belt', label: 'Belt pieces' },
      { id: 'back', label: 'Back pieces and cap' },
    ] },
  ],
  provenance: { method: 'test', author: 'Muster project', license: 'Project-owned', textures: 'Procedural', references: [] },
  build(cfg) {
    const items: THREE.Object3D[] = [];
    const put = (o: THREE.Object3D, x: number, y: number, ry = 0) => {
      const g = group([o], { p: [x, y, 0], r: [0, ry, 0] });
      items.push(g);
    };
    if (cfg.set === 'back') {
      put(assaultPack().object, -0.25, 0.3);
      put(gasMaskCanister().obj, 0.1, 0.25);
      put(fieldCap(), 0.35, 0.05);
    } else {
      put(k98Pouch(), -0.45, 0.12);
      put(mp40Pouch(), -0.2, 0.3);
      put(p38Holster(), 0.02, 0.12);
      put(toolPouch(), 0.22, 0.12);
      put(breadBag().obj, 0.5, 0.25);
      put(beltBuckle(), 0.0, 0.3);
    }
    const g = group(items);
    // stand everything on the ground
    const b = new THREE.Box3().setFromObject(g);
    g.position.y -= b.min.y;
    return g;
  },
};
export default def;
