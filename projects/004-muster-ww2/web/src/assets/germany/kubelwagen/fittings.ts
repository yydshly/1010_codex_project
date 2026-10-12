/**
 * External fittings of the Type 82: folding windscreen of safety glass with wiper and the two
 * direction indicators on its outer ends (TM E9-803 par. 8i, 116b), headlamps on the front
 * wheel guards, Notek blackout lamp on the front panel left of the spare wheel, spare wheel on
 * the front body panel, folded canvas top with bows and straps on the rear deck, tail lamps and
 * the convoy (distance) lamp on the engine lid.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, type V3, merge } from './util';
import { spareWheel } from './wheels';

const HW = D.halfW;

// ------------------------------------------------------------------ profile frames
const unit = (a: V2, b: V2): V2 => {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};
/** (z, y) directions of the front face (spare-wheel panel) and the rear engine panel. */
const faceDir = unit(D.brkF, D.noseF);
const slopeDir = unit(D.brkR, D.tailR);
const deckSlope = (D.cowl[1] - D.brkF[1]) / (D.brkF[0] - D.cowl[0]);
/** Height of the front deck at z. */
const deckY = (z: number) => D.cowl[1] - (z - D.cowl[0]) * deckSlope;
/** Point on the front face at distance s from the break, lifted by h along its outward normal. */
const onFace = (x: number, s: number, h = 0) =>
  new THREE.Vector3(x, D.brkF[1] + faceDir[1] * s + faceDir[0] * h, D.brkF[0] + faceDir[0] * s - faceDir[1] * h);
/** Point on the engine panel at distance v from the rear break, lifted by h (up/back). */
const onSlope = (x: number, v: number, h = 0) =>
  new THREE.Vector3(x, D.brkR[1] + slopeDir[1] * v - slopeDir[0] * h, D.brkR[0] + slopeDir[0] * v + slopeDir[1] * h);
const faceN = new THREE.Vector3(0, faceDir[0], -faceDir[1]).normalize();
const slopeN = new THREE.Vector3(0, -slopeDir[0], slopeDir[1]).normalize();

/** Matrix mapping a local frame (x across, y up the panel, z outward normal) onto a panel point. */
function panelMatrix(origin: THREE.Vector3, up: THREE.Vector3, n: THREE.Vector3): THREE.Matrix4 {
  const x = up.clone().cross(n).normalize();
  const y = n.clone().cross(x).normalize();
  return new THREE.Matrix4().makeBasis(x, y, n).setPosition(origin);
}

