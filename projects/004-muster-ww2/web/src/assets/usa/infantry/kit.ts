/**
 * US Army (1944) field kit fitted to a posed soldier (shared/human buildSoldier + the usa/gear
 * pieces, built in the low-detail gear mode):
 *  - the web belt built along the real waist (fit.beltPath): M1923 cartridge belt (rifleman),
 *    M1937 BAR belt (BAR gunner) or M1936 pistol belt with a Thompson magazine pouch (squad leader);
 *  - M1910 canteen in its cover and the M1942 first-aid pouch hung from the belt eyelets
 *    (swung out at the bottom to rest on the hip, never inside it);
 *  - either the M1928 haversack (with the pack carrier on the rifleman) - its own shoulder straps hook into the belt's
 *    top eyelets in front; M1 bayonet in the M7 scabbard on its left side, M1943 entrenching tool on
 *    its outer face) or the M1936 suspenders (squad leader and BAR gunner without the pack);
 *  - the M1 helmet with its web chinstrap buckled under the chin.
 * Straps are draped over the body AND over the belt / pouches beneath them (drape.ts).
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GearPiece } from '../../shared/contracts';
import { remapWoodGrain, type SoldierBuild } from '../../shared/human/soldier';
import { headSDF } from '../../shared/human/head';
import { simplify } from '../../shared/human/simplify';
import { gradient, type SDF } from '../../shared/human/sdfx';
import {
  buildM1Helmet,
  buildM1Chinstrap,
  M1_FIT,
  buildM1923BeltAlong,
  buildM1937BarBeltAlong,
  buildM1936PistolBeltAlong,
  buildM1910Canteen,
  buildFirstAidPouch,
  buildThompsonPouch,
  buildM1Bayonet,
  buildM1943EntrenchingTool,
  buildM1928Haversack,
  buildM1936SuspendersAlong,
  buildHaversackStrapsAlong,
  buildWebStrapAlong,
  ETOOL_CLEAR,
  BAYONET_CLEAR,
  M1923_BELT,
  M1937_BELT,
  POCKET_M1923,
  POCKET_M1937,
  withUSGearDetail,
  US,
  type BeltRig,
} from '../gear';
import { union, boxField, beltField, drape } from './drape';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

export type BeltKind = 'm1923' | 'm1937' | 'm1936';

export interface KitSpec {
  belt: BeltKind;
  haversack: boolean;
  /** Cache key of the body shape (pose + uniform): the belt is built along it. */
  bodyKey: string;
}

/** Belt spec passed to buildSoldier so fit.beltPath clears the cloth over the whole pocket panel. */
export const BELT_FIT: Record<BeltKind, { height: number; width: number; thickness: number }> = {
  m1923: { height: 1.03, width: 0.112, thickness: 0.0035 },
  m1937: { height: 1.03, width: 0.1, thickness: 0.0035 },
  m1936: { height: 1.03, width: 0.06, thickness: 0.0035 },
};

// ------------------------------------------------------------------ decimation / caching

const DROP = new Set([US.thread().name]);

function trisOf(g: THREE.BufferGeometry): number {
  return (g.index ? g.index.count : g.attributes.position.count) / 3;
}

/** Drop sewing thread and decimate every mesh under `obj` in proportion to about `target` triangles. */
export function leanObject(obj: THREE.Object3D, target: number, maxError = 0.0006): void {
  const meshes: THREE.Mesh[] = [];
  const drop: THREE.Object3D[] = [];
  let total = 0;
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (DROP.has((m.material as THREE.Material).name)) {
      drop.push(m);
      return;
    }
    meshes.push(m);
    total += trisOf(m.geometry);
  });
  for (const d of drop) d.removeFromParent();
  if (total <= target) return;
  const ratio = target / total;
  for (const m of meshes) {
    const n = trisOf(m.geometry);
    if (n < 160) continue;
    let g = m.geometry;
    if (!g.index) {
      const c = new THREE.BufferGeometry();
      c.setAttribute('position', g.attributes.position);
      if (g.attributes.normal) c.setAttribute('normal', g.attributes.normal);
      g = mergeVertices(c, 1e-5);
    }
    m.geometry = simplify(g, Math.max(120, Math.round(n * ratio)), { maxError });
  }
}

