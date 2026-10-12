/** Stielhandgranate 24 (Model 24 stick grenade) - standalone Equipment entry. */
import { group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { itemPlinth } from '../shared/display';
import { buildStickGrenadeAxial, M24 } from './gear/grenade';

const def: AssetDef = {
  id: 'de-stielhandgranate-24',
  name: 'Stielhandgranate 24',
  subtitle: 'Model 24 stick grenade',
  faction: 'germany',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary:
    'The standard German hand grenade of the Second World War: a sheet-steel head holding the explosive charge on a hollow wooden handle. ' +
    'Unscrewing the cap at the end of the handle exposed a porcelain bead on a pull cord that lit a friction igniter with a delay of several seconds.',
  facts: [
    { label: 'Service', value: '1924-1945' },
    { label: 'Length', value: 'approx. 36 cm' },
    { label: 'Head diameter', value: '70 mm' },
    { label: 'Weight', value: '595 g' },
    { label: 'Filling', value: '170 g TNT' },
    { label: 'Delay', value: '4-5 s friction igniter' },
  ],
  status: 'available',
  footprint: { w: 0.14, l: 0.42 },
  spacing: { default: 0.3, min: 0.15, max: 1.5 },
  maxQuantity: 60,
  view: { yaw: 50, pitch: 22 },
  order: 20,
  build() {
    const g = buildStickGrenadeAxial({ woodAxis: [0, 0, 1] });
    // lie it down (axis along +Z, head forward) resting on the head rim and the cap
    const zCap = 0.006, rCap = 0.0165;
    const zHead = M24.capLen + M24.handleLen + 0.02, rHead = M24.headR;
    const tilt = (Math.atan2(rHead - rCap, zHead - zCap) * 180) / Math.PI;
    const lying = group([g], { r: [90 - tilt, 0, 0] });
    return itemPlinth(group([lying]), 0.03);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Stielhandgranate_24',
      'https://en.wikipedia.org/wiki/Stielhandgranate',
      'https://ww2db.com/weapon.php?q=153',
    ],
    notes: 'Exterior only; stencilled instructions and maker stampings are omitted. No fragmentation sleeve fitted.',
  },
};
export default def;
