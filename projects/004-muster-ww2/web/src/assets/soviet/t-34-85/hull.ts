/**
 * T-34-85 hull (Factory No. 183 pattern, 1944): welded rolled-armour plates with real thickness
 * (45 mm glacis, nose, sides and rear, 20 mm roof and belly), nose beam, weld beads, driver's hatch
 * with two periscopes, bow DT ball mount in its armoured collar, front and rear tow hooks, mudguards,
 * engine deck (engine hatch, side air-intake louvres, rear outlet louvres under a mesh screen) and the
 * hinged upper rear plate with the round transmission hatch and the two exhausts.
 *
 * Hull frame: +Z forward, +X = the tank's left, y = 0 ground (see dims.ts).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { H, R } from './dims';
import type { Pal } from './palette';
import { slab, surfaceFrame, applyFrame, boltRing, type P3 } from './util';

const D = Math.PI / 180;
const { zN, yN, yB, ySp, yR, xSp, xR, xL, zRr, yRr } = H;

/* Plate frames: point on plate at (a across, b up the plate) + outward normal. */
const S60 = Math.sin(60 * D), C60 = Math.cos(60 * D);
const S47 = Math.sin(47 * D), C47 = Math.cos(47 * D);
/** glacis: b measured from the nose junction up the plate */
export const glacis = {
  n: [0, S60, C60] as P3,
  up: [0, C60, -S60] as P3,
  at: (a: number, b: number, off = 0): P3 => [a, yN + b * C60 + off * S60, zN - b * S60 + off * C60],
};
/** upper rear plate: b measured from the rear junction up the plate */
export const rearPlate = {
  n: [0, S47, -C47] as P3,
  up: [0, C47, S47] as P3,
  at: (a: number, b: number, off = 0): P3 => [a, yRr + b * C47 + off * S47, zRr + b * S47 - off * C47],
};

/** Object modelled lying on y = 0 (local +Y = plate normal, local +Z = `w` direction) placed on a plate. */
function onPlate(obj: THREE.Object3D, o: P3, u: P3, n: P3): THREE.Object3D {
  return applyFrame(group([obj]), surfaceFrame(o, u, n));
}

/* ------------------------------------------------------------------------------------------ */

