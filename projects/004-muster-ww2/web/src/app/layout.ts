/**
 * Formation maths for placed groups.
 *
 * Group-local frame: at heading 0 every model faces +Z. A Line dresses along local +X from
 * the first model; further ranks (a Line wraps at the display width) and Grid rows step back
 * along local -Z. Slots are centred on the group anchor. Manual adjustments are stored per
 * instance as offsets relative to their slot (local frame), so they survive spacing and
 * formation changes; Reset Layout clears them.
 *
 * Quantity changes keep existing models where they stand (the anchor is compensated), and new
 * models take the next free slots.
 */
import { PLINTH } from '../core/stage/ground';
import type { AssetDef } from '../core/types';
import type { Formation, Group, GroupInstance } from './types';

/** Half extents of the placeable soil area (same rule as ground.clamp). */
export const HALF_W = PLINTH.w / 2 - PLINTH.margin;
export const HALF_L = PLINTH.l / 2 - PLINTH.margin;
const D2R = Math.PI / 180;

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function normDeg(d: number): number {
  const r = (((d % 360) + 360) % 360);
  const k = Math.round(r * 100) / 100;
  return k >= 360 ? 0 : k;
}

/** Rotate a local (x, z) vector by a heading (same convention as Object3D.rotation.y). */
export function rot(x: number, z: number, deg: number): { x: number; z: number } {
  const a = deg * D2R, c = Math.cos(a), s = Math.sin(a);
  return { x: x * c + z * s, z: -x * s + z * c };
}

/** Ground half extents of a footprint rotated by a heading. */
export function extents(def: AssetDef, headingDeg: number): { ex: number; ez: number } {
  const a = headingDeg * D2R, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const w = def.footprint.w / 2, l = def.footprint.l / 2;
  return { ex: c * w + s * l, ez: s * w + c * l };
}

export function layoutCount(g: Group): number {
  let m = 1;
  for (const i of g.instances) m = Math.max(m, i.slot + 1);
  return m;
}

/** Models per rank that fit across the display's long side (heading independent). */
export function rankCapacity(def: AssetDef, spacing: number): number {
  return Math.max(1, Math.floor((2 * HALF_W - def.footprint.w) / Math.max(0.05, spacing)) + 1);
}

export function columnsFor(g: Group, def: AssetDef, count = layoutCount(g)): number {
  if (g.formation === 'single') return 1;
  const cap = rankCapacity(def, g.spacing);
  const want = g.formation === 'line' ? count : g.columns === 'auto' ? Math.ceil(Math.sqrt(count)) : g.columns;
  return Math.max(1, Math.min(count, want, cap));
}

export interface LayoutCtx {
  count: number;
  cols: number;
  rows: number;
  /** Distance between ranks (metres), see rowPitch(). */
  pitch: number;
}

/**
 * Distance between ranks: the spacing, but never less than the model's own length plus a
 * small clearance, so elongated models (rifles on their stands, vehicles) standing one behind
 * the other in a Grid never overlap. Side-by-side spacing is exactly g.spacing.
 */
export function rowPitch(g: Group, def: AssetDef): number {
  const gap = clamp(g.spacing - def.footprint.w, 0.15, 1.5);
  return Math.max(g.spacing, def.footprint.l + gap);
}

export function layoutCtx(g: Group, def: AssetDef): LayoutCtx {
  const count = layoutCount(g);
  const cols = columnsFor(g, def, count);
  return { count, cols, rows: Math.ceil(count / cols), pitch: rowPitch(g, def) };
}

export function slotLocal(g: Group, slot: number, ctx: LayoutCtx): { x: number; z: number } {
  const col = slot % ctx.cols, row = Math.floor(slot / ctx.cols);
  return { x: (col - (ctx.cols - 1) / 2) * g.spacing, z: -(row - (ctx.rows - 1) / 2) * ctx.pitch };
}

export interface Pose {
  x: number;
  z: number;
  heading: number;
}

export function rawPose(g: Group, inst: GroupInstance, ctx: LayoutCtx): Pose {
  const p = slotLocal(g, inst.slot, ctx);
  const r = rot(p.x + inst.offset.dx, p.z + inst.offset.dz, g.heading);
  return { x: g.anchor.x + r.x, z: g.anchor.z + r.z, heading: normDeg(g.heading + inst.headingOffset) };
}

