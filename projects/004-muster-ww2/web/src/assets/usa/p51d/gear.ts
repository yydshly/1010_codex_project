/**
 * P-51D main undercarriage (port side, ASSET frame; mirrored for starboard).
 *
 * Wide-track inward-retracting legs: the oleo hinges on the wing front spar, raked forward and
 * vertical in front view; the 27 in wheel sits on a stub axle on the INBOARD side of the leg
 * (it swings inboard into the well on retraction) and the curved strut fairing door is fixed to
 * the outboard face of the leg. The large inner wheel-well doors are shown drooped open, as is
 * usual on a parked Mustang once the hydraulic pressure has bled off.
 */
import * as THREE from 'three';
import { part, group } from '../../../core/kit';
import { gridGeo, lerp, bar, cylAB, stripCap, tubeAlong } from './geom';
import { B, DIM, DEG, toAsset, dirToAsset } from './frame';
import { P } from './paint';
import { wheelParts, placeWheel } from './tail';
import { WELL, wingSurfY } from './planform';

export interface GearGeo {
  pivot: THREE.Vector3;
  d: THREE.Vector3;
  a: THREE.Vector3;
  f: THREE.Vector3;
  L: number;
  centre: THREE.Vector3;
}

export function gearGeometry(): GearGeo {
  const pivot = toAsset(B(DIM.pivot.x, DIM.pivot.y, DIM.pivot.s));
  const d = dirToAsset(new THREE.Vector3(0, -Math.cos(DIM.rake), Math.sin(DIM.rake))).normalize();
  const a = new THREE.Vector3(-1, 0, 0); // inboard (port side)
  const f = new THREE.Vector3(0, 0, 1).addScaledVector(d, -d.z).normalize();
  const off = DIM.pivot.x - DIM.track / 2;
  const cy = DIM.mainTyre.r - 0.012;
  const L = (pivot.y - cy) / -d.y;
  const centre = pivot.clone().addScaledVector(d, L).addScaledVector(a, off);
  return { pivot, d, a, f, L, centre };
}

/** Curved strut fairing door on the outboard face of the leg. */
function strutDoor(G: GearGeo): THREE.Object3D {
  const { pivot, d, f } = G;
  const out = new THREE.Vector3(1, 0, 0);
  const rows: THREE.Vector3[][] = [];
  const t0 = 0.02, t1 = G.L + 0.02;
  const n = 16, N = 14;
  for (let i = 0; i <= n; i++) {
    const t = lerp(t0, t1, i / n);
    const c = pivot.clone().addScaledVector(d, t);
    const u = i / n;
    // narrow at the top, widening round the wheel at the bottom; slightly forward-biased
    const wF = lerp(0.15, 0.2, u * u), wA = lerp(0.17, 0.22, u * u);
    const outer: THREE.Vector3[] = [], inner: THREE.Vector3[] = [];
    for (let k = 0; k <= N; k++) {
      const q = lerp(-1, 1, k / N);
      const w = q < 0 ? wA : wF;
      const bulge = 0.03 * (1 - q * q);
      const p = c.clone().addScaledVector(f, w * q).addScaledVector(out, 0.075 + bulge);
      outer.push(p);
      inner.push(p.clone().addScaledVector(out, -0.008));
    }
    rows.push([...outer, ...inner.reverse()]);
  }
  const shell = gridGeo(rows, { closedU: true });
  const res: THREE.Object3D[] = [
    part(shell, P.bare()),
    part(stripCap(rows[0], d.clone().negate()), P.bare()),
    part(stripCap(rows[rows.length - 1], d), P.bare()),
  ];
  for (const t of [0.3, 0.75]) {
    const p = pivot.clone().addScaledVector(d, t);
    res.push(part(bar(p, p.clone().addScaledVector(out, 0.08), 0.03, 0.02, d, 0, 0.004), P.silver()));
  }
  return group(res);
}

