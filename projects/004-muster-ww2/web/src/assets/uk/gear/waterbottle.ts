/**
 * Bottle, water, Mk VII (introduced 1939: green-enamelled steel, "kidney" shaped to sit on the
 * hip, two-pint capacity, about 190 x 140 mm) in its khaki felt cover, carried in the
 * Carrier, water-bottle, W.E. Patt. '37 - the first-issue "skeleton" web cradle: a girth band, a
 * loop under the bottle across the narrow sides, a vertical loop across the faces that closes on
 * the shoulder with a press stud, and two angled chapes with brass buckles that take the brace
 * ends at the right hip. The cork is tied to a wire eye on the neck with a short cord.
 *
 * Display frame (buildWaterBottle37 with pose 'display'): the carrier stands on its base at
 * y = 0, centred on X/Z, the convex face towards +Z, the chapes hanging down the sides.
 *
 * Gear frame (pose 'worn', default): hangs on the RIGHT HIP from the brace ends. +Z away from the
 * body, +Y up, the concave back face of the felt cover on z = 0; ORIGIN = midpoint between the
 * top bars of the two buckles (the brace ends pass through them); strapAnchors = the two buckle
 * top-bar centres (+X side first).
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { UK } from './palette';
import { sweepSurface, snoise, sstep, clamp01 } from './soft';
import { stitches, overcast, gateBuckle, pressStud, placeOn, frameAt, merge, boxX } from './helpers';

/** Felt-covered bottle dimensions (m). */
export const MK7_BOTTLE = {
  /** Half width / half depth of the felt body, height of the felt shoulder seam, neck. */
  a: 0.0705,
  b: 0.0345,
  /** Back-face concavity (kidney shape). */
  kidney: 0.0075,
  height: 0.1875,
  neckR: 0.0142,
  neckTop: 0.2035,
  girthY: 0.096,
};
const F = MK7_BOTTLE;
const SE = 2.9; // section superellipse exponent

const YS = 0.161; // top of the straight sides
const RC = 0.021; // shoulder corner radius (across the width)
const RCB = 0.016; // shoulder corner radius (across the depth)
const Y_TOP = YS + RC; // edge of the gently domed top
/** Section half axes at height y (felt surface). */
function section(y: number): { a: number; b: number; e: number } {
  const rb = 0.013;
  if (y < rb) {
    const t = y / rb;
    const k = Math.sqrt(Math.max(0, 1 - (1 - t) ** 2));
    return { a: F.a - rb + rb * k, b: F.b - rb * 0.55 + rb * 0.55 * k, e: SE };
  }
  if (y <= YS) return { a: F.a, b: F.b, e: SE };
  const nr = F.neckR + 0.0032;
  if (y <= Y_TOP) {
    // rounded shoulder corners
    const d = y - YS;
    const a = F.a - RC + Math.sqrt(Math.max(0, RC * RC - d * d));
    const db = (d * RCB) / RC;
    const b = F.b - RCB + Math.sqrt(Math.max(0, RCB * RCB - db * db));
    return { a, b, e: SE - 0.3 * (d / RC) };
  }
  // gently domed top rising to the neck
  const t = clamp01((y - Y_TOP) / (F.height - Y_TOP));
  const k = Math.pow(t, 0.7);
  const a0 = F.a - RC, b0 = F.b - RCB;
  return { a: a0 + (nr - a0) * k, b: b0 + (nr - b0) * k, e: SE - 0.3 + (2 - SE + 0.3) * k };
}

