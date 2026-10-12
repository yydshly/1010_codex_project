/**
 * Type 99 LMG parts (L-frame, see dims.ts):
 *  butt with the steel butt plate, the receiver ferrule and the folding monopod (folded under the butt);
 *  receiver (top magazine well, cocking handle + slot on the right, side plates, pins, ejection opening
 *  below); trigger housing, wooden pistol grip with grooves, trigger guard, trigger, safety lever;
 *  barrel with the locking nut, finned rear section, carrying handle (folded to the right), smooth front
 *  section and the conical flash hider; gas cylinder, gas block with regulator and bayonet lug; left-offset
 *  rear sight (leaf with aperture, windage knob) and front sight (blade between ears on an arm);
 *  30-round curved box magazine; left-side sling swivels.
 */
import { THREE, G, part } from '../../../../core/kit';
import { V, latheZ, latheX, cylX, cylZ, extrudeZ, plateZY, roundRect, circle2D, screwParts, placeAlong, knurledKnob, stations, type V2 } from '../common/geo';
import { circlesUnion, sideSwivel, sweep } from '../common/parts';
import { LD, BUTT, barrelR, magCentre } from './dims';
import type { JpwMats } from '../common/materials';

export const LSWIVELS = {
  front: { pin: V(0.0262, -0.021, LD.frontSwivelZ), dir: V(0.2, 0, -1).normalize(), reach: 0.017 },
  rear: {
    pin: V(BUTT.sideX(LD.rearSwivelZ, BUTT.at(LD.rearSwivelZ).ySplit) + 0.0056, BUTT.at(LD.rearSwivelZ).ySplit + 0.004, LD.rearSwivelZ),
    dir: V(0.2, 0, 1).normalize(),
    reach: 0.017,
  },
  innerW: 0.0342,
  wire: 0.002,
};

export const lSwivelBar = (s: { pin: THREE.Vector3; dir: THREE.Vector3; reach: number }) => s.pin.clone().addScaledVector(V(s.dir.x, 0, s.dir.z).normalize(), s.reach);

/** Gas block outline (barrel sleeve + cylinder), XY. */
export const gasBlockOutline = (grow = 0) => circlesUnion([[0, 0, 0.0158 + grow], [0, LD.gasY, 0.0118 + grow]], 0, -0.012, 56, 0.006);

/** Pistol-grip frame: top centre, down direction (along the grip), forward direction. */
export function gripFrame() {
  const r = (LD.gripRake * Math.PI) / 180;
  const down = V(0, -Math.cos(r), -Math.sin(r));
  const fwd = V(0, -Math.sin(r), Math.cos(r));
  return { top: V(0, LD.thBot + 0.002, LD.gripTopZ), down, fwd };
}

