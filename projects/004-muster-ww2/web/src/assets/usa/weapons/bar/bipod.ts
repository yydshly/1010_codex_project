/**
 * BAR M1918A2 bipod (B-frame, see dims.ts): bearing collar round the barrel just behind the flash
 * hider (it is free to turn on the barrel), a yoke under it with a hinge pin and a locking wing nut for
 * each leg, two tubular legs with a telescoping inner leg locked by a wing-nut clamp, and the skid
 * ("sled") feet on cross pins.
 *
 *  'folded'    legs swung back along both sides of the gas cylinder, the skid feet standing edge-up
 *              beside the front sling swivel, just ahead of the hand guard
 *  'deployed'  legs down, raked forward and splayed; the skid feet lie flat on the ground plane for
 *              the gun resting on its feet and the toe of the butt (see bipodGroundPitch)
 *  'none'      bipod removed (common in the field to save weight); the flash hider stays
 */
import { THREE, G, part } from '../../../../core/kit';
import { V, basis, latheZ, cylX, plateZY, type V2 } from '../common/geo';
import { BD, BSTOCK, barrelR } from './dims';
import type { BarMats } from './materials';

export type BarBipod = 'folded' | 'deployed' | 'none';

export const BIPOD_RAKE = 12;
export const BIPOD_SPLAY = 17;
const YOKE_HW = 0.0082;
const KNUCKLE_T = 0.0068;
const FOOT = { len: 0.066, w: 0.021, t: 0.003, pinH: 0.0095 };

export interface LegPose {
  side: 1 | -1;
  pivot: THREE.Vector3;
  dir: THREE.Vector3;
  /** pin of the skid foot at the end of the leg */
  end: THREE.Vector3;
  /** foot frame: up (away from the ground face), along (long axis) */
  footUp: THREE.Vector3;
  footAlong: THREE.Vector3;
}

/** Lowest rear point of the gun (toe of the butt plate) in the B-frame. */
export function buttToe(): THREE.Vector3 {
  const s = BSTOCK.at(BSTOCK.z0);
  return V(0, s.yBot - 0.0012, BSTOCK.z0 - 0.0008);
}

/** Local "up" of the ground plane for the gun pitched nose-up by `pitch` (radians). */
export const groundUp = (pitch: number) => V(0, Math.cos(pitch), Math.sin(pitch));

export function legPoses(state: 'folded' | 'deployed', pitch = 0): LegPose[] {
  const out: LegPose[] = [];
  for (const s of [1, -1] as const) {
    const pivot = V(s * (YOKE_HW + KNUCKLE_T / 2), BD.pivotY, BD.pivotZ);
    let dir: THREE.Vector3, up: THREE.Vector3, along: THREE.Vector3;
    if (state === 'folded') {
      dir = V(s * 0.06, 0.03, -1).normalize();
      along = dir.clone();
      up = V(0, 1, 0).addScaledVector(dir, -dir.y).normalize();
    } else {
      const rk = (BIPOD_RAKE * Math.PI) / 180, sp = (BIPOD_SPLAY * Math.PI) / 180;
      dir = V(s * Math.sin(sp), -Math.cos(sp) * Math.cos(rk), Math.cos(sp) * Math.sin(rk)).normalize();
      up = groundUp(pitch);
      along = V(0, 0, 1).addScaledVector(up, -up.z).normalize();
    }
    out.push({ side: s, pivot, dir, end: pivot.clone().addScaledVector(dir, BD.legLen), footUp: up, footAlong: along });
  }
  return out;
}

/** Bottom (ground contact) of a skid foot. */
export const footBottom = (l: LegPose) => l.end.clone().addScaledVector(l.footUp, -(FOOT.pinH + FOOT.t));

/** Nose-up pitch (radians) at which the skid feet and the toe of the butt touch one ground plane. */
export function bipodGroundPitch(): number {
  let p = 0;
  const T = buttToe();
  for (let i = 0; i < 6; i++) {
    const F = footBottom(legPoses('deployed', p)[0]);
    p = Math.atan2(T.y - F.y, F.z - T.z);
  }
  return p;
}

/** Leg frame: +Y towards the pivot (against dir), +X outwards, origin at the pivot. */
function legFrame(l: LegPose): THREE.Matrix4 {
  const ey = l.dir.clone().negate();
  const ex = V(l.side, 0, 0).addScaledVector(ey, -l.side * ey.x).normalize();
  const ez = ex.clone().cross(ey).normalize();
  return basis(ex, ey, ez, l.pivot);
}

