/**
 * Bf 109 G-6 main undercarriage (port side, ASSET frame; mirrored for starboard).
 *
 * The legs hinge on the firewall forging at the wing root and are splayed outwards (~12 deg,
 * consistent with the 85 deg outward retraction into the wing), raked slightly forward. The
 * 660 x 160 mm wheel sits on a stub axle outboard of the leg, cambered with it. A curved leg
 * cover is fixed to the outboard face of the oleo; torque links on the front, brake line behind.
 */
import * as THREE from 'three';
import { part, group } from '../../../core/kit';
import { gridGeo, frameBar, lerp } from './geom';
import { B, DIM, DEG, toAsset } from './frame';
import { P } from './paint';
import { stripCap } from './geom';
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
  const phi = 12 * DEG, rho = 6 * DEG;
  const pivot = toAsset(B(DIM.pivot.x, DIM.pivot.y, DIM.pivot.s));
  const d = new THREE.Vector3(Math.sin(phi), -Math.cos(phi), Math.sin(rho)).normalize();
  const a = new THREE.Vector3(-d.y, d.x, 0).normalize(); // outboard axle direction
  if (a.x < 0) a.negate();
  const f = new THREE.Vector3(0, 0, 1).addScaledVector(d, -d.z).normalize(); // leg's front
  const R = DIM.mainTyre.r;
  const off = 0.125;
  const cy = R * Math.sqrt(1 - a.y * a.y) - 0.012;
  const L = (cy - pivot.y - off * a.y) / d.y;
  const centre = pivot.clone().addScaledVector(d, L).addScaledVector(a, off);
  return { pivot, d, a, f, L, centre };
}

function cyl(p0: THREE.Vector3, p1: THREE.Vector3, r0: number, r1 = r0, seg = 20): THREE.BufferGeometry {
  const len = p0.distanceTo(p1);
  const g = new THREE.CylinderGeometry(r1, r0, len, seg);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(p0, q, new THREE.Vector3(1, 1, 1)));
  return g;
}

/** Curved leg cover on the outboard face of the leg (a thin C-section plate). */
function legCover(G: GearGeo): THREE.Object3D {
  const { pivot, d, a, f } = G;
  const rows: THREE.Vector3[][] = [];
  const t0 = -0.02, t1 = 0.44;
  const n = 12;
  const N = 14;
  for (let i = 0; i <= n; i++) {
    const t = lerp(t0, t1, i / n);
    const c = pivot.clone().addScaledVector(d, t);
    const wHalf = lerp(0.1, 0.085, i / n) * (i === n ? 0.97 : 1);
    const outer: THREE.Vector3[] = [], inner: THREE.Vector3[] = [];
    for (let k = 0; k <= N; k++) {
      const ang = lerp(-1, 1, k / N);
      const bulge = 0.022 * (1 - ang * ang);
      const p = c.clone().addScaledVector(f, wHalf * ang).addScaledVector(a, 0.056 + bulge);
      outer.push(p);
      inner.push(p.clone().addScaledVector(a, -0.005));
    }
    rows.push([...outer, ...inner.reverse()]);
  }
  const shell = gridGeo(rows, { closedU: true });
  return group([
    part(shell, P.hub()),
    part(stripCap(rows[0], d.clone().negate()), P.hub()),
    part(stripCap(rows[rows.length - 1], d), P.hub()),
    // two brackets tying the cover to the leg
    part(frameBar(pivot.clone().addScaledVector(d, 0.12), pivot.clone().addScaledVector(d, 0.12).addScaledVector(a, 0.06), 0.03, 0.02, d, 0, 0.004), P.rlm02()),
    part(frameBar(pivot.clone().addScaledVector(d, 0.36), pivot.clone().addScaledVector(d, 0.36).addScaledVector(a, 0.06), 0.03, 0.02, d, 0, 0.004), P.rlm02()),
  ]);
}

export function buildMainGearPort(): THREE.Object3D {
  const G = gearGeometry();
  const { pivot, d, a, f, L, centre } = G;
  const out: THREE.Object3D[] = [];
  const at = (t: number) => pivot.clone().addScaledVector(d, t);
  // oleo cylinder (starts inside the wing), chromed piston, collars
  out.push(part(cyl(at(-0.14), at(0.47), 0.043), P.rlm02()));
  out.push(part(cyl(at(0.4), at(L - 0.045), 0.031), P.oleo()));
  const collar = (t: number, r: number, h: number) => part(cyl(at(t - h / 2), at(t + h / 2), r, r, 24), P.rlm02());
  out.push(collar(0.47, 0.05, 0.035));
  out.push(collar(0.05, 0.05, 0.03));
  // axle housing and stub axle towards the wheel
  const foot = at(L);
  out.push(part(cyl(foot.clone().addScaledVector(d, -0.06), foot.clone().addScaledVector(d, 0.03), 0.042), P.rlm02()));
  out.push(part(cyl(foot.clone().addScaledVector(a, -0.02), foot.clone().addScaledVector(a, 0.08), 0.034), P.rlm02()));
  // torque links (scissors) on the front of the leg
  const up = at(0.5).addScaledVector(f, 0.045);
  const lo = at(L - 0.05).addScaledVector(f, 0.045);
  const knee = up.clone().lerp(lo, 0.5).addScaledVector(f, 0.085);
  out.push(part(frameBar(up, knee, 0.018, 0.012, a, 0.008, 0.004), P.rlm02()));
  out.push(part(frameBar(knee, lo, 0.018, 0.012, a, 0.008, 0.004), P.rlm02()));
  for (const p of [up, knee, lo]) {
    const pin = cyl(p.clone().addScaledVector(a, -0.016), p.clone().addScaledVector(a, 0.016), 0.009, 0.009, 10);
    out.push(part(pin, P.steel()));
  }
  // lugs joining the links to the leg
  out.push(part(frameBar(at(0.5), up, 0.024, 0.02, a, 0, 0.004), P.rlm02()));
  out.push(part(frameBar(at(L - 0.05), lo, 0.024, 0.02, a, 0, 0.004), P.rlm02()));
  // brake line down the back of the leg to the brake plate
  const bl: THREE.Vector3[] = [];
  for (let k = 0; k <= 8; k++) bl.push(at(lerp(0.0, L - 0.08, k / 8)).addScaledVector(f, -0.05).addScaledVector(a, -0.01));
  bl.push(centre.clone().addScaledVector(a, -0.085).addScaledVector(f, -0.06).addScaledVector(d, -0.05));
  out.push(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bl), 40, 0.0055, 8), P.black()));
  out.push(legCover(G));
  // wheel: tyre + hub (outer face outboard) + brake drum inboard
  const m = new THREE.Matrix4().compose(centre, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), a), new THREE.Vector3(1, 1, 1));
  out.push(placeWheel(wheelParts(DIM.mainTyre.r, DIM.mainTyre.w, 0.2, P.hub(), 64), m));
  const drum = cyl(centre.clone().addScaledVector(a, -0.1), centre.clone().addScaledVector(a, -0.05), 0.15, 0.15, 32);
  out.push(part(drum, P.steel()));
  return group(out);
}
