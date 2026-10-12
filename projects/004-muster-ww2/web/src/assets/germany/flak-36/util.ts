/** Geometry helpers for the Flak 36 modules (adapted from the PaK 40 helpers; self-contained). */
import { THREE, G, part } from '../../../core/kit';

export type V2 = [number, number];
export type V3 = [number, number, number];
export const D2R = Math.PI / 180;
export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Lathe around +Z from a [radius, z] profile. */
export function latheZ(profile: V2[], seg = 40, creaseDeg = 40, phiStart = 0, phiLength = Math.PI * 2): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg, phiStart, phiLength);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Lathe around +X from a [radius, x] profile. */
export function latheX(profile: V2[], seg = 40, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Cylinder along X (x0..x1) with small end chamfers. */
export function cylX(r: number, x0: number, x1: number, seg = 24, y = 0, z = 0, bevel = 0.002): THREE.BufferGeometry {
  const b = Math.min(bevel, r * 0.3, Math.abs(x1 - x0) * 0.3);
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
  const g = latheX([[0, lo], [r - b, lo], [r, lo + b], [r, hi - b], [r - b, hi], [0, hi]], seg, 40);
  g.translate(0, y, z);
  return g;
}

/** Cylinder along Z (z0..z1) with small end chamfers. */
export function cylZ(r: number, z0: number, z1: number, seg = 24, x = 0, y = 0, bevel = 0.002): THREE.BufferGeometry {
  const b = Math.min(bevel, r * 0.3, Math.abs(z1 - z0) * 0.3);
  const lo = Math.min(z0, z1), hi = Math.max(z0, z1);
  const g = latheZ([[0, lo], [r - b, lo], [r, lo + b], [r, hi - b], [r - b, hi], [0, hi]], seg, 40);
  g.translate(x, y, 0);
  return g;
}

/** Cylinder along Y (y0..y1) with small end chamfers. */
export function cylY(r: number, y0: number, y1: number, seg = 24, x = 0, z = 0, bevel = 0.002): THREE.BufferGeometry {
  const b = Math.min(bevel, r * 0.3, Math.abs(y1 - y0) * 0.3);
  const lo = Math.min(y0, y1), hi = Math.max(y0, y1);
  const g = G.lathe([[0, lo], [r - b, lo], [r, lo + b], [r, hi - b], [r - b, hi], [0, hi]], seg, 40);
  g.translate(x, 0, z);
  return g;
}

/** Rounded-rectangle outline (x0..x1, y0..y1) with chamfered corners. */
export function rrect(x0: number, y0: number, x1: number, y1: number, c = 0.01): V2[] {
  return [
    [x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c],
  ];
}

/** Circle outline. */
export function circle(cx: number, cy: number, r: number, n = 24): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** Annular sector outline (angles in degrees, CCW from +u). */
export function annulus(r0: number, r1: number, a0: number, a1: number, steps = 16, cu = 0, cv = 0): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (a0 + ((a1 - a0) * i) / steps) * D2R;
    pts.push([cu + Math.cos(a) * r1, cv + Math.sin(a) * r1]);
  }
  for (let i = steps; i >= 0; i--) {
    const a = (a0 + ((a1 - a0) * i) / steps) * D2R;
    pts.push([cu + Math.cos(a) * r0, cv + Math.sin(a) * r0]);
  }
  return pts;
}

/** Bolt heads scattered at positions all facing the same normal. */
export function bolts(pts: THREE.Vector3[], n: THREE.Vector3 | V3, size = 0.016, h = 0.008): THREE.BufferGeometry {
  const N = Array.isArray(n) ? v3(...n) : n;
  return G.scatter(
    G.boltHead(size, h),
    pts.map((p, i) => ({ p, n: N, spin: (i * 0.7) % 1.0 })),
  );
}

/** Rod-like part between two points. */
export function rodBetween(a: V3, b: V3, r: number, mat: THREE.Material, seg = 16): THREE.Mesh {
  return part(G.rod(a, b, r, seg), mat);
}

/** Rounded box of size (w, h, len) whose long axis runs from a to b. */
export function barBetween(a: V3, b: V3, w: number, h: number, mat: THREE.Material, r = 0.006): THREE.Mesh {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const len = d.length();
  const m = part(G.rbox(w, h, len, r, 1), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize());
  return m;
}

/**
 * Handwheel with the axle along X; hub at the origin, rim plane at x = 0, crank grip sticking out
 * towards +X at angle a0 (rad, around X from +Z towards +Y). Mirror (scale.x = -1) for the -X side.
 */
export function handwheel(R: number, a0: number, rim: THREE.Material, hub: THREE.Material, grip: THREE.Material): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const ring = G.torus(R, 0.011, 10, 44);
  ring.rotateY(Math.PI / 2);
  o.push(part(ring, rim));
  o.push(part(cylX(0.03, -0.03, 0.02, 20, 0, 0, 0.004), hub));
  for (let i = 0; i < 3; i++) {
    const a = a0 + Math.PI / 3 + (i * 2 * Math.PI) / 3;
    o.push(part(G.rod([0, Math.sin(a) * 0.025, Math.cos(a) * 0.025], [0, Math.sin(a) * (R - 0.008), Math.cos(a) * (R - 0.008)], 0.008, 10), rim));
  }
  const gy = Math.sin(a0) * R, gz = Math.cos(a0) * R;
  o.push(part(cylX(0.007, 0, 0.02, 12, gy, gz, 0.001), hub));
  o.push(part(G.lathe([[0, 0], [0.012, 0.002], [0.014, 0.02], [0.0125, 0.07], [0.008, 0.078], [0, 0.079]], 16, 50), grip, { p: [0.018, gy, gz], r: [0, 0, -90] }));
  return o;
}
