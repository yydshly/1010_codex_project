/** US Army BAR gunner, Normandy 1944: M1941 field jacket, BAR M1918A2, M1937 BAR belt and suspenders. */
import type { AssetDef } from '../../core/types';
import { buildUSSoldier, constrainSoldier, soldierOptions, soldierProvenance } from './infantry/soldier';

const def: AssetDef = {
  id: 'us-bar-gunner',
  name: 'BAR Gunner (1944)',
  subtitle: 'US Army infantry, BAR M1918A2',
  faction: 'usa',
  category: 'Infantry',
  countAs: 'personnel',
  summary:
    'A US Army automatic rifleman as in Normandy, summer 1944, with the Browning Automatic Rifle M1918A2 (bipod removed, as often done in the field). ' +
    'The M1937 BAR belt holds twelve 20-round magazines; canteen and first-aid pouch hang at the rear, supported by M1936 suspenders.',
  facts: [
    { label: 'Depicted', value: 'Normandy, 1944' },
    { label: 'Primary weapon', value: 'Browning Automatic Rifle M1918A2' },
    { label: 'Uniform', value: 'M1941 field jacket, wool trousers, M1938 leggings' },
  ],
  status: 'available',
  footprint: { w: 0.6, l: 0.7 },
  spacing: { default: 1.2, min: 0.8, max: 3 },
  maxQuantity: 24,
  view: { yaw: 28, pitch: 8 },
  order: 12,
  options: soldierOptions('bar'),
  constrain: (cfg) => constrainSoldier('bar', cfg),
  build: (cfg, ctx) => buildUSSoldier('bar', cfg, ctx),
  provenance: soldierProvenance(
    ['https://en.wikipedia.org/wiki/M1918_Browning_Automatic_Rifle'],
    'Figure, uniform and kit are simplified: one body type and face, one static pose per choice; cloth folds are procedural. ' +
      'Weapon and gear pieces are the project\'s own models (usa/weapons, usa/gear), worn in their low-detail mode.',
  ),
};

export default def;