/** Triangle targets (and decimation tolerance) for the worn pieces. */
const LEAN: Record<string, [number, number]> = {
  helmet: [7000, 0.0005],
  canteen: [3200, 0.0007],
  firstaid: [1500, 0.0006],
  thompson: [2200, 0.0006],
  bayonet: [1500, 0.0005],
  etool: [3000, 0.0007],
  haversack: [9000, 0.0009],
  'haversack-body': [6000, 0.0009],
};

const pieces = new Map<string, GearPiece>();
function piece<T extends GearPiece>(key: string, make: () => T): T {
  let p = pieces.get(key) as T | undefined;
  if (!p) {
    p = withUSGearDetail('low', make);
    const ln = LEAN[key];
    if (ln) leanObject(p.object, ln[0], ln[1]);
    else leanObject(p.object, Infinity);
    p.object.updateMatrixWorld(true);
    pieces.set(key, p);
  }
  return p;
}

const boxes = new Map<string, THREE.Box3>();
function localBox(p: GearPiece): THREE.Box3 {
  let b = boxes.get(p.id);
  if (!b) {
    b = new THREE.Box3().setFromObject(p.object, true);
    boxes.set(p.id, b);
  }
  return b;
}

function place(obj: THREE.Object3D, m: THREE.Matrix4, name: string): THREE.Group {
  const holder = new THREE.Group();
  holder.name = `gear:${name}`;
  holder.add(obj.clone(true));
  holder.applyMatrix4(m);
  remapWoodGrain(holder, m);
  return holder;
}

// ------------------------------------------------------------------ belts (cached per body shape)

interface BeltBuild {
  rig: BeltRig;
  /** The belt band (incl. buckles) and its pockets as fields, for draping and mounting. */
  field: SDF;
}
const belts = new Map<string, BeltBuild>();

function buildBelt(sol: SoldierBuild, kind: BeltKind, key: string): BeltBuild {
  const k = `${key}|${kind}`;
  let b = belts.get(k);
  if (b) return b;
  const fit = sol.fit;
  const bp = fit.beltPath();
  const o = { path: bp.points, normals: bp.normals, inset: fit.belt.thickness / 2 };
  const rig = withUSGearDetail('low', () =>
    kind === 'm1923' ? buildM1923BeltAlong(o) : kind === 'm1937' ? buildM1937BarBeltAlong(o) : buildM1936PistolBeltAlong(o),
  );
  leanObject(rig.object, kind === 'm1936' ? 5000 : 16000, 0.0006);
  rig.object.updateMatrixWorld(true);
  // fields: the web band (thick enough for the rear adjusting buckles) + one box per pocket
  const up = fit.trunkUp(fit.belt.height);
  const fs: SDF[] = [beltField(bp, up, 0.06, fit.belt.thickness + 0.009)];
  if (kind !== 'm1936') {
    const B = kind === 'm1923' ? M1923_BELT : M1937_BELT;
    const P = kind === 'm1923' ? POCKET_M1923 : POCKET_M1937;
    const n = kind === 'm1923' ? 5 : 3;
    for (let i = 0; i < n; i++)
      for (const sd of [1, -1]) {
        const m = rig.frameAt(sd * (B.start + P.pitch * (i + 0.5)));
        fs.push(boxField(m, new THREE.Box3(V(-P.w / 2 - 0.002, P.yTop - P.h - 0.004, -0.002), V(P.w / 2 + 0.002, P.yTop + 0.012, P.d + 0.004)), 0.006));
      }
  }
  b = { rig, field: union(fs) };
  belts.set(k, b);
  if (belts.size > 24) belts.delete(belts.keys().next().value as string);
  return b;
}

// ------------------------------------------------------------------ hanging items

/**
 * Hang a piece from a belt slot (M1910 hanger): the part below the hooks swings out about the
 * slot's X axis until its back face clears `f` (the body below the belt), then the whole piece is
 * pushed out if anything still penetrates.
 */
