/**
 * Volkswagen Type 82 Kubelwagen (Kfz. 1), 1943-44 production in Dunkelgelb.
 * Parts: body.ts (pressed-steel shell, doors, lids, louvres), wheels.ts (5.25-16 tyres, disc
 * wheels, rear reduction housings), chassis.ts (floor pan, axles, transaxle, engine underside,
 * exhaust), interior.ts (seats, gratings, controls, instrument panel), fittings.ts (windscreen,
 * lamps, spare wheel, folded top).
 */
import { group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { buildBody } from './kubelwagen/body';
import { buildRoadWheels } from './kubelwagen/wheels';
import { buildChassis } from './kubelwagen/chassis';
import { buildInterior } from './kubelwagen/interior';
import { buildFittings } from './kubelwagen/fittings';

const def: AssetDef = {
  id: 'de-kubelwagen',
  name: 'Kubelwagen (Type 82)',
  subtitle: 'Light personnel car (4x2)',
  faction: 'germany',
  category: 'Vehicles',
  countAs: 'vehicles',
  summary:
    'Light military car built by Volkswagen for the German armed forces from 1940 to 1945, with an air-cooled ' +
    'flat-four engine at the rear and a frameless, ribbed floor stamping under an open four-door body. ' +
    'Rear-wheel drive through a self-locking differential and reduction gears in the rear hubs gave it good ' +
    'ground clearance and cross-country ability. Shown as a 1943-44 car in Dunkelgelb, windscreen up and top folded.',
  facts: [
    { label: 'Built', value: '50,435 for the Wehrmacht and Waffen-SS (1940-1945)' },
    { label: 'Crew', value: '4' },
    { label: 'Engine', value: '1,131 cc air-cooled flat-four, 25 PS (from March 1943)' },
    { label: 'Length', value: '3.74 m' },
    { label: 'Width', value: '1.60 m' },
    { label: 'Height', value: '1.65 m (top up), 1.11 m (top down)' },
    { label: 'Wheelbase', value: '2.40 m' },
    { label: 'Weight', value: '725 kg empty' },
    { label: 'Tyres', value: '5.25-16' },
    { label: 'Top speed', value: '80 km/h' },
  ],
  status: 'available',
  footprint: { w: 1.6, l: 3.74 },
  spacing: { default: 6, min: 4.2, max: 12 },
  maxQuantity: 12,
  build() {
    return group([buildBody(), buildRoadWheels(), buildChassis(), buildInterior(), buildFittings()]);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://archive.org/details/TechnicalManualTmE9-803GermanVolkswagen',
      'https://www.ibiblio.org/hyperwar/USA/ref/TM/pdfs/TME9-803.pdf',
      'https://en.wikipedia.org/wiki/Volkswagen_K%C3%BCbelwagen',
      'https://silodrome.com/volkswagen-kubelwagen-car/',
      'https://www.skfk-gmbh.de/fahrzeugteile/wehrmachts-oldtimer/vw-82-k%C3%BCbelwagen/',
    ],
    notes:
      'Dimensions, tyre size, control layout, door hinging, windscreen, floor gratings and the rear hub reduction ' +
      'follow the US technical manual TM E9-803 (1944); panel curvature, swage positions, lamp and seat details ' +
      'are estimated from photographs. The engine compartment is closed: only the underside of the engine, ' +
      'transaxle, exhaust and suspension is modelled. Generic cross-country tread without sidewall lettering; ' +
      'seat covers shown as cloth (wartime coverings varied); floor pan and running gear shown in dark grey. ' +
      'No registration plates or unit markings; the only markings are the tyre-pressure stencils (1,4 / 1,8 atu). ' +
      'Battery, fuel tank, wiring, cables and side curtains are not modelled.',
  },
  order: 10,
};
export default def;