function armour(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const t = 0.045;
  // upper glacis (full width: its outer wings close the sponsons over the tracks)
  out.push(
    part(
      slab(
        [
          [-xL, yN, zN], [xL, yN, zN], [xL, ySp, H.zGs], [xSp, ySp, H.zGs],
          [xR, yR, H.zG], [-xR, yR, H.zG], [-xSp, ySp, H.zGs], [-xL, ySp, H.zGs],
        ],
        t, glacis.n, 0.008,
      ),
      P.paint,
    ),
  );
  // lower nose plate
  const n53: P3 = [0, -Math.sin(53 * D), Math.cos(53 * D)];
  out.push(part(slab([[-xL, yN, zN], [-xL, yB, H.zBF], [xL, yB, H.zBF], [xL, yN, zN]], t, n53, 0.008), P.paint));
  // upper rear plate (hinged, see rearDetails) and lower rear plate
  out.push(
    part(
      slab(
        [
          [-xL, yRr, zRr], [xL, yRr, zRr], [xL, ySp, H.zRs], [xSp, ySp, H.zRs],
          [xR, yR, H.zRt], [-xR, yR, H.zRt], [-xSp, ySp, H.zRs], [-xL, ySp, H.zRs],
        ],
        t, rearPlate.n, 0.008,
      ),
      P.paint,
    ),
  );
  const n45: P3 = [0, -Math.SQRT1_2, -Math.SQRT1_2];
  out.push(part(slab([[-xL, yRr, zRr], [-xL, yB, H.zBR], [xL, yB, H.zBR], [xL, yRr, zRr]], t, n45, 0.008), P.paint));
  for (const sx of [-1, 1]) {
    // lower hull side (vertical, between the tracks)
    out.push(
      part(
        slab(
          [[sx * xL, yB, H.zBF], [sx * xL, yN, zN], [sx * xL, ySp, H.zGs], [sx * xL, ySp, H.zRs], [sx * xL, yRr, zRr], [sx * xL, yB, H.zBR]],
          t, [sx, 0, 0], 0.006,
        ),
        P.paint,
      ),
    );
    // upper side plate, 40 deg
    out.push(
      part(
        slab(
          [[sx * xSp, ySp, H.zGs], [sx * xR, yR, H.zG], [sx * xR, yR, H.zRt], [sx * xSp, ySp, H.zRs]],
          t, [sx * Math.cos(40 * D), Math.sin(40 * D), 0], 0.008,
        ),
        P.paint,
      ),
    );
    // sponson floor over the track
    out.push(part(slab([[sx * xL, ySp, H.zGs], [sx * xSp, ySp, H.zGs], [sx * xSp, ySp, H.zRs], [sx * xL, ySp, H.zRs]], 0.02, [0, -1, 0], 0.004), P.paint));
  }
  // roof (fighting compartment + engine deck) and belly
  out.push(part(slab([[-xR, yR, H.zG], [xR, yR, H.zG], [xR, yR, H.zRt], [-xR, yR, H.zRt]], 0.02, [0, 1, 0], 0.005), P.paint));
  out.push(part(slab([[-xL, yB, H.zBR], [xL, yB, H.zBR], [xL, yB, H.zBF], [-xL, yB, H.zBF]], 0.02, [0, -1, 0], 0.004), P.paint));

  // nose beam at the glacis / nose plate junction
  out.push(part(G.cyl(0.04, 0.04, 2 * xL + 0.02, 10), P.paint, { p: [0, yN + 0.004, zN - 0.012], r: [0, 0, 90] }));

  // weld beads along the main joints
  const welds: THREE.BufferGeometry[] = [];
  const w = (pts: P3[], r = 0.0075) => welds.push(G.weld(pts, r));
  for (const sx of [-1, 1]) {
    w([[sx * xSp, ySp + 0.004, H.zGs - 0.004], [sx * xR, yR + 0.004, H.zG - 0.006]]);
    w([[sx * xSp, ySp + 0.004, H.zRs + 0.004], [sx * xR, yR + 0.004, H.zRt + 0.006]]);
    w([[sx * (xR - 0.004), yR + 0.003, H.zG - 0.01], [sx * (xR - 0.004), yR + 0.003, H.zRt + 0.01]], 0.006);
    w([[sx * xL, yN + 0.004, zN + 0.004], [sx * xL, ySp, H.zGs + 0.004]], 0.006);
  }
  w([[-xR + 0.01, yR + 0.004, H.zG - 0.004], [xR - 0.01, yR + 0.004, H.zG - 0.004]], 0.006);
  out.push(part(G.mergeGeometries(welds.map((g) => g.toNonIndexed()))!, P.paint));
  return out;
}

/* ---------------------------------------- front ---------------------------------------------- */

