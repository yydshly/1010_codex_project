/**
 * Hidden review sheet for the German field gear: every GearPiece from src/assets/germany/gear plus
 * (read-only, if present) the infantry kit pieces from src/assets/germany/infantry/kit, standing in
 * their worn orientation (gear +Z towards the default camera) on a walnut board.
 * config.show: 'all' | 'flip' (all upside down) | a piece id (that piece alone).
 */
import { THREE, M, G, part, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { GERMAN_GEAR } from '../germany/gear';
import * as dePouches from '../germany/infantry/kit/pouches';
import * as deBags from '../germany/infantry/kit/bags';

const walnut = () => M.plainWood(0x3b2a1e, [1, 0, 0], { roughness: 0.5, wear: 0.05, dust: 0 });

/** Infantry-kit builders (owned by the German infantry module; used here for review only). */
const KIT: [string, Record<string, unknown>, string][] = [
  ['k98Pouch', dePouches as unknown as Record<string, unknown>, 'kit-k98-pouch'],
  ['mp40Pouch', dePouches as unknown as Record<string, unknown>, 'kit-mp40-pouch'],
  ['p38Holster', dePouches as unknown as Record<string, unknown>, 'kit-p38-holster'],
  ['toolPouch', dePouches as unknown as Record<string, unknown>, 'kit-tool-pouch'],
  ['breadBag', deBags as unknown as Record<string, unknown>, 'kit-bread-bag'],
  ['gasMaskCanister', deBags as unknown as Record<string, unknown>, 'kit-gas-mask'],
  ['messTin', deBags as unknown as Record<string, unknown>, 'kit-mess-tin'],
  ['zeltbahnRoll', deBags as unknown as Record<string, unknown>, 'kit-zeltbahn'],
  ['beltBuckle', deBags as unknown as Record<string, unknown>, 'kit-buckle'],
];

function kitObject(fnName: string, mod: Record<string, unknown>): THREE.Object3D | null {
  const fn = mod[fnName];
  if (typeof fn !== 'function') return null;
  try {
    const r = (fn as () => unknown)();
    if (r instanceof THREE.Object3D) return r;
    const o = (r as { obj?: unknown; object?: unknown }) ?? {};
    if (o.obj instanceof THREE.Object3D) return o.obj;
    if (o.object instanceof THREE.Object3D) return o.object;
  } catch (e) {
    console.error(`[germany-gear] kit ${fnName} failed: ${(e as Error).message}`);
  }
  return null;
}

const ids = Object.keys(GERMAN_GEAR);

const def: AssetDef = {
  id: 'test-germany-gear',
  name: 'German Gear Review',
  subtitle: 'Internal test',
  faction: 'germany',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary: 'Internal review layout of German field gear pieces.',
  facts: [],
  status: 'available',
  hidden: true,
  footprint: { w: 1.6, l: 1.2 },
  spacing: { default: 2, min: 1.5, max: 4 },
  maxQuantity: 1,
  options: [
    {
      kind: 'select',
      id: 'show',
      label: 'Show',
      choices: [
        { id: 'all', label: 'All' },
        { id: 'flip', label: 'Upside down' },
        ...ids.map((id) => ({ id, label: id })),
        ...KIT.map(([, , id]) => ({ id, label: id })),
      ],
      default: 'all',
    },
  ],
  provenance: { method: 'test', author: 'test', license: 'test', textures: 'test', references: [] },
  build(config) {
    const show = String(config.show ?? 'all');
    const BOARD_T = 0.02, gap = 0.05;
    const entries: { id: string; make: () => THREE.Object3D | null }[] = [
      ...ids.map((id) => ({ id, make: () => GERMAN_GEAR[id]().object as THREE.Object3D })),
      ...KIT.map(([fn, mod, id]) => ({ id, make: () => kitObject(fn, mod) })),
    ];
    const list = show === 'all' || show === 'flip' ? entries : entries.filter((e) => e.id === show);
    const items: { o: THREE.Object3D; w: number; d: number }[] = [];
    for (const e of list) {
      const o = e.make();
      if (!o) continue;
      if (list.length === 1) {
        // review aid: report the heaviest meshes of a single piece
        const rows: [number, string][] = [];
        o.updateMatrixWorld(true);
        o.traverse((m) => {
          const mesh = m as THREE.Mesh;
          if (!mesh.isMesh) return;
          const g = mesh.geometry;
          const tris = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
          const bb = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
          rows.push([tris, `${(mesh.material as THREE.Material).name} ${bb.x.toFixed(3)}x${bb.y.toFixed(3)}x${bb.z.toFixed(3)}`]);
        });
        rows.sort((a, b) => b[0] - a[0]);
        const byMat = new Map<string, [number, number]>();
        for (const [t, n] of rows) {
          const k = n.split(' ')[0];
          const v = byMat.get(k) ?? [0, 0];
          byMat.set(k, [v[0] + t, v[1] + 1]);
        }
        console.error(`[germany-gear] ${e.id} by material: ` + [...byMat].sort((a, b) => b[1][0] - a[1][0]).map(([k, [t, c]]) => `${k}=${t}/${c}`).join(' | '));
        console.error(`[germany-gear] ${e.id} heaviest: ` + rows.slice(0, 24).map(([t, n]) => `${t}:${n}`).join(' | '));
      }
      const holder = group([o]);
      if (show === 'flip') holder.rotation.x = Math.PI;
      holder.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(holder, true);
      const c = b.getCenter(new THREE.Vector3());
      const inner = group([holder]);
      holder.position.set(-c.x, BOARD_T - b.min.y, -c.z);
      items.push({ o: inner, w: b.max.x - b.min.x, d: b.max.z - b.min.z });
    }
    // shelf packing: rows along X, stacked towards -Z
    const maxRow = list.length > 1 ? 1.3 : 10;
    const rows: { list: typeof items; w: number; d: number }[] = [];
    let cur = { list: [] as typeof items, w: 0, d: 0 };
    for (const it of items) {
      if (cur.list.length && cur.w + gap + it.w > maxRow) {
        rows.push(cur);
        cur = { list: [], w: 0, d: 0 };
      }
      cur.w += (cur.list.length ? gap : 0) + it.w;
      cur.d = Math.max(cur.d, it.d);
      cur.list.push(it);
    }
    rows.push(cur);
    const totalD = rows.reduce((s, r) => s + r.d, 0) + gap * (rows.length - 1);
    const totalW = Math.max(0.2, ...rows.map((r) => r.w));
    let z = totalD / 2;
    const out: THREE.Object3D[] = [];
    for (const r of rows) {
      let x = -r.w / 2;
      for (const it of r.list) {
        it.o.position.set(x + it.w / 2, 0, z - r.d / 2);
        out.push(it.o);
        x += it.w + gap;
      }
      z -= r.d + gap;
    }
    out.push(part(G.rbox(totalW + 0.1, BOARD_T, totalD + 0.1, 0.004, 2), walnut(), { p: [0, BOARD_T / 2, 0] }));
    return group(out);
  },
};
export default def;
