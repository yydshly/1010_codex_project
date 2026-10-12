/**
 * Material palette for the 105 mm Howitzer M2A1. Every call returns memoised materials, so parts
 * sharing a finish merge into one draw call at bake time. US Army olive drab (lusterless enamel)
 * as it reads in the studio, moderate wear and dust.
 */
import { M } from '../../../core/kit';

/** Olive drab, slightly faded (same tone as the project's M4A3 Sherman). */
export const OD = 0x4c4a32;

const base = {
  roughness: 0.68,
  colorVar: 0.07,
  varScale: 1.6,
  wear: 0.26,
  wearColor: 0x3b3935,
  wearMetalness: 0.5,
  wearRoughness: 0.48,
  dust: 0.22,
  dustHeight: 0.8,
  dustColor: 0x8f836b,
  cavity: 0.45,
} as const;

export const P = {
  /** Painted plate and fabricated steel: shield, trails, bottom carriage, cradle. */
  paint: () => M.paint(OD, { ...base, detailSize: 0.06, detailStrength: 0.26, name: 'm2a1h-paint' }),
  /** Painted castings and forgings: top carriage, hubs, brackets, gear housings. */
  cast: () => M.castPaint(OD, { ...base, roughness: 0.72, detailSize: 0.18, detailStrength: 0.24, name: 'm2a1h-cast' }),
  /** Painted tube, recuperator and breech ring: smoother machined surfaces under the paint. */
  tube: () =>
    M.paint(OD, {
      ...base,
      roughness: 0.58,
      wear: 0.22,
      dust: 0.1,
      detailStrength: 0.14,
      colorVar: 0.05,
      name: 'm2a1h-tube',
    }),
  /** Spades and trail ends: same paint, scuffed and earth-stained. */
  spade: () =>
    M.paint(OD, {
      ...base,
      roughness: 0.76,
      wear: 0.5,
      wearColor: 0x46433d,
      dust: 0.6,
      dustHeight: 0.4,
      dustColor: 0x7e715c,
      colorVar: 0.1,
      varScale: 3,
      name: 'm2a1h-spade',
    }),
  /** Bore, chamber, soot: dark steel. */
  bore: () => M.gunSteel({ color: 0x202122, roughness: 0.5, wear: 0.15, wearColor: 0x5c5f61, cavity: 0.5, name: 'm2a1h-bore' }),
  /** Bright working steel: breech block, piston rods, pins, handwheel grips, handspike. */
  bright: () =>
    M.steel({ color: 0x5e5c58, roughness: 0.42, metalness: 0.85, wear: 0.35, dust: 0.08, bump: 0.02, bumpScale: 220, name: 'm2a1h-bright' }),
  /** 9.00-20 combat tyres. */
  rubber: () => M.rubber({ color: 0x1e1e1c, roughness: 0.88, dust: 0.42, dustHeight: 0.55, dustColor: 0x8a7d69, name: 'm2a1h-rubber' }),
  /** Optics bodies: black enamel. */
  optic: () =>
    M.paint(0x1c1d1b, { roughness: 0.46, wear: 0.3, wearColor: 0x55565a, wearMetalness: 0.8, dust: 0.05, colorVar: 0.04, name: 'm2a1h-optic' }),
  /** Lenses. */
  glass: () => M.glass({ tint: 0xa9bcc0, opacity: 0.32, roughness: 0.03 }),
  /** Brass: scale rings on the sight, data plate. */
  brass: () => M.brass({ color: 0x9b7d45, roughness: 0.45, colorVar: 0.1, name: 'm2a1h-brass' }),
};
