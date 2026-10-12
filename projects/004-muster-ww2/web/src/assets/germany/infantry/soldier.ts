/**
 * German infantryman (Heer, 1943-44) assembly on the shared human base:
 *   buildSoldier(uniform M40, pose, weapon) + belt kit + Y-straps + carried equipment + headgear.
 *
 * Layout (standard 1939 pattern, seen from the soldier):
 *  - belt buckle at the front centre; ammunition pouches either side of it (K98 cartridge pouches
 *    for the rifleman, MP 40 magazine pouches for the squad leader); the MG 42 gunner carries a
 *    P38 holster on the left front and the MG tool pouch on the right front instead;
 *  - entrenching tool with the bayonet on the left hip, behind the left pouch;
 *  - bread bag on the right rear hip with the canteen hooked to its outer D-ring;
 *  - gas-mask canister hanging over the bread bag on the back, its sling over the left shoulder;
 *  - assault pack (A-frame) high on the back, hooked to the Y-straps' rear D-rings;
 *  - optional stick grenade tucked behind the belt next to the buckle;
 *  - M40 steel helmet with the chinstrap under the chin, or the M43 field cap.
 */
import * as THREE from 'three';
import { part, G } from '../../../core/kit';
import { buildSoldier, remapWoodGrain } from '../../shared/human/soldier';
import type { SoldierBuild } from '../../shared/human/soldier';
import type { PoseId } from '../../shared/human/poses';
import type { Fit } from '../../shared/human/fit';
import { headSDF } from '../../shared/human/head';
import type { SDF, Frame } from '../../shared/human/sdfx';
import type { WeaponModel, GearPiece } from '../../shared/contracts';
import { simplify } from '../../shared/human/simplify';
import { buildKar98k } from '../weapons/kar98k.model';
import { buildMp40 } from '../weapons/mp40.model';
import { buildMg42 } from '../weapons/mg42.model';
import { buildM40Helmet, buildStickGrenade, buildCanteen, buildEntrenchingTool, M24 } from '../gear';
import { frameBuckle } from '../gear/util';
import { DE_M40, POCKETS, collarPatches } from './uniform';
import { beltLine, wrapOnBelt, boxField, union, strapOn, bandField, projectTo, lineFrame, type BeltLine, type Wrapped } from './wrap';
import { beltParts, buildYStraps, strapGeo, STRAP } from './webbing';
import { k98Pouch, mp40Pouch, p38Holster, toolPouch } from './kit/pouches';
import { breadBag, gasMaskCanister, BREAD_BAG, CANISTER } from './kit/bags';
import { assaultPack } from './kit/aframe';
import { fieldCap } from './kit/cap';
import { F } from './geo';
import { U, consolidate } from './palette';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

export type Role = 'rifleman' | 'squad-leader' | 'machine-gunner';

export interface Kit {
  headgear: 'helmet' | 'cap';
  pack: boolean;
  gasmask: boolean;
  breadbag: boolean;
  shovel: boolean;
  grenade: boolean;
}

interface RoleSpec {
  pose: PoseId;
  weapon: () => WeaponModel;
}

const weaponCache = new Map<Role, WeaponModel>();
const ROLES: Record<Role, RoleSpec> = {
  rifleman: { pose: 'order-arms', weapon: () => buildKar98k({ detail: 'low' }) },
  'squad-leader': { pose: 'low-ready', weapon: () => buildMp40({ stock: 'extended', magazine: true }) },
  'machine-gunner': { pose: 'low-ready', weapon: () => buildMg42({ bipod: 'folded', drum: true, detail: 'low' }) },
};

/** Uniform mesh budgets: much of the tunic is covered by the belt kit. */
const LOD = { budget: { tunic: 13000, trousers: 6500, boots: 2600, detail: 800 } };

// ------------------------------------------------------------------ gear piece cache (built once, cloned per soldier)

const lightCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
/**
 * Decimate the larger meshes of a rigid piece (cached per source geometry): weld by position,
 * collapse edges within `maxError`, then re-crease the normals. The surface shader is UV-free,
 * so only positions and normals matter.
 */
