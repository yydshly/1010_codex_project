/**
 * QA hooks for automated tests: window.__app (below) and window.__appReady (set by the app
 * once the initial display has been placed and rendered). Instance indices are 0-based in
 * slot order; positions are metres on the ground plane.
 */
import type { AssetConfig } from '../core/types';
import type { App } from './app';
import { FACTION_FILTERS, isFactionFilter } from './catalog';
import type { CameraView, FactionFilter, Formation, LibraryFilter } from './types';

type Pos = { x: number; z: number } | [number, number] | [number, number, number] | null | undefined;

function parsePos(p: Pos): { x: number; z: number } | null {
  if (!p) return null;
  if (Array.isArray(p)) return p.length >= 3 ? { x: Number(p[0]), z: Number(p[2]) } : { x: Number(p[0]), z: Number(p[1]) };
  if (typeof p === 'object' && 'x' in p) return { x: Number(p.x), z: Number(p.z) };
  return null;
}

/** Common extra names for countries (applied only to ids that exist in FACTIONS). */
const EXTRA_ALIASES: Record<string, string> = {
  german: 'germany',
  ussr: 'soviet',
  'soviet union': 'soviet',
  us: 'usa',
  'united states': 'usa',
  america: 'usa',
  american: 'usa',
  uk: 'uk',
  british: 'uk',
  britain: 'uk',
  'great britain': 'uk',
  'united kingdom': 'uk',
  japanese: 'japan',
  italian: 'italy',
};

/**
 * setFilter('...') names: every filter id and label (quick filters and countries, from
 * FACTIONS), plus the extra aliases above. Lower case.
 */
const FACTION_ALIASES: Record<string, FactionFilter> = (() => {
  const out: Record<string, FactionFilter> = { allied: 'allies' };
  for (const f of FACTION_FILTERS) {
    out[f.id.toLowerCase()] = f.id;
    out[f.label.toLowerCase()] = f.id;
  }
  for (const [alias, id] of Object.entries(EXTRA_ALIASES)) if (isFactionFilter(id) && !(alias in out)) out[alias] = id;
  return out;
})();

declare global {
  interface Window {
    __app?: ReturnType<typeof createQA>;
    __appReady?: boolean;
    __musterApp?: App;
  }
}

