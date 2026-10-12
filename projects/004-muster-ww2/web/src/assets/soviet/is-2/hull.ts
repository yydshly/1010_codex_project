/**
 * IS-2 (1944, ChKZ) hull: rolled plates with real thickness, the cast "straightened" nose (one flat
 * glacis at 60 deg, a rounded transition and the lower nose at 30 deg), driver's vision block under its
 * flat armoured hood, the fixed bow-MG port, headlamp and horn, tow hooks and spare links on the nose,
 * track guards with ribbed front mudguards, the engine deck (engine hatch, two intake louvres with mesh
 * screens, rear outlet louvre, filler caps), the rear plates (hinged access panel, round transmission
 * hatch, exhausts under armoured cowls, marker lamps, crowbar, tow hooks, spare links) and the belly.
 *
 * Hull frame: +Z forward, +X = the tank's left, y = 0 ground (see dims.ts).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { H, R, T } from './dims';
import type { Pal } from './palette';
import { slab, surfaceFrame, applyFrame, merge, xf, latheZ, weldBead, D2R, type P3 } from './util';
import { linkGeometry } from './track';

const { zN, yN, yB, yF, ySp, yR, xSp, xR, xL, xFe, zRr, yRr } = H;
const S60 = Math.sin(60 * D2R), C60 = Math.cos(60 * D2R);
const S30 = Math.sin(30 * D2R), C30 = Math.cos(30 * D2R);
const S49 = Math.sin(49 * D2R), C49 = Math.cos(49 * D2R);
const S41 = Math.sin(41 * D2R), C41 = Math.cos(41 * D2R);
const S15 = Math.sin(15 * D2R), C15 = Math.cos(15 * D2R);

/** glacis: b measured up the plate from the (sharp) nose junction */
export const glacis = {
  n: [0, S60, C60] as P3,
  at: (a: number, b: number, off = 0): P3 => [a, yN + b * C60 + off * S60, zN - b * S60 + off * C60],
};
/** lower nose: s measured down the plate from the nose junction */
const lowNose = {
  n: [0, -S30, C30] as P3,
  at: (a: number, s: number, off = 0): P3 => [a, yN - s * C30 - off * S30, zN - s * S30 + off * C30],
};
/** upper rear plate: b measured up the plate from the rear junction */
export const rearPlate = {
  n: [0, S49, -C49] as P3,
  at: (a: number, b: number, off = 0): P3 => [a, yRr + b * C49 + off * S49, zRr + b * S49 - off * C49],
};
/** lower rear plate: s measured down the plate from the rear junction */
const lowRear = {
  n: [0, -S41, -C41] as P3,
  at: (a: number, s: number, off = 0): P3 => [a, yRr - s * C41 - off * S41, zRr + s * S41 - off * C41],
};

/** Object modelled lying on y = 0 (local +Y = surface normal, local +X = u) placed on a surface. */
function onPlate(obj: THREE.Object3D, o: P3, u: P3, n: P3): THREE.Object3D {
  return applyFrame(group([obj]), surfaceFrame(o, u, n));
}

/** Side-profile points (z, y) of the rounded nose, from T2 (lower) round to T1 (upper). */
function noseArc(steps = 8): [number, number][] {
  const [cz, cy] = H.FC;
  const a2 = Math.atan2(H.T2[1] - cy, H.T2[0] - cz);
  const a1 = Math.atan2(H.T1[1] - cy, H.T1[0] - cz);
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a2 + ((a1 - a2) * i) / steps;
    out.push([cz + Math.cos(a) * H.rNose, cy + Math.sin(a) * H.rNose]);
  }
  return out;
}

/* ------------------------------------------------------------------------------------------ */

