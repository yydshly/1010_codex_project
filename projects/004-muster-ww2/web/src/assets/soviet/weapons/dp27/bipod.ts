/**
 * DP-27 bipod (D-frame, see layout.ts): split collar clamped round the casing with the wing screw on
 * the right, a yoke under it carrying the transverse leg pin, two round legs with a stop shoe near the
 * top and pointed spade feet. 'folded' = legs swung back under the casing (feet towards the receiver,
 * spades lying flat); 'deployed' = legs down, raked forward and splayed.
 */
import { THREE, G, part } from '../../../../core/kit';
import { DP } from './layout';
import type { P2 } from './geo';
import { dpMat } from './materials';
import { sidePlate, cylX, latheZ, ringProfile, orient } from '../common/geo';

export type BipodState = 'folded' | 'deployed';

/** Deployed leg geometry in the gun frame: forward rake and outward splay (degrees). */
export const BIPOD_RAKE = 12;
export const BIPOD_SPLAY = 17;

export interface LegPose {
  pivot: THREE.Vector3;
  dir: THREE.Vector3;
  /** unit vector across the spade (in the plane of the foot) */
  across: THREE.Vector3;
  foot: THREE.Vector3;
}

export function legPoses(state: BipodState): LegPose[] {
  const out: LegPose[] = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Vector3(s * DP.pivotX, DP.pivotY, DP.clampZ);
    let dir: THREE.Vector3;
    if (state === 'folded') dir = new THREE.Vector3(0, 0.018, -1).normalize();
    else {
      const rk = (BIPOD_RAKE * Math.PI) / 180, sp = (BIPOD_SPLAY * Math.PI) / 180;
      dir = new THREE.Vector3(s * Math.sin(sp), -Math.cos(sp) * Math.cos(rk), Math.cos(sp) * Math.sin(rk)).normalize();
    }
    // the spade plane contains the leg and the gun's transverse axis
    const across = new THREE.Vector3(1, 0, 0).addScaledVector(dir, -dir.x).normalize();
    out.push({ pivot, dir, across, foot: pivot.clone().addScaledVector(dir, DP.legLen) });
  }
  return out;
}

/** Leg segments for the sling collision field. */
export function legSegments(state: BipodState): [THREE.Vector3, THREE.Vector3][] {
  return legPoses(state).map((l) => [l.pivot.clone(), l.foot.clone()] as [THREE.Vector3, THREE.Vector3]);
}

export function buildBipod(state: BipodState): THREE.Object3D[] {
  const m = dpMat.bipod();
  const bare = dpMat.bare();
  const parts: THREE.Object3D[] = [];
  const z0 = DP.clampZ - DP.clampW / 2, z1 = DP.clampZ + DP.clampW / 2;

  // --- split collar round the casing ---
  parts.push(part(latheZ(ringProfile(DP.casingR - 0.0003, 0.0247, z0, z1, 0.0009), 44), m));
  // hinge knuckle on the left, clamping ears + wing screw on the right
  parts.push(part(G.rbox(0.0062, 0.009, DP.clampW - 0.004, 0.0024, 2), m, { p: [0.0252, 0.0045, DP.clampZ] }));
  for (const y of [0.0038, -0.0038]) parts.push(part(G.rbox(0.011, 0.0048, DP.clampW - 0.006, 0.0014, 2), m, { p: [-0.0275, y, DP.clampZ] }));
  parts.push(part(G.rod([-0.0275, 0.0125, DP.clampZ], [-0.0275, -0.0095, DP.clampZ], 0.0022, 10), bare));
  // wing nut on top of the ears
  parts.push(part(G.cyl(0.0042, 0.0046, 0.0055, 16), m, { p: [-0.0275, 0.0092, DP.clampZ] }));
  for (const s of [-1, 1]) {
    parts.push(part(G.rbox(0.0026, 0.0075, 0.0105, 0.001, 1), m, { p: [-0.0275, 0.0118, DP.clampZ + s * 0.0085], r: [s * -14, 0, 0] }));
  }

  // --- yoke under the collar (around the guide tube), carrying the leg pin ---
  const yoke: P2[] = [
    [z0 + 0.001, -0.014],
    [z1 - 0.001, -0.014],
    [z1 - 0.001, -0.0425],
    [z1 - 0.005, -0.0505],
    [z0 + 0.005, -0.0505],
    [z0 + 0.001, -0.0425],
  ];
  parts.push(part(sidePlate(yoke, 0.0232, 0, 0.0016), m));
  parts.push(part(cylX(0.0031, -DP.pivotX - 0.0068, DP.pivotX + 0.0068, 14, 0.0004), bare, { p: [0, DP.pivotY, DP.clampZ] }));
  for (const s of [-1, 1]) parts.push(part(G.lathe([[0, 0], [0.0042, 0], [0.004, 0.0009], [0.0026, 0.0016], [0, 0.0017]], 14, 40), m, { p: [s * (DP.pivotX + 0.0066), DP.pivotY, DP.clampZ], r: [0, 0, -90 * s] }));

  // --- legs ---
  for (const L of legPoses(state)) {
    const { pivot, dir, across } = L;
    const at = (d: number) => pivot.clone().addScaledVector(dir, d);
    // knuckle: flattened block round the pin, oriented along the leg
    const kn = G.rbox(0.0082, 0.0275, 0.0145, 0.0035, 2);
    const knQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, dir.clone().negate(), across.clone().cross(dir.clone().negate()).normalize()));
    kn.applyQuaternion(knQ);
    const kc = at(0.0075);
    kn.translate(kc.x, kc.y, kc.z);
    parts.push(part(kn, m));
    // leg rod (tapering slightly towards the foot)
    parts.push(part(G.rod(at(0.012), at(DP.legLen - 0.03), 0.0051, 14, 0.0046), m));
    // stop shoe (length limiter) near the top
    parts.push(part(orient(G.cyl(0.0068, 0.0068, 0.012, 16), at(0.05), dir), m));
    // foot socket and the pointed spade
    parts.push(part(orient(G.cyl(0.0058, 0.0064, 0.016, 16), at(DP.legLen - 0.034), dir), m));
    const spade: P2[] = [
      [-0.0085, 0.0],
      [0.0085, 0.0],
      [0.0098, 0.018],
      [0.0035, 0.03],
      [0.0, 0.0335],
      [-0.0035, 0.03],
      [-0.0098, 0.018],
    ];
    const sg = G.extrude(G.shape(spade), 0.0028, 0.0008, 6, 1);
    // local: x = across, y = along the leg, z = spade normal
    const nrm = across.clone().cross(dir).normalize();
    sg.applyMatrix4(new THREE.Matrix4().makeBasis(across, dir, nrm));
    const sp = at(DP.legLen - 0.0335);
    sg.translate(sp.x, sp.y, sp.z);
    parts.push(part(sg, m));
  }
  // spring catch on the left leg that holds the folded legs together
  if (state === 'folded') {
    const L = legPoses(state)[1];
    const c = L.pivot.clone().addScaledVector(L.dir, DP.legLen - 0.06);
    parts.push(part(G.rbox(0.0305, 0.0034, 0.009, 0.0012, 1), bare, { p: [c.x - DP.pivotX, c.y - 0.0052, c.z] }));
  }
  return parts;
}

/** Bipod pivot (D-frame) for sockets. */
export const BIPOD_PIVOT = new THREE.Vector3(0, DP.pivotY, DP.clampZ);
