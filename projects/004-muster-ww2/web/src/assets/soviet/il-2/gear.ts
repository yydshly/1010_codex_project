/**
 * Il-2 landing gear, built in the ASSET frame so the tyres meet y = 0 exactly:
 * main legs (oleo, fork, torque links, folding drag strut, brake line) hanging from the
 * nacelle wells, 800 x 260 mm main wheels, fixed castoring 400 x 150 mm tail wheel.
 */
import * as THREE from 'three';
import { G, part, group, mirrorX } from '../../../core/kit';
import { V, bar } from './geo';
import { D, B } from './dims';
import type { Palette } from './paint';

type ToAsset = (v: THREE.Vector3) => THREE.Vector3;

/** Tyre + hub around the X axis, centred at the origin; flattened later. */
function wheelParts(pal: Palette, r: number, w: number, hubR: number): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  // tyre cross-section (radius, axial) - balloon profile
  const prof: [number, number][] = [];
  const rimR = hubR + 0.01;
  const n = 22;
  for (let k = 0; k <= n; k++) {
    const a = -Math.PI / 2 + (k / n) * Math.PI; // -90 (one side) .. +90 (other side)
    const ca = Math.cos(a), sa = Math.sin(a);
    const rr = rimR + (r - rimR) * (0.5 + 0.5 * Math.pow(ca, 0.8));
    const yy = (w / 2) * Math.sign(sa) * Math.pow(Math.abs(sa), 0.75);
    prof.push([rr, yy]);
  }
  // lathe profile must go bottom -> top along +Y; ours goes -w/2 -> +w/2 already
  const tyre = G.lathe(prof, 56, 60);
  out.push(part(tyre, pal.rubber, { r: [0, 0, 90] }));
  // hub: rim flanges, dished disc and centre cap on both faces
  const hub = G.lathe(
    [
      [0, -w * 0.36], [hubR * 0.28, -w * 0.36], [hubR * 0.32, -w * 0.3], [hubR * 0.7, -w * 0.26], [hubR * 0.98, -w * 0.4],
      [hubR + 0.018, -w * 0.43], [hubR + 0.018, -w * 0.37], [hubR, -w * 0.3], [hubR, w * 0.3], [hubR + 0.018, w * 0.37],
      [hubR + 0.018, w * 0.43], [hubR * 0.98, w * 0.4], [hubR * 0.7, w * 0.26], [hubR * 0.32, w * 0.3], [hubR * 0.28, w * 0.36], [0, w * 0.36],
    ],
    40,
    35,
  );
  out.push(part(hub, pal.green, { r: [0, 0, 90] }));
  // bolt circle on each face
  const bolts: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (const side of [1, -1])
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      bolts.push({ p: V(side * w * 0.265, Math.cos(a) * hubR * 0.52, Math.sin(a) * hubR * 0.52), n: V(side, 0, 0) });
    }
  out.push(part(G.scatter(G.boltHead(0.018, 0.008), bolts), pal.gun));
  return group(out);
}

/**
 * Bake a positioned wheel into plain meshes (identity transforms) and flatten every vertex
 * below y = 0 onto the ground (tyre contact patch).
 */
function flattenWheel(o: THREE.Object3D): THREE.Object3D {
  o.updateMatrixWorld(true);
  const meshes: THREE.Object3D[] = [];
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
    const p = g.attributes.position;
    const nrm = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < 0) {
        p.setY(i, 0);
        if (nrm) nrm.setXYZ(i, 0, -1, 0);
      }
    }
    p.needsUpdate = true;
    meshes.push(part(g, m.material as THREE.Material));
  });
  return group(meshes, { name: 'wheel' });
}

