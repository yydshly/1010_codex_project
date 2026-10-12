/**
 * Cromwell Mk IV material palette. Materials are memoised by the library, so calling pal()
 * repeatedly returns the same instances (one draw call per material after baking).
 */
import { M } from '../../../core/kit';

/** British S.C.C. No. 15 olive drab (ACI 533, April 1944), as it reads in the studio light. */
export const SCC15 = 0x4b4631;

const paintOpts = {
  roughness: 0.68,
  wear: 0.26,
  wearMetalness: 0.45,
  wearColor: 0x3a3832,
  dust: 0.22,
  dustHeight: 1.05,
  dustColor: 0x8e826b,
  colorVar: 0.075,
  varScale: 1.6,
  cavity: 0.45,
} as const;

export function pal() {
  return {
    /** rolled armour plate, painted */
    paint: M.paint(SCC15, { ...paintOpts, detailSize: 0.08, detailStrength: 0.28 }),
    /** thin sheet steel (track guards, side plates, bins), a little more worn */
    sheet: M.paint(SCC15, { ...paintOpts, wear: 0.34, detailSize: 0.06, detailStrength: 0.2, name: 'crom-sheet' }),
    /** cast / forged parts: mantlet, wheels, hubs, sprocket, hooks, bolt bosses */
    cast: M.castPaint(SCC15, { ...paintOpts, roughness: 0.7, detailSize: 0.26, detailStrength: 0.3 }),
    /** manganese-steel track links, bare and dusty, polished at the edges */
    track: M.steel({
      color: 0x3f3a35,
      roughness: 0.72,
      metalness: 0.68,
      colorVar: 0.14,
      varScale: 7,
      wear: 0.55,
      wearColor: 0x747069,
      dust: 0.42,
      dustHeight: 0.9,
      dustColor: 0x857862,
      bump: 0.08,
      bumpScale: 110,
      cavity: 0.5,
    }),
    /** solid rubber road-wheel tyres */
    rubber: M.rubber({ color: 0x1e1d1c, roughness: 0.9, dust: 0.42, dustHeight: 0.8 }),
    /** Besa barrels, periscope bodies, clamps (dark steel) */
    gun: M.gunSteel({ color: 0x27292a, roughness: 0.42, wear: 0.35 }),
    /** headlamp lenses */
    glass: M.glass({ tint: 0xb3c2bd, opacity: 0.32, roughness: 0.06 }),
    /** episcope and periscope prisms, vision blocks: dark and reflective */
    vision: M.glass({ tint: 0x2e3836, opacity: 0.55, roughness: 0.04 }),
    /** dark space inside openings, bores and grille wells */
    void: M.surface({ color: 0x0d0d0c, roughness: 0.92, metalness: 0, name: 'crom-void' }),
    /** heat-darkened exhaust pipes */
    exhaust: M.steel({
      color: 0x282625,
      roughness: 0.88,
      metalness: 0.4,
      colorVar: 0.08,
      varScale: 9,
      wear: 0.1,
      wearColor: 0x3f3730,
      dust: 0.08,
      dustColor: 0x6e6a64,
      bump: 0.12,
      bumpScale: 110,
      name: 'crom-exhaust',
    }),
    /** steel wire rope (tow cable) */
    cable: M.steel({ color: 0x57534c, roughness: 0.56, metalness: 0.75, wear: 0.2, dust: 0.35, bump: 0.25, bumpScale: 420, name: 'crom-cable' }),
    /** bare bright steel (headlamp reflector) */
    bright: M.steel({ color: 0x7a7872, roughness: 0.38, metalness: 1, wear: 0.1, dust: 0.05, bump: 0.02, name: 'crom-bright' }),
    /** bare tool steel (shovel blade, pick head, crowbar) */
    toolSteel: M.steel({ color: 0x55524c, roughness: 0.5, metalness: 0.85, wear: 0.4, dust: 0.12, name: 'crom-toolsteel' }),
    /** tool handles (ash) */
    wood: M.wood(0x5c5143, 0x352c22, [0, 0, 1], { roughness: 0.76, clearcoat: 0, wear: 0.12, wearColor: 0x6f624f, dust: 0.3, colorVar: 0.05 }),
    /** black-painted lamp bodies and blackout hoods */
    black: M.paint(0x22211f, { roughness: 0.55, wear: 0.2, wearColor: 0x55524d, dust: 0.12, name: 'crom-black' }),
  };
}
export type Pal = ReturnType<typeof pal>;