function createQA(app: App) {
  const { store, catalog, actions, scene } = app;
  const slotAt = (id: string, index?: number | null): number | null => {
    if (index === undefined || index === null) return null;
    const g = store.group(id);
    const sorted = g ? [...g.instances].sort((a, b) => a.slot - b.slot) : [];
    return sorted[index]?.slot ?? null;
  };
  return {
    listAssets: () =>
      catalog.defs.map((d) => ({
        id: d.id,
        name: d.name,
        faction: d.faction,
        category: d.category,
        countAs: d.countAs,
        status: d.status,
        placeable: catalog.placeable(d.id),
        hidden: !!d.hidden,
        listed: catalog.showHidden || !d.hidden,
        unavailableReason: catalog.unavailableReason(d.id),
        maxQuantity: d.maxQuantity,
        spacing: d.spacing,
        footprint: d.footprint,
        options: (d.options ?? []).map((o) => ({ id: o.id, kind: o.kind, choices: o.kind === 'select' && Array.isArray(o.choices) ? o.choices.map((c) => c?.id) : undefined })),
      })),
    loadIssues: () => catalog.issues.slice(),
    /** Returns the new group id, or null when the entry cannot be placed. */
    addGroup: (assetId: string, config?: AssetConfig, pos?: Pos, quantity?: number, heading?: number) =>
      actions.addGroup(assetId, config, parsePos(pos), quantity ?? 1, heading ?? 0),
    setQuantity: (id: string, n: number) => actions.setQuantity(id, n),
    setFormation: (id: string, f: Formation) => actions.setFormation(id, f),
    setSpacing: (id: string, m: number) => actions.setSpacing(id, m),
    setColumns: (id: string, c: number | 'auto') => actions.setColumns(id, c),
    setConfig: (id: string, patch: AssetConfig) => actions.setConfig(id, patch),
    setHeading: (id: string, deg: number) => actions.setHeading(id, deg),
    setInstanceHeading: (id: string, index: number, deg: number) => {
      const s = slotAt(id, index);
      if (s !== null) actions.setInstanceHeading(id, s, deg);
    },
    moveGroup: (id: string, x: number, z: number) => actions.moveGroupTo(id, x, z),
    moveInstance: (id: string, index: number, x: number, z: number) => {
      const s = slotAt(id, index);
      if (s !== null) actions.moveInstanceTo(id, s, x, z);
    },
    removeInstance: (id: string, index: number) => {
      const s = slotAt(id, index);
      if (s !== null) actions.removeInstance(id, s);
    },
    resetLayout: (id: string, index?: number) => actions.resetLayout(id, slotAt(id, index)),
    select: (id: string | null, instance?: number | null) => actions.select(id, id ? slotAt(id, instance) : null),
    getSelection: () => {
      const s = store.selection;
      if (!s) return null;
      const g = store.group(s.groupId);
      const sorted = g ? [...g.instances].sort((a, b) => a.slot - b.slot) : [];
      return { groupId: s.groupId, instance: s.slot === null ? null : sorted.findIndex((i) => i.slot === s.slot) };
    },
    duplicate: (id: string) => actions.duplicate(id),
    removeGroup: (id: string) => actions.removeGroup(id),
    clear: () => actions.clear(),
    loadDemo: () => app.loadDemo(false),
    undo: () => store.undo(),
    redo: () => store.redo(),
    getCounts: () => {
      const c = scene.counts();
      return { ...c.total, total: c.models, groups: c.groups, byFaction: c.byFaction };
    },
    getGroups: () =>
      store.groups.map((g) => ({
        ...(JSON.parse(JSON.stringify(g)) as typeof g),
        name: catalog.get(g.assetId)?.name,
        countAs: catalog.get(g.assetId)?.countAs,
        rendered: scene.renderedCount(g.id),
        preparing: scene.isPreparing(g.id),
        world: g.instances.map((i) => actions.instanceWorld(g.id, i.slot)),
      })),
    getRenderedInstanceCount: () => scene.renderedInstanceCount(),
    /**
     * Client coordinates (CSS px) of a point on the model that a click really hits (for
     * pointer-event tests); falls back to the bounding-box centre when none is visible.
     */
    screenPoint: (id: string, instance = 0) => {
      const slot = slotAt(id, instance);
      const hit = scene.clientHitPoint(id, slot);
      if (hit) return hit;
      const box = scene.selectionBox(id, slot);
      return box ? scene.projectToClient(box.getCenter(box.min.clone())) : null;
    },
    focus: (id?: string | null, instance?: number | null) => app.focus(id ?? null, id ? slotAt(id, instance) : null),
    setCamera: (v: Partial<CameraView>) => {
      const cur = scene.rig.getView();
      const num = (x: unknown, d: number) => (Number.isFinite(Number(x)) && x !== null && x !== '' ? Number(x) : d);
      const t = Array.isArray(v?.target) ? v.target : cur.target;
      scene.rig.setView({
        target: [num(t[0], cur.target[0]), num(t[1], cur.target[1]), num(t[2], cur.target[2])],
        distance: num(v?.distance, cur.distance),
        yaw: num(v?.yaw, cur.yaw),
        pitch: num(v?.pitch, cur.pitch),
      });
    },
    getCamera: () => scene.rig.getView(),
    resetView: () => app.resetView(),
    hideUI: (b = true) => app.setUIHidden(!!b),
    setFilter: (f: string | Partial<LibraryFilter>) => {
      if (typeof f === 'string') {
        const id = FACTION_ALIASES[f.trim().toLowerCase()];
        if (!id) throw new Error(`unknown faction filter "${f}" (known: ${Object.keys(FACTION_ALIASES).join(', ')})`);
        store.setFilter({ faction: id });
      } else {
        if (f && f.faction !== undefined && !isFactionFilter(f.faction)) throw new Error(`unknown faction filter "${String(f.faction)}"`);
        store.setFilter(f);
      }
      return { ...store.filter };
    },
    getFilter: () => ({ ...store.filter }),
    /** Library entries currently listed (ids in display order). */
    getLibrary: () => catalog.filtered(store.filter).map((d) => d.id),
    /** Library entry counts per category for the current filter (what the category chips show). */
    getLibraryCounts: () => catalog.counts(store.filter),
    /** Listed entries per country (the numbers in the Country / Faction menu). */
    getFactionCounts: () => catalog.factionCounts(),
    startPlacement: (assetId: string) => app.startPlacement(assetId),
    cancelPlacement: () => app.interaction.cancelPlacement(),
    /** WebGL frames rendered so far (must stay constant while nothing changes). */
    getFrameCount: () => scene.frames,
    /** Boot timings in ms: catalog discovery, initial display build, page time at ready. */
    getTimings: () => ({ ...app.timings }),
    /** Per built model configuration: build + bake time, triangles, draw calls. */
    getModelStats: () => app.models.stats(),
    /** CPU render time of recent frames; pass true to reset the window first. */
    getRenderStats: (reset = false) => {
      if (reset) scene.resetRenderStats();
      return scene.renderStats();
    },
    /** Resolves after the next rendered frame (requests one). */
    nextFrame: () => scene.whenRendered(),
    /** Resolves when all pending model builds (scene + previews) are done and a frame is drawn. */
    whenIdle: () => app.whenIdle(),
  };
}

export function installQA(app: App) {
  window.__app = createQA(app);
  // development builds only: the live app object, for debugging and robustness tests
  if (import.meta.env.DEV) window.__musterApp = app;
}