/** Felt surface point for u in [0, 1) around (0 = +X side, 0.25 = front +Z) at height y, lifted by `lift`. */
export function feltPoint(u: number, y: number, lift = 0): { p: THREE.Vector3; n: THREE.Vector3 } {
  const q = (uu: number, yy: number) => {
    const s = section(Math.max(0, yy));
    const th = uu * Math.PI * 2;
    const c = Math.cos(th), sn = Math.sin(th);
    const x = s.a * Math.sign(c) * Math.pow(Math.abs(c), 2 / s.e);
    let z = s.b * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / s.e);
    // kidney: the whole section bows towards +Z in the middle (concave back, fuller front)
    const bow = F.kidney * (1 - (x / F.a) ** 2) * sstep(0.0, 0.03, yy) * (1 - sstep(YS, F.height, yy));
    z += bow;
    // felt irregularity
    const r = 0.00035 * snoise(x * 60, yy * 60, z * 60, 5) * sstep(0.01, 0.03, yy);
    const d = new THREE.Vector3(x, 0, z - F.kidney * 0.5);
    const l = d.length() || 1;
    return new THREE.Vector3(x + (d.x / l) * r, yy, z + (d.z / l) * r);
  };
  const p = q(u, y);
  const e = 1e-4;
  const du = q(u + e, y).sub(q(u - e, y));
  const dy = q(u, y + e).sub(q(u, Math.max(0, y - e)));
  const n = new THREE.Vector3().crossVectors(du, dy).normalize();
  if (n.dot(new THREE.Vector3(p.x, 0, p.z - F.kidney)) < 0 && y > 0.02) n.negate();
  if (y <= 0.0001) n.set(0, -1, 0);
  return { p: p.addScaledVector(n, lift), n };
}

function feltGeometry(): THREE.BufferGeometry {
  const vs: number[] = [];
  const add = (a: number, b: number, n: number) => {
    for (let i = 0; i < n; i++) vs.push(a + ((b - a) * i) / n);
  };
  add(0, 0.013, 6);
  add(0.013, YS, 16);
  add(YS, Y_TOP, 8);
  add(Y_TOP, F.height, 6);
  vs.push(F.height);
  const NU = 64;
  const g = sweepSurface((u, v) => feltPoint(u, v).p, NU, 0, {
    vs,
    poleStart: new THREE.Vector3(0, 0, F.kidney * 0.5),
    outward: (p) => new THREE.Vector3(p.x, 0, p.z - F.kidney * 0.5),
  });
  // a turned-in lip where the felt meets the neck
  const lip = sweepSurface((u, v) => {
    const top = feltPoint(u, F.height).p;
    const c = new THREE.Vector3(0, top.y, 0);
    const d = top.clone().sub(c);
    return c.add(d.multiplyScalar(1 - 0.12 * v)).add(new THREE.Vector3(0, -0.003 * v, 0));
  }, NU, 1, { outward: () => new THREE.Vector3(0, 1, 0) });
  return merge([g, lip]);
}

export type BottlePose = 'worn' | 'display';

export interface WaterBottle37Options {
  /** 'worn' (default): gear frame, chapes pulled up to the brace ends. 'display': standing, chapes hanging. */
  pose?: BottlePose;
}

const WEB_T = 0.0022;

