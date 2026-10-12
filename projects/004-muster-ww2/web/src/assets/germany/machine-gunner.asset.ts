/** German Army MG 42 gunner, 1943-44: M40 field tunic, MG 42 at the low ready, P38 holster and MG tool pouch, field kit. */
import type { AssetDef } from '../../core/types';
import { kitOptions, constrainKit, infantryBuild, PROVENANCE_BASE, REFERENCES, type KitDefaults } from './infantry/entry';

const D: KitDefaults = { headgear: 'helmet', pack: false, gasmask: false, breadbag: true, shovel: true, grenade: false };

const def: AssetDef = {
  id: 'de-machine-gunner',
  name: 'MG 42 Gunner (1943-44)',
  subtitle: 'German Army infantry, MG 42',
  faction: 'germany',
  category: 'Infantry',
  countAs: 'personnel',
  summary:
    'A German Army (Heer) machine gunner in the field-grey M40 field tunic, holding the MG 42 at the hip. Instead of ' +
    'rifle ammunition pouches he carries a pistol holster and the leather MG tool pouch on the belt.',
  facts: [
    { label: 'Depicted', value: '1943-44' },
    { label: 'Primary weapon', value: 'MG 42 machine gun' },
    { label: 'Uniform', value: 'M40 field tunic, marching boots' },
  ],
  status: 'available',
  footprint: { w: 0.7, l: 0.9 },
  spacing: { default: 1.3, min: 0.9, max: 3 },
  maxQuantity: 24,
  view: { yaw: 28, pitch: 8 },
  order: 30,
  options: kitOptions(D),
  constrain: (cfg) => constrainKit(cfg, D),
  build: infantryBuild('machine-gunner', D),
  provenance: {
    ...PROVENANCE_BASE,
    references: [...REFERENCES, 'https://en.wikipedia.org/wiki/MG_42'],
    notes:
      'One body type and face, one static pose; cloth folds are procedural. The tool pouch and holster are simplified ' +
      'external shapes (contents not modelled). Weapon and gear pieces are the project\'s own models ' +
      '(germany/weapons, germany/gear). The national eagle is not depicted.',
  },
};

export default def;
