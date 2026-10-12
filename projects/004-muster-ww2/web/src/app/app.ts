/**
 * Muster application: wires the store, catalog, model builds, 3D scene, pointer and keyboard
 * interaction, library / inspector / overview panels and the QA API together, and runs the
 * boot sequence (discover assets -> restore autosave or place the demo display -> render ->
 * window.__appReady -> generate library previews in idle time).
 */
import { configKey } from '../core/types';
import type { AssetConfig, AssetDef } from '../core/types';
import { Actions } from './actions';
import { DEFAULT_VIEW } from './camera';
import { Catalog } from './catalog';
import type { AppContext } from './context';
import { DEMO_DISPLAY, DEMO_VIEW, planDemo } from './demo';
import { Interaction } from './interaction';
import { installKeyboard } from './keyboard';
import { ModelService } from './models';
import { installQA } from './qa';
import { SceneController } from './scene';
import { Store } from './store';
import { Thumbnails } from './thumbnails';
import { DOT } from './ui/dom';
import { Toasts, confirmDialog } from './ui/feedback';
import { InspectorPanel } from './ui/inspector';
import { LibraryPanel } from './ui/library';
import { OverviewBar } from './ui/overview';
import { buildShell, type Shell } from './ui/shell';
import type { CameraView } from './types';

export class App implements AppContext {
  readonly store = new Store();
  readonly models = new ModelService();
  readonly catalog: Catalog;
  readonly actions: Actions;
  readonly scene: SceneController;
  readonly interaction: Interaction;
  readonly thumbs: Thumbnails;
  private shell: Shell;
  private toasts: Toasts;
  private library: LibraryPanel;
  private inspector: InspectorPanel;
  private overview: OverviewBar;
  private uiQueued = false;
  private readonly params = new URLSearchParams(location.search);
  private bootDone!: () => void;
  readonly booted = new Promise<void>((r) => (this.bootDone = r));

  constructor(mount: HTMLElement) {
    this.catalog = new Catalog(this.params.get('showHidden') === '1');
    this.actions = new Actions(this.store, this.catalog, (m) => this.notify(m));
    this.shell = buildShell(mount, this);
    this.toasts = new Toasts(this.shell.toasts);
    this.scene = new SceneController(this.shell.stage, this.store, this.catalog, this.models);
    this.interaction = new Interaction(this.scene, this.store, this.actions, this.catalog, this.models, (m) => this.notify(m));
    this.thumbs = new Thumbnails(this.catalog, this.models, !import.meta.env.DEV);
    this.library = new LibraryPanel(this.shell.library, this);
    this.inspector = new InspectorPanel(this.shell.inspector, this);
    this.overview = new OverviewBar(this.shell.overview);

    this.models.busy = () => this.interaction.busy;
    this.actions.viewCenter = () => ({ x: this.scene.rig.target.x, z: this.scene.rig.target.z });
    this.scene.onUpdate = () => this.queueUI();
    this.scene.onBuildError = (gid, def, err, failed, shown) => this.handleBuildError(gid, def, err, failed, shown);
    this.scene.onCameraSettled = () => this.store.setCamera(this.scene.rig.getView());
    this.interaction.onPlacementChange = () => this.updatePlacementHint();
    this.interaction.onFocusRequest = () => this.focus();

    this.store.on((e) => {
      if (e.layout) this.scene.sync();
      else if (e.selection) this.scene.updateMarkers();
      if (e.filter) this.library.render();
      this.queueUI();
    });
    this.catalog.onChange(() => {
      this.dropBroken();
      this.library.render();
      this.queueUI();
    });
    installKeyboard(this);
    window.addEventListener('pagehide', () => this.store.save());
  }

  // ------------------------------------------------------------------ boot

  /** Boot timings in ms (QA / performance notes): catalog discovery, initial display, ready. */
  readonly timings: { catalogMs?: number; displayMs?: number; readyAt?: number } = {};

