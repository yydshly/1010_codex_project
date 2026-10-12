/** North American P-51D Mustang - parked, tail down, gear down, propeller still. */
import { group, mirrorX } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { BODY_TO_ASSET } from './p51d/frame';
import { buildFuselage } from './p51d/fuselage';
import { buildWingPort, navLight, starboardFittings } from './p51d/wing';
import { buildTailSurfaces, buildTailWheel } from './p51d/tail';
import { buildMainGearPort } from './p51d/gear';
import { buildCockpit } from './p51d/cockpit';
import { buildMarkings } from './p51d/markings';

const def: AssetDef = {
  id: 'us-p51d',
  name: 'North American P-51D Mustang',
  subtitle: 'Single-seat long-range fighter, 1944-45',
  faction: 'usa',
  category: 'Aircraft',
  countAs: 'aircraft',
  summary:
    'The P-51D combined the Mustang\'s laminar-flow wing with the Packard V-1650-7, a licence-built two-stage ' +
    'supercharged Merlin, a bubble canopy and six .50 in machine guns, and became the USAAF\'s principal long-range ' +
    'escort fighter in 1944-45. It is shown parked in the factory natural-metal finish of a late-1944 P-51D-20-NA.',
  facts: [
    { label: 'Crew', value: '1' },
    { label: 'Engine', value: 'Packard V-1650-7 liquid-cooled V-12, 1,490 hp' },
    { label: 'Propeller', value: 'Hamilton Standard, four blades, 11 ft 2 in (3.40 m)' },
    { label: 'Armament', value: '6 x .50 in (12.7 mm) Browning M2 machine guns' },
    { label: 'Span', value: '37 ft 0 in (11.28 m)' },
    { label: 'Length', value: '32 ft 3 in (9.83 m)' },
    { label: 'Wing area', value: '235 sq ft (21.83 sq m)' },
    { label: 'Empty weight', value: '7,635 lb (3,465 kg)' },
    { label: 'Finish (as modelled)', value: 'Natural metal, aluminium-lacquered wings, olive drab anti-glare panel' },
  ],
  status: 'available',
  footprint: { w: 11.28, l: 9.7 },
  spacing: { default: 15, min: 12, max: 26 },
  maxQuantity: 12,
  view: { yaw: 35, pitch: 14 },
  order: 10,
  build() {
    const body = group([
      buildFuselage(),
      buildWingPort(),
      mirrorX(buildWingPort(), false),
      starboardFittings(),
      navLight(1),
      navLight(-1),
      buildTailSurfaces(),
      buildCockpit(),
      ...buildMarkings(),
    ]);
    BODY_TO_ASSET.decompose(body.position, body.quaternion, body.scale);
    const gear = group([buildMainGearPort(), mirrorX(buildMainGearPort(), false), buildTailWheel()]);
    const root = group([body, gear]);
    root.name = 'p51d';
    return root;
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/North_American_P-51_Mustang',
      'https://www.warbirdsresourcegroup.org/URG/p51mustang_specifications.html',
      'https://airandspace.si.edu/collection-objects/north-american-p-51d-30-na-mustang/nasm_A19600300000',
      'https://www.mustangsmustangs.com/p-51/variants/p51d',
      'https://www.mustangsmustangs.com/p-51/specifications/',
      'https://m-selig.ae.illinois.edu/ads/coord/p51droot.dat',
      'https://m-selig.ae.illinois.edu/ads/coord/p51dtip.dat',
      'https://www.key.aero/forum/historic-aviation/141825-p51-mustang-wings-painted-or-not',
    ],
    notes:
      'Represents a P-51D-20-NA (straight dorsal fin fillet, K-14 gunsight, no rocket stubs) in late-1944 factory ' +
      'finish: bare aluminium fuselage and tail, wings filled and painted with aluminium lacquer, bare flaps, ailerons ' +
      'and gun-bay doors, olive drab anti-glare panel, black propeller blades with yellow tips. Only the national ' +
      'star-and-bar insignia are applied; unit codes, serials, nose art, stencils and squadron colours are deliberately ' +
      'omitted. Span, length, wing area, propeller diameter and the published parked height (4.08 m, tail down, one ' +
      'blade vertical) set the proportions and the ~10 deg three-point attitude; the wing uses the published P-51D root ' +
      'and tip ordinates, but fuselage sections, scoops, canopy, tail and undercarriage geometry are proportioned from ' +
      'photographs and general drawings, not factory drawings. The inner main-gear doors are shown drooped open as ' +
      'often seen on parked aircraft. Panel lines and fasteners are painted, not modelled; the engine is not modelled ' +
      'inside the cowling; the cockpit is simplified (painted instrument faces; no wiring, pedals or oxygen system).',
  },
};
export default def;
