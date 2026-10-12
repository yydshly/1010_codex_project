/**
 * British Army infantry (NW Europe 1944) catalog builder shared by the Rifleman, Section Leader and
 * Bren Gunner entries: 1937-pattern Battledress (uniform.ts + pockets.ts), one standard pose per
 * weapon, the weapon from uk/weapons, and the 1937-pattern web equipment in battle order (kit.ts).
 *
 * Options: Weapon (Section Leader: Sten Mk II or Rifle No. 4), Pose (only poses that suit the
 * weapon: rifle = port arms / order arms, Sten = low ready, Bren = low ready / shoulder carry),
 * Small pack (on the L-straps). The basic pouches suit every weapon (they held Bren magazines,
 * rifle chargers or Sten magazines), so the pouch set does not change with the weapon.
 */
import * as THREE from 'three';
import type { AssetConfig, AssetOption, BuildContext, ConfigConstraints, Provenance } from '../../../core/types';
import type { WeaponModel } from '../../shared/contracts';
import type { PoseId } from '../../shared/human/poses';
import { buildSoldier } from '../../shared/human/soldier';
import { simplify } from '../../shared/human/simplify';
import { buildLeeEnfieldNo4 } from '../weapons/lee-enfield-no4.model';
import { buildStenMk2 } from '../weapons/sten-mk2.model';
import { buildBrenMk2 } from '../weapons/bren-mk2.model';
import { BELT37, UK_GEAR_MATERIALS as UK } from '../gear';
import { ukwMaterials } from '../weapons/common/materials';
import { battledress37, BD_BELT_HEIGHT } from './uniform';
import { trouserPockets } from './pockets';
import { fitKit, kitClearance, leanObject } from './kit';
import { stanceOf } from '../../shared/human/poses';
import { solveBody, DEFAULT_BODY } from '../../shared/human/skeleton';
import { bodyModel } from '../../shared/human/body';
import { uniformFields, footwearLift, type UniformSpec } from '../../shared/human/uniform';
import { createFit, type BeltSpec } from '../../shared/human/fit';
import type { SDF } from '../../shared/human/sdfx';

export type Role = 'rifleman' | 'leader' | 'bren';
type WeaponId = 'no4' | 'sten' | 'bren';

const WEAPONS: Record<Role, { id: WeaponId; label: string; note?: string }[]> = {
  rifleman: [{ id: 'no4', label: 'Rifle No. 4 Mk I' }],
  leader: [
    { id: 'sten', label: 'Sten Mk II', note: 'Submachine gun' },
    { id: 'no4', label: 'Rifle No. 4 Mk I' },
  ],
  bren: [{ id: 'bren', label: 'Bren Mk II', note: 'Bipod folded' }],
};

const POSE_LABEL: Record<string, string> = {
  'port-arms': 'Port arms',
  'order-arms': 'Order arms',
  'low-ready': 'Low ready',
  'shoulder-carry': 'Shoulder carry',
};
const POSES_FOR: Record<WeaponId, PoseId[]> = {
  no4: ['port-arms', 'order-arms'],
  sten: ['low-ready'],
  bren: ['low-ready', 'shoulder-carry'],
};

// ------------------------------------------------------------------ options

function allPoses(role: Role): PoseId[] {
  const out: PoseId[] = [];
  for (const w of WEAPONS[role]) for (const p of POSES_FOR[w.id]) if (!out.includes(p)) out.push(p);
  return out;
}

export function soldierOptions(role: Role): AssetOption[] {
  const out: AssetOption[] = [];
  const ws = WEAPONS[role];
  if (ws.length > 1) {
    out.push({ kind: 'select', id: 'weapon', label: 'Weapon', default: ws[0].id, choices: ws.map((w) => ({ id: w.id, label: w.label, note: w.note })) });
  }
  const poses = allPoses(role);
  if (poses.length > 1) {
    out.push({ kind: 'select', id: 'pose', label: 'Pose', default: POSES_FOR[ws[0].id][0], choices: poses.map((p) => ({ id: p, label: POSE_LABEL[p] })) });
  }
  out.push({ kind: 'toggle', id: 'pack', label: 'Small pack', default: true, note: 'Haversack on the back on the L-straps (battle order)' });
  return out;
}

