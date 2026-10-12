/**
 * External fittings of the M4A3(75)W: bow .30 cal ball mount, headlights and siren with their guards,
 * hull lifting rings, the 75 mm gun travel lock (stowed), rear plate equipment (blanket roll rack with
 * an optional rolled tarpaulin,
 * spare track shoes, tail lights, lower engine door, exhaust stacks, sheet-metal exhaust deflector,
 * towing pintle and lugs), pioneer tools on the engine deck and rear plate (TM 9-759 list: axe,
 * 5 ft crowbar, mattock, short shovel, 10 lb sledge, track adjusting wrench), the 20 ft tow cable over
 * the left side, sand-shield mounting strips (+ optional shields) and the optional white star.
 */
import { THREE, G, part, group, decal } from '../../../core/kit';
import type { Pal } from './palette';
import { H, TRACK } from './dims';
import { glacis, rearPlate } from './hull';
import { shoeGeometries, connectorGeometries } from './track';
import { onSurface, latheX, latheZ, rb, nut, prism, uHandle, bentRod, merge, D } from './util';
import { m1919Jacket } from './mg';

const { xSide, roof, sponson: ySp } = H;

/* ------------------------------------------------------------------------ front */

function ballMount(P: Pal): THREE.Object3D {
  // modelled on the glacis: local +Y = plate normal, local +Z = down the plate
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.2, 0.0], [0.19, 0.03], [0.16, 0.065], [0.125, 0.08], [0.0, 0.08]], 36, 40), P.cast));
  ps.push(part(G.scatter(nut(0.02, 0.008), Array.from({ length: 8 }, (_, i) => ({ p: [Math.cos((i / 8) * Math.PI * 2 + 0.2) * 0.175, 0.03, Math.sin((i / 8) * Math.PI * 2 + 0.2) * 0.175] as G.V3, n: [Math.cos((i / 8) * Math.PI * 2 + 0.2) * 0.5, 1, Math.sin((i / 8) * Math.PI * 2 + 0.2) * 0.5] as G.V3 }))), P.cast));
  const ball = new THREE.SphereGeometry(0.105, 28, 16);
  ps.push(part(ball, P.cast, { p: [0, 0.06, 0] }));
  // MG jacket along the hull axis: hull +Z expressed in plate-local coordinates
  const dir = new THREE.Vector3(0, Math.cos(47 * D), Math.sin(47 * D)).normalize();
  const mg = m1919Jacket(P, 0.26);
  mg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  mg.position.set(0, 0.06, 0).addScaledVector(dir, 0.07);
  ps.push(mg);
  ps.push(part(G.rod(new THREE.Vector3(0, 0.06, 0), new THREE.Vector3(0, 0.06, 0).addScaledVector(dir, 0.13), 0.034, 16), P.cast));
  return group(ps);
}

function headlight(P: Pal): THREE.Object3D {
  // lamp pointing +Z (hull forward) with its socket bracket underneath; origin at the lamp centre
  const ps: THREE.Object3D[] = [];
  ps.push(part(latheZ([[0.0, -0.08], [0.05, -0.08], [0.078, -0.055], [0.086, -0.01], [0.086, 0.035], [0.08, 0.042]], 28, 40), P.paint));
  ps.push(part(latheZ([[0.0, 0.028], [0.076, 0.03], [0.076, 0.035], [0.0, 0.038]], 28, 60), P.glass));
  ps.push(part(latheZ([[0.0, -0.02], [0.074, 0.01], [0.074, 0.02], [0.0, 0.02]], 24, 60), P.toolSteel));
  ps.push(part(G.torus(0.082, 0.007, 6, 28), P.paint, { p: [0, 0, 0.04] }));
  // blackout marker lamp on top
  ps.push(part(rb(0.07, 0.045, 0.06, 0.01), P.paint, { p: [0, 0.11, 0.0] }));
  ps.push(part(G.box(0.04, 0.008, 0.004), P.red, { p: [0, 0.112, 0.031] }));
  ps.push(part(G.cyl(0.012, 0.012, 0.03, 8), P.paint, { p: [0, 0.08, 0] }));
  // socket stem down to the bracket
  ps.push(part(G.cyl(0.018, 0.022, 0.12, 12), P.paint, { p: [0, -0.13, -0.02] }));
  return group(ps);
}