function footFrame(l: LegPose): THREE.Matrix4 {
  const up = l.footUp.clone().normalize();
  const along = l.footAlong.clone().addScaledVector(up, -l.footAlong.dot(up)).normalize();
  const across = up.clone().cross(along).normalize();
  return basis(across, up, along, l.end.clone().addScaledVector(up, -FOOT.pinH));
}

const place = (g: THREE.BufferGeometry, mat: THREE.Material, M4: THREE.Matrix4) => part(g.applyMatrix4(M4), mat);

/** Wing nut on an axis along local +Y (base at y = 0). */
function wingNut(): THREE.BufferGeometry[] {
  const boss = G.lathe([[0, 0], [0.0036, 0], [0.0036, 0.0012], [0.003, 0.0052], [0, 0.0056]], 16, 40);
  const wings: THREE.BufferGeometry[] = [];
  for (const sx of [1, -1]) {
    const o: V2[] = [[0.0026, 0.0008], [0.0112, 0.0026], [0.0122, 0.0072], [0.0106, 0.0094], [0.0082, 0.0086], [0.0026, 0.0052]];
    const w = plateZY(o.map(([a, b]) => [a, b] as V2), 0.0014, [], 0.0004);
    // plateZY lies in (z, y); turn it so the wing spreads along x
    w.rotateY(Math.PI / 2);
    if (sx < 0) w.rotateY(Math.PI);
    wings.push(w);
  }
  return [boss, ...wings];
}