function armour(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const [z1, y1] = H.T1, [z2, y2] = H.T2;
  const zGs = H.zGs, zG = H.zG, zRs = H.zRs, zRt = H.zRt;
  // cast nose: glacis (one plane from the rounding to the roof, wings over the tracks)
  out.push(
    part(
      slab(
        [
          [-xL, y1, z1], [xL, y1, z1], [xL, yF, zGs], [xSp, yF, zGs],
          [xR, yR, zG], [-xR, yR, zG], [-xSp, yF, zGs], [-xL, yF, zGs],
        ],
        0.12, glacis.n, 0.006,
      ),
      P.cast,
    ),
  );
  // lower nose and the rounded transition (one casting)
  out.push(part(slab([[-xL, y2, z2], [-xL, yB, H.zBF], [xL, yB, H.zBF], [xL, y2, z2]], 0.1, lowNose.n, 0.006), P.cast));
  out.push(part(G.cyl(H.rNose + 0.0015, H.rNose + 0.0015, 2 * xL - 0.004, 28), P.cast, { p: [0, H.FC[1], H.FC[0]], r: [0, 0, 90] }));
  // lower hull sides (vertical, between the tracks) following the nose and rear profiles
  const arc = noseArc(8);
  const prof: [number, number][] = [
    [H.zBF, yB], ...arc, [H.glacisZ(ySp), ySp], [H.rearZ(ySp), ySp], [zRr, yRr], [H.zBR, yB],
  ];
  for (const sx of [-1, 1]) {
    out.push(part(slab(prof.map(([z, y]) => [sx * xL, y, z] as P3), 0.09, [sx, 0, 0], 0.005), P.paint));
    // upper side plate, 15 deg
    out.push(part(slab([[sx * xSp, yF, zGs], [sx * xR, yR, zG], [sx * xR, yR, zRt], [sx * xSp, yF, zRs]], 0.09, [sx * C15, S15, 0], 0.006), P.paint));
    // sponson floor + track guard (one plate from the lower hull side to the outer guard edge)
    out.push(part(slab([[sx * (xL - 0.02), yF, zGs], [sx * xFe, yF, zGs], [sx * xFe, yF, zRs], [sx * (xL - 0.02), yF, zRs]], 0.03, [0, 1, 0], 0.004), P.paint));
    // turned-down outer lip of the guard
    out.push(part(G.rbox(0.008, 0.05, zGs - zRs, 0.003, 1), P.paint, { p: [sx * (xFe - 0.004), yF - 0.022, (zGs + zRs) / 2] }));
  }
  // upper rear plate (hinged access panel on it, see rearDetails) and lower rear plate
  out.push(
    part(
      slab(
        [
          [-xL, yRr, zRr], [xL, yRr, zRr], [xL, yF, zRs], [xSp, yF, zRs],
          [xR, yR, zRt], [-xR, yR, zRt], [-xSp, yF, zRs], [-xL, yF, zRs],
        ],
        0.06, rearPlate.n, 0.006,
      ),
      P.paint,
    ),
  );
  out.push(part(slab([[-xL, yRr, zRr], [-xL, yB, H.zBR], [xL, yB, H.zBR], [xL, yRr, zRr]], 0.06, lowRear.n, 0.006), P.paint));
  // roof and belly
  out.push(part(slab([[-xR, yR, zG], [xR, yR, zG], [xR, yR, zRt], [-xR, yR, zRt]], 0.03, [0, 1, 0], 0.005), P.paint));
  out.push(part(slab([[-xL, yB, H.zBR], [xL, yB, H.zBR], [xL, yB, H.zBF], [-xL, yB, H.zBF]], 0.02, [0, -1, 0], 0.004), P.paint));
  // rear junction beam
  out.push(part(G.cyl(0.03, 0.03, 2 * xL, 10), P.paint, { p: [0, yRr - 0.006, zRr + 0.012], r: [0, 0, 90] }));

  // weld beads along the main joints
  const welds: THREE.BufferGeometry[] = [];
  // (short, prominent seams at the glacis and rear corners keep a fine ripple; the long straight
  // side seams use a coarser one; the belly seams between the tracks are not modelled)
  const w = (pts: P3[], r = 0.0075, pitch = 2.8) => welds.push(weldBead(pts, r, pitch));
  for (const sx of [-1, 1]) {
    w([[sx * (xSp - 0.004), yF + 0.006, zGs - 0.006], [sx * (xR - 0.004), yR + 0.004, zG - 0.008]], 0.0075, 1.8);
    w([[sx * (xSp - 0.004), yF + 0.006, zRs + 0.006], [sx * (xR - 0.004), yR + 0.004, zRt + 0.008]], 0.0075, 1.8);
    w([[sx * (xR - 0.006), yR + 0.004, zG - 0.012], [sx * (xR - 0.006), yR + 0.004, zRt + 0.012]], 0.006);
    w([[sx * (xSp + 0.004), yF + 0.004, zGs - 0.03], [sx * (xSp + 0.004), yF + 0.004, zRs + 0.03]], 0.006);
  }
  w([[-xR + 0.012, yR + 0.005, zG - 0.005], [xR - 0.012, yR + 0.005, zG - 0.005]], 0.007);
  w([[-xR + 0.012, yR + 0.005, zRt + 0.005], [xR - 0.012, yR + 0.005, zRt + 0.005]], 0.006);
  out.push(part(merge(welds), P.paint));
  return out;
}

/* ---------------------------------------- front ---------------------------------------------- */

