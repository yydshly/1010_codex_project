/**
 * Catalog: every asset module discovered by the registry, validated and sorted for the
 * library. Modules that fail to load, have an invalid definition, or later fail to build are
 * kept out of placement and reported quietly (library footnote + console), never faked.
 */
import { loadAllAssets } from '../core/registry';
import { CATEGORIES, FACTIONS, type Alignment, type AssetConfig, type AssetDef, type Category, type ConfigConstraints, type FactionId, type FactionInfo } from '../core/types';
import type { AlignmentFilter, CategoryFilter, FactionFilter, LibraryFilter } from './types';

export interface LoadIssue {
  path: string;
  message: string;
}

/** Every alignment, in display order (the object literal makes the list exhaustive). */
export const ALIGNMENTS = Object.keys({ Axis: 1, Allies: 1 } satisfies Record<Alignment, 1>) as Alignment[];

export interface FactionFilterInfo {
  id: FactionFilter;
  label: string;
  kind: 'quick' | 'country';
}

/** Quick filters of the top bar: All / Axis / Allies. */
export const QUICK_FILTERS: FactionFilterInfo[] = [
  { id: 'all', label: 'All', kind: 'quick' },
  ...ALIGNMENTS.map((a) => ({ id: a.toLowerCase() as AlignmentFilter, label: a, kind: 'quick' as const })),
];

/** One filter per country, straight from FACTIONS (core/types.ts is the only list to edit). */
export const COUNTRY_FILTERS: FactionFilterInfo[] = FACTIONS.map((f) => ({ id: f.id, label: f.name, kind: 'country' as const }));

/** Every Country / Faction filter: the quick filters, then each country. */
export const FACTION_FILTERS: FactionFilterInfo[] = [...QUICK_FILTERS, ...COUNTRY_FILTERS];

export function isFactionFilter(v: unknown): v is FactionFilter {
  return typeof v === 'string' && FACTION_FILTERS.some((f) => f.id === v);
}

export function factionInfo(id: FactionId | string | null | undefined): FactionInfo | undefined {
  return FACTIONS.find((f) => f.id === id);
}

export function factionName(id: FactionId | string): string {
  return factionInfo(id)?.name ?? String(id);
}

