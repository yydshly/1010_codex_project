/** Entrenching tool with bayonet - standalone Equipment entry. */
import { group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { itemPlinth } from '../shared/display';
import { buildEntrenchingTool } from './gear/shovel';

const def: AssetDef = {
  id: 'de-entrenching-tool',
  name: 'Entrenching Tool with Bayonet',
  subtitle: 'Kleines Schanzzeug and S84/98 III bayonet',
  faction: 'germany',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary:
    'The straight-handled small entrenching tool, a pre-war pattern that remained in use throughout the war alongside the folding shovel introduced in 1938. ' +
    'It is carried in a black pressed-board carrier on the belt, with the S84/98 bayonet in its steel scabbard and leather frog bound to the handle by the carrier strap.',
  facts: [
    { label: 'Length', value: 'approx. 55 cm (shovel)' },
    { label: 'Blade', value: 'approx. 14.5 x 18.5 cm' },
    { label: 'Carrier', value: 'Presstoff (pressed board), leather loops and strap' },
    { label: 'Bayonet', value: 'S84/98 III, blade approx. 25 cm' },
  ],
  status: 'available',
  footprint: { w: 0.24, l: 0.64 },
  spacing: { default: 0.5, min: 0.3, max: 2 },
  maxQuantity: 40,
  view: { yaw: 30, pitch: 30 },
  order: 40,
  build() {
    const t = buildEntrenchingTool({ slantDeg: 0, woodAxis: [0, 0, 1] });
    // lay it on its back: gear +Z (outer face) up, handle towards +Z
    const flat = group([t.object], { r: [-90, 0, 0] });
    return itemPlinth(group([flat]), 0.03);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://www.mp44.nl/equipment/entrenching_tool.htm',
      'https://www.ima-usa.com/products/original-german-wwii-square-head-entrenching-tool-with-pressstoff-carrier-by-cottbusser-lederwarenwerk-curt-vogel-dated-1943-schanzzeug',
      'https://www.ima-usa.com/products/german-wwii-square-head-entrenching-tool-schanzzeug',
    ],
    notes: 'Carrier maker stampings omitted; the bayonet blade is not modelled (it stays in the scabbard). Frog simplified to sleeve, belt tab and hilt strap.',
  },
};
export default def;
