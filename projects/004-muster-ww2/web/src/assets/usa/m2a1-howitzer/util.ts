/** Small geometry helpers shared by the M2A1 howitzer modules. */
import { THREE, G } from '../../../core/kit';

export type V2 = [number, number];
export type V3 = [number, number, number];
export const D2R = Math.PI / 180;

/**
 * Lathe around the +Z axis from a profile of [radius, z] points.
 * Angles (deg) are measured around Z from +X towards +Y.
 */
export function latheZ(profile: V2[], seg = 32, creaseDeg = 40, a0 = 0, a1 = 360): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg, THREE.MathUtils.degToRad(a0 + 90), THREE.MathUtils.degToRad(a1 - a0));
  g.rotateX(Math.PI / 2);
  return g;
}

/** Lathe around the +X axis from a profile of [radius, x] points. */
export function latheX(profile: V2[], seg = 32, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Closed rectangular-section ring profile (ri..ro) between z0..z1, for latheZ/latheX. */
export function ringProfile(ri: number, ro: number, z0: number, z1: number, ch = 0.002): V2[] {
  return [
    [ri, z0 + ch],
    [ri + ch, z0],
    [ro - ch, z0],
    [ro, z0 + ch],
    [ro, z1 - ch],
    [ro - ch, z1],
    [ri + ch, z1],
    [ri, z1 - ch],
    [ri, z0 + ch],
  ];
}

function solidProfile(r: number, a: number, b: number, ch: number): V2[] {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const c = Math.min(ch, r * 0.3, (hi - lo) * 0.3);
  return [
    [0, lo],
    [r - c, lo],
    [r, lo + c],
    [r, hi - c],
    [r - c, hi],
    [0, hi],
  ];
}

/** Solid cylinder along Z (z0..z1) with chamfered ends. */
export function cylZ(r: number, z0: number, z1: number, seg = 24, ch = 0.002): THREE.BufferGeometry {
  return latheZ(solidProfile(r, z0, z1, ch), seg, 40);
}

/** Solid cylinder along X (x0..x1) with chamfered ends. */
export function cylX(r: number, x0: number, x1: number, seg = 24, ch = 0.002): THREE.BufferGeometry {
  return latheX(solidProfile(r, x0, x1, ch), seg, 40);
}

/** Solid cylinder along Y (y0..y1) with chamfered ends. */
export function cylY(r: number, y0: number, y1: number, seg = 24, ch = 0.002): THREE.BufferGeometry {
  return G.lathe(solidProfile(r, y0, y1, ch), seg, 40);
}

/** Circle polygon (CCW) for shapes. */
export function circlePts(cx: number, cy: number, r: number, n = 32, a0 = 0): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** Rounded-rectangle outline (x0..x1, y0..y1) with chamfered corners, CCW. */
export function rrect(x0: number, y0: number, x1: number, y1: number, c = 0.01): V2[] {
  return [
    [x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c],
  ];
}

/** Stadium (two circles joined) outline between points a and b in 2D. */
export function stadium(a: V2, b: V2, ra: number, rb = ra, steps = 12): V2[] {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const ang = Math.atan2(dy, dx);
  const pts: V2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = ang - Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([b[0] + Math.cos(t) * rb, b[1] + Math.sin(t) * rb]);
  }
  for (let i = 0; i <= steps; i++) {
    const t = ang + Math.PI / 2 + (Math.PI * i) / steps;
    pts.push([a[0] + Math.cos(t) * ra, a[1] + Math.sin(t) * ra]);
  }
  return pts;
}

/** Apply a placement-like transform to a geometry (in place) and return it. */
export function xf(g: THREE.BufferGeometry, p: V3 = [0, 0, 0], rDeg: V3 = [0, 0, 0], s: number | V3 = 1): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rDeg.map((d) => d * D2R) as V3))),
    typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s),
  );
  g.applyMatrix4(m);
  return g;
}

/** Clamp every vertex below yMin up to yMin (tyre contact patch). */
export function flattenBelow(g: THREE.BufferGeometry, yMin: number): THREE.BufferGeometry {
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute | undefined;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < yMin) {
      p.setY(i, yMin);
      if (n) n.setXYZ(i, 0, -1, 0);
    }
  }
  p.needsUpdate = true;
  if (n) n.needsUpdate = true;
  return g;
}

/** Merge several geometries (position + normal only). */
export function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const list = gs.map((g) => {
    const c = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(c.attributes)) if (k !== 'position' && k !== 'normal') c.deleteAttribute(k);
    return c;
  });
  return G.mergeGeometries(list)!;
}

/** Helical coil spring along +Z from z0 to z1 (mean radius R, wire radius r). */
export function coilZ(R: number, r: number, z0: number, z1: number, turns: number, radial = 8, perTurn = 28): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const n = Math.max(8, Math.round(turns * perTurn));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, z0 + (z1 - z0) * t));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  return new THREE.TubeGeometry(curve, n, r, radial, false);
}