// ------------------------------------------------------------------ windscreen
function windscreen(): THREE.Object3D {
  const paint: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const rub: THREE.BufferGeometry[] = [];
  const W = 0.76, H0 = 0.012, H1 = 0.392;
  const outer: V2[] = [[-W, H0], [W, H0], [W, H1], [-W, H1]];
  const hole: V2[] = [[-W + 0.03, H0 + 0.03], [W - 0.03, H0 + 0.03], [W - 0.03, H1 - 0.03], [-W + 0.03, H1 - 0.03]];
  // frame: channel section = outer lip + inner lip (two thin frames) + web
  const lip = (d: number, z: number, inset: number) => {
    const o2 = outer.map(([x, y]) => [x * (1 - inset / W), y] as V2);
    const g = G.extrude(G.shape(o2, 0.028, [hole]), d, 0.0022, 6, 2);
    g.translate(0, 0, z);
    return g;
  };
  paint.push(lip(0.009, 0.0085, 0));
  paint.push(lip(0.009, -0.0085, 0));
  paint.push(lip(0.01, 0, 0.004));
  // glass pane of safety glass seated in the channel
  const glass = G.extrude(G.shape([[-W + 0.018, H0 + 0.018], [W - 0.018, H0 + 0.018], [W - 0.018, H1 - 0.018], [-W + 0.018, H1 - 0.018]], 0.02), 0.006, 0.0015, 6, 1);
  // hinges at the base (knuckles on the frame, brackets on the cowl)
  for (const s of [1, -1]) {
    steel.push(G.cyl(0.011, 0.011, 0.07, 14).rotateZ(Math.PI / 2).translate(s * 0.66, 0.0, 0.0));
    paint.push(G.rbox(0.05, 0.03, 0.012, 0.003, 1).translate(s * 0.66, 0.018, 0.0));
    // locking stay with wing nut at each outer end
    paint.push(G.rbox(0.012, 0.09, 0.02, 0.004, 1).translate(s * (W + 0.008), 0.07, -0.006));
    steel.push(G.cyl(0.006, 0.006, 0.024, 10).rotateZ(Math.PI / 2).translate(s * (W + 0.02), 0.08, -0.006));
    steel.push(G.rbox(0.006, 0.012, 0.04, 0.002, 1).translate(s * (W + 0.034), 0.08, -0.006));
    // direction indicator (trafficator) housing on the outer end of the frame, arm folded in
    paint.push(G.rbox(0.02, 0.17, 0.03, 0.007, 2).translate(s * (W + 0.012), 0.25, 0.0));
    rub.push(G.rbox(0.006, 0.14, 0.018, 0.002, 1).translate(s * (W + 0.0225), 0.25, 0.0));
  }
  // wiper: motor on the inside of the top rail (driver side), arm + blade outside
  const xw = 0.33;
  black.push(G.cyl(0.028, 0.028, 0.07, 18).rotateZ(Math.PI / 2).translate(xw, H1 - 0.03, -0.035));
  black.push(G.rbox(0.05, 0.04, 0.03, 0.006, 1).translate(xw - 0.05, H1 - 0.03, -0.03));
  steel.push(G.cyl(0.006, 0.006, 0.04, 10).rotateX(Math.PI / 2).translate(xw, H1 - 0.035, 0.0));
  const armEnd: V3 = [xw + 0.05, H1 - 0.25, 0.016];
  steel.push(G.rod([xw, H1 - 0.035, 0.018], armEnd, 0.0035, 8));
  steel.push(G.rbox(0.012, 0.23, 0.006, 0.002, 1).rotateZ(G.deg(-11)).translate(armEnd[0] + 0.005, armEnd[1] + 0.04, 0.016));
  rub.push(G.rbox(0.004, 0.22, 0.008, 0.0015, 1).rotateZ(G.deg(-11)).translate(armEnd[0] + 0.005, armEnd[1] + 0.04, 0.011));
  const rake = G.deg(-12);
  const m = new THREE.Matrix4().makeTranslation(0, D.belt + 0.012, D.cowl[0] - 0.008).multiply(new THREE.Matrix4().makeRotationX(rake));
  const out: THREE.Object3D[] = [
    part(merge(paint).applyMatrix4(m), P.body()),
    part(merge(steel).applyMatrix4(m), P.darkSteel()),
    part(merge(black).applyMatrix4(m), P.black()),
    part(merge(rub).applyMatrix4(m), P.rubber()),
    part(glass.applyMatrix4(m), P.glass()),
  ];
  // hinge brackets on the cowl (body side of the hinge)
  const br: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    br.push(G.rbox(0.03, 0.022, 0.05, 0.004, 1).translate(s * 0.705, D.belt + 0.006, D.cowl[0] - 0.008));
    br.push(G.rbox(0.03, 0.022, 0.05, 0.004, 1).translate(s * 0.615, D.belt + 0.006, D.cowl[0] - 0.008));
  }
  out.push(part(merge(br), P.body()));
  return group(out);
}