function driverHatch(P: Pal): THREE.Object3D {
  // modelled lying flat: local X across, +Y out of the glacis, +Z down the plate (towards the nose)
  const W = 0.6, L = 0.54, T = 0.05;
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.plate([[-W / 2, -L / 2], [W / 2, -L / 2], [W / 2, L / 2], [-W / 2, L / 2]], T, 'xz', 0.008, 0.07), P.paint, { p: [0, T / 2 - 0.01, 0] }));
  // two MK-4 periscope housings in the upper part of the hatch
  for (const x of [-0.14, 0.14]) {
    ps.push(part(G.rbox(0.15, 0.07, 0.11, 0.012, 2), P.paint, { p: [x, T + 0.03, -0.12] }));
    ps.push(part(G.rbox(0.17, 0.018, 0.15, 0.006, 1), P.paint, { p: [x, T + 0.072, -0.13] })); // armoured hood
    ps.push(part(G.box(0.11, 0.035, 0.004), P.vision, { p: [x, T + 0.035, -0.06] }));
    ps.push(part(G.box(0.12, 0.045, 0.004), P.void, { p: [x, T + 0.035, -0.063] }));
  }
  // hinge block at the upper edge + two hinge knuckles
  ps.push(part(G.rbox(0.44, 0.06, 0.07, 0.015, 2), P.paint, { p: [0, 0.03, -L / 2 - 0.045] }));
  for (const x of [-0.17, 0.17]) ps.push(part(G.cyl(0.032, 0.032, 0.09, 16), P.paint, { p: [x, 0.045, -L / 2 - 0.05], r: [0, 0, 90] }));
  // lifting grip and the lock boss
  ps.push(part(G.tube([[-0.07, T - 0.005, 0.17], [-0.06, T + 0.04, 0.17], [0.06, T + 0.04, 0.17], [0.07, T - 0.005, 0.17]], 0.009, 8), P.paint));
  ps.push(part(G.cyl(0.035, 0.04, 0.02, 16), P.paint, { p: [0, T + 0.01, 0.06] }));
  return group(ps);
}

function bowMG(P: Pal): THREE.Object3D {
  // local: +Y out of the glacis
  const ps: THREE.Object3D[] = [];
  // raised armoured collar with a brow on top
  ps.push(part(G.lathe([[0.2, 0], [0.19, 0.03], [0.15, 0.07], [0.12, 0.08], [0.11, 0.06]], 32, 40), P.cast));
  ps.push(part(G.lathe([[0.0, 0.0], [0.095, 0.0], [0.105, 0.04], [0.09, 0.085], [0.05, 0.105], [0.0, 0.11]], 24, 60), P.cast, { p: [0, 0.0, 0] }));
  // DT barrel sleeve and muzzle, pointing along the hull axis (not normal to the plate)
  const dir = new THREE.Vector3(0, C60, S60); // hull +Z expressed in plate-local (y = n, z = down the plate)
  const a = new THREE.Vector3(0, 0.07, 0), b = a.clone().addScaledVector(dir, 0.17), c = a.clone().addScaledVector(dir, 0.26);
  ps.push(part(G.rod(a, b, 0.032, 16), P.cast));
  ps.push(part(G.rod(b, c, 0.013, 12), P.gun));
  ps.push(part(G.rod(c.clone().addScaledVector(dir, -0.01), c.clone().addScaledVector(dir, 0.004), 0.0045, 8), P.void));
  return group(ps);
}

function towHook(P: Pal): THREE.Object3D {
  // cast hook on its base plate; modelled with the base on y = 0, the tip curling towards -Z
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.rbox(0.13, 0.03, 0.26, 0.01, 2), P.cast, { p: [0, 0.015, -0.02] }));
  const hook: G.V2[] = [
    [0.09, 0.0], [0.09, 0.03], [0.078, 0.1], [0.048, 0.148], [0.0, 0.17], [-0.05, 0.162], [-0.09, 0.132],
    [-0.108, 0.098], [-0.098, 0.078], [-0.078, 0.082], [-0.058, 0.104], [-0.028, 0.114], [0.0, 0.108],
    [0.022, 0.086], [0.03, 0.05], [0.02, 0.028], [-0.02, 0.026], [-0.02, 0.0],
  ];
  ps.push(part(G.plate(hook, 0.055, 'zy', 0.008), P.cast));
  // pivot boss either side of the hook body and the spring latch across the mouth
  ps.push(part(G.cyl(0.026, 0.026, 0.085, 14), P.cast, { p: [0, 0.07, 0.045], r: [0, 0, 90] }));
  ps.push(part(G.rbox(0.02, 0.016, 0.075, 0.005, 1), P.cast, { p: [0, 0.075, -0.05], r: [-35, 0, 0] }));
  return group(ps);
}

