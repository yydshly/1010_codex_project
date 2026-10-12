/**
 * The first-screen demo display (SPEC 9), kept as data: DEMO_DISPLAY below is the one list to
 * edit when the final soldiers, vehicles, artillery and aircraft exist.
 *
 * Each entry names an asset (optionally with fallbacks for the same spot), its equipment
 * config, where the group stands, which way it faces, and how many models in which formation.
 * Positions and headings are authored in DISPLAY SPACE - the arrangement as seen from the
 * default camera: x = metres to the right on screen, z = metres towards the viewer; heading 0
 * faces the viewer, negative turns the model's nose to screen-left, positive to screen-right.
 * They are turned into world space with DEMO_VIEW.yaw, so the composition always faces the
 * default view.
 *
 * An entry is placed only if its asset is in the catalog, listed (not hidden), available and
 * its model actually builds (the app pre-builds before placing); anything else is skipped
 * quietly (console.info in development). The default camera then frames what was placed.
 */
import type { AssetConfig, AssetDef } from '../core/types';
import { normalizeConfig, type Catalog } from './catalog';
import { normDeg, rot } from './layout';
import type { Formation } from './types';

export interface DemoEntry {
  /** Catalog id of the model. */
  assetId: string;
  /** Tried in order when assetId is missing, hidden or unavailable (same spot, same pose). */
  fallbacks?: string[];
  /** Equipment options, merged over the asset's defaults and constrained. */
  config?: AssetConfig;
  /** Formation centre in display space: [x to the right, z towards the viewer], metres. */
  position: [number, number];
  /** Display-space heading in degrees: 0 faces the viewer, negative = nose to screen-left. */
  heading: number;
  /** Models in the group (default 1). */
  quantity?: number;
  /** Default 'single' (or 'line' when quantity > 1). */
  formation?: Formation;
}

/**
 * Default camera of the demo display: yaw around +Y and pitch above the horizon in degrees;
 * fit > 1 leaves more room around what was placed. Reset View uses the same framing.
 */
export const DEMO_VIEW = { yaw: 4, pitch: 15, fit: 0.62 };

/**
 * THE DEMO DISPLAY - a grand review: four national columns (Germany, Soviet Union, United
 * States, United Kingdom from left to right). Each column, from the front: the nation's small
 * arms on their stands, a 5 x 5 infantry block, two close ranks of three tanks, three guns and
 * the aircraft at the back, all dressed in straight ranks facing the viewer. Missing ids fall
 * back or are skipped.
 */
const C = [-24, -8, 8, 24];
const GUNS = 18.6, INF = 13.6, ARM1 = 5.2, ARM2 = -2.3, ART = -9.5, AIR = -17.6;

interface Column {
  rifle: string; second: string;
  weapons: string[];
  armour1: string[][]; armour2: string[][];
  guns: string[];
  air: string[];
}
const NATIONS: Column[] = [
  {
    rifle: 'de-rifleman', second: 'de-machine-gunner', weapons: ['de-kar98k', 'de-mp40', 'de-mg42'],
    armour1: [['de-panther-g', 'de-tiger-i'], ['de-tiger-i', 'de-panther-g'], ['de-panther-g', 'de-tiger-i']],
    armour2: [['de-stug-iii-g', 'de-panzer-iv-h'], ['de-panzer-iv-h'], ['de-stug-iii-g', 'de-panzer-iv-h']],
    guns: ['de-pak40', 'de-flak-36', 'de-pak40'], air: ['de-bf109-g6'],
  },
  {
    rifle: 'su-rifleman', second: 'su-submachine-gunner', weapons: ['su-mosin-9130', 'su-ppsh41', 'su-dp27'],
    armour1: [['su-t34-85'], ['su-t34-85'], ['su-t34-85']],
    armour2: [['su-kv-1', 'su-is-2'], ['su-is-2'], ['su-su-76m', 'su-kv-1']],
    guns: ['su-zis3', 'su-zis3', 'su-zis3'], air: ['su-il2'],
  },
  {
    rifle: 'us-rifleman', second: 'us-squad-leader', weapons: ['us-m1-garand', 'us-thompson-m1a1', 'us-bar-m1918a2'],
    armour1: [['us-m4a3-sherman'], ['us-m4a3-sherman'], ['us-m4a3-sherman']],
    armour2: [['us-m18-hellcat', 'us-m4a3-sherman'], ['us-m3a1-halftrack'], ['us-m18-hellcat', 'us-m4a3-sherman']],
    guns: ['us-m2a1-howitzer', 'us-m2a1-howitzer', 'us-m2a1-howitzer'], air: ['us-p51d'],
  },
  {
    rifle: 'uk-rifleman', second: 'uk-section-leader', weapons: ['uk-lee-enfield-no4', 'uk-sten-mk2', 'uk-bren-mk2'],
    armour1: [['uk-cromwell'], ['uk-sherman-firefly', 'uk-cromwell'], ['uk-cromwell']],
    armour2: [['uk-churchill-vii'], ['uk-churchill-vii'], ['uk-churchill-vii']],
    guns: ['uk-qf-25pdr', 'uk-qf-25pdr', 'uk-qf-25pdr'], air: ['uk-spitfire-ix'],
  },
];

