/**
 * Ordnance QF 25-pounder Mk II on Carriage 25-pr Mk I, United Kingdom (SCC No. 15 olive drab).
 * Procedurally modelled; part modules live in ./qf-25pdr/ (dims.ts holds the reference numbers).
 */
import type { AssetDef } from '../../core/types';
import { buildQf25 } from './qf-25pdr/build';

const def: AssetDef = {
  id: 'uk-qf-25pdr',
  name: 'QF 25-pounder Mk II',
  subtitle: '87.6 mm gun-howitzer on Carriage Mk I',
  faction: 'uk',
  category: 'Artillery',
  countAs: 'artillery',
  summary:
    'The standard British field gun-howitzer of the Second World War: an 87.6 mm (3.45 in) Mk II ordnance with a vertical sliding-block breech and hydro-pneumatic recoil on the box-trail Carriage Mk I. ' +
    'It was towed straight onto its circular firing platform, on which it could be swung through 360 degrees. ' +
    'Shown with the muzzle brake and counterweight fitted from 1942, in SCC No. 15 olive drab.',
  facts: [
    { label: 'Calibre', value: '87.6 mm (3.45 in)' },
    { label: 'Barrel', value: '28 calibres' },
    { label: 'Breech', value: 'Vertical sliding block' },
    { label: 'Recoil', value: 'Hydro-pneumatic' },
    { label: 'Weight', value: '1,633 kg' },
    { label: 'Elevation', value: '-5 to +45 degrees' },
    { label: 'Traverse', value: '4 degrees left and right on the carriage; 360 degrees on the platform' },
    { label: 'Maximum range', value: '12,253 m (HE shell)' },
    { label: 'Crew', value: '6' },
    { label: 'In service', value: 'From 1940' },
  ],
  status: 'available',
  footprint: { w: 2.3, l: 4.7 },
  spacing: { default: 7, min: 4, max: 14 },
  maxQuantity: 12,
  build(_config, ctx) {
    return buildQf25({ detail: ctx.detail });
  },
  view: { yaw: 35, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Ordnance_QF_25-pounder',
      'https://www.historyofwar.org/articles/weapons_25pdr1.html',
      'https://www.iwm.org.uk/collections/item/object/30025245',
      'https://www.awm.gov.au/collection/C246529',
      'https://www.tankarchives.com/2018/09/25-pounds-of-death.html',
      'https://ukdefenceforum.net/viewtopic.php?t=123',
      'https://paradata.org.uk/content/4663669-25-pounder-artillery',
    ],
    notes:
      'Shown in action on the No. 9 firing platform with the barrel level; muzzle to towing eye about 4.64 m, 2.13 m over the hubs, ' +
      'track 1.79 m, trunnion height 1.16 m and shield top about 1.7 m above the ground (plus the platform). ' +
      'The platform diameter, tyre size (9.00-16 assumed) and the exact shape of the shield, saddle and trail plates follow ' +
      'photographs and the general arrangement rather than drawings. Internal breech, recoil and sight mechanisms are not ' +
      'modelled beyond their visible housings; the brake gear and the platform attachment gear are omitted; the spade rests ' +
      'on the display surface instead of being dug in; the travelling position of the platform (slung under the trail) is not ' +
      'offered. No markings.',
  },
  order: 20,
};

export default def;
