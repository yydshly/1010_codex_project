/**
 * Split box trails of the M2A1 carriage: hinge knuckle on the vertical pin, tapered welded box
 * section, obliquely cut end, fixed spade under each trail end (raked blade, top flange, front
 * gusset), side lifting handles and the long trail handle near the end; the handspike in its
 * socket on the left trail, the Drawbar M12 with its lunette on the right trail.
 *
 * Built for a LEFT trail (+X side) in a hinge-local frame: origin on the vertical hinge pin at
 * hinge height, trail running towards -Z, its outer side +X. The right trail is the mirror image.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { cylY, cylZ, latheZ, D2R, type V2, type V3 } from './util';

/** Trail pitch: from hinge height down to the end axis height over the plan length. */
export const TRAIL_PITCH = Math.atan2(D.hingeY - D.trailEndY, D.trailLen);
const L = D.trailLen / Math.cos(TRAIL_PITCH); // along the pitched axis
/** Section half sizes at the front and at the end. */
const W0 = 0.085, H0 = 0.105, W1 = 0.06, H1 = 0.062;
const secAt = (t: number) => ({ hw: W0 + (W1 - W0) * t, hh: H0 + (H1 - H0) * t });

/** Pitched (tube) frame point -> hinge-local frame point. */
function flat(x: number, y: number, z: number): V3 {
  const c = Math.cos(TRAIL_PITCH), s = Math.sin(TRAIL_PITCH);
  // rotation about X by +pitch: the rear (-z) drops
  return [x, y * c + z * s, -y * s + z * c];
}

function body(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const mat = P.paint();
  // hinge knuckle round the pin, between the carriage lugs
  o.push(part(cylY(0.05, -0.1, 0.1, 32, 0.005), P.cast()));
  o.push(part(G.rbox(0.11, 0.19, 0.12, 0.012, 2), P.cast(), { p: [0, 0, -0.06] }));
  // tapered box section (convex super-ellipse rings, so the loft caps are safe)
  const secs: { z: number; ring: V2[] }[] = [];
  const z0 = -0.09, z1 = -(L - 0.1);
  const n = hi ? 10 : 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const z = z0 + (z1 - z0) * t;
    const { hw, hh } = secAt((z0 - z) / (z0 - (-L)));
    secs.push({ z, ring: G.superRing(hw, hh, hi ? 36 : 24, 7) });
  }
  o.push(part(G.loftZ(secs, true, 50), mat));
  // weld seams along the top corners and round the knuckle joint
  const e0 = secAt(0), e1 = secAt((z0 - z1) / (z0 + L));
  for (const sx of [1, -1]) {
    o.push(part(G.weld([[sx * (e0.hw - 0.006), e0.hh - 0.004, z0 - 0.02], [sx * (e1.hw - 0.006), e1.hh - 0.004, z1 + 0.02]], 0.0035), mat));
  }
  // obliquely cut end: wedge plate closing the box
  const eh = secAt(1);
  const end: V2[] = [
    [z1 + 0.004, eh.hh],
    [-L, eh.hh - 0.012],
    [-L + 0.05, -eh.hh + 0.03],
    [z1 + 0.004, -eh.hh],
  ];
  o.push(part(G.plate(end, eh.hw * 2, 'zy', 0.008, 0.01), P.spade()));
  // side lifting handles (outer side) and the long trail handle near the end
  for (const zc of [-1.0, -1.7]) {
    const t = (z0 - zc) / (z0 + L);
    const s = secAt(t);
    o.push(part(G.rbox(0.02, 0.05, 0.06, 0.005, 1), mat, { p: [s.hw + 0.008, 0, zc] }));
    o.push(part(G.tube([[s.hw + 0.012, -0.018, zc + 0.022], [s.hw + 0.06, -0.035, zc + 0.02], [s.hw + 0.06, -0.035, zc - 0.02], [s.hw + 0.012, -0.018, zc - 0.022]], 0.008, 8, 24), mat));
  }
  {
    const za = -(L - 0.95), zb = -(L - 0.2);
    const sa = secAt((z0 - za) / (z0 + L)), sb = secAt((z0 - zb) / (z0 + L));
    o.push(part(G.tube([[sa.hw, 0.0, za], [sa.hw + 0.05, 0.004, za - 0.05], [sb.hw + 0.05, 0.004, zb + 0.05], [sb.hw, 0.0, zb]], 0.012, 8, 40), mat));
    for (const [z, s] of [[za, sa], [zb, sb]] as [number, { hw: number }][]) {
      o.push(part(G.rbox(0.014, 0.05, 0.05, 0.004, 1), mat, { p: [s.hw + 0.004, 0, z] }));
    }
  }
  // top: handspike bracket clips and a cleaning-staff clip
  for (const zc of [-0.6, -2.2]) {
    const s = secAt((z0 - zc) / (z0 + L));
    o.push(part(G.rbox(0.05, 0.02, 0.04, 0.005, 1), mat, { p: [0, s.hh + 0.008, zc] }));
  }
  return o;
}

