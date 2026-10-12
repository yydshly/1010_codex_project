/**
 * Willys MB wheel: 6.00-16 mud-and-snow tyre with a non-directional bar tread (long bar across
 * the centre alternating with a short shoulder block, so the pattern reads the same in both
 * directions) on a 16 x 4.50E two-piece "combat" wheel: rim halves bolted together by a ring of
 * twelve bolts, pressed disc with five wheel nuts, hub with driving flange and cap, brake drum
 * and backing plate behind.
 *
 * Local frame: wheel centre at the origin, axle along X, OUTER face towards +X.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, latheX, merge, xf, clampBelow, cylX } from './util';

const HW = D.tyreHW;
const RMID = 0.278; // widest point of the section
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
      [rb - 0.003, sign * 0.051],
      [rb + 0.012, sign * 0.056],
      [0.221, sign * 0.059],
    ];
    const N = 8;
    for (let i = N - 1; i >= 0; i--) {
      const b = (i / N) * (Math.PI / 2);
      pts.push([RMID - (RMID - 0.224) * Math.sin(b), sign * (0.06 + (HW - 0.06) * Math.cos(b))]);
    }
    return rev ? pts.reverse() : pts;
  };
  prof.push(...lower(-1, false));
  const N = 28;
  for (let i = 1; i < N; i++) {
    const a = -Math.PI / 2 + (i / N) * Math.PI;
    const s = Math.sin(a), c = Math.cos(a);
    prof.push([RMID + (D.crownR - RMID) * Math.pow(Math.abs(c), 2 / E1), HW * Math.sign(s) * Math.pow(Math.abs(s), 2 / E1)]);
  }
  prof.push(...lower(1, true));
  const g = latheX(prof, seg, 50);
  // a thin rim-protector rib low on each sidewall
  const ribs: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const rib = G.torus(0.236, 0.0035, 6, seg);
    rib.rotateY(Math.PI / 2);
    rib.translate(s * 0.0605, 0, 0);
    ribs.push(rib);
  }
  return merge([g, ...ribs]);
}

/** One tread block from lateral a0 to a1 following the crown, at the top of the wheel. */
function lug(a0: number, a1: number, wb: number, h: number): THREE.BufferGeometry {
  const r0 = crownAt(a0), r1 = crownAt(a1);
  const len = Math.hypot(a1 - a0, r1 - r0);
  const tilt = Math.atan2(r1 - r0, a1 - a0);
  const sh: V2[] = [
    [0, 0],
    [len, 0],
    [len, wb],
    [0, wb],
  ];
  // outline plane: x = lateral (along the chord), y = tangential; extrude = radial
  const g = G.extrude(sh, h, 0.0028, 1, 1);
  g.translate(0, -wb / 2, h / 2 - 0.003);
  // map (lateral, tangential, radial) -> wheel (X, Z, Y) at angle 0 (top of wheel)
  const m = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  g.applyMatrix4(m);
  G.flipWinding(g);
  xf(g, [0, 0, 0], [0, 0, (tilt * 180) / Math.PI]);
  xf(g, [a0, r0, 0]);
  return g;
}

/** Non-directional bar tread: per pitch a long bar across the centre + a short opposite block. */
function tread(pitches: number): THREE.BufferGeometry {
  const wb = 0.03, h = 0.014;
  const long: [number, number][] = [
    [-0.016, 0.022],
    [0.022, 0.05],
    [0.05, 0.066],
    [0.066, 0.079],
  ];
  const short: [number, number][] = [
    [-0.079, -0.066],
    [-0.066, -0.05],
    [-0.05, -0.034],
  ];
  const protoA = [...long, ...short].map(([a, b]) => lug(a, b, wb, h));
  const protoB = protoA.map((g) => xf(g.clone(), [0, 0, 0], [0, 0, 0], [-1, 1, 1]));
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < pitches; i++) {
    const ang = (i / pitches) * 360;
    for (const pr of i % 2 === 0 ? protoA : protoB) parts.push(xf(pr.clone(), [0, 0, 0], [ang, 0, 0]));
  }
  return merge(parts);
}

let tyreCache: THREE.BufferGeometry | null = null;
/** Merged carcass + tread (built once, cloned per wheel). */
export function tyreGeometry(): THREE.BufferGeometry {
  if (!tyreCache) tyreCache = merge([carcass(72), tread(32)]);
  return tyreCache;
}

/** Rim halves (flat-base split rim) as one lathe, flanges and bead seats. */
function rimGeometry(): THREE.BufferGeometry {
  const rb = D.rimR;
  const outer: V2[] = [
    [0.2225, -0.0575],
    [0.2145, -0.0612],
    [0.207, -0.0585],
    [rb + 0.0005, -0.0525],
    [rb + 0.0005, -0.006],
    [0.2005, -0.003],
    [0.2005, 0.003],
    [rb + 0.0005, 0.006],
    [rb + 0.0005, 0.0525],
    [0.207, 0.0585],
    [0.2145, 0.0612],
    [0.2225, 0.0575],
  ];
  const inner: V2[] = outer.map(([r, x]) => [r - 0.0032, x * 0.955] as V2).reverse();
  const loop = [...outer, ...inner, outer[0]];
  return latheX(loop, 64, 35);
}

