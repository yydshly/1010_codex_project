/** Browning Automatic Rifle M1918A2 - standalone catalog entry (display stand, or set down on its bipod). */
import { THREE, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import type { WeaponModel } from '../shared/contracts';
import { buildBarM1918A2, barRestContours, buildBarSlingLocal, BAR_M1918A2 } from './weapons/bar-m1918a2.model';
import { presentOnStand } from './weapons/common/stand';

function onStand(w: WeaponModel, slingOn: boolean) {
  const [cr, cf] = barRestContours();
  const [rear, front] = [...w.restPoints].sort((a, b) => a.z - b.z);
  return presentOnStand(w, {
    rest: [
      { p: rear, contour: cr },
      { p: front, contour: cf },
    ],
    sling: slingOn,
    slingSlack: 0.03,
    // the swivels are under the gun: on the stand the strap is laid to the viewer's side of the cradles
    slingBuild: (g, slack, cradles) => buildBarSlingLocal(g.clone().add(new THREE.Vector3(0.55, 0, 0)).normalize(), slack, cradles, new THREE.Vector3(1, 0, 0), 'folded'),
    clearance: 0.02,
    overhang: 0.07,
  });
}

/** Set the gun down on its deployed bipod: pitched nose-up so the skid feet and the butt toe touch y = 0. */
function onBipod(w: WeaponModel, slingOn: boolean) {
  const holder = new THREE.Group();
  holder.rotation.x = -BAR_M1918A2.bipodPitch;
  holder.add(w.object.clone(true));
  if (slingOn && w.sling) {
    const gLocal = new THREE.Vector3(0, -1, 0).applyQuaternion(holder.quaternion.clone().invert());
    holder.add(w.sling.build(gLocal, 0.02));
  }
  holder.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(holder, true);
  const c = b.getCenter(new THREE.Vector3());
  holder.position.set(-c.x, -b.min.y, -c.z);
  return group([holder]);
}

const def: AssetDef = {
  id: 'us-bar-m1918a2',
  name: 'BAR M1918A2',
  subtitle: 'Automatic rifle, .30-06',
  faction: 'usa',
  category: 'Weapons',
  countAs: 'looseEquipment',
  summary:
    'The Browning Automatic Rifle M1918A2, authorized in 1938, was the automatic rifle of the U.S. rifle squad in the Second World War. ' +
    'A gas-operated .30-06 weapon fed from a 20-round box magazine, it fires automatic only, at a selectable slow or fast rate, and ' +
    'carries a skid-footed bipod at the muzzle.',
  facts: [
    { label: 'Authorized', value: '30 June 1938 (M1918A2)' },
    { label: 'Calibre', value: '.30-06 Springfield' },
    { label: 'Action', value: 'Gas-operated, open bolt, automatic only' },
    { label: 'Rate of fire', value: 'Slow 300-450 / fast 500-650 rounds/min' },
    { label: 'Length', value: '1,214 mm (47.8 in)' },
    { label: 'Barrel', value: '610 mm (24 in)' },
    { label: 'Weight', value: '8.8 kg (19.4 lb) without magazine' },
    { label: 'Feed', value: '20-round box magazine' },
  ],
  status: 'available',
  footprint: { w: 0.18, l: 1.26 },
  spacing: { default: 0.42, min: 0.25, max: 2.2 },
  maxQuantity: 30,
  view: { yaw: 40, pitch: 16 },
  order: 35,
  options: [
    {
      kind: 'select',
      id: 'display',
      label: 'Display',
      default: 'stand',
      choices: [
        { id: 'stand', label: 'On stand', note: 'Bipod folded, on the collection stand' },
        { id: 'bipod', label: 'On bipod', note: 'Set down on its skid feet and the butt' },
      ],
    },
    { kind: 'toggle', id: 'sling', label: 'Web sling', default: true, note: 'Olive-drab cotton web sling' },
  ],
  build(config, ctx) {
    const bipod = config.display === 'bipod' ? 'deployed' : 'folded';
    const w = buildBarM1918A2({ bipod, detail: ctx.detail });
    const slingOn = config.sling !== false;
    return bipod === 'deployed' ? onBipod(w, slingOn) : onStand(w, slingOn);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/M1918_Browning_automatic_rifle',
      'https://www.inetres.com/gp/military/infantry/rifle/M1918.html',
      'https://man.fas.org/dod-101/sys/land/docs/m1918.htm',
      'https://www.forgottenweapons.com/bar-comparison-m1918-vs-m1918a2/',
      'https://www.americanrifleman.org/content/the-browning-automatic-rifle-a-combat-chronicle/',
      'https://commons.wikimedia.org/wiki/File:Army_Heritage_Museum_B.A.R..jpg',
      'https://commons.wikimedia.org/wiki/File:BAR-M1918A2-batey-haosef-1.jpg',
      'https://commons.wikimedia.org/wiki/File:M1918_Variants.jpg',
    ],
    notes:
      'Represents a 1943-44 M1918A2 with walnut butt stock and hand guard (black plastic stocks were also used from 1942), Parkerized ' +
      'metal, a blued 20-round magazine and an olive-drab M1923-pattern web sling. Overall and barrel length, sight radius and the ' +
      'layout follow published figures and museum photographs (flat-sided receiver with the sloped rear, rear sight at the rear with ' +
      'the windage knob on the right, charging handle on the left, ejection port cover on the right, change lever S / F / A on the ' +
      'left of the trigger housing, magazine release in the front of the guard, wing-shaped A2 magazine guides, deep hand guard with ' +
      'finger grooves and the heat shield, front swivel just ahead of the hand guard, gas cylinder bracket with the regulator, hooded ' +
      'front sight with light ports, bipod with wing-nut locks, telescoping legs and skid feet on the flash hider). Dimensions of the ' +
      'individual parts are proportioned from those, not measured. The hinged shoulder rest is shown folded. Omitted: the butt ' +
      'monopod (dropped from production in 1942) and the barrel carrying handle (a late-war addition); the action is shown closed, ' +
      'internal parts, the rate reducer in the butt, receiver markings and serial numbers are not modelled.',
  },
};
export default def;
