/**
 * Presentation of the UK weapons on the shared collection stand (src/assets/shared/display.ts).
 *
 * The stand's cradles are felt-lined half tori (tube radius 3 mm; the tube centre line is the lower half
 * of a circle of radius 18.5 mm centred 13 mm above the rest height). feltLift() finds how far above the
 * rest height a weapon cross-section's lowest point sits when it first touches the felt, so the weapon
 * handed to weaponStand() neither floats above nor sinks into the cradles. presentOnStand() then picks
 * a stand height that keeps the lowest part of the levelled weapon (and its sling) clear of the base,
 * and centres the whole footprint on the origin.
 */
import { THREE, group } from '../../../../core/kit';
import type { WeaponModel } from '../../../shared/contracts';
import { weaponStand } from '../../../shared/display';
import type { V2 } from './geo';

const FELT_R = 0.0185, FELT_TUBE = 0.003, FELT_CY = 0.013;
const BASE_TOP = 0.041;

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay;
  const l2 = vx * vx + vy * vy || 1e-12;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
  return Math.hypot(ax + vx * t - px, ay + vy * t - py);
}

function inside(px: number, py: number, ring: V2[]): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/**
 * ring: closed cross-section of the weapon at the rest station, [x, y] with y measured from the
 * section's lowest point (min y = 0), x across the weapon (0 on the stand axis). Returns the lift (m)
 * of the lowest point above the rest height at first contact with the felt.
 */
export function feltLift(ring: V2[]): number {
  const arc: V2[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = Math.PI + (Math.PI * i) / 48;
    arc.push([FELT_R * Math.cos(a), FELT_CY + FELT_R * Math.sin(a)]);
  }
  const hits = (d: number) => {
    for (const [fx, fy] of arc) {
      const py = fy - d;
      if (inside(fx, py, ring)) return true;
      for (let i = 0; i < ring.length; i++) {
        const [ax, ay] = ring[i], [bx, by] = ring[(i + 1) % ring.length];
        if (segDist(fx, py, ax, ay, bx, by) < FELT_TUBE) return true;
      }
    }
    return false;
  };
  let hi = 0.03, lo = -0.01;
  if (hits(hi)) return hi;
  for (let it = 0; it < 40; it++) {
    const mid = (hi + lo) / 2;
    if (hits(mid)) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** Rest point corrected for felt contact: contour is the weapon-local section ([x, y]) at that station. */
export function feltRest(p: THREE.Vector3, contour: V2[]): THREE.Vector3 {
  const minY = Math.min(...contour.map((c) => c[1]));
  const rel = contour.map(([x, y]) => [x, y - minY] as V2);
  return new THREE.Vector3(p.x, minY - feltLift(rel), p.z);
}

export interface StandPresentation {
  /** Rest points (weapon-local) with the local cross-section used for felt contact. */
  rest: { p: THREE.Vector3; contour?: V2[] }[];
  sling?: boolean;
  slingSlack?: number;
  /** Clearance of the lowest point above the stand base (m). */
  clearance?: number;
  overhang?: number;
  minHeight?: number;
}

/** Weapon on the shared stand, footprint centred on the origin, base on y = 0. */
export function presentOnStand(w: WeaponModel, s: StandPresentation): THREE.Group {
  const rp = s.rest.map((r) => (r.contour ? feltRest(r.p, r.contour) : r.p.clone()));
  const onStand: WeaponModel = { ...w, restPoints: rp };
  const [a, b] = [...rp].sort((p, q) => p.z - q.z);
  const pitch = Math.atan2(b.y - a.y, b.z - a.z);
  const probe = new THREE.Group();
  probe.rotation.x = pitch;
  probe.add(w.object.clone(true));
  probe.updateMatrixWorld(true);
  const slack = s.slingSlack ?? 0.03;
  if (w.sling && s.sling !== false) {
    const gl = new THREE.Vector3(0, -1, 0).applyQuaternion(probe.quaternion.clone().invert());
    probe.add(w.sling.build(gl, slack));
  }
  probe.updateMatrixWorld(true);
  const lowest = new THREE.Box3().setFromObject(probe, true).min.y;
  const r0y = a.clone().applyMatrix4(probe.matrixWorld).y;
  const lift = Math.max(s.minHeight ?? 0.08, BASE_TOP + (s.clearance ?? 0.02) - 0.035 - (lowest - r0y));
  const stand = weaponStand(onStand, { height: lift, sling: s.sling !== false, slingSlack: slack, overhang: s.overhang ?? 0.07 });
  const bb = new THREE.Box3().setFromObject(stand, true);
  stand.position.set(-(bb.min.x + bb.max.x) / 2, 0, -(bb.min.z + bb.max.z) / 2);
  return group([stand]);
}