function lighten(obj: THREE.Object3D, ratio: number, maxError = 0.0005): THREE.Object3D {
  obj.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    let g = lightCache.get(m.geometry);
    if (!g) {
      const srcG = m.geometry;
      const n0 = srcG.index ? srcG.index.count / 3 : srcG.attributes.position.count / 3;
      g = srcG;
      if (n0 >= 400 && !srcG.attributes.color) {
        const p = new THREE.BufferGeometry();
        p.setAttribute('position', srcG.attributes.position);
        if (srcG.index) p.setIndex(srcG.index);
        const welded = G.mergeVertices(p, 1e-5);
        const dec = simplify(welded, Math.max(200, Math.round(n0 * ratio)), { maxError, maxFlipDeg: 40 });
        const nd = dec.index ? dec.index.count / 3 : n0;
        if (nd < n0 * 0.92) g = G.crease(dec, 38);
      }
      lightCache.set(srcG, g);
    }
    m.geometry = g;
  });
  return obj;
}

const srcCache = new Map<string, THREE.Object3D>();
/** Build a kit source object once (decimated), return a clone (geometry shared). */
function src<T extends THREE.Object3D>(key: string, make: () => T, ratio = 1): THREE.Object3D {
  let o = srcCache.get(key);
  if (!o) {
    o = make();
    if (ratio < 1) lighten(o, ratio);
    srcCache.set(key, o);
  }
  return o.clone(true);
}

const pieceCache = new Map<string, GearPiece>();
let packSrc: ReturnType<typeof assaultPack> | null = null;
function piece(key: string, make: () => GearPiece, ratio = 1): GearPiece {
  let p = pieceCache.get(key);
  if (!p) {
    p = make();
    if (ratio < 1) lighten(p.object, ratio);
    consolidate(p.object);
    pieceCache.set(key, p);
  }
  return { ...p, object: p.object.clone(true) };
}

function weaponFor(role: Role): WeaponModel {
  let w = weaponCache.get(role);
  if (!w) {
    w = ROLES[role].weapon();
    lighten(w.object, 0.4, 0.0005);
    weaponCache.set(role, w);
  }
  return w;
}

const frameM = (f: Frame) => new THREE.Matrix4().makeBasis(f.x, f.y, f.z).setPosition(f.o);

/** Cloth + pocket patches (the uniform's pockets are separate meshes, not in the fit fields). */
function clothField(sol: SoldierBuild): SDF {
  const an = sol.uniform.anchors as Record<string, Frame>;
  const s = sol.fit.s;
  const obs: SDF[] = [sol.fit.field('torso')];
  for (const at of ['chest', 'skirt'] as const) {
    const P = POCKETS[at];
    for (const side of ['l', 'r']) {
      const fr = an[`pocket-${at}-${side}`];
      if (!fr) continue;
      const m = frameM(fr);
      const w = P.w * s, h = P.h * s;
      obs.push(boxField(m, [0, 0.003 * s, 0], [w / 2 + 0.004, h / 2 + 0.004, 0.0058], 0.002));
      // flap button
      const vb = h / 2 + 0.006 * s - P.flap * s + 0.013 * s;
      obs.push(boxField(m, [0, vb, 0.004], [0.0085, 0.0085, 0.0062], 0.004));
    }
  }
  return union(obs);
}

/** Front buttons and shoulder straps as obstacles (for straps laid over everything). */
function trimField(sol: SoldierBuild): SDF {
  const an = sol.uniform.anchors as Record<string, Frame>;
  const obs: SDF[] = [];
  for (const side of ['l', 'r']) {
    const fr = an[`shoulder-strap-${side}`];
    if (fr) {
      const m = frameM(fr);
      obs.push(boxField(m, [0, 0, 0.002], [0.028, 0.066, 0.0052], 0.002));
      obs.push(boxField(m, [0, 0.04, 0.004], [0.0085, 0.0085, 0.0065], 0.004));
    }
  }
  sol.object.children.forEach((c) => {
    if (!/^front-button/.test(c.name)) return;
    const b = new THREE.Box3().setFromObject(c);
    const ctr = b.getCenter(V()), sz = b.getSize(V());
    const r = Math.max(sz.x, sz.y, sz.z) / 2 + 0.002;
    obs.push((x, y, z) => Math.hypot(x - ctr.x, y - ctr.y, z - ctr.z) - r);
  });
  return union(obs);
}

