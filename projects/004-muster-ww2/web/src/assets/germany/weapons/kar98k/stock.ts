/**
 * Kar98k woodwork (K-frame: z = 0 at the breech face, muzzle at z = +0.600, butt plate at z = -0.510,
 * y = 0 on the bore axis, +x = the rifle's left side).
 *
 * The stock is lofted through analytic cross-sections: a super-ellipse with separate exponents for
 * the upper and lower half, split at the widest line (ySplit). The same section function is used to
 * seat every fitting (butt plate, tangs, floorplate, disc, eyelets, bands) exactly on the wood.
 */
import { THREE, G, part } from '../../../../core/kit';
import { keyInterp, latheX, plateZY, stadium, warp, screwParts, placeAlong, V, type V2 } from '../common/geo';
import type { K98Mats } from './materials';

export interface Sec {
  hw: number;
  yTop: number;
  ySplit: number;
  yBot: number;
  eTop: number;
  eBot: number;
}

/** [z, half width, top, widest line, bottom, top exponent, bottom exponent] */
const KEYS: number[][] = [
  [-0.5078, 0.0206, -0.0305, -0.0995, -0.1578, 2.5, 2.7],
  [-0.49, 0.021, -0.0299, -0.098, -0.154, 2.5, 2.7],
  [-0.44, 0.0214, -0.0283, -0.0925, -0.1425, 2.5, 2.7],
  [-0.39, 0.0213, -0.0266, -0.0865, -0.13, 2.5, 2.6],
  [-0.34, 0.0208, -0.0249, -0.08, -0.117, 2.5, 2.6],
  [-0.3, 0.0202, -0.0234, -0.0745, -0.106, 2.5, 2.6],
  [-0.27, 0.0194, -0.022, -0.07, -0.098, 2.4, 2.5],
  [-0.248, 0.0184, -0.0204, -0.0662, -0.0915, 2.4, 2.5],
  [-0.23, 0.0174, -0.0186, -0.062, -0.0852, 2.4, 2.4],
  [-0.214, 0.0167, -0.0166, -0.0565, -0.0775, 2.4, 2.4],
  [-0.2, 0.0165, -0.0146, -0.052, -0.0718, 2.6, 2.4],
  [-0.186, 0.0168, -0.0132, -0.0478, -0.0676, 3.0, 2.5],
  [-0.168, 0.0176, -0.0125, -0.044, -0.0646, 3.6, 2.6],
  [-0.148, 0.0187, -0.0124, -0.0402, -0.0623, 4.2, 2.8],
  [-0.128, 0.0197, -0.0122, -0.038, -0.0609, 4.6, 3.0],
  [-0.113, 0.0202, -0.008, -0.0355, -0.0602, 5.0, 3.2],
  [-0.1, 0.0205, -0.0045, -0.034, -0.06, 5.0, 3.3],
  [-0.06, 0.0207, -0.0045, -0.032, -0.0597, 5.0, 3.4],
  [-0.01, 0.0209, -0.0042, -0.031, -0.0592, 5.0, 3.4],
  [0.02, 0.0209, -0.0025, -0.029, -0.0565, 5.0, 3.2],
  [0.04, 0.0204, 0.0, -0.024, -0.0475, 4.5, 2.8],
  [0.06, 0.0197, 0.0012, -0.018, -0.039, 4.0, 2.6],
  [0.09, 0.019, 0.0018, -0.0045, -0.0335, 4.0, 2.5],
  [0.15, 0.0184, 0.002, -0.0022, -0.0318, 4.0, 2.5],
  [0.3, 0.0172, 0.0016, -0.0024, -0.0298, 4.0, 2.5],
  [0.4, 0.0164, 0.0012, -0.0028, -0.0288, 4.0, 2.5],
  [0.47, 0.0157, 0.0008, -0.003, -0.028, 4.0, 2.5],
  [0.512, 0.0151, 0.0004, -0.0032, -0.027, 4.0, 2.5],
];