function siren(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(latheZ([[0.0, -0.09], [0.06, -0.09], [0.068, -0.07], [0.068, 0.02], [0.074, 0.03], [0.074, 0.05], [0.06, 0.06], [0.0, 0.062]], 24, 40), P.paint));
  // front grille slots
  for (let i = 0; i < 5; i++) ps.push(part(G.box(0.1 - Math.abs(i - 2) * 0.02, 0.006, 0.004), P.void, { p: [0, -0.03 + i * 0.015, 0.061] }));
  ps.push(part(G.cyl(0.016, 0.02, 0.11, 10), P.paint, { p: [0, -0.12, -0.02] }));
  return group(ps);
}

/** Flat-bar hoop guard welded to a plate, arching over a fitting (plate-local: +Y normal). */
function hoopGuard(P: Pal, w: number, h: number, depth: number): THREE.Object3D {
  const pts: THREE.Vector3[] = [];
  const nrm: THREE.Vector3[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI;
    pts.push(new THREE.Vector3(Math.cos(a) * w / 2, Math.sin(a) * h, 0));
    nrm.push(new THREE.Vector3(Math.cos(a), Math.sin(a) * (w / 2 / h), 0).normalize());
  }
  const bar = G.strap(pts, 0.04, 0.008, nrm, { smooth: false });
  const ps: THREE.Object3D[] = [];
  for (const z of [-depth / 2, depth / 2]) ps.push(part(bar, P.sheet, { p: [0, 0, z] }));
  ps.push(part(G.rbox(0.04, 0.008, depth + 0.04, 0.003, 1), P.sheet, { p: [0, h + 0.002, 0] }));
  for (const s of [-1, 1]) ps.push(part(G.rbox(0.05, 0.01, depth + 0.06, 0.003, 1), P.sheet, { p: [s * w / 2, 0.004, 0] }));
  return group(ps);
}

function travelLock(P: Pal): THREE.Object3D {
  // stowed 75 mm travel lock: base bracket with hinge, two fingers folded down the plate
  const ps: THREE.Object3D[] = [];
  ps.push(part(rb(0.24, 0.05, 0.1, 0.01), P.cast, { p: [0, 0.025, 0] }));
  ps.push(part(G.cyl(0.024, 0.024, 0.28, 14), P.toolSteel, { p: [0, 0.055, 0], r: [0, 0, 90] }));
  for (const s of [-1, 1]) {
    ps.push(part(prism([[0.0, -0.028], [0.3, -0.02], [0.33, 0.0], [0.3, 0.02], [0.0, 0.028]], 0.03, 'zy', 0.006), P.paint, { p: [s * 0.075, 0.06, 0.0] }));
    ps.push(part(prism([[-0.04, -0.03], [0.04, -0.03], [0.04, 0.03], [-0.04, 0.03]], 0.04, 'zy', 0.006), P.paint, { p: [s * 0.075, 0.055, 0.0] }));
  }
  // cradle yoke at the finger tips and rest pad on the plate
  ps.push(part(G.tube([[-0.075, 0.06, 0.31], [-0.06, 0.1, 0.33], [0.0, 0.12, 0.34], [0.06, 0.1, 0.33], [0.075, 0.06, 0.31]], 0.012, 8, 30), P.paint));
  ps.push(part(rb(0.2, 0.03, 0.06, 0.008), P.cast, { p: [0, 0.015, 0.34] }));
  ps.push(part(G.cyl(0.01, 0.01, 0.2, 8), P.toolSteel, { p: [0, 0.07, 0.1], r: [0, 0, 90] }));
  return group(ps);
}

function liftRing(P: Pal): THREE.Object3D {
  return group([
    part(G.lathe([[0.0, 0.0], [0.07, 0.0], [0.06, 0.03], [0.035, 0.04], [0.0, 0.04]], 20, 40), P.cast),
    part(G.torus(0.05, 0.016, 10, 22), P.cast, { p: [0, 0.07, 0], r: [0, 0, 0] }),
  ]);
}

