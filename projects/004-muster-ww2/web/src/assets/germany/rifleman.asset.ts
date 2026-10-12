/** German Army rifleman, 1943-44: M40 field tunic, Kar98k at order arms, K98 cartridge pouches, field kit. */
import type { AssetDef } from '../../core/types';
import { kitOptions, constrainKit, infantryBuild, PROVENANCE_BASE, REFERENCES, type KitDefaults } from './infantry/entry';

const D: KitDefaults = { headgear: 'helmet', pack: false, gasmask: false, breadbag: true, shovel: true, grenade: false };

const def: AssetDef = {
  id: 'de-rifleman',
  name: 'Rifleman (1943-44)',
  subtitle: 'German Army infantry, Kar98k',
  faction: 'germany',
  category: 'Infantry',
  countAs: 'personnel',
  summary:
    'A German Army (Heer) rifleman in the field-grey M40 field tunic and marching boots, standing at order arms with his ' +
    'Kar98k rifle. Two triple K98 cartridge pouches sit on the belt, supported by leather Y-straps.',
  facts: [
    { label: 'Depicted', value: '1943-44' },
    { label: 'Primary weapon', value: 'Kar98k rifle' },
    { label: 'Uniform', value: 'M40 field tunic, marching boots' },
  ],
  status: 'available',
  footprint: { w: 0.6, l: 0.5 },
  spacing: { default: 1.1, min: 0.8, max: 3 },
  maxQuantity: 24,
  view: { yaw: 28, pitch: 8 },
  order: 10,
  options: kitOptions(D),
  constrain: (cfg) => constrainKit(cfg, D),
  build: infantryBuild('rifleman', D),
  provenance: {
    ...PROVENANCE_BASE,
    references: [...REFERENCES, 'https://en.wikipedia.org/wiki/Karabiner_98k'],
    notes:
      'One body type and face, one static pose; cloth folds are procedural. The belt kit follows the standard 1939 ' +
      'arrangement in simplified form (e.g. the gas-mask sling routing and the assault-pack bag contents are generalised). ' +
      'The Y-straps pass under the tunic shoulder straps. Weapon and gear pieces are the project\'s own models ' +
      '(germany/weapons, germany/gear). The national eagle is not depicted on the cap or tunic.',
  },
};

export default def;