function visionBlock(P: Pal): THREE.Object3D {
  // lying on the glacis: local +Y out of the plate, local +Z down the plate (forward), X across
  const ps: THREE.Object3D[] = [];
  const W = 0.4;
  // flat armoured hood: wedge, deepest at its upper edge
  const prof: G.V2[] = [[-0.13, -0.005], [0.12, -0.005], [0.12, 0.028], [0.02, 0.07], [-0.07, 0.1], [-0.13, 0.1]];
  ps.push(part(G.plate(prof, W, 'zy', 0.01), P.cast));
  // vision slit on the sloping face (dark opening + glass block behind it), with a small brow
  const tilt = Math.atan2(0.1 - 0.028, 0.12 + 0.07); // face inclination (rises towards -z)
  const fn = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  const c0 = new THREE.Vector3(0, 0.028 + 0.6 * 0.072, 0.12 - 0.6 * 0.19);
  ps.push(part(G.box(0.22, 0.004, 0.034), P.void, { p: c0.clone().addScaledVector(fn, 0.001), r: [tilt / D2R, 0, 0] }));
  ps.push(part(G.box(0.2, 0.004, 0.026), P.vision, { p: c0.clone().addScaledVector(fn, 0.0035), r: [tilt / D2R, 0, 0] }));
  ps.push(part(G.rbox(0.26, 0.016, 0.022, 0.005, 1), P.cast, { p: c0.clone().addScaledVector(fn, 0.008).add(new THREE.Vector3(0, 0.006, -0.03)), r: [tilt / D2R, 0, 0] }));
  // weld bead round the hood
  const b: P3[] = [[-W / 2 - 0.005, 0.004, 0.12], [-W / 2 - 0.005, 0.004, -0.13], [W / 2 + 0.005, 0.004, -0.13], [W / 2 + 0.005, 0.004, 0.12], [-W / 2 - 0.005, 0.004, 0.12]];
  ps.push(part(G.weld(b, 0.006), P.cast));
  return group(ps);
}

function headlamp(P: Pal): THREE.Object3D {
  // lamp pointing +Z, bracket going down (-Y); origin at the lamp centre
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, -0.1], [0.06, -0.1], [0.085, -0.07], [0.094, -0.02], [0.094, 0.03], [0.088, 0.042]], 28, 40), P.paint, { r: [90, 0, 0] }));
  ps.push(part(G.lathe([[0.0, 0.026], [0.082, 0.03], [0.082, 0.034], [0.0, 0.04]], 28, 60), P.glass, { r: [90, 0, 0] }));
  ps.push(part(G.lathe([[0.0, -0.03], [0.08, 0.0], [0.08, 0.01], [0.0, 0.01]], 24, 60), P.reflector, { r: [90, 0, 0] }));
  ps.push(part(new THREE.SphereGeometry(0.014, 10, 6), P.bright, { p: [0, 0, -0.012] }));
  ps.push(part(G.torus(0.09, 0.008, 6, 28), P.paint, { p: [0, 0, 0.042] }));
  // blackout hood over the upper half of the lens
  ps.push(part(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16, 1, true, Math.PI / 2, Math.PI), P.paint, { p: [0, 0, 0.07], r: [90, 0, 0] }));
  // yoke and post
  ps.push(part(G.rbox(0.03, 0.1, 0.03, 0.008, 1), P.paint, { p: [0, -0.14, -0.03] }));
  for (const sx of [-1, 1]) ps.push(part(G.cyl(0.014, 0.014, 0.02, 10), P.paint, { p: [sx * 0.1, 0, -0.03], r: [0, 0, 90] }));
  ps.push(part(G.tube([[-0.1, 0, -0.03], [-0.07, -0.09, -0.03], [0.07, -0.09, -0.03], [0.1, 0, -0.03]], 0.008, 6, 20), P.paint));
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
  ps.push(part(G.rbox(0.022, 0.018, 0.085, 0.005, 1), P.cast, { p: [0, 0.082, -0.055], r: [-35, 0, 0] }));
  return group(ps);
}

/**
 * A short run of spare links lying on a plate: grouser face against the plate, horns outwards.
 * `at(s, off)` gives the plate point s along the plate (downwards) at offset `off` along n.
 */
function spareLinks(P: Pal, gLink: THREE.BufferGeometry, at: (s: number, off: number) => P3, n: P3, s0: number, count: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const X = new THREE.Vector3(1, 0, 0);
  const Y = new THREE.Vector3(...n).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  const off = R.grouser + R.plateT / 2 + 0.004;
  for (let i = 0; i < count; i++) {
    const o = at(s0 + (i + 0.5) * (R.pitch + 0.001), off);
    const m = part(gLink, P.track);
    new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(o[0], o[1], o[2]).decompose(m.position, m.quaternion, m.scale);
    out.push(m);
  }
  return out;
}

