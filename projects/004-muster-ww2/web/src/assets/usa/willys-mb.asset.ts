/**
 * Willys MB 1/4-ton 4x4 truck ("jeep"), 1944 production with the stamped nine-slot grille,
 * Olive Drab. Model built in src/assets/usa/willys-mb/:
 *   dims.ts (verified dimensions, TM 9-803), palette.ts, util.ts,
 *   body.ts (tub, cowl, dash panel, hood, grille, lamps, fenders, bumper, rear fittings, star),
 *   windscreen.ts (frame, glass, wipers, mirror, arms; raised or folded),
 *   wheel.ts (6.00-16 tyre on the combat wheel), chassis.ts (frame, springs, axles, steering,
 *   drivetrain, exhaust, pintle), interior.ts (seats, steering wheel, instruments, controls),
 *   stowage.ts (axe, shovel, fuel can, spare wheel, folded top and bows).
 */
import type { AssetDef, AssetConfig } from '../../core/types';
import { THREE, group } from '../../core/kit';
import { D } from './willys-mb/dims';
import { buildBody } from './willys-mb/body';
import { buildChassis } from './willys-mb/chassis';
import { buildInterior } from './willys-mb/interior';
import { buildStowage } from './willys-mb/stowage';
import { buildWindscreen } from './willys-mb/windscreen';
import { buildWheel } from './willys-mb/wheel';

function buildWillys(cfg: AssetConfig): THREE.Object3D {
  const kids: THREE.Object3D[] = [
    buildBody({ star: cfg.star !== false }),
    buildChassis(),
    buildInterior(),
    buildStowage(),
    buildWindscreen({ folded: cfg.windscreen === 'folded' }),
  ];
  const spins = [11, 137, 58, 203];
  let i = 0;
  for (const z of [D.zF, D.zR]) {
    for (const s of [1, -1]) {
      const w = buildWheel('road', spins[i++], -D.axleY);
      w.position.set(s * D.wheelX, D.axleY, z);
      // 本地演示关节标记；普通 bake 仍按原方式合并。
      w.userData.campMotion = { kind: 'wheel', radius: D.tyreR, pivot: [0, 0, 0], front: z === D.zF };
      if (s < 0) w.scale.x = -1;
      kids.push(w);
    }
  }
  return group(kids, { name: 'willys-mb' });
}

const def: AssetDef = {
  id: 'us-willys-mb',
  name: 'Willys MB',
  subtitle: '1/4-ton 4x4 truck ("jeep")',
  faction: 'usa',
  category: 'Vehicles',
  countAs: 'vehicles',
  summary:
    'The standard US Army 1/4-ton 4x4 command and reconnaissance truck of the Second World War, built by Willys-Overland ' +
    'and, to the same design, by Ford as the GPW. A four-cylinder "Go Devil" engine, three-speed gearbox and two-speed transfer case ' +
    'drove both solid axles on leaf springs. Shown as a 1944 vehicle in Olive Drab with the stamped nine-slot grille and the canvas top folded.',
  facts: [
    { label: 'Produced', value: '1941-1945' },
    { label: 'Built', value: 'Over 359,000 Willys MB and over 277,000 Ford GPW' },
    { label: 'Crew', value: '2 operating, 5 persons including crew' },
    { label: 'Engine', value: 'Willys L134 "Go Devil", 2.2 L four-cylinder, 60 hp gross' },
    { label: 'Drive', value: '4x4, 3-speed gearbox, 2-speed transfer case' },
    { label: 'Length', value: '3.37 m (132 5/8 in)' },
    { label: 'Width', value: '1.57 m (62 in)' },
    { label: 'Height', value: '1.77 m top up, 1.32 m top down' },
    { label: 'Wheelbase', value: '2.03 m (80 in)' },
    { label: 'Track', value: '1.24 m (49 in)' },
    { label: 'Weight', value: '1,113 kg road weight (2,453 lb)' },
    { label: 'Tyres', value: '6.00-16 on 16 x 4.50E combat wheels' },
    { label: 'Top speed', value: '105 km/h (65 mph)' },
  ],
  status: 'available',
  footprint: { w: 1.575, l: 3.37 },
  spacing: { default: 6, min: 4, max: 14 },
  maxQuantity: 12,
  options: [
    {
      kind: 'select',
      id: 'windscreen',
      label: 'Windscreen',
      choices: [
        { id: 'up', label: 'Raised' },
        { id: 'folded', label: 'Folded on the hood' },
      ],
      default: 'up',
    },
    { kind: 'toggle', id: 'star', label: 'Hood star', default: true, note: 'White national star on the hood' },
  ],
  build(cfg) {
    return buildWillys(cfg);
  },
  view: { yaw: 35, pitch: 16 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://archive.org/details/TM9-803 (TM 9-803, 1/4-ton 4x4 truck, War Department 1944)',
      'https://archive.org/stream/TM9-803-nsia/TM9-803_djvu.txt',
      'https://en.wikipedia.org/wiki/Willys_MB',
      'https://www.jeepdatabase.com/willys-mb',
      'https://www.willysjeepparts.com/Blackout_Lights.htm',
      'https://wwiijeepparts.com/Archives/WWIIJeepTools.html',
      'https://jeepvillage.com/en/windshield/1066-windshield-glass.html',
    ],
    notes:
      'Wheelbase, length, width, heights, tread, ground clearance, tyre and wheel size, spring lengths and leaf counts follow TM 9-803 (1944); ' +
      'windscreen pane size follows reproduction glass data. Body heights, overhangs, panel shapes and fitting positions are estimated from ' +
      'photographs of preserved vehicles. Lamp layout follows TM 9-803 and parts references (sealed-beam headlamps behind the grille, ' +
      'blackout marker lamps on the grille below them, hooded blackout driving lamp on the left fender, combination tail lamps); the axe and ' +
      'shovel sit on the body left side, the fuel can at the rear left and the spare wheel at the rear right as listed for WWII vehicles, but ' +
      'their exact brackets are simplified. The engine compartment is closed: only the radiator, the underside of the engine, gearbox, ' +
      'transfer case, propeller shafts and exhaust are modelled. The steering-wheel spoke pattern, instrument layout and data plates are ' +
      'approximated; the non-directional tread is a simplified bar pattern without sidewall lettering. Wiring, brake and fuel lines, the fuel ' +
      'tank under the driver seat and the side curtains are not modelled. The canvas top is shown folded and strapped on the folded bows. ' +
      'The only marking is the optional white hood star; registration numbers and unit markings are omitted.',
  },
  order: 10,
};

export default def;
