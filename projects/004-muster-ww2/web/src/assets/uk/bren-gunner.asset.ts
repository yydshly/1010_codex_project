/** British Army infantry, NW Europe 1944: Bren Gunner (1944) - see ./infantry/soldier.ts. */
import type { AssetDef } from '../../core/types';
import { buildBritishSoldier, constrainSoldier, soldierOptions, soldierProvenance } from './infantry/soldier';

const def: AssetDef = {
  id: 'uk-bren-gunner',
  name: 'Bren Gunner (1944)',
  subtitle: 'British infantry, Bren Mk II',
  faction: 'uk',
  category: 'Infantry',
  countAs: 'personnel',
  summary:
    'A British infantry Bren gunner of 1944 in the 1937-pattern Battledress and web equipment in battle order, carrying the Bren Mk II light machine gun with its bipod folded. The basic pouches each held two Bren magazines.',
  facts: [
    { label: 'Depicted', value: 'NW Europe, 1944' },
    { label: 'Primary weapon', value: 'Bren Mk II (.303)' },
    { label: 'Uniform', value: 'Battledress, 1937 pattern' },
    { label: 'Equipment', value: 'Web Equipment, 1937 pattern' },
  ],
  status: 'available',
  footprint: { w: 0.6, l: 0.5 },
  spacing: { default: 1.1, min: 0.8, max: 3 },
  maxQuantity: 24,
  view: { yaw: 28, pitch: 8 },
  order: 12,
  options: soldierOptions('bren'),
  constrain: (cfg) => constrainSoldier('bren', cfg),
  build: (cfg, ctx) => buildBritishSoldier('bren', cfg, ctx),
  provenance: soldierProvenance(
    ['https://en.wikipedia.org/wiki/Bren_light_machine_gun'],
    "Figure, uniform and web equipment are simplified: one body type and a simple face, one static pose per weapon; cloth folds are procedural. Insignia, formation signs and the entrenching tool are not shown. Weapon and gear pieces are the project's own models (uk/weapons, uk/gear).",
  ),
};

export default def;
