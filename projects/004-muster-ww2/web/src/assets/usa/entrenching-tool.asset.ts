/** M1943 folding entrenching tool with its carrier - standalone Equipment entry on the item plinth. */
import { THREE, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { itemPlinth } from '../shared/display';
import { buildM1943Carrier, buildM1943Tool } from './gear/etool';
import { restRollZ, restPitchX } from './gear/parts';

const def: AssetDef = {
  id: 'us-m1943-entrenching-tool',
  name: 'M1943 Entrenching Tool',
  subtitle: 'Folding shovel with carrier',
  faction: 'usa',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary:
    'The folding entrenching tool adopted by the US Army in 1943, patterned on the German folding spade: a square steel blade on a ' +
    'wooden handle, locked by a large threaded nut straight as a shovel, at a right angle as a pick, or folded for carrying. It was ' +
    'carried in a canvas carrier with a top flap, hooked to the belt or pack by the M1910 wire hanger.',
  facts: [
    { label: 'Adopted', value: '1943' },
    { label: 'Length', value: 'approx. 71 cm extended, 53 cm folded' },
    { label: 'Blade', value: 'approx. 15 x 20 cm' },
    { label: 'Handle', value: 'One-piece wood' },
    { label: 'Carrier', value: 'Cotton duck, lift-the-dot flap, M1910 hanger' },
  ],
  status: 'available',
  footprint: { w: 0.3, l: 0.62 },
  spacing: { default: 0.55, min: 0.35, max: 1.8 },
  maxQuantity: 40,
  options: [
    {
      kind: 'select',
      id: 'display',
      label: 'Display',
      default: 'carrier',
      choices: [
        { id: 'carrier', label: 'Folded, in carrier' },
        { id: 'apart', label: 'Extended beside its carrier' },
      ],
    },
  ],
  view: { yaw: 35, pitch: 32, fit: 1.05 },
  order: 40,
  build(cfg) {
    const apart = cfg.display === 'apart';
    // lie the carrier on its back (handle side down), handle towards +Z
    const lay = (o: THREE.Object3D, roll = false, com?: THREE.Vector3) => {
      o.rotation.x = -Math.PI / 2; // tool frame: -Z (blade side) up, -Y (handle) towards +Z
      const r = group([o]);
      const g = group([r]);
      // the carrier rocks on the handle ridge: roll it onto one long edge
      if (roll) restRollZ(r);
      // a loose tool settles on its nut and blade tip (centre of mass near the hinge)
      if (com) restPitchX(r, com);
      g.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(g, true);
      r.position.y -= b.min.y;
      return g;
    };
    if (!apart) {
      const car = buildM1943Carrier({ tool: true });
      const holder = group([car.object]);
      holder.rotation.y = Math.PI; // blade side up after laying down
      const g = lay(holder, true);
      return itemPlinth(group([g]), 0.035);
    }
    // apart: both lie back side up (hanger and eyelets, blade rib and socket plate on show)
    const car = buildM1943Carrier({ tool: false });
    const holderC = group([car.object]);
    const gc = lay(holderC);
    gc.position.set(-0.11, 0, -0.1);
    const tool = buildM1943Tool({ state: 'extended' });
    const holderT = group([tool]);
    // centre of mass of the extended tool, near the hinge (tool -Y maps to +Z here)
    const gt = lay(holderT, false, new THREE.Vector3(0, 0, 0.01));
    gt.rotation.y = 0.12;
    gt.position.set(0.1, 0, -0.1);
    // drop both to the same floor
    const items = group([gc, gt]);
    return itemPlinth(items, 0.035);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://www.ima-usa.com/products/original-u-s-wwii-m1943-entrenching-tool-shovel-with-canvas-carrier',
      'https://www.ima-usa.com/products/original-u-s-wwii-m1943-entrenching-tool-shovel-canvas-cover-carrier',
      'https://whatpriceglory.com/products/1927-us-m1943-entrenching-tool-carrier-first-version/',
      'http://www.vietnamgear.com/kit.aspx?kit=36',
      'https://en.wikipedia.org/wiki/Entrenching_tool',
    ],
    notes:
      'Dimensions from collector descriptions (28 in extended, 21 in folded, blade about 6 x 8 in, carrier about 10 x 7 in). ' +
      'Blade outline, hinge fork and locking nut are simplified from photographs. The carrier is the 1944 type with three pairs of ' +
      'hanger eyelets; maker and date stamps are omitted.',
  },
};
export default def;
