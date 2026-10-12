/**
 * DP-27 barrel group (D-frame, see layout.ts): the barrel casing (upper tube with real side and top
 * windows, lower guide tube for the gas piston and return spring, joined along their length), the
 * casing front piece with the front sight (post between two protective ears on a sliding base), the
 * gas regulator under it, the magazine rest on the casing top, the front sling swivel, the barrel
 * (plain, or the early finned barrel seen through the windows) and the conical flash hider.
 */
import { THREE, G, part } from '../../../../core/kit';
import { DP } from './layout';
import { slottedScrew, type P2 } from './geo';
import { dpMat } from './materials';
import { sidePlate, cylX, cylZ, latheZ, perfTube, holeStadium, type PerfHole } from '../common/geo';

/** Side windows (both sides) and top windows of the casing: [z centre, length]. */
const SIDE_WINDOWS: [number, number][] = [
  [0.648, 0.036],
  [0.698, 0.036],
  [0.748, 0.036],
  [0.797, 0.036],
  [0.846, 0.036],
  [0.9465, 0.03],
];
const TOP_WINDOWS: [number, number][] = [
  [0.797, 0.03],
  [0.846, 0.03],
  [0.9465, 0.026],
];
const COLLAR_Z0 = 0.9655;

/** Front sling swivel geometry (D-frame): lug base on the casing and the bar the strap wraps. */
export function frontSwivel() {
  const a = (DP.swivelFrontDeg * Math.PI) / 180;
  const radial = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
  const tangent = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0);
  const z = DP.swivelFrontZ;
  const pin = radial.clone().multiplyScalar(DP.casingR + 0.0045).setZ(z);
  // the loop swings back towards the strap: reach direction between radial and -Z
  const reach = radial.clone().multiplyScalar(0.72).add(new THREE.Vector3(0, 0, -0.69)).normalize();
  const bar = pin.clone().addScaledVector(reach, 0.0125);
  return { radial, tangent, pin, reach, bar };
}

/** Split a tube mesh into its inner (inward-facing) surface and the rest (outer surface, walls, caps). */
function splitInner(g: THREE.BufferGeometry): { outer: THREE.BufferGeometry; inner: THREE.BufferGeometry } {
  const src = g.index ? g.toNonIndexed() : g;
  const pos = src.attributes.position, nor = src.attributes.normal;
  const o: number[] = [], on: number[] = [], i2: number[] = [], inn: number[] = [];
  for (let t = 0; t < pos.count; t += 3) {
    let cx = 0, cy = 0, nx = 0, ny = 0;
    for (let k = 0; k < 3; k++) {
      cx += pos.getX(t + k); cy += pos.getY(t + k);
      nx += nor.getX(t + k); ny += nor.getY(t + k);
    }
    const rl = Math.hypot(cx, cy) || 1, nl = Math.hypot(nx, ny, 1e-9);
    const inward = (cx * nx + cy * ny) / (rl * nl) < -0.7;
    const P = inward ? i2 : o, N = inward ? inn : on;
    for (let k = 0; k < 3; k++) {
      P.push(pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k));
      N.push(nor.getX(t + k), nor.getY(t + k), nor.getZ(t + k));
    }
  }
  const mk = (P: number[], N: number[]) => {
    const b = new THREE.BufferGeometry();
    b.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    b.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    return G.mergeVertices(b, 1e-7);
  };
  return { outer: mk(o, on), inner: mk(i2, inn) };
}

export interface BarrelOptions {
  finned: boolean;
}

