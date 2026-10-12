/**
 * Churchill Mk VII (Tank, Infantry, Mk IV, Churchill VII, A22F), United Kingdom, 1944.
 * Procedurally modelled; part modules live in ./churchill-vii/ (dims.ts holds the reference numbers).
 */
import { THREE, group, mirrorX } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { pal } from './churchill-vii/palette';
import { R, T } from './churchill-vii/dims';
import { bogie, idler, sprocket, finalDrive } from './churchill-vii/running';
import { solveTrack, buildTrack, linkAnglesAround } from './churchill-vii/track';
import { hull } from './churchill-vii/hull';
import { turret } from './churchill-vii/turret';
import { fittings } from './churchill-vii/fittings';

function buildChurchill(): THREE.Object3D {
  const P = pal();
  const sol = solveTrack();
  const side: THREE.Object3D[] = [];
  for (const z of R.wheelZ) {
    const b = bogie(P);
    b.position.set(R.trackX, R.wheelY, z);
    side.push(b);
  }
  const id = idler(P);
  id.position.set(R.trackX, R.idlerY, R.idlerZ);
  side.push(id);
  const sp = sprocket(P);
  sp.position.set(R.trackX, R.sprocketY, R.sprocketZ);
  const ang = linkAnglesAround(sol, [R.sprocketZ, R.sprocketY], R.sprocketPitchR * Math.cos(Math.PI / R.teeth));
  if (ang.length) sp.rotation.x = -ang[0];
  side.push(sp, finalDrive(P), buildTrack(P, sol));
  const tur = turret(P);
  tur.position.set(0, T.y, T.z);
  return group([mirrorX(group(side)), hull(P), fittings(P), tur], { name: 'churchill-vii' });
}

const def: AssetDef = {
  id: 'uk-churchill-vii',
  name: 'Churchill Mk VII',
  subtitle: 'Infantry tank (Tank, Infantry, Mk IV, Churchill VII, A22F)',
  faction: 'uk',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'Heavily armoured British infantry tank whose tracks run round the full height of the hull, over the side panniers, on eleven small-wheeled bogies per side. The Mk VII (A22F) was a major redesign with up to 152 mm of armour, round-cornered side doors and a composite cast and welded turret carrying the 75 mm OQF gun; shown as a 1944-45 vehicle in S.C.C. No. 15 olive drab.',
  facts: [
    { label: 'Crew', value: '5 (commander, gunner, loader/operator, driver, hull gunner)' },
    { label: 'Main gun', value: 'Ordnance QF 75 mm' },
    { label: 'Machine guns', value: '2 x 7.92 mm Besa (co-axial and hull)' },
    { label: 'Engine', value: 'Bedford twin-six horizontally opposed petrol, 350 hp' },
    { label: 'Weight', value: '40 long tons (40.6 t)' },
    { label: 'Length', value: '7.44 m (24 ft 5 in)' },
    { label: 'Width', value: '3.25 m (10 ft 8 in)' },
    { label: 'Armour', value: '152 mm hull and turret front, 95 mm sides' },
    { label: 'Suspension', value: 'Eleven coil-sprung bogies per side, two 10 in wheels each' },
    { label: 'Built', value: 'About 1,600 Mk VII and Mk VIII together' },
    { label: 'First action', value: 'June 1944 (Normandy)' },
  ],
  status: 'available',
  footprint: { w: 3.25, l: 7.44 },
  spacing: { default: 10, min: 4.5, max: 18 },
  maxQuantity: 12,
  build() {
    return buildChurchill();
  },
  view: { yaw: 35, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Churchill_tank',
      'https://www.historyofwar.org/articles/weapons_churchill_VII.html',
      'https://milart.blog/2020/09/07/the-churchill-mark-iv-infantry-tank-in-service-with-the-canadian-army-overseas-december-1942-to-may-1943/',
      'https://tankmuseum.org/tank-nuts/tank-collection/churchill-iv/',
    ],
    notes:
      'Exterior only, hatches closed, no crew or interior. Plate layout, the turret plan, the bogie spacing and the idler/sprocket positions were proportioned from published overall dimensions and photographs, not factory drawings. The published 7.44 m length is matched by the hull and tracks; the 75 mm muzzle projects beyond the front horns. Published heights differ between sources (2.49 m is commonly quoted for the family); the model stands about 2.7 m to the top of the Mk VII commander\'s cupola. Tracks are simplified cast links at the published 7.96 in pitch, spaced evenly round the modelled path: 80 per side, against the 72 quoted for the real track, because the estimated idler, sprocket and bogie positions give a path about 10 per cent longer than the real one; bogies, mud chutes, air intakes, exhausts and tools are simplified representations. No markings: census numbers and unit signs varied from vehicle to vehicle.',
  },
  order: 12,
};

export default def;
