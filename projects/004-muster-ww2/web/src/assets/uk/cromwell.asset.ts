/**
 * Cromwell Mk IV (Tank, Cruiser, Mk VIII, Cromwell (A27M)), United Kingdom, 1944.
 * Procedurally modelled; part modules live in ./cromwell/ (dims.ts holds the reference numbers).
 */
import { THREE, group, mirrorX } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { pal } from './cromwell/palette';
import { R, T } from './cromwell/dims';
import { roadWheelPair, idler, sprocket, suspension } from './cromwell/running';
import { solveTrack, buildTrack, linkAnglesAround } from './cromwell/track';
import { hull } from './cromwell/hull';
import { turret } from './cromwell/turret';
import { fittings } from './cromwell/fittings';

function buildCromwell(): THREE.Object3D {
  const P = pal();
  const sol = solveTrack();
  // one side of running gear (the tank's left, +X), mirrored for the right
  const side: THREE.Object3D[] = [];
  for (const z of R.wheelZ) {
    const w = roadWheelPair(P);
    w.position.set(R.trackX, R.wheelY, z);
    side.push(w);
  }
  const id = idler(P);
  id.position.set(R.trackX, R.idlerY, sol.idlerZ);
  side.push(id);
  // sprocket phased so that its teeth sit in the windows of the wrapped links
  const sp = sprocket(P);
  sp.position.set(R.trackX, R.sprocketY, R.sprocketZ);
  const ang = linkAnglesAround(sol, [R.sprocketZ, R.sprocketY], R.sprocketPitchR * Math.cos(Math.PI / R.teeth));
  if (ang.length) sp.rotation.x = -ang[0];
  side.push(sp, suspension(P, sol.idlerZ), buildTrack(P, sol));
  const tur = turret(P);
  tur.position.set(0, T.y, T.z);
  return group([mirrorX(group(side)), hull(P), fittings(P), tur], { name: 'cromwell' });
}

const def: AssetDef = {
  id: 'uk-cromwell',
  name: 'Cromwell Mk IV',
  subtitle: 'Cruiser tank (Tank, Cruiser, Mk VIII, Cromwell, A27M)',
  faction: 'uk',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'British cruiser tank that combined Christie suspension with the Rolls-Royce Meteor, a tank engine derived from the Merlin aero engine, making it one of the fastest tanks of the war. The Mk IV, the most numerous version, carried the 75 mm OQF gun in a flat-sided turret with bolted armour plates; shown as a 1944 vehicle in S.C.C. No. 15 olive drab.',
  facts: [
    { label: 'Crew', value: '5 (commander, gunner, loader/operator, driver, hull gunner)' },
    { label: 'Main gun', value: 'Ordnance QF 75 mm (ROQF Mk V), L/40' },
    { label: 'Machine guns', value: '2 x 7.92 mm Besa (co-axial and hull)' },
    { label: 'Engine', value: 'Rolls-Royce Meteor V12 petrol, 600 hp' },
    { label: 'Weight', value: '27.6 long tons (28 t)' },
    { label: 'Length', value: '6.35 m (20 ft 10 in)' },
    { label: 'Width / height', value: '2.91 m / 2.49 m' },
    { label: 'Armour', value: '64 mm hull front, 76 mm turret front' },
    { label: 'Suspension', value: 'Christie, five road wheels per side' },
    { label: 'Built', value: '3,066 Cromwells of all marks' },
    { label: 'First action', value: 'June 1944 (Normandy)' },
  ],
  status: 'available',
  footprint: { w: 2.92, l: 6.35 },
  spacing: { default: 9, min: 4, max: 16 },
  maxQuantity: 12,
  build() {
    return buildCromwell();
  },
  view: { yaw: 35, pitch: 14 },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Cromwell_tank',
      'https://en.wikipedia.org/wiki/Ordnance_QF_75_mm',
      'https://en.wikipedia.org/wiki/Cruiser_Mk_VIII_Challenger',
      'https://tankmuseum.org/tank-nuts/tank-collection/cromwell/',
      'https://www.historyofwar.org/articles/weapons_cruiser_tank_mk_VIII_cromwell.html',
      'https://www.dday-overlord.com/en/material/tank/mk-iv-cromwell',
      'https://www.tapatalk.com/groups/missinglynx/how-many-track-links-on-cromwell-tank-t64250.html',
      'https://www.britmodeller.com/forums/index.php?/topic/235137106-cromwell-all-round-vision-cupola-plus-tracks/',
      'https://www.miniatures.de/colour-brown-scc-no-2.html',
    ],
    notes:
      'Exterior only, hatches closed, no crew or interior. Plate layout, the turret plan and the wheel stations were proportioned from published overall dimensions and photographs, not factory drawings; the published 6.35 m length is matched by the hull and track guards, and the 75 mm muzzle projects about 0.33 m beyond them (6.70 m overall in the model). The hull follows the common 1944 pattern with a two-piece hatch over the driver and the early engine deck; the commander has the all-round vision cupola (eight episcopes, two-piece hatch). Bolt patterns, bins, the rear outlet cowl, the six spare links on the nose and the tow cable on the left hull side are representative crew fits, simplified. Not fitted: the Normandy exhaust cowl, hedgerow cutters, applique armour, wireless aerials (bases only), smoke-discharger bombs and personal stowage. Tracks are 125 dry-pin skeleton links per side with a centre guide on every link; the road wheel diameter (about 0.81 m) is estimated. No markings: census numbers and unit signs varied from vehicle to vehicle.',
  },
  order: 10,
};

export default def;