function one(ids: string[], x: number, z: number, heading = 0, config?: AssetConfig): DemoEntry {
  return { assetId: ids[0], fallbacks: ids.slice(1), position: [x, z], heading, config };
}

export const DEMO_DISPLAY: DemoEntry[] = NATIONS.flatMap((n, i) => {
  const cx = C[i];
  const e: DemoEntry[] = [];
  // small arms on their stands: two rows of the nation's three weapons across the front
  [0, 1].forEach((row) => {
    [...n.weapons, ...n.weapons].forEach((w, k) => {
      const stand = w.endsWith('mg42') || w.endsWith('dp27') || w.includes('bren') || w.includes('bar-');
      e.push(one([w], cx - 4.4 + k * 1.76, GUNS + row * 1.5, 90, stand ? { display: 'stand' } : undefined));
    });
  });
  // two infantry blocks side by side: riflemen and the nation's automatic-weapon men
  e.push({ assetId: n.rifle, position: [cx - 2.9, INF], heading: 0, quantity: 25, formation: 'grid' });
  e.push({ assetId: n.second, position: [cx + 3.0, INF], heading: 0, quantity: 25, formation: 'grid' });
  // two close ranks of three tanks
  [-5.3, 0, 5.3].forEach((dx, k) => {
    e.push(one(n.armour1[k], cx + dx, ARM1));
    e.push(one(n.armour2[k], cx + dx, ARM2));
  });
  // three guns
  [-5.2, 0, 5.2].forEach((dx, k) => e.push(one([n.guns[k], n.guns[0]], cx + dx, ART)));
  // aircraft
  e.push(one(n.air, cx, AIR));
  return e;
});

/** A demo entry resolved against the catalog, in world space. */
export interface DemoPlacement {
  entry: DemoEntry;
  def: AssetDef;
  config: AssetConfig;
  /** Formation centre (world). */
  x: number;
  z: number;
  heading: number;
  quantity: number;
  formation: Formation;
}

export interface DemoPlan {
  items: DemoPlacement[];
  skipped: { assetId: string; reason: string }[];
}

/** Resolve the list against the catalog: first usable id per entry, world poses. */
export function planDemo(catalog: Catalog, entries: DemoEntry[] = DEMO_DISPLAY, yaw = DEMO_VIEW.yaw): DemoPlan {
  const items: DemoPlacement[] = [];
  const skipped: DemoPlan['skipped'] = [];
  for (const entry of entries) {
    try {
      const ids = [entry.assetId, ...(entry.fallbacks ?? [])];
      let def: AssetDef | undefined;
      const why: string[] = [];
      for (const id of ids) {
        const d = catalog.get(id);
        if (!d) why.push(`${id}: not in the catalog`);
        else if (d.hidden) why.push(`${id}: hidden`);
        else if (!catalog.placeable(id)) why.push(`${id}: ${catalog.unavailableReason(id) ?? 'unavailable'}`);
        else {
          def = d;
          break;
        }
      }
      if (!def) {
        skipped.push({ assetId: entry.assetId, reason: why.join('; ') });
        continue;
      }
      const [px, pz] = entry.position;
      const p = rot(Number(px) || 0, Number(pz) || 0, yaw);
      const quantity = Math.max(1, Math.min(Math.round(entry.quantity ?? 1), def.maxQuantity));
      items.push({
        entry,
        def,
        config: normalizeConfig(def, entry.config),
        x: p.x,
        z: p.z,
        heading: normDeg(yaw + (Number(entry.heading) || 0)),
        quantity,
        formation: entry.formation ?? (quantity > 1 ? 'line' : 'single'),
      });
    } catch (e) {
      skipped.push({ assetId: entry?.assetId ?? '?', reason: String(e) });
    }
  }
  return { items, skipped };
}