// ------------------------------------------------------------------ lamps
function headlamp(x: number): { paint: THREE.BufferGeometry[]; refl: THREE.BufferGeometry[]; glass: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const z = 1.245;
  const y0 = deckY(z);
  const yc = y0 + 0.14;
  const paint: THREE.BufferGeometry[] = [];
  const refl: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  // pressed foot on the wheel guard + stem
  paint.push(G.lathe([[0.05, 0], [0.048, 0.008], [0.03, 0.018], [0.018, 0.03], [0.016, 0.04]], 24, 40).translate(x, y0 - 0.002, z - 0.01));
  paint.push(G.cyl(0.016, 0.016, 0.05, 14).translate(x, y0 + 0.055, z - 0.01));
  // bucket (axis +Z) and chrome-free steel rim
  const bucket = G.lathe(
    [
      [0.0, -0.085],
      [0.03, -0.083],
      [0.055, -0.072],
      [0.072, -0.052],
      [0.082, -0.026],
      [0.086, 0.0],
      [0.087, 0.006],
    ],
    40,
    35,
  );
  bucket.rotateX(Math.PI / 2);
  paint.push(bucket.translate(x, yc, z));
  const rim = G.lathe([[0.0835, 0.0], [0.09, 0.0], [0.092, 0.006], [0.09, 0.014], [0.082, 0.018], [0.078, 0.016]], 48, 40);
  rim.rotateX(Math.PI / 2);
  paint.push(rim.translate(x, yc, z + 0.004));
  // reflector (inside) and domed lens
  const r = G.lathe(([[0.012, -0.06], [0.03, -0.052], [0.05, -0.034], [0.066, -0.012], [0.078, 0.008]] as V2[]).reverse(), 40, 60);
  r.rotateX(Math.PI / 2);
  refl.push(r.translate(x, yc, z));
  refl.push(new THREE.SphereGeometry(0.012, 14, 10).translate(x, yc, z - 0.02));
  const lens = G.lathe([[0.0, 0.012], [0.03, 0.0115], [0.06, 0.008], [0.08, 0.003], [0.081, 0.0]].reverse() as V2[], 48, 60);
  lens.rotateX(Math.PI / 2);
  glass.push(lens.translate(x, yc, z + 0.012));
  // rim screw at the bottom
  steel.push(G.cyl(0.004, 0.004, 0.008, 8).translate(x, yc - 0.092, z + 0.01));
  return { paint, refl, glass, steel };
}

/** Notek blackout driving lamp on the front panel, left of the spare wheel. */
function notek(): { paint: THREE.BufferGeometry[]; black: THREE.BufferGeometry[]; glass: THREE.BufferGeometry[] } {
  const paint: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const x = 0.53;
  const base = onFace(x, 0.24, 0.0);
  const c = new THREE.Vector3(x, base.y + 0.06, base.z + 0.035);
  // bracket from the panel to the lamp
  paint.push(G.rbox(0.05, 0.06, 0.004, 0.0015, 1).applyMatrix4(panelMatrix(base.clone(), new THREE.Vector3(0, -faceDir[1], -faceDir[0]), faceN)));
  paint.push(G.rod([x, base.y + 0.004, base.z + 0.004], [x, c.y - 0.03, c.z - 0.02], 0.009, 10));
  // housing: short cylinder with a rounded back, axis +Z
  const body = G.lathe([[0.0, -0.06], [0.028, -0.058], [0.045, -0.048], [0.052, -0.03], [0.053, 0.02], [0.056, 0.024], [0.056, 0.03], [0.0, 0.03]], 36, 35);
  body.rotateX(Math.PI / 2);
  paint.push(body.translate(c.x, c.y, c.z));
  // hood over the front with the narrow horizontal light slot below
  const arcPts: V2[] = [];
  for (let i = 0; i <= 18; i++) arcPts.push([0.059 * Math.cos((Math.PI * i) / 18), 0.059 * Math.sin((Math.PI * i) / 18)]);
  for (let i = 18; i >= 0; i--) arcPts.push([0.0545 * Math.cos((Math.PI * i) / 18), 0.0545 * Math.sin((Math.PI * i) / 18)]);
  const hood = G.extrude(G.shape(arcPts), 0.05, 0.001, 4, 1);
  paint.push(hood.translate(c.x, c.y - 0.004, c.z + 0.052));
  // painted front cover with the narrow light slit low down (dark recess behind a clear lens)
  paint.push(G.cyl(0.053, 0.053, 0.004, 36).rotateX(Math.PI / 2).translate(c.x, c.y, c.z + 0.031));
  paint.push(G.rbox(0.084, 0.006, 0.012, 0.002, 1).translate(c.x, c.y - 0.018, c.z + 0.036));
  black.push(G.rbox(0.078, 0.014, 0.004, 0.002, 1).translate(c.x, c.y - 0.029, c.z + 0.0335));
  glass.push(G.rbox(0.078, 0.014, 0.003, 0.0012, 1).translate(c.x, c.y - 0.029, c.z + 0.036));
  return { paint, black, glass };
}

