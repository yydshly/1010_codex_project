/**
 * Hidden review layout of every British gear piece (src/assets/uk/gear), standing in its worn
 * orientation (gear +Z towards the default camera) on a walnut board. config.piece shows one
 * piece alone; config.flip turns a single piece upside down (undersides, liners); config.flat
 * lays a single piece on its back. piece = 'set' fits the belt items on the display belt with
 * belt37FrameAt (pouches at +-34 deg, frog on the left, bottle on the right hip, entrenching tool
 * at the rear) to check the gear frames against each other.
 */
import { THREE, M, G, part, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import { UK_GEAR, buildWaistBelt37, belt37FrameAt, buildBasicPouch37, buildBayonetFrog37, buildWaterBottle37, buildEntrenchingTool37, BELT37 } from '../uk/gear';
import type { GearPiece } from '../shared/contracts';

const walnut = () => M.plainWood(0x3b2a1e, [1, 0, 0], { roughness: 0.5, wear: 0.05, dust: 0 });

function countTris(o: THREE.Object3D): number {
  let tris = 0;
  o.traverse((m) => {
    const mesh = m as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry.attributes.position) return;
    const gg = mesh.geometry;
    tris += (gg.index ? gg.index.count : gg.attributes.position.count) / 3;
  });
  return Math.round(tris);
}

/** The belt with its items mounted, on a board, lifted so the lowest item clears the board. */
function buildSet(): THREE.Object3D {
  const lift = 0.3; // belt centre height above the board
  const items: THREE.Object3D[] = [buildWaistBelt37().object];
  const mount = (p: GearPiece, f: number, dy = 0, dz = 0) => {
    const m = belt37FrameAt(f).multiply(new THREE.Matrix4().makeTranslation(0, dy, dz));
    const h = new THREE.Group();
    h.add(p.object);
    h.applyMatrix4(m);
    items.push(h);
  };
  mount(buildBasicPouch37({ side: 'l' }), 0.09);
  mount(buildBasicPouch37({ side: 'r' }), 1 - 0.09);
  mount(buildBayonetFrog37(), 0.24);
  // the bottle hangs from the right brace end just below the belt, the tool from both at the rear
  mount(buildWaterBottle37(), 0.7, -BELT37.width / 2 - 0.004, 0.001);
  mount(buildEntrenchingTool37(), 0.5, -BELT37.width / 2 + 0.004, 0.001);
  const g = group(items);
  g.position.y = lift;
  const box = new THREE.Box3().setFromObject(g, true);
  g.position.y += 0.02 - box.min.y;
  const size = box.getSize(new THREE.Vector3());
  const board = part(G.rbox(size.x + 0.08, 0.02, size.z + 0.08, 0.004, 2), walnut(), { p: [0, 0.01, 0] });
  console.warn(`[uk-gear] set: ${countTris(g)} tris`);
  return group([board, g]);
}

const def: AssetDef = {
  id: 'test-uk-gear',
  name: 'UK Gear Review',
  subtitle: 'Internal test',
  faction: 'uk',
  category: 'Equipment',
  countAs: 'looseEquipment',
  summary: 'Internal review layout for the British gear pieces.',
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
      choices: [{ id: 'all', label: 'All' }, { id: 'set', label: 'Belt set' }, ...UK_GEAR.map((g) => ({ id: g.key, label: g.key }))],
    },
    { kind: 'toggle', id: 'flip', label: 'Upside down (single piece)', default: false },
    { kind: 'toggle', id: 'flat', label: 'Lay flat (single piece)', default: false },
  ],
  provenance: { method: 'test', author: 'test', license: 'test', textures: 'test', references: [] },
  build(cfg) {
    const sel = String(cfg.piece ?? 'all');
    if (sel === 'set') return buildSet();
    const list = sel === 'all' ? UK_GEAR : UK_GEAR.filter((g) => g.key === sel);
    const BOARD_T = 0.02;
    const gap = 0.05;
    const maxRow = sel === 'all' ? 1.6 : 10;
    const items: { o: THREE.Object3D; w: number; d: number }[] = [];
    for (const e of list) {
      let o: THREE.Object3D;
      const t0 = performance.now();
      try {
        o = e.build().object;
      } catch (err) {
        console.error(`[uk-gear] ${e.key} failed: ${(err as Error).stack ?? err}`);
        continue;
      }
      const bad: THREE.Object3D[] = [];
      o.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (mesh.isMesh && !mesh.geometry.attributes.position) bad.push(mesh);
      });
      console.warn(`[uk-gear] ${e.key}: ${countTris(o)} tris, ${(performance.now() - t0).toFixed(0)} ms`);
      for (const m of bad) {
        console.error(`[uk-gear] ${e.key}: empty geometry in mesh "${m.name}"`);
        m.parent?.remove(m);
      }
      if (e.layFlat || (cfg.flat && sel !== 'all')) o.rotation.x = -Math.PI / 2;
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
