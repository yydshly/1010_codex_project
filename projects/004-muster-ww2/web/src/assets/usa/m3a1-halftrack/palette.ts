/**
 * M3A1 half-track material palette. Materials are memoised by the library, so every part sharing a
 * finish merges into one draw call at bake time. US Army Olive Drab (No. 9 lusterless enamel), the
 * same in-scene value as the Willys MB and the M4A3 in this archive.
 */
import { M } from '../../../core/kit';

export const OD = 0x4c4a32;

const base = {
  roughness: 0.68,
  colorVar: 0.07,
  varScale: 1.6,
  wear: 0.28,
  wearColor: 0x3b3935,
  wearMetalness: 0.5,
  wearRoughness: 0.46,
  dust: 0.24,
  dustHeight: 1.0,
  dustColor: 0x8f836b,
  cavity: 0.45,
} as const;

export function pal() {
  return {
    /** face-hardened armour plate and body sheet, painted */
    paint: M.paint(OD, { ...base, detailSize: 0.06, detailStrength: 0.26, name: 'm3a1-paint' }),
    /** frame, axles, springs, running gear castings: same paint, dustier */
    chassis: M.paint(0x48462f, { ...base, roughness: 0.74, wear: 0.34, dust: 0.48, dustHeight: 0.8, colorVar: 0.09, varScale: 3, cavity: 0.5, name: 'm3a1-chassis' }),
    /** tyres and the moulded rubber band track */
    rubber: M.rubber({ color: 0x1f1e1c, roughness: 0.9, dust: 0.45, dustHeight: 0.9, dustColor: 0x8a7d69, name: 'm3a1-rubber' }),
    /** steel track guides, sprocket teeth contact faces */
    track: M.steel({
      color: 0x4a4640,
      roughness: 0.6,
      metalness: 0.7,
      colorVar: 0.12,
      varScale: 7,
      wear: 0.45,
      wearColor: 0x86817a,
      dust: 0.35,
      dustHeight: 0.9,
      dustColor: 0x8a7d67,
      cavity: 0.5,
      name: 'm3a1-track',
    }),
    /** machine gun, ring mount race, small blackened steel */
    gun: M.gunSteel({ color: 0x2a2b2b, roughness: 0.46, wear: 0.16, wearColor: 0x5c5f61, name: 'm3a1-gun' }),
    /** bare working steel: hinge pins, roller shaft, pintle, bolts */
    steel: M.steel({ color: 0x5a5852, roughness: 0.48, metalness: 0.85, wear: 0.4, dust: 0.12, name: 'm3a1-steel' }),
    /** windscreen and lamp glass */
    glass: M.glass({ tint: 0xd8e2e2, opacity: 0.22, roughness: 0.03 }),
    /** vision slits, louvre gaps, bores */
    void: M.surface({ color: 0x0e0e0d, roughness: 0.92, metalness: 0, name: 'm3a1-void' }),
    /** flat black: steering wheel, instrument faces, lamp interiors */
    black: M.paint(0x1c1c1a, { roughness: 0.55, wear: 0.16, wearColor: 0x55544f, wearMetalness: 0.6, dust: 0.08, colorVar: 0.04, name: 'm3a1-black' }),
    /** seat cushions and backs: OD duck over padding */
    seat: M.canvas(0x4b4a33, { roughness: 0.94, detail: 'plain', detailSize: 0.012, detailStrength: 0.8, dust: 0.16, dustHeight: 1.6, wear: 0.2, name: 'm3a1-seat' }),
    /** rolled bedrolls / tarpaulins in the side racks */
    canvas: M.canvas(0x5d5a42, { dust: 0.22, dustHeight: 1.9, dustColor: 0x8f836b, name: 'm3a1-canvas' }),
    /** silvered headlamp reflectors */
    reflector: M.aluminium({ color: 0xb9bbbc, roughness: 0.22, metalness: 1, name: 'm3a1-reflector' }),
    /** tail lamp lenses */
    red: M.surface({ color: 0x6e1712, roughness: 0.22, metalness: 0, colorVar: 0.05, varScale: 30, cavity: 0.2, name: 'm3a1-red' }),
    /** M1A1 anti-tank mines in the side racks (darker OD paint) */
    mine: M.paint(0x3f3f2c, { roughness: 0.6, wear: 0.3, wearColor: 0x4d4c45, dust: 0.2, dustHeight: 1.4, colorVar: 0.06, name: 'm3a1-mine' }),
  };
}
export type Pal = ReturnType<typeof pal>;
