/**
 * Spitfire LF Mk IXc tail: elliptical tailplane with separate elevators, fin with the standard
 * (rounded) rudder - real hinge gaps - and the fixed castoring tail wheel.
 * Surfaces are authored in the BODY frame; the tail wheel in the ASSET frame so it meets y = 0.
 */
import * as THREE from 'three';
import { part, group } from '../../../core/kit';
import { crease } from '../../../core/geo/shapes';
import { curve, gridGeo, lerp, nacaT, cosSpace, bar, cylAB, latheY, tint, type P2 } from './geom';
import { B, DIM, toAsset, fuseYBot } from './frame';
import { skin, P } from './paint';

interface Station {
  le: number;
  te: number;
  hinge: number;
  t: number;
  at: (s: number, off: number) => THREE.Vector3;
}

const GAP = 0.004;

/** Fixed part: LE -> hinge, closed by a flat hinge face. */
function fixedRing(st: Station, n = 22): THREE.Vector3[] {
  const c = st.te - st.le;
  const uh = Math.min(1, Math.max(0.02, (st.hinge - st.le) / c));
  const us = cosSpace(n).map((v) => v * uh);
  const half = (u: number) => Math.max(0.0006, nacaT(u, st.t) * c);
  const ring: THREE.Vector3[] = [];
  for (let k = us.length - 1; k >= 0; k--) ring.push(st.at(st.le + us[k] * c, half(us[k])));
  for (let k = 1; k < us.length; k++) ring.push(st.at(st.le + us[k] * c, -half(us[k])));
  const hh = half(uh);
  for (let k = 1; k <= 3; k++) ring.push(st.at(st.le + uh * c, -hh + (2 * hh * k) / 4));
  return ring;
}

/** Moving part: rounded nose just behind the hinge -> TE. */
function movingRing(st: Station, n = 20): THREE.Vector3[] {
  const c = st.te - st.le;
  const half = (u: number) => Math.max(0.0006, nacaT(u, st.t) * c);
  const uh = Math.min(0.995, Math.max(0, (st.hinge - st.le) / c));
  let r = half(uh);
  let sc = st.hinge + GAP + r;
  r = Math.min(r, half(Math.min(0.999, (sc - st.le) / c)));
  sc = Math.min(st.te - 0.002, st.hinge + GAP + r);
  const uc = Math.min(0.999, (sc - st.le) / c);
  const ring: THREE.Vector3[] = [];
  const NN = 9;
  for (let k = 0; k <= NN; k++) {
    const a = Math.PI / 2 + (k / NN) * Math.PI;
    ring.push(st.at(sc + r * Math.cos(a), r * Math.sin(a)));
  }
  const us = cosSpace(n).map((v) => uc + (1 - uc) * v).slice(1);
  for (const u of us) ring.push(st.at(st.le + u * c, -Math.min(r, half(u))));
  for (let k = us.length - 2; k >= 0; k--) ring.push(st.at(st.le + us[k] * c, Math.min(r, half(us[k]))));
  return ring;
}

function dense(a: number, b: number, n: number, both = false): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const w = both ? (1 - Math.cos(t * Math.PI)) / 2 : Math.sin((t * Math.PI) / 2);
    out.push(lerp(a, b, w));
  }
  return out;
}

// ------------------------------------------------------------- vertical tail
const HINGE_V = 9.06;
const FIN_TOP = 1.175;
const finLE = curve([
  [0.18, 7.8], [0.28, 8.04], [0.38, 8.23], [0.5, 8.39], [0.65, 8.56], [0.8, 8.71], [0.95, 8.85], [1.05, 8.94], [1.12, 9.0], [1.175, 9.045],
]);
const rudTE = curve([
  [-0.12, 9.19], [-0.06, 9.3], [0.04, 9.39], [0.2, 9.452], [0.4, 9.47], [0.6, 9.455], [0.8, 9.405], [0.95, 9.335],
  [1.05, 9.265], [1.12, 9.19], [1.16, 9.12], [1.185, 9.075],
]);
const vStation = (y: number): Station => {
  const le = finLE(Math.max(0.18, Math.min(FIN_TOP, y)));
  return { le: Math.min(le, HINGE_V - 0.002), te: Math.max(rudTE(y), HINGE_V + 0.03), hinge: HINGE_V, t: lerp(0.11, 0.08, Math.max(0, y) / FIN_TOP), at: (s, off) => B(off, y, s) };
};
function fin(): THREE.BufferGeometry {
  const rows = dense(0.18, FIN_TOP - 0.004, 26).map((y) => fixedRing(vStation(y)));
  return crease(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), 40);
}
function rudder(): THREE.BufferGeometry {
  const rows = dense(-0.115, 1.182, 34, true).map((y) => movingRing(vStation(y)));
  return crease(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), 40);
}