function headlight(P: Pal): THREE.Object3D {
  // lamp pointing +Z, bracket going down (-Y) to the plate; origin at the lamp centre
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, -0.09], [0.06, -0.09], [0.085, -0.06], [0.092, -0.01], [0.092, 0.035], [0.086, 0.045]], 28, 40), P.paint, { r: [90, 0, 0] }));
  ps.push(part(G.lathe([[0.0, 0.028], [0.08, 0.032], [0.08, 0.036], [0.0, 0.04]], 28, 60), P.vision, { r: [90, 0, 0] }));
  ps.push(part(G.lathe([[0.0, -0.02], [0.078, 0.0], [0.078, 0.01], [0.0, 0.01]], 24, 60), P.bright, { r: [90, 0, 0] }));
  ps.push(part(G.torus(0.088, 0.008, 6, 28), P.paint, { p: [0, 0, 0.045] }));
  // blackout visor over the top half
  ps.push(part(G.cyl(0.098, 0.098, 0.05, 20, true), P.paint, { p: [0, 0, 0.065], r: [90, 0, 0], s: [1, 1, 1] }));
  ps.push(part(G.rbox(0.03, 0.12, 0.03, 0.008, 1), P.paint, { p: [0, -0.13, -0.02] }));
  return group(ps);
}

function horn(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, -0.05], [0.05, -0.05], [0.055, -0.03], [0.05, 0.0], [0.032, 0.02], [0.03, 0.05], [0.045, 0.07], [0.042, 0.072], [0.0, 0.06]], 20, 45), P.paint, { r: [90, 0, 0] }));
  ps.push(part(G.rbox(0.025, 0.08, 0.025, 0.006, 1), P.paint, { p: [0, -0.07, -0.02] }));
  return group(ps);
}

function frontFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // driver's hatch (left), bow MG (right)
  out.push(onPlate(driverHatch(P), glacis.at(0.34, 1.0), [1, 0, 0], glacis.n));
  out.push(onPlate(bowMG(P), glacis.at(-0.5, 1.02), [1, 0, 0], glacis.n));
  // tow hooks on the lower glacis
  for (const sx of [-1, 1]) out.push(onPlate(towHook(P), glacis.at(sx * 0.62, 0.2), [1, 0, 0], glacis.n));
  // headlight and horn on the front of the left side plate
  const n40: P3 = [Math.cos(40 * D), Math.sin(40 * D), 0];
  const sideAt = (s: number, z: number, off = 0): P3 => [xSp - s * Math.sin(40 * D) + off * n40[0], ySp + s * Math.cos(40 * D) + off * n40[1], z];
  // lamp on a post standing on a pad welded to the plate
  const hl = headlight(P);
  const hp = sideAt(0.56, 1.86);
  hl.position.set(hp[0], hp[1] + 0.2, hp[2] + 0.02);
  out.push(hl);
  out.push(part(G.rbox(0.09, 0.02, 0.09, 0.005, 1), P.paint, { p: hp, r: [0, 0, -50] }));
  const hn = horn(P);
  const hq = sideAt(0.62, 1.56);
  hn.position.set(hq[0], hq[1] + 0.12, hq[2] + 0.02);
  out.push(hn);
  out.push(part(G.rbox(0.07, 0.02, 0.07, 0.005, 1), P.paint, { p: hq, r: [0, 0, -50] }));
  // electric cable conduit from the lamp back along the plate
  out.push(part(G.tube([sideAt(0.56, 1.8, 0.012), sideAt(0.6, 1.62, 0.012), sideAt(0.7, 1.35, 0.012)], 0.007, 6, 16), P.paint));
  return out;
}

