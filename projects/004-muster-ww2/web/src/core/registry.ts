/**
 * Asset registry. Asset files are discovered automatically — no shared index to edit:
 *
 *   src/assets/<faction>/<name>.asset.ts   (default export: AssetDef)
 *
 * Modules load lazily and independently, so one broken asset never takes down the others;
 * failures are reported and the entry is shown as unavailable.
 */
import type * as THREE from 'three';
import { bake, type BakeStats } from './bake';
import { configKey, defaultConfig, type AssetConfig, type AssetDef } from './types';

const loaders = import.meta.glob<{ default: AssetDef }>('/src/assets/**/*.asset.ts');

/** Path key: 'germany/panzer-iv-h' for src/assets/germany/panzer-iv-h.asset.ts */
export function assetPaths(): string[] {
  return Object.keys(loaders).map((p) => p.replace('/src/assets/', '').replace('.asset.ts', '')).sort();
}

export async function loadAssetByPath(path: string): Promise<AssetDef> {
  const loader = loaders[`/src/assets/${path}.asset.ts`];
  if (!loader) throw new Error(`No asset module at src/assets/${path}.asset.ts`);
  const mod = await loader();
  if (!mod.default) throw new Error(`src/assets/${path}.asset.ts has no default export`);
  return mod.default;
}

export interface LoadReport {
  defs: AssetDef[];
  errors: { path: string; error: string }[];
}

export async function loadAllAssets(): Promise<LoadReport> {
  const defs: AssetDef[] = [];
  const errors: LoadReport['errors'] = [];
  await Promise.all(
    assetPaths().map(async (path) => {
      try {
        const def = await loadAssetByPath(path);
        defs.push(def);
      } catch (e) {
        errors.push({ path, error: String((e as Error)?.stack ?? e) });
        console.error(`[registry] failed to load ${path}`, e);
      }
    }),
  );
  const seen = new Set<string>();
  for (const d of defs) {
    if (seen.has(d.id)) console.warn(`[registry] duplicate asset id ${d.id}`);
    seen.add(d.id);
  }
  return { defs, errors };
}

export interface BuiltModel {
  /** Baked template; clone() it for instances (geometry & materials are shared). */
  template: THREE.Group;
  stats: BakeStats;
  buildMs: number;
}

const built = new Map<string, Promise<BuiltModel>>();

/** Build + bake an asset config once; subsequent calls share the same template. */
export function getModel(def: AssetDef, config?: AssetConfig, detail: 'high' | 'low' = 'high'): Promise<BuiltModel> {
  const cfg = config ?? defaultConfig(def);
  const key = configKey(def, cfg) + '|' + detail;
  let p = built.get(key);
  if (!p) {
    p = (async () => {
      const t0 = performance.now();
      const obj = await def.build(cfg, { detail });
      const t1 = performance.now();
      const { group, stats } = bake(obj);
      group.name = def.id;
      group.userData.assetId = def.id;
      return { template: group, stats, buildMs: t1 - t0 };
    })();
    built.set(key, p);
    p.catch(() => built.delete(key));
  }
  return p;
}
