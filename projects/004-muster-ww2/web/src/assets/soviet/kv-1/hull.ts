/**
 * KV-1 Model 1941 hull: rolled plates with thickness in the stepped KV front (lower nose, shallow
 * glacis, near-vertical upper front plate with the driver's visor and the bow DT ball mount), vertical
 * upper sides with bolted applique plates, sponson floors and track guards with front mudguards, the
 * flat roof and engine deck (engine hatch, intake louvres, rear outlet louvre, filler caps), the sloped
 * upper rear plate (exhausts, transmission hatch), the rounded lower rear and the belly.
 *
 * Hull frame: +Z forward, +X = the tank's left, y = 0 ground (see dims.ts).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { H, T } from './dims';
import type { Pal } from './palette';
import { slab, surfaceFrame, applyFrame, merge, xf, latheZ, weldBead, D2R, type P3 } from './util';

const { zF, yB, zBF, zN, yN, yF, ySp, zG, yR, zRf, zRt, zRb, xL, xSp, xFe } = H;
/** rounded lower rear: quarter circle from the vertical rear plate to the belly */
const RR = { r: 0.32, get cz() { return -zF + this.r; }, get cy() { return yB + this.r; } };
const zBR = RR.cz;

const norm = (y: number, z: number): P3 => {
  const l = Math.hypot(y, z);
  return [0, y / l, z / l];
};
/** plate frames: point at (x, s up the plate, offset along the normal) */
function plateFrame(z0: number, y0: number, z1: number, y1: number, n: P3) {
  const L = Math.hypot(z1 - z0, y1 - y0);
  const uz = (z1 - z0) / L, uy = (y1 - y0) / L;
  return { n, L, at: (x: number, s: number, off = 0): P3 => [x, y0 + s * uy + off * n[1], z0 + s * uz + off * n[2]] };
}
/** upper front (driver's) plate, s measured up from its foot */
export const frontPlate = plateFrame(zG, yF, zRf, yR, norm(zG - zRf, yR - yF));
/** glacis, s measured from the nose up to the foot of the front plate */
const glacis = plateFrame(zN, yN, zG, yF, norm(zN - zG, yF - yN));
/** lower nose, s measured from the nose down to the belly */
const lowNose = plateFrame(zN, yN, zBF, yB, norm(zBF - zN, -(yN - yB)).map((v, i) => (i === 1 ? -Math.abs(v) : i === 2 ? Math.abs(v) : 0)) as P3);
/** upper rear plate, s measured up from its foot */
export const rearPlate = plateFrame(zRb, yF, zRt, yR, norm(zRt - zRb, -(yR - yF)).map((v, i) => (i === 1 ? Math.abs(v) : i === 2 ? -Math.abs(v) : 0)) as P3);

/** Object modelled lying on y = 0 (local +Y = surface normal, local +X = u) placed on a surface. */
export function onPlate(obj: THREE.Object3D, o: P3, u: P3, n: P3): THREE.Object3D {
  return applyFrame(group([obj]), surfaceFrame(o, u, n));
}

/* ------------------------------------------------------------------------------------------ */

