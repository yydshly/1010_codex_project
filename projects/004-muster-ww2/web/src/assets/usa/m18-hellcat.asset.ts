/**
 * 76 mm Gun Motor Carriage M18 "Hellcat" (Buick, 1944), United States.
 * Procedurally modelled; part modules live in ./m18-hellcat/ (dims.ts holds the reference numbers).
 */
import { group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { pal } from './m18-hellcat/palette';
import { runningGear } from './m18-hellcat/running';
import { hull } from './m18-hellcat/hull';
import { turret } from './m18-hellcat/turret';
import { fittings } from './m18-hellcat/fittings';
import { H, TURRET } from './m18-hellcat/dims';

const def: AssetDef = {
  id: 'us-m18-hellcat',
  name: 'M18 Hellcat',
  subtitle: '76 mm Gun Motor Carriage',
  faction: 'usa',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'Fast, lightly armoured tank destroyer built by Buick, with a Continental R-975 radial engine, torsion-bar suspension and an open-topped turret carrying a 76 mm gun. This model shows a 1944 vehicle with the 76 mm Gun M1A2 and its double-baffle muzzle brake, in olive drab.',
  facts: [
    { label: 'Crew', value: '5' },
    { label: 'Main gun', value: '76 mm Gun M1A1, M1A1C or M1A2 (45 rounds)' },
    { label: 'Machine gun', value: '.50 cal Browning M2 HB on the turret ring mount' },
    { label: 'Engine', value: 'Continental R-975-C1 or -C4 9-cylinder radial, 350-400 hp' },
    { label: 'Weight', value: '37,557 lb (17.0 t) combat loaded' },
    { label: 'Length', value: '5.28 m hull; 6.65 m with the gun forward' },
    { label: 'Width / height', value: '2.87 m / 2.57 m over the AA machine gun' },
    { label: 'Armour', value: '0.19-0.5 in hull, 0.5-1.0 in turret; open top' },
    { label: 'Produced', value: 'Buick, July 1943 - October 1944 (2,507 built)' },
  ],
  status: 'available',
  footprint: { w: 2.87, l: 5.28 },
  spacing: { default: 9, min: 7, max: 16 },
  maxQuantity: 12,
  options: [
    {
      kind: 'select',
      id: 'gun',
      label: 'Main gun',
      default: 'm1a2',
      choices: [
        { id: 'm1a2', label: '76 mm M1A2 with muzzle brake', note: 'Faster rifling twist; always fitted with the brake' },
        { id: 'm1a1', label: '76 mm M1A1, plain muzzle', note: 'Early production vehicles' },
      ],
    },
    { kind: 'toggle', id: 'stowage', label: 'Rear stowage', default: true, note: 'Rolled tarpaulin and jerrycans on the rear plate' },
    { kind: 'toggle', id: 'star', label: 'White stars', default: true, note: 'Hull-side national star' },
  ],
  build(config) {
    const P = pal();
    const t = turret(P, config.gun !== 'm1a1');
    t.position.set(0, H.roof, TURRET.z);
    t.userData.campMotion = { kind: 'turret', pivot: [0, 0, 0], muzzle: [0, TURRET.gunY, TURRET.muzzleZ] };
    return group(
      [runningGear(P), hull(P), t, fittings(P, { stowage: config.stowage !== false, star: config.star !== false })],
      { name: 'm18-hellcat' },
    );
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/M18_Hellcat',
      'https://afvdatabase.com/usa/m18hellcat.html',
      'https://www.historyofwar.org/articles/weapons_M18_76mm_HMC_Hellcat.html',
    ],
    notes:
      'Overall length, width, height, ground clearance, track centres, track pitch/shoe count and ground contact length follow the published data; road wheel and idler diameters, the road wheel disc pattern, plate junction heights and fitting positions are proportioned from photographs. The turret interior is simplified (breech and recoil guard, three seats, a ready-round rack, a stowage box and handwheels; no traverse gear or wiring). The hull interior below the turret basket is not modelled. Tool and stowage layout follows common period practice rather than one specific vehicle; the rear idler is shown toothed like the sprocket.',
  },
  view: { yaw: 35, pitch: 14 },
  order: 30,
};
export default def;
