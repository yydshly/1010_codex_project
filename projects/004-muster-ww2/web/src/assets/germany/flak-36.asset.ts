/**
 * 8.8 cm Flak 36 heavy anti-aircraft gun in the firing position on its cross platform, Germany
 * (1943-44 Dunkelgelb finish). Part modules live in ./flak-36/ (dims.ts holds the reference numbers).
 */
import type { AssetDef } from '../../core/types';
import { buildFlak36 } from './flak-36/build';

const def: AssetDef = {
  id: 'de-flak-36',
  name: '8.8 cm Flak 36',
  subtitle: '88 mm heavy anti-aircraft gun',
  faction: 'germany',
  category: 'Artillery',
  countAs: 'artillery',
  summary:
    'German 88 mm anti-aircraft gun, a development of the Flak 18 with a multi-section barrel and a symmetrical ' +
    'cruciform platform carried on two Sonderanhaenger 202 bogies. Emplaced, the bogies are removed and the gun ' +
    'traverses through 360 degrees on its pedestal; it was also widely used against ground targets, and from 1941 front-line guns were given a gun shield.',
  facts: [
    { label: 'Calibre', value: '88 mm (L/56 barrel, 4.93 m)' },
    { label: 'Elevation', value: '-3 to +85 degrees' },
    { label: 'Traverse', value: '360 degrees' },
    { label: 'Weight', value: '5,000 kg in action (published figures vary)' },
    { label: 'Rate of fire', value: '15-20 rounds per minute' },
    { label: 'Muzzle velocity', value: '820 m/s (HE)' },
    { label: 'Crew', value: '10' },
  ],
  status: 'available',
  footprint: { w: 5.0, l: 6.4 },
  spacing: { default: 10, min: 6.5, max: 18 },
  maxQuantity: 8,
  options: [
    {
      kind: 'select',
      id: 'elevation',
      label: 'Elevation',
      choices: [
        { id: 'aa', label: '20 degrees', note: 'Barrel raised as for an anti-aircraft engagement' },
        { id: 'low', label: '5 degrees', note: 'Barrel low as for engaging ground targets' },
      ],
      default: 'aa',
    },
    { kind: 'toggle', id: 'shield', label: 'Gun shield', default: true, note: 'Front plate with swept side plates, fitted from 1941' },
  ],
  build(config) {
    return buildFlak36({ shield: config.shield !== false, elevation: config.elevation === 'low' ? 'low' : 'aa' });
  },
  view: { yaw: 55, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/8.8_cm_Flak_18/36/37/41',
      'https://de.wikipedia.org/wiki/Acht-Acht',
      'https://www.ww2technik.de/sites/dflak/8,8%20cm%20flak%2036.htm',
      'https://www.ulrichwrede.de/wehrmacht/artillerie/8-8-cm-flak/',
      'https://tanks-encyclopedia.com/88-flak-18-flak-36-and-flak-37/',
    ],
    notes:
      'Represents a Flak 36 in the emplaced firing position in the 1943-44 factory Dunkelgelb finish with moderate wear and ' +
      'no markings: both side outriggers lowered, the four levelling jacks down on their round pads and the two Sonderanhaenger ' +
      '202 bogies removed. Key numbers: barrel 4.93 m, bore height 1.60 m at 0 degrees, shield 1.95 x 1.75 m with swept 6 mm side ' +
      'plates. The platform arm lengths (about 5.2 x 5.0 m over the pads), the shape of the pedestal, upper carriage, equilibrator ' +
      'cylinders, cradle, fuze-setting machine, data receivers, seats and handwheels are approximated from photographs rather than ' +
      'factory drawings; the barrel section joint is shown as a single collar. Internal mechanisms (recoil brake, recuperator ' +
      'internals, equilibrator springs, gearing, firing gear), the loading tray, cables to the predictor, the travel lock detail, ' +
      'ammunition and crew kit are not modelled.',
  },
  order: 30,
};

export default def;