export function buildBarrelGroup(opts: BarrelOptions): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [];
  const jacket = dpMat.jacket();
  const blued = dpMat.blued();
  const barrelM = dpMat.barrel();
  const soot = dpMat.soot();
  const bare = dpMat.bare();
  const R = DP.casingR, T = DP.casingT;

  // --- upper tube with windows: conforming tile mesh (8 columns of 45 deg; phi from +X towards +Y) ---
  {
    const D = Math.PI / 180;
    const phis = Array.from({ length: 9 }, (_, i) => (-22.5 + 45 * i) * D);
    const z0 = DP.casingRear, z1 = COLLAR_Z0 + 0.003;
    const sideRows = [z0, 0.623, 0.673, 0.723, 0.7725, 0.8215, 0.871, 0.925, z1];
    const topRows = [z0, 0.7725, 0.8215, 0.871, 0.925, z1];
    const rows = Array.from({ length: 8 }, (_, j) => (j === 0 || j === 4 ? sideRows : j === 2 ? topRows : [z0, z1]));
    const holes: PerfHole[] = [];
    for (const [zc, len] of SIDE_WINDOWS) for (const phi of [0, Math.PI]) holes.push({ phi, z: zc, sdf: holeStadium(0.0128, len) });
    for (const [zc, len] of TOP_WINDOWS) holes.push({ phi: Math.PI / 2, z: zc, sdf: holeStadium(0.0066, len) });
    const tube = perfTube({ R, t: T, phis, rows, dz: 0.006, z0, nPhi: 4, holes });
    const split = splitInner(tube);
    parts.push(part(split.outer, jacket));
    parts.push(part(split.inner, soot));
  }

  // --- guide tube under the casing, the web joining them, rear sleeve ---
  parts.push(part(cylZ(DP.guideR, DP.guideRear, COLLAR_Z0 + 0.004, 28, 0.0006), jacket, { p: [0, DP.guideY, 0] }));
  parts.push(part(G.box(0.0062, 0.0056, DP.guideFront - DP.rcvFront), jacket, { p: [0, -0.0205, (DP.guideFront + DP.rcvFront) / 2] }));

  // --- casing front piece: collar with a rounded nose around the barrel ---
  parts.push(
    part(
      latheZ(
        [
          [0.0118, COLLAR_Z0],
          [0.0222, COLLAR_Z0],
          [0.0229, COLLAR_Z0 + 0.0009],
          [0.0229, 0.9895],
          [0.0222, 0.9942],
          [0.0203, 0.9975],
          [0.0168, 0.9991],
          [0.0118, 0.9992],
          [0.0118, COLLAR_Z0],
        ],
        44,
        40,
      ),
      blued,
    ),
  );
  // collar extends down around the guide tube: gas regulator housing
  parts.push(part(sidePlate([[COLLAR_Z0, -0.012], [0.9935, -0.012], [0.9935, -0.036], [0.99, -0.0405], [COLLAR_Z0 + 0.003, -0.0405], [COLLAR_Z0, -0.037]], 0.0205, 0, 0.0014), blued));
  // regulator: stepped plug with slots, protruding forward under the nose
  parts.push(part(latheZ([[0, 0.9925], [0.0086, 0.9925], [0.0086, 0.9985], [0.0078, 1.0005], [0.0052, 1.0012], [0, 1.0012]], 24, 40), blued, { p: [0, DP.guideY, 0] }));
  // three gas ports of different sizes on the regulator face
  [0.0011, 0.0014, 0.0017].forEach((r, i) => {
    const a = (i * 2 * Math.PI) / 3 + 0.5;
    parts.push(part(cylZ(r, 1.0006, 1.0015, 12, 0.0001), dpMat.void(), { p: [0.0044 * Math.cos(a), DP.guideY + 0.0044 * Math.sin(a), 0] }));
  });
  // retaining pin with a small ring on the left
  parts.push(part(cylX(0.0013, -0.012, 0.0125, 8, 0.0002), bare, { p: [0, DP.guideY - 0.001, 0.9785] }));
  parts.push(part(G.torus(0.0036, 0.0007, 6, 20), bare, { p: [0.0132, DP.guideY - 0.0045, 0.9785], r: [0, 90, 0] }));

  // --- front sight: base on the collar, sliding protector with two ears, post, adjusting screw ---
  const fz = DP.fsZ;
  parts.push(part(sidePlate([[fz - 0.0135, 0.0195], [fz + 0.0135, 0.0195], [fz + 0.0135, 0.0262], [fz + 0.0105, 0.0296], [fz - 0.011, 0.0296], [fz - 0.0135, 0.0268]], 0.0196, 0, 0.0011), blued));
  {
    const y0 = 0.0292;
    const ear: P2[] = [
      [fz - 0.0112, y0],
      [fz + 0.0112, y0],
      [fz + 0.0112, y0 + 0.0115],
      [fz + 0.0078, y0 + 0.0215],
      [fz + 0.0035, y0 + 0.0248],
      [fz - 0.004, y0 + 0.0248],
      [fz - 0.0092, y0 + 0.0205],
      [fz - 0.0112, y0 + 0.0125],
    ];
    for (const s of [-1, 1]) parts.push(part(sidePlate(ear, 0.0023, s * 0.0079, 0.0006), blued));
    // bridge between the ears (protector base)
    parts.push(part(G.rbox(0.0178, 0.0048, 0.0224, 0.0011, 2), blued, { p: [0, y0 + 0.0022, fz] }));
    // round lightening holes in the ears (dark discs just proud of both faces)
    for (const s of [-1, 1]) parts.push(part(cylX(0.0027, s * 0.0079 - 0.0013, s * 0.0079 + 0.0013, 16, 0.0002), dpMat.void(), { p: [0, y0 + 0.0162, fz + 0.0004] }));
    // post (tip at y = 0.047): tapered blade
    parts.push(part(sidePlate([[fz - 0.0028, y0 + 0.004], [fz + 0.0028, y0 + 0.004], [fz + 0.0012, 0.047], [fz - 0.0012, 0.047]], 0.0022, 0, 0.0003), blued));
    // windage screw on the right of the base
    parts.push(part(slottedScrew(0.0027, 0.0009, 0.0008), blued, { p: [-0.0098, 0.0245, fz], r: [0, 0, 90] }));
    // reference line on the rear face of the base
    parts.push(part(G.box(0.0005, 0.0048, 0.0006), dpMat.void(), { p: [0, 0.0272, fz - 0.0136] }));
  }

  // --- magazine rest (upor) on the casing top, just in front of the pan's rim ---
  parts.push(part(sidePlate([[DP.uporZ - 0.0085, 0.0175], [DP.uporZ + 0.0075, 0.0175], [DP.uporZ + 0.0075, 0.0268], [DP.uporZ + 0.0015, 0.0335], [DP.uporZ - 0.0085, 0.0335]], 0.0142, 0, 0.0011), blued));

  // --- front sling swivel: lug on the upper left of the casing, pin, wire loop ---
  {
    const sw = frontSwivel();
    const lug = G.rbox(0.0082, 0.0095, 0.0105, 0.0022, 2);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), sw.radial);
    lug.applyQuaternion(q);
    const lp = sw.radial.clone().multiplyScalar(R + 0.0022).setZ(DP.swivelFrontZ);
    lug.translate(lp.x, lp.y, lp.z);
    parts.push(part(lug, blued));
    const pa = sw.pin.clone().addScaledVector(sw.tangent, -0.0058), pb = sw.pin.clone().addScaledVector(sw.tangent, 0.0058);
    parts.push(part(G.rod(pa, pb, 0.0016, 10), bare));
    // D loop: from the pin ends out to the bar
    const hw = 0.0118;
    const e = (s: number, k: number) => sw.pin.clone().addScaledVector(sw.tangent, s * (0.0048 + (hw - 0.0048) * k)).addScaledVector(sw.reach, 0.0125 * k);
    const loop = [e(-1, 0), e(-1, 0.55), e(-1, 1), sw.bar.clone().addScaledVector(sw.tangent, -hw * 0.3), sw.bar.clone().addScaledVector(sw.tangent, hw * 0.3), e(1, 1), e(1, 0.55), e(1, 0)];
    parts.push(part(G.tube(loop, 0.0014, 7, 40, false), bare));
  }

  // --- barrel: inside the casing (seen through the windows), exposed front, finned option ---
  parts.push(part(cylZ(0.0125, DP.breechZ, COLLAR_Z0 + 0.004, 28, 0.0005), barrelM));
  if (opts.finned) {
    // early barrels: 26 transverse cooling fins over the front part of the barrel inside the casing
    const n = 26, f0 = 0.771, f1 = 0.959;
    for (let k = 0; k < n; k++) {
      const z = f0 + ((f1 - f0) * k) / (n - 1);
      parts.push(part(latheZ([[0.0122, z - 0.0011], [0.0172, z - 0.0008], [0.0172, z + 0.0008], [0.0122, z + 0.0011]], 24, 35), barrelM));
    }
  }
  parts.push(
    part(
      latheZ(
        [
          [0.0, 0.998],
          [DP.barrelR, 0.998],
          [DP.barrelR - 0.0004, 1.06],
          [DP.barrelR - 0.0008, DP.fhRear + 0.002],
          [0.0, DP.fhRear + 0.002],
        ],
        28,
        30,
      ),
      barrelM,
    ),
  );

  // --- flash hider: collar with wrench flats, long cone with a deep conical mouth ---
  {
    const outer: P2[] = [
      [0.0045, DP.fhRear],
      [0.0116, DP.fhRear],
      [0.0123, DP.fhRear + 0.0008],
      [0.0123, DP.fhCone - 0.0008],
      [0.0116, DP.fhCone],
      [0.0108, DP.fhCone + 0.0012],
      [0.0112, 1.19],
      [0.0131, 1.215],
      [0.0155, 1.244],
      [0.0176, 1.2645],
      [0.0182, 1.2682],
      [0.0178, 1.2698],
      [0.0162, 1.27],
      [0.0155, 1.2694],
    ];
    parts.push(part(latheZ(outer, 36, 38), barrelM));
    const inner: P2[] = [
      [0.0155, 1.2694],
      [0.0128, 1.245],
      [0.0099, 1.216],
      [0.0068, 1.19],
      [0.0047, 1.1745],
      [0.0039, 1.171],
      [0.0, 1.1705],
    ];
    parts.push(part(latheZ(inner, 36, 50), soot));
  }
  return parts;
}
