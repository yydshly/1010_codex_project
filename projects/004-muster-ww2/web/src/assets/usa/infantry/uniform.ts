/**
 * US Army enlisted field uniform as worn in Normandy / the ETO, summer 1944:
 *  - Jacket, Field, O.D. (the "M1941" field jacket): hip-length windbreaker of olive drab shade 2
 *    cotton poplin (faded to a beige-green in use) lined with wool flannel; zip front covered by a
 *    storm flap closed with five buttons, a turn-down / notched collar, buttoned shoulder straps
 *    (epaulettes), two slash hand pockets at the front hips (plain openings - the flapped pockets
 *    belong to the earlier "Parsons" pattern), buttoned cuff tabs;
 *  - Trousers, wool, O.D. (shade 33 serge, a darker brown-olive), legs tucked into the leggings;
 *  - Leggings, canvas, dismounted, M1938 (khaki duck, laced at the outer side) over russet
 *    Type III roughout service shoes. The M1943 double-buckle combat boot reached most ETO
 *    infantry only from late 1944, so the leggings and service shoes are the mid-1944 standard.
 *
 * Heights are metres above the ground for the 1.76 m reference figure standing barefoot.
 */
import type { ClothSpec, UniformSpec } from '../../shared/human/uniform';

export const US_UNIFORM_COLORS = {
  /** M1941 jacket: OD shade 2 poplin, faded. */
  jacket: 0x716d4d,
  /** Wool serge trousers, OD shade 33. */
  trousers: 0x5a4f3b,
  /** M1938 leggings: khaki cotton duck. */
  leggings: 0x7e7556,
  /** Brown plastic / composition buttons. */
  buttons: 0x3a3024,
  /** Russet roughout (flesh-out) leather of the Type III service shoe. */
  shoe: 0x6a4b32,
  sole: 0x2a221b,
};

export const JACKET_CLOTH: ClothSpec = { kind: 'cotton', color: US_UNIFORM_COLORS.jacket, mat: { dust: 0.14, colorVar: 0.07, detailSize: 0.006 } };

/** The uniform spec. `id` changes with every spec change (it keys the soldier mesh cache). */
export function m41Uniform(): UniformSpec {
  const C = US_UNIFORM_COLORS;
  return {
    id: 'us-m41-v2',
    tunic: {
      cloth: JACKET_CLOTH,
      thickness: 0.003,
      ease: 0.004,
      hem: 0.79,
      flare: 0.05,
      belt: { height: 1.03, gather: 0.7 },
      collar: { style: 'turndown', height: 0.03, fall: 0.05, cloth: JACKET_CLOTH },
      front: { style: 'full', buttons: 5, buttonHeights: [1.38, 1.285, 1.19, 1.095, 0.905] },
      pockets: [],
      shoulderStraps: { style: 'strap', cloth: JACKET_CLOTH, piping: null, button: true, width: 0.045 },
      cuff: { back: 0.014, buttons: 1 },
      buttons: { color: C.buttons, metal: false, diameter: 0.017, small: 0.014 },
      seams: true,
    },
    trousers: { cloth: { kind: 'wool', color: C.trousers, mat: { dust: 0.2 } }, cut: 'straight', bottoms: 'tucked', fullness: 0.004 },
    footwear: { style: 'ankle', leather: C.shoe, sole: C.sole, laces: true },
    legwear: { style: 'gaiters', color: C.leggings, top: 0.29, strap: C.leggings, kind: 'canvas' },
    skin: { tone: 0xc9967a, hair: 0x4a3827 },
  };
}
