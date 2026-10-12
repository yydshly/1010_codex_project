/**
 * US Army infantry (Normandy / ETO, 1944) catalog builder shared by the rifleman, squad leader and
 * BAR gunner entries: M1941 field jacket uniform (uniform.ts), one standard pose per weapon, the
 * weapon from usa/weapons and the web gear (kit.ts).
 *
 * Options (kept minimal): Pose where the weapon has two (rifleman: port arms / order arms; BAR
 * gunner: low ready / shoulder carry) and the M1928 haversack. The belt follows the weapon
 * (M1923 cartridge belt for the M1, M1937 BAR belt, M1936 pistol belt + Thompson pouch).
 */
import * as THREE from 'three';
import type { AssetConfig, AssetOption, BuildContext, ConfigConstraints, Provenance } from '../../../core/types';
import type { WeaponModel } from '../../shared/contracts';
import type { PoseId } from '../../shared/human/poses';
import { buildSoldier } from '../../shared/human/soldier';
import { simplify } from '../../shared/human/simplify';
import { buildM1Garand } from '../weapons/m1-garand.model';
import { buildThompsonM1A1 } from '../weapons/thompson-m1a1.model';
import { buildBarM1918A2 } from '../weapons/bar-m1918a2.model';
import { m41Uniform } from './uniform';
import { fitKit, BELT_FIT, type BeltKind } from './kit';
import { jacketDetails } from './details';
import { leggingParts } from './leggings';
import { US } from '../gear';

export type Role = 'rifleman' | 'squad-leader' | 'bar';

const POSES: Record<Role, { id: PoseId; label: string }[]> = {
  rifleman: [
    { id: 'port-arms', label: 'Port arms' },
    { id: 'order-arms', label: 'Order arms' },
    { id: 'aim-rifle', label: 'Aimed rifle (local battle extension)' },
  ],
  'squad-leader': [{ id: 'low-ready', label: 'Low ready' }],
  bar: [
    { id: 'low-ready', label: 'Low ready' },
    { id: 'shoulder-carry', label: 'Shoulder carry' },
  ],
};

const BELT: Record<Role, BeltKind> = { rifleman: 'm1923', 'squad-leader': 'm1936', bar: 'm1937' };

// ------------------------------------------------------------------ options

export function soldierOptions(role: Role): AssetOption[] {
  const out: AssetOption[] = [];
  const poses = POSES[role];
  if (poses.length > 1) {
    out.push({ kind: 'select', id: 'pose', label: 'Pose', default: poses[0].id, choices: poses.map((p) => ({ id: p.id, label: p.label })) });
  }
  out.push({
    kind: 'toggle',
    id: 'haversack',
    label: 'M1928 haversack',
    default: role === 'rifleman',
    note: role === 'rifleman' ? 'With pack carrier, bayonet and entrenching tool' : 'Without the pack carrier; its shoulder straps replace the M1936 suspenders',
  });
  return out;
}

