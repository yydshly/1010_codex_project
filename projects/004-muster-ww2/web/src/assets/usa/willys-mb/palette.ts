/**
 * Material palette for the Willys MB. The library memoises materials, so every call returns the
 * same instance and all parts sharing a finish merge into one draw call at bake time.
 * US Army Olive Drab (lusterless enamel) as it reads in the studio, moderately dusty.
 */
import { M } from '../../../core/kit';

/** Olive Drab, slightly faded (same in-scene value as the M4A3 in this archive). */
export const OD = 0x4c4a32;

export const P = {
  /** Body tub, hood, fenders, grille, wheels, windscreen frame. */
  body: () =>
    M.paint(OD, {
      roughness: 0.68,
      colorVar: 0.07,
      varScale: 1.8,
      wear: 0.3,
      wearColor: 0x3b3935,
      wearMetalness: 0.5,
      wearRoughness: 0.46,
      dust: 0.22,
      dustHeight: 0.75,
      dustColor: 0x8f836b,
      cavity: 0.45,
      detailSize: 0.05,
      detailStrength: 0.25,
      name: 'willys-body',
    }),
  /** Frame, axles, springs, bumper and underside: same paint, dustier and more scuffed. */
  chassis: () =>
    M.paint(0x48462f, {
      roughness: 0.74,
      colorVar: 0.09,
      varScale: 3,
      wear: 0.36,
      wearColor: 0x3d3b36,
      wearMetalness: 0.5,
      dust: 0.5,
      dustHeight: 0.65,
      dustColor: 0x857a66,
      cavity: 0.5,
      name: 'willys-chassis',
    }),
  /** Flat black: radiator core, lamp interiors, instrument panel faces, wiper arms. */
  black: () => M.paint(0x1c1c1a, { roughness: 0.62, wear: 0.16, wearColor: 0x55544f, wearMetalness: 0.6, dust: 0.08, colorVar: 0.04, name: 'willys-black' }),
  /** Engine / gearbox castings (OD over cast iron, oily). */
  engine: () =>
    M.castPaint(0x3f3e2e, { roughness: 0.64, wear: 0.2, dust: 0.3, dustHeight: 0.7, dustColor: 0x6f6656, detailSize: 0.32, detailStrength: 0.16, name: 'willys-engine' }),
  /** Bare working steel: hinge pins, bolts, pedal pads, lever shafts. */
  steel: () => M.steel({ color: 0x5a5852, roughness: 0.46, metalness: 0.85, wear: 0.4, dust: 0.1, bump: 0.02, bumpScale: 220, name: 'willys-steel' }),
  /** Exhaust pipe and silencer: heat-darkened, lightly rusted steel. */
  exhaust: () =>
    M.steel({ color: 0x4a3b30, roughness: 0.82, metalness: 0.35, colorVar: 0.18, varScale: 9, wear: 0.2, wearColor: 0x6b4a33, dust: 0.3, dustHeight: 0.6, name: 'willys-exhaust' }),
  /** Tyres and rubber parts. */
  rubber: () => M.rubber({ color: 0x1f1e1c, roughness: 0.9, dust: 0.42, dustHeight: 0.6, dustColor: 0x8a7d69, name: 'willys-rubber' }),
  /** Windscreen and lamp glass. */
  glass: () => M.glass({ tint: 0xd8e2e2, opacity: 0.2, roughness: 0.03 }),
  /** Instrument lenses: clear but without the milky base of the thicker glass. */
  gaugeGlass: () => M.glass({ tint: 0x2c3234, opacity: 0.1, roughness: 0.05 }),
  /** Sealed-beam reflectors (silvered). */
  reflector: () => M.aluminium({ color: 0xb9bbbc, roughness: 0.22, metalness: 1, name: 'willys-reflector' }),
  /** Tail / stop lamp lenses. */
  redLens: () => M.surface({ color: 0x6e1712, roughness: 0.22, metalness: 0, colorVar: 0.05, varScale: 30, cavity: 0.2, name: 'willys-red-lens' }),
  /** Folded canvas top (OD duck). */
  canvas: () => M.canvas(0x5a5638, { dust: 0.24, dustHeight: 1.3, wear: 0.12, detailSize: 0.016, name: 'willys-top' }),
  /** Seat cushion covers: OD cotton duck, darker and softer. */
  seat: () => M.canvas(0x4b4a33, { roughness: 0.94, detail: 'plain', detailSize: 0.012, detailStrength: 0.8, dust: 0.16, dustHeight: 1.1, wear: 0.2, name: 'willys-seat' }),
  /** Webbing straps (tool straps, top straps, jerrycan strap). */
  web: () => M.canvas(0x55533a, { detail: 'webbing', detailSize: 0.012, detailStrength: 1, dust: 0.2, name: 'willys-web' }),
  /** Tool handles (hickory / ash), weathered. */
  wood: () => M.wood(0x5b4d3b, 0x372b20, [0, 0, 1], { roughness: 0.76, clearcoat: 0, colorVar: 0.1, wear: 0.25, dust: 0.24, dustColor: 0x8f836b, name: 'willys-wood' }),
  /** Tool heads: black enamel over forged steel, edges worn bright. */
  tool: () =>
    M.paint(0x232320, { roughness: 0.58, wear: 0.3, wearColor: 0x7d7a73, wearMetalness: 0.9, wearRoughness: 0.35, dust: 0.18, dustHeight: 0.9, colorVar: 0.05, name: 'willys-tool' }),
  /** Black moulded parts: steering wheel, knobs, horn button. */
  bakelite: () =>
    M.surface({ color: 0x151412, roughness: 0.36, metalness: 0, colorVar: 0.04, varScale: 20, roughVar: 0.15, cavity: 0.3, wear: 0.22, wearColor: 0x3a342c, name: 'willys-bakelite' }),
};