function frontFittings(P: Pal, gLink: THREE.BufferGeometry): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const u: P3 = [1, 0, 0];
  // driver's vision block on the centre line
  out.push(onPlate(visionBlock(P), glacis.at(0, 0.88), u, glacis.n));
  // fixed bow machine-gun port to the right of the driver: welded collar and the DT muzzle
  const mg = glacis.at(-0.36, 0.92, 0.0);
  out.push(onPlate(part(G.lathe([[0.075, 0.0], [0.07, 0.022], [0.05, 0.034], [0.035, 0.036]], 24, 40), P.cast), mg, u, glacis.n));
  out.push(part(latheZ([[0.0, -0.05], [0.028, -0.05], [0.028, 0.04], [0.022, 0.05], [0.0, 0.05]], 16, 40), P.cast, { p: [mg[0], mg[1] + 0.02, mg[2] + 0.01] }));
  out.push(part(G.cyl(0.008, 0.008, 0.01, 10), P.void, { p: [mg[0], mg[1] + 0.02, mg[2] + 0.057], r: [90, 0, 0] }));
  // headlamp (left) and horn (right) on short welded posts
  for (const [sx, obj] of [[1, headlamp(P)], [-1, hornSignal(P)]] as [number, THREE.Object3D][]) {
    const base = glacis.at(sx * 0.62, 0.74);
    obj.position.set(base[0], base[1] + (sx > 0 ? 0.2 : 0.17), base[2] + 0.02);
    out.push(obj);
    out.push(onPlate(part(G.rbox(0.09, 0.02, 0.1, 0.005, 1), P.paint, { p: [0, 0.008, 0] }), base, u, glacis.n));
  }
  // lamp cable conduit
  out.push(part(G.tube([glacis.at(0.62, 0.66, 0.012), glacis.at(0.72, 0.78, 0.012), glacis.at(0.86, 1.02, 0.012), glacis.at(0.9, 1.3, 0.012)], 0.007, 6, 20), P.paint));
  // tow hooks on the lower nose
  for (const sx of [-1, 1]) out.push(onPlate(towHook(P), lowNose.at(sx * 0.56, 0.33), u, lowNose.n));
  // spare track links on the lower nose (grousers against the plate, horns out), held by a bolted bar
  const s0 = 0.19;
  out.push(...spareLinks(P, gLink, (s, off) => lowNose.at(0, s, off), lowNose.n, s0, 3));
  const bar = lowNose.at(0, s0 + R.pitch / 2 + 0.001, 0.0);
  out.push(onPlate(group([
    part(G.rbox(0.84, 0.03, 0.045, 0.01, 1), P.paint, { p: [0, 0.1, 0] }),
    ...[-0.38, 0.38].map((x) => part(G.rbox(0.045, 0.1, 0.05, 0.008, 1), P.paint, { p: [x, 0.05, 0] })),
    part(G.scatter(G.boltHead(0.03, 0.014), [-0.38, 0.38].map((x) => ({ p: [x, 0.115, 0] as G.V3, spin: x }))), P.paint),
  ]), bar, u, lowNose.n));
  // side marker lamps on the front of the upper side plates (left green, right red)
  for (const sx of [-1, 1]) {
    const s = 0.2; // up the side plate from its lower edge
    const o: P3 = [sx * (xSp - s * S15), yF + s * C15, H.zGs - 0.34];
    const n: P3 = [sx * C15, S15, 0];
    // local +X = forward (world +Z): lens on the front face, visor above it
    out.push(onPlate(group([
      part(G.rbox(0.1, 0.05, 0.09, 0.012, 1), P.paint, { p: [0, 0.025, 0] }),
      part(G.rbox(0.01, 0.03, 0.05, 0.003, 1), sx > 0 ? P.lampGreen : P.lampRed, { p: [0.052, 0.027, 0] }),
      part(G.rbox(0.04, 0.01, 0.1, 0.003, 1), P.paint, { p: [0.058, 0.054, 0] }),
    ]), o, [0, 0, 1], n));
  }
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
  // rolled outer edge
  ps.push(part(G.tube(pts.map((p) => p.clone().setX(x1 - 0.004).add(new THREE.Vector3(0, -0.008, 0))), 0.008, 6, 24), P.paint));
  // pressed stiffening ribs
  for (let i = 0; i < ribs; i++) {
    const x = x0 + (w * (i + 1)) / (ribs + 1);
    const rp = pts.slice(1).map((p, k) => p.clone().setX(x).addScaledVector(nrm[k + 1], 0.006));
    ps.push(part(G.tube(rp, 0.009, 6, 16), P.paint));
  }
  return group(ps);
}

