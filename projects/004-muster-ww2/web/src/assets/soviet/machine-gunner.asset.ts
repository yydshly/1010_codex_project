/** Red Army DP-27 gunner, 1943-44: M43 uniform, DP-27 light machine gun carried on the shoulder, field kit. */
import type { AssetDef } from '../../core/types';
import { buildSovietSoldier, constrainSoldier, soldierOptions, soldierProvenance } from './infantry/soldier';

const def: AssetDef = {
  id: 'su-machine-gunner',
  name: 'DP-27 Gunner (1943-44)',
  subtitle: 'Red Army infantry, DP-27 light machine gun',
  faction: 'soviet',
  category: 'Infantry',
  countAs: 'personnel',
  summary:
    'A Red Army light machine gunner in the 1943-pattern khaki uniform, carrying his DP-27 over the right shoulder ' +
    'with the pan magazine fitted and the bipod folded.',
  facts: [
    { label: 'Depicted', value: '1943-44' },
    { label: 'Primary weapon', value: 'DP-27 light machine gun' },
    { label: 'Uniform', value: 'M43 gymnastyorka, sharovary breeches' },
  ],
  status: 'available',
  footprint: { w: 0.6, l: 0.9 },
  spacing: { default: 1.3, min: 0.9, max: 3.5 },
  maxQuantity: 24,
  view: { yaw: 28, pitch: 8 },
  order: 12,
  options: soldierOptions('mg'),
  constrain: (cfg) => constrainSoldier('mg', cfg),
  build: (cfg, ctx) => buildSovietSoldier('mg', cfg, ctx),
  provenance: soldierProvenance(
    ['https://en.wikipedia.org/wiki/Degtyaryov_machine_gun'],
    'Figure, uniform and kit are simplified: one body type and face, one static pose; cloth folds are procedural. ' +
      'Weapon and gear pieces are the project\'s own models (soviet/weapons, soviet/gear).',
  ),
};

export default def;