function front(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const g = glacis;
  // bow MG on the assistant driver's (right) side
  out.push(onSurface([ballMount(P)], g.at(-0.43, 0.34), [1, 0, 0], g.n));
  // headlights with brush guards near the lower corners, siren on the left
  for (const sx of [-1, 1]) {
    const base = g.at(sx * 1.0, 1.02);
    const hl = headlight(P);
    const pos = new THREE.Vector3(...g.at(sx * 1.0, 1.02, 0.2));
    hl.position.copy(pos);
    out.push(hl);
    out.push(onSurface([part(rb(0.1, 0.03, 0.12, 0.008), P.cast, { p: [0, 0.015, 0] })], base, [1, 0, 0], g.n));
    out.push(onSurface([hoopGuard(P, 0.3, 0.3, 0.22)], g.at(sx * 1.0, 0.96), [1, 0, 0], g.n));
  }
  const sp = new THREE.Vector3(...g.at(0.7, 1.08, 0.16));
  const sr = siren(P);
  sr.position.copy(sp);
  out.push(sr);
  out.push(onSurface([part(rb(0.08, 0.025, 0.1, 0.006), P.cast, { p: [0, 0.012, 0] })], g.at(0.7, 1.08), [1, 0, 0], g.n));
  out.push(onSurface([hoopGuard(P, 0.22, 0.22, 0.16)], g.at(0.7, 1.03), [1, 0, 0], g.n));
  // hull lifting rings, final (outboard) pattern
  for (const sx of [-1, 1]) out.push(onSurface([liftRing(P)], g.at(sx * 1.16, 0.15), [1, 0, 0], g.n));
  // travel lock (stowed, fingers folded down the slope)
  out.push(onSurface([travelLock(P)], g.at(0, 0.2), [1, 0, 0], g.n));
  return out;
}

/* ------------------------------------------------------------------------ rear */

function tailLight(P: Pal): THREE.Object3D {
  // lamp facing +Z in its local frame (placed to face rearwards)
  return group([
    part(rb(0.14, 0.1, 0.06, 0.012), P.paint, { p: [0, 0, 0.03] }),
    part(G.box(0.05, 0.03, 0.004), P.red, { p: [-0.03, 0.02, 0.061] }),
    part(G.box(0.05, 0.03, 0.004), P.red, { p: [0.03, 0.02, 0.061] }),
    part(G.box(0.1, 0.012, 0.004), P.glass, { p: [0, -0.025, 0.061] }),
  ]);
}

function spareShoes(P: Pal, n: number): THREE.Object3D {
  // n spare T48 shoes held flat against the plate (local +Y = plate normal, +Z = down the plate)
  const ps: THREE.Object3D[] = [];
  const sg = shoeGeometries();
  const cg = connectorGeometries();
  for (let i = 0; i < n; i++) {
    const z = (i - (n - 1) / 2) * (TRACK.pitch + 0.004);
    // shoe lying with its ground side out (chevrons visible), across the plate
    const m = group([part(sg.rubber, P.rubber), part(sg.steel, P.track)], { p: [0, 0.07, z], r: [180, 0, 0] });
    ps.push(m);
  }
  ps.push(part(cg.steel, P.track, { p: [0, 0.07, (n / 2) * (TRACK.pitch + 0.004) - 0.07], r: [180, 0, 0] }));
  // holder: two angle rails and a clamp bar with a wing nut
  for (const s of [-1, 1]) ps.push(part(rb(0.04, 0.03, n * 0.16 + 0.06, 0.005), P.sheet, { p: [s * 0.22, 0.015, 0] }));
  ps.push(part(rb(0.5, 0.012, 0.04, 0.004), P.sheet, { p: [0, 0.13, 0] }));
  for (const s of [-1, 1]) ps.push(part(G.cyl(0.008, 0.008, 0.12, 8), P.toolSteel, { p: [s * 0.23, 0.07, 0] }));
  ps.push(part(nut(0.03, 0.012), P.toolSteel, { p: [0, 0.136, 0] }));
  return group(ps);
}

function blanketRack(P: Pal, w: number): THREE.Object3D {
  // local: +Y = out of the rear plate, +Z = down the plate, X across
  const ps: THREE.Object3D[] = [];
  const bars: THREE.BufferGeometry[] = [];
  const xs = [-w / 2, -w / 6, w / 6, w / 2];
  for (const x of xs) bars.push(bentRod([[x, 0.0, -0.08], [x, 0.2, -0.12], [x, 0.22, 0.14], [x, 0.0, 0.2]], 0.011, 0.03, 6));
  bars.push(G.rod([-w / 2, 0.22, 0.14], [w / 2, 0.22, 0.14], 0.011, 8));
  bars.push(G.rod([-w / 2, 0.2, -0.12], [w / 2, 0.2, -0.12], 0.011, 8));
  bars.push(G.rod([-w / 2, 0.11, 0.18], [w / 2, 0.11, 0.18], 0.01, 8));
  ps.push(part(merge(bars), P.sheet));
  for (const x of xs) for (const z of [-0.08, 0.2]) ps.push(part(rb(0.05, 0.012, 0.04, 0.004), P.sheet, { p: [x, 0.006, z] }));
  return group(ps);
}

