/**
 * Mk 2 ("Mk II" until April 1945) fragmentation hand grenade, 1943-44 pattern: serrated cast-iron
 * body with 40 knobs in five rows of eight columns, olive drab paint with a narrow yellow band round
 * the neck (high explosive), solid base (late-war bodies were filled through the fuze well), and the
 * M10A3 igniting fuze - unpainted fuze body, OD lever (spoon), safety pin with pull ring.
 * About 58 mm in diameter and 114 mm tall overall.
 *
 * Gear-local frame: origin at the centre of the base (the lowest point, y = 0), +Y up along the fuze
 * axis, the lever runs down the +Z side, the pull ring hangs on the +X side.
 * strapAnchors[0] = the top of the lever bend (where a grenade is hung on a strap by its lever).
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { US } from './palette';
import { sheet, merge, smoothstep, roundEnds, planarNormals } from './parts';

/** Body outline [radius, y] from the base (y = 0) to the neck collar. */
const BODY: [number, number][] = [
  [0.0, 0.0],
  [0.0105, 0.0],
  [0.0168, 0.0016],
  [0.0218, 0.005],
  [0.0256, 0.0108],
  [0.028, 0.0192],
  [0.0289, 0.0298],
  [0.0287, 0.0415],
  [0.0277, 0.0528],
  [0.0255, 0.0628],
  [0.0222, 0.0713],
  [0.0182, 0.0773],
  [0.0146, 0.0806],
  [0.0126, 0.0818],
];
/** Neck collar (painted yellow) and the fuze seat. */
const COLLAR = { r: 0.0122, y0: 0.0816, y1: 0.0878 };

