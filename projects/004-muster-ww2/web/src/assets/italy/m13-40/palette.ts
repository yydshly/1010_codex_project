/**
 * M13/40 material palette (memoised by the library: one draw call per material after baking).
 */
import { M } from '../../../core/kit';

/** Regio Esercito "Kaki Sahariano" (Saharan khaki) overall, as it reads in the studio light. */
export const KAKI = 0xae966a;

const paintOpts = {
  roughness: 0.72,
  wear: 0.24,
  wearMetalness: 0.45,
  wearColor: 0x4a4436,
  dust: 0.3,
  dustHeight: 1.0,
  dustColor: 0xb8a482,
  colorVar: 0.08,
  varScale: 1.4,
  cavity: 0.5,
} as const;

export function pal() {
  return {
    /** rolled armour plate, painted */
    paint: M.paint(KAKI, { ...paintOpts, detailSize: 0.08, detailStrength: 0.25, name: 'm1340-paint' }),
    /** sheet steel (guards, bins), slightly more worn */
    sheet: M.paint(KAKI, { ...paintOpts, wear: 0.34, detailSize: 0.06, detailStrength: 0.2, name: 'm1340-sheet' }),
    /** cast / forged parts: MG casemate, mantlet, wheels, bogies, hubs */
    cast: M.castPaint(KAKI, { ...paintOpts, roughness: 0.74, detailSize: 0.26, detailStrength: 0.3, name: 'm1340-cast' }),
    /** track links: bare steel, dusty, polished edges */
    track: M.steel({
      color: 0x47413a,
      roughness: 0.74,
      metalness: 0.62,
      colorVar: 0.14,
      varScale: 7,
      wear: 0.5,
      wearColor: 0x7a756c,
      dust: 0.5,
      dustHeight: 0.9,
      dustColor: 0xa08e70,
      bump: 0.08,
      bumpScale: 110,
      cavity: 0.5,
      name: 'm1340-track',
    }),
    /** solid rubber tyres of road wheels and return rollers */
    rubber: M.rubber({ color: 0x232120, roughness: 0.9, dust: 0.5, dustHeight: 0.8, name: 'm1340-rubber' }),
    /** gun barrels, MG barrels, periscope bodies */
    gun: M.gunSteel({ color: 0x2a2b2b, roughness: 0.44, wear: 0.35, name: 'm1340-gun' }),
    /** headlamp lenses */
    glass: M.glass({ tint: 0xc4cbc4, opacity: 0.32, roughness: 0.06 }),
    /** periscope prisms and vision slits */
    vision: M.glass({ tint: 0x2e3634, opacity: 0.6, roughness: 0.04 }),
    /** number plate (white enamel) */
    plate: M.paint(0xbdb5a0, { roughness: 0.6, wear: 0.15, dust: 0.45, dustColor: 0xb8a482, name: 'm1340-plate' }),
    /** tail / brake light lens */
    tail: M.glass({ tint: 0x8a2219, opacity: 0.75, roughness: 0.1 }),
    /** dark voids: bores, grille wells, slits */
    void: M.surface({ color: 0x0d0c0b, roughness: 0.92, metalness: 0, name: 'm1340-void' }),
    /** heat-darkened exhaust silencer */
    exhaust: M.steel({
      color: 0x3b3129,
      roughness: 0.9,
      metalness: 0.35,
      colorVar: 0.12,
      varScale: 9,
      wear: 0.1,
      wearColor: 0x5a4636,
      dust: 0.15,
      dustColor: 0x8a7a62,
      bump: 0.12,
      bumpScale: 110,
      name: 'm1340-exhaust',
    }),
    /** bare tool steel (shovel, pick head, crowbar, hammer head) */
    toolSteel: M.steel({ color: 0x57534c, roughness: 0.52, metalness: 0.85, wear: 0.4, dust: 0.18, name: 'm1340-toolsteel' }),
    /** tool handles */
    wood: M.wood(0x7a6446, 0x4a3a28, [0, 0, 1], { roughness: 0.78, clearcoat: 0, wear: 0.12, dust: 0.3, colorVar: 0.05 }),
  };
}
export type Pal = ReturnType<typeof pal>;
