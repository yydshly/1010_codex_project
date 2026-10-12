/**
 * Soldier assembly: pose + body + uniform + head + hands + weapon (+ sling) + gear + straps.
 *
 *   const sol = buildSoldier({ uniform, pose: 'port-arms', weapon: buildKar98k() });
 *   return sol.object;                       // THREE.Group in asset space, ready for the baker
 *
 * Asset space: metres, +Y up, +Z forward (the soldier faces +Z), +X = the soldier's LEFT,
 * origin on the ground (y = 0) between the feet; boot soles touch y = 0.
 *
 * The heavy parts (uniform SDF meshes, head, hands) are cached by
 * (pose, uniform.id, stature, weapon grip signature): a second soldier with the same key only
 * clones meshes (geometry is shared) and re-fits gear and straps.
 */
import * as THREE from 'three';
import { M } from '../../../core/materials/library';
import type { SurfaceParams } from '../../../core/materials/surface';
import { strap as strapGeometry } from '../../../core/geo/shapes';
import type { GearMount, GearPiece, WeaponModel } from '../contracts';
import { solvePose, type PoseId, type PoseOverrides, type SolvedPose } from './poses';
import { bodyModel, type BodyModel } from './body';
import { buildUniform, footwearLift, uniformFields, DEFAULT_LOD, type UniformSpec, type UniformLOD, type UniformBuild } from './uniform';
import { headGeometry, eyeGeometry, EYE } from './head';
import { gripHand, relaxedHand } from './hands';
import { createFit, type Fit, type MountOptions, type BeltSpec } from './fit';
import { DEFAULT_BODY, SIDES, type BodyParams, type Side } from './skeleton';
import { frameToMatrix, type SDF } from './sdfx';
import { meshSDF } from './mesh';
import { simplify } from './simplify';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------ materials

/**
 * Matte skin material for heads and hands. The head carries vertex colours (hair, brows, lips,
 * beard shadow) that multiply this albedo, so always use `vertexColors: true` (default here).
 * The procedural bump is kept very low: skin must read smooth, not like stucco.
 */
export function skinMaterial(tone = 0xc9967a, o: { name?: string } = {}): THREE.Material {
  return M.skin(tone, {
    vertexColors: true,
    bump: 0,
    colorVar: 0.03,
    varScale: 30,
    roughness: 0.62,
    sheen: 0.18,
    cavity: 0.25,
    name: o.name ?? `human-skin-${tone.toString(16)}`,
  });
}

/** Eyeball material (vertex-coloured sclera / iris / pupil, slightly glossy). */
export function eyeMaterial(): THREE.Material {
  return M.surface({ color: 0xffffff, vertexColors: true, roughness: 0.25, name: 'human-eye' });
}

// ------------------------------------------------------------------ spec

/** A rigid gear piece placed with `fit.mountFrame(mount, { piece, ...options })`. */
export interface GearPlacement {
  piece: GearPiece;
  /** Mount (default piece.mount). */
  mount?: GearMount;
  /** Options for mountFrame (angle, height, roll, gap, swing...). `piece` is filled in. */
  options?: Omit<MountOptions, 'piece'>;
  /** Extra transform in GEAR-LOCAL space applied after mounting (fine-tuning). */
  local?: THREE.Matrix4;
  /** Or an explicit asset-space matrix (skips mountFrame). */
  matrix?: THREE.Matrix4;
}

/** A strap (webbing, sling over the shoulder, Y-strap...) drawn over the clothed surface. */
export interface StrapSpec {
  /** Control points (asset space) the strap passes near; they are projected onto the surface. */
  points: THREE.Vector3[];
  width: number;
  /** Default 0.003. */
  thickness?: number;
  material: THREE.Material;
  /** Distance of the strap's centre from the surface (m), default thickness / 2 + 0.0008. */
  offset?: number;
  closed?: boolean;
  /** 0..1: how taut (bridges hollows), default 0.5. */
  tension?: number;
  name?: string;
}

