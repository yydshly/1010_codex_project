/** British Army infantry, NW Europe 1944: Section Leader (1944) - see ./infantry/soldier.ts. */
import type { AssetDef } from '../../core/types';
import { buildBritishSoldier, constrainSoldier, soldierOptions, soldierProvenance } from './infantry/soldier';

const def: AssetDef = {
  id: 'uk-section-leader',
  name: 'Section Leader (1944)',
  subtitle: 'British infantry, Sten Mk II',
  faction: 'uk',
  category: 'Infantry',
  countAs: 'personnel',
  summary:
    'A British infantry section leader of 1944 in the 1937-pattern Battledress and web equipment in battle order, carrying the Sten Mk II submachine gun; the Rifle No. 4 can be chosen instead, as many section commanders carried one.',
  facts: [
    { label: 'Depicted', value: 'NW Europe, 1944' },
    { label: 'Primary weapon', value: 'Sten Mk II (9 mm)' },
    { label: 'Uniform', value: 'Battledress, 1937 pattern' },
    { label: 'Equipment', value: 'Web Equipment, 1937 pattern' },
  ],
  status: 'available',
  footprint: { w: 0.6, l: 0.5 },
  spacing: { default: 1.1, min: 0.8, max: 3 },
  maxQuantity: 24,
  view: { yaw: 28, pitch: 8 },
  order: 11,
  options: soldierOptions('leader'),
  constrain: (cfg) => constrainSoldier('leader', cfg),
  build: (cfg, ctx) => buildBritishSoldier('leader', cfg, ctx),
  provenance: soldierProvenance(
    ['https://en.wikipedia.org/wiki/Sten', 'https://en.wikipedia.org/wiki/Lee%E2%80%93Enfield'],
    "Figure, uniform and web equipment are simplified: one body type and a simple face, one static pose per weapon; cloth folds are procedural. Rank chevrons, insignia and formation signs are not shown. Weapon and gear pieces are the project's own models (uk/weapons, uk/gear).",
  ),
};

export default def;
