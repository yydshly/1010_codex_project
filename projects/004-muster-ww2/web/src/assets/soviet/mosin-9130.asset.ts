/** Mosin-Nagant M1891/30 rifle - standalone catalog entry on the shared weapon display stand. */
import type { AssetDef } from '../../core/types';
import { buildMosin9130, mosinSectionLocal } from './weapons/mosin-9130.model';
import { presentOnStand } from './weapons/common/stand';

const def: AssetDef = {
  id: 'su-mosin-9130',
  name: 'Mosin-Nagant M1891/30',
  subtitle: 'Bolt-action rifle, 7.62 x 54 mmR',
  faction: 'soviet',
  category: 'Weapons',
  countAs: 'looseEquipment',
  summary:
    'The M1891/30 was the 1930 modernisation of the Russian Model 1891 infantry rifle, with a hooded post front sight, ' +
    'a tangent rear sight graduated in metres and, from 1935-36, a round receiver. It fed from a five-round integral ' +
    'box magazine and was the standard Soviet infantry rifle of the Second World War.',
  facts: [
    { label: 'Calibre', value: '7.62 x 54 mmR' },
    { label: 'Action', value: 'Bolt action' },
    { label: 'Magazine', value: '5-round integral box' },
    { label: 'Length', value: '1,232 mm (without bayonet)' },
    { label: 'Barrel', value: '730 mm' },
    { label: 'Weight', value: 'approx. 4.0 kg' },
    { label: 'Sights', value: 'Hooded post; tangent rear sight, 100-2,000 m' },
    { label: 'Produced', value: '1930-1945' },
  ],
  status: 'available',
  footprint: { w: 0.14, l: 1.26 },
  spacing: { default: 0.34, min: 0.2, max: 1.6 },
  maxQuantity: 40,
  view: { yaw: 40, pitch: 16 },
  order: 10,
  options: [
    {
      kind: 'select',
      id: 'bayonet',
      label: 'Bayonet',
      choices: [
        { id: 'none', label: 'None' },
        { id: 'fixed', label: 'Fixed', note: 'M1891/30 socket bayonet, cruciform blade' },
      ],
      default: 'none',
    },
    { kind: 'toggle', id: 'sling', label: 'Sling', default: true, note: 'Canvas sling on leather dog collars' },
  ],
  build(config) {
    const rifle = buildMosin9130({ bayonet: config.bayonet === 'fixed' ? 'fixed' : 'none' });
    const [rear, front] = rifle.restPoints;
    return presentOnStand(rifle, {
      rest: [
        { p: rear, contour: mosinSectionLocal(262) },
        { p: front, contour: mosinSectionLocal(985) },
      ],
      sling: config.sling !== false,
      slingSlack: 0.035,
      clearance: 0.02,
      overhang: 0.08,
    });
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Mosin%E2%80%93Nagant',
      'https://www.globalsecurity.org/military/world/russia/mosin-nagant.htm',
      'https://www.keepshooting.com/mosin-nagant-bayonet-m91-30.html',
      'https://www.sarcoinc.com/mosin-nagant-91-30-bayonet/',
      'https://oldsteelguns.com/store/mosin-nagant-91-30-sling-escutcheon/',
    ],
    notes:
      'Represents a wartime round-receiver M1891/30 with a birch stock, straight bolt handle and canvas sling on leather ' +
      'dog collars. Overall, barrel and bayonet lengths follow the references; stock profile heights and the exact sight, ' +
      'band and slot geometry are close approximations from photographs. The sling slots are shown as escutcheon-lined ' +
      'openings rather than fully cut through the stock. Arsenal stamps, serial numbers and the internal mechanism ' +
      '(firing pin, interrupter, extractor) are omitted.',
  },
};
export default def;
