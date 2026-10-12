/**
 * Sherman Firefly Vc (Sherman V / Medium Tank M4A4 with the OQF 17-pounder), United Kingdom, 1944.
 * Procedurally modelled; part modules live in ./sherman-firefly/ (dims.ts holds the reference numbers).
 * Running gear, track and several fittings are adapted copies of the M4A3(75)W model of this project.
 */
import { group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { pal } from './sherman-firefly/palette';
import { runningGear } from './sherman-firefly/running';
import { hull } from './sherman-firefly/hull';
import { turret } from './sherman-firefly/turret';
import { fittings } from './sherman-firefly/fittings';
import { H, TURRET } from './sherman-firefly/dims';

const def: AssetDef = {
  id: 'uk-sherman-firefly',
  name: 'Sherman Firefly Vc',
  subtitle: 'Medium tank (17-pounder conversion of the Sherman V)',
  faction: 'uk',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'British conversion of the Sherman to take the OQF 17-pounder anti-tank gun, with the radio moved to an armoured box on the turret rear, a loader\'s hatch cut into the turret roof and the hull machine gunner replaced by extra ammunition stowage. The Vc, built on the longer Sherman V (M4A4) hull with its Chrysler multibank engine, was the most common Firefly; shown in 1944 service in S.C.C. No. 15 olive drab.',
  facts: [
    { label: 'Crew', value: '4 (commander, gunner, loader/operator, driver)' },
    { label: 'Main gun', value: 'OQF 17-pounder (76.2 mm), 77 rounds' },
    { label: 'Machine gun', value: '.30 cal Browning M1919A4 (coaxial); hull MG port plated over' },
    { label: 'Engine', value: 'Chrysler A57 multibank, 30-cylinder petrol, 425 hp' },
    { label: 'Weight', value: 'about 35 t (34.75 long tons)' },
    { label: 'Hull (M4A4)', value: '6.06 m long, 2.62 m wide, 2.74 m high' },
    { label: 'Armour', value: '51 mm glacis at 56 deg (welded small-hatch hull)' },
    { label: 'Suspension', value: 'VVSS, 3 widely spaced bogies per side; 83 track shoes per side' },
    { label: 'Built', value: 'about 2,100-2,200 Fireflies of all types, 1944-45' },
  ],
  status: 'available',
  footprint: { w: 2.62, l: 6.1 },
  spacing: { default: 10, min: 8.5, max: 18 },
  maxQuantity: 12,
  options: [
    {
      kind: 'select',
      id: 'turret',
      label: 'Turret',
      choices: [
        { id: 'forward', label: 'Forward', note: 'Travel lock folded on the rear deck' },
        { id: 'travel', label: 'Travelling', note: 'Turret traversed to the rear, gun clamped in the travel lock' },
      ],
      default: 'forward',
    },
    {
      kind: 'toggle',
      id: 'countershade',
      label: 'Barrel countershading',
      default: false,
      note: 'Crew-applied light underside on the forward barrel to disguise its length',
    },
    { kind: 'toggle', id: 'stowage', label: 'Rolled tarpaulin', default: true, note: 'Carried in the rear blanket rack' },
    { kind: 'toggle', id: 'sandShields', label: 'Sand shields', default: false, note: 'Often removed in service' },
    { kind: 'toggle', id: 'star', label: 'White star', default: true, note: 'Allied recognition star on the hull sides' },
  ],
  build(config) {
    const P = pal();
    const travel = config.turret === 'travel';
    const t = turret(P, config.countershade === true);
    t.position.set(0, H.roof, TURRET.z);
    if (travel) t.rotation.y = Math.PI;
    return group(
      [
        runningGear(P),
        hull(P),
        t,
        fittings(P, { sandShields: config.sandShields === true, star: config.star !== false, tarp: config.stowage !== false, lockRaised: travel }),
      ],
      { name: 'sherman-firefly-vc' },
    );
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Sherman_Firefly',
      'https://www.historyofwar.org/articles/weapons_medium_tank_M4A4_sherman_V.html',
      'https://www.theshermantank.com/the-sherman-tank-variant-page-pages-for-each-type-of-sherman-tank/the-sherman-m4a4-medium-tank-proof-americans-can-make-even-crazy-motors-reliable/',
      'https://www.theshermantank.com/sherman/the-sherman-variants-the-design-matures/',
      'https://en.wikipedia.org/wiki/M4_Sherman_variants',
      'https://en.wikipedia.org/wiki/Lend-Lease_Sherman_tanks',
      'https://www.warhistoryonline.com/war-articles/can-tell-difference-firefly-guide-sherman-firefly.html',
      'https://archive.org/details/TM9-754',
    ],
    notes:
      'Exterior only, hatches closed, no crew or interior. The common Sherman front end, VVSS bogies, T48 rubber chevron track, turret casting and many fittings are adapted from the M4A3(75)W model of this project; the M4A4 hull is lengthened at the rear, the bogie pitch widened to give the 160 in ground contact with 83 shoes per side, and the late M4A4 small-hatch front (56 deg glacis, drivers\' hoods with applique plates and welded-over vision ports, three-piece bolted final drive housing) is modelled from photographs. The engine deck layout (grilled doors, the bulge behind the turret) and the rear plate follow photographs in general form, not factory drawings. The Firefly mantlet, radio box, loader\'s hatch (a square hatch hinged at its front edge on the left of the roof) and 17-pdr travel lock are proportioned from photographs; the 17-pdr muzzle is placed about 1.88 m ahead of the nose, the overhang implied by the published 7.77 m overall length on the 5.89 m Sherman I hull. The breech counterweight is inside the turret and not shown. Tools, spare shoes and tow cable are a representative crew fit; the only marking is the optional plain white Allied star (no unit signs or census numbers, which varied from vehicle to vehicle).',
  },
  view: { yaw: 35, pitch: 14 },
  order: 12,
};
export default def;
