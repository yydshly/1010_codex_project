/**
 * Pedestal (Sockel) on the platform centre and the traversing upper carriage (raw frame): fixed
 * pedestal and traverse ring, turntable deck, the two side walls carrying the trunnion bearings,
 * the front brackets of the two spring equilibrators, the right-hand layers' station (elevation and
 * traverse handwheels with gearboxes, follow-the-pointer data receivers, two seats) and the
 * left-hand fuze-setter station (fuze-setting machine with its two cups and crank, seat).
 * The equilibrator cylinders themselves depend on the elevation and are built by `equilibrators`.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Palette } from './palette';
import { D, toWorld } from './dims';
import { cylX, cylY, bolts, v3, barBetween, handwheel, type V2 } from './util';

function pedestal(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const y0 = D.pedBase, y1 = D.pedTop;
  const prof: V2[] = [
    [0, y0], [0.56, y0], [0.565, y0 + 0.006], [0.565, y0 + 0.04], [0.5, y0 + 0.05], [0.44, y0 + 0.1],
    [0.4, y0 + 0.2], [0.39, y1 - 0.06], [0.44, y1 - 0.05], [0.48, y1 - 0.045], [0.485, y1 - 0.04], [0.485, y1], [0, y1],
  ];
  o.push(part(G.lathe(prof, 64, 35), P.cast));
  // base flange bolts
  const bp: THREE.Vector3[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.1;
    bp.push(v3(Math.cos(a) * 0.52, y0 + 0.04, Math.sin(a) * 0.52));
  }
  o.push(part(bolts(bp, [0, 1, 0], 0.028, 0.012), P.cast));
  // vertical ribs on the column
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const r = 0.43;
    o.push(part(G.rbox(0.03, 0.25, 0.1, 0.006, 1), P.cast, { p: [Math.cos(a) * r, y0 + 0.17, Math.sin(a) * r], r: [0, (-a * 180) / Math.PI, 0] }));
  }
  // traverse ring (fixed race + rotating race)
  o.push(part(cylY(0.5, y1, y1 + 0.02, 64, 0, 0, 0.004), P.steel));
  o.push(part(cylY(0.5, y1 + 0.02, D.ringTop, 64, 0, 0, 0.006), P.cast));
  // turntable deck
  o.push(part(cylY(D.deckR, D.ringTop, D.deckTop, 64, 0, 0, 0.008), P.paint));
  return o;
}

/** One side wall of the upper carriage (built on +X, mirrored). */
function cheek(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const x = D.cheekX - D.cheekT / 2;
  const tz = D.trunZ, ty = D.trunY, y0 = D.deckTop;
  const outline: V2[] = [[D.cheekZ0, y0], [D.cheekZ1, y0], [D.cheekZ1, y0 + 0.12], [tz + 0.2, ty - 0.02]];
  for (let i = 0; i <= 10; i++) {
    const a = ((20 + (i * 140) / 10) * Math.PI) / 180;
    outline.push([tz + Math.cos(a) * 0.16, ty + Math.sin(a) * 0.16]);
  }
  outline.push([tz - 0.28, ty - 0.1], [D.cheekZ0, y0 + 0.14]);
  o.push(part(G.plate(outline, D.cheekT, 'zy', 0.005), P.paint, { p: [x, 0, 0] }));
  // bottom flange on the deck
  o.push(part(G.rbox(0.07, 0.02, D.cheekZ1 - D.cheekZ0, 0.006, 1), P.paint, { p: [x + 0.02, y0 + 0.01, (D.cheekZ0 + D.cheekZ1) / 2] }));
  // stiffening rib along the front edge
  o.push(barBetween([x + 0.03, y0 + 0.1, D.cheekZ1 - 0.02], [x + 0.03, ty - 0.05, tz + 0.22], 0.035, 0.03, P.paint));
  // trunnion bearing housing + cap
  o.push(part(cylX(0.13, D.cheekX, D.cheekX + 0.03, 40, ty, tz, 0.006), P.cast));
  o.push(part(cylX(0.09, D.cheekX + 0.03, D.cheekX + 0.05, 32, ty, tz, 0.004), P.cast));
  const bp: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    bp.push(v3(D.cheekX + 0.03, ty + Math.sin(a) * 0.11, tz + Math.cos(a) * 0.11));
  }
  o.push(part(bolts(bp, [1, 0, 0], 0.022, 0.009), P.steel));
  // deck bolts along the flange
  const fb: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) fb.push(v3(x + 0.04, y0 + 0.02, D.cheekZ0 + 0.1 + i * ((D.cheekZ1 - D.cheekZ0 - 0.2) / 5)));
  o.push(part(bolts(fb, [0, 1, 0], 0.018, 0.008), P.steel));
  return o;
}

