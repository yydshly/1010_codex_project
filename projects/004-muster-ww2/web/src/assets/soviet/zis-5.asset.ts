/**
 * ZiS-5V 3-tonne cargo truck (4x2), the simplified wartime version of the ZiS-5, shown as a
 * 1943-44 truck in 4BO green with the wooden cab. Model built in src/assets/soviet/zis-5/:
 * chassis.ts (frame, axles, springs, drivetrain, exhaust, fuel tank), wheels.ts (34x7 tyres,
 * disc wheels, twin rears), front.ts (radiator, bonnet, flat wings, headlamp, running boards),
 * cab.ts (wooden cab + interior), bed.ts (platform, tailgate, lamp, spare wheel).
 */
import type { AssetDef } from '../../core/types';
import { buildZis5 } from './zis-5/model';

const def: AssetDef = {
  id: 'su-zis-5',
  name: 'ZiS-5V',
  subtitle: '3-tonne cargo truck (4x2), wartime version',
  faction: 'soviet',
  category: 'Vehicles',
  countAs: 'vehicles',
  summary:
    'Soviet three-tonne 4x2 truck built from 1933 by the Stalin Plant (ZiS) in Moscow and, during the war, also at Ulyanovsk and Miass; ' +
    'with the GAZ-AA it was one of the most numerous Red Army trucks. Shown as the simplified wartime ZiS-5V of 1943-44 in 4BO green, ' +
    'with the wooden cab, flat bent wings, a single headlamp and a platform on which only the tailgate opens.',
  facts: [
    { label: 'Produced', value: 'ZiS-5 from October 1933; simplified ZiS-5V from 1942' },
    { label: 'Built', value: 'About 83,000 ZiS-5 and ZiS-5V in 1941-45' },
    { label: 'Drive', value: '4x2' },
    { label: 'Payload', value: '3 t' },
    { label: 'Engine', value: '5,555 cc six-cylinder side-valve petrol, 73 hp (76 hp from 1944)' },
    { label: 'Length', value: '6.06 m (ZiS-5 with bumper)' },
    { label: 'Width', value: '2.235 m' },
    { label: 'Height', value: '2.16 m' },
    { label: 'Wheelbase', value: '3.81 m' },
    { label: 'Track', value: '1.53 m front, 1.675 m rear' },
    { label: 'Weight', value: '3.1 t empty' },
    { label: 'Tyres', value: '34 x 7 in' },
    { label: 'Top speed', value: '60 km/h' },
  ],
  status: 'available',
  footprint: { w: 2.24, l: 6.06 },
  spacing: { default: 8, min: 6.5, max: 16 },
  maxQuantity: 8,
  build() {
    return buildZis5();
  },
  view: { yaw: 35, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/ZIS-5_(truck)',
      'https://ru.wikipedia.org/wiki/%D0%97%D0%98%D0%A1-5_(%D0%B0%D0%B2%D1%82%D0%BE%D0%BC%D0%BE%D0%B1%D0%B8%D0%BB%D1%8C)',
      'http://www.autogallery.org.ru/zis5.htm',
      'http://www.autogallery.org.ru/y/yzis5.htm',
      'https://www.kolesa.ru/test-drive/ego-zovut-zahar-ivanovich-test-drajv-zis-5',
      'https://truck-encyclopedia.com/ww2/ussr/zis-5-truck.php',
    ],
    notes:
      'Length, width, height, wheelbase, track, clearance, platform size and loading height, spring lengths and leaf counts and ' +
      'tyre size follow published data; overhangs, cab, bonnet and wing shapes and fitting positions are estimated from photographs ' +
      'of preserved trucks. Wartime features shown: wooden cab with plank boarding and a dermatin-covered roof without visor, flat ' +
      'bent wings, wooden running boards, single left headlamp, no bumper, no front brakes, only the tailgate hinged, canvas seat ' +
      'cushions and a wooden steering-wheel rim. Wartime trucks reportedly carried the spare wheel beside the cab; its exact mounting ' +
      'could not be confirmed, so it is shown in the carrier under the rear overhang used on later trucks. The engine is represented ' +
      'by its underside masses only; wiring, brake rods and cables are omitted. Generic herringbone tread; five-hole wheel discs (one ' +
      'of several patterns fitted). No registration plates, unit markings or factory badge.',
  },
  order: 30,
};

export default def;
