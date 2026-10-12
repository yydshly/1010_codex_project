/**
 * F-1 defensive hand grenade with the UZRG striker-release fuze (standard from 1942-43).
 * Segmented steel-cast-iron ovoid body, 55 mm diameter, 117 mm overall height with the fuze.
 *
 * Local frame: origin at the centre of the flat base, +Y up along the fuze axis, the lever
 * runs down the +Z side.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { SU } from './palette';

/** Body outline [radius, y], base (y = 0) to the top of the fuze boss. */
const BODY: [number, number][] = [
  [0.0, 0.0],
  [0.0085, 0.0],
  [0.0142, 0.0011],
  [0.0203, 0.0052],
  [0.0247, 0.012],
  [0.0271, 0.0225],
  [0.0275, 0.0365],
  [0.0271, 0.0487],
  [0.0257, 0.0607],
  [0.0229, 0.0707],
  [0.0184, 0.0782],
  [0.0136, 0.0816],
  [0.0113, 0.0826],
  [0.0111, 0.0848],
  [0.0107, 0.0866],
  [0.0086, 0.0868],
  [0.0086, 0.0862],
];
const H_FUZE_BASE = 0.0866;

const bodyCurve = new THREE.CatmullRomCurve3(BODY.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal');

/** Body radius at height y (for fitting the lever). */
function bodyR(y: number): number {
  let best = 0;
  for (let i = 0; i <= 400; i++) {
    const p = bodyCurve.getPoint(i / 400);
    if (Math.abs(p.y - y) < 0.0006) best = Math.max(best, p.x);
  }
  return best;
}

/** Arc-length samples across one groove-to-groove interval, dense at the groove walls. */
function intervalSamples(half: number, wall: number[]): number[] {
  const s: number[] = [];
  const inner = wall.filter((d) => d < half * 0.8);
  const last = inner[inner.length - 1] ?? 0;
  const n = Math.max(1, Math.round((half - last) / 0.0034));
  for (const d of inner) s.push(d);
  for (let i = 1; i <= n; i++) s.push(last + ((half - last) * i) / n);
  return s; // 0 .. half
}

function bodyGeometry(): THREE.BufferGeometry {
  const L = bodyCurve.getLength();
  // groove positions along the profile arc length (5 rows of blocks between y ~0.006 and ~0.075)
  const pts = bodyCurve.getSpacedPoints(600);
  const arcAtY = (y: number) => {
    for (let i = 0; i < pts.length; i++) if (pts[i].y >= y && pts[i].x > 0.015) return (i / 600) * L;
    return L;
  };
  const s0 = arcAtY(0.0075), s1 = arcAtY(0.0745);
  const rowS = Array.from({ length: 6 }, (_, k) => s0 + ((s1 - s0) * k) / 5);
  const WALL = [0, 0.0008, 0.0015, 0.0023];
  const gw0 = 0.001, gw1 = 0.0023, depth = 0.0026;
  const groove = (d: number) => (d <= gw0 ? 1 : d >= gw1 ? 0 : 0.5 + 0.5 * Math.cos(((d - gw0) / (gw1 - gw0)) * Math.PI));

  // rows (profile arc samples)
  const sRows: number[] = [];
  for (let i = 0; i <= 8; i++) sRows.push((s0 - 0.0035) * (i / 8) ** 0.8); // base cap
  for (let k = 0; k < 6; k++) {
    const c = rowS[k];
    const prevHalf = k > 0 ? (rowS[k] - rowS[k - 1]) / 2 : 0.0035;
    const nextHalf = k < 5 ? (rowS[k + 1] - rowS[k]) / 2 : 0.0035;
    const before = intervalSamples(prevHalf, WALL).reverse().map((d) => c - d);
    const after = intervalSamples(nextHalf, WALL).map((d) => c + d).filter((v) => v > c);
    for (const v of before) if (v > sRows[sRows.length - 1] + 1e-5) sRows.push(v);
    for (const v of after) if (v > sRows[sRows.length - 1] + 1e-5 && (k < 5 || v <= c + 0.0035)) sRows.push(v);
  }
  const sTop0 = sRows[sRows.length - 1];
  for (let i = 1; i <= 14; i++) sRows.push(sTop0 + (L - sTop0) * (i / 14));

  // columns (angles), 8 columns of blocks
  const rMid = 0.0272;
  const halfArc = (Math.PI * 2 * rMid) / 16;
  const half = intervalSamples(halfArc, WALL);
  const colA: number[] = [];
  for (let k = 0; k < 8; k++) {
    const base = (k * Math.PI) / 4;
    for (const d of half) if (d < halfArc - 1e-6) colA.push(base + d / rMid);
    for (let i = half.length - 1; i >= 1; i--) colA.push(base + (2 * halfArc - half[i]) / rMid);
  }
  colA.sort((a, b) => a - b);
  const U = colA.length;

  const pos: number[] = [];
  const idx: number[] = [];
  for (const s of sRows) {
    const t = Math.min(1, Math.max(0, s / L));
    const p = bodyCurve.getPointAt(t);
    const tg = bodyCurve.getTangentAt(t);
    // groove (horizontal) distance along the profile
    let dh = 1;
    for (const c of rowS) dh = Math.min(dh, Math.abs(s - c));
    const inBand = s > rowS[0] - gw1 && s < rowS[5] + gw1;
    for (const a of colA) {
      let inset = 0;
      if (inBand) {
        const gh = groove(dh);
        let gv = 0;
        if (s > rowS[0] && s < rowS[5]) {
          const seg = Math.PI / 4;
          const m = ((a % seg) + seg) % seg;
          const dv = Math.min(m, seg - m) * rMid * (p.x / rMid);
          gv = groove(dv);
        }
        inset = depth * Math.max(gh, gv) * Math.min(1, p.x / 0.02);
        // very slight doming of the block faces
        inset += 0.00025 * (1 - Math.max(gh, gv));
      }
      // radial inset along the profile normal (perpendicular to the tangent in the r-y plane)
      const nr = tg.y, ny = -tg.x; // outward normal in (r, y)
      const r = Math.max(0, p.x - nr * inset);
      const y = p.y - ny * inset;
      pos.push(r * Math.sin(a), y, r * Math.cos(a));
    }
  }
  const R = sRows.length;
  for (let i = 0; i < R - 1; i++) {
    for (let j = 0; j < U; j++) {
      const a0 = i * U + j, b0 = i * U + ((j + 1) % U), c0 = (i + 1) * U + j, d0 = (i + 1) * U + ((j + 1) % U);
      idx.push(a0, b0, c0, b0, d0, c0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  G.ensureOutward(g);
  return g;
}

export function buildF1Grenade(): GearPiece {
  const steel = SU.fuzeSteel();
  const parts: THREE.Object3D[] = [part(bodyGeometry(), SU.grenadePaint(), { name: 'body' })];

  // --- UZRG fuze: threaded collar, striker housing, lugs, lever, safety pin & ring
  const y0 = H_FUZE_BASE;
  parts.push(part(G.lathe([[0.0, y0], [0.0098, y0], [0.0102, y0 + 0.0006], [0.0102, y0 + 0.0036], [0.0094, y0 + 0.0042], [0.0078, y0 + 0.0044], [0.0, y0 + 0.0044]], 28, 40), steel));
  // knurled flats on the collar
  const flats: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    flats.push({ p: new THREE.Vector3(Math.sin(a) * 0.0101, y0 + 0.0021, Math.cos(a) * 0.0101), n: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)) });
  }
  parts.push(part(G.scatter(G.box(0.0012, 0.0005, 0.0028), flats), steel));
  const hy = y0 + 0.0044;
  parts.push(part(G.lathe([[0, hy], [0.0074, hy], [0.0074, hy + 0.0195], [0.0068, hy + 0.022], [0.0045, hy + 0.0235], [0.0, hy + 0.0238]], 28, 40), steel));
  parts.push(part(G.lathe([[0, hy], [0.0082, hy], [0.0082, hy + 0.0025], [0.0074, hy + 0.003], [0, hy + 0.003]], 28, 40), steel));
  // lever pivot lugs on the +Z side
  const lugY = hy + 0.0145;
  for (const sx of [1, -1]) {
    parts.push(part(G.rbox(0.0012, 0.0085, 0.0075, 0.0005, 2), steel, { p: [sx * 0.0047, lugY, 0.0082] }));
  }
  // lever: hooks over the housing top, passes the lugs and follows the body shoulder down
  const leverPath: [number, number][] = [
    [-0.0045, hy + 0.0244],
    [0.001, hy + 0.0252],
    [0.0065, hy + 0.0236],
    [0.0098, hy + 0.0202],
    [0.0118, lugY],
    [0.0132, hy + 0.0045],
  ];
  for (const y of [0.078, 0.071, 0.064, 0.057, 0.05, 0.045]) leverPath.push([bodyR(y) + 0.0026, y]);
  const lp = leverPath.map(([z, y]) => new THREE.Vector3(0, y, z));
  const ln = lp.map((p, i) => {
    const a = lp[Math.max(0, i - 1)], b = lp[Math.min(lp.length - 1, i + 1)];
    const t = b.clone().sub(a).normalize();
    return new THREE.Vector3(0, -t.z, t.y).multiplyScalar(-1); // outward, perpendicular to the lever run
  });
  parts.push(part(G.strap(lp, 0.0118, 0.0011, ln, { samples: 70 }), steel));
  // lever side flanges near the pivot
  for (const sx of [1, -1]) {
    parts.push(part(G.rbox(0.0009, 0.012, 0.004, 0.0003, 1), steel, { p: [sx * 0.0058, lugY + 0.0015, 0.0112], r: [-12, 0, 0] }));
  }
  // safety pin through lugs and lever flanges, split ends bent on the -X side
  const py = lugY - 0.001, pz = 0.0096;
  parts.push(part(G.rod([-0.0075, py, pz], [0.0082, py, pz], 0.0008, 8), steel));
  parts.push(part(G.tube([[-0.0074, py, pz], [-0.0098, py - 0.0006, pz + 0.0022], [-0.0112, py - 0.0014, pz + 0.004]], 0.0006, 5, 10), steel));
  parts.push(part(G.tube([[-0.0074, py, pz], [-0.0098, py + 0.0008, pz - 0.0018], [-0.0111, py + 0.0016, pz - 0.0034]], 0.0006, 5, 10), steel));
  // pull ring on the +X side
  const ring = G.torus(0.0105, 0.001, 8, 40);
  ring.rotateX(-0.55);
  ring.translate(0.0082 + 0.0102, py - 0.0012, pz + 0.004);
  parts.push(part(ring, steel));

  const obj = group(parts);
  obj.name = 'f1-grenade';
  return {
    id: 'su-f1-grenade',
    name: 'F-1 hand grenade (UZRG fuze)',
    object: obj,
    mount: 'belt-front-right',
    size: { w: 0.055, h: 0.117, d: 0.055 },
  };
}