/** Curved sheet mudguard following a circle (z, y) round a wheel, at the track's x. */
function mudguard(P: Pal, c: [number, number], r: number, a0: number, a1: number, x: number, flap: boolean): THREE.Object3D {
  const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push(new THREE.Vector3(x, c[1] + Math.sin(a) * r, c[0] + Math.cos(a) * r));
    nrm.push(new THREE.Vector3(0, Math.sin(a), Math.cos(a)));
  }
  const ps: THREE.Object3D[] = [part(G.strap(pts, R.trackW + 0.04, 0.005, nrm, { smooth: false }), P.paint)];
  // stiffening rolled edges on both sides
  for (const s of [-1, 1]) ps.push(part(G.tube(pts.map((p) => p.clone().add(new THREE.Vector3(s * (R.trackW / 2 + 0.02), 0, 0))), 0.008, 6, 24), P.paint));
  if (flap) {
    const e = pts[pts.length - 1];
    ps.push(part(G.cyl(0.012, 0.012, R.trackW + 0.04, 8), P.paint, { p: [e.x, e.y, e.z], r: [0, 0, 90] }));
  }
  return group(ps);
}

/* ---------------------------------------- deck ----------------------------------------------- */

function louvre(P: Pal, w: number, l: number, slats: number, mesh: boolean): THREE.Object3D {
  // lying on y = 0 (deck), l along Z. Frame, dark well, inclined slats, optional mesh screen.
  const ps: THREE.Object3D[] = [];
  const fw = 0.035;
  ps.push(part(G.rbox(w + 2 * fw, 0.03, fw, 0.008, 1), P.paint, { p: [0, 0.015, l / 2 + fw / 2] }));
  ps.push(part(G.rbox(w + 2 * fw, 0.03, fw, 0.008, 1), P.paint, { p: [0, 0.015, -l / 2 - fw / 2] }));
  ps.push(part(G.rbox(fw, 0.03, l, 0.008, 1), P.paint, { p: [w / 2 + fw / 2, 0.015, 0] }));
  ps.push(part(G.rbox(fw, 0.03, l, 0.008, 1), P.paint, { p: [-w / 2 - fw / 2, 0.015, 0] }));
  ps.push(part(G.box(w, 0.004, l), P.void, { p: [0, 0.004, 0] }));
  const sg: THREE.BufferGeometry[] = [];
  const pitch = l / slats;
  for (let i = 0; i < slats; i++) {
    const s = G.box(w - 0.004, 0.008, pitch * 1.05);
    s.rotateX(-38 * D);
    s.translate(0, 0.016, -l / 2 + pitch * (i + 0.5));
    sg.push(s.toNonIndexed());
  }
  ps.push(part(G.mergeGeometries(sg)!, P.paint));
  if (mesh) {
    const mg: THREE.BufferGeometry[] = [];
    const step = 0.045;
    for (let x = -w / 2 + step / 2; x < w / 2; x += step) {
      const b = G.box(0.006, 0.006, l);
      b.translate(x, 0.033, 0);
      mg.push(b.toNonIndexed());
    }
    for (let z = -l / 2 + step / 2; z < l / 2; z += step) {
      const b = G.box(w, 0.006, 0.006);
      b.translate(0, 0.039, z);
      mg.push(b.toNonIndexed());
    }
    ps.push(part(G.mergeGeometries(mg)!, P.cable));
  }
  return group(ps);
}

