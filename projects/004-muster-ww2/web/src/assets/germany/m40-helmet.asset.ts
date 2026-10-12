/** M40 steel helmet (Stahlhelm M1940) - standalone Equipment entry. */
import { group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { itemPlinth } from '../shared/display';
import { buildM40Helmet, helmetRestPose } from './gear/helmet';

const def: AssetDef = {
  id: 'de-m40-helmet',
  name: 'M40 Steel Helmet',
  subtitle: 'Stahlhelm M1940 with M31 liner',
  faction: 'germany',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary:
    'The M1940 was a production simplification of the M1935 steel helmet: the rolled edge was kept, but the air vents were stamped directly into the shell instead of being separate inserts. ' +
    'It is shown in factory dull field grey with a rough finish and no decals, fitted with the M31 leather liner and chinstrap.',
  facts: [
    { label: 'Introduced', value: '1940 (replacing M1935 production)' },
    { label: 'Shell', value: 'Pressed steel, rolled edge, stamped vents' },
    { label: 'Liner', value: 'M31, leather on a metal band' },
    { label: 'Succeeded by', value: 'M1942 (unrolled edge)' },
  ],
  status: 'available',
  footprint: { w: 0.32, l: 0.36 },
  spacing: { default: 0.6, min: 0.4, max: 2 },
  maxQuantity: 40,
  view: { yaw: 35, pitch: 18 },
  order: 10,
  build() {
    const { tiltDeg, floorY } = helmetRestPose();
    const a = (tiltDeg * Math.PI) / 180;
    const helmet = buildM40Helmet({
      chinstrap: 'open',
      chinFloor: { n: [0, Math.cos(a), -Math.sin(a)], d: floorY },
    });
    const rested = group([helmet.object], { r: [tiltDeg, 0, 0] });
    return itemPlinth(group([rested]), 0.03);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Stahlhelm',
      'https://ww2depot.com/blog/m35-vs-m40-vs-m42-german-helmets/',
      'https://fjm44.com/articles/helmet-m40-q64/',
    ],
    notes:
      'Shell proportions approximated for a size 64 shell fitting a ~56-57 cm head; liner simplified to band, sweatband, nine fingers and drawstring. Maker and size stampings omitted. No decals are shown.',
  },
};
export default def;
