/** Red Army glass water flask in its drawstring cloth cover - standalone Equipment entry. */
import type { AssetDef } from '../../core/types';
import { itemPlinth } from '../shared/display';
import { buildSovietCanteen } from './gear/canteen';

const def: AssetDef = {
  id: 'su-glass-flask',
  name: 'Glass Water Flask',
  subtitle: '0.75 l flask in cloth cover',
  faction: 'soviet',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary:
    'Standardised in 1931-32 alongside the aluminium flask, the 0.75-litre glass flask became the common Red Army type ' +
    'after the main aluminium flask production was halted in 1941. It was closed with a rubber plug tied to the neck and carried in a ' +
    'plain cloth bag, gathered at the neck by a drawstring, on a strap over the shoulder.',
  facts: [
    { label: 'Capacity', value: '0.75 l (1.0 l version also made)' },
    { label: 'Weight', value: 'approx. 450 g (glass flask only)' },
    { label: 'Closure', value: 'Rubber plug tied to the neck with a cord' },
    { label: 'Cover', value: 'Cloth bag with drawstring and shoulder strap' },
  ],
  status: 'available',
  footprint: { w: 0.32, l: 0.3 },
  spacing: { default: 0.45, min: 0.34, max: 1.2 },
  maxQuantity: 40,
  view: { yaw: 32, pitch: 18, fit: 1.05 },
  order: 30,
  build() {
    const c = buildSovietCanteen({ strap: 'display' });
    return itemPlinth(c.object, 0.025);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://sovietuniform.com/red-army-uniform-equipment-1941-1945/',
      'https://www.13thguardspoltavaskaya.com/equipment.html',
      'https://flyagi.livejournal.com/56754.html',
      'https://www.westwal.ru/flyazhka-steklyannaya-rkka',
    ],
    notes:
      'Exact flask dimensions were not found; body size (about 131 x 67 x 190 mm with the neck) is estimated from the 0.75 l ' +
      'capacity and period photographs. Cover patterns varied widely; a simple two-panel drawstring bag with a sewn-on ' +
      'cotton strap is shown. The glass body itself is hidden by the cover; only the neck and plug are modelled in detail.',
  },
};
export default def;