const clampHalf = (v: number, lim: number) => (lim <= 0 ? 0 : clamp(v, -lim, lim));

/** Keep a model's whole footprint on the soil: it never overhangs the plinth edge. */
export function clampPose(p: Pose, def: AssetDef): Pose {
  const { ex, ez } = extents(def, p.heading);
  return { x: clampHalf(p.x, HALF_W - ex), z: clampHalf(p.z, HALF_L - ez), heading: p.heading };
}

export function instancePose(g: Group, def: AssetDef, inst: GroupInstance, ctx = layoutCtx(g, def)): Pose {
  return clampPose(rawPose(g, inst, ctx), def);
}

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function poseRect(g: Group, def: AssetDef, clamped: boolean): Rect {
  const ctx = layoutCtx(g, def);
  const r: Rect = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const inst of g.instances) {
    const raw = rawPose(g, inst, ctx);
    const p = clamped ? clampPose(raw, def) : raw;
    const { ex, ez } = extents(def, p.heading);
    r.minX = Math.min(r.minX, p.x - ex);
    r.maxX = Math.max(r.maxX, p.x + ex);
    r.minZ = Math.min(r.minZ, p.z - ez);
    r.maxZ = Math.max(r.maxZ, p.z + ez);
  }
  return r;
}

/** World ground rectangle covered by a group (footprints included). */
export function groupRect(g: Group, def: AssetDef): Rect {
  return poseRect(g, def, true);
}

export function rectsOverlap(a: Rect, b: Rect, gap = 0): boolean {
  return a.minX < b.maxX + gap && a.maxX > b.minX - gap && a.minZ < b.maxZ + gap && a.maxZ > b.minZ - gap;
}

function shift1D(min: number, max: number, half: number): number {
  if (max - min >= 2 * half) return -(min + max) / 2;
  if (max > half) return half - max;
  if (min < -half) return -half - min;
  return 0;
}

/** Shift the anchor so the whole formation stays on the display (when it fits). */
export function fitToPlinth(g: Group, def: AssetDef): void {
  const r = poseRect(g, def, false);
  if (!Number.isFinite(r.minX)) return;
  g.anchor.x = r3(g.anchor.x + shift1D(r.minX, r.maxX, HALF_W));
  g.anchor.z = r3(g.anchor.z + shift1D(r.minZ, r.maxZ, HALF_L));
}

/** True when the formation is larger than the display and outer models are held at the edge. */
export function overflows(g: Group, def: AssetDef): boolean {
  const r = poseRect(g, def, false);
  return r.maxX - r.minX > 2 * HALF_W + 1e-3 || r.maxZ - r.minZ > 2 * HALF_L + 1e-3;
}

export function hasAdjustments(g: Group): boolean {
  return g.instances.some((i) => Math.abs(i.offset.dx) > 1e-4 || Math.abs(i.offset.dz) > 1e-4 || Math.abs(i.headingOffset) > 1e-4);
}

export function newInstance(slot: number): GroupInstance {
  return { slot, offset: { dx: 0, dz: 0 }, headingOffset: 0 };
}

/**
 * Set the number of models. Existing models keep their place and adjustments; new models
 * fill the next free slots; decreasing removes the last ones. Returns a short note or null.
 */
export function applyQuantity(g: Group, def: AssetDef, n: number): string | null {
  n = Math.max(1, Math.round(n));
  if (n === g.instances.length) {
    g.quantity = n;
    return null;
  }
  let note: string | null = null;
  if (n > 1 && g.formation === 'single') {
    g.formation = 'line';
    note = 'Single holds one model - switched to Line.';
  }
  g.instances.sort((a, b) => a.slot - b.slot);
  if (g.formation === 'grid' && g.columns === 'auto' && hasAdjustments(g)) {
    g.columns = columnsFor(g, def);
    note = `Columns kept at ${g.columns} so your adjustments stay in place.`;
  }
  const ref = g.instances[0];
  const before = slotLocal(g, ref.slot, layoutCtx(g, def));
  if (n > g.instances.length) {
    const used = new Set(g.instances.map((i) => i.slot));
    let s = 0;
    while (g.instances.length < n) {
      while (used.has(s)) s++;
      used.add(s);
      g.instances.push(newInstance(s));
    }
    g.instances.sort((a, b) => a.slot - b.slot);
  } else {
    g.instances.length = n;
  }
  g.quantity = n;
  const after = slotLocal(g, ref.slot, layoutCtx(g, def));
  const d = rot(before.x - after.x, before.z - after.z, g.heading);
  g.anchor.x += d.x;
  g.anchor.z += d.z;
  fitToPlinth(g, def);
  return note;
}

