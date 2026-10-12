/**
 * Rolling chassis seen from below and through the wheel arches: ribbed floor stamping with the
 * central backbone tunnel (forked at the rear for the transaxle, broadened at the front as the
 * frame head), front axle with two transverse torsion tubes and trailing links, steering tie
 * rods, rear torsion-bar tube with spring plates, swing-axle tubes, transaxle, the underside of
 * the air-cooled flat-four, exhaust and muffler, front and rear towing hooks.
 * Layout after TM E9-803 (sections XX-XXII, XXVIII); proportions estimated from photographs.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V3, beadGeo, merge } from './util';

const rod = (a: V3, b: V3, r: number, seg = 14) => G.rod(a, b, r, seg);

/** Box geometry between two points along its long axis (flat bar / link). */
function bar(a: V3, b: V3, w: number, h: number, up: V3 = [0, 1, 0], r = 0.004): THREE.BufferGeometry {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const g = G.rbox(w, h, len, r, 1);
  const zAxis = B.clone().sub(A).normalize();
  const yAxis = new THREE.Vector3(...up).sub(zAxis.clone().multiplyScalar(zAxis.dot(new THREE.Vector3(...up)))).normalize();
  const xAxis = yAxis.clone().cross(zAxis).normalize();
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis).setPosition(A.clone().add(B).multiplyScalar(0.5));
  return g.applyMatrix4(m);
}

function floorAndBackbone(): THREE.BufferGeometry[] {
  const gs: THREE.BufferGeometry[] = [];
  const y0 = D.sillY;
  // pressed longitudinal ribs on the underside of the floor halves
  for (const s of [1, -1]) {
    for (const x of [0.25, 0.42, 0.6]) gs.push(beadGeo([s * x, y0, -0.72], [s * x, y0, 0.78], [0, -1, 0], 0.036, 0.006, 8));
    // transverse rib under the seat cross member
    gs.push(beadGeo([s * 0.14, y0, 0.02], [s * 0.74, y0, 0.02], [0, -1, 0], 0.04, 0.007, 8));
    gs.push(beadGeo([s * 0.14, y0, -0.4], [s * 0.74, y0, -0.4], [0, -1, 0], 0.04, 0.007, 8));
  }
  // backbone: welded underside plate + tube
  gs.push(G.rbox(0.19, 0.03, 1.86, 0.012, 2).translate(0, 0.305, 0.03));
  // frame head (front): broadened box carrying the axle tubes
  gs.push(G.rbox(0.3, 0.13, 0.58, 0.03, 2).translate(0, 0.365, 1.2));
  // fork at the rear (two arms either side of the transaxle)
  for (const s of [1, -1]) gs.push(bar([s * 0.1, 0.32, -0.86], [s * 0.2, 0.36, -1.32], 0.05, 0.05, [0, 1, 0], 0.01));
  // sills (rolled lower body flange along the floor edge)
  for (const s of [1, -1]) gs.push(G.rbox(0.03, 0.028, 1.6, 0.008, 1).translate(s * (D.halfW - 0.017), y0 + 0.012, 0.05));
  return gs;
}

