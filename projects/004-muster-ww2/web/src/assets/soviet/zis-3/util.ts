/** Small geometry helpers shared by the ZiS-3 modules. */
import { THREE, G } from '../../../core/kit';

type V2 = [number, number];
type V3 = [number, number, number];

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
  return latheZ(
    [
      [0, z0],
      [r - ch, z0],
      [r, z0 + ch],
      [r, z1 - ch],
      [r - ch, z1],
      [0, z1],
    ],
    seg,
    40,
  );
}

/** Solid cylinder along X with chamfered ends. */
export function cylX(r: number, x0: number, x1: number, seg = 24, ch = 0.002): THREE.BufferGeometry {
  return latheX(
    [
      [0, x0],
      [r - ch, x0],
      [r, x0 + ch],
      [r, x1 - ch],
      [r - ch, x1],
      [0, x1],
    ],
    seg,
    40,
  );
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

/** Hex nut along +Y with a washer, base at y = 0 (a heavier version of G.boltHead). */
export function nut(size = 0.02, h = 0.012): THREE.BufferGeometry {
  return G.boltHead(size, h);
}

/** Apply a Placement-like transform to a geometry (in place) and return it. */
export function xf(g: THREE.BufferGeometry, p: V3 = [0, 0, 0], rDeg: V3 = [0, 0, 0], s: number | V3 = 1): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rDeg.map((d) => (d * Math.PI) / 180) as V3)),
    typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s),
  );
  g.applyMatrix4(m);
  return g;
}

/** Clamp every vertex below yMin up to yMin (tyre contact patch). Recomputes nothing else. */
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

/** Merge several geometries (non-indexed conversion handled). */
export function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const list = gs.map((g) => {
    const c = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(c.attributes)) if (k !== 'position' && k !== 'normal') c.deleteAttribute(k);
    return c;
  });
  return G.mergeGeometries(list)!;
}
