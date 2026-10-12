/** MP 40 submachine gun - standalone catalog entry on the shared weapon display stand. */
import { THREE, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import type { WeaponModel } from '../shared/contracts';
import { weaponStand } from '../shared/display';
import { buildMp40 } from './weapons/mp40.model';

/*
 * The shared stand's felt-lined cradles are U-rings (inner felt radius 15.5 mm, ring centre 13 mm above
 * the rest height). A flat-bottomed part of half-width hw with edge radius rc touches the felt at its
 * rounded edges, so the rest point handed to the stand is shifted by this amount to make the parts
 * actually meet the felt (no floating, no sinking).
 */
const FELT_R = 0.0185 - 0.003, FELT_C = 0.013;
const feltOffset = (hw: number, rc: number) => rc + Math.sqrt(Math.max(0, (FELT_R - rc) ** 2 - Math.max(0, hw - rc) ** 2)) - FELT_C;

const def: AssetDef = {
  id: 'de-mp40',
  name: 'MP 40',
  subtitle: 'Submachine gun, 9 x 19 mm',
  faction: 'germany',
  category: 'Weapons',
  countAs: 'looseEquipment',
  summary:
    'The Maschinenpistole 40 was a blowback-operated, open-bolt submachine gun developed from the MP 38 and built largely from ' +
    'stamped, spot-welded steel with phenolic-resin grips and handguard. It had an underfolding steel stock and fed from a ' +
    '32-round box magazine; about 1.1 million were made between 1940 and 1945.',
  facts: [
    { label: 'Produced', value: '1940-1945' },
    { label: 'Number built', value: 'approx. 1.1 million' },
    { label: 'Manufacturers', value: 'Erma, Haenel, Steyr' },
    { label: 'Calibre', value: '9 x 19 mm Parabellum' },
    { label: 'Action', value: 'Straight blowback, open bolt' },
    { label: 'Length', value: '833 mm (stock extended), 630 mm (folded)' },
    { label: 'Barrel', value: '251 mm' },
    { label: 'Weight', value: '3.97 kg' },
    { label: 'Magazine', value: '32-round box' },
    { label: 'Rate of fire', value: '500-550 rounds/min' },
  ],
  status: 'available',
  footprint: { w: 0.14, l: 0.86 },
  spacing: { default: 0.34, min: 0.2, max: 1.5 },
  maxQuantity: 24,
  view: { yaw: 40, pitch: 16 },
  order: 30,
  options: [{ kind: 'toggle', id: 'sling', label: 'Leather sling', default: true, note: 'Issue sling fitted to the right side' }],
  build(config) {
    const mp = buildMp40({ stock: 'extended' });
    // contact-corrected rest points: [lower housing (hw 12.5 mm, rc 1.5 mm), resting bar (hw 4.6 mm, rc 1.5 mm)]
    const [rear, front] = [...mp.restPoints].sort((a, b) => a.z - b.z);
    const rp = [rear.clone().setY(rear.y + feltOffset(0.0125, 0.0015)), front.clone().setY(front.y + feltOffset(0.0046, 0.0015))];
    const onStand: WeaponModel = { ...mp, restPoints: rp };
    // lift so the magazine floorplate clears the stand base (top at 0.039 m) by ~2 cm
    // (same levelling rotation as the stand applies)
    const pitch = Math.atan2(rp[1].y - rp[0].y, rp[1].z - rp[0].z);
    const probe = new THREE.Group();
    probe.rotation.x = pitch;
    probe.add(mp.object.clone(true));
    probe.updateMatrixWorld(true);
    const lowest = new THREE.Box3().setFromObject(probe, true).min.y;
    const r0y = rp[0].clone().applyQuaternion(probe.quaternion).y;
    const lift = 0.039 + 0.02 - 0.035 - (lowest - r0y);
    return group([weaponStand(onStand, { height: lift, sling: config.sling !== false, slingSlack: 0.03, overhang: 0.07 })]);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/MP_40',
      'https://www.weaponsystems.net/system/1567-MP%2040',
      'https://www.lonesentry.com/blog/schmeisser-mp40-submachine-gun.html',
      'https://www.mp40.nl/the-models/mp40',
      'https://www.mp40.nl/data-info/part-list',
      'https://mp40.nl/the-accessories/trageriemen-carrying-sling',
      'https://www.bergflak.com/mp40.html',
      'http://www.historyarms.com/fore_grip.html',
      'https://www.forgottenweapons.com/mp-40i-the-dual-magazine-experimental-mp-40/',
    ],
    notes:
      'Represents a mid-war MP 40: smooth receiver tube, ribbed magazine housing and magazine, two-part bolt handle, ' +
      'hex barrel-collar nut with the strap loop on the right, phenolic resting bar and folded-back 200 m rear-sight leaf. ' +
      'Proportions follow the published overall, folded and barrel lengths; the grip rake, rear-sight and ejection-port ' +
      'positions, slot sizes and sling hardware are close approximations from descriptions, not measured drawings. ' +
      'Grip plates are shown smooth. Maker codes, serial numbers and acceptance stamps are omitted. The internal mechanism ' +
      'is modelled only where visible (bolt, extractor, recoil-spring tube). Shown on the shared display stand.',
  },
};
export default def;
