/**
 * GAZ-67B wheel: 6.50-16 tyre with a segmented herringbone lug tread on a 16 in pressed-steel
 * disc wheel (drop-centre rim, dished disc, five wheel nuts), hub with drive flange and cap,
 * brake drum behind the disc.
 *
 * Local frame: wheel centre at the origin, axle along X, OUTER face towards +X.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, latheX, merge, xf, clampBelow, cylX } from './util';

const HW = D.tyreHW;
const RMID = 0.276; // widest point of the section
const E1 = 5; // crown squareness

/** Carcass surface radius at lateral offset x (superellipse crown). */
function crownAt(x: number): number {
  const a = Math.min(1, Math.abs(x) / HW);
  return RMID + (D.crownR - RMID) * Math.pow(Math.max(0, 1 - Math.pow(a, E1)), 1 / E1);
}

function carcass(seg: number): THREE.BufferGeometry {
  const rb = D.rimR;
  const prof: V2[] = [];
  const lower = (sign: number, rev: boolean) => {
    const pts: V2[] = [
      [rb - 0.003, sign * 0.056],
      [rb + 0.011, sign * 0.061],
    ];
    const N = 7;
    for (let i = N; i >= 0; i--) {
      const b = (i / N) * (Math.PI / 2);
      pts.push([RMID - (RMID - 0.222) * Math.sin(b), sign * (0.064 + (HW - 0.064) * Math.cos(b))]);
    }
    return rev ? pts.reverse() : pts;
  };
  prof.push(...lower(-1, false));
  const N = 26;
  for (let i = 1; i < N; i++) {
    const a = -Math.PI / 2 + (i / N) * Math.PI;
    const s = Math.sin(a), c = Math.cos(a);
    prof.push([RMID + (D.crownR - RMID) * Math.pow(Math.abs(c), 2 / E1), HW * Math.sign(s) * Math.pow(Math.abs(s), 2 / E1)]);
  }
  prof.push(...lower(1, true));
  return latheX(prof, seg, 50);
}

/** Segmented herringbone lugs: two blocks per half-chevron, halves staggered by half a pitch. */
function tread(pitches: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const phi = G.deg(24);
  const wb = 0.03; // tangential width
  const h = 0.012; // lug height
  const segs: [number, number][] = [
    [0.006, 0.046],
    [0.05, 0.081],
  ];
  const proto = segs.map(([a0, a1]) => {
    const r0 = crownAt(a0), r1 = crownAt(a1);
    const len = Math.hypot(a1 - a0, r1 - r0);
    const tilt = Math.atan2(r1 - r0, a1 - a0);
    const sh: V2[] = [
      [0, 0],
      [len, len * Math.tan(phi)],
      [len, len * Math.tan(phi) + wb],
      [0, wb],
    ];
    // outline plane: x = lateral (along the chord), y = tangential; extrude = radial
    const g = G.extrude(sh, h, 0.0025, 1, 1);
    g.translate(0, -wb / 2 - (len * Math.tan(phi)) / 2, h / 2 - 0.003);
    // map (lateral, tangential, radial) -> wheel (X, Z, Y) at angle 0 (top of wheel)
    const m = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
    g.applyMatrix4(m);
    G.flipWinding(g);
    xf(g, [0, 0, 0], [0, 0, (tilt * 180) / Math.PI]);
    xf(g, [a0, r0, 0]);
    return g;
  });
  for (let i = 0; i < pitches; i++) {
    for (const side of [1, -1]) {
      const ang = ((i + (side > 0 ? 0 : 0.5)) / pitches) * 360;
      for (const pr of proto) {
        const g = pr.clone();
        if (side < 0) xf(g, [0, 0, 0], [0, 0, 0], [-1, 1, 1]);
        xf(g, [0, 0, 0], [ang, 0, 0]);
        parts.push(g);
      }
    }
  }
  return merge(parts);
}

let tyreCache: THREE.BufferGeometry | null = null;
/** Merged carcass + tread (built once, cloned per wheel). */
export function tyreGeometry(): THREE.BufferGeometry {
  if (!tyreCache) tyreCache = merge([carcass(72), tread(32)]);
  return tyreCache;
}

