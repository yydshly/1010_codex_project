/**
 * Red Army infantry (1943-44) catalog builder shared by the rifleman, submachine gunner and DP-27
 * gunner entries: M43 uniform (uniform.ts), one standard pose per weapon, the weapon from
 * soviet/weapons, and the field kit (kit.ts) chosen by the options.
 *
 * Options: footwear (boots / ankle boots with obmotki), veshmeshok, flask, shovel, grenade pouch,
 * skatka (DP-27 gunner only; not with the veshmeshok); rifleman: bayonet; submachine gunner:
 * magazine type (the magazine pouch follows it). Ammunition pouches always follow the weapon.
 * Headgear is the SSh-40 helmet with the chinstrap worn under the chin.
 */
import * as THREE from 'three';
import type { AssetConfig, AssetOption, BuildContext, ConfigConstraints, Provenance } from '../../../core/types';
import type { WeaponModel } from '../../shared/contracts';
import type { PoseId } from '../../shared/human/poses';
import { buildSoldier } from '../../shared/human/soldier';
import { simplify } from '../../shared/human/simplify';
import { buildMosin9130 } from '../weapons/mosin-9130.model';
import { buildPpsh41 } from '../weapons/ppsh41.model';
import { buildDp27 } from '../weapons/dp27.model';
import { m43Uniform, type Footwear } from './uniform';
import { fitKit, type Ammo, type KitSpec } from './kit';

export type Role = 'rifleman' | 'smg' | 'mg';

const POSE: Record<Role, PoseId> = { rifleman: 'order-arms', smg: 'low-ready', mg: 'shoulder-carry' };

// ------------------------------------------------------------------ options

const common = (role: Role): AssetOption[] => [
  {
    kind: 'select',
    id: 'footwear',
    label: 'Footwear',
    default: 'boots',
    choices: [
      { id: 'boots', label: 'Boots' },
      { id: 'obmotki', label: 'Ankle boots with obmotki', note: 'Wound cloth puttees' },
    ],
  },
  { kind: 'toggle', id: 'veshmeshok', label: 'Veshmeshok (pack)', default: role !== 'mg' },
  // The rolled greatcoat's ends lie at the right hip, where the rifleman's and the submachine
  // gunner's right arm hangs in their poses: offered where the right arm is clear of it.
  ...(role === 'mg'
    ? [{ kind: 'toggle', id: 'skatka', label: 'Skatka (rolled greatcoat)', default: true, note: 'Over the left shoulder, ends tied at the right hip' } as AssetOption]
    : []),
  { kind: 'toggle', id: 'canteen', label: 'Water flask', default: true },
  { kind: 'toggle', id: 'shovel', label: 'Entrenching shovel', default: true },
  { kind: 'toggle', id: 'grenades', label: 'Grenade pouch', default: true },
];

export function soldierOptions(role: Role): AssetOption[] {
  const out: AssetOption[] = [];
  if (role === 'rifleman') {
    out.push({
      kind: 'select',
      id: 'bayonet',
      label: 'Bayonet',
      default: 'fixed',
      choices: [
        { id: 'fixed', label: 'Fixed' },
        { id: 'none', label: 'Not fitted' },
      ],
    });
  }
  if (role === 'smg') {
    out.push({
      kind: 'select',
      id: 'magazine',
      label: 'Magazine',
      default: 'drum',
      choices: [
        { id: 'drum', label: '71-round drum', note: 'Drum pouch on the belt' },
        { id: 'box', label: '35-round box', note: 'Box-magazine pouches on the belt' },
      ],
    });
  }
  out.push(...common(role));
  return out;
}

