/**
 * Opel Blitz 3.6-36S 3-tonne cargo truck (4x2), shown as a 1943-44 Opel-built truck in
 * Dunkelgelb with the all-steel cab and the wooden drop-side cargo body (Pritsche).
 * Model built in src/assets/germany/opel-blitz/: chassis.ts (frame, axles, springs, drivetrain,
 * exhaust, fuel tank), wheels.ts (190-20 tyres, disc wheels, twin rears), front.ts (radiator,
 * bonnet, wings, lamps, bumper), cab.ts (steel cab + interior), bed.ts (cargo body, bows,
 * tarpaulin, mudguards, lamps, tool box, spare wheel).
 */
import type { AssetDef } from '../../core/types';
import { buildOpelBlitz } from './opel-blitz/model';

const def: AssetDef = {
  id: 'de-opel-blitz',
  name: 'Opel Blitz 3.6-36S',
  subtitle: '3-tonne cargo truck (4x2)',
  faction: 'germany',
  category: 'Vehicles',
  countAs: 'vehicles',
  summary:
    'Standard rear-wheel-drive three-tonne truck built by Opel at Brandenburg and used in large numbers by the Wehrmacht, ' +
    'powered by the 3.6-litre six-cylinder petrol engine of the Opel Admiral car. ' +
    'Shown as a 1943-44 truck in Dunkelgelb with the all-steel cab and a wooden drop-side cargo body on removable bows.',
  facts: [
    { label: 'Built', value: '82,356 (April 1937 - August 1944)' },
    { label: 'Drive', value: '4x2, rear-wheel drive' },
    { label: 'Payload', value: '3 t' },
    { label: 'Engine', value: '3,626 cc six-cylinder OHV petrol, 68 hp (military rating)' },
    { label: 'Length', value: '6.05-6.11 m (cargo body)' },
    { label: 'Width', value: '2.265 m' },
    { label: 'Height', value: '2.56 m over the tarpaulin' },
    { label: 'Wheelbase', value: '3.60 m' },
    { label: 'Track', value: '1.54 m front, 1.62 m rear' },
    { label: 'Weight', value: '2.5 t empty, 5.8 t gross' },
    { label: 'Tyres', value: '190-20' },
    { label: 'Top speed', value: '85 km/h' },
  ],
  status: 'available',
  footprint: { w: 2.27, l: 6.1 },
  spacing: { default: 8, min: 6.5, max: 16 },
  maxQuantity: 8,
  options: [
    {
      kind: 'select',
      id: 'cover',
      label: 'Canvas cover',
      choices: [
        { id: 'canvas', label: 'Fitted', note: 'Tarpaulin laced over the bows' },
        { id: 'bows', label: 'Removed (bows fitted)' },
        { id: 'open', label: 'Removed (no bows)' },
      ],
      default: 'canvas',
    },
  ],
  build(config) {
    const c = String(config.cover ?? 'canvas');
    return buildOpelBlitz(c === 'bows' || c === 'open' ? c : 'canvas');
  },
  view: { yaw: 35, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'http://www.autogallery.org.ru/blitz36.htm (data after W. Oswald, Kraftfahrzeuge und Panzer der Reichswehr, Wehrmacht und Bundeswehr)',
      'https://de.wikipedia.org/wiki/Opel_Blitz_3,6',
      'https://de.wikipedia.org/wiki/Opel_Blitz',
      'https://en.wikipedia.org/wiki/Opel_Blitz',
      'http://www.kfzderwehrmacht.de/Homepage_english/Motor_Vehicles/Germany/Opel/Opel_Blitz_3-5-36_-_3-6-36/Opel_Blitz_3-5-36-_3-6-36_-_3-/opel_blitz_3-5-36-_3-6-36_-_3-6-36_s.html',
      'https://www.materielsterrestres39-45.fr/fr/index.php/camions/226-allemagne-camions/allemagne-camions-legers/909-opel-blitz-einheitsfahrerhaus',
      'https://www.media.stellantis.com/em-en/opel/press/a-name-becomes-a-trademark-90-years-of-the-opel-blitz',
    ],
    notes:
      'Length, width, heights, wheelbase, track, ground clearance, platform size and tyre size follow published data; overhangs, ' +
      'cab, bonnet and wing shapes, the bonnet louvre pattern and fitting positions are estimated from photographs of preserved ' +
      'trucks and scale-model references. The all-steel Opel cab is modelled, not the wooden Einheitsfahrerhaus fitted to the ' +
      'Daimler-Benz-built L 701 from late 1944; late details shown are the Notek lamp and the grille without maker\'s badge. ' +
      'Dunkelgelb applies from the 1943 colour order; the frame and running gear are shown in black-grey (factory practice varied). ' +
      'The spare wheel is shown carried under the rear frame overhang and the fuel tank under the seat; exact positions varied ' +
      'with body type and are simplified. The engine is represented by its underside masses only; wiring, brake lines and cables ' +
      'are omitted. Generic cross-country tread; olive-khaki tarpaulin. No registration plates, unit or tactical markings.',
  },
  order: 30,
};

export default def;
