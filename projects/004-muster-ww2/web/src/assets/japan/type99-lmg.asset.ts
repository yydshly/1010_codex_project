/** Type 99 light machine gun - standalone catalog entry (collection stand, or set down on its bipod). */
import { THREE } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { buildType99Lmg, type99LmgStandRest, type99LmgOnBipod, buildType99LmgSlingLocal } from './weapons/type99-lmg.model';
import { presentOnStand } from './weapons/common/stand';

const def: AssetDef = {
  id: 'jp-type99-lmg',
  name: 'Type 99 Light Machine Gun',
  subtitle: 'Light machine gun, 7.7x58mm',
  faction: 'japan',
  category: 'Weapons',
  countAs: 'looseEquipment',
  summary:
    'The Type 99 light machine gun was the Imperial Japanese Army squad automatic weapon for the 7.7x58mm Arisaka cartridge, ' +
    'developed from the 6.5 mm Type 96 and produced from 1939 to 1945. Fed from a curved 30-round box magazine on top, it has a ' +
    'finned quick-change barrel with a flash hider, a folding bipod on the gas block, a carrying handle and, on early guns, a monopod under the butt.',
  facts: [
    { label: 'Calibre', value: '7.7x58mm Arisaka' },
    { label: 'Action', value: 'Gas-operated' },
    { label: 'Length', value: '1,181 mm' },
    { label: 'Barrel', value: '550 mm, finned, quick-change' },
    { label: 'Weight', value: '10.4 kg' },
    { label: 'Feed', value: '30-round detachable box magazine, top-mounted' },
    { label: 'Muzzle velocity', value: 'About 715 m/s' },
    { label: 'Produced', value: '1939-1945, about 53,000' },
  ],
  status: 'available',
  footprint: { w: 0.3, l: 1.22 },
  spacing: { default: 0.5, min: 0.32, max: 3 },
  maxQuantity: 24,
  view: { yaw: 38, pitch: 16 },
  order: 40,
  options: [
    {
      kind: 'select',
      id: 'display',
      label: 'Display',
      default: 'stand',
      choices: [
        { id: 'stand', label: 'On stand', note: 'Bipod folded, on the collection stand' },
        { id: 'bipod', label: 'On bipod', note: 'Set down on its bipod feet and the butt' },
      ],
    },
    { kind: 'toggle', id: 'sling', label: 'Sling', default: true, note: 'Canvas sling on the left-side swivels' },
    { kind: 'toggle', id: 'magazine', label: 'Magazine fitted', default: true, note: '30-round curved box magazine on top' },
  ],
  build(config, ctx) {
    const deployed = config.display === 'bipod';
    const mag = config.magazine !== false;
    const w = buildType99Lmg({ bipod: deployed ? 'deployed' : 'folded', magazine: mag, detail: ctx.detail });
    const slingOn = config.sling !== false;
    if (deployed) return type99LmgOnBipod(w, slingOn, 0.04);
    return presentOnStand(w, {
      rest: type99LmgStandRest(w),
      sling: slingOn,
      slingSlack: 0.02,
      slingBuild: (g, slack, cradles) => buildType99LmgSlingLocal(g, slack, cradles, new THREE.Vector3(1, 0, 0), 'folded', mag),
      clearance: 0.02,
      overhang: 0.06,
      minHeight: 0.1,
    });
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Type_99_light_machine_gun',
      'https://en.wikipedia.org/wiki/Type_96_light_machine_gun',
      'https://modernfirearms.net/en/machineguns/japan-machineguns/type-96-type-99-eng/',
      'https://www.forgottenweapons.com/ria-nambu-type-96-type-99-lmgs/',
      'https://www.militaryfactory.com/smallarms/detail.php?smallarms_id=372',
      'https://www.poulinauctions.com/2026/08/25/imperial-japanese-kokura-arsenal-type-99-light-machine-gun-with-scarce-4-cell-magazine-pouch-canvas-carrier/',
    ],
    notes:
      'Represents an early-production gun with the folding monopod under the butt (shown folded), blued metal, a wooden butt with ' +
      'a black-finished steel butt plate, a grooved wooden pistol grip, a canvas sling and open sights offset to the left of the ' +
      'magazine. Overall and barrel length follow published figures; receiver, butt, grip, magazine curvature, barrel fins, carrying ' +
      'handle, gas system, bipod and sight positions are proportioned from photographs and descriptions, not measured. The carrying ' +
      'handle is shown folded to the right; the side-opening magazine-well cover is shown open. Sling swivel positions and hardware, ' +
      'bipod leg length and foot shape are approximations. Receiver markings (arsenal insignia, dates, serials), the telescopic sight ' +
      'rail and the internal mechanism are not depicted; the bayonet is not modelled.',
  },
};
export default def;
