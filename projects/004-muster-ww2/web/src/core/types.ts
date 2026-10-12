/**
 * Asset contract shared by every catalog entry.
 *
 * Conventions (all assets MUST follow these):
 *  - Units are metres, real-world 1:1 scale.
 *  - +Y is up. The asset's forward direction (muzzle, vehicle front, aircraft nose,
 *    soldier facing) is +Z. The asset's own left is +X, right is -X.
 *  - The origin sits on the ground plane (y = 0) at the centre of the footprint.
 *    The lowest contact points (boots, tracks, tyres, wheels, trail spades, stand base)
 *    must touch y = 0 exactly — never float, never sink.
 */
import type * as THREE from 'three';

export type FactionId = 'germany' | 'soviet' | 'usa' | 'uk' | 'japan' | 'italy';
export type Alignment = 'Axis' | 'Allies';

export const CATEGORIES = [
  'Infantry',
  'Weapons',
  'Equipment',
  'Vehicles',
  'Armor',
  'Artillery',
  'Aircraft',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Bucket used by the Army Overview counters. Weapons carried by soldiers never count. */
export type CountKind = 'personnel' | 'vehicles' | 'artillery' | 'aircraft' | 'looseEquipment';

export interface SelectChoice {
  id: string;
  label: string;
  /** Optional one-line note shown under the choice. */
  note?: string;
}

export interface SelectOption {
  kind: 'select';
  id: string;
  label: string;
  choices: SelectChoice[];
  default: string;
}

export interface ToggleOption {
  kind: 'toggle';
  id: string;
  label: string;
  default: boolean;
  note?: string;
}

export type AssetOption = SelectOption | ToggleOption;
export type AssetConfig = Record<string, string | boolean>;

/** Returned by `AssetDef.constrain` to tell the UI which options/choices are currently locked. */
export interface ConfigConstraints {
  /** Option ids that should be shown disabled, with a short reason. */
  disabled?: Record<string, string>;
  /** Per select-option, choice ids that are not allowed right now. */
  disallowedChoices?: Record<string, string[]>;
}

export interface Fact {
  label: string;
  value: string;
}

export interface Provenance {
  /** e.g. "Procedurally modelled in TypeScript for this project" */
  method: string;
  author: string;
  license: string;
  /** Textures: procedural / generated in code, or a licensed source. */
  textures: string;
  /** Public references consulted for dimensions, details and historical facts (URLs or titles). */
  references: string[];
  /** Anything intentionally simplified or omitted, stated honestly. */
  notes?: string;
}

export interface BuildContext {
  /** 'high' for close inspection & thumbnails; 'low' for distant LOD (optional to honour). */
  detail: 'high' | 'low';
}

export interface AssetDef {
  /** Globally unique, kebab-case, prefixed by faction: 'de-panzer-iv-h', 'su-t34-85'. */
  id: string;
  name: string;
  /** Short secondary line, e.g. 'Medium tank' or 'Bolt-action rifle'. */
  subtitle: string;
  faction: FactionId;
  category: Category;
  countAs: CountKind;
  /** 1–3 sentence English introduction. Only verified information. */
  summary: string;
  /** Verified facts only (e.g. Service, Crew, Calibre, Length). Omit anything unverified. */
  facts: Fact[];
  status: 'available' | 'unavailable';
  /** Shown in the library when status is 'unavailable'. */
  unavailableReason?: string;
  /** Approximate footprint at heading 0, metres: w along X, l along Z. Used for spacing/markers. */
  footprint: { w: number; l: number };
  /** Centre-to-centre spacing for Line/Grid formations, metres. */
  spacing: { default: number; min: number; max: number };
  /** Maximum instances per group (performance guard, communicated in the UI). */
  maxQuantity: number;
  options?: AssetOption[];
  /** Normalise a config (apply compatibility rules) and report locked options. */
  constrain?(config: AssetConfig): { config: AssetConfig; constraints?: ConfigConstraints };
  /** Build the model. Must return a fresh object; the framework bakes & caches per config. */
  build(config: AssetConfig, ctx: BuildContext): THREE.Object3D | Promise<THREE.Object3D>;
  /** Thumbnail / focus framing hints (optional). yaw/pitch in degrees. */
  view?: { yaw?: number; pitch?: number; fit?: number };
  provenance: Provenance;
  /** Hide from the library (internal/test assets). */
  hidden?: boolean;
  /** Sort key inside its category (lower first). */
  order?: number;
}

export interface FactionInfo {
  id: FactionId;
  name: string;
  alignment: Alignment;
}

export const FACTIONS: FactionInfo[] = [
  { id: 'germany', name: 'Germany', alignment: 'Axis' },
  { id: 'soviet', name: 'Soviet Union', alignment: 'Allies' },
  { id: 'usa', name: 'United States', alignment: 'Allies' },
  { id: 'uk', name: 'United Kingdom', alignment: 'Allies' },
  { id: 'japan', name: 'Japan', alignment: 'Axis' },
  { id: 'italy', name: 'Italy', alignment: 'Axis' },
];

export function defaultConfig(def: AssetDef): AssetConfig {
  const cfg: AssetConfig = {};
  for (const o of def.options ?? []) cfg[o.id] = o.default;
  return def.constrain ? def.constrain(cfg).config : cfg;
}

export function configKey(def: AssetDef, config: AssetConfig): string {
  const keys = (def.options ?? []).map((o) => o.id).sort();
  return def.id + '|' + keys.map((k) => `${k}=${String(config[k])}`).join(';');
}