function engineDeck(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = yR;
  // engine access hatch with bolted edge and two grips
  const zc = -1.28, hl = 1.06, hw = 0.62;
  out.push(part(G.plate([[-hw / 2, -hl / 2], [hw / 2, -hl / 2], [hw / 2, hl / 2], [-hw / 2, hl / 2]], 0.028, 'xz', 0.006, 0.05), P.paint, { p: [0, y + 0.014, zc] }));
  const bolts: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (let i = 0; i < 9; i++) {
    const z = zc - hl / 2 + 0.05 + (i * (hl - 0.1)) / 8;
    for (const sx of [-1, 1]) bolts.push({ p: new THREE.Vector3(sx * (hw / 2 - 0.028), y + 0.028, z), n: new THREE.Vector3(0, 1, 0), spin: i });
  }
  for (let i = 0; i < 5; i++) {
    const x = -hw / 2 + 0.07 + (i * (hw - 0.14)) / 4;
    for (const sz of [-1, 1]) bolts.push({ p: new THREE.Vector3(x, y + 0.028, zc + sz * (hl / 2 - 0.028)), n: new THREE.Vector3(0, 1, 0), spin: i });
  }
  out.push(part(G.scatter(G.boltHead(0.026, 0.012), bolts), P.paint));
  for (const sz of [-1, 1]) out.push(part(G.tube([[-0.08, y + 0.026, zc + sz * 0.3], [-0.06, y + 0.07, zc + sz * 0.3], [0.06, y + 0.07, zc + sz * 0.3], [0.08, y + 0.026, zc + sz * 0.3]], 0.01, 8), P.paint));
  // side air-intake louvres
  for (const sx of [-1, 1]) {
    const lv = louvre(P, 0.3, 1.02, 12, false);
    lv.position.set(sx * 0.59, y, zc);
    out.push(lv);
  }
  // rear outlet louvres with the mesh screen
  const rl = louvre(P, 1.5, 0.3, 5, true);
  rl.position.set(0, y, -2.05);
  out.push(rl);
  // plate behind the turret (fighting compartment roof) seam and lifting eyes at the deck corners
  for (const sx of [-1, 1]) {
    out.push(part(G.torus(0.035, 0.012, 8, 16), P.paint, { p: [sx * 0.84, y + 0.035, -2.14], r: [0, 90, 0] }));
    out.push(part(G.rbox(0.03, 0.02, 0.09, 0.006, 1), P.paint, { p: [sx * 0.84, y + 0.01, -2.14] }));
  }
  return out;
}

/* ---------------------------------------- rear ----------------------------------------------- */

function exhaust(P: Pal): THREE.Object3D {
  // local +Y = out of the rear plate, +Z = up the plate; pipe points rearwards, slightly down
  const ps: THREE.Object3D[] = [];
  const dir = new THREE.Vector3(0, 0.6, -0.8).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const end = dir.clone().multiplyScalar(0.21);
  ps.push(part(G.lathe([[0.1, 0], [0.1, 0.02], [0.085, 0.035], [0.0, 0.035]], 24, 50), P.paint)); // flange
  ps.push(part(G.lathe([[0.058, -0.02], [0.066, -0.02], [0.066, 0.19], [0.071, 0.2], [0.071, 0.215], [0.058, 0.215], [0.058, 0.1]], 24, 50).applyQuaternion(q), P.exhaust));
  ps.push(part(G.cyl(0.058, 0.058, 0.004, 20).applyQuaternion(q), P.void, { p: [end.x, end.y, end.z] }));
  // armoured half-cowl over the upper side of the pipe
  ps.push(part(G.lathe([[0.1, 0.0], [0.1, 0.19], [0.094, 0.2]], 18, 50, -Math.PI / 2, Math.PI).applyQuaternion(q), P.paint));
  return group(ps);
}

function rearDetails(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const u: P3 = [1, 0, 0];
  // round transmission access hatch
  const hc = rearPlate.at(0, 0.56);
  const hatch = group([
    part(G.lathe([[0.0, 0.0], [0.27, 0.0], [0.27, 0.022], [0.255, 0.034], [0.0, 0.036]], 40, 40), P.paint),
    part(G.scatter(G.boltHead(0.03, 0.014), Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      return { p: [Math.cos(a) * 0.228, 0.034, Math.sin(a) * 0.228] as G.V3, spin: a };
    })), P.paint),
    part(G.rbox(0.18, 0.03, 0.05, 0.01, 1), P.paint, { p: [0, 0.045, 0.08] }),
  ]);
  out.push(onPlate(hatch, hc, u, rearPlate.n));
  // exhausts either side of the hatch
  for (const sx of [-1, 1]) out.push(onPlate(exhaust(P), rearPlate.at(sx * 0.58, 0.36), u, rearPlate.n));
  // hinges of the upper rear plate (bottom edge) and the bolt row along its top edge
  for (const sx of [-1, 1]) {
    out.push(onPlate(group([
      part(G.rbox(0.16, 0.03, 0.09, 0.008, 1), P.paint, { p: [0, 0.015, 0.02] }),
      part(G.cyl(0.03, 0.03, 0.2, 16), P.paint, { p: [0, 0.02, -0.03], r: [0, 0, 90] }),
    ]), rearPlate.at(sx * 0.5, 0.03), u, rearPlate.n));
  }
  const tb: { p: P3; n: P3; spin: number }[] = [];
  for (let i = 0; i < 9; i++) {
    const a = -0.8 + (i * 1.6) / 8;
    tb.push({ p: rearPlate.at(a, 0.99, 0), n: rearPlate.n, spin: i });
  }
  out.push(part(G.scatter(G.boltHead(0.028, 0.012), tb), P.paint));
  // rear tow hooks on the lower rear plate
  const n45: P3 = [0, -Math.SQRT1_2, -Math.SQRT1_2];
  for (const sx of [-1, 1]) {
    const o: P3 = [sx * 0.6, yRr - 0.24, zRr + 0.24];
    out.push(onPlate(towHook(P), o, [-1, 0, 0], n45));
  }
  return out;
}

