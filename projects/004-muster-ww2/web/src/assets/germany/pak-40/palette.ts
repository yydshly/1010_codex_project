/**
 * PaK 40 material palette. Materials are memoised by the library, so every call returns
 * the same instances (one draw call per material after baking).
 */
import { M } from '../../../core/kit';

/** Dunkelgelb (RAL 7028) factory finish, 1943-44, as tuned for the scene. */
export const DUNKELGELB = 0x9d8b5e;

export function palette() {
  return {
    /** Painted steel: carriage, shield, trails, wheels. */
    paint: M.paint(DUNKELGELB, { wear: 0.28, dust: 0.24, dustHeight: 0.55, cavity: 0.45 }),
    /** Painted barrel & cradle: smoother machined surfaces under the paint. */
    barrel: M.paint(DUNKELGELB, { wear: 0.22, dust: 0.12, dustHeight: 0.4, detailStrength: 0.18, roughness: 0.56, roughVar: 0.1 }),
    /** Muzzle brake: same paint, heat-darkened and sooty. */
    scorched: M.paint(0x7d7052, { wear: 0.4, wearColor: 0x2e2c2a, colorVar: 0.16, varScale: 14, roughness: 0.72, dust: 0.04, cavity: 0.7 }),
    /** Bare machined / blued steel: breech block, pins, crank handles. */
    steel: M.gunSteel({ color: 0x6a6d70, roughness: 0.5, metalness: 0.6, wear: 0.3 }),
    /** Sooty bore. */
    bore: M.gunSteel({ color: 0x141414, roughness: 0.7, metalness: 0.5, wear: 0, cavity: 0.2 }),
    /** Worn bare steel: spade cutting edges, rubbing strips. */
    worn: M.steel({ dust: 0.45, dustHeight: 0.35, wear: 0.5 }),
    /** Solid rubber tyres. */
    rubber: M.rubber({ dust: 0.5, dustHeight: 0.35, roughness: 0.86 }),
    /** Black enamel of the telescopic sight. */
    black: M.paint(0x1c1d1c, { roughness: 0.42, wear: 0.3, wearColor: 0x6a6864, wearMetalness: 0.8, dust: 0.05, detailStrength: 0.15 }),
    /** Dark phenolic grips on handwheel cranks. */
    grip: M.paint(0x2b1f18, { roughness: 0.38, wear: 0.15, wearColor: 0x4a382c, wearMetalness: 0, dust: 0.03, detailStrength: 0.1 }),
    /** Soft rubber eye-cup of the sight. */
    eyecup: M.rubber({ dust: 0.02, roughness: 0.75, bump: 0.02 }),
    /** Coated optics. */
    glass: M.glass({ tint: 0x9fbcc6, opacity: 0.45, roughness: 0.02 }),
    /** Stamped data plate. */
    alu: M.aluminium({ roughness: 0.5 }),
  };
}
export type Palette = ReturnType<typeof palette>;
