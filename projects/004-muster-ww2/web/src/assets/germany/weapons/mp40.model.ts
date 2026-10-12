/**
 * MP 40 (Maschinenpistole 40), 9x19 mm submachine gun - shared weapon model.
 *
 * STABLE EXPORT (used by the standalone catalog entry and by soldier builders):
 *
 *   import { buildMp40 } from '../germany/weapons/mp40.model';   // path relative to your module
 *   const mp40 = buildMp40({ stock: 'extended' });                   // -> WeaponModel (shared/contracts.ts)
 *
 *   Mp40Options
 *     stock:    'extended' (default) | 'folded'   underfolding steel stock
 *     magazine: boolean (default true)            32-round magazine inserted
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, weapon's left side +X.
 * ORIGIN = trigger-hand grip centre (on the pistol-grip axis, 42 mm below the top of the grip).
 * Real scale (m): overall 0.833 stock extended / ~0.633 folded, barrel 0.25, bore axis 91 mm above origin.
 *
 *   grips.trigger  pistol grip: axis up the (14 deg raked) grip, palm towards the right-rear (-X/-Z).
 *   grips.support  magazine housing (as commonly held): axis +Y, palm on the left-rear face (+X/-Z),
 *                  radius 22 mm (the housing is 30 x 46 mm), length 85 mm.
 *   shoulder       centre of the butt plate (extended stock only).
 *   muzzle         front face of the muzzle nut.
 *   sling          front = strap loop on the barrel collar (right side), rear = slot in the grip frame
 *                  behind the pistol grip. sling.build(gravityLocal, slack) returns the leather strap;
 *                  it is NOT part of `object`.
 *   restPoints     [lower housing under the stock hinge area, bottom of the resting bar] (true surface).
 *   sockets        'trigger' (centre of the trigger's front face; the finger pulls towards -Z), 'magazine' (magazine centre),
 *                  'boltHandle' (knob centre, +X = outwards).
 *
 * Everything is authored in a "bore frame" (z = 0 at the rear of the receiver tube, y = 0 on the bore)
 * and shifted at the end so that the grip centre is the origin.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { MAT } from './mp40/materials';
import { F, slottedTube, shellSector, ribbedCyl, prismZ, latheZ, latheX, boreZ, plateZY, roundRect, cradleRing, basis } from './mp40/geo';
import { buildSling, type SlingObstacle, type SlingSpec } from './mp40/sling';

export interface Mp40Options {
  stock?: 'extended' | 'folded';
  magazine?: boolean;
}

type V2 = [number, number];
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const RAD = Math.PI / 180;

/** Key dimensions in the bore frame (metres). */
export const MP40_DIMS = {
  tubeR: 0.0185,
  tubeEnd: 0.402,
  muzzleZ: 0.630,
  buttZ: -0.2025,
  gripTop: v(0, -0.050, 0.098),
  gripRake: 14,
  gripCentreW: 0.042,
  hinge: v(0, -0.040, 0.018),
  strutEnd: v(0, -0.047, -0.186),
  magZ: 0.3465,
  slot: { z0: 0.047, z1: 0.070, y0: -0.0495, y1: -0.0455 },
  housing: { hw: 0.0125, yBottom: -0.054 },
};

// ------------------------------------------------------------------------------------------------
// Grip frame helpers
const RAKE = MP40_DIMS.gripRake * RAD;
const GRIP_TOP = MP40_DIMS.gripTop;
/** Down the grip axis. */
const G_DOWN = v(0, -Math.cos(RAKE), -Math.sin(RAKE));
/** Forward, perpendicular to the grip axis. */
const G_FWD = v(0, -Math.sin(RAKE), Math.cos(RAKE));
const gripPoint = (u: number, fv: number, w: number) => GRIP_TOP.clone().add(v(u, 0, 0)).addScaledVector(G_FWD, fv).addScaledVector(G_DOWN, w);
const GRIP_M = basis(v(1, 0, 0), G_FWD, G_DOWN, GRIP_TOP);

/** Grip sections: w (down the axis), half width a, half depth b, fore/aft offset dv. */
const GRIP_SECTIONS: [number, number, number, number][] = [
  [-0.004, 0.0116, 0.0180, 0.0],
  [0.000, 0.0121, 0.0186, 0.0],
  [0.004, 0.0137, 0.0196, 0.0],
  [0.012, 0.0145, 0.0204, 0.0],
  [0.030, 0.0149, 0.0211, -0.0005],
  [0.050, 0.0151, 0.0217, -0.0010],
  [0.070, 0.0150, 0.0219, -0.0010],
  [0.088, 0.0146, 0.0215, -0.0006],
  [0.095, 0.0140, 0.0209, -0.0004],
  [0.0990, 0.0131, 0.0201, -0.0003],
  [0.1015, 0.0118, 0.0189, -0.0003],
];
const gripAB = (w: number) => {
  const s = GRIP_SECTIONS;
  for (let i = 1; i < s.length; i++) {
    if (w <= s[i][0]) {
      const t = (w - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
      return { a: s[i - 1][1] + (s[i][1] - s[i - 1][1]) * t, b: s[i - 1][2] + (s[i][2] - s[i - 1][2]) * t, dv: s[i - 1][3] + (s[i][3] - s[i - 1][3]) * t };
    }
  }
  const l = s[s.length - 1];
  return { a: l[1], b: l[2], dv: l[3] };
};

function halfSuperRing(a: number, b: number, gap: number, n = 18, e = 2.7): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const th = -Math.PI / 2 + (Math.PI * i) / n;
    const c = Math.cos(th), s = Math.sin(th);
    const x = a * Math.pow(Math.abs(c), 2 / e);
    const y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
    pts.push([gap + x, y]);
  }
  pts.push([gap, b * 0.33], [gap, -b * 0.33]);
  return pts;
}