export function constrainSoldier(role: Role, cfg: AssetConfig): { config: AssetConfig; constraints?: ConfigConstraints } {
  const ws = WEAPONS[role];
  const c: AssetConfig = {};
  const weapon = (ws.find((w) => w.id === cfg.weapon) ?? ws[0]).id;
  if (ws.length > 1) c.weapon = weapon;
  const valid = POSES_FOR[weapon];
  const all = allPoses(role);
  const constraints: ConfigConstraints = {};
  if (all.length > 1) {
    c.pose = typeof cfg.pose === 'string' && valid.includes(cfg.pose as PoseId) ? cfg.pose : valid[0];
    const bad = all.filter((p) => !valid.includes(p));
    if (bad.length) constraints.disallowedChoices = { pose: bad };
    if (valid.length === 1) constraints.disabled = { pose: `${POSE_LABEL[valid[0]]} only with this weapon` };
  }
  c.pack = typeof cfg.pack === 'boolean' ? cfg.pack : true;
  return { config: c, constraints: constraints.disabled || constraints.disallowedChoices ? constraints : undefined };
}

// ------------------------------------------------------------------ weapons (cached)

/**
 * Small weapon materials merged into the main ones on the carried weapons (fewer draw calls per
 * soldier): recess / stamped marks -> black finish, bright bolt -> blued, handguard beech -> stock
 * beech, brass -> the web-equipment brass, web sling -> the web-equipment strap.
 */
const W_REMAP: Record<string, () => THREE.Material> = {
  'uk-w-recess': () => ukwMaterials().black,
  'uk-w-stamped': () => ukwMaterials().black,
  'uk-w-bright': () => ukwMaterials().blued,
  'uk-w-beech-guard': () => ukwMaterials().beech,
  'uk-w-brass': UK.brass,
  'uk-w-web': UK.webStrap,
};
/** The Bren's own black finish takes the other black parts (magazine, marks) of that gun. */
const BREN_BLACK = new Set(['uk-w-black', 'uk-w-bren-mag', 'uk-w-marks', 'uk-w-recess', 'uk-w-stamped']);
function remapWeapon(o: THREE.Object3D, own?: THREE.Material): void {
  const drop: THREE.Object3D[] = [];
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const name = (m.material as THREE.Material).name;
    if (name.startsWith('decal-')) { drop.push(m); return; }
    if (own && BREN_BLACK.has(name)) { m.material = own; return; }
    const r = W_REMAP[name];
    if (r) m.material = r();
  });
  for (const d of drop) d.removeFromParent();
}
function findMaterial(o: THREE.Object3D, name: string): THREE.Material | undefined {
  let out: THREE.Material | undefined;
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh && (m.material as THREE.Material).name === name) out = m.material as THREE.Material;
  });
  return out;
}

/** Carried weapons: low-detail models, decimated (<= 0.5 mm) and with merged small materials. */
const WEAPON_TRIS: Record<WeaponId, number> = { no4: 20000, sten: 16000, bren: 26000 };
const weapons = new Map<WeaponId, WeaponModel>();
function weapon(id: WeaponId): WeaponModel {
  let m = weapons.get(id);
  if (!m) {
    const w = id === 'no4' ? buildLeeEnfieldNo4({ detail: 'low' }) : id === 'sten' ? buildStenMk2({ detail: 'low' }) : buildBrenMk2({ bipod: 'folded', detail: 'low' });
    const obj = w.object.clone(true);
    leanObject(obj, WEAPON_TRIS[id], 0.0007);
    const own = id === 'bren' ? findMaterial(obj, 'uk-w-bren-black') : undefined;
    remapWeapon(obj, own);
    const sling = w.sling;
    m = {
      ...w,
      object: obj,
      sling: sling ? { ...sling, build: (g: THREE.Vector3, slack?: number) => { const o = sling.build(g, slack); remapWeapon(o, own); return o; } } : undefined,
    };
    weapons.set(id, m);
  }
  return m;
}

// ------------------------------------------------------------------ build

/** Uniform mesh budgets (triangles) - leaner than the shared default to leave room for the kit. */
const LOD = {
  tunic: 0.0088,
  trousers: 0.0088,
  boots: 0.0078,
  detail: 0.0031,
  edge: 0.0033,
  budget: { tunic: 17000, trousers: 8500, boots: 3000, detail: 1100 },
};

