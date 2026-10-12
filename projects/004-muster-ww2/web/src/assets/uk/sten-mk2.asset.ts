/** Sten Mk II submachine gun - standalone catalog entry on the shared weapon display stand. */
import type { AssetDef } from '../../core/types';
import { buildStenMk2, stenStandRest } from './weapons/sten-mk2.model';
import { presentOnStand } from './weapons/common/stand';

const def: AssetDef = {
  id: 'uk-sten-mk2',
  name: 'Sten Mk II',
  subtitle: 'Submachine gun, 9 x 19 mm',
  faction: 'uk',
  category: 'Weapons',
  countAs: 'looseEquipment',
  summary:
    'The Sten was a simple, cheap blowback submachine gun made largely from stamped and tubular steel. The Mk II was the ' +
    'most common version, with some two million made; it fired from an open bolt and fed from a 32-round box magazine ' +
    'inserted horizontally from the left side.',
  facts: [
    { label: 'Calibre', value: '9 x 19 mm Parabellum' },
    { label: 'Action', value: 'Blowback, open bolt; single shot or automatic' },
    { label: 'Length', value: '762 mm' },
    { label: 'Barrel', value: '197 mm' },
    { label: 'Weight', value: '3.2 kg' },
    { label: 'Magazine', value: '32-round detachable box, side-mounted (left)' },
    { label: 'Rate of fire', value: 'About 500-600 rounds/min' },
    { label: 'Produced', value: 'About 2 million (Mk II)' },
  ],
  status: 'available',
  footprint: { w: 0.26, l: 0.8 },
  spacing: { default: 0.42, min: 0.28, max: 1.8 },
  maxQuantity: 40,
  view: { yaw: 38, pitch: 18 },
  order: 30,
  options: [
    { kind: 'toggle', id: 'sling', label: 'Web sling', default: true, note: '3/4 in web sling, hooked into the barrel sleeve' },
    { kind: 'toggle', id: 'magazine', label: 'Magazine fitted', default: true, note: '32-round box magazine in the left-side well' },
  ],
  build(config, ctx) {
    const w = buildStenMk2({ detail: ctx.detail, magazine: config.magazine !== false });
    return presentOnStand(w, { rest: stenStandRest(w), sling: config.sling !== false, slingSlack: 0.02, clearance: 0.02, overhang: 0.06, minHeight: 0.1 });
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Sten',
      'https://weaponsystems.net/system/1334-Sten',
      'https://www.machinegunboards.com/forums/index.php?%2Ftopic%2F24600-variants-butt-stock-for-sten-mk-ii-and-sten-mk-iii%2F=',
      'https://hatchfive.wordpress.com/2017/07/05/sten-gun-sling/',
      'https://commons.wikimedia.org/wiki/File:Sten_Mk_II_IMG_4781_(Nemo5576)_noBG.png',
      'https://commons.wikimedia.org/wiki/File:Pistolet_maszynowy_STEN,_Muzeum_Or%C5%82a_Bia%C5%82ego.jpg',
    ],
    notes:
      'Represents a late-production Mk II with the skeleton (loop) butt; early Mk IIs had a T-shaped tubular butt. Overall ' +
      'and barrel length follow the published figures; the receiver, trigger housing, collar, sleeve and butt proportions ' +
      'were measured from scaled side photographs of museum examples (barrel projection varies between sleeve patterns). ' +
      'The magazine is shown in the firing position (horizontal, left). The sling follows a described wartime 3/4 in web ' +
      'Sten sling (wire hook in the sleeve, brass loop round the butt, adjustable buckle); its exact fittings are ' +
      'approximated. Bolt and internal mechanism are simplified; maker codes and markings are omitted.',
  },
};
export default def;
