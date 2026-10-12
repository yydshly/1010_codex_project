/** German Army squad leader, 1943-44: M40 field tunic, MP 40 at the low ready, MP 40 magazine pouches, field kit. */
import type { AssetDef } from '../../core/types';
import { kitOptions, constrainKit, infantryBuild, PROVENANCE_BASE, REFERENCES, type KitDefaults } from './infantry/entry';

const D: KitDefaults = { headgear: 'helmet', pack: false, gasmask: false, breadbag: true, shovel: true, grenade: false };

const def: AssetDef = {
  id: 'de-squad-leader',
  name: 'Squad Leader (1943-44)',
  subtitle: 'German Army infantry, MP 40',
  faction: 'germany',
  category: 'Infantry',
  countAs: 'personnel',
  summary:
    'A German Army (Heer) squad leader in the field-grey M40 field tunic, holding his MP 40 submachine gun at the low ready. ' +
    'Two canvas MP 40 magazine pouches, each holding three magazines, hang from the belt either side of the buckle.',
  facts: [
    { label: 'Depicted', value: '1943-44' },
    { label: 'Primary weapon', value: 'MP 40 submachine gun' },
    { label: 'Uniform', value: 'M40 field tunic, marching boots' },
  ],
  status: 'available',
  footprint: { w: 0.6, l: 0.6 },
  spacing: { default: 1.1, min: 0.8, max: 3 },
  maxQuantity: 24,
  view: { yaw: 28, pitch: 8 },
  order: 20,
  options: kitOptions(D),
  constrain: (cfg) => constrainKit(cfg, D),
  build: infantryBuild('squad-leader', D),
  provenance: {
    ...PROVENANCE_BASE,
    references: [...REFERENCES, 'https://en.wikipedia.org/wiki/MP_40'],
    notes:
      'One body type and face, one static pose; cloth folds are procedural. The belt kit follows the standard 1939 ' +
      'arrangement in simplified form; items often carried by NCOs (binoculars, map case, whistle) are omitted. ' +
      'Weapon and gear pieces are the project\'s own models (germany/weapons, germany/gear). The national eagle is not depicted.',
  },
};

export default def;
