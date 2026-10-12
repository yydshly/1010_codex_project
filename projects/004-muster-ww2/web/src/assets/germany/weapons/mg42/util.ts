/**
 * Small geometry helpers for the MG 42 model (local to this asset).
 * All inputs in metres. "B-frame" = authoring frame used by the MG 42 parts:
 * z measured forward from the butt plate (z = 0) to the flash-hider face (z = 1.22),
 * y = 0 on the bore axis, +x = the weapon's left side.
 */
import { THREE, G } from '../../../../core/kit';

export type V2 = [number, number];
export type V3 = [number, number, number];

export const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const rad = (d: number) => (d * Math.PI) / 180;

/** Stadium (slot) outline centred at (cu, cv): total length lu along u, height lv along v. */
export function stadium(cu: number, cv: number, lu: number, lv: number, nHalf = 8): V2[] {
  const vertical = lv > lu;
  const L = vertical ? lv : lu, T = vertical ? lu : lv;
  const r = T / 2, half = Math.max(0, L / 2 - r);
  const pts: V2[] = [];
  for (let i = 0; i <= nHalf; i++) {
    const a = -Math.PI / 2 + (i / nHalf) * Math.PI;
    pts.push([half + r * Math.cos(a), r * Math.sin(a)]);
  }
  for (let i = 0; i <= nHalf; i++) {
    const a = Math.PI / 2 + (i / nHalf) * Math.PI;
    pts.push([-half + r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts.map(([a, b]) => (vertical ? [cu - b, cv + a] : [cu + a, cv + b]) as V2);
}

/** Ellipse outline. */
export function ellipse(cu: number, cv: number, ru: number, rv: number, n = 20): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cu + ru * Math.cos(a), cv + rv * Math.sin(a)]);
  }
  return pts;
}

/** Rounded rectangle outline (CCW), corner radius r, n points per corner. */
export function roundRect(cu: number, cv: number, w: number, h: number, r: number, n = 5): V2[] {
  const pts: V2[] = [];
  const rr = Math.min(r, w / 2 - 1e-5, h / 2 - 1e-5);
  const cs: [number, number, number][] = [
    [cu + w / 2 - rr, cv - h / 2 + rr, -90],
    [cu + w / 2 - rr, cv + h / 2 - rr, 0],
    [cu - w / 2 + rr, cv + h / 2 - rr, 90],
    [cu - w / 2 + rr, cv - h / 2 + rr, 180],
  ];
  for (const [x, y, a0] of cs) {
    for (let i = 0; i <= n; i++) {
      const a = rad(a0 + (i / n) * 90);
      pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]);
    }
  }
  return pts;
}

/**
 * Extruded panel from an outline with holes. Orientation like G.plate:
 *  'zy': outline (u -> Z, v -> Y), thickness along X
 *  'xz': outline (u -> X, v -> Z), thickness along Y
 *  'xy': outline (u -> X, v -> Y), thickness along Z
 */
export function panel(outline: V2[], holes: V2[][], t: number, plane: 'zy' | 'xz' | 'xy', bevel = 0.0004, bevelSegments = 1): THREE.BufferGeometry {
  const sh = G.shape(outline, 0, holes);
  const b = Math.max(0, Math.min(bevel, t / 2 - 1e-5));
  const g0 = new THREE.ExtrudeGeometry(sh, {
    depth: Math.max(1e-5, t - 2 * b),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b,
    bevelSegments,
    curveSegments: 4,
  });
  g0.translate(0, 0, -(t - 2 * b) / 2);
  const g = G.crease(g0, 40);
  if (plane === 'xy') return g;
  const m = new THREE.Matrix4();
  if (plane === 'zy') m.set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
  else m.set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  g.applyMatrix4(m);
  G.flipWinding(g);
  return g;
}

/** Lathe around the +Z axis from a profile of [radius, z] points. */
export function latheZ(profile: V2[], seg = 32, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg);
  g.rotateX(Math.PI / 2); // lathe Y -> +Z
  return g;
}

/** Rotate a geometry so its local +Y points along dir. */
export function alignY(g: THREE.BufferGeometry, dir: THREE.Vector3): THREE.BufferGeometry {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  g.applyQuaternion(q);
  return g;
}

/** Offset vertices by a function of their position (mutates, recomputes nothing but normals). */
export function warp(g: THREE.BufferGeometry, fn: (p: THREE.Vector3) => void, recomputeNormals = false): THREE.BufferGeometry {
  const pos = g.attributes.position as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    fn(p);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  if (recomputeNormals) g.computeVertexNormals();
  return g;
}

/** Cylinder along +Z centred at the origin. */
export function cylZ(r: number, len: number, seg = 16, rEnd?: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rEnd ?? r, r, len, seg, 1, false);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Cylinder along +X centred at the origin. */
export function cylX(r: number, len: number, seg = 12): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
  g.rotateZ(Math.PI / 2);
  return g;
}

/**
 * Slotted screw: domed head along +Y (base at y = 0) plus a dark slot bar sunk into the dome.
 * Returns a group placed with `pl` (use r to aim +Y out of the surface).
 */
export function slottedScrew(
  r: number,
  h: number,
  headMat: THREE.Material,
  slotMat: THREE.Material,
  pl: { p: V3; r?: V3 },
  slotAngle = 30,
): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(screwHead(r, h), headMat));
  const slot = new THREE.Mesh(new THREE.BoxGeometry(r * 1.85, h * 0.7, Math.max(0.0005, r * 0.22)), slotMat);
  slot.position.y = h * 0.72;
  slot.rotation.y = rad(slotAngle);
  g.add(slot);
  g.position.set(...pl.p);
  if (pl.r) g.rotation.set(rad(pl.r[0]), rad(pl.r[1]), rad(pl.r[2]));
  return g;
}

/** Domed screw head along +Y (base at y = 0). */
export function screwHead(r: number, h: number, seg = 16): THREE.BufferGeometry {
  const prof: V2[] = [
    [0, 0],
    [r, 0],
    [r, h * 0.35],
    [r * 0.82, h * 0.85],
    [r * 0.45, h],
    [0, h],
  ];
  return G.lathe(prof, seg, 50);
}
