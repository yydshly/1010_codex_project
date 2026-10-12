/** US Army rifleman, Normandy 1944: M1941 field jacket, M1 rifle, M1923 cartridge belt, M1928 haversack. */
import type { AssetDef } from '../../core/types';
import { buildUSSoldier, constrainSoldier, soldierOptions, soldierProvenance } from './infantry/soldier';

const def: AssetDef = {
  id: 'us-rifleman',
  name: 'Rifleman (1944)',
  subtitle: 'US Army infantry, M1 Garand',
  faction: 'usa',
  category: 'Infantry',
  countAs: 'personnel',
  summary:
    'A US Army rifleman as in Normandy, summer 1944: M1 helmet, M1941 field jacket, wool trousers and M1938 canvas leggings over ' +
    'service shoes, with the M1 rifle. The M1923 cartridge belt carries the canteen and first-aid pouch; the M1928 haversack is optional.',
  facts: [
    { label: 'Depicted', value: 'Normandy, 1944' },
    { label: 'Primary weapon', value: 'M1 rifle (M1 Garand)' },
    { label: 'Uniform', value: 'M1941 field jacket, wool trousers, M1938 leggings' },
  ],
  status: 'available',
  footprint: { w: 0.6, l: 0.5 },
  spacing: { default: 1.1, min: 0.8, max: 3 },
  maxQuantity: 24,
  view: { yaw: 28, pitch: 8 },
  order: 10,
  options: soldierOptions('rifleman'),
  constrain: (cfg) => constrainSoldier('rifleman', cfg),
  build: (cfg, ctx) => buildUSSoldier('rifleman', cfg, ctx),
  provenance: soldierProvenance(
    ['https://en.wikipedia.org/wiki/M1_Garand'],
    'Figure, uniform and kit are simplified: one body type and face, one static pose per choice; cloth folds are procedural. ' +
      'Weapon and gear pieces are the project\'s own models (usa/weapons, usa/gear), worn in their low-detail mode.',
  ),
};

export default def;
