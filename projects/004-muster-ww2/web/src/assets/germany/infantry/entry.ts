/**
 * Shared catalog-entry plumbing for the German infantry entries (options, constrain, provenance).
 */
import type { AssetConfig, AssetDef, AssetOption, ConfigConstraints } from '../../../core/types';
import { buildInfantry, type Kit, type Role } from './soldier';

export interface KitDefaults {
  headgear: 'helmet' | 'cap';
  pack: boolean;
  gasmask: boolean;
  breadbag: boolean;
  shovel: boolean;
  grenade: boolean;
}

export function kitOptions(d: KitDefaults): AssetOption[] {
  // Only verified options are offered: the M43 field cap (kit/cap.ts) is not yet at display
  // quality, so the steel helmet is always worn; the gas-mask canister and the stick grenade
  // are implemented in soldier.ts but not offered until reviewed.
  void d.headgear;
  return [
    { kind: 'toggle', id: 'pack', label: 'Assault pack', default: d.pack, note: 'A-frame with mess tin, Zeltbahn and bag' },
    { kind: 'toggle', id: 'breadbag', label: 'Bread bag & canteen', default: d.breadbag },
    { kind: 'toggle', id: 'shovel', label: 'Entrenching tool', default: d.shovel, note: 'With the bayonet on its carrier' },
  ];
}

export function toKit(cfg: AssetConfig, d: KitDefaults): Kit {
  const b = (k: keyof KitDefaults) => (typeof cfg[k] === 'boolean' ? (cfg[k] as boolean) : (d[k] as boolean));
  return {
    headgear: 'helmet',
    pack: b('pack'),
    gasmask: false,
    breadbag: b('breadbag'),
    shovel: b('shovel'),
    grenade: false,
  };
}

/** Normalise a config: known keys only, correct types. The weapon and its ammunition pouches are fixed per entry. */
export function constrainKit(cfg: AssetConfig, d: KitDefaults): { config: AssetConfig; constraints?: ConfigConstraints } {
  const k = toKit(cfg, d);
  return { config: { pack: k.pack, breadbag: k.breadbag, shovel: k.shovel } };
}

export const PROVENANCE_BASE = {
  method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
  author: 'Muster project',
  license: 'Project-owned; created for this project.',
  textures: 'Procedural, generated in code at runtime.',
};

export const REFERENCES = [
  'https://en.wikipedia.org/wiki/Uniforms_of_the_German_Army_(1935%E2%80%931945)',
  'https://www.iwm.org.uk/collections/item/object/30016126',
  'https://www.mp44.nl/equipment/a_frame.htm',
  'https://smallarmsreview.com/german-mg-34-gunners-kit-werkzeugtasche-34/',
  'https://hessenantique.com/m40-field-grey-wool-jacket-feldbluse/',
];

export function infantryBuild(role: Role, d: KitDefaults): AssetDef['build'] {
  return (cfg) => {
    const r = buildInfantry(role, toKit(cfg, d));
    return r.object;
  };
}