/** Rolled tarpaulin, axis along X, centred; soft ends with the rolled layers showing, three straps. */
function tarpRoll(P: Pal, L: number, r: number): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const prof: [number, number][] = [[0.0, -L / 2], [r * 0.8, -L / 2], [r * 0.95, -L / 2 + 0.012], [r, -L / 2 + 0.04]];
  const n = 16;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    // slightly uneven fold bulges between the straps
    const bulge = 1 + 0.035 * Math.sin(t * Math.PI * 4 + 0.6) * Math.sin(t * Math.PI);
    prof.push([r * bulge, -L / 2 + 0.04 + (L - 0.08) * t]);
  }
  prof.push([r, L / 2 - 0.04], [r * 0.95, L / 2 - 0.012], [r * 0.8, L / 2], [0.0, L / 2]);
  const roll = latheX(prof.map(([a, b]) => [a, b] as [number, number]), 28, 50);
  roll.scale(1, 0.93, 1);
  ps.push(part(roll, P.canvas));
  // rolled layers on the end faces (a raised spiral)
  for (const sx of [-1, 1]) {
    const pts: G.V3[] = [];
    const turns = 3.2;
    for (let i = 0; i <= 90; i++) {
      const t = i / 90;
      const a = t * turns * Math.PI * 2;
      const rr = r * (0.18 + 0.62 * t);
      pts.push([sx * (L / 2 + 0.001), Math.sin(a) * rr * 0.93, Math.cos(a) * rr]);
    }
    ps.push(part(G.tube(pts, 0.0035, 5, 120), P.canvas));
  }
  // webbing straps with buckles
  for (const x of [-L * 0.34, 0, L * 0.34]) {
    ps.push(part(latheX([[r * 0.97, -0.019], [r + 0.005, -0.019], [r + 0.005, 0.019], [r * 0.97, 0.019]], 28, 60), P.canvas, { p: [x, 0, 0], s: [1, 0.93, 1] }));
    ps.push(part(rb(0.045, 0.01, 0.034, 0.003), P.toolSteel, { p: [x, r * 0.93 + 0.006, -0.01] }));
  }
  return group(ps);
}

