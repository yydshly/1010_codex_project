/**
 * 105 mm Howitzer M2A1 on Carriage M2A1, United States.
 * Procedurally modelled; see ./m2a1-howitzer/ for the part modules and dims.ts for the reference numbers.
 */
import type { AssetDef } from '../../core/types';
import { buildM2a1 } from './m2a1-howitzer/build';

const def: AssetDef = {
  id: 'us-m2a1-howitzer',
  name: '105 mm Howitzer M2A1',
  subtitle: 'Light field howitzer on Carriage M2A1',
  faction: 'usa',
  category: 'Artillery',
  countAs: 'artillery',
  summary:
    'The standard US light field howitzer of the Second World War, later redesignated M101. The M2A1 tube with a horizontal sliding-wedge breech and a hydropneumatic recoil mechanism, its recuperator carried above the tube, sits on the split-trail Carriage M2A1 with the early single-layer shield and 9.00-20 combat tyres. Shown in olive drab.',
  facts: [
    { label: 'Calibre', value: '105 mm (tube 2.36 m, L/22.5)' },
    { label: 'Breech', value: 'Horizontal sliding wedge' },
    { label: 'Recoil', value: 'Hydropneumatic, constant, 42 in (1.07 m)' },
    { label: 'Elevation / traverse', value: '-5 to +66 deg / 23 deg right and left' },
    { label: 'Weight (travelling)', value: 'About 4,475 lb (2,030 kg)' },
    { label: 'Length / width / height', value: 'About 5.9 m / 2.15 m / 1.52 m travelling' },
    { label: 'Maximum range', value: 'About 12,200 yd (11.2 km) with HE' },
    { label: 'Produced', value: '1941-1953; about 8,500 built during the war, 10,202 in all' },
  ],
  status: 'available',
  footprint: { w: 4.0, l: 5.6 },
  spacing: { default: 7.5, min: 4.5, max: 14 },
  maxQuantity: 12,
  options: [
    {
      kind: 'select',
      id: 'trails',
      label: 'Trails',
      choices: [
        { id: 'deployed', label: 'Deployed', note: 'Trails spread, spades on the ground, tube elevated' },
        { id: 'closed', label: 'Closed', note: 'Trails brought together for towing, tube level' },
      ],
      default: 'deployed',
    },
  ],
  build(config, ctx) {
    return buildM2a1({ trails: config.trails === 'closed' ? 'closed' : 'deployed', detail: ctx.detail });
  },
  view: { yaw: 35, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://archive.org/details/TM9-1325',
      'https://en.wikipedia.org/wiki/M101_howitzer',
      'https://www.historyofwar.org/articles/weapons_105mm_howitzer_M2.html',
      'https://militaria.british-classic-motorcycles.co.uk/index.php/105-mm-howitzer-m2/',
      'https://americangimuseum.org/collections/restored-vehicles/m2a1-105mm-howitzer-1941-1953/',
      'https://commons.wikimedia.org/wiki/Category:M101_105_mm_howitzers_in_museums',
    ],
    notes:
      'Key numbers from TM 9-1325 (1944): howitzer 2.574 m muzzle to breech face, tube 2.363 m, travelling length ~5.9 m, ' +
      'width over hub caps 2.146 m, height ~1.52 m, 9.00-20 combat tyres. The M2A1 carriage has no firing jack: it fires ' +
      'from its wheels and spades, the axle pivoting on the equalizing support. Deployed shows the tube at 14 deg; Closed ' +
      'shows the unhitched travel layout (trails together, lunette on the centre line, tube level), resting on the spades. ' +
      'Simplified or approximated from photographs, kit references and manual figures rather than drawings: the early ' +
      'shield outline (the separate top shield is not modelled), elevating-arc and equilibrator arrangement, gearbox and ' +
      'handwheel layout (elevating handwheel shown on the right, traversing on the left), sight mounts and spade shape. ' +
      'Internal recoil, breech and firing mechanisms are not modelled; the cleaning staff, trail lock, lanyard, ' +
      'ammunition and markings are omitted; spades rest on the display surface instead of being dug in.',
  },
  order: 30,
};

export default def;
