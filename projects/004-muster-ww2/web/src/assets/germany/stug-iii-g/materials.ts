/**
 * Material palette for the StuG III Ausf. G (Dunkelgelb, moderate wear). Every entry is memoised
 * by the library, so one palette = one draw call per material after baking.
 */
import { THREE, M } from '../../../core/kit';

/** Dunkelgelb (RAL 7028) as it reads in the studio light. */
export const DUNKELGELB = 0x9a8759;

export interface Palette {
  /** rolled armour plate, painted */
  paint: THREE.MeshStandardMaterial;
  /** cast parts (cupola, hubs, sprocket, final drives), painted */
  cast: THREE.MeshStandardMaterial;
  /** thin sheet metal (track guards, skirts), painted, slightly more worn */
  sheet: THREE.MeshStandardMaterial;
  /** track links, bare weathered manganese steel */
  track: THREE.MeshStandardMaterial;
  /** bright polished steel where the tyres/sprocket rub */
  bright: THREE.MeshStandardMaterial;
  /** road wheel and return roller tyres */
  rubber: THREE.MeshStandardMaterial;
  /** gun metal: MG, clamps, nuts on tools */
  gun: THREE.MeshStandardMaterial;
  /** tool handles, jack block */
  wood: THREE.MeshStandardMaterial;
  /** periscope and vision block glass, lamp lenses */
  glass: THREE.MeshPhysicalMaterial;
  /** deep openings (bores, slits, grille voids) */
  dark: THREE.MeshStandardMaterial;
  /** exhaust muffler and spare links: heat-scorched / rusty */
  exhaust: THREE.MeshStandardMaterial;
  /** headlight / convoy lamp bodies (black painted) */
  black: THREE.MeshStandardMaterial;
  /** bare steel of tool heads */
  toolSteel: THREE.MeshStandardMaterial;
}

export function palette(): Palette {
  const base = {
    roughness: 0.66,
    colorVar: 0.06,
    varScale: 1.6,
    wear: 0.28,
    wearColor: 0x5b574f,
    wearMetalness: 0.55,
    wearRoughness: 0.5,
    dust: 0.24,
    dustHeight: 1.0,
    dustColor: 0x9c8e76,
    cavity: 0.45,
  };
  return {
    paint: M.paint(DUNKELGELB, { ...base, detailSize: 0.08, detailStrength: 0.3, name: 'stug-paint' }),
    cast: M.castPaint(DUNKELGELB, { ...base, detailSize: 0.3, detailStrength: 0.7, name: 'stug-cast' }),
    sheet: M.paint(DUNKELGELB, { ...base, wear: 0.34, detailSize: 0.06, detailStrength: 0.22, name: 'stug-sheet' }),
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
      name: 'stug-track',
    }),
    bright: M.steel({ color: 0x6e6a64, roughness: 0.4, metalness: 0.9, wear: 0.3, dust: 0.2, dustHeight: 0.3, name: 'stug-bright' }),
    rubber: M.rubber({ color: 0x1f1e1c, roughness: 0.88, dust: 0.4, dustHeight: 0.5, name: 'stug-rubber' }),
    gun: M.gunSteel({ color: 0x2a2b2c, roughness: 0.42, wear: 0.35, name: 'stug-gun' }),
    wood: M.wood(0x7d5a36, 0x3f2a17, [0, 0, 1], { roughness: 0.62, clearcoat: 0.05, wear: 0.3, dust: 0.15, name: 'stug-wood' }),
    glass: M.glass({ tint: 0xb9c9c4, opacity: 0.32, roughness: 0.06 }),
    dark: M.paint(0x151412, { roughness: 0.9, wear: 0, dust: 0, cavity: 0, colorVar: 0.02, name: 'stug-dark' }),
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
      name: 'stug-exhaust',
    }),
    black: M.paint(0x232220, { roughness: 0.55, wear: 0.2, wearColor: 0x55524d, dust: 0.1, name: 'stug-black' }),
    toolSteel: M.steel({ color: 0x55524d, roughness: 0.5, metalness: 0.85, wear: 0.4, dust: 0.1, name: 'stug-toolsteel' }),
  };
}