function rear(P: Pal, tarp: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const R = rearPlate;
  // blanket roll rack across the top of the upper rear plate
  const rack: THREE.Object3D[] = [blanketRack(P, 1.86)];
  if (tarp) rack.push(group([tarpRoll(P, 1.66, 0.086)], { p: [0, 0.099, 0.035] }));
  out.push(onSurface(rack, R.at(0, 0.2), [1, 0, 0], R.n));
  // tail lights with guards at the top corners
  for (const sx of [-1, 1]) {
    const tl = tailLight(P);
    const o = R.at(sx * 1.13, 0.13, 0.0);
    out.push(onSurface([group([tl], { r: [-90, 0, 0] }), hoopGuard(P, 0.2, 0.15, 0.12)], o, [1, 0, 0], R.n));
    // spare track shoes (three each side)
    out.push(onSurface([spareShoes(P, 3)], R.at(sx * 0.78, 0.55), [1, 0, 0], R.n));
  }
  // sledge and track adjusting wrench in clips on the plate centre
  out.push(onSurface([sledge(P)], R.at(0.02, 0.45), [0, 0, 1], R.n));
  out.push(onSurface([trackWrench(P)], R.at(-0.05, 0.66), [1, 0, 0], R.n));

  // lower rear plate: engine access door, exhaust stacks, deflector, towing pintle and lugs
  const zL = H.lowRearZ;
  out.push(part(rb(0.64, 0.4, 0.03, 0.01), P.paint, { p: [0, 0.86, zL - 0.015] }));
  for (const x of [-0.2, 0.2]) out.push(part(G.cyl(0.022, 0.022, 0.1, 12), P.paint, { p: [x, 1.07, zL - 0.035], r: [0, 0, 90] }));
  out.push(part(G.scatter(nut(0.024, 0.01), [-0.28, -0.1, 0.1, 0.28].flatMap((x) => [[x, 0.68, zL - 0.03], [x, 1.04, zL - 0.03]] as G.V3[]).map((p) => ({ p, n: [0, 0, -1] as G.V3 }))), P.paint));
  for (const sx of [-1, 1]) {
    const x = sx * 0.52;
    out.push(part(G.cyl(0.11, 0.11, 0.03, 24), P.exhaust, { p: [x, 0.92, zL - 0.015], r: [90, 0, 0] }));
    out.push(part(G.tube([[x, 0.92, zL - 0.02], [x, 0.92, zL - 0.1], [x, 0.87, zL - 0.15], [x, 0.78, zL - 0.16]], 0.075, 16, 24), P.exhaust));
    out.push(part(G.cyl(0.066, 0.066, 0.01, 16), P.void, { p: [x, 0.772, zL - 0.16] }));
  }
  // sheet-metal exhaust deflector hanging under the overhang (lowered position)
  const dz0 = H.rearBotZ + 0.02, dy0 = ySp - 0.015, dz1 = zL - 0.25, dy1 = 0.66;
  const defl = group([], {});
  const n = new THREE.Vector3(0, dz0 - dz1, -(dy0 - dy1)).normalize();
  const len = Math.hypot(dy0 - dy1, dz0 - dz1);
  const face = prism([[-0.74, 0], [0.74, 0], [0.74, len], [-0.74, len]], 0.006, 'xy', 0.002);
  defl.add(part(face, P.sheet));
  for (const y of [0.1, len / 2, len - 0.08]) defl.add(part(G.cyl(0.008, 0.008, 1.44, 8), P.sheet, { p: [0, y, -0.006], r: [0, 0, 90] }));
  defl.add(part(G.cyl(0.012, 0.012, 1.5, 8), P.sheet, { p: [0, 0, -0.002], r: [0, 0, 90] }));
  for (const s of [-1, 1]) defl.add(part(uHandle(0.1, 0.035, 0.007), P.sheet, { p: [s * 0.55, 0.08, -0.004], r: [-90, 0, 0] }));
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, dy0 - dy1, dz0 - dz1).normalize(),
    n.clone().negate(),
  ));
  defl.quaternion.copy(q);
  defl.position.set(0, dy1, dz1);
  out.push(defl);
  // deflector side cheeks and hinge brackets
  for (const s of [-1, 1]) {
    out.push(part(prism([[zL - 0.005, 0.66], [dz1 - 0.01, 0.66], [dz0 - 0.005, dy0], [zL - 0.005, dy0]].map(([z, y]) => [z, y] as [number, number]), 0.006, 'zy', 0.002), P.sheet, { p: [s * 0.742, 0, 0] }));
    out.push(part(rb(0.05, 0.05, 0.04, 0.008), P.sheet, { p: [s * 0.6, dy0 - 0.01, dz0 + 0.02] }));
  }
  // towing pintle under the deflector and the cast towing lugs at the corners
  out.push(part(rb(0.24, 0.16, 0.05, 0.015), P.cast, { p: [0, 0.6, zL - 0.025] }));
  out.push(part(prism([[0, -0.03], [0.14, -0.03], [0.19, 0.02], [0.15, 0.07], [0.1, 0.03], [0, 0.04]], 0.07, 'zy', 0.01), P.cast, { p: [0, 0.58, zL - 0.03], r: [0, 180, 0] }));
  out.push(part(G.torus(0.05, 0.016, 8, 20, Math.PI * 1.3), P.toolSteel, { p: [0, 0.61, zL - 0.15], r: [0, 90, 0] }));
  out.push(part(G.cyl(0.012, 0.012, 0.1, 8), P.toolSteel, { p: [0, 0.63, zL - 0.12] }));
  for (const sx of [-1, 1]) {
    out.push(part(prism([[0, -0.05], [0.1, -0.04], [0.14, 0.0], [0.1, 0.05], [0, 0.06]], 0.07, 'zy', 0.012), P.cast, { p: [sx * 0.68, 0.56, zL - 0.01], r: [0, 180, 0] }));
    out.push(part(G.cyl(0.028, 0.028, 0.075, 14), P.void, { p: [sx * 0.68, 0.565, zL - 0.09], r: [0, 0, 90] }));
  }
  // auxiliary generator exhaust pipe run out to the rear (left)
  out.push(part(G.tube([[0.72, 1.05, zL - 0.02], [0.72, 1.0, zL - 0.12], [0.72, 0.8, zL - 0.2]], 0.018, 8, 20), P.exhaust));
  return out;
}

