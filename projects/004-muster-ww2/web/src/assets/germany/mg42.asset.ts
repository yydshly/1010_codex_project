/** MG 42 machine gun - standalone catalog entry: on the shared weapon stand, or resting on its bipod. */
import { THREE, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { weaponStand } from '../shared/display';
import { buildMg42, mg42BipodStance, mg42CradleRestPoints } from './weapons/mg42.model';

function centred(o: THREE.Object3D): THREE.Group {
  const g = group([o]);
  const b = new THREE.Box3().setFromObject(g, true);
  o.position.x -= (b.min.x + b.max.x) / 2;
  o.position.z -= (b.min.z + b.max.z) / 2;
  return g;
}

const def: AssetDef = {
  id: 'de-mg42',
  name: 'MG 42',
  subtitle: 'General-purpose machine gun, 7.92 x 57 mm',
  faction: 'germany',
  category: 'Weapons',
  countAs: 'looseEquipment',
  summary:
    'The Maschinengewehr 42 is a recoil-operated, belt-fed machine gun built largely from stamped sheet steel, introduced in 1942. ' +
    'It fired from 50-round belts or a 50-round belt drum at a very high cyclic rate and had a quick-change barrel; it was used on a bipod ' +
    'as a light machine gun or on a tripod.',
  facts: [
    { label: 'Service', value: '1942-1945 (Wehrmacht)' },
    { label: 'Calibre', value: '7.92 x 57 mm Mauser' },
    { label: 'Length', value: '1,220 mm' },
    { label: 'Barrel', value: '530 mm' },
    { label: 'Weight', value: '11.6 kg' },
    { label: 'Feed', value: '50-round belts or 50-round belt drum' },
    { label: 'Rate of fire', value: '1,200 rounds/min (approx.)' },
    { label: 'Produced', value: '1942-1945, approx. 423,600' },
  ],
  status: 'available',
  footprint: { w: 0.3, l: 1.26 },
  spacing: { default: 0.6, min: 0.3, max: 2.5 },
  maxQuantity: 30,
  view: { yaw: 40, pitch: 16 },
  order: 40,
  options: [
    {
      kind: 'select',
      id: 'display',
      label: 'Display',
      choices: [
        { id: 'stand', label: 'On stand', note: 'Bipod folded' },
        { id: 'bipod', label: 'On bipod', note: 'Resting on its bipod and butt' },
      ],
      default: 'stand',
    },
    { kind: 'toggle', id: 'drum', label: 'Belt drum', default: true, note: '50-round drum with the belt entering the feed tray' },
    { kind: 'toggle', id: 'sling', label: 'Carrying sling', default: true },
  ],
  constrain(config) {
    if (config.display === 'bipod') {
      return { config: { ...config, sling: false }, constraints: { disabled: { sling: 'Not shown when resting on the bipod' } } };
    }
    return { config };
  },
  build(config, ctx) {
    const drum = config.drum !== false;
    if (config.display === 'bipod') {
      const st = mg42BipodStance();
      const mg = buildMg42({ bipod: 'deployed', drum, detail: ctx.detail, groundPitchDeg: st.pitchDeg });
      const holder = group([mg.object]);
      holder.rotation.x = -THREE.MathUtils.degToRad(st.pitchDeg);
      holder.position.y = st.originHeight;
      return centred(holder);
    }
    const mg = buildMg42({ bipod: 'folded', drum, detail: ctx.detail });
    const onStand = { ...mg, restPoints: mg42CradleRestPoints(mg) };
    return centred(weaponStand(onStand, { height: 0.165, sling: config.sling !== false, slingSlack: 0.018, overhang: 0.06 }));
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/MG_42',
      'https://www.dday-overlord.com/en/material/weaponry/mg-42',
      'https://www.brpguns.com/content/mg42semimanual.pdf',
      'https://www.bergflak.com/Mgrem.html',
      'https://www.bergflak.com/Mgrem2.html',
      'https://www.mg42.us/viewtopic.php?t=14049',
      'https://forum.axishistory.com/viewtopic.php?t=65071',
    ],
    notes:
      'Represents a mid-war MG 42 with a Bakelite butt stock, bipod on the front holder and a 50-round belt drum. Overall and ' +
      'barrel length follow the published figures; receiver, jacket perforations, sights and bipod are proportioned from ' +
      'photographs. The carrying sling is simplified to a single leather strap (the issue sling had two straps and a padded ' +
      'middle section). Markings and the internal mechanism are omitted; the barrel and bolt are modelled only where visible.',
  },
};
export default def;
