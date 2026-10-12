/**
 * M1 Garand metalwork (G-frame, see dims.ts):
 *  barrel with crowned muzzle; receiver (front ring, open well with the closed bolt, heel carrying the
 *  rear sight with elevation knob on the left and windage knob on the right, clip latch on the left);
 *  operating rod (dog-leg under the right edge of the rear handguard, rear section along the right
 *  of the receiver, serrated handle); spline-type gas cylinder with the front sight between protective
 *  ears, gas cylinder lock and lock screw, bayonet lug and stacking swivel; lower band with its pin;
 *  trigger housing floor, long trigger guard, trigger and the safety at the front of the guard;
 *  front (stock ferrule) and rear (butt) sling swivels.
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V, latheZ, cylX, cylZ, extrudeZ, plateZY, plateXZ, roundRect, circle2D, screwParts, placeAlong, knurledKnob, stadium, type V2 } from '../common/geo';
import { swivelLoop, circlesUnion, growOutline } from '../common/parts';
import { GD, STOCK, FHG, BARREL_R, OPROD } from './dims';
import type { GarandMats } from './materials';

/** Swivel geometry shared with the sling builder. */
export const SWIVELS = {
  front: { pin: V(0, STOCK.at(GD.frontSwivelZ).yBot - 0.0062, GD.frontSwivelZ), dir: V(0, -0.16, -0.99).normalize(), reach: 0.0215 },
  rear: { pin: V(0, STOCK.at(GD.rearSwivelZ).yBot - 0.0078, GD.rearSwivelZ), dir: V(0, -0.06, 1).normalize(), reach: 0.0215 },
  innerW: 0.0335,
  wire: 0.0021,
};

export const swivelBar = (s: { pin: THREE.Vector3; dir: THREE.Vector3; reach: number }) => s.pin.clone().addScaledVector(s.dir, s.reach);

/** Gas cylinder outline (upper sleeve round the barrel + lower piston tube). */
export const gasOutline = (grow = 0) => circlesUnion([[0, 0, 0.0121 + grow], [0, GD.gcTubeY, 0.0101 + grow]], 0, -0.009, 56, 0.005);