// ------------------------------------------------------------------------------------------------
// Butt plate (shoulder leaf): pressed-steel tray hinged on the stock cross tube. Leaf-local frame:
// origin on the cross-tube axis, +Z towards the weapon, +Y up.
const LEAF = { W: 0.0158, D: 0.0105, t: 0.0021, rc: 0.0034, yTop: 0.0045, yBot: -0.090 };
const leafZr = (y: number) => -0.0135 - 0.0038 * ((y + 0.0425) / 0.0465) ** 2;

/** Thick U section (x, z) of the tray: rear plate at z = 0 and side flanges running forward to z = D. */
function leafSection(W: number, D: number, t: number, rc: number, n = 5): V2[] {
  const pts: V2[] = [[W, D]];
  const ri = Math.max(0.0004, rc - t);
  for (let i = 0; i <= n; i++) {
    const a = (-90 * i) / n * RAD;
    pts.push([W - rc + rc * Math.cos(a), rc + rc * Math.sin(a)]);
  }
  for (let i = 0; i <= n; i++) {
    const a = (-90 - (90 * i) / n) * RAD;
    pts.push([-W + rc + rc * Math.cos(a), rc + rc * Math.sin(a)]);
  }
  pts.push([-W, D], [-W + t, D]);
  for (let i = 0; i <= n; i++) {
    const a = (180 + (90 * i) / n) * RAD;
    pts.push([-W + rc + ri * Math.cos(a), rc + ri * Math.sin(a)]);
  }
  for (let i = 0; i <= n; i++) {
    const a = (270 + (90 * i) / n) * RAD;
    pts.push([W - rc + ri * Math.cos(a), rc + ri * Math.sin(a)]);
  }
  pts.push([W - t, D]);
  return pts;
}