/** Equilibrator lower bracket on +X (mirrored): arm from the side wall and a clevis of two ears. */
function eqBracket(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const x = D.eqX, y = D.eqLowY, z = D.eqLowZ;
  o.push(part(G.rbox(x + 0.09 - D.cheekX, 0.05, 0.17, 0.008, 2), P.cast, { p: [(x + 0.09 + D.cheekX) / 2, D.deckTop - 0.025, z] }));
  for (const dx of [-0.075, 0.075]) {
    const ear: V2[] = [[z - 0.08, D.deckTop - 0.05], [z + 0.08, D.deckTop - 0.05], [z + 0.07, y + 0.02], [z + 0.03, y + 0.06], [z - 0.03, y + 0.06], [z - 0.07, y + 0.02]];
    o.push(part(G.plate(ear, 0.022, 'zy', 0.004), P.cast, { p: [x + dx, 0, 0] }));
  }
  o.push(part(cylX(0.03, x - 0.1, x + 0.1, 20, y, z, 0.004), P.steel));
  o.push(part(cylX(0.042, x + 0.086, x + 0.1, 20, y, z, 0.003), P.steel));
  return o;
}

/** Gearbox + shaft + handwheel on the -X side. Wheel plane at x = xw, hub at (y, z). */
function layerWheel(P: Palette, xs: number, xw: number, y: number, z: number, R: number, a0: number): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  o.push(part(G.rbox(0.09, 0.16, 0.16, 0.02, 3), P.cast, { p: [xs - 0.045, y, z] }));
  o.push(part(cylX(0.05, xs - 0.09, xs - 0.11, 24, y, z, 0.004), P.cast));
  o.push(part(cylX(0.018, xs - 0.1, xw, 16, y, z), P.steel));
  const w = group(handwheel(R, a0, P.steel, P.steel, P.grip));
  w.scale.x = -1;
  w.position.set(xw, y, z);
  o.push(w);
  return o;
}

/** Follow-the-pointer receiver dial on the -X side, face towards -X. */
function receiver(P: Palette, x: number, y: number, z: number): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  o.push(part(G.rbox(0.07, 0.22, 0.22, 0.02, 3), P.black, { p: [x - 0.035, y, z] }));
  o.push(part(cylX(0.085, x - 0.07, x - 0.085, 40, y, z, 0.004), P.black));
  o.push(part(cylX(0.072, x - 0.08, x - 0.082, 40, y, z, 0.0005), P.dial));
  // pointers
  o.push(part(G.rbox(0.003, 0.11, 0.008, 0.001, 1), P.black, { p: [x - 0.084, y + 0.01, z], r: [30, 0, 0] }));
  o.push(part(G.rbox(0.003, 0.09, 0.007, 0.001, 1), P.steel, { p: [x - 0.0845, y - 0.005, z], r: [-60, 0, 0] }));
  o.push(part(cylX(0.074, x - 0.087, x - 0.09, 40, y, z, 0.0005), P.glass));
  return o;
}

