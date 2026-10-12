/** Messerschmitt Bf 109 G-6 - parked, tail down, gear down, propeller still. */
import { THREE, group, mirrorX } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { BODY_TO_ASSET } from './bf-109-g6/frame';
import { buildFuselage } from './bf-109-g6/fuselage';
import { buildWingPort, buildPitot, navLight } from './bf-109-g6/wing';
import { buildTailSurfaces, buildTailWheel } from './bf-109-g6/tail';
import { buildMainGearPort } from './bf-109-g6/gear';
import { buildCockpit } from './bf-109-g6/cockpit';
import { buildMarkings } from './bf-109-g6/markings';

const def: AssetDef = {
  id: 'de-bf109-g6',
  name: 'Messerschmitt Bf 109 G-6',
  subtitle: 'Single-seat fighter, 1943',
  faction: 'germany',
  category: 'Aircraft',
  countAs: 'aircraft',
  summary:
    'The Bf 109 G-6 was introduced in February 1943 and became the most widely built version of the Luftwaffe\'s ' +
    'standard single-seat fighter, with over 12,000 completed. Its DB 605A engine and 13 mm MG 131 guns, whose breech ' +
    'covers form the bulges ahead of the windscreen, are shown here on an aircraft parked in RLM 74/75/76 camouflage.',
  facts: [
    { label: 'Crew', value: '1' },
    { label: 'Introduced', value: 'February 1943' },
    { label: 'Engine', value: 'Daimler-Benz DB 605A-1 inverted V12, 1,475 PS' },
    { label: 'Armament (as modelled)', value: '1 x 20 mm MG 151/20 engine cannon, 2 x 13 mm MG 131' },
    { label: 'Propeller', value: 'VDM 9-12087, three blades, 3.0 m diameter' },
    { label: 'Span', value: '9.925 m' },
    { label: 'Length', value: '8.95-9.02 m' },
    { label: 'Wing area', value: '16.05 sq m' },
    { label: 'Canopy (as modelled)', value: 'Framed hood with armoured-glass head rest (Galland-Panzer)' },
  ],
  status: 'available',
  footprint: { w: 9.93, l: 8.97 },
  spacing: { default: 14, min: 11, max: 24 },
  maxQuantity: 12,
  view: { yaw: 35, pitch: 14 },
  order: 10,
  build() {
    const body = group([
      buildFuselage(),
      buildWingPort(),
      mirrorX(buildWingPort(), false),
      buildPitot(),
      navLight(1),
      navLight(-1),
      buildTailSurfaces(),
      buildCockpit(),
      ...buildMarkings(),
    ]);
    BODY_TO_ASSET.decompose(body.position, body.quaternion, body.scale);
    const gear = group([buildMainGearPort(), mirrorX(buildMainGearPort(), false), buildTailWheel()]);
    const root = group([body, gear]);
    root.name = 'bf109-g6';
    void THREE;
    return root;
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Messerschmitt_Bf_109',
      'https://en.wikipedia.org/wiki/Messerschmitt_Bf_109_variants',
      'https://airandspace.si.edu/collection-objects/messerschmitt-bf-109-g-6-r3/nasm_A19600327000',
      'https://www.warbirdsresourcegroup.org/LRG/luftwaffe_messerschmitt_bf109_design_features.html',
      'https://www.vintagewings.ca/stories/bouncing-clouds',
    ],
    notes:
      'Represents a mid-1943 production G-6 with the standard framed canopy (starboard-hinged hood plus fixed rear ' +
      'glazing) fitted with the armoured-glass head rest known as the Galland-Panzer, the fixed 350 x 135 mm tail wheel ' +
      'and the VDM 9-12087 propeller; no underwing cannon gondolas, drop tank or rack. The swastika normally carried on ' +
      'the fin is deliberately omitted; unit markings, individual numbers, Werknummer and stencils are also left off, ' +
      'so only the Balkenkreuz national markings are shown. Span, length, wing area, propeller diameter and wheel sizes ' +
      'follow the published figures; fuselage sections, MG 131 blisters, supercharger intake, oil cooler, radiators and ' +
      'undercarriage geometry are proportioned from photographs and general drawings rather than factory drawings, and ' +
      'the NACA 2R1 wing sections are approximated by a cambered NACA 4-digit profile. The three-point ground angle is ' +
      'modelled at 12 degrees. The automatic slats are shown dropped open, as commonly seen on parked 109s. The RLM ' +
      '74/75/76 splinter and side mottle are procedural; panel lines and fasteners are painted rather than modelled, ' +
      'ailerons and flaps are not separated, the engine is not modelled inside the cowling, and the cockpit is ' +
      'simplified (instrument faces are a painted panel; rudder pedals, gun breeches and wiring are omitted).',
  },
};
export default def;