/** Tail lamps on the engine panel and the convoy (distance) lamp on the engine lid. */
function rearLamps(): { paint: THREE.BufferGeometry[]; red: THREE.BufferGeometry[]; black: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[] } {
  const paint: THREE.BufferGeometry[] = [];
  const red: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, -slopeDir[1], -slopeDir[0]).normalize();
  for (const s of [1, -1]) {
    const x = s * 0.6;
    const base = onSlope(x, 0.6, 0);
    // bracket, then a lamp housing that faces straight back (-Z)
    paint.push(G.rbox(0.06, 0.05, 0.004, 0.0015, 1).applyMatrix4(panelMatrix(base.clone(), up, slopeN)));
    const c = new THREE.Vector3(x, base.y + 0.03, base.z - 0.04);
    paint.push(G.rod(base.clone().addScaledVector(slopeN, 0.002), c.clone().add(new THREE.Vector3(0, -0.01, 0.015)), 0.008, 8));
    paint.push(G.rbox(0.085, 0.06, 0.05, 0.012, 2).translate(c.x, c.y, c.z));
    red.push(G.rbox(0.066, 0.024, 0.006, 0.003, 1).translate(c.x, c.y + 0.012, c.z - 0.026));
    red.push(G.rbox(0.066, 0.018, 0.006, 0.003, 1).translate(c.x, c.y - 0.014, c.z - 0.026));
    steel.push(G.cyl(0.004, 0.004, 0.006, 8).rotateX(Math.PI / 2).translate(c.x + 0.036, c.y, c.z - 0.026));
  }
  // convoy lamp on the lid below the louvres: four small windows
  {
    const base = onSlope(0, 0.545, 0);
    const c = onSlope(0, 0.545, 0.052);
    const m = panelMatrix(c, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1));
    paint.push(G.rod(base.clone().add(new THREE.Vector3(0.05, 0, 0)), c.clone().add(new THREE.Vector3(0.05, -0.01, 0.012)), 0.007, 8));
    paint.push(G.rod(base.clone().add(new THREE.Vector3(-0.05, 0, 0)), c.clone().add(new THREE.Vector3(-0.05, -0.01, 0.012)), 0.007, 8));
    const g1 = G.rbox(0.16, 0.06, 0.04, 0.01, 2);
    paint.push(g1.applyMatrix4(m));
    const w: THREE.BufferGeometry[] = [];
    for (const dx of [-0.045, -0.018, 0.018, 0.045]) w.push(G.rbox(0.014, 0.022, 0.006, 0.002, 1).translate(dx, 0.004, 0.02));
    black.push(G.rbox(0.13, 0.036, 0.004, 0.002, 1).translate(0, 0.004, 0.019).applyMatrix4(m));
    red.push(merge(w).applyMatrix4(m));
  }
  return { paint, red, black, steel };
}

// ------------------------------------------------------------------ spare wheel
function spare(): THREE.Object3D[] {
  const s = 0.27, lift = 0.094;
  const c = onFace(0, s, lift);
  const up = new THREE.Vector3(0, -faceDir[1], -faceDir[0]).normalize(); // towards the top of the panel
  // wheel-local: X = axle (outwards, along the panel normal), Y = up the panel, Z = X x Y
  const X = faceN.clone(), Y = up.clone(), Z = X.clone().cross(Y).normalize();
  const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(c);
  const out = spareWheel(m);
  // mounting pedestal (pressed steel) from the panel to the disc, clamp ring
  const ped = G.lathe([[0.1, 0], [0.095, 0.01], [0.065, 0.03], [0.058, 0.07], [0.058, 0.09]], 32, 40);
  // lathe axis +Y -> panel normal
  const pm = new THREE.Matrix4().makeBasis(Z, X, Y).setPosition(onFace(0, s, 0.0));
  out.push(part(ped.applyMatrix4(pm), P.body()));
  return out;
}

