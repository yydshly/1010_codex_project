/**
 * M1910 one-quart canteen set (US Army, 1944): kidney-shaped canteen (aluminium, or the
 * corrosion-resistant steel "M1942" version made of two halves with a horizontal seam), black
 * plastic 1943-type fluted cap with its chain, the M1910 cup with folding handle (the canteen nests
 * in the cup), and the M1910 dismounted cover: OD cotton duck lined with wool felt, side seams,
 * bound edges, two top flaps closing with lift-the-dot fasteners on the front, and the M1910
 * double-hook wire hanger on a web tab at the back.
 *
 * Display frame (all builders here): bottom on y = 0, centred on X/Z, concave (body) side towards
 * -Z, +X = one end of the kidney.
 *
 * Worn frame (buildM1910Canteen -> GearPiece, mount 'belt-rear-right'): hangs from a cartridge or
 * pistol belt by its M1910 hanger. ORIGIN = midpoint of the two belt eyelets the hooks go through
 * (hooks at x = +-0.025, y = 0); z = 0 = outer face of the belt = the back of the cover at its
 * rearmost points (the kidney ends); the hook tips reach z = -0.006 behind a 4 mm belt.
 */
import { THREE, G, part, group, smin } from '../../../core/kit';
import type { SDF } from '../../../core/geo/sdf';
import type { GearPiece } from '../../shared/contracts';
import { US, type WebShade } from './palette';
import { stitches, sheet, merge, liftTheDot, m1910Hanger, orientZ, lerp } from './parts';
import { projectedBox, drape, drapeEdge, roundedEnd, snoise, projectTo, normalAt } from './soft';

export type CanteenMetal = 'aluminium' | 'stainless';

/** Canteen and cup dimensions (m). */
export const M1910 = {
  /** Canteen: half width (X), half depth (Z), bottom edge radius, wall top, shoulder top, neck radius. */
  A: 0.0635,
  B: 0.0355,
  RB: 0.011,
  YW: 0.132,
  YS: 0.168,
  RN: 0.0136,
  /** Cap (1943 pattern, 1 inch high). */
  capY0: 0.1755,
  capY1: 0.2005,
  capR: 0.0166,
  /** Cup: height, wall clearance round the canteen. */
  cupH: 0.095,
  cupGap: 0.0024,
  /** Cover: canteen raised by cup bottom + felt + canvas; felt and canvas thickness. */
  lift: 0.0062,
  felt: 0.003,
  canvasT: 0.0016,
};
const EXP = 2.6, KID = 0.014;

/** Kidney section point: th = 0 -> +X end, pi/2 -> front (+Z), -pi/2 -> back (concave). */
function kidney(th: number, a: number, b: number, kid = 1, e = EXP): [number, number] {
  const c = Math.cos(th), s = Math.sin(th);
  const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
  let z = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
  z -= KID * kid * ((x / Math.max(a, 1e-6)) ** 2 - 0.35);
  return [x, z];
}

/** Approximate signed distance to the kidney section (a, b) in the XZ plane (gradient-normalised). */
function kidneyD(x: number, z: number, a: number, b: number): number {
  const F = (px: number, pz: number) => {
    const zz = pz + KID * ((px / a) ** 2 - 0.35);
    return Math.pow(Math.pow(Math.abs(px / a), EXP) + Math.pow(Math.abs(zz / b), EXP), 1 / EXP) - 1;
  };
  const e = 1e-4;
  const f = F(x, z);
  const gx = (F(x + e, z) - F(x - e, z)) / (2 * e), gz = (F(x, z + e) - F(x, z - e)) / (2 * e);
  return f / (Math.hypot(gx, gz) || 1);
}

interface Ring {
  y: number;
  a: number;
  b: number;
  kid: number;
  e: number;
}

