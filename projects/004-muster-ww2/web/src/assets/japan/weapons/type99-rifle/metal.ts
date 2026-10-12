/**
 * Type 99 rifle metalwork (R-frame, see dims.ts):
 *  barrel with crowned muzzle; receiver ring (plain - no markings), receiver body with the loading /
 *  ejection opening, bridge with the stripper-clip guide, rear tang; bolt (in the white) with the straight
 *  handle and plum-shaped knob, the large knurled safety knob at the rear; optional sliding dust cover;
 *  rear sight (base on the barrel, ladder leaf folded down, aperture slider, the two anti-aircraft lead
 *  arms folded along the leaf); front sight blade between protective ears; lower band with the left-side
 *  sling swivel; upper band + nose cap with the bayonet lug and the cleaning-rod head; trigger guard with
 *  the magazine floorplate and its latch; trigger; left-side butt swivel.
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V, latheZ, latheY, cylX, cylZ, extrudeZ, plateZY, plateXZ, roundRect, circle2D, screwParts, placeAlong, knurledKnob, stadium, Profile, RAD, type V2 } from '../common/geo';
import { latheZArc, sideSwivel } from '../common/parts';
import { RD, STOCK, BARREL_R, barrelR } from './dims';
import { bandSec } from './wood';
import type { JpwMats } from '../common/materials';

/** Swivel geometry shared with the sling builder. */
export const SWIVELS = {
  front: {
    pin: V(bandSec(RD.frontSwivelZ, 0.0014).hw + 0.0048, -0.012, RD.frontSwivelZ),
    dir: V(0.22, 0, -1).normalize(),
    reach: 0.017,
  },
  rear: {
    pin: V(STOCK.sideX(RD.rearSwivelZ, STOCK.at(RD.rearSwivelZ).ySplit) + 0.0056, STOCK.at(RD.rearSwivelZ).ySplit + 0.002, RD.rearSwivelZ - 0.004),
    dir: V(0.2, 0, 1).normalize(),
    reach: 0.017,
  },
  innerW: 0.0322,
  wire: 0.0019,
};

export const swivelBar = (s: { pin: THREE.Vector3; dir: THREE.Vector3; reach: number }) => s.pin.clone().addScaledVector(V(s.dir.x, 0, s.dir.z).normalize(), s.reach);

export interface MetalOptions {
  dustCover: boolean;
  hi: boolean;
}

