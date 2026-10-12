/** Red Army submachine gunner, 1943-44: M43 uniform, PPSh-41 at the low ready, magazine pouch, field kit. */
import type { AssetDef } from '../../core/types';
import { buildSovietSoldier, constrainSoldier, soldierOptions, soldierProvenance } from './infantry/soldier';

const def: AssetDef = {
  id: 'su-submachine-gunner',
  name: 'Submachine Gunner (1943-44)',
  subtitle: 'Red Army infantry, PPSh-41',
  faction: 'soviet',
  category: 'Infantry',
  countAs: 'personnel',
  summary:
    'A Red Army submachine gunner in the 1943-pattern khaki uniform, holding his PPSh-41 at the low ready. ' +
    'The magazine pouch on his belt matches the chosen magazine: a canvas drum pouch, or pouches for the curved box magazines.',
  facts: [
    { label: 'Depicted', value: '1943-44' },
    { label: 'Primary weapon', value: 'PPSh-41 submachine gun' },
    { label: 'Uniform', value: 'M43 gymnastyorka, sharovary breeches' },
  ],
  status: 'available',
  footprint: { w: 0.6, l: 0.6 },
  spacing: { default: 1.1, min: 0.8, max: 3 },
  maxQuantity: 24,
  view: { yaw: 28, pitch: 8 },
  order: 11,
  options: soldierOptions('smg'),
  constrain: (cfg) => constrainSoldier('smg', cfg),
  build: (cfg, ctx) => buildSovietSoldier('smg', cfg, ctx),
  provenance: soldierProvenance(
    ['https://en.wikipedia.org/wiki/PPSh-41'],
    'Figure, uniform and kit are simplified: one body type and face, one static pose; cloth folds are procedural. ' +
      'Weapon and gear pieces are the project\'s own models (soviet/weapons, soviet/gear).',
  ),
};

export default def;
