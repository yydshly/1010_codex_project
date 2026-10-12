/** Red Army rifleman, 1943-44: M43 uniform, Mosin-Nagant M1891/30 at order arms, field kit. */
import type { AssetDef } from '../../core/types';
import { buildSovietSoldier, constrainSoldier, soldierOptions, soldierProvenance } from './infantry/soldier';

const def: AssetDef = {
  id: 'su-rifleman',
  name: 'Rifleman (1943-44)',
  subtitle: 'Red Army infantry, Mosin-Nagant M1891/30',
  faction: 'soviet',
  category: 'Infantry',
  countAs: 'personnel',
  summary:
    'A Red Army rifleman in the 1943-pattern khaki uniform with the standing-collar gymnastyorka and shoulder boards, ' +
    'standing at order arms with his Mosin-Nagant M1891/30 rifle. Two leather M1937 cartridge pouches sit on the waist belt.',
  facts: [
    { label: 'Depicted', value: '1943-44' },
    { label: 'Primary weapon', value: 'Mosin-Nagant M1891/30 rifle' },
    { label: 'Uniform', value: 'M43 gymnastyorka, sharovary breeches' },
  ],
  status: 'available',
  footprint: { w: 0.6, l: 0.5 },
  spacing: { default: 1.1, min: 0.8, max: 3 },
  maxQuantity: 24,
  view: { yaw: 28, pitch: 8 },
  order: 10,
  options: soldierOptions('rifleman'),
  constrain: (cfg) => constrainSoldier('rifleman', cfg),
  build: (cfg, ctx) => buildSovietSoldier('rifleman', cfg, ctx),
  provenance: soldierProvenance(
    ['https://en.wikipedia.org/wiki/Mosin%E2%80%93Nagant'],
    'Figure, uniform and kit are simplified: one body type and face, one static pose; cloth folds are procedural. ' +
      'Weapon and gear pieces are the project\'s own models (soviet/weapons, soviet/gear).',
  ),
};

export default def;