function armour(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // lower hull sides between the tracks (profile follows nose, sponson floor and rounded rear)
  const arc: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + (i / 6) * (Math.PI / 2);
    arc.push([RR.cz + Math.cos(a) * RR.r, RR.cy + Math.sin(a) * RR.r]);
  }
  const prof: [number, number][] = [[zBF, yB], [zN, yN], [zG, ySp], [zRb, ySp], ...arc];
  for (const sx of [-1, 1]) {
    out.push(part(slab(prof.map(([z, y]) => [sx * xL, y, z] as P3), 0.075, [sx, 0, 0], 0.005), P.paint));
    // vertical upper side plate
    out.push(part(slab([[sx * xSp, yF, zG], [sx * xSp, yR, zRf], [sx * xSp, yR, zRt], [sx * xSp, yF, zRb]], 0.075, [sx, 0, 0], 0.006), P.paint));
    // sponson floor + track guard (one plate from the lower hull side to the outer guard edge)
    out.push(part(slab([[sx * (xL - 0.02), yF, zG], [sx * xFe, yF, zG], [sx * xFe, yF, zRb], [sx * (xL - 0.02), yF, zRb]], 0.03, [0, 1, 0], 0.004), P.paint));
    out.push(part(G.rbox(0.008, 0.05, zG - zRb, 0.003, 1), P.paint, { p: [sx * (xFe - 0.004), yF - 0.022, (zG + zRb) / 2] }));
  }
  // nose plates between the tracks, upper front plate over the full width
  out.push(part(slab([[-xL, yB, zBF], [xL, yB, zBF], [xL, yN, zN], [-xL, yN, zN]], 0.075, lowNose.n, 0.006), P.paint));
  out.push(part(slab([[-xL, yN, zN], [xL, yN, zN], [xL, yF, zG], [-xL, yF, zG]], 0.075, glacis.n, 0.006), P.paint));
  out.push(part(slab([[-xSp, yF, zG], [xSp, yF, zG], [xSp, yR, zRf], [-xSp, yR, zRf]], 0.075, frontPlate.n, 0.006), P.paint));
  // roof / engine deck, upper rear plate
  out.push(part(slab([[-xSp, yR, zRf], [xSp, yR, zRf], [xSp, yR, zRt], [-xSp, yR, zRt]], 0.03, [0, 1, 0], 0.005), P.paint));
  out.push(part(slab([[-xSp, yF, zRb], [xSp, yF, zRb], [xSp, yR, zRt], [-xSp, yR, zRt]], 0.06, rearPlate.n, 0.006), P.paint));
  // lower rear: short vertical plate and the rounded (bent) plate down to the belly
  out.push(part(slab([[-xL, yF, -zF], [xL, yF, -zF], [xL, RR.cy, -zF], [-xL, RR.cy, -zF]], 0.06, [0, 0, -1], 0.005), P.paint));
  const ring: G.V2[] = [];
  const t = 0.06;
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * (Math.PI / 2);
    ring.push([RR.cz + Math.cos(a) * RR.r, RR.cy + Math.sin(a) * RR.r]);
  }
  for (let i = 10; i >= 0; i--) {
    const a = Math.PI + (i / 10) * (Math.PI / 2);
    ring.push([RR.cz + Math.cos(a) * (RR.r - t), RR.cy + Math.sin(a) * (RR.r - t)]);
  }
  out.push(part(G.plate(ring, 2 * xL, 'zy', 0.005), P.paint));
  // belly
  out.push(part(slab([[-xL, yB, zBR], [xL, yB, zBR], [xL, yB, zBF], [-xL, yB, zBF]], 0.02, [0, -1, 0], 0.004), P.paint));

  // weld beads along the main joints
  const welds: THREE.BufferGeometry[] = [];
  const w = (pts: P3[], r = 0.0075, pitch = 2.8) => welds.push(weldBead(pts, r, pitch));
  for (const sx of [-1, 1]) {
    w([[sx * (xSp - 0.004), yF + 0.006, zG - 0.006], [sx * (xSp - 0.004), yR - 0.004, zRf - 0.008]], 0.0075, 1.8);
    w([[sx * (xSp - 0.004), yF + 0.006, zRb + 0.006], [sx * (xSp - 0.004), yR - 0.004, zRt + 0.008]], 0.0075, 1.8);
    w([[sx * (xSp - 0.004), yR + 0.002, zRf - 0.012], [sx * (xSp - 0.004), yR + 0.002, zRt + 0.012]], 0.006);
    w([[sx * (xSp + 0.004), yF + 0.004, zG - 0.03], [sx * (xSp + 0.004), yF + 0.004, zRb + 0.03]], 0.006);
  }
  w([[-xSp + 0.012, yR + 0.003, zRf - 0.004], [xSp - 0.012, yR + 0.003, zRf - 0.004]], 0.007);
  w([[-xSp + 0.012, yF + 0.004, zG + 0.004], [xSp - 0.012, yF + 0.004, zG + 0.004]], 0.007);
  w([[-xL + 0.01, yN + 0.004, zN + 0.002], [xL - 0.01, yN + 0.004, zN + 0.002]], 0.007);
  w([[-xSp + 0.012, yR + 0.003, zRt + 0.004], [xSp - 0.012, yR + 0.003, zRt + 0.004]], 0.006);
  out.push(part(merge(welds), P.paint));
  return out;
}