function guards(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const x0 = xL + 0.03, x1 = xFe;
  for (const sx of [-1, 1]) {
    const front = mudguard(P, [[H.zGs - 0.02, yF + 0.003], [2.99, yF + 0.003], [3.13, 1.2], [3.36, 1.04]], x0, x1, 4);
    const rear = mudguard(P, [[H.zRs + 0.02, yF + 0.003], [-3.06, yF + 0.003], [-3.2, 1.2], [-3.385, 1.08]], x0, x1, 0);
    const g = group([front, rear]);
    if (sx < 0) g.scale.x = -1;
    out.push(g);
  }
  return out;
}

/* ---------------------------------------- deck ----------------------------------------------- */

function louvre(P: Pal, w: number, l: number, slats: number, mesh: boolean): THREE.Object3D {
  // lying on y = 0 (deck), l along Z. Frame, dark well, inclined slats, optional mesh screen.
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
    const step = 0.04;
    for (let x = -w / 2 + step / 2; x < w / 2; x += step) mg.push(xf(G.box(0.005, 0.005, l + 0.02), [x, 0.036, 0]));
    for (let z = -l / 2 + step / 2; z < l / 2; z += step) mg.push(xf(G.box(w + 0.02, 0.005, 0.005), [0, 0.041, z]));
    ps.push(part(merge(mg), P.cable));
    // mesh frame
    ps.push(part(G.rbox(w + 0.03, 0.012, 0.02, 0.004, 1), P.paint, { p: [0, 0.042, l / 2 + 0.005] }));
    ps.push(part(G.rbox(w + 0.03, 0.012, 0.02, 0.004, 1), P.paint, { p: [0, 0.042, -l / 2 - 0.005] }));
  }
  return group(ps);
}

function periscopeMk4(P: Pal): THREE.Object3D {
  // MK-IV observation periscope in its armoured guard, window facing +Z, base on y = 0
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.1, 0.0], [0.1, 0.022], [0.09, 0.032], [0.0, 0.032]], 28, 40), P.paint));
  ps.push(part(G.scatter(G.boltHead(0.014, 0.006), Array.from({ length: 6 }, (_, i) => ({ p: [Math.cos(i * 1.047) * 0.08, 0.03, Math.sin(i * 1.047) * 0.08] as G.V3, spin: i }))), P.paint));
  ps.push(part(G.plate([[-0.08, 0], [0.075, 0], [0.075, 0.1], [0.02, 0.125], [-0.08, 0.125]], 0.1, 'zy', 0.008), P.paint, { p: [0, 0.03, 0] }));
  ps.push(part(G.box(0.078, 0.05, 0.004), P.void, { p: [0, 0.095, 0.0765] }));
  ps.push(part(G.box(0.07, 0.042, 0.004), P.vision, { p: [0, 0.095, 0.0785] }));
  ps.push(part(G.rbox(0.12, 0.012, 0.05, 0.004, 1), P.paint, { p: [0, 0.14, 0.07], r: [-12, 0, 0] }));
  return group(ps);
}
export { periscopeMk4 };

function fillerCap(P: Pal): THREE.Object3D {
  return group([
    part(G.lathe([[0.0, 0.0], [0.085, 0.0], [0.085, 0.012], [0.07, 0.02], [0.0, 0.02]], 24, 40), P.paint),
    part(G.lathe([[0.0, 0.02], [0.05, 0.02], [0.05, 0.034], [0.04, 0.042], [0.0, 0.042]], 20, 40), P.paint),
    part(G.rbox(0.07, 0.016, 0.014, 0.004, 1), P.paint, { p: [0, 0.05, 0] }),
  ]);
}

function liftEye(P: Pal): THREE.Object3D {
  return group([
    part(G.rbox(0.035, 0.022, 0.11, 0.006, 1), P.paint, { p: [0, 0.011, 0] }),
    part(G.torus(0.038, 0.012, 8, 18), P.paint, { p: [0, 0.045, 0], r: [0, 90, 0] }),
  ]);
}

