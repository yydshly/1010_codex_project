/**
 * M40 steel helmet (Stahlhelm M1940) with M31 leather liner and leather chinstrap.
 *
 * Gear-local frame (head item): origin at the centre of the head opening in the plane of the
 * liner band (y = 0), +Z forward (brow / visor side), +Y up, +X = wearer's left.
 * Fits the standard head: width ~0.155 m, length ~0.195 m, crown ~0.12 m above the brow line.
 *
 * M40 identification (vs M35 / M42): rolled edge retained (M42 has a raw, flared edge), air vents
 * stamped into the shell as raised bosses (M35 had separate inserted grommets). Finish: factory
 * dull field grey with a rough grit texture, shown without decals (1943-44 practice).
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { P } from './palette';
import { paramSurface, sheet, stitches, frameBuckle, domeHead, placeAlong, sstep, lerp, roundEnds } from './util';

export interface HelmetOptions {
  /**
   * 'open': chinstrap unbuckled-length loop hanging below the helmet from the liner lugs
   * (the infantry author can also hide it and draw their own using `strapAnchors`).
   * 'none': no chinstrap.
   */
  chinstrap?: 'open' | 'none';
  /** How far below the band plane the hanging loop reaches (m). Default 0.13. */
  chinDrop?: number;
  /**
   * Optional floor plane in helmet-local space (unit normal n, offset d: n.p = d). Chinstrap
   * points below it are laid flat onto it - used when the helmet rests on a surface.
   */
  chinFloor?: { n: [number, number, number]; d: number };
  /** 'high' (default) or 'low' tessellation. */
  detail?: 'high' | 'low';
}

// ---- shell parameters (outer surface, metres) ----
const A = 0.0958; // dome half-width (X) at the skirt junction
const BF = 0.1125; // dome half-length to the front
const BR = 0.1185; // dome half-length to the rear
const HC = 0.131; // crown height above the band plane
const T = 0.0016; // shell wall thickness (drawn slightly heavier than the 1.1 mm steel)
const RR = 0.0024; // rolled-edge bead radius
const DOME_V = 0.62; // parameter split: dome [0, DOME_V], skirt [DOME_V, 1]

const deg = (d: number) => (d * Math.PI) / 180;

/** Junction height of dome and skirt. */
function yJ(th: number) {
  const c = Math.cos(th);
  return 0.004 + 0.015 * Math.pow(Math.max(0, c), 1.5);
}
/** Rim (bottom edge) height. th in [0, 2pi); symmetric. */
function yR(th: number) {
  const a = Math.abs(((th + Math.PI) % (2 * Math.PI)) - Math.PI); // 0 front .. pi rear
  const d = (a * 180) / Math.PI;
  return -0.014 - 0.035 * sstep(40, 98, d) - 0.012 * sstep(98, 180, d);
}
/** Skirt flare at the rim (outward from the dome base). */
function flare(th: number) {
  const a = Math.abs(((th + Math.PI) % (2 * Math.PI)) - Math.PI);
  const d = (a * 180) / Math.PI;
  // visor, side and neck guard flare
  return 0.033 - 0.007 * sstep(25, 80, d) + 0.018 * sstep(100, 175, d);
}
/** Elliptical dome base radius in direction th. */
function baseR(th: number) {
  const s = Math.sin(th), c = Math.cos(th);
  const B = c >= 0 ? BF : BR;
  return 1 / Math.sqrt((s / A) ** 2 + (c / B) ** 2);
}

/** Outer shell point for th (azimuth, 0 = front, +X side positive) and v in [0,1] crown -> rim. */
export function shellPoint(th: number, v: number): THREE.Vector3 {
  const dir = new THREE.Vector2(Math.sin(th), Math.cos(th));
  const R = baseR(th);
  const yj = yJ(th);
  if (v <= DOME_V) {
    const phi = (v / DOME_V) * (Math.PI / 2);
    const rho = Math.pow(Math.sin(phi), 0.82);
    const y = yj + (HC - yj) * Math.pow(Math.cos(phi), 1.08);
    return new THREE.Vector3(dir.x * R * rho, y, dir.y * R * rho - 0.003 * rho);
  }
  const w = (v - DOME_V) / (1 - DOME_V);
  const o = flare(th) * Math.pow(w, 2.0);
  const y = yj + (yR(th) - yj) * (1 - Math.pow(1 - w, 1.15));
  const r = R + o;
  return new THREE.Vector3(dir.x * r, y, dir.y * r - 0.003);
}