const str = (v: unknown, allowed: string[], d: string) => (typeof v === 'string' && allowed.includes(v) ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

export function constrainSoldier(role: Role, cfg: AssetConfig): { config: AssetConfig; constraints?: ConfigConstraints } {
  const opts = soldierOptions(role);
  const c: AssetConfig = {};
  for (const o of opts) {
    if (o.kind === 'select') c[o.id] = str(cfg[o.id], o.choices.map((x) => x.id), o.default);
    else c[o.id] = bool(cfg[o.id], o.default);
  }
  const disabled: Record<string, string> = {};
  if (c.skatka !== undefined && c.veshmeshok) {
    c.skatka = false;
    disabled.skatka = 'Not combined with the veshmeshok in this model';
  }
  return { config: c, constraints: Object.keys(disabled).length ? { disabled } : undefined };
}

// ------------------------------------------------------------------ weapons (cached)

const weapons = new Map<string, WeaponModel>();
function weaponFor(role: Role, cfg: AssetConfig): { key: string; make: () => WeaponModel } {
  if (role === 'rifleman') {
    const b = cfg.bayonet === 'none' ? 'none' : 'fixed';
    return { key: `mosin-${b}`, make: () => buildMosin9130({ bayonet: b }) };
  }
  if (role === 'smg') {
    const m = cfg.magazine === 'box' ? 'box' : 'drum';
    return { key: `ppsh-${m}`, make: () => buildPpsh41({ magazine: m }) };
  }
  return { key: 'dp27', make: () => buildDp27({ bipod: 'folded' }) };
}
function weapon(role: Role, cfg: AssetConfig): WeaponModel {
  const w = weaponFor(role, cfg);
  let m = weapons.get(w.key);
  if (!m) {
    m = w.make();
    weapons.set(w.key, m);
  }
  return m;
}

// ------------------------------------------------------------------ build

/** Uniform mesh budgets (triangles) - leaner than the shared default to leave room for the kit. */
const LOD = { budget: { tunic: 21000, trousers: 9500, boots: 3400, detail: 1400 } };

/** Decimated copies of the shared head / hand meshes (faces need not be detailed at this scale). */
const leanGeo = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
const LEAN_PARTS: Record<string, { tris: number; err: number }> = {
  head: { tris: 9000, err: 0.0005 },
  'hand-r': { tris: 4200, err: 0.0004 },
  'hand-l': { tris: 4200, err: 0.0004 },
  collar: { tris: 1900, err: 0.0004 },
  placket: { tris: 1900, err: 0.0004 },
  'strap-piping-l': { tris: 700, err: 0.0004 },
  'strap-piping-r': { tris: 700, err: 0.0004 },
  'boot-rim-l': { tris: 1000, err: 0.0005 },
  'boot-rim-r': { tris: 1000, err: 0.0005 },
  'sole-l': { tris: 900, err: 0.0005 },
  'sole-r': { tris: 900, err: 0.0005 },
};
function leanFigure(root: THREE.Object3D): void {
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

export function buildSovietSoldier(role: Role, config: AssetConfig, ctx: BuildContext): THREE.Object3D {
  const cfg = constrainSoldier(role, config).config;
  const uniform = m43Uniform((cfg.footwear as Footwear) ?? 'boots');
  const ammo: Ammo = role === 'rifleman' ? 'rifle' : role === 'smg' ? (cfg.magazine === 'box' ? 'box' : 'drum') : 'none';
  const kit: KitSpec = {
    // the pilotka (pilotka.ts) is not offered yet: its front still shows meshing slits
    headgear: 'helmet',
    ammo,
    grenades: !!cfg.grenades,
    shovel: !!cfg.shovel,
    canteen: !!cfg.canteen,
    veshmeshok: !!cfg.veshmeshok,
    skatka: !!cfg.skatka,
    seed: role === 'rifleman' ? 3 : role === 'smg' ? 5 : 7,
  };
  const sol = buildSoldier({
    uniform,
    pose: POSE[role],
    weapon: weapon(role, cfg),
    detail: ctx.detail,
    lod: ctx.detail === 'low' ? undefined : LOD,
    decorate: (s) => fitKit(s, kit),
  });
  leanFigure(sol.object);
  return sol.object;
}

// ------------------------------------------------------------------ shared text

export const SOVIET_INFANTRY_REFERENCES = [
  'https://en.wikipedia.org/wiki/Gymnastyorka',
  'https://sovietuniform.com/soviet-military-uniform-history-ww2/',
  'https://www.13thguardspoltavaskaya.com/equipment.html',
  'https://en.wikipedia.org/wiki/SSh-40',
  'https://en.wikipedia.org/wiki/MPL-50',
];

export function soldierProvenance(extra: string[], notes: string): Provenance {
  return {
    method: 'Procedurally modelled in TypeScript for this project (no external meshes).',
    author: 'Muster project',
    license: 'Project-owned; created for this project.',
    textures: 'Procedural, generated in code at runtime.',
    references: [...SOVIET_INFANTRY_REFERENCES, ...extra],
    notes,
  };
}