/* ------------------------------------------------------------------------ tools */

function clamp(P: Pal, w: number): THREE.Object3D {
  return group([
    part(rb(w, 0.012, 0.035, 0.004), P.sheet, { p: [0, 0.006, 0] }),
    part(G.tube([[-w / 2 + 0.01, 0.01, 0], [-w / 2 + 0.01, 0.055, 0], [w / 2 - 0.01, 0.055, 0], [w / 2 - 0.01, 0.01, 0]], 0.006, 6, 20), P.sheet),
    part(rb(0.025, 0.012, 0.03, 0.004), P.toolSteel, { p: [w / 2 - 0.01, 0.06, 0] }),
  ]);
}

function axe(P: Pal): THREE.Object3D {
  // lying along +Z on y = 0 (head at +Z)
  return group([
    part(G.rod([0, 0.025, -0.4], [0, 0.025, 0.38], 0.016, 10, 0.018), P.wood),
    part(prism([[-0.06, -0.025], [0.1, -0.05], [0.12, 0.0], [0.1, 0.05], [-0.06, 0.025]], 0.04, 'xz', 0.006), P.toolSteel, { p: [0.02, 0.025, 0.4] }),
  ]);
}

function shovel(P: Pal): THREE.Object3D {
  return group([
    part(G.rod([0, 0.025, -0.45], [0, 0.025, 0.2], 0.017, 10), P.wood),
    part(G.tube([[-0.06, 0.025, -0.45], [-0.06, 0.025, -0.52], [0.0, 0.025, -0.56], [0.06, 0.025, -0.52], [0.06, 0.025, -0.45]], 0.012, 8, 24), P.wood),
    part(G.rod([0, 0.025, 0.18], [0, 0.03, 0.3], 0.022, 10), P.toolSteel),
    // blade painted olive drab like the rest of the pioneer set, with a pressed centre rib
    part(prism([[-0.12, 0.0], [0.12, 0.0], [0.13, 0.2], [0.07, 0.3], [0.0, 0.33], [-0.07, 0.3], [-0.13, 0.2]], 0.006, 'xz', 0.002), P.sheet, { p: [0, 0.03, 0.29] }),
    part(G.rod([0, 0.034, 0.3], [0, 0.034, 0.5], 0.008, 8, 0.004), P.sheet),
  ]);
}

function mattockHandle(P: Pal): THREE.Object3D {
  return group([part(G.rod([0, 0.03, -0.45], [0, 0.03, 0.45], 0.022, 10, 0.03), P.wood)]);
}

function mattockHead(P: Pal): THREE.Object3D {
  // pick-mattock head stowed separately, lying along Z: pick point one end, adze blade the other
  return group([
    part(prism([[-0.022, -0.3], [0.022, -0.3], [0.03, -0.05], [0.03, 0.05], [0.02, 0.26], [0.0, 0.3], [-0.02, 0.26], [-0.03, 0.05], [-0.03, -0.05]], 0.04, 'xz', 0.006), P.toolSteel, { p: [0, 0.022, 0] }),
    part(prism([[-0.045, -0.36], [0.045, -0.36], [0.03, -0.29], [-0.03, -0.29]], 0.012, 'xz', 0.003), P.toolSteel, { p: [0, 0.01, 0] }),
    part(G.cyl(0.042, 0.042, 0.06, 14), P.toolSteel, { p: [0, 0.03, 0] }),
    part(G.cyl(0.026, 0.026, 0.062, 12), P.void, { p: [0, 0.031, 0] }),
  ]);
}

function crowbar(P: Pal, L: number): THREE.Object3D {
  return group([
    part(G.rod([0, 0.02, -L / 2], [0, 0.02, L / 2 - 0.08], 0.016, 8), P.toolSteel),
    part(G.rod([0, 0.02, L / 2 - 0.08], [0, 0.012, L / 2], 0.016, 8, 0.004), P.toolSteel),
    part(G.rod([0, 0.02, -L / 2], [0, 0.03, -L / 2 - 0.04], 0.016, 8, 0.006), P.toolSteel),
  ]);
}