function hangFrame(slot: THREE.Matrix4, p: GearPiece, f: SDF, gap = 0.0008, extraSwing = 0): THREE.Matrix4 {
  const b = localBox(p);
  const samples: THREE.Vector3[] = [];
  for (let j = 0; j <= 7; j++)
    for (let i = 0; i <= 6; i++) {
      const y = b.min.y + ((Math.min(-0.012, b.max.y) - b.min.y) * j) / 7;
      samples.push(V(b.min.x + ((b.max.x - b.min.x) * i) / 6, y, 0));
    }
  const w = V();
  const worst = (m: THREE.Matrix4) => {
    let pen = 0;
    for (const q of samples) {
      w.copy(q).applyMatrix4(m);
      const d = f(w.x, w.y, w.z) - gap;
      if (-d > pen) pen = -d;
    }
    return pen;
  };
  const tilted = (a: number) => slot.clone().multiply(new THREE.Matrix4().makeRotationX(-a));
  let a = 0;
  if (worst(slot) > 0) {
    let lo = 0, hi = 50 * D2R;
    if (worst(tilted(hi)) > 0) lo = hi;
    else for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (worst(tilted(mid)) > 0) lo = mid; else hi = mid; }
    a = hi;
  }
  let m = tilted(a + extraSwing * D2R);
  const pen = worst(m);
  if (pen > 0) m = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, pen + 1e-4));
  return m;
}

// ------------------------------------------------------------------ back pack

/** Seat the haversack: tilt about its X axis and push out so the back face rests on `f`. */
function packFrame(base: THREE.Matrix4, p: GearPiece, f: SDF): THREE.Matrix4 {
  const b = localBox(p);
  const samples: THREE.Vector3[] = [];
  for (let j = 0; j <= 12; j++) for (let i = 0; i <= 6; i++) samples.push(V(b.min.x * 0.9 + ((b.max.x - b.min.x) * 0.9 * i) / 6, b.min.y + ((b.max.y - 0.01 - b.min.y) * j) / 12, 0));
  const w = V();
  let best: { m: THREE.Matrix4; score: number } | null = null;
  for (let deg = -8; deg <= 24; deg += 1) {
    const m = base.clone().multiply(new THREE.Matrix4().makeRotationX(-deg * D2R));
    let pen = 0;
    const ds: number[] = [];
    for (const q of samples) {
      w.copy(q).applyMatrix4(m);
      const d = f(w.x, w.y, w.z);
      ds.push(d);
      if (-d > pen) pen = -d;
    }
    // after the push, the mean gap of the lower half (the roll rests on the seat) and the top
    let s = 0;
    for (const d of ds) s += Math.min(d + pen, 0.08);
    const score = s / ds.length;
    if (!best || score < best.score) best = { m: m.multiply(new THREE.Matrix4().makeTranslation(0, 0, pen + 0.0015)), score };
  }
  return best!.m;
}

// ------------------------------------------------------------------ helmet

let headField: SDF | null = null;

function helmet(sol: SoldierBuild): THREE.Object3D[] {
  const hf = sol.fit.headFrame({ tilt: -3, lift: -0.012 });
  const h = piece('helmet', () => buildM1Helmet({ chinstrap: 'none' }));
  const out: THREE.Object3D[] = [place(h.object, hf.band, 'us-m1-helmet')];
  // worn chinstrap: from the left bail, down the cheek, under the chin, up to the right bail
  const toHelmet = hf.band.clone().invert().multiply(hf.head); // head-local -> helmet-local
  const f = (headField ??= headSDF());
  const off = 0.0012;
  const g = V();
  const onSkin = (p: THREE.Vector3) => {
    for (let i = 0; i < 14; i++) {
      const d = f(p.x, p.y, p.z) - off;
      if (Math.abs(d) < 2e-5) break;
      gradient(f, p.x, p.y, p.z, 0.0008, g);
      p.addScaledVector(g, -d);
    }
    return p;
  };
  const bails = M1_FIT.bails;
  const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
  const side = (s: number) => [
    [0.066 * s, -0.035, 0.012],
    [0.058 * s, -0.068, 0.03],
    [0.041 * s, -0.093, 0.047],
  ];
  const mid: number[][] = [...side(1), [0, -0.108, 0.056], ...side(-1).reverse()];
  if (bails.length === 2) {
    pts.push(bails[0].clone().add(V(0.004, -0.004, 0)));
    nrm.push(V(1, 0, 0));
  }
  for (const [x, y, z] of mid) {
    const p = onSkin(V(x, y, z));
    gradient(f, p.x, p.y, p.z, 0.0008, g);
    pts.push(p.applyMatrix4(toHelmet));
    nrm.push(g.clone().transformDirection(toHelmet));
  }
  if (bails.length === 2) {
    pts.push(bails[1].clone().add(V(-0.004, -0.004, 0)));
    nrm.push(V(-1, 0, 0));
  }
  const strap = buildM1Chinstrap(pts, nrm, 0.66);
  out.push(place(strap, hf.band, 'us-m1-chinstrap'));
  return out;
}

