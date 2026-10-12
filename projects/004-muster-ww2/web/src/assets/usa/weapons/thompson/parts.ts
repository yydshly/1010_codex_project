/**
 * Thompson M1A1 parts (T-frame, see dims.ts): milled receiver with the cocking handle and slot on the
 * right, ejection port, selector and safety levers on the left; frame with trigger guard, trigger,
 * magazine catch, frame latch and the walnut pistol grip; magazine well; smooth barrel with muzzle
 * crown and blade front sight; horizontal walnut fore-grip with its screw and front sling swivel;
 * walnut butt stock with steel butt plate and rear swivel; fixed peep rear sight with protective wings;
 * 30- or 20-round box magazine.
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V, latheZ, cylX, cylZ, extrudeZ, plateZY, plateXZ, roundRect, circle2D, screwParts, placeAlong, basis, stations, Profile, type V2 } from '../common/geo';
import { swivelLoop } from '../common/parts';
import { TD, TSTOCK, TFORE, TBARREL, GRIP } from './dims';
import type { ThompsonMats } from './materials';

export type ThompsonMagazine = '30' | '20' | 'none';

/** Swivels (pins, loop directions) shared with the sling builder. */
export const TSWIVELS = {
  front: { pin: V(0, TFORE.at(TD.frontSwivelZ).yBot - 0.0058, TD.frontSwivelZ), dir: V(0, -0.2, -0.98).normalize(), reach: 0.0205 },
  rear: { pin: V(0, TSTOCK.at(TD.rearSwivelZ).yBot - 0.0068, TD.rearSwivelZ), dir: V(0, 0.08, 1).normalize(), reach: 0.0205 },
  innerW: 0.0335,
  wire: 0.002,
};
export const tSwivelBar = (s: { pin: THREE.Vector3; dir: THREE.Vector3; reach: number }) => s.pin.clone().addScaledVector(s.dir, s.reach);