function sledge(P: Pal): THREE.Object3D {
  // along +Z, head at +Z (placed hanging head-down on the rear plate)
  return group([
    part(G.rod([0, 0.03, -0.38], [0, 0.03, 0.34], 0.017, 10, 0.02), P.wood),
    part(rb(0.2, 0.07, 0.07, 0.012), P.toolSteel, { p: [0, 0.04, 0.38] }),
    group([clamp(P, 0.1)], { p: [0, 0, -0.2] }),
    group([clamp(P, 0.12)], { p: [0, 0.02, 0.38] }),
  ]);
}

function trackWrench(P: Pal): THREE.Object3D {
  // track adjusting wrench: long bar with a box end, lying across
  return group([
    part(G.rod([-0.45, 0.03, 0], [0.36, 0.03, 0], 0.017, 8), P.toolSteel),
    part(G.cyl(0.05, 0.05, 0.05, 6), P.toolSteel, { p: [0.4, 0.03, 0] }),
    part(G.cyl(0.03, 0.03, 0.052, 6), P.void, { p: [0.4, 0.031, 0] }),
    clamp(P, 0.08),
  ]);
}

function tools(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = roof;
  const put = (o: THREE.Object3D, x: number, z: number, ry = 0) => {
    o.position.set(x, y, z);
    o.rotation.y = ry * D;
    out.push(o);
  };
  // left deck strip: crowbar and axe; right: shovel and mattock
  put(crowbar(P, 1.52), 0.96, -1.84);
  for (const z of [-1.3, -2.35]) put(clamp(P, 0.08), 0.96, z);
  put(axe(P), 1.17, -1.95, 180);
  for (const z of [-1.7, -2.3]) put(clamp(P, 0.08), 1.17, z);
  put(shovel(P), -0.98, -1.95, 180);
  for (const z of [-1.55, -2.3]) put(clamp(P, 0.08), -0.98, z);
  put(mattockHandle(P), -1.18, -1.9, 180);
  for (const z of [-1.55, -2.3]) put(clamp(P, 0.08), -1.18, z);
  put(mattockHead(P), 1.17, -1.25, 0);
  return out;
}

/* ------------------------------------------------------------------------ tow cable */

function towCable(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const x = xSide + 0.03;
  const yC = 1.36;
  const zs = [2.05, 1.1, 0.0, -1.1, -2.2];
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < zs.length - 1; i++) {
    const a = zs[i], b = zs[i + 1];
    for (let k = 0; k < 6; k++) {
      const t = k / 6;
      pts.push(new THREE.Vector3(x, yC - 0.035 * Math.sin(t * Math.PI), a + (b - a) * t));
    }
  }
  pts.push(new THREE.Vector3(x, yC, zs[zs.length - 1]));
  out.push(part(G.tube(pts, 0.0143, 8, 160), P.cable));
  // spliced eye ends on hooks, and the clamps
  for (const [z, s] of [[zs[0], 1], [zs[zs.length - 1], -1]] as [number, number][]) {
    out.push(part(G.rod([x, yC, z], [x, yC, z + s * 0.14], 0.022, 10), P.toolSteel));
    out.push(part(G.torus(0.05, 0.013, 8, 20), P.cable, { p: [x, yC, z + s * 0.2], r: [0, 90, 0] }));
    out.push(part(G.tube([[xSide, yC + 0.05, z + s * 0.25], [xSide + 0.05, yC + 0.05, z + s * 0.25], [xSide + 0.06, yC + 0.0, z + s * 0.25], [xSide + 0.05, yC - 0.05, z + s * 0.25]], 0.012, 8, 20), P.paint));
    out.push(part(rb(0.02, 0.1, 0.05, 0.006), P.paint, { p: [xSide + 0.01, yC + 0.02, z + s * 0.25] }));
  }
  for (const z of zs.slice(1, -1)) {
    out.push(part(rb(0.02, 0.06, 0.08, 0.006), P.paint, { p: [xSide + 0.01, yC, z] }));
    out.push(part(G.tube([[xSide + 0.01, yC + 0.03, z], [x + 0.022, yC + 0.022, z], [x + 0.022, yC - 0.022, z], [xSide + 0.01, yC - 0.03, z]], 0.007, 6, 16), P.sheet));
  }
  return out;
}

