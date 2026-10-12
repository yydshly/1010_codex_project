/**
 * Pz.Kpfw. V Panther Ausf. G (Sd.Kfz. 171) - medium tank, 1944-45 production: one-piece upper
 * side plates, no driver's visor (rotating periscope), bow MG ball mount, late chin mantlet,
 * Dunkelgelb with an optional restrained Olivgruen / Rotbraun camouflage.
 * Model modules live in ./panther-g/ (dims, materials, track, running-gear, hull, turret, fittings).
 * Config key `only` ('running' | 'wheels' | 'track' | 'sprocket' | 'idler' | 'suspension' | 'hull' |
 * 'turret') builds a single assembly for review; it is not a user-facing option.
 */
import { group, type THREE } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { palette } from './panther-g/materials';
import { runningGear } from './panther-g/running-gear';
import { hull, schuerzen } from './panther-g/hull';
import { turret } from './panther-g/turret';
import { fittings } from './panther-g/fittings';

const def: AssetDef = {
  id: 'de-panther-g',
  name: 'Panther Ausf. G',
  subtitle: 'Medium tank (Pz.Kpfw. V, Sd.Kfz. 171)',
  faction: 'germany',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'German medium tank designed by MAN, armed with the long 7.5 cm KwK 42 L/70 gun, with a sharply sloped 80 mm glacis ' +
    'and interleaved road wheels on double torsion bars. The Ausf. G, the last production model, introduced one-piece ' +
    'upper hull side plates and replaced the driver\'s vision flap with a rotating periscope.',
  facts: [
    { label: 'Produced', value: 'March 1944 - April 1945' },
    { label: 'Built', value: 'about 2,960 (Ausf. G)' },
    { label: 'Crew', value: '5' },
    { label: 'Main gun', value: '7.5 cm KwK 42 L/70' },
    { label: 'Machine guns', value: '2 x 7.92 mm MG 34' },
    { label: 'Weight', value: '44.8 t' },
    { label: 'Length', value: '8.66 m with gun (hull 6.87 m)' },
    { label: 'Width', value: '3.27 m (3.42 m with Schuerzen)' },
    { label: 'Height', value: '2.99 m' },
    { label: 'Engine', value: 'Maybach HL 230 P 30 (petrol)' },
  ],
  status: 'available',
  footprint: { w: 3.42, l: 6.87 },
  spacing: { default: 10, min: 7.5, max: 18 },
  maxQuantity: 12,
  options: [
    {
      kind: 'select',
      id: 'schuerzen',
      label: 'Schuerzen',
      choices: [
        { id: 'fitted', label: 'Fitted', note: 'Side skirt plates hung on the rails' },
        { id: 'removed', label: 'Removed', note: 'Skirt plates off; the hanger rails remain' },
      ],
      default: 'fitted',
    },
    {
      kind: 'select',
      id: 'paint',
      label: 'Paint',
      choices: [
        { id: 'dunkelgelb', label: 'Dunkelgelb', note: 'Factory base colour (RAL 7028)' },
        { id: 'camo', label: 'Three-tone', note: 'Olivgruen and Rotbraun sprayed over Dunkelgelb' },
      ],
      default: 'dunkelgelb',
    },
  ],
  build(config) {
    const pal = palette(config.paint === 'camo');
    const only = config.only as string | undefined;
    if (only === 'running' || only === 'wheels' || only === 'track' || only === 'sprocket' || only === 'idler' || only === 'suspension') return group([runningGear(pal, only)]);
    if (only === 'hull') return group([hull(pal)]);
    if (only === 'turret') return group([turret(pal)]);
    const kids: THREE.Object3D[] = [runningGear(pal), hull(pal), turret(pal), fittings(pal)];
    if (config.schuerzen !== 'removed') kids.push(...schuerzen(pal));
    return group(kids);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Panther_tank',
      'https://tanks-encyclopedia.com/ww2/germany/panzer-v_panther.php',
    ],
    notes:
      'Depicts a late Ausf. G (autumn 1944 onwards) with the chin mantlet, the rotating driver\'s periscope, the bow MG ' +
      'ball mount, rubber-tyred 860 mm road wheels and plain exhaust pipes in cast guards (no flame dampers), no ' +
      'Zimmerit. Plate layout, heights, the station spacing and fitting positions were derived from published overall ' +
      'dimensions, armour data and photographs, not from factory drawings; the drive sprocket and idler are shown ' +
      'narrower than the real parts so that they run clear of the interleaved wheels. Left and right wheel stations ' +
      'are symmetric (the real torsion bars stagger them). Hatches are closed and no interior is modelled; tool ' +
      'stowage is representative and simplified, the cupola AA MG and the antenna rods are not fitted. Markings are ' +
      'limited to Balkenkreuze (no unit or turret numbers). The optional three-tone scheme is a generic sprayed ' +
      'Olivgruen / Rotbraun pattern over Dunkelgelb, not the pattern of one documented vehicle.',
  },
  view: { yaw: 35, pitch: 14 },
  order: 35,
};

export default def;
