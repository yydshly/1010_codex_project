/**
 * Fw 190 A-8 tail: broad fin with a separate rudder (real hinge gap, trim tab painted), straight-
 * tapered tailplane with rounded tips and separate elevators, white tail light, and the semi-
 * retractable tail wheel on its long raked strut. Surfaces are authored in the BODY frame; the
 * tail wheel in the ASSET frame so it meets y = 0.
 */
import * as THREE from 'three';
import { part, group } from '../../../core/kit';
import { crease } from '../../../core/geo/shapes';
import { curve, gridGeo, lerp, nacaT, cosSpace, bar, cylAB, latheY, tint, type P2 } from './geom';
import { B, DIM, toAsset, fuseYBot, fuseYTop } from './frame';
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
function movingRing(st: Station, n = 18): THREE.Vector3[] {
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
export const HINGE_V = 8.5;
export const FIN_ROOT = 0.25;
export const FIN_TOP = 1.3;
const finLE = curve([
  [0.25, 7.18], [0.36, 7.45], [0.48, 7.66], [0.62, 7.84], [0.8, 8.02], [0.98, 8.17], [1.12, 8.28], [1.22, 8.37], [1.28, 8.44], [1.3, 8.49],
]);
const rudTE = curve([
  [0.28, 8.96], [0.45, 8.995], [0.65, 9.0], [0.85, 8.985], [1.0, 8.94], [1.12, 8.86], [1.22, 8.76], [1.28, 8.66], [1.31, 8.58], [1.32, 8.52],
]);
export const vStation = (y: number): Station => {
  const le = finLE(Math.max(FIN_ROOT, Math.min(FIN_TOP, y)));
  return {
    le: Math.min(le, HINGE_V - 0.002),
    te: Math.max(rudTE(Math.min(1.32, y)), HINGE_V + 0.03),
    hinge: HINGE_V,
    t: lerp(0.1, 0.075, Math.max(0, y - FIN_ROOT) / (FIN_TOP - FIN_ROOT)),
    at: (s, off) => B(off, y, s),
  };
};
function fin(): THREE.BufferGeometry {
  const rows = dense(FIN_ROOT, FIN_TOP - 0.004, 24).map((y) => fixedRing(vStation(y)));
  return crease(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), 40);
}
function rudder(): THREE.BufferGeometry {
  const rows = dense(0.29, 1.318, 28, true).map((y) => movingRing(vStation(y)));
  return crease(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), 40);
}

// ------------------------------------------------------------- horizontal tail
const Y_TP = 0.16;
/** straight taper with swept LE, rounded tips; span 3.65 m */
const HT = { semi: 1.825, le0: 7.66, leK: 0.19, te0: 8.72, teK: 0.05, tip0: 1.5 };
const hPlan = (ax: number) => {
  let le = HT.le0 + HT.leK * ax, te = HT.te0 - HT.teK * ax;
  if (ax > HT.tip0) {
    const t = Math.min(1, (ax - HT.tip0) / (HT.semi - HT.tip0));
    const e = Math.sqrt(Math.max(0.0009, 1 - t * t));
    const c = te - le, mid = le + 0.45 * c;
    le = mid - 0.45 * c * e;
    te = mid + 0.55 * c * e;
  }
  return { le, te };
};
const hStation = (ax: number): Station => {
  const { le, te } = hPlan(ax);
  const hinge = le + 0.62 * (te - le);
  return { le, te, hinge, t: lerp(0.11, 0.08, ax / HT.semi), at: (s, off) => B(ax, Y_TP + off, s) };
};
function stabiliser(): THREE.BufferGeometry {
  const axs: number[] = [];
  for (let a = 0; a < HT.tip0; a += 0.08) axs.push(a);
  axs.push(...dense(HT.tip0, HT.semi - 0.004, 10));
  return crease(gridGeo(axs.map((ax) => fixedRing(hStation(ax))), { closedU: true, capStart: false, capEnd: true }), 40);
}
function elevator(): THREE.BufferGeometry {
  const axs: number[] = [];
  for (let a = 0.12; a < HT.tip0; a += 0.08) axs.push(a);
  axs.push(...dense(HT.tip0, HT.semi - 0.006, 10));
  return crease(gridGeo(axs.map((ax) => movingRing(hStation(ax))), { closedU: true, capStart: true, capEnd: true }), 40);
}

