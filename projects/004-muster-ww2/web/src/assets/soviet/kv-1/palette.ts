/**
 * KV-1 material palette. Materials are memoised by the library, so calling pal() repeatedly returns
 * the same instances (one draw call per material after baking).
 */
import { M } from '../../../core/kit';

/** Soviet 4BO protective green as it reads in the studio (slightly faded, dusty). */
export const GREEN_4BO = 0x444932;

const paintOpts = {
  roughness: 0.66,
  wear: 0.26,
  wearMetalness: 0.45,
  wearColor: 0x3a3833,
  dust: 0.22,
  dustHeight: 1.1,
  dustColor: 0x8a7e66,
  colorVar: 0.09,
  varScale: 1.5,
  cavity: 0.45,
} as const;

export function pal() {
  return {
    /** rolled armour plate and sheet steel, painted */
    paint: M.paint(GREEN_4BO, { ...paintOpts }),
    /** cast parts: mantlet, wheel hubs, idler, sprocket centre, hooks (rough cast surface) */
    cast: M.castPaint(GREEN_4BO, { ...paintOpts, roughness: 0.7, detailSize: 0.26, detailStrength: 0.3 }),
    /** unpainted cast manganese-steel track links and sprocket rings (dusty, bright contact edges) */
    track: M.steel({
      color: 0x3d3833,
      roughness: 0.74,
      metalness: 0.7,
      wear: 0.45,
      wearColor: 0x6c6862,
      dust: 0.5,
      dustHeight: 1.0,
      dustColor: 0x7f735f,
      bump: 0.08,
      bumpScale: 90,
      cavity: 0.5,
      name: 'kv1-track',
    }),
    /** solid rubber road-wheel tyres */
    rubber: M.rubber({ color: 0x222221, dust: 0.22, dustHeight: 0.7, colorVar: 0.03, name: 'kv1-rubber' }),
    /** machine-gun barrels and receivers, periscope bodies (dark gun steel) */
    gun: M.gunSteel({ color: 0x26282a, wear: 0.35, name: 'kv1-gunsteel' }),
    /** headlamp lens, sight glass */
    glass: M.glass({ tint: 0x9aa8a4, opacity: 0.2, roughness: 0.03 }),
    /** polished headlamp reflector behind the lens */
    reflector: M.steel({ color: 0x64635e, roughness: 0.22, metalness: 1, wear: 0, dust: 0.04, bump: 0, name: 'kv1-reflector' }),
    /** armoured vision blocks and periscope windows: dark, reflective */
    vision: M.glass({ tint: 0x2f3a38, opacity: 0.55, roughness: 0.04 }),
    /** dark space behind glass and inside openings */
    void: M.surface({ color: 0x0d0e0d, roughness: 0.9, metalness: 0, name: 'kv1-void' }),
    /** sooty exhaust pipes */
    exhaust: M.steel({
      color: 0x2e2621,
      roughness: 0.85,
      metalness: 0.35,
      wear: 0.25,
      wearColor: 0x6b4a33,
      dust: 0.1,
      bump: 0.12,
      bumpScale: 120,
      name: 'kv1-exhaust',
    }),
    /** steel wire rope (tow cables) */
    cable: M.steel({ color: 0x3e3b37, roughness: 0.62, metalness: 0.8, wear: 0.2, dust: 0.35, bump: 0.25, bumpScale: 420, name: 'kv1-cable' }),
    /** bare bright steel (headlamp reflector, shovel edge, crowbar tips) */
    bright: M.steel({ color: 0x77756f, roughness: 0.4, metalness: 1, wear: 0.1, dust: 0.05, bump: 0.02, name: 'kv1-bright' }),
    /** tool handles */
    wood: M.wood(0x4c3b2c, 0x2c2119, [0, 0, 1], { wear: 0.3, roughness: 0.72, clearcoat: 0, dust: 0.2, name: 'kv1-wood' }),
    /** red / green marker-lamp filters */
    lampRed: M.surface({ color: 0x5a1410, roughness: 0.25, metalness: 0, name: 'kv1-lamp-red' }),
    lampGreen: M.surface({ color: 0x1d4a2a, roughness: 0.25, metalness: 0, name: 'kv1-lamp-green' }),
  };
}
export type Pal = ReturnType<typeof pal>;