/** Outer pressed disc: joint flange, flat bolt ring, dished centre to the hub. */
function discGeometry(): THREE.BufferGeometry {
  const top: V2[] = [
    [0.199, 0.003],
    [0.186, 0.005],
    [0.172, 0.011],
    [0.158, 0.02],
    [0.124, 0.021],
    [0.11, 0.026],
    [0.098, 0.036],
    [0.088, 0.041],
    [0.05, 0.041],
    [0.044, 0.038],
    [0.04, 0.038],
  ];
  const bottom: V2[] = top.map(([r, x]) => [r, x - 0.0045] as V2).reverse();
  bottom[bottom.length - 1] = [0.1985, -0.0012];
  const loop = [...top, ...bottom, top[0]];
  return latheX(loop, 56, 35);
}

/** Inner rim half's flange (behind the joint), seen from the vehicle side. */
function innerFlange(): THREE.BufferGeometry {
  const prof: V2[] = [
    [0.199, -0.002],
    [0.199, -0.008],
    [0.16, -0.012],
    [0.13, -0.012],
    [0.13, -0.007],
    [0.16, -0.006],
    [0.199, -0.002],
  ];
  return latheX(prof, 48, 35);
}

export type WheelKind = 'road' | 'spare';

/**
 * Build a wheel. `groundY` (local) flattens the tyre where it meets the ground;
 * `spin` rotates the wheel about its axle (degrees) so bolt patterns differ.
 */
export function buildWheel(kind: WheelKind, spin = 0, groundY?: number): THREE.Group {
  const tyre = tyreGeometry().clone();
  xf(tyre, [0, 0, 0], [spin, 0, 0]);
  if (groundY !== undefined) clampBelow(tyre, groundY);

  const metal: THREE.BufferGeometry[] = [rimGeometry(), discGeometry(), innerFlange()];
  // stiffening bead around the wheel-nut circle
  const ring = G.torus(0.093, 0.0035, 6, 48);
  ring.rotateY(Math.PI / 2);
  ring.translate(0.04, 0, 0);
  metal.push(ring);

  const hub: THREE.BufferGeometry[] = [];
  // combat-rim joint bolts (12) on the flat ring of the outer disc
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2;
    const b = G.boltHead(0.016, 0.0075);
    b.rotateZ(-Math.PI / 2);
    b.translate(0.021, Math.cos(a) * 0.141, Math.sin(a) * 0.141);
    hub.push(b);
    // nut on the inner side
    const n = G.boltHead(0.016, 0.0075);
    n.rotateZ(Math.PI / 2);
    n.translate(-0.012, Math.cos(a) * 0.141, Math.sin(a) * 0.141);
    hub.push(n);
  }
  // five wheel nuts on the 5.5 in stud circle
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const nut = G.boltHead(0.022, 0.012);
    nut.rotateZ(-Math.PI / 2);
    nut.translate(0.041, Math.cos(a) * 0.0699, Math.sin(a) * 0.0699);
    hub.push(nut);
  }
  if (kind === 'road') {
    // hub body through the disc bore, driving flange with six cap screws, grease cap
    hub.push(cylX(0.05, 0.05, [0.06, 0, 0], 28));
    hub.push(
      latheX(
        [
          [0, 0.083],
          [0.064, 0.083],
          [0.067, 0.086],
          [0.067, 0.092],
          [0.061, 0.095],
          [0.037, 0.095],
          [0.035, 0.104],
          [0.028, 0.111],
          [0.016, 0.115],
          [0, 0.116],
        ],
        32,
        40,
      ),
    );
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const b = G.boltHead(0.013, 0.007);
      b.rotateZ(-Math.PI / 2);
      b.translate(0.094, Math.cos(a) * 0.049, Math.sin(a) * 0.049);
      hub.push(b);
    }
  } else {
    // spare: carrier boss through the centre bore
    hub.push(cylX(0.045, 0.034, [0.034, 0, 0], 24));
    hub.push(cylX(0.03, 0.012, [0.056, 0, 0], 20));
  }
  const metalG = merge(metal);
  const hubG = merge(hub);
  xf(metalG, [0, 0, 0], [spin, 0, 0]);
  xf(hubG, [0, 0, 0], [spin, 0, 0]);

  const kids: THREE.Object3D[] = [part(tyre, P.rubber()), part(metalG, P.body()), part(hubG, P.chassis())];
  if (kind === 'road') {
    // brake drum and backing plate behind the disc
    const drum = latheX(
      [
        [0, -0.092],
        [0.13, -0.092],
        [0.13, -0.082],
        [0.124, -0.078],
        [0.124, -0.024],
        [0.115, -0.019],
        [0, -0.019],
      ],
      40,
      40,
    );
    kids.push(part(drum, P.chassis()));
  }
  return group(kids);
}
