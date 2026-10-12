/**
 * Every operation on the arranged display. UI panels, keyboard shortcuts, pointer
 * interaction and the QA API all call these, so behaviour is identical everywhere.
 * Each call is one undoable step (live edits collapse into one step via endLive()).
 */
import type { AssetConfig, AssetDef } from '../core/types';
import { normalizeConfig, type Catalog } from './catalog';
import type { DemoPlacement } from './demo';
import {
  applyFormation,
  applyQuantity,
  clampPose,
  extents,
  findFree,
  fitToPlinth,
  groupRect,
  instancePose,
  newInstance,
  normDeg,
  offsetForWorld,
  rankCapacity,
  removeSlot,
  type Pose,
  type Rect,
} from './layout';
import type { Store } from './store';
import { DISPLAY_LIMIT, type Formation, type Group } from './types';

function sameConfig(a: AssetConfig, b: AssetConfig): boolean {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}

export class Actions {
  /** Ground point the camera looks at (new groups without a position go near it). */
  viewCenter: () => { x: number; z: number } = () => ({ x: 0, z: 0 });

  constructor(private store: Store, private catalog: Catalog, private notify: (msg: string) => void) {}

  private grp(id: string): Group | undefined {
    return this.store.group(id);
  }

  private def(g: Group): AssetDef | undefined {
    return this.catalog.get(g.assetId);
  }

  totalModels(): number {
    return this.store.groups.reduce((n, g) => n + g.instances.length, 0);
  }

  /** Quantity cap of a group: its per-group limit, or what the display limit leaves. */
  capFor(g: Group): { cap: number; by: 'group' | 'display' } {
    const def = this.def(g);
    const per = def?.maxQuantity ?? 1;
    const room = DISPLAY_LIMIT - (this.totalModels() - g.instances.length);
    return per <= room ? { cap: per, by: 'group' } : { cap: Math.max(1, room), by: 'display' };
  }

  /** See catalog.normalizeConfig (guarded defaults + overrides + def.constrain). */
  normalizeConfig(def: AssetDef, cfg?: AssetConfig | null): AssetConfig {
    return normalizeConfig(def, cfg);
  }

  private rects(except?: string): Rect[] {
    const out: Rect[] = [];
    for (const g of this.store.groups) {
      if (g.id === except) continue;
      const d = this.def(g);
      if (d) out.push(groupRect(g, d));
    }
    return out;
  }

  private makeGroup(def: AssetDef, o: { config?: AssetConfig; x: number; z: number; heading: number; quantity?: number; formation?: Formation }): Group {
    const n = Math.max(1, Math.min(o.quantity ?? 1, def.maxQuantity));
    const formation: Formation = n > 1 ? (o.formation && o.formation !== 'single' ? o.formation : 'line') : o.formation ?? 'single';
    const g: Group = {
      id: this.store.newId(),
      assetId: def.id,
      config: this.normalizeConfig(def, o.config),
      quantity: n,
      formation,
      spacing: def.spacing.default,
      columns: 'auto',
      heading: normDeg(o.heading),
      anchor: { x: o.x, z: o.z },
      instances: Array.from({ length: n }, (_, i) => newInstance(i)),
    };
    fitToPlinth(g, def);
    return g;
  }