export interface SoldierSpec {
  uniform: UniformSpec;
  pose: PoseId;
  weapon?: WeaponModel | null;
  /** Barefoot stature (m), default 1.76. */
  stature?: number;
  /** Weapon sling: false = none; default: built by the weapon's sling builder, slack auto-reduced to clear the body. */
  sling?: false | { slack?: number };
  /** Belt used by the fitting API (defaults from the uniform: height, 45 mm wide, 4 mm thick). */
  belt?: Partial<BeltSpec>;
  gear?: GearPlacement[];
  straps?: StrapSpec[];
  /** Pose tweaks (see poses.ts): stance, grips, hand options, weapon offset. */
  poseOverrides?: Omit<PoseOverrides, 'clearance'>;
  /** Extra weapon clearance field (e.g. pouches on the belt front), asset space. */
  clearance?: SDF;
  /** Mesh resolution / budgets for the uniform. */
  lod?: Partial<UniformLOD>;
  /** 'high' (default) or 'low' (coarser uniform meshes, ~half the triangles). */
  detail?: 'high' | 'low';
  /** Called after the figure is assembled: return extra objects (asset space) to add. */
  decorate?: (ctx: SoldierBuild) => THREE.Object3D[] | void;
}

export interface SoldierBuild {
  /** Everything in asset space. Child names: uniform part names, 'head', 'eye', 'hand-r', 'hand-l', 'weapon', 'sling', 'gear:<id>', 'strap:<name>'. */
  object: THREE.Group;
  pose: SolvedPose;
  body: BodyModel;
  uniform: UniformBuild;
  fit: Fit;
  /** Weapon-local -> asset space (null without a weapon). */
  weaponMatrix: THREE.Matrix4 | null;
  /** Build time of this call (ms), whether the heavy meshes came from the cache, triangles, and the per-stage timings of the (first) heavy build. */
  stats: { ms: number; cached: boolean; triangles: number; timings: Record<string, number> };
  /** Bare body mesh (garment base; review only, meshed on demand). */
  bodyGeometry(): THREE.BufferGeometry;
}

// ------------------------------------------------------------------ cache

interface Heavy {
  pose: SolvedPose;
  body: BodyModel;
  uniform: UniformBuild;
  fit: Fit;
  head: THREE.Mesh[];
  hands: THREE.Mesh[];
  slingSlack: number;
  timings: Record<string, number>;
  bodyGeo?: THREE.BufferGeometry;
}
const cache = new Map<string, Heavy>();
const CACHE_MAX = 24;

function gripSig(w: WeaponModel | null | undefined): string {
  if (!w) return 'none';
  const r = (v: THREE.Vector3) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
  const g = w.grips;
  return `${w.id}:${r(g.trigger.position)}/${r(g.trigger.axis)}/${r(g.support.position)}/${r(g.support.axis)}/${w.length.toFixed(3)}`;
}

function triangles(o: THREE.Object3D): number {
  let n = 0;
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry;
    n += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
  });
  return n;
}

// ------------------------------------------------------------------ build

function buildHeavy(spec: SoldierSpec, key: string): Heavy {
  const T: Record<string, number> = {};
  let tt = performance.now();
  const lap = (name: string) => { const n = performance.now(); T[name] = (T[name] ?? 0) + (n - tt); tt = n; };
  const stature = spec.stature ?? DEFAULT_BODY.stature;
  const params: BodyParams = { stature, lift: footwearLift(spec.uniform.footwear, stature) };
  const weapon = spec.weapon ?? null;
  const ov: PoseOverrides = { ...(spec.poseOverrides ?? {}) };
  if (weapon && spec.pose !== 'stand') {
    // pass 1: the stance fixes the trunk; use its clothed torso to keep the weapon clear of the body
    const sp0 = solvePose(spec.pose, weapon, params, ov);
    const f0 = uniformFields(spec.uniform, bodyModel(sp0.sk));
    const extra = spec.clearance;
    ov.clearance = extra
      ? (x, y, z) => Math.min(f0.tunicTorso(x, y, z), f0.trousers(x, y, z), extra(x, y, z))
      : (x, y, z) => Math.min(f0.tunicTorso(x, y, z), f0.trousers(x, y, z));
  }
  lap('pass1');
  const pose = solvePose(spec.pose, weapon, params, ov);
  const body = bodyModel(pose.sk);
  lap('pose');
  const lodBase: UniformLOD = spec.detail === 'low'
    ? { ...DEFAULT_LOD, tunic: DEFAULT_LOD.tunic * 1.4, trousers: DEFAULT_LOD.trousers * 1.4, boots: DEFAULT_LOD.boots * 1.3, budget: { tunic: 15000, trousers: 7000, boots: 2500, detail: 900 } }
    : DEFAULT_LOD;
  const lod: UniformLOD = { ...lodBase, ...(spec.lod ?? {}), budget: { ...lodBase.budget, ...(spec.lod?.budget ?? {}) } };
  const uniform = buildUniform(spec.uniform, body, lod);
  const fit = createFit(body, uniform.fields, spec.belt);
  const sk = pose.sk;
  lap('uniform');

  // head + eyes
  const skinHex = spec.uniform.skin?.tone ?? 0xc9967a;
  const hairHex = spec.uniform.skin?.hair ?? 0x3a2c22;
  const skin = skinMaterial(skinHex);
  const hm = frameToMatrix(sk.head);
  const head: THREE.Mesh[] = [];
  const hmesh = new THREE.Mesh(headGeometry(skinHex, hairHex), skin);
  hmesh.applyMatrix4(hm);
  hmesh.name = 'head';
  head.push(hmesh);
  for (const m of [1, -1]) {
    const e = new THREE.Mesh(eyeGeometry(), eyeMaterial());
    e.position.set(m * EYE.x, EYE.y, EYE.z);
    e.applyMatrix4(hm);
    e.name = 'eye';
    head.push(e);
  }
  lap('head');

  // hands
  const hands: THREE.Mesh[] = [];
  for (const side of SIDES as Side[]) {
    const a = sk.arm[side];
    const fore = a.elbow.clone().sub(a.wrist).normalize();
    const use = pose.hands[side];
    if (use.kind === 'grip' && pose.weaponMatrix) {
      const inv = new THREE.Matrix3().setFromMatrix4(pose.weaponMatrix).invert();
      const h = gripHand(use.grip, side, skin, { ...use.opts, forearm: fore.clone().applyMatrix3(inv).normalize() });
      h.mesh.applyMatrix4(pose.weaponMatrix);
      hands.push(h.mesh);
    } else {
      hands.push(relaxedHand(side, a.hand, skin, { forearm: fore, curl: use.kind === 'relaxed' ? use.curl : 1 }).mesh);
    }
  }

  lap('hands');
  // sling slack that clears the body
  let slingSlack = 0;
  if (weapon?.sling && pose.weaponMatrix && spec.sling !== false) {
    slingSlack = chooseSlack(weapon, pose.weaponMatrix, uniform.fields.clothed, spec.sling ? spec.sling.slack : undefined);
  }
  lap('sling');
  void key;
  return { pose, body, uniform, fit, head, hands, slingSlack, timings: T };
}

