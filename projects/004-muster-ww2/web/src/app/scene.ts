/**
 * Scene controller: the display Studio, the on-demand render loop, and the scene graph that
 * mirrors the store (one THREE.Group per placed group, one clone of the baked template per
 * instance). Nothing renders while idle: frames are requested by input, camera damping,
 * tweens or state changes only; after ~250 ms of stillness one crisper frame is rendered at
 * a higher pixel ratio.
 */
import * as THREE from 'three';
import { Studio } from '../core/studio';
import type { BuiltModel } from '../core/registry';
import { configKey, type AssetConfig, type AssetDef } from '../core/types';
import { CameraRig, DEFAULT_VIEW } from './camera';
import { compileOffThread } from './compile';
import { createMarker, makeGhost, markerPixelRatio, setMarkerState, type MarkerState } from './markers';
import { instancePose, layoutCtx } from './layout';
import type { Catalog } from './catalog';
import type { ModelService } from './models';
import type { Store } from './store';
import { emptyCounts, type Counts } from './types';

const D2R = Math.PI / 180;

interface InstObj {
  root: THREE.Group;
  model: THREE.Object3D | null;
  marker: THREE.Mesh;
  slot: number;
}

interface SceneGroup {
  id: string;
  assetId: string;
  root: THREE.Group;
  /** Template currently shown by the instances. */
  built: BuiltModel | null;
  key: string | null;
  config: AssetConfig | null;
  /** Config key being built right now. */
  requested: string | null;
  instances: Map<number, InstObj>;
}

export interface Pick {
  groupId: string;
  slot: number;
  point: THREE.Vector3;
}

/** Transient scene poses for a local demonstration; the saved layout remains in Store. */
export interface RenderedInstance {
  groupId: string;
  assetId: string;
  slot: number;
  root: THREE.Group;
  model: THREE.Object3D;
}

export interface SceneCounts {
  total: Counts;
  byFaction: Record<string, Counts>;
  models: number;
  groups: number;
}

export type BuildErrorHandler = (groupId: string, def: AssetDef, err: unknown, failed: AssetConfig, shown: AssetConfig | null) => void;

export class SceneController {
  readonly studio: Studio;
  readonly rig: CameraRig;
  readonly canvas: HTMLCanvasElement;
  /** A model drag is in progress (keeps the interactive pixel ratio). */
  interacting = false;
  onBuildError: BuildErrorHandler = () => undefined;
  /** Called after the scene graph changed (counts, preparing states). */
  onUpdate: () => void = () => undefined;
  /** Optional animation driver. Return true to render and request another frame. */
  onAnimate: ((now: number) => boolean) | null = null;

  private sgs = new Map<string, SceneGroup>();
  private raf = 0;
  private dirty = true;
  private frameCount = 0;
  private settleTimer = 0;
  private hiRes = false;
  private basePR: number;
  private stillPR = 1;
  private waiters: (() => void)[] = [];
  private hover: { groupId: string; slot: number | null } | null = null;
  private ghost: { root: THREE.Group; def: AssetDef } | null = null;
  private raycaster = new THREE.Raycaster();
  private tmpBox = new THREE.Box3();

