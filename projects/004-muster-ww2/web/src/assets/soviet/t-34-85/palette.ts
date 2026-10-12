/**
 * T-34-85 material palette. Materials are memoised by the library, so calling pal() repeatedly
 * returns the same instances (one draw call per material after baking).
 */
import { M } from '../../../core/kit';

/** Soviet 4BO protective green, as it reads in the studio (slightly faded, dusty). */
export const GREEN_4BO = 0x444932;

const paintOpts = {
  roughness: 0.66,
  wear: 0.24,
  wearMetalness: 0.45,
  wearColor: 0x3a3833,
  dust: 0.2,
  dustHeight: 1.05,
  dustColor: 0x8a7e66,
  colorVar: 0.085,
  varScale: 1.6,
  cavity: 0.45,
} as const;

export function pal() {
  return {
    /** rolled armour plate & sheet steel, painted */
    paint: M.paint(GREEN_4BO, { ...paintOpts }),
    /** cast parts: turret, mantlet, wheels, hooks (rough cast surface) */
    cast: M.castPaint(GREEN_4BO, { ...paintOpts, roughness: 0.7, detailSize: 0.28, detailStrength: 0.26 }),
    /** unpainted cast track links (manganese steel, dusty, polished contact faces at the edges) */
    track: M.steel({
      color: 0x3c3834,
      roughness: 0.72,
      metalness: 0.7,
      wear: 0.55,
      wearColor: 0x7d7a74,
      dust: 0.5,
      dustHeight: 1.0,
      dustColor: 0x7f735f,
      bump: 0.08,
      bumpScale: 90,
      cavity: 0.5,
    }),
    /** solid rubber road wheel tyres */
    rubber: M.rubber({ color: 0x1e1e1d, dust: 0.4, dustHeight: 0.9 }),
    /** machine-gun barrels, bore, periscope bodies (dark steel) */
    gun: M.gunSteel({ color: 0x26282a, wear: 0.35 }),
    /** vision blocks, periscope windows, headlamp lens */
    glass: M.glass({ tint: 0xa7b6b0, opacity: 0.32, roughness: 0.06 }),
    /** armoured vision blocks and periscope prisms: dark, reflective */
    vision: M.glass({ tint: 0x2f3a38, opacity: 0.55, roughness: 0.04 }),
    /** dark space behind glass & inside openings */
    void: M.surface({ color: 0x0d0e0d, roughness: 0.9, metalness: 0, name: 't34-void' }),
    /** sooty exhaust pipes */
    exhaust: M.steel({
      color: 0x2e2621,
      roughness: 0.85,
      metalness: 0.35,
      wear: 0.25,
      wearColor: 0x6b4a33,
      dust: 0.1,
      bump: 0.12,
      bumpScale: 120,
      name: 't34-exhaust',
    }),
    /** steel wire rope (tow cables) */
    cable: M.steel({ color: 0x3e3b37, roughness: 0.62, metalness: 0.8, wear: 0.2, dust: 0.35, bump: 0.25, bumpScale: 420, name: 't34-cable' }),
    /** bare bright steel (saw blade, headlamp reflector) */
    bright: M.steel({ color: 0x77756f, roughness: 0.4, metalness: 1, wear: 0.1, dust: 0.05, bump: 0.02, name: 't34-bright' }),
    /** saw handles */
    wood: M.wood(0x6d4a2c, 0x3a2615, [0, 1, 0], { wear: 0.3, roughness: 0.6, clearcoat: 0 }),
  };
}
export type Pal = ReturnType<typeof pal>;