/** White tail light at the rudder trailing edge. */
function tailLight(): THREE.Object3D {
  const y = 0.5;
  const p = B(0, y, rudTE(y) + 0.004);
  const g = new THREE.SphereGeometry(1, 14, 10);
  g.scale(0.012, 0.024, 0.016);
  g.translate(p.x, p.y, p.z);
  return part(tint(g, 0xf2efe6), P.lens());
}

/** Fin fillet blending the fin root into the spine. */
function finFillet(): THREE.Object3D {
  const rows: THREE.Vector3[][] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const s = lerp(6.9, HINGE_V - 0.01, i / n);
    const st = vStation(FIN_ROOT + 0.02);
    const c = st.te - st.le;
    const u = Math.min(1, Math.max(0, (s - st.le) / c));
    const tHalf = s < st.le ? 0.004 : Math.max(0.004, nacaT(u, st.t) * c);
    const w = tHalf + 0.03 * Math.sin(Math.PI * Math.min(1, (s - 6.9) / (HINGE_V - 6.9)));
    const yTop = s < st.le ? lerp(fuseYTop(s, 0), FIN_ROOT + 0.02, Math.pow(Math.max(0, (s - 6.9) / (st.le - 6.9)), 1.6)) : FIN_ROOT + 0.04;
    const yb = fuseYTop(s, 0) - 0.05;
    const ring: THREE.Vector3[] = [];
    const N = 12;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      ring.push(B(w * Math.sin(a), (yTop + yb) / 2 + ((yTop - yb) / 2) * Math.cos(a), s));
    }
    rows.push(ring);
  }
  return part(gridGeo(rows, { closedU: true, capStart: true, capEnd: true }), skin('TAIL'));
}

export function buildTailSurfaces(): THREE.Object3D {
  const stab = stabiliser(), elev = elevator();
  const port = group([part(stab, skin('TAIL')), part(elev, skin('TAIL'))]);
  const star = group([part(stab.clone(), skin('TAIL')), part(elev.clone(), skin('TAIL'))], { s: [-1, 1, 1] });
  return group([part(fin(), skin('TAIL')), part(rudder(), skin('TAIL')), finFillet(), port, star, tailLight()]);
}

/** Top of the fin (antenna wire anchor), body frame. */
export function finTop(): THREE.Vector3 {
  const st = vStation(1.2);
  return B(0, 1.2, st.le + 0.18);
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

/** Tyre + disc hub around local +Y (axle), centred at the origin; outer face towards +Y. */
export function wheelParts(R: number, w: number, rim: number, hubMat: THREE.Material, seg = 56, holes = 0): THREE.Object3D[] {
  const tyre = latheY(tyreProfile(R, w, rim), seg);
  const h = w / 2;
  const hub = latheY(
    ([
      [0.0, h * 0.95], [rim * 0.22, h * 0.95], [rim * 0.3, h * 0.7], [rim * 0.4, h * 0.5], [rim * 0.88, h * 0.46],
      [rim * 1.02, h * 0.62], [rim * 1.03, h * 0.74], [rim * 0.98, h * 0.74], [rim * 0.98, -h * 0.74], [rim * 1.03, -h * 0.74],
      [rim * 1.02, -h * 0.62], [rim * 0.9, -h * 0.5], [rim * 0.5, -h * 0.55], [rim * 0.3, -h * 0.9], [0.0, -h * 0.9],
    ] as P2[]).reverse(),
    seg,
  );
  const out: THREE.Object3D[] = [part(tyre, P.rubber()), part(hub, hubMat)];
  // lightening holes (dark discs) in the wheel disc
  for (let k = 0; k < holes; k++) {
    const a = (k / holes) * Math.PI * 2;
    const g = new THREE.CircleGeometry(rim * 0.13, 16);
    g.rotateX(-Math.PI / 2);
    g.translate(Math.cos(a) * rim * 0.64, h * 0.48 + 0.002, Math.sin(a) * rim * 0.64);
    out.push(part(g, P.black()));
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const b = new THREE.CylinderGeometry(0.0065, 0.0065, 0.012, 8);
    b.translate(Math.cos(a) * rim * 0.18, h * 0.95, Math.sin(a) * rim * 0.18);
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
    const p = g.attributes.position;
    let changed = false;
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) {
      p.setY(i, 0);
      changed = true;
    }
    if (changed) g.computeVertexNormals();
    out.push(part(g, mesh.material as THREE.Material));
  }
  return group(out);
}

