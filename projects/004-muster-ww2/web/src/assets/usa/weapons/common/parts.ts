/**
 * Small reusable parts for the US small arms: sling swivel loops, smooth-union outlines for
 * multi-tube sections (gas cylinders), leaf-spring / strap shaped wire parts.
 */
import { THREE, G, part } from '../../../../core/kit';
import { V, type V2 } from './geo';

/**
 * Sling swivel loop: a bent wire loop whose eyes wrap a pivot pin running along X and whose flat bar
 * (the part the strap wraps round) lies along X at `reach` from the pin in direction `dir`
 * (perpendicular to X). innerW = inside width of the bar (strap width + clearance).
 * Returns the mesh and the bar centre.
 */
export function swivelLoop(pin: THREE.Vector3, dir: THREE.Vector3, innerW: number, reach: number, wire: number, mat: THREE.Material, eyeW = 0.0095): { mesh: THREE.Mesh; bar: THREE.Vector3 } {
  const d = V(0, dir.y, dir.z).normalize();
  const hw = innerW / 2 + wire;
  const ew = eyeW / 2 + wire;
  const uv: V2[] = [
    [ew, 0],
    [ew + (hw - ew) * 0.55, reach * 0.22],
    [hw, reach * 0.55],
    [hw, reach * 0.86],
    [hw - 0.003, reach],
    [0, reach],
    [-hw + 0.003, reach],
    [-hw, reach * 0.86],
    [-hw, reach * 0.55],
    [-ew - (hw - ew) * 0.55, reach * 0.22],
    [-ew, 0],
    [0, -wire * 0.2],
  ];
  const pts = uv.map(([u, v]) => pin.clone().add(V(u, 0, 0)).addScaledVector(d, v));
  const mesh = part(G.tube(pts, wire, 10, 72, true), mat);
  return { mesh, bar: pin.clone().addScaledVector(d, reach) };
}

/** Smooth max (for smooth unions of distance-like radii). */
export function smax(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + (h * h * k) / 4;
}

/**
 * Outline (CCW, n points) of the smooth union of circles, sampled in polar form around (cx, cy).
 * circles: [x, y, r][]; k = fillet size.
 */
export function circlesUnion(circles: [number, number, number][], cx: number, cy: number, n = 48, k = 0.004): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    const dx = Math.cos(th), dy = Math.sin(th);
    let r = 0;
    for (const [x, y, R] of circles) {
      // distance along the ray from (cx, cy) to the far side of this circle
      const ox = cx - x, oy = cy - y;
      const bq = ox * dx + oy * dy;
      const c = ox * ox + oy * oy - R * R;
      const disc = bq * bq - c;
      if (disc <= 0) continue;
      const t = -bq + Math.sqrt(disc);
      r = r === 0 ? t : smax(r, t, k);
    }
    pts.push([cx + dx * r, cy + dy * r]);
  }
  return pts;
}

/** Grow a closed outline along its 2D normals (positive = outwards for CCW outlines). */
export function growOutline(pts: V2[], d: number): V2[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    return [p[0] + (ty / l) * d, p[1] - (tx / l) * d] as V2;
  });
}