function frontAxle(): { paint: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[]; rubber: THREE.BufferGeometry[] } {
  const paint: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const rubber: THREE.BufferGeometry[] = [];
  const zT = D.zFA + 0.155; // axle tubes ahead of the wheel centre (trailing links)
  const yL = 0.33, yU = 0.408;
  for (const y of [yL, yU]) {
    paint.push(rod([-0.5, y, zT], [0.5, y, zT], 0.029, 18));
    // end housings of the link-pin bearings
    for (const s of [1, -1]) paint.push(G.cyl(0.037, 0.037, 0.06, 18).rotateZ(Math.PI / 2).translate(s * 0.5, y, zT));
  }
  // uprights joining the tubes at the frame head and at the ends (shock towers)
  for (const s of [1, -1]) {
    paint.push(G.rbox(0.05, 0.12, 0.05, 0.01, 1).translate(s * 0.42, (yL + yU) / 2, zT));
    // trailing links (upper and lower) to the king-pin carrier
    for (const y of [yL, yU]) paint.push(bar([s * 0.5, y, zT - 0.01], [s * 0.575, y, D.zFA + 0.01], 0.034, 0.024));
    // king-pin carrier
    paint.push(G.cyl(0.026, 0.026, 0.12, 14).translate(s * 0.585, (yL + yU) / 2, D.zFA));
    // steering arm pointing rearwards
    paint.push(bar([s * 0.585, 0.37, D.zFA], [s * 0.54, 0.372, D.zFA - 0.12], 0.02, 0.014));
    // shock absorber: lower link to the tower
    steel.push(rod([s * 0.52, yL + 0.01, zT - 0.05], [s * 0.44, yU + 0.02, zT - 0.02], 0.02, 14));
    // tie rod (split track rod) from the drop arm to the steering arm
    steel.push(rod([s * 0.54, 0.372, D.zFA - 0.12], [s * 0.06, 0.37, D.zFA - 0.1], 0.0095, 10));
    steel.push(new THREE.SphereGeometry(0.017, 12, 8).translate(s * 0.54, 0.372, D.zFA - 0.12));
    // rubber gaiter on the tie-rod end
    rubber.push(G.cyl(0.014, 0.018, 0.03, 12).rotateZ(Math.PI / 2).translate(s * 0.505, 0.372, D.zFA - 0.118));
  }
  // steering box on the upper tube (driver side) with drop arm
  paint.push(G.rbox(0.09, 0.07, 0.08, 0.015, 2).translate(0.12, yU + 0.02, zT - 0.04));
  paint.push(bar([0.08, yU, zT - 0.06], [0.06, 0.37, D.zFA - 0.1], 0.02, 0.015));
  return { paint, steel, rubber };
}

function rearAxle(): { paint: THREE.BufferGeometry[]; cast: THREE.BufferGeometry[]; rubber: THREE.BufferGeometry[] } {
  const paint: THREE.BufferGeometry[] = [];
  const cast: THREE.BufferGeometry[] = [];
  const rubber: THREE.BufferGeometry[] = [];
  const zTor = -0.86, yTor = 0.37;
  const yAx = D.axleY + 0.081;
  // torsion-bar tube across the floor with end caps
  paint.push(rod([-0.62, yTor, zTor], [0.62, yTor, zTor], 0.036, 20));
  for (const s of [1, -1]) {
    paint.push(G.cyl(0.05, 0.05, 0.03, 20).rotateZ(Math.PI / 2).translate(s * 0.635, yTor, zTor));
    // spring plate from the tube end to the axle tube (trailing arm)
    paint.push(bar([s * 0.63, yTor, zTor - 0.02], [s * 0.54, yAx, D.zRA + 0.03], 0.05, 0.012, [1, 0, 0]));
    // swing-axle tube from the transaxle to the reduction housing, rubber boot at the inner end
    paint.push(rod([s * 0.2, yAx, D.zRA], [s * 0.505, yAx, D.zRA], 0.03, 18));
    paint.push(G.cyl(0.042, 0.03, 0.05, 18).rotateZ(Math.PI / 2).translate(s * 0.225, yAx, D.zRA));
    rubber.push(G.lathe([[0.045, 0], [0.05, 0.012], [0.041, 0.024], [0.05, 0.036], [0.041, 0.048], [0.047, 0.06], [0.036, 0.07]], 20, 50).rotateZ(-s * Math.PI / 2).translate(s * 0.13, yAx, D.zRA));
    // rear shock absorber from the axle to the body
    paint.push(rod([s * 0.47, yAx - 0.03, D.zRA - 0.05], [s * 0.5, 0.56, D.zRA - 0.17], 0.02, 14));
  }
  // transaxle: gearbox nose, differential housing with side covers, bell housing
  cast.push(G.rbox(0.2, 0.15, 0.3, 0.04, 3).translate(0, 0.43, -0.98));
  cast.push(G.cyl(0.11, 0.11, 0.24, 28).rotateZ(Math.PI / 2).translate(0, yAx, D.zRA));
  for (const s of [1, -1]) cast.push(G.cyl(0.075, 0.09, 0.03, 24).rotateZ(Math.PI / 2).translate(s * 0.13, yAx, D.zRA));
  cast.push(G.lathe([[0.1, 0], [0.14, 0.05], [0.15, 0.12], [0.15, 0.14]], 32, 40).rotateX(-Math.PI / 2).translate(0, 0.46, -1.26));
  return { paint, cast, rubber };
}

