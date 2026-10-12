/**
 * T-34-85 medium tank (1944, Factory No. 183 pattern), Soviet Union.
 * Procedurally modelled; part modules live in ./t-34-85/ (dims.ts holds the reference numbers).
 */
import { THREE, group, mirrorX } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { pal } from './t-34-85/palette';
import { H, R, T } from './t-34-85/dims';
import { roadWheelPair, idler, sprocket, suspension } from './t-34-85/running';
import { solveTrack, buildTrack, hornAnglesAround } from './t-34-85/track';
import { hull } from './t-34-85/hull';
import { turret } from './t-34-85/turret';
import { stowage } from './t-34-85/stowage';

function buildT34(opts: { tanks: boolean }): THREE.Object3D {
  const P = pal();
  const sol = solveTrack();
  // one side of running gear (the tank's left, +X), mirrored for the right
  const side: THREE.Object3D[] = [];
  const wheel = roadWheelPair(P);
  for (const z of R.wheelZ) {
    const w = wheel.clone();
    w.position.set(R.trackX, R.wheelY, z);
    side.push(w);
  }
  const id = idler(P);
  id.position.set(R.trackX, R.idlerY, sol.idlerZ);
  side.push(id);
  // sprocket phased so its rollers sit between the guide horns of the wrapped links
  const sp = sprocket(P);
  sp.position.set(R.trackX, R.sprocketY, R.sprocketZ);
  const horns = hornAnglesAround(sol, [R.sprocketZ, R.sprocketY], R.sprocketR + R.plateT / 2);
  if (horns.length) {
    let h = horns[0];
    for (const a of horns) if (Math.abs(Math.cos(a) + 1) < Math.abs(Math.cos(h) + 1)) h = a;
    const half = R.pitch / (R.sprocketR + R.plateT / 2);
    sp.rotation.x = (30 * Math.PI) / 180 - (h + half);
  }
  side.push(sp);
  side.push(suspension(P, sol.idlerZ));
  side.push(buildTrack(P, sol));
  const tur = turret(P);
  tur.position.set(0, H.yR, T.z);
  const parts: THREE.Object3D[] = [mirrorX(group(side)), hull(P, sol.idlerZ), tur];
  parts.push(stowage(P, opts.tanks));
  return group(parts, { name: 't34-85' });
}

const def: AssetDef = {
  id: 'su-t34-85',
  name: 'T-34-85',
  subtitle: 'Medium tank',
  faction: 'soviet',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'Soviet medium tank that combined the proven T-34 hull, V-2 diesel engine and Christie suspension with a larger three-man cast turret carrying the 85 mm ZiS-S-53 gun. Built from 1944 at Factories No. 183, 112 and 174; this model represents a 1944 Nizhny Tagil (Factory No. 183) tank in 4BO protective green.',
  facts: [
    { label: 'Crew', value: '5' },
    { label: 'Main gun', value: '85 mm ZiS-S-53 (54.6 calibres)' },
    { label: 'Machine guns', value: '2 x 7.62 mm DT (coaxial and hull)' },
    { label: 'Weight', value: '32 t' },
    { label: 'Engine', value: 'V-2-34 V-12 diesel, 500 hp' },
    { label: 'Length', value: '8.1 m with gun forward (hull 6.1 m)' },
    { label: 'Width / height', value: '3.0 m / 2.7 m' },
    { label: 'Armour', value: '45 mm glacis at 60 deg; 90 mm turret front' },
    { label: 'Produced', value: '1944-1946, 25,899 built' },
  ],
  status: 'available',
  footprint: { w: 3.0, l: 8.15 },
  spacing: { default: 9.5, min: 4, max: 18 },
  maxQuantity: 12,
  options: [
    {
      kind: 'toggle',
      id: 'tanks',
      label: 'External fuel tanks',
      default: true,
      note: 'Three 90-litre drums on the hull sides; crews often removed them before action',
    },
  ],
  build(config) {
    return buildT34({ tanks: config.tanks !== false });
  },
  view: { yaw: 35, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://ru.wikipedia.org/wiki/T-34-85',
      'https://victorymuseum.ru/encyclopedia/technic/bronetankovaya-tekhnika/sredniy-tank-t-34-85-obraztsa-1944-goda-sssr/',
      'https://riaslov.livejournal.com/2423.html',
      'https://www.onthewaymodels.com/articles/T-34-85turrets/Identification.htm',
      'https://tanks-encyclopedia.com/ww2/soviet/soviet_t34-85/',
    ],
    notes:
      'Exterior only, hatches closed, no crew or interior. The cast turret is approximated by lofted plan sections from photographs and published figures; casting numbers and foundry marks are omitted, and the ZiS-S-53 mantlet is simplified to a rounded cylindrical casting. Weld beads and plate joints are idealised. Stowage follows the 1944 Factory No. 183 layout described in the references (one 90-litre tank on the left and two on the right at the stern, large ZIP box, tow-cable lugs, headlight and horn on the left, small ZIP box and spare-link bosses on the right), but exact positions are estimated; the two-man saw, tarpaulin and smoke canisters are omitted and the tow cable is shown as a single length. Road wheels are the partially ribbed rubber-tyred type; tracks are 72 cast 500 mm links per side, alternating horned and flat. No markings, since tactical numbers and slogans varied by unit. Overall model length is 8.16 m against the 8.1-8.15 m quoted in sources.',
  },
  order: 10,
};

export default def;
