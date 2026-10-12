/**
 * Ilyushin Il-2, two-seat version with the 1943 swept outer wing panels, Soviet Union.
 * Procedurally modelled; see ./il-2/ for the part modules and dims.ts for the reference numbers.
 */
import type { AssetDef } from '../../core/types';
import { buildIl2 } from './il-2/build';

const def: AssetDef = {
  id: 'su-il2',
  name: 'Ilyushin Il-2',
  subtitle: 'Two-seat ground-attack aircraft, 1943-44',
  faction: 'soviet',
  category: 'Aircraft',
  countAs: 'aircraft',
  summary:
    'Soviet ground-attack aircraft whose engine, cockpit and fuel tanks sat inside a load-bearing steel armour shell. Shown is the two-seat version with a rear gunner and the outer wing panels swept back 15 degrees at the leading edge, as introduced in 1943. The Il-2 is one of the most produced military aircraft in history.',
  facts: [
    { label: 'Crew', value: '2 (pilot, rear gunner)' },
    { label: 'Engine', value: 'Mikulin AM-38F liquid-cooled V12, 1,720 hp (take-off)' },
    { label: 'Armament (as fitted)', value: '2 x 23 mm VYa-23 cannon, 2 x 7.62 mm ShKAS (wings); 1 x 12.7 mm UBT (rear)' },
    { label: 'Span', value: '14.60 m' },
    { label: 'Length', value: '11.65 m' },
    { label: 'Produced', value: '1941-1945, about 36,000 of all versions' },
  ],
  status: 'available',
  footprint: { w: 14.6, l: 11.6 },
  spacing: { default: 19, min: 15, max: 30 },
  maxQuantity: 6,
  build() {
    return buildIl2({ rails: false });
  },
  view: { yaw: 35, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Ilyushin_Il-2',
      'https://ru.wikipedia.org/wiki/%D0%98%D0%BB-2',
      'https://military.wikireading.ru/27298',
      'https://massimotessitori.altervista.org/sovietwarplanes/pages/colors/1941-43/1941-43.html',
      'http://wio.ru/simbols/simbols.htm',
    ],
    notes:
      'Span, length, wing area, centre-section chord, tailplane span, 15 deg outer-panel sweep, wheel sizes and the 3.6 m propeller follow the sources; ' +
      'fuselage cross-sections, wing thickness, gear track (~3.4 m) and the three-point ground angle (~10 deg) are estimates from photographs, not measured drawings. ' +
      'Shown as a 1943-44 aircraft with wooden rear fuselage, VYa-23 cannon, UBT on its pivot mount and no external stores; RS-82 rails, antenna, pitot, ' +
      'trim tabs and most rivet/fastener detail are omitted. Radiator and oil-cooler intake shapes are simplified. The camouflage is a generic sprayed ' +
      'AMT-4/AMT-6 pattern over AMT-7, not a copy of a specific factory template; markings are red stars with white border and thin red outline, no unit numbers. ' +
      'Cockpit interior is simplified (panel, sight, seat, stick, head armour, gunner strap seat).',
  },
  order: 30,
};

export default def;