export const STOCK = {
  buttZ: -0.5078,
  frontZ: 0.512,
  hgRear: 0.112,
  hgFront: 0.314,
  /** handguard crown height at the rear / front */
  hgTop0: 0.0178,
  hgTop1: 0.0168,
  slot: { z: -0.3, y: -0.0805, len: 0.034, h: 0.0062 },
  disc: { z: -0.262, y: -0.0515, r: 0.0138 },
};

export function sectionAt(z: number): Sec {
  const [hw, yTop, ySplit, yBot, eTop, eBot] = keyInterp(KEYS, z);
  return { hw, yTop, ySplit, yBot, eTop, eBot };
}

/** Point on a section for ring parameter t (0 = +x, pi/2 = top, pi = -x, 3pi/2 = bottom). */
export function secPoint(s: Sec, t: number): V2 {
  const c = Math.cos(t), sn = Math.sin(t);
  const top = sn >= 0;
  const e = top ? s.eTop : s.eBot;
  const x = s.hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
  const y = top ? s.ySplit + (s.yTop - s.ySplit) * Math.pow(Math.abs(sn), 2 / e) : s.ySplit - (s.ySplit - s.yBot) * Math.pow(Math.abs(sn), 2 / e);
  return [x, y];
}

/** Outward 2D normal of the section at parameter t. */
export function secNormal(s: Sec, t: number): V2 {
  const d = 1e-4;
  const a = secPoint(s, t - d), b = secPoint(s, t + d);
  const tx = b[0] - a[0], ty = b[1] - a[1];
  const l = Math.hypot(tx, ty) || 1;
  return [ty / l, -tx / l];
}

export function secRing(s: Sec, n = 56): V2[] {
  return Array.from({ length: n }, (_, i) => secPoint(s, (i / n) * Math.PI * 2));
}

/** |x| of the section surface at height y (on the widest-line side band). */
export function sideX(z: number, y: number): number {
  const s = sectionAt(z);
  const top = y >= s.ySplit;
  const e = top ? s.eTop : s.eBot;
  const f = top ? (y - s.ySplit) / (s.yTop - s.ySplit) : (s.ySplit - y) / (s.ySplit - s.yBot);
  const sn = Math.pow(Math.min(1, Math.max(0, f)), e / 2);
  const c = Math.sqrt(Math.max(0, 1 - sn * sn));
  return s.hw * Math.pow(c, 2 / e);
}

/** Section y at the bottom centre (lowest wood point) and top centre. */
export const bottomY = (z: number) => sectionAt(z).yBot;
export const topY = (z: number) => sectionAt(z).yTop;

/** Handguard ring: crown arch over the barrel + the stock's top dome underneath (crescent). */
function handguardRing(z: number, n = 30): V2[] {
  const s = sectionAt(z);
  const f = (z - STOCK.hgRear) / (STOCK.hgFront - STOCK.hgRear);
  const top = STOCK.hgTop0 + (STOCK.hgTop1 - STOCK.hgTop0) * f;
  const hwH = s.hw + 0.0002, eH = 2.15;
  const y0 = s.ySplit - 0.0002;
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI;
    const c = Math.cos(t), sn = Math.sin(t);
    pts.push([hwH * Math.sign(c) * Math.pow(Math.abs(c), 2 / eH), y0 + (top - y0) * Math.pow(sn, 2 / eH)]);
  }
  // underside follows the stock's top dome back from left to right (inner points only)
  for (let i = n - 1; i >= 1; i--) {
    const t = (i / n) * Math.PI;
    const [x, y] = secPoint(s, t);
    pts.push([x * 0.985, y - 0.0003]);
  }
  return pts;
}

/** Stations along z: denser where the profile changes quickly. */
function stations(z0: number, z1: number): number[] {
  const out: number[] = [];
  let z = z0;
  while (z < z1) {
    out.push(z);
    const dense = (z > -0.27 && z < -0.09) || (z > 0.0 && z < 0.11);
    z += dense ? 0.006 : z < -0.3 ? 0.02 : 0.014;
  }
  out.push(z1);
  return out;
}

