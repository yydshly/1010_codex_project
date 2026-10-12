/** M1910 canteen, cup and cover - standalone Equipment entry on the shared item plinth. */
import { THREE, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { itemPlinth } from '../shared/display';
import { buildCanteenCover, buildCanteenBody, buildCanteenCup, type CanteenMetal } from './gear/canteen';

const def: AssetDef = {
  id: 'us-m1910-canteen',
  name: 'M1910 Canteen, Cup and Cover',
  subtitle: 'One-quart canteen set',
  faction: 'usa',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary:
    'The US Army one-quart canteen used through both world wars: a kidney-shaped canteen nested in its folding-handle cup and ' +
    'carried in a felt-lined cotton duck cover that hooked to the belt with the M1910 wire hanger. Aluminium shortages brought ' +
    'corrosion-resistant steel canteens and cups into production during the war alongside aluminium ones.',
  facts: [
    { label: 'Capacity', value: '1 US quart (approx. 0.95 l)' },
    { label: 'Canteen', value: 'Aluminium or corrosion-resistant steel' },
    { label: 'Cap', value: 'Black plastic, chained to the neck' },
    { label: 'Cover', value: 'Cotton duck lined with wool felt, two lift-the-dot flaps' },
    { label: 'Attachment', value: 'M1910 double-hook wire hanger' },
  ],
  status: 'available',
  footprint: { w: 0.36, l: 0.26 },
  spacing: { default: 0.5, min: 0.3, max: 1.5 },
  maxQuantity: 40,
  options: [
    {
      kind: 'select',
      id: 'display',
      label: 'Display',
      default: 'set',
      choices: [
        { id: 'set', label: 'Cover with cup beside it', note: 'The cup is shown out of the cover' },
        { id: 'cover', label: 'In cover only' },
        { id: 'apart', label: 'Canteen and cup, no cover' },
      ],
    },
    {
      kind: 'select',
      id: 'metal',
      label: 'Canteen and cup',
      default: 'aluminium',
      choices: [
        { id: 'aluminium', label: 'Aluminium' },
        { id: 'stainless', label: 'Corrosion-resistant steel', note: 'Two halves with a horizontal seam' },
      ],
    },
  ],
  view: { yaw: 32, pitch: 18, fit: 1.05 },
  order: 30,
  build(cfg) {
    const metal = (cfg.metal === 'stainless' ? 'stainless' : 'aluminium') as CanteenMetal;
    const mode = String(cfg.display ?? 'set');
    const items: THREE.Object3D[] = [];
    if (mode !== 'apart') {
      const c = buildCanteenCover({ metal, shade: 'od7' }).object;
      c.rotation.y = mode === 'set' ? 0.35 : 0;
      c.position.x = mode === 'set' ? -0.085 : 0;
      items.push(c);
    }
    if (mode === 'set') {
      const cup = buildCanteenCup(metal, 'open');
      cup.rotation.y = -0.5;
      cup.position.set(0.085, 0, 0.04);
      items.push(cup);
    }
    if (mode === 'apart') {
      const can = buildCanteenBody(metal);
      can.position.x = -0.075;
      can.rotation.y = 0.3;
      const cup = buildCanteenCup(metal, 'open');
      cup.position.set(0.09, 0, 0.03);
      cup.rotation.y = -0.45;
      items.push(can, cup);
    }
    return itemPlinth(group(items), 0.03);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://americanmilitariareference.com/m-1910-canteen/',
      'https://www.moncasquem1.com/en-en/blogs/blog-mon-casque-m1/cover-canteen-mounted-dismounted-m1910',
      'https://www.dimensions.com/element/canteen-military',
      'https://www.ima-usa.com/products/original-u-s-wwii-m-1942-canteen-cup',
      'https://www.reddickmilitaria.com/us-ww2-weapons-field-gear/us-wwii-m1910-canteen-cover-light-od-canvas/',
    ],
    notes:
      'Canteen and cup sizes follow published approximate dimensions (canteen about 127 x 71 mm, cup about 140 x 76 x 95 mm); ' +
      'the exact kidney curvature is estimated. The cover shown is the side-seam type in OD No. 7 duck; maker and date stamps ' +
      'and the "U.S." marking are omitted. The cup handle latch is simplified.',
  },
};
export default def;
