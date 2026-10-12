/**
 * Split tubular trails of the ZiS-3: cast hinge knuckle, fabricated adapter, tapered steel tube,
 * welded end box, spade with gussets, carrying handles, handspike socket, travel clamp and
 * (left trail) the towing lunette.
 *
 * Built for the LEFT trail (+X side) in a hinge-local frame: origin on the vertical hinge pin at
 * hinge height, trail running towards -Z, its outer side +X. The right trail is the mirror image.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { latheZ, cylZ } from './util';

type V3 = [number, number, number];

/** Trail pitch: from hinge height down to the end-box axis height over the plan length. */
export const TRAIL_PITCH = Math.atan2(D.hingeY - D.trailEndY, D.trailLen);
const Lp = D.trailLen / Math.cos(TRAIL_PITCH); // length along the tube axis

/** Pitched (tube) frame point -> hinge-local frame point. */
function flat(x: number, y: number, z: number): V3 {
  const c = Math.cos(-TRAIL_PITCH), s = Math.sin(-TRAIL_PITCH);
  return [x, y * c - z * s, y * s + z * c];
}

function tubeFrameParts(hi: boolean, left: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const seg = hi ? 40 : 24;
  // --- hinge knuckle (fits between the carriage lugs) and adapter box
  o.push(part(G.lathe([[0, -0.072], [0.04, -0.072], [0.044, -0.068], [0.044, 0.068], [0.04, 0.072], [0, 0.072]], 32, 35), P.cast()));
  const adapt: { z: number; ring: [number, number][] }[] = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = -0.02 - t * 0.44;
    const hw = 0.052 + (0.062 - 0.052) * t;
    const hh = 0.07 + (0.062 - 0.07) * t;
    const ex = 6 - 4 * t * t; // box-ish at the knuckle, round where it meets the tube
    adapt.push({ z, ring: G.superRing(hw, hh, 36, ex) });
  }
  o.push(part(G.loftZ(adapt, true, 50), P.paint()));
  // fillet plates tying the adapter to the knuckle (top & bottom)
  for (const y of [0.064, -0.064]) {
    o.push(part(G.plate([[-0.045, 0], [0.045, 0], [0.04, -0.12], [-0.04, -0.12]], 0.012, 'xz', 0.003, 0.01), P.cast(), { p: [0, y, -0.02] }));
  }
  // --- main tube (tapered), with joint collars
  const zt0 = -0.44, zt1 = -(Lp - 0.4);
  o.push(part(G.rod([0, 0, zt0], [0, 0, zt1], 0.062, seg, 0.055), P.paint()));
  for (const zc of [zt0 - 0.01, zt1 + 0.02]) {
    const r = zc > -1 ? 0.063 : 0.056;
    o.push(part(latheZ([[r - 0.001, zc - 0.018], [r + 0.006, zc - 0.012], [r + 0.006, zc + 0.012], [r - 0.001, zc + 0.018]], seg, 40), P.paint()));
  }
  // weld seam where adapter meets tube
  o.push(part(G.torus(0.063, 0.0035, 6, seg), P.paint(), { p: [0, 0, zt0 + 0.005] }));
  // mid-trail handle lug (outer side) with a folding handle hanging below it
  const zh = -1.55;
  const rH = 0.062 - (0.007 * (zh - zt0)) / (zt1 - zt0);
  o.push(part(G.rbox(0.03, 0.05, 0.1, 0.006, 1), P.paint(), { p: [rH + 0.01, 0, zh] }));
  o.push(part(G.cyl(0.008, 0.008, 0.12, 10), P.bright(), { p: [rH + 0.03, 0, zh], r: [90, 0, 0] }));
  o.push(part(G.tube([[rH + 0.034, 0, zh + 0.045], [rH + 0.05, -0.08, zh + 0.05], [rH + 0.05, -0.12, zh], [rH + 0.05, -0.08, zh - 0.05], [rH + 0.034, 0, zh - 0.045]], 0.009, 8, 32), P.paint()));

  // --- end box (fabricated), spade seat
  const zb0 = -(Lp - 0.42), zb1 = -(Lp - 0.08);
  const bl = zb0 - zb1;
  o.push(part(G.rbox(0.13, 0.14, bl, 0.012, 2), P.paint(), { p: [0, -0.005, (zb0 + zb1) / 2] }));
  // tapered front collar box -> tube
  o.push(part(latheZ([[0.056, zb0 + 0.05], [0.062, zb0 + 0.02], [0.07, zb0]], seg, 40), P.paint()));
  // top plate with lightening hole look (raised pad) + handspike socket
  o.push(part(G.rbox(0.15, 0.012, bl + 0.02, 0.004, 1), P.spade(), { p: [0, 0.071, (zb0 + zb1) / 2] }));
  o.push(part(latheZ([[0.022, -0.05], [0.03, -0.05], [0.03, 0.05], [0.022, 0.05], [0.022, -0.05]], 20, 40), P.paint(), { p: [0, 0.098, zb0 + 0.1], r: [-8, 0, 0] }));
  o.push(part(G.rbox(0.05, 0.03, 0.08, 0.006, 1), P.paint(), { p: [0, 0.085, zb0 + 0.1] }));
  // carrying handle across the top of the end box
  o.push(part(G.tube([[-0.05, 0.077, zb1 + 0.1], [-0.05, 0.14, zb1 + 0.09], [0.05, 0.14, zb1 + 0.09], [0.05, 0.077, zb1 + 0.1]], 0.011, 8, 40), P.paint()));
  // outer side handle loop
  o.push(part(G.tube([[0.065, 0.03, zb0 + 0.04], [0.12, 0.03, zb0 + 0.06], [0.12, 0.03, zb1 + 0.12], [0.065, 0.03, zb1 + 0.1]], 0.011, 8, 40), P.paint()));
  // travel clamp: latch bracket on the inner side, pin
  o.push(part(G.rbox(0.03, 0.08, 0.1, 0.006, 1), P.cast(), { p: [-0.075, 0, zb0 + 0.14] }));
  o.push(part(G.cyl(0.012, 0.012, 0.1, 12), P.bright(), { p: [-0.09, 0, zb0 + 0.14] }));
  // weld seams round the box
  o.push(part(G.weld([[-0.066, 0.066, zb0], [0.066, 0.066, zb0]], 0.003), P.paint()));
  o.push(part(G.weld([[-0.066, -0.075, zb0], [0.066, -0.075, zb0]], 0.003), P.paint()));

  if (left) {
    // towing lunette: forged stem from the end box rear face, eye with a vertical axis, angled
    // inwards so it lies near the centre line when the trails are closed.
    const eyeX = -0.06, eyeZ = -Lp - 0.045;
    o.push(part(G.rod([-0.005, 0.0, zb1 + 0.02], [eyeX * 0.7, 0.0, eyeZ + 0.05], 0.024, 16), P.cast()));
    o.push(part(G.rbox(0.09, 0.08, 0.02, 0.006, 1), P.cast(), { p: [-0.01, 0.0, zb1 - 0.004] }));
    const eye = G.torus(0.048, 0.018, 12, 32);
    eye.rotateX(Math.PI / 2);
    o.push(part(eye, P.cast(), { p: [eyeX, 0.0, eyeZ] }));
    o.push(part(G.cyl(0.03, 0.03, 0.04, 20), P.cast(), { p: [eyeX * 0.7, 0.0, eyeZ + 0.06], r: [90, 0, 0] }));
  } else {
    // right trail: towing bracket pad for the travel clamp
    o.push(part(G.rbox(0.07, 0.07, 0.03, 0.008, 1), P.cast(), { p: [-0.01, 0.0, zb1 - 0.01] }));
  }
  return o;
}

