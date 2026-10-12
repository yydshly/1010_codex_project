/**
 * Bren Mk II barrel group and gas system (B-frame, see dims.ts): the stepped barrel (635 mm) with the
 * band and bracket of the carrying handle (folded to the rear on the right, walnut grip, large steel
 * guard disc), the gas block clamped round the barrel with the regulator underneath (four-hole front
 * cap and key on the right), the gas-cylinder flange and drilled collar, the bipod sleeve with its yoke,
 * cross-bar (sling) and leg pivot, the foresight on a bracket to the LEFT of the barrel between its
 * protecting ears, and the plain conical Mk II flash hider.
 */
import { THREE, G, part } from '../../../../core/kit';
import { V, RAD, cylX, cylZ, latheZ, ringProfile, plateZY, extrudeZ, circle2D, screwParts, placeAlong, basis, type V2 } from '../common/geo';
import type { UkwMats } from '../common/materials';
import { BR, barrelR } from './dims';

/** Carrying-handle pivot and grip axis (B-frame). */
export const HANDLE = {
  pivot: V(-0.0105, 0.0412, 0.6645),
  dir: V(0, Math.sin(11 * RAD), -Math.cos(11 * RAD)),
  x: -0.0118,
};

/** Sling cross-bar of the bipod yoke (B-frame): centre and radius. */
export const CROSS_BAR = { c: V(0, BR.bipod.crossY, BR.bipod.crossZ), r: 0.0028 };

