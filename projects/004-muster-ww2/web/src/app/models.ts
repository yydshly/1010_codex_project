/**
 * Model build queue over the registry's getModel() (which builds + bakes once per config).
 * Builds are synchronous CPU work, so they run one at a time with a paint opportunity in
 * between. Scene builds (priority 0) always go first; thumbnail builds (priority 1) wait for
 * idle time and pause while the user is interacting with the view.
 */
import { getModel, type BuiltModel } from '../core/registry';
import { configKey, type AssetConfig, type AssetDef } from '../core/types';

export type BuildPriority = 0 | 1;

/** A build still pending after this long is treated as failed. */
const BUILD_TIMEOUT_MS = 45000;

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  let timer = 0;
  const limit = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([p, limit]).finally(() => clearTimeout(timer));
}

interface Task {
  key: string;
  def: AssetDef;
  config: AssetConfig;
  priority: BuildPriority;
  seq: number;
  promise: Promise<BuiltModel>;
  resolve(m: BuiltModel): void;
  reject(e: unknown): void;
}

function paintSlot(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const go = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    requestAnimationFrame(() => setTimeout(go, 0));
    setTimeout(go, 120); // hidden tabs have no rAF
  });
}

function idleSlot(busy: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const attempt = () => {
      if (busy()) {
        setTimeout(attempt, 250);
        return;
      }
      if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 500 });
      else setTimeout(resolve, 40);
    };
    attempt();
  });
}

export class ModelService {
  /** True while the user interacts; low-priority work waits. */
  busy: () => boolean = () => false;
  private ready = new Map<string, BuiltModel>();
  private tasks = new Map<string, Task>();
  private queue: Task[] = [];
  private running = false;
  private seq = 0;
  private waiters: { p: BuildPriority; resolve: () => void }[] = [];

  peek(def: AssetDef, config: AssetConfig): BuiltModel | undefined {
    return this.ready.get(configKey(def, config));
  }

  /** Built models so far (QA / performance notes). */
  stats(): { key: string; buildMs: number; bakeMs: number; triangles: number; drawCalls: number }[] {
    return [...this.ready].map(([key, m]) => ({
      key,
      buildMs: Math.round(m.buildMs),
      bakeMs: Math.round(m.stats.bakeMs),
      triangles: m.stats.triangles,
      drawCalls: m.stats.drawCalls,
    }));
  }

  pendingAt(maxPriority: BuildPriority): number {
    let n = 0;
    for (const t of this.tasks.values()) if (t.priority <= maxPriority) n++;
    return n;
  }

  request(def: AssetDef, config: AssetConfig, priority: BuildPriority = 0): Promise<BuiltModel> {
    const key = configKey(def, config);
    const done = this.ready.get(key);
    if (done) return Promise.resolve(done);
    const existing = this.tasks.get(key);
    if (existing) {
      if (priority < existing.priority) existing.priority = priority;
      return existing.promise;
    }
    let resolve!: (m: BuiltModel) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<BuiltModel>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    promise.catch(() => undefined);
    const t: Task = { key, def, config: { ...config }, priority, seq: this.seq++, promise, resolve, reject };
    this.tasks.set(key, t);
    this.queue.push(t);
    void this.pump();
    return promise;
  }

  /** Resolves when no builds at or above the given priority are pending. */
  whenIdle(maxPriority: BuildPriority = 1): Promise<void> {
    if (this.pendingAt(maxPriority) === 0) return Promise.resolve();
    return new Promise((resolve) => this.waiters.push({ p: maxPriority, resolve }));
  }

  private sort() {
    this.queue.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
  }

  private flush() {
    const keep: typeof this.waiters = [];
    for (const w of this.waiters) {
      if (this.pendingAt(w.p) === 0) w.resolve();
      else keep.push(w);
    }
    this.waiters = keep;
  }

  private async pump() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) {
        this.sort();
        if (this.queue[0].priority > 0) await idleSlot(this.busy);
        else await paintSlot();
        this.sort();
        const t = this.queue.shift();
        if (!t) break;
        try {
          // an async build that never settles must not hold the queue (or the boot) forever
          const m = await withTimeout(getModel(t.def, t.config), BUILD_TIMEOUT_MS, `${t.def.id}: model build timed out`);
          this.ready.set(t.key, m);
          this.tasks.delete(t.key);
          t.resolve(m);
        } catch (e) {
          this.tasks.delete(t.key);
          t.reject(e);
        }
        this.flush();
      }
    } finally {
      this.running = false;
      this.flush();
    }
  }
}