function spade(): THREE.Object3D[] {
  // Built in the hinge-local (unpitched) frame so the cutting edge sits exactly on the ground.
  const o: THREE.Object3D[] = [];
  const ground = -D.hingeY;
  const zB = -(D.trailLen - 0.06); // cutting edge (blade bottom) centre
  const rake = 22;
  const tr = Math.tan(rake * D2R);
  const tHalf = 0.008 / Math.cos(rake * D2R);
  const s = secAt((L - 0.2 - 0.09) / (L - 0.09));
  const yTop = flat(0, 0, -(L - 0.2))[1] - s.hh + 0.004; // trail underside above the blade
  const hgt = yTop - ground;
  const off = 0.13; // blade centred outboard so the closed spades clear each other
  const hwT = 0.21, hwB = 0.15;
  const h = hgt / Math.cos(rake * D2R);
  const outline: V2[] = [
    [-hwB, 0],
    [hwB, 0],
    [hwT, h * 0.72],
    [hwT, h],
    [-hwT, h],
    [-hwT, h * 0.72],
  ];
  const g = G.plate(outline, 0.016, 'xy', 0.003, 0.012);
  g.rotateX(rake * D2R); // top forward (+z), cutting edge back (-z)
  g.computeBoundingBox();
  g.translate(off, ground - g.boundingBox!.min.y, zB);
  o.push(part(g, P.spade()));
  const zTopEdge = zB + hgt * tr;
  // top flange under the trail, welded across the blade top
  o.push(part(G.rbox(hwT * 2, 0.014, 0.13, 0.004, 1), P.spade(), { p: [off, yTop - 0.007, zTopEdge] }));
  // front gusset (in the trail's plane) from the blade face forward along the underside
  const faceZ = (y: number) => zB + (y - ground) * tr + tHalf;
  o.push(part(G.plate([[faceZ(yTop - 0.014), yTop - 0.014], [faceZ(yTop) + 0.3, yTop - 0.014], [faceZ(ground + 0.09), ground + 0.09]], 0.016, 'zy', 0.003), P.spade()));
  // outer gussets on the blade's front face
  for (const x of [off - 0.16, off + 0.16]) {
    o.push(part(G.plate([[faceZ(yTop - 0.014), yTop - 0.014], [faceZ(yTop) + 0.1, yTop - 0.014], [faceZ(yTop - 0.15), yTop - 0.15]], 0.012, 'zy', 0.003), P.spade(), { p: [x, 0, 0] }));
  }
  return o;
}

