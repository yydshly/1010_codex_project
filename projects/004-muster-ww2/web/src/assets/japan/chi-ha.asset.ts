/**
 * Type 97 medium tank Chi-Ha, original version with the 57 mm Type 97 tank gun, Japan.
 * Procedurally modelled; part modules live in ./chi-ha/ (dims.ts holds the reference numbers).
 */
import { group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { pal } from './chi-ha/palette';
import { runningGear } from './chi-ha/running';
import { hull } from './chi-ha/hull';
import { turret } from './chi-ha/turret';
import { fittings } from './chi-ha/fittings';
import { H, T } from './chi-ha/dims';

const def: AssetDef = {
  id: 'jp-chi-ha',
  name: 'Type 97 Chi-Ha',
  subtitle: 'Medium tank (57 mm gun)',
  faction: 'japan',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    "The Type 97 Chi-Ha was the Imperial Japanese Army's most widely produced medium tank of the Second World War: a riveted design with an air-cooled V-12 diesel engine and bell-crank suspension. This model shows the original version with the small two-man turret, the short 57 mm Type 97 gun and the horseshoe radio antenna round the turret, in the three-colour camouflage used from 1942.",
  facts: [
    { label: 'Crew', value: '4' },
    { label: 'Main gun', value: 'Type 97 57 mm tank gun (semi-flexible mount)' },
    { label: 'Machine guns', value: '2 x 7.7 mm Type 97 (hull front left, turret rear)' },
    { label: 'Engine', value: 'Mitsubishi SA12200VD air-cooled V-12 diesel, 170 hp' },
    { label: 'Weight', value: '14.3 - 15.2 t' },
    { label: 'Length / width / height', value: '5.50 m / 2.33 m / 2.21 m' },
    { label: 'Armour', value: '8 - 25 mm, riveted' },
    { label: 'Suspension', value: 'Bell crank, 6 road wheels per side; 96 links per track' },
    { label: 'Produced', value: '1938 - 1942 (57 mm gun version)' },
  ],
  status: 'available',
  footprint: { w: 2.33, l: 5.5 },
  spacing: { default: 8, min: 5.5, max: 14 },
  maxQuantity: 12,
  options: [
    {
      kind: 'toggle',
      id: 'antenna',
      label: 'Radio antenna',
      default: true,
      note: 'Horseshoe ("hachimaki") antenna round the turret, fitted to radio-equipped tanks',
    },
  ],
  build(config) {
    const P = pal();
    const t = turret(P, config.antenna !== false);
    t.position.set(T.x, H.yRoof, T.z);
    return group([runningGear(P), hull(P), t, fittings(P)], { name: 'chi-ha' });
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Type_97_Chi-Ha_medium_tank',
      'https://www.globalsecurity.org/military/world/japan/type-97-chi-ha-design.htm',
      'https://miniordnancerev.blogspot.com/2016/03/japanese-tank-painting-guide.html',
    ],
    notes:
      'Overall dimensions, crew, armament, suspension layout (six double road wheels, the centre four in two bogies, three return rollers, front sprocket, rear idler, 96 single-horn links) follow the references; the nose plates are modelled a little steeper than the published 80 / 62 degrees so the nose closes over the final drives; plate junction heights, the turret plan, fitting positions and the tool stowage are proportioned from photographs and published drawings, not factory drawings. The layout of the exhaust silencers and tools follows common photographs rather than one specific vehicle. Paint is the 1942 three-colour scheme (parched-grass khaki base with dark green and mahogany brown patches, no yellow stripe); unit markings are omitted. Hatches are closed and no interior is modelled.',
  },
  view: { yaw: 35, pitch: 14 },
  order: 20,
};
export default def;