function deck(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = yR;
  // turret-ring collar
  out.push(part(G.lathe([[0.93, 0.0], [1.0, 0.0], [1.0, 0.018], [0.985, 0.03], [0.93, 0.03]], 72, 40), P.paint, { p: [0, y, T.z] }));
  // driver's two periscopes at the front of the roof, clear of the mantlet
  for (const sx of [-1, 1]) {
    const p = periscopeMk4(P);
    p.position.set(sx * 0.62, y, H.zG - 0.13);
    p.scale.setScalar(0.9);
    out.push(p);
  }
  // lifting eyes at the roof front corners
  for (const sx of [-1, 1]) {
    const e = liftEye(P);
    e.position.set(sx * (xR - 0.1), y, H.zG - 0.12);
    out.push(e);
  }
  // engine access hatch with bolted edge, two grips and a round inspection cover
  const zc = -1.47, hl = 0.96, hw = 0.84;
  out.push(part(G.plate([[-hw / 2, -hl / 2], [hw / 2, -hl / 2], [hw / 2, hl / 2], [-hw / 2, hl / 2]], 0.03, 'xz', 0.006, 0.05), P.paint, { p: [0, y + 0.015, zc] }));
  const bolts: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (let i = 0; i < 9; i++) {
    const z = zc - hl / 2 + 0.05 + (i * (hl - 0.1)) / 8;
    for (const sx of [-1, 1]) bolts.push({ p: new THREE.Vector3(sx * (hw / 2 - 0.03), y + 0.03, z), n: new THREE.Vector3(0, 1, 0), spin: i });
  }
  for (let i = 0; i < 7; i++) {
    const x = -hw / 2 + 0.08 + (i * (hw - 0.16)) / 6;
    for (const sz of [-1, 1]) bolts.push({ p: new THREE.Vector3(x, y + 0.03, zc + sz * (hl / 2 - 0.03)), n: new THREE.Vector3(0, 1, 0), spin: i });
  }
  out.push(part(G.scatter(G.boltHead(0.028, 0.012), bolts), P.paint));
  for (const sz of [-1, 1]) out.push(part(G.tube([[-0.09, y + 0.028, zc + sz * 0.33], [-0.07, y + 0.075, zc + sz * 0.33], [0.07, y + 0.075, zc + sz * 0.33], [0.09, y + 0.028, zc + sz * 0.33]], 0.011, 8), P.paint));
  out.push(part(G.lathe([[0.0, 0.0], [0.16, 0.0], [0.16, 0.018], [0.145, 0.026], [0.0, 0.026]], 32, 40), P.paint, { p: [0.0, y + 0.03, zc] }));
  out.push(part(G.scatter(G.boltHead(0.022, 0.01), Array.from({ length: 8 }, (_, i) => ({ p: [Math.cos(i * 0.785) * 0.13, y + 0.054, zc + Math.sin(i * 0.785) * 0.13] as G.V3, spin: i }))), P.paint));
  // air-intake louvres with mesh screens either side of the engine hatch
  for (const sx of [-1, 1]) {
    const lv = louvre(P, 0.4, 0.98, 12, true);
    lv.position.set(sx * 0.7, y, zc);
    out.push(lv);
  }
  // rear outlet louvre over the radiators and fan, with its mesh screen
  const rl = louvre(P, 1.86, 0.34, 5, true);
  rl.position.set(0, y, -2.18);
  out.push(rl);
  // fuel / oil filler caps
  for (const [x, z] of [[0.97, -0.98], [-0.97, -0.98], [0.97, -1.96], [-0.97, -1.96]] as [number, number][]) {
    const c = fillerCap(P);
    c.position.set(x, y, z);
    out.push(c);
  }
  // lifting eyes at the rear deck corners
  for (const sx of [-1, 1]) {
    const e = liftEye(P);
    e.position.set(sx * 1.0, y, -2.41);
    out.push(e);
  }
  return out;
}

/* ---------------------------------------- rear ----------------------------------------------- */

function exhaust(P: Pal): THREE.Object3D {
  // local +Y = out of the rear plate, +Z = up the plate; pipe points rearwards and down
  const ps: THREE.Object3D[] = [];
  // world rearward-and-down in plate-local: world -Z & -Y -> local
  const dir = new THREE.Vector3(0, 0.62, -0.78).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const end = dir.clone().multiplyScalar(0.2);
  ps.push(part(G.lathe([[0.105, 0], [0.105, 0.02], [0.09, 0.035], [0.0, 0.035]], 24, 50), P.paint));
  ps.push(part(G.lathe([[0.058, -0.02], [0.066, -0.02], [0.066, 0.18], [0.071, 0.19], [0.071, 0.205], [0.058, 0.205], [0.058, 0.1]], 24, 50).applyQuaternion(q), P.exhaust));
  ps.push(part(G.cyl(0.058, 0.058, 0.004, 20).applyQuaternion(q), P.void, { p: [end.x, end.y, end.z] }));
  // armoured half-cowl over the upper side of the pipe
  ps.push(part(G.lathe([[0.1, 0.0], [0.1, 0.2], [0.094, 0.215]], 18, 50, -Math.PI / 2 - 0.5, Math.PI + 1.0).applyQuaternion(q), P.paint));
  ps.push(part(G.scatter(G.boltHead(0.02, 0.01), Array.from({ length: 6 }, (_, i) => ({ p: [Math.cos(i * 1.047 + 0.5) * 0.085, 0.036, Math.sin(i * 1.047 + 0.5) * 0.085] as G.V3, spin: i }))), P.paint));
  return group(ps);
}

