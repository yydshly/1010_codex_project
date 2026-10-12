/**
 * Sherman Firefly Vc material palette. Materials are memoised by the library: one palette = one draw call per
 * material after baking. British S.C.C. No. 15 olive drab (from April 1944), close to US Olive Drab.
 */
import { M } from '../../../core/kit';

/** S.C.C. No. 15 olive drab, slightly faded and dusty. */
export const OD = 0x4b4631;

const base = {
  roughness: 0.68,
  colorVar: 0.07,
  varScale: 1.5,
  wear: 0.26,
  wearColor: 0x3b3935,
  wearMetalness: 0.5,
  wearRoughness: 0.48,
  dust: 0.24,
  dustHeight: 1.05,
  dustColor: 0x8f836b,
  cavity: 0.45,
} as const;

export function pal() {
  return {
    /** rolled armour plate, painted */
    paint: M.paint(OD, { ...base, detailSize: 0.07, detailStrength: 0.28, name: 'ffly-paint' }),
    /** cast armour and cast fittings (turret, differential housing, bogies, hatch casting) */
    cast: M.castPaint(OD, { ...base, roughness: 0.72, detailSize: 0.32, detailStrength: 0.22, name: 'ffly-cast' }),
    /** off-white countershading on the underside of the 17-pdr barrel (optional crew camouflage) */
    shade: M.paint(0xb8b4a2, { ...base, colorVar: 0.1, wear: 0.3, wearColor: 0x4b4631, wearMetalness: 0, dust: 0.2, detailSize: 0.07, detailStrength: 0.2, name: 'ffly-shade' }),
    /** thin sheet metal (guards, deflector, sand shields, racks): a touch more worn */
    sheet: M.paint(OD, { ...base, wear: 0.36, detailSize: 0.05, detailStrength: 0.18, name: 'ffly-sheet' }),
    /** cast / forged track steel: end connectors, guide horns, link bodies */
    track: M.steel({
      color: 0x45403a,
      roughness: 0.7,
      metalness: 0.65,
      colorVar: 0.15,
      varScale: 7,
      wear: 0.5,
      wearColor: 0x86817a,
      dust: 0.45,
      dustHeight: 1.1,
      dustColor: 0x8a7d67,
      cavity: 0.55,
      bump: 0.07,
      bumpScale: 110,
      name: 'ffly-track',
    }),
    /** worn bright steel (guide horn and sprocket tooth contact faces) */
    bright: M.steel({ color: 0x6f6b64, roughness: 0.42, metalness: 0.9, wear: 0.3, dust: 0.2, dustHeight: 0.4, name: 'ffly-bright' }),
    /** track pad and tyre rubber, dusty */
    rubber: M.rubber({ color: 0x1f1e1c, roughness: 0.9, dust: 0.45, dustHeight: 1.1, dustColor: 0x8a7d69, name: 'ffly-rubber' }),
    /** machine guns, periscope heads, small blackened steel */
    gun: M.gunSteel({ color: 0x2a2b2b, roughness: 0.46, wear: 0.16, wearColor: 0x5c5f61, name: 'ffly-gun' }),
    /** tool handles (hickory / ash) */
    wood: M.wood(0x7d6242, 0x463322, [0, 0, 1], { roughness: 0.64, clearcoat: 0, wear: 0.3, dust: 0.18, name: 'ffly-wood' }),
    /** clear lenses (headlights) */
    glass: M.glass({ tint: 0xc7d3cf, opacity: 0.3, roughness: 0.05 }),
    /** periscope heads and vision blocks: darker, reflective */
    vision: M.glass({ tint: 0x33403d, opacity: 0.6, roughness: 0.03 }),
    /** red tail-light lenses */
    red: M.glass({ tint: 0x8a1a12, opacity: 0.75, roughness: 0.12 }),
    /** dark voids: bores, openings, grille wells */
    void: M.surface({ color: 0x0e0e0d, roughness: 0.92, metalness: 0, name: 'ffly-void' }),
    /** exhaust stacks and deflector underside: heat-darkened steel */
    exhaust: M.steel({
      color: 0x3a2e26,
      roughness: 0.85,
      metalness: 0.35,
      colorVar: 0.2,
      varScale: 9,
      wear: 0.2,
      wearColor: 0x6b4a33,
      dust: 0.1,
      bump: 0.12,
      bumpScale: 110,
      name: 'ffly-exhaust',
    }),
    /** tool heads, shackles, pins: bare steel */
    toolSteel: M.steel({ color: 0x4d4b46, roughness: 0.55, metalness: 0.8, wear: 0.35, wearColor: 0x75716a, dust: 0.14, name: 'ffly-toolsteel' }),
    /** rolled tarpaulin / bedroll: olive drab cotton duck */
    canvas: M.canvas(0x5d5a42, { dust: 0.22, dustHeight: 0.9, dustColor: 0x8f836b, name: 'ffly-canvas' }),
    /** wire rope (tow cable) */
    cable: M.steel({ color: 0x403d38, roughness: 0.6, metalness: 0.8, wear: 0.2, dust: 0.35, bump: 0.25, bumpScale: 420, name: 'ffly-cable' }),
  };
}
export type Pal = ReturnType<typeof pal>;
