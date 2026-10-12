/**
 * Stielhandgranate 24 (Model 24 stick grenade): sheet-steel head, hollow wooden handle,
 * steel screw cap at the handle end covering the pull-cord bead.
 *
 * Gear-local frame (tucked in the belt): grenade axis along +Y (head up), handle back surface
 * on z = 0 (axis at z = +handle radius), origin on the axis at the height where the belt
 * crosses the handle (about 7 cm below the head). The head is larger than the handle, so when
 * tucked behind a belt the infantry module should tilt it slightly outwards at the top.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { P } from './palette';

export interface StickGrenadeOptions {
  /** Wood grain axis in the FINAL asset's object space (default [0,1,0] = worn upright). */
  woodAxis?: [number, number, number];
}

// dimensions (m)
export const M24 = {
  headR: 0.035,
  headLen: 0.08,
  handleR: 0.0152,
  handleLen: 0.248,
  capLen: 0.022,
  /** overall length */
  length: 0.364,
};

/** Build along +Y with the cap end at y = 0 (display helpers use this directly). */
export function buildStickGrenadeAxial(opts: StickGrenadeOptions = {}): THREE.Group {
  const steel = P.greySteel();
  const bare = P.bareSteel();
  const wood = P.handleWood(opts.woodAxis ?? [0, 1, 0]);
  const parts: THREE.Object3D[] = [];
  const cap = M24.capLen;
  const h0 = cap; // wood starts
  const h1 = h0 + M24.handleLen; // wood ends / ferrule
  // screw cap: knurled ribbed skirt, domed end
  parts.push(
    part(
      G.lathe(
        [
          [0, 0],
          [0.0105, 0.0004],
          [0.0148, 0.0022],
          [0.0163, 0.0048],
          [0.0165, 0.0075],
          [0.0165, cap - 0.0015],
          [0.0158, cap],
          [0.0146, cap],
        ],
        40,
        40,
      ),
      bare,
    ),
  );
  // knurling ribs on the cap skirt
  const ribs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r = G.rbox(0.0016, cap - 0.011, 0.0012, 0.0005, 1);
    r.translate(0, 0.0075 + (cap - 0.011) / 2 + 0.001, 0.0165);
    r.rotateY(a);
    ribs.push(r.toNonIndexed());
  }
  parts.push(part(G.mergeGeometries(ribs)!, bare));
  // steel end fitting the cap screws onto (thin collar on the wood)
  parts.push(part(G.lathe([[0.0149, h0 - 0.003], [0.0156, h0 - 0.002], [0.0156, h0 + 0.009], [0.0151, h0 + 0.0105], [0.0148, h0 + 0.0105]], 36, 40), bare));
  // wooden handle: very slight taper, softened ends
  parts.push(
    part(
      G.lathe(
        [
          [0.0146, h0 + 0.004],
          [M24.handleR - 0.0004, h0 + 0.012],
          [M24.handleR, h0 + 0.06],
          [M24.handleR + 0.0004, h1 - 0.03],
          [M24.handleR + 0.0005, h1 - 0.006],
          [M24.handleR - 0.0006, h1 + 0.001],
        ],
        40,
        40,
      ),
      wood,
    ),
  );
  // steel ferrule / threaded connector joining handle and head
  const f0 = h1 - 0.012;
  parts.push(
    part(
      G.lathe(
        [
          [M24.handleR + 0.0006, f0],
          [M24.handleR + 0.0011, f0 + 0.0015],
          [M24.handleR + 0.0011, f0 + 0.011],
          [0.0172, f0 + 0.013],
          [0.0165, f0 + 0.018],
        ],
        40,
        40,
      ),
      bare,
    ),
  );
  // head: sheet-steel can with rounded base, crimped top seam, slightly dished lid
  const hb = f0 + 0.016; // head base
  const R = M24.headR;
  const hl = M24.headLen;
  parts.push(
    part(
      G.lathe(
        [
          [0.0166, hb],
          [0.02, hb + 0.0012],
          [0.027, hb + 0.0022],
          [R - 0.006, hb + 0.0035],
          [R - 0.0022, hb + 0.0068],
          [R - 0.0004, hb + 0.011],
          [R, hb + 0.016],
          [R, hb + hl - 0.007],
          [R + 0.0008, hb + hl - 0.0055],
          [R + 0.0012, hb + hl - 0.003],
          [R + 0.0006, hb + hl - 0.001],
          [R - 0.0012, hb + hl],
          [R - 0.003, hb + hl - 0.0012],
          [R * 0.55, hb + hl - 0.0005],
          [0, hb + hl],
        ],
        56,
        35,
      ),
      steel,
    ),
  );
  // longitudinal lap seam on the can
  parts.push(part(G.rbox(0.006, hl - 0.022, 0.0009, 0.0004, 1), steel, { p: [0, hb + 0.012 + (hl - 0.022) / 2, R + 0.0002] }));
  const g = group(parts);
  g.name = 'de-stielhandgranate-24';
  return g;
}

export function buildStickGrenade(opts: StickGrenadeOptions = {}): GearPiece {
  const axial = buildStickGrenadeAxial(opts);
  const beltY = M24.capLen + M24.handleLen - 0.075; // 7.5 cm below the head base area
  axial.position.set(0, -beltY, M24.handleR);
  const object = group([axial]);
  object.name = 'de-stielhandgranate-24';
  return {
    id: 'de-stielhandgranate-24',
    name: 'Stielhandgranate 24',
    object,
    mount: 'belt-front-left',
    size: { w: M24.headR * 2, h: M24.length, d: M24.headR * 2 },
    belt: { loopWidth: 0.05 },
  };
}
