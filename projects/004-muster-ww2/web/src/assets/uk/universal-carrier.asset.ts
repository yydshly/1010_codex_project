/**
 * Carrier, Universal, No. 1 Mk II ("Bren carrier"), United Kingdom, 1943-44, in S.C.C. No. 15 olive drab.
 * Procedurally modelled; part modules live in ./universal-carrier/ (dims.ts holds the reference numbers).
 */
import { THREE, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { pal } from './universal-carrier/palette';
import { runningGear } from './universal-carrier/running';
import { hull } from './universal-carrier/hull';
import { interior } from './universal-carrier/interior';
import { fittings } from './universal-carrier/fittings';
import { BREN } from './universal-carrier/dims';

/** The Bren Mk II on its hood mounting (loaded lazily; if the weapon module fails, the mount stays empty). */
async function bren(): Promise<THREE.Object3D | null> {
  try {
    const mod = await import('./weapons/bren-mk2.model');
    const w = mod.buildBrenMk2({ bipod: 'folded', magazine: true });
    const o = w.object;
    o.position.set(...BREN.origin);
    return o;
  } catch (e) {
    console.warn('uk-universal-carrier: Bren model unavailable, mount left empty', e);
    return null;
  }
}

const def: AssetDef = {
  id: 'uk-universal-carrier',
  name: 'Universal Carrier Mk II',
  subtitle: 'Light tracked carrier',
  faction: 'uk',
  category: 'Vehicles',
  countAs: 'vehicles',
  summary:
    'The Universal Carrier, widely known as the Bren gun carrier, was the standard light tracked carrier of British and Commonwealth infantry and the most numerous armoured vehicle of the war. This British-built No. 1 Mk II shows the open-topped hull with the driver on the right and the Bren gunner on the left, the Ford V8 in the centre between the rear compartments, and Horstmann-sprung running gear, in 1944 S.C.C. No. 15 olive drab.',
  facts: [
    { label: 'Crew', value: '4 (Mk II layout): driver, gunner and two in the rear compartments' },
    { label: 'Engine', value: 'Ford V8 side-valve petrol, 85 hp; "No. 1" denotes the British-built engine' },
    { label: 'Armament', value: '.303 in Bren light machine gun on the front mounting' },
    { label: 'Armour', value: '7-10 mm' },
    { label: 'Length', value: '3.66 m (12 ft)' },
    { label: 'Width / height', value: '2.06 m (6 ft 9 in) / 1.57 m (5 ft 2 in)' },
    { label: 'Weight', value: 'About 3.3 t unladen, 3.9 t laden' },
    { label: 'Speed', value: '30 mph (48 km/h)' },
    { label: 'Suspension', value: 'Horstmann coil springs: front two-wheel bogie and rear single wheel each side' },
    { label: 'Produced', value: 'Mk II from late 1942; about 113,000 carriers of all types built (1934-1960)' },
  ],
  status: 'available',
  footprint: { w: 2.06, l: 3.66 },
  spacing: { default: 6, min: 4, max: 12 },
  maxQuantity: 16,
  options: [
    { kind: 'toggle', id: 'bren', label: 'Bren gun', default: true, note: 'Bren Mk II on the hood mounting; off leaves the mounting empty' },
  ],
  async build(config) {
    const P = pal();
    const parts: THREE.Object3D[] = [runningGear(P), hull(P), interior(P), fittings(P)];
    if (config.bren !== false) {
      const g = await bren();
      if (g) parts.push(g);
    }
    return group(parts, { name: 'universal-carrier-mk2' });
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Universal_Carrier',
      'https://www.historyofwar.org/articles/weapons_universal_carrier.html',
      'https://www.armyvehicles.dk/universacarriermkii.htm',
      'https://en.wikipedia.org/wiki/Horstmann_suspension',
      'https://tracksandtrade.com/lots/ww-ii-universal-carrier-tracks',
      'https://finescale.com/product-info/kit-reviews/2014/05/riich-universal-carrier/',
      'https://hmvf.co.uk/topic/47286-carrier-confusion/',
      'https://www.migjimenez.com/en/acrylic-colors/410-scc-15-british-1944-45-olive-drab.html',
    ],
    notes:
      'Overall length, width, height, the three-road-wheel Horstmann arrangement, the rear sprocket / front idler layout, the crew positions and the 167-link track are from the references; plate junctions, wheel and fitting positions are proportioned from photographs and published scale drawings against those totals, and the track pitch is derived from the link count. The engine is enclosed (not modelled inside the housing); rear-compartment stowage, the spare track links on the nose and the absence of unit markings are representative choices rather than one specific vehicle. The Bren Mk II is the project\'s own weapon model.',
  },
  view: { yaw: 35, pitch: 18 },
  order: 20,
};
export default def;