/** Crew seat: arm from (x0, z) at the deck edge out to the seat at (x1, z), pan height ys. */
function seat(P: Palette, x0: number, x1: number, z: number, ys: number): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const s = Math.sign(x1);
  const xk = s * 0.58;
  o.push(barBetween([x0, D.deckTop - 0.005, z], [xk, D.deckTop - 0.005, z], 0.05, 0.05, P.paint));
  o.push(barBetween([xk, D.deckTop - 0.005, z], [x1, ys - 0.07, z], 0.05, 0.05, P.paint));
  o.push(part(cylY(0.022, ys - 0.1, ys - 0.02, 16, x1, z), P.steel));
  // pan + cushion
  o.push(part(G.lathe([[0, 0], [0.15, 0], [0.16, 0.01], [0.16, 0.03], [0, 0.03]], 32, 40), P.paint, { p: [x1, ys - 0.03, z] }));
  o.push(part(G.lathe([[0, 0], [0.145, 0], [0.152, 0.012], [0.145, 0.035], [0.1, 0.045], [0, 0.047]], 32, 50), P.leather, { p: [x1, ys, z] }));
  return o;
}

/** Fuze-setting machine on the left (+X) with its support and crank. */
function fuzeSetter(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const x = 0.66, z = -0.55, yb = 1.05, h = 0.36;
  // support brackets from the side wall
  for (const zz of [z - 0.15, z + 0.15]) o.push(barBetween([D.cheekX + 0.01, yb + 0.06, zz], [x - 0.14, yb + 0.06, zz], 0.05, 0.08, P.paint));
  o.push(barBetween([D.cheekX + 0.01, D.deckTop + 0.02, z], [x - 0.12, yb - 0.02, z], 0.05, 0.05, P.paint));
  // housing
  o.push(part(G.rbox(0.28, h, 0.46, 0.03, 3), P.cast, { p: [x, yb + h / 2, z] }));
  o.push(part(G.rbox(0.3, 0.03, 0.48, 0.01, 2), P.cast, { p: [x, yb + h + 0.01, z] }));
  // two setting cups, open-topped, tilted back towards the loaders
  for (const dz of [-0.11, 0.11]) {
    const cup: V2[] = [[0.0, 0], [0.07, 0], [0.075, 0.01], [0.075, 0.2], [0.085, 0.21], [0.085, 0.225], [0.066, 0.225], [0.066, 0.02], [0, 0.02]];
    o.push(part(G.lathe(cup, 32, 40), P.cast, { p: [x, yb + h + 0.02, z + dz], r: [-12, 0, 0] }));
    o.push(part(cylY(0.066, yb + h + 0.035, yb + h + 0.04, 28, x, z + dz - 0.004), P.steel));
  }
  // setting dial on the outer face
  o.push(part(cylX(0.07, x + 0.14, x + 0.155, 36, yb + 0.22, z - 0.1, 0.003), P.black));
  o.push(part(cylX(0.06, x + 0.155, x + 0.157, 36, yb + 0.22, z - 0.1, 0.0005), P.dial));
  o.push(part(cylX(0.062, x + 0.159, x + 0.161, 36, yb + 0.22, z - 0.1, 0.0005), P.glass));
  // crank
  const w = group(handwheel(0.1, Math.PI * 0.25, P.steel, P.steel, P.grip));
  w.position.set(x + 0.2, yb + 0.12, z + 0.12);
  o.push(part(cylX(0.016, x + 0.14, x + 0.2, 14, yb + 0.12, z + 0.12), P.steel));
  o.push(w);
  return o;
}

