/** Thompson M1A1 submachine gun - standalone catalog entry on the shared weapon display stand. */
import { THREE } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { buildThompsonM1A1, thompsonRestContours, buildThompsonSlingLocal } from './weapons/thompson-m1a1.model';
import { presentOnStand } from './weapons/common/stand';

const def: AssetDef = {
  id: 'us-thompson-m1a1',
  name: 'Thompson M1A1',
  subtitle: 'Submachine gun, .45 ACP',
  faction: 'usa',
  category: 'Weapons',
  countAs: 'looseEquipment',
  summary:
    'The M1A1 was the simplified wartime Thompson submachine gun, standardized in October 1942 and made by Auto-Ordnance and Savage Arms. ' +
    'It has a side cocking handle, a fixed peep rear sight with protective wings, a plain barrel and a horizontal fore-grip, and fires .45 ACP ' +
    'from 20- or 30-round box magazines.',
  facts: [
    { label: 'Standardized', value: 'October 1942' },
    { label: 'Calibre', value: '.45 ACP' },
    { label: 'Action', value: 'Blowback, selective fire' },
    { label: 'Length', value: '810 mm' },
    { label: 'Barrel', value: '267 mm (10.5 in)' },
    { label: 'Weight', value: '4.5 kg (empty)' },
    { label: 'Feed', value: '20- or 30-round box magazine' },
    { label: 'Produced', value: '539,143 (M1A1)' },
  ],
  status: 'available',
  footprint: { w: 0.14, l: 0.86 },
  spacing: { default: 0.34, min: 0.2, max: 1.6 },
  maxQuantity: 40,
  view: { yaw: 40, pitch: 16 },
  order: 30,
  options: [
    {
      kind: 'select',
      id: 'magazine',
      label: 'Magazine',
      default: '30',
      choices: [
        { id: '30', label: '30-round box' },
        { id: '20', label: '20-round box' },
        { id: 'none', label: 'No magazine' },
      ],
    },
    { kind: 'toggle', id: 'sling', label: 'Web sling', default: true, note: 'Olive-drab cotton web sling' },
  ],
  build(config, ctx) {
    const mag = config.magazine === '20' ? '20' : config.magazine === 'none' ? 'none' : '30';
    const w = buildThompsonM1A1({ magazine: mag, detail: ctx.detail });
    const [cr, cf] = thompsonRestContours();
    const [rear, front] = [...w.restPoints].sort((a, b) => a.z - b.z);
    return presentOnStand(w, {
      rest: [
        { p: rear, contour: cr },
        { p: front, contour: cf },
      ],
      sling: config.sling !== false,
      slingSlack: 0.05,
      // the swivels are under the gun: on the stand the strap is laid to the viewer's side of the cradles
      slingBuild: (g, slack, cradles) => buildThompsonSlingLocal(g.clone().add(new THREE.Vector3(0.55, 0, 0)).normalize(), slack, cradles, mag),
      clearance: 0.02,
      overhang: 0.07,
    });
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Thompson_submachine_gun',
      'https://www.machinegunboards.com/forums/index.php?/topic/95-patched-sling-swivel-socket/',
      'https://www.ima-usa.com/products/original-u-s-wwii-thompson-m1-m1a1-british-issue-anglicized-buttstock',
      'https://www.apexgunparts.com/thompson-horizontal-foregrip-usgi-nos.html',
    ],
    notes:
      'Represents a wartime M1A1 with Parkerized metal, walnut butt stock, pistol grip and horizontal fore-grip, a blued 30-round (or ' +
      '20-round) box magazine and an olive-drab web sling on the US-pattern swivels under the fore-grip and under the butt. Overall and ' +
      'barrel length follow the published figures; receiver, frame, grip, stock and sights are proportioned from those and from parts ' +
      'descriptions (side cocking handle on the right, selector and safety levers on the left, fixed peep sight with protective wings). ' +
      'The action is shown closed (bolt forward); internal parts, markings and serial numbers are not modelled. On the display stand the ' +
      'sling is laid to the viewer side of the cradles.',
  },
};
export default def;
