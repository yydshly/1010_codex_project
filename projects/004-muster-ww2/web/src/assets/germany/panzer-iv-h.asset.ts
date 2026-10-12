/** Pz.Kpfw. IV Ausf. H (Sd.Kfz. 161/2) - medium tank, 1943 production without Zimmerit. */
import { group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { palette } from './panzer-iv-h/materials';
import { runningGear } from './panzer-iv-h/running-gear';
import { hull } from './panzer-iv-h/hull';
import { turret } from './panzer-iv-h/turret';
import { fittings } from './panzer-iv-h/fittings';

const def: AssetDef = {
  id: 'de-panzer-iv-h',
  name: 'Panzer IV Ausf. H',
  subtitle: 'Medium tank (Pz.Kpfw. IV, Sd.Kfz. 161/2)',
  faction: 'germany',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'German medium tank armed with the long 7.5 cm KwK 40 L/48 gun, with 80 mm frontal hull armour and ' +
    'skirt plates (Schuerzen) hung around the hull and turret. Shown as an early production vehicle in ' +
    'Dunkelgelb, before factory-applied Zimmerit.',
  facts: [
    { label: 'Produced', value: '1943-1944' },
    { label: 'Crew', value: '5' },
    { label: 'Main gun', value: '7.5 cm KwK 40 L/48' },
    { label: 'Machine guns', value: '2 x 7.92 mm MG 34' },
    { label: 'Weight', value: '25 t' },
    { label: 'Length', value: '7.02 m with gun' },
    { label: 'Width', value: '2.88 m (without Schuerzen)' },
    { label: 'Height', value: '2.68 m' },
    { label: 'Engine', value: 'Maybach HL 120 TRM (petrol)' },
  ],
  status: 'available',
  footprint: { w: 3.29, l: 5.89 },
  spacing: { default: 9, min: 6.5, max: 16 },
  maxQuantity: 12,
  options: [
    {
      kind: 'select',
      id: 'schuerzen',
      label: 'Schuerzen',
      choices: [
        { id: 'fitted', label: 'Fitted', note: 'Hull and turret skirt plates in place' },
        { id: 'removed', label: 'Removed', note: 'Hull skirt plates off; rails and turret skirts remain' },
      ],
      default: 'fitted',
    },
  ],
  build(config) {
    const pal = palette(false);
    const only = config.only as string | undefined;
    if (only) return group([runningGear(pal, only)]);
    const skirts = config.schuerzen !== 'removed';
    return group([runningGear(pal), hull(pal), turret(pal), fittings(pal, skirts)]);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Panzer_IV',
      'https://tanks-encyclopedia.com/ww2/nazi_germany/panzer_iv_ausf_h/',
      'https://en.wikipedia.org/wiki/7.5_cm_KwK_40',
      'https://vdoc.pub/documents/modelling-the-late-panzerkampfwagen-iv-1li73bg68110',
      'https://www.amps-armor.org/SiteReviews/ShowReview.aspx?id=4170',
      'https://www.afvmodeller.com/product/16172-panzer-iv-tool-stowage-ausf-h-j/',
    ],
    notes:
      'Depicts early (mid-1943) production: rubber-tyred return rollers, tubular idler, no Zimmerit, no ' +
      'turret smoke dischargers, single Bosch headlight on the left track guard, antenna base on the rear ' +
      'deck with the rod antenna not fitted, deflector rod under the gun. Plate layout was derived from ' +
      'published overall dimensions and photographs, not factory drawings. Hatches are closed and no ' +
      'interior is modelled. Tool stowage, belly covers, bin and bracket details are representative and ' +
      'simplified; the cupola MG ring is shown without its MG 34. Markings are limited to Balkenkreuze ' +
      '(no unit or turret numbers).',
  },
  view: { yaw: 35, pitch: 14 },
  order: 10,
};
export default def;