export function buildParts(m: JpwMats, magazine: boolean, hi: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const seg = hi ? 40 : 24;
  const [scHead, scSlot] = screwParts(0.003, 0.001, 25);
  const screw = (p: THREE.Vector3, n: THREE.Vector3, spin = 25, s = 1, mat: THREE.Material = m.blued) => {
    const h = scHead.clone().scale(s, s, s), sl = scSlot.clone().scale(s, s, s);
    out.push(part(placeAlong(h, p, n), mat), part(placeAlong(sl, p, n, spin), m.recess));
  };
  const pinX = (y: number, z: number, hw: number, r = 0.0022) => {
    out.push(part(cylX(r, 2 * hw + 0.0016, 14), m.bluedDark, { p: [0, y, z] }));
  };

  // ================= butt
  {
    const st = stations(BUTT.z0, BUTT.z1, (z) => (z < 0.03 ? 0.008 : z > 0.23 ? 0.008 : 0.018));
    out.push(part(BUTT.loft(st, hi ? 64 : 40, 50), m.gripWood));
    // steel butt plate (enamel black), cupped over the edges
    const bz = LD.plateZ;
    const ring = (z: number, d: number) => BUTT.ringAt(z, 64, d);
    out.push(
      part(
        G.loftZ(
          [
            { z: bz + 0.004, ring: ring(bz + 0.004, 0.0002) },
            { z: bz + 0.0032, ring: ring(bz + 0.0032, 0.0012) },
            { z: bz, ring: ring(bz, 0.0014) },
            { z: 0.0012, ring: ring(bz, 0.001) },
            { z: 0, ring: ring(bz, -0.0012) },
          ],
          true,
          45,
        ),
        m.blackened,
      ),
    );
    for (const y of [-0.045, -0.125]) screw(V(0, y, 0.0002), V(0, 0, -1), 30, 1, m.blackened);
    // ferrule where the butt enters the receiver
    const z0 = 0.281, z1 = LD.rcvRear + 0.004;
    out.push(part(G.loftZ([{ z: z0, ring: ring(z0, 0.0004) }, { z: z0 + 0.0012, ring: ring(z0, 0.0015) }, { z: z1, ring: ring(z1, 0.0015) }], true, 40), m.blued));
    // folding monopod, folded along the belly: hinge bracket, leg, knurled lock collar, foot
    const hz = 0.232, hy = BUTT.at(hz).yBot;
    out.push(part(G.rbox(0.017, 0.012, 0.03, 0.0025, 2), m.bluedDark, { p: [0, hy - 0.004, hz] }));
    out.push(part(cylX(0.004, 0.022, 14), m.bluedDark, { p: [0, hy - 0.0085, hz - 0.006] }));
    const legTop = V(0, hy - 0.0095, hz - 0.006);
    const fz = 0.07;
    const legEnd = V(0, BUTT.at(fz).yBot - 0.0085, fz);
    out.push(part(G.rod(legTop, legEnd, 0.0052, 16), m.blued));
    const mid = legTop.clone().lerp(legEnd, 0.42);
    const ld = legEnd.clone().sub(legTop).normalize();
    const col = knurledKnob(0.0072, 0.016, hi ? 20 : 12, 0.0004, 0.0006);
    out.push(part(placeAlong(col, mid, ld), m.bluedDark));
    out.push(part(placeAlong(new THREE.CylinderGeometry(0.0062, 0.0062, 0.036, 16).translate(0, 0.018, 0), mid.clone().addScaledVector(ld, 0.016), ld), m.bluedDark));
    // foot: small flat spade
    out.push(part(G.rbox(0.022, 0.004, 0.014, 0.0015, 2), m.bluedDark, { p: legEnd.clone().addScaledVector(ld, 0.004).add(V(0, -0.003, 0)).toArray() as [number, number, number] }));
  }

  // ================= receiver
  const hw = LD.rcvHW;
  {
    const sec = roundRect(0, (LD.rcvTop + LD.rcvBot) / 2, 2 * hw, LD.rcvTop - LD.rcvBot, 0.0045, 4);
    out.push(part(extrudeZ(sec, [], LD.rcvRear + 0.012, LD.rcvFront, 0.0012, 4), m.blued));
    // rounded rear end cap
    const cap = roundRect(0, (LD.rcvTop + LD.rcvBot) / 2 - 0.002, 2 * hw - 0.004, LD.rcvTop - LD.rcvBot - 0.008, 0.008, 5);
    out.push(part(extrudeZ(cap, [], LD.rcvRear, LD.rcvRear + 0.014, 0.004, 4), m.blued));
    // top cover (raised) from the rear to the magazine well, and ahead of it
    out.push(part(G.rbox(2 * hw - 0.008, 0.004, LD.wellZ0 - LD.rcvRear - 0.03, 0.0014, 2), m.bluedDark, { p: [0, LD.rcvTop + 0.0012, (LD.rcvRear + 0.022 + LD.wellZ0) / 2] }));
    out.push(part(G.rbox(2 * hw - 0.01, 0.0035, LD.rcvFront - LD.wellZ1 - 0.02, 0.0012, 2), m.bluedDark, { p: [0, LD.rcvTop + 0.001, (LD.wellZ1 + LD.rcvFront) / 2 - 0.004] }));
    // side plates (both sides) with the panel line and pins
    for (const sx of [1, -1]) {
      out.push(part(G.rbox(0.0024, 0.034, 0.21, 0.0009, 2), m.bluedDark, { p: [sx * (hw + 0.0006), -0.012, 0.47] }));
      out.push(part(G.box(0.0008, 0.0014, 0.285), m.recess, { p: [sx * (hw + 0.0001), 0.012, 0.455] }));
    }
    for (const [y, z] of [[-0.022, 0.338], [-0.022, 0.438], [0.002, 0.585], [-0.03, 0.585]] as const) pinX(y, z, hw + 0.0012);
    // magazine well collar on top with the dark opening
    const wl = LD.wellZ1 - LD.wellZ0;
    const collar = roundRect(0, 0, LD.magW + 0.009, wl + 0.008, 0.003, 3);
    const hole = roundRect(0, 0, LD.magW + 0.0012, wl + 0.0008, 0.002, 3);
    const cg = extrudeZ(collar, [hole], 0, 0.011, 0.0008, 3);
    cg.rotateX(-Math.PI / 2); // extrusion +Z -> +Y; outline y -> -z
    out.push(part(cg, m.blued, { p: [0, LD.rcvTop - 0.001, (LD.wellZ0 + LD.wellZ1) / 2] }));
    // hinged side-opening dust cover of the well, swung open to the right
    out.push(part(G.rbox(0.0022, 0.03, wl - 0.004, 0.0008, 2), m.bluedDark, { p: [-(LD.magW / 2 + 0.0085), LD.rcvTop + 0.022, (LD.wellZ0 + LD.wellZ1) / 2] }));
    out.push(part(cylZ(0.0022, wl - 0.006, 12), m.bluedDark, { p: [-(LD.magW / 2 + 0.006), LD.rcvTop + 0.009, (LD.wellZ0 + LD.wellZ1) / 2] }));
    if (!magazine) out.push(part(G.box(LD.magW, 0.002, wl), m.recess, { p: [0, LD.rcvTop + 0.004, (LD.wellZ0 + LD.wellZ1) / 2] }));
    // cocking handle slot on the right and the handle (knob) at its front end
    out.push(part(G.box(0.0016, 0.0062, 0.13), m.recess, { p: [-hw - 0.0004, -0.006, 0.525] }));
    const hp = V(-hw - 0.002, -0.006, 0.582);
    out.push(part(G.rbox(0.006, 0.009, 0.014, 0.002, 2), m.bright, { p: hp.toArray() as [number, number, number] }));
    out.push(part(G.rod(hp, hp.clone().add(V(-0.02, 0, 0)), 0.0036, 14), m.bright));
    const knob = latheX([[0, -0.012], [0.0055, -0.0118], [0.0075, -0.009], [0.0078, -0.004], [0.006, -0.0005], [0, 0]], 20, 55);
    out.push(part(knob, m.bluedDark, { p: [hp.x - 0.0205, hp.y, hp.z] }));
    // ejection opening below
    out.push(part(G.box(0.014, 0.0012, 0.05), m.recess, { p: [0, LD.rcvBot - 0.0002, 0.51] }));
    // barrel-lock nut at the front (with notches)
    const nr = 0.0228;
    out.push(part(latheZ([[0, LD.nutZ0], [nr - 0.001, LD.nutZ0], [nr, LD.nutZ0 + 0.001], [nr, LD.nutZ1 - 0.0012], [nr - 0.0015, LD.nutZ1], [0.014, LD.nutZ1]], 48, 35), m.bluedDark));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      out.push(part(G.box(0.004, 0.0036, LD.nutZ1 - LD.nutZ0 - 0.004), m.recess, { p: [Math.cos(a) * (nr - 0.0012), Math.sin(a) * (nr - 0.0012), (LD.nutZ0 + LD.nutZ1) / 2], r: [0, 0, (a * 180) / Math.PI] }));
    }
    // front-swivel stud on the lower left of the nut
    const fp = LSWIVELS.front.pin;
    out.push(part(G.rbox(0.008, 0.0095, 0.011, 0.002, 2), m.bluedDark, { p: [fp.x - 0.004, fp.y, fp.z] }));
  }

  // ================= trigger housing, pistol grip, guard, trigger, safety
  {
    out.push(part(G.rbox(2 * LD.thHW, LD.rcvBot - LD.thBot + 0.004, LD.thZ1 - LD.thZ0, 0.003, 2), m.blued, { p: [0, (LD.rcvBot + LD.thBot) / 2 - 0.001, (LD.thZ0 + LD.thZ1) / 2] }));
    const gf = gripFrame();
    const n = 12;
    const frames = Array.from({ length: n + 1 }, (_, i) => {
      const s = i / n;
      return { c: gf.top.clone().addScaledVector(gf.down, s * LD.gripLen), t: gf.down.clone(), u: gf.fwd.clone() };
    });
    const gripSec = (i: number): V2[] => {
      const s = i / n;
      const w = 0.0275 + 0.003 * Math.sin(Math.PI * Math.min(1, s * 1.2));
      const d = 0.037 + 0.004 * Math.sin(Math.PI * s);
      const k = i === n ? 0.82 : 1;
      const pts: V2[] = [];
      for (let j = 0; j < 36; j++) {
        const a = (j / 36) * Math.PI * 2;
        const c = Math.cos(a), sn = Math.sin(a);
        const e = 2.6;
        // front edge fuller than the back (finger side)
        const du = sn >= 0 ? d * 0.5 : d * 0.5;
        pts.push([k * (w / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / e), k * du * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / e)]);
      }
      return pts;
    };
    out.push(part(sweep(frames, gripSec, 55), m.gripWood));
    // grooves on both sides of the grip
    for (const sx of [1, -1]) {
      for (let k = 0; k < 5; k++) {
        const u = -0.012 + k * 0.006;
        const a = gf.top.clone().addScaledVector(gf.down, 0.014).addScaledVector(gf.fwd, u).add(V(sx * 0.0152, 0, 0));
        const b = gf.top.clone().addScaledVector(gf.down, 0.09).addScaledVector(gf.fwd, u).add(V(sx * 0.0155, 0, 0));
        out.push(part(G.rod(a, b, 0.0009, 5), m.recess));
      }
    }
    // grip cap and the grip screw
    out.push(part(placeAlong(new THREE.CylinderGeometry(0.0118, 0.0118, 0.004, 24).scale(1, 1, 1.45), gf.top.clone().addScaledVector(gf.down, LD.gripLen + 0.001), gf.down), m.bluedDark));
    // trigger guard (steel bow ahead of the grip)
    const P: [number, number][] = [
      [0.44, LD.thBot + 0.001],
      [0.438, LD.thBot - 0.009],
      [0.432, LD.thBot - 0.018],
      [0.42, LD.thBot - 0.0245],
      [0.402, LD.thBot - 0.027],
      [0.385, LD.thBot - 0.0255],
      [0.374, LD.thBot - 0.02],
    ];
    const pts = P.map(([z, y]) => V(0, y, z));
    const c = V(0, LD.thBot, 0.405);
    out.push(part(G.strap(pts, 0.0105, 0.0034, pts.map((p) => p.clone().sub(c).setX(0).normalize()), { samples: 40 }), m.blued));
    const tp = [V(0, LD.thBot + 0.001, LD.triggerZ + 0.004), V(0, LD.thBot - 0.006, LD.triggerZ + 0.002), V(0, LD.thBot - 0.012, LD.triggerZ - 0.001), V(0, LD.thBot - 0.0165, LD.triggerZ - 0.005)];
    out.push(part(G.strap(tp, 0.0058, 0.0034, V(0, 0, 1), { samples: 24 }), m.bright));
    // safety lever on the left of the housing
    const sp = V(LD.thHW + 0.0012, (LD.rcvBot + LD.thBot) / 2, 0.426);
    out.push(part(cylX(0.0045, 0.003, 18), m.bluedDark, { p: sp.toArray() as [number, number, number] }));
    out.push(part(G.rbox(0.0026, 0.0055, 0.022, 0.001, 1), m.bluedDark, { p: [sp.x + 0.0012, sp.y - 0.004, sp.z - 0.009], r: [-18, 0, 0] }));
  }

  // ================= barrel: smooth breech end, fins, handle collar, front section, flash hider
  {
    out.push(part(latheZ([[0, LD.chamberZ], [0.0134, LD.chamberZ], [0.0134, LD.finZ1 + 0.004], [barrelR(LD.finZ1 + 0.006), LD.finZ1 + 0.006], [barrelR(LD.muzzleZ), LD.muzzleZ], [0, LD.muzzleZ]], seg, 30), m.blued));
    // cooling fins (real depth), finZ0..finZ1
    const fins: V2[] = [[0.0134, LD.finZ0]];
    const pitch = 0.0072, t = 0.0024, rOut = 0.0212;
    for (let z = LD.finZ0 + 0.002; z + t < LD.finZ1; z += pitch) {
      fins.push([0.0136, z], [rOut - 0.0006, z + 0.0002], [rOut, z + 0.0008], [rOut, z + t - 0.0008], [rOut - 0.0006, z + t - 0.0002], [0.0136, z + t]);
    }
    fins.push([0.0134, LD.finZ1]);
    out.push(part(latheZ([[0, LD.finZ0], ...fins, [0, LD.finZ1]], hi ? 40 : 24, 35), m.blued));
    // carrying-handle collar just ahead of the nut
    const hz = LD.handleZ;
    out.push(part(latheZ([[0, hz - 0.0085], [0.0172, hz - 0.0085], [0.0182, hz - 0.0075], [0.0182, hz + 0.0075], [0.0172, hz + 0.0085], [0, hz + 0.0085]], 36, 35), m.bluedDark));
    // handle: hinge lug on the right, arm, and the wooden grip lying forward along the right of the fins
    const hinge = V(-0.021, 0.004, hz);
    out.push(part(G.rbox(0.008, 0.014, 0.014, 0.002, 2), m.bluedDark, { p: hinge.toArray() as [number, number, number] }));
    out.push(part(cylX(0.0032, 0.012, 14), m.bluedDark, { p: [hinge.x - 0.002, hinge.y, hinge.z] }));
    const g0 = V(-0.036, 0.004, hz + 0.02), g1 = V(-0.036, 0.004, hz + 0.118);
    out.push(part(G.tube([hinge.clone().add(V(-0.004, 0, 0.004)), V(-0.031, 0.004, hz + 0.01), g0, g0.clone().add(V(0, 0, 0.004))], 0.0036, 10, 24), m.bluedDark));
    out.push(part(G.tube([g1.clone().add(V(0, 0, -0.004)), g1, V(-0.03, 0.004, hz + 0.128), V(-0.0215, 0.004, hz + 0.129)], 0.0034, 10, 24), m.bluedDark));
    const grip = latheZ([[0, g0.z], [0.0092, g0.z], [0.0112, g0.z + 0.006], [0.0118, (g0.z + g1.z) / 2], [0.0112, g1.z - 0.006], [0.0092, g1.z], [0, g1.z]], 24, 40);
    out.push(part(grip, m.gripWood, { p: [g0.x, g0.y, 0] }));
    // flash hider: hollow cone screwed onto the muzzle, with a knurled rear ring
    const f0 = LD.muzzleZ - 0.014, f1 = LD.fhZ1;
    out.push(
      part(
        latheZ(
          [
            [0.0112, f0],
            [0.0148, f0],
            [0.0152, f0 + 0.0012],
            [0.0152, f0 + 0.016],
            [0.0142, f0 + 0.018],
            [0.0222, f1 - 0.0015],
            [0.0218, f1],
            [0.0196, f1],
            [0.0118, f0 + 0.021],
            [0.0045, f0 + 0.02],
            [0.0045, f0 + 0.014],
            [0.0112, f0 + 0.014],
            [0.0112, f0],
          ],
          hi ? 40 : 28,
          35,
        ),
        m.blued,
      ),
    );
    out.push(part(cylZ(0.0046, 0.0006, 14), m.recess, { p: [0, 0, f0 + 0.0195] }));
    // front sight: collar, arm up to the LEFT, blade between protective ears
    const fz = LD.frontSightZ;
    const rb = barrelR(fz);
    out.push(part(latheZ([[0, fz - 0.0085], [rb + 0.0022, fz - 0.0085], [rb + 0.0032, fz - 0.0072], [rb + 0.0032, fz + 0.0072], [rb + 0.0022, fz + 0.0085], [0, fz + 0.0085]], 32, 35), m.blued));
    const arm: V2[] = [[0.004, 0.0105], [0.014, 0.0082], [LD.sightX + 0.0065, LD.sightY - 0.019], [LD.sightX + 0.0065, LD.sightY - 0.0125], [LD.sightX - 0.0065, LD.sightY - 0.0125], [LD.sightX - 0.0065, LD.sightY - 0.021], [0.0045, 0.0145]];
    out.push(part(extrudeZ(arm, [], fz - 0.0055, fz + 0.0055, 0.0008, 3), m.blued));
    const blade: V2[] = [[fz - 0.004, LD.sightY - 0.0128], [fz + 0.004, LD.sightY - 0.0128], [fz + 0.0028, LD.sightY - 0.004], [fz + 0.0009, LD.sightY], [fz - 0.0009, LD.sightY], [fz - 0.0028, LD.sightY - 0.004]];
    out.push(part(plateZY(blade, 0.0018, [], 0.0003), m.blued, { p: [LD.sightX, 0, 0] }));
    const ear: V2[] = [[fz - 0.0062, LD.sightY - 0.013], [fz + 0.0062, LD.sightY - 0.013], [fz + 0.0055, LD.sightY - 0.001], [fz + 0.003, LD.sightY + 0.0022], [fz - 0.003, LD.sightY + 0.0022], [fz - 0.0055, LD.sightY - 0.001]];
    for (const sx of [1, -1]) out.push(part(plateZY(ear, 0.0015, [], 0.0004), m.blued, { p: [LD.sightX + sx * 0.0058, 0, 0] }));
  }

  // ================= gas cylinder, gas block, regulator, bayonet lug
  {
    const gy = LD.gasY;
    out.push(part(cylZ(LD.gasR, LD.gbZ0 - LD.rcvFront + 0.004, 24), m.bluedDark, { p: [0, gy, (LD.rcvFront + LD.gbZ0) / 2] }));
    // gas-cylinder bracket against the receiver front
    out.push(part(G.rbox(0.022, 0.018, 0.012, 0.003, 2), m.blued, { p: [0, gy - 0.001, LD.rcvFront + 0.004] }));
    const outl = gasBlockOutline();
    out.push(part(extrudeZ(outl, [circle2D(barrelR(LD.gbZ0) - 0.0003, 28)], LD.gbZ0, LD.gbZ1, 0.0014, 4), m.blued));
    // regulator (knurled knob) at the front of the gas cylinder, with its index notches
    const rk = knurledKnob(0.0092, 0.012, hi ? 24 : 14, 0.0005, 0.0008);
    rk.rotateX(Math.PI / 2);
    out.push(part(rk, m.bluedDark, { p: [0, gy, LD.gbZ1] }));
    out.push(part(G.box(0.0126, 0.0016, 0.0016), m.recess, { p: [0, gy, LD.gbZ1 + 0.0122] }));
    // bayonet lug under the gas block
    const lug: V2[] = [[LD.gbZ1 - 0.026, gy - 0.0112], [LD.gbZ1 - 0.001, gy - 0.0112], [LD.gbZ1 + 0.001, gy - 0.0145], [LD.gbZ1 - 0.002, gy - 0.0188], [LD.gbZ1 - 0.024, gy - 0.0188]];
    out.push(part(plateZY(lug, 0.0068, [], 0.0006), m.blued));
    // cross pin through the gas block
    out.push(part(cylX(0.0022, 0.034, 12), m.bluedDark, { p: [0, gy + 0.004, LD.gbZ0 + 0.012] }));
  }

  // ================= rear sight on the LEFT: bracket, standing leaf with aperture, windage knob
  {
    const z = LD.rearSightZ;
    const br: V2[] = [[hw - 0.001, LD.rcvTop - 0.012], [hw - 0.001, LD.rcvTop + 0.004], [LD.sightX + 0.008, LD.rcvTop + 0.006], [LD.sightX + 0.009, LD.rcvTop - 0.002], [hw + 0.006, LD.rcvTop - 0.014]];
    out.push(part(extrudeZ(br, [], z - 0.014, z + 0.014, 0.0012, 3), m.blued));
    out.push(part(G.rbox(0.018, 0.0045, 0.03, 0.0015, 2), m.blued, { p: [LD.sightX, LD.rcvTop + 0.0075, z] }));
    const leaf: V2[] = roundRect(LD.sightX, (LD.rcvTop + 0.008 + LD.sightY + 0.006) / 2, 0.012, LD.sightY + 0.006 - LD.rcvTop - 0.008, 0.002, 3);
    out.push(part(extrudeZ(leaf, [circle2D(0.0011, 14, LD.sightX, LD.sightY)], z - 0.0014, z + 0.0014, 0.0004, 4), m.blued));
    // slider round the leaf
    out.push(part(G.rbox(0.017, 0.006, 0.007, 0.0012, 2), m.bluedDark, { p: [LD.sightX, LD.sightY - 0.014, z] }));
    // graduations
    if (hi) for (let i = 0; i < 6; i++) out.push(part(G.box(0.0022, 0.0004, 0.0004), m.bright, { p: [LD.sightX + 0.0038, LD.rcvTop + 0.014 + i * 0.0045, z + 0.0016] }));
    const wk = knurledKnob(0.0062, 0.005, hi ? 18 : 12, 0.0004, 0.0005);
    wk.rotateZ(-Math.PI / 2);
    out.push(part(wk, m.bluedDark, { p: [LD.sightX + 0.009, LD.rcvTop + 0.0075, z] }));
  }

  // ================= sling swivels (left side) + rear swivel stud and plate
  {
    const p = LSWIVELS.rear.pin;
    const ym = p.y;
    const ta = (zz: number) => BUTT.tAtY(zz, ym - 0.009);
    const tb = (zz: number) => BUTT.tAtY(zz, ym + 0.009);
    out.push(part(BUTT.shell(p.z - 0.028, p.z + 0.02, ta, tb, 0.0016, 0.0004, 8, 6), m.bluedDark));
    out.push(part(G.rbox(0.0074, 0.0092, 0.0105, 0.0017, 2), m.bluedDark, { p: [p.x - 0.0028, p.y, p.z] }));
    for (const dz of [-0.02, 0.013]) {
      const zz = p.z + dz;
      screw(V(BUTT.sideX(zz, ym) + 0.0012, ym, zz), V(1, 0, 0), 60, 0.9, m.bluedDark);
    }
    for (const s of [LSWIVELS.front, LSWIVELS.rear]) {
      out.push(part(new THREE.CylinderGeometry(0.0016, 0.0016, 0.0122, 10), m.bluedDark, { p: s.pin.toArray() as [number, number, number] }));
      out.push(sideSwivel(s.pin, s.dir, LSWIVELS.innerW, s.reach, LSWIVELS.wire, m.blued).mesh);
    }
  }

  // ================= magazine (30-round curved box)
  if (magazine) out.push(...buildMagazine(m, hi));
  return out;
}

