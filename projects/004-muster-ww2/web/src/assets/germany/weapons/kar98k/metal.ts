/**
 * Kar98k metalwork in the K-frame (see stock.ts): stepped barrel with crowned muzzle, Mauser 98
 * receiver (front ring, open middle section with thumb cut, rear bridge with charger guide, bolt stop,
 * tang), bright bolt with extractor and turned-down handle, bolt shroud with wing safety, cocking
 * piece, tangent rear sight, hooded barleycorn front sight, nose cap with bayonet lug, lower band with
 * the left-side sling swivel and band spring, cleaning rod head, trigger guard / floorplate / trigger.
 */
import { THREE, G, part } from '../../../../core/kit';
import { V, latheZ, cylX, cylZ, sector2D, extrudeZ, plateZY, plateXZ, screwParts, placeAlong, warp, type V2 } from '../common/geo';
import type { K98Mats } from './materials';
import { sectionAt, shellPatch, sideX, bottomY, foreEndRing, type Sec } from './stock';

export const K = {
  muzzleZ: 0.6,
  ringFront: 0.03,
  ringRear: -0.005,
  bridgeFront: -0.105,
  bridgeRear: -0.135,
  rsRear: 0.036,
  rsFront: 0.108,
  lbRear: 0.3,
  lbFront: 0.316,
  ncRear: 0.47,
  ncFront: 0.525,
  fsZ: 0.581,
  /** sling swivel: outer bar (the strap wraps around it) */
  swivel: { x: 0.0292, yC: -0.0115, z: 0.308, r: 0.0021 },
  knob: V(-0.0372, -0.031, -0.1368),
  triggerFace: V(0, -0.078, -0.1345),
  lugFront: V(0, -0.0335, 0.5295),
};

/** Barrel radius at z (matches the lathe profile). */
const BARREL: V2[] = [
  [0.0142, -0.004],
  [0.0142, 0.037],
  [0.0136, 0.04],
  [0.0136, 0.106],
  [0.0128, 0.112],
  [0.0121, 0.19],
  [0.0112, 0.262],
  [0.0104, 0.285],
  [0.0098, 0.3],
  [0.0094, 0.4],
  [0.009, 0.47],
  [0.0086, 0.49],
  [0.0083, 0.56],
  [0.008, 0.5955],
];
export function barrelR(z: number): number {
  for (let i = 1; i < BARREL.length; i++) {
    if (z <= BARREL[i][1]) {
      const [r0, z0] = BARREL[i - 1], [r1, z1] = BARREL[i];
      return r0 + ((r1 - r0) * (z - z0)) / (z1 - z0);
    }
  }
  return 0.008;
}