/** Canteen outline rows from the bottom pole to the top of the neck. */
function canteenRows(): Ring[] {
  const { A, B, RB, YW, YS, RN } = M1910;
  const r: Ring[] = [{ y: 0, a: 0.0006, b: 0.0004, kid: 1, e: EXP }];
  for (const t of [0.4, 0.75]) r.push({ y: 0, a: (A - RB) * t, b: (B - RB) * t, kid: t, e: EXP });
  for (let i = 0; i <= 6; i++) {
    const f = (i / 6) * (Math.PI / 2);
    r.push({ y: RB * (1 - Math.cos(f)), a: A - RB + RB * Math.sin(f), b: B - RB + RB * Math.sin(f), kid: 1, e: EXP });
  }
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    const bel = 0.0011 * Math.sin(Math.PI * t);
    r.push({ y: RB + (YW - RB) * t, a: A + bel, b: B + bel, kid: 1, e: EXP });
  }
  for (let i = 1; i <= 11; i++) {
    const f = (i / 11) * (Math.PI / 2);
    const c = Math.cos(f);
    r.push({ y: YW + (YS - YW) * Math.sin(f), a: RN + (A - RN) * c, b: RN + (B - RN) * c, kid: c, e: 2 + (EXP - 2) * c });
  }
  // neck with the thread (hidden under the cap) and a lip
  for (const [y, rr] of [[YS + 0.003, RN], [0.186, RN], [0.1885, RN + 0.0008], [0.1905, RN + 0.0006], [0.1912, RN - 0.001], [0.1912, 0.0105]] as [number, number][])
    r.push({ y, a: rr, b: rr, kid: 0, e: 2 });
  return r;
}

