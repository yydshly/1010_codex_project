/**
 * Material palette for the ZiS-5V. Materials are memoised by the library, so every call returns
 * the same instance (one draw call per material after baking).
 *
 * Colours: Soviet 4BO protective green on the steel parts and over the wooden cab and platform
 * boards; frame and running gear in the same green, dirtier; roof covering of dark dermatin
 * (leatherette); floor boards worn to bare wood.
 */
import { M } from '../../../core/kit';

/** Soviet 4BO protective green (in-scene value). */
const GREEN = 0x4b5034;

export const P = {
  body: () =>
    M.paint(GREEN, {
      roughness: 0.66,
      wear: 0.26,
      wearColor: 0x3b3a34,
      wearMetalness: 0.45,
      wearRoughness: 0.5,
      dust: 0.22,
      dustHeight: 1.0,
      dustColor: 0x8f836c,
      colorVar: 0.07,
      varScale: 1.6,
      name: 'zis5-4bo',
    }),
  /** Wheels and lowest body parts: same green, dustier. */
  bodyLow: () =>
    M.paint(0x484c32, {
      roughness: 0.72,
      wear: 0.3,
      wearColor: 0x3d3b36,
      wearMetalness: 0.45,
      dust: 0.5,
      dustHeight: 0.75,
      dustColor: 0x877b66,
      colorVar: 0.08,
      varScale: 3,
      name: 'zis5-4bo-low',
    }),
  /** Frame, axles, springs. */
  chassis: () =>
    M.paint(0x3d4030, {
      roughness: 0.74,
      wear: 0.3,
      wearColor: 0x45433c,
      wearMetalness: 0.5,
      dust: 0.55,
      dustHeight: 0.8,
      dustColor: 0x857a66,
      colorVar: 0.09,
      varScale: 3,
      name: 'zis5-chassis',
    }),
  black: () => M.paint(0x1d1d1b, { roughness: 0.6, wear: 0.15, wearColor: 0x55544f, wearMetalness: 0.6, dust: 0.12, name: 'zis5-black' }),
  rubber: () => M.rubber({ color: 0x1e1e1d, roughness: 0.9, dust: 0.45, dustHeight: 0.7, dustColor: 0x8a7d69 }),
  glass: () => M.glass({ tint: 0x9aa5a5, opacity: 0.1, roughness: 0.03 }),
  lens: () => M.glass({ tint: 0xf1efe4, opacity: 0.3, roughness: 0.06 }),
  reflector: () => M.aluminium({ roughness: 0.2, color: 0xc2c3c1, name: 'zis5-reflector' }),
  steel: () => M.steel({ color: 0x55534f, roughness: 0.5, metalness: 0.8, wear: 0.4, dust: 0.2, bump: 0.02, bumpScale: 220 }),
  exhaust: () =>
    M.steel({
      color: 0x4a3b30,
      roughness: 0.82,
      metalness: 0.4,
      colorVar: 0.18,
      varScale: 9,
      wear: 0.2,
      wearColor: 0x6b4a33,
      dust: 0.3,
      dustHeight: 0.8,
      name: 'zis5-exhaust',
    }),
  casting: () =>
    M.castPaint(0x3e4234, { roughness: 0.64, wear: 0.2, dust: 0.4, dustHeight: 0.9, dustColor: 0x6f6656, detailSize: 0.2, detailStrength: 0.45, name: 'zis5-casting' }),
  /** Painted boards, grain along Y (vertical cab boarding). */
  woodY: () =>
    M.plainWood(0x4d5236, [0, 1, 0], {
      wood: { axis: [0, 1, 0], dark: 0x3c4029, ringFreq: 70, figure: 0.55 },
      roughness: 0.76,
      colorVar: 0.09,
      detailStrength: 0.35,
      wear: 0.3,
      wearColor: 0x6e5a3e,
      dust: 0.22,
      dustHeight: 1.2,
      dustColor: 0x8f836c,
      name: 'zis5-wood-y',
    }),
  /** Painted boards, grain along Z (platform sides, cab rails). */
  woodZ: () =>
    M.plainWood(0x4d5236, [0, 0, 1], {
      wood: { axis: [0, 0, 1], dark: 0x3c4029, ringFreq: 70, figure: 0.55 },
      roughness: 0.76,
      colorVar: 0.09,
      detailStrength: 0.35,
      wear: 0.3,
      wearColor: 0x6e5a3e,
      dust: 0.25,
      dustHeight: 1.3,
      dustColor: 0x8f836c,
      name: 'zis5-wood-z',
    }),
  /** Painted boards, grain along X (tailgate, front board, cross bearers, cab front/rear rails). */
  woodX: () =>
    M.plainWood(0x4d5236, [1, 0, 0], {
      wood: { axis: [1, 0, 0], dark: 0x3c4029, ringFreq: 70, figure: 0.55 },
      roughness: 0.76,
      colorVar: 0.09,
      detailStrength: 0.35,
      wear: 0.3,
      wearColor: 0x6e5a3e,
      dust: 0.25,
      dustHeight: 1.3,
      dustColor: 0x8f836c,
      name: 'zis5-wood-x',
    }),
  floor: () =>
    M.plainWood(0x7a6a52, [0, 0, 1], { roughness: 0.82, wear: 0.2, dust: 0.35, dustHeight: 1.3, dustColor: 0x8e7f68, name: 'zis5-floor' }),
  /** Dermatin (leatherette) roof covering, dark. */
  dermatin: () => M.leather(0x262521, { roughness: 0.62, detailStrength: 0.35, wear: 0.2, dust: 0.3, dustHeight: 2.4, dustColor: 0x8a806c, name: 'zis5-dermatin' }),
  /** Wartime seats: canvas (brezent) over cotton wadding. */
  seat: () => M.canvas(0x5d5a42, { roughness: 0.93, detail: 'plain', detailSize: 0.01, detailStrength: 0.7, dust: 0.15, dustHeight: 1.6, name: 'zis5-seat' }),
  /** Varnished wooden steering-wheel rim. */
  wheelWood: () => M.wood(0x5a3a1f, 0x2a190b, [0, 0, 1], { roughness: 0.45 }),
  bakelite: () =>
    M.surface({ color: 0x151412, roughness: 0.36, metalness: 0, colorVar: 0.04, varScale: 20, roughVar: 0.15, cavity: 0.3, wear: 0.2, wearColor: 0x3a342c, name: 'zis5-bakelite' }),
  redLens: () => M.surface({ color: 0x6e1712, roughness: 0.22, metalness: 0, colorVar: 0.05, varScale: 30, cavity: 0.2, name: 'zis5-red-lens' }),
};
