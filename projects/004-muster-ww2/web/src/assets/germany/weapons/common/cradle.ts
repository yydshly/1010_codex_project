/**
 * Contact with the felt-lined U cradles of the shared weaponStand() (src/assets/shared/display.ts).
 *
 * The stand puts each rest point at the cradle top height `cradleTop`. The felt pad is a half torus
 * (tube radius 3 mm) whose centre line is the lower half of a circle of radius 18.5 mm centred
 * 13 mm above cradleTop. A section of the weapon therefore touches the felt somewhere on the U,
 * not at cradleTop itself. feltLift() returns how far above cradleTop the section's lowest point
 * sits when it just touches the felt, so a model can hand the stand a corrected rest point
 * (true underside point minus the lift) and the weapon neither floats nor sinks into the felt.
 */
import type { V2 } from './geo';

const FELT_R = 0.0185, FELT_TUBE = 0.003, FELT_CY = 0.013;

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay;
  const l2 = vx * vx + vy * vy || 1e-12;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
  const dx = ax + vx * t - px, dy = ay + vy * t - py;
  return Math.hypot(dx, dy);
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
 * ring: closed cross-section outline of the weapon at the rest station, as (x, y) with y measured
 * from the section's lowest point (so min y = 0) and x across the weapon (x = 0 on the stand axis).
 * Returns the lift (m) of the lowest point above cradleTop at first contact with the felt.
 */
export function feltLift(ring: V2[]): number {
  const arc: V2[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = Math.PI + (Math.PI * i) / 48;
    arc.push([FELT_R * Math.cos(a), FELT_CY + FELT_R * Math.sin(a)]);
  }
  const hits = (d: number) => {
    for (const [fx, fy] of arc) {
      // felt point relative to the section (section lowest point at height d)
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