  /** Place a new group. pos = the first model's position (default: a free spot near the view). */
  addGroup(assetId: string, config?: AssetConfig, pos?: { x: number; z: number } | null, quantity = 1, heading = 0): string | null {
    const def = this.catalog.get(assetId);
    if (!def || !this.catalog.placeable(assetId)) {
      this.notify(`${def?.name ?? 'This entry'} is not available for placement.`);
      return null;
    }
    if (this.totalModels() >= DISPLAY_LIMIT) {
      this.notify(`Display limit reached: at most ${DISPLAY_LIMIT} models can be shown at once.`);
      return null;
    }
    const h = normDeg(Number(heading) || 0);
    let x: number, z: number;
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.z)) {
      const c = clampPose({ x: pos.x, z: pos.z, heading: h }, def);
      x = c.x;
      z = c.z;
    } else {
      const vc = this.viewCenter();
      const { ex, ez } = extents(def, h);
      const gap = Math.min(Math.max(def.spacing.default * 0.4, 0.4), 3);
      const t = findFree({ minX: vc.x - ex, maxX: vc.x + ex, minZ: vc.z - ez, maxZ: vc.z + ez }, this.rects(), gap);
      x = vc.x + t.x;
      z = vc.z + t.z;
    }
    const g = this.makeGroup(def, { config, x, z, heading: h });
    this.store.commit(`Add ${def.name}`, () => {
      this.store.groups.push(g);
      const want = Math.min(Math.max(1, Math.round(quantity)), this.capFor(g).cap);
      if (want > 1) applyQuantity(g, def, want); // grows from the placed model as a Line
    });
    return g.id;
  }

  setQuantity(id: string, n: number): number {
    const g = this.grp(id), def = g && this.def(g);
    if (!g || !def) return 0;
    const { cap, by } = this.capFor(g);
    const want = Math.max(1, Math.round(Number(n) || 1));
    const target = Math.min(want, cap);
    if (want > cap) {
      this.notify(by === 'group' ? `${def.name}: up to ${def.maxQuantity} per group.` : `Display limit: at most ${DISPLAY_LIMIT} models can be shown at once.`);
    }
    if (target === g.instances.length) return target;
    let note: string | null = null;
    this.store.commit('Quantity', () => {
      note = applyQuantity(g, def, target);
    });
    if (note) this.notify(note);
    return g.instances.length;
  }

  setFormation(id: string, f: Formation) {
    const g = this.grp(id), def = g && this.def(g);
    if (!g || !def || g.formation === f || (f !== 'single' && f !== 'line' && f !== 'grid')) return;
    let note: string | null = null;
    this.store.commit('Formation', () => {
      note = applyFormation(g, def, f);
    });
    if (note) this.notify(note);
  }

  setSpacing(id: string, m: number, live = false) {
    const g = this.grp(id), def = g && this.def(g);
    if (!g || !def) return;
    const v = Math.round(Math.min(def.spacing.max, Math.max(def.spacing.min, Number(m) || def.spacing.default)) * 100) / 100;
    const fn = () => {
      g.spacing = v;
      fitToPlinth(g, def);
    };
    if (live) this.store.live('Spacing', fn);
    else this.store.commit('Spacing', fn);
  }

  setColumns(id: string, c: number | 'auto') {
    const g = this.grp(id), def = g && this.def(g);
    if (!g || !def || (c !== 'auto' && !Number.isFinite(Number(c)))) return;
    const v = c === 'auto' ? 'auto' : Math.max(1, Math.min(Math.round(Number(c)), rankCapacity(def, g.spacing)));
    if (v === g.columns) return;
    this.store.commit('Columns', () => {
      g.columns = v;
      fitToPlinth(g, def);
    });
  }

  setHeading(id: string, deg: number, live = false) {
    const g = this.grp(id), def = g && this.def(g);
    if (!g || !def) return;
    const fn = () => {
      g.heading = normDeg(Number(deg) || 0);
      fitToPlinth(g, def);
    };
    if (live) this.store.live('Rotate', fn);
    else this.store.commit('Rotate', fn);
  }

  instanceWorld(id: string, slot: number): Pose | null {
    const g = this.grp(id), def = g && this.def(g);
    const inst = g?.instances.find((i) => i.slot === slot);
    return g && def && inst ? instancePose(g, def, inst) : null;
  }

  /** Absolute heading of one model (group heading + its own adjustment). */
  setInstanceHeading(id: string, slot: number, deg: number, live = false) {
    const g = this.grp(id);
    const inst = g?.instances.find((i) => i.slot === slot);
    if (!g || !inst) return;
    const fn = () => {
      let o = normDeg((Number(deg) || 0) - g.heading);
      if (o > 180) o -= 360;
      inst.headingOffset = Math.round(o * 100) / 100;
    };
    if (live) this.store.live('Rotate model', fn);
    else this.store.commit('Rotate model', fn);
  }

  /** Q/E: rotate the selection (group, or one model) by delta degrees. */
  rotateBy(id: string, slot: number | null, delta: number) {
    const g = this.grp(id);
    if (!g) return;
    if (slot === null) this.setHeading(id, g.heading + delta);
    else {
      const p = this.instanceWorld(id, slot);
      if (p) this.setInstanceHeading(id, slot, p.heading + delta);
    }
  }

  setConfig(id: string, patch: AssetConfig): AssetConfig | null {
    const g = this.grp(id), def = g && this.def(g);
    if (!g || !def) return null;
    const next = this.normalizeConfig(def, { ...g.config, ...patch });
    if (sameConfig(next, g.config)) return g.config;
    this.store.commit('Equipment', () => {
      g.config = next;
    });
    return next;
  }

  moveGroupTo(id: string, x: number, z: number, live = false) {
    const g = this.grp(id), def = g && this.def(g);
    if (!g || !def || !Number.isFinite(x) || !Number.isFinite(z)) return;
    const fn = () => {
      g.anchor = { x, z };
      fitToPlinth(g, def);
    };
    if (live) this.store.live('Move', fn);
    else this.store.commit('Move', fn);
  }

  /** Move one model to a world position (stored as its adjustment relative to its slot). */
  moveInstanceTo(id: string, slot: number, x: number, z: number, live = false) {
    const g = this.grp(id), def = g && this.def(g);
    const inst = g?.instances.find((i) => i.slot === slot);
    if (!g || !def || !inst || !Number.isFinite(x) || !Number.isFinite(z)) return;
    const fn = () => {
      inst.offset = offsetForWorld(g, def, inst, x, z);
    };
    if (live) this.store.live('Move model', fn);
    else this.store.commit('Move model', fn);
  }

  endLive() {
    this.store.end();
  }

  duplicate(id: string): string | null {
    const g = this.grp(id), def = g && this.def(g);
    if (!g || !def) return null;
    if (!this.catalog.placeable(def.id)) {
      this.notify(`${def.name} is not available for placement.`);
      return null;
    }
    if (this.totalModels() + g.instances.length > DISPLAY_LIMIT) {
      this.notify(`Display limit: at most ${DISPLAY_LIMIT} models can be shown at once.`);
      return null;
    }
    const copy: Group = JSON.parse(JSON.stringify(g));
    copy.id = this.store.newId();
    const r = groupRect(g, def);
    const w = r.maxX - r.minX, l = r.maxZ - r.minZ;
    const gap = Math.max(0.35, Math.min(g.spacing * 0.5, 4));
    const t = findFree(r, this.rects(), gap * 0.6, [
      { x: w + gap, z: 0 },
      { x: -(w + gap), z: 0 },
      { x: 0, z: l + gap },
      { x: 0, z: -(l + gap) },
    ]);
    copy.anchor = { x: g.anchor.x + t.x, z: g.anchor.z + t.z };
    this.store.commit(`Duplicate ${def.name}`, () => {
      fitToPlinth(copy, def);
      this.store.groups.push(copy);
    });
    this.select(copy.id);
    return copy.id;
  }

  removeGroup(id: string) {
    if (!this.grp(id)) return;
    this.store.commit('Remove', () => {
      this.store.groups = this.store.groups.filter((g) => g.id !== id);
    });
  }

  removeInstance(id: string, slot: number) {
    const g = this.grp(id), def = g && this.def(g);
    if (!g || !def) return;
    if (g.instances.length <= 1) return this.removeGroup(id);
    this.store.commit('Remove model', () => removeSlot(g, def, slot));
    this.select(id);
  }

  removeSelection() {
    const s = this.store.selection;
    if (!s) return;
    if (s.slot !== null) this.removeInstance(s.groupId, s.slot);
    else this.removeGroup(s.groupId);
  }

  resetLayout(id: string, slot: number | null = null) {
    const g = this.grp(id), def = g && this.def(g);
    if (!g || !def) return;
    this.store.commit(slot === null ? 'Reset Layout' : 'Reset model', () => {
      for (const i of g.instances) {
        if (slot !== null && i.slot !== slot) continue;
        i.offset = { dx: 0, dz: 0 };
        i.headingOffset = 0;
      }
      fitToPlinth(g, def);
    });
  }

  clear() {
    this.store.dormant = [];
    this.store.commit('Clear Ground', () => {
      this.store.groups = [];
    });
    this.store.select(null);
  }

  /**
   * Replace the display with resolved demo entries (see demo.ts; the app pre-builds them so
   * only models that actually build are passed in). Returns the number of groups placed.
   */
  placeDemo(items: DemoPlacement[], keepDormant = false): number {
    if (!keepDormant) this.store.dormant = [];
    this.store.commit('Demo Display', () => {
      this.store.groups = [];
      let total = 0;
      for (const it of items) {
        if (!this.catalog.placeable(it.def.id)) continue;
        const g = this.makeGroup(it.def, { config: it.config, x: it.x, z: it.z, heading: it.heading, quantity: it.quantity, formation: it.formation });
        if (total + g.instances.length > DISPLAY_LIMIT) continue;
        total += g.instances.length;
        this.store.groups.push(g);
      }
    });
    this.store.select(null);
    return this.store.groups.length;
  }

  select(id: string | null, slot: number | null = null) {
    this.store.select(id ? { groupId: id, slot } : null);
  }

  /**
   * Restore groups from an autosave. Groups whose model is not available right now are kept
   * aside as dormant (not shown, still saved) so they return with their model; malformed
   * entries are dropped.
   */
  restore(groups: Group[]): { restored: number; skipped: number; dormant: number } {
    const ok: Group[] = [];
    const dormant: Group[] = [];
    let skipped = 0;
    for (const raw of groups) {
      if (!raw || typeof raw !== 'object' || typeof raw.assetId !== 'string' || !Array.isArray(raw.instances) || !raw.instances.length) {
        skipped++;
        continue;
      }
      const def = this.catalog.get(raw.assetId);
      if (!def || !this.catalog.placeable(def.id)) {
        dormant.push(raw);
        continue;
      }
      const inst = raw.instances
        .filter((i) => Number.isInteger(i?.slot) && i.slot >= 0)
        .slice(0, def.maxQuantity)
        .map((i) => ({ slot: i.slot, offset: { dx: Number(i.offset?.dx) || 0, dz: Number(i.offset?.dz) || 0 }, headingOffset: Number(i.headingOffset) || 0 }));
      if (!inst.length) {
        skipped++;
        continue;
      }
      const g: Group = {
        id: this.store.newId(),
        assetId: def.id,
        config: this.normalizeConfig(def, raw.config),
        quantity: inst.length,
        formation: raw.formation === 'grid' || raw.formation === 'line' ? raw.formation : inst.length > 1 ? 'line' : 'single',
        spacing: Math.min(def.spacing.max, Math.max(def.spacing.min, Number(raw.spacing) || def.spacing.default)),
        columns: raw.columns === 'auto' || !(Number(raw.columns) >= 1) ? 'auto' : Math.round(Number(raw.columns)),
        heading: normDeg(Number(raw.heading) || 0),
        anchor: { x: Number(raw.anchor?.x) || 0, z: Number(raw.anchor?.z) || 0 },
        instances: inst,
      };
      fitToPlinth(g, def);
      ok.push(g);
      if (ok.reduce((n, x) => n + x.instances.length, 0) > DISPLAY_LIMIT) {
        ok.pop();
        skipped++;
        break;
      }
    }
    this.store.dormant = dormant;
    this.store.silent(() => {
      this.store.groups = ok;
    });
    return { restored: ok.length, skipped, dormant: dormant.length };
  }
}