function engine(): { cast: THREE.BufferGeometry[]; black: THREE.BufferGeometry[]; exhaust: THREE.BufferGeometry[] } {
  const cast: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const exhaust: THREE.BufferGeometry[] = [];
  const z0 = -1.4, z1 = -1.62;
  // crankcase halves with the split line and oil strainer plate
  cast.push(G.rbox(0.22, 0.2, 0.26, 0.04, 3).translate(0, 0.47, (z0 + z1) / 2));
  cast.push(G.cyl(0.07, 0.07, 0.012, 24).translate(0, 0.365, (z0 + z1) / 2));
  const nut = G.boltHead(0.012, 0.006).rotateX(Math.PI);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    cast.push(nut.clone().translate(Math.cos(a) * 0.058, 0.359, (z0 + z1) / 2 + Math.sin(a) * 0.058));
  }
  // cylinder banks under their cooling tin, with the lower deflector plates
  for (const s of [1, -1]) {
    black.push(G.rbox(0.25, 0.17, 0.25, 0.03, 2).translate(s * 0.235, 0.49, (z0 + z1) / 2));
    // fins peeking out below the tin
    for (let i = 0; i < 7; i++) cast.push(G.cyl(0.05, 0.05, 0.004, 18).rotateZ(Math.PI / 2).translate(s * (0.14 + i * 0.012), 0.4, (z0 + z1) / 2 - 0.05));
    for (let i = 0; i < 7; i++) cast.push(G.cyl(0.05, 0.05, 0.004, 18).rotateZ(Math.PI / 2).translate(s * (0.14 + i * 0.012), 0.4, (z0 + z1) / 2 + 0.07));
    // exhaust pipe from the head to the muffler
    exhaust.push(G.tube([[s * 0.33, 0.43, -1.47], [s * 0.35, 0.37, -1.56], [s * 0.33, 0.37, -1.66], [s * 0.3, 0.385, -1.7]], 0.017, 10, 24));
  }
  // transverse muffler under the tail with a short tail pipe (right-hand side)
  exhaust.push(G.cyl(0.062, 0.062, 0.62, 28).rotateZ(Math.PI / 2).translate(0, 0.385, -1.725));
  for (const s of [1, -1]) exhaust.push(G.lathe([[0.0, 0], [0.058, 0.0], [0.064, 0.008], [0.062, 0.014]], 28, 40).rotateZ(-s * Math.PI / 2).translate(s * 0.323, 0.385, -1.725));
  exhaust.push(G.tube([[-0.24, 0.35, -1.76], [-0.25, 0.335, -1.81], [-0.26, 0.332, -1.86]], 0.019, 12, 12));
  // muffler hanger straps
  for (const s of [1, -1]) black.push(G.rbox(0.03, 0.09, 0.012, 0.003, 1).translate(s * 0.2, 0.43, -1.725));
  return { cast, black, exhaust };
}

function towHooks(): THREE.BufferGeometry[] {
  const gs: THREE.BufferGeometry[] = [];
  const hook = (x: number, y: number, z: number, dir: 1 | -1) => {
    // mounting plate + hook shank + open hook
    gs.push(G.rbox(0.07, 0.012, 0.09, 0.003, 1).translate(x, y - 0.006, z - dir * 0.03));
    gs.push(G.rbox(0.03, 0.05, 0.03, 0.006, 1).translate(x, y - 0.035, z));
    const t = G.torus(0.026, 0.009, 8, 20, Math.PI * 1.35);
    t.rotateY(Math.PI / 2);
    t.rotateX(dir > 0 ? -Math.PI * 0.2 : Math.PI * 1.2);
    t.translate(x, y - 0.075, z + dir * 0.02);
    gs.push(t);
  };
  hook(0, 0.397, 1.69, 1);
  hook(0, 0.457, -1.8, -1);
  return gs;
}

export function buildChassis(): THREE.Group {
  const fa = frontAxle();
  const ra = rearAxle();
  const en = engine();
  return group([
    part(merge([...floorAndBackbone(), ...fa.paint, ...ra.paint]), P.chassis()),
    part(merge([...fa.steel]), P.darkSteel()),
    part(merge([...fa.rubber, ...ra.rubber]), P.rubber()),
    part(merge([...ra.cast, ...en.cast]), P.casting()),
    part(merge(en.black), P.black()),
    part(merge(en.exhaust), P.exhaust()),
    part(merge(towHooks()), P.darkSteel()),
  ]);
}