/** Bolted applique plates on the upper hull sides (late 1941). */
function applique(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const z0 = -2.62, z1 = 2.18, y0 = yF + 0.06, y1 = yR - 0.07, t = 0.025;
  const bolts: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (const sx of [-1, 1]) {
    out.push(part(G.rbox(t, y1 - y0, z1 - z0, 0.006, 1), P.paint, { p: [sx * (xSp + t / 2), (y0 + y1) / 2, (z0 + z1) / 2] }));
    for (let i = 0; i < 9; i++) {
      const z = z0 + 0.12 + (i * (z1 - z0 - 0.24)) / 8;
      for (const y of [y0 + 0.08, y1 - 0.08]) bolts.push({ p: new THREE.Vector3(sx * (xSp + t), y, z), n: new THREE.Vector3(sx, 0, 0), spin: i + y });
    }
  }
  out.push(part(G.scatter(G.boltHead(0.034, 0.016), bolts), P.paint));
  return out;
}

/* ---------------------------------------- front ---------------------------------------------- */

function driverVisor(P: Pal): THREE.Object3D {
  // lying on the front plate: local +Y out of the plate, local -Z = up the plate, X across
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.rbox(0.44, 0.07, 0.24, 0.014, 2), P.cast, { p: [0, 0.035, 0] }));
  // vision slit (dark opening + glass block) and the brow above it
  ps.push(part(G.box(0.24, 0.004, 0.028), P.void, { p: [0, 0.071, -0.01] }));
  ps.push(part(G.box(0.22, 0.004, 0.02), P.vision, { p: [0, 0.073, -0.01] }));
  ps.push(part(G.rbox(0.3, 0.018, 0.03, 0.005, 1), P.cast, { p: [0, 0.078, -0.05] }));
  // hinge lugs on the upper edge
  for (const sx of [-1, 1]) ps.push(part(G.cyl(0.02, 0.02, 0.06, 12), P.cast, { p: [sx * 0.15, 0.03, -0.14], r: [0, 0, 90] }));
  ps.push(part(G.weld([[-0.225, 0.004, -0.125], [0.225, 0.004, -0.125], [0.225, 0.004, 0.125], [-0.225, 0.004, 0.125], [-0.225, 0.004, -0.125]], 0.006), P.cast));
  return group(ps);
}

function headlamp(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, -0.1], [0.06, -0.1], [0.085, -0.07], [0.094, -0.02], [0.094, 0.03], [0.088, 0.042]], 28, 40), P.paint, { r: [90, 0, 0] }));
  ps.push(part(G.lathe([[0.0, 0.026], [0.082, 0.03], [0.082, 0.034], [0.0, 0.04]], 28, 60), P.glass, { r: [90, 0, 0] }));
  ps.push(part(G.lathe([[0.0, -0.03], [0.08, 0.0], [0.08, 0.01], [0.0, 0.01]], 24, 60), P.reflector, { r: [90, 0, 0] }));
  ps.push(part(G.torus(0.09, 0.008, 6, 28), P.paint, { p: [0, 0, 0.042] }));
  ps.push(part(G.rbox(0.03, 0.12, 0.03, 0.008, 1), P.paint, { p: [0, -0.15, -0.04] }));
  return group(ps);
}

function hornSignal(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, -0.06], [0.055, -0.06], [0.06, -0.035], [0.055, 0.0], [0.034, 0.02], [0.032, 0.05], [0.05, 0.075], [0.047, 0.078], [0.0, 0.065]], 22, 45), P.paint, { r: [90, 0, 0] }));
  ps.push(part(G.cyl(0.03, 0.03, 0.004, 16), P.void, { p: [0, 0, 0.072], r: [90, 0, 0] }));
  ps.push(part(G.rbox(0.03, 0.1, 0.03, 0.008, 1), P.paint, { p: [0, -0.1, -0.03] }));
  return group(ps);
}

