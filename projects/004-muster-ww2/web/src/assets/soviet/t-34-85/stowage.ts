/**
 * External stowage on the 40-degree upper side plates (1944 Factory No. 183 layout): three 90-litre
 * cylindrical tanks at the stern (one left, two right), the large ZIP (tools & spares) box on the
 * left and the small one on the right, spare track links, the tow cable on its shackle lugs along the
 * left side, and two bent-rod handrails per side.
 *
 * Everything is modelled in a side-plate frame of the LEFT plate: local x = hull +Z (forward),
 * local y = plate normal (outward), local z = up the plate. The right side is built the same way and
 * mirrored.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { H } from './dims';
import type { Pal } from './palette';
import { surfaceFrame, applyFrame, type P3 } from './util';
import { linkGeometry } from './track';

const D = Math.PI / 180;
const S40 = Math.sin(40 * D), C40 = Math.cos(40 * D);
const N40: P3 = [C40, S40, 0];
/** point on the left upper side plate: s = distance up the plate from its lower edge, z = hull z */
export const sidePt = (s: number, z: number): P3 => [H.xSp - s * S40, H.ySp + s * C40, z];
/** plate slant length */
export const SIDE_LEN = (H.yR - H.ySp) / C40;

function onSide(obj: THREE.Object3D, s: number, z: number): THREE.Object3D {
  return applyFrame(group([obj]), surfaceFrame(sidePt(s, z), [0, 0, 1], N40));
}

/** world "up" expressed in the side-plate frame */
const UP = new THREE.Vector3(0, S40, C40);

/* ------------------------------------------------------------------------------------------ */

function fuelTank(P: Pal, fitted: boolean): THREE.Object3D {
  const r = 0.19, L = 0.8, gap = 0.035;
  const cy = gap + r;
  const ps: THREE.Object3D[] = [];
  if (!fitted) {
    // empty cradle brackets stay on the plate
    for (const x of [-0.24, 0.24]) {
      ps.push(part(G.rbox(0.05, cy - 0.1, 0.28, 0.01, 1), P.paint, { p: [x, (cy - 0.1) / 2, 0] }));
      ps.push(part(G.rbox(0.07, 0.012, 0.3, 0.004, 1), P.paint, { p: [x, 0.006, 0] }));
    }
    return group(ps);
  }
  // shell with dished ends, axis along local x
  const shell = G.lathe(
    [[0.0, -L / 2], [0.1, -L / 2], [0.16, -L / 2 + 0.008], [0.182, -L / 2 + 0.022], [r, -L / 2 + 0.045], [r, L / 2 - 0.045], [0.182, L / 2 - 0.022], [0.16, L / 2 - 0.008], [0.1, L / 2], [0.0, L / 2]],
    36, 35,
  );
  shell.rotateZ(-Math.PI / 2);
  ps.push(part(shell, P.paint, { p: [0, cy, 0] }));
  // rolled seams near the ends
  for (const x of [-L / 2 + 0.045, L / 2 - 0.045]) ps.push(part(G.torus(r + 0.001, 0.005, 6, 40), P.paint, { p: [x, cy, 0], r: [0, 90, 0] }));
  // two steel straps and cradle brackets
  for (const x of [-0.24, 0.24]) {
    ps.push(part(G.lathe([[r + 0.001, -0.02], [r + 0.005, -0.017], [r + 0.005, 0.017], [r + 0.001, 0.02]], 36, 50).rotateZ(-Math.PI / 2), P.paint, { p: [x, cy, 0] }));
    ps.push(part(G.rbox(0.05, cy - 0.06, 0.28, 0.01, 1), P.paint, { p: [x, (cy - 0.06) / 2, 0] }));
    ps.push(part(G.rbox(0.07, 0.012, 0.3, 0.004, 1), P.paint, { p: [x, 0.006, 0] }));
    // strap tensioner bolt at the lower end
    ps.push(part(G.rbox(0.03, 0.05, 0.03, 0.006, 1), P.paint, { p: [x, 0.04, -0.17] }));
  }
  // filler cap on top
  const capDir = UP.clone();
  const cap = G.lathe([[0.0, 0.0], [0.055, 0.0], [0.055, 0.02], [0.045, 0.03], [0.02, 0.032], [0.02, 0.045], [0.0, 0.045]], 20, 40);
  cap.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), capDir));
  const cp = new THREE.Vector3(0.22, cy, 0).addScaledVector(capDir, r - 0.012);
  ps.push(part(cap, P.paint, { p: [cp.x + 0.03, cp.y, cp.z] }));
  return group(ps);
}

