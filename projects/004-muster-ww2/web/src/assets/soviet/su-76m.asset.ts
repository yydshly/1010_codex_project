/**
 * SU-76M light self-propelled gun (late production, 1944-45), Soviet Union.
 * Procedurally modelled; part modules live in ./su-76m/ (dims.ts holds the reference numbers).
 */
import { THREE, group, mirrorX } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { pal } from './su-76m/palette';
import { R } from './su-76m/dims';
import { roadWheel, sprocket, returnRoller, suspension, toothAngle } from './su-76m/running';
import { solveTrack, buildTrack, linkAnglesAround } from './su-76m/track';
import { hull } from './su-76m/hull';
import { casemate, FLOOR } from './su-76m/casemate';
import { gunMount } from './su-76m/gun';

function buildSU76M(opts: { tarp: boolean }): THREE.Object3D {
  const P = pal();
  const sol = solveTrack();
  const side: THREE.Object3D[] = [];
  const wheel = roadWheel(P);
  for (const z of R.wheelZ) {
    const w = wheel.clone();
    w.position.set(R.trackX, R.wheelY, z);
    side.push(w);
  }
  // rear idler: the road-wheel pattern on the tensioner crank
  const idl = wheel.clone();
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
  return group([mirrorX(group(side)), hull(P), casemate(P, opts.tarp), gunMount(P, FLOOR)], { name: 'su-76m' });
}

const def: AssetDef = {
  id: 'su-su-76m',
  name: 'SU-76M',
  subtitle: 'Light self-propelled gun',
  faction: 'soviet',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'Soviet light self-propelled gun built on lengthened T-70 light tank components, with a 76.2 mm ZiS-3 divisional gun in a thinly armoured casemate that is open at the top and partly at the rear. With 13,732 built from 1943, it was the most numerous Soviet self-propelled gun of the war. This model shows a late-production vehicle in 4BO green.',
  facts: [
    { label: 'Crew', value: '4' },
    { label: 'Main gun', value: '76.2 mm ZiS-3Sh (ZiS-3 ordnance), 60 rounds' },
    { label: 'Engines', value: 'Two GAZ-202 six-cylinder petrol engines, 2 x 70 hp' },
    { label: 'Weight', value: '10.5-11.2 t (sources differ)' },
    { label: 'Length / width / height', value: 'About 5.0 m / 2.72 m / 2.1-2.2 m' },
    { label: 'Armour', value: '25-35 mm front, 10-15 mm sides; open-topped casemate' },
    { label: 'Suspension', value: 'Torsion bars, six road wheels and three return rollers per side' },
    { label: 'Produced', value: '13,732 SU-76M (1943-1945)' },
  ],
  status: 'available',
  footprint: { w: 2.75, l: 5.05 },
  spacing: { default: 8, min: 3.5, max: 18 },
  maxQuantity: 16,
  options: [
    {
      kind: 'toggle',
      id: 'tarp',
      label: 'Rolled tarpaulin',
      default: true,
      note: 'Crew canvas cover rolled and tied along the left side of the casemate',
    },
  ],
  build(config) {
    return buildSU76M({ tarp: config.tarp !== false });
  },
  view: { yaw: 35, pitch: 16 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/SU-76',
      'https://ru.wikipedia.org/wiki/%D0%A1%D0%A3-76',
      'https://www.ospreypublishing.com/us/discover/osprey-publishing/machine-of-the-month/su-76m/',
      'https://www.o5m6.de/redarmy/su_76m.php',
      'https://tanks-encyclopedia.com/su-76m-in-yugoslav-service/',
      'http://www.missing-lynx.com/reviews/russia/tamiya35348reviewcs_1.html',
    ],
    notes:
      'Overall dimensions (about 5.0 x 2.74 x 2.14 m, 0.30 m clearance), the plate angles (upper front 60 deg, lower front 30 deg, casemate front 25 deg, casemate sides about 20 deg), the running-gear layout (six 550 mm road wheels on torsion bars, three return rollers, front sprocket, rear idler of the road-wheel pattern, 300 mm small-link tracks) and the ZiS-3 ordnance follow published figures; plate junction heights, the casemate plan and all fitting positions are estimated from photographs. The engines and fuel tanks are internal and not modelled; their layout (engines in line on the right, fuel tanks on the left of the driver) is shown only through the roof fittings (engine hatch, radiator grille and outlet louvre on the right, filler caps on the left) and the twin exhaust mufflers on the right track guard, whose exact positions are approximate. The late-production higher rear plate with a door and two pistol ports is shown. The gun mount, moving shield and armoured recoil-gear cover are simplified; the interior is simplified (pedestal, hand wheels, sight, seats, part of the 60-round load in racks, stowed DT machine gun) and the driver\'s compartment is not modelled. No markings, since tactical numbers and slogans varied by unit.',
  },
  order: 30,
};

export default def;
