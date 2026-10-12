/**
 * British Army (1944) field-gear material palette for the 1937-pattern web equipment, the Mk II
 * steel helmet, the No. 36M grenade, the water bottle and the entrenching tool. Materials are
 * memoised by the kit, so every piece that uses the same entry merges into one draw call.
 *
 * Web colour: 1937-pattern webbing was woven khaki (dyed before weaving) and in the field often
 * treated with Blanco "Khaki Green No. 3"; the tone below is a lightly blancoed khaki green, a
 * shade lighter and yellower than the helmet paint. Brass fittings are dulled, not polished.
 */
import { M } from '../../../core/kit';

const DUST = { dust: 0.14, dustHeight: 0.5 } as const;

export const UK = {
  /** Heavy cotton webbing, coarse basket weave (pouches, carriers, straps). */
  web: () =>
    M.canvas(0x65654a, {
      detail: 'webbing',
      detailSize: 0.04,
      detailStrength: 0.7,
      colorVar: 0.08,
      varScale: 12,
      roughness: 0.93,
      wear: 0.18,
      cavity: 0.5,
      ...DUST,
      name: 'uk-web',
    }),
  /** The same webbing on narrow straps and tapes (finer tile so the weave keeps its scale). */
  webStrap: () =>
    M.canvas(0x626247, {
      detail: 'webbing',
      detailSize: 0.032,
      detailStrength: 0.75,
      colorVar: 0.07,
      varScale: 16,
      roughness: 0.93,
      wear: 0.2,
      cavity: 0.45,
      ...DUST,
      name: 'uk-web-strap',
    }),
  /** Waist-belt "flat loop" belting: denser, slightly darker weave. */
  belting: () =>
    M.canvas(0x5d5d43, {
      detail: 'webbing',
      detailSize: 0.034,
      detailStrength: 0.85,
      colorVar: 0.06,
      varScale: 10,
      roughness: 0.92,
      wear: 0.22,
      cavity: 0.5,
      ...DUST,
      name: 'uk-belting',
    }),
  /** Cotton sewing thread (a shade darker than the webbing). */
  thread: () => M.cotton(0x55553d, { detail: 'fine', detailSize: 0.01, detailStrength: 0.3, dust: 0.05, cavity: 0.1, sheen: 0.1, name: 'uk-thread' }),
  /** Stamped brass fittings (buckles, tips, hooks, press studs): dull, lightly tarnished. */
  brass: () =>
    M.brass({ color: 0x87754a, roughness: 0.52, colorVar: 0.12, varScale: 40, cavity: 0.55, name: 'uk-brass' }),
  /** Darker, tarnished brass (rivets, eyelets). */
  brassDark: () => M.brass({ color: 0x7c6a42, roughness: 0.5, colorVar: 0.1, varScale: 50, cavity: 0.5, name: 'uk-brass-dark' }),

  // ---- Mk II helmet ----
  /** Shell: khaki-green paint with the rough sand-textured anti-glare finish. */
  helmetPaint: () =>
    M.paint(0x4b4a36, {
      roughness: 0.82,
      detail: 'cast',
      detailSize: 0.05,
      detailStrength: 0.75,
      colorVar: 0.07,
      varScale: 9,
      wear: 0.32,
      wearColor: 0x4a4740,
      wearMetalness: 0.6,
      dust: 0.14,
      dustHeight: 0.35,
      name: 'uk-helmet-paint',
    }),
  /** Separate rim edging: painted over, the paint worn along the bead to dark steel. */
  rimPaint: () =>
    M.paint(0x4b4a36, {
      roughness: 0.7,
      detail: 'fine',
      detailSize: 0.03,
      detailStrength: 0.4,
      wear: 0.62,
      wearColor: 0x55534d,
      wearMetalness: 0.75,
      dust: 0.1,
      name: 'uk-helmet-rim',
    }),
  /** Liner oilcloth / "American cloth": black, semi-gloss, crackled. */
  oilcloth: () =>
    M.leather(0x1c1a18, { roughness: 0.62, detail: 'leather', detailSize: 0.03, detailStrength: 0.35, colorVar: 0.08, wear: 0.15, wearColor: 0x3a3632, cavity: 0.5, dust: 0, name: 'uk-oilcloth' }),
  /** Black rubber (crown pad, liner buffers). */
  rubber: () => M.rubber({ color: 0x1a1918, roughness: 0.82, dust: 0.05, bump: 0.03, name: 'uk-rubber' }),
  /** Pressed fibre (liner cradle strips): dark brown board. */
  fibre: () => M.plainWood(0x3a2a1d, [1, 0, 0], { detail: 'fine', detailSize: 0.02, detailStrength: 0.5, roughness: 0.7, wear: 0.1, dust: 0, name: 'uk-fibre' }),
  /** Elasticated chinstrap webbing (finer, lighter khaki). */
  chinWeb: () => M.canvas(0x625c41, { detail: 'twill', detailSize: 0.01, detailStrength: 0.9, wear: 0.1, dust: 0.05, name: 'uk-chin-web' }),
  /** Blackened steel (chinstrap hooks, lugs' bales, liner washers). */
  blackSteel: () => M.gunSteel({ color: 0x2c2c2a, roughness: 0.5, metalness: 0.8, wear: 0.4, wearColor: 0x77756f, name: 'uk-black-steel' }),
  /** Liner lacing cord. */
  cord: () => M.cotton(0x8c8468, { detail: 'knit', detailSize: 0.006, detailStrength: 0.6, dust: 0.03, name: 'uk-cord' }),

  // ---- No. 36M grenade ----
  /** Cast-iron body: dark khaki paint under a shellac coat (the "M" waterproofing), semi-gloss. */
  grenadeBody: () =>
    M.castPaint(0x3a2f22, {
      roughness: 0.42,
      detailSize: 0.045,
      detailStrength: 0.3,
      colorVar: 0.1,
      varScale: 30,
      wear: 0.36,
      wearColor: 0x3a3833,
      wearMetalness: 0.6,
      dust: 0.06,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
      name: 'uk-grenade-body',
    }),
  /** Green filling band. */
  grenadeBand: () => M.paint(0x37452b, { roughness: 0.6, wear: 0.3, wearColor: 0x3b3527, wearMetalness: 0, dust: 0.05, name: 'uk-grenade-band' }),
  /** Bare steel lever, pin and ring (zinc-grey). */
  grenadeSteel: () => M.paint(0x34332f, { roughness: 0.62, metalness: 0.45, colorVar: 0.12, detail: 'fine', detailSize: 0.02, detailStrength: 0.2, wear: 0.22, wearColor: 0x5f5d58, wearMetalness: 0.85, dust: 0.08, name: 'uk-grenade-steel' }),
  /** Base plug (brass-toned alloy, knurled). */
  basePlug: () => M.brass({ color: 0x6f6146, roughness: 0.58, metalness: 0.8, colorVar: 0.14, cavity: 0.7, name: 'uk-base-plug' }),

  // ---- water bottle ----
  /** Green vitreous enamel (Mk VII bottle): glossy, chipped edges show dark iron. */
  enamel: () =>
    M.paint(0x2c4a33, { roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.15, detail: 'fine', detailSize: 0.03, detailStrength: 0.15, wear: 0.45, wearColor: 0x2a2826, wearMetalness: 0.4, dust: 0.05, name: 'uk-enamel' }),
  /** Khaki wool felt cover. */
  felt: () =>
    M.wool(0x5a4c39, {
      detail: 'fine',
      detailSize: 0.02,
      detailStrength: 0.9,
      colorVar: 0.12,
      varScale: 20,
      roughness: 0.97,
      sheen: 0.25,
      sheenColor: 0x7a6c58,
      sheenRoughness: 0.7,
      cavity: 0.5,
      dust: 0.1,
      dustHeight: 0.35,
      name: 'uk-felt',
    }),
  /** Natural cork. */
  cork: () => M.surface({ color: 0xa88760, roughness: 0.9, colorVar: 0.18, varScale: 160, bump: 0.35, bumpScale: 900, cavity: 0.5, detail: 'cast', detailSize: 0.02, detailStrength: 0.6, name: 'uk-cork' }),
  /** Tinned-steel cork cap and wire eye. */
  tin: () => M.steel({ color: 0x8b8983, roughness: 0.38, metalness: 0.85, wear: 0.3, dust: 0.05, bump: 0.01, name: 'uk-tin' }),
  /** Heavy cotton cord (cork lanyard). */
  lanyard: () => M.cotton(0xb3aa90, { detail: 'knit', detailSize: 0.005, detailStrength: 0.7, dust: 0.1, name: 'uk-lanyard' }),
  /** Felt whip-stitching thread (dark). */
  feltThread: () => M.cotton(0x3e3528, { detail: 'fine', detailSize: 0.01, detailStrength: 0.3, dust: 0.02, cavity: 0.1, name: 'uk-felt-thread' }),

  // ---- entrenching tool / bayonet ----
  /** Black-japanned cast-steel tool head: worn to bright steel on the edges. */
  toolHead: () =>
    M.paint(0x1f1f1e, { roughness: 0.55, wear: 0.55, wearColor: 0x77756e, wearMetalness: 0.9, wearRoughness: 0.35, dust: 0.18, dustHeight: 0.3, name: 'uk-tool-head' }),
  /** Ash helve, natural oiled finish. Grain axis must match the final orientation. */
  helveWood: (axis: [number, number, number]) =>
    M.wood(0x8a6d4c, 0x5a4330, axis, { roughness: 0.66, clearcoat: 0.04, wear: 0.3, wearColor: 0x7a5d40, colorVar: 0.12, dust: 0.12 }),
  /** Plain steel ferrule. */
  ferrule: () => M.steel({ color: 0x5c5a55, roughness: 0.45, metalness: 0.8, wear: 0.5, dust: 0.1, bump: 0.02, name: 'uk-ferrule' }),
  /** No. 4 scabbard: black-painted sheet steel. */
  scabbard: () => M.paint(0x1c1c1b, { roughness: 0.5, detail: 'fine', detailSize: 0.02, detailStrength: 0.15, wear: 0.26, wearColor: 0x5d5c58, wearMetalness: 0.85, dust: 0.1, dustHeight: 0.4, name: 'uk-scabbard' }),
  /** No. 4 bayonet: phosphated / blackened steel. */
  bayonet: () => M.gunSteel({ color: 0x323436, roughness: 0.45, wear: 0.4, name: 'uk-bayonet-steel' }),
};
