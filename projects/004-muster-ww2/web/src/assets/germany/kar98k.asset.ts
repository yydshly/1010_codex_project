/** Kar98k rifle - standalone catalog entry on the shared weapon display stand. */
import { THREE, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { weaponStand } from '../shared/display';
import { buildKar98k, kar98kCradleRestPoints } from './weapons/kar98k.model';

const def: AssetDef = {
  id: 'de-kar98k',
  name: 'Kar98k',
  subtitle: 'Bolt-action rifle, 7.92 x 57 mm',
  faction: 'germany',
  category: 'Weapons',
  countAs: 'looseEquipment',
  summary:
    'The Karabiner 98 kurz is a Mauser bolt-action rifle adopted by the Wehrmacht in 1935 as its standard service rifle. ' +
    'It fed from a five-round internal magazine loaded with stripper clips and was produced from 1934 to 1945.',
  facts: [
    { label: 'Adopted', value: '1935' },
    { label: 'Calibre', value: '7.92 x 57 mm Mauser' },
    { label: 'Length', value: '1,110 mm' },
    { label: 'Barrel', value: '600 mm' },
    { label: 'Weight', value: '3.7-4.1 kg' },
    { label: 'Magazine', value: '5-round internal, stripper-clip loaded' },
    { label: 'Produced', value: '1934-1945' },
  ],
  status: 'available',
  footprint: { w: 0.14, l: 1.14 },
  spacing: { default: 0.34, min: 0.2, max: 1.8 },
  maxQuantity: 40,
  view: { yaw: 40, pitch: 16 },
  order: 20,
  options: [{ kind: 'toggle', id: 'sling', label: 'Leather sling', default: true, note: 'Issue sling carried on the left side' }],
  build(config, ctx) {
    const k98 = buildKar98k({ detail: ctx.detail });
    const onStand = { ...k98, restPoints: kar98kCradleRestPoints(k98) };
    const stand = weaponStand(onStand, { height: 0.12, sling: config.sling !== false, slingSlack: 0.02, overhang: 0.07 });
    // centre the footprint (rifle + stand) on the origin
    const b = new THREE.Box3().setFromObject(stand, true);
    stand.position.set(-(b.min.x + b.max.x) / 2, 0, -(b.min.z + b.max.z) / 2);
    return group([stand]);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Karabiner_98k',
      'https://en.wikipedia.org/wiki/Mauser_M_98',
      'https://www.k98kforum.com/threads/when-did-the-laminates-start.44593/',
      'https://www.gunboards.com/threads/k98k-stock-wood-question.184048/',
      'https://www.imfdb.org/wiki/Karabiner_98k',
    ],
    notes:
      'Represents a 1940s-production rifle with a solid walnut stock (laminated stocks, introduced from 1937, were ' +
      'more common in mid-war production; walnut continued to be fitted), cupped butt plate, hooded front sight and ' +
      'a leather sling on the left side. Overall and barrel length follow the published figures; stock contours, ' +
      'sight and band positions are proportioned from photographs. Manufacturer codes, proof and acceptance stamps ' +
      'and serial numbers are omitted; the internal mechanism is modelled only where visible.',
  },
};
export default def;