/** Subsampled vertices of an object (object space), for penetration tests of rigid pieces. */
function samplesOf(obj: THREE.Object3D, max = 500): THREE.Vector3[] {
  obj.updateMatrixWorld(true);
  const all: THREE.Vector3[] = [];
  let count = 0;
  obj.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) count += m.geometry.attributes.position.count;
  });
  const step = Math.max(1, Math.floor(count / max));
  let k = 0;
  obj.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++, k++) if (k % step === 0) all.push(V().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld));
  });
  return all;
}

function penetration(pts: THREE.Vector3[], m: THREE.Matrix4, f: SDF, gap: number, filter?: (q: THREE.Vector3) => boolean): number {
  let pen = 0;
  const w = V();
  for (const q of pts) {
    if (filter && !filter(q)) continue;
    w.copy(q).applyMatrix4(m);
    const d = gap - f(w.x, w.y, w.z);
    if (d > pen) pen = d;
  }
  return pen;
}

/** Rigid placement on the belt: frame at s (x along the belt), bottom swung out to rest on `field`, pushed out to clear. */
function rigidOnBelt(obj: THREE.Object3D, line: BeltLine, s: number, field: SDF, o: { y?: number; gap?: number; roll?: number; swing?: boolean } = {}): THREE.Matrix4 {
  const base = line.frameAt(s);
  if (o.y) base.multiply(new THREE.Matrix4().makeTranslation(0, o.y, 0));
  if (o.roll) base.multiply(new THREE.Matrix4().makeRotationZ(o.roll * D2R));
  const gap = o.gap ?? 0.0008;
  const pts = samplesOf(obj);
  const below = (q: THREE.Vector3) => q.y < -0.03;
  let m = base.clone();
  if (o.swing !== false) {
    const tilted = (a: number) => base.clone().multiply(new THREE.Matrix4().makeRotationX(-a));
    if (penetration(pts, tilted(0), field, gap, below) > 0) {
      let lo = 0, hi = 45 * D2R;
      for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (penetration(pts, tilted(mid), field, gap, below) > 0) lo = mid; else hi = mid; }
      m = tilted(hi);
    }
  }
  const pen = penetration(pts, m, field, gap);
  if (pen > 0) m.multiply(new THREE.Matrix4().makeTranslation(0, 0, pen + 1e-4));
  return m;
}

function placed(obj: THREE.Object3D, m: THREE.Matrix4, name: string): THREE.Object3D {
  const h = new THREE.Group();
  h.add(obj);
  consolidate(h);
  h.applyMatrix4(m);
  h.name = name;
  return h;
}

function pieceOf(k: 'helmet' | 'grenade' | 'shovel' | 'canteen'): GearPiece {
  if (k === 'helmet') return piece(k, () => buildM40Helmet({ chinstrap: 'none', detail: 'low' }), 0.5);
  if (k === 'grenade') return piece(k, () => buildStickGrenade(), 0.6);
  if (k === 'shovel') return piece(k, () => buildEntrenchingTool({ bayonet: true }), 0.35);
  return piece(k, () => buildCanteen(), 0.3);
}

// ------------------------------------------------------------------ headgear

