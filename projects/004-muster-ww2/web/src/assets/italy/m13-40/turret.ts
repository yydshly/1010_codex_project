/**
 * M13/40 turret (II/III serie pattern): two-man riveted turret of flat plates on a horseshoe plan
 * (sloped front, sides and faceted rear), the narrow rounded mantlet carrying the 47/32 Mod. 35 gun
 * with the co-axial Breda 38 on its left, the roof bulge over the breech (II serie onwards), the
 * rectangular split roof hatch, two monocular periscopes, pistol ports in the side plates, and
 * the company marking (red rectangle = 1st company, one white bar = 1st platoon, tank number).
 *
 * Turret-local frame: origin at the ring centre on the ring collar top, +Z forward, +X left.
 */
import { THREE, G, part, group, decal } from '../../../core/kit';
import { T } from './dims';
import type { Pal } from './palette';
import { prismoid, rb, bolt, cylZ, merge, faceTo, type P2, type P3 } from './util';

const H = T.h;
/** bottom and top plan outlines (x, z), same point count */
function plan(halfW: number, zFront: number, zArc: number): P2[] {
  const pts: P2[] = [[halfW, zFront]];
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI;
    pts.push([halfW * Math.cos(a), zArc - halfW * Math.sin(a)]);
  }
  pts.push([-halfW, zFront]);
  return pts;
}
const ARC_Z = -0.15;
export const BOT = plan(0.58, 0.58, ARC_Z);
export const TOP = plan(0.36, 0.43, ARC_Z);

