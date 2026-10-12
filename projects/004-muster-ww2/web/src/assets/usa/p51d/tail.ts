/**
 * P-51D tail: fin with the straight dorsal fillet (P-51D-20-NA onwards), separate rudder with a
 * real hinge gap, cantilever tailplane with separate elevators (root cut-outs clear the rudder),
 * tail navigation light, and the retractable steerable tail wheel with its opened doors.
 * Surfaces are authored in the BODY frame; the tail wheel in the ASSET frame so it meets y = 0.
 */
import * as THREE from 'three';
import { part, group, G } from '../../../core/kit';
import { curve, gridGeo, lerp, nacaT, cosSpace, latheY, bar, cylAB, tint, roundedBox, type P2 } from './geom';
import { B, DIM, toAsset, dirToAsset } from './frame';
import { skin, P } from './paint';

interface Station {
  le: number;
  te: number;
  hinge: number;
  /** absolute half-thickness scale (m of chord used for the NACA thickness) */
  c: number;
  t: number;
  at: (s: number, off: number) => THREE.Vector3;
}
const GAP = 0.004;

function half(st: Station, s: number): number {
  const u = Math.min(1, Math.max(0, (s - st.le) / (st.te - st.le)));
  return Math.max(0.0008, nacaT(u, st.t) * st.c);
}

/** Fixed part: LE -> hinge, closed by a flat hinge face. */
function fixedRing(st: Station, n = 22): THREE.Vector3[] {
  const us = cosSpace(n).map((v) => st.le + v * (st.hinge - st.le));
  const ring: THREE.Vector3[] = [];
  for (let k = us.length - 1; k >= 0; k--) ring.push(st.at(us[k], half(st, us[k])));
  for (let k = 1; k < us.length; k++) ring.push(st.at(us[k], -half(st, us[k])));
  const hh = half(st, st.hinge);
  for (let k = 1; k <= 3; k++) ring.push(st.at(st.hinge, -hh + (2 * hh * k) / 4));
  return ring;
}