/** Cast tow hook on its base, modelled with the base on y = 0, mouth opening towards -Z. */
export function towHook(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.rbox(0.15, 0.035, 0.28, 0.012, 2), P.cast, { p: [0, 0.017, -0.02] }));
  const hook: G.V2[] = [
    [0.1, 0.0], [0.1, 0.035], [0.086, 0.11], [0.052, 0.16], [0.0, 0.184], [-0.056, 0.176], [-0.1, 0.143],
    [-0.12, 0.106], [-0.108, 0.084], [-0.086, 0.088], [-0.064, 0.112], [-0.032, 0.124], [0.0, 0.117],
    [0.024, 0.093], [0.034, 0.055], [0.022, 0.03], [-0.022, 0.028], [-0.022, 0.0],
  ];
  ps.push(part(G.plate(hook, 0.065, 'zy', 0.009), P.cast));
  ps.push(part(G.cyl(0.03, 0.03, 0.1, 14), P.cast, { p: [0, 0.075, 0.05], r: [0, 0, 90] }));
  return group(ps);
}

function frontFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const u: P3 = [1, 0, 0];
  // driver's visor on the centre line
  out.push(onPlate(driverVisor(P), frontPlate.at(0, 0.44), u, frontPlate.n));
  // bow DT in its ball mount (radio operator, left of the driver): armoured collar, ball, barrel
  const mg = frontPlate.at(0.62, 0.4);
  out.push(onPlate(part(G.lathe([[0.13, 0.0], [0.125, 0.03], [0.1, 0.05], [0.085, 0.052]], 28, 40), P.cast), mg, u, frontPlate.n));
  const n = new THREE.Vector3(...frontPlate.n);
  const c = new THREE.Vector3(...mg).addScaledVector(n, 0.04);
  out.push(part(new THREE.SphereGeometry(0.085, 20, 12), P.cast, { p: c }));
  const b0 = c.clone().add(new THREE.Vector3(0, 0, 0.06)), b1 = c.clone().add(new THREE.Vector3(0, 0, 0.2));
  out.push(part(G.rod(b0, b1, 0.03, 14), P.gun));
  out.push(part(G.rod(b1, b1.clone().add(new THREE.Vector3(0, 0, 0.05)), 0.013, 10), P.gun));
  // headlamp (left) and horn (right) on brackets at the upper corners of the front plate
  for (const [sx, obj] of [[1, headlamp(P)], [-1, hornSignal(P)]] as [number, THREE.Object3D][]) {
    const base = frontPlate.at(sx * 1.08, 0.5);
    obj.position.set(base[0], base[1] + 0.2, base[2] + 0.1);
    out.push(obj);
    out.push(part(G.rbox(0.05, 0.05, 0.14, 0.008, 1), P.paint, { p: [base[0], base[1] + 0.03, base[2] + 0.04] }));
  }
  // tow hooks on the lower nose
  for (const sx of [-1, 1]) out.push(onPlate(towHook(P), lowNose.at(sx * 0.55, 0.3), u, lowNose.n));
  return out;
}

/* ---------------------------------- track guards --------------------------------------------- */

/** Sheet-steel mudguard following a polyline in (z, y), across x from x0 to x1. */
function mudguard(P: Pal, path: [number, number][], x0: number, x1: number, ribs: number): THREE.Object3D {
  const xc = (x0 + x1) / 2, w = x1 - x0;
  const pts = path.map(([z, y]) => new THREE.Vector3(xc, y, z));
  const nrm = path.map((_, i) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const dz = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dz, dy);
    return new THREE.Vector3(0, dz / L, -dy / L).multiplyScalar(Math.sign(dz) || 1);
  });
  const ps: THREE.Object3D[] = [part(G.strap(pts, w, 0.006, nrm, { smooth: false }), P.paint)];
  ps.push(part(G.tube(pts.map((p) => p.clone().setX(x1 - 0.004).add(new THREE.Vector3(0, -0.008, 0))), 0.008, 6, 24), P.paint));
  for (let i = 0; i < ribs; i++) {
    const x = x0 + (w * (i + 1)) / (ribs + 1);
    const rp = pts.slice(1).map((p, k) => p.clone().setX(x).addScaledVector(nrm[k + 1], 0.006));
    ps.push(part(G.tube(rp, 0.009, 6, 16), P.paint));
  }
  return group(ps);
}

function guards(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const front = mudguard(P, [[zG - 0.02, yF + 0.003], [3.1, yF + 0.003], [3.26, 1.1], [3.4, 1.03]], xL + 0.03, xFe, 3);
    const g = group([front]);
    if (sx < 0) g.scale.x = -1;
    out.push(g);
    // guard support brackets under the front mudguard
    out.push(part(G.plate([[0, 0], [0.3, 0], [0.3, 0.02], [0.02, 0.14], [0, 0.14]], 0.012, 'zy', 0.003), P.paint, { p: [sx * (xL + 0.04), yF - 0.14, zG - 0.02] }));
  }
  return out;
}