const str = (v: unknown, allowed: string[], d: string) => (typeof v === 'string' && allowed.includes(v) ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

export function constrainSoldier(role: Role, cfg: AssetConfig): { config: AssetConfig; constraints?: ConfigConstraints } {
  const c: AssetConfig = {};
  for (const o of soldierOptions(role)) {
    if (o.kind === 'select') c[o.id] = str(cfg[o.id], o.choices.map((x) => x.id), o.default);
    else c[o.id] = bool(cfg[o.id], o.default);
  }
  return { config: c };
}

// ------------------------------------------------------------------ weapons (cached)

const weapons = new Map<Role, WeaponModel>();
function weapon(role: Role): WeaponModel {
  let m = weapons.get(role);
  if (!m) {
    m =
      role === 'rifleman'
        ? buildM1Garand({ detail: 'low' })
        : role === 'squad-leader'
          ? buildThompsonM1A1({ magazine: '30', detail: 'low' })
          : buildBarM1918A2({ bipod: 'none', detail: 'low' });
    weapons.set(role, m);
  }
  return m;
}

// ------------------------------------------------------------------ build

/** Uniform mesh budgets (triangles) - leaner than the shared default to leave room for the kit. */
const LOD = { budget: { tunic: 17500, trousers: 8000, boots: 3000, detail: 1300 } };

/** Decimated copies of the shared head / hand meshes (faces need not be detailed at this scale). */
const leanGeo = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
const LEAN_PARTS: Record<string, { tris: number; err: number }> = {
  head: { tris: 10000, err: 0.0004 },
  'hand-r': { tris: 4000, err: 0.0004 },
  'hand-l': { tris: 4000, err: 0.0004 },
  placket: { tris: 1800, err: 0.0004 },
  'boot-rim-l': { tris: 900, err: 0.0005 },
  'boot-rim-r': { tris: 900, err: 0.0005 },
  'sole-l': { tris: 900, err: 0.0005 },
  'sole-r': { tris: 900, err: 0.0005 },
};
/** The shared short gaiters (tube + strap bands): replaced by the M1938 leggings (leggings.ts). */
const DROP_PARTS = new Set(['legwear-strap-l', 'legwear-strap-r', 'legwear-l', 'legwear-r']);

/**
 * Near-identical small-part materials merged into the main ones (fewer draw calls per soldier):
 * weapon trim steels -> the main Parkerized steel, handguard walnut -> stock walnut; gear fittings
 * -> blackened steel, tapes / felt -> canvas, helmet rim / liner -> helmet paint, liner leather ->
 * the sling leather, painted tool parts -> OD steel.
 */
const REMAP: Record<string, string> = {
  'us-w-walnut-garand-hg': 'us-w-walnut-garand',
  'us-w-park-dark': 'us-w-park',
  'us-w-recess': 'us-w-park',
  'us-w-checker': 'us-w-park',
  'us-w-blued': 'us-w-park',
  'us-w-bright': 'us-w-park',
  'us-w-brass': 'us-fastener-metal',
  'us-fastener-metal': 'us-black-metal',
  'us-eyelet-hole': 'us-black-metal',
  'us-black-plastic': 'us-black-metal',
  'us-parkerized': 'us-black-metal',
  'us-tape-od7': 'us-canvas-od7',
  'us-felt': 'us-canvas-od7',
  'us-aluminium': 'us-wire',
  'us-od-plastic': 'us-od-steel',
  'us-handle-paint': 'us-od-steel',
  'us-blade-paint': 'us-od-steel',
  'us-helmet-rim': 'us-helmet-paint',
  'us-liner-paint': 'us-helmet-paint',
  'us-hbt': 'us-web-od7',
  'us-leather-dark': 'us-leather',
  'us-leather': 'us-w-leather',
  'us-w-thread': 'us-w-web',
  'us-w-blackened': 'us-w-park',
  'us-w-bar-mag': 'us-w-park',
  'us-w-walnut-bar-hg': 'us-w-walnut-bar-stock',
};

function remapMaterials(root: THREE.Object3D): void {
  const byName = new Map<string, THREE.Material>();
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    meshes.push(m);
    const mat = m.material as THREE.Material;
    if (!byName.has(mat.name)) byName.set(mat.name, mat);
  });
  const fallback: Record<string, () => THREE.Material> = { 'us-black-metal': US.blackMetal, 'us-canvas-od7': () => US.canvas('od7'), 'us-web-od7': () => US.web('od7'), 'us-leather': US.leather };
  /** Follow the chain as far as a material that exists on this soldier (or a gear palette entry). */
  const resolve = (name: string): THREE.Material | undefined => {
    let n = name;
    let found: THREE.Material | undefined;
    for (let i = 0; i < 5 && REMAP[n]; i++) {
      n = REMAP[n];
      const m = byName.get(n) ?? fallback[n]?.();
      if (m) found = m;
    }
    return found;
  };
  for (const m of meshes) {
    const r = resolve((m.material as THREE.Material).name);
    if (r) m.material = r;
  }
}

function leanFigure(root: THREE.Object3D): void {
  for (const c of [...root.children]) {
    if (DROP_PARTS.has(c.name)) {
      c.removeFromParent();
      continue;
    }
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

export function buildUSSoldier(role: Role, config: AssetConfig, ctx: BuildContext): THREE.Object3D {
  const cfg = constrainSoldier(role, config).config;
  const uniform = m41Uniform();
  const pose = (typeof cfg.pose === 'string' ? cfg.pose : POSES[role][0].id) as PoseId;
  const belt = BELT[role];
  const firearm = weapon(role);
  const sol = buildSoldier({
    uniform,
    pose,
    weapon: firearm,
    detail: ctx.detail,
    lod: ctx.detail === 'low' ? undefined : LOD,
    belt: BELT_FIT[belt],
    // over the shoulder the sling would have to wrap round the shoulder: carried without it
    sling: pose === 'shoulder-carry' ? false : undefined,
    decorate: (s) => [...jacketDetails(s), ...leggingParts(s), ...fitKit(s, { belt, haversack: !!cfg.haversack, bodyKey: `${role}|${pose}|${uniform.id}|${ctx.detail ?? 'high'}` })],
  });
  leanFigure(sol.object);
  remapMaterials(sol.object);
  if (sol.weaponMatrix) sol.object.userData.battleMuzzle = firearm.muzzle.clone().applyMatrix4(sol.weaponMatrix).toArray();
  return sol.object;
}

// ------------------------------------------------------------------ shared text

export const US_INFANTRY_REFERENCES = [
  'https://en.wikipedia.org/wiki/M1941_field_jacket',
  'https://www.wwiiimpressions.com/products/445',
  'https://en.wikipedia.org/wiki/M1_helmet',
  'https://www.iwm.org.uk/collections/item/object/30101008',
  'https://www.wwiiimpressions.com/products/469b',
  'https://en.wikipedia.org/wiki/U.S._Army_M1943_uniform',
];

export function soldierProvenance(extra: string[], notes: string): Provenance {
  return {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [...US_INFANTRY_REFERENCES, ...extra],
    notes,
  };
}
