/**
 * KV-1 welded turret (1941) with the 76.2 mm ZiS-5.
 *
 * Turret-local frame: origin on the hull roof at the turret-ring centre, +Z forward, +X = left.
 * The body is built from flat rolled plates with thickness (front plate, angled cheek plates, vertical
 * sides, chamfered rear corners, rear plate of the overhanging bustle, its floor and the roof plate).
 * Fittings: the curved gun mantlet with the barrel sleeve and the long ZiS-5 barrel (no muzzle brake),
 * coaxial DT port and sight aperture, the large roof hatch, periscopes, ventilator cap, lifting eyes,
 * side vision blocks and pistol ports, and the rear DT in its ball mount with the armour ring.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { T } from './dims';
import type { Pal } from './palette';
import { slab, latheZ, merge, type P3, type P2 } from './util';
import { periscope, liftEye, onPlate } from './hull';

const { roof: YT, hx, zFront, hxFront, zCheek, zRear, hxRear, zRearCh, zNiche, yNiche, trunY, trunZ } = T;
const WALL = 0.075;
const ROOF_T = 0.035;
const yTopW = YT - ROOF_T;
const zSlope = zNiche - 0.12;

function body(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // front plate
  out.push(part(slab([[-hxFront, 0, zFront], [hxFront, 0, zFront], [hxFront, yTopW, zFront], [-hxFront, yTopW, zFront]], WALL, [0, 0, 1], 0.008), P.paint));
  for (const sx of [-1, 1]) {
    // angled cheek plate
    const cn = new THREE.Vector3(sx * (zFront - zCheek), 0, hx - hxFront).normalize();
    out.push(part(slab([[sx * hxFront, 0, zFront], [sx * hx, 0, zCheek], [sx * hx, yTopW, zCheek], [sx * hxFront, yTopW, zFront]], WALL, [cn.x, cn.y, cn.z], 0.008), P.paint));
    // vertical side plate (undercut under the bustle)
    const prof: P2[] = [[zCheek, 0], [zCheek, yTopW], [zRearCh, yTopW], [zRearCh, yNiche], [zSlope, yNiche], [zNiche, 0]];
    out.push(part(slab(prof.map(([z, y]) => [sx * hx, y, z] as P3), WALL, [sx, 0, 0], 0.008), P.paint));
    // chamfered rear corner
    const rn = new THREE.Vector3(sx * (zRearCh - zRear), 0, -(hx - hxRear)).normalize();
    out.push(part(slab([[sx * hx, yNiche, zRearCh], [sx * hxRear, yNiche, zRear], [sx * hxRear, yTopW, zRear], [sx * hx, yTopW, zRearCh]], WALL, [rn.x, rn.y, rn.z], 0.008), P.paint));
  }
  // rear plate of the bustle
  out.push(part(slab([[-hxRear, yNiche, zRear], [hxRear, yNiche, zRear], [hxRear, yTopW, zRear], [-hxRear, yTopW, zRear]], WALL, [0, 0, -1], 0.008), P.paint));
  // bustle floor and the sloped plate joining it to the ring
  const fi = 0.07;
  out.push(part(slab([[-(hx - fi), yNiche, zSlope], [hx - fi, yNiche, zSlope], [hx - fi, yNiche, zRearCh], [hxRear - 0.03, yNiche, zRear + fi], [-(hxRear - 0.03), yNiche, zRear + fi], [-(hx - fi), yNiche, zRearCh]], 0.03, [0, -1, 0], 0.004), P.paint));
  const sn = new THREE.Vector3(0, -(zNiche - zSlope), -yNiche).normalize();
  out.push(part(slab([[-(hx - fi), 0, zNiche], [hx - fi, 0, zNiche], [hx - fi, yNiche, zSlope], [-(hx - fi), yNiche, zSlope]], 0.04, [sn.x, sn.y, sn.z], 0.004), P.paint));
  // roof plate (outline flush with the outer faces of the walls)
  const plan: P3[] = [
    [-hxFront, YT, zFront], [hxFront, YT, zFront], [hx, YT, zCheek], [hx, YT, zRearCh], [hxRear, YT, zRear],
    [-hxRear, YT, zRear], [-hx, YT, zRearCh], [-hx, YT, zCheek],
  ];
  out.push(part(slab(plan, ROOF_T, [0, 1, 0], 0.008), P.paint));
  // weld beads on the vertical corners
  const welds: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    for (const [x, z, y0] of [[sx * hxFront, zFront, 0.01], [sx * hx, zCheek, 0.01], [sx * hx, zRearCh, yNiche + 0.01], [sx * hxRear, zRear, yNiche + 0.01]] as [number, number, number][]) {
      welds.push(G.weld([[x, y0, z], [x, yTopW, z]], 0.007));
    }
  }
  out.push(part(merge(welds), P.paint));
  return out;
}

function mantletAndGun(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const r0 = T.mantletR, r1 = r0 - 0.09, a0 = -52 * (Math.PI / 180), a1 = 58 * (Math.PI / 180);
  const ring: G.V2[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    ring.push([trunZ + Math.cos(a) * r0, trunY + Math.sin(a) * r0]);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    ring.push([trunZ + Math.cos(a) * r1, trunY + Math.sin(a) * r1]);
  }
  out.push(part(G.plate(ring, 0.9, 'zy', 0.012), P.cast));
  const zM = trunZ + r0;
  // barrel sleeve with its front collar
  out.push(part(latheZ([[0.0, zM - 0.02], [0.112, zM - 0.02], [0.112, zM + 0.3], [0.12, zM + 0.31], [0.12, zM + 0.345], [0.1, zM + 0.36], [0.0, zM + 0.36]], 36, 40), P.cast, { p: [0, trunY, 0] }));
  // ZiS-5 barrel: gentle taper, slight muzzle swell, no muzzle brake
  const mz = T.muzzleZ;
  out.push(
    part(
      latheZ([[0.0, zM + 0.34], [0.064, zM + 0.34], [0.058, mz - 0.08], [0.061, mz - 0.06], [0.061, mz - 0.006], [0.057, mz], [0.0, mz]], 32, 35),
      P.paint,
      { p: [0, trunY, 0] },
    ),
  );
  out.push(part(G.cyl(0.038, 0.038, 0.004, 20), P.void, { p: [0, trunY, mz + 0.001], r: [90, 0, 0] }));
  // coaxial DT (right of the gun) and the telescopic sight aperture (left)
  const zs = (y: number) => trunZ + Math.sqrt(r0 * r0 - (y - trunY) ** 2);
  out.push(part(latheZ([[0.0, -0.02], [0.045, -0.02], [0.045, 0.02], [0.034, 0.035], [0.0, 0.035]], 18, 40), P.cast, { p: [-0.24, trunY - 0.02, zs(trunY - 0.02) - 0.01] }));
  out.push(part(latheZ([[0.0, 0.0], [0.014, 0.0], [0.014, 0.07], [0.0, 0.07]], 12, 40), P.gun, { p: [-0.24, trunY - 0.02, zs(trunY - 0.02) + 0.01] }));
  out.push(part(G.rbox(0.06, 0.04, 0.03, 0.008, 1), P.void, { p: [0.22, trunY + 0.1, zs(trunY + 0.1) - 0.006] }));
  return out;
}

function roofHatch(P: Pal): THREE.Object3D {
  // lying on y = 0 (roof), hinge towards +Z
  const ps: THREE.Object3D[] = [];
  const w = 0.66, l = 0.6;
  ps.push(part(G.plate([[-w / 2 - 0.04, -l / 2 - 0.04], [w / 2 + 0.04, -l / 2 - 0.04], [w / 2 + 0.04, l / 2 + 0.04], [-w / 2 - 0.04, l / 2 + 0.04]], 0.018, 'xz', 0.004, 0.08), P.paint, { p: [0, 0.009, 0] }));
  ps.push(part(G.plate([[-w / 2, -l / 2], [w / 2, -l / 2], [w / 2, l / 2], [-w / 2, l / 2]], 0.03, 'xz', 0.006, 0.07), P.paint, { p: [0, 0.033, 0] }));
  for (const sx of [-1, 1]) {
    ps.push(part(G.cyl(0.028, 0.028, 0.14, 14), P.paint, { p: [sx * 0.2, 0.04, l / 2 + 0.03], r: [0, 0, 90] }));
    ps.push(part(G.rbox(0.1, 0.02, 0.1, 0.005, 1), P.paint, { p: [sx * 0.2, 0.05, l / 2 - 0.03] }));
  }
  ps.push(part(G.tube([[-0.08, 0.045, -0.2], [-0.06, 0.09, -0.2], [0.06, 0.09, -0.2], [0.08, 0.045, -0.2]], 0.011, 8), P.paint));
  return group(ps);
}

function ventilator(P: Pal): THREE.Object3D {
  return group([
    part(G.lathe([[0.0, 0.0], [0.13, 0.0], [0.13, 0.02], [0.11, 0.03], [0.0, 0.03]], 28, 40), P.paint),
    part(G.lathe([[0.0, 0.11], [0.08, 0.105], [0.13, 0.085], [0.14, 0.07], [0.132, 0.062], [0.0, 0.062]], 28, 50), P.paint),
    ...[0, 1, 2, 3].map((i) => part(G.rbox(0.02, 0.04, 0.02, 0.004, 1), P.paint, { p: [Math.cos(i * 1.571 + 0.785) * 0.09, 0.048, Math.sin(i * 1.571 + 0.785) * 0.09] })),
  ]);
}

function sideFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    // armoured vision block housing with its slit
    const vb = group([
      part(G.rbox(0.26, 0.05, 0.12, 0.012, 1), P.paint, { p: [0, 0.025, 0] }),
      part(G.box(0.16, 0.004, 0.022), P.void, { p: [0, 0.051, 0] }),
      part(G.box(0.15, 0.004, 0.016), P.vision, { p: [0, 0.053, 0] }),
    ]);
    out.push(onPlate(vb, [sx * hx, 0.56, 0.1], [0, 0, 1], [sx, 0, 0]));
    // pistol port plug
    out.push(onPlate(group([
      part(G.lathe([[0.0, 0.0], [0.07, 0.0], [0.068, 0.018], [0.055, 0.03], [0.0, 0.032]], 24, 40), P.paint),
      part(G.cyl(0.018, 0.018, 0.03, 8), P.paint, { p: [0, 0.045, 0] }),
    ]), [sx * hx, 0.42, -0.5], [0, 0, 1], [sx, 0, 0]));
  }
  // rear DT in its ball mount with the armour ring
  const rp = group([
    part(G.lathe([[0.0, 0.0], [0.16, 0.0], [0.16, 0.04], [0.14, 0.055], [0.1, 0.06], [0.0, 0.06]], 32, 40), P.paint),
    part(new THREE.SphereGeometry(0.085, 18, 12), P.cast, { p: [0, 0.05, 0] }),
    part(G.cyl(0.028, 0.028, 0.12, 12), P.gun, { p: [0, 0.17, 0] }),
    part(G.cyl(0.013, 0.013, 0.05, 10), P.gun, { p: [0, 0.25, 0] }),
  ]);
  out.push(onPlate(rp, [0.28, 0.46, zRear], [1, 0, 0], [0, 0, -1]));
  return out;
}

export function turret(P: Pal): THREE.Group {
  const out: THREE.Object3D[] = [...body(P), ...mantletAndGun(P), ...sideFittings(P)];
  const h = roofHatch(P);
  h.position.set(-0.05, YT, -0.62);
  out.push(h);
  for (const [x, z, ry] of [[0.52, 0.34, 0], [-0.52, 0.34, 0], [-0.5, -1.1, 180]] as [number, number, number][]) {
    const p = periscope(P);
    p.position.set(x, YT, z);
    p.rotation.y = (ry * Math.PI) / 180;
    out.push(p);
  }
  const v = ventilator(P);
  v.position.set(0.0, YT, 0.3);
  out.push(v);
  for (const [x, z] of [[0.8, 0.1], [-0.8, 0.1], [0.62, -1.18], [-0.1, -1.2]] as [number, number][]) {
    const e = liftEye(P);
    e.position.set(x, YT, z);
    out.push(e);
  }
  return group(out, { name: 'turret' });
}