function helmetParts(fit: Fit): THREE.Object3D[] {
  const hf = fit.headFrame({ tilt: 0, lift: 0 });
  const piece = pieceOf('helmet');
  const out: THREE.Object3D[] = [placed(piece.object, hf.band, 'gear:helmet')];
  // chinstrap: from the liner lugs down the cheeks and under the chin (head-local routing)
  const lugs = (piece.strapAnchors ?? []).slice(0, 2);
  if (lugs.length === 2) {
    const toHead = hf.head.clone().invert().multiply(hf.band);
    const hs = headSDF();
    const L = lugs.map((p) => p.clone().applyMatrix4(toHead));
    const sd = L[0].x > 0 ? 1 : -1;
    const left = sd > 0 ? L[0] : L[1], right = sd > 0 ? L[1] : L[0];
    const ctrl = [
      left.clone().add(V(-0.002, -0.004, 0)),
      V(0.07, -0.03, 0.02),
      V(0.056, -0.08, 0.042),
      V(0.028, -0.108, 0.058),
      V(0, -0.114, 0.061),
      V(-0.028, -0.108, 0.058),
      V(-0.056, -0.08, 0.042),
      V(-0.07, -0.03, 0.02),
      right.clone().add(V(0.002, -0.004, 0)),
    ];
    const l = strapOn(hs, ctrl, 0.0022, { tension: 0.6, step: 0.006, pinStart: true, pinEnd: true });
    for (let i = 0; i < l.points.length; i++) {
      l.points[i].applyMatrix4(hf.head);
      l.normals[i].transformDirection(hf.head);
      l.tangents[i].transformDirection(hf.head);
    }
    out.push(part(strapGeo(l, 0.015, 0.0022), U.belt(), { name: 'chinstrap' }));
    // small frame buckle on the left cheek
    const mb = lineFrame(l, 0.09);
    const bk = frameBuckle(0.016, 0.012, 0.0011, true);
    bk.translate(0, 0, 0.0026);
    bk.applyMatrix4(mb);
    out.push(part(bk, U.hardware()));
  }
  return out;
}

function capParts(fit: Fit): THREE.Object3D[] {
  const hf = fit.headFrame({ tilt: 2, lift: -0.004 });
  return [placed(fieldCap(), hf.band, 'gear:cap')];
}

// ------------------------------------------------------------------ build

interface Layout {
  line: BeltLine;
  /** Arc positions (m from the front centre, + = left). */
  s: Record<string, number>;
}

function beltLayout(role: Role, kit: Kit, L: number): Record<string, number> {
  const buckle = 0.032, gap = 0.009;
  const gS = 0.058 * (role === 'machine-gunner' ? -1 : 1);
  const s: Record<string, number> = {};
  if (kit.grenade) s.grenade = gS;
  const startL = kit.grenade && gS > 0 ? gS + M24.handleR + 0.006 : buckle + gap;
  const startR = kit.grenade && gS < 0 ? -gS + M24.handleR + 0.006 : buckle + gap;
  if (role === 'rifleman') {
    const half = 0.097;
    s.pouchL = startL + half;
    s.pouchR = -(startR + half);
    s.frontEndL = s.pouchL + half;
    s.frontEndR = -s.pouchR + half;
  } else if (role === 'squad-leader') {
    const half = 0.075;
    s.pouchL = startL + half;
    s.pouchR = -(startR + half);
    s.frontEndL = s.pouchL + half;
    s.frontEndR = -s.pouchR + half;
  } else {
    // holster (grip forward) on the left front, tool pouch on the right front
    s.holster = startL + 0.012 + 0.1;
    s.pouchR = -(startR + 0.068);
    s.frontEndL = s.holster + 0.09;
    s.frontEndR = -s.pouchR + 0.068;
  }
  // bread bag behind the right hip, entrenching tool behind the left hip
  s.bag = -Math.min(L / 2 - 0.035 - BREAD_BAG.w / 2 + 0.06, s.frontEndR + 0.02 + BREAD_BAG.w / 2);
  s.shovel = s.frontEndL + 0.02 + 0.075;
  return s;
}

export interface InfantryBuild {
  object: THREE.Group;
  stats: { ms: number; soldierMs: number; kitMs: number; triangles: number; cached: boolean };
}

