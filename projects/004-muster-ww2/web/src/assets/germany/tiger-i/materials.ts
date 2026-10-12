/**
 * Material palette for the Tiger I. Every entry is memoised by the library, so one palette =
 * one draw call per material after baking.
 */
import { THREE, M } from '../../../core/kit';

/** Dunkelgelb (RAL 7028) as it reads in the studio light. */
export const DUNKELGELB = 0x9a8759;

export interface Palette {
  /** rolled armour plate, painted */
  paint: THREE.MeshStandardMaterial;
  /** cast parts (mantlet, cupola, hubs, sprocket, final drives), painted */
  cast: THREE.MeshStandardMaterial;
  /** thin sheet metal (track guards, bin, exhaust guards) painted, slightly more worn */
  sheet: THREE.MeshStandardMaterial;
  /** track links, bare weathered manganese steel */
  track: THREE.MeshStandardMaterial;
  /** bright polished steel where wheels rub (guide horns, pins) */
  bright: THREE.MeshStandardMaterial;
  /** road wheel tyres */
  rubber: THREE.MeshStandardMaterial;
  /** gun metal: MG barrels, clamps, bolts on tools */
  gun: THREE.MeshStandardMaterial;
  /** tool handles, jack block */
  wood: THREE.MeshStandardMaterial;
  /** periscopes, vision blocks, lamp lenses */
  glass: THREE.MeshPhysicalMaterial;
  /** deep openings (bores, slits, grille voids) */
  dark: THREE.MeshStandardMaterial;
  /** exhaust mufflers: heat-scorched, rust brown */
  exhaust: THREE.MeshStandardMaterial;
  /** black-painted lamp bodies, rubber seals */
  black: THREE.MeshStandardMaterial;
  /** bare steel of tool heads */
  toolSteel: THREE.MeshStandardMaterial;
  /** steel wire rope of the tow cables */
  rope: THREE.MeshStandardMaterial;
}

export function palette(): Palette {
  const base = {
    roughness: 0.66,
    colorVar: 0.06,
    varScale: 1.4,
    wear: 0.3,
    wearColor: 0x5b574f,
    wearMetalness: 0.55,
    wearRoughness: 0.5,
    dust: 0.26,
    dustHeight: 1.15,
    dustColor: 0x9c8e76,
    cavity: 0.45,
  };
  return {
    paint: M.paint(DUNKELGELB, { ...base, detailSize: 0.08, detailStrength: 0.3, name: 'tiger-paint' }),
    cast: M.castPaint(DUNKELGELB, { ...base, detailSize: 0.3, detailStrength: 0.7, name: 'tiger-cast' }),
    sheet: M.paint(DUNKELGELB, { ...base, wear: 0.36, detailSize: 0.06, detailStrength: 0.22, name: 'tiger-sheet' }),
    track: M.steel({
      color: 0x4a443d,
      roughness: 0.72,
      metalness: 0.6,
      colorVar: 0.16,
      varScale: 7,
      wear: 0.55,
      wearColor: 0x8a857e,
      dust: 0.5,
      dustHeight: 0.35,
      dustColor: 0x8b7d67,
      cavity: 0.55,
      bump: 0.08,
      bumpScale: 120,
      name: 'tiger-track',
    }),
    bright: M.steel({ color: 0x6e6a64, roughness: 0.4, metalness: 0.9, wear: 0.3, dust: 0.2, dustHeight: 0.3, name: 'tiger-bright' }),
    rubber: M.rubber({ color: 0x1f1e1c, roughness: 0.88, dust: 0.4, dustHeight: 0.6, name: 'tiger-rubber' }),
    gun: M.gunSteel({ color: 0x2a2b2c, roughness: 0.42, wear: 0.35, name: 'tiger-gun' }),
    wood: M.wood(0x7d5a36, 0x3f2a17, [0, 0, 1], { roughness: 0.62, clearcoat: 0.05, wear: 0.3, dust: 0.15, name: 'tiger-wood' }),
    glass: M.glass({ tint: 0xb9c9c4, opacity: 0.32, roughness: 0.06 }),
    dark: M.paint(0x151412, { roughness: 0.9, wear: 0, dust: 0, cavity: 0, colorVar: 0.02, name: 'tiger-dark' }),
    exhaust: M.surface({
      color: 0x5a3e2c,
      roughness: 0.9,
      metalness: 0.15,
      colorVar: 0.22,
      varScale: 9,
      roughVar: 0.1,
      bump: 0.12,
      bumpScale: 90,
      wear: 0.2,
      wearColor: 0x3a2b22,
      wearMetalness: 0.3,
      dust: 0.2,
      dustHeight: 1.2,
      dustColor: 0x8d7f69,
      cavity: 0.5,
      name: 'tiger-exhaust',
    }),
    black: M.paint(0x232220, { roughness: 0.55, wear: 0.2, wearColor: 0x55524d, dust: 0.1, name: 'tiger-black' }),
    toolSteel: M.steel({ color: 0x55524d, roughness: 0.5, metalness: 0.85, wear: 0.4, dust: 0.1, name: 'tiger-toolsteel' }),
    rope: M.steel({
      color: 0x3d3a36,
      roughness: 0.62,
      metalness: 0.7,
      colorVar: 0.1,
      varScale: 20,
      bump: 0.25,
      bumpScale: 260,
      wear: 0.3,
      wearColor: 0x77726b,
      dust: 0.3,
      dustHeight: 1.6,
      name: 'tiger-rope',
    }),
  };
}