export function buildMetal(m: GarandMats, detail: 'high' | 'low' = 'high'): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const hi = detail === 'high';
  const seg = hi ? 40 : 24;
  const [scHead, scSlot] = screwParts(0.0032, 0.0012, 25);
  const screw = (p: THREE.Vector3, n: THREE.Vector3, spin = 25, s = 1, mat = m.park) => {
    const h = scHead.clone().scale(s, s, s), sl = scSlot.clone().scale(s, s, s);
    out.push(part(placeAlong(h, p, n), mat), part(placeAlong(sl, p, n, spin), m.recess));
  };

  // ---------------- barrel (mostly under the wood), crowned muzzle and bore
  out.push(
    part(
      latheZ(
        [
          [0, -0.004],
          ...BARREL_R.map(([z, r]) => [r, z] as V2),
          [0.0074, GD.muzzleZ - 0.0002],
          [0.0062, GD.muzzleZ],
          [0.0042, GD.muzzleZ - 0.0008],
          [0.00385, GD.muzzleZ - 0.0028],
          [0.00385, GD.muzzleZ - 0.02],
          [0, GD.muzzleZ - 0.02],
        ],
        seg,
        30,
      ),
      m.park,
    ),
  );
  out.push(part(cylZ(0.0038, 0.0006, 16), m.recess, { p: [0, 0, GD.muzzleZ - 0.0194] }));

  // ---------------- receiver
  // front ring
  out.push(part(latheZ([[0, GD.ringRear], [GD.ringR - 0.0006, GD.ringRear], [GD.ringR, GD.ringRear + 0.0008], [GD.ringR, GD.ringFront - 0.001], [GD.ringR - 0.0009, GD.ringFront], [0.0152, GD.ringFront]], 48, 35), m.park));
  // side walls of the well (left full height, right lower - the op rod rides outside it)
  {
    const wall = (x0: number, x1: number, yTop: number): V2[] => roundRect((x0 + x1) / 2, (yTop - 0.013) / 2, Math.abs(x1 - x0), yTop + 0.013, 0.0016, 3);
    out.push(part(extrudeZ(wall(0.0118, GD.rcvHW - 0.0004, GD.wallTop), [], GD.heelFront - 0.002, GD.ringRear + 0.001, 0.0007), m.park));
    out.push(part(extrudeZ(wall(-GD.rcvHW + 0.0004, -0.0118, 0.0028), [], GD.heelFront - 0.002, GD.ringRear + 0.001, 0.0007), m.park));
    // shoulder where the walls run into the ring
    for (const sx of [1, -1]) out.push(part(G.rbox(0.0056, 0.012, 0.006, 0.0018, 2), m.park, { p: [sx * 0.0142, -0.0035, GD.ringRear + 0.001] }));
    // floor of the well under the bolt (top of the magazine / follower seen dark)
    out.push(part(G.box(0.0226, 0.004, GD.ringRear - GD.heelFront), m.recess, { p: [0, -0.0118, (GD.ringRear + GD.heelFront) / 2] }));
    // bolt-guide rails along the inside of the walls
    for (const sx of [1, -1]) out.push(part(G.rbox(0.0016, 0.0026, GD.ringRear - GD.heelFront - 0.004, 0.0006, 1), m.park, { p: [sx * 0.0104, -0.0052, (GD.ringRear + GD.heelFront) / 2] }));
  }
  // heel (rear of the receiver) carrying the rear sight: rounded side profile
  {
    const hf = GD.heelFront, hr = GD.heelRear, top = GD.rcvTop;
    const prof: V2[] = [
      [hf, -0.013],
      [hf, top - 0.0048],
      [hf - 0.0012, top - 0.0016],
      [hf - 0.0042, top],
      [hr + 0.009, top],
      [hr + 0.0042, top - 0.0012],
      [hr + 0.0012, top - 0.0042],
      [hr, top - 0.0085],
      [hr, -0.013],
    ];
    out.push(part(plateZY(prof, 2 * GD.rcvHW, [], 0.0019), m.park));
    // rear sight base boss on top
    out.push(part(G.rbox(0.0186, 0.003, 0.028, 0.001, 2), m.park, { p: [0, GD.rcvTop + 0.001, -0.1418] }));
  }
  // clip latch (left side, rear of the well)
  out.push(part(G.rbox(0.0032, 0.0062, 0.0092, 0.0012, 2), m.parkDark, { p: [GD.rcvHW + 0.0012, -0.0032, GD.heelFront + 0.0055] }));
  for (let i = 0; i < 3; i++) out.push(part(G.box(0.0006, 0.0048, 0.0006), m.parkDark, { p: [GD.rcvHW + 0.003, -0.0032, GD.heelFront + 0.0028 + i * 0.0026] }));

  // ---------------- bolt (closed), with the operating roller on the right and the extractor
  {
    const prof: V2[] = [[0, -0.1005], [0.0058, -0.1005], [0.0086, -0.0985], [0.0091, -0.0955], [0.0091, -0.004], [0.0087, -0.0012], [0, -0.0012]];
    out.push(part(latheZ(prof, 32, 35), m.parkDark));
    // flat top rib and the firing-pin tail
    out.push(part(G.rbox(0.0048, 0.0018, 0.07, 0.0006, 1), m.parkDark, { p: [0, 0.0088, -0.052] }));
    out.push(part(latheZ([[0, -0.1045], [0.0024, -0.1045], [0.0026, -0.103], [0.0026, -0.1], [0, -0.1]], 14, 35), m.bright));
    // operating lug + roller (right side)
    out.push(part(G.rbox(0.004, 0.006, 0.01, 0.0012, 2), m.parkDark, { p: [-0.0102, 0.0034, -0.0805] }));
    out.push(part(cylX(0.0031, 0.0042, 16), m.bright, { p: [-0.0133, 0.0034, -0.0805] }));
    // extractor (right front)
    out.push(part(G.rbox(0.0024, 0.0042, 0.024, 0.0008, 1), m.parkDark, { p: [-0.0085, 0.0028, -0.015] }));
  }

  // ---------------- operating rod: front rod (mostly hidden) + rear section + handle
  {
    const pts = OPROD.path.map(([x, y, z]) => V(x, y, z));
    out.push(part(G.tube(pts, OPROD.rodR, 14, 110), m.park));
    // dark channel behind the rod in the slot between rear handguard and stock
    out.push(part(G.box(0.0012, 0.0064, 0.226), m.recess, { p: [-0.0128, -0.0008, 0.162] }));
    const r = OPROD.rear;
    // rear section: flat bar with the cam hump at its rear end (side view outline)
    const bar: V2[] = [
      [r.z1, r.y - r.h / 2],
      [r.z1, r.y + r.h / 2 - 0.001],
      [r.z1 - 0.004, r.y + r.h / 2],
      [r.z0 + 0.024, r.y + r.h / 2],
      [r.z0 + 0.018, r.y + r.h / 2 + 0.0022],
      [r.z0 + 0.006, r.y + r.h / 2 + 0.0022],
      [r.z0, r.y + r.h / 2 - 0.001],
      [r.z0, r.y - r.h / 2 + 0.001],
      [r.z0 + 0.003, r.y - r.h / 2],
    ];
    out.push(part(plateZY(bar, r.t, [], 0.0007), m.park, { p: [r.x, 0, 0] }));
    // handle: hooked block protruding to the right, serrated rear face
    const hz = OPROD.handleZ;
    const top: V2[] = [
      [-0.0212, hz - 0.0095],
      [-0.0312, hz - 0.0078],
      [-0.0356, hz - 0.0052],
      [-0.0366, hz - 0.001],
      [-0.0362, hz + 0.0062],
      [-0.0338, hz + 0.0092],
      [-0.0212, hz + 0.0102],
    ];
    out.push(part(plateXZ(top, 0.0112, [], 0.0012), m.park, { p: [0, r.y + 0.0004, 0] }));
    // serrations across the rear (pulling) face
    const faceZ = (x: number) => {
      for (let i = 1; i < 4; i++) {
        const [x0, z0] = top[i - 1], [x1, z1] = top[i];
        if (x <= x0 && x >= x1) return z0 + ((z1 - z0) * (x - x0)) / (x1 - x0);
      }
      return top[3][1];
    };
    for (let i = 0; i < 7; i++) {
      const x = -0.0238 - i * 0.0017;
      out.push(part(G.rbox(0.0008, 0.0094, 0.0012, 0.0002, 1), m.park, { p: [x, r.y + 0.0004, faceZ(x) - 0.0001] }));
    }
  }

  // ---------------- gas cylinder (spline type) with front sight seat, bayonet lug, stacking swivel
  {
    const outl = gasOutline();
    const barrelHole = circle2D(0.0081, 28);
    const zg0 = GD.gcRear, zg1 = GD.gcFront;
    out.push(part(extrudeZ(outl, [barrelHole], zg0, zg1, 0.0009, 4), m.parkDark));
    // flat rear ring (slightly larger lip)
    out.push(part(extrudeZ(growOutline(outl, 0.0005), [barrelHole], zg0, zg0 + 0.004, 0.0005, 4), m.parkDark));
    // front sight seat (dovetail block) on top
    out.push(part(G.rbox(0.0104, 0.0078, 0.0325, 0.0014, 2), m.parkDark, { p: [0, 0.0128, 0.5812] }));
    // front sight: base, blade, protective ears
    const fz = GD.frontSightZ;
    out.push(part(G.rbox(0.0142, 0.0024, 0.0182, 0.0007, 2), m.park, { p: [0, 0.0176, fz] }));
    const blade: V2[] = [[fz - 0.0042, 0.0184], [fz + 0.0042, 0.0184], [fz + 0.0036, 0.0232], [fz + 0.0011, 0.0265], [fz - 0.0011, 0.0265], [fz - 0.0036, 0.0232]];
    out.push(part(plateZY(blade, 0.0021, [], 0.0003), m.park));
    const ear: V2[] = [[fz - 0.0085, 0.0184], [fz + 0.0085, 0.0184], [fz + 0.0078, 0.0246], [fz + 0.0046, 0.0276], [fz - 0.0046, 0.0276], [fz - 0.0078, 0.0246]];
    for (const sx of [1, -1]) out.push(part(plateZY(ear, 0.0019, [], 0.0005), m.park, { p: [sx * 0.0061, 0, 0] }));
    // front sight screw entering from the front (sealed)
    screw(V(0, 0.0128, 0.5982), V(0, 0, 1), 0, 0.72, m.parkDark);
    // bayonet lug under the rear of the piston tube ("football" profile)
    const lug: V2[] = [[0.4905, -0.0262], [0.5125, -0.0262], [0.5155, -0.0295], [0.5135, -0.0334], [0.5025, -0.0346], [0.4925, -0.0322], [0.4905, -0.0292]];
    out.push(part(plateZY(lug, 0.0064, [], 0.0007), m.parkDark));
    // stacking swivel base lug + screw + swivel
    const sz = GD.stackSwivelZ;
    const base: V2[] = [[sz - 0.0072, -0.0268], [sz + 0.0072, -0.0268], [sz + 0.0058, -0.0328], [sz + 0.003, -0.0346], [sz - 0.003, -0.0346], [sz - 0.0058, -0.0328]];
    out.push(part(plateZY(base, 0.0062, [], 0.0006), m.parkDark));
    const pin = V(0, -0.0318, sz);
    out.push(part(cylX(0.0014, 0.0126, 10), m.blued, { p: pin.toArray() as [number, number, number] }));
    screw(V(0.0063, -0.0318, sz), V(1, 0, 0), 60, 0.62, m.blued);
    const sw = swivelLoop(pin, V(0, -0.86, 0.5), 0.0112, 0.0178, 0.0016, m.park, 0.0068);
    out.push(sw.mesh);
    // gas cylinder lock (threaded on the muzzle) with its lower ear, and the slotted lock screw
    const lockOutl = circlesUnion([[0, 0, 0.0113], [0, GD.gcTubeY, 0.0086]], 0, -0.009, 56, 0.004);
    out.push(part(extrudeZ(lockOutl, [circle2D(0.0079, 28)], zg1 + 0.0003, GD.gcLockFront, 0.0006, 4), m.park));
    const ly = GD.gcTubeY;
    out.push(part(latheZ([[0, GD.gcLockFront - 0.001], [0.0071, GD.gcLockFront - 0.001], [0.0073, GD.gcLockFront + 0.0012], [0.0066, GD.gcLockFront + 0.0028], [0, GD.gcLockFront + 0.0028]], 28, 35), m.park, { p: [0, ly, 0] }));
    out.push(part(G.box(0.0126, 0.0016, 0.0016), m.recess, { p: [0, ly, GD.gcLockFront + 0.0024] }));
    out.push(part(cylZ(0.0021, 0.0008, 14), m.recess, { p: [0, ly, GD.gcLockFront + 0.0027] }));
  }

  // ---------------- lower band (pinned to the barrel) between the handguards
  {
    const z0 = GD.lowerBandRear, z1 = GD.lowerBandFront;
    const ring = FHG.ringAt(z1, 48, 0.0009);
    out.push(part(extrudeZ(ring, [], z0, z1, 0.0006, 4), m.park));
    for (const sx of [1, -1]) {
      const hx = FHG.sideX(z1, -0.002) + 0.0009;
      out.push(part(cylX(0.0019, 0.0008, 12), m.park, { p: [sx * (hx + 0.0003), -0.002, (z0 + z1) / 2] }));
    }
  }

  // ---------------- trigger group: housing floor, trigger guard, trigger, safety
  {
    const yb = -0.0662;
    out.push(part(G.rbox(0.0172, 0.0026, GD.guardFront - GD.guardRear + 0.004, 0.0009, 2), m.park, { p: [0, yb - 0.0006, (GD.guardFront + GD.guardRear) / 2] }));
    // guard: long bow from the front (safety) to the rear latch
    const P: [number, number][] = [
      [-0.0995, -0.0665],
      [-0.1012, -0.0735],
      [-0.1062, -0.0818],
      [-0.1148, -0.0875],
      [-0.1275, -0.0898],
      [-0.165, -0.0902],
      [-0.1855, -0.0892],
      [-0.1995, -0.0858],
      [-0.2085, -0.0798],
      [-0.2128, -0.0732],
      [-0.2138, -0.0682],
    ];
    const pts = P.map(([z, y]) => V(0, y, z));
    const c = V(0, -0.066, -0.157);
    const nrm = pts.map((p) => p.clone().sub(c).setX(0).normalize());
    out.push(part(G.strap(pts, 0.0118, 0.0034, nrm, { samples: 70 }), m.park));
    // rear latch lip of the guard
    out.push(part(G.rbox(0.0118, 0.0042, 0.0085, 0.0012, 2), m.park, { p: [0, -0.0694, -0.2165] }));
    // trigger (curved blade, face at GD.triggerZ)
    const tp = [V(0, -0.0655, -0.1612), V(0, -0.0712, -0.1628), V(0, -0.0772, -0.1655), V(0, -0.0822, -0.1692), V(0, -0.0848, -0.1735)];
    out.push(part(G.strap(tp, 0.0058, 0.0036, V(0, 0, 1), { samples: 30 }), m.park));
    // safety: flat tab with a hole at the front inside the guard
    const saf: V2[] = [[-0.1118, -0.0662], [-0.1032, -0.0662], [-0.1032, -0.0752], [-0.1052, -0.0782], [-0.1098, -0.0782], [-0.1118, -0.0752]];
    out.push(part(plateZY(saf, 0.0082, [circle2D(0.0014, 12, -0.1075, -0.0728)], 0.0005), m.parkDark));
  }

  // ---------------- sling swivels (fixed at the angle the strap pulls them)
  for (const s of [SWIVELS.front, SWIVELS.rear]) {
    out.push(part(cylX(0.0017, 0.0098, 10), m.blued, { p: s.pin.toArray() as [number, number, number] }));
    for (const sx of [1, -1]) out.push(part(cylX(0.0026, 0.0009, 12), m.blued, { p: [sx * 0.0052, s.pin.y, s.pin.z] }));
    out.push(swivelLoop(s.pin, s.dir, SWIVELS.innerW, s.reach, SWIVELS.wire, m.park).mesh);
  }
  // lug of the butt swivel plate
  {
    const z = GD.rearSwivelZ;
    const yb = STOCK.at(z).yBot;
    const lug: V2[] = [[z - 0.007, yb + 0.001], [z + 0.007, yb + 0.001], [z + 0.0045, yb - 0.0098], [z - 0.0045, yb - 0.0098]];
    out.push(part(plateZY(lug, 0.0078, [], 0.0008), m.park));
  }
  return out;
}

