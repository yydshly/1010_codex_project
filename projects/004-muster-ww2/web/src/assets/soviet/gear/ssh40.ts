/**
 * SSh-40 steel helmet (Soviet Union, adopted 1940): one-piece pressed steel shell with a
 * short flared rim, liner of three oilcloth pads riveted to the shell by six rivets near the
 * lower edge (the external recognition feature vs. the three high rivets of the SSh-39),
 * pads joined by a cotton drawstring, cloth chinstrap on side D-rings with a slip buckle.
 *
 * Helmet-local frame: origin = centre of the head opening in the plane of the liner rivets
 * (the "liner band" plane), +Z = forward (brow), +Y = up, +X = wearer's left.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { SU } from './palette';
import { wireFrame, smoothstep, stitches } from './helpers';

/** Meridian profile of the outer shell, [radius across X, y], crown to rim edge. */
const PROFILE: [number, number][] = [
  [0.0, 0.136],
  [0.03, 0.1336],
  [0.058, 0.1247],
  [0.08, 0.1085],
  [0.096, 0.0865],
  [0.1065, 0.0585],
  [0.1115, 0.031],
  [0.1134, 0.006],
  [0.1142, -0.011],
  [0.1162, -0.0205],
  [0.1203, -0.0262],
  [0.1245, -0.029],
];
/** Front-back elongation of the shell plan (length / width). */
const KZ = 1.09;
const T = 0.0013; // shell steel thickness (slightly over the ~1.2 mm real plate so the edge reads)
const OUT_ROWS = 38, IN_ROWS = 22, EDGE_ROWS = 5, U = 72;
/** Profile parameter where the flare begins (point 8 of 11 segments). */
const T_FLARE = 8 / (PROFILE.length - 1);