/** Remove one specific model; the others stay exactly where they are (its slot stays free). */
export function removeSlot(g: Group, def: AssetDef, slot: number): void {
  const keep = g.instances.filter((i) => i.slot !== slot).sort((a, b) => a.slot - b.slot);
  if (!keep.length || keep.length === g.instances.length) return;
  if (g.formation === 'grid' && g.columns === 'auto') g.columns = columnsFor(g, def);
  const ref = keep[0];
  const before = slotLocal(g, ref.slot, layoutCtx(g, def));
  g.instances = keep;
  g.quantity = keep.length;
  const after = slotLocal(g, ref.slot, layoutCtx(g, def));
  const d = rot(before.x - after.x, before.z - after.z, g.heading);
  g.anchor.x += d.x;
  g.anchor.z += d.z;
  fitToPlinth(g, def);
}

export function applyFormation(g: Group, def: AssetDef, f: Formation): string | null {
  if (g.formation === f) return null;
  let note: string | null = null;
  if (f === 'single') {
    // keep the first model exactly where it stands
    g.instances.sort((a, b) => a.slot - b.slot);
    const keep = g.instances[0];
    const pose = rawPose(g, keep, layoutCtx(g, def));
    if (g.instances.length > 1) note = 'Single holds one model - quantity set to 1.';
    g.instances = [{ ...keep, slot: 0 }];
    g.quantity = 1;
    g.formation = 'single';
    const o = rot(keep.offset.dx, keep.offset.dz, g.heading);
    g.anchor = { x: r3(pose.x - o.x), z: r3(pose.z - o.z) };
  } else {
    g.formation = f;
  }
  fitToPlinth(g, def);
  return note;
}

/** Offset (local, relative to the slot) that puts a model at a world position. */
export function offsetForWorld(g: Group, def: AssetDef, inst: GroupInstance, x: number, z: number): { dx: number; dz: number } {
  const c = clampPose({ x, z, heading: normDeg(g.heading + inst.headingOffset) }, def);
  const local = rot(c.x - g.anchor.x, c.z - g.anchor.z, -g.heading);
  const p = slotLocal(g, inst.slot, layoutCtx(g, def));
  return { dx: r3(local.x - p.x), dz: r3(local.z - p.z) };
}

/**
 * Find a translation that puts `rect` on the display without overlapping `others`.
 * Preferred translations are tried first, then a search outwards from (0, 0).
 */
export function findFree(rect: Rect, others: Rect[], gap: number, prefer: { x: number; z: number }[] = []): { x: number; z: number } {
  const fits = (dx: number, dz: number) => {
    const r = { minX: rect.minX + dx, maxX: rect.maxX + dx, minZ: rect.minZ + dz, maxZ: rect.maxZ + dz };
    if (r.minX < -HALF_W - 1e-6 || r.maxX > HALF_W + 1e-6 || r.minZ < -HALF_L - 1e-6 || r.maxZ > HALF_L + 1e-6) return false;
    return !others.some((o) => rectsOverlap(r, o, gap));
  };
  for (const p of prefer) if (fits(p.x, p.z)) return p;
  const w = rect.maxX - rect.minX, l = rect.maxZ - rect.minZ;
  const sx = Math.max(0.35, (w + gap) / 2), sz = Math.max(0.35, (l + gap) / 2);
  const nx = Math.min(160, Math.ceil((2 * HALF_W) / sx)), nz = Math.min(160, Math.ceil((2 * HALF_L) / sz));
  const cands: { x: number; z: number; d: number }[] = [];
  for (let i = -nx; i <= nx; i++) {
    for (let j = -nz; j <= nz; j++) {
      const x = i * sx, z = j * sz;
      cands.push({ x, z, d: x * x + z * z * 1.3 });
    }
  }
  cands.sort((a, b) => a.d - b.d);
  for (const c of cands) if (fits(c.x, c.z)) return { x: c.x, z: c.z };
  return prefer[0] ?? { x: 0, z: 0 };
}