function markingDecal(num: string): (ctx: CanvasRenderingContext2D, w: number, h: number) => void {
  return (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // tank number above the rectangle
    ctx.fillStyle = '#e9e4d6';
    ctx.font = `bold ${Math.round(h * 0.42)}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num, w / 2, h * 0.22);
    // company rectangle (1st company: red) with one white platoon bar
    const rh = h * 0.46, ry = h - rh - h * 0.02;
    ctx.fillStyle = '#9e2f27';
    ctx.fillRect(w * 0.04, ry, w * 0.92, rh);
    ctx.fillStyle = '#e9e4d6';
    ctx.fillRect(w * 0.44, ry, w * 0.12, rh);
  };
}

export function turret(P: Pal, markings: boolean): THREE.Group {
  const out: THREE.Object3D[] = [];
  // ring collar and body
  out.push(part(G.cyl(0.56, 0.57, 0.014, 48), P.cast, { p: [0, -0.007, 0] }));
  out.push(part(prismoid(BOT, 0, TOP, H), P.paint));

  // bolts along every plate's top and bottom edge and on the plate joints
  const bl: THREE.BufferGeometry[] = [];
  const n = BOT.length;
  const faces: { n: THREE.Vector3; c: THREE.Vector3; u: THREE.Vector3; b0: THREE.Vector3; b1: THREE.Vector3; t0: THREE.Vector3; t1: THREE.Vector3 }[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const b0 = new THREE.Vector3(BOT[i][0], 0, BOT[i][1]), b1 = new THREE.Vector3(BOT[j][0], 0, BOT[j][1]);
    const t0 = new THREE.Vector3(TOP[i][0], H, TOP[i][1]), t1 = new THREE.Vector3(TOP[j][0], H, TOP[j][1]);
    const c = b0.clone().add(b1).add(t0).add(t1).multiplyScalar(0.25);
    const nn = new THREE.Vector3().subVectors(b1, b0).cross(new THREE.Vector3().subVectors(t0, b0)).normalize();
    if (nn.dot(new THREE.Vector3(c.x, 0, c.z - ARC_Z * 0)) < 0) nn.negate();
    faces.push({ n: nn, c, u: new THREE.Vector3().subVectors(b1, b0).normalize(), b0, b1, t0, t1 });
  }
  for (let i = 0; i < n; i++) {
    const f = faces[i];
    if (i === n - 1) continue; // front plate: carries the mantlet (bolted separately)
    const inset = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().lerp(b, k);
    const top0 = inset(f.t0, f.b0, 0.07), top1 = inset(f.t1, f.b1, 0.07);
    const bot0 = inset(f.b0, f.t0, 0.07), bot1 = inset(f.b1, f.t1, 0.07);
    const L = f.b0.distanceTo(f.b1);
    const cnt = Math.max(3, Math.round(L / 0.1));
    const trim = (a: THREE.Vector3, b: THREE.Vector3, k: number): [THREE.Vector3, THREE.Vector3] => [a.clone().lerp(b, k), b.clone().lerp(a, k)];
    const [ta, tb] = trim(top0, top1, 0.12), [ba, bb] = trim(bot0, bot1, 0.1);
    const place = G.along([ta.x, ta.y, ta.z], [tb.x, tb.y, tb.z], Math.max(3, cnt - 1)).concat(G.along([ba.x, ba.y, ba.z], [bb.x, bb.y, bb.z], cnt));
    bl.push(G.scatter(bolt(0.01, 0.0062), place.map((p, k) => ({ p: p.clone().addScaledVector(f.n, -0.001), n: f.n, spin: k }))));
  }
  // front plate: rows beside the mantlet opening
  {
    const f = faces[n - 1];
    for (const k of [0.1, 0.9]) {
      const a = f.b0.clone().lerp(f.b1, k), b = f.t0.clone().lerp(f.t1, k);
      const pts = G.along([a.x, a.y, a.z], [b.x, b.y, b.z], 7).slice(1, 6);
      bl.push(G.scatter(bolt(0.01, 0.0062), pts.map((p) => ({ p: p.clone().addScaledVector(f.n, -0.001), n: f.n }))));
    }
  }
  out.push(part(merge(bl), P.paint));

  // ---- mantlet: rounded horizontal-axis casting in the front plate opening
  const zc = 0.4, rO = 0.17, rI = 0.11;
  const arc: P2[] = [];
  const A = (62 * Math.PI) / 180;
  for (let i = 0; i <= 16; i++) {
    const a = -A + (2 * A * i) / 16;
    arc.push([zc + Math.cos(a) * rO, T.gunY + Math.sin(a) * rO]);
  }
  for (let i = 16; i >= 0; i--) {
    const a = -A + (2 * A * i) / 16;
    arc.push([zc + Math.cos(a) * rI, T.gunY + Math.sin(a) * rI]);
  }
  const mw = 0.6, mx = 0.05;
  const mant = G.plate(arc, mw, 'zy', 0.008);
  mant.translate(mx, 0, 0);
  out.push(part(mant, P.cast));
  // fixed cheeks either side of the mantlet
  for (const sx of [1, -1]) {
    const x = mx + sx * (mw / 2 + 0.025);
    out.push(part(rb(0.05, 0.34, 0.12, 0.012), P.cast, { p: [x, T.gunY, 0.5] }));
  }

  // ---- 47/32 gun: recoil sleeve, tapered barrel, muzzle ring, bore
  const gx = T.gunX, gy = T.gunY;
  const zM = zc + rO - 0.01;
  const gun = G.lathe(
    [
      [0.0, zM - 0.02],
      [0.064, zM - 0.02],
      [0.064, zM + 0.03],
      [0.056, zM + 0.04],
      [0.056, zM + 0.2],
      [0.06, zM + 0.21],
      [0.06, zM + 0.24],
      [0.046, zM + 0.25],
      [0.037, 1.93],
      [0.041, 1.935],
      [0.041, 1.975],
      [0.036, 1.985],
      [0.0, 1.985],
    ],
    28,
    35,
  );
  gun.rotateX(Math.PI / 2);
  out.push(part(gun, P.sheet, { p: [gx, gy, 0] }));
  out.push(part(cylZ(0.0236, 0.004, 20, 1.986), P.void, { p: [gx, gy, 0] }));
  // gunner's sight aperture in the mantlet (to the right of the gun)
  out.push(part(rb(0.05, 0.034, 0.02, 0.006), P.cast, { p: [gx - 0.13, gy + 0.05, zM + 0.005] }));
  out.push(part(G.box(0.032, 0.016, 0.004), P.vision, { p: [gx - 0.13, gy + 0.05, zM + 0.016] }));

  // ---- co-axial Breda 38 (left of the gun)
  const cx = T.mgX;
  const mg = G.lathe(
    [
      [0.0, zM - 0.02],
      [0.042, zM - 0.02],
      [0.042, zM + 0.05],
      [0.03, zM + 0.06],
      [0.03, zM + 0.09],
      [0.013, zM + 0.1],
      [0.013, zM + 0.36],
      [0.018, zM + 0.365],
      [0.017, zM + 0.42],
      [0.0, zM + 0.42],
    ],
    14,
    35,
  );
  mg.rotateX(Math.PI / 2);
  out.push(part(mg, P.gun, { p: [cx, gy, 0] }));
  out.push(part(cylZ(0.006, 0.003, 10, zM + 0.4215), P.void, { p: [cx, gy, 0] }));

  // ---- roof: breech bulge, split hatch, periscopes
  const roofY = H;
  out.push(part(rb(0.24, 0.07, 0.24, 0.02), P.paint, { p: [gx, roofY + 0.015, 0.28] }));
  out.push(part(G.scatter(bolt(0.009, 0.006), [[-0.1, 0.18], [0.1, 0.18], [-0.1, 0.38], [0.1, 0.38]].map(([x, z]) => ({ p: new THREE.Vector3(gx + x, roofY + 0.05, z), n: new THREE.Vector3(0, 1, 0) }))), P.paint));
  const hz = -0.14, hl = 0.46, hwh = 0.28, hx = 0.02;
  for (const sx of [1, -1]) {
    const cxh = hx + sx * (hwh / 2 + 0.003);
    out.push(part(rb(hwh, 0.022, hl, 0.008), P.paint, { p: [cxh, roofY + 0.012, hz] }));
    out.push(part(rb(0.03, 0.012, hl - 0.1, 0.004), P.paint, { p: [cxh, roofY + 0.028, hz] }));
    // hinges on the outer edge
    for (const dz of [-0.14, 0.14]) {
      out.push(part(cylZ(0.016, 0.08, 12, hz + dz), P.cast, { p: [hx + sx * (hwh + 0.02), roofY + 0.014, 0] }));
    }
    // grab handle
    out.push(part(G.tube([[cxh - sx * 0.08, roofY + 0.023, hz - 0.06], [cxh - sx * 0.08, roofY + 0.05, hz - 0.04], [cxh - sx * 0.08, roofY + 0.05, hz + 0.04], [cxh - sx * 0.08, roofY + 0.023, hz + 0.06]], 0.007, 8, 16), P.cast));
  }
  // periscopes (left: loader, right: commander)
  for (const sx of [1, -1]) {
    const px = sx * 0.24, pz = 0.2;
    out.push(part(G.cyl(0.058, 0.062, 0.03, 20), P.cast, { p: [px, roofY + 0.015, pz] }));
    out.push(part(rb(0.08, 0.1, 0.09, 0.012), P.cast, { p: [px, roofY + 0.075, pz] }));
    out.push(part(rb(0.1, 0.012, 0.11, 0.004), P.cast, { p: [px, roofY + 0.128, pz + 0.01] }));
    out.push(part(G.box(0.056, 0.04, 0.004), P.vision, { p: [px, roofY + 0.085, pz + 0.046] }));
  }

  // ---- pistol ports in the side plates (revolving shutters worked from inside)
  for (const [fi, k] of [[0, 0.62], [n - 2, 0.38]] as [number, number][]) {
    const f = faces[fi];
    const p = f.b0.clone().lerp(f.b1, k).lerp(f.t0.clone().lerp(f.t1, k), 0.45);
    const port = group([
      part(G.cyl(0.06, 0.064, 0.016, 24), P.cast, { r: [90, 0, 0], p: [0, 0, 0.006] }),
      part(G.cyl(0.018, 0.018, 0.02, 12), P.cast, { r: [90, 0, 0], p: [0, 0, 0.016] }),
      part(G.box(0.05, 0.008, 0.004), P.void, { p: [0, 0.03, 0.013] }),
    ]);
    out.push(faceTo(port, [p.x, p.y, p.z], [f.n.x, f.n.y, f.n.z]));
  }

  // ---- markings: turret sides and rear
  if (markings) {
    const draw = markingDecal('3');
    for (const [fi, k] of [[0, 0.28], [n - 2, 0.72], [3, 0.5]] as [number, number][]) {
      const f = faces[fi];
      const p = f.b0.clone().lerp(f.b1, k).lerp(f.t0.clone().lerp(f.t1, k), 0.55).addScaledVector(f.n, 0.004);
      out.push(faceTo(decal('m1340-mark', 0.22, 0.25, draw), [p.x, p.y, p.z] as P3, [f.n.x, f.n.y, f.n.z]));
    }
  }
  return group(out, { name: 'turret' });
}
