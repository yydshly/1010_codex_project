/** Sturmgeschuetz III Ausf. G (Sd.Kfz. 142/1) - assault gun, summer 1943 production without Zimmerit. */
import { group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { palette } from './stug-iii-g/materials';
import { runningGear } from './stug-iii-g/running-gear';
import { hull } from './stug-iii-g/hull';
import { casemate } from './stug-iii-g/casemate';
import { fittings } from './stug-iii-g/fittings';

const def: AssetDef = {
  id: 'de-stug-iii-g',
  name: 'StuG III Ausf. G',
  subtitle: 'Assault gun (Sturmgeschuetz III, Sd.Kfz. 142/1)',
  faction: 'germany',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'Turretless German assault gun on the Panzer III chassis, with a low armoured casemate carrying the ' +
    '7.5 cm StuK 40 L/48. Shown as a 1943 production vehicle in Dunkelgelb with the welded box mantlet, ' +
    'commander\'s cupola, loader\'s MG shield and side skirts (Schuerzen).',
  facts: [
    { label: 'Produced', value: 'December 1942 - April 1945' },
    { label: 'Crew', value: '4' },
    { label: 'Main gun', value: '7.5 cm StuK 40 L/48' },
    { label: 'Machine gun', value: '7.92 mm MG 34 (loader)' },
    { label: 'Weight', value: '23.9 t' },
    { label: 'Length', value: '6.85 m with gun' },
    { label: 'Width', value: '2.95 m (without Schuerzen)' },
    { label: 'Height', value: '2.16 m' },
    { label: 'Engine', value: 'Maybach HL 120 TRM (petrol)' },
  ],
  status: 'available',
  footprint: { w: 3.12, l: 5.5 },
  spacing: { default: 9, min: 6.5, max: 16 },
  maxQuantity: 12,
  options: [
    {
      kind: 'select',
      id: 'schuerzen',
      label: 'Schuerzen',
      choices: [
        { id: 'fitted', label: 'Fitted', note: 'Five skirt plates per side on the hanger rails' },
        { id: 'removed', label: 'Removed', note: 'Skirt plates off; rails and brackets remain' },
      ],
      default: 'fitted',
    },
    {
      kind: 'select',
      id: 'mgShield',
      label: 'Loader\'s MG shield',
      choices: [
        { id: 'raised', label: 'Raised', note: 'Shield up with the MG 34 mounted' },
        { id: 'folded', label: 'Folded', note: 'Shield folded flat on the roof, MG stowed' },
      ],
      default: 'raised',
    },
  ],
  build(config) {
    const pal = palette();
    const skirts = config.schuerzen !== 'removed';
    const shieldUp = config.mgShield !== 'folded';
    return group([runningGear(pal), hull(pal), casemate(pal, shieldUp), fittings(pal, skirts)]);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Sturmgesch%C3%BCtz_III',
      'https://tanks-encyclopedia.com/ww2/nazi_germany/stugiiig',
      'https://www.historyofwar.org/articles/weapons_StuG_III_Ausf_G.html',
      'https://en.wikipedia.org/wiki/Panzer_III',
      'https://en.wikipedia.org/wiki/7.5_cm_KwK_40',
    ],
    notes:
      'Depicts mid-1943 production: welded box mantlet (Kastenblende; the cast Topfblende or "Saukopf" ' +
      'mantlet followed from November 1943), single-piece 80 mm nose plate, no smoke dischargers and no ' +
      'Zimmerit. Plate layout and component positions were derived from published overall dimensions and ' +
      'photographs, not factory drawings; the casemate is simplified (no bolted add-on plates, simplified ' +
      'pannier construction). Hatches are closed and no interior is modelled. The loader\'s MG 34 is ' +
      'simplified; the stated 2.16 m height excludes the raised MG shield. Tool stowage, spare wheel and ' +
      'spare link positions are representative. Antenna base only, rod not fitted. Markings are limited to ' +
      'Balkenkreuze (no unit numbers).',
  },
  view: { yaw: 35, pitch: 14 },
  order: 12,
};
export default def;
