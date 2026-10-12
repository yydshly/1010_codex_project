/** Shared handles passed to the UI panels (type-only to keep modules decoupled). */
import type { Actions } from './actions';
import type { Catalog } from './catalog';
import type { Interaction } from './interaction';
import type { ModelService } from './models';
import type { SceneController } from './scene';
import type { Store } from './store';
import type { Thumbnails } from './thumbnails';

export interface AppContext {
  store: Store;
  catalog: Catalog;
  actions: Actions;
  scene: SceneController;
  interaction: Interaction;
  thumbs: Thumbnails;
  models: ModelService;
  notify(msg: string): void;
  /** Frame a group / model (default: the selection, or everything). */
  focus(id?: string | null, slot?: number | null): void;
  resetView(): void;
  /** Demo Display button (asks before replacing a non-empty display). */
  requestDemo(): void;
  /** Clear Ground button (asks first). */
  requestClear(): void;
  setUIHidden(hidden: boolean): void;
  startPlacement(assetId: string): void;
}
