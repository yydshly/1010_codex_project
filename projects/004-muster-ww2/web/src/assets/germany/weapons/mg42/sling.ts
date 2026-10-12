/**
 * MG 42 carrying sling (B-frame, see util.ts). As issued it is fixed "to the front of the housing
 * by a spring safety hook and to the pistol grip by a clamp":
 *  FRONT: steel spring snap hook through the eye under the front of the barrel jacket; the strap is
 *         looped through the hook's bar and riveted back on itself.
 *  REAR:  steel clamp round the lower end of the pistol grip with a cross bar behind the grip; the
 *         strap is looped over the bar and riveted, with a sliding keeper.
 * The free length hangs as a catenary for the given gravity direction (common/sling.ts), draped
 * under the gun's underside obstacles.
 */
import { THREE, G, part, group } from '../../../../core/kit';
import type { Mg42Mats } from './materials';
import { SLING_EYE } from './jacket';
import { GRIP_DOWN, gripAt } from './receiver';
import { hangStrap, strapGeo, tailGeo, frameAt, keeper, stud, slideBuckle, type Obb } from '../common/sling';
import { basis } from '../common/geo';

export const MG_SLING_W = 0.034;
export const MG_SLING_T = 0.0036;
/** grip distance (from the top of the grip) of the rear clamp */
export const CLAMP_S = 0.1035;

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const DOWN = V(0, -1, 0);

/** Oriented boxes with axes[0] = push direction (down). h = [down, x, z] half extents. */
function box(c: [number, number, number], hx: number, hy: number, hz: number): Obb {
  return { c: V(...c), axes: [DOWN.clone(), V(1, 0, 0), V(0, 0, 1)], h: [hy, hx, hz] };
}

const OBSTACLES: Obb[] = [
  box([0, -0.078, 0.078], 0.024, 0.075, 0.08), // butt
  box([0, -0.04, 0.2], 0.024, 0.03, 0.05), // stock front
  box([0, -0.03, 0.43], 0.026, 0.045, 0.18), // receiver + trigger housing
  box([0, -0.084, 0.37], 0.007, 0.016, 0.036), // trigger guard
  box([0, -0.012, 0.85], 0.024, 0.04, 0.25), // jacket + folded bipod
];

/** Frame of the grip: x = +X, y = up the grip, z = forward (perpendicular to the grip axis). */
function gripFrame(s: number): THREE.Matrix4 {
  const up = GRIP_DOWN.clone().negate();
  const fwd = V(1, 0, 0).cross(up).normalize();
  return basis(V(1, 0, 0), up, fwd, gripAt(s));
}