/** Inner wheel-well door (port), hinged near the centre line, drooped open. */
function innerDoor(): THREE.Object3D {
  const hx = 0.335;
  const sA = WELL.s - WELL.r - 0.03, sB = WELL.s + WELL.r + 0.03;
  const hingeA = toAsset(B(hx, wingSurfY(hx, sA, false) - 0.004, sA));
  const hingeB = toAsset(B(hx, wingSurfY(hx, sB, false) - 0.004, sB));
  const axis = hingeB.clone().sub(hingeA).normalize();
  const droop = 64 * DEG;
  // closed door outline in the local (along-hinge, outboard) plane, rounded like the well
  const W = 2 * WELL.r + 0.06, D = WELL.ax + WELL.r + 0.03 - hx;
  const sh = new THREE.Shape();
  const r = 0.2;
  sh.moveTo(0, 0);
  sh.lineTo(W, 0);
  sh.lineTo(W, D - r);
  sh.quadraticCurveTo(W, D, W - r, D);
  sh.lineTo(r, D);
  sh.quadraticCurveTo(0, D, 0, D - r);
  sh.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1, curveSegments: 8 });
  // local: x along hinge, y outboard, z = thickness (down = -z)
  const outboard = new THREE.Vector3(1, 0, 0).addScaledVector(axis, -axis.x).normalize();
  const down0 = new THREE.Vector3().crossVectors(axis, outboard).normalize();
  const downV = down0.y < 0 ? down0 : down0.negate();
  const q = new THREE.Quaternion().setFromAxisAngle(axis, 0);
  // rotate the outboard direction down by the droop angle about the hinge
  const outD = outboard.clone().multiplyScalar(Math.cos(droop)).addScaledVector(downV, Math.sin(droop));
  const nrm = new THREE.Vector3().crossVectors(axis, outD).normalize();
  const m = new THREE.Matrix4().makeBasis(axis, outD, nrm).setPosition(hingeA);
  g.applyMatrix4(m);
  void q;
  // stiffener ribs on the inner face
  const ribs: THREE.Object3D[] = [];
  for (const f of [0.3, 0.7]) {
    const a = hingeA.clone().addScaledVector(axis, W * f).addScaledVector(outD, 0.04);
    const b = a.clone().addScaledVector(outD, D * 0.85);
    const side = nrm.y > 0 ? nrm : nrm.clone().negate();
    ribs.push(part(bar(a.clone().addScaledVector(side, 0.015), b.clone().addScaledVector(side, 0.015), 0.02, 0.022, side, 0, 0.004), P.bare()));
  }
  // hinge knuckles
  for (const f of [0.15, 0.5, 0.85]) {
    const p = hingeA.clone().addScaledVector(axis, W * f);
    ribs.push(part(cylAB(p.clone().addScaledVector(axis, -0.03), p.clone().addScaledVector(axis, 0.03), 0.012, 0.012, 10), P.steel()));
  }
  const door = group([part(g, P.bare()), ...ribs]);
  door.userData.campMotion = { kind: 'door', pivot: hingeA.toArray(), angle: droop };
  return door;
}

export function buildMainGearPort(): THREE.Object3D {
  const G = gearGeometry();
  const { pivot, d, a, f, L, centre } = G;
  const out: THREE.Object3D[] = [];
  const at = (t: number) => pivot.clone().addScaledVector(d, t);
  // oleo cylinder (starts inside the wing), chromed piston, collars
  out.push(part(cylAB(at(-0.12), at(0.6), 0.056, 0.056, 24), P.silver()));
  out.push(part(cylAB(at(0.5), at(L - 0.06), 0.041, 0.041, 24), P.oleo()));
  for (const [t, r, h] of [[0.6, 0.064, 0.04], [0.1, 0.064, 0.035]] as const) out.push(part(cylAB(at(t - h / 2), at(t + h / 2), r, r, 24), P.silver()));
  // foot: axle housing and inboard stub axle
  const foot = at(L);
  out.push(part(cylAB(foot.clone().addScaledVector(d, -0.08), foot.clone().addScaledVector(d, 0.05), 0.052, 0.052, 20), P.silver()));
  out.push(part(cylAB(foot.clone().addScaledVector(a, -0.03), foot.clone().addScaledVector(a, 0.1), 0.04, 0.04, 20), P.silver()));
  // torque links on the front of the leg
  const up = at(0.64).addScaledVector(f, 0.055);
  const lo = at(L - 0.07).addScaledVector(f, 0.055);
  const knee = up.clone().lerp(lo, 0.5).addScaledVector(f, 0.1);
  out.push(part(bar(up, knee, 0.024, 0.014, a, 0.01, 0.005), P.silver()));
  out.push(part(bar(knee, lo, 0.024, 0.014, a, 0.01, 0.005), P.silver()));
  for (const p of [up, knee, lo]) out.push(part(cylAB(p.clone().addScaledVector(a, -0.02), p.clone().addScaledVector(a, 0.02), 0.01, 0.01, 10), P.steel()));
  out.push(part(bar(at(0.64), up, 0.03, 0.022, a, 0, 0.004), P.silver()));
  out.push(part(bar(at(L - 0.07), lo, 0.03, 0.022, a, 0, 0.004), P.silver()));
  // brake line down the back of the leg to the brake
  const bl: THREE.Vector3[] = [];
  for (let k = 0; k <= 8; k++) bl.push(at(lerp(0.0, L - 0.1, k / 8)).addScaledVector(f, -0.062));
  bl.push(centre.clone().addScaledVector(a, -0.09).addScaledVector(f, -0.07).addScaledVector(d, -0.06));
  out.push(part(tubeAlong(bl, 0.0065, 40, 8), P.black()));
  out.push(strutDoor(G));
  // wheel: outer face inboard, brake drum towards the leg
  const m = new THREE.Matrix4().compose(centre, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), a), new THREE.Vector3(1, 1, 1));
  out.push(placeWheel(wheelParts(DIM.mainTyre.r, DIM.mainTyre.w, 0.2, 64, 8), m));
  out.push(part(cylAB(centre.clone().addScaledVector(a, -0.11), centre.clone().addScaledVector(a, -0.07), 0.16, 0.16, 32), P.steel()));
  const leg = group(out);
  leg.userData.campMotion = { kind: 'gear', pivot: pivot.toArray(), angle: -Math.PI / 2 };
  return group([leg, innerDoor()]);
}
