/** US Army squad leader, Normandy 1944: M1941 field jacket, Thompson M1A1, M1936 pistol belt and suspenders. */
import type { AssetDef } from '../../core/types';
import { buildUSSoldier, constrainSoldier, soldierOptions, soldierProvenance } from './infantry/soldier';

const def: AssetDef = {
  id: 'us-squad-leader',
  name: 'Squad Leader (1944)',
  subtitle: 'US Army infantry, Thompson M1A1',
  faction: 'usa',
  category: 'Infantry',
  countAs: 'personnel',
  summary:
    'A US Army squad leader as in Normandy, summer 1944, holding a Thompson M1A1 submachine gun at the low ready. ' +
    'He wears the M1941 field jacket and M1938 leggings, with a magazine pouch, first-aid pouch and canteen on the M1936 pistol belt and M1936 suspenders.',
  facts: [
    { label: 'Depicted', value: 'Normandy, 1944' },
    { label: 'Primary weapon', value: 'Thompson M1A1 submachine gun' },
    { label: 'Uniform', value: 'M1941 field jacket, wool trousers, M1938 leggings' },
  ],
  status: 'available',
  footprint: { w: 0.6, l: 0.6 },
  spacing: { default: 1.1, min: 0.8, max: 3 },
  maxQuantity: 24,
  view: { yaw: 28, pitch: 8 },
  order: 11,
  options: soldierOptions('squad-leader'),
  constrain: (cfg) => constrainSoldier('squad-leader', cfg),
  build: (cfg, ctx) => buildUSSoldier('squad-leader', cfg, ctx),
  provenance: soldierProvenance(
    ['https://en.wikipedia.org/wiki/Thompson_submachine_gun'],
    'Figure, uniform and kit are simplified: one body type and face, one static pose; cloth folds are procedural. ' +
      'Weapon and gear pieces are the project\'s own models (usa/weapons, usa/gear), worn in their low-detail mode.',
  ),
};

export default def;