  async boot() {
    const t0 = performance.now();
    // Read the autosave before anything else, and keep autosave off until the initial
    // display is in place: an early camera-settle save must never overwrite the arrangement
    // being restored with the still-empty boot state.
    this.store.autosave = false;
    const saved = this.params.has('demo') ? null : Store.loadSaved();
    try {
      await this.catalog.load();
    } catch (e) {
      console.error('[muster] asset discovery failed', e);
    }
    const t1 = performance.now();
    this.timings.catalogMs = Math.round(t1 - t0);
    this.library.render();
    try {
      // the last arrangement (autosave), else the demo display; models that are no longer
      // available or fail to build are skipped, and an empty result falls back to the demo
      let restored = false;
      if (saved && saved.groups.length) {
        const r = this.actions.restore(saved.groups);
        if (r.dormant) this.notify(`${r.dormant} saved ${r.dormant === 1 ? 'group is' : 'groups are'} not shown: the model is not available right now. ${r.dormant === 1 ? 'It returns' : 'They return'} when it is.`);
        if (r.skipped) this.notify(`${r.skipped} saved ${r.skipped === 1 ? 'group' : 'groups'} could not be read and ${r.skipped === 1 ? 'was' : 'were'} left out.`);
        if (r.restored > 0) {
          await this.settle();
          restored = this.store.groups.length > 0;
          if (restored) {
            if (saved.camera && this.validView(saved.camera)) this.scene.rig.setView(saved.camera);
            else this.frameDemo(false);
          }
        }
      }
      // (the demo shown instead keeps any dormant saved groups for when their models return)
      if (!restored) await this.loadDemo(false, true);
    } catch (e) {
      console.error('[muster] the initial display could not be set up', e);
    }
    this.store.autosave = true;
    this.store.setCamera(this.scene.rig.getView());
    this.store.clearHistory();
    await this.scene.whenRendered();
    this.timings.displayMs = Math.round(performance.now() - t1);
    this.timings.readyAt = Math.round(performance.now());
    this.shell.setLoading(null);
    window.__appReady = true;
    this.bootDone();
    const notes = this.bootNotes ?? [];
    this.bootNotes = null;
    for (const n of notes) this.notify(n);
    this.thumbs.start();
  }

  private validView(v: unknown): v is CameraView {
    const c = v as CameraView;
    return !!c && Array.isArray(c.target) && c.target.length === 3 && c.target.every(Number.isFinite) && [c.distance, c.yaw, c.pitch].every(Number.isFinite);
  }

  /** Wait until every group's model is built and placed, then one frame is drawn. */
  private async settle() {
    for (let i = 0; i < 60; i++) {
      await this.models.whenIdle(0);
      await this.scene.whenCompiled();
      await this.scene.whenRendered();
      if (this.models.pendingAt(0) === 0 && this.scene.preparingCount() === 0) return;
    }
  }

  async whenIdle() {
    await this.booted;
    for (let i = 0; i < 200; i++) {
      await this.models.whenIdle(1);
      await this.thumbs.whenIdle();
      await this.scene.whenCompiled();
      await this.scene.whenRendered();
      if (this.models.pendingAt(1) === 0 && this.thumbs.pending === 0 && this.scene.preparingCount() === 0) return;
    }
  }

  // ------------------------------------------------------------------ UI refresh

  private queueUI() {
    if (this.uiQueued) return;
    this.uiQueued = true;
    queueMicrotask(() => {
      this.uiQueued = false;
      // one faulty panel never takes the others down
      const parts: [string, () => void][] = [
        ['shell', () => this.shell.update()],
        ['inspector', () => this.inspector.update()],
        ['overview', () => this.overview.update(this.scene.counts(), this.scene.preparingCount())],
      ];
      for (const [name, fn] of parts) {
        try {
          fn();
        } catch (e) {
          console.error(`[muster] ${name} update failed`, e);
        }
      }
    });
  }

  /** Notes raised while the display is still being prepared wait until it is shown. */
  private bootNotes: string[] | null = [];

  notify(msg: string) {
    if (this.bootNotes) {
      if (!this.bootNotes.includes(msg)) this.bootNotes.push(msg);
      return;
    }
    this.toasts.show(msg, 4200);
  }

  private updatePlacementHint() {
    const pl = this.interaction.placement;
    const def = pl ? this.catalog.get(pl.assetId) : undefined;
    if (!pl || !def) {
      this.shell.setPlacementHint(null);
      return;
    }
    this.shell.setPlacementHint({
      title: `Placing ${def.name}`,
      detail: pl.ready ? `Click the ground to place ${DOT} Q / E rotate ${DOT} Shift+click places another ${DOT} Esc cancels` : 'Preparing model...',
    });
  }

  // ------------------------------------------------------------------ failures

  private handleBuildError(groupId: string, def: AssetDef, err: unknown, failed: AssetConfig, shown: AssetConfig | null) {
    const fallback = shown ?? this.actions.normalizeConfig(def);
    if (configKey(def, fallback) !== configKey(def, failed)) {
      console.error(`[muster] ${def.id}: configuration ${configKey(def, failed)} failed to build`, err);
      this.store.silent(() => {
        const g = this.store.group(groupId);
        if (g) g.config = { ...fallback };
      });
      this.notify(`${def.name}: this equipment combination could not be built, so the previous one was kept.`);
      return;
    }
    this.catalog.markBroken(def.id, err);
  }

