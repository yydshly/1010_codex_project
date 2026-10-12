/**
 * 7.5 cm PaK 40 anti-tank gun, Germany (Dunkelgelb finish).
 * Procedurally modelled; part modules live in ./pak-40/ (layout.ts holds the reference numbers).
 */
import type { AssetDef } from '../../core/types';
import { buildPak40 } from './pak-40/build';

const def: AssetDef = {
  id: 'de-pak40',
  name: '7.5 cm PaK 40',
  subtitle: '75 mm anti-tank gun',
  faction: 'germany',
  category: 'Artillery',
  countAs: 'artillery',
  summary:
    'German 75 mm towed anti-tank gun developed by Rheinmetall-Borsig and used from 1942 to 1945; about 23,300 were built. ' +
    'A monobloc L/46 barrel with a double-baffle muzzle brake and a semi-automatic horizontal sliding breech sits on a ' +
    'tubular split-trail carriage with torsion-bar suspension, solid-rubber tyres and a low shield of two spaced 4 mm plates.',
  facts: [
    { label: 'Calibre', value: '75 mm (L/46 barrel, 3.45 m)' },
    { label: 'Weight', value: '1,425 kg in action' },
    { label: 'Elevation', value: '-5 to +22 degrees' },
    { label: 'Traverse', value: '65 degrees' },
    { label: 'Crew', value: '5 (some sources give 6)' },
    { label: 'Produced', value: '1942-1945 (pre-series from late 1941)' },
    { label: 'Number built', value: 'about 23,300' },
  ],
  status: 'available',
  footprint: { w: 3.6, l: 5.9 },
  spacing: { default: 7.5, min: 4.5, max: 14 },
  maxQuantity: 12,
  options: [
    {
      kind: 'select',
      id: 'trails',
      label: 'Trails',
      choices: [
        { id: 'deployed', label: 'Deployed', note: 'Trails spread, spades down, ready to fire' },
        { id: 'closed', label: 'Closed', note: 'Trails joined and spades folded for towing' },
      ],
      default: 'deployed',
    },
  ],
  build(config, ctx) {
    return buildPak40({ trails: config.trails === 'closed' ? 'closed' : 'deployed', detail: ctx.detail });
  },
  view: { yaw: 35, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/7.5_cm_Pak_40',
      'https://de.wikipedia.org/wiki/7,5-cm-PaK_40',
      'https://www.ulrichwrede.de/wehrmacht/panzerj%C3%A4ger/7-5-cm-pak-40/',
      'https://www.ibiblio.org/hyperwar/Germany/HB/HB-7.html',
      'https://tanks-encyclopedia.com/ww2/germany/at-guns/7-5-cm-pak-40/',
    ],
    notes:
      'Represents a 1943-44 gun in factory Dunkelgelb with moderate wear and no markings, fitted with the early full-disc ' +
      'pressed-steel wheels with an impressed spoke pattern (the later spoked wheels are not modelled). Key numbers: barrel ' +
      '3.45 m, firing height 0.96 m, wheel diameter ~0.9 m, track ~1.6 m, trail spread ~3.6 m. Hand-wheel, gearbox, ' +
      'sight-bracket, shutter and spade shapes are approximated from photographs rather than factory drawings; internal ' +
      'mechanisms (buffer, recuperator, torsion bars, semi-automatic and firing gear) are not modelled. The barrel is shown ' +
      'at 0 degrees elevation and traverse. Closed shows the unhitched travel layout: trails brought together with the towing ' +
      'eye between their ends, spades folded and the lower-shield flap raised, the trail ends resting on the ground (the gun ' +
      'tips back slightly). The barrel travel lock, the third wheel for manhandling, ammunition and crew kit are omitted.',
  },
  order: 10,
};

export default def;
