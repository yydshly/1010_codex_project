/**
 * Pz.Kpfw. VI Tiger Ausf. E (Sd.Kfz. 181) - heavy tank, mid-production as completed in about
 * July 1943: second-pattern turret with the low cast cupola, twin headlights, Feifel air
 * pre-cleaners and S-mine launchers, no Zimmerit, no smoke dischargers. Dunkelgelb.
 * Model modules live in ./tiger-i/ (dims, materials, track, running-gear, hull, turret, fittings).
 * Config key `only` ('running' | 'wheels' | 'track' | 'sprocket' | 'idler' | 'suspension' | 'hull' |
 * 'turret') builds a single assembly for review; it is not a user-facing option.
 */
import { group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { palette } from './tiger-i/materials';
import { runningGear } from './tiger-i/running-gear';
import { hull } from './tiger-i/hull';
import { turret } from './tiger-i/turret';
import { fittings } from './tiger-i/fittings';

const def: AssetDef = {
  id: 'de-tiger-i',
  name: 'Tiger I Ausf. E',
  subtitle: 'Heavy tank (Pz.Kpfw. VI, Sd.Kfz. 181)',
  faction: 'germany',
  category: 'Armor',
  countAs: 'vehicles',
  summary:
    'German heavy tank built by Henschel with a Krupp turret and the 8.8 cm KwK 36 L/56 gun, 100 mm frontal armour ' +
    'and interleaved road wheels on torsion bars. Shown as a mid-production vehicle of summer 1943 with the low cast ' +
    'commander\'s cupola, before factory-applied Zimmerit, in Dunkelgelb.',
  facts: [
    { label: 'Produced', value: 'August 1942 - August 1944' },
    { label: 'Built', value: '1,347' },
    { label: 'Crew', value: '5' },
    { label: 'Main gun', value: '8.8 cm KwK 36 L/56' },
    { label: 'Machine guns', value: '2 x 7.92 mm MG 34' },
    { label: 'Weight', value: '57 t' },
    { label: 'Length', value: '8.45 m with gun (hull 6.32 m)' },
    { label: 'Width', value: '3.55 m on combat tracks (3.14 m on transport tracks)' },
    { label: 'Engine', value: 'Maybach HL 230 P 45 (petrol)' },
  ],
  status: 'available',
  footprint: { w: 3.56, l: 6.32 },
  spacing: { default: 10, min: 7.5, max: 18 },
  maxQuantity: 12,
  build(config) {
    const pal = palette();
    const only = config.only as string | undefined;
    if (only === 'running' || only === 'wheels' || only === 'track' || only === 'sprocket' || only === 'idler' || only === 'suspension') return group([runningGear(pal, only)]);
    if (only === 'hull') return group([hull(pal)]);
    if (only === 'turret') return group([turret(pal)]);
    return group([runningGear(pal), hull(pal), turret(pal), fittings(pal)]);
  },
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [
      'https://en.wikipedia.org/wiki/Tiger_I',
      'https://tanks-encyclopedia.com/ww2/germany/panzer-vi_tiger.php',
      'https://www.historyofwar.org/articles/weapons_tiger_I.html',
      'https://tankmuseum.org/article/two-widths-track',
      'https://tankmuseum.org/tiger-wheels/',
      'https://www.alanhamby.com/suspension.shtml',
      'http://www.alanhamby.com/changes.shtml',
      'https://tiger1.info/EN/RoadWheelSpacing.html',
      'https://tiger1.info/EN/New-turret-external.html',
      'https://tiger1.info/EN/Headlights.html',
      'https://tiger1.info/EN/Feifel-air-precleaners.html',
      'https://tiger1.info/EN/S-mine-brackets.html',
      'https://panzerworld.com/pz-kpfw-tiger-ausf-e',
    ],
    notes:
      'Depicts a mid-production Tiger I as completed in about July 1943: second-pattern turret with the low cast ' +
      'cupola (seven periscopes, AA MG ring), escape hatch for the loader, simplified pistol-port plug and the ' +
      'loader periscope, twin Bosch headlights (the right one was deleted from August 1943), five S-mine launchers, oval ' +
      'Feifel air pre-cleaners, guarded exhaust mufflers, rubber-tyred road wheels with 12-bolt rims, no smoke ' +
      'dischargers (deleted June 1943) and no Zimmerit (factory application began in the late summer of 1943; ' +
      'sources give dates from July to September). Plate layout, turret proportions and fitting positions were ' +
      'derived from published overall dimensions, armour data and photographs, not from factory drawings. The wheel ' +
      'interleaving follows published descriptions (three wheels per arm, the outermost wheel on the outer track ' +
      'extension); left and right stations are shown symmetric, whereas the real torsion bars stagger them slightly. ' +
      'Hatches are closed and no interior is modelled. Tool and cable stowage, the spare links on the turret sides ' +
      'and the engine-deck details are representative of 1943 vehicles rather than one specific tank; the ' +
      'deep-wading equipment, the antenna rod and the cupola MG 34 are not fitted. Markings are limited to ' +
      'Balkenkreuze (no unit or turret numbers).',
  },
  view: { yaw: 35, pitch: 14 },
  order: 30,
};

export default def;
