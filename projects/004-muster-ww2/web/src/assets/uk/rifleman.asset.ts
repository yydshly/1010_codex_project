/** British Army infantry, NW Europe 1944: Rifleman (1944) - see ./infantry/soldier.ts. */
import type { AssetDef } from '../../core/types';
import { buildBritishSoldier, constrainSoldier, soldierOptions, soldierProvenance } from './infantry/soldier';

const def: AssetDef = {
  id: 'uk-rifleman',
  name: 'Rifleman (1944)',
  subtitle: 'British infantry, Rifle No. 4 Mk I',
  faction: 'uk',
  category: 'Infantry',
  countAs: 'personnel',
  summary:
    'A British infantry rifleman of 1944 in the 1937-pattern Battledress and web equipment in battle order, carrying the Rifle No. 4 Mk I. Two basic pouches sit either side of the belt buckle, with the water bottle on the right hip and the bayonet in its frog on the left.',
  facts: [
    { label: 'Depicted', value: 'NW Europe, 1944' },
    { label: 'Primary weapon', value: 'Rifle No. 4 Mk I (.303)' },
    { label: 'Uniform', value: 'Battledress, 1937 pattern' },
    { label: 'Equipment', value: 'Web Equipment, 1937 pattern' },
  ],
  status: 'available',
  footprint: { w: 0.6, l: 0.5 },
  spacing: { default: 1.1, min: 0.8, max: 3 },
  maxQuantity: 24,
  view: { yaw: 28, pitch: 8 },
  order: 10,
  options: soldierOptions('rifleman'),
  constrain: (cfg) => constrainSoldier('rifleman', cfg),
  build: (cfg, ctx) => buildBritishSoldier('rifleman', cfg, ctx),
  provenance: soldierProvenance(
    ['https://en.wikipedia.org/wiki/Lee%E2%80%93Enfield'],
    "Figure, uniform and web equipment are simplified: one body type and a simple face, one static pose per weapon; cloth folds are procedural. Insignia, formation signs and the entrenching tool are not shown. Weapon and gear pieces are the project's own models (uk/weapons, uk/gear).",
  ),
};

export default def;