function markerLamp(P: Pal): THREE.Object3D {
  // armoured tail lamp: box with a red lens facing local -Z (down the rear plate = rearwards)
  return group([
    part(G.rbox(0.1, 0.06, 0.08, 0.012, 1), P.paint, { p: [0, 0.03, 0] }),
    part(G.rbox(0.06, 0.035, 0.01, 0.004, 1), P.lampRed, { p: [0, 0.034, -0.042] }),
    part(G.rbox(0.11, 0.012, 0.06, 0.004, 1), P.paint, { p: [0, 0.066, -0.02] }),
  ]);
}

function rearDetails(P: Pal, gLink: THREE.BufferGeometry): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const u: P3 = [1, 0, 0];
  // hinged access panel (raised plate) with bolted upper edge
  const pc = rearPlate.at(0, 0.55);
  out.push(onPlate(part(G.plate([[-0.8, -0.43], [0.8, -0.43], [0.8, 0.4], [-0.8, 0.4]], 0.02, 'xz', 0.005, 0.04), P.paint, { p: [0, 0.01, 0] }), pc, u, rearPlate.n));
  const tb = Array.from({ length: 11 }, (_, i) => ({ p: rearPlate.at(-0.75 + i * 0.15, 0.91, 0.02), n: rearPlate.n, spin: i }));
  out.push(part(G.scatter(G.boltHead(0.028, 0.012), tb), P.paint));
  // hinges along the lower edge of the panel and the hinge rod
  for (const sx of [-1, 1]) {
    out.push(onPlate(group([
      part(G.rbox(0.2, 0.035, 0.1, 0.008, 1), P.paint, { p: [0, 0.018, 0.03] }),
      part(G.cyl(0.032, 0.032, 0.24, 16), P.paint, { p: [0, 0.03, -0.03], r: [0, 0, 90] }),
    ]), rearPlate.at(sx * 0.52, 0.14), u, rearPlate.n));
  }
  out.push(onPlate(part(G.cyl(0.012, 0.012, 1.5, 10), P.paint, { p: [0, 0.03, -0.03], r: [0, 0, 90] }), rearPlate.at(0, 0.14), u, rearPlate.n));
  // round transmission access hatch with bolt ring
  const hc = rearPlate.at(-0.4, 0.56);
  out.push(onPlate(group([
    part(G.lathe([[0.0, 0.0], [0.23, 0.0], [0.23, 0.022], [0.215, 0.032], [0.0, 0.034]], 40, 40), P.paint, { p: [0, 0.02, 0] }),
    part(G.scatter(G.boltHead(0.026, 0.012), Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 + 0.2;
      return { p: [Math.cos(a) * 0.195, 0.054, Math.sin(a) * 0.195] as G.V3, spin: a };
    })), P.paint),
    part(G.rbox(0.14, 0.03, 0.04, 0.008, 1), P.paint, { p: [0, 0.066, 0] }),
  ]), hc, u, rearPlate.n));
  // small rectangular inspection cover
  out.push(onPlate(group([
    part(G.plate([[-0.14, -0.09], [0.14, -0.09], [0.14, 0.09], [-0.14, 0.09]], 0.018, 'xz', 0.004, 0.02), P.paint, { p: [0, 0.029, 0] }),
    part(G.box(0.12, 0.004, 0.02), P.void, { p: [0, 0.04, 0.04] }),
    part(G.scatter(G.boltHead(0.022, 0.01), [[-0.11, -0.06], [0.11, -0.06], [-0.11, 0.06], [0.11, 0.06]].map(([x, z]) => ({ p: [x, 0.038, z] as G.V3, spin: x }))), P.paint),
  ]), rearPlate.at(0.18, 0.66), u, rearPlate.n));
  // lifting rings
  for (const sx of [-1, 1]) out.push(onPlate(liftEye(P), rearPlate.at(sx * 0.64, 0.8, 0.02), u, rearPlate.n));
  // crowbar clamped diagonally on the panel
  const cb0 = new THREE.Vector3(...rearPlate.at(0.74, 0.26, 0.055)), cb1 = new THREE.Vector3(...rearPlate.at(0.24, 0.86, 0.055));
  out.push(part(G.rod(cb0, cb1, 0.016, 10), P.paint));
  out.push(part(G.rod(cb1, cb1.clone().lerp(cb0, -0.08), 0.016, 10, 0.006), P.bright));
  const across = cb1.clone().sub(cb0).cross(new THREE.Vector3(...rearPlate.n)).normalize();
  for (const t of [0.2, 0.8]) {
    const c = cb0.clone().lerp(cb1, t);
    const o = c.clone().addScaledVector(new THREE.Vector3(...rearPlate.n), -0.055);
    out.push(onPlate(group([
      part(G.rbox(0.07, 0.036, 0.03, 0.006, 1), P.paint, { p: [0, 0.018, 0] }),
      part(G.torus(0.022, 0.006, 6, 14, Math.PI), P.paint, { p: [0, 0.055, 0] }),
    ]), [o.x, o.y, o.z], [across.x, across.y, across.z], rearPlate.n));
  }
  // exhausts near the upper corners, marker lamps between them
  for (const sx of [-1, 1]) out.push(onPlate(exhaust(P), rearPlate.at(sx * 0.95, 0.86), u, rearPlate.n));
  for (const sx of [-1, 1]) out.push(onPlate(markerLamp(P), rearPlate.at(sx * 0.45, 1.0), u, rearPlate.n));
  // rear tow hooks on the lower rear plate (mouth facing down)
  for (const sx of [-1, 1]) out.push(onPlate(towHook(P), lowRear.at(sx * 0.58, 0.34), [-1, 0, 0], lowRear.n));
  // two spare links on the lower rear plate with a retaining bar across their joint
  const rs0 = 0.18;
  out.push(...spareLinks(P, gLink, (s, off) => lowRear.at(0, s, off), lowRear.n, rs0, 2));
  out.push(onPlate(group([
    part(G.rbox(0.84, 0.03, 0.045, 0.01, 1), P.paint, { p: [0, 0.1, 0] }),
    ...[-0.38, 0.38].map((x) => part(G.rbox(0.045, 0.1, 0.05, 0.008, 1), P.paint, { p: [x, 0.05, 0] })),
    part(G.scatter(G.boltHead(0.03, 0.014), [-0.38, 0.38].map((x) => ({ p: [x, 0.115, 0] as G.V3, spin: x }))), P.paint),
  ]), lowRear.at(0, rs0 + R.pitch + 0.001), u, lowRear.n));
  return out;
}

