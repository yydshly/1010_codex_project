/**
 * Flak 36 material palette (memoised by the library: one draw call per material after baking).
 * Finish: factory Dunkelgelb (RAL 7028) as applied from 1943, moderate wear, no markings.
 */
import { M } from '../../../core/kit';

/** Dunkelgelb, tuned for the scene (same value as the PaK 40). */
export const DUNKELGELB = 0x9d8b5e;

export function palette() {
  return {
    /** Painted fabricated steel: platform, outriggers, carriage walls, shield. */
    paint: M.paint(DUNKELGELB, { wear: 0.3, dust: 0.26, dustHeight: 0.6, cavity: 0.45, name: 'f36-paint' }),
    /** Barrel, cradle, recuperator and equilibrator housings: smoother machined surfaces. */
    barrel: M.paint(DUNKELGELB, { wear: 0.22, dust: 0.1, dustHeight: 0.4, detailStrength: 0.18, roughness: 0.55, roughVar: 0.1, name: 'f36-barrel' }),
    /** Castings: pedestal, traverse ring, trunnion bosses, gear housings. */
    cast: M.castPaint(DUNKELGELB, { wear: 0.3, dust: 0.22, dustHeight: 0.6, detailSize: 0.16, detailStrength: 0.26, name: 'f36-cast' }),
    /** Muzzle: heat-darkened paint. */
    scorched: M.paint(0x7a6d50, { wear: 0.38, wearColor: 0x2e2c2a, colorVar: 0.16, varScale: 14, roughness: 0.72, dust: 0.04, cavity: 0.7, name: 'f36-scorched' }),
    /** Blued / machined steel: breech block, trunnion pins, gear shafts. */
    steel: M.gunSteel({ color: 0x5f6266, roughness: 0.48, metalness: 0.65, wear: 0.3, name: 'f36-steel' }),
    /** Bright working steel: jack spindles, piston rods. */
    bright: M.steel({ color: 0x6a6864, roughness: 0.4, metalness: 0.85, wear: 0.3, dust: 0.1, name: 'f36-bright' }),
    /** Sooty bore. */
    bore: M.gunSteel({ color: 0x141414, roughness: 0.7, metalness: 0.5, wear: 0, cavity: 0.2, name: 'f36-bore' }),
    /** Jack foot pads: earth-stained, worn bare at the edges. */
    worn: M.paint(0x857655, { roughness: 0.8, wear: 0.55, wearColor: 0x4a4843, dust: 0.45, dustHeight: 0.25, dustColor: 0x7d705c, name: 'f36-worn' }),
    /** Black enamel: sight body, data-receiver dials. */
    black: M.paint(0x1c1d1c, { roughness: 0.42, wear: 0.3, wearColor: 0x6a6864, wearMetalness: 0.8, dust: 0.05, detailStrength: 0.15, name: 'f36-black' }),
    /** Dial faces (off-white). */
    dial: M.paint(0xd8d2bf, { roughness: 0.5, wear: 0.05, dust: 0.05, detailStrength: 0.05, name: 'f36-dial' }),
    /** Phenolic crank grips. */
    grip: M.paint(0x2b1f18, { roughness: 0.38, wear: 0.15, wearColor: 0x4a382c, wearMetalness: 0, dust: 0.03, detailStrength: 0.1, name: 'f36-grip' }),
    /** Leather seat pads. */
    leather: M.leather(0x3b2a1c, { wear: 0.3, dust: 0.12, name: 'f36-leather' }),
    /** Optics / dial glass. */
    glass: M.glass({ tint: 0x9fbcc6, opacity: 0.4, roughness: 0.02 }),
  };
}
export type Palette = ReturnType<typeof palette>;
