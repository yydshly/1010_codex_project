/** Application-level types (the asset contract lives in src/core/types.ts). */
import type { Alignment, AssetConfig, Category, CountKind, FactionId } from '../core/types';

export type Formation = 'single' | 'line' | 'grid';

export interface GroupInstance {
  /** Formation slot index; the stable identity of a model inside its group. */
  slot: number;
  /** Manual adjustment relative to the slot, in the group's local frame (metres). */
  offset: { dx: number; dz: number };
  /** Manual rotation relative to the group heading (degrees). */
  headingOffset: number;
}

/** A placed entry: every instance shares the same model and configuration. */
export interface Group {
  id: string;
  assetId: string;
  config: AssetConfig;
  quantity: number;
  formation: Formation;
  /** Centre-to-centre spacing (metres). */
  spacing: number;
  /** Grid columns; 'auto' = ceil(sqrt(n)). */
  columns: number | 'auto';
  /** Degrees; 0 = models face +Z. Positive turns counter-clockwise seen from above. */
  heading: number;
  /** Formation centre on the ground (metres). */
  anchor: { x: number; z: number };
  instances: GroupInstance[];
}

export interface Selection {
  groupId: string;
  /** null = the whole group; otherwise the slot of one model. */
  slot: number | null;
}

/** Library country filter: everything, one alignment ('axis' | 'allies') or one country. */
export type AlignmentFilter = Lowercase<Alignment>;
export type FactionFilter = 'all' | AlignmentFilter | FactionId;
export type CategoryFilter = Category | 'All';

export interface LibraryFilter {
  faction: FactionFilter;
  category: CategoryFilter;
  search: string;
}

export interface CameraView {
  target: [number, number, number];
  distance: number;
  /** Degrees around +Y; 0 = camera on +Z looking towards -Z. */
  yaw: number;
  /** Degrees above the horizon. */
  pitch: number;
}

export type Counts = Record<CountKind, number>;

export const COUNT_KINDS: { id: CountKind; label: string }[] = [
  { id: 'personnel', label: 'Personnel' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'artillery', label: 'Artillery' },
  { id: 'aircraft', label: 'Aircraft' },
  { id: 'looseEquipment', label: 'Loose Equipment' },
];

export function emptyCounts(): Counts {
  return { personnel: 0, vehicles: 0, artillery: 0, aircraft: 0, looseEquipment: 0 };
}

/** Total number of models the display may hold (performance guard, stated in the UI). */
export const DISPLAY_LIMIT = 300;