/* ---------------------------------------- belly ---------------------------------------------- */

function belly(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = yB;
  // escape hatch behind the driver's seat
  out.push(part(G.plate([[-0.26, -0.22], [0.26, -0.22], [0.26, 0.22], [-0.26, 0.22]], 0.02, 'xz', 0.005, 0.06), P.paint, { p: [0, y - 0.01, 1.35] }));
  const b: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) b.push({ p: new THREE.Vector3(-0.2 + i * 0.08, y - 0.02, 1.35 + sz * 0.19), n: new THREE.Vector3(0, -1, 0), spin: i });
  out.push(part(G.scatter(G.boltHead(0.024, 0.01), b), P.paint));
  // drain plugs and inspection covers under the engine and gearbox
  const plugs: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (const [x, z] of [[0.35, 0.4], [-0.35, -0.4], [0.0, -1.1], [0.45, -1.8], [-0.45, -1.8], [0.0, -2.35]] as [number, number][]) plugs.push({ p: new THREE.Vector3(x, y - 0.002, z), n: new THREE.Vector3(0, -1, 0), spin: x });
  out.push(part(G.scatter(G.lathe([[0.0, 0.0], [0.06, 0.0], [0.06, 0.012], [0.035, 0.022], [0.035, 0.04], [0.0, 0.04]], 16, 40), plugs), P.paint));
  for (const z of [-0.95, -2.0]) out.push(part(G.plate([[-0.32, -0.26], [0.32, -0.26], [0.32, 0.26], [-0.32, 0.26]], 0.014, 'xz', 0.004, 0.05), P.paint, { p: [0, y - 0.007, z] }));
  return out;
}

export function hull(P: Pal): THREE.Group {
  const gLink = linkGeometry();
  const out: THREE.Object3D[] = [...armour(P), ...frontFittings(P, gLink), ...guards(P), ...deck(P), ...rearDetails(P, gLink), ...belly(P)];
  return group(out, { name: 'hull' });
}

export { xf };