/** Moving part: rounded nose just behind the hinge -> TE. */
function movingRing(st: Station, n = 20): THREE.Vector3[] {
  let r = half(st, st.hinge);
  const sc = Math.min(st.te - 0.003, st.hinge + GAP + r);
  r = Math.min(r, half(st, sc));
  const ring: THREE.Vector3[] = [];
  const NN = 9;
  for (let k = 0; k <= NN; k++) {
    const a = Math.PI / 2 + (k / NN) * Math.PI;
    ring.push(st.at(sc + r * Math.cos(a), r * Math.sin(a)));
  }
  const ss = cosSpace(n).map((v) => sc + (st.te - sc) * v).slice(1);
  for (const s of ss) ring.push(st.at(s, -Math.min(r, half(st, s))));
  for (let k = ss.length - 2; k >= 0; k--) ring.push(st.at(ss[k], Math.min(r, half(st, ss[k]))));
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
const FIN_TOP = 1.585;
const hingeV = (y: number) => 9.2 + 0.035 * y;
/** fin leading edge incl. the dorsal fillet (straight fillet from the spine to y = 0.8) */
const finLE = (y: number) => {
  const basic = 8.36 + (y - 0.8) * 0.78;
  const fil = 6.8 + ((y - 0.46) * (8.36 - 6.8)) / (0.8 - 0.46);
  return y < 0.8 ? Math.min(basic, Math.max(fil, 6.0)) : basic;
};
const finTopRound = curve([[1.2, 0], [1.4, 0.04], [1.5, 0.11], [1.56, 0.22], [1.585, 0.4]]);
const rudTE = curve([
  [-0.14, 9.66], [-0.04, 9.74], [0.1, 9.785], [0.4, 9.82], [0.8, 9.83], [1.1, 9.81], [1.3, 9.74], [1.45, 9.63], [1.54, 9.49], [1.575, 9.37], [1.585, 9.29],
]);
const vStation = (y: number): Station => {
  const le = Math.min(finLE(y) + (y > 1.2 ? finTopRound(Math.min(y, FIN_TOP)) : 0), hingeV(y) - 0.02);
  const basicC = Math.max(0.3, hingeV(y) + 0.5 - (8.36 + (y - 0.8) * 0.78));
  return { le, te: Math.max(rudTE(Math.min(y, FIN_TOP)), hingeV(y) + 0.03), hinge: hingeV(y), c: basicC, t: lerp(0.1, 0.085, y / FIN_TOP), at: (s, off) => B(off, y, s) };
};

function fin(): THREE.BufferGeometry {
  const ys = [...dense(0.3, 1.2, 14, true), ...dense(1.2, FIN_TOP - 0.03, 10).slice(1)];
  const rows = ys.map((y) => fixedRing(vStation(y)));
  return G.crease(gridGeo(rows, { capStart: true, capEnd: true }), 40);
}
function rudder(): THREE.BufferGeometry {
  const ys = dense(-0.14, FIN_TOP - 0.005, 34, true);
  const rows = ys.map((y) => {
    const st = vStation(y);
    // the rudder nose rounds over at the very top (horn) and bottom
    return movingRing(st);
  });
  return G.crease(gridGeo(rows, { capStart: true, capEnd: true }), 40);
}

// ------------------------------------------------------------- horizontal tail
const Y_TP = 0.1;
const HT = { semi: 2.05, round: 1.7 };
const hStation = (ax: number): Station => {
  const le0 = 8.25 + 0.2 * ax, te0 = 9.56 - 0.06 * ax;
  const hinge = le0 + 0.64 * (te0 - le0);
  let le = le0, te = te0;
  if (ax > HT.round) {
    const q = Math.min(1, (ax - HT.round) / (HT.semi - HT.round));
    const e = Math.sqrt(Math.max(0.0004, 1 - q * q));
    le = hinge - (hinge - le0) * e;
    te = hinge + (te0 - hinge) * e;
  }
  return { le, te, hinge, c: te0 - le0, t: lerp(0.11, 0.09, ax / HT.semi), at: (s, off) => B(ax, Y_TP + off, s) };
};
function stabiliser(): THREE.BufferGeometry {
  const axs: number[] = [];
  for (let a = 0; a < HT.round; a += 0.1) axs.push(a);
  axs.push(...dense(HT.round, HT.semi - 0.003, 12));
  return G.crease(gridGeo(axs.map((ax) => fixedRing(hStation(ax))), { capEnd: true }), 40);
}
function elevator(): THREE.BufferGeometry {
  const axs: number[] = [];
  for (let a = 0.13; a < HT.round; a += 0.1) axs.push(a);
  axs.push(...dense(HT.round, HT.semi - 0.004, 12));
  return G.crease(gridGeo(axs.map((ax) => movingRing(hStation(ax))), { capStart: true, capEnd: true }), 40);
}

function tailLight(): THREE.Object3D {
  const y = 0.62;
  const p = B(0, y, rudTE(y) + 0.004);
  const g = new THREE.SphereGeometry(1, 14, 10);
  g.scale(0.012, 0.022, 0.014);
  g.translate(p.x, p.y, p.z);
  return part(tint(g, 0xf2efe6), P.lens() as unknown as THREE.Material);
}

export function buildTailSurfaces(): THREE.Object3D {
  const stab = stabiliser(), elev = elevator();
  // tailplane and elevators in aluminium lacquer (same material as the wing)
  const port = group([part(stab, skin('WING')), part(elev, skin('WING'))]);
  const star = group([part(stab.clone(), skin('WING')), part(elev.clone(), skin('WING'))], { s: [-1, 1, 1] });
  return group([part(fin(), skin('FUSE')), part(rudder(), skin('FUSE')), port, star, tailLight()]);
}

// ------------------------------------------------------------- wheels (shared with the main gear)
function tyreProfile(R: number, w: number, rim: number): P2[] {
  const h = w / 2;
  return [
    [rim, -h * 0.74],
    [rim + (R - rim) * 0.35, -h * 0.98],
    [rim + (R - rim) * 0.72, -h * 0.94],
    [R - 0.014, -h * 0.7],
    [R - 0.003, -h * 0.38],
    [R, 0],
    [R - 0.003, h * 0.38],
    [R - 0.014, h * 0.7],
    [rim + (R - rim) * 0.72, h * 0.94],
    [rim + (R - rim) * 0.35, h * 0.98],
    [rim, h * 0.74],
  ];
}

/** Tyre + hub around local +Y (axle), centred at the origin; +Y is the outer face. */
export function wheelParts(R: number, w: number, rim: number, seg = 56, bolts = 8): THREE.Object3D[] {
  const tyre = latheY(tyreProfile(R, w, rim), seg);
  const h = w / 2;
  const hub = latheY(
    ([
      [0.0, h * 0.62],
      [rim * 0.3, h * 0.62],
      [rim * 0.36, h * 0.52],
      [rim * 0.44, h * 0.36],
      [rim * 0.9, h * 0.44],
      [rim * 1.02, h * 0.62],
      [rim * 1.03, h * 0.76],
      [rim * 0.98, h * 0.76],
      [rim * 0.98, -h * 0.76],
      [rim * 1.03, -h * 0.76],
      [rim * 1.02, -h * 0.62],
      [rim * 0.9, -h * 0.44],
      [rim * 0.5, -h * 0.5],
      [rim * 0.3, -h * 0.7],
      [0.0, -h * 0.7],
    ] as P2[]).reverse(),
    seg,
  );
  const out: THREE.Object3D[] = [part(tyre, P.rubber()), part(hub, P.silver())];
  for (let k = 0; k < bolts; k++) {
    const a = (k / bolts) * Math.PI * 2;
    const b = new THREE.CylinderGeometry(0.008, 0.008, 0.012, 8);
    b.translate(Math.cos(a) * rim * 0.64, h * 0.42, Math.sin(a) * rim * 0.64);
    out.push(part(b, P.steel()));
  }
  return out;
}

/** Bake a set of wheel parts transformed by m; tyre vertices below y = 0 are flattened. */
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

// ------------------------------------------------------------- tail wheel (asset frame)
export function buildTailWheel(): THREE.Object3D {
  const R = DIM.tailTyre.r, W = DIM.tailTyre.w;
  const att = toAsset(B(0, DIM.tailAttach.y, DIM.tailAttach.s));
  const axle = new THREE.Vector3(0, R - 0.006, att.z - 0.13);
  const crown = new THREE.Vector3(0, 2 * R + 0.06, att.z - 0.04);
  const out: THREE.Object3D[] = [];
  // strut from inside the fuselage to the fork crown, with a steering collar
  out.push(part(cylAB(att.clone().add(new THREE.Vector3(0, 0.1, 0)), crown, 0.03, 0.028, 18), P.silver()));
  out.push(part(cylAB(crown.clone().lerp(att, 0.55), crown.clone().lerp(att, 0.35), 0.022, 0.022, 16), P.oleo()));
  out.push(part(cylAB(crown.clone().lerp(att, 0.7), crown.clone().lerp(att, 0.62), 0.036, 0.036, 18), P.steel()));
  // fork crown + legs
  out.push(part(bar(crown.clone().add(new THREE.Vector3(-0.08, 0, 0)), crown.clone().add(new THREE.Vector3(0.08, 0, 0)), 0.05, 0.035, new THREE.Vector3(0, 1, 0), 0, 0.008), P.silver()));
  for (const sx of [1, -1]) {
    const a = crown.clone().add(new THREE.Vector3(sx * 0.07, -0.008, 0));
    const b = axle.clone().add(new THREE.Vector3(sx * 0.07, 0, 0));
    out.push(part(bar(a, b, 0.014, 0.036, new THREE.Vector3(0, 0, 1), 0.01, 0.005), P.silver()));
    const nut = new THREE.CylinderGeometry(0.013, 0.013, 0.012, 6);
    nut.rotateZ(Math.PI / 2);
    nut.translate(b.x + sx * 0.012, b.y, b.z);
    out.push(part(nut, P.steel()));
  }
  const axleRod = new THREE.CylinderGeometry(0.01, 0.01, 0.17, 10);
  axleRod.rotateZ(Math.PI / 2);
  axleRod.translate(axle.x, axle.y, axle.z);
  out.push(part(axleRod, P.steel()));
  const m = new THREE.Matrix4().compose(axle, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)), new THREE.Vector3(1, 1, 1));
  out.push(placeWheel(wheelParts(R, W, 0.07, 40, 5), m));
  const leg = group(out.splice(0));
  leg.userData.campMotion = { kind: 'tail-gear', pivot: att.toArray(), angle: -Math.PI / 2 };
  out.push(leg);
  // well opening + two doors hinged along its sides, hanging open
  const sC = DIM.tailAttach.s - 0.02;
  const wellBody = B(0, -0.29, sC);
  const well = roundedBox(0.2, 0.05, 0.52, 0.02);
  const wm = new THREE.Matrix4().compose(toAsset(wellBody), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirToAsset(new THREE.Vector3(0, 0, 1))), new THREE.Vector3(1, 1, 1));
  well.applyMatrix4(wm);
  out.push(part(well, P.black()));
  for (const sx of [1, -1]) {
    const hingeA = toAsset(B(sx * 0.1, -0.305, sC - 0.25));
    const hingeB = toAsset(B(sx * 0.1, -0.29, sC + 0.25));
    const down = new THREE.Vector3(sx * 0.35, -1, 0).normalize();
    const g = roundedBox(0.012, 0.19, hingeA.distanceTo(hingeB), 0.004);
    g.translate(0, -0.095, 0);
    const zA = hingeB.clone().sub(hingeA).normalize();
    const yA = down.clone().negate().addScaledVector(zA, -down.clone().negate().dot(zA)).normalize();
    const xA = new THREE.Vector3().crossVectors(yA, zA).normalize();
    g.applyMatrix4(new THREE.Matrix4().makeBasis(xA, yA, zA).setPosition(hingeA.clone().add(hingeB).multiplyScalar(0.5)));
    const door = part(g, skin('FUSE'));
    door.userData.campMotion = { kind: 'tail-door', pivot: hingeA.toArray(), angle: -sx * Math.atan2(1, 0.35) };
    out.push(door);
  }
  return group(out);
}