/* ------------------------------------------------------------------------ sand shields */

function sandShields(P: Pal, fitted: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const zF = 2.6, zR = H.rearBotZ + 0.03;
  for (const sx of [-1, 1]) {
    // welded mounting strip with bolt holes (always present)
    out.push(part(rb(0.022, 0.04, zF - zR, 0.004), P.paint, { p: [sx * (xSide + 0.011), ySp + 0.02, (zF + zR) / 2] }));
    const holes: G.V3[] = [];
    for (let z = zR + 0.1; z < zF - 0.05; z += 0.3) holes.push([sx * (xSide + 0.023), ySp + 0.02, z]);
    out.push(part(G.scatter(nut(0.018, 0.006), holes.map((p) => ({ p, n: [sx, 0, 0] as G.V3 }))), fitted ? P.sheet : P.void));
    if (!fitted) continue;
    // three shield panels with rolled lower edges; the front one turns down ahead of the sprocket
    const segs: [number, number][] = [[zF, 1.12], [1.14, -0.88], [-0.86, zR]];
    for (const [a, b] of segs) {
      const L = a - b;
      out.push(part(prism([[-L / 2, -0.25], [L / 2, -0.25], [L / 2, 0.035], [-L / 2, 0.035]], 0.004, 'zy', 0.0015), P.sheet, { p: [sx * (xSide + 0.024), ySp, (a + b) / 2] }));
      // rolled lower edge and a pressed stiffening swage
      out.push(part(G.cyl(0.007, 0.007, L, 8), P.sheet, { p: [sx * (xSide + 0.025), ySp - 0.25, (a + b) / 2], r: [90, 0, 0] }));
      out.push(part(G.cyl(0.004, 0.004, L - 0.06, 6), P.sheet, { p: [sx * (xSide + 0.026), ySp - 0.1, (a + b) / 2], r: [90, 0, 0] }));
      // overlapping joint strap with bolts at the rear end of each panel
      out.push(part(rb(0.008, 0.28, 0.05, 0.002), P.sheet, { p: [sx * (xSide + 0.029), ySp - 0.105, b + 0.02] }));
    }
    // front piece: turns down ahead of the sprocket
    out.push(part(prism([[0, 0.035], [0.2, 0.035], [0.2, -0.05], [0.11, -0.34], [0.0, -0.25]], 0.004, 'zy', 0.0015), P.sheet, { p: [sx * (xSide + 0.024), ySp, zF] }));
  }
  return out;
}

/* ------------------------------------------------------------------------ markings */

function star(key: string, d: number): (ctx: CanvasRenderingContext2D, w: number, h: number) => void {
  return (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = w * 0.48, r = R * 0.382;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? R : r;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#d9d6c8';
    ctx.fill();
    // moderate weathering: speckled chips and a dusty lower half
    let seed = key.length * 97 + Math.round(d * 1000);
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    ctx.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 260; i++) {
      const x = rnd() * w, y = rnd() * h, s = 1 + rnd() * 3.5;
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(76,74,50,0.85)' : 'rgba(140,128,100,0.35)';
      ctx.fillRect(x, y, s, s * (0.5 + rnd()));
    }
    const gr = ctx.createLinearGradient(0, h * 0.4, 0, h);
    gr.addColorStop(0, 'rgba(150,135,105,0)');
    gr.addColorStop(1, 'rgba(150,135,105,0.35)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  };
}

function stars(): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const d = 0.6;
  for (const sx of [-1, 1]) {
    out.push(decal('m4a3-star', d, d, star('m4a3-star', d), { p: [sx * (xSide + 0.003), 1.52, -0.42], r: [0, sx * 90, 0] }, 256));
  }
  return out;
}

export interface FittingOpts {
  sandShields: boolean;
  star: boolean;
  /** rolled tarpaulin in the rear blanket rack */
  tarp: boolean;
}

export function fittings(P: Pal, o: FittingOpts): THREE.Group {
  const parts: THREE.Object3D[] = [...front(P), ...rear(P, o.tarp), ...tools(P), ...towCable(P), ...sandShields(P, o.sandShields)];
  if (o.star) parts.push(...stars());
  return group(parts, { name: 'fittings' });
}