/**
 * Thin shell patch lying on the stock surface between ring parameters t0(z)..t1(z) and z0..z1.
 * `inset` is how deep the inner face sits below the wood surface, thickness t total.
 */
export function shellPatch(z0: number, z1: number, t0: (z: number) => number, t1: (z: number) => number, thick: number, inset = 0.0004, nz = 10, nu = 10): THREE.BufferGeometry {
  const secs: { z: number; ring: V2[] }[] = [];
  for (let k = 0; k <= nz; k++) {
    const z = z0 + ((z1 - z0) * k) / nz;
    const s = sectionAt(z);
    const a = t0(z), b = t1(z);
    const ring: V2[] = [];
    for (let i = 0; i <= nu; i++) {
      const t = a + ((b - a) * i) / nu;
      const [x, y] = secPoint(s, t), [nx, ny] = secNormal(s, t);
      ring.push([x + nx * (thick - inset), y + ny * (thick - inset)]);
    }
    for (let i = nu; i >= 0; i--) {
      const t = a + ((b - a) * i) / nu;
      const [x, y] = secPoint(s, t), [nx, ny] = secNormal(s, t);
      ring.push([x - nx * inset, y - ny * inset]);
    }
    secs.push({ z, ring });
  }
  return G.loftZ(secs, true, 40);
}

