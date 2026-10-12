/** M1 steel helmet with liner, resting on its rim on the shared item plinth. */
import { group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { itemPlinth } from '../shared/display';
import { buildM1Helmet, m1RestPose, type ChinstrapMode } from './gear/helmet';

const def: AssetDef = {
  id: 'us-m1-helmet',
  name: 'M1 Steel Helmet',
  subtitle: 'Infantry steel helmet with liner',
  faction: 'usa',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary:
    'The US steel helmet adopted in 1941: a one-piece manganese-steel shell worn over a separate liner that carries the suspension, ' +
    'so the liner could be worn on its own. This 1944 example has the swivel chinstrap bails introduced in 1943 and a stainless-steel ' +
    'rim with its seam at the front; the liner\'s leather chinstrap is worn over the front brim.',
  facts: [
    { label: 'Adopted', value: '1941' },
    { label: 'Shell', value: 'Hadfield manganese steel, 1.1 mm' },
    { label: 'Size', value: 'approx. 280 x 240 mm, 180 mm deep' },
    { label: 'Weight', value: 'approx. 1.4 kg with liner' },
    { label: 'Finish', value: 'Flat olive drab paint with ground cork' },
  ],
  status: 'available',
  footprint: { w: 0.32, l: 0.44 },
  spacing: { default: 0.55, min: 0.38, max: 1.5 },
  maxQuantity: 40,
  options: [
    {
      kind: 'select',
      id: 'chinstrap',
      label: 'Chinstrap',
      default: 'laid',
      choices: [
        { id: 'laid', label: 'Laid out' },
        { id: 'none', label: 'Removed' },
      ],
    },
  ],
  view: { yaw: 35, pitch: 20, fit: 1.1 },
  order: 10,
  build(cfg) {
    const mode = (cfg.chinstrap === 'none' ? 'none' : 'laid') as ChinstrapMode;
    const rest = m1RestPose();
    const h = buildM1Helmet({ chinstrap: mode });
    const rested = group([h.object]);
    rested.rotation.x = -rest.tilt; // helmet frame -> rested frame (y' = y cos + z sin)
    return itemPlinth(group([rested]), 0.03);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/M1_helmet',
      'https://www.militarytrader.com/militaria-collectibles/wwii-era-m1-helmets-a-beginners-guide',
      'https://www.ima-usa.com/products/original-u-s-wwii-1944-m1-mccord-swivel-bale-front-seam-helmet-with-converted-paratrooper-liner',
    ],
    notes:
      'Shell outline built to the published 280 x 240 x 180 mm; the brim flare and rim-line curvature are estimated from photographs. ' +
      'The liner suspension is simplified (six straps, headband, nape strap; no size tabs or maker markings). The chinstrap hardware ' +
      '(buckle, hook, T1 release) is modelled in simplified form. No net, markings or unit insignia are shown.',
  },
};
export default def;
