/**
 * Pointer interaction on the 3D display.
 *  - Click a model: select its group (ground markers under each model). Click the same group
 *    again, or Alt+click, to select just that model ("Model 3 of 8").
 *  - Drag a model: moves the current selection (group or single model) along the ground.
 *  - Drag empty ground: orbit (right: pan, wheel: zoom). Click empty ground: deselect.
 *  - Placement mode (Add to Ground): a translucent preview of the real model follows the
 *    cursor on the soil; click places it (Shift+click keeps placing), Esc / right-click cancel.
 */
import * as THREE from 'three';
import type { AssetConfig } from '../core/types';
import type { Actions } from './actions';
import type { Catalog } from './catalog';
import { clamp, clampPose, normDeg } from './layout';
import type { ModelService } from './models';
import type { Pick, SceneController } from './scene';
import type { Store } from './store';

interface Press {
  pointerId: number;
  x: number;
  y: number;
  button: number;
  alt: boolean;
  hit: Pick | null;
  dragging: boolean;
  mode: 'group' | 'instance';
  planeY: number;
  start: THREE.Vector3 | null;
  startAnchor: { x: number; z: number };
  startWorld: { x: number; z: number };
}

export interface Placement {
  assetId: string;
  config: AssetConfig;
  heading: number;
  ready: boolean;
  pos: { x: number; z: number } | null;
}

const CLICK_PX = 4;

export class Interaction {
  /** Keep OrbitControls available while a demonstration owns the model poses. */
  enabled = true;
  placement: Placement | null = null;
  onPlacementChange: () => void = () => undefined;
  onFocusRequest: () => void = () => undefined;
  private press: Press | null = null;
  private hoverTimer = 0;
  private lastPointer: { x: number; y: number } | null = null;

  constructor(
    private scene: SceneController,
    private store: Store,
    private actions: Actions,
    private catalog: Catalog,
    private models: ModelService,
    private notify: (msg: string) => void,
  ) {
    const canvas = scene.canvas;
    // Capture phase on the parent runs before OrbitControls' own pointerdown on the canvas,
    // so a press on a model can take the gesture away from the camera.
    canvas.parentElement!.addEventListener('pointerdown', this.onDown, { capture: true });
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('pointerleave', () => {
      this.lastPointer = null;
      if (!this.press) this.scene.setHover(null);
      if (this.placement) this.scene.hideGhost();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('dblclick', (e) => {
      if (this.placement) return;
      if (this.scene.pick(e.clientX, e.clientY)) this.onFocusRequest();
    });
  }

  /** The user is dragging or orbiting (low-priority work waits). */
  get busy(): boolean {
    return !!this.press || this.scene.rig.active;
  }

  // ------------------------------------------------------------------ pointer

  private onDown = (e: PointerEvent) => {
    if (!this.enabled) return;
    if (e.target !== this.scene.canvas) return;
    if (this.placement) {
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        this.cancelPlacement();
        return;
      }
      this.press = this.newPress(e, null);
      return;
    }
    if (e.button !== 0) return;
    const hit = this.scene.pick(e.clientX, e.clientY);
    this.press = this.newPress(e, hit);
    if (hit) this.scene.rig.controls.enabled = false;
  };

  private newPress(e: PointerEvent, hit: Pick | null): Press {
    return {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      button: e.button,
      alt: e.altKey,
      hit,
      dragging: false,
      mode: 'group',
      planeY: 0,
      start: null,
      startAnchor: { x: 0, z: 0 },
      startWorld: { x: 0, z: 0 },
    };
  }

  private onMove = (e: PointerEvent) => {
    if (!this.enabled) return;
    const p = this.press;
    if (p && p.pointerId === e.pointerId) {
      if (p.hit && !p.dragging && Math.hypot(e.clientX - p.x, e.clientY - p.y) > CLICK_PX) this.beginDrag(p);
      if (p.dragging) this.drag(p, e);
      return;
    }
    if (e.target !== this.scene.canvas) return;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    if (this.placement) {
      this.updateGhost(e.clientX, e.clientY);
      return;
    }
    if (e.buttons) return;
    this.scheduleHover();
  };

  private onUp = (e: PointerEvent) => {
    const p = this.press;
    if (!p || p.pointerId !== e.pointerId) return;
    this.press = null;
    this.scene.rig.controls.enabled = true;
    if (p.dragging) {
      this.actions.endLive();
      this.scene.interacting = false;
      this.scene.canvas.style.cursor = '';
      this.scene.requestRender();
      return;
    }
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > CLICK_PX) return; // it was an orbit/pan
    if (this.placement) {
      if (p.button === 0) this.place(e.shiftKey);
      return;
    }
    if (p.button !== 0) return;
    if (p.hit) this.clickSelect(p.hit, p.alt || e.altKey);
    else this.actions.select(null);
  };

  private clickSelect(hit: Pick, alt: boolean) {
    const g = this.store.group(hit.groupId);
    if (!g) return;
    const sel = this.store.selection;
    const multi = g.instances.length > 1;
    if (multi && (alt || (sel && sel.groupId === hit.groupId))) this.actions.select(hit.groupId, hit.slot);
    else this.actions.select(hit.groupId, null);
    this.applyHover(hit);
  }

