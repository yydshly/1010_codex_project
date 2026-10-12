/**
 * Bren Mk II butt (B-frame, see dims.ts): the simplified wartime "slab" butt of oiled walnut, lofted
 * through super-ellipse sections (flat comb, drop to the wrist, straight lower line from the toe to the
 * wrist), the bent sheet-steel butt plate screwed to the wood with its forward-curled top lip (the
 * shoulder rest that replaced the Mk I butt strap), the steel butt slide seen along both sides of the
 * wrist, and the recessed sling loop on the RIGHT side of the butt that takes the sling hook.
 * The Mk I folding rear grip / monopod under the butt was deleted on the Mk II and is not fitted.
 */
import { THREE, G, part } from '../../../../core/kit';
import { V, secRing, secRingOffset, secSideX, stadium, plateZY, screwParts, placeAlong, spaced, type V2 } from '../common/geo';
import type { UkwMats } from '../common/materials';
import { BR, buttSec } from './dims';
import { tessellate } from './util';

/** Rear sling point: bar of the loop on the right side of the butt (B-frame). */
export const BUTT_LOOP = { z: 0.087, y: -0.054 };
export function buttLoopBar(): THREE.Vector3 {
  const s = buttSec(BUTT_LOOP.z);
  const x = -secSideX(s, BUTT_LOOP.y);
  return V(x - 0.0062, BUTT_LOOP.y - 0.0105, BUTT_LOOP.z);
}

export function buildButt(m: UkwMats, hi: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const N = hi ? 64 : 40;
  const z0 = BR.plate, z1 = BR.buttFront;

  // ---- wood
  {
    const zs = [...spaced(z0, 0.1, hi ? 10 : 6), ...spaced(0.104, 0.16, hi ? 14 : 7), ...spaced(0.166, z1, hi ? 8 : 4)];
    const secs = zs.map((z) => ({ z, ring: secRing(buttSec(z), N) }));
    // slightly rounded rear edge where the plate seats and a small chamfer at the front joint
    secs[0] = { z: z0, ring: secRingOffset(buttSec(z0), -0.0008, N) };
    secs[secs.length - 1] = { z: z1, ring: secRingOffset(buttSec(z1), -0.0006, N) };
    out.push(part(G.loftZ(secs, true, 50), m.walnut));
  }

  // ---- bent steel butt plate: rear leaf + top lip curled forward over the comb
  {
    const s0 = buttSec(z0);
    const ring: V2[] = secRingOffset(s0, 0.0004, N);
    const t = BR.plate;
    const plate = G.loftZ(
      [
        { z: 0.0, ring: secRingOffset(s0, -0.0006, N) },
        { z: 0.0006, ring },
        { z: t, ring },
      ],
      true,
      50,
    );
    out.push(part(plate, m.black));
    // lip: from the top of the plate up and forward over the comb (a curled sheet-steel strip)
    const w = 2 * s0.hw - 0.006;
    const yT = s0.yTop;
    const P = [V(0, yT + 0.0005, 0.0009), V(0, yT + 0.0042, 0.0012), V(0, yT + 0.0058, 0.0048), V(0, yT + 0.0046, 0.0105), V(0, yT + 0.0022, 0.0152)];
    const Nn = [V(0, 0, -1), V(0, 0.6, -0.8), V(0, 1, -0.1), V(0, 1, 0.25), V(0, 1, 0.35)].map((n) => n.normalize());
    out.push(part(tessellate(G.strap(P, w, 0.0019, Nn, { samples: 16 }), 0.006, null, 0.0008), m.black));
    // two wood screws through the plate
    const [head, slot] = screwParts(0.0034, 0.0011, 20);
    for (const [y, sp] of [
      [-0.03, 35],
      [-0.093, 110],
    ] as V2[]) {
      const p = V(0, y, -0.0002);
      out.push(part(placeAlong(head, p, V(0, 0, -1)), m.blued), part(placeAlong(slot, p, V(0, 0, -1), sp), m.recess));
    }
  }

  // ---- steel butt slide visible along both sides of the wrist (stadium-ended strap, slightly proud)
  {
    const zc = 0.1855, len = 0.101, h = 0.0138, yc = -0.0368;
    for (const sx of [-1, 1]) {
      const outline = stadium(zc, yc, len, h, 8);
      const x = sx * (secSideX(buttSec(zc), yc) + 0.0002);
      out.push(part(plateZY(outline, 0.0018, [], 0.0005), m.black, { p: [x, 0, 0] }));
      // screw at the rear end of the slide
      const [head, slot] = screwParts(0.0027, 0.0009, 18);
      const p = V(x + sx * 0.0009, yc, zc - len / 2 + 0.009);
      out.push(part(placeAlong(head, p, V(sx, 0, 0)), m.blued), part(placeAlong(slot, p, V(sx, 0, 0), 60), m.recess));
    }
    // steel shoe under the front of the wrist, meeting the body
    const zs = spaced(0.2, z1, 4);
    const secs = zs.map((z) => {
      const s = buttSec(z);
      const r = secRingOffset(s, 0.0012, 32).map(([x, y]) => [x, Math.min(y, s.yBot + 0.009)] as V2);
      return { z, ring: r };
    });
    out.push(part(G.loftZ(secs, true, 40), m.black));
  }

  // ---- sling loop on the right side: recessed plate with a swivelling D-loop
  {
    const { z, y } = BUTT_LOOP;
    const s = buttSec(z);
    const x = -secSideX(s, y);
    out.push(part(plateZY(stadium(z, y - 0.002, 0.024, 0.042, 8), 0.0016, [], 0.0005), m.black, { p: [x - 0.0003, 0, 0] }));
    // two rivets
    for (const dy of [0.012, -0.016]) out.push(part(G.cyl(0.0022, 0.0024, 0.001, 12).rotateZ(Math.PI / 2), m.black, { p: [x - 0.0014, y + dy, z] }));
    // loop: pivot boss + D-ring hanging on the side, standing slightly off the plate
    out.push(part(G.cyl(0.0034, 0.0036, 0.0035, 14).rotateZ(Math.PI / 2), m.black, { p: [x - 0.0025, y + 0.001, z] }));
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 16; k++) {
      const a = Math.PI + (Math.PI * k) / 16;
      pts.push(V(x - 0.0055 - 0.0012 * Math.sin((Math.PI * k) / 16), y - 0.0005 + 0.0102 * Math.sin(a), z + 0.0092 * Math.cos(a)));
    }
    pts.unshift(V(x - 0.0042, y + 0.0005, z - 0.0092));
    pts.push(V(x - 0.0042, y + 0.0005, z + 0.0092));
    out.push(part(G.tube(pts, 0.0017, 8, 40), m.blued));
    out.push(part(G.rod(V(x - 0.0042, y + 0.0005, z - 0.0095), V(x - 0.0042, y + 0.0005, z + 0.0095), 0.0019, 10), m.blued));
  }
  return out;
}