export function buildBarrel(m: UkwMats, hi: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const seg = hi ? 36 : 22;
  const gy = BR.gasY;

  // ================= barrel
  {
    const r = barrelR;
    const prof: V2[] = [
      [0, 0.574],
      [r(0.58), 0.574],
      [r(0.58), 0.7],
      [0.0142, 0.711],
      [0.0142, 0.7665],
      [0.0138, 0.7685],
      [0.0126, 0.7735],
      [0.0126, 0.899],
      [0.0098, 0.9015],
      [0.0098, 0.95],
      [0.0096, 1.02],
      [0.0096, 1.0955],
      [0, 1.0955],
    ];
    out.push(part(latheZ(prof, seg, 30), m.black));
  }

  // ================= carrying handle: band, bracket, pivot, guard disc, walnut grip
  {
    const hb = BR.handleBand;
    out.push(part(latheZ(ringProfile(0.0141, hb.r, hb.z0, hb.z1, 0.0012), seg, 35), m.black));
    // raised clamp lug on the band top-right, carrying the bracket
    out.push(part(G.rbox(0.0105, 0.006, hb.z1 - hb.z0 - 0.006, 0.0015, 1), m.black, { p: [-0.0075, hb.r - 0.0012, (hb.z0 + hb.z1) / 2] }));
    const px = HANDLE.pivot.x, py = HANDLE.pivot.y, pz = HANDLE.pivot.z;
    const br: V2[] = [
      [hb.z0 + 0.004, 0.0188],
      [hb.z1 - 0.004, 0.0188],
      [hb.z1 - 0.007, 0.0232],
      [pz + 0.008, py + 0.0045],
      [pz + 0.0035, py + 0.0078],
      [pz - 0.004, py + 0.0072],
      [pz - 0.0078, py + 0.001],
      [pz - 0.0062, py - 0.0062],
      [hb.z0 + 0.001, 0.0232],
    ];
    out.push(part(plateZY(br, 0.0054, [], 0.0009), m.black, { p: [px + 0.0005, 0, 0] }));
    // pivot boss + bolt with head (left) and nut (right)
    out.push(part(cylX(0.0068, px - 0.0072, px + 0.0072, 20, 0.0006), m.black, { p: [0, py, pz] }));
    out.push(part(cylX(0.0036, px - 0.0098, px + 0.0098, 14, 0.0004), m.blued, { p: [0, py, pz] }));
    const nut = new THREE.CylinderGeometry(0.0052, 0.0052, 0.0035, 6);
    nut.rotateZ(Math.PI / 2);
    out.push(part(nut, m.blued, { p: [px - 0.0092, py, pz] }));
    // handle: short stem from the pivot, the steel guard disc and the walnut grip along the axis
    const d = HANDLE.dir.clone().normalize();
    const o = V(HANDLE.x, py + 0.0055, pz);
    const xAx = V(1, 0, 0);
    const yAx = d.clone().cross(xAx).normalize();
    const M = basis(xAx, yAx, d, o);
    const stem = G.rbox(0.0082, 0.0105, 0.014, 0.002, 1);
    stem.translate(0, 0, 0.004);
    stem.applyMatrix4(M);
    out.push(part(stem, m.black));
    const disc = latheZ(
      [
        [0, 0.0095],
        [0.0158, 0.0095],
        [0.0172, 0.011],
        [0.0174, 0.0185],
        [0.0162, 0.0205],
        [0.011, 0.0212],
        [0.0098, 0.023],
        [0, 0.023],
      ],
      hi ? 28 : 18,
      40,
    );
    disc.applyMatrix4(M);
    out.push(part(disc, m.black));
    const grip = latheZ(
      [
        [0, 0.022],
        [0.0098, 0.022],
        [0.0104, 0.03],
        [0.0124, 0.052],
        [0.0131, 0.07],
        [0.0124, 0.086],
        [0.0104, 0.0955],
        [0.0102, 0.099],
        [0.012, 0.1035],
        [0.0124, 0.107],
        [0.0112, 0.1105],
        [0.0068, 0.1128],
        [0, 0.1132],
      ],
      hi ? 28 : 18,
      40,
    );
    grip.applyMatrix4(M);
    out.push(part(grip, m.walnut));
  }

  // ================= gas cylinder flange, drilled collar, bipod sleeve + yoke + cross-bar + pivot
  {
    out.push(part(cylZ(0.0176, 0.805, 0.8115, seg, 0.0006), m.black, { p: [0, gy, 0] }));
    out.push(part(plateZY([[0.805, gy + 0.009], [0.8115, gy + 0.009], [0.8115, -0.0142], [0.8095, -0.0136], [0.8065, -0.0136], [0.805, -0.0142]], 0.013, [], 0.0006), m.black));
    // drilled collar (regulator holes pattern) between the flange and the sleeve
    out.push(part(cylZ(0.0149, 0.8145, 0.8305, seg, 0.0007), m.black, { p: [0, gy, 0] }));
    const hole = G.cyl(0.0021, 0.0021, 0.0016, 12);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const n = V(Math.cos(a), Math.sin(a), 0);
      out.push(part(placeAlong(hole, V(0, gy, 0.8225).addScaledVector(n, 0.0142), n), m.recess));
    }
    const sv = BR.sleeve, bp = BR.bipod;
    out.push(part(cylZ(sv.r, sv.z0, sv.z1, seg, 0.0008), m.black, { p: [0, gy, 0] }));
    // yoke arms from the sides of the sleeve down to the leg pivot
    const ax = bp.armX;
    const arm: V2[] = [
      [sv.z0 + 0.003, gy + 0.002],
      [sv.z1 - 0.002, gy + 0.002],
      [sv.z1 - 0.003, bp.pivotY + 0.004],
      [bp.z + 0.008, bp.pivotY - 0.0055],
      [bp.z, bp.pivotY - 0.0092],
      [bp.z - 0.008, bp.pivotY - 0.0055],
      [sv.z0 + 0.004, bp.pivotY + 0.006],
    ];
    for (const sx of [-1, 1]) out.push(part(plateZY(arm, 0.0048, [], 0.0008), m.black, { p: [sx * ax, 0, 0] }));
    // web joining the arms under the sleeve
    out.push(part(G.rbox(2 * ax + 0.0046, 0.0065, sv.z1 - sv.z0 - 0.006, 0.0015, 1), m.black, { p: [0, gy - 0.0142, (sv.z0 + sv.z1) / 2] }));
    // cross-bar between the arms (the sling loops round it)
    out.push(part(cylX(CROSS_BAR.r, -ax, ax, 14), m.blued, { p: [0, CROSS_BAR.c.y, CROSS_BAR.c.z] }));
    // leg pivot bolt: head on the left, nut on the right
    const bx = bp.legX + 0.0052;
    out.push(part(cylX(0.0031, -bx - 0.001, bx + 0.001, 14), m.blued, { p: [0, bp.pivotY, bp.z] }));
    out.push(part(cylX(0.0058, bx - 0.0012, bx + 0.0022, 18, 0.0008), m.blued, { p: [0, bp.pivotY, bp.z] }));
    const hn = new THREE.CylinderGeometry(0.0062, 0.0062, 0.0042, 6);
    hn.rotateZ(Math.PI / 2);
    out.push(part(hn, m.blued, { p: [-bx - 0.0008, bp.pivotY, bp.z] }));
    // sleeve clamp screw (left) and its wing
    out.push(part(cylX(0.0034, sv.r - 0.002, sv.r + 0.004, 14), m.blued, { p: [0, gy + 0.004, (sv.z0 + sv.z1) / 2] }));
    out.push(part(G.rbox(0.0026, 0.016, 0.005, 0.0008, 1), m.blued, { p: [sv.r + 0.0052, gy + 0.004, (sv.z0 + sv.z1) / 2] }));
  }

  // ================= gas block with the regulator
  {
    const g = BR.gasBlock;
    out.push(part(latheZ(ringProfile(0.0125, 0.0172, g.z0, g.z1, 0.0012), seg, 35), m.black));
    out.push(part(plateZY([[g.z0 + 0.0015, -0.011], [g.z1 - 0.0015, -0.011], [g.z1 - 0.0015, gy + 0.008], [g.z0 + 0.0015, gy + 0.008]], 0.0175, [], 0.001), m.black));
    out.push(part(cylZ(0.0149, g.z0, g.z1, seg, 0.0012), m.black, { p: [0, gy, 0] }));
    // clamp bolt through the web
    out.push(part(cylX(0.0032, -0.0118, 0.0118, 14), m.blued, { p: [0, -0.0205, (g.z0 + g.z1) / 2] }));
    const [head, slot] = screwParts(0.0045, 0.0014, 20);
    const sp = V(-0.0095, -0.0205, (g.z0 + g.z1) / 2);
    out.push(part(placeAlong(head, sp, V(-1, 0, 0)), m.blued), part(placeAlong(slot, sp, V(-1, 0, 0), 10), m.recess));
    // regulator front cap with its four gas holes of different sizes
    out.push(part(cylZ(0.0112, g.z1 - 0.001, g.z1 + 0.0085, seg, 0.0008), m.blued, { p: [0, gy, 0] }));
    const rs = [0.0013, 0.0016, 0.0019, 0.0023];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      out.push(part(cylZ(rs[i], g.z1 + 0.0078, g.z1 + 0.0088, 12), m.recess, { p: [0.0068 * Math.cos(a), gy + 0.0068 * Math.sin(a), 0] }));
    }
    // regulator key on the right side (lever with a hole, pointing down and to the right)
    const ka = 205 * RAD;
    const key: V2[] = [];
    const kl = 0.0225, kw = 0.0042;
    for (const [u, v] of [
      [0.009, -kw],
      [kl, -kw * 0.8],
      [kl + 0.004, 0],
      [kl, kw * 0.8],
      [0.009, kw],
    ] as V2[]) key.push([u * Math.cos(ka) - v * Math.sin(ka), gy + u * Math.sin(ka) + v * Math.cos(ka)]);
    out.push(part(extrudeZ(key, [circle2D(kl * Math.cos(ka), gy + kl * Math.sin(ka), 0.0016, 10)], g.z1 + 0.001, g.z1 + 0.005, 0.0005), m.blued));
  }

  // ================= foresight: collar, bracket to the left, ears and blade
  {
    const fc = BR.foreCollar, x = BR.sightX, z = BR.foreSightZ;
    out.push(part(latheZ(ringProfile(0.0094, fc.r, fc.z0, fc.z1, 0.001), seg, 35), m.black));
    const brk: V2[] = [
      [0.0035, 0.0118],
      [0.0098, 0.0068],
      [0.0215, 0.0052],
      [x + 0.0072, 0.0078],
      [x + 0.0072, 0.0142],
      [x - 0.0078, 0.0142],
      [0.0075, 0.0128],
    ];
    out.push(part(extrudeZ(brk, [], z - 0.0105, z + 0.0105, 0.0008), m.black));
    // protecting ears either side of the blade
    for (const sx of [-1, 1]) {
      const ear: V2[] = [
        [x + sx * 0.0048, 0.0135],
        [x + sx * 0.0072, 0.0135],
        [x + sx * 0.0072, 0.0395],
        [x + sx * 0.0062, 0.0415],
        [x + sx * 0.0048, 0.0415],
      ];
      out.push(part(extrudeZ(ear, [], z - 0.0085, z + 0.0085, 0.0005), m.black));
    }
    // blade on its dovetail block
    out.push(part(G.rbox(0.0082, 0.0038, 0.0112, 0.0008, 1), m.blued, { p: [x, 0.0158, z] }));
    const blade: V2[] = [
      [z - 0.0026, 0.017],
      [z + 0.0026, 0.017],
      [z + 0.0012, BR.foreTipY],
      [z - 0.0012, BR.foreTipY],
    ];
    out.push(part(plateZY(blade, 0.0016, [], 0.0003), m.blued, { p: [x, 0, 0] }));
    // collar clamp screw on the right
    const [head, slot] = screwParts(0.0033, 0.0011, 20);
    const sp = V(-fc.r * Math.cos(20 * RAD), fc.r * Math.sin(20 * RAD), (fc.z0 + fc.z1) / 2);
    const n = V(-Math.cos(20 * RAD), Math.sin(20 * RAD), 0);
    out.push(part(placeAlong(head, sp, n), m.blued), part(placeAlong(slot, sp, n, 90), m.recess));
  }

  // ================= plain conical Mk II flash hider with a dark bore
  {
    const z0 = BR.flashRear, z1 = BR.muzzleZ;
    const prof: V2[] = [
      [0.0068, z0 + 0.004],
      [0.0068, z0],
      [0.0114, z0],
      [0.0118, z0 + 0.0012],
      [0.0118, z0 + 0.0072],
      [0.0112, z0 + 0.0085],
      [0.0152, z1 - 0.0022],
      [0.0152, z1 - 0.0006],
      [0.0146, z1],
      [0.0128, z1],
      [0.0122, z1 - 0.0012],
      [0.0072, z0 + 0.012],
      [0.0068, z0 + 0.004],
    ];
    out.push(part(latheZ(prof, seg, 30), m.black));
    out.push(part(cylZ(0.0067, 1.0955, 1.0962, 16), m.recess));
    out.push(part(cylZ(0.0038, 1.0961, 1.0968, 16), m.recess));
  }
  return out;
}
