/**
 * Assault pack (Gefechtsgepaeck, introduced 1939): the canvas-webbing "A" frame (about 28 x 26 cm)
 * carried on the upper back from the Y-straps, with the M31 mess tin strapped at the top, the
 * Zeltbahn rolled into a horseshoe around the mess tin, and the small assault-pack bag at the
 * bottom. Authored in a BACK-LOCAL frame: +Z out of the back, +Y up, +X across; the frame's
 * back (the webbing touching the soldier) lies on z = 0; origin at the frame centre.
 *
 * `hooks` are the two upper leg ends (back-local) where the short leather link straps start;
 * the fitter draws those straps up to the D-rings on the rear of the Y-straps' shoulder straps.
 */
import { THREE, G, group, part } from '../../../../core/kit';
import { roundEnds, dRing, frameBuckle } from '../../gear/util';
import { F, pillow, dome, placeY } from '../geo';
import { messTin, MESS_TIN } from './bags';
import { U } from '../palette';

type V3 = [number, number, number];
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export const AFRAME = { w: 0.28, h: 0.26, t: 0.0028 };

export interface AssaultPack {
  object: THREE.Group;
  /** Upper leg ends (back-local): the link straps to the Y-strap D-rings start here. */
  hooks: THREE.Vector3[];
  /** Back-face footprint (back-local, z = 0) for fitting: [xmin, xmax, ymin, ymax]. */
  footprint: [number, number, number, number];
}

/** Flat webbing band between two points on the z = t/2 plane. */
function band(a: [number, number], b: [number, number], w: number, t: number, z = 0): THREE.BufferGeometry {
  return F.sheet([[a[0], a[1], z + t / 2], [b[0], b[1], z + t / 2]], [0, 0, 1], w / 2, t, { across: 2, samples: 6 });
}

