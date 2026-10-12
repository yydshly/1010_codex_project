/**
 * Material palette for the ZiS-3. Every call returns memoised materials, so parts that share
 * a finish merge into one draw call at bake time.
 */
import { M } from '../../../core/kit';

/** Soviet 4BO protective green, as applied to artillery. */
export const GREEN = 0x434731;

export const P = {
  /** Painted rolled / pressed steel: shield, trails, cradle, barrel. */
  paint: () =>
    M.paint(GREEN, {
      roughness: 0.66,
      wear: 0.28,
      wearColor: 0x3a3a36,
      dust: 0.22,
      dustHeight: 0.75,
      dustColor: 0x8c806a,
      colorVar: 0.07,
      varScale: 1.6,
    }),
  /** Painted castings and forgings: upper carriage, muzzle brake, hubs, breech ring. */
  cast: () =>
    M.castPaint(GREEN, {
      roughness: 0.7,
      wear: 0.32,
      wearColor: 0x3a3a36,
      detailSize: 0.16,
      detailStrength: 0.26,
      dust: 0.2,
      dustHeight: 0.75,
      dustColor: 0x8c806a,
    }),
  /** Spades and trail ends: same paint, more scuffed and earth-stained. */
  spade: () =>
    M.paint(GREEN, {
      roughness: 0.74,
      wear: 0.55,
      wearColor: 0x45423d,
      dust: 0.55,
      dustHeight: 0.32,
      dustColor: 0x7d705c,
      colorVar: 0.1,
      varScale: 3,
    }),
  /** Bore, chamber, wedge faces: dark blued steel with oil sheen. */
  bore: () => M.gunSteel({ color: 0x2a2b2d, roughness: 0.38, wear: 0.3, wearColor: 0x77797b, cavity: 0.5 }),
  /** Forged / machined parts under the paint (breech ring, muzzle brake): smooth, slightly
   *  darker where powder gases and handling have dulled the finish. */
  forged: () =>
    M.paint(0x3f432e, {
      roughness: 0.6,
      wear: 0.34,
      wearColor: 0x3a3a36,
      dust: 0.1,
      dustHeight: 0.75,
      dustColor: 0x8c806a,
      colorVar: 0.1,
      varScale: 6,
      detailStrength: 0.2,
    }),
  /** Bright working steel: piston rods, handwheel handles, pins. */
  bright: () =>
    M.steel({ color: 0x5c5a57, roughness: 0.42, metalness: 0.85, wear: 0.35, dust: 0.08, bump: 0.02, bumpScale: 220 }),
  /** Tyres (sponge-filled GK type, look like ordinary treaded truck tyres). */
  rubber: () => M.rubber({ color: 0x1e1e1d, roughness: 0.88, dust: 0.42, dustHeight: 0.5, dustColor: 0x8a7d69 }),
  /** Optics bodies: black enamel. */
  optic: () =>
    M.paint(0x1c1d1b, { roughness: 0.48, wear: 0.3, wearColor: 0x55565a, wearMetalness: 0.8, dust: 0.06, colorVar: 0.04 }),
  /** Lenses / sight window glass. */
  glass: () => M.glass({ tint: 0xa9bcc0, opacity: 0.32, roughness: 0.03 }),
  /** Brass: data plate, sight scale bands. */
  brass: () => M.brass({ color: 0x9b7d45, roughness: 0.45, colorVar: 0.1 }),
};
