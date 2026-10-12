/**
 * Chi-Ha material palette. Materials are memoised by the library, so calling pal() repeatedly
 * returns the same instances (one draw call per material after baking).
 *
 * Paint: the Imperial Japanese Army three-colour scheme standardised from 1942 - parched-grass khaki
 * base (karekusa-iro) with disruptive, softer-edged patches of mahogany brown (tsuchi-iro) and dark
 * green; the earlier black lining and yellow stripes are no longer used. Applied with the same camo
 * noise on every painted material so the pattern runs continuously over plates, wheels and fittings.
 */
import { M } from '../../../core/kit';

/** parched-grass khaki base, mahogany brown, dark green, as they read in the studio light */
export const KHAKI = 0x736a49;
export const BROWN = 0x4b3727;
export const GREEN = 0x3d4630;

const camo = {
  colors: [BROWN, GREEN] as [number, number],
  scale: 0.6,
  coverage: [0.44, 0.4] as [number, number],
  softness: 0.05,
  seed: 5.0,
};

const paintOpts = {
  roughness: 0.7,
  wear: 0.24,
  wearMetalness: 0.45,
  wearColor: 0x3b3833,
  dust: 0.24,
  dustHeight: 1.0,
  dustColor: 0x8f8268,
  colorVar: 0.07,
  varScale: 1.6,
  cavity: 0.45,
  camo,
} as const;

export function pal() {
  return {
    /** rolled armour plate, painted */
    paint: M.paint(KHAKI, { ...paintOpts, detailSize: 0.08, detailStrength: 0.26, name: 'chiha-paint' }),
    /** thin sheet steel (track guards, muffler guard, boxes), a little more worn */
    sheet: M.paint(KHAKI, { ...paintOpts, wear: 0.32, detailSize: 0.06, detailStrength: 0.2, name: 'chiha-sheet' }),
    /** cast / forged parts: wheels, hubs, sprocket, cranks, mantlet, rivet heads */
    cast: M.castPaint(KHAKI, { ...paintOpts, roughness: 0.72, detailSize: 0.24, detailStrength: 0.28, name: 'chiha-cast' }),
    /** cast steel track links, bare and dusty, polished at the edges */
    track: M.steel({
      color: 0x3f3a35,
      roughness: 0.72,
      metalness: 0.68,
      colorVar: 0.14,
      varScale: 7,
      wear: 0.55,
      wearColor: 0x747069,
      dust: 0.45,
      dustHeight: 0.9,
      dustColor: 0x877a63,
      bump: 0.08,
      bumpScale: 110,
      cavity: 0.5,
      name: 'chiha-track',
    }),
    /** rubber road-wheel and roller tyres */
    rubber: M.rubber({ color: 0x1f1e1c, roughness: 0.9, dust: 0.42, dustHeight: 0.8 }),
    /** gun barrels, MG barrels, clamps (dark steel) */
    gun: M.gunSteel({ color: 0x2a2b2b, roughness: 0.45, wear: 0.35 }),
    /** headlamp lens */
    glass: M.glass({ tint: 0xb3c2bd, opacity: 0.32, roughness: 0.06 }),
    /** dark space inside openings, bores, vision slits and grille wells */
    void: M.surface({ color: 0x0d0d0c, roughness: 0.92, metalness: 0, name: 'chiha-void' }),
    /** heat-darkened exhaust and muffler */
    exhaust: M.steel({
      color: 0x33291f,
      roughness: 0.88,
      metalness: 0.35,
      colorVar: 0.12,
      varScale: 9,
      wear: 0.12,
      wearColor: 0x4a3a2c,
      dust: 0.1,
      dustColor: 0x6e6a64,
      bump: 0.14,
      bumpScale: 110,
      name: 'chiha-exhaust',
    }),
    /** steel wire rope (tow cable) */
    cable: M.steel({ color: 0x57534c, roughness: 0.56, metalness: 0.75, wear: 0.2, dust: 0.35, bump: 0.25, bumpScale: 420, name: 'chiha-cable' }),
    /** bare tool steel (shovel blade, pick head, crowbar) */
    toolSteel: M.steel({ color: 0x55524c, roughness: 0.5, metalness: 0.85, wear: 0.4, dust: 0.12, name: 'chiha-toolsteel' }),
    /** tool handles */
    wood: M.wood(0x6a5a42, 0x3c3124, [0, 0, 1], { roughness: 0.76, clearcoat: 0, wear: 0.12, wearColor: 0x7a6a52, dust: 0.3, colorVar: 0.05 }),
    /** black lamp body interior / reflector surround */
    black: M.paint(0x22211f, { roughness: 0.55, wear: 0.2, wearColor: 0x55524d, dust: 0.12, name: 'chiha-black' }),
    /** bright reflector */
    bright: M.steel({ color: 0x7a7872, roughness: 0.38, metalness: 1, wear: 0.1, dust: 0.05, bump: 0.02, name: 'chiha-bright' }),
  };
}
export type Pal = ReturnType<typeof pal>;
