/**
 * Material palette for the GAZ-67B. The library memoises materials, so every call returns the
 * same instance and all parts sharing a finish merge into one draw call at bake time.
 */
import { M } from '../../../core/kit';

/** Soviet 4BO protective green (in-scene value). */
export const GREEN = 0x4b5034;

export const P = {
  /** Body, wings, bonnet, wheels: brushed 4BO green over pressed sheet steel. */
  body: () =>
    M.paint(GREEN, {
      roughness: 0.64,
      wear: 0.26,
      wearColor: 0x3b3a34,
      wearMetalness: 0.45,
      wearRoughness: 0.5,
      dust: 0.18,
      dustHeight: 0.62,
      dustColor: 0x8f836c,
      colorVar: 0.07,
      varScale: 1.8,
    }),
  /** Frame, axles, springs, underside: same green, dustier and more scuffed. */
  chassis: () =>
    M.paint(0x464a31, {
      roughness: 0.72,
      wear: 0.34,
      wearColor: 0x3d3b36,
      wearMetalness: 0.5,
      dust: 0.5,
      dustHeight: 0.62,
      dustColor: 0x857a66,
      colorVar: 0.09,
      varScale: 3,
    }),
  /** Flat black enamel: radiator core, lamp interiors, instrument panel, steering column. */
  black: () =>
    M.paint(0x1d1d1b, { roughness: 0.58, wear: 0.18, wearColor: 0x55544f, wearMetalness: 0.6, dust: 0.1, colorVar: 0.04 }),
  /** Engine block / gearbox castings (grey-green primer, oily). */
  engine: () =>
    M.castPaint(0x3e4234, { roughness: 0.62, wear: 0.2, dust: 0.3, dustHeight: 0.7, dustColor: 0x6f6656, detailSize: 0.2, detailStrength: 0.4 }),
  /** Bare working steel: pedal pads, hinge pins, lever shafts, bolts. */
  steel: () =>
    M.steel({ color: 0x55534f, roughness: 0.46, metalness: 0.85, wear: 0.4, dust: 0.1, bump: 0.02, bumpScale: 220 }),
  /** Exhaust pipe and silencer: heat-darkened, lightly rusted steel. */
  exhaust: () =>
    M.steel({ color: 0x4a3b30, roughness: 0.82, metalness: 0.35, colorVar: 0.18, varScale: 9, wear: 0.2, wearColor: 0x6b4a33, dust: 0.3, dustHeight: 0.6 }),
  /** Tyres. */
  rubber: () => M.rubber({ color: 0x1e1e1d, roughness: 0.9, dust: 0.4, dustHeight: 0.55, dustColor: 0x8a7d69 }),
  /** Windscreen and lamp glass. */
  glass: () => M.glass({ tint: 0xdce6e6, opacity: 0.17, roughness: 0.03 }),
  /** Headlamp reflectors (silvered). */
  reflector: () => M.aluminium({ color: 0xb9bbbc, roughness: 0.22, metalness: 1 }),
  /** Tail lamp lens. */
  redLens: () =>
    M.surface({ color: 0x6e1712, roughness: 0.22, metalness: 0, colorVar: 0.05, varScale: 30, cavity: 0.2, name: 'gaz67-red-lens' }),
  /** Folded canvas top (khaki tarpaulin). */
  canvas: () => M.canvas(0x6a6647, { dust: 0.22, dustHeight: 1.3, wear: 0.12, detailSize: 0.016 }),
  /** Seat upholstery: dark leatherette. */
  seat: () => M.leather(0x2e2b24, { roughness: 0.55, wear: 0.25, dust: 0.12, dustHeight: 1.2 }),
  /** Leather straps on the folded top. */
  strap: () => M.leather(0x4a3524, { roughness: 0.6, wear: 0.3 }),
  /** Steering-wheel rim: bent wood (varnished). */
  wood: () => M.wood(0x4e331c, 0x24160b, [0, 0, 1], { roughness: 0.45 }),
  /** Black moulded parts: knobs, steering hub, horn button, gauge bezels. */
  bakelite: () =>
    M.surface({ color: 0x151412, roughness: 0.34, metalness: 0, colorVar: 0.04, varScale: 20, roughVar: 0.15, cavity: 0.3, wear: 0.2, wearColor: 0x3a342c, name: 'gaz67-bakelite' }),
};
