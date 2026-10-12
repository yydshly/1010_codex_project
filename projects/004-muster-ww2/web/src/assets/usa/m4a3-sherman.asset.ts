/**
 * M4A3(75)W Sherman medium tank (Fisher Tank Arsenal, 1944, VVSS), United States.
 * Procedurally modelled; part modules live in ./m4a3-sherman/ (dims.ts holds the reference numbers).
 */
import { group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { pal } from './m4a3-sherman/palette';
import { runningGear } from './m4a3-sherman/running';
import { hull } from './m4a3-sherman/hull';
import { turret } from './m4a3-sherman/turret';
import { fittings } from './m4a3-sherman/fittings';
import { H, TURRET } from './m4a3-sherman/dims';

const def: AssetDef = {
  id: 'us-m4a3-sherman',
  name: 'M4A3(75)W Sherman',
  subtitle: 'Medium tank',
  faction: 'usa',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'Ford GAA-engined Sherman with the 75 mm Gun M3, built by the Fisher Tank Arsenal on the welded large-hatch hull with its one-piece 47-degree glacis and "wet" (water-jacketed) ammunition stowage. This model shows a late 1944 tank with the high-bustle turret, all-round vision cupola, oval loader\'s hatch, M34A1 gun mount and VVSS suspension on T48 rubber chevron tracks, in olive drab.',
  facts: [
    { label: 'Crew', value: '5' },
    { label: 'Main gun', value: '75 mm Gun M3 in Mount M34A1, 104 rounds' },
    { label: 'Machine guns', value: '.50 cal M2 HB (turret roof), 2 x .30 cal M1919A4 (coaxial and bow)' },
    { label: 'Engine', value: 'Ford GAA V-8 petrol, 450 hp net (500 hp gross)' },
    { label: 'Weight', value: '69,600 lb (31.6 t) combat loaded' },
    { label: 'Length', value: '6.27 m over sand shields; the gun does not overhang the hull' },
    { label: 'Width / height', value: '2.67 m with sand shields / 2.94 m over the cupola' },
    { label: 'Armour', value: '64 mm glacis at 47 deg; 76 mm turret front, 89 mm gun shield' },
    { label: 'Suspension', value: 'VVSS, 3 bogies per side; 79 T48 shoes per track' },
    { label: 'Produced', value: 'Fisher Tank Arsenal, Feb. 1944 - Mar. 1945 (3,071 built)' },
  ],
  status: 'available',
  footprint: { w: 2.62, l: 5.9 },
  spacing: { default: 9, min: 6.5, max: 16 },
  maxQuantity: 12,
  options: [
    {
      kind: 'toggle',
      id: 'sandShields',
      label: 'Sand shields',
      default: false,
      note: 'Sheet-steel skirts over the tracks; often damaged or removed in service',
    },
    { kind: 'toggle', id: 'stowage', label: 'Rolled tarpaulin', default: true, note: 'Carried in the rear blanket rack' },
    { kind: 'toggle', id: 'star', label: 'White stars', default: true, note: 'Hull-side national star' },
  ],
  build(config) {
    const P = pal();
    const t = turret(P, true);
    t.position.set(0, H.roof, TURRET.z);
    t.userData.campMotion = { kind: 'turret', pivot: [0, 0, 0], muzzle: [0, TURRET.gunY, TURRET.muzzleZ] };
    return group(
      [
        runningGear(P),
        hull(P, 'late'),
        t,
        fittings(P, { sandShields: config.sandShields === true, star: config.star !== false, tarp: config.stowage !== false }),
      ],
      { name: 'm4a3-75w' },
    );
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://www.theshermantank.com/wp-content/uploads/M4A3-75w-spec-sheet.pdf',
      'https://www.theshermantank.com/about/sherman-tank-turrets/',
      'https://en.wikipedia.org/wiki/M4_Sherman',
      'https://www.militarytrader.com/military-vehicles/a-look-at-the-m4a3-75mm-w-sherman',
      'TM 9-759, Medium Tank M4A3 (War Department technical manual)',
      'R. P. Hunnicutt, Sherman: A History of the American Medium Tank (1978)',
    ],
    notes:
      'Hull plate junction heights, bogie spacing and fitting positions are proportioned from published drawings and photographs against the verified totals. No interior is modelled (hatches closed); the tow cable run on the left hull side and the pioneer tool layout follow common period practice rather than one specific vehicle. Track links are T48 rubber chevron shoes with individual end connectors and guide horns.',
  },
  view: { yaw: 35, pitch: 14 },
  order: 10,
};
export default def;