function handspike(): THREE.Object3D[] {
  // Socket on top of the left trail end, handspike inserted pointing up and back.
  const o: THREE.Object3D[] = [];
  const zs = -(L - 0.32);
  const s = secAt((L - 0.32 - 0.09) / (L - 0.09));
  const base: V3 = [0.0, s.hh, zs];
  o.push(part(G.rbox(0.07, 0.03, 0.09, 0.006, 1), P.cast(), { p: [base[0], base[1] + 0.012, base[2]] }));
  const dir = new THREE.Vector3(0.1, 0.8, -0.55).normalize();
  const sock = latheZ([[0.022, 0], [0.03, 0], [0.03, 0.12], [0.022, 0.12]], 20, 40);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  sock.applyQuaternion(q);
  o.push(part(sock, P.cast(), { p: [base[0], base[1] + 0.02, base[2]] }));
  const a = new THREE.Vector3(base[0], base[1] + 0.03, base[2]);
  const b = a.clone().addScaledVector(dir, 1.0);
  o.push(part(G.rod(a, b, 0.018, 14, 0.013), P.bright()));
  o.push(part(new THREE.SphereGeometry(0.016, 12, 8), P.bright(), { p: b }));
  return o;
}

function drawbar(yawDeg: number): THREE.Object3D[] {
  // Drawbar M12: forged bar from a pivot bracket on the inner side of the trail end back to the
  // lunette. Its plan angle puts the lunette on the centre line when the trails are closed.
  const o: THREE.Object3D[] = [];
  const s = secAt(1);
  const p0 = flat(-s.hw - 0.01, 0, -(L - 0.12));
  const zl = -(D.trailLen + 0.24);
  const th = yawDeg * D2R;
  const xl = (-D.hingeX - zl * Math.sin(th)) / Math.cos(th);
  const yl = p0[1] - 0.02;
  o.push(part(G.rbox(0.04, 0.08, 0.1, 0.008, 1), P.cast(), { p: [p0[0] + 0.01, p0[1], p0[2]] }));
  o.push(part(cylY(0.014, p0[1] - 0.05, p0[1] + 0.05, 14, 0.002), P.bright(), { p: [p0[0] - 0.012, 0, p0[2]] }));
  const a = new THREE.Vector3(p0[0] - 0.012, p0[1] - 0.01, p0[2]);
  const eyeC = new THREE.Vector3(xl, yl, zl);
  const d = eyeC.clone().sub(a).normalize();
  const stemEnd = eyeC.clone().addScaledVector(d, -0.07);
  o.push(part(G.rod(a, stemEnd, 0.024, 16, 0.02), P.cast()));
  const eye = G.torus(0.05, 0.017, 12, 32);
  eye.rotateX(Math.PI / 2);
  eye.rotateY(Math.atan2(d.x, d.z));
  o.push(part(eye, P.cast(), { p: eyeC }));
  o.push(part(cylZ(0.028, -0.04, 0.0, 18, 0.003), P.cast(), { p: stemEnd.clone().addScaledVector(d, 0.02), r: [0, (Math.atan2(d.x, d.z) * 180) / Math.PI, 0] }));
  return o;
}

export interface TrailOpts {
  /** Left trail carries the handspike, the right one (mirrored) the drawbar. */
  left: boolean;
  closedYawDeg: number;
  detail: 'high' | 'low';
}

/** One trail in its hinge-local frame (see file header). */
export function buildTrail(opts: TrailOpts): THREE.Group {
  const tube = group(body(opts.detail === 'high'), { r: [-(TRAIL_PITCH * 180) / Math.PI, 0, 0] });
  const extra = opts.left ? handspike() : [];
  const ex = group(extra, { r: [-(TRAIL_PITCH * 180) / Math.PI, 0, 0] });
  const parts: THREE.Object3D[] = [tube, ex, ...spade()];
  if (!opts.left) parts.push(...drawbar(opts.closedYawDeg));
  return group(parts, { name: opts.left ? 'trail-left' : 'trail-right' });
}

/** Trail yaw (deg) for a state: deployed = spread outwards, closed = ends brought together. */
export function trailYaw(state: 'deployed' | 'closed'): number {
  if (state === 'deployed') return -D.spreadDeg;
  return (Math.asin((D.hingeX - D.closedEndX) / D.trailLen) * 180) / Math.PI;
}
