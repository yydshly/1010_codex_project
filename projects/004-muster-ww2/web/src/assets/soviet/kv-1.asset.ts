/**
 * KV-1 Model 1941 heavy tank (welded turret, 76.2 mm ZiS-5), Soviet Union.
 * Procedurally modelled; part modules live in ./kv-1/ (dims.ts holds the reference numbers).
 */
import { THREE, group, mirrorX } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { pal } from './kv-1/palette';
import { H, R, T } from './kv-1/dims';
import { roadWheelPair, idler, sprocket, returnRoller, suspension, toothAngle } from './kv-1/running';
import { solveTrack, buildTrack, linkAnglesAround } from './kv-1/track';
import { hull } from './kv-1/hull';
import { turret } from './kv-1/turret';
import { stowage } from './kv-1/stowage';

function buildKV1(opts: { tanks: boolean }): THREE.Object3D {
  const P = pal();
  const sol = solveTrack();
  const side: THREE.Object3D[] = [];
  const wheel = roadWheelPair(P);
  for (const z of R.wheelZ) {
    const w = wheel.clone();
    w.position.set(R.trackX, R.wheelY, z);
    side.push(w);
  }
  const idl = idler(P);
  idl.position.set(R.trackX, R.idlerY - 0.002, sol.idlerZ);
  side.push(idl);
  const rr = returnRoller(P);
  for (const z of R.rrZ) {
    const r = rr.clone();
    r.position.set(R.trackX, R.rrY - 0.002, z);
    side.push(r);
  }
  const sp = sprocket(P);
  sp.position.set(R.trackX, R.sprocketY, R.sprocketZ);
  const la = linkAnglesAround(sol, [R.sprocketZ, R.sprocketY], R.sprocketR);
  if (la.length) sp.rotation.x = toothAngle(0) - la[0];
  side.push(sp);
  side.push(suspension(P, sol.idlerZ));
  side.push(buildTrack(P, sol));
  const tur = turret(P);
  tur.position.set(0, H.yR, T.z);
  return group([mirrorX(group(side)), hull(P), tur, stowage(P, opts.tanks)], { name: 'kv-1' });
}

const def: AssetDef = {
  id: 'su-kv-1',
  name: 'KV-1 Model 1941',
  subtitle: 'Heavy tank, welded turret',
  faction: 'soviet',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'Soviet heavy tank named after Kliment Voroshilov, whose thick armour made it very hard to stop for German anti-tank guns in 1941. This model shows a late-1941 Chelyabinsk-built tank with the welded turret, the longer 76.2 mm ZiS-5 gun fitted from the autumn of 1941, bolted applique plates on the hull sides and the external fuel tanks, in 4BO green.',
  facts: [
    { label: 'Crew', value: '5' },
    { label: 'Main gun', value: '76.2 mm ZiS-5 (41.6 calibres), fitted from autumn 1941' },
    { label: 'Machine guns', value: '3 x 7.62 mm DT (coaxial, bow, turret rear)' },
    { label: 'Weight', value: '47.5 t' },
    { label: 'Engine', value: 'V-2K V-12 diesel, 600 hp' },
    { label: 'Length / width / height', value: '6.68 m hull / 3.32 m / 2.71 m' },
    { label: 'Armour', value: 'Hull front 75 mm; 25-35 mm applique plates added in 1941' },
    { label: 'Suspension', value: 'Torsion bars, six road wheels and three return rollers per side; 700 mm tracks' },
  ],
  status: 'available',
  footprint: { w: 3.5, l: 7.4 },
  spacing: { default: 9.5, min: 5, max: 20 },
  maxQuantity: 12,
  options: [
    {
      kind: 'toggle',
      id: 'tanks',
      label: 'External fuel tanks',
      default: true,
      note: 'Five 160-litre tanks on the track guards (Chelyabinsk, late 1941); the saddles stay when removed',
    },
  ],
  build(config) {
    return buildKV1({ tanks: config.tanks !== false });
  },
  view: { yaw: 35, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/KV-1',
      'https://ru.wikipedia.org/wiki/%D0%9A%D0%92-1',
      'https://kv1ehkranami.narod.ru/kv1_z41.html',
      'https://www.o5m6.de/redarmy/kv_1m1941late.php',
      'https://tanks-encyclopedia.com/ww2/soviet/soviet_kv-1.php',
    ],
    notes:
      'Exterior only, hatches closed, no crew or interior. Overall dimensions (hull 6.675 m, width 3.32 m, height 2.71 m, 0.45 m clearance), the running-gear layout (six dual 600 mm road wheels, three rubber-tyred return rollers, rear sprocket, 700 mm single-horn links on a 160 mm pitch) and the ZiS-5 barrel length follow published figures; plate angles and junction heights, the turret plan and all fitting positions are estimated from photographs. The length with the gun forward (about 7.2 m) follows from the barrel length and is not a published figure. The welded turret is idealised (flat plates, simplified mantlet and vision devices); the road wheels are the 1941 ribbed rubber-tyred pattern, simplified. Stowage (five 160-litre tanks, ZIP boxes, tow cable, shovel, crowbar) follows descriptions of late-1941 Chelyabinsk tanks; exact positions are estimated. No markings, since tactical numbers and slogans varied by unit.',
  },
  order: 20,
};

export default def;
