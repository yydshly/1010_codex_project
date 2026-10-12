/**
 * Model review harness — renders one asset from several angles into a contact sheet.
 * Used by scripts/snap.mjs (headless) and handy in a normal browser too.
 *
 *   /harness.html?asset=germany/kar98k
 *     &config={"weapon":"mp40"}      JSON config (URL-encoded)
 *     &views=q-front,left,front,q-rear,top,ground   (default sheet)
 *     &ground=studio|plinth|none      (default studio)
 *     &ref=1                          add a 1.80 m scale figure beside the asset
 *     &w=1800&h=1200                  output size
 *     &cols=3
 *     &detail=high|low
 *   Custom camera (single view): &yaw=30&pitch=10&dist=2.5&target=0,1.5,0  (dist in metres)
 *   or &yaw=..&pitch=..&fit=0.5 (fit < 1 zooms in on the bounding sphere centre)
 *   &list=1 lists all asset modules and whether they load.
 */
import * as THREE from 'three';
import { Studio } from '../core/studio';
import { assetPaths, getModel, loadAssetByPath } from '../core/registry';
import { defaultConfig, FACTIONS, type AssetConfig } from '../core/types';
import type { GroundMode } from '../core/stage/ground';
import { scaleFigure } from './scaleFigure';

declare global {
  interface Window {
    __ready?: boolean;
    __error?: string;
    __png?: string;
    __stats?: unknown;
    /** ?list=1: serialisable catalog metadata of every loadable asset (for docs/PROVENANCE.md). */
    __defs?: unknown[];
  }
}

const VIEWS: Record<string, { yaw: number; pitch: number; label: string; fit?: number }> = {
  'q-front': { yaw: 35, pitch: 18, label: 'front-left 3/4' },
  'q-front-r': { yaw: -35, pitch: 18, label: 'front-right 3/4' },
  front: { yaw: 0, pitch: 5, label: 'front' },
  left: { yaw: 90, pitch: 4, label: 'left side (+X)' },
  right: { yaw: -90, pitch: 4, label: 'right side (-X)' },
  rear: { yaw: 180, pitch: 5, label: 'rear' },
  'q-rear': { yaw: 215, pitch: 20, label: 'rear-right 3/4' },
  'q-rear-l': { yaw: 145, pitch: 20, label: 'rear-left 3/4' },
  top: { yaw: 0, pitch: 89.5, label: 'top' },
  bottom: { yaw: 0, pitch: -89.5, label: 'bottom' },
  ground: { yaw: 60, pitch: 1.2, label: 'ground contact' },
  high: { yaw: 30, pitch: 45, label: 'high 3/4' },
};

const log = (s: string) => {
  const el = document.getElementById('log')!;
  el.textContent += s + '\n';
};

