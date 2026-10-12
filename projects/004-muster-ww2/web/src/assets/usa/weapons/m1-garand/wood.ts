/**
 * M1 Garand woodwork and the fittings seated on it (G-frame, see dims.ts):
 *  - one-piece walnut stock (semi-pistol grip, straight comb, flat inletting shelf under the receiver),
 *  - rear (thin) handguard over the barrel with its steel clip and band; the right edge stands higher
 *    than the stock so the operating rod shows in the slot between them,
 *  - front (thick) handguard round barrel and operating rod, with its front ferrule,
 *  - checkered steel butt plate with the hinged trap door (cleaning-kit compartment) and two screws,
 *  - stock ferrule (end cap of the fore-end) and the base plate of the butt swivel.
 */
import { THREE, G, part } from '../../../../core/kit';
import { Profile, V, stations, extrudeZ, plateZY, roundRect, screwParts, placeAlong, cylX, type V2 } from '../common/geo';
import { GD, STOCK, FHG, RHG } from './dims';
import type { GarandMats } from './materials';

/** Rear handguard ring at z (crescent over the barrel, asymmetric bottom edges). Fixed count. */
export function rhgRing(z: number, grow = 0, n = 34): V2[] {
  const s = STOCK.at(z);
  const hw = s.hw - 0.0006 + grow;
  const crown = RHG.crown(z) + grow;
  const yL = RHG.yLeft - grow, yR = RHG.yRight - grow;
  const e = RHG.eTop;
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI;
    const c = Math.cos(t), sn = Math.sin(t);
    const yb = yL + (yR - yL) * (i / n);
    pts.push([hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / e), yb + (crown - yb) * Math.pow(sn, 2 / e)]);
  }
  // underside: slants in from the right edge (the op-rod slot), flat on the stock shelf
  pts.push([-hw + 0.0035, yR - 0.0012], [-0.004, -0.0062], [0.004, -0.0062], [hw - 0.0025, yL - 0.0009]);
  return pts;
}

