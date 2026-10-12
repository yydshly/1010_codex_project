/**
 * Fw 190 A-8 main undercarriage (port side, ASSET frame; mirrored for starboard).
 *
 * Wide-track (3.5 m) inward-retracting oleo legs hinged at the front spar, near-vertical in front
 * view and raked forward in side view. The 700 x 175 mm wheel sits on a stub axle on the INBOARD
 * side of the leg (it swings inboard into the root well); the large leg cover is fixed to the
 * outboard face of the leg and covers the leg and the upper part of the wheel. Torque links on
 * the front of the leg, brake line down the back.
 */
import * as THREE from 'three';
import { part, group } from '../../../core/kit';
import { gridGeo, lerp, bar, cylAB } from './geom';
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

const TRACK = 3.5;
const RAKE = 9 * DEG;

export function gearGeometry(): GearGeo {
  const py = wingY(DIM.pivot.x, DIM.pivot.s, false) + 0.03;
  const pivot = toAsset(B(DIM.pivot.x, py, DIM.pivot.s));
  const off = 0.13; // leg centre -> wheel centre (inboard)
  const a = new THREE.Vector3(-1, 0, 0); // inboard axle direction (port leg)
  // leg direction: down and forward, with the small inward cant needed for the 3.5 m track
  const R = DIM.mainTyre.r;
  const cy = R - 0.014;
  const dropY = pivot.y - cy;
  const dx = TRACK / 2 + off - pivot.x; // leg foot x - pivot x
  const d = new THREE.Vector3(dx / dropY, -1, Math.tan(RAKE)).normalize();
  const L = dropY / -d.y;
  const f = new THREE.Vector3(0, 0, 1).addScaledVector(d, -d.z).normalize();
  const centre = pivot.clone().addScaledVector(d, L).addScaledVector(a, off);
  return { pivot, d, a, f, L, centre };
}

/** Large leg cover on the outboard face of the leg (flat, slightly bowed), with brackets. */
function legCover(G: GearGeo): THREE.Object3D {
  const { pivot, d, f, L } = G;
  const outV = new THREE.Vector3(1, 0, 0);
  const rows: THREE.Vector3[][] = [];
  const t0 = 0.0, t1 = L + 0.02;
  const n = 18, N = 16;
  const R = DIM.mainTyre.r;
  for (let i = 0; i <= n; i++) {
    const t = lerp(t0, t1, i / n);
    const c = pivot.clone().addScaledVector(d, t);
    const u = i / n;
    // narrow along the leg, widening to the wheel diameter; rounded lower edge around the axle
    let wF = lerp(0.14, R + 0.02, Math.pow(u, 1.6)), wA = lerp(0.16, R + 0.02, Math.pow(u, 1.6));
    if (t > L - 0.2) {
      const k = (t - (L - 0.2)) / 0.22;
      const e = Math.sqrt(Math.max(0.02, 1 - k * k));
      wF *= e;
      wA *= e;
    }
    const outer: THREE.Vector3[] = [], inner: THREE.Vector3[] = [];
    for (let k = 0; k <= N; k++) {
      const q = lerp(-1, 1, k / N);
      const w = q < 0 ? wA : wF;
      const bow = 0.012 * (1 - q * q);
      const p = c.clone().addScaledVector(f, w * q).addScaledVector(outV, 0.07 + bow);
      outer.push(p);
      inner.push(p.clone().addScaledVector(outV, -0.007));
    }
    rows.push([...outer, ...inner.reverse()]);
  }
  const shell = gridGeo(rows, { closedU: true, capStart: true, capEnd: true });
  const res: THREE.Object3D[] = [part(shell, P.rlm76())];
  for (const t of [0.25, L - 0.35]) {
    const p = pivot.clone().addScaledVector(d, t);
    res.push(part(bar(p, p.clone().addScaledVector(outV, 0.066), 0.04, 0.025, d, 0, 0.004), P.rlm02()));
  }
  return group(res);
}

export function buildMainGearPort(): THREE.Object3D {
  const G = gearGeometry();
  const { pivot, d, a, f, L, centre } = G;
  const out: THREE.Object3D[] = [];
  const at = (t: number) => pivot.clone().addScaledVector(d, t);
  // oleo cylinder (starts inside the wing), chromed piston, collars
  out.push(part(cylAB(at(-0.15), at(0.66), 0.055, 0.055, 24), P.rlm02()));
  out.push(part(cylAB(at(0.56), at(L - 0.06), 0.04, 0.04, 24), P.oleo()));
  for (const [t, r, h] of [[0.66, 0.064, 0.045], [0.08, 0.064, 0.04]] as const) out.push(part(cylAB(at(t - h / 2), at(t + h / 2), r, r, 24), P.rlm02()));
  // foot: axle housing and inboard stub axle
  const foot = at(L);
  out.push(part(cylAB(foot.clone().addScaledVector(d, -0.09), foot.clone().addScaledVector(d, 0.05), 0.052, 0.052, 20), P.rlm02()));
  out.push(part(cylAB(foot.clone().addScaledVector(a, -0.03), foot.clone().addScaledVector(a, 0.1), 0.04, 0.04, 20), P.rlm02()));
  // torque links on the front of the leg
  const up = at(0.7).addScaledVector(f, 0.058);
  const lo = at(L - 0.08).addScaledVector(f, 0.058);
  const knee = up.clone().lerp(lo, 0.5).addScaledVector(f, 0.1);
  out.push(part(bar(up, knee, 0.026, 0.014, a, 0.01, 0.005), P.rlm02()));
  out.push(part(bar(knee, lo, 0.026, 0.014, a, 0.01, 0.005), P.rlm02()));
  for (const p of [up, knee, lo]) out.push(part(cylAB(p.clone().addScaledVector(a, -0.02), p.clone().addScaledVector(a, 0.02), 0.01, 0.01, 10), P.steel()));
  out.push(part(bar(at(0.7), up, 0.03, 0.022, a, 0, 0.004), P.rlm02()));
  out.push(part(bar(at(L - 0.08), lo, 0.03, 0.022, a, 0, 0.004), P.rlm02()));
  // brake line down the back of the leg to the brake
  const bl: THREE.Vector3[] = [];
  for (let k = 0; k <= 8; k++) bl.push(at(lerp(0.0, L - 0.1, k / 8)).addScaledVector(f, -0.064).addScaledVector(a, 0.02));
  bl.push(centre.clone().addScaledVector(a, -0.08).addScaledVector(f, -0.08).addScaledVector(d, -0.06));
  out.push(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bl), 40, 0.006, 8), P.black()));
  out.push(legCover(G));
  // wheel: outer face inboard, brake drum towards the leg
  const m = new THREE.Matrix4().compose(centre, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), a), new THREE.Vector3(1, 1, 1));
  out.push(placeWheel(wheelParts(DIM.mainTyre.r, DIM.mainTyre.w, 0.2, P.rlm02(), 64, 6), m));
  out.push(part(cylAB(centre.clone().addScaledVector(a, -0.1), centre.clone().addScaledVector(a, -0.065), 0.16, 0.16, 32), P.steel()));
  return group(out);
}
