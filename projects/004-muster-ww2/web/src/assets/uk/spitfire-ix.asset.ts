/** Supermarine Spitfire LF Mk IXc - parked, tail down, gear down, propeller still. */
import { group, mirrorX } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { BODY_TO_ASSET } from './spitfire-ix/frame';
import { buildFuselage } from './spitfire-ix/fuselage';
import { buildWingPort, buildPitot, navLight } from './spitfire-ix/wing';
import { buildTailSurfaces, buildTailWheel } from './spitfire-ix/tail';
import { buildMainGearPort } from './spitfire-ix/gear';
import { buildCockpit } from './spitfire-ix/cockpit';

const def: AssetDef = {
  id: 'uk-spitfire-ix',
  name: 'Supermarine Spitfire LF Mk IXc',
  subtitle: 'Single-seat fighter, 1944',
  faction: 'uk',
  category: 'Aircraft',
  countAs: 'aircraft',
  summary:
    'The Spitfire Mk IX paired the Mk V airframe with the two-stage supercharged Merlin 60-series engine and entered ' +
    'service in 1942; the LF Mk IX, powered by the low-altitude-rated Merlin 66, became the most numerous version. ' +
    'Shown with the "C" wing (one 20 mm Hispano cannon and two .303 Brownings per wing), standard elliptical tips and ' +
    'the 1944 Ocean Grey / Dark Green day-fighter scheme.',
  facts: [
    { label: 'Crew', value: '1' },
    { label: 'Engine', value: 'Rolls-Royce Merlin 66 V12, two-stage supercharger, 1,720 hp' },
    { label: 'Armament (as modelled)', value: '2 x 20 mm Hispano Mk II cannon, 4 x .303 in Browning machine guns ("C" wing)' },
    { label: 'Propeller', value: 'Rotol, four blades, 10 ft 9 in (3.27 m) diameter' },
    { label: 'Span', value: '11.23 m (36 ft 10 in, standard tips)' },
    { label: 'Length', value: '9.47 m (31 ft 0.5 in)' },
    { label: 'Produced', value: '5,656 Mk IX of all sub-types, until April 1945' },
  ],
  status: 'available',
  footprint: { w: 11.23, l: 9.47 },
  spacing: { default: 15, min: 12, max: 26 },
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
    ]);
    BODY_TO_ASSET.decompose(body.position, body.quaternion, body.scale);
    const gear = group([buildMainGearPort(), mirrorX(buildMainGearPort(), false), buildTailWheel()]);
    const root = group([body, gear]);
    root.name = 'spitfire-lf-ix';
    return root;
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Supermarine_Spitfire',
      'https://en.wikipedia.org/wiki/Supermarine_Spitfire_(late_Merlin-powered_variants)',
      'https://en.wikipedia.org/wiki/Supermarine_Spitfire_(early_Merlin-powered_variants)',
      'https://en.wikipedia.org/wiki/Supermarine_Spitfire_variants:_specifications,_performance_and_armament',
      'https://www.historyofwar.org/articles/weapons_spitfire_mkIX.html',
      'https://www.historyofwar.org/articles/weapons_spitfire_wings.html',
      'https://dingeraviation.net/spitfire/spitmark.htm',
      'https://commons.wikimedia.org/wiki/File:Supermarine_Spitfire_Mk_Vb_3-view.svg',
    ],
    notes:
      'Represents a 1944 LF Mk IXc with the "C" wing: one Hispano in the inner cannon bay of each wing, the unused outer ' +
      'cannon position closed by a short plugged stub, two .303 Browning ports per wing and the small teardrop feed ' +
      'blisters; standard elliptical wing tips (not clipped), the standard rounded rudder (the later broad-chord pointed ' +
      'rudder is not fitted), the fixed tail wheel, six fishtail exhaust stacks per side and the temperate (non-Aero-Vee) ' +
      'carburettor intake. Span, length, wing area, dihedral, washout, propeller diameter and track follow the published ' +
      'figures; fuselage sections, canopy, radiator housings and gear geometry are proportioned from photographs and a ' +
      'Mk Vb general-arrangement drawing (nose lengthened for the Merlin 66), not from factory drawings, and the three-point ' +
      'ground angle (11.5 deg) is an estimate. Paint: Ocean Grey / Dark Green disruptive upper surfaces (a procedural ' +
      'pattern, not the official A/B scheme template), Medium Sea Grey lower surfaces, Sky spinner and 18 in fuselage band, ' +
      'yellow outer leading-edge strips; national markings only (Type C1 fuselage, Type B upper-wing and Type C under-wing ' +
      'roundels, fin flash; the fuselage roundel is drawn about 6 % under the 36 in C1 size to fit the modelled fuselage ' +
      'depth). No squadron codes, serial numbers, invasion stripes or stencils are applied. Panel lines are ' +
      'painted rather than modelled; ailerons, flaps, gun-bay doors and the cockpit access door are indicated by panel ' +
      'lines only; the engine is not modelled under the cowling; the cockpit is simplified (dials are rings on a plain ' +
      'panel; rudder pedals, oxygen and wiring are omitted); IFF aerials and landing lamps are omitted.',
  },
};
export default def;