/** Semi-retractable tail wheel: raked oleo strut from the fuselage, single-sided fork. */
export function buildTailWheel(): THREE.Object3D {
  const R = DIM.tailTyre.r, W = DIM.tailTyre.w;
  const s = DIM.tailAttach.s;
  const att = toAsset(B(0, fuseYBot(s, 0), s));
  const inside = toAsset(B(0, fuseYBot(s, 0) + 0.2, s - 0.08));
  const axle = new THREE.Vector3(0, R - 0.004, att.z - 0.1);
  const dir = axle.clone().sub(inside).normalize();
  const out: THREE.Object3D[] = [];
  // strut: outer cylinder from inside the fuselage, chromed piston, fork
  const lenToAxle = axle.distanceTo(inside);
  const at = (t: number) => inside.clone().addScaledVector(dir, t);
  out.push(part(cylAB(at(0), at(lenToAxle - 0.26), 0.036, 0.036, 16), P.rlm76()));
  out.push(part(cylAB(at(lenToAxle - 0.3), at(lenToAxle - 0.14), 0.026, 0.026, 16), P.oleo()));
  // rubber gaiter / skin collar where the strut leaves the fuselage
  const tSkin = att.distanceTo(inside);
  out.push(part(cylAB(at(tSkin - 0.03), at(tSkin + 0.03), 0.05, 0.042, 16), P.black()));
  // fork (port side arm) and crown
  const crown = at(lenToAxle - 0.14);
  const side = new THREE.Vector3(1, 0, 0);
  out.push(part(bar(crown.clone().addScaledVector(side, -0.02), crown.clone().addScaledVector(side, W / 2 + 0.04), 0.05, 0.035, new THREE.Vector3(0, 1, 0), 0, 0.008), P.rlm76()));
  const armTop = crown.clone().addScaledVector(side, W / 2 + 0.03);
  const armBot = axle.clone().addScaledVector(side, W / 2 + 0.03);
  out.push(part(bar(armTop, armBot, 0.016, 0.05, new THREE.Vector3(0, 0, 1), 0.02, 0.006), P.rlm76()));
  const nut = new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6);
  nut.rotateZ(Math.PI / 2);
  nut.translate(armBot.x + 0.015, armBot.y, armBot.z);
  out.push(part(nut, P.steel()));
  const axleRod = new THREE.CylinderGeometry(0.012, 0.012, W + 0.08, 10);
  axleRod.rotateZ(Math.PI / 2);
  axleRod.translate(axle.x + 0.01, axle.y, axle.z);
  out.push(part(axleRod, P.steel()));
  const m = new THREE.Matrix4().compose(axle, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)), new THREE.Vector3(1, 1, 1));
  out.push(placeWheel(wheelParts(R, W, 0.075, P.rlm76(), 40), m));
  return group(out);
}