/** Countries grouped by alignment (Axis, then Allies), names sorted alphabetically. */
export function factionsByAlignment(): { alignment: Alignment; factions: FactionInfo[] }[] {
  return ALIGNMENTS.map((alignment) => ({
    alignment,
    factions: FACTIONS.filter((f) => f.alignment === alignment).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.factions.length > 0);
}

/** def.constrain() guarded: a faulty rule never breaks the UI (the config is kept as is). */
export function safeConstrain(def: AssetDef, config: AssetConfig): { config: AssetConfig; constraints?: ConfigConstraints } {
  if (typeof def.constrain !== 'function') return { config };
  try {
    const r = def.constrain({ ...config });
    if (!r || typeof r !== 'object' || !r.config || typeof r.config !== 'object') throw new Error('constrain() returned no config');
    return { config: { ...r.config }, constraints: r.constraints && typeof r.constraints === 'object' ? r.constraints : undefined };
  } catch (e) {
    console.error(`[muster] ${def.id}: constrain() failed`, e);
    return { config };
  }
}

/**
 * The one place a model configuration is derived: the asset's defaults, overlaid with `cfg`
 * (unknown keys dropped, invalid choices reset, toggles coerced), then def.constrain().
 * Never throws: a malformed option list or a faulty rule falls back to what is valid.
 * Library previews, placement, the demo display, autosave restore and equipment edits all
 * use it, so the preview always shows exactly the model that will be placed.
 */
export function normalizeConfig(def: AssetDef, cfg?: AssetConfig | null): AssetConfig {
  const base: AssetConfig = {};
  const opts = Array.isArray(def.options) ? def.options : [];
  const given = cfg && typeof cfg === 'object' ? cfg : {};
  for (const o of opts) {
    try {
      if (!o || typeof o.id !== 'string') continue;
      if (o.kind === 'toggle') {
        const v = given[o.id];
        base[o.id] = typeof v === 'boolean' ? v : !!o.default;
      } else if (o.kind === 'select') {
        const choices = Array.isArray(o.choices) ? o.choices : [];
        const ok = (v: unknown) => typeof v === 'string' && choices.some((c) => c && c.id === v);
        const v = given[o.id];
        base[o.id] = ok(v) ? (v as string) : ok(o.default) ? o.default : String(choices[0]?.id ?? o.default ?? '');
      }
    } catch (e) {
      console.error(`[muster] ${def.id}: option ${String(o?.id)} is malformed`, e);
    }
  }
  return safeConstrain(def, base).config;
}

function validate(d: AssetDef | undefined): string | null {
  if (!d || typeof d !== 'object') return 'Module has no asset definition.';
  if (typeof d.id !== 'string' || !d.id) return 'Definition has no id.';
  if (typeof d.name !== 'string' || !d.name) return 'Definition has no name.';
  if (!CATEGORIES.includes(d.category)) return `Unknown category "${String(d.category)}".`;
  if (!FACTIONS.some((f) => f.id === d.faction)) return `Unknown faction "${String(d.faction)}".`;
  if (typeof d.build !== 'function') return 'Definition has no build().';
  if (!d.footprint || !(d.footprint.w > 0) || !(d.footprint.l > 0)) return 'Definition has no valid footprint.';
  if (!d.spacing || !(d.spacing.min > 0) || !(d.spacing.max >= d.spacing.min)) return 'Definition has no valid spacing.';
  if (!(d.maxQuantity >= 1)) return 'Definition has no valid maxQuantity.';
  if (d.options !== undefined && (!Array.isArray(d.options) || d.options.some((o) => !o || typeof o.id !== 'string'))) return 'Definition has malformed options.';
  if (d.status !== 'available' && d.status !== 'unavailable') return `Unknown status "${String(d.status)}".`;
  return null;
}

export class Catalog {
  defs: AssetDef[] = [];
  issues: LoadIssue[] = [];
  loaded = false;
  private byId = new Map<string, AssetDef>();
  private broken = new Map<string, string>();
  private listeners = new Set<() => void>();

  constructor(readonly showHidden: boolean) {}

  onChange(fn: () => void) {
    this.listeners.add(fn);
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  async load() {
    const report = await loadAllAssets();
    for (const e of report.errors) {
      const first = e.error.split('\n').find((s) => s.trim()) ?? 'Failed to load.';
      this.issues.push({ path: e.path, message: first.trim().slice(0, 200) });
    }
    for (const d of report.defs) {
      const problem = validate(d);
      if (problem) {
        this.issues.push({ path: d?.id ?? 'unknown', message: problem });
        console.error(`[muster] invalid asset definition ${d?.id ?? ''}: ${problem}`);
        continue;
      }
      if (this.byId.has(d.id)) {
        this.issues.push({ path: d.id, message: 'Duplicate asset id; the second definition was ignored.' });
        continue;
      }
      this.byId.set(d.id, d);
      this.defs.push(d);
    }
    this.loaded = true;
    this.emit();
  }

  get(id: string | undefined | null): AssetDef | undefined {
    return id ? this.byId.get(id) : undefined;
  }

  /** Entries the library lists (hidden test assets only with ?showHidden=1). */
  listed(): AssetDef[] {
    return this.defs.filter((d) => this.showHidden || !d.hidden);
  }

  placeable(id: string): boolean {
    const d = this.byId.get(id);
    return !!d && d.status === 'available' && !this.broken.has(id);
  }

  isBroken(id: string): boolean {
    return this.broken.has(id);
  }

  unavailableReason(id: string): string | null {
    const d = this.byId.get(id);
    if (!d) return 'This model is not in the catalog.';
    const b = this.broken.get(id);
    if (b) return b;
    if (d.status !== 'available') return d.unavailableReason ?? 'Not available yet.';
    return null;
  }

  markBroken(id: string, err: unknown) {
    if (this.broken.has(id)) return;
    this.broken.set(id, 'The model could not be built, so it has been withdrawn from placement.');
    console.error(`[muster] model ${id} failed to build`, err);
    this.emit();
  }

  matchesFaction(d: AssetDef, f: FactionFilter): boolean {
    if (f === 'all') return true;
    const alignment = ALIGNMENTS.find((a) => a.toLowerCase() === f);
    if (alignment) return factionInfo(d.faction)?.alignment === alignment;
    return d.faction === f;
  }

  /** Listed entries per country (category and search ignored), for the country menu. */
  factionCounts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const f of FACTIONS) out[f.id] = 0;
    for (const d of this.listed()) out[d.faction] = (out[d.faction] ?? 0) + 1;
    return out;
  }

  matchesSearch(d: AssetDef, q: string): boolean {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    const hay = [d.name, d.subtitle, d.summary, d.category, factionName(d.faction)].join(' ').toLowerCase();
    return s.split(/\s+/).every((w) => hay.includes(w));
  }

  /** Library entries for a filter, sorted by category, availability, order and name. */
  filtered(f: LibraryFilter): AssetDef[] {
    const cat = (c: Category) => CATEGORIES.indexOf(c);
    return this.listed()
      .filter((d) => this.matchesFaction(d, f.faction) && this.matchesSearch(d, f.search) && (f.category === 'All' || d.category === f.category))
      .sort(
        (a, b) =>
          cat(a.category) - cat(b.category) ||
          Number(!this.placeable(a.id)) - Number(!this.placeable(b.id)) ||
          (a.order ?? 100) - (b.order ?? 100) ||
          a.name.localeCompare(b.name),
      );
  }

  /** Entry counts per category for the current faction + search (category ignored). */
  counts(f: LibraryFilter): Record<CategoryFilter, number> {
    const out = { All: 0 } as Record<CategoryFilter, number>;
    for (const c of CATEGORIES) out[c] = 0;
    for (const d of this.listed()) {
      if (!this.matchesFaction(d, f.faction) || !this.matchesSearch(d, f.search)) continue;
      out[d.category]++;
      out.All++;
    }
    return out;
  }
}