export function buildInfantry(role: Role, kit: Kit): InfantryBuild {
  const t0 = performance.now();
  const R = ROLES[role];
  const weapon = weaponFor(role);
  let kitMs = 0;
  const sol = buildSoldier({
    uniform: DE_M40,
    pose: R.pose,
    weapon,
    lod: LOD,
    decorate: (sb) => {
      const tk = performance.now();
      const out = equip(sb, role, kit);
      kitMs = performance.now() - tk;
      return out;
    },
  });
  sol.object.name = `de-${role}`;
  let tris = 0;
  const by: Record<string, number> = {};
  const mats = new Set<string>();
  for (const ch of sol.object.children) {
    let n = 0;
    ch.traverse((c) => {
      const m = c as THREE.Mesh;
      if (!m.isMesh) return;
      n += m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3;
      mats.add((m.material as THREE.Material).name || (m.material as THREE.Material).uuid);
    });
    const key = ch.name ? ch.name.replace(/-(l|r|\d+)$/, '') : '(kit)';
    by[key] = (by[key] ?? 0) + n;
    tris += n;
  }
  return { object: sol.object, stats: { ms: performance.now() - t0, soldierMs: sol.stats.ms - kitMs, kitMs, triangles: tris, cached: sol.stats.cached } };
}

function equip(sol: SoldierBuild, role: Role, kit: Kit): THREE.Object3D[] {
  const fit = sol.fit;
  const out: THREE.Object3D[] = [];
  const cloth = clothField(sol);
  // belt line (rides over a grenade handle tucked behind it)
  const line0 = beltLine(fit);
  const s = beltLayout(role, kit, line0.L);
  const line = kit.grenade ? beltLine(fit, { bulges: [{ s: s.grenade, h: 2 * M24.handleR + 0.0012, w: M24.handleR * 0.7, blend: 0.03 }] }) : line0;
  out.push(...beltParts(line));
  out.push(...collarPatches(sol));

  // --- front of the belt
  const rings: { l: THREE.Vector3 | null; r: THREE.Vector3 | null } = { l: null, r: null };
  const frontBoxes: SDF[] = [];
  const addWrapped = (w: Wrapped, name: string) => {
    w.object.name = name;
    out.push(w.object);
  };
  if (role === 'rifleman' || role === 'squad-leader') {
    for (const side of ['l', 'r'] as const) {
      const obj = role === 'rifleman' ? src('k98', k98Pouch, 0.45) : src('mp40p', () => mp40Pouch(), 0.45);
      const w = wrapOnBelt(obj, line, { s0: side === 'l' ? s.pouchL : s.pouchR, field: cloth });
      addWrapped(w, `pouch-${side}`);
      const top = role === 'rifleman' ? 0.037 : 0.04;
      rings[side] = w.map(0, top, 0.0012);
      const h = role === 'rifleman' ? [0.047, 0.066] : [0.04, 0.29];
      const yc = role === 'rifleman' ? -0.013 : -0.1;
      for (const x of role === 'rifleman' ? [-0.064, 0, 0.064] : [-0.05, 0, 0.05]) {
        frontBoxes.push(boxField(w.frame(x, yc), [0, 0, 0.02], [0.033, h[1] / 2 + 0.004, 0.024], 0.006));
      }
    }
  } else {
    const hol = wrapOnBelt(src('p38', p38Holster, 0.7), line, { s0: s.holster, field: cloth, mirror: true });
    addWrapped(hol, 'holster');
    frontBoxes.push(boxField(hol.frame(0, -0.01), [0, 0, 0.022], [0.1, 0.05, 0.028], 0.008));
    const tp = wrapOnBelt(src('tool', toolPouch, 0.7), line, { s0: s.pouchR, field: cloth });
    addWrapped(tp, 'tool-pouch');
    rings.r = tp.map(0, 0.035, 0.0012);
    frontBoxes.push(boxField(tp.frame(0, -0.014), [0, 0, 0.02], [0.068, 0.05, 0.026], 0.008));
  }

  // --- stick grenade tucked behind the belt
  if (kit.grenade) {
    const g = pieceOf('grenade');
    const b = line0.at(s.grenade);
    // handle back on the cloth: find the cloth surface behind the belt centre line
    const p = b.p.clone().addScaledVector(b.n, -line0.thickness / 2);
    projectTo(fit.field('torso'), p, 0.0008, 8);
    let m = new THREE.Matrix4().makeBasis(b.t, b.u, b.n).setPosition(p);
    // tilt the top out until the head clears the chest
    const head: THREE.Vector3[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      head.push(V(Math.cos(a) * M24.headR, 0.07 + 0.04 * (i % 3) / 2, M24.handleR + Math.sin(a) * M24.headR));
    }
    const f = cloth;
    for (let k = 0; k <= 24; k++) {
      const mm = m.clone().multiply(new THREE.Matrix4().makeRotationX(-(k * 1.0) * D2R));
      let ok = true;
      for (const q of head) { const w = q.clone().applyMatrix4(mm); if (f(w.x, w.y, w.z) < 0.001) { ok = false; break; } }
      if (ok) { m = mm; break; }
      if (k === 24) m = mm;
    }
    const h = placed(g.object, m, 'gear:grenade');
    remapWoodGrain(h, m);
    out.push(h);
  }

  // --- Y-straps
  const ys = buildYStraps({ fit, line, field: cloth, front: rings });
  out.push(...ys.objects);

  // --- entrenching tool + bayonet on the left hip
  if (kit.shovel) {
    const piece = pieceOf('shovel');
    const m = rigidOnBelt(piece.object, line, s.shovel, union([cloth, ...frontBoxes]));
    const h = placed(piece.object, m, 'gear:shovel');
    remapWoodGrain(h, m);
    out.push(h);
  }

  // --- bread bag (right rear) + canteen on its outer D-ring
  let bagW: Wrapped | null = null;
  let bagObs: SDF | null = null;
  let bagFront = 0;
  const up = line.up.clone();
  if (kit.breadbag) {
    const bb = breadBag();
    bagW = wrapOnBelt(bb.obj, line, { s0: s.bag, field: cloth });
    addWrapped(bagW, 'bread-bag');
    bagFront = bb.front;
    bagObs = bagField(bagW, -BREAD_BAG.w / 2, BREAD_BAG.w / 2, BREAD_BAG.yTop - BREAD_BAG.h, BREAD_BAG.yTop, bagFront);
    const ring = bb.rings[1];
    const cp = pieceOf('canteen');
    const m = bagW.frame(ring.x, ring.y, bb.front + 0.0045);
    const mc = plumb(V().setFromMatrixPosition(m), V().setFromMatrixColumn(m, 0), up, V().setFromMatrixColumn(m, 2));
    const mFinal = settle(cp.object, mc, union([cloth, bagObs]));
    const h = placed(cp.object, mFinal, 'gear:canteen');
    remapWoodGrain(h, mFinal);
    out.push(h);
  }

  // --- gas-mask canister on the back over the bread bag, sling over the left shoulder
  let canTop: THREE.Vector3 | null = null;
  if (kit.gasmask) {
    const gc = gasMaskCanister();
    const yTop = 0.034;
    const cx = -0.058;
    let m: THREE.Matrix4;
    if (bagW) m = bagW.frame(cx, yTop, bagFront + 0.004);
    else m = line.frameAt(s.bag + cx).multiply(new THREE.Matrix4().makeTranslation(0, yTop, 0.004));
    // hang from the top: the canister's origin is at the middle of its back line
    const hang = new THREE.Group();
    hang.add(gc.obj);
    gc.obj.position.set(0, -CANISTER.L / 2, 0);
    const mc0 = plumb(V().setFromMatrixPosition(m), V().setFromMatrixColumn(m, 0), up, V().setFromMatrixColumn(m, 2));
    const mc = settle(hang, mc0, bagObs ? union([cloth, bagObs]) : cloth);
    out.push(placed(hang, mc, 'gear:gasmask'));
    canTop = gc.top.clone().add(gc.obj.position).applyMatrix4(mc);
    // sling: canister top bracket -> across the back -> over the left shoulder -> across the chest -> right side -> canister
    const trim = trimField(sol);
    const over = union([cloth, ys.bands, trim, ...frontBoxes]);
    const P = (a: number, h: number, e = 0) => fit.surfacePoint({ angle: a, height: h, elevation: e }).position;
    const back = (x0: number, y: number) => fit.surfacePoint({ from: V(x0, y, -0.6), dir: V(0, 0, 1) }).position;
    const front = (x0: number, y: number) => fit.surfacePoint({ from: V(x0, y, 0.6), dir: V(0, 0, -1) }).position;
    const start = canTop.clone().add(V(0, 0.012, 0));
    const ctrl = [
      start,
      back(-0.04, 1.16),
      back(0.05, 1.3),
      back(0.11, 1.42),
      P(76, 1.47, 46),
      front(0.13, 1.36),
      front(0.02, 1.25),
      front(-0.1, 1.15),
      P(-100, 1.1),
      P(-128, 1.08),
      canTop.clone().add(V(0, 0.004, 0)),
    ];
    const sl = strapOn(over, ctrl, 0.0026, { tension: 0.5, step: 0.01, pinStart: true, pinEnd: true });
    out.push(part(strapGeo(sl, 0.02, 0.0022), U.webbing(), { name: 'gasmask-sling' }));
    void bandField;
  }

  // --- assault pack on the upper back
  if (kit.pack) {
    if (!packSrc) { packSrc = assaultPack(); lighten(packSrc.object, 0.5); }
    const ap = { ...packSrc, object: packSrc.object.clone(true) };
    const hit = fit.surfacePoint({ angle: 180, height: 1.27 });
    const up = fit.trunkUp(1.3);
    const z = hit.normal.clone();
    const y = up.clone().addScaledVector(z, -up.dot(z)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z).normalize();
    const ringsY = (ys.rearRings.l.y + ys.rearRings.r.y) / 2;
    const base = new THREE.Matrix4().makeBasis(x, y, z).setPosition(hit.position.clone().addScaledVector(y, ringsY - 0.035 - 0.13 - hit.position.y));
    const f = union([cloth, ys.bands]);
    const mp = fitBack(ap.object, base, f);
    out.push(placed(ap.object, mp, 'gear:assault-pack'));
    // link straps from the top of the legs to the Y-strap rear D-rings, hooks on the rings
    const lea = U.belt();
    for (const [i, key] of [[0, 'r'], [1, 'l']] as const) {
      const a = ap.hooks[i].clone().applyMatrix4(mp);
      const ringP = ys.rearRings[key];
      // pick the ring on the same side as the hook
      const rp = Math.sign(ringP.x) === Math.sign(a.x) ? ringP : ys.rearRings[key === 'l' ? 'r' : 'l'];
      const n = z.clone();
      const pts = [a, a.clone().lerp(rp, 0.5).addScaledVector(n, 0.004), rp.clone().add(V(0, -0.006, 0))];
      const sp = { points: pts, normals: [n, n, n], tangents: [] as THREE.Vector3[] };
      out.push(part(strapGeo(sp, 0.016, 0.0024), lea, { name: `pack-link-${key}` }));
      const hk = F.tube([rp.clone().add(V(0, -0.012, 0)).addScaledVector(n, 0.003), rp.clone().add(V(0, 0.002, 0)).addScaledVector(n, 0.003), rp.clone().add(V(0, 0.004, 0)).addScaledVector(n, -0.001)], 0.0016, 6, 10);
      out.push(part(hk, U.hardware()));
    }
  }

  // --- headgear
  out.push(...(kit.headgear === 'cap' ? capParts(fit) : helmetParts(fit)));
  void STRAP;
  return out;
}