export function buildWood(m: GarandMats): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // ---------------- stock
  const st = stations(STOCK.z0, GD.stockFront, (z) => {
    if (z < -0.45) return 0.012;
    if (z < -0.16) return 0.006;
    if (z < -0.02) return 0.02;
    if (z < 0.1) return 0.008;
    return 0.022;
  });
  out.push(part(STOCK.loft(st, 80, 50), m.walnut));

  // ---------------- rear handguard (thin), from the receiver ring to the lower band
  {
    const zs = stations(GD.rhgRear, GD.rhgFront, () => 0.012);
    const secs = zs.map((z) => ({ z, ring: rhgRing(z) }));
    // chamfered rear and front ends
    secs[0] = { z: GD.rhgRear, ring: rhgRing(GD.rhgRear, -0.0012) };
    secs.splice(1, 0, { z: GD.rhgRear + 0.0014, ring: rhgRing(GD.rhgRear + 0.0014) });
    secs[secs.length - 1] = { z: GD.rhgFront, ring: rhgRing(GD.rhgFront, -0.001) };
    secs.splice(secs.length - 1, 0, { z: GD.rhgFront - 0.0012, ring: rhgRing(GD.rhgFront - 0.0012) });
    out.push(part(G.loftZ(secs, true, 50), m.walnutHg));
    // steel clip at the rear end (hooks over the barrel at the receiver ring)
    const clipRing = (z: number, g: number) => rhgRing(z, g).slice(0, 35);
    const clip: { z: number; ring: V2[] }[] = [];
    for (const [z, g] of [[GD.rhgRear + 0.0005, 0.0002], [GD.rhgRear + 0.001, 0.0009], [GD.rhgRear + 0.0062, 0.0009], [GD.rhgRear + 0.0068, 0.0002]] as const) {
      const outer = clipRing(z, g);
      const inner = clipRing(z, g - 0.0009).reverse();
      clip.push({ z, ring: [...outer, ...inner] });
    }
    out.push(part(G.loftZ(clip, true, 40), m.park));
    // rear handguard band (thin spring-steel band round the crown, ends on the stock shelf)
    const band: { z: number; ring: V2[] }[] = [];
    for (const [z, g] of [[GD.rhgBandRear, 0.0003], [GD.rhgBandRear + 0.0008, 0.0011], [GD.rhgFront - 0.0008, 0.0011], [GD.rhgFront, 0.0003]] as const) {
      const outer = clipRing(z, g);
      const inner = clipRing(z, -0.0002).reverse();
      band.push({ z, ring: [...outer, ...inner] });
    }
    out.push(part(G.loftZ(band, true, 40), m.parkDark));
  }

  // ---------------- front handguard (thick) with its front ferrule
  {
    const zs = stations(GD.fhgRear, GD.fhgFront - 0.0095, () => 0.014);
    const secs = zs.map((z) => ({ z, ring: FHG.ringAt(z, 48) }));
    secs[0] = { z: GD.fhgRear, ring: FHG.ringAt(GD.fhgRear, 48, -0.0012) };
    secs.splice(1, 0, { z: GD.fhgRear + 0.0014, ring: FHG.ringAt(GD.fhgRear + 0.0014, 48) });
    out.push(part(G.loftZ(secs, true, 50), m.walnutHg));
    // shallow groove along the underside (finger groove / liner clearance)
    const gr = G.rbox(0.0042, 0.0012, GD.fhgFront - GD.fhgRear - 0.03, 0.0005, 1);
    out.push(part(gr, m.recess, { p: [0, FHG.at(0.39).yBot + 0.0002, (GD.fhgRear + GD.fhgFront) / 2 - 0.004] }));
    const z0 = GD.fhgFront - 0.0105, z1 = GD.fhgFront;
    const fer = G.loftZ(
      [
        { z: z0, ring: FHG.ringAt(z0, 48, 0.0002) },
        { z: z0 + 0.0009, ring: FHG.ringAt(z0, 48, 0.0011) },
        { z: z1 - 0.0008, ring: FHG.ringAt(z1, 48, 0.0011) },
        { z: z1, ring: FHG.ringAt(z1, 48, 0.0003) },
      ],
      true,
      40,
    );
    out.push(part(fer, m.park));
  }

  // ---------------- stock ferrule (steel cap over the front end of the stock) + swivel lug
  {
    const z0 = GD.ferruleRear, z1 = GD.stockFront;
    const fer = G.loftZ(
      [
        { z: z0, ring: STOCK.ringAt(z0, 60, 0.0002) },
        { z: z0 + 0.0009, ring: STOCK.ringAt(z0, 60, 0.0012) },
        { z: z1 - 0.0008, ring: STOCK.ringAt(z1, 60, 0.0012) },
        { z: z1 + 0.0004, ring: STOCK.ringAt(z1, 60, 0.0004) },
      ],
      true,
      40,
    );
    out.push(part(fer, m.park));
    const yb = STOCK.at(GD.frontSwivelZ).yBot;
    // lug under the ferrule carrying the swivel pin
    const lug: V2[] = [[z0 + 0.001, yb], [z1 - 0.001, yb], [z1 - 0.0025, yb - 0.0045], [GD.frontSwivelZ + 0.003, yb - 0.0082], [GD.frontSwivelZ - 0.003, yb - 0.0082], [z0 + 0.0025, yb - 0.0045]];
    out.push(part(plateZY(lug, 0.007, [], 0.0004), m.park));
  }

  // ---------------- butt plate: rim + checkered face + trap door + two screws
  {
    const bz = STOCK.z0;
    const ringOff = (z: number, d: number) => STOCK.ringAt(z, 80, d);
    const rim = G.loftZ(
      [
        { z: bz + 0.0044, ring: ringOff(bz + 0.0044, 0.0002) },
        { z: bz + 0.0036, ring: ringOff(bz + 0.0036, 0.0011) },
        { z: bz + 0.0004, ring: ringOff(bz, 0.0012) },
        { z: bz - 0.0017, ring: ringOff(bz, 0.0005) },
        { z: bz - 0.0025, ring: ringOff(bz, -0.001) },
      ],
      true,
      45,
    );
    out.push(part(rim, m.park));
    // checkered field (slightly proud of the rim face), with a clear margin
    const s0 = STOCK.at(bz);
    const face = Profile.ring(s0, 80, -0.0024);
    out.push(part(extrudeZ(face, [], bz - 0.003, bz - 0.0023, 0.0002), m.checker));
    // trap door (hinge at the bottom, finger catch at the top) with the dark parting line
    const cy = -0.1045, dw = 0.0205, dh = 0.047;
    out.push(part(extrudeZ(roundRect(0, cy, dw + 0.0014, dh + 0.0014, 0.0045), [], bz - 0.0032, bz - 0.0028, 0.0001), m.recess));
    out.push(part(extrudeZ(roundRect(0, cy, dw, dh, 0.004), [], bz - 0.004, bz - 0.0027, 0.0003), m.park));
    out.push(part(G.rbox(0.008, 0.0018, 0.0012, 0.0005, 1), m.park, { p: [0, cy + dh / 2 - 0.004, bz - 0.0044] }));
    out.push(part(cylX(0.0017, dw - 0.004, 12), m.park, { p: [0, cy - dh / 2 + 0.0012, bz - 0.0038] }));
    const [head, slot] = screwParts(0.0036, 0.0011, 0);
    for (const [y, spin] of [[-0.052, 15], [-0.154, 70]] as const) {
      const p = V(0, y, bz - 0.0029);
      out.push(part(placeAlong(head, p, V(0, 0, -1)), m.park), part(placeAlong(slot, p, V(0, 0, -1), spin), m.recess));
    }
  }

  // ---------------- butt swivel base plate (inletted into the belly) with its two screws
  {
    const z = GD.rearSwivelZ;
    const plate = STOCK.shell(z - 0.026, z + 0.022, () => (3 * Math.PI) / 2 - 0.3, () => (3 * Math.PI) / 2 + 0.3, 0.0018, 0.0004, 8, 6);
    out.push(part(plate, m.park));
    const [head, slot] = screwParts(0.003, 0.001, 0);
    for (const [dz, spin] of [[-0.017, 20], [0.013, 80]] as const) {
      const zz = z + dz;
      const p = V(0, STOCK.at(zz).yBot - 0.0015, zz);
      out.push(part(placeAlong(head, p, V(0, -1, 0)), m.park), part(placeAlong(slot, p, V(0, -1, 0), spin), m.recess));
    }
  }
  return out;
}