/* ---------------------------------------- deck ----------------------------------------------- */

function louvre(P: Pal, w: number, l: number, slats: number, mesh: boolean): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const fw = 0.04;
  ps.push(part(G.rbox(w + 2 * fw, 0.03, fw, 0.008, 1), P.paint, { p: [0, 0.015, l / 2 + fw / 2] }));
  ps.push(part(G.rbox(w + 2 * fw, 0.03, fw, 0.008, 1), P.paint, { p: [0, 0.015, -l / 2 - fw / 2] }));
  ps.push(part(G.rbox(fw, 0.03, l, 0.008, 1), P.paint, { p: [w / 2 + fw / 2, 0.015, 0] }));
  ps.push(part(G.rbox(fw, 0.03, l, 0.008, 1), P.paint, { p: [-w / 2 - fw / 2, 0.015, 0] }));
  ps.push(part(G.box(w, 0.004, l), P.void, { p: [0, 0.004, 0] }));
  const sg: THREE.BufferGeometry[] = [];
  const pitch = l / slats;
  for (let i = 0; i < slats; i++) {
    const s = G.box(w - 0.004, 0.008, pitch * 1.05);
    s.rotateX(-40 * D2R);
    s.translate(0, 0.016, -l / 2 + pitch * (i + 0.5));
    sg.push(s);
  }
  ps.push(part(merge(sg), P.paint));
  if (mesh) {
    const mg: THREE.BufferGeometry[] = [];
    const step = 0.045;
    for (let x = -w / 2 + step / 2; x < w / 2; x += step) mg.push(xf(G.box(0.005, 0.005, l + 0.02), [x, 0.036, 0]));
    for (let z = -l / 2 + step / 2; z < l / 2; z += step) mg.push(xf(G.box(w + 0.02, 0.005, 0.005), [0, 0.041, z]));
    ps.push(part(merge(mg), P.cable));
    ps.push(part(G.rbox(w + 0.03, 0.012, 0.02, 0.004, 1), P.paint, { p: [0, 0.042, l / 2 + 0.005] }));
    ps.push(part(G.rbox(w + 0.03, 0.012, 0.02, 0.004, 1), P.paint, { p: [0, 0.042, -l / 2 - 0.005] }));
  }
  return group(ps);
}

export function periscope(P: Pal): THREE.Object3D {
  // periscope head in its armoured guard, window facing +Z, base on y = 0
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.09, 0.0], [0.09, 0.02], [0.08, 0.03], [0.0, 0.03]], 24, 40), P.paint));
  ps.push(part(G.plate([[-0.07, 0], [0.065, 0], [0.065, 0.09], [0.02, 0.11], [-0.07, 0.11]], 0.09, 'zy', 0.008), P.paint, { p: [0, 0.028, 0] }));
  ps.push(part(G.box(0.07, 0.045, 0.004), P.void, { p: [0, 0.085, 0.0665] }));
  ps.push(part(G.box(0.062, 0.038, 0.004), P.vision, { p: [0, 0.085, 0.0685] }));
  return group(ps);
}

function fillerCap(P: Pal): THREE.Object3D {
  return group([
    part(G.lathe([[0.0, 0.0], [0.085, 0.0], [0.085, 0.012], [0.07, 0.02], [0.0, 0.02]], 24, 40), P.paint),
    part(G.lathe([[0.0, 0.02], [0.05, 0.02], [0.05, 0.034], [0.04, 0.042], [0.0, 0.042]], 20, 40), P.paint),
    part(G.rbox(0.07, 0.016, 0.014, 0.004, 1), P.paint, { p: [0, 0.05, 0] }),
  ]);
}

export function liftEye(P: Pal): THREE.Object3D {
  return group([
    part(G.rbox(0.035, 0.022, 0.11, 0.006, 1), P.paint, { p: [0, 0.011, 0] }),
    part(G.torus(0.038, 0.012, 8, 18), P.paint, { p: [0, 0.045, 0], r: [0, 90, 0] }),
  ]);
}

