/**
 * Small reusable parts for the Japanese small arms: sling swivel loops (bottom- and side-mounted),
 * partial lathes, smooth-union outlines for multi-tube sections (gas cylinders).
 */
import { THREE, G, part } from '../../../../core/kit';
import { V, RAD, type V2 } from './geo';

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

/** Lathe around +Z over a partial sweep a0..a1 (degrees, measured from +X towards +Y). */
export function latheZArc(profile: V2[], seg: number, a0: number, a1: number, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg, (a0 + 90) * RAD, (a1 - a0) * RAD);
  g.rotateX(Math.PI / 2);
  return g;
}

/**
 * Side-mounted sling swivel: the pivot pin runs along Y (vertical) so the strap lies flat against the
 * side of the rifle; the loop reaches from the pin along `dir` (in the XZ plane). Returns the loop mesh
 * and the centre of its bar.
 */
export function sideSwivel(pin: THREE.Vector3, dir: THREE.Vector3, innerW: number, reach: number, wire: number, mat: THREE.Material, eyeW = 0.0085): { mesh: THREE.Mesh; bar: THREE.Vector3 } {
  const d = V(dir.x, 0, dir.z).normalize();
  // authored with the pin along X and the reach in the YZ plane, then turned about Z (+90 deg):
  // local X -> world Y, local Y -> world -X
  const local = swivelLoop(V(0, 0, 0), V(0, -d.x, d.z), innerW, reach, wire, mat, eyeW);
  const g = local.mesh.geometry.clone();
  g.rotateZ(Math.PI / 2);
  g.translate(pin.x, pin.y, pin.z);
  return { mesh: part(g, mat), bar: pin.clone().addScaledVector(d, reach) };
}

/** Closed loft through 3D sections (same point count each), capped, creased, outward-facing. */
export function loft3D(sections: THREE.Vector3[][], creaseDeg = 50): THREE.BufferGeometry {
  const g = new G.LoftGeometry(sections, { closed: true, capStart: true, capEnd: true });
  const out = G.crease(g, creaseDeg);
  G.ensureOutward(out);
  return out;
}

/**
 * Sweep a 2D section (px along `side`, pu along the in-plane normal) along a centre line given as
 * frames { c, t (tangent), u (in-plane normal) }; side = t x u is computed per frame.
 */
export function sweep(frames: { c: THREE.Vector3; t: THREE.Vector3; u: THREE.Vector3 }[], section: (i: number) => V2[], creaseDeg = 50): THREE.BufferGeometry {
  const secs = frames.map((f, i) => {
    const side = f.t.clone().cross(f.u).normalize();
    return section(i).map(([px, pu]) => f.c.clone().addScaledVector(side, px).addScaledVector(f.u, pu));
  });
  return loft3D(secs, creaseDeg);
}