/* ------------------------------------------------------------------------------------------ */

function belly(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = yB;
  // escape hatch in the floor of the fighting compartment (right side) with its bolt ring
  out.push(part(G.plate([[-0.24, -0.2], [0.24, -0.2], [0.24, 0.2], [-0.24, 0.2]], 0.02, 'xz', 0.005, 0.06), P.paint, { p: [-0.42, y - 0.01, 0.9] }));
  const b: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) b.push({ p: new THREE.Vector3(-0.42 - 0.2 + i * 0.08, y - 0.02, 0.9 + sz * 0.17), n: new THREE.Vector3(0, -1, 0), spin: i });
  out.push(part(G.scatter(G.boltHead(0.024, 0.01), b), P.paint));
  // drain plugs and the inspection covers under the engine and gearbox
  const plugs: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (const [x, z] of [[0.3, 0.2], [-0.3, -0.6], [0.0, -1.2], [0.45, -1.7], [-0.45, -1.7], [0.0, -2.2]] as [number, number][]) plugs.push({ p: new THREE.Vector3(x, y - 0.002, z), n: new THREE.Vector3(0, -1, 0), spin: x });
  out.push(part(G.scatter(G.lathe([[0.0, 0.0], [0.06, 0.0], [0.06, 0.012], [0.035, 0.022], [0.035, 0.04], [0.0, 0.04]], 16, 40), plugs), P.paint));
  for (const z of [-0.9, -1.9]) out.push(part(G.plate([[-0.3, -0.25], [0.3, -0.25], [0.3, 0.25], [-0.3, 0.25]], 0.014, 'xz', 0.004, 0.05), P.paint, { p: [0, y - 0.007, z] }));
  return out;
}

export function hull(P: Pal, idlerZ: number): THREE.Group {
  const out: THREE.Object3D[] = [...armour(P), ...frontFittings(P), ...engineDeck(P), ...rearDetails(P), ...belly(P)];
  // mudguards: front over the idler, rear over the sprocket
  for (const sx of [-1, 1]) {
    const x = sx * R.trackX;
    const fc: [number, number] = [idlerZ, R.idlerY];
    const fr = Math.hypot(H.zGs - fc[0], ySp - fc[1]) - 0.004;
    const fa0 = Math.atan2(ySp - fc[1], H.zGs - fc[0]);
    out.push(mudguard(P, fc, fr, fa0, 18 * D, x, true));
    const rc: [number, number] = [R.sprocketZ, R.sprocketY];
    const rr = Math.hypot(H.zRs - rc[0], ySp - rc[1]) - 0.004;
    const ra0 = Math.atan2(ySp - rc[1], H.zRs - rc[0]);
    out.push(mudguard(P, rc, rr, ra0, 150 * D, x, false));
  }
  return group(out, { name: 'hull' });
}

export { boltRing };