export function carriage(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [...pedestal(P)];
  const L = group(cheek(P));
  const R = group(cheek(P));
  R.scale.x = -1;
  o.push(L, R);
  // floor plate between the walls
  o.push(part(G.rbox(2 * (D.cheekX - D.cheekT) - 0.004, 0.02, D.cheekZ1 - D.cheekZ0 - 0.02, 0.005, 1), P.paint, { p: [0, D.deckTop + 0.009, (D.cheekZ0 + D.cheekZ1) / 2] }));
  // front cross member between the walls
  o.push(part(G.rbox(2 * (D.cheekX - D.cheekT), 0.12, 0.05, 0.008, 2), P.paint, { p: [0, D.deckTop + 0.07, D.cheekZ1 - 0.03] }));
  const eb = group(eqBracket(P));
  const ebm = group(eqBracket(P));
  ebm.scale.x = -1;
  o.push(eb, ebm);
  // right: layers' station
  o.push(...layerWheel(P, -D.cheekX - 0.05, -0.56, 1.2, -0.62, 0.15, 0.8));
  o.push(...layerWheel(P, -D.cheekX, -0.54, 1.12, 0.12, 0.15, 2.2));
  o.push(part(cylY(0.03, D.deckTop - 0.01, 1.05, 16, -0.36, 0.12), P.cast));
  o.push(...receiver(P, -D.cheekX - 0.02, 1.31, -0.1));
  o.push(...receiver(P, -D.cheekX - 0.02, 1.2, -0.85));
  // gearbox mounts for the elevation wheel (it sits proud of the wall on a pad)
  o.push(part(G.rbox(0.05, 0.2, 0.2, 0.01, 2), P.cast, { p: [-D.cheekX - 0.025, 1.2, -0.62] }));
  o.push(...seat(P, -0.3, -0.95, 0.1, 0.82));
  o.push(...seat(P, -0.3, -0.95, -0.62, 0.86));
  // left: fuze-setter station
  o.push(...fuzeSetter(P));
  o.push(...seat(P, 0.3, 0.98, 0.05, 0.8));
  return o;
}

/** The two spring equilibrators between the carriage brackets and the cradle at `deg` elevation. */
export function equilibrators(P: Palette, deg: number): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const [uy, uz] = toWorld(D.eqUpY, D.eqUpZ, deg);
  for (const s of [1, -1]) {
    const a = new THREE.Vector3(s * D.eqX, D.eqLowY, D.eqLowZ);
    const b = new THREE.Vector3(s * D.eqX, uy, uz);
    const len = a.distanceTo(b);
    const R = D.eqR;
    const body: THREE.Object3D[] = [];
    // lower eye (pin along X) and clevis block
    body.push(part(cylX(0.05, -0.05, 0.05, 24, 0, 0, 0.004), P.cast));
    body.push(part(G.rbox(0.1, 0.08, 0.1, 0.012, 2), P.cast, { p: [0, 0.05, 0] }));
    // spring cylinder
    const bodyLen = 0.38;
    const prof: V2[] = [
      [0, 0.08], [R - 0.012, 0.08], [R + 0.008, 0.09], [R + 0.008, 0.12], [R, 0.125], [R, 0.08 + bodyLen - 0.05],
      [R + 0.008, 0.08 + bodyLen - 0.045], [R + 0.008, 0.08 + bodyLen - 0.01], [R - 0.01, 0.08 + bodyLen], [0.045, 0.08 + bodyLen],
      [0.045, 0.08 + bodyLen + 0.03], [0.035, 0.08 + bodyLen + 0.04], [0, 0.08 + bodyLen + 0.04],
    ];
    body.push(part(G.lathe(prof, 40, 35), P.barrel));
    // flange bolts round the top cap
    const bp: THREE.Vector3[] = [];
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2;
      bp.push(v3(Math.cos(t) * (R - 0.02), 0.08 + bodyLen + 0.001, Math.sin(t) * (R - 0.02)));
    }
    body.push(part(bolts(bp, [0, 1, 0], 0.016, 0.007), P.steel));
    // piston rod up to the upper eye
    body.push(part(cylY(0.028, 0.08 + bodyLen + 0.03, Math.max(len - 0.04, 0.08 + bodyLen + 0.05), 20, 0, 0), P.bright));
    body.push(part(G.rbox(0.06, 0.06, 0.07, 0.01, 2), P.steel, { p: [0, len - 0.035, 0] }));
    body.push(part(cylX(0.044, -0.03, 0.03, 24, len, 0, 0.004), P.steel));
    const g = group(body);
    g.position.copy(a);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    o.push(g);
  }
  return o;
}