/** Rear sight: cover with protective ears, aperture disc, elevation (left) and windage (right) knobs. */
export function buildRearSight(m: GarandMats, detail: 'high' | 'low' = 'high'): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const az = GD.apertureZ;
  const y0 = GD.rcvTop + 0.0024;
  // cover: low hump behind the aperture (stays below the line of sight)
  const hump: V2[] = [[-0.1555, y0], [-0.1555, y0 + 0.0022], [-0.152, y0 + 0.0052], [-0.1465, y0 + 0.0068], [az - 0.0032, y0 + 0.0072], [az - 0.0032, y0]];
  out.push(part(plateZY(hump, 0.0138, [], 0.0012), m.park));
  // protective ears flanking the aperture: rounded wings rising from the rear towards the aperture
  const ear: V2[] = [[az - 0.0232, y0]];
  for (let i = 0; i <= 10; i++) {
    const a = (Math.PI / 2) * (i / 10);
    ear.push([az - 0.004 - 0.0192 * Math.cos(a), y0 + 0.0176 * Math.sin(a)]);
  }
  ear.push([az - 0.0008, y0 + 0.0172], [az + 0.0014, y0 + 0.0142], [az + 0.0014, y0]);
  for (const sx of [1, -1]) out.push(part(plateZY(ear, 0.0026, [], 0.0007), m.park, { p: [sx * 0.0078, 0, 0] }));
  // aperture disc (sliding in the cover) with the peep hole on the line of sight
  const ay = GD.sightY;
  const disc: V2[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (Math.PI * i) / 16;
    disc.push([0.0056 * Math.cos(a), ay + 0.0056 * Math.sin(a)]);
  }
  disc.push([-0.0056, y0 + 0.002], [0.0056, y0 + 0.002]);
  out.push(part(extrudeZ(disc, [circle2D(0.0009, 14, 0, ay)], az - 0.0008, az + 0.0008, 0.0003, 6), m.parkDark));
  // knob axle boss through the heel and the two knobs
  const ky = 0.0048, kz = -0.1372;
  const elev = knurledKnob(0.0102, 0.0052, detail === 'high' ? 30 : 18, 0.00045, 0.0006);
  elev.rotateZ(-Math.PI / 2);
  out.push(part(elev, m.park, { p: [GD.rcvHW + 0.0004, ky, kz] }));
  // elevation index ring and the knob screw
  out.push(part(cylX(0.0062, 0.0012, 24), m.parkDark, { p: [GD.rcvHW + 0.0062, ky, kz] }));
  const [h, sl] = screwParts(0.0034, 0.0011, 40);
  out.push(part(placeAlong(h, V(GD.rcvHW + 0.0068, ky, kz), V(1, 0, 0)), m.park), part(placeAlong(sl, V(GD.rcvHW + 0.0068, ky, kz), V(1, 0, 0), 40), m.recess));
  const wind = knurledKnob(0.0077, 0.0046, detail === 'high' ? 24 : 14, 0.0004, 0.0005);
  wind.rotateZ(Math.PI / 2);
  out.push(part(wind, m.park, { p: [-GD.rcvHW - 0.0004, ky, kz] }));
  // windage nut (hex) on the knob
  const nut = new THREE.CylinderGeometry(0.0036, 0.0036, 0.0022, 6);
  nut.rotateZ(Math.PI / 2);
  out.push(part(nut, m.parkDark, { p: [-GD.rcvHW - 0.0061, ky, kz] }));
  // graduation marks on the elevation knob face rim (fine raised lines)
  if (detail === 'high') {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      out.push(part(G.box(0.0004, 0.0003, 0.0022), m.bright, { p: [GD.rcvHW + 0.0058, ky + Math.sin(a) * 0.0082, kz + Math.cos(a) * 0.0082], r: [(-a * 180) / Math.PI, 0, 0] }));
    }
  }
  return group(out, { name: 'm1-rear-sight' });
}

/** Stadium helper re-export for the model file (sling slot shapes). */
export const slot2D = stadium;