export function buildWaterBottle37(opts: WaterBottle37Options = {}): GearPiece {
  const pose = opts.pose ?? 'worn';
  const web = UK.webStrap(), thread = UK.thread(), brass = UK.brass();
  const parts: THREE.Object3D[] = [part(feltGeometry(), UK.felt(), { name: 'felt' })];

  // ---- felt seams: whip-stitched round the narrow sides and bottom, and round the shoulder ----
  const fThread = UK.feltThread();
  {
    const pts: THREE.Vector3[] = [], fn: THREE.Vector3[] = [], en: THREE.Vector3[] = [];
    // side seam: up the +X side from the bottom, and the -X side
    for (const u of [0, 0.5]) {
      pts.length = 0; fn.length = 0; en.length = 0;
      for (let i = 0; i <= 30; i++) {
        const y = 0.006 + ((F.height - 0.02) * i) / 30;
        const f = feltPoint(u, y, 0.0002);
        pts.push(f.p);
        en.push(f.n);
        fn.push(new THREE.Vector3(0, 0, 1));
      }
      parts.push(part(overcast(pts.slice(), en.slice(), 0.0026, 0.0065, 0.0006), fThread));
    }
    // bottom seam across the base (under the bottle) and the shoulder seam round the neck
    const sh: THREE.Vector3[] = [], shf: THREE.Vector3[] = [], she: THREE.Vector3[] = [];
    const ySh = Y_TOP - 0.004;
    for (let i = 0; i <= 64; i++) {
      const f = feltPoint(i / 64, ySh, 0.0002);
      sh.push(f.p);
      she.push(f.n);
      shf.push(new THREE.Vector3(0, 1, 0));
    }
    parts.push(part(overcast(sh, she, 0.0024, 0.0062, 0.0006), fThread));
    void shf;
    void fn;
  }

  // ---- enamelled neck, cork, cord ----
  const enamel = UK.enamel();
  const R = F.neckR, top = F.neckTop;
  const neck = G.lathe([[R + 0.004, F.height - 0.006], [R + 0.0006, F.height + 0.002], [R, top - 0.004], [R + 0.0011, top - 0.0025], [R + 0.0012, top - 0.0008], [R + 0.0004, top], [R - 0.0022, top], [R - 0.0024, top - 0.004]], 32, 40);
  parts.push(part(neck, enamel, { name: 'neck' }));
  // wire eye for the cork cord, soldered behind the spout on the left
  const eyeP = new THREE.Vector3(Math.sin(-0.6) * (R + 0.0012), top - 0.0095, -Math.cos(-0.6) * (R + 0.0012));
  const eye = G.torus(0.0022, 0.0006, 5, 14);
  eye.rotateY(-0.6);
  eye.translate(eyeP.x, eyeP.y, eyeP.z);
  parts.push(part(eye, UK.tin()));
  const cork = G.lathe([[0.0098, top - 0.014], [0.0112, top - 0.004], [0.0118, top + 0.002], [0.0124, top + 0.0105], [0.0118, top + 0.0112], [0, top + 0.0112]], 28, 50);
  parts.push(part(cork, UK.cork(), { name: 'cork' }));
  const capTop = top + 0.0112;
  const cap = G.lathe([[0, capTop + 0.0016], [0.0118, capTop + 0.0016], [0.0128, capTop + 0.0008], [0.0128, capTop - 0.0012], [0.0122, capTop - 0.0014], [0.0122, capTop]], 28, 40);
  const capEye = G.torus(0.0028, 0.0007, 5, 14);
  capEye.translate(0, capTop + 0.0016 + 0.0024, 0);
  parts.push(part(merge([cap, capEye]), UK.tin()));
  // cord: tied through the cap eye, a short loose loop down the back of the neck to the wire eye
  const ce = new THREE.Vector3(0, capTop + 0.0052, 0);
  const cordPts = [
    ce,
    ce.clone().add(new THREE.Vector3(-0.004, 0.0015, -0.003)),
    new THREE.Vector3(-0.012, capTop - 0.002, -0.012),
    new THREE.Vector3(-0.019, F.height + 0.004, -0.014),
    new THREE.Vector3(-0.022, F.height - 0.004, -0.004),
    new THREE.Vector3(-0.017, F.height + 0.001, -0.019),
    new THREE.Vector3(eyeP.x - 0.003, eyeP.y - 0.002, eyeP.z - 0.004),
    eyeP.clone(),
  ];
  parts.push(part(G.tube(cordPts, 0.0011, 6, 70), UK.lanyard()));
  parts.push(part(new THREE.SphereGeometry(0.0022, 10, 8).translate(eyeP.x - 0.0012, eyeP.y - 0.0022, eyeP.z - 0.0014), UK.lanyard()));

  // ---- the skeleton carrier ----
  const webGeos: THREE.BufferGeometry[] = [];
  const stitchGeos: THREE.BufferGeometry[] = [];
  // side loop: across the narrow sides and under the bottom (lowest layer)
  const sideW = 0.021;
  {
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    const up = F.girthY + 0.016;
    for (let i = 0; i <= 10; i++) {
      const y = up - ((up - 0.014) * i) / 10;
      const f = feltPoint(0, y, WEB_T / 2 + 0.0004);
      pts.push(f.p);
      nrm.push(f.n);
    }
    const bot = (x: number) => new THREE.Vector3(x, -(WEB_T / 2 + 0.0004), F.kidney * 0.5);
    const corner = (s: number) => {
      const out: THREE.Vector3[] = [];
      for (let k = 1; k <= 4; k++) {
        const a = (k / 5) * (Math.PI / 2);
        out.push(new THREE.Vector3(s * (F.a - 0.013 + (0.013 + WEB_T / 2 + 0.0004) * Math.cos(a)), 0.013 - (0.013 + WEB_T / 2 + 0.0004) * Math.sin(a), F.kidney * 0.5));
      }
      return out;
    };
    for (const p of corner(1)) { pts.push(p); nrm.push(new THREE.Vector3(p.x - (F.a - 0.013), p.y - 0.013, 0).normalize()); }
    for (let i = 0; i <= 8; i++) { pts.push(bot(F.a - 0.02 - ((2 * F.a - 0.04) * i) / 8)); nrm.push(new THREE.Vector3(0, -1, 0)); }
    const c2 = corner(-1).reverse();
    for (const p of c2) { pts.push(p); nrm.push(new THREE.Vector3(p.x + (F.a - 0.013), p.y - 0.013, 0).normalize()); }
    for (let i = 10; i >= 0; i--) {
      const y = up - ((up - 0.014) * i) / 10;
      const f = feltPoint(0.5, y, WEB_T / 2 + 0.0004);
      pts.push(f.p);
      nrm.push(f.n);
    }
    webGeos.push(G.strap(pts, sideW, WEB_T, nrm, { samples: 140 }));
  }
  // face loop: down the front, under the bottom (over the side loop), up the back, over the
  // shoulders to a press-stud closure beside the neck
  const faceW = 0.024;
  const faceLift = (y: number) => WEB_T / 2 + 0.0004 + (y < 0.004 ? WEB_T : 0);
  let studAt = new THREE.Vector3(), studN = new THREE.Vector3(0, 1, 0), studDir = new THREE.Vector3(1, 0, 0);
  {
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    const frontU = 0.25, backU = 0.75;
    const shoulderX = 0.021;
    // front: from the top (beside the neck) down
    const yTop = F.height - 0.004;
    for (let i = 0; i <= 16; i++) {
      const y = yTop - ((yTop - 0.013) * i) / 16;
      // near the shoulder, slide round towards +X to pass beside the neck
      const k = sstep(0.14, yTop, y);
      const f = feltPoint(frontU - 0.045 * k, y, faceLift(y));
      if (k > 0) f.p.x = Math.max(f.p.x, shoulderX * k);
      pts.push(f.p);
      nrm.push(f.n);
    }
    for (let k = 1; k <= 3; k++) {
      const a = (k / 4) * (Math.PI / 2);
      const r = 0.013 + faceLift(0) + 0.0002;
      const p = new THREE.Vector3(0, 0.013 - r * Math.sin(a), F.b + F.kidney - 0.013 + r * Math.cos(a) - 0.0015);
      pts.push(p);
      nrm.push(new THREE.Vector3(0, -Math.sin(a), Math.cos(a)));
    }
    for (let i = 0; i <= 6; i++) {
      const z = F.b + F.kidney * 0.9 - 0.016 - ((2 * F.b + F.kidney * 0.2 - 0.032) * i) / 6;
      pts.push(new THREE.Vector3(0, -faceLift(0), z));
      nrm.push(new THREE.Vector3(0, -1, 0));
    }
    for (let k = 3; k >= 1; k--) {
      const a = (k / 4) * (Math.PI / 2);
      const r = 0.013 + faceLift(0) + 0.0002;
      const p = new THREE.Vector3(0, 0.013 - r * Math.sin(a), -(F.b - 0.013 + r * Math.cos(a)) + F.kidney * 0.1);
      pts.push(p);
      nrm.push(new THREE.Vector3(0, -Math.sin(a), -Math.cos(a)));
    }
    for (let i = 0; i <= 16; i++) {
      const y = 0.013 + ((yTop - 0.013) * i) / 16;
      const k = sstep(0.14, yTop, y);
      const f = feltPoint(backU + 0.045 * k, y, faceLift(y));
      if (k > 0) f.p.x = Math.max(f.p.x, shoulderX * k);
      pts.push(f.p);
      nrm.push(f.n);
    }
    // overlap over the shoulder: the front end laps over the back end
    webGeos.push(G.strap(pts, faceW, WEB_T, nrm, { samples: 170 }));
    const tf = feltPoint(0.2, yTop - 0.002, faceLift(yTop) + WEB_T);
    studAt = tf.p.clone().add(new THREE.Vector3(shoulderX - tf.p.x, 0, -0.004));
    studN = tf.n.clone();
    studDir = new THREE.Vector3(0, 0, 1);
  }
  // girth band on top of both loops (lifts over the crossings)
  const girthW = 0.03;
  {
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    const N = 72;
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const th = u * Math.PI * 2;
      const nearSide = Math.max(Math.exp(-((Math.min(Math.abs(th), Math.abs(th - Math.PI * 2)) / 0.22) ** 2)), Math.exp(-(((th - Math.PI) / 0.22) ** 2)));
      const nearFace = Math.max(Math.exp(-(((th - Math.PI / 2) / 0.25) ** 2)), Math.exp(-(((th - 1.5 * Math.PI) / 0.25) ** 2)));
      const f = feltPoint(u, F.girthY, WEB_T / 2 + 0.0004 + WEB_T * Math.max(nearSide, nearFace) * 1.05);
      pts.push(f.p);
      nrm.push(f.n);
    }
    webGeos.push(G.strap(pts, girthW, WEB_T, nrm, { closed: true, samples: 144 }));
    // edge stitching along the band
    for (const dy of [-girthW / 2 + 0.0025, girthW / 2 - 0.0025]) {
      const sp: THREE.Vector3[] = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const th = u * Math.PI * 2;
        const nearSide = Math.max(Math.exp(-((Math.min(Math.abs(th), Math.abs(th - Math.PI * 2)) / 0.22) ** 2)), Math.exp(-(((th - Math.PI) / 0.22) ** 2)));
        const nearFace = Math.max(Math.exp(-(((th - Math.PI / 2) / 0.25) ** 2)), Math.exp(-(((th - 1.5 * Math.PI) / 0.25) ** 2)));
        sp.push(feltPoint(u, F.girthY + dy, WEB_T + 0.0006 + WEB_T * Math.max(nearSide, nearFace) * 1.05).p);
      }
      stitchGeos.push(stitches(sp, { len: 0.0032, gap: 0.0022, r: 0.00045 }));
    }
  }
  // press stud closing the face loop on the shoulder
  parts.push(part(placeOn(pressStud(0.0052, 0.0024), studAt.clone().addScaledVector(studN, WEB_T / 2), studN, studDir), brass));

  // chapes + buckles at the sides
  const anchors: THREE.Vector3[] = [];
  const buckleGeos: THREE.BufferGeometry[] = [];
  for (const side of [1, -1]) {
    const base = feltPoint(side > 0 ? 0 : 0.5, F.girthY + 0.004, WEB_T * 2.6);
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    pts.push(base.p.clone().add(new THREE.Vector3(0, -0.012, 0)), base.p.clone());
    nrm.push(new THREE.Vector3(side, 0, 0), new THREE.Vector3(side, 0, 0));
    let dir: THREE.Vector3;
    if (pose === 'worn') {
      // angled up and outwards, pulled by the brace end
      dir = new THREE.Vector3(side * 0.55, 0.83, 0).normalize();
      for (const s of [0.02, 0.045, 0.068]) {
        const q = base.p.clone().add(new THREE.Vector3(side * 0.004, 0.006, 0)).addScaledVector(dir, s);
        pts.push(q);
        nrm.push(new THREE.Vector3(side * 0.83, -0.55, 0).normalize());
      }
    } else {
      // standing display: the chape flops over and hangs down the side
      dir = new THREE.Vector3(side * 0.12, -1, 0).normalize();
      pts.push(base.p.clone().add(new THREE.Vector3(side * 0.006, 0.012, 0)), base.p.clone().add(new THREE.Vector3(side * 0.013, 0.006, 0)));
      nrm.push(new THREE.Vector3(side * 0.3, 1, 0).normalize(), new THREE.Vector3(side, 0.4, 0).normalize());
      for (const dy of [-0.012, -0.034, -0.052]) {
        pts.push(base.p.clone().add(new THREE.Vector3(side * (0.014 + 0.004 * (-dy / 0.052)), dy, 0)));
        nrm.push(new THREE.Vector3(side, 0.12, 0).normalize());
      }
    }
    webGeos.push(G.strap(pts, 0.024, WEB_T, nrm, { samples: 40 }));
    const Lc = new THREE.CatmullRomCurve3(pts, false, 'centripetal').getLength();
    const fe = frameAt(pts, nrm, Lc);
    const fb = frameAt(pts, nrm, Lc - 0.009);
    // buckle: the chape end wraps its top bar; frame lies on the strap face
    const bk = gateBuckle(0.031, 0.019);
    bk.rotateZ(Math.PI); // open side towards the strap end
    const bc = fb.p.clone().addScaledVector(fb.n, WEB_T / 2 + 0.0009);
    buckleGeos.push(placeOn(bk, bc, fb.n, fb.t));
    // turned-back end sewn down under the buckle
    webGeos.push(G.strap([fe.p.clone().addScaledVector(fe.n, -WEB_T), fb.p.clone().addScaledVector(fb.n, -WEB_T).addScaledVector(fb.t, -0.012)], 0.024, WEB_T, fe.n, { samples: 4 }));
    stitchGeos.push(placeOn(boxX(0, 0, 0.018, 0.012, 0), fb.p.clone().addScaledVector(fb.t, -0.024).addScaledVector(fb.n, WEB_T / 2 + 0.0003), fb.n, fb.t));
    anchors.push(bc.clone().addScaledVector(fb.t, 0.012 - 0.0014));
  }
  parts.push(part(merge(webGeos), web, { name: 'carrier' }));
  parts.push(part(merge(stitchGeos), thread));
  parts.push(part(merge(buckleGeos), brass));

  const inner = group(parts);
  let object: THREE.Group;
  let strapAnchors: THREE.Vector3[] = [];
  if (pose === 'display') {
    object = group([inner]);
  } else {
    // gear frame: back face (concave felt + straps) on z = 0, origin between the buckles
    const box = new THREE.Box3().setFromObject(inner, true);
    const mid = anchors[0].clone().add(anchors[1]).multiplyScalar(0.5);
    inner.position.set(-mid.x, -mid.y, -box.min.z);
    object = group([inner]);
    strapAnchors = anchors.map((a) => a.clone().add(inner.position));
  }
  object.name = 'uk-water-bottle-37';
  const size = new THREE.Box3().setFromObject(object, true).getSize(new THREE.Vector3());
  return {
    id: 'uk-water-bottle-37',
    name: 'Water bottle Mk VII in 1937-pattern carrier',
    object,
    mount: 'hip',
    size: { w: size.x, h: size.y, d: size.z },
    strapAnchors,
  };
}
