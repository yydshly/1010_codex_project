/**
 * GAZ-67B light 4x4 field car (1944-45 wartime production, welded vertical-bar grille,
 * 4BO green). Model built in src/assets/soviet/gaz-67b/.
 */
import type { AssetDef } from '../../core/types';
import { THREE, group } from '../../core/kit';
import { D } from './gaz-67b/dims';
import { buildBody, SPARE } from './gaz-67b/body';
import { buildInterior } from './gaz-67b/interior';
import { buildChassis } from './gaz-67b/chassis';
import { buildWheel } from './gaz-67b/wheel';

function buildGaz67b(): THREE.Object3D {
  const kids: THREE.Object3D[] = [buildBody(), buildInterior(), buildChassis()];
  const spins = [17, 131, 64, 208];
  let i = 0;
  for (const z of [D.zF, D.zR]) {
    for (const s of [1, -1]) {
      const w = buildWheel('road', spins[i++], -D.axleY);
      w.position.set(s * D.wheelX, D.axleY, z);
      if (s < 0) w.scale.x = -1;
      kids.push(w);
    }
  }
  const spare = buildWheel('spare', 40);
  spare.position.set(SPARE.x, SPARE.y, SPARE.z);
  spare.rotation.y = Math.PI / 2; // outer face towards the rear
  kids.push(spare);
  return group(kids, { name: 'gaz-67b' });
}

const def: AssetDef = {
  id: 'su-gaz67b',
  name: 'GAZ-67B',
  subtitle: 'Light 4x4 field car',
  faction: 'soviet',
  category: 'Vehicles',
  countAs: 'vehicles',
  summary:
    'Soviet four-wheel-drive light field car built by the Gorky Automobile Plant (GAZ), developed from the GAZ-64 with a wider track. ' +
    'The improved GAZ-67B replaced the GAZ-67 in production in January 1944 and served as a Red Army command and liaison vehicle. ' +
    'Shown as a wartime vehicle in 4BO green with the welded vertical-bar grille and the canvas top folded.',
  facts: [
    { label: 'Produced', value: 'January 1944 - 1953 (GAZ-67 from September 1943)' },
    { label: 'Built', value: '92,843 GAZ-67 and GAZ-67B' },
    { label: 'Drive', value: '4x4' },
    { label: 'Engine', value: 'Four-cylinder petrol, 3.28 L, 54 hp' },
    { label: 'Seats', value: '4' },
    { label: 'Length', value: '3.345 m' },
    { label: 'Width', value: '1.685 m' },
    { label: 'Wheelbase', value: '2.10 m' },
    { label: 'Track', value: '1.446 m' },
    { label: 'Weight', value: '1,320 kg' },
    { label: 'Top speed', value: '90 km/h' },
    { label: 'Tyres', value: '6.50-16' },
  ],
  status: 'available',
  footprint: { w: 1.69, l: 3.35 },
  spacing: { default: 6, min: 4, max: 14 },
  maxQuantity: 12,
  build() {
    return buildGaz67b();
  },
  view: { yaw: 35, pitch: 16 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/GAZ-67',
      'https://ru.wikipedia.org/wiki/%D0%93%D0%90%D0%97-67',
      'https://ru.wikipedia.org/wiki/%D0%93%D0%90%D0%97-67%D0%91',
      'https://victorymuseum.ru/encyclopedia/technic/avtomobilnaya-tekhnika/komandirskiy-avtomobil-povyshennoy-prokhodimosti-gaz-67b-sssr/',
      'https://avtoclassika.com/e/specifications-gaz-67/',
      'https://commons.wikimedia.org/wiki/Category:GAZ-67 (photographs of preserved vehicles)',
    ],
    notes:
      'Length, width, wheelbase (2.10 m, confirmed by several sources), track, overhangs and tyre size follow published data; ' +
      'body heights, panel shapes and fitting positions are estimated from photographs of preserved vehicles. ' +
      'Engine, gearbox and transfer case are simplified blocks under the bonnet and floor; the differentials are shown on the centre line and the exhaust routing is simplified. ' +
      'Wiring, brake cables and fuel lines are omitted. Seat pads are shown as dark leatherette; the canvas top is shown folded and strapped at the rear. ' +
      'No markings are applied.',
  },
  order: 20,
};

export default def;