function deck(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = yR;
  // turret-ring collar
  out.push(part(G.lathe([[0.72, 0.0], [0.8, 0.0], [0.8, 0.016], [0.785, 0.026], [0.72, 0.026]], 72, 40), P.paint, { p: [0, y, T.z] }));
  // driver's periscopes at the front of the roof
  for (const sx of [-1, 1]) {
    const p = periscope(P);
    p.position.set(sx * 0.3, y, 2.3);
    out.push(p);
  }
  for (const sx of [-1, 1]) {
    const e = liftEye(P);
    e.position.set(sx * (xSp - 0.1), y, zRf - 0.14);
    out.push(e);
  }
  // engine access hatch with bolted edge, two grips and a round inspection cover
  const zc = -1.8, hl = 1.2, hw = 0.86;
  out.push(part(G.plate([[-hw / 2, -hl / 2], [hw / 2, -hl / 2], [hw / 2, hl / 2], [-hw / 2, hl / 2]], 0.03, 'xz', 0.006, 0.05), P.paint, { p: [0, y + 0.015, zc] }));
  const bolts: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const z = zc - hl / 2 + 0.05 + (i * (hl - 0.1)) / 9;
    for (const sx of [-1, 1]) bolts.push({ p: new THREE.Vector3(sx * (hw / 2 - 0.03), y + 0.03, z), n: new THREE.Vector3(0, 1, 0), spin: i });
  }
  for (let i = 0; i < 7; i++) {
    const x = -hw / 2 + 0.08 + (i * (hw - 0.16)) / 6;
    for (const sz of [-1, 1]) bolts.push({ p: new THREE.Vector3(x, y + 0.03, zc + sz * (hl / 2 - 0.03)), n: new THREE.Vector3(0, 1, 0), spin: i });
  }
  out.push(part(G.scatter(G.boltHead(0.028, 0.012), bolts), P.paint));
  for (const sz of [-1, 1]) out.push(part(G.tube([[-0.09, y + 0.028, zc + sz * 0.4], [-0.07, y + 0.075, zc + sz * 0.4], [0.07, y + 0.075, zc + sz * 0.4], [0.09, y + 0.028, zc + sz * 0.4]], 0.011, 8), P.paint));
  out.push(part(G.lathe([[0.0, 0.0], [0.16, 0.0], [0.16, 0.018], [0.145, 0.026], [0.0, 0.026]], 32, 40), P.paint, { p: [0.0, y + 0.03, zc] }));
  // air-intake louvres with mesh screens either side of the engine hatch
  for (const sx of [-1, 1]) {
    const lv = louvre(P, 0.42, 1.2, 14, true);
    lv.position.set(sx * 0.74, y, zc);
    out.push(lv);
  }
  // rear outlet louvre over the radiators
  const rl = louvre(P, 2.1, 0.36, 5, true);
  rl.position.set(0, y, -2.7);
  out.push(rl);
  for (const [x, z] of [[1.12, -1.3], [-1.12, -1.3], [1.12, -2.3], [-1.12, -2.3]] as [number, number][]) {
    const c = fillerCap(P);
    c.position.set(x, y, z);
    out.push(c);
  }
  return out;
}

/* ---------------------------------------- rear ----------------------------------------------- */

function exhaust(P: Pal): THREE.Object3D {
  // local +Y = out of the rear plate; pipe points rearwards and slightly down
  const ps: THREE.Object3D[] = [];
  // world direction (rearwards, slightly down) expressed in the plate frame
  const m = surfaceFrame([0, 0, 0], [1, 0, 0], rearPlate.n);
  const inv = m.clone().invert();
  const dir = new THREE.Vector3(0, -0.15, -1).normalize().transformDirection(inv);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const end = dir.clone().multiplyScalar(0.24);
  ps.push(part(G.lathe([[0.11, 0], [0.11, 0.02], [0.095, 0.035], [0.0, 0.035]], 24, 50), P.paint));
  ps.push(part(G.lathe([[0.062, -0.02], [0.07, -0.02], [0.07, 0.22], [0.075, 0.23], [0.075, 0.245], [0.062, 0.245], [0.062, 0.1]], 24, 50).applyQuaternion(q), P.exhaust));
  ps.push(part(G.cyl(0.062, 0.062, 0.004, 20).applyQuaternion(q), P.void, { p: [end.x, end.y, end.z] }));
  ps.push(part(G.scatter(G.boltHead(0.02, 0.01), Array.from({ length: 6 }, (_, i) => ({ p: [Math.cos(i * 1.047 + 0.5) * 0.09, 0.036, Math.sin(i * 1.047 + 0.5) * 0.09] as G.V3, spin: i }))), P.paint));
  return group(ps);
}