/** Largest sling slack (<= wanted) whose sling does not enter the clothed body. */
function chooseSlack(w: WeaponModel, wm: THREE.Matrix4, clothed: SDF, wanted = 0.12): number {
  const inv = new THREE.Matrix3().setFromMatrix4(wm).invert();
  const g = V(0, -1, 0).applyMatrix3(inv).normalize();
  const v = V();
  for (const slack of [wanted, wanted * 0.66, wanted * 0.4, wanted * 0.22, wanted * 0.1, 0.004]) {
    const o = w.sling!.build(g, slack);
    o.updateMatrixWorld(true);
    let ok = true;
    o.traverse((c) => {
      const m = c as THREE.Mesh;
      if (!ok || !m.isMesh) return;
      const p = m.geometry.attributes.position;
      const step = Math.max(1, Math.floor(p.count / 300));
      for (let i = 0; i < p.count && ok; i += step) {
        v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).applyMatrix4(wm);
        if (clothed(v.x, v.y, v.z) < 0.002) ok = false;
      }
    });
    if (ok) return slack;
  }
  return 0.004;
}

/**
 * Build a soldier. Returns the assembled group plus the pose, body, uniform fields and the fitting
 * API (for authors who add more parts themselves). See README.md in this folder.
 */
export function buildSoldier(spec: SoldierSpec): SoldierBuild {
  const t0 = performance.now();
  const stature = spec.stature ?? DEFAULT_BODY.stature;
  const lodKey = spec.detail === 'low' ? 'low' : 'high';
  const key = `${spec.pose}|${spec.uniform.id}|${stature.toFixed(3)}|${gripSig(spec.weapon)}|${lodKey}|${JSON.stringify(spec.lod ?? {})}|${spec.poseOverrides ? JSON.stringify(spec.poseOverrides, (_k, v) => (v instanceof THREE.Matrix4 ? v.elements : v)) : ''}|${spec.clearance ? 'c' : ''}|${JSON.stringify(spec.belt ?? {})}`;
  let heavy = cache.get(key);
  const cached = !!heavy;
  if (!heavy) {
    heavy = buildHeavy(spec, key);
    cache.set(key, heavy);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  }
  const H = heavy;
  const root = new THREE.Group();
  root.name = 'soldier';
  const addClone = (m: THREE.Mesh) => {
    const c = new THREE.Mesh(m.geometry, m.material);
    c.name = m.name;
    c.matrix.copy(m.matrix);
    c.matrix.decompose(c.position, c.quaternion, c.scale);
    root.add(c);
  };
  for (const m of H.uniform.parts) addClone(m);
  for (const m of H.head) addClone(m);
  for (const m of H.hands) addClone(m);

  // weapon + sling
  const wm = H.pose.weaponMatrix;
  if (spec.weapon && wm) {
    const wo = spec.weapon.object.clone(true);
    wo.name = 'weapon';
    const holder = new THREE.Group();
    holder.name = 'weapon';
    holder.add(wo);
    if (spec.weapon.sling && spec.sling !== false) {
      const inv = new THREE.Matrix3().setFromMatrix4(wm).invert();
      const g = V(0, -1, 0).applyMatrix3(inv).normalize();
      const sl = spec.weapon.sling.build(g, H.slingSlack);
      sl.name = 'sling';
      holder.add(sl);
    }
    holder.applyMatrix4(wm);
    remapWoodGrain(holder, wm);
    root.add(holder);
  }

  const out: SoldierBuild = {
    object: root,
    pose: H.pose,
    body: H.body,
    uniform: H.uniform,
    fit: H.fit,
    weaponMatrix: wm ? wm.clone() : null,
    stats: { ms: 0, cached, triangles: 0, timings: H.timings },
    bodyGeometry: () => {
      if (!H.bodyGeo) {
        const sk = H.pose.sk;
        const b = new THREE.Box3();
        for (const side of SIDES as Side[]) {
          const a = sk.arm[side];
          b.expandByPoint(a.wrist).expandByPoint(a.shoulder).expandByPoint(a.elbow);
        }
        b.expandByPoint(sk.neck.o.clone().add(V(0, 0.15, 0))).expandByPoint(V(0, 0, 0));
        b.expandByScalar(0.14);
        b.min.y = 0;
        H.bodyGeo = simplify(meshSDF(H.body.full, { min: b.min.toArray() as [number, number, number], max: b.max.toArray() as [number, number, number] }, 0.006, { project: 1 }), 40000, { maxError: 0.002 });
      }
      return H.bodyGeo;
    },
  };

  // gear
  for (const gp of spec.gear ?? []) {
    const mount = gp.mount ?? gp.piece.mount;
    const m = gp.matrix ? gp.matrix.clone() : H.fit.mountFrame(mount, { ...(gp.options ?? {}), piece: gp.piece });
    if (gp.local) m.multiply(gp.local);
    const o = gp.piece.object.clone(true);
    const holder = new THREE.Group();
    holder.name = `gear:${gp.piece.id}`;
    holder.add(o);
    holder.applyMatrix4(m);
    remapWoodGrain(holder, m);
    root.add(holder);
  }
  // straps
  (spec.straps ?? []).forEach((st, i) => {
    const t = st.thickness ?? 0.003;
    const path = H.fit.strapPath(st.points, st.offset ?? t / 2 + 0.0008, { closed: st.closed, tension: st.tension });
    const geo = strapGeometry(path.points, st.width, t, path.normals, { closed: st.closed, smooth: false });
    const mesh = new THREE.Mesh(geo, st.material);
    mesh.name = `strap:${st.name ?? i}`;
    root.add(mesh);
  });

  const extra = spec.decorate?.(out);
  if (extra) for (const o of extra) root.add(o);
  out.stats.ms = performance.now() - t0;
  out.stats.triangles = triangles(root);
  return out;
}

/**
 * Re-orient procedural wood grain after posing. `SurfaceParams.wood.axis` is given in the object
 * space of the baked root (for a weapon: weapon-local space), and the shader reads it as a uniform,
 * so a weapon (or gear piece) rotated into a pose would show the grain running across the stock.
 * For every mesh under `root` whose surface material has wood grain, swap in the same material with
 * the axis rotated by `rot` (M.surface is memoised: equal axes still share one draw call).
 */
export function remapWoodGrain(root: THREE.Object3D, rot: THREE.Matrix4): void {
  const m3 = new THREE.Matrix3().setFromMatrix4(rot);
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
  const swap = (mat: THREE.Material): THREE.Material => {
    const p = (mat.userData as { surface?: { params?: SurfaceParams } } | undefined)?.surface?.params;
    if (!p?.wood) return mat;
    const a = new THREE.Vector3(...p.wood.axis).applyMatrix3(m3).normalize();
    return M.surface({ ...p, wood: { ...p.wood, axis: [r4(a.x), r4(a.y), r4(a.z)] } });
  };
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
}

/** Drop all cached soldier meshes (e.g. after editing a uniform spec at runtime). */
export function clearSoldierCache(): void {
  cache.clear();
}
