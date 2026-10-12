/**
 * Application state: the arranged display (groups), selection, library filter and UI flags.
 * Layout edits go through commit()/live() so they are undoable (snapshot history) and
 * autosaved to localStorage. Library filters are separate state and never touch the display.
 */
import type { CameraView, Group, LibraryFilter, Selection } from './types';

export interface StoreEvent {
  layout?: boolean;
  /** Part of an ongoing live edit (slider drag, model drag). */
  transient?: boolean;
  selection?: boolean;
  filter?: boolean;
  ui?: boolean;
  history?: boolean;
}

interface Snapshot {
  groups: string;
  label: string;
}

export interface SavedDisplay {
  v: 1;
  groups: Group[];
  camera?: CameraView;
}

const SAVE_KEY = 'muster.display.v3-grand-review';
const HISTORY_LIMIT = 150;

export class Store {
  constructor(private readonly saveKey = SAVE_KEY) {}
  groups: Group[] = [];
  selection: Selection | null = null;
  filter: LibraryFilter = { faction: 'all', category: 'All', search: '' };
  ui = { hidden: false, libraryCollapsed: false, inspectorCollapsed: false };
  camera: CameraView | null = null;
  autosave = true;
  /**
   * Saved groups whose model is not available right now (unavailable, failed to load or to
   * build). They are not shown, but stay in the autosave so they come back once the model
   * does; Clear Ground and Demo Display discard them.
   */
  dormant: Group[] = [];

  private listeners = new Set<(e: StoreEvent) => void>();
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private txn: Snapshot | null = null;
  private seq = 1;
  private saveTimer = 0;

  on(fn: (e: StoreEvent) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  emit(e: StoreEvent) {
    for (const l of [...this.listeners]) {
      try {
        l(e);
      } catch (err) {
        console.error('[muster] listener failed', err);
      }
    }
  }

  group(id: string | null | undefined): Group | undefined {
    return id ? this.groups.find((g) => g.id === id) : undefined;
  }

  newId(): string {
    let id: string;
    do id = 'g' + this.seq++;
    while (this.groups.some((g) => g.id === id));
    return id;
  }

  get canUndo() {
    return this.undoStack.length > 0 || !!this.txn;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  get undoLabel(): string | undefined {
    return this.undoStack[this.undoStack.length - 1]?.label;
  }
  get redoLabel(): string | undefined {
    return this.redoStack[this.redoStack.length - 1]?.label;
  }

  /** Start an undoable edit (no-op if one is open). */
  begin(label: string) {
    if (!this.txn) this.txn = { groups: JSON.stringify(this.groups), label };
  }

  /** Close the open edit; records history only if something changed. */
  end() {
    const t = this.txn;
    if (!t) return;
    this.txn = null;
    if (t.groups === JSON.stringify(this.groups)) return;
    this.undoStack.push(t);
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack.length = 0;
    this.emit({ history: true });
    this.scheduleSave();
  }

  /** One undoable layout operation. */
  commit(label: string, fn: () => void) {
    const outer = !!this.txn;
    this.begin(label);
    try {
      fn();
    } finally {
      // even if an edit throws, the history step is closed and the scene re-synced
      this.fixSelection();
      this.emit({ layout: true, selection: true });
      if (!outer) this.end();
    }
  }

  /** Part of a continuous edit; call end() when the gesture finishes. */
  live(label: string, fn: () => void) {
    this.begin(label);
    try {
      fn();
    } finally {
      this.emit({ layout: true, transient: true });
    }
  }

  /** Change the layout without recording history (system corrections). */
  silent(fn: () => void) {
    try {
      fn();
    } finally {
      this.fixSelection();
      this.emit({ layout: true, selection: true });
      this.scheduleSave();
    }
  }

  undo(): boolean {
    if (this.txn) this.end();
    const s = this.undoStack.pop();
    if (!s) return false;
    this.redoStack.push({ groups: JSON.stringify(this.groups), label: s.label });
    this.groups = JSON.parse(s.groups);
    this.fixSelection();
    this.emit({ layout: true, selection: true, history: true });
    this.scheduleSave();
    return true;
  }

  redo(): boolean {
    const s = this.redoStack.pop();
    if (!s) return false;
    this.undoStack.push({ groups: JSON.stringify(this.groups), label: s.label });
    this.groups = JSON.parse(s.groups);
    this.fixSelection();
    this.emit({ layout: true, selection: true, history: true });
    this.scheduleSave();
    return true;
  }

  /** Forget undo/redo (e.g. after the initial display is set up). */
  clearHistory() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.txn = null;
    this.emit({ history: true });
  }

  select(sel: Selection | null) {
    this.selection = sel ? { ...sel } : null;
    this.fixSelection();
    this.emit({ selection: true });
  }

  private fixSelection() {
    const s = this.selection;
    if (!s) return;
    const g = this.group(s.groupId);
    if (!g) {
      this.selection = null;
      return;
    }
    if (s.slot !== null && (g.instances.length < 2 || !g.instances.some((i) => i.slot === s.slot))) {
      this.selection = { groupId: g.id, slot: null };
    }
  }

  setFilter(patch: Partial<LibraryFilter>) {
    Object.assign(this.filter, patch);
    this.emit({ filter: true });
  }

  setUI(patch: Partial<Store['ui']>) {
    Object.assign(this.ui, patch);
    this.emit({ ui: true });
  }

  setCamera(v: CameraView) {
    this.camera = v;
    this.scheduleSave();
  }

  scheduleSave() {
    if (!this.autosave) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.save(), 400);
  }

  save() {
    if (!this.autosave) return;
    try {
      const data: SavedDisplay = { v: 1, groups: [...this.groups, ...this.dormant], camera: this.camera ?? undefined };
      localStorage.setItem(this.saveKey, JSON.stringify(data));
    } catch {
      /* storage unavailable: autosave is a convenience only */
    }
  }

  static loadSaved(saveKey = SAVE_KEY): SavedDisplay | null {
    try {
      const raw = localStorage.getItem(saveKey);
      if (!raw) return null;
      const d = JSON.parse(raw) as SavedDisplay;
      if (!d || d.v !== 1 || !Array.isArray(d.groups)) return null;
      return d;
    } catch {
      return null;
    }
  }
}