export function buildMagazine(m: JpwMats, hi: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const n = hi ? 20 : 12;
  const depth = 0.086;
  const frames = Array.from({ length: n + 1 }, (_, i) => {
    const c = magCentre(i / n);
    return { c: V(0, c.y, c.z), t: V(0, c.ty, c.tz), u: V(0, -c.tz, c.ty) };
  });
  const sec = (grow: number) => () => roundRect(0, 0, LD.magW + 2 * grow, depth + 2 * grow, 0.0035, 3);
  out.push(part(sweep(frames, sec(0), 40), m.blued));
  // pressed stiffening ribs along both sides
  for (const sx of [1, -1]) {
    for (const u of [-0.022, 0.018]) {
      const fr = frames.slice(1, n).map((f) => ({ c: f.c.clone().add(V(sx * (LD.magW / 2), 0, 0)).addScaledVector(f.u, u), t: f.t, u: f.u }));
      out.push(part(sweep(fr, () => roundRect(0, 0, 0.0016, 0.006, 0.0007, 2), 40), m.blued));
    }
  }
  // round-counter slot on the left with the indicator stud
  {
    const fr = frames.slice(3, n - 2).map((f) => ({ c: f.c.clone().add(V(LD.magW / 2 + 0.0001, 0, 0)).addScaledVector(f.u, -0.002), t: f.t, u: f.u }));
    out.push(part(sweep(fr, () => roundRect(0, 0, 0.0008, 0.0035, 0.0003, 1), 40), m.recess));
    const f = frames[Math.round(n * 0.45)];
    out.push(part(cylX(0.0022, 0.0022, 12), m.bright, { p: f.c.clone().add(V(LD.magW / 2 + 0.0008, 0, 0)).addScaledVector(f.u, -0.002).toArray() as [number, number, number] }));
  }
  // closed top end (floor plate) with a lip, and the reinforcing band at the well
  {
    const f = frames[n];
    const cap = sweep([{ c: f.c.clone().addScaledVector(f.t, -0.003), t: f.t, u: f.u }, { c: f.c.clone().addScaledVector(f.t, 0.0025), t: f.t, u: f.u }], sec(0.0012), 40);
    out.push(part(cap, m.blued));
    const w = frames[2];
    const band = sweep([{ c: w.c.clone().addScaledVector(w.t, -0.004), t: w.t, u: w.u }, { c: w.c.clone().addScaledVector(w.t, 0.006), t: w.t, u: w.u }], sec(0.0009), 40);
    out.push(part(band, m.blued));
  }
  return out;
}