export function buildStock(m: K98Mats): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // ---- stock body
  const secs = stations(STOCK.buttZ, STOCK.frontZ).map((z) => ({ z, ring: secRing(sectionAt(z), 56) }));
  out.push(part(G.loftZ(secs, true, 50), m.walnut));

  // ---- upper handguard (separate piece, slightly different wood)
  const hz: number[] = [];
  for (let z = STOCK.hgRear; z < STOCK.hgFront; z += 0.012) hz.push(z);
  hz.push(STOCK.hgFront);
  const hsecs = hz.map((z) => ({ z, ring: handguardRing(z) }));
  // chamfered rear end
  hsecs[0] = { z: STOCK.hgRear, ring: handguardRing(STOCK.hgRear + 0.0015).map(([x, y]) => [x * 0.93, y * 0.93] as V2) };
  hsecs.splice(1, 0, { z: STOCK.hgRear + 0.0018, ring: handguardRing(STOCK.hgRear + 0.0018) });
  out.push(part(G.loftZ(hsecs, true, 50), m.handguard));

  // ---- cupped steel butt plate following the butt end, with the heel tang and two screws
  const bz = STOCK.buttZ;
  const ringOff = (z: number, d: number, n = 56): V2[] => {
    const s = sectionAt(z);
    return Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      const [x, y] = secPoint(s, t), [nx, ny] = secNormal(s, t);
      return [x + nx * d, y + ny * d] as V2;
    });
  };
  const bp = G.loftZ(
    [
      { z: bz + 0.0085, ring: ringOff(bz + 0.0085, 0.0003) },
      { z: bz + 0.0072, ring: ringOff(bz + 0.0072, 0.0013) },
      { z: bz + 0.0015, ring: ringOff(bz, 0.0014) },
      { z: bz - 0.0012, ring: ringOff(bz, 0.0004) },
      { z: bz - 0.0022, ring: ringOff(bz, -0.0022) },
    ],
    true,
    45,
  );
  const s0 = sectionAt(bz);
  const cy = (s0.yTop + s0.yBot) / 2, hh = (s0.yTop - s0.yBot) / 2;
  out.push(part(bp, m.blued));
  // heel tang over the comb
  out.push(part(shellPatch(bz, bz + 0.034, () => Math.PI / 2 - 0.42, () => Math.PI / 2 + 0.42, 0.0018, 0.0003, 8, 8), m.blued));
  const [head, slot] = screwParts(0.0036, 0.0014, 20);
  const tangScrewP = V(0, topY(bz + 0.022) + 0.0017, bz + 0.022);
  out.push(part(placeAlong(head, tangScrewP, V(0, 1, 0)), m.blued), part(placeAlong(slot, tangScrewP, V(0, 1, 0), 20), m.dark));
  const faceScrewP = V(0, cy - hh * 0.5, bz - 0.0016);
  out.push(part(placeAlong(head, faceScrewP, V(0, 0, -1)), m.blued), part(placeAlong(slot, faceScrewP, V(0, 0, -1), 70), m.dark));

  // ---- butt disc (Kolbenscheibe) inletted in the right side, with its hollow screw
  {
    const { z, y, r } = STOCK.disc;
    // built along +X with x = height above the wood, then wrapped onto the curved right side
    const onRight = (g: THREE.BufferGeometry) => {
      g.translate(0, y, z);
      warp(g, (p) => {
        p.x = -(sideX(p.z, p.y) + p.x);
      }, false);
      G.flipWinding(g);
      g.computeVertexNormals();
      return g;
    };
    const prof: V2[] = [
      [0, -0.0012],
      [r, -0.0012],
      [r, 0.0004],
      [r - 0.0009, 0.0011],
      [0.0056, 0.0011],
      [0.0052, 0.0007],
      [0, 0.0007],
    ];
    out.push(part(onRight(latheX(prof, 36, 45)), m.blued));
    // hollow centre screw with a through hole and two spanner holes
    out.push(part(onRight(latheX([[0.0021, 0.0007], [0.0048, 0.0007], [0.0048, 0.0016], [0.0036, 0.0022], [0.0021, 0.0022]], 24, 45)), m.blued));
    out.push(part(onRight(latheX([[0, 0.0012], [0.0021, 0.0012], [0.0021, 0.0017], [0, 0.0017]], 16, 45)), m.dark));
    for (const sz of [-1, 1]) {
      const h = latheX([[0, 0.0019], [0.00065, 0.0019], [0.00065, 0.0023], [0, 0.0023]], 8, 45);
      h.translate(0, 0, sz * 0.0034);
      out.push(part(onRight(h), m.dark));
    }
  }

  // ---- sling slot eyelets (both sides) with the dark opening
  {
    const { z, y, len, h } = STOCK.slot;
    const outer = stadium(z, y, len + 0.0075, h + 0.0062, 10);
    const inner = stadium(z, y, len, h, 10);
    const eye = plateZY(outer, 0.001, [inner], 0.0003);
    const opening = plateZY(inner, 0.0004, [], 0);
    const conform = (g: THREE.BufferGeometry, lift: number) =>
      warp(
        g,
        (p) => {
          p.x = sideX(p.z, p.y) + lift + p.x;
        },
        true,
      );
    const eyeL = conform(eye, 0.0002);
    const openL = conform(opening, -0.0001);
    for (const sx of [1, -1]) {
      out.push(part(eyeL, m.blued, { s: [sx, 1, 1] }));
      out.push(part(openL, m.dark, { s: [sx, 1, 1] }));
    }
  }
  return out;
}

/** The fore-end + handguard outline at z (for bands): handguard crown on top, stock below. */
export function foreEndRing(z: number, grow: number, n = 48): V2[] {
  const s = sectionAt(z);
  const f = Math.min(1, Math.max(0, (z - STOCK.hgRear) / (STOCK.hgFront - STOCK.hgRear)));
  const top = STOCK.hgTop0 + (STOCK.hgTop1 - STOCK.hgTop0) * f;
  const eH = 2.15;
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t), sn = Math.sin(t);
    let x: number, y: number;
    if (sn >= 0) {
      x = (s.hw + 0.0002) * Math.sign(c) * Math.pow(Math.abs(c), 2 / eH);
      y = s.ySplit + (top - s.ySplit) * Math.pow(sn, 2 / eH);
    } else {
      [x, y] = secPoint(s, t);
    }
    pts.push([x, y]);
  }
  // grow outward along the 2D normals
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    return [p[0] + (ty / l) * grow, p[1] - (tx / l) * grow] as V2;
  });
}