const curve = new THREE.CatmullRomCurve3(BODY.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal');
const PL = curve.getLength();
const PROF = curve.getSpacedPoints(800);

/** Arc length along the profile where the outline first reaches height y (upper part: r > 0.012). */
function arcAtY(y: number): number {
  for (let i = 1; i < PROF.length; i++) if (PROF[i].y >= y && PROF[i].x > 0.012) return (i / (PROF.length - 1)) * PL;
  return PL;
}

/** Body radius at height y on the knob band (for fitting the lever). */
function bodyRAtY(y: number): number {
  let best = 0;
  for (const p of PROF) if (Math.abs(p.y - y) < 0.0006) best = Math.max(best, p.x);
  return best;
}

const G0 = 0.0007, G1 = 0.0021, DEPTH = 0.0027, DOME = 0.00065;

function bodyGeometry(): THREE.BufferGeometry {
  const sBot = arcAtY(0.0085), sTop = arcAtY(0.0742);
  const pitch = (sTop - sBot) / 5;
  const grooveS = Array.from({ length: 6 }, (_, k) => sBot + pitch * k);
  // rows (profile arc samples), crisp at the groove walls
  const sRows: number[] = [];
  const nCap = 8;
  const s0 = grooveS[0] - G1 - 0.0016;
  for (let i = 0; i <= nCap; i++) sRows.push(s0 * Math.pow(i / nCap, 0.85));
  for (let k = 0; k < 6; k++) {
    const c = grooveS[k];
    const local = [-G1, -G0, 0, G0, G1];
    for (const d of local) sRows.push(c + d);
    if (k < 5) for (const d of [G1 + 0.0016, pitch / 2, pitch - G1 - 0.0016]) sRows.push(c + d);
  }
  const sT0 = grooveS[5] + G1 + 0.0016;
  sRows.push(sT0);
  for (let i = 1; i <= 9; i++) sRows.push(sT0 + (PL - sT0) * (i / 9));
  // columns: 8 periods
  const rRef = 0.0285;
  const pa = (Math.PI * 2) / 8;
  const col: number[] = [];
  const offs = [0, G0, G1, G1 + 0.0018];
  for (let k = 0; k < 8; k++) {
    const base = k * pa;
    for (const d of offs) col.push(base + d / rRef);
    col.push(base + pa / 2);
    for (const d of [...offs].reverse()) if (d > 0) col.push(base + pa - d / rRef);
  }
  const U = col.length;
  const groove = (d: number) => 1 - smoothstep(G0, G1, d);
  const pos: number[] = [];
  for (const s of sRows) {
    const t = Math.min(1, Math.max(0, s / PL));
    const p = curve.getPointAt(t);
    const tg = curve.getTangentAt(t);
    // outward normal of the profile in the (r, y) plane
    const nr = tg.y, ny = -tg.x;
    const nl = Math.hypot(nr, ny) || 1;
    let dh = 1;
    for (const c of grooveS) dh = Math.min(dh, Math.abs(s - c));
    const inBand = s > grooveS[0] - G1 && s < grooveS[5] + G1;
    const inRows = s > grooveS[0] && s < grooveS[5];
    // position inside the knob row (0..1) for the pillow dome
    const rowF = inRows ? ((s - sBot) / pitch) % 1 : 0;
    for (const a of col) {
      let inset = 0, dome = 0;
      if (inBand) {
        const gh = groove(dh);
        let gv = 0, colF = 0;
        if (inRows) {
          const m = ((a % pa) + pa) % pa;
          const dv = Math.min(m, pa - m) * p.x;
          gv = groove(dv);
          colF = m / pa;
          dome = DOME * Math.sin(Math.PI * colF) * Math.sin(Math.PI * rowF);
        }
        inset = DEPTH * Math.max(gh, gv) * Math.min(1, p.x / 0.02);
      }
      const off = dome - inset;
      const r = p.x + (nr / nl) * off;
      const y = p.y + (ny / nl) * off;
      pos.push(r * Math.sin(a), y, r * Math.cos(a));
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < sRows.length - 1; j++)
    for (let i = 0; i < U; i++) {
      const i1 = (i + 1) % U;
      const a = j * U + i, b = j * U + i1, c = (j + 1) * U + i1, d = (j + 1) * U + i;
      idx.push(a, d, c, a, c, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const out = G.crease(g, 42);
  G.ensureOutward(out);
  return out;
}

/** The M10A3 fuze, lever, pin and ring (grenade frame). */
function fuze(): { fuzeGeo: THREE.BufferGeometry; leverGeo: THREE.BufferGeometry; wireGeo: THREE.BufferGeometry; top: THREE.Vector3 } {
  const y0 = COLLAR.y1;
  const fz: THREE.BufferGeometry[] = [];
  // body: seating flange, cylindrical body with a shallow crimp groove, top shoulder
  fz.push(
    G.lathe(
      [
        [0.0, y0 - 0.001],
        [0.0117, y0 - 0.001],
        [0.0119, y0 + 0.0012],
        [0.0112, y0 + 0.0028],
        [0.0093, y0 + 0.0032],
        [0.0092, y0 + 0.009],
        [0.0087, y0 + 0.0098],
        [0.0087, y0 + 0.0112],
        [0.0093, y0 + 0.012],
        [0.0094, y0 + 0.0188],
        [0.0086, y0 + 0.0204],
        [0.0, y0 + 0.0206],
      ],
      28,
      40,
    ),
  );
  const yP = y0 + 0.0135; // safety pin height
  const zP = 0.0079;
  // pin lugs (ears) on the lever side and the striker hinge lugs on the far side
  for (const sx of [-1, 1]) {
    const ear = G.rbox(0.0022, 0.0078, 0.0068, 0.0007, 1);
    ear.translate(sx * 0.0052, yP, zP - 0.0012);
    fz.push(ear);
    const hl = G.rbox(0.0022, 0.006, 0.0056, 0.0007, 1);
    hl.translate(sx * 0.0058, y0 + 0.0206, -0.0078);
    fz.push(hl);
  }
  fz.push(G.rod([-0.0072, y0 + 0.0212, -0.0086], [0.0072, y0 + 0.0212, -0.0086], 0.0011, 8));
  // striker head visible under the lever top
  const st = G.rbox(0.0086, 0.0034, 0.011, 0.0012, 1);
  st.translate(0, y0 + 0.0215, 0.0008);
  fz.push(st);

  // lever: hooks under the hinge pin on the far side, across the top, down the +Z side over the knobs
  const lp: THREE.Vector3[] = [];
  const push = (y: number, z: number) => lp.push(new THREE.Vector3(0, y, z));
  push(y0 + 0.0182, -0.0112);
  push(y0 + 0.0228, -0.0112);
  push(y0 + 0.0246, -0.0082);
  push(y0 + 0.0252, -0.002);
  push(y0 + 0.0248, 0.0055);
  push(y0 + 0.0228, 0.0102);
  push(y0 + 0.0185, 0.0114);
  push(y0 + 0.0105, 0.0116);
  push(y0 + 0.0035, 0.0124);
  for (const y of [0.0835, 0.0795, 0.0755, 0.0705, 0.065, 0.059, 0.053, 0.0475]) push(y, bodyRAtY(y) + 0.0013);
  const top = lp[4].clone();
  const lever = sheet(lp, planarNormals(lp, [1, 0, 0]), (t, s, L) => {
    const w = s < 0.03 ? 0.0069 : 0.0069 - 0.0009 * Math.min(1, (s - 0.03) / 0.04);
    return roundEnds(w, 0, 0.004)(t, s, L);
  }, 0.0009, { across: 4, samples: 60, bulge: -0.001 });
  const lv: THREE.BufferGeometry[] = [lever];
  // side flanges where the pin passes
  for (const sx of [-1, 1]) {
    const fl = G.extrude(
      [
        [-0.0045, -0.0068],
        [0.0038, -0.0062],
        [0.0045, 0.0065],
        [-0.0038, 0.0072],
      ],
      0.0009,
      0.0003,
    );
    fl.rotateY(Math.PI / 2);
    fl.translate(sx * 0.0072, yP, zP + 0.0016);
    lv.push(fl);
  }
  // safety pin through ears and flanges, ring on +X, split legs splayed on -X
  const wire: THREE.BufferGeometry[] = [];
  wire.push(G.rod([-0.0118, yP, zP], [0.0112, yP, zP], 0.00085, 8));
  wire.push(G.tube([[-0.0118, yP, zP], [-0.0145, yP - 0.0012, zP + 0.0022], [-0.0158, yP - 0.0034, zP + 0.0038]], 0.0008, 6, 10));
  wire.push(G.tube([[-0.0118, yP, zP], [-0.0146, yP + 0.0016, zP - 0.0008], [-0.0162, yP + 0.0028, zP - 0.0022]], 0.0008, 6, 10));
  // pin eye and pull ring (hanging down and forward on the +X side)
  const eye = G.torus(0.0022, 0.00075, 6, 16);
  eye.rotateY(Math.PI / 2);
  eye.translate(0.0133, yP, zP);
  wire.push(eye);
  const ring = G.torus(0.0118, 0.00105, 6, 40);
  ring.rotateX(Math.PI / 2);
  ring.rotateZ(-1.1);
  ring.rotateY(0.25);
  const rc = new THREE.Vector3(0.0133 + 0.0118 * Math.cos(-1.1) * 1.0, yP + 0.0118 * Math.sin(-1.1), zP + 0.003);
  ring.translate(rc.x, rc.y, rc.z);
  wire.push(ring);
  return { fuzeGeo: merge(fz), leverGeo: merge(lv), wireGeo: merge(wire), top };
}

export function buildMk2Grenade(): GearPiece {
  const parts: THREE.Object3D[] = [];
  parts.push(part(bodyGeometry(), US.grenadePaint(), { name: 'body' }));
  // yellow neck collar (fuze seat) with a small chamfer
  const collar = G.lathe(
    [
      [0.0118, COLLAR.y0 - 0.0006],
      [COLLAR.r, COLLAR.y0 + 0.0008],
      [COLLAR.r, COLLAR.y1 - 0.0009],
      [COLLAR.r - 0.0008, COLLAR.y1],
      [0.0098, COLLAR.y1],
    ],
    32,
    40,
  );
  parts.push(part(collar, US.grenadeYellow(), { name: 'collar' }));
  const f = fuze();
  parts.push(part(f.fuzeGeo, US.fuzeMetal(), { name: 'fuze' }));
  parts.push(part(f.leverGeo, US.odSteel(), { name: 'lever' }));
  parts.push(part(f.wireGeo, US.wire(), { name: 'pin' }));
  const obj = group(parts);
  obj.name = 'us-mk2-grenade';
  return {
    id: 'us-mk2-grenade',
    name: 'Mk 2 fragmentation grenade',
    object: obj,
    mount: 'chest',
    size: { w: 0.072, h: 0.114, d: 0.062 },
    strapAnchors: [f.top],
  };
}