export function assaultPack(): AssaultPack {
  const web = U.webbing();
  const can = U.canvas();
  const lea = U.belt();
  const hw = U.hardware();
  const zb = U.zeltbahn();
  const parts: THREE.Object3D[] = [];
  const t = AFRAME.t;
  const yTop = 0.13, yBot = -0.125;
  const xTop = 0.034, xBot = 0.132;
  // --- the A frame: two legs, crossbar, top bridge, corner D-rings
  for (const sx of [-1, 1]) {
    parts.push(part(band([sx * xTop, yTop], [sx * xBot, yBot], 0.032, t), web));
    // leg edge stitching welts
    const d = V(sx * (xBot - xTop), yBot - yTop, 0).normalize();
    const nrm = V(-d.y, d.x, 0);
    for (const o of [-0.012, 0.012]) {
      const a = V(sx * xTop, yTop, t + 0.0003).addScaledVector(nrm, o);
      const b = V(sx * xBot, yBot, t + 0.0003).addScaledVector(nrm, o);
      parts.push(part(G.tube([a, b], 0.0005, 4, 2), web));
    }
    // lower corner D-ring on a leather tab
    parts.push(part(F.sheet([[sx * (xBot - 0.004), yBot + 0.012, t + 0.001], [sx * (xBot + 0.004), yBot - 0.012, t + 0.001]], [0, 0, 1], roundEnds(0.009, 0.004, 0.006), 0.0024, { across: 2, samples: 6 }), lea));
    const dr = dRing(0.024, 0.014, 0.0017);
    parts.push(part(dr, hw, { p: [sx * (xBot + 0.006), yBot - 0.016, t + 0.0025], r: [0, 0, sx * 20] }));
  }
  const yCross = -0.028;
  const xCross = xTop + ((yTop - yCross) / (yTop - yBot)) * (xBot - xTop);
  parts.push(part(band([-xCross, yCross], [xCross, yCross], 0.03, t, 0.0004), web));
  parts.push(part(band([-xTop - 0.012, yTop], [xTop + 0.012, yTop], 0.026, t, 0.0006), web));
  // top corners: the leather link straps to the Y-strap D-rings are drawn by the fitter
  const hooks: THREE.Vector3[] = [V(-xTop, yTop, t + 0.0022), V(xTop, yTop, t + 0.0022)];
  for (const sx of [-1, 1]) {
    // short leather tab sewn over the top of each leg (the link strap starts here)
    parts.push(part(F.sheet([[sx * xTop, yTop - 0.022, t + 0.0012], [sx * xTop, yTop + 0.004, t + 0.0012]], [0, 0, 1], roundEnds(0.009, 0.003, 0.003), 0.0024, { across: 2, samples: 6 }), lea));
  }

  // --- assault-pack bag at the bottom (canvas, flap, two leather straps)
  const bw = 0.23, bh = 0.11, bd = 0.058, byc = yBot + 0.004 + bh / 2;
  parts.push(part(pillow(bw, bh, bd, 0.012, 0.008, 3), can, { p: [0, byc, t + bd / 2 + 0.0004] }));
  const bzf = t + bd + 0.0075;
  const bTop = byc + bh / 2;
  const fp: V3[] = [
    [0, bTop - 0.006, t + 0.006],
    [0, bTop + 0.003, t + 0.02],
    [0, bTop + 0.001, t + bd * 0.7],
    [0, bTop - 0.02, bzf - 0.002],
    [0, bTop - 0.06, bzf + 0.0005],
    [0, bTop - 0.085, bzf - 0.0015],
  ];
  const fn: V3[] = [[0, 1, -0.2], [0, 1, 0.2], [0, 0.6, 0.8], [0, 0.2, 1], [0, 0, 1], [0, -0.2, 1]];
  parts.push(part(F.sheet(fp, fn, roundEnds(bw / 2 + 0.003, 0, 0.02), 0.0026, { across: 8, samples: 22, bulge: 0.003 }), can));
  for (const sx of [-1, 1]) {
    const x = sx * 0.062;
    const sp: V3[] = [[x, bTop - 0.04, bzf + 0.0018], [x, bTop - 0.07, bzf + 0.0016], [x, byc - bh / 2 + 0.018, bzf - 0.006], [x, byc - bh / 2 + 0.002, t + bd * 0.6]];
    parts.push(part(F.sheet(sp, [[0, 0, 1], [0, 0, 1], [0, -0.3, 1], [0, -1, 0.3]], 0.0075, 0.0022, { across: 2, samples: 14 }), lea));
    parts.push(part(frameBuckle(0.017, 0.012, 0.0011, true), hw, { p: [x, bTop - 0.052, bzf + 0.0038] }));
  }

  // --- mess tin at the top, standing on the bag, with its strap
  const mt = messTin();
  const mtY = bTop + 0.004 + MESS_TIN.h / 2;
  const mtG = group([mt], { p: [0, mtY, t + 0.0006] });
  parts.push(mtG);
  {
    const x = 0, top = mtY + MESS_TIN.h / 2, bot = mtY - MESS_TIN.h / 2, d = MESS_TIN.d;
    const sp: V3[] = [
      [x, top - 0.006, t + 0.0022],
      [x, top + 0.0035, t + 0.012],
      [x, top + 0.0045, d * 0.5],
      [x, top - 0.004, d + 0.0045],
      [x, top - 0.05, d + 0.0072],
      [x, bot + 0.04, d + 0.0062],
      [x, bot + 0.005, d + 0.001],
    ];
    const sn: V3[] = [[0, 1, -0.2], [0, 1, 0], [0, 1, 0.3], [0, 0.4, 1], [0, 0, 1], [0, 0, 1], [0, -0.4, 1]];
    parts.push(part(F.sheet(sp, sn, roundEnds(0.009, 0, 0.006), 0.0024, { across: 2, samples: 26 }), lea));
    parts.push(part(frameBuckle(0.02, 0.014, 0.0012, true), hw, { p: [x, top - 0.035, d + 0.0098] }));
  }

  // --- Zeltbahn rolled into a horseshoe around the mess tin
  const r = 0.034;
  const R = MESS_TIN.w / 2 + r + 0.008;
  const yc = mtY + MESS_TIN.h / 2 + r + 0.004 - 0.92 * R;
  const yEnd = bTop + r - 0.002;
  const path: THREE.Vector3[] = [];
  const zc = t + r + 0.0012;
  path.push(V(-R, yEnd, zc));
  for (let i = 0; i <= 28; i++) {
    const a = Math.PI - (i / 28) * Math.PI;
    path.push(V(Math.cos(a) * R, yc + Math.sin(a) * R * 0.92, zc));
  }
  path.push(V(R, yEnd, zc));
  const curve = new THREE.CatmullRomCurve3(path, false, 'centripetal');
  const tube = new THREE.TubeGeometry(curve, 72, r, 20, false);
  // flatten the roll a little against the frame (a folded tent quarter is not a perfect cylinder)
  {
    const pos = tube.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      pos.setZ(i, zc + (z - zc) * (z < zc ? 0.82 : 1.0));
    }
    tube.computeVertexNormals();
  }
  parts.push(part(tube, zb));
  // rounded ends of the roll with the spiral of the rolled edge
  for (const [p, q] of [[path[1], path[0]], [path[path.length - 2], path[path.length - 1]]] as const) {
    const dir = q.clone().sub(p).normalize();
    const cap = new THREE.SphereGeometry(r * 0.995, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.scale(1, 0.32, 1);
    const qq = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
    cap.applyQuaternion(qq);
    cap.translate(q.x, q.y, q.z);
    parts.push(part(cap, zb));
    const sp: THREE.Vector3[] = [];
    const bx = new THREE.Vector3().crossVectors(dir, V(0, 0, 1)).normalize();
    const by = new THREE.Vector3().crossVectors(dir, bx).normalize();
    for (let i = 0; i <= 50; i++) {
      const a = (i / 50) * Math.PI * 2 * 2.6;
      const rr = r * (0.15 + 0.8 * (i / 50));
      const h = r * 0.32 * Math.sqrt(Math.max(0, 1 - (rr / r) ** 2)) + 0.0004;
      sp.push(q.clone().addScaledVector(bx, Math.cos(a) * rr).addScaledVector(by, Math.sin(a) * rr).addScaledVector(dir, h));
    }
    parts.push(part(G.tube(sp, 0.0012, 4, 100), zb));
  }
  // two leather straps binding the roll to the frame at the upper corners
  for (const ti of [0.27, 0.73]) {
    const p = curve.getPointAt(ti), tg = curve.getTangentAt(ti);
    const bx = V(0, 0, 1), by = new THREE.Vector3().crossVectors(tg, bx).normalize();
    const loop: THREE.Vector3[] = [];
    const nl: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const dz = Math.cos(a), dy = Math.sin(a);
      const k = dz < 0 ? 0.82 : 1.0;
      const n = bx.clone().multiplyScalar(dz).addScaledVector(by, dy).normalize();
      loop.push(p.clone().addScaledVector(bx, dz * (r * k + 0.0016)).addScaledVector(by, dy * (r + 0.0016)));
      nl.push(n);
    }
    parts.push(part(F.sheet(loop, nl, 0.008, 0.0022, { closed: true, across: 2, samples: 48 }), lea));
    const bpos = p.clone().addScaledVector(bx, r + 0.0045);
    const bk = frameBuckle(0.018, 0.012, 0.0011, true);
    const m = new THREE.Matrix4().makeBasis(tg.clone().cross(bx).normalize().negate(), tg.clone(), bx.clone()).setPosition(bpos);
    bk.applyMatrix4(m);
    parts.push(part(bk, hw));
  }
  void dome;
  void placeY;
  const object = group(parts);
  object.name = 'assault-pack';
  return { object, hooks, footprint: [-xBot - 0.01, xBot + 0.01, yBot - 0.01, yc + 0.92 * R + r] };
}
