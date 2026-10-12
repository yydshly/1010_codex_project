/**
 * SU-76M material palette. Materials are memoised by the library, so calling pal() repeatedly returns
 * the same instances (one draw call per material after baking).
 */
import { M } from '../../../core/kit';

/** Soviet 4BO protective green as it reads in the studio (slightly faded, dusty). */
export const GREEN_4BO = 0x444932;

const paintOpts = {
  roughness: 0.66,
  wear: 0.28,
  wearMetalness: 0.45,
  wearColor: 0x3a3833,
  dust: 0.22,
  dustHeight: 1.0,
  dustColor: 0x8a7e66,
  colorVar: 0.09,
  varScale: 1.5,
  cavity: 0.45,
} as const;

export function pal() {
  return {
    /** rolled armour plate and sheet steel, painted */
    paint: M.paint(GREEN_4BO, { ...paintOpts }),
    /** cast / forged parts: wheel hubs, sprocket centre, gun mount, hooks */
    cast: M.castPaint(GREEN_4BO, { ...paintOpts, roughness: 0.7, detailSize: 0.2, detailStrength: 0.28 }),
    /** forged gun parts under the paint (breech ring, muzzle brake), slightly darker and smoother */
    forged: M.paint(0x3f432e, {
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
    /** unpainted track links, sprocket teeth (dusty, bright contact edges) */
    track: M.steel({
      color: 0x3d3833,
      roughness: 0.74,
      metalness: 0.7,
      wear: 0.45,
      wearColor: 0x6c6862,
      dust: 0.5,
      dustHeight: 0.8,
      dustColor: 0x7f735f,
      bump: 0.08,
      bumpScale: 90,
      cavity: 0.5,
      name: 'su76-track',
    }),
    /** solid rubber tyres */
    rubber: M.rubber({ color: 0x222221, dust: 0.25, dustHeight: 0.6, colorVar: 0.03, name: 'su76-rubber' }),
    /** bore, chamber, projectile bodies, MG steel (dark blued steel) */
    bore: M.gunSteel({ color: 0x2a2b2d, roughness: 0.4, wear: 0.3, wearColor: 0x77797b, cavity: 0.5, name: 'su76-gunsteel' }),
    /** bright working steel: piston rods, handles, pins, headlamp reflector, tool blades */
    bright: M.steel({ color: 0x66645f, roughness: 0.4, metalness: 0.9, wear: 0.25, dust: 0.06, bump: 0.02, bumpScale: 220, name: 'su76-bright' }),
    /** optics bodies: black enamel */
    optic: M.paint(0x1c1d1b, { roughness: 0.48, wear: 0.3, wearColor: 0x55565a, wearMetalness: 0.8, dust: 0.06, colorVar: 0.04 }),
    /** headlamp lens, sight glass */
    glass: M.glass({ tint: 0x9aa8a4, opacity: 0.22, roughness: 0.03 }),
    /** driver's periscope window: dark, reflective */
    vision: M.glass({ tint: 0x2f3a38, opacity: 0.55, roughness: 0.04 }),
    /** brass cartridge cases, sight scale bands */
    brass: M.brass({ color: 0x9b7d45, roughness: 0.42, colorVar: 0.1 }),
    /** dark space inside openings */
    void: M.surface({ color: 0x0d0e0d, roughness: 0.9, metalness: 0, name: 'su76-void' }),
    /** sooty exhaust mufflers and pipes */
    exhaust: M.steel({
      color: 0x2e2621,
      roughness: 0.85,
      metalness: 0.35,
      wear: 0.25,
      wearColor: 0x6b4a33,
      dust: 0.1,
      bump: 0.12,
      bumpScale: 120,
      name: 'su76-exhaust',
    }),
    /** tool handles, seat boards */
    wood: M.wood(0x4c3b2c, 0x2c2119, [0, 0, 1], { wear: 0.3, roughness: 0.72, clearcoat: 0, dust: 0.2, name: 'su76-wood' }),
    /** rolled tarpaulin, seat cushions */
    canvas: M.canvas(0x5a5a44, { dust: 0.25, wear: 0.2, name: 'su76-canvas' }),
  };
}
export type Pal = ReturnType<typeof pal>;