// ------------------------------------------------------------- horizontal tail
const Y_TP = 0.1;
const HT = { semi: 1.61, c0: 1.13, k: 0.46, le0: 8.06 };
const hStation = (ax: number): Station => {
  const e = Math.sqrt(Math.max(0.0009, 1 - (ax / HT.semi) ** 2));
  const axis = HT.le0 + HT.k * HT.c0;
  const le = axis - HT.k * HT.c0 * e, te = axis + (1 - HT.k) * HT.c0 * e;
  const hinge = le + 0.66 * (te - le);
  return { le, te, hinge, t: lerp(0.105, 0.08, ax / HT.semi), at: (s, off) => B(ax, Y_TP + off, s) };
};
function stabiliser(): THREE.BufferGeometry {
  const axs: number[] = [];
  for (let a = 0; a < 1.1; a += 0.08) axs.push(a);
  axs.push(...dense(1.1, HT.semi - 0.004, 12));
  return crease(gridGeo(axs.map((ax) => fixedRing(hStation(ax))), { closedU: true, capStart: false, capEnd: true }), 40);
}
function elevator(): THREE.BufferGeometry {
  const axs: number[] = [];
  for (let a = 0.05; a < 1.1; a += 0.08) axs.push(a);
  axs.push(...dense(1.1, HT.semi - 0.006, 12));
  return crease(gridGeo(axs.map((ax) => movingRing(hStation(ax))), { closedU: true, capStart: true, capEnd: true }), 40);
}

/** White tail light at the rudder trailing edge. */
function tailLight(): THREE.Object3D {
  const y = 0.3;
  const p = B(0, y, rudTE(y) + 0.004);
  const g = new THREE.SphereGeometry(1, 14, 10);
  g.scale(0.012, 0.022, 0.014);
  g.translate(p.x, p.y, p.z);
  return part(tint(g, 0xf2efe6), P.lens());
}

export function buildTailSurfaces(): THREE.Object3D {
  const stab = stabiliser(), elev = elevator();
  const port = group([part(stab, skin('TAIL')), part(elev, skin('TAIL'))]);
  const star = group([part(stab.clone(), skin('TAIL')), part(elev.clone(), skin('TAIL'))], { s: [-1, 1, 1] });
  return group([part(fin(), skin('TAIL')), part(rudder(), skin('TAIL')), port, star, tailLight()]);
}

// ------------------------------------------------------------- wheels (asset frame helpers)
function tyreProfile(R: number, w: number, rim: number): P2[] {
  const h = w / 2;
  return [
    [rim, -h * 0.72], [rim + (R - rim) * 0.35, -h * 0.98], [rim + (R - rim) * 0.7, -h * 0.95], [R - 0.012, -h * 0.72],
    [R - 0.002, -h * 0.4], [R, 0], [R - 0.002, h * 0.4], [R - 0.012, h * 0.72], [rim + (R - rim) * 0.7, h * 0.95],
    [rim + (R - rim) * 0.35, h * 0.98], [rim, h * 0.72],
  ];
}

