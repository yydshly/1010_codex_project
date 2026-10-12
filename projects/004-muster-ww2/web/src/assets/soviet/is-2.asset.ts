/**
 * IS-2 Model 1944 heavy tank (late production, Chelyabinsk Kirov Plant, cast straightened nose), Soviet Union.
 * Procedurally modelled; part modules live in ./is-2/ (dims.ts holds the reference numbers).
 */
import { THREE, group, mirrorX } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { pal } from './is-2/palette';
import { H, R, T } from './is-2/dims';
import { roadWheelPair, sprocket, returnRoller, suspension, toothAngle } from './is-2/running';
import { solveTrack, buildTrack, linkAnglesAround } from './is-2/track';
import { hull } from './is-2/hull';
import { turret } from './is-2/turret';
import { stowage } from './is-2/stowage';

function buildIS2(opts: { aa: boolean; tanks: boolean }): THREE.Object3D {
  const P = pal();
  const sol = solveTrack();
  // running gear of the left side (+X), mirrored for the right
  const side: THREE.Object3D[] = [];
  const wheel = roadWheelPair(P);
  for (const z of R.wheelZ) {
    const w = wheel.clone();
    w.position.set(R.trackX, R.wheelY, z);
    side.push(w);
  }
  const idl = wheel.clone();
  idl.position.set(R.trackX, R.idlerY - 0.004, sol.idlerZ);
  side.push(idl);
  const rr = returnRoller(P);
  for (const z of R.rrZ) {
    const r = rr.clone();
    r.position.set(R.trackX, R.rrY - 0.002, z);
    side.push(r);
  }
  // sprocket phased so that its teeth enter the link windows (teeth sit at the link centres)
  const sp = sprocket(P);
  sp.position.set(R.trackX, R.sprocketY, R.sprocketZ);
  const la = linkAnglesAround(sol, [R.sprocketZ, R.sprocketY], R.sprocketR);
  if (la.length) sp.rotation.x = toothAngle(0) - la[0];
  side.push(sp);
  side.push(suspension(P, sol.idlerZ));
  side.push(buildTrack(P, sol));
  const tur = turret(P, opts.aa);
  tur.position.set(0, H.yR, T.z);
  return group([mirrorX(group(side)), hull(P), tur, stowage(P, opts.tanks)], { name: 'is-2' });
}

const def: AssetDef = {
  id: 'su-is-2',
  name: 'IS-2 Model 1944',
  subtitle: 'Heavy tank',
  faction: 'soviet',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'Soviet heavy tank armed with the 122 mm D-25T gun, built by the Chelyabinsk Kirov Plant (ChKZ) from late 1943 to 1945 and used by Guards heavy tank regiments and brigades until the end of the war. This model shows a late Model 1944 tank with the straightened cast nose and the wide gun mantlet in 4BO green; the 12.7 mm DShK anti-aircraft machine gun on the commander\'s cupola, fitted from early 1945, is optional.',
  facts: [
    { label: 'Crew', value: '4 (commander, gunner, loader, driver)' },
    { label: 'Main gun', value: '122 mm D-25T (48 calibres), 28 separate-loading rounds' },
    { label: 'Machine guns', value: '3 x 7.62 mm DT (coaxial, fixed bow, turret rear); 12.7 mm DShK AA from 1945' },
    { label: 'Weight', value: '46 t' },
    { label: 'Engine', value: 'V-2-IS (V-2-10) V-12 diesel, 520 hp' },
    { label: 'Length', value: '9.83 m with gun forward (hull 6.77 m)' },
    { label: 'Width / height', value: '3.07 m / 2.63-2.73 m (sources differ)' },
    { label: 'Armour', value: 'Upper glacis 120 mm at 60 deg; turret front 100 mm' },
    { label: 'Produced', value: '1943-1945' },
  ],
  status: 'available',
  footprint: { w: 3.2, l: 9.83 },
  spacing: { default: 10.5, min: 5, max: 20 },
  maxQuantity: 12,
  options: [
    {
      kind: 'toggle',
      id: 'aa',
      label: 'DShK AA machine gun',
      default: true,
      note: 'Cupola-ring mount, fitted from early 1945',
    },
    {
      kind: 'toggle',
      id: 'tanks',
      label: 'External fuel tanks',
      default: true,
      note: 'Four tanks (360 l in all) on the rear of the track guards; the saddles stay when removed',
    },
  ],
  build(config) {
    return buildIS2({ aa: config.aa !== false, tanks: config.tanks !== false });
  },
  view: { yaw: 35, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://ru.wikipedia.org/wiki/%D0%98%D0%A1-2',
      'https://en.wikipedia.org/wiki/IS-2',
      'https://armor.photos/Tanks/WWII/IS2/is2_2.php',
      'https://tanks-encyclopedia.com/ww2/soviet/soviet_is-ii.php',
      'https://nuou.org.ua/en/is-2.html',
      'https://commons.wikimedia.org/wiki/File:IS-2_scheme.jpg',
      'https://commons.wikimedia.org/wiki/Category:IS-2_at_the_American_Heritage_Museum',
    ],
    notes:
      'Exterior only, hatches closed, no crew or interior. The cast turret is a smooth signed-distance approximation proportioned from a scale drawing and photographs; casting numbers and foundry marks are omitted, and the gun embrasure behind the bent-plate mantlet is simplified. Weld beads and plate joints are idealised and the belly seams are not modelled. Running gear follows the published figures (six dual 550 mm road wheels, three return rollers, rear sprocket with two 14-tooth rings, 86 single-horn 650 mm links per side), with simplified castings. Stowage (ZIP box, tow cable, shovel, crowbar, spare links, four 90-litre external tanks) follows late-war photographs; exact positions are estimated. The fixed bow DT port is shown (the bow gun was later deleted; sources give no date), and the DShK mount is simplified. No markings, since tactical numbers and slogans varied by unit. Model length is 9.83 m; the top of the cupola hatch is at 2.77 m (2.63-2.73 m quoted).',
  },
  order: 30,
};

export default def;