  /**
   * Withdraw groups whose model turned out not to build. They are kept dormant (saved, not
   * shown), so a model that is fixed later brings them back on the next visit.
   */
  private dropBroken() {
    const bad = this.store.groups.filter((g) => this.catalog.isBroken(g.assetId));
    if (!bad.length) return;
    const names = [...new Set(bad.map((g) => this.catalog.get(g.assetId)?.name ?? g.assetId))];
    this.store.dormant.push(...(JSON.parse(JSON.stringify(bad)) as typeof bad));
    this.store.silent(() => {
      this.store.groups = this.store.groups.filter((g) => !this.catalog.isBroken(g.assetId));
    });
    this.notify(`${names.join(', ')} could not be built and ${names.length === 1 ? 'was' : 'were'} removed from the display.`);
  }

  // ------------------------------------------------------------------ commands

  focus(id: string | null = null, slot: number | null = null) {
    const sel = this.store.selection;
    let boxes = id ? this.scene.modelBoxes(id, slot) : sel ? this.scene.modelBoxes(sel.groupId, sel.slot) : [];
    if (!boxes.length) boxes = this.scene.modelBoxes();
    if (!boxes.length) {
      this.resetView();
      return;
    }
    this.scene.rig.frameBoxes(boxes, { animate: true, fit: 1.15 });
  }

  resetView() {
    this.frameDemo(true);
  }

  private frameDemo(animate: boolean) {
    const boxes = this.scene.modelBoxes();
    if (boxes.length) this.scene.rig.frameBoxes(boxes, { yaw: DEMO_VIEW.yaw, pitch: DEMO_VIEW.pitch, fit: DEMO_VIEW.fit, animate, minDistance: 2.5 });
    else this.scene.rig.setView(DEFAULT_VIEW, animate);
  }

  /**
   * Place the demo display (demo.ts DEMO_DISPLAY) and frame what was placed. Every entry's
   * model is built first; entries whose asset is missing, unavailable or fails to build are
   * skipped, so a broken model never reaches the display. Returns the number of groups.
   */
  async loadDemo(animate = true, keepDormant = false): Promise<number> {
    if (this.demoBusy) return this.demoBusy;
    const run = async () => {
      this.interaction.cancelPlacement();
      const plan = planDemo(this.catalog);
      const results = await Promise.allSettled(plan.items.map((it) => this.models.request(it.def, it.config, 0)));
      const ok = plan.items.filter((it, i) => {
        const r = results[i];
        if (r.status === 'fulfilled') return true;
        plan.skipped.push({ assetId: it.def.id, reason: `failed to build: ${String((r.reason as Error)?.message ?? r.reason)}` });
        // the default configuration itself fails: withdraw the entry from placement too
        if (configKey(it.def, it.config) === configKey(it.def, this.actions.normalizeConfig(it.def))) this.catalog.markBroken(it.def.id, r.reason);
        else console.error(`[muster] demo: ${it.def.id} ${configKey(it.def, it.config)} failed to build`, r.reason);
        return false;
      });
      if (import.meta.env.DEV && plan.skipped.length) {
        console.info(`[muster] demo display: ${ok.length} of ${DEMO_DISPLAY.length} entries placed; skipped:\n` + plan.skipped.map((s) => `  ${s.assetId} - ${s.reason}`).join('\n'));
      }
      const n = this.actions.placeDemo(ok, keepDormant);
      await this.settle();
      this.frameDemo(animate);
      return n;
    };
    this.demoBusy = run().finally(() => (this.demoBusy = null));
    return this.demoBusy;
  }

  private demoBusy: Promise<number> | null = null;

  requestDemo() {
    if (!this.store.groups.length) {
      void this.loadDemo(true);
      return;
    }
    void confirmDialog({
      title: 'Restore the demo display?',
      body: 'The current arrangement will be replaced by the pre-arranged demo display. You can undo this with Ctrl+Z.',
      confirm: 'Demo Display',
    }).then((ok) => {
      if (ok) void this.loadDemo(true);
    });
  }

  requestClear() {
    const n = this.actions.totalModels();
    if (!n) return;
    void confirmDialog({
      title: 'Clear the ground?',
      body: `All ${n} ${n === 1 ? 'model' : 'models'} will be removed from the display. You can undo this with Ctrl+Z, or restore the demo display at any time.`,
      confirm: 'Clear Ground',
      danger: true,
    }).then((ok) => {
      if (ok) {
        this.interaction.cancelPlacement();
        this.actions.clear();
      }
    });
  }

  setUIHidden(hidden: boolean) {
    if (hidden) this.interaction.cancelPlacement();
    this.store.setUI({ hidden });
  }

  startPlacement(assetId: string) {
    this.interaction.startPlacement(assetId);
  }
}

export function startApp(mount: HTMLElement): App {
  const app = new App(mount);
  installQA(app);
  void app.boot();
  return app;
}
