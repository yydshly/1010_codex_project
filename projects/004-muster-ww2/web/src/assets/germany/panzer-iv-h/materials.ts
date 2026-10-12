/**
 * Material palette for the Panzer IV Ausf. H. Every entry is memoised by the library, so one
 * palette = one draw call per material after baking.
 */
import { THREE, M } from '../../../core/kit';

/** Dunkelgelb (RAL 7028) as it reads in the studio light. */
export const DUNKELGELB = 0x9a8759;
/** Olivgruen (RAL 6003) and Rotbraun (RAL 8017) field camouflage colours. */
export const OLIVGRUEN = 0x4f5537;
export const ROTBRAUN = 0x5e3d2a;

export interface Palette {
  /** rolled armour plate, painted */
  paint: THREE.MeshStandardMaterial;
  /** cast parts (mantlet, cupola, hubs, sprocket, final drives), painted */
  cast: THREE.MeshStandardMaterial;
  /** thin sheet metal (fenders, skirts, bins) painted, slightly more worn */
  sheet: THREE.MeshStandardMaterial;
  /** track links, bare weathered manganese steel */
  track: THREE.MeshStandardMaterial;
  /** bright polished steel where the tyres/sprocket rub (guide horns, sprocket teeth tips) */
  bright: THREE.MeshStandardMaterial;
  /** road wheel and return roller tyres */
  rubber: THREE.MeshStandardMaterial;
  /** gun metal: MG barrels, bolts on tools, clamps */
  gun: THREE.MeshStandardMaterial;
  /** tool handles */
  wood: THREE.MeshStandardMaterial;
  /** vision blocks, headlight lens */
  glass: THREE.MeshPhysicalMaterial;
  /** deep openings (bores, slits, grille voids) */
  dark: THREE.MeshStandardMaterial;
  /** exhaust muffler: heat-scorched, rust brown */
  exhaust: THREE.MeshStandardMaterial;
  /** blackout lamp / headlight body (black painted) */
  black: THREE.MeshStandardMaterial;
  /** bare steel of tool heads (shovel blade edge, axe head) */
  toolSteel: THREE.MeshStandardMaterial;
}

export function palette(camo: boolean): Palette {
  const camoP = camo
    ? { camo: { colors: [OLIVGRUEN, ROTBRAUN] as [number, number], scale: 0.42, coverage: [0.3, 0.2] as [number, number], softness: 0.1, seed: 7.0 } }
    : {};
  const base = {
    roughness: 0.66,
    colorVar: 0.06,
    varScale: 1.6,
    wear: 0.28,
    wearColor: 0x5b574f,
    wearMetalness: 0.55,
    wearRoughness: 0.5,
    dust: 0.24,
    dustHeight: 1.1,
    dustColor: 0x9c8e76,
    cavity: 0.45,
    ...camoP,
  };
  return {
    paint: M.paint(DUNKELGELB, { ...base, detailSize: 0.08, detailStrength: 0.3 }),
    cast: M.castPaint(DUNKELGELB, { ...base, detailSize: 0.3, detailStrength: 0.7 }),
    sheet: M.paint(DUNKELGELB, { ...base, wear: 0.34, detailSize: 0.06, detailStrength: 0.22, name: 'pz4-sheet' }),
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
    }),
    bright: M.steel({ color: 0x6e6a64, roughness: 0.4, metalness: 0.9, wear: 0.3, dust: 0.2, dustHeight: 0.3, name: 'pz4-bright' }),
    rubber: M.rubber({ color: 0x1f1e1c, roughness: 0.88, dust: 0.4, dustHeight: 0.5 }),
    gun: M.gunSteel({ color: 0x2a2b2c, roughness: 0.42, wear: 0.35 }),
    wood: M.wood(0x7d5a36, 0x3f2a17, [0, 0, 1], { roughness: 0.62, clearcoat: 0.05, wear: 0.3, dust: 0.15 }),
    glass: M.glass({ tint: 0xb9c9c4, opacity: 0.32, roughness: 0.06 }),
    dark: M.paint(0x151412, { roughness: 0.9, wear: 0, dust: 0, cavity: 0, colorVar: 0.02, name: 'pz4-dark' }),
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
      name: 'pz4-exhaust',
    }),
    black: M.paint(0x232220, { roughness: 0.55, wear: 0.2, wearColor: 0x55524d, dust: 0.1, name: 'pz4-black' }),
    toolSteel: M.steel({ color: 0x55524d, roughness: 0.5, metalness: 0.85, wear: 0.4, dust: 0.1, name: 'pz4-toolsteel' }),
  };
}