function surfaceFromRows(rows: Ring[], nu: number, inset = 0): THREE.BufferGeometry {
  const pos: number[] = [];
  for (const rg of rows) {
    for (let i = 0; i < nu; i++) {
      const th = (i / nu) * Math.PI * 2;
      const [x, z] = kidney(th, Math.max(1e-4, rg.a - inset), Math.max(1e-4, rg.b - inset), rg.kid, rg.e);
      pos.push(x, rg.y, z);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < rows.length - 1; j++)
    for (let i = 0; i < nu; i++) {
      const i1 = (i + 1) % nu;
      const a = j * nu + i, b = j * nu + i1, c = (j + 1) * nu + i1, d = (j + 1) * nu + i;
      idx.push(a, d, c, a, c, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function metal(m: CanteenMetal) {
  return m === 'stainless' ? US.stainless() : US.aluminium();
}

/** Black plastic 1943-pattern cap: fluted sides, recessed top with the chain rivet. */
function capGeometry(): THREE.BufferGeometry {
  const { capY0: y0, capY1: y1, capR: R } = M1910;
  const NU = 60, FL = 20;
  const prof: [number, number][] = [
    [R - 0.0012, y0],
    [R, y0 + 0.0012],
    [R, y1 - 0.0022],
    [R - 0.0006, y1 - 0.0006],
    [R - 0.0018, y1],
    [0.0128, y1],
    [0.0121, y1 - 0.0016],
    [0.0, y1 - 0.0016],
  ];
  const pos: number[] = [];
  for (const [r, y] of prof)
    for (let i = 0; i < NU; i++) {
      const a = (i / NU) * Math.PI * 2;
      const flute = r >= R - 0.0007 && y > y0 + 0.001 && y < y1 - 0.001 ? -0.00055 * (0.5 + 0.5 * Math.cos(a * FL)) : 0;
      const rr = r + flute;
      pos.push(rr * Math.cos(a), y, rr * Math.sin(a));
    }
  const idx: number[] = [];
  for (let j = 0; j < prof.length - 1; j++)
    for (let i = 0; i < NU; i++) {
      const i1 = (i + 1) % NU;
      const a = j * NU + i, b = j * NU + i1, c = (j + 1) * NU + i1, d = (j + 1) * NU + i;
      idx.push(a, c, d, a, b, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const out = G.crease(g, 40);
  G.ensureOutward(out);
  // chain rivet on the recessed top
  const rivet = G.lathe([[0, 0.0014], [0.0012, 0.0012], [0.0022, 0.0005], [0.0024, 0]], 14, 50);
  rivet.translate(0, y1 - 0.0016, 0);
  return merge([out, rivet]);
}

/** Link chain from the cap rivet, over the cap edge, down to the ring round the neck. */
function chainGeometry(): THREE.BufferGeometry {
  const { capY1: y1, capR: R, YS, RN } = M1910;
  const ang = Math.PI * 0.85; // leaves the cap towards -X, slightly to the front
  const d = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
  const pts = [
    new THREE.Vector3(0, y1 - 0.0004, 0),
    d.clone().multiplyScalar(R * 0.55).setY(y1 + 0.0016),
    d.clone().multiplyScalar(R + 0.0012).setY(y1 - 0.0008),
    d.clone().multiplyScalar(R + 0.0035).setY(y1 - 0.009),
    d.clone().multiplyScalar(R + 0.0048).setY(M1910.capY0 - 0.0035),
    d.clone().multiplyScalar(RN + 0.0034).setY(YS + 0.0052),
  ];
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const L = c.getLength();
  const step = 0.0034;
  const n = Math.floor(L / step);
  const links: THREE.BufferGeometry[] = [];
  const link = G.torus(0.0016, 0.00042, 4, 8);
  link.scale(1, 1.45, 1);
  for (let i = 0; i <= n; i++) {
    const t = Math.min(1, (i * step) / L);
    const p = c.getPointAt(t), tg = c.getTangentAt(t).normalize();
    const side = new THREE.Vector3(0, 1, 0).cross(tg);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    // alternate links turned 90 degrees about the chain direction
    const X = i % 2 ? side : tg.clone().cross(side).normalize();
    const Z = X.clone().cross(tg).normalize();
    const m = new THREE.Matrix4().makeBasis(X, tg, Z).setPosition(p);
    links.push(link.clone().applyMatrix4(m));
  }
  // collar ring round the neck
  const ring = G.torus(RN + 0.0009, 0.0007, 5, 36);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, YS + 0.0048, 0);
  links.push(ring);
  return merge(links);
}

/** The canteen with cap and chain (display frame). `from` = lowest row height to build (hidden parts skipped). */
export function buildCanteenBody(m: CanteenMetal = 'aluminium', from = 0, nu = 64): THREE.Group {
  const rows = canteenRows().filter((r, i, all) => r.y >= from || (i + 1 < all.length && all[i + 1].y >= from));
  const body = surfaceFromRows(rows, nu);
  const g = G.crease(body, 50);
  G.ensureOutward(g);
  const parts: THREE.Object3D[] = [part(g, metal(m), { name: 'canteen' })];
  const seams: THREE.BufferGeometry[] = [];
  if (m === 'stainless') {
    // two stamped halves joined by a soldered horizontal seam
    const y = 0.074;
    if (y >= from) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 64; i++) {
        const [x, z] = kidney((i / 64) * Math.PI * 2, M1910.A + 0.0012, M1910.B + 0.0012);
        pts.push(new THREE.Vector3(x, y, z));
      }
      seams.push(G.tube(pts, 0.0011, 5, 96, true));
    }
  } else if (from < 0.02) {
    // welded seam round the ends and bottom where the two drawn halves are joined
    for (const sx of [1, -1]) {
      const pts: THREE.Vector3[] = [];
      for (const y of [0.0125, 0.04, 0.08, 0.12, M1910.YW + 0.006]) pts.push(new THREE.Vector3(sx * (M1910.A + 0.0008 + 0.0011 * Math.sin((Math.PI * y) / M1910.YW)), y, -KID * 0.65));
      seams.push(G.tube(pts, 0.0008, 5, 30));
    }
  }
  if (seams.length) parts.push(part(merge(seams), metal(m)));
  parts.push(part(capGeometry(), US.blackPlastic(), { name: 'cap' }));
  parts.push(part(chainGeometry(), US.wire(), { name: 'chain' }));
  return group(parts);
}

/** M1910 cup (display frame, bottom on y = 0). handle 'open' (horizontal, +X end) or 'folded' (down the end wall). */
export function buildCanteenCup(m: CanteenMetal = 'aluminium', handle: 'open' | 'folded' = 'open'): THREE.Group {
  const { A, B, cupH: H, cupGap } = M1910;
  const t = 0.0009, RB = 0.008;
  const ai = A + cupGap, bi = B + cupGap, ao = ai + t, bo = bi + t;
  const rows: Ring[] = [];
  const outer = (a: number, b: number, rb: number, top: number, inward: boolean): Ring[] => {
    const rr: Ring[] = [];
    rr.push({ y: inward ? t : 0, a: 0.0006, b: 0.0004, kid: 1, e: EXP });
    rr.push({ y: inward ? t : 0, a: (a - rb) * 0.6, b: (b - rb) * 0.6, kid: 0.6, e: EXP });
    for (let i = 0; i <= 4; i++) {
      const f = (i / 4) * (Math.PI / 2);
      rr.push({ y: (inward ? t : 0) + rb * (1 - Math.cos(f)), a: a - rb + rb * Math.sin(f), b: b - rb + rb * Math.sin(f), kid: 1, e: EXP });
    }
    for (const f of [0.4, 0.8, 1]) rr.push({ y: rb + (top - rb) * f, a: a + 0.0015 * f, b: b + 0.0015 * f, kid: 1, e: EXP });
    return rr;
  };
  rows.push(...outer(ao, bo, RB, H - 0.002, false));
  // rolled rim bead
  for (let k = 1; k <= 5; k++) {
    const f = (k / 6) * Math.PI;
    const cx = 0.0015 + 0.0006; // bead centre outset (towards the outside)
    rows.push({ y: H - 0.0012 + 0.0012 * Math.sin(f), a: ai + 0.0015 + cx - 0.0014 * Math.cos(f), b: bi + 0.0015 + cx - 0.0014 * Math.cos(f), kid: 1, e: EXP });
  }
  rows.push(...outer(ai, bi, RB - t, H - 0.002, true).reverse());
  const pos: number[] = [];
  const NU = 48;
  for (const rg of rows)
    for (let i = 0; i < NU; i++) {
      const [x, z] = kidney((i / NU) * Math.PI * 2, rg.a, rg.b, rg.kid, rg.e);
      pos.push(x, rg.y, z);
    }
  const idx: number[] = [];
  for (let j = 0; j < rows.length - 1; j++)
    for (let i = 0; i < NU; i++) {
      const i1 = (i + 1) % NU;
      const a = j * NU + i, b = j * NU + i1, c = (j + 1) * NU + i1, d = (j + 1) * NU + i;
      idx.push(a, d, c, a, c, b);
    }
  const g0 = new THREE.BufferGeometry();
  g0.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g0.setIndex(idx);
  const cup = G.crease(g0, 55);
  // outer wall normals must face outwards: check a mid-wall vertex on +X
  {
    const na = cup.attributes.normal as THREE.BufferAttribute, pa = cup.attributes.position as THREE.BufferAttribute;
    let score = 0;
    for (let i = 0; i < pa.count; i += 7) {
      const p = new THREE.Vector3().fromBufferAttribute(pa, i);
      if (p.y < 0.03 || p.y > 0.08) continue;
      // outer wall vertices have radius > inner; compare with the section at that height
      const n = new THREE.Vector3().fromBufferAttribute(na, i);
      const outerSide = Math.abs(p.x) > ai + t * 0.5 || Math.abs(p.z) > bi + t * 0.5 ? 1 : -1;
      score += Math.sign(n.x * p.x + n.z * p.z) * outerSide;
    }
    if (score < 0) {
      G.flipWinding(cup);
      const arr = na.array as Float32Array;
      for (let i = 0; i < arr.length; i++) arr[i] = -arr[i];
    }
  }
  const mat = metal(m);
  const parts: THREE.Object3D[] = [part(cup, mat, { name: 'cup' })];
  // handle bracket riveted to the +X end below the rim; hinge; folding handle with two slots
  const xe = ao + 0.0016;
  const yb = H - 0.016;
  const bracket = G.rbox(0.0022, 0.03, 0.026, 0.0008, 1);
  bracket.translate(xe - 0.0006, yb, 0);
  const rivets = [
    [yb + 0.01, 0.008],
    [yb + 0.01, -0.008],
    [yb - 0.01, 0.008],
    [yb - 0.01, -0.008],
  ].map(([y, z]) => G.lathe([[0, 0.0011], [0.0015, 0.0008], [0.0019, 0]], 10, 50).rotateZ(-Math.PI / 2).translate(xe + 0.0005, y, z));
  const hinge = G.rod([xe + 0.004, yb + 0.012, -0.0105], [xe + 0.004, yb + 0.012, 0.0105], 0.0018, 10);
  const lugs = [-0.009, 0.009].map((z) => G.rbox(0.006, 0.006, 0.0018, 0.0008, 1).translate(xe + 0.0025, yb + 0.011, z));
  // handle plate: outline in the handle's local XZ (x along the handle), two slots
  const HL = 0.112, HW0 = 0.0118, HW1 = 0.0098;
  const outline: G.V2[] = [];
  for (let i = 0; i <= 8; i++) {
    const x = (i / 8) * (HL - HW1);
    outline.push([x, -lerp(HW0, HW1, i / 8)]);
  }
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI;
    outline.push([HL - HW1 + Math.cos(a) * HW1, Math.sin(a) * HW1]);
  }
  for (let i = 8; i >= 0; i--) {
    const x = (i / 8) * (HL - HW1);
    outline.push([x, lerp(HW0, HW1, i / 8)]);
  }
  const slot = (x0: number, x1: number, w: number): G.V2[] => {
    const pts: G.V2[] = [];
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI / 2 + (i / 6) * Math.PI;
      pts.push([x0 + Math.cos(a) * w, Math.sin(a) * w]);
    }
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * Math.PI;
      pts.push([x1 + Math.cos(a) * w, Math.sin(a) * w]);
    }
    return pts;
  };
  const sh = G.shape(outline, 0, [slot(0.034, 0.05, 0.0028), slot(0.066, 0.082, 0.0028)]);
  const plate = G.extrude(sh, 0.0014, 0.0005, 6, 1);
  plate.rotateX(-Math.PI / 2); // XY outline -> XZ plane (y up = thickness)
  // turned-down side flanges (stiffening)
  const fl = [-1, 1].map((s) => {
    const f = G.rbox(HL - 0.03, 0.0045, 0.0011, 0.0004, 1);
    f.translate((HL - 0.03) / 2 + 0.006, -0.0022, s * (HW0 - 0.0012));
    return f;
  });
  const handleGeo = merge([plate, ...fl]);
  if (handle === 'open') handleGeo.translate(xe + 0.004, yb + 0.012, 0);
  else {
    handleGeo.rotateZ(-Math.PI / 2 - 0.02);
    handleGeo.translate(xe + 0.0055, yb + 0.012, 0);
  }
  parts.push(part(merge([bracket, ...rivets, hinge, ...lugs]), mat), part(handleGeo, mat, { name: 'handle' }));
  return group(parts);
}

