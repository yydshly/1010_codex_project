/**
 * Material palette for the Opel Blitz. Materials are memoised by the library, so every call
 * returns the same instance (one draw call per material after baking).
 *
 * Colours: body, wings, cab and cargo body in Dunkelgelb RAL 7028 (the factory base colour
 * ordered for Army vehicles from February 1943); frame and running gear in a dull black-grey.
 * The wooden cargo body is painted over; the floor boards are worn to bare wood.
 */
import { M } from '../../../core/kit';

const DG = 0x9d8b5e; // Dunkelgelb, in-scene value

export const P = {
  body: () =>
    M.paint(DG, {
      roughness: 0.64,
      wear: 0.24,
      wearColor: 0x4a3f33,
      wearMetalness: 0.35,
      wearRoughness: 0.5,
      dust: 0.24,
      dustHeight: 1.0,
      dustColor: 0x9a8a70,
      colorVar: 0.06,
      varScale: 1.4,
      name: 'blitz-dunkelgelb',
    }),
  /** Same Dunkelgelb, dustier: wheels and the lowest body parts. */
  bodyLow: () =>
    M.paint(0x998759, {
      roughness: 0.7,
      wear: 0.3,
      wearColor: 0x4a3f33,
      wearMetalness: 0.35,
      dust: 0.5,
      dustHeight: 0.75,
      dustColor: 0x8f8068,
      colorVar: 0.07,
      varScale: 3,
      name: 'blitz-dunkelgelb-low',
    }),
  /** Frame, axles, springs: dull black-grey chassis paint, dusty. */
  chassis: () =>
    M.paint(0x2f302e, {
      roughness: 0.7,
      wear: 0.25,
      wearColor: 0x5c5a55,
      wearMetalness: 0.5,
      dust: 0.55,
      dustHeight: 0.8,
      dustColor: 0x857865,
      colorVar: 0.08,
      varScale: 3,
      name: 'blitz-chassis',
    }),
  /** Flat black: radiator core, lamp interiors, instrument panel, rubber-less black parts. */
  black: () => M.paint(0x1c1c1b, { roughness: 0.62, wear: 0.12, wearColor: 0x55524d, dust: 0.12, name: 'blitz-black' }),
  rubber: () => M.rubber({ color: 0x1e1e1d, roughness: 0.9, dust: 0.42, dustHeight: 0.7, dustColor: 0x8a7d69 }),
  glass: () => M.glass({ tint: 0x9aa5a5, opacity: 0.1, roughness: 0.03 }),
  lens: () => M.glass({ tint: 0xf1efe4, opacity: 0.3, roughness: 0.06 }),
  reflector: () => M.aluminium({ roughness: 0.18, color: 0xc7c8c6, name: 'blitz-reflector' }),
  /** Bare working steel: hinge pins, springs' clips, chains, pedal pads, bolts. */
  steel: () => M.steel({ color: 0x4d4a46, roughness: 0.5, metalness: 0.8, dust: 0.25, bump: 0.02, bumpScale: 220 }),
  exhaust: () =>
    M.steel({
      color: 0x4a3a30,
      roughness: 0.8,
      metalness: 0.45,
      colorVar: 0.18,
      varScale: 8,
      wear: 0.22,
      wearColor: 0x6b5a4a,
      dust: 0.3,
      dustHeight: 0.8,
      name: 'blitz-exhaust',
    }),
  /** Engine block, gearbox and axle castings (grey, oily and dusty). */
  casting: () =>
    M.castPaint(0x3a3b38, { roughness: 0.64, wear: 0.2, dust: 0.4, dustHeight: 0.9, dustColor: 0x7a6e5c, detailSize: 0.2, detailStrength: 0.5, name: 'blitz-casting' }),
  /** Painted planks, grain running along Z (side boards, battens). */
  woodZ: () =>
    M.plainWood(0x978556, [0, 0, 1], {
      wood: { axis: [0, 0, 1], dark: 0x7a6a43, ringFreq: 70, figure: 0.6 },
      roughness: 0.74,
      colorVar: 0.08,
      detailStrength: 0.35,
      wear: 0.3,
      wearColor: 0x7c6446,
      dust: 0.28,
      dustHeight: 1.2,
      dustColor: 0x958670,
      name: 'blitz-wood-z',
    }),
  /** Painted planks, grain running along X (headboard, tailgate, cross bearers). */
  woodX: () =>
    M.plainWood(0x978556, [1, 0, 0], {
      wood: { axis: [1, 0, 0], dark: 0x7a6a43, ringFreq: 70, figure: 0.6 },
      roughness: 0.74,
      colorVar: 0.08,
      detailStrength: 0.35,
      wear: 0.3,
      wearColor: 0x7c6446,
      dust: 0.28,
      dustHeight: 1.2,
      dustColor: 0x958670,
      name: 'blitz-wood-x',
    }),
  /** Floor boards worn down to grey-brown bare wood. */
  floor: () =>
    M.plainWood(0x7d6c52, [0, 0, 1], { roughness: 0.82, wear: 0.2, dust: 0.35, dustHeight: 1.3, dustColor: 0x8e7f68, name: 'blitz-floor' }),
  canvas: () =>
    M.canvas(0x77704f, {
      roughness: 0.94,
      detail: 'plain',
      detailSize: 0.011,
      detailStrength: 0.55,
      colorVar: 0.1,
      varScale: 2.5,
      dust: 0.22,
      dustHeight: 2.0,
      dustColor: 0x9a8c72,
      wear: 0.12,
      name: 'blitz-canvas',
    }),
  /** Hemp lashing rope. */
  rope: () => M.canvas(0x8c7c5a, { detail: 'twill', detailSize: 0.008, roughness: 0.95, dust: 0.2, wear: 0.1, name: 'blitz-rope' }),
  /** Seat upholstery: dark brown leatherette. */
  seat: () => M.leather(0x3a2e24, { roughness: 0.58, wear: 0.28, dust: 0.1, dustHeight: 1.6 }),
  /** Black moulded parts: steering wheel, knobs, switches. */
  bakelite: () =>
    M.surface({
      color: 0x141312,
      roughness: 0.34,
      metalness: 0,
      colorVar: 0.04,
      varScale: 20,
      roughVar: 0.15,
      wear: 0.2,
      wearColor: 0x3a2e24,
      wearMetalness: 0,
      wearRoughness: 0.5,
      cavity: 0.3,
      name: 'blitz-bakelite',
    }),
  redLens: () => M.surface({ color: 0x8a1a12, roughness: 0.18, metalness: 0, colorVar: 0.05, cavity: 0.2, name: 'blitz-red-lens' }),
};