function rimGeometry(): THREE.BufferGeometry {
  const rb = D.rimR;
  const outer: V2[] = [
    [0.2215, -0.0595],
    [0.2135, -0.0625],
    [0.2065, -0.0595],
    [rb + 0.0005, -0.052],
    [rb + 0.0005, -0.039],
    [0.191, -0.029],
    [0.1865, -0.02],
    [0.1865, 0.02],
    [0.191, 0.029],
    [rb + 0.0005, 0.039],
    [rb + 0.0005, 0.052],
    [0.2065, 0.0595],
    [0.2135, 0.0625],
    [0.2215, 0.0595],
  ];
  const inner: V2[] = outer.map(([r, x]) => [r - 0.0032, x * 0.955] as V2).reverse();
  // CCW in (r, axial): the tyre-side surface runs towards +axial at the larger radius
  const loop = [...outer, ...inner, outer[0]];
  return latheX(loop, 64, 35);
}

function discGeometry(): THREE.BufferGeometry {
  const top: V2[] = [
    [0.1845, 0.004],
    [0.168, 0.006],
    [0.148, 0.011],
    [0.129, 0.021],
    [0.116, 0.034],
    [0.103, 0.04],
    [0.059, 0.04],
    [0.051, 0.0365],
    [0.041, 0.0365],
  ];
  const bottom: V2[] = top.map(([r, x]) => [r, x - 0.0045] as V2).reverse();
  bottom[bottom.length - 1] = [0.1835, -0.0012];
  const loop = [...top, ...bottom, top[0]];
  return latheX(loop, 56, 35);
}

export type WheelKind = 'road' | 'spare';

/**
 * Build a wheel. `groundY` (local) flattens the tyre where it meets the ground;
 * `spin` rotates the wheel about its axle (degrees) so nut patterns differ.
 */
export function buildWheel(kind: WheelKind, spin = 0, groundY?: number): THREE.Group {
  const tyre = tyreGeometry().clone();
  xf(tyre, [0, 0, 0], [spin, 0, 0]);
  if (groundY !== undefined) clampBelow(tyre, groundY);

  const metal: THREE.BufferGeometry[] = [rimGeometry(), discGeometry()];
  // wheel nuts on the stud circle
  const nuts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const nut = G.boltHead(0.021, 0.011);
    nut.rotateZ(-Math.PI / 2);
    nut.translate(0.0365, Math.cos(a) * 0.075, Math.sin(a) * 0.075);
    nuts.push(nut);
  }
  // pressed stiffening ring around the stud circle
  const ring = G.torus(0.095, 0.004, 6, 48);
  ring.rotateY(Math.PI / 2);
  ring.translate(0.0395, 0, 0);
  metal.push(ring);

  const hub: THREE.BufferGeometry[] = [...nuts];
  if (kind === 'road') {
    // hub body through the disc bore, drive flange with bolts, grease cap
    hub.push(cylX(0.05, 0.05, [0.055, 0, 0], 28));
    hub.push(latheX([
      [0, 0.078],
      [0.063, 0.078],
      [0.066, 0.081],
      [0.066, 0.087],
      [0.06, 0.09],
      [0.036, 0.09],
      [0.034, 0.1],
      [0.028, 0.108],
      [0.016, 0.112],
      [0, 0.113],
    ].map(([r, x]) => [r, x] as V2), 32, 40));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const b = G.boltHead(0.013, 0.007);
      b.rotateZ(-Math.PI / 2);
      b.translate(0.089, Math.cos(a) * 0.048, Math.sin(a) * 0.048);
      hub.push(b);
    }
  } else {
    // spare: carrier boss and three mounting nuts through the centre bore
    hub.push(cylX(0.045, 0.03, [0.03, 0, 0], 24));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const b = G.boltHead(0.019, 0.01);
      b.rotateZ(-Math.PI / 2);
      b.translate(0.045, Math.cos(a) * 0.03, Math.sin(a) * 0.03);
      hub.push(b);
    }
  }
  const metalG = merge(metal);
  const hubG = merge(hub);
  xf(metalG, [0, 0, 0], [spin, 0, 0]);
  xf(hubG, [0, 0, 0], [spin, 0, 0]);

  const kids: THREE.Object3D[] = [part(tyre, P.rubber()), part(metalG, P.body()), part(hubG, P.chassis())];
  if (kind === 'road') {
    // brake drum and backing plate behind the disc
    const drum = latheX([
      [0, -0.084],
      [0.15, -0.084],
      [0.15, -0.074],
      [0.142, -0.07],
      [0.142, -0.01],
      [0.13, -0.004],
      [0, -0.004],
    ], 40, 40);
    kids.push(part(drum, P.chassis()));
  }
  return group(kids);
}
