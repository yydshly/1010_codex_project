/**
 * Red Army enlisted field uniform, pattern 1943 (Order of the NKO No. 25, 15 January 1943):
 *  - gymnastyorka (pullover field tunic) in khaki cotton: standing collar closed with two small
 *    buttons, short front placket with three buttons, no breast pockets (enlisted pattern; breast
 *    pockets were kept for officers), field shoulder boards (pogony) in khaki with the crimson
 *    piping of the infantry and a small button at the collar end;
 *  - sharovary: khaki cotton breeches, full in the thigh, tucked into the boots or puttees;
 *  - footwear: tall boots (kirza artificial leather) or laced ankle boots with obmotki
 *    (wound cloth puttees).
 *
 * Colours are a restrained "zashchitny" khaki; tunic and breeches come from different dye lots,
 * as was usual, so their tones differ slightly.
 */
import type { ClothSpec, UniformSpec } from '../../shared/human/uniform';

export type Footwear = 'boots' | 'obmotki';

export const SU_UNIFORM_COLORS = {
  tunic: 0x77704d,
  breeches: 0x6b6646,
  piping: 0x7a1f28,
  buttons: 0x4b4a36,
  kirza: 0x1e1b18,
  kirzaSole: 0x161310,
  ankleBoot: 0x2a211a,
  puttee: 0x625d44,
};

/** The tunic cloth (collar, shoulder boards and the pilotka share it, so they share one material). */
export const TUNIC_CLOTH: ClothSpec = { kind: 'cotton', color: SU_UNIFORM_COLORS.tunic, mat: { dust: 0.14, colorVar: 0.07 } };

/** M43 enlisted uniform. `id` changes with every spec change (it keys the soldier mesh cache). */
export function m43Uniform(foot: Footwear): UniformSpec {
  const C = SU_UNIFORM_COLORS;
  return {
    id: `su-m43-v4-${foot}`,
    tunic: {
      cloth: TUNIC_CLOTH,
      thickness: 0.003,
      ease: 0.002,
      hem: 0.775,
      flare: 0.1,
      belt: { height: 1.03, gather: 1.1 },
      collar: { style: 'stand', height: 0.036, buttons: 2, cloth: TUNIC_CLOTH },
      front: { style: 'placket', buttons: 3, length: 0.19 },
      pockets: [],
      shoulderStraps: { style: 'board', cloth: TUNIC_CLOTH, piping: C.piping, button: true },
      cuff: { back: 0.012, buttons: 2 },
      buttons: { color: C.buttons, metal: true, diameter: 0.016, small: 0.013 },
      seams: true,
    },
    trousers: { cloth: { kind: 'cotton', color: C.breeches, mat: { dust: 0.18 } }, cut: 'breeches', bottoms: 'tucked', fullness: 0.004 },
    footwear:
      foot === 'boots'
        ? { style: 'jackboot', leather: C.kirza, sole: C.kirzaSole, shaft: 0.35, creases: true }
        : { style: 'ankle', leather: C.ankleBoot, sole: C.kirzaSole, laces: true },
    legwear: foot === 'obmotki' ? { style: 'puttees', color: C.puttee, top: 0.3, kind: 'wool' } : null,
    skin: { tone: 0xc9967a, hair: 0x4a3827 },
  };
}
