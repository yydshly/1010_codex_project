/**
 * Box trail of Carriage 25-pr Mk I: a front section of two riveted side members round the open
 * breech well (the breech drops between them at high elevation), the closed axle box under the
 * saddle with the axletree, then a closed box tapering to the cast trail end with the towing
 * eye, the spade underneath, drag handles, the stowed handspike (right) and the layer's seat
 * (left).
 *
 * Construction frame (see dims.ts): gun on its wheels, ground y = 0.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { D, trailTop, trailBot, trailHalfW } from './dims';
import { P } from './palette';
import { barZY, cylX, cylZ, row, type V2, type V3 } from './util';

const HW = D.trailHW, ST = D.trailSideT;
const XI = HW - ST; // inner face of the side members
const zW = D.wellRearZ;

/** Left side member (+X); mirrored for the right. */
function sideMember(): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const out: V2[] = [
    [D.trailFrontZ, 0.3],
    [D.trailFrontZ, 0.665],
    [0.165, D.trailTopFront],
    [-0.3, D.trailTopFront],
    [zW, trailTop(zW)],
    [zW, trailBot(zW)],
    [0.0, D.trailBotFront],
    [0.14, D.trailBotFront],
  ];
  o.push(part(G.plate(out, ST, 'zy', 0.003), P.paint(), { p: [HW - ST / 2, 0, 0] }));
  // inward flanges along the top and bottom edges (channel section)
  const fw = 0.06, ft = 0.01, fx = HW - fw / 2;
  o.push(barZY([0.165, D.trailTopFront - ft / 2], [-0.3, D.trailTopFront - ft / 2], fx, fw, ft, P.paint()));
  o.push(barZY([-0.3, D.trailTopFront - ft / 2], [zW + 0.01, trailTop(zW) - ft / 2], fx, fw, ft, P.paint()));
  o.push(barZY([0.14, D.trailBotFront + ft / 2], [zW + 0.01, trailBot(zW) + ft / 2], fx, fw, ft, P.paint()));
  // rivet rows along the flanges (outer face)
  const rv: { p: V3; n: V3 }[] = [];
  const line = (a: V2, b: V2, n: number) => {
    for (const v of G.along([HW, a[1], a[0]], [HW, b[1], b[0]], n)) rv.push({ p: [v.x, v.y, v.z], n: [1, 0, 0] });
  };
  line([0.13, D.trailTopFront - 0.018], [-0.28, D.trailTopFront - 0.018], 7);
  line([-0.34, trailTop(-0.34) - 0.018], [zW + 0.04, trailTop(zW + 0.04) - 0.018], 10);
  line([0.1, D.trailBotFront + 0.018], [zW + 0.04, trailBot(zW + 0.04) + 0.018], 16);
  o.push(part(G.scatter(G.rivetHead(0.0055), rv), P.paint()));
  // axle boss on the outer face
  o.push(part(cylX(0.078, HW, HW + 0.03, 36, 0.005), P.cast(), { p: [0, D.axleY, 0] }));
  o.push(part(G.scatter(G.boltHead(0.016, 0.006), Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    return { p: [HW + 0.03, D.axleY + Math.sin(a) * 0.058, Math.cos(a) * 0.058] as V3, n: [1, 0, 0] as V3 };
  })), P.cast()));
  // vertical stiffener (angle) on the outer face behind the axle
  o.push(part(G.rbox(0.03, D.trailTopFront - D.trailBotFront - 0.03, 0.01, 0.003, 1), P.paint(), { p: [HW + 0.015, (D.trailTopFront + D.trailBotFront) / 2, -0.3] }));
  return o;
}