const profCurve = new THREE.CatmullRomCurve3(PROFILE.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal');

/** Outer-shell point for azimuth u (0 = front, +90deg = left/+X) and profile parameter t. */
function outer(u: number, t: number, out = new THREE.Vector3()): THREE.Vector3 {
  const p = profCurve.getPoint(Math.min(1, Math.max(0, t)));
  const cf = Math.max(0, Math.cos(u));
  const wv = smoothstep(T_FLARE - 0.12, 1, t);
  const r = p.x + 0.0035 * cf * cf * smoothstep(T_FLARE, 1, t);
  const y = p.y + 0.0045 * cf * cf * cf * wv; // slight visor rise at the front
  return out.set(r * Math.sin(u), y, r * KZ * Math.cos(u));
}

function outerFrame(u: number, t: number) {
  const e = 1e-4;
  const p = outer(u, t);
  const du = outer(u + e, t).sub(outer(u - e, t));
  const dt = outer(u, Math.min(1, t + e)).sub(outer(u, Math.max(0, t - e)));
  const n = new THREE.Vector3().crossVectors(du, dt).normalize();
  // make n point away from the helmet interior
  const c = new THREE.Vector3(0, 0.02, 0);
  if (n.dot(p.clone().sub(c)) < 0) n.negate();
  if (t < 1e-3) n.set(0, 1, 0);
  return { p, n, dt: dt.normalize() };
}

/** Inner-shell point (outer offset inwards by the plate thickness). */
function inner(u: number, t: number) {
  const f = outerFrame(u, t);
  return { p: f.p.clone().addScaledVector(f.n, -T), n: f.n.clone().negate() };
}

/** Parameter t where the outer profile crosses height y (search on the side profile). */
function tAtY(y: number): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (profCurve.getPoint(m).y > y) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

function shellGeometry(): THREE.BufferGeometry {
  const rows: { p: THREE.Vector3; n: THREE.Vector3 }[][] = [];
  const us = Array.from({ length: U }, (_, j) => (j / U) * Math.PI * 2);
  const tOut = (i: number) => {
    const s = i / OUT_ROWS;
    return s; // CatmullRom parameter is already denser where control points cluster (flare)
  };
  for (let i = 0; i <= OUT_ROWS; i++) {
    const t = Math.max(tOut(i), 0.0005);
    rows.push(us.map((u) => {
      const f = outerFrame(u, t);
      return { p: f.p, n: f.n };
    }));
  }
  // rounded edge
  for (let k = 1; k < EDGE_ROWS; k++) {
    const a = (k / EDGE_ROWS) * Math.PI;
    rows.push(us.map((u) => {
      const f = outerFrame(u, 1);
      const c = f.p.clone().addScaledVector(f.n, -T / 2);
      const n = f.n.clone().multiplyScalar(Math.cos(a)).addScaledVector(f.dt, Math.sin(a)).normalize();
      return { p: c.addScaledVector(n, T / 2), n };
    }));
  }
  for (let i = IN_ROWS; i >= 0; i--) {
    const s = i / IN_ROWS;
    const t = Math.max(s, 0.0005);
    rows.push(us.map((u) => inner(u, t)));
  }
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  for (const row of rows) for (const v of row) {
    pos.push(v.p.x, v.p.y, v.p.z);
    nrm.push(v.n.x, v.n.y, v.n.z);
  }
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 0; j < U; j++) {
      const a = i * U + j, b = i * U + ((j + 1) % U), c = (i + 1) * U + j, d = (i + 1) * U + ((j + 1) % U);
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  // orient winding to agree with the supplied normals (check a side face of the outer surface)
  const i0 = (Math.floor(OUT_ROWS / 2) * U + 3) * 6;
  const A = new THREE.Vector3().fromArray(pos, idx[i0] * 3), B = new THREE.Vector3().fromArray(pos, idx[i0 + 1] * 3), C = new THREE.Vector3().fromArray(pos, idx[i0 + 2] * 3);
  const fn = B.clone().sub(A).cross(C.clone().sub(A));
  const vn = new THREE.Vector3().fromArray(nrm, idx[i0] * 3);
  if (fn.dot(vn) < 0) G.flipWinding(g);
  return g;
}

export type ChinstrapMode = 'open' | 'none' | 'laid';

export interface SSh40Options {
  /**
   * 'open'  - both chinstrap halves hang loose from the side D-rings (worn, strap undone);
   * 'none'  - no chinstrap (D-rings and tabs only; the infantry author may draw a worn strap
   *           with `buildSSh40Chinstrap`);
   * 'laid'  - display pose: halves run down to the rim plane and lie flat out under the visor.
   */
  chinstrap?: ChinstrapMode;
}

/** Fit data for the infantry modules (helmet-local metres). */
export const SSH40_FIT = {
  /** Lowest point of the rim (sides/back), relative to the band plane. */
  rimY: -0.029,
  /** Front rim edge height (visor). */
  frontRimY: -0.0245,
  /** Inside of the crown (bare steel) and the lowest pad surface under the crown. */
  innerCrownY: 0.1347,
  padCrownY: 0.118,
  /** Usable opening at the band plane between the pads (w along X, l along Z). */
  opening: { w: 0.182, l: 0.205 },
  /** Chinstrap D-ring centres (wearer's left +X, right -X). */
  dRings: [new THREE.Vector3(0.1062, -0.013, 0), new THREE.Vector3(-0.1062, -0.013, 0)],
  /** Suggested: head brow line at y = frontRimY - 0.004, head crown ~0.015 below padCrownY. */
};

const RIVET_US = [30, 90, 150, 210, 270, 330].map((d) => (d * Math.PI) / 180);

function chinstrapHalf(points: THREE.Vector3[], normals: THREE.Vector3 | THREE.Vector3[]): THREE.BufferGeometry {
  return G.strap(points, 0.017, 0.0017, normals, { samples: Math.max(24, points.length * 8) });
}

/**
 * A worn chinstrap along a caller-supplied path (helmet-local), e.g. from the left D-ring,
 * under the chin, to the right D-ring. `outward` = strap face direction at each point (away
 * from the skin). A slip buckle is placed at `buckleAt` (0..1 along the path).
 */
export function buildSSh40Chinstrap(path: THREE.Vector3[], outward: THREE.Vector3[], buckleAt = 0.7): THREE.Group {
  const strap = chinstrapHalf(path, outward);
  const c = new THREE.CatmullRomCurve3(path, false, 'centripetal');
  const cn = new THREE.CatmullRomCurve3(outward, false, 'centripetal');
  const p = c.getPointAt(buckleAt), tg = c.getTangentAt(buckleAt), n = cn.getPointAt(buckleAt).normalize();
  const m = new THREE.Matrix4().makeBasis(tg.clone().cross(n).normalize(), tg, n).setPosition(p.addScaledVector(n, 0.0012));
  const b = wireFrame(0.024, 0.02, 0.0011, 0.003);
  b.rotateZ(Math.PI / 2);
  b.applyMatrix4(m);
  return group([part(strap, SU.webbing()), part(b, SU.darkSteel())]);
}

export function buildSSh40Helmet(opts: SSh40Options = {}): GearPiece {
  const mode = opts.chinstrap ?? 'open';
  const paint = SU.helmetPaint();
  const liner = SU.linerOilcloth();
  const parts: THREE.Object3D[] = [part(shellGeometry(), paint, { name: 'shell' })];

  // --- six liner rivets near the lower edge (outer domed heads + inner washers)
  const tBand = tAtY(0);
  const rivetOut: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  const rivetIn: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (const u of RIVET_US) {
    const f = outerFrame(u, tBand);
    rivetOut.push({ p: f.p.clone().addScaledVector(f.n, -0.0002), n: f.n });
    const ii = inner(u, tBand);
    rivetIn.push({ p: ii.p.clone().addScaledVector(ii.n, 0.0019), n: ii.n });
  }
  parts.push(part(G.scatter(G.rivetHead(0.0043), rivetOut), paint));

  // --- liner band: oilcloth strip around the inside at rivet level
  const bandPts: THREE.Vector3[] = [], bandN: THREE.Vector3[] = [];
  for (let k = 0; k < 72; k++) {
    const u = (k / 72) * Math.PI * 2;
    const ii = inner(u, tBand);
    bandPts.push(ii.p.clone().addScaledVector(ii.n, 0.0014));
    bandN.push(ii.n.clone());
  }
  parts.push(part(G.strap(bandPts, 0.021, 0.0012, bandN, { closed: true, smooth: false }), liner));
  parts.push(part(G.scatter(G.cyl(0.0036, 0.0036, 0.0008, 12), rivetIn), SU.fuzeSteel()));

  // --- three liner pads (pillow-shaped), hanging from the band up towards the crown
  const tTop = 0.15;
  const padGeos: THREE.BufferGeometry[] = [];
  const tipPts: THREE.Vector3[] = [];
  for (const uc of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
    const NA = 14, NB = 16;
    const back: THREE.Vector3[][] = [], front: THREE.Vector3[][] = [];
    for (let b = 0; b <= NB; b++) {
      const sb = b / NB;
      const t = tBand + 0.035 + (tTop - tBand - 0.035) * sb;
      const hw = THREE.MathUtils.lerp(0.86, 0.5, Math.pow(sb, 1.3)) * (sb > 0.8 ? Math.sqrt(Math.max(0.05, 1 - ((sb - 0.8) / 0.2) ** 2)) : 1);
      const rb: THREE.Vector3[] = [], rf: THREE.Vector3[] = [];
      for (let a = 0; a <= NA; a++) {
        const sa = a / NA;
        const u = uc + (sa - 0.5) * 2 * hw;
        const ii = inner(u, t);
        const base = ii.p.clone().addScaledVector(ii.n, 0.0026);
        const th = 0.0105 * Math.pow(Math.sin(Math.PI * sa), 0.55) * Math.pow(Math.sin(Math.PI * sb), 0.5);
        // quilting: two shallow stitched channels across the pad
        const q = 1 - 0.25 * Math.exp(-(((sb - 0.38) / 0.035) ** 2)) - 0.25 * Math.exp(-(((sb - 0.68) / 0.035) ** 2));
        rb.push(base.clone().addScaledVector(ii.n, 0.0004));
        rf.push(base.clone().addScaledVector(ii.n, 0.0004 + th * q));
      }
      back.push(rb);
      front.push(rf);
      if (b === NB - 1) tipPts.push(rf[NA >> 1].clone());
    }
    const pos: number[] = [], idx: number[] = [];
    const W = NA + 1;
    for (const r of front) for (const v of r) pos.push(v.x, v.y, v.z);
    for (const r of back) for (const v of r) pos.push(v.x, v.y, v.z);
    const off = (NB + 1) * W;
    for (let b = 0; b < NB; b++) for (let a = 0; a < NA; a++) {
      const i0 = b * W + a, i1 = i0 + 1, i2 = i0 + W, i3 = i2 + 1;
      idx.push(i0, i1, i2, i1, i3, i2);
      idx.push(off + i0, off + i2, off + i1, off + i1, off + i2, off + i3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // front surface must face the head (towards the helmet axis); fix if needed
    const mid = (NB >> 1) * W + (NA >> 1);
    const nv = new THREE.Vector3().fromBufferAttribute(g.attributes.normal as THREE.BufferAttribute, mid);
    const pv = new THREE.Vector3().fromArray(pos, mid * 3);
    if (nv.dot(new THREE.Vector3(-pv.x, 0, -pv.z)) < 0) {
      G.flipWinding(g);
      g.computeVertexNormals();
    }
    padGeos.push(g);
  }
  parts.push(part(G.mergeGeometries(padGeos.map((g) => g.toNonIndexed()))!, liner));

  // --- drawstring through the pad tips, tied in a small bow at the back
  const ring: THREE.Vector3[] = [];
  let back = new THREE.Vector3();
  for (let k = 0; k < 3; k++) {
    const A = tipPts[k], B = tipPts[(k + 1) % 3];
    for (let i = 0; i < 6; i++) {
      const f = i / 6;
      const p = A.clone().lerp(B, f);
      const lift = Math.sin(Math.PI * f);
      p.y += 0.004 * lift;
      p.x *= 1 + 0.12 * lift;
      p.z *= 1 + 0.12 * lift;
      ring.push(p);
      if (k === 1 && i === 3) back = p.clone();
    }
  }
  const cord = SU.cord();
  parts.push(part(G.tube(ring, 0.0011, 6, 96, true), cord));
  const bow = [
    G.tube([back, back.clone().add(new THREE.Vector3(0.008, -0.004, 0.004)), back.clone().add(new THREE.Vector3(0.012, -0.001, 0.006)), back.clone().add(new THREE.Vector3(0.004, 0.0015, 0.003)), back], 0.0009, 5, 24),
    G.tube([back, back.clone().add(new THREE.Vector3(-0.008, -0.004, 0.004)), back.clone().add(new THREE.Vector3(-0.012, -0.001, 0.006)), back.clone().add(new THREE.Vector3(-0.004, 0.0015, 0.003)), back], 0.0009, 5, 24),
    G.tube([back, back.clone().add(new THREE.Vector3(0.004, -0.014, 0.006)), back.clone().add(new THREE.Vector3(0.006, -0.024, 0.009))], 0.0009, 5, 16),
    G.tube([back, back.clone().add(new THREE.Vector3(-0.003, -0.013, 0.006)), back.clone().add(new THREE.Vector3(-0.004, -0.021, 0.01))], 0.0009, 5, 16),
  ];
  parts.push(part(G.mergeGeometries(bow.map((g) => g.toNonIndexed()))!, cord));

  // --- chinstrap D-rings on webbing tabs at the side rivets
  const steel = SU.darkSteel();
  const web = SU.webbing();
  for (const side of [1, -1]) {
    const u = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    const ii = inner(u, tBand);
    const x = ii.p.x + side * -0.0048; // just inside the band
    const tabPts = [
      new THREE.Vector3(x + side * 0.0012, 0.006, 0),
      new THREE.Vector3(x, -0.004, 0),
      new THREE.Vector3(x - side * 0.0006, -0.0085, 0),
    ];
    parts.push(part(G.strap(tabPts, 0.015, 0.0014, new THREE.Vector3(-side, 0, 0), { samples: 8 }), web));
    // D-ring: straight bar held in the tab + half ring below, in the plane tangent to the shell
    const dr = new THREE.Group();
    dr.add(part(G.rod([0, 0, -0.0085], [0, 0, 0.0085], 0.0011, 8), steel));
    const arc = G.torus(0.0085, 0.0011, 6, 16, Math.PI);
    arc.rotateY(Math.PI / 2); // arc in the YZ plane
    arc.rotateX(Math.PI); // bulge downwards
    dr.add(part(arc, steel));
    dr.position.set(x - side * 0.0014, -0.0085, 0);
    parts.push(dr);
  }
  const ringBottom = -0.0085 - 0.0085;
  const tipOutline: G.V2[] = [[-0.0085, 0], [0.0085, 0], [0.0085, -0.004], [0.007, -0.0075], [0.004, -0.0098], [0, -0.0106], [-0.004, -0.0098], [-0.007, -0.0075], [-0.0085, -0.004]];
  /** Strap start: sewn return layer (outer) -> fold over the D-ring bottom wire -> inner layer. */
  const foldStart = (side: number) => {
    const rx = Math.abs(SSH40_FIT.dRings[0].x);
    const xo = side * (rx + 0.0017), xi = side * (rx - 0.0017), xm = side * rx;
    const pts = [
      new THREE.Vector3(xo, ringBottom - 0.02, 0),
      new THREE.Vector3(xo, ringBottom - 0.006, 0),
      new THREE.Vector3(xo * 0.9995, ringBottom + 0.0006, 0),
      new THREE.Vector3(xm, ringBottom + 0.0026, 0),
      new THREE.Vector3(xi * 1.0005, ringBottom + 0.0006, 0),
      new THREE.Vector3(xi, ringBottom - 0.006, 0),
    ];
    const nrm = [
      new THREE.Vector3(side, 0, 0),
      new THREE.Vector3(side, 0, 0),
      new THREE.Vector3(side, 1, 0).normalize(),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-side, 1, 0).normalize(),
      new THREE.Vector3(-side, 0, 0),
    ];
    // stitch row across the doubled strap below the ring
    parts.push(part(stitches([[xo + side * 0.0011, ringBottom - 0.013, -0.0065], [xo + side * 0.0011, ringBottom - 0.013, 0.0065]], { r: 0.0005 }), SU.thread()));
    return { pts, nrm, xi };
  };
  if (mode === 'open') {
    for (const side of [1, -1]) {
      const { pts, nrm, xi } = foldStart(side);
      const L = side > 0 ? 0.12 : 0.065;
      pts.push(new THREE.Vector3(xi - side * 0.001, ringBottom - L * 0.45, 0.002), new THREE.Vector3(xi - side * 0.0022, ringBottom - L, 0.005));
      nrm.push(new THREE.Vector3(-side, 0, 0), new THREE.Vector3(-side, 0, 0));
      parts.push(part(chinstrapHalf(pts, nrm), web));
      const end = pts[pts.length - 1];
      if (side > 0) {
        // semi-circular metal end tip clamped on the long half
        const tip = G.extrude(tipOutline, 0.0034, 0.0008);
        tip.rotateY(Math.PI / 2);
        parts.push(part(tip, steel, { p: [end.x, end.y + 0.0075, end.z] }));
      } else {
        // slip buckle on the short half
        const b = wireFrame(0.023, 0.02, 0.0011, 0.003);
        b.rotateY(Math.PI / 2);
        parts.push(part(b, steel, { p: [end.x, end.y + 0.006, end.z] }));
        parts.push(part(G.rod([end.x, end.y + 0.006, end.z - 0.0095], [end.x, end.y + 0.006, end.z + 0.0095], 0.0012, 6), steel));
      }
    }
  } else if (mode === 'laid') {
    const fy = SSH40_FIT.rimY + 0.0012;
    for (const side of [1, -1]) {
      const { pts, nrm, xi } = foldStart(side);
      const more = [
        [xi - side * 0.002, fy + 0.006, 0.006],
        [xi - side * 0.008, fy, 0.022],
        [side * 0.055, fy, 0.075],
        [side * 0.022, fy, 0.125],
        [side * (side > 0 ? 0.008 : 0.013), fy, side > 0 ? 0.178 : 0.15],
      ];
      more.forEach((m, i) => {
        pts.push(new THREE.Vector3(m[0], m[1], m[2]));
        nrm.push(i === 0 ? new THREE.Vector3(-side * 0.6, 0.8, 0).normalize() : new THREE.Vector3(0, 1, 0));
      });
      parts.push(part(chinstrapHalf(pts, nrm), web));
      const end = pts[pts.length - 1];
      if (side > 0) {
        const tip = G.extrude(tipOutline, 0.0034, 0.0008);
        tip.rotateX(-Math.PI / 2); // lie flat, rounded end towards +Z
        parts.push(part(tip, steel, { p: [end.x + 0.0008, fy + 0.0002, end.z - 0.004], r: [0, -10, 0] }));
      } else {
        const b = wireFrame(0.023, 0.02, 0.0011, 0.003);
        b.rotateX(-Math.PI / 2);
        parts.push(part(b, steel, { p: [end.x - 0.001, SSH40_FIT.rimY + 0.0011, end.z + 0.004], r: [0, 12, 0] }));
      }
    }
  }

  const obj = group(parts);
  obj.name = 'ssh40-helmet';
  return {
    id: 'su-ssh40-helmet',
    name: 'SSh-40 steel helmet',
    object: obj,
    mount: 'head',
    size: { w: 0.249, h: 0.165, d: 0.272 },
  };
}
