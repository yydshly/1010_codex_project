/**
 * Library previews rendered at runtime from the actual placeable model (default config),
 * in a dedicated studio with a neutral backdrop, the shared photographic lighting and a
 * consistent camera angle (def.view yaw/pitch, default 35/18). Generated one at a time in
 * idle time; production builds cache them in IndexedDB keyed by build + model config.
 */
import { Studio } from '../core/studio';
import { configKey, type AssetDef } from '../core/types';
import type { BuiltModel } from '../core/registry';
import { normalizeConfig, type Catalog } from './catalog';
import { compileOffThread } from './compile';
import type { ModelService } from './models';

const W = 480, H = 300;
const DB_NAME = 'muster-thumbnails';
const STORE = 'thumbs';

/** Changes whenever the production bundle changes (hashed entry script); 'dev' otherwise. */
const BUILD_ID = (() => {
  const s = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
  return s?.src ?? 'dev';
})();

function nextFrame(): Promise<void> {
  return new Promise((r) => {
    let done = false;
    const go = () => {
      if (!done) {
        done = true;
        r();
      }
    };
    requestAnimationFrame(() => go());
    setTimeout(go, 100);
  });
}

export class Thumbnails {
  private studio: Studio | null = null;
  private urls = new Map<string, string>();
  private done = new Set<string>();
  private queue: string[] = [];
  private running = false;
  private started = false;
  private waiters: (() => void)[] = [];
  private listeners = new Set<(id: string, url: string) => void>();
  private db: Promise<IDBDatabase | null> | null = null;

  constructor(private catalog: Catalog, private models: ModelService, private cacheEnabled: boolean) {}

  url(id: string): string | undefined {
    return this.urls.get(id);
  }

  onReady(fn: (id: string, url: string) => void) {
    this.listeners.add(fn);
  }

  get pending(): number {
    return this.queue.length + (this.running ? 1 : 0);
  }

  /** Queue previews; ids given later with front=true jump the queue (visible cards first). */
  request(ids: string[], front = false) {
    const fresh = ids.filter((id) => !this.done.has(id));
    if (front) {
      this.queue = [...fresh, ...this.queue.filter((q) => !fresh.includes(q))];
    } else {
      for (const id of fresh) if (!this.queue.includes(id)) this.queue.push(id);
    }
    if (this.started) void this.run();
  }

  start() {
    this.started = true;
    void this.run();
  }

  whenIdle(): Promise<void> {
    if (this.pending === 0) return Promise.resolve();
    return new Promise((r) => this.waiters.push(r));
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) {
        const id = this.queue.shift()!;
        if (this.done.has(id)) continue;
        const def = this.catalog.get(id);
        if (!def || !this.catalog.placeable(id)) {
          this.done.add(id);
          continue;
        }
        this.done.add(id);
        const cfg = normalizeConfig(def);
        const key = `${BUILD_ID}|${configKey(def, cfg)}`;
        let blob = this.cacheEnabled ? await this.cacheGet(key) : undefined;
        if (!blob) {
          let built: BuiltModel;
          try {
            built = await this.models.request(def, cfg, 1);
          } catch (e) {
            // the placeable model itself does not build: withdraw the entry (never fake it)
            this.catalog.markBroken(id, e);
            continue;
          }
          try {
            await nextFrame();
            blob = await this.render(def, built);
            if (this.cacheEnabled) void this.cachePut(key, blob);
          } catch (e) {
            // a preview that fails to render only costs the preview; the model stays placeable
            console.warn(`[muster] preview of ${id} could not be rendered`, e);
            continue;
          }
        }
        const url = URL.createObjectURL(blob);
        this.urls.set(id, url);
        for (const l of this.listeners) {
          try {
            l(id, url);
          } catch (e) {
            console.error('[muster] preview listener failed', e);
          }
        }
      }
    } finally {
      this.running = false;
      const w = this.waiters;
      this.waiters = [];
      for (const f of w) f();
    }
  }

  private ensureStudio(): Studio {
    if (!this.studio) {
      this.studio = new Studio({ ground: 'studio', preserveDrawingBuffer: true, pixelRatio: 1, width: W, height: H });
    }
    return this.studio;
  }

  private async render(def: AssetDef, built: BuiltModel): Promise<Blob> {
    const s = this.ensureStudio();
    const obj = built.template.clone();
    s.content.add(obj);
    try {
      s.frame(built.stats.bounds.clone(), def.view?.yaw ?? 35, def.view?.pitch ?? 18, def.view?.fit ?? 1);
      // shaders compile off the main thread first, so a preview never freezes the page
      try {
        await compileOffThread(s);
      } catch {
        /* compiled on render instead */
      }
      s.render();
    } finally {
      s.content.remove(obj);
    }
    const canvas = s.renderer.domElement;
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('thumbnail encode failed'))), 'image/webp', 0.9);
    });
  }

  // ------------------------------------------------------------------ cache (production only)

  private openDb(): Promise<IDBDatabase | null> {
    if (!this.db) {
      this.db = new Promise((resolve) => {
        try {
          const req = indexedDB.open(DB_NAME, 1);
          req.onupgradeneeded = () => req.result.createObjectStore(STORE);
          req.onsuccess = () => {
            const db = req.result;
            this.prune(db);
            resolve(db);
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
    return this.db;
  }

  /** Drop previews from older builds. */
  private prune(db: IDBDatabase) {
    try {
      const st = db.transaction(STORE, 'readwrite').objectStore(STORE);
      const req = st.openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return;
        if (!String(c.key).startsWith(BUILD_ID + '|')) c.delete();
        c.continue();
      };
    } catch {
      /* ignore */
    }
  }

  private async cacheGet(key: string): Promise<Blob | undefined> {
    const db = await this.openDb();
    if (!db) return undefined;
    return new Promise((resolve) => {
      try {
        const r = db.transaction(STORE).objectStore(STORE).get(key);
        r.onsuccess = () => resolve(r.result instanceof Blob ? r.result : undefined);
        r.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    });
  }

  private async cachePut(key: string, blob: Blob) {
    const db = await this.openDb();
    if (!db) return;
    try {
      db.transaction(STORE, 'readwrite').objectStore(STORE).put(blob, key);
    } catch {
      /* ignore */
    }
  }
}