// ---------------------------------------------------------------------------------------------
// Cover
// ---------------------------------------------------------------------------------------------

export interface CoverOptions {
  shade?: WebShade;
  metal?: CanteenMetal;
  /** Include the M1910 wire hanger through the back tab (default true). */
  hanger?: boolean;
}

/** M1910 hanger: drop from the eyelets (hooks) to the U bottom. */
const HANGER_DROP = 0.04;

/** Cover body dims: outside of the canvas round the cup + felt. */
function coverDims() {
  const { A, B, cupGap, felt, canvasT } = M1910;
  const a = A + cupGap + 0.001 + 0.0015 + felt + canvasT; // cup outer + rim bead + felt + canvas
  const b = B + cupGap + 0.001 + 0.0015 + felt + canvasT;
  return { a, b, top: 0.143, rb: 0.012 };
}

/** The cover with the canteen inside (display frame). Returns the group and the hanger tab top. */
export function buildCanteenCover(o: CoverOptions = {}): { object: THREE.Group; backZ: number; tabTop: THREE.Vector3; hooks: THREE.Vector3 } {
  const shade = o.shade ?? 'od7';
  const canvas = US.canvas(shade), tape = US.tape(shade), thread = US.thread(), felt = US.felt();
  const { a, b, top, rb } = coverDims();
  const parts: THREE.Object3D[] = [];
  const lift = M1910.lift;
  const { A, B, YW, YS, RN } = M1910;
  const off = M1910.felt + M1910.canvasT + 0.0004;
  // body SDF: kidney extrusion with a rounded bottom edge, closed over the canteen shoulder
  const ext: SDF = (x, y, z) => {
    const d2 = kidneyD(x, z, a, b);
    const yc = -(y - rb);
    if (y > rb) return y > top ? Math.max(d2, y - top) : d2;
    const qx = d2 + rb, qy = yc;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rb;
  };
  const dome: SDF = (x, y, z) => {
    const yy = y - lift;
    const f = Math.min(1, Math.max(0, (yy - YW) / (YS - YW)));
    const c = Math.sqrt(Math.max(0, 1 - f * f));
    const aa = RN + (A - RN) * c + off, bb = RN + (B - RN) * c + off;
    return Math.max(kidneyD(x, z, aa, bb), yy - (YS + off), YW - 0.03 - yy) * 0.8;
  };
  const body: SDF = (x, y, z) => {
    const d = smin(ext(x, y, z), dome(x, y, z), 0.012);
    return d + 0.0005 * snoise(x * 30, y * 22, z * 30, 7) + 0.00025 * snoise(x * 80, y * 60, z * 80, 3);
  };
  const H = lift + YS + off;
  parts.push(part(projectedBox(body, { centre: [0, H * 0.5, 0], half: [a, H * 0.5, b], n: [16, 18, 8], edge: 0.6 }), canvas, { name: 'cover' }));
  // canteen neck, cap and chain above the cover
  const can = buildCanteenBody(o.metal ?? 'aluminium', 0.162, 36);
  can.position.y = lift;
  parts.push(can);
  // felt collar where the neck leaves the cover
  const fc = G.torus(RN + 0.0022, 0.0018, 5, 28);
  fc.rotateX(Math.PI / 2);
  fc.translate(0, H - 0.0006, 0);
  parts.push(part(fc, felt));
  // side seams (bound) up the kidney ends
  for (const sx of [1, -1]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 8; i++) {
      const y = 0.012 + ((top + 0.012 - 0.012) * i) / 8;
      pts.push(projectTo(body, new THREE.Vector3(sx * (a + 0.004), y, -KID * 0.6), 0.0008));
    }
    parts.push(part(G.tube(pts, 0.0019, 4, 20), tape));
  }

  // two flaps hinged at the back, over the top, fastened on the front with lift-the-dots
  const zSec = (x: number, sgn: number) => sgn * b * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x / a), EXP)), 1 / EXP) - KID * ((x / a) ** 2 - 0.35);
  const HW = 0.0262;
  for (const sx of [1, -1]) {
    const x0 = sx * 0.0405;
    const zb = zSec(x0, -1), zf = zSec(x0, 1);
    const dr = drape(body, {
      path: [
        [top - 0.026, zb - 0.002],
        [top - 0.004, zb - 0.002],
        [top + 0.012, zb * 0.9],
        [H - 0.006, zb * 0.45],
        [H + 0.001, 0],
        [H - 0.006, zf * 0.45],
        [top + 0.012, zf * 0.9],
        [top - 0.004, zf + 0.002],
        [top - 0.036, zf + 0.002],
      ],
      x0,
      halfWidth: roundedEnd(HW, 0.011),
      gap: 0.0005,
      t: 0.0034,
      nu: 8,
      nv: 36,
      lift: (u, s) => 0.0005 * (1 + snoise(u * 2, s * 40, 1.7, sx > 0 ? 3 : 5)),
    });
    parts.push(part(dr.geometry, canvas));
    // bound edges: tape round the sides and the free end
    const per = drapeEdge(dr, HW, 0.011, 0.004, -0.0017, 0.0009, 18);
    parts.push(part(sheet(per, per.map((q) => normalAt(body, q)), 0.0029, 0.0046, { across: 2, samples: 110 }), tape));
    // stitch rows inside the binding (front part only, where it is seen)
    const sFront = dr.sAtY(top + 0.006);
    const sp: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) sp.push(dr.at(-(HW - 0.0045), sFront + ((dr.L - 0.015 - sFront) * i) / 10, 0.00015));
    for (let i = 1; i < 6; i++) sp.push(dr.at(-(HW - 0.0045) + ((2 * (HW - 0.0045)) * i) / 6, dr.L - 0.0105, 0.00015));
    for (let i = 10; i >= 0; i--) sp.push(dr.at(HW - 0.0045, sFront + ((dr.L - 0.015 - sFront) * i) / 10, 0.00015));
    parts.push(part(stitches(sp, { len: 0.003, gap: 0.0019, r: 0.0005 }), thread));
    // lift-the-dot: socket near the flap end, over the stud on the front panel
    const lp = dr.at(0, dr.L - 0.0135, 0.0001);
    parts.push(part(orientZ(liftTheDot(), lp, normalAt(body, lp)), US.blackMetal()));
  }
  // hanger tab: web loop sewn to the back panel at the top centre, with a reinforcement patch
  const zb0 = projectTo(body, new THREE.Vector3(0, top - 0.02, -b), 0).z;
  const tabTop = new THREE.Vector3(0, top + 0.02, zb0 - 0.0045);
  const tabPts = [
    new THREE.Vector3(0, top - 0.036, zb0 - 0.0021),
    new THREE.Vector3(0, top - 0.004, zb0 - 0.0021),
    new THREE.Vector3(0, top + 0.014, zb0 - 0.0028),
    tabTop.clone().add(new THREE.Vector3(0, 0.0035, 0.0012)),
    tabTop.clone().add(new THREE.Vector3(0, 0.0036, -0.0022)),
    new THREE.Vector3(0, top + 0.008, zb0 - 0.0062),
    new THREE.Vector3(0, top - 0.012, zb0 - 0.0045),
  ];
  const tabN = [
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0.2, -1),
    new THREE.Vector3(0, 1, 0.2),
    new THREE.Vector3(0, 0.6, -1),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0, -1),
  ].map((v) => v.normalize());
  parts.push(part(sheet(tabPts, tabN, 0.0125, 0.0022, { across: 3, samples: 36 }), US.web(shade)));
  const patch = G.rbox(0.05, 0.036, 0.0016, 0.0008, 1);
  patch.translate(0, top - 0.02, zb0 - 0.0006);
  parts.push(part(patch, canvas));
  const zs = zb0 - 0.0034;
  parts.push(part(stitches([[-0.0105, top - 0.032, zs], [0.0105, top - 0.032, zs], [0.0105, top - 0.008, zs], [-0.0105, top - 0.008, zs], [-0.0105, top - 0.032, zs]], { len: 0.0028, gap: 0.0017, r: 0.00048 }), thread));
  // M1910 hanger standing up out of the tab loop; `hooks` = eyelet midpoint (worn-frame origin)
  const hooks = new THREE.Vector3(0, tabTop.y + 0.0012 + HANGER_DROP, tabTop.z - 0.0005 - 0.0021);
  if (o.hanger !== false) {
    const hg = m1910Hanger({ spacing: 0.05, drop: HANGER_DROP, r: 0.0015 });
    hg.translate(hooks.x, hooks.y, hooks.z);
    parts.push(part(hg, US.wire(), { name: 'hanger' }));
  }
  return { object: group(parts), backZ: -b - KID * 0.65, tabTop, hooks };
}

export interface M1910CanteenOptions extends CoverOptions {
  /** Include the M1910 wire hanger (default true). */
  hanger?: boolean;
}

/** The canteen in its cover, worn frame (hangs from the belt by the M1910 hanger). */
export function buildM1910Canteen(o: M1910CanteenOptions = {}): GearPiece {
  const cov = buildCanteenCover(o);
  const inner = cov.object;
  // worn frame: hooks' eyelet midpoint at the origin, hanger legs just in front of the belt face
  inner.position.set(-cov.hooks.x, -cov.hooks.y, -cov.hooks.z);
  const parts: THREE.Object3D[] = [inner];
  const object = group(parts);
  object.name = 'us-m1910-canteen';
  const b2 = new THREE.Box3().setFromObject(object, true);
  const size = b2.getSize(new THREE.Vector3());
  return {
    id: 'us-m1910-canteen',
    name: 'M1910 canteen in cover',
    object,
    mount: 'belt-rear-right',
    size: { w: size.x, h: size.y, d: size.z },
  };
}

