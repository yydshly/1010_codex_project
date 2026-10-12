/**
 * Material palette for the Kubelwagen. Materials are memoised by the library, so every
 * call returns the same instance (one draw call per material after baking).
 *
 * Colours: body shell Dunkelgelb RAL 7028 (ordered for all Army vehicles in 1943; applied
 * to Type 82 bodies from mid-1943). Rolling chassis (floor pan, suspension, engine tin)
 * in Dunkelgrau RAL 7021, as VW still used grey for chassis until spring 1944.
 */
import { M } from '../../../core/kit';

export const P = {
  body: () =>
    M.paint(0x9d8b5e, {
      roughness: 0.64,
      wear: 0.26,
      wearColor: 0x4a3f33,
      wearMetalness: 0.35,
      wearRoughness: 0.5,
      dust: 0.26,
      dustHeight: 0.55,
      dustColor: 0x9a8a70,
      colorVar: 0.06,
      varScale: 1.6,
      name: 'kubel-dunkelgelb',
    }),
  /** Same Dunkelgelb, dustier (wheels, lower running gear painted in body colour). */
  bodyLow: () =>
    M.paint(0x9a885c, {
      roughness: 0.7,
      wear: 0.3,
      wearColor: 0x4a3f33,
      wearMetalness: 0.35,
      dust: 0.5,
      dustHeight: 0.5,
      dustColor: 0x8f8068,
      name: 'kubel-dunkelgelb-low',
    }),
  chassis: () =>
    M.paint(0x3a3e40, {
      roughness: 0.66,
      wear: 0.25,
      wearColor: 0x5c5a55,
      wearMetalness: 0.5,
      dust: 0.55,
      dustHeight: 0.6,
      dustColor: 0x857865,
      name: 'kubel-dunkelgrau',
    }),
  /** Flat black paint (lamp interiors, engine tin behind the louvres, instrument panel). */
  black: () => M.paint(0x1c1c1b, { roughness: 0.6, wear: 0.12, wearColor: 0x55524d, dust: 0.1, name: 'kubel-black' }),
  rubber: () => M.rubber({ dust: 0.4, dustColor: 0x8a7d69 }),
  /** Black bakelite / moulded plastic (steering wheel, knobs). */
  bakelite: () =>
    M.surface({
      color: 0x141312,
      roughness: 0.32,
      metalness: 0,
      colorVar: 0.04,
      varScale: 20,
      roughVar: 0.15,
      wear: 0.2,
      wearColor: 0x3a2e24,
      wearMetalness: 0,
      wearRoughness: 0.5,
      cavity: 0.3,
      name: 'kubel-bakelite',
    }),
  glass: () => M.glass({ opacity: 0.16 }),
  lens: () => M.glass({ tint: 0xf1efe4, opacity: 0.3, roughness: 0.06 }),
  reflector: () => M.aluminium({ roughness: 0.18, color: 0xc7c8c6, name: 'kubel-reflector' }),
  steel: () => M.steel({ color: 0x4d4a46, dust: 0.25 }),
  darkSteel: () => M.gunSteel({ color: 0x2e2f30, roughness: 0.48, wear: 0.35 }),
  exhaust: () =>
    M.steel({
      color: 0x4a3a30,
      roughness: 0.78,
      metalness: 0.55,
      colorVar: 0.18,
      varScale: 8,
      wear: 0.25,
      wearColor: 0x6b5a4a,
      dust: 0.3,
      name: 'kubel-exhaust',
    }),
  /** Magnesium-alloy crankcase / gearbox castings (silver-grey, dull). */
  casting: () =>
    M.surface({
      color: 0x7b7a74,
      roughness: 0.62,
      metalness: 0.55,
      colorVar: 0.1,
      varScale: 6,
      detail: 'cast',
      detailSize: 0.2,
      detailStrength: 0.6,
      dust: 0.5,
      dustHeight: 0.6,
      dustColor: 0x7d705e,
      cavity: 0.5,
      name: 'kubel-casting',
    }),
  topCanvas: () =>
    M.canvas(0x6d6348, {
      roughness: 0.94,
      detail: 'plain',
      detailSize: 0.012,
      detailStrength: 0.9,
      colorVar: 0.1,
      varScale: 5,
      dust: 0.2,
      dustHeight: 1.3,
      wear: 0.12,
      name: 'kubel-top-canvas',
    }),
  seatCloth: () =>
    M.canvas(0x6f6a57, {
      roughness: 0.93,
      detail: 'twill',
      detailSize: 0.01,
      detailStrength: 0.8,
      colorVar: 0.07,
      varScale: 6,
      dust: 0.12,
      dustHeight: 0.8,
      wear: 0.18,
      name: 'kubel-seat-cloth',
    }),
  leather: () => M.leather(0x3b2a1d, { wear: 0.3 }),
  /** Oiled ash floor gratings (light hardwood). */
  ash: () => M.plainWood(0xb49766, [1, 0, 0], { roughness: 0.62, wear: 0.3, dust: 0.3, dustHeight: 0.5, name: 'kubel-ash-x' }),
  ashZ: () => M.plainWood(0xb49766, [0, 0, 1], { roughness: 0.62, wear: 0.3, dust: 0.3, dustHeight: 0.5, name: 'kubel-ash-z' }),
  redLens: () =>
    M.surface({ color: 0x8a1a12, roughness: 0.18, metalness: 0, colorVar: 0.05, cavity: 0.2, name: 'kubel-red-lens' }),
};