/** Tyre + hub around local +Y (axle), centred at the origin; outer face towards +Y. */
export function wheelParts(R: number, w: number, rim: number, hubMat: THREE.Material, seg = 56, spokes = 0): THREE.Object3D[] {
  const tyre = latheY(tyreProfile(R, w, rim), seg);
  const h = w / 2;
  const hub = latheY(
    ([
      [0.0, h * 0.95], [rim * 0.26, h * 0.95], [rim * 0.32, h * 0.7], [rim * 0.4, h * 0.42], [rim * 0.9, h * 0.4],
      [rim * 1.02, h * 0.62], [rim * 1.03, h * 0.74], [rim * 0.98, h * 0.74], [rim * 0.98, -h * 0.74], [rim * 1.03, -h * 0.74],
      [rim * 1.02, -h * 0.62], [rim * 0.9, -h * 0.5], [rim * 0.5, -h * 0.55], [rim * 0.3, -h * 0.9], [0.0, -h * 0.9],
    ] as P2[]).reverse(),
    seg,
  );
  const out: THREE.Object3D[] = [part(tyre, P.rubber()), part(hub, hubMat)];
  // raised spokes on the outer face
  for (let k = 0; k < spokes; k++) {
    const a = (k / spokes) * Math.PI * 2 + Math.PI / 4;
    const g = new THREE.BoxGeometry(rim * 0.62, 0.012, 0.035);
    g.translate(rim * 0.58, h * 0.46, 0);
    g.rotateY(a);
    out.push(part(g, hubMat));
  }
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const b = new THREE.CylinderGeometry(0.0065, 0.0065, 0.012, 8);
    b.translate(Math.cos(a) * rim * 0.2, h * 0.95, Math.sin(a) * rim * 0.2);
    out.push(part(b, P.steel()));
  }
  return out;
}

/** Bake wheel parts through matrix m; tyre vertices below y = 0 are flattened (contact patch). */
export function placeWheel(parts: THREE.Object3D[], m: THREE.Matrix4): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  for (const o of parts) {
    const mesh = o as THREE.Mesh;
    const g = mesh.geometry.clone();
    mesh.updateMatrix();
    g.applyMatrix4(mesh.matrix);
    g.applyMatrix4(m);
    if (mesh.material === P.rubber()) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, 0);
      g.computeVertexNormals();
    }
    out.push(part(g, mesh.material as THREE.Material));
  }
  return group(out);
}

/** Fixed castoring tail wheel (Mk IX). */
export function buildTailWheel(): THREE.Object3D {
  const R = DIM.tailTyre.r, W = DIM.tailTyre.w;
  const s = DIM.tailAttach.s;
  const att = toAsset(B(0, fuseYBot(s, 0) + 0.02, s));
  const top = toAsset(B(0, fuseYBot(s, 0) + 0.12, s));
  const axle = new THREE.Vector3(0, R - 0.004, att.z - 0.09);
  const crown = new THREE.Vector3(0, 2 * R + 0.05, att.z - 0.035);
  const out: THREE.Object3D[] = [];
  // leg from inside the fuselage to the fork crown, with a leather/rubber gaiter at the skin
  out.push(part(cylAB(top, crown, 0.024, 0.022, 16), P.msg()));
  const legDir = crown.clone().sub(top).normalize();
  out.push(part(cylAB(att.clone().addScaledVector(legDir, -0.01), att.clone().addScaledVector(legDir, 0.05), 0.04, 0.03, 16), P.black()));
  out.push(part(cylAB(crown.clone().addScaledVector(legDir, -0.1), crown.clone().addScaledVector(legDir, -0.02), 0.03, 0.03, 16), P.oleo()));
  // fork
  out.push(part(bar(crown.clone().add(new THREE.Vector3(-0.07, 0, 0)), crown.clone().add(new THREE.Vector3(0.07, 0, 0)), 0.045, 0.03, new THREE.Vector3(0, 1, 0), 0, 0.008), P.msg()));
  for (const sx of [1, -1]) {
    const a = crown.clone().add(new THREE.Vector3(sx * 0.062, -0.01, 0));
    const b = axle.clone().add(new THREE.Vector3(sx * 0.062, 0, 0));
    out.push(part(bar(a, b, 0.012, 0.036, new THREE.Vector3(0, 0, 1), 0.01, 0.005), P.msg()));
    const nut = new THREE.CylinderGeometry(0.012, 0.012, 0.01, 6);
    nut.rotateZ(Math.PI / 2);
    nut.translate(b.x + sx * 0.011, b.y, b.z);
    out.push(part(nut, P.steel()));
  }
  const axleRod = new THREE.CylinderGeometry(0.009, 0.009, 0.15, 10);
  axleRod.rotateZ(Math.PI / 2);
  axleRod.translate(axle.x, axle.y, axle.z);
  out.push(part(axleRod, P.steel()));
  const m = new THREE.Matrix4().compose(axle, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)), new THREE.Vector3(1, 1, 1));
  out.push(placeWheel(wheelParts(R, W, 0.06, P.msg(), 36), m));
  return group(out);
}
