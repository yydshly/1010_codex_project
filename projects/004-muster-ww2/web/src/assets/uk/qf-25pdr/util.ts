/** Small geometry helpers shared by the QF 25-pounder modules. */
import { THREE, G, part } from '../../../core/kit';

export type V2 = [number, number];
export type V3 = [number, number, number];

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

/** Solid cylinder along Z with chamfered ends. */
export function cylZ(r: number, z0: number, z1: number, seg = 24, ch = 0.002): THREE.BufferGeometry {
  return latheZ([[0, z0], [r - ch, z0], [r, z0 + ch], [r, z1 - ch], [r - ch, z1], [0, z1]], seg, 40);
}

/** Solid cylinder along X with chamfered ends. */
export function cylX(r: number, x0: number, x1: number, seg = 24, ch = 0.002): THREE.BufferGeometry {
  return latheX([[0, x0], [r - ch, x0], [r, x0 + ch], [r, x1 - ch], [r - ch, x1], [0, x1]], seg, 40);
}

/** Solid cylinder along Y with chamfered ends (y0..y1). */
export function cylY(r: number, y0: number, y1: number, seg = 24, ch = 0.002): THREE.BufferGeometry {
  return G.lathe([[0, y0], [r - ch, y0], [r, y0 + ch], [r, y1 - ch], [r - ch, y1], [0, y1]], seg, 40);
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

/** Rounded rectangle polygon (CCW). */
export function rrect(x0: number, y0: number, x1: number, y1: number, r: number, n = 4): V2[] {
  const pts: V2[] = [];
  const c: [number, number, number][] = [
    [x1 - r, y0 + r, -90],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, 90],
    [x0 + r, y0 + r, 180],
  ];
  for (const [cx, cy, a0] of c) {
    for (let i = 0; i <= n; i++) {
      const a = THREE.MathUtils.degToRad(a0 + (90 * i) / n);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

/** Apply a Placement-like transform to a geometry (in place) and return it. */
export function xf(g: THREE.BufferGeometry, p: V3 = [0, 0, 0], rDeg: V3 = [0, 0, 0], s: number | V3 = 1): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rDeg.map((d) => (d * Math.PI) / 180) as V3))),
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

/**
 * Flat bar between two points of a side-view (z, y) line at lateral position x:
 * width w across X, thickness t perpendicular to the line in the ZY plane.
 */
export function barZY(a: V2, b: V2, x: number, w: number, t: number, mat: THREE.Material, r = 0.003): THREE.Mesh {
  const dz = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dz, dy);
  const ang = Math.atan2(dy, dz);
  return part(G.rbox(w, t, len, r, 1), mat, {
    p: [x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2],
    r: [-(ang * 180) / Math.PI, 0, 0],
  });
}

/** Bolt / rivet placements along a straight line (count points, inclusive). */
export function row(a: V3, b: V3, count: number, n: V3): { p: V3; n: V3 }[] {
  return G.along(a, b, count).map((v) => ({ p: [v.x, v.y, v.z] as V3, n }));
}

/** Handwheel in the YZ plane (axle along X), outer face towards +X, crank grip at angle a0 (rad). */
export function handwheel(R: number, a0: number, hi: boolean, rim: THREE.Material, hub: THREE.Material, grip: THREE.Material): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const ring = G.torus(R, 0.0105, hi ? 12 : 8, hi ? 56 : 30);
  ring.rotateY(Math.PI / 2);
  o.push(part(ring, rim));
  o.push(part(cylX(0.026, -0.024, 0.018, 24, 0.004), hub));
  o.push(part(cylX(0.012, 0.018, 0.03, 16, 0.002), grip));
  // four dished spokes
  for (let i = 0; i < 4; i++) {
    const a = a0 + Math.PI / 4 + (i * Math.PI) / 2;
    const c = Math.cos(a), s = Math.sin(a);
    o.push(part(G.rod([-0.006, s * 0.022, c * 0.022], [0, s * (R - 0.007), c * (R - 0.007)], 0.0075, 10, 0.006), rim));
  }
  // crank handle: pin + turned grip, polished by hands
  const gy = Math.sin(a0) * R, gz = Math.cos(a0) * R;
  o.push(part(cylX(0.0075, 0, 0.022, 12, 0.001), grip, { p: [0, gy, gz] }));
  o.push(part(G.lathe([[0, 0], [0.012, 0.002], [0.014, 0.02], [0.0125, 0.058], [0.008, 0.066], [0, 0.067]], 18, 50), grip, { p: [0.02, gy, gz], r: [0, 0, -90] }));
  return o;
}