function spadeParts(): THREE.Object3D[] {
  // Built in the hinge-local (unpitched) frame so the cutting edge sits exactly on the ground.
  // The plate runs up through the end box (welded in), the visible blade hangs below it.
  const o: THREE.Object3D[] = [];
  const groundRel = -D.hingeY;
  const at = flat(0, 0, -(Lp - 0.16));
  const z = at[2];
  const boxTop = at[1] + 0.06;
  const boxBot = at[1] - 0.075;
  const off = 0.075; // spades lie outboard so the closed trails' spades clear each other
  const hw = 0.13;
  const tilt = 12; // cutting edge forward of the top
  const h = boxTop - groundRel;
  const outline: [number, number][] = [
    [-hw * 0.62, 0.0],
    [hw * 0.62, 0.0],
    [hw, 0.08],
    [hw, h],
    [-hw, h],
    [-hw, 0.08],
  ];
  const plateG = G.plate(outline, 0.014, 'xy', 0.003, 0.012);
  plateG.rotateX(THREE.MathUtils.degToRad(-tilt));
  o.push(part(plateG, P.spade(), { p: [off, groundRel + 0.0072 * Math.sin(THREE.MathUtils.degToRad(tilt)), z + 0.05] }));
  // gussets on the front face, from the blade up to the end box underside
  const tanT = Math.tan(THREE.MathUtils.degToRad(tilt));
  for (const gx of [off - 0.07, off + 0.07]) {
    const hb = boxBot - groundRel; // blade height below the box
    const zf = z + 0.05 + 0.007; // front face at the bottom
    const gus: [number, number][] = [
      [zf - 0.05 * tanT, 0.05],
      [zf + 0.14, hb + 0.01],
      [zf - hb * tanT, hb + 0.01],
    ];
    o.push(part(G.plate(gus, 0.012, 'zy', 0.003), P.spade(), { p: [gx, groundRel, 0] }));
  }
  // reinforcing bead along the cutting edge (front face)
  o.push(part(G.rod([off - hw * 0.6, groundRel + 0.012, z + 0.058], [off + hw * 0.6, groundRel + 0.012, z + 0.058], 0.0075, 10), P.spade()));
  return o;
}

export interface TrailOpts {
  left: boolean;
  detail: 'high' | 'low';
}

/** One trail in its hinge-local frame (see file header). */
export function buildTrail(opts: TrailOpts): THREE.Group {
  const tube = group(tubeFrameParts(opts.detail === 'high', opts.left), { r: [-(TRAIL_PITCH * 180) / Math.PI, 0, 0] });
  return group([tube, ...spadeParts()], { name: opts.left ? 'trail-left' : 'trail-right' });
}

/** Trail yaw (deg) for a state: deployed = spread outwards, closed = ends brought together. */
export function trailYaw(state: 'deployed' | 'closed'): number {
  if (state === 'deployed') return -D.spreadDeg;
  return (Math.asin((D.hingeX - D.closedEndX) / D.trailLen) * 180) / Math.PI;
}

export { cylZ };