function shellNormal(th: number, v: number): THREE.Vector3 {
  const e = 1e-3;
  const a = shellPoint(th + e, v).sub(shellPoint(th - e, v));
  const vv = Math.min(0.999, Math.max(0.002, v));
  const b = shellPoint(th, vv + e).sub(shellPoint(th, vv - e));
  return a.cross(b).normalize().multiplyScalar(1); // outward (checked: a is CCW seen from top)
}

/** Rotation (deg about +X) at which the helmet naturally rests on a flat surface, and its floor height. */
export function helmetRestPose(): { tiltDeg: number; floorY: number } {
  const rim: THREE.Vector3[] = [];
  for (let i = 0; i < 180; i++) {
    const th = (i / 180) * Math.PI * 2;
    const p = shellPoint(th, 1);
    p.y -= RR * 0.8;
    rim.push(p);
  }
  const com = new THREE.Vector3(0, 0.045, -0.008);
  let best = { tiltDeg: 0, floorY: 0, e: Infinity };
  for (let a = -20; a <= 20; a += 0.1) {
    const ca = Math.cos(deg(a)), sa = Math.sin(deg(a));
    let mn = Infinity;
    for (const p of rim) mn = Math.min(mn, p.y * ca - p.z * sa);
    const e = com.y * ca - com.z * sa - mn;
    if (e < best.e) best = { tiltDeg: a, floorY: mn, e };
  }
  return { tiltDeg: best.tiltDeg, floorY: best.floorY };
}