/** Decimated copies of the shared head / hand / detail meshes (faces are kept simple). */
const leanGeo = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
const LEAN_PARTS: Record<string, { tris: number; err: number }> = {
  head: { tris: 8000, err: 0.0005 },
  'hand-r': { tris: 3800, err: 0.0004 },
  'hand-l': { tris: 3800, err: 0.0004 },
  collar: { tris: 1800, err: 0.0004 },
  placket: { tris: 1500, err: 0.0004 },
  'boot-rim-l': { tris: 900, err: 0.0005 },
  'boot-rim-r': { tris: 900, err: 0.0005 },
  'sole-l': { tris: 800, err: 0.0005 },
  'sole-r': { tris: 800, err: 0.0005 },
  'legwear-l': { tris: 2000, err: 0.0006 },
  'legwear-r': { tris: 2000, err: 0.0006 },
  'legwear-strap-l': { tris: 700, err: 0.0005 },
  'legwear-strap-r': { tris: 700, err: 0.0005 },
  hem: { tris: 2200, err: 0.0005 },
  'cuff-l': { tris: 1000, err: 0.0005 },
  'cuff-r': { tris: 1000, err: 0.0005 },
  'trouser-bottom-l': { tris: 1000, err: 0.0005 },
  'trouser-bottom-r': { tris: 1000, err: 0.0005 },
  'shoulder-strap-l': { tris: 900, err: 0.0004 },
  'shoulder-strap-r': { tris: 900, err: 0.0004 },
};
function leanFigure(root: THREE.Object3D): void {
  // soles and laces take the boot leather, anklet straps the anklet web (fewer draw calls)
  const matOf = (name: string) => (root.getObjectByName(name) as THREE.Mesh | undefined)?.material;
  const boot = matOf('boot-l'), anklet = matOf('legwear-l');
  for (const c of root.children) {
    const m = c as THREE.Mesh;
    if (!m.isMesh) continue;
    if (boot && (c.name.startsWith('sole') || c.name.startsWith('lace'))) m.material = boot;
    if (anklet && c.name.startsWith('legwear-strap')) m.material = anklet;
  }
  for (const c of root.children) {
    const spec = LEAN_PARTS[c.name];
    const m = c as THREE.Mesh;
    if (!spec || !m.isMesh) continue;
    let g = leanGeo.get(m.geometry);
    if (!g) {
      g = simplify(m.geometry, spec.tris, { maxError: spec.err });
      leanGeo.set(m.geometry, g);
    }
    m.geometry = g;
  }
}

const BELT: BeltSpec = { height: BD_BELT_HEIGHT, width: BELT37.width, thickness: BELT37.t };

/** Weapon clearance round the belt gear, from a fit of the pose's stance (cached per pose). */
const clearances = new Map<string, SDF>();
function clearanceFor(uniform: UniformSpec, pose: PoseId): SDF {
  const key = `${uniform.id}|${pose}`;
  let c = clearances.get(key);
  if (!c) {
    const stature = DEFAULT_BODY.stature;
    const sk = solveBody(stanceOf(pose), { stature, lift: footwearLift(uniform.footwear, stature) });
    const bm = bodyModel(sk);
    c = kitClearance(createFit(bm, uniformFields(uniform, bm), BELT));
    clearances.set(key, c);
  }
  return c;
}

export function buildBritishSoldier(role: Role, config: AssetConfig, ctx: BuildContext): THREE.Object3D {
  const cfg = constrainSoldier(role, config).config;
  const ws = WEAPONS[role];
  const wid = ((cfg.weapon as WeaponId | undefined) ?? ws[0].id) as WeaponId;
  const pose = ((cfg.pose as PoseId | undefined) ?? POSES_FOR[wid][0]) as PoseId;
  const uniform = battledress37();
  const wpn = weapon(wid);
  const clr = pose === 'order-arms' ? undefined : clearanceFor(uniform, pose);
  const sol = buildSoldier({
    uniform,
    pose,
    weapon: wpn,
    detail: ctx.detail,
    lod: ctx.detail === 'low' ? undefined : LOD,
    belt: BELT,
    clearance: clr,
    // shoulder carry: the gun rests on the point of the shoulder, clear of the helmet brim
    poseOverrides: pose === 'shoulder-carry' ? { weaponOffset: new THREE.Matrix4().makeTranslation(-0.03, 0, 0) } : undefined,
    decorate: (s) => [...trouserPockets(s), ...fitKit(s, { pack: !!cfg.pack })],
  });
  leanFigure(sol.object);
  return sol.object;
}

// ------------------------------------------------------------------ shared text

export const UK_INFANTRY_REFERENCES = [
  'https://en.wikipedia.org/wiki/Battledress',
  'https://en.wikipedia.org/wiki/1937_Pattern_Web_Equipment',
  'https://en.wikipedia.org/wiki/Brodie_helmet',
];

export function soldierProvenance(extra: string[], notes: string): Provenance {
  return {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [...UK_INFANTRY_REFERENCES, ...extra],
    notes,
  };
}
