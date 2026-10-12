/**
 * MG 42 material palette. Materials are memoised by the kit, so every call returns the
 * same instances (one draw call each after baking).
 */
import { M } from '../../../../core/kit';

export type StockKind = 'bakelite' | 'wood';

export function mg42Materials(stock: StockKind = 'bakelite') {
  return {
    /** Phosphated, black-lacquered sheet steel: receiver, jacket, cover, trigger housing. */
    phos: M.gunSteel({
      color: 0x2e2f30,
      roughness: 0.5,
      metalness: 0.62,
      colorVar: 0.06,
      varScale: 16,
      roughVar: 0.2,
      detail: 'fine',
      detailSize: 0.014,
      detailStrength: 0.12,
      wear: 0.38,
      wearColor: 0x74777a,
      wearMetalness: 0.95,
      wearRoughness: 0.3,
      cavity: 0.4,
      dust: 0.05,
      dustHeight: 0.05,
      name: 'mg42-phosphate',
    }),
    /** Blued / polished working steel: barrel, pins, springs, trigger, slider. */
    blued: M.gunSteel({
      color: 0x24262a,
      roughness: 0.34,
      metalness: 0.85,
      colorVar: 0.05,
      varScale: 20,
      wear: 0.45,
      wearColor: 0x8c8e90,
      cavity: 0.3,
      name: 'mg42-blued',
    }),
    /** Moulded phenolic (Bakelite) or beech butt stock. */
    stock:
      stock === 'wood'
        ? M.wood(0x6e4428, 0x2f1a0e, [0, 0, 1], { roughness: 0.52, wear: 0.28, clearcoat: 0.15, name: 'mg42-beech' })
        : M.surface({
            color: 0x21130c,
            roughness: 0.44,
            metalness: 0,
            colorVar: 0.12,
            varScale: 26,
            roughVar: 0.18,
            detail: 'fine',
            detailSize: 0.02,
            detailStrength: 0.1,
            wear: 0.22,
            wearColor: 0x5b3b27,
            wearMetalness: 0,
            wearRoughness: 0.26,
            cavity: 0.35,
            clearcoat: 0.12,
            clearcoatRoughness: 0.5,
            name: 'mg42-bakelite',
          }),
    /** Pistol-grip panels are always Bakelite. */
    gripPanel: M.surface({
      color: 0x22130c,
      roughness: 0.42,
      metalness: 0,
      colorVar: 0.15,
      varScale: 30,
      roughVar: 0.18,
      detail: 'fine',
      detailSize: 0.012,
      detailStrength: 0.18,
      wear: 0.25,
      wearColor: 0x60402b,
      wearMetalness: 0,
      wearRoughness: 0.26,
      cavity: 0.35,
      clearcoat: 0.12,
      clearcoatRoughness: 0.5,
      name: 'mg42-grip-bakelite',
    }),
    /** Painted sheet-steel belt drum. */
    drum: M.paint(0x2c2f31, {
      roughness: 0.58,
      colorVar: 0.06,
      varScale: 12,
      detailSize: 0.03,
      detailStrength: 0.25,
      wear: 0.32,
      wearColor: 0x55585c,
      wearMetalness: 0.85,
      wearRoughness: 0.35,
      dust: 0.08,
      dustHeight: 0.05,
      name: 'mg42-drum-paint',
    }),
    /** Belt links: blackened spring steel. */
    link: M.steel({ color: 0x353534, roughness: 0.48, metalness: 0.8, wear: 0.4, dust: 0.03, dustHeight: 0.05, bump: 0.02, name: 'mg42-link' }),
    brass: M.brass({ color: 0xb08c4c, roughness: 0.3, name: 'mg42-case-brass' }),
    /** Gilding-metal clad bullet jackets. */
    bullet: M.brass({ color: 0xa06c4c, roughness: 0.28, name: 'mg42-bullet' }),
    /** Dark brown sling leather and its stitching. */
    leather: M.leather(0x2a1a11, { roughness: 0.6, wear: 0.3, wearColor: 0x4a3222, varScale: 16, name: 'mg42-sling-leather' }),
    stitch: M.leather(0x5c4430, { roughness: 0.7, wear: 0, detail: 'fine', detailSize: 0.004, name: 'mg42-stitch' }),
    /** Near-black recess colour for screw slots, bores and openings. */
    dark: M.surface({ color: 0x0c0c0c, roughness: 0.7, metalness: 0.3, colorVar: 0.02, cavity: 0, name: 'mg42-recess' }),
    /** Sling hardware: plain steel. */
    hardware: M.gunSteel({ color: 0x505254, roughness: 0.42, metalness: 0.85, wear: 0.5, wearColor: 0x9a9c9e, name: 'mg42-hardware' }),
  };
}

export type Mg42Mats = ReturnType<typeof mg42Materials>;