/** Rounded rectangle outline with separate top / bottom corner radii (CCW). */
function box2D(hw: number, yBot: number, yTop: number, rTop: number, rBot: number, n = 5): V2[] {
  const pts: V2[] = [];
  const arc = (cx: number, cy: number, r: number, a0: number) => {
    for (let i = 0; i <= n; i++) {
      const a = ((a0 + (90 * i) / n) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  arc(hw - rBot, yBot + rBot, rBot, -90);
  arc(hw - rTop, yTop - rTop, rTop, 0);
  arc(-hw + rTop, yTop - rTop, rTop, 90);
  arc(-hw + rBot, yBot + rBot, rBot, 180);
  return pts;
}

/** Magazine length below the top of the well for a type. */
export const magBottom = (t: ThompsonMagazine) => (t === '20' ? -0.172 : -0.236);

export function buildThompsonParts(m: ThompsonMats, mag: ThompsonMagazine, detail: 'high' | 'low' = 'high'): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const hi = detail === 'high';
  const [scHead, scSlot] = screwParts(0.0034, 0.0012, 25);
  const screw = (p: THREE.Vector3, n: THREE.Vector3, spin = 25, s = 1, mat: THREE.Material = m.park) => {
    const h = scHead.clone().scale(s, s, s), sl = scSlot.clone().scale(s, s, s);
    out.push(part(placeAlong(h, p, n), mat), part(placeAlong(sl, p, n, spin), m.recess));
  };

  // ---------------- receiver
  // upper body (full width) over a slightly narrower lower band that mates with the frame
  const rsec = box2D(TD.rcvHW, -0.0118, TD.rcvTop, 0.0085, 0.0008);
  out.push(part(extrudeZ(rsec, [], TD.rcvRear, TD.rcvFront, 0.0016, 4), m.park));
  const rlow = box2D(TD.rcvHW - 0.0007, TD.rcvBot, -0.0112, 0.0005, 0.0018);
  out.push(part(extrudeZ(rlow, [], TD.rcvRear + 0.0006, TD.rcvFront - 0.0006, 0.001, 4), m.park));
  // tapered nose where the barrel enters
  const nose = box2D(TD.rcvHW - 0.0012, TD.rcvBot + 0.002, TD.rcvTop - 0.0016, 0.0078, 0.0016);
  out.push(part(extrudeZ(nose, [], TD.rcvFront - 0.004, TD.rcvFront + 0.0012, 0.0012, 4), m.park));
  // rear end cap (actuator / buffer housing end)
  out.push(part(extrudeZ(box2D(TD.rcvHW - 0.0022, -0.0105, TD.rcvTop - 0.0034, 0.0062, 0.001), [], TD.rcvRear - 0.0024, TD.rcvRear + 0.001, 0.0009, 4), m.parkDark));
  // frame / trigger pins through the sides
  for (const sx of [1, -1]) {
    for (const [pz, py] of [[0.3, -0.036], [0.35, -0.0365], [0.382, -0.036], [0.44, -0.035]] as const) {
      out.push(part(cylX(0.0019, 0.0008, 12), sx > 0 ? m.bright : m.parkDark, { p: [sx * (TD.frameHW + 0.0003), py, pz] }));
    }
  }
  // flat top rib along the receiver (sight line), and the front collar where the barrel screws in
  out.push(part(G.rbox(0.0122, 0.0012, 0.2, 0.0005, 1), m.park, { p: [0, TD.rcvTop - 0.0002, 0.418] }));
  out.push(part(latheZ([[0.0134, TD.rcvFront - 0.001], [0.0149, TD.rcvFront - 0.001], [0.0152, TD.rcvFront + 0.0012], [0.0147, TD.rcvFront + 0.0045], [0.0134, TD.rcvFront + 0.0052]], 40, 35), m.park));
  // right side: cocking slot, cocking handle (bolt forward), ejection port
  {
    const sx = -TD.rcvHW - 0.0001;
    out.push(part(G.box(0.0006, 0.0058, 0.168), m.recess, { p: [sx, 0.0085, 0.462] }));
    // raised lips along the slot
    for (const dy of [-0.0039, 0.0039]) out.push(part(G.rbox(0.0008, 0.0014, 0.17, 0.0004, 1), m.park, { p: [sx - 0.0002, 0.0085 + dy, 0.462] }));
    const kz = 0.537, ky = 0.0085;
    out.push(part(cylX(0.0031, 0.0105, 14), m.parkDark, { p: [sx - 0.0052, ky, kz] }));
    // knob: turned, with a groove
    const knob = latheZ([[0, -0.0005], [0.0052, -0.0005], [0.0066, 0.0015], [0.0066, 0.0048], [0.0058, 0.0056], [0.0058, 0.0064], [0.0066, 0.0072], [0.0064, 0.0098], [0.0048, 0.0112], [0, 0.0115]], 24, 40);
    knob.rotateY(-Math.PI / 2); // +Z -> -X
    out.push(part(knob, m.parkDark, { p: [sx - 0.0098, ky, kz] }));
    // ejection port with the bolt face visible
    out.push(part(G.box(0.0006, 0.0158, 0.04), m.recess, { p: [sx, -0.0062, 0.513] }));
    out.push(part(G.box(0.0004, 0.0108, 0.005), m.bright, { p: [sx - 0.0002, -0.0062, 0.5305] }));
    const port = roundRect(0.513, -0.0062, 0.0436, 0.0194, 0.002, 3);
    const portIn = roundRect(0.513, -0.0062, 0.0404, 0.0162, 0.0014, 3);
    out.push(part(plateZY(port, 0.0009, [portIn], 0.0003), m.park, { p: [sx - 0.0003, 0, 0] }));
  }
  // left side: selector (front) and safety (rear) levers on bosses
  {
    const x = TD.rcvHW;
    const lever = (pz: number, py: number, angDeg: number, len: number) => {
      out.push(part(cylX(0.0054, 0.0016, 20), m.park, { p: [x + 0.0008, py, pz] }));
      const a = (angDeg * Math.PI) / 180;
      const tip = [pz + Math.cos(a) * len, py + Math.sin(a) * len];
      const nx = -Math.sin(a), ny = Math.cos(a);
      const w0 = 0.0042, w1 = 0.0032;
      const outl: V2[] = [
        [pz - nx * w0, py - ny * w0],
        [tip[0] - nx * w1, tip[1] - ny * w1],
        [tip[0] + Math.cos(a) * 0.004 - nx * 0.0005, tip[1] + Math.sin(a) * 0.004 - ny * 0.0005],
        [tip[0] + Math.cos(a) * 0.004 + nx * 0.0005, tip[1] + Math.sin(a) * 0.004 + ny * 0.0005],
        [tip[0] + nx * w1, tip[1] + ny * w1],
        [pz + nx * w0, py + ny * w0],
      ];
      out.push(part(plateZY(outl, 0.0017, [], 0.0005), m.parkDark, { p: [x + 0.0024, 0, 0] }));
      // thumb pad at the tip
      out.push(part(G.rbox(0.0022, 0.0062, 0.0062, 0.0012, 2), m.parkDark, { p: [x + 0.0034, tip[1] + Math.sin(a) * 0.002, tip[0] + Math.cos(a) * 0.002] }));
      out.push(part(cylX(0.0016, 0.0022, 10), m.bright, { p: [x + 0.0036, py, pz] }));
    };
    lever(0.404, -0.0145, 166, 0.026);
    lever(0.336, -0.0145, 172, 0.024);
  }

  // ---------------- frame, magazine well, trigger guard, trigger, catch, latch
  {
    const fsec = box2D(TD.frameHW, TD.frameBot, TD.rcvBot + 0.003, 0.001, 0.0035);
    out.push(part(extrudeZ(fsec, [], TD.frameRear, TD.frameFront, 0.0014, 4), m.park));
    // parting line between receiver and frame
    for (const sx of [1, -1]) out.push(part(G.box(0.0004, 0.0007, TD.frameFront - TD.frameRear - 0.004), m.recess, { p: [sx * (TD.frameHW + 0.0001), TD.rcvBot - 0.0004, (TD.frameRear + TD.frameFront) / 2] }));
    // magazine well housing
    const wz0 = TD.magZ0 - 0.0045, wz1 = TD.magZ1 + 0.0035;
    const wsec = box2D(TD.frameHW, -0.0445, TD.rcvBot + 0.002, 0.001, 0.0028);
    out.push(part(extrudeZ(wsec, [], wz0, wz1, 0.0012, 4), m.park));
    // magazine catch on the left of the frame behind the well
    out.push(part(G.rbox(0.0026, 0.0145, 0.0078, 0.001, 2), m.parkDark, { p: [TD.frameHW + 0.0011, -0.0355, wz0 - 0.0052] }));
    out.push(part(G.rbox(0.0034, 0.005, 0.0105, 0.0012, 2), m.parkDark, { p: [TD.frameHW + 0.0018, -0.0435, wz0 - 0.0062] }));
    // frame latch (rear, under the receiver)
    out.push(part(cylZ(0.0032, 0.004, 14), m.parkDark, { p: [0, TD.frameBot + 0.004, TD.frameRear + 0.0015] }));
    // trigger guard (loop under the frame)
    const P: [number, number][] = [
      [TD.guardFront, TD.frameBot + 0.0015],
      [TD.guardFront - 0.0012, -0.0548],
      [TD.guardFront - 0.0072, -0.0645],
      [TD.guardFront - 0.018, -0.0702],
      [TD.guardFront - 0.035, -0.0722],
      [TD.guardRear + 0.024, -0.0718],
      [TD.guardRear + 0.0085, -0.0665],
      [TD.guardRear + 0.0015, -0.0572],
      [TD.guardRear, TD.frameBot + 0.0015],
    ];
    const pts = P.map(([z, y]) => V(0, y, z));
    const c = V(0, -0.046, (TD.guardRear + TD.guardFront) / 2);
    out.push(part(G.strap(pts, 0.0094, 0.0032, pts.map((p) => p.clone().sub(c).setX(0).normalize()), { samples: 60 }), m.park));
    // trigger
    const tz = TD.triggerZ;
    const tp = [V(0, TD.frameBot + 0.001, tz + 0.004), V(0, -0.0515, tz + 0.0012), V(0, -0.0572, tz - 0.0005), V(0, -0.0628, tz - 0.0006), V(0, -0.0668, tz + 0.0008)];
    out.push(part(G.strap(tp, 0.0062, 0.0034, V(0, 0, 1), { samples: 30 }), m.parkDark));
  }

  // ---------------- pistol grip (walnut), raked, with the grip screw in its base
  {
    const top = V(...GRIP.top), down = V(...GRIP.down), fwd = V(...GRIP.fwd);
    const secs: [number, number, number, number][] = [
      // w (down the axis), half width, half depth, fore/aft offset
      [-0.004, 0.0132, 0.0205, 0.0008],
      [0.0, 0.0138, 0.021, 0.0008],
      [0.012, 0.0148, 0.0216, 0.0004],
      [0.035, 0.0155, 0.0222, 0.0],
      [0.06, 0.0158, 0.0226, -0.0004],
      [0.08, 0.0156, 0.0226, -0.0006],
      [0.092, 0.0151, 0.0222, -0.0006],
      [0.098, 0.0144, 0.0214, -0.0006],
      [0.1, 0.0134, 0.0202, -0.0006],
    ];
    const lf = G.loftZ(
      secs.map(([w, a, b, dv]) => ({ z: w, ring: G.superRing(a, b, 40, 2.4), dy: dv })),
      true,
      50,
    );
    // loft axis (Z) -> down the grip, ring x -> X, ring y -> fwd: (X, fwd, down) is right-handed
    lf.applyMatrix4(basis(V(1, 0, 0), fwd, down, top));
    out.push(part(lf, m.walnut));
    // grip screw + washer in the base
    const bp = top.clone().addScaledVector(down, TD.gripLen + 0.0002);
    out.push(part(placeAlong(G.lathe([[0, 0], [0.0062, 0], [0.0062, 0.0008], [0, 0.0008]], 20, 50), bp, down), m.park));
    screw(bp.clone().addScaledVector(down, 0.0007), down, 30, 1.05);
  }

  // ---------------- barrel, crown, bore, front sight
  {
    const prof: V2[] = [[0, TD.breechZ], ...TBARREL.map(([z, r]) => [r, z] as V2), [0.0098, TD.muzzleZ + 0.0004], [0.0056, TD.muzzleZ + 0.0004], [0.0059, TD.muzzleZ - 0.0012], [0.0059, TD.muzzleZ - 0.02], [0, TD.muzzleZ - 0.02]];
    out.push(part(latheZ(prof, hi ? 40 : 24, 30), m.park));
    out.push(part(cylZ(0.0058, 0.0006, 18), m.recess, { p: [0, 0, TD.muzzleZ - 0.0194] }));
    const fz = TD.frontSightZ;
    out.push(part(latheZ([[0.0106, fz - 0.009], [0.0119, fz - 0.0084], [0.0121, fz - 0.007], [0.0121, fz + 0.007], [0.0119, fz + 0.0084], [0.0106, fz + 0.009]], 36, 35), m.park));
    const base: V2[] = [[fz - 0.0085, 0.0108], [fz + 0.0085, 0.0108], [fz + 0.0072, 0.0152], [fz - 0.0072, 0.0152]];
    out.push(part(plateZY(base, 0.0072, [], 0.0007), m.park));
    const blade: V2[] = [[fz - 0.0062, 0.015], [fz + 0.0062, 0.015], [fz + 0.0034, 0.0305], [fz + 0.0012, TD.sightY], [fz - 0.0012, TD.sightY], [fz - 0.0028, 0.0305]];
    out.push(part(plateZY(blade, 0.0024, [], 0.0003), m.park));
    // pin through the sight base
    for (const sx of [1, -1]) out.push(part(cylX(0.0011, 0.0006, 8), m.bright, { p: [sx * 0.0037, 0.0132, fz] }));
  }

  // ---------------- horizontal fore-grip (walnut) with the fore-grip screw and front swivel
  {
    const zs = stations(TD.fgRear, TD.fgFront, (z) => (z < 0.59 || z > 0.7 ? 0.004 : 0.02));
    out.push(part(TFORE.loft(zs, 56, 50), m.walnut));
    screw(V(0, TFORE.at(0.592).yBot - 0.0006, 0.592), V(0, -1, 0), 90, 1.1);
    // front swivel: base plate, lug, pin, loop
    const s = TSWIVELS.front;
    const yb = TFORE.at(s.pin.z).yBot;
    out.push(part(TFORE.shell(s.pin.z - 0.014, s.pin.z + 0.009, () => (3 * Math.PI) / 2 - 0.34, () => (3 * Math.PI) / 2 + 0.34, 0.0016, 0.0004, 6, 6), m.park));
    const lug: V2[] = [[s.pin.z - 0.006, yb + 0.001], [s.pin.z + 0.006, yb + 0.001], [s.pin.z + 0.004, yb - 0.0084], [s.pin.z - 0.004, yb - 0.0084]];
    out.push(part(plateZY(lug, 0.0074, [], 0.0007), m.park));
  }

  // ---------------- butt stock (walnut), butt plate, stock mounting plate, rear swivel base
  {
    const zs = stations(TSTOCK.z0, TSTOCK.z1, (z) => (z > 0.2 ? 0.006 : z < 0.03 ? 0.008 : 0.016));
    out.push(part(TSTOCK.loft(zs, 64, 50), m.walnut));
    // mounting plate on the front end of the stock (against the receiver / frame)
    const z1 = TSTOCK.z1;
    out.push(part(extrudeZ(TSTOCK.ringAt(z1, 64, 0.0009), [], z1 - 0.004, z1 + 0.0002, 0.0006), m.parkDark));
    // butt plate: rim + face + two screws
    const bz = TSTOCK.z0;
    const rim = G.loftZ(
      [
        { z: bz + 0.004, ring: TSTOCK.ringAt(bz + 0.004, 64, 0.0002) },
        { z: bz + 0.0032, ring: TSTOCK.ringAt(bz + 0.0032, 64, 0.001) },
        { z: bz - 0.0008, ring: TSTOCK.ringAt(bz, 64, 0.0011) },
        { z: bz - 0.0028, ring: TSTOCK.ringAt(bz, 64, 0.0002) },
        { z: bz - 0.0036, ring: TSTOCK.ringAt(bz, 64, -0.0016) },
      ],
      true,
      45,
    );
    out.push(part(rim, m.park));
    const [h, sl] = screwParts(0.0035, 0.0011, 0);
    const s0 = TSTOCK.at(bz);
    for (const [f, spin] of [[0.22, 20], [0.8, 75]] as const) {
      const p = V(0, s0.yTop + (s0.yBot - s0.yTop) * f, bz - 0.0035);
      out.push(part(placeAlong(h, p, V(0, 0, -1)), m.park), part(placeAlong(sl, p, V(0, 0, -1), spin), m.recess));
    }
    // rear swivel: base plate + lug
    const s = TSWIVELS.rear;
    out.push(part(TSTOCK.shell(s.pin.z - 0.012, s.pin.z + 0.02, () => (3 * Math.PI) / 2 - 0.3, () => (3 * Math.PI) / 2 + 0.3, 0.0017, 0.0004, 6, 6), m.park));
    const yb = TSTOCK.at(s.pin.z).yBot;
    const lug: V2[] = [[s.pin.z - 0.0055, yb + 0.002], [s.pin.z + 0.0065, yb + 0.004], [s.pin.z + 0.004, yb - 0.0092], [s.pin.z - 0.004, yb - 0.0092]];
    out.push(part(plateZY(lug, 0.0074, [], 0.0007), m.park));
    for (const [dz, spin] of [[-0.008, 30], [0.015, 80]] as const) {
      const zz = s.pin.z + dz;
      const p = V(0, TSTOCK.at(zz).yBot - 0.0016, zz);
      screw(p, V(0, -1, 0), spin, 0.8);
    }
  }

  // ---------------- sling swivel pins and loops
  for (const s of [TSWIVELS.front, TSWIVELS.rear]) {
    out.push(part(cylX(0.0016, 0.0098, 10), m.blued, { p: s.pin.toArray() as [number, number, number] }));
    for (const sx of [1, -1]) out.push(part(cylX(0.0025, 0.0008, 12), m.blued, { p: [sx * 0.0051, s.pin.y, s.pin.z] }));
    out.push(swivelLoop(s.pin, s.dir, TSWIVELS.innerW, s.reach, TSWIVELS.wire, m.park).mesh);
  }

  // ---------------- rear sight: base plate riveted to the receiver, peep leaf, protective wings
  {
    const rz = TD.rearSightZ, y0 = TD.rcvTop + 0.0006;
    out.push(part(G.rbox(0.0172, 0.0022, 0.03, 0.0008, 2), m.park, { p: [0, y0 + 0.0011, rz] }));
    for (const dz of [-0.011, 0.011]) out.push(part(new THREE.SphereGeometry(0.0019, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), m.park, { p: [0, y0 + 0.0022, rz + dz], s: [1, 0.5, 1] }));
    // peep leaf with the aperture on the line of sight
    const leaf: V2[] = [[0.0056, y0 + 0.002]];
    for (let i = 0; i <= 12; i++) {
      const a = (Math.PI * i) / 12;
      leaf.push([0.0056 * Math.cos(a), TD.sightY + 0.0012 + 0.0044 * Math.sin(a)]);
    }
    leaf.push([-0.0056, y0 + 0.002]);
    const leafG = extrudeZ(leaf, [circle2D(0.001, 14, 0, TD.sightY)], rz - 0.0011, rz + 0.0011, 0.0003, 4);
    out.push(part(leafG, m.park));
    // triangular protective wings on both sides
    const wing: V2[] = [[rz - 0.0115, y0 + 0.002], [rz + 0.0085, y0 + 0.002], [rz + 0.003, TD.sightY + 0.0052], [rz - 0.0008, TD.sightY + 0.0056]];
    for (const sx of [1, -1]) out.push(part(plateZY(wing, 0.0019, [], 0.0005), m.park, { p: [sx * 0.0078, 0, 0] }));
  }

  // ---------------- magazine (stamped steel, blued) + floor plate
  if (mag !== 'none') {
    const yb = magBottom(mag);
    const h = TD.magTop - yb;
    const sec = roundRect(0, (TD.magZ0 + TD.magZ1) / 2, 0.0238, TD.magZ1 - TD.magZ0, 0.0032, 4);
    out.push(part(plateXZ(sec, h, [], 0.0008), m.mag, { p: [0, (TD.magTop + yb) / 2, 0] }));
    // floor plate
    const fp = roundRect(0, (TD.magZ0 + TD.magZ1) / 2 - 0.0008, 0.0262, TD.magZ1 - TD.magZ0 + 0.004, 0.0036, 4);
    out.push(part(plateXZ(fp, 0.0034, [], 0.0012), m.mag, { p: [0, yb - 0.0012, 0] }));
    // pressed stiffening ribs on both sides, and the catch slot on the left
    for (const sx of [1, -1]) {
      out.push(part(G.rbox(0.0008, h - 0.05, 0.0046, 0.0004, 1), m.mag, { p: [sx * 0.0121, (TD.magTop + yb) / 2 - 0.012, (TD.magZ0 + TD.magZ1) / 2] }));
    }
    out.push(part(G.box(0.0006, 0.0052, 0.0052), m.recess, { p: [0.0121, -0.0495, TD.magZ0 + 0.006] }));
  }
  return out;
}

/** Group helper. */
export const thompsonGroup = (m: ThompsonMats, mag: ThompsonMagazine, detail: 'high' | 'low' = 'high') => group(buildThompsonParts(m, mag, detail));

/** Stock cross-section at z (T-frame), for display cradles. */
export const stockRing = (z: number) => Profile.ring(TSTOCK.at(z), 72);
export const foreRing = (z: number) => Profile.ring(TFORE.at(z), 72);
