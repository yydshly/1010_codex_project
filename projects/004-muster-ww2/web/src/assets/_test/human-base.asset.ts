/**
 * Hidden test asset for the shared human base system (src/assets/shared/human/):
 * poses, IK + grips, hands, head, the garment/uniform toolkit and boots.
 *
 * Options: pose (all poses), weapon (auto = the test weapon that suits the pose, or a real weapon
 * model), uniform (plain olive test uniform / detailed pattern with pockets), gear (a test belt,
 * pouches, canteen, shoulder straps and helmet placed with the fitting API), layer (clothed
 * figure, the bare body used as the garment base, or the head alone).
 */
import { THREE, M, G, group, part } from '../../core/kit';
import type { AssetDef, AssetConfig } from '../../core/types';
import type { GearPiece, WeaponModel } from '../shared/contracts';
import type { PoseId } from '../shared/human/poses';
import { buildSoldier, skinMaterial, type SoldierBuild, type GearPlacement, type StrapSpec } from '../shared/human/soldier';
import { TEST_UNIFORM, PLAIN_TEST_UNIFORM } from '../shared/human/uniform';
import { testRifle, testSmg, testLmg } from './test-weapons';

async function weaponFor(pose: PoseId, id: string): Promise<WeaponModel | null> {
  if (pose === 'stand' || id === 'none') return null;
  const want = id === 'auto' ? (pose === 'low-ready' ? 'test-smg' : pose === 'shoulder-carry' ? 'test-lmg' : 'test-rifle') : id;
  switch (want) {
    case 'test-rifle': return testRifle();
    case 'test-smg': return testSmg();
    case 'test-lmg': return testLmg();
    case 'kar98k': return (await import('../germany/weapons/kar98k.model')).buildKar98k();
    case 'mp40': return (await import('../germany/weapons/mp40.model')).buildMp40();
    case 'mg42': return (await import('../germany/weapons/mg42.model')).buildMg42();
    case 'mosin': return (await import('../soviet/weapons/mosin-9130.model')).buildMosin9130();
    case 'ppsh': return (await import('../soviet/weapons/ppsh41.model')).buildPpsh41();
    case 'dp27': return (await import('../soviet/weapons/dp27.model')).buildDp27({ bipod: 'folded' });
    default: return testRifle();
  }
}

// ------------------------------------------------------------------ test gear (fitting API check)

const leather = () => M.leather(0x2b2119, { roughness: 0.55, name: 'test-leather' });
const canvas = () => M.canvas(0x6b6445, { name: 'test-canvas' });

/** Belt pouch: back face on z = 0, belt loop centre at the origin. */
function testPouch(id: string): GearPiece {
  const o = group([
    part(G.rbox(0.105, 0.085, 0.038, 0.008), leather(), { p: [0, -0.03, 0.019] }),
    part(G.rbox(0.109, 0.035, 0.041, 0.006), leather(), { p: [0, 0.0, 0.0205] }),
  ]);
  return { id, name: 'Test pouch', object: o, mount: 'belt-front-left', size: { w: 0.109, h: 0.1, d: 0.041 }, belt: { loopWidth: 0.05 } };
}

/** Canteen in a cover hanging from the belt at the right rear hip. */
function testCanteen(): GearPiece {
  const body = new THREE.SphereGeometry(0.075, 20, 14);
  body.scale(0.95, 1.3, 0.55);
  const o = group([
    part(body, canvas(), { p: [0, -0.13, 0.042] }),
    part(G.rbox(0.03, 0.06, 0.006, 0.002), leather(), { p: [0, -0.02, 0.004] }),
  ]);
  return { id: 'test-canteen', name: 'Test canteen', object: o, mount: 'belt-rear-right', size: { w: 0.14, h: 0.22, d: 0.08 } };
}

/** Simple steel helmet shell (gear brief frame: origin at the liner band centre, +Z forward). */
function testHelmet(): GearPiece {
  const outer: THREE.Vector2[] = [], inner: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * (Math.PI / 2);
    outer.push(new THREE.Vector2(Math.cos(a) * 0.118, -0.03 + Math.sin(a) * 0.118));
    inner.push(new THREE.Vector2(Math.cos(a) * 0.112, -0.03 + Math.sin(a) * 0.112));
  }
  const og = new THREE.LatheGeometry(outer.map((p) => p.clone()), 40);
  const ig = new THREE.LatheGeometry(inner.slice().reverse(), 40);
  for (const g of [og, ig]) g.scale(0.86, 0.95, 1.0);
  const rim = new THREE.TorusGeometry(0.115, 0.004, 8, 48);
  rim.rotateX(Math.PI / 2);
  rim.scale(0.86, 1, 1.0);
  rim.translate(0, -0.03, 0);
  const paint = M.paint(0x565a4c, { roughness: 0.6, name: 'test-helmet' });
  const o = group([part(og, paint), part(ig, paint), part(rim, paint)]);
  return { id: 'test-helmet', name: 'Test helmet', object: o, mount: 'head', size: { w: 0.2, h: 0.15, d: 0.24 } };
}

