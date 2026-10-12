/**
 * Red Army enlisted waist-belt buckle: a plain open steel frame with a centre bar and a single
 * prong (not the officers' star buckle), on the 45 mm leather belt.
 *
 * Gear-local frame: +Z away from the body, +Y up, X along the belt (+X = the side the prong points
 * to, where the belt tip runs on under a keeper). z = 0 is the OUTER face of the (continuous) belt
 * that the infantry module draws; this piece sits on it and adds the doubled belt ends, the frame,
 * the prong and the keeper. ORIGIN = centre of the buckle's centre bar on the belt centreline.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { SU } from './palette';
import { stitches } from './helpers';

/** Buckle frame: outer 50 x 58 mm for the 45 mm belt, 4.5 mm stamped bars. */
export const SU_BUCKLE = { w: 0.05, h: 0.058, bar: 0.0045, t: 0.0026, beltW: 0.045, beltT: 0.0035 };

function roundRectPts(x0: number, y0: number, x1: number, y1: number, r: number, seg = 5): G.V2[] {
  const pts: G.V2[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x1 - r, y0 + r, -Math.PI / 2);
  corner(x1 - r, y1 - r, 0);
  corner(x0 + r, y1 - r, Math.PI / 2);
  corner(x0 + r, y0 + r, Math.PI);
  return pts;
}

export function buildEnlistedBuckle(): GearPiece {
  const B = SU_BUCKLE;
  const steel = SU.buckleSteel(), leather = SU.leather(), thread = SU.threadDark();
  const parts: THREE.Object3D[] = [];
  const hw = B.w / 2, hh = B.h / 2, cb = 0.0025; // half centre-bar width
  const zF = B.beltT + 0.0002; // frame underside
  // --- frame: outer rim with two windows either side of the centre bar
  const outer = roundRectPts(-hw, -hh, hw, hh, 0.007);
  const win = (x0: number, x1: number) => roundRectPts(x0, -hh + B.bar, x1, hh - B.bar, 0.0025).reverse();
  const shape = G.shape(outer, 0, [win(-hw + B.bar, -cb), win(cb, hw - B.bar)]);
  const frame = G.extrude(shape, B.t, 0.0008, 6, 2);
  frame.translate(0, 0, zF + B.t / 2);
  parts.push(part(frame, steel));
  // --- belt: doubled buckle end under the -X window, wrapped round the centre bar
  const BW = B.beltW, BT = B.beltT;
  const endPts: THREE.Vector3[] = [
    new THREE.Vector3(-0.078, 0, BT / 2),
    new THREE.Vector3(-0.03, 0, BT / 2),
    new THREE.Vector3(-0.006, 0, BT / 2 + 0.0002),
  ];
  parts.push(part(G.strap(endPts, BW, BT, [0, 0, 1], { samples: 8 }), leather));
  // fold over the centre bar (the prong comes out through a slot in it)
  const wrap: THREE.Vector3[] = [];
  const bz = zF + B.t / 2;
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI; // from -X side over the top to +X side
    wrap.push(new THREE.Vector3(Math.cos(a) * 0.0042, 0, bz + Math.sin(-a) * 0.0042 * 0.9 + 0.0006));
  }
  parts.push(part(G.strap(wrap, BW * 0.98, 0.003, wrap.map((p) => new THREE.Vector3(p.x, 0, p.z - bz).normalize()), { samples: 24 }), leather));
  // stitching and a rivet across the doubled end
  for (const x of [-0.04, -0.046]) {
    parts.push(part(stitches([[x, -BW / 2 + 0.004, BT + 0.0003], [x, BW / 2 - 0.004, BT + 0.0003]], { len: 0.003, gap: 0.0018, r: 0.0005 }), thread));
  }
  parts.push(part(G.scatter(G.rivetHead(0.0028), [{ p: [-0.062, 0, BT], n: [0, 0, 1] }]), steel));
  // --- belt tip: through the +X window under the prong, out under the outer bar, into a keeper
  const tipL = 0.1;
  const tip = G.strap(
    [
      [0.004, 0, BT / 2],
      [0.03, 0, BT / 2],
      [tipL - 0.02, 0, BT / 2],
      [tipL, 0, BT / 2],
    ],
    BW,
    BT,
    [0, 0, 1],
    { samples: 12 },
  );
  // round the tip end
  const pa = tip.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), y = pa.getY(i);
    const r = BW / 2;
    const cx = tipL - r;
    if (x > cx) {
      const lim = Math.sqrt(Math.max(0, r * r - (x - cx) ** 2));
      if (Math.abs(y) > lim) pa.setY(i, Math.sign(y) * lim);
    }
  }
  tip.computeVertexNormals();
  parts.push(part(tip, leather));
  // prong: hinged round the centre bar, lying on the tip, point resting on the outer bar
  const loop = G.torus(0.0026, 0.0011, 6, 14, Math.PI * 1.6);
  loop.rotateX(Math.PI / 2);
  loop.rotateY(-0.3);
  parts.push(part(loop, steel, { p: [0, 0, bz + 0.0012] }));
  const prongPts: THREE.Vector3[] = [
    new THREE.Vector3(0.0022, 0, bz + 0.0036),
    new THREE.Vector3(0.01, 0, BT + 0.0022),
    new THREE.Vector3(hw - B.bar * 0.4, 0, zF + B.t + 0.0006),
  ];
  const prong = G.tube(prongPts, 0.0015, 8, 16);
  parts.push(part(prong, steel));
  // --- keeper: leather band round the doubled belt (and the belt behind it)
  const kx = hw + 0.022;
  const kp: THREE.Vector3[] = [];
  const kn: THREE.Vector3[] = [];
  const ky = BW / 2 + 0.0016, kzT = BT + 0.0014, kzB = -0.0054;
  const box: [number, number, number, number][] = [
    [ky, kzT, 0.4, 1],
    [0, kzT + 0.0004, 0, 1],
    [-ky, kzT, -0.4, 1],
    [-ky - 0.0006, BT / 2, -1, 0],
    [-ky, kzB, -0.4, -1],
    [0, kzB - 0.0004, 0, -1],
    [ky, kzB, 0.4, -1],
    [ky + 0.0006, BT / 2, 1, 0],
  ];
  for (const [y, z, ny, nz] of box) {
    kp.push(new THREE.Vector3(kx, y, z));
    kn.push(new THREE.Vector3(0, ny, nz).normalize());
  }
  parts.push(part(G.strap(kp, 0.012, 0.0022, kn, { closed: true, samples: 48 }), leather));
  const obj = group(parts);
  obj.name = 'su-enlisted-buckle';
  return {
    id: 'su-enlisted-buckle',
    name: 'Enlisted belt buckle',
    object: obj,
    mount: 'belt-front-left',
    size: { w: 0.18, h: B.h, d: zF + B.t + 0.002 },
    belt: { loopWidth: B.beltW },
  };
}
