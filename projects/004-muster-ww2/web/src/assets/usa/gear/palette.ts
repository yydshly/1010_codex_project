/**
 * US Army field-gear material palette (1944). Materials are memoised by the kit, so every
 * piece that uses the same entry merges into one draw call.
 *
 * Web and canvas came in two shades during the war: the lighter, khaki-like Olive Drab
 * Shade No. 3 (early war, still common in 1944) and the darker Olive Drab Shade No. 7
 * (introduced 1943-44). Soldiers in 1944 routinely wore a mix of both.
 */
import { M } from '../../../core/kit';

export type WebShade = 'od3' | 'od7';

const WEB_COLOR: Record<WebShade, number> = { od3: 0x7a7050, od7: 0x524e37 };

export const US = {
  /** M1 helmet shell: flat Olive Drab No. 319 with ground cork in the paint (fine matte grain). */
  helmetPaint: () =>
    M.paint(0x3c3a27, {
      roughness: 0.84,
      colorVar: 0.06,
      varScale: 6,
      detail: 'cast',
      detailSize: 0.005,
      detailStrength: 0.22,
      bump: 0.02,
      bumpScale: 1600,
      wear: 0.22,
      wearColor: 0x3d3b35,
      dust: 0.1,
      dustHeight: 0.35,
      cavity: 0.45,
      name: 'us-helmet-paint',
    }),
  /** Stainless-steel helmet rim, painted OD; the paint wears through to bright steel on the edge. */
  rimPaint: () =>
    M.paint(0x3c3a27, {
      roughness: 0.8,
      detail: 'cast',
      detailSize: 0.005,
      detailStrength: 0.2,
      wear: 0.38,
      wearColor: 0x9c9c98,
      wearMetalness: 1,
      wearRoughness: 0.35,
      dust: 0.08,
      cavity: 0.5,
      name: 'us-helmet-rim',
    }),
  /** Helmet liner (resin-impregnated fibre / plastic), OD paint with a smoother, slightly glossier finish. */
  linerPaint: () =>
    M.paint(0x4a4632, { roughness: 0.52, colorVar: 0.05, detailStrength: 0.2, detailSize: 0.03, wear: 0.25, wearColor: 0x3f3a2c, dust: 0.05, cavity: 0.4, name: 'us-liner-paint' }),
  /** Herringbone-twill cotton webbing of the liner suspension (OD). */
  hbt: () => M.cotton(0x5f5b44, { detail: 'twill', detailSize: 0.008, detailStrength: 0.9, dust: 0.04, cavity: 0.4, name: 'us-hbt' }),
  /** Brown leather (liner sweatband, nape strap, liner chinstrap). */
  leather: () =>
    M.leather(0x5a3b22, { roughness: 0.5, detailSize: 0.02, detailStrength: 0.4, wear: 0.3, cavity: 0.5, colorVar: 0.1, name: 'us-leather' }),
  /** Darker, oiled leather (liner chinstrap over the brim). */
  leatherDark: () => M.leather(0x40291a, { roughness: 0.46, wear: 0.35, detailSize: 0.02, detailStrength: 0.35, name: 'us-leather-dark' }),
  /** Cotton web (belts, straps, chinstrap) in either shade. */
  web: (shade: WebShade = 'od7') =>
    M.canvas(WEB_COLOR[shade], { detailSize: 0.011, detailStrength: 0.85, wear: 0.12, dust: 0.14, dustHeight: 0.5, name: `us-web-${shade}` }),
  /** Cotton duck canvas (pouches, covers, haversack) in either shade. */
  canvas: (shade: WebShade = 'od7') =>
    M.canvas(shade === 'od3' ? 0x776d4d : 0x545038, {
      detail: 'plain',
      detailSize: 0.04,
      detailStrength: 0.5,
      colorVar: 0.09,
      varScale: 11,
      dust: 0.16,
      dustHeight: 0.4,
      wear: 0.12,
      name: `us-canvas-${shade}`,
    }),
  /** Narrow cotton binding tape on pouch and flap edges (a touch darker than the canvas). */
  tape: (shade: WebShade = 'od7') =>
    M.canvas(shade === 'od3' ? 0x6c6246 : 0x4a4632, { detail: 'webbing', detailSize: 0.006, detailStrength: 0.7, dust: 0.1, name: `us-tape-${shade}` }),
  /** Cotton sewing thread. */
  thread: () => M.cotton(0x6a6448, { detail: 'fine', detailSize: 0.01, detailStrength: 0.3, dust: 0.04, cavity: 0.1, name: 'us-thread' }),
  /** Blackened brass / steel fittings (buckles, bails, hooks, lift-the-dot sockets, eyelets). */
  blackMetal: () =>
    M.gunSteel({ color: 0x282725, roughness: 0.48, metalness: 0.75, wear: 0.22, wearColor: 0x6e6450, name: 'us-black-metal' }),
  /** Belt fastener plates: blackened brass, the black worn off the high points to dull brass. */
  fastenerMetal: () =>
    M.gunSteel({ color: 0x33302a, roughness: 0.44, metalness: 0.8, wear: 0.2, wearColor: 0x75643c, wearMetalness: 1, name: 'us-fastener-metal' }),
  /** The dark opening seen through an eyelet (matte, not metal). */
  eyeletHole: () => M.surface({ color: 0x100f0c, roughness: 0.95, metalness: 0, cavity: 0, name: 'us-eyelet-hole' }),
  /** Bright wire (M1910 hangers, pull rings): galvanised / brass wire, dulled. */
  wire: () => M.steel({ color: 0x86857c, roughness: 0.4, metalness: 0.9, wear: 0.2, dust: 0.05, bump: 0.01, name: 'us-wire' }),
  /** Wool felt (canteen cover lining). */
  felt: () => M.wool(0x5d5845, { detail: 'knit', detailSize: 0.005, detailStrength: 0.7, sheen: 0.3, dust: 0.03, name: 'us-felt' }),
  /** Mk 2 grenade body: olive drab over cast iron. */
  grenadePaint: () =>
    M.castPaint(0x3d3c29, { roughness: 0.64, wear: 0.36, wearColor: 0x3b3935, dust: 0.08, detailSize: 0.02, detailStrength: 0.4, colorVar: 0.05, name: 'us-grenade-paint' }),
  /** Yellow identification ring (high explosive) on the grenade neck. */
  grenadeYellow: () => M.paint(0x9e7f2c, { roughness: 0.62, wear: 0.32, wearColor: 0x3b3935, dust: 0.05, detailStrength: 0.15, name: 'us-grenade-yellow' }),
  /** Fuze body and lever: plated steel / zinc alloy, dull grey. */
  fuzeMetal: () => M.steel({ color: 0x6f6d66, roughness: 0.5, metalness: 0.8, wear: 0.2, dust: 0.05, bump: 0.015, name: 'us-fuze-metal' }),
  /** Olive drab painted steel (grenade lever, entrenching tool, bayonet scabbard throat). */
  odSteel: () =>
    M.paint(0x3f3e2a, { roughness: 0.58, detailSize: 0.02, detailStrength: 0.12, wear: 0.45, wearColor: 0x6d6c66, wearMetalness: 0.9, dust: 0.12, dustHeight: 0.4, name: 'us-od-steel' }),
  /** Entrenching tool blade: OD paint, worn to bright steel along the edges. */
  bladePaint: () =>
    M.paint(0x3f3f2a, { roughness: 0.62, wear: 0.55, wearColor: 0x86847e, wearMetalness: 0.95, wearRoughness: 0.35, dust: 0.08, dustHeight: 0.3, name: 'us-blade-paint' }),
  /** Painted wooden handle: OD paint worn through to the wood. */
  handlePaint: () =>
    M.paint(0x434229, { roughness: 0.64, detail: 'wood', detailSize: 0.08, detailStrength: 0.3, wear: 0.28, wearColor: 0x6e5436, wearMetalness: 0, wearRoughness: 0.6, dust: 0.06, name: 'us-handle-paint' }),
  /** Canteen aluminium (dull, slightly oxidised). */
  aluminium: () => M.aluminium({ color: 0x8e9091, roughness: 0.6, colorVar: 0.1, varScale: 18, roughVar: 0.25, name: 'us-aluminium' }),
  /** Corrosion-resistant (stainless) steel canteen / cup. */
  stainless: () => M.steel({ color: 0x9a9b98, roughness: 0.32, metalness: 0.92, colorVar: 0.05, bump: 0.008, wear: 0.1, dust: 0.04, name: 'us-stainless' }),
  /** Black moulded plastic (canteen cap, bayonet grips). */
  blackPlastic: () => M.surface({ color: 0x171716, roughness: 0.55, metalness: 0, colorVar: 0.04, cavity: 0.3, wear: 0.15, wearColor: 0x3a3936, name: 'us-black-plastic' }),
  /** OD moulded plastic (M7 bayonet scabbard body). */
  odPlastic: () => M.surface({ color: 0x4a4d38, roughness: 0.5, metalness: 0, colorVar: 0.05, varScale: 8, cavity: 0.35, wear: 0.2, wearColor: 0x5e604c, dust: 0.1, dustHeight: 0.4, name: 'us-od-plastic' }),
  /** Parkerised steel (bayonet crossguard and pommel). */
  parkerized: () => M.gunSteel({ color: 0x3a3b38, roughness: 0.68, metalness: 0.65, wear: 0.35, wearColor: 0x7b7c78, name: 'us-parkerized' }),
  /** Bright blade steel (only the exposed ricasso area). */
  bladeSteel: () => M.steel({ color: 0x7d7e7c, roughness: 0.3, metalness: 0.95, wear: 0.1, dust: 0.02, name: 'us-blade-steel' }),
  /** Wool blanket (pack carrier roll). */
  blanket: () => M.wool(0x5a5140, { detailSize: 0.01, detailStrength: 0.9, dust: 0.1, colorVar: 0.1, name: 'us-blanket' }),
};
