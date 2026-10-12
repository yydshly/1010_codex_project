/**
 * Rifle No. 4 Mk I metalwork in the R-frame (see stock.ts): receiver body with butt socket, flat-topped
 * charger bridge and front ring; bright bolt with bolt head, extractor and straight handle with a round
 * knob; cocking piece; left-side safety catch; Mk I aperture backsight (ladder leaf folded down, battle
 * aperture up, fine-adjustment slide) between protecting ears; bolt-head release catch; barrel exposed
 * beyond the fore-end with the protected foresight (blade between wings on a barrel band) and the two
 * bayonet-mounting lugs; broad upper band; lower band with the front sling swivel; trigger guard with
 * trigger and magazine catch; detachable 10-round magazine.
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V, latheZ, cylZ, cylX, extrudeZ, plateZY, plateXZ, screwParts, placeAlong, shellPatch, secRingOffset, roundRect, circle2D, stadium, type V2 } from '../common/geo';
import type { UkwMats } from '../common/materials';
import { R, buttSec, foreSec, foreEndRing, wireLoop } from './stock';

export const RM = {
  bridgeRear: -0.15,
  chargerRear: -0.103,
  bridgeFront: -0.082,
  ringRear: -0.004,
  ringFront: 0.031,
  ringR: 0.0158,
  bodyHw: 0.0165,
  boltR: 0.0088,
  handleRootZ: -0.1585,
  knob: V(-0.0392, -0.0378, -0.1622),
  cockRear: -0.193,
  cockFront: -0.1685,
  magRear: -0.1055,
  magFront: -0.0175,
  magBot: -0.0935,
  magHw: 0.0134,
  bowRear: -0.166,
  bowFront: -0.1065,
  fsRear: 0.581,
  fsFront: 0.606,
  fsBladeTop: 0.0262,
  apertureY: 0.0272,
  apertureZ: -0.0925,
  bandSwivelZ: 0.2975,
};

/** Barrel radius profile (hidden inside the woodwork except beyond the upper band). */
const BARREL: V2[] = [
  [0.0138, 0.029],
  [0.0138, 0.052],
  [0.0122, 0.06],
  [0.0112, 0.2],
  [0.0098, 0.4],
  [0.0088, 0.56],
  [0.0085, 0.6],
  [0.0083, 0.6375],
];

/** Lower-band swivel: pivot screw centre, loop polyline and sling bar centre. */
export function bandSwivel() {
  const z = RM.bandSwivelZ;
  const yb = foreSec(z).yBot;
  const pivot = V(0, yb - 0.0062, z);
  const d = V(0, -1, 0.3).normalize();
  const L = 0.0205;
  const bar = pivot.clone().addScaledVector(d, L);
  return { pivot, dir: d, len: L, bar, width: 0.0364 };
}