export function buildM40Helmet(opts: HelmetOptions = {}): GearPiece {
  const hi = opts.detail !== 'low';
  const NU = hi ? 64 : 48;
  const ND = hi ? 14 : 10;
  const NS = hi ? 10 : 7;
  const NV = ND + NS;
  const vOf = (j: number) => (j <= ND ? (j / ND) * DOME_V : DOME_V + ((j - ND) / NS) * (1 - DOME_V));
  const paint = P.helmet();
  const parts: THREE.Object3D[] = [];

  // --- shell: outer + inner surfaces (inner offset along the normal) ---
  const outer = paramSurface((u, v) => shellPoint(u * Math.PI * 2, vOf(Math.round(v * NV))), NU, NV, true, true);
  const nrm = outer.attributes.normal;
  const pos = outer.attributes.position;
  // make sure normals point outwards (away from the helmet axis)
  let sgn = 0;
  for (let i = 0; i < pos.count; i += 7) sgn += pos.getX(i) * nrm.getX(i) + pos.getZ(i) * nrm.getZ(i) + (pos.getY(i) - 0.04) * nrm.getY(i);
  if (sgn < 0) {
    G.flipWinding(outer);
    for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, -nrm.getX(i), -nrm.getY(i), -nrm.getZ(i));
  }
  const inner = outer.clone();
  const ip = inner.attributes.position, inn = inner.attributes.normal;
  for (let i = 0; i < ip.count; i++) {
    ip.setXYZ(i, ip.getX(i) - inn.getX(i) * T, ip.getY(i) - inn.getY(i) * T, ip.getZ(i) - inn.getZ(i) * T);
    inn.setXYZ(i, -inn.getX(i), -inn.getY(i), -inn.getZ(i));
  }
  G.flipWinding(inner);
  parts.push(part(outer, paint), part(inner, paint));

  // --- rolled edge: a bead following the rim, tangent to the outer surface ---
  const rimPts: THREE.Vector3[] = [];
  const NR = hi ? 72 : 64;
  for (let i = 0; i < NR; i++) {
    const th = (i / NR) * Math.PI * 2;
    const p = shellPoint(th, 1);
    const n = shellNormal(th, 0.995);
    const tg = shellPoint(th, 1).sub(shellPoint(th, 0.98)).normalize();
    rimPts.push(p.addScaledVector(n, -(RR - T * 0.5)).addScaledVector(tg, RR * 0.25));
  }
  parts.push(part(G.tube(rimPts, RR, hi ? 8 : 6, NR, true), paint));

  // --- stamped air vents (raised bosses with a hole), one each side ---
  const hw = P.hardware();
  const dark = P.blackPaint();
  for (const sx of [1, -1]) {
    const th = sx * deg(83);
    const v = DOME_V * 0.78;
    const p = shellPoint(th, v), n = shellNormal(th, v);
    const boss = G.lathe([[0.0022, 0.0021], [0.0036, 0.0024], [0.0052, 0.0017], [0.0068, 0.0004], [0.0075, -0.0008]], 28, 60);
    parts.push(part(placeAlong(boss, p, n), paint));
    parts.push(part(placeAlong(G.cyl(0.0022, 0.0022, 0.004, 16), p.clone().addScaledVector(n, 0.0002), n), dark));
  }

  // --- liner split-pin heads (3): left, right, rear, on the skirt just below the junction ---
  for (const th of [deg(96), deg(-96), Math.PI]) {
    const v = DOME_V + 0.08;
    const p = shellPoint(th, v), n = shellNormal(th, v);
    parts.push(part(placeAlong(domeHead(0.0046, 0.0022, 18), p.clone().addScaledVector(n, -0.0003), n), paint));
  }

  // --- M31 liner: aluminium band, leather sweatband, nine fingers, drawstring ---
  const bandPts: THREE.Vector3[] = [];
  const bandN: THREE.Vector3[] = [];
  const NB = hi ? 48 : 40;
  const bandInset = 0.0085; // band stands off the shell on the pin spacers
  for (let i = 0; i < NB; i++) {
    const th = (i / NB) * Math.PI * 2;
    const R = baseR(th) - T - bandInset;
    const d = new THREE.Vector3(Math.sin(th), 0, Math.cos(th));
    bandPts.push(new THREE.Vector3(d.x * R, 0.0065, d.z * R - 0.003));
    bandN.push(d.clone().negate());
  }
  const alu = P.alu();
  parts.push(part(sheet(bandPts, bandN, 0.0105, 0.0012, { closed: true, across: 2, samples: NB * 2 }), alu));
  // spacer bosses between band and shell at the three pins
  for (const th of [deg(96), deg(-96), Math.PI]) {
    const R0 = baseR(th) - T - bandInset;
    const d = new THREE.Vector3(Math.sin(th), 0, Math.cos(th));
    const a = d.clone().multiplyScalar(R0 + 0.0005).setY(0.001);
    const b = d.clone().multiplyScalar(R0 + bandInset - 0.0002).setY(0.001);
    a.z -= 0.003; b.z -= 0.003;
    parts.push(part(G.rod(a, b, 0.0032, 12), alu));
  }
  const leather = P.brownLeather();
  // head ellipsoid the liner leather conforms to
  const HA = 0.0775 + 0.0035, HB = 0.0975 + 0.0035, HH = 0.12 + 0.0035;
  const headPt = (th: number, phi: number) =>
    new THREE.Vector3(Math.sin(th) * HA * Math.sin(phi), HH * Math.cos(phi), Math.cos(th) * HB * Math.sin(phi) - 0.003);
  // sweatband: from the band's lower edge rising inwards to the head
  const swPts: THREE.Vector3[] = [], swN: THREE.Vector3[] = [];
  for (let i = 0; i < NB; i++) {
    const th = (i / NB) * Math.PI * 2;
    const R = baseR(th) - T - bandInset - 0.0022;
    const d = new THREE.Vector3(Math.sin(th), 0, Math.cos(th));
    const lo = new THREE.Vector3(d.x * R, -0.004, d.z * R - 0.003);
    const hiP = headPt(th, deg(81)).addScaledVector(d, 0.0015);
    const mid = lo.clone().lerp(hiP, 0.5);
    swPts.push(mid);
    // face normal: perpendicular to the (lo->hi) rise within the radial plane, pointing inwards
    const rise = hiP.clone().sub(lo).normalize();
    const tang = new THREE.Vector3(Math.cos(th), 0, -Math.sin(th));
    swN.push(rise.clone().cross(tang).normalize().multiplyScalar(-1));
  }
  // width direction for sheet = T x N; make it follow the rise by choosing normals accordingly
  const swHalf = (() => {
    const lo = new THREE.Vector3(Math.sin(0) * (baseR(0) - T - bandInset - 0.0022), -0.004, 0);
    return lo.distanceTo(headPt(0, deg(81))) * 0.5 + 0.002;
  })();
  parts.push(part(sheet(swPts, swN, swHalf, 0.0022, { closed: true, across: 3, samples: NB * 2 }), leather));
  // nine fingers
  const NFING = 9;
  for (let k = 0; k < NFING; k++) {
    const th = ((k + 0.5) / NFING) * Math.PI * 2;
    const pts: THREE.Vector3[] = [], ns: THREE.Vector3[] = [];
    for (let s = 0; s <= 6; s++) {
      const phi = deg(lerp(80, 27, s / 6));
      pts.push(headPt(th, phi));
      const e = 1e-3;
      const a = headPt(th + e, phi).sub(headPt(th - e, phi));
      const b = headPt(th, phi + e).sub(headPt(th, phi - e));
      ns.push(a.cross(b).normalize());
    }
    const fw = (t: number, s: number, L: number) => {
      const base = lerp(0.025, 0.0135, t);
      return roundEnds(base, 0, 0.011)(t, s, L);
    };
    parts.push(part(sheet(pts, ns, fw, 0.0018, { across: 3, samples: hi ? 11 : 9, bulge: -0.0012 }), leather));
    // punched lacing hole: a dark disc near the finger tip
    const hp = headPt(th, deg(31));
    const hn = headPt(th, deg(31)).sub(new THREE.Vector3(0, HH * 0.1, 0)).normalize();
    parts.push(part(placeAlong(G.cyl(0.0024, 0.0024, 0.0006, 12), hp.clone().addScaledVector(hn, -0.0011), hn), dark));
  }
  // drawstring threaded through the finger tips, knotted at the rear
  const cord: THREE.Vector3[] = [];
  for (let i = 0; i < 36; i++) {
    const th = (i / 36) * Math.PI * 2;
    const k = (Math.cos(th * NFING) + 1) / 2; // over/under
    cord.push(headPt(th, deg(31)).multiplyScalar(1 - 0.012 - 0.01 * k));
  }
  parts.push(part(G.tube(cord, 0.0011, 5, 144, true), P.cord()));
  parts.push(part(new THREE.SphereGeometry(0.0028, 10, 8), P.cord(), { p: headPt(Math.PI, deg(31)).multiplyScalar(0.975).toArray() as [number, number, number] }));
  parts.push(part(G.tube([headPt(Math.PI, deg(31)).multiplyScalar(0.97), headPt(Math.PI + 0.08, deg(40)).multiplyScalar(0.965), headPt(Math.PI + 0.05, deg(50)).multiplyScalar(0.965)], 0.0011, 5, 16), P.cord()));

  // stitch rows along the sweatband top
  const st: THREE.Vector3[] = [];
  for (let i = 0; i <= 72; i++) st.push(headPt((i / 72) * Math.PI * 2, deg(79.5)).multiplyScalar(0.985));
  parts.push(part(stitches(st, (p) => new THREE.Vector3(-p.x, 0, -p.z).normalize(), 0.0055, {}, true), P.thread()));

  // --- chinstrap lugs (on the band, both sides) ---
  const lugs: THREE.Vector3[] = [];
  for (const sx of [1, -1]) {
    const th = sx * (Math.PI / 2);
    const R = baseR(th) - T - bandInset - 0.0014;
    const p = new THREE.Vector3(sx * R, 0.004, -0.003);
    lugs.push(p.clone());
    parts.push(part(placeAlong(domeHead(0.0042, 0.002, 14), p, [-sx, 0, 0]), alu));
  }

  // --- chinstrap ---
  const strapAnchors = lugs.map((l) => l.clone());
  if ((opts.chinstrap ?? 'open') === 'open') {
    const drop = opts.chinDrop ?? 0.13;
    const L = lugs[0], R = lugs[1];
    const x0 = L.x - 0.004;
    const raw: THREE.Vector3[] = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = t * Math.PI; // U from left lug round to right lug
      const x = Math.cos(a) * x0 * (0.97 - 0.12 * Math.sin(a));
      const y = L.y - 0.012 - (drop - 0.012) * Math.pow(Math.sin(a), 0.7);
      const z = -0.003 + 0.02 * Math.sin(a);
      raw.push(new THREE.Vector3(x, y, z));
    }
    raw[0] = L.clone().add(new THREE.Vector3(-0.004, 0, 0));
    raw[n] = R.clone().add(new THREE.Vector3(0.004, 0, 0));
    const pts = raw.map((p) => p.clone());
    if (opts.chinFloor) {
      const fn = new THREE.Vector3(...opts.chinFloor.n).normalize();
      const fd = opts.chinFloor.d + 0.0015;
      for (const p of pts) {
        const h = p.dot(fn) - fd;
        if (h < 0) p.addScaledVector(fn, -h);
      }
    }
    // strap face: outward (away from the loop centre) in the loop plane
    const nrms = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const tg = b.clone().sub(a).normalize();
      return new THREE.Vector3(0, 0, 1).cross(tg).normalize();
    });
    const strapLeather = P.blackLeather();
    parts.push(part(sheet(pts, nrms, 0.0085, 0.0024, { across: 3, samples: 44 }), strapLeather));
    // buckle on the left run, with the tongue end overlapping
    const bi = 6;
    const bp = pts[bi], bn = nrms[bi];
    const btg = pts[bi + 1].clone().sub(pts[bi - 1]).normalize();
    const bg = frameBuckle(0.019, 0.013, 0.0012, true);
    const m = new THREE.Matrix4().makeBasis(bn.clone().cross(btg).normalize(), btg.clone().negate(), bn.clone());
    bg.applyMatrix4(m);
    bg.translate(bp.x + bn.x * 0.0022, bp.y + bn.y * 0.0022, bp.z + bn.z * 0.0022);
    parts.push(part(bg, hw));
    // overlapping strap end (sizing holes side) laid over the main strap below the buckle
    const endPts = pts.slice(bi - 1, bi + 6).map((p, i) => p.clone().addScaledVector(nrms[bi - 1 + i], 0.0026));
    parts.push(part(sheet(endPts, nrms.slice(bi - 1, bi + 6), (t, s, Ln) => roundEnds(0.008, 0, 0.006)(t, s, Ln), 0.0022, { across: 3, samples: 24 }), strapLeather));
    // strap ends riveted to the lugs
    for (const [i, sx] of [[0, 1], [n, -1]] as [number, number][]) {
      parts.push(part(placeAlong(domeHead(0.0028, 0.0014, 10), pts[i].clone().add(new THREE.Vector3(-sx * 0.0014, 0, 0)), [-sx, 0, 0]), alu));
    }
    strapAnchors.push(pts[Math.floor(n / 2)].clone());
  }

  const object = group(parts);
  object.name = 'de-m40-helmet';
  const box = new THREE.Box3().setFromObject(object, true);
  const size = box.getSize(new THREE.Vector3());
  return {
    id: 'de-m40-helmet',
    name: 'M40 steel helmet',
    object,
    mount: 'head',
    size: { w: size.x, h: size.y, d: size.z },
    strapAnchors,
  };
}