  constructor(private container: HTMLElement, private store: Store, private catalog: Catalog, private models: ModelService) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'scene-canvas';
    container.prepend(this.canvas);
    const w = Math.max(2, container.clientWidth), h = Math.max(2, container.clientHeight);
    this.basePR = Math.min(window.devicePixelRatio || 1, 1.5);
    this.studio = new Studio({ canvas: this.canvas, ground: 'plinth', width: w, height: h, pixelRatio: this.basePR });
    markerPixelRatio.value = this.basePR;
    this.updateStillPR();
    this.studio.onAfterRender(() => {
      this.frameCount++;
      const ws = this.waiters;
      this.waiters = [];
      for (const f of ws) f();
    });
    this.rig = new CameraRig(this.studio.camera, this.canvas, () => this.requestRender());
    this.rig.setView(DEFAULT_VIEW);
    this.onCameraMoved();
    new ResizeObserver(() => this.resize()).observe(container);
    // the stage's shaders compile off the main thread while the catalog loads (the canvas
    // is covered by the loading note until then), so the first frame does not stall the page
    this.holdFrames = true;
    void compileOffThread(this.studio)
      .catch((e) => console.warn('[muster] stage shader precompile failed', e))
      .finally(() => {
        this.holdFrames = false;
        this.requestRender();
      });
  }

  /** No frames until the stage shaders are compiled (see constructor). */
  private holdFrames = false;

  /** WebGL frames rendered so far (QA: must not grow while idle). */
  get frames(): number {
    return this.frameCount;
  }

  // ------------------------------------------------------------------ loop

  requestRender() {
    this.dirty = true;
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  /** Resolves after the next rendered frame. */
  whenRendered(): Promise<void> {
    return new Promise((resolve) => {
      this.waiters.push(resolve);
      this.requestRender();
    });
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.holdFrames) return; // requestRender() is called again once compiled
    const moved = this.rig.update(now);
    const animated = this.onAnimate?.(now) ?? false;
    if (moved) this.onCameraMoved();
    const busy = animated || moved || this.interacting || this.rig.active;
    // pixel-ratio switches resize (and clear) the canvas, so they happen right before a render
    if (busy && this.hiRes) this.setHiRes(false);
    else if (!busy && this.wantHiRes && !this.hiRes) this.setHiRes(true);
    this.wantHiRes = false;
    if (this.dirty || moved || animated) this.renderNow();
    // rig.update() fires OrbitControls 'change' -> requestRender(), which may already have
    // queued the next frame. Never queue a second one: duplicate callbacks multiply every frame
    // while damping keeps the camera moving and each one renders the whole scene.
    if (moved || animated) { if (!this.raf) this.raf = requestAnimationFrame(this.frame); }
    else {
      const c = this.studio.camera.position, t = this.rig.target;
      const key = [c.x, c.y, c.z, t.x, t.y, t.z].map((v) => v.toFixed(3)).join(',');
      if (key !== this.restKey) {
        this.restKey = key;
        this.onCameraSettled();
      }
      this.scheduleSettle();
    }
  };

  private restKey = '';
  /** Called when the camera comes to rest at a new view (for autosave). */
  onCameraSettled: () => void = () => undefined;

  private renderNow() {
    this.dirty = false;
    const t = performance.now();
    this.studio.render();
    const ms = performance.now() - t;
    this.renderMs.push(ms);
    if (this.renderMs.length > 240) this.renderMs.shift();
  }

  private compiled = new WeakSet<THREE.Object3D>();
  private compiling = new Map<THREE.Object3D, Promise<void>>();

  /**
   * Compile a model's shader programs without blocking the page (KHR_parallel_shader_compile)
   * before it is first shown, so adding a model never freezes the view on a long compile.
   * Instances share the template's materials, so this happens once per model config.
   */
  private precompileModel(b: BuiltModel) {
    const t = b.template;
    if (this.compiled.has(t) || this.compiling.has(t)) return;
    const done = compileOffThread(this.studio, t)
      .catch((e) => console.warn('[muster] shader precompile failed; compiling on first render instead', e))
      .then(() => {
        this.compiled.add(t);
        this.compiling.delete(t);
        this.sync();
      });
    this.compiling.set(t, done);
  }

  /** Resolves when no model is waiting for its shaders. */
  async whenCompiled(): Promise<void> {
    while (this.compiling.size) await Promise.all([...this.compiling.values()]);
  }

  /** CPU time of the last rendered frames (ms; QA / performance notes). */
  private renderMs: number[] = [];

  renderStats(): { frames: number; lastMs: number; avgMs: number; maxMs: number } {
    const r = this.renderMs;
    const avg = r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0;
    return { frames: r.length, lastMs: +(r[r.length - 1] ?? 0).toFixed(2), avgMs: +avg.toFixed(2), maxMs: +Math.max(0, ...r).toFixed(2) };
  }

  resetRenderStats() {
    this.renderMs.length = 0;
  }

  private scheduleSettle() {
    clearTimeout(this.settleTimer);
    if (this.hiRes || this.stillPR <= this.basePR + 0.01) return;
    this.settleTimer = window.setTimeout(() => {
      if (this.interacting || this.rig.active) return;
      this.wantHiRes = true;
      this.requestRender();
    }, 260);
  }

  private wantHiRes = false;

  private setHiRes(on: boolean) {
    this.hiRes = on;
    const pr = on ? this.stillPR : this.basePR;
    this.studio.setPixelRatio(pr);
    markerPixelRatio.value = pr;
  }

  private updateStillPR() {
    // Hi-res stills are disabled: switching the pixel ratio re-allocates every post-processing
    // target, which made the first frame of each orbit/pan gesture hitch (~90 ms). Stills render
    // at the same ratio as interaction (native up to 1.5x), which SMAA keeps clean.
    this.stillPR = this.basePR;
  }

  private resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (w < 2 || h < 2) return;
    if (w === this.studio.width && h === this.studio.height) return;
    this.studio.setSize(w, h);
    this.updateStillPR();
    if (this.hiRes) this.setHiRes(true);
    if (this.holdFrames) return;
    this.renderNow(); // canvas was cleared by the resize: repaint before it is shown
    this.scheduleSettle();
  }

  private onCameraMoved() {
    const d = this.rig.distance;
    this.studio.adaptToDistance(d);
    this.studio.fitShadows(this.rig.target, THREE.MathUtils.clamp(d * 0.8 + 1.5, 2.5, 90));
  }

  // ------------------------------------------------------------------ sync

  renderedInstances(): RenderedInstance[] {
    const out: RenderedInstance[] = [];
    for (const sg of this.sgs.values()) for (const io of sg.instances.values()) {
      if (io.model) out.push({ groupId: sg.id, assetId: sg.assetId, slot: io.slot, root: io.root, model: io.model });
    }
    return out;
  }

  /** Reconcile the scene graph with the store. Cheap; call after every layout change. */
  sync() {
    const live = new Set<string>();
    for (const g of this.store.groups) {
      const def = this.catalog.get(g.assetId);
      if (!def) continue;
      live.add(g.id);
      let sg = this.sgs.get(g.id);
      if (!sg) {
        const root = new THREE.Group();
        root.name = 'group:' + g.id;
        root.userData = { kind: 'group', groupId: g.id };
        this.studio.content.add(root);
        sg = { id: g.id, assetId: g.assetId, root, built: null, key: null, config: null, requested: null, instances: new Map() };
        this.sgs.set(g.id, sg);
      }
      const s = sg;
      if (s.assetId !== g.assetId) {
        for (const io of s.instances.values()) s.root.remove(io.root);
        s.instances.clear();
        Object.assign(s, { assetId: g.assetId, built: null, key: null, config: null, requested: null });
      }
      const want = configKey(def, g.config);
      if (s.key !== want) {
        const ready = this.models.peek(def, g.config);
        // a new model appears only once its shaders are compiled (off the main thread)
        if (ready && this.compiled.has(ready.template)) this.swap(s, ready, want, g.config);
        else if (ready) this.precompileModel(ready);
        else if (s.requested !== want) {
          s.requested = want;
          const cfg = { ...g.config };
          const gid = g.id;
          this.models.request(def, cfg, 0).then(
            () => {
              if (s.requested === want) s.requested = null;
              this.sync();
            },
            (err) => {
              if (s.requested === want) s.requested = null;
              this.onBuildError(gid, def, err, cfg, s.config);
            },
          );
        }
      }
      if (s.built) this.place(s, g.id, def);
    }
    for (const [id, sg] of this.sgs) {
      if (!live.has(id)) {
        this.studio.content.remove(sg.root);
        this.sgs.delete(id);
      }
    }
    if (this.hover && !this.sgs.has(this.hover.groupId)) this.hover = null;
    this.updateMarkers();
    this.onUpdate();
  }

  private swap(sg: SceneGroup, built: BuiltModel, key: string, config: AssetConfig) {
    sg.built = built;
    sg.key = key;
    sg.config = { ...config };
    for (const io of sg.instances.values()) {
      if (io.model) io.root.remove(io.model);
      io.model = null;
    }
  }

  private place(sg: SceneGroup, groupId: string, def: AssetDef) {
    const g = this.store.group(groupId)!;
    const ctx = layoutCtx(g, def);
    const slots = new Set<number>();
    for (const inst of g.instances) {
      slots.add(inst.slot);
      let io = sg.instances.get(inst.slot);
      if (!io) {
        const root = new THREE.Group();
        root.userData = { kind: 'instance', groupId, slot: inst.slot };
        const marker = createMarker(def.footprint.w, def.footprint.l);
        root.add(marker);
        sg.root.add(root);
        io = { root, model: null, marker, slot: inst.slot };
        sg.instances.set(inst.slot, io);
      }
      if (!io.model) {
        const m = sg.built!.template.clone();
        m.userData = { kind: 'model', assetId: def.id };
        io.root.add(m);
        io.model = m;
        this.fitMarker(io, sg.built!);
      }
      const p = instancePose(g, def, inst, ctx);
      io.root.position.set(p.x, 0, p.z);
      io.root.rotation.set(0, p.heading * D2R, 0);
      io.root.updateMatrixWorld(true);
    }
    for (const [slot, io] of sg.instances) {
      if (!slots.has(slot)) {
        sg.root.remove(io.root);
        sg.instances.delete(slot);
      }
    }
  }

  /** Size the ground outline to the model's actual plan extent (it varies with config). */
  private fitMarker(io: InstObj, built: BuiltModel) {
    const b = built.stats.bounds;
    const w = Math.max(0.05, b.max.x - b.min.x), l = Math.max(0.05, b.max.z - b.min.z);
    if (io.marker.userData.w !== w || io.marker.userData.l !== l) {
      io.root.remove(io.marker);
      io.marker = createMarker(w, l);
      io.root.add(io.marker);
    }
    io.marker.position.set((b.min.x + b.max.x) / 2, 0.006, (b.min.z + b.max.z) / 2);
  }

  // ------------------------------------------------------------------ feedback

  setHover(h: { groupId: string; slot: number | null } | null) {
    const a = this.hover, same = a === h || (!!a && !!h && a.groupId === h.groupId && a.slot === h.slot);
    if (same) return;
    this.hover = h;
    this.updateMarkers();
  }

  updateMarkers() {
    const sel = this.store.selection, hov = this.hover;
    for (const sg of this.sgs.values()) {
      const selG = !!sel && sel.groupId === sg.id, hovG = !!hov && hov.groupId === sg.id;
      for (const io of sg.instances.values()) {
        let st: MarkerState | null = null;
        if (selG) st = sel!.slot === null || sel!.slot === io.slot ? 'selected' : 'context';
        if (hovG && (hov!.slot === null || hov!.slot === io.slot) && st !== 'selected') st = 'hover';
        setMarkerState(io.marker, io.model ? st : null);
      }
    }
    this.requestRender();
  }

  showGhost(def: AssetDef, built: BuiltModel) {
    this.removeGhost();
    const root = new THREE.Group();
    root.add(makeGhost(built.template));
    const b = built.stats.bounds;
    const marker = createMarker(Math.max(0.05, b.max.x - b.min.x), Math.max(0.05, b.max.z - b.min.z));
    marker.position.set((b.min.x + b.max.x) / 2, 0.006, (b.min.z + b.max.z) / 2);
    setMarkerState(marker, 'ghost');
    root.add(marker);
    root.visible = false;
    this.studio.overlay.add(root);
    this.ghost = { root, def };
  }

  moveGhost(x: number, z: number, heading: number) {
    if (!this.ghost) return;
    this.ghost.root.position.set(x, 0, z);
    this.ghost.root.rotation.set(0, heading * D2R, 0);
    this.ghost.root.visible = true;
    this.requestRender();
  }

  hideGhost() {
    if (this.ghost && this.ghost.root.visible) {
      this.ghost.root.visible = false;
      this.requestRender();
    }
  }

  removeGhost() {
    if (!this.ghost) return;
    this.studio.overlay.remove(this.ghost.root);
    this.ghost = null;
    this.requestRender();
  }

  // ------------------------------------------------------------------ picking

  private ndc(clientX: number, clientY: number): THREE.Vector2 {
    const r = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  }

  /** The model under the pointer (precise triangle test on bounding-box candidates). */
  pick(clientX: number, clientY: number): Pick | null {
    this.raycaster.setFromCamera(this.ndc(clientX, clientY), this.studio.camera);
    const ray = this.raycaster.ray;
    const hit = new THREE.Vector3();
    const cands: { sg: SceneGroup; io: InstObj; d: number }[] = [];
    for (const sg of this.sgs.values()) {
      if (!sg.built) continue;
      for (const io of sg.instances.values()) {
        if (!io.model) continue;
        this.tmpBox.copy(sg.built.stats.bounds).applyMatrix4(io.root.matrixWorld);
        if (ray.intersectBox(this.tmpBox, hit)) cands.push({ sg, io, d: hit.distanceTo(ray.origin) });
      }
    }
    cands.sort((a, b) => a.d - b.d);
    let best: Pick | null = null;
    let bestD = Infinity;
    for (const c of cands) {
      if (c.d > bestD) break;
      const hits = this.raycaster.intersectObject(c.io.model!, true);
      if (hits.length && hits[0].distance < bestD) {
        bestD = hits[0].distance;
        best = { groupId: c.sg.id, slot: c.io.slot, point: hits[0].point.clone() };
      }
    }
    return best;
  }

  /**
   * A client point that really hits the given model (checked with pick()), for scripted
   * pointer tests: thin models such as a rifle on its stand are often missed by the
   * bounding-box centre. Samples the model's own vertices nearest the box centre first.
   */
  clientHitPoint(groupId: string, slot: number | null = null): { x: number; y: number } | null {
    const sg = this.sgs.get(groupId);
    if (!sg || !sg.built) return null;
    const r = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector3();
    for (const io of sg.instances.values()) {
      if (!io.model || (slot !== null && io.slot !== slot)) continue;
      const center = this.tmpBox.copy(sg.built.stats.bounds).applyMatrix4(io.root.matrixWorld).getCenter(new THREE.Vector3());
      const cands: THREE.Vector3[] = [center.clone()];
      io.model.traverse((o) => {
        const pos = (o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute | undefined) : undefined;
        if (!pos) return;
        const step = Math.max(1, Math.floor(pos.count / 300));
        for (let i = 0; i < pos.count; i += step) cands.push(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone());
      });
      cands.sort((a, b) => a.distanceToSquared(center) - b.distanceToSquared(center));
      let tries = 0;
      for (let i = 0; i < cands.length && tries < 80; i += Math.max(1, Math.floor(cands.length / 160))) {
        const p = this.projectToClient(cands[i]);
        if (p.x < r.left + 2 || p.x > r.right - 2 || p.y < r.top + 2 || p.y > r.bottom - 2) continue;
        tries++;
        const hit = this.pick(p.x, p.y);
        if (hit && hit.groupId === groupId && hit.slot === io.slot) return p;
      }
    }
    return null;
  }

  /** Client (CSS pixel) position of a world point, for scripted interaction tests. */
  projectToClient(p: THREE.Vector3): { x: number; y: number } {
    const v = p.clone().project(this.studio.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  /** Pointer ray against a horizontal plane at height y. */
  groundPoint(clientX: number, clientY: number, y = 0): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.ndc(clientX, clientY), this.studio.camera);
    const out = new THREE.Vector3();
    const p = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), out);
    if (!p || p.distanceTo(this.raycaster.ray.origin) > 900) return null;
    return p;
  }

  // ------------------------------------------------------------------ boxes & counts

  /** World box of a group, or of one of its models. */
  selectionBox(groupId: string, slot: number | null = null): THREE.Box3 | null {
    const sg = this.sgs.get(groupId);
    if (!sg || !sg.built) return null;
    const box = new THREE.Box3();
    for (const io of sg.instances.values()) {
      if (!io.model || (slot !== null && io.slot !== slot)) continue;
      box.union(this.tmpBox.copy(sg.built.stats.bounds).applyMatrix4(io.root.matrixWorld));
    }
    return box.isEmpty() ? null : box;
  }

  /** One world box per rendered model (optionally of one group, or one model of it). */
  modelBoxes(groupId: string | null = null, slot: number | null = null): THREE.Box3[] {
    const out: THREE.Box3[] = [];
    for (const sg of this.sgs.values()) {
      if (!sg.built || (groupId && sg.id !== groupId)) continue;
      for (const io of sg.instances.values()) {
        if (!io.model || (slot !== null && io.slot !== slot)) continue;
        out.push(sg.built.stats.bounds.clone().applyMatrix4(io.root.matrixWorld));
      }
    }
    return out;
  }

  counts(): SceneCounts {
    const total = emptyCounts();
    const byFaction: Record<string, Counts> = {};
    let models = 0, groups = 0;
    for (const sg of this.sgs.values()) {
      const def = this.catalog.get(sg.assetId);
      if (!def) continue;
      let n = 0;
      for (const io of sg.instances.values()) if (io.model) n++;
      if (!n) continue;
      groups++;
      models += n;
      total[def.countAs] += n;
      (byFaction[def.faction] ??= emptyCounts())[def.countAs] += n;
    }
    return { total, byFaction, models, groups };
  }

  /** Instances actually present in the scene graph with a model attached. */
  renderedInstanceCount(): number {
    let n = 0;
    this.studio.content.traverse((o) => {
      if (o.userData.kind === 'instance' && o.children.some((c) => c.userData.kind === 'model')) n++;
    });
    return n;
  }

  renderedCount(groupId: string): number {
    const sg = this.sgs.get(groupId);
    let n = 0;
    if (sg) for (const io of sg.instances.values()) if (io.model) n++;
    return n;
  }

  /** The group's model for its current configuration is still being built. */
  isPreparing(groupId: string): boolean {
    const g = this.store.group(groupId);
    const def = g && this.catalog.get(g.assetId);
    if (!g || !def) return false;
    const sg = this.sgs.get(groupId);
    return !sg || sg.key !== configKey(def, g.config);
  }

  preparingCount(): number {
    let n = 0;
    for (const g of this.store.groups) if (this.isPreparing(g.id)) n++;
    return n;
  }
}