/** Shoulder leaf (pressed-steel tray + rolled knuckle) in leaf-local space. */
function leafParts(mat: THREE.Material): THREE.Object3D[] {
  const { W, D, t, rc, yTop, yBot } = LEAF;
  const sec = leafSection(W, D, t, rc);
  const n = 16;
  const secs = Array.from({ length: n + 1 }, (_, i) => {
    const y = yBot + 0.0006 + ((yTop - yBot - 0.0012) * i) / n;
    return { z: y, ring: sec, dy: leafZr(y) };
  });
  const body = F.loftZ(secs, true, 50);
  // loft axis (Z) -> Y, section y -> Z  (a reflection: flip the winding back)
  body.applyMatrix4(new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  G.flipWinding(body);
  const out: THREE.Object3D[] = [part(body, mat)];
  for (const y of [yTop - t / 2, yBot + t / 2]) {
    const z0 = leafZr(y);
    const wall = F.plate(roundRect(-W, z0, W, z0 + D, rc, 4), t, 'xz', 0.0006);
    out.push(part(wall, mat, { p: [0, y, 0] }));
  }
  out.push(part(G.rod([-0.0150, 0, 0], [0.0150, 0, 0], 0.0062, 24), mat));
  out.push(part(G.rbox(0.0300, 0.0042, 0.0090, 0.0010, 2), mat, { p: [0, 0.0024, -0.0070] }));
  return out;
}

// ------------------------------------------------------------------------------------------------

export function buildMp40(opts: Mp40Options = {}): WeaponModel {
  const folded = opts.stock === 'folded';
  const withMag = opts.magazine !== false;
  const D = MP40_DIMS;
  const blued = MAT.blued(), stamped = MAT.stamped(), bright = MAT.bright(), dark = MAT.internal(), phen = MAT.phenolic();
  const P: THREE.Object3D[] = [];
  const rT = D.tubeR;

  // ---------------- receiver tube (stamped, smooth) with cocking slot, safety notch and ejection port
  const holes = [
    { z0: 0.075, z1: 0.205, p0: -13, p1: 13 }, // cocking slot (left side)
    { z0: 0.075, z1: 0.0885, p0: 13, p1: 36 }, // safety notch, rising from the rear of the slot
    { z0: 0.068, z1: 0.0885, p0: 29, p1: 36 }, // ... hooked back
    { z0: 0.1965, z1: 0.205, p0: 13, p1: 17.5 }, // small notch above the forward bolt position
    { z0: 0.332, z1: 0.363, p0: 160, p1: 200 }, // ejection port (right side)
  ];
  P.push(part(slottedTube(rT, rT - 0.0012, 0.0, D.tubeEnd, holes, 2.5), stamped));
  // rear end cap
  P.push(part(latheZ([[0, -0.0036], [0.0022, -0.0036], [0.0029, -0.0031], [0.0040, -0.0029], [0.0140, -0.0019], [0.0172, -0.0009], [0.0188, 0.0004], [0.0194, 0.0017], [0.0194, 0.0058], [0.0189, 0.0067], [0.0184, 0.0070]], 56), stamped));
  // magazine-housing rings over the receiver ribs, and the saddle between them
  const ring = (zc: number) => latheZ([[0.0184, zc - 0.0036], [0.0197, zc - 0.0033], [0.0204, zc - 0.0020], [0.0205, zc], [0.0204, zc + 0.0020], [0.0197, zc + 0.0033], [0.0184, zc + 0.0036]], 60);
  P.push(part(ring(0.3255), stamped), part(ring(0.3705), stamped));
  P.push(part(shellSector(0.0197, 0.01845, 0.3288, 0.3672, 206, 334, 3), stamped));
  // spot welds (small raised nuggets) along the saddle, and on the rear-sight base flanks
  {
    const nug = new THREE.SphereGeometry(0.0017, 10, 3, 0, Math.PI * 2, 0, Math.PI / 2);
    nug.scale(1, 0.16, 1);
    const spots: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
    for (const phi of [222, 318]) {
      const n = v(Math.cos(phi * RAD), Math.sin(phi * RAD), 0);
      for (const z of [0.3355, 0.3480, 0.3605]) spots.push({ p: n.clone().multiplyScalar(0.01965).setZ(z), n });
    }
    for (const sx of [-1, 1]) for (const z of [0.3355, 0.3555]) spots.push({ p: v(sx * 0.00672, 0.0170, z), n: v(sx, 0, 0) });
    P.push(part(G.scatter(nug, spots), stamped));
  }
  // internals visible through the slot / port: bolt (bright), extractor, telescoping spring tubes
  P.push(part(latheZ([[0, 0.190], [0.0150, 0.190], [0.0165, 0.1912], [0.0168, 0.1925], [0.0168, 0.3690], [0.0160, 0.3708], [0.0050, 0.3710], [0.0045, 0.3702], [0, 0.3702]], 48), bright));
  P.push(part(G.rbox(0.0026, 0.0040, 0.0170, 0.0006, 2), bright, { p: [-0.0161, 0, 0.3615] }));
  P.push(part(G.rod([0, 0, 0.004], [0, 0, 0.121], 0.0080, 20), dark), part(G.rod([0, 0, 0.12], [0, 0, 0.1905], 0.0071, 20), dark));
  // bolt handle (forward position): stem through the slot + grooved knob
  P.push(part(G.rod([0.0120, 0, 0.2005], [0.0300, 0, 0.2005], 0.0040, 16), blued));
  P.push(part(latheX([[0.0040, 0.0286], [0.0063, 0.0289], [0.0073, 0.0295], [0.0079, 0.0305], [0.0079, 0.0330], [0.0072, 0.0334], [0.0072, 0.0342], [0.0079, 0.0346], [0.0079, 0.0364], [0.0071, 0.0375], [0.0050, 0.0382], [0, 0.0384]], 32), blued, { p: [0, 0, 0.2005] }));

  // ---------------- rear sight (spot-welded base, standing 100 m leaf, 200 m leaf folded back)
  P.push(part(plateZY([[0.3310, 0.0150], [0.3600, 0.0150], [0.3600, 0.0200], [0.3565, 0.0232], [0.3345, 0.0232], [0.3310, 0.0200]], 0.0135, 0.0007), blued));
  P.push(part(F.plate([[-0.0060, 0.0226], [0.0060, 0.0226], [0.0060, 0.0300], [0.0013, 0.0300], [0.0, 0.0284], [-0.0013, 0.0300], [-0.0060, 0.0300]], 0.0022, 'xy', 0.0003), blued, { p: [0, 0, 0.3525] }));
  for (const sx of [-1, 1]) P.push(part(G.rbox(0.0020, 0.0042, 0.0046, 0.0005, 2), blued, { p: [sx * 0.0056, 0.0246, 0.3445] }));
  P.push(part(G.rod([-0.0068, 0.0248, 0.3445], [0.0068, 0.0248, 0.3445], 0.0009, 10), blued));
  P.push(part(F.plate([[-0.0046, 0.3440], [0.0046, 0.3440], [0.0046, 0.3328], [0.0011, 0.3328], [0.0, 0.3340], [-0.0011, 0.3328], [-0.0046, 0.3328]], 0.0014, 'xz', 0.0003), blued, { p: [0, 0.0241, 0] }));
  P.push(part(G.rod([-0.0036, 0.0248, 0.3445], [0.0036, 0.0248, 0.3445], 0.0015, 14), blued));

  // ---------------- barrel collar: split ring + strap loop (right side), hex collar nut, taper
  P.push(part(latheZ([[0.0184, 0.3985], [0.0196, 0.3987], [0.0199, 0.3995], [0.0199, 0.4040], [0.0196, 0.4045], [0.0184, 0.4047]], 56), blued));
  for (const sy of [-1, 1]) P.push(part(G.rbox(0.0090, 0.0046, 0.0056, 0.0012, 2), blued, { p: [-0.0182, sy * 0.0142, 0.4015] }));
  const loopBarX = -0.0315;
  P.push(part(G.tube([[-0.0190, 0.0142, 0.4015], [-0.0275, 0.0142, 0.4015], [-0.0306, 0.0131, 0.4015], [-0.0315, 0.0110, 0.4015], [-0.0315, -0.0110, 0.4015], [-0.0306, -0.0131, 0.4015], [-0.0275, -0.0142, 0.4015], [-0.0190, -0.0142, 0.4015]], 0.0021, 10, 60), blued));
  P.push(part(prismZ(0.0405, 0.0228, 6, 0.0011), blued, { p: [0, 0, 0.4159] }));
  P.push(part(latheZ([[0.0127, 0.4270], [0.0193, 0.4272], [0.0193, 0.4285], [0.0172, 0.4318], [0.0146, 0.4338], [0.0129, 0.4342]], 56), blued));

  // ---------------- barrel
  P.push(part(latheZ([[0.0125, 0.4300], [0.0128, 0.4330], [0.0128, 0.4495], [0.0122, 0.4510], [0.0112, 0.4530], [0.0108, 0.4560], [0.0104, 0.5200], [0.0100, 0.5900], [0.0100, 0.6122]], 64), blued));
  // resting bar (phenolic) with steel band and pin
  P.push(part(plateZY([[0.5335, -0.0085], [0.5362, -0.0268], [0.5412, -0.0312], [0.5800, -0.0312], [0.5872, -0.0205], [0.5890, -0.0085]], 0.0092, 0.0012, [], 0.0018), phen));
  P.push(part(latheZ([[0.0100, 0.5603], [0.0110, 0.5606], [0.0112, 0.5614], [0.0112, 0.5656], [0.0110, 0.5664], [0.0100, 0.5667]], 40), blued));
  P.push(part(G.rod([-0.0052, -0.0178, 0.5745], [0.0052, -0.0178, 0.5745], 0.0016, 14), blued));

  // ---------------- front sight: holder band, base, blade in a dovetail, hood, pin
  P.push(part(latheZ([[0.0099, 0.5905], [0.0110, 0.5908], [0.0113, 0.5918], [0.0113, 0.6100], [0.0110, 0.6110], [0.0099, 0.6113]], 44), blued));
  P.push(part(plateZY([[0.5915, 0.0060], [0.6105, 0.0060], [0.6105, 0.0165], [0.6086, 0.0178], [0.5934, 0.0178], [0.5915, 0.0165]], 0.0172, 0.0007), blued));
  P.push(part(G.rbox(0.0062, 0.0017, 0.0092, 0.0004, 2), blued, { p: [0, 0.0184, 0.6005] }));
  P.push(part(plateZY([[0.5968, 0.0184], [0.6042, 0.0184], [0.6015, 0.0272], [0.5995, 0.0272]], 0.0022, 0.0003), blued));
  P.push(part(shellSector(0.0110, 0.0098, 0.5936, 0.6084, -35, 215, 4), blued, { p: [0, 0.0205, 0] }));
  P.push(part(G.rod([-0.0090, 0.0112, 0.6012], [0.0090, 0.0112, 0.6012], 0.0011, 10), blued));

  // ---------------- muzzle nut (knurled) with the bore
  P.push(part(ribbedCyl(0.0108, 0.00045, 0.0134, 30, 0.0002), blued, { p: [0, 0, 0.6185] }));
  P.push(part(latheZ([[0.0104, 0.6250], [0.0106, 0.6262], [0.0101, 0.6285], [0.0090, 0.6297], [0.0060, 0.6300], [0.0052, 0.6296], [0.0048, 0.6285], [0.0047, 0.6262]], 44), blued));
  P.push(part(boreZ(0.00455, 0.600, 0.6263, 20), dark));
  P.push(part(G.cyl(0.0046, 0.0046, 0.0005, 16), dark, { p: [0, 0, 0.6003], r: [90, 0, 0] }));

  // ---------------- magazine housing: ribbed stamped box, lip, catch, pins
  {
    const outer = roundRect(-0.0150, -0.0230, 0.0150, 0.0230, 0.0045);
    const inner = roundRect(-0.0137, -0.0217, 0.0137, 0.0217, 0.0034);
    const box = F.extrude(G.shape(outer, 0, [inner]), 0.0960, 0.0006, 4, 2);
    box.rotateX(-Math.PI / 2);
    P.push(part(box, stamped, { p: [0, -0.0582, 0.346] }));
    const lipO = roundRect(-0.0157, -0.0237, 0.0157, 0.0237, 0.0050);
    const lip = F.extrude(G.shape(lipO, 0, [inner]), 0.0052, 0.0009, 4, 2);
    lip.rotateX(-Math.PI / 2);
    P.push(part(lip, stamped, { p: [0, -0.1037, 0.346] }));
    const rib = new THREE.CapsuleGeometry(0.0026, 0.056, 4, 12);
    for (const sx of [-1, 1]) {
      for (const zc of [0.3375, 0.3545]) P.push(part(rib, stamped, { p: [sx * 0.0148, -0.0685, zc], s: [0.42, 1, 1] }));
      for (const zc of [0.3315, 0.3605]) P.push(part(latheX(sx > 0 ? [[0.0021, 0.0148], [0.0019, 0.0154], [0.0010, 0.0157], [0, 0.01575]] : [[0, -0.01575], [0.0010, -0.0157], [0.0019, -0.0154], [0.0021, -0.0148]], 14), blued, { p: [0, -0.0165, zc] }));
    }
    // magazine catch (left side): boss, knurled push button, latch
    P.push(part(latheX([[0.0058, 0.0146], [0.0058, 0.0171], [0.0052, 0.0179], [0.0040, 0.0181]], 28), stamped, { p: [0, -0.0275, 0.3345] }));
    P.push(part(ribbedCyl(0.0034, 0.0003, 0.0040, 12, 0.0002), blued, { p: [0.0200, -0.0275, 0.3345], r: [0, 90, 0] }));
    P.push(part(latheX([[0.0034, 0.0219], [0.0029, 0.0225], [0.0016, 0.0228], [0, 0.0229]], 20), blued, { p: [0, -0.0275, 0.3345] }));
    P.push(part(plateZY([[0.3262, -0.0205], [0.3292, -0.0205], [0.3296, -0.0350], [0.3258, -0.0350]], 0.0012, 0.0003, [], 0.0012), blued, { p: [0.0156, 0, 0] }));
    P.push(part(latheX([[0.0017, 0.0161], [0.0014, 0.0167], [0, 0.0169]], 12), blued, { p: [0, -0.0220, 0.3277] }));
  }

  // ---------------- magazine (32 rounds, ribbed sides, slide-on floorplate)
  let magSocket = new THREE.Matrix4();
  if (withMag) {
    const mz = D.magZ;
    const body = G.rbox(0.0215, 0.2275, 0.0340, 0.0032, 3);
    P.push(part(body, stamped, { p: [0, -0.13125, mz] }));
    const mrib = new THREE.CapsuleGeometry(0.0030, 0.200, 4, 12);
    for (const sx of [-1, 1]) P.push(part(mrib, stamped, { p: [sx * 0.01075, -0.138, mz], s: [0.34, 1, 1] }));
    P.push(part(G.rbox(0.0226, 0.0042, 0.0352, 0.0015, 2), stamped, { p: [0, -0.2426, mz] }));
    P.push(part(G.rbox(0.0240, 0.0060, 0.0372, 0.0018, 2), stamped, { p: [0, -0.2485, mz] }));
    P.push(part(G.cyl(0.0036, 0.0036, 0.0006, 20), blued, { p: [0, -0.2513, mz - 0.004] }));
    magSocket = new THREE.Matrix4().makeTranslation(0, -0.135, mz);
  }

  // ---------------- lower housing (stamped sheet box) with the sling slot behind the grip
  {
    const hw = D.housing.hw, yb = D.housing.yBottom, t = 0.0015;
    const sl = D.slot;
    const side: V2[] = [[0.0, -0.0130], [0.0, yb], [0.125, yb], [0.150, yb + 0.0005], [0.170, yb + 0.0020], [0.186, yb + 0.0040], [0.186, -0.0130]];
    const slotHole = roundRect(sl.z0, sl.y0, sl.z1, sl.y1, 0.0012, 3);
    const plateG = plateZY(side, t, 0.0004, [slotHole], 0.0035);
    for (const sx of [-1, 1]) P.push(part(plateG, stamped, { p: [sx * (hw - t / 2), 0, 0] }));
    const bot: [number, number, number][] = [[0, yb + t / 2, 0.003], [0, yb + t / 2, 0.125], [0, yb + 0.0005 + t / 2, 0.150], [0, yb + 0.002 + t / 2, 0.170], [0, yb + 0.004 + t / 2, 0.1855]];
    P.push(part(F.strap(bot, 2 * (hw - t), t, [0, -1, 0], { samples: 40 }), stamped));
    for (const sx of [-1, 1]) {
      const edge = bot.map(([, y, z]) => [sx * (hw - 0.0013), y - t / 2 + 0.0013, z] as [number, number, number]);
      P.push(part(G.tube(edge, 0.0013, 8, 50), stamped));
    }
    const rear = F.extrude(cradleRing(hw - 0.0001, yb + 0.0001, 0.0028, 0.01862), 0.0015, 0.0004, 4, 2);
    P.push(part(rear, stamped, { p: [0, 0, 0.0004] }));
    // stock hinge bushing, push button (left), rivet head (right)
    const H = D.hinge;
    P.push(part(G.rod([-0.0166, H.y, H.z], [0.0166, H.y, H.z], 0.0056, 22), stamped));
    P.push(part(ribbedCyl(0.0040, 0.0003, 0.0030, 12, 0.0002), blued, { p: [0.0219, H.y, H.z], r: [0, 90, 0] }));
    P.push(part(latheX([[0.0040, 0.0233], [0.0034, 0.0238], [0.0018, 0.0241], [0, 0.0242]], 20), blued, { p: [0, H.y, H.z] }));
    P.push(part(latheX([[0, -0.0224], [0.0022, -0.0222], [0.0033, -0.0214], [0.0036, -0.0204]], 20), blued, { p: [0, H.y, H.z] }));
    // pin heads through the housing sides (trigger, sear, trigger spring)
    const pinHead = (r: number, sx: number) => latheX(sx > 0 ? [[r, hw - 0.0002], [r * 0.85, hw + 0.0003], [r * 0.45, hw + 0.0006], [0, hw + 0.0007]] : [[0, -hw - 0.0007], [r * 0.45, -hw - 0.0006], [r * 0.85, -hw - 0.0003], [r, -hw + 0.0002]], 16);
    for (const [py, pz, pr] of [[-0.0500, 0.1405, 0.0021], [-0.0415, 0.1120, 0.0019], [-0.0440, 0.1660, 0.0017]] as const) {
      for (const sx of [-1, 1]) P.push(part(pinHead(pr, sx), blued, { p: [0, py, pz] }));
    }
  }

  // ---------------- lower receiver cover / fore-end (phenolic)
  {
    // gently convex moulded sides (inset towards the top and bottom edges)
    const groove = (y: number) => 0.0009 * Math.min(1, ((y + 0.030) / 0.020) ** 2);
    const secs: [number, number, number][] = [[0.1822, 0.0118, -0.0498], [0.1840, 0.0136, -0.0527], [0.1868, 0.0149, -0.0550], [0.1910, 0.0155, -0.0560], [0.2600, 0.0155, -0.0560], [0.3236, 0.0155, -0.0560]];
    const fe = F.loftZ(secs.map(([z, hw, yb]) => ({ z, ring: cradleRing(hw, yb, 0.0065, 0.01862, hw > 0.015 ? groove : undefined) })), true, 50);
    P.push(part(fe, phen));
    // two screws holding the cover to the lower receiver (underside)
    for (const zc of [0.2240, 0.2920]) {
      P.push(part(F.lathe([[0, 0.0], [0.0034, 0.0], [0.0035, 0.0004], [0.0030, 0.0009], [0, 0.0011]], 20, 50), blued, { p: [0, -0.0558, zc], r: [180, 0, 0] }));
      P.push(part(G.rbox(0.0006, 0.0006, 0.0056, 0.0001, 1), dark, { p: [0, -0.0567, zc], r: [0, 90, 0] }));
    }
  }

  // ---------------- pistol grip: two phenolic grip plates on the steel frame, screw + bushing
  {
    const gap = 0.00032;
    const half = F.loftZ(GRIP_SECTIONS.map(([w, a, b, dv]) => ({ z: w, ring: halfSuperRing(a, b, gap), dy: dv })), true, 60);
    half.applyMatrix4(GRIP_M);
    P.push(mirrorX(part(half, phen)));
    const frameSecs = GRIP_SECTIONS.filter(([w]) => w <= 0.099).map(([w, , b, dv]) => ({ z: w, ring: [[0.00045, -(b - 0.0004)], [0.00045, b - 0.0004], [-0.00045, b - 0.0004], [-0.00045, -(b - 0.0004)]] as V2[], dy: dv }));
    const frameG = F.loftZ(frameSecs, true, 30);
    frameG.applyMatrix4(GRIP_M);
    P.push(part(frameG, stamped));
    // frame base plate
    const baseG = F.loftZ([
      { z: 0.1005, ring: G.superRing(0.0122, 0.0192, 28, 2.7), dy: -0.0003 },
      { z: 0.1028, ring: G.superRing(0.0121, 0.0190, 28, 2.7), dy: -0.0003 },
      { z: 0.1040, ring: G.superRing(0.0110, 0.0178, 28, 2.7), dy: -0.0003 },
    ], true, 50);
    baseG.applyMatrix4(GRIP_M);
    P.push(part(baseG, stamped));
    // grip screw (left) and bushing (right)
    const ws = 0.047;
    const { a } = gripAB(ws);
    const sp = gripPoint(0, -0.0015, ws);
    const qG = new THREE.Quaternion().setFromRotationMatrix(GRIP_M);
    const screw = group([
      part(latheX([[0.0036, a - 0.0004], [0.0052, a - 0.0003], [0.0054, a + 0.0002], [0.0052, a + 0.0005], [0.0036, a + 0.0005]], 28), stamped),
      part(latheX([[0.0034, a], [0.0036, a + 0.0006], [0.0035, a + 0.0013], [0.0028, a + 0.0018], [0, a + 0.0020]], 28), blued),
      part(G.rbox(0.0007, 0.0006, 0.0058, 0.0001, 1), dark, { p: [a + 0.0018, 0, 0] }),
    ]);
    screw.position.copy(sp);
    screw.quaternion.copy(qG);
    const bush = group([
      part(latheX([[0, -(a + 0.0012)], [0.0030, -(a + 0.0011)], [0.0042, -(a + 0.0005)], [0.0047, -(a - 0.0004)]], 28), blued),
    ]);
    bush.position.copy(sp);
    bush.quaternion.copy(qG);
    P.push(screw, bush);
  }

  // ---------------- trigger guard and trigger
  const guardPts: [number, number, number][] = [[0, -0.0640, 0.1120], [0, -0.0755, 0.1170], [0, -0.0835, 0.1270], [0, -0.0865, 0.1450], [0, -0.0845, 0.1630], [0, -0.0775, 0.1760], [0, -0.0660, 0.1835], [0, -0.0530, 0.1860], [0, -0.0470, 0.1865]];
  const gc = v(0, -0.064, 0.150);
  const guardN = guardPts.map(([x, y, z]) => v(x, y, z).sub(gc).normalize());
  P.push(part(F.strap(guardPts, 0.0095, 0.0024, guardN, { samples: 70 }), stamped));
  const trigPts: [number, number, number][] = [[0, -0.0480, 0.1412], [0, -0.0560, 0.1416], [0, -0.0625, 0.1410], [0, -0.0690, 0.1392], [0, -0.0752, 0.1355]];
  P.push(part(F.strap(trigPts, 0.0058, 0.0034, [0, 0, 1], { samples: 30 }), blued));
  P.push(part(G.rod([-0.0126, -0.0500, 0.1405], [0.0126, -0.0500, 0.1405], 0.0013, 10), blued));

  // ---------------- underfolding stock: braces with eyes, cross tube, shoulder leaf
  const H = D.hinge, T = D.strutEnd;
  const Tr = T.clone().sub(H); // relative to hinge
  const stock: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? 0.0166 : -0.0204, x1 = sx > 0 ? 0.0204 : -0.0166;
    const eyeProfile = (r: number, xa: number, xb: number): V2[] => [[0, xa], [r - 0.0005, xa], [r, xa + 0.0004], [r, xb - 0.0004], [r - 0.0005, xb], [0, xb]];
    stock.push(part(latheX(eyeProfile(0.0075, x0, x1), 28), stamped));
    stock.push(part(latheX(eyeProfile(0.0060, x0, x1), 24), stamped, { p: [0, Tr.y, Tr.z] }));
    // brace bar (pressed), rolled top/bottom edges
    const bar = plateZY([[-0.0040, 0.0052], [Tr.z + 0.004, Tr.y + 0.0047], [Tr.z + 0.004, Tr.y - 0.0047], [-0.0040, -0.0052]], 0.0026, 0.0005);
    stock.push(part(bar, stamped, { p: [sx * 0.0185, 0, 0] }));
    for (const sy of [-1, 1]) {
      stock.push(part(G.tube([[sx * 0.0190, sy * 0.0049, -0.006], [sx * 0.0190, Tr.y + sy * 0.0044, Tr.z + 0.006]], 0.0012, 8, 4), stamped));
    }
    // rivet heads on the end pieces
    stock.push(part(latheX(sx > 0 ? [[0.0042, 0.0203], [0.0036, 0.0209], [0.0020, 0.0213], [0, 0.0214]] : [[0, -0.0214], [0.0020, -0.0213], [0.0036, -0.0209], [0.0042, -0.0203]], 20), blued, { p: [0, Tr.y, Tr.z] }));
  }
  stock.push(part(G.rod([-0.0200, Tr.y, Tr.z], [0.0200, Tr.y, Tr.z], 0.0040, 20), stamped));
  const leafHolder = group(leafParts(stamped), { p: [0, Tr.y, Tr.z] });
  stock.push(leafHolder);
  const stockG = group(stock, { p: [H.x, H.y, H.z] });
  let foldDeg = 0;
  if (folded) {
    // swing the braces down and forward under the lower receiver; the tube ends below the fore-end
    const target = v(0, -0.064, 0).sub(H);
    const L = Tr.length();
    const dy = target.y, dz = Math.sqrt(Math.max(0, L * L - dy * dy));
    const a = [Tr.y, Tr.z], b = [dy, dz];
    foldDeg = Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) / RAD;
    stockG.rotation.x = foldDeg * RAD;
    leafHolder.rotation.x = -foldDeg * RAD; // leaf keeps hanging down
  }
  P.push(stockG);

  // ------------------------------------------------------------------------------------------------
  const bore = group(P);
  const gc0 = gripPoint(0, 0, D.gripCentreW);
  const root = group([bore], { p: [-gc0.x, -gc0.y, -gc0.z], name: 'mp40' });
  const object = group([root]);
  object.name = 'mp40';
  const L = (p: THREE.Vector3) => p.clone().sub(gc0); // bore frame -> weapon local

  // grips
  const gAxis = G_DOWN.clone().negate();
  const palmT = v(-0.8, 0, 0).addScaledVector(G_FWD, -0.6);
  palmT.addScaledVector(gAxis, -palmT.dot(gAxis)).normalize();
  const trigger: Grip = { position: new THREE.Vector3(0, 0, 0), axis: gAxis, palm: palmT, radius: 0.0175, length: 0.095 };
  // housing is 30 x 46 mm: 22 mm keeps the wrapped fingers outside its front and rear faces
  const support: Grip = { position: L(v(0, -0.064, 0.346)), axis: v(0, 1, 0), palm: v(0.8, 0, -0.6).normalize(), radius: 0.022, length: 0.085 };

  // sling spec (bore frame) and obstacles
  const box = (c: THREE.Vector3, h: [number, number, number], ax?: [THREE.Vector3, THREE.Vector3, THREE.Vector3]): SlingObstacle => ({ c, h, axes: ax ?? [v(1, 0, 0), v(0, 1, 0), v(0, 0, 1)] });
  const obstacles: SlingObstacle[] = [
    box(v(0, -0.058, 0.346), [0.0168, 0.049, 0.0245]),
    box(v(0, -0.180, 0.3465), [0.0122, 0.073, 0.0188]),
    box(v(0, -0.034, 0.253), [0.0162, 0.0232, 0.0716]),
    box(v(0, -0.034, 0.094), [0.0134, 0.0212, 0.093]),
    box(v(0, -0.0695, 0.149), [0.0060, 0.0185, 0.0395]),
    box(gripPoint(0, -0.0006, 0.052), [0.0156, 0.0545, 0.0226], [v(1, 0, 0), G_DOWN.clone(), G_FWD.clone()]),
    box(v(0, 0, 0.20), [0.0207, 0.0207, 0.235]),
    box(v(0, 0, 0.53), [0.0125, 0.0125, 0.10]),
    box(v(0, -0.020, 0.561), [0.0060, 0.0120, 0.030]),
  ];
  if (!folded) {
    obstacles.push(box(v(0, -0.043, -0.085), [0.0216, 0.0095, 0.105]));
    obstacles.push(box(v(0, -0.090, -0.195), [0.0178, 0.050, 0.013]));
  } else {
    const Tf = Tr.clone().applyAxisAngle(v(1, 0, 0), foldDeg * RAD).add(H);
    const mid = H.clone().lerp(Tf, 0.5);
    const along = Tf.clone().sub(H).normalize();
    const perp = v(1, 0, 0).cross(along).normalize();
    obstacles.push(box(mid, [0.0216, 0.0095, Tr.length() / 2 + 0.008], [v(1, 0, 0), perp, along]));
    obstacles.push(box(v(0, Tf.y - 0.043, Tf.z - 0.010), [0.0178, 0.050, 0.013]));
  }
  const slingSpec: SlingSpec = {
    width: 0.022,
    thickness: 0.0032,
    front: { bar: v(loopBarX, 0, 0.4015), barR: 0.0021 },
    rear: { z: (D.slot.z0 + D.slot.z1) / 2, hw: D.housing.hw, yBottom: D.housing.yBottom, ySlot: (D.slot.y0 + D.slot.y1) / 2 },
    obstacles,
  };

  // sockets
  const trigFace = L(v(0, -0.0640, 0.1430));
  const sockets: Record<string, THREE.Matrix4> = {
    trigger: new THREE.Matrix4().makeTranslation(trigFace.x, trigFace.y, trigFace.z),
    boltHandle: new THREE.Matrix4().makeTranslation(...L(v(0.0335, 0, 0.2005)).toArray()),
  };
  if (withMag) sockets.magazine = new THREE.Matrix4().makeTranslation(...L(new THREE.Vector3().setFromMatrixPosition(magSocket)).toArray());

  const shoulder = folded ? undefined : L(v(0, T.y - 0.0425, T.z - 0.0135));
  const rear = folded ? v(0, D.housing.yBottom, 0.009) : v(0, D.housing.yBottom, 0.036);
  return {
    id: 'de-mp40',
    object,
    grips: { trigger, support },
    shoulder,
    muzzle: L(v(0, 0, D.muzzleZ)),
    sling: {
      front: L(v(loopBarX, 0, 0.4015)),
      rear: L(v(-D.housing.hw, (D.slot.y0 + D.slot.y1) / 2, (D.slot.z0 + D.slot.z1) / 2)),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = buildSling(slingSpec, gravityLocal, slack);
        return group([s], { p: [-gc0.x, -gc0.y, -gc0.z], name: 'mp40-sling' });
      },
    },
    length: folded ? D.muzzleZ + 0.0036 : D.muzzleZ - D.buttZ,
    restPoints: [L(rear), L(v(0, -0.0312, 0.5605))],
    sockets,
  };
}

