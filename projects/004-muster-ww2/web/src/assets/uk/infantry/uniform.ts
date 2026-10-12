/**
 * British Army other ranks' Battledress, 1937 pattern (NW Europe 1944):
 *  - Blouse, battledress: short khaki serge blouse ending at the waist in a buttoned waistband
 *    (the web belt is worn over it; a strip of the waistband shows below the belt), turn-down
 *    collar closed at the neck, fly front (buttons concealed), two box-pleated breast pockets with
 *    straight flaps (concealed buttons on the 1937 pattern), cloth shoulder straps with a small
 *    button, buttoned cuff tabs;
 *  - Trousers, battledress: khaki serge, high waisted (hidden under the blouse), large map pocket
 *    on the front of the left thigh and a small field-dressing pocket at the right front hip
 *    (both built in pockets.ts - the shared UniformSpec has tunic pockets only), bottoms bloused
 *    over the anklets;
 *  - Anklets, web, 1937 pattern (short khaki web gaiters with two straps) over black leather
 *    ammunition boots (laced ankle boots).
 *
 * Khaki serge is a brownish olive (drab), clearly browner than the blancoed khaki-green webbing.
 */
import type { ClothSpec, UniformSpec } from '../../shared/human/uniform';

export const UK_UNIFORM_COLORS = {
  serge: 0x504531,
  trousers: 0x4a402e,
  buttons: 0x4a4232,
  boot: 0x1d1814,
  sole: 0x15110e,
  anklet: 0x66664b,
  ankletStrap: 0x5c5c43,
};

/** The blouse cloth (collar, shoulder straps and pockets share it: one material). */
export const BD_CLOTH: ClothSpec = { kind: 'wool', color: UK_UNIFORM_COLORS.serge, mat: { dust: 0.06, colorVar: 0.06, detailSize: 0.009, sheen: 0.3 } };
export const BD_TROUSER_CLOTH: ClothSpec = { kind: 'wool', color: UK_UNIFORM_COLORS.trousers, mat: { dust: 0.1, colorVar: 0.06, detailSize: 0.009, sheen: 0.3 } };

/** Belt centre height (reference figure) - the blouse is gathered here and the web belt goes on top. */
export const BD_BELT_HEIGHT = 1.03;

/** 1937-pattern Battledress. `id` changes with every spec change (it keys the soldier mesh cache). */
export function battledress37(): UniformSpec {
  const C = UK_UNIFORM_COLORS;
  return {
    id: 'uk-bd37-v5',
    tunic: {
      cloth: BD_CLOTH,
      thickness: 0.0036,
      ease: 0.002,
      // waistband: its lower edge 2.6 cm below the 57 mm web belt (the hem band reads as the band)
      hem: 0.974,
      flare: 0,
      belt: { height: BD_BELT_HEIGHT, gather: 1.35 },
      collar: { style: 'turndown', height: 0.034, fall: 0.042, cloth: BD_CLOTH },
      front: { style: 'full', buttons: 5, fly: true },
      pockets: [
        { at: 'chest', side: 'both', x: 0.098, y: 1.285, w: 0.125, h: 0.145, pleat: true, flap: { h: 0.055, shape: 'straight', button: false } },
      ],
      shoulderStraps: { style: 'strap', cloth: BD_CLOTH, piping: null, button: true },
      cuff: { back: 0.014, buttons: 1 },
      buttons: { color: C.buttons, metal: false, diameter: 0.018, small: 0.015 },
      seams: true,
    },
    trousers: { cloth: BD_TROUSER_CLOTH, cut: 'straight', bottoms: 'bloused', fullness: 0.006 },
    footwear: { style: 'ankle', leather: C.boot, sole: C.sole, laces: true },
    legwear: { style: 'gaiters', color: C.anklet, top: 0.19, strap: C.ankletStrap, kind: 'canvas' },
    skin: { tone: 0xc9967a, hair: 0x4a3526 },
  };
}
