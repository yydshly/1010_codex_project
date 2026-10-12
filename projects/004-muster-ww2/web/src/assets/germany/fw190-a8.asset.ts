/** Focke-Wulf Fw 190 A-8 - parked, tail down, gear down, propeller still. */
import { group, mirrorX } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { BODY_TO_ASSET } from './fw190-a8/frame';
import { buildFuselage } from './fw190-a8/fuselage';
import { buildWingPort, buildPitot, navLight } from './fw190-a8/wing';
import { buildTailSurfaces, buildTailWheel } from './fw190-a8/tail';
import { buildMainGearPort } from './fw190-a8/gear';
import { buildCockpit } from './fw190-a8/cockpit';
import { buildMarkings } from './fw190-a8/markings';

const def: AssetDef = {
  id: 'de-fw190-a8',
  name: 'Focke-Wulf Fw 190 A-8',
  subtitle: 'Single-seat fighter, 1944',
  faction: 'germany',
  category: 'Aircraft',
  countAs: 'aircraft',
  summary:
    'The Fw 190 A-8 entered production in early 1944 and became the most numerous version of the Fw 190 A, with more ' +
    'than 6,500 built. Powered by a BMW 801 D-2 radial engine with an engine-driven cooling fan behind the spinner, it ' +
    'carried two 13 mm MG 131 machine guns over the engine and four 20 mm MG 151/20 cannon in the wings.',
  facts: [
    { label: 'Crew', value: '1' },
    { label: 'Production', value: 'From February/March 1944 to May 1945' },
    { label: 'Engine', value: 'BMW 801 D-2 14-cylinder two-row radial, 1,730 PS for take-off' },
    { label: 'Armament (as modelled)', value: '2 x 13 mm MG 131, 4 x 20 mm MG 151/20' },
    { label: 'Propeller', value: 'VDM 9-12176 A, three blades, 3.3 m diameter' },
    { label: 'Span', value: '10.506 m' },
    { label: 'Length', value: '9.00 m' },
    { label: 'Wing area', value: '18.3 sq m' },
    { label: 'Main undercarriage track', value: '3.5 m' },
  ],
  status: 'available',
  footprint: { w: 10.51, l: 9.0 },
  spacing: { default: 14.5, min: 12, max: 26 },
  maxQuantity: 12,
  view: { yaw: 35, pitch: 14 },
  order: 12,
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
    root.name = 'fw190-a8';
    return root;
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Focke-Wulf_Fw_190',
      'https://en.wikipedia.org/wiki/List_of_Focke-Wulf_Fw_190_variants',
      'https://www.warbirdsresourcegroup.org/LRG/luftwaffe_focke_wulf_fw190_specifications_fw190a.html',
      'https://www.ipmsstockholm.se/home/modellers-guide-to-focke-wulf-fw-190-variants-part-i/',
    ],
    notes:
      'Represents a 1944 production Fw 190 A-8 with the standard flat-topped sliding hood (the bulged "blown" hood was ' +
      'only introduced on the line in the last production batches), the pilot head armour inside the hood, four MG 151/20 ' +
      'wing cannon with their wing-root and outer overwing blisters, and the pitot head on the starboard wing tip. The ' +
      'swastika normally carried on the fin is deliberately omitted; unit markings, individual numbers, Werknummer, ' +
      'fuselage bands and stencils are also left off, so only the Balkenkreuz national markings are shown. Span, length, ' +
      'wing area, propeller diameter and track follow the published figures; fuselage sections, cowling, canopy, tail ' +
      'surfaces and undercarriage geometry are proportioned from photographs and general drawings rather than factory ' +
      'drawings, the NACA 230-series sections are approximated by a cambered NACA 4-digit profile and the three-point ' +
      'ground angle (12.5 deg) is an estimate. Simplifications: the ETC 501 fuselage rack, FuG 16ZY and FuG 25a aerials ' +
      'under the fuselage and wing are not fitted; the inner wheel-well doors are shown closed; the engine is represented ' +
      'only by the cooling fan and a dark engine face behind it; flaps and ailerons are not separated; panel lines and ' +
      'fasteners are painted; the RLM 74/75 splinter, RLM 76 undersides and the side mottle are procedural patterns, not ' +
      'the official scheme template; the cockpit is simplified (instrument faces are a painted panel).',
  },
};
export default def;
