/**
 * Lifting-surface builder (wings, tailplane, fin + rudder): airfoil sections between leading and
 * trailing edge outlines, one open grid (upper TE -> LE -> lower TE) so the upper and lower
 * skins can take different paint while shading seamlessly across the leading edge.
 */
import * as THREE from 'three';
import { Grid, naca, camberLine, uniq } from './geo';

export interface LiftingSpec {
  /** span stations (monotonic) */
  stations: number[];
  le: (u: number) => number;
  te: (u: number) => number;
  /** thickness / chord */
  tc: (u: number) => number;
  camber?: number;
  /** body-frame point for span u, chordwise station s, thickness offset v (+ = upper side) */
  place: (u: number, s: number, v: number) => THREE.Vector3;
  /** chord fractions for the upper and lower skins (0 = LE, 1 = TE), any order */
  upperF: number[];
  lowerF: number[];
  /** optional per-station thickness multiplier (rounded tips / bottoms) */
  thickScale?: (u: number) => number;
}

export interface Lifting {
  grid: Grid;
  jLE: number;
  cols: { f: number; upper: boolean }[];
  stations: number[];
  upper(): THREE.BufferGeometry;
  lower(): THREE.BufferGeometry;
  /** point on the upper/lower surface (for decals) */
  surf(u: number, f: number, upper: boolean): THREE.Vector3;
}

export function buildLifting(sp: LiftingSpec): Lifting {
  const m = sp.camber ?? 0;
  const up = uniq(sp.upperF.map((f) => Math.min(1, Math.max(0, f))), 1e-7).reverse(); // 1 -> 0
  const lo = uniq(sp.lowerF.map((f) => Math.min(1, Math.max(0, f))), 1e-7); // 0 -> 1
  if (up[up.length - 1] !== 0) up.push(0);
  if (lo[0] !== 0) lo.unshift(0);
  const cols = [...up.map((f) => ({ f, upper: true })), ...lo.slice(1).map((f) => ({ f, upper: false }))];
  const jLE = up.length - 1;
  const surf = (u: number, f: number, upper: boolean) => {
    const le = sp.le(u), te = sp.te(u), c = Math.max(0, te - le);
    const ts = sp.thickScale ? sp.thickScale(u) : 1;
    const t = sp.tc(u);
    const v = (camberLine(m, 0.35, f) + (upper ? 1 : -1) * naca(t, f) * ts) * c;
    return sp.place(u, le + f * c, v);
  };
  const P = sp.stations.map((u) => cols.map((cl) => surf(u, cl.f, cl.upper)));
  const grid = new Grid(P, false, (i, j) => {
    const u = sp.stations[i];
    const le = sp.le(u), te = sp.te(u);
    const mid = sp.place(u, le + cols[j].f * (te - le), camberLine(m, 0.35, cols[j].f) * (te - le));
    const d = P[i][j].clone().sub(mid);
    if (d.lengthSq() < 1e-10) return sp.place(u, le - 1, 0).sub(sp.place(u, le, 0));
    return d;
  });
  return {
    grid,
    jLE,
    cols,
    stations: sp.stations,
    upper: () => grid.sheet(0, sp.stations.length - 1, 0, jLE),
    lower: () => grid.sheet(0, sp.stations.length - 1, jLE, cols.length - 1),
    surf,
  };
}

/** Insert groove triplets (x - d, x, x + d) into a list of values. */
export function withGrooves(base: number[], grooves: number[], d: number, clearance = 3): number[] {
  const kept = base.filter((b) => !grooves.some((g) => Math.abs(b - g) < d * clearance));
  const tri: number[] = [];
  for (const g of grooves) tri.push(g - d, g, g + d);
  return uniq([...kept, ...tri], 1e-7);
}

/** True when value v equals one of the groove centres. */
export const isAt = (v: number, g: number) => Math.abs(v - g) < 1e-7;