function markerLamp(P: Pal): THREE.Object3D {
  return group([
    part(G.rbox(0.1, 0.06, 0.08, 0.012, 1), P.paint, { p: [0, 0.03, 0] }),
    part(G.rbox(0.06, 0.035, 0.01, 0.004, 1), P.lampRed, { p: [0, 0.034, -0.042] }),
    part(G.rbox(0.11, 0.012, 0.06, 0.004, 1), P.paint, { p: [0, 0.066, -0.02] }),
  ]);
}

function rearDetails(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const u: P3 = [1, 0, 0];
  // round transmission access hatch with bolt ring on the upper rear plate
  out.push(onPlate(group([
    part(G.lathe([[0.0, 0.0], [0.25, 0.0], [0.25, 0.022], [0.235, 0.032], [0.0, 0.034]], 40, 40), P.paint),
    part(G.scatter(G.boltHead(0.026, 0.012), Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      return { p: [Math.cos(a) * 0.215, 0.034, Math.sin(a) * 0.215] as G.V3, spin: a };
    })), P.paint),
    part(G.rbox(0.16, 0.03, 0.04, 0.008, 1), P.paint, { p: [0, 0.046, 0] }),
  ]), rearPlate.at(0, 0.36), u, rearPlate.n));
  // exhausts either side of the hatch, marker lamp and lifting eyes
  for (const sx of [-1, 1]) out.push(onPlate(exhaust(P), rearPlate.at(sx * 0.78, 0.4), u, rearPlate.n));
  out.push(onPlate(markerLamp(P), rearPlate.at(-0.42, 0.66), u, rearPlate.n));
  for (const sx of [-1, 1]) out.push(onPlate(liftEye(P), rearPlate.at(sx * 1.12, 0.62), u, rearPlate.n));
  // tow hooks on the vertical lower rear plate (mouth facing down)
  for (const sx of [-1, 1]) out.push(onPlate(towHook(P), [sx * 0.58, (yF + RR.cy) / 2 - 0.02, -zF], [-1, 0, 0], [0, 0, -1]));
  // drain / inspection plugs on the rounded rear
  out.push(part(G.scatter(G.lathe([[0.0, 0.0], [0.05, 0.0], [0.05, 0.012], [0.03, 0.02], [0.0, 0.02]], 16, 40), [-0.25, 0.25].map((x) => {
    const a = Math.PI * 1.25;
    return { p: [x, RR.cy + Math.sin(a) * RR.r, RR.cz + Math.cos(a) * RR.r] as G.V3, n: [0, Math.sin(a), Math.cos(a)] as G.V3, spin: x };
  })), P.paint));
  return out;
}

/* ---------------------------------------- belly ---------------------------------------------- */

function belly(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = yB;
  out.push(part(G.plate([[-0.26, -0.22], [0.26, -0.22], [0.26, 0.22], [-0.26, 0.22]], 0.02, 'xz', 0.005, 0.06), P.paint, { p: [0, y - 0.01, 1.7] }));
  const plugs: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (const [x, z] of [[0.35, 0.4], [-0.35, -0.4], [0.0, -1.1], [0.45, -1.8], [-0.45, -1.8], [0.0, -2.35]] as [number, number][]) plugs.push({ p: new THREE.Vector3(x, y - 0.002, z), n: new THREE.Vector3(0, -1, 0), spin: x });
  out.push(part(G.scatter(G.lathe([[0.0, 0.0], [0.06, 0.0], [0.06, 0.012], [0.035, 0.022], [0.035, 0.04], [0.0, 0.04]], 16, 40), plugs), P.paint));
  return out;
}

export function hull(P: Pal): THREE.Group {
  const out: THREE.Object3D[] = [...armour(P), ...applique(P), ...frontFittings(P), ...guards(P), ...deck(P), ...rearDetails(P), ...belly(P)];
  return group(out, { name: 'hull' });
}

export { xf, latheZ };