export function buildMetal(m: K98Mats, detail: 'high' | 'low' = 'high'): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const hi = detail === 'high';
  const seg = hi ? 40 : 24;
  const [scHead, scSlot] = screwParts(0.0034, 0.0013, 25);
  const screw = (p: THREE.Vector3, n: THREE.Vector3, spin = 25, s = 1) => {
    const h = scHead.clone().scale(s, s, s), sl = scSlot.clone().scale(s, s, s);
    out.push(part(placeAlong(h, p, n), m.blued), part(placeAlong(sl, p, n, spin), m.dark));
  };

  // ---------------- barrel (stepped profile), crowned muzzle and bore
  out.push(
    part(
      latheZ(
        [
          [0, -0.004],
          ...BARREL,
          [0.0077, 0.5995],
          [0.0068, 0.6],
          [0.0047, 0.5993],
          [0.00396, 0.5972],
          [0.00396, 0.578],
          [0, 0.578],
        ],
        seg,
        30,
      ),
      m.blued,
    ),
  );
  out.push(part(cylZ(0.00392, 0.0006, 16), m.dark, { p: [0, 0, 0.5786] }));

  // ---------------- receiver
  // front ring
  out.push(
    part(
      latheZ([[0, -0.005], [0.0172, -0.005], [0.0179, -0.0037], [0.0179, 0.0283], [0.0173, 0.03], [0.0142, 0.03]], 48, 35),
      m.blued,
    ),
  );
  // open middle section: thick shell with the left wall higher than the right, thumb cut in the left wall
  {
    const secs: { z: number; ring: V2[] }[] = [];
    const n = hi ? 26 : 14;
    for (let k = 0; k <= 20; k++) {
      const z = K.bridgeFront + ((K.ringRear - K.bridgeFront) * k) / 20;
      const cut = Math.exp(-(((z + 0.058) / 0.016) ** 4));
      secs.push({ z, ring: sector2D(0.0165, 0.0092, 186, 410 - 36 * cut, n) });
    }
    out.push(part(G.loftZ(secs, true, 40), m.blued));
  }
  // rear bridge with the charger guide horns
  out.push(part(latheZ([[0, K.bridgeRear], [0.0158, K.bridgeRear], [0.0165, K.bridgeRear + 0.0012], [0.0165, K.bridgeFront - 0.0012], [0.016, K.bridgeFront], [0, K.bridgeFront]], 44, 35), m.blued));
  for (const sx of [-1, 1]) {
    out.push(part(G.rbox(0.0046, 0.0052, 0.0095, 0.0011, 2), m.blued, { p: [sx * 0.0071, 0.0148, K.bridgeFront - 0.0042] }));
  }
  // bolt stop (left rear of the receiver): lever, ribbed release tab, pivot screw
  out.push(part(G.rbox(0.0026, 0.0078, 0.029, 0.0009, 2), m.blued, { p: [0.0176, 0.0018, -0.1215] }));
  for (let i = 0; i < 4; i++) out.push(part(G.rbox(0.0008, 0.0068, 0.0009, 0.0003, 1), m.blued, { p: [0.0193, 0.0018, -0.1105 + i * 0.0019] }));
  screw(V(0.0189, 0.0018, -0.131), V(1, 0, 0), 60, 0.72);
  // tang on top of the wrist
  out.push(part(shellPatch(-0.197, -0.1345, (z) => Math.PI / 2 - (0.2 + (z + 0.197) * 0.2), (z) => Math.PI / 2 + (0.2 + (z + 0.197) * 0.2), 0.0021, 0.0004, 10, 8), m.blued));

  // ---------------- bolt (bright), extractor, handle, shroud, safety, cocking piece
  out.push(part(latheZ([[0, -0.141], [0.0089, -0.141], [0.0089, -0.0042], [0.0085, -0.002], [0, -0.002]], 36, 35), m.bright));
  out.push(part(latheZ([[0.0088, -0.086], [0.0097, -0.0856], [0.0097, -0.0794], [0.0088, -0.079]], 36, 35), m.bright));
  out.push(part(extrudeZ(sector2D(0.0101, 0.0087, 168, 198, 8), [], -0.079, -0.004, 0.0003), m.blued));
  // extractor claw hook at the front
  out.push(part(extrudeZ(sector2D(0.0101, 0.0082, 170, 196, 6), [], -0.0075, -0.0035, 0.0002), m.blued));
  // handle: root boss, bent stem, ball knob
  out.push(part(cylX(0.0062, 0.009, 20), m.bright, { p: [-0.0105, 0.0003, -0.1335] }));
  out.push(
    part(
      G.tube(
        [
          [-0.012, 0.0004, -0.1336],
          [-0.02, 0.0, -0.134],
          [-0.0262, -0.0028, -0.1345],
          [-0.0308, -0.0102, -0.1352],
          [-0.0338, -0.0192, -0.1358],
          [-0.0356, -0.0248, -0.1362],
        ],
        0.0046,
        14,
        30,
      ),
      m.bright,
    ),
  );
  {
    const kn = new THREE.SphereGeometry(0.0097, 26, 18);
    kn.scale(1, 0.95, 1);
    out.push(part(kn, m.bright, { p: [K.knob.x, K.knob.y, K.knob.z] }));
  }
  // shroud
  out.push(
    part(
      latheZ([[0, -0.168], [0.009, -0.168], [0.0099, -0.1662], [0.0102, -0.159], [0.0102, -0.1376], [0.0098, -0.1364], [0.0089, -0.1362]], 40, 35),
      m.blued,
    ),
  );
  // wing safety in the fire position (lying to the left)
  out.push(part(cylZ(0.0033, 0.0072, 16), m.blued, { p: [0, 0.0097, -0.1662] }));
  out.push(
    part(
      plateXZ([[0.001, -0.1695], [0.0118, -0.1695], [0.0162, -0.1678], [0.0172, -0.1662], [0.0162, -0.1646], [0.0118, -0.163], [0.001, -0.163]], 0.0021, [], 0.0004),
      m.blued,
      { p: [0, 0.0112, 0] },
    ),
  );
  // cocking piece with grooved knob and the lug riding in the tang
  {
    const prof: V2[] = [[0, -0.1978], [0.0058, -0.1978], [0.0086, -0.1962]];
    for (let i = 0; i < 5; i++) {
      const z = -0.1952 + i * 0.0018;
      prof.push([0.0091, z], [0.0091, z + 0.0009], [0.0086, z + 0.0012]);
    }
    prof.push([0.0086, -0.1858], [0.0079, -0.1835], [0.0079, -0.1695], [0.0072, -0.1682]);
    out.push(part(latheZ(prof, 36, 35), m.blued));
  }
  out.push(part(G.rbox(0.0056, 0.0052, 0.019, 0.0012, 2), m.blued, { p: [0, -0.0081, -0.1845] }));

  // ---------------- trigger guard assembly: floorplate, front tang, bow, rear tang, trigger
  const bot = (a: number) => [() => (3 * Math.PI) / 2 - a, () => (3 * Math.PI) / 2 + a] as const;
  {
    const [a0, a1] = bot(0.4);
    out.push(part(shellPatch(-0.1005, -0.003, a0, a1, 0.0021, 0.0006, 10, 8), m.blued));
    const [b0, b1] = bot(0.29);
    out.push(part(shellPatch(-0.003, 0.034, b0, b1, 0.002, 0.0005, 8, 8), m.blued));
    screw(V(0, bottomY(0.02) - 0.0015, 0.02), V(0, -1, 0), 10);
    const [c0, c1] = bot(0.3);
    out.push(part(shellPatch(-0.1655, -0.1015, c0, c1, 0.0021, 0.0006, 10, 8), m.blued));
    const [d0, d1] = bot(0.27);
    out.push(part(shellPatch(-0.207, -0.1655, d0, d1, 0.002, 0.0005, 8, 8), m.blued));
    screw(V(0, bottomY(-0.184) - 0.0015, -0.184), V(0, -1, 0), 80);
    // trigger slot (dark) in the guard web
    out.push(part(G.rbox(0.0042, 0.0006, 0.0125, 0.0002, 1), m.dark, { p: [0, bottomY(-0.1295) - 0.0016, -0.1295] }));
    // floorplate release button in the front of the bow
    out.push(part(cylZ(0.0019, 0.004, 12), m.blued, { p: [0, -0.0655, -0.1035] }));
  }
  {
    const pts: V2[] = [
      [-0.1032, -0.0606],
      [-0.1046, -0.0688],
      [-0.1095, -0.0788],
      [-0.1185, -0.0862],
      [-0.1315, -0.0896],
      [-0.1445, -0.0884],
      [-0.1555, -0.0834],
      [-0.1618, -0.0758],
      [-0.1644, -0.0690],
      [-0.1652, -0.0648],
    ];
    const P = pts.map(([z, y]) => V(0, y, z));
    const c = V(0, -0.07, -0.134);
    const N = P.map((p) => p.clone().sub(c).setX(0).normalize());
    out.push(part(G.strap(P, 0.0098, 0.0033, N, { samples: 60 }), m.blued));
    const tp = [V(0, -0.0585, -0.1285), V(0, -0.068, -0.1293), V(0, -0.076, -0.1318), V(0, -0.0812, -0.1365), V(0, -0.0833, -0.1425)];
    out.push(part(G.strap(tp, 0.0058, 0.0036, V(0, 0, 1), { samples: 30 }), m.blued));
  }

  // ---------------- rear sight: sleeve, base block, ramps, hinged leaf with notch, slider, graduations
  {
    const z0 = K.rsRear, z1 = K.rsFront;
    out.push(part(latheZ([[0.0136, z0], [0.0154, z0 + 0.0005], [0.016, z0 + 0.003], [0.016, z1 - 0.002], [0.0152, z1 - 0.0005], [0.0136, z1]], 40, 35), m.blued));
    out.push(part(G.rbox(0.0194, 0.0066, 0.066, 0.0015, 2), m.blued, { p: [0, 0.0139, 0.072] }));
    const rampTop = (z: number) => 0.0164 + 0.0082 * ((z - 0.04) / 0.064) ** 1.6;
    const wall: V2[] = [[0.0395, 0.0125], [0.1045, 0.0125], [0.1045, 0.0236]];
    for (let i = 0; i <= 12; i++) {
      const z = 0.1005 - (i / 12) * 0.0605;
      wall.push([z, rampTop(z)]);
    }
    for (const sx of [-1, 1]) out.push(part(plateZY(wall, 0.0024, [], 0.0005), m.blued, { p: [sx * 0.0082, 0, 0] }));
    // hinge pin with heads
    const hingeY = 0.0214, hingeZ = 0.1005;
    out.push(part(cylX(0.0016, 0.0212, 12), m.blued, { p: [0, hingeY, hingeZ] }));
    for (const sx of [-1, 1]) out.push(part(cylX(0.0026, 0.0011, 16), m.blued, { p: [sx * 0.0103, hingeY, hingeZ] }));
    // leaf (100 m setting)
    const leafLen = 0.0605;
    const ang = Math.atan2(0.0026, leafLen);
    const leaf = new THREE.Group();
    leaf.add(part(G.rbox(0.0118, 0.0021, leafLen + 0.004, 0.0006, 2), m.blued, { p: [0, 0, -leafLen / 2] }));
    leaf.add(part(cylX(0.0024, 0.0118, 14), m.blued));
    const notch: V2[] = [[-0.0068, 0], [0.0068, 0], [0.0068, 0.0054], [0.0017, 0.0054], [0, 0.0035], [-0.0017, 0.0054], [-0.0068, 0.0054]];
    leaf.add(part(extrudeZ(notch, [], -0.0011, 0.0011, 0.0003), m.blued, { p: [0, 0.0009, -leafLen + 0.0012] }));
    // range graduations (100..2000 m) as fine lighter marks
    if (hi) {
      for (let i = 0; i < 19; i++) {
        const z = -leafLen + 0.009 + i * 0.0026;
        leaf.add(part(G.box(i % 2 === 0 ? 0.0046 : 0.0026, 0.0002, 0.0005), m.slingSteel, { p: [0.0022, 0.00108, z] }));
      }
    }
    leaf.position.set(0, hingeY, hingeZ);
    leaf.rotation.x = -ang; // rear end slightly down onto the ramps
    out.push(leaf);
    // slider riding on the ramps at the rear (100 m), with the two spring catches
    const zs = 0.0478;
    const sy = rampTop(zs) + 0.003;
    out.push(part(G.rbox(0.0212, 0.006, 0.0102, 0.0012, 2), m.blued, { p: [0, sy, zs] }));
    for (const sx of [-1, 1]) {
      out.push(part(cylX(0.0028, 0.0026, 14), m.blued, { p: [sx * 0.0118, sy - 0.0003, zs] }));
      if (hi) {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          out.push(part(G.box(0.0026, 0.0006, 0.0006), m.blued, { p: [sx * 0.0118, sy - 0.0003 + Math.sin(a) * 0.0028, zs + Math.cos(a) * 0.0028], r: [(a * 180) / Math.PI, 0, 0] }));
        }
      }
    }
  }

  // ---------------- front sight: base ring, dovetail block, barleycorn blade, sheet-steel hood
  {
    const fz = K.fsZ;
    out.push(part(latheZ([[0.0079, 0.566], [0.0092, 0.5665], [0.0097, 0.568], [0.0097, 0.5925], [0.0092, 0.594], [0.0079, 0.5945]], 40, 35), m.blued));
    out.push(part(G.rbox(0.0094, 0.0066, 0.0235, 0.0012, 2), m.blued, { p: [0, 0.0115, 0.5805] }));
    out.push(part(G.rbox(0.0074, 0.0018, 0.009, 0.0005, 1), m.blued, { p: [0, 0.0156, fz] }));
    const blade: V2[] = [[-0.0029, 0], [0.0029, 0], [0.0027, 0.0011], [0.0006, 0.0065], [0, 0.0068], [-0.0006, 0.0065], [-0.0027, 0.0011]];
    out.push(part(extrudeZ(blade, [], -0.0017, 0.0017, 0.0002), m.blued, { p: [0, 0.0163, fz] }));
    // hood (Kornschutz): stamped arch over the blade, sides clipped under the base ring
    const Ro = 0.0104, Ri = 0.0096, yc = 0.0142, yb = -0.0016;
    const arch: V2[] = [[Ro, yb], [Ro, yc]];
    for (let i = 1; i < 18; i++) {
      const a = (Math.PI * i) / 18;
      arch.push([Ro * Math.cos(a), yc + Ro * Math.sin(a)]);
    }
    arch.push([-Ro, yc], [-Ro, yb], [-Ri, yb], [-Ri, yc]);
    for (let i = 17; i >= 1; i--) {
      const a = (Math.PI * i) / 18;
      arch.push([Ri * Math.cos(a), yc + Ri * Math.sin(a)]);
    }
    arch.push([Ri, yc], [Ri, yb]);
    out.push(part(extrudeZ(arch, [], 0.5665, 0.5945, 0.0003, 6), m.blued));
    for (const sx of [-1, 1]) out.push(part(G.rbox(0.0016, 0.0011, 0.026, 0.0004, 1), m.blued, { p: [sx * 0.0092, yb + 0.0005, 0.5805] }));
  }

  // ---------------- nose cap with bayonet lug and retaining screw; cleaning rod head
  {
    // keyhole outline: tube round the barrel smoothly united with the box round the fore-end
    const smax = (a: number, b: number, k: number) => {
      const h = Math.max(k - Math.abs(a - b), 0) / k;
      return Math.max(a, b) + (h * h * k) / 4;
    };
    const capRing = (z: number, grow: number): V2[] => {
      const s = sectionAt(z);
      const low: Sec = { hw: s.hw + grow, yTop: 0.003 + grow, ySplit: -0.006, yBot: s.yBot - grow, eTop: 3.5, eBot: 3.1 };
      const R = barrelR(z) + 0.0015 + grow;
      const cx = 0, cy = -0.009;
      const inLow = (x: number, y: number) => {
        const top = y >= low.ySplit;
        const e = top ? low.eTop : low.eBot;
        const hh = top ? low.yTop - low.ySplit : low.ySplit - low.yBot;
        return Math.pow(Math.abs(x / low.hw), e) + Math.pow(Math.abs((y - low.ySplit) / hh), e) <= 1;
      };
      const pts: V2[] = [];
      for (let i = 0; i < 56; i++) {
        const th = (i / 56) * Math.PI * 2;
        const dx = Math.cos(th), dy = Math.sin(th);
        const cd = cx * dx + cy * dy;
        const r1 = -cd + Math.sqrt(Math.max(0, cd * cd - (cx * cx + cy * cy) + R * R));
        let lo = 0, hi = 0.06;
        for (let it = 0; it < 30; it++) {
          const mid = (lo + hi) / 2;
          if (inLow(cx + dx * mid, cy + dy * mid)) lo = mid;
          else hi = mid;
        }
        const r = smax(r1, lo, 0.004);
        pts.push([cx + dx * r, cy + dy * r]);
      }
      return pts;
    };
    const nc = G.loftZ(
      [
        { z: K.ncRear, ring: capRing(K.ncRear, 0.0005) },
        { z: K.ncRear + 0.0013, ring: capRing(K.ncRear + 0.0013, 0.0014) },
        { z: K.ncFront - 0.0024, ring: capRing(K.ncFront - 0.0024, 0.0014) },
        { z: K.ncFront, ring: capRing(K.ncFront, 0.0002) },
      ],
      true,
      40,
    );
    out.push(part(nc, m.blued));
    // raised collar round the barrel hole on the front face
    out.push(part(latheZ([[0.0084, K.ncFront - 0.001], [0.0104, K.ncFront - 0.001], [0.0104, K.ncFront + 0.0012], [0.0096, K.ncFront + 0.0019], [0.0084, K.ncFront + 0.0019]], 32, 35), m.blued));
    // bayonet lug (T-section bar under the cap)
    const lug: V2[] = [[-0.0027, -0.0262], [0.0027, -0.0262], [0.0027, -0.0338], [0.0053, -0.0343], [0.0053, -0.0392], [-0.0053, -0.0392], [-0.0053, -0.0343], [-0.0027, -0.0338]];
    out.push(part(extrudeZ(lug, [], 0.4875, 0.5295, 0.0006), m.blued));
    // retaining screw on the left side of the cap
    const zc = K.ncRear + 0.0085;
    const sx = capRing(zc, 0.0014).reduce((mx, p) => (Math.abs(p[1] + 0.013) < 0.003 ? Math.max(mx, p[0]) : mx), 0);
    screw(V(sx, -0.013, zc), V(1, 0, 0), 15, 0.8);
    // cleaning rod head with its cross hole
    out.push(part(latheZ([[0, 0.5185], [0.0043, 0.5185], [0.0043, 0.5298], [0.0038, 0.5317], [0.002, 0.5326], [0, 0.5326]], 24, 35), m.blued, { p: [0, -0.0168, 0] }));
    out.push(part(cylX(0.0013, 0.0089, 10), m.dark, { p: [0, -0.0168, 0.5272] }));
  }

  // ---------------- lower band with sling swivel and band spring
  {
    const zc = (K.lbRear + K.lbFront) / 2;
    const outer = foreEndRing(zc, 0.0015);
    const inner = foreEndRing(zc, 0.0001);
    out.push(part(extrudeZ(outer, [inner], K.lbRear, K.lbFront, 0.0005, 4), m.blued));
    const sw = K.swivel;
    out.push(part(G.rbox(0.0034, 0.0088, 0.0082, 0.001, 2), m.blued, { p: [0.0194, sw.yC, sw.z] }));
    out.push(part(G.cyl(0.0033, 0.0033, 0.0092, 14), m.blued, { p: [0.0212, sw.yC, sw.z] }));
    const loop: THREE.Vector3[] = [
      V(0.0212, -0.026),
      V(0.0212, 0.003),
      V(0.0221, 0.0063),
      V(0.0252, 0.0072),
      V(0.0283, 0.0063),
      V(sw.x, 0.003),
      V(sw.x, -0.026),
      V(0.0283, -0.0293),
      V(0.0252, -0.0302),
      V(0.0221, -0.0293),
    ].map((p) => p.setZ(sw.z));
    out.push(part(G.tube(loop, sw.r, 10, 70, true), m.blued));
    // band spring on the right side just behind the band (conformed onto the wood)
    const spring: V2[] = [[0.2825, -0.0142], [0.2975, -0.0146], [0.2995, -0.0132], [0.2995, -0.0098], [0.2975, -0.0086], [0.2825, -0.009]];
    const sg = plateZY(spring, 0.0012, [], 0.0003);
    warp(sg, (p) => {
      p.x = -(sideX(p.z, p.y) + 0.0002 + p.x);
    }, false);
    G.flipWinding(sg);
    sg.computeVertexNormals();
    out.push(part(sg, m.blued));
  }
  return out;
}

