/**
 * Worked examples of the US web-gear API on a MOCK torso (no body): the belts built on the default
 * waist loop, M1910 items hung from named eyelet slots, loop pouches on the pistol belt, the M1928
 * haversack behind with its shoulder straps hooked into the belt's top eyelets, M1936 suspenders.
 * Used by the hidden review sheet; the infantry author does the same with fit.beltPath /
 * fit.strapPath / fit.mountFrame on the real figure.
 *
 * Frame: belt centre line at y = 0 (the waist loop), soldier facing +Z, +X = the wearer's left.
 * Mock body: waist ellipse 0.165 x 0.125 m, shoulder tops at (+-0.135, 0.43, 0).
 */
import { THREE, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { buildM1923BeltAlong, buildM1937BarBeltAlong, buildM1936PistolBeltAlong, defaultWaistPath, type BeltRig } from './belts';
import { buildM1910Canteen } from './canteen';
import { buildFirstAidPouch, buildThompsonPouch } from './pouches';
import { buildM1Bayonet } from './bayonet';
import { buildM1943EntrenchingTool } from './etool';
import { buildM1928Haversack, ETOOL_CLEAR, BAYONET_CLEAR } from './haversack';
import { buildM1936SuspendersAlong, buildHaversackStrapsAlong, buildWebStrapAlong, type StrapPath } from './straps';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Place a piece at a frame (optionally pushed out along the frame's Z / swung out at the bottom). */
function hang(p: GearPiece, m: THREE.Matrix4, push = 0, swingDeg = 0): THREE.Object3D {
  const holder = group([p.object]);
  const local = new THREE.Matrix4().makeTranslation(0, 0, push).multiply(new THREE.Matrix4().makeRotationX((-swingDeg * Math.PI) / 180));
  holder.applyMatrix4(m.clone().multiply(local));
  holder.name = `gear:${p.id}`;
  return holder;
}

const posOf = (m: THREE.Matrix4) => new THREE.Vector3().setFromMatrixPosition(m);

/** Mock strap path through control points; normals radial from the body axis (up on the shoulder). */
function mockPath(ctrl: THREE.Vector3[]): StrapPath {
  const c = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  const points = c.getSpacedPoints(Math.ceil(c.getLength() / 0.01));
  const normals = points.map((p) => {
    const radial = V(p.x, 0, p.z).normalize();
    const up = THREE.MathUtils.smoothstep(p.y, 0.33, 0.43);
    return radial.multiplyScalar(1 - up * 0.8).add(V(0, up, 0)).normalize();
  });
  return { points, normals };
}

/** Over-the-shoulder path from a front eyelet to a point on the back (side s: +1 = wearer's left). */
function overShoulder(front: THREE.Matrix4, s: number, backEnd: THREE.Vector3): StrapPath {
  const f = posOf(front);
  return mockPath([
    f.clone().add(V(0, 0.045, 0.004)),
    V(s * 0.1, 0.2, 0.15),
    V(s * 0.12, 0.35, 0.1),
    V(s * 0.135, 0.435, 0.0),
    V(s * 0.11, 0.37, -0.125),
    backEnd,
  ]);
}

function wrap(id: string, name: string, parts: THREE.Object3D[]): GearPiece {
  const object = group(parts);
  object.name = id;
  const b = new THREE.Box3().setFromObject(object, true);
  const s = b.getSize(new THREE.Vector3());
  return { id, name, object, mount: 'hip', size: { w: s.x, h: s.y, d: s.z } };
}

/** Rifleman: M1923 belt, canteen at the right rear, first-aid pouch front right, bayonet on the pack, M1928 pack with e-tool. */
export function rigRifleman(): GearPiece {
  const rig: BeltRig = buildM1923BeltAlong({ path: defaultWaistPath() });
  const out: THREE.Object3D[] = [rig.object];
  out.push(hang(buildM1910Canteen(), rig.slots.R5, 0, 4));
  out.push(hang(buildFirstAidPouch(), rig.slots.R2, 0.028, 6));
  // haversack on the back: gear frame turned 180 deg about Y, back panel just behind the belt
  const hv = buildM1928Haversack();
  const mHv = new THREE.Matrix4().makeRotationY(Math.PI).setPosition(0, 0.39, -0.131);
  out.push(hang(hv, mHv));
  const bay = buildM1Bayonet();
  out.push(hang(bay, mHv.clone().multiply(hv.slots.bayonet), BAYONET_CLEAR));
  const et = buildM1943EntrenchingTool();
  out.push(hang(et, mHv.clone().multiply(hv.slots.etool), ETOOL_CLEAR));
  // shoulder straps from the pack's stubs over the shoulders to the belt's top eyelets L2 / R2
  const a = (hv.strapAnchors ?? []).map((p) => p.clone().applyMatrix4(mHv));
  const [aR, aL] = [a[0], a[1]]; // gear +X = wearer's right after the 180 deg turn
  const strapTo = (anchor: THREE.Vector3, eye: THREE.Matrix4, s: number): StrapPath =>
    mockPath([anchor, V(s * 0.125, 0.43, -0.04), V(s * 0.135, 0.435, 0.02), V(s * 0.12, 0.35, 0.1), V(s * 0.1, 0.2, 0.15), posOf(eye).add(V(0, 0.05, 0.006))]);
  out.push(buildHaversackStrapsAlong({ left: strapTo(aL, rig.top.L2, 1), right: strapTo(aR, rig.top.R2, -1), hooks: [rig.top.L2, rig.top.R2] }));
  // the pack's belt strap down to the belt's rear eyelet
  const bs = a[2];
  out.push(buildWebStrapAlong({ ...mockPath([bs, bs.clone().add(V(0, -0.01, 0.001)), posOf(rig.top.rear).add(V(0, 0.04, -0.004))]), width: 0.024, hookEnd: rig.top.rear, name: 'm1928-belt-strap' }));
  return wrap('demo-us-rifleman-rig', 'Rifleman rig (demo)', out);
}

/** BAR gunner: M1937 BAR belt with M1936 suspenders, canteen and first-aid pouch on the rear section. */
export function rigBarGunner(): GearPiece {
  // a slightly fuller waist (0.98 m): the BAR belt's rear section then takes both items
  const rig = buildM1937BarBeltAlong({ path: defaultWaistPath(0.175, 0.135) });
  const out: THREE.Object3D[] = [rig.object];
  out.push(hang(buildM1910Canteen(), rig.slots['rear-R'], 0, 3));
  out.push(hang(buildFirstAidPouch(), rig.slots['rear-L'], 0, 3));
  const back = (s: number) => posOf(rig.top[(s > 0 ? 'R' : 'L') + '3']).add(V(0, 0.045, -0.004));
  out.push(
    buildM1936SuspendersAlong({
      left: overShoulder(rig.top.L1, 1, back(1)),
      right: overShoulder(rig.top.R1, -1, back(-1)),
      frontHooks: [rig.top.L1, rig.top.R1],
      rearHooks: [rig.top.R3, rig.top.L3],
    }),
  );
  return wrap('demo-us-bar-rig', 'BAR gunner rig (demo)', out);
}

/** Squad leader: M1936 pistol belt, two Thompson pouches, first-aid pouch, canteen, M1936 suspenders. */
export function rigSquadLeader(): GearPiece {
  const rig = buildM1936PistolBeltAlong({ path: defaultWaistPath() });
  const out: THREE.Object3D[] = [rig.object];
  for (const d of [0.1, -0.1]) out.push(hang(buildThompsonPouch(), rig.loopMount(d)));
  out.push(hang(buildFirstAidPouch(), rig.slots.L8, 0, 4));
  out.push(hang(buildM1910Canteen(), rig.slots.R11, 0, 4));
  const topName = (side: string, d: number) => `${side}${Math.round((d - 0.045) / 0.025) + 1}`;
  const fl = topName('L', 0.17), fr = topName('R', 0.17), rl = topName('L', 0.37), rr = topName('R', 0.37);
  const back = (n: string) => posOf(rig.top[n]).add(V(0, 0.045, -0.004));
  out.push(
    buildM1936SuspendersAlong({
      left: overShoulder(rig.top[fl], 1, back(rr)),
      right: overShoulder(rig.top[fr], -1, back(rl)),
      frontHooks: [rig.top[fl], rig.top[fr]],
      rearHooks: [rig.top[rr], rig.top[rl]],
    }),
  );
  return wrap('demo-us-squad-leader-rig', 'Squad leader rig (demo)', out);
}

/** The M1936 suspenders laid out flat (review). */
export function suspendersLaidOut(): GearPiece {
  const flat = (pts: [number, number][]): StrapPath => {
    // laid across the board (length along X) so the review sheet packs tightly
    const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(z, 0.0016, x)), false, 'centripetal');
    const points = c.getSpacedPoints(Math.ceil(c.getLength() / 0.01));
    return { points, normals: points.map(() => V(0, 1, 0)) };
  };
  const L: [number, number][] = [
    [0.075, 0.4],
    [0.08, 0.22],
    [0.085, 0.04],
    [0.05, -0.09],
    [0, -0.19],
    [-0.05, -0.29],
    [-0.075, -0.4],
  ];
  const obj = buildM1936SuspendersAlong({ left: flat(L), right: flat(L.map(([x, z]) => [-x, z])) });
  return wrap('us-m1936-suspenders', 'M1936 suspenders (laid out)', [obj]);
}
