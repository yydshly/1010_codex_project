/** MPL-50 small infantry shovel with its canvas cover, on the shared item plinth. */
import { THREE, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { itemPlinth } from '../shared/display';
import { restLevelZ } from './gear/helpers';
import { buildMPL50Shovel, buildMPL50Cover } from './gear/mpl50';

const def: AssetDef = {
  id: 'su-mpl50-shovel',
  name: 'MPL-50 Infantry Shovel',
  subtitle: 'Small entrenching tool with canvas cover',
  faction: 'soviet',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary:
    'The Red Army small infantry shovel, named for its 50 cm overall length: a flat steel blade with sharpened lower ' +
    'edges on a plain hardwood handle. Wartime examples have a crimp ring over the socket straps; it was carried on ' +
    'the waist belt in a fabric cover.',
  facts: [
    { label: 'Length', value: '500 mm overall' },
    { label: 'Blade', value: 'approx. 150 x 180 mm' },
    { label: 'Handle', value: 'Unpainted hardwood' },
  ],
  status: 'available',
  footprint: { w: 0.28, l: 0.58 },
  spacing: { default: 0.45, min: 0.3, max: 1.2 },
  maxQuantity: 40,
  options: [
    {
      kind: 'select',
      id: 'display',
      label: 'Display',
      default: 'cover',
      choices: [
        { id: 'cover', label: 'In canvas cover' },
        { id: 'apart', label: 'Shovel and cover apart' },
      ],
    },
  ],
  view: { yaw: 40, pitch: 28, fit: 1.05 },
  order: 30,
  build(cfg) {
    const apart = cfg.display === 'apart';
    // lie flat: handle towards +Z, concave face down so the shovel rests on its blade edges
    const lay = (o: THREE.Object3D, _tilt: number) => {
      o.rotation.x = Math.PI / 2;
      const g = group([o]);
      restLevelZ(o);
      return g;
    };
    if (!apart) {
      const shovel = buildMPL50Shovel({ grainAxis: [0, 0, 1] });
      const cover = buildMPL50Cover({ state: 'fitted', cell: 0.0046 });
      const item = lay(group([shovel, cover]), -0.004);
      item.position.z = -0.25;
      return itemPlinth(group([item]), 0.035);
    }
    const shovel = lay(buildMPL50Shovel({ grainAxis: [0, 0, 1] }), -0.015);
    shovel.position.set(0.06, 0, -0.25);
    const cover = lay(buildMPL50Cover({ state: 'empty', cell: 0.0046 }), 0);
    cover.rotation.y = Math.PI;
    cover.position.set(-0.12, 0, 0.14);
    // cover rests flat: drop it to the shovel's lowest level
    const bs = new THREE.Box3().setFromObject(shovel, true), bc = new THREE.Box3().setFromObject(cover, true);
    cover.position.y += bs.min.y - bc.min.y;
    return itemPlinth(group([shovel, cover]), 0.035);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/MPL-50',
      'https://en.topwar.ru/179180-samaja-znamenitaja-sapernaja-lopatka.html',
    ],
    notes:
      'Blade outline, socket straps and cover are simplified from photographs; cover closure is shown as a strap with ' +
      'a wire buckle. Weight is not stated because published figures vary between variants.',
  },
};
export default def;