  private beginDrag(p: Press) {
    const hit = p.hit!;
    const g = this.store.group(hit.groupId);
    if (!g) return;
    const sel = this.store.selection;
    let mode: 'group' | 'instance' = 'group';
    if (g.instances.length > 1) {
      if (p.alt) mode = 'instance';
      else if (sel && sel.groupId === hit.groupId) mode = sel.slot === null ? 'group' : 'instance';
    }
    this.actions.select(hit.groupId, mode === 'instance' ? hit.slot : null);
    p.mode = mode;
    p.planeY = clamp(hit.point.y, 0, 6);
    p.start = this.scene.groundPoint(p.x, p.y, p.planeY);
    p.startAnchor = { ...g.anchor };
    const w = this.actions.instanceWorld(hit.groupId, hit.slot);
    p.startWorld = w ? { x: w.x, z: w.z } : { x: 0, z: 0 };
    p.dragging = !!p.start;
    if (p.dragging) {
      this.scene.interacting = true;
      this.scene.setHover(null);
      this.scene.canvas.style.cursor = 'grabbing';
    }
  }

  private drag(p: Press, e: PointerEvent) {
    const q = this.scene.groundPoint(e.clientX, e.clientY, p.planeY);
    if (!q || !p.start || !p.hit) return;
    const dx = q.x - p.start.x, dz = q.z - p.start.z;
    if (Math.hypot(dx, dz) > 300) return;
    if (p.mode === 'group') this.actions.moveGroupTo(p.hit.groupId, p.startAnchor.x + dx, p.startAnchor.z + dz, true);
    else this.actions.moveInstanceTo(p.hit.groupId, p.hit.slot, p.startWorld.x + dx, p.startWorld.z + dz, true);
  }

  private scheduleHover() {
    if (this.hoverTimer) return;
    this.hoverTimer = window.setTimeout(() => {
      this.hoverTimer = 0;
      const lp = this.lastPointer;
      if (!lp || this.press || this.placement || this.scene.rig.active) return;
      this.applyHover(this.scene.pick(lp.x, lp.y));
    }, 50);
  }

  private applyHover(hit: Pick | null) {
    if (!hit) {
      this.scene.setHover(null);
      this.scene.canvas.style.cursor = '';
      return;
    }
    const sel = this.store.selection;
    const g = this.store.group(hit.groupId);
    const inGroup = !!sel && sel.groupId === hit.groupId && !!g && g.instances.length > 1;
    this.scene.setHover({ groupId: hit.groupId, slot: inGroup ? hit.slot : null });
    this.scene.canvas.style.cursor = 'pointer';
  }

  // ------------------------------------------------------------------ placement

  startPlacement(assetId: string): boolean {
    const def = this.catalog.get(assetId);
    if (!def || !this.catalog.placeable(assetId)) {
      this.notify(`${def?.name ?? 'This entry'} is not available for placement.`);
      return false;
    }
    this.cancelPlacement();
    if (this.store.ui.hidden) this.store.setUI({ hidden: false });
    const config = this.actions.normalizeConfig(def);
    const yaw = this.scene.rig.getView().yaw;
    this.placement = { assetId, config, heading: normDeg(Math.round((yaw - 35) / 15) * 15), ready: false, pos: null };
    this.scene.canvas.classList.add('placing');
    this.scene.setHover(null);
    this.onPlacementChange();
    this.models.request(def, config, 0).then(
      (built) => {
        const pl = this.placement;
        if (!pl || pl.assetId !== assetId) return;
        this.scene.showGhost(def, built);
        pl.ready = true;
        this.onPlacementChange();
        if (this.lastPointer) this.updateGhost(this.lastPointer.x, this.lastPointer.y);
      },
      (err) => {
        this.catalog.markBroken(assetId, err);
        this.notify(`${def.name} could not be built and is unavailable.`);
        if (this.placement?.assetId === assetId) this.cancelPlacement();
      },
    );
    return true;
  }

  private updateGhost(x: number, y: number) {
    const pl = this.placement;
    if (!pl || !pl.ready) return;
    const def = this.catalog.get(pl.assetId);
    const p = this.scene.groundPoint(x, y, 0);
    if (!def || !p) {
      pl.pos = null;
      this.scene.hideGhost();
      return;
    }
    const c = clampPose({ x: p.x, z: p.z, heading: pl.heading }, def);
    pl.pos = { x: c.x, z: c.z };
    this.scene.moveGhost(c.x, c.z, pl.heading);
  }

  rotatePlacement(delta: number) {
    const pl = this.placement;
    if (!pl) return;
    pl.heading = normDeg(pl.heading + delta);
    if (pl.pos) {
      const def = this.catalog.get(pl.assetId);
      if (def) {
        const c = clampPose({ x: pl.pos.x, z: pl.pos.z, heading: pl.heading }, def);
        pl.pos = { x: c.x, z: c.z };
        this.scene.moveGhost(c.x, c.z, pl.heading);
      }
    }
  }

  private place(keepPlacing: boolean) {
    const pl = this.placement;
    if (!pl || !pl.ready || !pl.pos) return;
    const id = this.actions.addGroup(pl.assetId, pl.config, pl.pos, 1, pl.heading);
    if (id) this.actions.select(id, null);
    if (!keepPlacing || !id) this.cancelPlacement();
  }

  cancelPlacement() {
    if (!this.placement) return;
    this.placement = null;
    this.scene.removeGhost();
    this.scene.canvas.classList.remove('placing');
    this.onPlacementChange();
  }
}