function axleBox(): THREE.Object3D[] {
  // Closed box under the saddle: front transom, saddle bed on top, bottom plate, rear wall.
  const o: THREE.Object3D[] = [];
  const zr = -0.3;
  o.push(part(G.rbox(XI * 2, 0.665 - 0.3, 0.012, 0.003, 1), P.paint(), { p: [0, (0.665 + 0.3) / 2, D.trailFrontZ - 0.006] }));
  o.push(part(G.rbox(HW * 2 + 0.01, 0.012, D.trailFrontZ - zr + 0.01, 0.003, 1), P.paint(), { p: [0, D.trailTopFront + 0.006, (D.trailFrontZ + zr) / 2] }));
  o.push(part(G.rbox(XI * 2, 0.012, 0.14 - zr, 0.003, 1), P.paint(), { p: [0, D.trailBotFront + 0.006, (0.14 + zr) / 2] }));
  o.push(part(G.rbox(XI * 2, D.trailTopFront - D.trailBotFront - 0.01, 0.012, 0.003, 1), P.paint(), { p: [0, (D.trailTopFront + D.trailBotFront) / 2, zr] }));
  // chamfer plate on the lower front edge
  o.push(barZY([D.trailFrontZ, 0.3], [0.14, D.trailBotFront], 0, XI * 2, 0.012, P.paint()));
  // rivets across the front transom
  o.push(part(G.scatter(G.rivetHead(0.0055), [...row([-0.2, 0.64, D.trailFrontZ], [0.2, 0.64, D.trailFrontZ], 7, [0, 0, 1]), ...row([-0.2, 0.33, D.trailFrontZ], [0.2, 0.33, D.trailFrontZ], 7, [0, 0, 1])]), P.paint()));
  // towing / lashing eyes on the front transom
  for (const sx of [1, -1]) {
    const e = G.torus(0.028, 0.009, 8, 20);
    o.push(part(e, P.cast(), { p: [sx * 0.16, 0.36, D.trailFrontZ + 0.02], r: [90, 0, 0] }));
    o.push(part(G.rbox(0.05, 0.03, 0.03, 0.005, 1), P.cast(), { p: [sx * 0.16, 0.39, D.trailFrontZ + 0.012] }));
  }
  // axletree through the box
  o.push(part(cylX(0.05, -0.79, 0.79, 36, 0.004), P.cast(), { p: [0, D.axleY, 0] }));
  for (const sx of [1, -1]) {
    o.push(part(cylX(0.064, 0, 0.04, 32, 0.004), P.cast(), { p: [sx > 0 ? 0.66 : -0.7, D.axleY, 0] }));
  }
  // well cross stays along the bottom
  for (const z of [-0.55, -0.85]) {
    o.push(part(cylX(0.022, -XI, XI, 16, 0.002), P.paint(), { p: [0, trailBot(z) + 0.03, z] }));
  }
  return o;
}

function rearBox(hi: boolean): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const secs: { z: number; ring: [number, number][]; dy: number }[] = [];
  const n = hi ? 36 : 24;
  const zs = [D.trailEndZ, -2.3, -2.0, -1.8, -1.6, -1.45, -1.3, -1.18, zW];
  for (const z of zs) {
    const t = trailTop(z), b = trailBot(z);
    secs.push({ z, ring: G.superRing(trailHalfW(z), (t - b) / 2, n, 8), dy: (t + b) / 2 });
  }
  o.push(part(G.loftZ(secs, true, 40), P.paint()));
  // seams: rivet rows along the top and bottom edges on both sides
  const rv: { p: V3; n: V3 }[] = [];
  for (const sx of [1, -1]) {
    for (let i = 0; i <= 18; i++) {
      const z = zW - 0.05 - (i / 18) * (zW - 0.05 - (D.trailEndZ + 0.3));
      const hw = trailHalfW(z);
      rv.push({ p: [sx * hw, trailTop(z) - 0.02, z], n: [sx, 0, 0] });
      rv.push({ p: [sx * hw, trailBot(z) + 0.02, z], n: [sx, 0, 0] });
    }
  }
  o.push(part(G.scatter(G.rivetHead(0.0055), rv), P.paint()));
  // drag handles on both sides near the end
  for (const sx of [1, -1]) {
    const z0 = -2.12, z1 = -2.34;
    const x0 = sx * trailHalfW(z0), x1 = sx * trailHalfW(z1);
    const y = (trailTop(-2.23) + trailBot(-2.23)) / 2 + 0.01;
    o.push(part(G.tube([[x0, y, z0], [x0 + sx * 0.055, y, z0 - 0.02], [x1 + sx * 0.055, y, z1 + 0.02], [x1, y, z1]], 0.011, 8, 32), P.paint()));
    for (const [x, z] of [[x0, z0], [x1, z1]] as [number, number][]) o.push(part(G.rbox(0.02, 0.04, 0.04, 0.005, 1), P.cast(), { p: [x + sx * 0.006, y, z] }));
  }
  return o;
}

function trailEnd(): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const z1 = D.trailEndZ - 0.02, z0 = -2.4;
  const zc = (z0 + z1) / 2;
  const hw = trailHalfW(D.trailEndZ) + 0.012;
  const t = trailTop(D.trailEndZ) + 0.012, b = trailBot(D.trailEndZ);
  // cast end block over the box end
  o.push(part(G.rbox(hw * 2, t - b, z0 - z1, 0.014, 2), P.spade(), { p: [0, (t + b) / 2, zc] }));
  // handspike socket on top
  o.push(part(G.lathe([[0.024, 0], [0.036, 0], [0.036, 0.06], [0.03, 0.066], [0.024, 0.066], [0.024, 0]], 24, 40), P.cast(), { p: [0, t - 0.004, zc + 0.02] }));
  o.push(part(G.cyl(0.024, 0.024, 0.003, 20), P.bore(), { p: [0, t + 0.06, zc + 0.02] }));
  // towing eye: forged stem and a horizontal ring
  const ey = (trailTop(D.trailEndZ) + trailBot(D.trailEndZ)) / 2;
  o.push(part(cylZ(0.034, D.eyeZ + 0.03, z1 + 0.005, 24, 0.004), P.cast(), { p: [0, ey, 0] }));
  o.push(part(G.rbox(0.12, 0.1, 0.03, 0.01, 2), P.cast(), { p: [0, ey, z1 - 0.005] }));
  const eye = G.torus(0.048, 0.021, 14, 36);
  eye.rotateX(Math.PI / 2);
  o.push(part(eye, P.bright(), { p: [0, ey, D.eyeZ] }));
  return o;
}