// ------------------------------------------------------------------ the kit

export function fitKit(sol: SoldierBuild, k: KitSpec): THREE.Object3D[] {
  const fit = sol.fit;
  const out: THREE.Object3D[] = [];
  const torso = fit.field('torso');
  const sp = (angle: number, height: number) => fit.surfacePoint({ angle, height }).position;
  const shoulderTop = (x: number) => {
    const z = fit.axisPoint(1.46).z;
    return fit.surfacePoint({ from: V(x, 1.9, z), dir: V(0, -1, 0) }).position;
  };
  const posOf = (m: THREE.Matrix4) => new THREE.Vector3().setFromMatrixPosition(m);
  const upOf = (m: THREE.Matrix4) => V(0, 1, 0).transformDirection(m);

  // ---- belt
  const bb = buildBelt(sol, k.belt, k.bodyKey);
  const rig = bb.rig;
  out.push(place(rig.object, new THREE.Matrix4(), `belt-${k.belt}`));
  const fields: SDF[] = [torso, bb.field];
  const hipF = union([torso, bb.field]);

  const hang = (key: string, make: () => GearPiece, slot: THREE.Matrix4, extraSwing = 0) => {
    const p = piece(key, make);
    const m = hangFrame(slot, p, hipF, 0.0008, extraSwing);
    out.push(place(p.object, m, key));
    fields.push(boxField(m, localBox(p), 0.006));
    return m;
  };

  // ---- belt items per kind
  const L = rig.length;
  if (k.belt === 'm1923') {
    hang('canteen', () => buildM1910Canteen(), rig.slots.R5);
    hang('firstaid', () => buildFirstAidPouch(), rig.slots.L2);
  } else if (k.belt === 'm1937') {
    hang('canteen', () => buildM1910Canteen(), rig.slots['rear-R']);
    hang('firstaid', () => buildFirstAidPouch(), rig.slots['rear-L']);
  } else {
    const tp = piece('thompson', () => buildThompsonPouch());
    // loop pouch: swung out at the bottom over the jacket skirt (fitted against the body only - its
    // loop lies behind the belt)
    const m = hangFrame(rig.loopMount(0.1), tp, torso, 0.001);
    out.push(place(tp.object, m, 'thompson-pouch'));
    fields.push(boxField(m, localBox(tp), 0.006));
    const slotAt = (side: 'L' | 'R', d: number) => {
      let best = '', bd = Infinity;
      for (const n of Object.keys(rig.slots)) {
        if (!n.startsWith(side)) continue;
        const i = Number(n.slice(1));
        const dd = Math.abs(0.045 + 0.025 * (i - 1) + 0.025 - d);
        if (dd < bd) { bd = dd; best = n; }
      }
      return rig.slots[best];
    };
    hang('firstaid', () => buildFirstAidPouch(), slotAt('L', 0.25));
    hang('canteen', () => buildM1910Canteen(), slotAt('R', L / 2 - 0.1));
  }

  const W = 0.0028;
  const off = W / 2 + 0.0008;
  if (k.haversack) {
    // ---- M1928 haversack + pack carrier on the back
    // the pack carrier (blanket roll) would hang over the rear belt items of the pistol / BAR belt:
    // those wearers carry the haversack alone (the carrier was often left with the company train)
    const carrier = k.belt === 'm1923';
    const hv = piece(carrier ? 'haversack' : 'haversack-body', () => buildM1928Haversack({ carrier }));
    const base = fit.mountFrame('back', { height: 1.43 });
    const m = packFrame(base, hv, union(fields));
    out.push(place(hv.object, m, 'us-m1928-haversack'));
    const bay = piece('bayonet', () => buildM1Bayonet());
    out.push(place(bay.object, m.clone().multiply(hv.slots.bayonet).multiply(new THREE.Matrix4().makeTranslation(0, 0, BAYONET_CLEAR)), 'us-m1-bayonet'));
    const et = piece('etool', () => buildM1943EntrenchingTool());
    out.push(place(et.object, m.clone().multiply(hv.slots.etool).multiply(new THREE.Matrix4().makeTranslation(0, 0, ETOOL_CLEAR)), 'us-m1943-etool'));
    const a = (hv.strapAnchors ?? []).map((p) => p.clone().applyMatrix4(m));
    const base2 = union(fields);
    if (a.length >= 3) {
      const front = k.belt === 'm1923' ? ['L2', 'R2'] : k.belt === 'm1937' ? ['L1', 'R1'] : ['L7', 'R7'];
      const path = (anchor: THREE.Vector3, eye: THREE.Matrix4, s: number) => {
        const e = posOf(eye).addScaledVector(upOf(eye), 0.05);
        const ctrl = [anchor, shoulderTop(s * 0.105), sp(s * 26, 1.36), sp(s * 28, 1.2), e];
        const d = drape(base2, ctrl, off, { pin: true, tension: 0.6, step: 0.014 });
        return { points: d.points, normals: d.normals };
      };
      // gear +X = the wearer's right after the back mount's 180 deg turn: anchor 0 = right strap
      out.push(
        buildHaversackStrapsAlong({
          left: path(a[1], rig.top[front[0]], 1),
          right: path(a[0], rig.top[front[1]], -1),
          hooks: [rig.top[front[0]], rig.top[front[1]]],
        }),
      );
      if (rig.top.rear) {
        const e = posOf(rig.top.rear).addScaledVector(upOf(rig.top.rear), 0.04);
        const bs = a[2];
        const mid = bs.clone().lerp(e, 0.5);
        const n = V(0, 0, -1);
        const pts = [bs, mid, e];
        out.push(buildWebStrapAlong({ points: pts, normals: pts.map(() => n.clone()), width: 0.024, hookEnd: rig.top.rear, name: 'm1928-belt-strap' }));
      }
    }
  } else if (k.belt !== 'm1923') {
    // ---- M1936 suspenders: front hook -> over the shoulder -> crossing at the back -> rear hook on the other side
    const topAt = (side: 'L' | 'R', d: number) => {
      let best = '', bd = Infinity;
      for (const n of Object.keys(rig.top)) {
        if (!n.startsWith(side)) continue;
        const i = Number(n.slice(1));
        const dd = k.belt === 'm1936' ? Math.abs(0.045 + 0.025 * (i - 1) - d) : 0;
        if (dd < bd) { bd = dd; best = n; }
      }
      return rig.top[best];
    };
    const fl = k.belt === 'm1937' ? rig.top.L1 : topAt('L', 0.175);
    const fr = k.belt === 'm1937' ? rig.top.R1 : topAt('R', 0.175);
    const rl = k.belt === 'm1937' ? rig.top.L3 : topAt('L', L / 2 - 0.085);
    const rr = k.belt === 'm1937' ? rig.top.R3 : topAt('R', L / 2 - 0.085);
    const base2 = union(fields);
    const strap = (front: THREE.Matrix4, rear: THREE.Matrix4, s: number) => {
      const f0 = posOf(front).addScaledVector(upOf(front), 0.045);
      const r0 = posOf(rear).addScaledVector(upOf(rear), 0.045);
      const ctrl = [f0, sp(s * 30, 1.2), sp(s * 24, 1.36), shoulderTop(s * 0.108), sp(s * 160, 1.4), sp(180, 1.27), sp(-s * 150, 1.14), r0];
      const d = drape(base2, ctrl, off, { pin: true, tension: 0.55, step: 0.014 });
      return { points: d.points, normals: d.normals };
    };
    out.push(
      buildM1936SuspendersAlong({
        left: strap(fl, rr, 1),
        right: strap(fr, rl, -1),
        frontHooks: [fl, fr],
        rearHooks: [rr, rl],
      }),
    );
  }
  // drop the thread meshes of the strap builders (sewing thread is invisible at figure distance)
  for (const o of out) leanObject(o, Infinity);

  // ---- helmet
  out.push(...helmet(sol));
  return out;
}