/**
 * Hang a rigid piece plumb from its frame origin (the hanging point), then swing its bottom about
 * the frame's x axis: out until nothing penetrates `f`, or in (max 12 deg) until it rests on it.
 */
function settle(obj: THREE.Object3D, m: THREE.Matrix4, f: SDF): THREE.Matrix4 {
  const pts = samplesOf(obj, 400);
  const gap = 0.0008;
  const rot = (a: number) => m.clone().multiply(new THREE.Matrix4().makeRotationX(-a));
  if (penetration(pts, rot(0), f, gap) > 0) {
    let lo = 0, hi = 40 * D2R;
    for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (penetration(pts, rot(mid), f, gap) > 0) lo = mid; else hi = mid; }
    const out = rot(hi);
    const p2 = penetration(pts, out, f, gap);
    if (p2 > 0) out.multiply(new THREE.Matrix4().makeTranslation(0, 0, p2 + 1e-4));
    return out;
  }
  let lo = -12 * D2R, hi = 0;
  if (penetration(pts, rot(lo), f, gap) === 0) return rot(lo);
  for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (penetration(pts, rot(mid), f, gap) > 0) lo = mid; else hi = mid; }
  return rot(hi);
}

/** Obstacle for a wrapped bag: one box per 3 cm column, following the curve. */
function bagField(w: Wrapped, x0: number, x1: number, y0: number, y1: number, depth: number): SDF {
  const fs: SDF[] = [];
  const n = Math.max(2, Math.round((x1 - x0) / 0.03));
  const hx = (x1 - x0) / n / 2 + 0.002;
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) * ((x1 - x0) / n);
    fs.push(boxField(w.frame(x, (y0 + y1) / 2), [0, 0, depth / 2], [hx, (y1 - y0) / 2, depth / 2], 0.006));
  }
  return union(fs);
}