export function buildBarBipod(m: BarMats, state: BarBipod, pitch = 0, hi = true): THREE.Object3D[] {
  if (state === 'none') return [];
  const out: THREE.Object3D[] = [];
  const z0 = BD.bearingZ0, z1 = BD.bearingZ1;
  const br = barrelR(BD.pivotZ);
  // ---- bearing collar with a small clamp screw on top, yoke under it
  out.push(part(latheZ([[br, z0], [0.0162, z0], [0.0172, z0 + 0.0012], [0.0172, z1 - 0.0012], [0.0162, z1], [br, z1]], 44, 35), m.parkDark));
  out.push(part(G.cyl(0.0034, 0.0034, 0.0026, 16), m.parkDark, { p: [0, 0.0178, (z0 + z1) / 2] }));
  out.push(part(G.box(0.0056, 0.0008, 0.0009), m.recess, { p: [0, 0.0191, (z0 + z1) / 2] }));
  const yoke: V2[] = [[z0 + 0.0015, -0.012], [z1 - 0.0015, -0.012], [z1 - 0.0022, BD.pivotY + 0.004], [BD.pivotZ + 0.0062, BD.pivotY - 0.0052], [BD.pivotZ, BD.pivotY - 0.0076], [BD.pivotZ - 0.0062, BD.pivotY - 0.0052], [z0 + 0.0022, BD.pivotY + 0.004]];
  out.push(part(plateZY(yoke, 2 * YOKE_HW, [], 0.0009), m.parkDark));

  const legs = legPoses(state, pitch);
  const segs = hi ? 28 : 14;
  for (const l of legs) {
    const F = legFrame(l);
    const L = BD.legLen;
    // hinge pin through yoke + knuckle, locking wing nut outside
    const pinG = cylX(0.0022, 2 * YOKE_HW + KNUCKLE_T + 0.004, 12);
    out.push(part(pinG, m.blued, { p: [l.side * ((2 * YOKE_HW + KNUCKLE_T + 0.004) / 2 - 0.0002), BD.pivotY, BD.pivotZ] }));
    for (const g of wingNut()) {
      g.rotateZ(-l.side * Math.PI / 2); // +Y -> outward (+-X)
      g.translate(l.side * (YOKE_HW + KNUCKLE_T + 0.0004), BD.pivotY, BD.pivotZ);
      out.push(part(g, m.parkDark));
    }
    // knuckle: flat tongue round the pin blending into the leg tube (leg frame: +Y up the leg)
    const kn: V2[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (i / 12);
      kn.push([0.0068 * Math.cos(a), 0.0068 * Math.sin(a)]);
    }
    kn.push([-0.0056, -0.028], [0.0056, -0.028]);
    // outline is (z, y) for plateZY: map [u, v] -> z = u, y = v
    out.push(place(plateZY(kn, KNUCKLE_T, [], 0.0008), m.parkDark, F));
    // upper leg tube with a turned collar at each end, the clamp + wing nut, the inner leg
    const up = latheZ([[0, 0], [0.0062, 0], [0.0062, 0.006], [0.0056, 0.0075], [0.0056, 0.168], [0.0066, 0.17], [0.0072, 0.172], [0.0072, 0.186], [0.0062, 0.188], [0, 0.188]], segs, 40);
    up.rotateX(Math.PI / 2); // +Z -> -Y (down the leg)
    up.translate(0, -0.022, 0);
    out.push(place(up, m.park, F));
    for (const g of wingNut()) {
      g.rotateZ(-Math.PI / 2); // +Y -> +X (outwards in the leg frame)
      g.translate(0.0071, -0.022 - 0.179, 0);
      out.push(place(g, m.parkDark, F));
    }
    const inner = latheZ([[0, 0], [0.0045, 0], [0.0045, L - 0.206], [0.0041, L - 0.203], [0, L - 0.203]], segs, 40);
    inner.rotateX(Math.PI / 2);
    inner.translate(0, -0.205, 0);
    out.push(place(inner, m.parkDark, F));
    // ---- skid foot (foot frame: x across = pin axis, y up, z along the runner; origin = runner top)
    const FF = footFrame(l);
    // flattened end tongue of the inner leg on the foot pin (in the plane of the leg, across the pin)
    {
      const ex = V().setFromMatrixColumn(FF, 0);
      const ey = l.dir.clone().negate().addScaledVector(ex, l.dir.dot(ex)).normalize();
      const ez = ex.clone().cross(ey).normalize();
      const TF = basis(ex, ey, ez, l.end);
      const tg: V2[] = [];
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI + Math.PI * (i / 10);
        tg.push([0.0046 * Math.cos(a), 0.0046 * Math.sin(a)]);
      }
      tg.push([0.0044, 0.013], [-0.0044, 0.013]);
      out.push(place(plateZY(tg, 0.0056, [], 0.0006), m.parkDark, TF));
    }
    const pts: THREE.Vector3[] = [];
    const half = FOOT.len / 2;
    for (let i = 0; i <= 16; i++) {
      const z = -half + (FOOT.len * i) / 16;
      const e = Math.max(0, Math.abs(z) - (half - 0.012)) / 0.012;
      pts.push(V(0, -FOOT.t / 2 + 0.0045 * e * e, z));
    }
    const nrm = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const t = b.clone().sub(a).normalize();
      return V(1, 0, 0).cross(t).normalize();
    });
    out.push(place(G.strap(pts, FOOT.w, FOOT.t, nrm, { samples: 40 }), m.parkDark, FF));
    // pressed centre rib on the runner, the fork lugs and the cross pin
    out.push(place(G.rbox(0.006, 0.0012, FOOT.len - 0.026, 0.0004, 1), m.parkDark, FF.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.0004, 0))));
    for (const sx of [1, -1]) {
      const lug: V2[] = [[-0.009, 0.0002], [0.009, 0.0002], [0.0052, FOOT.pinH - 0.0005]];
      for (let i = 0; i <= 8; i++) {
        const a = (Math.PI * i) / 8;
        lug.push([0.0045 * Math.cos(a), FOOT.pinH + 0.0045 * Math.sin(a)]);
      }
      lug.push([-0.0052, FOOT.pinH - 0.0005]);
      const lg = plateZY(lug, 0.0022, [], 0.0005);
      lg.translate(sx * 0.0052, 0, 0);
      out.push(place(lg, m.parkDark, FF));
    }
    out.push(place(cylX(0.0017, 0.0158, 12), m.blued, FF.clone().multiply(new THREE.Matrix4().makeTranslation(0, FOOT.pinH, 0))));
  }
  return out;
}

/** Leg segments (B-frame) for obstacle / collision checks. */
export function legSegments(state: 'folded' | 'deployed', pitch = 0): [THREE.Vector3, THREE.Vector3][] {
  return legPoses(state, pitch).map((l) => [l.pivot.clone(), l.end.clone()] as [THREE.Vector3, THREE.Vector3]);
}