function zipBox(P: Pal, L: number, Hh: number, W: number): THREE.Object3D {
  // box lying on the plate: L along local x, height Hh off the plate, depth W up the plate
  const ps: THREE.Object3D[] = [];
  const by = 0.03; // standoff on brackets
  ps.push(part(G.rbox(L, Hh - 0.02, W, 0.01, 2), P.paint, { p: [0, by + (Hh - 0.02) / 2, 0] }));
  // lid with its folded rim
  ps.push(part(G.rbox(L + 0.016, 0.026, W + 0.016, 0.008, 2), P.paint, { p: [0, by + Hh - 0.01, 0] }));
  // stiffening swage on the lid
  ps.push(part(G.rbox(L - 0.12, 0.008, W - 0.12, 0.004, 1), P.paint, { p: [0, by + Hh + 0.005, 0] }));
  // hinges along the upper edge, hasps on the lower edge, grip on the end
  for (const x of [-L * 0.3, L * 0.3]) {
    ps.push(part(G.cyl(0.012, 0.012, 0.08, 10), P.paint, { p: [x, by + Hh - 0.012, W / 2 + 0.012], r: [0, 0, 90] }));
    ps.push(part(G.rbox(0.035, 0.05, 0.012, 0.004, 1), P.paint, { p: [x, by + Hh - 0.035, -W / 2 - 0.014] }));
    ps.push(part(G.torus(0.012, 0.004, 5, 10), P.paint, { p: [x, by + Hh - 0.07, -W / 2 - 0.018] }));
  }
  // mounting brackets under both ends
  for (const x of [-L / 2 + 0.06, L / 2 - 0.06]) ps.push(part(G.rbox(0.05, by + 0.01, W + 0.05, 0.004, 1), P.paint, { p: [x, (by + 0.01) / 2, 0] }));
  return group(ps);
}

function spareLink(P: Pal, gFlat: THREE.BufferGeometry): THREE.Object3D {
  // flat link on two welded bosses: link-local X across the track (-> up the plate), -Y = ground face (-> out)
  const ps: THREE.Object3D[] = [];
  const m = part(gFlat, P.track, { p: [0, 0.065, 0], r: [180, 90, 0] });
  ps.push(m);
  for (const z of [-0.14, 0.14]) {
    ps.push(part(G.cyl(0.025, 0.028, 0.04, 12), P.paint, { p: [0, 0.02, z] }));
    ps.push(part(G.boltHead(0.036, 0.018), P.paint, { p: [0, 0.098, z] }));
    ps.push(part(G.cyl(0.011, 0.011, 0.07, 8), P.paint, { p: [0, 0.07, z] }));
  }
  return group(ps);
}

function handrail(P: Pal, z0: number, z1: number, s: number, off = 0.06): THREE.Object3D {
  const a = sidePt(s, z0), b = sidePt(s, z1);
  const n = new THREE.Vector3(...N40);
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const e = new THREE.Vector3(0, 0, Math.sign(z1 - z0) * 0.03);
  const pts = [
    A.clone().addScaledVector(n, -0.004), A.clone().addScaledVector(n, off * 0.6), A.clone().addScaledVector(n, off).add(e),
    A.clone().lerp(B, 0.5).addScaledVector(n, off),
    B.clone().addScaledVector(n, off).sub(e), B.clone().addScaledVector(n, off * 0.6), B.clone().addScaledVector(n, -0.004),
  ];
  return part(G.tube(pts, 0.011, 8, 60), P.paint);
}

