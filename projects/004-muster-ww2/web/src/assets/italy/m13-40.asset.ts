/**
 * Carro Armato M13/40 (III serie, 1941), Kingdom of Italy.
 * Procedurally modelled; part modules live in ./m13-40/ (dims.ts holds the reference numbers).
 */
import { THREE, group, mirrorX } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { pal } from './m13-40/palette';
import { T } from './m13-40/dims';
import { solveTrack, buildTrack } from './m13-40/track';
import { runningGear } from './m13-40/running';
import { hull } from './m13-40/hull';
import { turret } from './m13-40/turret';
import { fittings } from './m13-40/fittings';

const def: AssetDef = {
  id: 'it-m13-40',
  name: 'Carro Armato M13/40',
  subtitle: 'Medium tank',
  faction: 'italy',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'Italian medium tank built by Ansaldo-Fossati from 1940 and the main tank of the Regio Esercito in North Africa in 1941, with a bolted hull, a two-man turret carrying a 47 mm 47/32 gun and a co-axial Breda machine gun, and twin Breda machine guns in the hull front. This model shows a III serie tank in the Saharan khaki (kaki sahariano) finish with short front mudguards and one spare road wheel at the rear.',
  facts: [
    { label: 'Crew', value: '4' },
    { label: 'Main gun', value: '47 mm 47/32 Mod. 35' },
    { label: 'Machine guns', value: '8 mm Breda Mod. 38: co-axial, twin hull mount, plus one anti-aircraft' },
    { label: 'Engine', value: 'SPA 8 T V-8 diesel, 125 hp' },
    { label: 'Weight', value: 'About 13-14 t combat loaded (sources differ)' },
    { label: 'Length / width / height', value: '4.92 m / 2.28 m / 2.37 m' },
    { label: 'Armour', value: '30 mm hull front, 25 mm sides, 42 mm gun mantlet' },
    { label: 'Suspension', value: 'Leaf-sprung bogies, 8 double road wheels per side; 26 cm tracks' },
    { label: 'Produced', value: 'Ansaldo-Fossati, 1940-41; 710 per Italian sources (other totals up to about 780)' },
  ],
  status: 'available',
  footprint: { w: 2.28, l: 4.92 },
  spacing: { default: 8, min: 5.5, max: 14 },
  maxQuantity: 14,
  options: [
    { kind: 'toggle', id: 'markings', label: 'Company markings', default: true, note: '1st company red rectangle, 1st platoon bar and tank number on the turret' },
    { kind: 'toggle', id: 'spareLinks', label: 'Spare track links', default: true, note: 'Carried on the glacis' },
  ],
  build(config) {
    const P = pal();
    const sol = solveTrack();
    const side: THREE.Object3D[] = [...runningGear(P, sol), buildTrack(P, sol)];
    const t = turret(P, config.markings !== false);
    t.position.set(0, T.y, T.z);
    return group(
      [mirrorX(group(side)), hull(P), t, fittings(P, sol, { links: config.spareLinks !== false, tools: true })],
      { name: 'm13-40' },
    );
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://tanks-encyclopedia.com/ww2/italy/carro-armato-m13-40/',
      'https://en.wikipedia.org/wiki/M13/40_tank',
      'https://www.regioesercito.it/pages/m13-40.html',
      'https://tanks-encyclopedia.com/ww2/italy/',
    ],
    notes:
      'Depicts a III serie tank (short front mudguards, tool boxes and silencers on the rear mudguards, one spare road wheel and the jack on the rear plate, roof bulge over the breech). Overall dimensions follow the published 4.915 x 2.28 x 2.37 m; plate junction heights, bogie spacing and fitting positions are proportioned from photographs, not factory drawings. The track has 80 links per side (regioesercito.it; other sources give 84). Hatches are closed and no interior is modelled; the radio mast is shown lowered and the anti-aircraft Breda is not fitted. Markings follow the 1940 Regio Esercito tactical system (company rectangle, platoon bars, vehicle number); the number plate is left blank.',
  },
  view: { yaw: 35, pitch: 14 },
  order: 10,
};
export default def;