export function buildMetal(m: UkwMats, hi: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const seg = hi ? 40 : 24;
  const [scHead, scSlot] = screwParts(0.0032, 0.0012, 25);
  const screw = (p: THREE.Vector3, n: THREE.Vector3, spin = 25, s = 1, mat: THREE.Material = m.black) => {
    const h = scHead.clone().scale(s, s, s), sl = scSlot.clone().scale(s, s, s);
    out.push(part(placeAlong(h, p, n), mat), part(placeAlong(sl, p, n, spin), m.recess));
  };
  const hw = RM.bodyHw;

  // ================= receiver body
  // butt socket: ring round the wrist front
  {
    const ring = (z: number, d: number) => secRingOffset(buttSec(Math.min(z, -0.153)), d, 56);
    out.push(
      part(
        G.loftZ(
          [
            { z: R.socketRear, ring: ring(R.socketRear, 0.0009) },
            { z: R.socketRear + 0.0012, ring: ring(R.socketRear, 0.0021) },
            { z: R.socketFront - 0.0006, ring: ring(R.socketFront, 0.0021) },
            { z: R.socketFront + 0.0008, ring: ring(R.socketFront, 0.0021) },
          ],
          true,
          40,
        ),
        m.black,
      ),
    );
    // socket top web under the bolt / cocking piece and the raised left cheek carrying the safety
    out.push(part(G.rbox(0.0262, 0.0062, 0.0285, 0.0012, 1), m.black, { p: [0, -0.0092, (R.socketRear + R.socketFront) / 2 + 0.0005] }));
    out.push(part(G.rbox(0.0085, 0.0185, 0.0265, 0.0014, 1), m.black, { p: [0.0118, -0.0012, -0.1615] }));
    out.push(part(G.rbox(0.0085, 0.012, 0.0265, 0.0014, 1), m.black, { p: [-0.0118, -0.0055, -0.1615] }));
  }
  // rear bridge (backsight seat) and flat-topped charger bridge
  out.push(part(G.rbox(2 * hw, 0.0385, RM.chargerRear - RM.bridgeRear, 0.0024, 1), m.black, { p: [0, -0.0028, (RM.bridgeRear + RM.chargerRear) / 2] }));
  out.push(part(G.rbox(2 * hw, 0.0425, RM.bridgeFront - RM.chargerRear, 0.0022, 1), m.black, { p: [0, -0.0008, (RM.chargerRear + RM.bridgeFront) / 2] }));
  // charger guide lips at the front of the bridge with the clip slot between them
  for (const sx of [-1, 1]) {
    out.push(part(G.rbox(0.0048, 0.0036, 0.0055, 0.0008, 1), m.black, { p: [sx * 0.0072, 0.0206, RM.bridgeFront - 0.0024] }));
  }
  out.push(part(G.box(0.0062, 0.0006, 0.0045), m.recess, { p: [0, 0.02, RM.bridgeFront - 0.0024] }));
  // bolt-way walls: left wall higher, right wall lower (bolt visible between)
  out.push(part(G.rbox(0.0068, 0.0355, RM.ringRear - RM.bridgeFront + 0.002, 0.0016, 1), m.black, { p: [hw - 0.0034, -0.00425, (RM.bridgeFront + RM.ringRear) / 2] }));
  out.push(part(G.rbox(0.0068, 0.0335, RM.ringRear - RM.bridgeFront + 0.002, 0.0016, 1), m.black, { p: [-hw + 0.0034, -0.00525, (RM.bridgeFront + RM.ringRear) / 2] }));
  // floor of the bolt-way / magazine well (seen between the walls from above)
  out.push(part(G.box(0.02, 0.003, RM.ringRear - RM.bridgeFront), m.black, { p: [0, -0.0165, (RM.bridgeFront + RM.ringRear) / 2] }));
  // front ring
  out.push(part(latheZ([[0, RM.ringRear], [RM.ringR - 0.0008, RM.ringRear], [RM.ringR, RM.ringRear + 0.0009], [RM.ringR, RM.ringFront - 0.0009], [RM.ringR - 0.0008, RM.ringFront], [0.0138, RM.ringFront]], seg, 35), m.black));
  // bolt-head release catch (Mk I) on the right wall near the front
  out.push(part(G.rbox(0.0016, 0.006, 0.0105, 0.0005, 1), m.black, { p: [-hw - 0.0006, 0.0042, -0.0115] }));
  out.push(part(G.box(0.0006, 0.0048, 0.0006), m.recess, { p: [-hw - 0.0014, 0.0042, -0.0085] }));
  // left-side screw of the bridge
  screw(V(hw + 0.0004, 0.0005, -0.0945), V(1, 0, 0), 60, 0.72);

  // ================= bolt (bright), bolt head, extractor, handle, cocking piece
  out.push(part(latheZ([[0, RM.cockFront + 0.001], [RM.boltR, RM.cockFront + 0.001], [RM.boltR, -0.0315], [RM.boltR - 0.0006, -0.0305], [0, -0.0305]], 36, 35), m.bright));
  out.push(part(latheZ([[0, -0.0302], [0.0084, -0.0302], [0.0086, -0.029], [0.0086, -0.0016], [0.008, -0.0004], [0, -0.0004]], 36, 35), m.bright));
  // bolt-head tenon riding on the right rail, extractor on the right of the head
  out.push(part(G.rbox(0.0034, 0.0042, 0.0165, 0.0008, 1), m.bright, { p: [-0.0086, 0.0012, -0.0205] }));
  out.push(part(extrudeZ([[-0.0096, -0.0006], [-0.0082, -0.0006], [-0.0078, 0.0044], [-0.0092, 0.0044]], [], -0.0265, -0.0012, 0.0003), m.blued));
  // rear locking lug / handle root collar
  out.push(part(latheZ([[RM.boltR - 0.0002, RM.handleRootZ - 0.0068], [0.0098, RM.handleRootZ - 0.0062], [0.0098, RM.handleRootZ + 0.0062], [RM.boltR - 0.0002, RM.handleRootZ + 0.0068]], 36, 35), m.bright));
  // straight handle: boss, stem down and out to the right, round knob
  {
    const k = RM.knob;
    out.push(part(cylX(0.0055, -0.0142, -0.0082, 20), m.bright, { p: [0, 0, RM.handleRootZ] }));
    // straight, slightly tapered stem from the root boss down and out to the knob
    out.push(part(G.rod([-0.0118, -0.0012, RM.handleRootZ], [k.x + 0.0042, k.y + 0.0045, k.z + 0.0003], 0.0046, 16, 0.0039), m.bright));
    out.push(part(new THREE.SphereGeometry(0.0046, 14, 10), m.bright, { p: [-0.0118, -0.0012, RM.handleRootZ] }));
    const kn = new THREE.SphereGeometry(0.0102, 28, 18);
    kn.scale(1, 0.96, 1);
    out.push(part(kn, m.bright, { p: [k.x, k.y, k.z] }));
  }
  // cocking piece with side grips and the striker nose into the bolt
  {
    const zc = (RM.cockRear + RM.cockFront) / 2, L = RM.cockFront - RM.cockRear;
    out.push(part(G.rbox(0.0124, 0.0172, L, 0.0022, 2), m.blued, { p: [0, 0.0027, zc] }));
    out.push(part(latheZ([[0, RM.cockFront - 0.002], [0.0062, RM.cockFront - 0.002], [0.0062, RM.cockFront + 0.004], [0, RM.cockFront + 0.004]], 24, 35), m.blued));
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 5; i++) out.push(part(G.rbox(0.0012, 0.012, 0.0014, 0.0004, 1), m.blued, { p: [sx * 0.0066, 0.004, RM.cockRear + 0.0045 + i * 0.0036] }));
    }
    // rear face: raised cocking lug
    out.push(part(G.rbox(0.0085, 0.0062, 0.003, 0.001, 1), m.blued, { p: [0, 0.0085, RM.cockRear - 0.0008] }));
  }
  // safety catch on the left cheek: pivot boss, lever forward (fire), ribbed thumb piece
  {
    const px = 0.0161 + 0.0012, py = 0.001, pz = -0.1645;
    out.push(part(cylX(0.0046, px - 0.0008, px + 0.0016, 24), m.blued, { p: [0, py, pz] }));
    out.push(part(plateZY([[pz - 0.004, py - 0.0028], [pz + 0.004, py - 0.0035], [pz + 0.0135, py + 0.0045], [pz + 0.0142, py + 0.0098], [pz + 0.009, py + 0.0102], [pz - 0.001, py + 0.0038]], 0.0018, [], 0.0004), m.blued, { p: [px + 0.0022, 0, 0] }));
    for (let i = 0; i < 3; i++) out.push(part(G.rbox(0.001, 0.0011, 0.0046, 0.0003, 1), m.blued, { p: [px + 0.0036, py + 0.0068 + i * 0.0011, pz + 0.0112 - i * 0.0002], r: [-30, 0, 0] }));
    out.push(part(cylX(0.0017, px + 0.0016, px + 0.0026, 12), m.recess, { p: [0, py, pz] }));
  }

  // ================= Mk I backsight: protecting ears, hinge, battle aperture, folded ladder leaf + slide
  {
    const topB = 0.02;
    // sight bed on the rear bridge
    out.push(part(G.rbox(0.0172, 0.0034, 0.052, 0.0008, 1), m.black, { p: [0, 0.0182, -0.1255] }));
    // protecting ears either side of the hinge
    for (const sx of [-1, 1]) {
      const ear: V2[] = [[-0.1002, topB - 0.001], [-0.083, topB - 0.001], [-0.083, 0.0258], [-0.0856, 0.0305], [-0.0905, 0.0322], [-0.096, 0.0312], [-0.1002, 0.0272]];
      out.push(part(plateZY(ear, 0.0028, [], 0.0006), m.black, { p: [sx * 0.0114, 0, 0] }));
    }
    const hz = RM.apertureZ, hy = 0.0232;
    out.push(part(cylX(0.0019, -0.0112, 0.0112, 14), m.blued, { p: [0, hy, hz] }));
    // battle aperture leaf (upright) with a raised boss round the peep
    const ap: V2[] = [[-0.0056, hy - 0.002], [0.0056, hy - 0.002], [0.0056, 0.0282], [0.0038, 0.0318], [0, 0.0328], [-0.0038, 0.0318], [-0.0056, 0.0282]];
    const hole = circle2D(0, RM.apertureY, 0.0011, 14);
    out.push(part(extrudeZ(ap, [hole], hz - 0.0014, hz + 0.0014, 0.0003), m.blued));
    out.push(part(latheZ([[0.0011, hz - 0.0026], [0.0026, hz - 0.0026], [0.0028, hz - 0.0014], [0.0011, hz - 0.0014]], 18, 35), m.blued, { p: [0, RM.apertureY, 0] }));
    // ladder leaf folded down towards the rear, with its central slot and range graduations
    const leaf = new THREE.Group();
    const leafL = 0.056;
    const outline: V2[] = [[-0.0058, 0], [0.0058, 0], [0.0058, -leafL + 0.004], [0.0035, -leafL], [-0.0035, -leafL], [-0.0058, -leafL + 0.004]];
    const slot = stadium(0, -0.03, 0.0036, 0.036, 6);
    leaf.add(part(plateXZ(outline, 0.0021, [slot], 0.0004), m.blued));
    leaf.add(part(cylX(0.0023, -0.0058, 0.0058, 14), m.blued));
    if (hi) {
      for (let i = 0; i < 12; i++) {
        const z = -0.013 - i * 0.0031;
        for (const sx of [-1, 1]) leaf.add(part(G.box(i % 2 === 0 ? 0.0019 : 0.0011, 0.0002, 0.00045), m.marks, { p: [sx * (0.0026 + (i % 2 === 0 ? 0.00095 : 0.00055)), 0.00115, z] }));
      }
    }
    // slide with the aperture disc and the fine-adjustment worm wheel on the right
    const sz = -0.037;
    leaf.add(part(G.rbox(0.0158, 0.0052, 0.0105, 0.001, 1), m.blued, { p: [0, 0.0032, sz] }));
    leaf.add(part(latheZ([[0.0009, -0.0024], [0.0036, -0.0024], [0.0036, 0.0024], [0.0009, 0.0024]], 18, 35), m.blued, { p: [0, 0.0072, sz] }));
    leaf.add(part(cylZ(0.0009, -0.0026, 0.0026, 10), m.recess, { p: [0, 0.0072, sz] }));
    leaf.add(part(cylX(0.0042, -0.0112, -0.0079, 20), m.blued, { p: [0, 0.0032, sz] }));
    if (hi) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        leaf.add(part(G.box(0.0031, 0.0007, 0.0007), m.blued, { p: [-0.0095, 0.0032 + Math.sin(a) * 0.0042, sz + Math.cos(a) * 0.0042], r: [(a * 180) / Math.PI, 0, 0] }));
      }
    }
    leaf.position.set(0, hy, hz);
    leaf.rotation.x = -Math.atan2(0.0027, leafL); // rear end down onto the rest
    out.push(leaf);
    // leaf rest pad at the rear of the bridge
    out.push(part(G.rbox(0.009, 0.0022, 0.006, 0.0006, 1), m.black, { p: [0, 0.0206, -0.1455] }));
  }

  // ================= barrel, foresight, bayonet lugs, muzzle
  out.push(part(latheZ([[0, 0.029], ...BARREL, [0.0081, 0.6392], [0.0074, 0.64], [0.0048, 0.6396], [0.004, 0.6378], [0.004, 0.625], [0, 0.625]], seg, 30), m.black));
  out.push(part(cylZ(0.0039, 0.6252, 0.6258, 16), m.recess));
  {
    const z0 = RM.fsRear, z1 = RM.fsFront;
    // band round the barrel
    out.push(part(latheZ([[0.0084, z0], [0.0106, z0 + 0.0004], [0.0112, z0 + 0.0014], [0.0112, z1 - 0.0014], [0.0106, z1 - 0.0004], [0.0084, z1]], 40, 35), m.black));
    // block on top of the band carrying the blade, wings rising either side
    out.push(part(G.rbox(0.0122, 0.0072, z1 - z0 - 0.002, 0.0012, 1), m.black, { p: [0, 0.0118, (z0 + z1) / 2] }));
    for (const sx of [-1, 1]) {
      const wing: V2[] = [[z0 + 0.0012, 0.004], [z1 - 0.0012, 0.004], [z1 - 0.0012, 0.0262], [z1 - 0.0042, 0.0298], [z0 + 0.0042, 0.0298], [z0 + 0.0012, 0.0262]];
      out.push(part(plateZY(wing, 0.0025, [], 0.0006), m.black, { p: [sx * 0.0086, 0, 0] }));
    }
    // dovetailed blade carrier and blade (thin in X)
    out.push(part(G.rbox(0.0072, 0.0026, 0.0092, 0.0006, 1), m.blued, { p: [0, 0.0165, 0.5935] }));
    const blade: V2[] = [[0.5895, 0.0172], [0.5985, 0.0172], [0.5985, 0.0232], [0.5958, RM.fsBladeTop], [0.5908, RM.fsBladeTop], [0.5895, 0.0245]];
    out.push(part(plateZY(blade, 0.0017, [], 0.0002), m.blued));
    // lower lug of the block with its cross pin
    out.push(part(G.rbox(0.0068, 0.0068, 0.0165, 0.0012, 1), m.black, { p: [0, -0.0118, (z0 + z1) / 2] }));
    out.push(part(cylX(0.0014, -0.0036, 0.0036, 10), m.recess, { p: [0, -0.0128, (z0 + z1) / 2] }));
  }
  // two bayonet-mounting lugs (splines) on the barrel sides at the muzzle
  for (const sx of [-1, 1]) {
    out.push(part(G.rbox(0.0034, 0.0026, 0.024, 0.0007, 1), m.black, { p: [sx * 0.0086, 0, 0.6215] }));
    out.push(part(G.rbox(0.0036, 0.0028, 0.0022, 0.0006, 1), m.black, { p: [sx * 0.0087, 0, 0.6096] }));
  }

  // ================= upper band (broad band round the fore-end tip and front handguard) with its screw lug
  {
    const zc = R.upperBandRear + 0.004;
    out.push(part(extrudeZ(foreEndRing(zc, 0.0016), [foreEndRing(zc, 0.0001)], R.upperBandRear, R.upperBandFront, 0.0006, 4), m.black));
    const yb = foreSec(zc).yBot - 0.0016;
    out.push(part(G.rbox(0.0082, 0.0062, 0.018, 0.0014, 1), m.black, { p: [0, yb - 0.0024, 0.5585] }));
    out.push(part(cylX(0.0021, -0.0052, 0.0052, 14), m.black, { p: [0, yb - 0.003, 0.5585] }));
    screw(V(-0.0052, yb - 0.003, 0.5585), V(-1, 0, 0), 60, 0.6);
  }

  // ================= lower band with lugs, swivel screw and front sling swivel
  {
    const zc = (R.lowerBandRear + R.lowerBandFront) / 2;
    out.push(part(extrudeZ(foreEndRing(zc, 0.0015), [foreEndRing(zc, 0.0001)], R.lowerBandRear, R.lowerBandFront, 0.0005, 4), m.black));
    const sw = bandSwivel();
    for (const sx of [-1, 1]) {
      out.push(part(plateZY([[R.lowerBandRear + 0.001, foreSec(zc).yBot + 0.001], [R.lowerBandFront - 0.001, foreSec(zc).yBot + 0.001], [R.lowerBandFront - 0.002, sw.pivot.y - 0.0012], [zc, sw.pivot.y - 0.0036], [R.lowerBandRear + 0.002, sw.pivot.y - 0.0012]], 0.0022, [], 0.0005), m.black, { p: [sx * 0.0064, 0, 0] }));
    }
    out.push(part(cylX(0.0015, -0.0082, 0.0082, 12), m.black, { p: [0, sw.pivot.y, sw.pivot.z] }));
    screw(V(-0.0076, sw.pivot.y, sw.pivot.z), V(-1, 0, 0), 30, 0.62);
    out.push(part(cylX(0.0028, 0.0075, 0.0088, 12), m.black, { p: [0, sw.pivot.y, sw.pivot.z] }));
    // swivel: narrow eye on the screw between the lugs, flaring to the wide sling bar
    const d = sw.dir;
    const P = (x: number, t: number) => sw.pivot.clone().addScaledVector(d, t).setX(x);
    const loop = [P(-0.0042, 0), P(0.0042, 0), P(0.0048, 0.0018), P(0.0164, 0.0112), P(0.0186, sw.len - 0.0035), P(0.0172, sw.len), P(-0.0172, sw.len), P(-0.0186, sw.len - 0.0035), P(-0.0164, 0.0112), P(-0.0048, 0.0018)];
    out.push(part(G.tube(loop, 0.0019, 10, 90, true), m.black));
  }

  // ================= trigger guard (rear tang, bow, plate, magazine frame), trigger, magazine catch
  const bot = (a: number) => [() => (3 * Math.PI) / 2 - a, () => (3 * Math.PI) / 2 + a] as const;
  {
    const [a0, a1] = bot(0.4);
    out.push(part(shellPatch(buttSec, -0.1865, -0.1535, a0, a1, 0.0019, 0.0005, 8, 8), m.black));
    const [b0, b1] = bot(0.44);
    out.push(part(shellPatch(foreSec, -0.1535, RM.magRear - 0.0005, b0, b1, 0.0019, 0.0005, 10, 8), m.black));
    // side rails along the magazine opening and the front bar
    out.push(part(shellPatch(foreSec, RM.magRear - 0.001, RM.magFront + 0.0015, () => (3 * Math.PI) / 2 + 0.6, () => (3 * Math.PI) / 2 + 0.86, 0.0019, 0.0005, 10, 4), m.black));
    out.push(part(shellPatch(foreSec, RM.magRear - 0.001, RM.magFront + 0.0015, () => (3 * Math.PI) / 2 - 0.86, () => (3 * Math.PI) / 2 - 0.6, 0.0019, 0.0005, 10, 4), m.black));
    const [c0, c1] = bot(0.86);
    out.push(part(shellPatch(foreSec, RM.magFront + 0.001, -0.0062, c0, c1, 0.0019, 0.0005, 6, 12), m.black));
    screw(V(0, foreSec(-0.0105).yBot - 0.0015, -0.0105), V(0, -1, 0), 90, 0.9);
    screw(V(0, buttSec(-0.1775).yBot - 0.0015, -0.1775), V(0, -1, 0), 0, 0.9);
  }
  {
    // bow
    const pts: V2[] = [
      [RM.bowFront, -0.0572],
      [-0.1082, -0.0692],
      [-0.1135, -0.0802],
      [-0.1225, -0.0876],
      [-0.134, -0.0912],
      [-0.1458, -0.0898],
      [-0.1558, -0.0836],
      [-0.1628, -0.0728],
      [RM.bowRear, -0.0598],
    ];
    const Pp = pts.map(([z, y]) => V(0, y, z));
    const c = V(0, -0.066, -0.1355);
    const Nn = Pp.map((p) => p.clone().sub(c).setX(0).normalize());
    out.push(part(G.strap(Pp, 0.0086, 0.0034, Nn, { samples: 60 }), m.black));
    // trigger blade
    const tp = [V(0, -0.0555, R.triggerZ + 0.0025), V(0, -0.0632, R.triggerZ + 0.0019), V(0, -0.0702, R.triggerZ - 0.0002), V(0, -0.0762, R.triggerZ - 0.0036), V(0, -0.0802, R.triggerZ - 0.0082)];
    out.push(part(G.strap(tp, 0.0056, 0.0034, V(0, 0, 1), { samples: 30 }), m.black));
    out.push(part(G.box(0.0044, 0.0006, 0.0118), m.recess, { p: [0, foreSec(R.triggerZ).yBot - 0.0016, R.triggerZ] }));
    // magazine catch lever inside the front of the bow
    const mc = [V(0, -0.0575, -0.1098), V(0, -0.0645, -0.1105), V(0, -0.0712, -0.1122), V(0, -0.0752, -0.1142)];
    out.push(part(G.strap(mc, 0.006, 0.0026, V(0, 0, 1), { samples: 24 }), m.blued));
  }

  // ================= magazine: sheet-steel box with pressed side ribs and a floor-plate lip
  {
    const zr = RM.magRear, zf = RM.magFront, yb = RM.magBot;
    const side: V2[] = [
      [zr, -0.046],
      [zr, yb + 0.004],
      [zr + 0.004, yb],
      [zf - 0.0115, yb],
      [zf - 0.0055, yb + 0.0035],
      [zf - 0.0016, yb + 0.0175],
      [zf, yb + 0.03],
      [zf, -0.046],
    ];
    out.push(part(plateZY(side, 2 * RM.magHw, [], 0.0011), m.stamped));
    // pressed ribs on both sides: a long horizontal swage and a short vertical one at the rear
    for (const sx of [-1, 1]) {
      out.push(part(plateZY(roundRect((zr + zf) / 2 - 0.004, -0.0742, 0.066, 0.0072, 0.0034, 3), 0.0012, [], 0.0005), m.stamped, { p: [sx * (RM.magHw + 0.0002), 0, 0] }));
      out.push(part(plateZY(roundRect(zr + 0.0075, -0.0745, 0.0052, 0.026, 0.0024, 3), 0.001, [], 0.0004), m.stamped, { p: [sx * (RM.magHw + 0.00015), 0, 0] }));
    }
    // floor-plate lip
    out.push(part(G.rbox(2 * RM.magHw + 0.0014, 0.0026, zf - zr - 0.0125, 0.0009, 1), m.stamped, { p: [0, yb + 0.0009, (zr + zf) / 2 - 0.005] }));
    // top edge where it enters the guard (slight shadow line)
    out.push(part(G.box(2 * RM.magHw + 0.0006, 0.0008, zf - zr), m.recess, { p: [0, foreSec((zr + zf) / 2).yBot - 0.0022, (zr + zf) / 2] }));
  }
  return out;
}

/** Butt-plate-to-muzzle length in the R-frame. */
export const NO4_LENGTH = R.muzzleZ - (R.buttZ - 0.0026);

export { group, wireLoop };
