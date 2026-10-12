/**
 * 76 mm divisional gun M1942 (ZiS-3), Soviet Union.
 * Procedurally modelled; see ./zis-3/ for the part modules and dims.ts for the reference numbers.
 */
import type { AssetDef } from '../../core/types';
import { buildZis3 } from './zis-3/build';

const def: AssetDef = {
  id: 'su-zis3',
  name: 'ZiS-3',
  subtitle: '76 mm divisional gun M1942',
  faction: 'soviet',
  category: 'Artillery',
  countAs: 'artillery',
  summary:
    'Soviet 76.2 mm divisional field gun designed by V. G. Grabin at Artillery Factory No. 92. It mounted a barrel with a muzzle brake on the light split-trail carriage of the 57 mm ZiS-2, and was accepted into service after trials in February 1942. Shown in 4BO protective green.',
  facts: [
    { label: 'In service', value: 'From 1942 (Red Army)' },
    { label: 'Calibre', value: '76.2 mm' },
    { label: 'Breech', value: 'Semi-automatic vertical sliding wedge' },
    { label: 'Weight in action', value: '1,116 kg' },
    { label: 'Length (travelling)', value: '6,095 mm' },
    { label: 'Width (travelling)', value: '1,645 mm' },
    { label: 'Elevation / traverse', value: '-5 to +37 deg / 54 deg' },
    { label: 'Rate of fire', value: 'Up to 25 rounds per minute' },
    { label: 'Shield', value: '5 mm steel' },
  ],
  status: 'available',
  footprint: { w: 3.6, l: 5.8 },
  spacing: { default: 7.5, min: 4.5, max: 14 },
  maxQuantity: 12,
  options: [
    {
      kind: 'select',
      id: 'trails',
      label: 'Trails',
      choices: [
        { id: 'deployed', label: 'Deployed', note: 'Trails spread, spades on the ground, ready to fire' },
        { id: 'closed', label: 'Closed', note: 'Trails brought together for towing' },
      ],
      default: 'deployed',
    },
  ],
  build(config, ctx) {
    return buildZis3({ trails: config.trails === 'closed' ? 'closed' : 'deployed', detail: ctx.detail });
  },
  view: { yaw: 35, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/76_mm_divisional_gun_M1942_(ZiS-3)',
      'https://ru.wikipedia.org/wiki/76-%D0%BC%D0%BC_%D0%B4%D0%B8%D0%B2%D0%B8%D0%B7%D0%B8%D0%BE%D0%BD%D0%BD%D0%B0%D1%8F_%D0%BF%D1%83%D1%88%D0%BA%D0%B0_%D0%BE%D0%B1%D1%80%D0%B0%D0%B7%D1%86%D0%B0_1942_%D0%B3%D0%BE%D0%B4%D0%B0_(%D0%97%D0%98%D0%A1-3)',
      'https://broneboy.ru/%D0%BF%D1%80%D0%BE%D1%82%D0%B8%D0%B2%D0%BE%D1%82%D0%B0%D0%BD%D0%BA%D0%BE%D0%B2%D0%BE%D0%B5-%D0%BE%D1%80%D1%83%D0%B6%D0%B8%D0%B5/%D0%BF%D1%83%D1%88%D0%BA%D0%B8-%D0%B2-%D1%87%D0%B0%D1%81%D1%82%D1%8F%D1%85-%D0%B8%D0%BF%D1%82%D0%B0/76-%D0%BC%D0%BC-%D0%BF%D1%83%D1%88%D0%BA%D0%B0-%D0%B7%D0%B8%D1%81-3/',
    ],
    notes:
      'Travelling length and width match the published 6,095 x 1,645 mm; height about 1.37 m. Shown at 0 deg elevation. ' +
      'Simplified: internal breech, recoil and sight mechanisms are not modelled beyond their visible housings; ' +
      'the equilibrator columns, traversing gear and shield bracing follow the general arrangement rather than ' +
      'factory drawings; spades rest on the display surface instead of being dug in; no markings or serial plates.',
  },
  order: 20,
};

export default def;