function testGear(sol0: { fit: SoldierBuild['fit'] }): { gear: GearPlacement[]; straps: StrapSpec[] } {
  const fit = sol0.fit;
  const gear: GearPlacement[] = [
    { piece: testPouch('pouch-l'), mount: 'belt-front-left' },
    { piece: testPouch('pouch-r'), mount: 'belt-front-right' },
    { piece: testCanteen(), mount: 'belt-rear-right' },
    { piece: testHelmet(), mount: 'head' },
  ];
  const straps: StrapSpec[] = [];
  const belt = fit.beltPath();
  for (const sd of [1, -1]) {
    const front = new THREE.Vector3().setFromMatrixPosition(belt.frameAt(sd * 32)).add(new THREE.Vector3(0, 0.02, 0));
    const chest = fit.surfacePoint({ angle: sd * 24, height: 1.3 }).position;
    const clav = fit.surfacePoint({ angle: sd * 30, height: 1.43 }).position;
    const top = fit.surfacePoint({ angle: sd * 72, height: 1.47, elevation: 55 }).position;
    const blade = fit.surfacePoint({ angle: sd * 150, height: 1.36 }).position;
    const back = new THREE.Vector3().setFromMatrixPosition(belt.frameAt(sd * 152)).add(new THREE.Vector3(0, 0.02, 0));
    straps.push({ points: [front, chest, clav, top, blade, back], width: 0.022, thickness: 0.003, material: leather(), name: `y-strap-${sd > 0 ? 'l' : 'r'}` });
  }
  return { gear, straps };
}

const def: AssetDef = {
  id: 'test-human-base',
  name: 'Human Base Test',
  subtitle: 'Internal test',
  faction: 'germany',
  category: 'Infantry',
  countAs: 'personnel',
  summary: 'Internal test of the shared human base system.',
  facts: [],
  status: 'available',
  hidden: true,
  footprint: { w: 0.6, l: 0.5 },
  spacing: { default: 1.1, min: 0.8, max: 3 },
  maxQuantity: 8,
  options: [
    { kind: 'select', id: 'pose', label: 'Pose', default: 'port-arms', choices: [
      { id: 'stand', label: 'Standing' },
      { id: 'port-arms', label: 'Port Arms' },
      { id: 'order-arms', label: 'Order Arms' },
      { id: 'low-ready', label: 'Low Ready' },
      { id: 'shoulder-carry', label: 'Shoulder Carry' },
    ] },
    { kind: 'select', id: 'weapon', label: 'Weapon', default: 'auto', choices: [
      { id: 'auto', label: 'Test weapon for the pose' },
      { id: 'none', label: 'None' },
      { id: 'test-rifle', label: 'Test rifle' },
      { id: 'test-smg', label: 'Test SMG' },
      { id: 'test-lmg', label: 'Test LMG' },
      { id: 'kar98k', label: 'Kar98k' },
      { id: 'mp40', label: 'MP 40' },
      { id: 'mg42', label: 'MG 42' },
      { id: 'mosin', label: 'Mosin M91/30' },
      { id: 'ppsh', label: 'PPSh-41' },
      { id: 'dp27', label: 'DP-27' },
    ] },
    { kind: 'select', id: 'uniform', label: 'Uniform', default: 'plain', choices: [
      { id: 'plain', label: 'Plain olive test uniform' },
      { id: 'detailed', label: 'Detailed test uniform (pockets)' },
    ] },
    { kind: 'select', id: 'gear', label: 'Gear', default: 'none', choices: [
      { id: 'none', label: 'None' },
      { id: 'test', label: 'Test belt, pouches, canteen, straps, helmet' },
    ] },
    { kind: 'select', id: 'layer', label: 'Layer', default: 'clothed', choices: [
      { id: 'clothed', label: 'Clothed' },
      { id: 'body', label: 'Bare body (garment base)' },
      { id: 'head', label: 'Head only' },
    ] },
  ],
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [],
    notes: 'Internal test asset.',
  },
  async build(cfg: AssetConfig) {
    const pose = String(cfg.pose ?? 'port-arms') as PoseId;
    const weapon = await weaponFor(pose, String(cfg.weapon ?? 'auto'));
    const uniform = cfg.uniform === 'detailed' ? TEST_UNIFORM : PLAIN_TEST_UNIFORM;
    let sol: SoldierBuild = buildSoldier({ uniform, pose, weapon });
    if (cfg.gear === 'test') {
      // fitting API check: belt along beltPath, pouches / canteen / helmet via mountFrame, straps via strapPath
      const g = testGear(sol);
      sol = buildSoldier({ uniform, pose, weapon, gear: g.gear, straps: g.straps });
      const belt = sol.fit.beltPath();
      const geo = G.strap(belt.points, sol.fit.belt.width, sol.fit.belt.thickness, belt.normals, { closed: true, smooth: false });
      sol.object.add(part(geo, leather(), { name: 'belt' }));
      const buckle = part(G.rbox(0.058, 0.048, 0.006, 0.004), M.paint(0x5d5f55, { roughness: 0.45, metalness: 0.4, name: 'test-buckle' }), { p: [0, 0, 0.003] });
      const bm = belt.frameAt(0);
      buckle.applyMatrix4(bm);
      sol.object.add(buckle);
    }
    if (cfg.layer === 'head') {
      const g = group([]);
      for (const o of sol.object.children) if (/^(head|eye)/.test(o.name)) g.add(o.clone());
      return g;
    }
    if (cfg.layer === 'body') {
      const g = group([part(sol.bodyGeometry(), M.cotton(0x8a8578, { name: 'test-body' }))]);
      for (const o of sol.object.children) if (/^(head|eye|hand)/.test(o.name)) g.add(o.clone());
      void skinMaterial;
      void THREE;
      return g;
    }
    return sol.object;
  },
};
export default def;