/** Plumb frame through a point: keep the given x direction (made horizontal), y = up, z outward like `out`. */
function plumb(pos: THREE.Vector3, x: THREE.Vector3, up: THREE.Vector3, out: THREE.Vector3): THREE.Matrix4 {
  const z = new THREE.Vector3().crossVectors(x, up).normalize();
  if (z.dot(out) < 0) z.negate();
  const x2 = new THREE.Vector3().crossVectors(up, z).normalize();
  return new THREE.Matrix4().makeBasis(x2, up.clone(), z).setPosition(pos);
}

/** Fit a back-mounted piece: tilt about its x axis and push out so its back rests on `f` with minimal gap. */
function fitBack(obj: THREE.Object3D, base: THREE.Matrix4, f: SDF): THREE.Matrix4 {
  obj.updateMatrixWorld(true);
  // back-face samples: vertices close to the z = 0 plane
  const pts: THREE.Vector3[] = [];
  const v = V();
  obj.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    const p = mesh.geometry.attributes.position;
    const step = Math.max(1, Math.floor(p.count / 120));
    for (let i = 0; i < p.count; i += step) {
      v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      if (v.z < 0.012) pts.push(v.clone());
    }
  });
  let best: THREE.Matrix4 | null = null;
  let bestGap = Infinity;
  const w = V();
  for (let deg = -10; deg <= 12; deg += 2) {
    const m = base.clone().multiply(new THREE.Matrix4().makeRotationX(-deg * D2R));
    let pen = 0;
    for (const q of pts) { w.copy(q).applyMatrix4(m); const d = 0.001 - f(w.x, w.y, w.z); if (d > pen) pen = d; }
    // pull in if everything is clear
    let minD = Infinity;
    for (const q of pts) { w.copy(q).applyMatrix4(m); const d = f(w.x, w.y, w.z); if (d < minD) minD = d; }
    const shift = pen > 0 ? pen : -(minD - 0.001);
    m.multiply(new THREE.Matrix4().makeTranslation(0, 0, shift));
    let sum = 0;
    for (const q of pts) { w.copy(q).applyMatrix4(m); sum += Math.max(0, f(w.x, w.y, w.z)); }
    const mean = sum / Math.max(1, pts.length);
    if (mean < bestGap) { bestGap = mean; best = m; }
  }
  return best ?? base;
}
