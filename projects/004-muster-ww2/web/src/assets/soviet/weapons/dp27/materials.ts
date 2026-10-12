/** DP-27 material palette (memoised library materials: same call = same material = one draw call). */
import { M } from '../../../../core/kit';

export const dpMat = {
  /** Blued machined steel, satin from handling: receiver, sights, trigger group, butt plate. */
  blued: () => M.gunSteel({ color: 0x353a40, roughness: 0.42, metalness: 0.72, wear: 0.32, colorVar: 0.07, varScale: 9 }),
  /** Barrel jacket: greyer, heat-dulled blueing. */
  jacket: () => M.gunSteel({ color: 0x3a3d42, roughness: 0.5, metalness: 0.7, wear: 0.22, colorVar: 0.08, varScale: 7 }),
  /** Inside of the jacket and other hidden steel: dark, sooty, matte, so openings read as depth. */
  soot: () => M.gunSteel({ color: 0x141517, roughness: 0.8, metalness: 0.45, wear: 0, colorVar: 0.1, varScale: 30, cavity: 0.2 }),
  /** Barrel and flash hider: dark, slightly smoother than the jacket. */
  barrel: () => M.gunSteel({ color: 0x2e3135, roughness: 0.4, metalness: 0.78, wear: 0.24, colorVar: 0.06 }),
  /** Stamped sheet-steel pan magazine, black-blued. */
  pan: () => M.gunSteel({ color: 0x2b2d30, roughness: 0.56, metalness: 0.58, wear: 0.28, colorVar: 0.09, varScale: 6 }),
  /** Bipod: heavy blue-black finish. */
  bipod: () => M.gunSteel({ color: 0x2c2f33, roughness: 0.5, metalness: 0.72, wear: 0.34 }),
  /** Bare / spring steel (springs, pins, cotter pin, sling hardware). */
  bare: () => M.steel({ color: 0x5b5955, roughness: 0.45, wear: 0.25, dust: 0.05, bump: 0.02 }),
  /** Deep shadow inside openings (slots, ports) so they read as depth, not paint. */
  void: () => M.surface({ color: 0x070707, roughness: 0.85, metalness: 0.1, colorVar: 0.02 }),
  /**
   * Birch stock, reddish-brown stain under shellac. Grain runs along the stock (Z); the triplanar
   * 'wood' detail map would run vertically on the side faces, so a fine isotropic detail is used and
   * the long grain comes from the axis-aware albedo figure.
   */
  wood: () =>
    M.wood(0x4b2417, 0x26100a, [0, 0, 1], {
      roughness: 0.52,
      colorVar: 0.1,
      wear: 0.2,
      wearColor: 0x74482a,
      clearcoat: 0.18,
      clearcoatRoughness: 0.45,
      detail: 'fine',
      detailSize: 0.02,
      detailStrength: 0.1,
      wood: { axis: [0, 0, 1], dark: 0x26100a, ringFreq: 150, figure: 0.45 },
      name: 'su-w-birch-dp',
    }),
  /** Khaki cotton-webbing sling. */
  canvas: () => M.canvas(0x7a7050, { wear: 0.18, dust: 0.12 }),
};