async function main() {
  const q = new URLSearchParams(location.search);
  if (q.get('list')) {
    const rows: string[] = [];
    const defs: unknown[] = [];
    for (const p of assetPaths()) {
      try {
        const d = await loadAssetByPath(p);
        rows.push(`${p}  ->  ${d.id}  [${d.category}/${d.status}]  ${d.name}`);
        defs.push({
          path: p, id: d.id, name: d.name, subtitle: d.subtitle, faction: d.faction,
          factionName: FACTIONS.find((f) => f.id === d.faction)?.name ?? d.faction,
          alignment: FACTIONS.find((f) => f.id === d.faction)?.alignment ?? null, category: d.category,
          countAs: d.countAs, status: d.status, unavailableReason: d.unavailableReason ?? null,
          hidden: !!d.hidden, summary: d.summary, facts: d.facts, footprint: d.footprint,
          options: (d.options ?? []).map((o) => o.label), provenance: d.provenance,
        });
      } catch (e) {
        rows.push(`${p}  ->  LOAD ERROR: ${(e as Error).message}`);
      }
    }
    log(rows.join('\n'));
    window.__stats = rows;
    window.__defs = defs;
    window.__ready = true;
    return;
  }

  const path = q.get('asset') ?? 'germany/panzer-iv-h';
  if (!path) throw new Error('missing ?asset=<faction>/<name>');
  const def = await loadAssetByPath(path);
  const cfg: AssetConfig = { ...defaultConfig(def), ...(q.get('config') ? JSON.parse(q.get('config')!) : {}) };
  const config = def.constrain ? def.constrain(cfg).config : cfg;
  const detail = (q.get('detail') as 'high' | 'low') ?? 'high';
  const built = await getModel(def, config, detail);
  const model = built.template.clone();

  const custom = q.has('yaw') || q.has('dist');
  const viewNames = custom ? ['custom'] : (q.get('views') ?? 'q-front,left,front,q-rear,top,ground').split(',');
  const W = Number(q.get('w') ?? (viewNames.length === 1 ? 1400 : 1800));
  const H = Number(q.get('h') ?? (viewNames.length === 1 ? 1000 : 1200));
  const cols = Number(q.get('cols') ?? Math.min(3, viewNames.length));
  const rows = Math.ceil(viewNames.length / cols);
  const cw = Math.floor(W / cols), ch = Math.floor((H - 28) / rows);

  const studio = new Studio({
    ground: (q.get('ground') as GroundMode) ?? 'studio',
    ao: q.get('ao') !== '0',
    preserveDrawingBuffer: true,
    pixelRatio: 1,
    width: cw,
    height: ch,
  });
  studio.content.add(model);
  let figure: THREE.Object3D | null = null;
  if (q.get('ref') === '1') {
    const b = new THREE.Box3().setFromObject(model, true);
    figure = scaleFigure();
    figure.position.set(b.max.x + 0.6, 0, (b.min.z + b.max.z) / 2);
    studio.content.add(figure);
  }
  const frameBox = new THREE.Box3().setFromObject(studio.content, true);

  const out = document.getElementById('out') as HTMLCanvasElement;
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#1b1a18';
  ctx.fillRect(0, 0, W, H);

  viewNames.forEach((name, i) => {
    if (name === 'custom') {
      const yaw = Number(q.get('yaw') ?? 35), pitch = Number(q.get('pitch') ?? 15);
      if (q.has('dist')) {
        const t = (q.get('target') ?? '0,1,0').split(',').map(Number);
        const target = new THREE.Vector3(t[0], t[1], t[2]);
        const d = Number(q.get('dist'));
        const y = THREE.MathUtils.degToRad(yaw), p = THREE.MathUtils.degToRad(pitch);
        studio.camera.position.copy(target).add(new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)).multiplyScalar(d));
        studio.camera.lookAt(target);
        studio.adaptToDistance(d);
        studio.fitShadows(target, Math.max(1.5, d * 0.8));
      } else {
        studio.frame(frameBox, yaw, pitch, Number(q.get('fit') ?? 1));
      }
    } else {
      const v = VIEWS[name];
      if (!v) throw new Error(`unknown view ${name}`);
      studio.frame(frameBox, v.yaw, v.pitch, v.fit ?? 1.0);
    }
    studio.render();
    const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
    ctx.drawImage(studio.renderer.domElement, x, y, cw, ch);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x, y, 170, 20);
    ctx.fillStyle = '#e8e2d6';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(name === 'custom' ? 'custom view' : VIEWS[name].label, x + 6, y + 14);
  });

  const s = built.stats;
  const size = s.bounds.getSize(new THREE.Vector3());
  const info =
    `${def.id} (${def.name})  config=${JSON.stringify(config)}  ` +
    `tris=${s.triangles.toLocaleString()}  draws=${s.drawCalls}  ` +
    `size W${size.x.toFixed(3)} H${size.y.toFixed(3)} L${size.z.toFixed(3)} m  ` +
    `minY=${s.minY.toFixed(4)}  build=${built.buildMs.toFixed(0)}ms bake=${s.bakeMs.toFixed(0)}ms`;
  ctx.fillStyle = '#e8e2d6';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(info, 8, H - 9);
  log(info);
  window.__stats = {
    id: def.id,
    config,
    triangles: s.triangles,
    drawCalls: s.drawCalls,
    size: { w: size.x, h: size.y, l: size.z },
    bounds: { min: s.bounds.min.toArray(), max: s.bounds.max.toArray() },
    minY: s.minY,
    buildMs: built.buildMs,
    bakeMs: s.bakeMs,
  };
  window.__png = out.toDataURL('image/png');
  window.__ready = true;
}

main().catch((e) => {
  const msg = String((e as Error)?.stack ?? e);
  log('ERROR: ' + msg);
  window.__error = msg;
  window.__ready = true;
});

if (window.parent !== window) document.querySelectorAll<HTMLAnchorElement>('header a, nav a').forEach(a => { a.target = '_top'; });