function spade(): THREE.Object3D[] {
  // Spade under the trail end: blade (cutting edge on the ground, raked forward), top flange
  // bolted to the underside of the trail, two gussets behind the blade.
  const o: THREE.Object3D[] = [];
  const zb = D.spadeZ;
  const yTop = trailBot(zb) + 0.004;
  const tilt = 14;
  const h = yTop / Math.cos(THREE.MathUtils.degToRad(tilt));
  const hw = 0.25;
  const outline: V2[] = [
    [-hw + 0.07, 0],
    [hw - 0.07, 0],
    [hw, 0.07],
    [hw, h],
    [-hw, h],
    [-hw, 0.07],
  ];
  const g = G.plate(outline, 0.016, 'xy', 0.003, 0.01);
  g.rotateX(THREE.MathUtils.degToRad(-tilt));
  o.push(part(g, P.spade(), { p: [0, 0.008 * Math.sin(THREE.MathUtils.degToRad(tilt)), zb] }));
  // top flange under the trail bottom
  o.push(part(G.rbox(hw * 2 - 0.02, 0.014, 0.16, 0.004, 1), P.spade(), { p: [0, yTop - 0.011, zb - 0.03] }));
  o.push(part(G.scatter(G.boltHead(0.018, 0.007), [-0.19, -0.12, 0.12, 0.19].map((x) => ({ p: [x, yTop - 0.018, zb - 0.07] as V3, n: [0, -1, 0] as V3 }))), P.cast()));
  // gussets behind the blade
  const tanT = Math.tan(THREE.MathUtils.degToRad(tilt));
  for (const gx of [-0.13, 0.13]) {
    const gus: V2[] = [
      [zb - 0.03 * tanT - 0.01, 0.03],
      [zb - yTop * tanT - 0.008, yTop],
      [zb - 0.1, yTop],
    ];
    o.push(part(G.plate(gus, 0.014, 'zy', 0.003), P.spade(), { p: [gx, 0, 0] }));
  }
  return o;
}

function handspike(): THREE.Object3D[] {
  // Traversing handspike stowed in two clips along the right side of the trail.
  const o: THREE.Object3D[] = [];
  const za = -1.72, zb = -2.36;
  const ya = (trailTop(za) + trailBot(za)) / 2 + 0.03, yb = (trailTop(zb) + trailBot(zb)) / 2 + 0.03;
  const xa = -(trailHalfW(za) + 0.035), xb = -(trailHalfW(zb) + 0.035);
  const dir = new THREE.Vector3(xb - xa, yb - ya, zb - za).normalize();
  const A = new THREE.Vector3(xa, ya, za).addScaledVector(dir, 0.14);
  const B = new THREE.Vector3(xb, yb, zb).addScaledVector(dir, -0.1);
  o.push(part(G.rod(A, B, 0.019, 14), P.bright()));
  o.push(part(G.rod(B, B.clone().addScaledVector(dir, -0.05), 0.022, 14), P.cast()));
  for (const t of [0.22, 0.78]) {
    const z = za + (zb - za) * t;
    const hwz = trailHalfW(z);
    const y = ya + (yb - ya) * t;
    o.push(part(G.rbox(0.04, 0.05, 0.035, 0.006, 1), P.cast(), { p: [-(hwz + 0.018), y, z] }));
  }
  return o;
}

function seat(): THREE.Object3D[] {
  // Layer's seat on the left side member: bracket arm and a pressed-steel pan.
  const o: THREE.Object3D[] = [];
  const zs = -0.82;
  const c: V3 = [0.47, 0.6, zs];
  o.push(part(G.rbox(0.02, 0.12, 0.14, 0.004, 1), P.cast(), { p: [HW + 0.01, 0.46, zs] }));
  o.push(part(G.tube([[HW + 0.018, 0.47, zs], [0.36, 0.5, zs], [0.45, 0.56, zs], [c[0], c[1] - 0.03, zs]], 0.016, 10, 24), P.paint()));
  o.push(part(G.rod([HW + 0.018, 0.42, zs + 0.05], [0.4, 0.53, zs + 0.01], 0.01, 8), P.paint()));
  o.push(part(G.lathe([[0, -0.012], [0.08, -0.012], [0.128, -0.002], [0.14, 0.022], [0.132, 0.026], [0.12, 0.008], [0.07, 0.0], [0, 0.0]], 36, 35), P.paint(), { p: c }));
  return o;
}

export function buildTrail(hi: boolean): THREE.Group {
  return group([mirrorX(group(sideMember())), ...axleBox(), ...rearBox(hi), ...trailEnd(), ...handspike(), ...seat()], { name: 'trail' });
}

export function buildSpade(): THREE.Group {
  return group(spade(), { name: 'spade' });
}
