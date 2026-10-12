/**
 * Soviet field-gear material palette (Red Army, 1943-44). Materials are memoised by the kit,
 * so every piece that uses the same entry merges into one draw call.
 */
import { M } from '../../../core/kit';

export const SU = {
  /** SSh-40 shell: semi-gloss dark green enamel over steel, light edge wear. */
  helmetPaint: () =>
    M.paint(0x3f4630, { roughness: 0.55, colorVar: 0.06, detailStrength: 0.14, detailSize: 0.03, wear: 0.3, wearColor: 0x3e3b36, dust: 0.12, dustHeight: 0.4 }),
  /** Liner pads and inner band: grey-black oilcloth / leatherette. */
  linerOilcloth: () =>
    M.leather(0x3b312a, { roughness: 0.58, detailStrength: 0.35, detailSize: 0.02, wear: 0.12, cavity: 0.5, colorVar: 0.1 }),
  /** Cotton webbing (chinstraps, cords' tabs). */
  webbing: () => M.canvas(0x5f5a42, { detailSize: 0.012, detailStrength: 0.8, wear: 0.1 }),
  /** Khaki cotton canvas (pouches, covers, veshmeshok). */
  canvas: () =>
    M.canvas(0x5d5939, { detail: 'plain', detailSize: 0.05, detailStrength: 0.75, colorVar: 0.1, varScale: 11, dust: 0.16, dustHeight: 0.4, name: 'su-canvas' }),
  /** Slightly darker, denser canvas for straps and loops. */
  canvasStrap: () => M.canvas(0x514f35, { detailSize: 0.012, detailStrength: 0.8, dust: 0.12, name: 'su-canvas-strap' }),
  /** Natural brown leather (M1937 cartridge pouches, straps). */
  leather: () =>
    M.leather(0x3f2d1f, { roughness: 0.56, detailSize: 0.02, detailStrength: 0.42, colorVar: 0.1, varScale: 14, wear: 0.3, cavity: 0.5, name: 'su-leather' }),
  /** Plain steel with a dull finish (belt buckle). */
  buckleSteel: () =>
    M.steel({ color: 0x5a5953, roughness: 0.42, metalness: 0.85, wear: 0.45, dust: 0.04, bump: 0.02, name: 'su-buckle-steel' }),
  /** Darker brown leather for straps / tabs. */
  leatherDark: () => M.leather(0x3d2a1b, { roughness: 0.52, wear: 0.3 }),
  /** Linen/cotton sewing thread. */
  thread: () => M.cotton(0x8c8466, { detail: 'fine', detailSize: 0.01, detailStrength: 0.3, dust: 0.05, cavity: 0.1 }),
  /** Cotton cord (drawstrings). */
  cord: () => M.cotton(0x77705a, { detail: 'knit', detailSize: 0.006, detailStrength: 0.6 }),
  /** Blackened / dark stamped steel (buckles, D-rings, studs). */
  darkSteel: () => M.gunSteel({ color: 0x2f2f2d, roughness: 0.5, metalness: 0.8, wear: 0.35, wearColor: 0x77756f }),
  /** Plain grey steel (grenade fuze, rivet backs). */
  fuzeSteel: () => M.steel({ color: 0x5d5c57, roughness: 0.56, metalness: 0.7, wear: 0.25, dust: 0.08, bump: 0.02 }),
  /** Cast-iron grenade body in green paint. */
  grenadePaint: () =>
    M.castPaint(0x404a2d, { roughness: 0.64, wear: 0.34, wearColor: 0x3a3833, dust: 0.1, detailSize: 0.022, detailStrength: 0.45 }),
  /** Shovel blade: dark painted steel, bright wear along the cutting edges. */
  bladePaint: () =>
    M.paint(0x30332a, { roughness: 0.58, wear: 0.6, wearColor: 0x77756e, wearMetalness: 0.9, dust: 0.22, dustHeight: 0.3 }),
  /** Unpainted hardwood handle. Grain axis must match the final orientation in the asset. */
  handleWood: (axis: [number, number, number]) =>
    M.wood(0x7d6446, 0x4f3a26, axis, { roughness: 0.66, clearcoat: 0, wear: 0.3, wearColor: 0x5e4630, colorVar: 0.12 }),
  /** Aluminium flask neck painted green (paint wears through to bright metal). */
  flaskPaint: () =>
    M.paint(0x4d5236, { roughness: 0.5, wear: 0.5, wearColor: 0xa9abaa, wearMetalness: 1, wearRoughness: 0.35, dust: 0.1 }),
  /** Plain aluminium (screw cap). */
  aluminium: () => M.aluminium({ roughness: 0.48, colorVar: 0.08, varScale: 30 }),
  /** Greatcoat wool (grey-brown). */
  greatcoat: () => M.wool(0x6a5f4f, { detailSize: 0.009, detailStrength: 0.9, dust: 0.14, colorVar: 0.08 }),
  /**
   * Greatcoat cloth for the rolled coat (skatka): dense, felted grey-brown wool - soft fuzzy
   * surface, the weave barely visible, gentle mottling.
   */
  greatcoatRoll: () =>
    M.wool(0x463d33, {
      detail: 'fine',
      detailSize: 0.02,
      detailStrength: 0.85,
      colorVar: 0.12,
      varScale: 18,
      roughness: 0.96,
      sheen: 0.14,
      sheenColor: 0x6a6052,
      sheenRoughness: 0.6,
      cavity: 0.6,
      dust: 0.03,
      dustHeight: 0.3,
      name: 'su-greatcoat-roll',
    }),
  /** Dark linen thread for stitching on leather. */
  threadDark: () => M.cotton(0x3a3026, { detail: 'fine', detailSize: 0.01, detailStrength: 0.3, dust: 0.03, cavity: 0.1, name: 'su-thread-dark' }),
  /** Khaki cotton cloth (flask cover): finer plain weave than the pouch canvas. */
  cloth: () =>
    M.cotton(0x625d40, { detail: 'plain', detailSize: 0.036, detailStrength: 1.0, colorVar: 0.1, varScale: 14, dust: 0.12, dustHeight: 0.35, name: 'su-cloth' }),
  /** Plain hardwood toggles (pouch closures). Grain along gear X. */
  toggleWood: () =>
    M.plainWood(0x7a5c3a, [1, 0, 0], { roughness: 0.62, wear: 0.25, dust: 0.05, name: 'su-toggle-wood' }),
  /** Light green bottle glass (canteen neck). */
  glass: () => M.glass({ tint: 0xbfdcb6, opacity: 0.5, roughness: 0.07 }),
  /** Black rubber (canteen stopper). */
  rubber: () => M.rubber({ color: 0x1c1b1a, dust: 0.08, bump: 0.03, name: 'su-rubber' }),
};
