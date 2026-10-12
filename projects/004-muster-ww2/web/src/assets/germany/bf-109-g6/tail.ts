/**
 * Bf 109 G-6 tail: cantilever tailplane with separate elevators, fin with a separate rudder
 * (real hinge gaps and elevator cut-outs), and the fixed 350 x 135 mm tail wheel.
 * Surfaces are authored in the BODY frame; the tail wheel in the ASSET frame so it meets y = 0.
 */
import * as THREE from 'three';
import { part, group } from '../../../core/kit';
import { curve, gridGeo, lerp, smooth, nacaT, cosSpace, latheY, frameBar, type P2 } from './geom';
import { B, DIM, toAsset } from './frame';
import { skin, P } from './paint';
import { crease } from '../../../core/geo/shapes';

interface Station {
  le: number;
  te: number;
  hinge: number;
  t: number;
  /** chord station s + thickness offset -> body point */
  at: (s: number, off: number) => THREE.Vector3;
}

const GAP = 0.0035;

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
  const uh = Math.min(0.995, (st.hinge - st.le) / c);
  let r = half(uh);
  let sc = st.hinge + GAP + r;
  r = Math.min(r, half(Math.min(0.999, (sc - st.le) / c)));
  sc = Math.min(st.te - 0.002, st.hinge + GAP + r);
  const uc = Math.min(0.999, (sc - st.le) / c);
  const ring: THREE.Vector3[] = [];
  // nose: semicircle from +side over the front to -side
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

// ------------------------------------------------------------- vertical tail
const finLE = curve([
  [0.2, 7.58], [0.3, 7.7], [0.45, 7.87], [0.6, 8.03], [0.75, 8.19], [0.86, 8.32], [0.93, 8.425], [0.965, 8.505], [0.985, 8.575],
]);
const rudTE = curve([
  [0.045, 8.6], [0.06, 8.75], [0.09, 8.86], [0.14, 8.94], [0.22, 8.99], [0.35, 9.015], [0.5, 9.02], [0.65, 9.01],
  [0.76, 8.98], [0.85, 8.93], [0.92, 8.85], [0.96, 8.76], [0.978, 8.68], [0.985, 8.59],
]);
const HINGE_V = 8.575;
const vStation = (y: number): Station => {
  const le = y >= 0.2 ? finLE(y) : 7.55;
  return { le: Math.min(le, HINGE_V - 0.001), te: Math.max(rudTE(y), HINGE_V + 0.02), hinge: HINGE_V, t: lerp(0.105, 0.085, y), at: (s, off) => B(off, y, s) };
};

function topDense(a: number, b: number, n: number, both = false): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const w = both ? (1 - Math.cos(t * Math.PI)) / 2 : Math.sin((t * Math.PI) / 2);
    out.push(lerp(a, b, w));
  }
  return out;
}

function fin(): THREE.BufferGeometry {
  const rows = topDense(0.2, 0.983, 26).map((y) => fixedRing(vStation(y)));
  return crease(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), 40);
}
function rudder(): THREE.BufferGeometry {
  const rows = topDense(0.048, 0.982, 34, true).map((y) => movingRing(vStation(y)));
  return crease(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), 40);
}

// ------------------------------------------------------------- horizontal tail
const Y_TP = 0.33;
const HT = { semi: 1.48, round: 1.08 };
const hStation = (ax: number): Station => {
  const le0 = 7.92 + 0.13 * ax, te0 = 8.82 - 0.1 * ax;
  const hinge = le0 + 0.62 * (te0 - le0);
  let le = le0, te = te0;
  if (ax > HT.round) {
    const q = Math.min(1, (ax - HT.round) / (HT.semi - HT.round));
    const e = Math.sqrt(Math.max(0.0004, 1 - q * q));
    le = hinge - (hinge - le0) * e;
    te = hinge + (te0 - hinge) * e;
  }
  return { le, te, hinge, t: lerp(0.1, 0.08, ax / HT.semi), at: (s, off) => B(ax, Y_TP + off, s) };
};

function stabiliser(): THREE.BufferGeometry {
  const axs: number[] = [];
  for (let a = 0; a < HT.round; a += 0.09) axs.push(a);
  axs.push(...topDense(HT.round, HT.semi - 0.003, 12));
  const rows = axs.map((ax) => fixedRing(hStation(ax)));
  return crease(gridGeo(rows, { closedU: true, capStart: false, capEnd: true }), 40);
}
function elevator(): THREE.BufferGeometry {
  const axs: number[] = [];
  for (let a = 0.075; a < HT.round; a += 0.09) axs.push(a);
  axs.push(...topDense(HT.round, HT.semi - 0.004, 12));
  const rows = axs.map((ax) => movingRing(hStation(ax)));
  return crease(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), 40);
}

