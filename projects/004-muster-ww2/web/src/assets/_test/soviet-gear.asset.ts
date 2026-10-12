/**
 * Hidden review layout of every Soviet gear piece (src/assets/soviet/gear), standing in its worn
 * orientation (gear +Z towards the default camera) on a walnut board. config.piece shows one
 * piece alone; config.flip turns a single piece upside down (undersides, liners).
 */
import { THREE, M, G, part, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { SOVIET_GEAR } from '../soviet/gear';

const walnut = () => M.plainWood(0x3b2a1e, [1, 0, 0], { roughness: 0.5, wear: 0.05, dust: 0 });

const def: AssetDef = {
  id: 'test-soviet-gear',
  name: 'Soviet Gear Review',
  subtitle: 'Internal test',
  faction: 'soviet',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary: 'Internal review layout for the Soviet gear pieces.',
  facts: [],
  status: 'available',
  hidden: true,
  footprint: { w: 1.6, l: 1.4 },
  spacing: { default: 2.5, min: 2, max: 5 },
  maxQuantity: 1,
  options: [
    {
      kind: 'select',
      id: 'piece',
      label: 'Piece',
      default: 'all',
      choices: [{ id: 'all', label: 'All' }, ...SOVIET_GEAR.map((g) => ({ id: g.key, label: g.key }))],
    },
    { kind: 'toggle', id: 'flip', label: 'Upside down (single piece)', default: false },
  ],
  provenance: { method: 'test', author: 'test', license: 'test', textures: 'test', references: [] },
  build(cfg) {
    const sel = String(cfg.piece ?? 'all');
    const list = sel === 'all' ? SOVIET_GEAR : SOVIET_GEAR.filter((g) => g.key === sel);
    const BOARD_T = 0.02;
    const gap = 0.05;
    const maxRow = sel === 'all' ? 1.25 : 10;
    const items: { o: THREE.Object3D; w: number; d: number }[] = [];
    for (const e of list) {
      let o: THREE.Object3D;
      try {
        o = e.build().object;
      } catch (err) {
        console.error(`[soviet-gear] ${e.key} failed: ${(err as Error).stack ?? err}`);
        continue;
      }
      // review guard: report (and drop) meshes without geometry data
      const bad: THREE.Object3D[] = [];
      o.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (mesh.isMesh && !mesh.geometry.attributes.position) bad.push(mesh);
      });
      for (const m of bad) {
        console.error(`[soviet-gear] ${e.key}: empty geometry in mesh "${m.name}" (material ${(m as THREE.Mesh).material && ((m as THREE.Mesh).material as THREE.Material).name})`);
        m.parent?.remove(m);
      }
      if (e.layFlat) o.rotation.x = -Math.PI / 2;
      if (cfg.flip && sel !== 'all') o.rotation.x += Math.PI;
      const holder = group([o]);
      holder.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(holder, true);
      const c = b.getCenter(new THREE.Vector3());
      o.parent!.position.set(-c.x, BOARD_T - b.min.y, -c.z);
      items.push({ o: holder, w: b.max.x - b.min.x, d: b.max.z - b.min.z });
    }
    // shelf packing: rows along X, rows stacked towards -Z (back)
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
    const totalW = Math.max(...rows.map((r) => r.w));
    let z = totalD / 2;
    const out: THREE.Object3D[] = [];
    for (const r of rows) {
      let x = -r.w / 2;
      const zc = z - r.d / 2;
      for (const it of r.list) {
        it.o.position.x += x + it.w / 2;
        it.o.position.z += zc;
        out.push(it.o);
        x += it.w + gap;
      }
      z -= r.d + gap;
    }
    const board = part(G.rbox(totalW + 0.1, BOARD_T, totalD + 0.1, 0.004, 2), walnut(), { p: [0, BOARD_T / 2, 0] });
    return group([board, ...out]);
  },
};
export default def;