function towCable(P: Pal, z0: number, z1: number, s: number): THREE.Object3D {
  // wire rope lying on the plate with a thimble eye on each end, hooked over welded shackle lugs
  const ps: THREE.Object3D[] = [];
  const r = 0.014;
  const pts: THREE.Vector3[] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const z = z0 + (z1 - z0) * t;
    const sag = Math.sin(t * Math.PI * 3) * 0.012; // slack between the three clips
    const p = new THREE.Vector3(...sidePt(s - sag, z)).addScaledVector(new THREE.Vector3(...N40), r + 0.002);
    pts.push(p);
  }
  ps.push(part(G.tube(pts, r, 8, 120), P.cable));
  for (const [z, dir] of [[z0, Math.sign(z0 - z1)], [z1, Math.sign(z1 - z0)]] as [number, number][]) {
    const c = new THREE.Vector3(...sidePt(s, z + dir * 0.05)).addScaledVector(new THREE.Vector3(...N40), r + 0.002);
    // thimble eye
    const eye = part(G.torus(0.045, 0.013, 8, 20), P.cable, { p: [c.x, c.y, c.z] });
    eye.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...N40));
    ps.push(eye);
    // shackle lug welded to the plate, through the eye
    ps.push(onSide(group([
      part(G.rbox(0.05, 0.02, 0.07, 0.005, 1), P.paint, { p: [0, 0.01, 0] }),
      part(G.torus(0.028, 0.009, 6, 14, Math.PI), P.paint, { p: [0, 0.02, 0], r: [0, 90, 0] }),
    ]), s, z + dir * 0.05));
  }
  // clips holding the rope
  for (const t of [0.33, 0.66]) {
    const z = z0 + (z1 - z0) * t;
    ps.push(onSide(part(G.rbox(0.03, 0.012, 0.06, 0.004, 1), P.paint, { p: [0, r * 2 + 0.006, 0] }), s, z));
    for (const e of [-0.03, 0.03]) ps.push(onSide(part(G.rbox(0.03, r * 2 + 0.01, 0.01, 0.003, 1), P.paint, { p: [0, (r * 2 + 0.01) / 2, e] }), s, z));
  }
  return group(ps);
}

/* ------------------------------------------------------------------------------------------ */

/** Left (+X) side stowage. */
function leftSide(P: Pal, gFlat: THREE.BufferGeometry, tanks: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  out.push(onSide(fuelTank(P, tanks), 0.5, -1.86));
  out.push(onSide(zipBox(P, 0.86, 0.18, 0.34), 0.4, 0.66));
  for (const z of [-0.96, -1.15]) out.push(onSide(spareLink(P, gFlat), 0.43, z));
  out.push(handrail(P, 0.36, 1.26, 0.74));
  out.push(handrail(P, -0.62, 0.02, 0.62));
  out.push(towCable(P, 1.66, -0.78, 0.07));
  return out;
}

/** Right (-X) side stowage, built on the left plate and mirrored by the caller. */
function rightSide(P: Pal, gFlat: THREE.BufferGeometry, tanks: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  out.push(onSide(fuelTank(P, tanks), 0.5, -0.96));
  out.push(onSide(fuelTank(P, tanks), 0.5, -1.86));
  out.push(onSide(zipBox(P, 0.46, 0.16, 0.3), 0.38, 1.47));
  for (const z of [-0.1, -0.29]) out.push(onSide(spareLink(P, gFlat), 0.37, z));
  out.push(handrail(P, 0.36, 1.26, 0.74));
  out.push(handrail(P, -0.45, 0.2, 0.7));
  return out;
}

export function stowage(P: Pal, tanks = true): THREE.Group {
  const gFlat = linkGeometry(false);
  const right = group(rightSide(P, gFlat, tanks));
  right.scale.x = -1;
  return group([...leftSide(P, gFlat, tanks), right], { name: 'stowage' });
}