/** Tail navigation light at the rudder trailing edge. */
function tailLight(): THREE.Object3D {
  const y = 0.62;
  const p = B(0, y, rudTE(y) + 0.004);
  const g = new THREE.SphereGeometry(1, 14, 10);
  g.scale(0.012, 0.02, 0.012);
  g.translate(p.x, p.y, p.z);
  const c = new Float32Array(g.attributes.position.count * 3);
  const col = new THREE.Color(0xf2efe6);
  for (let i = 0; i < g.attributes.position.count; i++) col.toArray(c, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return part(g, P.lens() as unknown as THREE.Material);
}

export function buildTailSurfaces(): THREE.Object3D {
  const stab = stabiliser(), elev = elevator();
  const port = group([part(stab, skin('TAIL')), part(elev, skin('TAIL'))]);
  const star = group([part(stab.clone(), skin('TAIL')), part(elev.clone(), skin('TAIL'))], { s: [-1, 1, 1] });
  return group([part(fin(), skin('TAIL')), part(rudder(), skin('TAIL')), port, star, tailLight()]);
}

// ------------------------------------------------------------- tail wheel (asset frame)
function tyreProfile(R: number, w: number, rim: number): P2[] {
  const h = w / 2;
  return [
    [rim, -h * 0.72],
    [rim + (R - rim) * 0.35, -h * 0.98],
    [rim + (R - rim) * 0.7, -h * 0.95],
    [R - 0.012, -h * 0.72],
    [R - 0.002, -h * 0.4],
    [R, 0],
    [R - 0.002, h * 0.4],
    [R - 0.012, h * 0.72],
    [rim + (R - rim) * 0.7, h * 0.95],
    [rim + (R - rim) * 0.35, h * 0.98],
    [rim, h * 0.72],
  ];
}

/** Tyre + hub around local +Y (axle), centred at the origin. */
export function wheelParts(R: number, w: number, rim: number, hubMat: THREE.Material, seg = 56): THREE.Object3D[] {
  const tyre = latheY(tyreProfile(R, w, rim), seg);
  const h = w / 2;
  const hub = latheY(
    [
      [0.0, h * 0.95],
      [rim * 0.3, h * 0.95],
      [rim * 0.36, h * 0.8],
      [rim * 0.42, h * 0.55],
      [rim * 0.92, h * 0.5],
      [rim * 1.02, h * 0.62],
      [rim * 1.03, h * 0.74],
      [rim * 0.98, h * 0.74],
      [rim * 0.98, -h * 0.74],
      [rim * 1.03, -h * 0.74],
      [rim * 1.02, -h * 0.62],
      [rim * 0.9, -h * 0.5],
      [rim * 0.5, -h * 0.55],
      [rim * 0.3, -h * 0.9],
      [0.0, -h * 0.9],
    ].reverse() as P2[],
    seg,
  );
  const out: THREE.Object3D[] = [part(tyre, P.rubber()), part(hub, hubMat)];
  // hub bolts on the outer face
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const b = new THREE.CylinderGeometry(0.0075, 0.0075, 0.012, 8);
    b.translate(Math.cos(a) * rim * 0.62, h * 0.53, Math.sin(a) * rim * 0.62);
    out.push(part(b, P.steel()));
  }
  return out;
}

/** Bake a group of parts into one geometry per material, transformed by m (so we can clamp y). */
export function placeWheel(parts: THREE.Object3D[], m: THREE.Matrix4, flatten = true): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  for (const o of parts) {
    const mesh = o as THREE.Mesh;
    const g = mesh.geometry.clone();
    mesh.updateMatrix();
    g.applyMatrix4(mesh.matrix);
    g.applyMatrix4(m);
    if (flatten && mesh.material === P.rubber()) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setY(i, 0);
      g.computeVertexNormals();
    }
    out.push(part(g, mesh.material as THREE.Material));
  }
  return group(out);
}

export function buildTailWheel(): THREE.Object3D {
  const R = DIM.tailTyre.r, W = DIM.tailTyre.w;
  const att = toAsset(B(0, DIM.tailAttach.y, DIM.tailAttach.s));
  const axle = new THREE.Vector3(0, R - 0.005, att.z - 0.075);
  const crown = new THREE.Vector3(0, 2 * R + 0.035, att.z - 0.02);
  const top = att.clone().add(new THREE.Vector3(0, 0.08, 0.0));
  const out: THREE.Object3D[] = [];
  const legDir = crown.clone().sub(top).normalize();
  out.push(part(frameBar(top, crown, 0.052, 0.052, new THREE.Vector3(0, 0, 1), 0, 0.024), P.rlm02()));
  // rubber gaiter where the leg leaves the fuselage
  const gaiter = new THREE.CylinderGeometry(0.036, 0.042, 0.05, 18);
  gaiter.applyMatrix4(new THREE.Matrix4().compose(att.clone().addScaledVector(legDir, 0.005), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), legDir.clone().negate()), new THREE.Vector3(1, 1, 1)));
  out.push(part(gaiter, P.rubber()));
  // fork crown + legs
  out.push(part(frameBar(crown.clone().add(new THREE.Vector3(-0.1, 0, 0)), crown.clone().add(new THREE.Vector3(0.1, 0, 0)), 0.05, 0.035, new THREE.Vector3(0, 1, 0), 0, 0.008), P.rlm02()));
  for (const sx of [1, -1]) {
    const a = crown.clone().add(new THREE.Vector3(sx * 0.088, -0.01, 0));
    const b = axle.clone().add(new THREE.Vector3(sx * 0.088, 0, 0));
    out.push(part(frameBar(a, b, 0.014, 0.04, new THREE.Vector3(0, 0, 1), 0.01, 0.005), P.rlm02()));
    const nut = new THREE.CylinderGeometry(0.014, 0.014, 0.012, 6);
    nut.rotateZ(Math.PI / 2);
    nut.translate(b.x + sx * 0.012, b.y, b.z);
    out.push(part(nut, P.steel()));
  }
  const axleRod = new THREE.CylinderGeometry(0.011, 0.011, 0.21, 10);
  axleRod.rotateZ(Math.PI / 2);
  axleRod.translate(axle.x, axle.y, axle.z);
  out.push(part(axleRod, P.steel()));
  const m = new THREE.Matrix4().compose(axle, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)), new THREE.Vector3(1, 1, 1));
  out.push(placeWheel(wheelParts(R, W, 0.085, P.hub(), 40), m));
  void smooth;
  return group(out);
}