function mainGear(pal: Palette, toAsset: ToAsset): THREE.Object3D {
  const T = D.mainTyre;
  const out: THREE.Object3D[] = [];
  const P = toAsset(B(D.pivot.x, D.pivot.y, D.pivot.s));
  const cy = T.r - T.flat;
  const rake = 4 * (Math.PI / 180);
  const C = V(P.x, cy, P.z + (P.y - cy) * Math.tan(rake));
  const d = C.clone().sub(P).normalize(); // down the leg
  const K = C.clone().addScaledVector(d, -(T.r + 0.075)); // fork crown
  const cylEnd = P.clone().addScaledVector(d, 0.6);
  // oleo: upper cylinder, gland, chromed piston
  out.push(part(G.rod(P.clone().addScaledVector(d, -0.06), cylEnd, 0.058, 20), pal.bottom));
  out.push(part(G.rod(cylEnd.clone().addScaledVector(d, -0.03), cylEnd.clone().addScaledVector(d, 0.012), 0.066, 20), pal.bottom));
  out.push(part(G.rod(cylEnd, K.clone().addScaledVector(d, -0.02), 0.041, 18), pal.steel));
  // pivot trunnion across the well
  out.push(part(G.rod(P.clone().add(V(0.13, 0, 0)), P.clone().add(V(-0.13, 0, 0)), 0.04, 14), pal.bottom));
  // fork: crown and two legs to the axle
  const fx = T.w / 2 + 0.045;
  out.push(part(bar(K.clone().add(V(fx + 0.03, 0, 0)), K.clone().add(V(-fx - 0.03, 0, 0)), 0.07, 0.06, d.clone().negate(), 0.01), pal.bottom));
  for (const sx of [fx, -fx]) {
    const a = K.clone().add(V(sx, 0, 0)), b = C.clone().add(V(sx, 0, 0));
    out.push(part(bar(a, b.clone().addScaledVector(d, 0.03), 0.034, 0.06, V(0, 0, 1), 0.008), pal.bottom));
    out.push(part(G.cyl(0.042, 0.042, 0.03, 18), pal.bottom, { p: [b.x, b.y, b.z], r: [0, 0, 90] }));
  }
  out.push(part(G.rod(C.clone().add(V(fx + 0.03, 0, 0)), C.clone().add(V(-fx - 0.03, 0, 0)), 0.022, 12), pal.steel));
  // torque links (scissors) on the front of the leg
  const fwd = V(0, 0, 1).sub(d.clone().multiplyScalar(d.z)).normalize();
  const l0 = cylEnd.clone().addScaledVector(fwd, 0.06);
  const l2 = K.clone().addScaledVector(fwd, 0.06).addScaledVector(d, -0.02);
  const l1 = l0.clone().lerp(l2, 0.5).addScaledVector(fwd, 0.1);
  out.push(part(bar(l0, l1, 0.03, 0.012, V(1, 0, 0), 0.004), pal.bottom));
  out.push(part(bar(l1, l2, 0.03, 0.012, V(1, 0, 0), 0.004), pal.bottom));
  out.push(part(G.cyl(0.016, 0.016, 0.05, 10), pal.steel, { p: [l1.x, l1.y, l1.z], r: [0, 0, 90] }));
  // folding drag strut to the rear of the well, with a slightly broken knee
  const Q = P.clone().addScaledVector(d, 0.5).addScaledVector(fwd, -0.06);
  const A = toAsset(B(D.pivot.x, D.pivot.y - 0.02, D.pivot.s + 0.95));
  const knee = Q.clone().lerp(A, 0.52).add(V(0, 0.03, 0));
  out.push(part(G.rod(Q, knee, 0.024, 12), pal.bottom));
  out.push(part(G.rod(knee, A, 0.026, 12), pal.bottom));
  out.push(part(G.cyl(0.032, 0.032, 0.07, 14), pal.bottom, { p: [knee.x, knee.y, knee.z], r: [0, 0, 90] }));
  out.push(part(G.cyl(0.03, 0.03, 0.09, 14), pal.bottom, { p: [Q.x, Q.y, Q.z], r: [0, 0, 90] }));
  // brake hose down the leg
  const hose = [
    P.clone().add(V(0.07, 0.05, -0.05)),
    P.clone().addScaledVector(d, 0.3).add(V(0.068, 0, -0.03)),
    cylEnd.clone().add(V(0.07, 0, -0.03)),
    K.clone().add(V(0.09, 0.02, -0.04)),
    C.clone().add(V(0.1, 0.1, -0.05)),
  ];
  out.push(part(G.tube(hose, 0.007, 6, 40), pal.dark));
  // wheel
  out.push(flattenWheel(group([wheelParts(pal, T.r, T.w, 0.2)], { p: [C.x, C.y, C.z] })));
  return group(out, { name: 'main-gear' });
}

function tailGear(pal: Palette, toAsset: ToAsset, tailBot: number): THREE.Object3D {
  const T = D.tailTyre;
  const out: THREE.Object3D[] = [];
  const top = toAsset(B(0, tailBot + 0.06, D.tailAttach.s));
  const cy = T.r - T.flat;
  const K = V(0, cy + T.r + 0.075, top.z); // fork crown on the vertical swivel axis
  const C = V(0, cy, top.z - 0.12); // trailing axle
  // swivel strut (shock absorber) and housing ring at the fuselage
  out.push(part(G.rod(top, K.clone().add(V(0, 0.07, 0)), 0.036, 16), pal.bottom));
  out.push(part(G.rod(K.clone().add(V(0, 0.16, 0)), K.clone().add(V(0, 0.02, 0)), 0.026, 14), pal.steel));
  out.push(part(G.cyl(0.065, 0.065, 0.03, 20), pal.bottom, { p: [top.x, top.y - 0.03, top.z] }));
  // fork
  const fx = T.w / 2 + 0.03;
  out.push(part(bar(K.clone().add(V(fx + 0.02, 0, 0)), K.clone().add(V(-fx - 0.02, 0, 0)), 0.05, 0.04, V(0, 1, 0), 0.008), pal.bottom));
  for (const sx of [fx, -fx]) {
    out.push(part(bar(K.clone().add(V(sx, 0, 0)), C.clone().add(V(sx, 0.02, 0)), 0.024, 0.05, V(0, 0, 1), 0.006), pal.bottom));
    out.push(part(G.cyl(0.03, 0.03, 0.024, 14), pal.bottom, { p: [C.x + sx, C.y, C.z], r: [0, 0, 90] }));
  }
  out.push(part(G.rod(C.clone().add(V(fx + 0.02, 0, 0)), C.clone().add(V(-fx - 0.02, 0, 0)), 0.014, 10), pal.steel));
  out.push(flattenWheel(group([wheelParts(pal, T.r, T.w, 0.095)], { p: [C.x, C.y, C.z] })));
  return group(out, { name: 'tail-gear' });
}

export function buildGear(pal: Palette, toAsset: ToAsset, tailBot: number): THREE.Object3D {
  return group([mirrorX(mainGear(pal, toAsset)), tailGear(pal, toAsset, tailBot)], { name: 'gear' });
}

