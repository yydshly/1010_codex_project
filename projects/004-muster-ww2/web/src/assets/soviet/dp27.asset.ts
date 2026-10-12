/** DP-27 light machine gun - standalone catalog entry (display stand, or set down on its bipod). */
import { THREE, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import type { WeaponModel } from '../shared/contracts';
import { buildDp27, dp27FrameSectionLocal, dp27GuideSectionLocal } from './weapons/dp27.model';
import { presentOnStand } from './weapons/common/stand';

function onStand(w: WeaponModel, slingOn: boolean) {
  const [rear, front] = [...w.restPoints].sort((a, b) => a.z - b.z);
  return presentOnStand(w, {
    rest: [
      { p: rear, contour: dp27FrameSectionLocal() },
      { p: front, contour: dp27GuideSectionLocal() },
    ],
    sling: slingOn,
    slingSlack: 0.02,
    clearance: 0.022,
    overhang: 0.06,
  });
}

/** Set the gun down on its deployed bipod: pitch it so the bipod feet and the butt both touch y = 0. */
function onBipod(w: WeaponModel, slingOn: boolean) {
  const pts: THREE.Vector3[] = [];
  w.object.updateMatrixWorld(true);
  const inv = w.object.matrixWorld.clone().invert();
  const v = new THREE.Vector3();
  w.object.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    const pa = m.geometry.attributes.position;
    for (let i = 0; i < pa.count; i += 3) pts.push(v.fromBufferAttribute(pa, i).applyMatrix4(mat).clone());
  });
  const minAt = (a: number, front: boolean) => {
    const c = Math.cos(a), s = Math.sin(a);
    let mn = Infinity;
    for (const p of pts) {
      if (front ? p.z < 0.45 : p.z > 0.2) continue;
      const y = p.y * c - p.z * s;
      if (y < mn) mn = y;
    }
    return mn;
  };
  let lo = THREE.MathUtils.degToRad(-35), hi = 0; // negative = nose up
  for (let k = 0; k < 40; k++) {
    const m = (lo + hi) / 2;
    if (minAt(m, true) - minAt(m, false) > 0) lo = m;
    else hi = m;
  }
  const pitch = (lo + hi) / 2;
  const holder = new THREE.Group();
  holder.rotation.x = pitch;
  holder.add(w.object.clone(true));
  if (slingOn && w.sling) {
    const gLocal = new THREE.Vector3(0, -1, 0).applyQuaternion(holder.quaternion.clone().invert());
    holder.add(w.sling.build(gLocal, 0.05));
  }
  holder.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(holder, true);
  const c = b.getCenter(new THREE.Vector3());
  holder.position.set(-c.x, -b.min.y, -c.z);
  return group([holder]);
}

const def: AssetDef = {
  id: 'su-dp27',
  name: 'DP-27',
  subtitle: 'Light machine gun, 7.62 x 54 mmR',
  faction: 'soviet',
  category: 'Weapons',
  countAs: 'looseEquipment',
  summary:
    'The Degtyaryov infantry machine gun (DP, also called DP-27 or DP-28) was the standard light machine gun of the Red Army ' +
    'in the Second World War. Gas-operated and firing only automatic from an open bolt, it fed from a flat 47-round pan magazine ' +
    'on top of the receiver, which earned it the nickname "record player".',
  facts: [
    { label: 'In service', value: 'From 1928 (Red Army)' },
    { label: 'Calibre', value: '7.62 x 54 mmR' },
    { label: 'Action', value: 'Gas-operated, automatic fire only, open bolt' },
    { label: 'Length', value: '1,270 mm' },
    { label: 'Barrel', value: '605 mm' },
    { label: 'Weight', value: '9.12 kg (without magazine)' },
    { label: 'Feed', value: '47-round pan magazine' },
    { label: 'Rate of fire', value: '500-600 rounds/min' },
    { label: 'Sights', value: 'Sector rear sight to 1,500 m; post front sight with protective ears' },
    { label: 'Produced', value: 'Kovrov, approx. 795,000' },
  ],
  status: 'available',
  footprint: { w: 0.3, l: 1.3 },
  spacing: { default: 0.5, min: 0.32, max: 3 },
  maxQuantity: 24,
  view: { yaw: 38, pitch: 16 },
  order: 40,
  options: [
    {
      kind: 'select',
      id: 'display',
      label: 'Display',
      default: 'stand',
      choices: [
        { id: 'stand', label: 'On stand', note: 'Bipod folded, on the collection stand' },
        { id: 'bipod', label: 'On bipod', note: 'Set down on its bipod and butt' },
      ],
    },
    {
      kind: 'select',
      id: 'barrel',
      label: 'Barrel',
      default: 'plain',
      choices: [
        { id: 'plain', label: 'Plain barrel', note: 'From 1938 the cooling fins were deleted' },
        { id: 'finned', label: 'Finned barrel', note: 'Early production: 26 transverse cooling fins' },
      ],
    },
    { kind: 'toggle', id: 'sling', label: 'Sling', default: true, note: 'Cotton webbing sling on the left side' },
  ],
  build(config) {
    const bipod = config.display === 'bipod' ? 'deployed' : 'folded';
    const w = buildDp27({ bipod, barrel: config.barrel === 'finned' ? 'finned' : 'plain' });
    const slingOn = config.sling !== false;
    return bipod === 'deployed' ? onBipod(w, slingOn) : onStand(w, slingOn);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Degtyaryov_machine_gun',
      'https://ru.wikipedia.org/wiki/%D0%94%D0%9F-27',
      'https://military.wikireading.ru/40469',
      'https://arsenal-info.ru/pub/pulemety/ruchnoy-pulemet-degtyareva-dp-27-patron-kalibr-7-62-mm-ustroystvo',
      'https://istochnik.us/the-dp-27/',
      'https://commons.wikimedia.org/wiki/File:DEGTYAREV_DP_28.jpg',
      'https://commons.wikimedia.org/wiki/File:Machine_gun_DP_MON.jpg',
      'https://commons.wikimedia.org/wiki/File:DP_disk_up.jpg',
      'https://commons.wikimedia.org/wiki/File:DP_disk_down.jpg',
    ],
    notes:
      'Proportions from the published overall and barrel lengths and scaled side-view photographs (265 mm pan). Layout after the ' +
      'manual: casing of two joined tubes (barrel tube with windows, guide tube below), front sight with protective ears on the ' +
      'casing front, sector rear sight on the receiver behind the pan, bipod collar with wing screw, sling swivels on the casing ' +
      'and on the left of the butt. Internal mechanism (bolt, locking flaps, recoil spring) is not modelled; the stamped pattern of ' +
      'the pan cover, the sling hardware and the rear-sight scale are approximations. No factory markings or serial numbers.',
  },
};
export default def;
