/**
 * Grenade, hand and rifle, No. 36M Mk I - the "Mills bomb" (British Army, WWII): an oval cast-iron
 * body deeply grooved into segments (four full rows between a plain shoulder and base, ten
 * segments round), a central striker under a curved steel fly-off lever that pivots between two
 * cast ears on top and is held by a split pin with a pull ring, a screwed filler plug on the
 * shoulder and a knurled base plug carrying the detonator assembly. The "M" (Mesopotamia) version
 * is shellac-coated against moisture: dark khaki body, green filling band round the middle and
 * three red crosses on each side of the shoulder.
 *
 * Local frame: origin at the centre of the base plug's bottom face, +Y up along the striker axis,
 * the lever runs down the +Z side, the pull ring hangs on the +X side.
 * 61 mm diameter, 95 mm high.
 */
import { THREE, G, part, group, decal } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { UK } from './palette';
import { taperedSheet, merge, smoothstep } from './helpers';

/** Body profile [radius, y], bottom annulus (round the base plug) to the striker boss. */
const PROFILE: [number, number][] = [
  [0.0182, 0.0052],
  [0.0222, 0.0056],
  [0.0256, 0.0095],
  [0.0287, 0.0175],
  [0.0302, 0.028],
  [0.0306, 0.04],
  [0.03, 0.052],
  [0.0283, 0.062],
  [0.0253, 0.071],
  [0.021, 0.0782],
  [0.0158, 0.0832],
  [0.0126, 0.0856],
];
const curve = new THREE.CatmullRomCurve3(PROFILE.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal');
const SAMP = curve.getSpacedPoints(800);
/** Profile radius at height y (outer envelope of the segment faces). */
export function millsR(y: number): number {
  let best = 0;
  for (let i = 1; i < SAMP.length; i++) {
    const a = SAMP[i - 1], b = SAMP[i];
    if ((a.y - y) * (b.y - y) <= 0 && Math.abs(b.y - a.y) > 1e-9) {
      const t = (y - a.y) / (b.y - a.y);
      best = Math.max(best, a.x + (b.x - a.x) * t);
    }
  }
  return best;
}

const H_ROWS = [0.0138, 0.0272, 0.0418, 0.0562, 0.0692]; // horizontal groove centre heights
const N_COL = 10;
const G_DEPTH = 0.0017;
const BAND = { y0: 0.0355, y1: 0.0482 };

/** Adaptive samples in [0, 1] between two groove centres: dense at the groove walls. */
const SPAN = [0, 0.04, 0.085, 0.13, 0.24, 0.37, 0.5, 0.63, 0.76, 0.87, 0.915, 0.96];

function bodyGeometry(): { body: THREE.BufferGeometry; band: THREE.BufferGeometry } {
  // rows (heights)
  const ys: number[] = [0.0052, 0.0056, 0.0075];
  const edges = [0.0075, ...H_ROWS, 0.0785];
  for (let k = 0; k < edges.length - 1; k++) {
    const a = edges[k], b = edges[k + 1];
    const sp = k === 0 ? [0.25, 0.5, 0.63, 0.76, 0.87, 0.915, 0.96] : k === edges.length - 2 ? [0, 0.04, 0.085, 0.13, 0.3, 0.55, 0.8] : SPAN;
    for (const f of sp) {
      const y = a + (b - a) * f;
      if (y > ys[ys.length - 1] + 1e-5) ys.push(y);
    }
  }
  for (const y of [0.0785, 0.0808, 0.0832, 0.0848, 0.0856]) if (y > ys[ys.length - 1] + 1e-5) ys.push(y);
  // columns (angles)
  const ths: number[] = [];
  for (let c = 0; c < N_COL; c++) for (const f of [0, 0.045, 0.09, 0.2, 0.35, 0.5, 0.65, 0.8, 0.91, 0.955]) ths.push(((c + f) / N_COL) * Math.PI * 2);
  const grooveW = (y: number) => (Math.abs(y - H_ROWS[2]) < 0.004 ? 0.0019 : 0.0015); // half width
  const gProfile = (d: number, hw: number) => 1 - smoothstep(hw * 0.45, hw * 1.15, d);
  const off = (th: number, y: number) => {
    if (y < 0.0078 || y > 0.0782) return 0;
    const r = millsR(y);
    // vertical grooves (fade out at the top and bottom of the grooved zone)
    const colW = (Math.PI * 2) / N_COL;
    const dth = Math.abs(((th % colW) + colW) % colW);
    const dv = Math.min(dth, colW - dth) * r;
    const fadeV = smoothstep(0.0078, 0.0105, y) * (1 - smoothstep(0.0745, 0.0782, y));
    let g = gProfile(dv, 0.0015) * fadeV;
    // horizontal grooves
    for (const hy of H_ROWS) g = Math.max(g, gProfile(Math.abs(y - hy), grooveW(hy)));
    // pillow-domed segment faces
    const u = Math.min(dth, colW - dth) / (colW / 2);
    let vy = 1;
    const all = [0.0078, ...H_ROWS, 0.0782];
    for (let k = 0; k < all.length - 1; k++) if (y >= all[k] && y <= all[k + 1]) vy = Math.abs((y - (all[k] + all[k + 1]) / 2) / ((all[k + 1] - all[k]) / 2));
    const pillow = 0.00045 * (u * u + vy * vy) * 0.5;
    return G_DEPTH * g + pillow * (1 - g);
  };
  const NT = ths.length, NY = ys.length;
  const pos: number[] = [];
  for (const y of ys) {
    const r0 = y <= 0.0056 ? (y < 0.0054 ? 0.0182 : 0.0222) : millsR(y);
    for (const th of ths) {
      const r = r0 - off(th, y);
      pos.push(r * Math.sin(th), y, r * Math.cos(th));
    }
  }
  // triangles, split into body / band by the face centre height
  const body: number[] = [], band: number[] = [];
  const V = (i: number, j: number) => (i * NT + (j % NT)) * 3;
  const push = (arr: number[], ...ids: number[]) => {
    for (const id of ids) arr.push(pos[id], pos[id + 1], pos[id + 2]);
  };
  for (let i = 0; i < NY - 1; i++) {
    const yc = (ys[i] + ys[i + 1]) / 2;
    const arr = yc > BAND.y0 && yc < BAND.y1 ? band : body;
    for (let j = 0; j < NT; j++) {
      const a = V(i, j), b = V(i, j + 1), c = V(i + 1, j), d = V(i + 1, j + 1);
      push(arr, a, c, b, b, c, d);
    }
  }
  const mk = (arr: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const m = G.mergeVertices(g, 1e-7);
    m.computeVertexNormals();
    G.ensureOutward(m);
    return m;
  };
  return { body: mk(body), band: mk(band) };
}

export function buildNo36Grenade(): GearPiece {
  const paint = UK.grenadeBody(), steel = UK.grenadeSteel();
  const { body, band } = bodyGeometry();
  const parts: THREE.Object3D[] = [part(body, paint, { name: 'body' }), part(band, UK.grenadeBand(), { name: 'band' })];

  // striker boss on top (flat, with the centre piece)
  const boss = G.lathe([[0.0126, 0.0848], [0.0122, 0.0872], [0.0114, 0.0884], [0.0062, 0.0886], [0.0055, 0.0878], [0, 0.0878]], 30, 40);
  parts.push(part(boss, paint));
  // cast ears flanking the lever, with the pin holes' bosses
  const earGeos: THREE.BufferGeometry[] = [];
  for (const sx of [1, -1]) {
    const ear = G.extrude(
      [
        [-0.0095, 0],
        [0.0065, 0],
        [0.0065, 0.0062],
        [0.0035, 0.0102],
        [-0.0012, 0.0112],
        [-0.0065, 0.0102],
        [-0.0095, 0.0062],
      ],
      0.0024,
      0.0005,
      6,
      1,
    );
    ear.rotateY(Math.PI / 2); // outline x -> -Z, thickness along X
    ear.translate(sx * 0.0081, 0.0835, 0);
    earGeos.push(ear);
    const hole = G.cyl(0.0019, 0.0019, 0.0006, 14);
    hole.rotateZ(Math.PI / 2);
    hole.translate(sx * 0.0095, 0.0902, 0.0012);
    earGeos.push(hole);
  }
  parts.push(part(merge(earGeos), paint));

  // filler plug on the shoulder, opposite the lever
  const fy = 0.0655, fr = millsR(fy);
  const plug = G.lathe([[0, 0.0022], [0.0048, 0.0022], [0.0062, 0.0014], [0.0068, 0], [0.0068, -0.003], [0, -0.003]], 20, 40);
  const slot = G.rbox(0.0104, 0.0012, 0.0013, 0.0003, 1);
  slot.translate(0, 0.00165, 0);
  const plugMesh = part(plug, paint);
  const n = new THREE.Vector3(0, 0.28, -1).normalize();
  plugMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  plugMesh.position.set(0, fy, -(fr - G_DEPTH * 0.35));
  const slotMesh = part(slot, UK.blackSteel());
  slotMesh.quaternion.copy(plugMesh.quaternion);
  slotMesh.position.copy(plugMesh.position);
  parts.push(plugMesh, slotMesh);

  // knurled base plug
  const KN = 60;
  const bp: number[] = [];
  const ring = (y: number, r: number, knurl: number) => {
    const out: THREE.Vector3[] = [];
    for (let k = 0; k < KN * 2; k++) {
      const th = (k / (KN * 2)) * Math.PI * 2;
      const rr = r + (k % 2 === 0 ? knurl : -knurl);
      out.push(new THREE.Vector3(rr * Math.sin(th), y, rr * Math.cos(th)));
    }
    return out;
  };
  const rings = [ring(0.0003, 0.0168, 0), ring(0, 0.0162, 0), ring(0.0008, 0.0178, 0.00035), ring(0.0052, 0.0178, 0.00035), ring(0.0056, 0.017, 0)];
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
    for (const q of [a, b, c, a, c, d]) bp.push(q.x, q.y, q.z);
  };
  for (let i = 1; i < rings.length - 1; i++) {
    for (let k = 0; k < KN * 2; k++) {
      const k1 = (k + 1) % (KN * 2);
      quad(rings[i][k], rings[i + 1][k], rings[i + 1][k1], rings[i][k1]);
    }
  }
  const bpg = new THREE.BufferGeometry();
  bpg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
  const bpm = G.crease(bpg, 50);
  G.ensureOutward(bpm);
  // bottom face: flat disc with a raised centre piece and a key slot
  const bottom = G.lathe([[0, 0.0012], [0.0045, 0.0012], [0.0052, 0.0006], [0.0058, 0.0004], [0.0125, 0.0004], [0.0162, 0], [0.0162, 0.0008], [0, 0.0008]], 36, 40);
  parts.push(part(merge([bpm, bottom]), UK.basePlug(), { name: 'base-plug' }));

  // fly-off lever: pivot between the ears, over the boss, down the +Z side
  const lpts: THREE.Vector3[] = [];
  const lnr: THREE.Vector3[] = [];
  lpts.push(new THREE.Vector3(0, 0.0905, -0.0088), new THREE.Vector3(0, 0.0924, -0.003), new THREE.Vector3(0, 0.0928, 0.005), new THREE.Vector3(0, 0.0912, 0.0118));
  for (let k = 0; k < 4; k++) lnr.push(new THREE.Vector3(0, 1, 0));
  lnr[3] = new THREE.Vector3(0, 0.9, 0.4).normalize();
  lpts.push(new THREE.Vector3(0, 0.0872, 0.0165));
  lnr.push(new THREE.Vector3(0, 0.6, 0.8).normalize());
  for (const y of [0.08, 0.071, 0.06, 0.049, 0.039, 0.03]) {
    const r = millsR(y) + 0.0022 + 0.0008 * smoothstep(0.045, 0.03, y);
    lpts.push(new THREE.Vector3(0, y, r));
    const r2 = millsR(y + 0.001), r1 = millsR(y - 0.001);
    lnr.push(new THREE.Vector3(0, -(r2 - r1) / 0.002, 1).normalize());
  }
  lpts.push(new THREE.Vector3(0, 0.0245, millsR(0.0245) + 0.0045));
  lnr.push(new THREE.Vector3(0, -0.5, 1).normalize());
  const Ll = new THREE.CatmullRomCurve3(lpts, false, 'centripetal').getLength();
  const lever = taperedSheet(lpts, lnr, (t) => {
    const s = t * Ll;
    const top = s < 0.02 ? 0.0055 : 0.0066;
    const endR = Ll - s < 0.006 ? Math.sqrt(Math.max(0.05, 1 - ((0.006 - (Ll - s)) / 0.006) ** 2)) : 1;
    return top * endR;
  }, 0.0016, { samples: 44, across: 4, bulge: (t) => (t > 0.25 ? 0.0009 : 0.0002) });
  parts.push(part(lever, steel, { name: 'lever' }));
  // the lever's claw hooked under the ears' lip
  parts.push(part(G.tube([[0, 0.0898, -0.0086], [0, 0.0882, -0.0098], [0, 0.0866, -0.0093]], 0.0012, 6, 8), steel));

  // split pin through the ears (over the lever), eye on +X holding the pull ring
  const pinY = 0.0902, pinZ = 0.0012;
  const pinGeos: THREE.BufferGeometry[] = [];
  pinGeos.push(G.rod([-0.0118, pinY, pinZ], [0.0112, pinY, pinZ], 0.00085, 8));
  // opened legs on the -X side
  pinGeos.push(G.tube([[-0.0112, pinY, pinZ + 0.0004], [-0.0132, pinY + 0.0012, pinZ + 0.0012], [-0.0148, pinY + 0.0028, pinZ + 0.0018]], 0.0006, 5, 8));
  pinGeos.push(G.tube([[-0.0112, pinY, pinZ - 0.0004], [-0.0132, pinY - 0.0014, pinZ - 0.0008], [-0.0146, pinY - 0.003, pinZ - 0.0012]], 0.0006, 5, 8));
  // eye
  const eye = G.torus(0.0022, 0.00075, 6, 16);
  eye.rotateX(Math.PI / 2); // loop in the XZ plane, the ring passes down through it
  eye.translate(0.0133, pinY, pinZ);
  pinGeos.push(eye);
  // pull ring lying against the +X shoulder
  const ringG = G.torus(0.0125, 0.0011, 8, 48);
  ringG.rotateY(Math.PI / 2); // plane YZ
  ringG.rotateZ(Math.PI / 4); // tilted out to rest on the sloping shoulder
  const down = new THREE.Vector3(Math.SQRT1_2, -Math.SQRT1_2, 0);
  const ringC = new THREE.Vector3(0.0133, pinY, pinZ).addScaledVector(down, 0.0125 - 0.0008);
  ringG.translate(ringC.x, ringC.y, ringC.z);
  pinGeos.push(ringG);
  parts.push(part(merge(pinGeos), steel, { name: 'pin-ring' }));

  // three red crosses on each side of the shoulder
  const cross = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#8f2a1e';
    ctx.lineWidth = w * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * 0.2);
    ctx.lineTo(w * 0.8, h * 0.8);
    ctx.moveTo(w * 0.8, h * 0.2);
    ctx.lineTo(w * 0.2, h * 0.8);
    ctx.stroke();
  };
  const colW = (Math.PI * 2) / N_COL;
  for (const base of [Math.PI / 2, -Math.PI / 2]) {
    for (let k = -1; k <= 1; k++) {
      const th = base + k * colW;
      const y = 0.0628;
      const r = millsR(y) + 0.00035;
      const d = decal('uk-no36-cross', 0.0075, 0.0075, cross, {}, 64);
      d.position.set(r * Math.sin(th), y, r * Math.cos(th));
      const slope = (millsR(y + 0.001) - millsR(y - 0.001)) / 0.002;
      d.lookAt(d.position.clone().add(new THREE.Vector3(Math.sin(th), -slope, Math.cos(th))));
      parts.push(d);
    }
  }

  const obj = group(parts);
  obj.name = 'uk-no36m-grenade';
  return {
    id: 'uk-no36m-grenade',
    name: 'Grenade, hand, No. 36M Mk I',
    object: obj,
    mount: 'belt-front-left',
    size: { w: 0.0612, h: 0.0955, d: 0.0612 },
  };
}