export function buildMg42Sling(mats: Mg42Mats, gravity: THREE.Vector3, slack: number): THREE.Group {
  const w = MG_SLING_W, t = MG_SLING_T;
  const g = gravity.clone().normalize();
  const out: THREE.Object3D[] = [];
  const off = t / 2 + 0.0004;

  // ---- rear clamp round the grip (grip-local: y up the grip, z forward)
  const gm = gripFrame(CLAMP_S);
  const clamp = new THREE.Group();
  {
    // band: rounded rectangle round the grip section, 8 mm tall
    const hwx = 0.015, fz = 0.0158, rz = -0.0185, r = 0.0038, bt = 0.0016;
    const ring: THREE.Vector3[] = [], nr: THREE.Vector3[] = [];
    const cs: [number, number, number, number][] = [
      [hwx - r, fz - r, 0, 90],
      [-hwx + r, fz - r, 90, 180],
      [-hwx + r, rz + r, 180, 270],
      [hwx - r, rz + r, 270, 360],
    ];
    for (const [cx, cz, a0, a1] of cs) {
      for (let k = 0; k <= 4; k++) {
        const a = ((a0 + ((a1 - a0) * k) / 4) * Math.PI) / 180;
        ring.push(V(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r));
        nr.push(V(Math.cos(a), 0, Math.sin(a)));
      }
    }
    clamp.add(part(G.strap(ring, 0.0085, bt, nr, { closed: true, smooth: false }), mats.hardware));
    // side lugs running back to the cross bar
    for (const sx of [1, -1]) clamp.add(part(G.rbox(0.0026, 0.0085, 0.017, 0.0008, 1), mats.hardware, { p: [sx * (hwx + 0.0006), -0.002, rz - 0.006] }));
    // cross bar behind the grip (the strap wraps it), with rivet heads
    clamp.add(part(G.rod([-(hwx + 0.002), -0.0055, rz - 0.013], [hwx + 0.002, -0.0055, rz - 0.013], 0.0026, 14), mats.hardware));
    for (const sx of [1, -1]) {
      const h = G.lathe([[0, 0], [0.0036, 0], [0.0033, 0.0008], [0.002, 0.0013], [0, 0.0014]], 14, 50);
      h.rotateZ((-sx * Math.PI) / 2);
      clamp.add(part(h, mats.hardware, { p: [sx * (hwx + 0.0019), -0.0055, rz - 0.013] }));
    }
    // clamp screw on the front
    clamp.add(part(G.cyl(0.0028, 0.0028, 0.003, 14), mats.blued, { p: [0, 0, fz + 0.0012], r: [90, 0, 0] }));
  }
  clamp.applyMatrix4(gm);
  out.push(clamp);
  const barW = V(0, -0.0055, -0.0185 - 0.013).applyMatrix4(gm);
  const gUp = GRIP_DOWN.clone().negate();
  const gFwd = V(1, 0, 0).cross(gUp).normalize();

  // ---- front spring hook hanging from the jacket eye towards the pull direction
  const eye = SLING_EYE.clone();
  const toRear = barW.clone().sub(eye).normalize();
  const hookDir = g.clone().multiplyScalar(0.7).add(toRear).normalize();
  const hx = V(1, 0, 0);
  const hy = hookDir.clone().negate(); // hook local +Y points back up to the eye
  const hz = hx.clone().cross(hy).normalize();
  const hm = basis(hx, hy, hz, eye);
  const hook = new THREE.Group();
  {
    // ring through the eye
    const ring = G.torus(0.0052, 0.0017, 8, 22);
    ring.rotateY(Math.PI / 2);
    hook.add(part(ring, mats.hardware, { p: [0, -0.0035, 0] }));
    // stamped body with the spring gate
    hook.add(part(G.rbox(0.009, 0.018, 0.0045, 0.0015, 2), mats.hardware, { p: [0, -0.0175, 0.002] }));
    hook.add(part(G.rod([0, -0.0115, -0.0045], [0, -0.026, -0.0045], 0.0011, 8), mats.hardware));
    hook.add(part(G.rbox(0.004, 0.004, 0.0035, 0.0012, 1), mats.hardware, { p: [0, -0.011, -0.0035] }));
    // rectangular strap frame at the bottom
    const fw = w / 2 + 0.003;
    hook.add(part(G.rod([-fw, -0.039, 0], [fw, -0.039, 0], 0.0022, 12), mats.hardware));
    for (const sx of [1, -1]) hook.add(part(G.rod([sx * fw, -0.039, 0], [sx * 0.004, -0.0285, 0], 0.0019, 10), mats.hardware));
    hook.add(part(G.rbox(0.012, 0.004, 0.005, 0.0015, 2), mats.hardware, { p: [0, -0.028, 0] }));
  }
  hook.applyMatrix4(hm);
  out.push(hook);
  const barF = V(0, -0.039, 0).applyMatrix4(hm);

  // ---- free span: from behind the front bar to below the rear bar
  const rwF = 0.0022 + off, rwR = 0.0026 + off;
  const A = { p: barF.clone().addScaledVector(hz, rwF), dir: hookDir.clone(), n: hz.clone(), lead: 0.01 };
  const bDown = gUp.clone().negate();
  const B = { p: barW.clone().addScaledVector(gFwd, rwR), dir: bDown.clone(), n: gFwd.clone(), lead: 0.01 };
  const path = hangStrap(A, B, { width: w, thickness: t, gravity: g, slack, obstacles: OBSTACLES, push: DOWN.clone(), twist: 0.06, sideHint: V(1, 0, 0) });
  out.push(part(strapGeo(path.P, path.N, w, t, 5), mats.leather));

  // front: half wrap round the hook bar, doubled tail with two rivets
  {
    const pts: THREE.Vector3[] = [], nr: THREE.Vector3[] = [];
    const c = barF;
    const rw = rwF;
    // round the bar over its eye side: from the +hz side (free span) to the -hz side (tail)
    for (let k = 0; k <= 12; k++) {
      const a = (Math.PI * k) / 12;
      const dirA = hz.clone().multiplyScalar(Math.cos(a)).addScaledVector(hy, Math.sin(a));
      pts.push(c.clone().addScaledVector(dirA, rw));
      nr.push(dirA.clone());
    }
    out.push(part(G.strap(pts, w, t, nr, { samples: 36 }), mats.leather));
    const sideF = path.at(0).n.dot(hz) >= 0 ? -1 : 1;
    out.push(part(tailGeo(path, 0, 0.06, sideF, w, t, c.clone().addScaledVector(hz, -rw), 0.016), mats.leather));
    out.push(stud(frameAt(path, 0.022, sideF), t, 2, mats.hardware, 0.0034));
    out.push(stud(frameAt(path, 0.042, sideF), t, 2, mats.hardware, 0.0034));
  }
  // rear: half wrap round the clamp bar, doubled tail with rivets and a keeper / slide
  {
    const pts: THREE.Vector3[] = [], nr: THREE.Vector3[] = [];
    const rw = rwR;
    // round the bar over its top: from the front side (free span) to the back side (tail)
    for (let k = 0; k <= 12; k++) {
      const a = (Math.PI * k) / 12;
      const dirA = gFwd.clone().multiplyScalar(Math.cos(a)).addScaledVector(gUp, Math.sin(a));
      pts.push(barW.clone().addScaledVector(dirA, rw));
      nr.push(dirA.clone());
    }
    out.push(part(G.strap(pts, w, t, nr, { samples: 36 }), mats.leather));
    const L = path.total;
    const sideR = path.at(L).n.dot(gFwd) >= 0 ? -1 : 1;
    out.push(part(tailGeo(path, L, L - 0.07, sideR, w, t, pts[pts.length - 1].clone(), 0.016), mats.leather));
    out.push(stud(frameAt(path, L - 0.03, sideR), t, 2, mats.hardware, 0.0034));
    out.push(slideBuckle(frameAt(path, L - 0.055, sideR), w, t, 2, mats.hardware, 0.012));
    out.push(keeper(frameAt(path, L - 0.075, sideR), w, t, 2, mats.leather));
  }
  const gr = group(out);
  gr.name = 'mg42-sling';
  return gr;
}