export function buildMetal(m: JpwMats, o: MetalOptions): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const hi = o.hi;
  const seg = hi ? 40 : 24;
  const [scHead, scSlot] = screwParts(0.003, 0.001, 25);
  const screw = (p: THREE.Vector3, n: THREE.Vector3, spin = 25, s = 1, mat: THREE.Material = m.blued) => {
    const h = scHead.clone().scale(s, s, s), sl = scSlot.clone().scale(s, s, s);
    out.push(part(placeAlong(h, p, n), mat), part(placeAlong(sl, p, n, spin), m.recess));
  };

  // ---------------- barrel, crowned muzzle, bore
  out.push(
    part(
      latheZ(
        [
          [0, -0.004],
          ...BARREL_R.map(([z, r]) => [r, z] as V2),
          [0.0078, RD.muzzleZ],
          [0.0045, RD.muzzleZ - 0.0008],
          [0.004, RD.muzzleZ - 0.003],
          [0.004, RD.muzzleZ - 0.02],
          [0, RD.muzzleZ - 0.02],
        ],
        seg,
        30,
      ),
      m.blued,
    ),
  );
  out.push(part(cylZ(0.004, 0.0006, 16), m.recess, { p: [0, 0, RD.muzzleZ - 0.0194] }));

  // ---------------- receiver: ring, body (open top / right), bridge, tang
  {
    const r = RD.ringR;
    out.push(part(latheZ([[0, RD.ringRear], [r - 0.0008, RD.ringRear], [r, RD.ringRear + 0.0009], [r, RD.ringFront - 0.0012], [r - 0.0011, RD.ringFront], [0.0148, RD.ringFront]], 48, 35), m.blued));
    // body: shell from the right side (195 deg) under the bottom and up the left wall (20 deg)
    const rb = RD.bodyR, ri = 0.0102;
    const zb0 = RD.bridgeFront - 0.001, zb1 = RD.ringRear + 0.001;
    const prof: V2[] = [[ri, zb0], [rb, zb0], [rb, zb1], [ri, zb1], [ri, zb0]];
    out.push(part(latheZArc(prof, 32, 195, 380, 50), m.blued));
    // wall edges (flat rails, softened) along the opening
    for (const a of [20, 195]) {
      const x = Math.cos(a * RAD) * (rb + ri) / 2, y = Math.sin(a * RAD) * (rb + ri) / 2;
      out.push(part(G.rbox(0.0062, 0.0018, zb1 - zb0 - 0.002, 0.0006, 1), m.blued, { p: [x, y, (zb0 + zb1) / 2], r: [0, 0, a] }));
    }
    // bridge: full ring with the stripper-clip guide slot on top and the bolt-handle notch on the right
    out.push(part(latheZ([[0, RD.bridgeRear], [rb - 0.0012, RD.bridgeRear], [rb, RD.bridgeRear + 0.0014], [rb, RD.bridgeFront - 0.001], [rb - 0.0009, RD.bridgeFront], [0, RD.bridgeFront]], 40, 35), m.blued));
    out.push(part(G.rbox(0.0112, 0.0052, 0.0088, 0.001, 2), m.blued, { p: [0, rb + 0.001, RD.bridgeFront + 0.0012] }));
    out.push(part(G.box(0.0026, 0.004, 0.0094), m.recess, { p: [0, rb + 0.0016, RD.bridgeFront + 0.0012] }));
    // rear of the receiver behind the bridge: lower half-shell carrying the bolt-handle notch
    out.push(part(latheZArc([[0.0096, RD.rcvRear], [rb - 0.001, RD.rcvRear], [rb, RD.rcvRear + 0.001], [rb, RD.bridgeRear + 0.001], [0.0096, RD.bridgeRear + 0.001], [0.0096, RD.rcvRear]], 28, 200, 345, 45), m.blued));
    // tang running back over the wrist, with its screw
    const tp: THREE.Vector3[] = [];
    for (let z = RD.rcvRear + 0.002; z >= RD.tangRear; z -= 0.003) tp.push(V(0, STOCK.at(z).yTop + 0.0011, z));
    out.push(part(G.strap(tp, 0.0138, 0.0026, V(0, 1, 0), { samples: 20 }), m.blued));
    const tz = RD.tangRear + 0.012;
    screw(V(0, STOCK.at(tz).yTop + 0.0024, tz), V(0, 1, 0.2).normalize(), 70, 0.9);
    // recoil lug / receiver underside hidden in the stock: a thin visible edge where the ring meets the wood
    out.push(part(G.rbox(0.03, 0.0026, RD.ringFront - RD.ringRear - 0.004, 0.0009, 1), m.blued, { p: [0, -0.0034, (RD.ringRear + RD.ringFront) / 2] }));
  }

  // ---------------- bolt (closed, in the white), handle, safety knob
  {
    const br = RD.boltR;
    out.push(part(latheZ([[0, RD.boltRear], [br - 0.0008, RD.boltRear], [br, RD.boltRear + 0.001], [br, -0.0012], [br - 0.0009, 0], [0, 0]], 32, 35), m.bright));
    // extractor (long spring claw on the right, seen through the opening)
    out.push(part(G.rbox(0.0026, 0.0048, 0.07, 0.0009, 1), m.bright, { p: [-0.0086, 0.0036, -0.058], r: [0, 0, -38] }));
    // handle root collar and the straight handle
    const hz = RD.handleZ;
    out.push(part(latheZ([[0, hz - 0.0098], [br + 0.0012, hz - 0.0098], [br + 0.0014, hz - 0.0085], [br + 0.0014, hz + 0.0085], [br + 0.0012, hz + 0.0098], [0, hz + 0.0098]], 28, 35), m.bright));
    const root = V(-br + 0.001, -0.0005, hz);
    const dir = V(-1, -0.2, -0.04).normalize();
    const kc = root.clone().addScaledVector(dir, 0.047);
    out.push(part(G.rod(root, kc, 0.0043, 18, 0.0036), m.bright));
    // plum-shaped knob
    const knob = latheY([[0, 0], [0.0036, 0], [0.0062, 0.0035], [0.0086, 0.009], [0.0094, 0.0132], [0.0088, 0.018], [0.0064, 0.0222], [0.0028, 0.0242], [0, 0.0246]], 24, 60);
    out.push(part(placeAlong(knob, kc.clone().addScaledVector(dir, -0.002), dir), m.bright));
    // cocking-piece neck and the large knurled safety knob
    out.push(part(latheZ([[0, RD.safetyZ1 - 0.001], [0.0078, RD.safetyZ1 - 0.001], [0.0082, RD.safetyZ1 + 0.001], [0.0082, RD.boltRear + 0.0005], [0, RD.boltRear + 0.0005]], 28, 35), m.bluedDark));
    const kn = knurledKnob(0.0162, RD.safetyZ1 - RD.safetyZ0, hi ? 60 : 30, 0.0005, 0.0012);
    kn.rotateX(Math.PI / 2); // +Y -> +Z
    out.push(part(kn, m.bluedDark, { p: [0, 0, RD.safetyZ0] }));
    // slightly domed rear face of the safety
    out.push(part(latheZ([[0, RD.safetyZ0 - 0.0022], [0.006, RD.safetyZ0 - 0.0018], [0.0128, RD.safetyZ0 - 0.0006], [0.0148, RD.safetyZ0 + 0.0004], [0, RD.safetyZ0 + 0.0004]], 36, 35), m.bluedDark));
  }

  // ---------------- sliding dust cover (optional): curved sheet over the top / right of the opening
  if (o.dustCover) {
    const r0 = 0.0171, r1 = 0.0184;
    const z0 = RD.bridgeFront - 0.0005, z1 = RD.ringRear - 0.0015;
    const prof: V2[] = [[r0, z0], [r1, z0 + 0.0008], [r1, z1 - 0.0008], [r0, z1], [r0, z0]];
    out.push(part(latheZArc(prof, 36, 18, 212, 45), m.bluedDark));
    // rolled edges riding in the receiver grooves
    for (const a of [18, 212]) {
      const x = Math.cos(a * RAD) * (r0 + 0.0003), y = Math.sin(a * RAD) * (r0 + 0.0003);
      out.push(part(cylZ(0.0011, z1 - z0 - 0.002, 10), m.bluedDark, { p: [x, y, (z0 + z1) / 2] }));
    }
    // three pressed finger ribs at the rear of the cover
    for (let i = 0; i < 3; i++) {
      const z = z0 + 0.006 + i * 0.0045;
      out.push(part(latheZArc([[r1 - 0.0002, z - 0.0009], [r1 + 0.0007, z - 0.0005], [r1 + 0.0007, z + 0.0005], [r1 - 0.0002, z + 0.0009]], 24, 40, 170, 45), m.bluedDark));
    }
  }

  // ---------------- rear sight: base on the barrel, ladder leaf folded down, slider, AA lead arms
  {
    const z0 = RD.rsBase0, z1 = RD.rsBase1;
    const rb = barrelR((z0 + z1) / 2);
    // base: sleeve round the barrel with a flat-topped bed
    const bed: V2[] = [[-0.0112, 0.0012], [-0.0112, 0.0142], [-0.0098, 0.0158], [0.0098, 0.0158], [0.0112, 0.0142], [0.0112, 0.0012]];
    const ring: V2[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (180 + 180 * (i / 24)) * RAD; // bottom half, right to left
      ring.push([Math.cos(a) * (rb + 0.0022), Math.sin(a) * (rb + 0.0022)]);
    }
    const sec: V2[] = [...ring, ...bed.slice().reverse().map(([x, y]) => [x, y] as V2)];
    out.push(part(extrudeZ(sec, [circle2D(rb - 0.0002, 28)], z0, z1, 0.0008, 4), m.blued));
    // hinge knuckles at the front and the leaf spring bed
    out.push(part(cylX(0.0024, 0.024, 16), m.blued, { p: [0, 0.0158, z1 - 0.004] }));
    // ladder leaf lying back along the bed, with its slot (window)
    const lz0 = z0 + 0.004, lz1 = z1 - 0.003;
    const leaf: V2[] = roundRect(0, (lz0 + lz1) / 2, 0.0162, lz1 - lz0, 0.0016, 3);
    const win: V2[] = stadium(0, (lz0 + lz1) / 2 + 0.004, 0.0062, lz1 - lz0 - 0.022, 6);
    out.push(part(plateXZ(leaf, 0.0022, [win], 0.0004), m.blued, { p: [0, 0.0172, 0] }));
    // graduation lines on the leaf (fine raised ticks)
    if (hi) for (let i = 0; i < 8; i++) out.push(part(G.box(0.0022, 0.0003, 0.0004), m.bright, { p: [0.0068, 0.0185, lz0 + 0.012 + i * 0.0048] }));
    // slider with the aperture near the rear end
    const sz = lz0 + 0.009;
    out.push(part(G.rbox(0.0196, 0.0046, 0.0078, 0.0009, 2), m.bluedDark, { p: [0, 0.0182, sz] }));
    const ap: V2[] = roundRect(0, 0.0215, 0.0078, 0.0068, 0.0028, 4);
    out.push(part(extrudeZ(ap, [circle2D(0.0011, 14, 0, 0.0222)], sz - 0.0012, sz + 0.0012, 0.0003, 6), m.bluedDark));
    // anti-aircraft lead arms folded along both sides of the leaf, pivot knobs at the slider
    for (const sx of [1, -1]) {
      const arm: V2[] = [[sz - 0.003, 0.0162], [sz + 0.034, 0.0162], [sz + 0.036, 0.0174], [sz + 0.034, 0.0188], [sz - 0.003, 0.0188]];
      out.push(part(plateZY(arm, 0.0014, [], 0.0003), m.blued, { p: [sx * 0.0112, 0, 0] }));
      // notches (lead marks) on the arm
      if (hi) for (let k = 0; k < 3; k++) out.push(part(G.box(0.0016, 0.0009, 0.0008), m.recess, { p: [sx * 0.0112, 0.0188, sz + 0.009 + k * 0.0085] }));
      out.push(part(cylX(0.0022, 0.0018, 12), m.bluedDark, { p: [sx * 0.0112, 0.0176, sz] }));
    }
  }

  // ---------------- front sight: collar, blade between protective ears
  {
    const fz = RD.frontSightZ;
    const rb = barrelR(fz);
    out.push(part(latheZ([[0, fz - 0.011], [rb + 0.0022, fz - 0.011], [rb + 0.0032, fz - 0.0095], [rb + 0.0032, fz + 0.0085], [rb + 0.0022, fz + 0.01], [0, fz + 0.01]], 32, 35), m.blued));
    const blade: V2[] = [[fz - 0.0045, 0.009], [fz + 0.0045, 0.009], [fz + 0.0034, 0.0172], [fz + 0.001, RD.sightY], [fz - 0.001, RD.sightY], [fz - 0.0034, 0.0172]];
    out.push(part(plateZY(blade, 0.0018, [], 0.0003), m.blued));
    const ear: V2[] = [[fz - 0.0085, 0.008], [fz + 0.0085, 0.008], [fz + 0.0075, 0.0192], [fz + 0.0045, 0.0232], [fz - 0.0045, 0.0232], [fz - 0.0075, 0.0192]];
    for (const sx of [1, -1]) out.push(part(plateZY(ear, 0.0016, [], 0.0004), m.blued, { p: [sx * 0.0058, 0, 0] }));
    out.push(part(G.rbox(0.0134, 0.004, 0.017, 0.001, 2), m.blued, { p: [0, 0.0098, fz] }));
  }

  // ---------------- lower band with the left-side sling swivel stud
  {
    const z0 = RD.lowerBand0, z1 = RD.lowerBand1;
    const secs = [
      { z: z0, ring: Profile.ring(bandSec(z0, 0.0006), 56) },
      { z: z0 + 0.001, ring: Profile.ring(bandSec(z0, 0.0014), 56) },
      { z: z1 - 0.001, ring: Profile.ring(bandSec(z1, 0.0014), 56) },
      { z: z1, ring: Profile.ring(bandSec(z1, 0.0006), 56) },
    ];
    out.push(part(G.loftZ(secs, true, 40), m.blued));
    // band screw on the right, swivel stud on the left
    const s = bandSec(RD.frontSwivelZ, 0.0014);
    screw(V(-s.hw - 0.0002, -0.012, RD.frontSwivelZ), V(-1, 0, 0), 10, 0.8);
    const pin = SWIVELS.front.pin;
    out.push(part(G.rbox(0.0068, 0.009, 0.01, 0.0016, 2), m.blued, { p: [s.hw + 0.0016, pin.y, pin.z] }));
  }

  // ---------------- upper band + nose cap, bayonet lug, cleaning-rod head
  {
    const z0 = RD.upperBand0, z1 = RD.upperBand1;
    const secs = [
      { z: z0, ring: Profile.ring(bandSec(z0, 0.0006), 56) },
      { z: z0 + 0.0012, ring: Profile.ring(bandSec(z0, 0.0015), 56) },
      { z: z1, ring: Profile.ring(bandSec(z1, 0.0015), 56) },
    ];
    out.push(part(G.loftZ(secs, true, 40), m.blued));
    // nose cap: from the band section forward to a rounded cap round the barrel and the cleaning rod
    const capSec = (f: number): V2[] => {
      const b = bandSec(RD.upperBand1, 0.0015);
      return Profile.ring({ ...b, hw: b.hw * (1 - 0.26 * f), yTop: b.yTop - 0.0045 * f, yBot: b.yBot + 0.008 * f, eTop: 2.2, eBot: 2.2 }, 56);
    };
    const cz = RD.capFront;
    const capSecs = [0, 0.25, 0.5, 0.75, 0.93, 1].map((f) => ({ z: z1 + (cz - z1) * f, ring: capSec(f < 1 ? Math.sin((f * Math.PI) / 2) : 1.06) }));
    out.push(part(G.loftZ(capSecs, true, 35), m.blued));
    out.push(part(cylZ(barrelR(cz) + 0.0005, 0.0012, 24), m.recess, { p: [0, 0, cz + 0.0002] }));
    // bayonet lug (T-bar under the cap)
    const lug: V2[] = [[z1 - 0.004, -0.0215], [cz + 0.021, -0.0215], [cz + 0.024, -0.0245], [cz + 0.022, -0.0292], [z1 + 0.006, -0.0292], [z1 - 0.004, -0.026]];
    out.push(part(plateZY(lug, 0.0066, [], 0.0006), m.blued));
    out.push(part(G.box(0.0086, 0.0014, 0.018), m.blued, { p: [0, -0.0276, cz + 0.011] }));
    // cleaning-rod head just ahead of the cap, below the barrel
    out.push(part(latheZ([[0, cz - 0.004], [0.0028, cz - 0.004], [0.0028, cz + 0.0145], [0.0038, cz + 0.016], [0.0038, cz + 0.0205], [0.0032, cz + 0.0218], [0, cz + 0.0218]], 18, 35), m.blued, { p: [0, -0.0148, 0] }));
  }

  // ---------------- trigger guard, magazine floorplate + latch, trigger
  {
    const yb = -0.0636;
    // floorplate (flush with the belly) and its latch in the front of the guard
    out.push(part(G.rbox(0.0204, 0.0032, RD.floorFront - RD.floorRear, 0.0012, 2), m.bluedDark, { p: [0, yb - 0.0006, (RD.floorFront + RD.floorRear) / 2] }));
    out.push(part(G.rbox(0.013, 0.0015, RD.floorFront - RD.floorRear - 0.02, 0.0005, 1), m.bluedDark, { p: [0, yb - 0.0026, (RD.floorFront + RD.floorRear) / 2 + 0.004] }));
    // guard bow
    const P: [number, number][] = [
      [-0.098, -0.0645],
      [-0.1, -0.0725],
      [-0.1055, -0.0805],
      [-0.1145, -0.0858],
      [-0.128, -0.0878],
      [-0.148, -0.0878],
      [-0.162, -0.0852],
      [-0.1715, -0.0795],
      [-0.1765, -0.0722],
      [-0.179, -0.0662],
    ];
    const pts = P.map(([z, y]) => V(0, y, z));
    const c = V(0, -0.064, -0.138);
    const nrm = pts.map((p) => p.clone().sub(c).setX(0).normalize());
    out.push(part(G.strap(pts, 0.0102, 0.0032, nrm, { samples: 60 }), m.bluedDark));
    // guard tang under the wrist with a screw
    const tp: THREE.Vector3[] = [];
    for (let z = -0.176; z >= -0.205; z -= 0.004) tp.push(V(0, STOCK.at(z).yBot - 0.0009, z));
    out.push(part(G.strap(tp, 0.0118, 0.0022, V(0, -1, 0), { samples: 16 }), m.bluedDark));
    screw(V(0, STOCK.at(-0.195).yBot - 0.002, -0.195), V(0, -1, 0), 40, 0.85, m.bluedDark);
    // floorplate latch button inside the front of the guard
    out.push(part(G.rbox(0.0058, 0.006, 0.0042, 0.0012, 2), m.bluedDark, { p: [0, -0.0682, -0.1025] }));
    // trigger blade (curved), face at RD.triggerZ
    const tpnts = [V(0, -0.064, -0.1265), V(0, -0.0705, -0.1285), V(0, -0.0765, -0.1318), V(0, -0.0812, -0.1362), V(0, -0.0835, -0.1405)];
    out.push(part(G.strap(tpnts, 0.0056, 0.0034, V(0, 0, 1), { samples: 30 }), m.bluedDark));
  }

  // ---------------- sling swivels (both on the LEFT side), fixed at the angle the strap pulls them
  for (const s of [SWIVELS.front, SWIVELS.rear]) {
    const pinG = new THREE.CylinderGeometry(0.0016, 0.0016, 0.0118, 10);
    out.push(part(pinG, m.bluedDark, { p: s.pin.toArray() as [number, number, number] }));
    for (const sy of [1, -1]) out.push(part(new THREE.CylinderGeometry(0.0025, 0.0025, 0.0009, 12), m.bluedDark, { p: [s.pin.x, s.pin.y + sy * 0.0055, s.pin.z] }));
    out.push(sideSwivel(s.pin, s.dir, SWIVELS.innerW, s.reach, SWIVELS.wire, m.blued).mesh);
  }
  // rear swivel stud on its plate
  {
    const p = SWIVELS.rear.pin;
    out.push(part(G.rbox(0.0072, 0.0088, 0.0105, 0.0017, 2), m.bluedDark, { p: [p.x - 0.0028, p.y, p.z] }));
  }
  return out;
}

/** Group helper for the model file. */
export const metalGroup = (m: JpwMats, o: MetalOptions) => group(buildMetal(m, o), { name: 'type99-metal' });