// ------------------------------------------------------------------ folded top
function foldedTop(): THREE.Object3D[] {
  const zc = -0.985, y0 = D.belt + 0.001;
  const halfX = 0.7, hz = 0.152, hy = 0.087;
  const nx = 30, nr = 56;
  const secs: THREE.Vector3[][] = [];
  for (let i = 0; i <= nx; i++) {
    const x = -halfX + (2 * halfX * i) / nx;
    const e = Math.abs(x) > halfX - 0.1 ? Math.sqrt(Math.max(0.02, 1 - ((Math.abs(x) - (halfX - 0.1)) / 0.1) ** 2)) : 1;
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j < nr; j++) {
      const t = (j / nr) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      let rz = hz * Math.sign(c) * Math.abs(c) ** (2 / 2.4);
      let ry = hy * Math.sign(s) * Math.abs(s) ** (2 / 2.6);
      // folds of the canvas, running across the bundle, varying along its length
      const f = 1 + 0.045 * Math.sin(5 * t + 2.1 * x) + 0.025 * Math.sin(9 * t - 3.3 * x + 1) + 0.02 * Math.sin(17 * x + 3 * t);
      rz *= f * (0.94 + 0.06 * e);
      ry *= f * e;
      // slight sag towards the rear edge, flat underside on the deck
      const yy = Math.max(y0, y0 + hy + ry - 0.012 * (rz / hz + 1) * 0.5);
      ring.push(new THREE.Vector3(x, yy, zc + rz * (0.9 + 0.1 * e)));
    }
    secs.push(ring);
  }
  let g: THREE.BufferGeometry = new G.LoftGeometry(secs, { closed: true, capStart: true, capEnd: true });
  g = G.crease(g, 60);
  G.ensureOutward(g);
  const out: THREE.Object3D[] = [part(g, P.topCanvas())];
  // two leather straps around the bundle
  const straps: THREE.BufferGeometry[] = [];
  for (const x of [-0.42, 0.42]) {
    const pts: V3[] = [];
    const nrm: V3[] = [];
    for (let j = 0; j <= 16; j++) {
      const t = Math.PI * (1.02 - (1.04 * j) / 16); // from front-bottom over the top to rear-bottom
      const c = Math.cos(t), s = Math.sin(t);
      const rz = (hz + 0.006) * Math.sign(c) * Math.abs(c) ** (2 / 2.4) * 0.98;
      const ry = (hy + 0.006) * Math.sign(s) * Math.abs(s) ** (2 / 2.6);
      pts.push([x, Math.max(y0 + 0.004, y0 + hy + ry - 0.004), zc - rz]);
      nrm.push([0, s, -c]);
    }
    straps.push(G.strap(pts, 0.03, 0.004, nrm));
    straps.push(G.rbox(0.04, 0.03, 0.008, 0.002, 1).translate(x, y0 + hy + 0.06, zc - hz * 0.78));
  }
  out.push(part(merge(straps), P.leather()));
  // folded bows: three tubular bow legs per side, fanned from the pivot bracket on the body side
  const bows: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  for (const sx of [1, -1]) {
    const piv: V3 = [sx * (HW + 0.013), 0.885, -0.765];
    bows.push(G.rbox(0.006, 0.07, 0.08, 0.002, 1).translate(sx * (HW + 0.004), 0.885, -0.765));
    steel.push(G.cyl(0.013, 0.013, 0.012, 14).rotateZ(Math.PI / 2).translate(sx * (HW + 0.012), 0.885, -0.765));
    for (let k = 0; k < 3; k++) {
      const up: V3 = [sx * (HW + 0.013), D.belt + 0.03 + 0.012 * k, -0.795 - 0.045 * k];
      const inn: V3 = [sx * (halfX - 0.05), D.belt + 0.085 + 0.012 * k, -0.86 - 0.05 * k];
      bows.push(G.rod(piv, up, 0.0085, 10));
      bows.push(new THREE.SphereGeometry(0.0085, 10, 8).translate(...up));
      bows.push(G.rod(up, inn, 0.0085, 10));
    }
  }
  out.push(part(merge(bows), P.body()));
  out.push(part(merge(steel), P.darkSteel()));
  return out;
}

export function buildFittings(): THREE.Group {
  const paint: THREE.BufferGeometry[] = [];
  const refl: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const red: THREE.BufferGeometry[] = [];
  for (const x of [0.635, -0.635]) {
    const h = headlamp(x);
    paint.push(...h.paint);
    refl.push(...h.refl);
    glass.push(...h.glass);
    steel.push(...h.steel);
  }
  const n = notek();
  paint.push(...n.paint);
  black.push(...n.black);
  glass.push(...n.glass);
  const rl = rearLamps();
  paint.push(...rl.paint);
  red.push(...rl.red);
  black.push(...rl.black);
  steel.push(...rl.steel);
  return group([
    windscreen(),
    part(merge(paint), P.body()),
    part(merge(refl), P.reflector()),
    part(merge(glass), P.glass()),
    part(merge(steel), P.darkSteel()),
    part(merge(black), P.black()),
    part(merge(red), P.redLens()),
    ...spare(),
    ...foldedTop(),
  ]);
}
