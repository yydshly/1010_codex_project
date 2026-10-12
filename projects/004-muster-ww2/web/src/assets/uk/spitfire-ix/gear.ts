/**
 * Spitfire LF Mk IXc main undercarriage (port side, ASSET frame; mirrored for starboard).
 *
 * Narrow-track (~1.74 m), outward-retracting oleo-pneumatic legs hinged at the wing root,
 * splayed outwards and raked forward (the C wing moved the legs 2 in forward). The wheel sits
 * on a stub axle outboard of the leg and is cambered with it; the flat leg fairing ("wheel
 * cover") on the inboard face closes the leg slot when retracted. Four-spoke hub, torque links
 * on the front, brake line down the back.
 */
import * as THREE from 'three';
import { part, group } from '../../../core/kit';
import { bar, cylAB, lerp, gridGeo } from './geom';
import { B, DIM, DEG, toAsset } from './frame';
import { wingY } from './wing';
import { P } from './paint';
import { wheelParts, placeWheel } from './tail';

export interface GearGeo {
  pivot: THREE.Vector3;
  d: THREE.Vector3;
  a: THREE.Vector3;
  f: THREE.Vector3;
  L: number;
  centre: THREE.Vector3;
}

export function gearGeometry(): GearGeo {
  const phi = 9 * DEG, rho = 12 * DEG;
  const py = wingY(DIM.pivot.x, DIM.pivot.s, false) + 0.02;
  const pivot = toAsset(B(DIM.pivot.x, py, DIM.pivot.s));
  const d = new THREE.Vector3(Math.sin(phi), -Math.cos(phi), Math.sin(rho)).normalize();
  const a = new THREE.Vector3(-d.y, d.x, 0).normalize(); // outboard axle direction
  if (a.x < 0) a.negate();
  const f = new THREE.Vector3(0, 0, 1).addScaledVector(d, -d.z).normalize(); // leg's front
  const R = DIM.mainTyre.r;
  const off = 0.13;
  const cy = R * Math.sqrt(1 - a.y * a.y) - 0.012;
  const L = (cy - pivot.y - off * a.y) / d.y;
  const centre = pivot.clone().addScaledVector(d, L).addScaledVector(a, off);
  return { pivot, d, a, f, L, centre };
}

/** Flat, slightly curved leg fairing on the inboard face of the leg. */
function legFairing(G: GearGeo): THREE.Object3D {
  const { pivot, d, a, f, L } = G;
  const t0 = 0.02, t1 = L - 0.13;
  const n = 12, N = 12;
  const rows: THREE.Vector3[][] = [];
  for (let i = 0; i <= n; i++) {
    const t = lerp(t0, t1, i / n);
    const c = pivot.clone().addScaledVector(d, t);
    const wHalf = 0.125 - 0.015 * (i / n);
    const outer: THREE.Vector3[] = [], inner: THREE.Vector3[] = [];
    for (let k = 0; k <= N; k++) {
      const u = lerp(-1, 1, k / N);
      const bow = 0.014 * (1 - u * u);
      const p = c.clone().addScaledVector(f, wHalf * u + 0.015).addScaledVector(a, -0.058 - bow);
      outer.push(p);
      inner.push(p.clone().addScaledVector(a, 0.006));
    }
    rows.push([...outer, ...inner.reverse()]);
  }
  const shell = gridGeo(rows, { closedU: true, capStart: true, capEnd: true });
  const out: THREE.Object3D[] = [part(shell, P.msg())];
  // brackets tying the fairing to the leg
  for (const t of [0.18, L - 0.3]) {
    const p = pivot.clone().addScaledVector(d, t);
    out.push(part(bar(p, p.clone().addScaledVector(a, -0.056), 0.04, 0.02, d, 0, 0.004), P.msg()));
  }
  return group(out);
}

export function buildMainGearPort(): THREE.Object3D {
  const G = gearGeometry();
  const { pivot, d, a, f, L, centre } = G;
  const out: THREE.Object3D[] = [];
  const at = (t: number) => pivot.clone().addScaledVector(d, t);
  // oleo cylinder (from inside the wing), chromed piston, collars
  out.push(part(cylAB(at(-0.12), at(0.6), 0.046, 0.046, 22), P.msg()));
  out.push(part(cylAB(at(0.5), at(L - 0.05), 0.032, 0.032, 20), P.oleo()));
  const collar = (t: number, r: number, h: number) => part(cylAB(at(t - h / 2), at(t + h / 2), r, r, 24), P.msg());
  out.push(collar(0.6, 0.054, 0.035));
  out.push(collar(0.02, 0.054, 0.03));
  // axle housing and stub axle towards the wheel
  const foot = at(L);
  out.push(part(cylAB(foot.clone().addScaledVector(d, -0.07), foot.clone().addScaledVector(d, 0.035), 0.044), P.msg()));
  out.push(part(cylAB(foot.clone().addScaledVector(a, -0.02), foot.clone().addScaledVector(a, 0.09), 0.034), P.msg()));
  // torque links on the front of the leg
  const up = at(0.62).addScaledVector(f, 0.048);
  const lo = at(L - 0.06).addScaledVector(f, 0.048);
  const knee = up.clone().lerp(lo, 0.5).addScaledVector(f, 0.08);
  out.push(part(bar(up, knee, 0.018, 0.012, a, 0.008, 0.004), P.msg()));
  out.push(part(bar(knee, lo, 0.018, 0.012, a, 0.008, 0.004), P.msg()));
  for (const p of [up, knee, lo]) out.push(part(cylAB(p.clone().addScaledVector(a, -0.016), p.clone().addScaledVector(a, 0.016), 0.009, 0.009, 10), P.steel()));
  out.push(part(bar(at(0.62), up, 0.024, 0.02, a, 0, 0.004), P.msg()));
  out.push(part(bar(at(L - 0.06), lo, 0.024, 0.02, a, 0, 0.004), P.msg()));
  // brake line down the back of the leg
  const bl: THREE.Vector3[] = [];
  for (let k = 0; k <= 8; k++) bl.push(at(lerp(0.0, L - 0.08, k / 8)).addScaledVector(f, -0.05).addScaledVector(a, 0.012));
  bl.push(centre.clone().addScaledVector(a, -0.075).addScaledVector(f, -0.06).addScaledVector(d, -0.05));
  out.push(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bl), 40, 0.005, 8), P.black()));
  out.push(legFairing(G));
  // wheel: tyre + four-spoke hub (outer face outboard), brake drum inboard
  const m = new THREE.Matrix4().compose(centre, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), a), new THREE.Vector3(1, 1, 1));
  out.push(placeWheel(wheelParts(DIM.mainTyre.r, DIM.mainTyre.w, 0.17, P.msg(), 64, 4), m));
  out.push(part(cylAB(centre.clone().addScaledVector(a, -0.095), centre.clone().addScaledVector(a, -0.05), 0.13, 0.13, 32), P.steel()));
  return group(out);
}
